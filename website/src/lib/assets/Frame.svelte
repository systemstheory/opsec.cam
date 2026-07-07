<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	const frames: string[] = [
		'/frame6.svg',
		'/frame5.svg',
		'/frame4.svg',
		'/frame3.svg',
		'/frame2.svg',
		'/frame1.svg'
	];
	let index = $state(0);
	let timer: ReturnType<typeof setInterval>;

	onMount(() => {
		timer = setInterval(() => {
			index = (index + 1) % frames.length;
		}, 250);
	});

	onDestroy(() => clearInterval(timer));
</script>

<img src={frames[index]} alt="circuit animation frame" />
