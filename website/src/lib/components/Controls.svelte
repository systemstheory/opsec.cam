<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		left?: Snippet;
		center?: Snippet;
		right?: Snippet;
	}

	let { left, center, right }: Props = $props();
</script>

<div class="controls">
	<div class="slot left">
		{@render left?.()}
	</div>
	<div class="slot center">
		{@render center?.()}
	</div>
	<div class="slot right">
		{@render right?.()}
	</div>
</div>

<style>
	.controls {
		position: fixed;
		bottom: 0;
		left: 50%;
		transform: translateX(-50%);
		width: 100%;
		max-width: 500px;
		box-sizing: border-box;
		background: black;
		display: grid;
		grid-template-columns: 4rem 1fr 4rem;
		align-items: center;
		padding: 1rem;
		gap: 0.5rem;
	}

	.slot {
		display: flex;
		align-items: center;
	}

	.slot.center {
		justify-content: center;
	}

	.slot.right {
		justify-content: flex-end;
	}
</style>
