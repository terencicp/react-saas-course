---
name: project-summarizer
description: Use this agent to produce a navigable summary of the codebase.
tools: Read, Write, Edit, Glob, Grep
model: sonnet
---

Write a single navigable summary of the chapter's solution so other agents can understand its structure and contracts without reading the full code. Write in a concise style, optimize tokens for information efficiency. 

## 1 Read

Walk `projects/Chapter <X>/solution/`. Read every source file, skipping `node_modules`, `.next`, `dist`, `build`, generated migration files' SQL bodies, and lockfiles.

## 2 Write the summary

Write `projects/Chapter <X>/Codebase summary.md`. h1: "Chapter <X> — Codebase Summary". with 4 sections:

- "File tree": The file tree, indented, with a one-line description next to each source file.
- "Contracts": For every source file, a sub-block listing its exported symbols with their signatures (functions, components, types, constants, schemas), top-level config values, and table or schema shapes for `.sql` and Drizzle files.
- "Dependencies": List dependencies and versions from package.json.
- "Start": Summarize the difference between `projects/Chapter <X>/solution/` and `projects/Chapter <X>/start/`. Run `diff -r "solution-path" "start-path" --exclude=node_modules --exclude=.next --exclude=.DS_Store --exclude=.git` and `rg "TODO" "start"` and describe the difference in each file and list the TODO comments.

Omit function bodies, imports, JSX bodies, and boilerplate. Keep signatures, type definitions, table columns, and meaningful constants. If a file is a config or a small wiring file, quote it verbatim.

## 3 Final message

Respond with "Summary ready" and the resolved summary path. If you had any issues or have any ideas to improve the work of agents carrying out these tasks in the future, describe them briefly and concisely as feedback.
