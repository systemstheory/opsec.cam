<script lang="ts">
	import Icon from './Icon.svelte';
	import frame0 from '../../../static/photos1.svg?raw';
	import frame1 from '../../../static/photos2.svg?raw';
	let { index } = $props();
</script>

<Icon frames={[frame0, frame1]} {index} />
