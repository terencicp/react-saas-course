Orchestrate a series of subagents that will build the chapter's content sequentially, no parallelism.

## Chapter selection

The chapter is a project chapter if its id is in the list below; otherwise it's a teaching chapter.
Project chapters: 032, 039, 045, 051, 054, 059, 063, 066, 069, 071, 073, 075, 077, 079, 081, 083, 086, 089, 095, 099, 104, 108, 112.

The folder `src/content/docs` contains nested folders that represent units and chapters. Find the last chapter folder and read the `documentation/content/overview/Table of contents.md` around that chapter to find the next non-project chapter.

## Read

- `documentation/content/chapter outlines/Chapter <X>.md`

## For each lesson

### 1. Create folders

Folder and file names: Strip `#`, replace `/` with `-`.

- `src/content/docs/<X> <Chapter name>`.
- `documentation/content/lesson outlines/<X> <Chapter name>`

### 2. Run the agent sequence

Pass each subagent only the fields listed, no need to prompt the agent further, it already knows what to do.

1 **lesson-outliner**: chapter id `<X>`, lesson number `<Y>`, lesson title. Returns the lesson outline path and the (possibly revised) title.
2 **lesson-writer**: chapter id `<X>`, lesson number `<Y>`, lesson title, lesson outline path, chapter folder path. Returns the lesson MDX path plus the count and unique ids of its diagrams and exercises/sandboxes.
3 **lesson-diagramer**: chapter id `<X>`, lesson number `<Y>`, diagram id, lesson MDX path, lesson outline path. Run a new subagent sequentially for each diagram.
4 **lesson-exerciser**: chapter id `<X>`, lesson number `<Y>`, exercise/sandbox id, lesson MDX path, lesson outline path. Run a new subagent sequentially for each exercise or sandbox.
5 **lesson-resourcer**: lesson MDX path.
6 **lesson-formatter**: lesson MDX path, lesson outline path.
7 **lesson-reviewer**: chapter id `<X>`, lesson outline path, lesson MDX path. Returns the list of issues.
8 **lesson-corrector**: chapter id `<X>`, lesson outline path, lesson MDX path, the reviewer's issue list inline.

## Quiz

If the lesson title is `Quiz` run a simpler pipeline:

1
2
