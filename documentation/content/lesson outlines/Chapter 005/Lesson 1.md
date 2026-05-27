# Lesson 1 — Impossible states, unrepresentable

- **Title (h1):** Impossible states, unrepresentable
- **Sidebar label:** Impossible states

---

## Lesson framing

This is a **pattern archetype** lesson opening Chapter 005. It teaches one move: type a value as a **discriminated union** so the compiler refuses to let the impossible states be written down. The student already met the discriminated-union shape briefly in Chapter 004 Lesson 5 (the `Result<T>` seed with `ok: true / ok: false`), saw discriminant narrowing as one of the six forms in Chapter 004 Lesson 6, and learned `as const` for keeping inline discriminants literal in Chapter 004 Lesson 7. This lesson promotes that seed to a first-class structural pattern and names **Architectural Principle #7** — the recurring callback the rest of Chapter 005 (transitions in lesson 2, exhaustiveness in lesson 3, branding in lesson 4) operates under.

**Posture.** Decisions before syntax. The lesson opens with the production bug the pattern prevents (the `{ isLoading; data?; error? }` shape that compiles for impossible runtime values) and works back to the pattern. Every paragraph in the body is grounded in the same recurring example — the request-state value — so the student tracks one motion through the lesson, not four.

**Cognitive load plan.**
1. Bug first — the flag-set shape and the runtime crash six months later.
2. The combinatorial wedge — flag-set admits 16 combinations; the runtime produces 4. This is the visual hook (a 4×4 matrix highlighting the 4 legal cells of 16) that makes "make impossible states unrepresentable" mechanical, not philosophical.
3. The discriminated-union shape — definition, canonical request-state form, how the compiler tracks the discriminant.
4. Conventions — `status` / `kind` / `type` defaults with one-line triggers.
5. Four canonical SaaS variants — survey, each tied to the seam it owns.
6. Narrowing by the discriminant — the three forms (`if`, `switch`, equality in `.filter`/`.map`).
7. The shape rule — discriminant on every variant; per-variant fields belong inside the variant.
8. Exercises — refactor the bug, then sort scenarios.

**What this lesson does NOT do.**
- Does not re-teach the six narrowing forms (Chapter 004 Lesson 6 owns the surface). The discriminant form is recalled in one sentence.
- Does not teach state transitions or the functions that mutate the union — Lesson 2 of this chapter owns the machine.
- Does not teach `assertNever` or `satisfies never` — Lesson 3 of this chapter owns the compile-error guarantee. The `switch` example here ends with a comment indicating exhaustiveness is the next lesson's job.
- Does not brand the IDs inside variants — Lesson 4 of this chapter owns nominal typing. Use plain `string` for IDs in the code samples here.
- Does not parse from `unknown` at the wire — `z.discriminatedUnion` lives in Chapter 042 (Unit 5). Named in a one-line forward link only.
- Does not author reducers, Zustand, or TanStack Query state shapes past naming them as forward links.

**Recurring vocabulary.** "Discriminated union," "discriminant," "variant," "impossible state," "Architectural Principle #7" (named once), "structural enforcement" (the chapter's umbrella phrase from the chapter framing).

**Naming and form conventions** (all carried from Chapter 004 continuity notes):
- Arrow functions bound to `const` everywhere. Type predicates (Chapter 004 Lesson 6) are the only carve-out, and there are none in this lesson.
- Use the course-canonical `Result<T>` shape: `{ ok: true; data: T } | { ok: false; error: E }`. The boolean discriminant `ok` matches Chapter 004 Lesson 5 and the project's `lib/result.ts` (Code conventions §Error handling). Do NOT switch to `'ok' | 'err'` string discriminants; the course committed to `ok: boolean` for `Result`.
- Use `status` for the request-state union. This is the senior reach the chapter outline names.
- SCREAMING_SNAKE_CASE only for module-level typed-config constants; the example values in this lesson are local fixtures, so `camelCase`.

---

## Lesson sections

### Introduction (no h2 — prose lead-in)

Three short paragraphs, no preamble. Establish the scene without celebratory framing.

1. **The bug.** A function declares a request-state value as `type RequestState = { isLoading: boolean; data?: User; error?: Error }`. It compiles. It ships. Six months later a render path reads `state.data.name` on a value the runtime actually produced as `{ isLoading: true, error: someError }`. `state.data` is `undefined`. The page crashes. Show this in **one paired snippet** using `<CodeVariants>` with two tabs: **"The type"** (the `RequestState` declaration plus the consumer reading `state.data.name`), **"The runtime"** (the actual object that flowed in). No prose between the two — the reader sees the bug land.
2. **The wedge.** State the chapter's umbrella one-liner: *the compiler allowed every combination of those fields, including the ones the runtime never produces.* The fix is **structural** — make the impossible states unrepresentable.
3. **Architectural Principle #7.** Name it once, inline as a load-bearing sentence: **Model with discriminated unions so impossible states cannot be written down.** State that the rest of the chapter — transitions, exhaustiveness, branded identity — operates under this principle. The student should leave this lesson with the principle as the chapter's anchor.

Reasoning for the structure: bug → wedge → principle is the chapter outline's prescribed opening and matches the "decisions before syntax" filter. The principle gets named once and lives as a callback target for lessons 2, 3, and 4.

### The combinatorial mismatch

The wedge made visual. This section is the lesson's emotional payoff — the moment the student sees *why* the flag-set shape is wrong before they see what replaces it.

**Content.**
- The flag-set shape has 2 boolean fields (`isLoading`) and 2 optional fields (`data`, `error`). The combinations the type admits: 2 × 2 × 2 = **8** (or **16** if we treat `isLoading` × `data-present` × `error-present` × variant-flag, depending on how you tally — the chapter outline says 16; pick 16 to match it by counting both presence and value-of-loading independently). State the count plainly.
- The combinations the runtime ever produces: **4** — `idle`, `loading`, `success-with-data`, `error-with-error`.
- The cut: the discriminated-union shape admits exactly the 4. The other 12 simply cannot be written.

**Visualization.** A small inline matrix as a lesson-specific component at `src/components/lessons/005/1/RequestStateMatrix.astro`. The component renders a 4×4 grid (rows: `isLoading` true/false; columns: data present/absent crossed with error present/absent) with each cell either filled (legal under flag-set, but only some are runtime-legal) or marked impossible. Four cells get a green badge ("runtime-legal"), the remaining twelve a red strikethrough ("type-legal, runtime-illegal"). The component is presentational — pure HTML+CSS, no interactivity. Wrap in `<Figure>` with a caption: "The type admits 16 combinations; the runtime ever produces 4."

**Pedagogical goal of the visualization.** The matrix is the load-bearing visual aid of the lesson. The whole "make impossible states unrepresentable" line lands only when the student can see the gap between the type's combinatorial space and the runtime's narrow band. Numbers in prose don't carry it; the matrix does.

Close the section with one sentence: *the discriminated-union shape collapses the type's combinatorial space onto the runtime's.* This is the pivot to the next section.

### The discriminated-union shape

The shape itself, named and walked. The lesson's structural center.

**Content.**
- Definition: **a union of object types where every variant carries a literal-typed field — the discriminant — that names the variant.** Use a `<Term>` tooltip on **discriminant** the first time the word appears, reusing the Chapter 004 Lesson 5 definition verbatim: "Literal-typed field on every variant of a discriminated union identifying which variant a value is." Continuity note: Lesson 5 of Chapter 004 already set this `<Term>` text; match it.
- The canonical request-state shape, presented as a single `Code` block:
  ```ts
  type RequestState =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'success'; data: User }
    | { status: 'error'; error: Error };
  ```
- Walk one consumer that narrows by the discriminant — a render function with an `if (state.status === 'success')` block reading `state.data.name`. Inside that block, the compiler types `state` as the success variant; outside, `data` doesn't exist on the type. Use a `<CodeTooltips>` block (one fenced code, hover tooltips) over the consumer snippet — one tooltip on `state.status === 'success'` ("after this check, `state` is the success variant for the rest of the block"), one on `state.data` ("narrowed; reading `.data` here is type-safe").
- State the compile-time guarantee plainly: *reading `data` on a non-`success` variant fails at compile time, not at render time.*

**Why this section uses `CodeTooltips`.** The reader's attention needs to land on two surgical spots inside one short consumer — the discriminant check and the field read it unlocks. `AnnotatedCode` would be over-staged for a 6-line block; `CodeVariants` would invite a comparison the section doesn't need. `CodeTooltips` is the right reach for two inline tooltips on a single block.

### Conventions for the discriminant: status, kind, type

The senior defaults named once, with a sentence each on the trigger. Short section — this is a lookup, not a teaching moment.

**Content.**
- **`status`** — async/request lifecycle. Used in this lesson's running request-state example, and forward-linked to Server Action returns (Unit 5 / Chapter 043) and TanStack Query state (Unit 15 / Chapter 076).
- **`kind`** — general taxonomy when the variants aren't a lifecycle. The UI-variant example (button vs. link) uses `kind`.
- **`type`** — event messages. Matches the platform vocabulary the student has already seen on DOM events (`event.type` is `'click' | 'submit' | ...`) and Redux-shaped reducer actions. This is the discriminant the student will write in webhook handlers (Chapter 063).
- **String literals over numbers or booleans** — except for `Result<T>` where the course committed to the boolean `ok` discriminant (Code conventions §Error handling and §TypeScript). State the carve-out plainly: `Result<T>` uses `ok: boolean`; everywhere else, prefer string literals. Reasons: string-literal discriminants survive JSON serialization, read clearly in DevTools, and don't collide with truthy/falsy short-circuiting at the use site.

Render this as plain prose with three short paragraphs, one per discriminant choice. No code blocks needed here — the lesson's running example already shows `status` and the canonical-variants section that follows shows `type`, `kind`, and `ok`.

### Four canonical SaaS variants

Tour of the four shapes the chapter outline calls out. Each in a tight code block with a one-sentence framing on the seam it owns. The section is a survey — depth lives in the lessons each one forward-links to.

For each variant: short framing → fenced `Code` block → one-line forward link.

**Content.**
1. **Request state** — the async-lifecycle shape from the previous section. The `idle` variant earns its weight when the request is conditional on user input (a "Submit" button the user hasn't clicked yet); in fire-on-mount cases the union starts at `loading`. Forward link: TanStack Query (Chapter 076) and Server Action returns (Chapter 043).
2. **`Result<T>`** — the expected-failure return shape: `{ ok: true; data: T } | { ok: false; error: E }`. Use the course-canonical shape from Code conventions §Error handling, including the `data` field name (not `value`). Frame as: *a function that can fail predictably returns a `Result<T>` instead of throwing.* Forward link: Chapter 008 Lesson 1 (the two-channel rule — throw the unexpected, return the expected).
3. **Event message** — the shape every webhook handler, reducer, and queue consumer reads:
   ```ts
   type AppEvent =
     | { type: 'user.created'; userId: string }
     | { type: 'invoice.paid'; invoiceId: string; amount: number }
     | { type: 'subscription.canceled'; subscriptionId: string };
   ```
   IDs stay as plain `string` here — branding lands in Lesson 4 of this chapter. Forward link: webhook ingestion (Chapter 063) and the notification dispatcher (Chapter 070).
4. **UI variant** — the shape that lets a polymorphic component refuse invalid prop combinations at the call site:
   ```ts
   type ActionProps =
     | { kind: 'button'; onClick: () => void }
     | { kind: 'link'; href: string };
   ```
   Why this is load-bearing: a `Button-or-Link` component that accepted both `onClick` and `href` as optional fields would let the caller pass neither, or both. The discriminated shape forces exactly one. Forward link: components and composition (Chapter 022).

**Component choice.** Four sequential `Code` blocks, not `TabbedContent`. The student needs to read all four; tabs would hide three of them at any moment and make the survey feel like a choice. Plain stacked `Code` blocks with one-paragraph framing each let the reader scan top-to-bottom.

### Narrowing by the discriminant

The three forms the student will write. This is a **callback** section — Chapter 004 Lesson 6 owns the full narrowing surface; here we recall the discriminant form specifically because discriminated unions are its highest-leverage use.

**Content.** Three subsections (h3) or a single h2 with three numbered code blocks — pick the single-h2 single-flow shape because the three forms are variations on the same motion.

1. **`if` on the discriminant** — one branch handled, the rest pass through. Show:
   ```ts
   if (state.status === 'success') {
     console.log(state.data.name);
   }
   ```
2. **`switch` on the discriminant** — full handling, one branch per variant. Show the request-state `switch`:
   ```ts
   switch (state.status) {
     case 'idle':
       return null;
     case 'loading':
       return <Spinner />;
     case 'success':
       return <UserCard user={state.data} />;
     case 'error':
       return <ErrorMessage error={state.error} />;
   }
   ```
   **Important.** End this code block with a single inline comment marking what's coming next: `// (exhaustiveness next lesson — a missing variant should fail to compile)`. Do NOT teach `assertNever` here. Lesson 3 of this chapter owns it; mentioning the gap is enough.
3. **Equality on the discriminant inside a callback** — `.filter` and `.map` narrowing:
   ```ts
   const successes = states.filter((s) => s.status === 'success');
   //    ^? — narrowed to the success variant inside the predicate;
   //         but the result type stays the wider union unless we
   //         use a type predicate (Lesson 6 of Chapter 004 named the form).
   ```
   Be honest about the limit: `.filter` with an inline equality narrows **inside** the callback (so `s.data` is accessible there) but the **return type** stays the wider union. The fix (using a type predicate) was named in Chapter 004 Lesson 6 — recall in one sentence, don't re-teach.

**Code component.** Three sequential `Code` blocks. Each is small. The progression is conceptual (single branch → full handling → callback) — sequence beats tabs here.

**Cross-link.** Open the section with one sentence pointing back to Chapter 004 Lesson 6: "The narrowing surface from the previous chapter — `typeof`, `===`, `in`, `instanceof`, `Array.isArray`, discriminant equality — applies to every union. The discriminant form is the one this chapter's pattern leans on the hardest." No need to re-list all six.

### The shape rule

The structural rule, stated plainly. This is the section where the student leaves with a checklist they can apply to their own types.

**Content.** Three rules, each one paragraph.

1. **Every variant must carry the discriminant key with a literal value.** The discriminant is the structural enforcement — without it on every variant, the compiler can't narrow.
2. **Per-variant fields belong inside the variant where they're valid.** The `data` field lives on the `success` variant only; the `error` field lives on the `error` variant only. A field that genuinely exists on every variant (a `requestId` for tracing, for example) lives outside the discriminated structure — typically on a wrapping type, not on each variant. The senior reflex: model the variant-specific fields per-variant; only the truly invariant fields wrap.
3. **Keep discriminant literals literal.** This is the `as const` foreshadow. A factory that returns `{ status: 'loading' }` inlines the discriminant correctly because TypeScript infers the literal `'loading'` for string-literal returns. An array of states declared as `const STATES = [{ status: 'loading' }, { status: 'success', data: user }]` **widens** the discriminants to `string` unless `as const` is applied. Recall Chapter 004 Lesson 7 in one sentence — the depth lives there.

**Comparison cap.** Close this section with the flat-state anti-pattern shown one more time as a `<CodeVariants>` block, **"Flat shape"** vs **"Discriminated shape"**, using the running request-state example. The flat shape includes a comment noting 16 admitted combinations; the discriminated shape includes a comment noting 4. This is the lesson's recap visual — the student should leave with the side-by-side mental image.

### Exercise — refactor the flag-set shape

A `<TypeCoding>` exercise. The chapter outline suggested `script-coding`, but `TypeCoding` is the right reach because the exercise is about the *shape* (no runtime to verify) and `^?` queries can pin the narrowed types inside each branch.

**Setup.** Give the student a function with the flag-set shape and two `@ts-expect-error` directives marking the broken reads:

```ts
type RequestState = {
  isLoading: boolean;
  isSuccess: boolean;
  data?: User;
  error?: Error;
};

const handle = (state: RequestState): string => {
  if (state.isLoading) return 'loading…';
  // @ts-expect-error — error is optional, fix the type
  if (state.error) return state.error.message;
  // @ts-expect-error — data is optional, fix the type
  return state.data.name;
};
```

**Task.** Rewrite `RequestState` as a discriminated union on `status` with variants `'loading'`, `'success'`, `'error'`. The body of `handle` should stay the same except for renaming `isLoading` → `status === 'loading'` and the same for `error`. The `@ts-expect-error` directives should keep firing until the type is right, then the directives themselves error ("Unused '@ts-expect-error' directive") — and the student fixes by removing the directives. Standard `TypeCoding` polarity.

**Criteria.** Two `expectedQueries`:
- A `^?` query inside the `if (state.status === 'error')` block, expecting `Error` for `state.error`.
- A `^?` query inside the `if (state.status === 'success')` block, expecting `User` for `state.data`.

**Instructions text.** "Rewrite `RequestState` as a discriminated union on `status`. The `@ts-expect-error` directives mark where the flag-set shape misbehaves — your fix should remove the need for both."

**Why TypeCoding over ScriptCoding.** The exercise tests the *shape*; running it would add a `User` mock and an assertion harness that distracts from the type-level goal. `TypeCoding` keeps the focus on what the compiler sees.

### Exercise — discriminated union or plain shape

The chapter outline calls for a `<Buckets>` exercise with eight scenarios sorted into "discriminated union" vs "plain shape." This is the lesson's recall test — does the student recognize when the pattern applies?

**Buckets:**
- `union` — "Discriminated union"
- `shape` — "Plain shape"

**Items (eight, mixed):**
1. `union` — "An async fetch lifecycle (idle, loading, success, error)"
2. `union` — "A function that can fail in known ways and returns its outcome"
3. `union` — "A webhook payload that arrives as one of N event types"
4. `union` — "A button-or-link component that takes `onClick` *or* `href`, never both"
5. `union` — "A form field that's text, number, or a select with options"
6. `shape` — "A feature flag's on/off state (just a boolean)"
7. `union` — "A polymorphic toast notification (info, success, warning, error)"
8. `shape` — "A user's display-name preference (a single string)"

**Layout.** Two-column (`twoCol`). Standard `Buckets` chip order — the runtime shuffles. Subtle items are #6 (feature flag is *a single boolean*, no variants to model) and #8 (a single string preference — no discrimination needed). The trap items #1, #5, #7 reinforce the chapter's UI-variant and event-message archetypes.

### External resources

A short LinkCard / `<ExternalResource>` cluster at the lesson's tail. Three cards is the chapter's default cadence (Chapter 004 Lessons 6 and 7 settled at 3; lessons 4, 5, 8 went to 4). Pick 3:

1. **TypeScript Handbook — Discriminated unions** ([typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions)) — the authoritative reference.
2. **Total TypeScript — Discriminated unions** (Matt Pocock) — the senior treatment of the pattern, including the canonical anti-patterns.
3. **A blog post or article from the last 12 months on modeling SaaS state with discriminated unions** — pick a recent piece that frames the pattern at the design level (search for 2025–2026 articles before locking in a URL).

The third card should be verified online at write time. If nothing recent passes the bar, fall back to a fourth bucket: the **Zod 4 `discriminatedUnion` docs** — the wire-boundary application of the same pattern, served as the forward link to Chapter 042.

---

## Scope

### What this lesson includes

- The discriminated-union shape: union of object variants, each carrying a literal-typed discriminant.
- Architectural Principle #7, named once.
- The four canonical SaaS variants: request state, `Result<T>`, event message, UI variant.
- The three discriminant naming conventions: `status`, `kind`, `type` — with the `Result<T>` boolean-discriminant carve-out called out explicitly.
- Three narrowing forms: `if`, `switch` (without exhaustiveness — next lesson), equality inside `.filter` / `.map` callbacks.
- The shape rule: discriminant on every variant; per-variant fields inside each variant; discriminant literals stay literal via `as const` (named, not taught).
- The flat-state anti-pattern contrasted with the discriminated shape via `<CodeVariants>`.

### What this lesson does NOT include

- **State transitions and machines** — Lesson 2 of this chapter owns this. The `switch` example here is a render-side dispatch, not a transition. Do not show transition functions.
- **Exhaustiveness enforcement with `assertNever` or `satisfies never`** — Lesson 3 of this chapter owns this. The lesson's `switch` example ends with a comment marking the gap, nothing more.
- **Type predicates and assertion functions** — Lesson 3 of this chapter owns the depth. Chapter 004 Lesson 6 named them; this lesson recalls the form in one sentence inside the `.filter` callback section, no more.
- **Branded IDs** — Lesson 4 of this chapter owns nominal typing. All IDs in this lesson's code samples stay as plain `string`. Do not anticipate `UserId` / `OrgId`.
- **`typeof V`, `keyof T`, `T[K]` operators** — Lesson 5 of this chapter owns the derivation operators. The `as const` foreshadow in §The shape rule should mention "the depth comes later in the chapter," not derive anything.
- **Utility types** (`Partial`, `Pick`, `Omit`, etc.) — Lesson 6 of this chapter owns these. Do not use any of them on the variants.
- **Generics with constraints** — Lesson 7 of this chapter owns. `Result<T>` is shown as `Result<T>` with `T` as a parameter, but the generic mechanics are not explained — the student should read it as a placeholder for "any type."
- **`z.discriminatedUnion` and Zod schemas** — Chapter 042 (Unit 5). One-line forward link only, no Zod code samples.
- **Reducer authoring, `useReducer`, Zustand patterns** — Unit 3 / 4 / 15. The event-message variant names "the shape every reducer reads" without showing reducer code.
- **Cross-realm `instanceof` gotchas, `unknown`-in-catch narrowing** — Chapter 008 Lesson 2.

### Prerequisites — concise refreshers only

- **Discriminated unions seed** (Chapter 004 Lesson 5) — one sentence: the `Result<T>` shape from the previous chapter was the seed; this lesson promotes the pattern.
- **Narrowing surface** (Chapter 004 Lesson 6) — one sentence pointer to the six forms; the discriminant form is the one this lesson uses.
- **`as const` for inline literals** (Chapter 004 Lesson 7) — one sentence: discriminant literals widen unless frozen at the literal site; the mechanics are last chapter's.
- **`Result<T>` canonical shape** (Code conventions §Error handling) — use `{ ok: true; data: T } | { ok: false; error: E }` verbatim. Do not invent a different shape.

---

## Components and diagrams at a glance

| Section | Component | Purpose |
| --- | --- | --- |
| Introduction | `<CodeVariants>` (2 tabs: "The type", "The runtime") | The bug as a paired snippet — type allows, runtime crashes. |
| Combinatorial mismatch | `<Figure>` wrapping a lesson-specific `<RequestStateMatrix>` (HTML+CSS, 4×4 grid) | Visual wedge — 16 type-legal vs 4 runtime-legal cells. |
| The discriminated-union shape | `<Code>` + `<CodeTooltips>` on consumer block | Two surgical tooltips on the discriminant check and the field read it unlocks. |
| Conventions | Plain prose, no code | Survey by name, three short paragraphs. |
| Four canonical SaaS variants | Four stacked `<Code>` blocks | Top-to-bottom survey; tabs would hide. |
| Narrowing by the discriminant | Three sequential `<Code>` blocks | Sequence of forms, not alternatives. |
| The shape rule | Three prose paragraphs + closing `<CodeVariants>` (2 tabs: "Flat shape", "Discriminated shape") | Recap visual. |
| Exercise — refactor | `<TypeCoding>` with two `expectedQueries` | Shape-level practice, no runtime distraction. |
| Exercise — recognition | `<Buckets>` (8 items, 2 columns, `twoCol`) | Recall test — does the student recognize the pattern? |
| External resources | 3 × `<ExternalResource>` cards | TS Handbook, Total TypeScript, one recent SaaS-applied piece. |

## `<Term>` tooltips to include

- **discriminant** — at first use. Reuse Chapter 004 Lesson 5's text: "Literal-typed field on every variant of a discriminated union identifying which variant a value is."
- **discriminated union** — at first use. Suggested text: "A union type whose variants are object types each carrying a literal-typed discriminant the compiler narrows on."
- **impossible state** — at first use. Suggested text: "A combination of fields the type allows but the runtime never produces."
- **variant** — at first use. Suggested text: "One of the object types making up a discriminated union."

Keep the tooltip count to four — every additional `<Term>` past the load-bearing ones turns the lesson into a glossary.

## Lesson-specific component to build

**`src/components/lessons/005/1/RequestStateMatrix.astro`** — purely presentational HTML+CSS grid.

- 4×4 grid (16 cells). Rows: `isLoading: true` / `isLoading: false`. Columns crossed: `data present` × `error present` (four column combinations: neither, data only, error only, both).
- Each cell labeled with the combination. Runtime-legal cells (`{isLoading: true, neither}` = loading; `{isLoading: false, data only}` = success; `{isLoading: false, error only}` = error; `{isLoading: false, neither}` = idle) styled with a green check badge. The remaining 12 cells styled with a red strikethrough and a small "impossible" tag.
- No interactivity. No props (the matrix is fixed for the lesson's running example).
- Wrap in `<Figure>` with caption: "Flag-set shape: 16 cells admitted, 4 runtime-legal."

Pedagogical goal: this is the lesson's only diagram and it carries the whole "make the impossible unrepresentable" line. If the student remembers one image from this lesson, it should be this matrix.
