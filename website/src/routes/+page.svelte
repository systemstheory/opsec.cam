<script lang="ts">
	import Frame from '$lib/components/Frame.svelte';
	import Controls from '$lib/components/Controls.svelte';
	import { embedImage } from '$lib/pipeline/vision';
	import { type ProveResult, prove } from '$lib/pipeline/prover';
	import { advertise } from '$lib/wallet/wallet';

	type State = 'idle' | 'embedding' | 'proving' | 'labelled' | 'proved' | 'advertising';

	let state: State = $state('idle');
	let labels: string[] = $state([]);
	let proofData: ProveResult | null = $state(null);
	let txHash: string | undefined = $state(undefined);

	async function handleCapture(blob: Blob) {
		state = 'embedding';
		const embedding = await embedImage(blob);

		state = 'proving';
		const { labelsReady, proofReady } = prove(embedding);

		const { labels: l } = await labelsReady;
		labels = l.map((x) => x.label);
		state = 'labelled';

		proofData = await proofReady;
		state = 'proved';
	}

	async function handleAdvertise() {
		if (!proofData) return;
		state = 'advertising';
		txHash = await advertise(proofData.proof, proofData.instances);
		state = 'idle';
	}

	function handleRetry() {
		state = 'idle';
		labels = [];
		proofData = null;
		txHash = undefined;
	}
</script>

<Frame {labels} />

<Controls {state} oncapture={handleCapture} onadvertise={handleAdvertise} onretry={handleRetry} />
