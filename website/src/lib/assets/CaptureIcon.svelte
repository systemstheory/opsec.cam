<script lang="ts">
	import { onDestroy } from 'svelte';

	import f1 from '../../../static/capture1.svg?raw';
	import f2 from '../../../static/capture2.svg?raw';
	import f3 from '../../../static/capture3.svg?raw';
	import f4 from '../../../static/capture4.svg?raw';
	import f5 from '../../../static/capture5.svg?raw';
	import f6 from '../../../static/capture6.svg?raw';
	import f7 from '../../../static/capture7.svg?raw';
	import f8 from '../../../static/capture8.svg?raw';
	import f9 from '../../../static/capture9.svg?raw';
	import f10 from '../../../static/capture10.svg?raw';
	import f11 from '../../../static/capture11.svg?raw';

	const embeddingFrames = [f2, f3, f4, f5];
	const provingFrames = [f6, f7, f8, f9, f10, f11, f6];

	interface Props {
		status?: string;
	}
	let { status = 'idle' }: Props = $props();

	let frameIndex = $state(0);
	let timer: ReturnType<typeof setInterval> | null = null;

	function clearTimer() {
		if (timer) {
			clearInterval(timer);
			timer = null;
		}
	}

	$effect(() => {
		clearTimer();
		frameIndex = 0;
		if (status === 'embedding') {
			timer = setInterval(() => {
				frameIndex = (frameIndex + 1) % embeddingFrames.length;
			}, 750);
		} else if (status === 'proving') {
			timer = setInterval(() => {
				frameIndex = (frameIndex + 1) % provingFrames.length;
			}, 750);
		}
	});

	onDestroy(clearTimer);

	const svg = $derived(
		status === 'embedding'
			? embeddingFrames[frameIndex]
			: status === 'proving'
				? provingFrames[frameIndex]
				: status === 'proved'
					? f2
					: f1
	);
</script>

<span class="icon">{@html svg}</span>

<style>
	.icon {
		display: contents;
	}
	.icon :global(svg) {
		width: 100%;
		height: 100%;
		display: block;
	}
</style>
