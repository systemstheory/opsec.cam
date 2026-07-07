<script lang="ts">
	interface Props {
		frames: string[];
		index: number;
	}
	let { frames, index }: Props = $props();
</script>

<span class="icon">{@html frames[index]}</span>

<style>
	.icon {
		display: contents;
	}
	.icon :global(svg) {
		width: 100%;
		height: 100%;
		display: block;
	}
</style>
