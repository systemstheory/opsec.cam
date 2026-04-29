import init, { genWitness, prove, serialize, deserialize, init_panic_hook } from '@ezkljs/engine';

// ── constants ─────────────────────────────────────────────────────────────────

let LABELS: string[] = [];
const OUTPUT_SCALE = 14; // model_output_scales from settings.json

// BN254 field modulus — field elements above half-modulus are negative
const FIELD_MOD = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');
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

export function configure(url: string) { baseUrl = url; }

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
		const [model, pk, srs, vocab] = await Promise.all([
			fetchBytes(`${baseUrl}/artifacts/model.compiled`),
			fetchBytes(`${baseUrl}/artifacts/pk.key`),
			fetchBytes(`${baseUrl}/artifacts/kzg15.srs`),
			fetch(`${baseUrl}/artifacts/vocabulary.json`).then((r) => r.json())
		]);
		LABELS = Array.isArray(vocab) ? vocab : Object.values(vocab);
		artifacts = { model, pk, srs };
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
	const witness = deserialize(raw);
	const instances: bigint[] = witness.outputs[0].flat();
	const scores = instances.map(fieldToFloat);

	return {
		labels: LABELS.map((label, i) => ({ label, score: scores[i] })),
		instances,
		witnessBytes: new Uint8ClampedArray(raw.buffer, raw.byteOffset, raw.byteLength)
	};
}

/** Phase 2: generate ZK proof from witness bytes. */
export async function generateProof(witnessBytes: Uint8ClampedArray): Promise<Uint8Array> {
	const { model, pk, srs } = await setup();
	const proofBytes = await prove(witnessBytes, pk, model, srs);
	if (proofBytes.byteLength < 100) {
		throw new Error(`Proof suspiciously small (${proofBytes.byteLength} bytes) — likely failed silently`);
	}
	return proofBytes;
}

// ── helpers ───────────────────────────────────────────────────────────────────

function fieldToFloat(fe: bigint): number {
	const signed = fe > HALF_MOD ? fe - FIELD_MOD : fe;
	return Number(signed) / Math.pow(2, OUTPUT_SCALE);
}
