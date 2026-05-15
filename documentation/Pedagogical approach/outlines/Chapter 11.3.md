# Chapter 11.3 — Project: The production list view: pedagogical approach

## Concept 1 — Cuts-and-carries: what 11.3 ships, what later units own

**Why it's hard.** The student opens the brief and sees five disciplines layered into one screen — URL state, lifecycle, RBAC, concurrency, audit. The reflex is to either pad scope ("I should add notifications, cache tags, real-time updates while I'm here") or panic-shortcut ("the previous unit's `tenantDb` is too much ceremony, let me inline the filter"). Both kill the chapter's actual teaching beat — that the five disciplines compose *because each one stayed in its lane*. Without an explicit cuts panel up front, the student loses the signal of which layer this chapter installs vs. which earlier or later unit owns each piece.

**Ideal teaching artifact.** Pattern archetype delivered as a **cuts-and-carries panel**, echoing the 6.6 / 7.6 / 10.4 brief framing so the student recognizes the shape. Three columns: *In scope for 11.3* (the five parsers + cache, the scoped query helper, the four lifecycle actions, the version precondition on update, the conflict banner, the audit-log-in-tx discipline), *Carried in from* (7.6's actions and form contract, 6.6's schema and cursor helpers, 10.4's `tenantDb` + `authedAction`, 11.1's `nuqs` setup and rhythm rules, 11.2's lifecycle columns and 409 shape), *Cut, with the unit that owns it* (notifications → 14, cache invalidation → 15.2, bulk multi-select → out, saved views → out, full-text search → 6.3.8, RLS → 11.2 named-as-alternative). The senior posture lands inline: this chapter wires URL state onto the 7.6 CRUD surface and layers the 11.2 lifecycle/concurrency disciplines — *nothing else*.

**Engagement.** A `Buckets` sort: twelve feature descriptions ("a `nuqs` parser per filter shared between server cache and client setter", "an `invoiceScope(orgId).active()` builder layered on `tenantDb`", "a real-time toast when another user archives a row", "a `cacheTag('invoices', orgId)` revalidation after each lifecycle action", "a multi-select with bulk archive", "a `version`-column precondition in every UPDATE's WHERE", "an audit log row written in the same tx as the lifecycle update", "a saved-views panel above the toolbar", "an `Idempotency-Key` hidden field for the archive button", "a Resend email after restore", "a `<form action={archiveInvoice}>` with hidden `id` and `version`", "a Postgres FTS index on `invoices.number`") into the three columns. Wrong-answer feedback names the unit that owns the cut item.

**Components.**
- `Figure` wrapping a hand-coded HTML three-column table for the cuts-and-carries panel. Single-use static; the shape is the same one prior project chapters use.
- `Buckets` for the in-scope-vs-carried-in-vs-owned-elsewhere sort.
- `Aside` (`tip`) below: "five disciplines layered onto one screen — each stays in its lane. The cut items are owned by their owning units, not missing from this one."

**Project link.** This concept *is* lesson 11.3.1's framing — the student returns to the panel at the end of every build lesson to confirm they're still inside the cut.

---

## Concept 2 — The starter is the spec, the inspector is the verification surface

**Why it's hard.** Two postures land in one lesson. (1) The provided files (the `page.tsx` shell, the `table.tsx` shell, the existing 7.6 actions, the `tenantDb` and `authedAction` helpers, the `searchParamsCache.parse` call site, the route rename from `[invoiceId]` to `[id]`) are *contracts* the student's stubs must satisfy — same posture as 7.6 Concept 2, lifted to this chapter. The temptation to "rewrite the form" or "simplify the actions" breaks the contract the page shell already wrote. (2) The inspector page renders the `view=all` tab regardless of role on purpose — the 10.4 defense-in-depth stance lifted here, the student must internalize that the inspector is *testing the server-side refusal*, not displaying a UX bug. Without both postures up front, the student either spends an hour rebuilding what the starter ships or "fixes" the inspector's intentional tab visibility and loses the verification beat.

**Ideal teaching artifact.** Pattern archetype delivered as a **two-track starter tour**. Track A: a `Figure`-wrapped file-tree annotation of the starter (provided files vs. TODO stubs), each stub callout naming the file the stub satisfies — `search-params.ts` is the contract for `page.tsx`'s `searchParamsCache.parse(props.searchParams)` line; `scoped-query.ts` is the contract for the actions in `actions.ts`; `actions.ts` is the contract for the row-action menu in `table.tsx`; `edit-form.tsx` is the contract for the version + conflict surface. Each annotation names what would break in the consumer if the stub's signature drifted. Track B: a side-by-side `TabbedContent` comparing two inspector mockups — left "if we hid the `view=all` tab from members", right "the actual inspector renders it for everyone". Below each, the same attack thought-experiment: a member who hand-types `?view=all` reaches the server in both versions; only the right version *observes* the server-side refusal firing (the read drops to `view=active`, the 10.4 RBAC posture). The two tracks teach the same posture from opposite ends: the starter's shape and the inspector's shape are both load-bearing because they install the disciplines the rest of the chapter exercises.

**Engagement.** A `Dropdowns` exercise on three file headers — `search-params.ts`, `scoped-query.ts`, `actions.ts` — the student fills in the exported names and signatures the consumer files (`page.tsx`, `actions.ts`, `table.tsx`) already import; wrong picks surface the consumer-side break. Confirm with a one-question `MultipleChoice`: "the inspector renders the `view=all` tab for the member role on purpose. The reason is: (a) the toolbar can't role-gate, (b) the server-side refusal is the load-bearing defense and the verify lesson needs to observe it firing, (c) so the operator can switch acting roles freely, (d) the RBAC check is on the page, not the toolbar." Multi-select on (b) and (c).

**Components.**
- `Figure` wrapping a hand-coded file-tree SVG with stub-vs-provided callouts and contract annotations.
- `TabbedContent` with two inspector mockup panels (UI-hide vs. server-refusal), each a hand-coded HTML mockup inside the tab.
- `Dropdowns` for the three-header signature exercise.
- `MultipleChoice` for the inspector-stance recall.
- `Aside` (`note`) below: "the starter is the contract, the inspector is the verification surface. Provided code stays untouched; the inspector's `view=all` tab is deliberate."

**Project link.** This concept *is* lesson 11.3.2's senior posture — the student leaves the tour knowing what each stub satisfies and why the inspector looks the way it does, before writing a line.

---

## Concept 3 — One parser module feeds both consumers

**Why it's hard.** The instinct from 11.1 lands here as muscle memory, but the project keyboard exposes the seam: the student writes the parsers in `search-params.ts`, then writes the toolbar Client Component, and the temptation is to redeclare `parseAsStringEnum(['active', 'archived', 'all'])` inline in the toolbar — "easier than the import". The drift is silent: a new view value gets added to the toolbar, forgotten in the cache, and the server-side parse silently drops the param on render. Worse, the `view` parser ships as `parseAsStringEnum(...)` but the *RBAC gate that drops `'all'` to `'active'` for non-admins* lives downstream at the page boundary, not in the parser — the parser's job ends at "parse the URL"; the page enforces the role. The student needs to feel both the *one-file* discipline and the layer-separation discipline together.

**Ideal teaching artifact.** Pattern archetype delivered as an **`AnnotatedCode` walkthrough of the canonical `search-params.ts` module**, walked once with explicit consumer arrows. The student sees the five parsers authored line by line — `statusParser = parseAsStringEnum(['draft', 'sent', 'paid', 'overdue']).withDefault(null)` (single-value enum, default absent from URL), `sortParser = parseAsStringEnum([...]).withDefault('-createdAt')` (default *is* present semantically but stripped from URL on render), `qParser = parseAsString.withDefault('').withOptions({ throttleMs: 200, history: 'replace' })` (the rhythm and history policy bound to the parser, not the call site), `viewParser = parseAsStringEnum(['active', 'archived', 'all']).withDefault('active')` annotated *"the parser accepts `'all'`; the page enforces the role"*, `cursorParser = parseAsString.withDefault(null)` annotated *"opaque, base64, sort-validated downstream"*. The closing line: `invoiceListSearchParamsCache = createSearchParamsCache(invoiceListSearchParams)`. Beside the walk, a hand-SVG diagram (one source-of-truth box → two arrows fanning to "server: `await cache.parse(props.searchParams)`" and "client: `useQueryStates(invoiceListSearchParams)`"), confirming the 11.1 Concept 3 shape lifted to this codebase.

**Engagement.** A `Dropdowns` exercise on the canonical module — seven blanks the student fills: the three `parseAsStringEnum` argument arrays, the two critical `.withDefault(...)` calls, the `withOptions({ throttleMs, history })` config on `q`, and the `createSearchParamsCache(...)` export line. Each blank is the exact slot the student would otherwise duplicate inline in the toolbar. Confirm with a `MultipleChoice`: "a teammate's PR adds `'cancelled'` to the toolbar's `view` `<Select>` but doesn't touch `search-params.ts`. What happens on submit?" — right answer names the parser drops the unknown value, the page renders `view=active`, the new option silently does nothing.

**Components.**
- `AnnotatedCode` walking the five parsers with per-line annotations on default-stripping, rhythm-binding, and parser-vs-RBAC layer separation.
- `Figure` wrapping a small hand-SVG of the source-of-truth chain (one parser module, two consumer arrows).
- `Dropdowns` for the seven-blank fill-in.
- `MultipleChoice` for the drift trap.
- `Aside` (`tip`) below: "one parser module per route. The parser parses; the page enforces; the toolbar binds. Each layer keeps its job."

**Project link.** This concept *is* the first file lesson 11.3.3 ships — every later file in the chapter imports from it.

---

## Concept 4 — Cursor-reset is bundled in the same setter call

**Why it's hard.** The 11.1 Concept 5 invariant lands as a sentence the student remembers — "any setter that changes the result set bundles `cursor: null`". At the keyboard in 11.3.3, the discipline becomes a structural reflex the student has to *consistently apply* across seven setters (status, sort, search, view, status-chip-clear, sort-chip-clear, search-chip-clear). Forgetting one — say the view-tab setter — is the canonical production bug: the user is on page 4 of `view=active`, clicks the `archived` tab, the cursor decodes against the archived set's first-page boundary, and the user lands on a partial page with rows from neither set. The fix is one line per setter; the discipline is that *every* result-set-changing setter carries the bundle, and the toolbar's structure makes the bundle the default shape, not the careful-author special case.

**Ideal teaching artifact.** Pattern archetype delivered as a **wrong-by-default toolbar repair**. The student is given a `toolbar.tsx` stub where five of seven setters are written *without* the `cursor: null` bundle and runs a scripted scenario in the inspector: filter to Paid, sort by `-total`, click Next, click the `archived` tab. The table renders a mix of paid invoices from page 2 and archived rows decoded against the same cursor — the visible bug. The student walks each setter, identifies the missing `cursor: null`, repairs the five. The runtime replays the scenario; the bug is gone. A small Mermaid state graph closes the beat: every node that writes filter/sort/search/view has an edge to `cursor=null`; only the pagination setter writes `cursor` directly. The graph is the structural fix in one picture, lifted from 11.1 Concept 5.

**Engagement.** The repair carries the recall. Confirm with a `MultipleChoice` round of four scenarios: "user clicks Next page", "user clears the search chip", "user changes the view tab from `active` to `archived`", "user opens the status dropdown but doesn't pick anything yet". The first three should bundle `cursor: null`, the last should not — the decoy is the dropdown-open, which doesn't write to the URL at all.

**Components.**
- `ReactCoding` (target-match mode) with the broken `toolbar.tsx` stub and the scripted scenario the student runs; criteria match the corrected setter calls. Alternative: a `CodeReview` exercise on the same stub with five planted setters missing the bundle, AI-graded against the canonical kernel phrase per setter. The `WrongByDefaultListSandbox` from 11.1 Concept 5 is the closest existing pre-built shape; this chapter doesn't earn a new bespoke variant, so prefer the `ReactCoding` or `CodeReview` framing.
- Mermaid state graph for the invariant.
- `MultipleChoice` for the four-scenario confirmation.

**Project link.** This concept *is* lesson 11.3.3's mid-build sharp edge — the student writes the seven setters with the bundle structurally, and the verify lesson rehearses the cursor-reset clause.

---

## Concept 5 — Typed-vs-committed search, active-filter chips, cursor pagination

**Why it's hard.** Three interactions land in one toolbar and each carries a sharp edge the project keyboard exposes. (1) The search box's typed-vs-committed split (11.1 Concept 6, lifted to actual code) — the input's `value` lives in `useState`, the URL write is driven by `useDeferredValue` + `useTransition`, the `nuqs` parser carries `throttleMs: 200`. The student who skips any of the three pieces ships a janky input, a history-spam back button, or a server re-render per keystroke. (2) Active-filter chips render *what the URL says* — a small Server Component reads `parsed`, emits chips, each chip's "x" is a Client `<ClearChip param="status" />` that calls `setQueryStates({ status: null, cursor: null })`. The chips and the toolbar inputs must agree because both read from the same URL; the bug is rendering chips from the toolbar's local state and watching them drift. (3) Cursor pagination is "next-only" — the senior call to ship the simpler shape over a doubly-linked prev/next is named explicitly, and the `pageSize + 1` next-extra-row trick from 11.1 Concept 8 carries forward. Together the three pieces are *the canonical toolbar surface* the student writes in 11.3.3.

**Ideal teaching artifact.** Pattern archetype delivered as a **three-beat walkthrough** with an `AnnotatedCode` block per beat, paired with a single rendered toolbar mockup the beats annotate in place. Beat 1: the search input — annotated lines showing `typed` in `useState`, `deferred = useDeferredValue(typed)`, the `useEffect` (or direct call) inside `startTransition` that writes `deferred` to `setQueryStates({ q: deferred, cursor: null })`, the parser's `throttleMs: 200`. Each line labeled for *which guarantee comes from which piece* (React keeps the input responsive, `nuqs` keeps the URL writes sane). Beat 2: the active-filter chip strip — a small Server Component reading `parsed` and emitting `<Chip key="status" label="Status: Paid" />`, the `<ClearChip>` Client Component, the `setQueryStates({ status: null, cursor: null })` bundle. Beat 3: the pagination row — `useQueryState('cursor')`, the `nextCursor` and `hasPrev` props from the server, the Next button's `setCursor(nextCursor)`, the "Previous clears to first page" senior call named explicitly. Beside the three beats, a single hand-SVG of the rendered toolbar with arrows pointing at each beat's piece — the visual is the toolbar one student writes in 11.3.3.

**Engagement.** A `PredictOutput` round on a six-character typing scenario ("acme c" with realistic timings) — the student predicts how many URL writes land under the wired rhythm (2-3, adaptive), how many history entries grow (1, the `replace` policy), and how many table re-renders fire on the server (matching the URL writes). The reveal walks the actual count and confirms the `useDeferredValue` + `throttleMs` rhythm.

**Components.**
- `AnnotatedCode` for the three beats (search, chips, pagination), each beat's annotations layered onto the same `toolbar.tsx` file.
- `Figure` wrapping a hand-SVG of the rendered toolbar with arrows pointing at each beat's piece.
- `PredictOutput` for the URL-write-count rehearsal.
- `Aside` (`tip`) below: "typed in the box, committed in the URL; chips read from the URL, never from local state; pagination is next-only by default."

**Project link.** This concept *is* lesson 11.3.3's largest build — the toolbar is the user-facing surface that proves the rest of the URL-state discipline.

---

## Concept 6 — `invoiceScope(orgId)` on top of `tenantDb`: defense in depth at the read

**Why it's hard.** The student arrives with two helpers installed (10.4's `tenantDb`, 11.2.2's `active() / archived() / includingDeleted()`) and now has to *compose them* so every read carries tenancy + lifecycle by construction. The instinct is to use one or the other — `tenantDb(orgId).invoices.findMany({ where: isNull(invoices.deletedAt) })` ("I'll just add the lifecycle filter inline") or `db.select().from(invoices).where(eq(invoices.organizationId, orgId))` ("the helper is too much ceremony for a quick refactor"). Both reflexes recreate the bug the helpers were designed to make structurally impossible: missing tenancy is the cross-tenant leak (10.4 Concept 4); missing lifecycle is the "edit a soft-deleted row" bug (11.2 Concept 2). The composition is the senior shape — `tenantDb(ctx.orgId).invoices.active()` returns a chainable builder pre-scoped to *both* predicates, and the call site never types either filter again.

**Ideal teaching artifact.** Pattern archetype delivered as a **wrong-then-right composition walkthrough** in `CodeVariants`. Tab 1 ("hand-rolled"): the existing 7.6 `listInvoices` body — `db.select().from(invoices).where(eq(invoices.organizationId, orgId))` plus inline `isNull(invoices.deletedAt)` and `isNull(invoices.archivedAt)` per branch — annotated as three places where a missing filter on a refactor leaks (cross-tenant, edits-soft-deleted, surfaces-archived-on-active). Tab 2 ("scoped"): the same query refactored through `tenantDb(ctx.orgId).invoices.active() / .archived() / .includingDeleted()` — the three lifecycle predicates *and* the tenancy predicate land in the same `where` by construction, the call site never types either. A second beat — an `AnnotatedCode` walkthrough of `scoped-query.ts` itself: the `invoiceScope(orgId)` factory, the three method definitions (`active()`, `archived()`, `includingDeleted()`), the exported `activeFilter` and `archivedFilter` `sql` fragments for hand-written joins, the composition with `tenantDb` showing the predicates merge in one `where`. Each annotation names which structural defense the line installs.

**Engagement.** A `DrizzleCoding` exercise running against a seeded two-org PGlite database with one archived row, one soft-deleted row, and a duplicate `INV-0001` across the soft-deleted and a new row. The student writes four queries: (1) `tenantDb(orgA).invoices.active().findMany({})` — returns active rows for org A only; (2) `tenantDb(orgA).invoices.archived().findMany({})` — returns the archived row for org A; (3) `tenantDb(orgA).invoices.includingDeleted().findMany({ where: ... })` — returns the soft-deleted row plus actives; (4) the hand-rolled equivalent `db.select().from(invoices).where(eq(invoices.organizationId, orgA))` — returns *all four rows including soft-deleted and archived*, demonstrating the missing filter leak the helper prevents. Each query's result row count tells the student which defense is firing.

**Components.**
- `CodeVariants` for the hand-rolled vs. scoped tab comparison.
- `AnnotatedCode` for the `scoped-query.ts` authoring walk.
- `DrizzleCoding` with the four-query progression.
- `Aside` (`caution`) below: "hand-writing `.from(invoices).where(eq(orgId, ...))` is a code-review red flag. The scoped helper is the only way reads touch the table."

**Project link.** This concept *is* lesson 11.3.4's foundation — every action and every read after this composition is built on it.

---

## Concept 7 — `view=all` is RBAC-gated at the read, not at the toolbar hide

**Why it's hard.** The natural reflex is to conditionally render the `view=all` tab in the toolbar based on `ctx.role === 'admin'` and call it done. The toolbar hide is *not wrong* — it's a UX hygiene layer — but it's not the load-bearing defense. A member who hand-types `?view=all` reaches the page; the load-bearing refusal lives at the read, where `listInvoices` checks the role and silently drops `view=all` to `view=active` for non-admins. This is the 10.4 Concept 5 stance lifted to a list view: the inspector renders the tab for everyone deliberately, and the student observes the server-side refusal firing. The student who only hides the tab in the toolbar ships defense-in-one-layer, not defense-in-depth.

**Ideal teaching artifact.** Decision archetype delivered as a **two-attack thought experiment** beside the page boundary code. Left panel: a `Figure`-wrapped UI mockup of the toolbar with the `view=all` tab hidden for the member role; an "attack arrow" labeled "member opens DevTools, edits the `Select`'s options to include `all`, picks it, hits submit". Right panel: the same UI with the tab visible (the inspector shape); a different "attack arrow" labeled "member hand-types `/invoices?view=all`". In both panels, the same outcome — the URL reaches the page, the page reads `parsed.view`, the page's role check fires before `listInvoices` runs. Below both, an `AnnotatedCode` walkthrough of the page-boundary lines: `const view = ctx.role === 'admin' ? parsed.view : (parsed.view === 'all' ? 'active' : parsed.view)` — three annotations on which case fires when, and why the gate lives at the page boundary rather than inside `listInvoices` (the helper stays single-responsibility; the page knows the role).

**Engagement.** A `MultipleChoice` round of three: (a) "a member hand-types `?view=all`. What does the page render?" → the active rows (the server drops `view=all` to `view=active`); (b) "an admin types `?view=all`. What does the page render?" → all rows including soft-deleted, with a Deleted badge; (c) "the toolbar hides the tab for members. Without the page-boundary gate, what's the failure mode?" → a member who hand-types `?view=all` reaches soft-deleted rows; the UI hide is hygiene, the page gate is defense.

**Components.**
- `Figure` wrapping a two-panel hand-SVG (toolbar-hide vs. tab-visible mockup with attack arrows).
- `AnnotatedCode` for the page-boundary gate lines.
- `MultipleChoice` for the three-scenario recall.
- `Aside` (`note`) below: "UI hide is hygiene; the page-boundary gate is the defense. The inspector renders the tab deliberately so the verify lesson observes the refusal firing."

**Project link.** This concept *is* lesson 11.3.4's RBAC beat — the student writes the page-boundary gate and the verify lesson rehearses the hand-typed-URL probe.

---

## Concept 8 — Lifecycle actions: zero rows affected is the honest 409, audit in the same tx

**Why it's hard.** Four structural pieces converge on the three lifecycle actions (archive, restore, soft-delete) and the student has to land all four together or the actions ship subtly wrong. (1) Every UPDATE carries *three* preconditions in its `WHERE` — tenancy (`organizationId = ctx.orgId`), lifecycle (`deletedAt IS NULL AND archivedAt IS NULL` for archive; the inverse for restore), and version (`version = clientVersion`). Missing any one is a distinct bug class. (2) The UPDATE's `.returning()` decides the branch — one row means success, zero rows means 409. There's no second `SELECT` to "check whether it worked"; the atomic statement is the source of truth (the TOCTOU avoidance from 11.2 Concept 3). (3) The 409 fetches `current` *inside the same Server Action* before returning — one round trip, not two. (4) The audit-log write runs inside the same `db.transaction` as the lifecycle UPDATE — if the audit insert fails, the lifecycle UPDATE rolls back; if the lifecycle UPDATE fails, the audit row never exists (the 10.4 Concept 8 discipline lifted). The student who stitches these wrong ships actions that *look* right and pass single-user tests but break under concurrency, audit gaps, or cross-tenant probes.

**Ideal teaching artifact.** Pattern archetype delivered as a **five-seam stencil walkthrough** in `AnnotatedCode`, lifting the 7.6 Concept 4 five-seam shape and applying it three times in one block with the lifecycle substitutions called out per seam. The student sees `archiveInvoice` laid out in five labeled regions: (1) `authedAction('member', z.strictObject({ id, version }), ...)` — parse + authorize in one wrapper; (2) `db.transaction(async (tx) => { ... })` — the tx envelope that holds both writes; (3) the UPDATE with the three-precondition `WHERE` — tenancy + lifecycle (`archivedAt IS NULL AND deletedAt IS NULL`) + version, the `SET` clause bumping `archivedAt`, `version + 1`, `updatedAt`, the `.returning()` capturing zero-or-one rows; (4) branch on `result.length` — one row → `logAudit(tx, { action: 'invoice.archive', subjectId, payload: {} })` then `return { ok: true, data: row }`; zero rows → `const current = await tx.select().from(invoices).where(...)` (the same-tx fetch) then `return { ok: false, error: { code: 'conflict', current } }`; (5) the transaction commits, the action returns. Below, two parallel stencils for `restoreInvoice` and `softDeleteInvoice` showing the *same five seams* with substitutions: restore's lifecycle predicate flips (`archivedAt IS NOT NULL OR deletedAt IS NOT NULL`), the SET clears whichever timestamp is set; soft-delete's wrapper is `authedAction('admin', ...)` (admin-gated), the SET sets `deletedAt = NOW()`. The visual is the *same shape three times* — the student feels the structural sameness and the per-action substitutions in one walk.

**Engagement.** A `CodeReview` exercise on a PR diff adding the three lifecycle actions with four planted issues across them: (1) `archiveInvoice` writes `logAudit(db, ...)` instead of `logAudit(tx, ...)` — the audit row commits independently; the lifecycle UPDATE could roll back leaving an orphan audit; (2) `restoreInvoice` reads the current row with `SELECT` first, then UPDATEs by id only — the TOCTOU race plus missing precondition; (3) `softDeleteInvoice` uses `authedAction('member', ...)` — admin-gating dropped; (4) the 409 branch on `archiveInvoice` returns `{ ok: false, error: { code: 'conflict' } }` *without* the `current` payload — the client has to refetch. The student leaves an inline comment per issue. AI grades each against a kernel rubric phrase.

**Components.**
- `AnnotatedCode` for the five-seam stencil walked three times (archive / restore / soft-delete) with substitutions per seam.
- `CodeReview` for the four-issue PR diff.
- `Aside` (`caution`) below: "every UPDATE carries tenancy + lifecycle + version in the `WHERE`. The audit-log write rides inside the same `tx`. Zero rows affected is the honest 409, with `current` in the same trip."

**Project link.** This concept *is* lesson 11.3.4's action build — the three lifecycle actions all ride this stencil and lesson 11.3.5 layers the same shape onto `updateInvoice`.

---

## Concept 9 — Refresh-and-retry: the conflict banner, `current` payload, and `useOptimistic` auto-rollback

**Why it's hard.** The 409 fires structurally (Concept 8 made it impossible to ship the update without it), but the client UX is where the student stitches together three React 19 primitives and a payload-shape decision in one form. (1) `useActionState` returns the Result; the conflict branch is a typed `error.code === 'conflict'` with the `current` payload from the server (no second round trip — the senior anchor from 11.2.3). (2) `useOptimistic` auto-rolls back on `{ ok: false }` — the documented React 19 behavior the student can lean on, not a hand-coded rollback. (3) The `<ConflictBanner>` reads `current` and renders two affordances: "Use latest" replaces the form's controlled state with `current` and resets the hidden `version`; "Overwrite anyway" is admin-gated and posts the action with a `force: true` flag that bypasses the precondition — the rare carve-out, named loud. (4) Lifecycle actions (archive, restore, soft-delete) surface the same 409 differently: row-action menu items don't have a controlled form to merge against, so the failure surfaces as a toast with a refresh hint rather than the full banner. The student needs to feel the *common server shape* (every action returns the conflict Result) and the *per-context client UX* (banner for forms, toast for row actions).

**Ideal teaching artifact.** Concept archetype delivered as a **two-tab scrubbable timeline** plus a paired component walkthrough. Tab 1 (the form banner): a `DiagramSequence` walking five frames of the two-tab edit race — t=0 both tabs show invoice with `version: 4`; t=1 tab A edits and submits, server UPDATE matches `version=4`, returns `{ ok: true, data: { ..., version: 5 } }`; t=2 tab B edits and submits, server UPDATE fails to match (current is `version=5`), zero rows returned, server fetches current, returns `{ ok: false, error: { code: 'conflict', current: { ..., version: 5 } } }`; t=3 tab B's `useOptimistic` auto-rolls back, `useActionState` surfaces the conflict, the `<ConflictBanner>` renders with `current` rendered as diff against tab B's form values; t=4 tab B clicks "Use latest", the controlled state plus the hidden `version` reset to `current`, the banner clears, the resubmit succeeds. Each frame annotates which primitive carries which piece (UPDATE-RETURNING is the source of truth; `useActionState` carries the surface; `useOptimistic` carries the rollback; the `current` payload spares the refetch). Tab 2 (the row-action toast): a shorter two-frame sequence showing a row-action archive returning the same conflict shape, the toolbar rendering a toast "This invoice changed elsewhere — refresh to retry", the row not optimistically removed because the optimistic state was never set. Below both tabs, an `AnnotatedCode` walkthrough of `edit-form.tsx` — the hidden `version` field, the `useActionState` reducer typing the conflict branch, the `<ConflictBanner>` component's "Use latest" and "Overwrite anyway" handlers with the admin gate on the latter.

**Engagement.** A `Sequence` exercise: the student orders the eight steps of a two-tab edit race ending in a successful retry — tab A submits → server UPDATE returns 1 row → server returns `ok: true` → tab B submits → server UPDATE returns 0 rows → server fetches `current` → server returns `ok: false` with conflict + current → `useOptimistic` rolls back → banner renders → "Use latest" resets state → resubmit → server UPDATE returns 1 row → `ok: true`. Two decoy steps in the pool: "client refetches the invoice" (no — `current` came in the same trip) and "developer writes manual rollback" (no — `useOptimistic` auto-rolls back).

**Components.**
- `DiagramSequence` (Tab 1) with five hand-SVG frames inside `Figure` wrappers, one per timestamp.
- `DiagramSequence` (Tab 2) with two frames for the row-action toast variant.
- `TabbedContent` wrapping the two sequences.
- `AnnotatedCode` for the `edit-form.tsx` walkthrough.
- `Sequence` for the eight-step race ordering.
- `Aside` (`tip`) below: "`useOptimistic` rolls back automatically on `{ ok: false }`. The `current` payload spares the refetch. The banner is for the form; the toast is for row actions."

**Project link.** This concept *is* lesson 11.3.5's build — the banner, the form wiring, and the lifecycle-action toasts all land here and the verify lesson rehearses the two-tab race.

---

## Concept 10 — Verify is the rehearsal of the failure modes you just made impossible

**Why it's hard.** Verify lessons in prior projects (6.6, 7.6, 10.4) installed the posture that verification is *not* "run the app, click around, looks fine" — it's clause-by-clause re-running of each failure mode the chapter's disciplines were designed to prevent, with explicit attention to what *would* break without the discipline. In 11.3 the verification surface is wide (URL share-and-refresh, cursor reset on filter/sort/search, search responsiveness, archive/restore, soft-delete with RBAC, partial-unique-index recovery, two-tab 409, optimistic rollback, cross-tenant probe, index plan) and the student who treats it as "happy-path walkthrough" misses the point. Each clause exists because a corresponding production failure mode exists; the verify run is the rehearsal of *which discipline catches which failure*.

**Ideal teaching artifact.** Reference archetype delivered as a **clause-by-clause verify checklist** rendered as a single rich table inside `Figure`, mapping each "Done when" clause to the failure mode it prevents, the discipline that installs the prevention, and the inspector probe that exercises it. Rows: "URL captures every view-state piece → refresh wipes filters → URL is source of truth (Concept 3) → toolbar interaction + URL bar inspection"; "Cursor reset on filter change → duplicate/missing rows on page 2 after sort change → bundled `cursor: null` (Concept 4) → filter then paginate then re-filter scenario"; "Search responsive while URL throttled → janky input or history spam → `useDeferredValue` + `throttleMs` (Concept 5) → fast-type 30 chars, count history entries"; "Archive moves rows between tabs → archived rows leak into active list → scoped helper (Concept 6) → archive then switch tabs"; "Member can't reach `view=all` → cross-RBAC list view → page-boundary gate (Concept 7) → hand-type `?view=all` as member"; "Two-tab edit returns 409 with current → silent last-write-wins → version precondition + same-tx `current` fetch (Concept 8 + 9) → inspector's force-drift + real two-tab race"; "Partial unique index allows soft-deleted INV recovery → can't recreate after deletion → partial unique index from 11.2 schema → drop index, retry, restore index"; "Optimistic rollback fires on action failure → stuck optimistic state → `useOptimistic` auto-rollback (Concept 9) → inspector's force-drift on submit"; "Cross-tenant probe returns 404 → cross-tenant overwrite → `tenantDb` + scoped helper (Concept 6) → forge an invoice ID from org B as user in org A". Below the table, two forward-link callouts: Unit 14 (notifications wires real-time on archive/restore), Unit 15.2 (`cacheTag('invoices', orgId)` invalidation), Unit 19.3 (integration tests for the conflict path).

**Engagement.** A `Matching` drill: nine "Done when" clauses on the left, nine failure modes they prevent on the right ("share-and-refresh holds" ↔ "filters in component state wipe on refresh"; "two-tab edit returns 409" ↔ "silent last-write-wins"; "cursor reset on sort change" ↔ "page 2 shows duplicate row after sort change"; "member sees only active and archived tabs" ↔ "member reads soft-deleted rows"; "partial unique index allows re-creating INV-0001" ↔ "soft-deleted row's number is permanently burned"; "audit log shows archive event" ↔ "compliance gap: lifecycle change with no record"; "optimistic UI rolls back on 409" ↔ "stale optimistic state after conflict"; "search input stays responsive" ↔ "input lag or 30 history entries per query"; "cross-tenant probe 404s" ↔ "tenant overwrite by ID guessing"). Each match locks the discipline-to-failure pairing the verify run rehearses.

**Components.**
- `Figure` wrapping a hand-coded HTML clause-discipline-probe table — single-use static, the same shape prior project chapters use for verify maps.
- `Matching` for the nine-clause-to-failure-mode drill.
- `LinkCard`s for the three forward-link callouts (Unit 14, Unit 15.2, Unit 19.3).
- `Aside` (`note`) below: "verify is the rehearsal of which discipline catches which failure. The Done-when clauses exist because the failure modes exist; running them is how you confirm the disciplines hold."

**Project link.** This concept *is* lesson 11.3.6 — the verify lesson walks the table top to bottom and the student leaves able to articulate every clause-to-discipline pairing.

---

## Component proposals

None. Every concept maps onto existing components, with hand-authored SVG inside `Figure` carrying the bespoke visuals (cuts-and-carries panel, file-tree annotation, source-of-truth chain, attack-arrow mockups, rendered-toolbar overlay, verify table). The chapter is decision- and pattern-heavy rather than mechanics-heavy: the existing `AnnotatedCode`, `CodeVariants`, `CodeReview`, `DrizzleCoding`, `ReactCoding`, `DiagramSequence`, `TabbedContent`, `Dropdowns`, `Sequence`, `MultipleChoice`, `Matching`, `Buckets`, `PredictOutput` set covers every assessment beat. Concept 4's cursor-reset repair would benefit from the `WrongByDefaultListSandbox` proposed in 11.1 Concept 5 *if it ships*; falling back to `ReactCoding` (target-match) or `CodeReview` carries the same teaching beat without earning a second bespoke component here.

## Build priority

Skipped — no new components proposed.

## Open pedagogical questions

- Concept 4's wrong-by-default repair leans on `ReactCoding` (target-match) running a toolbar with seven setters against a scripted scenario. The `WrongByDefaultListSandbox` proposed in 11.1 Concept 5 is the natural fit, *if* it gets built; this chapter's cursor-reset beat is one of its forward-link uses. If the sandbox doesn't ship, confirm the `ReactCoding` target-match shape can express the scripted scenario plus the visible bug (mixed rows from two tabs).
- Concept 6's `DrizzleCoding` four-query progression needs the seeded two-org PGlite DB to include one archived row, one soft-deleted row, and a duplicate `INV-0001` across the two — same harness shape as 10.4 Concept 14's cross-tenant probe. Confirm the existing `DrizzleCoding` component can express the row-count grading criteria across four queries in one exercise.
- Concept 9's `DiagramSequence` with five frames per tab inside a `TabbedContent` is a heavier visual budget than other concepts. If the tabbed structure feels redundant against the five-frame sequence, the row-action toast variant could collapse into a single Aside callout below the main banner sequence — confirm the visual budget against authoring time.
