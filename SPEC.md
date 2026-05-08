# Project spec

A web development course site. Solo author, free, English-only.

## Stack

- Astro + Starlight, MDX for lessons.
- Pagefind (Starlight default) for search.
- Local development for now; Cloudflare Pages as the likely host.

## Content snapshot

Pinned to **May 2026**. Next.js 16, React 19, Tailwind v4, Drizzle, Better Auth, Stripe, Resend, Zod 4. Things in flight (e.g. Temporal landing in Node 26) are called out explicitly with dates.

## Course shape

23 units, ~5 chapters per unit, ~6 lessons per chapter. Each Cowork `.md` draft maps 1:1 to a course lesson. Quizzes are per-chapter, not per-lesson.

## Live coding

Three-tier strategy chosen per lesson:

| Tier | Tool | Used for |
|---|---|---|
| 1 | Sandpack | Units 2–4 (JS, TS, client React, Tailwind, hooks) |
| 2 | StackBlitz WebContainers | Units 5+ needing Next.js / DB / Server Components |
| 3 | Static code blocks | Default when interaction doesn't earn its weight |

## Interactivity

Inline exercise types (Binary swipes, Buckets, Dropdowns, Live coding, Matching, Sequence builder, Token identification) and per-chapter quizzes — designs come from Cowork. Progress in `localStorage`.

## Navigation

Sidebar shows the full course tree, default-collapsed except the current unit. Cross-references between lessons render as live links — readers will jump non-linearly and that's expected.

## Out of scope (v1)

i18n, auth, payment, the Next.js starter scaffold from lesson 1.3.1, browseable indexes for the Architectural Principles or SaaS Patterns.
