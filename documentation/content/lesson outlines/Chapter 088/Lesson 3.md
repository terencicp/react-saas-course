# Lesson title

- Title: The signedInAs fixture
- Sidebar label: signedInAs fixture

# Lesson framing

This is a pattern lesson. The deliverable is a single auth fixture — `signedInAs(opts, tx)` — that every Server Action and route-handler integration test in the rest of the chapter (and the project chapters) will call as line one of its Arrange block. By the end the student should reach for `await signedInAs({ role: 'admin' }, tx)` as reflexively as they reach for `buildInvoice({...})`, and be able to explain *which seam it stubs and why that seam and not a deeper one*.

The senior question that motivates the whole lesson: every protected action reads the session and checks `user.role` / `orgId`. Without a fixture, each test re-implements a five-line session stub — a hand-faked cookie, a hand-faked session object, a forgotten `orgId` — and the duplication rots into false-passing authz tests. The reach is **one factory call that returns a signed-in test context**.

Three pedagogical spines:

1. **Build the fixture incrementally, smallest-thing-first.** Don't open with the final generic signature. Start with the duplicated five-line stub the student would write by hand, feel the pain (forgotten `orgId`, leaked identity), then extract `signedInAs` one responsibility at a time: (a) insert real rows in `tx`, (b) stub the session seam, (c) stub cookies + Origin for CSRF, (d) parameterize role/plan/tenant. Each step removes a concrete pain. This keeps cognitive load low — the student sees *why* each part of the final fixture exists rather than reverse-engineering a finished artifact.

2. **"Which seam?" is the load-bearing decision.** The course auth is **Better Auth** (not Auth.js / NextAuth — the chapter outline's `auth()` / `@/auth` naming is a placeholder; correct it to the real surface). The session-read ladder is `getCurrentUser()` / `requireUser()` / `requireOrgUser(role?)` in `lib/auth.ts`, all funneling through `auth.api.getSession({ headers })`. The fixture stubs **`lib/auth.ts`** (the project's single auth seam) — high enough that the action's real authorize/parse/mutate path runs, low enough that we don't fake Better Auth internals or the cookie-signing crypto. Drive this home with a "too shallow / right / too deep" spectrum: too shallow = mock `requireOrgUser` only (skips nothing useful but couples to one helper); right = mock the `auth` seam so all three ladder helpers resolve from one fake session; too deep = mock `getSessionCookie` / the JWT verifier (breaks on every Better Auth update, tests fiction).

3. **Boundary policing — the fixture owns *identity*, not *activity*.** The single most common way this fixture rots in the real world is scope creep: someone adds `invoiceCount` or `hasActiveSubscription` to `signedInAs` and it becomes a god-object. Hammer the line: `signedInAs` answers "who is signed in"; per-test factories answer "what exists in their world" (`await buildInvoice({ orgId: ctx.org.id }, tx)`). This is a senior-mindset point (keeping a test helper changeable), not a syntax point.

Real-DB rows + a stubbed session is a deliberate hybrid that needs an explicit one-paragraph justification, because a naive reader expects "if we stub the session, why insert real rows?" Answer: the action's *own* DB reads (`requireInvoice`, tenant queries) run against `tx` and must find a real `user`/`org`/`membership`; only the *session decode* is stubbed because re-deriving a Better-Auth-signed cookie and round-tripping it through the adapter is ceremony that tests the framework, not our code. Make this contrast a small diagram.

Running domain stays `createInvoice` / `invoices` / `organizations` / `users` (chapter convention) so the student sees one example deepen.

Carries forward from prior lessons without re-teaching: `withRollback` + the `tx` seam (088 L1), per-worker DB + `setupFiles` lifecycle + `seedBaseline` (088 L2), `build*` in-memory factories + `sequence()` (087 L2), `FROZEN`/`freezeClock` clock seam (087 L3), `toBeOkResult`/`toBeErrResult` matchers and lowercase-snake `Result` codes (`'unauthorized'`, `'forbidden'`, `'validation'`) (087 L6). The fixture *composes* these, it does not restate them.

No quiz (chapter-level lesson 9 owns it). Estimated 40–50 min.

---

# Lesson sections

## The session stub you write by hand, five tests in

**Goal.** Establish the senior question by making the student feel the duplication before offering the fixture. Open with a concrete protected action under test and the raw, fixture-less test a developer writes first.

Show `createInvoice` (the chapter's running action) abbreviated to its wrapper shape so the seams are legible: `authedAction('member', createInvoiceSchema, async (input, { user, orgId, db }) => { ... })`. One sentence each on the five seams (`parse → authorize → mutate → revalidate → return`) — but make explicit that *this lesson only owns the authorize seam's test scaffolding*; parse/mutate/revalidate assertions are 088 L7. Use a single plain `Code` block (no AnnotatedCode here — the action is context, not the object of study).

Then show the hand-rolled test in a `Code` block: a `withRollback` body that manually does `tx.insert(users)...`, `tx.insert(organizations)...`, `tx.insert(memberships)...`, a hand-built fake session object, `vi.mock('@/lib/auth', ...)` inline, plus a stub `cookies()`. Deliberately make it ~18 lines and slightly wrong (forget the `orgId` on the membership, or use the same hardcoded `user_1` id). 

Narrate three failure modes a reviewer would flag, as inline prose right after the block (not a separate watch-out section):
- Forgotten `orgId` → user silently lands in the seed org → a cross-tenant test passes by accident (false negative). Tie back to 087's `false negative` term.
- Reused hardcoded `user_1` across two tests → aliasing → run-order coupling (087 term) once tests mutate that row.
- Inline `vi.mock('@/lib/auth')` at file scope → identity leaks into the next test in the file unless reset.

Close with the thesis sentence: every protected test needs the same arrange; duplicating it is how authz tests rot; extract it once. This is the bridge into building the fixture.

**Term tooltips here:** `seam` (re-def from 087 — deliberate swap point), `false negative` (re-def — green test, broken code).

## What one call should hand back

**Goal.** Define the fixture's contract (the shape) before any implementation, so the rest of the lesson is "make this real." Keep it to the signature + return shape + the identity-vs-activity boundary.

State the target signature in a `Code` block:
```
signedInAs(opts: SignedInOptions, tx: DbOrTx): Promise<SignedInContext>
```
with `SignedInOptions = { role?: Role; plan?: Plan; orgId?: string }` (all optional) and `SignedInContext = { user: User; org: Organization; session: Session; cookieJar: CookieJar }`. Defaults: `role: 'member'`, `plan: 'free'`. Note `tx` is passed explicitly (not ambient) — consistent with the explicit-handle course default from 088 L1; the fixture is *called inside the `withRollback` body* where `tx` is in scope.

Use a small **`Figure` (hand-coded HTML/CSS, two-column "owns / does not own" table-card)** to lock the boundary:
- **`signedInAs` owns (identity):** the `user` row, the `org` row (or reuse seed org), the `membership`/role link, the `session`, the cookie + Origin headers.
- **Per-test factories own (activity):** "the user has 3 invoices", "the org is on a past-due subscription", "there's an existing invoice with this number". Shown as `await buildInvoice({ orgId: ctx.org.id }, tx)` ×3.

Pedagogical goal of the figure: pre-empt the god-object failure mode by drawing the line *before* the student is tempted to cross it. Caption: "Identity is the fixture's job; world-state is the test's job."

Also introduce the two named contexts the fixture module exports and *nothing else*: `signedInAs` and `anonymous`. Defer `anonymous`'s body to its own section; here just name it as the deliberate counterpart so the student knows the unauthenticated path has a first-class call too.

**Term tooltips:** `CSRF` (Cross-Site Request Forgery — a forged cross-origin request riding the user's cookie; Next.js guards Server Actions by checking `Origin`), `CookieJar` (a tiny `Map`-backed stand-in exposing the `.get`/`.set` surface that `cookies()` returns).

## Inserting the real user, org, and session

**Goal.** Build responsibility (a): the DB-inserting half of the fixture, and justify the real-rows + stubbed-session hybrid explicitly.

This is the lesson's first deep code build. Use **`AnnotatedCode`** on the insert half of `src/test/fixtures/auth.ts`, stepping through:
1. Signature + defaults destructure (`{ role = 'member', plan = 'free', orgId }`).
2. Reuse-or-create the org: if `orgId` given, look it up (or build with that id); else `buildOrganization()` and insert. Note this is where multi-tenant tests pin `org_A` / `org_B`. Use the 087 `buildOrganization` / `buildUser` factories for valid defaults, then *insert* them via `tx` — call out the difference from 087: those factories returned in-memory rows; here we persist them inside the transaction so the action's own queries see them.
3. Insert the `user` (fresh per call — `buildUser()` gives a `sequence()`-unique id, killing the aliasing bug from section 1).
4. Insert the `membership` row linking `user` → `org` with `role` (this is the row `requireOrgUser` reads to resolve role + tenant; getting it right is what makes authz assertions real).
5. Build the `session` row referencing the user (token, `expiresAt` from the `FROZEN` clock seam so it's deterministic and not "expired" relative to wall-clock — reuse 087 L3's `FROZEN`).
6. `return { user, org, session, cookieJar }` (cookieJar built in the next section; here it's a forward crumb).

Each step's prose ≤6 lines, `color="blue"` default; tint the `tx`-threading step `green` to echo 088 L1's rollback-safety color if that convention is in play (note it as optional for the writer).

**The hybrid justification — its own short prose paragraph immediately after the AnnotatedCode**, supported by a small **`Figure` (ArrowDiagram or simple HTML two-lane diagram)**: 
- Lane A (real, in `tx`, rolls back): action body → `requireInvoice` / tenant query → reads `user`/`org`/`membership`/`invoices` rows.
- Lane B (stubbed): action wrapper → `requireOrgUser` → `auth.api.getSession` → **fake session** (no DB round-trip, no cookie crypto).
The pedagogical point: we insert real rows because the action *reads its own data* from `tx`; we stub only the session decode because round-tripping a Better-Auth-signed cookie tests the framework, not our code. Caption: "Real where our code reads; stubbed where the framework reads."

**Watch-out woven into prose (not a list):** calling `signedInAs` *outside* a `withRollback` body inserts against the committed seed DB and leaks a user into every later test — the cardinal sin. Tie to 088 L1's silent-commit class of bug.

**Term tooltips:** `membership` (the join row carrying a user's role within one org — what `requireOrgUser` reads), `FROZEN` (re-def — the canonical `2026-01-15T12:00:00Z` test instant from 087 L3).

## Stubbing the auth seam, not its internals

**Goal.** Build responsibility (b): the session stub, and make the "which seam" decision explicit and durable. This is the conceptual heart of the lesson.

Lead with the spectrum, taught as a **`CodeVariants`** ("too shallow / right / too deep") — three tabs, each a stub strategy with its tradeoff in the first sentence:
- **Too shallow — mock `requireOrgUser` directly.** `vi.mock('@/lib/auth', () => ({ requireOrgUser: () => ({ user, orgId, role }) }))`. First sentence: "Works, but couples every test to one helper and silently skips `getCurrentUser` / `requireUser` callers." It also bypasses the wrapper's real branching.
- **Right — stub the session at `auth.api.getSession`.** Mock `@/lib/auth`'s `auth` so `auth.api.getSession({ headers })` resolves the fixture's `{ user, session }`; the real `getCurrentUser`/`requireUser`/`requireOrgUser` (which all funnel through `getSession`) compute their results from it. First sentence: "One fake feeds all three ladder helpers; the action's real authorize logic runs." Mark this the course default.
- **Too deep — mock `getSessionCookie` / the JWT verifier.** First sentence: "Tests Better Auth's crypto, not your code — and shatters on every library update." 

Pedagogical goal: the student leaves able to *articulate the seam-depth heuristic* ("mock at the boundary your code calls, not the library's guts"), which is the same principle 088 L4 applies to SDKs — forward-link it lightly ("same instinct you'll apply to Stripe next lesson").

Then the mechanics of the "right" choice, in prose + a `Code` block:
- The mock is registered **once in the integration `setupFiles`** (established in 088 L2's lifecycle table) with `vi.fn()` placeholders; `signedInAs` sets the *per-call* implementation via `vi.mocked(auth.api.getSession).mockResolvedValue({ user, session })`. Contrast file-scope-static (leaks) vs per-call (clean) — this is *why* the fixture, not a top-level `vi.mock`, owns the implementation.
- **Hoisting note (brief, reuse 087 L3 crumb):** `vi.mock` is hoisted above imports; keep the auth import static so the hoist sees it. One sentence; depth was 087 L5. Crucially, this is *why* the `setupFiles` factory must register only `vi.fn()` placeholders and the per-call session is set later via `mockResolvedValue` — a hoisted `vi.mock` factory cannot close over the per-call `{ user, session }` (no top-level variables allowed in a hoisted factory). Make this causal link explicit so a downstream agent doesn't try to bake the session into the factory.
- **Reset discipline:** `afterEach(() => vi.mocked(auth.api.getSession).mockReset())` (or the suite-wide `vi.resetAllMocks()` from 087 L3) lives in `setupFiles`, not in each test. State *why*: a leftover session implementation makes the next test pass as the wrong user — a textbook flake (forward-crumb 088 L8).

**Watch-outs in prose:** mocking `auth` *and* setting a real cookie creates two sources of truth (the action might read either); dynamic-`import()` of the auth module in production code dodges `vi.mock` hoisting — keep auth imports static.

**Term tooltips:** `hoisting` (Vitest lifts `vi.mock` calls above the file's imports so the mock is in place before modules load), `getSession` (Better Auth's `auth.api.getSession({ headers })` — the one call the whole session ladder funnels through).

## The cookie jar and the Origin header

**Goal.** Build responsibility (c): the cookie + header surface, framed entirely around the real failure it prevents — the CSRF check that, when missed, masquerades as "auth is broken."

Open with the trap as a concrete story: a test stubs the session perfectly, calls the action, and gets a generic failure that *reads* like an auth bug. The real cause: Next.js 16 Server Actions validate the request `Origin` against the host; with no Origin header the action is rejected before its body runs. Without naming this up front, a student burns an afternoon. This is the "pain point the tech relieves" framing.

Two small pieces, each a `Code` block:
1. **`cookieJar`** — a `Map<string, string>` wrapped to expose exactly `cookies()`'s read surface (`.get(name) → { name, value } | undefined`, `.set`, `.delete`, `.has`). Keep it minimal — only the methods the action actually calls. Note `cookies()` is async in Next 16 (`await cookies()`), so the `next/headers` mock returns the jar from an async function. Reuse the 088 L2 fact that the `next/headers` mock is registered in `setupFiles`; the fixture only *populates* the jar per call.
2. **Origin/host headers** — extend the same idea to a `headers` jar (or `requestContext`) carrying `Origin` and `Host` set to the same value so the CSRF check passes. The fixture sets these to a canonical test origin. State plainly: omit this and *every* action test fails the CSRF gate.

Pedagogical note for the writer: do **not** deep-dive Next's CSRF mechanism (that's a Unit 8 / Server-Action-security concern, out of scope) — teach only "set Origin = Host and the gate passes; here's why your test failed without it." Keep it operational.

**Watch-out in prose:** stubbing `cookies()` but not the Origin header is the silent failure; conversely, hand-faking the *signed* session cookie (instead of stubbing `getSession`) reintroduces the framework-crypto coupling section 4 rejected.

**Term tooltips:** `Origin header` (the browser-set header naming the page's scheme+host that issued the request — Server Actions compare it to the host to reject cross-site posts).

## Roles, plans, and tenants as one call argument

**Goal.** Build responsibility (d): parameterization, and connect each option to the authz branch it exercises. This is where the fixture pays off — one call, every access scenario.

Show the option matrix and what each unlocks, in prose anchored to the running action:
- **Role.** Default `'member'`. `signedInAs({ role: 'admin' })` for privileged paths; `signedInAs({ role: 'guest' })` (or whatever the lowest role is) for the forbidden path that asserts `toBeErrResult('forbidden')`. The membership row's role drives `requireOrgUser('admin')`'s decision.
- **Plan.** Default `'free'`. `signedInAs({ plan: 'pro' })` to pass a plan gate; `{ plan: 'free' }` on a pro-only action asserts the plan-required refusal. Note: the *value* asserted is the `Result` code, never the user-facing message (087 L6 thesis — assert the code).
- **Tenant.** `signedInAs({ orgId: 'org_A' })`. The canonical cross-tenant test: sign in to `org_A`, build a row under `org_B`, assert the `org_A`-scoped query can't see it. The fixture creates both orgs; the assertion proves tenant scoping. Explicitly: **always name `orgId` in a cross-tenant test** — relying on the default seed org for both sides is the bug that makes isolation tests pass vacuously.

**Type-safety as a feature, not a footnote.** Make `signedInAs<R extends Role, P extends Plan>` generic so `SignedInContext<R, P>` carries the literal role/plan, and adding a role to the schema breaks every call site that doesn't account for it — at compile time. Show this in a short `CodeTooltips` block tooltipping the generic params and the `Role`/`Plan` union sources (derived from the Drizzle enum, per 087's `InferSelectModel` instinct — types flow from the schema, never hand-listed). Pedagogical point: the type system is doing free regression detection on the auth surface.

**Exercise — `Buckets` (two-column, classification).** Goal: cement the identity-vs-activity boundary *and* the role/plan-vs-tenant mapping, which is the lesson's highest-value retained idea. Two buckets: **"A `signedInAs` argument"** vs **"A per-test factory call."** Items (shuffled): "the user is an admin" (arg: role) / "the user is on the pro plan" (arg: plan) / "the user belongs to org_A" (arg: orgId) / "the user has 3 paid invoices" (factory) / "an invoice already exists with number INV-1001" (factory) / "the org's subscription is past due" (factory) / "the request is unauthenticated" (neither / `anonymous()` — include as a decoy that belongs in *neither* bucket, and address in the check-prose that this one is its own context). Instructions prop: "Decide what `signedInAs` should know vs. what the test arranges separately." This directly drills the god-object boundary.

**Term tooltips:** `Role` / `Plan` (TS unions derived from the Drizzle column enums — the source of truth for which roles/plans exist).

## Naming the unauthenticated path with `anonymous`

**Goal.** Give the no-session case a first-class, intention-revealing call, and close the fixture module's public surface.

Short section. Show `anonymous()` in a `Code` block: it sets `getSession` to resolve `null` and leaves the cookie jar empty (no Origin still needed? — clarify: an unauthenticated action call may still hit the CSRF gate before the session check, so `anonymous()` *also* sets the Origin/Host headers; only the session is null). Returns nothing useful (or a minimal `{ cookieJar }`) — its value is the *named intent* at the call site.

The canonical use: `it('refuses when signed out', withRollback(async ({ tx }) => { anonymous(); const r = await createInvoice(input); expect(r).toBeErrResult('unauthorized'); }))`. Contrast with simply omitting `signedInAs`: calling the action with *no* fixture leaves whatever the previous test's mock left behind — `anonymous()` makes "no session" explicit and reset-safe. This reinforces the reset-discipline thesis from section 4.

State the module's closed surface: `src/test/fixtures/auth.ts` exports exactly `signedInAs` and `anonymous`. Nothing else. A growing export list is the god-object smell.

**Exercise — `Dropdowns` (fenced code, fill the blanks).** A complete, realistic authz test file skeleton with `___` at the load-bearing decisions, to make the student assemble the pattern end-to-end. Blanks (in source order): the fixture call `___({ role: 'guest' }, tx)` [answer `signedInAs`, options `signedInAs` / `anonymous` / `buildUser`]; the matcher `toBeErrResult('___')` for the forbidden case [answer `forbidden`, options `forbidden` / `unauthorized` / `validation`]; the unauthenticated case's call `___()` [answer `anonymous`, options `anonymous` / `signedInAs` / `logout`]; its matcher code `'___'` [answer `unauthorized`, options `unauthorized` / `forbidden` / `not_found`]. This checks both the call surface and the 087-L6 "assert the code" discipline in one drill. Pre-req note for writer: keep the surrounding `withRollback` / `describe` shape correct so the only choices are the four blanks.

---

# Scope

**Already taught — redefine in one line max, do not re-teach:**
- `withRollback` + threading `tx` (088 L1) — the fixture is *called inside* a `withRollback` body and takes `tx`; assume the student knows it. One-line reminder only.
- Per-worker DB, `setupFiles` vs `globalSetup`, `seedBaseline` (088 L2) — the fixture's mocks (`@/lib/auth`, `next/headers`) are registered in `setupFiles`; the seed org is the default tenant. Reference, don't rebuild the lifecycle.
- `build*` in-memory factories, `sequence()`, valid-defaults rule (087 L2) — `signedInAs` *composes* `buildUser`/`buildOrganization` then persists them; do not re-explain the factory pattern.
- Clock seam `FROZEN` / `freezeClock` (087 L3) — used for deterministic `session.expiresAt`; reference only.
- `toBeOkResult` / `toBeErrResult`, lowercase-snake `Result` codes, "assert the code not the message" (087 L6) — used in every example assertion; do not re-derive the matchers.
- `vi.mock` hoisting / `vi.resetAllMocks` (087 L3, L5) — named in one sentence each at point of use; depth lives in those lessons.

**Out of scope — explicitly defer:**
- Better Auth / session setup, `auth.api`, `requireOrgUser` *implementation*, cookie hardening (`__Host-`, `freshAge`) — Unit 9 / Code conventions. This lesson *stubs* the seam; it does not teach how the seam is built.
- API-key auth fixture (`withApiKey({ scope })`) — Unit 11 / project chapter. Mention as a one-line parallel ("same pattern, headers not cookies") and stop.
- RLS, `auth.uid()`, tenant scoping *at the database policy level* — Chapter 11. This lesson's tenant tests assert application-layer scoping via the `org_A`/`org_B` rows, not RLS.
- E2E auth through the real UI / sign-in form — Chapter 090.
- Password-hashing and credential unit tests — Unit 9.
- Full Server Action end-to-end assertions (parse-fail field errors, `revalidatePath` spy, `redirect()`/`NEXT_REDIRECT`, MSW for outbound calls) — 088 L7. This lesson stops at the *authorize* seam; it must not pre-teach the parse/mutate/revalidate assertion craft. Where examples assert a `Result`, keep them to the authz branches (`unauthorized` / `forbidden` / plan-gate) so the boundary with L7 stays clean.
- MSW / outbound network mocking — 088 L4–L5.
- Flake taxonomy — 088 L8 (the reset-discipline points forward-crumb it; don't enumerate the taxa here).
- The CSRF/Origin *mechanism* at depth (token derivation, allowed-origins config) — Unit 8. This lesson teaches only the operational "set Origin = Host so the gate passes."

---

# Notes for downstream agents

- **Auth surface correction is load-bearing.** The chapter outline writes `auth()` / `vi.mock('@/auth')` (Auth.js idiom). The project is **Better Auth**: the seam is `lib/auth.ts`, the ladder is `getCurrentUser` / `requireUser` / `requireOrgUser`, and the one funnel call is `auth.api.getSession({ headers })`. Stub `@/lib/auth`'s `auth.api.getSession`. Verify the exact `auth.api.getSession` argument/return shape against the project's pinned Better Auth version before writing the mock (it returns `{ user, session } | null`).
- **`requireOrgUser` returns `{ user, orgId, role }`** (no org object) per Code conventions; if a test needs the org row it reads it separately. The fixture still returns a full `org` in its context for factory convenience, but don't imply `requireOrgUser` hands back an org.
- **`DbOrTx`** is the param type for `tx` (from 088 L1, `src/db/types.ts`). Use it; don't write a raw `PgTransaction`.
- The fixture file is `src/test/fixtures/auth.ts`, exporting only `signedInAs` and `anonymous`. Mocks for `@/lib/auth` and `next/headers` are registered in the integration `setupFiles` (per 088 L2), populated per-call by the fixture.
- `Role` / `Plan` unions derive from the Drizzle enum columns — do not hand-list role/plan literals in the lesson; show them as schema-derived.
- Keep all `Result` assertions in examples to authz codes (`unauthorized`, `forbidden`, and the plan-gate code) to preserve the L7 boundary. Confirm the project's plan-gate code string (likely `forbidden` or a dedicated `plan_required`-style code) against 088 L7 / Code conventions before asserting on it; the conventions `Result` union lists `forbidden` but not a plan-specific code, so default to `forbidden` unless the project defines otherwise.
