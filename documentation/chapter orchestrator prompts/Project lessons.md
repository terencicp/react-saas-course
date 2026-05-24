# Project lessons

## Project code

Run this agent sequence once, before writing the lessons:

1 **project-chapter-outline-lessons-aligner**: Prompt with chapter id `<X>`. Aligns the chapter outline with what the preceding teaching lessons actually delivered before the architect plans against it.
2 **project-architect**: Prompt with chapter id `<X>`. Returns the plan path and the ordered list of slice ids.
3 **project-plan-verifier**: Prompt with chapter id `<X>`, plan path.
4 **project-scaffolding-coder**: Prompt with chapter id `<X>`, plan path.
5 **project-slice-coder**: Prompt with chapter id `<X>`, plan path, slice id. Run a new subagent sequentially for each slice id in the order returned by the architect. Pass any other relevant info the slice coder might need.
6 **project-start-coder**: Prompt with chapter id `<X>`, plan path.
7 **project-reviewer**: Prompt with chapter id `<X>`, plan path. Returns the list of issues to correct.
8 **project-corrector**: Prompt with chapter id `<X>`, plan path, the reviewer's issue list. Run only if the reviewer reported issues.
9 **project-summarizer**: Prompt with chapter id `<X>`.
10 **project-chapter-outliner**: Prompt with chapter id `<X>`.

## Lessons

Run this agent sequence for each lesson:

1 **project-lesson-outliner**: Prompt with chapter id `<X>`, lesson number `<Y>`, lesson title, continuity notes path. Returns the lesson outline path and the updated lesson title that should be used from now on.
2 **project-lesson-writer**: Prompt with chapter id `<X>`, lesson number `<Y>`, lesson title, lesson outline path, chapter folder path. Returns the lesson MDX path.
3 **project-lesson-formatter**: Prompt with lesson MDX path, lesson outline path.
4 **project-lesson-reviewer**: Prompt with chapter id `<X>`, lesson outline path, lesson MDX path, the continuity notes paths for this chapter and the two preceding chapters. Returns the list of issues.
5 **project-lesson-corrector**: Prompt with chapter id `<X>`, lesson outline path, lesson MDX path, the reviewer's issue list inline. Run only if the reviewer reported issues. Its goal is to fix the current lesson only; if there's an issue with a previous lesson surface it in the chat, do not share it with the corrector.
