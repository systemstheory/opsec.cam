import init, { genWitness, prove, serialize, deserialize, init_panic_hook } from '@ezkljs/engine';

// ── constants ─────────────────────────────────────────────────────────────────

const OUTPUT_SCALE = 63; // empirically determined from witness output vs onnxruntime comparison

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
			fetchBytes(`${baseUrl}/artifacts/model.compiled`),
			fetchBytes(`${baseUrl}/artifacts/pk.key`),
			fetchBytes(`${baseUrl}/artifacts/kzg17.srs`),
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
	const outputGrid = witness.outputs[0] as BigNum[][];
	console.log(
		'[outputs[0] structure]',
		`${outputGrid.length} sub-arrays, first has ${outputGrid[0]?.length} elements`
	);

	const flat: BigNum[] = outputGrid.flat();
	const stride = flat.length / outputGrid.length; // elements per vocab word
	console.log('[stride]', stride);

	// try each stride offset (0..stride-1) as the score position
	const instances: BigNum[] = flat;
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
				return { label: `${reg.register}: ${winner.label}`, score: scores[winner.index] };
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

type BigNum = { s: number; e: number; c: number[] };

function fieldToFloat(fe: BigNum): number {
	// Reconstruct the decimal value from BigNumber { s, e, c }
	const c = fe.c;
	let str = c[0].toString();
	for (let i = 1; i < c.length; i++) str += c[i].toString().padStart(14, '0');
	const raw = BigInt(str);
	const signed = raw > HALF_MOD ? raw - FIELD_MOD : raw;
	return Number(signed) / Math.pow(2, OUTPUT_SCALE);
}
