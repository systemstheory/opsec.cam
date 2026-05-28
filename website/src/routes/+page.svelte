<script lang="ts">
	import Frame from '$lib/components/Frame.svelte';
	import Controls from '$lib/components/Controls.svelte';
	import { embedImage } from '$lib/pipeline/vision';
	import type { ProveResult } from '$lib/pipeline/prover';
	import ProverWorker from '$lib/pipeline/prover.worker.ts?worker';
	import { PUBLIC_R2_URL } from '$env/static/public';
	import { advertise } from '$lib/wallet/wallet';

	type State = 'idle' | 'embedding' | 'proving' | 'proved' | 'advertising';
	// const REGISTERS = ['Aesthetic', 'Location', 'Class', 'State', 'Accessory', 'Gear', 'Genre', 'Material'];

	let state: State = $state('idle');
	let labels: string[] = $state([]);
	let proofData: ProveResult | null = $state(null);
	let txHash: string | undefined = $state(undefined);

	async function handleCapture(blob: Blob) {
		state = 'embedding';
		const embedding = await embedImage(blob);

		console.log('[embedding]', embedding);

		state = 'proving';

		proofData = await new Promise<ProveResult>((resolve, reject) => {
			const worker = new ProverWorker();
			worker.onmessage = (e: MessageEvent) => {
				const data = e.data;
				if (data.ok === 'progress') {
					labels = data.labels.map((l: { label: string }) => l.label);
				} else if (data.ok === true) {
					console.log(
						'[instances json]',
						JSON.stringify(
							data.instances.map((fe: { s: number; e: number; c: number[] }) => {
								const digits =
									String(fe.c[0]) +
									fe.c
										.slice(1)
										.map((n) => String(n).padStart(14, '0'))
										.join('');
								return fe.s < 0 ? '-' + digits : digits;
							})
						)
					);
					worker.terminate();
					resolve({ proof: data.proof, instances: data.instances, labels: data.labels });
				} else {
					worker.terminate();
					reject(new Error(data.error));
				}
			};
			worker.postMessage({ embedding, baseUrl: PUBLIC_R2_URL });
		});
		labels = proofData.labels.map((l) => l.label);
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
