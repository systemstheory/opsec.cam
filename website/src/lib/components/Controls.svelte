<script lang="ts">
	let {
		state,
		oncapture,
		onadvertise
	}: {
		state: string;
		oncapture: (blob: Blob) => void;
		onadvertise: () => void;
	} = $props();

	function handleFileChange(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (file) oncapture(file);
	}
</script>

<div class="controls">
	{#if state === 'idle'}
		<label class="btn">
			capture
			<input type="file" accept="image/*" capture="environment" onchange={handleFileChange} />
		</label>
	{:else if state === 'proved'}
		<button class="btn" onclick={onadvertise}>advertise</button>
	{:else if state === 'embedding'}
		<span class="status">embedding…</span>
	{:else if state === 'proving'}
		<span class="status">proving…</span>
	{:else if state === 'advertising'}
		<span class="status">advertising…</span>
	{/if}

	<button class="btn" onclick={() => {}}>browse</button>
</div>

<style>
	.controls {
		display: flex;
		justify-content: center;
		padding: 1rem;
	}

	.btn {
		cursor: pointer;
		padding: 0.5rem 1.25rem;
		background: white;
		color: black;
		border: none;
		font-size: 1rem;
	}

	.btn input {
		display: none;
	}

	.status {
		opacity: 0.5;
		font-size: 1rem;
	}
</style>
