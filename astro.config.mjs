// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightFullViewMode from 'starlight-fullview-mode';

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			title: 'React SaaS Course',
			customCss: ['./src/styles/custom.css'],
			plugins: [starlightFullViewMode({})],
			sidebar: [
				{
					label: 'Demos',
					items: [{ autogenerate: { directory: '0 Demos' } }],
				},
			],
		}),
	],
});
