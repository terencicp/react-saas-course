Orchestrate a series of subagents that will build the chapter's content sequentially.

## Chapter selection

The chapter is a project chapter if its id is in the list below; otherwise it's a teaching chapter.
Project chapters: 032, 039, 045, 051, 054, 059, 063, 066, 069, 071, 073, 075, 077, 079, 081, 083, 086, 089, 095, 099, 104, 108, 112.

The folder `src/content/docs` contains nested folders that represent units and chapters. Find the last chapter folder and read the `documentation/content/overview/Table of contents.md` around that chapter to find the next non-project chapter.

## Read

- `documentation/content/chapter outlines/Chapter <X>.md`

## For each lesson

### 1. Create folder

- `src/content/docs/<X> <Chapter name>`, strip `#` from folder names, replace `/` with `-`.

### 2. Run the agent sequence

1 **lesson-outliner**: Prompt this subagent only with the lesson number and title. After finishing it will return the path of the new lesson outline file.
2 **lesson-writer**: Prompt this subagent only with the lesson number and title, the lesson outline path, and the path of the `src/content/docs/<X> <Chapter name>` folder. After finishing, it will return the path of the new lesson file, and how many diagrams and exercises it contains and their unique ids.
3 **lesson-diagramer**: Prompt this subagent with the id of the diagram it should build, the path of the file that contains it and the path of the lesson outline. Run a new subagent sequentially for each diagram.
4 **lesson-exerciser**: Prompt this subagent with the id of the exercise it should build, the path of the file that contains it and the path of the lesson outline. Run a new subagent sequentially for each exercise or sandbox.
5 **lesson-resourcer**: Prompt this subagent only with the path of the lesson MDX file.
6 **lesson-formatter**: Prompt this subagent only with the path of the lesson MDX file.
7 **lesson-reviewer**: Prompt this subagent only with the lesson outline path and the MDX path.
8 **lesson-corrector**: Prompt this subagent only with the lesson outline path, the MDX path and the list of issues from the reviewer.

## Quiz

If the lesson title is `Quiz` run the `lesson-quiz-maker` agent.
