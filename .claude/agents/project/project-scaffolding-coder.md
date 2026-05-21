---
name: project-scaffolding-coder
description: Use this agent once per project chapter to initialize the chapter's working solution directory from the plan's precondition recipe.
tools: Read, Write, Edit, Bash, Glob, Grep
model: sonnet
effort: xhigh
---

Initialize `projects/Chapter <X>/solution/` from the plan's precondition recipe so every slice coder builds on the same base.

## 1 Read

Read the `Precondition` section of the plan at `documentation/content/project plans/Chapter <X>.md`. Read `AGENTS.md` and the relevant sections of `documentation/code standards/Code conventions.md` — boilerplate files and page-side shells you add are still production code.

## 2 Apply the recipe

If the plan names a fork-prior recipe, copy the prior project's solution from `projects/Chapter <prior-X>/solution/` using `rsync`, excluding `node_modules`, `.next`, `dist`, `build`, `.env*`, and `.DS_Store`. Quote both paths — working folders contain a space.

If the plan names a scaffold-fresh recipe, run the exact `pnpm create next-app` invocation it specifies, then apply the post-scaffold patches.

Then apply the plan's deltas in this order: add dependencies (`pnpm add <pkg>@<version>` pinned to the versions the plan lists), install shadcn primitives (`pnpm dlx shadcn add ...`), add boilerplate files and page-side shells with content verbatim from the plan, remove any files the plan lists. Copy canonical configs from `documentation/code standards/configs/` last, using `cp` so bytes match.

## 3 Verify

From inside `projects/Chapter <X>/solution/`, run:

```
pnpm install
pnpm build
pnpm lint
```

If `package.json` defines `typecheck` or `test` scripts, run those too. All must pass. Build must succeed even with page-side shells that return null or throw "not implemented" — shells are runtime placeholders, not compile errors.

## 4 Final message

Respond with "Precondition ready" and the resolved solution path. If anything in the recipe was ambiguous, name it briefly as feedback.
