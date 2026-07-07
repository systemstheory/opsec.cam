<script lang="ts">
	import { onDestroy } from 'svelte';

	import f1 from '../../../static/advertise1.svg?raw';
	import f2 from '../../../static/advertise2.svg?raw';
	import f3 from '../../../static/advertise3.svg?raw';
	import f4 from '../../../static/advertise4.svg?raw';
	import f5 from '../../../static/advertise5.svg?raw';

	const advertisingFrames = [f1, f2, f3, f4, f5];

	interface Props {
		status?: string;
	}
	let { status = 'proved' }: Props = $props();

	let frameIndex = $state(0);
	let timer: ReturnType<typeof setInterval> | null = null;

	function clearTimer() {
		if (timer) {
			clearInterval(timer);

			timer = null;
		}
	}

	$effect(() => {
		if (status === 'advertising') {
			frameIndex = 0;

			timer = setInterval(() => {
				frameIndex = (frameIndex + 1) % advertisingFrames.length;
			}, 750);
		} else {
			clearTimer();
		}
		return clearTimer;
	});

	onDestroy(clearTimer);
</script>

{#if status === 'advertising'}
	<span class="icon">
		{@html advertisingFrames[frameIndex]}
	</span>
{:else}
	<span class="icon">
		{@html advertisingFrames[0]}
	</span>
{/if}

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
