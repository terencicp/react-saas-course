# Two audiences, two messages

- **Title:** Two audiences, two messages
- **Sidebar label:** Two messages

---

## Lesson framing

Second of two discipline lessons in Chapter 080 (an audit pass, not new code). Lesson 1 installed **fail-closed**. This lesson installs the chapter's second load-bearing rule: **every error is two artifacts** — a sanitized `userMessage` the human reads, and a fully-instrumented operator record (cause chain + ctx + redacted input) the on-call engineer reads — and the two **diverge at the wrapper / boundary, never at the UI.**

Pedagogical conclusions that apply lesson-wide:

- **Lead with the concrete leak, not the rule.** The hook is a single Postgres error string (`duplicate key value violates unique constraint "invoices_org_id_slug_key"`) reaching a customer's form. That one image carries the whole lesson: the user can't act on it, it names an internal table + column, it admits another tenant owns the slug. Every abstract rule in the lesson cashes back out to "would this have leaked that string?"
- **The mental model to leave with:** *one failure, two readers.* The user wants a sentence they can act on; the operator wants everything. They are different products built from the same `Error`. The wrapper is a fork in the road — `Error` in, `userMessage` out one branch, structured event out the other. Drill this with the side-by-side reference shape (one DB failure → operator log line vs user string) repeated whenever a new seam appears.
- **The senior pain this relieves:** beginners write one error string and show it to everyone. In dev that feels fine (`error.message` in the UI is convenient). It ships as a production leak — internal IDs, stack traces, constraint names, cross-tenant facts, third-party error text. The senior reflex is the **read-aloud test**: if a support rep couldn't read the string aloud to a customer without translating or leaking, it isn't user-shaped.
- **Where students struggle the first time, address each head-on:** (1) they conflate `code` (machine, stable, branched-on, analytics-grouped) with `userMessage` (human, displayed, translatable) — separate them early and keep them separate. (2) They think `error.tsx` is where they "format the error for the user" — it isn't; Next.js already redacted `error.message` in production and handed them a `digest`; the boundary renders product copy and never reads `error.message`. (3) They think a richer log is a security risk — invert it: the operator side *should* be rich (orgId, slug, userId, the cause chain); the discipline is only on the user side and on what the log is forbidden to carry (passwords, tokens, cookies).
- **Frame in production stakes throughout.** This is the difference between a clean incident review (one `digest`, one structured event, full context) and a customer screenshotting your DB schema into a support ticket. Name the audiences as people: the user on the form, the on-call engineer reading Sentry at 3am, the support rep on the phone, the auditor.
- **This is an audit/naming lesson, not a build lesson.** Every primitive already exists in the codebase (`Result`/`err` from ch043, `authedAction` from ch057, `problem()` from ch057 L3, domain error classes + `ensureError` + the cause-chain walker from ch008 L2, `error.tsx`/`global-error.tsx` from ch031, `rateLimited`/`rateLimitedResponse` from ch074 L3). The lesson reads them through the two-message lens and names the **one place each split lives**. SDK wiring (Sentry `beforeSend`, pino redaction config) is ch092 — named once as "where the operator side is consumed," never built here.
- **Visuals carry the load.** One diagram is the spine: the fork-at-the-wrapper figure, reused mentally at every seam. Code is read, not written — students don't author wrappers here; they read the canonical catch block and the mapping table. Two recall exercises (a `Buckets` sort of leak-vs-safe, an MCQ on the read-aloud test) verify the discipline transferred.
- **Cognitive-load staging:** (1) the two audiences as people → (2) the user side: allowed vs forbidden, the read-aloud test → (3) the operator side: rich, captured once → (4) the fork: where the split physically lives → (5) the mapping table that enforces it → (6) the same split adapted to routes / pages / webhooks → (7) the two cross-cutting product rules (404-over-403, no-inner-exception-in-user-message). Don't introduce the mapping table before the student feels the two audiences as distinct.

---

## Lesson sections

### A constraint name in a customer's face

**Role:** Introduction. Warm, brief, concrete. Open on the leak.

- Stage the scene: a Server Action mutates a row, Postgres raises `duplicate key value violates unique constraint "invoices_org_id_slug_key"`, the catch block has it, the form renders next. Show the bad outcome: that raw string in the form. Name three things wrong with it in one beat — the user can't act on it, it names an internal table+column, it leaks that *another org already took that slug*.
- State the lesson's job: every error has **two audiences** downstream — the **user** (needs a sentence they can act on) and the **operator** (needs everything). Install the rule in one line: *every error is two artifacts, and they diverge at the wrapper, never at the UI.*
- Connect to what they know: ch043's `Result.err.userMessage` already carved out "the human string"; ch008 L2's catch-and-rewrap already put `cause` on the operator chain. This lesson names the discipline those primitives were quietly serving and makes it a rule every seam audits against.
- Preview the payoff: by the end they can look at any error string and answer "is this safe to read aloud at a support call?" and know where in the codebase the split is enforced.
- Keep it to ~5 sentences of prose plus the one bad-outcome code line. Use a plain `Code` block (a single fenced `ts` line of the raw error reaching the UI) — the visceral image, no annotation needed yet.

`Term` candidates here: **operator** (the on-call engineer / support rep / auditor who reads logs and Sentry, as opposed to the end user).

---

### The user reads a sentence; the operator reads everything

**Role:** Name the two audiences precisely, as people, before any mechanism. This is the conceptual core; everything downstream references it.

- **The user.** The human reading the rendered string in the form or the error page. They want one plain sentence, in product terms, that names what happened and what to try. They cannot act on a constraint name, a stack frame, an internal ID, or `"an error occurred (code: 0x4a)"`. (i18n of these strings is a later unit — named once; the principle is identical: the string is still authored for a human, just translated.)
- **The operator.** The engineer reading Sentry, the structured log, the audit trail — and the support rep, and the auditor. They want the original error, the stack, the **cause chain** (walked with ch008 L2's cycle-guarded loop), `action` name, `userId`, `orgId`, `role`, the **parsed** input (Zod-cleaned, never raw `formData`), a `requestId` (correlation ID — ch092 owns the discipline; named here as the join key), and the timestamp.
- The failure mode the rule prevents, named once: **conflating the two audiences** — showing the operator's artifact to the user (the leak) or the user's artifact to the operator (a useless log that says "Something went wrong" with no context).
- **Visual — the fork diagram.** This is the lesson's spine figure; describe it for the diagram agent in full.
  - **Engine/shape:** a small left-to-right flow. Top pick **Mermaid `flowchart LR`** (decision/flow shape, AI-authorable, horizontal — fits the short-viewport constraint). Wrap in `<Figure>` with a caption like *"One Error, two artifacts, forked at the wrapper."*
  - **Nodes:** `Error (thrown / caught)` → a diamond/fork labeled **the wrapper's catch** → two branches. Upper branch → `userMessage` → `User (form / error page)`, tinted to read as "sanitized / safe". Lower branch → `operator record { cause chain, ctx, redacted input, requestId }` → `Sentry · structured log · audit`, tinted "rich / internal".
  - **Pedagogical goal:** burn in that the fork is a *place in the code* (the wrapper), not a habit applied at the UI, and that the two branches carry deliberately different payloads. Keep it ≤ ~6 nodes; cap height well under the 800px ceiling. The student should be able to recall this picture at every later seam ("where's the fork here?").
- Close with the durable one-liner to reuse chapter-wide: **one failure, two readers.**

`Term` candidates: **cause chain** (the `Error.cause` linked list of wrapped errors, walked operator-side), **correlation ID / `requestId`** (the per-request id that joins a user-quoted reference to the full operator event — defined here, wired in ch092).

---

### What the user message may say — the read-aloud test

**Role:** Make the user side concrete and testable. The read-aloud test is the senior heuristic this section installs.

- **Allowed.** A short, plain sentence in product terms. Give the canonical four:
  - *"That slug is already taken."*
  - *"You don't have access to this organization."*
  - *"This invoice is no longer in draft and can't be edited."*
  - *"Something went wrong. Please try again or contact support."* (the fallback for genuinely unexpected failures the system can't disambiguate).
- **The read-aloud test**, stated as the reflex: the user message is a string the support team would read aloud on a call. If the rep would have to translate it ("the constraint name means…") or would leak something by reading it, it isn't user-shaped. This is the section's takeaway sentence.
- **Forbidden — one canonical leak + its safe equivalent for each class.** Present as a tight before/after table or, better, a **`Buckets` exercise** (described below) so the student does the sorting. The classes:
  - Internal IDs → *"Invoice 7a9c-… could not be created"* vs *"We couldn't create that invoice."*
  - Stack traces / any source reference → never.
  - DB error codes → *"Error 23505"* / *"constraint invoices_org_id_slug_key"* vs *"That value is already taken."*
  - Third-party error strings → *"Stripe API: webhook signature invalid"* vs *"Payment couldn't be processed."*
  - Cross-tenant facts → *"Another organization already owns this slug"* vs *"That slug is already taken."* (drop the *who*).
  - Raw input echoed back → *"'<script>…' is invalid"* (reflects the attack) vs a field error that names the field, not the value: *"That URL isn't valid."*
  - Environment names → *"staging server returned 500"* vs the generic fallback.
  - Secrets / tokens / session IDs → never (obvious, said once).
- **Exercise — `Buckets`, two columns, `twoCol`.** Buckets: **"Safe to show the user"** vs **"Operator-only — leaks if shown."** Items (chips): the bad strings and their safe rewrites mixed and shuffled — e.g. `That slug is already taken.`, `duplicate key violates constraint "invoices_org_id_slug_key"`, `You don't have access to this organization.`, `Stripe API: webhook signature invalid`, `Error 23505`, `Something went wrong. Please try again.`, `Another organization already owns this slug`, `User usr_3f… lacks role admin`. Grading is built in (chip turns green/red on Check). Goal: active recall of the boundary. `instructions`: "Sort each string by whether it's safe to render in the user's form."
- Code here is prose-embedded inline strings, no heavy component — the `Buckets` chips *are* the examples.

---

### What the operator record carries — captured once, in the catch

**Role:** The operator side. Invert the beginner instinct: this artifact *should* be rich; richness is the goal, not a risk.

- **The shape.** A structured event the logger / Sentry / audit log each consume the relevant pieces of. Enumerate the fields plainly: `error.name`, `error.message`, the **cause chain** walked (ch008 L2's loop), the stack; `action`; `userId`, `orgId`, `role` from `ctx`; the **parsed** input (post-`safeParse`, never raw); `requestId`; timestamp; route/referrer if the framework surfaces it.
- **The senior reach: capture once, in the wrapper's catch, before the user message diverges.** The structured event is the single source of truth the operator reads. Capturing at each call site fragments the surface (different fields, different shapes) — capture in the one place the fork lives.
- **What the operator record never carries** — the *only* discipline on the operator side, so don't overstate it:
  - Passwords (the action's input schema means the wrapper logs the *parsed* object; for a sign-in / password-change action, log only the action name + userId, never the input — the parsed object still holds the password). 
  - Session cookies / tokens.
  - The user's full PII when the action doesn't need it.
  - A third party's API key.
- Name the structural enforcement, **not built here**: a single redactor strips known sensitive keys (`password`, `token`, `secret`, `apiKey`, `authorization`, `cookie`, `set-cookie`, plus the app's own — `paymentMethodId`, `webhookSecret`) from every operator-side artifact. The redaction list lives in **one** place (pino's redaction config + Sentry's `beforeSend`), never at call sites. Forward-reference ch092 for the wiring; the *rule* (one redaction list, structural not manual) lands here. Cross-link the Logging convention (redaction in config, not call sites).
- **Visual — the reference shape, side by side.** A two-pane comparison of *the same incident*: the operator log line vs the user string. Use **`CodeVariants`** (two variants, this is a before/after-style A/B of the same event).
  - Variant **"Operator log"** (`ts` or a JSON-ish fenced block): a structured line carrying everything — e.g. `logger.error({ action: 'createInvoice', orgId, slug: 'budget-2026', userId, code: 'conflict', err }, 'insert into invoices failed: duplicate key on invoices_org_id_slug_key')`. Prose first sentence: *"Operator-honest — names the table, the tenant, the value, the cause."*
  - Variant **"User sees"**: `err('conflict', 'That slug is already taken.')`. Prose: *"User-safe — one sentence, no IDs, no tenant, no constraint name."*
  - Pedagogical goal: the two artifacts from one failure, literally next to each other. This is the chapter's reference image for "operator-honest, user-opaque." Keep each ≤ a few lines; rely on `maxLines` default.
- Durable one-liner: **operator-honest, user-opaque.**

`Term` candidate: **redactor** (the single config that strips sensitive keys before any operator-side artifact is written).

---

### Where the split lives: the wrapper, not the UI

**Role:** The structural heart — name the three seams where the split physically lands, and read the canonical catch block. This is the "one place to lint" payoff for the message split (mirrors lesson 1's fail-closed "one place to lint").

- The three seams where the fork lands: `authedAction`'s catch, `authedRoute`'s catch, and the page's `error.tsx`. Each does the **same two moves**: (1) capture the operator record (Sentry + structured log + audit-log entry where the action's domain wants one), then (2) map to the user-visible artifact (`Result.userMessage`, the route's Problem Details body, or the error page's generic copy). The student sees the split as a **property of the wrapper**, not a discipline re-applied at every call site.
- **Read the canonical `authedAction` catch — `AnnotatedCode`.** The wrapper already exists (ch057 L2); read it through the two-message lens. The continuity-canonical signature: `authedAction(role: Role, schema, fn)` → `(formData) => Promise<Result<TOut>>`, `ctx = { user, orgId, role, db }`. Show a *paraphrased/trimmed* catch block (flag it as illustrative, matching ch057's "shape not literal code" note) and step through it:
  - Step 1 `{...}` — the `try` wraps `fn(input, ctx)`; the happy path returns its `Result` as-is.
  - Step 2 highlight the `catch (e)` + `const error = ensureError(e)` — narrow `unknown` once (ch008 L2's normalizer), `catch (e)` not `e: any`.
  - Step 3 highlight the capture call — `logger.error({ action, userId, orgId, role, input: redacted, err: error })` and (forward-ref) `Sentry.captureException(error)`. *This is the operator branch — rich, captured once.*
  - Step 4 highlight the map-and-return — `return mapError(error)` producing `err('internal', 'Something went wrong. Please try again.')` for the unmatched case. *This is the user branch — sanitized.*
  - Step 5 highlight that **nothing leaks across**: `error.message` never reaches the returned `userMessage`. Tie to the rule.
  - Use `color="blue"` for structure steps, `color="orange"` for the operator-capture step, `color="green"` for the user-return step — so the two branches are visually distinct, echoing the fork diagram's tint.
- Reaffirm: the body of a wrapped action is just the work; the split is entirely in the wrapper. A Server Action that doesn't go through `authedAction` both skips fail-closed (L1) *and* skips the message split — one more reason the "trust the wrapper, don't fork it" rule from L1 holds.

`CodeTooltips` is overkill here; `AnnotatedCode` steps carry the explanation.

---

### One mapping table, every error class

**Role:** The mechanism that *enforces* the split for known error classes — the single place a new error class lands. This is the senior's "one place to lint" for messages.

- Motivate: without a central map, every action invents its own user string for a `ZodError` or a `23505`, and they drift. A small dispatch in `lib/error-mapping.ts` (sibling to `lib/result.ts`, `lib/errors.ts`) is the single source of truth: error in → `{ code, userMessage, fieldErrors? }` out.
- **The mapping table — show it as `Code` (a compact `ts` block), then walk the rows in prose.** Rows (align codes to the **canonical** `ErrorCode` set from ch043: `validation | conflict | not_found | unauthorized | forbidden | rate_limited | internal`):
  - `ZodError` → `err('validation', 'Check the highlighted fields.', z.flattenError(e).fieldErrors)` — note `flattenError` (the project's canonical projection, ch043 L3), not `treeifyError`.
  - Postgres unique violation (`23505`, detected via the `isUniqueViolation` helper that reads `.cause`, ch043 L3 — don't re-implement) → `err('conflict', 'That value is already taken.')`; the action layer overrides per-feature (*"That slug is already taken."*).
  - Postgres FK violation (`23503`) → `err('conflict', 'A related record is missing.')`.
  - The app's own domain error classes (ch008 L2: `extends Error`, `readonly name = '…' as const`, e.g. `InvoiceNotInDraftError`) → their tailored user message + matching `code`, **no operator detail in the message**.
  - Unmatched fallback → `err('internal', 'Something went wrong. Please try again.')`.
- The rule the mapper enforces: **every new error class lands here once; every wrapper calls into it.** The mapper is where the split is guaranteed, so a leak can't sneak in per-action.
- **`code` vs `userMessage`, restated as a hard separation.** `code` is the stable machine identifier (one of the canonical seven); `userMessage` is the human string. They are independent: analytics groups on `code`, the UI renders `userMessage`. Two anti-patterns, named: never render the `code` as the message (*"Error: conflict"*); never group analytics on the `userMessage` (translated strings fragment the grouping). 
  - **Tiny check — `MultipleChoice`.** One question: "Which belongs in `code` and which in `userMessage`?" or "A teammate groups the error dashboard by `userMessage`. What breaks once you ship French?" — single-correct, fast, verifies the separation landed. (Two-correct variants auto-switch to multi-select if you want "select every leak.")
- Note for the writer: this mapping file is *named and shown* but the lesson does not exhaustively build it — it's the audit artifact, consistent with the chapter's "name, don't build" posture. Show enough rows to make the pattern obvious.

---

### The same split at the other seams: routes, pages, webhooks

**Role:** Generalize. The split is universal; only the *artifact* changes per seam. Keep this as one section with short subsections so the student sees "every seam has a user and an operator" without four separate deep dives (that's lesson 3's job — here it's the message-split angle only).

#### Route handlers — RFC 9457 Problem Details

- The route twin (`authedRoute`, ch057 L3) writes a `Response`, not a `Result`. The split lands at the **Problem Details** body. Canonical project shape from the `problem()` helper (`@/lib/http/problem`): `{ type, title, status, detail, fieldErrors? }`. (Mention RFC 9457 also defines `instance`; the project's helper omits it — align to the helper, note the spec.)
  - `title` is operator-honest but user-safe (*"Conflict"*); `detail` is the user-visible string (*"That slug is already taken."*); `fieldErrors` carries the field errors (same `Record<string, string[]>` `flattenError` produces).
  - The operator log still captures the original (route + method + headers **minus auth/cookie** + parsed input + ctx + cause chain).
- The symmetry line: **actions return `Result`, routes return Problem Details — both are forms of the same split.** `problemFrom(result.error)` (ch057 L3) maps a `Result` error to the matching status, so one business fn feeds both doors and the split lands at each.

#### Pages — `error.tsx`, `global-error.tsx`, and the `digest`

- The boundary the framework owns (ch031 L3/L4). **The key correction to teach as the senior anchor:** in production builds Next.js **already** redacts `error.message` and hands the client a `digest` (a stable hash). The boundary's job is **not** to format the error for the user — it renders product copy and **never reads `error.message`.**
- What `error.tsx` may expose to the user: generic copy (*"Something went wrong. We're looking into it."*), a **retry** affordance (the framework prop is **`unstable_retry`** per ch031 L3/L4 — *not* `reset`; this is the corrected name), a "Go to dashboard" recovery link, and at most the framework's **`digest`** as a quotable reference (*"Reference: 4b1c2…"*). What it may **not** expose: the message, the stack, internal IDs, the action name, the tenant.
  - One-line rationale for the prop name (Next.js 16.2): `unstable_retry()` runs `router.refresh()` + `reset()` inside a `startTransition`, so it re-fetches data and recovers from **Server Component / RSC-phase** errors; bare `reset()` only clears client render state and can't recover a data-fetch failure. The writer should give this *why*, not just assert the name.
- **The `digest` is the right kind of operator detail the user may see** — opaque, non-leaky, joinable. The user quotes it to support; the operator looks it up in Sentry / the structured log to find the full event. Frame it as the user-facing join key, the only internal reference allowed through.
- The operator side at this boundary: `error.tsx` is a `'use client'` component (ch031 L3); the capture happens in a `useEffect` — `Sentry.captureException(error)` (Sentry's React integration auto-captures, but the explicit call is the senior anchor, and it's the canonical home for `global-error.tsx` per ch031 L4). `global-error.tsx` wraps the whole shell — *assume nothing above you survived* (ch031 L4's takeaway); capture is the same `useEffect` report.
- **Senior anchor, stated once:** author the boundary as if the framework *didn't* redact, so dev-mode habits (`error.message` in JSX "just for dev") never ship as a prod leak. The platform stripping is a backstop, not the design.
- **Visual — the canonical `error.tsx` shape.** A `Code` block (`tsx`) of the minimal boundary: `'use client'`, `useEffect(() => Sentry.captureException(error), [error])`, a headline, a `<button onClick={() => unstable_retry()}>Try again</button>`, a small `Reference: {error.digest}` line. Annotate inline only if needed; a plain block with the right shape is enough. Optionally a tiny **`Screenshot`**-framed mock of the rendered branded error page to make "what the user sees" concrete — optional, only if it doesn't bloat.

#### Webhooks — the provider is the "user"

- The receiver's external caller (Stripe, Resend) is the **"user"** of that seam; the on-call engineer is still the operator. Same split: the response body to the provider is minimal Problem Details (`{ type, title, status }`), and the structured log carries the full event (the parsed `Stripe-Signature`, the timestamp delta, the event id, the type, the resolved tenant, the cause chain on throws).
- Status-by-failure-class (the message-split angle, not the full webhook flow — that's L3 / ch063): 400 malformed, 401 bad signature, 409 dedup duplicate, 200 processed, 500 unexpected (provider retries). The point: **every seam has a "user" (some external caller) and an "operator," and every seam splits.**
- Rate-limit rejections fit here too: ch074 L3's `rateLimited(result, gate, key)` returns `err('rate_limited', 'Too many attempts. Please try again later.')` — **identical opaque message regardless of which gate (IP or email) tripped**, so it never leaks "your email is being limited"; the structured log (`rate_limit_rejected`, gate, key, remaining, reset) carries the operator's full diagnosis. The route twin is `rateLimitedResponse(result)` (a real 429). Name this as a clean instance of the split, link to ch074.

---

### Two product rules the split forces

**Role:** Two cross-cutting rules that fall out of the two-message discipline and are senior-distinguishing. Keep tight — these are the "watch-outs that teach a concept," so they live with the concept, not in a dumping-ground section.

- **404 over 403 on cross-tenant access (the user-facing adaptation).** From ch057 L3 / ch046 L3: a request to `/invoices/[id]` for an invoice that exists but belongs to another tenant returns **404, not 403** — 403 admits the resource exists, which is itself a leak (the attacker learns the ID is valid). The split:
  - **User side:** a generic *"Not found."* — identical to a truly-missing resource.
  - **Operator side:** a structured event with a domain marker (e.g. `cross_tenant_attempt`), the user, the org, the requested ID — real intel for security review (ch081). 
  - The asymmetry line: **the user sees a generic 404; the operator sees the truth.** This is the message-split rule adapting the user artifact so it doesn't leak existence; fail-closed (L1) still applies underneath.
- **No inner exception in the user message.** When an action catches a downstream error and rewraps it (`new InvoiceCreationError('…', { cause: dbError })`, ch008 L2), the `userMessage` is authored at the **outer** layer, never derived from the inner cause's message. The cause chain is the operator's; the user sees the outer class's user-shaped string. The catch-and-rewrap pattern from ch008 L2 *implicitly* enforces the split — `cause` → operator chain, the new error's mapped `userMessage` → user — **the two never meet.** Name the watch-out: pasting `cause.message` into the rendered string defeats the wrap and re-leaks whatever the inner error said.
- **Field errors are still user messages, not an exception.** Zod's `fieldErrors` (from `safeParse` → `flattenError`) are user-visible strings (*"Email is invalid"*, *"Must be at least 8 characters"*). They flow through the **same** `userMessage` channel — they don't bypass the split. Senior reach: the Zod schema authors them with user-shaped copy (ch042 owns the `error` option); override the default where it reads engineer-ish (*"Expected string, got number"* → *"Must be a number"*). Also: render the field-error **strings** only — never dump Zod's raw issue tree into the DOM (it leaks schema structure).

---

### Recap: one failure, two readers

**Role:** Short consolidation + forward hook to lesson 3. Not a new-content section.

- Restate the two rules now both named in the chapter: **fail closed** (L1) and **two messages** (this lesson). The pair is the chapter's vocabulary.
- The reusable test to carry forward: for any error, *(1) does it fail closed, and (2) is what the user sees safe to read aloud at a support call?*
- Forward hook: lesson 3 walks all six seams end-to-end and points at exactly where each commitment lands and what to grep for to catch a bypass — the codebase audit the chapter exists for.
- Optional `ExternalResource` LinkCards (1–2 max, only if genuinely additive): the RFC 9457 spec page (Problem Details), and the Next.js `error.tsx` / error-handling docs. Do not pad.

---

## Scope

**Prerequisites — redefine in one line each, do not re-teach:**
- `Result<T>` / `ok` / `err(code, userMessage, fieldErrors?)` at `lib/result.ts`, with the canonical `ErrorCode` = `validation | conflict | not_found | unauthorized | forbidden | rate_limited | internal` (ch043 L3). Use this set verbatim — **not** the chapter-outline's `invalid_input` / `plan_limit` (those are non-canonical; `plan_limit` is only a sanctioned domain extension, not a core code).
- `authedAction(role, schema, fn)` + `ctx = { user, orgId, role, db }` (ch057 L2); `authedRoute(role, schema, fn)` + `problem()` / `problemFrom()` at `@/lib/http/problem`, Problem Details shape `{ type, title, status, detail, fieldErrors? }` (ch057 L3).
- Domain error classes (`extends Error`, `readonly name = '…' as const`, `Error.cause`, `ensureError`, the cycle-guarded cause-chain walker) at `lib/errors.ts` (ch008 L2).
- `error.tsx` / `global-error.tsx`: `'use client'`, retry prop is **`unstable_retry`** (not `reset`), `digest`, `useEffect`-reports-to-monitoring (ch031 L3/L4).
- `rateLimited` / `rateLimitedResponse` / the opaque 429 message (ch074 L3).
- `z.flattenError(parsed.error).fieldErrors` as the canonical field-error projection (ch043 L3).

**This lesson does NOT cover (reserved for later):**
- The fail-closed rule itself — that's **lesson 1** (this lesson assumes it and only adapts the user-facing artifact where the two interact, e.g. 404-over-403).
- The seam-by-seam audit walk + the grep-for-bypass audit steps + the "six paragraphs" deliverable — **lesson 3**. This lesson touches each seam *only* for the message-split angle; it does not enumerate fail-closed landings or audit procedures.
- Sentry SDK setup, `beforeSend` config, breadcrumbs, releases, source maps — **ch092 L1**. Named once as "where the operator side is consumed."
- pino setup, the fixed JSON key set, `requestId` via AsyncLocalStorage, the redaction *config*, Vercel Drains — **ch092 L2/L3/L4**. The *rule* (one redaction list, structural) lands here; the wiring does not.
- The "log what you'd need at 3am" discipline — **ch092 L3**. Touched as motivation only.
- The `audit_logs` table, append-only enforcement, RLS, `logAudit` internals — **ch057 L5 / ch081 L3**. Here only the boundary fact: audit entries are *not* error logs, they ride inside the write transaction and roll back with it; a failed action shows up in Sentry/logs, not the audit log.
- i18n of user messages — **ch084** (named once: the string is still authored for a human).
- Security headers (CSP/HSTS), the consent gate and what PostHog sees — **ch081**.
- ESLint rules that catch leak/bypass patterns at PR time — **ch097**.
- Tests against the wrappers / mapper — **ch088**.

---

## Notes for downstream agents (deliberate divergences)

- **Code is read, not authored, in this lesson.** No live-coding component fits cleanly (the wrappers are server/Next-specific; `ReactCoding` is react-only and can't load this stack — see project memory). Recall is verified with `Buckets` + `MultipleChoice`, which are offline-robust. Do **not** reach for a sandbox to "let them build a wrapper" — it would re-teach ch057 and miss the point.
- **Canonical-contract reconciliations the writer must honor** (the chapter outline's looser language is superseded by the source-of-truth continuity notes): `ErrorCode` is the seven-member ch043 set; `err` is positional `err(code, userMessage, fieldErrors?)`; field errors use `flattenError` not `treeifyError`; the `error.tsx` retry prop is `unstable_retry` not `reset`; Problem Details is the project's `{ type, title, status, detail, fieldErrors? }` (helper omits `instance`); rate-limit message is the fixed opaque string via `rateLimited`.
- Keep the `authedAction` catch block **paraphrased and flagged as illustrative** (ch057 L2 shipped it trimmed; treat the *shape* as canonical, not literal source).
- The fork diagram is the one figure that earns its weight; everything else is code-read or a quick exercise. Don't over-diagram — a second large system graph would not add over the fork + the side-by-side `CodeVariants`.
