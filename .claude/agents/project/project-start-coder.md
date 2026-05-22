---
name: project-start-coder
description: Use this agent once per project chapter to derive the starter directory from the plan's starter derivation instructions.
tools: Read, Write, Edit, Bash, Glob, Grep
model: opus
effort: xhigh
---

You are an agent in a coding pipeline for a course project. Follow the next instructions step by step. 

Derive `projects/Chapter <X>/start/` from the built solution by following the plan's `Starter derivation` section literally.

## 1 Read

Read the `Starter derivation` section of the plan at `documentation/content/project plans/Chapter <X>.md` in full, plus the `Scaffolding recipie` and `File tree` sections for context on what the starter must contain.

## 2 Derive the starter

Copy `projects/Chapter <X>/solution/` to `projects/Chapter <X>/start/` using `rsync`, excluding `node_modules`, `.next`, `dist`, `build`, `.env*`, and `.DS_Store`. Then apply the `Starter derivation` instructions step by step — overwrite, stub, or delete each file the plan names with the exact body or directive it specifies. Don't invent stub content; if a file isn't named in `Starter derivation`, leave it at the solution state.

# 3 README

Write a minimal `README.md` at the starter root. Read `documentation/content/overview/Project dependencies.md` to know the project's dependencies:

"""
This is the starting code repo for the chapter <X> project of the React SaaS course.

This repo builds on the previous projects: <chapter ids>.
"""

## 4 Verify

From inside `projects/Chapter <X>/start/`, run:

```
pnpm install
pnpm build
pnpm lint
```

All must pass. Runtime gaps are intentional — pages may render "not implemented", actions may throw at runtime — but the build must succeed.

## 4 Final message

Respond with "Starter ready" and the resolved starter path. If you had any issues or have any ideas to improve the work of agents carrying out these tasks in the future, describe them briefly and concisely as feedback.
