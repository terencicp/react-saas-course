// Per-lesson context for the AI assistant, prerendered to one static JSON
// file per lesson. The chat widget fetches `/api/ai/lesson/<pathname>.json`
// for whatever page the student is on.
//
// `lessonBody` is the raw MDX body with exercise answers redacted — see
// src/lib/ai/sanitize-lesson.ts for the redaction rules.
import type { APIRoute } from 'astro';
import { getCollection, type CollectionEntry } from 'astro:content';
import { getChapterToc } from '../../../../lib/ai/course-docs';
import { collectLessonComponents, renderLessonComponents } from '../../../../lib/ai/lesson-components';
import { sanitizeLessonBody } from '../../../../lib/ai/sanitize-lesson';

type Doc = CollectionEntry<'docs'>;

// The chapter a lesson belongs to is its first path segment (the content
// folder). Used both as the sibling-grouping key and the TOC fallback.
const chapterSegment = (entry: Doc): string => entry.id.split('/')[0] ?? '';

/** Fallback lesson list when the chapter is missing from Table of contents.md. */
const siblingLessonList = (entry: Doc, all: Doc[]): string =>
	all
		.filter((e) => chapterSegment(e) === chapterSegment(entry) && e.id !== chapterSegment(e))
		.sort((a, b) => (a.data.sidebar?.order ?? 0) - (b.data.sidebar?.order ?? 0))
		.map((e) => `- ${e.data.title}${e.data.tagline ? ` (${e.data.tagline})` : ''}`)
		.join('\n');

/** Chapter title from the original folder name, e.g. "018 Tailwind inside…". */
const folderChapterTitle = (entry: Doc): string => {
	const folder = entry.filePath?.split('/').at(-2) ?? chapterSegment(entry);
	// Root-level pages (index.mdx) sit directly in docs/ — no chapter.
	return folder === 'docs' ? '' : folder.replace(/^\d+\s+/, '');
};

export async function getStaticPaths() {
	const docs = await getCollection('docs');
	return docs
		.filter((entry) => entry.id !== '')
		.map((entry) => ({ params: { slug: entry.id }, props: { entry, docs } }));
}

export const GET: APIRoute<{ entry: Doc; docs: Doc[] }> = ({ props }) => {
	const { entry, docs } = props;
	const chapterId = entry.data['chapter-id'];
	const toc = getChapterToc(chapterId);
	return Response.json({
		slug: entry.id,
		title: entry.data.title,
		tagline: entry.data.tagline ?? null,
		chapterId: chapterId ?? null,
		chapterTitle: toc?.chapterTitle ?? folderChapterTitle(entry),
		chapterLessonList: toc?.lessonList ?? siblingLessonList(entry, docs),
		lessonBody: sanitizeLessonBody(entry.body ?? ''),
		lessonComponents: renderLessonComponents(
			collectLessonComponents(entry.body ?? '', entry.filePath),
		),
	});
};
