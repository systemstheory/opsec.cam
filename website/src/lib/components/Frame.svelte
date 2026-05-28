<script lang="ts">
	let { labels = [] }: { labels?: string[] } = $props();
</script>

<div class="frame">
	{#each labels as label}
		<span class="label">{label}</span>
	{/each}
</div>

<style>
	.frame {
		width: 100%;
		box-sizing: border-box;
		height: 500px;
		background: rgba(255, 255, 255, 0.25);
		font-size: 1.5rem;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.25rem;
		padding: 0.5rem;
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
	}

	.frame .label {
		white-space: nowrap;
		flex-shrink: 0;
	}
</style>
