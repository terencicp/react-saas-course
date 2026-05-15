# Chapter 7.2 — Server Actions: pedagogical approach

## Concept 1 — The `"use server"` seam: an import becomes an opaque-ID POST

**Why it's hard.** The student reads `await createInvoice(formData)` inside a Client Component and parses it as a normal function call. The seam is invisible — no `fetch`, no URL, no JSON.stringify in sight — and so the *trust boundary* the call crosses also goes invisible. The senior's mental model has to install at the directive: `"use server"` is not decoration. It marks the line where the framework rewrites the imported reference into an opaque ID, the runtime POSTs the serialized arguments to that ID, the server resolves the ID back to the function, and the return value serializes back. Once the student sees the round-trip, the rest of the chapter (parse on entry, never trust the input, authorize before any DB) earns its weight.

**Ideal teaching artifact.** Concept archetype rendered as a **scrubbable two-side round-trip animation** in `DiagramSequence`. Five frames the student steps through with the slider: (1) the Client Component source — `import { createInvoice } from '@/app/invoices/actions'; await createInvoice(formData);` — with the import line tagged "looks local"; (2) build-time rewrite — the import line resolves to an opaque ID (`a/3f9e…`), the function body has been stripped from the client bundle (the bundle pane shrinks visibly); (3) the call — the runtime serializes `formData` into an RSC payload, POSTs it to `/?_rsc=…` with the action ID in the header, the call is now a bare HTTP request a curl-from-the-terminal could replay; (4) the server side — Next.js resolves the action ID back to the imported function, runs the body in a Node process, the function reads cookies/db with full server access; (5) the return — the result is serialized back into the RSC payload, the Client Component's awaited value resolves. Across every frame, a "trust boundary" line sits between the client lane and the server lane — the student sees the call cross it visibly. The closing line names the principle: the directive is the seam, and every input that crosses the seam is as untrusted as a curl payload.

**Engagement.** A `MultipleChoice` round of four prompts after the scrub: "what does the client bundle ship for the action's body?" (an opaque ID, not the source); "what URL does the call hit?" (a framework-managed POST endpoint, not the action's filename); "if the user disables JS, can a Server Action invoked from a `<form action={action}>` still run?" (yes, the POST submits natively); "what changes about the trust model versus a tRPC `mutation.useMutation` call?" (nothing — same public POST, same untrusted input). Wrong-answer feedback names the seam misconception each prompt prevents.

**Components.**
- `DiagramSequence` hosting the five-frame round-trip animation. Each frame is a hand-coded SVG inside a `Figure` showing the client lane on the left, the trust boundary in the middle, the server lane on the right, with the active step's elements highlighted.
- `MultipleChoice` for the four-prompt round.
- `Aside` (`note`) below the sequence: "`'use server'` is the seam, not a decoration. The function reference is an opaque ID; the call is a public POST; the input is as untrusted as anything else on the network."

**Project link.** Every Server Action in 7.6 (`createInvoice`, `updateInvoice`, `deleteInvoice`) sits behind this seam; the parse-on-entry discipline of Concept 5 only earns its weight if the student already sees the wire crossing.

---

## Concept 2 — The serializable-args contract: what crosses the wire, what stays home

**Why it's hard.** The student's typed-domain mental model says "I have an `Invoice` row, I'll pass it to the action." At the seam, that row goes through the RSC serializer; the row's prototype methods (Drizzle's `toJSON`-style helpers, any `Date` field's `getTime`, custom getters from a `class`) either get silently stripped or cause a build-time error the student doesn't recognize. The contract is small but structural: primitives, plain objects, arrays, `Map`/`Set`/`Date`, typed arrays, `FormData`, `File` cross; functions, class instances, DOM nodes, `WeakMap`/`WeakSet` don't. Without the catalog as a *named contract*, the student writes `await updateInvoice(invoiceRow)` from a Client Component, ships, and discovers the failure at the first prototype-bearing field.

**Ideal teaching artifact.** Reference archetype delivered as a **two-column wire contract table** rendered as a `Figure`-wrapped HTML table with three columns: *value shape* (primitive, plain object, `FormData`, `File`, `Map`/`Set`/`Date`, typed array, function, class instance, Drizzle row, DOM node), *crosses the wire?* (a green check or a red cross), and *if no, what to send instead* (a primitive ID; `Object.fromEntries(formData)` then re-validate; a plain object via `JSON.parse(JSON.stringify(row))`; not applicable). The senior reflexes land at the bottom of the table as two one-liners: *for forms, take `FormData` and parse on entry; for imperative calls, take a plain object or a primitive ID — never a row with methods.*

**Engagement.** A `Buckets` sort: ten argument shapes ("a `Date` for `dueAt`", "an `invoiceId: string`", "the full `invoiceRow` from `db.select()`", "a `File` from a file input", "an event handler `() => onComplete()`", "a `Map<string, number>` of line-item totals", "the user's `Session` instance returned from `getServerSession`", "a `FormData`", "a plain `{ status: 'paid', paidAt: Date }`", "a DOM `<input>` reference") into "crosses the wire" vs "doesn't cross — needs reshaping." Wrong-answer feedback names the failure mode (silent strip, build error, runtime serialization throw).

**Components.**
- `Figure` wrapping a hand-coded HTML wire-contract table.
- `Buckets` for the ten-shape sort.
- `Aside` (`caution`) below: "the wire is the structured-clone-plus-React-extensions superset; a Drizzle row's prototype methods aren't part of it. Send the ID, refetch on the server."

**Project link.** The 7.6 update flow takes the invoice ID as a primitive arg plus a parsed plain object — never the full row. The student should never see a row passed across the seam in the project starter.

---

## Concept 3 — Where actions live and how they're called: file-level default, three call shapes

**Why it's hard.** The student reading the docs encounters two declaration sites (file-level `"use server"` at top of module vs. inline `"use server"` inside a Server Component function body) and three call shapes (form `action` prop, `useActionState` wrap, imperative `await action()`) without a frame for which is the default. The result is shotgun-style code: inline actions inside Client Components (a build error), file-level modules without the directive (the actions become regular imports the client bundle ships), or `useActionState((prev, fd) => action(fd), null)` rewritten into the wrong signature because the framework-bound first argument was never named.

**Ideal teaching artifact.** Pattern archetype delivered as a **declaration-site decision rule plus a three-up call-shape catalog**. Beat one is a one-line rule rendered in `Aside` (`tip`): *file-level `'use server'` in `/app/.../actions.ts` or `/lib/actions/<entity>.ts` is the default; inline actions only earn their weight when the action closes over a server-only value the Client Component shouldn't see, and they live only inside Server Components.* Beat two is a three-tab `CodeVariants` with the same `createInvoice` action invoked three ways: tab one, `<form action={createInvoice}>` (the form pattern, forwarded to 7.3.2); tab two, `const [state, formAction] = useActionState(createInvoice, null)` with the `(prevState, formData) => ...` signature pinned and the `prevState`-first parameter highlighted as the framework-bound argument students mis-write (forwarded to 7.3.3); tab three, `await createInvoice(formData)` inside an event handler for the imperative case (delete buttons, optimistic toggles). Each tab carries a one-line trigger: "use this when the form is the submit primitive," "use this when the form needs pending/result state inline," "use this when the action runs outside a form submit."

**Engagement.** A `MultipleChoice` round of four scenarios — "a delete button on a list item that confirms then runs the action" (imperative); "a multi-field create form with field errors rendered under inputs" (`useActionState`); "a checkbox toggle that progressively enhances to a no-JS form post" (`<form action={...}>`); "an inline action that closes over the rendered user's session role" (file-level is wrong; inline inside the Server Component is the answer). Wrong-answer feedback names which call-site contract is being violated.

**Components.**
- `Aside` (`tip`) for the declaration-site rule.
- `CodeVariants` with three tabs for the call-shape catalog.
- `MultipleChoice` for the four-scenario round.

**Project link.** 7.6.4 wires the create and edit forms with `useActionState`, the delete with imperative `await`, and the no-JS fallback with the bare `action` prop — three of the same shapes the student practices here.

---

## Concept 4 — The five-seam action shape: a fixed body in a fixed order

**Why it's hard.** Without a canonical body shape, every action grows a different control flow: parse here, log there, write the row, then check authorization, then realize the cache wasn't invalidated. Reviewers can't scan the file at speed, and the failure modes (logging unparsed input, hitting the DB before authorizing, revalidating before the write) appear as one-off bugs instead of as a missing structural rule. The five seams — parse, authorize, mutate, revalidate, return — are the rule. The order is non-negotiable; parse is first because everything downstream depends on typed input, authorize is second because business rules can't run without knowing who's asking, revalidate fires after the write because revalidating against unchanged state ships stale data.

**Ideal teaching artifact.** Pattern archetype delivered as a **stencil-and-fill scaffolded sequence** in `AnnotatedCode`. The student sees one canonical action body — `createInvoice` — rendered with five labeled regions (`// 1. parse`, `// 2. authorize`, `// 3. mutate`, `// 4. revalidate`, `// 5. return`) and a single line of code in each region. The annotation track walks the regions in order: (1) why parse is first (everything below depends on `parsed.data`, logging unparsed input leaks PII, hitting the DB on bad input wastes a query); (2) why authorize is second and what the one-line shape looks like before 10.2 lands the wrapper; (3) the database call as the seam where the `db.transaction` pattern (Concept 10) will land; (4) `revalidatePath` *after* the mutation, not before; (5) the `Result` return that Concept 6 owns. Below the annotated body, a one-line summary: *every action in the course follows this five-seam order; if a line falls outside the order, it's mis-placed.* The shape is the chapter's spine — Concepts 5 through 10 each fill in one seam.

**Engagement.** A `Sequence` drag-to-order drill: the student sees the five seams shuffled (with a sixth distractor — `console.log(formData)`) and orders them. Wrong placements produce targeted feedback ("revalidating before the mutation revalidates against unchanged state — the user navigates back and sees the old list," "logging the input before parse leaks unvalidated PII to production logs"). The distractor — `console.log` of the raw input before parse — has no correct slot and the feedback names why.

**Components.**
- `AnnotatedCode` walking the five-seam stencil with one annotation per region.
- `Sequence` for the drag-to-order drill, with the `console.log` distractor included.
- `Aside` (`note`) below the stencil: "five seams, this order, every action. The rest of the chapter fills in each seam."

**Project link.** Every action the student writes in 7.6.3 (`createInvoice`, `updateInvoice`, `deleteInvoice`) is laid out in this exact five-seam order; the project's reviewer checklist names the order explicitly.

---

## Concept 5 — `safeParse` on entry: server-side validation isn't optional, even with perfect client validation

**Why it's hard.** The student finished Chapter 7.1 with a full Zod schema and 7.3 will land `useActionState` plus the constraint API for client-side validation. The reasonable conclusion — "the schema runs on the form, the action just writes the row" — is wrong, and the failure modes are concrete: a stale client running an older schema after a deploy, a JS-disabled progressive-enhancement submit that skips client validation, a curl-from-the-terminal call that bypasses the form entirely. The teaching has to make the *gap* between client and server validation visible, not state it as a rule.

**Ideal teaching artifact.** Misconception-first ambush delivered as a **three-attacker round** in `DiagramSequence`. Three frames the student steps through, each showing a different caller hitting the same `createInvoice` action: (1) the in-app form — client validation ran, all fields valid, the action's parse passes trivially; (2) the in-app form running an *older client bundle* after a schema deploy that added a required `customerId` field — client validation says "valid" against the old rules, the action receives a payload missing the field; (3) a curl request — `curl -X POST -F email=x -F isAdmin=true` — no client validation, no UI at all, raw payload hits the action body. For each frame, two parallel lanes: lane one, the action *without* `safeParse` on entry, hitting the DB with `undefined` for `customerId` and a unique-constraint failure flying back as a 500; lane two, the action *with* `safeParse` on entry, returning a typed `Result` failure with field errors and the row never written. The visual is the diff: one lane breaks per attacker, the other holds. Closing rule: every action parses its input first; the schema is the contract regardless of who called.

**Engagement.** A `MultipleChoice` PR-review round: "a teammate's PR adds an action that reads `formData.get('email')` directly into a `db.insert` because `useActionState` already validates client-side. The reviewer asks for what?" — correct answer names `Object.fromEntries(formData)` plus `Schema.safeParse` as the entry line, with the three failure modes (stale bundle, no-JS, non-browser caller) cited; wrong answers name symptom mitigations ("add a unit test for the empty case," "tighten the form's HTML5 constraints").

**Components.**
- `DiagramSequence` hosting the three-attacker frames, each frame a hand SVG inside `Figure` with the two lanes (without parse / with parse) drawn parallel.
- `MultipleChoice` for the PR-review round.
- `Aside` (`caution`) below: "client validation is UX; server validation is correctness. Every action parses its input on entry, no exceptions."

**Project link.** Every action in 7.6.3 opens with `const parsed = Schema.safeParse(Object.fromEntries(formData)); if (!parsed.success) return err(...);` — the student writes the line from the reflex installed here, not from the project brief.

---

## Concept 6 — The `Result<T>` shape: one discriminated-union contract every action returns and every form reads

**Why it's hard.** The student reaches `if (!parsed.success) return ???` and faces a contract decision that compounds through the rest of the chapter and Unit 7. Throw the validation error? Return a string? Return `{ error: '...' }`? Return `{ errors: { email: 'invalid' } }`? Each variant ships and each form layer evolves a different reader. By the third action, the codebase has three error shapes and the form components can't share a `<FieldError>` primitive. The senior posture is structural: declare *one* `Result<T>` shape in `/lib/result.ts`, every action returns it, every form's `useActionState` reads it. The teaching has to land the shape *before* it's needed, not as a refactor after the third action drifts.

**Ideal teaching artifact.** Pattern archetype delivered as a **type-and-helpers walkthrough** in `AnnotatedCode`, paired with a small **shape catalog**. Beat one is the type declaration:

`type Result<T> = { ok: true; data: T } | { ok: false; error: { code: string; userMessage: string; fieldErrors?: Record<string, string[]> } }`

annotated field-by-field — the `ok` discriminator (Principle #7 — impossible states unrepresentable, the form can't render `data` and `error` simultaneously); the `data` payload on success (typically the created entity's ID, not the full row — the cross-the-wire reflex from Concept 2); the `code` field as the machine-readable failure category; the `userMessage` as what the user reads; the optional `fieldErrors` from `z.treeifyError` for inline rendering. Beat two is the two helpers — `ok(data)` and `err(code, userMessage, fieldErrors?)` — rendered in a small `Code` block, with the action's failure branch rewritten as `return err('validation', 'Check the highlighted fields.', tree.properties);`. The closing line names the principle: declared once in `/lib/result.ts`, every action and every form reaches for the same definition; no parallel `{ success, error }` variants invented per action.

**Engagement.** A `Dropdowns` exercise on a small action stencil — given a `createInvoice` with five blanks (the parse failure return, the unique-violation catch return, the success return, the auth-missing throw, the field-error reader on the form side), the student picks the right `Result` constructor or throw for each. The exercise enforces the contract by repetition: five fills, five times the same shape.

**Components.**
- `AnnotatedCode` walking the type declaration with one annotation per field.
- `Code` block for the two helpers and the rewritten failure branch.
- `Dropdowns` for the five-blank stencil.
- `Aside` (`note`) below: "one `Result<T>` shape, declared in `/lib/result.ts`, returned by every action, read by every form. Drift starts the first time someone invents a parallel shape."

**Project link.** The 7.6 starter ships `/lib/result.ts` with the type and the two helpers; every action the student writes in 7.6.3 returns this shape, and the `<FieldError>` and form-banner components in 7.6.4 read it. The contract is locked here so 7.3.3's `useActionState` wiring is mechanical.

---

## Concept 7 — Throw at the framework edge, return `Result` inside: the decision tree

**Why it's hard.** The student now has two channels — `throw` and `return Result` — and no rule for which fires when. The naive reach is to throw on every failure ("an error is an error"), which kicks the user to the route's `error.tsx` boundary on every validation miss and loses the form state — the user retypes everything because "Email is invalid" was a 500. The inverse — return `Result` for everything — is also wrong: a missing session, a non-existent resource, or a genuinely broken database has no graceful in-form recovery; throwing is the right signal. The decision is structural and the rule is one line, but it has to land as a *trigger*, not a list.

**Ideal teaching artifact.** Decision archetype delivered as a **failure-routing decision matrix** rendered as a `Figure`-wrapped HTML table. Two axes: *who handles the failure* (the framework's `error.tsx` / a redirect / a `notFound` page, vs. the form layer rendering inline) and *can the user correct it on the same page* (yes vs. no). The four cells produce the rule: yes-and-form-layer → return `Result` (validation failures, business-rule rejections, unique-constraint conflicts the user can resolve by editing); no-and-framework → `throw` (`notFound()` for missing resources, `redirect()` for navigation as control flow, unhandled `throw` for genuine programmer errors like a misconfigured env). Below the matrix, a one-line rule: *throw at the framework edge, return `Result` inside the action body.* Beside it, three callouts: `notFound()` and `redirect()` are framework conventions, not exceptions, even though they throw under the hood; the auth helper in 10.2 will throw on missing session — the framework is the catch site; an unhandled exception inside the action body returns a generic 500 and triggers `error.tsx`, which is correct only when the failure is genuinely unrecoverable.

**Engagement.** A `Buckets` sort: ten failure scenarios ("Zod parse fails on the input", "the user's session expired", "the requested invoice doesn't exist", "a unique-constraint violation on the slug", "the database is down", "the user lacks permission for this org", "the create succeeded and we want to navigate to the new record's detail page", "the env is missing `DATABASE_URL`", "the user's plan doesn't permit this action", "a network blip retrying the action races the first call") sorted into "throw" vs "return `Result`." Wrong-answer feedback names whether the form layer can render the failure inline.

**Components.**
- `Figure` wrapping a hand-coded HTML decision matrix.
- `Buckets` for the ten-scenario sort.
- `Aside` (`tip`) below: "throw at the framework edge, return `Result` inside. The form layer can't render an `error.tsx` redirect."

**Project link.** The 7.6 actions throw on auth-missing and on `notFound`-style record lookups; everything else (validation, unique-constraint conflicts, business-rule rejections) returns `Result`. The student reaches for each from this concept's matrix.

---

## Concept 8 — Map known errors to typed codes: never leak the raw database error

**Why it's hard.** The naive failure path returns the database error message verbatim — `{ ok: false, error: dbError.message }` — and ships `'duplicate key value violates unique constraint "invoices_slug_unique"'` to the form. The user reads database internals; the codebase leaks schema details to anyone who can hit the action; the form layer can't programmatically branch on "this was a unique-constraint failure" because the only signal is a substring match on a Postgres error message. The senior reach is structural: catch the raw error in the action body, map known cases to typed codes (`23505` → `code: 'conflict', userMessage: 'That slug is already taken.'`), log the raw error for the operator, return only the sanitized shape. The mapping helper lives in `/lib`; the action calls it. The student needs to feel the *quality* difference between the leaky and the mapped form, not just be told.

**Ideal teaching artifact.** Misconception-first ambush delivered as a **two-action wrong-by-default contest** in `CodeVariants`. Tab one: a `createInvoice` action with `try { await db.insert(...).returning() } catch (e) { return { ok: false, error: { code: 'internal', userMessage: e.message } } }`. The fixtures pinned below show three cases run against it: a valid create (passes), a duplicate slug (returns `'duplicate key value violates unique constraint "invoices_slug_unique"'` as the user-facing message), and a connection drop (returns the raw connection-refused error). The reveal: the form renders database internals to the user. Tab two: the same action with `} catch (e) { if (isUniqueViolation(e)) return err('conflict', 'That slug is already taken.'); throw e; }` — the mapping helper from `/lib/db/errors.ts` named once. The same fixtures: the duplicate slug case now returns `code: 'conflict'` with a clean user message; the connection drop re-throws to `error.tsx` (because there's no graceful in-form recovery). The closing rule: catch what you can name and handle, let everything else propagate; the mapping helper is a `/lib` pure function the action calls.

**Engagement.** A `MultipleChoice` round of four mappings — "Postgres `23505` (unique violation)" → `code: 'conflict'`; "Postgres `23503` (FK violation pointing at a deleted parent row)" → `code: 'not_found'` (the parent vanished mid-flight); "a generic `Error: connection refused`" → re-throw to `error.tsx`; "a Zod parse failure" → `code: 'validation'` (already handled in seam 1, not in the catch). Wrong-answer feedback names what the form would render in each case.

**Components.**
- `CodeVariants` with two tabs for the leaky-vs-mapped contest, each tab with the three pinned fixtures.
- `MultipleChoice` for the four-mapping round.
- `Aside` (`caution`) below: "the raw error goes to the operator (logs); the typed code goes to the form. Never both, never the wrong way around."

**Project link.** The 7.6 starter ships `/lib/db/errors.ts` with `isUniqueViolation` and `isForeignKeyViolation` helpers; the create and update actions catch both. The 7.6.4 form's banner-level error reader branches on `code === 'conflict'` versus `code === 'validation'` to render the right shape.

---

## Concept 9 — Thin actions, pure `/lib`, no parallel wrapper: Principles #3 and #5 introduced together

**Why it's hard.** This concept introduces two architectural principles at the moment they earn their weight, and they pull in opposite directions if read individually. Principle #3 (pure functions in `/lib`, side effects at named boundaries) tells the student to *extract*; Principle #5 (use the framework's conventions, don't invent parallel ones) tells the student to *not extract* a generic `safeAction(schema, fn)` wrapper that competes with the platform. The student who reads only #3 ends up with a deep `/lib` tree and a clean action body; the student who reads only #5 keeps every line in the action and never sees the pure-helper extraction. Both miss the point. The senior posture is layered: extract the *pure* business logic into `/lib`, keep the *seams* (parse, authorize, revalidate, return) in the action body, and resist the urge to abstract the seams themselves into a wrapper because the small repetition is a feature for the reviewer.

**Ideal teaching artifact.** Decision archetype delivered as a **three-design contest** in `CodeVariants` showing the same `createInvoice` flow three ways. Tab one: **everything in the action** — `parse → authorize → calculate total → check business rules → db.insert → revalidate → return`, all in one 60-line function. The action body is annotated as "long, hard to test (every test needs a DB), the calculation logic is locked inside the seam." Tab two: **the wrapper trap** — a `safeAction(InvoiceSchema, async (data, ctx) => { ... })` wraps the action with parse and a pretend `Result` shape; the action body collapses to ten lines but the call site reads as a custom DSL nobody else in the React 19 ecosystem speaks, the framework's static analysis loses the action signature, and the parse line is no longer visible at the call site. Annotated as "Principle #5 violated — competing with the platform's convention." Tab three: **the senior reach** — the action body keeps the five seams inline (parse, authorize, mutate, revalidate, return) but extracts the pure calculation (`/lib/invoices/calculate-total.ts`), the policy predicate (`/lib/invoices/policy.ts`), and the data-access (`/lib/invoices/repository.ts`) into `/lib`. The action becomes a thin orchestration; the pure helpers are unit-testable without a database; the seams stay visible. Annotated as "Principle #3 honored, Principle #5 honored, the carve-out for `authedAction` is named for 10.2." Below the three tabs, a small `Figure`-wrapped directory tree showing the canonical layout: `/app/<route>/actions.ts` (thin actions), `/lib/<feature>/{calculate, policy, repository}.ts` (pure helpers), `/lib/result.ts` (the shared shape), `/lib/db/errors.ts` (the mapping helpers from Concept 8).

**Engagement.** A `Buckets` sort: twelve code fragments ("`return ok({ id: invoice.id })`", "`function calculateInvoiceTotal(items)`", "`if (!session) throw new UnauthorizedError()`", "`await db.insert(invoices).values(...)`", "`function canCreateInvoice(user, org)`", "`revalidatePath('/invoices')`", "`await stripe.charges.create(...)`", "`isUniqueViolation(error)`", "`Schema.safeParse(Object.fromEntries(formData))`", "`async function createInvoice(formData)`", "`function applyDiscount(items, code)`", "`db.transaction(async tx => ...)`") sorted into "action body (`/app/.../actions.ts`)" vs "pure helper (`/lib/<feature>/`)" vs "side-effect helper (`/lib/db/`, `/lib/email/`)." Wrong-answer feedback names which principle is violated: a pure calculation in the action body misses #3; a database call in `/lib/<feature>/calculate.ts` poisons the helper's purity; a generic `safeAction` wrapper would be a #5 smell.

**Components.**
- `CodeVariants` with three tabs for the design contest.
- `Figure` wrapping a hand-coded HTML directory tree (or `FileTree` if the visual reads cleanly) for the canonical layout.
- `Buckets` for the twelve-fragment sort.
- `Aside` (`note`) below: "thin actions, pure helpers in `/lib`, no parallel wrapper. Auth (10.2) and billing (12.2) are the named carve-outs that earn their weight; everything else stays inline."

**Project link.** The 7.6 starter ships `/lib/invoices/{calculate-total, policy, repository}.ts` as stubs the student fills; the actions in `/app/(app)/invoices/actions.ts` are thin orchestration. The reviewer's "is this a `/lib` helper or an action body?" rule from this concept maps onto the project's file layout.

---

## Concept 10 — After the write: `revalidatePath`, transactions, and the idempotency-key slot

**Why it's hard.** The action wrote the row and is about to return `ok({ id })`. Three independent concerns still need handling and the student treats them as one. (1) The cached list-of-invoices page must refresh — `revalidatePath('/invoices')` after the mutation, not before, because revalidating against unchanged state ships stale data after the user navigates back. (2) The mutation that writes to two tables (invoice plus its line items) must be atomic — `db.transaction(async tx => ...)`, with the production landmine that *external calls inside the transaction diverge state on rollback* (Stripe charge succeeds, transaction rolls back, the database and Stripe disagree forever). (3) The user's accidental double-click must not produce two rows — the idempotency-key slot, foreshadowed for 12.1, written into the form here as a hidden `crypto.randomUUID()` field that the action reads. The teaching has to surface the three as separate concerns with a fixed order, not let them blur into "just stuff that fires after the write."

**Ideal teaching artifact.** This concept needs two paired beats — the post-write order is one model, the transaction-with-external-call landmine is another, and conflating them loses the second beat.

**Beat one — the post-write sequence.** Pattern archetype rendered in `AnnotatedCode` extending the five-seam stencil from Concept 4 with the now-filled-in fourth and fifth seams. The annotation track walks: the `db.transaction` block wrapping the multi-table mutation (invoice plus line items, both tables tagged); the transaction's `tx` parameter replacing `db` for every write inside; the explicit *outside-the-transaction* placement of any external call (`await emailReceipt(invoice.id)` after the `await db.transaction(...)` returns, never inside); the `revalidatePath('/invoices')` call after the transaction commits but before the `Result` returns; the `redirect('/invoices/' + id)` (when used) at the very end of the function, named as a framework convention not an exception. A side callout names the forward links: the full cache-invalidation tree lives in 5.4.6, transaction isolation levels in 6.4.4, idempotency keys in 12.1.

**Beat two — the transaction-rollback landmine.** Misconception-first ambush rendered in `DiagramSequence` showing two timelines for the same action. Lane one (the bug): `db.transaction(async tx => { await tx.insert(invoices).values(...); await stripe.charges.create({...}); })` — the transaction starts, the insert runs, the Stripe charge fires *and succeeds*, then a unique-constraint violation on the line-items insert rolls the transaction back. The visible result: no invoice in the database, but the customer's card was charged. The "incoming reconciliation queue" lane shows the divergence as a manual-investigation ticket. Lane two (the fix): the transaction wraps only database writes; the Stripe call fires *after* `await db.transaction(...)` returns, with the error path (Stripe fails after the database commit) named as the inverse landmine — handled by background jobs in Chapter 16. The closing rule: external side effects fire *after* the transaction commits, never inside.

**Engagement.** A `Sequence` drag-to-order drill for the full post-write flow: the student orders eight steps (`safeParse`, authorize, `db.transaction(async tx => { tx.insert invoice; tx.insert lines; })`, `revalidatePath`, `emailReceipt(id)`, `redirect`, `return ok`) including the distractors of "`revalidatePath` *inside* the transaction" and "`stripe.charges.create` *inside* the transaction." Wrong placements produce targeted feedback ("revalidating inside the transaction has no rollback semantics — the cache is invalidated even if the write rolled back," "the Stripe call inside the transaction diverges state on rollback — the canonical production bug"). Confirm with a `MultipleChoice` for the idempotency-key slot: "the user double-clicks 'Create invoice' — what's the senior fix, and where does it land?" — correct answer names a client-generated UUID hidden field, the action reading it, and the dedup table foreshadowed for 12.1.

**Components.**
- `AnnotatedCode` extending the five-seam stencil with the post-write seams filled in.
- `DiagramSequence` hosting the two-lane transaction-rollback timeline (one frame per lane, plus the reconciliation-queue close-up).
- `Sequence` for the eight-step drag-to-order drill with the two transaction-poisoning distractors.
- `MultipleChoice` for the idempotency-key foreshadowing.
- `Aside` (`caution`) below the timeline: "external calls inside transactions diverge state on rollback. Fire side effects after the commit; the background-job pattern (Chapter 16) is the senior fix when the post-commit call itself can fail."

**Project link.** 7.6.6 refactors `deleteInvoice` into a `db.transaction` block to hold the shape for later audit-log and notification extensions, with the no-external-calls-inside rule explicit in the project brief. The idempotency-key hidden input lands in 12.1's project chapter; the 7.6 form leaves the slot empty but named.

---

## Component proposals

None.

The chapter ships entirely on existing components. Two patterns from 7.1's pedagogy outline carry forward and validate the discipline: where the validation chapter leaned on `ZodCoding` for the type-and-runtime duality, this chapter leans on `DiagramSequence` for the wire-and-trust-boundary visualizations (Concepts 1, 5, 10 beat two) and on `AnnotatedCode` for the five-seam stencil (Concepts 4, 6, 10 beat one) that becomes the chapter's spine. The remaining concepts each reach a strong fit with `CodeVariants` for tabbed comparisons (Concepts 3, 8, 9), `Figure` wrapping hand-coded HTML for catalogs and decision matrices (Concepts 2, 7, 9), and the existing exercise components (`MultipleChoice`, `Buckets`, `Sequence`, `Dropdowns`).

The closest call for a bespoke component is the round-trip animation in Concept 1 — a `ServerActionRoundTrip` widget would crisply animate the import-rewrite, the wire crossing, and the response. But the same shape doesn't recur in this chapter (the wire-crossing model is taught once and re-referenced as prose), and no forward-link compounds (7.5's route handlers teach a different wire model — explicit URLs, no opaque IDs; 12.2's webhooks are inbound, not outbound). Per the single-use discipline, the five-frame `DiagramSequence` of hand SVGs is the right scope — the artifact still teaches the round-trip kinetically, and the build cost is the SVG content rather than a one-off component.

Two latent forward-links to flag rather than build now. The five-seam `AnnotatedCode` stencil (Concept 4) gets re-referenced in 7.5 (route handlers run a near-identical seam shape with `Params`/`Headers`/`Query`/`Body` parsing instead of `FormData`), 10.2 (the `authedAction` wrapper plugs into seams 1 and 2), and 16 (background jobs run a parsed-payload + result shape that mirrors the action). If a `FiveSeamStencil` named composition emerges as the recurring artifact across these chapters, it earns a small named primitive — but at one chapter of authoring use, the `AnnotatedCode` block is the right scope. Similarly, the transaction-rollback timeline (Concept 10 beat two) recurs in 12.2 (Stripe webhook reconciliation) and 16 (background-job retry-after-commit) — same shape, different actors. Defer the bespoke component until the third use materializes; until then, the hand-SVG `DiagramSequence` carries it.

## Build priority

No new components to build. The chapter's build cost is the *content*: the five-frame round-trip SVGs for Concept 1's `DiagramSequence`, the wire-contract HTML table for Concept 2, the five-seam stencil for Concept 4 (which is the chapter's spine artifact and gets the most authoring care), the three-attacker timeline for Concept 5, the two-lane transaction-rollback timeline for Concept 10 beat two, and the curated fixtures for the `CodeVariants` contests in Concepts 3, 8, and 9. The artifacts that compound forward — the five-seam stencil and the transaction-rollback timeline — earn the most polish at authoring time, since later chapters will re-reference their visual vocabulary.

## Open pedagogical questions

- Concept 1's round-trip animation lives across five `DiagramSequence` frames, each a hand SVG. Confirm whether the existing `DiagramSequence` cleanly hosts SVG-heavy frames at this scale, or whether a chapter-local CSS-driven animation inside one `Figure` reads better than five discrete frames the student manually scrubs.
- Concept 9's `CodeVariants` three-tab contest carries a 60-line action body in tab one — close to or past the readable limit for a tabbed code comparison. Confirm whether the contest reads cleanly at that length or whether the tabs need collapsible regions to hide the unchanged setup lines.
- Concept 10 is the chapter's longest concept by teaching weight (post-write order *plus* the transaction landmine *plus* the idempotency foreshadow). Confirm whether the two-beat structure holds in one lesson or whether the idempotency foreshadow lands better as a closing prose paragraph with a forward link, leaving the two beats (post-write order, transaction landmine) as the load-bearing artifacts.
