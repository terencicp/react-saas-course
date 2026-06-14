sources:
  99.1: Expand, migrate, contract
  99.2: Which migrations need the cadence
  99.3: Rehearsing on a Neon preview branch

questions:
  - source: 99.2
    question: |
      A teammate's PR adds a single index to a 10-million-row table: `CREATE INDEX idx_invoices_status ON invoices (status)`. No application code reads the index, and the schema otherwise keeps working for both the old and new fleets. They route it as a one-deploy change. Why is that still an outage waiting to happen?
    choices:
      - text: |
          A plain `CREATE INDEX` takes `ACCESS EXCLUSIVE` and blocks every write (and read) on the table for the whole build — the lock axis fails even though the overlap-window axis passes.
        correct: true
      - text: |
          Adding an index is never additive, so it always requires the full expand-migrate-contract cadence regardless of how it's written.
        correct: false
      - text: |
          The index needs to be backfilled with a dual-write before the old fleet drains, and the PR is missing that step.
        correct: false
    why: |
      The two gates are independent. The change is additive (no code names the index, so the overlap-window axis is clean), but a non-concurrent `CREATE INDEX` holds `ACCESS EXCLUSIVE` for the entire build — minutes of frozen writes on a large table. The fix isn't the cadence; it's rewriting the one statement into `CREATE INDEX CONCURRENTLY`. Passing Q1 and Q3 tells you nothing about Q2.

  - source: 99.1
    question: |
      During the migrate step you make the `updateInvoice` server action write both `customerName` and `customerId` in the same `update`. Why is putting the dual-write inside that shared mutation path the senior move, rather than asking each feature to remember to set both columns?
    choices:
      - text: |
          Every mutation already flows through that one path, so the dual-write is structural — a developer shipping an unrelated feature can't accidentally skip it and silently rot a row.
        correct: true
      - text: |
          A single shared statement is faster, so it avoids the table lock that per-call-site writes would take during the backfill.
        correct: false
      - text: |
          It lets the new column stay non-nullable from the start, removing the need for a backfill of historical rows.
        correct: false
    why: |
      The dual-write is scaffolding that's born to be deleted at contract, and its only job is to keep both columns in sync. Making it structural — living in the one path every mutation already uses — is what guarantees coverage. If it were opt-in per call site, one forgotten site would leave a stale row you'd discover weeks later. It has nothing to do with lock cost, and the column stays nullable until contract because historical rows still lack the value during the backfill.

  - source: 99.2
    question: |
      You're adding a `CHECK (amount_cents >= 0)` constraint to the `invoices` table. Which statements about routing this change are correct? (Select all that apply.)
    choices:
      - text: |
          If every existing row already satisfies it, `ADD CONSTRAINT ... NOT VALID` followed by `VALIDATE CONSTRAINT` ships it in one PR with no blocking scan.
        correct: true
      - text: |
          If some existing rows violate it, you must backfill the offending rows into compliance first — which makes it a migrate step, so the change becomes the cadence.
        correct: true
      - text: |
          `NOT VALID` is the same as `NOT NULL`, so adding it permanently forbids null values in the constrained column.
        correct: false
    why: |
      The verdict is a property of the data, not the change's name. On clean data the `NOT VALID` then `VALIDATE` two-step is one PR — the first statement is instant, the second scans under the polite `SHARE UPDATE EXCLUSIVE` lock. On dirty data you backfill the violators first, which is a migrate step, so it escalates to the cadence. And `NOT VALID` is a "validate later" flag on a constraint — entirely unrelated to `SET NOT NULL`, which forbids nulls in a column.

  - source: 99.3
    question: |
      Your migrate PR's preview build is fully green — `db:migrate` ran clean and CI type-check and tests pass. Why is that still not enough to trust the dual-write, and what closes the gap?
    choices:
      - text: |
          An `update` that sets only the old column type-checks fine, so the type system can't prove the dual-write path is reached for every mutation — you perform a real mutation through the preview URL, then inspect that exact row in Studio to confirm both columns are populated.
        correct: true
      - text: |
          The build only runs the migration against an empty branch, so you need to seed production-shaped data by hand before the dual-write can be exercised.
        correct: false
      - text: |
          A green build proves the dual-write works; the row-level inspection is only needed for the contract step, where the type system can't see dropped columns.
        correct: false
    why: |
      The automatic ring proves the migration applies and typed code compiles — nothing more. A mutation that writes only the old column is valid code that does the wrong thing, and it passes type-check cleanly. The only thing that proves the dual-write path is actually reached is a row-level look: trigger a real mutation through the preview URL, then open Studio and confirm both `customer_name` and `customer_id` are set on that row. The branch already carries production-shaped data, so no manual seeding is needed.
