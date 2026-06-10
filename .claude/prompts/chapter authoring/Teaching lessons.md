# Teaching lessons

## Continuity

Create the `documentation/content/lesson outlines/Chapter <X>/Continuity notes.md` file with just the heading `# Chapter <X> — <Chapter title>`.

## Phase A — Spine

Run this sequence for each lesson, one lesson at a time in order, so each lesson's continuity entry is ready before the next lesson is outlined:

1 **lesson-outliner**: chapter id `<X>`, lesson number `<Y>`, lesson title, continuity notes path. Returns the lesson outline path and the updated lesson title that should be used from now on.
2 **lesson-writer**: chapter id `<X>`, lesson number `<Y>`, lesson title, lesson outline path, chapter folder path. Returns the lesson MDX path plus the count and unique ids of its diagrams and exercises/sandboxes.
3 **lesson-continuity**: chapter id `<X>`, lesson number `<Y>`, lesson MDX path, lesson outline path, continuity notes path.

Once every lesson's spine is done, run **lesson-build-fixer** once: chapter id `<X>`, chapter folder path.

## Phase B — Build-out

After Phase A is done for every lesson, finish the lessons in parallel.
Work in batches of at most 3 lessons.
Start one dev server per lesson in the batch, each on its own port, so batched agents never share a browser tab; pass each agent its lesson's port.
For each lesson in the batch run the step below in order, then move on to the next batch.
Step 1 is a round-robin; steps 2–6 each launch one agent per lesson.

1 **Diagrams and exercises**: each round, take from every lesson in the batch its next unbuilt id — diagrams first, then exercises/sandboxes — and run its agent in parallel; await the round and repeat until the batch's lists are exhausted, so each lesson's MDX is edited by one agent at a time.
  - **lesson-diagramer**: chapter id `<X>`, lesson number `<Y>`, diagram id, lesson MDX path, lesson outline path, preview port.
  - **lesson-exerciser**: chapter id `<X>`, lesson number `<Y>`, exercise/sandbox id, lesson MDX path, lesson outline path, preview port.
2 **lesson-resourcer**: lesson MDX path.
3 **lesson-formatter**: lesson MDX path, lesson outline path, preview port.
4 **lesson-reviewer**: chapter id `<X>`, lesson outline path, lesson MDX path, the continuity notes paths for this chapter and the two preceding chapters. Returns the list of issues.
5 **lesson-corrector**: chapter id `<X>`, lesson outline path, lesson MDX path, the reviewer's issue list inline, preview port. Its goal is to fix the current lesson only, if there's an issue with a previous lesson surface it in the chat, do not share them with the corrector.
6 **lesson-tagliner**: lesson MDX path.
7 **lesson-prose-polisher**: lesson MDX path.

## Phase C — Continuity review

Run **lesson-continuity** for each lesson, one at a time in order, with the same fields as Phase A; it reviews and updates each lesson's entry against the finished lesson.

## Quiz

After Phase C, if the lesson title contains `Quiz` run this pipeline:

1 **quiz-writer**: chapter id `<X>`, chapter name, lesson number `<Y>`. Returns the quiz outline path.
2 **quiz-coder**: chapter id `<X>`, chapter name, lesson number `<Y>`, quiz outline path.
