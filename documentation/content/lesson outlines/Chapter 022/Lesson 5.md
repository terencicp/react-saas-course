# Portals and the layout escape

**Title (h1):** Portals and the layout escape
**Sidebar label:** Portals

---

## Lesson framing

This is the closing lesson of Ch 022 — the chapter that turned the student from element-writer to component-author. Lessons 1–4 built the running `<Button>`/`<Input>`/`<Card>` spine (typed props, `children`, `cva`+`Slot`, ref-as-prop). This lesson adds the **last piece of the 2026 component API surface**: `createPortal`, the one sanctioned escape hatch from where a component's DOM renders. Everything here is the machinery under shadcn's `Dialog`, `Sheet`, `Popover`, `Tooltip`, `Sonner` — the student is learning to *read* those, not to ship a hand-rolled modal to production.

**The senior spine of the lesson.** A portal solves exactly one problem: a component sits at the right place in the React *tree* but needs its DOM somewhere else (usually `<body>`) to escape an ancestor's `overflow`/stacking-context/containing-block trap. The entire lesson is organized around that one sentence — first the trap (concrete, reproducible, from Ch 020 L9), then the escape (`createPortal`), then the surprise that the escape is **DOM-only** (React tree intact: context, state, events all flow as if the portal weren't there), then the responsibilities the platform stops handing you for free once you overlay the page (the accessible-modal contract), then the 2026 platform alternatives (native `<dialog>`, CSS anchor positioning) that are quietly retiring portions of this work.

**What "senior" looks like here, and the load-bearing teaching decisions:**
- **Lead with the bug, not the API.** `createPortal` is trivial as an API (two args). The hard, durable knowledge is *when* and *why*. Open every major section with the failure that motivates it. The Ch 020 L9 stacking-context trap is the canonical opener and should be shown as real, reproducible CSS — a `transform` on an ancestor breaking `position: fixed`.
- **The "DOM moves, React doesn't" duality is the central mental model** and the #1 thing beginners get wrong. They assume a portal detaches the subtree entirely. It does not: events bubble through the *React* tree, context flows down, state lives where it was declared. This must be visualized (DOM tree vs React tree, side by side) and exercised (a `PredictOutput` on an `onClick` that fires from a portaled child).
- **Reframe portals as "you opted out of the platform's safety net."** Browsers give you focus order, scroll, and `Esc` for free in normal flow. The moment you overlay the page you inherit a checklist (the WAI-ARIA APG modal contract) the platform used to handle. This is the senior reframing that makes the accessibility section land as *consequence*, not as a tacked-on rules list.
- **Recognition, not reimplementation.** The lesson's repeated refrain: "you will `import { Dialog } from '@/components/ui/dialog'`, not write this." The hand-rolled portal is shown to *understand* the primitive; the accessible-modal contract and scroll-lock are named as checklists that shadcn/Radix already satisfy. The from-scratch focus trap + scroll lock are explicitly the **project chapter's** job (Ch 028 L8) — do not build them here.
- **"Defaults before conditionals; trigger before tool"** (pedagogy filter). Portals are a conditional power tool. Name the threshold the *default* (rendering in place) crosses: only reach for a portal when an ancestor's overflow/transform/z-index actually traps the overlay. A toast or modal that *isn't* trapped doesn't strictly need a portal — but in practice page-level overlays almost always are trapped, which is why the pattern is near-universal for them.
- **The SSR guard is a 2026-specific gotcha**, not an afterthought. `document` doesn't exist on the server; `createPortal(<X/>, document.body)` crashes the render in a Next.js Server Component context. The student already knows `'use client'` is coming (Ch 030) — here it's named as the boundary, with the mount-flag pattern shown as the mechanism. Keep this tight: name it, show the canonical guard, point at shadcn handling it internally.

**Prerequisites the student already holds (redefine in one clause, don't reteach):** stacking contexts / `z-index` / containing blocks created by `transform` (Ch 020 L9); `position: fixed`/`absolute` (Ch 020); `data-state="open/closed"` entrance/exit animation pattern + `tw-animate-css` (Ch 021 L5); `cn()` (Ch 018 L3); ref-as-prop and `Slot` forwarding refs (this chapter L3/L4); `children: ReactNode` and composition (this chapter L2). `useState`/`useEffect` are **not yet taught** (Ch 024 L1 / Ch 025 L2) — the mount-flag guard *uses* them, so present it as a recognized idiom to read (one annotated block, with a `Term` pointing forward), not a hook lesson. The render model is held off to Ch 023 — say "the component renders" and never "re-renders/memo."

**Tone:** terse, adult, decisions-first. No "what is a modal." Heavy use of "the senior reach is…", "the trap is…", "you read this, you don't write it."

**Cuts from the chapter outline brainstorm** (justified):
- `@floating-ui/react` API — recognition-only one-liner; shadcn wraps it. Don't teach positioning math.
- iOS body-scroll `position: fixed` preservation detail — name it exists in one watch-out clause; the real implementation is Ch 028 L8.
- Named portal-root vs `document.body` for CSS-variable inheritance — compress to a two-sentence aside; `<body>` is the daily reach and `.dark` on `<html>` already covers `<body>`-attached portals.
- `isolation: isolate` as an alternative fix — one clause in the trap section (it fixes z-index traps, not containing-block traps, so it's *not* a substitute for the portal). Don't over-develop.
- The `popover` HTML attribute / `<button popovertarget>` — one-line mention alongside anchor positioning as the platform companion.

---

## Lesson sections

### Introduction (no header)

Warm, brief, problem-first. The student has spent four lessons building components that render *where you put them*. Open with the concrete wall: you built a `<Card>` with a hover-lift `transform` (callback to Ch 020 L9 / Ch 021), drop a "Delete account?" confirmation dialog inside it, give the dialog `position: fixed inset-0` to cover the screen — and it doesn't. It's trapped inside the card, clipped by the card's `overflow`, sized against the card instead of the viewport. State the thesis in one line: a component can be in the right place in your *code* and the wrong place in the *DOM* — and the fix is a portal. Preview the arc: the trap → `createPortal` → why the React tree is untouched → the responsibilities you inherit when you overlay the page → the platform features quietly replacing the manual work. End by naming the payoff: by the end you'll read shadcn's `Dialog`/`Sheet`/`Popover`/`Sonner` and know exactly what every line is doing.

### The layout trap that portals exist to solve

**Goal:** make the problem visceral and reproducible before the API appears. This is the "senior question" section.

Content:
- Recall in one clause: certain CSS properties on an ancestor (`transform`, `filter`, `perspective`, `will-change`, `contain`) create a **containing block** for `position: fixed` descendants — `fixed` then resolves against *that ancestor*, not the viewport (Ch 020 L9 fact, stated, not reproven). Separately, `overflow: hidden`/`auto` on an ancestor **clips** descendants, and a low-`z-index` stacking context can **bury** an overlay under sibling content.
- Show the bug as real CSS. A `<div class="card">` with `transform: translateY(-2px)` (the hover-lift) wrapping a `<div class="dialog">` with `fixed inset-0`. Result: dialog confined to the card's box, clipped, mis-sized. This is the spine example for the whole lesson.
- Name the three traps that all share one fix: (1) **containing-block trap** (`transform` ancestor breaks `fixed`), (2) **overflow clip** (scrollable table clips a dropdown), (3) **stacking-context burial** (`z-index` can't win against a sibling context). Frame: you can sometimes patch each individually (raise z-index, `isolation: isolate` for the burial case, restructure the DOM) — but `isolation` does nothing for the containing-block trap, and restructuring fights your component boundaries. The one fix that escapes *all three at once* is to render the overlay's DOM outside the trapping subtree entirely.
- Land the senior framing: **the component belongs in the tree where you wrote it (that's where its props, state, and event handlers live); only its DOM needs to move.** That sentence is the bridge to `createPortal`.

**Diagram (HTML+CSS, inside `<Figure>`):** "The trap" — a small mocked nested-box illustration. An outer card box (tinted, labeled `transform: translateY` / `overflow: hidden`), a dialog box drawn *clipped inside it and mis-sized*, with the viewport edges drawn around the whole thing so the reader sees the dialog failing to reach them. Pedagogical goal: the reader sees the dialog imprisoned by the card before reading why. Real CSS so it's devtools-inspectable (per html-css diagram guidance). Caption names `transform` as the containing-block culprit.

**Exercise — `ReactCoding` (target-match, `live`):** Give the student the trapped setup (card with `transform`, dialog `fixed inset-0` nested inside) and a `target` showing the dialog correctly covering the viewport. Let them *try* to fix it with CSS alone (raise z-index, etc.) and discover they can't — the instructions hint "you'll need more than CSS." This primes the portal reveal. Keep it short; the point is the frustration, resolved in the next section. (If a clean target-match proves finicky given iframe sizing, downgrade to a static `CodeVariants` before/after — but attempt the interactive version first, it earns the reveal.)

`Term` candidates in this section: **containing block** (def: the rectangle a positioned element's offsets resolve against; a `transform`/`filter`/etc. ancestor becomes one for `fixed` descendants). **stacking context** (brief: a self-contained z-index layer; children can't escape its z-order — recall from Ch 020 L9).

### `createPortal` — rendering into a different part of the DOM

**Goal:** the API, minimally, framed as the resolution of the trap.

Content:
- The API: `import { createPortal } from 'react-dom'` (note: `react-dom`, not `react` — a common slip). `createPortal(children, domNode, key?)` returns something renderable you return from your component. `createPortal(<DialogContent/>, document.body)` renders the content's DOM as a child of `<body>` while the component stays exactly where it is in the React tree.
- Resolve the spine example: the dialog now reaches the viewport, no longer clipped, no longer mis-sized — because its DOM ancestor chain is now `<body>`, with no `transform` ancestor in the way. Reinforce: `position: fixed` inside a portal works against the viewport again precisely because the trapping ancestor is gone from the *DOM* path.
- The second argument — the portal target. `document.body` is the daily reach for modals and toasts. Two-sentence aside on the named-root alternative (`<div id="portal-root">` in the root layout) for projects that want portal content under a specific ancestor for CSS-variable/theme inheritance; note `.dark` on `<html>` already reaches `<body>`-attached portals, so most SaaS projects just use `<body>`. Don't over-develop.
- The optional third arg (`key`) — one clause: a stable key when you render a list of portals to the same container; rarely needed for a single modal. (Foreshadow keys → Ch 023, don't explain reconciliation.)
- Watch-out inline: a target that doesn't resolve (`document.getElementById('nope')` → `null`) makes `createPortal` throw. Default to `document.body` or guarantee the node exists.

**Code presentation — `AnnotatedCode`** (one block, `tsx`, blue marks, ≤14 lines): a minimal `Modal` component built on `createPortal`, marking up the trap-escape. Steps: (1) the function signature taking `children` + an `onClose`; (2) the backdrop + panel JSX with `fixed inset-0`; (3) the `createPortal(…, document.body)` wrapper as the line that does the escaping; (4) `import { createPortal } from 'react-dom'` (call out the package). Keep it deliberately incomplete (no a11y yet) — that's the hook for the contract section. Use `cn()` for class composition per conventions; arrow-bound-to-`const` component; kebab-case file (`modal.tsx`) noted once.

### Portals escape the DOM, not React

**Goal:** install the central mental model and defuse the #1 misconception.

Content:
- The duality stated up front, bold: **the DOM node moves; the React tree does not.** A portaled component is still, for every purpose React cares about, a child of the component that rendered it.
- Three consequences, each as a beat:
  1. **Context flows through.** A theme/auth context provider above the portal in the tree still reaches the portaled content, even though its DOM lives under `<body>`. (Context is Ch 025 L5 — name it, don't teach it; one clause.)
  2. **State lives where it's declared.** The portal doesn't create a new component scope; `useState` in the parent still drives the portaled UI. (useState → Ch 024; recognition framing.)
  3. **Events bubble through the *React* tree, not the DOM tree.** This is the surprise. A `<div onClick={…}>` that *renders* a portaled `<Tooltip>` as a child will receive clicks on that tooltip — even though, in the DOM, the tooltip is a sibling of the div under `<body>`. React replays the synthetic event along the tree it knows, not the DOM. State the design intent: this is deliberate — it keeps event delegation predictable regardless of where the DOM landed. State the gotcha consequence: a "click outside to close" handler on a parent can fire from clicks *inside* a portaled menu; the fix is `e.stopPropagation()` in the portal or hanging the listener on `document`.

**Diagram (`TabbedContent`, two panels, each an HTML+CSS tree drawing inside the tabbed card):** the same app shown as **DOM tree** (portal content reparented under `<body>`, far from its trigger) vs **React tree** (portal content still nested under its parent component). Pedagogical goal: the reader literally sees the same node in two different places depending on which tree you're looking at — the whole "DOM moves, React doesn't" idea in one toggle. Color-match the portaled node across both panels (same tint) so the eye tracks it. (Could also be an `ArrowDiagram` with a single arrow "same component, two homes," but the side-by-side tree contrast is cleaner; prefer `TabbedContent`.)

**Exercise — `PredictOutput`:** a tiny program where a parent `<div onClick={() => log('parent clicked')}>` renders a portaled button that logs `'button clicked'`; clicking the button. Expected output shows *both* lines (button then parent) — proving events bubble through the React tree despite the DOM gap. `PredictWhy` explains the React-tree-not-DOM-tree rule. This is the highest-value check in the lesson; it directly targets the misconception.

### The responsibilities you inherit when you cover the page

**Goal:** reframe accessibility as the consequence of opting out of normal flow, then present the modal contract as a checklist the student must *recognize* (shadcn satisfies it).

Content:
- The reframe (lead with it): in normal document flow the browser hands you focus order, scroll, and `Esc`/back behavior for free. The moment you portal an overlay on top of the page, you've stepped outside that net — and an overlay that traps a keyboard or screen-reader user is broken, not just imperfect. So a portal *implies* a contract.
- Present the **WAI-ARIA APG modal-dialog contract** as a tight checklist (use Starlight `<Steps>` or a `Checklist` for scannability):
  1. `role="dialog"` + `aria-modal="true"`.
  2. `aria-labelledby` → the title id; `aria-describedby` → the description id.
  3. Move focus *into* the dialog on open.
  4. **Trap** focus inside while open (Tab cycles within).
  5. Restore focus to the trigger on close.
  6. `Esc` closes.
  7. Backdrop click closes (skip for destructive/data-loss dialogs).
  8. **Lock body scroll** while open (the page behind must not scroll).
- For each, one clause on *why a user is harmed* if it's missing (e.g. no focus trap → keyboard user Tabs out into the frozen page behind; no scroll lock → the background scrolls under the modal, disorienting).
- Hard pivot to recognition: **you do not hand-build this.** shadcn's `Dialog` (Radix under the hood) ships every one of these. The student's job is to know the checklist so they can *audit* a modal, not to reimplement focus-trapping. Explicitly: the from-scratch focus trap + `useLockBodyScroll` are built in the **project chapter (Ch 028 L8)** from primitives — pointer-forward, not now.
- Scroll-lock mechanics named, not built: set `overflow: hidden` on `<body>` while open; on iOS you additionally have to pin scroll position (`position: fixed` + restore `scrollY`) or the page jumps to top — one watch-out clause, depth deferred to Ch 028 L8.

`Term` candidates: **WAI-ARIA APG** (def: the W3C Authoring Practices Guide — the canonical patterns + keyboard/focus expectations for accessible widgets). **focus trap** (def: keeping Tab/Shift-Tab cycling within the open dialog so keyboard focus can't reach the page behind it).

**Exercise — `MultipleChoice` or `TrueFalse` (small):** present a stripped modal missing two contract items (say, no focus trap + no `Esc`) and ask which accessibility guarantees it breaks / what a keyboard user experiences. Reinforces the checklist as an audit tool. Optional — include only if it doesn't bloat the section; the checklist itself is the core deliverable.

### The three places portals earn their keep

**Goal:** consolidate the canonical reaches and name the production libraries (read, don't write).

Subsections as `###` or a tight `CardGrid` — three reaches:

1. **Modals and dialogs** — overlay the whole page regardless of ancestor traps. The spine example generalizes here. Production: shadcn `Dialog`/`AlertDialog`/`Sheet`. Recognition only.
2. **Toasts** — a container portaled to `<body>`, each toast `position: fixed` to a viewport corner, stacking with `gap`, auto-dismissing, entrance/exit via the `data-state` + `tw-animate-css` pattern (callback Ch 021 L5). Production: **`sonner`** is the 2026 shadcn default (the old shadcn `Toast`/Radix toast is deprecated in favor of it — fact-checked June 2026). Student adds `<Toaster />` to the root layout and calls `toast(...)`; reads, doesn't reimplement. Note: a toast container on `<body>` survives route changes (good for cross-route notifications); per-page targets reset on navigation.
3. **Anchored popovers / dropdowns / tooltips** — must escape parent `overflow` *and* track the trigger's position while scrolling. `position: absolute` inside the trigger dies to `overflow: hidden`; `position: fixed` + portal escapes overflow but then needs JS to follow the trigger on scroll. Two production answers, recognition-only: (a) `@floating-ui/react` (Radix's positioning dependency) for collision-detection/flip in JS; (b) **CSS anchor positioning** (Baseline 2026 — `anchor-name`, `position-anchor`, `position-area`, `@position-try`) which retires the JS entirely when trigger + popover share a layout root. One-line companion mention: the `popover` attribute + `<button popovertarget>` as the platform pairing. Forward-ref both to Ch 027 for the shadcn surface.

**Diagram (optional, `Figure` + HTML/CSS):** a single horizontal strip of three tiny viewport mockups — modal (centered overlay), toast (corner stack), popover (anchored to a button) — each labeled with its portal target/positioning. Pedagogical goal: one glance that fixes the three canonical shapes in memory. Keep it small (vertical-space budget); skip if the `CardGrid` already carries it.

### The platform is catching up: native `<dialog>` and anchor positioning

**Goal:** the "alternatives, and when to pick them" section — senior judgment, and avoids teaching a portal as the *only* answer.

Content:
- **Native `<dialog>` + `showModal()`** — Baseline since 2022, ~97% support in 2026 (fact-checked). `dialog.showModal()` renders the dialog in the browser's **top layer** — above *every* stacking context, no portal, no z-index management, no containing-block trap — and gives you `Esc`-to-close and a built-in focus trap for free. The `::backdrop` pseudo-element styles the scrim. This is the platform doing, natively, most of what the portal + manual a11y dance does by hand.
- The senior call (decision, not dogma): reach for native `<dialog>` when you want platform behavior and standard styling is fine; reach for Radix/shadcn `Dialog` (portal + managed focus) when you need **animated entrance/exit choreography**, custom backdrop interaction, or the controlled `open` state wired to your app — Radix keeps the DOM mounted through the exit transition via `data-state`, which raw `<dialog>` doesn't choreograph for you. Name that shadcn's `Dialog` is the project's daily reach; native `<dialog>` is the lean alternative worth knowing.
- **CSS anchor positioning** (Baseline 2026, fact-checked: Chrome 125+, Firefox 132+, Safari 18.2+) — the platform answer to the popover-tracking problem: `anchor-name` on the trigger, `position-anchor`/`position-area` on the popover, `@position-try` for flip-on-collision — no JS to follow the trigger. Pair with the top layer (`popover` attribute) and a popover never gets clipped *and* needs no portal. Recognition-only; depth is Ch 027.
- Synthesize the trajectory (the durable takeaway): portals + manual focus/scroll management were the workaround for a platform that lacked a top layer and anchored positioning. In 2026 the platform is closing that gap — `<dialog>`'s top layer kills the stacking/containing-block trap, anchor positioning kills the JS popover math. Portals remain essential for the cases the platform doesn't yet cover (arbitrary portaled content, animated overlays, framework-controlled state), and they're still what shadcn ships — but the senior reads new code knowing which problems are now the browser's job.

**Diagram (`TabbedContent`, two panels):** "Stacking contexts vs the top layer." Panel A: a normal element fighting for z-index inside nested stacking contexts (an overlay buried). Panel B: the same overlay promoted to the top layer (`<dialog open>` / `popover`) floating cleanly above everything, no z-index. HTML+CSS, real stacking so it's inspectable. Pedagogical goal: show *why* the top layer makes z-index management obsolete for overlays — the single clearest argument for native `<dialog>`. (This is the most valuable optional diagram; prioritize it over the three-shapes strip if budget forces a choice.)

`Term` candidates: **top layer** (def: a browser-managed layer that renders above the entire page regardless of z-index or stacking context; `<dialog>.showModal()` and popovers render here). **`::backdrop`** (def: the pseudo-element for the scrim behind a top-layer element).

### External resources (LinkCards / `ExternalResource` in a `CardGrid`)

- React docs — `createPortal` (`react.dev/reference/react-dom/createPortal`), icon `simple-icons:react`.
- MDN — `<dialog>` element.
- WAI-ARIA APG — Dialog (Modal) pattern (the authoritative contract).
- MDN — Using CSS anchor positioning.
- shadcn — `Dialog` and `Sonner` docs (so the student can jump straight to the surface they'll actually use).

Optionally a `VideoCallout` if a recent (≤ a few months old, 2026) focused explainer on the native `<dialog>` top layer or CSS anchor positioning is found during authoring — a good 5-10 min visual on the top layer would reinforce the stacking-context diagram. Author's discretion; only embed if it's genuinely on-point and current. Do not embed a generic "React portals tutorial" — the lesson's framing is sharper than typical tutorials.

---

## Scope

**This lesson covers:** the layout traps (`transform` containing block, overflow clip, stacking burial) that motivate portals; `createPortal(children, container, key?)` and the `document.body`/named-root target choice; the "DOM moves, React tree doesn't" model (context, state, event-bubbling-through-the-React-tree); the SSR `document` guard (named, with the mount-flag idiom shown as recognition); the WAI-ARIA APG accessible-modal contract as an *audit checklist*; the three canonical reaches (modals, toasts, popovers) with their production libraries named for recognition (`sonner`, `@floating-ui/react`); and the 2026 platform alternatives (native `<dialog>` + top layer, CSS anchor positioning) with the senior decision rule for each.

**This lesson does NOT cover (and why):**
- **shadcn `Dialog`/`Sheet`/`Popover`/`Tooltip`/`Sonner` component surfaces** — Ch 027 owns the library. Here they're named as "what you'll import," never built.
- **From-scratch focus trap + `useLockBodyScroll`** — the **project chapter, Ch 028 L8** cashes these in from primitives. Named as checklist items, not implemented.
- **`useState`/`useEffect` proper** — Ch 024 L1 / Ch 025 L2. The mount-flag SSR guard *uses* them; present as a recognized idiom to read, with a forward `Term`, not a hook lesson. No effect-rules teaching.
- **`'use client'`/`'use server'` directives in depth** — Ch 030. Named as the client/server boundary the portal guard lives behind; one clause.
- **The render model (re-render, keys/reconciliation, memo)** — Ch 023. Say "the component renders"; the `key` third arg is named, reconciliation is not explained. The React Compiler auto-memoizes (conventions) so no `useCallback`/`useMemo` reflex appears.
- **CSS anchor positioning at depth / `@floating-ui/react` API** — Ch 027. Recognition-only here.
- **ARIA roles and live regions at depth** — Ch 027 L3. The modal contract is named; live regions (for toasts) are not detailed.
- **Stacking contexts / `z-index` / containing blocks from scratch** — Ch 020 L9 already taught them. Recalled in a clause, not reproven.
- **`data-state` entrance/exit animation + `tw-animate-css`** — Ch 021 L5 owns it. Referenced for the toast/exit-animation point, not retaught.
- **Intercepting routes / modal-as-URL** — Ch 029 L6. The "history-API modal" pattern is a different concept; not mentioned to avoid confusion.

---

## Notes for downstream agents (code conventions + continuity)

- **Continuity spine:** reuse the chapter's `<Card>`/`<Button>` where natural (the trapped-dialog opener pairs perfectly with the hover-lift `<Card>` from L2/Ch 021). The new component this lesson introduces is a minimal `<Modal>`/`<Dialog>` built on `createPortal` — keep it deliberately *incomplete on a11y* so the contract section has a target; do not pre-solve the focus trap.
- **Conventions (from Code conventions.md, relevant slice):** arrow function bound to `const` for components; **kebab-case filenames** (`modal.tsx` exports `Modal`); `children: ReactNode`; props default-destructured at the parameter; `cn()` with `className` **last**; `createPortal` imported from `react-dom`; `'use client'` at the top of any portal component file (named, since portals touch `document`); `import 'client-only'` worth a one-line mention for the `document`-touching module. The React Compiler handles memoization — no manual `useCallback` around handlers.
- **Deliberate divergences to flag in-text:** the hand-rolled `<Modal>` skips the full a11y contract on purpose (pedagogical staging — the contract section and Ch 028 L8 complete it). The mount-flag SSR guard uses `useState`/`useEffect` before they're formally taught — present as read-only recognition with a forward pointer.
- **Component usage recap:** `AnnotatedCode` for the `createPortal` walkthrough; `PredictOutput` for the event-bubbling check (highest-value); `ReactCoding` target-match for the trap-can't-be-fixed-with-CSS opener; `TabbedContent` for DOM-tree-vs-React-tree and stacking-context-vs-top-layer; HTML+CSS `<Figure>` for the trap illustration; `Steps`/`Checklist` for the modal contract; `CardGrid` for the three reaches; `ExternalResource` for the resource set; `Term` for the listed vocabulary. Every diagram wrapped per its component's rules (HTML/CSS figures in `<Figure>`; `TabbedContent`/`DiagramSequence` provide their own card — never double-wrap).
