# Asserting the unhappy path

- Title: Asserting the unhappy path
- Sidebar label: The unhappy path

## Lesson framing

Closing lesson of Ch087. The chapter taught the daily unit-test shape (L1), factories (L2), determinism seams (L3), type-level tests (L4), and async mechanics (L5). What's still untested in most real codebases is the *failure* side of every contract: the throw, the `Result.err`, the Zod issue, the Postgres-code mapping, the re-wrapped `Error.cause`. Bugs cluster there precisely because nobody wrote the test. This lesson installs the discipline and the matcher craft to assert failure as deliberately as success.

Senior framing (lead with it, don't make it a section): a function's contract has two halves. "Returns the parsed value on valid input" is half the contract; "throws `ValidationError` on invalid input" is the other half. A test suite that only exercises the happy path documents half a contract and green-lights the half where bugs live. The mental model the student leaves with: **every behavior earns at least two tests, and the failure test asserts the stable surface — class and code — never the user-facing message.**

The single most important transferable idea is *assert the contract, not the wording*. Beginners reflexively write `expect(err.message).toBe('Could not find invoice inv_123')`, which couples the test to copy that is i18n'd, reworded by product, or templated per-locale. The senior asserts `err.code === 'not_found'` or `toBeInstanceOf(NotFoundError)` — the part of the error that is a promise to callers. Drive this contrast hard; it's where students go wrong in production.

Pain points to surface and relieve, in teaching order:
1. The arrow-function trap on `toThrow` — `expect(fn(bad)).toThrow()` runs `fn(bad)` *before* `expect` sees it, so the throw escapes the assertion entirely. This is the number-one `toThrow` mistake; name it the moment `toThrow` appears.
2. Choosing a matcher by the *shape* of the failure: a thrown class vs. a returned `Result.err` object vs. a Zod `safeParse` result are three different shapes needing three different tools. Make the decision explicit.
3. `toMatchObject` over `toEqual` for `Result.err` — partial match survives an added field; full deep-equal makes every error test break when someone adds a `traceId`.
4. The tautology trap: mocking a collaborator to throw and asserting the unit re-threw is only a real test when the *wrap* (cause chain, code re-mapping) is what's under test.

This lesson pairs with L5 as the "unhappy-path duo": L5 owns *async* error mechanics (`await … .rejects`, the forgotten-await trap); L6 owns *error-shape* craft and applies it across sync and async. L5 already previewed `await expect(p).rejects.toThrow(Class)` and `expect.fail` inside a `try` — reference that, don't re-teach the async plumbing.

Code-sample strategy: this is a pattern lesson, so code carries the weight. Use `CodeVariants` for the wrong-vs-right matcher contrasts (the message-string vs. code contrast, the `toEqual`-vs-`toMatchObject` contrast, the arrow-vs-bare `toThrow`) — these are A/B comparisons where seeing both side by side is the lesson. Use `AnnotatedCode` once for the custom-matcher implementation (multiple parts of one file need attention). Use plain `Code` for short canonical snippets. One `it.each` table for the Postgres mapping. Anchor all examples to the chapter's established illustrative `/lib` functions and the canonical `Result<T>` / error classes — do not invent a parallel error model.

Examples must use the course's canonical `Result<T>`: single type parameter, `{ ok: true, data }` / `{ ok: false, error: { code, userMessage, fieldErrors? } }`, lowercase-snake codes (`'not_found'`, `'conflict'`, `'validation'`, `'forbidden'`, `'rate_limited'`, `'internal'`), helpers `ok(data)` / `err(code, userMessage, fieldErrors?)` from `lib/result.ts`. The custom matchers `toBeOkResult` / `toBeErrResult` were *introduced by name* in L1 and live at `src/test/matchers/result.ts`; this lesson is where their implementation and use are finally taught. Real Vitest matcher names throughout (`toMatchObject`, `rejects`, `expect.objectContaining`, `expect.any`) — note that the in-page `ScriptCoding` shim is a subset, handled in the Scope section.

## Lesson sections

### Introduction (no header)

Open on the half-tested contract. A concrete `/lib` function the student can hold in their head — reuse `fetchInvoice` from L5 or a `parseInvoiceInput` validator — whose success path has a test and whose failure path doesn't. State the cost in one line: bugs cluster on the unhappy path because that's the half nobody asserted. Preview the practical skill: by the end, the student writes the failure test for any `/lib` export — thrown errors, `Result.err`, Zod issues, wrapped causes — choosing the matcher by the failure's shape and asserting only the stable surface. Keep it to a short paragraph; connect back to the two-path rule the student met in Ch086.

### Every behavior gets two tests

Teach the two-path rule (from Ch086 L4) as the organizing principle, not a tip. A function with a documented failure mode has two `it` blocks in the *same* `describe`, read together top-to-bottom: `it('returns the parsed value on valid input')` and `it('throws ValidationError on invalid input')`. Reading the file aloud should produce "on success X, on failure Y" — the contract from both sides. State the anti-pattern explicitly: testing success and failure in one `it` conflates two behaviors and muddies which one broke — split them.

Show a small two-`it` `describe` skeleton with plain `Code` so the shape is concrete before matchers arrive. This section is short — it frames everything below.

Reasoning: the student knows AAA and one-behavior-per-`it` from L1; this is the specific application that motivates the whole lesson. Establishing it first means every matcher technique below has an obvious home (the second `it`).

### Asserting thrown errors with `toThrow`

The sync-throw path. Walk the `toThrow` surface from loosest to tightest:
- `expect(() => fn(bad)).toThrow()` — asserts *something* threw.
- `.toThrow(ValidationError)` — the class.
- `.toThrow('Invalid email')` — **substring** of the message (call this out: it is not a full-string match).
- `.toThrow(/email/i)` — regex against the message.

Then the arrow-function trap, given its own beat with a `CodeVariants` wrong/right comparison:
- Wrong tab: `expect(fn(bad)).toThrow()` — `fn(bad)` is evaluated first, throws synchronously, and the error propagates out of the test before `expect` is ever called. The test errors (or crashes) rather than asserting. Use `del=`/`ins=` framing.
- Right tab: `expect(() => fn(bad)).toThrow()` — the arrow defers the call so `toThrow` can invoke it inside a try/catch.

This is the highest-frequency `toThrow` bug; the side-by-side is the most important visual in the section.

`Term` candidate: none new here.

Reasoning: `toThrow` is the entry matcher and the arrow trap is concrete and surprising — a perfect early `CodeVariants`.

### Class and code over message

The lesson's thesis section. Contrast, via `CodeVariants`, the brittle and stable forms of the *same* failure assertion:
- Brittle tab: `expect(() => fn(bad)).toThrow('Email must be a valid RFC 5322 address')` — breaks on every copy edit, every i18n locale, every product reword.
- Stable tab: `expect(() => fn(bad)).toThrow(ValidationError)` plus an assertion on `err.code === 'validation'` — the class and code are the promise to callers; the message is for humans and changes.

Make the principle quotable: **messages are user-facing and mutable; classes and codes are the contract.** Tie it to the code conventions' divergence rule — `userMessage` is for the user, the operator sees the chain in logs — so the test asserts the machine-readable half. Reinforce that this same rule governs `Result.err` (next section) and Zod issues (later): match `code`, not `message`.

`Term` candidate: none; "contract" is used in plain English.

Reasoning: this is the durable senior idea; it deserves its own header so it's not buried under matcher mechanics. Everything after it is an application of it.

### Inspecting the thrown error directly

When `toThrow(Class)` isn't enough — the structured error carries multiple fields worth asserting (`code`, `fieldErrors`, `cause`). Teach the `try`/`catch` + `expect.fail` shape with plain `Code`:

```
try {
  parseInvoiceInput(bad);
  expect.fail('expected parseInvoiceInput to throw');
} catch (err) {
  expect(err).toBeInstanceOf(ValidationError);
  expect(err).toMatchObject({ code: 'validation' });
}
```

Two things to land: (1) `expect.fail('…')` in the try body guards the no-throw case — without it, a function that *stops* throwing makes the test silently pass because the empty catch never runs. (`expect.fail` is a Chai-provided assertion surfaced through Vitest's `expect`; it throws immediately. Treat it as available — it's lightly documented in the Jest-style API pages but stable.) (2) Reference L5: the async equivalent puts `await` before the call and is otherwise identical; don't re-teach it. Mention `expect.assertions(n)` only as a one-line callback to L5 for branchy versions — not re-taught.

Reasoning: students reach for `toThrow` then hit its ceiling (one assertion, message-or-class only); this is the escape hatch. The `expect.fail` guard is the non-obvious bit that makes the pattern safe.

### Asserting `Result.err` shape

Pivot to the *returned* failure — the course's primary error channel for expected failures (validation, conflict, not-found). Restate the `Result<T>` shape concisely (it's a prerequisite, defined in Ch043): `{ ok: false, error: { code, userMessage, fieldErrors? } }`, lowercase-snake codes.

Teach `toMatchObject` as the right tool, contrasted against `toEqual` with `CodeVariants`:
- `toEqual` tab: `expect(result).toEqual({ ok: false, error: { code: 'not_found', userMessage: '…' } })` — forces the test to spell out *every* field; the day someone adds `error.traceId`, every error test in the suite breaks at once. Brittle.
- `toMatchObject` tab: `expect(result).toMatchObject({ ok: false, error: { code: 'not_found' } })` — partial deep match; asserts the discriminator and the code, ignores fields not under test. Stable.

Show `expect.any(String)` / `expect.objectContaining(…)` as asymmetric matchers for fields whose presence (not value) matters, e.g. `error: { code: 'validation', fieldErrors: expect.any(Object) }`.

Reasoning: this is the bread-and-butter assertion in a `Result`-based codebase. The `toEqual`-vs-`toMatchObject` brittleness story is the same shape as the message-vs-code story one section up — reinforcing the through-line that good failure tests assert a *subset*: the contract, not the incidental.

### Custom matchers for `Result`: `toBeOkResult` and `toBeErrResult`

Pay off the debt from L1, which named these as the canonical `Result` assertion pair and reserved their craft for here. Motivate by the rule from L1: a comparison written three-plus times across files earns a custom matcher. `toMatchObject({ ok: false, error: { code } })` is exactly that repetition.

Use `AnnotatedCode` to walk the implementation of `src/test/matchers/result.ts` — multiple parts need focused attention:
- The `expect.extend({ toBeErrResult(received, expectedCode?) { … } })` registration.
- Destructuring `received`, checking the `ok` discriminator.
- The `pass` boolean and the `message` closure — and *why* the message reads "expected an err result, but got ok with data …" so a failure names the divergence (the ergonomic payoff over inline `toMatchObject`).
- Optional `expectedCode` argument so `toBeErrResult('not_found')` also checks the code.

Then show the call sites with plain `Code`: `expect(result).toBeOkResult({ id: expect.any(String) })` and `expect(result).toBeErrResult('conflict')`. Note the TypeScript declaration-merging step (augmenting Vitest's `Assertion` interface) in one line so the matcher is typed — reference it, don't deep-dive into module augmentation.

Reasoning: this is the one place a single code block has enough moving parts (registration, discriminator check, pass/message, optional arg) that stepped highlighting beats a wall of code. It also closes a chapter-long thread, giving the lesson a satisfying capstone feel.

### Matching Zod validation failures

Validation is the most common documented failure in a SaaS `/lib`, and Zod is the course's validator (Ch042, Zod 4). A failing `safeParse` returns `{ success: false, error: ZodError }`. Teach asserting on the **issues array**, matching path and code, never message:

```
const parsed = InvoiceSchema.safeParse(bad);
expect(parsed.success).toBe(false);
if (!parsed.success) {
  expect(parsed.error.issues).toContainEqual(
    expect.objectContaining({ path: ['email'], code: 'invalid_format' }),
  );
}
```

Land three points: (1) `toContainEqual` + `objectContaining` lets you assert one issue exists without pinning the whole array order. (2) The `if (!parsed.success)` narrow is required for TS to see `.error` — a small but real ergonomic detail. (3) Match `path` and the stable `code` enum; Zod messages are localizable and reworded across minor versions.

Use the **Zod 4** issue surface (verified June 2026): a failed string-format check (email, url, uuid) has `code: 'invalid_format'` with a `format: 'email'` field and `path: ['email']` — so `expect.objectContaining({ path: ['email'], code: 'invalid_format', format: 'email' })`. Do **not** teach the Zod 3 `'invalid_string'` / `validation: 'email'` shape — it's gone. The Zod 4 `code` enum the lesson may reference: `invalid_type`, `too_small`, `too_big`, `invalid_format`, `not_multiple_of`, `unrecognized_keys`, `invalid_value` (now covers enum/literal failures), `invalid_union`, `custom`.

`Term` candidate: `ZodError` (the structured error `safeParse` returns on failure) if the student needs the reminder; Ch042 introduced it, so a brief `Term` is enough.

Reasoning: students testing form/input validators will hit this constantly; the path/code-not-message rule is the section's reason to exist and echoes the lesson thesis a third time.

### Mapping Postgres errors to codes

`lib/error-mapping.ts` maps raw driver error codes to the domain `Result` codes — `'23505'` → `'conflict'`, `'23503'` → `'forbidden'` (or the course's chosen FK mapping), `'40001'` → `'internal'` (serialization failure), unknown → `'internal'`. This is a pure lookup function, the ideal `it.each` target.

Teach table-driven testing with `it.each` in the object form (per L1's rule — object rows, readable `$`-interpolated names, inline literals never a generated array):

```
it.each([
  { pgCode: '23505', expected: 'conflict' },
  { pgCode: '23503', expected: 'forbidden' },
  { pgCode: '40001', expected: 'internal' },
  { pgCode: 'unknown', expected: 'internal' },
])('maps $pgCode to $expected', ({ pgCode, expected }) => {
  expect(mapDatabaseError({ code: pgCode })).toBe(expected);
});
```

Land: one row per *documented* mapping, plus an explicit row for the unknown → default fallback (the failure-of-the-mapper-itself case is part of the contract). Reference L1 for the `it.each` mechanics; the new content here is that the error mapper is the canonical thing to drive this way.

Flag the specific Postgres code → domain code values for fact-check against `lib/error-mapping.ts` conventions and the canonical code set — the exact FK/serialization mappings are the course's call, keep them consistent with the conventions' `Result` code enum.

Reasoning: error mappers are pure and exhaustive — the textbook `it.each` case — and they connect the unhappy-path theme to a real `/lib` file the chapter named in L1. It also models "the default branch is a behavior too."

### Asserting the `Error.cause` chain

When a `/lib` function catches a low-level error and re-throws a domain error with `new DomainError('…', { cause: original })` (the wrap-and-rethrow discipline from Ch008 and the conventions), the test verifies the chain is intact:

```
expect(() => fn(bad)).toThrow(InvoiceSyncError);
try {
  fn(bad);
} catch (err) {
  expect(err).toBeInstanceOf(InvoiceSyncError);
  expect(err.cause).toBeInstanceOf(NetworkError);
}
```

Land the **tautology trap** here, because it's where it bites: mocking a collaborator to throw and then asserting the unit re-threw *the same error* tests nothing — the mock and the assertion are the same statement. The test is only real when the *wrap behavior* is the subject: that the cause is preserved, or that the code was re-mapped (`NetworkError` → `Result.err({ code: 'internal' })`). Assert the transformation, not the pass-through.

Reasoning: `Error.cause` is how production keeps debug context (operator sees the full chain in logs per the conventions); a broken chain is a silent observability regression that only a test catches. The tautology warning belongs exactly here because cause-chain tests are where beginners write the emptiest tests.

### `not.toThrow` and `it.fails`

Two smaller tools, grouped because both are about *expressing the expected outcome precisely*.

`expect(() => fn(good)).not.toThrow()` — for the "doesn't throw, completes" path. Note it's weak on its own (asserts absence); pair it with a positive assertion on the return value or, in Ch088, a side effect.

`it.fails('known-broken behavior', …)` — inverts the verdict: green when the test fails. Use it to *document* a queued-for-fix regression without breaking CI, paired with a tracking issue. State the discipline plainly: `it.fails` committed without a tracking issue and a removal plan rots into a permanently-inverted test nobody trusts — remove it when the bug is fixed. Don't lean on it.

Reasoning: these round out the matcher vocabulary for the unhappy path. `it.fails` is genuinely useful but dangerous; the lesson names its one legitimate use and its failure mode so the student doesn't cargo-cult it.

### Auditing for the missing failure test

Close the lesson by turning the two-path rule into a review reflex, connecting to Ch086 L3's coverage discipline. A `/lib` file at 100% **line** coverage with no throw-branch test is a smell that *branch* coverage surfaces: the line that throws ran, but the assertion that it threw the right thing never existed. The audit question for every exported function: "is there an `it` for the documented failure?" Frame this as the senior's last pass before opening a PR.

Place the lesson's main understanding-check exercise here as the synthesis (details below). End with optional `ExternalResource` LinkCards to the Vitest `expect` / `toThrow` docs and the Zod error-handling docs.

Reasoning: the chapter's spine is "tests document contracts"; ending on the audit reflex makes the student the reviewer, which is the senior-mindset close the course wants.

## Exercises

Two exercises, placed in-flow, not bundled at the end.

1. **Live coding (`ScriptCoding`, `runner="sandpack"`)** — placed after "Matching Zod validation failures" or "Custom matchers" once the student has the toolkit. Task: given a small `/lib` function with both paths (e.g. a `parseQuantity` that returns `ok(n)` for a positive integer string and `err('validation', …)` otherwise, or a sync validator that *throws* `ValidationError`), the student writes the **failure test** in the `tests` pane. Grading via the shim's available matchers — design the function so the failure test uses `toThrow(ValidationError)` (sync throw variant) and/or `toEqual`/`.not.toThrow` and `toContain` on a `Result.err` object. Provide the function complete in `starter`; the student authors the assertions. The provided author-side `tests` verify the *student's* test would catch a planted bug. Keep matchers within the shim subset: `toBe`, `toEqual`, `toBeTruthy/Falsy`, `toBeCloseTo`, `toThrow`, `toContain`, `.not.*` — **no `toMatchObject`, no `rejects`** (shim limitation, see Scope). Instructions one paragraph; cap `maxHeight` ~360. Goal: muscle-memory for writing the second test and reaching for class/code over message.

2. **Understanding check (`Buckets`)** — placed in the audit section as synthesis. Two buckets: **Stable contract (assert this)** vs. **Incidental detail (don't couple to it)**. Items to sort: error class (`NotFoundError`), `error.code` value, exact message string, an i18n'd `userMessage`, the discriminator (`ok: false`), a stack-trace frame, `error.cause` *type*, a `traceId` field. This drills the lesson's single most important judgment — what is contract, what is wording — in a fast tactile form. Chapter precedent: L2/L3/L4 all used `Buckets` for classification, keep the chapter consistent.

Consider a small `TrueFalse` round only if space allows (the arrow-trap on `toThrow`, `toMatchObject` vs `toEqual`, "assert message strings" as false); optional, don't force a third exercise. No video — the topic is text-and-code, and no canonical short video fits the matcher-craft angle better than prose.

## Scope

Prerequisites to restate briefly, not re-teach:
- The `Result<T>` type and `ok`/`err` helpers — defined in Ch043; restate the shape in one line where first used. Do not re-derive the discriminated union.
- AAA, one-behavior-per-`it`, `it.each` object form, matcher-by-shape, `expect.extend` mechanics — taught in L1; reference, apply, don't re-teach the mechanics.
- The two-path rule — introduced Ch086 L4; restate as the organizing principle but credit the prior lesson.
- Async assertion plumbing (`await expect(p).rejects.toThrow`, the forgotten-await trap, `expect.assertions(n)`) — owned by L5. This lesson *uses* the async-error form when an example is async but does not teach the await mechanics; one-line callbacks to L5 only.
- Custom-error-class design (literal `name`, `Error.cause` wrap-and-rethrow) — Ch008 and the conventions own it; this lesson tests the result, doesn't teach how to author the classes.
- Zod schema definition and `safeParse` — Ch042 owns it; this lesson tests the `ZodError`, doesn't teach schema authoring.

Out of scope — defer explicitly so the writer doesn't reach:
- The full `Result` contract and the error-mapper *seam* design — Ch043 / Unit 16.
- Integration-level error testing (real DB serialization failures, MSW failure responses, RFC 9457 problem-detail bodies) — Ch088.
- Sentry / error capture in tests — Ch092.
- Error *rendering* in the UI (toasts, form field errors) — Unit 6, Unit 16.
- Snapshot testing for error response bodies / email templates — Ch088 / Ch089.
- Mutation testing as a coverage-of-coverage technique — out of scope for the course.

`ScriptCoding` shim limitation (load-bearing for exercise design): the in-page jest-flavored shim supports only `toBe`, `toEqual`, `toBeTruthy`, `toBeFalsy`, `toBeCloseTo`, `toThrow`, `toContain`, and `.not.*`. It has **no** `toMatchObject`, no `rejects`/`resolves`, no `expect.extend`, no `objectContaining`. The lesson teaches the real Vitest matchers in prose/`Code`/`CodeVariants` (those run in the project's actual `unit` suite, not in-page); the *interactive* exercise must stay inside the shim subset — assert `Result.err` via `toEqual` on the object literal and throws via `toThrow(Class)`. Note this divergence so downstream agents don't try to wire `toMatchObject` or `rejects` into the sandbox.
