# Lesson outline — Chapter 071, Lesson 4

## Lesson title

- **Page title:** Wire the three call sites
- **Sidebar:** Wire the call sites

The chapter-outline title fits — keep it. Sentence case, no markup.

## Lesson type

`Implementation`

The test-coder runs (`tests/lessons/Lesson 4.test.ts` ships as a `describe.todo` scaffold to fill). Writer renders the Implementation section list.

## Lesson framing

The student installs the fire-after-commit discipline that makes the dispatcher safe to wire anywhere: dispatch runs only after the action's transaction commits, so rolled-back work never notifies. They take the dispatcher off the inspector's direct-fire demo and onto the three production surfaces it exists to serve — `sendInvitation`, `changeMemberRole`, and the Stripe past-due webhook — each the same `await withTenant(...)`-then-`await dispatch(...)` move applied to a different shape, including the awkward webhook case where the recipient list must be read inside the transaction but dispatched after commit. This is the project's final build: the seam now holds across real call sites and `/inbox` shows real rows.

## Codebase state

**Entry.** All of `lib/notifications/` is live from lessons 2-3: the registry names three events, `dispatch()` resolves prefs (default-on, critical override), dedups on a 60-second window, and fans out to the real inbox and email channels under per-channel `try/catch`. The three tables exist and are migrated. The inspector's fire buttons prove the dispatcher works by calling it directly with a fixed payload. The three call sites — `src/lib/invitations/send.ts`, `src/lib/invitations/manage.ts`, `src/lib/webhooks/stripe.ts` + its `route.ts` — each carry a `// TODO(L4)` and do *not* yet call `dispatch()`; the chapter 065 invitation email and audit-log writes are already in place.

**Exit.** All three `// TODO(L4)` markers are gone. `sendInvitation` dispatches `org.invitation.sent` after `withTenant` commits (empty recipient array for a non-user invitee, no-op). `changeMemberRole` dispatches `org.member.role_changed` after commit, leaving its audit-log write intact so both `auditLogs` and `notifications` write. `onSubscriptionUpdated` takes a `pendingDispatches: NotificationEvent[]` param and pushes an `org.billing.past_due` descriptor (owner ids read inside `tx`) on the past-due transition; `route.ts` captures that array in a closure and drains it with the dispatcher after `db.transaction` resolves. The full production-shaped flow runs end-to-end.

## Lesson sections

Match the Implementation section list: *Goal + Finished result* (no header) → **Your mission** → **Coding time** → **Moment of truth**.

### Goal + Finished result (intro, no header)

One-sentence goal in user terms: fire the dispatcher from the three real product surfaces, always after the transaction commits. Then a one-paragraph description of the feature working — `sendInvitation` to an existing user writes the invitation, commits, then dispatches an inbox row plus email to the invitee; `changeMemberRole` writes both an `auditLogs` row and a `notifications` row; the Stripe past-due webhook lands, commits, then dispatches to each org owner. No screenshot required (behavior is verified through tests + inspector, already shown in lesson 1); a one-line pointer to `/inbox` now showing real rows is enough.

### Your mission

Prose paragraph (project terms, weaving constraints + out-of-scope + the trap), then the requirements checklist as the only list. No subsection headers, no implementation hints.

Prose to cover:
- The capability: move the dispatcher off the inspector's direct-fire demo and onto the three call sites it exists to serve.
- The single discipline tying them together: dispatch runs *after* the action's transaction commits, never inside it (`await withTenant(...)`-work, then `await dispatch(...)`) — notifying for state that later rolls back is the exact failure mode the seam exists to prevent. These three are one capability verified as a set; each is the same fire-after-commit move on a different surface.
- The webhook is the awkward one: `onSubscriptionUpdated` must read the org's owner list *inside* `tx` (consistent with the transition it commits) but cannot dispatch there; it pushes an `org.billing.past_due` descriptor onto a closure-captured `pendingDispatches: NotificationEvent[]` array, and the route's `POST` drains that array with the dispatcher *after* `db.transaction` resolves. Name the transactional-outbox alternative (a durable table drained by a worker) and defer it.
- Constraints: the dispatcher trusts its caller — gating happens at the action boundary via `authedAction`, so a direct call from a non-action path bypasses the admin check; the seam, not the call site, owns sending. Two dedup layers compose without conflict — `processed_events` at the webhook catches duplicate deliveries, `notificationDedup` inside the dispatcher catches duplicate user-facing notifications even from distinct event ids.
- The one accepted wart: for an invite to an existing user, two emails go out — chapter 065's invitation email (the one named non-seam `sendEmail` call, already sent after commit in `sendInvitation`) plus the dispatcher's `org.invitation.sent`; merging them is the next reach and v1 accepts the duplication because that path predates the seam.
- Out of scope (one line): changing `lib/email.ts`, merging the duplicate invite emails, and short-circuiting no-op role changes.

Requirements checklist — each phrased as a confirmable behavior, tagged `[tested]`/`[untested]` (render with `Checklist`/`ChecklistItem` and the `tested` chip):

1. `[tested]` `sendInvitation` to an existing user writes the invitation, commits, then produces one inbox row plus one email increment for the invitee.
2. `[tested]` Inviting a non-user address no-ops the dispatcher (empty recipient list) — only the chapter 065 invitation email sends, no inbox row.
3. `[tested]` `changeMemberRole` writes both an `auditLogs` row and a `notifications` row, with one email increment for the affected member.
4. `[tested]` The Stripe past-due transition lands the webhook, commits, then produces one inbox row plus one email per org owner.
5. `[tested]` A rolled-back action notifies nobody — no rows anywhere, no email increment (the fire-after-commit guarantee).
6. `[untested]` A grep for `sendEmail(` and `db.insert(notifications)` outside `lib/notifications/` returns only the one named exception (the chapter 065 invitation email in `sendInvitation`) — the seam holds. (Static check, not a runtime assertion — hence untested.)

### Coding time

One line directing the student to implement against the brief and the tests, then the hidden `<details>` solution walkthrough (writer wraps it). Code organized as it appears in the repo. The three real files are short edits to existing actions/handlers — present each as a focused diff, not a from-scratch file.

Code-sample handling:
- `src/lib/invitations/send.ts` — `AnnotatedCode` on the `dispatch(...)` block plus its surrounding context. Direct focus to: the call sits *after* `withTenant` returns (`invitationId` already committed); `recipientUserIds: existingUser ? [existingUser.id] : []` (the empty-array no-op for an absent user — `existingUser` resolved earlier by `db.query.user.findFirst({ where: eq(user.email, email) })`); `subjectId: invitationId`; the payload fields the registry's templates consume (`invitedEmail`, `role`, `orgName`, `inviterName`, `acceptUrl`); and the fact that the chapter 065 invitation email still sends via its own `sendEmail` above (the named non-seam exception). `NotificationEvent` carries no `orgId` field.
- `src/lib/invitations/manage.ts` — `Code` (or light `AnnotatedCode`). Show the org-name read after commit, then `dispatch({ type: 'org.member.role_changed', recipientUserIds: [target.userId], subjectId: memberId, payload: { newRole, before, orgName, actorName } })`. Call out that the existing `logAudit(tx, ...)` write inside `withTenant` is left untouched, so both `auditLogs` and `notifications` write.
- `src/lib/webhooks/stripe.ts` + `src/app/api/webhooks/stripe/route.ts` — `CodeVariants` (two tabs: the handler collecting, the route draining) or `AnnotatedCode` per file. This is the load-bearing teaching moment. Direct focus to: `onSubscriptionUpdated` gains a `pendingDispatches: NotificationEvent[]` param; on `patch.status === 'past_due'` it reads `org` and the org's `owner` members *inside* `tx` and `pendingDispatches.push({ type: 'org.billing.past_due', recipientUserIds: owners.map(o => o.userId), subjectId: sub.id, payload: { orgName, plan } })` — collect-only, never dispatches itself. In `route.ts`: the array is declared before `db.transaction`, passed into `dispatch(tx, event, pendingDispatches)`, and drained in a `for...of` loop *after* the transaction resolves. Note the alias `dispatchNotification` for the notifications `dispatch` because the Stripe-router `dispatch` already binds `(tx, event)` and the two have different arities.

Decision rationale (one or two sentences each):
- Read-inside / dispatch-after for the webhook: owner ids must reflect the committed transition, but dispatching inside `tx` would notify for state that could still roll back. Name the transactional-outbox alternative and defer.
- Empty recipient array as a deliberate no-op rather than a guard at the call site: the dispatcher already loops over zero recipients cleanly, so the call site stays uniform.
- Trust-the-caller gating: `authedAction('admin', ...)` is the boundary; the dispatcher does no authorization.

Untested-requirement coverage:
- The grep seam check (req 6): the only `sendEmail(` and `db.insert(notifications)` outside `lib/notifications/` is the chapter 065 invitation email in `send.ts`. Explain why it is the named exception (predates the seam, merging deferred).

Callouts (the "looks unusual at a glance" set):
- The two-email duplication for existing-user invites — accepted in v1.
- The two composing dedup layers (`processed_events` vs `notificationDedup`).
- The `dispatchNotification` alias collision with the Stripe-router `dispatch`.

For owned topics, link rather than re-explain: `authedAction`/`withTenant`/audit writes → chapter 057 / 065; webhook transaction-then-commit-then-dispatch → chapter 063 / 065; the dispatcher contract itself → lesson 1 of chapter 070 and this chapter's lesson 2.

External resources (if any) appended after the `<details>` with no header — added later by the resourcer.

No diagram needed: the fire-after-commit ordering is carried clearly by the annotated code and a one-line "commit, then dispatch" phrasing. If the webhook collect/drain split proves hard to read in prose, a single small `ArrowDiagram` (tx: claim → handler pushes descriptor → commit → route drains) inside a `Figure` is optional, but prefer prose first.

### Moment of truth

- Test command: `pnpm test:lesson 4`. Expected: the `describe.todo` scaffold for the invite, role-change, and webhook call sites plus the fire-after-commit guarantee now passes (all green, e.g. `Test Files 1 passed`, the five `[tested]` requirements as passing cases).
- Hand-verification checklist (render with `Checklist`, the items the tests don't fully cover):
  - Invite an existing user — inbox row plus email for the invitee, after commit.
  - Invite a non-user address — chapter 065 invite email only, dispatcher no-ops on the empty recipient list.
  - Change a member's role — both `auditLogs` and `notifications` write, one email increment.
  - Trigger `customer.subscription.updated` with `past_due` (via the `stripe` CLI or the inspector's `Fire billing-past-due`) — `processed_events` + entitlement + audit + one notification per owner; a replay blocks at the handler and the dispatcher's dedup is the second layer.
  - Read the `Wrap invite in rollback` inspector control's note; confirm via the tests that a rolled-back action writes no rows and bumps no counter.
  - Run the grep seam check: `sendEmail(` and `db.insert(notifications)` outside `lib/notifications/` return only the named chapter 065 invitation-email exception.
  - Confirm in Drizzle Studio that the `(userId, createdAt desc)` and partial unread indexes back the inbox feed.
- Closing line: this is the project's final build — three real call sites dispatch after commit, the invitation actions and Stripe webhook produce real notifications and emails, `/inbox` shows real rows.
- Forward references (name them, one line each, no new work): chapter 073 (`cacheTag` on the inbox feed when volume justifies — the project deliberately does not cache); chapter 075 (Upstash-backed dedup replaces the table at high throughput; contract unchanged); chapter 066 (a Trigger.dev channel queue moves sends behind a durable worker; contract unchanged); chapter 081 (audit-log + channel-failure log discipline); chapter 088 (integration tests for prefs/default-on/dedup/channel-independence); chapter 092 (`DispatchResult` as the structured-log shape).

## Scope

- Channel implementation, preference resolution, dedup internals, and the registry — owned by lessons 2-3 of this chapter; this lesson only *calls* the finished `dispatch()`.
- The dispatcher contract and the notifiable-vs-logged line — chapter 070.
- Caching the inbox feed — chapter 073; Redis-backed dedup — chapter 075; durable channel queue — chapter 066 (all named as forward references only).
- No changes to `lib/email.ts`, no merging the duplicate invite emails, no no-op role-change short-circuit — explicitly out of scope this lesson.
