# Upserts and RETURNING

- Title (h1): `Upserts and RETURNING`
- Sidebar label: `Upserts & RETURNING`

---

## Lesson framing

The chapter's write-shape lesson. L1 taught `insert`/`update`/`delete` with `where` and introduced `.returning()` as a one-liner; this lesson lands the two writes those primitives can't express safely on their own: **"insert if new, update if it already exists"** as a single atomic statement, and **"hand me back the row you just wrote"** as the default tail on every mutation.

**Senior question driving the lesson** (state implicitly in the intro, do not label it): *When the write is "create-or-update" — a webhook that may redeliver, a find-or-create on a unique key, a settings row that's saved over and over — how do I make it one statement that can't race, and how do I get the resulting row without a second trip to the database?*

**The two ideas, and why they belong in one lesson:** upsert and `RETURNING` are independent Postgres features, but in practice every upsert you write ends in `.returning()` — you upsert *because* you need the row (its generated id, its post-write state) and you don't want to issue a follow-up `select` to get it. Teach upsert first (the atomicity story), then `RETURNING` (the round-trip story), then show they compose into the canonical idempotent-write shape.

**The mental models the student should leave with:**
- **Upsert is one statement, not two.** `INSERT ... ON CONFLICT (...) DO UPDATE/NOTHING` is evaluated atomically inside Postgres. The naive alternative — `select`, branch in TS, then `insert` or `update` — is a **read-then-write race**: between the read and the write, a concurrent request can insert the same row, and you get either a duplicate or a unique-violation crash. The race window is invisible in development and shows up under real concurrency. Upsert closes it because Postgres holds the row lock for the whole statement.
- **The conflict target names a promise the table already made.** `ON CONFLICT (col)` only works if `col` carries a `UNIQUE` or `PRIMARY KEY` constraint. Upsert does not create the constraint — it *references* one that Ch 037 declared. No constraint, no conflict to catch, and Postgres errors. This is the single highest-value gotcha: the target and the schema constraint are the same object seen from two sides.
- **`excluded` is the row that didn't get inserted.** On a conflict, Postgres exposes the would-have-been-inserted row under the alias `excluded`. `set: { name: sql\`excluded.name\` }` reads "set the column to the value the insert tried to use" — the canonical way to apply the incoming value without restating it.
- **`RETURNING` collapses a round-trip.** A mutation without it tells you nothing about what it wrote; to learn the generated id you'd issue a second `select` — two trips, a second race window, and a result that bypasses Drizzle's inferred return type. `.returning()` makes the write hand back the affected rows in the same statement, typed exactly like a `select`. The senior reflex (seeded in L1): **a `select` immediately after a write is a smell — use `RETURNING`.**

**Why this matters / pain it relieves:** these three patterns — webhook idempotency, user-or-membership find-or-create, settings save — are in every SaaS backend, and the naive read-then-write version of each is a latent concurrency bug plus an extra round-trip. Getting upsert + `RETURNING` into reflex is what makes those handlers correct and fast by default instead of "works on my machine, duplicates in production."

**Where beginners go wrong (address these head-on):**
- **No constraint behind the target.** Pointing `target` at a column with no unique/PK constraint. Postgres throws *"there is no unique or exclusion constraint matching the ON CONFLICT specification."* Reflex: before you upsert, find (or add) the `UNIQUE` the target leans on. This is the lesson's #1 watch-out.
- **`onConflictDoNothing` with no way to tell which branch fired.** Without `.returning()`, a skipped insert and a successful insert look identical (both resolve). The fix: `.returning()` gives the new row on insert and an **empty array** on skip — branch on `.length`.
- **Overwriting `createdAt` (or other insert-only columns) from `excluded`.** A "set everything from excluded" update that includes `createdAt` erases the original creation time on every conflict. Exclude immutable columns from the `set`.
- **Expecting a typed builder for `excluded`.** `excluded` is SQL-level; Drizzle has no typed `excluded.column` accessor — it's `sql\`excluded.${col.name}\``. Beginners look for a builder method and don't find one. Name this once at the `set` example.
- **Reaching for upsert when the conflict resolution needs another row's data.** Bulk upserts where one row's update must read a *sibling* row's values don't fit `ON CONFLICT`; that's a CTE (L7). Draw the boundary so the student doesn't fight the tool.

**Teaching approach (whole-lesson):**
- **Lead with the race, not the syntax.** Open the upsert section by showing the read-then-write version of find-or-create and walking *why* it's broken under concurrency — a `DiagramSequence` of two interleaved requests both seeing "absent." The syntax then arrives as the fix, not as trivia. This honors "decisions before syntax": the student should feel the problem before meeting `onConflictDoUpdate`.
- **Two conflict actions, simplest first.** Teach `onConflictDoNothing` before `onConflictDoUpdate` — it's the smaller idea (skip on conflict) and maps to the cleanest real example (webhook idempotency). Then `onConflictDoUpdate` adds the `set` + `excluded` machinery.
- **One running constraint per example, all real (Ch 037).** Anchor each shape to a constraint the student already declared: `memberships`' `unique(userId, organizationId)` is the find-or-create star (confirmed real), and a per-org settings row keyed on a `unique(organizationId)`. Reuse domain tables; never redeclare schema (import-and-reference, per Ch 037 continuity).
- **`RETURNING` taught as the universal tail.** After upsert, generalize: `.returning()` rides on `insert`, `update`, `delete`, *and* upsert; it accepts a projection (`.returning({ id, createdAt })`) that narrows the type the same way a `select` projection does ("the type follows the projection," reused from L1/L4).
- **Cap complexity deliberately.** `targetWhere`/`setWhere` (conditional upsert against a partial unique) and the "set-all-from-`excluded`" helper are **named for recognition with a one-paragraph illustration each**, not drilled — they're the long tail, and the budget is the three canonical shapes. Flag this as a deliberate scope cut so downstream agents don't expand them.
- **Code components.** `Code` for each shape as introduced; `AnnotatedCode` for the full `onConflictDoUpdate` + `.returning()` call (target / set / excluded / returning each get a colored step — the one block dense enough to warrant stepping); `CodeVariants` for the **read-then-write (broken) vs. upsert (correct)** before/after, and again for **without `.returning()` (second select) vs. with `.returning()`**; `CodeTooltips` on the `excluded`/`sql` line to define `excluded` inline.
- **Assessment.** One `DrizzleCoding` exercise on the find-or-create shape (see PGlite staging in §Scope). One `Sequence` ordering drill is optional reinforcement for the "why one statement" story; lean on the coding exercise as the primary check.
- Estimated 40–50 min, matching the chapter outline.

---

## Lesson sections

### Introduction (no header)

Open by connecting to L1: you can already `insert` a row and `update` a row by id. But a whole class of writes isn't cleanly one or the other — a webhook that the provider may deliver twice, a "find this user or create them" on an email, a settings row your app saves on every change. Each is *"insert if it's new, update if it already exists."* Pose the senior question implicitly: how do you make that one atomic statement that can't produce a duplicate under load, and how do you get the resulting row back without a second query? Preview the two tools — `ON CONFLICT` (via `onConflictDoNothing` / `onConflictDoUpdate`) and `RETURNING` (via `.returning()`) — and that by the end every mutation in the chapter ends in `.returning()`. Warm, 3–4 sentences. Reuse the running domain with no re-introduction.

Tooltip (`Term`) candidates: **upsert** (a single statement that inserts a row or, if it would violate a unique constraint, updates the existing one instead), **idempotent** (an operation that produces the same result whether it runs once or many times — safe to retry).

### The read-then-write race

The motivation section. No upsert syntax yet — establish *why* the naive approach is broken so the fix lands as a fix.

- Show the tempting find-or-create in app code: `select` by the unique key, `if (row) return row; else insert`. Reads obviously correct. State the flaw plainly: it's **two statements with a gap**, and under real concurrency two requests can both run the `select`, both see "absent," and both `insert` — producing a duplicate (if no unique constraint) or a unique-violation crash (if there is one). Either way the handler is wrong; the bug is invisible single-threaded and only appears under load.
- Visualize with a **`DiagramSequence`** — two lanes (Request A, Request B) stepping through `SELECT (absent)` → `SELECT (absent)` → `A INSERT (ok)` → `B INSERT (💥 duplicate / unique violation)`. Pedagogical goal: make the interleaving *visible* so "race" stops being an abstract word. Cap height; 4–5 steps.
- The resolution, stated once and paid off in the next section: Postgres can do insert-or-update as **one statement** that holds the row lock for its whole duration, so there's no gap to interleave into. That statement is `INSERT ... ON CONFLICT`.
- Connect to a principle the student holds: this is the same "push the guarantee into the database" reflex as Ch 037's constraints — don't make app code coordinate what Postgres can do atomically. One sentence.

Tooltip candidates: **race condition** (a bug where the result depends on the unpredictable interleaving of two concurrent operations), **atomic** (executes as one indivisible unit — it either fully happens or not at all, with no observable in-between state).

### `onConflictDoNothing` — skip on conflict

The smaller of the two conflict actions, taught first. The canonical home is idempotent ingestion.

- The shape: `db.insert(webhookDeliveries).values(payload).onConflictDoNothing({ target: webhookDeliveries.deliveryId }).returning()`. Reads "insert this; if a row with the same `deliveryId` already exists, do nothing." Use `webhookDeliveries` from Ch 037 (`payload: jsonb().$type<WebhookEvent>()`); the dedupe key is the provider's delivery id carrying a `UNIQUE` — **flag for the writer:** Ch 037 didn't pin this exact unique, so add a one-clause illustrative note ("assume `deliveryId` carries a unique constraint") rather than redeclaring the table, and point at the schema-side lesson (Ch 037 L7) for *how* the constraint is declared.
- **Why this is the idempotency shape:** if the provider redelivers the same event, the second insert is silently skipped instead of erroring — the handler is safe to run any number of times. Tie back to the `idempotent` term from the intro. Mention this is exactly the `processed_events`/claim pattern webhook handlers use (Ch 063 owns the end-to-end handler; name it in one clause).
- **The "which branch fired?" problem and its fix.** Without `.returning()`, you can't tell whether the row was inserted or skipped — both resolve. With `.returning()`: a fresh insert returns `[row]`, a skipped one returns `[]`. Branch on the result length to know if this was the first delivery. Make this the explicit reason `.returning()` is on the call. Use a small `CodeVariants` (tab "No signal" → bare `onConflictDoNothing`, can't branch; tab "With returning" → `const [row] = await …; if (!row) { /* already processed */ }`).
- `target` here is optional in Drizzle (omitting it makes *any* unique conflict a no-op); naming it is the clearer, intentful form and required when the table has more than one unique you might collide on. One sentence; keep the named-target as the taught default.

Tooltip candidates: **`ON CONFLICT`** (the Postgres clause that catches a unique/primary-key violation during an insert and lets you skip or update instead of erroring).

### `onConflictDoUpdate` — update on conflict

The full upsert. This is the section's center of gravity; the find-or-create star is `memberships`.

- The shape, on a real Ch 037 constraint: adding a user to an org is a find-or-create on the `unique(userId, organizationId)` from Ch 037's `memberships` entity.
  ```ts
  const [membership] = await db
    .insert(memberships)
    .values({ userId, organizationId: orgId, role: 'member' })
    .onConflictDoUpdate({
      target: [memberships.userId, memberships.organizationId],
      set: { role: sql`excluded.role` },
    })
    .returning();
  ```
  "Insert the membership; if this user is already in this org, update the role to the one we tried to insert." Composite target = the two columns the unique covers.
- **Walk it with `AnnotatedCode`** (the one block dense enough to step), colored steps:
  - `target: [...]` — the columns that define a conflict; **must** match an existing unique/PK (here Ch 037's composite `unique` on the pair). Color blue. State the rule: the target *references* the constraint, it doesn't create it.
  - `set: { role: sql\`excluded.role\` }` — what to change on conflict; `excluded` is the row Postgres *tried* to insert, exposed under that alias. Color green. Note `excluded` is SQL-level — no typed Drizzle accessor; it's `sql\`excluded.column_name\``.
  - `.returning()` — hand back the row whether it was inserted or updated, typed as `Membership`. Color violet.
- **`excluded`, made concrete.** Reinforce with `CodeTooltips` on the `sql\`excluded.role\`` line defining `excluded` inline ("the row the insert proposed; on conflict its values are available to the update"). Contrast the alternative — restating the literal `set: { role: 'member' }` — and explain why `excluded` is the senior shape: a single source for the incoming value, and it stays correct for **bulk** upserts where each row carries its own value.
- **The constraint-target dependency, stated as the headline watch-out.** If the target columns have no unique/PK behind them, Postgres throws *"no unique or exclusion constraint matching the ON CONFLICT specification."* This is a *runtime* error, not a compile error — Drizzle can't see the constraint. Reflex: every `onConflictDoUpdate` target points at a `UNIQUE`/`PRIMARY KEY` you can name; if you can't, that's the bug. Use an `Aside` (caution) carrying the exact Postgres message so the student recognizes it in a log.
- **Don't overwrite insert-only columns.** A "set every column from `excluded`" update that includes `createdAt` wipes the original creation timestamp on each conflict — almost always wrong. Exclude immutable columns (`id`, `createdAt`) from the `set`. One short paragraph at the point the `set` object is discussed.

Tooltip candidates: **`excluded`** (Postgres pseudo-table inside `ON CONFLICT DO UPDATE`: the row that was proposed for insertion but rejected by the conflict — its values feed the update).

### `RETURNING` — the write that hands back its row

Generalize `.returning()` from "the tail on the upsert" to "the tail on every mutation." This section closes the round-trip story L1 opened.

- **The round-trip cost, shown.** Without `.returning()`, an `insert` resolves but tells you nothing — to learn the generated `id` (or any default-filled column) you issue a second `select`. That's two trips, a second small race window (the row could change between write and read), and a result typed by hand instead of by Drizzle. `CodeVariants`: tab "Two trips" (`insert` then `select` by id) vs. tab "One statement" (`insert(...).returning()`); first sentence of each names the trade-off. Reuse L1's reflex verbatim: **a `select` right after a write is the smell.**
- **`.returning()` rides on every write.** `insert`, `update`, `delete`, and the upserts above all accept it; the returned rows carry the full `$inferSelect` shape — same type a `select *` would give. Show one `update().returning()` and one `delete().returning()` one-liner so the student sees it's not upsert-specific (e.g. soft-delete `update` returning the updated row; `delete` returning the deleted row for an audit log entry — name soft-delete-at-depth as Ch 039).
- **Projection narrows the type.** `.returning({ id: memberships.id, role: memberships.role })` returns only those fields, and the inferred type narrows to exactly them — the same projection-narrows-type rule as a `select` (reuse "the type follows the projection" from L1/L4). Reach for it when the caller only needs the id back, not the whole row.
- **Postgres returns rows in insertion order** for a bulk `insert([...]).returning()` — so the returned array lines up positionally with the values array. One sentence; useful when correlating inputs to generated ids.

### The canonical idempotent write

A short synthesis section — compose the two ideas into the shape the student will reach for repeatedly, and draw the boundary where upsert stops fitting.

- Restate the pattern in one sentence: **upsert + `.returning()` = the create-or-update that's atomic *and* hands back the row** — the default for webhook ingestion, find-or-create, and settings saves.
- The three canonical homes, named together so the student has a mental index:
  - **Webhook idempotency** → `onConflictDoNothing` on the delivery-id unique + `.returning()` to detect first-vs-repeat.
  - **Find-or-create** → `onConflictDoUpdate` on the natural/composite unique (the `memberships` example) + `.returning()` for the row.
  - **Settings save** → `onConflictDoUpdate` keyed on `unique(organizationId)`, setting the changed columns from `excluded`; one row per org, written over and over. Introduce a per-org settings table illustratively (one-clause note, don't redeclare); this is where the **"set all from `excluded`"** idea naturally appears.
- **The "set all from `excluded`" helper — named, not shipped.** For a wide settings table, hand-mapping every column to `sql\`excluded.col\`` is tedious; the senior move is a tiny helper that builds the `set` object from the table's non-PK columns. The course **names** the helper and shows the one-line idea, deliberately doesn't implement it (one paragraph). Flag as a scope cut.
- **`targetWhere` / `setWhere` — conditional upsert, named for recognition.** One paragraph + a single illustrative snippet: `targetWhere` constrains which rows count as a conflict (pairs with a **partial** unique index from Ch 037 L7 — e.g. uniqueness only `where deleted_at is null`); `setWhere` constrains which conflicts actually get updated ("update only if the incoming row is newer"). Both are the long tail; state they're rarely needed in basic SaaS and move on. Flag as a scope cut.
- **Where upsert stops fitting.** When one row's conflict resolution needs to read *another* row's data (cross-row bulk logic), `ON CONFLICT` can't express it — that's a CTE (L7). Name the boundary in one sentence so the student knows the next tool exists.

#### Practice: find-or-create a membership

`DrizzleCoding` exercise — the find-or-create shape, the lesson's load-bearing skill.

- **Task:** given a `memberships` table seeded with one existing `(userId=1, organizationId=1, role='member')` row, write an upsert that adds `(userId=1, organizationId=1, role='admin')` and `.returning()`s the row — the student must use `onConflictDoUpdate` with the composite `target` and `set` from `excluded` (or a literal), so the seeded row is *updated to `admin`*, not duplicated. Grade on the single returned row showing `role: 'admin'`.
- **Grading:** `expectedRows={[{ userId: 1, organizationId: 1, role: 'admin' }]}`, `ordered: false`. The trap being checked: a plain `insert` (no `onConflict`) errors on the unique violation; `onConflictDoNothing` returns `[]` on the skip (so the result is empty, never `admin`) — only the `DoUpdate` path returns the row with `role: 'admin'`.
- **PGlite staging (carry the Ch 038 rules):** integer PKs with explicit seeded ids, explicit snake_case column-name strings, no `casing` client, no `uuidv7()`; declare the composite unique in the `schema` prop via `unique('memberships_user_org_unique').on(...)` (or a composite `primaryKey`) so the conflict target resolves — **verify the constraint emits in the generated DDL before committing the exercise**; if PGlite can't honor the composite unique, fall back to a single-column unique find-or-create (e.g. a settings row keyed on `organizationId`) that exercises the same `onConflictDoUpdate` + `excluded` + `.returning()` skill. Confirm which form shipped in the continuity notes.

---

## Scope

**Prerequisites to redefine concisely (taught earlier, do not re-teach):**
- `db.insert(...).values(...)`, `db.update(...).set(...).where(...)`, `db.delete(...).where(...)`, the operator helpers, and `.returning()` as a one-liner — **L1**. This lesson deepens `.returning()` and adds the conflict clauses; restate the insert/update shape in one line, don't re-teach.
- `UNIQUE` (single-column, composite, partial) and `PRIMARY KEY` constraints, and *how* they're declared — **Ch 037 L5/L7**. This lesson *consumes* them as conflict targets; redefine "a unique constraint is what makes a conflict detectable" in one clause and point at Ch 037 for declaration.
- `sql\`\`` tagged-template parameterization (values become `$1`, injection-safe) — **L1** (and depth in **L10**). Use `sql\`excluded.col\`` here with a one-line "this is safe, parameterization from L1" reassurance; the full raw-SQL story is L10.
- `numeric` → `string` money reflex, `amountDue` canonical money column, `Invoice`/`Membership` inferred types — **Ch 037**. Honor; never redeclare.
- The relational query API (`db.query`) — **L3**. Upserts are SQL-builder-only; one clause noting there's no relational-API upsert, mirroring L4's "aggregates are always `db.select`."

**Deliberately excluded (reserved for later or out of scope):**
- **Transactions wrapping multi-statement write workflows** (`db.transaction(tx => …)`) — **Ch 039 L4**. This lesson's upsert is a *single* atomic statement; the moment a workflow needs two writes atomic, that's transactions. Name the boundary in one clause, don't teach it.
- **Webhook ingestion end-to-end** (signature verification on the raw body, replay protection, the `Idempotency-Key` header, the handler-as-single-writer rule) — **Ch 063**. This lesson teaches only the *upsert shape* a handler uses; reference the webhook example, don't build the handler.
- **Soft delete at depth** (`update` setting `deletedAt` + query-time filtering, partial-unique lifecycle) — **Ch 039**. Mentioned only as a `delete().returning()` example surface; one clause pointer.
- **Indexing the conflict-target / `where` columns for speed** — **Ch 039 L1**. The unique constraint already provides the index a conflict target needs; note in one clause that correctness is here, performance tuning is Ch 039, don't open index strategy.
- **`db.update(...).where(...)` "update-or-insert" patterns where upsert doesn't fit** — covered inline in the "where upsert stops fitting" boundary (CTE → L7); no separate treatment.
- **`targetWhere`/`setWhere` and the set-all-from-`excluded` helper at depth** — named-for-recognition only (one paragraph each), implementation deliberately cut.
- **The `$inferInsert` / drizzle-zod write-validation boundary** — values are assumed validated upstream; Zod-on-write is **Ch 042**. One clause if it comes up, no teaching.

---

## Notes for downstream agents

- **Drizzle version neutrality (verified June 2026):** stable is 0.45.x; 1.0 is in RC. The conflict API (`onConflictDoNothing`, `onConflictDoUpdate`, `target`/`targetWhere`/`set`/`setWhere`, `sql\`excluded.x\``) and `.returning()` are **identical across 0.45 and 1.0** — write them version-neutrally; no divergence flag needed here (unlike L3's RQB v1/v2 split). Do not introduce v1 `relations()` or callback syntax; this lesson uses no relations.
- **Schema discipline:** reuse Ch 037 tables by import/reference, never redeclare. Real confirmed constraints: `memberships.unique(userId, organizationId)`. For `webhookDeliveries.deliveryId` and the per-org settings unique, add a one-clause "assume a unique on …" illustrative note and point at Ch 037 L7 for declaration — do not invent and ship a full new table.
- **Cognitive-load order is fixed:** race motivation → `DoNothing` → `DoUpdate` → `RETURNING` generalization → synthesis. Don't lead with syntax.
