<script lang="ts">
	import Icon from './Icon.svelte';
	import frame0 from '../../../static/about1.svg?raw';
	import frame1 from '../../../static/about2.svg?raw';
	let { index } = $props();
</script>

<Icon frames={[frame0, frame1]} {index} />
