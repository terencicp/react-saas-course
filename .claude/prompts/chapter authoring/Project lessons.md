# Project lessons

## Project code

Run this agent sequence once, before writing the lessons. Steps 2–12 form a quality loop — see **Re-plan loop** below.

1 **project-chapter-outline-lessons-aligner**: Prompt with chapter id `<X>`. 
2 **project-architect**: Prompt with chapter id `<X>`. Returns the plan path, the ordered list of slice ids, and the screenshot list. On a re-plan, also pass the relevant feedback from all previous subagents.
3 **project-plan-verifier**: Prompt with chapter id `<X>`, plan path.
4 **project-scaffolding-coder**: Prompt with chapter id `<X>`, plan path.
5 **project-slice-coder**: Prompt with chapter id `<X>`, plan path, slice id. Run a new subagent sequentially for each slice id in the order returned by the architect. Pass any other relevant info the slice coder might need. + optional **project-screenshotter**: Prompt with chapter id `<X>`, plan path, slice id, and the corresponding lesson number. Skip for slices without screenshots.
7 **project-start-coder**: Prompt with chapter id `<X>`, plan path.
8 **project-reviewer**: Prompt with chapter id `<X>`, plan path. Returns the list of issues to correct.
9 **project-corrector**: Prompt with chapter id `<X>`, plan path, the reviewer's issues that require fixes. Run only if the reviewer reported issues.
10 **project-inspector**: Prompt with chapter id `<X>`, plan path.
11 **project-corrector**: Prompt with chapter id `<X>`, plan path, the inspector's issues. Run only if the inspector reported issues.
12 **project-approver**: Prompt with chapter id `<X>`. Runs once. Returns `APPROVED` or `REJECTED` with root-cause feedback.
13 **project-summarizer**: Prompt with chapter id `<X>`.
14 **project-chapter-outline-code-aligner**: Prompt with chapter id `<X>`.

### Re-plan loop

- If the approver `REJECTED`, re-run the architect (step 2) in re-plan mode first, while the failed `solution/` is still on disk for it to inspect. Then delete `projects/Chapter <X>/solution/`, `projects/Chapter <X>/start/`, and `public/screenshots/<X>/`, re-run steps 3–11, and proceed to step 13 — the resulting code is approved by default.

## Lessons

Run this agent sequence for each lesson:

1 **project-lesson-outliner**: Prompt with chapter id `<X>`, lesson number `<Y>`, lesson title. Returns the lesson outline path, the updated lesson title that should be used from now on, and the lesson **type** (`Project overview` / `Walkthrough` / `Implementation`).
2 **project-lesson-test-coder**: Run **only when the lesson type is `Implementation`**. Prompt with chapter id `<X>`, lesson number `<Y>`, lesson outline path, code summary path (`documentation/content/project code outlines/Chapter <X>.md`). Returns the test file path at `projects/Chapter <X>/start/lesson-verification/Lesson <Y>.ts`.
3 **project-lesson-writer**: Prompt with chapter id `<X>`, lesson number `<Y>`, lesson title, lesson outline path, chapter folder path. For `Implementation` lessons, also pass the test file path from step 2. Returns the lesson MDX path.
4 **lesson-diagramer**: Only if the project-lesson-writer reports any diagrams; run a new subagent sequentially for each diagram. Prompt with chapter id `<X>`, lesson number `<Y>`, diagram reference, lesson MDX path, lesson outline path.
5 **project-lesson-screenshotter**: Prompt with lesson MDX path and solution code path. Skip if the project-lesson-writer did not report any screenshots.
6 **project-lesson-resourcer**: Run **only when the lesson type is `Walkthrough` or `Implementation`**. Prompt with lesson MDX path, lesson type.
7 **project-lesson-formatter**: Prompt with lesson MDX path, lesson outline path. Runs after the resourcer so its render check catches anything the resourcer introduced.
8 **project-lesson-reviewer**: Prompt with chapter id `<X>`, lesson number `<Y>`, lesson outline path, lesson MDX path. For `Implementation` lessons, also pass the test file path. Returns the list of issues.
9 **project-lesson-corrector**: Prompt with chapter id `<X>`, lesson outline path, lesson MDX path, the reviewer's issues that require fixes. Run only if the reviewer reported issues. Its goal is to fix the current lesson only; if there's an issue with a previous lesson surface it in the chat, do not share it with the corrector.
