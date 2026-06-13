Orchestrate a series of subagents that will build the chapter's content sequentially, no parallelism unless a step specifies it. Read only the minimal set of project files you need for your task. Pass the project's base paths to all subagents: `/Users/terenci/react-saas-course/`; pass each subagent only the fields listed, no need to prompt the agent further, it already knows what to do. Retry any failed steps. Update course progress status on README. Commit when the chapter is completed (if there is leftover work from a parallel process exclude it from the commit).

## Read

- `documentation/content/chapter outlines/Chapter <X>.md`: Read only the headers to understand how many lessons there are in the chapter.

## Create folders and files

Folder and file names: Strip # and `, replace / with -, replace : with - making sure to leave a space around - and capitalizing the first letter after -, no markup.

- `documentation/content/lesson outlines/Chapter <X>`
- `src/content/docs/<X> <Chapter name>`.

## Chapter selection

The folder `src/content/docs` contains folders that represent chapters. Walk the sorted chapter ids and select the first gap in the sequence — the lowest id that has no folder yet (this builds skipped chapters before extending past the highest id). If there is no gap, select the chapter after the highest id. Run this exact command to find the next chapter:

```bash
ids=$(ls -d /Users/terenci/react-saas-course/src/content/docs/*/ | xargs -n1 basename | cut -c1-3 | grep -E '^[0-9]{3}$' | sort -n)
prev=""; next=""
for id in $ids; do
  if [ -n "$prev" ] && [ "$((10#$id))" -ne "$((10#$prev + 1))" ]; then
    next=$(printf '%03d' $((10#$prev + 1))); break
  fi
  prev=$id
done
[ -z "$next" ] && next=$(printf '%03d' $((10#$prev + 1)))
echo "Next chapter: $next"
```

Project chapter ids: 028, 035, 041, 047, 050, 055, 059, 062, 065, 067, 069, 071, 073, 075, 077, 079, 082, 085, 091, 095, 100, 104, 108. Other chapters are teaching chapters.

If the selected next chapter is a teaching chapter, read the prompt in `.claude/prompts/chapter authoring/Teaching lessons.md` and follow its instructions. If it's a project chapter, read `.claude/prompts/chapter authoring/Project lessons.md` and follow its instructions.
