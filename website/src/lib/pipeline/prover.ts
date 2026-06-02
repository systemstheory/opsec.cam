import { PUBLIC_R2_URL } from '$env/static/public';

export type ProveResult = {
	proof: Uint8Array;
	instances: bigint[];
	labels: { label: string; score: number }[];
};

export interface Label {
	label: string;
	score: number;
}

export type ProveHandle = {
	labelsReady: Promise<{ labels: Label[]; instances: bigint[] }>;
	proofReady: Promise<ProveResult>;
};

export function prove(embedding: Float32Array): ProveHandle {
	const worker = new Worker(new URL('./prover.worker.ts', import.meta.url), { type: 'module' });

	let resolveLabels!: (v: { labels: Label[]; instances: bigint[] }) => void;
	let rejectLabels!: (e: unknown) => void;
	let resolveProof!: (v: ProveResult) => void;
	let rejectProof!: (e: unknown) => void;

	const labelsReady = new Promise<{ labels: Label[]; instances: bigint[] }>((res, rej) => {
		resolveLabels = res;
		rejectLabels = rej;
	});

	const proofReady = new Promise<ProveResult>((res, rej) => {
		resolveProof = res;
		rejectProof = rej;
	});

	worker.onmessage = (e) => {
		const msg = e.data;
		if (msg.ok === 'progress') {
			resolveLabels({ labels: msg.labels, instances: msg.instances });
		} else if (msg.ok === true) {
			resolveProof({ proof: msg.proof, labels: msg.labels, instances: msg.instances });
			worker.terminate();
		} else {
			const err = new Error(msg.error);
			rejectLabels(err);
			rejectProof(err);
			worker.terminate();
		}
	};

	worker.onerror = (e) => {
		const err = new Error(e.message);
		rejectLabels(err);
		rejectProof(err);
		worker.terminate();
	};

	worker.postMessage({ embedding, baseUrl: PUBLIC_R2_URL });

	return { labelsReady, proofReady };
}
