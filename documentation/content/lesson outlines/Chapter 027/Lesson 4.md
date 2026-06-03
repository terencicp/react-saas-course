# Where focus belongs

- **Title (h1):** Where focus belongs
- **Sidebar label:** Focus management

## Lesson framing

This is lesson 4 of 5 in Chapter 027 (shadcn/ui and the accessibility baseline).
It closes the "focus is state" thread the chapter has been planting since L1.
The senior question driving the whole lesson: **where is focus right now, and where should it be?**
On a static multi-page site the browser answers this for free — every navigation resets focus to the top of the document.
In a SPA with dialogs, async submissions, and client-side route changes, *the engineer answers it*, and the platform does not warn you when you get it wrong because nothing visibly breaks for a mouse user.

The lesson is organized around the **three canonical situations** a SaaS engineer manages focus in, in increasing order of "the platform won't do this for you":
1. **Focus inside a modal** (a trap) — Radix already solves this; the job is to recognize the contract and not break it.
2. **Focus after a route change** (a reset) — Next.js App Router does *not* do this; this is the load-bearing custom pattern of the lesson.
3. **Focus after a submission** (move-or-stay, deliberately) — partly the route-change pattern, partly a new "move focus *and* announce" reflex that pairs with L3's live regions.

Pedagogical spine — **the dividend → the gap → the fix**, applied three times.
L1 and L2 established "the shadcn/Radix dividend": the primitive owns keyboard, focus, and ARIA for *its own surface*.
This lesson's recurring beat is finding the **edges of that dividend** — the page-level focus problems that live *between* primitives, where no Radix component is mounted to help.
That framing is what makes this a senior lesson and not a list of `tabindex` tricks: the student should leave able to *locate* where focus responsibility falls to them, not just memorize three snippets.

Target student: a junior from another field who can write a React component, has met `:focus-visible` (Ch 021 L4), `useId` (Ch 024 L6), and Radix compound components via shadcn (L1).
Where they struggle the first time: (a) they don't perceive the problem at all because they navigate with a mouse — the "unplug the mouse" reflex from L2 must be re-invoked here as the *detection* tool; (b) they reach to hand-build a focus trap (the canonical over-engineering mistake); (c) they over-correct and move focus on *every* state change, which steals screen-reader announcements (the opposite failure); (d) they confuse "make it focusable" (`tabindex`) with "move focus to it" (`.focus()`) — two different problems with two different tools.

Mental model the student should end with:
- **Focus is a single cursor the user navigates with.** There is exactly one. After any disruptive UI change (open, close, navigate, submit), ask: did the cursor land somewhere sensible, or is it stranded on an unmounted node / reset to `<body>` / lost?
- **DOM order is the law for Tab; CSS order is a lie.** Tab follows the DOM; visual reordering does not move it. The fix is always the DOM, never the CSS.
- **Two verbs, two tools.** `tabindex="-1"` makes a thing *targetable by script* (not by Tab). `element.focus({ preventScroll: true })` *moves the cursor there*. You almost always need both together for a non-interactive target like an `<h1>`.
- **Move focus and announce, or do neither.** A focus move that lands on an error the screen reader then reads is one coherent event. A focus move with nothing to say is disorienting.

Real production stakes to foreground (no moralizing — frame as a quality bar like security, consistent with L2): the route-change focus gap is the single most common SPA accessibility regression, it is invisible in a Lighthouse score (automated tools can't see it — reuse L2's "tools catch a minority" reflex), and it is exactly the kind of thing that surfaces in a procurement accessibility audit. The skip link is "small to implement, a differentiator on the audit."

Tone and depth: adult, terse, decisions-first (Pedagogical guidelines §2). No celebratory framing. Heavy reuse of established chapter vocabulary — do **not** redefine *focus trap*, *the shadcn dividend*, *assistive technology / AT*, *live region*, *`role="status"`/`role="alert"`*, *`sr-only`*, *landmark*, *roving tabindex* (all `<Term>`-defined in L2/L3). Reference them by name.

Forward references to plant (named, not taught): full `usePathname`/navigation-hooks treatment → Ch 033 L5; form-level submission + `aria-invalid`/`aria-describedby` + field-error focus at depth → Ch 044; `useLockBodyScroll` body-scroll lock → Ch 026 catalog + Ch 028 project; scroll restoration → Ch 029/Ch 032; the mobile `Sheet` drawer consuming all of this → Ch 028.

Code-component strategy overall: this lesson is mostly **small, real `.focus()` / `tabindex` snippets** plus **two CodeVariants** (the buggy-vs-correct framings that carry the lesson) and **one DiagramSequence** (the focus-cursor walk that makes the invisible problem visible). One **ReactCoding** exercise on the skip link (mechanically self-contained, the one pattern the student should build by hand). One **StateMachineWalker** decision for the `disabled` vs `aria-disabled` + move-focus-target choices. Close with a **TrueFalse** recall round. Diagrams must stay short (laptop viewport, ≤800px) — the focus-cursor sequence is the only real "diagram"; the rest are code.

---

## Lesson sections

### Introduction (no header — opening prose)

Open with the concrete invisible bug, not a definition.
Scenario: a keyboard user tabs down a list of invoices, presses Enter on a row's link, lands on the next page — and focus is *still on the now-unmounted link*. Their next Tab jumps somewhere arbitrary (often the browser chrome, or the top of `<body>` on some engines). A mouse user never notices; the bug ships.
Contrast with the static-web baseline they already know: a full page load *always* resets focus to the document top. SPAs traded that reset away for soft navigation and never gave it back.
State the lesson goal: by the end, the student can answer "where is focus right now, and where should it be?" for the three situations a SaaS app creates — modals, route changes, submissions — and knows which the platform solves (Radix modals) and which it leaves to them (the other two).
Re-invoke the L2 detection reflex explicitly: **you cannot find these bugs with a mouse.** Unplug it (or commit to Tab-only) for the rest of the lesson.
Keep it to ~5-6 sentences, warm and brief.

Reasoning: the chapter's pedagogy leads with the senior question implicitly (Pedagogical guidelines §2, filter 1). The invisible-to-mouse-users framing is *the* hook because it explains why this whole class of bug is so commonly shipped, which motivates the lesson better than any abstract "accessibility matters."

### The two verbs of focus

Purpose: install the precise vocabulary the rest of the lesson leans on, before any situation. This is the "simplified model first" move (Pedagogical guidelines / cognitive-load) — get the primitives crisp so the three situations are just applications.

Teach, in order:
- **Where focus is.** Exactly one element has focus at a time (`document.activeElement`). Tab moves it forward through focusable elements **in DOM order**; Shift+Tab reverses. This is the cursor model.
- **What is focusable by default.** Interactive native elements (`<button>`, `<a href>`, `<input>`, `<select>`, `<textarea>`) are in the Tab order for free. Everything else (`<div>`, `<h1>`, `<section>`) is not. Reuse L2's "semantic HTML first" — the reason `<button>` is reachable is the same reason you reached for it over `<div onClick>`.
- **Verb 1 — make a thing targetable: `tabindex`.** The three values, but framed by *intent* (do not re-derive the whole table L2 already taught — reference it, then focus on the one value this lesson actually uses):
  - `tabindex="0"`: join the Tab order in DOM position. Rare in a shadcn codebase (a native control almost always fits). Named, not drilled.
  - `tabindex="-1"`: **focusable by script, skipped by Tab.** This is *the* value this lesson uses — it's how you make an `<h1>` or `<main>` a valid `.focus()` target without inserting it into the user's Tab sequence.
  - positive values: anti-pattern, reorder focus globally. One sentence, cross-ref L2.
- **Verb 2 — move the cursor: `element.focus()`.** Programmatically moves focus. Introduce the **`{ preventScroll: true }`** option immediately as the senior default for page-level focus moves: without it, the browser scrolls the focused element into view, which fights the framework's scroll restoration and yanks the viewport. With it, you move focus while letting scroll be governed elsewhere.
- **The pairing rule:** to focus a non-interactive landmark like `<h1>`, you need *both* — `tabindex="-1"` (so it can receive focus) **and** `.focus({ preventScroll: true })` (to move there). Name this explicitly; it's the single most common "I focused the heading and nothing happened" confusion.

Component: a single small **`Code`** block (tsx) showing the `<h1 tabIndex={-1} ref={headingRef}>` + `headingRef.current?.focus({ preventScroll: true })` pairing — the canonical shape reused in two later sections. Keep it ~6 lines, no surrounding component noise.

`<Term>` candidates here: `document.activeElement` (define: "the one element that currently has keyboard focus"), `preventScroll` (define inline via prose, probably not a Term).

Reasoning: every downstream situation is "pick a target, make it targetable, move there." Front-loading the two verbs means the route-change and submission sections become short applications instead of re-teaching mechanics. The `tabindex="-1"` + `.focus()` pairing is the highest-leverage single fact in the lesson and deserves its own beat. Naming `preventScroll` early prevents the most common "why did my page jump" follow-up.

### Modals already solve it: the focus-trap contract

Purpose: cash in the shadcn dividend for situation 1, and — crucially — teach the student to *recognize* the four-part contract a focus trap fulfills so they (a) trust it, (b) don't reinvent it, (c) know its edges.

Teach:
- **The modal focus-trap contract — four guarantees.** When a Radix `Dialog` opens: (1) focus moves *into* the dialog (first focusable element, or the close button); (2) Tab and Shift+Tab cycle *within* the dialog and cannot escape to the page behind; (3) Esc closes and **returns focus to the trigger** that opened it; (4) the content behind the dialog is made `inert` so it's neither focusable nor announced. Reuse the *focus trap* `<Term>` from L2 — do not redefine, this is its full-depth payment (L2 planted "named, full depth L4").
- **The shadcn dividend, applied.** `Dialog`, `AlertDialog`, `Sheet`, `Drawer`, `Popover`, `DropdownMenu`, `Command` — every overlay primitive in `components/ui/` ships all four guarantees via Radix. Your job is *not to break them*: don't strip the markup that carries the behavior, don't override `onCloseAutoFocus` without a reason.
- **Why you almost never hand-write a trap.** Enumerate what a *correct* trap must handle so the student feels the weight: Tab and Shift+Tab cycling at both ends, content that changes while open (focus target disappears), focus escaping via browser autofill / devtools / `Cmd-L`, and restoring focus to the right trigger on close. Conclude: Radix (and `react-focus-trap` / `focus-trap` for the rare portal-rooted custom widget shadcn doesn't cover) get this right. Reach for the library only when you're building a modal surface shadcn has no primitive for — and even then, a library, never by hand.
- **The deleted-trigger edge — the one case Radix can't guess.** Return-focus assumes the trigger still exists. The canonical break: a delete-confirmation `AlertDialog` opened from a table row, where confirming **deletes the row** — the trigger unmounts, so there is no element to return focus to. The fix is to give the close an explicit destination: focus a stable nearby anchor (the table's heading, the "New" button, the list container with `tabindex="-1"`) in the dialog's `onCloseAutoFocus` or right after the mutation. Name this as the delete-flow pattern; it recurs.

Component: **CodeVariants** (2 tabs) — "Returns to the trigger (default)" vs "Trigger is deleted — redirect focus".
- Tab 1: a plain shadcn `AlertDialog` delete confirmation; prose notes Radix returns focus to the trigger for free, *if it still exists*.
- Tab 2: same dialog, but `onCloseAutoFocus={(e) => { e.preventDefault(); listHeadingRef.current?.focus(); }}` after the row is gone; prose: "the trigger is unmounted, so we intercept the auto-return and send focus to the list heading instead."
Use shadcn imports `@/components/ui/alert-dialog` and the `asChild` trigger (recognition from L1 — `<AlertDialogTrigger asChild><Button>…`).
Keep each tab's prose to one paragraph (CodeVariants constraint).

`<Term>` candidates: `inert` (define: "an HTML attribute/state that makes a subtree non-focusable and hidden from assistive tech"). Do **not** Term *focus trap* (already defined L2).

Reasoning: leading with the situation the platform *already solves* is the "defaults before conditionals" filter — establish what you get for free before the custom work. Recognizing the four-part contract is what lets the student trust the primitive instead of fighting it (the L1 "don't undo the dividend" rule, now concrete). The deleted-trigger case is the one genuinely non-obvious modal edge a SaaS app hits constantly (every destructive action in a list), so it earns the only modal-specific custom code.

### The route-change gap Next.js leaves you

Purpose: **the load-bearing section of the lesson.** This is the gap the platform does not fill, the most-shipped SPA a11y regression, and the place the chapter's "focus is state" thread fully pays off.

Teach:
- **Restate the gap precisely.** Next.js App Router moves focus *nowhere* on `<Link>` / `router.push` navigation. (Confirmed: an open, long-standing accessibility gap in Next.js — frame it as a known platform limitation, not a bug you're working around hackily.) The full page-load reset the static web gave you is gone; soft navigation keeps the old focus position, which now points at an unmounted node.
- **What goes wrong, concretely.** Re-state the intro scenario as the failure mechanism: focus stranded on the unmounted link → next Tab is arbitrary → screen-reader users also lose their place because nothing announces the new page context.
- **The fix — focus the new page's heading on route change.** A small **client component** mounted in the layout (`<RouteFocus />`, or a hook `useRouteChangeFocus`) that:
  1. reads `usePathname()` from `next/navigation` (`<Term>` it lightly; full treatment Ch 033 L5),
  2. in a `useEffect` keyed on `pathname`, moves focus to the page's main `<h1>` (or the `<main>` landmark) — the target carries `tabindex="-1"`,
  3. focuses with `{ preventScroll: true }` so scroll restoration (framework-owned) isn't fought.
  This is a *legitimate* `useEffect` (synchronizing with an external system — route changes — per Code conventions "useEffect is for synchronization"); say so in one clause so it doesn't read as an anti-pattern to a student fresh off "you probably don't need an effect."
- **Where the target lives.** The `<h1 tabIndex={-1}>` (or `<main id="main-content" tabIndex={-1}>`) is the same pairing from "The two verbs." Point back to it explicitly — this is application #1 of that shape. One `<h1>` per page (cross-ref L2's heading-hierarchy ownership) makes "the heading" unambiguous.
- **The skip-link companion.** Introduce the skip link here because it shares the exact mechanism (a link that focuses `<main tabindex="-1">`) and the exact target. `<a href="#main-content" className="sr-only focus:not-sr-only …">Skip to content</a>` as the first focusable element in the layout; activating it jumps Tab past the nav. Reuse `sr-only` (`<Term>` from L3) and the `focus:not-sr-only` reveal-on-focus pattern. Frame: cheap to build, and a concrete differentiator on a 2026 accessibility audit.

Components:
- **AnnotatedCode** (the `<RouteFocus />` client component, ~10-12 lines) stepping through: `'use client'` + `usePathname` import (step) → the `useEffect` keyed on `pathname` (step, color the dep array) → the `requestAnimationFrame`/post-paint focus call on the heading ref (step) → `{ preventScroll: true }` (step, color it). AnnotatedCode is right here because one compact file has 3-4 distinct parts the student must attend to in sequence, and the "this is a legit effect" point lands best highlighted on the effect itself.
  - Note for the writer: focus must run *after* the new route paints. The robust shape is to query the heading by a stable id/ref inside the effect (and optionally defer one frame with `requestAnimationFrame`) rather than hold a ref to a node from the previous route. State this as the one subtlety; keep the code honest about it.
- **DiagramSequence** — "Following the focus cursor across a navigation." 3-4 steps, the lesson's one real diagram. Pedagogical goal: make the *invisible* visible — show the single focus cursor as a marker:
  1. List page: cursor on "Invoice #1042" link (a highlighted ring around that row).
  2. User presses Enter → soft navigation; the link unmounts. Cursor shown detached / floating ("focus is on a node that no longer exists").
  3. Without `<RouteFocus />`: next Tab lands arbitrarily (cursor jumps to browser chrome / `<body>` top) — labeled "the bug."
  4. With `<RouteFocus />`: cursor snaps to the new page's `<h1>` — labeled "the fix."
  Build with simple HTML/CSS panels inside each `DiagramStep` (a faux page with a ring marker), per the diagrams guide (HTML+CSS for "layout concept with a marker"). Keep height modest.

`<Term>` candidates: `usePathname` (define: "Next.js hook returning the current URL path; re-renders the component when the path changes"), `soft navigation` (define: "client-side route change that swaps page content without a full document reload").

Reasoning: this is where the chapter framing's promise ("Focus is state… the platform does not solve for you") becomes a concrete, copyable pattern. The DiagramSequence is justified specifically because the bug is *invisible to sighted mouse users* — a visual of the lone cursor is the only way to make the problem felt before the fix. Bundling the skip link here (rather than its own section) is deliberate: same mechanism, same target, so teaching them together reinforces the `tabindex="-1"` + focus-a-landmark pattern instead of presenting two disconnected snippets. Flagging the post-paint timing subtlety prevents downstream agents from writing a ref-to-stale-node version that silently no-ops.

### Skip-link build (exercise — lives at the end of the route-change section)

Purpose: the one pattern in this lesson the student *should* hand-build (it's small, self-contained, and high-value), so give them a graded rep.

**ReactCoding**, tests-graded, `hidePreview` off (they should see the reveal-on-focus behavior).
- Instructions: "Add a skip link as the first focusable element. It must point at the main region, be visually hidden until focused, and the main region must be a valid focus target."
- Starter: an `App` with a `<header><nav>…</nav></header>` and a `<main>…</main>`, no skip link, `main` has no id and no `tabIndex`.
- Tests assert: (1) an `<a>` exists whose `getAttribute('href')` is `#main-content`; (2) that anchor is the first focusable element / precedes the nav in DOM order; (3) it carries the `sr-only` class; (4) `<main>` has `id="main-content"` and `tabIndex === -1`.
- Grading criteria for the writer: pass requires all four; the most common miss is forgetting `tabIndex={-1}` on `<main>` (anchor jumps but focus can't land) — write that assertion's `test()` name so the failure communicates it ("main must be focusable: tabIndex -1").
Keep starter ≤ ~12 lines.

Reasoning: skip link is the rare "build it yourself" in a chapter otherwise about consuming primitives, so it's the right exercise. Testing the `tabIndex={-1}` separately targets the exact misconception (focusable target vs focus-by-Tab) the lesson is trying to cement. Guided/tests-graded over a sandbox per the brief's "guided exercises always preferable."

### After a submission: move focus and announce

Purpose: situation 3. Connect focus management to L3's live regions — the "move focus *and* announce" reflex — without teaching forms (Ch 044 owns that).

Teach the three submission outcomes and where focus goes in each:
- **Succeeds and navigates** (a create flow → redirect to the new resource). The route-change pattern already handles it — focus lands on the new page's `<h1>`. Nothing extra. Point back to the previous section.
- **Succeeds and stays put** (inline edit, post a comment). Focus returns to a *sensible anchor*, deliberately chosen: commonly the originating action (the edit button you can now press again), the next field, or the success indicator. If a success message renders, it's a `role="status"` (L3) so AT hears it — pair the focus move with the announcement.
- **Fails with errors** (validation). Focus moves to the **first field with an error**, and that field's error is announced via the live region. State the wiring contract at recognition depth only: focusing an input that is `aria-describedby` a `role="alert"` error element makes the screen reader read *label + value + error* in one pass — **the** senior submission pattern. Explicitly defer the form mechanics (`useActionState`, `aria-invalid`, rendering the error tree) to Ch 044; this lesson owns only the *focus + announce* half.
- **The unifying rule, named:** **move focus and announce, or do neither.** A focus move the screen reader has nothing to say about is disorientation; an announcement with no focus move leaves a keyboard user's cursor stranded. The two are one event.

The over-focusing watch-out belongs here (it's the failure mode this section's power invites): moving focus on *every* state change ("over-focusing") is disorienting and *steals* announcements — each focus move interrupts the AT. The cure: move focus only on genuinely disruptive transitions (open, close, navigate, submit-result), not on every keystroke or re-render. Render as a `:::caution`.

Component: a single **Code** block (tsx) sketching the fails-with-errors case at the focus layer only — a ref on the first-error field, `firstErrorRef.current?.focus()` inside the error branch, the field wired `aria-describedby={errorId}` to a `<p id={errorId} role="alert">`. Mark clearly (a comment or prose) that the form plumbing around it is Ch 044's; this is the focus+announce skeleton. Avoid a full form — keep it to the load-bearing 8-10 lines so the boundary with Ch 044 stays clean.

`autoFocus` — the careful reach (subsection or tight paragraph inside this section):
- When it's right: single-purpose landing screens where intent is unambiguous — a sign-in email field, a one-input search page, a focused command palette.
- When it's wrong: multi-section forms (steals focus from AT reading surrounding context), and **dialogs** (Radix already manages initial focus — `autoFocus` fights it). Cross-ref the modal section.
- The mechanic to know: React's `autoFocus` prop fires per **mount**; a component that remounts re-fires it. One sentence.

Reasoning: framing submissions by *outcome* (navigate / stay / fail) maps focus decisions onto the three things that actually happen, which is more memorable than a flat rules list. The "move focus *and* announce" rule is the lesson's one genuinely new conceptual contribution beyond mechanics — it's where focus (this lesson) and live regions (L3) compose, and stating it as a single named rule is what makes it stick. Keeping the code to a skeleton and repeatedly pointing at Ch 044 is essential scope hygiene — this chapter has no validating form and must not grow one.

### Two traps the platform sets: aria-disabled and CSS reorder

Purpose: two high-frequency, non-obvious focus mistakes that don't fit the three situations but bite constantly. Grouped because both are "the obvious move is wrong." (Per the brief, these are content sections teaching a concept, not a tips bucket — each teaches a real decision.)

**Tab order follows the DOM, not the CSS.**
- The rule: Tab order is DOM order. Visual reordering via CSS — `flex-direction: row-reverse`, `order: -1`, `grid-template-areas`, `flex-wrap` reflow — moves *pixels*, not the focus cursor. A user sees the sidebar on the right but Tab still hits it first because it's first in the DOM.
- Where it bites: sidebar-vs-main layouts where design and DOM disagree; "visually move this button to the end" via `order`. The reading order and the Tab order silently diverge.
- The fix: **reorder the DOM, not the CSS.** If the focus order is wrong, the markup order is wrong — `tabindex` is *not* the fix (positive `tabindex` to "patch" visual order is the anti-pattern from L2). Cross-ref logical properties (Ch 020 L1) as the RTL-correct way to mirror layout without touching source order.

**`disabled` vs `aria-disabled` — discoverability is the deciding question.**
- Native `disabled`: removes the control from the Tab order entirely and announces "disabled." Correct default for most disabled controls.
- The problem case: a control the user should still be able to *reach and read* — e.g., a submit button disabled pending validation, where a screen-reader user tabbing the form should discover it and hear *why* it's inert. A natively `disabled` button is **skipped**, so they never find it.
- The fix: `aria-disabled="true"` keeps the element focusable and discoverable; you then **guard the handler** against the disabled state (early-return in `onClick`) since `aria-disabled` doesn't block activation the way `disabled` does. Pair it with a `role="status"`/describedby reason if there is one.
- The decision: **default to native `disabled`; reach for `aria-disabled` only when the disabled element must stay discoverable.**

Component: **StateMachineWalker** (`kind="decision"`) — "Disabling a control: which attribute?" Walk:
- Q: "Should a keyboard/AT user be able to focus this control while it's inert?" → No → Leaf `disabled` ("removes from Tab order, announces disabled — the default"). → Yes → next Q.
- Q: "Do they need to know *why* it's inert?" → Yes → Leaf `aria-disabled + guarded handler + describedby reason`. → No → Leaf `aria-disabled + guarded handler`.
Decision tree is the right shape (Mermaid-style decision per diagrams guide) because this is a "which tool, ask the questions in order" call — exactly the StateMachineWalker's stated fit.

Reasoning: both are "obvious thing is wrong" traps that map directly to chapter watch-outs, and both are genuinely about a *decision* (reorder DOM vs CSS; native vs ARIA disabled), so they're legitimate teaching sections, not a tips dump. The CSS-reorder rule reinforces the lesson's spine fact ("DOM order is the law"); grouping it with `aria-disabled` under "the platform sets traps" gives the section a real through-line. The walker externalizes the disabled decision so the student practices the *order* of questions, which is the transferable part.

### Focus visibility in your own components (brief closing)

Purpose: tie the lesson back to Ch 021's `:focus-visible` so a custom focusable element the student builds isn't a focus dead-end. Short — this is reinforcement, not new ground.

Teach:
- When you make something focusable that isn't natively interactive (a clickable card, a custom selectable row with `tabindex="0"` — rare, but it happens), it **must** show a visible focus ring, or you've created a target the keyboard user can land on but can't see.
- The canonical classes: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` — `--ring` is shadcn's semantic focus token (L1's token model; L2's "audit the token" reflex applies — the ring color is theme-owned). Cross-ref Ch 021 L4 for `:focus-visible` semantics; don't re-derive why `:focus-visible` (vs `:focus`) — name it and move on.
- One-line bridge to the watch-out from L2: never *remove* focus rings to "clean up" a design; style them.

Component: one tiny **Code** snippet of a focusable card with the `focus-visible:ring-*` classes. No exercise — Ch 021 owned the practice.

Reasoning: closes the loop — a lesson about *moving* focus would be incomplete without the reminder that focus must be *visible* where it lands, especially on the custom elements that prompted `tabindex` in the first place. Kept deliberately short to respect the Ch 021 ownership boundary.

### Recall check (TrueFalse — end of lesson)

A short **TrueFalse** round (5-7 statements) consolidating the load-bearing facts. Candidate statements (writer refines):
- "Next.js App Router automatically moves focus to the new page on client-side navigation." → **False.**
- "`tabindex="-1"` puts an element in the Tab order." → **False** (script-focusable, Tab-skipped).
- "You should hand-write a focus trap for a custom modal." → **False** (Radix / a library).
- "Moving focus to a `role="alert"` error field lets a screen reader announce the label and error together." → **True.**
- "Reordering elements visually with CSS `order` also changes the Tab order." → **False** (DOM order governs Tab).
- "A natively `disabled` button is reachable by Tab." → **False** (removed from Tab order; that's why `aria-disabled` exists for the discoverable case).
- "`element.focus({ preventScroll: true })` moves focus without scrolling the element into view." → **True.**

Reasoning: the lesson's value is a set of crisp, counter-intuitive facts (the platform *doesn't* do X; the obvious attribute is *wrong*). TrueFalse is the right low-friction format to verify those binary recalls, consistent with L2 closing on a `TrueFalse`.

### External resources (optional, end)

1-2 **ExternalResource** cards, recognition-level:
- WAI-ARIA Authoring Practices Guide (APG) — the modal dialog & focus-management patterns (already cited as a resource in L3; the dialog pattern is the relevant page here).
- MDN: `HTMLElement.focus()` (documents `preventScroll`) or the WebAIM "Keyboard Accessibility" page.
Keep to genuinely authoritative sources; no listicles.

---

## Scope

**This lesson teaches:** the two-verb model (`tabindex="-1"` to make targetable, `.focus({ preventScroll })` to move); the modal focus-trap *contract* and why Radix owns it (recognition + the deleted-trigger custom edge); the route-change focus pattern Next.js omits (the `<RouteFocus />` / `usePathname`-keyed effect) plus the skip link; post-submission focus by outcome and the "move focus *and* announce" rule (focus layer only); the DOM-order-governs-Tab rule and the `disabled` vs `aria-disabled` decision; and a brief focus-visibility reminder for custom focusable elements.

**Explicitly out of scope (redefine prerequisites tersely, do not re-teach):**
- **`:focus-visible` styling at depth** — Ch 021 L4 owns it. Reuse the ring classes; name `:focus-visible` without re-deriving the `:focus` distinction.
- **`useId` mechanics** — Ch 024 L6 owns. When an error/heading id is needed for `aria-describedby`/the skip-link target, note `useId` is the source of stable ids (or use a fixed id like `main-content` for the singleton skip target); don't teach the hook.
- **ARIA roles / labels / live regions at depth** — L3 (this chapter) owns. Reuse `role="status"`/`role="alert"`, `sr-only`, *live region*, *AT* by name; do not redefine. This lesson uses them only as the "announce" half of the focus pattern.
- **The four accessibility commitments, semantic-HTML-first, the unplug-the-mouse pass** — L2 (this chapter) owns. Re-invoke the detection reflex; don't re-teach the commitments.
- **shadcn install / `asChild` / the dividend framing / compound components** — L1 owns. Use `<AlertDialogTrigger asChild>` etc. as recognition; don't re-explain `asChild`.
- **Forms: `useActionState`, `aria-invalid`, rendering the `Result` error tree, Constraint Validation, the `<SubmitButton>`** — Ch 044 owns. This lesson stops at "move focus to the first error and announce it"; it ships **no validating form**, only the focus+announce skeleton.
- **`usePathname` / `useRouter` / navigation hooks in full, `push` vs `replace` vs `refresh`, `useSearchParams` Suspense rule** — Ch 033 L5 owns. Use `usePathname` as the route-change signal only; `<Term>` it lightly and forward-ref.
- **`<Link>` / `router.push` / `redirect()` navigation primitives** — Ch 029 L4 owns. Referenced as "what triggers a route change," not taught.
- **`useLockBodyScroll` / body-scroll lock on iOS** — Ch 026 catalog + Ch 028 project own. The mobile `Sheet` drawer note stays a one-line forward-ref: Radix handles the *focus trap*; the scroll lock is the project's custom hook.
- **Scroll restoration on route change** — Ch 029 / Ch 032 own. Mentioned only to justify `preventScroll: true` (so programmatic focus doesn't fight framework scroll behavior).
- **Loading/empty/error state UI, `Skeleton`/`Empty`/`Alert`** — L5 (this chapter, next) owns. Don't preview.
- **Error boundaries (`error.tsx`, render errors)** — Ch 031 / Ch 080 own. Not this lesson (data/route focus only).
- **RTL focus order / i18n** — Ch 084 owns. The CSS-reorder section cross-refs logical properties (Ch 020 L1) for layout mirroring but does not teach RTL.
- **axe / Lighthouse in CI** — Ch 095 owns. Reuse L2's "tools can't catch this" point about route-change focus; don't teach the CI surface.

---

## Code-conventions alignment notes (for downstream agents)

- All tsx follows Code conventions §Components/JSX and §Hooks: arrow-function components bound to `const`; refs are plain props typed `Ref<T>` (React 19 — **no `forwardRef`**); typed props, no `any`; class composition via `cn()` with `className` last; `'use client'` at the top of `<RouteFocus />` and any component using a ref + effect.
- The route-change `useEffect` is a **sanctioned** effect (external-system synchronization per §Hooks) — do not let the writer "fix" it away or wrap it in the compiler-memoization caveats; just keep `usePathname` in the dependency array (the `exhaustive-deps` rule stays on).
- shadcn primitives used **as imported** from `@/components/ui/*` (§shadcn primitives); the `onCloseAutoFocus` override in the deleted-trigger case is a legitimate behavioral need, not a fork — keep it at the call site, not in `components/ui/`.
- Tailwind: `motion-reduce:` is not central here (little animation), but any transition shown (e.g., skip-link reveal) follows §Styling. Focus ring uses the semantic `--ring` token, never a primitive color.
- Booleans-as-predicates, kebab-case filenames (`route-focus.tsx`), `use<Thing>` hook naming if a hook form is shown (`useRouteChangeFocus`) — §Naming.
- **Deliberate divergence to flag:** lesson code shows focus management *outside* a full form/auth context for teaching clarity. The `firstErrorRef`/skip-link snippets are intentionally stripped of the surrounding production plumbing (Server Action, `useActionState`, `useId`-generated ids) that Ch 044 / Ch 024 own — note this in the prose so the boundary reads as intentional, not incomplete.
