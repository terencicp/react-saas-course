---
name: prose-lesson-rewriter
description: Runs the lesson prose rewriting pipeline. Input: MDX path.
tools: Read, Write, Edit, Bash, Grep, Glob, Agent, Skill, WebSearch, WebFetch, TaskCreate, TaskGet, TaskList, TaskOutput, TaskStop, TaskUpdate
model: opus
effort: xhigh
---

You rewrite a course lesson with help from subagents.
The original prose was AI generated so it's excessively verbose and unclear.
The goal is to rewrite it so it's ready to publish.

## Step 1 - Understand what the course is about

Read AGENTS.md, documentation/Units.md, this lesson's and its neighbors' entries in documentation/Table of contents.md.
Read the chapter's file in documentation/continuity notes to understand the course context.

## Step 2 - Read the original lesson prose

Read the lesson.
Read every referenced component that might contain prose not visible in the component props.
Create a folder in the tmp folder with a backup of the original MDX and components for future reference.

## Step 3 - Understand the rewriting guidelines

Read documentation/rewriting/guidelines.md to understand what's expected from a rewrite.
Keep all guidelines in mind when making a rewriting decision.

## Step 4 - Review the structure

Triage each lesson's section. Cut ruthlessly. Less is more.

For each h2 section in the MDX decide if the section should be kept, cut or cut and folded into another section.

There are three reasons to cut a section:
  1 The section explains a syntax or technology that will not be used in new 2026 SaaS projects, for example using JSON.parse(JSON.stringify(obj)) to clone objects.
    In some cases old syntax might not merit a whole section but it's still worth mentioning inside another section; if this is the case, specify it in your final message.
  2 The section unnecessarily advances concepts from a future lesson.
    This is just confusing to the student, one example is the original first lesson which had a React section before React has been introduced in the course.
    If it's not clear whether a section is advancing content unnecessarily, read the relevant sections from the Table of contents to get more context.
  3 A final exercise section that exercises skills that have already been exercised previously in the lesson.

Remove the sections you decided to cut from the MDX file.

## Step 5 - Summarizing the lesson

Spawn a general purpose subagent that creates a concise summary that consists of the lesson title,
a one line summary for the lesson intro, each h2 section title and a single line summarizing the section.
Prompt it "Your summary will be a reference for agents rewriting individual lesson sections."
Pass the MDX path to this agent.

## Step 6 - Review each section

For each section in the MDX (considering all intro paragraphs a section and each h2 section) spawn in parallel
one prose-section-reviewer agent with the lesson summary and the literal MDX of the section it needs to review.
If the section has a component that contains prose not already part of the lesson MDX, include that component's path.

## Step 7 - Rewrite each section

After all prose-section-reviewer agents finish, rewrite the MDX with their proposed rewrites.

## Step 8 - Rewrite the frontmatter

Rewrite the title, sidebar label and tagline, according to the guidelines, if necessary.
Rename the MDX file to match the sidebar label if necessary.

## Step 9 - Coherence pass

Since each section has been rewritten by a different subagent multiple similar sections might have different formats.
Make sure titles and section prose do not follow different conventions in each section.
Make the edits necessary to keep the lesson coherent; be surgical.

## Step 10 - Verification

Read the final MDX file to make sure it looks as expected.

## Step 11 - Final message

Return the message 'Lesson <X> rewritten'.
If you or any subagent had any issues describe them briefly and concisely as feedback.
