# Lesson 7 — Generics with constraints

- **Title (h1):** Generics with constraints
- **Sidebar label:** Generics with constraints

## Lesson framing

Chapter 005 closes with the generics surface a SaaS engineer **writes**, not the library-author tower above it. Lessons 1–6 installed discriminated unions, state machines, exhaustiveness, branded IDs, value-derived types, and the eleven utility types. Every one of those tools already *uses* generics — `Result<T>`, `Brand<T, Name>`, `Pick<T, K>`, `Awaited<T>`. This lesson hands the student the language feature underneath, sized to the three or four wrapper patterns that are load-bearing in 2026 SaaS code: `safeAction`, `requireRole`, `cache`-style memoization, and the `pluck`-shaped `K extends keyof T` accessor that already appeared inside `Pick`/`Omit`. The lesson teaches the form the student will write and ship; conditional types, `infer`, mapped-type authoring, and higher-kinded gymnastics are explicitly named as out-of-scope library-author territory.

Pedagogical conclusions, applied lesson-wide:

- **Pain-first opener.** Open with `identity(value: unknown): unknown` collapsing the return type to `unknown`. The bug is structural — the type system threw information away that a generic could have preserved. The generic is the fix; the rest of the lesson is "and here are the four shapes you'll write."
- **The chapter has already shown generics; this lesson names them.** Carry over `Result<T>` (lesson 1), `Brand<T, Name>` (deferred from lesson 4), `Pick<T, K>` and `Awaited<T>` (lesson 6). The student has read seven generics already without ever being asked to *write* one. This lesson hands them the writing primitive.
- **Constraints are the senior reflex, not a footnote.** Unconstrained `T` is `unknown` for what the function body can do with it. The lesson teaches `extends` constraints in the same breath as the type parameter itself. There is no "first show unconstrained, then constrain" arc — the senior writes the constraint that names what the function needs, from the first keystroke.
- **`K extends keyof T` is the load-bearing constraint.** The `pluck<T, K extends keyof T>(obj: T, key: K): T[K]` shape is the single most useful generic signature in 2026 app TypeScript. Spend disproportionate ink here; the rest of the lesson hangs off this one signature.
- **Wrappers as the real-world payoff.** Three wrappers — `safeAction`, `requireRole`, a `cache`-style memoizer — are presented as the shapes the student will read and review in production. The wrappers are not built from scratch (full bodies belong to chapters 042/043/057); they're presented as **signatures the student should be able to read and defend**. The body is one or two illustrative lines; the generics in the signature are the lesson.
- **The mental model.** A generic function/type is a type-level parameter, just like a value-level parameter. The call site supplies it (explicitly or by inference); the body uses it. `extends` is the type-level version of a parameter type annotation. `<const T>` is the call-site narrow that keeps literals literal.
- **Cognitive load.** No conditional return types, no `infer`, no mapped-type authoring, no variance annotations beyond a one-sentence existence-mention. Every shape shown is one the student can copy into their codebase tomorrow.

Mental model the student ends with: "A generic is a type the call site provides — either explicitly or by inference. `extends` constrains what types are valid. `K extends keyof T` lets a function name a key of an object the caller supplied. Defaults make the common-case call site clean; `<const T>` keeps literal labels narrow. The three wrappers I'll review most often — `safeAction`, `requireRole`, `cache` — are generic functions with constraints."

## Lesson sections

### Introduction (no header, opens lesson)

Open with the **senior question framed as a paired snippet**. Show two versions of `identity` side-by-side via `<CodeVariants>`:

- **Tab 1 — "Loses the type":** `const identity = (value: unknown): unknown => value;`. The call site `identity(42)` returns `unknown`; the next line `result + 1` is a compile error. The type system threw the information away.
- **Tab 2 — "Preserves the type":** `const identity = <T>(value: T): T => value;`. The call site `identity(42)` infers `T = number`, returns `number`; `result + 1` compiles. One symbol added; the type information is preserved end-to-end.

Then one paragraph naming the lesson's scope. "Generics let a function or type accept a type parameter the caller supplies — explicitly or by inference. The chapter has already used seven of them: `Result<T>`, `Brand<T, Name>`, `Pick<T, K>`, `Omit<T, K>`, `Partial<T>`, `Awaited<T>`, `ReturnType<F>`. This lesson hands you the writing primitive and the four shapes you'll ship — the senior wrapper patterns the rest of the course leans on."

Install two `<Term>` tooltips here:
- **generic** — "A function or type that accepts a type as a parameter. The call site supplies it explicitly (`identity<number>(42)`) or by inference (`identity(42)`)."
- **type parameter** — "The `<T>` declaration. Names a type the caller will fill in. Used in parameter types, return types, and the function body's type annotations."

Carry over from lesson 6: name the generics the student has already read (`Result<T>`, `Pick<T, K>`, `Awaited<T>`) in one sentence. This is the chapter's recurring "you already do this; here's the name" move.

Forward-link line at the bottom: "the three load-bearing wrappers in this course — `safeAction` (chapter 043), `requireRole` (chapter 057), `cache`-style memoizers (chapters 074–075) — are generic functions. This lesson is the floor they sit on."

### Generic functions

H2 section. The minimum shape the student should be able to write from memory.

Walk the form in a single `<AnnotatedCode>` (3 steps) over the `identity` block. The same code from the intro's "preserves the type" tab, but now broken into the three things that matter:

```ts
const identity = <T>(value: T): T => value;

const n = identity(42);
const s = identity('hello');
const u = identity<User>(currentUser);
```

- **Step 1 — the type parameter** (`{1} "<T>"`): the `<T>` between the function name and the parameter list declares a type parameter named `T`. It can be referenced anywhere in the signature and the body. Conventional single-letter names are explained in one sentence: `T` for "any type," `K` for "key type," `V` for "value type," `R` for "return type," `P` for "parameters." The course uses these single-letter names because every TypeScript reader knows them; longer names (`TArgs`, `TReturn`) are accepted in some style guides but not the default here.
- **Step 2 — inference** (`{3-4}`): the compiler reads the argument and fills `T` in for the call site. `identity(42)` infers `T = number`; `identity('hello')` infers `T = string`. **The senior reflex is to let inference do the work.**
- **Step 3 — explicit type arguments** (`{5}`): when inference is wrong or ambiguous (e.g., the argument is `unknown`, or the function has no value parameter that constrains `T`), supply the type argument at the call site: `identity<User>(currentUser)`. This is the carve-out, not the default.

State one rule plainly at the bottom of the section: **the type parameter is a type, not a value.** The compiler erases it; there is no runtime representation of `T`. `typeof T` at runtime is meaningless. This is the same "type-level vs value-level" register from lesson 5 — name once, move on.

### Generic types

H2 section.

Open with the chapter's running `Result<T>`, now shown end-to-end as the canonical generic type alias:

```ts
type Result<T, E = AppError> =
  | { ok: true; data: T }
  | { ok: false; error: E };
```

Walk it as a tight single `<Code>` block followed by three short paragraphs (no `<AnnotatedCode>` — the shape is simple, the prose carries the explanation):

- **Type parameters in a type alias**: the `<T, E = ...>` after the alias name declares parameters that the alias's right-hand side references. The student has read `Result<T>` since lesson 1; this is the writing form.
- **Default type parameters**: `E = AppError` makes `Result<User>` a valid shorthand (with `E` implicitly `AppError`) and `Result<User, ValidationError>` a valid override. Defaults are the senior reach to keep ergonomic call sites for the common case. Forward-link to chapter 042 where `AppError` lands.
- **Position rules**: defaults fire only on the omitted positions; required parameters before optional ones; trailing defaults only. This matches the same rule for value-level parameters (lesson 2 of chapter 002) — name the symmetry in one phrase: "type parameters behave like value parameters at the type level."

Carry-over reminder: the canonical `Result<T>` from lesson 1 is `{ ok: true; data: T } | { ok: false; error: { code: string; userMessage: string } }`. This lesson lifts the error into a parameter `E` with a default — same shape, named generic.

Install a `<Term>` tooltip on **default type parameter** here: "A type parameter declared with `= DefaultType`. If the caller omits the position, the default fills in. Like value-parameter defaults, with one tail rule: a defaulted parameter cannot precede a non-defaulted one."

### Constraints with `extends`

H2 section. The center of gravity for the lesson.

Open with **the unconstrained-generic trap**, named once. An unconstrained `T` is the same as `unknown` for what the function body can do with it. Show the failing snippet:

```ts
const firstChar = <T>(value: T): string => {
  return value.charAt(0); // Property 'charAt' does not exist on type 'T'.
};
```

The fix is the constraint:

```ts
const firstChar = <T extends string>(value: T): string => {
  return value.charAt(0);
};
```

Use `<CodeVariants>` with two tabs ("Won't compile" / "Constrained"). The `del=`/`ins=` markers carry the contrast.

Then walk the three constraint shapes the student will write, each as a tight code block:

- **`T extends string` (or any primitive constraint)** — accept only string-assignable types. Useful for any helper that operates on string-shaped inputs, including the branded IDs from lesson 4 (a `UserId` is `string & { ... }`, so it satisfies `T extends string`). One-line code example.
- **`T extends Record<string, unknown>` (or any object shape)** — accept any object. The reach for a "shallow-merge defaults" helper that needs to enumerate fields. One-line code example: `const withDefaults = <T extends Record<string, unknown>>(input: Partial<T>, defaults: T): T => ({ ...defaults, ...input });`.
- **`K extends keyof T`** — call this out as the load-bearing constraint. **`pluck<T, K extends keyof T>(obj: T, key: K): T[K]`** is the single most useful generic signature in 2026 app TypeScript. Show the signature, then three call sites that prove the return narrows:

  ```ts
  const pluck = <T, K extends keyof T>(obj: T, key: K): T[K] => obj[key];

  const u = { id: 'u_1' as UserId, name: 'Ada', age: 30 };
  const id = pluck(u, 'id');     // UserId
  const name = pluck(u, 'name'); // string
  const age = pluck(u, 'age');   // number
  ```

  Use `<CodeTooltips>` here to surface the inferred return type at each call site. The hover proves the narrow — `pluck(u, 'id')` returns `UserId`, not `string | UserId | number`. The student reads the proof, doesn't have to imagine it.

Walk the `pluck` signature with `<AnnotatedCode>` (4 steps) to do justice to it — this is the signature the lesson wants the student to be able to write from memory:

- Step 1: `<T, K extends keyof T>` — two type parameters; `K` is constrained to a key of `T`. Highlight `<T, K extends keyof T>`.
- Step 2: `(obj: T, key: K)` — the value parameters use the type parameters by name. Highlight `obj: T, key: K`.
- Step 3: `: T[K]` — the return type is the indexed access of `T` at key `K` (lesson 5 indexed-access carry-over). Highlight `T[K]`.
- Step 4: the call sites — the student sees the return type narrow per call. Highlight `pluck(u, 'id')` and the inferred type comment.

Forward-link in one line: the same `K extends keyof T` constraint lives inside `Pick<T, K>` and `Omit<T, K>` (lesson 6 named it). Reading those utility-type definitions is now mechanical for the student.

Install a `<Term>` tooltip on **constraint** here: "An `extends` clause on a type parameter (`<T extends ...>`) that requires the caller's type to be assignable to the right-hand side. Inside the function, `T` is usable as that constrained shape."

### The `const` type parameter modifier

H2 section. Short — one example, one rule.

TypeScript 5.0 added `<const T>`. The reach: any wrapper whose inferred type should preserve literal narrows for downstream derivation. Open with a paired contrast:

```ts
// Widens to string[]
const tabs1 = <T extends readonly string[]>(values: T): { values: T } => ({ values });
const t1 = tabs1(['home', 'about']);
//   ^? { values: string[] }

// Stays literal: readonly ['home', 'about']
const tabs2 = <const T extends readonly string[]>(values: T): { values: T } => ({ values });
const t2 = tabs2(['home', 'about']);
//   ^? { values: readonly ['home', 'about'] }
```

Use `<CodeVariants>` with two tabs ("Widens" / "Stays literal") and `<CodeTooltips>` on the resolved-type comments so the student can hover and confirm.

State the rule plainly: **reach for `<const T>` when the wrapper's downstream consumer needs the literal types (a router that derives route names from a tabs config, a permissions helper that derives a literal union from the supplied roles).** Without it, an inline array argument widens to `string[]` and the literal information is lost. With it, the inferred type stays at the tuple narrow — the same effect as `as const` at the call site, but done by the wrapper for the caller.

Watch-out (one sentence): `const` type parameters are **permitted only on functions, methods, and classes** — they are an error on interfaces and type-alias parameters. The student will see the diagnostic if they try the modifier on a generic type alias.

Forward-link: this composes with lesson 5's `typeof ARR[number]` derivation — a wrapper accepting `<const T extends readonly string[]>` and returning a type that uses `T[number]` is the canonical "labeled-set" helper shape.

Install a `<Term>` tooltip on **const type parameter** here: "TypeScript 5.0+ `<const T>` modifier. The compiler infers literal types for `T` where it would otherwise widen — equivalent to the caller writing `as const` on the argument. Permitted on functions, methods, and classes only."

### Three wrappers you'll review

H2 section. The lesson's real-world payoff. Three SaaS wrappers the student will read and review on the job. Frame each as a **signature the student should be able to defend**, not a full implementation.

Use a single `<Code>` block per wrapper. Above each block, one paragraph naming the seam and the generics in the signature; below the block, a one-line "what this lets the caller write" sample.

#### `safeAction` — Server Action wrapper

The shape:

```ts
import { z } from 'zod';

const safeAction = <Schema extends z.ZodType, Output>(
  schema: Schema,
  handler: (input: z.infer<Schema>) => Promise<Output>,
) => async (input: unknown): Promise<Result<Output>> => {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: toAppError(parsed.error) };
  try {
    return { ok: true, data: await handler(parsed.data) };
  } catch (cause) {
    return { ok: false, error: ensureAppError(cause) };
  }
};
```

The framing paragraph:

- `<Schema extends z.ZodType, Output>` ties three things together: the Zod schema the caller passes, the validated input the handler receives (`z.infer<Schema>`), and the value the handler returns. The generics carry the type from the schema through to the `Result<Output>`. The student doesn't need to memorize this — they need to **read it without commentary**.
- Note for the lesson writer: Zod 4 redesigned the `ZodType` generics (`ZodType<Output = unknown, Input = unknown>`) — `z.ZodTypeAny` is gone; reach for `z.ZodType` directly. This is the 2026 idiom; do not use the deprecated `z.ZodTypeAny` form in this lesson.

Caller-side sample:

```ts
export const createInvoice = safeAction(
  createInvoiceSchema,
  async (input) => db.insert(invoices).values(input).returning(),
);
```

Forward-link line: full chapter 043 lesson on Server Actions and lesson 4 of chapter 042 for Zod-derived types. The signature here is the contract; the chapter-043 lesson lands the body and the error funnel.

#### `requireRole` — authorization wrapper

The shape:

```ts
const requireRole = <Role extends RoleName, Output>(
  role: Role,
  handler: (ctx: ActionCtx<Role>) => Promise<Output>,
): (() => Promise<Output>) => async () => {
  const ctx = await getActionCtx();
  if (!ctx.roles.includes(role)) throw new ForbiddenError(role);
  return handler(ctx as ActionCtx<Role>);
};
```

The framing paragraph:

- `<Role extends RoleName, Output>` ties the required role literal to the context shape the handler receives. `ActionCtx<Role>` is itself a generic type whose `role` field narrows to the literal `Role` rather than the broad `RoleName` union. The pattern — a generic that **carries a literal through a wrapper** — is exactly why lesson 5's value-derived `RoleName` union and this lesson's `<const T>` modifier exist as paired tools.

Caller-side sample:

```ts
export const exportBilling = requireRole('owner', async (ctx) => {
  // ctx.role is 'owner', not RoleName
  return generateBillingExport(ctx.orgId);
});
```

Forward-link line: full chapter 057 lesson on RBAC, where this wrapper is built end-to-end with the audit-trail integration and the `ActionCtx<Role>` shape.

#### `memoize` — preserve a function's call shape

The shape:

```ts
const memoize = <P extends unknown[], R>(
  fn: (...args: P) => R,
): ((...args: P) => R) => {
  const cache = new Map<string, R>();
  return (...args: P): R => {
    const key = JSON.stringify(args);
    if (!cache.has(key)) cache.set(key, fn(...args));
    return cache.get(key) as R;
  };
};
```

The framing paragraph:

- `<P extends unknown[], R>` is the **spread-parameters generic idiom**. `P extends unknown[]` means "any tuple of value-parameter types"; `(...args: P)` consumes it; the returned function has the exact same call signature. The wrapper preserves the wrapped function's call shape — same arguments, same return, same TypeScript hints at the call site. This is the shape every `cache`-style helper, every retry wrapper, every instrumentation hook uses.

State plainly: the course's *production* caching reach is Next.js 16's `'use cache'` directive (chapters 074–075), not a hand-rolled `memoize`. This wrapper is the **generics teaching vehicle** — the `<P extends unknown[], R>` pattern is the load-bearing piece the student needs to recognize when they see it in a logger decorator, a profiler hook, or a third-party type definition.

No call-site sample needed; the signature is self-evident.

### Conventional names and the variance footnote

H2 section. Short — one paragraph each.

- **Conventional names recap.** `T` any type, `K` key, `V` value, `R` return, `P` parameters, `E` element or error. Position-named, not domain-named. Reach for a longer name (`TInvoice`, `TError`) only when one generic function juggles three or more parameters and position alone is hard to read; in app code this is rare.
- **Variance, one paragraph for recognition only.** Type parameters can be **covariant** (output-only positions, `Producer<out T>`), **contravariant** (input-only positions, `Consumer<in T>`), or **invariant** (both). TypeScript 4.7 added explicit `in`/`out` annotations. These are library-author tools; the student will **read** them in framework types and shouldn't try to add them in app code. Named once so the syntax doesn't surprise; not taught.

Install a `<Term>` tooltip on **variance** here: "How a type parameter behaves under subtyping. Output-position parameters are *covariant* (a narrower `T` flows through). Input-position parameters are *contravariant* (a wider `T` flows through). `in`/`out` annotations make this explicit; app code rarely needs them."

### What this lesson doesn't reach for

H2 section, one short paragraph each. Mirrors lesson 6's same-named section.

- **Conditional types and `infer`** (`T extends U ? X : Y`, `T extends Promise<infer R> ? R : never`). Library-author territory; the student will read them in framework types (notably `Awaited<T>` and Zod's inferred types) but won't author them. One sentence pointing curious students at the TS Handbook chapter.
- **Mapped types as generic transforms** (`type Lazy<T> = { [K in keyof T]: () => T[K] }`). Same call — read in library types, not authored in app code. Lesson 6 already named them once; reiterate the boundary here.
- **`NoInfer<T>`** — TS 5.4+ utility type. The narrow trigger: a wrapper with a default-providing parameter and a generic, where inference from the default would otherwise widen `T`. The fix is `NoInfer<T>` on the default-providing position. Named in one paragraph with the trigger; not exercised. The student now has a name to grep for if they hit the symptom.
- **Higher-kinded types and type-level programming.** Out of scope. Effect/fp-ts territory.
- **Generic classes.** Classes are a narrow reach in this course; chapter 009 lesson 2 covers them where they earn their weight (custom error classes). The generics shown here apply to classes structurally — same `<T extends ...>` rules — and don't need a dedicated section.
- **Function overloads.** The legacy form for "two call shapes, one body." The course defaults to generics with constraints; overloads are named in one line as the older shape the student will see in some library types (e.g., `Array.prototype.flat`'s declarations).
- **Zod 4 `$ZodType` core type** (`import * as z4 from 'zod/v4/core'`). Library-author surface for constraining schemas in third-party tooling. App code reaches for `z.ZodType`; the `$` core form is named once for awareness only.

The point of this section is to make the boundary explicit. The student leaves knowing what they have (function/type generics, `extends`, defaults, `<const T>`, `K extends keyof T`, three production wrapper shapes) and what they're not getting (library-author tower).

### Exercise: write `pluck`

H2 section. A single `<TypeCoding>` exercise — type-only, no runtime, focused on the lesson's central signature.

The starter is a partially-typed `pluck` plus a small object literal and three Twoslash queries pinning the inferred return type at each call site. The student's job: fill in the generic parameters and the return type so all three queries match and a fourth `// @ts-expect-error` directive (a call with an invalid key) becomes valid.

```ts
// Starter
declare type UserId = string & { readonly __brand: 'UserId' };

const pluck = (obj: object, key: string) => /* TODO: type this */ obj[key];

const u = {
  id: 'u_1' as UserId,
  name: 'Ada',
  age: 30,
};

const a = pluck(u, 'id');
//    ^?
const b = pluck(u, 'name');
//    ^?
const c = pluck(u, 'age');
//    ^?

// @ts-expect-error - 'email' is not a key of u
const d = pluck(u, 'email');
```

`expectedQueries`:
- line of first `^?`: `contains: 'UserId'`
- line of second `^?`: `contains: 'string'`
- line of third `^?`: `contains: 'number'`

No `expectedErrors` — the `@ts-expect-error` directive carries the negative case (it errors if `pluck(u, 'email')` *doesn't* error). Reference solution in a collapsed `:::note`:

```ts
const pluck = <T, K extends keyof T>(obj: T, key: K): T[K] => obj[key];
```

`instructions`: "Type `pluck` so each call site returns the precise type of the field. The three queries should resolve to `UserId`, `string`, and `number`; the `@ts-expect-error` directive should become valid."

This is the lesson's center-of-gravity exercise. The student writes the load-bearing constraint shape from memory by the end.

### Exercise: match the wrapper shape

H2 section. A `<Matching>` exercise — five pairs — confirming the student can route a scenario to the generic-parameter shape it needs. Five pairs, the lesson's third confirmation surface (after the type-coding exercise and the inline annotated walkthroughs).

Pairs (left → right):

1. "A passthrough that keeps the argument's type intact" → `<T>(value: T): T`
2. "A function that reads one field of an object by key" → `<T, K extends keyof T>(obj: T, key: K): T[K]`
3. "A wrapper that takes any function and returns one with the same call shape" → `<P extends unknown[], R>(fn: (...args: P) => R): (...args: P) => R`
4. "A tabs helper whose inline array argument should stay narrow (`'home' \| 'about'`, not `string`)" → `<const T extends readonly string[]>(values: T): T`
5. "A `Result<T>` whose error defaults to `AppError` but the caller can override" → `type Result<T, E = AppError> = ...`

`instructions`: "Match each generic-function scenario on the left to the generic-parameter shape that fits it."

### External resources

H2 section. Three `<ExternalResource>` cards, matching the surrounding lessons' card counts. Wrap in `<CardGrid>`.

1. **TS Handbook — Generics** ([typescriptlang.org/docs/handbook/2/generics](https://www.typescriptlang.org/docs/handbook/2/generics.html)) — canonical reference.
2. **Total TypeScript — Generics workshop** — workshop-style depth on the patterns the lesson surfaces.
3. **TS 5.0 release notes — `const` type parameters** ([typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html)) — official notes on the modifier this lesson teaches.

Optional fourth card if layout balance suggests it: **TS 5.4 release notes — `NoInfer<T>`** for the lesson's named-not-taught utility ([typescriptlang.org/docs/handbook/release-notes/typescript-5-4.html](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-4.html)).

## Components inventory

- `<CodeVariants>` — opener (`unknown` vs `<T>`), constraints (unconstrained-fails vs constrained), `<const T>` (widens vs stays literal). Three uses.
- `<AnnotatedCode>` — the `identity` 3-step walk in "Generic functions," the `pluck` 4-step walk in "Constraints with `extends`." Two uses.
- `<Code>` — per-wrapper signature blocks in "Three wrappers you'll review," generic-type alias in "Generic types." Several uses.
- `<CodeTooltips>` — the three `pluck` call sites in "Constraints with `extends`," the `tabs1`/`tabs2` resolved-type comments in "The `const` type parameter modifier." Two uses.
- `<Term>` — six tooltips: **generic**, **type parameter**, **default type parameter**, **constraint**, **const type parameter**, **variance**.
- `<TypeCoding>` — the `pluck` exercise.
- `<Matching>` — the five-pair wrapper-shape exercise.
- `<ExternalResource>` + `<CardGrid>` — three (optionally four) cards at the bottom.

**No** `<VideoCallout>` (no canonical 2026 video adds over the inline `pluck` and wrapper signatures). **No** Mermaid/D2 (the lesson is structural; nothing benefits from a diagram). **No** `<TSPlaygroundCallout>` (the `<TypeCoding>` widget is the in-page type-checker; sending the student to a second tool fragments the flow). **No** lesson-specific astro components — the prebuilt set covers every need.

## Tooltips to install

- **generic** (intro): "A function or type that accepts a type as a parameter. The call site supplies it explicitly (`identity<number>(42)`) or by inference (`identity(42)`)."
- **type parameter** (intro): "The `<T>` declaration. Names a type the caller will fill in. Used in parameter types, return types, and the function body's type annotations."
- **default type parameter** (Generic types): "A type parameter declared with `= DefaultType`. If the caller omits the position, the default fills in. Like value-parameter defaults, with one tail rule: a defaulted parameter cannot precede a non-defaulted one."
- **constraint** (Constraints with `extends`): "An `extends` clause on a type parameter (`<T extends ...>`) that requires the caller's type to be assignable to the right-hand side. Inside the function, `T` is usable as that constrained shape."
- **const type parameter** (The `const` type parameter modifier): "TypeScript 5.0+ `<const T>` modifier. The compiler infers literal types for `T` where it would otherwise widen — equivalent to the caller writing `as const` on the argument. Permitted on functions, methods, and classes only."
- **variance** (Conventional names and the variance footnote): "How a type parameter behaves under subtyping. Output-position parameters are *covariant* (a narrower `T` flows through). Input-position parameters are *contravariant* (a wider `T` flows through). `in`/`out` annotations make this explicit; app code rarely needs them."

Six tooltips — higher than lesson 6's two, but generics introduce more new vocabulary than utility types did (every utility name explains itself; generic vocabulary doesn't).

## Code conventions to apply

- Arrow functions bound to `const` for every generic function shown — including the wrappers. This is the project default (`function` form is reserved for type guards, named recursion, hoisting). The `pluck` reference solution and all three wrappers stay as arrow functions.
- `type` over `interface` for every alias in the lesson. `Result<T, E = AppError>` is a `type`.
- Single quotes, 2-space indent, semicolons on.
- Generic constraints over loose generics — this rule is **the lesson**, not just a convention. State it once at the top of the constraints section and live by it.
- Branded `UserId` in the `pluck` exercise to make the per-key narrow show its value (the return type for `'id'` is `UserId`, not `string`). Carries lesson 4's brand vocabulary.
- Single-letter type-parameter names (`T`, `K`, `V`, `R`, `P`, `E`). The course's commit; longer names are not the default.
- `Result<T, E = AppError>` matches the chapter's running `Result<T>` from lesson 1, lifted into a generic-with-default. The chain `lesson 1 → lesson 7` is one of the chapter's main carry-overs; preserve the shape `{ ok: true; data: T } | { ok: false; error: E }` exactly.
- For the `memoize` wrapper, do **not** use `function` form even though it's a higher-order function — arrow function bound to `const` keeps the project default intact. The internal returned function is also an arrow.
- Zod 4 surface for `safeAction`: `z.ZodType` (not the deprecated `z.ZodTypeAny`), `z.infer<Schema>` to derive the validated input, `schema.safeParse(input)` returning the `{ success, data, error }` discriminated union. The wrapper body is illustrative; chapter 042/043 owns the production shape.

## Scope

**In scope:** generic functions, generic type aliases, the `extends` constraint with three canonical shapes (`T extends string`, `T extends Record<string, unknown>`, `K extends keyof T`), default type parameters, the `<const T>` modifier (TS 5.0+), the conventional single-letter names, the unconstrained-generic trap, three production wrapper signatures (`safeAction`, `requireRole`, `memoize`-shape), variance and `NoInfer<T>` named for recognition only.

**Out of scope:**
- **Conditional types** (`T extends U ? X : Y`) — library-author territory; named once, not taught.
- **`infer`** — same call; named once with a forward-link to where the student will read it (Zod inferred types, `Awaited<T>` definition).
- **Mapped types** — already named-not-taught in lesson 6; reiterated here.
- **`NoInfer<T>`** — named in one paragraph with the trigger described; not exercised. The student leaves with the symptom in mind and a name to grep for.
- **Higher-kinded types and type-level programming** — out of scope (Effect/fp-ts territory).
- **Generic classes** — covered structurally if at all; chapter 009 lesson 2 owns the narrow class reach.
- **Function overloads** — named in one line as the legacy form; the course defaults to generics with constraints.
- **Building `safeAction`, `requireRole`, and the production `cache` wrapper end-to-end** — owned by chapters 042/043 (Zod and Server Actions), 057 (RBAC), and 074–075 (Next.js `'use cache'`). This lesson presents the signatures; those chapters land the bodies.
- **`Brand<T, Name>` generic helper** — deferred from lesson 4. *Not* built in this lesson either; the per-ID brand factory remains the course's commit (lesson 4 continuity notes). One sentence in the constraints section can show that `T extends string` is the constraint that would underpin such a helper if the team later chose to generalize.
- **TanStack Query generic types** (`UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>`) — chapter 076 owns. The student will read those generics on the strength of this lesson's shape, but the lesson doesn't reach for them as examples.
- **Drizzle's `$inferSelect`/`$inferInsert`** — already forward-linked in lesson 6; not used here. The `Invoice` shape is hand-rolled or imported abstractly.
- **Zod 4 `$ZodType` core type** (`zod/v4/core`) — library-author surface; named once in "What this lesson doesn't reach for," not used.

The student leaves able to: write a constrained generic function (especially the `pluck<T, K extends keyof T>` shape) from memory, read and defend the three production wrapper signatures in a code review, reach for `<const T>` when literals must survive the call site, and recognize variance annotations in library types without trying to use them in app code.
