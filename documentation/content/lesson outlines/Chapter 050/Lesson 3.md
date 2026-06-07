# Lesson 3 — The suppression-gated send wrapper

- **Title:** The suppression-gated send wrapper
- **Sidebar:** Send wrapper
- **Type:** Implementation

## Lesson framing

The student installs `src/lib/email.ts` as the one chokepoint every email this SaaS will ever send must pass through — the seam that reads the suppression list, defaults `from`/`reply_to` from validated env, requires an idempotency key, and returns a `Result` instead of throwing.
The senior payoff is the discipline made structural: no future caller (auth verification, invites, billing receipts, the notification dispatcher) re-remembers the suppression check or the idempotency reflex, because the wrapper owns them.
Architectural Principle #3 (side effects at a named boundary) made operational, with Principle #5's corollary applied — the wrapper is a thin convenience layer over Resend, deliberately *not* a generic provider abstraction.
No email is sent yet; everything proves out at compile/boot/probe time. The send path lands in Lesson 4.

## Codebase state

### Entry
The starter runs from Lesson 1; the verified transactional subdomain and `RESEND_API_KEY` are in hand from Lesson 2.
Three files carry `TODO(L3)` stubs: `src/env.ts` (server block has only the three DB vars, `client: {}` empty), `src/lib/suppressions.ts` (`isSuppressed` is a no-op returning `{ suppressed: false }`, no DB import), `src/lib/email.ts` (`sendEmail` returns `err('internal', 'sendEmail not implemented')`, no Resend client, no env reads).
`src/lib/result.ts` (with `'forbidden'` already in the union), `src/db/*`, `src/lib/auth-stub.ts`, the `email_suppressions` table + `suppression_reason` enum, and `scripts/seed.ts` (one pre-suppressed row) are all provided. `.env` carries placeholder values the student fills in this lesson.

### Exit
`src/env.ts` validates the five new entries (`RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO` server; `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_URL` client), each wired into `runtimeEnv`; a missing `RESEND_API_KEY` fails the boot with a Zod error naming the variable.
`isSuppressed` queries `email_suppressions` against a normalized email and correctly applies the `bypassUntil` window and the `manual_unsubscribe`+transactional carve-out.
`sendEmail` is importable with its full signature, reads suppressions at the edge, short-circuits a suppressed recipient with `err('forbidden', ...)` before any Resend call, and fails closed if the read itself throws.
The app still boots and `/inspector/send-welcome` still renders; the send button keeps returning the Lesson 4 action stub's error (the template and action land next lesson).

## Lesson sections

### Goal + Finished result (intro, no header)
One-sentence goal: install `src/lib/email.ts` as the single suppression-gated, idempotency-key-required seam every email passes through.
Then one paragraph describing the finished, *unsent* result: a `sendEmail` that compiles and imports cleanly, an `isSuppressed` that reports the seeded suppressed address as suppressed and any other as clear, and an env schema that refuses to boot without `RESEND_API_KEY` — all proven before a single email is sent. No screenshot (nothing visual ships this lesson); a one-line note that the verification is compile + boot + a probe, not an inbox.

### Your mission
Prose paragraph (no subsection headers, no implementation hints) framing the chokepoint in project terms: every transactional email the SaaS will ever send flows through the one `sendEmail` function, so the seam carries the disciplines no caller should remember — reads the suppression list before calling Resend, defaults `from`/`reply_to` from validated env, requires an idempotency key, returns a `Result` rather than throwing.
Weave the constraints that shape the solution: Principle #3 made operational and Principle #5's corollary (the Resend client is *not* wrapped in a generic `EmailProvider` interface — the swap cost doesn't justify the abstraction tax, so this is a convenience layer, never an abstraction layer); construct the Resend client as a module-scope singleton, not per-call; keep the suppression read at the wrapper and nowhere else (a caller double-checking is the smell); make `idempotencyKey` a required parameter, not optional (every transactional send has a logical event to key on, and the required shape forces replay-safety thinking); default `from` to env with no per-call override (per-call senders land multi-tenant mail on the wrong subdomain); log dispositions with structured fields (`console.info('[email] sent', { id, to, subject })`, `console.error('[email] failed', …)`), not freehand strings — the structured-log pattern Chapter 092 generalizes.
Out of scope (one line): the marketing send path and the bounce/complaint webhook *writer* — `isSuppressed` takes a `kind` arg so the transactional bypass is honored, but only `kind: 'transactional'` is exercised here.

Then the **Functional requirements** numbered list rendered with `Checklist`/`ChecklistItem`, each tagged `[tested]` or `[untested]`. Phrase each as a verifiable outcome, never a file/export/import. Tagging reflects what an automated suite can reach without a live Resend/inbox (the test-coder asserts the `[tested]` ones against the student's `isSuppressed`/`sendEmail` and the env schema; the rest live in the reference solution / by-hand checks):

1. `isSuppressed` reports the seeded suppressed address as suppressed and an unrelated address as clear. `[tested]`
2. `isSuppressed` normalizes the email (trim + lowercase) before querying, so casing and whitespace can't slip past the gate. `[tested]`
3. An active `bypassUntil` window reports the recipient as not suppressed. `[tested]`
4. A `manual_unsubscribe` row reports a *transactional* recipient as not suppressed while still suppressing a *marketing* recipient. `[tested]`
5. `sendEmail`, given a suppressed recipient with no `bypassSuppression`, returns `err('forbidden', 'This recipient is on the suppression list.')` without calling Resend. `[tested]`
6. `sendEmail` fails closed — if the suppression read throws, it returns `err('internal', 'Could not send email.')` before any send. `[tested]`
7. `sendEmail` is importable with its full signature (`to`, `subject`, `react`, required `idempotencyKey`, optional `replyTo`, optional `bypassSuppression`) returning `Result<{ id: string }>`. `[tested]`
8. The five new env entries load, are typed, and are wired into `runtimeEnv`. `[untested]` (env loading is exercised at boot, not by the suite)
9. A missing `RESEND_API_KEY` stops the boot with the `@t3-oss/env-nextjs` Zod error naming the variable; restoring it boots cleanly. `[untested]` (by-hand boot check)

Note for the test-coder: tests run in the Vitest node env against a real local Postgres (the seeded suppressed row already exists; bypass/marketing cases need rows the test inserts and cleans up). Requirement 5's "without calling Resend" is asserted by reaching `forbidden` while `RESEND_API_KEY` is set to a value that would fail a real send — the short-circuit must return before the SDK call. The suite must not perform a real network send.

### Coding time
One line directing the student to implement the `src/env.ts` additions, `src/lib/suppressions.ts`, and `src/lib/email.ts` against the brief and the tests, then attempt before reading the solution. Note that `src/lib/result.ts` needs no edit — its error-code union already carries `'forbidden'`.

Hidden `<details>` reference solution (writer wraps it), organized as it appears in the repo. Use `Code` for each file block; reach for `AnnotatedCode` on `email.ts` to walk the four ordered checks (normalize → suppression read in try/catch → short-circuit before Resend → send + log dispositions), since student focus needs directing to the ordering and the fail-closed branch. The three files match the solution verbatim:

- **`src/env.ts`** — add `RESEND_API_KEY: z.string().min(1)`, `EMAIL_FROM: z.string().min(1)`, `EMAIL_REPLY_TO: z.email()` to the `server` block; `NEXT_PUBLIC_APP_NAME: z.string().min(1)`, `NEXT_PUBLIC_APP_URL: z.url()` to the `client` block; then add each to `runtimeEnv` (the t3-oss split requires schema *and* runtimeEnv). Rationale (one line): `NEXT_PUBLIC_APP_URL` is the same value Unit 8 reuses when it swaps the placeholder verify link for a signed token; the client block is non-empty for the first time here. Cover the `[untested]` env work: each var's `process.env.X` line in `runtimeEnv`, why `EMAIL_FROM` is `z.string().min(1)` (full `Display Name <local@send.domain.tld>` format, not an email) while `EMAIL_REPLY_TO` is `z.email()` (a bare monitored mailbox).
- **`src/lib/suppressions.ts`** — `import 'server-only'`; `isSuppressed(email, { kind })` normalizes (`email.trim().toLowerCase()`), single-index lookup on `email_suppressions` by the normalized email, returns in order: no row → `{ suppressed: false }`; `bypassUntil > new Date()` → `{ suppressed: false, bypassUntil }`; `reason === 'manual_unsubscribe'` with `kind === 'transactional'` → `{ suppressed: false, reason: 'manual_unsubscribe' }`; otherwise → `{ suppressed: true, reason }`. Rationale: the resolution order (bypass window beats reason check); normalization keeps the lookup aligned with the seeded/webhook-written rows on the unique-on-email index. Link to lesson 4 of chapter 048 for the suppression semantics rather than re-explaining.
- **`src/lib/email.ts`** — `import 'server-only'`; `const resend = new Resend(env.RESEND_API_KEY)` at module scope (singleton from lesson 1 of chapter 048; avoids per-request re-allocation, Unit 18 names this as the MSW boundary). `sendEmail` body: normalize `to`; `isSuppressed(normalizedTo, { kind: 'transactional' })` inside try/catch (thrown read → `err('internal', 'Could not send email.')`); if suppressed and not bypassed, `console.info('[email] suppressed', { to })` and return `err('forbidden', 'This recipient is on the suppression list.')` *without calling Resend*; otherwise `await resend.emails.send({ from: env.EMAIL_FROM, to: [normalizedTo], replyTo: input.replyTo ?? env.EMAIL_REPLY_TO, subject, react }, { idempotencyKey })`; on `error || !data` log `[email] failed` and return `err('internal', 'Email send failed.')`; on success log `[email] sent` and return `ok({ id: data.id })`.

Decision-rationale callouts (one or two sentences each): the required (not optional) `idempotencyKey`; the env-only `from` with no call-site override; the suppression hit reusing the existing `'forbidden'` code rather than minting a new one; the wrapper returning the `Result` union with no throws on expected failures so callers read the `ok` boolean instead of try/catch; the leading top-of-file comment that names the seam's contract. Anything that looks unusual at a glance: `to: [normalizedTo]` (array form Resend expects) and the `Awaited<ReturnType<typeof isSuppressed>>` type annotation on the try-scoped variable. Link to lesson 4 of chapter 043 for the named-boundary principle and lesson 1 of chapter 048 for the do-not-wrap rule rather than re-explaining.

No diagram needed — the flow is linear and the `AnnotatedCode` on `email.ts` carries it.

### Moment of truth
The test command (`pnpm test:lesson 3`) and the expected pass output (the writer fills the exact line count once the test-coder lands; describe it as the green summary for the Lesson 3 suite).
Then the by-hand checklist (`Checklist`) for what the suite can't reach:

- Comment out `RESEND_API_KEY` in `.env`, run `pnpm dev` (or `pnpm build`); confirm it fails with the `@t3-oss/env-nextjs` Zod error naming the variable, then restore it and confirm a clean boot. (covers requirement 9)
- Run an `isSuppressed` probe — a `pnpm tsx` one-liner importing the helper — against the seeded `suppressed@…` address and an unrelated address; confirm `true` then `false`; delete the scratch.
- Confirm `pnpm dev` boots cleanly and `/inspector/send-welcome` renders (the send button still returns the action stub's error — the action lands next lesson).

## Scope
- The actual email send, the `WelcomeEmail` template, and the `sendWelcomeEmail` Server Action — Lesson 4 (the welcome email send path).
- Verified-domain setup, SPF/DKIM/DMARC, obtaining the `RESEND_API_KEY` value — Lesson 2 (the verified-domain ceremony).
- The `email_suppressions` schema, the unique-on-email index, and the full suppression semantics — lesson 4 of chapter 048 (carry-in; the table ships pre-written).
- The bounce/complaint webhook that *writes* suppression rows — lesson 5 of chapter 063 (out of scope; this lesson only reads).
- The marketing send path / the `kind: 'marketing'` branch in production use — not exercised here; the arg exists so the transactional bypass is correct.
- The `Result<T>` type and `'forbidden'` code — carry-in from chapter 043 (no edit this lesson).
