# Schema and the four core tables

- Title: Schema and the four core tables
- Sidebar label: The four core tables

## Lesson framing

Second lesson of the Better Auth setup chapter. Lesson 1 shipped the feature-less `auth` instance with `drizzleAdapter(db, { provider: 'pg' })` already in the config — but the adapter currently points at tables that don't exist. This lesson lands persistence: it makes the adapter schema-aware, generates the four canonical tables (`user`, `session`, `account`, `verification`) with the Better Auth CLI, walks their load-bearing columns and the foreign-key cascades, and ships the first migration through Drizzle Kit. The student leaves with four tables in Postgres next to their domain tables and a clear mental model of the auth data model.

Archetype: setup + reference hybrid. The schema walkthrough carries the teaching weight; the CLI command and the migration are mechanical. The dominant pedagogical move is **read-the-generated-code, don't-write-it** — Better Auth owns these column names and types, so the senior skill is reviewing generated output as a code review, not authoring tables by hand.

The single most important mental model to install: **identity is one `user` row; every way of proving that identity is a separate `account` row.** This is the decomposition that makes `password` live on `account` (not `user`) feel inevitable rather than arbitrary, and it's what survives every Chapter 053 flow (email/password, Google, account linking) without re-shaping. Build the lesson so the student reaches this conclusion themselves via the ER diagram before the prose states it.

Where beginners go wrong, and what to pre-empt:
- They expect a `password` column on `user` (every tutorial they've seen has one). Confront this head-on with the account-decomposition model.
- They hand-write the schema to "understand it," then fight name/type mismatches with the library. Frame generation as the senior default, hand-writing as the anti-pattern.
- They forget to migrate before testing sign-up in the next chapter, then hit an opaque "relation \"user\" does not exist" Postgres error. Plant the migrate step firmly and name the failure mode.
- They reach for Better Auth's own `migrate` CLI because the docs mention it, fragmenting migration history. Make the one-tool rule explicit: generate with Better Auth's CLI, migrate with Drizzle Kit, always.

Cognitive-load sequencing: start from the senior question (Better Auth needs persistence; the app already has Postgres — how do they meet?), then the schema-aware adapter (one config addition), then *why generated* (the decision), then the CLI command (mechanical), then the ER diagram as the centerpiece (the whole model at a glance), then the four tables one at a time (depth, deepest on `account`), then cascades, then the migration, then a hands-on exercise. Each table builds on the previous; `account` is the payoff and gets the most space.

Threads from the chapter framing to honor: the schema is the source of truth (Architectural Principle #2) — auth tables ship in the same `src/db/schema/` directory as domain tables and migrate through the same Drizzle Kit pipeline (Chapter 040); use the framework's conventions, no wrapper (Principle #5) — the CLI output is consumed as-is; primary-key and cascade conventions follow the project's existing `src/db` standards. The `casing: 'snake_case'` mapping is set on the Drizzle client (Chapter 037), so generated TS reads `emailVerified` while SQL is `email_verified` — name this once so the column walkthrough isn't confusing.

## Lesson sections

### Introduction (no header)

Open with the senior question made concrete: in Lesson 1 the `auth` instance was wired with `drizzleAdapter(db, { provider: 'pg' })`, but if you called sign-up right now it would fail — the adapter is pointed at a `user` table that doesn't exist yet. Better Auth needs persistence, and the app already has Postgres through Drizzle (Unit 5). This lesson makes those two meet: four tables, generated and migrated, living next to the app's domain tables. Preview the end state in one or two sentences (four tables in Postgres, schema reviewed, first migration shipped) and the one idea to carry (identity vs. proof-of-identity). Keep it warm and short. No "what is a database" scaffolding.

### Pointing the adapter at the schema

Goal: the one config change that makes the adapter schema-aware, and why it's needed before generation.

Content:
- Lesson 1's `drizzleAdapter(db, { provider: 'pg' })` told the adapter *which database driver* (`'pg'`) but not *where the table definitions live*. Add the `schema` option so the adapter resolves table objects by reference, not by guessing export names: `drizzleAdapter(db, { provider: 'pg', schema })`, where `schema` is the namespace import of the schema module. Explain the default behavior briefly: without `schema`, the adapter expects tables exported under the exact names `user`, `session`, `account`, `verification` from the Drizzle instance — passing `schema` explicitly is the legible, drift-proof choice and matches how `db` was constructed (Chapter 037 passed `schema` to `drizzle(...)`).
- Name `usePlural` once and dismiss it: the project uses singular table names (Better Auth's default), so no remap needed. One sentence; it's a recognition-level mention, not a configuration.

Components:
- `CodeVariants`, two tabs (before / after) on the `database:` line of `src/lib/auth.ts`. Tab 1 "Before" shows `drizzleAdapter(db, { provider: 'pg' })` from Lesson 1; Tab 2 "After" adds `, schema` plus the namespace import `import * as schema from '@/db/schema';` at the top. Each tab's prose explains the delta. Keep the slice tight — show only the import line and the `database:` line, not the whole instance.

Note for downstream: this is deliberately a small, surgical edit on top of Lesson 1's file. Do not re-show the whole `auth.ts`; the student already has it.

### Why the schema is generated, not hand-written

Goal: install the senior reflex — read generated schema, don't author auth tables by hand.

Content:
- The decision framing: Better Auth requires *specific* columns, with *specific* names and types, to exist. Hand-writing them invites the canonical mismatch debugging session ("the library expects `emailVerified`, your schema has `email_verified_at`"). The CLI removes that whole class of bug by emitting the exact Drizzle definitions the library's adapter expects.
- Reframe what "generated" means here so the student doesn't fear a black box: the output is a normal Drizzle schema file the student reads, reviews, edits if needed, commits, and migrates — not a hidden runtime contract. It's generated *once* and then it's yours.
- The regenerate trigger (state it now, it recurs across the unit): regenerate whenever the set of loaded plugins changes — the `organization` plugin (Unit 9) adds `member`/`invitation`/`organization`; the `passkey` plugin (Chapter 053) adds `passkey`. Each regeneration is a diff to review, not a leap of faith. Frame as "the CLI is a code generator you review, not an ORM you trust blindly."

Components:
- Prose-led. Optionally a small `Aside` (tip) reinforcing the one-line rule: "Generate the schema, review the diff, migrate. Never hand-author auth tables." Keep it inline with the concept, not bundled at the end.

### Generating the tables with the Better Auth CLI

Goal: the mechanical command and what it reads / writes.

Content:
- The command: `npx @better-auth/cli generate`. Explain what it does without ceremony: it reads the auth config (point it at the file with `--config src/lib/auth.ts` if the CLI can't auto-discover it), sees the Drizzle adapter + `provider: 'pg'` + the loaded plugins, and writes a Drizzle schema file with exactly the tables those choices require. The CLI defaults its output to a root `schema.ts`; pass `--output src/db/schema/auth.ts` so the file lands at the project's schema location, consistent with the existing schema-module layout — keep auth tables in the same directory as domain tables (source-of-truth thread). (The CLI prompts before writing; `--yes` skips the confirmation in scripted runs.)
- The one-tool rule, stated firmly here at point of temptation: Better Auth also ships `npx @better-auth/cli migrate`, which would create the tables directly. **This stack does not use it.** Drizzle Kit owns migrations end-to-end so there is one migration history and the schema stays the single source of truth. The senior contract: generate with Better Auth's CLI, migrate with Drizzle Kit, always. Two migration tools = fragmented history + schema drift.

Components:
- `Code` (bash) for the generate command. Keep it a plain block — it's a single mechanical command, no need for AnnotatedCode.
- After the command, show the generated file at a glance so the next section can dissect it. Use a `FileTree` fragment placing `src/db/schema/auth.ts` next to the existing domain schema files, to land the "lives next to your tables" point visually.

Tooltip terms: `CLI` (only if not already defined earlier in the course — likely already known; skip if so).

### The auth data model at a glance

Goal: the centerpiece. Give the student the whole four-table model in one visual *before* the column-by-column walk, so each subsequent table slots into a structure they've already seen. This is where the "one identity, many proofs" model lands.

Content:
- An ER diagram of the four tables with their relationships and the load-bearing columns. The pedagogical goal: make the *shape* of the model legible — `user` at the center, `session` and `account` both pointing at it via `userId` foreign keys (1-to-many each), and `verification` standing alone, deliberately unconnected. The visual asymmetry (verification has no line to user) is itself a teaching moment the prose will pay off in the cascades section.
- Surrounding prose draws the two big conclusions from the picture before the detail:
  1. One `user`, many `account` rows — that 1-to-many is the account-linking mechanism (one row for email/password, one per OAuth provider). This is the "identity vs. proof" model, stated against the diagram.
  2. `verification` has no foreign key to `user` on purpose — its rows can exist *before* the user does (email-verification during sign-up). Foreshadow, don't fully explain yet.

Components:
- D2 ER diagram via `shape: sql_table`, wrapped in `<Figure>` with a caption. Use `direction: right` is fine but an ER schema may stack better top-down (per diagrams guide, ER is an allowed top-down exception) — author whichever keeps height under budget; four tables should fit either way. Mark `{constraint: primary_key}` on `id` columns, `{constraint: foreign_key}` on `userId` columns, `{constraint: unique}` on `user.email` and `session.token`. Include only the load-bearing columns per table (not every nullable OAuth token) so the diagram stays readable — full column lists live in the walkthrough. Draw edges `session.userId -> user.id` and `account.userId -> user.id`; leave `verification` with no edge (the point). Bump font size if the viewBox forces downscaling.

Note for diagramer: the silent design choice is *which columns to show* — pick the PK, the FK, the unique key, and the one or two columns each table is named for (`user.email`, `user.emailVerified`; `session.token`, `session.expiresAt`; `account.providerId`, `account.password`; `verification.identifier`, `verification.value`). Everything else is walkthrough territory.

### The four tables, column by column

Goal: depth on each table. Structure as four h3 subsections so each table is a focused unit. Order: `user` → `session` → `account` (the deep one) → `verification`. Each subsection walks the columns that matter and skips the obvious (`createdAt`/`updatedAt` get one collective mention, not four).

For each table, use `AnnotatedCode` on the *generated* Drizzle definition for that table (the real CLI output, lightly trimmed of noise), stepping through the load-bearing columns with colored highlights. This keeps the student's eye on the actual code they generated while the prose explains intent. Keep each table's block under the 18-line AnnotatedCode ceiling — trim verbose OAuth-token columns to a representative subset where needed and say so. Use the project's snake-case-on-the-client convention: TS reads `emailVerified`, SQL is `email_verified` — note this once in the `user` subsection so the camelCase/snake mapping isn't confusing.

#### user — one row per identity

- `id` (text PK; the project's id convention from `src/db` — UUIDv7 via `$defaultFn`, consistent with domain tables). Note that the CLI emits `text('id')` and the project keeps its id-generation default; align with existing convention.
- `email` (text, **unique**, not null) — the unique index is enforced **at the database**, not just the app. Duplicate emails fail the constraint instead of creating a half-baked row; this defeats the race condition an application-level "check then insert" can't.
- `emailVerified` (boolean, default false) — the gate Chapter 053's sign-in reads. A boolean, not a timestamp, in Better Auth's model.
- `name`, `image` (text, `image` nullable — profile URL from OAuth providers).
- One-line mention: `createdAt`/`updatedAt` timestamps default to now; the same pair appears on every table, won't be repeated.

AnnotatedCode steps: id (PK), email (unique + notNull, color it — this is the load-bearing one), emailVerified (the gate), the timestamps as one closing step.

#### session — one row per active login

- `id` (text PK).
- `userId` (text, FK to `user.id`, `onDelete: 'cascade'`) — flag the cascade now, explain fully in the cascades section.
- `token` (text, **unique**) — *this is the opaque session id from Chapter 051 that travels in the cookie.* Tie it explicitly back to the Chapter 051 mental model: the cookie carries this token, the lookup on every request is `session WHERE token = ?`, so the unique index on `token` is the hot path — index quality is load-bearing.
- `expiresAt` (timestamp) — when the session dies.
- `ipAddress`, `userAgent` (text, nullable) — name them as the columns Chapter 054's active-sessions list will render ("Chrome on macOS, last seen from …"). Recognition-level; don't build the UI here.

AnnotatedCode steps: userId+cascade (color), token (unique, the cookie tie-back — the emphasis step), expiresAt, the metadata columns.

#### account — one row per way of signing in

The deep one. This is where the "identity vs. proof" model becomes concrete code, so give it the most space and the clearest payoff.

- Lead with the model, not the columns: a `user` is one row regardless of how many ways they can prove who they are. Each *proof method* — a password, a Google login, a GitHub login — is its own `account` row pointing back at the same `user`. One user, many accounts.
- `userId` (FK, cascade) — links the proof to the identity.
- `providerId` (text) — *which* proof method: `'credential'` for email/password, `'google'` / `'github'` / `'apple'` for OAuth. This column is the discriminator.
- `accountId` (text) — the provider's user id for OAuth, or the user's own id for credential accounts.
- `password` (text, **nullable**) — **the hash lives here, on `account`, not on `user`.** This is the punchline of the whole lesson. Explain the consequences that make it obviously correct: "change password" updates one `account` row; "link Google" inserts another `account` row; "unlink Google" deletes one. The `user` row never moves. Nullable because OAuth-only accounts have no password — only the `providerId: 'credential'` row carries one. (Recognition-level only: Better Auth hashes with **scrypt** by default; do not teach hashing internals — that's not this lesson's job.)
- OAuth token columns (`accessToken`, `refreshToken`, `idToken`, their `…ExpiresAt`, `scope`) — all nullable, populated only for OAuth accounts when the app needs to call the provider's API later. Group these as "OAuth bookkeeping, mostly null for now" — one step, don't enumerate each in prose.

Pedagogical sequencing inside the subsection: state the model → show `providerId` as the discriminator → reveal `password` is nullable and on `account` → walk the "change password / link / unlink" consequences. The student should feel the decomposition click.

AnnotatedCode steps: userId (cascade), providerId (the discriminator — color it), password (nullable, the punchline — strongest color/emphasis), the OAuth-token block as one grouped step.

Consider an `Aside` (note) right after this subsection crystallizing the rule in one sentence: *"`user` answers who; `account` answers how they prove it."*

#### verification — short-lived tokens

- Purpose: short-lived tokens for email verification, password reset, magic links, and OAuth `state`/PKCE bookkeeping.
- `identifier` (text) — the email being verified, or a synthetic key for state tokens.
- `value` (text) — the token (or its hash).
- `expiresAt` (timestamp) — these rows are ephemeral; consumed rows are deleted, and an `expiresAt` filter / cleanup keeps stale rows from piling up.
- The key teaching point, paying off the diagram: **no foreign key to `user`.** Because a verification row can exist *before* the user does — during sign-up, the email is being verified before the account is confirmed. Keying by `identifier` (email) instead of `userId` is the deliberate, correct choice. This closes the loop on the diagram's lone unconnected table.

AnnotatedCode steps: identifier (color — the no-FK point), value, expiresAt. Keep brief; this table is the simplest.

### Deletion semantics — the foreign-key cascades

Goal: consolidate the cascade decisions into one place now that the student has seen all four tables, and connect to the project's FK conventions.

Content:
- `session.userId` and `account.userId` both cascade on delete. Removing a user is one statement that takes their sessions and their provider links with it — no orphan rows, no manual cleanup SQL. This is the project's `onDelete: 'cascade'` convention (owned children follow their parent) applied at the auth call site; tie back to the Drizzle FK standard (cascade for owned children).
- `verification` does **not** reference `user.id`, so nothing cascades — its lifecycle is governed by `expiresAt`, not by user deletion. Restate why (rows predate the user). This is the payoff of the "lone table" thread one final time.
- Senior reflex / watch-out, inline: if the cascade were missing on `session.userId`, deleted users would leave orphan session rows that can only be cleaned with hand-written SQL. The cascade is what makes "delete user" a single safe statement.

Components:
- Could reuse the ER diagram region or a tiny `Figure` highlighting just the two cascade edges vs. the unconnected `verification` — but avoid redundancy. Prefer a `TabbedContent` only if it genuinely adds clarity; otherwise prose + a one-line `Aside` (caution) on the orphan-rows failure mode is enough. Default to prose.

### Shipping the first migration

Goal: take the generated schema to actual tables in Postgres via the established Drizzle Kit pipeline.

Content:
- Same workflow as Chapter 040, no new tooling: `pnpm drizzle-kit generate --name add_auth_tables` produces the SQL migration (four `CREATE TABLE`s, the unique indexes on `user.email` and `session.token`, the foreign keys); `pnpm drizzle-kit migrate` applies it. Use the `--name` flag so the migration is intentionally named (project convention), not random.
- The review reflex, stated at the moment it applies: read the generated `migration.sql` before applying. Drizzle is reliable, but a review catches a dropped `NOT NULL` or a missing index early, and never ships an unread migration file. (Source-of-truth + the project's "review every generated migration" standard.)
- Name the failure mode the student is most likely to hit *next* chapter: skip the migrate step and the first `signUpEmail` call in Chapter 053 fails on a missing `user` table with an opaque Postgres error (`relation "user" does not exist`). Migrate now so future-you doesn't debug a "the library is broken" red herring.
- One forward-pointer sentence: in production this migration runs through CI (Chapter 097) and post-launch schema changes follow expand-migrate-contract (Chapter 099). Recognition-level, one line, then move on.

Components:
- `Code` (bash) showing the two commands. Optionally a trimmed `Code` (sql) excerpt of the generated `CREATE TABLE "user"` + the unique index + one FK so the student sees what "review the migration" actually looks like — keep it short, this is illustrative not exhaustive. A `Sequence` exercise (order the steps: edit adapter → generate schema → review → drizzle-kit generate → review SQL → migrate) could reinforce the workflow ordering if space allows; optional, lower priority than the build exercise below.

### Practice — build the account decomposition

Goal: the load-bearing exercise. Make the student *build* the part of the model that carries the lesson's central idea (one identity, many proofs), so the decomposition sticks through doing, not just reading.

Mechanics: `DrizzleSchemaCoding`. Provide a `starter` with a complete `user` table and a `session` table already written (so the student isn't re-deriving the whole model — that's the CLI's job, not theirs), plus a stubbed `account` table with the obvious columns present (`id`, `userId`, `providerId`, `accountId`) and a guiding comment. The student's task: add the `password` column (nullable text) on `account` and wire the `userId` foreign key to `user.id` with cascade. This targets exactly the misconception (password belongs on `account`, not `user`) and the cascade decision.

Requirements (graded):
- `account` table exists with `userId` referencing `user.id`, `providerId` notNull, `password` text and **not** notNull (nullable).
- `user` table has `email` unique + notNull (carried in starter; reinforces the DB-level uniqueness point).

Probe(s): a constraint-style probe demonstrating the cascade/uniqueness rather than relying on inline `.unique()`. Per the project's PGlite-harness constraints, declare uniqueness **table-level** (`(table) => [unique().on(table.email)]`) — an inline `.unique()` is not seen by this grader. Use bare `uuid('id').primaryKey()` or `text('id').primaryKey()` for ids with explicit literal ids in any seed, **not** a `uuidv7()` default (it fails CREATE TABLE in PGlite). A `mustSucceed: false` probe: inserting a duplicate `user.email` must be rejected (proves the DB-level unique). Optionally a `mustSucceed: true` probe inserting two `account` rows (one `'credential'` with a password, one `'google'` with `password` NULL) for the same `userId` — proving one identity can hold multiple proofs. Give probes disjoint seed rows.

Instructions string: frame the task in model terms — "Finish the `account` table so one user can prove their identity multiple ways: add the nullable `password` column and the cascading `userId` foreign key."

Critical authoring notes for the exerciser (from the PGlite-harness gotchas):
- Column requirement names match camelCase keys unless an explicit SQL-name string is written; the starter should use explicit snake-case strings (`text('user_id')`, `boolean('email_verified')`) consistent with the project, and requirements should match those SQL names.
- No `uuidv7()` default anywhere gradeable; no `pgEnum` (use `text` for `providerId`); table-level `unique().on(...)`, never inline `.unique()`.
- Keep `account`'s OAuth-token columns out of the exercise entirely — they'd bloat it without serving the goal.

If `DrizzleSchemaCoding` proves too constrained for the cascade probe, fall back to grading the cascade via `requirements` (the `references` field) and keep only the uniqueness probe — the `references` requirement already verifies the FK shape.

### External resources (optional)

One or two `ExternalResource` cards: the Better Auth "Database" / "Drizzle adapter" docs page and the "CLI" docs page. Keep to canonical official docs only.

## Scope

Already taught — redefine in one line if at all, do not re-teach:
- Drizzle fundamentals, `pgTable`, column builders, the `db` client, `casing: 'snake_case'` on the client, id conventions (UUIDv7), FK `onDelete` options — Unit 5 / Chapter 037. This lesson *uses* them; it does not teach them.
- Drizzle Kit `generate`/`migrate`, migration-file layout, the review-before-apply discipline — Chapter 040. This lesson reuses the pipeline; reference it, don't re-explain it.
- The `auth` instance, `drizzleAdapter(db, { provider: 'pg' })`, `server-only`, the env entries, the server-vs-client split — Lesson 1 of this chapter. The only edit here is adding the `schema` option; show just that delta.
- The opaque-session-token-in-cookie model, authn vs authz, OAuth/PKCE — Chapter 051 (conceptual). Tie `session.token` and `verification` (state/PKCE) back to it; don't re-derive it.

Deliberately deferred — name at most once, do not configure or build:
- `session` lifetime config (`expiresIn`, `updateAge`, `freshAge`) and cookie hardening (`__Host-` prefix, cookie cache) — Lesson 3 of this chapter.
- Reading the session at request time (`auth.api.getSession({ headers })`, `getCurrentUser`/`requireUser`, `proxy.ts`) — Lesson 4 of this chapter.
- Email/password and OAuth sign-up/sign-in flows, password hashing internals, the `useSession` hook, account-linking UI — Chapter 053. This lesson builds the *tables* those flows write to; it does not build the flows.
- `organization`/`member`/`invitation` tables and other plugin schemas (`passkey`, two-factor) — named as regenerate triggers only; full coverage Unit 9 / Chapter 053+.
- Index tuning beyond what the CLI emits (composite indexes on `account(providerId, accountId)`, non-unique `session(userId)`) — mention as a senior "review the access patterns" reflex at most one line in the migration or session section; the deep index-design treatment is Chapter 039's and the active-sessions read is Chapter 054's. Do not build custom indexes here.
- `additionalFields` / extending `user` with app columns (`role`, `timezone`, `locale`) — out of scope; these arrive with the features that need them (Chapter 053+, Unit 9, Chapters 083/084). Do not introduce the extension pattern here; it would dilute the four-table focus.
- Field/table-name remapping (`modelName`, `fields`) — one-line dismissal ("default is correct for greenfield; only remap when migrating off another system"), not a configuration walkthrough.
- Expand-migrate-contract for live schema changes — Chapter 099, one forward-pointer line only.
