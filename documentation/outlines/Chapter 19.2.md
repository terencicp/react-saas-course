# Chapter 19.2 — Unit tests for `/lib`

## Chapter framing

Chapter 19.2 fills the wide base of the honeycomb installed in 19.1 — the unit-test surface over `/lib`. The student arrives with Vitest configured, the `unit` project pointing at `src/lib/**/*.test.ts`, and the AAA / behavior-over-implementation discipline. What's missing is the daily craft: how to author fixtures that don't fossilize, how to seal in determinism so a test passing on a Tuesday at 4:32 PM in Madrid passes in CI at 03:00 UTC on Sunday, how to prove a TypeScript signature at the type level the same way runtime assertions prove values, how to test async without the forgotten-`await` trap that silently green-lights broken code under Vitest 3 (and fails loudly under v4), and how to assert on the unhappy path — thrown errors, `Result.err`, error-code mappings — with matchers that produce readable diffs. The chapter cashes in `/lib`'s purity contract from Principle #3: every file under `/lib` is a pure function or a deterministic codec, so every file under `/lib` is a unit test that runs in milliseconds.

Threads through every lesson. **The unit under test is a `/lib` export, not a framework-mediated surface** — Server Actions, route handlers, and Drizzle helpers live at the seam (19.3), not here. **Determinism is structural, not incidental** — `now()` and `uuid()` arrive as injected dependencies or from a clock module Vitest can fake; randomness goes through a seeded RNG; `Temporal.Now.instant()` is called once at the seam and threaded down. **Fixtures are factories, not frozen objects** — every fixture builder returns a fresh instance with overrides; shared mutable fixtures across `it` blocks are the run-order bug class. **Type-level tests are first-class tests** — `expectTypeOf` runs under `vitest --typecheck` and gates Principle #7's moves (discriminated unions, brands, narrowing) the same way runtime tests gate behavior. **Vitest 4's awaited-assertion enforcement is the future the chapter writes against** — every async test uses `expect.assertions(n)` or `await expect(...).resolves` / `.rejects`; the forgotten-`await` trap is named on day one. **Error-result shape matchers are the unhappy-path contract** — `toThrow` on classes and message regexes, `toMatchObject({ ok: false, error: { code } })` on `Result.err`, `await expect(p).rejects.toThrow(MyError)` on async; the test asserts the contract, not the stack trace.

---

## Lesson 19.2.1 — Unit tests for pure logic in `/lib`

Topics to cover:

- **The senior question.** A `/lib` file exports `mapDatabaseError(err: unknown): ErrorCode`, `formatInvoiceTotal(line: InvoiceLine[], currency: Currency): Money`, `redact(payload: unknown): unknown`. Each is pure: same inputs, same output, no I/O. The unit-test contract is *exactly* the function's contract — inputs to observables. The lesson lands the day-one shape: file colocated as `name.test.ts` next to `name.ts`, `describe('mapDatabaseError', () => { ... })` wrapping `it(...)` blocks, AAA sections, no setup, no mocks.
- **What `/lib` actually contains.** The course's `/lib` surface across prior units: `lib/temporal.ts` (codecs), `lib/i18n/` (locale matcher, formatter constructors), `lib/error-mapping.ts`, `lib/redact.ts`, `lib/auth/` (pure parts only — `requirePlan` predicates, role comparison), `lib/rate-limit/` (algorithm, not the Redis client), `lib/result.ts`, `lib/money.ts`, `lib/zod-schemas/`, `lib/cache/` (tag composers). Every file ships a `.test.ts` sibling. The pattern: one `describe` per exported function; one `it` per observable branch.
- **Colocation and the `.test.ts` suffix.** `src/lib/error-mapping.ts` and `src/lib/error-mapping.test.ts` sit side by side. The `unit` project's include glob from 19.1.1 picks it up. Why colocation over a parallel `tests/` tree: short import paths, renames move both files together, deleted code can't leave orphaned tests, and the test reads as documentation in the same folder.
- **AAA in the `/lib` shape.** Arrange is one line (the input). Act is one line (the call). Assert is one or two. A `/lib` unit test fits on a screen with no scrolling. If arrange grows past three lines, the fixture moves to a factory (19.2.2); if the act has multiple calls, the test is two behaviors and should split.
- **Import surface — `from 'vitest'` per file.** With `globals: false`, every file imports `{ describe, it, expect }` (and `beforeEach`, `vi`, `expectTypeOf` as needed) from `'vitest'`. The codebase stays grep-able; refactor tools don't lose references.
- **Matcher selection by shape.** **Primitive** — `toBe` (SameValue). **Object / array** — `toEqual` (deep). **Partial object** — `toMatchObject`. **Array contains** — `toContainEqual` (deep) or `toContain` (primitive). **Float tolerance** — `toBeCloseTo`. **Throws** — `toThrow(MessageOrClass)` (depth in 19.2.6). **Class** — `toBeInstanceOf`. Wrong matcher loses signal: `toBe` on an object compares references; `toEqual` on a `Temporal.Instant` doesn't compare instants — compare `.epochMilliseconds` or use a custom matcher.
- **Custom matchers — when they earn weight.** `expect.extend({ toBeMoneyEqualTo(...) })` for repeated domain assertions. Threshold: same comparison written three times across three files. Don't over-engineer — five custom matchers is healthy, fifty is a parallel framework. The course adds `toBeOkResult(data?)` and `toBeErrResult(code)` for the `Result` shape.
- **Parameterized tests with `it.each`.** Table-driven tests for many input / output pairs (error-code mapping, plural forms). Prefer the object form (`it.each([{ input, expected }])('returns $expected for $input', ...)`) — more readable names. Don't over-pack rows; a row with seven columns produces unreadable failure messages.
- **`describe` nesting — sparing.** Nest only when a real sub-context exists. Three levels reads as a hierarchy the runner flattens anyway. One or two levels per file.
- **`beforeEach` discipline in `/lib`.** Pure functions need no setup. A `beforeEach` here is a smell: either a shared fixture (move to a factory call inside `it`) or the unit isn't pure (move to 19.3). Exception: `vi.useFakeTimers()` / `vi.useRealTimers()` for time-touching code (19.2.3).
- **No mocks in `/lib` tests, almost ever.** Purity contract means no collaborators worth mocking. A `/lib` function reaching for `fetch`, the database, or `Date.now()` is a seam violation — extract to a parameter or seam. The exception: deterministic modules (clock, IDs, RNG) are pinned via injection or timer fakes, never `vi.mock` on the unit's collaborator.
- **What a senior `/lib` test file looks like.** A 60-to-80-line file: imports at top, one `describe`, six to ten three-to-six-line `it` blocks, parameterized rows where they help, one custom matcher if the domain calls for it, no `beforeEach`. Runs in 5 ms. Reads as a behavior catalog.
- **The `vitest --project unit` reflex.** All chapter tests live here. `vitest --project unit --watch` is the inner-loop reflex. Coverage thresholds from 19.1.3 ride this glob — `/lib/**` at 90% lines / 85% branches.
- **Watch-outs.** A `/lib` test importing from `app/**` reverses dependency direction (`eslint-plugin-import` no-restricted-paths catches it); a `/lib` test needing a database, a fetch, or `cookies()` is misclassified — move to integration; a `beforeEach` mutating module-level state is run-order-coupled; `toBe` on an object passes by reference accident; `toEqual` on a `Temporal.PlainDate` compares opaque shape — assert on `year`/`month`/`day` or ISO strings; vague custom matchers (`toBeValid`) hide which axis was checked; `it.each` rows generated from a function call (`it.each(generateCases())`) hide data in failure messages — list cases inline.

What this lesson does not cover:

- Fixture factories and the Builder pattern — Lesson 19.2.2.
- Time, randomness, and ID determinism — Lesson 19.2.3.
- Type-level assertions — Lesson 19.2.4.
- Async-specific traps and `vi.useFakeTimers()` with promises — Lesson 19.2.5.
- Unhappy-path matchers (`toThrow`, `rejects.toThrow`, `Result.err` shape) — Lesson 19.2.6.
- Integration tests at the seams (Server Actions, route handlers, DB) — Chapter 19.3.
- Component tests — Chapter 19.4.
- Snapshot testing for email templates — Chapter 8 / 19.4.

Estimated student time: 40 to 50 minutes. The chapter's foundation lesson; later lessons assume this shape.

---

## Lesson 19.2.2 — Test fixtures and factories

Topics to cover:

- **The senior question.** Three tests need an `Organization` with `plan: 'pro'` and a `User` with `role: 'admin'`. The naive reach is a top-of-file `const org = { ... }` reused across tests; the bug class is one test mutating the shared object and breaking unrelated tests under parallel execution. The next test needs `role: 'member'` — copy the object, change one field, drift sets in. The lesson installs the **factory pattern**: every domain entity has a `build*()` function returning a fresh instance with sensible defaults and an `overrides` argument.
- **The factory shape.** `buildUser(overrides: Partial<User> = {}): User { return { id: newId('usr'), email: 'test@example.com', role: 'member', orgId: 'org_test', createdAt: instant('2026-01-01T00:00:00Z'), ...overrides } }`. Three rules: (1) every required field has a default; (2) `overrides` is the last spread, so the test names *only* the field it cares about; (3) every call returns a fresh object, never a shared reference. A test reads as "a user with `role: 'admin'`" — not "a user with fifteen fields."
- **Where factories live.** `src/test/factories/` — one file per entity (`users.ts`, `orgs.ts`, `invoices.ts`, `webhookEvents.ts`). Imported by `/lib` tests and integration tests (19.3) alike; the factory is the test-data contract for the whole suite. Don't colocate with `/lib` tests — factories are cross-cutting.
- **Defaults that don't lie.** A factory default is a *valid* instance, never a placeholder. `email: 'test@example.com'` is valid; `email: 'TODO'` ships false negatives in tests exercising validation. Defaults respect domain invariants — `User` never produces an RFC-5322-failing email; `Invoice` never produces negative line items unless asked.
- **Override depth.** `Partial<User>` works for flat objects. For nested (`{ profile: { name, timezone } }`), use a `DeepPartial<T>` utility or a per-factory shape (`overrides: { user?: Partial<User>; profile?: Partial<Profile> }`). Most factories stay one level deep.
- **Composable factories.** An `Invoice` factory accepts a `customer` override defaulting to `buildUser({ role: 'customer' })`. The call site reads as a tree of overrides. Watch-out: circular defaults lead to infinite construction — break the cycle with explicit IDs at one layer.
- **Sequence helpers for uniqueness.** Integration (19.3) DBs reject duplicate emails. The reach: `const userSeq = sequence('user'); buildUser({ email: \`user-${userSeq.next()}@test.com\` })`. The sequence resets per test or per worker — never global. Deterministic IDs cross-reference 19.2.3.
- **Library vs. homegrown.** `factory.ts`, `fishery`, `rosie` offer DSLs. The 2026 reach for a Next.js SaaS: hand-rolled. A factory is twenty lines; the library is a dependency and a learning curve. Use a library only when factories grow into a domain DSL (rare).
- **Factories vs. fixtures vs. seeds.** Three nouns the team confuses. **Fixtures** are static test data (JSON files with Stripe webhook payloads). **Factories** are functions producing fresh instances. **Seeds** populate a dev or test DB with realistic volumes (6.5.3). Conflating them is the bug class: a "fixture" that mutates is a factory in the wrong shape; a "seed" used in tests creates run-order coupling.
- **Static fixture files for external payloads.** A Stripe webhook test needs a realistic payload — captured once from Stripe's test dashboard, saved to `src/test/fixtures/stripe/checkout-completed.json`, imported by the test. Static JSON because exact shape matters (signature verification in 19.3.6). Update by re-capturing, not by hand-editing beyond the field under test. Same pattern for signed JWTs, Resend bounce webhooks, S3 events.
- **Object-mother pattern, named once.** A function returning a ready-to-use entity (`anExpiredInvoice()`). The course's factories with overrides do the same job with one fewer indirection — `buildInvoice({ status: 'expired' })` reads as clearly. Name it; use the factory.
- **Faker — when it earns weight.** `@faker-js/faker` for dev seeds (6.5.3), not unit tests. A unit test wants *deterministic* data — `email: 'test@example.com'` debugs better than `email: 'wilma.lakin@example.org'`. Faker without an explicit seed is the source of "flaky, can't reproduce" failures.
- **Type-safety of factories.** `buildUser(overrides: Partial<User>): User` typed both ways. If the entity is from a Drizzle schema, the factory's type comes from `InferSelectModel<typeof users>` so schema changes break the factory at compile time. Adding a required field (`User.timezone`) lands the default in `buildUser` once; every test continues to compile. Factories pay for themselves on the third schema migration.
- **Watch-outs.** A factory with no `overrides` argument forces mutation — back to shared mutable state; a factory returning a cached object isn't a factory; defaults failing validation ship false negatives; `Math.random()` in a default kills reproducibility — use the seeded RNG or a sequence (19.2.3); DB-touching factories belong in 19.3's integration-fixture layer; factories imported from `app/**` reverse dependency direction — they live in `src/test/factories/`; builder-DSL chaining (`buildUser().withRole('admin').build()`) reads like Spring — the override-spread shape is enough.

What this lesson does not cover:

- Deterministic `now()` / `uuid()` / RNG — Lesson 19.2.3.
- Type-level assertions on factory return shapes — Lesson 19.2.4.
- Integration-test fixtures (signed-in user, org seed) — Lesson 19.3.3.
- `drizzle-seed` for dev databases — 6.5.3 owns it.
- `MSW` handler factories — Lesson 19.3.5.
- Faker at depth — out of scope.

Estimated student time: 35 to 45 minutes. Pattern lesson; the factory shape recurs in every chapter after this.

---

## Lesson 19.2.3 — Determinism: time, randomness, and IDs

Topics to cover:

- **The senior question.** A test asserts `invoice.dueAt` is 30 days after `invoice.createdAt`. The unit reads `Temporal.Now.instant()`. The test passes today; tomorrow the clock has moved, "now" diverges between the unit and the assertion, the test fails. Or the function uses `crypto.randomUUID()` for an idempotency key the test asserts on. Or `Math.random()` for jitter. The lesson installs the discipline: **time, randomness, and IDs are dependencies the unit imports from a seam Vitest can pin**. Every "now" goes through `clock.now()`; every UUID through `newId()`; every random number through a seeded RNG.
- **Why determinism is structural.** Non-deterministic tests are the leading cause of "flaky in CI" complaints. A test that fails Tuesday at 14:32 and passes Tuesday at 14:33 is broken, not flaky. If the code reads the wall clock without an injection point, the time is an uncontrolled input.
- **Vitest's fake timers.** `vi.useFakeTimers()` swaps `Date`, `setTimeout`, `setInterval`, `setImmediate`, `clearTimeout`, `clearInterval`, `queueMicrotask`, `process.nextTick`, `performance.now()`, `requestAnimationFrame`. `vi.setSystemTime(new Date('2026-05-14T00:00:00Z'))` sets the wall clock; `vi.advanceTimersByTime(5000)` moves five seconds; `vi.runAllTimers()` flushes scheduled callbacks. Setup pattern: `beforeEach(() => vi.useFakeTimers()); afterEach(() => vi.useRealTimers())`. Leaking fake timers into other tests is the test-isolation bug.
- **`Temporal.Now` and fake timers.** `vi.useFakeTimers()` patches `Date`, **not** `Temporal.Now` directly — Temporal's clock is decoupled. The reach: wrap clock reads in `lib/clock.ts` (`export const clock = { now: () => Temporal.Now.instant() }`); tests mock the module (`vi.mock('@/lib/clock', () => ({ clock: { now: () => Temporal.Instant.from('2026-05-14T00:00:00Z') } }))`). Vitest is shipping `vi.setSystemTime` support for Temporal as it lands in Node 26 — name the upcoming surface, don't depend on it.
- **The clock module as the seam.** Every `/lib` function that needs "now" calls `clock.now()`, not `Temporal.Now.instant()` or `Date.now()`. Production wires `clock.now = () => Temporal.Now.instant()`; tests wire a frozen instant. The seam also unblocks future overrides (backfills with a virtual "now," replay tools).
- **Injection vs. module mock.** Two shapes. **Injection** — `fn(data, { now: () => Temporal.Instant })`; signature documents the dependency, no module mocks. **Module mock** — `vi.mock('@/lib/clock', ...)`; less invasive on the API. Default to injection for `/lib` helpers; module-mock when rewiring every signature is friction.
- **The ID seam.** `lib/ids.ts` exports `newId(prefix: string): string` wrapping `crypto.randomUUID()` (or `nanoid`, or `ulid`). Tests pin via injection or `vi.mock`. For sequenced IDs: `let i = 0; vi.mocked(newId).mockImplementation((prefix) => \`${prefix}_${++i}\`)`. Every ID-generation site goes through `newId`, never `crypto.randomUUID()` inline.
- **The RNG seam.** `Math.random()` and `crypto.getRandomValues()` are non-deterministic. Business logic using randomness (rate-limit shard selection, jitter, A/B assignment) goes through `lib/random.ts`; tests seed it (`pure-rand` — 5KB, splittable). Production wires `crypto.getRandomValues`; tests wire the seeded RNG.
- **`vi.spyOn` for narrow surface stubs.** `vi.spyOn(Date, 'now').mockReturnValue(...)` for a single call site; restore in `afterEach` via `vi.restoreAllMocks()`. Narrower than module mock, lighter than fake timers. Reach for one-call surfaces; reach for full fake timers when multiple timer APIs are involved.
- **The "frozen instant" convention.** Every fake-timer test uses the same canonical instant: `const FROZEN = Temporal.Instant.from('2026-01-15T12:00:00Z')`. Failure messages read "expected `2026-01-15T12:00:00Z` plus 30 days," not "expected today plus 30 days." A single `src/test/clock.ts` exports `FROZEN` and a `freezeClock()` helper.
- **The forgotten-`await` trap with fake timers.** Code does `await sleep(5000); doWork()`. The test `vi.advanceTimersByTime(5000)` fires the timer but `sleep`'s promise resolves on the *next microtask*; `doWork` hasn't run yet. Fix: `await vi.advanceTimersByTimeAsync(5000)` — the async variants (`runAllTimersAsync`, `runOnlyPendingTimersAsync`) flush microtasks between ticks. Lesson 19.2.5 owns the depth.
- **DST and month-end determinism in inputs.** Time-dependent code using `Temporal.ZonedDateTime.add({ months: 1 })` exhibits month-end clamping (`2026-01-31` plus one month is `2026-02-28`). Pin test inputs to dates that exercise the edge — DST spring-forward gaps, fall-back overlaps, end-of-month, leap day. The clock fakes the current instant; input dates pin the surface exercised.
- **Intervals — flushing without leaking.** `setInterval` reschedules itself; `vi.runAllTimers()` loops forever. Reach for `vi.runOnlyPendingTimers()` (one round) or `vi.advanceTimersByTime(N)` with an explicit horizon. `vi.useRealTimers()` in `afterEach` is the discipline.
- **"Do not depend on real time" rule.** A test calling `Temporal.Now.instant()` or `Date.now()` directly without the seam eventually fails. Structural enforcement: lint rule (`no-restricted-syntax` targeting `Date.now`, `new Date()` without args, `Temporal.Now.instant()`) — outside test files.
- **Watch-outs.** `vi.useFakeTimers()` in `beforeAll` instead of `beforeEach` leaks frozen time across tests; forgotten `vi.useRealTimers()` in `afterEach` leaks fake time forward; `vi.advanceTimersByTime` when awaits live inside the chain — switch to the async variant; `vi.spyOn(Date, 'now')` without `vi.restoreAllMocks()` poisons later tests; `Math.random` without a seam guarantees flake; `crypto.randomUUID()` inlined in `/lib` defeats deterministic-ID tests; pinning "now" to today's date (`new Date().toISOString().slice(0, 10)`) is non-deterministic — pin to a literal; mocking `Temporal.Now.instant` directly requires deep ES patching that breaks across versions — the seam is durable.

What this lesson does not cover:

- The factory pattern for entity defaults — Lesson 19.2.2.
- Type-level testing — Lesson 19.2.4.
- Async traps and promise-aware timer advancement at depth — Lesson 19.2.5.
- Unhappy-path assertions — Lesson 19.2.6.
- Time semantics, IANA timezones, Temporal codecs — Chapter 18.1 owns the production surface.
- MSW handler determinism (request-level randomness) — 19.3.5.

Estimated student time: 40 to 50 minutes. Pattern lesson; the clock / IDs / RNG seams recur across the integration chapter.

---

## Lesson 19.2.4 — Type-level testing with `expectTypeOf`

Topics to cover:

- **The senior question.** Unit 2's Principle #7 moves — discriminated unions, branded types, exhaustiveness through `assertNever`, `Result<T, E>` contracts — are *compile-time* guarantees. A refactor that widens a union, drops a brand, or loses an exhaustiveness case compiles fine and ships a regression invisible to runtime tests. The reach is **type-level testing**: assertions checked by the type checker, not the runner, gated by `vitest --typecheck`.
- **What type-level tests assert.** Three shapes. (1) A value's inferred type matches an expectation: `expectTypeOf(ok(invoice)).toEqualTypeOf<Result<Invoice, never>>()`. (2) A function's signature: `expectTypeOf(formatMoney).parameters.toEqualTypeOf<[Money, string]>()`. (3) A type's structure: `expectTypeOf<InvoiceState>().toEqualTypeOf<Draft | Sent | Paid>()`. The check happens at compile time; failure surfaces as a Vitest failure.
- **`expectTypeOf` API surface.** `.toEqualTypeOf<T>()` — exact bidirectional equality. `.toMatchTypeOf<T>()` / `.toBeAssignableTo<T>()` — one-way assignability. `.toBeAny()`, `.toBeUnknown()`, `.toBeNever()`, `.toBeString()`, `.toBeNumber()` for primitive checks. `.parameters`, `.returns`, `.instance`, `.constructor` for function and class types. `.items` for arrays. `.toHaveProperty('foo').toEqualTypeOf<string>()` for property-by-property. `.not.toEqualTypeOf<T>()` for negation.
- **`assertType<T>(value)`.** Narrower form: `assertType<Result<Invoice, never>>(ok(invoice))`. Equivalent to `const x: T = value` but expression-shaped. Reach for one-off type-pinning; `expectTypeOf` reads more as a test.
- **`*.test-d.ts` files.** Vitest convention: type-level tests live in `*.test-d.ts` files. Colocation applies: `result.ts` and `result.test-d.ts` side by side. The runtime runner skips them; `vitest --typecheck` invokes `tsc` over the glob.
- **Running them — `vitest --typecheck`.** Adds `tsc --noEmit` over type-test files; failures surface as Vitest failures. CI calls `vitest run --typecheck`. Locally, opt-in (slower than runtime). Run pre-commit and in CI, not on every save. `typecheck.include` narrows the glob to `*.test-d.ts` so other files aren't re-checked.
- **Testing discriminated unions.** `type Invoice = Draft | Sent | Paid`, with `assertNever` exhaustiveness in switches. The type test pins the union (`expectTypeOf<Invoice>().toEqualTypeOf<Draft | Sent | Paid>()`) and the consumer (`expectTypeOf(processInvoice).parameters.toEqualTypeOf<[Invoice]>()`). Adding `Cancelled` to the union without updating `processInvoice` breaks at compile time; the type test catches the regression structurally.
- **Testing brands.** `type InvoiceId = string & { __brand: 'InvoiceId' }`. `expectTypeOf<InvoiceId>().not.toEqualTypeOf<string>()` and `.not.toEqualTypeOf<UserId>()`. Asserts the brand isn't widened to `string` or aliased across IDs.
- **Testing the `Result` contract.** `expectTypeOf(ok(invoice)).toEqualTypeOf<{ ok: true; data: Invoice }>()` and `expectTypeOf(err({ code: 'NOT_FOUND' })).toEqualTypeOf<{ ok: false; error: { code: 'NOT_FOUND' } }>()`. Catches consumer drift (destructuring `data` before checking `ok`) at compile time.
- **Testing generics.** `function map<T, U>(r: Result<T, E>, fn: (t: T) => U): Result<U, E>` — pin inference with `expectTypeOf(map(ok(1), (n) => n.toString())).toEqualTypeOf<Result<string, never>>()`. Catches accidental widening of `U` to `unknown`.
- **Testing Zod and Drizzle inferred types.** `expectTypeOf<z.infer<typeof InvoiceSchema>>().toEqualTypeOf<Invoice>()` — the schema-as-source pattern (7.1) means the type test catches drift between schema and domain type. Same for `InferSelectModel<typeof users>` against the application's `User` type.
- **Negative assertions.** `expectTypeOf<UserId>().not.toBeAssignableTo<OrgId>()` — brands don't cross. `expectTypeOf<Result<Invoice, never>>().not.toBeAssignableTo<Invoice>()` — unwrap is required. Negative assertions catch accidental widening.
- **Type tests are not runtime tests.** They assert shape; they don't run code. `expectTypeOf(buildUser({ ... }))` doesn't *call* `buildUser` — the value is type-erased. Type tests sit *next to* runtime tests, not instead of them. Validating runtime values is `expect(typeof input).toBe('string')` — different tool.
- **CI surface.** `vitest --typecheck` runs in CI; failures break the build. Coverage doesn't include type tests (no runtime to instrument). Treat type-test files like any other — reviewed, deleted when the contract goes away.
- **Watch-outs.** A type test with no `expectTypeOf` call is a no-op; `expectTypeOf(value)` without a `.toX()` is a warning, not a failure; `toEqualTypeOf` is bidirectional, `toMatchTypeOf` is one-way — pick deliberately; `// @ts-expect-error` asserts the next line *fails* type checking but goes stale silently when the code starts to type-check; type-test files imported into runtime tests bring them into the runtime graph — keep them isolated; `vitest --typecheck` doesn't fail when a file has zero assertions — confirm by file count.

What this lesson does not cover:

- Runtime assertions on values (matchers, `Result.ok` checks) — Lessons 19.2.1, 19.2.6.
- Principle #7 from Unit 2 — owned by Chapter 2.5.
- Drizzle schema inference — Unit 6.
- Zod schema definition — Chapter 7.1.
- `tsc`'s broader role (CI, builds) — Chapter 21.
- Mutation testing — out of scope.

Estimated student time: 35 to 45 minutes. Mechanics-and-pattern lesson; the type-test files become a permanent part of the suite.

---

## Lesson 19.2.5 — Testing async code

Topics to cover:

- **The senior question.** An async function returns a promise. The test reads `expect(fn()).resolves.toBe(value)` and forgets the `await`. Under Vitest 3, the test passes regardless — the assertion is a returned promise the runner never awaits, the test exits green, the bug ships. The lesson installs the **forgotten-`await` trap** and its prevention: `expect.assertions(n)` to declare assertion count, `await expect(...).resolves` / `.rejects` as the canonical async assertion, the async fake-timer surface for promise-chained timers, and Vitest 4's awaited-assertion enforcement as the future to write against.
- **The forgotten-`await` trap.** Three v3 silent-pass shapes: (1) `expect(promise).resolves.toBe(x)` without `await`; (2) `expect(promise).toBe(x)` (compares a Promise to a value — always false but the returned promise is unawaited); (3) `it('...', () => { somePromise(); })` (the promise isn't returned or awaited). Vitest 4 makes (1) and (2) fail loudly. The chapter writes as if v4 is in.
- **`async / await` in `it` callbacks.** Every async test is `it('...', async () => { ... })`. The runner awaits the callback's returned promise. Defaulting to `async` even when not strictly required future-proofs the test.
- **`await expect(promise).resolves.toBe(value)`.** The canonical positive-async form. `.resolves` awaits the promise and applies the matcher. The outer `await` is required. Same shape for `.rejects.toThrow(...)`.
- **`expect.assertions(n)`.** Declares the test expects exactly `n` assertions to run. If the test exits before reaching them (forgotten `await`, early return, swallowed error), the test fails: "Expected `n` assertions, called `0`". Cheap insurance for branchy tests (try / catch around the act). `expect.hasAssertions()` is the looser "at least one" variant.
- **The "promise returned, not awaited" alternative.** `return expect(promise).resolves.toBe(x)` — works in v3 and v4. Equivalent to `await`; the course prefers `await` because it composes across multiple assertions per test.
- **Async error assertions — `rejects.toThrow`.** `await expect(fetchInvoice('bad-id')).rejects.toThrow(NotFoundError)`. Assert on class or structured `code`, never message. Depth in 19.2.6.
- **`try / catch` for richer error inspection.** When the structured error has multiple fields: `try { await fn(); expect.fail('expected throw'); } catch (err) { expect(err).toBeInstanceOf(MyError); expect(err.code).toBe('NOT_FOUND'); }`. The `expect.fail` ensures a no-throw case fails clearly.
- **`vi.useFakeTimers()` with async — the deep trap.** Code does `await sleep(5000); doWork()`. The test `vi.advanceTimersByTime(5000)` fires the timer, but `sleep`'s promise resolves on the *next microtask* — `doWork` hasn't run. Fix: `await vi.advanceTimersByTimeAsync(5000)`. Same for `runAllTimersAsync`, `runOnlyPendingTimersAsync`. Every fake-timer test on an async path uses the `*Async` variants.
- **Microtask vs. macrotask.** Promises resolve in microtasks; `setTimeout` fires in macrotasks. `vi.advanceTimersByTime` ticks only macrotasks; promises chained after the timer need a microtask flush too. The async variants do both. Mental model: timer fires → callback runs → callback's awaits queue microtasks → microtasks drain → assertion sees the result.
- **`Promise.resolve()` to flush microtasks.** When the code schedules outside the timer system (`queueMicrotask`, `.then(...)` chains), `await Promise.resolve()` (or twice for two ticks) flushes pending microtasks without touching timers.
- **Concurrent async tests — `it.concurrent`.** Use the context's `expect` (`async ({ expect }) => ...`) for snapshot attribution. Fine when tests are genuinely independent; if they share fake timers or module mocks, concurrency races. Default off; opt in deliberately.
- **Cleanup in async tests.** Resources opened (an `AbortController`, an `setInterval`) must clean up on failure too: `try { ... } finally { controller.abort(); }` or `afterEach`. Missing `vi.useRealTimers()` in `afterEach` leaks fake time forward.
- **Cancellation — `AbortSignal`.** Functions accepting an `AbortSignal` get a cancellation test: trigger abort, assert the function rejects with `AbortError`. `const controller = new AbortController(); const promise = fn({ signal: controller.signal }); controller.abort(); await expect(promise).rejects.toThrow(/abort/i)`. Cancellation is a behavior; it gets a test.
- **`Promise.allSettled` for parallel-effect assertions.** When the unit fires concurrent calls and the test asserts each outcome: `const results = await Promise.allSettled([...]); expect(results.map((r) => r.status)).toEqual(['fulfilled', 'fulfilled', 'rejected'])`. Covers unhappy paths without collapsing into one outer rejection.
- **Vitest 4 — what changes.** Missing-await becomes a hard failure. Tests that returned a promise without awaiting must adopt `await` or explicit `return`. The chapter writes the shape correct in both versions.
- **Watch-outs.** A non-async `it` returning a promise mixes shapes — keep async tests `async`; `expect(promise).resolves` without `await` is the v3 silent pass; `setTimeout(fn, 0)` chained behind an await needs the async timer variant; `vi.spyOn(global, 'setTimeout')` interferes with fake timers — use `vi.useFakeTimers()` instead; a long `testTimeout` is a smell, not a fix; repeated `await Promise.resolve()` to "wait for things" is brittle — name the actual await point; uncaught rejections during a test fail with shaky attribution — wrap every async call in `await`.

What this lesson does not cover:

- Fake timer mechanics on the time / clock axis — Lesson 19.2.3.
- Unhappy-path error-shape assertions — Lesson 19.2.6.
- Integration-level async (MSW handlers, Drizzle transactions) — Chapter 19.3.
- Server Action async testing — 19.3.7.
- Playwright's async waiting — Chapter 19.5.
- Concurrency primitives in production (queues, rate-limit, retries) — Chapters 13, 15.

Estimated student time: 40 to 50 minutes. Mechanics lesson; every async test in the suite uses this shape.

---

## Lesson 19.2.6 — Testing the unhappy path

Topics to cover:

- **The senior question.** A function returns `Result<Invoice, InvoiceError>`. Tests cover the success path. The error path — DB throws a duplicate-key, validation fails, upstream returns 503 — is untested. Bugs cluster on the unhappy path because no one wrote the test. The discipline: **every behavior has at least two tests — the success and the documented failure** — with matchers that read the failure clearly: `toThrow` for sync, `rejects.toThrow` for async, `toMatchObject({ ok: false, error: { code } })` for `Result.err`, custom matchers for the domain contract.
- **The two-path rule.** From 19.1.4: every behavior has two tests. A function throwing on invalid input has `it('returns the parsed value on valid input')` and `it('throws ValidationError on invalid input')`. Both in the same `describe`, read together. Reading aloud produces "on success, X; on failure, Y" — the contract from both sides.
- **`toThrow` surface.** `expect(() => fn(bad)).toThrow()` — any throw. `.toThrow(ValidationError)` — class. `.toThrow('Invalid email')` — substring of message. `.toThrow(/email/i)` — regex. The function must be wrapped in an arrow — `expect(fn(bad)).toThrow()` calls `fn(bad)` *first* and the throw escapes the assertion.
- **Assert on class or code, not message.** `toThrow(ValidationError)` and `toThrow(/INVALID_EMAIL/)` (structured code) are stable; `toThrow('Email must be a valid RFC 5322 address')` breaks on every wording edit. Messages are user-facing; classes and codes are the contract. The reach: `toThrow(ClassName)` plus an assertion on `err.code`.
- **Inspecting the thrown error directly.** When `toThrow` isn't enough: `try { fn(bad); expect.fail('expected throw'); } catch (err) { expect(err).toBeInstanceOf(ValidationError); expect(err.code).toBe('INVALID_EMAIL'); expect(err.fieldErrors).toEqual(...); }`. `expect.fail` guards the no-throw case. Async equivalent uses `await`.
- **Asserting on `Result.err` shape.** The course's `Result` from 7.2.3 is `{ ok: false, error: { code, userMessage, fieldErrors? } }`. Use `toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } })` — partial match ignores fields not under test. Don't `toEqual` the full shape; every test breaks when one field gets added.
- **Custom matchers for `Result`.** `expect.extend({ toBeOkResult(received, expectedData?) { ... }, toBeErrResult(received, expectedCode?) { ... } })`. Shape: `expect(result).toBeOkResult({ id: expect.any(String) })` and `expect(result).toBeErrResult('NOT_FOUND')`. The matcher absorbs the discriminator check; failure messages name the divergence ("expected ok, got err with code DUPLICATE_KEY"). Ships in `src/test/matchers/result.ts`.
- **Zod error shape testing.** A failing `safeParse` returns `{ success: false, error: ZodError }`. Assert: `expect(parsed.success).toBe(false); expect(parsed.error.issues).toContainEqual(expect.objectContaining({ path: ['email'], code: 'invalid_string' }))`. Match the path and code; never the message. Zod 4's `code` enum is the stable surface.
- **Postgres error mapping tests.** `lib/error-mapping.ts` maps Postgres codes (`23505` → `DUPLICATE_KEY`, `23503` → `FOREIGN_KEY_VIOLATION`, `40001` → `SERIALIZATION_FAILURE`). Table-driven: `it.each([['23505', 'DUPLICATE_KEY'], ...])('maps %s to %s', ...)`. One row per documented mapping; default `UNEXPECTED_ERROR` for unknowns gets a row.
- **Error message *not* under test.** `expect(error.message).toBe('Could not find invoice with id inv_123')` couples to user-facing copy. Strings are i18n'd and change. Assert on `code: 'NOT_FOUND'`; leave message rendering to template snapshots.
- **`Error.cause` chain assertions.** When the unit re-wraps with `new MyError('...', { cause: originalErr })`: `expect(err).toBeInstanceOf(MyError); expect(err.cause).toBeInstanceOf(NetworkError)`. The wrap-and-throw discipline from 2.8.2 carries production debug info; tests verify the chain isn't broken.
- **`not.toThrow`.** `expect(() => fn(good)).not.toThrow()` — for "doesn't throw, returns void" paths. Pairs with positive assertions on side effects (the row written, the audit log entry — in 19.3).
- **`expect.fail()` and `it.fails`.** `expect.fail('reason')` ensures a no-throw path fails informatively. `it.fails('known broken behavior', ...)` inverts the outcome — green when the test fails. Reach for `it.fails` to document a queued-for-fix regression; remove when fixed. Don't lean on it long term.
- **Unhappy-path coverage audit.** From 19.1.3: a file with 100% line coverage and no throw-branch test is a smell. Branch coverage first surfaces it. Audit reflex: for every exported function, "is there a test for the throw / error branch?"
- **Watch-outs.** `expect(fn(bad)).toThrow()` without the arrow — the call runs and throws before `expect` sees anything; `toThrow('Invalid email')` is a *substring* match, not full-string; matching message strings breaks on i18n updates; narrowing `result` for `error.code` access — assert via `toMatchObject({ ok: false, error: { code } })` to skip the narrowing dance; testing success and failure in one `it` block conflates behaviors — split; `it.fails` committed without a tracking issue lingers; `expect(promise).rejects.toThrow()` without `await` is the 19.2.5 trap; mocking a collaborator's throw and asserting the unit re-threw it is a tautology unless the wrap behavior (cause, code mapping) is what's being tested; asserting on stack traces is brittle — class and code only.

What this lesson does not cover:

- The full `Result` shape and contract — Chapter 7.2 owns it.
- The error mapper's seam — Chapter 7.2.3 and Chapter 17 own it.
- Integration-level error testing (DB serialization failures, MSW failure responses) — Chapter 19.3.
- Sentry capture in tests — Chapter 20.1.
- Error rendering in the UI (toast, form errors) — Chapter 7, Chapter 17.
- Snapshot testing for error responses (RFC 9457 bodies) — Chapter 19.3 integration tests.

Estimated student time: 35 to 45 minutes. Pattern lesson closing the chapter; pairs with 19.2.5 (async error patterns) as the unhappy-path duo.

---

## Lesson 19.2.7 — Chapter quiz

Top 10 topics to quiz:

- The `/lib` colocation rule — `name.ts` and `name.test.ts` side by side; `unit` project glob picks up `src/lib/**/*.test.ts`; no `beforeEach` in `/lib` tests as a default.
- Matcher selection by shape — `toBe` for primitives, `toEqual` for deep structural, `toMatchObject` for partial, `toContainEqual` for arrays, `toBeCloseTo` for floats; wrong matcher loses signal.
- The factory pattern — `buildEntity(overrides: Partial<T> = {}): T` returning a fresh instance every call; defaults are valid; factories compose; `src/test/factories/` as canonical home.
- Static fixtures vs. factories vs. seeds — static JSON for external payloads (Stripe webhooks), factories for domain entities, `drizzle-seed` for dev DBs; conflating them produces run-order coupling.
- Determinism seams — every `now()`, `uuid()`, and random number flows through `lib/clock.ts`, `lib/ids.ts`, `lib/random.ts`; tests pin via injection or `vi.mock`; never `Date.now()` or `crypto.randomUUID()` inline.
- Fake timers and Temporal — `vi.useFakeTimers()` patches `Date` but not `Temporal.Now`; the clock-module seam is the durable pattern; `beforeEach` / `afterEach` pair on fake timers; `*Async` variants for promise-chained timers.
- Type-level testing — `expectTypeOf(value).toEqualTypeOf<T>()` for exact equality, `.toMatchTypeOf<T>()` for assignability, `*.test-d.ts` files, `vitest --typecheck` runs them; guards Principle #7's moves (discriminated unions, brands, exhaustiveness).
- The forgotten-`await` trap — `expect(promise).resolves.toBe(x)` without `await` silently passes in Vitest 3, fails in v4; `await expect(...).resolves` is the canonical form; `expect.assertions(n)` on branchy paths.
- `vi.advanceTimersByTimeAsync` vs. `vi.advanceTimersByTime` — async variant flushes microtasks between timer ticks; required when the code under test awaits inside a timer chain.
- Unhappy-path matchers — `toThrow(ClassName)` and `toThrow(/CODE_REGEX/)` over message strings; `toMatchObject({ ok: false, error: { code } })` for `Result.err`; custom `toBeOkResult` / `toBeErrResult` matchers; assert class and code, never user-facing message.
