# Chapter 035 — Lesson 1 outline

## Lesson title

- Page title: **Project overview**
- Sidebar: **Overview**

(Keep the chapter-outline title; it is the contract-mandated title for the first project lesson.)

## Lesson type

`Project overview` — no feature built, no tests run. The student leaves with the `degit` starter cloned, deps installed, and `pnpm dev` serving the placeholder `/invoices` shell on `localhost:3000`. (Test-coder does not run for this lesson.)

## Lesson framing

The student installs the senior default for any "list with a selectable detail and a form that could also be a page": the **URL is the source of truth for view state**, so the surface gets shareability, refreshability, and `Cmd+click` for free instead of trapping view state in `useState`. They leave with a running starter and a map of the three implementation lessons that turn its placeholder slots into the canonical SaaS list-plus-detail surface — and with the one-line trade that justifies the whole shape: a `state.open` modal loses URL persistence, shareability, refreshability, and `Cmd+click`; the intercepting-route shape buys all four with no extra code.

## Codebase state

First lesson — no Entry/Exit pair. Entry is "nothing"; exit is the cloned starter running locally with placeholder slots.

## Lesson sections

Follow the **Project overview** contract section order exactly: *What we're building* (no header) / *What we'll practice* / *Architecture* / *Starting file tree* / *Roadmap* / *Setup*. No tests, no exercises, no quiz.

### What we're building (intro, no header)

One paragraph naming the surface in user terms: invoices list on the left, the selected invoice's detail on the right, a "new invoice" form that opens as a modal with a real URL. Land the senior framing in one line (the `state.open`-vs-intercepting-route trade above) — state the decision, do not yet explain the routing mechanics (that is lesson 3's job; link forward, do not pre-teach).

Close with the figure showing the finished UX in three states:
- list with `?status=paid` applied,
- list-plus-detail at `/invoices/inv_017`,
- the modal open at `/invoices/new`.

Component: wrap the three screenshots in `Screenshot` (desktop variant) inside a `TabbedContent` (one tab per state) so they share one frame. These are real placeholder screenshots to be captured from the solution; brief the asset, do not hand-author.

### What we'll practice

Bulleted list, skills-not-features framing (lead with the senior capability, name the App Router primitive at the call site). Lift the four from the chapter outline verbatim in substance:
- Read view state from the URL server-side instead of holding it in client state.
- Wire parallel slots with `default.tsx` so each independently-streamed region has a fallback.
- Pair an intercepting route with its non-intercepting twin so soft nav, refresh, and `Cmd+click` each behave correctly.
- Keep data fetching in Server Components and render components pure.

Frame as "what you'll practice", not "what you'll learn" — these primitives were taught in chapters 029–033; this project is the first application. One short lead sentence saying exactly that.

### Architecture

Shape only — no implementation. Show how one URL resolves into the two-slot shell. Brief an `ArrowDiagram` inside a `Figure`: boxes for `invoices/layout.tsx` (the two-slot shell receiving `{children, list, detail}`), `@list` (reads `?status=`, renders filtered list), `@detail/[id]` (loads one invoice) / `@detail/default` (empty state), `(.)new` (intercepts soft nav into a Dialog) and its twin `new/` (full page). Arrows map URL → slots: `/invoices?status=paid` lights `@list`; `/invoices/inv_017` lights `@list` + `@detail/[id]`; soft nav to `/invoices/new` lights `(.)new` over the list. Keep horizontal, cap height. Caption names the one invariant: each slot has its own loading/error/not-found boundary and its own `default.tsx`.

A diagram is justified here — prose cannot carry the URL→slot mapping cleanly, and the slot topology is the spine of the whole chapter. If `ArrowDiagram` proves too dense, fall back to a labeled list (layout shell → three slots → twin), but prefer the diagram.

Do **not** explain interception mechanics, `(.)` prefix semantics, or streaming here — name them, defer the "why/how" to lessons 3 and 4.

### Starting file tree

Render the starter tree (from the chapter framing's "Starter file tree" block) with `FileTree`. Annotation rules per the contract:
- Comment one line each only on provided files that lessons will touch or that changed from the previous project; leave the rest uncommented.
- Mark the `TODO(L<n>)` stubs as the highlighted focus: `@list/page.tsx`, `@list/default.tsx`, `@list/loading.tsx`, `@detail/default.tsx`, `@detail/[id]/page.tsx`, `@detail/[id]/loading.tsx`, `new/page.tsx`, `(.)new/page.tsx`, `components/new-invoice-dialog.tsx`, `components/skeletons.tsx`.
- One sentence per commented provided file on what it is and why it earns a seat; deep per-file explanation lands in the lesson that first opens it (link forward, do not pre-explain).

Then one short paragraph naming the senior call behind the starter itself: chapter 028 taught the from-scratch toolchain (pnpm, `AGENTS.md`, `tsconfig`, Biome, `next-themes` `<Providers>`); every project chapter after carries those forward via a `degit`'d snapshot rather than rebuilding them. Note this is the first project in the course that starts from a starter rather than from scratch. Add the one-line note that there is no build-time env validation here — the in-memory fixture needs no env, so `@t3-oss/env-nextjs` waits for Unit 5.

### Roadmap

`CardGrid` with one `Card` per implementation lesson, each titled with lesson number + title and one sentence on what it adds:
- **Lesson 2 — Server-rendered list and detail.** Fills the `@list` and `@detail` slots so the filtered list and selected-invoice detail render server-side from the URL.
- **Lesson 3 — Modal with a real URL.** Adds the intercepting modal and its full-page twin so soft nav, refresh, and `Cmd+click` each behave correctly.
- **Lesson 4 — Independent streaming per slot.** Adds per-slot skeletons so the list and detail stream independently under a throttled network.

### Setup

`Steps` block, exact commands in order, expected outcome on success. First step is the contract-mandated repo line, then the chapter outline's sequence:

1. Get the starter from the [project repository](https://github.com/terencicp/react-saas-course-projects) under `Chapter 035/start/`: `pnpm dlx degit <starter-repo>/Chapter-035/start list-plus-detail` — fetches the starter folder without git history. One inline note: `pnpm dlx` runs a package without installing it (the pnpm equivalent of `npx`). One line on the monorepo layout: one folder per chapter project, each with `start/` and `solution/` siblings.
2. `pnpm install` — installs pinned deps (pnpm 11, Node ≥ 24); install runs and symlinks appear.
3. `pnpm dev` — starts the Next.js 16 dev server on `localhost:3000` with Turbopack (the Next.js 16 default; named only so the student recognizes the bundler in dev banners/errors). Root path redirects to `/invoices`, whose two-slot shell renders with placeholder slots because `@list/page.tsx`, `@detail/[id]/page.tsx`, and friends are still `TODO(L<n>)` stubs.
4. `pnpm verify` — Biome CI + `next typegen` + `tsc --noEmit` + production build; the gate CI runs on every PR and the first proof the project is shippable. Note `pnpm build` alone runs only the build step.

Commands shown with `Code`. No env-var list (in-memory fixture; `DATABASE_URL` and friends land in Unit 5 — state this in one line so the absence is intentional, not an omission).

Expected result line: `pnpm dev` serves the placeholder `/invoices` shell and `pnpm verify` completes cleanly — the starter is the new project's floor, ready to commit as the first milestone. The lesson ends here; technology rationale belongs in the regular chapters (029–033), not here.

## Scope

This lesson does not build any feature, run any test, or explain any App Router mechanic in depth — it only gets the starter running and orients the student.

- Server-side filtering, `default.tsx` slot fallbacks, `notFound()` → Lesson 2.
- Intercepting modal, the `(.)` prefix, the non-intercepting twin, close-as-navigation → Lesson 3.
- Per-slot `loading.tsx`, skeletons, independent streaming → Lesson 4.
- Why these primitives exist (parallel/intercepting routes, server-side `searchParams`, Suspense streaming) → teaching chapters 029–033; reference, never re-teach.
- Build-time env validation, Drizzle/Postgres data layer → Unit 5; Server Actions on the form → Unit 6; `nuqs`/pagination/sort/soft-delete on this surface → Unit 10. Forward-reference in one line each, do not pull in.
