# Factories over shared fixtures

- Title: `Factories over shared fixtures`
- Sidebar label: `Test data factories`

## Lesson framing

Pattern lesson. The student arrives (Ch086 + Ch087 L1) with the `/lib` unit shape: `name.test.ts` colocation, AAA collapsed to three lines, `it` per behavior, no `beforeEach`, no mocks. L1 already named the constraint that motivates this lesson: "if arrange grows past three lines, the fixture moves to a factory." This lesson cashes that in.

The single mental model the student must leave with: **test data is produced by a function that returns a fresh instance every call, not stored as a shared constant.** Everything else (overrides-last spread, valid defaults, composition, `Partial<T>` typing, where the files live) is mechanism in service of that one idea. The senior payoff is twofold and must be made explicit: (1) run-order safety — a shared mutable object is a parallel-execution bug waiting to happen, a factory closes that bug class structurally; (2) refactor survival — a factory typed off the schema absorbs a new required field in one place, so a schema migration doesn't rain red across fifty test files.

Teaching strategy, low cognitive load:
- **Lead with the pain, not the pattern.** Open on the naive shared-`const` fixture the student would actually write, then break it on screen (one test mutates it, an unrelated test fails under parallel run). The factory is introduced as the fix to a bug the student just watched happen. This is the "decisions before syntax" filter — the trigger (shared mutable state under parallel execution) is named before the tool.
- **Build the factory shape incrementally.** Three rules introduced one at a time (default for every required field → overrides-last spread → fresh object per call), each justified by what breaks without it. Do not dump the finished 8-line factory and annotate backwards.
- **Keep the unit-test framing pure.** Every factory in this lesson returns a plain in-memory object. No DB, no `await`, no Drizzle insert. The DB-touching fixture layer is Ch088's job and is named as a forward reference, not taught. This keeps the lesson aligned with the chapter's "the unit under test is a `/lib` export" thread and avoids dragging in integration concerns.
- **Anchor to the entities the course already has.** Use `User`, `Organization`, `Invoice` — the domain the student has modeled across prior units. Reuse the `Result`-shaped `code` values and the `Temporal.Instant` defaults established in L1 so the factory output looks like real course data.
- **Name the vocabulary the team confuses, once, with a decision table.** Factory vs fixture vs seed is the conceptual spine of the back half. The student will hear all three words on a real team; the lesson's job is to make them never conflate them. A Buckets exercise cements it.

The lesson is mechanism-light and decision-heavy; it should read fast (35–45 min). Code samples carry the shape; one diagram makes the run-order bug visceral; one Buckets exercise checks the three-noun distinction; one ScriptCoding lets the student build a factory and feel the overrides ergonomics.

## Lesson sections

### Introduction (no header)

Warm, brief, problem-first. Three tests need an `Organization` on the `pro` plan and an admin `User`. State the reflex the student has after L1 — "I'll hoist a `const org = {...}` to the top of the file and reuse it" — and plant the seed that this reflex is the single most common test-data mistake. Connect back to L1's explicit promise ("arrange past three lines → move to a factory") so this reads as the planned payoff, not a new topic. Preview the end state: by the lesson's close the student writes `buildUser({ role: 'admin' })` and reads it as "a user that is an admin," and knows exactly which of factory / fixture / seed to reach for.

### The shared-fixture trap

The pain, made concrete and visceral before any solution. This is the section that earns the rest of the lesson.

Content:
- Show the naive shared fixture: a module-top `const baseUser = { id: 'usr_1', email: 'test@example.com', role: 'member', ... }` reused across several `it` blocks.
- Walk the failure: one test does `baseUser.role = 'admin'` (or pushes to a shared array, or a tested function mutates its input), a later `it` in the same file now sees `role: 'admin'` it never asked for. Under Vitest's parallel file execution and within-file ordering, the failure is order-dependent and reads as "flaky" — but it is not flaky, it is shared mutable state. Reuse L1's framing that flake has a structural cause.
- The copy-paste drift variant: the next test needs `role: 'member'`, so someone copies the object literal and tweaks one field; now two near-identical 15-field literals drift apart over time, and a reader can't tell which field actually matters to the test.
- Land the diagnosis: the problem is not the data, it's that the data is *shared* and *mutable*. Two escapes exist — deep-clone on every read (noisy, easy to forget) or produce a fresh instance from a function (the factory). The factory wins because it also solves the "which field matters" readability problem.

Components:
- **Diagram (Figure + ArrowDiagram or simple HTML):** the run-order coupling, visualized. Pedagogical goal: make "shared mutable fixture" a *picture*, not a sentence. Show one `const fixture` box in the center; `test A` and `test B` boxes both pointing arrows at it; an annotation on test A's arrow "mutates `.role`"; test B's arrow labeled "reads mutated value → fails". Keep it horizontal, short. Set `expandable={false}` if ArrowDiagram is used (leader-line constraint from the Figure doc). A two-row before/after could also work as plain HTML — author's call, but the bug must be the visual focus.
- **Code** (`ts`) for the naive fixture and the mutating test — keep it to ~12 lines, just enough to show the shared `const` and the two `it` blocks that collide.

Terms for `Term` tooltips: `run-order coupling` (a test's outcome depends on whether/which other tests ran first).

### The factory shape

The pattern, built up rule by rule. The core teaching section.

Content — introduce the three rules incrementally, each as the fix to something:
1. **Every required field gets a valid default.** Start with `buildUser` returning a fully-formed `User` with hardcoded defaults, no argument yet. Stress: a default is a *valid* instance, never a placeholder — `email: 'test@example.com'` (passes validation), never `email: 'TODO'`. A placeholder default ships false negatives in any test that exercises validation. Defaults respect domain invariants.
2. **`overrides` is the last spread.** Add `overrides: Partial<User> = {}` as the parameter and `...overrides` as the final property. Now the call site names *only* the field under test: `buildUser({ role: 'admin' })`. This is the readability win — the test documents its own relevant inputs. Show the same test from "The shared-fixture trap" rewritten with the factory; the collision is gone because each `it` gets its own object.
3. **Fresh object every call.** Make explicit that the object literal is constructed *inside* the function body, so two calls never share a reference. Contrast with the anti-pattern of a factory that closes over and returns a cached module-level object — that is not a factory, it reintroduces the shared-state bug.

Then the type story (the refactor-survival payoff):
- Type the parameter `Partial<User>` and the return `User`, both ways. If `User` is derived from the Drizzle schema via `InferSelectModel<typeof users>` (the schema-as-source pattern the student knows from Unit 5), the factory's types are wired to the schema. Adding a required column (`User.timeZone`) breaks `buildUser` at compile time in exactly one place; land the default there once and every test keeps compiling. Phrase the senior takeaway: factories pay for themselves on the third schema migration.

Components:
- **AnnotatedCode** (`ts`, ~10 lines) for the finished `buildUser`. This is the right component: one small block, but the student's attention must land on distinct parts in sequence — the defaults object, the `Partial<User>` parameter, the `...overrides` final spread, the `InferSelectModel`-derived return type. Steps (use `color`, default blue): (1) signature + return type; (2) the valid defaults, color green, note "valid, not placeholder"; (3) `...overrides` last, color orange, note "caller names only what matters"; (4) the type derivation line if shown. Three to four steps.
- **CodeVariants** for the before/after readability contrast: tab "Shared const" (the trap, ~6 lines) vs tab "Factory call" (`buildUser({ role: 'admin' })`, one line). Use `del=`/`ins=` framing. First sentence of each variant's prose carries the verdict ("collides under parallel run" / "fresh instance, self-documenting"). This is exactly the A/B glance CodeVariants is built for.
- **CodeTooltips** optional on the `InferSelectModel<typeof users>` line to show the inferred `User` shape inline without a digression.

Terms: `false negative` (a test that passes while the code is actually broken).

### Where factories live

Short, decisive placement section. The student needs one canonical answer.

Content:
- Home: `src/test/factories/`, one file per entity (`users.ts`, `orgs.ts`, `invoices.ts`). One `build<Entity>` export per file; filename matches the entity.
- Why not colocate next to the `/lib` test that uses them (the L1 colocation rule): factories are *cross-cutting* — the same `buildUser` is imported by `/lib` unit tests now and by integration tests in Ch088. Colocation is for the test-and-source pair; shared test infrastructure lives under `src/test/`. Connect to the sibling `src/test/matchers/` home established in L1 (`toBeOkResult`/`toBeErrResult`) — same rationale, same tree.
- The dependency-direction rule carries over from L1: factories import domain types from `@/db` or `@/lib`, never from `app/**`. A factory reaching into `app/**` reverses the dependency arrow and trips the `no-restricted-paths` lint rule. Name it in one line.

Components:
- **FileTree** showing `src/test/` with `factories/` (`users.ts`, `orgs.ts`, `invoices.ts`), and `matchers/`, `clock.ts`, `fixtures/` as siblings greyed-in / mentioned so the student sees factories as one citizen of a shared test-support tree the chapter is assembling. Keep `fixtures/` and `clock.ts` as forward-reference breadcrumbs (this section's "Static fixtures" subsection and L3 fill them).

> Divergence note for downstream agents: `Code conventions.md` (Testing section) currently says factories live at `db/factories.ts` and insert via Drizzle. This lesson deliberately diverges to `src/test/factories/` with **pure in-memory** builders, matching the established Ch087/Ch088/Ch091 test-support tree (`src/test/factories/`, `src/test/matchers/`, `src/test/fixtures/`, `src/test/clock.ts`) and this chapter's "unit under test is a `/lib` export, no DB" thread. The DB-inserting factory variant is Ch088's integration layer. Do not "correct" toward `db/factories.ts`.

### Composing factories

The natural next ergonomic. Keep tight.

Content:
- An `Invoice` has a customer. Rather than forcing every test to pass a full `User`, the `buildInvoice` factory defaults its `customer` field to `buildUser({ role: 'customer' })`. The call site reads as a tree of overrides: `buildInvoice({ status: 'paid' })` gets a valid customer for free; `buildInvoice({ customer: buildUser({ email: 'vip@acme.test' }) })` overrides it.
- The one watch-out worth its weight: **circular defaults loop forever.** If `buildUser` defaults an `org` to `buildOrg()` and `buildOrg` defaults an `owner` to `buildUser()`, construction never terminates. Break the cycle at one layer with an explicit ID default (`orgId: 'org_test'`) instead of a nested build. State the rule: most factories stay one level deep; reference IDs, not nested objects, across the cycle.
- Override depth: `Partial<User>` covers flat objects (the common case). For genuinely nested overrides, prefer a per-factory shape (`{ customer?: Partial<User> }`) over a recursive `DeepPartial<T>` — name `DeepPartial` exists but say most factories don't need it; don't teach the recursive type here.

Components:
- **Code** (`ts`) for `buildInvoice` with the defaulted `customer`, plus two contrasting call sites (default customer vs overridden). ~12 lines.
- An **Aside** (caution) for the circular-default trap — this is exactly the "watch-out qualifying the concept it sits next to" case; it belongs inside this section, not in a trailing tips dump.

### Deterministic defaults: sequences, not randomness

The bridge to L3, kept narrow. The forbidden move is the focus.

Content:
- The forbidden move, stated flatly: **no `Math.random()` or `crypto.randomUUID()` in a factory default.** A random default means a failing test can't be reproduced — the source of "flaky, can't repro" reports. Unit tests want deterministic data: `email: 'test@example.com'` debugs better than a faker-generated `wilma.lakin@example.org`.
- The legitimate need for uniqueness, and its deterministic answer: integration DBs (Ch088) reject duplicate emails, so some tests need *distinct* values. The reach is a **sequence helper**, not randomness: `const userSeq = sequence(); buildUser({ email: \`user-${userSeq.next()}@test.com\` })`. The sequence is monotonic and resettable, so values are unique *and* reproducible. The sequence resets per test/per worker, never global module state (which would reintroduce run-order coupling — tie back to "The shared-fixture trap").
- Deterministic IDs and time in defaults (the `createdAt: instant('2026-01-01...')` literal in the factory) come from the clock/IDs seams — name them and forward-reference L3 ("Pinning time, IDs, and randomness") as the owner. Do not teach `vi.useFakeTimers`, `lib/clock.ts`, or the RNG seam here; just establish that the factory's time/ID defaults are *literals or seam-sourced*, never live `Temporal.Now.instant()` / `crypto.randomUUID()`.
- Faker placement, one line: `@faker-js/faker` is for dev *seeds* (Ch040), not unit tests; unseeded faker is the flake source. This also seeds the next section's three-noun distinction.

Components:
- **Code** (`ts`) for the `sequence()` helper (tiny — a closure with a `next()`) and a `buildUser` call using it. Keep it ~8 lines.

Terms: `monotonic` (only ever increases, never repeats) — optional, only if it isn't obvious in context.

### Factories vs fixtures vs seeds

The conceptual payoff. Three nouns one decision table, then cement with an exercise.

Content — define each by *what it is* and *when you reach for it*, side by side:
- **Factory** — a *function* producing a fresh in-memory instance with overrides. Reach for per-test domain entities (the whole lesson so far).
- **Fixture** — *static* data, typically a JSON file, used verbatim. Reach for external payloads whose exact shape you don't author and can't safely paraphrase.
- **Seed** — code that *populates a database* with realistic volume/distribution. Reach for dev databases and integration-test baselines. Owned by Ch040 (`drizzle-seed`, `scripts/seed.ts`); name it, don't re-teach. Restate the boundary rule from Ch040 in one clause: seeder for datasets/distributions, factories for per-test rows.
- The bug that conflation causes: a "fixture" that gets mutated is a factory in the wrong shape (back to the trap); a "seed" reused as a per-test fixture creates run-order coupling. The words are not interchangeable.

Then **static fixture files for external payloads** as a sub-point (this is the one place fixtures, not factories, are correct):
- A Stripe webhook test needs a byte-realistic payload — captured once from Stripe's test dashboard, saved to `src/test/fixtures/stripe/checkout-completed.json`, imported by the test. Why static and not a factory: the *exact* shape matters for signature verification (forward-ref Ch088 L6), and you neither author nor want to paraphrase Stripe's schema. Same pattern for signed JWTs, Resend bounce webhooks, S3 events.
- Maintenance rule: update a fixture by *re-capturing* from the source, not by hand-editing beyond the single field under test. A hand-drifted fixture lies about the real payload shape.
- Object-mother, named once and dismissed: `anExpiredInvoice()` is the same idea as `buildInvoice({ status: 'expired' })` with one more indirection; the override-spread factory already covers it, so the course uses the factory. One sentence — name it so the student recognizes it in the wild, then move on.

Components:
- **TabbedContent** OR a plain comparison table (Figure-wrapped) for the three-noun decision matrix: columns Factory / Fixture / Seed, rows "what it is", "lives where", "reach for". A table reads faster than tabs for a three-way compare — prefer the table unless each cell needs a code sample. Pedagogical goal: one glance fixes the distinction.
- **Buckets exercise** (2-column or 3-column). Sort items into Factory / Fixture / Seed: "one paid invoice for this test's assertion" (factory), "a Stripe `checkout.session.completed` payload" (fixture), "50 invoices for the dev list page" (seed), "an admin user for this auth test" (factory), "a captured Resend bounce webhook body" (fixture), "a weighted status distribution for screenshots" (seed). Goal: cement the three-way distinction; grading maps each item to its noun. This mirrors the Ch040 L3 buckets drill but adds the fixtures column — confirm with that lesson it isn't a duplicate (it isn't: Ch040's was seeder-vs-factory two-way; this is the three-way).

### Build a user factory (exercise)

Hands-on practice of the core pattern. Placed after the shape is fully taught so the student applies, not discovers.

Content / mechanics:
- **ScriptCoding with `runner="sandpack"`** (the factory is `.ts` with a typed signature and a `Partial<T>` parameter — vanilla can't parse it; per the ScriptCoding doc, flip to sandpack). Provide a `User` type (or a trimmed version) in the starter.
- Task: implement `buildUser(overrides: Partial<User> = {}): User` so that (a) defaults form a valid user, (b) a single override changes only that field, (c) two calls return non-shared objects.
- `tests` block asserts the three rules directly: `buildUser().email` is the default; `buildUser({ role: 'admin' }).role === 'admin'` while its other fields stay default; `buildUser() !== buildUser()` (fresh reference) and mutating one result does not affect a second call. Use `toEqual` for shape, `toBe`/`not.toBe` for reference identity — reinforces L1's matcher-by-shape discipline.
- Grading criteria: all three behaviors pass. The reference-identity test is the one that catches a student who returns a cached object — that's the pedagogically important failure.
- Keep `maxHeight` modest; the starter should be ~12 lines.

If sandpack boot latency is a concern for a single-interaction page, this is acceptable — it's not the sole interaction (Buckets + diagram precede it).

### External resources (optional)

One or two `ExternalResource` cards if a high-quality, current source exists — e.g. the Vitest "improving performance / test isolation" guidance, or a well-regarded write-up on the factory pattern for tests. Keep to two max; skip rather than pad with stale links.

## Scope

Prerequisites to restate **concisely** (one clause each, do not re-teach):
- The `/lib` unit shape — colocation, AAA, `it`-per-behavior, no `beforeEach`/mocks (Ch086, Ch087 L1).
- Matcher-by-shape — `toBe` for references/primitives, `toEqual` for deep structure (Ch087 L1); used in the exercise's assertions.
- `Result<T>` shape and lowercase-snake `code` values (Ch087 L1) — only as the shape factory output mimics.
- `InferSelectModel<typeof table>` and schema-as-source (Unit 5) — named as where the factory's types come from; not re-derived.
- `Temporal.Instant` as the time type (Unit 18) — only as the type of a `createdAt` default.

Out of scope — name and forward-reference, do not teach:
- `vi.useFakeTimers`, `lib/clock.ts`, `lib/ids.ts`, `lib/random.ts`, the injection-vs-module-mock decision — **Ch087 L3**. This lesson establishes only that factory time/ID defaults are literals or seam-sourced, never live calls.
- `expectTypeOf` / `*.test-d.ts` type-level assertions on factory return shapes — **Ch087 L4**. The factory's *compile-time* typing is in scope; *type-level tests of it* are not.
- Async test mechanics, `await expect().resolves`, the forgotten-`await` trap — **Ch087 L5**. Factories here are synchronous and return plain objects.
- Unhappy-path matchers (`toThrow`, `toMatchObject` on `Result.err`, custom `Result` matchers) — **Ch087 L6**. (The matchers *home*, `src/test/matchers/`, is referenced as a sibling of `src/test/factories/`, not taught.)
- **DB-inserting factories / integration fixtures** — the signed-in-user fixture, org seed, `withRollback`, factories that `await db.insert(...)` — **Ch088 L3**. Every factory in this lesson is pure in-memory. This is the single most important scope boundary: keep the lesson DB-free.
- `drizzle-seed` and `scripts/seed.ts` — **Ch040 L3** owns seeds; named only in the three-noun distinction.
- MSW handler factories — **Ch088 L5**.
- `@faker-js/faker` at depth — out of scope (one-line mention only, as the deterministic-data counter-example).
- `fishery` / `rosie` / `factory.ts` libraries — mention in one line that the 2026 reach for a Next.js SaaS is hand-rolled (a factory is ~20 lines; a library is a dependency and a DSL to learn); use a library only when factories grow into a domain DSL, which is rare. Do not demonstrate any library.
- Builder-DSL chaining (`buildUser().withRole('admin').build()`) — name in one line as over-engineering relative to the override-spread shape; do not demonstrate.
