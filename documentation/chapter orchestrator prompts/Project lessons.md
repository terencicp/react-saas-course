# Project lessons

## Read

- `documentation/content/chapter outlines/Chapter <X>.md`: Read only the headers to understand how many lessons there are in the chapter.

## Create continuity notes

- `documentation/content/lesson outlines/Chapter <X>/Continuity notes.md`, add just the heading `# Chapter <X> — <Chapter title>`.

## Project code

Pass each subagent only the fields listed, no need to prompt the agent further, it already knows what to do.

1 **project-architect**: chapter id `<X>`. Returns the plan path and the ordered list of slice ids.
2 **project-scaffolding-coder**: chapter id `<X>`, plan path.
3 **project-slice-coder**: chapter id `<X>`, plan path, slice id. Run a new subagent sequentially for each slice id in the order returned by the architect.
4 **project-start-coder**: chapter id `<X>`, plan path.
5 **project-reviewer**: chapter id `<X>`, plan path. Returns the list of divergences between the plan and the built solution and start.
6 **project-corrector**: chapter id `<X>`, plan path, the reviewer's divergence list inline. Run only if the reviewer reported divergences. If the corrector flags an inconsistency in the plan itself surface it in the chat.
7 **project-summarizer**: chapter id `<X>`.

## For each lesson

### 1 Create folders and files

Folder and file names: Strip # and `, replace / with -, no markup.

- `src/content/docs/<X> <Chapter name>`.
- `documentation/content/lesson outlines/Chapter <X>`

### 2 Run the agent sequence

1 **project-lesson-outliner**: chapter id `<X>`, lesson number `<Y>`, lesson title, plan path, continuity notes path. Returns the lesson outline path and the updated lesson title that should be used from now on.
2 **project-lesson-writer**: chapter id `<X>`, lesson number `<Y>`, lesson title, lesson outline path, plan path, chapter folder path. Returns the lesson MDX path.
3 **project-lesson-formatter**: lesson MDX path, lesson outline path.
4 **lesson-reviewer**: chapter id `<X>`, lesson outline path, lesson MDX path, the continuity notes paths for this chapter and the two preceding chapters. Returns the list of issues.
5 **lesson-corrector**: chapter id `<X>`, lesson outline path, lesson MDX path, the reviewer's issue list inline. Its goal is to fix the current lesson only, if there's an issue with a previous lesson surface it in the chat, do not share them with the corrector.
6 **lesson-continuity**: chapter id `<X>`, lesson number `<Y>`, lesson MDX path, lesson outline path, continuity notes path.
