# The five member-management flows

Title: The five member-management flows
Sidebar label: Member-management flows

## Lesson framing

This is a **mechanics-heavy consumer lesson**: five small surfaces built on primitives the student already owns — `authedAction(role, schema, fn)` (lesson 2), the `{ user, orgId, role, db }` `ctx` with `db = tenantDb(orgId)` (lesson 2), `roleAtLeast` and the `Role` union and `isLastOwner` (lesson 1), `ctx.db.transaction` (chapter 043), and `logAudit(tx, event)` (foreshadowed for lesson 5). Nothing here is a new primitive; the lesson is *how four near-identical actions and one read compose those primitives*, and the **invariants that live in the action body, not the wrapper**. The mental model to land: **a member-management action is `authedAction` for the role gate + a body that is read → check invariant → transactional write (mutation + audit row) → revalidate → `ok`**. Once the student sees one action in full, the other three are variations on the same five-line skeleton; the lesson's job is to make that skeleton muscle memory and to inoculate against the specific traps each flow hides.

The single most important architectural decision this lesson must get right — and it is a correction to the chapter outline — is **where the membership write happens**. The chapter's spine (lessons 2 and 5, the continuity notes) is "the mutation and its audit row land in *one* transaction, so the audit row exists iff the work landed." Better Auth's `auth.api.updateMemberRole` / `removeMember` / `leaveOrganization` write through the plugin's own adapter and, since Better Auth 1.5, run their `after` hooks *after* that transaction commits — so an audit write hung off a plugin hook lands outside the mutation's transaction and breaks the invariant. The senior call this lesson teaches: **member-management mutations write the `member` table directly through `ctx.db` (Drizzle)**, co-transacting with `logAudit(tx, …)`. The `member` table is a normal table in `db/schema.ts`; Better Auth's adapter maps to it but does not own writes that need atomicity with the app's audit trail. This is the same "consume libraries directly, but own the one seam with a real bug class" stance the chapter takes for `tenantDb` and `authedAction`. State it once, plainly, with the 1.5-hooks reason; do not silently call `auth.api.removeMember`.

Where beginners go wrong (frame these as the pain the lesson relieves):
- Treating invariants (last-owner, can't-remove-self, can't-transfer-to-non-member) as "the UI prevents it" → the action must refuse with a typed code; the UI only renders the message. This is the lesson-1 reflex, now made concrete in four actions.
- Reaching for `auth.api.removeMember` and bolting the audit write on after → the audit row escapes the mutation's transaction. Write the row through Drizzle in the same `tx`.
- Running the mutation and the audit write in two transactions → partial state if the second fails. One `ctx.db.transaction` per flow.
- Putting the role check (`'admin'` / `'owner'`) in the body → that is the wrapper's job; the *domain* invariants (last-owner, self-target, membership existence) are the body's job. The split is the lesson.
- Validating "the target is a member" in Zod → Zod checks shape, not existence; the membership read is a body check that returns `'not-a-member'`.
- Forgetting `revalidatePath('/settings/members')` → the table looks unchanged and the user re-clicks.
- Panicking about "how do I kill the removed user's session" → you don't; their next request fails the membership check in `requireOrgUser` and redirects. The system self-heals because role/membership is read per request (lesson 1).

Teaching stance: lead with the settings-page scene (decisions before syntax), establish the **shared action skeleton** as the spine, then teach the four mutating actions in rising-complexity order (change role → remove → leave → transfer ownership), each foregrounding its unique invariant and its audit event. The listing read comes first as the simplest surface and the place the UI gate is introduced. Close with the cross-cutting realities — session self-healing, the last-write-wins race, the error-code-to-message contract. Cognitive-load discipline: the first full action (change role) is shown end-to-end with `AnnotatedCode`; the next three lean on `CodeVariants` and prose deltas against that skeleton so the student is never re-reading boilerplate. Ownership transfer — the only multi-row, only-built-from-two-`updateMemberRole`-steps flow — earns the one diagram.

Estimated student time: 50–60 min.

## Lesson sections

### The members settings page

Open with the senior question as a concrete scene (bake it into prose, no "the senior question" heading). An org has members; the `/settings/members` page must list them with role and joined date, and — for admins and owners — let them change a member's role, remove a member, leave the org, and (owners only) hand ownership to someone else. Name the shape of the work up front: **one read and four mutations, every mutation an `authedAction`, every mutation guarding one domain invariant and writing one audit row.** Preview the five flows as a list so the student has the map.

Then teach **listing members** as the simplest surface and the place to establish the UI gate:
- A Server Component on `/settings/members` calls a `db/queries/members.ts` read — `listMembers(orgId)` closing over `tenantDb(orgId)`, using `db.query.member.findMany({ with: { user: true } })` to pull name/email alongside role and `createdAt`. Show this as a small `Code` block (~8 lines). Scope comes from `tenantDb`; no manual `where org_id` (callback to chapter 056).
- Pagination is named-not-built: most orgs are under ~50 seats; the unbounded case is chapter 060. One sentence.
- The **UI gate vs the security gate** distinction, stated here and reused all lesson: the page hides the action buttons when `roleAtLeast(role, 'admin')` is false (cosmetic, avoids confusion); the *action* re-checks role in `authedAction` (structural, the real boundary). A `member` sees a read-only roster. Frame it as "gate the UI for UX, gate the action for security — a user can lie about the UI."

Reasoning: the read is the gentle on-ramp and the natural home for the UI/security gate split that every later section relies on. Keeping the query in `db/queries/members.ts` matches the conventions' tenant-scoped-read-helper home.

Terms for `Term`: **RBAC** is owned by lesson 1; do not re-tag. No new tooltips needed here.

### The shape every member action shares

Before any specific action, teach the **skeleton** so the four mutations read as variations, not four new things. This is the load-bearing section.

Establish the five-line body shape every member-management action follows, mapping it onto the conventions' `parse → authorize → mutate → revalidate → return` seam but with authorize/parse already lifted into the wrapper:
1. `authedAction(role, schema, fn)` supplies the **role gate** and hands `ctx = { user, orgId, role, db }` with `db` already tenant-scoped. The body never re-checks the session, the transport role, or touches the bare `db`.
2. The body **reads** what it needs (the target member row, the owner count) through `ctx.db`.
3. The body **checks the domain invariant** and returns a typed domain reason (`'last-owner'`, `'cannot-demote-owner'`, `'not-a-member'`, `'cannot-target-self'`) via `err(...)` — distinct from the wrapper's transport codes (`'forbidden'`, `'validation'`). Reaffirm the lesson-1/lesson-2 split: transport codes come from the wrapper, domain reasons come from the body.
4. The body **writes inside `ctx.db.transaction(async (tx) => …)`** — the membership change *and* `logAudit(tx, event)` in one atomic step.
5. After the transaction commits, `revalidatePath('/settings/members')`, then `return ok(...)`.

Then land the architectural correction explicitly (this is the section that owns it):
- **The membership write goes through Drizzle (`ctx.db`/`tx`), not `auth.api.*`.** Give the reason in one tight paragraph: the chapter's contract is "mutation + audit row in one transaction"; Better Auth's org methods write through the plugin adapter and run their `after` hooks after that transaction commits (Better Auth 1.5+), so an audit row attached to a plugin hook lands *outside* the mutation's transaction. Writing the `member` row directly co-transacts the audit write. The `member` table is a normal `db/schema.ts` table (chapter 056); the plugin maps to it but doesn't own atomic-with-audit writes.
- Name the trade honestly: you forgo the plugin's built-in permission checks on these endpoints, which is exactly why this chapter built `authedAction` and `isLastOwner` — the app owns the gate and the invariant. This is the same Principle-#5 carve-out posture (`tenantDb`, `authedAction`) extended to the membership write, named once.
- One sentence pointing forward: `logAudit(tx, event)` and the full event catalog are lesson 5; here we only call it with the event name and payload each flow needs.

Visual: a small **`Code`** block showing the empty skeleton with `// 1 read`, `// 2 check`, `// 3 transaction { mutate; logAudit }`, `// 4 revalidate`, `// 5 ok` as the only comments, so every later action is "fill in steps 1–3." This is the spine the rest of the lesson hangs on.

Reasoning: teaching the skeleton once collapses four actions into one pattern plus four deltas — directly serving the cognitive-load mandate. Owning the Drizzle-vs-`auth.api` decision here (not scattered in watch-outs) makes it a taught principle, which it must be: it is the chapter's atomicity thesis meeting the library's real 1.5 behavior.

Terms for `Term`: **idempotent** is not needed; **transaction** — only if the writer judges the audience needs it ("A group of database writes that all commit together or all roll back; no partial state."), at its first use in step 4.

### Changing a member's role

Teach the first mutation **end-to-end** — this is the reference implementation; the next three are deltas.

Concepts:
- Signature: `export const changeMemberRole = authedAction('admin', changeMemberRoleSchema, async ({ memberId, role }, ctx) => …)`. Naming follows the continuity contract: verb+noun, **no `Action` suffix** (`changeMemberRole`, not `changeMemberRoleAction`).
- Schema: `changeMemberRoleSchema` with `memberId: z.uuid()` and `role: z.enum(['owner', 'admin', 'member'])` — use Zod 4 top-level `z.uuid()` (conventions), `z.enum` over the `Role` union literals. Keep it tiny.
- The body's domain invariants (step 3 of the skeleton), each with its code:
  - An `admin` cannot create an owner via this action — promotion *to* owner is the ownership-transfer flow, not a role change → `'cannot-promote-to-owner'` (or fold into "owner changes go through transfer"; pick one and state it). Surfacing this here sets up why transfer is a separate action.
  - An `admin` cannot change an existing `owner`'s role → `'cannot-demote-owner'`. Only the owner can step down, and only via transfer.
  - The last-owner guard: demoting the only owner is refused → `'last-owner'`, reusing `isLastOwner(orgId)` from lesson 1. Note the common case "demoting yourself when you're the last owner" usually *falls out of* the last-owner check rather than needing a separate self-ban — state this so the student doesn't write a redundant check.
- The write: a single `member` row update plus the audit row, in one `ctx.db.transaction`. Audit event: `'member.role-changed'`, payload `{ before, after }` (the previous and new role) — the JSONB diff shape lesson 5 formalizes.
- Revalidate `/settings/members`, return `ok` with the updated row (or a minimal `{ memberId, role }`).

Presentation: **`AnnotatedCode`** on the full action (~16–18 lines; respect `maxLines`), stepping through: (1) the `authedAction('admin', …)` line and what the wrapper already guaranteed (`color="blue"`); (2) the read of the target member through `ctx.db` (`color="blue"`); (3) the three invariant checks returning typed codes (`color="orange"` — the watch-out cluster); (4) the `ctx.db.transaction` with the update + `logAudit(tx, { action: 'member.role-changed', … })` (`color="green"` — the atomic write); (5) `revalidatePath` + `ok` (`color="green"`). Keep each step's prose to one tight paragraph.

Reasoning: role-change is the simplest *mutation* (single row) yet exercises every part of the skeleton including the last-owner guard — the ideal reference action. AnnotatedCode is the right tool because one block needs attention steered to five distinct regions; doing this once lets the next three actions be taught as deltas.

### Removing a member

Teach as a **delta** against change-role; do not re-show the skeleton.

Concepts:
- Signature: `export const removeMember = authedAction('admin', removeMemberSchema, async ({ memberId }, ctx) => …)`. Schema is just `{ memberId: z.uuid() }`.
- Invariants unique to removal:
  - Can't remove **yourself** → `'cannot-target-self'`; the path to self-exit is `leaveOrganization`. (Compare the target member's `userId` to `ctx.user.id`.)
  - Can't remove the **last owner** → `'last-owner'` (`isLastOwner`).
  - An `admin` can remove `admin`s and `member`s but not `owner`s → `'cannot-remove-owner'`.
- The write is a **hard delete** of the `member` row, not a soft delete — membership is not an entity with its own history; the audit log holds the trail. State this senior call explicitly (it contrasts with the soft-delete habit students may carry). Delete + `logAudit(tx, { action: 'member.removed', subjectId: memberId, payload: { previousRole } })` in one transaction.
- Forward-pointer to the session section: the removed user is not signed out; their next request self-heals.

Presentation: **`CodeVariants`** with two tabs — "Skeleton" (the empty shape from the shared-shape section, for orientation) and "removeMember" (the filled action with `del`/`ins` or plain highlight on the delete line and the self-target check). First sentence of the filled tab carries the framing ("hard delete; the audit row is the history"). Six-line prose cap; deeper discussion in surrounding prose.

Reasoning: removal differs from change-role only in the invariant set and delete-vs-update — exactly what CodeVariants is for (same shape, focused diff). The hard-delete decision is the one genuinely new senior call and gets prose weight.

### Leaving the organization

Teach as a **delta**, foregrounding the self-service + fallback-session mechanics.

Concepts:
- Signature: `export const leaveOrganization = authedAction('member', emptySchema, async (_input, ctx) => …)`. Any role may *attempt* to leave, so the wrapper's minimum is `'member'`; the schema is an empty object (name the `emptySchema` convention or `z.object({})`).
- The one invariant: an `owner` cannot leave without transferring first → `'last-owner-must-transfer'`. Tie back: leaving is the third flow that touches the single-owner invariant (lesson 1 named all three). For a non-last owner the situation can't arise (another owner exists), so the precise check is "if I'm an owner and `isLastOwner`, refuse."
- The write: delete the caller's own `member` row + `logAudit(tx, { action: 'member.left' })`, one transaction.
- The **active-org fallback** side effect: if the leaving user had this org as `activeOrganizationId`, pick a fallback after the delete — first remaining membership, else clear it. Then redirect: `/dashboard` if they still have orgs, `/onboarding/create-org` (or the chapter's actual no-org route) if none. Note this is the one member action that legitimately reaches for a Better Auth call *outside* the transaction — `auth.api.setActiveOrganization` to move the session pointer — because the session/active-org is Better Auth's to own, and it is a post-commit side effect, not part of the membership-delete atom. Contrast cleanly with the audit write (which *must* be in the transaction): session pointer = post-commit, audit = in-transaction.

Presentation: small **`Code`** block for the action body plus a one-line **`Aside`** (note) on the redirect targets. No diagram.

Reasoning: leave-org introduces the fallback-session concern and the clean line between "in-transaction (audit)" and "post-commit external (session pointer)" — a genuinely instructive boundary that reinforces lesson 2's "external calls outside the transaction" rule without contradicting the audit-in-transaction rule. Keeping `setActiveOrganization` as the named exception (session is the library's) keeps the Drizzle-writes-membership rule honest rather than absolute.

### Transferring ownership

The most complex flow and the only multi-row write — give it the lesson's one diagram.

Concepts:
- Signature: `export const transferOwnership = authedAction('owner', transferOwnershipSchema, async ({ newOwnerId }, ctx) => …)`. Only an owner can initiate; the wrapper enforces that. Schema: `{ newOwnerId: z.uuid() }`.
- Invariants:
  - The target must be an **existing member of this org** → `'not-a-member'`. This is a *body* check (read the target's `member` row through `ctx.db`), not a Zod check — reaffirm "Zod validates shape, existence is a DB read."
  - Can't transfer to **yourself** → `'cannot-target-self'`.
  - High-stakes-mutation note: ownership transfer is one of the conventions' fresh-session-required actions; name once that a production build re-checks `session.freshAge` and may return `'requires-re-authentication'` (owned by chapter 052) — named, not built here, to keep focus.
- The atomic two-row write, **built from two role changes** (key research finding: Better Auth has *no* dedicated transfer endpoint; transfer = promote new owner to `owner`, then demote old owner). In the app's transaction: update target `member.role = 'owner'`, update caller `member.role = 'admin'` (the year-1 default demotion target — former owner keeps admin access without billing; note `'member'` is a valid product choice and call it a product decision), and `logAudit(tx, { action: 'org.ownership-transferred', subjectId: newOwnerId, payload: { from: ctx.user.id, to: newOwnerUserId, demotedTo: 'admin' } })`. All three writes in one `ctx.db.transaction` so a half-transferred org is impossible.
- Revalidate, `ok`.

Diagram (this section's earned visual): a **Mermaid `sequenceDiagram`** wrapped in `<Figure>`, actors = Owner (browser) → `transferOwnership` action → `ctx.db.transaction` → DB. Steps: submit `newOwnerId` → wrapper resolves session + `roleAtLeast('owner')` → body reads target member (branch: not a member → `'not-a-member'`) → open transaction → UPDATE target → 'owner' → UPDATE self → 'admin' → INSERT audit row → COMMIT → revalidate → `ok`. The pedagogical goal: make the **atomicity** visible — all three writes inside one transaction bracket, so the reader *sees* that nothing commits until COMMIT. Apply the `themeCSS` font-size bump from the mermaid doc so the labels read on a narrow card; keep it horizontal/compact.

Optional reinforcement: a **`Sequence`** ordering exercise — give the student the shuffled steps of the transfer (resolve session, check role, read target, begin tx, promote new owner, demote old owner, write audit, commit, revalidate) and have them order them. This drills the "audit and both role writes are *inside* the transaction, revalidate is *after*" sequencing — the exact thing the diagram teaches, now actively recalled. Pre-built `Sequence` fits; no custom component needed.

Reasoning: transfer is the only flow where order and atomicity genuinely matter (two coupled writes that must not half-apply), so it earns both the sequence diagram and the ordering exercise. Grounding it in "no transfer endpoint exists — you compose it from two role changes" is the load-bearing research correction; without it a student would hunt for `auth.api.transferOwnership` and not find it.

### Why removed members don't need a logout

A short cross-cutting section resolving the question students fixate on: "how do I force-log-out the member I just removed?"

- The answer: you don't issue a logout. The removed user's browser session is still valid (they're signed in to the app), but it carries `activeOrganizationId = thisOrg`. On their **next request**, `requireOrgUser` (lesson 1) reads role/membership fresh per request, finds no `member` row for `(thisOrg, userId)`, and redirects — to `/dashboard` if they have other orgs, to the no-org route otherwise. The system self-heals because authority is read per request, never trusted from a stale token.
- Connect explicitly to the lesson-1 reflex ("read the role at request time") and the lesson-2 wrapper (the per-request read lives in `requireOrgUser`, which the wrapper calls): the removal action does nothing special; correctness falls out of the per-request read the chapter already built.
- One sentence on the bounded staleness window: Better Auth's cookie-session cache means the change can take up to the cache window (conventions: short, e.g. minutes) to bite if the cache is hit; the conventions' demote-revokes-other-sessions posture is the production hardening (named, owned by chapter 052), not built here.

Visual: a tiny **two-step `DiagramSequence`** — step 1 "Admin removes Bob (member row deleted)"; step 2 "Bob's next request → requireOrgUser finds no membership → redirect" — to make the self-healing concrete without a heavy diagram. Or, if simpler, two plain prose paragraphs; the writer chooses. Keep it light.

Reasoning: this is the single most common conceptual stumble in membership removal, and it is *already solved* by chapter machinery — the section's value is connecting the dots, not new code. Placing it after the actions means the student has seen the deletes and can now see why no extra step is needed.

### What the user sees when an action fails

Close with the **error-code-to-message contract** — the seam between the typed domain reasons the actions return and the UI.

- The UI surface recap (brief, no full code): the members table renders role dropdowns and a remove button per row (both gated on `roleAtLeast(role, 'admin')` and *not* shown on the current user's own row), a "Transfer ownership" affordance for owners, and a "Leave organization" button for the current user. Reaffirm: gate the UI for UX, the action for security.
- The contract: each action returns `Result` — `ok` on success, or `err(code, userMessage)` where `code` is one of the domain reasons. `useActionState` at the form root surfaces `state.error.userMessage` (toast or inline). The student wires one message per code.
- The **error-code table** the lesson promised — earns its weight as the closing reference. Rows = code, the flow(s) that emit it, the user-facing message. Suggested rows: `'last-owner'` (change-role, leave), `'cannot-demote-owner'` / `'cannot-remove-owner'` (change-role, remove), `'cannot-target-self'` (remove, transfer), `'not-a-member'` (transfer), `'last-owner-must-transfer'` (leave), plus the wrapper-supplied `'forbidden'` (any, when role gate fails) and `'validation'` (any, bad input) so the student sees transport and domain codes side by side. A Starlight markdown table; keep to ~8 rows for a short viewport.
- One line on **optimistic updates**: role changes are a single fast row, so `useOptimistic` on the dropdown is a reasonable reach (instant flip, roll back + toast on a returned error code); the default is the plain `useActionState` flow. Name the option, default to simple — matches the conventions' optimistic-UI guidance without mandating it.
- One line on the **last-write-wins race** (two admins editing the same member): acceptable for role changes (no invariant violated, the audit log records both writes); the optimistic-concurrency `version`-column reach (chapter 061) is named for the rare case where it matters (notably simultaneous transfers). Year-1 default: last-write-wins, the audit log answers "who did what when."

Reasoning: the actions are only useful if their typed failures reach the user, so the lesson must close the loop from `err(code)` to a rendered message; the table is the highest-density way to show the full code surface (domain + transport) in one glance and doubles as the lesson's recap. Optimistic UI and the race are named-not-built so the student knows the senior options exist without inflating scope.

#### Terms for Tooltip

Use `Term` sparingly:
- **transaction** — "A group of database writes that all commit together or all roll back; no partial state." (first use, in the shared-shape section, only if the writer judges the audience needs it; chapter 043 introduced transactions, so this is a light refresher, not a re-teach.)
- **optimistic update** — "Showing the result of an action in the UI immediately, before the server confirms, then rolling back if it fails." (at its single mention in the last section.)

Do not tag `owner`/`admin`/`member` (defined in lesson 1), `RBAC` (lesson 1), or `Result`/`ctx`/`authedAction` (lessons 2–3, the student owns these).

## Scope

Prerequisites to restate concisely (one sentence each, as callbacks — do not re-teach):
- `authedAction(role, schema, fn)` and the `ctx = { user, orgId, role, db = tenantDb(orgId) }` payload, the four wrapper gates, and `Result`/`ok`/`err` with transport codes `'forbidden'`/`'validation'` — lesson 2.
- `Role` union, `roleAtLeast`, the single-owner invariant and `isLastOwner(orgId)`, the `'last-owner'` domain code, and `requireOrgUser` reading role per request — lesson 1.
- `tenantDb(orgId)`, the `member` table and its `role` column, `activeOrganizationId` on the session — chapter 056.
- `ctx.db.transaction(async (tx) => …)` as the multi-row-write tool, external calls outside the transaction — chapter 043 / conventions.

This lesson does **not** cover:
- The `audit_logs` table shape, the append-only RLS/grants enforcement, the `logAudit(tx, event)` implementation, and the full event catalog — lesson 5. This lesson *calls* `logAudit` with the event each flow needs and names the events (`member.role-changed`, `member.removed`, `member.left`, `org.ownership-transferred`) but builds no table.
- The `authedAction` wrapper internals (lesson 2) and the `authedRoute` twin (lesson 3) — these flows are all Server Actions because the caller is the React dashboard; route handlers are not required here.
- Invitations / adding new members — chapter 058 entirely (`addMember` and the invite-accept handshake are out of scope; this lesson only removes, changes, leaves, transfers).
- The fresh-session re-authentication gate for high-stakes mutations and cookie-cache staleness/`revokeOtherSessions` — chapter 052; named once at transfer-ownership and the session section, not built.
- Optimistic-concurrency `version` columns for the simultaneous-write race — chapter 061; named once.
- Pagination / unbounded member lists — chapter 060; named once.
- Per-feature permissions, ABAC, custom roles — named once in lesson 1; not revisited.
- Bulk member operations, CSV import, SCIM provisioning — out of scope for year-1.
- The broader settings page (billing tab, integrations) — Unit 11 and elsewhere.

## Notes for downstream agents (research-grounded corrections)

- **Write the `member` table through Drizzle (`ctx.db`/`tx`), not `auth.api.removeMember` / `updateMemberRole` / `leaveOrganization`.** The chapter's invariant is "mutation + audit row in one transaction." Better Auth 1.5+ delays plugin `after` hooks until *after* the transaction commits (official guidance: "use the adapter directly within the main operation" for additional atomic writes), so an audit write hung on a plugin hook lands outside the mutation transaction. The chapter outline's watch-out that says "call `auth.api.removeMember` and put the role gate in `authedAction`" is therefore **reframed**: the role gate is in `authedAction`, but the membership *write* is direct Drizzle so it co-transacts with `logAudit`. The one sanctioned `auth.api` exception is `setActiveOrganization` in `leaveOrganization`, because the session/active-org pointer is Better Auth's to own and is a post-commit side effect.
- **There is no `auth.api.transferOwnership`.** Ownership transfer is composed from two role updates (promote target to `'owner'`, demote caller to `'admin'`) inside one app transaction. Do not write a call to a transfer endpoint; the student builds the atomic two-row write themselves. This is precisely why the flow earns the sequence diagram.
- Better Auth's plugin *does* itself prevent removing/demoting the last owner on its own endpoints — but since this lesson writes membership directly, the app must own that guard via `isLastOwner` (lesson 1). Frame `isLastOwner` as "the guard we own because we own the write," not redundant with the library.
- Naming follows the continuity contract: verb+noun, **no `Action` suffix** — `changeMemberRole`, `removeMember`, `leaveOrganization`, `transferOwnership` (the chapter outline's `…Action` names are superseded). Schemas: `changeMemberRoleSchema`, `removeMemberSchema`, `transferOwnershipSchema`, `emptySchema`.
- Keep code aligned with conventions: Zod 4 top-level `z.uuid()` (never `z.string().uuid()`), `z.enum` for the role input, `safeParse` is inside the wrapper so action bodies receive parsed input, transactions via `ctx.db.transaction`, `revalidatePath` after the write and before `return`, `Result` returns (throw only for impossible states), `db/queries/members.ts` for `listMembers`. Domain reason codes (`'last-owner'`, `'cannot-demote-owner'`, `'cannot-remove-owner'`, `'cannot-target-self'`, `'not-a-member'`, `'cannot-promote-to-owner'`, `'last-owner-must-transfer'`) live in the body and are distinct from the wrapper's transport codes.
