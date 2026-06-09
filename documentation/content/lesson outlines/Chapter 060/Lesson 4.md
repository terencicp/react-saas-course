# Lesson 4 — Cursor by default, offset when small

- **Title (h1):** Cursor by default, offset when small
- **Sidebar label:** Cursor vs offset pagination

---

## Lesson framing

This is the fourth and final teaching lesson of Chapter 060 and it closes the four-pillar list-view pattern (filter, sort, search, **paginate**).
The three prior lessons built `/invoices` end-to-end except the last control; lesson 1 even shipped the stub `<Pagination cursor={cursor} hasNext={nextCursor != null} />` in `page.tsx`.
This lesson fills that stub.

**The split that defines the lesson.** Chapter 038 lesson 6 already taught cursor pagination *at the database layer* — the keyset model, the mandatory `id` tiebreaker, opaque base64 encode/decode + validation, the fetch-n+1 `hasNext` trick, the composite index it rides.
That is **prerequisite, not content.** This lesson is the *URL-state side* of pagination: which paging token belongs in the URL, what the share-and-refresh contract guarantees once a cursor is in a shared link, the `<Pagination />` client control, and the cursor-vs-offset *decision* a senior makes per surface.
The build-out agent must treat the DB-layer mechanics as already-known background and cite chapter 038 lesson 6 rather than re-derive them. Re-teaching keyset SQL is the single biggest scope risk here.

**The senior spine.** Lead with the decision, not the syntax (course pillar 1). The whole lesson is organized around one verdict — *cursor by default, offset only when the set is small and bounded and the user genuinely needs "jump to page N"* — and the production failure that forces it: a row inserted mid-pagination makes offset show a duplicate, and cursor is structurally immune.
That failure is the emotional core; make the student *feel* the duplicate-row bug before naming the fix. Most juniors reach for `?page=N` reflexively because every tutorial and every ORM `LIMIT/OFFSET` example does; the lesson's job is to make them pause and ask "how big is this set, and is it being written to while people page through it?"

**The contract twist unique to pagination.** The share-and-refresh contract (chapter's spine, named in lesson 1) holds for cursors but with a nuance worth its own beat: a cursor URL guarantees a **position, not a snapshot**. Paste a cursor link to a coworker and they land at "the rows after this sort key *in the current data*" — which may differ from what the sender saw if rows were inserted/deleted between. This is *correct behaviour*, not a bug, and naming it is what separates a senior mental model from "the link is broken."

**Reuse the chapter's invariant, don't re-derive it.** The cursor-reset invariant ("every write that changes *what is shown* bundles `cursor: null` into the same setter call") was named in lesson 2 and reapplied to `q` in lesson 3. This lesson is where the *cursor itself* is finally the thing being written, so the invariant is shown from the pagination side (cursor advances on Next/Prev; resets on any filter/sort/search change) but referenced by name — the student already owns the rule.

**Cognitive-load staging.** Build complexity in layers: (1) the decision (cursor vs offset) abstractly, (2) the two URL shapes side by side, (3) the inserted-row failure that breaks the tie, (4) the `<Pagination />` control wired to `nuqs`, (5) the two senior nuances (position-not-snapshot, cursor-versioning-against-sort) and the small-set edge cases (page-size clamp, total-count cost). Don't front-load the nuances.

**Component reality (from continuity notes + repo memory).**
- ReactCoding's iframe **cannot load `nuqs`** (react-family only) — any live exercise is the react-only/decision slice; the nuqs-bound control ships as a labeled `Code`/`AnnotatedCode` block, not a sandbox.
- The chapter's house style: lesson-specific static `.astro` figures under `src/components/lessons/060/4/`, wrapped in `<Figure>`; MDX carries TODO blocks with the canonical code inline as the contract for a later build-out pass.
- `nuqs` API is `limitUrlUpdates: debounce(ms)` / `throttle(ms)` and whole-hook options as the 2nd arg of `useQueryStates` — **never `throttleMs`** (removed in nuqs 2.5.0; lesson 3 is the in-repo source of truth). Pagination writes are infrequent (a click, not a keystroke) so they need **no** debounce/throttle at all — only `shallow: false`.

**Mental model the student leaves with.** "Paging tokens live in the URL like every other view-state pillar. Cursor is the default because it's stable under writes and indexable at any depth; offset/`?page=N` is a deliberate exception for small bounded sets with random-access UX. A cursor link promises a *position*, not a *snapshot*. Any change to the result set resets the cursor — same invariant as filter/sort/search."

**Estimated student time:** 40–50 minutes.

---

## Lesson sections

### Introduction (no header)

Warm, brief, problem-first; mirror the voice of lessons 1–3 (see lesson 3's intro for register).
Open on the concrete state: `/invoices` now filters, sorts, and searches; one pillar remains, and lesson 1 left a commented `<Pagination cursor={cursor} hasNext={nextCursor != null} />` stub in `page.tsx` waiting for exactly this lesson.
Raise the senior question explicitly (course pillar: decision before syntax): *the invoices table has 50,000 rows — what goes in the URL when the user pages through it, a `?page=5` or an opaque `?cursor=…`, and what does that choice cost you when a teammate inserts an invoice while someone is on page 3?*
Name the one thing that's prerequisite, not new: chapter 038 lesson 6 already built cursor pagination in the query layer (`listInvoices` returns `{ rows, nextCursor }`); this lesson decides what reaches the URL and wires the button. Preview the payoff: by the end the four-pillar list view is complete and shareable.

Tooltip (`Term`) candidates in the intro: **keyset pagination** (the formal name for cursor/seek pagination, "WHERE (sortKey, id) < (…)"), **offset** ("skip N rows then take the page").

### Cursor or offset: the decision before the syntax

The lesson's anchor section — the verdict comes first, everything else justifies it.
Restate the cursor-vs-offset trade-off **as a decision table**, explicitly flagged as recap-from-chapter-038-lesson-6 so the student knows this is consolidation, not new mechanics:
- **Cursor (keyset):** opaque token = last row's sort key + tiebreaker; stable under inserts/deletes; index scan at *any* depth (O(1)-ish per page); **cannot** jump to an arbitrary page N; natural fit for "Next / infinite-scroll" UX.
- **Offset (`LIMIT/OFFSET`):** integer skip; supports random page access ("go to page 12"); degrades **linearly** with depth (DB scans `offset + limit` rows every time); **unstable** under inserts (rows shift between page loads).

State the senior default unambiguously: **cursor by default.** Offset earns its place only when *all* of: the set is small and known-bounded (a few hundred rows max), the offset stays shallow, and the product genuinely needs "jump to page N" (admin tables, a settings list, a short audit view). Production-scale list views — the invoices screen — default to cursor.

Frame it the way a senior actually asks the question (this is the durable skill): *how big can this set get, is it being written to while users page through it, and does the user need random page access or just "more"?* Three questions, in that order.

**Component — `StateMachineWalker` (`kind="decision"`).** This is the ideal home for the decision; it forces the student through the senior's question *order*. Build the walk:
- Root `Question` "How large can this list get?" → branches: "Small & bounded (≤ a few hundred)" / "Large or unbounded (10k+)".
- Large/unbounded → `Leaf` verdict **"Cursor pagination"** (stable, indexable, the production default).
- Small & bounded → `Question` "Does the user need to jump to an arbitrary page?" → "Yes, random access (page 12)" → `Leaf` **"Offset / `?page=N`"**; "No, just Next/Load-more" → `Leaf` **"Cursor (still simpler & stable)"**.
Keep leaves to 2–3 sentences naming *why*. This component was already reused in the chapter (lesson 1 used `StateMachineWalker` for the URL-vs-state decision) — consistent with house style. Do **not** wrap in `<Figure>` (it's a self-carded component).

Tooltip candidates: **bounded set** (a result set with a known small ceiling, e.g. one org's API keys), **index scan vs sequential scan** (only if not already a `Term` earlier — keep it one short definition, defer depth to chapter 039).

### What each paging token looks like in the URL

Now the two URL shapes, side by side, concrete. This is the "syntactic vocabulary" half of the lesson.

**Cursor shape — opaque base64.** Show a real URL: `?cursor=eyJpZCI6NDIsImNyZWF0ZWRBdCI6IjIwMjYtMDQtMTUifQ==`. Make three senior points crisply:
1. The user sees a blob; the *server* decodes it. Opaqueness is deliberate — it stops users hand-constructing cursors and lets the internal encoding evolve without breaking previously-shared links.
2. What's *inside* the blob (the sort key + `id` tiebreaker) is exactly what chapter 038 lesson 6 built — cite it, show the decoded `{ createdAt: '2026-04-15', id: 42 }` as a callout, but **do not** re-derive the encode/decode helper. One sentence: "decoding lives in the `parseCursor` helper from chapter 038 lesson 6."
3. Decode failure (malformed/edited blob, version mismatch) **falls back to the first page silently** — never throw to the user. Name this as the contract.

**Offset shape — `?page=N`.** Show `?page=5`. Senior points:
1. The course picks **page-based `?page=N`** over raw `?offset=80` for the offset case — it's the user-facing pattern (Linear, Stripe, Slack use it for small lists), human-readable and editable.
2. `pageSize` lives in the **parser**, not the URL (fixed default), unless the product offers a user-selectable page size — and then it's `?pageSize=50` *clamped to a max* in the parser (a `parseAsInteger.withDefault(20)` plus a range check), because an unclamped `pageSize` lets a client request millions of rows in one query. Name the clamp as the security/perf reflex.

**Component — `CodeVariants`** (two tabs, "Cursor" / "Offset"), each tab = the parser line(s) for that shape + one-paragraph framing. This is a genuine A/B of the same concept (the paging parser), exactly what `CodeVariants` is for. Tab "Cursor": `export const cursorParser = parseAsString;` (already in `searchParams.ts` from lesson 1 — *reuse, don't redefine*; note it has **no default** — absent means first page). Tab "Offset": `export const pageParser = parseAsInteger.withDefault(1);` plus a note this is the *conditional* parser, added only for offset surfaces. Frame the first sentence of each tab with the trade-off ("opaque, stable, no random access" vs "readable, random access, shifts under inserts").

Tooltip candidate: **base64** (only if the student may not know it — likely already seen by Unit 13; keep terse or skip).

### Why a row inserted mid-pagination breaks offset

The dramatic core — the production failure that *settles* the cursor-vs-offset tie. Teach it before the build-out so the student wires `<Pagination />` already convinced.

Narrative: user is on page 1 (rows 1–20, sorted newest-first). A teammate creates a new invoice — it lands at the *top*. User clicks "page 2" expecting rows 21–40. But every row shifted down by one, so `OFFSET 20` now points at what *was* row 20 — the user sees a **duplicate** of the last row from page 1, and one row gets silently skipped entirely off the end. The deeper the pages, the more drift accumulates.

Then the contrast: cursor pagination asks "give me rows *after this sort key*", which is a stable anchor — an insert above the anchor doesn't move it, so no duplicate, no skip. This is *the* reason cursor is the default for any list that's being written to (i.e. every real SaaS list).

**Component — `DiagramSequence`** (the chapter uses this engine; lesson 3 used it for the keystroke storm). Steps:
1. Offset, page 1: rows A–T (newest first), `OFFSET 0 LIMIT 20`. Highlight the page boundary.
2. A new row **Z** is inserted at the top (tinted to stand out).
3. Offset, page 2: `OFFSET 20 LIMIT 20` — show that row **T** (last of old page 1) reappears as the first row of page 2 (duplicate, tint red) and the true row 21 is pushed off / skipped.
4. Cursor, same insert: query is `WHERE (createdAt,id) < (cursorOf_T)` — anchor unmoved by **Z**; page 2 starts cleanly at row 21, no duplicate (tint green).
Caption per step. This is the must-have diagram of the lesson — the visual makes the abstract "unstable under inserts" *land*.
Consider authoring it as a lesson-specific static `.astro` figure (`src/components/lessons/060/4/InsertedRowDrift.astro`) if the row-grid layout is fiddly inline, mirroring lesson 2's `StaleCursorBreakage.astro` precedent; either way it's a `DiagramSequence` of row grids.

Pull the senior anchor out as an `Aside` (caution): *if your list can be written to while users page it — and a SaaS list always can — offset shows duplicates. That's the bug that makes cursor the default.*

### Wiring the `<Pagination />` control

The worked build-out — the lesson's code center of gravity, fulfilling lesson 1's stub. Mirror the *shape* of lesson 3's `<SearchInput />` (value/flags-as-prop from server, setter from `nuqs`, `'use client'`).

**Server side (page.tsx), brief — it barely changes.** The page already does `const { …, cursor } = await searchParamsCache.parse(props.searchParams)` and calls `listInvoices({ …, cursor })` returning `{ rows, nextCursor }` (the canonical contract from lesson 1 + chapter 038 lesson 6). Show only the delta: pass `cursor` and `hasNext={nextCursor != null}` (and `nextCursor`) down to `<Pagination />`, render `<InvoiceTable rows={rows} />` as before. One short `Code` block or a 2-step `AnnotatedCode` — keep server-side minimal, the lesson lives client-side (same division lesson 3 used).

**The `<Pagination />` client control** — the fully-built example for this lesson. File `app/invoices/_components/pagination.tsx`, `'use client'`. Use `AnnotatedCode` (multiple parts of one file need the student's attention in sequence — exactly its use case). The canonical shape (this is the **contract** for the build-out and project ch.062; put it inline in the TODO block):

```tsx
'use client';

import { useQueryState } from 'nuqs';

import { cursorParser } from '../searchParams';

type PaginationProps = {
  cursor: string | null;
  nextCursor: string | null;
  hasNext: boolean;
};

export const Pagination = ({ cursor, nextCursor, hasNext }: PaginationProps) => {
  const [, setCursor] = useQueryState('cursor', cursorParser.withOptions({ shallow: false }));

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between">
      <button
        type="button"
        disabled={cursor == null}
        onClick={() => setCursor(null)}
      >
        First page
      </button>
      <button
        type="button"
        disabled={!hasNext}
        onClick={() => setCursor(nextCursor)}
      >
        Next
      </button>
    </nav>
  );
};
```

AnnotatedCode steps (each ≤6 lines prose, prefer `color`):
1. `'use client'` + props — `cursor`/`nextCursor`/`hasNext` are **server-computed** and arrive as props (the page is the single read-source; same pattern as `StatusFilter`/`SortControl`/`SearchInput`).
2. `useQueryState('cursor', cursorParser.withOptions({ shallow: false }))` — take **only the setter**; `shallow: false` is load-bearing (lesson 3's lesson) — without it the cursor write never reaches the server and the list never re-queries. Tint the `shallow: false` mark.
3. "Next" `onClick={() => setCursor(nextCursor)}` — advance to the server-provided next cursor; `disabled={!hasNext}` uses the n+1 trick's result from chapter 038 lesson 6 (server fetched one extra row to know there's a next page).
4. "First page" `onClick={() => setCursor(null)}` — clearing the cursor strips the param (it has no default) and returns to the canonical empty-URL first page; never `router.push('/invoices')` (history + full re-render) — the setter uses `replace` by default.

Senior notes to weave into prose around the block (not new sections):
- **`hasNext` comes from the server's n+1 row**, not a count — cheap at any depth (cite ch.038 L6).
- **`hasPrev` / a "Previous" button** is *next-only by default*; true bidirectional needs a `before` cursor (`?before=…`) and the server to compute a prev token. The course default is next + "First page"; mention `before` as the reach when product needs true back-paging, don't build it (keeps the example tight; many list views are next-only/infinite-scroll-style). This is a deliberate scope cut — note it.
- **Accessibility contract** (state, don't deep-dive — chapter 027 owns it): wrap in `<nav aria-label="Pagination">`, buttons are real `<button type="button">`, disabled at the ends.

**The offset variant of the control** — show briefly as a `CodeVariants` tab *or* a short `Code` block: numbered page links / a `setPage(n)` setter from `pageParser`, used only when the decision picked offset. Keep it secondary to the cursor build — one paragraph. Reinforce: page links also use the setter (`replace`), same in-list-navigation rule as filter/sort from lesson 2.

### The cursor-reset invariant, from the pagination side

Short section — the student already owns the rule (named in lesson 2, reapplied to `q` in lesson 3); here it's shown from the angle of the *thing being reset*.
The cursor encodes a position in the *current* ordered+filtered+searched list. Change the sort, a filter, or `q`, and the old position is meaningless against the new list → repeated/skipped rows (the same class of breakage as the inserted-row bug, but self-inflicted).
So: the cursor **advances** only via Next/Prev; it **resets** (to `null`) inside the *same* setter call as any filter/sort/search change. The fix is structural — bake `cursor: null` into those writes (as lessons 2–3 already did via `useQueryStates({ …, cursor: cursorParser })`), `nuqs` does not auto-clear it.
Tie the loop closed: this is why `<SortControl>` (lesson 2) and `<SearchInput>` (lesson 3) wrote `cursor: null` — now the student sees the cursor *being the thing* those writes protect.
Reference by name ("the reset invariant"); do **not** re-explain at length.

**Exercise — `Sequence`** (ordering drill, used in lesson 3). Give the student the steps of "user changes the status filter while on page 3" and have them order what must happen: setter fires with `{ status: next, cursor: null }` → URL updates (param `status` set, `cursor` stripped) → server re-parses → `listInvoices` runs against new filter from the first page → table re-renders at page 1. The drill cements *why* the cursor is bundled into the filter write. Alternatively a small `MultipleChoice`: "User is on page 3, clicks a new sort. The setter call is: (a) `setSort(next)` (b) `setQuery({ sort: next })` (c) `setQuery({ sort: next, cursor: null })`" with `McqWhy` explaining the stale-cursor breakage. Prefer the MCQ if the `Sequence` overlaps too much with a lesson-3 drill — pick one.

### A shared cursor URL is a position, not a snapshot

The senior nuance that completes the chapter's share-and-refresh contract — this is the "what beginners get wrong" beat.
The contract (lesson 1) said: paste the URL, the coworker sees the same view. For filters/sort/search that's exactly true. For a **cursor**, refine it: the coworker lands at *the rows after the encoded sort key, in the current data state* — not a frozen copy of what the sender's screen showed. If invoices were inserted above the anchor since, the coworker sees rows the sender didn't; if deleted, fewer. **This is correct for the cursor contract** ("rows after this position"), not a bug.
Name the senior anchor verbatim for reuse: **"the URL guarantees the position, not the snapshot."**
Contrast lightly: offset `?page=5` has the *same* non-snapshot property *plus* the drift problem — so it's strictly worse for sharing too.
If a true point-in-time snapshot is ever a product requirement (regulatory export, "the list as of this instant"), that's a different feature — a stored snapshot/export, out of scope; name it in one sentence so the student knows the boundary.

**Cursor versioning against sort** — fold in here as the graceful-degradation tail (it's the same "stale token" theme). A cursor encoded for `-createdAt`, if decoded against a `-total` sort, yields wrong results. Two defenses, both senior: (1) the **structural** one already shipped — the reset invariant clears the cursor on sort change, so a sort-mismatched cursor shouldn't normally exist; (2) **defence in depth** — the cursor blob can carry a version/sort tag (built in ch.038 L6's encode), and `parseCursor` falls back to the first page on mismatch. Frame as belt-and-suspenders; the reset invariant is the primary defence, versioning is the safety net for hand-edited or stale shared links. One short paragraph + an `Aside`; do not re-implement the encoder.

Tooltip candidate: **point-in-time snapshot** (a frozen view of data as of an instant, vs a live position).

### When to show "21–40 of 50,000" — and when to skip it

Small but genuinely senior section on the total-count cost (a real decision juniors don't think about).
Showing "Showing 21–40 of 50,000" is friendly but costs an extra `count(*)` query per page load, and on a large table that count can *dominate* page latency. The decisions:
- **Cursor-paginated views (the default, large sets):** skip the total. Show "Next / Load more" (and optionally "First page"); the n+1 trick already tells you whether a next page exists without counting. This is the senior default for the invoices list.
- **Offset-paginated small bounded sets:** the total is cheap (the set is small) and the random-access UX wants it ("page 3 of 7"), so compute it.
Name the scale caveat and defer depth: optimizing `count(*)` on huge tables (estimated counts, etc.) is a chapter 039 concern — point there, don't teach it.
Keep to prose + maybe a two-row `Aside` or a tiny `Buckets` exercise ("which views show a total? cursor list / small admin table" → no/yes) only if it adds value; likely just prose to respect the 40–50 min budget.

### External resources (optional)

One or two `ExternalResource` cards max, only if high-quality and current:
- nuqs docs (parsers / `useQueryState` options) — the production layer the chapter standardized on.
- A reputable keyset-vs-offset write-up (e.g. the "pagination done the PostgreSQL way" / use-the-index-luke style) for the student who wants the DB-side depth — but frame as optional since ch.038 L6 covered it.
Do **not** pad with low-signal links.

---

## Scope

**Prerequisite — restate in one line, do NOT re-teach:**
- Cursor/keyset mechanics at the query layer: the model, mandatory `id` tiebreaker, opaque base64 encode/decode (`parseCursor`), the fetch-n+1 `hasNext` trick — **chapter 038 lesson 6**. Cite it; treat `listInvoices(...) → { rows, nextCursor }` as already-built.
- Composite index `(orgId, sortKey, id)` that cursor queries ride — **chapter 039 lesson 1**. One mention; don't design indexes here.
- The four-pillar shape, `searchParams.ts` module, `searchParamsCache.parse`, value-as-prop client controls, `replace`/`{ scroll: false }`, `NuqsAdapter` — **lesson 1**. Reuse the existing module and `cursorParser`; don't redefine.
- The cursor-reset invariant — **lesson 2** (named there), reapplied to `q` in **lesson 3**. Reference by name; show from the pagination angle only.
- `shallow: false`, `limitUrlUpdates`/`debounce` (NOT `throttleMs`), `useQueryStates` whole-hook options as 2nd arg — **lesson 3** (the in-repo source of truth on the corrected nuqs API). Pagination needs `shallow: false` only; **no debounce/throttle** (clicks aren't keystrokes).
- `useDeferredValue`/`useTransition` input rhythm — **lesson 3**; not relevant here (pagination is click-driven), don't reach for it.

**Explicitly out of scope (do not teach; name + redirect where useful):**
- Re-deriving keyset SQL or the encode/decode helper → ch.038 L6.
- Infinite scroll with `IntersectionObserver` → out of scope (mention only as the "next-only cursor + load-more" UX cousin in one line).
- Real-time/live new-rows-appearing → out of scope (notifications chapters).
- `EXPLAIN ANALYZE` / optimizing `count(*)` at scale → chapter 039 lesson 3.
- Soft-delete (`showArchived`) interaction with pagination → chapter 061 (the boolean *shape* exists from lesson 2 but isn't wired into the base query here).
- List-revalidation after a mutation / Server Actions on the list → chapter 062 project (and chapter 043).
- Tenant scoping of the query (`organizationId` always applied) → treat as already-built background (Units 8–9); the list is "tenant-scoped" without re-teaching.
- Full bidirectional `before` cursor + "Previous" button → named as the reach when product needs it; **built next-only** (deliberate cut, note it).
- Point-in-time snapshot exports → one-sentence boundary mention only.

---

## Notes for the build-out agent (code conventions + house style)

- Reuse `app/invoices/searchParams.ts` and `cursorParser` from lesson 1 verbatim; only **add** `pageParser` (`parseAsInteger.withDefault(1)`) *if* the offset variant is shown, and present it as conditional.
- `<Pagination />` at `app/invoices/_components/pagination.tsx`, `'use client'`, named export, arrow-fn-bound-to-const, props typed as a `type` alias (conventions: `type` over `interface`, named exports, arrow components, two-positional-max → single props object). Setter-only from `useQueryState`; `shallow: false` via `.withOptions`. Boolean prop is `hasNext` (predicate naming).
- Imports grouped (external → `@/` → relative); `cursorParser` is a same-folder-ish relative `../searchParams`.
- Real `<button type="button">`, `<nav aria-label="Pagination">`; disabled at ends; no `div`-as-button.
- Keep MDX TODO-block-with-inline-canonical-code convention (matches lessons 1–3); the code shown in this outline is the **contract**.
- Self-carded components (`StateMachineWalker`, `DiagramSequence`) must NOT be wrapped in `<Figure>`; static `.astro` figures go *inside* `<Figure>`.
- No `nuqs` in ReactCoding (iframe can't load it) — any live exercise is react-only/decision; ship the nuqs control as `Code`/`AnnotatedCode`.
- Intentionally-wrong code (if any offset-misuse demo) tinted red + comment-labeled, per chapter house style.
