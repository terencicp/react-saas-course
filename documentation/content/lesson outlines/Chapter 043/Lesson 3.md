# Result, or throw

**Title (h1):** Result, or throw
**Sidebar label:** Result, or throw

---

## Lesson framing

This is the **decision lesson** of the chapter. It does not introduce a new seam; it locks the *return contract* every action in the course obeys and the *throw-vs-return* rule that decides which failures travel which channel. L1 named the empty five-seam skeleton; L2 filled seam 1 (parse) but left its failure objects as **provisional inline placeholders** that this lesson is responsible for formalizing (see L2 continuity, debt line: "do not 'fix' by importing `Result`" — that fix is *this* lesson's job). After this lesson, seam 5 (return) is locked and seam 1's failure branch is upgraded from placeholder to the real `Result`.

Pedagogical spine (conclusions that shape the whole lesson):

- **Lead with the senior question, not the type.** The motivating frame: three failures just happened inside `createInvoice` — a bad email field, a duplicate slug, a missing session — and each must reach the *user* as an inline message, not a crash page. The student should feel the problem (where does a "that slug is taken" message go?) before seeing `Result<T>`. This is a decisions-before-syntax lesson; the `Result` type is the *answer*, introduced after the tension is real.
- **Two channels, one rule.** The durable mental model the student leaves with: **return the expected, throw the unexpected.** Expected failures (validation, conflict, not-found-as-data, business rules) are *data* the form branches on → `Result`. Unexpected failures (programmer error, DB down) and framework control-flow (`notFound()`, `redirect()`) → throw, caught by `error.tsx`. Every other decision in the lesson is a corollary of this one sentence.
- **The contract is already written in the codebase.** `Result<T>` is not invented here — it lives at `lib/result.ts` and is the canonical Code-conventions error shape (§ Error handling). The lesson *teaches the existing contract* and the reasoning behind each field, rather than designing one. This reinforces Architectural Principle #5 (use one shared definition, don't invent parallel `{ success, error }` variants per action) — a thread carried from L1's "`Result` imported as a type from `@/lib/result`."
- **Why a discriminated union, connected to prior knowledge.** The student met discriminated unions in Ch 005.1. `Result` is *the* production payoff of that pattern: the `ok` discriminant makes `data` and `error` mutually exclusive at the type level (Architectural Principle #7 — make impossible states unrepresentable). Name this link explicitly; it turns an abstract TS feature into a concrete senior tool.
- **Pre-lock the form contract.** The form-side consumption (`useActionState` reading `state.ok`, `userMessage`, `fieldErrors`) is **named and shown as a forward-reference, not wired** — Ch 044.4 owns the wiring. The lesson's job is to fix the contract so Ch 044 is *wiring, not invention* (chapter-framing thread). Show the read shape once, in prose, flagged as "Ch 044's job."
- **Cognitive-load staging.** Build the type incrementally: (1) the bare success/failure split, (2) add `code`, (3) add `userMessage`, (4) add optional `fieldErrors`. Don't drop the full nested type cold. Then the helpers, then the decision rule, then error mapping. Each section adds one idea.
- **The chapter-wide running example stays `createInvoice` / `invoicesTable`** (L1+L2 continuity). All code reuses it; no new entity.

Format mix: prose-led with focused code (`Code`, `AnnotatedCode`, `CodeVariants`), one decision widget (`StateMachineWalker` for throw-vs-`Result`), one classification exercise (`Buckets`), one type-level check (`TypeCoding` on the discriminant narrowing), and an `MultipleChoice` gut-check on error mapping. No diagrams of "systems" — the visuals here are a two-channel flow figure and the decision walker.

---

## Lesson sections

### Introduction (no header)

Open on the concrete tension. The `createInvoice` action (carried from L2) has parsed its input and reached its body. Three things can now go wrong, and each is a normal outcome of a *public mutation endpoint*, not a bug:

- the email field failed validation,
- the slug collides with an existing row (DB unique violation),
- the caller has no valid session.

Each must surface to the user *in the form* — "Invalid email" under the field, "That slug is taken" as a banner, "Please sign in" — with the user still on the page. State the senior question implicitly: **does the action `throw` and let something catch it, or does it return a value the form reads?** Preview the answer in one line — the course returns a typed `Result` for failures the user can fix and throws only at the framework edge — and the practical outcome: by the end, the student can write `createInvoice`'s full return contract and decide, for any failure, which channel it takes. Keep warm and brief (one short para + the three-bullet tension). Connect back: "you met discriminated unions in [Ch 005.1]; this is where they earn their keep."

### Two channels for failure

Establish the mental model *before* any type. Teach the dichotomy:

- **Channel 1 — return (`Result`):** expected failures. The action *anticipates* them; they are part of its normal output. The caller (the form) branches on them. Examples: a field is invalid, a unique constraint fired, a business rule rejected the input, the requested record isn't there *and the UI wants to say so inline*.
- **Channel 2 — throw:** the unexpected and the framework-controlled. Two sub-cases the student must not conflate:
  - **Genuine errors** the form can't recover from — DB unreachable, env misconfigured, an invariant violated. These are *programmer/infra* problems; they belong on the global error page via `error.tsx`.
  - **Framework control-flow** — `notFound()` and `redirect()`. These *look* like throws (they raise) but are **conventions, not errors**; the runtime catches them and turns them into a 404 render or a 303. Name them here so "throw" doesn't read as "only for bugs."

State the one-liner the rest of the lesson hangs on: **return the expected, throw the unexpected.** Tie to Code-conventions § Error handling ("Two channels: return the expected, throw the unexpected") — this is the house rule, not a preference.

Why this matters (production stakes, stated plainly): a thrown error inside an action that the form *should* have handled kicks the user to `error.tsx` and **loses everything they typed**. The retype-the-whole-form failure is the concrete cost of getting the channel wrong. This is the pain the `Result` discipline relieves.

**Visual — the two-channel figure.** A small `Figure` wrapping a simple HTML+CSS diagram (per diagrams INDEX: "color-coded segments with callouts" → HTML+CSS, not a graph engine). Left: the action body. Two arrows leave it: a green arrow labeled `return Result` → "form renders inline (user stays)", a red/orange arrow labeled `throw` → "`error.tsx` (global error page)". Annotate `redirect()`/`notFound()` as a third, blue arrow off the throw path tagged "framework convention → 303 / 404, not an error." Pedagogical goal: cement that *throw and return are different exits with different destinations*, and that the destination is what drives the choice. Cap height; horizontal layout. Keep it diagram-as-aid, not a system map.

### The canonical `Result` shape

Introduce the type **incrementally** to control load. Use `AnnotatedCode` over the final type so each field is highlighted with its own one-paragraph rationale, but *narrate the build-up in prose first* so the student sees it grow:

1. The bare split: `{ ok: true; data: T } | { ok: false; error: ... }`. Explain `ok` as the **discriminant** — the single boolean TypeScript narrows on. Connect to Ch 005.1: this is a discriminated union, and `ok` is why `data` and `error` can never coexist (Principle #7, make impossible states unrepresentable). Contrast explicitly with the anti-shape `{ success: boolean; data?: T; error?: E }` (optional-everything) the conventions forbid (§ TypeScript: "`{ ok: true; data } | { ok: false; error }` over `{ success, data?, error? }`") — the optional form lets `data` and `error` both be undefined or both present; the union makes that unrepresentable.
2. Add `error.code` — a *machine-readable*, stable string. Its job: let layers branch programmatically (form picks banner-vs-field rendering by code; analytics groups failures by code).
3. Add `error.userMessage` — a *human-readable* string the form renders verbatim. Its job: the user reads exactly this.
4. Add optional `error.fieldErrors?: Record<string, string[]>` — per-field messages for inline rendering under inputs.

Then show the **whole type once**, exactly as it ships at `lib/result.ts`, via `AnnotatedCode` (the canonical Code-conventions § Error handling block, including the literal `code` union — see Scope note on the code set). Steps highlight: the `ok: true` branch (green), the `ok: false` branch (red), the `code` union (blue), `userMessage` (blue), `fieldErrors` (orange).

Lock the senior framing of the field split: **`code` is the contract between layers; `userMessage` is what the user reads.** Codes are stable and few; messages are human and may change. Reinforce: the type lives in **one file** (`lib/result.ts`), every action imports it, no per-action variants — Principle #5, and the L1 thread "`Result` imported as a type from `@/lib/result`."

`CodeTooltips` candidates on this block: `ok` ("the discriminant — the field TypeScript narrows the union on"), `Record<string, string[]>` ("field name → list of messages for that field"). Keep tooltips to these two; don't over-annotate.

**Type-level check — `TypeCoding`.** Give the student the `Result<{ id: string }>` type and a function that receives a `Result` and must read `.data.id` only after narrowing. Starter has the narrowing missing so `data` access errors; the student adds `if (result.ok)` to make tsc quiet (and optionally a `^?` query under `result.error` inside the `else` to confirm it narrows to the failure branch). Goal: the student *feels* the discriminant do its work — accessing `data` without checking `ok` is a type error, which is the whole point of the union. This is the right widget because the lesson is about the *type*, not runtime (per TypeCoding doc: discriminated unions are its sweet spot).

### `ok` and `err`: the two helpers

Teach the constructors that keep action bodies short and the discriminant impossible to forget. Two tiny pure functions at `lib/result.ts`:

- `ok(data)` → `{ ok: true, data }`
- `err(code, userMessage, fieldErrors?)` → `{ ok: false, error: { code, userMessage, fieldErrors } }`

Show with a plain `Code` block (the helpers are short; no need for AnnotatedCode). Then show the **payoff at the call site** — the `createInvoice` body now reading as intent, via `AnnotatedCode`:

```
if (!parsed.success) {
  return err('validation', 'Check the highlighted fields.', z.flattenError(parsed.error).fieldErrors);
}
// ...mutate...
return ok({ id: invoice.id });
```

Steps: highlight the parse-failure `return err(...)` (this is the line that **upgrades L2's placeholder** — call that out explicitly: "in L2 this was an inline `{ ok: false, error: { fieldErrors: ... } }` placeholder; `err()` is its final form"); highlight `z.flattenError(parsed.error).fieldErrors` and explain the **deliberate choice** (see next paragraph); highlight `return ok({ id })` and note success returns the *ID*, not the row (forward-ref to the "return small" beat).

**The `flattenError`-vs-`treeifyError` reconciliation (a genuine senior beat, flag for the agent).** The `Result.fieldErrors` field is typed `Record<string, string[]>`. Zod's `z.flattenError(error).fieldErrors` produces *exactly* that shape; `z.treeifyError(error)` produces a *nested* tree (`.properties?.field?.errors`) that does **not** fit `Record<string, string[]>`. So the action populates `fieldErrors` with `flattenError(...).fieldErrors`. Teach this as the lesson it is: **pick the error projection that matches your contract's type.** The course's general default is `treeifyError` (deeply nested forms, conventions § Schemas) — but the *flat* `Result.fieldErrors` channel is fed by `flattenError`, because invoice-style forms are one level deep and the field's type says flat. Keep this to one tight paragraph + an `Aside` note; do not turn it into a Zod tangent (Zod was Ch 042's job — name, don't re-teach). **Agent note:** do not copy L2's `treeifyError(...).properties` into the `Record<string, string[]>` slot — it's a type error; this paragraph is the deliberate correction L2 deferred to L3.

### Throw at the framework edge, return everywhere else

This is the **load-bearing decision** of the lesson. Teach the rule, then drill it.

The rule, stated as a one-liner the student memorizes: **throw at the framework edge; return `Result` inside the action body where the form branches on the shape.**

Enumerate both sides concretely:

- **Throw** when:
  - the resource genuinely doesn't exist and the right UX is the 404 page → `notFound()` (framework convention).
  - navigation *is* the outcome → `redirect('/invoices/' + id)` (framework convention; the runtime turns it into a 303). Note in one line that `redirect()` raises to do its job, so it must sit **outside** any `try/catch` (or be re-thrown) — but the *placement/transaction* mechanics are **L5's** job; here it's only an example of "a throw that isn't an error." (Forward-ref L5.)
  - a genuine programmer/infra error occurs with no in-form recovery (DB down, misconfig). Let it propagate to `error.tsx`.
  - (named once, owned later) the auth helper throws/redirects on a missing session — Ch 057's `requireUser` pattern; the framework is the catch site. Name the slot, don't build it.
- **Return `Result`** when the form should render the failure and the user stays on the page: field validation, business-rule rejections (plan limit, suppressed email), unique-constraint conflicts. These are the *common* case for a SaaS mutation.

Make the senior reasoning explicit: the deciding question is **"can the user fix this from where they are?"** If yes → `Result` (they correct the field, retry). If no, or if the right outcome is leaving the page → throw/framework-convention. This single question collapses the whole decision.

**Decision widget — `StateMachineWalker` (`kind="decision"`).** This is the ideal component for a "which channel?" senior filter — it forces the student through the *order a senior asks the questions in*. Do **not** wrap in `Figure`. Proposed walk:

- Root `Question` "A failure just happened in the action body. Who needs to act on it?"
  - Branch "The user can correct it and retry" → `Question` "Is it one specific field, or the whole submission?"
    - Branch "A specific field" → `Leaf` verdict **`return err('validation', msg, fieldErrors)`** — body: renders under the input; `fieldErrors` carries the per-field messages.
    - Branch "A business rule on the whole submission (plan limit, conflict, suppressed)" → `Leaf` verdict **`return err(code, userMessage)`** — body: form-level banner; pick the matching `code`.
  - Branch "Nobody — it's a bug or the infra is down" → `Leaf` verdict **`throw` (let `error.tsx` catch)** — body: programmer/infra error, no graceful in-form recovery.
  - Branch "The right outcome is to send them somewhere / the record is gone" → `Question` "Navigate, or show a 404?"
    - Branch "Navigate to the new/next page" → `Leaf` verdict **`redirect(path)`** — body: framework convention, becomes a 303; not an error.
    - Branch "The resource doesn't exist" → `Leaf` verdict **`notFound()`** — body: framework convention, renders the nearest `not-found`.

Pedagogical goal: the *order* (user-recoverable? → field-or-form? ; not-recoverable? → bug-or-navigation?) is the lesson, not any single leaf — exactly what the walker is for (per its doc: "the lesson lives in the order"). Keep leaf bodies to 1–2 sentences.

**Classification drill — `Buckets`** (`twoCol`), to convert the rule into reflex. Two buckets: **"Return `Result`"** and **"Throw / framework convention"**. Items (each a short failure scenario, inline-code where useful):
- `Result`: "email field fails Zod validation", "slug already taken (unique violation)", "user's plan doesn't include this feature", "recipient is on the suppression list".
- Throw: "database connection refused", "after creating, send the user to the invoice page" (`redirect`), "the invoice ID in the URL matches no row" (`notFound`), "a required env var is undefined at runtime".
Goal: the student sorts ambiguous-feeling cases and discovers the boundary is "user-recoverable inline vs. not." Instructions string: "Sort each failure into the channel the action should use."

### A small, stable set of error codes

Teach the **enumerated `code` set** as a cross-layer contract, not free-form strings. Present the canonical set from Code-conventions § Error handling and explain each in one line:

- `validation` — input failed the schema; pair with `fieldErrors`.
- `conflict` — a uniqueness/state collision (the slug, the duplicate).
- `not_found` — a referenced record is missing *and the action chose to return it as data* (vs. throwing `notFound()`).
- `unauthorized` — **no identity** (not signed in).
- `forbidden` — **identity, but no permission** (signed in, wrong role/org).
- `rate_limited` — too many attempts.
- `internal` — a sanitized stand-in for an unexpected failure the action chose to surface rather than throw.

Two senior points:
1. **Keep the set small** (roughly six to ten for the whole app). Proliferating a bespoke code per action is the smell that the abstraction is wrong — the form can't switch on a hundred codes. If a failure needs a *message*, that's `userMessage`; codes are for *branching*, and there are only a few branches worth having. The app may add a *domain* code where a real product branch exists (e.g. `plan_limit`) — but it earns its place by being something a layer switches on, not by being a unique label.
2. **`unauthorized` vs `forbidden` is the one pair worth getting exactly right** (these map to HTTP 401 vs 403; conventions § Route handlers). State the distinction crisply — *no identity* vs *identity-without-permission* — because juniors routinely conflate them. (Auth itself is Ch 057; here we only fix the two codes.)

Show the `code` union as a small `Code` block (the literal-union type) and note it's part of the `Result` type, so every `error.code` is checked — a typo'd code is a compile error, not a silent runtime surprise (conventions § TypeScript: never `enum`; string-literal unions).

Reconciliation flag for the agent: the **chapter outline** floated a slightly different set (`unauthenticated`, `plan_limit`). The **Code conventions are authoritative** for the shipped `Result` type — teach `unauthorized`/`forbidden`/`internal` as the canonical seven, and present `plan_limit` only as an *example* of a sanctioned domain extension, not as a core member. (See Scope.)

### Map known errors to codes; never leak the raw error

Teach the boundary discipline for turning *thrown* DB/library errors into *returned* `Result` failures — and the security reason behind it.

The anti-pattern, shown first via `CodeVariants` (before/after, `del`/`ins`):
- **Variant "Leaks internals":** `catch (e) { return err('internal', e.message); }` — putting `e.message` in `userMessage` ships Postgres internals (constraint names, column names, sometimes values) to the browser. First-sentence framing: "leaks the database schema to anyone with the form open."
- **Variant "Mapped and sanitized":** catch, detect the known case, return a *typed code + human message*, log the raw error for the operator, re-throw the unknown. First-sentence framing: "the user gets a clean message; the operator gets the full error in logs."

Then teach the **catch-map-rethrow pattern** with `AnnotatedCode` on the `createInvoice` mutation seam:

```
try {
  const [invoice] = await db.insert(invoicesTable).values(parsed.data).returning();
  return ok({ id: invoice.id });
} catch (e) {
  if (isUniqueViolation(e)) return err('conflict', 'That slug is already taken.');
  throw e;
}
```

Steps: highlight the `try` mutation; highlight `isUniqueViolation(e)` → `err('conflict', ...)` and explain this maps a Postgres `23505` to the `conflict` code; highlight `throw e` and state the rule — **catch what you can name and handle; re-throw everything else** to `error.tsx`. Senior reflex stated: known failure → `Result`; unknown failure → propagate.

Key placement points:
- `isUniqueViolation` (the Postgres-error detector) lives in **`/lib`** as a reusable, pure-ish helper — name it, don't implement it here. **Drizzle/Postgres error detection is Ch 039's territory** (chapter framing: "Chapter 039 owns the database side; this lesson names it"). The lesson *uses* the helper; the agent must not teach how to read the Postgres code in depth — one sentence max. **Accuracy note (verified June 2026):** current Drizzle wraps DB failures in a generic "Failed query" error and exposes the underlying Postgres error (carrying `code: '23505'`) on the **`.cause`** property — so a naive top-level `e.code === '23505'` check is *wrong* on the current line. Do **not** show `e.code === '23505'` as if it reads off the caught error directly; keep the detail inside the named `isUniqueViolation` helper (Ch 039) and have the action call it abstractly. This is exactly why the detector is a `/lib` helper and not inlined.
- The **divergence at the boundary** (conventions § Error handling: "User-facing messages and operator-facing records diverge at the wrapper, never at the UI"): the `catch` is where the user-message and the operator-log split. The form never invents "Something went wrong" — if `userMessage` is missing, the bug is in the *action*, not the form.

`MultipleChoice` gut-check after this section: present a `catch` block and ask which return is correct (options: `return err('internal', e.message)` [leaks], `return err('conflict', 'That slug is taken.')` [correct for a known unique violation], `throw new Error(e.message)` [wrong channel for a user-fixable conflict], `return { ok: false, error: 'conflict' }` [breaks the contract — string not object]). Goal: catch the two classic mistakes (leaking the raw message; using the wrong channel) in one question.

### `userMessage`: one source of truth for failure copy

Short section locking the copy discipline. Each `Result` failure carries a human string the form renders **verbatim** — no transformation, no translation at the UI, no UI-invented fallback. Division of labor (Principle #5, one source of truth per concern):

- The **schema** authors *validation* messages (Ch 042.5) — they ride along in `fieldErrors`.
- The **action** authors *business-rule* messages (the `userMessage` on `conflict`, `plan_limit`, etc.).
- The **form** authors *nothing* — it displays what it's given.

The reflex: if the form is reaching for a hardcoded "Something went wrong," the action failed to return a `userMessage`, and the fix is in the action. State the production consequence: UI-invented error copy drifts, isn't reviewable, and can't be localized centrally. Keep to a few sentences; this is a principle reminder, not a new mechanic. (i18n of these strings is a later-unit concern — name once, don't teach.)

### Return small: hand back the ID, not the row

Close the success side of the contract. On `ok`, `data` should be the **minimal** thing the caller needs — typically the created entity's `id` (or `null` for fire-and-forget mutations) — **not** the full Drizzle row.

Reasoning (production stakes): the `Result` crosses the wire as the RSC payload on *every* mutation. Returning a fat row (all timestamps, every column, possibly relations) ships bytes the client doesn't need and couples the wire shape to the table shape. The senior move: return `ok({ id })`; the client re-reads fresh data via the **revalidated cache** — which is what `revalidatePath` (L5) sets up. One-line forward-ref to L5: "the cache refresh that makes 'return just the ID' work is the next lesson's job." Also recall L1's serialization thread: a raw Drizzle row with prototype methods can fail serialization anyway — another reason to project to a plain `{ id }`.

Keep this short; it's the symmetric bookend to "never leak the raw error" — both are about *what crosses the wire from an action*.

### The form sees the contract (forward reference)

A **brief, explicitly-forward** section so the student sees the payoff without it being taught here. Show, in one `Code` block, the shape Ch 044 will wire:

```
const [state, formAction, pending] = useActionState(createInvoice, null);
// state?.ok === false → render state.error.userMessage (banner)
//                     → render state.error.fieldErrors under each field
```

State plainly: **this is Ch 044.4's job to wire; the contract it reads is what this lesson just fixed.** The point is motivational — "every field you just defined has a consumer." Mention in one line that `useOptimistic` (Ch 044.6) rolls back when the action returns `ok: false`, i.e. the optimistic layer also subscribes to the `ok` discriminant. Do not teach `useActionState` mechanics (the previous-state-first signature was named in L1; full wiring is Ch 044). `Term` tooltip on `useActionState`: "React 19 hook that owns a Server Action's pending state and latest return value. Wired in Ch 044." Keep the whole section to a short para + the one block.

### Recap / external resources

One-paragraph recap reasserting the two-channel rule and the field roles (`ok` discriminant; `code` for branching; `userMessage` for the user; `fieldErrors` for inline). Optional `ExternalResource` cards: the Zod error-formatting page (for `flattenError`/`treeifyError`), and the React `useActionState` reference (forward reading for Ch 044). Keep optional and minimal — the lesson is self-contained.

---

## Scope

**This lesson owns:** the canonical `Result<T>` type and its four fields; the `ok`/`err` helpers at `lib/result.ts`; the throw-vs-return decision rule and its decision tree; the small standardized `code` set; the catch-map-rethrow pattern that converts known thrown errors into `Result` failures; the never-leak-the-raw-error and `userMessage`-as-single-source disciplines; return-the-ID-not-the-row. It **formalizes** L2's provisional inline failure placeholders into the real `Result`.

**Prerequisites to recall briefly (redefine in one line, do not re-teach):**
- Discriminated unions and the `ok`-discriminant narrowing pattern — taught Ch 005.1; here it's the *shape* of `Result`.
- `safeParse` returning `{ success, data | error }`, and `Object.fromEntries(formData)` — taught Ch 042 / L2; this lesson consumes `parsed.success`/`parsed.error`, doesn't re-explain parsing.
- The five-seam action skeleton (parse → authorize → mutate → revalidate → return) and `createInvoice`/`invoicesTable` running example — L1/L2; this lesson fills seam 5 and upgrades seam 1's failure branch.

**Explicitly out of scope (name once, defer):**
- **Form-side consumption** of the `Result` — `useActionState` wiring, rendering `userMessage`/`fieldErrors`, the `name`↔key contract → **Ch 044.4** (shown here only as a forward-reference contract).
- **`useOptimistic` rollback** on `ok: false` → **Ch 044.6** (named once).
- **The Postgres unique-violation detector** (`isUniqueViolation`, reading `23505`) → **Ch 039 owns the DB-error side**; this lesson names and *uses* the helper, doesn't implement it.
- **Auth's throw/redirect on missing session** and the `authedAction` wrapper → **Ch 057** (the `unauthorized`/`forbidden` *codes* are fixed here; the *enforcement* is not).
- **`redirect()`/`notFound()` placement, transactions, and `revalidatePath`** mechanics → **L5** (referenced here only as examples of framework-convention throws).
- **Thin-action / pure-`/lib` structure** (Principles #3/#5 in full) → **L4** (Principle #5 is *touched* here as "one shared `Result`, no parallel variants," but the directory/wrapper discussion is L4's).
- **i18n / localization** of `userMessage` strings → later unit (named once).
- **The error-code set divergence:** the chapter outline floated `unauthenticated`/`plan_limit`; the **Code conventions `Result` type is authoritative** — teach `validation, conflict, not_found, unauthorized, forbidden, rate_limited, internal` as canonical; present `plan_limit` only as an example of a sanctioned domain extension.

---

## Code-convention alignment notes (for downstream agents)

- Use the **exact `Result<T>` and `ok`/`err` signatures** from Code-conventions § Error handling. The `code` union is the seven listed there. Do not invent `unauthenticated`.
- `Result` and helpers live at **`lib/result.ts`**; import as `import { ok, err } from '@/lib/result'` and `import type { Result } from '@/lib/result'` (type-only import per § Imports / `verbatimModuleSyntax`).
- **`fieldErrors` is fed by `z.flattenError(parsed.error).fieldErrors`** (matches the `Record<string, string[]>` field type). This is a deliberate divergence from the course's general `treeifyError` default and from L2's placeholder — flag it in-prose so it reads as intentional.
- Single quotes; 2-space indent; `type` not `interface`; never `enum` (the `code` set is a string-literal union); arrow functions for `ok`/`err` bound to `const` and **explicit return types** on these exported helpers (§ Function form / TypeScript).
- Server Action naming stays verb+noun, no `Action` suffix (`createInvoice`) — L1 thread.
- Error-mapping helper (`isUniqueViolation`) referenced as a `/lib` helper with a type-guard signature (`function isUniqueViolation(e: unknown): e is …`) — *named*, not implemented (§ Error handling: narrow `unknown` with `instanceof`/normalizer; the detector is Ch 039's).
- **Deliberate pedagogical divergence:** code samples may show seams 1 and 3–5 as commented/elided to keep focus on the return contract; mark elisions clearly so agents downstream don't treat a snippet as a finished action (consistent with L1's "deliberately non-working skeleton" convention).
