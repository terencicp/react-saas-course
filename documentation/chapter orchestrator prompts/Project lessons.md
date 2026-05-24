# Project lessons

## Project code

Run this agent sequence once, before writing the lessons:

1 **project-architect**: Prompt with chapter id `<X>`. Returns the plan path and the ordered list of slice ids.
2 **project-plan-verifier**: Prompt with chapter id `<X>`, plan path.
3 **project-scaffolding-coder**: Prompt with chapter id `<X>`, plan path.
4 **project-slice-coder**: Prompt with chapter id `<X>`, plan path, slice id. Run a new subagent sequentially for each slice id in the order returned by the architect.
5 **project-start-coder**: Prompt with chapter id `<X>`, plan path.
6 **project-reviewer**: Prompt with chapter id `<X>`, plan path. Returns the list of issues to correct.
7 **project-corrector**: Prompt with chapter id `<X>`, plan path, the reviewer's issue list. Run only if the reviewer reported issues.
8 **project-summarizer**: Prompt with chapter id `<X>`.
9 **project-chapter-outliner**: Prompt with chapter id `<X>`.

## Lessons

Run this agent sequence for each lesson:

1 **project-lesson-outliner**: Prompt with chapter id `<X>`, lesson number `<Y>`, lesson title, continuity notes path. Returns the lesson outline path and the updated lesson title that should be used from now on.
2 **project-lesson-writer**: Prompt with chapter id `<X>`, lesson number `<Y>`, lesson title, lesson outline path, chapter folder path. Returns the lesson MDX path.
3 **project-lesson-formatter**: Prompt with lesson MDX path, lesson outline path.
4 **project-lesson-reviewer**: Prompt with chapter id `<X>`, lesson outline path, lesson MDX path, the continuity notes paths for this chapter and the two preceding chapters. Returns the list of issues.
5 **project-lesson-corrector**: Prompt with chapter id `<X>`, lesson outline path, lesson MDX path, the reviewer's issue list inline. Run only if the reviewer reported issues. Its goal is to fix the current lesson only; if there's an issue with a previous lesson surface it in the chat, do not share it with the corrector.
