## Concept 1 — Provider on the shared layout, not the step page

**Why it's hard.** A wizard built from four route segments feels like four pages, so the instinct is to put the provider on the page that needs the store. That instinct destroys the wizard: every Next click unmounts the provider, the next page mounts a fresh one, and the draft vanishes between steps. The fix is structural, not behavioral — the provider has to sit at the only mount point that survives sibling-route navigation.

**Ideal teaching artifact.** A side-by-side route-tree visualizer the student toggles between "provider on page" and "provider on layout." Each tree shows the wizard's four step segments, the shared layout, and a coloured "store lifetime" band that lights up the subtree where the provider's `useRef` value persists. Toggling the placement re-runs an animated step-1 → step-2 → step-1 sequence in a mini-frame underneath, and the student watches the form fields either survive or wipe. Concept archetype — the student forms the mental model of "navigation across siblings unmounts each sibling, but the common ancestor stays mounted" before any line of code is written.

**Engagement.** After the visualizer, a single `PredictOutput`-style prediction: given a placement choice and a Back → Forward sequence, predict whether step 1's firstName field still reads `"Ada"` when the user returns. Two questions, one correct placement and one wrong, before the lesson's first edit.

**Components.**
- `Figure` wrapping a hand-authored SVG of the App Router subtree with the two placements rendered as two states of the same diagram. Single visual, no bespoke component.
- `PredictOutput` for the placement prediction round.
- Alternative if budget allows: a bespoke `RouteTreeLifetime` component (inputs: route segments, provider position, scripted nav sequence; output: animated unmount/mount markers and a synchronized field-value mirror). Demoted because the static SVG plus the `PROVIDER_ON_STEP_PAGE` flag in the verify lesson already carry the demo.

**Project link.** This concept is the load-bearing structural choice for 16.4.3's `layout.tsx` wrap and the `PROVIDER_ON_STEP_PAGE` flag exercise in 16.4.6.

## Concept 2 — `createStore` from `zustand/vanilla`, not `create`

**Why it's hard.** The most-seen Zustand snippet on the internet is `const useStore = create((set) => ({...}))` at module scope. That snippet works in a SPA. On App Router it puts the store in the Node process's module memory — one shared instance across every request the worker handles — and the first time two users hit the layout in the same process, user B sees user A's draft. The student has to learn to read the import line as a tenancy decision.

**Ideal teaching artifact.** A wrong-by-default sandbox: a stripped two-tab simulator where each tab is a "session," both pointing at the same toy wizard. The student starts on the default `create` import; types in tab A; switches to tab B and watches the draft appear there. Then the sandbox offers a single import swap — `from 'zustand'` to `from 'zustand/vanilla'` — and the student re-runs the sequence and sees the tabs isolate. Pattern archetype, wrong-then-right at the import line itself. The two-tab framing makes "module scope = shared memory" concrete in a way a paragraph cannot.

**Engagement.** Immediately after the sandbox, a `MultipleChoice` asking what would change if both tabs shared one factory-created store reference (instead of each tab calling the factory) — locks in that the *factory* is the per-request unit, not the import.

**Components.**
- New: `LeakySessionDemo` — two iframed mini-app tabs sharing module scope, with a one-line import toggle. Has forward use in Concept 11 (per-request isolation) and a natural forward link to any future cross-request-leak demo (auth session in Unit 17, cache in Unit 15).
- `MultipleChoice` for the follow-up recall.
- Fallback: `CodeVariants` with two snippets and prose describing the leak, plus the inspector's `STORE_MODULE_SCOPED` flag carrying the demo in the verify lesson. Acceptable if `LeakySessionDemo` is out of scope.

**Project link.** 16.4.3's `store.ts` import line and 16.4.6's `STORE_MODULE_SCOPED` flag-flip both rest on this concept.

## Concept 3 — `useRef`-pinned provider with lazy init

**Why it's hard.** The student has just learned that the factory must run per request. Now they have to choose the React primitive that runs the factory exactly once per component instance. `useState(() => createStore())` looks fine and works in production builds, but strict mode's double-invoke can create two stores on first mount in dev, and only one survives in the context — silent state loss until someone tracks it down. The discipline is "store-shaped refs use `useRef` with the lazy-init `if (ref.current === null)` pattern."

**Ideal teaching artifact.** A short `AnnotatedCode` walk of the provider body, but the highlighted line is the *condition* `if (ref.current === null)`, not the assignment. The annotation steps: ref initially null on mount; condition fires once; assignment happens; subsequent re-renders find ref non-null and skip; under strict mode the second invoke also finds ref non-null because the same ref object survives. Mechanics archetype with the senior call ("why not `useState`?") inline as a Term-tooltipped aside.

**Engagement.** A two-question `TrueFalse` round: "useState's initializer runs once per component instance" (false under strict mode), "useRef's `.current` survives across strict-mode double-invokes" (true). Confirms the student has the primitive's lifecycle, not just the snippet.

**Components.**
- `AnnotatedCode` on the provider snippet.
- `Term` for the inline "strict mode" tooltip.
- `TrueFalse` for the lifecycle recall.

**Project link.** Owns 16.4.3's `store-provider.tsx` write.

## Concept 4 — Typed slices composed into one store shape

**Why it's hard.** Four slice files, each a `StateCreator<WizardState, [], [], Slice>`, all spread into the same factory. The signature is dense — three middleware-tuple generics the student isn't using yet, plus the load-bearing fact that `set` and `get` inside every slice see the *whole* `WizardState`, not just the slice's own fields. Students either write each slice as if it owns its own store (and lose cross-slice access in `goNext`) or they balloon one slice file into a god-store.

**Ideal teaching artifact.** A two-pane diagram: left pane shows four slice rectangles with their fields and setter signatures; right pane shows the intersected `WizardState` rectangle with all fields visible. An arrow from each slice's `set`/`get` parameters points across to the `WizardState` rectangle, captioned "every slice's `set` and `get` see this." A second beat: a small `AnnotatedCode` walk of the `meta-slice.ts` `goNext` function — three lines, but each line uses a different access pattern (`get()` to read `currentStep`, a call into the slice's own `markStepComplete`, and `set` to advance). The two beats together give the student the type signature *and* the runtime access shape. Concept archetype.

**Engagement.** `Tokens` exercise on the `StateCreator<WizardState, [], [], ContactSlice>` signature — click the type parameter that names the whole-store shape; click the type parameter that names the slice's own output. Forces the student to read the generic positionally.

**Components.**
- `Figure` wrapping a hand-authored SVG for the two-pane composition diagram.
- `AnnotatedCode` for the `goNext` walk.
- `Tokens` for the generic-parameter drill.

**Project link.** Owns the four slice files written across 16.4.3.

## Concept 5 — Atomic selectors as the default subscription shape

**Why it's hard.** Coming from Redux or `useContext`, the natural reach is `const { firstName, lastName, email, phone } = useWizardStore((s) => s.contact)` — read the slice, destructure. That returns a new object reference every state change; `Object.is` fails; the whole step re-renders on every keystroke from any field. The student needs to feel the re-render storm before the rule lands.

**Ideal teaching artifact.** A controllable simulator that wraps a tiny three-field form in two modes: "slice-object selector" and "one atomic selector per field." Each input shows its own live render-count badge. The student types into one input under each mode and watches the counters. Under slice-object mode, every field's counter increments on every keystroke; under atomic mode, only the touched field's counter moves. The simulator is the lesson — the rule is read off the running widget. Explorable-explanation archetype.

**Engagement.** A `Buckets` sort right after the simulator: classify a list of selector snippets into "atomic" and "composite/needs-`useShallow`." Items include `(s) => s.contact.firstName`, `(s) => s.contact`, `(s) => ({a: s.a, b: s.b})`, `(s) => s.validateContact().success`. Locks in shape recognition.

**Components.**
- New: `SelectorRerenderSim` — small wizard-style form with a mode toggle (slice-object vs. atomic), per-field render counters, and a "type N characters" auto-run button. Forward-links to any future React-render-scoping topic (Unit 4 already, but specifically Unit 19.4's component-test lesson and any future memoization/selector teaching).
- `Buckets` for the selector-shape sort.
- Fallback: `Figure` with a static "render-counter snapshot" SVG comparing the two modes side by side, plus the inspector's re-render-counter panel carrying the live demo in the verify lesson.

**Project link.** Drives the field-by-field wiring on every step in 16.4.4 and the re-render-counter verification in 16.4.6.

## Concept 6 — Derived-primitive selectors and the Next-gate

**Why it's hard.** The Next button's `disabled` prop reads `isValid`, but `validateContact()` returns a fresh `SafeParseResult` object every call. If the selector returns that object, the footer re-renders on every keystroke. If the selector returns `result.success` — a primitive boolean — the footer re-renders only when the gate flips. Same data, different selector shape, dramatically different render behavior. The rule generalizes: derive the smallest primitive the consumer actually needs inside the selector.

**Ideal teaching artifact.** A `CodeVariants` block with three tabs of the same `isValid` selector: (1) returning the whole `SafeParseResult`, (2) destructuring `{ success, error }`, (3) returning `result.success`. Each tab carries a one-line render-count summary the student can predict before reading. Pattern archetype, three-way wrong-by-default with the right answer last.

**Engagement.** `PredictOutput`-style drill: given each selector variant and a 10-keystroke typing sequence, predict the footer's render count. Three predictions, one per variant.

**Components.**
- `CodeVariants` for the three-tab selector comparison.
- `PredictOutput` for the render-count prediction.

**Project link.** Owns the footer's `isValid` write in 16.4.4 and the "Next re-renders only when boolean flips" clause of the verify lesson.

## Concept 7 — `useShallow` reserved for genuine composite picks

**Why it's hard.** Step 4's review reads all three preceding slices into one rendered block. A natural atomic-only approach would be three `useWizardStore` calls — fine, but verbose, and the student has already met `useShallow` in 16.3.2. The danger is the opposite: the student reaches for `useShallow` everywhere as a habit, papering over the atomic-selector discipline from Concept 5. The rule is "use `useShallow` when the selector returns a fresh literal object or array assembled from multiple existing references — and only then."

**Ideal teaching artifact.** A decision walkthrough as `Matching`: column A lists selector return shapes ("a single primitive," "an existing slice reference," "a new object built from three slice references," "a new array built from filtered list items"); column B lists the equality strategy ("default `Object.is` is fine," "`useShallow`," or "split into atomic selectors"). The student matches them. Decision archetype made tactile. Follow with a single short `CodeTooltips` snippet of step 4's actual review selector showing where the freshly-built object is and why `useShallow` is the right equality for it.

**Engagement.** The matching exercise itself is the assessment. Follow with a one-sentence rule the student writes themselves via `TextAnswer` or read aloud: "Reach for `useShallow` when the selector returns a fresh literal object or array." Confirms phrasing.

**Components.**
- `Matching` for the return-shape → equality-strategy drill.
- `CodeTooltips` for the step-4 selector annotation.

**Project link.** Drives the single `useShallow` usage in 16.4.5's step-4 page and the "only one hit" grep clause in 16.4.6.

## Concept 8 — Zod schema as the shared contract across client gate and server action

**Why it's hard.** The client form gates Next on `contactSchema.safeParse` and the server action gates the insert on `createCustomerInput.safeParse` (which embeds `contactSchema`). If those are two separate schemas — even with identical fields — they will drift, and the silent failure mode is a form that passes the client gate and rejects at the action. The single-source rule is structural, not stylistic.

**Ideal teaching artifact.** A `Figure` containing a hand-authored SVG with `schemas.ts` in the center and two arrows fanning out: one to `step-1/page.tsx`'s `validateContact()` call site, one to `actions.ts`'s `createCustomerInput.safeParse` call site. The arrows are labeled "client gate" and "server boundary." Underneath, a `Tabs` block shows the actual imports from both files — one schema source, two consumers. The mental model: the schema is the contract, the gate and the action are two enforcement points on the same contract. Concept archetype.

**Engagement.** A small adversarial test the student runs in devtools (recipe in prose): fetch the action with a payload that bypasses the client form by hand-crafting bad JSON. The action returns `{ ok: false, error: { code: 'invalid-input' } }`. The student confirms the server enforces the schema independently and the store is untouched. Confirms the "client gate is UX, server parse is the contract" rule by doing.

**Components.**
- `Figure` with the schema-as-contract SVG.
- `Tabs` showing the two import sites.

**Project link.** Owns the "same Zod schema validates client-side and server-side" clause and the bypass test in 16.4.6.

## Concept 9 — Store / action separation, submit button as the seam

**Why it's hard.** The student has spent three lessons living inside the store; the action looks like one more thing the store should call. It isn't. The store owns the draft in memory; the action owns the database write; neither imports the other. The submit button is the only place that reads from the store and calls the action. Without this separation, the temptation to import the store inside the action (or call the action from inside a store method) collapses the architecture.

**Ideal teaching artifact.** A boundaries diagram: three rectangles labeled "store (`/lib/wizard/`)", "submit button", "action (`/lib/wizard/actions.ts`)" with arrows showing what reads from what. The submit button is the only node with arrows pointing both into the store (read slices, call `reset`) and into the action (call `createCustomerAction`). A second beat below: a small grep-style table showing what each file imports and what it must *not* import — `actions.ts` imports schemas, never the store; the store imports neither. Pattern archetype emphasizing the seam.

**Engagement.** `Buckets` sort: classify a list of operations ("read firstName," "write a row to `customers`," "call `reset()`," "verify org membership," "render the review block") into "store," "submit button," "action," or "neither/RSC." Forces the student to place every operation at its owner.

**Components.**
- `Figure` with a hand-authored SVG boundaries diagram.
- `Buckets` for the responsibility-placement sort.

**Project link.** Owns the seam wired in 16.4.5's `submit-button.tsx` and the "no Server Component imports the store" clause in 16.4.6.

## Concept 10 — `useTransition` for pending state and the double-submit guard

**Why it's hard.** Two failure modes hide under "the button should disable while submitting." First, plain `useState<boolean>` works but loses transition semantics and lets a fast double-click fire the handler twice between renders. Second, students reach for the button-disabled prop alone without realizing the disable has to be derived from the same boolean the handler guards on. The right shape is `useTransition`'s `isPending` — it suspends consistently, disables the button, and acts as the guard.

**Ideal teaching artifact.** A scrubbable timeline diagram (`DiagramSequence`) showing the submit's six frames: click → `startTransition` → `isPending: true` → button disabled, second click no-op → action resolves → `isPending: false` → reset + push. The student steps through one frame at a time. Below, a `CodeVariants` block contrasting `useState`-based pending and `useTransition`-based pending side by side, with the failure window of the `useState` version called out at the right frame. Mechanics archetype with the temporal model carried by the sequence.

**Engagement.** Inspector-driven verification (this is one place where the artifact's engagement is the verify step itself, but it lands two lessons later, so add a confirming `Sequence` here): drag the six frames of the submit lifecycle into the right order. Confirms the student can name the order before they wire it.

**Components.**
- `DiagramSequence` for the six-frame submit timeline.
- `CodeVariants` for `useState` vs. `useTransition`.
- `Sequence` for the frame-ordering recall.

**Project link.** Owns the submit-button wiring in 16.4.5 and the "Force double-submit" verification in 16.4.6.

## Concept 11 — Success-reset discipline and refresh-loses as the product call

**Why it's hard.** Two beats packed into one concept because they share the same boundary. First: `reset()` fires only on `{ ok: true }`, never on failure — wiping the draft on a network blip is the canonical bug. Second: refresh loses the draft by design, because the alternative is a server-side drafts table with garbage collection and tenancy and surfacing-on-return UX, all out of scope. The student has to learn to read "what survives refresh" as a product question, not a technical one.

**Ideal teaching artifact.** Two coupled beats. (1) A small `TabbedContent` "lifecycle outcomes" panel: four tabs — success, action-failure, refresh, sign-out — each showing what happens to the draft, what fires the change, and one line on why. The student reads the four outcomes as a matrix, not as scattered rules. (2) A debate transcript framing of the refresh-loses product call: two short voices, "the engineer wants `persist` middleware" vs. "the product call accepts refresh-loses," with the trade-offs (drafts table, GC, tenancy on drafts, surfacing UX) named in two sentences. Decision archetype made discussable. Together they cover the *what* and the *why* of the boundary.

**Engagement.** `TrueFalse` round on five statements: "reset fires on action failure" (false), "refresh loses the draft" (true), "the wizard layout unmounts on success-redirect so `reset()` is belt-and-suspenders" (true), "`persist` middleware would fix refresh-loses without other costs" (false), "org-switch should also fire `reset()`" (true — forward pointer to 10.1). Locks in the matrix.

**Components.**
- `TabbedContent` for the four lifecycle outcomes.
- `Figure` wrapping a small two-voice debate panel (hand-authored, single use). Or just prose if budget tight.
- `TrueFalse` for the boundary recall.

**Project link.** Owns the success-reset branch in 16.4.5's submit handler and the "refresh loses" + "action failure leaves draft" clauses in 16.4.6.

## Component proposals

- **`LeakySessionDemo`** — two iframed mini-apps sharing module scope, with a single import-line toggle that swaps `from 'zustand'` for `from 'zustand/vanilla'`; shows whether typing in tab A bleeds into tab B.
  - Uses in this chapter: Concept 2.
  - Forward-links: any future cross-request-leak demo (auth session in Unit 17.3, cache scoping in Unit 15, tenant-scoped Drizzle in 10.4 if revisited). Plausibly reusable.
  - Leanest v1: drop the live import toggle; ship two pre-rendered tabs with a "before/after" button that swaps the running iframe pair. Carries the teaching beat without authoring two complete iframe runtimes that diff on one import line.

- **`SelectorRerenderSim`** — a small mock form widget with a mode toggle (slice-object vs. atomic selector) and per-field live render-count badges; type into a field and watch only the right counters move.
  - Uses in this chapter: Concept 5.
  - Forward-links: any future React-rendering-scope teaching (memoization patterns, signals if/when introduced, Unit 19.4's component test for Next-gate transitions). Strong reuse potential.
  - Leanest v1: ship two preset scenarios (slice-object mode and atomic mode) with a single "play typing" button that auto-types ten characters and shows the counter deltas. No free-form typing, no mode-toggle UI. Cuts the build cost by half and still carries the lesson.

## Build priority

`SelectorRerenderSim` is the higher priority. Atomic-selector discipline is the most chapter-pervasive concept (concept 5 drives every form field write across 16.4.4, indirectly explains concepts 6 and 7's selector shapes, and surfaces again in the verify lesson's re-render-counter clause), and the simulator is the artifact that makes the rule felt rather than asserted. It also has the cleaner forward path into future React-rendering teaching.

`LeakySessionDemo` is the second priority. The teaching beat — "this import line is a tenancy decision" — is the load-bearing senior call for the entire `createStore` / per-request architecture, and the visceral two-tab leak is the kind of demo no static diagram replaces. Its forward-link potential into Unit 15 (cache scope) and Unit 17 (session leak) is real but more conditional than the simulator's reuse.

If only one ships, build `SelectorRerenderSim`. If neither, the inspector's flag-flips and re-render-counter panel cover the verify lesson; the front-of-chapter teaching beats fall back to `CodeVariants` and `Figure`, which is workable but flatter.

## Open pedagogical questions

- Concept 11 packs success-reset and refresh-loses into one concept because they share the lifecycle boundary; splitting them would surface two distinct senior calls but risks dilution. Worth a check from the lesson author when drafting 16.4.5's prose order.
- The `useShallow` matching exercise (Concept 7) assumes the student has met `useShallow` in 16.3.2 deeply enough to recognize its equality semantics. If 16.3.2's coverage is shallow, this matching drill may need a one-sentence refresher inline rather than relying on recall.
