# Lesson 3 — Four arrival shapes on one accept URL

- **Title (h1):** Four arrival shapes on one accept URL
- **Sidebar label:** The accept flow

## Lesson framing

This is the senior-mindset peak of the chapter. Lesson 2 mailed a bearer credential to a stranger; this lesson is what happens when the stranger clicks it. The load is **not code volume** — it is the routing reasoning: one `GET` URL fans into four authentication situations, and each demands a different next step before any `member` row is written. The whole lesson is the decision *order* and *where the check lives*, mirroring lesson 1's "encode invariants structurally, not as hopeful app logic."

Three teaching spines run the whole lesson, introduced in this order so complexity stacks rather than dumps:

1. **The GET renders; the button writes.** The naive instinct — "the link click accepts the invite" — is the wrong-then-right archetype this lesson opens on. An email-scanning crawler or a corporate URL-rewriter follows links *to scan them*; if the `GET` writes the `member` row, the invite is consumed by a bot before Bob ever sees it. So the page render is a pure, idempotent **read + decide**; the write is a Server Action behind an explicit Accept button (the human's consent signal). Land this distinction first — every other decision hangs off it.
2. **Verify before you branch; re-verify in the action.** The page verifies the URL in a fixed order (signature → row lookup → hash → expiry → status) and collapses the first three failures into **one generic refusal** so a bad signature never reveals whether a row exists. Then — the senior reflex that beginners miss — the Accept *action* re-runs its own verification, because the form POST is a *separate request* and the page's pre-check is not authorization for the write.
3. **Four shapes, one route.** Signed-in-same-email, signed-in-different-email, signed-out-with-account, signed-out-without-account. The page is one route with four UI states; the branch is chosen server-side from `session × invitation.email`. This lesson resolves shapes A, C, D fully and **hands the mismatch posture (shape B) to lesson 5** — name it, render the refusal stub, do not re-derive the privilege-confusion argument here.

Target student: junior dev who has shipped sign-in/sign-up (Ch 53) and the `authedAction`/audit/`tenantDb` machinery (Ch 57), and just built the send side (lesson 2). They are comfortable with Server Actions and `Result`; they have *not* reasoned about consent gates, idempotent accept, or active-org side effects. Mental model to leave with: **"The accept URL is a key. Clicking it unlocks a decision page, not a door. The door opens only when the right human, authenticated as the invited email, presses Accept — and the action checks the key again on the way through."**

Pedagogy: lead with the wrong-then-right `CodeVariants` (auto-accept-on-GET vs render-and-gate). Carry the four shapes on a `StateMachineWalker` (`kind="decision"`) — it forces the reader through the exact branch order the server uses, one commit at a time, which is the lesson. Use `AnnotatedCode` for the verify ladder and again for the accept action's transaction body (the two code artifacts that earn step-by-step attention). A short `DiagramSequence` shows the signed-out-signup path looping back through the same route (D → re-render → A). Keep code at the contract shapes the continuity notes already froze; do not invent new helpers beyond `verifyInviteUrl` (promised by lesson 2) and `acceptInvitation`.

Cognitive-load control: the verify order and the four shapes are *both* lists of four — teach them sequentially, never interleaved. Verify order first (it's the gate that all four shapes pass through), then the four shapes (what renders *after* the gate passes). Resist the urge to show the full page component; show the decision logic as prose + the walker, and the two write-bearing code blocks (verify ladder, accept action) in full.

## Lesson sections

### Introduction (no header)

Open on the concrete moment: Bob, three days later, clicks the link in his mailbox. State the four situations he could be in (signed in / out × has account / not, email match / mismatch) as a single sentence, not a list — the list is the walker's job. The senior question, stated implicitly: *one URL, four humans-states, and a row that must be written only for the right authenticated user — what's the route shape and the verify order?* Preview the end state: an `/accept-invite` page that routes all four, an `acceptInvitation` action that writes `member` only behind a consent click, and the idempotent-on-double-click property. Warm, four sentences max. Connect back: "Lesson 2 mailed the credential; this is the lock it opens."

### The link is a GET, so the page is a read

Establish the structural constraint that dictates everything: **the link in an email is a `GET`** — clicking it must land on something renderable, so this is a **page (`app/accept-invite/page.tsx`), not a Server Action**. Default export, framework-named (cite the code-convention carve-out so the default export doesn't read as a violation). The page is a Server Component that reads `searchParams` (`await searchParams` — Next 16 async request API), verifies, looks up, and **renders a decision** — it does not mutate.

This is the wrong-then-right archetype. Use **`CodeVariants`** (two tabs):
- **Tab "Auto-accept on GET" (the trap):** the page body writes the `member` row and flips status inline during render. Mark the offending lines with `del=`. Prose (≤6 lines): an email security scanner, a Slack/Outlook link-unfurler, or a corporate URL-rewriter fetches links *to inspect them* — every such fetch is a silent `GET` that would consume the invite before the human sees it. Side-effecting GETs also violate HTTP semantics (a `GET` must be safe/idempotent).
- **Tab "Render, then gate" (the shape):** the page returns JSX with an Accept `<form action={acceptInvitation}>` button; no write happens at render. Mark the button + hidden inputs with `ins=`.

Land the one-liner the rest of the lesson leans on: **the GET decides; the POST (Accept button) writes.** `Term` candidates here: "URL rewriter" / "link unfurler" (corporate proxies/clients that pre-fetch links).

### Verify in order, refuse as one

The page's first job, before it can render any of the four shapes, is to trust the URL. Teach the **fixed verify order** and *why* the order matters. Use **`AnnotatedCode`** (lang `tsx`, color blue) over a compact verify block that calls `verifyInviteUrl` (the lesson-2 stub becomes the production gate here) then reads the row. Steps:

1. `{verify signature line}` — recompute the HMAC over the canonical `` `${id}.${rawToken}` `` payload and compare with `crypto.subtle.verify` (never `===` — timing leak; cite lesson-2 discipline, don't re-teach HMAC). Bad signature → generic refusal **without touching the DB**. The signature is the cheap pre-DB doorman from lesson 2.
2. `{row lookup by id}` — no row → the *same* generic refusal. Never reveal that `id` was missing.
3. `{tokenHash compare}` — `sha256(rawToken)` vs the stored `tokenHash`, timing-safe. Mismatch → same refusal.
4. `{expiresAt > now() check}` — expired → a *distinct, friendlier* "this invite expired, ask for a new one" screen (expiry is a normal lifecycle end, not an attack; differentiating it adds user value where differentiating tamper does not).
5. `{status switch}` — `'pending'` → proceed to the four-shape branch; `'accepted'` → "you're already a member" with a dashboard link (idempotent, friendly — the most common cause is a double click); `'canceled'` → "this invite was revoked"; `'rejected'` → recovery copy.

The senior principle to state explicitly: **signature failure, missing row, and hash mismatch all collapse to one refusal string** — from the user's standpoint they map to the same recovery ("I need a fresh invite"), and differentiating "tampered" from "doesn't exist" leaks structure to an attacker for zero user benefit. Expiry and revoked are *separate* because they carry a distinct, honest recovery path. Reinforce the convention from Code conventions §Error handling: a gate treats an exception as a refusal (`try/catch` defaults to deny).

Follow with a small **`MultipleChoice`** (single-correct): "A request arrives with a tampered `sig`. Which screen should render?" — distractors: "404 with 'invitation not found'", "'this link was tampered with'", correct: "the same generic refusal as a missing/expired invite". One question, checks the no-enumeration reflex.

### One URL, four humans

Now the payoff. The verify gate passed and `status='pending'`; the page must render one of four UI states, chosen from **session × `invitation.email`**. Carry this on a **`StateMachineWalker`** (`kind="decision"`, no diagram slot — it's a decision funnel, not a cyclic machine). The walker *is* the teaching: it forces the reader through the same question order the server asks.

Walk structure:
- `Question id="signed-in"` prompt "Is there a session?" → Branch "Yes" → `email-match`; Branch "No" → `has-account`.
- `Question id="email-match"` prompt "Does the session email equal `invitation.email`?" → Branch "Matches" → `leaf-accept`; Branch "Differs" → `leaf-mismatch`.
- `Question id="has-account"` prompt "Is there an account on the invited email?" → Branch "Account exists" → `leaf-signin`; Branch "No account" → `leaf-signup`.
- `Leaf id="leaf-accept"` verdict **"Shape A — render the Accept button"**: signed in as the invited person; show "Accept invitation to Acme as member" + the consent button. This is the only leaf that reaches the write.
- `Leaf id="leaf-mismatch"` verdict **"Shape B — refuse (lesson 5 owns the posture)"**: signed in as a *different* email; render the strict refusal stub. One sentence on *why* it's a refusal not an "accept anyway" — forwarded-email privilege confusion — then explicitly defer the full posture and the case-insensitive compare to lesson 5. Do **not** re-derive.
- `Leaf id="leaf-signin"` verdict **"Shape C — sign in, return here"**: signed out but an account exists on the invited email; render a sign-in form prefilled with the invited email, `?next=` back to this same accept URL. On success the page re-renders → Shape A.
- `Leaf id="leaf-signup"` verdict **"Shape D — sign up, return here"**: signed out, no account; render a sign-up form prefilled and **email-locked** (disabled/readonly) to the invited address, returning to this accept URL. After sign-up the page re-renders → Shape A.

State the unifying senior reflex under the walker: **one route, four UI states; the routing decision is server-side, derived from the row and the session — never from `searchParams` display values** (rendering the org name from a query param is XSS; the *row* is the only trustable source for display).

For shapes C and D, do **not** re-teach sign-in/sign-up — Ch 53 owns them. Name only the two deltas this flow adds: (1) prefill the email from `invitation.email`, (2) carry `?next=` back to the accept URL so the human lands exactly where they were. The email-lock on Shape D is the one new rule worth a sentence: locking the signup email to the invited address prevents the "Bob signed up with the wrong email at the prompt and now hits the mismatch branch" confusion (a real support ticket; the prefill+lock is the structural fix).

### The accept action writes once, behind the click

The write side. **`acceptInvitation`** is a Server Action invoked from the Shape-A button. Two senior decisions framed up front:

1. **Not wrapped in `authedAction`.** The authority here is *the invitation token itself*, not an org role — Bob is not yet a member, so there is no role to gate on. State this as the reason, tying back to Ch 57's wrapper: `authedAction` checks `role` against an existing membership; the invitee has none. The action does its *own* authorization: re-verify the token, then confirm `session.user.email === invitation.email`.
2. **Re-verify, because the POST is a new request.** The page's verification does not carry across to the action call — different request, possibly seconds later, session could have changed. Beginners trust the page's pre-check; the senior reflex is the action re-runs signature + hash + expiry + `status='pending'` itself. Cite Code conventions §Forms and Server Actions: parse → authorize → mutate → revalidate → return.

Then the transaction body. Use **`AnnotatedCode`** (lang `tsx`, color green) over the full action, following the five-seam shape. The block runs the mutation inside `withTenant(orgId, async (tx) => …)` (the audit-capable transaction from Ch 56/57). Annotate, in order:

1. `{re-verify block}` — signature, hash, expiry, status all re-checked; any failure → `err('not_found', …)` / the appropriate `Result`. (color this step a different accent if helpful, or keep green for the whole.)
2. `{email guard}` — `session.user.email` vs `invitation.email`; mismatch → refuse server-side. The UI must never be the only thing stopping shape B — the action is the real gate.
3. `{insert member}` — `member.role = invitation.role` (the inviter's snapshotted choice from lesson 1; accept never re-prompts the role). `.returning({ id })` → `newMemberId`.
4. `{flip invitation}` — `UPDATE invitation SET status='accepted', acceptedAt=now() WHERE id=? AND status='pending'`. Call out the **`WHERE status='pending'` precondition** — this is the optimistic-concurrency primitive that makes the double-click race safe (one update wins, the other affects 0 rows → "already a member"). Name the race here; lesson 5 owns the full treatment, so just plant the seed: "this `WHERE` clause is doing double duty — lesson 5 returns to it."
5. `{auto-emailVerified}` — **only when the invitee signed up through the invite** (shape D path), set `user.emailVerified = true` in this same transaction. The reasoning: the admin sent the invite to that address and the click proves the address is reachable — **the invite *is* the email-ownership proof**. Without this, a freshly-signed-up invitee bounces off Better Auth's `requireEmailVerification` immediately after confirming their email *through* the invite — a verification-required loop. Name the alternative (force the standard verify flow anyway) and the senior call (honor the invite). This is a load-bearing, non-obvious interlock — give it its own step and a `// the invite is the verification` comment (sanctioned by Code conventions §Comments: a non-inferable invariant).
6. `{setActiveOrganization}` — `auth.api.setActiveOrganization({ headers, organizationId: invitation.organizationId })` inside the transaction. Bob's active org was Personal; he just clicked an *Acme* link — intent is unambiguous, so switch. State the alternative ("accepted, but still in Personal, switch manually") and why it's worse UX. This is *why* the post-redirect lands in the right tenant.
7. `{logAudit}` — `logAudit(tx, { action: 'invitation.accepted', actorUserId: ctx.user.id, subjectType: 'invitation', subjectId, payload: { newMemberId, role } })`. The non-obvious bit: **the actor is the invitee, not the inviter** — this row represents Bob accepting, distinct from lesson 2's `'invitation.sent'` row that recorded Alice's intent. Two audit rows, two moments, two actors.

After the block, name the two **orderings that must not flip** (the COMMIT pivot, echoing lesson 2): everything above is inside the transaction; the `redirect('/dashboard')` fires **after** commit — redirecting before the active-org write commits is a refresh-the-page UX bug. The redirect target is a deterministic org-scoped URL (`/dashboard`, resolved by the protected layout in Bob's now-active Acme context) — **not** a `?next=` param; invite acceptance is its own intent, not a generic auth-return.

`Term` candidates: "optimistic concurrency" (the WHERE-on-status pattern), "idempotent" (the double-click / already-accepted behavior).

### The signed-out signup path loops home

Tie shape D's full round-trip together as a sequence — this is the one branch with a loop, and seeing the loop closes the "how does a brand-new user end up at the Accept button?" question. Use **`DiagramSequence`** (4 steps, simple labeled boxes/arrows, horizontal):

1. **Click (signed out, no account)** — GET `/accept-invite?…` → verify passes → Shape D renders the email-locked sign-up form.
2. **Sign up** — form submits to the Ch-53 sign-up action, `?next` = the same accept URL; account + session created.
3. **Back to the accept URL** — the browser lands on `/accept-invite?…` again; now there's a session whose email matches → Shape A renders the Accept button.
4. **Accept** — button POSTs `acceptInvitation`; the transaction writes `member`, sets `emailVerified`, switches active org, logs audit, redirects to `/dashboard`.

Caption the sequence with the senior call it embodies: **even right after sign-up, render the Accept button — don't auto-accept.** Skipping the click is tempting (one fewer step) but worse: the human should see "you're about to join Acme" *once*, explicitly; the click is the consent signal. Year-1 default = one extra click, clearer intent. This also keeps shape D from special-casing the write path — D collapses into A, and A is the only place the action fires.

### Token already used, and the double-click

A short consolidating section on the idempotent tail, so the student leaves knowing the flow is safe to click twice. Two cases, both resolved by machinery already built:

- **Clicked twice / already accepted:** the second click hits `status='accepted'` at the verify-order's status switch → the friendly "you're already a member of Acme" page with a dashboard link. Not an error — a friendly idempotent landing. The most common real cause is a double-click or a re-opened tab; the second click should still deliver the human to the right place.
- **Two tabs, simultaneous Accept:** both POSTs enter `acceptInvitation`; the `WHERE status='pending'` precondition on the `UPDATE` lets exactly one win; the loser's update affects 0 rows and the action returns the "already a member" branch idempotently. Reinforce: **never assume the row is still pending at write time** — the `WHERE` clause is the concurrency guard. Explicitly defer the deeper race walkthrough to lesson 5 (which owns the sequence diagram) — here it's a one-paragraph reassurance, not a re-teach.

No new code — reference the verify-order block and the accept-action block already shown. Optionally close with a **`TrueFalse`** round (3 statements) to lock the idempotency model: e.g. "Clicking an accepted invite link a second time returns an error page" (false), "The `WHERE status='pending'` clause lets only one of two simultaneous accepts succeed" (true), "The page render writes the member row" (false).

### External resources (optional)

One or two `ExternalResource` cards: Better Auth organization-plugin `acceptInvitation` / `setActiveOrganization` API reference; optionally the MDN page on HTTP-method safety/idempotency (grounds the "GET must not write" argument). Keep to genuinely load-bearing references; skip filler.

## Scope

**Prerequisites to restate concisely (one line each, do not re-teach):**
- The signed accept-URL shape `id`/`token`/`sig` and the HMAC `` `${id}.${rawToken}` `` payload + `verifyInviteUrl` stub — **lesson 2** built these; this lesson consumes them and promotes the stub to the production gate.
- `tokenHash = sha256(rawToken)`, the 7-day `expiresAt`, the `pending|accepted|canceled|rejected` status set, `member.role = invitation.role` — **lesson 1** owns the schema; reference, don't re-derive.
- `withTenant(orgId, fn)` transaction + `logAudit(tx, event)` — Ch 56/57; used as-is.
- Sign-in / sign-up Server Actions, enumeration discipline, `?next=` open-redirect closure (`safeNext`) — **Ch 53 / Ch 54**; shapes C/D *reuse* them, naming only the prefill + return-URL deltas.
- `authedAction`, `roleAtLeast`, `requireOrgUser` returning `{ user, orgId, role }` — Ch 57; explain only *why* accept does **not** use `authedAction`.

**Explicitly out of scope (defer, name once where noted):**
- The full **email-mismatch posture** (shape B) — strict-refusal copy, case-insensitive lowercase compare, the no-"accept anyway" rule — **lesson 5**. This lesson renders the refusal stub and names the privilege-confusion reason in one sentence only.
- The **double-click race** deep dive (sequence diagram, `WHERE`-filter mechanics in full), **inviter-removed-before-accept** (honor the invite), **org-deleted-before-accept** (cascade → generic refusal), **already-a-member** pre-check in the *send* body — all **lesson 5**.
- **Send side** (`sendInvitation`, token minting, email dispatch) — lesson 2.
- **Pending-invite management** (list, resend with token rotation, revoke, `'already-invited'` collision) — lesson 4.
- **Magic-link sign-in** internals — Ch 53 lesson 5 (the accept URL is shaped similarly but this lesson does not re-teach signed-link discipline).
- **Multi-invite stacking** (multiple pending invites visible post-signup) — name once as rare in year-1; not built.
- **Rate limiting** the accept endpoint — Ch 074. **Seat/entitlement** checks — Ch 064. Neither appears here.

## Code-convention notes & deliberate divergences

- Action named **`acceptInvitation`** (verb+noun, no `Action` suffix) — matches Code conventions §Naming and the Ch-57/lesson-2 verb-noun precedent; the chapter-outline/TOC `acceptInvitationAction` is superseded (consistent with lesson 2's documented `sendInvitation` divergence). Flag this to downstream agents.
- Page file is `app/accept-invite/page.tsx`, **default export** — sanctioned framework-named carve-out (§Function form), not a violation. Read `searchParams` via `await searchParams` (Next 16 async request API, §Caching).
- `acceptInvitation` returns `Result<T>` and follows parse→authorize→mutate→revalidate→return; mutation inside `withTenant` transaction; `setActiveOrganization` is an `auth.api.*` call — note it runs inside the tx here as a deliberate ordering choice (the convention's "no external IO in a transaction" targets network IO like email/Stripe; the Better Auth session write is in-process DB work, so it belongs with the row writes — call this out so it doesn't read as a violation).
- Generic-refusal and expiry screens are plain Server-Component renders; no client interactivity needed. Accept button is the only interactive leaf (`<form action={…}>`, uncontrolled, hidden `invitationId`/`token` inputs).
- HMAC compare via `crypto.subtle.verify`, never `===` (§Security baseline, constant-time). Comment the constant-time compare (§Comments allows the security note).
- One deliberate pedagogical simplification: the verify-order `AnnotatedCode` may inline the lookup+checks in a single readable block rather than fully decomposed `db/queries/` helpers, to keep the gate legible in one frame — note this is a display simplification, the project codebase factors the read into `db/queries/`.
