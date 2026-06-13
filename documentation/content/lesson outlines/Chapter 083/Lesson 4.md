# DST and recurring jobs

- **Title (h1):** DST and recurring jobs
- **Sidebar label:** DST & recurring jobs

---

## Lesson framing

This is the chapter's most decision-heavy lesson and its first **time-as-future** lesson — every prior lesson (L1 instants, L2 calendar days, L3 the profile tz) modeled time that already happened or is being stored; this one schedules time that *hasn't happened yet*, which is exactly where DST bites. The load-bearing question: when a recurring job is supposed to fire "9 AM Eastern," who decides what real instant that means twice a year when the wall clock skips or repeats an hour? The senior answer is a **binary** the student must internalize and be able to defend both directions: **user-facing, wall-clock-meaningful jobs name an IANA timezone and let the scheduler do DST math; internal cadence jobs (retention, rollups, cleanups) run in UTC.** The wrong answer — the one that ships silently — is letting the *server's* `TZ` decide, which produces "Eastern in dev, UTC in prod" and twice-a-year drift nobody notices until a customer complains their 9 AM report arrived at 8.

Pedagogical spine. The student already holds every primitive this lesson assembles: `requireOrgUser()` → `user.timeZone` (L3), `Temporal.Instant`/`ZonedDateTime` and the `lib/temporal.ts` import seam (L1, L5 — though L5 ships *after* this in source order, the conventions and L1 already establish the type catalog), Trigger.dev `schedules.task` with `cron: { pattern, timezone }` and `schedules.create`/`externalId` (ch066 L4), and the retention sweep with its UTC `cron: '0 3 * * *'` (ch081 L4). This lesson is **assembly and disambiguation, not new primitives** — its value is the decision framework and the DST mental model, not API novelty. Lead every section with the decision; the code is the illustration.

Cognitive-load staging. DST is the genuinely hard concept and most students have never had to reason about it explicitly. Build it in three gradual passes: (1) *what DST physically does to a wall clock* (the gap and the repeat) with a concrete visual before any code; (2) *who handles it* (delegate to the scheduler's tz engine — the student does not hand-roll DST math); (3) *the residual edges the student still owns* (`disambiguation` when they construct a `ZonedDateTime` themselves, idempotency keyed on the instant not the wall-clock string, what propagates when a user's tz actually changes). Never present the full `disambiguation`/`offset` option matrix as a wall; introduce `'compatible'` as the default that needs no thought, then `'reject'` as the one deliberate opt-out, and stop there.

The senior mindset payoff: a junior writes a cron string and moves on; a senior asks "is this wall-clock-meaningful?" first, names the zone explicitly *even for UTC* to make intent legible, never pre-computes a year of fire instants (the IANA database changes mid-year), and keys idempotency on the `Instant` so a fall-back hour can't double-fire. End state: the student can place any recurring job on the UTC-vs-named-zone binary, wire a per-tenant schedule that survives the user changing their timezone, and explain why "never schedule in the 1–3 AM DST band" is a real operational rule.

Reference contracts (lock to these; do not re-derive a different API):
- `schedules.task({ id, cron: { pattern, timezone }, run })` — static, one global schedule, `cron` is an **object**. (ch066 L4)
- `schedules.create({ task, cron, timezone, externalId, deduplicationKey })` — dynamic, per-tenant, `cron` is a plain **string**, `timezone` is **top-level** (shape flips — call this out as ch066 already did). (ch066 L4)
- `schedules.task` `run(payload)` receives `payload.timestamp` and `payload.lastTimestamp` as **`Date` objects** (UTC), plus `payload.timezone`, `payload.externalId`, `payload.scheduleId`. Convert `Date` → `Temporal.Instant` at the seam with the L1 `instantFromDate` codec (`Temporal.Instant.fromEpochMilliseconds(payload.timestamp.getTime())`) — *not* `Instant.from(string)`; the payload carries `Date`, not ISO strings. **This corrects the chapter outline, which said "ISO strings."**
- Internal cadence: `cron: '0 3 * * *'` plain UTC string, no `timezone` arg needed but stating `timezone: 'UTC'` is the legible form. (ch081 L4 retention sweep)
- `Temporal.Now.zonedDateTimeISO(zone).subtract(calendarDuration).toInstant()` — calendar-unit (days/months/years) subtraction must happen on a `ZonedDateTime`, never `Instant.subtract`. (ch081 L4, conventions)
- `requireOrgUser()` → `{ user, orgId, role }`; `user.timeZone` is the IANA string. (ch057 L2, ch083 L3)
- All `Temporal` imports come from `lib/temporal.ts` (the single import seam; ESLint-enforced). (ch009, ch083 L1)

---

## Lesson sections

### Introduction (no header)

Open with the concrete senior question, framed in production stakes. A B2B customer has a daily report wired to fire at "9 AM Eastern." It works in March. On the morning of November 1, 2026 (US fall-back) it arrives at 8 AM their time, and the customer files a ticket. Nothing in the code changed; the *wall clock* changed under it. Name the lesson's promise: by the end the student can decide, for any recurring job, whether it names a timezone or runs in UTC, wire both, and never ship the silent-drift bug. Connect explicitly to what they already hold: the `users.timeZone` column from L3 and Trigger.dev `schedules` from ch066 — "you have the column and you have the scheduler; this lesson is the rule that connects them." Keep warm and brief (~2 short paragraphs). State the binary up front as the thesis so the rest of the lesson hangs off it.

### What DST does to a wall clock

**Goal:** install the physical mental model *before* any scheduling code, so "the 2 AM hour doesn't exist / the 1 AM hour happens twice" is concrete, not abstract. This is the load-bearing concept; everything else is consequence.

Content. Two transitions, named with the 2026 US dates so they're real: **spring forward** (March 8, 2026) — the wall clock jumps 1:59 AM → 3:00 AM, the 2 AM hour *does not exist*; **fall back** (November 1, 2026) — the wall clock falls 1:59 AM → 1:00 AM, the 1 AM hour *happens twice*. Frame the consequence for a naive scheduler: a job scheduled for 2:30 AM in the gap has no instant to fire at; a job at 1:30 AM in the repeat has two. This is *why* DST is a scheduling problem and not just a formatting curiosity.

Land the practical operating rule here, early, because it's actionable and reassuring: **never schedule recurring jobs in the 1 AM–3 AM window of a DST-observing zone.** 9 AM, noon, 5 PM are always safe — they're never in a gap or repeat. This single rule sidesteps most DST pain; the rest of the lesson is for when you can't avoid it or when you construct times yourself.

Reinforce the deeper principle from the chapter's spine (restate concisely, it's a prerequisite framing not a new teach): **DST is a property of the calendar, not the timestamp.** A `Temporal.Instant` is unambiguous (it's just a count from the epoch); ambiguity only appears when you attach a wall clock and a zone — i.e. in `ZonedDateTime`. So DST math lives in exactly one type, and the scheduler owns most of it.

**Diagram — `DiagramSequence` (the section's centerpiece).** Pedagogical goal: make the gap and the repeat *visible* as a clock-strip, since this is the concept students fail to picture. Four steps, each a horizontal CSS strip of hour cells (… 12, 1, 2, 3, 4 …) styled with Tailwind/inline CSS inside `DiagramStep`:
1. *Normal day* — cells 12→1→2→3→4 evenly spaced, neutral. Caption: an ordinary 24-hour day, every hour appears once.
2. *Spring forward* — the 2 AM cell is struck out / greyed with a "skipped" label and a red arrow leaping 1:59 → 3:00. Caption: the 2 AM hour does not exist; a job scheduled at 2:30 has no instant.
3. *Fall back* — two stacked 1 AM cells (1 AM first occurrence, 1 AM second occurrence) tinted differently with an "happens twice" label. Caption: the 1 AM hour repeats; a job at 1:30 could fire twice.
4. *Safe band* — the same strip with 9 AM / noon / 5 PM cells highlighted green and the 1–3 AM band shaded amber. Caption: schedule in the green band, avoid the amber; the operating rule in one picture.
Use `DiagramSequence` (not a static figure) so the student scrubs through transition-by-transition — the temporal scrub mirrors the temporal concept. Do **not** wrap in `<Figure>` (it provides its own card).

**Tooltips (`Term`):** **DST** (Daylight Saving Time — the twice-yearly clock shift; not observed everywhere, which is itself why a fixed UTC offset can't model it). **IANA timezone** (re-link to L3's definition concisely — a named zone like `America/New_York` that carries the full historical + future DST rule set, unlike a bare `-05:00` offset).

No exercise here — keep momentum into the decision; the understanding check lands after the binary is taught.

### The binary — name a zone, or run in UTC

**Goal:** the central decision of the lesson. Give the student a crisp, defensible rule for routing any recurring job to one of two homes, and the reasoning behind each.

Content. Present the three candidate architectures the chapter outline lays out, then collapse to the binary:
- **(a) Schedule in UTC, period.** `0 13 * * *` is 9 AM EST in winter but 8 AM EDT in summer — the wall-clock time the customer experiences *shifts by an hour twice a year*. Correct for cadence jobs, wrong for wall-clock-meaningful jobs.
- **(b) Schedule with a wall-clock expression + named IANA zone.** The scheduler computes the next real instant using the zone's DST rules; "9 AM Eastern" stays 9 AM Eastern year-round. The default for user-facing jobs.
- **(c) Hybrid — UTC trigger + per-fire computation in app code.** More work, same answer as (b); name it once as "what (b) does for you," not a recommendation.

Then state the binary as the takeaway: **user-facing & wall-clock-meaningful → name the user's/org's zone; internal cadence → UTC.** Give the discriminator test (parallels L2's "grammar test" so it's a familiar move): *"Would a human be upset if this ran an hour off?"* If yes (a customer's 9 AM report, a billing-cutoff email), it's wall-clock-meaningful → named zone. If no (retention sweep, metric rollup, cache warm), it's cadence → UTC.

Name the failure mode explicitly: letting the **server's `TZ`** decide. Restate the L3 fact that Vercel runs `TZ=UTC` and the developer's laptop doesn't, so an un-zoned wall-clock schedule is "Eastern in dev, UTC in prod" — the test passes locally and the bug ships. The cure is to *always pass `timezone` explicitly*, even for UTC schedules, so intent is legible and the runtime default is never load-bearing.

**Exercise — `StateMachineWalker` (`kind="decision"`).** This is the ideal vehicle: the lesson *lives in the order the senior asks the questions*, which is exactly what the walker enforces. Pedagogical goal: drill the routing decision until it's reflexive. Root question: "Is the fire time meaningful to a human in a specific place?" Branches funnel a handful of concrete course jobs to leaves:
- "9 AM weekday summary for a B2B customer" → Leaf: **Named IANA zone** (`schedules.task` with `cron: { pattern, timezone }`, or per-tenant `schedules.create`).
- "Monthly invoice issued on the company's clock" → Leaf: **Org zone** (`organizations.timeZone`, not the recipient's — restate L3's org-vs-user split).
- "Nightly retention sweep / hourly metric rollup" → Leaf: **UTC** (`cron: '0 3 * * *'`, the ch081 shape).
- "Send the welcome email 24h after signup" → Leaf: **Neither — one-shot, not recurring** (`wait.until(instant)` from ch066 L5; the instant was already computed at signup in the user's zone). Include this as the instructive non-recurring decoy so the student learns recurring-vs-one-shot is a prior question.
Each leaf's body names the API and the one-line reason. Keep 4–5 leaves; don't sprawl. Provides its own card — no `<Figure>`.

**Tooltip (`Term`):** **cadence** (how *often* a job runs, independent of what wall-clock time it lands on — the property that makes UTC correct).

### Wiring a static schedule — `schedules.task`

**Goal:** show the named-zone form end to end and the seam where the `Date` payload becomes a `Temporal.Instant`. This is the concrete "user-facing wall-clock job" recipe.

Content. Reach for the static `schedules.task` form from ch066 L4 — one global schedule, declared in code, DST-safe because `cron` is the **object** form `{ pattern, timezone }`. Canonical example: a weekday 9 AM Eastern summary. Then the part this lesson adds that ch066 didn't dwell on: **what the `run` handler receives and how to get a Temporal value out of it.** The payload's `timestamp` and `lastTimestamp` are **`Date` objects** (UTC) — convert at the seam with the L1 codec, *do not* propagate the `Date`. This is the same "Date at the seam, Temporal in the domain" discipline from L1, now applied to a Trigger.dev payload.

**Code — `AnnotatedCode`** (single block, multiple focus points → annotated is the right tool). `lang ts`, `maxLines` ~14, steps tinted blue except where noted. The block is a `schedules.task` definition for `weekly-summary`. Steps:
1. meta the `cron: { pattern: '0 9 * * 1-5', timezone: 'America/New_York' }` lines, color green — the object form; `timezone` is what makes this DST-safe. State explicitly: pass it even though you *could* compute UTC by hand — legibility and correctness.
2. meta the `run` signature + `payload` — the handler runs at the real instant the scheduler picked using the zone's DST rules; the student didn't compute it.
3. meta the `payload.timestamp` access + the `instantFromDate(payload.timestamp)` conversion, color orange — the seam. `payload.timestamp` is a `Date`; convert immediately to `Temporal.Instant` via `lib/temporal.ts`. Call out: **not** `Instant.from(...)` — the payload is a `Date`, not a string.
4. meta the downstream domain call (e.g. `buildSummaryFor(orgId, fireInstant)`) — everything past the seam operates on `Instant`; the `Date` never escaped.

Add one tight `Aside` (caution) restating the "pass `timezone` even for UTC" rule so it sits next to the code that omitting it would break.

**Tooltip (`Term`):** none new here (carry `IANA timezone`).

### Per-tenant schedules and the propagation problem

**Goal:** the SaaS-shaped case — "each customer picks their own 9 AM" — and the genuinely hard part of the whole lesson: what happens to scheduled work when a user changes their timezone. This is where juniors ship bugs.

Content, in two movements.

*Movement 1 — registering per-tenant.* "Send me my report at 9 AM in *my* zone" is per-user: N users, N schedules. Reach for `schedules.create` (ch066 L4) — created at runtime on opt-in, with `externalId: userId` for idempotent lookup and `deduplicationKey` so re-registration doesn't duplicate. **Call out the shape flip explicitly** (ch066 already flagged it as the most common mistake): in `schedules.create`, `cron` is a plain **string** and `timezone` is a **top-level** field — *not* nested in `cron` like the static form. Show `schedules.del(scheduleId)` on opt-out (the v4 method is `del`, not `delete`; the id comes from the create result or a `schedules.list({ externalId })` lookup). Keep this to a short `Code` block (recognition-grade — they met the API in ch066), not a heavy walkthrough.

*Movement 2 — the propagation problem (the senior payoff).* When the user changes `users.timeZone` on the profile (the L3 surface), three classes of dependent data react differently — this is the mental model the student must leave with:
- **(a) Future recurring schedules** — re-register with the new zone via `schedules.update(scheduleId, { task, cron, timezone: newZone })`, gated on the diff. Note the API shape: the first arg is a **schedule id** (resolve it from `externalId` via the create result or `schedules.list`), and `update` takes `cron` as a plain string + top-level `timezone` (same flat shape as `create`, *not* the nested object form). The propagation chain: profile-tz change → recompute the schedule's zone. **This is the canonical "profile tz exists but schedules still fire in UTC" bug when skipped** — name it.
- **(b) Already-computed future one-shot instants** — a "5 PM next Friday in the user's zone" job was converted to a fixed `Instant` at scheduling time; changing the profile zone does **not** retroactively shift it. The default is *"past intent is honored"* — a job scheduled when the user was in New York fires at the New-York-derived instant even after they move to Tokyo. The bug class is the *silent retroactive shift*; the cure is an explicit "update these N scheduled deliveries?" prompt, never an automatic rebase.
- **(c) Already-fired past instants** — history; these never change.

Also name the **valid alternative** the chapter outline raises: a scheduler that recomputes the zone *from the user profile on every fire* (rather than storing it on the schedule) absorbs profile changes for free — no `schedules.update` call needed. Present it as a legitimate design trade, not the default, so the student sees the decision space.

**Diagram — small `ArrowDiagram` or HTML+CSS table inside `<Figure>` (propagation map).** Pedagogical goal: make the three-class split scannable. A 3-row visual: each row = a data class (future recurring / future one-shot / past), columns = "what it is" / "reacts to tz change?" / "how." Green check on (a) "re-register," amber "honored as-is + prompt" on (b), grey "never" on (c). Keep it compact (well under the height cap). If `ArrowDiagram`, remember `expandable={false}`.

**Exercise — `Buckets` (classification drag-and-drop).** Pedagogical goal: lock the propagation mental model by sorting concrete events. Two buckets: **"Re-register the schedule"** vs. **"Honor as-is (don't touch)."** Items: "the user's weekly 9 AM digest after they move to Tokyo" (re-register), "a one-shot reminder already scheduled for next Friday 5 PM" (honor), "last month's report that already sent" (honor — it's past), "a newly-enabled daily summary" (re-register), "an internal UTC retention sweep" (honor — never depended on the user's zone). 5 items, clean split. `Buckets` is the right fit — this is exactly category classification.

**Tooltip (`Term`):** **`externalId`** (the caller-supplied key — here the user/org id — that ties a Trigger.dev schedule back to your row so you can update or delete it later).

### The edges you still own — `disambiguation` and idempotent fires

**Goal:** the two residual correctness concerns the scheduler does *not* handle for you, kept deliberately narrow. This is the "what a senior still gets right" section.

Content, two focused parts.

*Part 1 — `disambiguation` when you construct a `ZonedDateTime` yourself.* The scheduler handles DST for `cron`-driven schedules, but the moment the student writes `someZonedDateTime.with({ hour: 9 })` or builds a `ZonedDateTime` from a wall-clock value (e.g. computing a one-shot fire instant), *they* are choosing what happens at a gap or repeat. Introduce **only two** options to keep load low:
- `disambiguation: 'compatible'` (the default — needs no thought). Spec-correct framing (verified against the spec, **correcting the chapter outline's wording**): on a spring-forward **gap** it moves *forward* by the gap (picks the later instant); on a fall-back **repeat** it picks the *earlier* of the two instants. This matches what most users expect; you rarely override it.
- `disambiguation: 'reject'` (the one deliberate opt-out) — throws `RangeError` on any gap or repeat, so an ambiguous wall-clock time becomes a loud error instead of a silent guess. Reach for it when a wrong-by-an-hour fire would be unacceptable and you'd rather fail and ask.
Do **not** enumerate `'earlier'`/`'later'` or the `offset` matrix — name that "more options exist for niche cases" in one clause and move on (cognitive-load discipline). Tie back to the operating rule: if you schedule in the safe 9 AM band, you never hit a gap or repeat and `disambiguation` never fires — the rule and the option reinforce each other.

*Part 2 — idempotency keyed on the instant, not the wall clock.* Restate concisely from ch066 L5 (prerequisite, not new): every scheduled fire carries an idempotency key. The DST-specific trap: under fall-back, a naive key built from the *wall-clock string* (`"2026-11-01 01:30"`) could collide across the repeated hour and make a legitimate second fire a no-op — or, inversely, fail to dedup a true double-fire. The structural cure: **key on the `Instant`** (`` `${scheduleId}:${fireInstant.toString()}` ``). Two instants that share a wall-clock representation under fall-back are *different* `Instant` values and produce *different* keys; the µs/offset distinction the type carries does the disambiguation for free. This is the chapter's "the type makes the bug unrepresentable" move applied to scheduling.

**Code — `CodeVariants` (wrong vs. right key).** Pedagogical goal: the before/after is the clearest way to show why the instant key wins. Two tabs:
- **"Wall-clock key (drifts under fall-back)"** — key from a formatted wall-clock string; `del`-mark the brittle line. Prose: under fall-back two distinct fires hash to the same key; one is silently dropped.
- **"Instant key (structural)"** — key from `fireInstant.toString()`; `ins`-mark it. Prose: distinct instants → distinct keys; the repeated hour can't collide.
Use per-pane mark colors (red pane / green pane) per the component's `data-mark-color` hook.

*Compute-fresh caveat (one paragraph, name once).* Tie off the chapter-outline point: never **pre-compute** a year of fire instants into a table — the IANA `tzdata` updates several times a year (countries change rules), so a pre-computed November instant can drift. Compute only the *next* fire, at fire time, from current tz data; the platform (Node 26 / Vercel) keeps `tzdata` current — don't ship a hand-rolled tz library. One paragraph; it's an operational rule, not a code teach.

**Tooltips (`Term`):** **disambiguation** (Temporal's option for *which* real instant a wall-clock time resolves to when DST makes it ambiguous or impossible). **tzdata** (the IANA Time Zone Database — the canonical, frequently-updated dataset of every zone's offset and DST history/future; bundled with the runtime).

### Putting it together — internal cadence vs. wall-clock, side by side

**Goal:** consolidation. End the lesson by placing the two homes literally next to each other so the binary is the last thing the student sees, and connect to jobs they've already built.

Content. A tight `CodeVariants` (or `Tabs`) with two panes that the student can A/B at a glance:
- **"Internal cadence — UTC"** — the ch081 retention sweep shape: `schedules.task({ id: 'retention-sweep', cron: '0 3 * * *', ... })`, body uses `Temporal.Now.zonedDateTimeISO('UTC').subtract(ttl).toInstant()` (restate the calendar-units-need-ZonedDateTime fact in one clause). Prose: no human cares it runs at 3 AM UTC; cadence, not wall clock → UTC.
- **"User-facing — named zone"** — the `weekly-summary` shape from earlier: `cron: { pattern: '0 9 * * 1-5', timezone: 'America/New_York' }`. Prose: a human reads this at 9 AM their time year-round → named zone.
This reuses code already shown — deliberately, so the contrast is the lesson, not new syntax. Close with a one-line restatement of the binary and the "pass the zone explicitly, even for UTC" rule as the durable takeaways.

**Exercise (optional, if a check is wanted to close):** a 3–4 statement `TrueFalse` round as a fast recall gate. Candidate statements: "A UTC cron string keeps a 9 AM Eastern report at 9 AM Eastern year-round" (false), "`disambiguation: 'compatible'` throws on a spring-forward gap" (false — it moves forward), "Keying idempotency on the fire `Instant` survives fall-back's repeated hour" (true), "Changing a user's profile timezone should automatically rebase their already-scheduled one-shot reminders" (false). Prefer `TrueFalse` over a heavier exercise here — the section is consolidation, not new material.

### External resources (optional)

`ExternalResource` cards: Trigger.dev scheduled-tasks docs (`schedules.task` / `schedules.create`, `cron` object vs string, `externalId`), and MDN `Temporal.ZonedDateTime` (disambiguation reference). Keep to two; both are the canonical primary sources for this lesson's APIs.

---

## Scope

**Prerequisites — redefine concisely, do not re-teach:**
- `users.timeZone` IANA column, read via `requireOrgUser()` → `user.timeZone`, and `organizations.timeZone` for org-scoped jobs — **L3 owns this**; here it's a given input.
- `Temporal.Instant` / `ZonedDateTime` / `Duration`, the `lib/temporal.ts` import seam, and `instantFromDate` — **L1 owns**; reference, don't re-derive.
- Trigger.dev `schedules.task` / `schedules.create` mechanics, `cron` object-vs-string shapes, `externalId`/`deduplicationKey`, queues, payloads — **ch066 L4 owns**; this lesson uses them, focusing only on the `timezone`/DST dimension.
- `idempotencyKey` and `wait.until` mechanics — **ch066 L5 owns**; restate only the key-on-instant DST wrinkle and name `wait.until` once for the one-shot decoy.
- The retention sweep job itself — **ch081 L4 owns**; reuse its shape as the UTC exemplar, don't rebuild it.

**This lesson does NOT cover:**
- The `timestamptz` column / `Instant` codec internals — L1.
- Date-only columns / `PlainDate` — L2.
- Sourcing/validating the profile timezone — L3.
- The **full** Temporal arithmetic surface (`since`/`until`/`round`/`with` at depth, month-end clamping, the six anti-patterns, the polyfill story) — **L5**. Use only the minimal arithmetic these schedules need (`subtract().toInstant()`, `with({ hour })`) and lean on it as already-familiar; do not turn this into the arithmetic lesson.
- `Intl.DateTimeFormat` / locale-aware rendering of fire times — ch084 L3.
- `next-intl` timezone config — ch084 L5.
- Trigger.dev retries/waitpoints/queues at depth — ch066 L5/L6.
- `pg_cron` as an alternative scheduler — name once as "the hand-rolled path you don't take," no walkthrough.
- DST **testing** patterns (Vitest `TZ` fixtures straddling transitions) at depth — Unit 18. May name in one clause that "DST is testable" but build no test.
- The `offset` option and `disambiguation: 'earlier' | 'later'` — out of scope; one clause acknowledging "more options exist."

---

## Notes for downstream agents

- **Deliberate divergences from the chapter outline (flagged so you don't 'correct' them back):**
  - The chapter outline says `schedules.task` payload carries `timestamp`/`lastTimestamp` as **ISO strings**. Verified false — they are **`Date` objects**. Convert with `instantFromDate(payload.timestamp)`, not `Instant.from(string)`.
  - The chapter outline describes `disambiguation: 'compatible'` as "use the later instant on fall-back." Verified incorrect against the Temporal spec — `'compatible'` picks the **earlier** instant on a fall-back repeat and moves **forward** (later) on a spring-forward gap. Use the spec-correct wording.
- **Verified v4 SDK method names (do not regress):** schedule deletion is `schedules.del(scheduleId)` (**not** `schedules.delete`); update is `schedules.update(scheduleId, { task, cron, timezone })` where `cron` is a plain string and `timezone` is top-level (the flat `create` shape, not the nested `cron` object). The first arg to both is a schedule **id**, resolved from your `externalId` via the create result or `schedules.list`.
- **Code-shape staging:** these schedule definitions intentionally show the minimal arithmetic (`subtract`, `with`) without the full L5 surface — that's deliberate sequencing, not an omission. Keep examples skeletal; elide DB/query plumbing behind small named helpers (`buildSummaryFor`, `deleteExpired`) so the time logic is what's in focus.
- **Single import seam:** every `Temporal` reference and the `instantFromDate` codec import from `lib/temporal.ts` — never from a polyfill or `globalThis.Temporal` directly (ESLint `no-restricted-imports`, ch009).
- Component card rule: `DiagramSequence`, `StateMachineWalker` provide their own outer card — never wrap in `<Figure>`. `ArrowDiagram` inside `<Figure>` needs `expandable={false}`.
