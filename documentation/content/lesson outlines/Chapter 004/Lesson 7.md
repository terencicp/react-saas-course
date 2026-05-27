# Lesson 7 outline

- **Title (h1):** Keeping literals narrow with `as const` and `satisfies`
- **Sidebar label:** `as const` and `satisfies`

## Lesson framing

This lesson installs the two operators that let a typed-config object keep its literal types: `as const` (the value-site freeze) and `satisfies` (the contract check that doesn't widen). It's the **payoff lesson** for the property-widening problem named in lesson 1 (`const config = { status: 'draft' }` infers `{ status: string }`, not `{ status: 'draft' }`) and the missing tool every prior lesson has linked forward to — discriminant literals (lesson 5), typed-key routes (lesson 4), tuple literals (lesson 3), per-field readonly (lesson 2). The student leaves the lesson reaching for `as const satisfies T` as the senior default for any config map whose keys and values both carry meaning.

Core pedagogical decisions:

- **Anchor on the `ROUTES` widening surprise.** A familiar shape — a route map — that quietly loses the literal types it should preserve. The bug is silent: the code compiles, autocomplete looks fine, but `keyof typeof ROUTES` works while `(typeof ROUTES)[keyof typeof ROUTES]` widens to `string`, and `as const` is the fix. Every section traces back to the same `ROUTES` example so the student tracks a single value through three forms.
- **Three forms, one canonical contrast.** Annotation (`: T`), `as const`, and `satisfies T` — three operators with overlapping outcomes and one correct pairing for typed config. Walk the three side by side, then the combined idiom. Cognitive load: never compare more than two forms in one snippet; the contrast table at the end is the consolidation.
- **`as const` before `satisfies`.** The student needs the value-site freeze installed first, because `satisfies` is best understood as "the contract check that preserves what `as const` froze." Reverse order (`satisfies` first) leaves the student wondering why `satisfies` matters when an annotation also catches missing fields — the answer requires the literal type to already be at stake.
- **Three behaviors of `as const` named separately.** String literals stay literal, object properties become `readonly`, arrays become `readonly` tuples of literals. Each behavior unlocks a different downstream pattern: literal strings unlock `keyof typeof` / `typeof X[keyof typeof X]` derivations, readonly properties prevent mutation through the typed config, and tuple-of-literals is the inline form the student saw in lesson 3 (`[1, 2, 3] as const`).
- **The `satisfies` payoff is "validation without widening."** The bug `satisfies` fixes: the student writes `const ROUTES: Record<string, string> = { ... }` to get a contract, but the annotation widens every value back to `string` and the literal types are gone. State this contrast in two adjacent snippets — annotation widens, `satisfies` doesn't — so the student leaves with the mechanism, not just the syntax.
- **The combined idiom `as const satisfies T` is the senior reach.** Lock literal types first (`as const`), validate against the contract second (`satisfies T`). The order matters — the inferred type after `as const` is what `satisfies` checks. Show one full worked example (a permissions table keyed by `Role` with arrays of `Permission` literals) and the type derivations it unlocks.
- **Forward links land softly.** Drizzle schema definitions (Unit 5), Next.js route segment configs (Unit 4), feature-flag and permission tables (Unit 7) all use this idiom. Name them in one sentence so the student recognises the shape when it returns.
- **Mental model the student leaves with.** "An annotation applies a type to the value. `as const` freezes the value's inferred type. `satisfies` checks the value against a type without applying it." Three operators, three jobs, one composition. Once the three jobs are distinct in the student's head, the choice between them is mechanical.

Reuse and continuity:

- Recovers the **property widening** problem from lesson 1 (`{ status: 'draft' }` infers `{ status: string }`) as the opening bug; lesson 1 named the fix as "covered in lesson 7" and this is where it lands.
- Recovers the **inline `as const` on a tuple literal** form from lesson 3 (`[1, 2, 3] as const` → `readonly [1, 2, 3]`); lesson 3 recognised the shape but did not explain it.
- Recovers the **discriminant must stay literal** rule from lesson 5 — `{ status: 'loading' }` widens to `string` without `as const`, and the discriminated union breaks. Use this as the second site `as const` earns its weight.
- Recovers the **`readonly` field modifier** from lesson 2 — `as const` is the shorthand that produces `readonly` on every property, without typing each one.
- Recovers the **literal-union completeness check** from lesson 4 — `Record<Role, Permission[]>` is exactly the contract shape the combined idiom validates against.
- Refers back to lesson 6's posture on `as`: the unfortunate name collision (`as const` vs `as Type`) is real. State once that `as const` is a different operator from the type assertion `as T` — same keyword, different semantics. `as const` is a sound freeze; `as T` is a conditional escape hatch.
- Forward links: `as const` outputs feeding mapped types and conditional types (chapter 005 lesson 6 and 7); `const` type parameters on generics (chapter 005 lesson 7); Drizzle `$inferSelect` / `$inferInsert` shapes (Unit 5); Next.js route segment configs (Unit 4); feature-flag and RBAC permission tables (Unit 7); `isolatedDeclarations` and the boundary-annotation rule (lesson 8).

## Lesson sections

### Introduction (no heading)

Open with the `ROUTES` widening surprise. Two short paragraphs and one snippet.

```ts
const ROUTES = {
  home: '/',
  about: '/about',
  pricing: '/pricing',
};
//    ^? { home: string; about: string; pricing: string }
```

The student wrote three string literals but TypeScript inferred `string` for every value. Autocomplete on `ROUTES.home` works. `keyof typeof ROUTES` gives `'home' | 'about' | 'pricing'`. But `(typeof ROUTES)[keyof typeof ROUTES]` is `string`, not `'/' | '/about' | '/pricing'` — the literal types the student wrote are gone, and any downstream type derivation that depends on them silently widens.

Then state the lesson: TypeScript widens object properties by default because they're reassignable. Two operators reverse that decision. `as const` freezes the value's inferred type at its narrowest; `satisfies` validates the value against a contract without widening it. The combined idiom `as const satisfies T` is the senior reach for any typed-config object.

One forward sentence: the lesson lands the property-widening fix lesson 1 forward-linked, the discriminant-literal mechanism lesson 5 relied on, and the typed-config idiom every later chapter (Drizzle schemas, route configs, permission tables) leans on.

### Why TypeScript widens

A short prose section before any new syntax. Install the mental model.

State the rule plainly: **TypeScript widens literal types in positions where the value could be reassigned.** Three sites the widening fires:

- **Object properties.** `{ status: 'draft' }` infers `{ status: string }` because the property is mutable. The lesson 1 bug.
- **Array element types.** `[1, 2, 3]` infers `number[]`, not the tuple `[1, 2, 3]`.
- **`let` bindings.** `let x = 'draft'` infers `string`. `const` on a primitive does not widen — it stays `'draft'` — because the binding can't be reassigned.

State the load-bearing rule the rest of the lesson installs:

> **The widening is reversible. `as const` opts every nested literal out of widening; `satisfies` checks against a contract without re-applying it.**

No code in this section — three short bullets and the rule. The `as const` and `satisfies` sections that follow show the mechanism in code.

Tooltip targets: `widen` / `widening` (re-use lesson 1's `Term` text verbatim — "inferred literal broadened to base primitive in reassignable positions").

### `as const`: the value-site freeze

The first new tool. State the operator's job in one sentence: **`as const` tells TypeScript to freeze every nested literal at its narrowest type and make every property `readonly`.**

Then walk three behaviors in a `<CodeVariants>` with three tabs. Each tab: one short snippet, the behavior named, the resulting inferred type stated.

1. **String (and number, and boolean) literals stay literal.**
   `const ROUTES = { home: '/' } as const` infers `{ readonly home: '/' }`, not `{ home: string }`. Show the same `ROUTES` from the introduction with `as const` appended; surface the inferred type via a `^?` Twoslash comment.

2. **Object properties become `readonly`.**
   Recover lesson 2's field-level `readonly` rule — the binding is locked, the value is not. `as const` is the shorthand that applies `readonly` to every property without listing them. Show a small `{ name: 'admin', tier: 'pro' } as const` and the inferred shape.

3. **Arrays become `readonly` tuples of literal types.**
   Recover lesson 3's `[1, 2, 3] as const` recognition. `as const` on an array literal produces `readonly [1, 2, 3]`, not `readonly number[]`. The position is fixed, the elements are literal. One snippet plus the inferred type.

Component choice rationale: `<CodeVariants>` because each behavior is a distinct rule on a distinct shape — a stepped walkthrough on one shared block would conflate three rules onto one snippet.

**Then state the unfortunate name collision in one paragraph.** `as const` and `as Type` share a keyword but mean different things. `as const` is a value-site freeze the compiler reads as "infer this value as narrowly as possible." `as Type` (lesson 6) is a type assertion — a conditional escape hatch. Same `as`; sound here, conditional there. Reinforce: this lesson is about the first form only.

Tooltip targets: `as const` (one-line `Term` definition — "value-site freeze that opts every nested literal out of widening and applies `readonly` to every property").

### The three sites `as const` earns its weight

A short section listing the production triggers. Each gets one line and one snippet — no deep walk; the goal is for the student to leave with the surface memorized.

1. **Typed config objects.** A routes map, a feature-flag map, a permission table. Without `as const` the values widen to `string` / `boolean` and downstream `keyof typeof` / `typeof X[keyof typeof X]` derivations break.

   ```ts
   const ROUTES = {
     home: '/',
     about: '/about',
   } as const;

   type Path = (typeof ROUTES)[keyof typeof ROUTES];
   //   ^? '/' | '/about'
   ```

2. **Tuple literals.** `[1, 2, 3] as const` produces `readonly [1, 2, 3]`. Lesson 3's inline-tuple form. The trigger for any positional record built inline that the call site will destructure-and-rename.

3. **Discriminant values.** `{ status: 'loading' } as const` keeps the literal `'loading'` that lesson 5's discriminated union depends on. Without `as const` the type widens to `{ status: string }` and the union member silently turns into a non-discriminating shape.

Component: a single `<Code>` block per trigger (three small blocks in sequence), not a `<CodeVariants>` — the three sites are distinct production patterns, not parallel forms of the same mechanism. Each block stands alone.

### `satisfies`: contract check that preserves the narrow

The second new tool. Open with the bug it fixes.

State the problem: the student wants a contract on `ROUTES` so a typo in a value (`hom: '/'`) errors at the literal site. The instinct is an annotation: `const ROUTES: Record<string, string> = { ... }`. The annotation does catch the typo — but it also widens every value back to `string`, erasing the literal types `as const` worked to preserve.

Show the contrast in `<CodeVariants>` with two tabs:

1. **Annotation widens.**
   ```ts del={1} ins={1}
   const ROUTES: Record<string, string> = {
     home: '/',
     about: '/about',
   } as const;
   //    ^? { readonly home: string; readonly about: string }
   ```
   The annotation `T` takes priority over the value's inferred type. Literal types are gone.

2. **`satisfies` validates without widening.**
   ```ts ins={5}
   const ROUTES = {
     home: '/',
     about: '/about',
   } as const satisfies Record<string, string>;
   //    ^? { readonly home: '/'; readonly about: '/about' }
   ```
   The contract is checked at the literal site; the literal types survive.

Then state the operator's job in one sentence: **`satisfies T` validates that a value is assignable to `T` without applying `T` as the value's type.**

Then name the two senior triggers for `satisfies`:

- **You want to keep the narrow type but validate against a contract.** The canonical case shown above.
- **You want structural errors at the write site, not the read site.** A typo in a key, a missing required field, a value whose type doesn't fit — `satisfies` errors where the value is defined, not where it's consumed. Annotations do this too but at the cost of widening; `satisfies` gives the same write-site error without the widening tradeoff.

Component choice rationale: `<CodeVariants>` because the same `ROUTES` value is shown in two forms with one fence each — the comparison is the point. `del=` / `ins=` markers on the annotation line vs the `satisfies` line make the swap visually loud.

Tooltip targets: `satisfies` (one-line `Term` definition — "operator that validates a value against a type without widening the value's inferred type").

### The combined idiom: `as const satisfies T`

The senior reach. State it as a single rule:

> **Lock the literal types with `as const`, then validate against a contract with `satisfies T`.** Order matters — `satisfies` reads the post-`as const` inferred type.

Walk one full worked example. A permissions table keyed by `Role` literal union, with arrays of `Permission` literals as values:

```ts
type Role = 'admin' | 'member' | 'viewer';
type Permission = 'read' | 'write' | 'invite';

const PERMISSIONS = {
  admin: ['read', 'write', 'invite'],
  member: ['read', 'write'],
  viewer: ['read'],
} as const satisfies Record<Role, readonly Permission[]>;
```

Then surface the four type derivations the idiom unlocks. Each gets one line and a `^?` query:

1. **`keyof typeof PERMISSIONS`** is `'admin' | 'member' | 'viewer'` — every key, literal-typed.
2. **`(typeof PERMISSIONS)['admin']`** is `readonly ['read', 'write', 'invite']` — the literal tuple, not `readonly Permission[]`.
3. **`(typeof PERMISSIONS)[keyof typeof PERMISSIONS][number]`** is `'read' | 'write' | 'invite'` — every permission ever assigned, narrowed from the contract's wider `Permission`.
4. **Missing a role** at the literal site (omit `viewer`) errors immediately — the `Record<Role, ...>` completeness check from lesson 4.

Component: an `<AnnotatedCode>` walking the `PERMISSIONS` definition plus the four derivations. The shared block is small (about 12 lines including the type aliases and the four `^?` queries). Each step highlights one derivation and explains what the idiom unlocked. Rationale: the lesson is reading **one shared file** with four progressive payoffs — the student's eye should move across one block rather than between four separate snippets.

Step layout:

1. **Step 1 (color: green).** Highlight the `as const satisfies Record<Role, readonly Permission[]>` line. Both operators in one line: literal types frozen, completeness check against `Role`, value-type ceiling of `readonly Permission[]`.

2. **Step 2 (color: blue).** Highlight the `keyof typeof PERMISSIONS` line. The keys stayed literal — without `as const`, this would still work because object keys are always literal. State the subtle point: the `keyof typeof` derivation works either way; the next two derivations are what `as const` unlocks.

3. **Step 3 (color: orange).** Highlight the `(typeof PERMISSIONS)['admin']` line. The value at `admin` is the literal tuple `readonly ['read', 'write', 'invite']`, not `readonly Permission[]`. The student gets the exact set of permissions assigned to admin, not the wider contract type.

4. **Step 4 (color: violet).** Highlight the `[keyof typeof PERMISSIONS][number]` chain. The "every permission ever assigned to any role" derivation — useful for narrowing or for building a derived literal union from a config.

5. **Step 5 (color: red).** Highlight a `@ts-expect-error` directive on a `PERMISSIONS` definition with `viewer` removed. The completeness check from `Record<Role, ...>` fires at the literal site; the missing key is caught before the file ships.

### The three forms, one contrast table

A small consolidation section. Three rows, three columns — the student leaves the lesson with the choice in muscle memory.

Render the contrast as a plain markdown table (no special component needed — `<Figure>` would be overkill for a three-row matrix):

| Form | Applies `T` to the value? | Catches contract violations? | Preserves literal types? |
| --- | --- | --- | --- |
| Annotation `: T` | Yes | Yes | No (widens) |
| `as const` | — (no contract) | No (no contract) | Yes |
| `satisfies T` | No | Yes | Yes |

Then one paragraph naming the senior call: pick **annotation** when the type information is the API (exported functions, public type aliases); pick **`as const` alone** when there's no contract to validate against, just literals you want preserved; pick **`satisfies T`** (usually with `as const`) for typed-config patterns where both the literal types and the contract matter. Lesson 8 owns the broader "annotate the boundaries" rule; this section installs the typed-config choice.

### Practice: type a typed-config table

A `<TypeCoding>` exercise that asks the student to author a feature-flag map with `as const satisfies T` and surface the unlocked literal type via a `^?` query.

Exercise spec:

- **Starter:** A `Flag` literal union (`'beta-checkout' | 'new-dashboard' | 'invite-flow'`), a `Stage` literal union (`'off' | 'internal' | 'beta' | 'ga'`), and an empty `FEATURE_FLAGS` constant with a TODO comment. Below the constant, two `^?` queries: one on `keyof typeof FEATURE_FLAGS` expecting the `Flag` union, one on `(typeof FEATURE_FLAGS)['beta-checkout']` expecting the literal stage (not the wider `Stage`). One `@ts-expect-error` directive marks a "missing flag" case at the bottom.

- **Goal phrasing for the student:** "Define `FEATURE_FLAGS` as a typed config that satisfies `Record<Flag, Stage>` and keeps each value's literal type. The two `^?` queries below must resolve to the indicated types; the `@ts-expect-error` directive must fire."

- **Criteria:** Two `expectedQueries` rows (the `Flag` union and a specific literal stage on `beta-checkout`). One `expectedErrors` row pinned to the `@ts-expect-error` directive's line (the missing-flag completeness check).

- **Constraints surfaced via prose:** "Don't annotate. Use `as const satisfies T`."

Component: `<TypeCoding>`. Pure type-level — no runtime needed.

### Pick the right combination

Closing `<MultipleChoice>` exercise (single, not a `<Quiz>` round) to lock in the form-vs-need matching. Four scenarios, one correct combination per scenario — but framed as a single multi-option single-correct card. The card asks: **which scenario calls for `as const satisfies T`?**

Choices (single correct, the `as const satisfies T` case):

- **A:** An exported function parameter type — `(input: { email: string }) => void`. (Incorrect — annotations are the answer; lesson 8 owns this.)
- **B:** A local variable holding the result of a `reduce` — `const total = items.reduce(...)`. (Incorrect — inference handles this; no `as const` or `satisfies` involved.)
- **C (correct):** A module-level routes map whose keys must satisfy `Record<RouteName, string>` and whose values must stay as literal paths so `Path = typeof ROUTES[keyof typeof ROUTES]` narrows. (Correct — the canonical typed-config trigger.)
- **D:** An array of three coordinate numbers (`[10, 20, 30]`) that should be a tuple. (Incorrect — `as const` alone is the answer; no contract to validate against.)

In the `<McqWhy>`, restate the rule: `as const satisfies T` is for typed-config patterns where both the literal types and the contract matter. The other cases reach for a different tool.

Component: `<MultipleChoice>` with one `correct` option (single-correct mode).

### External resources

Three `<ExternalResource>` cards in a `<CardGrid>`. Pick from:

- TypeScript Handbook on **`const` assertions** (`as const`) — canonical reference.
- TypeScript 4.9 release notes or the official handbook section on **the `satisfies` operator** — the operator's first-party introduction.
- A Matt Pocock / Total TypeScript writeup on **`as const satisfies T`** for typed-config — the senior-voice reinforcement of the combined idiom.

Optionally one `<VideoCallout>` if a short Matt Pocock or Andrew Burgess video exists on **`satisfies` vs annotation** or **`as const satisfies`** under ~8 minutes. The continuity notes show every prior chapter 004 lesson has used a `VideoCallout`; this lesson should match. Pick a video that walks the contrast (annotation widens vs `satisfies` doesn't), not just an `as const` explainer — the contrast is the lesson's load-bearing intuition.

### Tooltip terms list

Strategic `<Term>` tooltips, used inline once each at first mention:

- **widen** / **widening** — at the "Why TypeScript widens" section opener. Re-use lesson 1's text verbatim.
- **`as const`** — at the operator's first appearance. One-line definition: "value-site freeze that opts every nested literal out of widening and applies `readonly` to every property."
- **`satisfies`** — at the operator's first appearance. One-line definition: "operator that validates a value against a type without applying the type as the value's annotation."
- **typed config** — at the introduction's preview. One-line definition: "a module-level constant whose keys and values both carry type information consumed by the rest of the module."

Reuse the `Term` text for `widen` verbatim from lesson 1 to keep terminology consistent.

## Scope

What this lesson **does not** cover (deferred to named locations):

- **`as Type` type assertions at depth.** Lesson 6 owns the full surface and the three legitimate triggers. This lesson mentions the keyword collision (`as const` vs `as T`) in one paragraph and moves on.
- **Mapped types and conditional types that operate on `as const` outputs.** `{ [K in keyof typeof PERMISSIONS]: ... }` and friends — reserved for chapter 005 lesson 6.
- **`const` type parameters on generic functions (`<const T>`)** — the call-site-literals-stay-narrow modifier on generic constraints. Reserved for chapter 005 lesson 7 where generics earn their lesson.
- **`isolatedDeclarations` and the broader annotation-at-boundaries rule.** Reserved for lesson 8 (the next lesson). The contrast table here names "annotation as one of three forms" but does not install the where-to-annotate decision.
- **Module augmentation patterns** (`declare module`) — reserved for chapter 006 lesson 4.
- **Drizzle schema definitions, Next.js route segment configs, permission tables in RBAC.** Named as one-line forward links — the idiom returns; this lesson installs the operator, the later chapters apply it.
- **`Readonly<T>` utility type.** Lesson 2 named it; the full utility-type surface is chapter 005 lesson 6.
- **Deep readonly libraries (`type-fest`'s `ReadonlyDeep`, etc.).** Not in the senior-SaaS 2026 reach for this course; one-line mention if the student asks via a watch-out, otherwise skip.

Prerequisites the lesson **assumes** the student has from earlier lessons (single-sentence redefinitions are acceptable if absolutely needed):

- Property widening on object literals (lesson 1) — the bug the lesson opens with.
- Literal types and literal unions (lesson 1) — the narrow form `as const` preserves.
- `readonly` field modifier and `readonly T[]` (lesson 2) — `as const` is the bulk shorthand.
- Tuple literals and the inline `[1, 2, 3] as const` recognition (lesson 3) — recovered.
- `Record<LiteralUnion, V>` completeness check (lesson 4) — the contract the combined idiom validates against.
- Discriminated unions and the discriminant-must-stay-literal rule (lesson 5) — the second `as const` trigger.
- `as Type` as the type assertion (lesson 6) — named once for the keyword collision.
- `keyof typeof` derivations — referenced in the worked example. The depth lives at chapter 005 lesson 5; one-line refresh acceptable here.

## Code conventions alignment notes

- Arrow functions bound to `const` for any function-shaped example (there are few — this lesson is mostly value declarations).
- `type` aliases everywhere; no `interface`.
- `as const satisfies T` is the canonical typed-config shape per the code conventions (`Code conventions.md` § TypeScript). The lesson installs the idiom the conventions reference.
- `SCREAMING_SNAKE_CASE` for true module-level compile-time constants (`ROUTES`, `PERMISSIONS`, `FEATURE_FLAGS`) per the code conventions' naming rules. Mixing case across examples would mislead — keep all three exemplar configs in SCREAMING_SNAKE_CASE.
- Single quotes for strings; trailing commas multiline; semicolons on.
- Use `<Code>` for plain blocks; `<CodeVariants>` for the annotation-vs-`satisfies` contrast and the three behaviors of `as const`; `<AnnotatedCode>` once on the combined-idiom worked example where one shared file carries five progressive payoffs.
- No comments in code except where information depends on them: `^?` Twoslash queries (inline type surfacing) and `@ts-expect-error` directives in the `<TypeCoding>` starter and in the `<AnnotatedCode>` step 5.
