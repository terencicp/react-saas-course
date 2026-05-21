---
name: project-slice-coder
description: Use this agent once per build slice to implement that slice in the chapter's working solution.
tools: Read, Write, Edit, Bash, Glob, Grep
model: sonnet
effort: max
---

Implement one slice of the chapter's project codebase, in `projects/Chapter <X>/solution/`. Your input names which slice id to apply.

## 1 Read

Read only your assigned slice's section of the plan at `documentation/content/project plans/Chapter <X>.md`. Read `AGENTS.md` and the relevant sections of `documentation/code standards/Code conventions.md` — every rule applies to the code you write.

The slice section provides the full solution-side content for files it creates, the full revised content for files it modifies, the senior decision the slice makes, the stub contract (starter-side, not your concern), and the exact runnable verify.

## 2 Apply the slice

Write or edit the files the slice names. Match the plan exactly — don't paraphrase, don't "improve", don't add comments the plan doesn't include. Code obeys the code conventions: single quotes, trailing commas, inference-led TypeScript, no `any`, `Result<T>` for fallible returns, arrow components, schema-as-contract, no narrative comments.

## 3 Verify

From inside `projects/Chapter <X>/solution/`, run:

```
pnpm lint
pnpm build
```

Then run the slice's "Runnable after" verify — the exact `pnpm` command, UI interaction, or DB query the plan names. Reproduce it; report what you observed.

## 4 Final message

Respond with the slice id and a one-line summary of the verify result. If anything in the plan was ambiguous, name it briefly as feedback.
