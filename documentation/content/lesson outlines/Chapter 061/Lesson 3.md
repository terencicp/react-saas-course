# Version columns and the honest 409

- Title: Version columns and the honest 409
- Sidebar label: Version columns and 409s

## Lesson framing

This is the chapter's senior-mindset capstone. The student already has (Lessons 1-2) the `lifecycleColumns` helper with `updatedAt`, the `scopedInvoices(orgId)` read helper, and actions whose UPDATE `WHERE` already carries tenancy + lifecycle predicates via `tenantDb`. This lesson adds **one more predicate to that same `WHERE`** — a `version` check — and shows what to do when it fails: return an honest 409 instead of silently clobbering a coworker's edit.

The lesson teaches three tightly-coupled things, in this order, each motivated by the failure the previous one exposes:
1. **The race exists and the naive UPDATE loses it.** Two tabs, last-write-wins, first edit silently gone. This is the hook — make the student *feel* the data loss before naming the fix.
2. **Optimistic concurrency detects the race.** A `version` column read by the client and checked in the UPDATE's `WHERE`; zero rows affected = the version moved = reject. Frame optimistic-vs-pessimistic and name the SaaS default. `updatedAt` is the column-free alternative the student already has from Lesson 1.
3. **The 409 is recoverable, not just an error.** The Result carries the server's `current` row; the React 19 form shows the user what changed and lets them refresh-and-retry. Then the carve-out: when last-write-wins is *correct* and the version column is over-engineering.

Pedagogical spine: this is **not** a syntax lesson — the migration is one line, the UPDATE adds two clauses, the form adds one branch. The value is the *decision* (when do two tabs realistically collide?) and the *UX* (a conflict the user can recover from beats a conflict they never learn about). Lead with stakes (silent data loss is the canonical "looked fine in the demo, lost a customer's edits in prod" bug), keep the simplified model first (single integer counter), add complexity gradually (the conflict payload, the optimistic rollback interaction, the carve-out).

Cognitive-load management: the student arrives fluent in the Result shape (ch 043), `useActionState` + `useOptimistic` (ch 044), `tenantDb` (ch 056), and the lifecycle `WHERE` (Lessons 1-2). Build *only* the delta. Restate prerequisites in one sentence each, never re-teach. The biggest risk is conflating two distinct mechanisms (idempotency keys vs. version preconditions) — address it head-on with a comparison, because the student will meet both and they protect against different bugs.

Mental model the student should leave with: *every user-editable row that two tabs can realistically open at once gets a `version` column at schema-design time; the precondition rides in the same `WHERE` as tenancy and lifecycle; zero rows affected is not success, it's a 409; the user sees the current value and decides.* And the inverse reflex: *no client read in the write loop → no version column.*

This lesson is the model edit form the rest of the course's edit surfaces mirror; the immediately-following project chapter (062) wires exactly this onto the invoices list.

## Lesson sections

### Two tabs, one invoice, one lost edit

**Goal:** make the race visceral before naming any solution. This is the introduction (per pedagogical guidelines, the senior question is implicit, not a header).

Open with the concrete scenario: two teammates (or one person in two tabs) open the same invoice edit form. Both load `amount: 100`. Alice changes it to 150 and saves. Bob — still looking at the stale 100 — changes the customer note and saves. Bob's UPDATE writes the whole row from his stale form, silently resetting `amount` back to 100. Alice's edit is gone. No error, no log, nobody knows until Alice notices days later.

Land the senior framing: this is **last-write-wins**, the default behavior of any naive `UPDATE ... SET ... WHERE id = ?`. It's invisible in a demo (one tab) and a data-loss incident in production (real concurrent users). Name what we need: (1) a precondition that *detects* the second writer is stale, (2) a response that lets them *recover*, (3) the judgment to know when this discipline is overkill.

Connect to prior knowledge: the student's Lesson 1-2 actions already put tenancy and lifecycle predicates in the UPDATE `WHERE`. This lesson adds one more predicate to that exact clause. Frame the whole lesson as "one more `WHERE` condition, plus the UX that makes its failure honest."

**Visualization — `DiagramSequence` (Mermaid sequence diagrams as steps).** This is the highest-value diagram in the lesson; the temporal interleaving is the whole point and prose can't convey it cleanly. Author 4-5 `DiagramStep`s, each holding a Mermaid `sequenceDiagram` with actors `Tab A`, `Tab B`, `DB`. Steps:
1. Both tabs read invoice (`version`/value shown as `100`).
2. Tab A writes 150 → DB now 150.
3. Tab B writes (stale 100) → DB silently back to 100.
4. Caption lands the loss: "Tab A's edit is gone. No error was raised."
Per-step captions carry the narration. (DiagramSequence provides its own card — no `<Figure>` wrapper.) Keep actors to 3, cap height; sequence diagrams read horizontally.

Reasoning: the student must *feel* the silent overwrite. A static diagram understates it; scrubbing through the interleave makes the third step land as a gut-punch.

### Optimistic concurrency: check before you write

**Goal:** name the strategy, justify it as the SaaS default against the alternative, then make it concrete with the `version` column.

First the decision, before the syntax (defaults-before-conditionals). Two strategies:
- **Pessimistic locking** — the client holds a row lock from read to write (`SELECT ... FOR UPDATE`). Guarantees no surprise, but holds a lock across a *human-speed* think-time gap (the user is typing), serializes editors, and a forgotten release wedges the row. Wrong for web request/response.
- **Optimistic concurrency** — no lock; the client reads a version, sends it back, the server checks it still matches at write time. Collisions are rare in typical SaaS editing, so betting on "probably no conflict" and paying only on the rare miss is the right trade. The 409 path is what makes the rare miss honest.

Land the default explicitly (trigger-before-tool): **optimistic is the SaaS web-traffic default; pessimistic earns its weight only in narrow batch-processing or financial-ledger paths this course doesn't reach.** Name the threshold so the student knows when the default stops applying.

Then the mechanism, simplified-model-first. Start with the plain integer counter:
- `version: integer().notNull().default(1)` — increments on every successful UPDATE.
- The client reads `version` along with the row, holds it, and sends it back on save.
- The UPDATE does two things atomically: checks `WHERE version = :clientVersion` and sets `version = version + 1`.
- Rows affected tells the story: **1 = the write landed** (nobody raced you); **0 = the version moved** (someone wrote between your read and your write) → reject.

Use `CodeTooltips` on the schema fragment for `version`, `.notNull()`, `.default(1)` — short inline definitions keep the student in the code. Keep the schema block tiny (just the `version` line in context of the existing `lifecycleColumns` spread the student knows).

Senior anchor on the type choice: **integer over UUID/timestamp for the version itself** — small, ordered, the `+ 1` increment is atomic in SQL. (The timestamp *alternative as a precondition* is the next subsection; keep them separate so the student doesn't conflate "what column type" with "version vs updatedAt strategy".)

#### The `updatedAt` precondition: when you can't add a column

**Goal:** present the column-free alternative the student already has, with an honest trade-off, so they can choose.

The student's `lifecycleColumns` already ships `updatedAt` (Lesson 1, `$onUpdate`). So a precondition is available *without a new column*: `WHERE updatedAt = :clientUpdatedAt`.

Trade-off, framed as a senior call:
- **Pros:** one less column; the timestamp is useful for display anyway.
- **Cons:** at second precision, rapid successive writes can share a timestamp and a real conflict slips through (false negative). Millisecond `timestamptz` mostly fixes this. Serialization bugs (timezone, precision truncation across the RSC boundary) are the realistic failure mode — not clock skew, since both reads come from the *server*, not client clocks (call this out — it's a common misconception).

Decision rule: **prefer `version` for structured editing** (multi-field forms, drafts) — explicit, immune to timestamp-precision games. **Reach for `updatedAt` only when adding a column is impossible** (frozen/legacy schema) and precision is high enough.

Present as `CodeVariants` (two tabs: "version precondition" / "updatedAt precondition"), each showing the `WHERE` fragment and a one-paragraph trade-off. This is the canonical before/after-style A/B the component is built for. The course default is `version`; say so in the `version` tab's first sentence.

### The UPDATE that detects the race

**Goal:** the Drizzle UPDATE with all three predicates, and the branch on zero rows.

This is where the student's existing `WHERE` (tenancy + lifecycle from Lessons 1-2) gains its third predicate. Use `AnnotatedCode` — the UPDATE is one statement but the student's focus needs directing to four distinct parts in sequence, which is exactly this component's job.

Author the full action body once as the `code` prop; step through with `AnnotatedStep`s (blue default, color-code meaningfully):
1. The five-seam reminder in one step — parse/authorize already done by `authedAction`; we're at the mutate seam. (One sentence; don't re-teach the wrapper.)
2. The `SET` clause — `version: sql\`${invoices.version} + 1\``, `updatedAt: sql\`now()\``. **Highlight both.** Senior note: bumping `version` in `SET` is what makes the *next* writer's precondition fail — forget it and every save succeeds (infinite no-op, no conflict ever detected). Pair the two: precondition in `WHERE`, increment in `SET`.
3. The `WHERE` clause — `and(eq(id), eq(orgId), isNull(deletedAt), eq(version, clientVersion))`. **Highlight the full predicate**, color the `version` check distinctly. Land the invariant: *every precondition lives in this one clause — tenancy, lifecycle, version. Miss any and you write the wrong row or the wrong version.* Note the tenancy + lifecycle predicates are the same ones Lessons 1-2 established (continuity).
4. `.returning()` → branch: `if (result.length === 0) return conflict(...)`. **This is the heart of the lesson.** Zero rows is *not* a no-op success — it's the signal that the version moved.

Code-convention note for downstream agents: per `casing: 'snake_case'` the schema declares camelCase; the `sql\`now()\`` and `sql\`+ 1\`` fragments are the sanctioned raw-fragment carve-outs (consistent with Lesson 1's partial-index `sql\`\`` predicate). The action keeps the five-seam shape; `authedAction('member', schema, fn)` wraps it (member role — editing your org's invoice, matching Lesson 1's actions). Use the raw `db`/`ctx.db` exactly as Lessons 1-2 did; do not re-derive tenancy.

`Tooltip` candidates here: `.returning()` (returns affected rows; empty array = zero rows matched), `sql` (Drizzle tagged template, parameterized).

### Turning zero rows into an honest 409

**Goal:** the Result shape on conflict, and the two transports (in-app Result vs. HTTP 409 for external callers).

The action returns the canonical Result (ch 043) on the failure branch — but extended with two things the conflict UX needs:
- `code: 'conflict'` — the typed discriminant the form branches on. (Note: `'conflict'` is already in the course's `Result` error-code union per the code standard — point this out, it's not a new code.)
- A `current` field carrying the **fresh server row**, so the client can render "here's what it is now" *without a second round-trip*. This is the senior detail: re-fetching after a 409 is a wasted request and a race in its own right; ship the current state *in* the rejection.

Show the `err`/conflict helper return: `err('conflict', 'This invoice was changed in another tab. Refresh to see the latest version.', ...)` with `current` attached. Flag for downstream agents: the base `err(code, userMessage, fieldErrors?)` helper (ch 043) doesn't carry `current`; this lesson either (a) returns a slightly widened conflict Result, or (b) notes `current` rides alongside. Keep it honest — the lesson is *extending* the Result for this case; say so explicitly rather than pretending the base helper already has the field. Recommend a small `conflict(current)` helper or an inline widened object; let the writer pick but make the divergence visible.

**Two transports, one semantics.** Server Actions return the Result object (no HTTP status reaches the client). But a route handler wrapping the same logic (external integrator, mobile client) returns **HTTP 409 Conflict** with an RFC 9457 Problem Details body (ch 011 owns the shape; ch 057/the route-handler convention enforces the 409 row in the status table). Senior anchor: *one error semantics, two transport shapes* — the in-app form gets the typed Result, the external caller gets the standard status code. Keep this brief — it's a pointer, not a route-handler lesson. Reference the code-standard status table (409 = conflict) so the student sees this is the canonical mapping, not an invention.

`Term` candidates: **RFC 9457** (Problem Details for HTTP APIs — the standard JSON error-body shape), **409 Conflict** (the HTTP status for "your request conflicts with current server state").

### The refresh-and-retry conflict surface

**Goal:** the React 19 client form that turns the 409 Result into a recoverable user choice. This is the UX payoff.

Build on the student's `useActionState` + `useOptimistic` fluency (ch 044) — restate each in one sentence, don't re-teach the hooks.

The form holds `version` as a hidden input (uncontrolled, `defaultValue` per the forms convention) carried from the Server Component prop. Walk the three Result outcomes the form branches on:
- `{ ok: true }` → replace local state with the returned row, show success, update the hidden `version` to the new value.
- `{ ok: false, error: { code: 'conflict' } }` → render the **conflict banner**: "This was changed elsewhere," show the server's `current` values, and two affordances:
  - **"Use latest and edit again"** — replaces the form state (and hidden `version`) with `current`, so the user re-applies their change on top of fresh data. The safe, default path.
  - **"Overwrite anyway"** — re-fires with a `force` flag that bypasses the precondition. A sharp edge: gate on role or hide entirely depending on product. Name it as deliberate and dangerous, not a convenience.
- `{ ok: false }` other codes → the generic error path the student already knows.

**`useOptimistic` interaction — the subtle bit (get this precise).** Optimistic UI shows the edit instantly *while the transition is pending*. The accurate React 19 model — and the one the student must leave with — is **not** "rollback fires on error." It's: the optimistic value is only visible for the duration of the pending transition; when the action resolves, the transition ends and React renders whatever the *actual* source-of-truth state currently is. On a 409 the action **returns** `{ ok: false }` (the course's return-don't-throw pattern, ch 043), so the success-path state update never runs, the actual state is unchanged, and the UI naturally falls back to the pre-optimistic value. There is no separate rollback step — the optimism simply expires. This is a correction the student needs explicitly, because the loose phrase "rollback on error" implies a mechanism that only actually fires for *thrown* errors; the course returns Results, so the revert is "optimistic value expired, real state never advanced," not "React caught a throw." The *new* idea this lesson adds: after the optimism expires, the form renders the conflict banner against the user's still-present (uncontrolled) input plus the server's `current`. Senior anchor: optimism covers the common case; on conflict the optimistic value expires back to the unchanged real state; the conflict banner is what the user actually sees on collision. (Cross-ref ch 044 Lesson 5 for the base hook, but state the conflict-return nuance here — it is this lesson's contribution.)

Restate the **optimistic-mutation state machine** (from ch 005's `idle → submitting → {success | conflict | error}`) — the student has this model; the *conflict* transition is the named state this whole lesson exists to add. One small visual reinforces it: a compact `Figure` with hand-authored HTML+CSS showing the four states as a horizontal strip, the `conflict` node tinted as the new arrival. (HTML+CSS per the diagram guide for a simple labeled strip; keep under the height cap.) Reasoning: slotting the new state into a model the student already holds is lower cognitive load than presenting a fresh diagram.

Code presentation: `AnnotatedCode` for the form component (single block, focus directed to the hidden `version` input, the `useActionState` wiring, and the three-way branch on `state`). Keep the action call and the branch as the highlighted steps.

`CodeTooltips`/`Term` candidates: `useActionState` (returns `[state, formAction, isPending]`; owns the latest Result), `useOptimistic` (immediate UI state, auto-rolled-back on action failure), hidden input (carries `version` through `FormData` without rendering).

**Exercise — `ReactCoding` (tests mode).** Live-coding check the student can actually run (React-family only; this is in-scope for the iframe per the SDK's react-only constraint — no third-party npm needed). Give a starter form whose action returns a mocked Result (a stub passed in, simulating conflict vs. success — keep it React-only, no Server Action). Task: wire the branch so that on `code: 'conflict'` the banner with the `current` value renders, and on success the value updates. Tests assert: (1) conflict banner appears with the server value when the action returns conflict, (2) success path updates the displayed value, (3) the hidden `version` input exists. This makes the three-way branch muscle memory, which is the lesson's transferable skill.

Reasoning for exercise choice: the branch-on-Result is the one piece of *new code the student writes* in this lesson; everything else is conceptual or a one-line schema/WHERE change. A runnable React exercise locks the skill; a sandbox would be lower-value (guided is preferred).

### When last-write-wins is the right answer

**Goal:** the carve-out, so the student doesn't bolt a `version` column onto everything. This is essential senior judgment, not a footnote — hence its own section.

The reflex to teach: **no client read in the write loop → no version column.** A version precondition only matters when a *stale client read* can clobber a fresh write. Cases where that can't happen, so last-write-wins is correct:
- **Single-user toggles** — a personal preference, a per-user "show archived" flag (ties back to Lesson 1's tri-state filter). One human owns it; there's no second writer to lose.
- **Append-only writes** — a comment, an audit note, a status entry that's never edited. Each write is a new row; nothing gets overwritten.
- **SQL-side increments** — `SET count = count + 1`. The increment happens *in the database* with no client read-modify-write loop, so two concurrent increments both land correctly.

Land the discrimination as the senior call: add the version column when there's a read-modify-write loop through a client; skip it otherwise. Over-applying it is friction (every save can 409); under-applying it is data loss.

**Distinguish idempotency keys from version preconditions — the conflation trap.** The student will meet both (idempotency keys at ch 063). They solve *different* bugs:
- **Idempotency key** — prevents the *same* write from landing *twice* (double-click, network-retry the identical request).
- **Version precondition** — prevents *two different* writes from *clobbering* each other (two tabs editing the same row).

Both can apply to one action: the idempotency key dedupes a retry, the version check catches the cross-user collision. Name the distinction crisply so the student files them separately. Foreshadow ch 063 for idempotency depth; don't teach it here.

**Visualization — `StateMachineWalker` (`kind="decision"`).** A short decision tree: "Should this write carry a version column?" The walker forces the *order* a senior asks the questions (is there a client read in the write loop? → is more than one writer realistic? → can a stale read clobber a fresh write?). Leaves: "Add a `version` column" / "Last-write-wins is correct" / "Use an SQL-side increment, no version needed." Reasoning: this lesson's value is the decision, and the walker makes the decision *procedure* explicit and repeatable — exactly its intended use (a senior decision filter). Self-contained card, no `<Figure>` wrapper.

### Worked example: the invoice edit form, end to end

**Goal:** assemble the pieces into the canonical reference shape the rest of the course mirrors.

Tie it together as the chapter's reference edit form, reusing the invoice entity from Lessons 1-2 (continuity — same `invoices` table, same `scopedInvoices`/action home). Use `CodeVariants` to group the related files as tabs (the component's "group related files" use):
- **`db/schema.ts`** (fragment) — the `version` column added to the existing table.
- **migration** — `ALTER TABLE invoices ADD COLUMN version integer NOT NULL DEFAULT 1`. One sentence on the senior anchor: the `DEFAULT 1` backfills every existing row in a single statement — no rolling update; the schema change is cheap, the discipline of including `version` in every UPDATE is the actual cost. (Reference the chapter's drizzle-kit `generate --name` + review convention from Lesson 1; don't re-teach migrations.)
- **`actions.ts`** — the `updateInvoice` action with the three-predicate `WHERE`, the `version` bump, the conflict branch returning `current`.
- **the form** (Client Component) — `useActionState` wiring, hidden `version`, the three-way branch with the conflict banner.

Keep each tab to the component's six-line-prose ceiling; the deep walkthroughs already happened in the sections above, so these tabs are the consolidated artifact, lightly annotated. This is the "here's the whole thing assembled" payoff, not new teaching.

Optionally close with one or two `ExternalResource`/`LinkCard`s: the React 19 `useActionState`/`useOptimistic` docs and the RFC 9457 spec, for the student who wants the primary sources.

## Scope

**Already taught — restate in one sentence each, never re-teach:**
- The canonical `Result<T>` shape, `ok`/`err` helpers, `code`/`userMessage`/`fieldErrors`, throw-at-the-edge (ch 043 Lesson 3). `'conflict'` is already in the error-code union.
- `useActionState` (`[state, formAction, isPending]`, `(prevState, formData)` signature), `useFormStatus`/`<SubmitButton>`, and `useOptimistic` (ch 044 Lessons 3-5). Note: ch 044 may describe `useOptimistic` revert loosely as "rollback"; this lesson sharpens it (the optimistic value is only visible during the pending transition — see the refresh-and-retry section). Uncontrolled inputs / `defaultValue` forms convention.
- `tenantDb(orgId)` tenancy scoping and the `authedAction(role, schema, fn)` wrapper (ch 056, ch 057).
- This chapter's Lessons 1-2: `lifecycleColumns` (`deletedAt`/`archivedAt`/`updatedAt` with `$onUpdate`), the `softDelete`/`archive`/`restore` actions, `scopedInvoices(orgId)` with `active()`/`archived()`/`includingDeleted()`, the partial-index `sql\`\`` carve-out, and the established fact that the actions' UPDATE `WHERE` already carries tenancy + lifecycle predicates (this lesson adds the third).

**Out of scope — do not teach here:**
- **Pessimistic locking (`SELECT ... FOR UPDATE`)** — named as the alternative and dismissed for web traffic; not implemented.
- **Idempotency keys / webhook ingestion** — named only as the *distinct* mechanism; depth is ch 063.
- **`useOptimistic` mechanics from scratch** — ch 044 owns it; this lesson only uses it and explains the *conflict-rollback* interaction.
- **The Result base shape derivation** — ch 043 owns it; reference only.
- **Transaction wrapper for multi-row updates** — ch 043 Lesson 5; this lesson's UPDATE is single-row. (Mention `db.transaction` only if the conflict path also writes an audit row — and if so, point at it, don't teach it.)
- **Route-handler internals / full RFC 9457 body** — ch 011 + the route-handler convention own it; this lesson names 409 + Problem Details as the external transport and moves on.
- **Collaborative-editing conflict resolution (CRDTs, OT)** — explicitly out of course scope; name once as the thing this is *not*.
- **Audit-log entries on edits** — ch 081; named as a touch-point at most.
- **Schema-level version triggers (`BEFORE UPDATE`)** — name and dismiss in one line (hidden behavior beats explicit `SET version = version + 1` at the call site); keep the increment in the application layer. Don't build it.
- **The project wiring onto the live invoices list** — that's the immediately-following project chapter (062); this lesson ships the teaching reference, not the integrated feature.

## Notes for downstream agents

- **Cross-reference correction:** the chapter outline cites `useOptimistic` as "lesson 6 of chapter 044," but chapter 044's outline places it at **Lesson 5**. Use Lesson 5 (or just "Chapter 044") for any cross-reference; do not cite a lesson 6.
- The Result discriminant field is `error.userMessage` (not `message`) and `error.code` (not `error.type`) — match ch 043 exactly.
- The `current` field on the conflict Result is an honest extension of the base `Result` shape — present it as such; don't imply `err()` already carries it.
- **React 19 `useOptimistic` revert (verified against react.dev, June 2026):** automatic rollback fires only when the action *throws*. The course **returns** Results, so do not write "React rolls back on `ok: false`." The correct framing: the optimistic value is visible only during the pending transition; when the action returns, the transition ends and the UI shows the unchanged actual state (the success-path state update never ran). Keep the lesson's wording on this exact — it is a common and load-bearing misconception.
