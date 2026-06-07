# Lesson outline — Chapter 051, Lesson 1

## Lesson title

- Title: `Authn, authz, and the 401/403 split`
- Sidebar label: `Authn vs authz`

## Lesson framing

Concept/vocabulary lesson — the *dictionary* the rest of Unit 8 (and Unit 9's RBAC) leans on.
No Better Auth API, no cookie attributes, no session schema, no OAuth flow — those are lessons 2/3 and later chapters.
The deliverable is a mental model, not syntax.

Core conclusions from brainstorming that govern the whole lesson:

- **Lead with the bug, not the definitions.** The senior question is concrete: user signs in, redirect to dashboard works, next click "Delete invoice" returns 403 — *why*? The whole lesson exists to make that 403 legible. Open with this scenario and return to it as the spine.
- **Two concepts, one recurring confusion.** Authentication (authn) = *who is this request from?* Authorization (authz) = *is this principal allowed to do this thing on this resource?* The single most valuable takeaway is that these are separate concerns evaluated at separate boundaries — and that "I logged the user in, why can't they do X?" is a *category error*, not a bug in either system.
- **Minimize cognitive load by staging.** Build the model in this order: (1) the two questions, (2) the three-way refinement (identification → authentication → authorization), (3) where each lives in the request lifecycle, (4) the order constraint that produces 401 vs 403, (5) the misframe catalog as consolidation. Each stage adds one idea to the prior picture. Don't front-load the principal-states or factor-landscape material — they're refinements that come *after* the core split is solid.
- **Frame everything in production stakes.** Every distinction maps to a concrete bug class that ships if the vocabulary stays fuzzy. The misframe catalog is the payoff section — it's where the abstract vocabulary becomes "this is the bug you'll write."
- **Connect to prior knowledge.** Student knows cookies (Ch 013), Server Actions + middleware (Ch 034/033/043), and the `Result<T>` discriminated union (Ch 043). Use these as anchors: the `'unauthorized'`/`'forbidden'` discriminants and the 401/403 HTTP codes are the *same distinction* surfaced in code they've already seen. This is the lesson's strongest "you already know half of this" hook.
- **Name the tools, don't teach them.** Argon2id/bcrypt, passkeys/TOTP, the elevation tier, Better Auth, RBAC's `authedAction` — each named once as a forward pointer with its owning chapter, never explained. The senior reflex ("never put authz in components/layouts") is stated as a principle and deferred to Ch 057 for implementation.
- **Diagrams earn their weight here.** This is an abstract lesson; one decision-tree (request → authn → authz → 401/403) is load-bearing and turns the order constraint into something visual. A small layered diagram for the three-way distinction (claim → proof → permission) aids the hardest conceptual step.
- **Exercises consolidate vocabulary.** A Buckets classification drill (sort scenarios into authn/authz/identification) and a few MCQs (especially "what status code?" diagnosis) are the right fit — this is recall and discrimination, not coding. No live-coding; there's no code to write.

Estimated student time: 25–35 min. Keep it tight; the value is precision and the misframe catalog, not breadth.

## Lesson sections

### Introduction (no header — lesson intro prose)

Open cold with the senior scenario: a user types email + password, clicks "Sign in," lands on the dashboard. The next click — "Delete this invoice" — comes back 403 Forbidden. The user *is* signed in. So what happened?

State the lesson's job: by the end the student can say exactly which subsystem decided each step, why "signed in" and "allowed" are different questions, and why the difference shows up as a 401 versus a 403. Connect forward: this vocabulary is what makes Better Auth's surface (rest of Unit 8) and RBAC (Unit 9) readable instead of confusing. Connect back: they already met the `'unauthorized'` and `'forbidden'` codes in the `Result` type (Ch 043) — this lesson explains what that split *means*.

Keep warm and brief. Do not define authn/authz yet — let the scenario create the question first.

Reasoning: pedagogical guidelines mandate the senior question be implicit in the intro and the topic be motivated by a concrete problem. The 403-after-login scenario is the chapter outline's designated hook and the most relatable framing of the core confusion.

### Authentication answers "who is this request from?"

Define authentication: the system verifies the identity behind a request and produces a **verified principal** (a user row) plus a session that carries that identity onto later requests.

Key properties to convey:
- **Authn is binary.** A request is either authenticated as user X or it is not. There's no "partially authenticated."
- **The inputs are factors:** something the user *knows* (password), *has* (a device holding a passkey, a TOTP authenticator), or *is* (biometric — but frame biometrics as a *gesture that unlocks the passkey on the device*, not a separate channel). Name the three factor categories, one line each. Do not enumerate sign-in methods in depth — forward-pointer to Ch 053.
- **The bar is proof strength + credential protection at rest.** State the line without parameters: credentials are stored hashed with a slow, salted, one-way function (Argon2id or bcrypt), never plaintext, never reversibly encrypted. Name Argon2id/bcrypt once; defer cost factors and brute-force defenses to Ch 053/074.

Mental model to plant: authn happens *once* at the proof moment and is then *carried forward* — the "carried forward" mechanism (the session) is lesson 2's whole topic, so just name it as a teaser.

Components: prose with one `Code` block only if it sharpens the "verified principal = a `User` row" idea — e.g. a minimal `type Principal = { userId: string; email: string }` to make "principal" concrete. Keep it tiny and conceptual; no real API.

`Term` candidates: **principal** (the authenticated identity a request runs as), **authentication factor** (a category of proof — knowledge / possession / inherence).

Reasoning: authn is the simpler of the two concepts and the natural first build-step. Binary-ness is the property that contrasts cleanly with authz's per-action nature in the next section, so establish it explicitly here to set up the contrast.

### Authorization answers "is this principal allowed to do this thing?"

Define authorization: given an *already-authenticated* principal, decide whether that principal may perform a specific **action** on a specific **resource**, per the applicable **rules**.

Spell out the four inputs concretely against the invoice scenario:
- **Principal** — the verified user from authn.
- **Action** — read invoice / delete invoice / invite teammate.
- **Resource** — *this specific* invoice in *this specific* org (emphasize specificity — same action, different resource, different answer).
- **Rules** — role, ownership, plan tier, feature flag.
Output: allow or deny.

The contrast that does the teaching:
- **Authz is not binary at the system level** — it's evaluated *per-action, per-resource, every time*, at the action boundary. A user authorized to read an invoice may not be authorized to delete it; authorized for invoice A, not invoice B.
- This is *why* the dashboard loaded (read allowed) but delete failed (delete denied) for the *same* signed-in user. Tie directly back to the opening scenario — this section resolves it.

Name that Unit 9's RBAC owns the full rule surface (roles, the `authedAction` wrapper, org-scoping); this lesson plants the frame only.

Components: a small `Code` snippet sketching the *shape* of a decision (conceptual, not the real wrapper) — e.g. `can(principal, 'delete', invoice) → boolean` — to make "per-action, per-resource" tangible. Mark as deliberately simplified (real wrapper is Ch 057).

`Term` candidate: **resource** (the specific thing an action targets — this invoice, this org, this row).

Reasoning: defining authz immediately after authn, with the *same* scenario, lets the student feel the two-question split rather than memorize two definitions. The "not binary / per-resource" property is the crux misframe-preventer and must be vivid.

### Identification, authentication, authorization — three things, not two

Refine the two-way split into the precise three-way distinction seniors keep straight:
- **Identification** — the *claim*. "I am `ada@acme.com`." Cheap, unverified, asserted by anyone.
- **Authentication** — the *proof* of the claim. The password matches / the passkey signs the challenge.
- **Authorization** — the *permission* to act under the now-verified identity.

Map onto a sign-in form to make it concrete: the email typed in is identification; the password check is authentication; the role lookup at the action handler is authorization.

The senior payoff: most "auth bugs" are one of two confusions — identification-vs-authentication (treating an unverified email as proven) or authentication-vs-authorization (treating "signed in" as "allowed"). Foreshadow the misframe catalog.

Diagram — **layered "claim → proof → permission" strip** (HTML+CSS, in a `<Figure>`). Three horizontal stacked bands, left-to-right or top-to-bottom, each labeled with the term, the question it answers, and the sign-in-form example. Pedagogical goal: make the *escalation* visible — each layer presupposes the one before (you can't authorize what you haven't authenticated; you can't authenticate a claim that wasn't made). A simple visual aid, not a system graph. Keep under the height cap. Use HTML+CSS per the diagram index's "color-coded segments with callouts" row.

Exercise — **`Buckets`** classification drill. Three buckets: Identification / Authentication / Authorization. Items (scenarios) to sort, e.g.:
- "Typing your email into the login form" → Identification
- "The server checks your password hash matches" → Authentication
- "The passkey on your phone signs the login challenge" → Authentication
- "The handler checks your role is `admin` before deleting" → Authorization
- "Looking up whether you own this invoice" → Authorization
- "A username appears in the URL `/u/ada`" → Identification
Use `twoCol={false}` (three buckets fit one column on wide viewports — verify layout; if cramped, keep single-col since chips are short). `instructions` framing: "Sort each step into the concern it belongs to." Goal: force discrimination between the three, which is exactly where students blur.

`Term` candidate: **identification** (an unverified claim of identity, distinct from proving it).

Reasoning: the three-way distinction is the lesson's most conceptually slippery step (students naturally collapse identification into authentication). A diagram + a sort drill is the right double-treatment for the hardest idea. Placing the Buckets drill here, mid-lesson, breaks up prose and consolidates before moving to the lifecycle.

### Where each check lives in this stack

Place the two checks at their boundaries in the request lifecycle the student already knows:
- **Authn lives at the session-read boundary** — `proxy.ts` (Next.js 16's renamed middleware — function `proxy`, formerly `middleware.ts`, taught in Ch 033; don't re-explain the rename here, just use the current name) for protected-route gating, layouts for sign-in-required surfaces, Server Actions and route handlers for per-call identity reads.
- **Authz lives at the action boundary** — the wrapper around every mutating Server Action checks role and org scope (Ch 057 builds it).
- **They compose:** authn establishes the principal; authz reads principal + request and decides. Authn first, authz second (this sets up the next section).

The senior reflex, stated as a principle (not yet implemented): **never put authz checks in React components or layouts.** Two reasons, briefly: layouts can be bypassed under partial pre-rendering, and a component that renders nothing for a forbidden user is a *UX* affordance, not a *security* boundary — the boundary is the action. Forward-pointer: Ch 057 writes the real boundary.

Components: a `Code` block or small annotated list mapping {middleware, layout, Server Action} → {what it reads, what it decides}. Keep conceptual — pseudo-calls, not real Better Auth API (that's Ch 052). If a single conceptual snippet shows authn-then-authz composing inside one Server Action, consider `AnnotatedCode` to step the reader through the two checks (highlight the identity read, then the permission check). Only use AnnotatedCode if the snippet is genuinely multi-part; otherwise plain `Code`.

`Term` candidate: **action boundary** (the server-side entry point of a mutation — the Server Action or route handler — where authz is enforced).

Reasoning: grounding the abstract split in the concrete files the student has seen (middleware, layouts, Server Actions) converts vocabulary into placement intuition. The "never in components" reflex is a high-value senior-mindset point worth stating now even though implementation is deferred — it prevents the most common architectural mistake.

### Why the order is fixed: 401 versus 403

The payoff section that ties the model to the opening scenario and to code the student knows.

The rule: **every request runs authn first, authz second.** From that order fall two distinct failure modes:
- **Authn fails → 401 Unauthorized** — no proven identity. The client *can* fix it by signing in. (Note the HTTP name "Unauthorized" is historically misleading — 401 is really *unauthenticated*. Call this out; it's a classic source of confusion.)
- **Authz fails → 403 Forbidden** — identity is proven but this principal may not do this. The client *cannot* fix it by retrying or re-signing-in; they need someone to grant access.

Why mixing them is a real bug: returning 403 when there's no session, or 401 when the session is fine but the role is wrong, hides the true cause from clients, monitoring, and incident response. A client that gets the wrong code shows the wrong UI ("please sign in" when the user is already signed in, or a dead-end when a sign-in would have fixed it).

Connect to known code: the `Result` discriminated union (Ch 043) carries `'unauthorized'` and `'forbidden'` as **distinct discriminants for exactly this reason** — the action layer mirrors the HTTP layer's split. Show the relevant slice of the `Result` error `code` union (the real one from conventions: `'unauthorized' | 'forbidden' | ...`) and the route-handler status table line (401 = no identity, 403 = identity/no permission). This is the moment the abstract lesson lands on concrete code they've already used. Note for downstream agent: the chapter outline prose says `'unauthenticated'` but the canonical `Result` code in Code conventions is **`'unauthorized'`** — use `'unauthorized'`, and add one sentence flagging that 401's official name "Unauthorized" actually means *unauthenticated*, which is why the naming trips people up.

Diagram — **decision-tree flowchart** (Mermaid `flowchart LR`, in `<Figure>`). The load-bearing diagram of the lesson. Shape: `Request` → `Authenticated?` —no→ `401` ; —yes→ `Authorized for this action?` —no→ `403` ; —yes→ `Proceed`. Horizontal layout (LR) per the vertical-space constraint. Pedagogical goal: make the *sequence and the branch points* a single glance — authn gate first, authz gate second, each with its own status code. This is the diagram the chapter outline explicitly says "earns its weight." Keep node text terse so font stays legible (per mermaid.md width/font note).

Exercise — **`MultipleChoice`** "diagnose the status code" set (2–3 single-correct cards). Each gives a scenario, asks 401 vs 403 (vs maybe a distractor like 404). Examples:
- "A logged-out visitor POSTs to delete an invoice." → 401
- "A signed-in `member` tries an `admin`-only action." → 403
- "A signed-in user requests an invoice that belongs to another org." → (404 — name briefly that cross-tenant is masked as not-found per the status table; this is a *bonus* discrimination, optional — only include if it doesn't overload; otherwise keep to clean 401/403). Use `<McqWhy>` to reinforce the "can the client fix it by signing in?" test as the decision heuristic. Per MCQ doc: phrase choices so the student reasons, don't echo prose verbatim.

`Term` candidates: **401 Unauthorized** (no proven identity — misleadingly named; means unauthenticated), **403 Forbidden** (identity proven, action not permitted).

Reasoning: this is the section the lesson title names and the one with the highest production payoff (correct status codes are an API-contract and incident-response concern). The diagram + MCQ pairing turns the order constraint into a reusable diagnostic ("can a sign-in fix it?"). Anchoring on the `Result` discriminants closes the loop with prior knowledge and shows the principle is already in their code.

### Three principal states: anonymous, authenticated, elevated

A refinement of "authn is binary": at the *system* level there are three principal states the app handles distinctly.
- **Anonymous** — no session. Public pages, the sign-in surface itself.
- **Authenticated** — session present, identity proven, baseline capabilities.
- **Elevated** — *recent* re-authentication. Required before credential changes, billing changes, destructive admin actions.

The senior insight to land: **elevation is authentication triggered by an authorization policy.** The policy ("this capability requires recent proof") is authz; the re-prompt it triggers is authn. This is the cleanest demonstration that the two concerns *interact* without being the same thing.

Why name it now: Better Auth surfaces this directly (`freshAge`, per conventions) and Unit 9's RBAC writes the policy that requires it. Forward-pointer for the implementation: lesson 2 of Ch 054 (re-auth on credential change). Name `freshAge` once as the field that carries this; do not teach it.

Components: prose. Optionally a tiny three-state strip (HTML+CSS or a one-line Mermaid `stateDiagram-v2`) — but only if it adds clarity beyond the prose; this is a minor refinement and likely doesn't need its own figure given the lesson already has two. Lean toward prose-only to respect the time budget; downstream agent may add a minimal state strip if it reads cleanly.

`Term` candidate: **elevation** / **fresh session** (a session whose last proof of identity is recent enough for high-stakes actions).

Reasoning: this is a "name the line" topic per the chapter outline. Its real teaching value is the authn-triggered-by-authz insight, which deepens the core split rather than adding new surface. Keep it short — it's a refinement, not a pillar.

### The misframes that ship bugs

The consolidation section — the lesson's payoff. Each misframe is a one-liner the student will recognize in real code, paired with the bug class it produces. Present as a tight list (or a `Card`/`CardGrid` of "the misframe / the bug" pairs for scannability).

The catalog:
- **"They're signed in, so they can edit."** → authn mistaken for authz. Bug: every authenticated user can perform privileged actions; no per-resource/role gate.
- **"Their email is in the database, so they're authenticated."** → identification mistaken for authentication. Bug class spotlight: **account-recovery flows** — a password-reset link sent to an *unverified* email hands the account to anyone who typed that email. (This is the most dangerous one — give it an extra sentence.)
- **"They paid, so they're authorized."** → billing entitlement mistaken for the whole authz policy. Bug: plan-tier check passes but org-scoping and role still must apply; a paying user isn't automatically an admin of every org.
- **"Once authenticated, the session can do anything for 30 days."** → collapsing the elevation tier into the baseline. Bug: high-stakes actions (password change, ownership transfer) run with stale proof.

Frame the through-line: each is a confusion between two of the three concepts, and each maps to a specific shipped bug. The vocabulary from this lesson is the fix — name the concept correctly and the boundary places itself.

Exercise — optional `TrueFalse` round or fold the misframes into the earlier MCQ set. A `TrueFalse` round works well here: present each misframe as a statement, student marks true/false, review explains. E.g. "A user whose email exists in the `users` table is authenticated. (False — that's identification.)" Keep to 4–5 statements. Choose `TrueFalse` over more MCQs to vary the interaction and because misframes are naturally true/false claims.

Reasoning: the chapter outline calls the misframe catalog the section that "does the work." It's the bridge from vocabulary to practice — abstract distinctions become recognizable failure patterns. Putting it near the end consolidates everything prior. The account-recovery misframe is the highest-severity real-world example and deserves emphasis.

### What this lesson hands off (no header — short closing prose)

One short paragraph: this lesson is the dictionary. Everything that *implements* it is downstream — how the proven identity travels between requests and the cookie that carries it (lesson 2), the OAuth flow behind the social-login button (lesson 3), sign-in methods (Ch 053), Better Auth's API (Ch 052), the RBAC role model and `authedAction` wrapper (Ch 057). The student leaves with the model; the syntax comes next.

Optionally 1–2 `ExternalResource` cards: MDN on 401 vs 403, or the OWASP authentication/authorization cheat-sheet entry — only if they're genuinely authoritative and current. Keep minimal.

Reasoning: pedagogical structure allows an optional external-resources close; a crisp handoff paragraph also reinforces scope discipline and primes lesson 2.

## Scope

**This lesson teaches (the dictionary):**
- The authn vs authz distinction and the three-way refinement with identification.
- Where each check sits in the request lifecycle (named boundaries: middleware, layouts, Server Actions/route handlers).
- The order constraint and the 401/403 split, anchored to the `Result` discriminants and the HTTP status table the student already knows.
- The three principal states (anonymous/authenticated/elevated) at the conceptual level.
- The misframe catalog and the bug classes each produces.

**Explicitly NOT in this lesson (defer, do not teach):**
- Session storage, cookie attributes (`__Host-`, `HttpOnly`, etc.), token entropy, the wire format that carries identity — **lesson 2 of this chapter.** Mention "a session carries identity forward" as a one-line teaser only.
- OAuth 2.1 / PKCE / the code-for-tokens flow — **lesson 3 of this chapter.** Do not preview mechanics.
- Sign-in methods (passwords, passkeys, TOTP, magic links) in any depth — **Ch 053.** Name factor *categories* only.
- Better Auth's API, config, or table layout — **Ch 052.** Better Auth named once as "what implements this in Unit 8."
- RBAC roles, the `authedAction`/`authedRoute` wrapper internals, audit trail — **Ch 057.** Name the wrapper as the action-boundary site; don't build it.
- Password hashing parameters, cost factors, brute-force defenses, rate limits — **Ch 053 / Ch 074.** Name Argon2id/bcrypt + "hashed, salted, slow, one-way" line only.
- Elevation/re-auth *implementation* — **lesson 2 of Ch 054.** Name the concept and `freshAge`; don't implement.
- CSRF, `SameSite` mechanics — **Ch 054.** Not needed here.

**Prerequisites to redefine concisely (one line each, don't re-teach):**
- Cookies (Ch 013) — assumed known; referenced only as "where the session will live" (lesson 2 detail).
- Server Actions + middleware/`proxy.ts` (Ch 034/033) — assumed known; used as the named boundaries.
- The `Result<T>` discriminated union with `ok`/`error.code` (Ch 043) — assumed known; the `'unauthorized'`/`'forbidden'` codes are *the* anchor for the 401/403 section. Re-show the relevant slice, don't re-derive the pattern.

## Notes for downstream agents

- **Terminology precision is the grade.** Keep "authentication," "authorization," "identification" exact throughout; never use "auth" alone to mean one of them.
- **Canonical-contract correction:** Code conventions define the `Result` error code as **`'unauthorized'`** (not `'unauthenticated'`, which the chapter-outline prose used loosely). Use `'unauthorized'` paired with 401, `'forbidden'` paired with 403. Add one sentence noting the HTTP name "401 Unauthorized" actually means *unauthenticated* — that naming mismatch is itself worth flagging to the student.
- **No real Better Auth / RBAC API anywhere.** All code is conceptual/pseudo to illustrate shape. Mark deliberately-simplified snippets so a later reviewer doesn't "fix" them toward the real API.
- **Respect the time budget (25–35 min).** Two diagrams (claim→proof→permission strip; 401/403 flowchart) plus two/three exercises (Buckets, MCQ status-code set, optional TrueFalse) is the ceiling. Don't add a third diagram unless the principal-states strip reads cleanly and cheaply.
