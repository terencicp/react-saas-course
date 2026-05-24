Orchestrate a series of subagents that will build the chapter's content sequentially, no parallelism. Read only the minimal set of project files you need for your task. Pass the project's base paths to all subagents: `/Users/terenci/react-saas-course/`; pass each subagent only the fields listed, no need to prompt the agent further, it already knows what to do. Retry any failed steps.

## Read

- `documentation/content/chapter outlines/Chapter <X>.md`: Read only the headers to understand how many lessons there are in the chapter.

## Create folders and files

Folder and file names: Strip # and `, replace / with -, no markup.

- `documentation/content/lesson outlines/Chapter <X>`
- `src/content/docs/<X> <Chapter name>`.

## Chapter selection

The folder `src/content/docs` contains folders that represent chapters. Find the last chapter folder (highest id) and build the next chapter after that.

Project chapter ids: 032, 039, 045, 051, 054, 059, 063, 066, 069, 071, 073, 075, 077, 079, 081, 083, 086, 089, 095, 099, 104, 108, 112. Other chapters are teaching chapters.

If the selected next chapter is a teaching chapter, read the prompt in `documentation/chapter orchestrator prompts/Teaching lessons.md` and follow its instructions. If it's a project chapter, read `documentation/chapter orchestrator prompts/Project lessons.md` and follow its instructions.
