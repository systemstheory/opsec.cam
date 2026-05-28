<script lang="ts">
	export let uri;
</script>

<div class="photo">
	<div>
		{@html uri}
	</div>
</div>

<style>
	.photos {
		padding: 1rem;
		display: grid;
	}
</style>
