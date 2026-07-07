<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	const frames: string[] = ['/register1.svg', '/register2.svg', '/register3.svg', '/register4.svg'];
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
