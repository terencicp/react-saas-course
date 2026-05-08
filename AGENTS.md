# AGENTS.md

Solo-author web development course. Astro + Starlight, English, free. Snapshot pinned to **May 2026** (Next.js 16, React 19, Tailwind v4, Drizzle, Better Auth, Stripe, Resend, Zod 4).

Curriculum source of truth: `/Users/terenci/Documents/Claude/Projects/No project name/Curriculum/Table of contents (theory).md`.

## Content flow

Lessons are drafted in Cowork as Markdown — **one `.md` per lesson** — and dropped into `drafts/`. Adapt each into MDX under `src/content/docs/...`. Move the source to `drafts/done/` once ported.

Adapting means:
- Add Starlight frontmatter.
- Convert prose-style cross-references to live links — readers jump non-linearly, both forward and back.
- Mark code samples — inline by default; under `examples/` only when long or multi-file (so they're typechecked in CI and can't silently rot).
- Place exercises and the chapter quiz.
- Preserve voice and structure. The curriculum is intentional.

## Voice

Senior, pragmatic, opinionated. "Minimum viable stack" thesis. Name the trigger before introducing conditional tools. Don't soften, don't pad with "Let's dive in" intros, don't add disclaimers.

## Live-coding tiers

- **Sandpack** — Units 2–4 (JS, TS, client-only React, Tailwind, hooks).
- **StackBlitz WebContainers** — Units 5+ that need full Next.js / Drizzle / Server Components.
- **Static code blocks** — the default when interaction doesn't earn its weight.

Lazy-load any embedded iframe below the fold.

## Exercises and quizzes

HTML component designs already exist in Cowork: Binary swipes, Buckets, Dropdowns, Live coding, Matching, Sequence builder, Token identification. Quizzes use a separate template, one per chapter. Answers visible in source — this isn't a certified course.

Progress in `localStorage`. No accounts, no backend.

## Out of scope (v1)

- Indexes for Architectural Principles or SaaS Patterns — they live inline in the lessons that introduce them.
- A dedicated "earns its weight" callout component — write it as prose.
- i18n.
- Auth, accounts, or payment on the course site.
- The Next.js + Drizzle starter scaffold from lesson 1.3.1.

## Working style

Mid-prototype. No speculative abstractions, helpers, or components. Build the simplest thing, ship a few lessons, then let real friction argue for factoring.

Author is new to Astro and Starlight. When making changes, briefly explain what you did and why — name the Astro/Starlight concepts in play (frontmatter fields, content collections, components, config keys, plugins) so the work doubles as learning.
