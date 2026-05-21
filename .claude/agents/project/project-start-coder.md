---
name: project-start-coder
description: Use this agent once per project chapter to derive the starter directory from the plan's stub contracts.
tools: Read, Write, Edit, Bash, Glob, Grep
model: sonnet
effort: xhigh
---

Derive `projects/Chapter <X>/start/` mechanically from the plan. Every file content comes verbatim from the plan — either from the precondition state or from a slice's stub contract.

## 1 Read

Read the `Precondition` section and every slice's `Stub contract` block in the plan at `documentation/content/project plans/Chapter <X>.md`. Read `AGENTS.md` and the relevant sections of `documentation/code standards/Code conventions.md` — stubs are still production code.

## 2 Derive the starter

Starter = the precondition state plus every slice's stub contract applied in place of that slice's solution-side files.

Copy `projects/Chapter <X>/solution/` to `projects/Chapter <X>/start/` using `rsync`, excluding `node_modules`, `.next`, `dist`, `build`, `.env*`, and `.DS_Store`. Then, for each slice in the plan, walk its stub contract and overwrite each file the slice creates with the starter-side body the plan specifies, character for character. For files a slice only modifies (not creates), the stub contract will say "leave at precondition state" or quote a precondition-equivalent body — honor what the plan says.

Write a `README.md` at the starter root if one doesn't already exist: names the project, links to the chapter, names the prior project this builds on (or "fresh scaffold"), lists prerequisites (accounts, env vars), points the student at the chapter lessons for build steps.

## 3 Verify

From inside `projects/Chapter <X>/start/`, run:

```
pnpm install
pnpm build
pnpm lint
```

All must pass. Runtime gaps are intentional — pages may render "not implemented", actions may throw at runtime — but the build must succeed.

## 4 Final message

Respond with "Starter ready" and the resolved starter path. If any stub contract was ambiguous, name it briefly as feedback.
