# `LessonEyebrow`

Small uppercase line rendered automatically above every lesson's H1 by Starlight's `PageTitle` override at `src/components/overrides/PageTitle.astro`. Shows the chapter id, chapter title, and lesson number in a single tracked-out gray line — orients the reader without taking weight off the H1.

## Authored via frontmatter

You do **not** import or instantiate `LessonEyebrow` in MDX. The override reads three fields from the lesson's frontmatter and passes them in for you.

| Frontmatter field | Type | Required | Purpose |
| --- | --- | --- | --- |
| `chapter-id` | `string` | no | Padded chapter id, e.g. `"091"`. Rendered as `Chapter 091`. |
| `chapter-title` | `string` | no | Chapter name, e.g. `` Unit tests for `-lib` ``. Backticks render as inline `<code>`. |
| `sidebar.order` | `number` | no | Lesson order within the chapter. Rendered as `Lesson N`. |

If all three are absent the eyebrow renders nothing — non-lesson routes (homepage, 404) stay clean.

## Example

```yaml
---
title: Type-level tests with `expectTypeOf`
description: Pin TypeScript contracts at compile time with `expectTypeOf` and `*.test-d.ts` files run by `vitest --typecheck`.
chapter-id: 091
chapter-title: Unit tests for `-lib`
sidebar:
  order: 4
  label: Type-level tests
---
```

Renders above the H1 as:

```
CHAPTER 091 · UNIT TESTS FOR `-LIB` · LESSON 4
Type-level tests with expectTypeOf
```

## Constraints & gotchas

- Driven by Starlight's `PageTitle` override registered in `astro.config.mjs`. Removing or renaming the override breaks the eyebrow on every page.
- `chapter-id` and `chapter-title` are typed by an `extend` on the docs schema in `src/content.config.ts`. Add other course-wide custom frontmatter fields there, not in individual MDX files.
- Each segment renders only if its frontmatter field is present, so partially-populated lessons degrade gracefully (e.g. `CHAPTER 091 · LESSON 4` when `chapter-title` is missing).
- Inline code inside `chapter-title` (backticks) is the only Markdown affordance supported in the eyebrow — other Markdown is rendered as literal text.
