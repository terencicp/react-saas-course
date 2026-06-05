sources:
  37.1: "Principle #2: the schema is the source of truth"
  37.2: "The smallest table: pgTable and the snake_case bridge"
  37.3: "Postgres data types, the 2026 subset"
  37.4: "NOT NULL, defaults, and generated columns"
  37.5: "Primary keys: UUIDv7 and identity bigint"
  37.6: "Foreign keys and ON DELETE"
  37.7: "UNIQUE and CHECK constraints"
  37.8: "Many-to-many junction tables"
  37.9: "Drizzle Relations v2"
  37.10: "$inferSelect and $inferInsert"

questions:
  - source: 37.1
    question: |
      Your codebase has a public `GET /api/invoices` endpoint whose response hides `internalNotes` and `organizationId`, and a dashboard `InvoiceSummary` showing just `id`, `status`, and `amountDue`. Under Principle #2, how should each shape come to exist?
    choices:
      - text: |
          The API response is a hand-written DTO (a deliberately different contract); `InvoiceSummary` is composed from inferred pieces, e.g. `Pick<Invoice, 'id' | 'status' | 'amountDue'>`.
        correct: true
      - text: |
          Both must be hand-written types — neither is the stored row, so deriving from the schema doesn't apply to either.
        correct: false
      - text: |
          Both must derive directly from `$inferSelect` with no narrowing — anything else violates the principle.
        correct: false
    why: |
      Principle #2 forbids restating a field name and its type, not writing types at all. The public DTO is a genuinely different contract — narrower on purpose — so it's a legitimate hand-written carve-out. The summary is a projection of the row, so it stays anchored to the schema by composing with `Pick`/indexed access rather than retyping `id: string`. The smell is a hand-typed shape that *restates* what the schema already knows.

  - source: 37.2
    question: |
      A new table is declared `const tags = pgTable('tags', { ... })` but the author forgets the `export`. `tsc` stays green and the migrations run, yet a query against `tags` fails at runtime. Why?
    choices:
      - text: |
          The migration generator reads only the file's *exports*, so the unexported table was never created — but the local `const` still type-checks, so `tsc` is happy.
        correct: true
      - text: |
          An unexported `pgTable` is a compile error, so `tsc` should have failed first — something else is broken.
        correct: false
      - text: |
          Migrations scan every `pgTable` call in the file, so the table was created but with no columns yet.
        correct: false
    why: |
      Drizzle Kit's input is the file's exported tables, not every `pgTable` call it contains. An unexported table is invisible to migrations — nothing gets created — while TypeScript still resolves the local `const` fine, so `tsc` passes. The table genuinely doesn't exist in the database, which is why the query blows up at runtime. Adding `export` makes all of it line up.

  - source: 37.3
    question: |
      You're modeling a `webhook_deliveries` table. You need to store a third-party webhook body, and you also frequently run `WHERE`-clause lookups by the event's `type` field. What's the senior choice?
    choices:
      - text: |
          Store the body in a `jsonb` column, and promote `type` to its own real column you can index and filter on.
        correct: true
      - text: |
          Store the whole body in `jsonb` and reach into the JSON in every `WHERE` clause — keeping it in one column is simpler.
        correct: false
      - text: |
          Store the body as `json` (not `jsonb`) so the raw text is preserved exactly, and filter on `type` inside it.
        correct: false
    why: |
      `jsonb` is right for the genuinely shapeless third-party body, but a field you filter on regularly is normalization debt hiding in a blob — promote `type` to a real column so Postgres can index it. Reaching into the JSON on every `WHERE` is the exact anti-pattern that signals a column was needed. And the course never reaches for plain `json`: only `jsonb` is binary, indexable, and queryable.

  - source: 37.4
    question: |
      Your `id` column uses `.$defaultFn(() => uuidv7())`. A data-migration script seeds rows with a raw SQL `INSERT` that bypasses Drizzle and omits `id`. What happens, and why?
    choices:
      - text: |
          The insert fails — `.$defaultFn` runs inside Drizzle's client, so a raw `INSERT` gets no `id` and Postgres rejects the missing required value.
        correct: true
      - text: |
          The row inserts fine — `.$defaultFn` emits a SQL `DEFAULT` clause, so Postgres fills the `id` for any writer.
        correct: false
      - text: |
          The row inserts with a `NULL` id — `.$defaultFn` only applies on reads, not writes.
        correct: false
    why: |
      `.$defaultFn` (like `.$onUpdate`) runs in the Drizzle client in JS, not in Postgres, so it leaves no `DEFAULT` in the table — any writer that bypasses Drizzle gets no value. That's exactly why SQL-side defaults (`.default(...)`, `.defaultNow()`, or `default(sql\`uuidv7()\`)`) are preferred for a primary key: they fire for migrations, seeds, and `psql` alike.

  - source: 37.5
    question: |
      You're choosing the primary key for an append-only `audit_logs` table: very high volume, internal-only, never fetched by id from outside the database, with no sharding planned. Which strategy fits, and what's the main reason?
    choices:
      - text: |
          `bigint generatedAlwaysAsIdentity` — 8 bytes instead of 16 keeps the index tighter, and the UUID's non-enumeration benefit is moot since no outsider ever sees the id.
        correct: true
      - text: |
          UUIDv7 — it's the safe default for every table, and a high-volume table benefits most from time-sortable keys.
        correct: false
      - text: |
          UUIDv4 — randomness spreads the writes across the index, which a high-volume insert path needs.
        correct: false
    why: |
      When the id never crosses a system boundary, the non-guessability that justifies a UUID buys nothing, so you spend the fewest bytes and keep the tightest B-tree: `bigint identity`. UUIDv7 is the default for *user-facing* entities, not an automatic win everywhere. UUIDv4 is the trap — its randomness causes write amplification that compounds with table size, which is worst on exactly a high-volume table.

  - source: 37.6
    question: |
      An invoice's `assignedToId` references `users.id` with `onDelete: 'set null'`. Reviewing the schema, you notice `assignedToId` is declared `.notNull()`. What's wrong?
    choices:
      - text: |
          `set null` must write a null when the user is deleted, which a `.notNull()` column forbids — Postgres rejects the contradiction. Drop `.notNull()`, or pick `restrict`/`cascade` if the relationship is truly required.
        correct: true
      - text: |
          Nothing — `set null` overrides `.notNull()` at delete time, temporarily allowing the null.
        correct: false
      - text: |
          Nothing — `.notNull()` just means the column can't be null on insert; `set null` is free to null it later.
        correct: false
    why: |
      `set null`'s whole job is to write a null into the child's pointer when the parent goes, so the column has to allow null — a `.notNull()` foreign key with `set null` is a contradiction Postgres refuses. "Required + set null" is a modeling mistake, not a config to tweak: if the relationship is genuinely required, you want `restrict` (block the delete) or `cascade` (let the child go), not `set null`.

  - source: 37.7
    question: |
      You add `UNIQUE (organization_id, slug)` to a `pages` table so each org's slugs are unique. A bug report shows one org has three rows with `slug = NULL`. The constraint accepted all three. Why?
    choices:
      - text: |
          In SQL `NULL` is never equal to `NULL`, so a unique constraint treats every NULL as distinct and waves the duplicate rows through. The fix is usually upstream — make `slug` `.notNull()`.
        correct: true
      - text: |
          A composite unique only checks the first column, so the `NULL` slugs were never compared at all.
        correct: false
      - text: |
          The unique constraint silently disables itself whenever any column in the tuple is `NULL`.
        correct: false
    why: |
      A `UNIQUE` constraint inherits SQL's `NULL != NULL` rule: two NULLs are "unknown," can't be proven equal, and so count as distinct — unlimited `(org, NULL)` rows pass. The common, boring fix is to make the column `.notNull()` so no NULLs exist to slip through; `nullsNotDistinct()` is the rarely-needed escape hatch when the column must stay nullable.

  - source: 37.8
    question: |
      A `memberships` table started as a pure user-to-organization junction and then grew a `role` column. The team promotes it to an entity: it gains a surrogate `id` primary key, and the old composite primary key on `(userId, organizationId)` is replaced by a named `unique(...)` on the same pair. Why keep that unique after adding the `id`?
    choices:
      - text: |
          The composite PK was also enforcing "a user can't join the same org twice"; the `id` doesn't preserve that rule, so it survives as a unique to keep the invariant true.
        correct: true
      - text: |
          It's redundant belt-and-suspenders — the surrogate `id` already guarantees no duplicate `(userId, organizationId)` pairs.
        correct: false
      - text: |
          A junction-turned-entity is required to have at least two unique constraints for Drizzle to traverse it.
        correct: false
    why: |
      Promotion moved identity from the pair to a surrogate `id` so other rows can FK to a membership — but the *uniqueness invariant* ("no double-join") was a separate job the composite PK happened to also do. A surrogate `id` lets duplicate pairs exist, so you re-express the rule as `unique(userId, organizationId)`. Same guarantee, different slot.

  - source: 37.9
    question: |
      You declare the forward relation `invoices.organization` with `from`/`to`, but leave `organizations` without an `invoices` relation, assuming Drizzle infers the reverse. Later `org.invoices` in a `with` returns nothing. What's the lesson?
    choices:
      - text: |
          You must still *declare* both ends (the reverse can be a bare `r.many.invoices()`); an undeclared direction is a silent gap, not an inferred relation.
        correct: true
      - text: |
          The reverse failed because the bare side also needs its own `from`/`to` — Drizzle never infers a join direction.
        correct: false
      - text: |
          `org.invoices` returned nothing because the foreign key on `invoices.organizationId` needs an index before `with` can follow it.
        correct: false
    why: |
      v2 infers the reverse *join direction* so you don't repeat `from`/`to`, but it does not invent a relation you never wrote — you still add the bare `invoices: r.many.invoices()` line on `organizations`. Omitting it isn't an error; it's a missing edge that returns empty, the kind of silent gap that costs someone an afternoon later. The fix is declaring both ends, not adding `from`/`to` or an index.

  - source: 37.10
    question: |
      For a `users` table with `id` (defaulted UUIDv7), `email` (`.notNull()`, no default), and `emailLowercased` (a `.generatedAlwaysAs(...)` column), how does each column appear on `typeof users.$inferInsert`?
    choices:
      - text: |
          `id?` optional (has a default), `email` required (NOT NULL, no default), and `emailLowercased` absent entirely (generated).
        correct: true
      - text: |
          All three are optional, since the database can fill in any column it knows how to compute or default.
        correct: false
      - text: |
          `id` and `emailLowercased` are both optional, and `email` is required — generated columns are optional, not omitted.
        correct: false
    why: |
      `$inferInsert` encodes three different obligations: a defaulted column becomes *optional* (you may omit it), a `.notNull()` column with no default stays *required* (the app must supply it), and a generated column is *omitted entirely* — supplying it is a type error, not a courtesy. The trap is conflating optional with omitted: a generated column isn't an optional field, it's simply not there.
