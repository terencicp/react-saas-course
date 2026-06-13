# Lesson 2 — Calendar days, not midnight instants

**Title (h1):** Calendar days, not midnight instants
**Sidebar label:** Calendar days

---

## Lesson framing

This is the chapter's *second* storage/domain pair, the direct parallel of lesson 1.
Lesson 1 installed the instant pair (`timestamptz` ↔ `Temporal.Instant` via the `instantColumn` `customType` in `lib/temporal.ts`).
This lesson installs the calendar-day pair (`date` ↔ `Temporal.PlainDate` via a second `customType`, `dateColumn`) and teaches the one discrimination that makes the pair necessary: **a calendar day and a point in time are different domains, and the runtime will not catch a swap.**

Pedagogical spine, in order of importance:

1. **The discrimination is the lesson.** The single load-bearing skill is: given a column, decide *instant* or *calendar day*. Everything else (the column, the codec, the arithmetic) follows mechanically once the student can make that call. Lead with it, reinforce it with a decision aid, close by exercising it. The grammar test from lesson 1's closing `Buckets` ("is the answer 'this exact second'?") is the seed; this lesson *pays it off* — lesson 1 left the "calendar day" bucket as a placeholder/decoy, so the student arrives primed and slightly owed an explanation. Open by collecting that debt.
2. **Teach by mirror, not from scratch.** The student already owns the `customType` pattern, the `fromDriver`/`toDriver` hooks, the seam concept, the ISO-8601-on-the-wire rule, the "`Date` at the seam only" rule, and `Temporal.Now.X(tz)` reflex-awareness. Do **not** re-teach any of it. The whole pedagogical move is "you built the instant pair; here is the day pair, and it is *simpler* — `PlainDate` round-trips through ISO 8601 with no repair, so the codec is one clean line each way." The payoff framing: the hard one is behind you.
3. **Make the bug visceral before the fix.** The date-as-instant mistake is invisible to the author (it works on their UTC-or-near-UTC machine and on Vercel) and only surfaces for a user east of UTC. The Sydney "due yesterday" story is the emotional anchor — show *why* midnight-UTC on May 15 reads as May 14 in Sydney, concretely, with a number line, before naming the structural fix. Minimize cognitive load: one worked timezone, one date, one offset.
4. **Two type-level guards, named explicitly.** The fix is structural and double: **the `date` column rejects the time-of-day; the `PlainDate` type rejects the timezone.** Neither relies on author discipline. This pairing is the senior insight — frame the two guards as a matched set, because students under-appreciate that picking the right *type* is what closes the bug, not careful coding.
5. **Calendar arithmetic stays on `PlainDate`; crossing to time-of-day is explicit.** Show the everyday surface (`add`, `with`, `compare`) lightly — lesson 5 owns arithmetic at depth, so keep it to what a `dueDate` needs and flag the boundary. Teach the one cross-domain bridge this chapter actually uses (`dueDate.toZonedDateTime({ timeZone, plainTime })` → `.toInstant()`) because lesson 4 depends on it, but teach it as "when a calendar day needs a clock time, you *explicitly* attach a tz — nothing is implicit," not as a deep ZonedDateTime lesson.

Mental model the student leaves with: *a column answers one of two questions — "which exact second?" (instant) or "which day, everywhere?" (calendar day). The answer picks the Postgres type, the Temporal type, and the codec, as a locked triple. Crossing between them is always an explicit, tz-naming conversion.*

End-state capability: classify any date-bearing column correctly; declare the `date` column with `dateColumn`; do `dueDate` arithmetic on `PlainDate`; recognize and reject the midnight-UTC-timestamptz anti-pattern in review; bridge a `PlainDate` to an `Instant` when (and only when) a clock time genuinely matters, naming the tz.

Tone: adult, terse, decision-first (per pedagogical guidelines). No "what is a date." Assume full command of lesson 1.

---

## Lesson sections

### Intro (no header — opening prose)

Collect the debt from lesson 1. Open on the placeholder bucket: "Last lesson you sorted a due date and a birthday into a bucket labeled 'calendar day — next lesson' and moved on. This is that lesson."
State the senior question concretely and immediately: an invoice has a `dueDate` — the day the customer agreed to pay by. The naive shape is the one you *just* built: a `timestamptz` set to midnight UTC. Preview the bug in one sentence (a Sydney customer sees "May 15" as May 14) and the resolution: a different storage triple exists for days, and this lesson installs it.
Connect to prior knowledge explicitly: "You already own the machinery — the `customType` pattern, the seam, ISO 8601 on the wire. This lesson reuses all of it; the only new ideas are *when* a column is a day and *why* the day pair is structurally safer." Promise the payoff: this pair is simpler than the instant pair (no space-to-`T` repair).
Keep warm and brief, ~2 short paragraphs.

### The two questions a date column answers

**Goal:** install the discrimination as the lesson's spine before any code.

Content:
- State the core rule up front, bolded: **calendar-day values go in a `date` column with `Temporal.PlainDate`; instant values go in `timestamptz` with `Temporal.Instant`. Not interchangeable; the runtime won't catch a swap.**
- The grammar test, sharpened from lesson 1: *if "May 15" is the answer regardless of where the user stands, it's a calendar day; if the answer is "this exact second," it's an instant.* Give the canonical day examples — `dueDate`, `birthDate`, `subscriptionStartDate`, `effectiveDate`, `holidayDate` — and contrast each implicitly against an instant sibling.
- Frame *why* these are different domains, not just different formats: a birthday is May 5 in Tokyo and in Los Angeles simultaneously; there is no single instant that is "someone's birthday" — it's a different *kind* of thing. This is the conceptual load-bearing point; spend a sentence making it land.

**Decision aid — `StateMachineWalker` (`kind="decision"`, no `<Figure>` wrapper).**
Pedagogical goal: force the student through the *order a senior asks the questions in*, and make the classification reflexive. The walk is short and the lesson lives in the question order, exactly the component's intended use.
Shape:
- Root `<Question id="anchor" prompt="Does the value name a specific moment, or a day on the calendar?">` with two branches:
  - "A specific moment (a point in real time)" → `<Question id="moment-check" prompt="Would two users in different timezones agree on the exact instant?">` → branch "Yes, it's one fixed instant" → `<Leaf id="instant" verdict="timestamptz + Temporal.Instant">` (body: the lesson-1 pair; created/received/expires).
  - "A day on the calendar" → `<Question id="day-check" prompt="If two users in different timezones read it, do they see the same calendar date?">` → branch "Yes — 'May 15' everywhere" → `<Leaf id="day" verdict="date + Temporal.PlainDate">` (body: this lesson's pair; due/birth/effective).
- Add a deliberately tricky third path to surface the borderline: from `anchor`, a branch "It has a time-of-day but the day is what matters to the user" → `<Question id="borderline" prompt="Is the time-of-day intrinsic, or are you inventing midnight to fit a date into a timestamp?">` with two leaves: "Inventing midnight" → reuse `day` leaf (verdict points to `date`); "Intrinsic moment (e.g. when a meeting starts)" → reuse `instant` leaf.
This third path *is* the anti-pattern in disguise — walking it teaches the student to catch themselves reaching for midnight-UTC.

Reasoning: a decision tree beats prose for a binary-with-a-trap classification; the borderline branch is where the real teaching happens.

### What a `date` column stores

**Goal:** establish the storage shape, mirroring lesson 1's "What `timestamptz` actually stores" but much shorter — the student knows how to read a Postgres type doc now.

Content:
- Postgres `date`: four bytes, year/month/day, no time, no timezone, no session-dependent rendering. `2026-05-15` is the same text in every session, on every machine. Contrast in one sentence with lesson 1's headline trap: the `timestamptz` text changed under `SET TIME ZONE`; `date` does not — there's nothing to convert, so nothing to disagree about. This contrast is the cleanest way to show *why* `date` is structurally calmer.
- ISO 8601 calendar-date wire shape: `'2026-05-15'` — no `T`, no `Z`, no offset. Name that this is a *different* ISO 8601 production than the instant's `...Z` form; same standard, narrower shape.

Component: a small `Code` (sql) block is enough — one or two `SELECT due_date::text` lines showing the *same* text under two session zones (deliberately echoing lesson 1's `CodeTooltips` figure, but here the punchline is "both identical"). Keep it a plain `Code` block, no tooltips needed; the prose carries it. This visual rhyme with lesson 1 reinforces the mirror structure.

### The `date` column and its codec

**Goal:** install `dateColumn`, the second `customType`, and show it's the *simpler* sibling.

Content:
- Lead with the contrast that motivates the whole section: the instant codec needed a `value.replace(' ', 'T')` repair because Postgres's *read* text wasn't ISO 8601. `date` has no such problem — Postgres hands back `'2026-05-15'`, which `Temporal.PlainDate.from()` accepts as-is, and `PlainDate.prototype.toString()` produces exactly that shape. So both hooks are one clean line. "The hard codec is behind you."
- The `dateColumn` `customType`, built in `lib/temporal.ts` alongside `instantColumn`. Canonical shape (downstream agent writes the final form; this is the contract):

```ts
// lib/temporal.ts — second codec, beside instantColumn
export const dateColumn = customType<{
  data: Temporal.PlainDate;
  driverData: string;
}>({
  dataType: () => 'date',
  toDriver: (value) => value.toString(),
  fromDriver: (value) => Temporal.PlainDate.from(value),
});
```

- The Drizzle schema call site: `dueDate: dateColumn('due_date').notNull()`. Mirror lesson 1's `instantColumn` usage exactly so the parallel is unmistakable.

Component: **`CodeVariants`** with two tabs comparing the two codecs side by side — tab "Instant pair (last lesson)" showing `instantColumn`'s `fromDriver` with the `.replace(' ', 'T')` repair highlighted (`del`/mark the repair), tab "Calendar-day pair (this lesson)" showing `dateColumn`'s clean `fromDriver`. Prose in each tab is the six-line max. Pedagogical goal: make "this one is simpler" a *visual* fact, not a claim. Per-pane `data-mark-color` (red on the repair line, green on the clean line).

Reasoning: the student's attention should land on the *one line that differs*; `CodeVariants` with marks does that better than two separate blocks.

**Why `PlainDate`, not `Date` or a bare string** — short subsection-worth of prose (not its own h3 unless the writer prefers):
- A bare ISO string can't do arithmetic ("due in 30 days" needs a type).
- A `Date` rebinds to midnight UTC and drags the exact timezone gotcha this lesson exists to prevent back into the domain — the worst possible choice here, named sharply.
- `PlainDate` is immutable, knows *nothing* about timezones (so it *cannot* drift), and exposes `with({ ... })`, `add({ ... })`, `compare(other)`. It is the type whose ignorance of timezones is a feature.

### The midnight-UTC anti-pattern, seen from Sydney

**Goal:** make the bug visceral and concrete, then show the structural fix is the two type guards.

Content:
- Set the scene: `dueDate` declared (wrongly) as `timestamptz`, application writes midnight UTC for "May 15" → stores `2026-05-15T00:00:00Z`.
- Walk the offset concretely for one user: Sydney is UTC+10 (+11 under their DST, but keep it +10 for a clean number — note the simplification so the writer doesn't "correct" it into noise). `2026-05-15T00:00:00Z` is `2026-05-15T10:00:00+10:00` in Sydney — fine. But `Temporal.Now.plainDateISO('Australia/Sydney')` on May 14 at, say, 11pm Sydney is still May 14, and a query that formats the stored instant in Sydney just before the boundary, or stores "today" as midnight-UTC from a Sydney user, lands on the wrong day. The crisp, canonical failure: a Sydney user setting a due date of "today, May 15" has their *local* midnight (`2026-05-15T00:00:00+10:00` = `2026-05-14T14:00:00Z`) stored — read back and formatted naively, it's **May 14**. Keep the worked example to a single direction and a single number line so it doesn't sprawl.
- Name the three surfaces the bug shows up on (briefly, a list): `WHERE due_date = '2026-05-15'` misses rows; the Sydney customer sees "due yesterday"; reports grouped by date attribute half the user base to the wrong day.
- The structural fix, stated as the matched pair of guards: **the `date` column type rejects the time-of-day (there's nowhere to put a midnight); the `PlainDate` type rejects the timezone (there's nothing to offset).** The bug is impossible *by construction* once the triple is right — not "avoided by being careful." This is the senior takeaway of the lesson; bold it.

**Diagram — number line, plain HTML+CSS in a `<Figure>`.**
Pedagogical goal: make "midnight UTC is a different day in Sydney" a picture, not a calculation the student has to trust. Keep horizontal and compact (vertical-space constraint).
Shape: a single horizontal UTC time axis with a marker at `2026-05-15T00:00:00Z`. Below it, two stacked local-clock rails aligned to the same axis: a "UTC / London-ish" rail showing the marker falls on **May 15**, and a "Sydney (UTC+10)" rail showing the *same vertical position* falls at 10:00 on May 15 — and crucially a second marker for the Sydney user's *local midnight* of May 15, which projects back onto the UTC axis at `May 14, 14:00Z`, landing in the **May 14** UTC day-band. Shade the UTC day-bands (May 14 vs May 15) so the "same wall-clock date, different UTC day" crossing is visible as a band change. Caption: "Midnight on the calendar is a different instant in every timezone — which is why a calendar day is not an instant."
This is the lesson's hero visual; budget care for it.

Component note: plain HTML+CSS inside `<Figure>` (the diagrams INDEX routes "annotated illustration / geometric artifact + callouts" to HTML+CSS).

### Doing date math without leaving the calendar

**Goal:** the everyday `PlainDate` arithmetic surface a `dueDate` actually needs — kept shallow, with lesson 5 flagged as the depth.

Content (each one line of code + one line of why; this is a *survey*, not a deep dive):
- "Due in 30 days" = `dueDate.add({ days: 30 })` — returns a new `PlainDate`; immutable.
- "Due in 1 month" = `dueDate.add({ months: 1 })` — and the one subtlety worth teaching here because it bites: **month-end clamping**. Jan 31 + 1 month = Feb 28 (the spec's default `overflow: 'constrain'`), *not* a thrown error or a rolled-over March 3. Name `overflow: 'reject'` as the opt-out for when "Jan 31 + 1 month" *should* error instead of silently clamping. (Verified: `constrain` is the documented default; `reject` throws `RangeError`.) Keep this to a few sentences — it's the one arithmetic gotcha a billing `dueDate` hits.
- "First of next month" = `dueDate.with({ day: 1 }).add({ months: 1 })` — `with` is component-level edit.
- Sorting/comparison: `Temporal.PlainDate.compare(a, b)` for `Array.prototype.toSorted`; `a.equals(b)` / `a.before(b)` for booleans.
- The type guard, restated as a feature: every one of these *rejects* a timezone or time-of-day input. You cannot accidentally do instant-math on a `PlainDate`; the API surface won't let you.

Reach-forward: one sentence — "the full arithmetic surface (`since`, `until`, `round`, `Duration`) is a later lesson; here you only need what a due date asks for."

Component: **`Code`** blocks (simple, one concept each) — or fold the four operations into a single `AnnotatedCode` if the writer wants stepped focus. Lean toward a couple of small `Code` blocks since the operations are independent, not one complex block. Author's discretion; note both options.

**Exercise — `ScriptCoding`, `runner="sandpack"`.**
Pedagogical goal: let the student *do* the discrimination-plus-arithmetic in code, where the type actually rejects misuse. Sandpack is required (TS + the `temporal-polyfill` npm import; the vanilla runner can't bundle either, and native Temporal isn't guaranteed in the iframe).
Task: given a `dueDate: Temporal.PlainDate` and an `issuedAt: Temporal.Instant` (the two domains, side by side), implement small pure functions:
1. `netThirty(due: Temporal.PlainDate): Temporal.PlainDate` → `due.add({ days: 30 })`.
2. `firstOfNextMonth(due: Temporal.PlainDate): Temporal.PlainDate` → `due.with({ day: 1 }).add({ months: 1 })`.
3. `isOverdue(due: Temporal.PlainDate, today: Temporal.PlainDate): boolean` → `Temporal.PlainDate.compare(today, due) > 0`.
Starter imports `Temporal` from `temporal-polyfill`. Tests assert the month-end clamp case explicitly (`PlainDate.from('2026-01-31')` net-thirty / first-of-next-month boundaries) so the student *sees* clamping fire. Keep ~3 tests; criteria via the jest-flavoured `expect`.
Grading: result-equality on `.toString()` of the returned `PlainDate`s; one negative/positive `isOverdue` pair.
Note for builder: if Sandpack + `temporal-polyfill` proves flaky in this runner, fall back to a `Dropdowns` fenced-code exercise where the student fills the `add`/`with`/`compare` calls — keep the discrimination intact either way. (Memory flag: `ScriptCoding` sandpack is the npm-capable runner; this is the right reach, but have the fallback ready.)

### The wire and the boundary: no time component allowed

**Goal:** lock the wire shape and the validation edge, so a midnight-UTC string can't sneak in disguised as a date.

Content:
- Request bodies carry the ISO 8601 *calendar date* string; Zod validates the shape with `z.iso.date()` (Zod v4's top-level ISO date builder — `YYYY-MM-DD`, rejects `T`/`Z`/offset). Note this is the same Zod-v4-top-level-builder discipline from Chapter 042; reuse, don't re-teach. (Verified: `z.iso.date()` is the v4 surface.) Transform to `PlainDate` after validation if the domain wants the type, or store the validated string straight through `dateColumn`.
- Responses serialize via `PlainDate.toJSON()` → the same `'2026-05-15'` string. The RSC/JSON wire rejects a `Temporal.PlainDate` instance exactly as it rejects an `Instant` (class instances aren't structured-cloneable — restate the lesson-1 rule in one line, don't re-derive).
- The *smell* to catch: a value arriving as `'2026-05-15T00:00:00Z'` where a date was expected. `z.iso.date()` rejects it — and that rejection is a *signal*: the upstream code path that produced a midnight-UTC string for a date field is the actual bug. Frame the schema as a tripwire on the anti-pattern, not just input hygiene.

Component: a small `Code` (ts) block showing the Zod schema (`z.object({ dueDate: z.iso.date() })`) and the contrast value it rejects. Optionally `CodeTooltips` on `z.iso.date()` → "Validates `YYYY-MM-DD` only — no time, no zone. A datetime string fails here, which catches a date-as-instant bug at the edge." Keep it one block.

### When a calendar day needs a clock time

**Goal:** teach the *one* cross-domain bridge this chapter uses, framed as an explicit, tz-naming conversion — and set up lesson 4.

Content:
- The legitimate need: "end of business on the due date, in the user's timezone." A `PlainDate` deliberately has no time and no zone, so you must *supply both, explicitly*. This explicitness is the point — there is no implicit "midnight" or "local" anywhere.
- The pattern: `dueDate.toZonedDateTime({ timeZone: user.timeZone, plainTime: '17:00' })` → a `Temporal.ZonedDateTime`; then `.toInstant()` → the `Instant` you'd store or schedule against. The student writes `timeZone` and `plainTime`; nothing is assumed.
- Frame `ZonedDateTime` lightly: "the type that carries a calendar day *and* a clock *and* a zone — the bridge between the two pairs. You'll meet it properly when scheduling work across DST." Do **not** teach DST disambiguation here (lesson 4 owns it) — one forward-pointer sentence.
- Reinforce direction: this is `PlainDate → Instant` (day gains a clock+zone). The reverse — "what calendar day was this instant, for this user?" — is `instant.toZonedDateTimeISO(user.timeZone).toPlainDate()`; mention it as the mirror so the conversion graph reads both ways, but keep it to one line (lesson 5 details the graph).

Component: **`AnnotatedCode`** (ts) on the bridge expression, 2–3 steps highlighting (1) the `PlainDate` source, (2) the explicit `{ timeZone, plainTime }` you must supply, (3) `.toInstant()` producing the storable value. Pedagogical goal: make the explicitness *visible* — every input the conversion needs is named in the code. Use `color` per step (blue/green/orange).

**Exercise — `MultipleChoice` (or `Matching`).**
Goal: check the discrimination one more time under realistic, borderline column names — the lesson's actual assessable skill. Prefer a single `MultipleChoice` with a borderline scenario where the *time-of-day is a red herring* (e.g. "`subscription.startedAt` — the exact moment a trial began" → instant; distractor "it has a date so it's a `date` column"). One question, sharp `McqWhy` explaining the trap. If the writer wants more coverage, a `Matching` drill pairing columns → (`date`/`timestamptz`) is an acceptable alternative; `MultipleChoice` on the *borderline* case is the higher-value reach because the easy cases were already drilled in lesson 1's `Buckets`.

### Closing — the two pairs, side by side

**Goal:** consolidate the now-complete storage/domain half of the chapter and forward-point.

Content:
- The two pairs are now both real, stated as a locked-triple table or tight prose: instant → `timestamptz` / `Temporal.Instant` / `instantColumn` / "this exact second"; calendar day → `date` / `Temporal.PlainDate` / `dateColumn` / "this day, everywhere". One `lib/temporal.ts` owns both codecs.
- Worked borderline cases as the consolidation payload (these are the chapter outline's, sharpened): `subscription.startedAt` = `timestamptz` (the moment a trial began); `birthDate` = `date` (May 5, 1990 everywhere); `event.scheduledFor` = `timestamptz` (a specific moment); and the *neither* case — "send this report at end of day on the 15th of every month" is a recurring *rule*, not a stored value — explicitly hand it to lesson 4 so the student doesn't try to model it as a column.
- Forward-point: the storage/domain half is done (two pairs). Next is the *edge* — "whose timezone?" — where the user's profile timezone enters (lesson 3), then recurring jobs across DST (lesson 4, which uses this lesson's `toZonedDateTime` bridge), then the full arithmetic surface (lesson 5).
- Optional small consolidation visual: a two-row version of lesson 1's three-zone strip, or just the triple table — author's discretion; the table is likely enough and cheaper.

Component option: a simple Markdown table for the two triples, or `CardGrid` with two cards. Table preferred for density.

### External resources

`CardGrid` of `ExternalResource` cards:
- MDN — `Temporal.PlainDate` (the type, its methods).
- MDN — `Temporal.PlainDate.prototype.add` (month-end / `overflow` behavior — the clamping doc).
- PostgreSQL — date/time types (the `date` type authority; same page family lesson 1 linked, anchor to `date`).
- Optional: Drizzle `date` column doc.
Keep to 3–4; don't duplicate lesson 1's `customType` card (assume the student has it).

---

## Terms (for `<Term>` tooltips)

Be strategic — most lesson-1 terms are already burned in. Only add:
- **`overflow` (Temporal)** — "The option controlling out-of-range date arithmetic. `'constrain'` (default) clamps Jan 31 + 1 month to Feb 28; `'reject'` throws instead." (non-obvious, load-bearing for the arithmetic section).
- **`Temporal.PlainDate`** — only on first mention if the writer judges it needs it; the student met the five Temporal types in ch009, so a one-liner reminder ("A calendar date — year/month/day, no time, no timezone.") is justified as prerequisite re-grounding, not new teaching.
- Do **not** re-`Term` `customType`, `fromDriver`/`toDriver`, `seam`, session `TimeZone`, `mode` — all defined in lesson 1; reuse silently.

---

## Scope

**Prerequisites to redefine concisely (one line each, do not re-teach):**
- The `customType` pattern with `fromDriver`/`toDriver` hooks (lesson 1's `instantColumn`) — reused wholesale; assume command.
- ISO 8601 on the wire, Temporal in memory, class instances rejected at the RSC/JSON boundary (lesson 1).
- `Date` allowed at third-party seams only (lesson 1 / ch009).
- The five Temporal types and the `Temporal.Now.X(tz)` "always pass the tz" reflex (ch009 L3) — `PlainDate` is the one this lesson uses; `Temporal.Now.plainDateISO(tz)` for "today" appears but the tz-argument reflex is assumed, not re-taught.

**This lesson does NOT cover (hand off explicitly):**
- The `timestamptz` column / `Temporal.Instant` / `instantColumn` — lesson 1 (done; referenced as the mirror, not re-taught).
- The user's profile `timeZone` column, deriving it at the edge, the Vercel-UTC silent-format bug, the hydration-mismatch fix — lesson 3. (This lesson *uses* `user.timeZone` in the `toZonedDateTime` bridge but treats it as a given value, not a thing to source/validate.)
- `Temporal.ZonedDateTime` at depth, DST disambiguation (`disambiguation`/`offset` options), the spring-forward gap / fall-back repeat — lesson 4. This lesson names `ZonedDateTime` only as the bridge type and shows one conversion; no DST.
- Recurring jobs / Trigger.dev schedules — lesson 4 (the "send report on the 15th" case is explicitly deferred there).
- Full Temporal arithmetic surface — `since`, `until`, `round`, `Duration`, the conversion graph in full, the six anti-patterns — lesson 5. This lesson shows only `add`/`with`/`compare` as a `dueDate` survey, with one forward-pointer.
- `Intl.DateTimeFormat` / locale-aware rendering of a `PlainDate` (the hydration nuance for date-only display) — Chapter 084 L3. Name the boundary in one sentence at most if it comes up in the wire section; do not teach formatting.
- `z.iso.date()` internals / Zod depth — Chapter 042. Use it; assume it.
- `time without time zone`, `interval`, `timestamptz[]`, "wall-clock time" columns — out of scope (lesson 1 named them once; do not revisit).

---

## Code conventions alignment

Checked the dates/Drizzle/Zod sections of `Code conventions.md`:
- `Temporal.PlainDate for calendar days (dueDate, birthDate). Never model a calendar day as midnight-UTC Date.` — this lesson *is* that convention; the anti-pattern section names it directly. (conventions line ~374, 376.)
- `Postgres storage: timestamptz for instants, date for calendar days. The codec in lib/temporal.ts is the only place Date ↔ Temporal conversion happens.` — `dateColumn` lives in `lib/temporal.ts`; aligned. Note the convention says "codec"; lesson 1 upgraded this to a Drizzle `customType` and the continuity notes mark the free-floating `{ fromDb, toDb }` form as the path NOT taken. **`dateColumn` must be a `customType`, matching `instantColumn`** — not a free-floating converter. (Deliberate, consistent with lesson 1's superseding decision.)
- `Wire format: ISO 8601 strings. Parse to Temporal at the boundary.` — the wire section holds this; `'2026-05-15'` is the date production.
- Zod: `z.iso.*` top-level builders, never `z.string().x()` chains (conventions ~252) — the wire section uses `z.iso.date()`. Aligned.
- RSC wire rejects `Temporal.*` (conventions ~136) — restated in the wire section.

No deliberate divergences from conventions in this lesson. The only "divergence from the outline" is the same one lesson 1 made: `customType` over the chapter-outline's free-floating codec object — already canonical per continuity notes.
