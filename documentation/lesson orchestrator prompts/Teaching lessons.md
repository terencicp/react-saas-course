Orchestrate a series of subagents that will build the chapter's content. Do not edit the lesson prose or the chapter outline.

## Chapter selection

The chapter is a project chapter if its id is in the list below; otherwise it's a teaching chapter.
Project chapters: 4.12, 5.7, 6.6, 7.6, 8.3, 9.5, 10.4, 11.3, 12.3, 13.2, 13.4, 14.2, 15.2, 15.4, 16.2, 16.4, 17.3, 18.3, 19.6, 20.4, 21.5, 22.4, 23.4.

The folder `src/content/docs` contains nested folders that represent units and chapters. Find the last chapter folder and read the `documentation/content/overview/Table of contents.md` around that chapter to find the next non-project chapter.

## Read

- `documentation/content/chapter outlines/Chapter <X.Y>.md`

## For each lesson

### 1. Create folders

- `documentation/content/lesson outlines/Chapter <X.Y>`
- `src/content/docs/<X> <Unit name>/<X.Y> <Chapter name>`, strip `#`  from names.

### 2. Run the agent sequence

1 **lesson-outliner**: Prompt this subagent only with the lesson number and title. After finishing it will return the path of the new lesson outline file.
2 **lesson-writer**: Prompt this subagent only with the lesson number and title, and the path of the `src/content/docs/<X> <Unit name>/<X.Y> <Chapter name>` folder. After finishing, it will return the path of the new lesson file, and how many diagrams and exercises it contains and their unique ids.
3 **lesson-diagramer**: Prompt this subagent with the id of the diagram it should build, the path of the file that contains it and the path of the chapter outline.
4 **lesson-exerciser**: Prompt this subagent with the id of the exercise it should build, the path of the file that contains it and the path of the chapter outline. 
5 **lesson-resourcer**: Prompt this subagent only with the path of the lesson MDX file.
6 **lesson-formatter**: Prompt this subagent only with the path of the lesson MDX file.

10. `lesson-reviewer`
11. `lesson-improver` — only if previous reviewer reports issues, fire reviewer and improver again once if necessary

<!-- TODO: Describe inputs and outputs of agents -->

## Quiz

If the lesson title is `Quiz` run the `lesson-quiz-maker` agent.
