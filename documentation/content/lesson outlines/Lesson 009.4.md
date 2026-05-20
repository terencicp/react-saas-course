# Lesson 009.4 — Branded IDs

## Lesson framing

The lesson teaches **nominal typing on identifier strings** as the structural enforcement that prevents the `getInvoice(currentUser.id)` bug — calls where the compiler couldn't tell two `string`-typed IDs apart and the wrong query shipped. Pattern archetype: open with the production failure mode, install the technique, name the seams where it earns its weight and where it doesn't.

Mental model the student should leave with:

- TypeScript is **structural** — any two `string`s are interchangeable to the compiler. Brands inject a phantom property at the type level that gives the compiler a name to refuse on. The runtime value remains a plain string; only `tsc` sees the brand.
- A brand is a **compile-time tool**. JSON serialization erases it. Brands cross the wire as strings and are re-applied at the parse boundary (Zod) where validation happens.
- The brand factory is the **single seam** where a raw string becomes a branded ID. The `as` cast lives in the factory; downstream code never asserts. In production, the factory body is a Zod parse or a UUID regex, not a bare cast.
- Brands earn their weight at **primary keys**, **external semantic IDs**, and **secret-typed values**. They are noise for free-form strings (titles, comments, search queries). The trigger: the value crosses a schema boundary, has semantic identity (matches a row somewhere), and is confusable with another string of the same shape.

Cognitive load management:

- Start with the bug (concrete, two-line snippet), not with the definition of nominal typing. The pain motivates the abstraction.
- Introduce **one** brand form first (string-intersection with `__brand`). The `unique symbol` variant is named in one paragraph as the library-author / module-boundary reach. Avoid presenting both as equals — that doubles cognitive load without doubling payoff.
- Defer Zod and Drizzle depth (those lessons own them). Show the **integration point** — a single line of each — so the student knows the brand survives across the stack.
- Use the same `UserId` / `InvoiceId` example throughout the lesson. Reusing names reduces the load of new vocabulary while teaching a new pattern.

Pain points to anticipate:

- "Why doesn't TypeScript catch this already?" Address structural vs. nominal up front, briefly.
- "Where does `as UserId` live?" Hide all casts behind the factory; never spread them.
- "Does the brand exist at runtime?" State plainly: no — the phantom property is erased.
- "Do I have to brand every string?" The senior cut (the "bucket" exercise) makes this concrete.

Forward seams to seed in one line each: Zod brand integration (Chapter 046), Drizzle `.$type<>()` columns (Chapter 041), Better Auth augmentation via `declare module` (Lesson 010.4), Server Action arguments (Chapter 047), route segment params (Chapter 033), action wrappers `requireRole` (Chapter 061).

## Lesson sections

### Introduction (no header)

Two short paragraphs.

- **Set the bug.** Walk the senior question from the chapter outline as prose: a `getInvoice(invoiceId: string)` and a `getUser(userId: string)`. Both parameters typed `string`. The call site `getInvoice(currentUser.id)` compiles. A user sees someone else's invoice. The structural type system sees two strings and shrugs.
- **State the lesson goal.** "We're going to give the compiler a name to refuse on" — branded IDs make `UserId` and `InvoiceId` distinct at compile time while remaining strings at runtime. Preview that the same pattern works for Stripe IDs, R2 object keys, and bearer tokens, and that we'll close with the senior cut on when **not** to brand.

Render the bug as a `CodeVariants` with two tabs: "Before — both are strings, compiler shrugs" and "After — branded, compiler refuses." Keep each ~6 lines. The "after" tab won't yet define the brand; just show the call site error message. The body of the lesson explains how to get from one to the other.

### Structural vs. nominal typing

One short subsection establishing the conceptual foundation. Two sentences each, no more.

- **Structural.** TypeScript matches types by shape. Two `{ id: string; name: string }` types are the same type even with different declared names.
- **Nominal.** Languages like Rust and Java match (some) types by **name**. A `UserId` named `UserId` is distinct from a raw string even if both are strings underneath.
- **The bridge.** Brands are TypeScript's idiom for nominal typing at the seams where the team chooses to enforce identity.

Tiny inline `Code` block contrasting the two types — `type A = { x: number }` and `type B = { x: number }`, with a comment showing `let a: A = {} as B` compiles. Keeps it concrete. Optional, but useful.

### The brand pattern

The center of gravity of the lesson. Single subsection, ~3 short code blocks plus prose.

- Define the string-intersection brand: `type UserId = string & { readonly __brand: 'UserId' }`. Annotate **three** parts: (1) `string &` — at runtime the value is a string, (2) `{ readonly __brand: 'UserId' }` — a phantom property the compiler tracks but the runtime never sees, (3) literal string `'UserId'` — distinguishes this brand from any other.
- Use `CodeTooltips` here to attach hover-definitions for `&` (intersection), `readonly`, and `__brand` without breaking the code block flow. The student gets the explanation on demand without prose taking over the page.
- Show that constructing one fails without a cast: `const id: UserId = 'abc'` errors because the literal `'abc'` lacks the `__brand` property. Then show the cast: `const id = 'abc' as UserId`. Then say plainly: **we will never write that cast at the call site**. It lives in the factory.

### The brand factory

Subsection introducing the seam where validation lives.

- Show the minimal factory: `function userId(value: string): UserId { return value as UserId }`. One-liner.
- Step up immediately to the validating factory using `AnnotatedCode` — step 1 highlights the function signature, step 2 highlights the runtime check (regex or Zod), step 3 highlights the cast and the throw on invalid input. This is the senior form.
- State the rule: **`as UserId` appears in exactly one place — the factory.** Downstream code calls `userId(rawString)` and receives a `UserId`. If validation fails, the factory throws. The cast is safe because the runtime check guarantees the value matches the brand's contract.
- Show the Zod integration as a tight one-liner with one paragraph of framing: `const UserId = z.string().uuid().brand<'UserId'>()` produces a Zod schema whose `parse` output is `string & z.BRAND<'UserId'>` (structurally compatible with the hand-rolled brand). Name Standard Schema + Zod 4 in one sentence, forward-link to Chapter 046 for depth. Don't teach Zod here; just show that the integration point exists and that the parse seam is where brands naturally land in production code.

Use `CodeVariants` with three tabs for the factory progression: "Bare cast (don't do this at the call site)", "Validating factory (hand-rolled regex)", "Zod factory (production form)". Each tab carries one paragraph of when-to-use framing.

### Where brands earn their weight

A `CardGrid` with three cards, one per trigger category, each with a one-line "when" and one-line example.

- **Primary keys.** Triggers when an ID identifies a row your code owns. Examples: `UserId`, `OrgId`, `InvoiceId`, `SessionId`. This is the original bug.
- **External semantic IDs.** Triggers when an ID identifies a record a third-party service owns and you persist it. Examples: `StripeCustomerId`, `StripePriceId`, `StripeSubscriptionId`, `R2ObjectKey`. Webhook payloads carry several of these side-by-side; the brand prevents mix-ups when one handler hands off to another.
- **Secret-typed values.** Triggers when the value's identity is "this string is sensitive." Examples: `BearerToken`, `WebhookSecret`. The brand makes the type visible to lint rules, response serializers, and log redactors. Forward-link to Chapter 085 (security baseline) in one line.

After the grid, one paragraph naming the **senior cut** — when **not** to brand. Free-form strings (article titles, comment bodies, search queries, file display names) are just `string`. The trigger is the triple: schema boundary + semantic identity + plausible confusion with another string. If any leg fails, leave it as `string`.

### Brands at the wire boundary

Short subsection — half a page. The load-bearing rule that confuses students.

- The wire **never** sees the brand. `JSON.stringify({ userId })` emits `"userId":"abc-123"` — a plain string. The phantom property doesn't exist at runtime.
- This is fine and intentional. Brands are compile-time; the wire is runtime. The contract gets **re-established** at the receiving end at the parse seam (Zod `.parse(...)` returns a branded value).
- Render this as a tiny three-step `DiagramSequence` (or `ArrowDiagram` if simpler):
  1. **Server.** `const id: UserId = userId('abc-123')` — type `UserId`.
  2. **Wire.** `'{"userId":"abc-123"}'` — type `string` in JSON, no brand on the wire.
  3. **Client.** `UserIdSchema.parse(json.userId)` — type `UserId` again on the other side.
- Pedagogical goal of the diagram: make the "brand erased on the wire, restored at parse" rhythm visceral so the student stops worrying that the brand is "real" data.

### The Drizzle integration

One paragraph plus one tight code block. Just enough to seed the seam.

- Show `id: text('id').primaryKey().$type<UserId>()` on a Drizzle column. The row's `id` field comes back typed as `UserId`, not `string`. The schema becomes the source of truth for IDs; the rest of the codebase consumes branded values.
- One sentence: this means the row coming out of the database is **already branded** — no extra parse step needed for trusted internal queries. Forward-link to Chapter 041 in one line.

### `unique symbol` brands: when the string-intersection form isn't enough

Single short subsection — one paragraph, one code block. Establishes the alternative without competing with the default.

- The risk with `__brand`: any third-party type that happens to declare a `__brand: 'UserId'` field collides with yours. Inside a private codebase this is theoretical; when publishing a library or augmenting third-party types via `declare module`, it becomes real.
- Show the symbol form: `declare const userIdBrand: unique symbol; type UserId = string & { readonly [userIdBrand]: never }`. The unique-symbol key is guaranteed collision-free.
- State the rule: **default to the string-intersection form; reach for the symbol form when crossing package boundaries or augmenting third-party modules.** Forward-link to Lesson 010.4 (`declare module`) in one line.

Render with `CodeVariants` having two tabs: "Default — string-intersection" (the form used throughout the lesson) and "Library/boundary — unique symbol." Keeps the alternative visible without diluting the default.

### Practice: brand it or leave it

`Buckets` exercise — the close-out, matches the chapter outline's spec.

- **Title.** "Brand it or leave it?"
- **Items (8).** "User primary key", "Comment body", "Stripe customer ID", "Search query", "Webhook secret", "Article title", "Session token", "URL path segment".
- **Buckets (2).** "Brand it" and "Leave as string".
- **Grading.** Brand it: user primary key, Stripe customer ID, webhook secret, session token. Leave: comment body, search query, article title, URL path segment.
- **Per-item rationale** shown after grading: each card explains which of the three triggers (schema boundary / semantic identity / plausible confusion) the item passes or fails.

### Practice: type the call sites

`TypeCoding` exercise — the structural-enforcement check. Type-only because no runtime behavior is being tested; the assertion is "the compiler refuses the bug."

- **Starter.** Two unbranded function signatures plus a buggy call site. Student is told to brand the IDs.

  ```ts
  // Define UserId and OrgId as branded strings.
  // Define factories userId(value) and orgId(value).
  // Then the buggy call site below should fail to compile.

  type UserId = string;
  type OrgId = string;

  function userId(value: string): UserId { /* TODO */ }
  function orgId(value: string): OrgId { /* TODO */ }

  function listInvoices(org: OrgId, user: UserId) { /* ... */ }

  const u = userId('user-1');
  const o = orgId('org-1');

  listInvoices(o, u);          // OK
  // @ts-expect-error: arguments swapped
  listInvoices(u, o);
  ```

- **Expected queries.** One `^?` on a call-site variable showing the type resolves to `UserId` (substring `'UserId'`).
- **Why this works.** The student must define the brands correctly for both the OK call to type-check AND the swapped call to fail under `@ts-expect-error`. If they brand only one type, the polarity breaks and the criteria stay red.
- **No runtime needed.** `TypeCoding` is the right widget — see component doc; `@ts-expect-error` flips polarity correctly for "this should fail" cases.

### External resources

`ExternalResource` cards at the end:

- Matt Pocock, "Branded types in TypeScript" — canonical short explainer.
- Zod docs page on `.brand()` — the production parse integration.
- (Optional) Effect's `Brand` module reference — named only for the curious; not required reading.

## Scope

**Already taught (do not re-teach):**

- Structural typing as a default behaviour was introduced implicitly in Chapter 008 (the type vocabulary). The lesson reminds in two sentences without lecturing.
- `as` casts and `as const` (Lesson 008.7) — assume the student understands. Use `as` inside the factory without explaining the operator.
- Intersection types `&` (Chapter 008) — assume known. Briefly remind via `CodeTooltips` if used.
- Discriminated unions, exhaustiveness (009.1–009.3) — branded IDs **appear inside** variant payloads but the lesson does not revisit union mechanics.
- Strict tsconfig flags (Lesson 004.3) — assume on; the type errors fire because of strict mode.

**Reserved for future lessons (do not pre-teach):**

- **Zod schema authoring** — Chapter 046 owns `.brand<>()`, `Standard Schema`, refinements, `z.infer`. Lesson 009.4 only shows the one-line integration point.
- **Drizzle column types** — Chapter 041 owns `.$type<>()` mechanics, `$inferSelect`, `$inferInsert`. This lesson only names `.$type<UserId>()` once.
- **`declare module` augmentation** — Lesson 010.4 owns the mechanics. Lesson here names it as the reason the symbol-brand form exists.
- **Server Actions / route params consuming branded IDs** — Chapters 033, 047, 061 own the call sites; just forward-link.
- **Better Auth `Session.userId` augmentation** — Lesson 010.4 owns it; forward-link.
- **Branded numbers, branded booleans** — same pattern; the lesson commits to strings because that's where the bug class lives. One-line mention only if at all.
- **Alternative nominal-typing approaches** — TypeScript's open `unique type` proposal, Effect's `Brand` module — listed only as external-resource links, no in-prose discussion.
- **Conditional types, `infer`, mapped types** — library-author territory; out of scope.

**Out of scope entirely:**

- Comparison with nominal typing in Rust, Java, or Flow beyond one sentence.
- Performance implications of brands (there are none at runtime; brands erase).
- TypeScript compiler internals for how brand checks resolve.
