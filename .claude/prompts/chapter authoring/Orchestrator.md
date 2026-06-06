Orchestrate a series of subagents that will build the chapter's content sequentially, no parallelism unless a step specifies it. Read only the minimal set of project files you need for your task. Pass the project's base paths to all subagents: `/Users/terenci/react-saas-course/`; pass each subagent only the fields listed, no need to prompt the agent further, it already knows what to do. Retry any failed steps. Update course progress status on README and commit and push when the chapter is completed.

## Read

- `documentation/content/chapter outlines/Chapter <X>.md`: Read only the headers to understand how many lessons there are in the chapter.

## Create folders and files

Folder and file names: Strip # and `, replace / with -, replace : with - making sure to leave a space around - and capitalizing the first letter after -, no markup.

- `documentation/content/lesson outlines/Chapter <X>`
- `src/content/docs/<X> <Chapter name>`.

## Chapter selection

The folder `src/content/docs` contains folders that represent chapters. Find the last chapter folder (highest id) and build the next chapter after that. Run this exact command to find the next chapter:

```bash
last=$(basename "$(ls -d /Users/terenci/react-saas-course/src/content/docs/*/ | sort | tail -1)")
next=$(printf '%03d' $((10#${last:0:3} + 1)))
echo "Last: $last → Next chapter: $next"
```

Project chapter ids: 028, 035, 041, 047, 050, 055, 059, 062, 065, 067, 069, 071, 073, 075, 077, 079, 082, 085, 091, 095, 100, 104, 108. Other chapters are teaching chapters.

If the selected next chapter is a teaching chapter, read the prompt in `.claude/prompts/chapter authoring/Teaching lessons.md` and follow its instructions. If it's a project chapter, read `.claude/prompts/chapter authoring/Project lessons.md` and follow its instructions.
