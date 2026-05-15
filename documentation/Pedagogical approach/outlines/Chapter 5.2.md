## Concept 1 — Server Components are the default, and "default" means zero JS

**Why it's hard.** The returning React dev arrives carrying the old mental model: every component is a unit of browser-side React with hooks available. The App Router inverts that — *nothing* ships to the browser unless the student opts in — and the inversion is invisible at the source level because the JSX looks identical.

**Ideal teaching artifact.** A "ship inspector": the student is shown a small `app/page.tsx` Server Component with an async body, a `db.query`, a markdown render, and some JSX. Beside it sit two labeled panes — *Stays on the server* (the function body, the DB call, the imported markdown parser) and *Ships to the browser* (only the rendered HTML and the RSC payload). The student hovers or toggles parts of the source and watches each fragment animate into the correct destination pane. This is the *Concept* archetype with a built-in shock: the import that looks like normal React code does not, in fact, become a JS bundle.

**Engagement.** A short `PredictOutput`-style prediction after the artifact: given a different Server Component, ask the student to predict the byte size of the JS shipped (the answer is zero for any Server-only path). One question, locks in "default ships nothing."

**Components.**
- New component: **`WhatShips`** — source code panel on the left with hover-tagged ranges, two destination panes on the right ("Server-side only" and "Ships to client"). Hover a range and it animates to the right pane. Inputs: the source snippet plus per-range destination tags authored in MDX.
- Existing fallback: `Figure` wrapping a hand-SVG of the same two-pane split with the source annotated by colored brackets, paired with a separate `PredictOutput` exercise — workable but loses the cause-and-effect.

**Project link.** Every `page.tsx` in the 5.7 list-plus-detail project is a Server Component; the student needs the default cemented before they place a `'use client'` anywhere in that codebase.

---

## Concept 2 — The capability asymmetry between Server and Client Components

**Why it's hard.** Both kinds use React syntax, so the student assumes they're "the same React, in different places." They aren't. Each has a distinct toolbox, and the boundary between them is precisely where the toolboxes don't overlap. The mistake the student makes first is reaching for `useState` in a Server Component (or `await db.query` inside a `'use client'` file) and reading the error as a bug rather than as a category mismatch.

**Ideal teaching artifact.** A `Buckets` sort: a deck of capability cards — `useState`, `await db.query(...)`, `onClick`, `process.env.STRIPE_SECRET`, `useEffect`, `await fs.readFile`, `window.localStorage`, `<MyButton onClick={...} />`, `createContext`, `await fetch` — that the student sorts into *Server-only*, *Client-only*, or *Either*. The misconception is forced into the open at the moment the student commits to a placement; the feedback names the boundary, not the API.

**Engagement.** The sort *is* the assessment. Follow up with one `MultipleChoice` that names the principle rather than a capability ("Which line of reasoning explains why `process.env.STRIPE_SECRET` belongs only in a Server Component?") so the student finishes with the *rule*, not a memorized list.

**Components.**
- Existing: `Buckets` for the sort, `MultipleChoice` for the rule confirmation.

**Project link.** In 5.7 the student decides per-component which side of the line each leaf lives on; the asymmetry is the table they'll consult silently every time.

---

## Concept 3 — Composition direction is one-way, and `children` is the escape hatch

**Why it's hard.** A senior reflex is reading the file's directive and its imports to know which graph the file belongs to. The junior reflex is treating an import as a neutral act. The student must internalize: a Client Component cannot `import` a Server Component (the bundler would have to ship server code), but a Client Component *can* receive a server-rendered tree through `children` or any other prop slot. This is the canonical "interactive shell wrapping server content" pattern.

**Ideal teaching artifact.** An interactive component-tree builder — three labeled tile types (Server, Client, Server-passed-as-children) the student drags into a nested tree. As the student composes, edges light green (legal) or red (illegal). The illegal cases show the framework's actual error message under the tree. The student must construct three target compositions: (1) Server page renders a Client button, (2) Client tabs wrap a server-rendered body via `children`, (3) the attempted-and-rejected shape of a Client Component importing a Server Component.

**Engagement.** The tree builder carries assessment. Confirm with a `Tokens` round on a real file pair — click the line that crosses the boundary, click the prop slot that carries the server tree across.

**Components.**
- New component: **`BoundaryTreeBuilder`** — drag-and-drop component tree with legality lighting; inputs are the legal target shapes and the framework error messages keyed to illegal edges.
- Single-use check: recurs in Concept 5 (pushing the boundary down — the same tree shape with byte annotations) and arguably forward-links to 5.3 (Suspense boundary placement on the same tree). Earns its weight.
- Existing fallback: a `DiagramSequence` showing three pre-built compositions advancing one at a time, with the illegal one as the middle frame. Cheaper but the student doesn't *do* the composition.
- Confirmation: `Tokens`.

**Project link.** The 5.7 modal-with-real-URL pattern is exactly the Client-shell-wraps-Server-children shape; this concept is what makes that file readable.

---

## Concept 4 — Client Components also render on the server

**Why it's hard.** The name "Client Component" lies. The student reads `'use client'` and assumes "this runs in the browser, full stop." The reality is that Client Components render *twice* — once on the server during initial response to produce HTML, then again in the browser during hydration to attach behavior. Every hydration bug in Concept 11 traces back to this misread.

**Ideal teaching artifact.** A scrubbable timeline — `DiagramSequence`-shaped — that walks the request lifecycle for a Client Component: (1) server receives request, (2) server *runs* the Client Component to produce HTML, (3) HTML lands in the browser and is painted, (4) JS arrives, (5) the *same* Client Component runs again in the browser, (6) React reconciles its tree with the existing HTML. The student scrubs back and forth and sees the function execute in two places. The visual emphasizes that hooks are valid in both renders, but the *effects* of state changes only land in render two.

**Engagement.** A `TrueFalse` round of five short statements ("A `'use client'` file never runs on the server" — false; "A `useEffect` callback fires during the server render" — false; "A `useState` initializer runs during the server render" — true; etc.) so the student calibrates the two-render model against concrete claims.

**Components.**
- Existing: `DiagramSequence` for the timeline, `TrueFalse` for the calibration round.
- Single hand-SVG frame per step inside the sequence — no bespoke component needed.

**Project link.** The 5.7 modal's interactive shell renders on the server first; understanding the two-render model is what stops the student from gating its open state on `typeof window !== 'undefined'`.

---

## Concept 5 — Pushing the boundary down: the cost ledger

**Why it's hard.** The student treats `'use client'` as a per-file annotation with no spillover. The reality is contagion: every module the file transitively imports is bundled for the client. Marking a page or layout `'use client'` quietly hauls the entire subgraph into the browser. The senior reflex is the opposite — flip to Client at the smallest leaf — and the reflex only takes hold when the student sees the byte cost change as the boundary moves.

**Ideal teaching artifact.** Reuse the `BoundaryTreeBuilder` from Concept 3 with byte annotations on each leaf. The student is shown a realistic product-list page tree (page → list → card → buy button, with each leaf labeled by its dependency weight). A draggable `'use client'` marker starts at the page root; the student drags it down and watches the highlighted client subgraph shrink and the byte tally drop from "everything plus React" to "the buy button and its handler." The artifact is *Pattern* archetype — the wrong-by-default starting state is what makes the right move visible.

**Engagement.** The artifact carries assessment intrinsically (the student must place the marker at the right leaf to reach the target byte count). Confirm with a single `MultipleChoice` asking *why* pushing the marker further down doesn't always help (some leaves genuinely need state; further descent breaks the component).

**Components.**
- Reused: `BoundaryTreeBuilder` (extended with byte annotations and a draggable marker — these should be inputs to the same component, not a separate one).
- Existing fallback if the extension feels heavy for v1: a `TabbedContent` with three hand-SVG trees ("boundary at page," "boundary at card," "boundary at button") and a byte tally under each — same teaching shape, no interaction, plus a follow-up `MultipleChoice`.

**Project link.** In 5.7 the student places exactly one `'use client'` — on the modal trigger leaf, not the slot or layout. This concept is the rule they apply at that moment.

---

## Concept 6 — `"use client"` mechanics and the explicit-over-magic principle

**Why it's hard.** The directive looks decorative — a bare string at the file head. The student needs to grasp three non-obvious facts at once: it must be the first non-comment line, it changes the module graph for every transitive import, and a typo fails silently. Bundled with this is Architectural Principle #6: the framework chose to make the boundary literal in source rather than infer it, and the senior preference for explicitness recurs throughout the stack.

**Ideal teaching artifact.** A two-beat artifact. First, a module-graph repaint widget: a small file tree where the student toggles `'use client'` on one file and watches the graph repaint — the file and every module it imports flip from green (server graph) to amber (client graph), with a counter showing how many modules just crossed. Toggling it off repaints back. Second beat, a typo trap presented as `CodeVariants` — three tabs showing `'use client'`, `'use clinet'`, and `'use-client'`, each with the resulting build behavior. The principle (#6) lands as a one-paragraph aside between the two beats, naming two other call sites where the same preference shows up (explicit dep arrays, Zod at IO boundaries) without surveying them.

**Engagement.** A `Tokens` round on a real file: the student clicks the directive (correct) and the first import line (decoy, lower-priority correct — it's also part of what makes the file Client). Reinforces the *reading reflex* (directive plus imports = graph membership).

**Components.**
- New component: **`ModuleGraphToggle`** — a small visualized module graph (nodes = files, edges = imports) with a toggle on one node that repaints the transitive client subgraph. Inputs: the graph topology, the starter node, the toggle target.
- Forward-links: 5.2.3 (already this lesson), 7.2 (`'use server'` boundary semantics), 5.6.1 (`serverExternalPackages` graph effects).
- Existing: `CodeVariants` for the typo trap, `Tokens` for the reading reflex check, `Aside` for the principle callout.

**Project link.** Every `'use client'` line in 5.7 is one the student writes deliberately; this concept is the moment they stop typing it from muscle memory.

---

## Concept 7 — `"use client"` and `"use server"` look symmetric but aren't

**Why it's hard.** The names parallel. The behavior does not. `"use client"` marks *components* whose code ships to the browser; `"use server"` marks *functions* that execute on the server when called from the browser. A `"use server"` file has nothing to do with Server Components. The student who learns the two directives in close succession will conflate them, and the conflation produces a class of confused architecture decisions ("I marked my file `'use server'` to make it a Server Component").

**Ideal teaching artifact.** A snippet card deck — each card a tiny code fragment (`'use client'` at the top of a file with hooks; `'use server'` at the top of an actions file; inline `async function () { 'use server' }`; no directive on a page file; `'use server'` accidentally in a component file). The student sorts each card into one of four labeled buckets: *Client Component boundary*, *Server Action(s)*, *Server Component (default)*, *Confused — this won't do what the author thinks*. The fourth bucket is the load-bearing one: it surfaces the canonical confusion explicitly rather than letting it hide.

**Engagement.** The sort is the assessment. Confirm with one `MultipleChoice` whose stem reads "A teammate writes `'use server'` at the top of a layout file and expects it to run on the server. What actually happens?"

**Components.**
- Existing: `Buckets` (four-category mode) for the sort, `MultipleChoice` for the confirmation.

**Project link.** No Server Actions in 5.7 — but this concept inoculates against the confusion that will land hard the moment Unit 7 introduces them.

---

## Concept 8 — `server-only` / `client-only` turn convention into a build error

**Why it's hard.** Directives are convention. Convention breaks under refactor — a server helper imported into a file that later gets imported from a Client Component will quietly ride into the client bundle, secrets and all. The student needs to see the failure mode happen, then see the same scenario fail at build time after a one-line fix.

**Ideal teaching artifact.** A "find the leak" guided puzzle. The student is shown a small project tree: `lib/db.ts` (reads `process.env.DATABASE_URL`), `lib/getProducts.ts` (imports `lib/db.ts`), `components/ProductGrid.tsx` (`'use client'`, imports `lib/getProducts.ts`). The build succeeds. The student opens a simulated DevTools view and finds the connection string visible in the client bundle. The task: add `import 'server-only';` to the one file that breaks the chain, and rerun the simulated build to see the error message point at the offending import path. The `'use server'` vs `server-only` distinction lands as a `CodeVariants` follow-up with two files side by side, captioned for what each does.

**Engagement.** The puzzle is the assessment. Confirm with a `Matching` exercise pairing four file roles (`db/index.ts`, `app/dashboard/_actions.ts`, `components/Chart.tsx`, `lib/auth/session.ts`) with the right top-of-file line (`import 'server-only';`, `'use server';`, `'use client';`, `import 'server-only';`).

**Components.**
- New component: **`LeakedImportPuzzle`** — fixed project tree view, simulated build output panel, simulated client-bundle inspector showing what leaked. Author specifies the tree, the leak target string, and the fix file.
- Single-use check: arguably load-bearing only here. Demote to alternative.
- Primary recommendation: a `Figure` containing a static `ArrowDiagram` of the import chain with the leaking edge highlighted, then a `CodeVariants` showing the file before and after `import 'server-only';` with the corresponding build output captions ("builds, leaks" → "fails build, points at offending import"). Plus the `Matching` exercise.
- Alternative if reused later (Unit 17 security audit pass): the `LeakedImportPuzzle`.

**Project link.** None for 5.7 (no server-only helpers in scope). Forward-load-bearing for Units 6, 9, and 17.

---

## Concept 9 — What crosses the RSC wire: structured clone plus React extensions, no functions, no class instances

**Why it's hard.** The student treats props as JSON-ish and is blindsided by the first "Functions cannot be passed directly to Client Components" error. The wire format is concrete: structured-clone-compatible values plus a small set of React extensions (Promises, JSX, Server/Client/Action references, `Symbol.for`). The rule is testable but the student doesn't know how to test it without a sandbox.

**Ideal teaching artifact.** A wire-prop sandbox. A small Server Component passes one prop to a Client Component; the student picks the prop's value from a palette (string, number, `Date`, `Map`, plain object, `Promise`, a `<ServerChild />` JSX node, an arrow function, a `class Foo {}` instance, a `Symbol('x')`, a `Symbol.for('x')`). On send, the right pane shows what arrives at the Client Component: success with the value, success with a flattened shape, or the actual framework error message verbatim. The student is invited to predict before sending. This is *Mechanics* with a built-in misconception ambush — every wrong pick produces a real error the student will see in their own code later.

**Engagement.** The sandbox carries assessment via prediction-then-reveal. After three rounds, a `Buckets` sort confirms recall: drop ten prop kinds into *Crosses cleanly*, *Crosses, but reshape first*, *Does not cross — needs a Server Action*, *Does not cross — flatten the data*.

**Components.**
- New component: **`RscWireSandbox`** — palette of prop values, "send" button, two-pane source-and-arrival view, error-message-or-result display. Inputs: the palette of authored prop values plus their expected wire behavior.
- Forward-links: 5.2.5 (the same widget configured with `Date`/`Dayjs` for the hydration-prop story), 5.3.1 (`Promise` props plus `React.use`), 7.2 (Server Action arguments, same wire), 18.1 (`Date` vs `Dayjs` instances). Heavy reuse — worth building.
- Confirmation: `Buckets`.

**Project link.** 5.7 passes server-shaped product data into the modal's Client shell via `children` and into the detail page directly; the wire contract is what tells the student which shape to send.

---

## Concept 10 — Props rode the wire, and the wire is visible

**Why it's hard.** Props to Client Components feel like a server-to-server handoff because the developer wrote both endpoints. They aren't — the RSC payload travels over the network and is inspectable in DevTools. Pass a full user object with a hashed password to a Client Component and the hash ships. The student must internalize: the wire is a network response, treat it like one.

**Ideal teaching artifact.** A misconception-first ambush. The student is shown a "looks fine" snippet: a Server Component fetches a `User` with `{ id, name, email, hashedPassword, internalNotes }` and passes the whole object as a prop to `<UserCard user={user} />` (Client Component). The student is asked to predict whether anything is wrong. The reveal is a simulated network panel pane showing the RSC payload with `hashedPassword` and `internalNotes` plainly visible, followed by the senior fix: pick the slice (`{ id, name, email }`) before passing. The `RscWireSandbox` from Concept 9 carries this — pass the full user vs the slice and watch the payload pane.

**Engagement.** A `CodeReview`-style round on a small PR diff: the student leaves an inline comment on the line that passes the unscrubbed object, with the kernel rubric phrase "Server-to-Client props ride the RSC wire — slice before crossing."

**Components.**
- Reused: `RscWireSandbox` (with a "show payload" pane that's load-bearing for this concept).
- Existing: `CodeReview` for the assessment.

**Project link.** The 5.7 product detail almost certainly has fields the student wouldn't want on the wire (internal cost, supplier ID); this concept is what stops them from passing the whole row.

---

## Concept 11 — Hydration is a handshake, and the handshake is strict

**Why it's hard.** The hydration error message is one of the most-Googled in the App Router. The student treats it as random until they have a model: server renders the Client Component to HTML, browser receives, browser runs the *same* Client Component, React reconciles its output against the existing HTML, and *any* divergence breaks the handshake. The causes that produce divergence — `Date.now()`, `Math.random()`, locale, timezone, browser-injected attributes, stale `.next/dev` — look unrelated until they're seen as the same category: "something not equal between render one and render two."

**Ideal teaching artifact.** Two beats. First, an animated handshake explainer: a `DiagramSequence` that walks the server-render, the wire, the paint, the client-render, the comparison, and the attach. The reconciliation frame highlights the comparison happening node-by-node; the next frame shows a single divergent node lighting red and the resulting React error appearing alongside. Second beat, a `CodeVariants` mismatch lab: three tabs of small Client Components, each with one canonical cause baked in (`Date.now()` in a span, `Math.random()` as a key, a `typeof window !== 'undefined'` ternary), and the student sees the error, the fix (deferred via `useEffect` plus stable placeholder, `useId`, narrow `suppressHydrationWarning`), and the resulting clean handshake. Two beats because the model and the failure-modes lab teach different things and both are load-bearing.

**Engagement.** A `Matching` round: five mismatch causes on the left (`Date.now()`, browser extension `data-gr-*`, `Math.random()` for a key, `localStorage.getItem` during render, a stale `.next/dev` artifact) paired with the right fix on the right (`useEffect` deferral, `suppressHydrationWarning` on `<body>`, `useId`, `useEffect` deferral, `rm -rf .next`). The student matches and finishes with the diagnosis ladder in muscle memory.

**Components.**
- Existing: `DiagramSequence` for the handshake animation (hand-SVG frames), `CodeVariants` for the mismatch lab, `Matching` for the cause-to-fix round.
- Optionally: the `RscWireSandbox` from Concept 9 can demonstrate why passing a `Date` survives but a `Dayjs` instance doesn't — useful sidebar if it lands without bloating the lesson.

**Project link.** The 5.7 modal's open/close state, any timestamp displayed on a product card, and any user-locale-formatted price are exactly where this concept earns its weight in the project.

---

## Component proposals

- **`WhatShips`** — Source code panel with hover-tagged ranges plus two destination panes ("Server-side only", "Ships to client"). Hover/select moves the range visually to the right pane.
  - Uses in this chapter: Concept 1.
  - Forward-links: 5.4.2 (PPR shell vs holes — what's static vs dynamic uses the same shape of teaching), 5.4.5 (`use cache` boundaries), 16.2 (TanStack Query — what runs where). Plausible reuse.
  - Leanest v1: a two-column `Figure` with the source on the left, two stacked panes on the right, and *click* (not hover) on a tagged range moves a copy of that range into the matching pane. No animation, no diffing — just click-and-place. Still teaches the cause-and-effect.

- **`BoundaryTreeBuilder`** — Drag-and-drop component tree with three tile types (Server, Client, Server-as-`children`), legality lighting on edges, error messages for illegal compositions, and an optional draggable `'use client'` marker with per-leaf byte annotations.
  - Uses in this chapter: Concepts 3 and 5.
  - Forward-links: 5.3.1 (Suspense boundary placement on the same tree shape), 5.7 project verification ("is your boundary at the smallest leaf?"). Strong reuse.
  - Leanest v1: a pre-built tree of fixed shape with one variable — the position of the `'use client'` marker, draggable to any node. Legality and byte tally update. Skip the free-form drag-and-drop construction; the *Composition rules* artifact in Concept 3 falls back to a `DiagramSequence` and the *Cost ledger* in Concept 5 becomes the v1 application.

- **`ModuleGraphToggle`** — Small visualized module graph (nodes = files, edges = imports) with a per-node directive toggle that repaints the transitive client subgraph and counts the modules that crossed.
  - Uses in this chapter: Concept 6.
  - Forward-links: 7.2 (`'use server'` graph behavior, same widget different palette), 5.6.1 (`serverExternalPackages` effects on the graph). Plausible reuse.
  - Leanest v1: three or four nodes, one toggleable, no animation — just an instant repaint and a counter. The teaching is the repaint, not the polish.

- **`RscWireSandbox`** — Prop palette plus a send button plus a two-pane source-and-arrival view that shows what reached the Client Component, including the simulated RSC payload pane for the secrets-on-wire concept.
  - Uses in this chapter: Concepts 9 and 10.
  - Forward-links: 5.2.5 (`Date` vs `Dayjs` mismatch story), 5.3.1 (`Promise` props with `React.use`), 7.2 (Server Action argument serialization), 18.1 (date/time instances across the wire). Heavy, multi-chapter reuse — the strongest forward-link in this proposal set.
  - Leanest v1: a fixed palette of six prop values (string, `Date`, plain object, function, class instance, `Promise`), one "send" button, a hardcoded arrival-pane response per value (success/transformed/error message). No live evaluation — the responses are authored. Still teaches the wire contract by forced prediction.

- **`LeakedImportPuzzle`** (demoted — primary recommendation for Concept 8 is `Figure` + `ArrowDiagram` + `CodeVariants`) — Fixed project tree, simulated build output, simulated bundle inspector showing the leaked content; one-file fix surface.
  - Uses in this chapter: Concept 8 (alternative).
  - Forward-links: 17.3 (audit pass — same teaching shape could repeat there). Single-use within this chapter unless 17.x picks it up.
  - Leanest v1: if built at all, three files in the tree, one fix slot, hardcoded build output for each state. Defer until 17.x confirms reuse.

## Build priority

The two proposals that earn their place first by reuse weight are **`RscWireSandbox`** and **`BoundaryTreeBuilder`**. The wire sandbox carries Concepts 9 and 10 in this chapter and is the most natural artifact to revisit in 5.2.5 (the `Date`/`Dayjs` mismatch story), 5.3.1 (Promise streaming), 7.2 (Server Actions), and 18.1 — five distinct teaching surfaces. The tree builder carries Concepts 3 and 5 here and the same widget shape returns for Suspense boundary placement in 5.3.1 and the 5.7 project verification. Build both early in v1 form.

**`WhatShips`** and **`ModuleGraphToggle`** are second-tier — each carries one concept in this chapter and has plausible (not certain) forward-links. Build only after the top two land; if either timeline slips, the existing-component fallback in their respective Components bullets is adequate.

**`LeakedImportPuzzle`** is demoted. Build the `Figure` + `ArrowDiagram` + `CodeVariants` composition for Concept 8 in this chapter; reconsider the bespoke widget only when Unit 17's audit-pass chapter is outlined.

## Open pedagogical questions

- The two-render model in Concept 4 and the hydration handshake in Concept 11 share a mental model spine. Is it worth deliberately reusing the same `DiagramSequence` frames across both lessons (annotated differently) so the student feels the connection, or does each lesson deserve its own visual frame to avoid confusion at recall time?
- Concept 7 (directive asymmetry) names Server Actions before Chapter 7.2 teaches them in full. The current cut treats Server Actions as a *reference* (named to disambiguate, not taught). Is the snippet card deck's "Server Action(s)" bucket clear enough at this stage, or does the student need a one-line "what a Server Action is" sentence before sorting?
