# Chapter 083 — Time, dates, and timezones

## Lesson 1 — Storage, domain, edge

**Taught.** Named the storage/domain/edge three-layer architecture for instants: `timestamptz` in Postgres, `Temporal.Instant` in the domain via a `customType` column (`instantColumn`) in `lib/temporal.ts`, ISO 8601 `Z` strings on every boundary, `Date` at third-party seams only.

**Cut.** Chapter outline sketched the codec as a free-floating `{ fromDb, toDb }` object; the lesson upgraded this to a Drizzle `customType` (`instantColumn`) — the outline form is explicitly superseded. The hydration-mismatch trap (ch030 L5) was named as motivation for moving rendering to the edge but not resolved (deferred to lesson 3). `Temporal.ZonedDateTime` was named only as "the type that attaches a tz downstream," not taught.

**Debts.**
- Lesson 2: `date` column + `Temporal.PlainDate` codec (the second Drizzle↔Temporal pair); `Buckets` exercise in L1 uses it as a decoy bucket only.
- Lesson 3: user's profile `timeZone` column, deriving it at the edge, the Vercel UTC silent-format bug, hydration-mismatch fix.
- Lesson 4: `Temporal.ZonedDateTime` at depth, DST disambiguation.
- Lesson 5: full Temporal arithmetic surface (`.add`, `.subtract`, `.since`, `.until`, `.round`, `.with`).

**Terminology.**
- **storage / domain / edge** — the three-layer split for instants; the spine metaphor of the chapter.
- **`instantColumn`** — the `customType` factory exported from `lib/temporal.ts`; maps `timestamptz` ↔ `Temporal.Instant` automatically on every Drizzle read/write.
- **`fromDriver` / `toDriver`** — the two hooks of Drizzle's `customType` that own the conversion.
- **seam** — a boundary (DB, SDK, wire) where `Date` or raw driver values are converted; conversion is structural (in the column), not a call-site discipline.
- **session `TimeZone`** — Postgres per-connection setting; keep pinned to UTC (Neon/Vercel default; explicit `SET TIME ZONE 'UTC'` is belt-and-suspenders).
- **`mode` (Drizzle)** — per-column option for `timestamp` builder; neither `'date'` (wrong type) nor `'string'` (wrong shape — space-separated, `+00`, not ISO 8601) is usable without the custom type.

**Patterns and best practices.**
- `instantColumn` lives in `lib/temporal.ts`; every timestamp column in `db/schema.ts` uses it instead of raw `timestamp({ withTimezone: true })`.
- `timestamp(3) with time zone` (millisecond precision) aligns storage to application resolution; prevents µs-tail drift on round-trips. Compare instants with `.epochMilliseconds` or `.equals()`, never string equality across a round-trip.
- Server clock is the authority: use `defaultNow()` when Postgres can stamp, `Temporal.Now.instant()` in server-side TS otherwise; never accept an instant from the client and write it directly.
- `Temporal.Instant` values cannot cross the RSC wire or a JSON response as class instances; encode with `.toString()` (or `toJSON()` via `JSON.stringify`) at every serialization boundary, parse back on the other side.
- Stripe `event.created` is Unix **seconds**, not milliseconds; use `instantFromUnixSeconds(event.created)` (from ch009's `lib/temporal.ts`), not `Temporal.Instant.fromEpochMilliseconds(event.created)`.
- `Date` is allowed only at two seams: third-party SDK adapters (convert immediately with `instantFromDate`) and stopwatch-style duration measurement (`performance.now()`).

**Misc.**
- The chapter-outline `{ fromDb, toDb }` codec object is the path NOT taken; `instantColumn` (`customType`) is the canonical contract going forward. Later lessons and the project chapter must use `instantColumn`, not a free-floating converter.
- `lib/temporal.ts` is the single Temporal import path for the whole codebase; the ESLint `no-restricted-imports` rule from ch009 keeps this. Any polyfill swap is a one-line change at this seam.
- Drizzle `mode: 'string'` gotcha: raw Postgres text is `'2026-03-09 07:47:00.038+00'` (space-separated, hours-only offset) — not ISO 8601. `fromDriver` applies two repairs before `Temporal.Instant.from()`: `.replace(' ', 'T')` (cosmetic normalization) then `.replace(/([+-]\d{2})$/, '$1:00')` (pads the trailing hours-only offset to `±HH:mm`). Both are required; the offset repair is the load-bearing one. Do not write `Temporal.Instant.from(rawDrizzleString)` without both repairs.

## Lesson 3 — Timezone on the profile

**Taught.** Delivered the user's timezone as a `users.timeZone` profile column: IANA name vs. offset distinction, browser-seeding at sign-up, acceptance-based Zod validation (the `Intl.supportedValuesOf` UTC-omission footgun), reading from the session via `requireOrgUser()` or `getCurrentUserTimeZone()`, passing explicitly into every Temporal/Intl call, org-vs-user timezone scope, drift detection with non-blocking banner, and "timezone is data not config."

**Cut.** Chapter outline's L3 validation example used the membership form (`Intl.supportedValuesOf().includes(tz)`) as the canonical pattern; the lesson correctly demoted it to "buggy" and ships the acceptance-based validator as the only recommended form. Treating timezone as PII / GDPR redaction explicitly scoped out (ch081 L4 owns it). ZodCoding fixture: outline listed `-05:00` (offset-is-not-IANA-name reinforcement) but lesson swapped it for `'Europe/Berlin-ish'` and `'Mars/Phobos'` — no downstream impact.

**Debts.**
- Lesson 4: DST mechanics, `ZonedDateTime` disambiguation at depth, recurring Trigger.dev `schedules` with a named IANA `timezone` arg, per-tenant dynamic schedules, what propagates when a user's zone actually changes.
- Lesson 5: full Temporal arithmetic surface at depth.
- ch084 L3/L5: `formatDate` *implementation* (`Intl.DateTimeFormat` call, locale resolution, `next-intl` formatter wiring); this lesson ships only the required-argument *signature/shape* as a structural defense.
- ch084 L4: `users.locale` column wired up; named here as a companion column (greyed out), not built.
- ch085: full `/settings/profile` UI with the timezone select; referenced conceptually only.

**Terminology.**
- **`users.timeZone`** — `text('time_zone').notNull().default('UTC')` on the users table; stores an IANA name, never an offset.
- **`users.locale`** — companion column (`text('locale').notNull().default('en-US')`); adjacent on the profile, ch084 owns it.
- **`getCurrentUserTimeZone()`** — thin React-`cache`d helper in `lib/user-time.ts`; resolves via `requireOrgUser()`, not a second source.
- **`formatDate(value, { timeZone })`** — required-argument wrapper shape that makes the no-arg `Intl.DateTimeFormat()` bug unwriteable; implementation is ch084 L3.
- **acceptance-based tz validator** — `z.string().refine(tz => { try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; } catch { return false; } })` — accepts `'UTC'` where membership check fails.
- **user-asserted** — framing for browser-detected timezone: a sensible default the user owns and can edit, not authoritative ground truth (contrast with server clock authority for instants).
- **`Temporal.Now.zonedDateTimeISO(user.timeZone)`** — canonical "now in the user's zone" call; `timeZone` argument is optional in the API but always supplied by discipline (same trap as no-arg `Intl.DateTimeFormat()` in server code).
- **Better Auth `additionalFields`** — `timeZone: { type: 'string', required: false }` declared so the session carries the value; Drizzle schema stays source of truth.

**Patterns and best practices.**
- `users.timeZone` stores an IANA name, never an offset (`-05:00`); `NOT NULL DEFAULT 'UTC'`.
- Validate at the write edge with acceptance-based Zod, not membership check; acceptance is the only form that can't drift from the platform's real capability and that accepts `'UTC'`.
- Seed from the browser via `'use client'` + hidden input; treat the value as user-asserted and validate on the server before writing.
- Read the zone from `requireOrgUser()` → `user.timeZone` in actions/pages; use `getCurrentUserTimeZone()` for deep Server Components to avoid prop-drilling.
- Pass zone **explicitly** into every `Temporal` and `Intl` call — no ambient/global form, no module-level "current timezone" variable.
- Route `formatDate(value, { timeZone })` through a required-argument wrapper so the no-arg bug is unrepresentable.
- User-facing rendering keys off `user.timeZone`; org-level business events (invoice issue date, company-wide billing cutoff) key off `organizations.timeZone`.
- Drift detection: client sends current zone on sign-in; if it differs, show a non-blocking banner — never auto-update the column.
- Never set `process.env.TZ`; keep the runtime pinned to UTC. Timezone is a column value, not a process-environment value.

**Misc.**
- `Intl.supportedValuesOf('timeZone')` omits `'UTC'` on Chromium/Node (Etc/* zones dropped) — a select built from the raw list has no UTC option; explicitly add it if using membership validation, or switch to acceptance.
- `Intl.DateTimeFormat().resolvedOptions().timeZone` is correct and useful **only in browser code**; in a Vercel serverless function it returns `'UTC'` for every user with no error.
- ch084 L3 (`formatDate` implementation) and L5 (`next-intl` config) consume `users.timeZone` from the session — the column and session plumbing installed here are their substrate.

## Lesson 4 — DST and recurring jobs

**Taught.** Delivered the UTC-vs-named-zone binary for recurring jobs, DST's gap/repeat mechanics, wiring a static `schedules.task` with `cron: { pattern, timezone }`, per-tenant `schedules.create` / `schedules.update` / `schedules.del`, the three-class propagation model for a profile-timezone change, `disambiguation: 'compatible'` and `'reject'`, and idempotency keying on `Temporal.Instant` rather than a wall-clock string.

**Cut.** Chapter outline flagged `pg_cron` as an alternative scheduler (named in one clause as "the hand-rolled path you don't take," no walkthrough). DST testing with Vitest `TZ` fixtures was scoped out entirely (Unit 18 owns it). The `disambiguation: 'earlier' | 'later'` and `offset` options were explicitly excluded; one clause acknowledges "more options exist." Pre-computing a year of fire instants into a table was ruled out in one paragraph (named once, not a full teach).

**Debts.**
- Lesson 5: full Temporal arithmetic surface (`since`, `until`, `round`, `Duration`, month-end clamping, full anti-patterns) — this lesson used only `subtract().toInstant()` and `with({ hour })` as already-familiar; L5 owns the depth.
- ch084 L3: `Intl.DateTimeFormat` rendering of fire times; ch084 L5: `next-intl` timezone config.
- Unit 18: DST-boundary testing (Vitest `TZ` fixtures straddling transitions).

**Terminology.**
- **UTC-vs-named-zone binary** — the single routing decision: wall-clock-meaningful jobs name an IANA zone; cadence-only jobs run in UTC. "Would a human be upset if this ran an hour off?" is the discriminator.
- **gap** — the spring-forward hour (e.g. 2 AM–3 AM, March 8 2026) that does not exist on the wall clock; a job scheduled there has no instant to fire at.
- **repeat** — the fall-back hour (e.g. 1 AM–2 AM, November 1 2026) that happens twice; a job there could fire twice.
- **safe band** — wall-clock times never inside a gap or repeat (9 AM, noon, 5 PM); the operating rule is to schedule recurring jobs in this band.
- **`cron` object form** — `{ pattern, timezone }` used in `schedules.task`; the static, nested shape.
- **`cron` string + top-level `timezone`** — the flat shape used in `schedules.create` and `schedules.update`; the shape flip is the most common mistake (ch066 flagged it, L4 reinforces it).
- **`schedules.del(scheduleId)`** — v4 SDK method for deletion (not `.delete`); first arg is schedule id, not `externalId`.
- **`schedules.update(scheduleId, { task, cron, timezone })`** — v4 update shape; `cron` plain string, `timezone` top-level (flat `create` shape).
- **`externalId`** — caller-supplied key tying a Trigger.dev schedule back to a user/org row; used to resolve schedule id for update/delete without storing Trigger.dev's internal id.
- **`deduplicationKey`** — prevents duplicate schedules if opt-in handler runs twice; canonical form `` `summary:${user.id}` ``.
- **`disambiguation: 'compatible'`** — Temporal default; on a gap moves forward (later instant), on a repeat picks the earlier instant; needs no explicit thought.
- **`disambiguation: 'reject'`** — throws `RangeError` on any gap or repeat; the one deliberate opt-out for fail-loud behavior.
- **`tzdata`** — the IANA Time Zone Database bundled with the runtime; updated several times yearly; never pre-compute a year of fire instants because November's rules may change before November arrives.
- **past intent is honored** — one-shot instants already pinned to a `Temporal.Instant` at scheduling time are not retroactively shifted when a user changes their profile timezone; offer an explicit rebase prompt, never an automatic one.
- **`payload.timestamp`** — Trigger.dev `schedules.task` delivers this as a **`Date` object** (UTC), not an ISO string; convert at the seam with `instantFromDate(payload.timestamp)`.

**Patterns and best practices.**
- Always pass `timezone` explicitly on every schedule — even UTC ones (`timezone: 'UTC'`) — so runtime default is never load-bearing.
- Never schedule a recurring job in the 1 AM–3 AM window of a DST-observing zone; use 9 AM, noon, or 5 PM.
- Convert `payload.timestamp` (a `Date`) → `Temporal.Instant` at the Trigger.dev seam with `instantFromDate`; the `Date` never travels further.
- Key idempotency on `fireInstant.toString()`, not a formatted wall-clock string; two fall-back fires share a wall-clock representation but are different `Instant` values.
- Profile-timezone change propagation: re-register future recurring schedules via `schedules.update`; leave future one-shot instants as-is (honor past intent); past fires are immutable.
- Alternative valid design: read `user.timeZone` from the profile on every fire instead of storing it on the schedule — absorbs changes for free but couples every fire to a profile read; choose deliberately.
- Never pre-compute a year of fire instants; compute only the next fire at fire time from current `tzdata`.
- Calendar-unit subtraction (`subtract({ days: 30 })`) must be done on a `ZonedDateTime`, then `.toInstant()` — never on an `Instant` directly.

**Misc.**
- Chapter outline said `payload.timestamp` is an ISO string — verified false; it is a `Date` object. `instantFromDate(payload.timestamp)` is the correct codec, not `Temporal.Instant.from(string)`. Do not revert this.
- Chapter outline described `disambiguation: 'compatible'` as "pick the later instant on fall-back" — spec-incorrect; `'compatible'` picks the **earlier** instant on fall-back and moves **forward** (later) on a spring-forward gap. Use spec-correct wording.
- `schedules.del` (not `.delete`) and `schedules.update` first-arg-is-schedule-id are v4 verified; do not regress.
- All Temporal imports and `instantFromDate` remain behind `lib/temporal.ts` (ESLint `no-restricted-imports`, ch009).

## Lesson 5 — Arithmetic with Temporal

**Taught.** Delivered the full daily Temporal arithmetic surface: five-type decision table (`Instant`/`ZonedDateTime`/`PlainDate`/`PlainDateTime`/`Duration`); `Temporal.Now.*` with the always-pass-zone reflex; `add`/`subtract` with named-component `durationLike` and month-end clamping (`overflow: 'constrain'`/`'reject'`); `since`/`until` with `largestUnit` and the months-throw on bare `Instant`s; `compare`/`equals`/`before`/`after`; `with` for component edits; `round` for analytics bucketing and time-picker snapping; the explicit conversion graph; `Duration` as storable ISO 8601 data; six legacy anti-patterns retired; and the `temporal-polyfill` seam in `lib/temporal.ts` for Node 24 LTS.

**Cut.** Chapter outline's watch-out about `add({ days: 30 })` on a `ZonedDateTime` across DST being "not exactly 30×24 hours" and the `add({ hours: 720 })` as the exact-real-time alternative was not taught as a dedicated beat (DST arithmetic depth left to L4 reference). Polyfill bundle-size mobile-gating hint (`import` behind a runtime check) from the chapter outline was not included. Non-ISO calendar systems (Buddhist, Islamic) were named in one clause only, as scoped.

**Debts.**
- ch084 L3 owns `Intl.RelativeTimeFormat` for "3 hours ago" strings; this lesson explicitly names the boundary ("this lesson computes the `Duration`; ch084 renders it") so the student doesn't expect `.toHuman()` here.
- ch084 L3 owns `Intl.DateTimeFormat` rendering of Temporal values.
- Unit 18 owns DST-boundary testing (Vitest `TZ` fixtures).

**Terminology.**
- **named-component `durationLike`** — `{ days: 30 }`, `{ months: 1 }`, `{ weeks: 2, days: 3 }`; the unit is named, never positional. `add(30)` throws.
- **month-end clamping** — `overflow: 'constrain'` (default): `Jan 31 + 1 month = Feb 28`; `overflow: 'reject'`: throws `RangeError` instead. Iteration asymmetry: `add({months:1})` twice ≠ `add({months:2})` near month-end (prefer one larger call).
- **`largestUnit`** — option on `since`/`until` controlling the Duration's shape. Months/years valid only on `PlainDate`/`ZonedDateTime` (carry a calendar); asking an `Instant` for `largestUnit: 'month'` throws.
- **`with(fields)`** — component-level replacement; returns new instance. Canonical reach for period starts (`date.with({ day: 1 })`), not `round`. Distinct from `round`.
- **`round(options)`** — snaps to a grid; knobs: `smallestUnit`, `roundingIncrement`, `roundingMode` (`'floor'` for bucketing, `'halfExpand'` for nearest). Not for period boundaries.
- **`since(b)` / `until(b)`** — both return `Duration`; `since` is positive when receiver is after `b`, `until` is the mirror.
- **`Temporal.PlainDate.compare(a, b)`** — static, returns `-1|0|1`, fits `Array.sort`. Instance booleans: `.equals()`, `.before()`, `.after()`.
- **conversion graph** — all six conversions are explicit method calls, no coercion. Two zone-requiring edges: `instant.toZonedDateTimeISO(tz)` and `plainDate.toZonedDateTime({ timeZone, plainTime })`. The canonical "DB instant → user's calendar day" chain: `invoice.createdAt.toZonedDateTimeISO(user.timeZone).toPlainDate()`.
- **ISO 8601 duration string** — `P…` grammar: `P30D` (30 days), `P1M` (1 month), `PT12H` (12 hours). `Duration` crosses every boundary as this string; parsed with `Temporal.Duration.from()`.
- **polyfill seam** — `export const Temporal = globalThis.Temporal ?? polyfillTemporal;` in `lib/temporal.ts`; every file imports from there, never from the polyfill package. Upgrade to Node 26 is a one-line change at this seam.
- **`temporal-polyfill`** — FullCalendar's polyfill (~20 KB), the default for new projects; `@js-temporal/polyfill` (TC39 champions) is the larger full-spec alternative.

**Patterns and best practices.**
- Always pass `timeZone` to `Temporal.Now.plainDateISO()` and `Temporal.Now.zonedDateTimeISO()`; the no-arg form resolves to the runtime's tz (UTC on Vercel) — same bug class as no-arg `Intl.DateTimeFormat()`.
- Prefer one `add({ months: N })` call over N sequential `add({ months: 1 })` calls near month-end to avoid iterative clamping.
- Use `overflow: 'reject'` when a billing anchor landing on an invalid date should error loudly rather than silently clamping.
- For `since`/`until` between `Instant` values, use `largestUnit: 'day'` or smaller; never `'month'`/`'year'` (throws).
- Use `with({ day: 1 })` for calendar period starts; use `round` only for grid-snapping (analytics, time pickers).
- Store configurable spans (trial lengths, grace periods) as ISO 8601 duration strings in the DB; parse with `Temporal.Duration.from()`, apply with `.add()`.
- Never mix polyfill and native Temporal in the same runtime; the single `lib/temporal.ts` import path is the structural guarantee.
- Temporal arithmetic lives server-side; ship ISO 8601 strings to the client for rendering via `Intl` (ch084).
- Six retired anti-patterns: `new Date(y, m-1, d)` (zero-indexed month), `date.setMonth()` (mutation), `Date.now() + ms` (naive ms, DST-wrong), `new Date(isoDateStr)` (midnight-UTC trap), any `date-fns`/`dayjs`/`moment` import, ISO-string equality for comparison.

**Misc.**
- The capstone `ScriptCoding` was scoped with a Sandpack npm-import dependency check and a `Dropdowns`/`PredictOutput` fallback — the lesson as built ships one or the other; later lessons should not assume a live editor exists on this page.
- `PlainDateTime` is named in a single sentence as "rarely needed in 2026 SaaS" and its operation surface is not taught; later lessons should not build on it.
- The lesson explicitly signals that "3 hours ago" formatting belongs to ch084 L3 (`Intl.RelativeTimeFormat`), not here — do not re-open that boundary.

## Lesson 2 — Calendar days, not midnight instants

**Taught.** Installed the calendar-day storage triple (`date` column + `Temporal.PlainDate` + `dateColumn` customType in `lib/temporal.ts`); taught the instant-vs-day discrimination as the load-bearing decision; showed the midnight-UTC anti-pattern producing a wrong day for Sydney users; covered the `dueDate` arithmetic surface (`add`, `with`, `compare`); taught the explicit `PlainDate → ZonedDateTime → Instant` bridge via `toZonedDateTime({ timeZone, plainTime })`; locked the wire with `z.iso.date()`.

**Cut.** Chapter outline listed `date + INTERVAL '1 day'` SQL composability and lexicographic ISO ordering for `WHERE` queries — not taught. Hydration-mismatch nuance for `Intl.DateTimeFormat` on a `PlainDate` (safe vs. unsafe formats) named as a boundary but not taught (deferred to ch084 L3). `users.locale` companion column not mentioned (lesson 3 scope).

**Debts.**
- Lesson 3 owns: `user.timeZone` column sourcing/validation; this lesson uses `user.timeZone` in the bridge example as a given, not a thing explained.
- Lesson 4 owns: `ZonedDateTime` at depth, DST disambiguation, recurring jobs; this lesson names `ZonedDateTime` only as the bridge type.
- Lesson 5 owns: full Temporal arithmetic surface (`since`, `until`, `round`, `Duration`, full conversion graph).

**Terminology.**
- **`dateColumn`** — second `customType` in `lib/temporal.ts`; maps Postgres `date` ↔ `Temporal.PlainDate`. No repair needed: Postgres returns `'2026-05-15'`, which `PlainDate.from()` accepts as-is.
- **`Temporal.PlainDate`** — calendar date (year/month/day only); no time, no timezone, immutable. Timezone-ignorance is the feature.
- **`Temporal.ZonedDateTime`** — bridge type carrying day + clock + IANA zone; only Temporal type aware of DST. Used here solely as the intermediate in `PlainDate → Instant` conversion.
- **grammar test** — "Is the answer 'this exact second'? → `timestamptz`. Is the answer 'this day, everywhere'? → `date`." The discriminator for picking the storage triple.
- **month-end clamping** — `overflow: 'constrain'` (Temporal default); Jan 31 + 1 month = Feb 28, no throw. Opt out with `overflow: 'reject'` to force a `RangeError`.
- **`z.iso.date()`** — Zod v4 validator for `YYYY-MM-DD` only; rejects any `T`/`Z`/offset. Acts as a tripwire on midnight-UTC-disguised-as-date inputs.

**Patterns and best practices.**
- `dateColumn` lives in `lib/temporal.ts` beside `instantColumn`; every `date`-typed schema column uses it (e.g. `dueDate: dateColumn('due_date').notNull()`).
- Both codecs are `customType`; the chapter-outline free-floating `{ fromDb, toDb }` form is not used for either.
- The storage triple is a locked set: column type + Temporal type + codec. Never mix (e.g. no `date` column with `Temporal.Instant` domain type).
- `PlainDate` values cannot cross the RSC wire as class instances; serialize with `.toString()` / `.toJSON()`, parse back on receipt — same rule as `Instant`.
- Crossing `PlainDate → Instant` always names both zone and clock time explicitly: `dueDate.toZonedDateTime({ timeZone: user.timeZone, plainTime: '17:00' }).toInstant()`. No implicit midnight.
- Reverse crossing: `instant.toZonedDateTimeISO(user.timeZone).toPlainDate()` — zone always explicit.
- Inbound wire validation: `z.iso.date()` on every request body field that expects a calendar date.

**Misc.**
- Chapter outline sketched the codec as `dueDate: date('due_date', { mode: 'string' })` plus a free-floating helper — the lesson upgraded to `customType` (`dateColumn`), matching L1's decision. That outline form is superseded.
- "Send this report at end of day on the 15th of every month" is explicitly called a recurring *rule*, not a stored column — handed off to lesson 4 so the student doesn't model it as a `date` value.
