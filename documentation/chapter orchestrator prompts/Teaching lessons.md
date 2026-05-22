# Teaching lessons

## Lessons

Run this agent sequence for each lesson (except Quiz):

1 **lesson-outliner**: chapter id `<X>`, lesson number `<Y>`, lesson title, continuity notes path. Returns the lesson outline path and the updated lesson title that should be used from now on.
2 **lesson-writer**: chapter id `<X>`, lesson number `<Y>`, lesson title, lesson outline path, chapter folder path. Returns the lesson MDX path plus the count and unique ids of its diagrams and exercises/sandboxes.
3 **lesson-diagramer**: chapter id `<X>`, lesson number `<Y>`, diagram id, lesson MDX path, lesson outline path. Run a new subagent sequentially for each diagram.
4 **lesson-exerciser**: chapter id `<X>`, lesson number `<Y>`, exercise/sandbox id, lesson MDX path, lesson outline path. Run a new subagent sequentially for each exercise or sandbox.
5 **lesson-resourcer**: lesson MDX path.
6 **lesson-formatter**: lesson MDX path, lesson outline path.
7 **lesson-reviewer**: chapter id `<X>`, lesson outline path, lesson MDX path, the continuity notes paths for this chapter and the two preceding chapters. Returns the list of issues.
8 **lesson-corrector**: chapter id `<X>`, lesson outline path, lesson MDX path, the reviewer's issue list inline. Its goal is to fix the current lesson only, if there's an issue with a previous lesson surface it in the chat, do not share them with the corrector.
9 **lesson-continuity**: chapter id `<X>`, lesson number `<Y>`, lesson MDX path, lesson outline path, continuity notes path.

## Quiz

If the lesson title contains `Quiz` run this pipeline:

1 **quiz-writer**: chapter id `<X>`, chapter name, lesson number `<Y>`. Returns the quiz outline path.
2 **quiz-coder**: chapter id `<X>`, chapter name, lesson number `<Y>`, quiz outline path.
