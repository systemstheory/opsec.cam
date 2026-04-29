import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';

export default defineConfig({
	plugins: [sveltekit(), wasm()],
	server: {
		headers: {
			'Cross-Origin-Opener-Policy': 'same-origin',
			'Cross-Origin-Embedder-Policy': 'require-corp'
		}
	},
	preview: {
		headers: {
			'Cross-Origin-Opener-Policy': 'same-origin',
			'Cross-Origin-Embedder-Policy': 'require-corp'
		}
	},
	worker: {
		format: 'es',
		plugins: () => [wasm()]
	},
	optimizeDeps: {
		exclude: ['@ezkljs/engine'],
		include: ['json-bigint']
	},
	build: {
		commonjsOptions: {
			include: [/json-bigint/, /node_modules/]
		}
	}
});
