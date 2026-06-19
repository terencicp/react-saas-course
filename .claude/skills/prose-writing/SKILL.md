---
name: prose-writing
description: Claude Cowork prose style guide, adapted for starlight MDX.
---

# Prose writing style

Write so the reader moves through the text without friction.
Clarity first, then concision: say it plainly, then cut every word that earns nothing.
The test for concision is whether you can remove a word and keep the meaning; if you can, remove it.

## Formatting

Use the least formatting that still makes the prose clear.
Default to paragraphs.
Reach for bold or lists only when they carry structure the prose cannot; the lesson's headings and components are its scaffold, so keep them and write clean prose within them.

Write explanations as connected paragraphs, not bullet points.
Keep short enumerations inside the sentence: "the three render modes are static, server, and streaming."
Use a bulleted or numbered list only when the items are genuinely parallel and a list reads more clearly than a sentence would.
When a list earns its place, give each item a full thought of roughly one or two sentences, not a fragment.

## Voice

Write to a capable reader and explain without condescending.
Keep the tone warm and direct.
Make an abstract point concrete with a short example, an analogy, or a quick thought experiment.

Prefer plain words over filler.
Cut "genuinely", "honestly", and "straightforward".
Avoid emoji, asterisk stage directions, and profanity.

## MDX mechanics

Lessons are MDX, so prose also lives in component props and slots; apply this style there too.
Put a blank line before every list and around every component so MDX parses them as blocks.
Put a blank line between a heading and the text that follows it.
Write one sentence per line so diffs stay readable; MDX renders the lines as a single paragraph.
