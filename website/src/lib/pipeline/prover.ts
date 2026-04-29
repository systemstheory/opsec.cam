import { PUBLIC_R2_URL } from '$env/static/public';
import { witnessAndScore, generateProof, configure } from './text';

export type ProveResult = {
	proof: Uint8Array;
	instances: bigint[];
	labels: { label: string; score: number }[];
};

export interface Label {
	label: string;
	score: number;
}

export async function prove(embedding: Float32Array): Promise<ProveResult> {
	configure(PUBLIC_R2_URL);
	const { labels, instances, witnessBytes } = await witnessAndScore(embedding);
	console.log('[prover] witness done, proving…');
	const proof = await generateProof(witnessBytes);
	return { proof, instances, labels };
}
