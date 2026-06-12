# Lesson 3 — The routed wizard, end to end

- **Title:** The routed wizard, end to end
- **Sidebar label:** The routed wizard

---

## Lesson framing

This is the chapter's **bridge into the project** (ch079). Lessons 1–2 are done: L1 taught the decision funnel (server state? → `useState`? → lifted+Context? → URL? → then Zustand) and the three triggers; L2 taught the v5 API and the per-request provider, and **already shipped the concrete file layout, the `contact-slice`, the `createWizardStore` factory, the provider, the typed hook, and a selector RenderTracking demo**. This lesson does **not** re-teach any of that. Its job is the **senior reasoning that justifies the screen** and the **boundaries the project will build to**: run the L1 funnel against one real screen, name the four product calls (URL is wrong for PII, refresh-loses by design, store owns draft / action owns persistence, reset at tenancy boundaries), and hand ch079 a crisp contract.

Pedagogical stance:

- **Decisions over syntax.** The student has the syntax (L2). This lesson is almost entirely *why this screen, why these trade-offs* — the senior-mindset filter. Code appears only where a shape is load-bearing (the `MetaSlice`/`validate()` gate that L2 deferred, the submit-boundary handler, the layout-vs-page provider placement). Everything else is prose + one diagram + one decision walk + one classification check.
- **One screen, walked four ways.** The spine is the four-step `/customers/new/step-1…4` wizard. Every concept attaches to it: the funnel runs *against it*, the slice shape *is its* shape, the submit boundary *is its* submit. No abstract examples.
- **The reader's likely confusion to pre-empt:** "didn't we already build a multi-step wizard in ch045 with React Hook Form and one `useForm`?" Yes — and the *routing* is the whole difference. This lesson must name that fork explicitly and early, or the student will think Zustand is re-solving a solved problem. The senior distinction: **modal/single-route wizard → one `useForm` + `FormProvider` (ch045); routed wizard where each step is a shareable URL and back/forward must work → store on the shared layout.**
- **Cognitive-load order:** name the screen → run the funnel (the *why-Zustand* spine) → the four "why-not" rejections (the senior's negative space) → the concrete store shape (one new slice: `MetaSlice` + the Zod gate) → the submit boundary → navigation behavior (preserves/loses) → reset discipline → anti-patterns → forward pointer. Each step builds on the last; the funnel and the rejections are the load-bearing third of the lesson.
- **Mental model the student leaves with:** *the store is the draft's home for the duration of the routed flow; the URL routes between steps; the same Zod schema gates the client and validates the server; the Server Action — not the store — persists; the developer resets at submit-success and every tenancy boundary; refresh loses by an explicit product decision, not a library limit.*
- **Reuse the L2/L1 vocabulary as assumed:** `selector`, the per-feature rule, `createStore` vs `create`, `useShallow`, `WizardState`/`WizardStore`, the three-file provider shape, `set(initialWizardState, true)`. Do not redefine these — reference them.

---

## Lesson sections

### Introduction (no header)

Two short paragraphs, warm and terse. Frame: *we have the funnel (L1) and the primitives (L2); now we point both at one real screen and turn the abstract triggers into product decisions.* Name the screen once: a four-step "new customer" onboarding wizard at `/customers/new/step-1` through `step-4`. State the lesson's payoff: by the end the student can look at a candidate screen, run the funnel, and defend (or reject) Zustand with named trade-offs — and they'll have the exact contract ch079 builds. Drop the ch045 fork in one sentence so it's seeded before §1: *we built a multi-step wizard before with one React Hook Form instance; the difference here is that each step is its own route.* Do not elaborate yet — §"Why not just lift state" owns it.

### The screen: a four-step routed customer wizard

**Goal:** make the screen concrete before any reasoning runs, so every later argument has a referent.

Content:
- Describe the four steps and their data (this is the spine for the whole lesson):
  - **Step 1 — Contact:** first name, last name, email, phone.
  - **Step 2 — Billing:** address fields, tax ID, payment terms.
  - **Step 3 — Preferences:** notification channels (multi-select), default currency, language.
  - **Step 4 — Review:** read-only summary of steps 1–3, final submit.
- Each step is its **own route segment** under a shared layout; the layout hosts `<WizardStoreProvider>` (the one from L2) so one store instance survives all four navigations.
- Product motivation, stated as a senior would: onboarding a customer is the canonical high-value SaaS form; splitting one tall form into four steps cuts abandonment and lets validation feedback land per-section. This is *why the screen exists*, not stack trivia.

**Diagram (HTML+CSS phase strip inside `<Figure>`):** a horizontal four-segment strip — `step-1 Contact` → `step-2 Billing` → `step-3 Preferences` → `step-4 Review` — with a thin band beneath spanning all four labeled **"one `WizardStore` instance, pinned on the shared layout."** Pedagogical goal: in one glance the student sees *four routes, one store underneath them* — the exact mental model the rest of the lesson defends. Horizontal, short, well under the height cap. Author as plain HTML+CSS (segments + spanning band), per the diagram index's "sequential phase strip / annotated illustration" guidance. Do **not** use a heavy engine — this is a label strip, not a graph.

### Run the funnel: why this screen clears the bar

**Goal:** the *why-Zustand* spine. Take the L1 funnel and walk it against this concrete screen — the senior habit of justifying the library *before* reaching for it. This is the lesson's center of gravity.

Content — walk the three L1 triggers, each as a short labeled paragraph, each tied to the screen:
- **Trigger 1 — genuinely shared state across cross-route components.** Each step is a separate route segment; navigating replaces the page-level Client Components. Step 4's review reads steps 1–3's data. Lifting to a common parent fails: the only shared ancestor is the layout one level up, and threading every step's data through it as props makes every step a Client Component receiving every other step's fields — prop drilling by another name. **Met (the strong one).**
- **Trigger 2 — an action surface across disjoint subtrees.** Three separate regions of the layout need the store: a header progress indicator reads `currentStep`; a footer "Next" button reads the current step's validity and calls `goNext()`; the review step reads every slice and calls submit. Three disjoint subtrees, one shared action surface. **Met (the other strong one).**
- **Trigger 3 — selector vs Context re-render cost.** Every keystroke in step 2's address field would re-render the header and footer if Context held the state; selector subscriptions keep the keystroke local. **Met, but weakest** for a four-step form — name it honestly as the L1/continuity rule says (trigger 3 rarely justifies Zustand alone; here it rides on 1–2). Do **not** rebuild the slice-vs-atomic RenderTracking demo — L2 already shipped it; reference it in one clause ("the selector model you saw isolate re-renders in the last lesson").

**Component — `StateMachineWalker` (`kind="decision"`):** a compact decision walk that *is* the L1 funnel applied to this screen. Pedagogical goal: make the student perform the senior's ordered questioning rather than read a verdict. The walk:
- Q "Is the customer draft server state yet?" → "No, nothing's persisted until step 4" → next.
- Q "Would `useState` in one component cover it?" → "No — the four steps are four routes" → next.
- Q "Would lifting + Context on the shared layout cover it?" → branch: "Consumers under one subtree, rare writes" → Leaf *"Context is enough — don't reach for Zustand"* (teach the negative path too); "Disjoint subtrees + per-keystroke writes" → next.
- Q "Would URL state (`nuqs`) cover it?" → "No — billing data and PII don't belong in the URL" → Leaf *"Zustand on the shared layout"* with the reason body summarizing the four product calls.
Keep ids readable; this is `kind="decision"` (no topology slot). Reuse L1's funnel order exactly so the student recognizes it. Do not wrap in `<Figure>` (the walker is its own card).

### Why not the four alternatives

**Goal:** the senior's *negative space* — the funnel's leaves spelled out as four explicit rejections. Each is one tight paragraph: name the alternative, name why it loses *for this screen*. This is where the "trade-off named on the surface" discipline lives.

Subsections (use `###` for each so they're skimmable and citable):

#### Why not URL state
URL is the default for shareable view state — filters, sort, cursor (ch060, `nuqs`). But billing data and PII don't belong in the URL: they leak to server access logs, browser history, analytics referrers, screenshot tools, and copy-pasted support tickets. Encoding the whole draft as query params also blows past reasonable URL length and shape. The senior call: **URL is wrong for sensitive draft data; the in-memory store is right.** (Tie back to L1's "do we even own this on the client" check.)

#### Why not server state
The wizard is a *draft* — the customer doesn't exist until step 4 submits. Persisting partial drafts before submit means a `customer_drafts` table, garbage-collecting abandoned drafts, surfacing them on return, and tenancy on the draft rows. That's **product scope, not stack scope.** The course's explicit call: **refresh loses the wizard, by product decision** — and that trade gets named *on the screen*, not hidden. (Contrast with TanStack Query from ch076: that owns *server* state the user can see go stale; a pre-submit draft isn't that.)

#### Why not just lift state and use `useState`
**This is the ch045 fork — give it the most room.** A modal/single-route wizard (ch045 lesson 5) is one `useForm` at the root with `FormProvider`, `trigger(fieldNames)` per step, `shouldUnregister: false` for back-navigation — and it's the *right* tool when all steps live on one route. Our wizard is **four routes**: step 1 should be a shareable URL (`/customers/new/step-1`), browser back/forward should move between steps, and a routed step has no single Client Component owning all four step UIs. Lifting requires exactly that single owner — which collapses the routing. The senior call: **routed steps lock in a store (or equivalent); modal steps stay with one `useForm`.** Name ch045 explicitly so the student files the two patterns side by side, not as competitors.

#### Why not Redux / Jotai / Valtio
One sentence, pointing back: L1 already made this call (Zustand v5 is the 2026 SaaS default; name RTK only if a codebase already uses it). Don't re-argue — just reference and move on. Keep this subsection to two lines max.

**Component — `Buckets` (`twoCol`, custom instructions):** a quick *trigger-before-tool* classification check. Instructions: "Which tool fits each piece of state in our app?" Buckets: **`useState`**, **`nuqs` (URL)**, **Server Action / Server Component**, **Zustand store**. Items (mix, shuffled): "the new-customer wizard draft across four routes" (Zustand), "the customers list filter and sort" (URL), "whether a row's action menu is open" (`useState`), "the saved customer after submit" (Server Action / SC), "the wizard's current valid step" (Zustand), "a single contact-edit modal's fields" (`useState`). Pedagogical goal: force the student to discriminate Zustand from the four defaults on concrete cases — the exact L1 reflex, now self-checked. Place it right after the four rejections so it tests the discrimination just taught.

### The store shape: four slices and the Zod gate

**Goal:** land the L2 slices pattern on this screen's *concrete* four-slice shape, and teach the **one piece L2 explicitly deferred** — the per-step Zod `validate()` gate in `MetaSlice`. Do **not** re-show `contact-slice` in full or the provider/hook (L2 shipped those); reference them.

Content:
- Name the four slices and what each owns (terse list; the student knows the pattern):
  - `ContactSlice`, `BillingSlice`, `PreferencesSlice` — each holds its step's fields, per-field setters, and a sibling Zod schema (shown in L2 for contact; the rest "mirror it").
  - `MetaSlice` — the cross-cutting one: `currentStep`, `completedSteps`, and the navigation actions `goNext()` / `goBack()`. (Reconcile with L2's type: `WizardStore = WizardState & { reset }`; the store-wide `reset` stays where L2 put it, `goNext`/`goBack`/`currentStep` live in `MetaSlice`. State this mapping plainly so ch079 builds it consistently.)
- File map recap as a single sentence + reference to the L2 `FileTree` (do not redraw the whole tree — point to it): four slice files + `wizard-types.ts` + `store.ts` under `_lib/wizard/`, provider + hook under `_components/`, provider mounted on `customers/new/layout.tsx`.

**The Zod-per-step gate (the new, load-bearing piece):**
- Each step's slice has a sibling schema (`contact-schema.ts` → `createCustomerContactSchema` style per code conventions: derived where possible, top-level Zod 4 builders `z.email()` not `z.string().email()`).
- The gate: a selector computes step validity by running `schema.safeParse(currentSliceData)` and reading `.success`; the "Next" button is `disabled={!isStepValid}`. Validity recomputes per keystroke via the selector subscription, so the button enables the instant the slice is valid; field errors render from `safeParse`'s error under each field (`z.flattenError(...).fieldErrors?.<field>?.[0]`, the course's flat shape).
- **The senior contract (the headline):** the *same schema* gates the client at the Next button **and** validates the server inside the submit action (the one-schema-both-sides rule from ch042/ch045 lesson 3). Client gate is UX; server parse is correctness; both fire. State this as the durable takeaway.

**Component — `AnnotatedCode` (`lang="ts"`, blue, `maxLines` ≤ 16):** one compact `MetaSlice`-style excerpt showing the `validate`/`isStepValid` shape and `goNext` (the piece L2 deferred), written once. Steps walk: (1) the slice's `currentStep` + `completedSteps` state; (2) the `validate()` action calling `schema.safeParse` (color the `safeParse` call); (3) `goNext()` advancing `currentStep` *and* pushing the route — highlight that navigation and store update happen together; (4) the call-site `disabled={!isStepValid}` gate. Keep prose per step ≤6 lines. This is the only substantial new code block in the lesson — everything else is L2's, referenced. Author the schema with Zod 4 top-level builders and the course `Result`/flatten shape so it aligns with conventions (note any deliberate simplification, e.g. omitting the full action wrapper, in prose).

**`CodeTooltips`** is optional here for `safeParse` / `z.flattenError` if the student needs the inline refresher; prefer a `Term` (see terms list) over crowding the block.

### The submit boundary: store owns the draft, the action persists

**Goal:** the cleanest senior boundary in the lesson — the store does **not** touch the database. Teach the handoff.

Content:
- Step 4's submit calls a **Server Action** (`createCustomer`, per conventions — verb+noun, no `Action` suffix unless disambiguating) with the full composite payload. The action re-parses the *entire* composite schema (server-side correctness), runs the insert inside the five-seam shape (`parse → authorize → mutate → revalidate → return`), and returns the course `Result<T>`.
- The store **never submits directly** — it has no DB access (it's client-only, the L1/L2 rule). On the action's success the client: `await`s the promise → calls `wizardStore` `reset()` → `router.push('/customers/[newId]')`.
- **The senior reflex, stated as the takeaway:** *store owns the draft, the action owns persistence, the redirect closes the loop.* Three responsibilities, three owners.
- Watch-out inline (not a separate section): **do not stash the new customer's id in the store after submit** — that's server state; redirect to the detail page instead.

**Diagram (`ArrowDiagram` inside `<Figure>`, or a tight HTML+CSS three-box flow):** three labeled boxes left-to-right — **`WizardStore` (draft)** → **`createCustomer` Server Action (parse → insert → Result)** → **`router.push('/customers/[id]')` + `reset()`**. One arrow each. Pedagogical goal: the boundary is a *handoff*, and the diagram makes the three owners spatially distinct. Prefer `ArrowDiagram` (custom HTML boxes + arrows) per the diagram index's annotated-illustration row; keep it horizontal and short. Wrap in `<Figure>`.

### Navigation: what back/forward keeps, what refresh loses

**Goal:** the behavior the student must be able to predict and defend — and the canonical placement mistake.

Content:
- **Back/forward preserves.** Browser back/forward triggers App Router navigation between the four segments. Because the provider sits on the **shared layout** and the store is held in a `useRef`, the instance survives those navigations — fill step 1, advance to step 2, hit back, step 1 is intact. The senior win: *zero ceremony, **if** the provider is on the shared layout, not the page.*
- **The canonical mistake, named loud:** put `<WizardStoreProvider>` on each **page** and the store resets on every navigation — the single most common way this screen breaks. State it here and again in anti-patterns; it's worth the repetition.
- **What loses state, by design:**
  - **Hard refresh** kills the store (no `persist` middleware). Explicit product call: refresh-loses keeps the surface honest.
  - **Exiting the wizard** (clicking the logo, hitting back past `/customers/new/step-1`) unmounts the provider and discards the store. Explicit product call: prevents stale drafts haunting future visits.
- **Why this is the senior call, not a gap:** drafts that survive refresh need *server* persistence with all the garbage-collection cost from "why not server state." `persist` to `sessionStorage` (L2) is the escape hatch *if product wants it* — name it as available, state that this wizard deliberately doesn't, and say why (refresh-loses is intentional; surprise data lingering on a shared computer is the cost of persisting silently).

**Component — `DiagramSequence`:** scrub through four navigation events on the same four-segment strip from §"The screen," with the store-state band underneath updating each step:
1. Fill step 1, advance to step 2 → band shows `{ contact: ✓ }`, current = step-2.
2. Back to step 1 → band still `{ contact: ✓ }`, current = step-1 (**preserved**).
3. Hard refresh → band empty, current = step-1 (**lost — no `persist`**).
4. Exit to `/customers` then return → band empty (**discarded on unmount**).
Per-step captions name *preserved* / *lost* / *discarded*. Pedagogical goal: the preserve-vs-lose rule is a *temporal* behavior — a sequence the student scrubs beats four prose sentences. Own card; do not wrap in `<Figure>`. Reuse the phase-strip markup so it reads as the same screen evolving.

### Reset discipline at the tenancy boundaries

**Goal:** the same cross-cutting hygiene L2 named as a cost and ch076 drew for TanStack Query — now made concrete on three named boundaries.

Content — three resets, each one line, each justified:
- **After submit-success (step 4):** so a quick "create another" doesn't show the previous customer's data.
- **On sign-out:** handled at provider unmount, but call `reset()` for safety.
- **On org-switch (ch056):** the wrong tenant's draft sitting in the client store is a **data-isolation bug at the cache layer** — the same shape it would be at the data layer. Wrong-tenant draft after switching orgs is not cosmetic.
- Draw the **explicit parallel to ch076's `queryClient.clear()` at the tenancy boundary** (continuity says this cross-chapter pattern is established — reference it, don't re-explain). Same discipline, different surface: a per-tenant client cache cannot survive a tenant change.
- Reset shape recap in one clause: `set(initialWizardState, true)` — the replace flag from L2 (v5 compile-checks completeness); do not re-derive, reference.

**`Aside` (caution)** is the right home for the org-switch point's stakes — it's a watch-out that *qualifies the reset concept*, so it belongs in this section per the "watch-outs live with their concept" rule, not in a bundled tips section.

### Anti-patterns on this screen

**Goal:** the senior-reviewer checklist for *this specific surface* — concrete, screen-tied findings, not generic Zustand advice (L2 owns generic watch-outs). Each is a one-liner: the mistake + why it's wrong here. This is a content section (a coherent set of review findings for this screen), not a bundled-tips dumping ground.

Items:
- **Provider on each step page, not the shared layout** → store resets every navigation (the canonical mistake; repeated deliberately).
- **`persist` "just in case"** → refresh-loses is the call; silent `sessionStorage` leaves draft data on shared computers.
- **Stashing the new customer's id in the store after submit** → that's server state; redirect instead.
- **Dropping per-step Zod for "we'll validate on submit"** → discovering errors only on step 4 is the worst abandonment UX; the client gate is the point.
- **Submitting from a `useEffect` instead of the button handler** → double-submit on re-render.
- **Reading `currentStep` from the URL as the source of truth for *reachability*** → the URL is the source of truth for *routing*, the store is the source of truth for which step is *valid to reach* (no skipping to step 3 if step 2 is invalid). They should agree; the store gates reachability.
- **Clearing with `set({})` instead of `set(initialWizardState, true)`** → partial state breaks selectors that assume slice presence.
- **Querying the store from a Server Component** → there isn't one in the wizard tree, but a reviewer flags any attempt (Zustand is client-only).

**Component — `MultipleChoice` (multi-select)** OR a short `TrueFalse` round to self-check the two highest-value findings (provider placement, submit-from-effect). One compact exercise; the section's value is the list, the exercise just pins the two that bite hardest. Prefer `MultipleChoice` with the stem "Which of these will break the routed wizard?" and 4–5 options drawn from the list above (2 correct → auto multi-select).

### Where this goes next: the ch079 build

**Goal:** the forward pointer — close the bridge.

Content: one short paragraph + a `Steps` or short list naming exactly what ch079 builds against this contract: the four route segments, the per-step Zod schemas, the four-slice store, the provider on the shared layout, each step's form wired to the store with the Next-gate, the `createCustomer` submit action, the success-reset, and the verify recipe (back/forward preserves, refresh loses *by design*, no double-submit on step 4). One line: *this lesson is the framing and the contract; ch079 is the file-by-file build.* Optionally one `ExternalResource`/`LinkCard` to the official Zustand "Setup with Next.js" guide for the student who wants the upstream reference (the provider pattern's source). No quiz here — chapter quiz is L4.

---

## Terms (Tooltip candidates)

Strategic, few. Most vocabulary is assumed from L1/L2; only add `Term`s that support *this* lesson's goals:
- **draft (state)** — "data the user is editing that isn't persisted yet; here, the in-progress customer that doesn't exist until step 4 submits." (Load-bearing for the whole "why not server state" argument.)
- **routed wizard** — "a multi-step flow where each step is its own URL/route segment, so back/forward and deep links work — as opposed to a modal wizard living on one route." (The ch045 fork hinges on this distinction.)
- **read-your-writes / tenancy boundary** — only if not already a live `Term` from ch056/ch076; "the moment the active tenant changes (org-switch) — any per-tenant client cache must be cleared or it shows another org's data." Keep it one line.

Do **not** re-`Term` `selector`, `createStore`, `useShallow`, `persist`, `StateCreator` — L1/L2 introduced them; treat as assumed vocabulary (continuity confirms `selector` shipped with a `Term` in L1).

---

## Scope

**Prerequisites to restate concisely (one line each, do not re-teach):**
- The L1 funnel and three triggers (reference, don't rebuild).
- The L2 API: `createStore` + provider, `useWizardStore(selector)`, slices/`StateCreator`, `useShallow`, `reset` with the replace flag, the five-file layout. **Reference by name; show no new copy of the provider, hook, or `contact-slice`.**
- The one-schema-both-sides Zod contract (ch042 / ch045 L3) and the five-seam Server Action shape (ch044-era) — reference, don't re-teach.
- `nuqs`/URL state (ch060), TanStack Query's four triggers and `queryClient.clear()` (ch076), org-switch (ch056) — reference as established.

**This lesson does NOT cover (reserved):**
- **The file-by-file build, starter walkthrough, and verify recipe — ch079.** This lesson is framing + contract only. Show *shapes* (the `MetaSlice` gate, the submit handler) but not the full implementation of all four slices, all four schemas, or all four route pages.
- **The three deferred slices in full** (`BillingSlice`, `PreferencesSlice`, plus the billing/preferences schemas) — named, "mirror contact," built in ch079.
- **Customer-draft persistence to the server** — explicitly out of scope; it's the named product call (the *reason* it's cut is in-scope, the implementation is not).
- **Wizard-as-modal / single-route** — that's the ch045 RHF pattern; named as the fork, not taught here.
- **Step transitions, animations, progress-bar polish** — UX polish, out of scope.
- **Re-teaching the generic Zustand watch-outs** (whole-store selection, module-scoped store, missing `'use client'`) — L2 owns those; this lesson's anti-patterns are *screen-specific*.
- **`persist` hydration-gating implementation** — named as the escape hatch this wizard declines; L2 named the trap, ch079 doesn't use it.

---

## Notes for downstream agents

- **Honor the L2 contract exactly** (verified against the shipped L2 MDX): files at `customers/new/_lib/wizard/{wizard-types.ts, contact-slice.ts, store.ts}` and `customers/new/_components/{wizard-store-provider.tsx, use-wizard-store.ts}`; types `WizardState` (slice intersection) and `WizardStore = WizardState & { reset }`; factory `createWizardStore()` (no args in shipped version); hook `useWizardStore<T>(selector)`; provider mounted on `customers/new/layout.tsx`; `reset: () => set(initialWizardState, true)`. Any new code must match these names.
- **Slice/reset reconciliation:** `goNext`/`goBack`/`currentStep`/`completedSteps` live in `MetaSlice`; store-wide `reset` stays as L2 shipped it (`WizardStore & { reset }`). State this mapping in §"The store shape."
- **Do not duplicate L2's RenderTracking selector demo** — reference it in one clause.
- Server Action named `createCustomer` (verb+noun), uses the five-seam shape and returns `Result<T>`; Zod 4 top-level builders (`z.email()`), flat error shape (`z.flattenError(...).fieldErrors`).
- Diagrams: phase strip (HTML+CSS), funnel (`StateMachineWalker` decision), submit handoff (`ArrowDiagram`), navigation behavior (`DiagramSequence`). Exercises: `Buckets` (tool discrimination), `MultipleChoice` (anti-pattern self-check).
- Lesson is decision-heavy and code-light by design (the syntax is L2's); keep prose tight and lean on the components.
