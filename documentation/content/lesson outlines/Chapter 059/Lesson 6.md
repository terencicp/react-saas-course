# Chapter 059 — Lesson 6 outline

## Lesson title

- Page title: **Accept the invitation behind the provided arrival surfaces**
- Sidebar title: **Accept invitation**

Title from the chapter outline fits — it names the capability (accept) and the senior frame (the action sits behind provided UI surfaces; the student writes only the write path). Kept as-is.

## Lesson type

**Implementation**

(Test-coder runs for this lesson; writer renders the Implementation section list.)

## Lesson framing

The student installs the seat-grant write path that turns a signed capability URL into org membership, and walks away knowing the senior reflex that separates UI verification from write-path verification: the page's verify ladder is a doorman for *which screen to show*, while `acceptInvitation` re-verifies everything independently because a form POST is a different request than the render that drew it. They internalize three more senior calls — auditing the join inside the same transaction that grants the seat (no orphaned membership without a record), bypassing the shared `logAudit` helper precisely once because the actor is not yet a member, and switching the active org only *after* commit because the plugin refuses to activate an org the caller cannot yet see. This lesson closes every remaining Project goal: the invite handshake now works end-to-end across all six arrival surfaces.

## Codebase state

### Entry

Carries everything lessons 2–5 shipped: organization plugin on the session with `activeOrganizationId`; `roleAtLeast` / `requireOrgUser`; the `auditLogs` table with RLS deny-write policies and `withTenant` / `logAudit`; the `tenantDb` facade, `authedAction` wrapper, and `changeMemberRole`; the signed-URL helpers (`generateInviteToken` / `signedInviteUrl` / `verifyInviteSignature` / `sha256`), `sendInvitation`, `listPendingInvitations`, and the `InviteEmail` template. The student can already invite an email, see the React Email land in their inbox, and open the emailed `/accept-invite?id=&token=&sig=` URL — the provided accept page renders an arrival surface — but clicking **Accept** does nothing: `src/lib/invitations/accept.ts` (`acceptInvitation`) and the `getInvitationById` query in `src/db/queries/invitations.ts` are still TODO stubs. The provided `/accept-invite/page.tsx` and `accept-form.tsx` already exist in full and reference both stubs.

### Exit

`getInvitationById` is the unscoped read the verify ladder and the action both depend on; `acceptInvitation` is wired behind the provided page. Clicking Accept on a valid pending invite (matching, signed-in email) writes the `member` row with the invited role, flips `invitation.status` to `'accepted'` and sets `acceptedAt`, auto-verifies the user's email if unverified, and appends an `'invitation.accepted'` audit row — all in one `withTenant` transaction — then switches the active org and redirects to `/dashboard`. All Project goals under Chapter framing are satisfied; the full invite handshake works end-to-end. This is the final lesson of the chapter.

## Lesson sections

Render the Implementation section list from the contract: *Goal + Finished result* (intro, no header) → **Your mission** → **Coding time** → **Moment of truth**.

### Goal + Finished result (intro, no header)

One-sentence goal in user terms: a stranger who clicks the emailed invite link becomes a member of the org with the invited role. Then a one-paragraph description of the feature working: opening the emailed URL in a private window renders the right arrival surface (refused / expired / already-member / mismatch / sign-in / sign-up / consent); signing up via the prefilled flow and clicking Accept lands on `/dashboard` with the invited org active; the inspector then shows the new member with the invited role, an `'invitation.accepted'` audit row in the tail, and `user.emailVerified` true. Optionally a short animated capture (private-window open → prefilled sign-up → consent screen → Accept → dashboard in the invited org) wrapped in `<Figure>` / `Screenshot`; a still of the consent surface suffices if no capture.

### Your mission (header: "Your mission")

Coherent prose paragraph, no subsection headers, no implementation hints. Weave in:

- **Feature** (user terms): accepting an emailed invite turns the recipient into a member of the inviting org with the role they were invited at.
- **The shaping senior calls** (constraints, not hints):
  - The provided Server Component runs a fixed-order verify ladder (signature → row → hash → expiry → status → identity) and picks one arrival surface; the student writes the *action* behind the consent screen's Accept button, plus the unscoped `getInvitationById` read the ladder leans on.
  - The page's verification decides only *which screen renders*; the form POST is a separate request, so the action must re-verify independently (re-fetch the row, re-hash `sha256(token) === tokenHash`, re-check expiry / status / session-email) — `sig` is the page's pre-DB doorman and is **not** an action input.
  - This action is **not** wrapped in `authedAction`: the signed invitation is the authority, not a role.
  - `getInvitationById` is the project's one deliberately *unscoped* read — the invitee belongs to no org yet, so it bypasses `tenantDb` and goes through the unwrapped `db`.
  - The seat-grant, status flip, email-verify flip, and audit row co-transact in one `withTenant(invitation.organizationId, …)` transaction (direct `tx` writes throughout — never `auth.api.acceptInvitation`, whose `after` hooks run post-commit and break the one-transaction audit contract).
  - The audit row is the lone one in the project inserted **directly through `tx`**, not via `logAudit`: `logAudit` derives org from `requireOrgUser`, but the accepting user is not yet a member, so that read resolves to nothing and would redirect mid-transaction — org + actor come from the invitation row and the validated session.
  - `auth.api.setActiveOrganization` runs **after** commit (the one sanctioned `auth.api` write) because the plugin refuses to activate an org the caller is not yet a member of.
  - The `emailVerified` carve-out: flip it to `true` when the accepting user is unverified — receiving the click on the invited email is itself proof of ownership, sparing a verify-loop right after.
  - The explicit Accept button is a consent gate: auto-accepting on GET would let URL-scanning crawlers and corporate URL-rewriters silently consume the invite.
  - Email comparison is case-insensitive on both sides (invitation lowercased at write time, session email at compare time); the double-click race resolves because the status flip filters on `status='pending'`.
- **Out of scope** (one line): the verify ladder and the six arrival-surface components are provided in full — the student reads them, not writes them; revoke/resend affordances are not in this project.

Then the **Functional requirements** numbered list (the only list in the section), each tagged `[tested]` / `[untested]`, phrased as outcomes, no file/export names. Use `Checklist` with `tested`/`untested` chips. Mapping grounded against the test scope in the chapter outline (suite asserts the in-transaction member-join + audit write, the email-mismatch and re-verify refusals, and the after-commit active-org switch):

1. `[tested]` Clicking Accept on a valid pending invite while signed in with the matching email writes a member row with the invited role.
2. `[tested]` Accepting flips the invitation to `'accepted'`, sets `acceptedAt`, and appends an `'invitation.accepted'` audit row — all in one transaction (a failure in any write rolls back the seat-grant with its audit row).
3. `[tested]` Submitting with a token whose `sha256` does not match the stored `tokenHash` is refused (the action re-verifies independently of the page).
4. `[tested]` Submitting while signed in with an email other than the invited one is refused, naming the invited address.
5. `[tested]` Submitting an expired or already-accepted invitation is refused.
6. `[tested]` After accepting, `session.activeOrganizationId` is the invited org (set after commit).
7. `[tested]` A user who is unverified at accept time has `emailVerified` true afterward, with no separate verification email sent.
8. `[tested]` Two simultaneous Accept submissions resolve to one success and one no-op (the `status='pending'` precondition matches nothing on the second).
9. `[untested]` Opening a valid pending URL signed in with the matching email renders the Accept button alongside org name, inviter name, and role (provided page surface — confirmed by hand).
10. `[untested]` A mangled `sig`, a missing row, and a hash mismatch all collapse to the same generic refusal (provided ladder — confirmed by hand).
11. `[untested]` Signed out with no account renders a prefilled sign-up that, on success, returns to the accept URL and then the Accept button; signed out with an existing account renders the prefilled sign-in (provided surfaces — confirmed by hand).
12. `[untested]` After accepting, the redirect lands on `/dashboard` in the invited org (the `redirect()` aborts the action; confirmed by hand).

(Items 9–12 are page-render / redirect behaviors the suite cannot assert against the student's action alone — they exercise provided code or terminate in a `redirect()`/active-org switch the by-hand pass confirms. The test-coder owns the precise split when generating the suite; this is the intended boundary.)

### Coding time (header: "Coding time")

Build prompt one-liner: "Implement against the brief and the lesson's tests, then read the reference walkthrough." Solution hidden in `<details>` (writer wraps it). Organize the walkthrough in repo order.

**Reference implementation, two files:**

1. `src/db/queries/invitations.ts` — `getInvitationById(id)`: a single `db.query.invitation.findFirst({ where: eq(invitation.id, id) }) ?? null` through the **unwrapped `db`** (the file already imports `'server-only'`). Render with `Code`. Rationale callout (one-two sentences): this is the project's only non-scoped read — the invitee is not yet a member of any org, so there is no tenant to scope to; the signed token is the authorization and the org is derived from the loaded row. It returns the full row so both the page's verify ladder and the action can read `tokenHash` / `status` / `expiresAt` / `organizationId` / `role`.

2. `src/lib/invitations/accept.ts` — `acceptInvitation`. Render with `AnnotatedCode` (multiple parts need focus): the module-local schema, the re-verify guards, the identity check, the single `withTenant` transaction block, and the post-commit `setActiveOrganization` + `redirect`. Annotation steps:
   - **Schema is module-local, not exported.** A `'use server'` module may export only async functions (Next 16.2.7 rejects a non-function export at runtime); `id` is the Better Auth invitation *text* id — `z.string().min(1)`, never `z.uuid()`.
   - **The validity guard collapses four failures into one refusal.** `!row || sha256(token) !== row.tokenHash || row.expiresAt < new Date() || row.status !== 'pending'` → `err('not_found', …)`. This is the action re-verifying independently of the page; covers `[tested]` 3 and 5. Note `sig` is absent — it is the page's doorman, not an action input.
   - **The identity guard.** `!currentUser || currentUser.email.toLowerCase() !== row.email` → `err('forbidden', …)` naming `row.email` (invitation email is already lowercased at write time). Covers `[tested]` 4.
   - **One `withTenant(row.organizationId, …)` transaction, four writes:** insert `member` (`id: crypto.randomUUID()`, `userId`, `organizationId`, `role: row.role ?? 'member'`, `createdAt`) and capture `newMember` via `.returning`; `update` invitation to `status='accepted', acceptedAt=new Date()` with the `and(eq(invitation.id, id), eq(invitation.status, 'pending'))` precondition (the double-click guard — covers `[tested]` 8); conditional `update` of `user.emailVerified` to `true` when `!currentUser.emailVerified` (covers `[tested]` 7); insert the audit row **directly via `tx`** (org + actor from the invitation row and session, `actorIp` / `actorUserAgent` from `headers()`, `payload: { newMemberId, role }`). Covers `[tested]` 1 and 2.
   - **After commit:** `auth.api.setActiveOrganization({ headers: h, body: { organizationId } })`, then `redirect('/dashboard' as Route)`. Covers `[tested]` 6 and `[untested]` 12.

   Decision rationale to surface (one-two sentences each, grounded in the chapter outline's two long comments in this file):
   - Why the audit row bypasses `logAudit` (the helper derives org from `requireOrgUser`, which redirects mid-transaction for a not-yet-member). Link rather than re-explain the `logAudit` contract → lesson 5 of chapter 057.
   - Why never `auth.api.acceptInvitation` (its `after` hooks run post-commit, breaking the one-transaction audit contract).
   - Why `setActiveOrganization` runs after commit (the plugin refuses to activate an org the caller cannot yet see).
   - Why the action re-verifies despite the page already verifying (the POST is a separate request).

   Callout on what looks unusual at a glance: hand-rolled `tx` writes instead of the plugin's accept endpoint; the audit insert not going through the project-wide `logAudit` helper (the deliberate lone exception).

   Brief the *provided* surfaces lightly — the student should read `/accept-invite/page.tsx` to see the verify ladder and arrival shapes their action sits behind, but the walkthrough does not re-author them. Use `CodeVariants` is unnecessary here; a short `FileTree`-free pointer plus the link suffices.

**Optional diagram (Coding time, in `<Figure>`):** the verify ladder is a six-branch fixed-order decision flow that prose carries poorly. Brief a Mermaid `flowchart LR` decision tree: signature → row → hash → expiry → status → signed-in? → email-match? terminating in the arrival surfaces (refused / expired / already-member / sign-up / sign-in / mismatch / consent), with the consent leaf labeled "← the action you write sits here." Keep it compact (cap height per the diagrams guidance). This orients the student to the provided page; it is provided code, so keep the diagram lightweight, not the lesson's centerpiece.

**External resources:** none briefed; the resourcer may append after the `<details>` (no header).

### Moment of truth (header: "Moment of truth")

Test command and expected pass output:

```
pnpm test:lesson 6
```

Show the expected passing summary line (the writer mirrors the runner's actual format; pass/fail surface only). State what the suite asserts: the in-transaction member-join + audit write on accept, the email-mismatch and re-verify refusals, and the after-commit active-org switch. Add the prerequisite note: the accept-across-email-sessions check needs the student's **verified domain from chapter 050** — the Resend sandbox sender will not deliver to a personal inbox.

By-hand checklist (`Checklist`, continuing from lesson 5's invite, each item the student ticks):

- Open the emailed URL in a private window: the prefilled sign-up surface renders. Sign up; auto-redirect to the accept URL; the consent surface renders the Accept button.
- Click Accept: redirected to `/dashboard` with the invited org active. In the inspector, the new member row exists with the right role, the audit tail shows `'invitation.accepted'`, and `user.emailVerified` is true.
- Flip one character of the `sig` query param: the generic refusal renders.
- Re-open an already-accepted URL (use the seeded pending invite's Copy-accept-URL after accepting once, or hand-edit `status`): the "already a member" screen renders.
- Sign in as Carol (a different email) and open the URL: the email-mismatch refusal renders.
- Open the accept URL in two tabs and click Accept simultaneously: one wins, the other is a no-op against the `status='pending'` filter.

Close with the chapter-completion note: the full invite handshake now works end-to-end across all arrival surfaces, every Project goal under Chapter framing is satisfied, and the forward references hold (chapter 062 layers `active()` / `archived()` onto `tenantDb`; chapter 071 dispatches notifications on `invitation.sent` / `member.role-changed`; chapter 074 rate-limits `sendInvitation`; chapter 081 hardens audit + retention).

## Scope

This lesson does not cover:

- **The verify ladder and the six arrival-surface components** — provided in full at `/accept-invite/page.tsx`; the student reads them, the writer does not re-author them. Their pedagogy is owned by lesson 3 of chapter 058 (arrival surfaces, verify order, consent gate, auto-verify).
- **The signed-URL generation, token, hash-at-rest, and send path** — shipped in lesson 5 of this chapter; link rather than re-explain.
- **The `logAudit` transaction-required contract and the `auditLogs` RLS** — owned by lesson 3 of this chapter and lesson 5 of chapter 057; this lesson only references why the accept path is the one exception.
- **Email-mismatch refusal and the double-click race rationale** — owned by lesson 5 of chapter 058; link, do not re-derive.
- **Revoke / resend / leave-org / ownership-transfer** — not in this project (scope cuts under Chapter framing; lesson 4 of chapter 057 owns the full member-management set).
- **Rate-limiting the invite/accept surface** — chapter 074.
