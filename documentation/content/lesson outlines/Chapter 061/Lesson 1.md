# Lesson 1 — Two timestamps, three actions

- **Title (h1):** Two timestamps, three actions
- **Sidebar label:** Soft delete & archive

---

## Lesson framing

This is Lesson 1 of Chapter 061 (Soft delete, archive, and concurrency). It lays the lifecycle vocabulary and schema the rest of the chapter rides on. Three things, in order: the soft-delete-vs-archive distinction (the senior decision), the `deletedAt`/`archivedAt` schema with its partial indexes, and the `softDelete`/`archive`/`restore` Server Actions.

Pedagogical spine, decided in brainstorming:

- **Decision before syntax.** The lesson opens on the senior question — "user clicks Delete: what leaves the UI, what stays in the DB, what comes back?" — and resolves it conceptually *before* a single line of Drizzle. The schema and actions are the mechanical consequence of a product decision, not the lesson's center.
- **Two axes, taught separately, never conflated.** Students new to this collapse two orthogonal distinctions into one: (a) soft vs. hard delete (a *recovery/audit* mechanism — same UI, different storage) and (b) soft delete vs. archive (a *product/UX* contract — possibly same storage, different user-facing surface). Teach them as two separate decisions. This is the single most important conceptual takeaway; if the student leaves able to say "soft delete is invisible recovery, archive is a visible lifecycle state, and they can coexist," the lesson succeeded.
- **Course default named, not dogmatized.** The course picks *archive as the primary user surface, soft delete as the admin recovery surface, two timestamp columns*. Name the three real-world product shapes (archive-only, soft-only, both) so the choice is reasoned, then commit.
- **Mental model to land:** a row has a *lifecycle state* derived from two nullable timestamps; "delete" the user clicks is almost never `DELETE FROM`; every read is responsible for filtering — which is the pain that motivates Lesson 2.
- **Production stakes are real and concrete.** Three named failure modes carry the lesson: the slug-collision bug (re-create "Acme" after soft-deleting it → unique constraint blocks), the leaked-deleted-rows bug (a `count(*)` or join that forgot the filter), the orphaned-children bug (cascade soft-delete that wasn't transactional). These are the "day after launch" bugs the chapter framing promises.
- **Cognitive load management:** introduce hard delete first (the model they already have), then soft delete as "a write, not a delete," then archive as "soft delete the user can see." Schema before actions before indexes-as-hardening. Each layer is a small addition to the previous mental model.
- **Connect to prior knowledge constantly.** The Server Action `Result` shape (Ch 043), `tenantDb(orgId)` (Ch 056), the `authedAction` RBAC wrapper (Ch 057), the `parseAsBoolean`/`parseAsStringEnum` URL-state vocabulary (Ch 060), `db.transaction` (Ch 043), and Drizzle schema/`drizzle-zod` (Unit 5/6) are all *already known*. Restate their shape in one line at the call site; never re-teach them.
- **Forward pointers, lightly.** This lesson deliberately leaves two threads dangling for later lessons: the structural fix for the missing-filter problem (Lesson 2) and the `version`/409 concurrency mechanics (Lesson 3). Name them as "next lesson" once each, do not preview their solution.

Diagrams and exercises are load-bearing here: a state diagram of the lifecycle is the conceptual anchor, a `Buckets` drill checks the soft-vs-hard call, and a `DrizzleSchemaCoding` exercise lets the student feel the partial-unique-index fix fire against a real probe. Code is mostly `Code`/`AnnotatedCode`/`CodeVariants`; the actions are deliberately three lines each because the wrappers do the heavy lifting.

---

## Lesson sections

### Introduction (no header)

Open with the senior question, concretely. A user clicks **Delete invoice**. Three sub-questions: what vanishes from the screen, what survives in the database, and what (if anything) can come back? Then the second, *separate* scenario: a project is finished and the user wants it off their active list — but emphatically not gone. Is that the same column, the same action, the same button?

Land the thesis in two sentences: most "deletes" a SaaS user clicks are *writes*, not row removals; and "archive" and "delete" are two different promises to the user even when they look identical in the database. Preview the deliverable: by the end, the student has a two-timestamp schema and three Server Actions (`softDelete`, `archive`, `restore`) that drive the whole lifecycle. Keep it to ~4 sentences, adult tone, no celebration.

Reasoning: the pedagogical guidelines require the senior question implicit up front and a concrete motivating problem. The two-scenario framing seeds the two-axes distinction before any vocabulary.

### Soft delete versus hard delete

Teach the first axis: the recovery/storage decision.

- Hard delete: `DELETE FROM invoices WHERE id = …`. The row is gone, foreign keys cascade or block, recovery is from backup only. This is the model the student already has — name it briefly, don't belabor.
- Soft delete: `UPDATE invoices SET deleted_at = now() WHERE id = …`. The row stays; every read must now filter `deleted_at IS NULL`; an admin can clear the timestamp to restore; the audit trail survives. The one-liner that lands the mental model: **"soft delete is a write, not a delete."** Repeat this phrase — it pays off in the joins/counts subsection and in Lesson 2.
- The senior call (the *trigger*, per "trigger before tool"): soft-delete anything a user can re-reference or that has compliance shadows — invoices, projects, customers, comments. Hard-delete ephemera that no user re-references — session rows, password-reset tokens, draft autosaves, expired verification rows. Frame as a threshold, not a rule.

Code: a single `CodeVariants` with two tabs, **Hard delete** vs **Soft delete**, each ~3 lines of Drizzle (`db.delete(invoices).where(...)` vs `db.update(invoices).set({ deletedAt: sql\`now()\` }).where(...)`). First sentence of each tab states the consequence ("row is gone, backup-only recovery" / "row stays, every read must now filter it out"). Use `del=`/neutral marks lightly. Keep to the convention shape: `sql\`now()\`` for the timestamp, `tenantDb`-style call implied but the variant can show bare `db.update` for clarity here since the helper composition is taught a section later — note this simplification inline so downstream agents keep it deliberate.

Exercise: a `Buckets` drill, two buckets — **Soft delete** and **Hard delete** — with ~6 chips the student classifies (e.g. "A paid invoice", "A password-reset token", "A customer record", "An expired email-verification row", "A user's comment on a thread", "A draft autosave the user never named"). Grading is the obvious bucket match. Goal: rehearse the trigger, not memorize a list. Place it right after the senior-call paragraph.

Reasoning: this is axis one in isolation. The `Buckets` exercise is the right tool — it's a pure classification call, which is exactly what the senior trigger is. Leading with hard delete respects the student's existing model.

### Soft delete versus archive

Teach the second, orthogonal axis: the product/UX contract. This is the conceptual core of the lesson.

- Soft delete is **invisible**: the user clicks Delete, the row vanishes from every list, and only an admin (or a hidden "deleted items" view) ever sees it again. The restore path is not a normal user action.
- Archive is **explicit**: the user clicks Archive, the row moves to an "Archived" tab they can browse, and restore is a first-class user action. The user *expects* to find it again.
- The punchline: **often the same column shape** (`deletedAt` and `archivedAt` are both just nullable timestamps), but a **different promise to the user** and a **different UI affordance**. Same storage primitive, different product contract. This sentence is the load-bearing one — make it unmissable.
- The three product shapes, named so the course default is a reasoned pick:
  - Archive-only (e.g. Notion, Linear projects): every "remove" is really archive; there is no separate user-facing delete.
  - Soft-delete-only: one "Delete" button, admin-only restore, no archive concept.
  - Both: archive for "I'm done with this," soft delete for "I deleted this by mistake."
- The **course default**, stated plainly and committed to: *archive is the primary user surface; soft delete is the admin recovery surface*. Rationale in one line: it gives users a self-service lifecycle (archive/restore) while keeping a recovery net (soft delete) that doesn't clutter their UI.

Diagram: a lifecycle **state diagram** is the anchor for the whole lesson. Use Mermaid `stateDiagram-v2` (per diagrams INDEX: state machine → D2 top pick, Mermaid strong fallback; Mermaid chosen here for low-effort authoring and because it pairs naturally with a small 4-state graph), wrapped in `<Figure>`. States: `Active`, `Archived`, `Soft-deleted`, plus a terminal `Hard-deleted` (with a note that this is the rare gone-for-good transition). Transitions labeled with the action that fires them: `Active --archive--> Archived`, `Archived --restore--> Active`, `Active --delete(softDelete)--> Soft-deleted`, `Archived --delete--> Soft-deleted`, `Soft-deleted --restore--> Active`, `Soft-deleted --hard delete--> Hard-deleted`. Caption pins the mental model: the row's state is *derived from two timestamps*; the actions are the edges. Pedagogical goal: make "two timestamps, three actions" literally visible and show that archived-then-deleted is a legal path (deleted overrides). Keep height modest (horizontal `direction LR`).

Optionally, place the same lifecycle as a `StateMachineWalker` (`kind="machine"`) with the Mermaid diagram in the `diagram` slot — but only if the section needs the student to *interrogate* each state's UI contract (what button shows, who can act). Decision for the writer: prefer the static `<Figure>` state diagram for the conceptual anchor; reach for the walker only if the per-state UI-affordance detail (covered later in "The three UI affordances" section) reads better as an interactive walk. Do not build both; pick one. Default recommendation: static diagram here, and let the affordances section carry the UI detail in prose/table.

Exercise: a short `MultipleChoice` (or `TrueFalse` round) checking the distinction, e.g. "A user archives a project. Which is true?" with options separating the *storage* fact (timestamp set, row kept) from the *UX* fact (visible in an Archived tab, user can restore). Goal: verify the student didn't collapse the two axes. Place after the diagram.

Reasoning: the two-axes confusion is the documented beginner failure for this topic; the section is built entirely around preventing it. The state diagram earns its weight as the single image the rest of the lesson refers back to.

### The schema — two timestamps, in a shared helper

Land the schema decision and the Drizzle fragment.

- The decision: **two nullable timestamp columns** (`deletedAt`, `archivedAt`) over the alternative single `status` enum (`active`/`archived`/`deleted`) plus timestamps. Why two timestamps: simpler schema, self-documenting column names, the partial-index story is the same shape either way, and a row can be archived *then* deleted (both set; deleted is the effective state). Senior anchor: optimize for the query and the UI affordance, not for "look, one column." Name the enum alternative fairly in two sentences, then commit.
- Pair with `updatedAt` — it carries the audit trail and is the hook for the concurrency precondition in **Lesson 3** (name this forward pointer once, do not explain it).
- The **`lifecycleColumns` helper**: a small object of column definitions spread into every entity table, so the lifecycle shape is declared once and reused. This is the course's "use conventions, don't reinvent" principle applied at the schema layer. The shape:
  - `deletedAt: timestamp({ withTimezone: true })` (nullable)
  - `archivedAt: timestamp({ withTimezone: true })` (nullable)
  - `updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date())` — `$onUpdate` makes every Drizzle update bump the column. Fact-checked: this is the canonical Drizzle form, and `$onUpdate` is a **runtime/application-layer** value (it fires when *drizzle-orm* issues the UPDATE), not a database trigger and invisible to drizzle-kit — a raw SQL `UPDATE` outside Drizzle won't touch it. `new Date()` at the schema seam is the sanctioned `Date` carve-out (Drizzle boundary), not domain code. Worth a one-line note for the student since Lesson 3 leans on `updatedAt`.
- Show it spread into the `invoices` table: `...lifecycleColumns` inside the `pgTable` column object.

Code: `AnnotatedCode` on the combined fragment (the helper definition + the `invoices` table spreading it). Steps: (1) the two nullable timestamps and why nullable encodes "not in this state"; (2) `updatedAt` with the auto-touch and a one-line forward pointer to Lesson 3; (3) the spread into `invoices`, naming the convention. Keep ≤18 lines visible; ≤6 lines prose per step. Use `color="blue"` for the focus steps.

Convention notes for the writer: snake-case mapping is set on the Drizzle client (`casing: 'snake_case'`), so columns are declared `deletedAt` and stored `deleted_at` — show the camelCase TS form, mention the SQL name once. Use `timestamp({ withTimezone: true })` (maps to `timestamptz`) per the time/storage convention. The chapter outline writes `timestamp('deleted_at', {...})` with an explicit name; with client-level casing the explicit string name is redundant — prefer the casing-driven form and note this is the project convention. Do not introduce `Temporal` here — storage columns are `timestamptz` and the `Date`↔`Temporal` codec is an established seam the student already knows; keep the schema fragment focused.

Exercise: a `DrizzleSchemaCoding` exercise where the student adds the lifecycle columns to a starter `invoices`/`orgs` schema. `requirements`: `invoices` must have `deleted_at` and `archived_at` (type `timestamp`, nullable) and `updated_at` (notNull). Keep probes minimal here (column presence is enough); the *index* probe lands in the indexes section to keep cognitive load staged. Goal: the student writes the column shape themselves once. (Heed the known PGlite/DrizzleSchemaCoding limits — no `casing`, no `uuidv7()` in the starter; use plain `integer` PKs and explicit snake_case names in the exercise editor since client-casing isn't available there. Flag this divergence-from-project-shape inline so it's deliberate.)

Reasoning: schema is the mechanical payoff of the two-axes decision. The `lifecycleColumns` helper is worth teaching explicitly because it's the same DRY-at-the-schema-layer move the project uses everywhere and it sets up "every entity gets the same lifecycle" cleanly. Splitting the index probe out of this exercise keeps each exercise single-purpose.

### The three actions — softDelete, archive, restore

Teach the three Server Actions as the canonical lifecycle surface.

- Each returns the canonical `Result` shape from Ch 043 (`{ ok: true, data } | { ok: false, error }`). Restate the shape in one line; do not re-teach it.
- `softDelete`: sets `deletedAt = now()`.
- `archive`: sets `archivedAt = now()`.
- `restore`: clears whichever timestamp is set (set both `deletedAt` and `archivedAt` to `null`, or clear the relevant one) — and is **idempotent** on an already-active row (clearing nulls is a no-op, returns ok). Idempotency is the senior detail worth naming: a double-click on Restore must not error.
- All three also touch `updatedAt` (the helper's `$onUpdate` handles it, or set `sql\`now()\`` explicitly) and run under two existing wrappers: `tenantDb(orgId)` (Ch 056) for the org scope on the UPDATE, and the `authedAction(role, schema, fn)` RBAC wrapper (Ch 057) for authorization + session + parse. **Restate the composition; do not rebuild the wrappers.** The point to make loud: because the wrappers carry tenancy and authz, the *action body is three lines* — the senior signal is how little bespoke code each action needs.
- The five-seam shape (parse → authorize → mutate → revalidate → return) from the conventions still applies; the wrappers own parse+authorize, the body owns mutate, and `revalidatePath`/`updateTag` fires before return so the list re-renders. Name the revalidate step explicitly — a soft-deleted row that's still on screen because nobody revalidated is a real bug.

Code: `CodeVariants` with three tabs (`softDelete`, `archive`, `restore`), or a single `AnnotatedCode` if the three bodies are near-identical and the diff is the interesting part. Recommendation: `CodeVariants` (three related files) so each tab shows the full small action with its `authedAction` wrapper and `tenantDb(orgId).update(...)` call. Each tab's prose first sentence states what timestamp it writes. Show `restore` clearing both timestamps and returning `ok` even when nothing changed. Keep the `where` clause showing the id + org predicate via the helper, and note the lifecycle filter on the UPDATE is the structural concern Lesson 2 generalizes (one-line forward pointer).

`CodeTooltips` candidates inside the action block: `authedAction` ("Ch 057 wrapper: lifts session, role check, and Zod parse out of the body"), `tenantDb` ("Ch 056: pins every read/write to the active org's rows"), `updateTag`/`revalidatePath` (one-line cache-invalidation reminder). Use sparingly — these re-explain prior concepts without breaking flow, which is exactly the sanctioned use.

Exercise: optional `Sequence` ordering drill — put the five seams (parse, authorize, mutate, revalidate, return) in order for one of the actions, reinforcing the canonical action shape. Low priority; include only if the section feels light. A better fit may be a single `MultipleChoice`: "Why does `restore` return `ok` when the row was already active?" (answer: idempotency — a retried/double-clicked restore must not surface an error). Prefer the idempotency MCQ; it targets the one non-obvious behavior.

Reasoning: the actions are intentionally anticlimactic — that *is* the lesson (the senior win is the composition, not the keystrokes). Restating the wrappers rather than rebuilding them honors the "don't re-teach" scope discipline and keeps the three-line payoff visible.

### The three UI affordances and the visibility filter

Connect the actions to what the user actually sees, and to the URL-state vocabulary from Ch 060.

- Archive: a button on every active row (and a bulk action across selected rows).
- Restore: a button on rows in the **Archived** tab.
- Hard delete: a destructive button living *on the archive view*, gated behind a confirm dialog, often role-restricted. Hard delete is never the default row action — it's the deliberate, confirmed, gone-for-good path.
- The list view's filter is **tri-state**: `active` (default — archived and deleted hidden), `archived` (the Archived tab), `all` (admin view, includes soft-deleted). This rides directly on Ch 060's URL state: a `?status=archived` parameter through the same `parseAsStringEnum(['active','archived','all']).withDefault('active')` parser the student already wrote. Restate the parser shape in one line; the mechanics are Ch 060's.
- The senior usability watch-outs, taught *here* (not bundled as a tip list): archive without a visible Archived tab is a usability bug — the user can't find the row again; hard delete without a confirm dialog is destructive UX; exposing the internal `deletedAt` to the user as "deleted" is wrong — to the user it's either *gone from the UI entirely* (soft delete) or *labeled "Archived" with a restore path* (archive), never a raw timestamp.

Visual: a small `Screenshot` (or a compact HTML/CSS `Figure`) of a list view's status tabs (Active | Archived | All) with the URL bar showing `?status=archived`, plus a row's action menu (Archive / Restore / Delete). Pedagogical goal: make the tri-state filter and the affordance-per-state concrete and tie it visibly to the URL. If no screenshot asset is practical, a simple labeled HTML/CSS mock of the tab strip + a row menu inside `<Figure>` suffices — a simple visual aid still counts as a diagram.

Reasoning: this section is where the two-axes distinction cashes out in UI terms and where Ch 060 composes in. The watch-outs belong inside the concept they qualify, per the outline rules — they are the affordance lesson, not a trailing tip box.

### Restore semantics — what comes back

Teach what restore actually recovers.

- Clearing the timestamp restores the row; the references it had (foreign keys, child rows) **survived** the soft delete, so they snap back automatically. This follows directly from "soft delete is a write, not a delete" — nothing was removed.
- Cascading restore (restoring an invoice restores its line items) is correct **only when** the parent action cascaded the soft delete in the first place. The senior rule: *cascade restore exactly when the parent cascaded the soft delete* — the two operations are symmetric.
- The orphan trap: if children were *hard-deleted* on parent soft-delete (a bad pattern, but it ships), restore cannot bring them back. Name the case and the why — it motivates keeping soft-delete cascades together.
- The parent-still-deleted orphan: restoring a child whose parent is still soft-deleted produces a row visible in the UI with a missing/deleted parent. Name it as a case to guard (restore checks parent state, or the action refuses). Note that the *clean* detection of this — surfacing it as a 409 — is Lesson 3's concurrency machinery; here just name the hazard.

Code: small `Code` fragment of `restore` clearing the timestamp, plus a one-line comment that child rows are untouched because they were never deleted. No new component needed.

Reasoning: restore is where students assume magic; making "the references survived" explicit closes the gap and sets up the cascade discussion. Keep it conceptual — the transactional cascade mechanics get their own section.

### Soft delete is a write — the filtering and cascade consequences

Make the two structural consequences of "it's a write" concrete. This section names the pain that Lessons 2 and (for cascades) the transaction wrapper resolve.

- **Every read is now a code path that can leak.** A `count(invoices)` that doesn't filter `deletedAt IS NULL` returns the wrong number. A join from `customers` to `invoices` that doesn't filter pulls deleted rows into the result. The detail page, the list, the report — each is a separate place to forget the filter. State this as the *canonical SaaS data-leak failure mode*, and that in a multi-tenant app the worst version is a missed filter that also misses tenancy. Then the forward pointer, exactly once: defending this by code review fails because the omission looks correct; the structural fix — a base-query helper that makes the filter the only shape that compiles — is **Lesson 2**. Do not preview the helper's API.
- **Cascade on soft delete is application-level, not database-level.** `ON DELETE CASCADE` does *not* fire on a soft delete, because no `DELETE` happened — only an `UPDATE`. A foreign key with `ON DELETE CASCADE` is irrelevant to soft delete and lulls a reviewer into thinking deletes are handled. The senior move: soft-delete the parent and its children in the **same transaction** — `db.transaction(async (tx) => { … })` (Ch 043) threading `tx` through both updates. The failure mode if you skip the transaction: a half-finished cascade on error (parent soft-deleted, children not) leaves orphaned children visible. Name this as the bug to write a test for.

Code: `CodeVariants` — **Wrong** (FK `onDelete: 'cascade'` with a soft-delete `update`, annotated that the cascade never fires) vs **Right** (a `db.transaction` soft-deleting parent and children together). Use `del=`/`ins=` framing. First sentence of each tab states the consequence. This wrong-then-right shape is the most effective way to land the "cascade doesn't fire" surprise.

Exercise: a `MultipleChoice` — "A developer adds `onDelete: 'cascade'` to the line-items FK and ships the soft-delete action. What happens to line items when an invoice is soft-deleted?" (answer: nothing — cascade only fires on a real `DELETE`; the children are now orphaned unless the action updates them too). Targets the single most common reviewer blind spot in the section.

Reasoning: this is the bridge to the rest of the chapter. It must make the missing-filter pain *felt* (so Lesson 2 lands as relief) without solving it, and it must correct the near-universal "but I have a cascade FK" misconception. Keeping the helper's API out of this lesson is a hard scope boundary.

### Uniqueness and the hot path — partial indexes

Teach partial indexes as the soft-delete hardening layer: the correctness fix (partial unique) and the performance reach (partial composite).

- **Partial unique index — uniqueness survives soft delete.** A plain unique on `(orgId, slug)` breaks after soft delete: the user soft-deletes a project named "Acme," tries to create a new "Acme," and the constraint blocks because the soft-deleted row still holds that slug. The fix: a partial unique index `... ON projects (org_id, slug) WHERE deleted_at IS NULL`. Drizzle's `.unique()` shorthand does **not** support a `WHERE` clause, so reach for `uniqueIndex('projects_org_slug_unique').on(t.orgId, t.slug).where(sql\`${t.deletedAt} is null\`)`. **Fact-checked footgun the writer must surface:** the `.where()` predicate **must** be a raw `sql\`\`` fragment — using `eq(t.deletedAt, null)` or other helper operators in a partial-index `where` is a known Drizzle bug (issues #4790/#3349) that emits a broken parameterized (`$1`) clause in the generated migration. Write the predicate as `sql\`${t.deletedAt} is null\``. Name partial uniques as the most-frequent soft-delete bug after missing filters.
- **Partial composite index — the hot read path.** The "active rows" query runs constantly. A partial index `... ON invoices (org_id, created_at) WHERE deleted_at IS NULL` keeps the index small and the scan tight by indexing only the rows the read path ever returns. The senior reach: pair a hot composite index with `WHERE deleted_at IS NULL` when the read always filters deleted rows out. The carve-out (defaults-before-conditionals): skip the partial when the table is small or the deleted ratio is tiny — a regular composite index covers both cases without the extra complexity. Lead composite indexes with `orgId` per the tenant-scoped index convention.
- Index naming convention: explicit names, `..._partial` suffix for partial, `<table>_<cols>_unique` for uniques (per code conventions).

Code: `AnnotatedCode` on the Drizzle migration/table-extension fragment showing both indexes in the `pgTable`'s third-argument array. Steps: (1) the partial *unique* and the `WHERE deleted_at IS NULL` clause that makes re-creation work; (2) why `.unique()` shorthand can't express this, hence `uniqueIndex().where()`; (3) the partial *composite* on the hot path and the skip-it-when-small carve-out. `color="green"` on the fix highlights.

Exercise: extend the earlier `DrizzleSchemaCoding` (or a fresh one) with a **probe** proving the partial unique fires correctly — two probes: (a) `mustSucceed: true` — after soft-deleting an "Acme" row (set `deleted_at`), inserting a new active "Acme" in the same org succeeds; (b) `mustSucceed: false` — two active rows with the same `(org_id, slug)` are rejected. This is the highest-value exercise in the lesson: the student *feels* the bug-and-fix against a real PGlite. Author the probes carefully given PGlite/DrizzleSchemaCoding constraints (plain integer PKs, explicit snake_case names, `seedSQL` for the org row; insert with an explicit `deleted_at` timestamp rather than relying on an action). Flag the schema-shape simplifications inline as deliberate.

Reasoning: partial indexes are the concrete, testable hardening that distinguishes a toy soft-delete from a production one. The probe-backed exercise is the moment the abstract "uniqueness breaks" becomes a green/red check — far more durable than prose. This belongs in this lesson (not Lesson 2) because it's a property of the schema, not of the query helper.

### Where the deeper concerns live (audit log, GDPR)

Name two touch-points the lesson must mention but not own, so the student's mental model has the right edges.

- **Audit log.** Every soft-delete, archive, and restore should write an audit-log row, in the *same transaction* as the action. The anchor: the lifecycle state on the row is the *current truth*; the audit log is the *history*. Restoring a row does not erase the delete from the log. The audit-log table itself is owned later in the course (Ch 081) — name the touch-point, do not build it.
- **GDPR.** Soft delete is **not** a compliance deletion. A GDPR erasure request needs the data actually gone or anonymized beyond recovery; soft delete leaves it fully intact. Two distinct flows: the everyday "Delete" button users click is soft delete; the GDPR pipeline (Ch 081) is a separate path that nullifies PII or hard-deletes. Name both, own neither.

Use a single `Aside` (note) or two tight paragraphs. Keep it short — this is boundary-drawing, not a teaching section. It earns its place because conflating soft delete with GDPR compliance is a genuine and costly junior mistake.

Reasoning: the chapter framing flags both as threads; naming them here prevents the student from believing soft delete satisfies compliance or replaces an audit log, while respecting that depth belongs to Ch 081.

### Worked example — the invoice, end to end (recap)

Tie the lesson into one reference shape the rest of the chapter reuses. Pull together (mostly by reference to the fragments already shown, not by re-printing everything): the `lifecycleColumns` helper spread into `invoices`; the three actions (`softDeleteInvoice`, `archiveInvoice`, `restoreInvoice`); the migration with the partial unique and partial composite indexes; and the Archived tab filtered via `?status=archived`. Frame it explicitly as "this is the reference shape; Lesson 2 makes the reads safe, Lesson 3 makes concurrent edits honest."

Component: a `FileTree` (`<FileTree>`) showing where each piece lives — `db/schema.ts` (helper + table), `db/queries/invoices.ts` (where the hand-written reads will live — foreshadowing Lesson 2), the route's `actions.ts` (the three actions), the list page. This grounds the abstract pieces in the canonical file layout and previews Lesson 2's home for query helpers. (Note the path convention divergence: the chapter outline writes `/lib/queries`, but the code conventions canonically place tenant-scoped read helpers in `db/queries/<entity>.ts` — use `db/queries/` and flag this as a deliberate alignment to the code standard.)

Reasoning: a recap that consolidates rather than re-teaches respects token budget and gives the student the "here's the whole shape" moment the chapter framing calls the reference. The FileTree is a cheap, high-value orientation aid.

### External resources (optional)

If a strong, recent (≤6 months at authoring time) source exists, add one or two `ExternalResource` cards: Drizzle docs on indexes/partial indexes, and/or a Postgres docs page on partial indexes. A `VideoCallout` is **not** recommended here — the topic is decision- and schema-shaped, better served by the state diagram and the probe exercise than by video. Only include resources that are current and authoritative.

---

## Scope

**This lesson covers:** the soft-delete-vs-hard-delete decision; the soft-delete-vs-archive (UX) decision and the course default; the two-timestamp (`deletedAt`/`archivedAt`) schema in a `lifecycleColumns` helper with `updatedAt`; the `softDelete`/`archive`/`restore` Server Actions returning the `Result` shape under the existing `tenantDb` + `authedAction` wrappers; the UI affordances and the tri-state visibility filter via Ch 060's URL state; restore semantics and cascade-restore symmetry; the missing-filter and non-firing-cascade *failure modes* (named, transaction fix shown for cascades); partial unique and partial composite indexes as the hardening layer.

**This lesson does NOT cover (reserve for stated owners):**

- The base-query helper that makes `deletedAt IS NULL` impossible to forget — its `active()`/`archived()`/`includingDeleted()` API and the `tenantDb` composition — **Lesson 2 of this chapter.** This lesson only *names the pain* (missing filter leaks) and points forward once.
- The `version` column, optimistic concurrency, the 409 `Result`, and the React 19 refresh-and-retry UX — **Lesson 3 of this chapter.** This lesson may mention `updatedAt` exists for the precondition and that the parent-still-deleted orphan is cleanly surfaced as a 409 later, but builds none of it.
- URL-state mechanics — `parseAsStringEnum`/`parseAsBoolean`, `router.replace`, `searchParamsCache`, the read-server/write-client division — **Ch 060.** Restate parser shapes in one line at the call site only.
- The `tenantDb(orgId)` factory internals — **Ch 056.** Used as a known helper.
- The `authedAction(role, schema, fn)` RBAC wrapper internals and role semantics — **Ch 057.** Used as a known wrapper.
- The `Result<T>` type/`ok`/`err` helpers — **Ch 043.** Restated in one line.
- `db.transaction` mechanics — **Ch 043.** Used as known; shown only as the cascade wrapper.
- Drizzle query-builder and `drizzle-zod` mechanics — **Unit 5/6.** Assumed.
- The `audit_logs` table schema and write surface — **Ch 081.** Named as a touch-point only.
- GDPR retention/anonymization pipeline — **Ch 081.** Named as a distinct flow only.
- Trigger-based archive tables, partition pruning — out of course scope; name once as an alternative if natural, do not teach.
- Postgres Row-Level Security as an alternative enforcement layer — out of scope for this lesson (RLS is Ch 056's territory); do not reintroduce.

**Prerequisite one-liners (redefine concisely, do not re-teach):** soft delete = sets a timestamp instead of removing the row; `tenantDb(orgId)` = the helper that scopes every read/write to the active org; `authedAction` = the wrapper that lifts session + role check + Zod parse out of action bodies; `Result` = the `{ ok: true, data } | { ok: false, error }` return contract for actions; URL-state parsers = `nuqs` typed parsers the list page reads on the server and the client writes via `router.replace`.

Estimated student time: 45–55 minutes. The lifecycle vocabulary and schema shape are the foundation for the rest of the chapter.
