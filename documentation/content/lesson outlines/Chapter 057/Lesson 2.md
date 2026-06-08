# Lesson outline — The authedAction wrapper

## Title

- **Title:** The authedAction wrapper
- **Sidebar label:** The authedAction wrapper

## Lesson framing

This is a **pattern lesson**, the structural follow-through to lesson 1. Lesson 1 built the *vocabulary* (`Role`, `roleAtLeast`, `requireOrgUser` returning `{ user, orgId, role }`) and the *page-protection* seam (`requireAdmin`/`requireOwner` guards). It closed with a caution: "a protected page is not a protected action." This lesson is the payoff to that promise — it ports the same discipline to the **mutation boundary** and makes the canonical bug ("I forgot the role check") into something that *doesn't compile*.

The single most important idea: **the defense is the call shape, not the discipline inside the body.** A junior fixes missing-role-check bugs by "being more careful in code review." A senior makes the careful thing the *only* thing that compiles. `authedAction(role, schema, fn)` lifts session resolution, role check, and schema parse out of every action body so the body is *just the work*, and the role becomes a *parameter* you can't omit, not a body statement you can forget.

Mental model the student should leave with: a privileged Server Action is a three-layer sandwich — **the wrapper** (session + role + schema, generic, written once) wraps **the business function** (`(input, ctx) => Promise<Result<T>>`, pure-ish, feature-specific). `ctx` is the pre-built kit the wrapper hands down: `{ user, orgId, role, db }` where `db = tenantDb(orgId)` is *already tenant-bound*. The student should be able to (a) read a missing-role-check action and name the bug class, (b) write the `authedAction` signature, (c) refactor an action body down to just-the-work, and (d) explain why this one wrapper is the *sanctioned exception* to "consume libraries directly."

Pedagogical spine — **wrong-then-right**, the archetype the chapter outline calls for and the one lesson 1 already used successfully (the Scattered/Ordered `CodeVariants`). Open on a concrete, plausible production bug (a fast PR ships a privilege escalation), then introduce the signature, then collapse a real action body. This keeps decisions-before-syntax: the student feels the pain before they meet the tool.

Cognitive-load management: build the wrapper **incrementally**, one seam at a time, not as a finished 40-line factory dumped on the page. The four steps (resolve → authorize → parse → call) are introduced in order, each motivated, then assembled. A `DiagramSequence` animates a single form submission flowing through those four gates so the student has a runtime picture before reading the implementation.

Two contract-alignment decisions downstream agents must honor (the chapter outline brainstorm used loose names; the shipped code is canonical):

- **Error codes are the real `Result` contract**, not the brainstorm's ad-hoc strings. Parse failure returns `err('validation', ..., fieldErrors)`; role-check failure returns `err('forbidden', ...)`. The `Result.error.code` union is fixed in `lib/result.ts` (`'validation' | 'conflict' | 'not_found' | 'unauthorized' | 'forbidden' | 'rate_limited' | 'internal'`). Do **not** invent `'invalid-input'` or `'forbidden'`-as-new-code. `'last-owner'` stays a *domain reason code* carried inside the body's own logic (lesson 1's contract), distinct from these transport codes — worth one sentence so the student doesn't conflate the two.
- **The wrapper composes `requireOrgUser()` + an explicit `roleAtLeast` check**, mirroring exactly how lesson 1's `requireAdmin` guard is built. It does *not* lean on a `requireOrgUser(role?)` overload (lesson 1 shipped the no-arg form). The difference from the guard: the guard `redirect`s on insufficient role (page seam); the wrapper *returns* `err('forbidden', ...)` (action seam, so the form can render the message in place). Naming that difference is a teaching beat, not an aside.

## Lesson sections

### Introduction (no header)

Per pedagogical structure: warm, brief, concrete. Re-enter through lesson 1's closing caution. Reuse a named character set if it keeps continuity light, but the load-bearing hook is a **bug story**, told in two or three sentences: a teammate ships `deleteCustomer` in a hurry. They remembered the session check (`requireOrgUser`), they remembered to validate the input (`safeParse`), and they shipped a privilege escalation anyway — because the *third* line, the role check, was supposed to be there and quietly wasn't. The reviewer scanned for three lines and saw two; the missing one doesn't error, it just lets members delete customers.

State the lesson's promise plainly: by the end, that bug *can't compile*, because the role check stops being a line in the body and becomes an argument to a wrapper every privileged action goes through. Connect to what they have: they already have `roleAtLeast` and `requireOrgUser` and `tenantDb`; this lesson assembles those three into one reusable boundary. Preview the deliverable: `authedAction(role, schema, fn)` in `lib/auth/authed-action.ts`, and an action body that shrinks to just-the-work.

Keep it to ~4 short paragraphs. No section header (house style — intro is pre-first-h2 prose).

### Three checks every privileged action owes

**Goal:** establish the problem precisely before any solution, so the wrapper reads as inevitable. This is the "senior question" section, framed implicitly per the guidelines (not a literal "The senior question" header).

Content:
- Name the three pre-conditions every privileged mutation must satisfy *before it touches the DB*: (1) the session is valid, (2) the user clears the required role, (3) the input parses. Tie each omission to its bug class in one line each — no session → the action runs on whatever the caller passed; no role check → privilege escalation; no parse → a malformed/injection payload reaches the query. The student should feel these are *three distinct failure modes*, not one "validation" blob.
- The structural insight, stated outright: the role check is the one that *hides*. The session check tends to be remembered (the action obviously needs a user) and the parse is remembered (you need the typed input to do the work). The role check is the silent omission — nothing downstream forces it, so its absence is invisible until exploited.
- Land the thesis sentence: **the fix isn't "be careful," it's a call shape where the role is a parameter, not a statement.**

Components:
- A short **`Code` block** showing the "today" shape — a real action body carrying all three checks inline (`requireOrgUser`, an inline `roleAtLeast` guard, `safeParse`, then the work), with the role-check line present. Use this as the baseline.
- Then the **wrong version** as a single `Code` block (or fold both into the first `CodeVariants` if it reads cleaner): the *same* action with the role-check line deleted, marked with `del=` framing or a comment. Caption drives home that it still compiles, still passes types, still runs — and is a security hole. This is the wrong half of the wrong-then-right; the right half arrives once the wrapper exists.

Rationale: separating "three checks" conceptually here pays off later — the four wrapper steps map onto these checks plus the call, so the student already has the slots in their head.

Tooltip candidates: **privilege escalation** (`Term`: "a user performing an action above their permission level — here, a member doing an admin-only mutation").

### The signature: `authedAction(role, schema, fn)`

**Goal:** introduce the shape of the solution before its internals. The student should be able to *call* the wrapper before they can *implement* it — usage-first lowers the barrier and matches how they'll actually meet it in the codebase.

Content:
- Present `authedAction` as a **factory**: it takes the minimum required role, the Zod input schema, and the business function, and *returns a Server Action*. Spell out each parameter's job:
  - `role: Role` — the floor, e.g. `'admin'`. Reuses lesson 1's `Role` union. This is the parameter that *was* a forgettable body line.
  - `schema` — the Zod input schema (often `createInsertSchema` from drizzle-zod plus a `.refine`, per conventions; mention but don't teach drizzle-zod here).
  - `fn: (input, ctx) => Promise<Result<T>>` — the typed business function, the *only* part that varies per action.
- Introduce `ctx` here at a high level (full breakdown in the next section): the wrapper hands the function a ready-made `{ user, orgId, role, db }`.
- Show a **canonical call site** — the headline payoff. Something like `export const removeMember = authedAction('admin', removeMemberSchema, async (input, ctx) => { /* just the work */ })`. The reader should see at a glance: the role is *right there* in the call, impossible to omit because it's a required positional argument; the body is pure business logic.
- Naming note (conventions, §Naming): Server Actions are verb+noun (`removeMember`), no `Action` suffix unless disambiguating. The chapter brainstorm uses `removeMemberAction`; downstream should prefer `removeMember` to match the shipped convention, and say so in one line so it's a deliberate divergence from the brainstorm, not drift.

Components:
- **`AnnotatedCode`** on the canonical call site (5–8 lines). Steps: (1) highlight `authedAction(` — "a factory that returns a Server Action"; (2) highlight `'admin'` — "the role is an *argument*; this is the line you used to forget"; (3) highlight `removeMemberSchema` — "the input contract"; (4) highlight `async (input, ctx) =>` and the body — "just the work; everything else moved into the wrapper." Use `color="green"` on the role argument step to make the structural win pop.

Tooltip candidates: **factory** (`Term`: "a function that builds and returns another function — here, `authedAction` builds a Server Action").

### What the wrapper hands you: the `ctx` payload

**Goal:** make `ctx` concrete and motivate why it's pre-built once. This is where the `tenantDb` composition (the data-layer twin) becomes visible and the student sees authz and tenancy arriving *together*.

Content:
- Enumerate the four fields and their source:
  - `ctx.user` — from the session.
  - `ctx.orgId` — the active org.
  - `ctx.role` — the member's role for this org (read by `requireOrgUser`, the fresh-per-request read from lesson 1).
  - `ctx.db` — `tenantDb(orgId)`, **already bound** to the tenant. The body never reaches for the unscoped `db`.
- The discipline: the wrapper builds `ctx` **once** and threads it down. The body never re-queries the session, never re-reads the role, never imports the bare `db`. This is the senior reflex — one resolution per request, one source of truth, handed down.
- The structural point worth dwelling on: `ctx.db = tenantDb(orgId)` means the *moment* an action has authz (via the wrapper) it also has tenant-scoped data access (via `ctx.db`) — the two safety properties are inseparable by construction. Reference lesson 2 of chapter 056 (`tenantDb`) as the established twin; do not re-teach `tenantDb`, just name what it does in half a sentence.

Components:
- A small **`Code` block** or inline `type Ctx = { user: User; orgId: string; role: Role; db: TenantDb }` to pin the shape. Keep it tight.
- Optionally a one-row **`Buckets`** or simple table is overkill here — a typed shape block is enough. Prefer the type.

Tooltip candidates: none new; `tenantDb` is prior knowledge (could get a one-line `Term` for readers who skipped — "the Drizzle client pre-filtered to one org's rows" — but use sparingly).

### Inside the wrapper: four gates in order

**Goal:** build the implementation incrementally, motivating each gate, so the 30-ish-line factory never lands as a wall. This is the conceptual heart of the lesson.

Content — the four steps **in execution order**, each as a beat:
1. **Resolve** — call `requireOrgUser()`. On no session / no active org it `redirect`s (lesson 1's behavior, `/sign-in` and `/select-org`). The wrapper lets that redirect propagate — it's a framework-edge exit, not a `Result`. This is the one place a throw/redirect is correct.
2. **Authorize** — `roleAtLeast(ctx.role, required)`. On failure, **return** `err('forbidden', 'You don't have permission to do this.')`. *Do not throw, do not redirect* — the form needs to render the error in place and stay on the page. Explicitly contrast with lesson 1's `requireAdmin` guard, which *redirects*: same check, different exit, because pages and actions have different UX needs.
3. **Parse** — `safeParse(Object.fromEntries(formData))`. On failure, return `err('validation', 'Check the highlighted fields.', z.flattenError(result.error).fieldErrors)`. Use the flat `fieldErrors` projection (conventions §Schemas: the course's `Result` uses `z.flattenError(...).fieldErrors`). Order matters: this runs *after* authorize so an unauthorized caller never even reaches parsing — but note the brainstorm's "parse first" instinct and reconcile: the course's documented five-seam order is `parse → authorize`, *but* the wrapper authorizes before parsing because there's no reason to validate input for a caller who can't act. Flag this as a deliberate, defensible ordering choice and keep it consistent with whatever the build agent ships — recommend resolve → authorize → parse so the cheapest *security* gate fails fastest. (One sentence acknowledging the tension; don't belabor.)
4. **Call** — `fn(parsed.data, ctx)` and return its `Result` straight through. The wrapper's return type is `Promise<Result<TOut>>`, `TOut` inferred from `fn`.

Then assemble: show the **whole wrapper** once, after the four beats, so the student sees the pieces snap together.

Components:
- **`DiagramSequence`** — the load-bearing visual the chapter outline asks for. Animate one form submission through the four gates. Steps (one `DiagramStep` each, the active gate lit, others dimmed): (1) *Form submit* — `FormData` arrives at the wrapper; (2) *Resolve* — `requireOrgUser` returns `{user, orgId, role}` (or redirects out, show the branch); (3) *Authorize* — `roleAtLeast` passes/fails, fail branch returns `forbidden`; (4) *Parse* — `safeParse`, fail branch returns `validation`; (5) *Call* — `fn(input, ctx)` runs the work and returns `Result`. Build the boxes as simple HTML nodes (a horizontal `.gate` strip) per the DiagramSequence pattern; cap height. Pedagogical goal: a runtime mental model of *the order and the exit at each gate* before reading code. Each step's caption names what's returned/thrown on the failure branch — that's where the `Result`-vs-redirect distinction becomes vivid.
- **`AnnotatedCode`** on the assembled wrapper (this will exceed the 18-line `maxLines` visible cap — fine, it scrolls; set `maxLines={18}` and let steps scroll the active region into view). Four steps, color-coded: resolve (blue), authorize (green, the headline gate), parse (orange), call (violet). Each step's prose ≤6 lines, names the gate's job and its failure exit.

This section deliberately splits the *picture* (DiagramSequence) from the *code* (AnnotatedCode) so the student gets the model first, then the implementation — minimizing load.

Tooltip candidates: `CodeTooltips` on the wrapper fence is an option for `Object.fromEntries` ("turns FormData entries into a plain object Zod can parse"), `z.flattenError` ("Zod 4: returns `{ formErrors, fieldErrors }`; `fieldErrors` is `Record<string, string[]>`"). Use `CodeTooltips` rather than prose interruptions.

### The return contract: `Result`, not exceptions

**Goal:** lock the discipline that every *expected* failure flows back as `Result`, and only framework-edge throws escape. This is fail-closed thinking applied to the action seam.

Content:
- Restate the `Result<T>` shape briefly (it's from Unit 6 / `lib/result.ts` — prior knowledge, redefine in one block, don't re-teach): `{ ok: true; data } | { ok: false; error: { code, userMessage, fieldErrors? } }`. The wrapper's return type is `Promise<Result<TOut>>` with `TOut` inferred from `fn`.
- The rule: **every error path returns through `Result`** — forbidden, validation, and the body's own business failures (`'conflict'`, `'not_found'`, the `'last-owner'` domain reason carried inside an `err`). Only genuine framework-edge throws escape as exceptions: `redirect`, `notFound`, and truly-unrecoverable programmer errors. This mirrors conventions §Error handling ("return the expected, throw the unexpected") — name the principle inline at the moment it applies, per the guidelines.
- The **fail-closed reflex**, stated as the senior anti-trap: anything that *looks like* authz fails closed — including a bug *inside* the check. Never write a `catch` that logs "auth check threw, assuming allowed." If `roleAtLeast` or the session read throws unexpectedly, the action denies. (Conventions §Error handling: "every gate that controls access treats an exception inside the check as a refusal.") Foreshadow that this reflex gets revisited at depth later in the course (the security-baseline chapter) — name it once, don't expand.
- Tie to the form side in one sentence: because failures come back as typed `Result`, the form's `useActionState` can render `state.error.fieldErrors?.<field>?.[0]` and `state.error.userMessage` — the typed error contract is *why* the form can show inline messages. Don't build the form here (that's prior knowledge / not this lesson's scope), just close the loop on *why* `Result` over throw.

Components:
- A small **`Code` block** showing the `Result<T>` type if a quick refresher earns its place; otherwise inline reference. Prefer brevity — this is recall, not new material.
- **`Aside` (caution)**: the fail-closed rule. "Authorization that can throw must throw *closed*. A `catch` around an authz check defaults to deny, never to allow." Mirrors lesson 1's use of `:::caution` for the page-vs-action distinction.

### The one wrapper we sanction: the Principle #5 carve-out

**Goal:** the *architectural* payoff and the named carve-out the chapter outline flags as belonging specifically to this lesson. The student should understand *why* this wrapper exists when the course's whole stance is "consume libraries directly," and crucially *where the line is* so they don't over-build.

Content:
- State the course principle plainly: the default is **consume libraries directly** — don't build a tRPC-style middleware tower around Server Actions for its own sake. Most "let's add an abstraction layer" instincts at the action boundary are wrong.
- Then the carve-out, named explicitly: **`authedAction` is the sanctioned exception, paired with `tenantDb` as its data-layer twin.** It earns the exception because authz at the action boundary has a *real, recurring bug class* (the missing role check from §1) that a structural wrapper *closes* — and nothing else at this boundary clears that bar. The justification is the bug class, not "abstraction is nice."
- The senior reflex that keeps the wrapper *small*: when a junior says "let's add another middleware step to `authedAction`" — logging, entitlements, rate limiting — the answer is usually "no, put it in the body or its proper layer." The wrapper is precisely **session + role + schema** and deliberately nothing more. Enumerate the explicit non-responsibilities (short):
  - **Not entitlements** (paid-plan / feature-flag checks) — different layer, billing in a later unit.
  - **Not rate limiting** — lives upstream, its own chapter.
  - **Not CSRF** — Next.js Server Actions ship CSRF protection by default (POST-only invocation plus an Origin/Host header comparison, on top of SameSite cookies); the wrapper doesn't and shouldn't touch it. (Verified June 2026 against Next.js security docs — keep the mechanism description accurate: it's the Origin↔Host check, not a CSRF token.)
- The **audit-log seam**, foreshadowed correctly: privileged writes record an audit row, but that belongs *inside the body*, not in the wrapper — because the body knows *which entity* changed and *what the diff* was; the wrapper is entity-agnostic. One sentence: "the wrapper carries authz; the body carries audit." Point to lesson 5 of this chapter for the table and the write call. This sets up the right division so the student doesn't expect the wrapper to magically audit.

Components:
- A two-column **`Buckets`** exercise (classification): "What belongs *in the wrapper* vs. *not the wrapper*?" Items: session check ✓, role check ✓, schema parse ✓ | entitlement/plan check ✗, rate limit ✗, CSRF ✗, audit-log write ✗ (belongs in body), the business mutation ✗ (belongs in `fn`). Goal: cement the wrapper's exact scope through active sorting. Grading: each item lands in the correct bucket. This is a strong fit — the section is fundamentally a *boundary* lesson, and `Buckets` makes the boundary tactile.

Rationale for giving the carve-out its own section: the chapter framing explicitly says "the carve-out from Principle #5 is *named once* at this lesson." It's a thesis-level beat, not a footnote — it deserves a header and an exercise.

### Refactor: from forgotten check to wrapped action

**Goal:** the wrong-then-right loop closes here as *hands-on* work. The student takes a vulnerable action and routes it through `authedAction`, feeling the body collapse to just-the-work.

Content:
- Present the **before**: a complete-ish action with the missing role check (the §1 bug, now familiar), written the "old" inline way. Then the **after**: the same logic as `authedAction(role, schema, fn)` with the body reduced to the read/validate-business-rule/write/`revalidatePath`/`ok(...)` return.
- Walk the diff in prose: what *left* the body (session resolution, role check, parse) and what *stayed* (the actual mutation + revalidate + return). The win the student should articulate: the role is now un-forgettable because it's a required argument.

Components:
- **`CodeVariants`** — "Before (inline, vulnerable)" vs. "After (wrapped)" tabs, with `del=`/`ins=` framing inside each pane and a one-paragraph caption per tab. This is the canonical before/after use of `CodeVariants` and matches lesson 1's Scattered/Ordered pattern for chapter continuity.
- **`ScriptCoding`** (runner `sandpack`, since this needs TS) as the live exercise the chapter outline calls for. Design:
  - **Instructions:** "This `deleteCustomer` action validates input and checks the session but anyone can call it — the role check is missing. A minimal `authedAction` is provided. Refactor the action to go through it so only admins can run it, and the body is just the work."
  - **Starter:** a stubbed `authedAction` (or a simplified pure version that returns a callable taking parsed input + ctx — kept runnable without Next.js internals), a `Result`/`ok`/`err` shim, a fake `tenantDb`/role source, and the vulnerable `deleteCustomer`. Because the real wrapper depends on `requireOrgUser`/`headers`/Next runtime that can't run in Sandpack, **the exercise must use a test-double wrapper** — note this explicitly for the build agent: model `authedAction` as a higher-order function over an injectable `getCtx()` so the test can feed it an `admin` ctx and a `member` ctx. Keep the *shape* identical to the lesson's wrapper (role, schema, fn) so the skill transfers; the plumbing is faked.
  - **Tests:** (1) calling the wrapped action with a `member` ctx returns `{ ok: false, error: { code: 'forbidden' } }`; (2) calling with an `admin` ctx and valid input returns `{ ok: true }` and performs the delete (assert against the fake store); (3) invalid input returns `{ ok: false, error: { code: 'validation' } }`. Grading is criteria-driven on these assertions.
  - Provide a reference solution behind a `<details>` per the components index.
  - **Fallback note for the build agent:** if Sandpack plumbing proves too heavy for a faithful exercise, downgrade to a `Sequence` ordering drill ("order the four gates the wrapper runs") plus a `Dropdowns` fill-in on the wrapper signature — both run with zero runtime. Prefer the `ScriptCoding` if a clean test-double fits; the guided coding is pedagogically stronger than the ordering drill.

Tooltip candidates: none new.

### Where this discipline goes next (closing)

**Goal:** short outro that consolidates and forward-links, mirroring lesson 1's closing paragraph. No exercise.

Content:
- One-paragraph recap: the student now has `authedAction` — one wrapper, four gates, a pre-built `ctx`, a `Result` return — and the missing-role-check bug is now a compile-time impossibility for any action that goes through it.
- Forward links (named, not taught): **lesson 3** ports the *same* discipline to the route-handler seam (`authedRoute`) for non-React callers, where the response shape is HTTP + Problem Details instead of `Result`. **Lesson 4** is the first big consumer — the five member-management actions, all built on `authedAction`. **Lesson 5** lands the audit-log write that lives inside the body. Keep each to a clause.

Optionally one **`ExternalResource`** card: Next.js docs on Server Actions / security, or the React `useActionState` reference — only if it adds genuine value; the lesson is self-contained, so this is optional.

## Scope

**Prerequisites (redefine in one line each, do not re-teach):**
- `Role`, `roleAtLeast`, `ROLE_RANK` — lesson 1; the typed role vocabulary and the authority-gradient comparison.
- `requireOrgUser()` → `{ user, orgId, role }`, redirects `/sign-in` / `/select-org` — lesson 1; the fresh-per-request session+role read.
- `requireAdmin`/`requireOwner` guards — lesson 1; the *page* seam this lesson contrasts against.
- `tenantDb(orgId)` — chapter 056 lesson 2; the tenant-bound Drizzle client that becomes `ctx.db`.
- `Result<T>`, `ok`/`err`, `safeParse`, the five-seam action shape, `useActionState` form wiring — Unit 6 / Code conventions; the action and error-handling foundation.

**This lesson does NOT cover (reserved elsewhere):**
- The route-handler twin `authedRoute(role, schema, fn)`, HTTP status map, RFC 9457 Problem Details — **lesson 3**.
- The five member-management actions (change role, remove, leave, transfer) and their invariants — **lesson 4**. This lesson may use `removeMember` as the *running example* but builds no complete member-management surface and does not implement its invariants.
- The `audit_logs` table, `logAudit(tx, event)`, what gets recorded — **lesson 5**. This lesson only foreshadows that the audit write lives in the body.
- Entitlements / plan-based gating — Unit 11; named once as a wrapper non-responsibility.
- Rate limiting on action invocations — later chapter; named once as a non-responsibility.
- CSRF mechanics — named once (framework handles it by default); not taught.
- An unauthed-action factory for public forms — named once as a future shape; not built.
- Building/teaching the form UI (`<form>`, `useActionState`, `<SubmitButton>`) — Unit 6; only referenced to close the "why `Result`" loop.
- `drizzle-zod` schema derivation at depth — referenced as the schema source; not taught here.
- `unstable_after` / `after()` for post-response work — mention only inside the audit foreshadow if at all (the senior trap is that audit must be *in-transaction*, not in `after`); do not teach `after()` mechanics.

## Notes for downstream agents

- **Verify the Better Auth role-read API name** at build time: lesson 1 shipped `auth.api.getActiveMemberRole({ headers })` inside `requireOrgUser`. The wrapper should call `requireOrgUser()` and *not* re-read the role independently — reuse the helper. Don't introduce a second role-read path.
- **File location:** `lib/auth/authed-action.ts` (sibling to `roles.ts` and `guards.ts`), with `import 'server-only'` at the top (it composes `requireOrgUser` and `tenantDb`, both server-only). Note this for the build agent — `roles.ts` is the only file in `lib/auth/` *without* `server-only`.
- **Naming divergence from the brainstorm is deliberate:** prefer `removeMember` over `removeMemberAction` (conventions §Naming). Call this out once in the lesson so it reads as intentional.
- **`FormData` is the default call shape**; the typed-object/JSON variant (`authedAction.json`) may be *named in one sentence* but should not be built or taught here — it's a rarer path and adds load. Keep the lesson focused on the `FormData` → `Object.fromEntries` → `safeParse` path (the canonical React 19 form path).
