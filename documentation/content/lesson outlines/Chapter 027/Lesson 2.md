# The four commitments

- **Title (h1):** The four commitments
- **Sidebar label:** The four commitments

---

## Lesson framing

This is a **consolidation lesson, not a mechanics lesson.** Every concrete accessibility technique in this lesson was already taught at its call site in Chapters 017–026 (`<button type>`, `<label htmlFor>`, `:focus-visible`, `useId`, landmarks, `motion-reduce:`). The student already knows the moves. What they lack is the **senior frame that ties them together**: accessibility is not a feature bolted on at QA time — it is a small set of commitments the team holds *while writing every screen*, the same way they hold security or type-safety.

The lesson's job is to install five durable mental models and make them feel cheap, not virtuous:

1. **Accessibility is a quality bar, not charity.** Lead with the business/legal constraint (WCAG 2.2 AA is what procurement contracts and law demand), state it once, drop the moralizing. The senior reflex is "this costs almost nothing if held from day one, and is expensive to retrofit."
2. **The four commitments.** Keyboard, contrast, motion, target size — named once, each made auditable centrally rather than per-call-site. These are the through-line of the whole lesson and the spine of the section structure.
3. **Semantic HTML is the first move; ARIA is the second.** The "first rule of accessibility" — does a native element already do this? Native elements ship keyboard, focus, and screen-reader semantics for free. This bridges into Lesson 3 (which lands the ARIA mechanics).
4. **The shadcn dividend.** Because Radix primitives (Lesson 1) already solve keyboard/focus/ARIA for the components they cover, the student's job narrows to: don't undo it, and hold the four commitments for the *rest* of the page (landmarks, headings, token contrast, custom-animation motion, custom-widget focus rings). Frame the commitments as "what you still own once the primitive does its part."
5. **Tools are necessary, not sufficient.** Automated auditors catch ~a third of issues; the rest needs a human (heading order, link text, focus order, alt meaning). Install the keyboard-only manual pass as the senior habit.

**Pedagogical stance.** The target student is a competent dev meeting accessibility-as-discipline for the first time. The classic failure mode is treating it as a checklist of magic attributes; this lesson fights that by making each commitment a *property of a central artifact* (the design token, the global stylesheet, the DOM order) rather than a per-element chore. Keep cognitive load low: this is breadth over depth, recognition-tuned. Do **not** re-derive the call-site mechanics — name them, link the chapter, move on. Two interactive figures carry the two commitments that are best *felt* rather than read (contrast via a live WCAG chip, motion via a reduced-motion toggle). One classification exercise checks the semantic-first / when-ARIA reflex. One keyboard-walkthrough figure makes the keyboard contract concrete. Keep prose terse and senior-adult per the guidelines; no celebratory tone.

**Tone on the legal frame.** State jurisdictions in one tight paragraph (US ADA via DOJ guidance, EU Accessibility Act in force since 28 June 2025, UK Equality Act, Canada ACA), framed as demanding *AA-level* conformance. The point is "the constraint is real and costs deals," not a survey of law. No fear-mongering. (See the precision note in Commitment 2's first bullet: tie the laws to "AA," not to a specific WCAG version.)

---

## Lesson sections

### Introduction (no header)

Open with the senior question, stated implicitly per the guidelines: *when do you do accessibility?* The junior answer is "at the end, before launch." The senior answer is "never as a phase — it's four commitments you hold while writing every screen, like you hold security." Connect to what the student just learned in Lesson 1: shadcn's Radix primitives already solved the hard accessibility work for buttons, dialogs, and menus — so the discipline that remains is small, central, and cheap *if you hold it from the start.* Preview the four commitments by name (keyboard, contrast, motion, target size) plus the first-rule-of-accessibility frame, and state the deliverable: by the end the student can name what they still own on every screen and run the manual pass a senior runs before merge.

Keep it to ~2 short paragraphs. Warm, brief, no list dump — the sections that follow are the list.

### Accessibility is a quality bar, not a feature

The reframing section. Establish the mental model before any commitment.

Content:
- Accessibility is a **discipline-level commitment**, parallel to security and type-safety — held continuously, not scheduled. The retrofit cost is the hook: held from day one it costs almost nothing; bolted on at QA it means re-auditing every screen, re-theming for contrast, rewiring focus.
- **The legal/business frame, briefly.** One tight paragraph: **AA-level conformance** is what most jurisdictions and procurement contracts demand (US ADA via DOJ guidance, EU Accessibility Act in force since 28 June 2025, UK Equality Act, Canada ACA). Failing it costs deals and invites suits. Senior framing: a quality bar, not charity. No moralizing. **Precision note for the writer:** state the laws as demanding *AA*, and present **WCAG 2.2 AA** as the engineering floor the course holds — do **not** claim a specific law mandates "2.2." (The EU's EAA technically rides EN 301 549, which currently maps to WCAG **2.1** AA; WCAG 2.2 is additive and the practical 2026 target, but the legal text lags the version. Keeping the claim at "AA" avoids tying a statute to a version it doesn't yet name.)
- **Why "baseline," not "exhaustive."** This lesson is the frame; the per-element mechanics already live at their call sites (name them: button types — Ch 017 L4; label/for — Ch 017 L5; `:focus-visible` — Ch 021 L4; `useId` — Ch 024 L6; landmarks + heading outline — Ch 017 L3; `motion-reduce:` — Ch 021 L5). ARIA mechanics and focus management get their own lessons next (Ch 027 L3, L4). When you hold the four commitments, those call-site practices fall into place.

Pedagogy: this is the section that prevents the "checklist of magic attributes" misread. Make the "central artifact, not per-element chore" idea explicit here as foreshadowing — each commitment that follows will be shown as a property of a token, a stylesheet, or the DOM.

Components: prose only, plus one `Aside` (note) listing the call-site cross-refs compactly so the body prose stays clean. No diagram — this is framing.

`<Term>` candidates: **WCAG** (Web Content Accessibility Guidelines), **AA** (the middle conformance level — the practical floor; A too weak, AAA aspirational), **EAA** (European Accessibility Act) if abbreviated.

### Commitment 1 — every control works from the keyboard

The first and most testable commitment.

Content:
- The commitment: every interactive control is **reachable by Tab, activatable by Enter/Space (per its role), and dismissable by Esc where applicable.**
- **The senior test, stated as a one-liner:** unplug your mouse and use your app for five minutes. If you get stuck, a keyboard user is stuck.
- **The keyboard contract per control type** — present as a compact reference table (control → keys): Button → Enter + Space; Link → Enter; Dropdown/Select → Arrows move, Enter selects, Esc closes; Dialog → Esc closes, Tab cycles within, Shift+Tab reverses; Disclosure (`<details>`/accordion) → Enter + Space toggle. Frame the table as "what users already expect — your job is not to break it."
- **Tab order follows DOM order.** This is the load-bearing rule. Visual reordering with CSS does not reorder focus (forward-ref the depth to Lesson 4, which owns the DOM-order-vs-CSS-order fix; here just plant "Tab follows the DOM").
- **`tabindex` — the three values that exist.** `0` = make a non-interactive element focusable in document order (rare in a shadcn codebase — you almost always reach for `<button>` instead). `-1` = focusable by script only (used by focus-management code, Lesson 4). **Positive values are an anti-pattern** — they reorder focus globally and break expectations. The senior rule: if you're typing `tabindex="3"`, stop and fix the DOM.
- **The shadcn dividend for keyboard:** Radix primitives implement the entire keyboard contract above (roving tabindex in menus, Tab cycling in dialogs, arrow-key navigation). You get it for free by using the primitive instead of a `<div onClick>`. Cross-ref `<button>` over `<div onClick>` (Ch 017 L4) and the `:focus-visible` ring (Ch 021 L4) as the two call-site practices this commitment rests on.

Pedagogy + components:
- The keyboard contract is best made **concrete and interactive**. Build a small custom figure, **`KeyboardWalkthrough`** (lesson-specific, `src/components/lessons/027-2/keyboard-walkthrough.astro`), OR — preferred to avoid a custom build if it fits — use **`DiagramSequence`**: each step shows a mock toolbar/dialog with the currently-focused element ringed and a caption naming the key pressed (Tab → next control; Enter → activate; Esc → close + focus returns to trigger). Goal: the student *sees* focus move and Esc restore focus, which is exactly the contract Radix implements. Decision for the writer: prefer `DiagramSequence` with hand-built HTML "screens" (focus ring = a Tailwind `ring-2 ring-ring` box) scrubbed by the slider; only build a custom keyboard-event widget if the sequence feels too static. Wrap in `<Figure>` with a caption naming the contract.
- The per-control keys: a plain markdown table is correct here — it's reference, not narrative.
- `tabindex` values: a short `Code` block or inline `<code>` for the three values; no heavy component.

`<Term>` candidates: **roving tabindex** (the single-tab-stop pattern Radix uses for menus/toolbars — define so the "free" claim lands), **focus trap** (name + one-line; full treatment Lesson 4).

### Commitment 2 — contrast is a property of the theme

The commitment most often gotten wrong, and the one the semantic-token model makes cheap.

Content:
- The commitment: **WCAG 2.2 AA contrast** — 4.5:1 for normal text, 3:1 for large text (≥18pt, or ≥14pt bold) and for UI components / graphical objects.
- **The senior reframe — the core idea of the section:** don't audit contrast at the call site, audit the *palette*. Because the theme (Lesson 1) is built from semantic token pairs — `--foreground` on `--background`, `--primary-foreground` on `--primary`, `--muted-foreground` on `--muted` — contrast becomes a **property of the theme, not the page.** A `--primary` that fails on `--background` fails *everywhere*; fix it once at the token and every screen passes. This is the payoff of the semantic-token model from Lesson 1, now cashed as an accessibility dividend. (This is the "token-on-token contrast" debt L1 deferred here — pay it explicitly.)
- **Dark mode is a second palette that must pass the same bar.** The `.dark` overrides are a whole separate set of pairings; "softer = lower contrast" is the canonical dark-mode trap — it fails AA and fails users in bright environments. Audit both palettes.
- **Tools:** Chrome DevTools color picker / Accessibility pane (shows the ratio inline on any element), axe DevTools extension, the contrast checker in the theme generator (`tweakcn`) / Figma. Frame: audit the palette in the token file, not element-by-element.

Pedagogy + components:
- This commitment is the prime candidate for **`ParamPlayground`** — contrast is something you must *feel by sliding*, and the component ships `wcagContrast(a,b)` and `wcagPasses(a,b,level,size)` expression helpers purpose-built for it. Build a **token contrast lab**: a slider for the foreground token's OKLCH lightness (and optionally a background-lightness slider), a `<Preview>` rendering a swatch of text-on-background using `var(--fg)` / `var(--bg)`, and two `<Readout>` chips — one `expr="wcagContrast('oklch(...)','oklch(...)')"` showing the live ratio, one `expr="wcagPasses(...) ? 'AA ✓' : 'AA ✗'"` flipping pass/fail as the student crosses 4.5:1. Pedagogical goal: the student internalizes that contrast is a continuous property of the two token values, and watches the exact lightness where AA breaks — far stickier than a stated threshold. (Do **not** wrap `ParamPlayground` in `<Figure>` — it is its own card.)
- Normal-vs-large thresholds: a tiny two-row table or inline statement; keep it light.
- Dark-mode trap: an `Aside` (caution) is the right home for the "softer = lower contrast fails AA" watch-out, attached to this section since it qualifies this concept.

`<Term>` candidates: **contrast ratio** (define the 1:1–21:1 luminance ratio in one line), **OKLCH** only if needed (already taught Ch 021 L2 — prefer not to redefine; assume known).

### Commitment 3 — motion respects the user's preference

The commitment with a clear platform hook and a subtle exception.

Content:
- The commitment: honor **`prefers-reduced-motion`.** Motivate with the stake, briefly: vestibular disorders affect a large share of adults at some point — large transforms, parallax, and looping animation can cause genuine nausea/dizziness. The user told the OS they want less motion; respect it.
- **The two mechanisms (both already taught Ch 021 L5 — name, don't re-derive):** Tailwind's `motion-reduce:` variant on any animation noticeable enough to matter (`motion-reduce:transition-none`, `motion-reduce:animate-none`), and the global `@media (prefers-reduced-motion: reduce)` block for app-wide defaults. The code-conventions rule is the line to teach: **`motion-reduce:` on every animation visible above the fold — no exceptions.**
- **The default-direction trap (key watch-out for this commitment):** author the *reduced* case as the override on top of full motion, and don't forget it. The canonical bug is animating freely and never handling `reduce`. (Code-conventions framing: invert the default in the global stylesheet so motion is opt-*down*.)
- **The motion exception — replace, don't just remove.** Some motion is *communicative*: a toast sliding in is how a sighted user knows it appeared. Under reduced motion, swap the slide for a non-motion equivalent (instant appearance, a brief color flash) — don't simply delete it, or the user loses the signal. Principle: convey the same information without the vestibular cost.
- **The shadcn dividend:** `tw-animate-css` (the dialog/sheet/accordion animation engine from Lesson 1) is built to respect reduced motion when configured — but the moment you write your *own* keyframe animation, the `motion-reduce:` discipline is yours again.

Pedagogy + components:
- Best taught **interactively** so the student feels the difference. Build a small custom toggle figure, **`ReducedMotionDemo`** (`src/components/lessons/027-2/reduced-motion-demo.astro`): a toggle labeled "Simulate prefers-reduced-motion: reduce" that, when off, shows a card animating in with a slide+fade; when on, the same card appears instantly (or with a color flash) — demonstrating the *replace, don't remove* principle directly. The toggle drives a class on the demo container that gates the animation (the component owns the CSS; it does not read the real OS setting, it simulates it so every student sees both states regardless of their machine). Pedagogical goal: the "exception" (communicative motion → non-motion equivalent) is abstract in prose but obvious when toggled. Wrap in `<Figure>` with a caption. If a custom build is undesirable, fall back to two `TabbedContent` panels ("Full motion" / "Reduced motion") each a static-with-CSS demo — but the live toggle is the better teach.
- The `motion-reduce:` syntax: a short `Code` block showing one class on one element; it's recognition, not new syntax.

`<Term>` candidates: **vestibular disorder** (one-line: inner-ear/balance condition triggered by motion) — justified, the student may not know the word and it motivates the whole commitment.

### Commitment 4 — targets are big enough to hit

The commitment juniors most often miss because they design with a mouse.

Content:
- The commitment: **touch targets at least 24×24 CSS px with spacing (WCAG 2.2 SC 2.5.8, AA)**; **44×44 is the practical default** most teams hold (Apple HIG / Material baseline) for touch-primary actions.
- **The reach, in Tailwind:** `min-h-11 min-w-11` (44px on the `--spacing` scale) on touch-primary buttons. **Grow the hit area with padding, not by scaling the icon** — a 16px icon in a 44px padded button is correct; a 44px icon is not. Frame the senior reflex: hit area is a function of the *thumb*, not the designer's pointer precision.
- **The input-modality split (already taught Ch 021 L6 — name, don't re-derive):** `(pointer: coarse)` and `(hover: hover)` let you tune sizing per input. A dense desktop table with a fine pointer can use smaller controls; the same UI on touch needs the larger target. The senior move is to size for the *coarsest* pointer that will use the screen.
- **The shadcn dividend / caveat:** shadcn's default `Button` sizes are designed against this baseline, but `size="icon"` and `size="sm"` variants can fall below 44px — check them on touch-primary surfaces and bump with `min-h-11 min-w-11` or a wrapping hit area where needed.

Pedagogy + components:
- The "padding not icon-scaling" idea is visual. A small **annotated illustration** is the right vehicle: an `<ArrowDiagram>` (inside `<Figure>`) or a hand-built HTML/CSS figure showing a 16px icon centered in a 44px target, with callout labels — "icon: 16px (visual)" and "hit area: 44px (padding)" — and a side-by-side of a too-small 24px target. Pedagogical goal: separate *visual size* from *hit area* in the student's head, which is the whole misconception. Keep it compact (vertical-space budget).
- The Tailwind reach: inline `<code>` / a one-line `Code` block.
- This is also a natural spot for a brief `Aside` (tip): "test on a real phone, not a desktop with the devtools device emulator's mouse cursor" — the hit-area-tuned-for-the-designer watch-out lives here.

`<Term>` candidates: **`(pointer: coarse)`** (media query matching a touch/imprecise pointer — define inline since it carries the modality-split point), **CSS pixel** only if disambiguation from device pixels is needed (likely skip — assume known from Ch 021).

### Semantic HTML first, ARIA second

The "first rule of accessibility" — the bridge into Lesson 3 and the principle that makes the four commitments cheap.

Content:
- **The first rule of accessibility, stated as the section thesis:** before any ARIA attribute or any custom widget, ask *does a native element already do this?* `<button>` over `<div onClick>`, `<a href>` over `<span onClick>`, `<details>` over a hand-built accordion, `<dialog>` / Radix `Dialog` over a `<div role="dialog">`. Native elements come with keyboard, focus, and screen-reader semantics **for free** — which is exactly why the four commitments above cost so little when you start from semantic markup.
- **Why this is the senior default:** semantic-first means the platform does the keyboard + focus + role work; ARIA only changes what assistive tech *announces*, it does **not** add behavior. (Plant the seed — Lesson 3 lands "no ARIA is better than bad ARIA" and proves `role="button"` on a `<div>` is still keyboard-dead. Here, just establish the ordering: native first, ARIA as the fallback when no semantic equivalent exists.)
- **The shadcn dividend, named as a dividend:** using Radix primitives via shadcn means the keyboard/focus/ARIA work is already done. Reframe the student's remaining job as a short, concrete list — **what you still own with shadcn in the mix:**
  - Page **landmarks** (`<header>`/`<main>`/`<nav>`/`<footer>`) — Ch 017 L3.
  - **Heading hierarchy** (one `<h1>` per page, no level skips) — Ch 017 L3.
  - **Form labels** (`<label htmlFor>`) — Ch 017 L5.
  - **Token contrast** — Commitment 2, above.
  - **Reduced-motion** in *your* animations — Commitment 3, above.
  - **Focus on route changes** — Lesson 4.
  - **Live regions** for async state — Lesson 3.
  This list is the lesson's payload: it tells the student exactly where their attention goes once the primitive does its part.

Pedagogy + components:
- This section earns the lesson's **understanding-check exercise.** Use **`Buckets`** with the prompt "which of these does a native element already give you, and which needs an explicit choice?" — OR better for the semantic-first reflex, a two-bucket sort: **"Reach for a native element"** vs. **"You still own this with shadcn."** Items: an action a user clicks → native `<button>`; navigation → native `<a>`; a show/hide section → `<details>`; the page's landmark structure → you own; one `<h1>` per page → you own; icon-only button label → you own (forward-ref L3); token contrast → you own; dialog Tab-cycling → native (Radix). Grading: items map to the correct bucket; decoys are the tempting-wrong picks (e.g., "Tab order inside a menu" → native, not "you own"). This drills the exact discrimination the section teaches. Use `twoCol` if item count warrants. Add `instructions` clarifying "native" includes Radix primitives.
- Alternatively a `MultipleChoice` ("What does adding `role='button'` to a `<div>` give you?" → correct: nothing for the keyboard; it only changes the announced role) to pre-seed Lesson 3 — but keep to one exercise here to respect cognitive load; the `Buckets` sort is the stronger fit for *this* section's "what do you still own" payload.

`<Term>` candidates: **ARIA** (Accessible Rich Internet Applications — the attribute set that *describes* semantics to assistive tech; define since Lesson 3 builds on it and the acronym is non-obvious), **assistive technology** / **screen reader** (one-line if not already familiar; likely introduced earlier — reuse, don't redefine).

### What automated tools catch, and what they miss

The auditing-discipline close — installs the senior habit and the honest limit of tooling.

Content:
- **What a senior runs, in order of effort:** Lighthouse accessibility (built into Chrome DevTools) as the daily smoke test; axe DevTools (extension) for deeper rule coverage; **keyboard-only navigation as a manual pass before every merge** (the Commitment-1 mouse-unplug test, now framed as a process gate).
- **The honest limit — the key takeaway:** automated tools catch a *minority* of WCAG issues. Use the measured framing, not a single invented number: roughly **~30% of the AA success criteria** can be meaningfully tested by automation, or **~57% of real issues by volume** (Deque's axe-core study) — either way, **the majority of conformance still needs a human.** The human-only ground: heading hierarchy that *makes sense*, link text that *describes its destination*, alt text that *conveys meaning*, focus order that *matches reading order*. The senior reflex: **a tool's clean report is necessary, not sufficient.** "Lighthouse 100" is not "accessible." (Writer: pick one framing and state it as an approximation with its basis — "by success-criteria count" or "by issue volume" — don't present a bare "30%" as the whole truth.)
- **Where the CI surface lives:** forward-ref that axe-in-Playwright and Lighthouse CI (the automated gate in the pipeline) are Chapter 095's job — here it's the local pre-merge habit, not the pipeline.

Pedagogy + components:
- This is a short, punchy closing section — prose plus possibly one `Aside` (caution) for "Lighthouse 100 ≠ accessible." No diagram needed; the ~⅓ vs ~⅔ split could be a tiny two-segment HTML/CSS bar inside a `<Figure>` if a visual lands better than the sentence, but a stated number is fine — keep it light, don't manufacture a diagram.
- Optionally a single `TrueFalse` round to close the lesson and consolidate the four commitments + semantic-first + tool-limits as recall (e.g., "Positive `tabindex` values are a good way to control focus order" → false; "Dark mode needs its own contrast audit" → true; "A passing Lighthouse score guarantees an accessible page" → false; "`motion-reduce:` should remove communicative motion entirely" → false). This gives the consolidation lesson a recall checkpoint without a heavy build. Place it here as the lesson's wrap, not in a separate "quiz" section.

`<Term>` candidates: **Lighthouse** (Chrome's built-in auditing tool — one line), **axe** (the de-facto accessibility-rule engine behind most tooling — one line).

### External resources (optional)

One or two `ExternalResource` cards if they clear the bar: the **WAI-ARIA Authoring Practices** intro (source of "no ARIA is better than bad ARIA," the bridge to Lesson 3) and the **WebAIM contrast checker** (the tool the contrast commitment points at). Keep to ≤2; this is a consolidation lesson, not a link farm. A short explainer **`VideoCallout`** on keyboard-only navigation could support Commitment 1 if a strong, current (≤2 yr) one exists — the resourcer can source it; not required.

---

## Scope

**This lesson teaches** the senior frame: the four discipline-level commitments (keyboard, WCAG 2.2 AA contrast, `prefers-reduced-motion`, touch-target size) and the "semantic HTML first, ARIA second" rule, plus the auditing habit and the tooling limit. It is breadth/recognition-tuned — it *names* and *links* the call-site mechanics, it does not re-derive them.

**Already taught — redefine in one line at most, then link, never re-teach:**
- `<button type>` for actions vs. `<a>`/`<Link>` for navigation; `aria-label` on icon-only buttons — Ch 017 L4.
- `<label htmlFor>`, `<fieldset>`/`<legend>`, form contract — Ch 017 L5.
- Landmarks (`<header>`/`<nav>`/`<main>`/`<footer>`) and the `<h1>`–`<h6>` heading outline — Ch 017 L3.
- `data-*` / `aria-*` attribute surface, `role="alert"` — Ch 017 L6.
- `:focus-visible` ring, `outline` vs `border` for focus — Ch 021 L3, L4.
- `motion-reduce:` variant + `@media (prefers-reduced-motion)`, `tw-animate-css` — Ch 021 L5.
- `(hover: hover)` / `(pointer: coarse)` modality queries — Ch 021 L6.
- OKLCH token storage, semantic vs primitive tokens, `.dark` overrides — Ch 021 L2, Ch 018 L5.
- `useId` for ARIA wiring — Ch 024 L6 (name only; ARIA wiring depth is L3).
- shadcn/Radix copy-into-repo model, the primitive solving a11y for its surface, the `--ring`/`--primary`/`--foreground` token family — Ch 027 L1.

**Deferred — name and forward-reference, do NOT teach here:**
- ARIA roles, labels, descriptions, live regions, `role="status"` vs `role="alert"`, the icon-only-button label *mechanics*, the live-region pre-mount rule — **Ch 027 L3**. (This lesson only establishes "ARIA is the second move.")
- Focus management — modal focus traps (depth), the route-change focus reflex *implementation*, skip links, post-submission focus, the DOM-order-vs-CSS-order *fix*, `disabled` vs `aria-disabled` — **Ch 027 L4**. (This lesson only plants "Tab follows the DOM" and "Esc returns focus.")
- Loading/empty/error/populated UI patterns — **Ch 027 L5**.
- Form-validation accessibility (`aria-invalid`, `aria-describedby` at depth) — **Ch 044**.
- axe-in-Playwright and Lighthouse CI (the pipeline gate) — **Ch 095**. (This lesson teaches only the *local* pre-merge habit.)
- Internationalization and the `lang` attribute beyond the root — **Ch 084**.
- Mobile drawer / `Sheet` focus trap and `useLockBodyScroll` consumption — **Ch 028 project** (L4 owns the focus-trap teaching).

**Out of scope entirely:** the full WAI-ARIA role taxonomy; screen-reader-specific quirks across NVDA/JAWS/VoiceOver; AAA-level criteria (mention AA is the floor, don't chase AAA).

---

## Notes for downstream agents

- **WCAG version:** teach **WCAG 2.2 AA**, matching `Code conventions.md` and reality. The chapter outline says "2.1" but the touch-target criterion it cites (**SC 2.5.8 Target Size (Minimum)**) is a **WCAG 2.2** addition — 2.1 had no minimum-target-size criterion at AA. Using "2.1" here would be internally inconsistent and outdated. Verified in fact-check; do not "correct" back to 2.1.
- **Deliberate divergences from a strict mechanics treatment:** this lesson intentionally stays at recognition depth for every call-site technique (per the chapter-outline scope). That is not under-teaching — the depth lives in the linked lessons. Keep code samples minimal: short `Code` snippets and inline `<code>`, not `AnnotatedCode`/`CodeVariants` walkthroughs (there is no single complex file to dissect). The teaching weight is in the four interactive/visual figures and the two exercises, not in code blocks.
- **Reuse, don't redefine** the Lesson 1 mental models and terms (the "you own the code" through-line, semantic tokens, the shadcn dividend, `compound component`, `headless primitive`). The "shadcn dividend" framing recurs in three sections — keep it consistent with L1's establishment.
- Respect the ~800px diagram-height cap and the horizontal-layout preference for all four figures.
