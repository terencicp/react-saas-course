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

				// Fraction (0–1) of the whole course completed as of this lesson,
				// rendered as the fill width of the top progress strip (see
				// src/components/ui/CourseProgressBar.astro). Optional: lessons
				// without it render normally, with no bar.
				'course-progress': z.number().min(0).max(1).optional(),

				// One-sentence high-level framing of the lesson, rendered as a
				// subtitle below the H1 (see
				// src/components/overrides/PageTitle.astro). Lessons dive straight
				// into their topic, so this orients the student before the first
				// paragraph. Plain text, no markdown. Optional.
				tagline: z.string().optional(),
			}),
		}),
	}),
};
