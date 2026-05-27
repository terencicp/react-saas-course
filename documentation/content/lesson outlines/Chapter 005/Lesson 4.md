# Lesson 4 — Branded IDs

- **Title (h1):** Branded IDs
- **Sidebar label:** Branded IDs

---

## Lesson framing

This is a **pattern archetype** lesson, pivoting Chapter 005's center of gravity from "shape of a value" (L1: variants; L2: transitions; L3: exhaustiveness) to "identity of a value." The lesson teaches one move: tag IDs with a **brand** at the type level so the compiler refuses to let a `UserId` flow into a slot expecting an `OrgId`, even though both are `string` at runtime. The brand exists in the type system; the value crosses the wire as a plain string; the seam where the string becomes a branded ID is the **brand factory**, and in production the factory body is a Zod parse.

**Posture.** Decisions before syntax. Open with the production bug `getInvoice(currentUser.id)` — the call that compiles because the structural type system sees two `string`s and shrugs, and ships a query that returns the wrong row. The fix is **nominal typing on IDs**, and the lesson works back to the pattern from the bug.

**The mental-model load-bearer.** TypeScript is **structural**: types match by shape, not name. Two `string`s are interchangeable because they have the same shape. **Nominal typing** matches by name; the brand is a compile-time tag attached to the shape that gives TypeScript a name to refuse on. The student must leave with this mental model: the brand is a phantom marker that lives only in the type, not in the runtime value. This is the cognitive pivot the rest of the lesson sits on; muddle it and the integration sections (Zod, Drizzle, the wire boundary) don't land.

**Cognitive load plan.**
1. Bug first — the structural-typing mix-up between `UserId` and `InvoiceId`.
2. Structural vs. nominal — the model. Two `string`s are interchangeable; a brand is what gives them distinct names.
3. The brand declaration — string-intersection form with a phantom `__brand` field. The course's default.
4. The brand factory — the single seam where `as` is allowed; downstream code never asserts.
5. The unique-symbol form — the threshold reach for cross-package brands. Named in one paragraph; defaulted-against for app code.
6. Brands erase at the wire — JSON serialization drops the phantom property; receiving end re-brands at the parse seam.
7. Zod integration — `z.uuid().brand<'UserId'>()` produces a branded schema; one line per parse seam, the type follows.
8. Drizzle integration — `.$type<UserId>()` on the column; one-line forward link.
9. Where brands earn weight, and where they don't — the senior cut, with one-line triggers for each category.
10. Exercises — brand two IDs and prove the cross-call fails (TypeCoding); sort eight values into "brand it / leave it" (Buckets).

**What this lesson does NOT do.**
- Does not re-teach intersection types, `as const`, or `satisfies` — Chapter 004 owns. Recall in one sentence at first use.
- Does not author Zod schemas at depth or teach `z.infer<typeof S>` — Chapter 042 (Unit 5) owns. The Zod integration is shown as a one-line API, with the resulting type called out; no parser bodies, no error handling.
- Does not customize Drizzle column types — Chapter 037 (Unit 4) owns. Named once with a forward link.
- Does not teach `declare module` for third-party augmentation (Better Auth's `Session.userId` becoming `UserId`) — Chapter 006 Lesson 4 owns. Named in one sentence as a forward link.
- Does not brand numbers, booleans, or other primitives. Same pattern; the lesson sticks to strings because that's where the bug class lives. Named in one line of "what this lesson does not include" only.
- Does not teach nominal-typing alternatives (Effect's `Brand` module, the TypeScript open issue for `unique type`). Named in one line.
- Does not re-teach the four canonical variants (L1) or the state-machine pattern (L2). Recall in zero or one sentence; the lesson's running examples are IDs, not unions.

**Recurring vocabulary.** "Structural typing," "nominal typing," "brand," "brand factory," "phantom property," "wire boundary." `<Term>` tooltips for **structural typing**, **nominal typing**, **brand**, **brand factory** — these are the load-bearing four. Skip a tooltip on **phantom property** (used colloquially once, in prose) and on **wire boundary** (one-sentence definition inline).

**Naming and form conventions.**
- Brand declarations use `type` (not `interface`) — Code conventions §TypeScript names `type` as the default form.
- Brand factories are exported from `lib/branded.ts` (Code conventions §File and folder layout names this file explicitly). One factory per branded ID; or one generic `brand<T>` helper that the per-ID factories delegate to. The lesson teaches the per-ID factory form (clearer at the call site); the `Brand<T, Name>` helper is named once.
- Factories use the arrow-function default (Code conventions §Function form) — they are not type-guard signatures. The factory is a thin runtime wrapper, not a predicate.
- Naming: `UserId`, `OrgId`, `InvoiceId`, `SessionId` for primary keys. `StripeCustomerId`, `StripePriceId`, `R2ObjectKey` for external keys. PascalCase per Code conventions §Naming.
- The Zod schema name follows the brand: `const UserId = z.uuid().brand<'UserId'>()`, then `type UserId = z.infer<typeof UserId>`. The schema and the type share the name; this is the senior shape the rest of the course writes. (Some style guides separate `userIdSchema` from `UserId`; the course collapses them per Code conventions §Naming naming Zod schemas with the `<entity>Schema` form for canonical shapes — branded IDs are a carve-out because the brand and the schema are one concept. State this carve-out plainly.)

---

## Lesson sections

### Introduction (no h2 — prose lead-in)

Three short paragraphs. No preamble.

1. **The carry-over.** One sentence pointing back: the chapter has taught discriminated unions (L1), transitions (L2), and exhaustiveness (L3) — the shape of values and the consumers that read them. Inside those variants, every `userId`, `invoiceId`, `sessionId` has been a plain `string`. Today's lesson types the **identity** of those strings.
2. **The bug.** A function signature: `function getInvoice(invoiceId: string): Promise<Invoice>`. Another: `function getUser(userId: string): Promise<User>`. A call site reads `getInvoice(currentUser.id)`. Both parameters are `string`; the structural type system sees two strings and shrugs. The call compiles. The query runs. The wrong row comes back — the invoice with the user's ID as its primary key, if one exists, or `null` and a confusing 404, if it doesn't. In production, the user sees someone else's invoice. The fix is to make the two IDs **distinct types** even though they're the same shape at runtime.
3. **The pattern.** **Brand the ID at the seam where it leaves the database.** A `UserId` is a `string` at runtime but a distinct type at compile time; a function declared as `getUser(userId: UserId)` refuses to accept a `string` (or an `InvoiceId`, or any other branded ID). The brand is a compile-time discipline the type system enforces — same machinery as L1's discriminated union, applied to identity instead of shape. The lesson teaches the declaration, the factory, the Zod integration at the parse seam, and the senior cut between IDs that earn a brand and strings that don't.

Show the bug as a single `<Code>` block — three lines: the two function signatures, the offending call, and an inline comment marking the call as compiling but wrong. Keep it under 8 lines. Optionally annotate inline: `// compiles. the type system can't tell these strings apart.`

Reasoning: bug → pattern is the chapter's prescribed opening. The bug is short and physical — a wrong query, a wrong invoice on screen — and the fix names the rest of the lesson's surface (declaration, factory, Zod, the senior cut).

### Structural vs. nominal: the model the brand lives in

The mental model. Short section — three paragraphs — but the lesson's pivot lives here.

**Content.**
- **Structural typing.** TypeScript matches types by **shape**, not by name. Two type aliases with the same shape are interchangeable; `type Email = string` and `type UserId = string` are both just `string` to the compiler. Pass an `Email` where a `UserId` is expected and TypeScript accepts it — the shapes match. Use a `<Term>` tooltip on **structural typing** at first use. Suggested text: "Type compatibility by **shape**. Two types with the same fields and types are interchangeable, even if their names differ."
- **Nominal typing.** Other languages (Java, C#, Rust, Swift) match by **name**: a `UserId` is distinct from a `string` because it has a different name, regardless of shape. TypeScript has no nominal-type keyword. The **brand** is the workaround: attach a phantom field to the type — a field that exists only at compile time — whose value carries a unique label. The label gives the type a name to refuse on. Use a `<Term>` tooltip on **nominal typing** at first use. Suggested text: "Type compatibility by **name**. A `UserId` is distinct from a `string` because it is named `UserId`, even if both share the same underlying shape."
- **What a brand is.** A type-level marker — a phantom property attached via intersection — that gives the compiler a name to distinguish two otherwise-identical types. The brand exists in the type system; the runtime value is unchanged. A branded `UserId` is, at runtime, just a `string`; at compile time, it's a `string & { __brand: 'UserId' }`, and `string & { __brand: 'UserId' }` is not assignable to `string & { __brand: 'InvoiceId' }` even though both erase to `string` at runtime. Use a `<Term>` tooltip on **brand** here. Suggested text: "A compile-time marker (a phantom property) attached to a primitive type via intersection to give it a unique nominal identity. Erased at runtime."

**Component.** A small inline visual hosted as a lesson-specific component at `src/components/lessons/005/4/StructuralVsNominal.astro`. Two-column HTML+CSS layout: left column "What the runtime sees" with two identical-looking `string` boxes labeled with their values (`'usr_abc'` and `'inv_xyz'`); right column "What the type system sees" with the same two boxes but each carrying a small "tag" pill in the corner reading `UserId` and `InvoiceId` respectively, with the prose "the same shape, but distinct types — the compiler refuses to cross the lanes." Wrap in `<Figure>` with caption: "At runtime, both are strings. At compile time, the brand makes them distinct."

**Pedagogical goal of the visualization.** The figure carries the structural-vs-nominal split visually. Prose alone leaves the student with a hand-wavy "the type system tracks it"; the figure shows the two strings identical at runtime (left) and tagged-distinct at compile time (right) so the brand's phantom-ness is the visual hook. The rest of the lesson — the declaration, the factory, the wire-boundary erasure — sits on this picture.

Close the section with one sentence: *the brand is a compile-time label on a runtime value of the same shape; the lesson's whole pattern is "how to attach, validate, and preserve that label."*

### The brand declaration: string with a phantom field

The course's default form. The shape itself, walked.

**Content.**
- The declaration:
  ```ts
  type UserId = string & { readonly __brand: 'UserId' };
  type InvoiceId = string & { readonly __brand: 'InvoiceId' };
  ```
  - `string & { ... }` is an **intersection type** (Chapter 004 Lesson 5 — recall in one sentence at first use: "an intersection combines two types into one that satisfies both"). The runtime value is a `string`; the type *also* requires a `__brand` property.
  - `readonly __brand: 'UserId'` is a literal-typed property that exists **only in the type** — the runtime string never carries it. The intersection makes the property part of the type's shape, but JavaScript strings can't carry extra properties without violating the runtime type, so the property is phantom.
  - The `readonly` modifier and the literal-typed value are senior reaches: `readonly` discourages reassignment if a value somehow surfaces the property; the literal type makes the brand a distinct name (`'UserId'` vs `'InvoiceId'`) so two brands with different labels are non-assignable.
- The call site that fails:
  ```ts
  declare function getUser(id: UserId): Promise<User>;
  declare function getInvoice(id: InvoiceId): Promise<Invoice>;

  declare const currentUserId: UserId;
  declare const currentInvoiceId: InvoiceId;

  await getUser(currentUserId);       // ok
  await getInvoice(currentInvoiceId); // ok
  await getInvoice(currentUserId);    // type error: 'UserId' not assignable to 'InvoiceId'
  ```
  The compile error names both brands — exactly the readable error the lesson promised. The structural type system now refuses to cross the lanes because the brand gives the two types distinct names.
- Where the declarations live: Code conventions §File and folder layout pins the brand factory and helper to `lib/branded.ts`. The per-entity types (`UserId`, `OrgId`, `InvoiceId`) can live there for global brands, or co-locate with the entity's Drizzle schema once Unit 4 lands. For this lesson, treat `lib/branded.ts` as the central home.
- Why the intersection form is the course's default. State plainly: easy to read, easy to compose with utility types, no extra runtime construct. The form scales across the codebase without import contortions. The alternative (unique symbol) is the next section.

**Component.** Use `<AnnotatedCode>` (3 steps) for the combined block — the two declarations + the failing call site. The block is short but has three focal points:
1. **The phantom property** — color blue. Highlight the `& { readonly __brand: 'UserId' }` portion of each declaration. One sentence: this property exists only in the type — no runtime string carries it.
2. **The two distinct types** — color green. Highlight the two declarations side by side. One sentence: same runtime shape (`string`), distinct compile-time names because the brand labels differ.
3. **The compile error** — color red. Highlight the `getInvoice(currentUserId)` line. One sentence: the compiler refuses the cross-lane call because `'UserId'` is not assignable to `'InvoiceId'` in the brand position.

The walkthrough is the lesson's center for the declaration form. The student should be able to write a brand declaration from memory after it.

### The brand factory: the only seam where `as` is allowed

The runtime side of the pattern.

**Content.**
- The problem the factory solves. The student now has `UserId` and `InvoiceId` as distinct types, but every value that arrives from outside (database row, request body, URL segment) is a plain `string`. The compiler refuses to assign a `string` to a `UserId` — that's the whole point. Some seam must perform the cast, and that seam needs a name.
- The factory shape:
  ```ts
  // lib/branded.ts
  export const userId = (value: string): UserId => value as UserId;
  export const invoiceId = (value: string): InvoiceId => value as InvoiceId;
  ```
  - The `as UserId` cast is the only place in the codebase where `as` appears for a brand. Downstream code never asserts; it imports the factory and calls it.
  - The factory is a thin arrow function bound to `const` — Code conventions §Function form's default. No `function` keyword (factories are not type-guard signatures).
  - Same-name pair: the **type** is `UserId` (PascalCase); the **factory** is `userId` (camelCase). The pair is a senior shape — the call site reads `userId(row.id)` and the result is a `UserId`. State this naming convention plainly.
- The factory is the seam where **validation belongs**. The illustrative form above (bare `as UserId` cast) is the simplest possible body; **production factories validate**. The body can be a UUID regex, a string-length check, or — the senior reach — a Zod parse. Show one elevated form inline:
  ```ts
  // lib/branded.ts (production shape)
  import { z } from 'zod';

  const UserIdSchema = z.uuid().brand<'UserId'>();
  export type UserId = z.infer<typeof UserIdSchema>;
  export const userId = (value: string): UserId => UserIdSchema.parse(value);
  ```
  - The `z.uuid()` builder (Zod 4 top-level form per Code conventions §Schemas with Zod 4 — the deprecated `z.string().uuid()` chain is not used) validates the runtime value at the seam.
  - `.brand<'UserId'>()` adds the Zod-side brand. `z.infer<typeof UserIdSchema>` extracts the branded type — the brand survives `infer`. This is the production shape; the lesson shows it but defers depth to Chapter 042.
- Use a `<Term>` tooltip on **brand factory** at first use. Suggested text: "A function that converts a plain string into a branded ID, performing validation at the seam. The single place in the codebase where `as <Brand>` is allowed."
- **The discipline rule.** State plainly: **`as <Brand>` lives only inside the factory.** Every other reference to a branded ID goes through the factory. Downstream code that calls `someString as UserId` outside `lib/branded.ts` is a code-review failure. The pattern's whole point is that validation lives at one named seam; bypass the seam and the bug class returns.

**Component.** Use `<CodeVariants>` (2 tabs) for the factory walk-through:
- **"Illustrative — bare cast"** — the simple `userId` arrow above. Caption: "The minimal shape. The factory's job is to make `as UserId` legal in one named place."
- **"Production — Zod-parsed"** — the elevated form with `z.uuid().brand<'UserId'>()`. Caption: "Validation belongs in the factory. Zod 4 owns the parser; Chapter 042 owns the depth."

The tabs let the reader flip between the structural shape and the production shape. The reader needs both — the structural shape teaches the pattern, the production shape is what they will write. `<CodeVariants>` is the right reach because each variant has its own framing prose; `<TabbedContent>` would also work but `CodeVariants` is purpose-built for two related code blocks per Component INDEX guidance.

### The unique-symbol form: when the brand crosses a package boundary

The threshold reach. One paragraph in prose, one code block, and a single line on when to use it.

**Content.**
- The shape:
  ```ts
  declare const userIdBrand: unique symbol;
  type UserId = string & { readonly [userIdBrand]: never };
  ```
  - The `unique symbol` form replaces the literal-typed `__brand: 'UserId'` field with a symbol-keyed phantom property. The symbol is guaranteed unique by the runtime — no other module can accidentally produce a property that collides with this one.
- The trigger. Use this form when:
  - The branded type is exported from a library and consumed by codebases the author doesn't control.
  - The brand must round-trip across `declare module` augmentation (Better Auth's `Session.userId`, NextAuth's `User.id`) without colliding with a `__brand: 'UserId'` field a third-party type might also use. Chapter 006 Lesson 4 owns `declare module` mechanics; named here as the trigger.
- The cost. Slightly more verbose at the declaration site; otherwise the call-site experience is identical. The string-intersection form remains the course's default for **internal codebases** because the library/augmentation triggers don't apply to most SaaS feature code.
- One-sentence forward link: Chapter 006 Lesson 4 owns the `declare module` integration where the unique-symbol form's payoff lands.

**Component.** A single `<Code>` block for the declaration. No annotation, no walk-through — the threshold reach earns one mention, not a tour.

### Brands erase at the wire boundary

The load-bearing rule that connects the brand to the JSON/database/URL world.

**Content.**
- The fact: **JSON serialization erases the phantom property.** `JSON.stringify(currentUserId)` produces a plain string. The receiving end (whether it's a Server Action's response body, a `fetch` response, a database row, or a `localStorage` read) gets a `string`, not a `UserId`. The brand exists in the codebase; the wire never sees it.
- The implication: **brands are a compile-time tool, not a runtime contract.** They do not validate the value at the wire — they validate it at the seam where the value re-enters typed code, which is the **brand factory** (and in production, the Zod parse inside it). The seam **re-brands** the string after validating it.
- The pattern diagram, in prose:
  - **Outbound.** A Server Action returns `{ userId: UserId }`. The framework serializes the object as JSON; the brand erases; the client receives `{ userId: string }` at the JSON layer.
  - **Inbound.** The client passes that string back to another Server Action. The action calls `userId(input)` (the factory) to re-brand and validate. From that line on, downstream code holds a `UserId`.
- One-sentence forward link: this is the seam every Server Action wrapper writes (Unit 6 / Chapter 057 — `safeAction` re-validates inputs against a Zod schema, and a Zod schema with `.brand()` re-brands automatically).

**Component.** A small inline figure hosted as a lesson-specific component at `src/components/lessons/005/4/WireBoundary.astro`. Three-stage horizontal flow: **(1)** "Codebase A" box on the left, holding `UserId` (with a small brand-tag visualization); **(2)** an arrow labeled "JSON / database / URL" crossing the middle, showing the brand-tag falling off the box (visually erased); **(3)** "Codebase B" box on the right, holding a plain `string` that arrives at a `brand factory` (icon: a small funnel or gate) which re-tags the value as `UserId` again. Wrap in `<Figure>` with caption: "The brand erases over the wire. The receiving end re-brands at the factory seam."

**Pedagogical goal.** The figure makes the round-trip mechanical, not abstract. Without it, students confuse "the brand is on the type" with "the brand travels with the value," and they end up writing redundant runtime checks for the brand or — worse — hand-casting the string back to `UserId` without validation on the receiving side. The figure shows the brand as a tag that exists in scope A, falls off in transit, and is reapplied in scope B. The factory is the gate.

### Zod integration: the schema is the source of truth

One short section, one code block, one forward link.

**Content.**
- The shape:
  ```ts
  // lib/branded.ts
  import { z } from 'zod';

  export const UserId = z.uuid().brand<'UserId'>();
  export type UserId = z.infer<typeof UserId>;
  export const userId = (value: string): UserId => UserId.parse(value);
  ```
  - The schema and the type share the name. The schema is uppercase (it's a value, but the name carries the brand label); the type alias is the inferred output. The factory wraps `UserId.parse(value)`. This is the senior shape — one source of truth for the validator, the type, and the factory.
  - The course commits to Zod 4's top-level format builders (Code conventions §Schemas with Zod 4): `z.uuid()`, not `z.string().uuid()`. The chained form is deprecated in Zod 4.
- What `.brand<'UserId'>()` does. State plainly: it tags the schema's output type with a `UserId` brand. `z.infer<typeof UserId>` produces `string & z.$brand<'UserId'>` — Zod's own brand form, structurally compatible with the string-intersection brand the course defaults to. The student doesn't need to author both forms; the Zod `.brand()` method generates the branded type.
- One-sentence forward link: Chapter 042 (Unit 5) owns Zod schema authoring, error handling, and `safeParse` patterns. The lesson here shows the API surface; the depth lives there.
- **The naming carve-out** (recall from §Lesson framing): the schema-and-type sharing one name (`UserId`) is the senior shape for branded IDs. Other Zod schemas in the codebase follow the `<entity>Schema` convention (Code conventions §Naming) — `createInvoiceSchema`, `invoiceSchema` — but branded IDs collapse the schema and the type into one identifier because the brand is the schema's whole purpose. State this carve-out plainly.

**Component.** A single `<Code>` block for the production factory. No annotation — the block is short and the prose around it carries the framing.

### Drizzle integration, in one line

Forward link only. One paragraph.

**Content.**
- Drizzle column types accept a `.$type<T>()` modifier that overrides the inferred TypeScript type at the schema layer. A primary-key column declared with `.$type<UserId>()` returns a `UserId` from `$inferSelect`, not a `string`. Show one line:
  ```ts
  id: text('id').primaryKey().$type<UserId>();
  ```
- The result: the row type that flows out of `db.select()` carries branded IDs through every downstream consumer — Server Actions, render functions, fetch responses. The brand is set at the schema; every consumer reads it.
- One-sentence forward link: Chapter 037 (Unit 4) owns Drizzle column-type customization, primary-key conventions (UUIDv7), and `$inferSelect` / `$inferInsert`. The lesson here only names the seam.

Render as plain prose with one fenced `<Code>` block for the single line. The section is two sentences and a one-line snippet; no walk-through component needed.

### Where brands earn their weight — and where they don't

The senior cut. The lesson's normative section: not every string needs a brand.

**Content.**
- **Brand it.** Three categories, each with a one-line trigger.
  - **Primary keys.** `UserId`, `OrgId`, `InvoiceId`, `SessionId`. The original mix-up bug; the brand prevents `getInvoice(currentUser.id)` at every call site.
  - **External keys with semantic identity.** `StripeCustomerId`, `StripePriceId`, `StripeSubscriptionId`, `R2ObjectKey`. The values are strings the third party owns, but the application reasons about them as distinct entities. Three paragraphs of webhook handlers later, the brand prevents passing a `StripeCustomerId` where a `StripeSubscriptionId` was expected. Forward link to Stripe billing (Unit 9 / Chapter 064) and R2 object storage (Chapter 068).
  - **Secret-typed values.** `BearerToken`, `WebhookSecret`, `ApiKey`. The brand makes the value visible at the type level so a logger or response body can be lint-checked against accidentally including it. Forward link to the security baseline (Unit 12 / Chapter 081).
- **Leave it.** State the rule plainly: a `string` that holds free-form user input — an article title, a comment body, a search query, a display name — is **just a `string`**. Branding it adds declaration noise without preventing a real bug. There is no `ArticleTitle` value getting confused with a `CommentBody`; both are display strings. The branding tax outweighs the safety win.
- The senior test, in one sentence: **brand a string when it crosses a schema boundary, has semantic identity (matches a record somewhere), and could plausibly be confused with a different value of the same shape. If none of those, the string is a string.**

**Component.** Render the "brand it" categories as a short prose list, then a small `<Aside type="tip">` for the senior test:

> **The senior test.** Brand a string when (1) it crosses a schema boundary, (2) it has semantic identity — i.e., it matches a row somewhere — and (3) it could plausibly be confused with a different value of the same shape. If none of the three apply, the string is a string.

The `<Aside>` is the right reach for a one-paragraph normative principle. The Bucket exercise at the end of the lesson will operationalize this test on eight concrete values.

### Exercise — brand `UserId` and `OrgId` and prove the cross-call fails

A `<TypeCoding>` exercise. The chapter outline suggests `script-coding`; `TypeCoding` is the right reach because the exercise is about the **compile error** (the type-level contract), not runtime behavior. No actual queries need to run for the pattern to be valid.

**Setup (Widget B form — "make all errors go away").** Ship the starter with:
- Two brand types (`UserId`, `OrgId`) declared but using the same brand label by mistake (or both unbranded).
- Two factories (`userId`, `orgId`).
- Two functions: `getUser(id: UserId)` and `getOrgMembers(orgId: OrgId)`.
- A call site that should fail to compile (passing a `UserId` to `getOrgMembers`).
- A `// @ts-expect-error` directive on the line that should fail; the directive itself errors when the line **doesn't** error.

```ts
type UserId = string & { readonly __brand: 'UserId' };
type OrgId = string;  // BUG: should be branded

const userId = (value: string): UserId => value as UserId;
const orgId = (value: string): OrgId => value;  // BUG: factory doesn't tag

declare function getUser(id: UserId): Promise<unknown>;
declare function getOrgMembers(id: OrgId): Promise<unknown>;

declare const someUserId: UserId;
declare const someOrgId: OrgId;

// Should fail to compile: a UserId is not an OrgId.
// @ts-expect-error
await getOrgMembers(someUserId);

// Should compile: matching brand.
await getOrgMembers(someOrgId);
await getUser(someUserId);
```

**Task.** Fix the `OrgId` declaration so it is properly branded (`string & { readonly __brand: 'OrgId' }`), and update the `orgId` factory to cast accordingly. Once both brands are distinct, the `@ts-expect-error` directive will fire correctly because the cross-brand call will now actually error.

**Instructions text.** "The `OrgId` type is declared as a bare `string`, so the compiler can't tell a `UserId` apart from an `OrgId` — the `@ts-expect-error` directive currently errors with `\"Unused '@ts-expect-error' directive\"` because the line below it compiles. Brand `OrgId` and update its factory so the cross-call fails and the directive becomes valid."

**Note for lesson author.** The natural TypeCoding polarity (Widget B) is "make all errors go away." Here the `@ts-expect-error` directive's "unused directive" error **is** the failure mode the student fixes: branding `OrgId` correctly causes the line below `@ts-expect-error` to fail to type-check, which makes the directive valid (no longer unused), which removes the diagnostic. State this polarity carefully in the instructions; the directive's behavior is the lesson's mechanic, not an aside.

### Exercise — brand it or leave it?

A `<Buckets>` exercise. The chapter outline names this exercise explicitly: eight string values sorted into "brand it" or "leave it."

**Setup.** Two buckets:
- **`brand`** — "Brand it." Description: "Crosses a schema boundary, has semantic identity, can be confused with a different value of the same shape."
- **`leave`** — "Leave it." Description: "Free-form display string; no semantic identity worth tagging."

**Items (eight total — four per bucket).**

| Item label | Bucket | Reasoning (for the lesson author; not shown to student) |
| --- | --- | --- |
| `user primary key` | `brand` | Primary-key category. The chapter's original bug. |
| `Stripe customer ID` | `brand` | External-key category. Stripe owns the value; the brand prevents confusion with other Stripe IDs. |
| `webhook secret` | `brand` | Secret-typed category. Visibility at the type level matters for log/response linting. |
| `session token` | `brand` | Secret-typed category. Same reasoning as webhook secret. |
| `comment body` | `leave` | Free-form user input. No `CommentBody` ever gets confused with a `ArticleTitle`. |
| `search query` | `leave` | Free-form user input. Same reasoning. |
| `article title` | `leave` | Free-form display string. |
| `URL path segment` | `leave` | A bare path segment in a routing helper is just a string; branding it pretends a semantic identity it doesn't have. (Note: a full route value with a literal-union type — Chapter 005 Lesson 5 — is a different concern, not branding.) |

**Instructions.** "Each chip is a string value you might handle in a SaaS codebase. Drop each into 'brand it' if the value crosses a schema boundary, has semantic identity, and could be confused with another value of the same shape — otherwise into 'leave it.'"

The exercise grades the senior test directly. After the lesson, the student should be able to reach the rule from the eight examples without hesitation.

### External resources

A short `<ExternalResource>` cluster wrapped in `<CardGrid>`. Three cards is the chapter's default cadence.

1. **Total TypeScript — Branded Types** — Matt Pocock's canonical reference for the string-intersection brand pattern, the factory shape, and the senior reach. URL candidate: `https://www.totaltypescript.com/workshops/typescript-expert-interviews/typescript-with-matt-pocock/branded-types` (verify online at write time; the Total TypeScript site has reorganized; a stable alternative is the `egghead.io`-hosted "Use Branded Types in TypeScript" lesson). Icon: `simple-icons:typescript`.
2. **Zod 4 docs — `.brand()`** — the canonical reference for the Zod-side brand method and the `z.$brand<T>` output type. URL: `https://zod.dev/api` (jump to the "Branded types" section). Icon: `simple-icons:zod`.
3. **Egghead / Total TypeScript — branded types deep dive** *or* **DEV.to — Branded Types: Beyond Primitive Type Safety** — a longer-form walk through the pattern, the cross-package considerations (the trigger for the unique-symbol form), and the production seams. URL candidate: `https://dev.to/kuncheriakuruvilla/branded-types-in-typescript-beyond-primitive-type-safety-5bba`. Icon: generic web or `lucide:link`. **Fallback** if the URL has moved: the TypeScript Handbook's section on intersection types and nominal-typing patterns.

Three cards is the cap — the lesson's external surface is the pattern itself, the Zod integration, and a longer-form walkthrough. Further cards dilute. Verify the third card at write time.

---

## Scope

### What this lesson includes

- The structural-vs-nominal typing model and where the brand fits in it.
- The string-intersection brand declaration (`string & { readonly __brand: 'UserId' }`) — the course's default for internal codebases.
- The brand factory pattern: one factory per branded ID, factories live in `lib/branded.ts`, factories are the only seam where `as <Brand>` is allowed.
- The Zod 4 integration: `z.uuid().brand<'UserId'>()` produces a branded schema; `z.infer<typeof UserId>` extracts the branded type; the factory wraps `.parse()`.
- The Drizzle integration named once via `.$type<UserId>()` on the column declaration (one line, forward link only).
- The unique-symbol brand form as the threshold reach for cross-package brands.
- The wire-boundary erasure rule: JSON serialization drops the phantom property; the receiving end re-brands at the factory seam.
- The senior cut between IDs that earn a brand (primary keys, external keys with semantic identity, secret-typed values) and strings that don't (free-form user input, display strings).
- Two exercises: brand two IDs and prove the cross-call fails (`TypeCoding`); sort eight string values into "brand it / leave it" (`Buckets`).

### What this lesson does NOT include

- **The discriminated-union shape, transitions, or exhaustiveness** — Chapter 005 Lessons 1, 2, 3 own. No code samples here use unions; IDs are the focus.
- **Zod schema authoring at depth, `safeParse`, error-shaping, `z.treeifyError`** — Chapter 042 (Unit 5) owns. The Zod integration in this lesson shows the API surface (`z.uuid().brand<'UserId'>()`) and the inferred type, no parser bodies or error handling.
- **Drizzle column-type customization, primary-key conventions (UUIDv7), `$inferSelect` / `$inferInsert`** — Chapter 037 (Unit 4) owns. The `.$type<UserId>()` modifier is shown as a one-line forward link.
- **`declare module` for third-party type augmentation** — Chapter 006 Lesson 4 owns. Named once as the trigger for the unique-symbol brand form; no augmentation code samples in this lesson.
- **`typeof V`, `keyof T`, `T[K]` derivation operators** — Chapter 005 Lesson 5 owns. Brand declarations and factories don't need derivation here.
- **Utility types** (`Partial`, `Pick`, `Omit`, etc.) — Chapter 005 Lesson 6 owns. Branded types compose with utility types straightforwardly; named in zero or one line.
- **Generics with constraints** — Chapter 005 Lesson 7 owns. The lesson uses concrete brand types throughout; a `Brand<T, Name>` generic helper is named once but not authored.
- **Better Auth's `Session.userId` becoming `UserId`** — Chapter 006 Lesson 4 owns (one-sentence forward link). Better Auth itself lands in Unit 9.
- **Server Action wrappers (`safeAction`, `requireRole`) consuming branded IDs** — Chapter 057 / Chapter 043 owns. One-sentence forward links only.
- **Branded numbers, branded booleans, branded objects.** Same pattern; the lesson sticks to strings because that's where the bug class lives. Named in one line in "what this lesson does not include" only.
- **Nominal-typing alternatives**: Effect's `Brand` module, TypeScript's open issue for a `unique type` keyword, the `Tagged<T, Brand>` form from `ts-essentials`. Named in one line. The course commits to the string-intersection form.
- **Branded URLs, branded route segments at the framework boundary.** Next.js typed routes are Chapter 029's concern; the route-segment branding question doesn't land in this lesson.

### Prerequisites — concise refreshers only

- **Intersection types** (Chapter 004 Lesson 5) — one sentence at first use: "An intersection type `A & B` combines two types into one that satisfies both. The runtime value must be valid for `A` and for `B`."
- **`as` type assertions** (Chapter 004 Lesson 6) — one sentence at first use of `as UserId`: "The `as` assertion tells the compiler to trust a narrowing the type system can't verify; the course confines `as` to the brand factory."
- **`type` aliases** (Chapter 004 Lesson 3) — assumed; one sentence in the brand declaration section: "Per Code conventions, `type` (not `interface`) is the default form for unions, intersections, and object aliases."
- **Zod 4's top-level format builders** (Code conventions §Schemas with Zod 4 — anticipates Chapter 042) — one sentence at first use of `z.uuid()`: "Zod 4 introduced top-level format builders — `z.uuid()`, `z.email()`, `z.url()` — replacing the deprecated `z.string().uuid()` chain."
- **Discriminated union from Chapter 005 Lesson 1** — not required; recall in zero sentences. Branded IDs flow inside variants, but the variant shape is L1's lesson, not this one's.

---

## Components and diagrams at a glance

| Section | Component | Purpose |
| --- | --- | --- |
| Introduction | Single `<Code>` block | The bug — two `string`-typed signatures, the cross-call that compiles. |
| Structural vs. nominal: the model | Custom `<StructuralVsNominal>` in `<Figure>` | Two-column visual: runtime sees identical strings; type system sees distinct names. |
| The brand declaration | `<AnnotatedCode>` (3 steps) | Two brand declarations + the failing call site; phantom property, distinct names, compile error. |
| The brand factory | `<CodeVariants>` (2 tabs) | Illustrative bare-cast factory vs production Zod-parsed factory. |
| The unique-symbol form | Single `<Code>` block | The threshold-reach declaration with `unique symbol`. |
| Brands erase at the wire | Custom `<WireBoundary>` in `<Figure>` | Three-stage flow: codebase A (branded) → wire (erased) → codebase B (re-branded by factory). |
| Zod integration | Single `<Code>` block | The production factory with `z.uuid().brand<'UserId'>()`. |
| Drizzle integration | One-line `<Code>` in prose | `.$type<UserId>()` on a primary-key column. |
| Where brands earn weight | Prose list + `<Aside type="tip">` | The three "brand it" categories and the senior-test principle. |
| Exercise — brand the IDs | `<TypeCoding>` (Widget B form) | Brand `OrgId` correctly so the `@ts-expect-error` directive becomes valid. |
| Exercise — brand it or leave it? | `<Buckets>` (8 items, 2 buckets) | Sort eight string values into "brand it" or "leave it." |
| External resources | 3 × `<ExternalResource>` in `<CardGrid>` | Total TypeScript on brands, Zod 4 `.brand()` docs, longer-form walk-through. |

## `<Term>` tooltips to include

- **structural typing** — at first use in §Structural vs. nominal. "Type compatibility by **shape**. Two types with the same fields and types are interchangeable, even if their names differ."
- **nominal typing** — at first use in §Structural vs. nominal. "Type compatibility by **name**. A `UserId` is distinct from a `string` because it is named `UserId`, even if both share the same underlying shape."
- **brand** — at first use in §Structural vs. nominal (last paragraph). "A compile-time marker (a phantom property) attached to a primitive type via intersection to give it a unique nominal identity. Erased at runtime."
- **brand factory** — at first use in §The brand factory. "A function that converts a plain string into a branded ID, performing validation at the seam. The single place in the codebase where `as <Brand>` is allowed."

Four tooltips is the cap for this lesson. Do not add a tooltip on **phantom property** (used colloquially in prose, defined implicitly) or **wire boundary** (one-sentence definition inline in the corresponding section).

## Diagrams

Two lesson-specific HTML+CSS figures, both small and presentational. No Mermaid or D2 — the lesson's visual hooks are conceptual (structural vs. nominal; the wire boundary) and don't have system topology.

1. **`StructuralVsNominal`** (under §Structural vs. nominal). Two-column layout. Left: "What the runtime sees" — two identical `string` boxes with their values. Right: "What the type system sees" — same boxes with brand tags in the corner. Pedagogical goal: make the structural-vs-nominal split visible as a single image so the brand's phantom-ness is the visual hook. Pure HTML+CSS, no interactivity.
2. **`WireBoundary`** (under §Brands erase at the wire boundary). Three-stage horizontal flow: codebase A (branded value) → wire (brand tag falls off / fades) → codebase B (plain string arrives at factory gate, re-emerges as branded). Pedagogical goal: make the round-trip mechanical. Pure HTML+CSS, no interactivity.

Both figures are wrapped in `<Figure>` with captions, hosted at `src/components/lessons/005/4/<Name>.astro`. The lesson runs without either, but the structural-vs-nominal pivot and the wire-boundary erasure are both confusing in prose-only form — the figures earn their weight.

## Lesson-specific components

- `src/components/lessons/005/4/StructuralVsNominal.astro` — two-column visual described above.
- `src/components/lessons/005/4/WireBoundary.astro` — three-stage horizontal flow described above.

Both should be small, pure HTML+CSS, ~80–150 LOC each. They are presentational, not interactive; treat them as `<Figure>` payloads.
