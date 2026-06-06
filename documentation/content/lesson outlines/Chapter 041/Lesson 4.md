# Chapter 041 — Lesson 4 outline

## Lesson title

Page title: **A deterministic, idempotent seed for two orgs** (chapter-outline title fits; keep).
Sidebar title: **Deterministic seed**

## Lesson type

`Implementation`
(The test-coder runs for this lesson — it writes `tests/lessons/Lesson 4.test.ts`, currently a `describe.todo` placeholder. The writer renders the Implementation section list.)

## Lesson framing

The student installs the senior habit that makes a data layer verifiable instead of vibes: a seed that is both **deterministic** (a fixed-seed PRNG, same number → byte-identical data every run) and **idempotent** (`reset()` clears before re-inserting, so two runs leave identical row counts and primary keys). The payoff is that every later lesson — the list, the detail, and every downstream unit — pages through a known, repeatable dataset, and verification becomes one glance at the inspector banner rather than a guess. The decision installed: `drizzle-seed`'s generators are the right reach for shapeless fixtures, but once the data carries cross-row invariants (overlapping membership, per-invoice number sequences, FK targets captured from inserts), a deterministic PRNG plus direct inserts is clearer and fully under your control.

## Codebase state

**Entry** — Lesson 3 has landed: `db/schema.ts` and `db/relations.ts` are complete, `pnpm db:migrate` has created the six tables on the local Docker Postgres, and the database is empty. The inspector renders at `/inspector` with a zeroed verification banner (`organizations: 0`, … `invoices: 0`). `scripts/seed.ts` exists but its `runSeed` body is a single `await reset(dbUnpooled, schema)` with no insert logic; the `NewCustomer` / `NewInvoice` / `NewInvoiceLine` / `NewOrgMember` type imports, the `env` import, the PRNG factory, and the data constants are all absent. The `db:seed` script is already wired (`dotenv -e .env -- tsx scripts/seed.ts`). The provided plumbing the seed feeds — `getRowCounts`, `listOrgs`, the inspector banner — is in place but reads an empty DB.

**Exit** — `runSeed` is complete: a fixed-seed LCG PRNG seeded by `env.SEED`, `reset(dbUnpooled, schema)`, then the typed insert sequence (2 orgs, 4 users, 5 org_members with Ada in both orgs, 40 customers alternating orgs, 12–18 invoices per customer, 2–4 line items per invoice). `pnpm db:seed` fills the database; the banner reads `organizations: 2`, `org_members: 5`, `invoices: ≥ 100`. Running it a second time leaves row counts and a sampled invoice `id` unchanged. The queries in `lib/invoices/queries.ts` remain stubs (lessons 5 and 6); the inspector list still renders empty rows over the seeded data until then.

## Lesson sections

Implementation type → sections in order: **Goal + Finished result** (intro, no header), **Your mission**, **Coding time**, **Moment of truth**.

### Goal + Finished result (intro, no header)

One-sentence goal in user terms: one command fills the database with two orgs, overlapping members, and 100+ invoices, identical on every run.
Finished result described in one short paragraph: `pnpm db:seed` makes the inspector banner read `organizations: 2`, `users: 4`, `org_members: 5` (Ada in both orgs), `customers: 40`, `invoices: ≥ 100`, `invoice_lines` proportionate; a second run leaves the counts and a sampled primary key unchanged.
Component: a `Screenshot` of the inspector verification banner after seeding (the six count cells), or a one-paragraph description if no asset. Keep warm and brief; lead with why repeatable data matters (verification by glance), not mechanics.

### Your mission (header: "Your mission")

Coherent prose, no subsection headers, **no implementation hints**. Weave:

- **Feature** (user terms, 1–2 sentences): one command seeds a realistic, repeatable dataset — two orgs with overlapping membership and 100+ invoices — so the reads in the next two lessons and every later unit have something to page through and verification is one glance at the banner.
- **Constraints that shape the solution** (non-functional, woven into prose):
  - *Determinism* is the defining contract: all randomness flows through a single fixed-seed PRNG (`env.SEED`), so the same seed number always produces the same data. Bumping `SEED` deliberately shifts the shape; changing the insert logic without bumping it silently breaks the contract.
  - *Idempotency*: re-runs must produce identical row counts and the same primary-key set — `reset(db, schema)` (carried in from chapter 040) issues `TRUNCATE … CASCADE` to clear before re-inserting.
  - *Local-only / unpooled*: `reset`'s `TRUNCATE … CASCADE` and the long insert transaction hold locks, fine against local Docker but not a shared branch, so the script stays local and reaches `dbUnpooled` — the same rule migrations follow.
  - *Tool choice as a senior decision*: `drizzle-seed`'s generators suit shapeless fixtures, but this model has too many cross-row invariants (overlapping membership, per-invoice number sequences, `position` renumbered per invoice, `dueAt` derived from `issuedAt`, FK targets captured from inserts) to express cleanly, so the seed uses `reset()` plus hand-written deterministic inserts. (This is the load-bearing reframe vs. the chapter outline's drizzle-seed-generators framing — see Scope.)
- **The data shape to hit** (state as outcomes, not code): 2 orgs (Acme, Globex), 4 users, 5 org_members with **Ada Lovelace in both orgs** (the overlapping-membership invariant), 40 customers alternating across the two orgs, 12–18 invoices per customer (well past 100 total), 2–4 line items per invoice numbered by `position`, a realistic weighted status mix, `dueAt` 30 days after `issuedAt`.
- **Out of scope** (one line): the reads over this data (lessons 5 and 6) and any mutation path — Unit 6 owns the Server Actions that write to this schema.

Then the **requirements checklist** — the only list in the section, each item one verifiable outcome, tagged `[tested]` / `[untested]`. Render with `Checklist` / `ChecklistItem` carrying the `tested`/`untested` chip. Proposed items (the test-coder asserts the `[tested]` ones against `runSeed` + the schema; the rest are covered in the reference solution and the hand checklist):

1. `[tested]` After seeding, the database holds exactly 2 organizations and 4 users.
2. `[tested]` There are 5 org_members, and exactly one user belongs to both organizations (the overlapping-membership invariant).
3. `[tested]` There are 40 customers, split across the two organizations.
4. `[tested]` The database holds 100 or more invoices, every one belonging to one of the two seeded organizations.
5. `[tested]` Running the seed twice leaves every table's row count unchanged (idempotency).
6. `[tested]` Running the seed twice with the same `SEED` leaves a sampled invoice's primary key (and `number`) unchanged (determinism).
7. `[tested]` Every invoice's line items are numbered `1..n` by `position` with no gaps, and each invoice has between 2 and 4 lines.
8. `[untested]` Each invoice's `dueAt` falls exactly 30 days after its `issuedAt`.
9. `[untested]` Seeded invoice statuses show a realistic spread (paid most common, overdue least), not a uniform distribution.

Test-coder note: assertions target observable DB state after calling `runSeed` (counts, the both-orgs membership, position runs, the twice-run idempotency/determinism check), never file paths or internal names. Determinism check: run `runSeed` twice and compare a sampled invoice row. Tests run against the live local Docker Postgres the migration created; the suite must reset/seed within itself, not assume prior state.

### Coding time (header: "Coding time")

One line directing the student to write `runSeed` in `scripts/seed.ts` against the brief and the tests, then run `pnpm db:seed` twice and compare before reading on.

Hidden `<details>` solution walkthrough (writer wraps in `<details>`, collapsed). Present `scripts/seed.ts` in **repo order**. Recommended: one `AnnotatedCode` over the full `runSeed` + PRNG factory directing focus to the five load-bearing parts in sequence — (a) the LCG PRNG factory, (b) the `reset` call, (c) the orgs/users inserts with `.returning({ id })`, (d) the invoice loop, (e) the line-item `flatMap`. Keep the constants block (`DAY_MS`, `CUSTOMER_COUNT`, `SEED_EPOCH`, `ORG_SEEDS`, `USER_SEEDS`, `STATUS_BANDS`) in a plain `Code` block before it.

Cover, with one or two sentences of rationale each:

- **The LCG PRNG factory** (`createPrng`, seeded by `env.SEED`): a tiny linear-congruential generator with `int`, `money` (returns a `.toFixed(2)` string for `numeric` columns), `pick`, and `weightedStatus` driven by `STATUS_BANDS` (paid 50, sent 25, draft 15, overdue 10) for the realistic spread (covers requirement 9). Note `state = seed >>> 0 || 1` guards a zero seed, and `money` returns a string because Drizzle maps `numeric` to `string`.
- **`reset(dbUnpooled, schema)`** before any insert — the idempotency move from chapter 040; one sentence, then link to the chapter 040 seed lesson rather than re-explaining `TRUNCATE … CASCADE`.
- **The insert sequence in FK-dependency order**: orgs and users first via `.returning({ id })` to capture parent ids (with the `if (!acme || !globex)` / four-user guards explaining why — `.returning()` is typed as a possibly-empty array). Then the five `orgMembers` rows hand-written so **Ada lands in both orgs** (covers the overlapping-membership invariant, requirement 2), the rest split per org. `acmeUserIds` / `globexUserIds` derived so an invoice's `createdBy` is always a member of its org.
- **The customer loop**: 40 customers alternating `acme` / `globex` by index parity, emails namespaced by org slug to satisfy the `customers_org_email_unique` constraint (callout: this is why emails carry the slug — covers an `[untested]` constraint-respecting detail).
- **The invoice loop**: 12–18 invoices per customer (`prng.int(12,18)`), a monotonic `invoiceNumber` formatted `INV-#####` with `padStart(5,'0')` (satisfies `invoices_org_number_unique`), `weightedStatus`, `money(50,5000)` total, `issuedAt` drawn off `SEED_EPOCH + prng.int(0,364) days`, `dueAt = issuedAt + 30d` (covers requirement 8). `lineCounts` is collected in a parallel array during this loop so the line `flatMap` can reuse the same PRNG-drawn count without re-rolling.
- **The line-item `flatMap`**: 2–4 lines per invoice, `position` numbered `1..n` (satisfies `invoice_lines_invoice_position_unique` and covers requirement 7), `quantity` / `unitPrice` as `money` strings, the `lineCount === undefined` guard for the array-index access under `noUncheckedIndexedAccess`.
- **The CLI entry guard** using `pathToFileURL` — callout on the non-obvious bit: `import.meta.url` percent-encodes spaces in the path while `process.argv[1]` keeps them literal, so a naive string compare silently skips execution when the project path contains a space; the guard normalizes both sides. Script exits 0 on success, 1 on error.
- **The arithmetic that clears 100**: 40 customers × 12–18 invoices each → 480–720 invoices, comfortably past the 100 bar (covers requirement 4's threshold).
- **Callout — the determinism contract**: the fixed `SEED` number is the contract; bumping it shifts the data shape on purpose, editing the insert logic without bumping it breaks repeatability silently. Link the chapter 040 seed lesson rather than re-explaining the fixed-seed-PRNG concept.
- **Callout — local-only / `dbUnpooled`**: `reset`'s `TRUNCATE … CASCADE` and the long transaction are why this is local-only and uses `dbUnpooled`, the same rule migrations follow; Unit 20 makes the pooled/unpooled split real with Neon.
- **Callout — why direct inserts over `drizzle-seed` generators**: one or two sentences naming the cross-row invariants (overlapping membership, sequential `number`, per-invoice `position`, derived `dueAt`, captured FK ids) the generators can't express cleanly — this is the senior decision the lesson exists to install.

For prior topics (cursor pagination, EXPLAIN, the schema itself), link the owning lesson rather than re-explaining. No diagram needed — the flow is a linear insert sequence prose carries fine; an `AnnotatedCode` walk is the better focus tool here.

### Moment of truth (header: "Moment of truth")

- Test command: `pnpm test:lesson 4`. Show expected pass output (the Lesson 4 suite green, all `[tested]` requirements passing). State that the suite seeds against the live local Docker Postgres, so the DB must be up and migrated.
- Hand checklist (render with `Checklist` / `ChecklistItem`, student ticks as they go), covering the `[untested]` items and the by-eye confirmations:
  1. Run `pnpm db:seed`; read the inspector banner for `organizations: 2`, `org_members: 5`, `customers: 40`, `invoices: ≥ 100`.
  2. Open `pnpm db:studio`; eyeball one org's membership to confirm Ada appears in both orgs.
  3. In Studio, eyeball the invoice status spread (paid most common) and confirm 2–4 line items per invoice numbered by `position`. (requirements 7, 9)
  4. Spot-check one invoice: `dueAt` is 30 days after `issuedAt`. (requirement 8)
  5. Run `pnpm db:seed` a second time; confirm identical banner counts and a sampled invoice `id` unchanged from the first run.

## Scope

This lesson does not cover:

- Authoring the schema, relations, enums, FKs, or running the init migration — **lesson 3 of chapter 041**.
- The `reset()`-then-deterministic-insert idempotency pattern and the fixed-seed-PRNG concept in the abstract — taught in **lesson 3 of chapter 040** (the chapter 040 seed lesson); this lesson applies it, link rather than re-teach.
- `drizzle-seed`'s `seed().refine()` generators in depth — out of scope by design; this seed deliberately does **not** use them (proven incompatible with this constraint-heavy schema). Mention only as the contrast that motivates direct inserts.
- The reads over the seeded data: the cursor-paginated list (**lesson 5 of chapter 041**) and the single-round-trip detail (**lesson 6 of chapter 041**). The queries stay stubbed, so the inspector list renders empty rows over the seeded data until lesson 5.
- Any mutation / CRUD path that writes to this schema — **Unit 6** (Server Actions).
- The pooled/unpooled split becoming real against Neon — **Unit 20** (deploy).

### Authoring note (load-bearing correction)

The chapter outline (lesson 4 prose, and Chapter framing) describes the seed using `drizzle-seed`'s generators. The **actual** `scripts/seed.ts` uses only `reset(dbUnpooled, schema)` from `drizzle-seed`, then a hand-written fixed-seed LCG PRNG and direct `dbUnpooled.insert(...)` calls — the generators were proven incompatible with this constraint-heavy schema. Ground all content against the real `scripts/seed.ts`, not the outline's framing. The chapter framing's "weighted status mix" and "FK-aware, parents before children" remain accurate.
