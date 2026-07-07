<script lang="ts">
	import EmbedIcon from '$lib/assets/EmbedIcon.svelte';
	import ProveIcon from '$lib/assets/ProveIcon.svelte';
	import AdvertiseIcon from '$lib/assets/AdvertiseIcon.svelte';
	import Circuit from '$lib/assets/Circuit.svelte';
	import Context from '$lib/assets/Context.svelte';
	import Register from '$lib/assets/Register.svelte';
	import Frame from '$lib/assets/Frame.svelte';
	import { PUBLIC_OPSEC_CAMERA_ADDRESS } from '$env/static/public';
</script>

<div class="about">
	<p>
		Opsec Camera is an app that allows it's users to share semantic image captions, while keeping
		the images and their computation fully private.<br />
		It does so by projecting an image into an
		<a href="https://openai.com/index/clip/" target="_blank">embedding space</a>, and interpreting
		it through what we call a <b>lens</b>.<br />
		A lens is a fixed set of rules for interpreting the image encased in a zero-knowledge circuit: it
		ranks 128 curated phrases by similarity to the image and outputs the top 6 as a caption, along with
		a proof that this exact set of rules produced it. Output of the lens can then be posted by anyone
		with a valid proof of this computation into a shared registry of image captions.
	</p>
	<figure>
		<Circuit />
	</figure>

	<p>
		These affordances also enable for both humans and machines to download the lens and make it part
		of different contexts and use cases - accumulating history just like a physical device would.
	</p>

	<figure>
		<Context />
	</figure>

	<br />
	<br />

	<p>
		We believe that with the pincer proliferation of artificial intelligence and modern
		cryptography, the latter can provide anchoring and tools in a form of robust computation
		primitives for the fuzzy design spaces opened up by the former.<br />
	</p>

	<p class="colophon">
		<span class="colophon-block">
			<span><a href="https://glycerin.cloud" target="_blank">glycerin cloud</a> 2026</span>
			<span><!--<span class="hidden">glycerin cloud</span>-->0 vapor</span>
		</span>

		<span>
			<a href="https://github.com/__GIT_HASH__" target="_blank"> __GIT_HASH__ </a>
		</span>
	</p>
</div>

<style>
	figure {
		margin: 1rem 0 0 0;
	}

	.about {
		padding: 100px 0 1rem 0;
		display: flex;
		flex-direction: column;
		min-height: calc(100svh - 6rem);
		box-sizing: border-box;
	}

	a {
		color: rgb(217, 217, 217);
	}

	p {
		line-height: 180%;
		font-size: 1.15rem;
		word-break: break-word;
	}

	.flow {
		display: flex;
		border: 1px solid #000;
	}

	.flow-step {
		border: 1px solid #000;
	}

	.hidden {
		visibility: hidden;
	}

	.colophon {
		margin: auto 0 0 0;
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		line-height: 140%;
	}

	.colophon-block {
		display: flex;
		flex-direction: column;
	}
</style>
