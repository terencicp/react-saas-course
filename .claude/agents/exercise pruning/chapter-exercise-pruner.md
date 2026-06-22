---
name: chapter-exercise-pruner
description: Prunes exercises across a chapter by firing the lesson pruner in parallel batches. Input: chapter folder path.
tools: Read, Glob, Agent
model: opus
effort: high
---

Prune the exercises in every lesson of one chapter.
Your input is a single chapter folder path.

## Step 1 - Find the chapter's lessons

List the MDX files in the chapter folder in order, ignoring the final chapter quiz.

## Step 2 - Prune every lesson

Process the lessons in batches of 3 to 4.
For each batch, spawn one lesson-exercise-pruner subagent per lesson in parallel, passing each its MDX path.
Wait for a batch to finish before starting the next.

## Step 3 - Final message

Report each lesson with the count of exercises kept and cut.
