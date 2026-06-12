# Lesson 4 outline — Gate sign-up per-IP

## Lesson title

Chapter-outline title "Gate sign-up per-IP" fits — keep it.
- Page title: `Gate sign-up per-IP`
- Sidebar: `Sign-up gate`

## Lesson type

`Implementation`

## Lesson framing

The student installs the senior call that distinguishes a per-IP gate from a dual-keyed one: on sign-up the email is the attacker's choice, so the only abusable identity is the originating IP — keying on email would hand an attacker a free bypass (cycle fresh addresses). They ship the sign-up gate by reusing the limiter and helper trio already built, proving the payoff promised in lesson 1: adding a protected endpoint is one limiter plus one wrap, same `Result`-carried budget, same fail-open. The lesson's verification closes the chapter's "sign-up is rate-limited per-IP" clause: the 6th call from one host is rejected while five different emails were accepted.

## Codebase state

**Entry.** Lessons 2 and 3 are done: `redis.ts`, `rate-limit.ts` (three module-scope limiters incl. `signUpLimiter` = `slidingWindow(5, '10 m')`, `prefix: 'rl:signup'`), `keys.ts` (`getClientIp`, `normalizeEmail`), `safe-limit.ts` (`safeLimit` fail-open wrapper), `rate-limit-headers.ts` (`rateLimitBudget`, `rateLimited`, route-twin helpers) are all real. Sign-in is dual-gated and Better Auth's built-in limiter is off. `env.ts` carries the two Upstash vars. The inspector's "Remaining tokens" panel reads live, and "Spam sign-in" rejects on the 11th. `src/app/(auth)/sign-up/actions.ts` is still the stub returning `err('internal', 'Not implemented')` — "Spam sign-up" surfaces `internal` outcomes.

**Exit.** `signUpAction` is wrapped with a single per-IP `safeLimit(signUpLimiter, 'rl:signup', \`ip:${ip}\`)` gate before `auth.api.signUpEmail`. "Spam sign-up" rejects on the 6th call with `key: 'ip:<addr>'`; the five preceding calls succeed with distinct emails; the panel shows `signup → ip:<addr> → 0/5`. Reset (`src/app/(auth)/reset/actions.ts`) remains the stub — lesson 5.

## Lesson sections

Implementation type — section list: intro (no header) / **Your mission** / **Coding time** / **Moment of truth**.

### Intro (Goal + Finished result, no header)

One-sentence goal in user terms: gate the sign-up action with a single per-IP limit so one host cannot mass-register accounts, while each call still carries its rate-limit budget on the `Result`. Then a one-paragraph description of the feature working (no screenshot needed — reuse the inspector surface the student already knows): on `/inspector`, "Spam sign-up" with six random-suffix emails returns the 6th as `rate_limited` with the logged `key: 'ip:<addr>'`; the five preceding calls succeed with different emails, proving the gate is per-IP and not per-email. Keep it warm and short — the heavy lifting (helper trio, limiter, fail-open, `after()`) all landed in lessons 2-3; this lesson is the contrast case.

### Your mission

Prose paragraph + one requirements checklist. No subsection headers, no implementation hints.

Weave the brief: sign-up is the per-IP-**only** endpoint, and the contrast with sign-in's dual-keying is the whole point — the email on a sign-up request is attacker-controlled, so keying on it lets a single host cycle fresh addresses to defeat the gate; the only abusable identity is the originating IP. The single per-IP gate reuses the limiter (`signUpLimiter`, 5/10m) and helpers from earlier lessons — the proof that adding an endpoint costs one limiter plus one wrap. Carry-over rules (state as constraints, not hints): the gate runs before `auth.api.signUpEmail`, the rejection goes through the opaque `rateLimited(...)` helper, the success path returns its budget on the `ok` payload's `rateLimit` field, `safeLimit` keeps the fail-open policy, and `pending` flushes via `after()`. Out of scope (one line): any per-email keying on this endpoint — deliberately omitted, and the reason is the requirement that five distinct emails get through.

Functional requirements (numbered, each `[tested]` / `[untested]`). Tests assert on inspector-observable behavior via the action's `Result` and `rate_limit_log`:

1. `[tested]` The 6th sign-up from the same IP within the window returns `rate_limited` with the logged `key: 'ip:<addr>'`.
2. `[tested]` Five sign-ups with five different random-suffix emails are accepted — varying the email cannot bypass the gate (per-IP, not per-email).
3. `[tested]` The success path carries its budget on the `ok` payload's `rateLimit` field (`limit`/`remaining`/`reset`); the rejection returns the opaque `Too many attempts. Please try again later.` message.
4. `[tested]` With Upstash forced down, spammed sign-ups proceed (fail-open) and log `rate_limit_unavailable`.
5. `[untested]` `pending` analytics flush via `after()` rather than being awaited on the response path (covered in the reference; the timing harness is sign-in-only).
6. `[untested]` Validation failures (missing/short fields) short-circuit before the gate with a `validation` `Result`, so a malformed body never burns a token (covered in the reference).

Constraints to weave in prose: gate-before-work order; opaque rejection identical to every other gate (no information leak); budget rides the `Result` because a Server Action's `headers()` is read-only. Note `signUpAction` keeps the chapter-055 `(state, formData)` `useActionState` shape; the return type is `Result<{ redirectTo: string; rateLimit: RateLimitBudget }>` and on success it returns `ok({ redirectTo: '/verify-email?email=…', … })` rather than redirecting (the form navigates client-side off `state.data.redirectTo`).

Render the checklist as `Checklist` / `ChecklistItem` with `tested`/`untested` chips.

### Coding time

One-line build prompt directing the student to implement `src/app/(auth)/sign-up/actions.ts` against the brief and the tests, reusing `signUpLimiter`, `safeLimit`, and the reject/budget helpers — then the solution hidden in `<details>` (writer wraps it; collapsed by default).

Reference implementation, organized as it appears in `src/app/(auth)/sign-up/actions.ts` (already written in the solution; reproduce faithfully): `'use server'`; imports (`headers` from `next/headers`, `after` from `next/server`, `z`, `auth`, `mapAuthError`, `getClientIp`, `signUpLimiter`, the budget/reject helpers, `err`/`ok`/`Result`, `safeLimit`); the `SignUpSchema = z.strictObject({ name, email (trim+lower→email), password (min 12) })`; the `signUpAction(_state, formData)` body — `safeParse` → on failure `err('validation', …, z.flattenError(...).fieldErrors)`; `ip = getClientIp(await headers())`; single `ipLimit = await safeLimit(signUpLimiter, 'rl:signup', \`ip:${ip}\`)`; on `!ipLimit.success` return `rateLimited(ipLimit, 'ip', ip)`; `try { await auth.api.signUpEmail({ body: { name, email, password } }) } catch (e) { after(ipLimit.pending); return mapAuthError(e); }`; on success `after(ipLimit.pending)` then `ok({ redirectTo: \`/verify-email?email=${encodeURIComponent(email)}\`, rateLimit: rateLimitBudget(ipLimit) })`.

Present this with `AnnotatedCode` — the file is short but has three focus points the student must connect (the single gate vs. sign-in's two; `rateLimited(ipLimit, 'ip', ip)` passing the bare `ip` as the third arg; `after(ipLimit.pending)` on both the catch and success paths). Steps: (1) parse + early `validation` return — gate never runs on a malformed body [covers untested req 6]; (2) the single per-IP gate before any work; (3) the reject helper and why the message is opaque; (4) the success payload carrying the budget + `after(pending)`.

Decision rationale (one-two sentences each): why per-IP only — the email is the attacker's choice, so a per-email gate is a free bypass; why there is no taken-email branch — under `autoSignIn: false` a duplicate returns generic success, so enumeration stays closed at the source (link to chapter 053 lesson 1 rather than re-explaining); how little a new endpoint adds vs. sign-in — same limiter import, same `safeLimit`, same helpers, one gate instead of two. Cover the untested reqs: req 5 — `after(ipLimit.pending)` appears on both the catch and success branches so analytics never block the response; req 6 — the `safeParse` early return sits above the gate. Callout: the `rateLimited` signature takes `(result, gate, key)` where `gate` is `'ip'` and the third arg is the raw `ip` (the helper composes the logged `ip:`/`email:` key from `gate`) — flag this so the student doesn't double-prefix.

For dual-keying, fail-open, gate-before-work, budget-rides-the-`Result`, and `after()`, link to lesson 3 of this chapter (and lesson 3 of chapter 074) rather than re-explaining — those are owned upstream. Link to chapter 053 lesson 1 for the enumeration-closed-at-source reasoning. No diagram — the single-gate flow is a one-line subset of lesson 3's flow.

(Resourcer appends external resources here after the `<details>`, no header — not the outline's job.)

### Moment of truth

Test command: `pnpm test:lesson 4`. State the expected pass output (all suites green) and that the writer should show the real runner summary once the test-coder produces it.

Then a by-hand `Checklist` the student ticks for the untested/observational items: click "Reset counters"; click "Spam sign-up" → the recent-responses log shows five accepted sign-ups (distinct random-suffix emails) and the 6th as `rate_limited` with the logged `key: 'ip:<addr>'` and the opaque message; the "Remaining tokens" panel reads `signup → ip:<addr> → 0/5`. Toggle "Force Upstash down" on; "Spam sign-up" again → all proceed and the structured-log tail shows `rate_limit_unavailable` rows; toggle off. Confirm the mocked-email counter behavior is not in scope here (verify-email send path, not asserted this lesson).

Code samples in this section: `Code` for the `pnpm test:lesson 4` command and its output block.

## Scope

This lesson does **not** cover:
- The per-email gate or its cross-IP "survives an IP switch" proof — that is the reset endpoint's job (lesson 5 of this chapter).
- The sign-in dual-keyed gate, the helper trio, `safeLimit`, the limiter declarations, or the Better Auth built-in swap — all shipped in lessons 2-3 of this chapter; this lesson only consumes them.
- Literal `RateLimit-*` HTTP headers and the 429 body — those live only on the route-handler twin `/api/limit-demo` (introduced lesson 3).
- The `after()`-vs-await-pending timing demo — sign-in-only inspector harness (lesson 3).
- Vercel WAF / edge layer, captcha, per-user/per-org limits — named out of scope in lesson 1.
