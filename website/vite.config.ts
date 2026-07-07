import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { execSync } from 'child_process';
import wasm from 'vite-plugin-wasm';

const commitHash = execSync('git rev-parse --short HEAD').toString().trim();

export default defineConfig({
	define: {
		__GIT_HASH__: JSON.stringify(commitHash)
	},
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
