# Chapter 2.9 — pedagogical approach

## Concept 1 — The wire is `unknown` until validated

**Why it's hard.** Students see `JSON.parse(req.body)` and start reading fields. The runtime returns "an object," the type system shrugs `any`, and a wrong shape only explodes three layers into the domain. The misconception is that parse and validate are the same step — they are not, and conflating them is how wire-format lies reach business logic.

**Ideal teaching artifact.** A *wrong-by-default sandbox* (Pattern archetype). The student opens a tiny route-handler file that does `const body = await request.json(); return createParcel(body)`. Three pre-canned payloads sit beside it: a valid one, a typo'd one (`weigth` instead of `weight`), and a malicious one (`__proto__` injection). The student runs each — the typo silently corrupts a downstream calculation, the malicious one prototype-pollutes — and the only fix is to drop in a `parseJson<T>(s, schema)` helper that wraps `JSON.parse` then `schema.parse`. The sandbox compiles, runs, and shows the same three payloads now refusing entry with discriminable errors. The artifact's lesson is the *seam* itself, not the Zod surface (Chapter 7.1 owns that).

**Engagement.** After the sandbox passes, a short sort: six call sites (Server Action body, route handler, webhook, `localStorage` read, fetch response, in-memory record), drop each into "needs the seam" or "already typed." The sort confirms the student can spot wire boundaries from the inside.

**Components.**
- `ZodCoding` for the sandbox — it already pairs a Zod schema with `safeParse` scenarios, and the criteria can pin the three payloads. The starter ships with the `JSON.parse`-only version; passing requires the helper.
- `Buckets` for the six-call-site sort.

## Concept 2 — `JSON.stringify` is lossy in four specific ways

**Why it's hard.** The grammar gap is invisible at the call site. `JSON.stringify({ a: undefined })` returns `'{}'` without warning; `JSON.stringify([undefined])` returns `'[null]'`; a `Date` round-trips as a string; a `BigInt` throws only when serialization actually runs. Students who learn these as a bulleted list forget which value does what — the failure mode is "I thought `undefined` came back as `null`" three months later.

**Ideal teaching artifact.** A *round-trip prediction round* (Concept archetype with prediction). Before any list, the student is shown six `value → JSON.stringify → JSON.parse → value'` expressions covering the four holes plus two distractors (`Map` collapses to `{}`, function silently drops). Each is a "what does this print?" with the wrong answer the obvious one. After the prediction round, a single annotated diagram lays out the four holes side-by-side — the same six values, the same outputs, now with the *why* labelled (grammar can't carry, `toJSON` hook fires, `TypeError` thrown, `NaN` coerces to `null`).

**Engagement.** The prediction round *is* the recall beat — each surprise locks one hole. A brief `Matching` follow-up pairs each hole to its production symptom ("analytics column went null," "Stripe ID got dropped," "config object lost a default") to confirm the student carries the failure modes forward, not just the syntax.

**Components.**
- `PredictOutput` for the six expressions.
- A hand-SVG inside `Figure` for the four-hole side-by-side diagram. Value column, wire column, parsed column, with the hole labelled. Single-use, no forward-link — static SVG is correct here.
- `Matching` for the hole-to-symptom follow-up.

## Concept 3 — `class` is a carve-out, not a default

**Why it's hard.** Returning developers carry a 2010s reflex: when in doubt, reach for a class. The 2026 stack inverts that — records and functions are the default, three triggers earn a `class`, everything else is a smell. The misconception isn't "classes are bad," it's that students cannot name the trigger that flips the decision, so they reach by habit.

**Ideal teaching artifact.** A *classifier game* (Decision archetype). Ten realistic situations from the codebase the course is building: `UserService` with five methods, `ValidationError extends Error`, a `Stripe` wrapper holding an API key, a `Cart` that totals itself, a `formatCurrency` helper, an `EventEmitter`, a `RateLimiter` token bucket, a `MailerService` static-only class, a discriminated-union state machine, a row-mapping function. The student drags each into "class" or "module + record." Wrong drops reveal the trigger-or-not reasoning in one line ("`UserService` — a module of functions over a `User` type, no `this` to lose").

**Engagement.** The classifier carries the assessment. A two-question follow-up locks the trigger list explicitly: "Name the three legitimate uses for `class` on this stack" as `MultipleChoice` with one correct combo and three plausible-wrong ones (e.g. *inheritance hierarchies*, *grouping helpers*).

**Components.**
- `Buckets` for the ten-situation classifier, two-column layout.
- `MultipleChoice` for the trigger-recall confirmation.

## Concept 4 — The minimum class surface, and what it refuses

**Why it's hard.** Once a student accepts `class` is rare, the next failure mode is over-using its surface when it *does* appear. TS-`private` looks like privacy and isn't. Getters look like fields and aren't. `abstract class` looks like a contract and is a runtime hole. The misconception is that all class features are equally legitimate primitives; the senior reach uses five and refuses the rest.

**Ideal teaching artifact.** A *code-review simulation* (Pattern archetype). A 40-line kitchen-sink class — `abstract class BaseService` with TS-`private` fields, a getter that fires a network call, a class expression, an inheritance hierarchy, a mixin, a method that loses `this` when passed as a callback. The student leaves inline comments flagging each smell with the senior reach beside it ("`private` → `#private`," "`abstract` → discriminated union and a type," "`get balance()` → `getBalance()`"). The grader checks comments against a rubric of seven expected flags.

**Engagement.** The review *is* the assessment. A short follow-up locks the positive surface — a `Tokens` drill on a canonical seven-line `BillingClient` wrapper, clicking the five primitives that earn their weight (`#stripe`, `readonly`, `constructor`, the arrow-field callback method, the `static` factory) — confirms the student recognizes the shape they should write.

**Components.**
- `CodeReview` for the kitchen-sink class.
- `Tokens` for the canonical-surface recall pass.

## Concept 5 — `Date`'s API invites structural bugs

**Why it's hard.** Each `Date` flaw is a paragraph in a list, and a list of eight flaws is a list of zero flaws by week three. The student needs to feel each surprise — the year-100 heuristic, the format-determined timezone parse, the silent `Invalid Date`, the in-place mutation — at the moment it bites, not read about it.

**Ideal teaching artifact.** A *surprise-driven prediction REPL* (Mechanics archetype, prediction-first). Six `Date` expressions, each engineered to be a one-line trap: `new Date(2026, 0, 31).getMonth()`, `new Date('2026-05-15').toISOString()` next to `new Date('2026-05-15 00:00').toISOString()`, `new Date('garbage').getTime()`, `const d = new Date(); d.setMonth(13); d.getFullYear()`, `new Date(99, 0, 1).getFullYear()`, `JSON.stringify(new Date())`. The student predicts each output before the reveal. Each surprise is one flaw, named on reveal in a single line — no enumeration up front.

**Engagement.** A `Matching` round after the predictions pairs each flaw to the canonical production bug it caused ("reminder fires an hour off twice a year" → DST under `+24h`; "Sydney users see invoices due yesterday" → ISO-date parsed as UTC; "audit log says 0:14 UTC for everyone" → `toLocaleString` on a UTC server). The student should leave able to name three failure modes by their symptom.

**Components.**
- `PredictOutput` for the six expressions.
- `Matching` for the flaw-to-symptom pairing.

## Concept 6 — Five Temporal types, each named for what it is

**Why it's hard.** `Temporal` replaces a single overloaded `Date` with five precise types, and the win — types that refuse ambiguity — is also the friction. The student has to learn *which type goes with which column* before any arithmetic surface is useful, and the temptation is to reach for `Instant` everywhere because it feels most like `Date`.

**Ideal teaching artifact.** A *situational classifier* (Decision archetype). Eight SaaS fields drawn from the codebase the course is building: `created_at` on a row, a user's `birthday`, `next_billing_date`, an audit-log `recorded_at`, a meeting `starts_at` (DST-sensitive), a one-off `scheduled_for` in the user's tz, a stopwatch measuring request duration, a calendar reminder's `due_on`. The student picks one of `Instant`, `ZonedDateTime`, `PlainDate`, `PlainDateTime`, `Duration` per field. Feedback per pick is a one-liner: *"`birthday` is a calendar date with no clock and no tz — `PlainDate`."* The artifact teaches by accumulation; by the eighth field the type-to-field reflex is built.

**Engagement.** The classifier is the assessment. A brief `TrueFalse` round after locks the boundary rules — *"`Instant` carries a timezone"* (F), *"`PlainDate` can answer 'is this before midnight in Sydney?'"* (F, needs `ZonedDateTime`), *"`Duration` is a number of milliseconds"* (F) — three statements, three sharpened edges.

**Components.**
- `Matching` for the eight-field classifier (field on the left, Temporal type on the right; each type may match more than one field). `Buckets` is the alternative if multi-match is allowed cleanly.
- `TrueFalse` for the boundary-rule round.

## Concept 7 — The seam: `Date` at ingress, `Temporal` everywhere else, one import path

**Why it's hard.** Two rules ride together and students collapse them. Rule one: `Date` doesn't disappear — SDKs hand it to you, you convert at the seam. Rule two: `Temporal` is imported from `lib/temporal.ts`, never from the polyfill or the global directly, so the Node 24 LTS → Node 26 native upgrade is a one-line change. The misconception is treating `lib/temporal.ts` as a convenience re-export rather than the architectural chokepoint that lets the polyfill swap.

**Ideal teaching artifact.** A *module-graph seam diagram* (Concept archetype). One drawing: nodes for `lib/temporal.ts`, `lib/stripe.ts`, `lib/triggerdev.ts`, three application files, and the `temporal-polyfill` package. Arrows show the legal paths — Stripe and Triggerdev import the polyfill *through* `lib/temporal.ts` and own the `Date → Temporal.Instant` conversion; application files import `Temporal` from `lib/temporal.ts` only. Two arrows are drawn in red and crossed out: an application file importing `temporal-polyfill` directly, and a `Date` propagating past a seam file into the domain. The diagram is the rule made visible.

**Engagement.** A `Tokens` drill on a code block of six import statements — `import { Temporal } from 'temporal-polyfill'` in `lib/stripe.ts`, the same in `app/page.tsx`, `import { Temporal } from '@/lib/temporal'` in `app/page.tsx`, and three more. The student clicks the *illegal* ones. Wrong picks reveal the rule violated.

**Components.**
- `ArrowDiagram` inside `Figure` for the seam diagram — the existing component fits without strain (boxes for files and the polyfill package, an `arrows` array with `style: 'forbidden'` on the two crossed-out edges if supported, otherwise a styled overlay).
- `Tokens` for the import-legality drill.

## Component proposals

None — every concept maps cleanly to an existing component (`ZodCoding`, `Buckets`, `PredictOutput`, `Matching`, `MultipleChoice`, `CodeReview`, `Tokens`, `TrueFalse`, `ArrowDiagram`, `Figure` with hand-SVG).

## Build priority

No new components proposed. The chapter is well-served by the existing toolkit; the one place a custom widget tempted (a JSON round-trip simulator for Concept 2) is single-use with no forward-link and reads better as a static four-hole `Figure` plus a `PredictOutput` round. Build effort goes into authoring the kitchen-sink class for `CodeReview` (Concept 4) and the wrong-by-default route-handler for `ZodCoding` (Concept 1) — both are content, not components.

## Open pedagogical questions

- Concept 6's classifier needs Temporal-to-field as many-to-many (`Instant` for both `created_at` and `recorded_at`). If `Matching` enforces one-to-one, switch to `Buckets` with Temporal types as the columns and fields as the items.
- Concept 7's `ArrowDiagram` needs a "forbidden edge" visual. If the component doesn't support a crossed-out / red-dashed arrow style, the seam diagram falls back to hand-SVG inside `Figure` — still single-use, still no forward-link, so no proposal escalates.
