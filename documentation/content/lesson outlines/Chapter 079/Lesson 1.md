# Lesson 1 — Project overview

## Lesson title

Chapter-outline title "Project Overview" is the contract-mandated title for the first project lesson; keep it.
- Page title: `Project overview`
- Sidebar: `Overview`

## Lesson type

`Project overview`

(First project lesson. No feature built. The student leaves with the starter running locally.)

## Lesson framing

The student leaves knowing the shape of the canonical Zustand-on-App-Router skeleton they will build over the next three lessons — a per-feature `createStore` factory, a `useRef`-pinned provider on a shared layout, a typed selector hook, atomic selectors, per-slice Zod validation shared client/server, and a Server-Action submit boundary — and with the chapter 062 customers surface plus the four wizard route shells running off the in-memory seeded store, no database or env to configure. The senior payoff framed up front: this is the skeleton every later surface that clears the three-trigger funnel (a routed cart, multi-step settings, a long form split across panes) reuses; the overview installs the mental map and the verification surface (`/inspector`) before any code is written.

## Codebase state

First lesson — no Entry/Exit deltas. The starter and solution share the same file set; the starter's TODO-stubbed files (four slices, `store.ts`, `selectors.ts`, `actions.ts`, the provider, the hook, the footer, the four step pages, the submit button) are what lessons 2–4 fill in. Everything else — `wizard-types.ts`, `schemas.ts`, the layout, the progress header, the broadcast hooks, the chapter 062 customers list/detail, the inspector, and all of `src/server` + `src/lib` — is provided complete. The lesson ends when `pnpm dev` serves `/customers`, the four `/customers/new/step-N` shells, and `/inspector`.

## Lesson sections

Follow the Project-overview section list exactly: *What we're building* (no header) / *What we'll practice* / *Architecture* / *Starting file tree* / *Roadmap* / *Setup*. Keep prose terse; technology rationale (why Zustand, why vanilla `createStore`) belongs in chapter 078 regular lessons, not here — link, don't re-explain.

### What we're building (intro, no header)

One paragraph naming the artifact: a four-step routed "new customer" wizard layered onto the chapter 062 customers surface. Each step lives at its own route segment (`/customers/new/step-1` … `step-4`); a shared `WizardStoreProvider` on the `/customers/new` layout pins one Zustand store across the four navigations; four slices hold the draft (contact / billing / preferences / meta); each step writes through atomic selectors; Next gates on the current slice's Zod validity; step 4 reviews the three data slices and submits through a Server Action that re-parses the composite payload server-side; on success the store resets and the router pushes to the new customer's detail page. State one deliberate product call: refresh mid-flow loses the draft.

Figure: one `Screenshot` (desktop) with the step-4 review screen as the hero shot. If multiple frames are wanted, wrap in `TabbedContent` — a fill→Next→Back-preserved→review→submit→redirect capture alongside a refresh-mid-flow frame showing loss-by-design. Keep to a single figure per the contract. Screenshots come from the running solution; brief the writer to capture, not invent.

### What we'll practice

Skills-framed list (not features). Name "What we'll practice". Content: standing up the canonical Zustand-on-App-Router skeleton end to end — a `createStore` factory, a `useRef`-pinned provider on a shared layout, a typed selector hook, atomic selectors, per-slice Zod validation shared client and server, a Server-Action submit boundary, and success-reset discipline. Close with the transfer claim: this is the skeleton every later three-trigger-funnel surface reuses. Keep abstract — no code here.

### Architecture

Shape only — a labeled list or one diagram. A diagram genuinely helps here because the layering (Server Components above, Client store subtree below, single Server-Action seam) is spatial and prose-heavy otherwise. Recommended: `ArrowDiagram` inside a `Figure`, horizontal, capped height. Boxes and the one relationship that matters:

- Chapter 062 customers **list** + **detail** pages (Server Components, untouched) sit *above* the wizard subtree.
- The `/customers/new` **layout** mounts `WizardStoreProvider` (the one store instance).
- The four **step pages** + the **footer** are leaf Client Components reading the store through atomic selectors.
- The **submit button** is the single seam where the client store meets the `createCustomer` **Server Action**.
- The Server Action owns the write (`pushCustomer`) and the `customer.created` audit entry, org-scoped from `ctx.orgId` (server-side tenancy).

If the writer prefers prose over a diagram, a labeled bullet list of the same five boxes is contract-acceptable. Do not detail slice internals or selector mechanics — that is lessons 2–3.

### Starting file tree

Use `FileTree`. Render the annotated tree from the chapter outline's "Starter file tree" verbatim in spirit: comment one line on each file lessons touch or that changed from chapter 062, leave the rest uncommented, and mark the TODO-stubbed files as the highlighted focus (FileTree highlight). Top-level call-outs the student should leave with (weave as a short prose lead-in or inline comments, not a second list):

- `app/(app)/customers/new/_lib/wizard/` is the feature-shaped home for the store, slices, schemas, selectors, and action; the provider and typed hook live in the sibling `_components/`.
- The `/customers/new` layout is where the provider belongs (alongside the provided progress indicator and footer shell and the four step pages).
- `app/inspector/` is the provided verification surface every Moment of truth drives.
- `src/server/store.ts` is the in-memory `globalThis` store standing in for Postgres — no Drizzle, no migration, no seed script.
- `next.config.ts` keeps `cacheComponents: true` from chapter 062: the customers list above the wizard tree stays cached; the wizard routes are leaf Client Components with no cache interaction.

Brief one sentence that the student writes only the TODO-stubbed files; `wizard-types.ts` and `schemas.ts` are provided read-only and the chapter 062 list/detail pages do not change. Mention the inspector's role one line: it reads store snapshots through an iframed wizard + `postMessage` because it sits outside the provider tree — the student does not write that wiring.

### Roadmap

`CardGrid` with one `Card` per build lesson. Lesson number + title in the card title, one sentence on what it adds:

- **Lesson 2 — Build the store skeleton.** Adds the four-slice store, the `useRef`-pinned provider on the shared layout, and the typed hook, so the wizard navigates across four routes with state surviving.
- **Lesson 3 — Wire the forms and the Next-gate.** Adds field bindings with inline Zod errors and the footer Next-gate, so each step writes into its slice and Next enables only when that slice is valid.
- **Lesson 4 — Submit, reset, and guard.** Adds the composite-payload Server Action, the `useShallow` review, and the submit button with its pending/double-submit guard, success-reset, and redirect.

### Setup

`Steps` component. Exact command sequence in order. There is no `degit` and no scaffolding to download — start and solution hold the same file set, the starter just carries TODO stubs. Steps:

1. "Get the starter codebase from the [project repository](https://github.com/terencicp/react-saas-course-projects), under `Chapter 079/start/`." (Contract-mandated first step, verbatim opening.)
2. Install dependencies — `pnpm install`.
3. Start the dev server — `pnpm dev`.

Env var list: omit — the project has no `.env` and uses no environment variables; `src/server/store.ts` boots fully seeded (two orgs `org-acme`/`org-globex`, four users admin+member each, invoices and customers per org) on first import. State this one line so the student does not look for a missing env step.

Expected result on success (close the Steps, then a short verification paragraph or inline `Code` of the URLs):
- `/customers` renders the seeded customers list.
- `/customers/new/step-1` renders the step-1 shell with fields unwired (the slice setters are no-ops and the hook returns a default), so the footer Next stays disabled.
- `/inspector` loads with the wizard iframe and a store-snapshot panel waiting for a broadcast (the provider stub does not yet wire `useBroadcastSnapshot`).

The lesson ends when the starter runs locally — no further build.

Code-sample handling for this lesson: `FileTree` for the starter tour; `Code` for the setup command sequence inside `Steps` and for the expected-URL output; `ArrowDiagram` inside `Figure` for Architecture (optional, prose-list acceptable); `Screenshot`/`TabbedContent` inside `Figure` for the hero figure; `CardGrid`/`Card` for the Roadmap. No `AnnotatedCode`/`CodeVariants`/`CodeTooltips` — there is no implementation code in an overview lesson.

## Scope

This lesson does not build any wizard behavior — the store, slices, provider, hook, selectors, forms, Next-gate, submit, and reset are all lessons 2–4. It does not explain *why* Zustand, *why* vanilla `createStore` over `create`, or the three-trigger funnel rationale — those are chapter 078's regular lessons (recap only, link don't re-teach). It does not configure a database, env, or migration — there is none; the in-memory store is the standing data layer. Per-request store isolation, the `useRef`-pin reasoning, and the `PROVIDER_ON_STEP_PAGE`/`STORE_MODULE_SCOPED` debug branches are introduced and exercised in lesson 2's Moment of truth, not here.
