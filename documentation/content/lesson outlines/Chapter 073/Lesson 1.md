# Chapter 073 — Lesson 1 outline

## Lesson title

- **Page title:** Project overview (chapter-outline title fits; the topic banner is the chapter title).
- **Sidebar title:** Project overview

## Lesson type

`Project overview` — first lesson. No feature is built; no test suite runs. The student leaves with the chapter 062 invoices list booting locally and the inspector reachable. This drives downstream branching: no test-coder for this lesson; the writer renders the Project-overview section list.

## Lesson framing

The student walks away with a running starter and a map of the senior call this project installs: caching on the authenticated SaaS surface is opt-in, and only the reads that are hit often and tolerate brief staleness — the list, the per-org summary, the detail — earn `use cache`. They see the finished shape (three cached reads, one `tags.ts`, `updateTag` from actions for read-your-writes, `revalidateTag` from a job for the eventual path) without writing any of it yet, and they confirm the dynamic baseline: `fetchedAt` advancing on every refresh because nothing is cached. The payoff framed here is the decision lens, not the mechanics — who is waiting on a write decides which invalidation primitive fires, and tag strings live in exactly one place.

## Codebase state

First lesson — no Entry/Exit detail required. State at exit: the unmodified chapter-062 starter runs under `pnpm dev`. `/invoices` renders the list dynamically; the `<FetchedAtStrip />` shows timestamps that advance on every refresh (reads not yet cached). `/inspector` loads; "Edit one invoice" commits at the store but fires no `updateTag`; "Run summary task" throws `summary job not implemented`. The five TODO files (`tags.ts`, `profiles.ts`, `queries.ts`, `actions.ts`, `summary-recompute.ts`) carry their stubs untouched.

## Lesson sections

Follow the Project-overview section list in order. No inline exercises, no quiz.

### What we're building (intro, no header)

One paragraph: the starter is the chapter 062 invoices list (URL state, scoped queries, version-precondition actions, audit log) running dynamically on a deterministic in-memory store — no Postgres, no Docker, no env file. This project layers a tag-driven cache on top: `use cache` on three reads, a three-helper `tags.ts`, `updateTag` fan-out from four lifecycle actions, `revalidateTag` from an in-process summary-recompute job. Name the on-page verification surface up front: the `<FetchedAtStrip />` at the top of `/invoices` and the `/inspector` page are how the student reads cache state, because Next.js does not surface hit/miss to user code.

Close the paragraph with the finished-app figure. Use `Screenshot` (desktop) inside a `Figure`, or a `TabbedContent` of two `Screenshot`s — `/invoices` with the `fetchedAt` strip, and `/inspector` with its panels. Caption notes these are the finished state the roadmap reaches, not the starter.

### What we'll practice (h2, "What we'll practice")

Bulleted list, lifted from the chapter-outline lesson-1 skills, phrased as developing skills:
- Choosing what earns `use cache` on an authenticated SaaS surface and what stays dynamic.
- Centralizing tag strings in one `tags.ts` that read sites and write sites share.
- Keeping a cached read pure — tags depend only on its arguments, never on ambient session.
- Reading cache hit/miss off a `fetchedAt` proxy because the framework does not surface it.
- Picking `updateTag` (read-your-writes, from Server Actions) vs `revalidateTag` (eventual, from background work) by asking who is waiting.
- Fanning one mutation out to every cached read it affects, after commit and before redirect.

### Architecture (h2)

Shape only, read-to-write. Best carried as an `ArrowDiagram` inside a `Figure` (boxes are custom HTML, arrows label the flow); a labeled list is an acceptable fallback if the diagram gets cramped. Boxes/edges:
- `/invoices` Server Component reads the session, then calls the cached reads with `orgId` passed in as an argument — `listInvoices(args)`, `getOrgInvoiceSummary(orgId)`, `getInvoiceDetail({ orgId, id })` on the detail route.
- Each cached read: `'use cache'` → `cacheLife` profile → tags emitted through `tags.ts` → returns a `fetchedAt` timestamp frozen into the entry.
- Four lifecycle Server Actions (`updateInvoice`, `archiveInvoice`, `restoreInvoice`, `softDeleteInvoice`): commit the in-store write → fan `updateTag` to list + record + summary tags → redirect (same user lands on a fresh read).
- In-process `recomputeOrgSummary` job: recomputes the `summaries` row → `revalidateTag` for the summary tag (no user waiting → next visit picks up the new aggregate).
- `/inspector` Server Component drives every cache-state observation (`fetchedAt` strip, hit/miss probe, one-click edit/lifecycle buttons, run-summary-task, misuse toggle, force-`updateTag` island, invalidation-log tail).
Keep the diagram height-capped and horizontal. No deep dives — rationale belongs to lessons 2-4 and to chapter 072.

### Starting file tree (h2)

`FileTree` of the annotated layout. Comment one line only on files the lessons touch or that changed from chapter 062; leave the rest uncommented. Highlight the five TODO focus files as the build targets:
- `src/lib/cache/tags.ts` — TODO(L2): three tag helpers, empty-string stubs.
- `src/lib/cache/profiles.ts` — TODO(L2): empty `cacheProfiles` map.
- `src/lib/invoices/queries.ts` — TODO(L2): three reads, no `use cache` yet.
- `src/lib/invoices/actions.ts` — TODO(L3): four actions, only `revalidatePath`, no `updateTag`.
- `src/server/jobs/summary-recompute.ts` — TODO(L4): body throws `summary job not implemented`.
Note in one sentence that everything else is provided: the in-memory `store.ts` (with the `summaries` Map seeded empty, `invalidationLog`, `misuseFlag`), `next.config.ts` with `cacheComponents: true` already set, the seed, `logCacheInvalidation`, `<FetchedAtStrip />`, and the entire `/inspector` surface. Source the tree from the chapter-outline "Starter file tree"; collapse provided subtrees the lessons never touch to keep it scannable.

### Roadmap (h2)

`CardGrid` of three `Card`s, one per implementation lesson, each one sentence:
- **Lesson 2 — Cache the reads.** Write `tags.ts` and `profiles.ts`, annotate the three reads with `use cache` + `cacheLife` + `cacheTag`, emit `fetchedAt` so the strip holds steady across refreshes.
- **Lesson 3 — Read-your-writes invalidation.** Fan three `updateTag` calls out of the four lifecycle actions after commit so an edit refreshes the list and summary on the same render; wire the misuse-`revalidateTag` failure-mode demo.
- **Lesson 4 — Eventual invalidation.** Implement `recomputeOrgSummary` to recompute the aggregate and call `revalidateTag`, landing the new summary on the next visit (stale-while-revalidate).

### Setup (h2)

`Steps` component, exact commands in order. First step is the project-repo line per the contract:
1. Get the starter codebase from the [project repository](https://github.com/terencicp/react-saas-course-projects), under `Chapter 073/start/`.
2. `cd start`
3. `pnpm install`
4. `pnpm dev`

Env vars: none — state this explicitly. The project boots against the in-memory store; dev identity comes from the `acting-identity` cookie (default `org-acme:admin`), switched on the inspector.

Expected result (one sentence + short prose): `pnpm dev` serves `/invoices` rendering the chapter 062 list dynamically, with the `<FetchedAtStrip />` showing timestamps that advance on every refresh (reads not yet cached). `/inspector` loads; "Edit one invoice" commits at the store (audit log writes) but fires no `updateTag`; "Run summary task" throws because the job body is unimplemented. Use an `Aside` (tip) to frame the advancing timestamps as the dynamic baseline the project will replace — confirming the starter is genuinely uncached. Commands rendered with `Code`.

## Scope

- No caching code is written here — `use cache`, `tags.ts`, and `profiles.ts` are built in **lesson 2**.
- No invalidation is wired — `updateTag` fan-out is **lesson 3**, `revalidateTag` from the job is **lesson 4**.
- Technology rationale (why `cacheComponents`, why these `cacheLife` profiles, the four-call decision tree) is not re-explained here; it is owned by **chapter 032** (`use cache`, `cacheLife`, `cacheTag`, `updateTag`/`revalidateTag`) and **chapter 072** (tag shapes, `tags.ts` convention, `fetchedAt` discipline, the decision tree). Link, do not re-teach.
- The in-memory store, the seed, and the inspector internals are provided, not authored — no need to explain their construction.
- The distributed/cross-process cache backend on Vercel is **chapter 074**; not in scope.
