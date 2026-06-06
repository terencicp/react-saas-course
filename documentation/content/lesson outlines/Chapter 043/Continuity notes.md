# Chapter 043 — Server Actions

## Lesson 1 — The "use server" seam

**Taught:** Server Action mental model (a public POST endpoint disguised as a local call — opaque-ID round-trip), file-level vs inline declaration, the three call sites (named not wired), the serializable-args contract, the never-trust-client-identity posture, and the empty five-seam skeleton (parse → authorize → mutate → revalidate → return).

**Cut:** Inline-action closure-encryption detail was compressed to one sentence; "action name visible in DevTools/choose comfortable names" watch-out dropped; the "unhandled throw → generic 500 + nearest `error.tsx`" watch-out deferred (will surface in L3's throw-vs-Result). 14-day rotation stated only as "rotates on a schedule" (no fixed interval).

**Debts:**
- parse seam → L2; `Result` type definition → L3; thin body / pure `/lib` → L4; revalidate + transaction → L5.
- authorize seam + auth wrapper → Ch 057.
- Security model depth (closure encryption, action-ID rotation, CSRF) → Ch 081 (named once).
- Three call sites (`<form action>`, `useActionState`, imperative) wired → Ch 044; `useActionState` signature gotcha named, full wiring → Ch 044.3.
- Route handlers as alternative side-effect boundary → Ch 046 (only contrasted in intro).
- Builds on Ch 030.3 (directive semantics) and Ch 030.4 (RSC wire).

**Terminology:**
- "the seam" / "`'use server'` seam" = the server/client trust boundary; read `'use server'` as "public POST endpoint."
- "opaque ID" = stable hashed string the compiler emits in place of the action body; the client only ever holds this.
- "RSC payload" = the wire format (structured-clone + React extensions) args serialize through.
- "five seams" = parse → authorize → mutate → revalidate → return, the spine for every chapter action.
- Running example carried chapter-wide: `createInvoice(formData: FormData): Promise<Result<{ id: string }>>`.
- Architectural Principle #6 (prefer explicit over magic) anchored at the directive.

**Patterns and best practices:**
- File-level `'use server'` at top of `actions.ts` co-located with feature is the default; inline only to capture a server-only value inside a Server Component.
- Action signature: `FormData` as the only arg for forms; plain object/primitive ID for imperative calls.
- Never pass a Drizzle row (custom prototype → serialization throws); pass the ID and re-read, or `JSON.parse(JSON.stringify(row))` as escape hatch only.
- `Temporal.*` does not cross the wire — encode as ISO strings at the boundary, parse back inside the action.
- Naming: verb+noun, no `Action` suffix (`createInvoice`).
- `Result` imported as a type from `@/lib/result`; actions return their outcome, don't throw it.
- Golden rule: every action argument is attacker-controlled; re-read identity from the session inside the body, never from an argument.

**Misc.:**
- The five-seam skeleton in this lesson is deliberately non-working (commented seams) — later lessons complete it; do not treat as finished code.
- A `'use server'` function called from a Server Component is a plain in-process call (no POST/serialization/ID) — directive is only load-bearing at the server/client boundary.
- `Result` shape itself (`{ ok: true; data } | { ok: false; error: { code, userMessage, fieldErrors? } }`) belongs to L3 — do not pre-define.

## Lesson 2 — Parse on entry, every time

**Taught:** the parse-on-entry discipline (fills seam 1) — `createInvoiceSchema.safeParse(Object.fromEntries(formData))` as the literal first executable line, branch on `parsed.success`; three reasons nothing runs before it (log-leakage/PII, type safety, DB-waste/DoS); schema derived from the table via `createInsertSchema(invoicesTable, {overrides}).omit({ id, organizationId, createdBy, createdAt })` not hand-written; `z.strictObject` reflex for unknown-key rejection on action inputs; the schema-vs-body split anchored by the IO-discriminator ("does the check need IO?") with the "narrow window" (schema-valid yet business-rejected) sub-beat.

**Cut:** Stayed within scope; no chapter-outline topic dropped that a later lesson depends on. Field-error landing on the form side (`result.fieldErrors?.x?.[0]`) named as a forward-ref only, not shown (Ch 044 owns it).

**Debts:**
- Canonical `Result<T>`, the `code` enum, `ok`/`err` helpers, the throw-vs-Result map → L3. This lesson's failure objects are **provisional inline placeholders** (parse failure: `{ ok: false, error: { fieldErrors: z.treeifyError(parsed.error) } }`; body conflict: `{ ok: false, error: { code: 'conflict', userMessage: '...' } }`) — flagged in-prose as L3's to formalize; do not "fix" by importing `Result`.
- Architectural Principle #3 (pure validation in schema, IO checks at the named boundary = action body) named lightly here; full treatment → L4 "Thin actions, pure /lib".
- Authorize seam still a one-line comment; auth wrapper + reading session for `organizationId` → Ch 057.
- Mutate + revalidate seams remain commented placeholders → L5.
- Form-side wiring (`name`-attr↔schema-key contract, rendering `fieldErrors`, constraint-validation client layer, progressive-enhancement native submit) → Ch 044.
- Named-once business-rule examples by their owning chapter: rate limiting → Ch 074; email suppression list → Ch 048; unknown-key rejection as a logger signal → Ch 092.
- Builds on Ch 042 (`safeParse`, `z.treeifyError`, `Object.fromEntries`/`getAll`, `z.coerce`, checkbox `z.preprocess`, `createInsertSchema` + override map + `.omit`).

**Terminology:**
- One-liner mental model to reuse: **"Zod proves the shape; the action body proves the business rules."**
- "the parse seam" / "parse on entry" = seam 1; the discipline word is *first* (first executable line, nothing before it).
- "the narrow window" = a value that passes the schema but a business rule still rejects (suppression list, plan limit) — parse is the floor not the ceiling.
- IO-discriminator: a rule needing a DB read / external call / request state lives in the body, never in a `.refine`.

**Patterns and best practices:**
- Action input schema = `createInsertSchema(table, { col: (s) => s.refine })` `.omit({ id, organizationId, createdBy, createdAt })` — omit server-set columns (`id` generated, `organizationId` from session, `createdBy` stamped from auth, `createdAt` DB-stamped) so the action can't be tricked into setting them (same instinct as never trusting client `userId`).
- `safeParse`, never `parse`, at the action boundary (a throw trips `error.tsx`, wrong destination for a bad field).
- `z.strictObject` for hand-written non-table action inputs; `createInsertSchema` generates a **plain `z.object` (strips unknowns, NOT strict)** — apply strictness explicitly when wanted. Never assume the derived schema rejects extras.
- Read everything downstream from `parsed.data`; never `formData.get('x')` field-by-field in the body (re-introduces stringly-typed, unvalidated reads).
- Coercion baked in by `createInsertSchema` for numeric/timestamp columns; HTML checkbox needs `z.preprocess(v => v === 'on', z.boolean())`, not `z.coerce.boolean()`.
- Form `name` attributes match schema keys exactly — one contract both sides read.

**Misc.:**
- Import is `from 'drizzle-zod'` on the current stable line; aside notes Drizzle 1.0 relocates to `'drizzle-orm/zod'` (same function).
- Running entity stays `createInvoice` / `invoicesTable`, chapter-wide.

## Lesson 3 — Result, or throw

**Taught:** the two-channel failure model (**return the expected, throw the unexpected**) and the deciding question *"can the user fix this from where they are?"*; the canonical `Result<T>` discriminated union and its four fields (`ok` discriminant, `code`, `userMessage`, `fieldErrors?`); the `ok`/`err` constructors; the `ErrorCode` literal-union extracted as a named type; the catch-map-rethrow pattern; never-leak-the-raw-error and `userMessage`-single-source disciplines; return-small (`ok({ id })` not the row). Formalizes L2's provisional inline placeholders into the real `Result`/`err()`.

**Cut:** Stayed in scope. The chapter outline's `redirect()`/`headers()`/transaction-placement asides are L5's, only named here as "throw that isn't an error."

**Debts:**
- Form-side consumption (`useActionState` reading `state.ok`/`userMessage`/`fieldErrors`) shown only as a forward-ref contract sketch → Ch 044.4. `useOptimistic` rollback on `ok: false` → Ch 044.6 (named once).
- `isUniqueViolation` helper *used abstractly, not implemented* — Postgres-error detection (the `23505`-on-`.cause` detail) → Ch 039 owns it; lives in `/lib`.
- Auth's throw/redirect on missing session and `authedAction` wrapper → Ch 057; the `unauthorized`/`forbidden` *codes* are fixed here, *enforcement* is not.
- `redirect()`/`notFound()` placement, transactions, `revalidatePath` → L5. The "return the ID, client re-reads via revalidated cache" claim depends on L5's cache refresh.
- i18n of `userMessage` strings → later unit (named once).
- Builds on Ch 005.1 (discriminated unions, narrowing) and Ch 042 (`flattenError`/`treeifyError`, `safeParse`).

**Terminology:**
- "two channels" = `return` (expected, form renders inline, user stays) vs `throw` (unexpected → `error.tsx`; plus framework conventions `notFound()`/`redirect()` that ride the throw mechanism but aren't errors).
- "return the expected, throw the unexpected" = the house rule (course conventions § Error handling opener).
- Deciding question: **"can the user fix this from where they are?"** yes → `Result`; no/leave-page → throw or framework convention.
- "catch, map, re-throw" = catch DB/library throws, map *named* cases to `err(code, …)`, `throw e` the rest.
- `code` = cross-layer contract (branch on it); `userMessage` = what the user reads (display verbatim).

**Patterns and best practices:**
- Canonical `Result<T>` at `lib/result.ts`, imported by every action — no per-action `{ success, error }` variants (Principle #5/#7). Shape: `{ ok: true; data: T } | { ok: false; error: { code: ErrorCode; userMessage: string; fieldErrors?: Record<string, string[]> } }`.
- **Canonical `ErrorCode` set is the seven from code conventions:** `validation | conflict | not_found | unauthorized | forbidden | rate_limited | internal`. The chapter outline's `unauthenticated`/`plan_limit` were **rejected** — `unauthorized` (no identity, 401) vs `forbidden` (identity, no permission, 403); `plan_limit` is only a *sanctioned domain extension example*, added when a real layer branches on it, not a core member.
- Helpers (exported, explicit return types, arrow-const): `ok = <T>(data: T): Result<T>`; `err = (code: ErrorCode, userMessage: string, fieldErrors?: Record<string, string[]>): Result<never>`.
- `fieldErrors` is fed by **`z.flattenError(parsed.error).fieldErrors`** (flat `Record<string, string[]>`) — deliberate divergence from the course's general `treeifyError` default and from L2's placeholder. Rule: pick the Zod projection that matches the contract's declared type; nested forms would use `treeifyError` + a matching contract.
- Keep the code set small (≈6–10 app-wide); codes are for branching, `userMessage` carries specifics.
- Never put `e.message` in `userMessage` (leaks schema). Map known throws → typed `err`, log raw for operator, `throw e` for unknown.
- Success returns the minimal payload (`{ id }` or `null`), never the full Drizzle row — wire cost + couples wire shape to table shape + raw-row prototype serialization risk (L1 thread).
- Form renders `userMessage` verbatim; never invents "Something went wrong" — missing message = bug in the action.

**Misc.:**
- `ErrorCode`, `Result`, and the `err` signature must stay mutually consistent in `lib/result.ts`; lesson presents them as three blocks that agree (`code` union inlined in `Result` as shipped, then re-extracted as a named `ErrorCode` type in its own block for `err` to reference).
- `:::caution` in-lesson: naive `e.code === '23505'` is wrong on current Drizzle (code sits on `.cause`); keep inside the `isUniqueViolation` helper.
- Lesson-specific component `src/components/lessons/043/3/TwoChannels.astro` renders the two-channel (return→form / throw→`error.tsx`, with `redirect`/`notFound` as framework-convention branch) flow figure.
- Running entity stays `createInvoice` / `invoicesTable`.

## Lesson 4 — Thin actions, pure /lib

**Taught:** the three-kinds-of-code diagnosis (pure logic / side effect / orchestration braided in the fat action); Architectural Principle #3 (business logic is pure — no `cookies`/`headers`/`db`/`fetch`; side effects fire only at three named boundaries: Server Actions, route handlers, background jobs); the one decision rule *"does it touch a DB/cache/queue/external API? yes → boundary, no → /lib"*; the settled three-layer per-feature shape; Architectural Principle #5 (use the framework's seam, don't wrap `'use server'` in a custom DSL like `safeAction`); the bar a wrapper carve-out must clear and the two sanctioned ones (auth, billing); the assembled thin `createInvoice`.

**Cut:** Stayed in scope. The DI/swappable-repository alternative named only as the `db`-as-param anti-pattern's resolution (unit-test pure helpers, integration-test the action).

**Debts:**
- `authedAction(role, schema, fn)` wrapper + `ctx = { user, organizationId, role }` payload → Ch 057.2 (named as the only sanctioned action wrapper; wraps auth only — parse/mutate/revalidate stay inline).
- Thin billing interface (`billing.requirePlan()`, `billing.upgrade()`), `lib/billing/` as sole Stripe importer → Ch 064.6.
- `revalidatePath` + `db.transaction` + "external calls after the commit, never inside the transaction" → L5 (shown only as a `// → next lesson` comment in the assembled action).
- Route handlers as 2nd boundary → Ch 046; background jobs as 3rd boundary → Ch 066 (both named once in the #3 list).
- `getCurrentUser()` / `lib/auth` session read used abstractly in the assembled action — auth implementation → Ch 057.
- `lib/email.ts` thin adapter (email-send after the write, outside the transaction) named via the MCQ → Ch 048 / L5.
- Tenant scoping (`tenantDb(orgId)` factory, bare-`db` lint rule) deferred → Unit 9/10; `db/queries` shown reading by `orgId` but factory not introduced.

**Terminology:**
- Three kinds of code, color-coded chapter-wide in this lesson: **green = pure logic**, **orange = side effect**, **blue = orchestration**. The "braid" is the smell; the payoff is the same three colors *separated* into homes.
- "named boundary" = one of the three places side effects may fire (Server Action / route handler / background job).
- "thin orchestration" = the action body's job: parse → authorize → call `/lib` + `db/queries` → revalidate → return; never grows an abstraction layer over itself.
- **predicate** = pure boolean function (`canCreateInvoice(user, org): boolean`); the policy layer decides, the body reads the session.
- "repository" glossed but **the course name is `db/queries/<entity>.ts`** — use that, not `repository.ts`. As shipped the predicate is called `canCreateInvoice(user, user.organizationId)`.
- **DSL** = a custom mini-API (e.g. `safeAction`) a new hire must learn before reading an action; the cost #5 argues against.

**Patterns and best practices:**
- **Repository-naming decision resolved: data-access layer lives at `db/queries/<entity>.ts`** (the single file allowed to import `db`), NOT `lib/invoices/repository.ts` — aligns with code conventions. Project chapters and all later actions must follow this.
- Per-feature layout: `app/<route>/actions.ts` (thin, file-level `'use server'`) + `lib/<feature>/` (pure helpers like `calculate-total.ts`, `policy.ts` predicates) + `db/queries/<feature>.ts` (the only `db` importer) + `lib/result.ts`.
- Pure helpers and predicates as `export const fn = (...): RetType => ...` with explicit return types, verb-named (`calculateInvoiceTotal`, `canCreateInvoice`); action stays `export async function createInvoice(formData: FormData)`. As shipped, `calculateInvoiceTotal` uses `lineItems.reduce(...)`.
- **`db/queries/invoices.ts` exports (as shipped):** `findInvoiceByNumber(organizationId, number)`, `insertInvoice(data)`, `insertInvoiceLines(invoiceId, lineItems)` — line items go to their own child table via a separate write, not nested under the invoice. (The running example keys on invoice *number*, not slug.)
- Derive helper param types from the line-item schema, not the table: shipped is `type LineItem = z.infer<typeof lineItemSchema>` (`import type { lineItemSchema } from '@/lib/invoices/schema'`), never a hand-written parallel domain model (Principle #2).
- Anti-pattern: a `/lib` helper that imports `db`/`cookies` is mis-sliced — the side effect belongs at the boundary or in `db/queries`, never hiding in `/lib` (kills the "anything in `/lib` is test-safe" guarantee).
- Anti-pattern: passing `db` to a "pure" helper (`createInvoice(db, data)`) — looks like DI, but it's impure once it can write; default is unit-test pure helpers + integration-test the action.
- Anti-pattern: over-structuring `lib/<feature>/` by both feature and layer (`lib/invoices/repository/select.ts`) before the feature strains — one folder per feature.
- The wrapper-carve-out bar (all three at once): single concern + byte-identical boilerplate at every call site + getting it wrong is an incident, not a style nit. Auth and billing clear it; generic `safeAction` fails on "single concern."
- Don't wrap the action: the urge peaks after the 3rd near-identical body — type the parse line again. `next-safe-action`/`zsa` are real and reach a threshold for large teams standardizing dozens of actions, but the default is the framework's seam written plainly.

**Misc.:**
- The assembled thin action is still deliberately not-finished — transaction/revalidate shown as a `// db.transaction wraps the two inserts + revalidatePath → next lesson` comment (L1 non-working-skeleton convention continues).
- Notably the thin action no longer imports `db` directly (every DB touch routed through `db/queries/invoices`).
- **As-shipped code aligns to the chapter's canonical contract** (corrected after first draft): `err` is **positional** — `err(code, userMessage, fieldErrors?)`; `ErrorCode` is the seven-member set (the lesson exercises `validation`, `conflict`, `forbidden`, `internal`); parse failure feeds `z.flattenError(parsed.error).fieldErrors`; the insert stamps server-set identity columns `organizationId` (from `user.organizationId`) and `createdBy` (from `user.id`), never read from the client; header insert and line-items insert are separate writes (`insertInvoice` then `insertInvoiceLines`), wrapped in one `db.transaction` only in L5.
- Running entity stays `createInvoice` / `invoicesTable`.

## Lesson 5 — After the write

**Taught:** fills the mutate + revalidate seams and closes the action surface — `revalidatePath('/invoices')` as the blunt post-mutation cache move (path-string = URL) and its placement rule (seam 4, after mutate / before return, because it points the cache at nothing until the write commits); `redirect()` as a framework convention that rides the throw mechanism on the *success* path (not a `Result`, "throw that isn't an error") and the try/catch landmine (a broad catch swallows it → put `redirect` last, outside any catch); `db.transaction(async (tx) => {...})` for atomic multi-step writes (every write uses `tx`, commit-on-return / rollback-on-throw); the no-external-IO-inside-the-transaction rule (two teeth: no rollback for a charge/email + pooled-connection starvation → fire side effects after commit); idempotency at the concept level with only the form-side hidden input written; the assembled end-to-end `createInvoice`.

**Cut:** The writable `headers()` API inside a Server Action (chapter outline named it once at this seam) was deliberately dropped to protect cognitive load — niche security-headers concern, no payoff in the create-invoice flow; depth lives in Ch 075.4. Future header-related lessons should not assume it was introduced here.

**Debts:**
- Full cache-invalidation decision tree (`updateTag` read-your-writes, `revalidateTag(tag, profile)` eventual, `router.refresh`) → Ch 032.6 (named once + link, not re-taught); surgical/tag-scheme depth → Ch 072.
- Transaction levers (isolation `serializable`, savepoints/nested, `SELECT ... FOR UPDATE`, SQLSTATE 40001 retry loop) → Ch 039.4 (this lesson uses default flat transaction).
- Idempotency *implementation* (unique constraint, `INSERT ... ON CONFLICT DO NOTHING RETURNING` atomic check-and-claim, dedup ledger, cleanup) → Ch 063.4 ("One pattern, four surfaces").
- Durable external effects (process dies between commit and side-effect) → background jobs / `after()`, Ch 066.1.
- `redirect()` + optimistic-UI interaction (redirect cancels optimistic state) → Ch 044.5 / Ch 047.5 (named once).
- Auth wrapper / session read for the authorize seam → Ch 057; `sendInvoiceEmail` / `lib/email.ts` → Ch 048 — both appear as single abstract lines in the assembled action.
- Form layer that consumes the action (`<form action>`, `useActionState`, field errors, uncontrolled `defaultValue`) → Ch 044.
- Builds on Ch 032 (`'use cache'`), Ch 039.4 (transaction machinery), L1–L4 (five-seam spine, `Result`, parse, thin-action shape, `db/queries` taking `tx`).

**Terminology:**
- "revalidate" = mark a cached entry stale so the *next* request rebuilds it (does not rebuild immediately) — seam 4.
- `revalidatePath(path, 'page' | 'layout')` — second arg is **required** when the path has a dynamic segment (`/[org]/invoices`); never glue `/page` onto the path string.
- `redirect()` = framework convention that throws a control-flow signal caught internally; fires on success, last line, outside any catch.
- "atomic" / "roll back" = all writes commit together or none do / undo every write back to pre-transaction state.
- "pool starvation" = every pooled DB connection held open on slow work so new requests stall.
- "idempotent" = running with the same key has the same effect as running once; the key identifies *intent* (form-generated `crypto.randomUUID()`), not *content* (never a server-side input hash).

**Patterns and best practices:**
- Five-seam order is a correctness constraint, not style: `parse → authorize → mutate → revalidate → return`. `revalidatePath` after every mutation that touches a cached page is the default reflex.
- The transaction *is* the mutate seam (seam 3); error mapping (catch unique-violation → `err('conflict', ...)`) wraps the transaction from the outside, the transaction's only job is atomicity.
- Every `db/queries` helper called inside a transaction must take and use `tx` (not the global pooled `db`) — a helper closing over `db` breaks atomicity *silently*. This is why L4's helpers take `tx` as first param.
- Cache calls (`revalidatePath`) and all external IO (Stripe/Resend/fetch/R2/queue) live *outside* the transaction, after commit — neither has rollback semantics.
- Every action creating something **non-recoverable** (charges money, sends mail, ships goods) gets an idempotency key from day one; pure internal CRUD can defer. Form-side seam costs one line: `<input type="hidden" name="idempotencyKey" defaultValue={crypto.randomUUID()} />` (`defaultValue`, uncontrolled).
- `redirect()` last and outside any try/catch is the course default; re-throwing framework signals from inside a catch is the rare fallback.

**Misc.:**
- The L1→L4 deliberately-non-working-skeleton convention **ends here** for the mutate and revalidate seams — those are now real, working code. The authorize seam (`getCurrentUser()`) stays the one intentionally-stubbed abstract line (Ch 057); the post-commit `sendInvoiceEmail(invoice)` is a single named placeholder line (Ch 048).
- The assembled end-to-end `createInvoice` is the canonical artifact the Ch 047 project picks up and extends — order: parse → authorize → `db.transaction` (header + `insertInvoiceLines(tx, ...)`) → `sendInvoiceEmail` → `revalidatePath('/invoices')` → `redirect(\`/invoices/${invoice.id}\`)`.
- **As-shipped canonical action shape (Ch 047 inherits this verbatim):** inside the transaction the header insert is `tx.insert(invoicesTable).values({ ...parsed.data, organizationId: user.organizationId, createdBy: user.id }).returning()` — the server stamps the identity columns from the session `user`, never from the client (corrected from an earlier draft that stamped a nonexistent `userId`). Matches L2's `.omit({ id, organizationId, createdBy, createdAt })` and L4's `insertInvoice` contract. Signature `createInvoice(formData: FormData): Promise<Result<{ id: string }>>`; line items written via `insertInvoiceLines(tx, linesFor(invoice.id))`.
- No new Architectural Principle introduced — this lesson *applies* #5 (`revalidatePath`/`db.transaction`/`redirect` are platform seams). Principle work for the chapter is complete.
- Running entity stays `createInvoice` / `invoicesTable`.
