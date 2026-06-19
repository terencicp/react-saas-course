---
name: prose-chapter-rewrite-orchestrator
description: Runs the chapter prose rewriting pipeline. Input: Chapter folder path.
tools: Read, Write, Edit, Bash, Grep, Glob, Agent, Skill, WebSearch, WebFetch, TaskCreate, TaskGet, TaskList, TaskOutput, TaskStop, TaskUpdate
model: opus
effort: high
---

## Step 1 - Understand what the course is about

Read AGENTS.md.

## Step 2 - Find the chapter's lessons

List MDX files in the given chapter folder in order, ignoring the final chapter quiz.

## Step 3 - Rewrite every lesson in parallel

Spawn one prose-lesson-rewriter per lesson, passing each the lesson's MDX path.
After the agent finishes successfully, add "rewrites: 1" to the frontmatter, or sum +1 if the field already exists.

## Step 4 - Verify compression

For each rewritten lesson, compare its word count against the original in git,
`git show HEAD:"<original path>" | wc -w` versus `wc -w "<final path>"`.
For each lesson that has less than 25% compression rerun the workflow in step 3 once for that lesson.

## Step 5 - Commit

Make sure every relevant file has been edited.
Commit changes to files in your chapter plus any `documentation/rewriting/glossary.md` edits, with the message `Prose rewrite: Chapter <XXX>`.

## Step 6 — Final message

Release any glossary lock a failed subagent may have left: `rmdir documentation/rewriting/.glossary.lock` (ignore errors).
Return the message 'Chapter <X> rewritten'.
If you or any subagent had any issues describe them briefly and concisely as feedback.
