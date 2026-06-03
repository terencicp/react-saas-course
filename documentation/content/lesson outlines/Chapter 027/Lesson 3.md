# No ARIA is better than bad ARIA

- Title (h1): No ARIA is better than bad ARIA
- Sidebar label: ARIA done right

## Lesson framing

This is L3 of Ch 027 (shadcn/accessibility baseline). L2 closed with "semantic HTML first, ARIA second" and planted "ARIA only changes what's announced, never behavior." This lesson pays that debt: it teaches the **four ARIA surfaces a SaaS engineer actually reaches for in 2026** — roles, labels, descriptions, live regions — gated behind the first rule of ARIA.

Senior framing (the spine): native HTML + shadcn primitives already cover ~90% of accessibility for free. ARIA is the *narrow remaining slice* — and it is the slice most likely to do harm, because, unlike everything else the student has learned, ARIA can make an interface **worse** while looking "more accessible." The mental model to install: **ARIA changes what assistive tech announces; it never changes behavior.** `role="button"` on a `<div>` does not make it keyboard-operable — it just lies to the screen reader. This single sentence is the lesson's load-bearing idea; every section reinforces it.

Pedagogical decisions for the lesson as a whole:

- **Open with stakes, not theory.** Lead with the 2026 WebAIM Million finding: home pages *with* ARIA average ~59 detected errors vs ~42 without. The intuition flip — "more ARIA correlates with *less* accessible" — is the hook that earns the first rule. This is the pain point: well-meaning juniors reach for ARIA first and ship regressions.
- **Mental model before mechanics, repeatedly.** Every ARIA surface is introduced as "what problem does native HTML leave open here?" so ARIA always arrives as a *last resort with a named trigger*, never as a default. This matches the course's "trigger before tool" filter.
- **Lean hard on the shadcn dividend (established L1/L2).** Reframed for ARIA: every Radix primitive in `components/ui/` already wires roles + `aria-*`. The student's ARIA job shrinks to two things: (1) supply labels for controls with no visible text, (2) announce *their own* live state. Keep the surface small and honest — recognition-only on the vast role taxonomy (tab/grid/combobox/tree), since the primitive owns it.
- **Minimize cognitive load via decision trees, not enumerations.** Two notoriously-confused trios — labels (content / `aria-label` / `aria-labelledby` / `aria-describedby`) and hidden helpers (`sr-only` / `aria-hidden` / `hidden`) — are taught as "who needs to perceive this?" decision questions, then drilled with an interactive walker + a sort, not memorized as tables.
- **The live-region pre-mount rule is the single most cited live-region bug** — give it a `DiagramSequence` so the student *sees* why an empty-then-filled region announces but a conditionally-rendered one does not. This is the highest-leverage diagram in the lesson.
- **Code is illustrative, short, real.** Most snippets are tiny `Code` blocks of the exact JSX the student will write (icon button, live region, `useId` wiring). One `AnnotatedCode` for the live-region attribute contract. One `ReactCoding` tests-graded exercise on the icon-only button (the highest-frequency real-world miss). One `CodeVariants` before/after for the pre-mount bug.
- **Tone:** terse, adult, production-framed. No moralizing about accessibility — it is a quality bar like type-safety, already established L2. Frame misuse as *bugs that strand users*, with concrete failure modes ("the screen reader announces nothing," "focus lands somewhere the user can't hear").

Continuity (must reuse, not redefine): **the shadcn dividend**, **"semantic HTML first, ARIA second"** (the first rule), **"ARIA changes announcement, not behavior"** (planted L2), `useId` (Ch 024 owns), `<Term>` for ARIA already defined L2 — do not re-`<Term>` it. WCAG **2.2** AA is the floor (not 2.1). Forward debts to plant, not pay: focus order/`aria-hidden`-on-focusable interaction → L4; form `aria-invalid`/`aria-describedby` at depth → Ch 044; toast library setup → recognition only here.

## Lesson sections

### Introduction (no header)

Per pedagogical structure: warm, brief, states goal + stakes + connection to prior knowledge.

- Open on the counterintuitive data: the 2026 WebAIM Million report — pages with ARIA average **more** accessibility errors than pages without. Use it to motivate, not to scold. The takeaway the student should feel: ARIA is a power tool that cuts both ways.
- Name the goal: by the end you can reach for the *four* ARIA surfaces a SaaS engineer uses (roles, labels, descriptions, live regions) and, more importantly, know when **not** to.
- Connect to L1/L2: "You just learned semantic HTML is the first move and shadcn primitives ship correct ARIA. This lesson is the other 10% — the custom widgets and live state the primitive doesn't cover."
- Preview the practical skill: label an icon-only button correctly, announce a 'Saved' toast and a search-result count to a screen reader, and wire help text to an input. These are concrete things the student writes in every project from Ch 028 on.
- Set the size expectation: "Most of your ARIA will be a handful of attributes. The skill is restraint."

### The one rule that prevents most ARIA bugs

Teaches **the first rule of ARIA** and the behavior-vs-announcement model — the conceptual core. Everything else hangs off this.

- State it from the source (WAI-ARIA Authoring Practices / APG): *"If you can use a native HTML element with the semantics and behavior you need, use it"* — and the maxim **"No ARIA is better than bad ARIA."**
- Install the mental model explicitly: **ARIA only changes what assistive tech announces. It never adds behavior — not keyboard handling, not focus, not click.** This is the sentence to repeat.
- The canonical demonstration: `<div role="button" onClick={...}>Save</div>`. Walk the failure: the screen reader now says "Save, button," so a screen-reader user *expects* Enter/Space to work — but the div is inert to the keyboard. ARIA wrote a promise the markup doesn't keep. The fix is **not** `tabIndex` + key handlers stacked on the div — it's `<button>`. Native elements bring keyboard, focus, and role together; ARIA brings only the label/role half.
  - Use a small `CodeVariants` here: tab 1 = the `role="button"` div (annotate "lies to the screen reader, dead to the keyboard"), tab 2 = `<button>` (annotate "role + keyboard + focus, free"). Before/after is the clearest possible vehicle for "ARIA ≠ behavior."
- Reinforce the L2 link: this is *why* semantic-HTML-first isn't style preference — it's the only path that keeps announcement and behavior in sync.
- Close by scoping the lesson: native HTML + shadcn cover the floor; ARIA is for four narrow jobs. Enumerate them as a one-line preview of the four body sections (custom-widget roles you mostly *don't* write, labels for unlabeled controls, descriptions for help/errors, live regions for async state). This becomes the lesson's table of contents in the reader's head.

Diagram: the `CodeVariants` above is the figure for this section; no separate box diagram needed — the contrast *is* the teaching.

`<Term>` candidates: **assistive technology** (define briefly — screen readers, switch devices, magnifiers; "AT" abbreviation), **WAI-ARIA** / **APG** (WAI-ARIA Authoring Practices Guide, the W3C spec the rules come from). Do **not** re-Term "ARIA" (defined L2).

### Roles: the few you write, the many the primitive owns

Teaches **the role cut** — which roles a SaaS engineer actually authors vs. which shadcn already handles. Goal: shrink the student's perceived responsibility surface and prevent role-soup.

- Frame: a `role` overrides an element's *implicit* semantics for AT. HTML5 elements already carry implicit roles (`<button>`→button, `<nav>`→navigation, `<main>`→main). So most explicit roles you'd type are **redundant** with a semantic element — and redundancy is the cheap end of "bad ARIA."
- The reframed shadcn dividend (reuse the term): every Radix/Base primitive wires the complex roles for you — a `DropdownMenu` is `menu`/`menuitem`, `Tabs` is `tablist`/`tab`/`tabpanel`, `Dialog` is `dialog`. **You do not write these.** Recognition only — name the taxonomy exists so the student recognizes it in the primitive's source (the source-is-docs thread from L1), then move on.
- The short list a SaaS engineer *does* write, and only these:
  - `role="status"` and `role="alert"` — deferred to the live-regions section (just forward-reference here so the list is complete).
  - `role="presentation"` / `role="none"` (synonyms) — strip a wrapping element's implicit semantics, e.g. a `<ul>`/`<table>` used purely for layout so AT doesn't announce "list, 3 items" / table navigation that means nothing. The trigger: you reused a semantic element for layout and its announcement is noise. (Note the senior-correct move is usually *don't* use the semantic element for layout — but `presentation` is the escape hatch when you inherit such markup.)
  - Landmark roles (`banner`, `navigation`, `main`, `contentinfo`) — name them as the explicit equivalents of `<header>`/`<nav>`/`<main>`/`<footer>` and state the rule: **prefer the element; the role is for the rare case you can't change the tag.** Cross-ref landmarks → Ch 017.
- Watch-out (inline, at the concept): adding `role` to compensate for a non-semantic element instead of swapping the element — restate the first rule applied to roles.

Code: one tiny `Code` block showing `<ul role="list">` is *not* needed; instead show the `presentation` escape hatch on an inherited layout `<table role="presentation">` with a one-line comment. Keep it to ~4 lines. No diagram — this section is a *cut* (what you don't do), best served by prose + the dividend reframe.

`<Term>` candidates: **implicit role** (the role an element has by default, before any `role` attribute), **landmark** (a region role AT users jump between — banner/nav/main/contentinfo).

### Naming controls a screen reader can read

Teaches **the labeling mechanisms** as a precedence chain and a decision, anchored on the canonical real-world case: the icon-only button. Highest-frequency ARIA task in a shadcn codebase.

- Frame the problem: every interactive control needs an **accessible name** — the string AT announces. Sighted users read the visible text; AT needs that text to *be* the name or to be supplied another way.
- The four mechanisms, taught as **precedence (one wins, never stack)**: `aria-labelledby` > `aria-label` > visible text content > `title`. Teach them in the order you reach for them, bottom-up:
  1. **Visible text content** — the default and best: `<button>Save</button>`, `<a>Settings</a>`. The name *is* the text. Reach for this whenever there's visible text.
  2. **`aria-label`** — supply a name when there is **no** visible text. The icon-only button case (next bullet).
  3. **`aria-labelledby={id}`** — point at another element's text as the name, when the label already exists elsewhere on screen (a section labeled by its heading: `<section aria-labelledby="billing-h"><h2 id="billing-h">Billing</h2>`). Pairs with `useId` for the id.
  4. **`title`** — mention only to say *don't rely on it* for naming (tooltip-only, inconsistent AT support, no touch/keyboard surface).
  - Cross-ref `<label htmlFor>` for form controls → Ch 017 owns; name it as the *form-specific* labeling mechanism so the student doesn't think `aria-label` is for inputs.
- **The icon-only button — the canonical case**, named loudly because it recurs in every modal, drawer, toast, table row:
  - `<Button size="icon"><X /></Button>` from shadcn announces **"button"** and nothing else — the user has no idea what it does. Two correct fixes, taught as equivalent:
    - `aria-label="Close"` on the `<Button>`, **or**
    - a visually-hidden child: `<Button size="icon"><X /><span className="sr-only">Close</span></Button>`.
  - **Lucide-specific correction (verified June 2026):** Lucide v1 ships every icon with `aria-hidden="true"` *by default*. So the `<X />` is already correctly hidden from AT — the student does **not** add `aria-hidden` to it. The label goes on the **button**, never the icon (per Lucide's own guidance: the interactive element owns the name). This corrects the chapter outline's older "Lucide defaults to no role" framing — author to the v1 default.
- Use a small `AnnotatedCode` (or two stacked `Code` blocks) on the icon-button: step 1 the broken version (announces "button"), step 2 the `aria-label` fix highlighting the attribute, step 3 the `sr-only` alternative highlighting the span. Keep prose ≤6 lines/step.

Exercise — **`ReactCoding`, tests-graded** (this is the section's keystone, the real-world miss): give a starter with an icon-only close button and a toolbar of icon buttons missing names. Instructions: "Give every icon-only button an accessible name." Tests assert `button[aria-label]` is present and non-empty on each (and/or an `.sr-only` text node). `hidePreview` since it's about the DOM not visuals. Grading: each button must expose a non-empty accessible name; bonus assertion that the visible-text button was *not* given a redundant `aria-label` (teaches "one wins, don't stack").

`<Term>` candidates: **accessible name** (the string AT announces for a control), **`sr-only`** (Tailwind utility — visually hidden, still in the AT tree; full treatment in the next section).

### Help text and descriptions with `aria-describedby`

Teaches **descriptions** — the third surface. Short section; establishes the wiring, defers depth to Ch 044.

- Distinguish *name* (what the control is) from *description* (extra context AT reads *after* the name): help text, format hints, error messages.
- The mechanism: `aria-describedby="hint-id error-id"` — space-separated list of ids; AT reads each referenced element's text after the label. `<input aria-describedby={hintId} /> <p id={hintId}>We'll never share your email.</p>`.
- **`useId` is the canonical reach** for the ids (cross-ref Ch 024 owns the hook): labels/descriptions in separate elements need ids stable across SSR and client — hand-written ids collide when a component renders twice. Show `const hintId = useId();` wiring once. Use `CodeTooltips` on `useId()` for a one-line inline reminder of what it returns (a stable unique string), so the flow isn't interrupted.
- Plant the forward debt explicitly: form-field errors wire `aria-describedby` *plus* `aria-invalid`, and the announcement-on-validation pattern, at depth in **Ch 044** — here we only establish the description wiring. Keep the example a benign help text, not an error, to avoid stepping on Ch 044.
- Watch-out (inline): leaving a **stale** `describedby` id pointing at an element that's been emptied — AT reads an empty description, or worse a removed node. Rule: the referenced element and the reference live and die together. (This connects to the live-region cleanup watch-out later.)

Code: one short `Code` block, the input + hint + `useId`. No diagram.

`<Term>` candidates: none new (`useId` is Ch 024's, reference by name).

### Hiding the right things from the right audiences

Teaches **the `sr-only` / `aria-hidden` / `hidden` decision** as the single question "who needs to perceive this?" Three audiences, three tools. This is the other notoriously-confused trio.

- Frame the three audiences a piece of content can serve: **sighted users**, **AT users**, **everyone / no one**. Each tool serves a different combination:
  - **`sr-only`** (Tailwind) → visible to AT, hidden from sighted users. For text that gives AT context a sighted user gets from layout/icons: skip-link text, the icon-button label alternative, "Showing results for…" context. *In the AT tree, off the screen.*
  - **`aria-hidden="true"`** → hidden from AT, visible to sighted users. For purely **decorative** visuals that would be noise: a decorative `<img>`, an icon *next to a visible label*. *On the screen, out of the AT tree.*
  - **`hidden` / `display:none`** → hidden from **everyone**. Content not currently relevant to anyone (a collapsed panel's contents). *Off the screen, out of the AT tree, out of layout.*
- **Decorative vs meaningful icons** — the everyday application:
  - `<Mail /> Send` — the icon is decorative; the word "Send" carries meaning. With Lucide v1 this is **already** `aria-hidden` by default — nothing to do. (Reinforce the L→ icon-button section: default-hidden is the right default.)
  - A standalone `<Mail />` icon button is *meaningful* — but you don't un-hide the icon; you name the **button** (`aria-label="Compose"`). Tie back: the name lives on the interactive element, the icon stays decorative. This resolves the apparent paradox cleanly.
- **The trap that strands users — `aria-hidden` on a focusable element.** Critical watch-out, taught at the concept (and it forward-links L4): if you put `aria-hidden="true"` on (or around) something focusable — a button, a link, an input — keyboard focus can still land there, but AT announces *nothing*. The user is stranded on an invisible control. Rule: **never `aria-hidden` a focusable element or an ancestor of one.** (L4 revisits this with focus order.)

Exercise — **`StateMachineWalker`, `kind="decision"`**: "Which tool hides this correctly?" Root question: "Who should perceive this content?" Branches lead through 4–5 realistic leaves:
  - decorative icon beside a label → `aria-hidden` (or rely on Lucide default)
  - skip-link / icon-button label text → `sr-only`
  - a collapsed accordion panel's body → `hidden`
  - "Showing 12 of 134" context the sighted user infers from the list → `sr-only`
  - a focusable button you want to "hide" → **trap leaf**: don't `aria-hidden` it; remove it from the DOM or make it truly inert. Each leaf's body states the rule and the failure mode of the wrong pick.

Reinforcement drill — **`Buckets`** (two-column): sort ~8 items into `sr-only` / `aria-hidden` / `hidden` buckets. Items mix the clear cases (decorative divider, screen-reader skip text, off-DOM modal-not-open content) so the student practices the audience question at speed. Place the Buckets after the walker as the "now do it fast" follow-up.

`<Term>` candidates: **`aria-hidden`** (removes an element and its subtree from the AT tree), **AT tree / accessibility tree** (the parallel tree AT consumes, derived from the DOM) — one brief Term, since it underpins all three tools.

### Announcing what only sighted users can see

Teaches **live regions** — the fourth and most mechanically subtle surface. The lesson's center of gravity. Goal: the student can make an async change (toast, save indicator, result count) audible, and avoids the pre-mount bug and the assertive-overuse bug.

Structure as: the problem → the attribute contract → the pre-mount rule (diagram) → `status` vs `alert` cut → the shadcn/Sonner dividend → the common SaaS surfaces.

- **The problem.** A sighted user *sees* a toast appear, a "Saved" badge flip, a result count change. An AT user perceives none of it unless you announce it. Live regions are how the DOM tells AT "this changed, read it."
- **The four-attribute contract** — teach with an `AnnotatedCode` on a minimal live region, one step per attribute:
  1. `aria-live="polite"` (announce when the user is idle) vs `"assertive"` (interrupt immediately). **Polite is the default reflex; assertive only for genuine, must-not-miss errors.**
  2. `aria-atomic="true"` — announce the whole region on any change, vs just the changed node. Use `true` when the message only makes sense whole ("Saved 3 of 5").
  3. `role="status"` (implies `aria-live="polite"` + `aria-atomic="true"`) and `role="alert"` (implies `assertive` + atomic) — the shorthands that set the right combo. Teach roles as the *preferred* form; you rarely hand-set `aria-live` once you know the role shorthands.
  4. **The region must exist in the DOM *before* the content arrives.** AT *monitors* registered live regions; it does not announce a region that mounts with content already inside.
- **The pre-mount rule — the highest-leverage diagram in the lesson.** `DiagramSequence`, two tracks side-by-side or sequential, showing AT's perspective over time:
  - *Correct track:* step 1 — empty `<div role="status">` mounts, AT registers it (silent). step 2 — `setMessage('Saved')`, text inserted, AT *detects the mutation* and announces "Saved." 
  - *Broken track:* step 1 — region absent (`{msg && <div role="status">{msg}</div>}` renders nothing). step 2 — `msg` becomes truthy, region mounts *with text already inside*; AT sees a new node appear, not a mutation in a watched region → **announces nothing** (or unreliably). 
  - The pedagogical goal: make the invisible timing visible. The student must *see* that announcement keys off a mutation *inside an already-watched region*, which is non-obvious and the #1 cause of "my live region doesn't work."
  - Pair with **`CodeVariants`** right after: tab "Broken — conditional render" (`{error && <div role="alert">…</div>}`) vs tab "Fixed — always-mounted region" (`<div role="alert">{error}</div>` — region always present, content toggled). Annotate each with the AT consequence. This is the concrete code the diagram explains.
- **`role="status"` vs `role="alert"` — the severity cut.** The misuse axis: `alert` interrupts whatever AT is reading, every time. Overuse turns the screen reader into a slot machine (reuse this vivid framing). The cut:
  - `status` (default reach): "Saving…", "Search returned 12 results", "Draft autosaved", "Copied to clipboard."
  - `alert` (reserve for genuine, time-sensitive failures): "Session expired", "Payment failed", "This field is required" (the last one at form-submit time → Ch 044).
  - A small classification visual or just a tight two-column table in prose; consider folding this into the `Buckets`/`MultipleChoice` exercise below rather than a static figure.
- **The shadcn / Sonner dividend (verified June 2026).** shadcn's default toast is **Sonner** (the old `Toast` component is **deprecated** — name this so the student recognizes legacy code). Sonner renders one persistent live region at the app root and injects toast content into it — **the pre-mount rule is already satisfied for you.** Your job collapses to choosing severity: `toast.success("Saved")` vs `toast.error("Payment failed")`. Recognition only on setup (forward to a future chapter); the *discipline* is picking the right call. This is the payoff of the whole section: you understand the machinery so you can trust the primitive and reach past it when you build a *non-toast* live region yourself.
- **Common SaaS live-region surfaces** — concrete catalog so the student recognizes the pattern in the wild:
  - Toasts → Sonner, handled.
  - Search/filter result count → `role="status"` in the results header, announced after a filter ("Showing 12 of 134"). This one you build yourself — the canonical "reach past the primitive" case.
  - Optimistic-mutation indicator → "Saved" badge as `role="status"`; rollback announcement ("Couldn't save, reverted") on failure. Name optimistic UI in one line; Ch 043/060 own depth.
  - Inline form error → `role="alert"` by the field, populated on validation failure → Ch 044 owns depth.

Exercise — **`MultipleChoice`** (multi-select) on severity: present ~5 messages ("Payment failed", "Search returned 8 results", "Session expired", "Draft saved", "Required field"), ask which warrant `role="alert"`. Multi-correct auto-switches to multi-select. This drills the `status`-by-default reflex precisely. (Alternatively a `Buckets` status/alert sort — pick `MultipleChoice` for tighter focus on the *alert is the exception* judgment.)

`<Term>` candidates: **live region** (a DOM region AT watches for changes and announces), **`role="status"`** / **`role="alert"`** (the polite/atomic and assertive/atomic shorthands), **Sonner** (shadcn's default toast library, 2026). Optionally **optimistic UI** if not assumed — but keep to one line and reference forward; likely no Term to avoid scope creep.

### Putting the four surfaces together (closing synthesis)

Short consolidation, not a new concept. Re-anchors the lesson on the first rule and the shrunken surface.

- One-screen recap: native + shadcn = the floor; ARIA's four jobs = roles (mostly the primitive's), labels (yours, on unlabeled controls), descriptions (yours, help/errors), live regions (yours, async state). For each, the one trigger sentence.
- The closing reflex to install: **before adding any `aria-*`, ask "does a native element or my shadcn primitive already do this?" — if yes, that's the bug, fix the markup.** Restate "no ARIA is better than bad ARIA" as the thing they carry forward.
- Optional `<ExternalResource>` LinkCards: the WAI-ARIA APG (`w3.org/WAI/ARIA/apg`), MDN ARIA guide, and the WebAIM Million report (closes the loop on the opening hook with real data). Keep to 2–3.

No exercise here (exercises live in their concept sections, per pedagogical guidance). This section is the cool-down + forward bridge: name that **L4 (Where focus belongs)** picks up the focusable-`aria-hidden` trap and focus order next.

## Scope

**Prerequisites — redefine in one line only, do not re-teach:**
- Semantic HTML + the first rule's origin → established **L2** and **Ch 017**. Reference "semantic HTML first" by name.
- The shadcn dividend / primitives wire ARIA → **L1/L2**. Reuse the term, don't rebuild it.
- `useId` mechanics → **Ch 024 owns**. Use it; one-line reminder via `CodeTooltips` only.
- `<label htmlFor>` for form controls → **Ch 017 owns**. Name as the form-labeling mechanism; don't drill.
- `sr-only` as a Tailwind utility exists from the styling unit — define its *AT semantics* here (that's this lesson's job), not the utility plumbing.
- ARIA, focus trap, vestibular disorder, contrast — `<Term>`'d in **L2**; don't redefine.

**Deliberately out of scope (belongs to other lessons — plant, don't teach):**
- **Focus order, tab order, the DOM-order rule, focus traps, route-change focus, `tabindex` management, the focusable-`aria-hidden` interaction at depth → L4 (Where focus belongs).** This lesson *plants* the focusable-`aria-hidden` trap as a watch-out but does not teach focus management. Keep the boundary crisp: L3 = what AT *announces*; L4 = where focus *is*.
- **Form-field accessibility at depth — `aria-invalid`, error announcement on validation, the describedby+invalid pairing, post-submit focus-to-error → Ch 044.** L3 establishes only the `aria-describedby` *wiring* with benign help text. Do not build a validating form.
- **Four-state UI (loading/empty/error/populated) and the accessibility pairing per state → L5.** L3 names live regions; L5 applies them to the loading/error states. Don't pre-teach skeleton/empty/alert here.
- **Toast library setup/configuration → recognition only here, depth in a later chapter.** Name Sonner as the default and that it self-mounts the region; don't show install/provider setup.
- **The full WAI-ARIA role taxonomy (tab, grid, combobox, tree, listbox, menu…) → out of scope, recognition only.** The primitive owns these; name that they exist, teach none.
- **Screen-reader-specific behavior across NVDA / JAWS / VoiceOver → out of scope.** Teach the spec contract, not per-AT quirks (mention "support varies" only where it changes a recommendation, e.g. `title`).
- **axe / Lighthouse in CI → Ch 095.** May mention axe DevTools as a local check in passing (consistent with L2) but no CI surface.
- **Optimistic mutations at depth → Ch 043 / Ch 060 / the server-state chapter.** One-line mention as a live-region surface only.

## Notes for downstream agents

- **Deliberate divergence from chapter outline (do not "correct"):** Lucide v1 (verified June 2026) ships icons `aria-hidden="true"` *by default* — the outline's "Lucide icons default to no role; you decide per call site" is stale. Teach: decorative icons are already handled; for icon-only buttons the label goes on the **button**, not the icon; never manually `aria-hidden` a Lucide icon (it already is). Source: lucide.dev/guide/react/advanced/accessibility.
- **Verified currency:** shadcn default toast = **Sonner**; old `Toast` is **deprecated** (shadcn docs/changelog, 2026). "No ARIA is better than bad ARIA" + the first rule phrasing trace to the WAI-ARIA APG. WebAIM Million 2026: ARIA-present pages average more detected errors (~59 vs ~42) — use as the opening hook.
- **WCAG 2.2 AA** is the floor per Code conventions and L2 continuity — never write 2.1.
- Keep code blocks tiny and real (the exact JSX the student writes). One `AnnotatedCode` for the live-region contract, one `CodeVariants` for the pre-mount before/after, one `CodeVariants` for `role="button"` div vs `<button>`, one `ReactCoding` (tests) for icon buttons. Components: `Code`, `AnnotatedCode`, `CodeVariants`, `CodeTooltips`, `DiagramSequence`, `StateMachineWalker` (decision), `Buckets`, `MultipleChoice`, `ReactCoding`, `Term`, `ExternalResource`.
