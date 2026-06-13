# Arithmetic with Temporal

- **Title (h1):** Arithmetic with Temporal
- **Sidebar label:** Temporal arithmetic

---

## Lesson framing

This is the chapter's deepest mechanics lesson and the last teaching lesson before the quiz. Lessons 1-4 installed the *substrate* — the storage triples (`instantColumn`/`dateColumn` in `lib/temporal.ts`), the profile `timeZone`, DST-aware scheduling. They used Temporal arithmetic in passing (`.add`, `.subtract`, `.with`, `.toInstant`) but always as "already familiar." **This lesson owns the depth: the daily Temporal reach a SaaS dev writes dozens of times a week.** The deliverable is fluency, not a new architecture — the student should leave able to write any "trial ends in 30 days," "next billing is 1 month out," "how long ago," "invoices in the last 7 days" computation correctly and reflexively.

Pedagogical spine. Three threads run through every section:

1. **The type picks the operation, the operation can't pick the type.** The recurring senior move is "which of the five Temporal types is this value, and what does arithmetic *mean* on it?" `add({ days: 1 })` is a different real-world operation on a `ZonedDateTime` (crosses DST, may be 23 or 25 h) than on an `Instant` (exactly 86400 s) than on a `PlainDate` (a calendar tick). Lead with the type catalog so every later operation lands against it.
2. **Temporal refuses the bug by construction.** The 2010s pain (`date-fns`/`dayjs` over `Date`: zero-indexed months, mutation, the local-tz gotcha, hand-rolled month-end clamping) is the foil. Temporal's value is that the *types reject the mistake* — `add(30)` throws, months on a bare `Instant` throws, immutability is enforced. Frame each operation as "here's the gotcha class this retires."
3. **Always pass the zone; never reach for a library.** Two reflexes to install. (a) `Temporal.Now.X(timeZone)` — the no-arg form is the same Vercel-UTC footgun as no-arg `Intl.DateTimeFormat()` from lesson 3; the zone argument is *always* supplied by discipline. (b) On this stack the date library is gone — Temporal is the platform default, no wrapper, and the migration off legacy `Date`/`date-fns` is mechanical.

Tone and prior knowledge. Adult, terse, assumes competence (the student has shipped four lessons of Temporal substrate). Do not re-teach the storage triples, the profile column, or DST mechanics — reference them, build on them. The student already holds: `lib/temporal.ts` is the single Temporal import path (ESLint-enforced, ch009); `Instant`/`PlainDate`/`ZonedDateTime` exist and which column each maps to; `user.timeZone` comes off the session via `requireOrgUser()`; `instantFromDate`/`instantFromUnixSeconds` codecs live in `lib/temporal.ts`; Temporal values can't cross the RSC wire as instances (encode to ISO). This lesson assembles those into an arithmetic vocabulary.

Cognitive-load management. The operation surface is wide (`add`/`subtract`/`since`/`until`/`with`/`round`/`compare`/`equals`/`Duration`/the conversion graph). Sequence simplest-first and group by job-to-be-done, not by alphabetical API: catalog the types → get "now" safely → shift a date (`add`/`subtract` + month-end) → measure a gap (`since`/`until`) → compare/sort → edit components (`with`) → bucket (`round`) → convert between types → durations as data. The six anti-patterns land near the end as a consolidation (each paired with its Temporal-correct rewrite), then the polyfill/runtime seam closes the lesson. Heavy use of small, runnable code with `PredictOutput` to make the spec behaviors (month-end clamp, DST-day length, no-arg footgun) *surprising then memorable* rather than asserted.

Code component policy. Lean on `Code` for the many short call-site snippets — most operations are one or two lines and don't warrant heavier chrome. Use `AnnotatedCode` for the one multi-step walkthrough (the conversion-graph chain "Instant from DB → what day for the user"). Use `CodeVariants` for before/after retirements (legacy `Date`/`date-fns` vs Temporal) where the A/B contrast is the teaching. `PredictOutput` carries the "make the gotcha land" moments. One `DiagramSequence` visualizes the conversion graph as a navigable map. Exercises: a `Buckets` type-picker, a `Dropdowns` operation-fill on real call-sites, a `PredictOutput` on month-end clamping, and a guided `ScriptCoding` (sandpack runner) where the student writes the actual computations against a polyfilled Temporal — verify the sandpack runner can `import` `temporal-polyfill` from npm; if it cannot (same class of limit as ReactCoding being react-only), fall back to `Dropdowns`/`PredictOutput`/`Sequence` for the practice and drop the live editor. See Scope note.

---

## Lesson sections

### Introduction (no header)

Open with the production-stakes hook in the chapter's house style (warm, concrete, one paragraph). The scenario: a single feature request — "the billing page should show *trial ends in 12 days*, *next invoice May 31*, and *first comment posted 3 hours ago*" — and the realization that one screen needs four different time computations, each a different *kind* of arithmetic. The 2010s answer was a date library plus hope; the 2026 answer is already sitting in the runtime. State the goal plainly: by the end the student writes any of these reflexively and knows which Temporal type each operation belongs on. Connect back: lessons 1-4 installed *where time is stored and zoned*; this is *what you compute with it once you hold it*. Preview the closing payoff — the six legacy patterns retired, and the one-line polyfill seam that lets all of this run on today's Node 24 LTS.

Reasoning: matches the pedagogical "senior question implied in the intro" rule and the chapter's established opening pattern (lesson 4 opens with the 8-AM-ticket story). Keep it short; the meat is the body.

### The five types, and why the type is the decision

Restate the Temporal type catalog as the lesson's backbone — but framed as a *decision table*, not a feature list. Five types do all SaaS work:

- **`Instant`** — a fixed point in real time (UTC, the wire, the `timestamptz` column). No wall clock, never ambiguous.
- **`ZonedDateTime`** — `Instant` + IANA zone; the *only* DST-aware type; the one safe for "9 AM in New York" math.
- **`PlainDate`** — calendar date, no time, no zone; the `date` column's domain type.
- **`PlainDateTime`** — wall-clock date+time, no zone; named once as "rarely needed in 2026 SaaS" with the one realistic use ("the event recurs at 9 AM in whatever zone the viewer is in") — do not teach its surface, just place it so the student isn't surprised it exists.
- **`Duration`** — an explicit, immutable span (years…nanoseconds); the *input* to every arithmetic op and a thing you can store.

The load-bearing point: **arithmetic means different things on different types**, so picking the type *is* the senior decision and everything downstream follows. Make this visceral with a single contrast block: `add({ days: 1 })` on a `ZonedDateTime` straddling spring-forward is 23 real hours later; on an `Instant` it's exactly 86400 seconds; on a `PlainDate` it's "tomorrow" with no hours at all. Same method name, three different real-world meanings.

Component: a short `Code` contrast (the three `add({ days: 1 })` calls side by side with comment annotations of what each yields), or a tight three-row plain-HTML/CSS table inside `<Figure>` (type | what it models | what `add({days:1})` means). Prefer the table — it's the reference the student will mentally return to.

Exercise — `Buckets`, "Which Temporal type models this value?" Two or three buckets (`Instant`, `PlainDate`, `ZonedDateTime`; optionally a `Duration` bucket). Chips drawn from real SaaS fields the student has seen across the chapter: `invoice.createdAt`, `dueDate`, `birthDate`, `subscription.startedAt`, "9 AM Eastern fire time for a report", "30-day trial length", "the comment's timestamp", "today, from the user's perspective". This reactivates lessons 1-2's storage decisions and reframes them as the *arithmetic* decision. Grading: each chip's `bucket` is its correct type; rationale in nothing-special prose after.

Reasoning: establishing the type-first mental model up front is the single highest-leverage move — it's the difference between memorizing methods and reasoning about them. The Buckets exercise doubles as spaced repetition of the storage lessons.

### Getting "now" without an ambient timezone

Teach `Temporal.Now` as the entry point to all arithmetic, and weaponize the no-arg footgun immediately. Three calls:

- `Temporal.Now.instant()` — current `Instant` (UTC, no zone). Safe with no argument because there's no zone to get wrong.
- `Temporal.Now.zonedDateTimeISO(timeZone)` — current `ZonedDateTime` in a named zone.
- `Temporal.Now.plainDateISO(timeZone)` — today's date *in that zone*.

The senior rule, hammered: **always pass the explicit `timeZone`** to the latter two. The API makes the argument *optional* — and that optionality is a footgun inherited from `Date`. `Temporal.Now.plainDateISO()` with no argument resolves to the *runtime's* zone, which on Vercel is UTC for every user — the exact same silent bug as no-arg `Intl.DateTimeFormat()` from lesson 3. The canonical correct form is `Temporal.Now.plainDateISO(user.timeZone)`, with `user.timeZone` off the session.

Make it land with `PredictOutput`: a tiny program that prints `Temporal.Now.plainDateISO('America/New_York')` vs `Temporal.Now.plainDateISO('Asia/Tokyo')` at a moment near the date line (e.g. server clock 02:00 UTC) so the two zones print *different calendar days*. `PredictWhy`: "today" is a zone-relative question; the no-arg form silently answers it as UTC and ships the wrong day for half the user base.

Component: `Code` for the three signatures; `PredictOutput` for the date-line surprise. Reasoning: this reflex is the connective tissue to lesson 3 and the precondition for every user-relative computation in the rest of the lesson — install it before any `add`/`since` that takes a "now."

### Shifting a date: add, subtract, and the month-end clamp

The workhorse section. Every arithmetic type exposes `add(durationLike)` and `subtract(durationLike)`; both are immutable (return a new instance). The `durationLike` is a **named-component object** — `{ days: 30 }`, `{ months: 1 }`, `{ weeks: 2, days: 3 }`, `{ hours: 24 }` — never a bare number. `add(30)` throws: the component name *is* the unit, which is itself a bug-class retirement (no more "is this argument days or ms?").

Three canonical call-sites, written against the chapter's domain:
- Trial end: `Temporal.Now.plainDateISO(user.timeZone).add({ days: 30 })`.
- Next billing: `subscription.startDate.add({ months: 1 })`.
- "Last 7 days" window floor: `Temporal.Now.instant().subtract({ days: 7 })`.

Then the headline subtlety — **month-end clamping**:
- `Temporal.PlainDate.from('2026-01-31').add({ months: 1 })` → `2026-02-28`. Spec behavior: `overflow: 'constrain'` (the default) clamps to the last valid day of the target month. (Leap-year aware: 2028 → Feb 29.)
- The trap worth its own beat: **`add({ months: 1 })` twice ≠ `add({ months: 2 })`** near month-end. Iterating clamps at each step (Jan 31 → Feb 28 → Mar 28); a single call clamps once (Jan 31 → Mar 31). Prefer a single larger-duration call when month-end semantics matter.
- The opt-out: `add({ months: 1 }, { overflow: 'reject' })` throws `RangeError` instead of silently clamping — reach for it when "Jan 31 + 1 month" *should* be an error (e.g. a billing anchor that must be a real date), so the bug surfaces loudly instead of producing a surprising Feb 28.

Component: `Code` for the three call-sites; then `PredictOutput` for the clamp — program prints `'2026-01-31'.add({months:1})` and the twice-vs-once contrast; withheld-then-revealed output makes the asymmetry stick. This is exactly the kind of spec behavior students assert wrongly from intuition, so making them predict it is high-value.

Note the deliberate convention: continuity notes (lesson 2) already named `overflow: 'constrain'`/`'reject'` on `PlainDate`; here we extend it to the `months`-arithmetic case and the iteration asymmetry, which lesson 2 did not cover. Tooltip-worthy: `overflow`.

Reasoning: month math is *the* place hand-rolled date code breaks and the single most common Temporal "huh?"; giving it a dedicated, prediction-driven beat is the lesson's highest-yield mechanics moment.

### Measuring a gap: since, until, and largestUnit

Teach the duration-producing pair. `a.since(b)` returns a `Duration`, positive when `a` is after `b`; `a.until(b)` is the same magnitude, opposite sign. Three reads against the domain:
- "How long since sign-up" → `Temporal.Now.instant().since(user.createdAt)`.
- "Days until due" → `Temporal.Now.plainDateISO(user.timeZone).until(invoice.dueDate)`.
- "Subscription period length" → `period.endDate.since(period.startDate)`.

The senior subtlety — **`largestUnit` and why months are special**. By default a `Duration` between two `Instant`s comes back in the largest *unambiguous* unit; pass `{ largestUnit: 'day' }` (or `'hour'`, `'second'`) for a human-readable shape. The trap: **`since(other, { largestUnit: 'months' })` on two bare `Instant`s throws** — a month has no fixed length without a calendar to anchor it, so Temporal refuses rather than guessing. Months/years are only meaningful on `PlainDate` or `ZonedDateTime` (types that carry a calendar). Rule of thumb: `'days'`/`'seconds'` for wire/DB durations; `'months'`/`'years'` only on calendar-aware types.

Flag the boundary to lesson 3 of ch084 explicitly but do not cross it: producing the *string* "3 days ago" is `Intl.RelativeTimeFormat`, a formatting concern owned by ch084. This lesson computes the `Duration`; ch084 renders it. State this in one clause so the student doesn't expect a `.toHuman()` here.

Component: `Code` for the three reads + the `largestUnit` variants. Optionally a one-line `PredictOutput` or just a `:::caution` on the throwing-months case — prefer folding it into prose with a short `Code` showing the throw, since it's a "this errors" fact, not an output to predict. Tooltip-worthy: `largestUnit`.

Reasoning: `since`/`until` is the second-most-common reach (every "ago"/"until" UI), and the months-throw is a genuine surprise that prevents a real class of "why is my duration weird" bugs.

### Comparing and sorting dates

Short, mechanical section. Booleans and sort, no surprises:
- Static `Temporal.PlainDate.compare(a, b)` → `-1 | 0 | 1`, the comparator for `Array.prototype.sort` (works the same for `Instant.compare`, `ZonedDateTime.compare`).
- Instance booleans: `a.equals(b)`, `a.before(b)`, `a.after(b)`.

Tie back to two prior threads in one sentence each: (1) the round-trip equality rule from lesson 1 — compare instants with `.equals()` or `.epochMilliseconds`, never string equality, because the µs tail drifts; (2) comparing *across* types is a type error (`PlainDate` vs `ZonedDateTime` won't compare) — same discipline as the storage triples being a locked set.

Component: a single `Code` snippet sorting an array of invoices by `dueDate` with `Temporal.PlainDate.compare`. Keep it tight — this is a "you already expect this to exist, here's the exact name" section.

Reasoning: necessary for completeness (sorting lists by date is ubiquitous) but genuinely simple, so it stays brief and earns its place by naming the exact API and re-anchoring the equality rule.

### Editing one field: with

Teach `with(fields)` as component-level replacement — returns a new instance with the named fields swapped, everything else unchanged. The senior reach for "first of the month," "9 AM exactly," "start of this hour by zeroing minutes/seconds":
- `date.with({ day: 1 })` → first of that month.
- `date.with({ day: 1 }).add({ months: 1 })` → first of *next* month (compose `with` + `add`).
- `zonedDateTime.with({ hour: 9, minute: 0, second: 0 })` → 9 AM that day in that zone.

Contrast `with` against `round` (next section) explicitly: for "start of a calendar period" reach for `with({ day: 1 })` (a deliberate component edit), *not* `round` — rounding is for snapping to a grid, not for period boundaries. Drawing this line prevents the common "I used round to get the first of the month and it did something weird" mistake.

Component: `Code` with the three forms. Reasoning: `with` is small and orthogonal but constantly useful (period starts, time-of-day construction feeds straight into the lesson-3/4 "9 AM in the user's zone → `.toInstant()`" pattern), and the `with`-vs-`round` boundary is a real point of confusion worth pre-empting.

### Bucketing time: round

Teach `round(options)` for snapping a value to a grid — distinct from `with`'s deliberate edits. Three uses:
- Analytics bucketing: `event.timestamp.round({ smallestUnit: 'hour', roundingMode: 'floor' })` floors each event to the hour, producing an X-axis grid for a chart.
- Snapping user input: `input.round({ smallestUnit: 'minute', roundingIncrement: 15, roundingMode: 'halfExpand' })` rounds a picked time to the nearest 15 minutes.
- (Reiterate) period *starts* are `with`, not `round`.

Name the three knobs — `smallestUnit`, `roundingIncrement`, `roundingMode` (`'floor'`/`'ceil'`/`'halfExpand'`/`'trunc'`) — but keep it to the two realistic SaaS uses; don't enumerate every mode.

Component: `Code` for the two uses. Tooltip-worthy: `roundingMode`. Reasoning: rounding shows up specifically in analytics/charting and time-pickers — concrete, bounded, easy to over-teach, so cap it at the two patterns that earn their keep.

### The conversion graph: moving between types

The reasoning-heavy section, because conversions are *where the thinking happens*. Six common conversions, every one explicit (no `+` coercion, no truthy fallback):

- `Instant ↔ ZonedDateTime`: `instant.toZonedDateTimeISO(timeZone)` / `zonedDateTime.toInstant()`.
- `ZonedDateTime ↔ PlainDate`: `zonedDateTime.toPlainDate()` / `plainDate.toZonedDateTime({ timeZone, plainTime })`.
- `PlainDate ↔ string`: `Temporal.PlainDate.from(string)` / `plainDate.toString()`.
- `Instant ↔ string`: `Temporal.Instant.from(string)` / `instant.toString()`.

The headline mental model: **each conversion is a reasoning step, and the chain reads like a sentence.** Worked canonical example — "I have an `Instant` from the DB and need to know what calendar day it was *for the user*" → `instant.toZonedDateTimeISO(user.timeZone).toPlainDate()`. Three calls, three explicit decisions: attach the user's zone, then drop to the calendar day. The zone is *always named* at the boundary — the same explicitness discipline the storage lessons drilled.

Component: **`AnnotatedCode`** stepping through that exact `instant.toZonedDateTimeISO(user.timeZone).toPlainDate()` chain — step 1 highlights `instant` ("a UTC point, no day yet"), step 2 highlights `.toZonedDateTimeISO(user.timeZone)` ("attach the user's zone — now it has a wall clock"), step 3 highlights `.toPlainDate()` ("drop the clock, keep the day they'd read"). This is precisely the "focus attention on parts of one block in sequence" job `AnnotatedCode` exists for.

Plus a **`DiagramSequence`** OR a single `<Figure>`-wrapped diagram of the conversion graph as a map — the four node-types (`Instant`, `ZonedDateTime`, `PlainDate`, `string`) with labeled directed edges (the method names). Prefer a compact box-and-arrow figure (`ArrowDiagram` inside `<Figure>`, or a D2 graph if denser) the student can use as a reference card; if a scrubbable build-up reads better, a `DiagramSequence` lighting one edge per step works. Pedagogical goal: make the graph *navigable* — the student should be able to find "I'm here, I need to get there, which edge?" at a glance. Spec the diagram in detail for the builder: four labeled boxes, arrows annotated with the exact method (`toZonedDateTimeISO(tz)`, `toInstant()`, `toPlainDate()`, `toZonedDateTime({tz, plainTime})`, `from(str)`, `toString()`), zone-requiring edges visually marked (e.g. a small zone badge) so the "you must name a zone to cross here" rule is visible in the picture. Keep under the height cap; horizontal layout.

Reasoning: conversions are the part students *fail to reason through* — they memorize a method and apply it in the wrong direction. A navigable map plus one annotated worked chain turns it from memorization into wayfinding, and the `instant → day for the user` example is the single most common real conversion in the chapter's domain.

### Durations as data

Teach `Duration` as a *storable, parseable* value, closing the wire-symmetry loop from lesson 1. Two operations:
- Durations compose: `Temporal.Duration.from({ days: 7 }).add({ hours: 12 })`.
- A duration applies to a date: `plainDate.add(duration)` (a `Duration` *is* a valid `durationLike`).

The SaaS pattern: a per-plan "trial length" is data, not a literal — store it as an ISO 8601 duration string (`'P30D'`, `'P1M'`) in an `interval`-typed column or a text column, parse with `Temporal.Duration.from`, apply with `add`. This reuses the lesson-1 rule verbatim: **ISO 8601 strings cross every boundary, Temporal types live only in-memory** — `Duration` is no exception (`'P30D'` on the wire/DB, `Temporal.Duration` in code).

The watch-out worth stating: `Duration` arithmetic with **mixed calendar+exact units** (`{ months: 1, days: 5 }`) is only well-defined with a calendar anchor — applied to a `PlainDate`/`ZonedDateTime` it's fine; "applied" to a bare `Instant` the months are meaningless (same root cause as the `since` months-throw).

Component: `Code` for compose + apply + the `'P30D'` round-trip. Tooltip-worthy: `ISO 8601 duration` (the `P…` grammar is non-obvious — `P30D`, `P1M`, `PT12H`). Reasoning: connects arithmetic back to the storage/wire discipline that frames the whole chapter, and "trial length as configurable data" is a real SaaS need (per-plan trials) the student will hit immediately.

### Six things the senior never writes

Consolidation section — the legacy-retirement payoff. Present as six paired before/after rewrites, each one line of foil and one line of Temporal-correct:
1. `new Date(year, month, day)` with **zero-indexed month** → `Temporal.PlainDate.from({ year, month, day })` (month is 1-based, as humans write it).
2. `date.setMonth(date.getMonth() + 1)` (**mutation + zero-indexing**) → `plainDate.add({ months: 1 })` (immutable, 1-based).
3. `Date.now() + 30 * 24 * 60 * 60 * 1000` for "30 days from now" (**naive ms; wrong across a DST boundary** — that span isn't always 30×24 h) → `Temporal.Now.zonedDateTimeISO(user.timeZone).add({ days: 30 })` (calendar days, DST-correct).
4. `new Date(isoString)` for a **calendar date** (rebinds to midnight UTC, drags the tz gotcha back) → `Temporal.PlainDate.from(isoString)`.
5. Any call to **`date-fns` / `dayjs` / `moment` / `luxon`** → native Temporal. The libraries aren't wrong; they're no longer *paid for* — Temporal is the platform default on this stack, zero bundle, zero dependency.
6. Comparing dates via **`toISOString()` string comparison** → `Temporal.PlainDate.compare` / `.equals` (string compare is brittle the moment formats diverge — offsets, precision).

The unifying thesis to state once: each foil isn't just "old," it's a *bug class*, and Temporal's design retires it structurally — you can't zero-index a month you never pass positionally, can't mutate an immutable value, can't get DST wrong on a type that models the zone.

Component: **`CodeVariants`** with two tabs ("Legacy" / "Temporal") OR a series of tight before/after `CodeVariants` blocks grouped with a `syncKey`, using `del=`/`ins=` markers so the swap is visually obvious. The A/B contrast *is* the teaching here, which is exactly `CodeVariants`' job. Keep each variant's prose to the one-sentence "this is the bug class it retires."

Optional exercise — `Dropdowns` (fenced mode): a short, realistic function body with `___` at each arithmetic site (the "now," the `add` duration object, the conversion method) and options that include the legacy footgun as a decoy (`30` vs `{ days: 30 }`, `getMonth() + 1` vs `add({ months: 1 })`, `toISOString()` compare vs `.equals`). Forces active recall of the correct shape against the wrong one. Strong fit because the answers are *exact strings* and the wrong options are the patterns just retired.

Reasoning: junior devs coming from other ecosystems carry these six habits in muscle memory; an explicit, side-by-side retirement is the most direct way to overwrite them, and naming each as a *bug class* (not just "outdated") satisfies the senior-mindset pillar.

### Running this today: the polyfill seam

Close on the runtime story — the bridge from "Temporal exists" to "I can ship it on the Node my project actually runs." Native Temporal shipped **unflagged in Node 26** (the course's eventual deploy target), but most production SaaS runs **Node 24 LTS** through October 2026 (when Node 26 promotes to LTS). The bridge:
- Install a polyfill: **`temporal-polyfill`** (FullCalendar's, ~20 KB, the modern lean reach) or **`@js-temporal/polyfill`** (TC39 champions', larger, full-spec). Default to the former for a new project.
- The seam lives **once** in `lib/temporal.ts` — `export const Temporal = globalThis.Temporal ?? polyfillTemporal;` — and every file imports `Temporal` from there, never from the polyfill directly (the ESLint `no-restricted-imports` rule from ch009 already enforces this single path). Upgrading to Node 26 is then a **one-line change at the seam**; every consumer is untouched.
- Hard rule: **never mix polyfill and native Temporal in one runtime** — instances aren't interchangeable across the two; the single import path is what guarantees you can't.

The browser line, briefly: Chrome/Firefox/Edge ship Temporal natively (mid-2026); Safari pending. The course's projects do Temporal arithmetic **server-side** and ship ISO 8601 strings to the client to render via `Intl` (ch084), so Safari's gap doesn't bite — the polyfill reaches the client only if you do client-side date *arithmetic*, which these projects don't. State this so the student doesn't over-worry about browser support for a server-side concern.

Component: `Code` for the `lib/temporal.ts` seam line. Reasoning: this is the "trigger before tool / how do I actually ship it" close — the student needs the deploy-reality answer, and the one-line-migration framing is the senior payoff (the whole codebase is insulated from the runtime by one seam). Mirrors the chapter's repeated `lib/temporal.ts`-as-single-seam motif.

### Practice: compute it yourself (live exercise)

Capstone practice. A guided **`ScriptCoding`** (sandpack runner) where the student implements three small functions against a polyfilled Temporal, verified by jest-style assertions:
1. `trialEndsOn(signupDate, timeZone)` → `PlainDate` 30 days out.
2. `daysUntilDue(dueDate, timeZone)` → number of days from "today in the user's zone" to the due date (`until` + `largestUnit: 'day'` + `.days`).
3. `nextBillingDate(startDate)` → `PlainDate` one month out, exercising the month-end clamp (a test case starting Jan 31 asserts Feb 28).

Provide the polyfill import preamble and a typed starter; tests assert exact `.toString()` outputs and the clamp case. Grading criteria: each function returns the correct Temporal value for the seeded inputs, including the month-end edge.

**Hard dependency / fallback:** this requires the sandpack runner to `import` `temporal-polyfill` from npm. If that import is unsupported (the ReactCoding-is-react-only class of limitation — see Scope), **drop the live editor** and instead assess with: a `Dropdowns` fenced-code fill on the same three functions (blanks at the arithmetic sites), plus a `PredictOutput` on the Jan-31 clamp case. The builder must verify sandpack-npm support first and pick the path; do not ship a broken editor.

Reasoning: the lesson is fluency-oriented, so a hands-on "write the actual computations" beat is the ideal capstone — but the course's sandbox constraints are real, so the outline pre-authorizes a guided non-editor fallback that still forces the student to produce the correct shapes.

### External resources (optional)

One or two `ExternalResource` cards: the MDN Temporal reference (the canonical operation surface) and/or the TC39 `proposal-temporal` cookbook (worked recipes). Keep to genuinely high-signal links; this is supplementary.

---

## Scope

**This lesson teaches** the daily Temporal *arithmetic and conversion* surface: the five-type catalog as a decision model; `Temporal.Now.*` with the mandatory-zone reflex; `add`/`subtract` + month-end clamping (`overflow`); `since`/`until` + `largestUnit`; `compare`/`equals`/`before`/`after`; `with`; `round`; the explicit conversion graph; `Duration` as storable data; the six legacy anti-patterns retired; and the `temporal-polyfill` seam for Node 24 LTS.

**Already taught — reference, do not re-teach** (redefine in one clause max where needed):
- The storage/domain/edge split and `timestamptz` ↔ `Temporal.Instant` via `instantColumn` (lesson 1). Assume `lib/temporal.ts` as the single import path and the codecs (`instantFromDate`, `instantFromUnixSeconds`) exist.
- `date` ↔ `Temporal.PlainDate` via `dateColumn`, the instant-vs-day "grammar test", and that `overflow: 'constrain'`/`'reject'` exist on `PlainDate` (lesson 2). This lesson *extends* overflow to `months`-arithmetic and the iteration asymmetry — that extension is in-scope and new.
- `users.timeZone` as an IANA column off the session via `requireOrgUser()`; the no-arg `Intl.DateTimeFormat()` / Vercel-UTC footgun (lesson 3). Reuse `user.timeZone`; re-derive the no-arg footgun *only* as it applies to `Temporal.Now.X()` (a new instance of the known class).
- DST gap/repeat mechanics, `disambiguation`, recurring-schedule wiring (lesson 4). Reference DST as *why* `add({days})` on a `ZonedDateTime` may be 23/25 h; do not re-teach disambiguation or scheduling.
- RSC-wire serialization rule (Temporal instances can't cross as instances — encode to ISO): assume known from lesson 1; mention only if a code sample serializes.

**Reserved for later — name at most once, do not teach:**
- `Intl.DateTimeFormat` / locale-aware *rendering* of Temporal values, and `Intl.RelativeTimeFormat` for "3 days ago" *strings* — ch084 L3. This lesson computes `Duration`s and produces Temporal values; it never formats them to a localized display string.
- `next-intl` timezone/locale config — ch084 L5.
- `users.locale` — ch084 L4.
- DST-boundary *testing* (Vitest `TZ` fixtures) — Unit 18. The `ScriptCoding` capstone tests pure arithmetic, not DST transitions.

**Out of scope entirely** (the chapter outline's "does not cover" plus deliberate cuts):
- Calendar systems beyond ISO (Buddhist, Islamic, Hebrew) — Temporal supports them; the course never reaches for them. One clause acknowledging they exist, no more.
- Temporal's deep/rare surface: `getISOFields`, `getCalendar`, custom calendars, `PlainYearMonth`/`PlainMonthDay`/`PlainTime` operation surfaces. `PlainDateTime` named once (placed, not taught).
- The `interval` Postgres column type at depth, and `time without time zone` — named once at most (Duration-as-data mentions `interval` as a storage option only).

---

## Fact-check notes (verified during authoring)

- **Node/runtime contract.** Kept the chapter's settled framing: native Temporal unflagged in **Node 26**, course runs **Node 24 LTS** with a polyfill through ~Oct 2026 (matches Code conventions §378 and ch009/continuity contract). TC39 docs still label Temporal "Stage 3" in the abstract — but the course's authoritative line (ch009, conventions doc) is the Node-26-ships-it framing; do not regress to "it's only a proposal."
- **Polyfills.** `temporal-polyfill` (FullCalendar) is the smaller (~20 KB) modern reach, actively published (0.3.x, March 2026); `@js-temporal/polyfill` (TC39 champions, 0.5.x) is larger/full-spec. Default to the former; both are valid. Verified current.
- **Month-end clamp.** `overflow: 'constrain'` (default) clamps `Jan 31 + 1 month → Feb 28`; `'reject'` throws `RangeError`. Iteration asymmetry (`add({months:1})` twice ≠ `add({months:2})`) follows from per-step clamping — spec-confirmed. Leap-year clamp (2028 → Feb 29) holds.
- **`since`/`until` months-throw.** Calendar units (`months`/`years`) on a bare `Instant` require a calendar anchor and throw without one — spec-correct; teach as the boundary between exact and calendar units.
- **Builder must verify before shipping:** (a) sandpack runner can `import 'temporal-polyfill'` from npm (capstone live-editor depends on it; fallback specified if not); (b) exact current `temporal-polyfill` version/bundle size at write time; (c) `roundingMode` default and option names against current MDN. These are version-sensitive; confirm at authoring, not from this outline's snapshot.
