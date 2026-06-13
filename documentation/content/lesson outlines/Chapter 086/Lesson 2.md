# The honeycomb shape for a Next.js SaaS

- **Title (h1):** The honeycomb shape for a Next.js SaaS
- **Sidebar label:** The honeycomb shape

---

## Lesson framing

This is the second of four teaching lessons in Unit 18 / Chapter 086. Lesson 1 wired the runner (Vitest 4, three projects, watch vs `run`). This lesson answers the next senior question: now that a test *can* run, **what kind of test, and where does it live?** It is a decision/architecture lesson, not a setup or syntax lesson — almost no new API surface, very little code. The deliverable is a mental model the student carries into chapters 087–090.

**The one idea.** Shape follows the bug. You do not pick a test shape off a chart and write to it; you find where bugs cluster in *this* kind of system and put the tests there. In a Next.js 16 SaaS the framework owns most orchestration, so bugs cluster at the **seams** — the database, the auth layer, third-party APIs, webhook receivers. The honeycomb (integration-heavy) is the *consequence* of that bug density, not a prescription to memorize. Every other point in the lesson is in service of this rule.

**Pedagogical arc (low cognitive load, simple → complex).**
1. Ground the student in the four concrete bug layers of *their* codebase before naming any shape.
2. Surface the inherited default they will reach for — the test pyramid — and show precisely *why* it is the wrong fit here (it assumes deep framework-independent business logic; this codebase doesn't have that).
3. Introduce the honeycomb as the shape that *falls out of* the bug density, contrasted against pyramid and trophy. Pin the course to it.
4. Concretize each band with real project artifacts the student already knows (the `/lib` surface, the **six seams from chapter 080 lesson 3**, components, money paths).
5. Gate the two thin layers (component, E2E) behind the course's established "default by capability, conditional reach with a named trigger" pattern.
6. Close on the durable rule ("shape follows the bug") and the inverse — **what does not get a test** (the framework, behaviourless UI).

**Where beginners go wrong (the lesson must dismantle these).**
- Cargo-culting the pyramid: hundreds of unit tests on trivial helpers, fear of integration tests.
- Defaulting to component/UI tests because the front-end is the visible part — the bugs usually live elsewhere.
- Reading "honeycomb" as a *coverage target* (counts per band) rather than a *location* heuristic.
- Skipping integration tests because "unit tests already cover that code" — they don't; the seam is the thing under test.
- Testing the framework (rendering, routing, `<Link>`, `redirect()`) — that's Vercel's test suite, not the app's.

**Tone.** Adult, terse, senior-mindset-first per the pedagogical guidelines. Lead with the decision and the reasoning; code and diagrams illustrate. This lesson is reasoning-dense and figure-anchored, not code-dense.

**Continuity to honor (from Lesson 1 continuity notes).**
- Vitest is **4.x** (4.1 stable). The chapter brainstorm says "Vitest 3" — ignore that; treat the runner as v4 everywhere.
- Three projects already exist: `unit` (node, `src/**/*.test.ts`), `integration` (node, `tests/integration/**/*.test.ts`), `component` (jsdom, commented out until ch089). Refer to these by name; do not redefine them.
- Jest was named once in Lesson 1 as "the predecessor" and never again — **do not reintroduce Jest** in this lesson.
- Integration DB lifecycle, MSW, and `withRollback` are *named-forward* only (ch088); component RTL is forward-only (ch089); Playwright is forward-only (ch090). This lesson references them as destinations, never teaches them.

---

## Lesson sections

### Introduction (no heading — opening prose)

Open on the concrete senior question, warm and brief (~2 short paragraphs). The runner is wired and green on an empty suite; the team is about to write its first hundred tests. The wrong move is to open a "testing best practices" article, find the test pyramid, and start cranking unit tests. The senior move is to ask *where this kind of system actually breaks*, and let the answer pick the shape. State the payoff: by the end the student can look at any piece of the SaaS and name which test layer (if any) earns the test, and why. Connect back to the established course pattern they already know — "default by capability, conditional reach with a named trigger" (Chapter 16's TanStack Query / Zustand, Chapter 79's RLS) — and signal it returns here at the suite level.

No diagram yet — the figure lands in the section where its meaning is built.

### The four bug layers of a Next.js SaaS

**Goal.** Ground the whole lesson in *this* codebase before any abstract shape is named. The student reasons from concrete artifacts they have already built, not from a generic chart.

**Content.** Walk the four places a bug can live in a Next.js 16 SaaS, each tied to artifacts the student already knows:
1. **Pure logic in `/lib`** — Zod validators, mappers, the RFC 9457 error-code mapper, the redactor, Temporal codecs (ch083), pure data transforms. Deterministic, no I/O, no framework.
2. **The seams** — where the framework, the database, the auth layer, and third-party APIs meet: Server Actions (`authedAction`), route handlers (`authedRoute`), webhook receivers, Drizzle query helpers, the rate limiter (`safeLimit`). This is where the application's own code touches the outside world.
3. **Components** — presentational and interactive UI rendered into trees the framework mostly owns.
4. **End-to-end money paths** — sign-in, Checkout, invitation accept: multi-step flows across the whole stack where failure costs real money.

**How to convey.** A compact figure: four labelled layers of the stack (not yet shaped as a honeycomb — that comes next), each annotated with one or two concrete artifacts from the list above. Pedagogical purpose: give the student a stable vocabulary ("the seams", "the `/lib` surface") the rest of the lesson and unit reuse. Keep it a plain stacked diagram so it reads as "here are the parts of your app," neutral about how many tests each gets.

**Diagram.** HTML+CSS stacked bands (per `documentation/diagrams/html-css.md` — custom shape with color-coded segments and callouts is exactly its niche; mermaid can't draw this cleanly). Four horizontal rows of equal size here (the *sizing* meaning is deliberately withheld until the honeycomb section), each row a saturated mid-tone fill with white text (theme-safe per html-css.md), a short callout column on the right naming the concrete artifacts. Wrap in `<Figure caption="…">`. Apply the `margin: 0` reset on every descendant (the documented Starlight prose-margin gotcha). This is the *setup* figure; the honeycomb figure that follows reuses the same four colors so the student maps band → color across both.

**Tooltips (`Term`).** `seam` (the boundary where the app's code meets an external system — framework, DB, auth, third-party — where most SaaS bugs live). Brief, since the term is load-bearing for the whole lesson.

### Why the test pyramid is the wrong default here

**Goal.** Name the inherited heuristic the student will reach for, give it a fair hearing, then show precisely the assumption it makes that this codebase violates. This is the crux that earns the honeycomb.

**Content.**
- State the classic **test pyramid** plainly: many unit tests at the base, fewer integration in the middle, very few E2E at the top. It is the most-repeated testing advice on the internet, so the student will meet it.
- Give it its due: the pyramid is *correct* when the system has a deep, framework-independent **business-logic core** — banking back-ends, billing engines, simulation, anything where most behaviour is pure computation you fully own. There, unit tests find most bugs because most logic *is* unit-testable.
- The pivot: a Next.js SaaS isn't that system. Per-feature business logic is **shallow** — a validator, a mapper, a query, a write. The framework owns the orchestration (rendering, routing, Server Action plumbing, caching). The depth lives at the *boundaries*, not in a logic core. Apply the pyramid here and you get hundreds of unit tests on trivial helpers and a thin, fearful integration layer — exactly inverted from where the bugs are.
- Land the reframe: the shape of the suite should track the shape of the **bug density**, and the bug density of *this* architecture is boundary-heavy.

**How to convey.** Reasoning-led prose. One small "before" anti-example is enough — not full code, a sketch: a developer writes `expect(formatMoney(1000)).toBe('$10.00')` ten times over and ships a cross-tenant Drizzle query that forgot its `orgId` filter, with zero tests at the layer that would have caught it. The pyramid told them to spend their effort at the base; the bug was at the seam.

**Exercise — `MultipleChoice` (single correct).** Frame a scenario: a SaaS team has 250 passing unit tests, 90% line coverage, and just shipped a webhook receiver that JSON-parsed the body before verifying the signature. Ask what this most likely indicates. Distractors phrased so the student must reason (not pattern-match the prose, per `multiple-choice.md`): "they need more unit tests / higher coverage" (the trap), "their suite shape doesn't match where their bugs are" (correct), "webhooks can't be tested", "the pyramid is always wrong." `McqWhy` ties it back to bug density living at the seam.

### The honeycomb, and why it fits

**Goal.** Introduce the honeycomb as the shape that *falls out* of boundary-heavy bug density, position it against pyramid and trophy, and pin the course to it. This is the lesson's titular concept and central figure.

**Content.**
- Name it: **Spotify's testing honeycomb** (2018 Spotify Engineering, catalogued in Martin Fowler's testing-shapes writing). Center of gravity on **integration** tests, with thin layers above and below. Designed for microservices and any architecture where most behaviour is interaction with external systems. Note for the writer/diagram agent: Spotify's literal figure is a three-band hexagon (implementation-detail base / integration center / "integrated" a.k.a. E2E top, ideally none). The course renders a **four-band adaptation for a Next.js SaaS** (unit / integration / component / E2E) — frame it honestly as "the honeycomb *for a Next.js SaaS*," an adaptation of Spotify's shape, not a claim that Spotify drew four bands.
- Why a 2026 Next.js SaaS fits the mold: Server Components and Server Actions are framework-orchestrated; the database is external (Postgres/Drizzle); Stripe is external; Resend is external; auth is a library at a boundary. The interesting behaviour is *interaction*, so the tests with the highest value-per-test are at the seams.
- The three-way contrast, named once each so the student can place them:
  - **Pyramid** — right for a deep framework-independent logic core (covered above).
  - **Trophy** (Kent C. Dodds, "write tests, not too many, mostly integration") — *also* integration-centered, but framed for the JS front-end and distinguished by an explicit **static** base (types + lint) under the unit layer. Accurate to flag that trophy and honeycomb agree on "integration is the center of gravity"; the course pins to the honeycomb name because the trophy's static-base/front-end framing fits a client-heavy app, whereas this SaaS's logic and seams live on the server. Do *not* mischaracterize the trophy as "a fat component layer" — its emphasis is integration, like the honeycomb.
  - **Honeycomb** — integration-centered; the senior pick for this stack.
- Be explicit about what the shape *is not*: it names **where tests live**, not **how many of each** (that's coverage, next lesson). A year-one SaaS might ship 200 unit / 80 integration / 0 component / 4 E2E; a year-three one might see integration *pass* unit as the seam surface grows. The shape adjusts to the codebase; it is a heuristic about location, not a quota.

**Diagram (the lesson's anchor figure).** A side-by-side **pyramid vs honeycomb** comparison — this contrast is the pedagogy, not either shape alone. Use `TabbedContent` (or two HTML+CSS figures inside one `TabbedContent`, per `documentation/components/figures/tabbed-content.md`) with tabs "Test pyramid (wrong fit)" and "Honeycomb (this SaaS)":
- **Pyramid tab:** classic three tiers, wide unit base, the silhouette everyone recognizes, captioned "optimizes for a deep logic core."
- **Honeycomb tab:** four horizontal bands reusing the four colors from the bug-layers figure — **integration drawn widest (center of gravity), unit wide but shorter, component and E2E thin slivers**, each band carrying a short "what lives here" callout. Caption: "optimizes for boundary-heavy bug density."
Pedagogical goal: the student *sees* the integration band swell exactly where the previous section argued the bugs are. HTML+CSS engine (custom shapes + callouts); horizontal bands to respect the laptop vertical-space cap (~800px max per the diagram INDEX); `flex` proportional widths for the band sizes with `min-width: 0` to prevent label-shrink bite (html-css.md). `margin: 0` reset on every descendant. Mark `expandable` true (default; the bands are plain HTML and survive relocation).

Optionally also reference an external diagram of the honeycomb via an `ExternalResource` card to Fowler's "On the Diverse And Fantastical Shapes of Testing" — gives the student the canonical source.

### What lives in each band

**Goal.** Turn the abstract shape into a concrete checklist keyed to artifacts the student has already built. This is where the lesson becomes actionable.

**Content — go band by band, each tied to real project surface:**
- **Unit (wide base).** Every file in `/lib` ships a test: Zod schemas, the error/RFC 9457 mapper, Temporal codecs (ch083), the redactor, pure transforms, plus type-level tests for the Unit 1 moves (narrowing, branding, discriminated unions). Cheap to write, cheap to run, no fixtures. Depth lands in **ch087**.
- **Integration (center of gravity).** Built on the **six seams catalogued in chapter 080 lesson 3** — make this the spine of the section, because the seam catalog *is* the integration-test catalog:
  1. `authedAction` (Server Action wrapper)
  2. `authedRoute` (route handler wrapper)
  3. page-level `requireOrgUser`
  4. the webhook receiver
  5. the rate limiter (`safeLimit`)
  6. the `error.tsx` boundaries
  Each seam gets coverage on its **fail-closed branch** and its **message-split branch**. Plus every Drizzle query helper, against a real test Postgres with transaction rollback (`withRollback`, ch088) and MSW at the network boundary (ch088). State plainly that **Server Actions and webhook receivers are integration tests, not unit tests** — a Server Action reads the session, parses input, calls Drizzle, writes the audit log, returns a `Result`; it is not pure, so testing it *is* testing the seam. (Extracting a non-trivial inner pure function and unit-testing *that* is fine — but the action itself needs the seam.)
- **Component (thin).** Only when a named trigger is met; **ch089** owns the trigger and React Testing Library. Name-forward only.
- **E2E (thinner).** The handful of paths where failure costs real money — sign-in, Checkout, invitation accept, the primary value loop; **ch090** owns the trigger and Playwright. Note the course convention from the code standards: **zero or four E2Es by year one, nothing in between** — flake on a half-built E2E suite destroys its own signal.

**How to convey.** This is the densest factual section; structure it for scannability. Option: a `FileTree` or a compact band-by-band layout, but prose with tight bullets per band is likely cleanest. Use a small `Code` snippet *only* to make the "Server Action is a seam test" point vivid — e.g. a ~6-line sketch of an `authedAction` body showing session-read + parse + Drizzle + audit + `Result`, with a one-line note "none of this is unit-testable in isolation; the test exercises the whole seam." Do not over-build it; depth is ch088's.

**Exercise — `Buckets` (the core skill drill of this lesson).** This is the single most valuable interaction: it trains the "where does this test live?" reflex directly. Use `twoCol` with five buckets: **Unit**, **Integration**, **Component**, **E2E**, **No test**. Items are concrete, recognizable artifacts (per `documentation/components/exercises/buckets.md`, mix correct targets across all buckets):
- → Unit: a Zod schema's refine rule; the RFC 9457 error-code mapper; a Temporal `Instant`→string codec.
- → Integration: `authedAction` returning 403 when role is below admin; the webhook receiver rejecting an unsigned body; a Drizzle query helper that must filter by `orgId`; `safeLimit` failing open on a Redis-auth error.
- → Component: (gated — frame as "earns a test only if a trigger is met") a shared, complex stateful date-range picker. Keep one or two so the gate is felt.
- → E2E: the Stripe Checkout flow; sign-in.
- → No test: a presentational `<Card>` with no state; a page that just calls `requireOrgUser()` and renders a list (the framework's job).
Instructions string: "Sort each piece of the SaaS into the test layer that earns its test." The "No test" bucket is pedagogically essential — it forces the student to internalize that *not everything gets a test*, which is the section's hardest lesson.

### The bug-density argument

**Goal.** Make the "shape follows the bug" rule visceral with the specific, recognizable bugs that *only* surface at the seam — so the student feels why the integration band is wide.

**Content.** Enumerate the canonical Next.js SaaS seam bugs (all drawn from the course's own security/error material so they're familiar):
- The cross-tenant query that forgot the `orgId` filter.
- The Server Action that didn't go through `authedAction` (skipped the session/role check).
- The webhook receiver that JSON-parsed before verifying the HMAC signature.
- The cache tag that mismatched its read tag (stale data after a write).
- The rate limiter that swallowed a Redis throw and let the action proceed when it should have failed closed.
None of these surface in a unit test of a pure function. Each surfaces in an integration test against a real test DB with a real auth fixture. **The honeycomb's center of gravity follows the bug density** — that is the whole argument in one sentence.

Then generalize into the durable rule, stated explicitly as the takeaway:
> **Shape follows the bug.** Don't ask "what's the right shape?" Ask "where do the bugs land?" For `/lib` purity, inside the function → unit test. For Server Actions and webhooks, at the wrapper-to-logic seam → integration test. For UI, mostly visual or framework-mediated → manual review plus Playwright on the money paths. The shape is the *consequence* of the rule, not a prescription.

**Cost as the secondary axis.** Briefly add the value-to-cost lens so the shape reads as an optimization, not dogma:
- Unit: ms to write, ms to run, no fixtures.
- Integration: minutes to write (fixtures, DB setup, MSW), tens of ms to run, real DB.
- Component: minutes to write (DOM queries, async events), hundreds of ms, jsdom overhead.
- E2E: tens of minutes to write, seconds to run, browser overhead, flake risk.
The honeycomb maximizes bugs-caught-per-unit-effort *for this codebase's* bug distribution.

**Diagram (optional, second figure).** A small two-axis HTML+CSS strip or simple bar layout: each band plotted by "cost per test" (low→high) against "bugs caught here" (the seam band tall on bugs, modest on cost; E2E tall on cost, few bugs). Pedagogical goal: show the honeycomb sits at the value/cost sweet spot. Keep it lightweight — a labelled comparison strip, not a precise chart. If it risks clutter after the anchor figure, cut it and keep the prose table; the anchor figure carries the load.

### When component and E2E tests earn their weight

**Goal.** Apply the course's established "trigger before tool" pattern at the suite level for the two thin bands, so the student knows these are *conditional*, never default — and connects it to a pattern they already trust.

**Content.**
- Make the link explicit: this is the *same* discipline as Chapter 16 (TanStack Query, Zustand) and Chapter 79 (RLS) — a capability stays off until a named threshold pushes past the default. Here the default is "the seam/unit test already covers it"; component and E2E tests must earn their place against a trigger.
- **Component-test triggers** (ch089 owns the depth): (a) a shared component-library piece many callers depend on, (b) a genuinely complex stateful component, (c) a critical UX path. Absent a trigger, a component is covered (or not needed) at the seam/unit level.
- **E2E triggers** (ch090 owns the depth): a money path — sign-in, Checkout, invitation accept, the primary value loop. Some 2026 SaaS legitimately ship **no** E2E in year one; the bar is "does failure cost money," not "is it user-facing."

**How to convey + exercise — `StateMachineWalker` (`kind="decision"`).** This component is purpose-built for "which tool/layer do I reach for, in the order a senior asks" (per `documentation/components/figures/state-machine-walker.md`). Build a short decision walk that lands a given piece of UI/flow in the right band:
- Root question: "Is this a money path (failure costs real money)?" → yes ⇒ **Leaf: E2E (Playwright), ch090**.
- → no ⇒ "Is it a shared component, complex stateful, or critical UX?" → yes ⇒ **Leaf: Component test (RTL), ch089**.
- → no ⇒ "Does the behaviour live in `/lib` (pure) or at a seam (DB/auth/3rd-party)?" → `/lib` ⇒ **Leaf: Unit test, ch087**; seam ⇒ **Leaf: Integration test, ch088**.
- Add a branch for "presentational, no behaviour" ⇒ **Leaf: No automated test — review covers it.**
This makes the student *walk the senior's question order* (money path → trigger → seam-vs-pure), which is the transferable skill. Do **not** wrap it in `<Figure>` (it provides its own card, per the doc). Leaf verdicts short; reason bodies name the destination chapter.

### What does not get a test

**Goal.** The inverse rule, given its own home (per the outline instruction: watch-outs belong with the concept they qualify — here the concept *is* "non-coverage"). Beginners over-test the wrong things; this section names them.

**Content.**
- **The framework's surface.** A page that calls `requireOrgUser()` and renders a list: routing, server rendering, caching are the framework's job — Vercel ships the Next.js test suite. The app tests the *data-fetching helper* (unit/integration) and the *render output's contract* (component test only if triggered), never `<Link>`, `<Image>`, `redirect()`, `notFound()`, or App Router segment behaviour. Tests stop at the framework boundary.
- **UI plumbing without behaviour.** A presentational component with no state earns no test. Snapshot tests pay off *only* on contracts a caller depends on (email-template HTML, RFC 9457 response bodies), not on every `<Card>`; a snapshot that updates every other PR is testing implementation, not behaviour. (Snapshot depth is ch089/ch087; here just the principle.)
- The bar, stated bluntly to close the lesson body: **"we have tests" is not the bar. "Do the tests fail on the bugs that ship" is the bar.** A green suite that misses every seam bug is theatre — which is exactly the thread the next lesson (coverage as a diagnostic) picks up.

**How to convey.** Tight prose with concrete examples. Optionally a small `Aside` (caution) for the single sharpest watch-out: *defaulting to component tests because the front-end is visible — the bugs usually live at the seams.* Keep watch-outs inline with the concept, not bundled.

**Exercise (optional, light) — `TrueFalse` round.** A few crisp statements to consolidate the inverse rule and bug-density model, e.g.: "A presentational `<Card>` with no state should get a snapshot test" (false); "A Server Action is an integration test, not a unit test" (true); "100 passing unit tests means the seams are safe" (false); "Testing that `<Link>` navigates is the app's responsibility" (false). Per `true-false.md` this gives an end-of-round self-check. Only include if it doesn't crowd the Buckets + Walker + MCQ set — those three are the priority; pick the strongest subset to avoid exercise fatigue.

### Where this leaves the unit (closing prose, no heading or short heading)

Brief wrap (~1 short paragraph). The shape is now decided; the rest of the unit fills it in. Forward-reference, one line each: ch087 builds the unit base over `/lib`; ch088 builds the integration center of gravity (test DB, `withRollback`, MSW) seam by seam; ch089 brings component tests *with* the trigger; ch090 brings E2E *with* the trigger; ch091 is the project on the Stripe Checkout flow. Optionally one `ExternalResource` LinkCard to Fowler's testing-shapes article as the canonical reference. Note the immediate next lesson (ch086 L3) sharpens the "we have tests is not the bar" thread into coverage-as-a-diagnostic.

---

## Scope

**Prerequisites — redefine concisely, do not re-teach.**
- Vitest runner, three projects (`unit`/`integration`/`component`), watch vs `run` — wired in **Lesson 1**; reference by name only.
- The six error seams (`authedAction`, `authedRoute`, `requireOrgUser`, webhook receiver, `safeLimit`, `error.tsx`) — taught in **ch080 L3**; here they are the *integration-test catalog*, named, not re-explained.
- `Result` contract, RFC 9457 bodies, fail-open/fail-closed, `orgId` tenant scoping, audit log — all prior-unit material; invoke as familiar, one-line refresh max if needed.
- The "default by capability, conditional reach with a named trigger" pattern — established in Chapter 16 / Chapter 79; reference as known.

**This lesson does NOT cover (deferred — do not teach here):**
- Runner setup, `vitest.config.ts`, projects, watch mode — **L1** (done).
- Coverage philosophy, branch-over-line, per-directory thresholds, the absence-of-tests audit, "100% as theatre" — **L3** (next lesson). This lesson may *gesture* at "we have tests is not the bar" but must not teach coverage mechanics.
- The AAA single-test shape, descriptive test names, behaviour-over-implementation, mocking at the boundary — **L4**. Do not teach how to *write* a test here; only *which kind and where*.
- The `/lib` unit-test surface in depth (factories, determinism, type-level tests, async, unhappy path) — **ch087**.
- Integration mechanics: test-DB lifecycle, `withRollback`, MSW handlers, auth fixtures — **ch088** (named-forward only).
- React Testing Library, jsdom config, component-test *trigger detail* — **ch089** (the trigger is *named* here; its application is ch089's).
- Playwright, E2E *trigger detail* — **ch090** (named here; applied there).
- CI wiring (JUnit reporter, PR gates) — **ch097**.
- Contract testing (Pact-style) — out of scope for the course (MSW handlers are the contract surface, ch088).
- Mutation testing (Stryker) — out of scope; not even named-forward in this lesson (it belongs to the coverage discussion in L3, which names it once).

**Code policy.** Decision lesson — keep code minimal and illustrative. At most: the tiny pyramid "before" anti-sketch and the ~6-line `authedAction`-body sketch that proves "a Server Action is a seam test." No full test files, no config. Follow `documentation/code standards/Code conventions.md` §Testing for any naming shown (`it('<outcome> when <conditions>')`, project names), but do not preview the AAA mechanics L4 owns — note the divergence if a sketch needs a stripped shape.
