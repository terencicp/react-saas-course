# Lesson 061.2 — The authedAction wrapper

## Lesson framing

Pattern lesson, ~50–60 min. The student arrives knowing the Unit 7 five-seam action shape (parse → authorize → mutate → revalidate → return) and the `Result<T>` contract; from 060 they have `tenantDb(orgId)`; from 061.1 they have `requireOrgUser()` returning `{ user, orgId, role }` and `roleAtLeast`. This lesson lifts the first two seams (authorize + parse) out of every action body and into a *factory* — `authedAction(role, schema, fn)` — so the action body collapses to "just the work."

The senior contribution here isn't the wrapper's code (it's ~30 lines). It's the *decision* to wrap at this seam at all — and only at this seam — when the course's stated stance is "consume libraries directly" (Architectural Principle #5). The lesson must make that carve-out *explicit and bounded*: authz at the action boundary has a real bug class (missing role check) that a structural wrapper closes; nothing else at the action boundary justifies a wrapper. The wrapper is small on purpose.

**Mental model the student should end with.** `authedAction` is a *call-shape mandate*, not a middleware tower. The role is a *parameter*, not a body statement, so "I forgot the role check" doesn't typecheck. The wrapper threads a pre-built `ctx = { user, orgId, role, db }` so the action body never re-queries the session, never reaches for the unwrapped `db`, and never re-reads the role. Errors fail closed — `forbidden` and `invalid-input` return through `Result`; `redirect` is the only thing that throws.

**Pedagogical strategy.** Wrong-then-right archetype carries the lesson. Open with the threat (a fast PR ships a missing role check); show the inline action body with its three discipline lines; show the wrapped version where the discipline is the signature. Build the wrapper step-by-step using `AnnotatedCode` (one block, four highlighted steps mirroring the four wrapper steps). A `Mermaid` sequence diagram shows form-submit → wrapper → fn → Result. The carve-out from Principle #5 gets its own short subsection — named once, applied immediately. Close with a live-coding refactor exercise: the student starts with a privileged action whose role check is inline (and intentionally missing) and refactors through `authedAction`.

**Pain points to address head-on.** (1) Why a wrapper here when the course says "no wrappers" elsewhere — name the carve-out explicitly and tightly. (2) Where does the audit-log write go (foreshadow 061.5 — inside the body, the wrapper doesn't know what entity changed). (3) `Result` vs. throw — only `redirect` and truly unrecoverable failures throw; role and parse failures return through `Result`. (4) The `ctx.role` trust boundary — role *must* come from the DB-read inside the wrapper, never from `formData`.

## Lesson sections

### Introduction

Open with the senior question, not as an h2 — embed it in the warm intro: every privileged Server Action needs three things before it touches the DB — a valid session, the required role, parsed input. Forgetting any one is a real bug class. Today the action body carries all three. What's the wrapper that lifts them out so the body is *just the work*, and forgetting the wrapper doesn't compile?

Preview the deliverable: by the end the student has the `authedAction(role, schema, fn)` signature, a four-step implementation, and the discipline to know when (not) to add more to it. Concrete motivator: the missing-role-check PR shipping a privilege escalation.

Keep to 3–4 short paragraphs.

### The bug class: the missing role check in a fast PR

The threat in concrete form. Show a `deleteCustomerAction` written in the Unit 7 inline shape — `requireOrgUser`, `safeParse`, then `db.delete`. Three lines of discipline. Then mutate the example: the author wrote the session check, wrote the parse, but *forgot the role check* between them. Now `member`-role users can delete customers. The reviewer scanned for the discipline lines and saw two of them; the third was supposed to be there and wasn't.

Use a `CodeVariants` block with two tabs: "Shipping bug" (the broken action with no role check, ~15 lines) and "Fixed inline" (the same action with the `if (!roleAtLeast(role, 'admin'))` line added). Prose under the "Shipping bug" tab: name the class — review-fragile defenses are bug factories at PR velocity. Prose under "Fixed inline": this works but it's the *exact* shape a wrapper makes free.

Pedagogical reasoning: the student needs to *feel* the bug before they're sold the fix. Defending "wrappers" abstractly to a course that elsewhere says "no wrappers" will lose them. Showing the bug they'd ship without one closes the sale in 60 seconds.

### The shape: `authedAction(role, schema, fn)`

Land the signature. The factory takes three arguments — the minimum required role, the Zod input schema, and the typed business function `(input, ctx) => Promise<Result<T>>`. It returns a Server Action. The action body becomes pure business logic; everything else lives in the wrapper.

Use a single `Code` block (TS) showing the type signature and one call site (`removeMemberAction`). The call site is ~6 lines: `export const removeMemberAction = authedAction('admin', removeMemberSchema, async (input, ctx) => { /* just the work */ return ok(removed); });`. Prose calls out the three structural wins: role is a *parameter* not a body statement; schema is a *parameter*; `ctx` arrives pre-built.

Then a `CodeTooltips` annotation on the call site — hover `'admin'` ("minimum role; missing this is a type error"), hover `ctx` ("`{ user, orgId, role, db: tenantDb(orgId) }`, built once per call"), hover the return position ("inferred `Promise<Result<TOut>>` from `fn`").

### What the wrapper does in order

The four-step wrapper body, written once, learned forever. Use `AnnotatedCode` with the full ~30-line wrapper implementation as the `code` prop and four `AnnotatedStep`s with colored highlights:

1. **Step 1 — `requireOrgUser()` (green).** Call the 061.1 helper. Returns `{ user, orgId, role }`. If no session or no active org, the helper throws a `redirect` — the wrapper *lets it propagate*. Redirect to `/sign-in` is the right exit; this is not a failure to render in the form, it's an unauthenticated user.
2. **Step 2 — `roleAtLeast(role, required)` (blue).** Compare the user's role against the wrapper's first argument. On failure, *return* `Result.err('forbidden', 'You don't have permission to do this.')`. No throw — the form must render the error and stay on the page; throwing here would surface a 500-style boundary, which is the wrong UX for "your role isn't high enough."
3. **Step 3 — `safeParse(Object.fromEntries(formData))` (orange).** Parse the FormData payload against the schema. On failure, return `Result.err('invalid-input', userMessage, { fieldErrors })`. `treeifyError` shapes the fieldErrors per 046.5.
4. **Step 4 — call `fn(parsed.data, ctx)` (violet).** Build `ctx = { user, orgId, role, db: tenantDb(orgId) }` once. Pass it through. Return what `fn` returned. Type inference flows: `TOut` is inferred from `fn`'s return; the wrapper's signature is `Promise<Result<TOut>>`.

Pedagogical reasoning: `AnnotatedCode` keeps the full wrapper on screen at all times while the student walks through the four seams. Colors map each seam to a discipline (green=identity, blue=authz, orange=input, violet=work). This is the load-bearing visual of the lesson — the *form* of the wrapper teaches the *order* of the discipline.

### The `ctx` payload, pre-built once

A short subsection (3–4 paragraphs, no code). The four fields and why each lives in `ctx`:

- `ctx.user` — the session user, already resolved; the body never calls `auth.api.getSession` again.
- `ctx.orgId` — the active organization id; the body never reaches for `session.activeOrganizationId` directly.
- `ctx.role` — the *DB-read* role; the wrapper read it once via `requireOrgUser`; the body never re-queries.
- `ctx.db` — `tenantDb(orgId)` already bound; the body never sees the unwrapped client.

The senior reflex: *one read per request, one source of truth.* The composition with `tenantDb` (060.2) is structural — the data-layer scope and the action-layer authz arrive together. This is also the moment to land the rule: **`ctx.role` is read from the DB inside the wrapper; never accept role from `formData` or the session payload.** A demoted user's session payload still says "admin"; the DB row says "member"; the DB wins.

### The `Result` return contract

Reiterate the Unit 7 shape (the student knows it; this is a re-anchor). `Result<T>` is `{ ok: true; data: T } | { ok: false; error: { code: string; userMessage: string; fieldErrors?: Record<string, string[]> } }`. The wrapper returns through this for two codes: `'forbidden'` and `'invalid-input'`. The `fn` returns through this for business-logic failures (`'last-owner'`, `'not-found'`, etc.).

Use a small `Code` block (TS) showing the inferred return type of a sample wrapped action — `Promise<Result<{ memberId: string }>>` — to make the inference concrete.

Then the rule: **only `redirect`, `notFound`, and truly-unrecoverable exceptions escape as throws.** Authz failures, parse failures, and business-logic failures *return*. Pedagogical reason: students conflate "exceptional control flow" with "errors"; the course's stance is that *expected* failures (you're not allowed, your input is malformed, the row is gone) are return values, not exceptions. Re-anchor it here at the wrapper's boundary.

### A walk through one form submit

A `Mermaid` sequence diagram inside a `<Figure>`. Actors left-to-right: `Form` → `authedAction wrapper` → `requireOrgUser` → `roleAtLeast` → `schema.safeParse` → `fn` → `Form` (return).

Steps along the time axis:
1. `Form` submits `formData` to the exported action.
2. Wrapper calls `requireOrgUser()` → returns `{ user, orgId, role }`.
3. Wrapper calls `roleAtLeast(role, 'admin')` → boolean.
4. If false, wrapper returns `Result.err('forbidden', ...)` → form renders the error toast/banner. Diagram ends here on the failure path.
5. Wrapper calls `schema.safeParse(Object.fromEntries(formData))` → returns `{ data }` on success or `{ error }` on failure.
6. If failure, wrapper returns `Result.err('invalid-input', ...)` → form renders field errors.
7. On success, wrapper builds `ctx`, calls `fn(parsed.data, ctx)` → `Result.ok(...)`.
8. Wrapper returns the result → form renders success.

Pedagogical reasoning: a sequence diagram makes the *order* of the four steps undeniable, and the two early-exit branches (forbidden, invalid-input) visible. Mermaid is the right engine — sequence diagrams are its strength per the diagrams index.

### The Principle #5 carve-out, named explicitly

A short standalone section. Place it after the wrapper is built so the student sees what *small* looks like before they see the principle that bounds it.

The course's stance (Architectural Principle #5): *consume libraries directly*. Don't wrap Server Actions in a tRPC-style middleware tower for its own sake. Don't wrap `auth.api.*` in a helper layer. Don't wrap Drizzle in a repository class.

The named exceptions, listed and bounded:
- **`tenantDb(orgId)`** (060.2) — wraps Drizzle to make the missing-`where` not compile. Closes a real bug class.
- **`authedAction(role, schema, fn)`** (this lesson) — wraps the action seam to make the missing role check not compile. Closes a real bug class.

The test for whether a new wrapper earns its keep: *does it close a structural bug class that can't be closed by typing or convention?* If yes, it might. If no, it doesn't. Most "let's add another middleware" reaches don't pass this test.

Use a small `Aside` (note) for the carve-out rule: "If a junior on your team reaches for another middleware on `authedAction`, the answer is almost always 'no, put it in the body.' The wrapper is small on purpose."

Pedagogical reasoning: the lesson would feel contradictory without this section. The student deserves the explicit reconciliation between "no wrappers" and "this wrapper." Doing it *after* the wrapper is built (rather than as a defensive preamble) lets the student see the wrapper's smallness first.

### What the wrapper does *not* do

Tight bullet list (no code), one paragraph per item — name what's *not* in the wrapper and where each concern lives instead:

- **Entitlements (paid plan, feature flag)** — different layer; Unit 12 (billing) and a separate feature-flag concern.
- **Rate limiting** — upstream; Chapter 078.
- **CSRF protection** — Next.js Server Actions ship CSRF protection by default. The framework enforces POST-only invocation, encrypted non-deterministic Action IDs (regenerated per build, cached up to 14 days), and a same-origin check that compares the request's `Origin` header against the `Host` / `X-Forwarded-Host`. Don't re-implement it; configure `serverActions.allowedOrigins` in `next.config.ts` if you need additional safe origins.
- **Audit logging** — *inside* the action body, not the wrapper. The body knows what entity changed; the wrapper doesn't. Foreshadow 061.5.
- **Request-scoped logging context** — the wrapper is the *right place* for this (attach user id, org id, role, action name to a logger), but the metrics dashboard that consumes it lands in Unit 20. Name the seam; don't build it now.

Pedagogical reasoning: a wrapper's *boundary* is part of its definition. The student needs to know where each adjacent concern lives so they don't try to grow `authedAction` into a god wrapper at PR #3.

### Audit logging: inside the body, not the wrapper

A short bridge section to 061.5. The audit row records what entity changed, what fields, what the diff was. Only the body knows this. So:

```
authedAction('admin', schema, async (input, ctx) => {
  return ctx.db.transaction(async (tx) => {
    const result = await tx.update(...).returning();
    await logAudit(tx, { action: 'member.role-changed', ... });
    revalidatePath('/settings/members');
    return ok(result);
  });
});
```

A single `Code` block (TS), 12-ish lines. Prose: the wrapper carries authz; the body carries audit; both are explicit. The audit write *must* be in the same transaction as the mutation — the row exists iff the work landed. Full schema, helper, and policy land in 061.5; this preview makes the wrapper's *boundary* concrete.

### The `formData` vs. typed-object call shape

Short section. Server Actions can be invoked from `<form action={...}>` (FormData) or from `useActionState` (typed object). The default `authedAction(role, schema, fn)` accepts `FormData` — `Object.fromEntries(formData)` runs before `safeParse`. A second variant — `authedAction.json(role, schema, fn)` — accepts the parsed object directly for the (rarer) typed-object call path.

Use a `CodeVariants` block with two tabs:
- "FormData (default)" — the canonical React 19 path; `<form action={removeMemberAction}>`; wrapper does `Object.fromEntries`.
- "Typed JSON" — for the typed-object path; the body receives the object as-is.

Prose: name the JSON variant once. Most actions are FormData-shaped per Unit 7; the JSON variant is the conditional reach.

### Watch-outs

A tight bulleted section. Each bullet is one sentence naming the trap, followed by one sentence naming the structural fix. No code.

- **Putting the role check inside `fn` instead of in the wrapper.** Defeats the purpose. The signature *is* the discipline.
- **Accepting `role` from `formData` and trusting it.** The role must come from `ctx.role` which the wrapper read from the DB.
- **Throwing inside `fn` to signal a business-logic failure.** The form's `useActionState` won't surface a typed `fieldErrors`. Return through `Result.err(code, message, ...)`.
- **Nesting `authedAction` calls (calling an action from inside an action).** Actions aren't middleware. If shared logic exists, extract it to a pure function in `/lib`; both actions call it.
- **Mixing `authedAction` and ad-hoc actions in the same feature module.** Discipline drifts. Pick one and grep.
- **Reaching for `after()` (now stable in Next.js 16) to record audit-after-response.** The audit row won't land if the deferred function errors, and the action looks successful from the user side. Audit writes belong inside the action's transaction.
- **Logging "Authorization check threw, assuming allowed" anywhere.** Anything that looks like authz fails closed, including bugs inside the check itself.

Pedagogical reasoning: the watch-out section is where the student's *future* bugs get pre-loaded into their head. Keep each item terse — they're scanning for "did I just do that," not reading prose.

### Live-coding exercise: refactor the inline action

End the lesson with a hands-on refactor. Use `ScriptCoding` (TS mode) — pure refactor, no React iframe needed since this is server-side code.

**Setup.** Student receives a `deleteCustomerAction` written in the Unit 7 inline shape — with `requireOrgUser`, `safeParse`, the mutation, and *no role check*. The role check is also intentionally missing.

**Prompt.** "Refactor this action through `authedAction('admin', ...)`. The wrapper is provided. Move the parse and authz into wrapper arguments; the body should be just the mutation and the return."

**Provided files.** `lib/auth/authedAction.ts` (the full wrapper, already correct), `lib/auth/roles.ts` (`roleAtLeast`, `Role` type), `lib/db.ts` (`tenantDb`), `actions/deleteCustomer.ts` (the file the student edits), `schemas/deleteCustomer.ts` (the Zod schema).

**Grading criteria.**
1. The exported `deleteCustomerAction` is constructed via `authedAction('admin', schema, fn)`.
2. The function body no longer calls `requireOrgUser` or `safeParse` directly.
3. The role argument is `'admin'` (not `'member'` or missing).
4. The body uses `ctx.db` (not the raw `db` import).
5. The body returns `Result.ok(...)` / `Result.err(...)` — no throws on business logic.

Pedagogical reasoning: live coding is the right closer for a *pattern* lesson — the pattern only sticks if the student writes it once. The refactor framing makes the wrapper's *contribution* visible by subtraction: the body shrinks by ~10 lines and a discipline disappears.

### External resources

Two `ExternalResource` cards:
- Next.js 16 Server Actions reference (authoritative docs for the action seam and the built-in CSRF defenses).
- Zod 4 `safeParse` + `treeifyError` reference (the parse step's docs; re-anchors 046.5).

## Scope

**Out of scope, owned elsewhere:**
- The `authedRoute(role, schema, fn)` twin for route handlers (061.3 — port of this discipline to the non-React caller seam). Mention once, point forward.
- Member-management actions (`changeMemberRole`, `removeMember`, `leaveOrg`, `transferOwnership`) that *consume* `authedAction` (061.4 — the wrapper's first real customers).
- The `audit_logs` table shape, three-layer append-only enforcement, and `logAudit(tx, event)` helper (061.5 — foreshadowed here in a single 12-line code block; full treatment owned by 061.5).
- Entitlements and plan-based gating (Unit 12).
- Rate limiting on action invocations (Chapter 078).
- An unauthed-action factory for the public-form path — name once, don't build.
- The full RBAC mental model (`owner` / `admin` / `member`), the authority gradient, the single-owner invariant, and the `roleAtLeast` helper (061.1 — *prerequisite*).
- `requireOrgUser()` returning `{ user, orgId, role }` (061.1 — *prerequisite*).
- `tenantDb(orgId)` and the missing-`where` bug class (060.2 — *prerequisite*).
- `withTenant(orgId, fn)` and the RLS plumbing (060.4 — *prerequisite*).
- The Zod `safeParse` + `treeifyError` shape (046.5 — *prerequisite*; re-anchor only).
- The `Result<T>` contract and the throw-at-the-framework-edge rule (047.3 — *prerequisite*; re-anchor at the return-contract section).
- The five-seam action shape — parse, authorize, mutate, revalidate, return (047.2 — *prerequisite*; this lesson lifts the first two seams into a wrapper).
- Per-feature permissions, ABAC, custom roles (named once in 061.1; conditional reach, not built here).

**Prerequisites referenced briefly without re-teaching:**
- `Result<T>` — one-sentence re-anchor: discriminated union with `{ ok: true; data } | { ok: false; error: { code, userMessage, fieldErrors? } }`.
- `requireOrgUser()` — one-sentence: throws a redirect on no session or no active org; otherwise returns `{ user, orgId, role }`.
- `tenantDb(orgId)` — one-sentence: Drizzle facade that injects the org predicate on every read/write.
- `roleAtLeast(role, required)` — one-sentence: total-order role comparison using the rank constants.
