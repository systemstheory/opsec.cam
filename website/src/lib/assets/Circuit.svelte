<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	const frames: string[] = [
		'/circuit1.svg',
		'/circuit2.svg',
		'/circuit3.svg',
		'/circuit4.svg',
		'/circuit5.svg',
		'/circuit6.svg',
		'/circuit1.svg',
		'/circuit1.svg'
	];
	let index = $state(0);
	let timer: ReturnType<typeof setInterval>;

	onMount(() => {
		timer = setInterval(() => {
			index = (index + 1) % frames.length;
		}, 500);
	});

	onDestroy(() => clearInterval(timer));
</script>

<img src={frames[index]} alt="circuit animation frame" />
