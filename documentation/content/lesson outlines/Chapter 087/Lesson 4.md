# Lesson 4 — Type-level tests with expectTypeOf

- **Title:** Type-level tests with expectTypeOf
- **Sidebar label:** Type-level tests

---

## Lesson framing

**The one idea.** A codebase has two correctness surfaces: values and types. The last three lessons proved values — `expect(fn(input)).toEqual(output)` run by the Vitest runner. This lesson proves the *other* surface: that a function's signature, a union's members, a brand's distinctness, and a `Result` shape are still what they were, checked by `tsc`, not by running code. The mental model the student leaves with: **a type-level test is an `expect` whose assertion runs in the type checker.** Same colocation reflex, same "one behavior per assertion" discipline — different runner.

**The senior question (woven into the intro, not a heading).** Unit 1's Principle #7 moves — discriminated unions, branded IDs, exhaustiveness — are *compile-time* guarantees. A teammate widens `InvoiceState` with a `Cancelled` case, drops a `__brand` while "simplifying" an ID alias to `string`, or lets a generic's return widen to `unknown`. Every runtime test stays green; the bug is in the *types*, and runtime tests never look at types. The regression ships invisibly. Type-level testing is the test you write *for the compiler* so the contract can't rot silently.

**Why this lands here.** The chapter has spent three lessons on `/lib` purity, factories, and determinism. This lesson is the natural fourth beat: `/lib` is also where the course's hardest *types* live (`lib/result.ts`, `lib/branded.ts`, the Zod schemas), so it is where type tests earn their keep. The student already owns colocation, `describe`/`it`, and matcher-by-shape selection — type tests reuse all of it with a parallel matcher family.

**Tone and depth.** Adult, terse, decisions-first (per pedagogical guidelines). This is a mechanics-and-pattern lesson: the student must leave able to *write* a `*.test-d.ts` file, run it, and reach for the right matcher. Keep cognitive load low by building one mental model (two surfaces) first, then layering the matcher API, then the four domain targets (union, brand, `Result`, generic), then the run/CI story, then the failure modes.

**Critical accuracy note for downstream agents (supersedes the chapter outline).** The chapter outline names `toMatchTypeOf` as a first-class matcher. **`toMatchTypeOf` is deprecated** (since `expect-type` v1.2.0, the version vendored by current Vitest 4.x). Teach the live API:
- `.toEqualTypeOf<T>()` — exact, bidirectional equality (the default reach).
- `.toExtend<T>()` — one-way "is-a"/assignability (the replacement for `toMatchTypeOf`).
- `.toMatchObjectType<T>()` — strict check against an object type with a *subset* of keys.
Mention `toMatchTypeOf` **once**, as the deprecated former name the student will see in old blog posts, then never again. Do not teach `toBeAssignableTo` (no longer in the Vitest docs surface; `toExtend` is the canonical assignability matcher).

**Vitest version stance.** Vitest 4 is stable (4.1, March 2026) — the chapter's "write against v4" stance is now just "current." Type tests run via `vitest --typecheck` (which shells out to `tsc --noEmit` over the type-test glob). State this as present-tense fact, no hedging about an upcoming release.

**Interactivity strategy.** `TypeCoding` is a near-perfect fit and should carry the hands-on weight: it runs an in-browser TS LanguageService, the goal is literally "make tsc quiet," it surfaces inferred types via `^?` queries, and it models the `@ts-expect-error` polarity correctly. Use it for the two practice beats. Do **not** use `ReactCoding`/`ScriptCoding` (no runtime is involved and they can't load the `vitest` import anyway). Close with a short classification check.

---

## Lesson sections

### Two surfaces: values and types

Open with the senior question above, concretely. Show a tiny before/after refactor that a runtime suite cannot catch: an `InvoiceState` union that gains a member, or a branded `InvoiceId` quietly aliased back to `string`. Land the claim: **runtime tests assert values; type tests assert types; neither sees the other's surface.**

Then install the mental model with one small **diagram** (HTML + CSS inside `<Figure>` — a two-column split, not a complex graph). Left column "Runtime surface": `expect(value)` → Vitest runner → pass/fail on *values*. Right column "Type surface": `expectTypeOf<T>()` → `tsc --noEmit` → pass/fail on *types*. A thin divider labeled "same file tree, same `describe`/`it` reflex, different engine." Pedagogical goal: make "there are two checkers" a spatial, durable picture before any API appears. Keep it short and horizontal (vertical-space constraint).

Reinforce the bridge to prior lessons: the colocation rule, the one-assertion-per-behavior discipline, and the "test reads as documentation" framing all carry over unchanged. Only the matcher family and the file suffix differ. This keeps new-concept load to exactly two things.

Code: a single small `Code` block for the before/after union widening is enough here; the comparison is the point, not multiple files. (If the before/after reads better side-by-side, use `CodeVariants` with `Before`/`After` labels and `del=`/`ins=` marks — author's call, but one `Code` block likely suffices.)

### Where type tests live and how they run

Teach the file convention and the runner together so the student can immediately *do* it.

- **`*.test-d.ts` files.** Colocation still applies: `result.ts` and `result.test-d.ts` side by side, the same way `result.test.ts` sits there for runtime. The `-d` suffix is the signal: "this file is type-checked, not executed." The runtime runner skips `*.test-d.ts`; the typecheck pass picks them up.
- **`vitest --typecheck`.** Explain what it does in one sentence: it runs `tsc --noEmit` over the type-test glob and reports any diagnostic as a Vitest test failure, so a broken type contract shows up in the same red output as a broken value. `vitest run --typecheck` in CI; locally it is opt-in because it is slower than the runtime pass — run it pre-commit and in CI, not on every keystroke.
- **Config touch, light.** Note that `typecheck.include` narrows the pass to `*.test-d.ts` so the rest of the suite isn't re-checked, and that this rides the existing `unit` project from Chapter 086 (do **not** re-teach project config — it is established). One small `Code` block showing the relevant `typecheck` slice of `vitest.config.ts` plus the `package.json` script (`"test:types": "vitest run --typecheck"`).

Use a `<FileTree>` fragment to show `result.ts`, `result.test.ts`, `result.test-d.ts` as siblings — the visual makes the "third sibling" concrete and reinforces colocation. Pedagogical goal: cement that type tests are *peers* of runtime tests, not a separate tree.

`Term` tooltips here: **`*.test-d.ts`** (Vitest's type-test file suffix; type-checked, never executed), **`--noEmit`** (run `tsc` for diagnostics only, produce no JS output). Keep the explanation of `tsc` itself out of flow — it's a `Term`-level reminder, not a section (broader `tsc`/CI role is Unit 20's, see scope).

### The expectTypeOf matcher family

This is the API core. Present it as a *parallel* to runtime matchers (the student picked matchers by value shape in Lesson 1; now they pick type matchers by type relationship). Use `AnnotatedCode` over one compact `result.test-d.ts`-flavored block so attention is directed matcher-by-matcher; this is exactly the "one block, focus shifts" case `AnnotatedCode` exists for. Steps, each ≤6 lines of prose, colored (blue default):

1. The wrapper: `expectTypeOf(value)` takes a value and exposes its *type*; `expectTypeOf<T>()` takes a type directly. Both are erased at runtime — they do nothing when executed, which is why the typecheck pass is mandatory.
2. `.toEqualTypeOf<T>()` — exact, bidirectional equality. The default reach when you want "this is *exactly* `T`, no wider, no narrower."
3. `.toExtend<T>()` — one-way assignability ("the value's type is *a* `T`"). Use when a subtype is acceptable. (Footnote in prose: this replaces the deprecated `toMatchTypeOf`.)
4. `.toMatchObjectType<T>()` — strict object match against a *subset* of keys; the type-level analog of runtime `toMatchObject`.
5. Navigators: `.parameters`, `.returns`, `.items` (array element), `.toHaveProperty('x')` — drill into a function/array/object type, then assert on the drilled type. Show `expectTypeOf(formatMoney).parameters.toEqualTypeOf<[Money, Currency]>()` and `.returns.toEqualTypeOf<string>()`.
6. Primitive/special checkers: `.toBeString()`, `.toBeNumber()`, `.toBeAny()`, `.toBeNever()`, `.toBeUnknown()` — and why `.toBeAny()` is the canary for accidental `any` leaking through a generic.
7. `.not` — negation, the workhorse for brands and "must not widen" assertions (`.not.toEqualTypeOf<string>()`).

Pair this with a tight matcher-selection table (a `Code`-free markdown table or an `Aside`): *type relationship → matcher*. Exact equality → `toEqualTypeOf`; "is-a"/subtype OK → `toExtend`; object subset → `toMatchObjectType`; "definitely not this type" → `.not.*`; "is it `any`?" → `toBeAny`. Mirror Lesson 1's matcher-by-shape table so the parallel is explicit. Pedagogical goal: the student leaves with a decision procedure, not a memorized list.

Also teach `assertType<T>(value)` briefly as the narrower, expression-shaped alternative (`assertType<Result<Invoice>>(ok(invoice))` ≈ `const x: T = value`). One-liner guidance: reach for `assertType` for a quick one-off pin; reach for `expectTypeOf` when the file reads as a test. Keep it to a sentence and a single line of code — don't let it compete with `expectTypeOf` for attention.

`Term` tooltips: **bidirectional equality** (A equals B requires A assignable to B *and* B assignable to A — neither is wider), **assignability** (a value of type A can be used where B is expected), **structural typing** (TS compares shapes, not names — the reason brands need a phantom field). Use **structural typing** specifically to set up the next section.

### Pinning a discriminated union

Now apply matchers to the chapter's real domain. Use the invoice-state union the chapter already leans on. Two assertions, both load-bearing:

- Pin the union itself: `expectTypeOf<InvoiceState>().toEqualTypeOf<Draft | Sent | Paid>()`. Explain *why bidirectional matters here*: if a refactor adds `Cancelled`, the union is now wider than the literal on the right, `toEqualTypeOf` fails, and the test names the drift. (If you'd used `toExtend`, a widened union would still pass — so this is the wrong place for `toExtend`. Make that contrast explicit; it justifies the matcher choice.)
- Pin the consumer's parameter: `expectTypeOf(processInvoice).parameters.toEqualTypeOf<[InvoiceState]>()`. Now adding `Cancelled` *to the union* without teaching `processInvoice` about it surfaces at the type-test boundary, structurally.

Connect to exhaustiveness: the runtime `assertNever` switch (taught in Unit 1) and the type test are complementary — `assertNever` fails the *build* if a switch misses a case; the type test fails if the *union or the signature* drifts. Together they fence the discriminated union from both sides. Keep this to two sentences; do not re-teach `assertNever` (scope).

Code: one `Code` block with the union, `processInvoice` signature, and the two assertions — short enough that `AnnotatedCode` would be overkill. Keep the union members as opaque object types (`{ status: 'draft'; ... }`) so the discriminant is visible.

### Keeping branded IDs from collapsing to string

Branded IDs are the highest-value, most counter-intuitive target — students new to brands assume two `string`-based IDs are "obviously different," but **structural typing says they're the same `string`** unless a phantom brand separates them. This is the payoff of the `Term` planted earlier.

- Show the brand shape from `lib/branded.ts` (the course's `Brand<T, Name>` helper): `type InvoiceId = Brand<string, 'InvoiceId'>`, `type UserId = Brand<string, 'UserId'>`.
- The two negative assertions that matter:
  - `expectTypeOf<InvoiceId>().not.toEqualTypeOf<string>()` — the brand hasn't been widened away (the "simplified back to `string`" regression).
  - `expectTypeOf<InvoiceId>().not.toExtend<UserId>()` — IDs don't cross-assign; passing a `UserId` where an `InvoiceId` is wanted is a type error, and this test proves the guard still holds.
- Frame *why negative assertions*: brand bugs are bugs of *absence* (a missing brand, a removed distinction). You assert the bad thing is impossible, so `.not` is the natural tool. This reframes negation from "edge case" to "the point."

Code: one `Code` block. Optionally a `CodeTooltips` on the `Brand<string, 'InvoiceId'>` expression to surface the phantom-field expansion inline — only if it clarifies the structural-typing point without derailing. Author's call; a plain block plus the `Term` may be enough.

### Pinning the Result contract

Tie the chapter's spine — the `Result<T>` shape every `/lib` function returns — to the type surface. **Use the canonical shape from the conventions and Lesson 1's continuity notes**, not the chapter-outline variants:

```
type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: ...; userMessage: string; fieldErrors?: ... } }
```

Single type parameter `Result<T>` (not `Result<T, E>`), `data` on the ok branch, `error: { code, userMessage, fieldErrors? }` on the err branch, `code` values lowercase snake (`'not_found'`, `'conflict'`, `'internal'`). Downstream agents: match this exactly — drift here contradicts the rest of the chapter.

Teach two assertions:
- The constructor's inferred type: `expectTypeOf(ok(invoice)).toEqualTypeOf<{ ok: true; data: Invoice }>()` (or against `Extract<Result<Invoice>, { ok: true }>` if cleaner). Catches `ok()` accidentally widening `data`.
- The consumer contract: a function that destructures `data` *before* checking `ok` should not type-check. Show the positive version (narrow first) passing, and gesture that the unnarrowed access is a compile error the discriminated union enforces — this is the type-level mirror of the unhappy-path discipline Lesson 6 will cover at the value level.

Briefly extend to **schema-derived types** (the "schema is the source" pattern): `expectTypeOf<z.infer<typeof InvoiceSchema>>().toEqualTypeOf<Invoice>()` and `expectTypeOf<InferSelectModel<typeof invoices>>().toEqualTypeOf<...>()`. The point: when the schema *is* the source of truth, a type test catches drift between the schema and a hand-written domain type the moment it appears. One or two sentences plus a single assertion line — do **not** re-teach Zod or Drizzle (scope); just show the assertion shape.

Code: `Code` block(s). If showing both the `ok()` pin and the consumer-narrowing contrast, `CodeVariants` (`Inferred type` / `Consumer must narrow`) reads well; otherwise two small `Code` blocks.

### Pinning generic inference

Short section, one strong example. Generics are where types silently widen to `unknown`, and runtime tests are blindest here.

- Example: a `mapResult<T, U>(r: Result<T>, fn: (t: T) => U): Result<U>` mapper. Assert the inference: `expectTypeOf(mapResult(ok(1), (n) => n.toString())).toEqualTypeOf<Result<string>>()`. If `U` accidentally widens to `unknown` (a common refactor casualty), this fails.
- Add a `.toBeAny()` guard sentence: a generic that has quietly degraded to `any` passes most assertions silently — `expectTypeOf(...).not.toBeAny()` is the canary. This is the type-level analog of "a test with no assertion is a no-op."

Code: one `Code` block. This section can be brief — it's a capstone application of the matchers, not a new concept.

### Practice: make tsc quiet

Two `TypeCoding` exercises, placed *at* the relevant beats rather than dumped at the end (guideline: content where it belongs). `TypeCoding` is ideal — its whole model is "the checker re-runs as you type; make the errors go away," which *is* the type-test loop.

**Exercise A — fix a drifted Result pin** (place right after the Result section). Starter: a `result.test-d.ts`-style snippet where `ok()`'s assertion no longer matches (e.g. the asserted type still says `data: Invoice` but the value's `ok` was changed, or a `^?` query on `ok(invoice)` whose resolved type the student must read). Use an `expectedQueries` row pinning the `^?` resolved type to a `data:` substring so the student confirms the inferred shape, plus the implicit "fix all errors" goal. Instructions: "Read the inferred type under `^?` and correct the `toEqualTypeOf` argument so the type test passes." Goal: the student *operates* the matcher, not just reads it.

**Exercise B — prove the brand can't cross** (place after the branded-ID section). Starter: `InvoiceId`/`UserId` brands and a line that *should* be a type error (assigning a `UserId` to an `InvoiceId`). Model the polarity correctly per the TypeCoding doc: put `// @ts-expect-error` above the should-fail line, so the student's job stays "make all errors go away" (the directive errors if the line below *doesn't* fail). Optionally a second blank to fill: complete a `.not.toEqualTypeOf<string>()` assertion. Goal: the student internalizes that a *passing* type test can mean "this is correctly rejected."

For each exercise, provide a reference solution behind `<details>` (guideline: reveal-on-demand). Keep starters short (≤ ~15 lines) so the checker boots fast and the failure is legible.

### Type tests are not runtime tests

Close on the boundary that prevents the most common conceptual error: thinking a type test *runs*.

- `expectTypeOf(buildUser({ role: 'admin' }))` does **not** call `buildUser` — the value is type-erased; only its *type* is inspected. So a type test can never assert that a value *equals* something, only that its type *is* something.
- Therefore type tests sit *beside* runtime tests, never instead of them. The union's *members* are a type test; that `processInvoice('paid-invoice')` *returns the paid total* is a runtime test. Validating that a runtime input *is actually a string* is `expect(typeof x).toBe('string')` — a different tool entirely.
- CI surface: `vitest run --typecheck` gates the build; coverage does **not** include type tests (no runtime to instrument — there is nothing to cover). Treat `*.test-d.ts` files like any test: reviewed, and deleted when the contract they pin goes away.

End with a one-line synthesis tying back to the opening diagram: two surfaces, two checkers, one colocated suite.

Then a short **`MultipleChoice`** or **`Buckets`** check: "which of these regressions does a *type* test catch vs a *runtime* test?" — items like "union gains a `Cancelled` member" (type), "`ok()` returns `data` undefined at runtime" (runtime), "`InvoiceId` widened to `string`" (type), "off-by-one in a total" (runtime), "generic return widened to `unknown`" (type). `Buckets` with two columns (Type test / Runtime test) drills the surface distinction that is the lesson's whole thesis. Pedagogical goal: verify the student can *classify*, which is the durable skill.

**Failure modes to fold into the sections above** (not a standalone "watch-outs" section — distribute each to where its concept is taught, per guidelines):
- *In "matcher family":* `expectTypeOf(value)` with no `.toX()` chained does nothing — a silent no-op; `toEqualTypeOf` is bidirectional while `toExtend` is one-way — choosing `toExtend` where you meant exact equality lets a widened type pass.
- *In "where they run":* `vitest --typecheck` does **not** fail a file that contains *zero* assertions — an empty `*.test-d.ts` is green; confirm coverage by reviewing files, not by trusting a pass. Importing a `*.test-d.ts` into a runtime test drags it into the runtime graph — keep them isolated.
- *In "branded IDs" / practice B:* `// @ts-expect-error` asserts the next line *fails* type-checking; when the code later starts to type-check, the directive goes stale and the only signal is the "unused directive" error — which is exactly why the should-fail line needs the directive, not a comment.

---

## Scope

**Prerequisites — redefine briefly, do not re-teach:**
- `Result<T>` exists and has the canonical shape (state the shape in one block in the Result section; Chapter 043 owns its design and the `ok`/`err` helpers).
- Branded IDs and the `Brand<T, Name>` helper from `lib/branded.ts` exist (Unit 1 / Chapter 005, Principle #7); restate the brand *shape* in one line, don't re-derive the technique.
- Discriminated unions and `assertNever` exhaustiveness are known (Unit 1 / Chapter 005); reference, don't teach.
- Vitest projects, colocation, `globals: false`, the `unit` project glob, and matcher-by-shape are established (Lessons 1–3 of this chapter and Chapter 086); reuse, don't re-explain.

**Explicitly out of scope (defer, do not cover):**
- Runtime value assertions, matcher-by-shape, custom `toBeOkResult`/`toBeErrResult` — Lessons 1 and 6 of this chapter.
- Factory return *values* and determinism seams — Lessons 2 and 3 (already taught); type-pinning a factory's *return type* may appear as a one-line example but is not a section.
- Async/promise type testing depth, the forgotten-`await` trap — Lesson 5.
- Unhappy-path *value* assertions (`toThrow`, `Result.err` shape matching, Zod issue inspection) — Lesson 6. (Type-level Result contract here ≠ value-level err inspection there — draw the line explicitly so the two don't blur.)
- Zod schema *definition* (Chapter 042) and Drizzle schema *inference* mechanics (Unit 5) — only the `z.infer`/`InferSelectModel` *assertion shape* is shown, not how the schemas are built.
- `tsc`'s broader role in CI and builds — Unit 20.
- Mutation testing, `tsd`/`dtslint` as alternative type-test tools, `expect-type` used standalone — out of scope; Vitest's built-in `expectTypeOf` is the only tool taught.
- Principle #7 itself (why discriminated unions/brands/exhaustiveness) — Chapter 005 owns the *why*; this lesson owns *testing* that the guarantees hold.

**Estimated student time:** 35–45 minutes. Mechanics-and-pattern lesson; the `*.test-d.ts` files it introduces become a permanent part of the suite and recur in Chapter 088.
