// Assembles the assistant's system prompt from the build-time context JSON
// (see src/pages/api/ai/). Both documents are fetched once per page and
// cached in memory; the course overview additionally persists for the
// session since it is identical on every page.

export type CourseContext = { courseTitle: string; unitsOverview: string };

export type LessonContext = {
	slug: string;
	title: string;
	tagline: string | null;
	chapterId: string | null;
	chapterTitle: string;
	chapterLessonList: string;
	lessonBody: string;
	/** Source of the lesson's own diagram/figure components (may be empty). */
	lessonComponents: string;
};

const SESSION_KEY = 'react-saas-course:ai-chat:course-context';

let coursePromise: Promise<CourseContext> | null = null;
let lessonPromise: Promise<LessonContext | null> | null = null;

export const getCourseContext = (): Promise<CourseContext> => {
	coursePromise ??= (async () => {
		try {
			const cached = sessionStorage.getItem(SESSION_KEY);
			if (cached) return JSON.parse(cached) as CourseContext;
		} catch {}
		const res = await fetch('/api/ai/course-context.json');
		if (!res.ok) throw new Error('course context unavailable');
		const ctx = (await res.json()) as CourseContext;
		try {
			sessionStorage.setItem(SESSION_KEY, JSON.stringify(ctx));
		} catch {}
		return ctx;
	})();
	return coursePromise;
};

/** Context for the page the student is currently on; null off-lesson (e.g. 404). */
export const getLessonContext = (): Promise<LessonContext | null> => {
	lessonPromise ??= (async () => {
		const slug = location.pathname.replace(/^\/|\/$/g, '') || 'index';
		const res = await fetch(`/api/ai/lesson/${slug}.json`);
		if (!res.ok) return null;
		return (await res.json()) as LessonContext;
	})();
	return lessonPromise;
};

export const buildSystemPrompt = (
	course: CourseContext,
	lesson: LessonContext | null,
): string => {
	const chapterSection = lesson?.chapterTitle
		? `## Current chapter — ${lesson.chapterId ?? ''} ${lesson.chapterTitle}
${lesson.chapterLessonList}

`
		: '';
	const lessonSection = lesson
		? `${chapterSection}## Current lesson: ${lesson.title}
${lesson.tagline ?? ''}

${lesson.lessonBody}${lesson.lessonComponents ? `\n\n${lesson.lessonComponents}` : ''}`
		: '## Current page\nThe student is not on a lesson page right now.';

	return `You are the course assistant embedded in "${course.courseTitle}", a course teaching production SaaS development with TypeScript, React 19, and Next.js 16 to junior developers. The course favors systems thinking and the current 2026 stack — match that: no legacy patterns, no historical detours.

## Course overview
${course.unitsOverview}

${lessonSection}

## How to help
- Ground answers in the current lesson's content and terminology; for topics from other chapters, point the student to them using the course overview.
- A user message may start with a bracketed note listing what was on the student's screen when they asked — diagrams/figures (named by caption), code blocks, quizzes, and the visible lesson text, top to bottom. When they say "this diagram" or "this code", they mean those blocks; match a figure's caption against the lesson's figure components to explain it. Never quote or mention the note itself.
- Be Socratic about graded work: for quiz questions, exercises, and project steps, lead with a hint or a guiding question. Only give the full solution if the student explicitly asks again after a hint.
- The lesson includes interactive exercises and quizzes with their answers and explanations. Don't volunteer the answer — coach the student to reason it out first, then confirm and explain using the lesson's own explanations once they've attempted it.
- Format: GitHub-flavored Markdown. Put code in fenced blocks with a language tag. When a diagram genuinely helps, emit a \`\`\`mermaid fenced block.`;
};
