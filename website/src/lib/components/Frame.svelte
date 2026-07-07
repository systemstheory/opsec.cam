<script lang="ts">
	interface Props {
		labels?: string[];
	}
	let { labels = [] }: Props = $props();
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
		background: #d9d9d9;
		font-size: 1.75rem;
		display: flex;
		flex-wrap: wrap;
		align-content: flex-start;
		gap: 0.5rem;
		padding: 0.5rem;
		position: absolute;
		left: 0;
		right: 0;
		top: 50%;
		transform: translateY(-50%);
		aspect-ratio: 1;
		pointer-events: none;
	}

	.frame .label {
		word-break: break-word;
		background: #a0a0a0;
		color: #fff;
		padding: 0.05rem;
	}
</style>
