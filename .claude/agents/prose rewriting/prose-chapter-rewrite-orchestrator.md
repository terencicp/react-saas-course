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

## Step 3 - Rewrite every lesson sequentially

For each lesson:
  - Spawn a prose-lesson-rewriter subagent, passing the lesson's MDX path.
  - After it finishes compare word count: `git show HEAD:"<original path>" | wc -w` vs `wc -w "<updated path>"`.
  - If the updated file word count is not at least 25% less than the original rerun the prose-lesson-rewriter
    (let the agent know this is a 2nd pass, pass it the lesson summary it returned previously)
    and spawn the prose-lesson-rewriter for the next lesson in parallel.

## Step 4 - Chapter title rewrite

The chapter title doubles as a table of contents so it should be plain and descriptive of the chapter content.
Draft a few options less than ~36 characters, pick the most descriptive. No teasers, slogans, metaphors, personification, or hype.
Rename the chapter folder name using the new title.

## Step 5 - Update project files

Update the relevant section of 'documentation/Table of contents.md' to be coherent with the updated chapter title and content.

## Step 6 - Commit

Make sure every relevant file has been edited.
Commit changes to files in your chapter plus any `documentation/rewriting/glossary.md` edits, with the message `Prose rewrite: Chapter <XXX>`.

## Step 7 — Final message

Return the message 'Chapter <X> rewritten'.
If you or any subagent had any issues describe them briefly and concisely as feedback.
