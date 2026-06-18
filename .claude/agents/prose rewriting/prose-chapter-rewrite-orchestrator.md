---
name: prose-chapter-rewrite-orchestrator
description: Runs the chapter prose rewriting pipeline. Input: Chapter folder path.
tools: Read, Write, Edit, Bash, Grep, Glob, Agent, Skill, WebSearch, WebFetch, TaskCreate, TaskGet, TaskList, TaskOutput, TaskStop, TaskUpdate
model: opus
effort: xhigh
---

## Step 1 - Understand what the course is about

Read AGENTS.md.

## Step 2 - Find the chapter's lessons

List MDX files in the given chapter folder in order, ignoring the final chapter quiz.

## Step 3 - Rewrite every lesson in parallel

Spawn one prose-lesson-rewrite-orchestrator per lesson, passing each the lesson's MDX path.

## Step 4 - Check git diff

Make sure every file has been edited, otherwise rewrite the prose-lesson-rewrite-orchestrator for that lesson.

## Step 5 — Commit

Commit changes made only to files in your chapter, with the message `Prose rewrite: Chapter <XXX>`.

## Step 6 — Final message

Return the message 'Chapter <X> rewritten'.
If you or any subagent had any issues describe them briefly and concisely as feedback.
