# Lesson outline — Chapter 083, Lesson 1

## Lesson title

- Title: Storage, domain, edge
- Sidebar label: Storage, domain, edge

## Lesson framing

This is the load-bearing lesson of the chapter: it installs the **three-layer split for time** that every other lesson references. The split is `timestamptz` (UTC) in Postgres → `Temporal.Instant` in the domain (via one codec in `lib/temporal.ts`) → ISO 8601 on the wire → user's profile timezone at the edge, with `Date` confined to third-party seams. This lesson owns the *instant* pair (`timestamptz` ↔ `Temporal.Instant`); lesson 2 adds the *calendar-day* pair, lesson 3 the edge/profile-tz, lesson 4 schedules, lesson 5 arithmetic. Keep the boundary tight — name those other layers but do not teach them.

**Pedagogical posture.** The senior-mindset filter dominates: this is a *data-modeling and architecture* lesson, not a syntax tour. The student already has the raw materials — chapter 009 lesson 3 gave them the five Temporal types, the `lib/temporal.ts` seam, the `instantFromDate` converter, "Date at the seam," and ISO-8601-on-the-wire; chapter 037 lesson 3 gave them `timestamptz` vs. plain `timestamp` and the Drizzle `timestamp({ withTimezone: true })` builder. **Do not re-teach any of that.** The new contribution is the *named architecture* that ties those pieces together, plus exactly one new artifact: a Drizzle `customType` (`instantColumn`) that converts `timestamptz` ↔ `Temporal.Instant` at the column boundary (`fromDriver`/`toDriver`), and the understanding of why Drizzle's raw `mode: 'string'` text isn't directly Temporal-parseable. The lesson's job is to make the student see the three layers as a single discipline and reach for the custom column reflexively.

**Cognitive-load control.** Introduce the split as a three-box mental model *first* (storage / domain / edge), with the wire as the connective tissue between them, then trace one concrete value (an invoice's `createdAt`) through all three on a read and on a write. Every subsequent section attaches to one box or one boundary. Resist breadth: the chapter outline lists many watch-outs — fold each into the section teaching the concept it qualifies, never a "watch-outs" dump. Cut the genuinely niche items (`time without time zone`, `interval`, `timestamptz` arrays) to a single naming sentence.

**The senior hook (lesson intro, no header).** Open with the concrete decision from the chapter outline: a user clicks "create invoice" at 11:47 PM Pacific on March 8 2026 (US DST start); the Vercel function and Neon Postgres both run UTC; six months later the team adds a customer-facing audit log "in the user's timezone." Three storage architectures answer this differently — UTC-only `timestamptz`, local-as-string, `timestamp`-with-implicit-UTC — and only the first keeps *rendering* separable from *storage*. That separation **is** the three-layer split. This frames the whole lesson as "the one decision that lets you add the audit-log feature six months later without a migration."

**Mental model the student leaves with.** "An instant is stored as UTC bytes, read into the domain as a `Temporal.Instant` automatically by its custom column type, crosses every boundary as an ISO 8601 string, and only becomes a human-readable local string at the very edge — and `Date` is a foreign object I convert away the moment it appears." They should be able to declare the `instantColumn` custom type, explain why the conversion lives in the column, read a `Temporal.Instant` straight off a query row, and identify where `Date` is and isn't allowed.

## Lesson sections

### The three-layer split (h2)

The architecture, stated once, as the lesson's spine. Storage = Postgres, instants live as `timestamptz` (UTC). Domain = application memory, instants live as `Temporal.Instant`. Edge = the moment a value is rendered for a human, where the user's profile timezone enters. The **wire** (ISO 8601 strings) is the carrier between every layer. Make explicit *why* this separation is the senior default: it keeps storage and rendering independent, so "show this in the user's timezone" is a pure edge concern that never touches the column or the query.

Diagram (hero of the lesson). A horizontal three-zone strip — **Storage | Domain | Edge** — built as plain HTML+CSS inside `<Figure>` (matches the "color-coded segments with callouts" row of the diagram index; horizontal to respect the vertical-space constraint). Each zone shows its canonical shape: Storage box = `timestamptz` "8 bytes, µs since 2000 UTC"; Domain box = `Temporal.Instant`; Edge box = `"Mar 8, 2026, 11:47 PM PST"`. Between Storage↔Domain and Domain↔Edge, a small label on the connecting arrow reads `ISO 8601 'Z' string`. Pin a small `Date` chip floating *outside* the strip near the Domain box with a dashed "seam only" tether — visually reinforcing that `Date` is not a layer, it's a foreign object at the boundary. Pedagogical goal: one glance fixes the whole architecture and shows the student where each named concept in the rest of the lesson lives.

Reasoning: leading with the map before any code is the cognitive-load discipline — the student gets the skeleton, then every later section is "this attaches here."

### What `timestamptz` actually stores (h2)

Correct the name. Despite "with time zone," `timestamptz` stores **no** timezone — 8 bytes, microseconds since 2000-01-01 UTC. On `INSERT`, Postgres reads the session's `TimeZone` setting, interprets the input string *as that zone*, converts to UTC, stores. On `SELECT`, the same setting drives the text rendering. So the canonical-bug framing: a session set to `America/Los_Angeles` reading the same row as a UTC session produces *different* `text` output for the same stored bytes — even though the stored instant is identical. The senior defense: keep the session `TimeZone` at `UTC` (Neon and Vercel default to it; an explicit `SET TIME ZONE 'UTC'` in the db client is belt-and-suspenders) and always write inputs as ISO 8601 with `Z`.

This sharpens — does not repeat — chapter 037's `timestamptz`-vs-`timestamp` lesson. There the point was "pick `timestamptz`"; here the point is "understand the storage/session mechanic well enough to know why UTC-everywhere is non-negotiable, and why the rendering must move to the edge."

Component: a short `Code` block (SQL) showing the same row `SELECT created_at::text` under two session timezones producing two strings. Use `CodeTooltips` on `created_at::text` and on the two offset strings to label "same 8 stored bytes, different rendered text." Keep it to a few lines — this is illustrative, not an exercise.

`timestamp` (without time zone), the foil, gets exactly one paragraph: it stores the literal string untranslated, so two services writing "now" from different machines store different values for the same wall-clock moment; the Postgres wiki "Don't Do This" list names it; it appears only in rare data-pipeline cases where the source explicitly disclaims a timezone. Do not re-litigate — the student already met this in 037; one sentence of recall plus the new "untranslated literal" mechanic.

### The Drizzle column and its read mode (h2)

The senior decision this section installs is *not* the bare `timestamp({ withTimezone: true })` column from chapter 037 — it's a **Drizzle `customType` that maps `timestamptz` straight to `Temporal.Instant`**. This is a correction-of-course from the naive path, and the lesson must motivate *why* the plain column is insufficient before showing the custom type.

**Step 1 — the obvious-but-flawed column.** Show `createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow()` and ask: what does `mode: 'string'` actually hand back? FACT-CHECKED: Drizzle's `mode: 'string'` returns the *raw Postgres string* untransformed (e.g. `'2026-03-09 07:47:00.038+00'`) — **space-separated, `+00` offset, no `T`, no `Z`.** It is **not** ISO 8601. The two read modes: `mode: 'date'` (Drizzle's default) returns a `Date` — which smuggles every chapter-009 `Date` gotcha back in; `mode: 'string'` returns Postgres's native text, which `Temporal.Instant.from()` does not reliably accept (it wants the `T` separator per RFC 9557). So neither raw mode is the answer: `'date'` is the wrong type, `'string'` is the wrong *shape*. This sets up the custom type as the fix rather than presenting it cold. **Downstream-agent warning: do NOT write `Temporal.Instant.from(rawPostgresString)` at a call-site — the space-separated form is the trap.**

**Step 2 — the custom column type.** `lib/temporal.ts` exports an `instantColumn` (or `timestamptz`) factory built with Drizzle's `customType`, where the conversion lives *inside the column* so every read/write through the schema is automatic. Use `AnnotatedCode` on this block:

```ts
// lib/temporal.ts — built on the existing seam file
import { customType } from 'drizzle-orm/pg-core';

export const instantColumn = customType<{ data: Temporal.Instant; driverData: string }>({
  dataType: () => 'timestamp (3) with time zone',
  toDriver: (value) => value.toString(),                 // Instant → ISO 'Z' string
  fromDriver: (value) => Temporal.Instant.from(value.replace(' ', 'T')), // Postgres text → Instant
});
```

Annotate four steps:
1. `customType<{ data: Temporal.Instant; driverData: string }>` — `data` is the type application code sees; `driverData` is the string the Postgres driver moves. This generic *is* the contract: the schema column reads back `Temporal.Instant`, full stop.
2. `dataType: () => 'timestamp (3) with time zone'` — emits `timestamptz` with `precision: 3` in the migration. Name the µs-vs-ms asymmetry here, once: Postgres stores microseconds, `Temporal.Instant` (and the wire) carry down to ms; `precision 3` aligns storage to application resolution so a write→read round-trip doesn't drift on a dropped µs tail. Compare instants with `.epochMilliseconds` or `.equals()`, never string-equality across a round-trip.
3. `fromDriver` — the read seam. `value.replace(' ', 'T')` repairs Postgres's space-separated text into the `T`-separated form `Temporal.Instant.from` requires; `from` throws `RangeError` on malformed input (recall ch009), so this is also the parse gate for DB strings. This one line is the load-bearing fix the whole section built toward — give it the most prose.
4. `toDriver` — the write seam. `Instant.prototype.toString()` produces the canonical ISO 8601 `Z` string Postgres ingests cleanly.

Reasoning for the custom-type approach over a free-floating `{ fromDb, toDb }` object the call-sites must remember to invoke: putting the conversion *in the column* means the student can't forget to call it — `db.select()` already hands back `Temporal.Instant`, and inserts already accept it. The conversion is structural, not a discipline the call-site has to maintain. (The chapter outline sketches a `{ fromDb, toDb }` codec; the custom type is the same idea moved into the column boundary, which is the more robust shape — note this as a deliberate upgrade for downstream agents.) `.defaultNow()` still chains on (Postgres `CURRENT_TIMESTAMP`, server-side) — tie to "the server clock is the authority": never seed an instant column with `new Date()` or `Temporal.Now.instant()` in TS when the DB can seed it.

**The upgrade payoff** (already seeded in chapter 009): when the project moves from polyfill to native Node 26 Temporal, only the `Temporal` import at the top of `lib/temporal.ts` changes; every schema column and every consumer keeps working. One seam.

Wire-format symmetry, stated as the reason `toDriver` is one line: ISO 8601 strings with `Z` are the universal carrier. Postgres ingests instants from them; `Temporal.Instant.from(string)` parses them; `Instant.prototype.toString()`/`toJSON()` produce them; every API the course consumes (Stripe, Trigger.dev payloads, Resend) emits and accepts them. ISO strings cross *every* boundary; `Temporal` types live only in-memory between boundaries.

Diagram (strong addition): a `DiagramSequence` tracing one `createdAt` value across a **read** then a **write**, showing the custom column as the conversion point. Four-to-five steps:
- Read step 1: Postgres row → driver hands the custom type the raw text `'2026-03-09 07:47:00.038+00'` (highlight the space and `+00`).
- Read step 2: `fromDriver` repairs to `'2026-03-09T07:47:00.038+00'` and parses → `Temporal.Instant` lands in domain code automatically.
- Read step 3: domain code reads `.epochMilliseconds` / `.since(other)` — no conversion call in sight.
- Write step 1: domain produces a `Temporal.Instant`.
- Write step 2: `toDriver` → `'…Z'` ISO string → driver → `timestamptz`.
Pedagogical goal: make the space→`T` repair and the "conversion is inside the column, not at the call-site" both *visible*. Use `DiagramSequence` (not Figure-wrapped) per its self-card rule.

### What application code sees: Temporal, never Date (h2)

Ground the abstraction in three or four real call-sites so the student knows what the domain type looks like in hand. A row's `createdAt` is a `Temporal.Instant`; the student writes `invoice.createdAt.epochMilliseconds`, `.toString()`, `.since(other)` — never `.getMonth()`, never `.toISOString()` (those are `Date` methods that no longer exist on the value).

Use `CodeVariants` to group three related call-sites (the "group related files" use):
1. **List query** — a `db.select()` result row whose `createdAt` field is *already* a `Temporal.Instant` because the `instantColumn` custom type converted it on the way out. The point: no `.fromDb` call clutters the query — the column boundary did the work. (If a domain type is mapped, the field is simply `createdAt: row.createdAt`, type `Temporal.Instant`.)
2. **Server Action input** — receiving an instant; the action re-derives the server instant rather than trusting the client (links to next section).
3. **Route handler / RSC boundary serializing to the wire** — a `Temporal.Instant` cannot cross the RSC wire or a JSON response as-is (it's a class instance the wire rejects); emit `instant.toString()` (or rely on `toJSON()` via `JSON.stringify`) to produce the ISO string. This is the one place the student manually reaches for `.toString()` — the DB direction is automatic, the wire direction at a hand-written response is explicit.

Across all three, the invariant to surface: `Temporal` is the in-memory type, ISO 8601 is the wire/DB shape; the DB conversion is automatic at the `instantColumn`, and the only manual encode is when serializing to a hand-written wire response. Keep each variant short; the point is the *shape*, not feature-complete code.

A `Tokens` or `MultipleChoice` micro-check could fit here — e.g. given a value typed `Temporal.Instant`, which method calls are valid (`.epochMilliseconds`, `.since`) vs. invalid (`.getMonth`, `.toISOString`). Prefer a single `MultipleChoice`: "Three of these compile on a `Temporal.Instant`, one is a `Date` method that isn't there — which?" Low-cost recall that reinforces the type boundary.

### The server clock is the authority (h2)

Short, high-value section. From chapter 066's idempotency context: `createdAt`, `updatedAt`, `processedAt`, `expiresAt` — every server-meaningful instant — is set by the *server*, not the client. Two correct sources: Postgres `defaultNow()` (preferred when the DB can do it) or `Temporal.Now.instant()` in a server-side helper (when the value is computed in TS before insert). The anti-pattern: a Server Action that accepts `createdAt` in its input payload and writes it — that trusts the client clock, which can be wrong, skewed, or hostile. The fix is structural: drop the client-supplied instant and re-stamp server-side. Even a legitimately client-*originated* timestamp (e.g. "when the user pressed the button offline") is validated and re-reasoned at the seam, never trusted raw.

Reasoning: this is a one-paragraph senior reflex that prevents a whole bug class; it belongs inline next to `defaultNow()`, not in a watch-outs list.

### Where Date is still allowed (h2)

The narrow carve-out, so the student doesn't over-correct and try to purge `Date` from places it belongs (the over-correction chapter 009 lesson 3 explicitly warned against — restate briefly, don't re-teach). Two seams:

1. **Third-party SDKs that return a `Date`.** Stripe's SDK is the canonical case. Convert *immediately* at the seam with `instantFromDate` (the helper already in `lib/temporal.ts` from chapter 009), never propagate the `Date` inward. **The Stripe gotcha, named here:** Stripe's wire format is Unix *seconds* (10-digit), and while the SDK often wraps them in `Date`, raw webhook payload fields like `created` are seconds — multiply by 1000 before `Temporal.Instant.fromEpochMilliseconds`, or use the `instantFromUnixSeconds` helper from chapter 009. Off-by-1000 here produces timestamps in 1970.
2. **Stopwatch-style duration measurement** where the absolute value is meaningless and only the delta matters — `performance.now()` is the better reach anyway (sub-ms, monotonic). One sentence; recall from chapter 009.

Use a small `CodeVariants` (before/after) only if it earns its place — "raw Stripe `Date`/seconds at the seam" vs. "converted to `Temporal.Instant` immediately." Otherwise a single annotated `Code` block at the Stripe seam suffices.

The closing rule to land: `Date` at the seam, `Temporal` in the domain — the same rule from chapter 009, now made concrete against the storage layer.

### The two pairs, and what this lesson installed (h2)

Brief closing orientation (not a summary dump — a forward map). This chapter installs **two** Drizzle ↔ Temporal pairs: this lesson did `timestamptz` ↔ `Temporal.Instant`; lesson 2 adds `date` ↔ `Temporal.PlainDate`. Two custom column types, two domain types, one file (`lib/temporal.ts`). Name `time without time zone`, `interval`, and `timestamptz` arrays in a single sentence as real Postgres types the SaaS surface of this course doesn't reach for — so their absence from the pattern is deliberate, not forgotten.

Optionally end with one consolidating exercise: a `Buckets` sort — "instant column or not?" — feeding rows like `createdAt`, `processedAt`, `expiresAt`, `webhookReceivedAt` into "`timestamptz` + `Temporal.Instant`" vs. a decoy "calendar day (lesson 2)" bucket, so the student practices the *grammar test* (is the answer "this exact second"?) without yet owning the `date` half. Keep the decoy bucket's correct items minimal — this lesson hasn't taught `date` yet, so use it only as a "not this one, that's next lesson" signal.

### External resources (optional)

`ExternalResource` cards if they add value: Drizzle `timestamp` column docs (the `mode`/`precision` reference), the Postgres `timestamptz` docs, the Postgres wiki "Don't Do This" (already cited in 037 — only re-link if the timezone section is the focus). Keep to two or three; don't pad.

### Tooltip terms

Use `Term` for (most are recall, keep tooltips short and only where flow would otherwise break):
- **`timestamptz`** — Postgres timestamp-with-time-zone; stores a UTC instant, carries no zone (recall, but worth a tooltip given the misleading name).
- **codec** — the paired convert-in / convert-out functions that translate a value between two representations (here the custom type's `fromDriver`/`toDriver`, DB-text ↔ `Temporal.Instant`), kept in one place.
- **`customType` (Drizzle)** — a user-defined column type with `dataType`/`toDriver`/`fromDriver` hooks, letting a Postgres type read and write as any TypeScript type.
- **seam** — a boundary where the app meets something external (SDK, DB, wire), concentrated in one file so the rest of the code stays clean (recall from ch009; re-tooltip since it's load-bearing here).
- **`mode` (Drizzle)** — a per-column option that picks the JS type a column reads back as.
- **session `TimeZone`** — the per-connection Postgres setting that controls how `timestamptz` input is interpreted and output is rendered.

Do NOT tooltip: `Temporal.Instant`, ISO 8601, IANA, DST, polyfill — all defined in chapter 009 lesson 3 and assumed known; re-tooltipping clutters.

## Scope

**Prerequisites (recall briefly, do not re-teach):**
- The five Temporal types, the `lib/temporal.ts` seam, `instantFromDate` / `instantFromUnixSeconds`, "Date at the seam," ISO-8601-on-the-wire, the polyfill/Node-26 story, and "no date libraries" — all from **chapter 009 lesson 3**. Assume held. One-line recalls only.
- `timestamptz` vs. plain `timestamp`, the Drizzle `timestamp({ withTimezone: true })` builder, `.notNull()`, `.defaultNow()` — from **chapter 037 lessons 3–4**. Assume held.

**This lesson does NOT cover (defer explicitly):**
- Date-only columns and `Temporal.PlainDate` — **lesson 2**. (The `Buckets` decoy may point at it but must not teach it.)
- The user's `timeZone` profile column, `Intl.supportedValuesOf`, deriving-vs-storing tz, the hydration-mismatch fix via explicit `{ timeZone }` — **lesson 3**. Mention the *edge* layer exists; do not build it. The hydration-mismatch trap (ch030 L5) is named only as "why rendering moves to the edge," not solved here.
- Recurring jobs, DST, `Temporal.ZonedDateTime` disambiguation, Trigger.dev `schedules` `timezone` — **lesson 4**. `ZonedDateTime` may be named as "the type that attaches a tz downstream," not taught.
- Temporal arithmetic surface (`add`/`subtract`/`since`/`until`/`with`/`round`, month-end clamping, conversion graph) at depth — **lesson 5**. Call-sites here may *use* `.since()`/`.epochMilliseconds` illustratively, but the arithmetic isn't the subject.
- `Intl.DateTimeFormat`, `Intl.RelativeTimeFormat`, locale-aware rendering, `next-intl` tz config — **chapter 084**. The edge's *formatting* is entirely 084's territory; this chapter owns the substrate only.
- `time without time zone`, `interval`, `timestamptz[]` — named once, out of scope.

## Code conventions notes

- Codec lives in `lib/temporal.ts` per the canonical layout (`lib/` table: `temporal.ts — Temporal codecs (Unit 18+)`). Single import path for `Temporal` (`@/lib/temporal`); never import the polyfill elsewhere — the ESLint `no-restricted-imports` rule is promised in ch009, keep by discipline here.
- Time conventions section confirms: `Temporal` default, `Date` forbidden in domain (seam-only via the codec), `timestamptz` for instants, ISO 8601 on the wire. The outline matches.
- RSC wire rejects `Temporal.*` values (they're class instances) — encode as ISO strings (or epoch numbers for `Instant`) at the boundary. The "route handler serializes to wire" call-site must show the ISO-string encoding, not a raw `Temporal` value crossing the boundary. Worth one explicit sentence so the student doesn't try to pass an `Instant` as a Server Component → Client Component prop.
- Helper style: arrow functions bound to `const`, explicit return types where they aid the reader; the existing `instantFromDate` / `instantFromUnixSeconds` seam helpers from ch009 stay on disk and are reused for the Stripe seam.
- Deliberate divergence flagged for downstream agents: the chapter outline sketches the instant codec as a plain `{ fromDb, toDb }` object literal; this outline upgrades it to a Drizzle `customType` (`instantColumn`) so the conversion is structural at the column boundary rather than a call-site discipline. This is the more robust, current-best-practice shape and is the intended contract — not a simplification. The free-floating-object form is the path NOT taken.
- FACT-CHECKED gotcha that must survive into the lesson: Drizzle `timestamp({ mode: 'string', withTimezone: true })` returns Postgres-native text (`'2026-03-09 07:47:00.038+00'`, space-separated, `+00`), **not** ISO 8601 — so `Temporal.Instant.from()` needs the space→`T` repair inside `fromDriver`. Do not let any agent write `Temporal.Instant.from(rawDrizzleString)` without that repair.
