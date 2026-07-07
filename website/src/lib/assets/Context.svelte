<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	const frames: string[] = [
		'/context1.svg',
		'/context2.svg',
		'/context3.svg',
		'/context4.svg',
		'/context5.svg',
		'/context6.svg',
		'/context7.svg',
		'/context8.svg',
		'/context9.svg',
		'/context10.svg',
		'/context11.svg',
		'/context12.svg',
		'/context13.svg',
		'/context14.svg',
		'/context15.svg',
		'/context16.svg',
		'/context17.svg',
		'/context18.svg'
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
