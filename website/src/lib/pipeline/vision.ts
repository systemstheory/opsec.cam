import { CLIPVisionModelWithProjection, Tensor, env } from '@huggingface/transformers';
import { PUBLIC_R2_URL } from '$env/static/public';

env.allowLocalModels = false;
env.allowRemoteModels = true;

env.remoteHost = PUBLIC_R2_URL;
env.remotePathTemplate = 'model';

// CLIP preprocessing constants
const SIZE = 224;
const MEAN = [0.48145466, 0.4578275, 0.40821073];
const STD = [0.26862954, 0.26130258, 0.27577711];

let visionModel: InstanceType<typeof CLIPVisionModelWithProjection> | null = null;

async function getModel() {
	visionModel ??= await CLIPVisionModelWithProjection.from_pretrained('clip', {
		device: 'wasm',
		dtype: 'fp32',
		model_file_name: 'vision_model'
	});
	return visionModel;
}

export type ImageInput = string | Blob | File | ImageBitmap;

/** Embed a single image. Returns a L2-normalised Float32Array (512-dim). */
export async function embedImage(input: ImageInput): Promise<Float32Array> {
	const model = await getModel();
	const pixel_values = await preprocess(input);
	const { image_embeds } = await model({ pixel_values });
	return l2norm(image_embeds.data as Float32Array);
}

export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
	let dot = 0;
	for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
	return dot;
}

// ── canvas preprocessing ───────────────────────────────────────────────────────

async function preprocess(src: ImageInput): Promise<Tensor> {
	const bitmap =
		src instanceof ImageBitmap
			? src
			: await createImageBitmap(
					typeof src === 'string' ? await fetch(src).then((r) => r.blob()) : src,
					{ colorSpaceConversion: 'none', premultiplyAlpha: 'none' }
				);

	const sw = bitmap.width;
	const sh = bitmap.height;

	const native = new OffscreenCanvas(sw, sh);
	native.getContext('2d')!.drawImage(bitmap, 0, 0);
	bitmap.close();
	const src_data = native.getContext('2d')!.getImageData(0, 0, sw, sh).data;

	// Resize shortest side to SIZE, center crop — pure JS bilinear
	const scale = SIZE / Math.min(sw, sh);
	const rw = Math.round(sw * scale);
	const rh = Math.round(sh * scale);
	const ox = Math.floor((rw - SIZE) / 2);
	const oy = Math.floor((rh - SIZE) / 2);

	const pixels = new Float32Array(3 * SIZE * SIZE);

	for (let y = 0; y < SIZE; y++) {
		for (let x = 0; x < SIZE; x++) {
			const sx = (x + ox + 0.5) / scale - 0.5;
			const sy = (y + oy + 0.5) / scale - 0.5;

			const x0 = Math.max(0, Math.floor(sx));
			const y0 = Math.max(0, Math.floor(sy));
			const x1 = Math.min(sw - 1, x0 + 1);
			const y1 = Math.min(sh - 1, y0 + 1);
			const fx = sx - x0;
			const fy = sy - y0;

			for (let c = 0; c < 3; c++) {
				const tl = src_data[(y0 * sw + x0) * 4 + c];
				const tr = src_data[(y0 * sw + x1) * 4 + c];
				const bl = src_data[(y1 * sw + x0) * 4 + c];
				const br = src_data[(y1 * sw + x1) * 4 + c];
				const val =
					tl * (1 - fx) * (1 - fy) + tr * fx * (1 - fy) + bl * (1 - fx) * fy + br * fx * fy;
				pixels[c * SIZE * SIZE + y * SIZE + x] = (val / 255 - MEAN[c]) / STD[c];
			}
		}
	}

	return new Tensor('float32', pixels, [1, 3, SIZE, SIZE]);
}

function l2norm(vec: Float32Array): Float32Array {
	let sq = 0;
	for (const v of vec) sq += v * v;
	const norm = Math.sqrt(sq) || 1;
	return vec.map((v) => v / norm);
}
