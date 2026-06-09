# The thin billing interface

- Title: The thin billing interface
- Sidebar label: The thin billing interface

---

## Lesson framing

This is the **architecture lesson** of the chapter — almost no new Stripe API surface, the deliverable is a *module boundary* and a *mental model*. By now (L1–L5) the student has every billing piece scattered across files: a `lib/stripe.ts` client (L1), a `billing.upgrade` Checkout action (L2), a `billing.openPortal` Portal action (L3), a `getEntitlement` read helper (L4), and `hasActiveAccess` (L5). This lesson **collects** them behind one named seam — `/lib/billing/` — and adds the one genuinely new method that pays for the whole interface: `requirePlan`, the server-side paywall gate every privileged surface calls.

The course has stated, twice already, that you normally **don't** wrap the framework's seams (Principle #5, ch043 L4) — and named `billing.*` as one of exactly two sanctioned exceptions. This lesson is the payoff to that promise: it builds the second carve-out and shows *why billing specifically* clears the bar. **Scope discipline is critical here:** the *general* three-test threshold for wrapping any SDK, and the matrix that contrasts billing/auth (wrapped) against Resend/Trigger/R2 (not wrapped), are **L7's** job. This lesson stays concrete and billing-specific — it builds *this* interface, names the bar *this* interface clears, and hands the generalization forward to L7. Resist re-deriving the abstract rule.

Pedagogical posture (from guidelines + the chapter's established voice):

- **Decisions over syntax.** The senior question, framed implicitly: *the app has Stripe calls in five places and a paywall check it's about to need everywhere — does that justify a named interface, and what exactly goes behind it?* The answer is a small, deliberately-tiny surface (three methods) and an import rule (only `/lib/billing/` touches the SDK).
- **`requirePlan` is the spine, not the sessions.** The two session methods (`upgrade`, `openPortal`) already exist from L2/L3 — they're *one call each* and the interface barely helps them. The lesson must be honest that the wrapper's real payoff is `requirePlan`: a single, security-sensitive gate that's identical boilerplate at every privileged surface, where forgetting it is a revenue leak (free users using paid features), not a style nit. This exactly mirrors why `authedAction` earned *its* carve-out (the missing-role-check bug, ch057 L2) — and naming that parallel is the lesson's strongest teaching move.
- **The structural-defense frame, reused.** ch057 L2 taught "the defense is the call shape, not the discipline inside the body" — make the forgettable check a thing that *can't compile away silently*. `requirePlan('pro')` at the top of a privileged Server Component is the same move: one call, one rule, greppable. Lean on this continuity; the student already owns the pattern from auth.
- **Where beginners go wrong (watch-outs that matter most, woven into their sections).** (1) Gating in the client only — a `entitlement.plan === 'pro' && <ProFeature/>` check is UI convenience, not security; the server gate must exist too. (2) Letting `import Stripe` (or `stripe`) escape `/lib/billing/` — the moment a route handler or an action imports the SDK directly, the seam is dead and the audit story is gone. (3) Growing the interface — adding `billing.cancel()` / `billing.changePlan()` / `billing.listInvoices()` pulls user-initiated flows *back into the app* that L3 deliberately handed to the Portal. (4) Failing open in the gate — a `try/catch` around the entitlement read that defaults to "allow" turns a DB blip into free access.
- **The mental model to leave with.** Three sentences. (a) `/lib/billing/` is the *only* place the Stripe SDK is imported; everything else imports from `billing`. (b) The interface is exactly three methods — two that *start* app-initiated flows (`upgrade`, `openPortal`) and one that *gates* (`requirePlan`); everything the *user* initiates lives in the Stripe Portal, not the interface. (c) `requirePlan` reads the local entitlement (never Stripe on the hot path), composes `hasActiveAccess` + a plan-tier check, and fails *closed* — throwing in a Server Component, returning `err('forbidden', …)` in a Server Action.
- **Real production stakes.** Frame the payoff concretely: when the team runs a pricing experiment and renames a plan, or swaps `pro`→`pro_v2`, the change lands in `/lib/billing/` and `requirePlan`'s callers don't move. When a security review asks "where can a free user reach a paid feature?", the answer is "grep for `requirePlan`, audit the surfaces that *don't* call it" — the same audit shape as the auth wrapper. When integration tests run, they mock three functions, not every Stripe call across the app (named here; the testing payoff is L7's to generalize).
- **Cognitive-load management.** Start from what exists: collect the five scattered pieces into the directory first (the *organizing* move), then build the one new method (`requirePlan`) in detail, then state the bar it clears and the cut (what's deliberately *not* in the interface). Save the "two carve-outs in one frame" synthesis for the close, and hand the abstract threshold to L7 explicitly so the student knows the generalization is coming.

Running example stays chapter-wide: the Pro plan (`'pro'` / `'team'` slugs), `plan_entitlements` rows read via `getEntitlement(orgId)` returning `PlanEntitlement`, and `hasActiveAccess(entitlement)` from L5. Do **not** redefine `PlanEntitlement`, `getEntitlement`, or `hasActiveAccess` — import them. New artifacts this lesson introduces: the `/lib/billing/` directory layout, `lib/billing/require-plan.ts` (the gate), `lib/billing/index.ts` (the re-export surface), and the `BillingError` custom class (used by L3 already as a throw, *defined* here).

---

## Lesson sections

### Introduction (no header)

Warm, brief, second-person, matching the chapter voice. Open on the concrete situation the student is actually in: across five lessons they've written a Stripe client, two Server Actions that return Checkout/Portal URLs, an entitlement read, and an access predicate — and they're sitting in five different files. State the senior question implicitly: that's not *yet* a problem, so what makes it one? Answer: the app is about to need a *paywall* — a check that says "this Server Component / this action is Pro-only" — and that check is going to want to live at the top of dozens of surfaces. Preview the deliverable: by the end the student has `/lib/billing/`, a three-method `billing.*` interface, and `requirePlan` as the gate; and they understand why billing is one of only two places the course wraps a vendor SDK. Connect to what they know: they built exactly this shape for *authorization* in ch057 (`authedAction`, the un-forgettable role check) — billing is the same structural move for the same kind of bug.

Reasoning: the chapter's intros lead with a concrete situation and a one-line thesis, no "in this lesson we will learn" scaffolding. The auth parallel is planted in the first paragraph because it's the load-bearing analogy the whole lesson rides on.

### The Stripe SDK has one home

**Goal:** establish the import-discipline rule and the directory shape *first* — the organizing move that turns five scattered files into one seam — before introducing the new method.

Content:
- State the rule plainly, sized to its weight (it's the structural spine of the interface): **the Stripe SDK is imported in exactly one directory, `/lib/billing/`. Everywhere else in the app imports from `billing`.** The SDK is a *transitive* dependency of the interface, never a *direct* dependency of a route, an action body, or a component.
- Collect what already exists into the directory. The student has these pieces from prior lessons — show where each lands:
  - `lib/billing/stripe.ts` — the configured SDK client (L1's `lib/stripe.ts`, now relocated into the billing folder; note the move explicitly so it's not read as a new file). Starts `import 'server-only'`, pins `apiVersion`.
  - `lib/billing/upgrade.ts` — the `upgrade` Checkout action (L2).
  - `lib/billing/portal.ts` — the `openPortal` Portal action (L3).
  - `lib/billing/require-plan.ts` — the gate (new, this lesson).
  - `lib/billing/index.ts` — the re-export surface that *is* `billing.*`.
- Note the entitlement read stays put: `getEntitlement` lives in `db/queries/entitlements.ts` (L4), because it's a tenant-scoped DB read, not a Stripe call — `require-plan.ts` *imports* it. This is the honest seam: `/lib/billing/` owns Stripe calls and the gate; `db/queries/` owns the projection read. Don't move `getEntitlement` into billing.
- **Component:** `FileTree` showing the settled `/lib/billing/` layout plus the two collaborators it leans on (`db/queries/entitlements.ts`, and `lib/result.ts`). Dimmed inline comments mark each file's job and flag the one rule — "only this folder imports `stripe`". Goal: one glance gives the student the layout they'll follow into the project chapter (ch065).

  ```
  - lib/
    - billing/
      - stripe.ts          'server-only' — the ONLY file that imports the Stripe SDK
      - upgrade.ts         'use server' — billing.upgrade (Checkout, L2)
      - portal.ts          'use server' — billing.openPortal (Portal, L3)
      - require-plan.ts     the server-side paywall gate (this lesson)
      - billing-error.ts    BillingError — domain error subclass
      - index.ts            re-export surface — this IS billing.*
    - result.ts            Result<T>, ok, err (Unit 6)
  - db/
    - queries/
      - entitlements.ts    getEntitlement(orgId) — tenant-scoped read (L4)
  ```

- The barrel-file nuance, named honestly (conventions §File layout forbid barrels in `lib/`): `index.ts` here is a *deliberate, explicit re-export surface* — the public API of the billing module — not a tree-shaking-defeating barrel over many unrelated files. Re-export the three named methods explicitly (`export { upgrade } from './upgrade'`, etc.), with a one-line comment naming why this re-export exists. Flag to downstream agents: this is the sanctioned exception to "no barrel files," consistent with the carve-out being a named module with a stable public surface.

Reasoning: leading with the *rule + directory* (the organizing move) before the *new code* lowers load — the student gets the "where things live" picture first, then fills in the one missing file. FileTree is the diagrams-INDEX top pick for directory structure and AI-authorable. The barrel nuance must be addressed head-on or a code-conventions-aware reviewer flags it.

Tooltip candidates: `Term` on **transitive dependency** ("a dependency reached only *through* another module, never imported directly") — supports the core seam idea.

### `requirePlan`: the gate that earns the wrapper

**Goal:** build the one genuinely new method in detail, and make clear it's the reason the interface exists. This is the conceptual heart of the lesson.

Content:
- Set up the need concretely. A Pro-only export page, a Team-only seats screen, a paid API route — each needs to answer "is this org entitled to *this* tier, *right now*?" before rendering or running. That's two questions composed: **do they have access at all** (`hasActiveAccess`, the status axis from L5) and **are they on a high-enough tier** (`plan` ordering — `team` ⊇ `pro` ⊇ `free`). `requirePlan(planSlug)` answers both in one call.
- State the signature and behavior:
  - `requirePlan(planSlug: 'pro' | 'team'): Promise<void>` — resolves the current org, reads its entitlement via `getEntitlement(orgId)`, and **throws `BillingError` if access is denied or the tier is insufficient**. Returns `void` on success (the success case is "carry on"; there's nothing to hand back).
  - It reads the **local entitlement row**, never Stripe — restate the hot-path rule from L4 (`stripe.*` is forbidden on the request path; the projection is what you read). This is *why* the gate can run at the top of every Server Component cheaply.
  - It composes the two predicates the student already owns: `hasActiveAccess(entitlement)` (L5) for the access axis, plus a plan-tier comparison. Introduce a tiny `planRank` lookup (`{ free: 0, pro: 1, team: 2 }`) and a `planAtLeast(current, required)` check — *exactly* parallel to ch057's `roleAtLeast` / `ROLE_RANK`. Name that parallel; the student built this shape for roles, this is the same shape for plans.
- **The fail-closed reflex, stated as the senior anti-trap** (conventions §Error handling: every access gate treats an exception inside the check as a refusal). The gate must deny on *any* uncertainty — a missing entitlement row (shouldn't happen given L4's provisioning, but defend anyway), a thrown read, an unknown status. Never a `catch` that logs "entitlement read failed, allowing." Foreshadow that this fail-closed posture is revisited at depth in the security chapter; name it once here.
- **Component:** `AnnotatedCode` over the assembled `require-plan.ts` (~12–16 lines, set `maxLines={18}`). Color-coded steps: (1) resolve the org — `requireOrgUser()` (blue, the boundary read); (2) read the entitlement — `getEntitlement(orgId)` (orange, the local projection, *not* Stripe); (3) the access gate — `hasActiveAccess(entitlement)` fails → throw (green, the headline gate, reusing L5's predicate); (4) the tier gate — `planAtLeast(entitlement.plan, planSlug)` fails → throw (green); (5) success — implicit `return` (violet). Each step's prose ≤6 lines, names the gate's job and its closed exit. Goal: the student sees the gate is *composition of pieces they already have* plus one new comparison — not new Stripe surface.
- **Where it's called — the call-site discipline.** Show the payoff line in context: at the top of a privileged Server Component, `await billing.requirePlan('pro')` as the first statement, before any Pro-only data fetch or render. One call, one rule. This is the structural defense — the gate is a *required line you can grep for*, and a surface that's missing it is a finding, exactly like an action missing `authedAction`.

  - **Component:** a short `Code` block (tsx) showing the call site — a `page.tsx` (or a Server Component) whose body is `await billing.requirePlan('pro')` then the Pro-only content. Keep it tiny; the point is the *shape* of the call, not a real feature.

Reasoning: `requirePlan` is the load-bearing deliverable, so it gets the most detailed treatment (AnnotatedCode + a call-site Code block). The `planRank`/`planAtLeast` ↔ `ROLE_RANK`/`roleAtLeast` parallel is the strongest continuity hook and makes the "new" code feel familiar. Fail-closed is taught inline at the moment the gate is built, per guidelines (principles inline, never bundled).

Tooltip candidates: `CodeTooltips` on the `require-plan.ts` fence for `planAtLeast` ("true when the org's tier ≥ the required tier, by the `planRank` order") if the inline gloss would interrupt; otherwise prose. `Term` on **paywall** ("a gate that blocks a feature behind a paid plan tier") at first use.

### How the gate fails: `BillingError`, two surfaces

**Goal:** define the `BillingError` class (used as a throw since L3, *defined* here) and lock how its failure flows through the two seams a gate can sit in — Server Component vs. Server Action — using the error contract the student already owns.

Content:
- Define `BillingError`: a custom `Error` subclass (closes the thread from ch009 L2 — classes earn their weight, one site being domain error types) with a **literal-typed `name` discriminant** (`name = 'BillingError'`, per conventions §Error handling) and a machine-readable `code` (`'plan_required'` / `'no_access'`) plus a user-safe message. Lives at `lib/billing/billing-error.ts`. Keep it ~8 lines.
- **The two-surface rule — same error, two exits**, exactly the `authedAction` page-vs-action distinction from ch057 (the guard *redirects*, the wrapper *returns*). State it as the parallel:
  - **In a Server Component** (the common case — a Pro-only page), `requirePlan` *throws* and the segment's `error.tsx` boundary catches it, rendering an "upgrade to continue" screen. Throwing is correct here: there's no form to keep state for, the whole render should stop.
  - **In a Server Action** (a Pro-only mutation), the action body calls `requirePlan` inside its `try` and **maps the caught `BillingError` to the `Result` contract** — `err('forbidden', error.userMessage)`. Critically, name the contract constraint: the course's fixed `Result.error.code` union (conventions §Error handling) is `validation | conflict | not_found | unauthorized | forbidden | rate_limited | internal` — **there is no `payment_required` or `paywall` code**, so a plan-gate failure maps to **`forbidden`** (the user is authenticated but not permitted at this tier). Do *not* invent a new `Result` code. The machine-readable distinction (it's a billing block, not a role block) is carried by `BillingError.code`, available to logs/telemetry; the transport code the form sees is `forbidden`.
- The fail-closed tie-in: because `BillingError` is *thrown* by the gate, the Server Component path fails closed by default (a throw stops the render — `error.tsx` shows the paywall, never the Pro content). The action path fails closed because the `catch` maps to `err`, never silently continues. Both seams deny on the error path by construction.
- **Component:** `CodeVariants` — two tabs, the same gate failing on two surfaces:
  - Tab A "Server Component (throws → `error.tsx`)" — `await requirePlan('pro')` at the top of a page; below it, the matching segment `error.tsx` that renders the upgrade screen on a caught `BillingError`. Prose: throwing stops the render; the boundary owns the paywall UI.
  - Tab B "Server Action (`try`/`catch` → `Result`)" — a Pro-only action whose body calls `requirePlan` in a `try`, catches `BillingError`, returns `err('forbidden', e.userMessage)`. Prose: the form needs the error in place, so the action returns `Result` instead of throwing through.
  Use `instanceof BillingError` narrowing in the `catch` (conventions §Error handling: narrow `unknown` with `instanceof`), and re-throw anything that isn't a `BillingError` (don't swallow unrelated errors).

Reasoning: `BillingError` and the two-exit rule are a tight, high-value pair that reuses two prior threads (ch009 custom errors, ch057 page-vs-action exits) — teaching them together as "one error, two surfaces" is lower-load than splitting. CodeVariants is the canonical tool for two parallel shapes of the same thing. The `Result`-code constraint is load-bearing and easy to get wrong (a writer's instinct is to invent `payment_required`) — flag it hard.

Tooltip candidates: none new here; `Result` and `err` are owned by the student (Unit 6). Optionally `Term` on **discriminant** if not already glossed earlier in the course, but it's prior knowledge — skip unless it reads as needed.

### What the interface deliberately leaves out

**Goal:** define the interface by its *cut* — the three methods in, and the conspicuous absences — so the student doesn't grow it into a Stripe façade. This is the "small surface" discipline.

Content:
- State the whole interface, exactly three methods, and the principle that sizes it: **the interface is what the *application* initiates; everything the *user* initiates routes through the Stripe Portal (L3).**
  - `billing.upgrade(planSlug)` — app starts a Checkout (L2). In, because the app initiates "begin a subscription."
  - `billing.openPortal(returnPath?)` — app opens the Portal (L3). In, because the app initiates "send them to manage billing."
  - `billing.requirePlan(planSlug)` — app gates a surface (this lesson). In, because the gate is the app's own check.
- The **explicit non-methods** and where each actually lives — name them so the absence is *designed*, not an oversight:
  - No `billing.cancelSubscription()` — cancellation is a Portal flow (L3). Adding it pulls a user-initiated, Stripe-hosted screen back into app code you'd have to build and maintain.
  - No `billing.changePlan()` — plan switching is a Portal flow (L3, with Stripe's proration). The app doesn't compute proration; don't wrap a method that implies it does.
  - No `billing.listInvoices()` — invoice history is a Portal screen (L3). The Customer outlives any subscription and the Portal stays the source for invoices.
  - No `billing.reactivate()` / `billing.confirmTrial()` as *interface* methods — L5 foreshadowed these as Server Actions; they're project-chapter (ch065) concerns and, where they exist, are thin actions that may live beside the others, but they are *not* part of the stable three-method public surface this lesson pins.
- The senior anchor: **the interface is small because most billing flows belong to Stripe-hosted UI.** A wrapper that grows a method per Stripe operation is reinventing the Portal in app code — the exact loss L3 warned against. Three methods is the whole list.
- **Component (exercise):** `Buckets`, two columns — "In the `billing.*` interface" vs. "Not in the interface (Portal or out of scope)". Items: *start a Checkout for the Pro plan* (in — `upgrade`); *gate a Pro-only export page* (in — `requirePlan`); *open the billing-management screen* (in — `openPortal`); *cancel the subscription* (out — Portal); *switch monthly→yearly* (out — Portal); *download a past invoice* (out — Portal); *compute proration for an upgrade* (out — Stripe owns the math); *read whether the org is past_due* (out — that's `getEntitlement`/`hasActiveAccess`, the read layer, not a billing-initiation method). Goal: drill the "app-initiates vs user-initiates / read-layer" cut through active sorting, including the tempting traps (proration → Stripe; the status read → the entitlement layer, not the interface). Grading: each chip lands in the correct bucket per the rule above.

Reasoning: defining the interface by what it *excludes* is the senior move and the strongest guard against the "grow it for completeness" smell. Buckets is the ideal check — this section is fundamentally a *boundary* classification, and Buckets makes the boundary tactile (it's the same exercise shape ch057 L2 used for the auth wrapper's scope, reinforcing chapter continuity). The "status read" decoy is deliberate: it separates the *initiation* interface from the *read* layer, a distinction students blur.

### Why billing earns the carve-out

**Goal:** name the bar this interface clears — billing-specifically — and hold the line that L7 owns the *general* threshold. This is the architectural payoff, kept narrow.

Content:
- Reconcile the apparent contradiction the student is primed to feel: the course said (ch043 L4) *don't* wrap the framework's seams — yet here's a wrapper. Resolve it by stating **the bar a carve-out clears**, in billing terms: a single, **money-sensitive** concern (`requirePlan`) that is **identical boilerplate at every privileged surface**, where **getting it wrong is an incident** (a free user reaching paid features — lost revenue), not a style nit — *plus* a vendor SDK whose calls benefit from one audited home (one place imports `stripe`, one place pins the API version, one place attracts billing logs). Billing clears that bar; that's why it's wrapped.
- **The auth parallel, made explicit and load-bearing.** `authedAction` (ch057 L2) is the *other* carve-out, and it cleared the bar for the *same reason*: the role check was identical boilerplate at every action, a missed check was a security breach, and centralizing made the policy greppable and the audit trivial. `billing.requirePlan` is the structural twin — same problem shape (forgettable, security/money-sensitive, recurring), same solution (make the check a required, greppable call). Two carve-outs, one rationale. State that these are the course's *only* two sanctioned SDK/seam wrappers.
- **Hand the generalization to L7, explicitly.** Name that there's a *general* test — read-hostile SDK shape, real swap cost, a discipline to centralize — that decides "wrap or don't" for *any* vendor (and explains why Resend, Trigger.dev, and R2 *don't* get wrapped). State that the next lesson makes that test explicit and applies it across the course's integrations; this lesson's job was to *build the billing carve-out and show the bar it clears*, not to derive the universal rule. This keeps L6/L7 from overlapping — L6 is the concrete instance, L7 is the principle.
- The greppable-audit payoff, stated concretely as the production stake: a security review of "where can a free user reach a paid feature?" becomes "grep for `requirePlan`, list privileged surfaces, find the ones that don't call it" — identical to the auth audit ("find every privileged action that doesn't go through `authedAction`"). The wrapper *creates the audit surface*; that's the durable win.

Reasoning: the chapter outline requires the carve-out be named *here* with billing-specific justification, and L7 own the abstract threshold — this section honors that split precisely (it states the bar in *billing* terms and forwards the *general* test). The auth parallel is the lesson's spine and gets its fullest statement here. No new code — this is the synthesis beat, so prose + the explicit forward-reference to L7, not samples.

Tooltip candidates: none new.

### The billing interface, assembled (closing)

**Goal:** consolidate the seam, lock the three-sentence mental model, and forward-link to L7. Short outro.

Content:
- One-paragraph recap: the five scattered pieces now sit behind `/lib/billing/`; the public surface is three methods; `requirePlan` is the load-bearing gate that reads the local entitlement, composes `hasActiveAccess` + a tier check, and fails closed — throwing in a Server Component (caught by `error.tsx`), returning `err('forbidden', …)` in a Server Action; and the Stripe SDK is imported in exactly one place.
- Restate the **mental model** as the closing three sentences (the takeaways from the framing): (a) one home for the SDK; (b) three methods — two that start app-initiated flows, one that gates — and everything user-initiated lives in the Portal; (c) the gate reads local state, composes the predicates the student already built, and fails closed.
- **Watch-outs roundup, woven into the close** (per the task's rule that watch-outs live with their concept — but a tight final reminder of the four is fair here): client-only gating is not security (server gate first); `import stripe` outside `/lib/billing/` kills the seam; new `billing.*` methods for user-initiated flows belong in the Portal; a `catch` that defaults to allow turns a blip into free access.
- Forward link (named, not taught): **L7** takes the bar this lesson stated in billing terms and makes it a *general* three-test threshold, applying it to show why auth and billing earn interfaces while Resend, Trigger.dev, and R2 only earn helpers — and names the silence around wrapping everything else. The full `requirePlan` implementation (with `requireOrgUser` wiring and the project's real surfaces) ships in the project chapter (ch065).

Optionally one `ExternalResource` card: the Next.js `error.tsx` / error-handling docs (anchors the Server-Component throw→boundary path) — only if it adds genuine value; the lesson is self-contained, so keep it optional and don't pad.

Reasoning: a closing recap that restates the mental model closes the pedagogical loop (scattered pieces → collected seam → gate → resolved). Folding the watch-outs into the close (as a tight reminder, since each was already taught in its section) follows the task's rule. The L7 forward-reference is explicit so the student knows the generalization is the *next* lesson, not a gap in this one.

---

## Terms for Tooltip (`<Term>`)

Strategic, lesson-supporting only:

- **Transitive dependency** — supports the core seam idea (the SDK reached only through `billing`, never imported directly). Gloss at first use.
- **Paywall** — the gate concept `requirePlan` implements; gloss as "a gate that blocks a feature behind a paid plan tier."
- **Fail closed** — re-gloss concisely at the gate ("on any uncertainty, deny") if not already owned; it's a recurring security term the student meets again in the security chapter.

Do **not** Tooltip terms the student owns by now: `Result`, `ok`/`err`, `Server Action`, `Server Component`, `error.tsx`, `requireOrgUser`, `hasActiveAccess`, `getEntitlement`, `PlanEntitlement`, `discriminated union`, `'use server'`, `import 'server-only'`. Re-importing/redefining any of these is a scope error (see Scope).

---

## Scope

**Prerequisites to redefine briefly (one line each, do not re-teach):**
- `PlanEntitlement`, `getEntitlement(orgId): Promise<PlanEntitlement>` — **L4** owns the schema and the read helper; import, never redefine. `requirePlan` *calls* `getEntitlement`; it does not re-query the DB ad-hoc.
- `hasActiveAccess(entitlement): boolean` — **L5** owns the access-decision function; `requirePlan` *composes* it for the access axis. Do not reimplement the status switch.
- `billing.upgrade(planSlug)` / `billing.openPortal(returnPath?)` — **L2/L3** own these actions; this lesson *relocates* them into `/lib/billing/` and *re-exports* them, but does not re-teach their bodies (Checkout/Portal session creation).
- `requireOrgUser()` → `{ user, orgId, role }` — **ch057 L1** / conventions §Auth; the fresh-per-request org+user read `requirePlan` uses to resolve `orgId`. Reference only.
- `Result<T>`, `ok`/`err`, the fixed `error.code` union — **Unit 6** / conventions §Error handling; the action-seam return contract. Redefine the union in one line if needed (to justify the `forbidden` mapping), never re-derive.
- `roleAtLeast` / `ROLE_RANK` — **ch057 L1**; named only as the *parallel* that `planAtLeast` / `planRank` mirrors. Do not re-teach role logic.
- Custom `Error` subclasses with literal `name` discriminants — **ch009 L2** / conventions §Error handling; `BillingError` is an instance of this known pattern, defined here, not taught from scratch.

**This lesson does NOT cover (defer; name once at most):**
- **The general three-test threshold for wrapping any SDK** (read-hostile shape, swap cost, discipline-to-centralize) and **the matrix contrasting billing/auth vs. Resend/Trigger/R2** — **L7**. This lesson states the bar in *billing-specific* terms and forwards the generalization. Do not build the matrix or reason about Resend/Trigger/R2 here.
- **Architectural Principle #5 in general** and the `safeAction`/`next-safe-action` "don't wrap the framework" argument — **ch043 L4**. Referenced as the rule billing is an exception to; not re-derived.
- **The `authedAction` wrapper implementation** and its `ctx` payload — **ch057 L2**. Used *only* as the structural parallel; this lesson builds no auth wrapper.
- **The Checkout session and Portal session creation bodies** (`stripe.checkout.sessions.create`, `stripe.billingPortal.sessions.create`, lazy Customer creation, `subscription_data`, `flow_data`) — **L2/L3**. The `upgrade`/`openPortal` files are shown only as *re-export targets* in the FileTree, not as worked Stripe code.
- **The `plan_entitlements` schema, `subscriptionToEntitlement`, the webhook write side, the single-writer rule** — **L4** and project **ch065**. `requirePlan` is a *reader*; it never writes the table and never touches the webhook.
- **Subscription status semantics, banners, `isWindingDown`, dunning, seat-overage** — **L5**. `requirePlan` consumes `hasActiveAccess`'s boolean; it does not re-reason about individual statuses or render banners.
- **The full `Result`/error-contract shape and `useActionState` form wiring** — **Unit 6** / **ch044/ch046**. This lesson closes the "why `forbidden`" loop in one block; it does not build the form side.
- **Testing the interface / mocking the three methods** — named once as a production stake; the testing pattern and its generalization are **L7** / Unit 18. Do not write tests here.
- **The `requirePlan` production implementation with real privileged surfaces** — **project ch065**. This lesson ships the *shape* (the gate + a tiny call site), explicitly flagged as the worked example landing in the project.
- **Caching the gate read across requests** (`'use cache'`, tags) — out of scope; `getEntitlement` already uses request-scoped React `cache()` (L4), which is enough for the per-request gate. Do not introduce cross-request caching.

---

## Notes for downstream agents

- **Scope guard is the #1 risk on this lesson.** L6 builds the *billing* carve-out; L7 owns the *general* SDK-wrapping threshold and the Resend/Trigger/R2 contrast. Keep L6 concrete and billing-specific. The single sentence handing the generalization to L7 ("there's a general test; the next lesson makes it explicit") is required so the student doesn't read L6 as incomplete — but do not build L7's matrix here.
- **`Result` code is fixed — do not invent `payment_required`.** A plan-gate failure maps to `forbidden` in the action seam (conventions §Error handling: the union is `validation | conflict | not_found | unauthorized | forbidden | rate_limited | internal`). The billing-specific distinction is carried by `BillingError.code`, not by a new `Result` code. This is load-bearing; get it wrong and the lesson contradicts the course's error contract.
- **`requirePlan` returns `Promise<void>` and throws on failure** (chapter-outline contract). In a Server Component it throws → `error.tsx`; in a Server Action the body catches and maps to `err('forbidden', …)`. Keep both exits; mirror ch057's guard-redirects-vs-wrapper-returns distinction explicitly.
- **Function form per conventions §Function form:** `requirePlan`, `planAtLeast` as `export const fn = async (...) => ...` / `export const fn = (...) => ...` with explicit return types (`Promise<void>`, `boolean`). `BillingError` is a `class` (the sanctioned class site). The relocated `upgrade`/`openPortal` keep whatever form L2/L3 shipped — do not restyle them here; they're only referenced.
- **`planRank`/`planAtLeast` must mirror `ROLE_RANK`/`roleAtLeast` (ch057 L1)** in shape and naming, so the student reads them as "the same move for plans." `planRank = { free: 0, pro: 1, team: 2 } as const` (no `enum`, per conventions §TypeScript). Name the parallel in prose.
- **`lib/billing/index.ts` is a sanctioned barrel exception** — explicit named re-exports of the three methods only, with a one-line comment naming why. Do not `export *`. Conventions §File layout forbid barrels in `lib/`; this is the named carve-out (a module with a stable public surface), consistent with the lesson's thesis. Call it out so a conventions-aware reviewer reads it as deliberate.
- **`lib/stripe.ts` → `lib/billing/stripe.ts` relocation:** L1 shipped the client at `lib/stripe.ts`; this lesson moves it into `/lib/billing/`. Conventions §File layout already list `lib/billing/` as the Stripe adapter home, so the relocation aligns the chapter to the canonical layout — state the move once so it doesn't read as a new, second client. Every `/lib/billing/` file begins with `import 'server-only'`.
- **All code samples honor the hot-path rule:** `requirePlan` reads `getEntitlement` (local), never `stripe.*`. Do not show a Stripe call inside the gate.
- **Keep the call-site sample tiny and honest:** the privileged-Server-Component example is a *shape* demonstration (one `await billing.requirePlan('pro')` line + a placeholder for Pro content), not a real feature. The full surfaces land in ch065.
