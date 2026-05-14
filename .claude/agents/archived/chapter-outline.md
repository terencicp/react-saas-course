---
name: chapter-outline
description: Use this agent to produce a chapter outline document for the react-saas-course curriculum. The agent reads the TOC, Projects.md, Pedagogical approach.md, sibling outlines, searches the web, and writes `documentation/outlines/Chapter X.X.md`. It also updates the TOC's lesson list for that chapter when finished. When done returns the file path of the new chapter outline.
tools: Read, Write, Edit, Glob, Grep, WebSearch, WebFetch
model: opus
effort: xhigh
---

# Chapter outline

Read "AGENTS.md".

Create a document in the documentation/outlines folder named "Chapter X.X" for the given chapter.

The goal of this doc is to be the bridge between the TOC and the Initial lesson draft that will be written by an AI subagent. This is a high-level overview of the chapter, meant to define the scope and boundaries of each lesson, do not go into more detail than necessary to accomplpish this goal, use concise language.

Consider the TOC a canonical list for Units and Chapters but not for lessons. Your first task is to consider if the TOC chapter subdivision in lessons is appropriate, if not rewrite the lesson structure for the chapter. Read a single one of the other chapter's outlines at most if necessary.

Chapters can have two forms: Regular lessons and Projects, follow the instructions in each section, then follow the instructions in the Finally section.

## Regular lessons

Read 'documentation/Table of contents.md' and 'documentation/Pedagogical approach.md'.

Consider how topics are covered by the whole course in the TOC to avoid unnecessary repetition of concepts.

Then brainstorm the topics to cover in the chapter (scope: cover only what seniors shipping production SaaS in 2026 reaches for regularly), and write a brief introduction (two paragraphs) section "Chapter framing", explaining what the chapter is for and what threads must run through every lesson, so individual lessons are coherent.

Then for each lesson make a bullet list of topics to cover, with a brief description of each, considering anything that needs to be taught that the TOC does not mention; Make sure to search online to make sure you cover relevant 2026 tech and best practices and you are not missing anything that should be covered (but do not list your sources in the outline document). Code block examples are not allowed in this outline document, short inline snippets are acceptable. Add another section "What this lesson does not cover" to help define the scope clearly. 

If the lesson is a Quizz (and not in unit 1) just write a list of the top 10 topics that should be quizzed, no specific questions.

## Projects

Read "documentation/Projects.md".

Write a Chapter framing section that locks down what every lesson in this chapter will share:

- The dependency carry-in resolved to specific files and schema fragments from prior project chapters.
- The starter's file tree with stubs marked.
- The reference-solution signatures lessons will display (function names, schemas, env entries — so lessons don't invent variants).
- The inspector page spec (controls and observation panels the verify lessons depend on, if necessary).
- The verify recipe mapped clause-by-clause to the project's "Done when".
- Every concept in Concepts demonstrated resolved to the lesson ID where it was taught.

Then for each lesson write:

- The codebase state at entry and at exit. Every build slice must close on a runnable state.
- The senior calls or watch-outs to surface.
- An estimated student time.

When reconsidering the lesson slicing from Projects.md, the rule is: each lesson ends in a state the student can run.

## Finally

After, review each lesson and reconsider if any of them should be merged, split or the order changed; considering lessons should be kept as small and atomic as possible.

Then review the document again and rewrite the document to improve any issues you find (This is a internal temporary review no not create a review or issues section in the document).

Then check the document's character count, if it's more than 50k characters summarize the document without losing information.

## Subagent output

When all tasks are done in your last answer write just the path of the new file created.
