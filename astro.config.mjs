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
			sidebar: [
				{
					label: 'Demos',
					items: [{ autogenerate: { directory: '0 Demos' } }],
				},
			],
		}),
	],
});
