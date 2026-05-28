# Lesson 3 outline — Date's problems and the Temporal pivot

- **Title (h1):** Date's problems and the Temporal pivot
- **Sidebar label:** Date and Temporal

## Lesson framing

Chapter-closing lesson of Unit 1. Lands the **type pivot** away from `Date`: catalogues the design flaws of `Date` that bite production, introduces `Temporal` as the modern replacement (Stage 4 March 2026, unflagged in Node 26 from May 5, 2026), names the five Temporal types at one-line depth, and installs three rules the rest of the course rides on. Unit 17 (Chapter 083) owns the full architecture (storage/domain/edge codecs, arithmetic surface, DST, formatting) — this lesson is the *type-pivot setup*, not the architecture.

Pedagogical posture:

- **Bug-first motivation.** Students already know `new Date()`; few have lived the three canonical production bugs (DST reminder drift, date-line invoice off-by-one, audit-log timezone smear). Lead with one concrete bug, then generalize. The senior question the lesson answers: *what time type should a 2026 SaaS speak?*
- **Cognitive-load staging.** Don't dump eight `Date` flaws + five Temporal types + the polyfill story in one pass. Three passes: (1) the bugs `Date` causes, (2) what Temporal is and how it fixes each bug, (3) the runtime/polyfill seam plus the three rules.
- **Type pivot, not arithmetic tutorial.** The lesson refuses to teach `add`/`subtract`/`since`/`until`/`with`/`round` at depth — that's lesson 5 of chapter 083. The student should leave knowing *which type to reach for*, not how to do month arithmetic. A single illustrative `add({ days: 30 })` call appears once.
- **Senior posture installed via rules.** Three muscle-memory rules: never `new Date(y, m, d)` or `date.setX(...)`; convert SDK `Date` to `Temporal.Instant` at the seam; import `Temporal` from `lib/temporal.ts`, never the polyfill or global directly.
- **Anti-`Date.prototype` arithmetic, not anti-`Date` existence.** `Date` doesn't leave the codebase — it stays at SDK and `performance.now()`-style seams. The carve-out is named explicitly so students don't over-purge.
- **Pre-empt the "but I know date-fns" reflex.** Name `date-fns`/`dayjs`/`luxon`/`moment` once, retire them once. A 2026 project does not install a date library.

Connections to prior lessons: lesson 1 of chapter 009 (`Date` is one of the four JSON serialization holes; the wire is ISO 8601 strings, parse-then-narrow); lesson 2 of chapter 009 (`Date` is a class — same JSON-stringify-drops-methods reasoning; `Temporal` types also need `toJSON` awareness at the wire seam); chapter 008 errors (Temporal *throws* on invalid input — the right channel for malformed time data).

Continuity intent for chapter 083: this lesson is the *door*; lesson 1 of chapter 083 walks through it to the Drizzle `timestamptz` codec. The `lib/temporal.ts` file gets named here but contains only the polyfill re-export and a two-function codec (`instantFromDate` / `dateFromInstant`).

## Lesson sections

### Introduction (no h2)

Open with one bug story, two paragraphs maximum:

- **The bug.** A reminder-email job scheduled for "9 AM in user's timezone, every Monday morning". Implemented as `new Date(lastFireTime.getTime() + 7 * 24 * 60 * 60 * 1000)`. Twice a year the email fires an hour early or an hour late — DST. Senior diagnosis: the bug is structural, not in the math. The type `Date` doesn't know what "9 AM in Sydney" means; it only knows a UTC millisecond. Any code that adds 24 hours to a UTC millisecond is a DST bug.
- **The pivot.** Cue: the platform finally has a fix. Temporal landed at TC39 Stage 4 on March 11, 2026 and shipped unflagged in Node 26 on May 5, 2026 — the course's deploy target. This lesson catalogs `Date`'s flaws, introduces the Temporal type catalog, and installs the three rules the rest of the course imports.

No "what is a Date" preamble. Adult tone, terse, assumes competence.

### Why Date keeps causing production bugs

Goal: the student finishes the section knowing the bugs are structural, not "you held the API wrong". Pedagogical approach: bug-catalog, each flaw paired with a one-line concrete example. Use a single `<details>`-collapsed section with a `<Buckets>` exercise at the end to lock in recall — student sorts behaviors into "Date misfeature" vs "fine".

Cover the eight flaws, grouped into three clusters for cognitive scaffolding:

1. **The API traps.** Zero-indexed months / one-indexed days (`new Date(2026, 0, 31)` is January 31), in-place mutation (`date.setMonth(5)` mutates the caller's value), no duration type (30 days = `30 * 24 * 60 * 60 * 1000`, breaks on DST).
2. **The semantic traps.** Format-determined timezone parse (`new Date('2026-05-15')` is UTC; `new Date('2026-05-15 00:00')` is local — the space changes the meaning), `Invalid Date` sentinel (`new Date('garbage')` returns a `Date` with `NaN` time — type system says it's a Date, runtime says it isn't), unstable `toString()` (locale and tz dependent, different in dev and prod).
3. **The precision traps.** Year 100 problem (`new Date(99, 0, 1)` is 1999 not 99 — legacy two-digit-year heuristic), millisecond-only precision (Postgres `timestamptz` is microseconds; `performance.now()` is sub-millisecond — `Date` is the lossy middle).

Component choice: a single `Code` block per cluster with `// →` output comments for each line; the student reads, doesn't run. The eight flaws fit in ~20 lines total. Use a `PredictOutput` for one selected trap to force engagement — specifically the **format-determined timezone parse**:

```js
console.log(new Date('2026-05-15').toISOString());
console.log(new Date('2026-05-15 00:00').toISOString());
```

Expected output depends on the runtime tz; provide one expected for UTC machines and note that's the trap. `PredictWhy` explains the ISO-date branch is parsed as UTC by spec, the space-separated branch is parsed as runtime-local. Use the `Aside` to note that even running this in their own browser console will give a different second line than another student running in a different tz — that's the bug, not a quirk.

After the catalog, summarize: each of these is the same shape — `Date` overloads one type (instant + calendar + clock) onto one shape (UTC milliseconds + local-tz formatters). The cure is *more types, not more methods*.

`<Term>` tooltips this section: *DST* (daylight saving time), *IANA tz* (timezone database identifier like `Europe/Madrid`), *sentinel value*.

### The three canonical production bugs

Goal: connect the API flaws to operator-visible bugs. Three vignettes the student can imagine in a real SaaS. One paragraph each, named by the symptom:

1. **The DST reminder drift.** The Monday-morning email fires an hour off twice a year. Naive `+24h` arithmetic against a UTC instant. Cure: `Temporal.ZonedDateTime` with `add({ days: 1 })` — month/day arithmetic that knows about wall clocks.
2. **The Sydney date-line invoice.** "Invoices due May 15" displayed in Sydney as "due May 14" because the row is `2026-05-15T00:00:00Z` and Sydney's local date is 10 AM May 15. Cure: `Temporal.PlainDate` — a calendar date with no time, no tz, stored in Postgres `date` (not `timestamptz`).
3. **The audit-log timezone smear.** Server formats `toLocaleString()` in a Server Component; the server clock is UTC, every user sees "0:14 UTC" regardless of their tz. Cure: store `Temporal.Instant`, format at the boundary with the user's profile tz (lesson 3 of chapter 084).

Each vignette is one paragraph plus a one-line "cure: ..." pointing at the right Temporal type. Don't show code for the cure yet — it's name-only. Code follows in the next section.

Pedagogical reason: humanize the catalog. Eight flaws are abstract; "the email fired at 6 AM Sunday for half the year" sticks.

### Temporal, the type catalog

Goal: introduce the five types at one-line depth, mapped to the bugs they kill. Pedagogical approach: a single visual table (HTML `<table>` inside `<Figure>`) with five rows. Each row is one Temporal type, one-line "what it names", and the column it pairs with in Unit 17.

Table columns: **Type** | **What it names** | **Use it for** | **Postgres column** (forward-pointer to lesson 1/2 of chapter 083, not taught here).

Rows:

- `Temporal.Instant` — a UTC point in real time, nanosecond precision, no timezone — server timestamps, `createdAt`, `lastSeenAt` — `timestamptz`.
- `Temporal.ZonedDateTime` — an `Instant` plus an IANA timezone — DST-aware arithmetic, "next Monday 9 AM in user's tz" — derived, not stored as a column.
- `Temporal.PlainDate` — a calendar date (year/month/day), no time, no tz — `dueDate`, `birthDate`, "May 15" semantics — `date`.
- `Temporal.PlainDateTime` — wall-clock date and time, no tz — rare; named once. Use for "5 PM local" with no commitment to which local — most domain code doesn't need it.
- `Temporal.Duration` — an explicit period (`{ years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds }`) — "30 days", "1 month", "2 hours" — not stored; computed.

After the table, one paragraph each:

- **The type tells you what you have.** This is the key shift. `Date` lets you write `due.getHours()` on a calendar date — the API doesn't refuse. Temporal does: `PlainDate` has no `getHours()`. The type refuses ambiguity at compile and runtime.
- **Immutability everywhere.** Every operation returns a new instance. `instant.add({ minutes: 5 })` does not mutate `instant`. Pair with lesson 6 of chapter 002's `const` discipline — same shape.
- **Errors over sentinels.** `Temporal.Instant.from('garbage')` throws a `RangeError`. No `Invalid Instant` sentinel. The catch belongs at the parse seam (lesson 1 of chapter 009 already installed the discipline for JSON parsing — Temporal `from()` rides the same pattern).

Component choice: `<TabbedContent>` with three tabs — **Table** (the five-type table), **Code** (one short example per type showing construction; ~10 lines total in one fenced block), **Compared to Date** (a two-column comparison table: `new Date('2026-05-15')` → `Temporal.PlainDate.from('2026-05-15')`; `Date.now()` → `Temporal.Now.instant()`; `+ 30 * 86400000` → `.add({ days: 30 })`). The tabbed surface lets the student pick the angle that lands for them.

`<Term>` tooltips this section: *nanosecond*, *immutable* (link to ch 002 if it was covered there).

### The runtime story, May 2026

Goal: install the polyfill seam pragmatically. Pedagogical approach: short and concrete. The student needs to know (a) where Temporal is native, (b) where it isn't, (c) what the project does about it.

Three paragraphs:

- **Stage 4 and Node 26.** Temporal hit TC39 Stage 4 on March 11, 2026 (ECMAScript 2026 specification). Node 26 shipped unflagged on May 5, 2026 — the course's deploy target on Vercel's Node 26 runtime. Node 26 promotes to LTS in October 2026.
- **Node 24 LTS, the gap.** Production codebases not yet on Node 26 (the line still on Node 24 LTS until October 2026) don't have native Temporal. The fix is a polyfill. Two ship in 2026: `temporal-polyfill` (FullCalendar, ~20 KB gzipped, the project's pick) and `@js-temporal/polyfill` (TC39 champions, ~45–60 KB gzipped depending on version, the heavier reference). Course choice: `temporal-polyfill` for the smaller bundle.
- **Browser support, not a blocker.** Firefox 139 enabled Temporal mid-2025. Chrome 144 ships in 2026. Safari pending. The course renders dates server-side and ships ISO 8601 strings to the client — browser Temporal support is not on the critical path. Lesson 3 of chapter 084 will own the locale-aware formatting story.

Component choice: a compact `<Figure>` with a small support-matrix table (Runtime | Native Temporal | Course's reach), three rows: **Node 26+** (Yes, native, no import) | **Node 24 LTS** (No, `temporal-polyfill` from `lib/temporal.ts`) | **Browser** (Partial, server-rendered strings).

### The lib/temporal.ts seam

Goal: install the canonical import path. This is the load-bearing convention the rest of the course depends on. Pedagogical approach: show the file, explain each line, then enforce the rule.

Show one `Code` block with the polyfill re-export shape (and the runtime-guarded alternative under it):

```ts
// lib/temporal.ts
import { Temporal } from 'temporal-polyfill';

export { Temporal };
```

Use `AnnotatedCode` (one fenced block, multiple highlighted regions with stepped prose) to walk three points:

1. **Why one import path.** Every application file imports `Temporal` from `@/lib/temporal`, never from `temporal-polyfill` directly, never from `globalThis.Temporal`. Mixing native and polyfill `Temporal` in the same process breaks `instanceof` checks and `from()` cross-type interop — they look identical and aren't. The single seam means the upgrade to Node 26 native is one line: swap the import.
2. **The runtime-guarded form.** Show the alternate body:
   ```ts
   import { Temporal as TemporalPolyfill } from 'temporal-polyfill';
   export const Temporal = globalThis.Temporal ?? TemporalPolyfill;
   ```
   Explain when to use it (projects that toggle between Node 24 and Node 26 in CI/local/prod) and when not to (a project pinned to one Node version — pick the simpler form).
3. **The codec stubs.** Mention that `lib/temporal.ts` will grow two more functions in Unit 17 — `instantFromDate(d: Date): Temporal.Instant` and `dateFromInstant(i: Temporal.Instant): Date`. The next section lands the `instantFromDate` shape; the rest is deferred.

After the annotated walkthrough, a `<Aside type="caution">` with the one critical risk: never `import { Temporal } from 'temporal-polyfill'` outside `lib/temporal.ts`. The course's ESLint config (later) will enforce this with `no-restricted-imports`; for now, the rule is by discipline.

`<Term>` tooltips: *polyfill* (a runtime shim that implements a not-yet-native API in JavaScript so existing code can use it before platforms ship it).

### Date stays at the seam

Goal: prevent the over-correction reflex. `Date` doesn't disappear — it lives where the platform and SDKs hand it back. Pedagogical approach: explicit carve-out, two named cases, one converter.

Cover three points:

1. **SDK ingress.** Stripe's SDK hands back `Date` instances on `created`, `current_period_end`, etc. (Stripe's wire format is Unix seconds; the SDK wraps them in `Date` for you.) Convert at the seam:
   ```ts
   import { Temporal } from '@/lib/temporal';

   export const instantFromDate = (d: Date): Temporal.Instant =>
     Temporal.Instant.fromEpochMilliseconds(d.getTime());

   // For Stripe's raw Unix seconds:
   export const instantFromUnixSeconds = (s: number): Temporal.Instant =>
     Temporal.Instant.fromEpochMilliseconds(s * 1000);
   ```
   Application code reads `Temporal.Instant` exclusively. The Stripe adapter (`lib/billing/`, deferred to Unit 12 per ch 009 L2 continuity) is the only place that touches `Date`.

2. **Stopwatch measurements.** `Date.now()` for "how long did this operation take in milliseconds" measurements where absolute time doesn't matter. `performance.now()` is the better reach when it's available (sub-millisecond, monotonic). Neither produces a value that crosses into the domain.

3. **The rule.** Everything that gets *stored* (Postgres), *displayed* (UI), *compared* (filters), or *scheduled* (Trigger.dev) is `Temporal`. Anything that's a measurement seam can be `Date.now()` or `performance.now()`.

Component choice: `<CodeVariants>` with two tabs — **At the seam** (the conversion code above) | **In application code** (a placeholder service function showing `Temporal.Instant` parameters and return, no `Date` in sight). Each variant tab gets one short paragraph of framing.

`<Term>` tooltips: *seam* (a boundary in the code where the application meets something external — SDKs, the DB, the wire — see ch 008 + ch 009 L1).

### The three rules

Goal: lock the lesson into muscle memory. Pedagogical approach: a compact `<Steps>` enumeration with each rule restated in imperative voice.

1. **Never `new Date(year, month, day)` or `date.setX(...)`.** In application code. Construction goes through `Temporal.PlainDate.from('2026-05-15')` or `Temporal.Now.instant()`. Mutation doesn't happen — every Temporal operation returns a new instance.
2. **Convert SDK `Date` to `Temporal.Instant` at the seam.** Use the `instantFromDate` codec in `lib/temporal.ts`. No `Date` propagates inward from third-party SDKs.
3. **Import `Temporal` from `@/lib/temporal`.** Never from `temporal-polyfill` directly, never from `globalThis.Temporal`. One seam, one import path, one place to swap when Node 26 lands as the project's pinned runtime.

After the `<Steps>`, one paragraph: these three rules are the *pivot*. The architecture rides on top in Unit 17 (Drizzle codecs, profile timezone column, DST-aware schedules, locale-aware formatting). The course refers back to these three rules from every Unit 17 lesson.

### Practice and recall

Goal: lock in the type catalog and the rules. Two exercises:

1. **`Matching`** — match the scenario to the Temporal type. Six pairs:
   - "user's birthday" → `Temporal.PlainDate`
   - "the moment a webhook arrived" → `Temporal.Instant`
   - "schedule 'every Monday at 9 AM in user's tz'" → `Temporal.ZonedDateTime`
   - "the SLA window: 30 days" → `Temporal.Duration`
   - "Stripe webhook handler reading `event.created` (Unix seconds)" → `Temporal.Instant`
   - "invoice due date" → `Temporal.PlainDate`

2. **`MultipleChoice`** (single-correct) — Which of these is a bug?
   - `Temporal.Now.instant()` — stamping `createdAt` on a new row.
   - `instantFromDate(stripeSubscription.current_period_end)` at the seam.
   - `new Date(2026, 5, 15)` to compute the user's signup anniversary. ✓ (correct — should be `Temporal.PlainDate.from({ year: 2026, month: 6, day: 15 })`; also note month-zero-indexing in the `Date` call is *June*, not May)
   - `import { Temporal } from '@/lib/temporal'` at the top of a Server Component.

   `<McqWhy>` calls out both the API trap (zero-indexed month → silently *June*) and the type trap (anniversary is calendar-day semantics, not an instant) — two senior reasons one wrong line is doubly wrong.

Skip a third exercise — the lesson is type-pivot, not arithmetic. More exercises would push toward Chapter 083 territory.

### External resources

`<ExternalResource>` cards, three only:

- [MDN — Temporal](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal) — reference for the type surface.
- [TC39 proposal-temporal](https://github.com/tc39/proposal-temporal) — the spec champions' repo, including the cookbook.
- [fullcalendar/temporal-polyfill](https://github.com/fullcalendar/temporal-polyfill) — the project's polyfill choice.

No video this lesson — the bug-driven framing reads better as prose, and the timing is tight (35–45 min). A talk-style video would re-cover the same ground less densely.

## Scope

### In scope

- The eight `Date` design flaws grouped into API / semantic / precision traps.
- Three canonical production bug vignettes (DST drift, date-line invoice, audit-log smear) — *named*, not solved with code.
- The five Temporal types at one-line depth, with column-mapping forward-pointers.
- The runtime story (Stage 4 March 11, 2026; Node 26 native May 5, 2026; Node 24 LTS gap; browser status).
- The polyfill choice (`temporal-polyfill`) and the `lib/temporal.ts` re-export seam.
- The `Date` carve-out (SDK ingress + stopwatch).
- One illustrative converter (`instantFromDate`, `instantFromUnixSeconds`).
- The three rules.

### Out of scope (deferred)

- **Temporal arithmetic at depth** (`add`, `subtract`, `since`, `until`, `with`, `round`, month-end clamping, conversion graph) — lesson 5 of chapter 083.
- **Drizzle column types and codecs** (`timestamptz`, `date`) — lesson 1 of chapter 083 and lesson 2 of chapter 083.
- **`users.timeZone` column** seeded from the browser, validated with `Intl.supportedValuesOf('timeZone')` — lesson 3 of chapter 083.
- **DST handling for recurring jobs** and `schedules.task` in Trigger.dev — lesson 4 of chapter 083.
- **`Intl.DateTimeFormat` and locale-aware rendering** ("3 days ago", per-locale dates) — lesson 3 of chapter 084.
- **Zod's `z.iso.datetime()` / `z.iso.date()` and `.transform()` to Temporal** — Chapter 042.
- **Calendar systems beyond ISO 8601** (chinese, persian, hebrew) — out of scope; Temporal supports them, the SaaS stack the course teaches doesn't need them.
- **`pg_cron` and Postgres-side time functions** — out of scope at the type-pivot level; lesson 4 of chapter 083 names them in passing.
- **The full `Temporal.Now` surface** beyond `instant()` and the one-line vignette of `zonedDateTimeISO(tz)` — lesson 5 of chapter 083.
- **`Date.prototype.toJSON` and the JSON round-trip for `Temporal`** — already taught in lesson 1 of chapter 009 (one of the four serialization holes); recall here in one line, do not re-teach.
- **React class components** (also gone in 2026, but ch 023's job).
- **The `Cart` class's `toJSON`** — already taught in lesson 2 of chapter 009; don't re-cover.

### Recalled (one line each, do not re-teach)

- **Wire is `unknown` until validated** — recall from lesson 1 of chapter 009 when discussing Temporal's `from()` throw-on-bad-input behavior.
- **Records and functions are the default; classes are the carve-out** — recall from lesson 2 of chapter 009 when noting `Temporal` types are classes but you read them through their static factories, not by `new`-ing.
- **Errors over sentinels** — recall from chapter 008 when contrasting `Invalid Date` with `Temporal` throwing.

## Code conventions alignment

Follow `documentation/code standards/Code conventions.md`. Specifically:

- §Time — `Temporal` is the default; `Date` is forbidden in domain code; codec in `lib/temporal.ts`; ISO 8601 on the wire. **This lesson installs the rule.**
- §Formatting — single quotes, 2-space indent, trailing commas, semicolons on.
- §Function form — arrow functions for the codec stubs; `const` binding; two-positional-max (the codecs are one-arg each).
- §Naming — `instantFromDate`, `instantFromUnixSeconds`, `dateFromInstant` — verb + entity per the §Naming "pure helpers in `/lib`" rule.
- §Imports — `import { Temporal } from '@/lib/temporal'` at the call site (the `@/` alias). Show this twice so the student internalizes it.

Lesson-specific divergence: in §Module boundaries, the conventions doc explicitly notes `Temporal.*` values fall into the RSC-wire rejected bucket — must be encoded as ISO strings at the boundary. This lesson is too early to teach that (no RSC primer yet). Mention in one watch-out line, defer the full discussion to Chapter 083.

## Fact-check notes (verified May 2026)

- Temporal **TC39 Stage 4** advanced **March 11, 2026** — verified via the TC39 March 2026 meeting notes and the proposal-temporal repo.
- **Node 26.0.0** released **May 5, 2026** with Temporal **unflagged by default** — verified via the official Node.js 26 release blog.
- Node 26 enters **LTS in October 2026** (the standard six-month Current → Active LTS schedule for even-numbered releases) — verified via the Node release schedule.
- `temporal-polyfill` (FullCalendar): **~19.8 KB minified+gzipped**, latest published **0.3.x** as of early 2026, near-perfect spec compliance with **4 documented deviations** — verified on the npm page and bundlephobia.
- `@js-temporal/polyfill`: **~45–60 KB gzipped** depending on version measured — heavier than `temporal-polyfill`. Project choice stands: FullCalendar's polyfill.
- **Stripe API timestamps**: Unix epoch **seconds** (10-digit integers, not milliseconds) — verified in Stripe's API reference; the `instantFromUnixSeconds` conversion is correct (multiply by 1000 for epoch ms).
- Browser support: **Firefox 139** enabled by default mid-2025, **Chrome 144** ships 2026, **Safari pending** — verified via MDN compat data and the polyfill README.

Sources:
- [Node.js — Node.js 26.0.0 (Current)](https://nodejs.org/en/blog/release/v26.0.0)
- [TC39 Advances Temporal to Stage 4 — Socket blog](https://socket.dev/blog/tc39-advances-temporal-to-stage-4)
- [Node.js 26 ships unflagged Temporal and Undici 8 — lilting.ch](https://lilting.ch/en/articles/nodejs-26-current-temporal-undici)
- [temporal-polyfill — npm](https://www.npmjs.com/package/temporal-polyfill)
- [How Stripe designs for dates and times in the API](https://dev.to/4thzoa/how-stripe-designs-for-dates-and-times-in-the-api-3eoh)
