## Concept 1 — The inspector as defense-in-depth verification surface

**Why it's hard.** A student arriving from 9.5 reads "render the role-change button for everyone, even the member" as a UX bug, not a deliberate verification stance. The instinct to hide unauthorized controls in the UI conflates two unrelated jobs: client-side UX hygiene and server-side authorization. The lesson must invert that instinct before any code lands.

**Ideal teaching artifact.** A *Decision* archetype framed as a side-by-side comparison of two inspector mockups — left panel hides the role-change select for members; right panel renders it for every role and lets the server refuse. Beneath each, a short attack thought-experiment: in the left version, what does flipping a CSS class in DevTools achieve? In the right version, what does the same flip achieve? The reveal: in both versions the attack is identical, but only the right version is *testing the defense that actually exists*. The visual carries the lesson that "UI hide ≠ authorization".

**Engagement.** A `MultipleChoice` immediately after: "The inspector renders the role-change select for the member role on purpose. The reason is: (a) the UI library can't conditionally render, (b) the server-side refusal is the load-bearing defense and the verify lesson needs to observe it firing, (c) so the operator can use any acting role, (d) the role check is on the route, not the action." Two correct answers (b, c) flip it into multi-select mode.

**Components.**
- `Figure` wrapping a two-panel SVG (hand-authored) of the inspector with annotation callouts. No bespoke component needed — this is a single-frame visual.
- `MultipleChoice` for the recall beat.

---

## Concept 2 — `databaseHooks.session.create.before` as the single ingress for active-org

**Why it's hard.** The instinct is to set `activeOrganizationId` "wherever a user signs in" — the sign-in handler, the sign-up handler, the OAuth callback, the magic-link handler. Each path looks self-contained; the bug surfaces only when a sixth ingress is added in three months and the operator forgets it. The student needs to *see* the multiplicity before they accept the funnel.

**Ideal teaching artifact.** A *Pattern* archetype with two stacked diagrams. The first is a fan-in flowchart: six labeled session-mint paths (email+password sign-in, sign-up, OAuth, magic link, passkey, impersonation) each with an arrow pointing at a "set active-org" diamond. The second collapses all six arrows into a single funnel that passes through `databaseHooks.session.create.before` before reaching the session row. The visual makes the structural argument that Better Auth gives one chokepoint and it's the only correct anchor.

**Engagement.** A `Buckets` sort: a list of nine candidate locations (sign-in handler, sign-up handler, OAuth callback, magic-link handler, `databaseHooks.session.create.before`, `databaseHooks.user.create.after`, `requireOrgUser`, the dashboard layout, the org switcher) — student sorts into "structurally correct anchor" (one item), "would work for one ingress but leak others" (four items), "wrong layer entirely" (four items).

**Components.**
- `Figure` wrapping a Mermaid `flowchart` for the fan-in/funnel visual. Mermaid is the right form here — connection topology, not layout.
- `Buckets` for the sort.

---

## Concept 3 — `requireOrgUser` reads role from the DB, not the session cache

**Why it's hard.** Better Auth ships a session cookie cache for performance, and the natural read path is `session.member.role`. A senior reads `member` from the database on every privileged check because role changes in the last 60 seconds otherwise authorize stale permissions. The student needs to feel the cost of that staleness before accepting the extra read.

**Ideal teaching artifact.** A *Concept* archetype delivered as a scrubbable timeline (`DiagramSequence`): five frames at 0s / 30s / 60s / 90s / 120s. Frame 1: Bob is admin; cookie cache says `admin`. Frame 2: Alice demotes Bob to `member` at 30s. Frame 3: cookie still says `admin` until the freshAge window passes. Frame 4: Bob's privileged action fires at 60s — if `requireOrgUser` read from the cookie, the action authorizes; if it reads from `member`, it refuses. Frame 5: at 120s the cookie has refreshed; both paths agree. The two reads diverge for a finite window and the lesson is naming what happens inside that window.

**Engagement.** A `PredictOutput` framed as "what does `requireOrgUser` return at t=60s for Bob?" with two answer slots — one for the cookie-read implementation, one for the DB-read implementation. Student must enter both before the result reveals.

**Components.**
- `DiagramSequence` housing five hand-SVG frames inside `Figure` wrappers, one per timestamp.
- `PredictOutput` for the recall.

---

## Concept 4 — `tenantDb(orgId)` makes the missing-org filter not compile

**Why it's hard.** Application-layer scoping reads as "remember to add `where orgId = …`" — discipline, not structure. The student needs to viscerally hit the compile error to internalize that the wrapper *removes the option* of forgetting, rather than reminding the developer to remember.

**Ideal teaching artifact.** A *Pattern* archetype delivered as a `TypeCoding` exercise. The student is given the `tenantDb` type signature and three call sites — one correct (`tenantDb(orgId).query.member.findMany({...})`), one missing the org wrap (`db.query.member.findMany({...})` — should fail review, but here it compiles, demonstrating the cross-tenant escape hatch), and one trying to reach for a global table through the facade (`tenantDb(orgId).query.user.findMany({...})` — should not compile because `user` isn't in `TENANT_TABLES`). The student annotates each with `^?` and explains in one line which structural defense is firing. The win condition: the third case errors with a type-narrow error message, proving the facade refuses a global-table reach.

**Engagement.** The exercise itself is the assessment — the type errors lock the model in. Follow-up beat: a one-question `MultipleChoice` "the unwrapped `db` import survives in the codebase because: (a) the team forgot to remove it, (b) `scripts/` and cross-tenant admin paths need it and the discipline is to keep it but call it review-loud, (c) Drizzle requires it, (d) only the test suite uses it."

**Components.**
- `TypeCoding` with the `tenantDb` signature and three call-site probes.
- `MultipleChoice` follow-up.

**Project link.** This is the load-bearing helper the rest of the project leans on — every privileged action and every audit read goes through it.

---

## Concept 5 — `authedAction` as the only privileged call shape

**Why it's hard.** A senior can write the role check inline at the top of every Server Action and the resulting code is shorter, more readable, and equally correct on the day it's written. The wrapper's value is *review-time*: a missing wrapper is a one-token grep; a missing inline `if (!roleAtLeast(...))` is a code-review accident waiting to happen. Students underweight review-time costs because they're invisible at write-time.

**Ideal teaching artifact.** A *Pattern* archetype delivered as a `CodeReview` exercise. The student reviews a PR diff that adds three new Server Actions: one wrapped in `authedAction('admin', ...)`, one with an inline `requireOrgUser()` plus `roleAtLeast` check at the top of the body, one with neither. The kernel rubric the AI grades against: "the inline-check variant looks correct but defeats the structural defense — flag it and ask for the wrapper." The student must catch all three problems (one approval, one rewrite-request, one block) to pass.

**Engagement.** The review is the assessment. Follow-up: a `Sequence` exercise — drag the four wrapper steps into order (`requireOrgUser` → `roleAtLeast` → `safeParse` → `fn`), with a fifth distractor step ("audit-log write") that belongs *inside* the fn body, not the wrapper.

**Components.**
- `CodeReview` with the three-action diff and rubric kernel phrases.
- `Sequence` for the four-step ordering.

**Project link.** Every privileged Server Action in this project ships as `authedAction(...)` — the role-change, invite-send, and (next chapter) lifecycle actions.

---

## Concept 6 — RLS only on `audit_logs`: the threshold call

**Why it's hard.** The student arrives from 10.1.3 with the abstract framing (three triggers: high stakes, many writer paths, regulatory tail). The project chapter has to operationalize the call concretely: *for this codebase, why does the threshold land on `audit_logs` and on nothing else?* The risk is the student leaves with "RLS is good, sprinkle it everywhere" or "RLS is overkill, never use it" — both wrong.

**Ideal teaching artifact.** A *Decision* archetype delivered as a three-column comparison table inside `Figure`. Columns: the table (`organization` / `member` / `invitation` / `auditLogs` / a hypothetical `documents` feature table). Rows: stakes (low → catastrophic), writer-path count (1–2 → many), regulatory exposure (none → audit-trail). The cells are filled; the bottom row is the verdict (RLS / app-layer). Only `auditLogs` lights up across all three criteria. The student sees the threshold geometry directly.

**Engagement.** A `Buckets` sort with two columns ("RLS earns its cost" / "app-layer scoping holds"). Items: six tables — three real (`audit_logs`, `member`, `invitation`) and three speculative (`documents`, `api_keys`, `webhook_events`). The discussion lives in the rationale shown after the sort, where each item explains which trigger fired or didn't.

**Components.**
- `Figure` wrapping a hand-authored comparison table (HTML inside `Figure`). Single-use static.
- `Buckets` for the sort.

---

## Concept 7 — `SET LOCAL` inside a transaction (the pooled-connection leak)

**Why it's hard.** `SET app.org_id = …` and `SET LOCAL app.org_id = …` differ by one keyword. The first survives across requests on the same pooled connection; the second is bound to the transaction. A student who skips the `LOCAL` ships a tenant-isolation hole that passes every test in a single-connection dev environment and fails open in production under load.

**Ideal teaching artifact.** A *Mechanics* archetype delivered as a two-frame `DiagramSequence`. Frame 1: a connection pool with three connections. Request A from Org Acme grabs connection #2, runs `SET app.org_id = 'acme-uuid'` (without LOCAL), returns connection to pool. Frame 2: request B from Org Beta grabs the same connection #2, never sets the variable, reads `audit_logs` — the RLS policy reads Acme's UUID from the connection state and returns Acme's rows to Beta's user. The visual is a literal cross-tenant leak via a stale GUC. Then frame 3 reruns with `SET LOCAL` and shows the variable auto-clearing on commit.

**Engagement.** A `CodeVariants` with two tabs — `SET` vs. `SET LOCAL` — both compiling, both passing a single-request test, with prose annotating which one leaks under pool reuse.

**Components.**
- `DiagramSequence` with three frames (hand-authored SVG of the pool + request flow) wrapped in `Figure`.
- `CodeVariants` for the wrong/right comparison.

---

## Concept 8 — `logAudit(tx, …)` and audit-in-transaction

**Why it's hard.** Audit logging reads as a side-effect — log it after, log it async, log it best-effort. The senior reflex is the opposite: the audit row is the *proof the work landed*, and proof must commit with the work. The student needs to feel the asymmetry between "work landed, no audit row" (compliance disaster) and "audit row exists, work rolled back" (impossible by transaction).

**Ideal teaching artifact.** A *Pattern* archetype shaped as a wrong-by-default sandbox. The student is given a `changeRoleAction` that calls `logAudit(db, ...)` *after* the role update commits (the off-transaction shape) and a deliberately failing role update (a constraint violation injected by the lesson's test harness). The student runs the action: the role update fails, the audit row lands. Then the student is given the corrected signature where `logAudit` requires a `tx` parameter and the off-transaction call no longer typechecks. They fix the action, rerun, and the failed role update now leaves no audit row.

**Engagement.** The repair is the assessment. Follow-up: a `TrueFalse` round with four statements ("if the audit insert fails, the role update must roll back" / "if the role update fails, the audit insert must not land" / "the audit log can be written from a background job after commit and still be correct" / "the `tx` parameter on `logAudit` is a TypeScript convenience, not a correctness primitive") — last two false.

**Components.**
- `ScriptCoding` (or `TypeCoding` if the signature itself is the lesson) running against a mock Drizzle harness — the wrong-by-default `logAudit(db, ...)` call site fails to typecheck against the corrected signature. New component not needed; the existing `TypeCoding` carries this.
- `TrueFalse` for the follow-up.

**Project link.** Every privileged action in this project (`changeMemberRoleAction`, `sendInvitationAction`, `acceptInvitationAction`) writes the audit row inside the same transaction as the work.

---

## Concept 9 — The last-owner invariant inside the transaction

**Why it's hard.** The invariant ("an org must always have at least one owner") reads as a single-row check — load the target member, refuse if they're the last owner. The race is invisible until two admin clicks demote two different owners simultaneously and the org ends up ownerless. The student needs to see that the count must be re-read inside the same transaction as the update, under the right isolation, or the invariant doesn't hold under concurrency.

**Ideal teaching artifact.** A *Concept* archetype delivered as a two-actor interleaved-timeline diagram inside `Figure`. Two columns (admin A demoting owner X, admin B demoting owner Y), six time-ordered rows. The naive shape (read count outside the transaction, then update) interleaves to leave the org with zero owners. The corrected shape (count inside the transaction, with the row-level lock from the update) blocks one writer until the other commits, then the second sees the updated count and refuses. The visual is the race; the prose names that `tenantDb.transaction(...)` + the row-level lock from `update ... where id = ?` is the structural fix.

**Engagement.** A `Sequence` exercise — drag five operations into the order that makes the invariant safe: (1) open transaction, (2) read target member, (3) count owners, (4) update role, (5) write audit row. Decoy operations include "read count outside the transaction" and "release the row lock before audit write."

**Components.**
- `Figure` wrapping a hand-authored interleaved-timeline SVG (two columns of operations across time).
- `Sequence` for the ordering drill.

---

## Concept 10 — Token discipline: random + hash-at-rest + HMAC signature

**Why it's hard.** Students conflate three cryptographic primitives that do three different jobs in the accept-URL flow. The raw 32-byte token is the *credential*. The SHA-256 hash in the database is the *at-rest representation* (so a DB read alone can't forge invites). The HMAC signature on the URL is *pre-DB tamper rejection* (so the server doesn't have to round-trip to Postgres for every random URL a crawler scans). One primitive, one job — and they don't substitute for each other.

**Ideal teaching artifact.** A *Concept* archetype delivered as an anatomy diagram of the accept URL — a hand-authored SVG annotating each query parameter with its origin, its job, and what an attacker would need to forge or replay it. Three callout boxes, one per primitive, each with: "purpose," "what breaks without it," "stored where." Beside the URL anatomy, a small inventory table of where the token lives at each stage: in memory during send, in the email body, in the URL, hashed in the DB, never logged. The visual is the lifecycle of the credential across systems.

A second beat — a `Tokens` exercise on the same URL string. The student clicks the parts of `https://app/accept-invite?id=abc&token=…&sig=…` to identify which substring is "the credential," which is "tamper-rejection," which is "DB lookup key," with decoy clicks on the protocol, host, and path.

**Engagement.** The `Tokens` click is the assessment.

**Components.**
- `Figure` wrapping a hand-authored SVG of the URL anatomy with annotation callouts.
- `Tokens` exercise on the URL string.

---

## Concept 11 — Send-after-commit: the orphan-mode tradeoff

**Why it's hard.** The two natural shapes — send-inside-transaction and send-after-commit — both fail in different ways, and the student has to learn to *choose the failure they can recover from*. Inside-transaction: if Resend rejects, the transaction rolls back and the invite row never existed (lost work, surprised admin, no resend affordance). After-commit: if Resend rejects, the row exists and the inspector surfaces a resend button (recoverable). The win is the asymmetry, not "always commit first" as a rule.

**Ideal teaching artifact.** A *Decision* archetype shaped as a two-column failure-mode comparison inside a `TabbedContent`. Left tab: "send inside transaction" — sequence diagram of DB write → email send → email fails → rollback → admin re-submits, no orphan row, but also no record of the attempt. Right tab: "send after commit" — DB write → commit → email send → email fails → row exists with `status='pending'` → resend button works. Below each, a one-line recovery cost: "the admin re-submits and we hope they remember the role" vs. "the admin clicks resend on a row that already has the right role." The decision is which orphan mode to optimize for.

**Engagement.** A `MultipleChoice`: "Resend returns 503 mid-flight. With send-after-commit, what's in the database?" with four options exercising the row state, the audit row state, and the email status — student must reason about which actions committed before the failure.

**Components.**
- `TabbedContent` with two panels, each containing a Mermaid `sequenceDiagram` of the failure flow.
- `MultipleChoice` for the recall.

---

## Concept 12 — Verify order and the generic refusal

**Why it's hard.** The accept page does five checks in sequence (signature → row → hash → expiry → status), and the natural instinct is to give each its own specific error message — "signature invalid," "invitation not found," "hash mismatch." Specific errors leak attack surface: an attacker tampering with the URL can distinguish "wrong signature" from "invitation not found" and learn which IDs exist. The senior posture is one generic refusal for the first three failures, specific messages only for expiry and status (where the inviter and invitee both share knowledge of the row).

**Ideal teaching artifact.** A *Pattern* archetype delivered as a five-row decision table inside `Figure`: each row is one verify step, columns are "what fails when this check fails," "what the user sees," "what an attacker learns." The first three rows collapse into one user-facing message ("this invitation is invalid"); the last two split into "expired" and "already accepted." The collapsed cells visualize the information-leak boundary.

A second beat — a `Sequence` exercise where the student orders the five checks. Reordering matters: hashing before fetching the row leaks "this ID exists" via timing; checking expiry before status creates a window where an expired-then-accepted invite returns the wrong message.

**Engagement.** The `Sequence` is the assessment. Follow-up: a `MultipleChoice` on "an attacker scans 10,000 random invite IDs. Which messages can they distinguish under the senior verify order?" with options like "found vs. not-found," "tampered vs. expired," "all three generic refusals," "none — all return the same response within timing tolerance."

**Components.**
- `Figure` wrapping a hand-authored five-row decision table.
- `Sequence` for the ordering drill.
- `MultipleChoice` for the leak-analysis recall.

---

## Concept 13 — Four arrival shapes and the explicit consent gate

**Why it's hard.** The accept route has to branch on the cross-product of (signed-in / signed-out) × (matches invited email / doesn't / no account exists). Four shapes, four UIs, four redirects. The student also has to internalize that the page *does not* auto-accept on GET — corporate URL-rewriters and link-preview crawlers will silently consume invites if the side-effect rides the render. The Accept button is a consent gate, not a UX nicety.

**Ideal teaching artifact.** A *Concept* archetype delivered as a four-quadrant decision matrix inside `Figure`: x-axis (signed in / signed out), y-axis (email matches / email differs or no account). Each cell shows the rendered UI shape (Accept button / mismatch refusal / sign-in prefilled / sign-up prefilled) plus the post-action redirect target. A fifth annotation layer marks every quadrant where the Accept button appears and notes "the click is the consent — never the GET."

**Engagement.** A `Matching` exercise — match four real-world scenarios (e.g., "the invitee is already signed into their personal Gmail account, the invite went to their work email," "the invitee is signed out and has never used the app before," "the invitee is signed into the right account," "the invitee is signed in as their teammate") to the four arrival shapes A/B/C/D and the corresponding UI render.

**Components.**
- `Figure` wrapping a hand-authored four-quadrant SVG with UI sketches in each cell.
- `Matching` for the scenario-to-shape pairing.

---

## Concept 14 — Cross-tenant probe: `tenantDb` vs. unwrapped `db`

**Why it's hard.** The verify lesson asks the student to *attack their own code* — write the cross-tenant query, watch it succeed against tenant-owned tables (because RLS isn't on them) and fail against `audit_logs` (because RLS is). The student needs to see that the two layers of defense are *complementary* and that the unwrapped `db` import is the structural escape hatch reserved for `scripts/`, not a bug.

**Ideal teaching artifact.** A *Pattern* archetype delivered as a `DrizzleCoding` exercise running against a seeded two-org PGlite database. The student writes four queries in sequence: (1) `tenantDb(acmeOrgId).query.member.findMany({})` — returns Acme members only, (2) `db.query.member.findMany({ where: eq(member.organizationId, betaOrgId) })` — returns Beta's members (the leak the wrapper prevents), (3) `tenantDb(acmeOrgId).query.auditLogs.findMany({})` inside `withTenant` — returns Acme audit rows, (4) `db.query.auditLogs.findMany({ where: eq(auditLogs.organizationId, betaOrgId) })` outside `withTenant` — returns zero rows (RLS refuses). Each query's result tells the student which defense is firing — application-layer for queries 1 & 2, RLS for queries 3 & 4.

**Engagement.** The four-query exercise is the assessment. Follow-up: a one-line `MultipleChoice` "which query class would a code-review veto see and which would they let through?" exercising the review-loud-vs-fine distinction.

**Components.**
- `DrizzleCoding` with a seeded two-org database, four-query progression. Existing component fits as-is.
- `MultipleChoice` for the review-stance recall.

---

## Component proposals

None. Every concept maps onto existing components, with hand-authored SVG inside `Figure` carrying the bespoke visuals (URL anatomy, four-quadrant matrix, fan-in funnel, interleaved timeline, RLS comparison table). The chapter is decision- and pattern-heavy rather than mechanics-heavy, and the existing `CodeReview` / `Buckets` / `Sequence` / `Tokens` / `Matching` / `MultipleChoice` / `TrueFalse` / `PredictOutput` set covers the assessment beats. The `DiagramSequence` wrapper handles the two scrubbable timelines (session-cache staleness, `SET` vs. `SET LOCAL` pool leak) without bespoke surface area.

## Build priority

Skipped — no new components proposed.

## Open pedagogical questions

- Concept 14's `DrizzleCoding` against a two-org PGlite seed: the existing `DrizzleCoding` supports a single schema, but the cross-tenant probe needs the unwrapped client *and* the `tenantDb` facade to both be in scope inside the exercise sandbox. Confirm whether the existing component can expose both, or whether this exercise needs to ship as a paired `tenantDb` mock plus a real Drizzle handle in the runner.
- Concept 4's `TypeCoding` probe assumes the `TENANT_TABLES` type-set is authored in the lesson's harness rather than imported from the student's in-progress `tenant-db.ts`. Confirm the harness pattern — does the exercise hand the student a finished `tenantDb` type and ask them to read its constraints, or is the type construction itself the lesson?
