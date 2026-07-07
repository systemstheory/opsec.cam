import type { ProveResult } from '$lib/pipeline/prover';

export type PipelineState = 'idle' | 'embedding' | 'proving' | 'proved' | 'advertising';

class ControlsStore {
	state = $state<PipelineState>('idle');
	labels = $state<string[]>([]);
	proofData = $state<ProveResult | null>(null);

	capturedFrame = $state<string | null>(null);

	oncapture = $state<(() => void) | null>(null);
	onadvertise = $state<(() => void) | null>(null);
	onretry = $state<(() => void) | null>(null);
}

export const controls = new ControlsStore();
