# Lesson 4 — Pending invites: list, resend, revoke, collide

**Title (h1):** The pending-invites surface: list, resend, revoke, collide
**Sidebar label:** Pending invites

---

## Lesson framing

This is the **management surface** for the rows lessons 1–3 created.
Lessons 2–3 covered one invite end to end (mint → email → accept).
This lesson zooms out to the steady state an admin actually lives in: *several* pending invites at once, some opened, some ignored, one a typo — and the three buttons that operate on them.

Pedagogical spine: **the pending-invite row is a tombstone for "what we promised."**
Every action here (resend, revoke, re-invite) is reasoned from that one idea — rows are cheap and historical, so we never DELETE, never silently mutate a promise the email already made, and never extend a security window in place.
That single mental model derives all four senior calls; teach it first, then let each action fall out of it.

This is a **mechanics lesson with one real decision thread** (resend rotates the token + expiry by default — it is not a re-send of the same URL).
The other load-bearing teaching is **let the database enforce the collision, then catch-and-translate** — the partial unique index from lesson 1 is the source of truth for "already invited," and the action's job is to turn that DB error into an actionable UI branch, not to pre-check with a racy SELECT.

Three deliberate framings keep cognitive load down:
1. Build the **read** first (the list the admin stares at), so the three actions have a surface to mutate and revalidate.
2. Present each action as a **diff against `sendInvitation`** (lesson 2) — students already know the eight-step send shape; resend reuses six of those steps, revoke is a three-line subset. Anchoring on the known action avoids re-teaching the wrapper, the transaction seam, and the audit write.
3. Reserve the `'already-member'` case, email mismatch, and the double-click-race deep dive for lesson 5 — this lesson owns only the **`'already-invited'`** collision (a *pending invite* already exists), which is purely a DB-constraint story.

Target student already has: `authedAction('admin', schema, fn)`, `withTenant(orgId, tx)`, `logAudit(tx, event)`, `tenantDb(orgId)` reads, the `Result` type with `ok`/`err`, `revalidatePath`, the `invitation` table + partial unique index (L1), the `sendInvitation` action with its `emailSent` flag and `signedInviteUrl`/`sha256` helpers (L2). Do not re-teach any of these — reference and reuse.

End state: the student can render an expiry-filtered pending-invites list, wire two admin Server Actions (`resendInvitation`, `revokeInvitation`) that reuse the send path's seams, and translate a unique-constraint violation into a typed `'already-invited'` result the UI turns into a "resend or revoke?" prompt.

---

## Lesson sections

### Three pending invites and three buttons (introduction)

Open on the concrete scenario from the chapter outline, kept tight: Alice sent three invites last week — Bob never opened his, Carol opened but didn't accept, Dave's address was a typo (`dav@acme.com`).
Alice opens `/settings/members` and needs to: *see* what's still pending and how long each has left, *resend* Bob's (maybe his went to spam), *fix* Dave by revoking the typo and inviting the right address, and *trust* that Carol's hasn't quietly expired.

State the senior question implicitly: what is the read surface, what are the three actions on a pending row, and how does re-inviting an address that's already pending behave?
Preview the build: one Server-Component list + two `authedAction('admin', …)` actions + one catch-and-translate.
Connect back: these are the rows lesson 1 modeled and lesson 2 wrote; now we manage them. Keep warm and brief (~4–6 sentences).

No diagram here — the scenario *is* the framing.

---

### Reading the pending list: filter expiry in the query, not the row

The read surface. Teach this first so the actions have something to mutate.

Concepts:
- A Server Component on `/settings/members` (sits next to the member list from ch.057 L4 — name the adjacency, do not rebuild the member list).
- The read is a tenant-scoped `db/queries/invitations.ts` helper — call it `listPendingInvitations(orgId)` (verb-led, `list` prefix per naming conventions), closing over `tenantDb(orgId)`.
- Query shape: `findMany({ where: and(eq(status, 'pending'), gt(expiresAt, now())), with: { inviter: true }, orderBy: desc(createdAt) })`. The `with: { inviter: true }` is the N+1-safe traversal (relations v1) — surface that one-liner reasoning, don't re-teach relations.
- **The load-bearing call: filter `expiresAt > now()` in the `where`, not after load.** An expired row is operationally "no longer pending" even though `status` is still the string `'pending'` (callback to lesson 1: expiry is computed, never a stored status). The query is the source of truth for "what's actually actionable." A post-load `.filter()` in JS would pull rows over the wire only to discard them and is a tenancy/perf smell.
- Columns rendered: invited email, role, inviter name (`inviter.name`), sent date, an **expiry countdown** ("expires in 3 days"), and a per-row action menu (Resend / Revoke).
- Authorization: the read requires `roleAtLeast('admin')` (ch.057 L1) — a plain `member` must not see the pending list. The surrounding page is already an admin surface; name the guard, the `authedAction` on the mutations enforces it on writes.

How to present:
- **`AnnotatedCode`** (blue) over the `listPendingInvitations` helper, ~3 steps: (1) the `and(eq(status,'pending'), gt(expiresAt, now()))` predicate — highlight `gt(expiresAt, now())` as the "expiry lives here" beat; (2) `with: { inviter: true }` as the join; (3) `orderBy: desc(createdAt)`. One block, focus directed to the predicate.
- The countdown is a display concern — a one-line `Term`-free note that it's derived from `expiresAt`, rendered with the project's date formatting; do not rabbit-hole on Temporal formatting (ch. convention notes `Date` at third-party seams; the row's `expiresAt` is a `timestamptz` → keep the formatting reference shallow, defer to existing helpers).

Reasoning to surface: the `where`-clause-as-source-of-truth is the same discipline lesson 1 set for "no cron marks rows expired." Reinforce it here at the read site.

`Term` candidates: **N+1** (one-line: "one query per parent row instead of a single join").

---

### Resending an invite rotates the token and the window

The first and most decision-heavy action. This is the lesson's one real decision thread — give it room.

Concepts:
- Action `resendInvitation` (verb+noun, **no `Action` suffix** — matches the `sendInvitation`/`acceptInvitation` convention the chapter locked in). `export const resendInvitation = authedAction('admin', resendInvitationSchema, async ({ invitationId }, ctx) => …)`.
- `resendInvitationSchema = z.object({ invitationId: z.uuid() })` (Zod-4 top-level `z.uuid()`).
- **The decision — two postures, one senior default.** Present both explicitly:
  - *Option A — re-fire the same email, same token, same `expiresAt`.* Cheap. But the original token's window is unchanged (a resend the day before expiry gives Bob ~24h), and if the first email was forwarded, that leaked token still works.
  - *Option B (the senior default) — rotate.* Generate a **new** 32-byte token, overwrite `tokenHash`, push `expiresAt = now() + INVITATION_TTL_SECONDS`, rebuild the signed URL, send. Rotation invalidates any leaked copy of the old token and hands the invitee a fresh, full window.
- Why rotate is the reflex: the resend is a *security event* as much as a UX one. Honor lesson 1's framing — the token is a bearer credential and the expiry is a security primitive; both should be refreshed on resend, not preserved.
- **Implementation = a diff against `sendInvitation`.** Steps it reuses from lesson 2: token generation, `tokenHash` write, `signedInviteUrl`, the audit write inside `withTenant`, the email send **after** commit, the `revalidatePath`. Steps it changes: it's an **UPDATE** (by `invitationId`) not an INSERT; the audit action is `'invitation.resent'`; the precondition guard differs (see below).
- **The precondition guard.** The action must refuse to resend a non-pending invite. Before the update, check the row's `status === 'pending'` and `expiresAt`/identity; resending an `'accepted'` or `'canceled'` row is a no-op-or-error, not a silent re-send. Return `err('not_found', …)` (or a `conflict`) when the row isn't a live pending invite. Surface this as a one-beat guard; it mirrors the accept action's `where status='pending'` discipline.
- Audit payload: `'invitation.resent'` with `{ email, role, oldExpiresAt, newExpiresAt }` — the old/new expiry in the payload makes the rotation auditable (callback to lesson 1's "the row records what we promised, and when").
- **Atomicity reflex (watch-out, taught inline):** the token rotation (DB write) and the email send must stay consistent — the new `tokenHash` is committed first, the email carrying the new raw token sent after. Never a state where the new token is saved but the old email still circulates as the only live link, *and* never send the new email before committing the new hash (the link would 404 on the hash lookup). COMMIT is the pivot, same as lesson 2.
- Rate-limiting: named once — resend is the same abuse vector as send; the limit applies through the same middleware (Chapter 074). Do not build.

How to present:
- **`CodeVariants`** (two tabs) for the decision: tab "Re-send same token" (`del`-marked to show what's *missing* — no new token, no new expiry) vs tab "Rotate (senior default)" (`ins`-marked on the new-token + new-expiry + `signedInviteUrl` lines). First sentence of each tab carries the verdict ("leaves the window unchanged" / "fresh token, fresh window"). This is the cleanest vehicle for a one-axis A/B senior call.
- Optionally a short **`AnnotatedCode`** (green) on the chosen `resendInvitation` body afterward, 3–4 steps, to walk the precondition guard → rotate → send-after-commit → audit. Use only if the `CodeVariants` "Rotate" tab is too dense to also carry the walkthrough; prefer one or the other to control length.

`Term` candidates: **token rotation** (one-line: "replacing a still-valid secret with a fresh one so the old copy stops working").

---

### Revoking an invite cancels the row, it never deletes it

The cheapest action — and the one that teaches "tombstone, not tombstone-removal."

Concepts:
- Action `revokeInvitation = authedAction('admin', revokeInvitationSchema, async ({ invitationId }, ctx) => …)`, `revokeInvitationSchema = z.object({ invitationId: z.uuid() })`.
- The whole body is small: one UPDATE `set status = 'canceled'` (guarded by `where id = ? and status = 'pending'`), one `logAudit(tx, { action: 'invitation.revoked', … , payload: { email, role } })` inside `withTenant`, one `revalidatePath('/settings/members')`. No email send (see below).
- **`status='canceled'`, never DELETE.** The row is the historical record ("we offered Dave admin on this date; it was revoked"). Lesson 3 already wired the accept page's `canceled` branch to render "this invite was revoked" — so revoke closes the loop the accept side already expects. Deleting the row would (a) lose the audit trail and (b) make a still-circulating accept link return the *generic* refusal instead of the honest "revoked" copy.
- **No "your invite was canceled" email to the invitee.** Two reasons, both senior: privacy/abuse (you'd be emailing an address that never engaged, confirming it's monitored) and noise (the invitee who ignored the first email gets a second they care about even less). The invitee discovers the revoke organically — only if they click the now-dead link. Frame this as the deliberate *absence* of an action, a recognition that "not sending" is itself a design decision.
- The `where … and status='pending'` precondition: revoking an already-accepted invite must refuse (you can't un-invite a member — that's the member-removal flow from ch.057 L4; name the boundary). Revoking an already-canceled or expired row is idempotent/no-op.
- **Why hand-roll instead of the plugin's `cancelInvitation` (one clause).** Better Auth's org plugin exposes `auth.api.cancelInvitation({ invitationId })`, which flips status to `'canceled'` and fires `before/afterCancelInvitation` hooks — but it doesn't know the project's `logAudit` shape and writes outside `withTenant`. Consistent with the hand-rolled send (L2) and accept (L3), revoke is a direct `UPDATE … + logAudit(tx)` inside `withTenant` so the audit row rides the same transaction. Name the plugin method exists; explain the consistency reason; keep the hand-rolled shape.

How to present:
- A plain **`Code`** block for the ~6-line body — it's short and unsurprising; no annotation needed. Let the prose carry the two senior calls (no-DELETE, no-email).
- A short **`Aside` (note)** on "why no notification email" — it's a watch-out that belongs exactly here, with the concept, not bundled elsewhere.

Reasoning to surface: revoke is *cheap by design* — one update, one audit row, one revalidate. The cost asymmetry (cheap to keep the row, irreplaceable as a record) is the same argument lesson 1 made for keeping accepted rows.

---

### Re-inviting a pending address: let the index throw, then translate

The "collide" in the title. This is the lesson's second load-bearing teaching and the natural home for the exercise.

Concepts:
- Scenario: Alice types `bob@acme.com`, who already has a *pending* invite. (Distinguish sharply from "Bob is already a member" → that pre-check is **lesson 5**; here the collision is a second *pending invite*.)
- **The race the partial unique index closes.** Spell out the failure of the naive fix: "SELECT to check, then INSERT if absent." Two rapid clicks (or two admins) both SELECT → both see nothing → both INSERT → two pending rows. The window between SELECT and INSERT is the bug. The lesson-1 partial unique index (`(organizationId, lower(email)) WHERE status='pending'`) makes the second INSERT *fail at the database* — atomic, race-free.
- **The pattern: don't pre-check, catch-and-translate.** The `sendInvitation` body (lesson 2 deliberately omitted the collision pre-check, deferring here) lets the INSERT run and wraps it to catch the Postgres unique-violation. On catch, return a typed error the UI can act on: the chapter calls it `'already-invited'` with `{ existingInvitationId }`.
- **Reconcile with the `Result` contract (flag for the writer).** The canonical `Result` `code` union is `validation | conflict | not_found | unauthorized | forbidden | rate_limited | internal` — `'already-invited'` is not a member. The senior shape is `err('conflict', userMessage, …)` carrying the existing invitation's id as structured detail (e.g. in `fieldErrors` or a small extension the project already uses for actionable conflicts). Teach the *intent* ("translate the constraint into an actionable conflict, not a generic 500") and use the project's real `Result` shape; do not invent a parallel error channel. If the project has extended the code union to include domain conflicts, follow that; otherwise `conflict` + detail is the default. **This is a deliberate convention reconciliation — note it so the build agent grounds the exact shape in the codebase.**
- Detecting the unique violation: in current Drizzle the pg error is **wrapped** — catch a `DrizzleQueryError` (from `drizzle-orm/errors`) and read its `.cause`, which is the pg `DatabaseError` carrying `.code === '23505'` (unique_violation) and `.constraint`. Narrow on the constraint by the named index `invitation_org_email_pending_unique` so an unrelated unique constraint doesn't get mistranslated. Use the project's `ensureError`/error-narrowing helper (don't `catch (e: any)`). **The in-prose code must show this real wrapped shape (`error.cause instanceof DatabaseError && error.cause.code === '23505'`)**, not a flat top-level `error.code` — that wrapping is a verified early-2026 Drizzle behavior.
- **Named plugin alternative (one clause).** Better Auth's organization plugin ships a `cancelPendingInvitationsOnReInvite` option that auto-cancels the existing pending invite on re-invite instead of erroring. Name it once as the framework's built-in posture, then state why this chapter doesn't use it: the chapter hand-rolls the send path (lesson 2) to own the token/hash/HMAC/audit, so the plugin's invite lifecycle isn't in play — and the catch-and-translate teaches the *transferable* unique-constraint pattern. Do not switch to the plugin mid-chapter.
- **The collision UX.** The UI surfaces "Bob already has a pending invite — resend or revoke?" with **both actions inline** (a toast or inline banner wiring to `resendInvitation` / `revokeInvitation`, the two actions this lesson just built). The whole loop closes: the constraint's signal becomes a two-button recovery, not a dead-end "something went wrong."

How to present:
- **`CodeVariants`** (two tabs) — tab "Pre-check then insert (racy)" with the SELECT-then-INSERT shape (`del`/annotation flagging the race window) vs tab "Catch-and-translate" with the `try/catch` on `23505` returning the conflict. First sentence of each carries the verdict. This is the same wrong-then-right archetype the chapter uses elsewhere and lands the lesson's headline pattern.
- **Exercise (`ScriptCoding`, `runner="sandpack"`):** implement the catch-and-translate. Provide a `sendInvite`-like stub whose faked `insert` throws on a "duplicate" input and resolves on a fresh one. **Deliberate simplification:** the stub throws a *flat* error object `{ code: '23505', constraint: 'invitation_org_email_pending_unique' }` so the exercise stays self-contained (no `drizzle-orm/errors` import in the sandbox) — call this out in the `instructions` so the student knows production wraps it in `DrizzleQueryError` at `.cause` (the in-prose `CodeVariants` already showed the real shape). This mirrors the precedent lesson 2 set when its Sandpack exercise simplified the HMAC secret handling. The student writes the `try/catch` returning `{ ok: false, error: { code: 'conflict', … } }` on `23505` and `{ ok: true, … }` otherwise. Tests: (a) duplicate input → `ok:false` with `code:'conflict'` and the existing id surfaced; (b) fresh input → `ok:true`; (c) a *different* error code rethrows / returns `internal` (so the student narrows on the code, not "any throw is a conflict"). Sandpack runner because the stub uses TS (vanilla can't parse TS; per the ReactCoding-is-react-only note, library sandboxes need Sandpack). Provide the error-shape constant and the `Result` helpers in the starter so the student writes only the branch logic. Grade on the branch, not on exact `userMessage` strings.

Reasoning to surface: "the database is the source of truth for the collision; the action's job is translation." This is a reusable senior pattern (the same shape recurs for any unique constraint — slugs, seats, idempotency keys), so frame it as transferable, not invite-specific.

`Term` candidates: **unique violation / `23505`** (one-line: "Postgres's error code for a duplicate that breaks a unique constraint"); **idempotent** only if not already introduced in L3 (it was — skip).

---

### The recently-expired shelf: a fresh send, not a magic re-extension

A small but important UI distinction that reinforces the rotation lesson.

Concepts:
- Expired invites (`status='pending'` but `expiresAt < now()`) are filtered *out* of the main list (previous section). But the admin still wants to see "Carol's expired last Tuesday" to act on it.
- Render them in a **separate, collapsed "Recently expired" section** (e.g. last 30 days), read by a sibling helper `listExpiredInvitations(orgId)` (where `status='pending' AND expiresAt < now() AND expiresAt > now() - 30d` — keep the window bounded).
- **Each expired row's button is "Send new invite," and it routes to `sendInvitation` (a brand-new row + token), not `resendInvitation`.** This is the structural point: an expired invite cannot be "re-extended" — that would resurrect a dead token. The senior reflex from lesson 1 ("resending an expired invite mints a new row, never extends the old one") becomes a concrete UI affordance here.
- Why separate them visually: surfacing expired invites in the *live* list as still-Resend-able would imply the old token can be revived. The separate shelf + different verb ("Send new") encodes "this is a fresh start."

How to present:
- Prose + a small **`Code`** snippet of the `listExpiredInvitations` `where` clause (showing the `< now()` flip and the 30-day floor). Contrast it directly with the live-list `where` from the read section — the *only* change is the inequality direction plus the floor.
- A one-line **`Aside` (caution)**: never wire the expired shelf's button to `resendInvitation` — expired means dead; the action is a new send.

Reasoning to surface: this closes the rotation thread — resend rotates a *live* token; expired invites don't get rotated, they get replaced. Two different verbs for two different states.

---

### What changing your mind looks like: revoke-and-reinvite, not silent edits

A short closing section that makes two "don't add this action" calls — both reinforcing the tombstone model. Pure reasoning, minimal code.

Concepts:
- **Changing the role on a pending invite.** Alice invited Bob as `member`, meant `admin`. The senior call: **no `updateRole`-on-invitation action** — revoke the wrong invite and send a new one. Reason: the email already *promised* `member`; quietly flipping the row to `admin` would have the email say one thing and the accept screen another. Two clicks, one coherent promise. Name that some products allow the in-place edit; the year-1 default is the simpler, honest shape.
- **The `invitation.role` vs `member.role` distinction.** After acceptance, role changes go through `changeMemberRole` (ch.057 L4). The `invitation.role` is *historical* once accepted — the audit log answers "what role were they invited as?" Never try to keep `invitation.role` in sync with `member.role` post-accept; they describe different moments. (Brief callback, one sentence — the student met `changeMemberRole` last chapter.)
- Tie-off: the **tombstone** restatement. Resend, revoke, re-invite, role-change-by-reinvite — every action preserves the row's record of what was promised and when. The retention job (lesson 1, Unit 16) is the *only* thing that ever deletes, on a long horizon. This is the chapter-wide discipline; state it once, cleanly, as the lesson's closing model.

How to present:
- Prose only, plus a small **summary grid** of the three actions and their audit events as the closing visual (see below). No code — the calls are about *what not to build*, and the reasoning is the payload.

---

### Diagram: the three actions, their writes, and their audit events

A compact reference table/grid that closes the lesson (chapter outline calls for exactly this: "a small grid showing the three actions and their audit events earns its weight").

Pedagogical goal: one glanceable artifact that fixes the three actions + their DB effect + their audit event + their email behavior in the student's memory, so the differences (resend sends, revoke doesn't; resend rotates, revoke just flips status) are visible side by side.

Build with **HTML+CSS in a `<Figure>`** (a small 3-row table is an annotated illustration, not a graph engine job — per the diagrams index, plain HTML/CSS for color-coded segmented layouts). Columns: **Action** · **DB write** · **Sends email?** · **Audit event** · **Row after**.
Rows:
- **Resend** · UPDATE `tokenHash`, `expiresAt` · Yes (new link) · `'invitation.resent'` · still `pending`, new window
- **Revoke** · UPDATE `status='canceled'` · No · `'invitation.revoked'` · `canceled` (kept)
- **Re-invite (collision)** · INSERT blocked by index · No (returns conflict) · — (no row written) · existing `pending` unchanged

Color-code the "Sends email?" column (green Yes / grey No) so the resend-is-the-only-send asymmetry pops.
Place this in the final section. Cap height well under the 800px ceiling — it's a 3-row table.

---

## Scope

**This lesson covers:** the pending-invites read (expiry-filtered, `with: inviter`), `resendInvitation` (token + expiry rotation as the senior default), `revokeInvitation` (`status='canceled'`, no DELETE, no notification email), the recently-expired shelf (new send, not re-extension), the catch-and-translate of the `(organizationId, lower(email)) WHERE status='pending'` unique violation into a `'already-invited'`/`conflict` result, and the two "don't build it" calls (no in-place role edit, no `invitation.role`↔`member.role` sync).

**Explicitly out of scope — already taught (reference, do not re-teach):**
- The `invitation` table shape, the partial unique index DDL, the `pending→accepted/canceled` state machine, computed expiry, the 7-day TTL constant, token-hashed-at-rest rationale — **lesson 1**. Reuse the index and constant; restate each in ≤1 sentence only where an action depends on it.
- Token generation (32-byte `getRandomValues`), `sha256`, `signedInviteUrl`, the HMAC signing, the `sendInvitation` eight-step body, the `emailSent` flag, the `InviteEmail` template, `sendEmail` — **lesson 2**. Resend reuses these as a black-box diff; do not re-derive the crypto or the URL shape.
- The accept page, the four arrival shapes, the verify ladder, `acceptInvitation`, the `accepted`/`canceled`/`revoked` accept-side branches, `setActiveOrganization`, auto-`emailVerified` — **lesson 3**. Revoke merely *feeds* the accept side's `canceled` branch; name the handoff, don't re-show the accept page.
- The `authedAction` wrapper internals, `withTenant`/`tenantDb`, `logAudit`, the `Result` type + `ok`/`err`, `roleAtLeast`, `revalidatePath`, relations v1 `with:` — **chapters 056–057 + prior units**. Use as known primitives.
- The member list, `changeMemberRole`, member removal/leave-org — **ch.057 L4**. Name the adjacency (the pending list sits beside the member list; role changes after accept go through `changeMemberRole`); do not rebuild member management.

**Explicitly out of scope — reserved for later lessons (do not pre-teach):**
- **The `'already-member'` check** (a `member` row already exists for `(orgId, lower(email))`, the membership pre-check in the send body, the "already a member as <role>" UI) — **lesson 5**. This lesson owns only the *pending-invite* collision (`'already-invited'`). Keep the two crisply separate; if the distinction comes up, point forward to lesson 5 in one clause.
- Email-mismatch refusal, inviter-removed-before-accept (orphan invite), the **double-click-race deep dive** (full who-wins sequence on the `where status='pending'` clause), org-deleted-before-accept, cross-org independence — **lesson 5**. This lesson may *name* the `where status='pending'` precondition as the guard on resend/revoke, but the race mechanics and edge-case reasoning are lesson 5's.
- Seat-counting / `entitlements.canInviteMember(orgId)` before the invite write — **Chapter 064**. Not even named in the action bodies here beyond the existing `TODO(chapter 064)` from lesson 2.
- Rate-limiting the resend/send actions — **Chapter 074**. Name once on resend; do not build.
- The retention job that DELETEs terminal/stale rows (>90d) — **Unit 16**. Name once in the closing tombstone beat; do not build.
- Background-queued sends with retries — **Unit 13**. Out of scope.
- Bulk invites / CSV upload, notification-style "your invite was canceled" emails, self-serve request-to-join — out of scope for year-1 (name the no-email-on-revoke call positively, not as a deferred feature).
- The `'rejected'` status / invitee-declines affordance — rare in B2B; lesson 1 named it, lesson 5 owns the (un-built) reject path; this lesson does not add a reject button.

---

## Notes for the build agent

- **Action names: `resendInvitation`, `revokeInvitation`** (no `Action` suffix) — matches `sendInvitation`/`acceptInvitation` locked in by lessons 2–3's continuity notes. Read helper: `listPendingInvitations`, sibling `listExpiredInvitations`, in `db/queries/invitations.ts` (the file lesson 3 factored).
- **Ground the exact `Result` shape for `'already-invited'` in the project codebase before writing it.** Canonical union lacks `'already-invited'`; default to `err('conflict', …)` + structured detail (existing invitation id). If `sendInvitation` (lesson 2 build) already established a shape for this debt, match it byte-for-byte — it is the caller the UI wires to.
- Resend's token-rotation reuses lesson 2's `signedInviteUrl`, `sha256`, `INVITATION_TTL_SECONDS`, `sendEmail`, `InviteEmail`. Verify those exports exist in the codebase; reference, don't redefine.
- The collision catch must narrow on Postgres `code === '23505'` via the project's error-narrowing helper (`ensureError` / `lib/errors.ts`), ideally keyed to the named index `invitation_org_email_pending_unique`; never `catch (e: any)`.
- Components: `AnnotatedCode` (read helper, resend body), `CodeVariants` (resend rotate-vs-same; collision racy-vs-translate), `Code` (revoke body, expired `where`), `Aside` (no-email-on-revoke; expired-is-a-new-send), one HTML+CSS `<Figure>` summary grid, one `ScriptCoding` Sandpack exercise (catch-and-translate). No new `.astro` lesson components anticipated — reuse existing ones.
- Keep the lesson at the chapter-outline target: **40–50 minutes**, mechanics-weighted. Lead with the read, then resend (the decision), then the cheap revoke, then the collision (the second headline), then the expired shelf, then the closing "don't-build" calls + grid.
