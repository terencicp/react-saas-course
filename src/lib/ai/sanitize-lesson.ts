// Cleans a lesson's raw MDX body for use as AI-assistant context (see
// src/pages/api/ai/lesson/[...slug].json.ts). This is noise removal, not
// answer policing: exercise answers and the author's explanations are left
// intact so the tutor can ground its answers in them and confirm a student's
// reasoning. The Socratic "hint first, don't volunteer the answer" behavior
// is handled in the system prompt (see src/components/ai-chat/lib/prompt.ts).

/** Drops MDX import statements (single- and multi-line) from the body. */
const stripImports = (src: string): string => {
	const lines = src.split('\n');
	const out: string[] = [];
	let inImport = false;
	for (const line of lines) {
		if (inImport) {
			if (/from\s+['"][^'"]+['"];?\s*$/.test(line)) inImport = false;
			continue;
		}
		if (/^import\s/.test(line)) {
			// A single-line import ends on this line; an open `{ … }` block
			// without a closing `from '…'` continues onto the next.
			if (
				!/from\s+['"][^'"]+['"];?\s*$/.test(line) &&
				!/^import\s+['"][^'"]+['"];?\s*$/.test(line)
			) {
				inImport = true;
			}
			continue;
		}
		out.push(line);
	}
	return out.join('\n');
};

export const sanitizeLessonBody = (body: string): string => {
	let out = stripImports(body);
	// The progress bar is a build-time widget; drop its now-orphaned tag.
	out = out.replace(/<CourseProgressBar[^>]*\/>\s*/g, '');
	return out.replace(/\n{3,}/g, '\n\n').trim();
};
