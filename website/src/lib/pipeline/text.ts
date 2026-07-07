import init, { genWitness, prove, serialize, deserialize, init_panic_hook } from '@ezkljs/engine';

// ── constants ─────────────────────────────────────────────────────────────────

const OUTPUT_SCALE = 7; // matches model_output_scales in settings.json

// BN254 field modulus — field elements above half-modulus are negative
const FIELD_MOD = BigInt(
	'21888242871839275222246405745257275088548364400416034343698204186575808495617'
);
const HALF_MOD = FIELD_MOD / 2n;

// ── artifact loading ───────────────────────────────────────────────────────────

type Artifacts = {
	model: Uint8ClampedArray;
	pk: Uint8ClampedArray;
	srs: Uint8ClampedArray;
};

let artifacts: Artifacts | null = null;
let wasmReady = false;
let baseUrl = '';

export function configure(url: string) {
	baseUrl = url;
}

async function fetchBytes(url: string): Promise<Uint8ClampedArray> {
	console.log(`[fetch] ${url}`);
	const res = await fetch(url);
	if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
	const bytes = new Uint8ClampedArray(await res.arrayBuffer());
	console.log(`[fetch] ${url} — ${bytes.byteLength} bytes`);
	return bytes;
}

async function setup(): Promise<Artifacts> {
	if (!wasmReady) {
		await init();
		init_panic_hook();
		wasmReady = true;
	}

	if (!artifacts) {
		const [model, pk, srs, vocabulary] = await Promise.all([
			fetchBytes(`${baseUrl}/artifacts/model.compiled`, { cache: 'no-store' }),
			fetchBytes(`${baseUrl}/artifacts/pk.key`, { cache: 'no-store' }),
			fetchBytes(`${baseUrl}/artifacts/kzg17.srs`, { cache: 'no-store' }),
			fetch(`${baseUrl}/artifacts/vocabulary.json`, { cache: 'no-store' }).then((r) => r.json())
		]);

		artifacts = { model, pk, srs, vocabulary };
	}

	return artifacts;
}

// ── public API ────────────────────────────────────────────────────────────────

export interface ClassifyResult {
	labels: { label: string; score: number }[];
	proof: Uint8Array;
}

/** Phase 1: generate witness and extract scores. Returns scores + witness bytes for phase 2. */
export async function witnessAndScore(embedding: Float32Array): Promise<{
	labels: { label: string; score: number }[];
	instances: bigint[];
	witnessBytes: Uint8ClampedArray;
}> {
	const { model } = await setup();
	const input = serialize({ input_data: [Array.from(embedding)] });
	const raw = await genWitness(model, input);
	// Copy bytes into JS-owned memory before deserialize, which may grow the WASM heap
	// and detach the original buffer (causing Option::unwrap() None panic in prove).
	const witnessBytes = new Uint8ClampedArray(raw);
	const witness = deserialize(raw);
	const outputGrid = witness.outputs[0];
	console.log('[outputs] typeof outputs[0]:', typeof outputGrid, Array.isArray(outputGrid));
	console.log('[outputs] outputs[0][0]:', JSON.stringify((outputGrid as unknown[][])?.[0]));
	console.log(
		'[outputs] outputs[0][0][0]:',
		JSON.stringify((outputGrid as unknown[][][])?.[0]?.[0])
	);
	// outputs[0] may be FieldElement[][] (batch-wrapped) or FieldElement[] — detect by depth
	const firstElem = (outputGrid as unknown[])[0];
	const flat: FieldElement[] =
		Array.isArray(firstElem) && Array.isArray((firstElem as unknown[])[0])
			? (outputGrid as FieldElement[][]).flat()
			: (outputGrid as FieldElement[]);
	console.log('[outputs] flat[0]:', JSON.stringify(flat[0]), typeof flat[0]);
	const instances: bigint[] = flat.map(fieldToBigInt);
	const scores = flat.map(fieldToFloat);

	// Support register format {register, concepts:[{index,label}]} and legacy flat string[]
	const vocab = artifacts.vocabulary;
	let labels: { label: string; score: number }[];

	if (
		Array.isArray(vocab) &&
		vocab.length > 0 &&
		typeof vocab[0] === 'object' &&
		'concepts' in vocab[0]
	) {
		// Register format — return per-register winners
		labels = (vocab as { register: string; concepts: { index: number; label: string }[] }[]).map(
			(reg) => {
				const winner = reg.concepts.reduce((best, c) =>
					scores[c.index] > scores[best.index] ? c : best
				);
				return { label: winner.label, score: scores[winner.index] };
			}
		);
	} else {
		// Legacy flat format
		labels = (vocab as string[])
			.map((label: string, i: number) => ({ label, score: scores[i] }))
			.sort((a, b) => b.score - a.score)
			.slice(0, 8);
	}

	return {
		labels,
		instances,
		witnessBytes
	};
}

/** Phase 2: generate ZK proof from witness bytes. */
export async function generateProof(witnessBytes: Uint8ClampedArray): Promise<Uint8Array> {
	const { model, pk, srs } = await setup();
	const proofBytes = await prove(witnessBytes, pk, model, srs);
	if (proofBytes.byteLength < 100) {
		throw new Error(
			`Proof suspiciously small (${proofBytes.byteLength} bytes) — likely failed silently`
		);
	}
	return proofBytes;
}

// ── helpers ───────────────────────────────────────────────────────────────────

// Witness field elements are [u64, u64, u64, u64] strings (4-limb little-endian)
type FieldElement = string[];

function limbs(fe: FieldElement): bigint {
	return fe.reduce((acc, limb, i) => acc + BigInt(limb) * (1n << BigInt(i * 64)), 0n);
}

function fieldToFloat(fe: FieldElement): number {
	const v = limbs(fe);
	const signed = v > HALF_MOD ? v - FIELD_MOD : v;
	return Number(signed) / Math.pow(2, OUTPUT_SCALE);
}

function fieldToBigInt(fe: FieldElement): bigint {
	const v = limbs(fe);
	return v > HALF_MOD ? v - FIELD_MOD : v;
}
