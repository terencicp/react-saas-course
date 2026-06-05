sources:
  40.1: The Drizzle Kit daily loop
  40.2: Production-safe migrations
  40.3: Deterministic seeding with drizzle-seed

questions:
  - source: 40.1
    question: |
      When you run `drizzle-kit generate`, what does it actually compare your `db/schema.ts` against to decide what SQL to emit?
    choices:
      - text: |
          The saved snapshot in `meta/` — the recorded schema state on disk. It never inspects the live database, which is why the `meta/` files must be committed alongside the `.sql`.
        correct: true
      - text: |
          The live database it connects to at `DATABASE_URL_UNPOOLED`, reading the current columns and diffing against your schema.
        correct: false
      - text: |
          The most recent `.sql` migration file, replaying its statements in memory to reconstruct the current shape.
        correct: false
    why: |
      `generate` is a diff between your schema file and the latest `meta/` snapshot on disk — it does not touch the database (that's `migrate`'s job). This is exactly why the snapshot is source code: leave `meta/` out of a commit and every teammate's next `generate` diffs against a snapshot that doesn't exist for them, so Drizzle Kit re-emits migrations that already ran. The DB-connecting command in this loop is `migrate`, not `generate`.

  - source: 40.1
    question: |
      You're configuring `dbCredentials.url` in `drizzle.config.ts`. Why does the course insist on the **unpooled** `DATABASE_URL_UNPOOLED` here rather than the pooled URL your app uses?
    choices:
      - text: |
          Migration DDL holds long transactions that don't survive transaction-mode pooling — the pooler can cut off a long `ALTER TABLE` mid-transaction.
        correct: true
      - text: |
          The pooled URL is read-only by design, so it can run `SELECT` queries but rejects any `CREATE` or `ALTER` statement.
        correct: false
      - text: |
          Drizzle Studio needs the unpooled URL, and since one config drives all commands, `migrate` inherits it as a side effect.
        correct: false
    why: |
      Migrations run the longest transactions of any command, and transaction-mode pooling chokes on long-held DDL — it can truncate or fail an `ALTER TABLE` mid-flight. The pooled URL isn't read-only; it's a connection-management mismatch. The unpooled rule is the same one that applies to the seed script's `reset`, which also holds long locks.

  - source: 40.2
    question: |
      A solo prototype on an ephemeral Neon branch versus a staging database your team shares — when is `drizzle-kit push` the right tool?
    choices:
      - text: |
          Only the ephemeral prototype branch. `push` resolves an ambiguous rename-vs-drop diff by silently dropping the column, and there's no `.sql` file to review — so it belongs only where you'd happily wipe the data.
        correct: true
      - text: |
          Both — `push` is fine anywhere that isn't production, since staging data is just test data and can be regenerated.
        correct: false
      - text: |
          Neither — `push` is never acceptable in this stack because it skips the migration file entirely.
        correct: false
    why: |
      The decision is "is there data here you'd be upset to lose?" first, then "is anyone else using it?" Shared staging fails the first question — that data is a teammate's afternoon of test setup, and `push` deletes it without a review step when it resolves an ambiguous diff as a drop-and-add. `push` isn't banned outright; it's the right call for a solo throwaway branch where speed beats safety.

  - source: 40.2
    question: |
      Drizzle Kit emitted `CREATE INDEX "idx_invoices_status" ON "invoices" ("status")` bundled in a migration alongside an `ALTER TABLE`. `invoices` is a live, write-heavy table. What's the production-safe rework?
    choices:
      - text: |
          Move it to its own migration file as `CREATE INDEX CONCURRENTLY` — concurrent index builds can't run inside a transaction, and Drizzle wraps each file in one, so it has to sit alone.
        correct: true
      - text: |
          Add `CONCURRENTLY` in place and wrap it with `--> statement-breakpoint` markers so the runner commits the surrounding statements first.
        correct: false
      - text: |
          Leave it as-is but schedule the deploy for off-peak hours, since the write lock only matters during high traffic.
        correct: false
    why: |
      Plain `CREATE INDEX` write-locks the table for the whole build — minutes to hours on millions of rows. `CONCURRENTLY` removes that lock but cannot run inside a transaction, and Drizzle wraps each migration file in a single transaction. `--> statement-breakpoint` only separates statements; it does not escape the transaction. The fix is a dedicated file (generated with `--custom`) containing only the concurrent index, so there's nothing to wrap it in a transaction with.

  - source: 40.2
    question: |
      A merged migration turns out to be wrong — it added a column with a bad type. What does the 2026 senior do?
    choices:
      - text: |
          Write a new, corrective migration that fixes it going forward. Merged migrations are immutable; editing an applied file drifts the snapshot from the database and makes the next `generate` emit nonsense.
        correct: true
      - text: |
          Edit the offending migration file to correct the type, then re-run `migrate` so the database matches the fixed file.
        correct: false
      - text: |
          Generate a `down` migration to reverse it, then a fresh `up` migration with the correct type.
        correct: false
    why: |
      The stack is forward-only: Drizzle Kit emits `up` migrations only, and an applied migration is frozen. Editing a file that already ran anywhere — even just your laptop — desyncs the `meta/` snapshot from real database state, and the next `generate` produces garbage. A rollback would itself be a destructive op against data that has since changed. The discipline is forward-fix: revert the schema edit and generate a new corrective migration.

  - source: 40.3
    question: |
      Your seed config has `organizations: { count: 2 }` and `invoices: { count: 200, with: { lineItems: 5 } }`. How many line items does this produce?
    choices:
      - text: |
          1,000 — `count` is the total for a table (200 invoices), but `with` is per parent (5 line items × each of the 200 invoices).
        correct: true
      - text: |
          5 — `with: { lineItems: 5 }` sets the total number of line items across the whole table.
        correct: false
      - text: |
          400 — 2 organizations × 200 invoices, with `with` capped at one line item per invoice.
        correct: false
    why: |
      `count` is a per-table total — 200 invoices means 200 across all organizations, not per organization. `with` is per *parent*: each of the 200 invoices gets 5 line items, so 1,000 in total. Mixing up "total" versus "per parent" is the single biggest way people accidentally generate ten times the data they meant to.

  - source: 40.3
    question: |
      Why does the shipped seed script call `reset(dbUnpooled, schema)` before `seed(...)`, instead of just `seed` on its own?
    choices:
      - text: |
          To make the script idempotent — `reset` clears all rows in FK-safe order so every run starts from empty and lands the same state, instead of doubling rows or hitting a unique/FK violation on the second run.
        correct: true
      - text: |
          Because `seed` only inserts into empty tables and skips any table that already contains rows, so `reset` is what unlocks re-seeding.
        correct: false
      - text: |
          Because `reset` drops and recreates the tables from the schema, guaranteeing the structure matches before data is inserted.
        correct: false
    why: |
      A seed-only script works exactly once: run it again on a non-empty database and you get double the data, or it aborts on a leftover unique/FK conflict. `reset` deletes every row in FK-safe order — it does *not* drop or recreate anything structural — so reset-then-seed always returns to the same clean state. That idempotency is what makes `pnpm db:seed` a tool you'll actually re-run. (It uses `dbUnpooled` because its `TRUNCATE ... CASCADE` holds long locks.)

  - source: 40.3
    question: |
      Your `id` columns are UUIDv7, filled by a `$defaultFn` so rows sort by creation time. How should the seed config's `columns` map handle `id`?
    choices:
      - text: |
          Leave `id` out of `columns` entirely and let the column's own default fill it — `f.uuid()` emits random v4, which would destroy the v7 time-ordering.
        correct: true
      - text: |
          Set `id: f.uuid()` so the seeder generates valid UUIDs that satisfy the column type.
        correct: false
      - text: |
          Set `id: f.default()` so the seeder explicitly invokes the v7 `$defaultFn` for each row.
        correct: false
    why: |
      `f.uuid()` produces random v4 UUIDs, which are unordered — putting it on the `id` column throws away the creation-time ordering your v7 `$defaultFn` was designed to give. The fix is to omit `id` from the `columns` map so the column's own default runs. The reflex generalizes: don't let the seeder fight a decision you already made in the schema.
