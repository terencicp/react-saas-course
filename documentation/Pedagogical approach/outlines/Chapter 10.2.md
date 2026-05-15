## Concept 1 — Three roles, not a permissions matrix

**Why it's hard.** The instinct of a junior reading "authorization" is to build a permission table — actions × roles, checkboxes, a custom role editor — because every B2B SaaS they've ever logged into seemed to have one. The senior call is the opposite: ship owner/admin/member, name the trigger that would flip the decision, and don't touch the matrix until a paying customer asks for it. The hardness is unlearning the urge.

**Ideal teaching artifact.** A Decision archetype opening with a "what would you build?" prompt that surfaces the matrix instinct, immediately followed by a side-by-side capability table: three columns (owner / admin / member), nine or ten rows (billing, transfer ownership, manage members, edit settings, see audit log, read content, write content, leave org, change own profile). The student reads the table and notices it covers the 80% case without a permissions concept anywhere. Underneath, a single short paragraph names the *trigger* that would flip the call — "a paying customer says 'we need an approver role that can do X but not Y'" — and explicitly defers the granular system as a conditional reach. The capability table is the canonical map; it lives in `src/lib/auth/roles.ts` as a const and the student returns to it whenever a privileged action is added.

**Engagement.** A `Buckets` drill — eight to ten product actions ("delete the org", "invite a teammate", "view the billing portal", "rename a customer record", "view audit log", "leave the org") dragged into owner-only / admin-or-above / any-member buckets. The student must place every item; misplacements reveal which authority gradient they got wrong.

**Components.**
- `Figure` wrapping a hand-authored capability table for the role matrix. Static, but the *layout* is the teaching — three columns, capabilities grouped by domain (billing / membership / content / self).
- `Buckets` for the action-classification drill.
- `Aside` (caution variant) for the trigger that flips to a granular matrix — one paragraph, named, not built.

**Project link.** Chapter 10.4 ships `roleAtLeast`, `requireOrgUser`, and the `changeMemberRoleAction` that consumes this exact map; the table the student internalizes here is what they grep against when wiring the role checks in 10.4.5.

---

## Concept 2 — The single-owner invariant lives in the helper

**Why it's hard.** Three different flows touch this invariant — remove member, demote member, leave org — and a junior fixes it in three places (or worse, in the UI by hiding buttons). The misconception is "I gated the button, the user can't trigger this." The senior shape is one query, one error code, one site of enforcement that every entry point routes through.

**Ideal teaching artifact.** A wrong-by-default sandbox the student has to repair. Three stub Server Actions (`removeMemberAction`, `changeMemberRoleAction`, `leaveOrgAction`) are wired with cosmetic UI gates only — the page hides the buttons for non-admins, but the actions themselves don't check the last-owner invariant. The student gets a failing test suite with three scenarios: (1) the last owner removes themselves via leave-org, (2) an admin demotes the only owner to admin, (3) the only owner removes themselves via a crafted FormData POST. The student's job is to refactor — extract a `requireAtLeastOneOwnerAfter(...)` guard helper, route all three actions through it, watch all three tests flip green. The artifact teaches by forcing the student to *feel* the duplication that the helper collapses.

**Engagement.** The guided-puzzle artifact carries the assessment. Follow-up `MultipleChoice` confirming the recall beat: *"Why does the last-owner check live in the helper instead of the UI?"* with four distractors covering "the UI is faster", "users can't bypass the UI", "DRY", and the correct "the action is callable from anywhere — a curl POST, a stale tab, a partner integration — and only the server-side helper sees every entry point."

**Components.**
- `ReactCoding` in tests mode for the repair exercise — three failing scenarios, the student refactors until they pass. The seed code carries the three actions; the test runner exercises each adversarial path.
- `MultipleChoice` for the follow-up recall.

**Project link.** 10.4.5 builds `changeMemberRoleAction` with explicit refusals on owner targets and last-owner demotion — the same helper shape lands there.

---

## Concept 3 — `roleAtLeast` and the total order

**Why it's hard.** Without a single source of truth for role rank, comparisons scatter as `role === 'admin' || role === 'owner'` and the codebase quietly fragments. Adding a fourth role later requires hunting every comparison. The concept is small but the absence of it costs later.

**Ideal teaching artifact.** A `Tokens` exercise on a deliberately ugly snippet that has the ad-hoc form littered across an action body — six or seven role-string comparisons inline. The student clicks every fragment that should be replaced with `roleAtLeast(role, 'admin')`. After the click round, the revised block appears with the comparisons collapsed to the helper and a single `ROLE_RANK` const at the top. The artifact lands the *cost* of not having the helper before showing the helper.

**Engagement.** The `Tokens` interaction is the assessment. Follow-up beat: a tiny `TypeCoding` that asks the student to type the `Role` union and `ROLE_RANK` so `roleAtLeast(role: Role, required: Role)` typechecks. The type signature is the durable artifact.

**Components.**
- `Tokens` over a junk-comparisons snippet for the "spot the smell" round.
- `TypeCoding` for the union + record shape that makes the helper sound.

---

## Concept 4 — The missing-role-check bug class

**Why it's hard.** Discipline-inside-the-body is the obvious answer to "how do I make sure every action checks the role." Discipline-inside-the-body is what fails in a fast PR. The student has to feel the failure before the wrapper looks load-bearing — and the failure is structural, not "the developer was sloppy." A line that should be there isn't, the reviewer scanned for three lines and saw two, the bug ships.

**Ideal teaching artifact.** A `CodeReview` archetype: a small diff in a fictional PR adding `deleteCustomerAction`. The author wrote `requireOrgUser` (caught the session), wrote `safeParse` (caught the input), and forgot the `roleAtLeast(role, 'admin')` line. The student leaves an inline review comment. The AI grader checks for the kernel phrase — "missing role check, members can delete customers." The exercise replicates the actual production failure: a near-correct action body where the missing check looks plausibly intentional. The student internalizes the bug class by hunting one in a realistic diff, not by reading about it.

**Engagement.** The `CodeReview` *is* the assessment — the student either spots the missing line or doesn't. Follow-up beat: a single `TrueFalse` round (three statements) confirming "the defense is a wrapper at the boundary, not a body convention" and refuting two plausible-sounding alternatives ("a lint rule that requires `requireRole` in every action", "a code-review checklist item").

**Components.**
- `CodeReview` carrying the missing-check diff and the kernel rubric.
- `TrueFalse` for the follow-up.

**Project link.** 10.4.5 will land `authedAction` directly because the student has already felt the failure mode this concept exposes.

---

## Concept 5 — `authedAction` as the structural fix

**Why it's hard.** The wrapper's payoff isn't obvious from its signature alone; the student needs to see the action body *before* and *after* and feel the collapse — five seams to one, business logic to just-the-work. They also need the four-step internal order (`requireOrgUser` → `roleAtLeast` → `safeParse` → call `fn`) clear enough to debug a failure at any seam.

**Ideal teaching artifact.** Two coupled views, side by side. On the left, a `CodeVariants` block showing the same `removeMemberAction` in three tabs: "before" (every check inline, 25 lines), "after" (wrapped, 8 lines, just the work), and "the wrapper itself" (the factory implementation). On the right, a `DiagramSequence` scrubbable through the four wrapper steps — form submit → step 1 `requireOrgUser` → step 2 role check → step 3 `safeParse` → step 4 `fn(input, ctx)` → `Result` returned. At each step the panel shows what's in `ctx`, what gets returned on failure, what propagates to the form. The student scrubs and watches the typed payload build up across steps; they pin the four-step order before they touch the code.

**Engagement.** A `Sequence` exercise where the student orders the four wrapper steps with a fifth distractor (`revalidatePath`, which belongs *inside* `fn`, not in the wrapper) thrown in. Misordering or accepting the distractor flags the failure mode they'd hit in code.

**Components.**
- `CodeVariants` for the before/after/wrapper tabs.
- `DiagramSequence` for the scrubbable four-step walkthrough — each step is a Figure with the `ctx` payload and the failure branch annotated.
- `Sequence` for the recall step.

**Project link.** 10.4.5 builds the four-step wrapper directly; the scrubbed sequence is the spec.

---

## Concept 6 — The Principle #5 carve-out

**Why it's hard.** The course has been telling the student "consume libraries directly, don't wrap for its own sake" since Unit 7. Now there's a wrapper. The student needs to know precisely *why this one earns its place* and *why most other wrappers don't*, or they'll generalize the carve-out and start wrapping everything. This is a Decision concept disguised as a meta-concept.

**Ideal teaching artifact.** A short Decision panel — a `Figure` with a two-column table. Left column: wrappers that *don't* earn their weight in this stack (tRPC-style middleware tower, "before/after" hooks on every action, generic "permission middleware" with a DSL, "validation middleware" separate from the action). Right column: the two wrappers that *do* — `authedAction` and `tenantDb` — paired with the structural bug class each one closes (missing role check; missing tenant filter). The pairing is the lesson: a wrapper earns its place when it closes a *named, recurring* bug class that body-level discipline reliably fails to catch. Otherwise, body it.

**Engagement.** A `MultipleChoice` (multi-select auto-mode) presenting six candidate wrappers a junior might propose — `loggedAction` (adds request logs), `cachedAction` (memoizes the call), `featureFlaggedAction` (gates on flags), `txAction` (auto-wraps in transaction), `csrfAction` (the framework already does this), and one genuinely justified candidate the student should defer (`idempotentAction`, named for Chapter 12.1). The student picks which earn the carve-out and which don't. The correct picks are zero — every body-able concern stays in the body, and `idempotentAction` waits for 12.1 because the bug class isn't load-bearing yet.

**Components.**
- `Figure` wrapping the two-column carve-out table.
- `MultipleChoice` in multi-select mode for the six-candidate sort.

---

## Concept 7 — Same discipline, two response shapes

**Why it's hard.** The student has internalized `Result<T>` for Server Actions and now sees a sibling wrapper that returns `Response` with HTTP status codes and an RFC 9457 body. The temptation is to ask "why don't we just return `Result` from the route handler too?" — and the answer is structural: HTTP clients (curl, fetch, partner SDKs) expect status codes, not 200-with-`ok:false`. The discipline is identical; the *shape at the edge* is the part that differs.

**Ideal teaching artifact.** A `TabbedContent` side-by-side: tab A "Server Action seam", tab B "Route handler seam". Each tab shows the same conceptual flow — session check, role check, schema parse, business call — but in different panes: the action tab shows `requireOrgUser` → `roleAtLeast` → `safeParse` → `fn` → `Result<T>`; the route tab shows the same four steps → `Response.json` (200/201) or a Problem Details `Response` (401/403/422/404). Below, a small status-code map renders as a `Figure` table: input failure mode → HTTP status → Problem Details type. The single-image takeaway: the four steps are identical, only the edge differs.

**Engagement.** A `Matching` drill — left column lists six failure scenarios ("session missing", "session valid, role too low", "URL says /api/customers/42 but the row belongs to another org", "body fails schema parse", "happy path on POST", "happy path on DELETE"); right column lists HTTP status codes (401, 403, 404, 422, 201, 204). The student draws the lines. The 404-over-403 cross-tenant case is the one that catches juniors.

**Components.**
- `TabbedContent` for the action-vs-route side-by-side.
- `Figure` wrapping the status-code map.
- `Matching` for the failure → status drill.

---

## Concept 8 — One business function, two seams

**Why it's hard.** When the same mutation is needed from both a React form and a partner API, juniors either duplicate the work or call the Server Action from the route handler (which doesn't work cleanly across runtimes and contexts). The senior shape is "pure `/lib` function, wrapped twice." This is Principle #3 (pure functions in `/lib`, side effects at named boundaries) showing up as concrete code.

**Ideal teaching artifact.** A small architectural diagram — a `Figure` with hand-authored SVG showing three boxes vertically: a React form on top, a partner POST on the right, and `createInvoice(input, ctx): Promise<Result<Invoice>>` in `/lib/invoices/` at the bottom. Two arrows: form → `authedAction('admin', schema, createInvoice)` → `/lib/invoices/createInvoice`; partner → `authedRoute('admin', schema, createInvoice)` → `/lib/invoices/createInvoice`. Both wrappers terminate at the same pure function. The diagram makes "shared kernel, two seams" structurally visible.

**Engagement.** A `DrizzleCoding` mini-exercise where the student is given a Server Action that includes the business logic inline, and refactors it: extract the work into a `/lib` function, rewrite the action to call it via `authedAction`, then write the route-handler twin via `authedRoute`. The grader checks both call paths produce the same result against a seeded DB.

**Components.**
- `Figure` with hand-authored SVG (two arrows converging on a `/lib` function box) — single-use in this chapter but compounds across the course (every shared-business-logic case in Units 11/12/13 reuses this mental model; treat the SVG as a per-chapter asset, not a bespoke component).
- `DrizzleCoding` for the refactor exercise — the student writes the extracted `/lib` function and proves both seams call it.

---

## Concept 9 — Five flows, one shape, invariants in the helper

**Why it's hard.** Five Server Actions sharing a wrapper signature looks repetitive on the surface. The teaching is that the *shape* is the constant and the *invariant per flow* is the variable — and the invariants are subtle: remove-yourself is leave-org, demote-yourself is fine unless last-owner, transfer-to-non-member is a runtime check Zod can't do. A flat reference would lose the student in the middle.

**Ideal teaching artifact.** A reference card per flow, but rendered as five tabs in a `TabbedContent`, each tab structured identically: signature line, required role, schema, invariants checked in body, audit event emitted, error codes returned. The parallelism is the teaching — five tabs, same five rows, only the cell contents change. A student who skips the body and reads only the headers across all five tabs gets the canonical shape. Below the tabs, a single sequence diagram (Mermaid) for the *hardest* flow, transfer-ownership: the two-row transaction that promotes the new owner and demotes the old in one step.

**Engagement.** A `Buckets` drill on error codes — eight failure scenarios sorted into the canonical error codes (`'last-owner'`, `'cannot-demote-owner'`, `'forbidden'`, `'not-a-member'`, `'cannot-remove-self'`, `'last-owner-must-transfer'`). The drill forces the student to internalize which invariant fires which code, which is the part they'll consult when writing the UI's error messaging.

**Components.**
- `TabbedContent` for the five-flow reference card.
- Mermaid sequence diagram (rendered via `Figure` per the standard pattern) for the transfer-ownership transaction.
- `Buckets` for the error-code sort.

**Project link.** 10.4.5 ships `changeMemberRoleAction` with the same invariant set; the student returns to this concept's five-tab reference when they write it.

---

## Concept 10 — The session resolves itself

**Why it's hard.** Juniors assume "kicking someone out" needs an explicit `killSession` call. The senior shape is that the session stays valid (the user is still signed in) but `requireOrgUser` finds no `member` row for `activeOrganizationId` on the next request and redirects naturally. Nothing to "kill," just per-request truth-reading. This concept is small but a senior trap if missed.

**Ideal teaching artifact.** A `DiagramSequence` scrubbed across three frames. Frame 1: Alice (admin) and Bob (member) both have active sessions in two tabs. Frame 2: Alice clicks "remove Bob"; the `member` row for Bob is deleted; Alice's tab re-renders. Frame 3: Bob's tab — still signed in, still has `activeOrganizationId = thisOrgId` in his session — refreshes; `requireOrgUser` reads `member` for `(orgId, userId)`, finds nothing, redirects to `/onboarding/create-org`. The scrubbing makes the "no kill call, just per-request truth" mechanism visible.

**Engagement.** A two-question `TrueFalse` follow-up: (1) "After removal, Bob's session must be deleted from the DB for him to be kicked out" — false; (2) "If Bob has multiple orgs and the removed one was active, the helper should pick a fallback active org on his next request" — true (the senior reach).

**Components.**
- `DiagramSequence` for the three-frame walkthrough. Each frame is a `Figure` with hand-authored SVG showing the two browser tabs and the DB state. Single-use in this chapter; the underlying `DiagramSequence` component already exists, so no new component is needed.
- `TrueFalse` for the recall round.

---

## Concept 11 — Append-only, three layers deep

**Why it's hard.** "Append-only" sounds like a property of the data, but in production it's three coupled defenses: an RLS policy denying UPDATE/DELETE, table grants the app role doesn't have, and the application discipline of never issuing one. Junior shops ship the table without one or more of the three and discover the gap during an audit. The student needs all three layers visible at once or they'll think the application discipline is sufficient.

**Ideal teaching artifact.** A `Figure` with hand-authored SVG: a single `audit_logs` table at the center, three concentric defense rings around it. Outer ring: "application discipline — no UPDATE/DELETE in `/lib` or `/app`." Middle ring: "table grants — the app role has SELECT + INSERT only." Inner ring: "RLS policy — `FOR UPDATE TO authenticated USING (false)` and same for DELETE." Each ring is annotated with the attack it defeats: outer defeats a bug, middle defeats SQL injection that bypassed the app, inner defeats a compromised migration. Beneath the diagram, a short prose paragraph names the carve-out (the owner role bypasses for legal retention deletion — explicit, rare, documented).

**Engagement.** A `MultipleChoice` (multi-select): six attack scenarios, the student picks which layers defend against each. ("A bug in a `/lib/audit.ts` helper issues `db.delete(auditLogs).where(...)`" → application discipline catches this. "An attacker injects SQL through an unvalidated string concat" → RLS + grants catch this. "A junior writes a migration that does `UPDATE audit_logs SET payload = ...`" → grants catch this if it runs as the app role; RLS catches it regardless.) The drill forces the student to think defense-in-depth instead of single-layer.

**Components.**
- `Figure` with hand-authored SVG for the three-ring diagram. Treat as a per-chapter asset; the concentric-defense visual doesn't recur with enough volume to justify a bespoke component.
- `MultipleChoice` multi-select for the defense-layer drill.

**Project link.** 10.4.4 lands the `pgPolicy` rules and the table grants directly.

---

## Concept 12 — What gets audited, what doesn't

**Why it's hard.** The instinct is "audit everything for safety." The result is a debug log, not an audit log — signal lost in noise, the table grows unboundedly, queries slow down, and the auditor stops trusting the trail. The senior call is "audit the verbs an auditor would ask about three months from now"; the cut requires explicit examples on both sides.

**Ideal teaching artifact.** A `Buckets` drill front-and-center as the teaching artifact itself — sixteen candidate events sorted into "audit" / "don't audit" buckets. Examples on the audit side: member role changed, member removed, billing plan changed, data exported (large reads), org deleted, settings changed (sensitive fields). On the don't-audit side: viewing the dashboard, marking a task done, creating a comment, the Stripe webhook (already recorded in `processed_events`), every CRUD UPDATE on `invoices`. The student sorts; misclassifications surface as "you put 'viewed dashboard' in audit — that's a debug log, not an audit log" feedback. The drill *is* the teaching here; the prose underneath just names the principle (audit privileged human actions, defer system noise) once the student has felt the boundary.

**Engagement.** The `Buckets` drill carries the assessment. Follow-up beat: a single short prose paragraph naming the canonical year-1 event set as a reference card the student bookmarks.

**Components.**
- `Buckets` for the canonical sort.
- `Figure` (or plain prose) for the reference list of canonical events.

---

## Concept 13 — The signature that forces a transaction

**Why it's hard.** "The audit row must be in the same transaction as the mutation" is a discipline statement. Disciplines drift. The senior move is to put the discipline in the *type signature*: `logAudit(tx, event)` — the caller cannot get a `tx` without opening a transaction, so calling `logAudit` outside a transaction doesn't typecheck. This is a small TypeScript move with outsized teaching value — the type system enforcing the architectural rule.

**Ideal teaching artifact.** A `TypeCoding` exercise. The student is given a partial `logAudit` signature with `tx: unknown` and a test that calls it both ways: once inside `db.transaction(async (tx) => ...)`, once outside on the raw `db`. The student's job is to type `logAudit` so the inside-transaction call typechecks and the outside-transaction call produces a TypeScript diagnostic. The grader checks via Twoslash that both diagnostics fire as expected. The exercise teaches by making the student *be* the wrapper-author and feel the type-system constraint settle into place.

**Engagement.** The `TypeCoding` artifact is the assessment. Follow-up beat: a single `MultipleChoice` confirming "why does the signature force a `tx`?" — three distractors (DRY, performance, transactionality is "best practice") and the correct answer (if the mutation rolls back, the audit row must roll back with it; the type signature makes the wrong shape uncompilable).

**Components.**
- `TypeCoding` for the signature exercise — Twoslash diagnostics on both call shapes.
- `MultipleChoice` for the recall.

**Project link.** 10.4.4 ships `logAudit(tx, event)` with exactly this signature; the student writes it in the project after typing it here.

---

## Component proposals

None. Every concept in this chapter maps onto an existing component from `INDEX.md` — `Figure` with hand-authored SVG handles the diagrams (the three-ring append-only visual, the shared-kernel architecture, the role capability table) that would otherwise be candidates for bespoke components. Concept 5's scrubbable wrapper walkthrough is `DiagramSequence` over Figure-wrapped frames. Concept 9's transaction sequence diagram is Mermaid. No proposal carries enough reuse weight, in this chapter or forward, to justify a new component when a hand-authored SVG inside `Figure` teaches the same thing at the leanest v1.

## Build priority

No new components. The chapter is well-served by the existing catalog; the teaching weight sits in the *content* of the diagrams (the carve-out table, the three-ring defense, the converging-arrows architecture) rather than in interactivity that the catalog can't express. The two artifacts most worth investing authoring time in — because they recur in the student's mental model across the rest of the course — are the **role capability table** (Concept 1) and the **shared-kernel `/lib` architecture diagram** (Concept 8). Both are single SVG figures, both compound across Units 11/12/13 wherever a privileged action or a shared mutation appears.

## Open pedagogical questions

- Concept 6's carve-out table risks contradicting the wrong reading of Principle #5 if a student arrives at it without first feeling the missing-role-check failure. The current ordering (Concept 4 surfaces the bug class, Concept 5 lands the wrapper, Concept 6 then justifies the carve-out) assumes the chapter is read in order. If a student lands directly on 10.2.2 from search, the carve-out may read as license to wrap everything. Worth a one-line forward-pointer from the chapter index.
- Concept 11's three-ring diagram leans on RLS knowledge from 10.1.4. If a student took 10.2 first without 10.1 (unlikely, but possible in a refresher path), the inner ring lands without context. Worth a `Term` on "RLS policy" pointing to 10.1.4.
