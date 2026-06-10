// Collects the source of a lesson's own components — the per-lesson diagrams
// and figures under src/components/lessons/<chapter>/<lesson>/. Their markup
// holds the labels, captions, and the descriptive header comment that let the
// assistant actually explain "the first diagram in this lesson", which the
// prose MDX alone never spells out.
//
// Only components imported from a path containing `components/lessons/` are
// pulled in; shared components (Figure, CodeVariants, exercises…) are not —
// they carry no lesson-specific content.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const IMPORT_RE = /import\s+[^'"]*?\sfrom\s+['"]([^'"]+)['"]/g;

export type LessonComponent = { name: string; source: string };

/**
 * @param body      raw MDX (entry.body)
 * @param filePath  lesson path relative to cwd (entry.filePath)
 */
export const collectLessonComponents = (
	body: string,
	filePath: string | undefined,
): LessonComponent[] => {
	if (!filePath) return [];
	const lessonDir = resolve(process.cwd(), dirname(filePath));
	const out: LessonComponent[] = [];
	const seen = new Set<string>();
	let match: RegExpExecArray | null;
	while ((match = IMPORT_RE.exec(body)) !== null) {
		const spec = match[1]!;
		if (!spec.includes('components/lessons/')) continue;
		const abs = resolve(lessonDir, spec);
		if (seen.has(abs)) continue;
		seen.add(abs);
		try {
			out.push({ name: spec.split('/').at(-1) ?? spec, source: readFileSync(abs, 'utf-8') });
		} catch {
			// Import resolved to something unreadable — skip it silently.
		}
	}
	return out;
};

/** Renders the collected components as a labeled, fenced context section. */
export const renderLessonComponents = (components: LessonComponent[]): string => {
	if (components.length === 0) return '';
	const blocks = components
		.map((c) => `### ${c.name}\n\n\`\`\`astro\n${c.source}\n\`\`\``)
		.join('\n\n');
	return `## Lesson figures and custom components

These components render the diagrams and figures embedded in the lesson above. Read their markup and header comments to describe or explain any diagram the student asks about.

${blocks}`;
};
