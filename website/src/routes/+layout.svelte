<script lang="ts">
	import type { Snippet } from 'svelte';
	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';
	import { page } from '$app/state';
	import Controls from '$lib/components/Controls.svelte';
	import CaptureIcon from '$lib/assets/CaptureIcon.svelte';
	import PhotosIcon from '$lib/assets/PhotosIcon.svelte';
	import AboutIcon from '$lib/assets/AboutIcon.svelte';
	import AdvertiseIcon from '$lib/assets/AdvertiseIcon.svelte';
	import trashSvg from '../../static/trash1.svg?raw';
	import { controls } from '$lib/controls.svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	const isAbout = $derived(page.url.pathname === '/about');
	const isPhotos = $derived(page.url.pathname.startsWith('/photos'));
	const isPageScroll = $derived(isAbout || isPhotos);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
</svelte:head>

<main class="container" class:page-scroll={isPageScroll}>
	{#if isAbout}
		<a class="about-link" href="/">
			<AboutIcon index="1" />
		</a>
	{:else}
		<a class="about-link" href="/about">
			<AboutIcon index="0" />
		</a>
	{/if}

	{@render children()}

	<Controls>
		{#snippet left()}
			{#if controls.state === 'proved' || controls.state === 'advertising'}
				<button class="btn" onclick={controls.onretry}>
					<span class="icon">{@html trashSvg}</span>
				</button>
			{/if}
		{/snippet}

		{#snippet center()}
			{#if controls.state === 'proved' || controls.state === 'advertising'}
				<button
					class="btn"
					onclick={() => controls.onadvertise?.()}
					disabled={controls.state === 'advertising'}
				>
					<AdvertiseIcon status={controls.state} />
				</button>
			{:else if controls.state !== 'idle'}
				<div class="btn">
					<CaptureIcon status={controls.state} />
				</div>
			{:else if controls.oncapture}
				<button class="btn" onclick={() => controls.oncapture?.()}>
					<CaptureIcon status="idle" />
				</button>
			{:else}
				<a class="btn" href="/">
					<CaptureIcon index={0} />
				</a>
			{/if}
		{/snippet}

		{#snippet right()}
			{#if isPhotos}
				<a class="btn" href="/">
					<PhotosIcon index={1} />
				</a>
			{:else}
				<a class="btn" href="/photos">
					<PhotosIcon index={0} />
				</a>
			{/if}
		{/snippet}
	</Controls>
</main>

<style>
	:global(html, body) {
		margin: 0;
		width: 100%;
		height: 100%;
	}

	:global(body) {
		width: 100%;
		min-height: 100%;
		display: flex;
		justify-content: center;
		padding: 0.5rem 0;
		box-sizing: border-box;
		background: #000;
	}

	:global(body:has(.page-scroll)) {
		height: auto;
	}

	:global(.container) {
		width: 100%;
		height: 100%;
		max-width: 500px;
		display: flex;
		flex-direction: column;
		min-height: 100%;
		position: relative;
		overflow-y: auto;
		font-size: 14px;
		font-family: Arial;
		color: var(--text);
		background: var(--secondary);
		padding-bottom: 5rem;
		box-sizing: border-box;
	}

	:global(.container.page-scroll) {
		height: auto;
		overflow-y: visible;
	}

	:global(img) {
		width: 100%;
	}

	.icon {
		display: contents;
	}
	.icon :global(svg) {
		width: 100%;
		height: 100%;
		display: block;
	}

	.about-link {
		position: absolute;
		top: 1rem;
		right: 1rem;
		cursor: pointer;
		width: 4rem;
		height: 4rem;
		background: white;
		color: black;
		font-size: 1rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		text-decoration: none;
		z-index: 100;
	}
</style>
