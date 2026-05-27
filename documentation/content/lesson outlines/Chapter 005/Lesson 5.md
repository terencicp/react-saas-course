# Lesson 5 — Derive types from values

- **Title (h1)**: Derive types from values
- **Sidebar label**: Derive types from values

## Lesson framing

The student has the type vocabulary (Ch004) and the union-modeling triad plus brands (Ch005 L1–L4). They now hold a chapter-wide reflex: lean on the compiler. This lesson installs the *operator-level* tools — `typeof V`, `keyof T`, `T[K]` — that make types follow runtime values automatically, so a config edit can never silently drift away from the union it's supposed to update.

**Center of gravity**: The two load-bearing 2026 idioms — `keyof typeof OBJ` and `typeof ARR[number]`. Everything else is in service of these. The student should leave able to read and write both without ceremony.

**Mental model to install**: "Two registers — value-level and type-level — and three operators that lift values into types." Drawing this picture once unblocks the rest. The same word `typeof` exists in both registers and means very different things (runtime predicate vs. compile-time extractor); the lesson must make that split explicit and never let it blur.

**The bug class this lesson prevents**: Parallel hand-maintained types that drift from the value they describe. A locale was added to `LOCALES`; the `Locale` type alias wasn't updated; a switch on locale silently no-ops the new one. The fix is structural: derive the type from the value, so adding to the value updates the type for free.

**Pedagogical shape**: Concept archetype with a Mechanics close. Open with the routes-map drift bug. Walk the three operators on the same `ROUTES` value (so the student sees one example shapeshift through three lenses). Then promote the two load-bearing idioms as named patterns. Worked permissions example ties the whole toolkit together — the artifact the student will reach for in Unit 10 (RBAC). Close with the reverse trap (types are erased; you can't go the other way) and the `ReturnType`/`Parameters` foreshadow that hands off to Lesson 6.

**Cognitive-load notes**:
- Introduce one operator at a time on the *same* `ROUTES` value, so each new operator is just a new lens on a familiar shape.
- Pair every type-level expression with the value-level expression it mirrors (table comparison) — the symmetry is the insight.
- Defer composition until all three operators are individually solid. Composition (`(typeof OBJ)[keyof typeof OBJ]`) is where students lose the thread, so it gets its own scaffolded section.
- No generics, no mapped types, no `infer`. Lesson 6 owns utility-type chains, Lesson 7 owns constrained generics.

**Continuity hooks already established**: `as const` and `as const satisfies T` (Ch004 L7) are the prerequisite — values must stay narrow for derivations to produce literal unions. Branded IDs (L4) compose with derivation in one sentence. Discriminated-union discriminants (L1) are a natural target for `(typeof EVENTS)[number]['type']`-style derivation.

---

## Lesson sections

### Introduction (no header, intro prose)

Open with the bug class as a paired snippet (use `<CodeVariants>`, two tabs):

- Tab 1 — "Drifts": A `ROUTES` const declared with `as const`, plus a hand-written `type RouteName = 'home' | 'invoices' | 'settings'` and `type RoutePath = '/' | '/invoices' | '/settings'`. A new route is added to `ROUTES`. Inline comment in the next file: `// switch (name) on RouteName silently ignores the new entry`.
- Tab 2 — "Tracks": Same `ROUTES`. The two types now read `type RouteName = keyof typeof ROUTES` and `type RoutePath = (typeof ROUTES)[RouteName]`. Adding a route updates both types automatically.

Then state the rule that the lesson installs in one sentence: **if a hand-written type alias mirrors the keys, values, or structure of a runtime value, derive it from the value instead.**

Preview: three operators (`typeof`, `keyof`, `T[K]`), two load-bearing idioms, one worked example that fuses them.

### Two registers, one keyword

This is the orientation that everything else depends on. Cognitive-load priority: make the type-level vs. value-level split visible before introducing the operator that bridges them.

- Frame: TypeScript code lives in two registers — **value-level** (what runs at runtime; what JavaScript executes) and **type-level** (what the compiler reasons about; erased before runtime). Most operators are exclusive to one register.
- The `typeof` collision. At the value level, `typeof x` is the runtime operator that returns a string (`'string'`, `'number'`, `'object'`, ...). At the type level, `typeof V` extracts the *inferred type* of a binding. **Same keyword, different register, different meaning.** Position determines which.
- Visual aid: a small two-column comparison table (plain HTML or markdown table) titled "Two registers." Rows: "Lives in", "Operates on", "Erased at runtime?", "`typeof` here means". Pedagogical goal: install the mental split before the operator does any work.
- One-line rule: **type-level `typeof` requires a value identifier on the right** (`typeof ROUTES`, `typeof user`). It can't take an arbitrary expression. If you reach for `typeof getUser()`, you want `ReturnType<typeof getUser>` instead (forward-linked to L6).

Use a small `<Term>` tooltip on **type-level** the first time it appears: "An expression evaluated by the TypeScript compiler at compile time. Erased before the JavaScript runs."

### Extracting the type of a value with typeof

The first operator. Keep it small — three behaviors, one example.

- Definition with the canonical example: `const ROUTES = { home: '/', invoices: '/invoices', settings: '/settings' } as const;` then `type Routes = typeof ROUTES`.
- Use `<CodeTooltips>` to surface what `typeof ROUTES` resolves to: `{ readonly home: '/'; readonly invoices: '/invoices'; readonly settings: '/settings' }`. The tooltip on `typeof ROUTES` shows the resolved type. Pedagogical goal: the student sees the literal-typed object as the *output* of the operator.
- The `as const` dependency, restated from Ch004 L7 in one sentence with a forward-tooltip on the term **`as const`** ("Value-site freeze — every literal stays at its narrowest type, every property becomes `readonly`."). Without `as const`, `typeof ROUTES` widens to `{ home: string; ... }` and every downstream derivation degrades to `string`. State the rule: **`as const` first, then derive.**
- The third site, named once and parked: `typeof` also composes with utility types — `ReturnType<typeof saveInvoice>`, `Parameters<typeof saveInvoice>`. Single sentence; Lesson 6 owns the depth.

Code style note for this section: use the canonical `ROUTES` example throughout this lesson — same `as const`-frozen literal — so each operator adds a lens on a known shape.

### Listing keys with keyof

The second operator. Same `ROUTES` value; one new lens.

- Definition: `keyof T` produces the union of keys of object type `T`. `keyof typeof ROUTES` produces `'home' | 'invoices' | 'settings'`.
- Use an `<AnnotatedCode>` with two-step walkthrough on a single code block:
  1. Highlight `typeof ROUTES` — "first lift the value into the type register."
  2. Highlight `keyof typeof ROUTES` — "then pluck the keys."
  Pedagogical goal: students reading `keyof typeof OBJ` need to parse it inside-out; the walkthrough makes the inside-out reading explicit.
- The compound idiom is the senior reflex, named here: **`keyof typeof OBJ`** for any config object whose keys must double as a literal union. Forward-trigger phrasing — "any time you've written `const FOO = { ... } as const` and you also want `type FooName = 'a' | 'b' | 'c'`, the answer is `keyof typeof FOO`."
- One side-note: on a plain interface or `type` already in the type register, `keyof` works directly — `keyof User` produces the union of `User`'s keys. No `typeof` needed because `User` is already a type. Use this to clarify that `typeof` is only the lift; `keyof` operates on type-level shapes regardless of how they got there.

### Indexed access with T[K]

The third operator. Same `ROUTES` value.

- Definition: `T[K]` produces the type stored at key `K` of shape `T`. `(typeof ROUTES)['home']` is `'/'`.
- The two reach-forms with one-line triggers:
  - Single key: `(typeof ROUTES)['home']` → the literal at that key. Reach for it when you need one value type.
  - Union of values: `(typeof ROUTES)[keyof typeof ROUTES]` → `'/' | '/invoices' | '/settings'`. Reach for it when you need the union of *all* value types across keys.
- Use `<CodeTooltips>` to surface both forms inline. Tooltip targets: `(typeof ROUTES)['home']` (single-value), `(typeof ROUTES)[keyof typeof ROUTES]` (union of values).
- A short visual aid: a simple HTML table titled "Lenses on the same value" with three columns — "Operator", "Reads", "Returns" — and three rows for `typeof ROUTES`, `keyof typeof ROUTES`, `(typeof ROUTES)[keyof typeof ROUTES]`. Pedagogical goal: a single artifact the student can scan back to when they forget which operator does what. Wrap in `<Figure>` with caption "The three lenses on the same `ROUTES` value."

### Element types from arrays: typeof ARR[number]

Promotes the second load-bearing idiom to its own section, because its shape (`[number]` index access on an array type) is not obvious to students seeing it for the first time.

- The bug class first: `const LOCALES = ['en', 'es', 'fr']` (no `as const`) gives `string[]`, and `type Locale = string` — useless for any switch. With `as const`: `readonly ['en', 'es', 'fr']`. Indexing the tuple at `[number]` produces the union of elements: `'en' | 'es' | 'fr'`.
- Why `[number]`: a tuple/array type indexed by the type `number` returns the union of element types. The student should not memorize this as syntax magic; the lesson explains it as a special case of indexed access (`T[K]` where `K = number`).
- Worked example as a single `<Code>` block: `const LOCALES = ['en', 'es', 'fr'] as const;` then `type Locale = typeof LOCALES[number];`. Add a `// ^?` Twoslash-style comment that the student can reproduce in their own playground (the comment renders as text here, not as a live query — the live query form belongs in the exercise).
- The trigger, stated plainly: **any value list that should double as a literal union — locales, permission keys, plan tiers, status enums — declare it with `as const` and derive the union with `typeof ARR[number]`.** Forward-link in one sentence to Unit 14 i18n (locales), Unit 10 RBAC (permissions), Unit 12 billing (plan tiers).

`<Term>` tooltip on **tuple** the first time it appears in this section: "An array type with a fixed length and per-position element types. `readonly ['en', 'es', 'fr']` is a tuple of three string literals."

### Putting it together — a permissions config

This section is the lesson's worked example and the artifact the student will copy in production. It fuses all three operators on a non-trivial shape, then derives a type the project will actually use.

- Set up the value:
  ```ts
  const PERMISSIONS = {
    'invoice:read': ['member', 'admin'],
    'invoice:write': ['admin'],
    'org:billing': ['owner'],
  } as const satisfies Record<string, readonly Role[]>;
  ```
  Use a one-line tooltip on **`as const satisfies`** ("Validates against the contract while keeping every literal narrow — Ch004 L7."). The `Role` type assumed in the contract is already declared above the snippet from a `ROLES` `as const` array — i.e., the lesson walks the student through deriving `Role` first (`const ROLES = ['member', 'admin', 'owner'] as const; type Role = typeof ROLES[number];`) so the chain is fully derived end-to-end.
- Derive the types via `<AnnotatedCode>` (3 steps) over a single block containing all derivations:
  1. `type Role = typeof ROLES[number];` — "the union of role names, lifted from the value list."
  2. `type Permission = keyof typeof PERMISSIONS;` — "the permission keys as a literal union."
  3. `type AllowedRole = (typeof PERMISSIONS)[Permission][number];` — "two-step lookup — first index by permission to get the role array, then by `[number]` to get the union of elements."
- The payoff, stated plainly: adding a new permission updates `Permission` for free; adding a role to an existing permission updates `AllowedRole` for free; renaming a role in `ROLES` fails to compile until callers update. The compiler is now the maintenance burden, not the team.
- One-line forward link: "Lesson 4 of Chapter 057 builds `requireRole` on top of this exact pattern."

### The reverse trap

Short section, high payoff. Prevents the most common misconception about derivation.

- Rule: **you can derive a type from a value, but you cannot derive a value from a type.** Types are erased at compile time; there's nothing at runtime for `keyof T` to read.
- The senior consequence: when you need both a runtime list and a compile-time union, **the value is the source**. The list (`as const` array or object) lives in code; the type is derived. Never hand-write both.
- Use a small `<CodeVariants>` (2 tabs) for the anti-pattern vs. the senior form:
  - Anti-pattern: `type Locale = 'en' | 'es' | 'fr';` declared, then `const LOCALES: Locale[] = ['en', 'es', 'fr'];` hand-listed. Two sources of truth; they drift.
  - Senior form: `const LOCALES = ['en', 'es', 'fr'] as const;` declared, then `type Locale = typeof LOCALES[number];` derived. One source of truth.
- One sentence on the carve-out: when there is no value list (e.g., the type comes from an external schema), `type Locale = 'en' | 'es' | 'fr';` standalone is fine — the bug class only fires when both forms exist and disagree.

### Where the rest of the toolbox plugs in

Foreshadow Lesson 6 and the Drizzle/Zod seams without teaching them. Single paragraph each, no code in this section.

- `typeof V` composes with utility types: `ReturnType<typeof saveInvoice>` gives the function's return type; `Parameters<typeof saveInvoice>[0]` gives the first argument's type; `Awaited<ReturnType<typeof fetchInvoices>>` gives the resolved value of an async function. **Lesson 6 (next) owns the utility-type depth.** Stated once.
- Forward links to the SaaS stack the student will see later, each in one sentence:
  - **Drizzle**: `typeof invoices.$inferSelect` derives the row type from the schema value (Ch037).
  - **Zod**: `z.infer<typeof invoiceSchema>` derives the validated type from the schema value (Ch042).
  - **Next.js**: route segment params derive their type from the route's schema, same principle (Ch029).

The pedagogical purpose of this section: the student leaves seeing that `typeof V`-derivation is *the* shape the rest of the stack uses for type ergonomics. Not a niche operator; the default.

### Exercise — Type a permissions API

A `<TypeCoding>` exercise (no runtime — exactly the widget's sweet spot for this lesson).

- **Instructions**: "You're given a `PERMISSIONS` config and a `ROLES` list. Derive `Role`, `Permission`, and `AllowedRole`, then complete the `hasPermission` function signature so its arguments are typed by the union of permissions and roles."
- **Starter**: a TS file with:
  - `const ROLES = ['member', 'admin', 'owner'] as const;`
  - `const PERMISSIONS = { 'invoice:read': ['member', 'admin'], 'invoice:write': ['admin'], 'org:billing': ['owner'] } as const;`
  - Three `type` stubs the student fills: `type Role = /* ... */;`, `type Permission = /* ... */;`, `type AllowedRole = /* ... */;`
  - A function stub with `_role: any` and `_permission: any` that the student replaces with the derived types: `function hasPermission(role: /* ... */, permission: /* ... */): boolean { ... }`
  - Two `^?` Twoslash markers — one on `Role`, one on `Permission` — surfacing the resolved type below the editor.
  - One `// @ts-expect-error` line (per the type-coding "should fail" idiom) on a `hasPermission('bogus', 'invoice:read')` call so the student's job stays "fix all errors" and the directive validates that the bad call is rejected after they wire the types.
- **`expectedQueries`** (two rows):
  - line at the `Role` `^?` — `contains: '"member" | "admin" | "owner"'`
  - line at the `Permission` `^?` — `contains: '"invoice:read" | "invoice:write" | "org:billing"'`
- **Grading model**: two `expectedQueries` rows + one auto-pinned "Fix all errors" (note: the type-coding widget auto-adds "fix all errors" only when no explicit criteria are declared, so this exercise should rely on the `@ts-expect-error` directive whose presence makes leftover errors part of the explicit criteria. Confirm by leaving an `expectedErrors` row empty and letting the diagnostics panel surface any remaining errors during practice).
- **Pedagogical goal**: forced practice of the three operators on a single composed shape — the artifact mirrors the worked example, so the student is rebuilding what they just read.

### Exercise — Pick the right derivation

A `<Buckets>` exercise (no coding — fast confirmation that the student can map "I want this type" to the right operator chain).

- **Layout**: single column (one bucket per derivation form is too many for two columns and the chips are short).
- **Buckets** (5 buckets — one per derivation form, plus a "no derivation" foil):
  - `keyof typeof OBJ` — "Keys of a typed-config object"
  - `(typeof OBJ)[K]` — "A value at a specific key"
  - `(typeof OBJ)[keyof typeof OBJ]` — "All values across keys"
  - `typeof ARR[number]` — "Elements of a frozen array"
  - `Hand-write` — "No value to derive from"
- **Items** (8 chips):
  - "The locale codes my i18n module supports (list of strings)" → `typeof ARR[number]`
  - "The keys of my routes map" → `keyof typeof OBJ`
  - "The URL string at `ROUTES.home`" → `(typeof OBJ)[K]`
  - "The union of all route paths" → `(typeof OBJ)[keyof typeof OBJ]`
  - "The plan tiers Stripe ships (frozen array of names)" → `typeof ARR[number]`
  - "The role names my RBAC module recognizes (frozen array)" → `typeof ARR[number]`
  - "The MIME type strings my uploader accepts" → `typeof ARR[number]`
  - "The shape of an `Invoice` from an external library — no local value mirrors it" → `Hand-write`
- **Pedagogical goal**: install the trigger reflex — given a sentence describing what type the student wants, which operator chain produces it.

### External resources (LinkCards)

Three to four cards, picked for durable explainers from the last 12 months:

- TypeScript Handbook — Keyof Type Operator (canonical reference).
- TypeScript Handbook — Typeof Type Operator (canonical reference, the type-level form specifically).
- TypeScript Handbook — Indexed Access Types (canonical reference).
- Optional fourth — Matt Pocock / Total TypeScript article on deriving types from values (verify URL during fact-check; keep only if recent and high-signal).

Use `<ExternalResource>` cards (the project convention).

---

## Components, diagrams, and code-shape decisions

- **Code blocks**: `<Code>` for short single-purpose snippets (one operator on the canonical value); `<CodeVariants>` for the two paired contrasts (drift-vs-tracks intro, anti-pattern-vs-senior reverse-trap); `<CodeTooltips>` for `typeof ROUTES` / `(typeof ROUTES)[keyof typeof ROUTES]` resolved-type tooltips; `<AnnotatedCode>` for the `keyof typeof` two-step walkthrough and the permissions-config three-step derivation.
- **No Mermaid/D2 diagrams**: this lesson is operator-level; no system or state shapes. Use plain HTML tables wrapped in `<Figure>` for the two-register and "three lenses" visuals.
- **No `<VideoCallout>`**: the topic is small, mechanical, and reads better in prose+code than in a 15-minute video. The student's time is better spent in the `<TypeCoding>` exercise.
- **No `<TSPlaygroundCallout>` embed**: the `<TypeCoding>` exercise already runs a live type-checker in-page; adding a Playground link adds a second, redundant surface. Cut.

## Tooltips

`<Term>` tooltips installed in this lesson (definitions to reuse verbatim in later lessons):

- **type-level** — "An expression evaluated by the TypeScript compiler at compile time. Erased before the JavaScript runs."
- **value-level** — "An expression evaluated by the JavaScript runtime. Persists past compilation."
- **`as const`** — "Value-site freeze — every literal stays at its narrowest type, every property becomes `readonly`. Required to keep literal unions narrow when deriving types from values." (Carry-forward from Ch004 L7 if already established; otherwise re-introduce.)
- **tuple** — "An array type with a fixed length and per-position element types. `readonly ['en', 'es', 'fr']` is a tuple of three string literals."
- **derived type** — "A type computed from a runtime value via `typeof`, `keyof`, or indexed access — not hand-written."

Do NOT install tooltips on **`typeof`**, **`keyof`**, **indexed access** — these are the lesson's headline concepts and earn their full treatment in the prose, not a tooltip.

---

## Scope

### In scope

- The three type-level operators: `typeof V`, `keyof T`, `T[K]`.
- The two load-bearing 2026 idioms: `keyof typeof OBJ`, `typeof ARR[number]`.
- The reverse-trap rule (values are the source of truth; types derive from values, not the other way around).
- One-line foreshadow of `ReturnType<F>`, `Parameters<F>`, `Awaited<T>` composing with `typeof` (deferred to L6).
- The worked permissions example as the artifact the student copies.

### Out of scope (defer to named lessons)

- **Utility-type chains** (`Partial`, `Pick`, `Omit`, `Record`, `NonNullable`, `Extract`, `Exclude`, `ReturnType`, `Parameters`, `Awaited`) — **Lesson 6 of Chapter 005**. Named once in the foreshadow section; not used in this lesson's exercises.
- **Generic functions and constraints** (`<T>`, `<T extends K>`, `K extends keyof T`, `<const T>`) — **Lesson 7 of Chapter 005**. The permissions example is non-generic in this lesson.
- **Mapped types** (`{ [K in keyof T]: ... }`) and **conditional types with `infer`** — out of scope for the chapter (library-author territory).
- **`as const` and `satisfies` at depth** — Ch004 L7 owns these. This lesson uses them as prerequisites with a one-line tooltip reminder.
- **Runtime `typeof` narrowing** (`typeof x === 'string'`) — Ch004 L6 owns. This lesson contrasts it with type-level `typeof` in the "two registers" section but does not re-teach the runtime form.
- **Branded IDs composing with derived types** — Ch005 L4 owns brands; the composition is straightforward and named in one sentence if it comes up.
- **`z.infer<typeof schema>` (Zod) and `$inferSelect` / `$inferInsert` (Drizzle)** — Ch042 and Ch037 own these. Named once each in the forward-links section as the schema-side application of this lesson's principle.
- **`instanceof` and runtime type guards** — Ch004 L6 and Ch005 L3 own these.
- **Next.js typed routes and template literal types** — Ch029 owns these.
- **The `NoInfer<T>` utility** — Ch005 L6 owns it as a one-line mention.

### Prerequisites assumed (do not re-teach)

- Object literal syntax, array literal syntax, `const` bindings (Ch001).
- TypeScript `type` aliases and string literal unions (Ch004 L1, L2).
- `as const` and `as const satisfies T` (Ch004 L7) — re-introduced with a one-sentence tooltip; not re-explained.
- Discriminated unions and the `kind`/`status`/`type` discriminant convention (Ch005 L1) — referenced once in the foreshadow if natural.
