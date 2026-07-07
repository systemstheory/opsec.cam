<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		frozenSrc?: string | null;
		capture?: () => Promise<Blob>;
	}
	let { frozenSrc = null, capture = $bindable() }: Props = $props();

	let canvasEl: HTMLCanvasElement;
	let stream: MediaStream | null = null;
	let rafId: number;
	let video: HTMLVideoElement | null = null;

	function draw() {
		if (!video) return;
		const ctx = canvasEl.getContext('2d');
		if (!ctx) return;

		const cw = canvasEl.offsetWidth;
		const ch = canvasEl.offsetHeight;
		canvasEl.width = cw;
		canvasEl.height = ch;

		if (video.readyState >= video.HAVE_CURRENT_DATA && video.videoWidth > 0) {
			const vw = video.videoWidth;
			const vh = video.videoHeight;
			const scale = Math.max(cw / vw, ch / vh);
			const drawW = vw * scale;
			const drawH = vh * scale;
			const x = (cw - drawW) / 2;
			const y = (ch - drawH) / 2;
			ctx.drawImage(video, x, y, drawW, drawH);
		}

		rafId = requestAnimationFrame(draw);
	}

	function drawFrozen(src: string) {
		cancelAnimationFrame(rafId);
		const img = new Image();
		img.onload = () => {
			const ctx = canvasEl.getContext('2d');
			if (!ctx) return;
			const cw = canvasEl.offsetWidth;
			const ch = canvasEl.offsetHeight;
			canvasEl.width = cw;
			canvasEl.height = ch;
			const scale = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
			const drawW = img.naturalWidth * scale;
			const drawH = img.naturalHeight * scale;
			ctx.drawImage(img, (cw - drawW) / 2, (ch - drawH) / 2, drawW, drawH);
		};
		img.src = src;
	}

	$effect(() => {
		if (frozenSrc) {
			drawFrozen(frozenSrc);
		} else if (video) {
			rafId = requestAnimationFrame(draw);
		}
	});

	onMount(() => {
		video = document.createElement('video');
		video.autoplay = true;
		video.playsInline = true;
		video.muted = true;
		video.setAttribute('playsinline', '');
		video.setAttribute('webkit-playsinline', '');

		capture = () =>
			new Promise((resolve, reject) => {
				canvasEl.toBlob(
					(blob) => (blob ? resolve(blob) : reject(new Error('capture failed'))),
					'image/jpeg',
					0.92
				);
			});

		navigator.mediaDevices
			.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
			.then((s) => {
				stream = s;
				video!.srcObject = s;
				video!
					.play()
					.then(() => {
						if (!frozenSrc) rafId = requestAnimationFrame(draw);
					})
					.catch(console.error);
			})
			.catch(console.error);

		return () => {
			cancelAnimationFrame(rafId);
			stream?.getTracks().forEach((t) => t.stop());
		};
	});
</script>

<canvas bind:this={canvasEl}></canvas>

<style>
	canvas {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		display: block;
	}
</style>
