# Walking the six error seams

- **Title (h1):** Walking the six error seams
- **Sidebar label:** The six seams

---

## Lesson framing

This is the chapter's **synthesis / audit lesson**, not a new-concept lesson. Lessons 1 and 2 installed the two load-bearing rules and gave them names — **fail closed** ("when a gate can't *prove* a request is allowed, it refuses, and a throw inside the check is a refusal") and **two messages** ("every error is two artifacts — a sanitized `userMessage` for the user, a rich operator record for the engineer — forked at the wrapper, never the UI"). Lesson 2 closed by handing the student a portable two-question test: *(1) does this fail closed, and (2) is what the user sees safe to read aloud on a support call?* Lesson 3 walks that test across the whole codebase.

The pedagogical job is **consolidation and recognition**, not teaching primitives. By Unit 16 the student has shipped every one of these seams across Units 1–15. The mental shift this lesson produces: "the app's entire error surface is exactly **six shapes**, each shape has a wrapper or helper that owns both commitments, and a new feature's errors must fit one of the six — a seventh shape is a deliberate architectural call, not a quiet drift." That closed catalog is the deliverable; it's what the Chapter 082 audit project consumes.

Target student and framing. The student is a junior building production SaaS with AI agents. The senior skill being trained here is **auditing** — reading an existing codebase through a fixed lens and knowing what to grep for to find the path that skipped the lens. Frame every seam in production stakes: the cost of a missed seam is concrete (the action that skipped `authedAction` has *no gate at all*; the webhook that JSON-parses before verifying accepts forged events; the `error.tsx` with a "Show details" toggle is a leak by design). Each seam section ends with its **audit step** — the grep pattern and the triage rule (legitimate exception → document; the rest → migrate).

Cognitive-load management. Six seams is a lot of surface; the antidote is a **rigid repeated structure**. Every seam section answers the same four questions in the same order: (1) where the seam lives (files / wrapper), (2) where **fail-closed** lands, (3) where **message-split** lands, (4) the **audit step** (what to grep, how to triage). The student learns the *rhythm* once at seam #1 and then the remaining five are pattern-matching against a known template. A persistent visual scaffold — one overview figure introduced up front and referenced throughout — keeps the six in working memory. Keep prose tight: most seams were taught in depth elsewhere, so the job here is to *point*, not re-teach. The first seam (`authedAction`) gets the fullest treatment because it establishes the four-question template; seams #2–#6 lean on the symmetry ("same two moves, different artifact").

Code posture. **Recognition over authoring** (same posture as lessons 1–2). The wrappers, helpers, and boundaries all already exist in the codebase and were shown (paraphrased) in lessons 1–2. This lesson should **not** re-print the full `authedAction` / `error.tsx` source — it *references* the shapes lesson 1/2 established and shows only tiny, seam-specific fragments (a grep command, a status-code mapping, a one-line helper signature). The canonical contracts are fixed by the continuity notes; treat them as ground truth (see Scope). No live-coding exercise — there's no new syntax to drill, and the seams span Server Actions / routes / webhooks / Sentry, none of which the in-browser runtimes can host. Assessment is recognition-based: a classification drill, MCQs on the audit judgment calls, and a structured-recall capstone.

Mental model the student leaves with: a **map of the codebase's error surface** — six seams, each a node, each annotated with "fail-closed lands here / message-split lands here / grep for bypasses with this pattern." Plus the closing rule: every new error path must land on one of these six, or you add a seventh seam *on purpose*, with its own wrapper and its own two commitments documented.

---

## Lesson sections

### Introduction (no header)

Open on the senior question that motivates the audit. Restate, in two sentences, the two named rules from lessons 1–2 and the two-question test — assume the student just finished lesson 2, so this is a *callback*, not a re-teach. Then pose the lesson's job: "You have the rules. Now point at every place in the app where they land. There turn out to be exactly six." Name the payoff: by the end the student has a **mental map of the app's whole error surface** that the audit project (named once, Chapter 082) turns into a checklist. Keep it warm and brief; the structure does the heavy lifting.

Immediately drop the **overview figure** (below) so the six seams are on screen before the walk begins.

**Figure — "The six error seams" overview map.**
Pedagogical goal: give the student the whole catalog at a glance and a stable spatial anchor to return to as each seam is walked. This is a simple labeled diagram, not a complex graph — its value is *orientation*.
Engine: **Plain HTML + CSS** inside `<Figure>` (per diagrams INDEX: color-coded segments with labels, devtools-inspectable, horizontal/compact). Lay out the six seams as a horizontal-wrapping row of six labeled cards, grouped by where the caller comes from:
- **Inbound from the browser:** (1) `authedAction` — Server Action boundary; (2) `authedRoute` — route-handler boundary; (3) page / layout `requireOrgUser()` — Server Component boundary.
- **Inbound from a third party:** (4) webhook receiver — `app/api/webhooks/*`.
- **Cross-cutting:** (5) the rate-limiter call (`safeLimit`) — the one documented fail-open carve-out, visually flagged (e.g. an amber accent) to mark it as the exception; (6) `error.tsx` / `global-error.tsx` — the page boundary that catches what the others throw.
Each card shows: the seam name, the file/wrapper that owns it, and two tiny pills — "fail-closed" and "split" — to signal both commitments land there (seam #5's "fail-closed" pill is struck-through / amber to flag the carve-out). Caption: the two-question test, as the lens the walk applies to each card.
Keep total height well under the ~800px cap; this is a compact reference strip. Reference it explicitly at the start of each seam section ("seam #N on the map").

Reasoning: leading with the map collapses the "six things to track" load into one glanceable artifact the rest of the lesson decorates.

---

### Seam 1 — `authedAction`, the Server Action boundary

This seam gets the **fullest** treatment because it establishes the four-question template the next five reuse. It's also the seam the student knows best (the canonical Server Action wrapper from the roles chapter, re-read in lessons 1 and 2 of this chapter).

Walk the four questions:

1. **Where it lives.** `authedAction(role, schema, fn)` wraps every Server Action in `actions.ts` files; it returns `(formData) => Promise<Result<T>>` and hands `fn` a `ctx` of `{ user, orgId, role, db }`. One wrapper, every action — the "one place to lint" property from lesson 1.
2. **Where fail-closed lands.** Point at each step (do **not** re-print the full body — it was shown in lessons 1 and 2; reference it). Schema `safeParse` fails → returns `mapError(input.error)` (a `validation` `Result`); `requireOrgUser(role)` throws on no session / active-org / too-low role → flies to the framework's `error.tsx`, refused; `fn` throws → caught in the wrapper's one `try/catch`, captured, returns an `internal` `Result`. Every outcome is "refuse"; the action body never runs on a failed gate.
3. **Where message-split lands.** The wrapper's catch does the two moves from lesson 2: capture the operator record (`logger.error({ action, userId, orgId, role, input: redact(...), err })` + `Sentry.captureException`) **then** `return mapError(error)` for the sanitized user side. `error.message` reaches the log, never the `userMessage`. Both commitments live in this one block — that's the whole point of the wrapper.
4. **Audit step.** `grep` for files containing `'use server'` that don't import `authedAction`. Triage: the **public sign-up action** is a legitimate exception (different wrapper, its own enumeration discipline) — document it; everything else is a finding to migrate. Name this as the audit project's first finding category.

Components:
- A short **`Code` block** (`bash`/text) showing the actual grep/ripgrep pattern for the audit step — e.g. searching for `'use server'` files whose contents lack `authedAction`. Keep it copy-pasteable; this is the concrete "what to type" the audit needs.
- Do **not** use `AnnotatedCode` for the wrapper body here — it was already walked step-by-step in lesson 2. Instead, a *one-paragraph reminder* with a single tiny fenced `ts` fragment of just the catch block's two moves (capture → `mapError`), framed as "you saw this in lesson 2; here's the half that carries both commitments." Avoid duplicating the full source.

Reasoning: seam #1 teaches the *template*; investing here lets seams #2–#6 stay terse. The grep block makes the audit actionable rather than abstract.

`Term` candidates in this section: **`'use server'`** (the directive that marks a Server Action — re-define inline since it's the grep target), **fail closed** and **two messages** only if not already `Term`-defined earlier on the page (define once, first use).

---

### Seam 2 — `authedRoute`, the route-handler boundary

Terser — explicitly framed as "seam #1's twin, different artifact." The student saw the symmetry in lesson 2 (actions return `Result`, routes return Problem Details).

Four questions:

1. **Where it lives.** `authedRoute(role, schema, fn)` in `route.ts` files; the route-handler twin of `authedAction`. The framework artifact is a `Response`, not a `Result`.
2. **Where fail-closed lands.** Mirror seam #1 but mapped to HTTP status (the enforced status table from the route-handler conventions): parse fail → **422**; no session → **401**; role too low → **403**; **cross-tenant resource → 404** (the leak-avoiding shape — flagged here, taught fully in the 404-over-403 callout in lesson 2 and revisited in seam-agnostic form below); business `Result.err` → mapped to the matching status via `problemFrom`; unexpected throw → **500**.
3. **Where message-split lands.** The wrapper writes the RFC 9457 Problem Details body via the `problem()` helper (`{ type, title, status, detail, fieldErrors? }`) — `title` operator-honest-but-user-safe, `detail` the user sentence, `fieldErrors` the same flat `Record<string, string[]>` from `flattenError`. The operator log captures route + method + headers **minus `authorization`/`cookie`** + parsed input + ctx + cause chain. `problemFrom(result.error)` is the bridge: one business function feeds both `authedAction` (→ `Result`) and `authedRoute` (→ Problem Details), and the fork lands correctly at each door.
4. **Audit step.** `grep` for `route.ts` files exporting `GET`/`POST`/`PUT`/`PATCH`/`DELETE` that don't import `authedRoute`. Triage: **webhook receivers** (seam #4 — different wrapper, own signature verify) and **public auth callbacks** are legitimate exceptions; the rest migrate.

Components:
- A compact **`Code` block** (`ts` or a small table-in-prose) mapping failure class → HTTP status, since the status table is the seam-specific knowledge. Alternatively render the mapping as a tight two-column list in prose. Prefer the code block for scannability.
- A second `Code`/`bash` fragment for the route grep pattern.

`Term` candidates: **RFC 9457** (Problem Details — the HTTP error-body standard; re-define inline, it's the seam's artifact).

Reasoning: the value is the **status-code table** and the `problemFrom` bridge; everything else is "same as seam #1." Keep it to that.

---

### Seam 3 — page and layout `requireOrgUser()`, the Server Component boundary

Terser still. The interesting idea here is **defense in depth** — two rings around the protected page.

Four questions:

1. **Where it lives.** Protected Server Components and layouts call `requireOrgUser()` near the top of the segment. There's no wrapper object here; the *helper itself* is the seam.
2. **Where fail-closed lands.** The helper throws on no session / no active org; the framework's nearest `error.tsx` catches the throw and renders the fallback — the user gets the boundary, never the page body. "Fail-closed" here is implicit in "throw and let the framework catch."
3. **Where message-split lands.** Structural and almost invisible: `error.tsx` renders generic copy (seam #6 owns the detail), Sentry captures via the boundary's `useEffect`. The user *never sees the message* — that's the split, achieved by the framework redacting before the boundary renders.
4. **Audit step.** `grep` for protected Server Components / layouts that read tenant-scoped data without calling `requireOrgUser()` (or its equivalent) at the top. Findings are pages that lean only on the outer ring.

The defense-in-depth point (worth a short paragraph, it's the senior insight of this seam): the **proxy gate** (the cookie-presence check at the perimeter, from the auth/middleware chapter) is the *outer ring* — it bounces signed-out users to `/sign-in` cheaply but does **not** authorize. The in-component `requireOrgUser()` is the *inner ring* — it re-checks against the DB and catches the cases the proxy structurally can't: the user lost org membership while the page sat open, the active org switched in another tab, the session expired in the gap between proxy and render. Both rings run; the inner one is where real authorization happens. A page that trusts the proxy alone has a hole.

**Figure — two-ring defense-in-depth (small, inline).**
Pedagogical goal: make "outer ring is cheap presence-gating, inner ring is real authorization" spatial and obvious.
Engine: **Plain HTML + CSS** inside `<Figure>` (a simple concentric-rings or two-nested-boxes illustration; compact). Outer box labeled "proxy.ts — cookie presence, bounces to /sign-in, does NOT authorize"; inner box labeled "requireOrgUser() — re-checks the DB, throws on no session / no active org → error.tsx". A small annotation between them lists what slips past the outer ring (membership revoked mid-session, org switched in another tab). Caption: "Two rings; only the inner one authorizes." Keep height small.

Reasoning: this seam is short on new mechanics but rich on the *why two checks* judgment — the figure carries that cheaply.

`Term` candidates: **`proxy.ts`** (Next.js 16's named middleware file — define inline, since the student must distinguish it from the in-component check).

---

### Seam 4 — the webhook receiver

Back to a fuller treatment — the webhook receiver is the densest seam (signature-verify-then-dedup, multiple status codes) and the "user" here is **a machine** (Stripe, Resend), which is the conceptual hook. Note for the writer: the webhook chapters (Unit covering 063) ship *after* this chapter is authored in TOC order but the **contracts are fixed by the code conventions** (verify on raw body before parse; constant-time HMAC; `processed_events(provider, event_id)` ledger; status table) — treat those as canonical, reference them, do not invent variant shapes.

Four questions:

1. **Where it lives.** Each receiver in `app/api/webhooks/*` (Stripe, Resend). These do **not** use `authedRoute` — they use the signature-verify-then-dedup pattern as their own wrapper, because the auth model is "prove the request came from the provider," not "prove a logged-in user."
2. **Where fail-closed lands.** Walk the layers in order: raw-body read fails → **400**; signature parse fails → **400** (log the malformed header); HMAC compare fails (constant-time) → **401**; a thrown HMAC-library exception → **500** (the provider retries — still a refusal of *this* attempt); the `INSERT ... ON CONFLICT DO NOTHING` reporting "already processed" → **200** (idempotent success, *not* a refusal — call this out, it's the one non-refusal that looks like one); business work throws inside the transaction → **500**, provider retries, the dedup constraint catches the duplicate on retry. The whole receiver is fail-closed; the **idempotency** of the dedup ledger is what makes "refuse aggressively (500), retry safely" compose (the paired-primitives point from lesson 1).
3. **Where message-split lands.** The "user" is the provider, so the user-facing artifact is mostly the **status code** plus a minimal Problem Details body (`{ type, title, status }`). The structured log carries the full event: parsed `Stripe-Signature` / Svix headers, the timestamp delta, the event id and type, the resolved tenant, the cause chain on throws. Same split, machine audience.
4. **Audit step.** Visit each receiver and confirm: raw body read **before** any JSON parse, constant-time signature compare, dedup `INSERT` **before** the business work, business work inside the transaction with the dedup, status codes matching the failure class. The Resend bounce/complaint receiver follows the same shape with a **Svix** SHA-256 verify (5-minute replay window). Findings: a receiver that **JSON-parses before verifying** (the canonical bug — it accepts forged events), one that **catches-and-200s** on failure (fail-open dressed as "don't make the provider retry"), or one that **echoes the full provider payload** in the response body (a leak the provider doesn't need).

Components:
- **`DiagramSequence`** stepping through one webhook request through its fail-closed layers, OR a **`Sequence` ordering exercise** of the receiver's steps (raw body → verify signature → dedup INSERT → business work → respond). Prefer the **`Sequence` exercise** here: ordering is exactly the skill (the canonical bug is *wrong order* — parse before verify), so making the student place the steps tests the precise misconception. Put a tiny fixed code skeleton above the steps if it helps. Grading: source order is correct order; the verify-before-parse and dedup-before-business-work orderings are the load-bearing ones.
- A small **`Code`** block (`ts`, paraphrased) of the status-code switch by failure class, since the table is the seam-specific payload.

`Term` candidates: **HMAC** (hash-based message authentication code — define inline), **Svix** (Resend's webhook-signing service — define inline), **idempotent** (only if not already defined earlier in the course path; likely a quick re-definition is warranted here given its load-bearing role).

Reasoning: ordering is the testable misconception, so a `Sequence` drill beats passive prose. The machine-as-user reframing is the conceptual takeaway.

---

### Seam 5 — the rate-limiter call, the one documented fail-open carve-out

The conceptual centerpiece of the lesson's nuance: **the rule is "fail-closed by default," and this is the single deliberate exception.** The student met `safeLimit` and the fail-open reasoning in lesson 1; this section pins it as a seam and gives it its audit step.

Four questions:

1. **Where it lives.** Every rate-limit decision goes through `safeLimit(limiter, key)` in `lib/rate-limit.ts`. The carve-out exists in **exactly one place** — that's the architectural condition that makes a fail-open *defensible* rather than a scattered bug.
2. **Where fail-closed lands — and why it deliberately doesn't.** This is the inversion. `safeLimit` wraps the `limit()` call, **catches the throw, logs** `{ event: 'rate_limit_unavailable', limiter, key }` at error level, and **returns `{ success: true }`** — i.e. on a Redis-auth outage it *lets the request through*. The reasoning (from lesson 1, restated): a Redis outage locking **every** user out of their account is worse than a brief abuse window. Crucially, fail-open is the policy only for **Redis-availability** failures; **actual quota exhaustion still fails closed** (returns the 429). Name the senior framing explicitly: fail-closed is the default discipline; fail-open is a deliberate carve-out *with a written reason, in one helper*. Other limiters (admin actions, billing-critical paths the customer can't retry) may flip the default back to fail-closed — and that policy, too, lives in the helper, not at call sites.
3. **Where message-split lands.** The user-facing 429 body is the **identical opaque message regardless of which gate tripped** — the IP limiter or the per-email one both produce `rateLimited(...)` → `err('rate_limited', 'Too many attempts. Please try again later.')`. It never leaks "*your email* is being limited," which would itself be an enumeration signal. The route twin `rateLimitedResponse(result)` returns the 429. The structured log (`rate_limit_rejected`, with gate / key / remaining / reset) carries the operator's full diagnosis.
4. **Audit step.** `grep` for `.limit(` calls that don't go through `safeLimit` — a direct `limiter.limit()` in a handler bypasses the documented policy and is a finding. The carve-out is auditable precisely *because* it's centralized.

Components:
- A **`MultipleChoice`** that tests the judgment, not the recall — e.g. "A new admin-only bulk-delete endpoint is rate-limited. Redis goes down. Should this limiter fail open like the auth path?" with the correct answer reasoning that admin/destructive paths may flip to fail-closed because the abuse cost outweighs the lockout cost, and the policy belongs in the helper. Make distractors plausible (e.g. "always fail open to match the auth path" — the over-generalization lesson 1 warned against). Add an `McqWhy`.
- A tiny **`Code`** fragment of the `safeLimit` shape (catch → log → `{ success: true }`) — it was shown in lesson 1; here reference it and show only the 3 load-bearing lines.

`Term` candidates: **fail open** (re-define inline, it's the section's whole subject), **enumeration** (account-existence leak via differential responses — quick inline definition, since "don't leak which email is limited" depends on it).

Reasoning: the carve-out is the most *misunderstood* idea in the chapter (students over-generalize fail-closed *or* over-generalize the fail-open exception). An MCQ on a fresh scenario forces real reasoning instead of pattern-matching the auth-path example.

---

### Seam 6 — `error.tsx` and `global-error.tsx`, the page boundary

The last seam — the *catcher*. Seams #1 and #3 throw *into* this one. The student saw the canonical `error.tsx` in lesson 2; here it's framed as the sixth seam and given its audit step.

Four questions:

1. **Where it lives.** `error.tsx` at route segments with sensitive data; `global-error.tsx` at the root (the fallback for errors `error.tsx` can't catch — the root layout itself throwing). Both are `'use client'` components owned by the framework's boundary mechanism.
2. **Where fail-closed lands.** The framework catches the thrown error; in **production builds** Next.js redacts `error.message` and ships a stable `digest` in its place. The fail-closed reading: the user never gets the resource — they get the boundary. `global-error.tsx` is the last line; when it fires, assume nothing above survived (it carries its own `<html>`/`<body>`).
3. **Where message-split lands.** The boundary renders **generic copy only**; the `digest` is the **single** piece of operator detail the user may see (opaque, non-leaky, joinable — the user quotes it to support, the operator looks it up in Sentry/logs). Retry uses **`unstable_retry()`** (Next.js 16.2+), *not* `reset()` — because `unstable_retry` runs `router.refresh()` + `reset()` in a transition and can therefore recover a render that failed during *data fetch*, which bare `reset()` cannot. Sentry capture lives in a `useEffect`. `error.message` is **never** read in the JSX — that absence is the design.
4. **Audit step.** Confirm: every sensitive segment has an `error.tsx`; the root has `global-error.tsx`; **none render `error.message`**; each calls Sentry capture (auto via the integration, or explicit `captureException` — the explicit call is the anchor, especially in `global-error.tsx` where the render already failed). Findings: segments missing a boundary (they fall through to a parent — usually fine, worth confirming), boundaries that surface the message, a `global-error.tsx` missing Sentry capture, or — the design-level leak — an `error.tsx` with a **"Show details" toggle** (a leak vector by intent).

The **`notFound()` / `redirect()` carve-out** (short paragraph, it's a recurring student confusion): these are **framework control-flow primitives, not errors**. `error.tsx` does **not** catch them — `not-found.tsx` and the framework's redirect handler do. Fail-closed still applies (a thrown `notFound()` aborts the render, the user doesn't get the resource); message-split still applies (the not-found page renders generic copy, no leak of which id was requested). The senior reading from lesson 1: a thrown `Error` is fail-closed plumbing; a thrown `notFound()` is framework control flow the rule passes through. If a boundary *catches and swallows* a `notFound()`, that's a category-error bug — re-throw it.

Components:
- Reference the `error.tsx` shape from lesson 2 (don't re-print the whole thing); show at most the 2-line contrast: `{error.digest && <p>Reference: {error.digest}</p>}` present, `{error.message}` conspicuously absent. A tiny **`Code`** fragment suffices.
- A short **`bash`/`Code`** note on the audit (grep for `error.message` inside `error.tsx`/`global-error.tsx` files; grep for "Show details"/details toggles).

`Term` candidates: **`digest`** (Next.js's opaque error hash — define inline), **`unstable_retry`** (only a `Term` if the contrast with `reset` isn't fully carried in prose; prefer prose since the *why* matters).

Reasoning: this seam closes the loop (it catches #1 and #3). The `notFound`/`redirect` carve-out is the highest-frequency confusion and belongs exactly here.

---

### The `code` channel ties the six seams together

A short integrative section *after* the six walks — the thread that runs through all of them. Every error returned through any seam carries a stable **`code`** (one of the canonical seven: `validation | conflict | not_found | unauthorized | forbidden | rate_limited | internal`) — or, for the route/webhook seams, the RFC 9457 `type`. That `code` is the **contract between layers**: the action wrapper, the route wrapper, the webhook receiver, and the error boundary all reach into the *same enumerated set*. The payoff (and the reason it's worth a section): the analytics layer groups error events by `code`, so a single seam that invents a free-form `code: 'something_failed'` **fragments the dashboard** — the six seams only sum to one coherent error picture if they share the enumeration. Restate the lesson-2 separation once: `code` is the machine identifier (analytics group on it), `userMessage` is the human string (render it) — never one as the other. Name the consumers once, no detail: analytics (PostHog, behind the consent gate — Chapter 081/093) groups on `code`; this lesson just establishes that the code is the shared spine.

Reasoning: without this, "six seams" reads as six disconnected checklists. The shared `code` enumeration is what makes them *one* surface — and it's the natural bridge to the closing rule.

`Term` candidates: none new (`code`/`userMessage` defined in lesson 2).

---

### Every error path is one of these six

The closing rule and the lesson's durable takeaway. State it directly: **a new feature's error paths must fit one of the six shapes** — Server Action / route handler / page check / webhook receiver / rate limiter / page boundary. When a genuinely new shape appears (a hand-rolled internal API client with raw `fetch`, a custom-protocol receiver), the senior move is to **add a seventh seam to the catalog *on purpose*** — with its own wrapper and its own two commitments documented — never to let it drift in as an un-audited path. The seam catalog **is** the architectural error surface; growing it is a deliberate call.

Reinforce the two watch-outs that protect the catalog (inline, in this section — they qualify *this* rule):
- A seam "almost like `authedAction` but with one extra parameter" must **extend** the wrapper, never **fork** it — a parallel wrapper drifts and the grep for the original never finds the copy, so "one place to lint" silently becomes two.
- A page check inside a **Client Component** bypasses the Server Component perimeter — authorization belongs on the server seam, not the client.
- `console.log(error)` lines leak into production branches — use the structured logger's `debug` level (named once; full logging discipline is Chapter 092).

**Capstone exercise — structured recall of the six.**
The lesson's main assessment. Two-stage:

1. A **`Buckets`** classification drill (`twoCol`) to test recognition fast: present ~10–12 chips, each a concrete error scenario or code fragment ("a `'use server'` action that skips the wrapper", "a 429 body that says 'your email is rate-limited'", "JSON-parsing the webhook body before HMAC compare", "an `error.tsx` rendering `{error.message}`", "`requireOrgUser()` throwing on a dead session", "a direct `limiter.limit()` call in a handler", "cross-tenant `/invoices/[id]` returning 403"). The buckets are the **two commitments**: "Fail-closed violation" vs "Message-split / leak violation" (a couple of chips that are *correct* code can go in a "Correctly handled" bucket if a third bucket reads better — author's call; two-bucket is cleaner). Goal: the student sorts real findings by which rule they break, which is exactly the audit judgment. Grading: chip→bucket match.

2. The **structured-recall capstone** (the chapter-outline's "six paragraphs" deliverable, adapted to a gradeable component). Use a **`TextAnswer`** (AI-graded) prompting the student to write, for **one assigned seam**, the four facts: the file(s)/wrapper that owns it, where fail-closed lands, where message-split lands, and the grep pattern to catch a bypass. Grade on **accuracy of seam location and rule landing, not prose** (state this in the rubric `kernel`). Keep it to one seam, not six — six free-text answers is too heavy for an inline exercise and `TextAnswer` is explicitly a last resort; one assigned seam exercises the recall without overloading. Alternatively, if `TextAnswer` feels too open, fall back to a **`Matching`** drill (seam ↔ "where fail-closed lands" and seam ↔ "grep pattern") which is gradeable deterministically and still tests the map — note this fallback for the build agent and let it pick based on what reads best.

Reasoning: `Buckets` tests the fast "which rule does this break" reflex; the recall capstone tests whether the student actually internalized the *map* (the chapter's stated deliverable). Both are recognition/recall, appropriate for a synthesis lesson with no new syntax.

**Forward references (one line each, end of section or woven in):** Chapter 081 walks the *security baseline* against these same seams (headers, secrets, GDPR, dep hygiene); Chapter 082 is the project that runs the full audit (error discipline + security baseline) against a seeded codebase with known findings; Chapter 092 wires Sentry and the structured logger that consume the operator side; Chapter 097 (CI) wires the lint rules that catch the seam-bypass greps at PR time. Name each once, no detail.

---

### External resources (optional `ExternalResource` cards)

- Next.js error-handling reference (the `error.tsx` / error-boundary page) — the framework source for the boundary, `digest`, and the `unstable_retry` prop.
- RFC 9457 (Problem Details for HTTP APIs) — the spec behind the route/webhook seam's error body.

Keep to at most these two; this is a synthesis lesson, not a research springboard.

---

## Scope

**This lesson does NOT cover (reserved for other lessons):**

- **Teaching the two rules.** Fail-closed (lesson 1) and the user/operator message split (lesson 2) are *installed*; this lesson only *locates* them. Restate each in one sentence as a callback; do not re-derive.
- **The wrappers' internals.** `authedAction`, `authedRoute`, `mapError`, `error.tsx`, `safeLimit` were shown (paraphrased) in lessons 1–2. Reference their shapes; show only tiny seam-specific fragments. Do not re-print full bodies.
- **Sentry SDK setup** (`beforeSend`, breadcrumbs, releases, source maps) and **structured-log wiring** (pino config, `requestId` via AsyncLocalStorage, Vercel Log Drains) — Chapter 092. Named once as "where the operator side is consumed."
- **The security baseline audit** (CSP/HSTS headers, secrets, open-redirect, GDPR/consent, dependency hygiene, audit-log append-only enforcement) — Chapter 081. This lesson is *error discipline* only.
- **The full audit project** against a seeded codebase with planted findings — Chapter 082. This lesson produces the *mental map* that project consumes; it is not itself the project (no `Checklist`-driven brief).
- **ESLint rules** that catch the seam-bypass patterns at PR time — Chapter 097. The lesson teaches the **grep** patterns (manual audit); the automated lint comes later.
- **i18n of `userMessage`** — Chapter 084. The strings are authored for humans here; translation is out of scope.
- **Webhook wiring at depth** (the full Stripe/Resend receiver build, `processed_events` schema, Svix setup) — the webhooks chapter (Unit covering 063). This lesson *audits* the receiver against the fixed contract; it does not build it.
- **Rate-limiting wiring** (Upstash setup, dual-key, sliding windows) — Chapter 074. This lesson names `safeLimit` as the fail-open carve-out seam; it does not re-teach the limiter.
- **Tests against the wrappers** (`authedAction`, `authedRoute`, the receiver, the mapper) — Chapter 088.

**Prerequisites to redefine *briefly* (one line, in-flow, not a section):**

- **Fail closed** / **two messages** — the two named rules; one-sentence callback each.
- The canonical **`Result`** shape and the seven **`ErrorCode`** values (`validation | conflict | not_found | unauthorized | forbidden | rate_limited | internal`) — the shared spine; list once in the `code`-channel section.
- **RFC 9457 Problem Details**, **`digest`**, **`proxy.ts`** two-ring gate, **constant-time HMAC + `processed_events` dedup** — each gets a one-line inline reminder at the seam where it lands, not a re-teach.

**Canonical contracts (ground truth — do not invent variants):**
The continuity notes for lessons 1–2 fix these; align exactly:
- `authedAction(role, schema, fn)` → `(formData) => Promise<Result<T>>`, `ctx = { user, orgId, role, db }`. Codes `'validation'` / `'forbidden'` / `'unauthorized'` / `'internal'`. `requireOrgUser()` returns `{ user, orgId, role }` and **throws** on failure.
- `mapError(error): Result<never>` in `lib/error-mapping.ts`; uses `z.flattenError(...).fieldErrors` (not `treeifyError`), `isUniqueViolation`/`isForeignKeyViolation` helpers.
- Route side: `problem()` → `{ type, title, status, detail, fieldErrors? }` (omits `instance`); `problemFrom(result.error)` maps a `Result` error to the matching HTTP status.
- `error.tsx`: `'use client'`, `unstable_retry` prop (Next.js 16.2+, **not** `reset`), Sentry capture in `useEffect`, exposes `error.digest`, never `error.message`.
- Rate limit: `safeLimit(limiter, key)` in `lib/rate-limit.ts` → fail-open on Redis-auth (`{ success: true }` + error log), fail-closed on quota; `rateLimited(...)` → `err('rate_limited', 'Too many attempts. Please try again later.')`, `rateLimitedResponse(result)` → 429.
- Status table (routes/webhooks): 400 malformed, 401 no identity / bad signature, 403 forbidden, 404 not-found / cross-tenant, 409 conflict, 422 validation, 429 rate-limited, 5xx server bug.
