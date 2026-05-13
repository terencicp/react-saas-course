// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import mermaid from 'astro-mermaid';
import starlightFullViewMode from 'starlight-fullview-mode';
import starlightLinksValidator from 'starlight-links-validator';
// Expressive Code options live in ./ec.config.mjs so the standalone
// astro-expressive-code <Code> component can load them (it requires a
// dedicated config file because EC plugins are function values).

// https://astro.build/config
export default defineConfig({
	// PGlite ships its Postgres WASM and a ~5 MB filesystem data blob as
	// package-internal assets; Vite's dep optimizer mangles those paths and
	// the FS bundle ends up being served as HTML. Exclude PGlite from the
	// optimizer so its own asset resolution kicks in.
	//
	// `worker.format: 'es'` is needed for the DrizzleCoding component — its
	// worker imports drizzle-orm which Rollup code-splits across multiple
	// chunks, and Vite's default IIFE worker format can't represent that
	// graph. ES-module workers can.
	vite: {
		optimizeDeps: {
			exclude: ['@electric-sql/pglite'],
		},
		worker: {
			format: 'es',
		},
	},
	integrations: [
		mermaid({ autoTheme: true }),
		starlight({
			title: 'React SaaS Course',
			customCss: ['./src/styles/custom.css'],
			plugins: [starlightFullViewMode({}), starlightLinksValidator()],
			head: [
				{
					tag: 'script',
					content: `(function () {
	var path = location.pathname;
	var isRoot = path === '/' || path === '/index.html';
	// Synchronous redirect from / — runs before paint, no flash.
	if (isRoot) {
		var last = localStorage.getItem('lastLesson');
		if (last && last.charAt(0) === '/' && last.charAt(1) !== '/' && last !== path) {
			location.replace(last);
			return;
		}
	}
	// Defer save/heal until <title> is parsed so we can detect 404 pages.
	document.addEventListener('DOMContentLoaded', function () {
		var is404 = /^404\\b/.test(document.title);
		if (is404) {
			// If the saved lesson is what landed us on this 404, clear it
			// and bounce home so we don't strand the user on a dead page.
			if (localStorage.getItem('lastLesson') === path) {
				localStorage.removeItem('lastLesson');
				location.replace('/');
			}
			return;
		}
		if (!isRoot) {
			try { localStorage.setItem('lastLesson', path); } catch (e) {}
		}
	});
})();`,
				},
			],
			sidebar: [
				{
					label: 'Demos',
					items: [{ autogenerate: { directory: '0 Demos' } }],
				},
			],
		}),
	],
});
