# Lesson 6 outline

- **Title (h1):** Narrow, don't assert
- **Sidebar label:** Narrowing and assertions

## Lesson framing

This lesson installs the control-flow narrowing surface as the senior default for reading union-typed values, and reframes `as` / `!` as conditional escape hatches with three legitimate triggers. It's the **payoff lesson** for the shape-union landmine planted at the end of lesson 5; the student leaves the chapter able to read any union without widening it or asserting past it.

Core pedagogical decisions:

- **Anchor on a single recurring bug.** A `(value as User).email` lie that ships and crashes six months later. Every section traces back to it. The student should finish the lesson refusing to write the assertion when narrowing is available.
- **One narrowing form per code block.** The narrowing surface has six members; each gets a short snippet with the trigger that earns it stated up front. Concept archetype, walked terse and dense — the student already knows what a union is from lesson 5 and has seen `typeof` and `in` in passing.
- **Cognitive load.** Start with mixed-primitive `typeof` (simplest, already seen), then equality on literal unions (the bridge to discriminated unions), then `in` / `instanceof` / `Array.isArray` (shape and class branches), then `switch` on a discriminant (recap of lesson 5's seed, soft forward link to chapter 005 lesson 1), then custom predicates (named lightly — chapter 005 lesson 3 owns depth).
- **The scope rule lands before the `as` triggers.** A narrow holds inside the block where the check fired and is invalidated by reassignment. Without this, the `array.find(...)!` example loses its force, and the closure trap reads as a footnote rather than the senior watch-out.
- **`as` and `!` get exactly three triggers.** Not "use sparingly" — three named cases. Anything outside the three triggers is a refactor signal. The student should leave with a checklist.
- **`as` lies at runtime.** A type assertion has no runtime effect; the parsed value is unchanged. This is the load-bearing intuition that separates a senior from a beginner reach. Reinforce twice — once with the opening bug, once at the closing rule.
- **No `assertNever` or assertion functions in this lesson.** Both are reserved for chapter 005 lesson 3. The lesson references them in one line as a forward link when `switch` on the discriminant lands.
- **Mental model the student leaves with.** "Runtime checks the language tracks" is the cognitive frame. Narrowing means the compiler reads a runtime check and propagates the resulting type into the block; assertion means the compiler trusts the developer without a runtime witness. The first is sound, the second is conditional.

Reuse and continuity:

- Recovers the shape-union landmine from lesson 5 (`'email' in value` was the right answer there; this lesson names every other narrowing form alongside it).
- Recovers the `r.status === 'loading'` motion from the discriminated-union seed in lesson 5; equality narrowing names the mechanism.
- Recovers `noUncheckedIndexedAccess` from lesson 4 — the `array.find(...)` `!` example sits in the same posture as the open-keyed `Record` read.
- Refers back to `unknown` from lesson 1 as the "narrow before use" archetype; the lesson does not re-teach `unknown` but uses it in one snippet as the trigger for `instanceof`.
- Refers back to lesson 2's `?` vs `| undefined` distinction when nullable narrowing lands.
- Forward links: `as const` for inline-literal discriminants (lesson 7), assertion functions and `assertNever` (chapter 005 lesson 3), `unknown` narrowing in `catch` blocks (chapter 008 lesson 2), Zod boundary parse (chapter 009 lesson 1), `instanceof` cross-realm gotcha (chapter 008 lesson 2).

## Lesson sections

### Introduction (no header)

Open with the recurring bug. Two short paragraphs and one snippet:

```ts
const getEmail = (value: User | Guest): string => {
  return (value as User).email;
};
```

The cast tells the compiler "trust me, this is a `User`"; the runtime value is unchanged. Six months later a `Guest` flows through; `value.email` is `undefined`; the line three steps downstream crashes. The compiler never knew anything was wrong because the assertion silenced it.

Then state the lesson: TypeScript tracks **runtime checks** it can prove. The senior reflex is to write the check and let the compiler narrow; the assertion is a conditional escape hatch with three named triggers, not a default.

One forward sentence: every form lesson 5 hinted at (`typeof`, `in`, the `===` on a discriminant) is a narrowing form, and this lesson names the full surface plus the three sites assertions are still legitimate.

### How TypeScript tracks runtime checks

One short prose section installing the mental model before any code.

Define <Term>control-flow narrowing</Term>: as TypeScript reads the body of a function, it tracks how runtime conditions refine a value's type along each branch. Inside `if (typeof x === 'number')`, the compiler knows `x` is `number` in the consequent and "not number" in the alternative. The check exists at runtime; the type refinement exists at compile time; the language is the bridge.

State the rule that powers the rest of the lesson:

> **Narrow with a runtime check the language tracks; never assert past a union without one of the three named triggers.**

One small visual: a two-state contrast. The lesson body proper carries this through code blocks; no separate diagram needed here — a `<TabbedContent>` or `<Figure>` would be overkill for the framing. Defer visual reinforcement to the `Buckets` exercise at the end.

Tooltip targets in this section: `control-flow narrowing` (the definition above).

### The narrowing surface

The dense section of the lesson. Walk six forms in `<CodeVariants>` tabs. Each variant: one short snippet, the trigger that earns the form, the resulting narrowed type stated in one phrase. No deep digressions; the goal is for the student to leave with the surface memorized.

The six tabs in order (chosen for cognitive load — primitive first, shape last, custom predicate as the soft forward link):

1. **`typeof` — mixed-primitive unions.** Snippet: `string | number` parameter, `typeof amount === 'number'` narrows to `number`. The seven `typeof` results from chapter 001 are the trigger surface; literal-union narrowing on a string-typed primitive is the next form.

2. **Equality on a literal union.** Snippet: `status: 'draft' | 'sent' | 'paid'`, `if (status === 'draft')` narrows to the single literal. State that this is the same mechanism that powers discriminated unions (seeded last lesson) — the discriminant is just a literal-typed field on every variant.

3. **`in` — shape unions without a discriminant.** Snippet: `User | Guest`, `if ('email' in value)` narrows to `User`. Reference the lesson 5 example explicitly — this is the form lesson 5 used as the right answer; the trigger is named here.

4. **`instanceof` — class branches.** Snippet: `try`/`catch` with `unknown` (one-line note that `catch` clause bindings are `unknown` by default; chapter 008 lesson 2 owns the depth), `if (error instanceof ValidationError)` narrows. State the trigger: prototype chains the language can read. One-line note on the cross-realm gotcha (`instanceof` fails across iframe/worker boundaries; chapter 008 lesson 2 explains why) so the student isn't surprised when it bites.

5. **`Array.isArray` — `T | T[]` unions.** Snippet: a parameter that accepts either a single `string` or `string[]`, normalised with `Array.isArray`. The trigger: `typeof` reports both as `'object'`, so the generic narrowing form needs a dedicated check.

6. **`switch` on a discriminant.** Snippet: the discriminated `FetchResult<T>` from lesson 5 — `switch (r.status)` with three cases. State that the `default` branch is where the exhaustiveness check (chapter 005 lesson 3) lives; this lesson stops at "every case narrows correctly." One-line forward link to `assertNever`.

**Custom type predicates** get a small `<Aside note>` immediately after the `<CodeVariants>` rather than a seventh tab — they're a senior reach, not a default, and the depth lives in chapter 005 lesson 3.

```ts
function isUser(value: unknown): value is User {
  return typeof value === 'object' && value !== null && 'email' in value;
}
```

State the trigger: a check too complex to inline at every use site, or a check that needs to be reused across modules. State the watch-out: the predicate is **only as honest as its body** — if `isUser` returns `true` on a value that isn't a `User`, the type system has no defence. Chapter 005 lesson 3 covers the depth (including the assertion-function form); this lesson plants the shape.

Component choice rationale: `<CodeVariants>` over `<AnnotatedCode>` because each tab is a distinct mechanism with its own snippet, not steps on one shared block. `<Tabs>` is the wrong choice (no fenced-code affordance); `<CodeVariants>` is purpose-built.

Tooltip targets: `discriminant` (recover from lesson 5 — one-line refresher), `type predicate` (the `value is User` syntax).

### The narrowing scope rule

A short section between the surface and the assertion-trigger half. State and demonstrate the scope rule:

> **A narrow holds inside the block where the check fired and is invalidated by any assignment that could change the type.**

One snippet showing the closure trap — narrow `value` to a `User` inside an `if`, capture it in a callback, reassign `value` between the check and the callback firing; the callback sees the reassigned type, not the narrowed one. The senior reflex: bind the narrowed value to a `const` inside the block.

```ts
const handle = (value: User | Guest) => {
  if ('email' in value) {
    const user = value; // const captures the narrow
    queueMicrotask(() => sendEmail(user.email));
  }
};
```

Component: a single `<Code>` block. The point is the one-line `const user = value` move; an `<AnnotatedCode>` would over-explain a senior reflex the student should internalize.

Watch-out aside (`<Aside type="note">`): under `strict`, TypeScript also widens a narrow when a function call sits between the check and the read — the compiler can't prove the function didn't reassign the value. The fix is the same `const` capture.

### The three legitimate triggers for `as`

The other half of the lesson. State the posture up front: `as` is not "use sparingly" — it has three named triggers, and anything outside them is a refactor signal. Walk each trigger with one short snippet.

Use `<AnnotatedCode>` for this section. The shared block is a short module containing one occurrence of each trigger; each step highlights one trigger and explains why the assertion is acceptable there. Rationale: the lesson is reading **a single file** with three carefully-placed assertions, recognising each — the student's eye should move across one shared piece of code rather than between three separate snippets.

The three triggers and their highlights:

1. **Boundary parse-then-trust.** A Zod (or similar) parser validates an `unknown` and returns a typed value. The assertion is implicit in the parser's return type — **the user code does not write `as`**. State this so the student understands where the type information comes from; named here so when chapter 009 lesson 1 lands the mental model is already installed.

2. **TypeScript can't see what you can prove.** A `Map` lookup followed by an immediate use where the key was just inserted. The compiler can't track the through-`Map` flow; the assertion encodes a proof the developer can make and the type system can't. Step's prose names the senior question: "would a refactor remove the need?" — usually yes.

3. **The DOM and third-party type gaps.** `document.querySelector('button') as HTMLButtonElement`. The DOM API returns `Element | null`; the call site knows the selector matches a button. Acceptable for tightly-scoped cases. State the senior alternative one line: `instanceof HTMLButtonElement` if the value flows further.

After the `<AnnotatedCode>`, two short watch-outs as adjacent prose paragraphs (no aside boxes — these are part of the lesson body, not asides):

- **`as unknown as T` is a smell.** Always means the type system is being silenced. Sometimes it's the right call (test fixtures, a third-party boundary with no honest types); usually it's a refactor signal. One sentence.
- **Type assertions don't validate at runtime.** Restate the opening bug. `value as User` compiles; the runtime value is unchanged; the next line that touches a `User`-only field on a `Guest` crashes. The fix is to narrow, not to assert.

### `!` is `as` with a narrower trigger

A short section pairing the non-null assertion with the same posture as `as`. The most common legitimate use named: `array.find(...)!` when the caller has just proved the element exists via a prior check the type system can't track.

```ts
const ids = ['a', 'b', 'c'];
const target = ids.find((id) => id === 'b')!; // legitimate
```

State the senior alternative explicitly: `ids.find(...) ?? throwError('expected b')`. The `!` saves a line; the alternative is more honest and gives the production error a name. Pick the `??-throw` form when the failure is observable in production; pick `!` when the call site is a test fixture or a one-shot script and the prior check is local.

Mention briefly the linked case from lesson 4: under `noUncheckedIndexedAccess`, `arr[0]` is `T | undefined`. The same posture applies — narrow with `if (arr.length > 0)` and capture, or accept the `| undefined` and handle the miss explicitly. The `!` shortcut is acceptable in the same three triggers as `as`.

Component: a single `<Code>` block. No comparison needed — the trigger is named in prose, and the alternative is a one-line variant.

### Narrowing across `null` and `undefined`

A small section recovering `?` vs `| undefined` from lesson 2 in narrowing form, so the student finishes the chapter with the nullable case wired in.

Three short snippets in a `<CodeVariants>`:

1. **Truthy check.** `if (user)` narrows `User | null` to `User` (truthy on object, falsy on `null`). State the gotcha: truthy also excludes `0`, `''`, `false` — on `string | number | null | undefined` a truthy check is wrong. Use `!= null` (the rare legitimate `==` use — covered in chapter 002 lesson 5; reference in one line) or `!== null && !== undefined` for the narrow case.

2. **`?? `nullish coalescing.** Not a narrow per se but the senior reach when the goal is to provide a default and continue. `const name = user?.name ?? 'guest'` resolves the nullable in one expression.

3. **Optional chaining gotcha.** `user?.email` returns `string | undefined`. The chain doesn't narrow `user` for subsequent reads — it short-circuits at runtime. Senior reflex: narrow once at the top of the block (`if (!user) return ...`) and read directly afterwards.

Component: `<CodeVariants>` — three forms of the same nullable case is the canonical comparison shape.

### Practice: rewrite an assertion-heavy function

A `<TypeCoding>` exercise that asks the student to refactor a small function with two `as` assertions into the same function with no assertions. Starter is a function on `User | Guest` that reads `.email` (assert-User) and a return value that's `as 'admin' | 'member'` from a `Map<string, string>` lookup. The target: two narrowing forms (`in` and a Map-lookup that returns the literal-typed value directly via `Record<LiteralUnion, V>` from lesson 4).

Exercise spec:

- **Starter:** A 12-line function with two `as` casts marked with comments naming the smell. Includes a `User | Guest` parameter and a role-lookup `Record<'admin' | 'member', string>`.
- **Criteria:** Zero `as` occurrences in the final code (validated via `expectedErrors` flagging a banned pattern — alternative: rely on the "fix all errors" implicit criterion plus a `^?` query on the narrowed type inside each branch). Two `^?` queries: one inside the `if ('email' in value)` branch expecting `User`, one on the role variable expecting the literal-union narrow.
- **Goal phrasing for the student:** "Remove both `as` assertions. The two `@ts-expect-error` directives at the bottom of the file must trigger (proving the access-without-narrowing reads still fail); the two `^?` queries inside the narrowed blocks must resolve to the expected narrowed types."

Component: `<TypeCoding>`. Pure type-level — no runtime needed.

### Sort each scenario: narrow or assert?

Closing `<Buckets>` exercise to lock in the chapter's posture: every union read either has a narrowing form available, or sits at one of three named assertion triggers.

Two-column layout. Eight items, two buckets:

- **Bucket A: "Narrow with a runtime check."**
- **Bucket B: "Assertion is acceptable here."**

Items (mix of narrowing-clear and assertion-trigger items, with one or two subtle ones):

1. A `string | number` parameter → A (`typeof`)
2. A `User | Guest` with an `email`-only field on `User` → A (`in`)
3. A `FetchResult<T>` discriminated on `status` → A (`switch` / equality)
4. A value `parsed = userSchema.parse(payload)` where `payload` was `unknown` → B (the assertion is inside the parser; no user `as`)
5. A `document.querySelector('button')` result in a tightly-scoped one-shot → B (DOM gap)
6. An `error` in a `catch (error)` block → A (`instanceof`)
7. A `Map<string, User>` lookup immediately after `map.set(id, user)` → B (proof TS can't see)
8. A `User | null` from a database lookup before reading `.email` → A (`!== null`)

Rationale: this exercise is the canonical posture test for the lesson. The student finishes the lesson able to look at any union and reach for the right tool. Pair with the closing rule of the lesson (one-line repeated from the introduction): **narrow with the language; reach for `as` only at the boundary, the proof gap, or the DOM seam.**

### External resources

Three `<ExternalResource>` cards in a `<CardGrid>`. Pick from:

- TypeScript Handbook on **narrowing** (canonical reference for the surface).
- Matt Pocock or Total TypeScript content on **type predicates** or **`as` smell** (a senior-voice reinforcement of the posture).
- A short writeup on **the cross-realm `instanceof` gotcha** if one is available — otherwise an MDN reference on `instanceof`.

Optionally one `<VideoCallout>` if a short Andrew Burgess / Matt Pocock / Web Dev Simplified video exists on "stop using `as` in TypeScript" or "TypeScript narrowing" under ~6 minutes. The continuity notes show every prior chapter 004 lesson has used a `VideoCallout`; this lesson should match — pick a video on the narrowing surface, not on assertions, so the reinforcement is on the senior default rather than the escape hatch.

### Tooltip terms list

Strategic `<Term>` tooltips, used inline once each at first mention:

- **control-flow narrowing** — the section opening defines it.
- **type predicate** — at the `value is User` snippet.
- **discriminant** — short refresher of lesson 5's definition at the `switch` form.
- **truthy check** — at the nullable section, since the gotcha depends on the student remembering what counts as falsy.
- **assertion (type assertion)** — at the `as` section opener; clarifies the runtime no-op.

Reuse lesson 5's `Term` text verbatim for `discriminant` to keep terminology consistent.

## Scope

What this lesson **does not** cover (deferred to named locations):

- **`assertNever` and the exhaustiveness check.** Mentioned in one line at the `switch` form; full pattern at chapter 005 lesson 3.
- **Assertion functions (`asserts value is T`).** Mentioned in one line beside type predicates; full surface at chapter 005 lesson 3.
- **`satisfies` and `as const`.** Reserved for lesson 7; this lesson does not touch them.
- **`unknown` narrowing depth in `catch` blocks.** The `instanceof` tab uses `unknown` from a `catch` binding without re-teaching `unknown`; depth at chapter 008 lesson 2.
- **The cross-realm `instanceof` gotcha at depth.** One line forward link.
- **Zod / runtime validators.** Named once as the source of "boundary parse-then-trust" trigger; full Zod story at chapter 009 lesson 1.
- **Biome rules around `as` and `!` (`noNonNullAssertion`, similar).** Named lightly if at all; the linter story lives at chapter 024 lesson 5.
- **Generic type narrowing and `infer`.** Out of scope; library-author territory.
- **User-defined assertion via `asserts`.** Single line forward link only.
- **Discriminated-union depth.** Lesson 5 seeded; chapter 005 lesson 1 owns the full surface. This lesson uses the `FetchResult<T>` from lesson 5 as a known shape and does not re-teach it.

Prerequisites the lesson **assumes** the student has from earlier lessons (single-sentence redefinitions are acceptable if absolutely needed):

- Union and intersection composition (lesson 5).
- Literal unions for finite domains (lesson 1).
- The shape-union access rule (lesson 5).
- `unknown` as the sound top (lesson 1) — one line at the `instanceof` form.
- `?` vs `| undefined` (lesson 2) — one line at the nullable section.
- The `noUncheckedIndexedAccess` posture (lesson 4) — one line at the `!` section.
- `typeof` returns from chapter 001 — assumed without re-teaching.
- Strict null checks on by default (chapter 003 / chapter 024 lesson 5) — assumed.

## Code conventions alignment notes

- Arrow functions bound to `const` for every example except type predicates (which require the `function` form to carry the `value is T` signature — explicitly carved out by the code conventions for type-guard signatures).
- `type` aliases everywhere; no `interface`.
- `Result`-shaped discriminant: `ok: true` / `ok: false` (continuity-notes canonical from lesson 5).
- Naming: domain-tied (`user`, `value`, `error`, `status`, `role`), never `foo` / `bar`.
- Single quotes for strings.
- Use `<Code>` for plain blocks; `<CodeVariants>` for parallel forms of the same mechanism; `<AnnotatedCode>` once, on the three-trigger `as` walk where one shared file is the lesson and the steps focus attention on three separate locations.
- No comments in code except where a comment carries information the surrounding prose doesn't (the `^?` query markers in the `<TypeCoding>` starter, and the one-line "smell" markers in the assertion examples).
