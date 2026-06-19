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

Spawn one prose-lesson-rewriter per lesson, passing each the lesson's MDX path.

## Step 4 - Verify compression

For each rewritten lesson, compare its word count against the original in git,
`git show HEAD:"<original path>" | wc -w` versus `wc -w "<final path>"`.
For each lesson that has less than 25% compression rerun the workflow in step 3 once for that lesson;
let the agent know this is a 2nd pass, pass it the lesson summary it returned so it doesn't have to rewrite it.

## Step 5 - Chapter title rewrite

The chapter title doubles as a table of contents so it should be plain and descriptive of the chapter content.
Draft a few options less than ~36 characters, pick the most descriptive. No teasers, slogans, metaphors, personification, or hype.
Rename the chapter folder name using the new title.

## Step 6 - Update project files

Update the relevant section of 'documentation/Table of contents.md' to be coherent with the updated chapter title and content.

## Step 7 - Commit

Make sure every relevant file has been edited.
Commit changes to files in your chapter plus any `documentation/rewriting/glossary.md` edits, with the message `Prose rewrite: Chapter <XXX>`.

## Step 8 — Final message

Return the message 'Chapter <X> rewritten'.
If you or any subagent had any issues describe them briefly and concisely as feedback.
