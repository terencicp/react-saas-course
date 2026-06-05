# JSONB columns

**Title (h1):** Reading and writing JSONB columns
**Sidebar label:** JSONB columns

---

## Lesson framing

The chapter's penultimate teaching lesson. By now the student writes every read/write shape against the Ch 037 schema using the typed builder. This lesson covers the one column type whose *contents* the builder can't type for you: `jsonb`. Ch 037 L3 already taught the column declaration (`jsonb().$type<T>()`), why `jsonb` over `json`, and the promote-to-column-vs-blob decision — and Ch 037 L3 explicitly handed the **query operators** (`->`, `->>`, `@>`) forward to this lesson. So this lesson is **not** "should I use jsonb" at depth; it's **"it's already a column — now what's the read path, write path, and filter path, and where does each one drop out of the type system."**

**The spine (reuse verbatim).** *"Drizzle types the whole column, but the moment you reach inside it you're in raw `sql\`\`` — typed at the boundary, untyped in the middle."* Every section is a consequence: whole-column read is typed (`$type` carries through); reach for one field and you get untyped `text` you must cast and re-claim; filter with `@>` and the predicate is a hand-written `sql\`\`` fragment. This tension is the senior payload — it's *why* the promote-to-column trigger exists (a field you query often shouldn't live behind a raw-SQL accessor forever).

**Three honest reframings the lesson must land** (all confirmed in fact-check, June 2026):
1. **Drizzle has no typed JSONB-accessor builder.** `->`, `->>`, `@>`, `?`, `||`, `jsonb_set` are all written as `sql\`\`` fragments. This is not a gap the student should wait out — it's the design, and it's the same raw-`sql` posture L4 (`filter`) and L8 (FTS functions) already established. Do not invent a builder that doesn't exist.
2. **`->>` returns `text`, always.** Numeric and boolean comparisons through `->>` are string comparisons unless cast (`::int`, `::numeric`, `::boolean`). This is the #1 silent bug — `'10' < '9'` is `true`. Surface it at the exact line.
3. **`@>` containment is the senior default filter**, and the right-hand side must be bound as `jsonb` with an explicit cast (`${...}::jsonb`). Fact-check surfaced a real Drizzle binding gotcha (issue #4935) where the cast is load-bearing — name it.

**Parameterization reassurance (reuse from L1/L4/L8).** Every value interpolated into a `sql\`\`` JSONB fragment binds as `$1`; reaching into JSON reopens no injection door. State it once at the first `sql\`\`` and move on.

**The `$type`-is-a-claim thread (reuse from Ch 037 L3 / L10).** `$type<WebhookEvent>` is a compile-time promise; Postgres stores whatever bytes the write path sends. The contract holds only as far as the write path validates — and the runtime gate is Zod (Ch 042), not Drizzle. A `db.execute(sql\`insert …\`)` that bypasses validation can poison the column and `$type` won't catch it. This is the senior watch-out that ties read-trust to write-discipline.

**Tone.** Adult, terse, decision-first (course thesis). The student has shipped React and just spent eight lessons in this builder. No re-teaching `jsonb` from zero — a one-line `Term` recall, then straight to the operator surface. Frame in production stakes throughout: webhook bodies, audit-log details, per-tenant settings.

**Running domain (reuse, never redeclare — Ch 037).** `webhookDeliveries` (`id`, `deliveryId` unique, `payload: jsonb().$type<WebhookEvent>().notNull()`, `receivedAt`); `WebhookEvent` type from `@/lib/webhooks`. Where the lesson needs a polymorphic-per-row payload, use `audit_logs` (`details: jsonb().$type<AuditDetails>()`) — named in Ch 037 as the append-only high-volume table; declare its `details` column inline only as an illustrative "assume this shape" note, don't redeclare the table. Money stays `numeric`→`string` if it appears.

**Exercise posture.** JSONB operators sit outside `DrizzleCoding`'s exposed globals (the widget exposes the builder surface; `->>`/`@>`/`||` are raw `sql\`\`` strings with no typed builder, mirroring L8's `customType` problem). PGlite is full Postgres, so ship the graded exercise as **`SQLCoding`** — the student writes the raw JSONB query the lesson just taught. This is the same deliberate divergence L8 flagged; note it for the maintainer.

---

## Lesson sections

### Introduction (no header)

Open with the senior question, framed as a column that already exists. The student has a `webhookDeliveries.payload` column (from Ch 037) holding a third-party webhook body — a shape the third party owns, not the schema. Two concrete needs land immediately: read the `eventType` field out of thousands of stored deliveries; find every delivery whose payload says `status: 'paid'`. Neither is a column the schema declares. State the lesson's promise: by the end the student reads whole payloads and single fields, filters by containment and key existence, does partial writes, and knows the exact moment a JSONB field has earned promotion to a real column.

Plant the spine here in one sentence (typed at the boundary, raw in the middle). Keep it to ~4 short paragraphs. One-line `Term` recall of `jsonb` (link back to "binary JSON, the indexable one — Ch 037") so the lesson doesn't re-derive it.

### When the payload belongs in JSONB (and when it has outgrown it)

A tight restatement of the Ch 037 trigger — *not* a re-teach, a one-screen recall plus the promotion signal this lesson uniquely owns. Reach for `jsonb` when the shape isn't yours or isn't fixed: third-party webhook bodies, audit-log `details` that differ per event type, user-provided metadata with open keys. **Skip** it for anything you filter or sort on across all rows, or anything two consumers must agree about the shape of — that's a real column.

The part this lesson adds: the **promotion trigger as a smell you can name in review**. A field starts in `jsonb` (fine), then gains a `WHERE` predicate, then that predicate runs on every list load — the moment a JSONB path appears in a hot filter, it's normalization debt behind a raw-SQL accessor. The senior move is to promote it to a real indexed column. Name that the expand→backfill→contract migration (Ch 040 mechanic) makes this safe; Ch 099 owns it at depth. Forward-point, don't teach.

**Component:** a compact `Buckets` (two columns: "Keep in `jsonb`" / "Promote to a column") sorting ~6 concrete fields — *webhook raw body*, *audit detail blob*, *the `status` you filter every list by*, *a `priority` you sort on*, *open-keyed user metadata*, *the `eventType` you now branch on in every query*. The drag forces the read-it-vs-query-it distinction that is the whole decision. Goal: the student leaves able to *triage* a field, which is more durable than any operator.

This section is prose-first (decision content, course thesis) with the `Buckets` as the check. No code.

### Reading the whole column comes back typed

The one place JSONB is fully typed. `db.select({ payload: webhookDeliveries.payload }).from(webhookDeliveries)` — or the relational API, or `findFirst` — returns `payload` as `WebhookEvent`, because `$type` carries straight through `$inferSelect`. No operator, no cast. This is the reward for annotating the column in Ch 037.

**Component:** a short `Code` block (whole-column select) immediately followed by a `CodeTooltips` block on the same shape, tooltips on `payload` ("inferred as `WebhookEvent` — `$type` carries through the projection") and `$inferSelect`-adjacent token if shown. Keep it to one fence.

Land the mental model: **the column is an object to TS the instant you select it whole; the untyped territory begins only when you index into it in SQL.** This sets up the contrast the next section pays off. One `Aside` (tip): reach for the whole-column read whenever the consumer needs more than one field — it's typed and it's one fewer raw fragment to maintain.

### Reaching for one field drops you into raw SQL

The core operator section. Two accessors, one critical difference:
- `->` returns a **JSON value** (still `jsonb`) — for descending another level.
- `->>` returns **text** — for extracting a leaf you'll use.

In Drizzle both are `sql\`\`` fragments (no typed builder — state this plainly, it's the spine): `sql\`${webhookDeliveries.payload}->>'eventType'\``. The interpolated table/column binds as a quoted identifier; the key is a SQL string literal. The result is `text`; if you need a number, cast in SQL and re-claim the TS type with `sql<number>\`(${webhookDeliveries.payload}->>'amount')::numeric\`` — a TS-side claim, not a check (reuse the L4/L8 `sql<T>` framing).

**The #1 watch-out, surfaced at the line:** `->>` is text, so `where(sql\`${col}->>'amount' > '100'\`)` is a *string* comparison (`'90' > '100'` is `true`). Cast first: `(payload->>'amount')::numeric > 100`. Make this the most visible takeaway of the section.

Nested paths: chain `->` then `->>` (`payload->'customer'->>'email'`), or use the `#>>'{path,to,leaf}'` path form for deep leaves — show `#>>` briefly as the shortcut for depth, name it, don't drill.

**Component:** `AnnotatedCode` (color blue) on one query that reads a nested field and uses it in a `where`, stepped:
1. `->` descends one level, result still JSONB.
2. `->>` extracts the leaf as text.
3. the `::numeric` cast — *the bug-fix step*, tinted to stand out; without it the comparison is lexical.
4. `sql<number>` re-claims the TS type the builder lost.
This is the right component because attention must land on three different spans (operator, cast, type-claim) in one block — exactly `AnnotatedCode`'s job.

**Parameterization reassurance** (one sentence, first `sql\`\`` of the lesson): the key is a literal you write, any *value* you compare against still binds as `$1` — reaching into JSON is no injection risk.

`Term` tooltips here: `->` , `->>` (one-line each), `lexeme`-style cast note inline (not a Term).

### Filtering by what the payload contains

The senior default for "find rows whose JSON matches." `@>` (containment): `where(sql\`${webhookDeliveries.payload} @> ${{ status: 'paid' }}::jsonb\`)` reads "rows whose payload contains this object." This is the most-used JSONB query operator and the one that's GIN-indexable (forward-point: lesson 1 of chapter 039 owns the index; the unindexed version degrades past a few thousand rows — name it, don't fix it here).

**Two load-bearing details (both fact-checked):**
- The right-hand side **must carry an explicit `::jsonb` cast.** Drizzle binds it as a parameter, and without the cast the JSON cast can fail at bind time (real Drizzle gotcha, issue #4935). Show `${obj}::jsonb` and state the cast is not optional.
- `@>` matches **containment, not equality** — `{ status: 'paid' }` matches a payload with `status: 'paid'` *and* twenty other keys. That's the point (partial match), and the watch-out (it won't anchor on exact-shape).

Key existence, the narrower question: `?` (one key present), `?|` (any of several), `?&` (all). `where(sql\`${col} ? 'refundedAt'\`)` = "rows where this key is set." Less common than `@>`; the right tool when *presence* is the question, not value. Name `jsonb_path_query` / SQL-JSON path (`$.items[*] ? (@.qty > 10)`) as the power tool for navigating nested arrays — one sentence, recognition only; `@>` covers most needs.

**Component:** `CodeVariants` (two tabs) contrasting the two filter questions on the same table —
- Tab "Contains a value (`@>`)": the `status: 'paid'` containment query; prose flags the `::jsonb` cast and containment-not-equality.
- Tab "Has a key (`?`)": the `? 'refundedAt'` existence query; prose flags "value doesn't matter, presence does."
The A/B framing is exactly what `CodeVariants` is for, and it cements that these answer different questions. Tint tabs blue/orange.

`Term` tooltips: `@>` (containment), `?` (key existence) — short.

### Writing and partially updating JSONB

Whole-value write is trivial: `db.insert(webhookDeliveries).values({ payload: { eventType: 'invoice.paid', … } })` — Drizzle serializes the object, `$type` checks the shape at compile time. Pair with `.returning()` (the chapter's universal mutation tail from L5).

Partial updates — two tools for two shapes (both confirmed in fact-check):
- **Shallow merge — `||`:** `set({ payload: sql\`${webhookDeliveries.payload} || ${{ processedAt: '…' }}::jsonb\` })` merges keys at the top level (last wins). The reach for "add/overwrite a top-level field without re-sending the whole blob."
- **Targeted path write — `jsonb_set`:** `jsonb_set(payload, '{customer,tier}', '"premium"'::jsonb)` writes one nested path. Show the `target, path, new_value` signature; the path is a `text[]` literal, the value is `jsonb`.

The decision: `||` for top-level fields, `jsonb_set` when the key is nested. Both keep the rest of the blob intact — contrast with replacing the whole `payload` (loses concurrent edits, re-sends everything).

**The write-discipline watch-out (the `$type` thread cashed):** `$type` does not validate writes. A partial update through `sql\`\`` can write a shape that violates `WebhookEvent` and TS stays silent — Postgres stores it, the next *typed read* is now lying. The discipline: validate the payload at the write boundary with Zod (Ch 042, named not taught); `$type` is the read-side convenience that *trusts* that boundary. State this as the bridge between read-trust and write-discipline.

**Component:** `CodeVariants` (two tabs): "Merge a field (`||`)" vs "Set a nested path (`jsonb_set`)", before/after framed with the existing payload shown. Six lines max each. Prose on each tab names which shape it's for.

One `Aside` (caution): never reach for plain `json` for any of this — it's not binary, not indexable, and the operators behave differently; the course is `jsonb`-only (reuse Ch 037 stance).

### Practice: query a webhook payload

`SQLCoding` (not `DrizzleCoding` — JSONB operators are raw `sql\`\``, outside the widget's globals; PGlite is full Postgres so raw runs natively; flag this divergence for the maintainer, same as L8).

**Mechanics & grading.** Seed a `webhook_deliveries` table (integer PK, seeded ids, snake_case columns, per L1–L8 PGlite staging) with ~6 rows for one org, each `payload jsonb` holding a realistic webhook body: an `event_type` field, a nested `data` object with a `status` and an `amount` (as a JSON number), and some rows carrying a `refunded_at` key, others not. Task combines the two highest-value skills: **return the deliveries whose payload contains `status: 'paid'` AND whose `amount` exceeds a threshold**, selecting `event_type` extracted via `->>`. 

The graded traps (this is the assessment payoff):
- The amount filter must cast — `(payload->'data'->>'amount')::numeric > 500`; a student who writes `->>'amount' > '500'` gets the lexical-comparison bug and fails on a boundary row (seed an amount like `'90'` that's numerically below but lexically above the threshold).
- The status filter rewards `@>` containment (`payload @> '{"data":{"status":"paid"}}'::jsonb`) or an equivalent `->>` path; either passes, but the `::jsonb` cast is required for the `@>` form to bind.
`expectedRows` pinned to the correct id set, `ordered` false (no inherent order) unless an `ORDER BY id` is part of the task — prefer adding `ORDER BY id` and `ordered: true` for determinism. **Verification before shipping:** confirm under PGlite that `@>` with the `::jsonb` cast binds and returns the expected rows, and that the `::numeric` cast on the `->>` path resolves — record which exact query form the `expectedRows` were generated against.

Pair the exercise with a one-line `Aside` pointing the unindexed-`@>` performance concern at Ch 039 L1 (so the student isn't surprised this is slow at scale).

### External resources (optional)

`ExternalResource` cards (1–2 max): Drizzle's `sql\`\`` magic-operator doc (the canonical "drop to raw for what the builder doesn't cover" reference) and the Postgres JSON functions/operators doc (`->`, `->>`, `@>`, `jsonb_set`, `||`). Recognition-grade only.

---

## Scope

**Already taught — recall concisely, do not re-teach:**
- The `jsonb` column declaration, `jsonb`-over-`json`, `$type<T>()` as a compile-time claim, and the *initial* promote-vs-blob decision — **Ch 037 L3** (and tested in Ch 037 quiz). This lesson recalls them in ≤1 screen and adds only the query/write operators and the promotion-as-review-smell signal.
- `$inferSelect`/`$inferInsert` type derivation machinery — **Ch 037 L10**; this lesson *uses* the inferred `WebhookEvent` read type, doesn't re-derive it.
- The `sql\`\`` tagged template's parameterization guarantee — **Ch 038 L1** (and reused L4/L8); restate in one sentence at first use.
- `.returning()` as the universal mutation tail — **Ch 038 L5**; used, not re-explained.
- The relational API / `db.select` projection shapes that surface the typed `payload` — **L1/L2/L3**; this lesson only shows that `$type` rides through them.

**Deferred — name and forward-point, do not teach:**
- **GIN / `jsonb_path_ops` / expression indexes** on JSONB columns — **lesson 1 of chapter 039**. This lesson states the unindexed-`@>` degradation and shows zero index DDL. (Same "correct here, fast next chapter" boundary as L6/L8.)
- **The `sql\`\`` escape hatch at depth** — `db.execute`, `sql.raw`, `sql<T>` typing rules — **L10**. This lesson uses `sql\`\`` only for JSONB operators and uses `sql<T>` as a one-line claim with the "TS-side, not a check" caveat.
- **Zod validation of the JSONB payload shape** at the write boundary — **Ch 042**. Named repeatedly as the runtime gate that makes `$type` trustworthy; never taught.
- **Migrating a JSONB field to a real column** (expand→backfill→contract) at depth — **Ch 099** (mechanic from Ch 040). Named as the promotion path; not walked.
- **Webhook ingestion end-to-end** (signature verification, idempotency, full handler) — **Ch 063**. This lesson touches only the payload's read/write/filter shape; the `webhookDeliveries` table is a convenient carrier.
- **Vector / embedding columns (`pgvector`)** for semantic search over payloads — **Unit 22**. One-line pointer at most.
- **SQL/JSON path (`jsonb_path_query`, `@?`, `@@`)** at depth — named for recognition; `@>` is the taught default.

**Out of scope entirely (don't mention):** `json` (non-binary) beyond the one-line "never reach for it" caution; document-database comparisons (Mongo et al.); JSONB schema-validation extensions (`pg_jsonschema`).

---

## Code conventions alignment

- `sql\`\`` for every JSONB fragment with implicit parameterization; **no `sql.raw`** anywhere in this lesson (no fixed-identifier interpolation needed). Matches Code conventions §Data layer ("no raw SQL except fixed-string identifier interpolation via `sql.raw`; `sql\`\`` for fragments").
- Read types come from the inferred `$type`/`$inferSelect`; **never hand-write the payload's TS shape** at a read site — `$type<WebhookEvent>` already carries it (Code conventions: "never hand-write a row interface"). The hand-wired Zod schema for the inner payload lives at the *write boundary* (Ch 042), not as a read-site type.
- Money inside JSON stays string-typed end-to-end; cast `->>` numeric leaves with `::numeric` in SQL, format in JS only (reuse the chapter's `numeric`→`string` reflex).
- **Deliberate divergence (flag for maintainer):** the graded exercise ships as `SQLCoding`, not `DrizzleCoding`, because JSONB operators are outside the `DrizzleCoding` widget's exposed builder globals (same situation L8 documented for `customType`/FTS functions). Downstream agents should not "normalize" it back to `DrizzleCoding`.
- **Drizzle-version posture:** stay on the stable surface (matching the chapter). `jsonb().$type<T>()`, and the `sql\`\`` JSONB operators, are version-neutral across Drizzle 0.45 → 1.0 — **no v1/v2 split flag** for this lesson (unlike L3's RQB). No `relations()`/`defineRelations` code is written here. Confirmed June 2026: Drizzle still ships **no typed JSONB-accessor builder**; raw `sql\`\`` is the current and recommended path — do not author a builder API that doesn't exist.
