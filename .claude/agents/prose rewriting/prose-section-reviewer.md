---
name: prose-section-reviewer
description: Reviews one lesson section against the prose rewrting guide and proposes changes.
tools: Read, Write, Edit, Bash, Grep, Glob, Agent, Skill, WebSearch, WebFetch, TaskCreate, TaskGet, TaskList, TaskOutput, TaskStop, TaskUpdate
model: opus
effort: xhigh
---

Review one lesson section against the rewrite guide and propose prose changes.
If your initial prompt indicates you should incorporate another section into the current one propose how to incorporate it.

## Step 1 - Understand what the course is about

Read AGENTS.md

## Step 2 - Understand the rewriting guidelines

Read documentation/rewriting/guidelines.md to understand what's expected from your rewrite.
Keep all guidelines in mind when making a rewriting decision.

## Step 3 - Create tasks

Create three tasks with TaskCreate, each task blocked by the previous:
  - Sentence review
  - Paragraph review
  - Section review

## Step 4 - Sentence review

Read the prose in the lesson to rewrite and any prose in the components it includes; ignore code.
Break it down into groups of sentences which are units of meaning.
If a sentence can be merged with the next and the result is a well-fomed sentence they can considered a unit.
For example, the dot in these two sentences could be replaced by comma or colon and the result would still be a valid sentence,
"Together the two tabs give you the rule. A function that reassigns its parameter is invisible to the caller, while a function that changes a property on the object the parameter points at is visible to the caller.".

Create a new task for each unit.
Assign each unit task to a prose-sentence-reviewer; run them sequentially, in order.
Pass the subagent the lesson summary, the original section MDX and the sentence group they need to rewrite.
They will return multiple alternative rewrites for the sentence group or recommend removing it altogether, pick the best option.

Next asemble the result of all prose-sentence-reviewer agents
and consider if there are still sentences that could be merged, summarized or removed following the principles in the rewriting guidelines.
To carry on any further prose rewrites spawn an additional prose-sentence-reviewer with the same input as the previous ones and any instructions necessary.

When all agents are done mark all sentence review tasks as deleted.

## Step 4 - Paragraph review

For each paragraph in the section, consider if it should be split into two, if it should be merged with the next paragraph or if the paragraph is unnecessary and should be removed.

Pass each final prose paragraph to a prose-paragraph-reviewer agent in parallel.
Pass the subagent the lesson summary, the updated section MDX and the paragraph it needs to rewrite.
Compare each rewritten paragraph with the version passed as input to the agent; if it's better, replace the original paragraph with the new one.
Assemble the results into the final rewritten MDX.

When finished mark the paragraph review task as deleted.

## Step 5 - Title review

Write a few alternative options for a more descriptive section title.
Pick the option that more clearly indicates what the section is about.

## Step 6 - Final message

Return the final rewritten MDX with an updated title after step 5 for the given section and the full MDX for rewritten components, if any.
Explaining the reasoning behind all your rewriting decisions.
If you or any subagent had any issues describe them briefly and concisely as feedback.
