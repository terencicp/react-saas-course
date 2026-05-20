# Chapter 047 — Server Actions

## Chapter framing

Chapter 046 built the Zod vocabulary; this chapter wires it to the mutation seam. A Server Action is the named function the framework lets a Client Component invoke as if it were local — but every call is an HTTP POST to the server, with the same trust boundary as any public endpoint. The chapter teaches the action shape (definition, invocation, the serializable-args contract), the validation discipline that has to fire on entry (Zod's `safeParse` against the input), the canonical `Result` return type that lets the form layer branch on success and failure without `try`/`catch`, and the post-mutation surface (`revalidatePath`, transaction wrapping, idempotency foreshadowing). The student leaves with the seam every form in Chapter 048 and every CRUD project from Unit 7 onward writes against.

Threads that must run through every lesson. The Server Action is a public POST endpoint — treat it that way, never trust the input, parse on entry, authorize before any database access (auth wrapper lands in Chapter 061; the slot is named here). The canonical `Result` shape — `{ ok: true; data } | { ok: false; error: { userMessage, code } }` — is the contract every action returns and every form reads; throw at the framework edge (auth, `notFound`), return `Result` everywhere the caller branches on the failure shape. The form layer's `useActionState` (lesson 4 of chapter 048) consumes this exact shape; pre-locking it here means chapter 048 is wiring, not invention. Architectural Principle #3 (pure functions in `/lib`, side effects at named boundaries) and Principle #5 (use the framework's conventions, don't invent parallel ones) get introduced here as the load-bearing decisions for how every action file is shaped — pure helpers in `/lib`, the action body as the seam, no rolled-from-scratch RPC wrapper to compete with the platform. `revalidatePath` is the basic post-mutation move; the full invalidation decision tree was lesson 6 of chapter 036, named once and not re-taught. Transactions revisit the lesson 4 of chapter 043 thread on the mutation side. Idempotency keys are foreshadowed for Chapter 067 but not built here.

The chapter ships five teaching lessons plus a quiz.

---

## Lesson 1 — The `"use server"` seam

Defines a Server Action, names the file-level and inline declaration sites, walks the three call shapes, and locks the serializable-args contract that crosses the wire.

Topics to cover:

- **The senior question.** A form in a Client Component needs to create a row in the database when submitted. The naive 2026 reflex is to add a Server Component-rendered handler; the platform default is the Server Action — a function the client imports and calls as if it were local, with the framework rewriting the call into an HTTP POST. What's the syntax, what crosses the wire, and what's the boundary discipline the senior writes from the first action? The lesson names the two declaration sites, the invocation shape, and the serializable-args contract every action signature must obey.
- **The Server Action mental model.** An async function marked `"use server"` becomes a server-only POST endpoint whose function reference doubles as the call site for clients. The compiler replaces the imported reference with a stable opaque ID; the client invocation serializes the arguments, POSTs them with the action ID, the server resolves the ID back to the function and runs it, the return value serializes back. The student sees `await createInvoice(formData)` in a Client Component and the runtime does the HTTP round-trip transparently. Architectural Principle #6 (prefer explicit over magic) named at the directive — `"use server"` is the seam, not a decoration.
- **The two declaration sites — file-level vs. inline.** File-level: a module starting with `"use server"` at the top declares every exported async function as a Server Action. The course default — actions live in `/app/.../actions.ts` or `/lib/actions/<entity>.ts`, co-located with the feature, easily searchable. Inline: an async function declared inside a Server Component with `"use server"` as its body's first statement. The trigger for inline: the action closes over server-side values the Client Component shouldn't see (request-scoped IDs, derived auth state); rare in 2026 SaaS code, named once. The 2026 reflex: file-level by default.
- **The invocation surface.** From a Client Component, import the action like any function and call it. Three call-site shapes the chapter teaches:
  - As the `action` prop on a native `<form action={createInvoice}>` — the form pattern (lesson 3 of chapter 048) that posts the `FormData` directly.
  - Inside `useActionState((prev, formData) => action(formData), initial)` — the React 19 hook that owns pending state and the latest result (lesson 4 of chapter 048).
  - Directly inside an event handler: `await createInvoice(formData)` — the imperative form, used when the action runs outside a form submit (delete buttons, optimistic toggles).
  All three call the same function; the framework handles the POST.
- **The serializable-args contract.** Arguments to a Server Action cross the wire as the RSC payload — every value must serialize through the structured-clone-plus-React-extensions superset (lesson 4 of chapter 034 catalog). Accepted: primitives, plain objects, arrays, `Map`, `Set`, `Date`, typed arrays, `FormData`, `File`, Promises (server-to-client only), JSX (server-to-client only). Rejected: functions, class instances, `WeakMap`/`WeakSet`, DOM nodes. The senior reach for forms: take `FormData` as the only argument, parse on entry. The senior reach for imperative calls: take a plain object or a primitive ID — never pass a class instance or a Drizzle row with methods.
- **The framework-bound first argument for `useActionState`.** When the action is wrapped in `useActionState`, the first parameter is the previous state, not the form data — `async function action(prevState, formData) { ... }`. Name this once so the student doesn't write the wrong signature; full wiring in lesson 4 of chapter 048.
- **Closures over server-side values.** A file-level action can `import` modules and `await` server-only resources freely. An inline action additionally captures values from its enclosing Server Component scope (the rendering user's ID, the route's `params`). Next.js encrypts those captured values in the action payload so they don't leak to the client — but the senior posture is to not depend on the encryption: re-read auth from the session inside the action (chapter 061 pattern), never trust a client-passed `userId` argument. The encryption protects against accidental leaks; the action body protects against intentional ones.
- **What gets stripped from the client bundle.** Action source code does not ship to the client — the import becomes a reference to the opaque ID. Dead-code elimination of unused action exports happens at build; the 14-day key rotation Next.js uses for action IDs is named once. The implication: an action defined in `/lib/actions/invoices.ts` doesn't bloat the Client Component that imports it.
- **The starter action shape the chapter writes.** A skeleton every subsequent lesson refines:

  `'use server'; export async function createInvoice(formData: FormData) { /* parse → authorize → db → revalidate → return Result */ }`

  The five seams are named here in order; the rest of the chapter fills them in.
- **Watch-outs.** A Server Action invoked from a Server Component is just a function call — no POST, no serialization, no action ID; the directive is only load-bearing at the server/client boundary; passing a Drizzle row directly to a Server Action fails serialization on the row's prototype methods — pass the plain ID or `JSON.parse(JSON.stringify(row))` for the rare full-row case; declaring an inline action inside a Client Component fails the build — inline actions only live inside Server Components; the action's name appears in the client bundle as part of the import reference (not the function body) — choose names you'd be comfortable seeing in DevTools; an action that throws an unhandled error returns a generic 500 to the client and triggers the route's nearest `error.tsx` — the `Result` shape (lesson 3 of chapter 047) is the senior alternative for expected failure paths.

What this lesson does not cover:

- The form pattern that consumes the action (lesson 3 of chapter 048).
- `useActionState` and `useFormStatus` (lesson 4 of chapter 048, lesson 5 of chapter 048).
- Authentication and authorization wrapping the action (Chapter 061).
- The Server Action security model in depth — encryption, action IDs, CSRF (named once here, full coverage at the security baseline in Chapter 085).

Estimated student time: 35 to 45 minutes. Foundational mechanics; sets the seam every other lesson refines.

---

## Lesson 2 — Parse on entry, every time

Installs the five-seam action shape and the `safeParse`-on-`Object.fromEntries(formData)` discipline that runs before any cookie read, database call, or log statement.

Topics to cover:

- **The senior question.** The `createInvoice` action takes `FormData` and writes a row to the database. The browser's HTML5 validation (`required`, `pattern`, `minLength`) ran before submit — but a curl-from-the-terminal request, a stale client running an older schema, or a malicious script can call the action with any payload. What validation must run inside the action body before any database access, and where does Zod sit in the action's five-seam shape? The lesson installs the parse-on-entry discipline as the first line of every action body.
- **The action's five seams in order.** Every Server Action the course writes follows the same shape: (1) parse the input with Zod's `safeParse`, (2) authorize the caller (full wrapper in chapter 061; for now, a one-line user check), (3) perform the database mutation, (4) revalidate the cache (lesson 5 of chapter 047), (5) return the `Result` (lesson 3 of chapter 047 owns the shape). Parse is first because every subsequent seam depends on typed input. The 2026 reflex: write the parse line before anything else, the rest follows.
- **The canonical parse shape.** The action takes `FormData`, converts to an object with `Object.fromEntries(formData)` (multi-valued fields use `getAll` — lesson 6 of chapter 046), and calls `Schema.safeParse(...)`. On `success: false`, the action returns the `Result` failure with the field errors from `z.treeifyError(parsed.error)`. On `success: true`, the typed `parsed.data` flows through the rest of the action body. `safeParse` not `parse` — the action returns the validation failure to the form, it doesn't throw into the `error.tsx` boundary (lesson 3 of chapter 047 owns the throw-vs-Result decision).
- **The schema source — `drizzle-zod` plus refinement.** The schema comes from `createInsertSchema(invoicesTable)` (lesson 7 of chapter 046) with the API-only refinements added on top, `.omit`-ing the columns the action sets server-side (organization ID from session, audit fields from the action wrapper). The student doesn't hand-write a parallel `z.object` — the database is the source of truth, the action's input schema is derived. The senior anchor: when a column type changes in the schema file, the action's input contract updates without manual edits.
- **Why server-side validation isn't optional even with `useActionState` + client validation.** Three failure modes the server-side parse catches that the client-side never will: the client running a stale bundle after a schema deploy, the JS-disabled progressive-enhancement submit (lesson 8 of chapter 048) that skips client validation entirely, the non-browser caller (curl, an attacker, a script). The client validation (constraint API in lesson 7 of chapter 048) exists for UX; the server validation exists for correctness. The 2026 reflex: every action parses its input, no exceptions, even when the form does perfect client-side validation.
- **The `strictObject` reflex for action inputs.** Action input schemas reach for `z.strictObject` (or `createInsertSchema`'s default strict mode) so unknown fields surface as a validation error rather than silently passing through. The client and server share a schema; an unknown field is a contract drift worth logging. Pair with the error-monitoring hook from Chapter 096 (named once).
- **Where the field errors land.** The parse failure produces `z.treeifyError(error)` — a nested object mirroring the form's field shape. The action returns this in the `Result` failure branch under a typed `fieldErrors` key. The form layer's `useActionState` reads `result.fieldErrors?.email?.[0]` and renders it under the input. Both sides see the same shape; the schema is the single source of truth for both the rule and the message. Wiring lands in lesson 4 of chapter 048; the contract is fixed here.
- **The cross-resource rules that don't belong in the schema.** Database uniqueness checks (email already exists, slug taken), billing-plan gates (subscription includes this feature), rate-limit checks. These need database access, can't run inside Zod, and belong in the action body after the parse. They produce the same `Result` failure shape with a different `code` (e.g., `'email_taken'`) and a `userMessage` the form renders. The senior call from Architectural Principle #3: pure validation in the schema, side-effects-bearing checks in the action body.
- **The validation-before-anything-else rule.** No `cookies()` read, no `db` call, no `console.log` of the input shape before `safeParse` returns success. The reasons: unknown input shape means logging it may leak unexpected fields to logs, branching on un-validated fields means relying on `any`-shaped values, hitting the database before validation wastes a query on bad input. The 2026 senior reflex: parse first, branch on `parsed.success`, everything else lives in the success branch.
- **The narrow window where a schema parses but the action still rejects.** A schema-valid email that's on the suppression list (Chapter 052), a schema-valid amount that exceeds the user's plan limit. These produce a typed error code in the `Result`'s error branch (`code: 'suppressed_email'`, `code: 'plan_exceeded'`), not a Zod issue. The student's mental model: Zod proves the shape; the action body proves the business rules.
- **Watch-outs.** `parse` instead of `safeParse` throws past the form layer into `error.tsx` — the user sees a generic error page instead of an inline field message; logging the un-parsed input before validation surfaces sensitive client-controlled values in production logs (PII, password attempts); skipping `Object.fromEntries` and reading `formData.get('field')` field-by-field in the action body re-introduces stringly-typed code the schema would have removed; refinements that need DB access stuffed into the schema break the schema's purity — it can no longer parse without a database connection and tests get harder to write; the strictObject mode rejects browser-added fields like `_method` or framework hidden inputs — name those fields explicitly in the schema or use the default `z.object` and accept the silent strip.

What this lesson does not cover:

- The `Result` shape itself (lesson 3 of chapter 047 — next lesson).
- Auth wrapping the action (Chapter 061).
- The form-side rendering of field errors (lesson 4 of chapter 048).
- Rate limiting on the action (Chapter 078, named once here).

Estimated student time: 30 to 40 minutes. Pattern archetype: the entry-line discipline that hardens the seam.

---

## Lesson 3 — Result, or throw

Locks the canonical `Result<T>` discriminated-union return shape, the `ok` / `err` helpers, the throw-at-the-framework-edge rule, and the standardized error codes every action shares.

Topics to cover:

- **The senior question.** The action's parse failed. Or the database raised a unique-violation. Or the user lacks permission. Each is a failure the form needs to render — the user sees "Invalid email" under the field, "That slug is taken," "You don't have access." None of these are programming errors; they're expected outcomes of a public mutation endpoint. The 2026 senior question: does the action `throw` and let the form layer catch, or does it return a typed result the form's `useActionState` branches on? The lesson installs the canonical `Result` shape and the throw-versus-Result rule that decides which seam handles which failure.
- **The canonical Server Action `Result` shape.** Every action in the course returns:

  `type Result<T> = { ok: true; data: T } | { ok: false; error: { code: string; userMessage: string; fieldErrors?: Record<string, string[]> } }`

  The discriminator is `ok`. On success, `data` carries the action's return value (the created entity's ID, the updated row, or `null` for fire-and-forget mutations). On failure, `error` carries a stable machine-readable `code`, a human-rendered `userMessage`, and optional `fieldErrors` from the Zod parse. This shape ties Principle #7 (make impossible states unrepresentable — the form can't render `data` and `error` simultaneously) to SaaS pattern #6 (the result contract every form reads).
- **The shape as a TypeScript type, declared once.** A shared `Result<T>` generic in `/lib/result.ts` that every action imports and every form reads. The 2026 reflex from lesson 1 of chapter 009 (discriminated unions): name the type once, every consumer reaches for the same definition, no parallel `{ success: ..., error: ... }` variants invented per action.
- **The two helpers — `ok(data)` and `err(code, userMessage, fieldErrors?)`.** Tiny pure functions in `/lib/result.ts` that produce the success and failure branches with the discriminator pre-set. The action body reads as:

  `if (!parsed.success) return err('validation', 'Check the highlighted fields.', z.treeifyError(parsed.error).properties); ... return ok({ id: invoice.id });`

  The helpers make the intent visible at the call site and keep the action body short.
- **The throw-versus-Result decision tree.** The senior call comes from "who handles the failure, and does the caller need to branch on it?"
  - **Throw** when the failure should bubble to the framework's nearest `error.tsx` and the user gets the global error page. The canonical throws: `notFound()` for "the resource doesn't exist," `redirect()` for navigation as a control-flow primitive (these are framework conventions, not exceptions), and an unhandled exception for genuine programmer errors (database is down, the env is misconfigured) where there is no graceful in-form recovery. The auth helper in chapter 061 also throws on missing session — the framework is the catch site.
  - **Return `Result`** when the form layer needs to render the failure inline. Field-level validation failures, business-rule rejections (suppressed email, plan limit, rate limit), unique-constraint violations from the database. The user stays on the page; the form shows the message under the right field or as a form-level banner.
  The rule, stated as a one-liner: throw at the framework edge, return `Result` inside the action body where the form branches on the shape. The 2026 reflex.
- **The error codes worth standardizing.** A small enumerated set the codebase shares — `validation`, `unauthenticated`, `unauthorized`, `not_found`, `conflict` (unique violation), `rate_limited`, `plan_limit`, `internal`. Declared as a `z.enum` or a literal-union TypeScript type so every action's `error.code` types correctly. The form layer can branch on the code for variant rendering (a `conflict` shows a banner; a `validation` shows field errors); the analytics layer can group failures by code (Chapter 096). The senior anchor: codes are the contract between layers, `userMessage` is what the user reads.
- **The `userMessage` discipline.** Every error returned from an action carries a human-readable string the form renders without translation or transformation. The schema authors validation messages (lesson 5 of chapter 046); the action authors business-rule messages. The form never invents a message ("Something went wrong") — if the action didn't return one, the message is missing and the bug is in the action, not the form. The 2026 reflex from Architectural Principle #5: one source of truth per concern; the action owns user-facing copy for its failure modes.
- **The senior anti-pattern — leaking the raw error.** Returning `{ ok: false, error: dbError.message }` exposes database internals to the client. The senior reach: catch the raw error in the action body, map known cases to typed codes (a Postgres `23505` unique-violation becomes `{ code: 'conflict', userMessage: 'That slug is already taken.' }`), log the raw error for the operator, return only the sanitized shape. Database error code detection lives in `/lib` as a reusable helper (Architectural Principle #3); the action calls it.
- **Where async errors become `Result` failures.** A try/catch around the database mutation that maps known thrown errors to the `Result` shape. The pattern:

  `try { const row = await db.insert(...).returning(); return ok(row); } catch (e) { if (isUniqueViolation(e)) return err('conflict', '...'); throw e; }`

  Known cases become `Result`; unknown cases re-throw to `error.tsx`. The senior reflex: catch what you can name and handle; let everything else propagate.
- **The form layer's read shape.** `const [state, formAction, pending] = useActionState(action, null); state?.ok === false ? state.error.userMessage : ...`. The form discriminates on `ok`, reads `userMessage` for banner-level errors, reads `fieldErrors` for inline rendering. The wiring is lesson 4 of chapter 048's job; the contract is fixed here.
- **What about `useOptimistic`?** The optimistic update from `useOptimistic` (lesson 6 of chapter 048) rolls back when the action returns `ok: false` — the form layer subscribes to the `Result` discriminator. Foreshadow once; the rollback pattern is lesson 6 of chapter 048.
- **Watch-outs.** Throwing inside an action that the form was supposed to recover from kicks the user to `error.tsx` and loses the form state — the user retypes everything; the `Result` is the senior default for any failure the user can correct; returning `{ ok: false, error: 'string' }` (string, not object) breaks the `fieldErrors` channel — the contract is the object shape, every action obeys it; mapping every error to `'internal'` defeats the codes — the form can't render meaningfully; the failure code set should be small (six to ten codes for the whole app) — proliferating codes per action is the smell that the abstraction's wrong; success returning bulky entities (full Drizzle rows with all timestamps) crosses the wire on every mutation — return the ID and let the client refetch via the revalidated cache (lesson 6 of chapter 036 thread).

What this lesson does not cover:

- The schema source for validation (lesson 2 of chapter 047 prior).
- The form-side consumption of the `Result` (lesson 4 of chapter 048).
- The Drizzle unique-violation detection helper (Chapter 043 owns the database side; this lesson names it).
- The auth helper's throw on missing session (Chapter 061).

Estimated student time: 40 to 50 minutes. Decision archetype. The lesson that locks the error-model decision for every action in the course.

---

## Lesson 4 — Thin actions, pure `/lib`

Introduces Principle #3 (pure helpers in `/lib`, side effects at named boundaries) and Principle #5 (don't invent a parallel call wrapper), and names the auth and billing carve-outs that earn their weight later.

Topics to cover:

- **The senior question.** The action body is starting to fill up — parse, authorize, branch on business rules, call the database, map errors, revalidate, return. Where does each line belong: inside the action file, or extracted into `/lib`? And when the codebase grows to twenty actions across five features, is the answer to write a tRPC-style call wrapper that owns the parse-authorize-result pattern, or to lean into the framework's convention and accept the small boilerplate? The lesson introduces Architectural Principles #3 and #5 at the moment they earn their weight — and names the slot where the only legitimate wrapper (the auth/RBAC carve-out in Chapter 061) will land.
- **Architectural Principle #3 introduced — pure functions in `/lib`, side effects at named boundaries.** The principle: business logic is a pure function of inputs to outputs (or to a typed `Result`), free of `cookies()`, `headers()`, `db` writes, or HTTP calls. The Server Action body is the named boundary where the side effects fire — it reads cookies, calls the database, returns the result. The action file itself is thin; the work it orchestrates lives in `/lib`.

  The shape the chapter writes from here on:
  - `/lib/invoices/calculate-total.ts` — pure function, `(items: LineItem[]) => Money`, fully unit-testable, no imports of `db` or `cookies`.
  - `/lib/invoices/repository.ts` — the data-access layer; the only file that imports `db`.
  - `/lib/invoices/policy.ts` — the authorization predicates (`canCreateInvoice(user, org)`); pure functions of session and target.
  - `/app/.../actions.ts` — the Server Action; thin orchestration that calls the pure helpers in sequence.

  The 2026 reflex: when the action body gets longer than ~30 lines, the next extraction is into `/lib`, not into a new abstraction layer. Three named boundaries fire side effects in this course: Server Actions, route handlers (chapter 050), and background jobs (Chapter 16); everything else is pure.
- **Why the principle pays off.** Three concrete wins the student feels by the end of the chapter:
  - Unit tests run without a database — the pure helpers in `/lib` take inputs and produce outputs; the action's integration tests are smaller and rarer.
  - The same pure helper feeds a Server Action, a route handler, and a background job — one place to fix a calculation bug.
  - The action body reads as a sequence: parse, authorize, call `/lib`, revalidate, return — the reviewer can scan it in seconds.
- **Architectural Principle #5 introduced — use the framework's conventions, don't invent parallel ones.** The principle: when the framework ships a convention for a problem, use it; don't roll a parallel mechanism that competes with the platform. Named here because the next instinct after the action body fills up is to extract a generic call wrapper — `safeAction(schema, fn)` that owns the parse, the authorization, and the `Result` shape, called like `safeAction(InvoiceSchema, async (data) => { ... })`. The wrapper looks clean; it costs the platform's static analysis, breaks the call-site visibility of what the action does, and earns the team a custom DSL nobody else in the React 19 ecosystem speaks.
- **The 2026 reflex around action wrappers.** Don't write one. The action's five seams (parse, authorize, mutate, revalidate, return) are small enough to repeat per action; the repetition is a feature for the reviewer. Libraries that wrap actions (`next-safe-action`, `zsa`) are real, well-built, and the senior trigger for them is named — but the default in this course is to use the framework's convention. The wrapper layer is the conditional past a clear threshold; the default is the framework.
- **The named carve-out — authorization (Chapter 061).** The one place the course does extract a wrapper: `authedAction(role, schema, fn)` in lesson 2 of chapter 061. The reason it earns its weight (and survives Principle #5) is that auth is the same boilerplate at every action — `getSession`, check role, return `unauthenticated`/`unauthorized` if missing — and getting it wrong is a security incident, not a code-style issue. Centralizing the auth check at one wrapper makes the policy explicit and the audit trivial. The carve-out is named once here; the full pattern lands in chapter 061. Every other concern (parse, validate, revalidate, transaction) lives in the action body.
- **The named carve-out — the thin billing interface (Chapter 068).** The other future carve-out, named once: `billing.upgrade()`, `billing.requirePlan()` — a small typed surface for the billing concern so action bodies don't have to know about Stripe webhooks. Same reasoning as the auth wrapper: a single concern, security/compliance-sensitive, worth a named interface.
- **The "is this a /lib helper or an action?" decision rule.** Two-line test: does the function have side effects on a database, cache, queue, or external API? If yes, it's an action (or a route handler, or a job). If no, it's a `/lib` helper. The rule cuts the gray-area cases — a function that "validates a payment and reserves the inventory" is two functions: `validatePayment` (pure, `/lib`) and `reserveInventory` (side-effectful, called from the action).
- **The directory shape the course settles on.**
  - `/app/<route>/actions.ts` — the actions for the route, file-level `"use server"`.
  - `/lib/<feature>/` — pure helpers, the repository layer, the policy layer.
  - `/lib/db/schema.ts` — the canonical Drizzle schema (chapter 041).
  - `/lib/result.ts` — the shared `Result` shape and helpers.
  The student gets the layout once and follows it from the project chapter (chapter 051) forward.
- **Watch-outs.** A `/lib` helper that imports `cookies()` or `db` has been mis-sliced — extract the side-effect to the action, keep the pure logic in `/lib`; the temptation to write a `safeAction(schema, fn)` wrapper is strongest after the third action — name it as the smell and write the parse line inline; the named auth carve-out doesn't justify a "while we're at it" wrapper that also handles validation and revalidation — auth is the one concern, the others stay inline; pure helpers that take a `db` instance as a parameter (`createInvoice(db, data)`) are a common anti-pattern — the database is a side-effect, the helper becomes impure once it can write; nesting `/lib` directories by both feature and layer (`/lib/invoices/repository/select.ts`) is over-structure for the SaaS surface — one folder per feature is enough until the feature genuinely splits.

What this lesson does not cover:

- The `authedAction` wrapper itself (lesson 2 of chapter 061).
- The billing interface (lesson 6 of chapter 068).
- Background jobs as a side-effect boundary (Chapter 16).
- The dependency-injection variants of testable repositories (out of scope — the 2026 default is to test the pure helpers and integration-test the action).

Estimated student time: 35 to 45 minutes. Decision archetype. The principles get introduced where they earn their weight, and the action's directory shape locks in for every later chapter.

---

## Lesson 5 — After the write

Teaches `revalidatePath` as the basic post-mutation move, the `db.transaction` wrapping pattern with its no-external-calls rule, and foreshadows the idempotency-key slot for Chapter 067.

Topics to cover:

- **The senior question.** The action parsed the input, authorized the caller, wrote the row, and is about to return `ok({ id })`. Three things still need to fire: the cached list-of-invoices page must refresh so the user sees the new row, the multi-step mutation that wrote to two tables must be atomic so a half-failure doesn't leave the database inconsistent, and the user's accidental double-click must not produce two rows. The lesson teaches the basic post-mutation move (`revalidatePath`), the transaction-wrapping pattern for multi-step mutations, and foreshadows the idempotency-key pattern that closes the double-submit hole.
- **`revalidatePath` as the basic move.** After a successful mutation, the action calls `revalidatePath('/invoices')` to mark the cached invoices list as stale. The next request to that route fetches fresh data; the user navigates back from the success state and sees the new row. The 2026 reflex from the first action: every mutation that affects a cached read on a known path ends with a `revalidatePath` call before the return. The path-string is the same as the URL; nested routes pass the layout's type (`revalidatePath('/[org]/invoices', 'page')`) when needed.
- **Why the lesson stops at `revalidatePath` and not the full surface.** lesson 6 of chapter 036 owned the full decision tree — `updateTag` (Server-Action-only, read-your-writes), `revalidateTag` (stale-while-revalidate), `revalidatePath`, `router.refresh`. This lesson does not re-teach it. The senior call between them was named in chapter 036; here, `revalidatePath` is the basic move at the first action — clear, blunt, correct for the simple list-and-detail case the project chapter (chapter 051) builds. The student writes the more nuanced calls in Chapter 076 when the SaaS patterns demand it. A one-line frame and the link to lesson 6 of chapter 036.
- **The placement rule — after the mutation, before the return.** `revalidatePath` mutates the server-side cache; calling it before the `db.insert` runs revalidates against an unchanged state and the user sees stale data after the redirect. The 2026 ordering: `parse → authorize → mutate → revalidate → return`. The five-seam shape from lesson 2 of chapter 047 locked in.
- **`redirect()` after a mutation — the framework's convention.** A common follow-up: after the create, redirect to the new record's detail page. `redirect('/invoices/' + id)` runs at the end of the action; the framework throws a control-flow exception that the runtime catches and turns into a 303. The senior anchor: `redirect` is a framework convention, not an error — it doesn't conflict with the `Result` shape because the redirect happens before the `Result` would have returned. Pair the optimistic UI from lesson 6 of chapter 048 with the redirect carefully (the redirect cancels the optimistic state; lands in lesson 6 of chapter 048).
- **The writable `headers()` API inside a Server Action.** Next.js 16 exposes a writable `headers()` inside Server Actions for appending response-specific headers (e.g., `Set-Cookie` for a fresh session token, custom audit headers) on the action's response — distinct from the read-only `headers()` taught in lesson 1 of chapter 037, which reads the incoming request headers. Named once here so the student knows the writable surface exists at this seam; the depth treatment lands with the security/headers chapter (lesson 4 of chapter 079).
- **The transaction-wrapping pattern.** When the action writes to multiple tables that must succeed or fail together (create an invoice plus its line items; create a user plus their default organization), wrap the mutation in `db.transaction(async (tx) => { ... })`. Every write inside the callback uses `tx` instead of `db`; the transaction commits atomically on return, rolls back on throw. The senior reach: any multi-table mutation, any update-then-derive flow that depends on the first write having succeeded.
- **The transaction shape inside the action body.**

  `const result = await db.transaction(async (tx) => { const [invoice] = await tx.insert(invoices).values(data).returning(); await tx.insert(invoiceLines).values(linesFor(invoice.id)); return invoice; });`

  The transaction is one of the action's middle seams. The parse and authorize fire before; the revalidation and return fire after. The transaction itself can throw — catch known constraint violations (the lesson 3 of chapter 047 unique-violation mapping) and return the `Result` failure; let unknown errors propagate to `error.tsx`. The 2026 reflex: the transaction is for atomicity, not for general error handling.
- **The Drizzle transaction surface — what carries over from lesson 4 of chapter 043.** Isolation levels (`{ isolationLevel: 'serializable' }`), nested transactions (savepoints), the request-scoped transaction pattern for read-your-writes consistency — all named in lesson 4 of chapter 043. This lesson uses the default isolation and the simple flat transaction; the conditional levers live in chapter 043. The senior call here: most action transactions don't need a non-default isolation level; reach for serializable only when the chapter on consistency (Chapter 15) names the trigger.
- **Senior watch-outs inside the transaction callback.** External calls (Stripe, Resend, queue dispatches) inside a transaction are the production landmine — the external call succeeds, the transaction rolls back, the external state and the database diverge. The senior reflex: external side effects fire *after* the transaction commits, not inside it. The pattern: `const id = await db.transaction(...)` then `await stripe.charges.create(...)` outside. The full background-jobs-for-external-effects pattern lands in Chapter 16; the rule here is "no Stripe inside transaction."
- **Idempotency keys — foreshadowed, not built.** The double-submit problem: the user clicks "Create invoice" twice (or the network drops and the browser retries), the action runs twice, the database has two invoices. The senior fix is an idempotency key — the form includes a `crypto.randomUUID()` as a hidden field; the action parses it, checks a `processed_actions` table for the key, returns the prior result if seen, otherwise writes and records the key. The full pattern (the unique constraint, the deduplication table, the cleanup job) lives in Chapter 067.

  This lesson names the problem, names the slot, and writes the form-side hidden input that chapter 067's action body will read. The 2026 reflex: every action that creates a row in a non-recoverable way (charges money, sends an email, ships a package) needs an idempotency key; CRUD on internal entities can defer until the second time the bug bites.
- **The action's full shape, end to end.** Bring the five seams together with the chapter's worked example:

  Pseudo-code shape (not load-bearing on exact syntax):
  parse → authorize → `db.transaction(async tx => { ... })` → `revalidatePath('/invoices')` → return `ok({ id })`.

  The student has seen each seam; the lesson ends with the assembled action that the project chapter (chapter 051) extends.
- **Watch-outs.** `revalidatePath` before the mutation revalidates against stale state — order matters; calling `revalidatePath` inside a transaction has no rollback semantics (the cache is invalidated even if the transaction rolls back) — keep cache calls outside the transaction; external calls inside transactions diverge state on rollback — fire side effects after the commit; nested transactions in Drizzle are savepoints, not independent transactions — a rollback from the inner savepoint doesn't release the outer transaction; the idempotency key is on the form, not derived server-side from the input — a server-derived key (a hash of the inputs) deduplicates legitimate repeat creates that happen to have identical inputs; `redirect()` inside the action returns from the function via an exception — `try`/`catch (e) { ... }` wrappers must rethrow framework errors (Next.js exposes a check for these), the safer pattern is to call `redirect` at the very end of the action.

What this lesson does not cover:

- The full cache-invalidation decision tree (lesson 6 of chapter 036, lesson 2 of chapter 076).
- Transaction isolation levels (lesson 4 of chapter 043).
- The idempotency-key implementation (Chapter 067).
- Optimistic UI rollback on action failure (lesson 6 of chapter 048).
- Background jobs for external side effects (Chapter 16).

Estimated student time: 40 to 50 minutes. The lesson that closes the action surface — what fires after the database write, atomicity for multi-step mutations, and the named slot for the patterns that come later.

---

## Lesson 6 — Quizz

Top 10 topics to quiz:

- The Server Action mental model — `"use server"` as a seam, the client-side import as an opaque ID, what gets stripped from the client bundle, the file-level versus inline declaration sites.
- The serializable-args contract — what crosses the wire (primitives, plain objects, `FormData`, `File`, `Map`, `Set`, `Date`), what doesn't (functions, class instances, Drizzle rows with prototype methods).
- The five-seam action shape — parse, authorize, mutate, revalidate, return — and why parse is always first.
- `safeParse` versus `parse` at the action entry — why the boundary default is the discriminated-result form, what happens when `parse` throws in an action body.
- The canonical `Result` shape — `{ ok: true; data } | { ok: false; error: { code, userMessage, fieldErrors? } }` — what each field is for, why it ties Principle #7 to the form's `useActionState` contract.
- The throw-versus-`Result` decision — when to `throw` (framework edge: `notFound`, `redirect`, unhandled programmer errors) and when to return `Result` (every failure the form should render inline).
- Mapping known database errors to typed codes — the Postgres unique-violation to `conflict` pattern, the "never leak the raw error" reflex.
- Architectural Principle #3 — pure helpers in `/lib`, side effects at named boundaries (action, route handler, job); the directory shape the chapter writes from.
- Architectural Principle #5 — use the framework's conventions; why the course doesn't roll a generic `safeAction(schema, fn)` wrapper, and the auth carve-out in chapter 061 that's the named exception.
- `revalidatePath` as the basic post-mutation move (the full decision tree lives in lesson 6 of chapter 036), the transaction-wrapping pattern for multi-step mutations, the "no external calls inside the transaction" rule, and the idempotency-key slot foreshadowed for chapter 067.

---

> **Note (`revalidateTag` in Next.js 16):** the single-argument form `revalidateTag(tag)` is deprecated — every call must pass a `cacheLife` profile as the second argument (`'max'` is the senior default), e.g. `revalidateTag(tag, 'max')`.
