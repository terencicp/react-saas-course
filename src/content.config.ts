import { defineCollection, z } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

export const collections = {
	docs: defineCollection({
		loader: docsLoader(),
		schema: docsSchema({
			extend: z.object({
				// Course-wide custom frontmatter, surfaced in the LessonEyebrow
				// rendered above each lesson's H1 (see
				// src/components/overrides/PageTitle.astro).
				//
				// `chapter-id` is `z.coerce.string()` because many existing lessons
				// write it as an unquoted YAML number (e.g. `chapter-id: 91`), which
				// the YAML parser hands us as a `number`. Coerce keeps both shapes
				// valid and gives the component a `string` to render.
				'chapter-id': z.coerce.string().optional(),
				'chapter-title': z.string().optional(),
			}),
		}),
	}),
};
