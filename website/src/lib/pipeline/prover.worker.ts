import { witnessAndScore, generateProof, configure } from './text';

type WorkerRequest = { embedding: Float32Array; baseUrl: string };
type WorkerProgress = { ok: 'progress'; labels: { label: string; score: number }[]; instances: bigint[] };
type WorkerResponse =
	| { ok: true; labels: { label: string; score: number }[]; instances: bigint[]; proof: Uint8Array }
	| { ok: false; error: string };

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
	try {
		configure(e.data.baseUrl);
		const { labels, instances, witnessBytes } = await witnessAndScore(e.data.embedding);
		(self as unknown as Worker).postMessage({ ok: 'progress', labels, instances } satisfies WorkerProgress);
		const proof = await generateProof(witnessBytes);
		(self as unknown as Worker).postMessage({ ok: true, labels, instances, proof } satisfies WorkerResponse);
	} catch (err) {
		(self as unknown as Worker).postMessage({ ok: false, error: String(err) } satisfies WorkerResponse);
	}
};
