# API keys for machine callers

- **Title:** API keys for machine callers
- **Sidebar label:** API keys

## Lesson framing

The chapter's spine — "make the wrong call shape impossible, not merely discouraged" — has now appeared three times (`tenantDb`, `authedAction`/`authedRoute`, `logAudit`). This lesson is the chapter's capstone: it asks "who is the caller when the caller isn't a browser?" and answers it by *extending an existing seam* rather than building a new one. That framing is the whole pedagogical bet. Lesson 3 closed on a named gap: "Bearer-token auth is a different identity model, not built in this chapter." This lesson reopens exactly that gap and fills it — the payoff lands hard because the student already felt the hole.

**The one mental model to leave with.** `authedRoute` is *two doors, one room* (lesson 3's image). This lesson keeps the room identical — every handler body still receives `ctx = { user, orgId, role, db }` — and adds a *second door on the same wall*: a request arriving with `Authorization: Bearer <key>` is resolved by the wrapper into that same `ctx`, so no handler changes. The student should finish able to say: "An API key is identity for a machine; my app issues it, stores only its hash, verifies it at the same boundary as the session cookie, and it resolves to the same context — so authorization, tenancy, and audit all work unchanged."

**Where beginners go wrong with this in the real world** (these drive the watch-outs, placed inline at the concept they qualify, never bundled):
- Storing the raw key (or logging it) instead of only its hash — a DB read or a leaked log line then hands out working credentials.
- Comparing the presented secret with `===` — a timing leak; the course already taught constant-time compare in chapter 016.
- Bolting an inline `x-api-key` check onto each route — the *exact* missing-check bug class lesson 2 closed, reopened at a new seam.
- Letting a key out-scope the role it acts as — scopes must *narrow*, never widen.
- Hard-deleting on revoke — loses `lastUsedAt` and the "when did this stop working" answer.
- Reusing a slow password hash (bcrypt/argon) for a high-entropy throwaway secret — wrong tool; chapter 058 lesson 1 already settled fast-vs-slow.

**Prerequisites the student already owns, leverage them, don't re-teach.** `authedRoute(role, schema, fn)` and its four gates (lesson 3); `authedAction` for the admin-gated mint/revoke actions (lesson 2); `logAudit(tx, event)` inside `withTenant` (lessons 4–5); `roleAtLeast`/`Role` (lesson 1); `crypto.getRandomValues` + `subtle.digest` SHA-256 + constant-time compare (chapter 016); UUIDv7 PKs, snake_case-on-client, `onDelete` discipline, `z.uuid()` (conventions). The single new *primitive* is "a hashed credential, shown once" — and even that is foreshadowed forward (chapter 058 reuses it for invite tokens) and references chapter 016 backward.

**Pedagogical approach.** Decision-first, short (30–40 min target, this is a capstone built on five lessons). Lead with the senior question (cookies are a browser's credential; a partner backend has no cookie). The load-bearing visual is the two-branch resolver diagram — Bearer vs cookie entering `authedRoute`, both exiting as one `ctx` — echoing lesson 3's "two doors, one room" deliberately. Code is grounded in the *actual* shipped `authedRoute` from lesson 3 (extend it, show the diff). One live-coding exercise on the verify branch (the genuinely new logic). Keep the `apiKey`-plugin "consume the library" move to a short closing section — same Principle #5 beat as the org plugin, the student has seen it before. Do not over-build: scopes, PAT variant, and the plugin each get one tight section, not a deep dive.

**Carve-out alignment.** The conventions reserve RLS for `audit_logs`-tier tables; `api_keys` is org-owned application data, so it uses **`tenantDb(orgId)` app-layer scoping**, *not* RLS — but the lookup-by-prefix during verification is a deliberate exception (it runs *before* `ctx` exists, so there is no tenant scope yet). Name this explicitly so downstream agents don't wrap the verify lookup in `tenantDb`.

## Lesson sections

### Introduction (no header)

Open on the concrete gap. Lesson 3 built `authedRoute` and named, then deferred, one thing: "the default identity path is the session cookie… `Authorization: Bearer <token>` is a *different* identity model, not built in this chapter." Quote that promise back. Then make the problem physical: a cookie is a *browser's* credential — set by your domain, replayed automatically, scoped to a browser session. The partner backend posting nightly batches, the CLI, the future mobile app (all named back in chapter 046) are not browsers and have no cookie. So how does a non-browser caller prove who it is? And — the senior twist — how do you hand a partner a credential you can *revoke* later without resetting anyone's password?

Preview the destination: by the end, a request with `Authorization: Bearer <key>` flows through the *same* `authedRoute` wrapper, resolves to the *same* `ctx`, and every handler body works unchanged. Emphasize this is an *extension* of a seam they own, not new machinery. Keep it warm and brief (pedagogical guideline §3).

Reuse lesson 3's "two doors, one room" phrasing here to set up the recurring visual — this lesson adds a door on the same wall.

### A credential a machine can carry — and you can revoke

The decision section. Establish *what an API key is* before any code: an opaque, high-entropy secret the app mints and hands to a machine caller; the caller sends it on every request; the app verifies it. Contrast against the three things it must beat:
- **vs the session cookie** — not browser-bound, sent explicitly in a header, not auto-replayed.
- **vs a password** — not human-chosen, not memorable, *revocable per-credential* without disturbing the owner's login. Mailing a partner a password would be insane; mailing a scoped, revocable key is the right shape.
- **vs OAuth client-credentials** — name once as the heavier, third-party-app model (it was named in chapter 051); the stored-hash key is the year-1 default for *your own* partners. Do not build it.

Land the senior reflex: a key is a *privileged grant you can take back*. Revocability is the feature; that is why the table has a `revokedAt` column and why minting/revoking are audited like a role change.

Components: prose + a short `Card`/`CardGrid` or a `TabbedContent` is overkill here — keep it prose with a tight comparison. Consider a small `Term` on **bearer token** (definition: "a credential where possession alone grants access — whoever holds it is treated as authorized"; reuse chapter 058's phrasing for consistency).

This section names the trigger before the tool (pedagogical filter): the *threshold* is "a non-browser caller needs in," which is one of lesson 3's five route-handler triggers — so API keys live behind the HTTP door by construction.

### The shape: a hashed key, shown once

Teach the storage model and the table. This is where the one genuinely new primitive lands: **store the hash, show the secret once.**

Walk the key's two halves first, in prose:
- A public `prefix` (e.g. `rsk_live_ab12…`) — the visible key-id, safe to show in a settings list and safe to store plaintext. It's how you *look the row up* without revealing the secret.
- A secret half — 32 bytes of CSPRNG entropy from `crypto.getRandomValues`, rendered base64url (the exact pipeline from chapter 016). The full key handed to the caller is `${prefix}.${secret}`.
- The database stores `prefix` + `sha256(secret)` (or `sha256` of the full key — pick one and be consistent; recommend hashing the secret half so the prefix stays a clean lookup key). The raw secret is returned to its creator **exactly once** and never persisted.

Make the senior point explicit and tie it backward: this is the *same* hash-and-show-once posture, and the *same* fast-hash reasoning, as chapter 058's invite tokens — except **this lesson is where the course first builds it**. A high-entropy throwaway secret takes a *fast* hash (`SHA-256` via `crypto.subtle.digest`), not the slow bcrypt/argon a human password needs. State plainly: a read of the `api_keys` table alone can never reconstruct a working key. That is the entire security posture of the at-rest store.

**The table.** Present `api_keys` as a Drizzle `pgTable`. Use `AnnotatedCode` (multiple columns each carry a decision — the student's focus needs directing part by part). Columns:
- `id` — uuid pk, `$defaultFn(() => uuidv7())` (conventions: v7 for user-facing entities).
- `prefix` — text, the public key-id; carry a unique index (it's the lookup key). Note `idx`/unique naming convention.
- `keyHash` — text, the SHA-256 hex of the secret. *Never the raw key.*
- `organizationId` — uuid, notNull, FK→`organization`, `onDelete: 'cascade'` (the org owns the key; deleting the org takes its keys).
- `createdByUserId` — uuid, FK→`user`, `onDelete: 'set null'` (mirror the audit table's actor-survives-deletion reasoning — keep the key's trail even if the minting user is deleted).
- `name` — text, the human label ("Acme nightly sync").
- `scopes` — text array (`text().array()`), the capability ceiling (next section).
- `lastUsedAt` — timestamp, nullable; bumped on each successful verify.
- `revokedAt` — timestamp, nullable; set on revoke (state change, not delete).
- `createdAt` — timestamptz, defaultNow().

`AnnotatedCode` steps should call out: the `prefix`/`keyHash` split (lookup vs secret), the two `onDelete` choices and *why each differs*, and `revokedAt`-not-delete (foreshadow the revoke section). Mention snake_case-on-client mapping holds (TS `organizationId` ↔ SQL `organization_id`), one line, since the audit lesson established it.

**No RLS here** — say it in one sentence with the reasoning: RLS is reserved for the `audit_logs` append-only tier; `api_keys` is ordinary org-owned data, scoped through `tenantDb(orgId)` like every other table. (This pre-empts an agent reflex to copy the audit table's `pgPolicy` blocks.)

Diagram: a small `Figure` wrapping a **three-trust-boundaries** illustration (HTML+CSS or `ArrowDiagram`) — *database* (hash only), *logs* (redacted, never the raw key), *the response to the creator* (the one legitimate exit, shown once). This deliberately parallels chapter 058 lesson 2's `TokenTrustBoundaries` figure; pedagogical goal is to make "where is the raw secret allowed to exist?" a glanceable answer. One legitimate exit: the create response.

`Term` candidates: **CSPRNG** (already defined in ch016, re-define inline here since it's a prerequisite re-surfacing without interrupting flow), **base64url** (same).

### Minting and revoking: admin-gated and audited

Show that issuing/killing keys reuses `authedAction` and `logAudit` verbatim — *no new machinery*, which is the reassuring beat.

`createApiKey` (verb+noun, no `Action` suffix — chapter naming convention from lesson 2):
- `authedAction('admin', createApiKeySchema, async (input, ctx) => …)` — only an admin mints a key for the org.
- Body: generate `prefix` + secret, compute `keyHash = await sha256Hex(secret)`, insert via `withTenant(ctx.orgId, async (tx) => …)`, write `logAudit(tx, { action: 'api-key.created', subjectType: 'api-key', subjectId: row.id, payload: { name, scopes } })` **inside the same transaction**, then `revalidatePath`, then return `ok({ fullKey, ...row })` — the `fullKey` is the *one-time* return for the UI to display once.
- Stress the audit event name and payload match chapter 081 lesson 3's catalog *exactly* (`api-key.created`, payload `{ name, scopes }`). This is a hard downstream contract — call it out so it doesn't drift.

`revokeApiKey`:
- `authedAction('admin', revokeApiKeySchema, …)`; sets `revokedAt = new Date()` (state change), does **not** delete. Audit `api-key.revoked`.
- The senior reflex, inline: revoke is a *state change, not a delete* — keep `lastUsedAt` and the row so "when did this key stop working, and was it still in use?" stays answerable. This is the watch-out, placed at the concept.

Components: `CodeVariants` is a good fit if showing `createApiKey` and `revokeApiKey` as two related files/tabs; or a single `AnnotatedCode` for `createApiKey` (the one-time-return and the in-transaction audit are the two focal points). Prefer `AnnotatedCode` for `createApiKey` (focus on: the show-once return, the `logAudit` inside `withTenant`), and a plain `Code` block for the shorter `revokeApiKey`.

Schemas: `createApiKeySchema` = `{ name: z.string().min(1), scopes: z.array(z.string()) }` (or an enum of known scope strings — see scopes section); `revokeApiKeySchema` = `{ id: z.uuid() }`. Use top-level `z.uuid()` per conventions.

Tie back: minting/killing a key is a privileged grant, so it belongs in the audit log exactly like a role change — the student built that muscle last lesson; here it just applies.

### The second identity branch in `authedRoute`

The core of the lesson. The wrapper from lesson 3 currently resolves identity one way: the session cookie via `requireOrgUser({ headers })`. This section adds **one branch ahead of it**: if the request carries `Authorization: Bearer <key>`, resolve identity from the key instead — but produce the *identical* `ctx`.

Lead with the diagram (it's the load-bearing visual and the lesson's promised image):

**Diagram — "Two doors, one `ctx`" (or "a second door on the same wall").** A `Figure` with a branch flow (Mermaid `flowchart LR`, or an `ArrowDiagram`): an incoming request splits on "has `Authorization: Bearer`?" → *yes* goes through the API-key resolver (split prefix, look up row, reject missing/revoked, constant-time hash compare, bump `lastUsedAt`); *no* goes through the existing `requireOrgUser` cookie path. **Both arrows converge on a single `ctx = { user, orgId, role, db }` box**, which then flows into the unchanged gates (authorize → parse → call). Pedagogical goal: make visually undeniable that the handler body cannot tell which door the caller used. Echo lesson 3's "two doors, one room" caption deliberately. Keep horizontal, cap height (~per diagram guidance).

Then the verify logic, step by step (this is the new algorithm — use `AnnotatedCode` or a `DiagramSequence` if the step-by-step execution benefits from scrubbing; `AnnotatedCode` is sufficient and cheaper). The resolver, named e.g. `resolveApiKey(request)`:
1. Read `Authorization` header; if absent, fall through to the cookie path (this branch only fires when a Bearer is present).
2. **Reject malformed shape before any DB read** — the value must be `Bearer <prefix>.<secret>`; split on the dot; if the shape is wrong, reject (401). (Watch-out inline: never hit the database for a string that isn't even key-shaped.)
3. Look the row up by `prefix`. **This lookup is the deliberate non-`tenantDb` read** — `ctx` doesn't exist yet, there is no org scope to apply; we're *establishing* the org from the key. Say this explicitly. Use the bare `db` for this one query.
4. Reject if no row, or if `revokedAt` is set (401 — the credential is not valid).
5. **Constant-time compare**: `sha256Hex(presentedSecret)` against the stored `keyHash`, compared in constant time (reference the chapter 016 constant-time-compare shape; do not hand-roll `===`). Inline watch-out + a `// constant-time compare to prevent timing attack` comment is the sanctioned security comment per conventions.
6. On match: bump `lastUsedAt` (fire-and-forget is acceptable here — it's not part of the request's correctness; but a simple `await` is fine and clearer), then build `ctx`: the key's `organizationId` is the org; `role` is read for the key's identity (resolve the member row / the key acts under an org role — see note); `db = tenantDb(orgId)`; `user` resolves to the key's `createdByUserId` (or a synthetic machine principal — keep it simple: resolve the creating user, or null for an unattended service key, deferred to the actor section).

Then show the **wrapper diff** against lesson 3's shipped `authedRoute`: one new branch at the top — "if Bearer present, resolve via `resolveApiKey`; else `requireOrgUser`" — everything after the `ctx` assignment is *unchanged*. Use `CodeVariants` (before = lesson 3's wrapper, after = with the branch) or `AnnotatedCode` with the new lines marked. Prefer showing it as a focused diff so the student sees how little changed. Reuse the exact lesson-3 wrapper code as the baseline (the file is `lib/auth/authed-route.ts`).

Land the senior reflex, the lesson's chapter-thesis beat: identity resolution lives **in the wrapper, beside the cookie path** — never re-implemented as an inline `x-api-key` check on each route. That is the missing-check bug class from lesson 2, ported to a new seam; the wrapper is the structural fix, again. `roleAtLeast` then gates a key exactly as it gates a member — no new authorization code.

**Exercise (the lesson's one live-coding exercise).** `ScriptCoding` with `runner="sandpack"` (matches lesson 3's exercise infra; ReactCoding can't load npm and this is pure logic). Give the student a working harness — an in-memory `apiKeys` store with one valid row (prefix + precomputed hash), a `sha256Hex` shim, a constant-time `timingSafeEqual` shim, and the cookie-path stub. **Task: implement `resolveApiKey(authHeader)`** — split the prefix, reject malformed, look up by prefix, reject missing/revoked, constant-time compare the hashed secret, return the resolved `{ orgId, role, createdByUserId }` or `null`. Tests feed: a valid key (resolves), a revoked key (rejects), a wrong secret (rejects), a malformed header (rejects without a store hit — assert the store lookup count), and a valid key whose secret matches → resolves to the right org. Grading criteria match those five cases. Provide a `<details>` reveal solution. Pedagogical goal: the student writes the *only genuinely new code* in the lesson with their own hands. Keep the shims honest about what they stand in for (mirror lesson 3's shim style).

`Term` candidates: **constant-time compare** (re-anchor: "comparing two secrets in a way whose duration doesn't depend on where they first differ, so an attacker can't learn the secret byte-by-byte from timing").

### Scopes: the key's ceiling, never above its role

Teach the second gate. A key carries `scopes` (`invoices:read`, `invoices:write`) that *cap* what it may do **under** the org role it acts as. Two gates, the narrowest wins:
- **Role** answers "who is this / how powerful is this caller in the org" — checked by `roleAtLeast` in the wrapper, unchanged.
- **Scope** answers "of everything this caller's role *could* do, how much did the key's issuer actually grant *this* key" — checked by `hasScope(ctx, 'invoices:write')` *after* the role gate, in the handler (or as an extra wrapper argument — keep it in the handler/business-fn for now, simplest).

The senior reflex, stated sharply: **a key can never exceed its role, and usually does far less** — that's least privilege for a credential you mailed to a partner. The scope must *narrow*, never *widen*, what the role already allows. This is the watch-out, inline.

Show `hasScope(ctx, scope): boolean` — a tiny helper reading `ctx` (which now needs to carry the key's scopes when the caller is a key; for a cookie caller, the human has *all* scopes their role allows — `hasScope` returns true). Keep this honest: when identity is a session cookie, there's no scope ceiling (a human operating the dashboard isn't a scoped credential); scopes only constrain *keys*. Decide and state: `ctx` gains an optional `scopes?: string[]` (present for key callers, absent → unrestricted for cookie callers), and `hasScope` returns true when `scopes` is absent. This keeps the cookie path's `ctx` behavior unchanged while letting the key path narrow.

Tie forward lightly: this `scopes` field is the same one chapter 081 lesson 3's `api-key.created` audit payload records (`{ name, scopes }`) — one source.

Components: a plain `Code` block for `hasScope`; optionally a tiny two-gate `Figure` (role gate → scope gate, narrowest wins) if it earns its weight — a simple HTML/CSS strip showing "role allows {a,b,c}" ∩ "key scoped to {a}" = "{a}". Keep it small or skip; the prose may suffice. Lean toward a small visual since "the narrowest wins" is the kind of intersection a picture clarifies.

A short exercise here is optional — a `MultipleChoice` or `TrueFalse` checking "a key scoped `invoices:read` acting under an `admin` role: can it delete an invoice?" (No — scope narrows below the role.) Include one MCQ to check the role-vs-scope distinction, since it's the section's load-bearing idea and easy to get backwards.

### The machine actor in the audit trail

Close the loop with lessons 5 and chapter 081's actor taxonomy. A key-authenticated request has no human at the keyboard, so what does its audit row record as the actor?

- `actorUserId` = the key's `createdByUserId` (a human is accountable for the key), **or `null`** for a true unattended service key — reusing lesson 5's nullable-actor / system-actor branch exactly. A null actor is information, not a missing value (lesson 5's phrasing).
- The audit `payload` carries the key `prefix` so "which key did this?" stays answerable.

Tie explicitly to chapter 081 lesson 3's **four actor kinds** — human, system, API key, webhook — and be honest the same way that lesson is: there is *no* `actorType` column; the distinction is carried by `actorUserId` being null-or-not plus the action/payload. The API key is one of those four kinds, expressed through the existing schema. Do not invent a column.

Components: prose, possibly one small `Code` snippet showing a key-authored audit row (`logAudit(tx, { action: 'invoice.created', payload: { viaApiKey: prefix } })`). Keep tight.

### Personal access tokens: the same machinery, one owner swap

Show the reuse payoff. Swap the `organizationId` owner for a `userId` owner and the *same table + same verify branch* becomes a personal access token: a user minting a key for their own scripts, acting **as themselves**.

- Same `prefix`/`keyHash` shape, same constant-time verify, same `Authorization: Bearer` door.
- Difference: the owner column (and thus whose identity `ctx` resolves to) and the lifecycle — a PAT is deleted with the user's account (this is the "personal API keys" *hard delete* in chapter 081 lesson 4's erasure job — name it as the forward pointer).
- Senior reflex: **don't build two systems.** One verification path serves both; the owner column decides whose identity `ctx` carries. (In practice this can be one table with a nullable `organizationId` + nullable `userId`, or two tables sharing a verify helper — keep the lesson's example to the org-key shape and *describe* the PAT as a one-column swap; don't fork the schema in code.)

Components: prose only, or a tiny `CodeVariants` (org key row vs PAT row, same columns, owner swapped) if it clarifies. A two-tab `CodeVariants` showing the owner-column delta is a clean way to make "one swap" concrete.

### Consume the library: Better Auth's `apiKey` plugin

The Principle #5 closing beat — identical move to the org plugin in chapter 056. You hand-built the mechanism so you *understand what a key is*; in production you reach for Better Auth's `apiKey` plugin, which does the hashing, scoped permissions, expiry, and per-key rate limiting for you.

- The senior reflex (the chapter's recurring one): **hand-roll to learn the shape, adopt the plugin to ship.** Same as `tenantDb` being the sanctioned thin wrapper, same as consuming the org plugin directly.
- Name the seam where **per-key rate limiting** meets chapter 074's Upstash limiter (`safeLimit`) — the plugin can key its limiter per API key. Forward pointer only; do not build rate limiting here.
- Be honest about the boundary: the plugin owns the hashing/storage you just hand-rolled, so in a real project you'd configure the plugin rather than ship the hand-built table. The hand-built version is the teaching artifact; the plugin is the production path.

Components: prose + one `ExternalResource`/`LinkCard` to the Better Auth `apiKey` plugin docs.

*Verified June 2026:* the plugin is `apiKey()` (import consistent with the org plugin's `better-auth/plugins`; a `@better-auth/api-key` split package also exists — prefer the path the course's existing `lib/auth.ts` already uses for `organization`). It **hashes keys at rest by default**, and supports custom `prefix`, scoped `permissions` (object shape, e.g. `{ projects: ['read'] }` — note this differs from our flat `scopes` string array; mention the hand-built shape is the teaching simplification), `expiresIn`, and per-key rate limiting (`rateLimitEnabled` / `rateLimitTimeWindow` / `rateLimitMax`). Server methods are `auth.api.createApiKey()` / `auth.api.verifyApiKey()`. These confirm the section's "the plugin does the hashing, scopes, expiry, and rate limiting for you" claims — downstream agent should not need to re-derive them, but should double-check the import path against the live `lib/auth.ts`.

### Closing / where this goes next (no heavy header)

Recap the mental model in the chapter's own voice: a fourth instance of "make the wrong shape impossible" — identity for a machine resolves at the same boundary as the session, into the same `ctx`, so authorization, tenancy, and audit all keep working unchanged. The route handler isn't a weaker door; it now has *two* doors, both fenced.

Forward pointers (named, not built): OAuth 2.1 client-credentials (chapter 051 named it; the third-party-app model), per-key rate limiting (chapter 074), key rotation/expiry schedules beyond manual revoke, the PAT hard-delete in the erasure job (chapter 081 lesson 4), and that chapter 058 reuses this exact store-the-hash/show-once posture for invitation tokens — the student is about to see it again.

Optional: 1–2 `ExternalResource` cards (Better Auth `apiKey` plugin; OWASP or a current "API key best practices" reference on hashing/least-privilege/no-key-in-URL).

## Scope

**Prerequisites — redefine concisely, do not re-teach:**
- `authedRoute(role, schema, fn)` and its four gates (resolve → authorize → parse → call), the `{ params, query, body }` schema, RFC 9457 status map — *built in lesson 3*. This lesson only adds one identity branch ahead of the resolve step; restate the wrapper's shape in one breath, don't re-derive it.
- `authedAction`, `logAudit(tx, event)` inside `withTenant`, `roleAtLeast`/`Role`, `requireOrgUser` — built in lessons 1, 2, 4, 5. Used as black boxes.
- `crypto.getRandomValues`, base64url encoding, `crypto.subtle.digest('SHA-256', …)` → hex, constant-time compare — *built in chapter 016*. Re-anchor with a one-line reminder + reference; do not re-teach Web Crypto surfaces.
- Fast-vs-slow hash for high-entropy-throwaway vs human-password secrets — settled in chapter 058 lesson 1. State the conclusion (fast hash for keys), don't re-argue it.

**Explicitly out of scope (do not teach here):**
- OAuth 2.1 client-credentials / third-party app authorization — a different machine-identity model; named in chapter 051, named here once, not built.
- Per-API-key rate limiting at depth — the keying strategy hooks chapter 074's Upstash `safeLimit`; name the seam, build nothing.
- Key rotation schedules and automatic expiry beyond manual revoke — named once, not built.
- Outbound webhook *signing* (the app emitting signed payloads) — the reverse direction; chapter 063 owns ingestion. Not here.
- JWT / stateless bearer tokens carrying embedded claims — the stateless variant; the stored-hash key is the year-1 default. Named once, not built.
- The audit table internals, the append-only RLS policy, the `logAudit` implementation — *owned by lesson 5*; this lesson only *calls* `logAudit` and *matches the catalog* (`api-key.created`/`api-key.revoked`).
- The audit event *policy/catalog* and the four-actor-kinds taxonomy at depth — *owned by chapter 081 lesson 3*; reference it, don't restate the whole catalog.
- The full erasure/retention job (where PATs are hard-deleted) — *owned by chapter 081 lesson 4*; forward pointer only.
- RLS on `api_keys` — there is none by design (RLS is the `audit_logs` tier); `api_keys` uses `tenantDb`. State this once to prevent an agent copying the audit table's policies.
- The settings-page UI for listing/creating/revoking keys (the "shown once" modal, the key list) — describe the *contract* (create returns the full key once; the list shows prefixes + `lastUsedAt` + revoke buttons) but the page build is out of scope; this is a pattern lesson, not a UI lesson, mirroring how lessons 3–5 named their read surfaces without building them.
