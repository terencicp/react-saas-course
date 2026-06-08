# The seat reservation that outlives the request

Sidebar label: The invitation table

## Lesson framing

This is a **data-modeling lesson** — the first of Chapter 058. Its whole job is to land the `invitation` table shape, its lifecycle, and the structural invariants the rest of the chapter writes code against. No actions, no email, no accept flow here (those are lessons 2–5). The deliverable is a Drizzle schema fragment, a state machine the student can reason about, and a clear mental model of why each column and constraint exists.

Core mental model the student must leave with: **an invitation is a seat reservation that outlives the request.** An admin clicks invite; the invitee accepts in five minutes, three days, or never. That gap is the entire reason the row exists — it persists a pending offer across an unbounded time window, bound to an *email address* (not a user, who may not exist yet), carrying the *role the inviter chose* so the accept screen stays a one-click "you're invited." Everything in the schema serves that idea.

Senior framing that threads the lesson (the "decisions before syntax" filter): Better Auth's organization plugin **owns** the `invitation` table — the senior reflex is to consume the plugin's columns and add only the two things the framework intentionally leaves to the application (`tokenHash`, `acceptedAt`), not to reinvent the table. Two structural decisions carry the lesson and each must be framed as a *decision with an alternative*: (1) hashing the token at rest (raw token lives only in the emailed URL; DB stores `sha256(token)`) so a database read can't forge an accept link, and (2) the partial unique index on `(organizationId, lower(email)) WHERE status = 'pending'` that encodes "at most one pending invite per address" as a database invariant instead of application code.

Two "trigger before tool" / "default before override" beats, both grounded by fact-check:
- The 7-day expiry **overrides** Better Auth's 48-hour default (`invitationExpiresIn`, in seconds). Frame expiry as a *security primitive*, name the default explicitly, then justify crossing it.
- `expired` is **not a stored status** — it's computed from `expiresAt < now()` at read time. The senior reflex is to resist writing a cron that mutates rows to "expired"; the read's `where` clause is the source of truth.

Cognitive-load plan: introduce the row as a plain "reservation," then layer the lifecycle (states), then the two security/integrity decisions, last the relationship to `member` and retention. The ER fragment and the state diagram are the two load-bearing visuals. One schema-design exercise lets the student build the partial unique index and feel it fire. Keep the tone adult and terse; the student already has Drizzle, Better Auth's org plugin, `tenantDb`, the audit log, and Web Crypto from prior chapters — redefine those only in a sentence where needed.

Important fact-check carve-outs to honor (note these to downstream agents as deliberate):
- Better Auth's `additionalFields` for the invitation table has a **known type-inference bug** (open as of Jan 2026): added invitation fields don't always surface on `auth.api.*` / adapter types. Don't promise clean end-to-end inference from the plugin config; the project reads/writes `tokenHash` through its own Drizzle table type (`$inferSelect`), which is the source of truth per code conventions anyway. Mention the gap in one aside, don't dwell.
- Drizzle partial-unique-index gotcha: the `lower()` wrapper is a **hand-written `sql` helper** (`sql\`lower(${col})\``), and the index's `.where(...)` must use a **`sql` template literal**, not `eq()` — `eq()` emits a parameterized placeholder that produces invalid index DDL. This is a real trap; bake the correct shape into the code sample.

## Lesson sections

### Introduction (no header)

Open with the concrete scene (the lesson's implicit senior question): an admin types `bob@acme.com`, picks a role, clicks invite — and Bob doesn't exist in the system yet. State the problem the lesson solves: we need a row that survives between "invited" and "accepted," for an unknown duration, for a person without an account. Name what the student already has from Chapter 056/057 (the org plugin, `member` rows, `requireOrgUser` → `{ user, orgId, role }`, the audit log) and position this lesson as adding the *third* tenancy primitive: the invitation. Preview the deliverable: by the end you can model the table, reason about its lifecycle, and explain why the token is hashed and why one constraint blocks duplicate invites. Warm, ~4 sentences. Do not enumerate the column list here — that's the next section.

### An invitation is a reservation, not a membership

Establish the central mental model before any code. Contrast two rows the student already knows or is about to know: a `member` row says "this person *is* in the org now"; an `invitation` row says "we *offered* this email a seat; nobody has claimed it yet." The reservation analogy: a restaurant booking under a name holds a table for a window of time; the person may arrive, may cancel, may no-show. Three properties fall out of the analogy and preview the rest of the lesson:
- It's bound to an **email address**, not a user — the invitee may have no account.
- It carries the **role chosen at invite time** — the inviter's privileged decision, captured so accept is no-decision.
- It has a **lifetime** — a pending offer that expires.

Keep this conceptual and short; its job is to give the student a frame to hang the columns on. No diagram yet.

Pedagogical reasoning: leading with the model (not the DDL) is the "decisions before syntax" filter; the student should understand *what the row is for* before seeing its shape, which lowers the load of reading the column list.

### The shape Better Auth gives you, and the two columns you add

The schema section. Open with the senior reflex: the org plugin already defines `invitation` — you don't author it from scratch; you consume the plugin's columns and extend with `additionalFields`. List the **plugin-owned columns** (confirmed against Better Auth docs): `id` (string/uuid PK), `organizationId` (FK), `email` (text, the invited address), `role` (text, the role to grant on accept), `inviterId` (FK → `user.id`), `status` (text), `createdAt` (timestamp), `expiresAt` (timestamp). Note `teamId` exists only if teams are enabled — out of scope, name once and move on. Then the **two application additions** the framework leaves to you: `tokenHash` (text, SHA-256 of the raw token) and `acceptedAt` (timestamp, nullable). Explain *why these two specifically*: the plugin owns identity, tenancy, and lifecycle state, but the token-at-rest discipline and the precise accept moment are application concerns the framework intentionally doesn't dictate.

Code handling: use **`AnnotatedCode`** on the Drizzle table fragment. The block is one `pgTable('invitation', {...})` with the column block plus the partial unique index in the table's second-arg callback. Step through it so the student's attention is directed part-by-part:
1. Highlight `id`, `organizationId`, `inviterId` — identity and the two FKs; note `onDelete: 'cascade'` on `organizationId` (org deletion takes its invitations with it — connects to Chapter 056's cascade; the "accept after org deleted" edge in lesson 5 relies on this).
2. Highlight `email`, `role` — the invitation's *identity value* and the captured role.
3. Highlight `status`, `createdAt`, `expiresAt` — lifecycle columns owned by the plugin.
4. Highlight `tokenHash`, `acceptedAt` (mark `// added` in the source) — the two application additions, with the one-line why.
5. Highlight the index in the callback — the partial unique index (its own section below carries the depth; here just point at it as "the duplicate-pending guard, dissected next").

Note in the prose that `role` and `status` should be constrained, not free `text` — forward-reference the two subsections below. Use a brief **`Aside` (note)** to record the `additionalFields` type-inference gap: configuring the two columns through the plugin's `schema.invitation.additionalFields` works at the DB layer, but Better Auth's generated `auth.api.*` types may not surface them (known bug, Jan 2026) — so the project reads `tokenHash` through its own Drizzle `$inferSelect` type, which is the source of truth per the data-layer convention regardless. One short aside, no rabbit hole.

Code-convention alignment: UUIDv7 PK via `$defaultFn(() => uuidv7())`, snake-case mapping is on the client (so TS `organizationId` ↔ SQL `organization_id`), explicit `name` on the index, FK `onDelete` explicit. `timestamptz` for the timestamps. Note for downstream: the course's time convention is Temporal, but at the Drizzle/DB seam these are `timestamp` columns and the row types carry `Date` at the third-party seam — don't over-engineer Temporal into the schema fragment; the codec boundary is elsewhere.

Tooltip terms (`Term`): `additionalFields` (Better Auth's mechanism for extending a plugin-owned table), `tokenHash` (the SHA-256 digest stored in place of the raw token).

#### Constrain status to its four values

Small focused subsection. The `status` column is one of exactly `pending | accepted | rejected | canceled` (confirmed Better Auth set). The senior reflex: don't leave it as open `text` where a seed-data typo (`'penidng'`) fails silently — constrain it so typos fail loudly. Show the course-standard way: a `CHECK` constraint or a Drizzle enum. Per code conventions the course bans TS `enum` but *Postgres* `pgEnum` (or a `text` column + `check`) is fine for DB-level constraint; recommend the **`text` + `as const` union in TS, enforced by a `check()` at the DB layer** so the TS side stays a string-literal union (matching "never `enum`" in TS) while the DB still rejects bad values. Keep the code to a 2–3 line `Code` snippet showing the `check`/enum line. Name `rejected` as the rare-in-B2B state (invitee declines) — it exists in the set but the chapter barely uses it.

Pedagogical reasoning: this is a "watch-out taught inside the concept it qualifies" — the loud-failure argument belongs with the column definition, not in a bundled tips section.

#### The role is captured here, and `'owner'` is refused

Small subsection on the `role` column as a *decision record*. The invite carries the role because role choice is the inviter's privileged decision (from Chapter 057's RBAC), captured at invite time so the accept screen is trivial. Critically: `'owner'` is **excluded** — only `'admin'` and `'member'` are valid invite roles (ownership transfer is its own flow, Chapter 057 lesson 4). Defense in depth: the invite *form* disables `'owner'`, but the *schema/validation* must refuse it too. Note that the Zod schema enforcing `z.enum(['admin', 'member'])` lands in lesson 2 (the send action) — here, just establish that the column's valid domain at invite time is the two-role subset, and that this is narrower than the member role set. One or two sentences; cross-reference lesson 2 for the Zod enforcement so we don't pre-teach the action.

### The lifecycle: pending, then one terminal state

The state-machine section — second load-bearing visual. Teach the lifecycle: a row is born `pending` (created, email about to be sent), then transitions exactly once to a terminal state: `accepted` (invitee clicked and confirmed), `canceled` (admin revoked), or `rejected` (invitee declined; rare). Then the key senior insight, given its own emphasis: **`expired` is not a state.** It's computed — `expiresAt < now()` — at read time. No background job mutates a row to "expired"; the read path's `where` clause is the source of truth, expired-but-still-`pending` rows accumulate harmlessly, and a retention job (named later) sweeps them.

Diagram: a **state machine** rendered with **Mermaid `stateDiagram-v2`** wrapped in `<Figure>` (per diagram index, state machines → D2 top pick but Mermaid is the named fallback and reads cleanly for a small 4-node machine; Mermaid chosen here for legibility at this size). Nodes: `[*] → pending`; `pending → accepted`; `pending → canceled`; `pending → rejected`. Render the *computed* expired condition as an annotation/note on `pending` (e.g. a note "pending + expiresAt < now() ⇒ reads as expired") rather than a real node — the visual must reinforce that expired is a *filter*, not a stored transition. Pedagogical goal: make the "one write to a terminal state, plus a time-based read filter" model unmistakable, and inoculate against the cron-to-expire instinct.

Consider whether to also use **`StateMachineWalker`** (`kind="machine"`) with this Mermaid diagram in its `diagram` slot — it would let the student click each state and read what it contains (what caused it, what the accept path does on seeing it). This is a good fit (small lifecycle, the lesson lives in *what each state means*). Recommend it as the primary treatment: the walker's per-state cards can carry the "what the accept flow renders when it sees this status" preview without pre-building the accept flow. Downstream agent decides between plain Mermaid-in-Figure vs. walker based on effort; the walker is the richer choice.

Pedagogical reasoning: a lifecycle with a computed pseudo-state is exactly the kind of thing students get wrong on first contact (they reach for a status-mutating job). Showing the topology with the computed condition visibly *outside* the node set is the clearest correction.

### Seven days, on purpose: expiry as a security primitive

The expiry-decision section, framed as "default before override." State Better Auth's **default: 48 hours** (`invitationExpiresIn`, in seconds). Then the senior call for a year-1 SaaS: **seven days** — long enough that "I'll get to it Monday" survives a weekend, short enough that a leaked old email link doesn't grant access months later. Show the config: `organization({ invitationExpiresIn: 60 * 60 * 24 * 7 })` and the reflex of putting the value in a **named constant** (e.g. `INVITATION_TTL_SECONDS`) rather than a bare literal, because it's a *security primitive* not a UX knob. Two consequences to state explicitly:
- Resending an expired invite **mints a new row with a new token and a fresh window** — it never extends the old one (the rotation lands in lesson 4; the *principle* lands here).
- The accept path enforces `expiresAt > now()`; the column is the contract.

Code: a small **`Code`** snippet of the plugin config line with the named constant. No annotation needed — it's two lines.

Pedagogical reasoning: naming the platform default (48h) before the override (7d) is the required "name the threshold the default crosses" beat. Framing expiry as security (not convenience) is the durable senior lens and pre-empts the common beginner instinct to set very long or infinite expiries for "convenience."

### Why the token is hashed at rest

The first of the two structural-decision sections, and the security heart of the lesson. Build the argument as a threat model, simplified-then-complete:
1. The token is the credential that lets a stranger (Bob, who has no account) prove "this invite is mine." It must be unguessable.
2. **Decision A — entropy:** 32 bytes from `crypto.getRandomValues(new Uint8Array(32))`, base64url-encoded (43 chars) for the URL. Connect to Chapter 016 (Web Crypto): the student already has `getRandomValues`. Contrast the alternative `crypto.randomUUID()` — 122 bits is *fine* entropy, but the 32-byte random buffer is the senior reflex for an opaque bearer token (and avoids mixing UUID semantics into a credential). Name `Math.random()` as disqualifying (not cryptographically secure).
3. **Decision B — hash at rest:** the *raw* token goes only into the emailed URL; the database stores `sha256(token)` in `tokenHash`. Threat it defends: an attacker with **read access** to the `invitation` table (leaked backup, SQL injection on a read, a curious insider) gets only hashes and cannot reconstruct a working accept URL. This mirrors password hashing — *but* with a deliberate difference: invites are throwaway and have a 7-day window, so a **fast** hash (SHA-256) is correct; reaching for bcrypt/argon here would be **cargo** (the slow-hash cost defends against offline brute-force of human-chosen secrets; a 256-bit random token has no brute-forceable structure). State that distinction explicitly — it's a senior "know *why* the tool, not just the tool" moment.
4. Note the actual hashing/generation **happens in the send action (lesson 2)** — this lesson establishes the *posture* (raw in URL, hash in DB) and the column that stores it. Don't write the action here.

Diagram: a small **HTML/CSS annotated illustration** (or simple `ArrowDiagram`) contrasting the two locations of the secret — "raw token → email URL (reaches Bob)" vs. "sha256(token) → `invitation.tokenHash` (reaches DB)" — with a callout that a DB read sees only the right-hand box. Pedagogical goal: make the trust-boundary split visual and memorable; this single picture is the lesson's security takeaway. Keep it compact (two boxes + a one-way arrow), horizontal.

Watch-outs woven in (not bundled): storing the raw token (defeats the whole model); using a slow hash (cargo); the index requirement (the accept path looks up *by* `tokenHash`, so the column must be indexed — forward-reference lesson 2's lookup and note the non-unique index on `tokenHash` belongs in the schema). Also name, briefly, that comparing a candidate hash should use a timing-safe compare *as a discipline* (Chapter 016 owns it) even though an indexed SHA-256 lookup doesn't carry the same timing exposure as HMAC verification — the HMAC signature added in lesson 2 is where constant-time compare truly bites.

Tooltip terms (`Term`): `base64url` (URL-safe base64, no `+`/`/`/`=`), `bearer token` (a credential where possession alone grants access), `SHA-256` (a fast one-way hash).

Pedagogical reasoning: the hash-at-rest decision is the single most senior-mindset-heavy idea in this lesson. Building it as an explicit threat model with the bcrypt-is-cargo contrast teaches the *reasoning pattern* (match the cryptographic tool to the actual threat), which is far more durable than the keystroke. This is exactly the "why this approach, when does it break, what would a senior do differently" frame from the pedagogy doc.

### One pending invite per address: the partial unique index

The second structural-decision section. Motivate with the business rule: at most one *pending* invitation per `(organization, email)` — Alice shouldn't be able to fire five pending invites at Bob. The senior reflex: encode the rule as a **database invariant**, not an application pre-check, because a `SELECT`-then-`INSERT` pre-check has a race window (two rapid submits both pass the SELECT, both INSERT). Show the partial unique index:

```
CREATE UNIQUE INDEX invitation_pending_unique
  ON invitation (organization_id, lower(email))
  WHERE status = 'pending';
```

Then the same thing in Drizzle, which is where the **fact-checked gotcha** lives and must be taught correctly:
- `lower(email)` needs a **hand-written helper**: `const lower = (col: AnyPgColumn) => sql\`lower(${col})\``. Drizzle has no built-in `lower()`.
- The `.where(...)` must use a **`sql` template literal** — `.where(sql\`${t.status} = 'pending'\`)` — **not** `eq(t.status, 'pending')`. Using `eq()` emits a parameterized placeholder (`$1`) that produces invalid index DDL (open Drizzle issue). This is a real trap an agent or student would hit; the lesson must show the `sql` form and say *why*.

Code handling: use **`CodeVariants`** for a wrong-vs-right comparison — Tab "Looks right (broken DDL)" with the `eq()` version, Tab "Correct" with the `sql` template-literal version — each tab's prose explaining the parameterization gotcha. This turns a subtle footgun into an explicit lesson. Alternatively fold the correct form into the `AnnotatedCode` from the schema section; the `CodeVariants` wrong/right is the stronger pedagogy here given the trap is non-obvious.

Two refinements to teach:
- `lower(email)` normalizes case so `Bob@Acme.com` and `bob@acme.com` collide (RFC 5321 — same address). Connect to the broader "store email lowercased" discipline that lesson 2's Zod `.toLowerCase()` and lesson 5's mismatch check depend on.
- Because it's **partial** (`WHERE status = 'pending'`), accepted/canceled/expired rows don't participate — Bob can have one accepted row *and* a fresh pending row later (re-invite after he left). This is the precise reason it's partial, not a plain unique.

What the constraint *enables downstream* (name, don't build): when a re-invite hits a pending row, the INSERT fails at the DB layer and the action catches-and-translates it into an `'already-invited'` result with a "resend or revoke?" branch (lesson 4). The index *is* the structural source of that signal.

Exercise: **`DrizzleSchemaCoding`**. Give a starter with `organization` and `invitation` tables where the partial unique index is missing (or stubbed as `(table) => []`). Requirements assert the columns. Two **probes**:
- `mustSucceed: true` — two invitations to the same email across *different* orgs both insert (tenancy in the index key).
- `mustSucceed: false` — a second *pending* invitation to the same email in the *same* org is rejected.
Optionally a third `mustSucceed: true` probe — a pending invite inserts fine when an earlier `canceled` row exists for the same `(org, email)` (proving the partiality). Instructions: "Add the partial unique index so a duplicate *pending* invite is rejected but cross-org and post-cancel re-invites are allowed." This makes the student *feel* the constraint fire — the strongest way to cement why it's partial and tenant-scoped. (Note for downstream: per the schema-coding component, the student writes Drizzle; if the `sql`-template `.where()` or `lower()` helper proves finicky in PGlite, fall back to authoring the index in raw SQL via `seedSQL` and have the student write the table columns — but attempt the Drizzle form first since it's the production shape.)

Pedagogical reasoning: the partial unique index is the lesson's second pillar and the place a beginner most predictably gets it wrong (plain unique blocks legitimate re-invites; app-layer pre-check races). A build-and-watch-it-fire exercise is decisively better than prose here, and the wrong/right `CodeVariants` neutralizes the Drizzle `eq()` footgun before it bites.

### After the click: the invitation and the member are sequential, not joined

The relationship-and-retention section. Two ideas:

**Sequential, not joined.** On accept, the `invitation` row transitions to `accepted` (and `acceptedAt` is set) *and* a new `member` row is inserted — but the two tables are **sequential in time**, not foreign-keyed to each other. The senior reflex: **do not** add a `memberId` FK on `invitation`. The invitation's job *ends* at acceptance; the member's job *begins*. What links them historically is the **audit log** — the `'invitation.accepted'` event carries the new `memberId` in its payload (the actual accept write lands in lesson 3). A tiny **`ArrowDiagram`** or two-box sketch: `invitation (→ accepted)` and `member (new row)` side by side, linked not by an FK arrow but by a dashed "audit log records the handoff" annotation. Pedagogical goal: kill the instinct to over-normalize with a cross-table FK and show where the real linkage lives (the audit trail).

**The row stays; rows are cheap, the answer isn't.** After acceptance the row is *not* deleted — the status flip is the only write. Why: an admin asking "was Bob ever invited, and when did he accept?" is answered by the table. Then retention: accepted rows stay forever (the audit log references them); `canceled` and `expired` (still-`pending`-but-past-`expiresAt`) rows accumulate and are swept by a **retention job that deletes such rows older than ~90 days** — named here, built in Unit 16 (background jobs). Connect back to the "expired is computed" point: no job marks rows expired; one job *deletes* old terminal/stale rows in batch.

Pedagogical reasoning: this section closes the lifecycle loop (what happens *after* the terminal transition) and reinforces the audit-as-linkage pattern the whole unit leans on. Keep it tight; it's the denouement, not new machinery.

### What this schema deliberately does not do: count seats

Short scope-closing section (one tight paragraph, possibly an `Aside`). Some products gate invites on remaining seats ("you have 2 of 5 seats left; this invite consumes one"). That is **billing/entitlements territory** — `entitlements.canInviteMember(orgId)`, Chapter 064. This chapter's schema tracks **no seat count**; the entitlement check, when it exists, runs in the *action body before* the invite write, not in the table. Name it once so the student knows the boundary and doesn't try to bolt seat-counting onto this table. Pedagogical reasoning: pre-empts a predictable "but where do seats go?" question and draws a clean line to the billing unit without teaching it.

### External resources (optional)

One or two `ExternalResource` cards: Better Auth organization-plugin docs (the canonical `invitation` schema and `invitationExpiresIn`), and the Drizzle indexes-&-constraints guide (partial / case-insensitive unique index). Keep to two; this is reference, not required reading.

## Scope

**Prerequisites to redefine in one sentence each (don't re-teach):** the org plugin and `member` table (Chapter 056); `requireOrgUser()` → `{ user, orgId, role }`, the three-role RBAC model and `roleAtLeast`, the `audit_logs` table and `logAudit(tx, event)` (Chapter 057); Web Crypto `getRandomValues` / `subtle` and constant-time compare (Chapter 016 lesson 1); `tenantDb(orgId)` and the snake-case-on-the-client Drizzle convention (Chapter 056 lesson 2).

**This lesson does NOT cover (reserved for later — do not teach):**
- The `sendInvitationAction`, token *generation*, base64url encoding, the HMAC-signed accept URL, and the Resend dispatch — **lesson 2**. (This lesson establishes the *posture* — raw token in URL, hash in DB — and the `tokenHash` column; it does not generate or sign anything.)
- The accept route, the four arrival shapes, the verify order, the consent gate, auto-`emailVerified`, the active-org switch — **lesson 3**.
- The pending-invites list UI, `resendInvitationAction` (token rotation), `revokeInvitationAction`, and the catch-and-translate of the unique-pending error into `'already-invited'` — **lesson 4**. (This lesson names the index *as the source* of that signal but does not write the action or the UI.)
- Inviter-removed-before-accept, strict email-mismatch refusal, the double-click race against `WHERE status='pending'`, already-a-member short-circuit — **lesson 5**.
- Seat-counting / entitlement gating — **Chapter 064**.
- Rate-limiting invite sends — **Chapter 074**.
- Background-queued sends and the retention job *implementation* — **Unit 13 / Unit 16** (named here only).
- React Email template authoring — **Chapter 049 / lesson 2**.
- SCIM / IdP-driven provisioning — out of scope for year-1.

**Explicitly do not:** write a cron/background job that mutates rows to `expired` (the read filter is the source of truth — teach the *absence* of this job as a deliberate choice); add a `memberId` FK on `invitation`; reach for bcrypt/argon for the token; use a plain (non-partial) unique on `(org, email)`.
