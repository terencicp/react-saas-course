// Build-time readers for the course-level documents that feed the AI
// assistant's context (see src/pages/api/ai/). Reads happen once per build
// and are cached at module level.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const overviewUrl = (file: string) =>
	fileURLToPath(new URL(`../../../documentation/content/overview/${file}`, import.meta.url));

let unitsOverview: string | null = null;

/** Compact (~920 word) course map from Units.md, included in every system prompt. */
export const getUnitsOverview = (): string => {
	unitsOverview ??= readFileSync(overviewUrl('Units.md'), 'utf-8').trim();
	return unitsOverview;
};

export type ChapterToc = {
	chapterTitle: string;
	/** Markdown bullet list of the chapter's lessons with one-line descriptions. */
	lessonList: string;
};

let tocByChapter: Map<string, ChapterToc> | null = null;

/**
 * Parses `Table of contents.md` into a per-chapter lookup. Chapters appear as
 * `### Chapter NNN — Title` headings followed by one bullet per lesson.
 */
const parseToc = (): Map<string, ChapterToc> => {
	const map = new Map<string, ChapterToc>();
	const src = readFileSync(overviewUrl('Table of contents.md'), 'utf-8');
	const heading = /^### Chapter (\d{3}) — (.+)$/gm;
	let match: RegExpExecArray | null;
	const found: { id: string; title: string; start: number }[] = [];
	while ((match = heading.exec(src)) !== null) {
		found.push({ id: match[1]!, title: match[2]!.trim(), start: match.index + match[0].length });
	}
	found.forEach((chapter, i) => {
		const end = i + 1 < found.length ? src.indexOf('#', chapter.start) : src.length;
		const body = src.slice(chapter.start, end === -1 ? src.length : end);
		const lessonList = body
			.split('\n')
			.filter((line) => line.startsWith('- '))
			.join('\n');
		map.set(chapter.id, { chapterTitle: chapter.title, lessonList });
	});
	return map;
};

/** Chapter title + lesson list for a frontmatter `chapter-id` (pads unquoted `91` → `091`). */
export const getChapterToc = (chapterId: string | undefined): ChapterToc | null => {
	if (!chapterId) return null;
	tocByChapter ??= parseToc();
	return tocByChapter.get(chapterId.padStart(3, '0')) ?? null;
};
