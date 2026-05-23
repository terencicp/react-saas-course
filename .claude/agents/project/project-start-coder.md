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

Read `Project goals`, `Student position` and `Starter derivation` section of the plan at `documentation/content/project plans/Chapter <X>.md` in full, plus the `File tree` section for context on what the starter must contain.

## 2 Derive the starter

Apply the `Starter derivation` instructions step by step (copy files using `rsync` if necessary).

# 3 README

Write a minimal `README.md` at the starter root. Read `documentation/content/overview/Project dependencies.md` to know the project's dependencies. Example:

"""
This is the starting code repo for the chapter <X> project of the React SaaS course.

This repo builds on the previous projects: <chapter ids>.
"""

## 4 Review

List the starter dir's files with `find . \( -name node_modules -o -name .next -o -name dist -o -name build -o -name .git \) -prune -o -print` to confirm the derivation landed: every file the `Starter derivation` named is present, nothing the plan said to delete is still there. Then read back every file you overwrote or stubbed and check the body matches the plan — no solution code leaked into stubs, no half-applied edits, no missing imports. Fix any gaps.

## 5 Verify

From inside `projects/Chapter <X>/start/`, run `pnpm install && pnpm verify`. Must pass. Runtime gaps are intentional — pages may render "not implemented", actions may throw at runtime — but the build must succeed.

## 6 Final message

Respond with "Starter ready" and the resolved starter path. If you had any issues or have any ideas to improve the work of agents carrying out these tasks in the future, describe them briefly and concisely as feedback.
