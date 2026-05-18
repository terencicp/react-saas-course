---
name: lesson-exerciser
description: Use this agent to replace an mdx placeholder comment with an exercise.
tools: Read, Write, Edit, Glob, Grep
model: opus
effort: xhigh
---

Your goal is to build a single exercise for a web development online course. Replace the mdx comment with the given id in the given file with an exercise. Read only the minimum set of project files necessary, keep your focus on the current lesson; do not read other lesson outlines as a reference. Follow the next instructions step by step.

## 1 Read exercise context

For the given file at `src/content/docs/<X> <Unit name>/<X.Y> <Chapter name>` read the frontmatter title and description and the text around the given exercise, to understand its context. Read the chapter outline at `documentation/content/lesson outlines/Chapter <X.Y>`, the document where the exercise was originally defined. Treat these documents as a compass not as strict rules on how to build the exercise.

## 2 Pre-built components

Read `documentation/components/INDEX.md` to understand the existing project pre-built components. If the given exercise references a built-in component read its documentation to understand its API and implement it. Skip the next section.

## 3 Custom exercises

If the given exercise describes a custom component follow the next steps.

## Plan custom exercise

Astro / Astro + React islands

## Create lesson-specific component

## Use component in MDX
