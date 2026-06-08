# Orphans, mismatches, and the double-click race

- **Title:** Orphans, mismatches, and the double-click race
- **Sidebar label:** Invite edge cases

## Lesson framing

Capstone of Chapter 058. The previous four lessons built the happy path end to end (table, send, accept, manage). This lesson is **decision-heavy, not code-heavy** — the load is the senior *reasoning* for a handful of production edge cases, plus tiny code deltas (guards, comparisons, one precondition clause) that drop into flows the student already wrote. The chapter outline is explicit: "the load is the senior reasoning for each edge case, not the code"; honor that. Do not re-derive the send/accept/manage machinery; reference it.

Conclusions from brainstorming that shape the whole lesson:

- **Framing: "the happy path is rare in production; these arrive as month-two support tickets."** Every edge case is a real ticket, not a thought experiment. Lead each with the concrete human story (Bob, Alice, Carol from the chapter's running cast) so the abstract rule lands on a scene. This is the chapter's senior-mindset crescendo — the student should leave able to *reason* about a novel invite edge case, not just recall these specific ones.
- **The unifying mental model: an invitation is the organization's decision, snapshotted at send time.** Almost every "honor vs. retract" call collapses to this one principle. The inviter is a *clerk who filed the offer*, not the offer's owner. Alice's later removal/demotion doesn't retract Acme's offer; the `role` on the row is frozen at send. Introduce this principle early and reuse it explicitly in the orphan-invite and demoted-inviter cases — the reuse is the teaching.
- **The second principle: the invitation's identity is the email address, and you never silently bind it to a different account.** This drives the strict email-mismatch refusal. Frame it as a *privilege-confusion* defense (the wrong human accepts a forwarded email), the same class of reasoning the student met around the consent gate in L3.
- **The third principle: at write time, never assume the row is still in the state the page saw.** This drives the double-click race and the `WHERE status = 'pending'` precondition as *optimistic concurrency*. The student planted this clause in L3 and L4; here it gets its full mechanical explanation.
- **Decision-tool over prose.** Two interactive components carry the lesson and keep cognitive load low: (1) a `StateMachineWalker` (`kind="decision"`) that walks the student *as the accept route* through "is the link valid → is the user signed in → does the email match → is it still pending," landing each branch on a verdict leaf; (2) the closing **summary table** (`edge case → senior call → where the check lives`) the chapter outline prescribes, built as an HTML `<Figure>`. One Mermaid `sequenceDiagram` visualizes the double-click race against the precondition. Code appears only as small `Code`/`CodeVariants` deltas, never full files.
- **"Where the check lives" is a load-bearing axis, not decoration.** For every edge case, name the *layer* that enforces it: the DB precondition (double-click), the action body before any write (already-member, email-mismatch), the cascade DDL from Ch 056 (org-deleted), or "no check — honor it" (orphan, demoted inviter). Beginners scatter these checks into the wrong layer (a `SELECT`-then-`if` where a `WHERE` clause belongs, a UI-only guard where a server refusal belongs); making the layer explicit is the correction.
- **Most-common beginner mistake to pre-empt:** offering an "accept anyway" escape hatch on the email-mismatch screen because it feels friendlier. State plainly that this *is* the vulnerability and must never exist. Same energy for "auto-accept on GET" (L3) and "pre-check the unique index with a SELECT" (L4) — but those are owned upstream; here, only email-mismatch's escape hatch is new.
- **Year-1 vs. year-2 honesty.** Several cases have a defensible alternative (auto-revoke on inviter removal, a self-serve "request to join" form, a pending-invites widget on the dashboard). Name each alternative in one sentence, state the year-1 default and *why*, and move on. Do not build them. The senior skill is choosing the simpler shape *and being able to say what you traded*.
- **Pace:** 35–45 min, mostly reading + two interactions. No live-coding sandbox — the deltas are too small and too coupled to the surrounding flows to isolate cleanly (consistent with the chapter outline, which proposes no coding exercise for this lesson). One short `MultipleChoice` or `Buckets` check on "which layer enforces this" earns its place; see the relevant section.

## Lesson sections

### Introduction (no header)

Warm, brief, per pedagogical structure. Open on the scene the chapter outline gives: Bob's invite was sent by Alice three weeks ago; Alice left Acme last week; Bob clicks today — does it work? Then the email landed in Bob's personal inbox but he signs in with his work email — should that accept? Two tabs, two simultaneous accepts — what wins? State that the happy path the last four lessons built is the *rare* case in production, and these "weird" arrivals are exactly what fills the support queue in month two. Preview the payoff: by the end, the student has a senior posture for each, and — more durably — a way to *reason* about edge cases they haven't seen yet, anchored on three principles introduced through the lesson. No new tables, no new actions — just guards and judgment dropped into flows they already wrote.

### An invitation is the org's decision, frozen at send time

The lesson's central principle, taught first because the next several cases collapse to it. Prose, no code yet.

- The invitation row records a decision Acme made: "we offer this email a seat as `role`, valid until `expiresAt`." The inviter (Alice) is the *clerk who filed it*, not its owner.
- Therefore the invite's authority does not depend on the inviter's continued membership, current role, or presence. The `role` is snapshotted on the row at send time and never recomputed.
- Set up the two cases this resolves (orphan inviter, demoted inviter) as "we'll cash this principle out twice." This is the deliberate reuse that makes the principle stick.

Use a one-sentence `Aside` (`type="note"`) to name the **alternative posture** crisply: some products treat an invite as the *inviter's personal sponsorship* and auto-revoke pending invites when the inviter leaves. That's defensible; it's just a different product decision with a different default. The year-1 default is "org's decision," derived next.

No diagram here — it's a definitional anchor. Keep it tight (≤4 short paragraphs).

### The orphan invite: the inviter left before the invitee accepted

Cash out principle #1, case one. The chapter outline's lead scene: Alice invites Bob day 1, Alice removed day 5, Bob clicks day 6.

- **The senior call: honor the invite.** Acme's offer outlives Alice's departure. The accept flow proceeds unchanged; nothing in `acceptInvitation` checks the inviter's current membership.
- **Why this is the year-1 default — the cost asymmetry.** Spell it out (the chapter outline gives the exact reasoning): the cost of "Bob can't join when he legitimately should" exceeds the cost of "Bob joins after his inviter left." A blocked legitimate hire is a worse failure than a slightly-stale sponsorship.
- **The audit trail still tells the true story.** The `'invitation.sent'` row still names Alice as actor (frozen history); the `'invitation.accepted'` row names Bob. "Who invited Bob, and were they still here?" is answerable from the two rows. Reinforces the L1/L4 "rows are tombstones" thread without re-teaching it.
- **The one UI nicety.** The accept page shows "invited by Alice" only if Alice is still a member — a cheap `member` existence read (`member.exists(inviterId, orgId)`), gated for *display only*. If Alice is gone, omit the line; the accept itself never refuses on it. Make the display-vs-authorization split explicit: a missing inviter changes the *copy*, never the *decision*.

`Aside` (`type="caution")`, one line: auto-revoke-on-inviter-removal is the alternative; pick one and *document it* so the team isn't surprised. (Named once, per chapter-outline scope; not built.)

No code block needed — the point is the *absence* of a check. Optionally a single inline `Code` line showing the *display-only* guard (`{inviterStillMember && <p>Invited by {inviterName}</p>}`) to concretize "this guard is cosmetic, not authorization." Keep it to that one snippet.

### The demoted inviter, and other state that moved under the invite

A short companion to the orphan case — same principle, lighter touch. Bundle the chapter outline's "admin who got demoted" and "inviter accepting an invite for an org they own elsewhere" as quick confirmations that *cross-cutting state is independent of the open invite*.

- **Inviter demoted before accept.** Alice invited Bob as `admin` while she was an admin; Alice is demoted to `member` before Bob accepts. Bob *still* gets `admin` — the invite carries `role`, not `inviterRole`; the org's snapshotted decision stands. (One sentence; it's principle #1 again.)
- **Cross-org independence.** Bob owns "Bob Consulting" and accepts an Acme invite as `member`. The accept writes one `member` row in *Acme's* tenant; his ownership of Bob Consulting is untouched; only the session's `activeOrganizationId` switches to Acme. The accept is a write in *one* tenant, not a multi-tenant operation. Lightly reinforces the `tenantDb`/active-org model from Ch 056 — name it, don't re-teach.

Keep this section to two compact paragraphs. Its job is to show the principle *generalizing* so the student trusts it for novel cases, not to enumerate exhaustively.

### The email mismatch: never bind an invite to the wrong account

Principle #2, the privilege-confusion defense. This is the most security-load-bearing edge in the lesson; give it room. It also resolves the L3 debt (L3 rendered only a refusal *stub* for shape B; this lesson owns the full posture).

- **The scene.** Alice invited `bob@acme.com`. Bob is signed in as `bob.personal@gmail.com` (he forwarded the email to his personal inbox and clicked there). Does this accept?
- **The senior call: strict refusal, no escape hatch.** The accept page detects `session.user.email !== invitation.email` and renders the mismatch screen. The action *also* refuses server-side (the L3 contract already has `user.email !== invitation.email → err('forbidden')`). Both layers — the page for UX, the action as the real gate.
- **Why — privilege confusion through forwarded email.** The invitation's identity is the *email address*. Silently binding it to whatever account happens to be signed in lets the wrong human accept a forwarded invite and inherit a seat that was never offered to them. This is a real privilege-escalation/confusion vector, the same reasoning class as L3's "the GET must not write." Name it as such to connect the threads.
- **The deeper layer: a matching email is only proof if it's *verified*.** Sharpen the principle one notch — email *equality* alone is insufficient, because an attacker who pre-registers an *unverified* account at the victim's address (`bob@acme.com`) would pass a naive string-equality gate and accept Bob's invite. The real predicate is "the session belongs to a *verified* owner of the invited address." This is why the accept path leans on opaque, unguessable invitation IDs (L1's `uuidv7()`) *and* the verified-email check — the invite click confirms reachability, verification confirms ownership. (Better Auth's organization plugin enforces exactly this: for opaque/UUID invitation IDs it preserves the emailed-invitation flow, and a `requireEmailVerificationOnInvitation` option hardens the recipient endpoints against the pre-registered-unverified-account attack. Reference the *behavior* — verified ownership, not bare equality — without turning the lesson into plugin-config docs.) Keep this to one tight paragraph; it deepens, not replaces, the equality story.
- **The escape hatch that must not exist.** State it directly: do *not* add an "accept anyway" confirmation dialog because it feels friendlier. That button *is* the vulnerability. This is the section's load-bearing watch-out — put it inline in the prose, as a `danger` `Aside`, not buried.
- **The recovery copy.** The screen tells Bob exactly how to fix it: "This invitation was sent to bob@acme.com. Sign out and sign in as bob@acme.com to accept, or ask Alice to re-invite your current email." Two concrete out-of-band recoveries; no in-app shortcut. (The "ask Alice to re-invite" path lands on L4's revoke-and-resend, since changing the target email = new invite, not an edit.)

**The case-insensitivity nuance** (its own short beat, ~1 paragraph). Compare lowercased on *both* sides — `Bob@Acme.com` must match `bob@acme.com`. The invitation email was stored lowercased (L1's `lower(email)` index, L2's `.toLowerCase()` on the schema); normalize the session email at compare time too. But **display the original casing** to the user — lowercase is an internal comparison key, never a presentation form. Use a tiny `CodeVariants` (two tabs) here, "Naive vs. Correct":
- *Naive:* `session.user.email === invitation.email` (`del`-marked) — breaks the moment either side has different casing; a real bug because the invite display elsewhere preserves casing.
- *Correct:* `session.user.email.toLowerCase() === invitation.email` (`ins`-marked; note `invitation.email` is *already* lowercased at rest, so only the session side needs normalizing — call that out in the prose so the student doesn't double-lower or wonder why one side looks bare).
Keep each variant to a couple of lines; the prose under each is one sentence per the component's six-line rule.

`Term` candidate: **privilege confusion** (definition: a class of bug where an action is performed under the wrong identity's authority, e.g. the wrong user accepting a forwarded credential). Worth a tooltip — non-obvious term, supports the lesson's core security framing.

### The double-click race: who wins when two tabs accept at once

Principle #3, the optimistic-concurrency case. The chapter outline prescribes "one small sequence diagram for the double-click race against the `WHERE status='pending'` filter" — this is its home. The student planted this clause in L3 (named idempotent) and L4 (named as the guard); here it gets the full mechanical walk-through.

- **The scene.** Bob clicks Accept in two browser tabs almost simultaneously. Two `acceptInvitation` Server Action invocations fire as two separate requests, both enter `withTenant`, both read the row as `status = 'pending'`.
- **What stops the double-write.** The `UPDATE invitation SET status = 'accepted', acceptedAt = now() WHERE id = ? AND status = 'pending'` runs in both transactions, but the `AND status = 'pending'` precondition means **only one UPDATE matches a row** — the first to commit flips the status; the second now sees `status = 'accepted'`, matches **0 rows**, and the action surfaces the idempotent "you're already a member" branch instead of inserting a second `member` row.
- **Name the pattern: optimistic concurrency.** No lock taken up front; the write *assumes* the row is unchanged and the `WHERE` precondition *verifies* that assumption at commit time. The precondition is doing the same job a `version`/`updated_at` guard does in the classic optimistic-locking pattern — here the status column *is* the version. Generalize one sentence: this is the transferable move for any "exactly-once transition" (accept once, charge once, claim a job once).
- **The reflex.** Restate principle #3 crisply: *never assume the row is still in the state the page render saw; re-check the precondition at write time.* The render is a stale snapshot; the `WHERE` clause is the source of truth at the moment of mutation.

The diagram — Mermaid `sequenceDiagram`, wrapped in `<Figure>`, horizontal-friendly (two `Tab A` / `Tab B` participants + a `DB` participant). Steps: both tabs read pending → Tab A `UPDATE … WHERE status='pending'` commits (1 row) → Tab B `UPDATE … WHERE status='pending'` (0 rows) → Tab A inserts member + redirects to dashboard → Tab B's 0-row result routes to "already a member." Pedagogical goal: make the *timing* legible — the student sees that both reads succeed yet only one write lands, which is the whole point and the part prose alone fudges. Caption names the precondition as the concurrency primitive. Apply the `themeCSS` font-size bump from the Mermaid doc if the participant labels render small.

One `Code` block (TS, ~3 lines, `pending`-clause highlighted) showing just the precondition'd `UPDATE` and the `if (updated.length === 0) return ok({ alreadyMember: true })`-style branch — lifted from the L3 action contract, presented as "this clause is why." Do not re-show the whole action.

### Already a member: the invite that should never have been written

The send-side guard, distinct from L4's pending-on-pending collision. This resolves the explicit L4→L5 debt (L4 owns `conflict` for a duplicate *pending* invite; L5 owns `already-member` for an existing *membership*).

- **The scene.** Bob is already a member of Acme. Alice forgets and invites `bob@acme.com` again.
- **The senior call: refuse before writing the invite row.** The check belongs in the `sendInvitation` body, *before* the INSERT: if a `member` row exists for `(orgId, lower(email))`, return `err('not_found', …)`? — no: return a *conflict-shaped* refusal. Reconcile the code precisely: the chapter outline wrote this as `Result.error('already-member', …)`, but the canonical `Result` union (Code conventions) has **no `'already-member'` code** — the same reconciliation L4 already made for `'already-invited'` → `conflict`. So return `err('conflict', 'Bob is already a member of this organization.')`, and carry the existing member's id/role in the message (or a payload field) so the UI can deep-link to their row. **Flag this divergence from the chapter outline explicitly** for downstream agents: `'already-member'` is not a real code; it maps to `conflict`, distinguished from the pending collision by its message and by *where* the check fires (membership pre-check vs. unique-index catch).
- **Why a pre-check here, when L4 said "don't pre-check, let the index throw."** Draw the distinction sharply — this is the subtle senior point. L4's rule is about a *unique constraint* (the DB enforces it; a SELECT-then-INSERT pre-check has a race window, so you let the index throw and catch `23505`). The already-member case has *no* unique index spanning `member` and `invitation` (they're separate tables, "sequential not joined" per L1), so there's nothing to catch — a cheap membership read in the action body is the right and only tool. The takeaway: *prefer the constraint when one exists; fall back to a guarded read when the invariant spans tables a single index can't cover.* Name the residual race honestly (a membership could be created between the check and the invite INSERT — vanishingly rare, low-stakes, and the accept flow's own guards catch the downstream effect), so the student doesn't think the pre-check is a silver bullet.

Use `CodeVariants` (two tabs) to contrast the two collision shapes side by side, reinforcing that they look similar but live in different layers:
- *Pending collision (L4 recap):* catch `23505` on the INSERT, narrow on `.cause`, translate to `conflict`. One-sentence recap, not a re-teach.
- *Already-a-member (this lesson):* a `member` existence read *before* the INSERT, early-return `conflict`. 
Prose under each names the layer ("DB unique index" vs. "action-body guard read"). This A/B is the section's core teaching artifact.

### The link that can't resolve: expired, tampered, revoked, or its org is gone

A consolidation beat — several "the row/link is unusable" arrivals that all funnel to a refusal, with one structural case (org-deleted) that's interesting. Mostly recap of L3's verify ladder framed through the edge-case lens, *plus* the org-delete case which is new here and structural.

- **Expired click.** Bob clicks six weeks later; `expiresAt < now()` → the distinct `<InviteExpired>` screen ("this invite expired, ask for a new one"). Senior call: do **not** put a "request a new invite" button on this page — recovery is out-of-band (Bob emails Alice; Alice hits Resend from L4). Name the alternative (a self-serve "request to join" form) in one sentence as a *different feature*, out of scope.
- **Tampered/forged or revoked link.** Recap from L3: bad signature / missing row / hash mismatch all collapse to the *one* generic refusal; `canceled` forks to "this invite was revoked." Restate the principle ("differentiate a failure only when the distinction helps the user more than the attacker") in one line and move on — L3 owns the full derivation, don't repeat it.
- **The org was deleted before accept (the structural one).** Acme is deleted day 5; Bob clicks day 6. Because `invitation.organizationId` has `onDelete: 'cascade'` (the L1 schema contract, owned by Ch 056's cascade design), deleting the org *deletes the invitation row with it*. So the accept page's `getInvitationById` returns nothing → the same generic refusal, **with no special branch to write**. This is the senior payoff: the cascade DDL makes the case *structural* — you don't handle "org deleted" in application code at all; the schema already did. Connect explicitly to "where the check lives" → "the DDL, not the action." Name once that the cascade itself is Ch 056's territory; here we only *rely* on it.

This section's value is teaching the student to recognize when an edge case is *already handled by a structural choice made elsewhere* — a senior reflex (don't write app code for what a constraint guarantees). Keep it tight; lean on `Aside`s for the two recap cases and reserve prose for the org-delete insight.

### Reading a new edge case: the decision walk

The synthesis interaction — a `StateMachineWalker` (`kind="decision"`, *no* `<Figure>` wrapper, it's its own card) that turns the student into the accept route and walks them through the verification/branch order, landing each path on a verdict leaf. This is where the four arrival shapes (L3) and this lesson's refusals compose into *one* navigable decision the student drives themselves. Pedagogical goal: convert the lesson's prose principles into a *procedure the student executes*, surfacing the **order** the senior asks questions in (validity before identity before state) — the order is the lesson, exactly the walker's stated strength.

Proposed graph (ids in parens):

- Root `Question` (`link-valid`) — "A click arrives. Is the link cryptographically valid? (HMAC sig ok, row found, token hash matches)" → Branch "No" → `Leaf` (`leaf-refuse`); Branch "Yes" → `Question` (`fresh`).
- `Question` (`fresh`) — "Is it still live? (`expiresAt > now`, `status = 'pending'`)" → "Expired" → `Leaf` (`leaf-expired`); "Revoked (`canceled`)" → `Leaf` (`leaf-revoked`); "Already accepted" → `Leaf` (`leaf-already`); "Live & pending" → `Question` (`signed-in`).
- `Question` (`signed-in`) — "Is a user signed in?" → "No, account exists on the invited email" → `Leaf` (`leaf-signin`); "No, no account" → `Leaf` (`leaf-signup`); "Yes" → `Question` (`email-match`).
- `Question` (`email-match`) — "Does the session email match the invited email (lowercased)?" → "No" → `Leaf` (`leaf-mismatch`); "Yes" → `Leaf` (`leaf-accept`).

Leaf verdicts (short, with a one-line reason body each):
- `leaf-refuse` "Generic refusal" — one screen for tamper/missing/mismatch-hash; never enumerate.
- `leaf-expired` "Expired screen" — out-of-band recovery; no self-serve button.
- `leaf-revoked` "Revoked screen" — honest fork; the admin canceled it (L4).
- `leaf-already` "Already a member" — idempotent landing, link to dashboard; the double-click's other tab ends here.
- `leaf-signin` "Sign in, return to accept" — shape C; `next` back to the accept URL.
- `leaf-signup` "Sign up email-locked, return" — shape D; email prefilled *and* readonly.
- `leaf-mismatch` "Strict refusal, no 'accept anyway'" — privilege-confusion defense; the lesson's load-bearing leaf.
- `leaf-accept` "Render Accept button — the only write path" — consent gate; the POST re-verifies and the `WHERE pending` precondition makes it exactly-once.

This is a `decision` walker (terminal recommendations), not a `machine` (no cycles needed), so no `diagram` slot. The walker *is* the section's content; surround it with one framing sentence above and one "notice the order: validity → freshness → identity → match — refuse as early as possible, write as late as possible" sentence below.

### Senior calls at a glance

The closing artifact the chapter outline prescribes: a table of **edge case → senior call → where the check lives**. Build as a plain HTML `<table>` inside a `<Figure>` (per the diagrams doc's "annotated illustration / simple visual aid" guidance; a table is the right shape here, not a diagram engine). Pedagogical goal: a single-screen reference the student can scan to recall the whole lesson, with the third column hammering the *layer* axis that the lesson kept foregrounding.

Rows (keep cells terse):

| Edge case | Senior call | Where the check lives |
| --- | --- | --- |
| Inviter removed before accept | Honor the invite | Nowhere — no check (org's decision) |
| Inviter demoted before accept | Honor the snapshotted `role` | Nowhere — `role` frozen on the row |
| Email mismatch (session ≠ invited) | Strict refuse, no "accept anyway" | Action body, before any write |
| Double-click / two tabs | First wins, second idempotent | DB `UPDATE … WHERE status='pending'` |
| Already a member | Refuse before writing the invite | `sendInvitation` body membership read |
| Org deleted before accept | Refuse; nothing to handle | DDL `onDelete: 'cascade'` (Ch 056) |
| Expired / tampered / revoked link | Refuse (generic, except expiry/revoked fork) | Accept-page verify ladder (L3) |

Close the lesson on one short paragraph restating the three principles as the *durable* takeaway — org-decision-frozen-at-send, identity-is-the-email-never-silently-rebound, never-trust-the-rendered-state-at-write-time — and noting that a novel invite edge case the student hasn't seen will usually resolve to one of the three. This is the senior-mindset landing the chapter has been building toward.

### Optional understanding check

If a check earns its place, a single `Buckets` exercise fits the lesson's spine better than any other: present ~6 short edge-case statements as draggable items and two buckets — **"Honor / proceed"** vs. **"Refuse"** — *or*, better for the "where the check lives" axis, three buckets: **"DB precondition / constraint"**, **"Action-body guard"**, **"No check — structural / honor."** The three-bucket layer-sorting version directly drills the lesson's hardest transferable idea (which *layer* enforces an invariant). Grading: each item belongs to exactly one bucket per the summary table. Place it right after "Senior calls at a glance" so the table primes it. Keep to one exercise — the lesson is short and reading-heavy; don't over-assess. (No live-coding component — consistent with the chapter outline; the deltas are too coupled to isolate.)

### External resources (optional)

At most one or two `ExternalResource` cards if they add real value:
- MDN on safe/idempotent HTTP methods (reinforces why the accept GET stays safe and the precondition makes the POST idempotent) — only if not already linked in L3; if L3 used it, skip to avoid duplication.
- Optionally the Better Auth organization plugin page for the `acceptInvitation`/`setActiveOrganization` APIs leaned on. Likely already linked upstream; include only if it adds something this lesson specifically needs.

Do **not** force a YouTube video — no `VideoCallout`. This is a reasoning/decisions lesson with no discrete tool or syntax a video would demonstrate better than the walker + table; per the pedagogical guideline, a video must support concepts better than the page already does, and here it wouldn't.

## Scope

**Prerequisites — redefine in one line each, do not re-teach:**
- The `invitation` table shape and its `(org, lower(email)) WHERE status='pending'` partial unique index (L1).
- `sendInvitation` body and the signed-URL/token discipline (L2).
- The accept route, its verify ladder, the four arrival shapes, the consent-gate `acceptInvitation` action with the `WHERE status='pending'` precondition, `setActiveOrganization`, auto-`emailVerified` (L3).
- The pending-invites surface, `resendInvitation`/`revokeInvitation`, the `23505` catch-and-translate to `conflict` (L4).
- `withTenant`/`tenantDb` (Ch 056), `logAudit(tx)` and `authedAction` (Ch 057), the `Result`/`ok`/`err` contract and `ensureError` narrowing (Code conventions). Name at the call site; never re-explain.

**This lesson does NOT cover (owned elsewhere):**
- The send / accept / manage flows themselves — L2 / L3 / L4. This lesson only adds guards and judgment to them.
- The full four-arrival-shape rendering and the consent-gate derivation — L3 owns it; this lesson composes them in the decision walk and owns only the email-mismatch *full posture* (L3 left a stub) and the already-member send-side guard.
- The pending-on-pending `conflict` collision mechanics — L4 owns it; this lesson only contrasts it against already-member to teach the layer distinction.
- The org-delete cascade *design* — Ch 056 owns the cascade shape; this lesson only *relies* on it and uses it to show a structural edge case.
- Multi-invite-pending-on-signup dashboard widget — named once as a year-2 reach, not built.
- Self-serve "request to join" flows — named once as a different feature, not built.
- Auto-revoke-on-inviter-removal as a product option — named once as the alternative posture, not built.
- Rate-limiting the accept/send endpoints — Ch 074.
- Seat/entitlement gating before invite — Ch 064.
- Privacy / GDPR posture on invitee email retention — Ch 081.
- The retention job that DELETEs terminal/stale rows — Unit 16, named only.

**Deliberate divergences from the chapter outline (flag for downstream agents):**
- The chapter outline's `Result.error('already-member', …)` is reconciled to `err('conflict', …)` — `'already-member'` is not in the canonical `Result` union (same reconciliation L4 made for `'already-invited'`). Distinguish it from the pending collision by message and by which layer fires the check.
- No live-coding exercise (the chapter outline already signals this); at most one `Buckets` check.
