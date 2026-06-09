# Chapter 060 — URL-state list views

## Lesson 1 — The list-view anatomy

**Taught.** The four-pillar list view (filter/sort/search/paginate) as one coherent URL-state shape; the URL-vs-component-state decision rule ("would the user expect this back after a refresh?"); the share-and-refresh contract as acceptance test; the read-on-server/write-on-client split (no `useEffect` URL-sync, no client fetch); `replace` + `{ scroll: false }` as the default for list controls; and the canonical `nuqs` scaffold (adapter once, shared parser module, server cache, client setters).

**Canonical shared shape (lessons 2–4 MUST reuse, not redefine).** Module is `app/invoices/searchParams.ts`, co-located with the route. Final form shipped:
```ts
// nuqs/server imports: createSearchParamsCache, parseAsString, parseAsStringEnum
export const STATUS_VALUES = ['draft', 'paid', 'overdue'] as const;
export type Status = (typeof STATUS_VALUES)[number];
const SORT_VALUES = ['createdAt', '-createdAt', 'total', '-total'] as const;

export const statusParser = parseAsStringEnum(STATUS_VALUES).withDefault(null);
export const sortParser   = parseAsStringEnum(SORT_VALUES).withDefault('-createdAt');
export const searchParser = parseAsString.withDefault('');
export const cursorParser = parseAsString; // no default — absent means first page

export const searchParamsCache = createSearchParamsCache({
  status: statusParser, sort: sortParser, q: searchParser, cursor: cursorParser,
});
```
- Param keys are `status`, `sort`, `q`, `cursor`. Parsers are individually exported (named `xParser`) so client controls import them; the `Status` type is also exported.
- `SORT_VALUES` is module-private (not exported); `STATUS_VALUES` + `Status` are exported. Lesson 2 will likely need to export `SORT_VALUES` / widen the sort enum (it adds `customer`, sortable headers) — when it does, keep the `-key` descending convention and the `as const` + derived-type pattern.
- Server read pattern: `const { status, sort, q, cursor } = await searchParamsCache.parse(props.searchParams)` once at top of `page.tsx`, then `listInvoices({ status, sort, q, cursor })` returning `{ rows, nextCursor }`.

**Client control pattern (the one fully-built example).** `app/invoices/_components/status-filter.tsx`: `'use client'`, receives server-parsed `value: Status | null` as a prop (page is the single read-source), takes ONLY the setter from `useQueryState('status', statusParser)`, writes via the setter (uses `replace` by default). Lessons 2–4 should follow: value-as-prop for the current state, setter from `useQueryState`/`useQueryStates` for writes.

**Page skeleton stubs (deliberate handoff — do NOT complete in this lesson).** `page.tsx` ships `<StatusFilter value={status} />` + `<InvoiceTable rows={rows} />` real, and commented stubs naming their lesson: `<SortControl value={sort} />`, `<SearchInput initialQuery={q} />`, `<Pagination cursor={cursor} hasNext={nextCursor != null} />`. Note prop names: `initialQuery` (search), `cursor` + `hasNext` (pagination).

**Debts (promised to later lessons).**
- Typed-vs-committed search split, React 19 input rhythm → Lesson 3.
- Filter shapes (single/multi/range), `-key` sort encoding, cursor-reset-on-filter/sort-change invariant → Lesson 2.
- Cursor-by-default vs offset, opaque-cursor encoding, "position not snapshot" nuance → Lesson 4.
- Tenant-scoping of the query (`organizationId` always applied) referenced as already-built (Units 8–9); list query is "tenant-scoped" without re-teaching.
- `showArchived` soft-delete toggle wired into base query → Chapter 061. List-revalidation wiring → Chapter 062 project.

**Terminology / mental models (later lessons should reuse verbatim).**
- "The four pillars" = filter / sort / search / paginate.
- "Share-and-refresh contract" (4 guarantees: new tab, refresh, share, back button) + litmus test: **"If a click changes the result but not the URL, the contract is broken."**
- "Read on the server, write on the client" — the architecture sentence: *the page reads, validates, queries, and renders; client controls take their current value as a prop and write back via a setter; one parser module defines the shape for both sides.*
- Threshold rule for reaching `nuqs`: filter + sort + search + pagination = four params = past where hand-rolling pays off.
- `.withDefault(...)` strips the param from the URL when equal to default → pick defaults matching the most common view.

**Patterns / best practices (for project chapter 062).** Co-locate `searchParams.ts` beside the route; single source of truth for parsers across server cache + client hooks; controls render from a server-derived prop, not a second client read; `replace` + `{ scroll: false }` for in-view changes, `push` reserved for row→detail navigation; parsers ARE the boundary validation (`parseAsStringEnum` rejects hand-typed garbage), reach for raw Zod only for params structured beyond the built-in parsers; `NuqsAdapter` wraps root-layout children once.

**Misc.** Example domain is the invoices list (`/invoices`), continuing the invoicing app from prior units. Lesson-specific component: `src/components/lessons/060/1/ListViewMockup.astro` (annotated toolbar→URL mockup, in `<Figure>`). Reused components: `RequestTrace` (the signature server-render/hydrate trace), `StateMachineWalker` (decision walk), `CodeVariants`, `AnnotatedCode`, `CodeTooltips`, `Term`, `MultipleChoice`, two `VideoCallout`s. MDX is fully built (no TODO blocks — unlike lessons 2–4). Cut from the broad chapter-outline scope but plausibly later-relevant: the explicit data-flow diagram (folded into the `RequestTrace`), and the repeated-key vs comma-separated multi-value discussion (deferred to Lesson 2).

## Lesson 2 — Filter shapes and sort encoding

**Taught.** The four filter shapes as variations of one URL-fragment → parser → control template (single enum `parseAsStringEnum`, multi-value `parseAsArrayOf` comma-default, range as two independent `parseAsIsoDate` params, boolean `parseAsBoolean`); sort as a `-key` enum string gated by composite indexes (why enum not free string: shape-injection surface + unindexed-sort perf cliff); `useQueryStates` merge-setter with `null`-clears / `undefined`-leaves-untouched semantics; the cursor-reset invariant; active-filter chips + clear-all reading server-derived props and writing through the setter.

**Widened `searchParams.ts` (lessons 3–4 MUST reuse, not redefine).** Lesson 2 grew lesson 1's module:
```ts
const SORT_VALUES = [
  'createdAt', '-createdAt', 'total', '-total', 'customer', '-customer',
] as const;
export type Sort = (typeof SORT_VALUES)[number];
export { SORT_VALUES };               // now EXPORTED (was private in L1)
export const sortParser = parseAsStringEnum(SORT_VALUES).withDefault('-createdAt');

export const tagsParser        = parseAsArrayOf(parseAsString).withDefault([]); // ?tags=billing,urgent
export const createdFromParser = parseAsIsoDate.withDefault(null);              // ?createdFrom=2026-01-01
export const createdToParser   = parseAsIsoDate.withDefault(null);             // ?createdTo=2026-03-31
export const showArchivedParser = parseAsBoolean.withDefault(false);          // ?showArchived=true only when on
```
- Sort enum gained `customer`/`-customer` (was `createdAt`/`-createdAt`/`total`/`-total`); `SORT_VALUES` + `Sort` type now exported (control needs the array for options, the type for its prop).
- New param keys: `tags`, `createdFrom`, `createdTo`, `showArchived`. Whether each was added to `searchParamsCache` is implied by the pattern; lessons 3–4 should add their own (`q` already there) the same way.
- `showArchived` is the boolean *shape only* — NOT wired into the base query (Chapter 061 owns that).

**Cursor-reset invariant (chapter's recurring rule, named — lessons 3–4 reference by name).** Every write that changes *what is shown* (filter, sort, search) must bundle `cursor: null` into the *same* setter call, e.g. `setQuery({ sort: next, cursor: null })`. Cursor encodes a position in the current ordered+filtered list; a stale cursor decodes against a different list → repeated/skipped rows. The fix is structural (bake it into the write), not vigilance. `nuqs` does NOT auto-clear it. L3 applies it to `q`, L4 to pagination edges.

**`<SortControl />` (the one fully-built control).** `app/invoices/_components/sort-control.tsx`: `'use client'`, `value: Sort` prop (server is read-source), `useQueryStates({ sort: sortParser, cursor: cursorParser })` for the merge-setter, `<select>` with options rendered from `SORT_VALUES` via a `SORT_LABELS: Record<Sort, string>` map, `onChange` does `setQuery({ sort: next, cursor: null })`. Mirrors L1's `<select>`-based `StatusFilter`. Chose dropdown over clickable column headers (UX call; dropdown works for non-table layouts).

**Debts (promised to later lessons).**
- Search `q` + reset invariant applied to it, typed-vs-committed split → Lesson 3.
- Opaque cursor internals ("position in current ordering" black box here) → Lesson 4.
- `showArchived` wired into base query → Chapter 061.
- Drizzle `gte`/`lte`/`orderBy` mechanics → Chapter 038; composite-index design → Chapter 039 (both cited as already-taught background).
- Timezone handling of date-range params (treat as UTC at URL boundary) → Unit 17.

**Terminology / mental models (reuse verbatim).**
- "Filter shapes" catalog: single enum / multi-value / range / boolean.
- "URL fragment → parser → control" = the three slots every shape fills.
- "The reset invariant" — the named recurring rule above.
- `-key` sort encoding: leading `-` = descending; single string beats `sortKey`+`sortDir` pair.
- nuqs setter triad: real value sets, `null` clears, `undefined` leaves untouched.
- "The sort enum is gated by the indexes; a new sort option ships with its migration" — index shape `(orgId, sortKey, id)`.

**Patterns / best practices (for project chapter 062).** Multi-value default to comma-separated, repeated-key only for external-system interop; comma-encoding unsafe when values can contain commas (use for slugs/IDs/enum-like tags only). Range = two flat named params, never a combined blob (self-describing, independently clearable). Boolean defaults to `false` so it's stripped from the URL unless on. Active-filter chips render from server-derived props (label + visibility), only the ✕ is client (needs setter); clear-all is one setter call passing every param its default; never `router.push('/invoices')` to clear (pushes history + full re-render) — always the setter (`replace`).

**Misc.** Lesson-specific components: `src/components/lessons/060/2/StaleCursorBreakage.astro` (static before/after of stale-cursor failure, in `<Figure>`) and `FilterChipRow.astro` (static chip-row mockup, in `<Figure>`). No nuqs live-coding (ReactCoding can't load it); checks use Buckets / Dropdowns / MultipleChoice. Nothing significant cut from this lesson's chapter-outline scope (sortable-column-header affordance mentioned but dropdown built — a deliberate UX pick, not a cut). MDX is fully built (no TODO blocks) — the widened-`searchParams.ts` and `<SortControl />` code above is the as-shipped contract. The `<SortControl />` ships as an `AnnotatedCode` code-string (not a standalone `.tsx` file); the file path above is the canonical contract for project ch.062. Lesson carries NO VideoCallout — an embedded video was removed during cross-lesson dedup.

## Lesson 3 — Typed input, committed URL

**Taught.** The typed-vs-committed split (input controlled by typed `useState`; server controlled by committed URL `q`; they diverge while typing, reconverge on settle — the divergence IS the mechanism, not a bug); the naive direct-write box and its three failures (server round-trip per char, history spam, input lag); three independent knobs hung off the split — `useDeferredValue` (when committed catches up, adaptive, no timer), `useTransition`+`isPending` (keep input responsive through the server re-render, quiet busy affordance), `nuqs` `limitUrlUpdates: debounce(300)` (bound URL writes/server queries); `shallow: false` as the load-bearing option that makes the committed write reach the server; the cursor-reset invariant + empty-query stripping applied to `q`; the blur/Enter commit alternative for slow/expensive sources.

**`<SearchInput />` (the one fully-built control — lesson 4 should mirror its shape).** `app/invoices/_components/search-input.tsx`, `'use client'`, prop `initialQuery: string`, native `type="search"`:
```tsx
const [typed, setTyped] = useState(initialQuery);
const deferred = useDeferredValue(typed);
const [isPending, startTransition] = useTransition();
const [, setQuery] = useQueryStates(
  { q: searchParser, cursor: cursorParser },
  { shallow: false, limitUrlUpdates: debounce(300) }, // whole-hook options — 2nd arg
);
useEffect(() => {
  startTransition(() => { setQuery({ q: deferred || null, cursor: null }); });
}, [deferred]);
// input: value={typed} onChange sets typed; aria-busy={isPending}
```
- `debounce` imported from `nuqs` (alongside `useQueryStates`). Parsers `searchParser`/`cursorParser` imported from `../searchParams`.
- Server side UNCHANGED from L1: page parses `q` via `searchParamsCache.parse`, passes to `listInvoices({ q, ... })`. The whole lesson lived on the client.

**Corrected nuqs API (lesson 4 + project ch.062 MUST follow, NOT the chapter outline's `throttleMs`).**
- `throttleMs` was DEPRECATED in nuqs 2.5.0 (slated for removal in a later major). Use `limitUrlUpdates: debounce(ms)` or `throttle(ms)` (both imported from `nuqs`). The chapter outline still says `throttleMs` — it is stale; this lesson is the source of truth.
- For `useQueryStates`, whole-hook options (`shallow`, `limitUrlUpdates`) are the **second argument**, NOT inside the per-key parser map. For single-key `useQueryState`, they go on `parser.withOptions({...})`.
- `shallow: false` is required on any write that drives a server-rendered list (default is `shallow: true` = client-only, no server notify). Was implicit in L1/L2; surfaced explicitly here.
- nuqs defaults already correct for search — `history: 'replace'` and `scroll: false` — so DON'T pass them. (Chapter outline framed "use replace" as something to set; it's the default. Don't reach for `history: 'push'` on a search box.)

**Debts (promised to later lessons).**
- Opaque cursor encoding/decoding internals, cursor-vs-offset call → Lesson 4 (this lesson only *resets* the cursor, treats it as a black box).
- What the query does with `q` (substring `ilike` vs Postgres full-text search) → Chapter 038 L8 (URL-state side is shape-agnostic, hands the server a string).
- Accessibility depth → Chapter 027 (this lesson states contract only: native `type="search"` → free `role="searchbox"`, `aria-controls` → results table `id`, `aria-live="polite"` region announcing result count).

**Terminology / mental models (reuse verbatim).**
- "Typed vs. committed" — typed = box this instant (component `useState`, every keystroke, drives `value`); committed = what server queries (URL `q`, settles only, drives DB read). Mid-stroke divergence is correct.
- "Three knobs": `useDeferredValue` = *when* commits; `useTransition` = *what user sees while* committing; `limitUrlUpdates`/`debounce` = *how often* the URL is allowed to change.
- "Priority marker, not a speed boost" — applies to BOTH `useDeferredValue` and `useTransition`; neither makes work faster, both change scheduling.
- "Defer the value, write the value" — deferred drives the URL, typed drives the input; deferring the *write* itself is the documented trap.
- `debounce(ms)` = wait until writes stop for ms then commit once (search box); `throttle(ms)` = at most once per ms window (slider).
- Litmus (chapter's, pointed at search): "if a settled keystroke changes the result but not the URL, the contract is broken."

**Patterns / best practices (for project chapter 062).** Search box never blocks on the query — typing always instant; loading is a subtle affordance (faint spinner / soft table fade via `isPending`), never a disabled input or freeze. Empty box writes `q: deferred || null` so empty coerces to `null` and the param strips (clean home URL). Every result-set-changing write bundles `cursor: null` atomically in the same setter call (the reset invariant, same as filter/sort). `useDeferredValue` + `debounce` are complementary, not redundant — deferral = render priority on this device; debounce = don't hit the server on partial input (externally-meaningful threshold). For small in-memory lists you may skip the debounce and lean on `useDeferredValue` alone; debounce earns its weight precisely because `shallow: false` makes each write a real server round-trip. The deferred→URL sync via `useEffect` is the sanctioned exception (synchronizing component state with an external system) — comment names why so it isn't "fixed" as a derive-in-effect smell.

**Misc.** Lesson-specific components: `src/components/lessons/060/3/TypedCommittedTimeline.astro` (static two-track typed/committed timeline, in `<Figure>`) and `KeystrokeRoundtripStorm.astro` (per-step strip for the storm `DiagramSequence`, `step={1..4}`). ReactCoding exercise is the *React-only* slice (`useState`+`useDeferredValue`+`useTransition` driving an in-memory filter with `data-pending`; reference solution uses `deferred !== typed` for the pending flag) since the iframe can't load nuqs — the transferable durable skill. `DiagramSequence`+`DiagramStep` for the per-keystroke round-trip storm; `Sequence`/`Step` drag-to-order check for one settled keystroke burst; `MultipleChoice` for the mid-stroke-divergence misread. Intentionally-wrong naive box tinted red (`data-mark-color="red"`) and comment-labeled "do not ship": single-key `useQueryState('q', searchParser.withOptions({ shallow: false }))`; final build uses `useQueryStates` multi-key form. Carries one `VideoCallout` (`jCGMedd6IWA`, useDeferredValue search box). Nothing significant cut from chapter-outline scope. MDX is FULLY BUILT (no TODO blocks) — the `<SearchInput />` code above is the as-shipped contract.

## Lesson 4 — Cursor by default, offset when small

**Taught.** Cursor-vs-offset as a *decision* (URL-state side only; DB keyset mechanics are ch.038 L6 prerequisite): **cursor by default**, offset earns its place only when *all three* hold — set is small & known-bounded (few hundred max), offset stays shallow, product genuinely needs "jump to page N". The senior question-order (size → stability-under-writes → random-access-vs-more). The two URL shapes (opaque base64 `?cursor=` vs readable `?page=N`); the inserted-row failure that makes offset show a duplicate + skip a row (cursor structurally immune); the `<Pagination />` client control filling lesson 1's stub; the reset invariant from the pagination side (cursor is the thing being reset); the "position not snapshot" share contract; cursor-versioning-against-sort as defense-in-depth; total-count cost (skip on cursor lists, compute on small offset lists).

**`<Pagination />` (the one fully-built control — contract for project ch.062, ship verbatim).** `app/invoices/_components/pagination.tsx`, `'use client'`:
```tsx
type PaginationProps = { cursor: string | null; nextCursor: string | null; hasNext: boolean };
export const Pagination = ({ cursor, nextCursor, hasNext }: PaginationProps) => {
  const [, setCursor] = useQueryState('cursor', cursorParser.withOptions({ shallow: false }));
  // <nav aria-label="Pagination">
  //   <button type="button" disabled={cursor == null} onClick={() => setCursor(null)}>First page</button>
  //   <button type="button" disabled={!hasNext} onClick={() => setCursor(nextCursor)}>Next</button>
};
```
- Single-key `useQueryState`, **setter-only** (current cursor arrives as prop); `shallow: false` via `.withOptions` is load-bearing (otherwise URL write never re-queries the server). **No** debounce/throttle — clicks aren't keystrokes.
- Three server-computed props: `cursor` (are we past page 1), `nextCursor` (token to advance), `hasNext` (from ch.038 L6's fetch-one-extra-row, NOT a `count(*)`). Boolean prop named `hasNext` (predicate naming).
- Next → `setCursor(nextCursor)`; First page → `setCursor(null)` (strips param, canonical empty-URL first page). Setter uses `replace` by default — never `router.push('/invoices')`.
- **Server delta in `page.tsx`** fills lesson 1's stub: `<Pagination cursor={cursor} nextCursor={nextCursor} hasNext={nextCursor != null} />` (lesson 1's stub said `cursor` + `hasNext`; this adds the `nextCursor` prop). `listInvoices({ status, sort, q, cursor }) → { rows, nextCursor }` unchanged.

**Cut (deliberate, project ch.062 stays forward-only).** No "Previous" button / bidirectional `?before=` cursor (named as the reach when product needs back-paging; ~doubles server pagination logic). The offset `<Pagination>` variant (numbered links + `setPage(n)` on `pageParser`) is described in prose but NOT built — `pageParser = parseAsInteger.withDefault(1)` is shown as the *conditional* parser, added only on an offset surface, never on invoices. Page-size selector / `?pageSize=` shown only as a one-line "clamp to a max in the parser" note, not built.

**Debts (referenced as already-taught background; project ch.062 must respect).**
- Keyset SQL, opaque base64 encode/decode (`parseCursor`), fetch-n+1 `hasNext`, the cursor version/sort tag baked at encode time → ch.038 L6 (cited, never re-derived).
- Composite index `(orgId, sortKey, id)` cursor queries ride → ch.039 L1.
- `count(*)` optimization on huge tables (estimated counts) → ch.039 L3.
- Point-in-time snapshot exports → one-line boundary mention; a stored snapshot/export, not a URL param. Out of scope.
- Soft-delete (`showArchived`) interaction with pagination → ch.061. List-revalidation after mutation → ch.062.

**Terminology / mental models (reuse verbatim).**
- "Cursor by default, offset when small" — the verdict; offset's three gating conditions are conjunctive.
- "A cursor URL guarantees the **position, not the snapshot**" — "the rows after this point in the current data," not "the exact rows the sender saw." The sentence to reach for when a teammate files "the pagination link is broken." Offset `?page=N` has the same non-snapshot property PLUS drift — strictly worse for sharing.
- "Bounded set" = a result set whose maximum size you can name up front; the ceiling is what licenses offset.
- Belt-and-suspenders against a sort-mismatched cursor: reset invariant *prevents* one existing (primary/belt), version tag in the blob *catches* slip-throughs by falling back to first page (defense-in-depth/suspenders).
- Decode failure (malformed/hand-edited/stale-shape cursor) → **falls back to first page silently, never throws to the user.**

**Patterns / best practices (for project ch.062).** Cursor lists skip the total count (latency tax on busy tables); small offset lists compute it (random-access UX needs "of 7"). Real `<nav aria-label="Pagination">` + real `<button type="button">`, disabled at the ends, no div-as-button (a11y contract; ch.027 owns depth). Cursor param has no default → absent = first page; clearing strips it. Page-based `?page=N` over raw `?offset=80` for offset surfaces (Linear/Stripe/Slack pattern, human-editable). Unclamped `?pageSize` is a DoS vector — clamp at the boundary. Pagination is in-view navigation → setter's `replace`, never a history `push`.

**Misc.** Closes the four-pillar list view (filter/sort/search/paginate all in URL, all survive refresh + share, all follow the reset invariant). Components reused: `StateMachineWalker` (kind="decision") for the cursor-vs-offset walk, `CodeVariants` for the two parsers, `AnnotatedCode` for the control, `MultipleChoice` for the reset-invariant drill (no `Sequence` drill — the outline's alternative was chosen). Lesson-specific component: `src/components/lessons/060/4/InsertedRowDrift.astro` — the offset-drift-vs-cursor-stability diagram shipped as a dedicated `step={1..4}` `.astro` component rendered inside a `DiagramSequence`/`DiagramStep` (NOT authored fully inline, NOT wrapped in `<Figure>` — `DiagramSequence` self-cards). Carries one `VideoCallout` (`14K_a2kKTxU`, ByteByteGo offset-vs-cursor). No nuqs live-coding (iframe can't load it). MDX is FULLY BUILT (no TODO blocks) — the `<Pagination />` code above is the as-shipped contract. The next chapter (061) adds soft-delete/archive controls on this exact shape.
