<script lang="ts">
	import Frame from '$lib/components/Frame.svelte';
	import Controls from '$lib/components/Controls.svelte';
	import Statusbar from '$lib/components/Statusbar.svelte';
	import { embedImage } from '$lib/pipeline/vision';
	import { prove } from '$lib/pipeline/prover';
	import { advertise } from '$lib/wallet/wallet';

	type State = 'idle' | 'embedding' | 'proving' | 'proved' | 'advertising';

	let state: State = $state('idle');
	let labels: string[] = $state([]);
	let proofData: Awaited<ReturnType<typeof prove>> | null = $state(null);
	let txHash: string | undefined = $state(undefined);

	async function handleCapture(blob: Blob) {
		state = 'embedding';
		const embedding = await embedImage(blob);
		console.log('[embedding]', embedding);
		state = 'proving';
		proofData = await prove(embedding);
		labels = proofData.labels.slice(0, 6).map((l) => l.label);
		state = 'proved';
	}

	async function handleAdvertise() {
		if (!proofData) return;
		state = 'advertising';
		txHash = await advertise(proofData.proof, proofData.instances);
		state = 'idle';
	}
</script>

<Frame {labels} />
<Controls {state} oncapture={handleCapture} onadvertise={handleAdvertise} />
<Statusbar {state} {txHash} />
