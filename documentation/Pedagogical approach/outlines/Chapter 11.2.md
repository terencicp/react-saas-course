## Concept 1 — Three lifecycle shapes, one column choice

**Why it's hard.** Students arrive equating "delete" with "remove from the database". The chapter's first job is to split that single verb into three distinct product contracts — invisible recovery (soft delete), explicit lifecycle state (archive), and irreversible removal (hard delete) — and to make the choice feel like a senior decision per entity, not a default applied everywhere.

**Ideal teaching artifact.** A split-pane *Decision* exhibit. Left pane: a list-view UI rendering one row labeled "Acme invoice". Right pane: a faux DB inspector showing the row's columns. The student steps through three short scenarios via a scrubbable sequence — "User clicks Delete (soft)", "User clicks Archive", "Admin clicks Permanent delete" — and in each step the UI pane and the DB pane update in lockstep. The point that lands physically: in scenario 1 the row disappears from the UI while the DB row stays (with `deletedAt` set); in scenario 2 the row moves to an "Archived" tab the user can see; in scenario 3 both panes lose the row. The artifact teaches the *contract* difference, not the schema.

**Engagement.** A bucket sort: ten realistic SaaS entities (invoice, password-reset token, project, draft autosave, customer record, session row, comment, support ticket, audit-log row, user avatar) get sorted into {soft-delete default, archive as primary user surface, hard-delete default}. Each wrong drop surfaces a misread contract.

**Components.**
- Artifact: `DiagramSequence` with three steps, each step a hand-coded SVG inside a `Figure` showing the UI pane and the DB inspector pane side by side. Hand-SVG keeps the timestamps and the row state legible without a bespoke widget.
- Engagement: `Buckets` with three columns and the entity cards above.

**Project link.** Chapter 11.3.2's seed script pre-populates archived and soft-deleted invoice rows; the student arrives at the project already knowing why both states exist and which UI tab each belongs to.

---

## Concept 2 — The two-timestamp schema and the three actions that drive it

**Why it's hard.** Once the contract is named, the schema looks deceptively flat — two nullable timestamps. The trap is missing what each action actually writes: `restore` clears whichever timestamp is set, every action bumps `updatedAt` and `version`, and a row can be both archived and soft-deleted simultaneously. Students who don't see the state machine end up writing actions that forget to clear the right column or skip the version bump.

**Ideal teaching artifact.** A four-step *Mechanics* sequence walking a single invoice row through the lifecycle. Step 1: row is active, only `createdAt` and `updatedAt` are set. Step 2: archive fires — `archivedAt` lights up, `updatedAt` and `version` bump. Step 3: restore fires from archived — `archivedAt` clears, `updatedAt` and `version` bump again. Step 4: soft-delete fires — `deletedAt` lights up while a leftover hypothetical `archivedAt` could still be set, illustrating the both-flags case. Each step shows the column values for the row and the one-line Drizzle UPDATE that produced the transition. The artifact's value is *seeing* the column movements as Server Actions fire; the state machine becomes concrete instead of an abstraction.

**Engagement.** A short `Sequence` drill: given a row that is both archived and soft-deleted, order the column writes inside a single `restore` UPDATE statement (clear `archivedAt`, clear `deletedAt`, set `updatedAt = NOW()`, set `version = version + 1`). The ordering itself doesn't matter at the SQL level — the test is that the student names all four writes without forgetting `version`.

**Components.**
- Artifact: `DiagramSequence` with four steps; each step is a `Figure` containing a hand-SVG row-with-columns visualization plus an adjacent `Code` block with the UPDATE statement. No bespoke component needed — the column-state visual is small and static per step.
- Engagement: `Sequence` with the four column writes as draggable items.
- Alternative if reuse materializes: a `RowStateWidget` (see proposals) that replaces the static sequence with a clickable row whose timestamps animate in response to Archive/Restore/Delete buttons.

**Project link.** Chapter 11.3.4 ships `archiveInvoice`, `restoreInvoice`, and `softDeleteInvoice` against this exact column shape; the student already knows what each one writes before they read the starter stub.

---

## Concept 3 — Partial unique indexes survive soft delete

**Why it's hard.** This is the canonical soft-delete bug after missing filters: a `unique(orgId, slug)` constraint blocks the user from re-creating "Acme" because the soft-deleted row still owns the slug. Students read the migration, agree it looks correct, ship it, then hit the bug in week two of production. The misconception is structural — they don't see the soft-deleted row as participating in uniqueness — and prose alone doesn't dislodge it.

**Ideal teaching artifact.** A wrong-by-default *Pattern* sandbox. The student is dropped into a SQL exercise with a `projects` table that has a plain `UNIQUE(org_id, slug)` constraint and a seeded row for `('acme-org', 'acme')` whose `deleted_at` is already set. The exercise: insert a fresh `('acme-org', 'acme')` row. The insert fails with the unique-constraint violation. The student then rewrites the constraint as `CREATE UNIQUE INDEX ... ON projects (org_id, slug) WHERE deleted_at IS NULL`, runs the insert again, and watches it succeed. The failure mode is felt physically — the error message names the row that should be invisible.

**Engagement.** The exercise carries the assessment — the student cannot move on without producing a passing INSERT against the fixed schema. A short `MultipleChoice` confirms recall: "Which of these constraints needs a partial clause after adding soft-delete?" with options covering unique constraints, foreign keys, NOT NULL, and check constraints.

**Components.**
- Artifact: `SQLCoding` seeded with the soft-deleted "Acme" row and the failing unique constraint; criterion checks the partial-index DDL and the successful INSERT.
- Engagement confirm: `MultipleChoice` on constraint types.

**Project link.** Chapter 11.3.2's schema already carries the partial unique index; the student recognizes it as load-bearing rather than decorative.

---

## Concept 4 — Cascades belong in the application, not the foreign key

**Why it's hard.** The senior trap is the comfortable assumption: "I added `ON DELETE CASCADE`, the children handle themselves". Soft delete doesn't fire it — no DELETE happened. The result is orphaned child rows visible in the UI after the parent vanishes from every list. The misconception runs deep because the student already learned FK cascades in Unit 6 and trusts them; this concept has to unteach the reflex for the soft-delete path specifically.

**Ideal teaching artifact.** A side-by-side *Pattern* comparison diagram. Left column: hard-delete cascade — parent row hard-deleted, FK cascade fires, children gone, both panes show the same final state. Right column: soft-delete without transaction — parent row has `deletedAt` set, FK cascade silent, children still active, the UI for the children's list still shows them with a now-orphaned parent reference. Beneath the diagram, the two Server Action code shapes: the broken version (single UPDATE on parent, relying on FK), and the corrected version (a `db.transaction` wrapping parent and children UPDATEs together). The student sees the orphan as a concrete UI state, not an abstract concern.

**Engagement.** A `Buckets` sort places six action scenarios into {database-level cascade fires, application-level transaction required, neither — hard delete on standalone table}. Scenarios cover hard-deleting a tenant, soft-deleting a project with line items, soft-deleting a comment with no children, hard-deleting a session row, soft-deleting a customer with invoices, and restoring an invoice with line items. The bucket assignments reveal whether the student internalized that soft delete and cascade are orthogonal.

**Components.**
- Artifact: `Figure` wrapping a hand-SVG two-column diagram (rows, FK arrows, "ghost" indicators on the orphaned children); paired with a `CodeVariants` block showing the broken vs. transactional Server Action.
- Engagement: `Buckets` with three columns and six scenario cards.

**Project link.** Chapter 11.3.4's `archiveInvoice` action wraps its line-item updates in a `db.transaction`; the student arrives knowing why the wrapper exists, not just that it does.

---

## Concept 5 — Make the missing filter physically impossible

**Why it's hard.** Every read across the app must filter `deletedAt IS NULL`. Code review fails at scale because the omission looks correct. The student needs to feel — in their fingers, not their head — that *adding the helper makes the wrong shape harder to write*, not that the helper is convenient sugar. The lesson lives or dies on whether the student leaves believing the helper is structural defense rather than aesthetic preference.

**Ideal teaching artifact.** A guided-repair *Pattern* exercise. The student is given a Server Component fetching invoices for a list view, written the obvious way: `db.select().from(invoices).where(eq(invoices.orgId, orgId))`. The seeded DB carries five active invoices, two archived, and three soft-deleted. The student runs the query and sees all ten rows return. The exercise asks them to rewrite the query through `tenantDb(orgId).invoices.active()` — the helper is provided as a built-in import. The rewritten query returns five rows. The student then writes the archived-tab variant using `.archived()`. The progression — leak, fix, second variant — drives home that the helper is one source of truth for two filters that previously had to be remembered twice.

**Engagement.** The DrizzleCoding exercise carries the assessment. A follow-up `MultipleChoice` confirms recall: given the three-method API, which method is correct for the admin "deleted items" recovery view, and what role gating must accompany it.

**Components.**
- Artifact: `DrizzleCoding` with the seeded mixed-state invoices and a provided stub of `tenantDb(orgId).invoices` exposing `active()`, `archived()`, `includingDeleted()`. Two criteria: the active-list query returns five rows; the archived-tab query returns two.
- Engagement confirm: `MultipleChoice` on which method to call and the RBAC pairing.

**Project link.** Chapter 11.3.4 has the student write the `invoiceScope(orgId)` factory themselves; this concept's exercise primed the API shape and the rationale.

---

## Concept 6 — Optimistic concurrency and the version precondition

**Why it's hard.** The race is fundamentally a *timing* phenomenon — two reads, two edits, two writes, in an order that produces a silent overwrite. Static prose can describe the race but cannot show it. Students who read about it nod, then write naive UPDATEs anyway because the failure is invisible until a customer complains. The lesson has to make the timing felt: the student must see Tab A's edits disappear without the precondition, then see the same flow rejected as a 409 with the precondition in place.

**Ideal teaching artifact.** A two-client timeline simulator. The page shows two stacked panels labeled "Tab A" and "Tab B", each rendering the same invoice with editable fields and a Save button. A third "Server" panel shows the row's current state including the `version` column. The student plays through a script: A reads (version 7), B reads (version 7), A edits "Total" and saves (server version 8, A's UI now reflects 8), B edits "Notes" and saves. A toggle at the top — "version precondition" on/off — controls whether B's UPDATE includes `WHERE version = 7`. With it off, B's save lands silently and A's "Total" edit is gone. With it on, B's save returns a 409, and the simulator shows B's UI flipping into a conflict state with A's `Total` value highlighted. The student replays the script as many times as they need; the precondition's effect is visible, not asserted.

A second beat: a static *Mechanics* breakdown of the Drizzle UPDATE shape — the `WHERE` carrying tenancy, lifecycle, *and* version; the `SET` bumping `version` and `updatedAt` in the same statement; the `.returning()` clause producing zero rows on conflict. The simulator establishes *why*; the breakdown establishes *exactly what to type*.

**Engagement.** A `Sequence` drill orders the SQL clauses of a winning vs. losing UPDATE — `WHERE id`, `WHERE org_id`, `WHERE version`, `WHERE deleted_at IS NULL`, `SET version = version + 1`, `SET updated_at = NOW()`, `RETURNING *`. The student arranges them and labels which clauses cause the zero-rows outcome on conflict.

**Components.**
- Artifact (primary beat): new `TwoClientRaceSimulator` (see proposals) — two panels each rendering an editable row, a server panel showing canonical state and version, a precondition toggle, and Save buttons that step the simulation. The race phenomenon is core to this concept and recurs at least conceptually in Unit 12 (out-of-order webhook delivery) and Unit 13 (background-job-vs-request races); the component compounds.
- Artifact (second beat): `AnnotatedCode` walking the Drizzle UPDATE statement clause by clause.
- Engagement: `Sequence` with the SQL clauses.

**Project link.** Chapter 11.3.5 wires the version precondition into `updateInvoice`; the simulator gave the student the mental model the UPDATE encodes.

---

## Concept 7 — The 409 Result and React 19's refresh-and-retry surface

**Why it's hard.** The Server Action returning `{ ok: false, error: { code: 'CONFLICT', current } }` is half the story. The other half is the form's state machine — which has a new *conflict* transition that students who learned the idle → submitting → success/error shape in Unit 2 haven't met yet. The "Use latest" button replaces the form's controlled state with `current`; the "Overwrite anyway" path is a deliberately sharp affordance. Optimistic UI rollback compounds the surprise: `useOptimistic` drops the optimistic value automatically, and the conflict banner renders against the user's *original* input, not the optimistic one. Students who don't trace the data flow write conflict UIs that lose the user's edits.

**Ideal teaching artifact.** An *Annotated Mechanics* walkthrough of a real edit-form Client Component. The form is the chapter's canonical shape — controlled inputs, hidden `version` field, `useActionState` wrapping the update action, `useOptimistic` wrapping the row state. The student steps through the annotated code in four highlighted regions: (1) the optimistic mutation on submit; (2) the `useActionState` branch on `{ ok: true }` swapping in the server's returned row; (3) the branch on `{ ok: false, error: { code: 'CONFLICT' } }` rendering the banner against `current`; (4) the "Use latest" handler resetting the form to `current` and the new `version`. Each region's annotation names what the user sees on screen at that moment, not just what the code does.

**Engagement.** A `ReactCoding` exercise hands the student the form with the conflict branch missing. The student wires the `ConflictBanner` to render `current.total` next to the user's local `total`, plus the "Use latest" button that calls the provided `applyLatest(current)` handler. The test checks that submitting a forced-conflict server stub renders the banner with the right values and that clicking "Use latest" updates the inputs.

**Components.**
- Artifact: `AnnotatedCode` on the form component, four steps mapped to the four regions.
- Engagement: `ReactCoding` in tests mode with a provided server-stub action that always returns a `CONFLICT` Result on the second submit.

**Project link.** Chapter 11.3.5 ships the production `<ConflictBanner>` in the invoice edit form; this concept's exercise is the rehearsal.

---

## Concept 8 — Knowing when last-write-wins is correct

**Why it's hard.** A version column on every entity is overcorrection. Some writes have no read-modify-write loop on the client (a counter incremented by `SET count = count + 1`, an append-only comment, a single-user toggle). Students who internalize the concurrency lesson too rigidly add version checks where they cost more than they prevent, complicating Server Actions for collisions that physically cannot occur. The decision is a threshold, not a rule.

**Ideal teaching artifact.** A short *Decision* table — three rows naming the carve-out shapes (single-user toggle, append-only writes, SQL-driven counter increment), each with a one-line "what makes this safe" and a one-line "the failure that would change the answer". The table sits beneath a single paragraph framing the threshold question: *does any client-side read inform this write?* If no, last-write-wins is correct. If yes, the version column earns its weight. The threshold is the lesson; the table is the calibration.

**Engagement.** A `Buckets` sort across realistic SaaS write paths: setting a user's "show archived" preference, posting a comment, incrementing a view counter, editing an invoice's line items, toggling a project's `is_pinned` field, updating a user's display name, appending to an audit log. Each gets dropped into {version column required, last-write-wins is fine}. The seven items cover the three carve-out shapes plus the canonical version-required cases; the sort is the assessment.

**Components.**
- Artifact: a plain prose paragraph and a Markdown table; no component needed.
- Engagement: `Buckets` with two columns and seven items.

**Project link.** Chapter 11.3.5 only adds the `version` precondition to the invoice edit path; the lifecycle actions (archive/restore/soft-delete) don't carry it because the user has no stale-read on those. The carve-out concept names *why* before the project shows the omission.

---

## Component proposals

- **`RowStateWidget`** — a small interactive row visualization. Inputs: a row schema (columns + initial values), a list of action buttons (`archive`, `restore`, `softDelete`, custom), and a mapping from each action to the column writes it performs. Shows the row's column values with timestamps that animate when an action fires.
  - **Uses in this chapter:** Concept 2 (alternative).
  - **Forward-links:** Plausible in Unit 17 (audit log displaying row history); not load-bearing elsewhere. Single-use in the strong sense.
  - **Leanest v1:** Plain HTML table with action buttons; no animation, just a re-render of the columns on click. Pedagogically equivalent to the static `DiagramSequence` proposed as primary; the widget only earns its weight if students need to explore the action ordering freely. Demote unless reuse materializes.

- **`TwoClientRaceSimulator`** — a two-pane (plus server pane) timeline simulator for read-modify-write races. Inputs: a row schema, an initial server state, a scripted timeline of read/edit/save events per client, and a "precondition" toggle controlling whether the simulated UPDATE includes the version check. Shows each client's local view, the server's canonical view, the version column, and the simulated SQL on each save.
  - **Uses in this chapter:** Concept 6 (primary).
  - **Forward-links:** Out-of-order webhook delivery (Chapter 12.1.3), background-job-vs-request races (Chapter 13.1), idempotency-key ledger conflicts (Chapter 12.1.2). The general shape — two actors operating on a shared resource with a visible server state — is the recurring teaching primitive for every race-condition lesson in Units 12 and 13.
  - **Leanest v1:** Two stacked panels with hardcoded "Read", "Edit", "Save" buttons per client; no general scripting API; server pane is a static `<pre>` showing the row JSON; the precondition toggle is a single boolean. Hardcoded to the invoice domain. Even this v1 carries the concept — the generalization is a Unit 12 concern.

## Build priority

`TwoClientRaceSimulator` is the priority build. It is the only proposed component that is load-bearing (Concept 6 fails without it — prose cannot show the timing phenomenon) and the only one with credible forward-links into Units 12 and 13. Ship v1 hardcoded to the invoice domain for this chapter; generalize when Chapter 12.1.3 (out-of-order webhook delivery) needs a second instance.

`RowStateWidget` should not be built. The static `DiagramSequence` carries Concept 2's teaching load; the widget's added interactivity is convenience, not pedagogy. If a future chapter (Unit 17 audit log) genuinely needs a column-history widget, revisit.

## Open pedagogical questions

- Concept 6's simulator is the chapter's most ambitious artifact and the highest single-component risk. If the build slips, the fallback is an `AnnotatedCode` walkthrough of two interleaved Server Action invocations with explicit timing annotations — viable, but the race becomes asserted rather than felt. The choice between building v1 and shipping the fallback affects how strongly Concept 6 lands.
- Concept 4's `Buckets` engagement names cascade scenarios from outside this chapter (hard-deleting a tenant, hard-deleting a session row). If those entities have not been modeled by Unit 11, the scenarios may need to be reframed against entities the student has already met (invoices, projects, line items). Worth verifying against the Unit 10/11 schemas before drafting the bucket items.
