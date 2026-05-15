## Concept 1 — URL as the source of truth for view state

**Why it's hard.** The reflex shape for "open a modal" is `const [open, setOpen] = useState(false)`. That ships a working modal that silently fails on refresh, share, `Cmd+click`, and back-button — none of which the student notices until a designer or a teammate flags it. The concept fixes the reflex by naming the four affordances `useState` quietly costs.

**Ideal teaching artifact.** A side-by-side regression replica (Decision archetype). Two columns, same UI: the left column's "New invoice" button is a `useState` modal; the right column's is a `<Link>` to an intercepted route. Above each column, four affordance checkboxes — *shareable URL, refresh-survives, `Cmd+click`-new-tab, back-button-closes*. The student clicks each affordance in turn on both columns and watches which boxes light up. The left column scores zero out of four; the right column scores four out of four. The reveal isn't the score — it's that none of the four affordances showed up in the JSX the student would have written.

**Engagement.** After the artifact, a single multiple-choice: *"A teammate's PR ships a modal with `useState`. Which of these failure modes does it cost?"* with all four affordances as correct selections, forcing multi-select.

**Components.**
- Existing: `TabbedContent` (the two columns), `MultipleChoice` (the follow-up). The affordance-checkbox grid above each column is bespoke but single-use here — render it as a hand-SVG inside `Figure` showing four labeled boxes, ticked or empty, per column. The two `Figure`s sit inside `TabbedContent`'s panels.
- Alternative: a fuller `AffordanceCheckGrid` widget could animate the boxes ticking live as the student clicks — proposed below but demoted, since the static SVG carries the teaching.

**Project link.** This concept is the senior-mindset payoff the project brief (5.7.1) names. The modal in 5.7.4 is the concrete win.

---

## Concept 2 — Parallel slots as named props on a layout

**Why it's hard.** A slot folder named `@list` looks like routing, but its mental model is *props on the surrounding `layout.tsx`*. The student who carries the "every folder is a URL segment" model from 5.1.1 reaches `@list` and asks "what URL does this slot live at?" — wrong question. The right question is "which layout receives this slot, and where in that layout does it render?"

**Ideal teaching artifact.** A two-pane anatomy diagram (Concept archetype). Left pane: the `app/invoices/` file tree with `@list/` and `@detail/` highlighted. Right pane: the `layout.tsx` source with the `list` and `detail` parameters highlighted, and arrows drawn from each `@slot/` folder to its corresponding parameter in the layout's function signature. A third arrow goes from `children` to the `{children}` JSX slot. The student sees, in one frame, that `@list` is a folder *and* a prop name *and* a JSX slot — three views of the same binding.

**Engagement.** A `Matching` exercise pairing four slot folders (`@list`, `@detail`, `@modal`, `children`) to four layout signature pieces (`list:`, `detail:`, `modal:`, `{children}`).

**Components.**
- Existing: `Figure` wrapping the file tree (`FileTree`) on one side and an `ArrowDiagram` or hand-SVG on the other. `Matching` for the recall round.
- The three-arrow binding view is single-use for this concept — hand-SVG inside `Figure` is the right call.

**Project link.** The provided `layout.tsx` in 5.7.2 is the artifact the diagram annotates; the student reads it with the binding model already installed.

---

## Concept 3 — `default.tsx` as the unmatched-slot contract

**Why it's hard.** The failure mode is silent: skip `@list/default.tsx`, click an invoice, and the URL `/invoices/inv_017` 404s — but the matched slot (`@detail/[id]`) renders fine in isolation. The student blames the detail route, not the list slot's missing fallback. The misconception is "if a slot has no matching segment under this URL, it just renders nothing" — the truth is "it 404s the whole route."

**Ideal teaching artifact.** A misconception-first router simulator (new archetype: Router-state simulator). The student picks a URL — `/invoices`, `/invoices/inv_017`, `/invoices/new` — and a navigation mode — *soft nav, hard refresh, `Cmd+click`, JS-disabled*. The widget shows which segment file *matches* for each slot (`page.tsx`, `[id]/page.tsx`, or unmatched), then renders the layout with the resolved slot contents — or a red 404 banner when a slot is unmatched and no `default.tsx` exists. A toggle at the top deletes `@list/default.tsx` from the simulated tree; the student watches `/invoices/inv_017` flip from "renders" to "404" with the toggle. The widget carries the load-bearing intuition that `default.tsx` is *not* a UX choice but a routing prerequisite.

**Engagement.** The simulator's toggle *is* the assessment — the student must produce the 404 by toggling off the fallback. Follow with a one-question `TrueFalse`: *"`@detail/default.tsx` rendering an empty-state is the same kind of file as `@list/default.tsx` rendering the same content as `page.tsx`."* (False — same file convention, different responsibility.)

**Components.**
- New: `RouterSlotSimulator` (sketched below). Inputs: a slot-tree spec, a URL list, a navigation-mode list. Renders the resolved layout per choice, with a "delete default.tsx" toggle.
- Existing fallback if the simulator slips: a `DiagramSequence` scrubbing through six frames (URL × default-present/absent matrix), with the resolved layout rendered as static markup per frame. Acceptable but loses the toggle-causation moment.

**Project link.** The empty `@detail/default.tsx` and the list-mirroring `@list/default.tsx` in 5.7.3 are the two shapes the simulator distinguishes.

---

## Concept 4 — Server-side `searchParams` with Zod at the boundary

**Why it's hard.** Two failure modes compound. First, `searchParams` is a Promise in Next.js 16 — students who carry the Next.js 14 mental model don't `await` it and get a phantom-undefined bug. Second, the URL is an untrusted string surface: `?status=banana` should fall back to "all," not crash. Without the Zod parse, the student writes `getInvoices({ status: searchParams.status })` and the query throws.

**Ideal teaching artifact.** A wrong-by-default code walkthrough (Pattern archetype). Show the naive version: `const status = searchParams.status; const invoices = await getInvoices({ status })`. Two annotations: one points at `searchParams.status` and says *"Promise — this is `undefined.status`"*; the second points at `{ status }` and says *"`'banana'` is not in `InvoiceStatus`."* Then show the senior version: `await` then `searchParamsSchema.safeParse(…)` then `result.success ? result.data.status : undefined`. Three highlighted changes, each tied to one of the two failure modes plus the graceful-fallback decision.

**Engagement.** A `PredictOutput` drill: given `/invoices?status=paid`, `/invoices?status=banana`, `/invoices`, and `/invoices?status=paid&status=draft` (array case), the student picks what the parsed `status` value resolves to before the reveal.

**Components.**
- Existing: `CodeVariants` for the naive-vs-senior split, `AnnotatedCode` if the senior version needs the three-change walkthrough at the call site. `PredictOutput` for the recall round.
- No new component.

**Project link.** This is the exact shape `@list/page.tsx` ships in 5.7.3. The `searchParamsSchema` in `/lib` is the seam Unit 7 reuses for FormData.

---

## Concept 5 — Intercepting route + non-intercepting twin as a paired contract

**Why it's hard.** The intercepting route looks like the feature. The non-intercepting twin looks like duplication the student wants to delete. The misconception is "the `(.)new` page *is* the new-invoice page" — the truth is that `(.)new` only renders on soft nav, and direct visits, refreshes, and `Cmd+click` need a real `new/page.tsx` to land on. Skipping the twin breaks three out of four entry paths and only the soft-nav demo works.

**Ideal teaching artifact.** A two-beat sequence (Pattern archetype). Beat one: the router-state simulator from Concept 3, reused with the "intercept vs. twin" toggle exposed. The student picks `/invoices/new` and toggles each of {twin only, intercept only, both} against each of {soft nav, refresh, `Cmd+click`, direct visit}. The 4×3 matrix lights up the truth: only "both" passes all four entries. Beat two: a side-by-side of the two `page.tsx` files — `(.)new/page.tsx` wrapping `<InvoiceForm>` in `<Dialog>`, and `new/page.tsx` rendering it bare — with the shared `<InvoiceForm>` factored out as the visual anchor of "same form, two shells."

**Engagement.** A `Buckets` drill: cards naming entry paths (*"user clicks New invoice from /invoices,"* *"user reloads /invoices/new,"* *"user `Cmd+clicks` the New invoice link,"* *"user pastes /invoices/new into a fresh tab,"* *"someone shares the URL in Slack"*) sorted into the bucket *"hits the intercept"* vs. *"hits the twin."*

**Components.**
- Reuses: `RouterSlotSimulator` (new — same component as Concept 3).
- Existing: `CodeVariants` or `TabbedContent` for the side-by-side `page.tsx` view; `Buckets` for the recall round.

**Project link.** 5.7.4 builds both files. The lesson sequence — twin first, intercept second — is the order the artifact justifies.

---

## Concept 6 — Closing the modal is navigation, not state

**Why it's hard.** Shadcn's `<Dialog>` exposes `onOpenChange(open)` — the obvious reflex is `setOpen(false)`. But the modal *has a URL*, and `setOpen(false)` leaves that URL intact: the dialog vanishes, the URL still reads `/invoices/new`, the back button now does the wrong thing, and the next refresh resurrects the modal-as-full-page. The senior shape is `onOpenChange={(open) => !open && router.back()}`.

**Ideal teaching artifact.** A time-travel widget showing the browser history stack alongside the rendered UI (Concept archetype). Two rows: top row shows the history-stack entries as colored tiles (`/invoices`, `/invoices/new`); bottom row shows the rendered viewport. The student opens the modal — a new tile appears in the stack — then closes it via two buttons: *"setOpen(false)"* and *"router.back()"*. The first leaves the stack at `/invoices/new` but hides the dialog; the second pops the tile back to `/invoices`. The student sees, in the stack visualization, why one is a lie.

**Engagement.** A `TrueFalse` round of four: *"`setOpen(false)` updates the URL"* (F), *"`router.back()` updates the URL"* (T), *"The browser back button after `setOpen(false)` returns to /invoices"* (F — it returns to wherever before /invoices/new), *"The modal's `onOpenChange` is a good place to call `router.back()`"* (T).

**Components.**
- New: `HistoryStackTimeline` could render the stack tiles + viewport. But this concept is single-use in this chapter and forward-link is weak (Unit 11 deals with `nuqs` state, not history-stack visualization). Per the single-use discipline, demote to a hand-SVG inside `Figure` showing two before/after frames (close via `setOpen` vs. close via `router.back()`) with the stack drawn as a vertical pill list.
- Existing: `Figure` + hand-SVG + `TabbedContent` for the two close strategies; `TrueFalse` for the recall round.

**Project link.** 5.7.4 wires the close handler. The lesson explicitly picks `router.back()` and the artifact is the why.

---

## Concept 7 — `loading.tsx` installs the segment-level Suspense boundary

**Why it's hard.** Streaming in App Router looks invisible: the student writes async Server Components and *something* streams, but they can't see *what*, *when*, or *which boundary*. They reach for explicit `<Suspense>` because they understand it from React 18 — but Next.js's `loading.tsx` file convention is the file-system-level boundary that does the same job at segment granularity, and the two coexist. The student doesn't know which one to reach for.

**Ideal teaching artifact.** Two artifacts, both needed. First, a Network-throttled scrubbable demo (Concept archetype): a timeline scrubber from 0 ms to 1500 ms with three lanes — *@list lane, @detail lane, viewport*. As the scrubber moves, each lane shows its current state (skeleton vs. resolved content), and the viewport composites them. Without `loading.tsx` files installed, both lanes wait for the slower one before flushing. With them installed, each lane resolves and paints independently. A toggle adds or removes `loading.tsx` per slot. Second, a decision card (Decision archetype) naming the threshold: file convention (`loading.tsx`) for segment-level skeletons; explicit `<Suspense>` for sub-segment-level granularity (a slow related-invoices panel inside the detail page).

**Engagement.** A `Sequence` drill ordering five events: *request hits Server Component → shell flushes with skeletons → @list query resolves → @list streams in → @detail query resolves → @detail streams in*. After the sort, a one-question `MultipleChoice`: *"You need a skeleton for one slow panel inside an otherwise fast page. Reach for…"* (a) another `loading.tsx`, (b) explicit `<Suspense>`, (c) a client-side spinner, (d) `await Promise.all`. Correct: b.

**Components.**
- New: `StreamingTimeline` (sketched below). Inputs: a list of lanes with resolution times, an overall scrubber, and per-lane Suspense-boundary toggles. Renders the composited viewport at the scrubbed time. Forward-link to 5.3.1/5.3.2 (which also teach streaming) and Unit 11 (production list with streaming pagination).
- Existing: `Figure` for the decision-card threshold; `Sequence` + `MultipleChoice` for recall.

**Project link.** 5.7.5 wires `@list/loading.tsx` and `@detail/[id]/loading.tsx`. The timeline is the visualization of the throttled-network verify step the lesson asks the student to run.

---

## Concept 8 — Verify as rehearsing failure modes

**Why it's hard.** Students treat "Done when" as a checklist — green tick, move on. The senior move is the inverse: each verification step *is* a rehearsal of the failure mode the corresponding fix prevents, and the student should be able to name what would break without the fix. A student who refreshes `/invoices?status=paid` and shrugs at the persistent filter has missed the lesson; a student who can say *"this would have been blown away by `useState`"* has it.

**Ideal teaching artifact.** A guided puzzle (Pattern archetype, assessment-shaped). For each Done-when clause, the lesson presents a matching pair: *the verification step* on the left, *the failure mode it would expose if the fix were absent* on the right. The student matches them. The pairing is the recall: refresh-with-filter ↔ would have broken if filter lived in `useState`; `Cmd+click`-detail ↔ would have broken if the detail were a click handler instead of a `<Link>`; JS-disabled-renders ↔ would have broken if data fetching lived in a `useEffect`; modal-on-refresh-falls-through ↔ would have broken without the non-intercepting twin.

**Engagement.** The puzzle *is* the assessment — `Matching` carries it directly. Follow with a single `TextAnswer` prompt: *"In one sentence, name the App Router primitive that bought each of the four Done-when affordances you just verified."*

**Components.**
- Existing: `Matching` for the puzzle; `TextAnswer` for the synthesis prompt.
- No new component.

**Project link.** This is the entire 5.7.6 lesson, reshaped from a walkthrough into an assessed rehearsal.

---

## Component proposals

- **`RouterSlotSimulator`** — interactive simulator for a parallel-route layout under varying URLs and navigation modes.
  - One-line sketch: takes a slot-tree spec (`{ children, @list, @detail, (.)new }`), a URL list, and a navigation-mode list (soft, refresh, `Cmd+click`, JS-off); renders the resolved layout per pick with a 404 banner when a slot is unmatched and a "delete this file" toggle that flips fallbacks on and off.
  - Uses in this chapter: Concepts 3 and 5.
  - Forward-links: Unit 11 (production list with URL-state pagination and sort), 5.1.5 and 5.1.6 (the underlying chapters could reuse it to introduce parallel/intercepting routes the first time, replacing static diagrams). Strong reuse.
  - Leanest v1: a 3×4 static matrix of pre-rendered frames (URL × navigation-mode), no live tree edit, the "delete default.tsx" toggle as a second matrix-pair the student switches between. Still teaches Concepts 3 and 5; loses the cause-and-effect feel of toggling a file off.

- **`StreamingTimeline`** — scrubbable timeline showing per-lane Suspense resolution against a composited viewport.
  - One-line sketch: takes a list of lanes (each with a resolution-time and an optional Suspense-boundary flag), a network-throttle multiplier, and a scrubber; renders the viewport at the scrubbed time composited from each lane's state.
  - Uses in this chapter: Concept 7.
  - Forward-links: 5.3.1 (Suspense fallback contract), 5.3.2 (streaming a page in chunks), Unit 11 (production streaming pagination). Strong reuse — this is the canonical streaming visualization across three chapters.
  - Leanest v1: a static three-frame sequence in a `DiagramSequence` (t=0 ms shell flush, t=600 ms list resolved, t=1200 ms detail resolved) with no scrubber. Still teaches the independence; loses the comparison-with-vs-without-boundary toggle.

- **`AffordanceCheckGrid`** *(demoted)* — animated four-affordance checklist beside a UI demo. Single-use here; no credible forward-link beyond this chapter. Replaced by a hand-SVG inside `Figure` in Concept 1.

- **`HistoryStackTimeline`** *(demoted)* — browser-history-stack visualization with rendered viewport. Single-use; no credible forward-link. Replaced by a static hand-SVG in Concept 6.

## Build priority

`RouterSlotSimulator` is the highest-leverage build. It carries two concepts in this chapter (3 and 5) and back-fills two earlier routing-concept chapters (5.1.5, 5.1.6) plus the Unit 11 production-list project. The parallel/intercepting routing model is exactly the kind of file-convention abstraction that resists static-diagram teaching — a simulator turns "trust me, this is how the matcher resolves" into "show me, then I'll believe it."

`StreamingTimeline` is the second priority. It's the canonical visualization for three streaming chapters (5.3.1, 5.3.2, 5.7.5) plus Unit 11. The leanest v1 (a `DiagramSequence` of three frames) is much thinner than the full scrubber and might pass the teaching bar for 5.7.5 alone, but loses the cross-chapter reuse — if the component lands in 5.3.1 first, the full scrubber pays for itself.

The two demoted components (`AffordanceCheckGrid`, `HistoryStackTimeline`) are correctly demoted — single-use, no forward-link, the static `Figure`-wrapped SVG carries the teaching.

## Open pedagogical questions

- The router simulator's "JS-off" mode is honest about progressive enhancement but adds a fourth axis to the matrix. Worth confirming whether the chapter wants JS-off as a first-class verification (the 5.7.6 lesson lists it) or as an aside — the simulator scope changes.
- Concept 8 reshapes 5.7.6 from "walk each verify step" into a `Matching` puzzle. That's a stronger assessment but a different lesson flow than the outline suggests. Confirm whether the verify lesson is open to the puzzle reshape or should stay as a walkthrough.
