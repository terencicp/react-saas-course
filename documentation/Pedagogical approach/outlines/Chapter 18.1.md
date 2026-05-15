## Concept 1 — The storage / domain / edge split as the chapter's spine

**Why it's hard.** Students who've shipped time-handling before have usually fused the three roles into one layer — a `Date` or ISO string that storage, business logic, and the UI all touch directly. The chapter cannot land lesson by lesson until the student sees the three layers as distinct *with different types per layer*: `timestamptz` bytes at storage, `Temporal.Instant` (or `ZonedDateTime`) in the domain, an explicit IANA tz applied only at the edge. Without this spine, every downstream rule looks like a hoop, not a consequence.

**Ideal teaching artifact.** A *Concept* trace-a-value walkthrough. One real moment ("11:47 PM Pacific on March 8, 2026 — DST start") is followed through the three layers in sequence: the user's input at the edge, the Temporal value in the domain, the eight bytes in `timestamptz`, then back out the other side for *two* readers — a New York analyst and a Tokyo operator — each rendering at the edge with their own profile tz. The student watches the *same underlying byte sequence* surface as three different human-readable strings depending on which tz attaches at render. The chapter's rule "store canonical, render local" stops being a slogan and starts being a property of the diagram.

**Engagement.** A short `PredictOutput` round: given the stored UTC instant, the student predicts the rendered string for a third reader (Berlin) before the diagram reveals it. Locks in that the byte payload is invariant and the rendering is a function of *the reader's profile tz*, not the runtime.

**Components.**
- `DiagramSequence` walking the trace through edge → domain → storage → domain → edge, each step in a `Figure` containing a hand-authored SVG of the three-layer band with the active layer highlighted and the value shape in that layer.
- `TabbedContent` for the two-reader render step (New York / Tokyo / Berlin tabs) — same instant, three outputs.
- `PredictOutput` for the third-reader prediction.

## Concept 2 — `timestamptz` stores UTC bytes; the rendering is session-driven

**Why it's hard.** The column name reads as "timestamp with timezone" and the student assumes a tz is stored *per row*. It isn't — eight bytes, microseconds since the epoch, no tz attached anywhere. Every "I changed the column to `timestamptz` and the rendering is still wrong" hour-long debug session starts from this misread. The fix is to feel that *the bytes never change*; only the session's `TimeZone` setting changes the `text` Postgres hands back.

**Ideal teaching artifact.** A *Mechanics* two-session simulator. The student writes one `INSERT` with a single canonical UTC instant, then opens two side-by-side SQL sessions against the same row. Session A has `SET TIME ZONE 'UTC'`; Session B has `SET TIME ZONE 'America/Los_Angeles'`. Both `SELECT created_at` against the same row. The output diverges; a "bytes on disk" panel between them stays constant. The student then toggles Session B's tz to `Asia/Tokyo`, watches the output shift again, while the bytes panel doesn't blink. Storage is UTC; rendering is a session parameter.

**Engagement.** A `SQLCoding` exercise where the student writes a single `SET TIME ZONE` plus a `SELECT created_at` against a seeded row and matches expected rendered strings under three session-tz choices. Assessment is the query result.

**Components.**
- `SQLCoding` against a PGlite-seeded `invoices` table containing one row with a known UTC instant, three criteria each setting a different session `TimeZone` and asserting the resulting `text` rendering.
- `Figure` with a hand-authored SVG of the side-by-side sessions plus the immutable bytes panel — the conceptual scaffold that prefaces the exercise.

## Concept 3 — The codec is the only boundary where types switch

**Why it's hard.** Without an explicit codec, every consumer reaches for its own conversion — one place calls `Temporal.Instant.from(row.created_at)`, another calls `new Date(row.created_at).getTime()`, a third leaves the raw string. The bug class is silent type-drift: one site preserves nanoseconds, another flattens to ms, a fourth reintroduces a `Date` and brings the entire chapter's set of gotchas back into the codebase. The senior discipline is a single seam — `lib/temporal.ts` — that every reader and writer routes through. Once that's in place, the upgrade from polyfill to native Temporal is a one-line import change.

**Ideal teaching artifact.** A *Pattern* before/after side-by-side. *Before:* three consumer files each converting the row independently, a fourth file using a stale `Date`, all four diverging on edge cases. *After:* the same three consumers importing `instant.fromDb` from `lib/temporal.ts`, and a single arrow on the diagram pointing every conversion at one file. The student sees the *shape* of the change — N→1 — and then sees the upgrade-path payoff: when Node 26 lands, the seam's import flips and every consumer stays untouched.

**Engagement.** A `ReactCoding` (tests mode) exercise: the student is dropped into a small codebase with three consumers doing their own conversions and one file `lib/temporal.ts` with stub exports. The tests fail until every consumer routes through the codec and the stubs are filled in. Grep-style assertion: no `Temporal.Instant.from(` outside `lib/temporal.ts`.

**Components.**
- `Figure` with a hand-authored SVG of the N-arrows-to-one-codec shape (before and after, side by side).
- `CodeVariants` showing the consumer file before and after the codec lands.
- `ReactCoding` or `ScriptCoding` for the refactor exercise.

## Concept 4 — Calendar day and instant are different domains; the column type chooses

**Why it's hard.** The "midnight UTC `timestamptz`" hack is the most common date-storage anti-pattern in production codebases and the student has almost certainly written it. It looks like it works in development because the developer's machine is close to UTC. It surfaces in production the moment a Sydney customer's "May 15" invoice reads as May 14 in their local view. The structural fix is the column type — `date` rejects time-of-day input, `Temporal.PlainDate` rejects timezone — but the student has to *feel* the bug first, or the discipline reads as ceremony.

**Ideal teaching artifact.** A *Pattern* misconception-first ambush. The student opens with a working-looking app: a `dueDate: timestamptz` column, midnight-UTC writes, a list view that renders correctly in the developer's local tz. The student is shown the same row rendered from three customer locations (San Francisco, London, Sydney) — one customer's invoice is "due yesterday." A short walkthrough lands the rule: calendar-day semantics live in `date` and `Temporal.PlainDate`; instant semantics live in `timestamptz` and `Temporal.Instant`. The grammar test ("if 'May 15' is the answer regardless of location…") follows.

**Engagement.** A `Buckets` sort of ten SaaS fields — `dueDate`, `createdAt`, `birthDate`, `subscriptionStartedAt`, `eventScheduledFor`, `holidayDate`, `lastLoginAt`, `paymentReceivedAt`, `effectiveDate`, `commentPostedAt` — into `date` vs. `timestamptz`. The bug primed the rule; the sort tests it.

**Components.**
- `TabbedContent` with three panels for the Sydney / London / San Francisco rendering of the midnight-UTC row, each panel containing a `Figure` with the customer-facing line item.
- `Buckets` for the field classification.
- A short `DrizzleSchemaCoding` follow-up where the student authors the two correct column declarations (`createdAt` as `timestamp({ withTimezone: true, mode: 'string' })`, `dueDate` as `date({ mode: 'string' })`) and the schema grader checks the column types and modes.

## Concept 5 — The user's timezone is profile data, not runtime-derived

**Why it's hard.** The single most expensive bug in this chapter is `Intl.DateTimeFormat().resolvedOptions().timeZone` called server-side. It looks right — the API name implies "the user's tz" — and it works locally because the developer's machine isn't UTC. On Vercel it returns `'UTC'` for every user, every time, and every formatter silently renders in UTC. The test suite passes; the bug ships. The student has to internalize that the runtime's `TZ` is *never* a proxy for the user, and that the user's IANA name belongs on the profile.

**Ideal teaching artifact.** A *Concept* deployment-environment toggle. One code snippet — a Server Component that renders an invoice's `createdAt` using `Intl.DateTimeFormat()` with no tz argument — is shown across three deployments: the developer's MacBook in Madrid, Vercel's production runtime (UTC), and a staging container with `TZ=UTC` set explicitly. The student toggles each and sees the same code produce three different rendered strings, only one of which is right for the user looking at the page. The reveal lands the structural fix: the tz argument is *required*, and its source is `user.timeZone` on the profile, never the runtime. The architecture-decision triplet (derive at request, geo-IP, profile column) is named in two lines as the surrounding prose; the toggle is the lesson.

**Engagement.** A `PredictOutput` round: given a snippet calling `Intl.DateTimeFormat().resolvedOptions().timeZone`, the student predicts what the deployment-tested output is on Vercel for a Tokyo user. The first prediction lands the bug; a second snippet shows the fixed version (`Intl.DateTimeFormat(locale, { timeZone: user.timeZone })`) and the student predicts again.

**Components.**
- `TabbedContent` with three panels (local-dev / Vercel / staging-UTC), each showing the rendered output of the no-arg call.
- `CodeVariants` for the broken / fixed snippet pair.
- `PredictOutput` for both prediction rounds.
- `DrizzleSchemaCoding` follow-up: the student adds `timeZone` (text, NOT NULL, default `'UTC'`) and `locale` (named once for 18.2) to the `users` schema; schema grader checks the columns and constraints.

## Concept 6 — The Temporal type catalog and the conversion graph

**Why it's hard.** Five types (`Instant`, `ZonedDateTime`, `PlainDate`, `PlainDateTime`, `Duration`) plus a wire shape (ISO 8601 strings) is a larger surface than `Date` and the student's first instinct is to flatten — pick one and convert at every boundary. That reintroduces every gotcha the type system was designed to refuse. The senior reach is to *pick the right type for the data's shape* and use the conversion methods as the explicit reasoning steps between shapes. The conversion graph is small (six edges that matter) but the student has to see it as a graph, not a list of methods to memorize.

**Ideal teaching artifact.** A *Concept* node-and-edge conversion map. Four nodes — `Instant`, `ZonedDateTime`, `PlainDate`, `Duration` — plus an outlier "ISO 8601 string" node for the wire/DB shape. Edges are labeled with the method that performs the conversion (`toZonedDateTimeISO(tz)`, `toInstant()`, `toPlainDate()`, `Instant.from(string)`, `PlainDate.from(string)`). Clicking a node opens a side panel describing what that type *carries* and what it *refuses* ("`Instant`: epoch nanoseconds, no calendar, no tz. Refuses month arithmetic, refuses wall-clock comparison."). Clicking an edge shows the canonical call site. The graph is small enough to memorize, big enough to teach the discipline that conversion is reasoning.

**Engagement.** A `Matching` drill pairs ten SaaS scenarios ("the moment Stripe captured the payment," "the day the trial ends," "30 days," "9 AM Eastern next Monday," "how long ago the user signed up") with the right Temporal type. Tests type-picking directly.

**Components.**
- Primary recommendation: a Mermaid `graph TD` inside a `Figure` with five nodes and the six labeled edges, plus a `TabbedContent` below with one tab per type showing what it carries and one canonical example.
- Alternative: new `TemporalTypeGraph` component — clickable node-and-edge SVG with side-panel readouts. Forward-link to 18.2's formatter wiring (which type is passed to `Intl.DateTimeFormat`) and Unit 19 DST tests; if forward-links land, build it. Single-use otherwise — demote.
- `Matching` for the recall drill.

## Concept 7 — The arithmetic surface and the six anti-patterns to retire

**Why it's hard.** The chapter's heaviest mechanics lesson is also the one where muscle memory fights hardest. Every student has typed `new Date(year, month, day)` and `date.setMonth(date.getMonth() + 1)` and `Date.now() + 30 * 86400000`. The Temporal equivalents aren't longer — they're shorter and they refuse the bug — but the student has to write each of the six rewrites once with their hands to install the reflex. Reading the table doesn't do it.

**Ideal teaching artifact.** A *Mechanics* guided rewrite puzzle. Six legacy snippets — one per anti-pattern from the lesson — are presented in sequence. For each, the student types the Temporal equivalent against a tiny runnable harness. The harness pre-fills the import line and the function signature; the student writes the body. Tests assert both correctness (the right answer) and structural discipline (no `new Date`, no `Date.now`, no `setMonth`). Each rewrite is short — three to six lines — and the cumulative effect is the daily-reach surface installed. The puzzle covers `add({ days: 30 })`, `subtract({ months: 1 })`, `since` with `largestUnit`, `with({ day: 1 })`, month-end clamping (Jan 31 + 1 month → Feb 28), and the `Duration` round-trip via ISO 8601.

**Engagement.** The puzzle is the assessment. Follow-up beat: a one-question `MultipleChoice` on the month-end edge case — "what does `add({ months: 1 })` twice produce starting from Jan 31?" — to lock in the iterated-clamp gotcha.

**Components.**
- `ScriptCoding` (or `TypeCoding` for one or two type-only items) configured with six sequential criteria, each rewriting one anti-pattern into its Temporal form, with structural rejection of the legacy primitives.
- `MultipleChoice` for the iterated-clamp follow-up.
- `Figure` with a small hand-authored SVG table listing the six anti-patterns and their Temporal rewrites — the reference student takes away.

## Concept 8 — DST gap and repeat as a property of the wall clock

**Why it's hard.** DST is invisible until it isn't. The student knows the clock changes; they don't have a felt sense of *what that does to the timeline* — the spring-forward hour doesn't exist, the fall-back hour exists twice. Without that picture, "use a named tz on the schedule" reads as a configuration tip; with it, the named tz becomes the only sensible default. The lesson cannot land without the visceral image of the gap and the repeat.

**Ideal teaching artifact.** A *Concept* scrubbable wall-clock-vs-UTC timeline — two parallel time axes for March 8, 2026 and November 1, 2026. UTC advances linearly; the wall clock for `America/New_York` jumps (March 8) and repeats (November 1). The student scrubs and watches the wall clock's behavior diverge from UTC's. Three pinned annotations: a job scheduled "at 2:30 AM Eastern" on March 8 (which instant fires?), two jobs scheduled "at 1:30 AM Eastern" on November 1 (which instant fires? both?). The artifact carries the rule that follows: never schedule in the 1 AM–3 AM window; let the scheduler's tz-aware engine pick the instant.

**Engagement.** A `MultipleChoice` round of three questions tied to the timeline's pinned moments: (a) "A job at 2:30 AM Eastern on March 8 — which UTC instant fires under `compatible` disambiguation?" (b) "A job at 1:30 AM Eastern on November 1 — how many times does it fire?" (c) "A daily job at 9 AM Eastern — what's the UTC fire instant on March 7 vs. March 9?" Three questions, three rules locked in.

**Components.**
- Primary recommendation: `DiagramSequence` with hand-authored SVG steps for March 8 and November 1, each step showing the wall-clock-vs-UTC pair around the transition moment, with the pinned-job annotations.
- Alternative: new `DstScrubTimeline` component — two parallel time-axis tracks (UTC linear, wall clock with explicit jump/repeat), a scrubber, and pinnable schedule markers. Forward-links to 18.1.4 (the entire lesson uses this image), Unit 19 DST tests, and 18.2.3's date-rendering edge cases — three credible forward-uses. Worth building; this is the chapter's hardest concept to teach statically.
- `MultipleChoice` round on the pinned moments.

## Concept 9 — Wall-clock schedules use a named tz; cadence schedules use UTC

**Why it's hard.** Once the student has seen DST mechanics, the decision rule has to land cleanly: which jobs need a named IANA tz on the schedule, and which run in UTC? The trap is the middle ground — students reach for "just use UTC everywhere, it's simpler" (and the 9 AM Eastern report drifts to 8 AM half the year) or "always use the user's tz" (and the retention sweep fires three times across a fleet of customer tzs). The discipline is a binary: user-facing wall-clock meaning → named tz; internal cadence → UTC.

**Ideal teaching artifact.** A *Decision* sort exercise. Twelve jobs from a SaaS codebase are presented: weekly summary email for a customer, retention sweep, hourly metric rollup, "9 AM in your timezone" reminder, daily database backup, monthly invoice generation for a B2B tenant, session-cleanup cron, password-reset-link expiry sweep, end-of-business-day audit-log archive, customer-facing "due in 3 days" notification, internal cost-rollup, fraud-signal recompute. The student drags each into "named IANA tz" or "UTC," with the named-tz bucket subdividing by *whose* tz (user, org). Each placement reveals the rationale; wrong placements get the discriminating question ("does the wall-clock time of this job matter to a human?").

**Engagement.** The sort carries the assessment. Follow-up beat: a `PredictOutput` on a Trigger.dev `schedules.task` config with `cron: { pattern: '0 9 * * *' }` and no `timezone` argument — the student predicts the actual fire instant in production (the scheduler's default, typically UTC) and the rule "always pass `timezone` explicitly, even for UTC" lands.

**Components.**
- `Buckets` in three-column mode (user-tz / org-tz / UTC) for the twelve-job sort, with per-item rationale on placement.
- `CodeVariants` showing the same `schedules.task` config with and without the explicit `timezone` argument, plus the resolved fire instants under each.
- `PredictOutput` for the missing-tz config trap.

## Concept 10 — Past intent is honored; future schedules propagate

**Why it's hard.** When a user changes their profile tz, three classes of dependent data exist and they don't all behave the same way. Recurring schedules re-register against the new tz (next fire is in the new context). Already-stored future instants — a one-shot "5 PM Friday in NYC" job that's already been converted to a UTC `Instant` — *don't* shift retroactively; the user's past intent is honored. History is immutable. The bug class is the silent retroactive shift across all three. The student needs to see what propagates and what doesn't, and *why* the rule isn't "always propagate everything."

**Ideal teaching artifact.** A *Concept* click-through dependents widget. Three labeled rows representing the three classes — (1) a recurring `schedules.task` registered for "9 AM weekday Eastern," (2) a one-shot job already enqueued for a specific UTC instant ("Friday 5 PM NYC, converted on Tuesday"), (3) an audit-log entry from last week. The student clicks "user changes tz from `America/New_York` to `Asia/Tokyo`" and reveals the per-row effect: the recurring schedule re-registers (`schedules.update` with the new tz); the one-shot job stays at its already-converted UTC instant (past intent preserved); the audit log doesn't move (history is immutable). Each row exposes the underlying code path on hover — the `schedules.update` call, the absence of a re-conversion, the immutability of the audit table.

**Engagement.** A `Matching` drill pairs five user actions ("changes profile tz," "travels to a new tz without updating profile," "books a one-shot reminder for next Friday at 5 PM," "policy version bump on the schedule rule," "deletes account") with their effect on the three dependent-data classes.

**Components.**
- Primary recommendation: `DiagramSequence` with three steps, each a `Figure` containing a hand-authored SVG of the three-row layout with the row highlighted, the code path annotated, and the before/after instant shown.
- Alternative: `TabbedContent` with three tabs (one per row class) showing the before/after under the tz change.
- `Matching` for the recall drill.

## Component proposals

- **`TemporalTypeGraph`** — clickable node-and-edge SVG of the Temporal type catalog (`Instant`, `ZonedDateTime`, `PlainDate`, `Duration`, ISO-string node) with labeled conversion edges; clicking a node opens a side-panel describing what it carries and refuses, clicking an edge shows the canonical method call. **Uses in this chapter:** Concept 6. **Forward-links:** 18.2.3 `Intl.DateTimeFormat` accepts Temporal directly and needs the same type-picking discipline; Unit 19 DST tests construct values across this graph. **Leanest v1:** a Mermaid `graph TD` inside a `Figure` plus a `TabbedContent` with one tab per type. v1 drops interactivity but preserves the model; build v1 unless 18.2.3 explicitly demands the click-through.

- **`DstScrubTimeline`** — two parallel time-axis tracks (UTC linear, wall clock for a named IANA tz with explicit gap/repeat), a scrubber across the transition window, and pinnable schedule markers showing the resolved fire instant under `compatible` disambiguation. **Uses in this chapter:** Concept 8, with backbone reuse in the lesson body of 18.1.4 generally. **Forward-links:** Unit 19's DST-fixture testing pattern; 18.2.3's date-rendering edge cases around DST; potential reuse anywhere the course teaches scheduler semantics. **Leanest v1:** a `DiagramSequence` with hand-SVG steps for the two transition days, each step a still frame around a pinned moment. v1 captures the gap/repeat statically — usable, but loses the felt sense of scrubbing across the boundary that makes the bug visceral. Build the full version if the forward-links into 19 and 18.2.3 are real.

## Build priority

`DstScrubTimeline` is the higher-priority build of the two. Concept 8 is the chapter's hardest concept to teach statically — the gap and the repeat are temporal phenomena and a still image can show them but not *make them felt*. The forward-links into Unit 19's DST testing and 18.2.3's date-rendering edges give the component three uses across the curriculum; that's enough reuse to justify bespoke work.

`TemporalTypeGraph` is the second-priority build but the Mermaid v1 is closer to feature parity than `DstScrubTimeline`'s v1. The model itself — five nodes, six edges — is small and a static graph teaches it nearly as well. Build v1 first; promote to bespoke only if 18.2.3 ends up wanting the click-through reading.

## Open pedagogical questions

- Concept 3's `ReactCoding` exercise assumes the live-coding harness can run a grep-style structural assertion (no `Temporal.Instant.from(` outside `lib/temporal.ts`) across a multi-file workspace. If it can't, the concept falls back to a `CodeReview` artifact — the lesson still lands but the "fix until the grep is clean" motion is less visceral.
- Concept 8's `DstScrubTimeline` is a meaningful build. The forward-link to Unit 19 is plausible but unverified at this point in the curriculum drafting; if that lesson lands with a different testing artifact, the component becomes single-use-plus-one and the `DiagramSequence` v1 is the right call.
- Concept 7 covers a wide arithmetic surface in one rewrite puzzle. Six items in one `ScriptCoding` block may run long on the student's attention budget; splitting into two three-item exercises with a short prose pivot between them is a credible alternative if pilot feedback flags fatigue.
