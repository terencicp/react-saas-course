// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import mermaid from 'astro-mermaid';
import starlightFullViewMode from 'starlight-fullview-mode';
import starlightLinksValidator from 'starlight-links-validator';

// https://astro.build/config
export default defineConfig({
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
	if (isRoot) {
		var last = localStorage.getItem('lastLesson');
		if (last && last.charAt(0) === '/' && last.charAt(1) !== '/' && last !== path) {
			location.replace(last);
		}
	} else {
		try { localStorage.setItem('lastLesson', path); } catch (e) {}
	}
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
