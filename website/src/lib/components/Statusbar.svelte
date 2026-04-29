<script lang="ts">
	let { state, txHash }: { state: string; txHash?: string } = $props();
</script>

<div class="statusbar">
	<span>{state}</span>

	{#if txHash}
		<span class="tx">{txHash}</span>
	{/if}
</div>

<style>
	.statusbar {
		display: flex;
		gap: 1rem;
		padding: 0.5rem 1rem;
		font-size: 0.75rem;
		opacity: 0.5;
    background: var(--primary);
	}

	.tx {
		font-family: monospace;
		overflow: hidden;
		text-overflow: ellipsis;
	}
</style>
