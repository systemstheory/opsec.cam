<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
</svelte:head>

<main class="container">
	{@render children()}
</main>

<style>
	:global(html, body) {
		margin: 0;
		width: 100%;
		height: 100%;
	}

	:global(body) {
		width: 100%;
		min-height: 100%;
		display: flex;
		justify-content: center;
		padding: 0.5rem 0;
		box-sizing: border-box;
	}

	:global(.container) {
		width: 100%;
		height: 100%;
		max-width: 500px;
		display: flex;
		flex-direction: column;
		justify-content: end;
		min-height: 100%;
		position: relative;
		font-size: 14px;
		font-family: Arial;
		color: var(--text);
		background: var(--secondary);
	}
</style>
