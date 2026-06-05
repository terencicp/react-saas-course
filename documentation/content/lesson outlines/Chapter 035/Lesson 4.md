# Lesson 4 — Independent streaming per slot

## Lesson title

Chapter-outline title `Independent streaming per slot` fits — it names both the mechanism (per-slot Suspense via `loading.tsx`) and the payoff (slots stream on their own). Keep it.

- Sidebar title: `Independent streaming`

## Lesson type

`Implementation`

(Final lesson of the chapter. Test-coder runs — `tests/lessons/Lesson 4.test.ts` ships as a `describe.todo` placeholder, so the lesson's real gate is the by-hand checklist plus `pnpm verify`; the writer renders the Implementation section list.)

## Lesson framing

The student installs the senior reflex that streaming granularity is a layout decision, not a rendering accident: by dropping a `loading.tsx` into each slot they give the list and detail their own Suspense boundaries, so each region streams from skeleton to content independently under a real network — the list stays mounted while only the detail re-streams when the selection changes. The durable lesson is *reach for the `loading.tsx` file convention first, the explicit `<Suspense>` tag only when sub-segment granularity demands it*, and *shape every skeleton to mirror its final content so the swap doesn't shift layout*. This closes the surface: every chapter project goal is now browser-confirmable.

## Codebase state

### Entry

The full list-plus-detail surface works without per-slot loading states. Lessons 2–3 are done: `@list/page.tsx` and `@list/default.tsx` render the filtered list, `@detail/[id]/page.tsx` and `@detail/default.tsx` render the detail or empty state, and the `(.)new` intercepting modal plus its `new/page.tsx` twin are wired. The only segment-level loading UI is the provided `invoices/loading.tsx` (covers the first paint of the whole segment). Three stubs remain `TODO(L4)`: `components/skeletons.tsx` (empty `div`s carrying the correct `data-testid`s), `@list/loading.tsx` (returns "Loading list…" text), and `@detail/[id]/loading.tsx` (returns "Loading detail…" text). Because those slot `loading.tsx` files are stubs rather than absent, the slots already have boundaries — they just flash placeholder text instead of a content-shaped skeleton. The `getInvoice` artificial 600 ms delay (from the provided `queries.ts`) is the seam that makes the detail stream observable.

### Exit

`components/skeletons.tsx` exports a real `ListSkeleton` (six `h-12` `Skeleton` rows) and `DetailSkeleton` (heading + subtitle + separator + body blocks mirroring `InvoiceDetail`'s shape), each over the shadcn `<Skeleton>` primitive. `@list/loading.tsx` renders `<ListSkeleton>` and `@detail/[id]/loading.tsx` renders `<DetailSkeleton>`. Under a throttled network the list and detail slots stream independently, each under its own content-shaped skeleton; switching invoices re-streams only the detail. No `TODO(L4)` markers remain; `pnpm verify` is clean. This is the chapter's terminal state — the solution and start trees now match except for the start's `README.md`.

## Lesson sections

Implementation section list, in order. Code samples should be authored as follows:

- The skeleton components and the two `loading.tsx` files are short — use `Code` blocks. For `DetailSkeleton`, consider an `AnnotatedCode` only if the writer wants to direct attention to how each `Skeleton` block maps to the matching `InvoiceDetail` element (heading row → number `h1`, subtitle → customer, separator → `<Separator/>`, body → the `dl`); otherwise plain `Code` with one sentence of prose is enough.
- The finished-result and verification surfaces are visual — use `Screenshot` (the two slots mid-stream, each under its skeleton) inside a `Figure`. A throttled-network capture is the load-bearing evidence here.
- The mission's requirements checklist uses `Checklist` / `ChecklistItem` with `tested`/`untested` chips. Mirror it in `Moment of truth` as the tickable by-hand list.

### Goal + Finished result (intro, no header)

One-sentence goal in user terms: under a throttled network, opening or switching an invoice keeps the list in place while the detail panel streams from a skeleton to its content on its own. Follow with a one-paragraph description (or `Screenshot` in a `Figure`) of the two slots mid-stream — list resolved on the left, `DetailSkeleton` on the right swapping to content. Name that the list's data has already resolved, so it stays put; only the detail, gated by the 600 ms `getInvoice` delay, visibly streams.

Optional figure: a Mermaid `gantt` (the diagram INDEX's pick for parallel tasks on a shared time axis) showing list and detail resolving on independent tracks would clarify "independent" better than prose — brief it here only if the writer judges the screenshot insufficient. Default to the screenshot; do not force the diagram.

### Your mission

Prose paragraph (no subsection headers, no implementation hints). Frame the capability: each slot should get its own segment-level loading UI so the seam where streaming kicks in is owned by the file convention, not a hand-written tag, and each skeleton should mirror the shape of its final content so the swap is invisible. Weave the constraint that this lesson exists to teach — because each slot owns its own `loading.tsx`, each gets its own Suspense boundary and they stream independently with zero extra wiring; a single shared boundary at the segment would gate both regions on the slowest one. Weave in the best-practice trap-avoider: verify by throttling the network in DevTools, because that is what exposes "I'm waterfalling, not streaming." State out of scope in one line: per-sub-section streaming *inside* a page (a slow related-invoices panel that would earn its own explicit `<Suspense>`) is named but not built.

Then the requirements checklist (the only list in the section), each item a verifiable browser outcome tagged `[tested]`/`[untested]`. Note: `Lesson 4.test.ts` ships as `describe.todo`, so the test-coder authoring assertions should target observable behavior the runner can reach in a `node` environment (rendered skeleton markup / `data-testid` presence) and leave throttled-network timing behaviors as `[untested]` hand-checks. Suggested tagging:

1. The list slot shows a `ListSkeleton` (six rows) before its content resolves. `[tested]` — assert the skeleton component renders the expected row count and `data-testid="list-skeleton"`.
2. The detail slot shows a `DetailSkeleton` before its content resolves. `[tested]` — assert `data-testid="detail-skeleton"` and that its blocks mirror the detail's structure (heading, subtitle, separator, body).
3. Navigating from `/invoices` to `/invoices/inv_005` streams the detail slot while the list stays mounted. `[untested]` — throttled-network hand-check.
4. Navigating from `/invoices/inv_005` to `/invoices/inv_009` re-streams only the detail slot. `[untested]` — throttled-network hand-check.
5. Each skeleton's shape mirrors its final content (no layout shift on swap). `[untested]` — visual hand-check.

(The test-coder owns final wording and which assertions are feasible; the brief must contain no hints, so phrase items as outcomes, never as files or exports.)

### Coding time

Build-prompt line directing the student to implement against the brief and the tests, then the full reference solution hidden in `<details>` (writer wraps it). Present the three files in repo order:

- `components/skeletons.tsx` — `ListSkeleton` and `DetailSkeleton` over the shadcn `<Skeleton>` primitive. `ListSkeleton`: six `Skeleton` rows (`h-12 w-full`) in a `flex flex-col gap-1 p-2` wrapper with `data-testid="list-skeleton"`. `DetailSkeleton`: heading block (`h-8 w-48`) + subtitle (`h-4 w-32`) + a separator-height block (`h-px w-full`) + body (`h-40 w-full`) in `flex flex-col gap-4 p-6` with `data-testid="detail-skeleton"`. Rationale to surface: (1) the rows use a stable string-keyed `ROWS` constant rather than array index keys — call out why stable keys matter for a static list and that it matches the pattern in the provided `invoices/loading.tsx`; (2) the `DetailSkeleton` block sizes deliberately track `InvoiceDetail`'s real structure (number `h1`, customer subtitle, `<Separator/>`, the `dl` body) so the skeleton-to-content swap doesn't shift layout — this is the `[untested]` "mirror the final content" requirement, covered only in the solution. Use `Code` (or `AnnotatedCode` for the detail mapping).
- `@list/loading.tsx` — a one-line default export rendering `<ListSkeleton/>`. `Code`.
- `@detail/[id]/loading.tsx` — a one-line default export rendering `<DetailSkeleton/>`. `Code`. Carry the solution's inline comment noting that a slow related panel *inside* the detail would get its own explicit `<Suspense>` — this is the out-of-scope reach.

Decision rationale (one or two sentences each): `loading.tsx` is the segment-level skeleton owner and an explicit `<Suspense>` is the sub-segment one — senior code reaches for the file convention first and the explicit boundary only when granularity inside the segment matters. Callout on what looks unusual at a glance: there is no `<Suspense>` tag anywhere in this lesson's code, yet the slots stream — name that the `loading.tsx` convention *is* the Suspense boundary, so the wiring is the file's location, not a wrapper.

For topics owned by regular lessons, link rather than re-explain: `<Suspense>` as the streaming seam and `loading.tsx` at the segment (lesson 1 / lesson 3 of chapter 031); the explicit-`<Suspense>`-around-a-slow-sub-section reach (lesson 2 of chapter 031); the shadcn `<Skeleton>` primitive (chapter 027). Do not re-teach Suspense mechanics here.

Append the closing forward-references as prose after the `<details>` (this is the chapter's last lesson): Unit 6 adds Server Actions to the modal form, Unit 5 replaces the in-memory fixture with Drizzle and Postgres, Unit 10 adds `nuqs`, cursor pagination, sort, and soft delete on this same surface. External resources, if any, are appended by the resourcer after the `<details>` with no header.

### Moment of truth

Test command and expected pass output: `pnpm test:lesson 4` (the file is a `describe.todo` placeholder until the test-coder fills it — show the expected pass surface once assertions exist) and `pnpm verify` (Biome CI + `next typegen` + `tsc --noEmit` + production build, clean). Then the tickable by-hand checklist, prefaced with the setup step: throttle the network in DevTools to "Slow 3G". Items:

- [ ] Navigating to a detail URL shows `DetailSkeleton`, then the content, while the list stays mounted.
- [ ] Navigating between two invoices re-streams only the detail slot.
- [ ] Each skeleton's shape mirrors its final content (no layout shift on swap).
- [ ] With JavaScript disabled in DevTools, the list and detail still render server-side and the "New invoice" link degrades to the full page.

Close with the chapter-completion note: this is the surface complete — every project goal is now browser-confirmable (server-side filtering that survives reload, the modal that opens on soft nav and falls back to the full page on direct visit / refresh / `Cmd+click`, and per-slot independent streaming).

## Scope

- Does not build per-sub-section streaming with an explicit `<Suspense>` inside a page (e.g. a slow related-invoices panel) — named here, owned by lesson 2 of chapter 031.
- Does not re-teach Suspense or the `loading.tsx` convention — owned by lessons 1 and 3 of chapter 031.
- Does not touch the `@list`/`@detail` data fetching or the `default.tsx` contract — owned by lesson 2 of this chapter.
- Does not touch the intercepting modal or its twin — owned by lesson 3 of this chapter.
- Does not wire the form's submit or any mutation — Server Actions land in Unit 6.
