# Lesson 3 outline — Postgres data types, the 2026 subset

- **Title (h1):** Postgres data types, the 2026 subset
- **Sidebar label:** Postgres data types

---

## Lesson framing

This is a **reference/survey lesson**, not a single-concept build. The student finished L2 able to write a `pgTable` with bare builders (`uuid()`, `text()`, `integer()`, `timestamp()`) under a `casing: 'snake_case'` policy, but took every type *on faith*. L3 cashes that debt: for each column in a SaaS domain — names, prices, timestamps, IDs, enums, payloads, tags, IP addresses — what Postgres type is correct and which Drizzle builder maps to it.

**The senior frame that holds the whole lesson together: every type choice is a "reach for it when" decision, not a menu.** A junior asks "what types exist?"; a senior asks "what's the *correct* type for this column, and what's the trap in the obvious-but-wrong alternative?" So each type is taught as **default + trigger + the named anti-pattern it replaces** — not as a catalogue entry. The lesson's durable takeaway is a small *defaults table* the student can reach for on every future column, plus the muscle memory for four high-leverage traps: `varchar(n)`, plain `timestamp`, `float`-for-money, and `jsonb` for things you'll filter on.

**Cognitive-load management.** This lesson has the most surface area in the chapter and the biggest risk of becoming a flat wall of type names. Three tactics:
1. **Group by the *question the student is answering*, not by Postgres's type taxonomy.** Sections are "storing text," "storing money and numbers," "storing time," "storing IDs," "storing a set of choices," "storing a flexible blob," "storing a list," "storing an IP." Each is a thing the student actually needs to do.
2. **Lead each group with the default, then add the conditional.** Defaults before conditionals (pedagogical guideline). Text → `text`, full stop, *then* why not `varchar`. Money → `numeric`, full stop, *then* the float trap.
3. **The four "named once, never the answer" types** (`varchar`, plain `timestamp` without tz, `real`/`double precision` for money, `json` non-binary) are taught *inside* the section of the type they lose to — as the foil — never in a section of their own. Same for deferred types (PostGIS, `tsvector`, `bytea`) — one compact "named and deferred" subsection so the student knows the door exists and who owns it.

**Mental model the student should leave with.** "Postgres has ~40 types; a 2026 SaaS reaches for about eight, and each of the eight has one alternative that *looks* right and is the classic bug." They should be able to look at any column in a spec ("invoice amount," "created at," "tags," "webhook body," "actor IP") and name the builder + the modifier shape without hesitation, and explain why the tempting wrong choice is wrong.

**Where this connects to prior knowledge.** Pull the L2 running domain forward — `organizations`, `invoices` — and **upgrade `amountDue` from the placeholder `integer` (L2) to `numeric({ precision: 12, scale: 2 })`**; this is an explicit, called-out handoff (L2 continuity note flags it). The TS↔SQL `numeric → string` surprise links straight back to the casing-bridge "two worlds" framing from L2: just as column *names* differ across the boundary, column *runtime types* sometimes do too, and `numeric` is the one that bites.

**Code-component strategy.** This lesson is type-dense, so the spine is **`CodeVariants` for default-vs-trap comparisons** (the foil is the whole point of each section) and **short `Code` blocks** for the canonical shape. `AnnotatedCode` once, on the single most decision-rich line (the `jsonb().$type<>()` shape, where three things happen at once). One `DrizzleSchemaCoding` exercise where the student types each column of a small table choosing the right builder (the live "reach for it when" drill), and one `Buckets` classification (sort columns → correct type) as the fast recall check. A defaults **table** (plain markdown or a small HTML `<Figure>`) is the keeper artifact. No heavy diagrams — this is a survey; the visual payload is the comparison tabs and the lookup table, not box-and-arrow graphs.

**Tone/scope discipline.** `.notNull()` / `.primaryKey()` / `.default()` appear in shapes but are **named, not taught** — L4/L5 own modifiers and keys. Keep their explanations to a face-value parenthetical exactly as L2 did. UUIDv7-vs-bigint *decision* is L5's; here `uuid` is surveyed as a *type* with both generators named. Length caps, payload validation → "Zod owns this at the boundary (Ch 042)," named repeatedly as the partner to the database type, never taught.

---

## Lesson sections

### Introduction (no header)

Pick up directly from L2's closing cliff-hanger ("you wrote `uuid()` and `text()` without asking *why those types* — that's next"). State the goal: by the end, the student can look at any column in a domain and name the right Postgres type and Drizzle builder, and spot the tempting-but-wrong alternative. Motivate with the senior framing: Postgres ships ~40 types; a 2026 SaaS reaches for about eight, and **the skill isn't memorizing all forty — it's knowing the eight defaults and the one trap that shadows each.** Preview the running domain: we keep building `organizations`/`invoices` and add the columns a real invoice needs (amount, status, dates, a tag list, a webhook payload). Warm, brief, terse-adult per guidelines — no "what is a type" scaffolding.

End the intro by **surfacing the keeper artifact up front**: tell the student a per-column defaults table closes the lesson, so they read the body knowing it all condenses to a lookup they'll reuse.

### Names and free text: `text` is the default

**Concept:** `text` is the default string type — variable length, no cap, and in Postgres it has **identical performance to `varchar(n)`** (no scan-time penalty for being unbounded). This is the single most counterintuitive fact for students coming from MySQL/SQL Server where `VARCHAR(255)` is muscle memory.

**How to convey:** Lead with the flat rule — *strings are `text`, full stop.* Then immediately confront the reflex with the foil. Use a **`CodeVariants`** (two tabs):
- Tab "`varchar(n)` (the reflex)" — `name: varchar({ length: 255 })`, red-tinted. Prose: feels safe, encodes a "max length" — but it's a Postgres anti-pattern dressed as type safety. The 255 is arbitrary, it doesn't make storage smaller or reads faster, and the day the business says names can be 300 chars you ship a migration for a limit that bought you nothing.
- Tab "`text` (the default)" — `name: text()`, green-tinted. Prose: variable length, same performance, and the length rule — if there genuinely is one — belongs in **Zod at the API boundary (Ch 042)**, where it produces a friendly error, not a Postgres truncation. One source of truth for "max 100 chars," and it's the validator, not the column.

**Key teaching point to land:** length limits are a *validation* concern (UX, friendly errors), not a *storage* concern. The column is `text`; the cap lives in Zod. Name `varchar(n)` and `char(n)` once here as "never the right answer in this course" — `char(n)` especially (blank-padded, almost never wanted). Do not give them their own section.

**Tooltip candidates:** none new here; "DDL" if it appears.

### Money and numbers: the four-way decision

**Concept:** This is the highest-stakes section of the lesson — getting money wrong corrupts data silently. Four numeric types, a clear decision among them:
- `integer` (32-bit, ~±2.1 billion) — counts, quantities, small bounded numbers.
- `bigint` (64-bit) — counters past 2 billion, Unix-ms timestamps-as-numbers, IDs when not using UUID.
- `numeric({ precision, scale })` — **money and any value where binary floating-point rounding corrupts the answer.** The only safe currency type.
- `real` / `double precision` — floating point; named once, for analytics/scientific magnitudes where exactness doesn't matter. **Never money.**

**How to convey — lead with the trap, because money is where the real damage is.** Open with the concrete failure: storing a price as a float means `0.1 + 0.2 !== 0.3`, and across thousands of invoice lines the cents drift and the books don't balance. This is the kind of bug that doesn't crash — it just produces quietly wrong totals. Frame `numeric` as the fix: it stores exact decimal digits, no binary rounding.

Use a **`CodeVariants`** for the money decision specifically (the rest of the numeric types are a quick list):
- Tab "Float (the silent corruption)" — `amountDue: doublePrecision()` (or `real()`), red. Prose: looks fine, math *runs*, totals are subtly wrong. The bug ships because nothing errors.
- Tab "`numeric` (exact)" — `amountDue: numeric({ precision: 12, scale: 2 }).notNull()`, green. Prose: exact decimal, the course default for prices. `precision: 12, scale: 2` = up to 10 digits before the decimal, 2 after — comfortably handles SaaS invoice amounts. **Call out explicitly: this upgrades the placeholder `integer` `amountDue` from last lesson — money is `numeric` from here on.**

Then a short **`Code` + prose** beat for the **`numeric → string` boundary surprise**: Drizzle infers a `numeric` column as a TypeScript **`string`**, not `number`. Explain *why it's correct*: a JS `number` is a 64-bit float and can't hold arbitrary-precision decimals without the exact rounding problem `numeric` exists to avoid — so Drizzle hands you the digits as a string and money math happens with a decimal library, never raw `+`. Tie it back to L2's "two worlds" framing: names differ across the TS↔SQL boundary, and so does this one runtime type. (Foreshadow lightly: `$inferSelect` in L10 will make this concrete; here just plant that the string is deliberate, not a bug.)

Close with the **`integer` vs `bigint` line**: default `integer` for counts; reach for `bigint` past ~2 billion or for Unix-ms. Mention `bigint`'s `mode: 'number' | 'bigint'` in one sentence — `mode: 'number'` is safe up to 2^53, `mode: 'bigint'` for true 64-bit — but don't dwell; L5 owns `bigint` as an *identity PK*.

**Watch-outs to fold in (not a separate block):** float-for-money is the silent corruptor; `numeric` arrives as a string and that's the precision guarantee, not a defect — never `parseFloat` it for arithmetic.

**Tooltip candidates:** `precision` ("total number of significant digits stored"), `scale` ("digits after the decimal point"), `numeric` (Term: "exact decimal type — Postgres `NUMERIC`/`DECIMAL`, stores digits, not a float").

### Booleans: two flags or one enum

**Concept:** `boolean` for true/false. Short section. The *senior* nuance worth teaching: when you have multiple related true/false facts, decide between **two booleans** (when the states are orthogonal/independent — a row can be any combination) vs **one enum** (when the states are mutually exclusive — exactly one is true at a time).

**How to convey:** Quick `Code` block: `isArchived: boolean().notNull().default(false)`. Then one crisp prose contrast with a concrete example: `isPaid` + `isSent` are orthogonal (an invoice can be sent-but-unpaid, paid-but-not-sent, both, neither → two booleans) versus a `status` that is exactly one of draft/sent/paid/void (mutually exclusive → an enum, which the next-but-one section covers). This plants the enum motivation before the enum section. Keep it tight — this is a hinge, not a destination.

**Tooltip candidates:** none.

### Time: `timestamptz` is the only timestamp

**Concept:** The course's hard rule — **every timestamp is `timestamp({ withTimezone: true })`** (maps to Postgres `timestamptz`), which stores UTC and converts on I/O. Plain `timestamp` (without `withTimezone`) stores a naive wall-clock with no zone and is *never* the right answer in this course — it's the single most common Drizzle timezone bug.

**How to convey — lead with the bug, it's vivid.** Plain `timestamp` looks identical in code and works perfectly on your laptop. Then the app deploys to a server in another region, or a user in a different timezone reads the row, and a "created at 2pm" becomes 2pm-in-some-other-zone — off by hours, and it hides until exactly the moment a region boundary is crossed. `timestamptz` stores an absolute instant (UTC) and renders it correctly everywhere.

Use a **`CodeVariants`**:
- Tab "Plain `timestamp` (the hidden bug)" — `createdAt: timestamp()`, red. Prose: stores wall-clock with no zone; correct on one machine, wrong the day you deploy across regions. The bug is invisible until it isn't.
- Tab "`timestamptz` (always)" — `createdAt: timestamp({ withTimezone: true }).defaultNow().notNull()`, green. Prose: stores UTC, converts on read; the only timestamp shape the course writes. (`.defaultNow()` and `.notNull()` named at face value — L4 owns defaults; here just show the canonical `createdAt` shape so it's familiar.)

**Then the narrow exception, so the rule isn't dogma:** a recurring *local* time-of-day that must stay local regardless of zone — "the store opens at 9am local" — is genuinely not an instant. Model that as a `time` column **plus a separate `timezone` text column**, not `timestamptz`. One sentence; it's the honest carve-out, not a tool the student reaches for often.

**Calendar dates and time-only**, as a short tail to this section (don't make a separate header — they're "time" too):
- `date` for a calendar day with no time — `dueDate`, `billingDate`, `birthDate`. The trap to name: don't model a calendar day as a midnight `timestamptz`; midnight-where? `date` has no zone and is the right type for "a day."
- `time` and `interval` named once each (time-of-day; a span) — recognition only.

Mention every SaaS table carries `createdAt`/`updatedAt`; the *reusable-columns pattern* that factors them out is **L4's** — name it, don't build it.

**Watch-out folded in:** `timestamp` without `withTimezone` is the classic bug; `.defaultNow()` is only correct on `timestamptz` (on plain `timestamp` it stores server-local and the bug compounds) — but note L4 owns `.defaultNow()` so keep this to a one-line foreshadow.

**Tooltip candidates:** `timestamptz` (Term: "Postgres timestamp *with time zone* — stores an absolute UTC instant"), `withTimezone` ("the option that makes a `timestamp` column a `timestamptz`").

### IDs: `uuid` for surrogate keys

**Concept:** Survey `uuid` as a *type* (the PK *strategy* decision is L5's, kept out of scope here). `uuid` holds a 128-bit UUID; **Drizzle maps it to a TS `string`.** Two ways to generate a default value, named here so the student recognizes both:
- `.defaultRandom()` → Postgres `gen_random_uuid()` → a **UUIDv4** (fully random).
- `default(sql\`uuidv7()\`)` → **Postgres 18's built-in `uuidv7()`** → a time-sortable UUID (the senior reach for index locality).

**How to convey:** Short `Code` block showing both generator shapes side by side (a `Code` block with two commented lines, or a tiny two-tab `CodeVariants` "v4 / v7"). Keep the *why one over the other* deliberately shallow — say "v7 is time-sortable and better for index performance, v4 is fully random; **L5 makes this decision properly** and explains the trade-off." The job here is type recognition: `uuid` exists, maps to a string, has these two default generators. Note Postgres 18 (Sept 2025) shipped `uuidv7()` natively so no extension is needed — current and correct for the course's Postgres pin.

**Scope guard:** Do **not** teach the v4-vs-v7 write-amplification argument or `bigint identity` here — that's L5. Resist surveying it; just name that the decision is coming.

**Tooltip candidates:** `uuidv7` ("UUID v7 — embeds a timestamp prefix so IDs sort by creation time; native in Postgres 18"), `gen_random_uuid` ("Postgres's built-in UUIDv4 generator").

### A fixed set of choices: `pgEnum`

**Concept:** `pgEnum('invoice_status', ['draft', 'sent', 'paid', 'void'])` creates a real Postgres enum type **and** returns a Drizzle column builder you call like any other. Reach for it when the set of values is **small, stable, and mutually exclusive** (the invoice `status` from the booleans section). The alternative — a **lookup table** — wins when the set grows, the values need their own metadata (a label, a color, a sort order), or it's user-editable.

**How to convey:** This needs the *two-step shape* shown clearly because it's unlike the other builders (you declare the enum at module top, then use it as a column). Use a short **`Code`** block:
```
export const invoiceStatus = pgEnum('invoice_status', ['draft', 'sent', 'paid', 'void']);

export const invoices = pgTable('invoices', {
  // ...
  status: invoiceStatus().notNull().default('draft'),
});
```
Prose walks the two steps: `pgEnum(...)` returns a thing that is *both* a Postgres type and a column builder; you export it (like a table, it's part of the schema surface) and call `invoiceStatus()` in the column map. The values become a TS union (`'draft' | 'sent' | 'paid' | 'void'`) on `$inferSelect` later — impossible-states-unrepresentable at the database level, which connects to Principle #7 the student already met.

**The enum-vs-lookup-table decision** is the senior content here — teach it as a short "reach for `pgEnum` when / reach for a lookup table when" contrast in prose (a 2-row mental checklist, not a component). Trigger to promote to a lookup table: the values need metadata, or admins edit them at runtime, or the set is large/growing.

**Watch-out folded in:** `pgEnum` values are **easy to add, painful to remove** — dropping an enum value is a migration with teeth (you must guarantee no row uses it). So enums are for genuinely stable sets; if you can already imagine deleting a value, it might want to be a lookup table. (Connects forward: enum *migrations* are a Ch 040 concern — name, don't teach.)

**Tooltip candidates:** `pgEnum` (Term: "a named Postgres enum type — a fixed list of allowed string values").

### A flexible blob: `jsonb` with `$type`

**Concept:** `jsonb` stores structured JSON in a **binary, indexable, queryable** form. The course rule: **`jsonb` only, never `json`** (the non-binary variant — named once as the foil; it can't be indexed efficiently and has no upside here). The Drizzle-specific power move: **`.$type<WebhookEvent>()`** annotates the column with a TS shape so reads come back typed instead of `unknown`. Crucial honesty: **`$type` is a compile-time cast, not runtime validation** — Zod still validates the payload on the way in (Ch 042).

**How to convey:** This is the one line in the lesson where three things happen at once (the builder, the `$type` annotation, the fact that it's a *claim* TS trusts), so use **`AnnotatedCode`** on a single `jsonb` column declaration:
```
import { jsonb, pgTable } from 'drizzle-orm/pg-core';
import type { WebhookEvent } from '@/lib/webhooks';

export const webhookDeliveries = pgTable('webhook_deliveries', {
  // ...
  payload: jsonb().$type<WebhookEvent>().notNull(),
});
```
- Step 1 — `jsonb()`: binary JSON, indexable; the course never uses plain `json`.
- Step 2 — `.$type<WebhookEvent>()`: tells Drizzle the TS shape of what's inside; without it, reads are `unknown` and every read site casts. Color this step (blue).
- Step 3 — emphasize it's a **compile-time promise, not a runtime check**: Postgres stores whatever bytes you write; if the real payload doesn't match `WebhookEvent`, TS won't catch it — **Zod at the boundary is what actually enforces the shape** (Ch 042). This is the senior watch-out, surfaced at the exact line.

**The reach-for-it rule, in prose:** use `jsonb` for data that is genuinely shapeless or third-party-defined — incoming **webhook bodies**, **audit-log details**, flexible per-tenant **metadata**. **Skip it for anything you'll filter, sort, or join on** — the moment a `jsonb` field shows up in a `WHERE` repeatedly, that's **normalization debt**: promote it to a real column. Give the concrete heuristic: "if you find yourself reaching into the JSON in query predicates more than occasionally, it wanted to be a column."

**Scope guard:** `jsonb` *query operators* (`->`, `->>`, `@>`) are **Ch 038 L9** — name that querying-into-jsonb is a later skill, don't show the operators.

**Tooltip candidates:** `jsonb` (Term: "binary JSON — Postgres's indexable, queryable JSON type"), `$type` ("Drizzle compile-time type annotation — sets the TS shape, does not validate at runtime").

### A small ordered list: `text().array()`

**Concept:** Postgres has native array columns; `text().array()` (or `integer().array()`, etc.) stores an ordered list of primitives in one column. Reach for it when you need **a small, ordered list of scalars where a junction table would be overkill** — the classic example is a `tags: text().array()` on a row.

**How to convey:** Short `Code` block: `tags: text().array().notNull().default([])` (the `.default([])` named at face value). One paragraph on the *honest limitation that decides when to stop using it*: **array elements can't be foreign keys, can't be `JOIN`ed, and don't get referential integrity.** So the moment the list needs to point at *real rows* of another table (real tag entities with their own id/color/owner), or you need to query "all rows tagged X" efficiently at scale, you **switch to a junction table** — which is exactly **L8's** topic. Frame the array as the lightweight option and the junction table as where it graduates to; this sets up L8 cleanly.

**Watch-out folded in:** arrays are seductive because they're so easy — but a `text[]` of "tags" that the product later wants to rename, recolor, or list-all-by is a junction table you postponed. The trigger to switch: "would I ever want to `JOIN` on these, or give them their own attributes?"

**Tooltip candidates:** none new (`junction table` will be introduced properly in L8 — here a one-line gloss in prose suffices, no Term).

### Network addresses: `inet`

**Concept:** `inet` is a real Postgres type for IPv4/IPv6 addresses — the right reach for **audit-log actor IPs** and **request-origin** columns. It's indexed and queryable as a network type (subnet/range operations), which a plain `text` column can't do.

**How to convey:** Very short — one `Code` line (`actorIp: inet().notNull()`) and a sentence: store IPs as `inet`, not `text`, so they're real addresses the database understands (range queries, proper sorting) rather than opaque strings. This is a small but characteristically-senior choice (most people default to `text`), which is exactly why it earns a mention. Connects forward to audit-log tables (Unit 10+) — name, don't teach.

**Tooltip candidates:** `inet` (Term: "Postgres type for IP addresses — IPv4 and IPv6, queryable as networks").

### Named and deferred: types this course handles elsewhere

**Concept:** A compact "the door exists, here's who owns it" subsection so the student isn't surprised later and doesn't go hunting for these now. Keep it to a tight list (a `Card`/`CardGrid` or just a bulleted list), one line each:
- **Geographic** — `point` / `polygon` / `geography` (PostGIS). Out of scope for the course.
- **Full-text search** — `tsvector`, built as a *generated column*. **Ch 038 L8** owns it.
- **Binary blobs** — `bytea`. The course **doesn't** store binary in Postgres; it puts files in **object storage (R2)** and keeps a URL/key column (`text`). Named so the student knows the deliberate architectural choice.

**How to convey:** Purely a recognition map — no code, no depth. The pedagogical goal is *closing doors cleanly* so the survey feels complete and the student trusts that "not here" means "deliberately elsewhere," not "forgotten."

**Tooltip candidates:** none.

### The per-column defaults table

**Concept:** The keeper artifact — the lookup the whole lesson condenses to. A compact reference mapping the **kind of column → default builder shape**, so the student has one place to reach for on every future column.

**How to convey:** A clean **table** (markdown table, or wrapped in a `<Figure>` with a caption if it reads better as a styled card). Rows (column-kind → builder):
- Name / free text → `text()`
- Money → `numeric({ precision: 12, scale: 2 })`
- Count / small number → `integer()`
- Big number / Unix-ms → `bigint({ mode: 'number' })`
- True/false → `boolean()`
- Timestamp → `timestamp({ withTimezone: true }).defaultNow()`
- Calendar day → `date()`
- ID (surrogate) → `uuid()` (+ `uuidv7()` default — L5)
- Fixed set of states → `pgEnum(...)`
- Flexible payload → `jsonb().$type<T>()`
- Small scalar list → `text().array()`
- IP address → `inet()`

Caption/note: modifiers (`.notNull()`, defaults, keys) are L4/L5 — this table is about picking the *type*. Tell the student this is the table to bookmark; it's the practical residue of the lesson.

**This section can immediately precede the exercises** so the student practices with the lookup fresh.

### Practice: type each column (exercise)

**Concept:** The live "reach for it when" drill — student writes a small table choosing the correct builder per column. This is where survey-knowledge becomes a reflex.

**Component:** **`DrizzleSchemaCoding`**. Give a partially-built table (`organizations` done, as in L2) and have the student complete an `invoices`-adjacent table whose columns force each major decision:
- a `text` name,
- an `amountDue` **money** column (must be `numeric`, not `integer`/float),
- a `status` (must be the `pgEnum`, provided/imported in the starter),
- a `createdAt` **`timestamptz`** (must be `withTimezone: true`),
- a `dueDate` **`date`**,
- a `payload`/metadata **`jsonb`**,
- a `tags` **`text[]`**.

`requirements` assert each column's SQL type by prefix — e.g. `amount_due` → `type: 'numeric'`, `created_at` → `type: 'timestamp'` (the component's prefix match treats `timestamp with time zone` as `timestamp`, per its doc), `tags` → `text` array, `payload` → `jsonb`, `due_date` → `date`. **Building-agent note:** the component's `ColumnRequirement.type` is a prefix match and does **not** distinguish `numeric` precision/scale or `timestamp` *with* vs *without* tz — so add **probes** to pin the two highest-stakes choices: (a) a probe that inserts an out-of-range/over-scale money value the `numeric(12,2)` should round/reject appropriately, and (b) if feasible, a probe asserting the timestamp column accepts a tz-qualified literal. If a probe can't cleanly distinguish tz, state that in the instructions and lean on the requirement + a comment. Prefer requirements where they suffice; reach for probes only for `numeric` exactness and enum membership (a probe inserting a `status` value outside the enum must fail).

`instructions`: "Complete the `invoices` table. Pick the *correct* Postgres type for each column — the grader checks the emitted SQL type, so an `integer` where money belongs, or a `timestamp` without a time zone, will fail."

Each ✗ should name the missing/wrong piece.

### Quick check: sort each column to its type (exercise)

**Concept:** Fast, no-code recall of the central default-per-column mapping — the complement to the coding drill, catching students who can *recognize* but not yet *recall*.

**Component:** **`Buckets`** (`twoCol`), buckets = the major types, chips = real-world column descriptions the student sorts:
- Bucket `numeric` (label "numeric", desc "exact decimal — money") ← "An invoice's total amount", "A product's unit price"
- Bucket `timestamptz` (label "timestamptz", desc "timestamp with time zone") ← "When a row was created", "When an email was sent"
- Bucket `text` (label "text", desc "variable-length string") ← "A customer's name", "A free-form note"
- Bucket `jsonb` (label "jsonb", desc "flexible JSON payload") ← "A third-party webhook's raw body", "Per-tenant settings blob"
- Bucket `enum` (label "pgEnum", desc "fixed set of states") ← "Invoice status: draft / sent / paid / void"
- Bucket `date` (label "date", desc "calendar day, no time") ← "An invoice's due date", "A user's birthday"

`instructions`: "Sort each column into the Postgres type a 2026 SaaS would reach for."

**Optional second micro-check** (only if the section count allows without bloat): a single **`MultipleChoice`** on the sharpest trap — "Why store an invoice amount as `numeric` instead of `double precision`?" with the correct answer naming binary float rounding / silently wrong totals, and a distractor like "numeric is faster" (it isn't) to test real understanding over recall.

### Closing

Recap the through-line: ~eight defaults, each shadowed by one tempting-but-wrong alternative — `text` not `varchar`, `numeric` not float, `timestamptz` not plain `timestamp`, `jsonb` (typed with `$type`) for blobs but real columns for anything you'll filter on, `pgEnum` for stable state sets, `text[]` for light lists that graduate to junction tables, `inet` for IPs. Re-point to the defaults table as the bookmark. Name the explicit handoff: every column now has a *type*; **L4 decides the three per-column modifiers — can it be null, does it carry a default, is it generated** — starting with `.notNull()` and `.defaultNow()`, the calls the student has been writing on faith. One sentence cliff-hanger into L4.

### External resources

`ExternalResource` cards (CardGrid), matching L2's pattern:
- **Drizzle ORM — PostgreSQL column types** (`https://orm.drizzle.team/docs/column-types/pg`) — the canonical builder reference for every type in this lesson.
- **PostgreSQL 18 — UUIDv7** (a current Postgres 18 reference for `uuidv7()`) — for the native time-sortable UUID generator.
- Optionally a short explainer on **why floats can't represent money** (a reputable decimal/IEEE-754 primer) if a good one is found — reinforces the highest-stakes decision.

---

## Scope

**Already taught (do not re-teach; redefine in ≤1 sentence if needed):**
- `pgTable(name, columns)` shape, the key→builder pairing, bare builders, the **`casing: 'snake_case'`** bridge, `logger: true`, the `db/` folder, the export-or-it-doesn't-exist rule — **L2**. Assume fluent; build on it.
- `db/schema.ts` as source of truth, the derivation-tree mental model — **L1**.
- Principles #1 (co-locate), #6 (explicit over magic), #7 (impossible states unrepresentable) — prior chapters; the student has met these, reference by name when `pgEnum` lands.

**Reserved for later lessons (name as a forward reference, do NOT teach):**
- **Column modifiers** — `.notNull()`, `.default()` / `.defaultNow()` / `.$defaultFn()`, `.generatedAlwaysAs()`, the **reusable-columns pattern** (`db/columns.ts`) — **L4**. Modifiers appear in shapes *named at face value only*, exactly as L2 treated `.primaryKey()`/`.notNull()`.
- **Primary-key strategy** — UUIDv7 vs `bigint generatedAlwaysAsIdentity`, surrogate-vs-natural, write-amplification — **L5**. Here `uuid` and `bigint` are surveyed as *types*; the *decision* is explicitly deferred.
- **Foreign keys / `references()` / `onDelete`** — **L6**. The `organizationId` FK is not declared in this lesson's snippets beyond what L2 already showed.
- **UNIQUE / CHECK constraints** — **L7** (incl. case-insensitive uniqueness via generated columns).
- **Junction tables** (the array→junction graduation lands here) — **L8**.
- **Relations v2** — **L9**.
- **`$inferSelect` / `$inferInsert`** mechanics — **L10**. The `numeric → string` and `jsonb → $type` inference *outcomes* are previewed as motivation only; the type-derivation machinery is L10's.
- **`jsonb` query operators** (`->`, `->>`, `@>`) — **Ch 038 L9**. **Full-text `tsvector`** — **Ch 038 L8**.
- **Zod validation** of payloads / length caps at the boundary — **Ch 042**. Named repeatedly as the database type's partner; never taught.
- **Object storage (R2)** for binary instead of `bytea` — **Unit 13/Ch 14**. Named in the deferred-types list.
- **Enum migrations / adding-removing values mechanics** — **Ch 040**.

---

## Code-convention notes & deliberate divergences

- **Builder argument style:** use **bare builders** under the `casing` policy (`text()`, `numeric({ ... })`), matching L2's established shape — no SQL-name string argument except the genuine legacy-override case (not needed in this lesson).
- **`numeric` option form:** use the **object form** `numeric({ precision: 12, scale: 2 })` — this matches current Drizzle docs (verified June 2026). The chapter outline wrote the positional `numeric(12, 2)`; the object form is the canonical current shape, so prefer it. (If a snippet shows the named-column form it'd be `numeric('amount_due', { precision: 12, scale: 2 })`, but under `casing` we drop the name.)
- **Money default:** course standard is `numeric({ precision: 12, scale: 2 })` for prices (Code conventions, Data layer). This lesson is where that default is established for the running domain, **overriding L2's placeholder `integer` `amountDue`** — call the upgrade out explicitly (L2 continuity note expects this).
- **`timestamptz` shape:** `timestamp({ withTimezone: true })` is the only timestamp form (Code conventions: `timestamptz` for instants, `date` for calendar days). The canonical `createdAt` is `timestamp({ withTimezone: true }).defaultNow().notNull()` — show it, attribute the modifiers to L4.
- **UUID generator:** Code conventions standardize **UUIDv7** for user-facing PKs (`uuidv7()`), with v4 (`gen_random_uuid()`/`.defaultRandom()`) named as the alternative. This lesson *surveys both*; the *standardization decision* is L5. Postgres 18 native `uuidv7()` verified (released Sept 2025) — no extension needed.
- **No `enum` keyword:** Code conventions forbid TS `enum`; `pgEnum` is a Postgres enum type, not a TS `enum` — no conflict, but if any TS-side union is shown, it's a string-literal union (from `pgEnum`'s values), never a TS `enum`.
- **`jsonb`/`$type` honesty:** Code conventions treat hand-validating schemas as a smell and route validation through Zod (drizzle-zod, Ch 042). Reinforce that `$type` is a compile-time annotation and Zod is the runtime gate — do not imply `$type` validates.
- **Drizzle-version posture:** stay on the **stable Drizzle surface** (matching L2's deliberate choice to teach stable, not the 1.0 beta). All builders in this lesson (`text`, `numeric`, `timestamp`, `uuid`, `jsonb`, `pgEnum`, `.array()`, `inet`, `bigint`) are stable and unchanged in 1.0 — **no version parenthetical needed in this lesson** (unlike L2's casing note). Confirmed against current `orm.drizzle.team` column-types docs (June 2026).
