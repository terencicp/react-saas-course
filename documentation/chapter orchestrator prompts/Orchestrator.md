Orchestrate a series of subagents that will build the chapter's content sequentially, no parallelism. Read only the minimal set of project files you need for your task. Pass the project's base paths to all subagents: `/Users/terenci/react-saas-course/`; pass each subagent only the fields listed, no need to prompt the agent further, it already knows what to do. Retry any failed steps. Update course progress status on README and commit when the chapter is completed.

## Completion gate

This runs once an hour, so a previous run may still be building the last chapter.
Before anything else, verify the last existing chapter is fully built.
Count the lesson files in the last chapter folder and compare against its expected lesson count in `documentation/content/overview/Lessons per chapter.csv`.

```bash
last=$(basename "$(ls -d /Users/terenci/react-saas-course/src/content/docs/*/ | sort | tail -1)")
id=${last:0:3}
have=$(ls "/Users/terenci/react-saas-course/src/content/docs/$last/"*.mdx 2>/dev/null | wc -l | tr -d ' ')
want=$(awk -F, -v id="$id" '$1==id {print $2}' "/Users/terenci/react-saas-course/documentation/content/overview/Lessons per chapter.csv")
echo "Chapter $id: $have/$want lessons built"
if [ "$have" -lt "$want" ]; then
  echo "UNFINISHED — stop"
elif [ "$((10#$id))" -ge 108 ]; then
  echo "COURSE COMPLETE — stop"
else
  next=$(printf '%03d' $((10#$id + 1)))
  echo "FINISHED — continue with chapter $next"
fi
```

If the output says UNFINISHED, a previous run is still building the last chapter; stop immediately and do nothing else.
If it says COURSE COMPLETE, chapter 108 is the final chapter and there is nothing after it; stop.
Otherwise the last chapter is complete; continue with the steps below to build the next chapter.

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

If the selected next chapter is a teaching chapter, read the prompt in `documentation/chapter orchestrator prompts/Teaching lessons.md` and follow its instructions. If it's a project chapter, read `documentation/chapter orchestrator prompts/Project lessons.md` and follow its instructions.
