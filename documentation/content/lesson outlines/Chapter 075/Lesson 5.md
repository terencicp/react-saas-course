# Chapter 075 — Lesson 5 outline

## Lesson title

Chapter-outline title "Gate reset per-IP and per-email" fits — keep it.
Sidebar title: **Gate the reset action**.

## Lesson type

`Implementation` — the test-coder runs against the `[tested]` requirements; the writer renders the Implementation section list.

## Lesson framing

The student installs the senior call that a per-email gate is not always about the requester — on password reset it shields a *third party*: every accepted reset sends real mail, so the per-email gate must survive an IP switch to stop a cross-host campaign from flooding a victim's inbox and burning Resend deliverability and budget. They ship the project's last and tightest gate (3/15m, dual-keyed) by reusing the limiter and helpers from lessons 2–3, closing the surface: every "Done when" clause now has an owning lesson.

## Codebase state

**Entry.** Sign-in (lesson 3, dual-keyed ip+email) and sign-up (lesson 4, per-IP) are gated and live on `/inspector`. The shared infrastructure exists: `redis.ts`, `rate-limit.ts` (`signInLimiter` / `signUpLimiter` / `resetLimiter`, `LIMITER_MAX`), `keys.ts` (`getClientIp`, `normalizeEmail`), `safe-limit.ts` (`safeLimit`), `rate-limit-headers.ts` (`rateLimitBudget`, `rateLimited`, route-twin helpers), `rate-limit-log.ts` (`logRateLimit`), all real. Better Auth's built-in limiter is off. The reset action `src/app/(auth)/reset/actions.ts` is still the stub returning `err('internal', 'Not implemented')` — `resetLimiter` is declared but never exercised, so the inspector's `reset → ip` and `reset → email:eve@example.com` rows read `3/3` but "Spam reset" produces `internal` outcomes.

**Exit.** `reset/actions.ts` is wired: Zod `strictObject` parse → per-IP `safeLimit` → per-email `safeLimit` → `auth.api.requestPasswordReset` → `after(pending)` on both gates → `ok({ sent: true })`. "Spam reset" across distinct synthetic IPs against `eve@example.com` trips the per-email gate on the 4th call; the per-email gate survives one more IP switch; `getMockEmailSentCount()` rises by exactly the successful resets. The project is feature-complete; no stubs remain.

## Lesson sections

Implementation type. Section order: **Goal + Finished result** (intro, no header) / **Your mission** / **Coding time** / **Moment of truth**.

### Goal + Finished result (intro, no header)

One-sentence goal in user terms: gate the password-reset action per-IP and per-email so neither a noisy host nor an IP-rotating campaign against one victim's address can flood reset emails. Then a one-paragraph description of the finished result: on `/inspector`, "Spam reset" runs four resets against `eve@example.com` across distinct synthetic IPs (a cross-host campaign), the 4th returns `rate_limited` (`limiter: 'reset'`, `key: 'email:eve@example.com'`); the "Distinct IPs (reset)" runner switches IP once more and is still rejected on the per-email gate; the mock-email counter ticks up only by the three successful resets. A `Screenshot` of the inspector after the spam (the `reset → email:eve@example.com → 0/3` panel row plus the recent-responses log) optional if available; otherwise prose carries it.

### Your mission

Header "Your mission". Coherent prose paragraph, no subsection headers, no implementation hints.

- **Feature** (user terms): rate-limit the password-reset request so a victim's inbox and the app's Resend cost are protected even when the attacker rotates IPs.
- **Why per-email here differs from sign-in** (the senior payoff to foreground): reset is the second dual-keyed endpoint, but its per-email gate exists for a different reason than sign-in's — the cost of abuse is concrete and lands on a third party. Every accepted reset sends real mail; the per-IP gate stops a single noisy host, the per-email gate protects the targeted address across hosts. Surviving an IP switch is the gate's load-bearing property.
- **Gate ordering note** (shapes the verification, not a hint): per-IP is checked first, so demonstrating the per-email gate requires the spam spread across distinct IPs — with equal budgets a same-IP burst trips the per-IP gate first.
- **Carry-over rules** (woven, named not re-taught): gate before `auth.api.requestPasswordReset`, opaque rejection message, budget riding the `Result`, fail-open through `safeLimit`, `pending` to `after()`. Reset returns `ok({ sent: true })` — no redirect; the form renders an enumeration-uniform confirmation in place. Tightest budget in the project (3/15m) because abuse cost is highest.
- **Constraints**: reuse `resetLimiter` and the existing helpers — no new limiter, no new helper file (this is the proof a new gate is one wrap).
- **Out of scope** (one line): real email delivery — mocked here; the live Resend path is chapter 050's concern. Link chapter 050.

**Functional requirements** — numbered list, every item tagged `[tested]` or `[untested]`. Phrased as observable outcomes on `/inspector` / Redis / the mock counter, never files or imports:

1. `[tested]` Four resets against `eve@example.com` across distinct IPs return `rate_limited` on the 4th, with `limiter: 'reset'` and `key: 'email:eve@example.com'` (per-IP buckets stay fresh, so the per-email gate is what trips).
2. `[tested]` After one more IP switch, a further reset against `eve@example.com` is still `rate_limited` on the per-email gate — the gate survives the IP change.
3. `[tested]` A burst from one IP against distinct addresses is rejected on the per-IP gate once the per-IP budget is spent.
4. `[tested]` `getMockEmailSentCount()` increases only by the number of successful resets; rate-limited attempts send no mail.
5. `[tested]` The success path returns `ok({ sent: true })`; rejection returns the opaque `rate_limited` message with the gate + key only in the `rate_limit_log` row.
6. `[untested]` With "Force Upstash down" on, spammed resets proceed (fail-open) and log `rate_limit_unavailable` rows (covered by the shared `safeLimit` from lesson 3; confirmed by hand).

(Test-coder asserts 1–5; the test file is self-contained, inlining any helpers, asserting observable behavior — the action's `Result` code/`key`/message and the mock-email count — not file paths or imports. Requirement 6 is reference-solution / manual only.)

Render the checklist with `Checklist` / `ChecklistItem` carrying the `tested`/`untested` chips.

### Coding time

Header "Coding time". One-line build prompt: implement `src/app/(auth)/reset/actions.ts` against the brief and the tests, reusing `resetLimiter`, `safeLimit`, and `rateLimited`. The writer wraps the solution in `<details>` (collapsed).

Reference implementation — the single file `src/app/(auth)/reset/actions.ts`, presented whole as it appears in the repo. Use `AnnotatedCode` to step focus across the four load-bearing parts: (a) the `strictObject` parse + `validation` early return, (b) the ordered `ip:` then `email:` `safeLimit` gates each returning `rateLimited(...)` on `!success`, (c) the `auth.api.requestPasswordReset({ body: { email, redirectTo: '/sign-in' } })` call wrapped in try/catch mapping to `mapAuthError(e)`, (d) the `after(ipLimit.pending)` + `after(emailLimit.pending)` flush appearing on *both* the catch branch and the success branch before `ok({ sent: true })`.

Decision rationale (one or two sentences each, covering the `[untested]` organization/error-handling choices):
- Why reset carries a per-email gate at all — inbox + Resend cost on a third party — and why it's the load-bearing gate (survives IP rotation).
- Why the budget is tightest in the project (3/15m): concrete abuse cost, low legitimate frequency.
- Why the per-email demonstration needs distinct IPs (per-IP checked first, equal budget, would otherwise trip first).
- Why `after(pending)` appears on the catch branch too — analytics must flush whether or not `requestPasswordReset` throws; awaiting on the path would add latency (link chapter 030 for `after()`).
- Enumeration-uniform note: an unknown email returns `ok` without sending (Better Auth's default); `redirectTo` is only the link target baked into the email, the token-consume page is named-not-built — the project verifies the gate, not the full reset flow.
- `ok({ sent: true })` is a marker, not navigation — the form shows the confirmation in place; no `redirect()`.

For dual-keying, gate-before-work, opaque-message, and `safeLimit` fail-open: link lesson 3 of chapter 074 (and lesson 3 of this chapter where they were first wired) rather than re-explaining. Note the import surface is identical to the sign-in/sign-up actions — no new symbols — reinforcing the "one wrap" point.

Callout (`Aside`): the per-email gate uses the same `resetLimiter` and prefix (`rl:reset`) as the per-IP gate — distinct *keys* (`ip:` vs `email:`), one limiter; this is the dual-keying pattern, not two limiters.

### Moment of truth

Header "Moment of truth". Test command and expected pass output, then a by-hand checklist (`Checklist`) for the untested requirement.

- Command: `pnpm test:lesson 5`. Show the expected passing Vitest summary (the lesson 5 suite green, prior suites untouched) with `Code`.
- By-hand checks (tick as they go): "Reset counters"; "Spam reset" → calls 1–3 succeed, call 4 is `rate_limited` with `limiter: 'reset'`, `key: 'email:eve@example.com'`, opaque message; the "Distinct IPs (reset)" runner (fresh IP) → still `rate_limited` on the per-email gate; read `getMockEmailSentCount()` → exactly 3; the "Remaining tokens" panel shows `reset → email:eve@example.com → 0/3`; toggle "Force Upstash down" on, spam again → all proceed and the structured-log tail shows `rate_limit_unavailable` rows (requirement 6); toggle off.
- Closing line: the surface is now complete — every "Done when" clause has an owning lesson confirmed in its Moment of truth; the same shape carries to webhook receivers, uploads, and AI generation with per-user/per-org keys (named, deferred).

## Scope

- No real email delivery — mocked via `email.ts` / `getMockEmailSentCount()`; the live Resend path is chapter 050.
- No new limiter, helper, or fail-open logic — all reused from lessons 2–3; this lesson only wires the reset action.
- No token-consume / reset-completion page — named-not-built; the project verifies the *gate*, not the full reset flow.
- Sign-in and sign-up gates were shipped in lessons 3 and 4 respectively.
- No diagram needed — the flow is a linear two-gate sequence already established in lesson 3; prose + `AnnotatedCode` carry it.
