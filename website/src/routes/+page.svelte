<script lang="ts">
	import { onMount } from 'svelte';
	import Frame from '$lib/components/Frame.svelte';
	import Camera from '$lib/components/Camera.svelte';
	import { embedImage } from '$lib/pipeline/vision';
	import { prove } from '$lib/pipeline/prover';
	import { connectWallet, advertise } from '$lib/wallet/wallet';
	import { controls } from '$lib/controls.svelte';

	let cameraCapture: (() => Promise<Blob>) | undefined = $state();

	const EMBEDDING_CYCLE_MS = 4 * 750;
	const PROVING_CYCLE_MS = 6 * 750;
	const ADVERTISING_CYCLE_MS = 5 * 750;

	function waitCycle(startMs: number, cycleMs: number) {
		const elapsed = Date.now() - startMs;
		const remaining = elapsed < cycleMs ? cycleMs - elapsed : 0;
		return remaining > 0 ? new Promise<void>((r) => setTimeout(r, remaining)) : Promise.resolve();
	}

	async function handleCapture() {
		if (!cameraCapture) return;
		const blob = await cameraCapture();
		controls.capturedFrame = URL.createObjectURL(blob);
		controls.state = 'embedding';
		const embeddingStart = Date.now();
		const embedding = await embedImage(blob);
		await waitCycle(embeddingStart, EMBEDDING_CYCLE_MS);
		controls.state = 'proving';
		const provingStart = Date.now();
		const { labelsReady, proofReady } = prove(embedding);
		const [{ labels: l }, proofData] = await Promise.all([labelsReady, proofReady]);
		controls.labels = l.map((x) => x.label);
		controls.proofData = proofData;
		await waitCycle(provingStart, PROVING_CYCLE_MS);
		controls.state = 'proved';
	}

	async function handleAdvertise() {
		if (!controls.proofData) return;
		let account: `0x${string}`;
		try {
			account = await connectWallet();
		} catch {
			return;
		}
		controls.state = 'advertising';
		const advertisingStart = Date.now();
		try {
			await advertise(account, controls.proofData.proof, controls.proofData.instances);
			await waitCycle(advertisingStart, ADVERTISING_CYCLE_MS);
			controls.state = 'idle';
		} catch {
			controls.state = 'proved';
		}
	}

	function handleRetry() {
		if (controls.capturedFrame) URL.revokeObjectURL(controls.capturedFrame);
		controls.capturedFrame = null;
		controls.state = 'idle';
		controls.labels = [];
		controls.proofData = null;
	}

	onMount(() => {
		controls.oncapture = handleCapture;
		controls.onadvertise = handleAdvertise;
		controls.onretry = handleRetry;
		return () => {
			controls.oncapture = null;
			controls.onadvertise = null;
			controls.onretry = null;
		};
	});
</script>

<div class="viewport-area">
	<div class="viewport">
		<Camera bind:capture={cameraCapture} frozenSrc={controls.capturedFrame} />
		{#if controls.state === 'proved' || controls.state === 'advertising'}
			<Frame labels={controls.labels} />
		{/if}
	</div>
</div>

<style>
	.viewport-area {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.viewport {
		width: 100%;
		aspect-ratio: 1;
		position: relative;
		overflow: hidden;
		background: #000;
	}
</style>
