# Lesson title

- Title: Refuse by default
- Sidebar label: Refuse by default

# Lesson framing

This is the first lesson of Unit 16, the pre-launch audit pass, and it installs the chapter's load-bearing rule: **fail closed**. Every gate that controls access — authorization, tenancy, paywall, signature verify — treats an exception thrown *inside* the check as a refusal, never as an allow. This is a discipline/naming lesson, not a build-from-scratch lesson. The patterns already exist across the codebase the course has shipped (the `authedAction` wrapper from ch057, `requireOrgUser` from ch056, `safeLimit` from ch074, the webhook signature-verify from ch063). The student's job here is to learn to *see* the rule, name the failure mode it prevents, and recognize the structural shape that makes the wrong answer hard to write.

Pedagogical conclusions that shape the whole lesson:

- **Lead with the senior question, concretely.** Don't open with a definition of "fail closed." Open with a running `authedAction` calling `requireRole('admin')`, and ask: *what happens to the mutation when the membership query throws?* The student should feel the two architectures diverge before either is named. Decisions-before-syntax (pedagogical filter #1): the lesson's value is the reasoning, the code merely shows it.
- **The mental model the student must leave with: "every doubt is a deny."** A check that gates access has three outcomes — allow, deny, *check itself failed*. Fail-closed collapses the third into the second. If the check can't *prove* the request is allowed (stale read, partial read, an unexpected `null`, a code path nobody branched for, a thrown exception), the answer is no. "Prove" is the load-bearing verb; hammer it.
- **The rule is structural, not a cleanup convention.** The senior reflex is not "remember to catch and deny at every call site" — it's "the check throws on its own failure, and the *wrapper* catches in one place and converts to a refusal." The student writes neither the try/catch nor the explicit refusal; both live in the wrapper. That's the "one place to lint" architecture, and it's why fail-open requires *actively reaching past* the helper. This reframes the lesson from "a habit you maintain" to "a property of the seam."
- **Minimize cognitive load by staging.** Start with one check (`requireRole` inside `authedAction`). Get fail-open vs fail-closed crisp on that single example. *Then* generalize to the six classes of checks, the page boundary, the webhook, and the one documented exception (the rate limiter). Don't front-load the taxonomy.
- **Surface the named exception so the student doesn't over-apply.** Fail-closed is the *default* discipline, not a universal law. The auth-path rate limiter is deliberately fail-*open* (a Redis outage locking every user out is worse than the brief abuse window). Teaching the carve-out *with its reasoning* is what makes the student senior rather than dogmatic. Same for product defaults outside the security boundary (a theme preference defaulting to `'system'` is neither fail-open nor fail-closed — there's no boundary).
- **Cash in prior vocabulary, don't re-teach it.** The student already knows the `Result` shape (ch043), `Error.cause` and `unknown`-narrowing (ch008), `notFound`/`redirect` as control-flow primitives (ch029), `error.tsx` (ch031), the webhook transaction (ch063), idempotency (ch063). This lesson *connects* fail-closed to each; it redefines them in one line each, no more.
- **Code's role: read, don't write.** The student reads the canonical `authedAction` body as the reference implementation of fail-closed, and reads three or four small fail-open *anti-patterns* (the empty-catch, the boolean-returning helper, the `||` carve-out, the signature-verify that returns `false` on exception) to build a review reflex. No live-coding sandbox — this is a judgment lesson, and the third-party-import limits make a sandbox a poor fit anyway. Understanding is checked with classification (Buckets), an MCQ or two, and a short decision-funnel walker.
- **Frame in production stakes throughout.** The difference fail-closed makes is "the authz check threw and the user got the resource" vs "the check threw and the user got a 403." Name real failure modes a junior ships: the empty-catch that logs-and-continues, the paywall that fails open "for UX" during a Stripe outage and lets free-tier users hit paid endpoints. These are the moments the rule earns its keep.

Estimated student time: 45–55 minutes. This is the chapter's foundational rule; lessons 2 and 3 reference it constantly.

---

# Lesson sections

## Introduction (no header)

Warm, brief, 2–3 short paragraphs. Open Unit 16 in one sentence: the app works; now we audit the seams every junior forgets before launch. Name the lesson's single commitment — **errors fail closed** — and the one-line stakes: an exception inside an access check must mean *refuse*, not *allow*. Connect to what the student already shipped: they've been writing `requireOrgUser`, `authedAction`, signature verifies, and tenancy filters since Unit 10 — this lesson names the rule those helpers have been quietly enforcing and turns it into something the student can audit against. Preview the payoff: by the end they can look at any gate in the codebase and answer one question — *if this check throws, does the user get the resource or get refused?*

No component here; just prose. Set the "audit pass, not new code" frame explicitly so the student isn't expecting a build.

## The question every access check answers

The senior question, made concrete before anything is named. Walk one scenario in prose + a small `Code` block: an `authedAction` parses input, runs `requireRole('admin')`, then proceeds with the mutation. `requireRole` reads the session, queries the membership table, compares the role. Now ask: **what happens when the membership query throws** — a Postgres connection blip, an unexpected `null`, a TypeScript-"impossible" state the runtime hit anyway?

Present the two architectures as a fork, named here for the first time:

- **Fail-open** — the exception bubbles past the check, the action body still runs, the user's role was "unknown" and the system defaulted to "probably fine." The unauthorized user gets the resource because the system *gave up on knowing*.
- **Fail-closed** — the exception is treated as "the check did not succeed," and the request is refused. The action body never runs.

State the lesson's thesis plainly right after the fork: **fail-closed is the default for every access-shaped check in the codebase.** Keep the code minimal — a `Code` block of ~8 lines showing the action calling the check and proceeding; the point is the *question*, not the implementation (that comes later).

Pedagogical note: this section is pure decisions-before-syntax. The student should viscerally feel that "the check threw" is a third outcome that needs a decision, before the formal three-outcome model appears.

### Diagram — the three outcomes of a gate

A small **HTML+CSS figure** (wrapped in `<Figure>`) — *not* a complex graph, just a visual that makes the collapse legible. Three labeled outcome boxes for a single gate: **Allow** (green), **Deny** (red), **Check failed** (amber/grey, with examples: "DB threw", "unexpected null", "impossible state"). An arrow or visual fold shows the amber "Check failed" box collapsing *into* Deny under fail-closed. Caption: "Fail-closed collapses the unknown third outcome into a refusal — every doubt is a deny."

Pedagogical goal: anchor the core mental model spatially. This is the one image the student should remember. Keep it short and horizontal (laptop viewport constraint). Author as plain HTML/CSS per the diagrams index (color-coded segments with a callout fold).

## What "fail closed" means precisely

Now formalize. A check that gates access has exactly three legal outcomes — *allow*, *deny*, *check itself failed*. **Fail-closed is the rule that the third collapses into the second.** Restate crisply:

- The action body never runs if `requireRole` threw.
- The user sees a 403-shaped response (or generic error page) — not the resource.
- The operator sees the original error in the log/Sentry (forward-ref ch092, named once).

Define **fail-open** as the precise opposite and the bug: the exception escapes the check, the action proceeds, the unauthorized user gets the resource "because the system gave up on knowing."

Introduce the **"every doubt is a deny"** mental model here as the durable one-liner. Emphasize the verb *prove*: a check that read stale data, partial data, a `null` for a never-null column, or hit a branch the developer never wrote — all of those are "could not prove," and fail-closed reads them all as no. Tie back to `unknown` from ch008: at the catch site the binding is `unknown`, the check did not run to completion, the answer is no.

Use `Term` tooltips here for **fail-closed** and **fail-open** (short definitions, since these are the load-bearing terms students may not have a crisp prior definition for).

## The classes of checks this rule covers

Generalize from the single example to the families. Present as a short scannable list (prose with inline code, or a compact `CardGrid` if it reads cleanly — prefer prose to avoid over-decorating). For each class, one line + which chapter owns the primitive (redefine each in a clause, do not re-teach):

1. **Authorization gates** — `requireRole`, `requireOrgUser`, `authedAction`, `authedRoute`; the membership lookup and role comparison (ch056/ch057).
2. **Tenancy filters** — every query asserting `orgId = $1` via `tenantDb(orgId)` (ch056); the visibility predicate (`active()`, ch061).
3. **Paywall / entitlement checks** — plan lookup, feature-flag read, seat-count compare (billing, ch064).
4. **Signature verification** — the HMAC compare on every webhook (ch063), constant-time compare from Web Crypto (ch016).
5. **Idempotency claims** — the `INSERT ... ON CONFLICT DO NOTHING` on `processed_events` (ch063); a thrown dedup check refuses the work rather than running it twice.
6. **CSRF / origin checks** — Server Actions ship CSRF protection out of the box; named once, the rule still applies anywhere a hand-rolled check lands.

Then state the **decision question every one of them answers**, verbatim as the section's takeaway: *If this check throws, does the user get the resource or get refused?* Senior answer: always refuse.

Pedagogical note: keep this a quick map, not a deep dive into each primitive. The goal is "the rule is one rule across many shapes," not re-explaining tenancy or HMAC.

### Exercise — does it fail closed? (Buckets)

A `Buckets` classification drill, two buckets: **Fails closed (correct)** and **Fails open (bug)**. ~6 chips, each a one-line description of a check's catch behavior the student sorts. Draw chips from the failure-mode catalog so this doubles as recognition practice:

- "`requireRole` throws on a bad membership row; the wrapper catches and returns a 403" → fails closed.
- "`try { await requireRole('admin') } catch { /* log */ }` then continues to the mutation" → fails open.
- "Signature verify returns `false` on both a bad signature *and* an HMAC library exception" → fails open.
- "Feature-flag read defaults to `off` when Redis is unreachable" → fails closed.
- "Tenancy filter is `orgId === input.orgId || isSuperAdmin(user)` where `isSuperAdmin` can throw" → fails open.
- "Paywall catches the Stripe timeout and lets the request through 'to not block the user'" → fails open.

Pedagogical goal: force the student to apply the rule to catch-site shapes, not just recall the definition. This is where the review reflex starts forming. `instructions` prop: "Sort each check by what it does when something throws inside it."

## The failure modes when fail-closed slips

The heart of the review-reflex training. Walk the canonical fail-open bugs so the student recognizes each on sight. Use **`CodeVariants`** with before/after framing (or paired tabs "Bug / Fix") for the two or three that are most instructive in code; describe the rest in prose. Each gets a name, the mechanism, and the fix:

- **(a) The log-and-continue empty catch.** `try { await requireRole('admin'); } catch { /* log and continue */ }` lets the action run when the role check fails — the canonical fail-open bug. The fix: log *and* return the refusal; logging is not a substitute for denying. (Best `CodeVariants` candidate — Bug tab `del`/`ins` against Fix tab.)
- **(b) The boolean helper that swallows the throw.** A `requireRole` returning `boolean` with `false` for both "not admin" and "check threw." The action branches on `if (!isAdmin) return err(...)`, the exception already escaped, the action proceeded. Fix: the check returns the role or *throws* — never a sentinel that conflates "no" with "don't know." (Good `CodeVariants` candidate.)
- **(c) The `||` carve-out.** `orgId === input.orgId || isSuperAdmin(user)` where `isSuperAdmin` reads a misconfigured table and throws — flawed short-circuit patterns can resolve truthy on rejection. Fix: one filter, no `||` carve-outs; the super-admin path lives in a *different* code path with its own gate.
- **(d) The signature verify that returns `false` on exception.** The route handler can't distinguish "bad signature" from "library threw." Fix: throw on exception (framework treats it as 500, provider retries), return 401 only on a real mismatch.
- **(e) The paywall that fails open "for UX."** Catches the Stripe API timeout and lets the request through so as not to block the user — the fail-open default that lets free-tier users hit paid endpoints during an outage. Fix: fail-closed with an explicit cached-entitlement fallback (a deliberate served value), not a silent allow.

Add a tight watch-out callout (`Aside type="caution"`) bundling the one-liners: empty-catch silently swallows authz failures; log-and-continue is fail-open dressed as discipline; a `requireRole` returning `null` on exception is fail-open with extra steps. These qualify the concept taught in this section, so they belong here, not in a separate tips section.

Pedagogical note: name each bug memorably ("log-and-continue", "the boolean swallow", "the `||` carve-out") — named anti-patterns are what the student greps their own code for later.

## The structural shape that makes refusal the only path

The senior 2026 form, and the section that reframes fail-closed from habit to architecture. Teach the two-part shape:

1. **The check throws on its own failure** — `requireRole(role): Role` or `requireOrgUser(): { user, orgId, role }`, declared to *throw*, never to return a "we don't know" sentinel. Callers either consume the return (and thereby know the check succeeded) or are wrapped.
2. **The wrapper catches in one place and converts to refusal** — `authedAction` catches the throw in its body and maps it to the `Result` failure branch (`{ ok: false, error: { code: 'unauthorized', userMessage: '...' } }`), or the route handler maps it to a 401/403. The student writes neither the call-site try/catch nor the explicit refusal.

Read the **canonical `authedAction` body** as the reference implementation using **`AnnotatedCode`** (single block, stepped highlights, `color="blue"` default). The wrapper does, in order: parse with the schema → run `requireOrgUser` → run `roleAtLeast(role)` → call `fn(ctx, input)` → return the `Result`. Step through the fail-closed landing at each line:

- Parse failure → returns `{ ok: false, code: 'validation' }`. (Use `'validation'` — the canonical `Result` code per the code conventions; the chapter-outline's `'invalid_input'` is non-canonical, align to `'validation'`.)
- Session miss → `requireOrgUser` throws → caught by the framework's `error.tsx`.
- Role too low → returns `{ ok: false, code: 'unauthorized' }`.
- `fn` throws → caught by the wrapper, logged, returns `{ ok: false, code: 'internal' }`.
- `fn` returns `Result.err` → returned as-is.

Name **"one place to lint"** as the architectural reason: every fail-closed decision lives in this one body, so forgetting it requires actively reaching past the wrapper. Reference Architectural Principle #5 in one clause — auth wrappers are the *sanctioned* exception to "don't invent parallel routing," and that carve-out cashes in here as defense-in-depth.

Keep the wrapper code faithful to the shipped contract: `requireOrgUser()` returns `{ user, orgId, role }` (no `org` object); `Result` codes are the canonical set (`validation | conflict | not_found | unauthorized | forbidden | rate_limited | internal`). Note in the outline that the `AnnotatedCode` block may *paraphrase/elide* parts of the real wrapper for focus — flag this as deliberate so downstream agents keep the shape honest but don't bloat it.

`CodeTooltips` candidate: on the wrapper block, tooltip `roleAtLeast` and `ctx` if they'd otherwise need a prose detour.

### Where the throw and the Result both land — the same outcome

Restate the throw-vs-return split exactly where it applies here (from ch043). Throw at the framework edge for *unexpected* failures (DB down, programmer errors, the framework's `notFound`/`redirect` control-flow exceptions). Return `Result` for *expected* failures the caller branches on. Show that **fail-closed applies to both branches and they reach the same outcome**: an unexpected throw inside a check is caught by the nearest `error.tsx` (ch031) and the user sees a generic error *not the resource*; an expected refusal returns `{ ok: false, error: { code: 'unauthorized' } }`. Either way, the user does not get the resource. A tiny two-column `Figure` (HTML/CSS) or just tight prose — prefer prose unless the two-path-one-outcome idea needs the visual.

## Pages and layouts — fail-closed at the render boundary

The Server-Component / page-boundary shape. Pages and layouts call `requireOrgUser()` near the top; the helper throws on no-session / no-active-org; the framework's `error.tsx` catches the throw and renders the generic fallback. The user never gets the resource — they get the boundary.

The critical distinction to teach here (a category error juniors make): **`notFound()` and `redirect()` are *not* errors** — they are control-flow primitives the framework owns (ch029). A thrown `Error` from a layout is fail-closed (caught by `error.tsx`); a thrown `notFound()` is the framework's 404 plumbing (handled by `not-found.tsx`, *not* `error.tsx`). The fail-closed rule applies to genuine exceptions; the `notFound`/`redirect` primitives pass *through* it as framework-blessed control flow.

Watch-out (`Aside type="caution"`, inline in this section): treating `notFound()` as an error to catch is a category error — re-throw it, never swallow it in a `catch`.

Pedagogical note: this is the single most common confusion at this boundary. Make the "exception vs control-flow primitive" line bright. A small **`Buckets` or `MultipleChoice`** could check it, but keep it light — one MCQ ("which of these should `error.tsx` catch?") is enough.

## The webhook seam — fail-closed before dedup, before business logic

Apply the rule to the webhook receiver (ch063). The whole receiver is fail-closed; point at each layer with the status it returns:

- Signature verify is the gate. A throw inside HMAC compare (malformed `Stripe-Signature` header, unparseable timestamp) → **400**, refuse.
- A throw inside the dedup `INSERT ... ON CONFLICT` → **500**, refuse; the provider retries.
- A throw inside the business logic → **500**, refuse; the provider retries.

Then teach the **composition with idempotency** (ch063): fail-closed and idempotency are *paired* primitives — refuse aggressively, retry safely. The receiver throws on a transient DB error and refuses the work; the provider retries; the dedup constraint catches the duplicate; the business work runs exactly once. The student should see that fail-closed is *safe* here precisely because the retry is idempotent.

A short **`DiagramSequence`** earns its place here (it's a genuine step-by-step execution with branching outcomes): 3–4 steps walking a Stripe event through the receiver — (1) raw body + signature verify [throw → 400], (2) dedup INSERT [conflict → 200 idempotent success; throw → 500 retry], (3) business work in the transaction [throw → 500 retry], (4) success → 200. Each step caption names where fail-closed lands and which status the provider sees. Pedagogical goal: make "refuse aggressively, retry safely" concrete as a flow, and show 200-on-already-processed is a *success*, not a refusal. (Do not wrap `DiagramSequence` in `<Figure>` — it's its own card.)

## The rate limiter — the one deliberate exception

The named carve-out, taught *with* its reasoning so the student doesn't paint fail-closed as universal. From ch074: the auth-path limiter is **fail-open** because a Redis outage locking every user out of their account is worse than the brief abuse window. The policy is documented in one helper — `safeLimit(limiter, key)` — which catches the throw, logs the event (`warn`/`error` level), and returns success. (Per the security-baseline convention: fail-open on Redis-*auth*/availability errors with a logged warning; fail-closed only on actual quota exhaustion.)

Make the senior framing explicit: **fail-closed is the default discipline; fail-open is a deliberate carve-out with a written reason.** Other high-stakes limiters (admin actions, billing webhooks the customer cannot retry) may flip the default *to* fail-closed — and the policy lives in the one helper, not scattered at call sites.

`Term` tooltip candidate: **fail-open carve-out** if it helps, but likely unnecessary by this point.

Pedagogical note: this section prevents dogmatism. The student leaves understanding that the *discipline* is "have a default and justify exceptions in one place," not "always deny." This is the senior-mindset payoff of the lesson.

## What does *not* fail closed — product defaults outside the boundary

Draw the boundary so the student doesn't over-apply the rule to non-security decisions. Contrast two reads-with-defaults:

- A **feature-flag** check that defaults to `off` on a Redis miss *is* fail-closed — the feature stays disabled, which is the safe side of an access decision.
- A **theme preference** that defaults to `'system'` on a read failure is **neither** fail-open nor fail-closed — there's no security boundary; the default is just a sensible product call.

Name the boundary precisely: the rule applies to **access decisions** (who can read, who can write, what tenancy enforces). Product defaults *outside* the security boundary are a different decision and the student should not conflate them. 

Pedagogical goal: precision. A junior who's just learned fail-closed will try to apply it everywhere; the senior knows where the boundary is. This is a small but important "don't over-rotate" beat.

## Trust the wrapper, don't bypass it

The audit step that turns the rule into something actionable — and the bridge to lesson 3. The structural guarantee only holds *when the wrappers actually run*. So:

- A Server Action that doesn't go through `authedAction` is the bug.
- A route handler that doesn't go through `authedRoute` (ch057) is the bug.

Name the concrete audit moves (this is a 2026 senior reflex — grep your own surface):

- Grep for `'use server'` in files that don't import `authedAction`.
- Grep for exported `GET`/`POST`/… in `route.ts` files that don't import `authedRoute`.

Each hit is reviewed; *legitimate* exceptions are named and documented (the public sign-up route, the webhook receiver with its own signature verify), the rest are migrated. The rule is structural: when the wrappers run, fail-closed is the only path; a bypass is a hole.

Final watch-out (`Aside type="caution"`): copy-pasting `authedAction` into a "lighter" wrapper creates a parallel code path that drifts and that the audit misses — *extend* the wrapper, never fork it.

Close the lesson (1 short paragraph, no header) by stating the question the student can now answer about any seam — *if this check throws, does the user get the resource or get refused?* — and pointing forward: lesson 2 takes the *other* half of the catch site (what the user vs the operator sees), lesson 3 walks all six seams end to end. Keep it to two sentences.

### External resources (optional)

If a clean, current source exists, one or two `ExternalResource` cards: the Next.js `error.js` file-convention doc (digest behavior), and/or an OWASP "fail securely" reference for the fail-closed principle. Only include if genuinely additive; do not pad.

---

# Scope

**Prerequisites to redefine in one line each (do not re-teach):**
- `Result<T>` discriminated union and the throw-vs-return split (ch043) — recalled in "The structural shape" section.
- `requireOrgUser()` / `authedAction` / `authedRoute` wrappers (ch056/ch057) — read as canonical here, their *construction* was taught earlier.
- `Error.cause`, `unknown`-narrowing in `catch` (ch008) — referenced for the "binding is `unknown`" point only.
- `notFound()` / `redirect()` as control-flow primitives (ch029) — distinguished from errors, not re-taught.
- `error.tsx` / `global-error.tsx` boundaries (ch031) — named as the catcher; their full discipline is lesson 2's job.
- The webhook signature-verify-then-dedup transaction and idempotency (ch063) — composed with fail-closed, not re-explained.
- `tenantDb(orgId)`, visibility predicates (ch056/ch061) — named as a check class only.
- `safeLimit` and the auth-path fail-open policy (ch074) — surfaced as the carve-out; the rate-limiter *wiring* is ch074's, not this lesson's.

**Explicitly out of scope (belongs to other lessons):**
- The **user-message vs operator-message split** (sanitization, the redactor, the mapping table, RFC 9457 bodies, the `digest` as a user-facing reference, `404-over-403` for tenant leaks) — **lesson 2 of this chapter**. This lesson touches the operator side only as "the original error goes to the log"; it does not teach sanitization. Keep all message-content discipline out.
- The **seam-by-seam audit walk** with the six-paragraph deliverable — **lesson 3**. This lesson previews the audit move (grep for bypasses) but does not walk every seam.
- **Security headers** (CSP, HSTS) — ch081.
- **Rate limiting at depth** (the wiring, dual-key, sliding windows) — ch074 owns it; this lesson only names the fail-open carve-out.
- **Audit-logs schema / append-only enforcement** — ch057 introduced, ch081 revisits.
- **Cookie consent / GDPR** — ch081.
- **The audit project** against a seeded codebase — ch082.
- **Sentry capture wiring**, structured-log setup, request correlation IDs — ch092. Name Sentry/the log once as "where the operator detail goes"; do not wire it.
- **i18n of user messages** — ch084.

Keep the lesson tightly on the *fail-closed* commitment. When a topic edges toward *message content* (what the user sees, what the operator record carries, sanitization), stop — that is lesson 2.

---

# Code conventions notes

- Use the canonical `Result` code set from the code conventions: `'validation' | 'conflict' | 'not_found' | 'unauthorized' | 'forbidden' | 'rate_limited' | 'internal'`. The chapter outline's `'invalid_input'` is non-canonical — render parse failures as `code: 'validation'`. Flag this alignment so it doesn't read as an error.
- `requireOrgUser()` returns `{ user, orgId, role }` (no `org` object) — keep the wrapper code faithful.
- `Result` type + `ok()` / `err()` helpers live at `lib/result.ts`; `ensureError(e)` normalizer at `lib/errors.ts`; `safeLimit` in `lib/rate-limit.ts` — reference by these paths if a path is shown.
- Server Action five-seam shape is `parse → authorize → mutate → revalidate → return`; the wrapper lifts parse/authorize. Keep any action sketch consistent with this order.
- Throw only for impossible situations / framework-boundary-caught errors; never throw on user-input failure. The fail-closed rule explicitly extends this: an exception *inside a gate* is the framework-boundary kind, caught and converted to a refusal.
- Where any code is paraphrased/elided for teaching focus (notably the `authedAction` `AnnotatedCode` block), keep the *shape* honest to the shipped contract but trim for clarity — this is deliberate, note it inline so reviewers don't "correct" it back to a bloated literal.
- Narrow `unknown` in `catch` with `instanceof Error` / `ensureError`; never `catch (e: any)` in any shown snippet.
