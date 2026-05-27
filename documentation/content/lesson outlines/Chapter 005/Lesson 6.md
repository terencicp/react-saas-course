# Lesson 6 — The utility-type toolbox

- **Title (h1):** The utility-type toolbox
- **Sidebar label:** The utility-type toolbox

## Lesson framing

This lesson is a **reference/survey archetype**. Chapter 005 has so far installed bug-class-prevention patterns; lesson 5 just installed value-driven derivation (`typeof`, `keyof`, `T[K]`). Utility types are the natural continuation: built-in generic type transforms the student reaches for **by name** instead of restating a shape. The lesson doesn't teach mapped-type authoring — it teaches *which* tool to grab and *when*, and how two-utility chains compose.

Pedagogical conclusions, applied lesson-wide:

- **Trigger before tool.** Each utility is anchored to a SaaS seam (partial-update DTO, insert payload, can-still-edit subset, async return, etc.). The student leaves with the question "what shape do I need?" routed to a utility's name.
- **Eleven, grouped.** Group by *what they reshape* (field-modifier / field-selection / nullability / union-set / function-shape / async). Grouped recall outperforms a flat list. `Record<K, V>` already lives in lesson 4 of chapter 004 — name it as the construction member for completeness, don't re-teach.
- **Show the pain first.** Opener: hand-rewriting four shapes vs. four utility calls side-by-side. The senior reflex is "reach, don't restate."
- **Composition is the second-order skill.** Two short, real chains (`Omit + Partial`, `Awaited + ReturnType`). Cut a chain at depth >2 into a named alias; this is the senior boundary, not advanced gymnastics.
- **No coding exercise required.** TypeCoding is overkill for a survey lesson; the matching exercise is the right confirmation that the student can reach for the name. (Mirrors the chapter outline's pedagogical call.)
- **Cognitive load.** No mapped-type authoring, no `infer`, no template-literal types at depth — name once and forward-link. Keep the reader on "which name do I reach for?" the entire lesson.
- **Forward-link, don't re-explain.** Drizzle's `$inferSelect`/`$inferInsert` (chapter 037) and Zod's `z.infer` (chapter 042) are the production sources these utilities slice — name them once, don't re-derive.

Mental model the student ends with: "TypeScript ships ~11 type-level functions. Each takes a type, returns a transformed type. I compose two when it reads clean; I name an alias past two. Drizzle and Zod give me the source types — these utilities slice them."

## Lesson sections

### Introduction (no header, opens lesson)

Open with the **senior question, framed as a real SaaS task**: the student has an exported `Invoice` type (from Drizzle, foreshadowed). They need five shapes for one feature — partial-update payload, insert payload, can-still-edit status subset, the resolved value of an async fetcher, the first argument of an existing action. Show, in a single `CodeVariants` block, two options: a *Restate* tab that hand-writes each shape (drift-prone, verbose, four sources of truth) and a *Derive* tab that uses utility types (one source of truth, zero drift). The contrast is the lesson's whole motivation in 15 seconds.

Then one paragraph naming the lesson's scope: "TypeScript ships generic type aliases — `Partial<T>`, `Pick<T, K>`, etc. — that take a type and return a transformed type. The chapter calls these **utility types**. The eleven below are the daily-reach surface in 2026 SaaS code; the rest live in the handbook."

Use a `<Term>` tooltip on **utility type** ("A built-in generic type alias that takes a type and returns a transformed type. Compile-time only — utility types erase like every other TS construct.").

Forward-link line: "the source types these slice come from Drizzle's `$inferSelect`/`$inferInsert` (chapter 037) and Zod's `z.infer` (chapter 042); the lesson uses a hand-rolled `Invoice` shape to keep the focus on the slicing."

Continuity carry-over from continuity notes: re-introduce `Invoice` with the canonical SaaS-feature shape (id branded `InvoiceId`, status as a discriminated literal union `'draft' | 'sent' | 'paid' | 'void'`, with createdAt/updatedAt/total/currency). Brands and unions come from earlier lessons — show them at full width once and reference back.

### Field-modifier transforms

H2 section covering `Partial<T>`, `Required<T>`, `Readonly<T>` — the three that transform **every field** of a shape the same way.

Walk each as a tight code block (single `<Code>` per utility):

- **`Partial<T>`** — every field optional. Trigger sentence: "the PATCH payload where the caller updates a subset." Show `type InvoiceUpdate = Partial<Pick<Invoice, 'status' | 'total' | 'notes'>>` — but introduce `Partial<Invoice>` alone first; the composition appears later in the composition section.
- **`Required<T>`** — every field required (strips `?`). Trigger sentence: "the post-defaults shape — the config the rest of the app reads after `validateConfig(input)` has filled in defaults." A two-line code block: a config type with `?` fields and the `Required<Config>` post-defaults shape.
- **`Readonly<T>`** — every field `readonly`. Trigger sentence: "the return value the caller shouldn't mutate." Pair it with the lesson 7 of chapter 004 carry-over — `as const` produces a deeply-`readonly` shape; `Readonly<T>` is the shallow type-level transform.

Pedagogical note: use a single `<CodeTooltips>` block over a `Partial<Invoice>` example showing the resolved type with every field marked `?`. This makes the "what does this *return*?" question literal — the hover reveals it. The student sees the transform output, not just the input.

Watch-out, inline (one paragraph at the bottom): `Partial<T>` and `Required<T>` are **shallow** — nested object fields don't recurse. State the rule plainly, link forward to lesson 4 of chapter 042 (Zod) where deep partials become the responsibility of the schema. Do not show `DeepPartial<T>` — out of scope.

### Field-selection transforms

H2 section covering `Pick<T, K>` and `Omit<T, K>` — the two that select **a subset of fields**.

Walk each:

- **`Pick<T, K>`** — keep only the named keys. Trigger sentence: "the slim DTO — the list-view row that doesn't need the body." Show `type InvoiceListItem = Pick<Invoice, 'id' | 'total' | 'currency' | 'status'>`.
- **`Omit<T, K>`** — remove the named keys. Trigger sentence: "the insert payload — the database fills `id`, `createdAt`, `updatedAt`, so the caller doesn't pass them." Show `type InvoiceInsert = Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>`. Named as "the most-reached utility type in CRUD code" — it ties to chapter 037 (Drizzle `$inferInsert` is the production source, which is itself an `Omit` of `$inferSelect`).

Use `<CodeVariants>` (two tabs labeled "List view" / "Insert payload") to show both side-by-side with the same `Invoice` source type at the top of each tab — they're the two halves of the CRUD shape pair and read clearer together than sequentially.

One sentence on the **`K extends keyof T`** constraint embedded in `Pick` and `Omit`: invalid keys fail to compile. The compiler checks the key union; a typo in `'totl'` for `'total'` is a compile error at the call site. (Forward-link to lesson 7: this same constraint is the load-bearing one the student writes themselves in `pluck<T, K extends keyof T>`.)

### Nullability and union-set transforms

H2 covering `NonNullable<T>` (nullability), and `Extract<T, U>` / `Exclude<T, U>` (union-set algebra).

Open with the framing: "These three operate on **union members** rather than fields. `NonNullable` removes `null` and `undefined`; `Extract` and `Exclude` slice union members by assignability."

Three tight code blocks:

- **`NonNullable<T>`** — `type AvatarUrl = NonNullable<User['avatarUrl']>` where `User['avatarUrl']` is `string | null`. Trigger sentence: "after you've narrowed and need to pass the value into a slot that demands non-null."
- **`Extract<T, U>`** — `type EditableStatus = Extract<InvoiceStatus, 'draft' | 'sent'>` (where `InvoiceStatus = 'draft' | 'sent' | 'paid' | 'void'`). Trigger: "the can-still-edit subset of a lifecycle union."
- **`Exclude<T, U>`** — `type TerminalStatus = Exclude<InvoiceStatus, 'draft' | 'sent'>`. The same subset by complement. Trigger: "naming the terminal states by what they aren't."

Use a small visual: an `<ArrowDiagram>` inside `<Figure>` showing the four-member `InvoiceStatus` union as four boxes, with one arrow group labelled `Extract<…, 'draft'|'sent'>` pointing at the first two, another labelled `Exclude<…, 'draft'|'sent'>` pointing at the last two. This grounds the "two sides of the same cut" intuition. (Alternative if `<ArrowDiagram>` proves heavy: a 2-row HTML table — top row the full union, bottom row the two slices labelled.)

Watch-out (one sentence): `Extract`/`Exclude` care about **assignability**, not literal equality. `Exclude<string | number, number>` is `string`; the rule is structural. Name once, move on.

### Function-shape and async transforms

H2 covering `ReturnType<F>`, `Parameters<F>`, `Awaited<T>` — the three that read **function and promise shapes**.

Open with the why: in SaaS code, the function whose shape you want is almost always *already written* — an existing Server Action, an existing fetcher, an existing helper. The senior move is to derive the shape from the function, not duplicate it.

Three tight code blocks:

- **`ReturnType<F>`** — `type SaveResult = ReturnType<typeof saveInvoice>`. Trigger: "the shape downstream code consumes." Lean on the `typeof` carry-over from lesson 5 — `typeof saveInvoice` is the function's *type*, `ReturnType<typeof saveInvoice>` is its return.
- **`Parameters<F>`** — `type SaveArgs = Parameters<typeof saveInvoice>[0]`. Trigger: "the first argument's shape, for typing a wrapper." The `[0]` indexed access is the carry-over from lesson 5; the student should read this without commentary.
- **`Awaited<T>`** — `type Invoices = Awaited<ReturnType<typeof fetchInvoices>>`. Trigger: "the resolved value of an async function." Show the recursive-unwrap behavior in one line: `Awaited<Promise<Promise<User>>>` is `User` — TS 4.5+ semantics.

Show the three composing in one chain at the bottom of this section as the bridge into the composition section: `type FetchInvoicesResult = Awaited<ReturnType<typeof fetchInvoices>>` — the two-utility chain that gives the student the resolved type of an async function without rewriting it.

Use `<CodeTooltips>` over a small `<typeof fetchInvoices> → ReturnType → Awaited` block so the resolved types at each step show on hover. The student sees the unwrap happen.

Forward-link line: `Awaited` composes with `Promise.all` results (chapter 007); `ReturnType`/`Parameters` underpin the generic wrapper signatures in lesson 7 of this chapter.

### Composing utility types

H2 section.

Open with the rule: "Utility types compose. They're generic type aliases — the output of one is a valid input to another. The senior reach is to chain *two* when the chain is more legible than a named alias. Past two, name it."

Show the two canonical chains as adjacent `<Code>` blocks:

1. **`Omit<T, K>` + `Partial<T>`** — the slim partial-update DTO. `type InvoiceUpdate = Partial<Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>>`. Read inside-out: take `Invoice`, drop the DB-controlled fields, mark the rest optional. Trigger: "the PATCH /invoices/:id body."
2. **`ReturnType<F>` + `Awaited<T>`** — the resolved async return. `type Invoices = Awaited<ReturnType<typeof fetchInvoices>>`. Read inside-out: take the function's return type, then unwrap the promise. Trigger: "consuming the value an async function eventually yields."

The two reading directions: `<Code>` shows the chain; an inline note teaches the **inside-out read** ("the innermost utility runs first; each outer one transforms its output"). This is the load-bearing rule. The student will read more chains than they write, so the read matters more than the write.

State the **two-utility ceiling** rule plainly: when a chain hits depth 3+, name an intermediate alias instead. Show one bad example and its fix:

```ts
// del: 3-deep, hard to read
type X = Readonly<Partial<Pick<Invoice, 'status' | 'total'>>>;

// ins: 2-deep + 1, names the intermediate
type EditableInvoiceFields = Pick<Invoice, 'status' | 'total'>;
type X = Readonly<Partial<EditableInvoiceFields>>;
```

Use `<CodeVariants>` with two tabs ("Deep chain" / "Named intermediate") so the contrast is one click. Single source of truth, the same student-facing distinction the chapter has used all along.

### The eleven at a glance

H2 section. A **reference table** the student can scan when they come back to the lesson three months later asking "what was that utility called again?"

Render as a single Astro `<table>` (or HTML table in MDX) with three columns: **utility**, **what it reshapes**, **production seam**. Order matches the lesson's own ordering (groups stay together). Group rows under sub-rows or use a leading column with the group name. Eleven rows:

| Utility | What it returns | Reach for it when… |
| --- | --- | --- |
| `Partial<T>` | Every field optional | PATCH-style partial updates |
| `Required<T>` | Every field required | Post-defaults config read shape |
| `Readonly<T>` | Every field `readonly` | Returned value caller shouldn't mutate |
| `Pick<T, K>` | Only the named fields | Slim list/view DTO |
| `Omit<T, K>` | All fields except the named | Insert payload, DB-controlled fields removed |
| `Record<K, V>` | Object with `K` keys, `V` values | Lookup map keyed by a literal union (chapter 004) |
| `NonNullable<T>` | `T` without `null` or `undefined` | Post-narrow slot demanding non-null |
| `Extract<T, U>` | Members of `T` assignable to `U` | Subset of a lifecycle union (e.g., editable states) |
| `Exclude<T, U>` | Members of `T` not assignable to `U` | Complement of the above |
| `ReturnType<F>` | Return type of function `F` | Consuming an existing function's output shape |
| `Parameters<F>` | Parameters of function `F` as a tuple | Typing a wrapper around an existing function |
| `Awaited<T>` | Resolved type of `Promise<T>` (recursive) | Async function's eventually-yielded value |

(Total is 12 rows — `Record<K, V>` carries over from chapter 004 lesson 4 and is included for completeness despite being formally outside the "eleven" framing. State this carry-over in one sentence above the table; the table itself stays clean.)

This is the lesson's keep-this-tab-open artifact. Place it after the composition section so the student has seen each utility in context before scanning the grid.

### What this lesson doesn't reach for

H2 section, single short paragraph each.

- **`Capitalize`/`Uppercase`/`Lowercase`/`Uncapitalize`** — named in one line. String-literal transforms the student will *see* in template-literal patterns (e.g., Next.js typed routes generating `GET ${string}` types — chapter 029); not on the daily reach.
- **`InstanceType<C>`** — extracts the instance type of a class constructor. Rare in SaaS-app code past lesson 2 of chapter 009 where classes have narrow reach. Named, not taught.
- **`NoInfer<T>`** — added TypeScript 5.4. Niche; the trigger is a generic wrapper whose default-parameter would otherwise widen the inferred type. Named in one line because lesson 7 of this chapter will hit the situation; the resolution is `NoInfer<T>` on the offending parameter position.
- **Mapped types** (`{ [K in keyof T]: ... }`) — the underlying mechanism every utility above is built from. Acknowledge their existence in one sentence; reach for them only when the codebase needs the same transform 3+ times. Library-author territory otherwise. Forward-link: chapter 042's discriminated-union helpers may show them, but the chapter doesn't *teach* authoring.

The point of this section is to make the boundary explicit: the student leaves knowing what they have and what they're not getting. No `infer`, no conditional types, no template-literal-type authoring.

### Exercise: pick the right utility

H2 section. A `Matching` exercise — pairing eight "I want this shape" scenarios on the left with the right utility (or two-utility chain) on the right. Eight pairs is the comfortable upper bound the `Matching` component supports.

Pairs (left → right):

1. "The PATCH /invoices/:id body" → `Partial<Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>>`
2. "The insert payload — Drizzle fills `id` and timestamps" → `Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>`
3. "The slim list-view row (`id`, `total`, `currency`, `status`)" → `Pick<Invoice, 'id' | 'total' | 'currency' | 'status'>`
4. "The resolved value of `fetchInvoices`" → `Awaited<ReturnType<typeof fetchInvoices>>`
5. "The first argument of `saveInvoice`" → `Parameters<typeof saveInvoice>[0]`
6. "The editable subset of `InvoiceStatus = 'draft' \| 'sent' \| 'paid' \| 'void'`" → `Extract<InvoiceStatus, 'draft' \| 'sent'>`
7. "An `avatarUrl: string` after narrowing out `null`" → `NonNullable<User['avatarUrl']>`
8. "The post-defaults config — every field present" → `Required<Config>`

`instructions` prop: "Match each shape you want to the utility-type expression that gives it to you."

No live coding exercise. The chapter outline says it explicitly: "the lesson is about reaching for the right tool by name, and the matching exercise is the confirmation." Hold the line.

### External resources

H2 section. Three `<ExternalResource>` cards (consistent with surrounding lessons' card counts):

1. **TS Handbook — Utility Types** (canonical reference; the student bookmarks this).
2. **Total TypeScript — Utility Types tutorial** (workshop-style depth on composition).
3. **TS Handbook — Mapped Types** (the "want to go further" door, with the lesson's "don't reach for this yet" framing intact).

Optional fourth: a Total TypeScript article on `NoInfer<T>` for the curious. Decide based on layout balance — three cards looks consistent with lesson 5; four is acceptable when the fourth is genuinely additive.

## Components inventory

- `<CodeVariants>` — opener (Restate vs Derive), field-selection (List view / Insert payload), composition (Deep chain / Named intermediate).
- `<Code>` — most per-utility examples; the lesson is reference-heavy.
- `<CodeTooltips>` — for `Partial<Invoice>` resolved type, for the `ReturnType → Awaited` unwrap chain. Two uses, both for "show me what this returns" moments.
- `<Figure>` + `<ArrowDiagram>` — the `Extract`/`Exclude` cut visual. One diagram, optional but recommended.
- `<Term>` — at least **utility type** in the intro. Optionally **shallow** when the `Partial`-doesn't-recurse watch-out lands.
- `<Matching>` — the closing exercise.
- `<ExternalResource>` + `<CardGrid>` — three (optionally four) cards at the bottom.

No `<TypeCoding>` (deliberate, per chapter outline). No `<VideoCallout>` (none of the canonical 2026 videos add over the inline examples). No Mermaid/D2 (this lesson's only visual is the union-cut, which `<ArrowDiagram>` handles).

## Tooltips to install

- **utility type** (intro): "A built-in generic type alias that takes a type and returns a transformed type. Compile-time only — utility types erase like every other TS construct."
- **shallow** (Partial watch-out): "Operates on the top level only. Nested object fields keep their original shape; the transform doesn't recurse."

Keep the count low — most utility names are self-explanatory once shown in context, and the lesson's whole goal is to make them part of the student's reach vocabulary, not gloss them at every mention.

## Code conventions to apply

- Arrow functions bound to `const` for any inline function example; `function` form only if a type guard appears (it won't in this lesson).
- `type` over `interface` for every alias in the lesson.
- Single quotes, 2-space indent, semicolons on.
- Branded `InvoiceId` in the `Invoice` shape — match the chapter's running brand vocabulary from lesson 4.
- Discriminated `InvoiceStatus` union — match the chapter's discriminated-union vocabulary from lessons 1 and 5.
- Drizzle and Zod are forward-linked, not used — keep the source `Invoice` hand-rolled to avoid teaching those surfaces here.
- `Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>` (string literal keys) matches Drizzle's own `$inferInsert` shape (chapter 037) — keep this alignment so the carry-over reads natural.

## Scope

**In scope:** the eleven (plus `Record`) utility types listed, grouped recall, two-utility composition with the inside-out read, the two-utility ceiling for chain depth, the SaaS-seam triggers, the field/union/function/async grouping.

**Out of scope:**
- **Mapped-type authoring** (`{ [K in keyof T]: ... }`) — named once as the underlying mechanism, not taught. Library-author territory.
- **Conditional types and `infer`** — out of scope; library-author territory.
- **`NoInfer<T>`** — named in one line; the trigger lands in lesson 7 of this chapter.
- **`Capitalize`/`Uppercase`/`Lowercase`/`Uncapitalize`** — named, not taught. The student will see them in template-literal type patterns (chapter 029, Next.js typed routes).
- **`InstanceType<C>`** — named in one line. Rare past chapter 009 lesson 2 where classes earn narrow reach.
- **`ConstructorParameters<C>`, `ThisParameterType<F>`, `OmitThisParameter<F>`, `ThisType<T>`** — not mentioned. Outside the daily SaaS reach.
- **`DeepPartial<T>` / `DeepReadonly<T>`** — not authored. Deep transforms become Zod's responsibility at the wire boundary (chapter 042 lesson 4).
- **Drizzle's `$inferSelect`/`$inferInsert`** — forward-linked, not derived. Owned by chapter 037.
- **Zod's `z.infer`** — forward-linked, not derived. Owned by chapter 042.
- **Generic functions and constraints** — lesson 7 of this chapter owns. The `K extends keyof T` constraint inside `Pick`/`Omit` is mentioned in one sentence as the seam that connects.
- **`Promise.all`-typed tuples** — forward-linked at `Awaited` mention; owned by chapter 007 lesson 3.

The student leaves able to: identify the right utility (or two-utility chain) for any "I need this shape" task in 2026 SaaS code, read a chain inside-out, and know when to name an intermediate alias instead of going deeper. They cannot author a mapped type — and they shouldn't need to.
