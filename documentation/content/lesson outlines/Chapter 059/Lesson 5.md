# Chapter 059 — Lesson 5 outline

## Lesson title

Title: **Send an invitation with a signed accept URL** (chapter-outline title fits — keep it).
Sidebar: **Send an invitation**

## Lesson type

`Implementation` — the student builds `sendInvitation`, the token/URL crypto helpers, the email template, and the pending query against the lesson's test suite. (Test-coder runs; the `Lesson 5.test.ts` stub is `describe.todo` and must be filled.)

## Lesson framing

The student walks away having designed a capability-bearing URL the senior way: an unguessable 32-byte random token that lives in the DB only as its SHA-256 hash, an HMAC signature keyed by a secret distinct from the auth secret, and a send-after-commit boundary that keeps a Resend outage from orphaning either the row or the email. The payoff is the transaction discipline — row write and `invitation.sent` audit row co-commit, the email goes out only after — plus the reflex that a duplicate-pending invite is a `conflict` Result caught at the index, not an exception that 500s the form.

## Codebase state

### Entry
From lesson 4 the access layer is complete: `tenantDb(orgId)` is the only scoped data facade, `authedAction(role, schema, fn)` is the only privileged-action shape, `withTenant(orgId, fn)` opens the `set_config('app.org_id', ...)` transaction, `logAudit(tx, event)` writes one row and refuses to run off-transaction, and `changeMemberRole` proves the wrapper end-to-end. The `auditLogs` table (RLS deny-write) exists; the `organization` / `member` / `invitation` plugin tables (with `tokenHash` / `acceptedAt` additionals) are migrated. The invite form, pending panel, and audit tail are rendered by the provided inspector but the invite form does nothing useful yet. Stubs awaiting this lesson: `src/env.ts` (no `INVITATION_SIGNING_SECRET` in the server block), `src/lib/invitations/url.ts` (4 helper stubs), `src/lib/invitations/send.ts` (`sendInvitation` stub), `src/db/queries/invitations.ts` (`listPendingInvitations` stub — `getInvitationById` belongs to L6), `src/emails/invite.tsx` (template stub `<Text>Invitation — TODO(L5)</Text>`).

### Exit
The full invite **send** path works: an admin submits the invite form, a `pending` `invitation` row lands with the chosen role, the `invitation.sent` audit row rides the same transaction, the React Email arrives in the student's real inbox with a `/accept-invite?id=&token=&sig=` CTA, and `tokenHash` holds a 64-char hex string while the raw token appears in no column. Duplicate-pending and already-member sends return `conflict`; a Resend failure still returns `ok({ ..., emailSent: false })` with the row intact. `INVITATION_SIGNING_SECRET` is validated at the env boundary. Opening the emailed URL loads the provided accept page but accepting does nothing — `acceptInvitation` is lesson 6.

## Lesson sections

Implementation contract order: intro (no header) → **Your mission** → **Coding time** → **Moment of truth**.

### Goal + Finished result (intro, no header)
One-sentence goal in user terms: an admin invites a teammate by email and the teammate gets a one-click link to join the org. Then a one-paragraph (or `Screenshot`) description of the finished state: inspector invite form submitted → pending panel + audit tail update; the React Email in an inbox with the "Accept invitation" button; in Postgres the `tokenHash` is hex and the raw token is nowhere. Use a `Screenshot` of the received email if available, otherwise prose.

### Your mission
Prose paragraph(s), then one `Checklist` of `[tested]`/`[untested]` requirements. No subsection headers, no implementation hints.

Frame the capability-URL threat model in user terms: possession of the URL is the authorization to join, so it must be unguessable, tamper-evident, and useless once read from the database. Weave in the constraints (no hints, just the decisions that shape the solution): the token is 32 random bytes (`crypto.getRandomValues`, base64url); store only `sha256(token)` so a DB read alone can't forge a link; HMAC-sign over `${invitationId}.${rawToken}` with `INVITATION_SIGNING_SECRET`, a secret distinct from `BETTER_AUTH_SECRET` because one key across two cryptographic uses tangles rotation; the row write and its `invitation.sent` audit row co-commit in one `withTenant(ctx.orgId, ...)` transaction; the email send sits *outside* that transaction (send-after-commit) so a Resend outage leaves the row plus a resend affordance rather than an orphan email on rollback; lowercasing belongs in the Zod schema (`z.email().toLowerCase()`) to match the partial unique index over `(organizationId, lower(email)) WHERE status='pending'`; the duplicate-pending `23505` is caught via `isUniqueViolation` and returned as `conflict`, never thrown. Out of scope (one line): accepting the invite is lesson 6; rate-limiting the send is chapter 074.

Requirements `Checklist` (verifiable outcomes, never file/export phrasing):
1. `[tested]` Submitting the invite form as an admin creates an `invitation` row with `status='pending'` and the chosen role, surfaced in the pending panel.
2. `[tested]` `tokenHash` holds a 64-character hex string and the raw token appears in no column of any table.
3. `[tested]` A successful send appends an `invitation.sent` audit row in the same transaction as the invitation insert (force-failing the insert lands neither).
4. `[tested]` A second invite to the same pending email returns `conflict` (the `23505` partial-index catch).
5. `[tested]` Inviting an email that already belongs to a member returns `conflict` (distinct message; fired by the membership pre-check, not the index).
6. `[tested]` When Resend rejects the send, the action returns `ok({ invitationId, emailSent: false })` and the row still exists.
7. `[untested]` The React Email arrives in the student's real inbox with the org name, inviter name, role, and a CTA whose href is `/accept-invite?id=...&token=...&sig=...`.
8. `[untested]` The emailed URL is well-formed and opening it loads the provided accept page (accepting only works once lesson 6 ships).

(Note for downstream agents: items 7-8 require the verified domain + live inbox, so they stay `[untested]`; the test-coder asserts 1-6 against SSR/source shape and Result shapes, inlining its own helpers per the suite's Node-env, no-DOM contract.)

### Coding time
One line directing the student to implement against the brief and the tests, then the reference solution in a `<details>` (the writer wraps it). Present the files in build order, each with its decision rationale.

- **`src/env.ts`** — add `INVITATION_SIGNING_SECRET: z.string().min(1)` to the server block and the matching `runtimeEnv` entry. Use `CodeVariants` (before/after) or a tight `Code` diff — the change is two lines. Rationale: the boundary validates the HMAC key at build time so a missing secret fails `next build`, not at first invite.

- **`src/lib/invitations/url.ts`** — `generateInviteToken` / `signedInviteUrl` / `verifyInviteSignature` / `sha256`. Best surfaced with `AnnotatedCode` (multiple parts deserve focus): the module-scope `keyPromise` importing the HMAC key once as non-extractable with `['sign','verify']` (rationale: pay the import cost once per process; non-extractable so the key can't be exfiltrated); the `payload()` helper concatenating `${invitationId}.${rawToken}`; `generateInviteToken` drawing 32 bytes via `crypto.getRandomValues` → base64url; `signedInviteUrl` building the `/accept-invite` URL with `id`/`token`/`sig` (sig base64url HMAC); `verifyInviteSignature` using `crypto.subtle.verify` (callout: constant-time, never a string `===` on a signature) — note this helper is consumed by L6's accept page, defined here because it shares the key; `sha256` returning a hex digest. Link to lesson 1 of chapter 016 for the Web Crypto primitives rather than re-explaining.

- **`src/emails/invite.tsx`** — `InviteEmail` template mirroring `welcome-verification.tsx`, reusing `EmailLayout` and `emailTailwindConfig`. Simple `Code` block. Callout: `InviteEmail.PreviewProps` for the react-email dev preview; the URL is also printed as plaintext below the button for clients that strip buttons. Link to chapter 049 for React Email authoring.

- **`src/db/queries/invitations.ts`** — `listPendingInvitations(orgId)` only (`getInvitationById` is the L6 stub in the same file — do not show it here, link forward to lesson 6). `Code` block. Callouts on the two non-obvious choices: the `.with: { user: true }` relation is named `user` (not `inviter`) because `auth:generate` names invitation's `one(user)` join on `inviterId` as `user`, so `row.user` *is* the inviter; and `acceptUrl` is omitted from the row because the raw token is never stored, so a pending row cannot reconstruct its signed URL — the seed prints the one known URL and the dev `<CopyAcceptUrl>` reads it from there. Reads through `tenantDb(orgId)` with `status='pending'` + unexpired filter.

- **`src/lib/invitations/send.ts`** — `sendInvitation` as `authedAction('admin', sendInvitationSchema, fn)`. The centerpiece — use `AnnotatedCode` to walk the transaction boundary. Steps to highlight: the module-local (non-exported) `sendInvitationSchema` with the `z.email().toLowerCase()` lowercasing (callout: a `'use server'` module may export only async functions, so the Zod object stays unexported — Next 16.2.7 rejects a non-function export at runtime); the existing-member pre-check returning `conflict` (covers requirement 5's distinct layer); token generation + `sha256` hash; the hand-rolled `tx.insert(invitation)` inside `withTenant(ctx.orgId, ...)` (callout: never `auth.api` — the plugin's after-hooks run post-commit and would break the one-transaction audit contract); `logAudit(tx, { action: 'invitation.sent', ... })` in the same tx; the `isUniqueViolation(e)` catch → `conflict` (covers requirement 4; rationale: the `23505` partial-index violation is a domain conflict, not a crash); the `sendEmail({ ..., idempotencyKey: \`invite:${invitationId}\` })` call placed *after* the transaction commits (callout: send-after-commit — the most important decision in the file); the `ok({ invitationId, emailSent: sent.ok })` return where send failure is a flag on the success shape, not an error branch (covers requirement 6); `revalidatePath('/inspector')`. Link to lesson 2 of chapter 058 (signed URL, send-after-commit) and lesson 4 of chapter 058 (unique-violation → conflict).

Optional diagram: a small `ArrowDiagram` of the send path — `generateToken → sha256(hash) → [withTenant tx: insert row + logAudit] → commit → signedInviteUrl → sendEmail` — clarifies the commit boundary that prose alone makes easy to miss. Brief it only if the prose feels crowded; the flow is linear enough that an annotated `sendInvitation` may suffice.

External resources (if any) appended after the `<details>` with no header — added later by the resourcer.

### Moment of truth
The test command `pnpm test:lesson 5` and the expected pass output (all suite cases green; note the suite asserts the co-transacted row+audit write, the `tokenHash` shape, the duplicate-pending and already-member `conflict` results, and the raw-token absence). Then a hand-confirm `Checklist` for the inbox/URL items the suite can't cover:
- As admin, submit the invite form with the student's real email + role `member`: pending panel updates, audit tail shows `invitation.sent`.
- The inbox receives the React Email with the CTA pointing at `/accept-invite?id=...&token=...&sig=...`.
- In Postgres (`pnpm db:studio` or `psql`), `tokenHash` is 64-char hex and the raw token is in no column.
- Opening the link loads the provided accept page (clicking Accept does nothing until lesson 6).
- Inviting the same email again surfaces a `conflict`.

## Scope

- **Accepting the invitation** — the accept page action, the unscoped `getInvitationById`, the verify ladder, and the active-org switch are lesson 6. The accept-invite page and `accept-form.tsx` are provided; this lesson only confirms the emailed URL *loads* it.
- **The signed-URL / SHA-256-at-rest / HMAC theory** — owned by lesson 2 of chapter 058; lesson 1 of chapter 016 owns the Web Crypto primitives. Link, don't re-derive.
- **`withTenant` / `logAudit` / `tenantDb` / `authedAction` mechanics** — built in lessons 3-4 of this chapter; reuse, don't re-explain.
- **React Email authoring fundamentals** — chapter 049. The `EmailLayout` wrapper and `emailTailwindConfig` are carry-in.
- **Rate-limiting the send** — chapter 074. **Seat-counting / entitlement gate** — chapter 064. Neither is built here.
