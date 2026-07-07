<script lang="ts">
	import Frame from '$lib/components/Frame.svelte';

	const placeholders = [
		{ id: 1, labels: ['malibu', 'outdoors', 'seaside', 'poolside'] },
		{ id: 2, labels: ['malibu', 'outdoors', 'seaside', 'poolside'] },
		{ id: 3, labels: ['malibu', 'outdoors', 'seaside', 'poolside'] },
		{ id: 4, labels: ['malibu', 'outdoors', 'seaside', 'poolside'] },
		{ id: 5, labels: ['malibu', 'outdoors', 'seaside', 'poolside'] },
		{ id: 6, labels: ['malibu', 'outdoors', 'seaside', 'poolside'] },
		{ id: 7, labels: ['malibu', 'outdoors', 'seaside', 'poolside'] },
		{ id: 8, labels: ['malibu', 'outdoors', 'seaside', 'poolside'] },
		{ id: 9, labels: ['malibu', 'outdoors', 'seaside', 'poolside'] },
		{ id: 10, labels: ['malibu', 'outdoors', 'seaside', 'poolside'] }
	];
</script>

<div class="gallery">
	{#each placeholders as { id, labels }}
		<a class="frame-card" href={`https://etherscan.io/token/${id}`}>
			<Frame {labels} />
		</a>
	{/each}
</div>

<style>
	.gallery {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: calc(18.4px + 100px) 0 1rem 0;
	}

	.frame-card {
		display: flex;
		text-decoration: none;
		background: black;
		position: relative;
		height: 500px;
	}
</style>
