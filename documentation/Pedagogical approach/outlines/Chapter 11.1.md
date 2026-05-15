# Chapter 11.1 — URL-state list views: pedagogical approach

## Concept 1 — The URL is the source of truth for any view state that should survive a refresh

**Why it's hard.** A returning dev's reflex from the SPA era is to keep filter, sort, and search in `useState` and call it done. The view works, the table re-renders, the senior code-reviewer rejects the PR — because refresh wipes the filter, share-the-link sends a coworker to the empty view, and the back button is useless. The student has to install one decision rule (refresh / share / history → URL; transient interaction → component state) before any mechanic gets taught, otherwise every later piece is built on the wrong default.

**Ideal teaching artifact.** Decision archetype delivered as a **refresh-and-share test gauntlet**. The student is shown a static screenshot of a list view with six pieces of view state circled and labeled: status dropdown (currently "Paid"), sort header ("Total desc"), search box ("acme"), page-2 cursor, the open/closed state of the filter dropdown, and the hover state on row 4. Below the screenshot, three questions for each piece: would the user expect this back after a refresh? After pasting the URL to a coworker? After clicking back? The student answers each in a small table; the reveal pane shows the senior call for each (the first four → URL; the last two → component state) and names the rule: *the refresh test is the URL test*. Closing line: every later mechanic in this chapter is downstream of this one decision.

**Engagement.** A `Buckets` sort with twelve pieces of UI state drawn from list-view, modal, and form contexts ("active status filter", "in-progress text in a debounced search box", "current page cursor", "open/closed state of a dropdown", "selected row in a master-detail panel", "form input value before submit", "scroll position of the table", "the row id being edited inline", etc.) — student sorts into "URL" and "component state". The decoys are the ambiguous ones (selected row, scroll position) and get a per-card explanation on review.

**Components.**
- `Figure` wrapping a hand-coded SVG annotating the six circled regions on a static list-view screenshot, with the refresh/share/back questions rendered as a small adjacent grid.
- `Buckets` for the URL-vs-component-state sort.
- `Aside` (`tip`) below the round naming the rule: *the refresh test is the URL test*.

**Project link.** Project 11.3.3 ("Move every control to the URL") is the literal cash-out of this decision; the student returns to this gauntlet's table when deciding where each toolbar control's state lives.

---

## Concept 2 — Server reads, client writes, and `replace` keeps the back button useful

**Why it's hard.** Even a student who agrees the URL is the source of truth still defaults to client-side reads (`useSearchParams` in every component) and `router.push` for every state change. Both reflexes are wrong for production list views. The page is a Server Component that should read `searchParams` at the route boundary, parse once, query the database, render the table; the client only writes via `router.replace` so the back button leaves the list rather than undoing fifty filter chips. The teaching has to make the round-trip visible — and make the difference between `push` and `replace` *felt* through the back button, not stated as a rule.

**Ideal teaching artifact.** Mechanics archetype delivered as a **side-by-side back-button playback**. The student sees two recordings (animated SVG sequences) of the same interaction: user opens the list, picks "Status: Paid", picks "Sort: Total desc", types "acme" into search, hits page 2. Left recording uses `router.push` for every change; right uses `router.replace`. After the fifth interaction, both panels show the user clicking the browser back button repeatedly. Left: five back clicks to leave the page (the user is trapped in chip-undo hell). Right: one back click leaves the page (the previous *real* navigation). Below the two recordings, a sequence diagram in Mermaid showing the canonical round-trip — client input change → setter → URL change → Server Component re-render → query → streamed table — with the explicit note that no client-side fetch and no `useEffect` participate.

**Engagement.** A `Sequence` exercise: the student drags eight steps into the right order for "user types into the search box and the table updates" — `useDeferredValue` hands off → setter is called inside `startTransition` → URL is rewritten with `replace` → Server Component re-renders → `searchParamsCache.parse` runs → Drizzle query runs → streamed table arrives → client hydrates the table. A decoy step ("`useEffect` syncs state to URL") is in the pool to confirm the student rejects it.

**Components.**
- Existing: a Mermaid sequence diagram for the round-trip.
- New: a `BackButtonPlayback` widget — two stacked horizontal "tape" tracks (push vs. replace), each populated with click events; below them a synthetic back-button history stack the student can pop one entry at a time, watching where the user ends up. Inputs: scripted event sequence per track. Demoted to alternative bullet — the value is high but it's load-bearing only here, and the same teaching beat can be carried by a two-track `Figure` with hand-SVG history-stack ticks plus the Mermaid round-trip below.
- `Sequence` for the eight-step ordering drill.

**Project link.** Project 11.3.3 wires the toolbar Client Component to `nuqs` setters with `replace`-by-default options; the student should be able to point at where the back button is preserved.

---

## Concept 3 — `nuqs` parsers as the one source of truth across server and client

**Why it's hard.** Hand-rolled `URLSearchParams.set(...)` plus a Zod schema plus `router.replace` works for one parameter, gets verbose for two, becomes a tax past three — and worse, the server's parser and the client's reader drift apart silently. A status enum gets added on the client setter, forgotten on the server schema, and the URL parameter is silently dropped on the page render. The student has to see the production threshold (where hand-rolled stops paying), see what `nuqs` does for them (typed parsers, defaults stripped from the URL by construction, one schema shared between `createSearchParamsCache` on the server and `useQueryStates` on the client), and lock in the discipline of *one parser module per route*.

**Ideal teaching artifact.** Decision archetype delivered as a **threshold-crossing diff**. Two `<Tabs>`-style panels show the same list-view route at two scales. Tab 1 ("two parameters"): the page has a status filter and a sort. Hand-rolled side shows the page reading both with Zod + manual `URLSearchParams.set` in the client setter — about 30 lines, readable. `nuqs` side shows the same thing in 12 lines. The diff is small enough that "use `nuqs`" feels like preference. Tab 2 ("five parameters"): add tags array, search, cursor. Hand-rolled side balloons to 90 lines with three places where the server schema and the client setter could drift. `nuqs` side is 22 lines with one shared parser module. The visible scaling is the threshold; the lesson lands `nuqs` as the canonical pick the moment a route has filter + sort + search + pagination.

A second beat: an `AnnotatedCode` walkthrough of the canonical `searchParams.ts` module — the parsers (`parseAsStringEnum`, `parseAsArrayOf`, `parseAsString`, `parseAsInteger`), the `.withDefault(...)` calls, the `createSearchParamsCache(...)` export — annotated to show *this one file feeds both sides of the boundary*. The annotation labels the two consumers explicitly (server: `await cache.parse(props.searchParams)`; client: `useQueryStates(parsers)`).

**Engagement.** A `Dropdowns` exercise on the canonical parser module — seven blanks the student fills: `parseAsStringEnum(['draft', 'paid', 'overdue'])`, `.withDefault('-createdAt')`, `parseAsArrayOf(parseAsString)`, `.withDefault([])`, `createSearchParamsCache(...)`, the server-side `await searchParamsCache.parse(...)`, and the client `useQueryStates(parsers)`. Each blank is the exact slot a student would forget. The exercise confirms recall of the shared-schema discipline.

**Components.**
- `TabbedContent` with two tabs ("two parameters" and "five parameters"), each containing a side-by-side `CodeVariants` of hand-rolled vs. `nuqs`.
- `AnnotatedCode` for the canonical `searchParams.ts` walkthrough with explicit server and client consumer callouts.
- `Dropdowns` for the seven-blank fill-in.

**Project link.** Project 11.3.3 ships exactly this parser module as the first file written; the student should be able to defend why the parsers are shared rather than duplicated on each side.

---

## Concept 4 — Four filter shapes, one implicit-default rule

**Why it's hard.** Filters look like a survey ("here are the four shapes you'll write") but the cut is decision-shaped — pick the wrong shape (single-value where you needed multi, range as one parameter where you needed two) and the URL is brittle, the parser fights you, or the link length grows for no reason. The student also needs the *implicit-default rule* — defaults live in the parser, never in the URL — to write URLs that are short, readable, and bookmark-friendly. Without it, `?status=&tags=&showArchived=false&q=` clutters every shareable link.

**Ideal teaching artifact.** Reference archetype delivered as a **four-card filter catalog**, each card a self-contained mini-example. Card 1 (single-value enum): a `StatusFilter` dropdown next to its parser (`parseAsStringEnum([...]).withDefault(null)`), the URL it produces when active (`?status=paid`), and the URL when at default (empty — *parameter absent*). Card 2 (multi-value array): a tag multi-select next to `parseAsArrayOf(parseAsString).withDefault([])`, the comma-separated URL (`?tags=billing,urgent`), and the note that repeated-key form exists via `withOptions({ separator })`. Card 3 (range): a date range next to *two* parameters (`?createdFrom=...&createdTo=...`) and an explicit aside that a single-blob encoding is the wrong reach. Card 4 (boolean toggle): a "show archived" switch next to `parseAsBoolean.withDefault(false)`, the URL when on (`?showArchived=true`), and the URL when off (*parameter absent*).

Each card has the **active URL** rendered as a visible "browser bar" strip across the bottom, and a tiny live indicator showing what the URL looks like when *all* filters are at default — empty path. The strip is the teaching beat for the implicit-default rule: defaults are *absent*, not encoded.

**Engagement.** A `Matching` drill: eight prose filter requirements (e.g., "user picks one status out of five", "user picks any number of tags from a known set", "filter rows created in a date window", "show archived toggle", "free-text search", "pick one of three plan tiers", "filter rows with `is_starred = true`", "filter by assigned user from a list of teammates") matched against the four shapes (enum / array / range / boolean / *not-a-filter: search-text*). Free-text search is the decoy that routes to Concept 6.

**Components.**
- `CardGrid` of four `Card`s, each containing a small static UI fragment (hand-coded HTML or `Figure`-wrapped SVG) plus a `Code` block for the parser plus a styled "browser bar" strip showing the URL at active vs. default. No bespoke component — the catalog is set dressing for one beat.
- `Matching` for the eight-requirement classification.
- `Aside` (`tip`) below: *defaults are absent from the URL, not encoded; `nuqs` strips them by construction*.

**Project link.** Project 11.3.3's toolbar carries status (enum), tags (array), and a search box; the student picks the shape per filter directly from this catalog.

---

## Concept 5 — Cursor-reset is the invariant: filter, sort, or search change clears the cursor

**Why it's hard.** This is the production bug that ships when the chapter's pieces are taught independently and never reconciled. The student writes the sort dropdown, writes the cursor pagination, ships. A user picks "Total desc" while on page 4 of "createdAt desc" — the cursor decodes against the *new* sort key and the page shows nonsense (or the wrong rows, or an empty page). The fix is structural: every setter that changes the result set bundles `cursor: null` in the same `setQueryStates` call. The teaching has to plant the bug *first* so the student feels the failure mode, and then install the structural fix as a one-line discipline.

**Ideal teaching artifact.** Pattern archetype delivered as a **wrong-by-default explorable**. The student is dropped into a live mini-list view (twelve seeded invoice rows, filter dropdown, sort dropdown, two-page cursor pagination) where every setter is wired *without* the cursor-reset. The student is given a scripted scenario: "filter to Paid, sort by `-createdAt`, click 'Next page', then change sort to `-total`." After step four, the table shows a duplicate row from page 1 and a missing row from page 2 — the cursor decoded against the new sort key produced incoherent results. The student is then given a single line of code (`setQueryStates({ sort: '-total', cursor: null })`) to drop into the sort setter; the playthrough is repeated and the bug is gone. Two more scripted scenarios (filter change resetting cursor, search change resetting cursor) prove the invariant generalizes.

The closing diagram is a tiny state graph: any node that writes to filter/sort/search has an edge to cursor=null; only the pagination setter writes to cursor without resetting. The graph is the structural fix in one picture.

**Engagement.** The explorable carries the assessment — fixing the bug *is* the recall. The follow-up beat is a `MultipleChoice` round of four scenarios ("user changes the sort", "user clears a filter", "user types a new search term", "user clicks Next page") where the student picks which setters should bundle `cursor: null` (the first three) versus which should not (the last). The decoy is "user opens a filter dropdown" — no URL write, no reset needed.

**Components.**
- New: a `WrongByDefaultListSandbox` widget — a tiny seeded list view (rows, filter, sort, cursor pagination) where the student can replace one line in the sort setter and replay scripted scenarios; the widget visualizes which rows the cursor decoded for and which rows it should have decoded for. Inputs: seed rows, scripted scenarios, the setter line under student control. Uses in this chapter: Concept 5 (primary), Concept 7 (the row-inserted-between-page-loads scenario reuses the same scaffold). Recurs within the chapter — earns its weight.
- Mermaid state graph for the invariant.
- `MultipleChoice` for the four-scenario confirmation.

**Project link.** Project 11.3.3 explicitly tests the cursor-reset clause in "Done when"; the student writes the bundled-`null` line in three setters and verifies the share-and-refresh contract across sort and filter changes.

---

## Concept 6 — Typed in the box, committed in the URL: the search-input rhythm

**Why it's hard.** Search inputs are where every reflex from the SPA era is wrong at once. Writing the URL on every keystroke produces history spam and a server re-render per character. Binding the input's `value` to the URL makes typing janky as each keypress round-trips. The student needs to see the *split*: "typed" lives in component state, drives the input; "committed" lives in the URL, drives the query. They diverge while the user is typing, converge after a settling moment. And in 2026 the rhythm is React-native — `useDeferredValue` over the typed value, `useTransition` around the URL write — not a 250ms `setTimeout`-based debounce.

**Ideal teaching artifact.** Concept archetype delivered as a **scrubbable two-track timeline**. Horizontal axis is time as the user types "acme corp". Top track is the *typed* value (changes on every keystroke). Bottom track is the *committed* URL value (lags, settles, only emits at deferred-value handoffs). The student can drag a playhead across the timeline and watch the two tracks diverge during typing and converge after each pause. Below the timeline, three radio toggles let the student switch between rhythm strategies: (1) write-on-every-keystroke (the bottom track fills with dozens of ticks), (2) 250ms debounce (the bottom track has clean ticks but lags on slow devices), (3) `useDeferredValue` + `useTransition` (the bottom track adapts — ticks farther apart when the simulated device is slow, closer when fast). A "fast device / slow device" toggle next to the rhythm picker drives the adaptive behavior. Below it, an `isPending` indicator pulses while the bottom track catches up.

A second beat — a small `AnnotatedCode` walkthrough of the actual hook composition: `useState` for typed; `useDeferredValue(typed)` to derive the deferred value; an effect (or direct setter call) inside `startTransition` writing the deferred value to `nuqs`'s `setQuery`; the `nuqs` parser declared with `throttleMs: 200` for the URL-write rate-limit layer. The annotation labels which piece carries which guarantee: React keeps the input responsive, `nuqs` keeps the URL writes sane.

**Engagement.** A `PredictOutput` round on a six-character typing scenario: the student is shown the typed sequence "acme c" (six characters, with timings) and predicts how many URL writes land under each of three rhythms — write-on-keystroke (6), debounce-250ms (1, after a pause), `useDeferredValue` + `throttleMs: 200` (2-3, adaptive). The reveal walks the actual count for each. Confirms the student internalized why the rhythm matters.

**Components.**
- New: a `TypedVsCommittedTimeline` widget — two synchronized horizontal tracks (typed value, committed URL value), draggable playhead, rhythm-strategy radio, fast/slow device toggle, `isPending` pulse. Inputs: a scripted keystroke trace; the rhythm strategy and device speed are user-controlled. Uses in this chapter: Concept 6 only. Single-use within this chapter but with a strong forward-link: the rhythm/`useDeferredValue` interaction recurs in 16.2 (TanStack Query rhythms), 16.4 (Zustand wizard), and any future "input → server" interaction lesson. Earns its weight.
- `AnnotatedCode` for the hook composition with per-line annotations of which guarantee comes from which piece.
- `PredictOutput` for the URL-write-count prediction.

**Project link.** Project 11.3.3 wires the search input with `useDeferredValue` + `useTransition` + `nuqs` `throttleMs`; the student should be able to point at each piece on the timeline widget.

---

## Concept 7 — Cursor by default; offset only when the set is small and bounded

**Why it's hard.** Offset-based pagination *looks* simpler — `?page=5`, skip 80 rows, return 20. The cost is invisible until the table is large or the data is live. Two failure modes bite production: at depth, the database scans `offset + limit` rows on every page (linear degradation); under inserts, rows shift between page loads and the user sees a duplicate row on page 2 they already saw on page 1. Cursor-based pagination is immune to both — but it can't jump to "page 50" and the URL carries an opaque blob the user can't edit. The student has to feel the *offset failure*, see how cursor sidesteps it, and learn the one place offset is still right (small, bounded, "go to page 5" UX).

**Ideal teaching artifact.** Concept archetype delivered as a **live insert-during-pagination simulator**. The student sees a list of twelve seeded invoice rows split across three pages of four. A toggle at the top picks the pagination strategy: offset (`?page=N`) or cursor (`?cursor=...`). The student steps through pages 1 → 2; the table shows the expected rows. A button labeled "boss inserts an invoice at the top" is the load-bearing interaction — pressing it inserts a new row at the head of the (`-createdAt`) ordering, then the student clicks "next page" again. Under offset, page 2 now shows the *last row of page 1 again* (the duplicate failure rendered visibly, with the duplicate highlighted in red on both pages). Under cursor, page 2 shows exactly the rows after the encoded cursor — no duplicate. A side panel renders the URL for each step (`?page=2` vs. `?cursor=eyJpZCI6...`) and the underlying SQL for each (`offset 4 limit 4` vs. `where (createdAt, id) < (...) order by ... limit 4`).

The closing beat is a **decision tree** in Mermaid: result set bounded under a few hundred? + user expects "jump to page N"? → offset. Otherwise → cursor. Two examples lit up — settings audit log (~50 rows, offset) vs. invoice list (could grow unbounded, cursor).

**Engagement.** The simulator carries the recall by surfacing the duplicate row in red. The confirmation beat is a `TrueFalse` round of six statements: "Cursor pagination can jump to page 50" (false), "Offset pagination is stable under inserts" (false), "Cursor URLs are typically opaque base64" (true), "Cursor pagination needs the same composite index that backs the sort" (true), "A `?page=N` URL is appropriate for a 50-row settings audit log" (true), "Cursor pagination shows a row's position, not the snapshot of what the original viewer saw" (true).

**Components.**
- The `WrongByDefaultListSandbox` from Concept 5, extended (in v1) with the insert-at-top button and the offset/cursor toggle, plus a side panel rendering the URL and the underlying SQL per step. Reuse compounds the build.
- Mermaid decision tree for the cursor-vs-offset choice.
- `TrueFalse` for the six-statement confirmation.

**Project link.** Project 11.3.3 ships cursor pagination as the default; the student should be able to point at which "Done when" clause the simulator's duplicate-row failure mode maps to.

---

## Concept 8 — The opaque cursor: sort key + tiebreaker + version, base64-encoded

**Why it's hard.** Cursor pagination is conceptually clean (Concept 7) but the *encoding* is where the implementation breaks. The student writes the cursor as a raw JSON blob in the URL, leaks internal column names, and invites users to hand-edit the cursor and produce undefined results. Worse, the cursor encoded against `-createdAt` survives a sort change to `-total` and decodes against the wrong column — silent corruption, not a thrown error. The teaching has to lay out the anatomy of a production cursor (what's in the blob, why it's opaque, why versioning, plus the next-extra-row trick for `hasNext`), so the student can recognize a malformed cursor on PR review.

**Ideal teaching artifact.** Concept archetype delivered as an **anatomy-of-a-cursor reveal**, plus a paired walkthrough. Top half: the URL `?cursor=eyJ2IjoxLCJzIjoiLWNyZWF0ZWRBdCIsImsiOnsiY3JlYXRlZEF0IjoiMjAyNi0wNC0xNSIsImlkIjo0Mn19` rendered as a static URL bar with an arrow pointing down to a base64-decoded JSON object: `{ v: 1, s: '-createdAt', k: { createdAt: '2026-04-15', id: 42 } }`. Each key labeled with a callout: `v` is the cursor format version (catches stale cursors from old code), `s` is the sort key the cursor was encoded for (the validation hook that catches sort-change cursors), `k` is the position itself (sort key value + `id` tiebreaker). To the right, an aside: "if `s` in the cursor doesn't match the current sort, fall back to the first page silently."

Bottom half: an `AnnotatedCode` walkthrough of the server-side query that uses the cursor — the `where (createdAt, id) < (cursor.createdAt, cursor.id)` predicate, the `order by createdAt desc, id desc limit pageSize + 1` query (the `+ 1` is the next-extra-row trick), the slice that drops the extra row before returning, and the `hasNext = rows.length > pageSize` derivation. Each piece annotated for what it guarantees (predicate → composite-index-driven; `+ 1` → cheap `hasNext` without a count query).

**Engagement.** A `CodeReview` exercise: the student reviews a PR introducing cursor pagination with four planted issues — (1) the cursor is JSON in the URL, not base64; (2) the cursor blob omits the tiebreaker `id` (so equal-`createdAt` rows produce inconsistent pages); (3) the cursor blob omits the version/sort marker (sort changes silently corrupt); (4) the server queries `limit pageSize` not `pageSize + 1` (so `hasNext` is wrong on the last page). The student leaves an inline comment per issue. AI grades each against a short rubric phrase.

**Components.**
- `Figure` wrapping a hand-coded SVG of the URL bar with the base64-decoded JSON below it and labeled callouts for `v`, `s`, `k`.
- `AnnotatedCode` for the server-side cursor query walkthrough with per-piece guarantees annotated.
- `CodeReview` for the four-issue PR.
- `Aside` (`caution`) below: *raw JSON in a cursor URL is a smell; base64 + version + sort marker is the production shape*.

**Project link.** Project 11.3.3's cursor implementation uses this exact anatomy; the student should be able to point at the version field and the sort marker in their own code and explain what each catches.

---

## Component proposals

- **`WrongByDefaultListSandbox`** — small live list view (seeded rows, filter dropdown, sort dropdown, paginated controls) where one or more setter functions are *student-editable* and a scripted scenario replays to reveal the bug (duplicate row, nonsense page, missing cursor reset). Inputs: seed rows, parser config, scripted scenarios, which setters are editable, expected vs. actual highlighting. The widget renders the table, the URL bar, and optionally the underlying SQL.
  - **Uses in this chapter:** Concept 5 (cursor-reset invariant) and Concept 7 (insert-during-pagination failure mode under offset).
  - **Forward-links:** 11.2.3 (optimistic-concurrency two-tab racing) could reuse the seeded-list-with-editable-setter scaffold; 11.3.3 and 11.3.5 ("Done when" rehearsals) lean on the same shape; 15.2 cache-invalidation lessons could reuse the URL/SQL side panel.
  - **Leanest v1:** a static list with two pages, one filter, one sort, one cursor, and *one* editable setter — no SQL side panel, no fast/slow toggles. The scripted scenarios are hardcoded. Carries Concept 5 alone; extending for Concept 7 adds the insert-at-top button. v1 still teaches.
- **`TypedVsCommittedTimeline`** — two synchronized horizontal tracks (typed value, committed URL value) over a time axis, with a scripted keystroke trace, a rhythm-strategy radio (write-on-keystroke / debounce-250ms / `useDeferredValue` + `throttleMs`), a fast/slow device toggle that drives adaptive behavior on the third option, and an `isPending` pulse indicator.
  - **Uses in this chapter:** Concept 6 only.
  - **Forward-links:** 16.2 (TanStack Query rhythms — same teaching shape for query-deduping rhythms), 16.4 (Zustand wizard form), and any later input-driven interaction lesson where rhythm is the teaching beat.
  - **Leanest v1:** the two tracks and the rhythm-strategy radio, without the fast/slow device toggle (the adaptive behavior is faked with a single canned slow profile). Carries the typed-vs-committed split visually; the adaptive demo is the second-pass polish.

## Build priority

`WrongByDefaultListSandbox` is the higher-leverage build: it carries two distinct concepts in this chapter (cursor-reset *and* the offset-insert failure), maps directly onto two project-chapter "Done when" rehearsals (11.3.3 cursor reset, 11.3.5 conflict drills), and the scaffold (seeded rows + editable setter + scripted scenario + URL bar) is the right primitive for the cache-invalidation and concurrency lessons later. Build the v1 with one editable setter first, then layer the offset/insert button for Concept 7.

`TypedVsCommittedTimeline` is single-use within this chapter but the forward-links to 16.2 and 16.4 are real and the teaching beat (typed-vs-committed under three rhythm strategies) is hard to replicate with static prose plus a Mermaid diagram. Build after the sandbox; v1 without the device toggle is enough.

## Open pedagogical questions

- The `BackButtonPlayback` widget in Concept 2 was demoted to the alternative bullet on the single-use discipline call. If the same two-track history-stack visualization shows up in 5.5.5 (`useRouter`/`useSearchParams`) or in a future browser-navigation lesson, it might be worth promoting — flagging for review when those chapters' outlines are written.
- Concept 4's filter catalog is a four-card reference. If a later chapter ships a fifth filter shape (a hierarchical or tree-structured filter, common in product catalogs), the catalog grows by one card. Out of scope for 11.1 but worth flagging if 11.2 or the saved-views direction surfaces.
