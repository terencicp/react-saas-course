# Lesson outline — The 3am rule and PII exclusion

## Title

- **Title (h1):** The 3am rule and PII exclusion
- **Sidebar label:** The 3am rule and PII

## Lesson framing

This is a **decision-and-policy lesson, not a setup lesson.** All the machinery already exists: lesson 2 shipped `lib/logger.ts` (the pino singleton with a `redact: redactionConfig` slot left empty), `lib/request-context.ts` (the ALS), the two entry seams, the child-logger idiom, and level semantics. Lesson 3 fills the two holes that slot left open:

1. **What to log** — the *content* of every log call. Framed as the **3am rule**: log exactly what a remote operator paged at 3am needs to reconstruct the incident without reproducing it. This is a judgment skill, taught per-seam by worked example.
2. **What never to log** — the *content* of the `redactionConfig` denylist plus a `PII_KEYS` constant. Framed as the **regulator-at-9am** counterpart: structural redaction that keeps secrets and GDPR-class PII out of the stream by key name, set once, audited in PR — never per-call-site discipline.

The chapter's spine carries through: errors and logs are two surfaces of one incident, joined by `requestId`. This lesson decides *what the log surface carries* so that when the operator pivots from Sentry (lesson 4), the lines are useful and clean.

**The central mental model is one sentence the student should leave repeating:** *log what an operator at 3am would want; exclude what a regulator at 9am would object to.* Two audiences, two rules, one config. Everything else hangs off it.

**Cognitive-load order.** Lead with the 3am rule (positive, generative — "here's what good looks like"), because it's the more intuitive half and motivates *why* logs exist at all. Then introduce exclusion (the constraint), because it only makes sense once the student is already reaching to log things. Don't open with the denylist — a denylist with no log calls to constrain is abstract.

**The operator/user split is the load-bearing prerequisite and the most likely source of student confusion.** From chapter 080 lesson 2: every error is two artifacts — a sanitized *user* string and a rich *operator* record. The non-obvious consequence, which this lesson must hammer, is that **email and internal IDs are operator-side and therefore SAFE to log**, while names, addresses, and phone numbers are user-side PII that must be redacted. Beginners over-correct here: they hear "GDPR" and redact the userId/email too, which destroys the ability to correlate an incident to a customer. The split is the scalpel; redaction enforces the boundary on fields that slip through.

**Why this matters in production stakes, stated concretely throughout:** every example ties to a real incident shape — "the Stripe webhook 500'd for one org," "a Zod validation failed and the operator needs the input shape," "a sign-in failed and we need the IP." The discipline reads as the answer to a known cost (a blown incident, a GDPR fine, a leaked secret in a third-party log vendor that can't fully delete it).

**The pattern lands by review, not by reading.** This is a classification/judgment skill. The lesson is structured around worked log lines the student dissects, and it ends with two interactive exercises (a Buckets sort for the safe/redact boundary, and an audit-the-sign-in-flow review). Prose teaches the rule; exercises make it stick.

**Code role.** Most code in this lesson is *log call sites* (small, illustrative) and *one config object* (`redactionConfig` + `PII_KEYS`, the lesson's single artifact). The config gets an `AnnotatedCode` walkthrough. Before/after log-line comparisons (raw vs. redacted, leaky vs. clean) use `CodeVariants`.

---

## Sections

### Introduction (no header — lesson intro prose)

Open on the 3am pager scenario, picking up the exact thread lesson 2 left: the logger is wired, the `requestId` threads through every line, but the team has never decided *what* those lines should say or *what they must never say*. Make the senior question explicit and implicit-not-as-a-header (per pedagogical guidelines): the on-call engineer opens the log destination filtered by the `requestId` from a Sentry event — what do they need to see to diagnose without reproducing, and what must not be sitting there for a regulator to find?

State the lesson's two deliverables plainly: a per-seam logging policy (the 3am rule) and the redaction denylist that completes lesson 2's empty `redact` slot. Preview the one-sentence model: *log what an operator at 3am wants; exclude what a regulator at 9am objects to.* Keep it warm and brief (4-6 sentences of prose).

Connect back to known ground in one line: this cashes in the operator/user message split from chapter 080 — the operator side of every error is exactly what the log carries.

### Rule 1: log what the 3am operator needs

Teach the generative half first. The core principle, stated once and memorably: **log the *what* and the *which*, not the *how*.** The operator needs to know *what operation ran*, *which entities it touched*, and *how it turned out* — not a play-by-play of internal control flow.

Establish the per-operation shape that recurs across every seam:
- One structured `info` line per **successful** meaningful operation.
- One structured `error` line per **failure**, carrying the cause chain via the `{ err }` serializer (from lesson 2 — reference, don't re-teach the serializer).
- The line names the operation, the entities (by ID), the outcome, and the duration.

Then walk the four canonical seams as a compact reference. Present these as a **Buckets-free reference table or a short `Card`/`CardGrid`**, OR — better for scannability — a single `AnnotatedCode` block showing four representative log calls (one per seam) with a step per seam explaining what each field buys the operator at 3am. The seams:

- **(a) Server action** — action name, validated-and-redacted input shape (forward-reference the redaction half: "we'll see why it's the *validated* shape, not the raw form, in the next section"), `userId`, `orgId`, outcome (`ok` / error `code`), `durationMs`.
- **(b) Webhook handler** — event type, event ID, signature-verified flag, idempotency hit/miss, a downstream-effect summary. Tie to the concrete "Stripe webhook 500'd for one org" incident: this is the line set that tells the operator *which org, which event, whether we'd already processed it*.
- **(c) Background job** — job ID, input *keys* (`invoiceId`, `userId`), result code, retry count. (Cross-reference Trigger.dev tasks from Unit 13 in one phrase; the job inherits no auth context, so the IDs come from the payload.)
- **(d) External API call** — endpoint, status code, `durationMs`, retry attempt.

Use the child-logger idiom from lesson 2 in these examples (`const log = logger.child({ seam: 'webhook.stripe', webhookEventId, stripeEventType })`) so the request IDs and seam are already bound and the call sites stay lean — this reinforces lesson 2's pattern without re-explaining it.

**Pedagogical note for the writer:** keep each example to 2-4 lines. The student is learning *judgment about fields*, not API surface. Resist showing a full handler.

End the section with the **"log everything" anti-pattern** inline (it qualifies this rule, so it belongs here, not in a tips bucket). The common over-reach is `log.info('entering handler')` / `log.info('leaving handler')` on every function. The cost (volume, money, signal-to-noise) outpaces the value, and the `requestId` already ties the request's lines together — entry/exit pairs add zero signal. The discipline: log the request entry once, log significant *decisions* inside (cache miss, rate-limit hit, branch taken, fallback fired), log the outcome. Pair this with the **sampling threshold** in one line: a read-heavy endpoint at high RPS emitting one info line each costs more than its diagnostic value — drop those to `debug` (off in prod), keep `info` for state changes and all errors. Name the trigger to flip: when one endpoint's log volume dominates the bill, sample 1-in-N info lines but keep 100% of errors.

**Terms to gloss here:** `Term` on **idempotency** (brief: "processing the same event twice has the same effect as once") if not already a course staple by this point — check; likely already known from webhooks/Trigger units, so probably skip. `Term` on **seam** is unnecessary (defined in lesson 2, same chapter).

### Rule 2: what never reaches the log

Now introduce the constraint half. Open by naming the second audience explicitly: the regulator at 9am, and the third-party log vendor (Axiom, lesson 4) that will *store* whatever you ship and can only partially delete it after the fact. The senior posture: **prevention is cheaper than deletion.** Sending PII to the destination and then asking the vendor to purge it has hard limits.

Present the exclusion list as the lesson's reference, grouped so it's memorable rather than a flat dump. Use a `CardGrid` or a structured list with three tiers:

- **Secrets — never, in any form.** Passwords (plaintext *or* hashed — neither belongs in a log), API keys and tokens (Stripe keys, OAuth tokens, JWTs, session cookies, signed URLs), full `Authorization` and `Cookie` headers, full request bodies (they can carry any of the above).
- **PII per GDPR.** Full name, postal address, phone number, IP address (special-cased below), full card / bank numbers, government IDs, date of birth, precise geolocation.
- **Special-category data per GDPR Art. 9 — hardest no.** Health, religion, ethnicity, political opinion, sexual orientation, biometric. One line; the point is the student knows the category exists and that it's a brighter line than ordinary PII.

Immediately follow with **the safe list**, because this is where students over-redact and it deserves equal billing: **userId, email, orgId, plan, role, and the non-sensitive validated request shape are SAFE and SHOULD be logged.** This is the operator side of the chapter-080 split — these identifiers are load-bearing for support, fraud investigation, and incident correlation. Make the contrast sharp and explicit, ideally as a two-column visual (see the operator/user split figure below).

**Terms to gloss:** `Term` on **PII** ("Personally Identifiable Information — data that can identify a specific person"), `Term` on **GDPR** ("EU regulation governing personal-data handling; the de-facto global floor"). `Term` on **special-category data** or cite Art. 9 inline. These are non-obvious acronyms/regulatory terms that support the lesson's compliance goal — exactly the strategic case for `Term`.

#### The operator/user split decides what the logger emits

A short subsection (could fold into the parent, but a heading helps because this is the conceptual crux). Re-anchor to chapter 080 lesson 2 *concisely* (it's a prerequisite, not new material): every error is two artifacts, a sanitized user string and a rich operator record, diverging at the wrapper. The new application: **that same split decides logging.** Operator-side fields (internal IDs, email) go in the log; user-side fields (name, address, phone) don't. Redaction is the backstop that enforces the boundary on user-side fields that accidentally end up inside a logged object.

**Diagram — the safe/redact boundary (HTML + CSS, inside `<Figure>`).** A two-column "scalpel" figure. Left column header "Operator side — LOG IT" (green-tinted): `userId`, `email`, `orgId`, `plan`, `role`, `requestId`, validated request shape, `Error.stack`, error `code`. Right column header "User side — REDACT" (red-tinted): `password`, `token`, `Authorization` header, full name, postal address, phone, IP (full), card number, special-category data. A vertical divider line down the middle labeled "the chapter-080 split, enforced at serialize time." **Pedagogical goal:** make the counterintuitive placement of email/IDs on the *safe* side visually unmissable, and give the student a mental picture they can recall at a call site. Keep it compact (well under the 800px height cap); this is a simple visual aid, not a system graph. Caption reinforces: "Email and IDs are diagnostic, not decorative — redacting them blinds the operator."

### Structural redaction: the denylist set once

This is the lesson's single code artifact and the payoff that completes lesson 2's empty slot. Teach **why structural before showing how** (defaults-and-reasoning posture).

**Why structural, not per-call-site.** Contrast the two postures with `CodeVariants` (before/after):
- Variant "Per-call-site (fragile)": a hand-pruned object literal `log.info({ user: { id: user.id /* remembered to skip name */ } }, '...')`. Prose: relies on every developer remembering and every reviewer catching; one forgotten field leaks forever; invisible to a security review that can't read every call site.
- Variant "Structural (the discipline)": `log.info({ user }, '...')` with the *whole* object, redaction handled by the logger config. Prose: the caller logs naturally; the logger strips sensitive keys by name at serialize time; new sensitive fields are caught by name without touching call sites; the policy is one reviewable file.

State the senior rule plainly: **redaction is the logger's job, not the caller's.**

**The config — `AnnotatedCode` walkthrough.** Show `lib/logger.ts`'s `redactionConfig` and the `PII_KEYS` constant it pulls in. Ground the exact shape in the code conventions (the denylist drops `password`, `token`, `authorization`, `cookie`, `set-cookie`, plus everything in `PII_KEYS`). Proposed shape:

```ts
// lib/logger.ts (the redact slot lesson 2 left empty, now filled)
const PII_KEYS = ['fullName', 'name', 'phone', 'address', 'dateOfBirth', 'ip'];

export const redactionConfig = {
  paths: [
    'password', '*.password',
    'token', '*.token', '*.apiKey', '*.secret',
    'req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]',
    ...PII_KEYS.flatMap((k) => [k, `*.${k}`]),
  ],
  censor: '[REDACTED]',
};
```

`AnnotatedCode` steps (one focus each, 6 lines max prose):
1. `PII_KEYS` extracted as a named constant — the application's own PII fields, reviewed as a unit, reused by Sentry's `beforeSend` (lesson 1) so both enforcement points share one source of truth.
2. The secrets paths — note the **wildcard syntax** (`*.password` matches the key one level deep; bare `password` matches top-level). Explain `*` vs. dotted deep paths (`req.headers.authorization`) briefly. One-line cost note (verified against pino's redaction docs): wildcard paths are measurably slower than explicit keys (~50% for a handful of keys), so fan out by name where the shape is known and reserve `*` for genuinely unknown nesting — don't carpet-bomb with `*` gratuitously.
3. The header paths — and the **case-sensitivity footgun**: pino's redact paths are case-sensitive; `authorization` won't match a header logged as `Authorization`. The fix the course uses: lowercase header keys before logging (Node normalizes incoming header names to lowercase, so this is usually free — but name the trap because a hand-built object can reintroduce capitals).
4. `PII_KEYS` fanned out to both top-level and nested paths via `flatMap`.
5. `censor: '[REDACTED]'` — what the field becomes, and that redaction runs **at serialize time, before the line leaves the process**, so a redacted field never touches stdout, the drain, or the vendor.

After the block, state the **auditability** payoff: this is a single file the security review reads in a PR; adding a logged field that's sensitive means adding one entry here, caught in review. Then the **backstop**: a CI grep that fails the build on literal sensitive patterns in committed code (a bare `password:` or `secret:` followed by a value) — defense in depth behind the structural config. One line; don't over-build it.

**Watch-out, inline (it qualifies this section):** **redact-config drift.** The known failure mode — someone adds a new field (`user.taxId`) to a logged object and forgets to add it to `PII_KEYS`, so it leaks until someone notices. The discipline: PRs that add a logged field get a redact-config review as a paired change. Frame it as a known, named cost with a process answer, not a moralization.

### Edge cases the rule has to answer

A section for the three non-obvious applications that students get wrong in the real world. Each is a short subsection or a tight paragraph; they belong here (concrete applications of the two rules) rather than scattered as tips.

#### Logging a request body — the bounded shape

When the operator genuinely needs the input (a Zod validation failure where the input shape *is* the diagnosis), log the **validated and redacted** output, never `req.body` raw. The Zod parse already enforced the shape, so the result has known keys and the redact config strips the sensitive ones. **Never log `req.body` before parse** — pre-parse it can carry anything an attacker injected, including fields you never modeled and therefore never added to `PII_KEYS`.

Concrete sub-point with `CodeVariants` or a tight before/after: logging Zod errors. Log `error.issues` (the paths and codes — operator-safe, tells you *which field failed and why*) **without** the input payload (which carries the PII that failed validation). Tie to the incident: "the operator sees `email: invalid format` at path `['email']`, not the malformed email itself."

#### Errors and stack traces — what's safe and the message trap

`Error.stack` is operator-side and safe — file paths and line numbers, no user data. The trap is `Error.message`: it may carry concatenated user input (`Could not find user with email alice@example.com`). The user/operator split says the message is operator-side *for the log*, so it logs — **but** the same message can reach other surfaces (the audit log, a user-facing toast), and there it leaks. The discipline (from the chapter-008 error-class convention, referenced not re-taught): **constants for error messages, structured fields for context.** `new NotFoundError('user', { email })`, not `new Error('Could not find user with email ' + email)`. The structured field rides the redact config; the message stays a constant.

One sharp watch-out: **never `JSON.stringify(err)` to log an error.** `Error.message` and `Error.stack` are non-enumerable, so stringify drops them and you log `{}`. Use `{ err }` and the serializer (lesson 2). This is a classic beginner bug worth calling out explicitly.

#### IP addresses — the GDPR-specific reach

The most nuanced case, worth its own subsection because the answer is conditional. Under GDPR an IP is personal data, but it's also genuinely useful for diagnosis (rate-limit context, geographic-anomaly detection). The EU-favored discipline the course adopts:
- **Routine `info` logging:** log the IP with the last octet zeroed (`192.168.1.0`) — enough for geographic/subnet signal, not enough to identify.
- **Security events** (sign-in failures, rate-limit breaches): log the full IP under the legitimate-interest basis tied to security, with **shorter retention** than other operational logs.

**Accuracy guardrail for the writer (verified against current GDPR-and-logging guidance):** do NOT claim that octet-masking makes an IP non-personal-data or exempts it from GDPR. Partial masking *reduces* identifiability and satisfies data-minimization, but if the masking is reversible or the remaining data still identifies, GDPR obligations persist. The honest framing: masking is a data-minimization measure, not an exemption — it lowers risk and is the right default, full stop. Keep the claim to "minimize by default, justify the exception," not "masking = anonymous."

Name where retention is owned (the audit-log chapter, ch081 lesson 4) and that this lesson only flags the IP-specific gotcha. Note that `ip` is in `PII_KEYS`, so the *default* is redaction; logging it requires a deliberate, masked call. This models the senior move: the safe default is exclusion, and the exception is explicit and justified.

### Audit the rule: a sign-in flow under review

The lesson's consolidating exercise. Per the chapter outline, "the pattern lands by review, not by reading," and the brainstorm conclusion is that this is fundamentally a *judgment* skill best assessed interactively. Two exercises, sequenced easy-then-applied.

**Exercise 1 — Buckets: safe to log vs. must redact.** A `Buckets twoCol` classification drill. Two buckets: "Safe to log (operator-side)" and "Redact / never log". Items (chips, mostly inline-code): `userId`, `email`, `orgId`, `plan`, `password`, `Authorization` header, `stripe.token`, full name, `requestId`, postal address, phone number, `error.issues`, `durationMs`, full IP, last-octet-zeroed IP, `Error.stack`, raw `req.body`. **Pedagogical goal:** force the counterintuitive calls (email/userId → safe; full name/phone → redact; zeroed IP → safe, full IP → redact) into an explicit choice the grader checks. This is the cleanest way to surface the over-redaction misconception. Set `instructions` to frame it as "you're deciding what your logger config lets through."

**Exercise 2 — CodeReview: the sign-in handler's log lines.** A `CodeReview` over a short sign-in server action (single file is fine) with seeded plants the student must flag as review comments. Plants (with `kernel` rubric phrases):
- A line logging the full request body (`kernel`: "logs raw request body — carries the plaintext password before redaction can help").
- A line logging the Zod error with the input payload attached (`kernel`: "logs the failed input alongside `issues` — leaks the PII that failed validation").
- A line doing `logger.error({ error: JSON.stringify(err) }, ...)` (`kernel`: "`JSON.stringify(err)` drops the non-enumerable message and stack — use `{ err }` and the serializer").
- A line logging the full client IP at `info` for a routine successful sign-in (`kernel`: "full IP at info for a routine event — mask to last-octet-zeroed, reserve full IP for security events").
- (Optional 5th, a *correct* line that logs `userId` + `email` + `orgId` — NOT a plant, present to test that the student doesn't over-flag the safe operator-side fields. A `ReviewWhy` debrief can note that flagging this one is the over-redaction trap.)

Include a `ReviewWhy` debrief tying both exercises back to the one-sentence model. **Pedagogical goal:** move from recognition (Buckets) to application (spot the violation in realistic code), which is the senior skill the chapter sells.

If `CodeReview`'s Ollama grader is unavailable it degrades to line-graded, which is acceptable here (the plants are line-specific). Note this in the outline so the writer knows the fallback is fine.

### Two streams, two rule sets: the operational log vs. the audit log

Short closing section to prevent a real conflation. The audit log (ch081 lesson 3, `logAudit(tx, event)`) and the operational logger taught in this chapter are **two different streams with overlapping but distinct rules.** Lay out the contrast compactly (a two-row table or tight prose):

- **Operational log** (this chapter): ephemeral, best-effort (stdout → drain), 30-day-ish retention, redact PII aggressively, audience = on-call operator.
- **Audit log** (ch081): durable, transactional (a DB write inside the transaction), retained per legal basis (longer), preserves payloads the operational log strips, audience = compliance / security review.

The senior rule: **never route one through the other.** Don't reconstruct an audit trail by grepping operational logs (best-effort, redacted, expired); don't dump operational diagnostics into the audit table (wrong retention, wrong cost). Cross-reference both ch081 lessons; do not re-cover them. This closes the lesson by situating its discipline in the broader observability/compliance picture the student is assembling.

### External resources (optional)

If a high-quality, recent (last ~6 months) source covers GDPR's stance on IP addresses or logging PII, add one `ExternalResource` card. A `VideoCallout` is **not** a strong fit here — this is a judgment/policy lesson, not a mechanics one a screencast would help with. Skip video unless the resourcer finds something unusually on-point. Likely candidates worth a card: pino's `redact` docs (the option reference), and an authoritative GDPR-and-IP-address explainer. Keep to at most two cards.

---

## Scope

**Prerequisites — redefine concisely, do not re-teach:**
- The pino logger setup, the fixed key set, the child-logger idiom, level semantics, the `{ err }` serializer, and the empty `redact` slot — all from **lesson 2 of this chapter**. This lesson fills the slot and decides call-site content; reference the machinery in a phrase, don't rebuild it.
- The `requestId` / AsyncLocalStorage threading and the two entry seams — **lesson 2**. Mentioned only as the reason every log line is already correlated; not re-explained.
- The operator/user message split — **chapter 080 lesson 2**. This is the conceptual anchor; re-state it in one or two sentences as the rule that decides what's safe, then apply it. Do not re-teach the wrapper that produces the split.
- Custom error classes, `Error.cause`, the `code` + `userMessage` separation — **chapter 008 / chapter 080**. Referenced for the "constants for messages, structured fields for context" point; not re-taught.
- Sentry's `beforeSend` redaction — **lesson 1 of this chapter**. Named once as the *other* enforcement point that shares `PII_KEYS`; the canonical denylist is owned here, but the wiring of `beforeSend` is not re-shown.

**Explicitly out of scope (owned elsewhere):**
- The logger and child-logger mechanics — lesson 2 of this chapter.
- Shipping logs to a destination, Vercel Drains, the Sentry-to-logs pivot UI — lesson 4 of this chapter.
- Sentry's setup and capture surface — lesson 1 of this chapter.
- The audit log itself (append-only domain events, its `logAudit` write path) — chapter 081 lesson 3. Cross-referenced as the contrasting stream only.
- GDPR retention timers and the right-to-deletion mechanics — chapter 081 lesson 4. This lesson names retention *differences* (IP gets shorter retention) but does not implement timers.
- The user/operator message split's construction — chapter 080 lesson 2.
- Secrets-management baseline (keeping secrets out of env/code in the first place) — chapter 081 lesson 6.
- The CI grep tooling build-out — named as a backstop, not implemented here.

**Deliberate divergences from code conventions (flag for downstream agents):**
- None expected. The `redactionConfig` shape, the `PII_KEYS` constant, the 3am-rule framing, the level semantics, and the "redaction in config not at call sites" rule all match the Logging section of the code conventions directly. The lesson should treat the conventions' denylist (`password`, `token`, `authorization`, `cookie`, `set-cookie`, `PII_KEYS`) as canonical and not invent a different one.

---

## Notes for downstream agents

- **Tone:** senior, terse, decision-first. Every rule is the answer to a named incident cost. No bootcamp scaffolding.
- **The one-sentence model** (*log what an operator at 3am wants; exclude what a regulator at 9am objects to*) should appear in the intro and recur in the closing/debrief so it's the takeaway.
- **The over-redaction misconception** (redacting email/userId) is the single most important thing to correct — give it the operator/user split figure and a Buckets item that forces the call.
- **Keep code call-sites tiny.** The only substantial code block is `redactionConfig` + `PII_KEYS`. Everything else is 2-4 line illustrations.
- **Estimated length:** 35-45 minutes (matches the chapter outline). This is the chapter's shortest teaching lesson; don't pad it. Two exercises plus one figure plus one annotated config is the right interactive budget.
