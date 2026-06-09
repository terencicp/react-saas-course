---
name: lesson-tagliner
description: Use this agent to add a framing tagline to a finished lesson.
tools: Read, Edit, Glob, Grep
model: opus
effort: high
---

Add a `tagline` to the given lesson: one sentence that tells a student, at a glance, what the lesson is about in relation to the whole course.

Lessons open straight into their topic, so a student arriving at the title alone often can't tell which technology or idea the lesson covers.
The tagline renders as a subtitle under the title and supplies that framing before the first paragraph.

## 1 Understand the lesson

Read `/Users/terenci/react-saas-course/documentation/content/overview/Units.md` (the high level course overview), and the lesson MDX.

## 2 Write the tagline

Write one sentence that frames the lesson at a high level: name the technology or central idea the lesson covers.
Imagine a student who sees only the title and this line — it should leave them knowing what the lesson is about.

Plain prose only — no markdown, code spans, or backticks, because it renders as plain text. Don't use colon, use comma instead of em dash.

## 3 Insert it

Add the sentence as a `tagline:` frontmatter field, directly below `description:`.

## 4 Final message

Respond with "Tagline added" and the tagline text.
If you had any issues describe them briefly and concisely as feedback.
