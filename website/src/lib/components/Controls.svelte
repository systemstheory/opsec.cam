<script lang="ts">
	let {
		state,
		oncapture,
		onadvertise,
		onretry
	}: {
		state: string;
		oncapture: (blob: Blob) => void;
		onadvertise: () => void;
		onretry: () => void;
	} = $props();

	function handleFileChange(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (file) oncapture(file);
	}
</script>

<div class="controls">
	<div class="slot left">
		{#if state === 'labelled' || state === 'proved' || state === 'advertising'}
			<button class="btn" onclick={onretry}>retry</button>
		{/if}
	</div>

	<div class="slot center">
		{#if state === 'proved'}
			<button class="btn" onclick={onadvertise}> advertise </button>
		{:else}
			<label class="btn" class:disabled={state !== 'idle'}>
				capture
				<input
					type="file"
					accept="image/*"
					capture="environment"
					onchange={handleFileChange}
					disabled={state !== 'idle'}
				/>
			</label>
		{/if}
	</div>

	<div class="slot right">
		<!--<a class="btn" href="/photos">Gallery</a>-->
	</div>
</div>

<style>
	.controls {
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

	.btn {
		cursor: pointer;
		width: 4rem;
		height: 4rem;
		padding: 0;
		background: white;
		color: black;
		border: none;
		font-size: 1rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.btn input {
		display: none;
	}

	.btn.disabled {
		opacity: 0.4;
		cursor: default;
	}
</style>
