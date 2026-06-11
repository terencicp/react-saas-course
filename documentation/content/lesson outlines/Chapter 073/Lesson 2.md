# Chapter 073 — Lesson 2 outline

## Lesson title

**Full:** Cache the reads
**Sidebar:** Cache the reads

The chapter-outline title fits. The lesson's payoff is the cached-read surface, not the tag helpers; "Cache the reads" leads with the user-facing effect.

## Lesson type

`Implementation`

(Test-coder runs; writer renders the Implementation section list: Goal + Finished result / Your mission / Coding time / Moment of truth.)

## Lesson framing

The student installs the senior call at the heart of caching on an authenticated SaaS surface: *which* reads earn `use cache` and which stay dynamic. They turn the three high-traffic, staleness-tolerant reads — the paginated list, the per-org summary, the single-invoice detail — into cached functions by wrapping the existing chapter 062 query logic with `'use cache'` + `cacheLife` + `cacheTag`, route every tag string through a single `tags.ts` module, and thread a `fetchedAt` timestamp through each return so the provided `<FetchedAtStrip />` becomes a hit/miss probe. They walk away knowing that caching is opt-in (the toolbar and Client Components stay dynamic by design), that a cached read's tags must depend only on its arguments (never ambient session), and how to read cache state off a `fetchedAt` proxy because Next.js exposes none to user code.

## Codebase state

**Entry.** The chapter 062 invoices list runs end-to-end on the in-memory `store.ts`: URL state (nuqs), `scopedInvoices(orgId)` query helper, version-precondition Server Actions, audit log, conflict banner, the `<FetchedAtStrip />` and the full `/inspector` surface — all provided. Five TODO files carry markers; two of this lesson's are still stubs: `src/lib/cache/tags.ts` (`invoiceTags.list/record/summary` all return `''`), `src/lib/cache/profiles.ts` (`cacheProfiles` is `{}`). `src/lib/invoices/queries.ts` holds the three async query functions with no cache directives. Everything renders dynamically — `fetchedAt` timestamps on the strip advance on every refresh. The inspector's `cacheLife` readout shows dash placeholders.

**Exit.** `tags.ts` returns the three real scoped tag strings; `profiles.ts` maps `listInvoices`/`getInvoiceDetail` → `'minutes'`, `getOrgInvoiceSummary` → `'hours'`. All three queries in `queries.ts` open with `'use cache'`, set their `cacheLife` profile, emit their `cacheTag(...)` calls through `invoiceTags`, and return a frozen `fetchedAt`. The list and summary `fetchedAt` hold stable across prompt reloads; the detail page's `fetchedAt` holds stable; changing a URL filter mints a new cache entry (new `fetchedAt`) that then holds. The inspector's `cacheLife` readout shows the three real profiles. `actions.ts` still only calls `revalidatePath` (no invalidation wired — that is lesson 3), so a write leaves the cache stale until `cacheLife` expires.

## Lesson sections

Implementation type. Sections in contract order.

### Goal + Finished result (intro, no header)

One-sentence goal in user terms: instrument the three reads so the list, the per-org summary, and the detail page serve from cache. Then a one-paragraph description of the finished state: opening `/invoices` shows a `listFetchedAt` and `summaryFetchedAt` that hold steady on a prompt reload, and a detail page shows a `fetchedAt` that holds steady — the framework is serving cached values. Optionally a `Screenshot` of the `<FetchedAtStrip />` at the top of `/invoices`; a description sentence is sufficient if no asset.

### Your mission

Prose paragraph(s), then the requirements checklist (the only list). No headers, no implementation hints.

**Feature (user terms):** the paginated list, the per-org totals summary, and the single-invoice detail serve from cache instead of recomputing on every request.

Weave into prose:
- The senior call this lesson installs — *which* reads earn `use cache`: the list, summary, and detail are read often and tolerate brief staleness, so they take the directive; the toolbar and any Client Component stay dynamic because they read request-scoped URL state, and adding `use cache` there is the trap.
- The directives wrap the existing chapter 062 query logic — they do not replace it.
- `fetchedAt` is the cache-state proxy: the backend exposes no hit/miss to user code, so each cached function returns a timestamp computed once when it runs and frozen into the entry. Stable across requests = hit; advancing = miss. The rest of the project leans on this.
- Two constraints (frame as **Constraints**): every tag string lives only in `tags.ts` (lowercase, colon-delimited, scope first) so read and write sites import the same function; a cached function's tags depend only on its arguments — `orgId` is passed in by the page, never read from session inside the body, or the cache key silently leaks request state.
- The detail read is the one read carrying two tags (record + org) so either a single-invoice write or an org-wide change invalidates it.
- **Out of scope** (one line): any `updateTag`/`revalidateTag` wiring (lessons 3 and 4), per-user `'use cache: private'`, edge/CDN tuning.

**Functional requirements** (numbered, each tagged). Render with `Checklist`/`ChecklistItem` carrying the tested/untested chip.

1. The three tag helpers in `tags.ts` each return their documented scoped string and are the only place tag strings exist — a grep for raw `org:` / `invoice:` outside `tags.ts` and the cached reads returns zero hits. `[tested]`
2. Opening `/invoices` shows a `listFetchedAt` that stays identical across a prompt reload within the `minutes` window (cache hit). `[tested]`
3. The per-org summary shows a `summaryFetchedAt` that stays identical across reloads, and reads correctly whether or not the `summaries` row exists yet (live-aggregate fallback covers the empty seed). `[tested]`
4. Changing a URL filter (e.g. `?status=paid`) produces a new `listFetchedAt` for the new arguments, which then holds stable on reload — filter, sort, cursor, view, and role participate in the cache key. `[tested]`
5. An invoice detail page shows a `fetchedAt` that stays stable across reloads. `[tested]`
6. The cached bodies contain no session reads, `cookies()`, or `headers()` — the page passes `orgId` in. `[tested]`
7. The inspector's `cacheLife` readout shows `listInvoices: 'minutes'`, `getInvoiceDetail: 'minutes'`, `getOrgInvoiceSummary: 'hours'`. `[untested]` (manual — inspector visual)

### Coding time

One line directing the student to implement against the brief and the test suite, then read the reference. Writer wraps the body in `<details>` (collapsed by default).

Full reference implementation, organized as it appears in the repo. Reference signatures are in the chapter framing — do not re-derive, present them.

Files to cover, in repo order:
- `src/lib/cache/tags.ts` — the `invoiceTags` namespaced object: `list(orgId)` → `org:${orgId}:invoices`, `record(orgId, id)` → `org:${orgId}:invoice:${id}`, `summary(orgId)` → `org:${orgId}:summary`. Each a pure function of its arguments; the string template is the contract.
- `src/lib/cache/profiles.ts` — populate `cacheProfiles` so the inspector readout matches: `listInvoices` → `'minutes'`, `getInvoiceDetail` → `'minutes'`, `getOrgInvoiceSummary` → `'hours'`.
- `src/lib/invoices/queries.ts` — the three reads. Each opens with `'use cache'`, then `cacheLife(...)`, then `cacheTag(...)`, then returns `{ ...result, fetchedAt: new Date().toISOString() }`.
- Page-level wiring (`(app)/invoices/page.tsx` and `[id]/edit/page.tsx`) — a single-line pass-through: the parent already calls the queries; thread the returned `fetchedAt` into `<FetchedAtStrip listFetchedAt={...} summaryFetchedAt={...} />` (detail page passes `detailFetchedAt`).

Decision rationale (one or two sentences each):
- `cacheLife('minutes')` for list and detail vs `'hours'` for summary — list and detail are read and edited often, so a few minutes is the right staleness ceiling if an invalidation ever fails to fire; the summary is refreshed explicitly by the job and only matters on the dashboard, so hours.
- The `fetchedAt` line sits inside the cached function's return so it is computed once per cache entry, not per request — this is what makes a stable timestamp a meaningful hit signal.
- The detail read carries both `invoiceTags.record(orgId, id)` and `invoiceTags.list(orgId)` so it invalidates on either a record-level write or a future org-level write — tagging at the granularity of the writes that should reach it, not just the read's own identity (the tag-union rule from lesson 1 of chapter 072; link, do not re-explain).
- Keep the directive off the toolbar and any Client Component — it reads URL state, which is request-scoped, and is dynamic by definition.

Coverage of `[untested]` requirement 7: `profiles.ts` is the source the inspector's `cacheLife` readout reads; populating the map is what flips the dash placeholders to the three profile strings.

Callouts:
- Order inside a cached body is load-bearing: `'use cache'` first, then `cacheLife`, then `cacheTag`.
- `getOrgInvoiceSummary` falls back to a live count + sum over active invoices when the `summaries` row is absent — the cached read works from minute one even though the seed leaves `summaries` empty; once the job (lesson 4) populates the row, it reads from there.
- The student threads the `fetchedAt` line through the return rather than authoring `<FetchedAtStrip />` (provided).

For topics owned by regular lessons, link not re-explain: `use cache` directive + serializable args + closure rules → lesson 3 of chapter 032; `cacheLife` profiles → lesson 4 of chapter 032; `cacheTag` + the four tag shapes + `tags.ts` convention + the `fetchedAt` discipline + tags-are-arguments rule → lesson 1 of chapter 072.

**Code component usage:**
- `tags.ts` and `profiles.ts` — `Code` (short, simple blocks).
- `queries.ts` — `AnnotatedCode` for at least one read (e.g. `listInvoices` or the detail read), stepping the student through the directive stack (`'use cache'` → `cacheLife` → `cacheTag`) and the frozen-`fetchedAt` return; the detail read's two-tag call is the focus-worthy part. The other two reads can be plain `Code` once the pattern is established.
- Page-level pass-through — `Code` (single-line change).
- No `CodeVariants` (no before/after needed — the directives are additive). No `CodeTooltips`. No diagram — the concept is the mechanical directive stack plus the tag-string discipline, and the inspector is the live verification surface; prose carries it.

### Moment of truth

Test command and expected pass output, then the by-hand checklist for what tests do not cover.

- `pnpm test:lesson 2` — runs `lesson-verification/Lesson 2.ts`; expect all assertions green, covering stable `fetchedAt` across repeated reads, distinct cache entries per filter argument, and the absence of session reads inside the cached bodies.

By-hand checklist (render with `Checklist`/`ChecklistItem`):
- [ ] Open `/invoices`; note `listFetchedAt` and `summaryFetchedAt`; reload promptly; both unchanged.
- [ ] Open the inspector's hit/miss probe link to `/invoices`; reload promptly; the same `listFetchedAt`.
- [ ] Change the URL filter to `?status=paid`; `listFetchedAt` is new for the new args; reload; it holds stable.
- [ ] Open an invoice detail page; note its `fetchedAt`; reload; it holds stable.
- [ ] Inspector `cacheLife` readout shows `listInvoices: 'minutes'`, `getInvoiceDetail: 'minutes'`, `getOrgInvoiceSummary: 'hours'`.
- [ ] Grep for `org:` and `invoice:` outside `tags.ts` and the cached reads — zero hits at any other site.

Closing sentence: caching demonstrably works; no invalidation paths exist yet, so a write leaves the cache stale until `cacheLife` expires — the next two lessons close that gap.

## Scope

- **No invalidation.** `updateTag`, the per-action fan-out, and the misuse-`revalidateTag`-from-action demo are lesson 3 (Read-your-writes invalidation).
- **No background recompute.** `revalidateTag` from the in-process `recomputeOrgSummary` job is lesson 4 (Eventual invalidation).
- **Tag-shape / `tags.ts` convention theory and the four-call decision tree** are taught in chapter 072 (lessons 1 and 2); this lesson applies them, it does not re-derive them.
- **`use cache` / `cacheLife` / `cacheTag` mechanics** are taught in chapter 032 (lessons 3, 4); this lesson applies them.
- **Per-user `'use cache: private'`, edge/CDN tuning, the Upstash cross-process backend** — not here; Upstash is chapter 074.
