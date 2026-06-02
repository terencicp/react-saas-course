# Lesson outline — Chapter 021, Lesson 4

## Lesson title

- **Title:** Pseudo-classes and the `:has()` parent selector
- **Sidebar label:** Pseudo-classes and `:has()`

---

## Lesson framing

This is the **"what's behind the colons"** lesson. Lesson 3 closed by teasing it by name. The student has been *writing* `hover:`, `focus-visible:`, `disabled:`, `placeholder:`, `has-[…]:`, `group-*`, `peer-*` at call sites since ch018 (variant grammar), ch019 (Preflight reset, opacity), and ch021 L1–L3 (typography, color, the focus ring on every card). They can type the variant; they do not yet know **what each pseudo-class matches, when the browser sets it, and why one is the senior reflex over its look-alike.** This lesson supplies the model under the prefix.

**The single most important boundary** (resolve up front so downstream agents don't drift): ch018 L4 already taught the *Tailwind variant machinery* — the `&:hover {…}` desugaring, the "whose state?" five-family map (self / `group` parent / `peer` sibling / `has` descendant / position), `data-*`/`aria-*` variants. **This lesson does not re-teach that machinery.** It teaches the **CSS pseudo-classes as browser primitives** — the *semantics* of the colon. The variant prefix is the form the student writes; the pseudo-class is what fires. Frame every concept as "the browser sets this state on the element under these conditions; the Tailwind variant lets you style it." Reuse the ch018 L4 desugaring as a one-line recall hook (`hover:` ≈ `&:hover`), never re-derive it.

**Two headline payoffs carry the lesson** — both are decision/stakes moments, not syntax:
1. **`:focus-visible` is the keyboard-only focus reflex.** The senior reason isn't aesthetic — it's that bare `:focus` paints a ring on *every mouse click*, which designers then delete, which destroys keyboard accessibility. `:focus-visible` is the browser's heuristic that resolves the tension: ring for keyboard, none for mouse. This is the "why your button shows an ugly ring after you click it" fix, and it's the single most consequential pseudo-class in app UI.
2. **`:has()` is the parent selector that retired a generation of JS.** Styling a `<form>` when an input inside is invalid, a label-card when its checkbox is checked, a card differently when it contains an image — each was a `useState` + class-toggle observer in 2022 and is one selector in 2026. Frame `:has()` as **deleted state**, not new syntax: every `:has()` reach is React state you no longer mirror into the DOM.

**Mental model the student leaves with:** *Interaction and structure are facts the browser already tracks on the element. A pseudo-class is the name of that fact; the variant prefix is how you read it. Reach for state (`useState`) only when no pseudo-class can match.* This extends ch018 L4's spine ("can the DOM already tell me this?") down into the CSS layer.

**Staging constraint that shapes the whole lesson:** static screenshots cannot show `:hover`, `:focus-visible`, or `:has()` reacting — these states only exist under live interaction. So the centerpiece teaching vehicles are **live `ReactCoding` target-match exercises** (the student hovers/focuses/checks and watches the style fire) and **two lesson-specific live components**. ch018 L4's continuity confirms every variant here is a *built-in v4 variant* that resolves under the `ReactCoding` Tailwind Play CDN with no `@theme` — lean on this hard. DevTools "force element state" is taught as the senior workaround for inspecting these states without juggling input devices.

**Cognitive-load order** (simple → complex): start with the interaction pseudo-classes the student half-knows (`:hover`/`:active`), promote `:focus-visible` as the reflex, widen to `:focus-within` (parent-of-focused), then form-state pseudo-classes, then the two big payoffs (`:has()`, `:not()`), then the placeholder pseudo-elements, closing on the touch-device gate and DevTools. Structural pseudo-classes are compressed to recognition (gap + divide retired them — ch020/L3 hook).

**Scope discipline (cut from the brainstorm):** structural pseudo-classes get one short recognition section, not a teaching section (`gap`/`divide-*` retired them). `:link`/`:visited` fold into one short paragraph (privacy-locked, rare in app UI). `::file-selector-button` is named once, not dwelt on. `group-*`/`peer-*` are *cross-referenced* to ch018 L4, not re-taught — they appear only to show they ride the same pseudo-classes. No `::before`/`::after`/`::marker` (recognition mention at most). No form-validation flow, no ARIA depth, no container-query relational state.

---

## Lesson sections

### Introduction (no header)

Open on the senior question, concretely, three rungs of escalating payoff (mirrors the chapter-outline framing):
- Styling a button on hover is `hover:bg-accent` — the student already does this.
- Styling it on *keyboard* focus only is `focus-visible:ring-2` — and here's the catch they've hit: bare `:focus` rings on every click.
- Styling a whole `<form>` when any input inside is invalid was a `useState` + class toggle in 2022, and is `has-[input:invalid]:border-destructive` in 2026.

State the lesson goal: the student has been writing these prefixes for three chapters; now they learn **what the colon means** — what the browser sets, when, and which pseudo-class is the reflex. Name the two anchors: `:focus-visible` as the canonical focus reflex, `:has()` as the parent selector that deleted a generation of JavaScript. Connect back: "ch018 L4 taught you the variant *grammar* — `hover:` wraps the utility in `&:hover`. This lesson is the other half: what `:hover` (and its siblings) actually *are*." Keep warm and brief. Tease the end state: by close, the student reads any `:state` in a shadcn className and knows what fires it.

One framing `Aside` (note): a pseudo-class is a selector for a state the browser maintains on an element (`:hover`, `:checked`); a pseudo-element (`::placeholder`, `::selection`) targets a sub-part of the element the markup doesn't expose. Both ride the colon, hence the lesson title's grouping. (Sets up the placeholder section later.)

---

### The interaction pseudo-classes: `:hover`, `:active`, and the focus trio

**Goal:** install the five interaction pseudo-classes and land *which fires when*, building to `:focus-visible` as the reflex.

Teach as a set, simplest first:
- **`:hover`** — pointer is over the element. No-op on touch (the gate is its own section later). The student knows this one; spend one line.
- **`:active`** — element is being pressed *right now* (mouse down, or finger down). The pressed-feedback state. Fires on touch *and* mouse-press. Canonical reach: `active:scale-95` for tactile button feedback (forward-hooks ch021 L5's transforms — name it, don't teach it).
- **`:focus`** — the element has focus, *from any source* (Tab key, mouse click, or `.focus()`). This is the trap: it fires on click too.
- **`:focus-visible`** — the element has focus **and the browser heuristically decided a focus indicator should be visible** — i.e. keyboard/programmatic focus, not a plain mouse click. This is the reflex on every button, link, and input.

**This is the load-bearing teaching moment of the section.** Make the `:focus` vs `:focus-visible` distinction concrete with stakes:
- The historical tension: bare `:focus` rings appear on every mouse click, look noisy, so teams delete the ring entirely — which removes the *keyboard* user's only "where am I" signal. An accessibility regression born from an aesthetic complaint.
- `:focus-visible` resolves it: the browser's own heuristic shows the ring for keyboard/AT users and suppresses it for mouse clicks. You get the clean look *and* the accessible behavior, no trade-off.
- The discipline line (carry from ch021 L3 verbatim-compatible): `focus-visible:` is the course default; bare `focus:` is the bug. Preflight already strips the default UA outline, so *something* must restore a visible focus state — make it `:focus-visible`.

**Component — live `ReactCoding`, `live` mode, target-match.** Two buttons: one styled with `focus:ring-2 ring-ring`, one with `focus-visible:ring-2 ring-ring`. Instruction: "Click each button, then Tab to each. Watch which shows a ring on click vs. only on keyboard." The student *feels* the difference (the whole point — a screenshot can't show it). The target is the `focus-visible:` button. This is the section's centerpiece; it must be live so hover/click/Tab actually fire. CDN resolves `focus:`/`focus-visible:`/`ring-*` natively.

Then the canonical button reflex string, read as one piece (consistent with ch021 L3's full-card string): `hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 active:scale-[0.98]`. Use **`CodeTooltips`** on this string to annotate each pseudo-class inline: `hover:` = pointer over, `focus-visible:` = keyboard focus, `active:` = pressed. Short inline defs — this is exactly `CodeTooltips`' job (hover defs on substrings of one block). Note the `ring-*`/`outline-none` are ch021 L3's focus-ring mechanics (the *geometry* — why rings don't reflow); this lesson owns the *pseudo-class* (when it fires).

`Term` candidates here: "focus heuristic" (definition: the browser's internal rule deciding whether focus came from keyboard/AT vs. a plain click), "assistive technology" (recall from ch018 L4 — re-gloss briefly).

---

### `:focus-within`: when the parent reacts to a focused child

**Goal:** the second focus pseudo-class — the parent-of-focused selector — and its canonical form-row reach.

- **`:focus-within`** matches an element when *it or any descendant* has focus. The canonical reach: a form row (label + input wrapper) that highlights its border or label when the input inside takes focus — without wiring an `onFocus`/`onBlur` pair into React state.
- Frame as the **upward** focus selector: `:focus`/`:focus-visible` style the focused element itself; `:focus-within` styles an *ancestor* of it. This is the first taste of "a parent reacting to a descendant," which `:has()` generalizes two sections down — plant the seed here explicitly ("`:focus-within` is a single-purpose parent selector; `:has()` is the general one").
- Tailwind form: `focus-within:`. Show on a wrapper: `focus-within:ring-2 focus-within:ring-ring`. This is *exactly* the shadcn input-group / command-palette pattern.
- Cross-reference, don't re-teach: ch018 L4 already covered `group-focus-within:` as part of the relational family. Name that `:focus-within` is what `group-focus-within:` reads up the tree; one line, with a pointer.

**Component — live `ReactCoding`, `live`, target-match.** A labeled input inside a bordered wrapper. Starter: plain wrapper. Target: wrapper gets `focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30`; the student adds the variant and Tabs into the input to see the whole row light up. Reinforces "no React state for a fact the browser tracks."

Stakes line: this is the cleanest example of `:has()`-family thinking deleting state — the 2022 version was `const [focused, setFocused] = useState(false)` plus two handlers; the 2026 version is one variant.

---

### Form-state pseudo-classes: `:disabled`, `:checked`, `:invalid`, and friends

**Goal:** the pseudo-classes the browser sets from *form-control state*, and the canonical disabled/checked patterns.

Teach as a grouped set (the browser maintains each from the control's property/attributes):
- **`:disabled`** — the control's `disabled` property is set. Canonical pattern (drill it): `disabled:opacity-50 disabled:pointer-events-none` — fades the control and stops it eating clicks. The opacity recall hook is ch021 L2 (`opacity-50` = the disabled reflex).
- **`:checked`** — checkbox/radio is checked. The headline reach is the **label-wrapped option card**: `has-[:checked]:border-primary` on the label so the whole card highlights when its radio is checked (this previews `:has()` — flag it: "`:checked` on the input, read by the card via `:has()`").
- **`:invalid` / `:required` / `:read-only` / `:placeholder-shown`** — browser-maintained validity/requirement/empty states. Keep these tighter — name what each matches, show `:invalid` as the one that matters (`has-[input:invalid]:border-destructive` on a form row). **Critical boundary:** validity here is "a pseudo-class the browser sets that you can *read*" — NOT form-validation flow (Constraint Validation API, `onSubmit`, server validation). That's Unit 6 (ch044). State this explicitly; ch018 L4 already drew the same line.
- **The attribute-driven companion** — cross-reference, don't re-teach. When state is set via *attribute* rather than DOM property (a library setting `aria-disabled` or `aria-invalid`), the form is `aria-disabled:` / `aria-invalid:` — ch018 L4's `aria-*` variants. One line: "property-set state → `:disabled`/`:invalid` pseudo-classes; attribute-set state → the `aria-*` variants from ch018 L4. Same idea, different source." Don't expand; pointer only.

**Component — live `ReactCoding`, `live`, target-match.** A radio-card group (3 label-wrapped radios). Target: selected card gets `has-[:checked]:border-primary has-[:checked]:bg-accent`. Student wires it and clicks between cards. This doubles as the `:has()` opener — but introduce the `has-[…]:` *prefix* properly in the next section; here it's a teaser ("notice the card reacts to a child — that's the next section"). (ch018 L4 used a near-identical radio-card `has-[:checked]:` exercise — keep this one *visually distinct*, e.g. pricing-tier cards, to avoid déjà-vu; flag for the writer.)

`Term` candidate: "Constraint Validation" (recall from ch018 L4 — re-gloss: the browser's built-in form-validity machinery; depth is Unit 6).

---

### `:has()`: the parent selector that deleted a generation of JavaScript

**Goal:** the lesson's marquee concept. `:has()` selects an element *by what it contains*. Frame the entire section as **deleted state**.

- **The model:** every selector before `:has()` reads *down or sideways* — you style an element by its own state or its ancestors'. `:has()` is the first selector that lets an element react to its **descendants** (and, with combinators, later siblings). `el:has(.x)` = "an `el` that contains a matching `.x`." Reuse ch018 L4's desugaring as the one-line hook: `has-[…]:` ≈ `&:has(…)` — recall, don't re-derive.
- **Why it's a senior milestone — the stakes, not the syntax.** Walk three canonical reaches and name the JavaScript each one *deletes*:
  - `has-[input:invalid]:border-destructive` on a form row — *was* a validity observer + `setState` + conditional class.
  - `has-[:checked]:bg-accent` on a label-card — *was* an `onChange` mirroring `checked` into React state.
  - `has-[img]:p-0` on a card (vs. `p-6` when it has no image) — *was* a prop check + conditional className, or a separate component.
  Each: "the DOM already knows. `:has()` reads it. The React state was always a mirror of a DOM fact." This is ch018 L4's spine ("can the DOM already tell me this?") at full strength.
- **Tailwind forms:** `has-[<selector>]:` takes any selector in the brackets. `group-has-[<selector>]:` reads "an ancestor marked `group` that contains the match" — the parent-of-group reach (cross-ref ch018 L4's `group`, one line). Recognition only; the inner `has-[…]:` is the workhorse.
- **Browser support fact (state plainly, keep coherent):** `:has()` is **Baseline since December 2023** — universally supported across current Chrome, Safari, Firefox, Edge with no polyfill. A senior reaches for it without checking caniuse. (Verify in fact-check step.)

**Component A — `DiagramSequence` (lesson-specific, "deleted state" before/after).** Three steps, each a side-by-side panel: left = the 2022 React (`useState` + handler + `cn()` conditional, shown as a short greyed code snippet via `Code`), right = the 2026 one-liner (`has-[…]:` className). Steps: (1) form-row-invalid, (2) checked-card, (3) card-with-image. Pedagogical goal: make "deleted state" *visceral* — the student watches lines of React vanish into one selector across three cases. This is the section's anchor visual; the before/after contrast is the entire point, which is `DiagramSequence`'s sweet spot (temporal/comparison scrub). Don't wrap in `Figure` (self-carded).

**Component B — live `ReactCoding`, `live`, target-match.** A card that contains an image vs. one that doesn't, same className on both: `has-[img]:p-0 p-6 …`. Two cards render; one has an `<img>`, one doesn't; the *same* class string produces padded vs. flush. Student writes the `has-[img]:` variant. This is the most surprising `:has()` reach (one className, two layouts from content alone) — high "aha" value, and it can't be shown statically. CDN resolves `has-[…]:` natively (ch018 L4 confirms).

**Watch-outs (inline, in this section — not bundled):**
- `:has()` *chains* (`:has(input:checked):has(.required)`) but readability falls off fast — past two conditions, flatten into a `data-*` attribute you set once and read with `data-[…]:` (ch018 L4). Frame as a readability ceiling, not a capability limit.
- `:has()` does **not** reach inside shadow DOM (`<select>` option lists, some native widgets). The chapter trusts the form library (Unit 6) for those — one line, pointer.

`Term` candidates: "Baseline" (definition: the web-platform support bar — a feature works across all current major browsers; "Baseline 2023" = since that year), "shadow DOM" (definition: an encapsulated DOM subtree a browser or component hides from outside selectors — e.g. native form-control internals).

---

### `:not()`: styling the exception

**Goal:** the negation pseudo-class, in service of "don't apply this state to the wrong element."

- **`:not(<selector>)`** matches elements that do *not* match the inner selector. Tailwind form: `not-*:` (the `*` is replaced by the negated state, e.g. `not-disabled:`, `not-first:`). Recall ch018 L4: `not-*` was named there as part of the positional family; here it gets its *own* treatment as a primitive ("the inner selector is anything, not just position").
- **The canonical reach — the disabled-hover trap.** A `hover:bg-accent` button still fires hover on a *disabled* button in some browsers, producing a hover style on a control the user can't use. The fix: `not-disabled:hover:bg-accent` — hover only applies when the button is *not* disabled. This is the single most useful `:not()` reach in app UI; lead with it. Pair with the disabled-section watch-out: disabled controls don't reliably receive `:hover` — combine `disabled:` (for the off state) with `not-disabled:hover:` (for the live hover), never rely on disabled-hover.
- Secondary reach (recognition): `not-first:` / `not-last:` for sibling resets (`not-last:border-b` row divider — ch018 L4's canonical divider idiom; one line, pointer) — but note `gap` + `divide-*` (ch020/ch021 L3) retired most of these.

**Exercise — `Dropdowns` (fenced code, fill-in-the-blank).** A button className with two blanks: the hover variant and the not-disabled guard. Options force the choice between `hover:bg-accent` and `not-disabled:hover:bg-accent`, and between including/omitting `disabled:opacity-50`. Quick, low-cost check that the student internalized the disabled-hover trap. (Drill-level; the heavy lifting is the live `ReactCoding`s above.)

---

### The placeholder and selection pseudo-elements

**Goal:** the two pseudo-*elements* every input/text surface needs, and why they exist (the markup doesn't expose these sub-parts).

- Reset the pseudo-class vs. pseudo-element distinction from the intro `Aside`: these target a *part* of the element, not a *state*. Hence `::` (two colons) in raw CSS, though Tailwind's variant prefix hides that.
- **`::placeholder`** — the placeholder text inside an empty input. `placeholder:text-muted-foreground` is the senior reflex on *every* text input. **The stakes:** the placeholder pseudo-element does **not inherit `color`** the way you'd expect — without `placeholder:`, the placeholder renders at the input's full text color and looks like a real typed value, not a hint. This is a real, common bug; lead with it. (Recall the token: `text-muted-foreground` from ch018 L5 / ch021 L2.)
- **`::selection`** — the highlighted range when the user selects text. `selection:bg-primary selection:text-primary-foreground` for branded text-selection color. Optional polish; one example.
- **`::file-selector-button`** — name once as "the button inside `<input type=file>`," recognition only. Don't dwell.

**Component — live `ReactCoding`, `live`, target-match.** An `<input>` with a placeholder. Starter has none of the pseudo-element styling; the placeholder looks like real text (the bug, visible). Target applies `placeholder:text-muted-foreground`. Student fixes it and sees the placeholder recede to a hint. The "looks like a typed value" bug is only visible live — perfect target-match. (Note for writer: `text-muted-foreground` is a CDN-resolvable arbitrary-free utility only if a token is defined; per ch021 L2 continuity the CDN can't ingest `@theme`, so use a CDN-safe stand-in like `placeholder:text-slate-400` in the *exercise* and flag in-prose that app code uses `placeholder:text-muted-foreground`. Same deliberate-divergence pattern ch021 L1–L3 used.)

`Term` candidate: "pseudo-element" (definition: a selector targeting a part of an element the HTML doesn't expose as its own node — the placeholder text, the selection highlight, generated `::before` content).

---

### Structural and link pseudo-classes: a quick recognition pass

**Goal:** one compact section so the student *recognizes* these without thinking they're daily tools. Deliberately short — this is the cut content the brainstorm flagged.

- **Structural** — `:first-child`, `:last-child`, `:nth-child(n)`, `:empty`. State plainly: **mostly retired in 2026** because `gap` (ch020) and `divide-*` (ch021 L3) replaced the "space/separate siblings" use that drove them. `:empty` survives for empty-state styling (a list container that shows a placeholder when it has no children). `:first-of-type`/`:last-of-type`/`:nth-of-type` are recognition only. Tailwind forms (`first:`, `last:`, `nth-*:`, `empty:`) named, ch018 L4 pointer.
- **Link** — `:link` (unvisited) and `:visited`. One short paragraph: `:visited` exists but is **privacy-locked** — browsers allow only a tiny property set to change on visited links (`color`, `background-color`, `border-color`, `outline-color`, a few SVG props) so a page can't probe a user's history via computed style. Rare in app UI (where links are nav, not content); common in long-form prose. Recognition only.
- **`:target`** — name in one line (matches the element whose `id` is in the URL hash); recognition only, points to "hash-driven UI."

Keep this section to ~3 short paragraphs. No exercise, no component — the signal is "these are real but not your reflexes; gap and divide did the work."

---

### Forcing element state in DevTools

**Goal:** the senior debugging move — inspect `:hover`/`:focus`/`:focus-visible`/`:active`/`:target` without juggling mouse and keyboard.

- The problem this solves: you can't hover an element *and* read its hover styles in the Styles panel at the same time — moving the mouse to DevTools drops the hover. And `:focus-visible` is near-impossible to pin by hand.
- The move: Chrome/Edge DevTools → Elements → Styles panel → **`:hov`** button (Toggle Element State) → tick `:hover`, `:focus`, `:focus-visible`, `:active`, `:target`. The pseudo-class is forced on; the styles render and stay put for inspection. Firefox/Safari have the equivalent.
- Frame as the standard reflex when "a hover/focus style doesn't look right" — force the state, read the computed styles, find the conflicting rule. This is the *practical* counterpart to everything taught above: the lesson taught what fires the state; this is how you freeze it to debug.

**Component — `Screenshot` (or `Figure` with an annotated screenshot).** One annotated shot of the DevTools "Toggle Element State" panel with the checkboxes called out. Pedagogical goal: the student knows exactly where the button lives — a one-time "here's the button" payoff. If a clean current-Chrome screenshot isn't available to the writer, fall back to a short `Steps` list describing the click path; flag this choice.

---

### Consolidation

**Goal:** retrieval practice across the lesson's two axes — *which pseudo-class fires when* and *which is the reflex*.

- **`Buckets` (two-column).** Sort pseudo-classes by **who holds the state / what it reacts to**, reinforcing the lesson's organizing idea. Buckets: "The element itself" (`:hover`, `:focus-visible`, `:active`, `:disabled`, `:checked`, `:invalid`) vs. "An ancestor reacting to a descendant" (`:focus-within`, `:has(…)`). Items are the pseudo-classes. This cements the upward-vs-self distinction that threads through the lesson (`:focus` self → `:focus-within`/`:has()` upward).
- **`MultipleChoice` ×2** — the two decision moments:
  1. "Your button shows a focus ring every time you click it with the mouse. What's the fix?" → choices isolate `:focus` (the bug) vs. `:focus-visible` (the reflex) vs. deleting the ring (the regression). Tests the headline payoff #1.
  2. "You're mirroring a checkbox's checked state into `useState` only to add a border to its card. What replaces it?" → `has-[:checked]:` vs. keep the state vs. an `onChange` rewrite. Tests headline payoff #2 (`:has()` = deleted state).

Closing line: tease ch021 L5 — "These pseudo-classes flip styles *instantly*. Next you'll make those flips *move* — transitions and keyframes, the motion layer." (Consistent with the L3→L4 teaser style.)

---

## Scope

**This lesson teaches:** the interaction pseudo-classes (`:hover`, `:active`, `:focus`, `:focus-visible`, `:focus-within`) with `:focus-visible` as the canonical focus reflex; the form-state pseudo-classes (`:disabled`, `:checked`, `:invalid`, `:required`, `:read-only`, `:placeholder-shown`); `:has()` as the parent/descendant selector and the JS it deletes; `:not()` (the `not-*:` form) and the disabled-hover trap; the `::placeholder` / `::selection` pseudo-elements (and `::file-selector-button` by name); a recognition pass on structural (`:first-child`/`:nth-child`/`:empty`) and link (`:link`/`:visited`/`:target`) pseudo-classes; DevTools force-element-state. The through-line: a pseudo-class names a fact the browser already tracks; reach for `useState` only when no selector matches.

**Explicitly out of scope (do not teach — cross-reference where noted):**
- **The Tailwind variant *machinery*** — desugaring (`hover:` → `&:hover`), the "whose state?" five-family map, `data-*`/`aria-*` variants, the `group-*`/`peer-*` mechanics. **Owned by ch018 L4.** This lesson reuses the desugaring as a *recall hook* and points to ch018 L4 for `group-*`/`peer-*`/`aria-*`; it never re-derives them. (Prereq the student already has — keep references to one line.)
- **The focus-ring *geometry*** — `outline` vs. `border` (why rings don't reflow), `ring-*` as box-shadow layers, `outline-offset`. **Owned by ch021 L3.** This lesson owns *when* `:focus-visible` fires; L3 owns *what the ring is made of*. Reference, don't re-teach.
- **`opacity` mechanics** (compositing, stacking context) — ch021 L2. Here `opacity-50` is just the disabled reflex; one pointer.
- **`transition-*` / motion / `motion-reduce:`** — ch021 L5. `active:scale-*` is *named* at the call site as a forward hook, not taught.
- **Form-validation flow** — Constraint Validation API, `required`/`pattern`/custom validity at depth, `onSubmit`, `noValidate`, server validation — Unit 6 (ch044 L7). `:invalid`/`:required` here are *only* "pseudo-classes the browser sets that `:has()` can read."
- **Accessibility at depth** — ARIA roles, live regions, focus management/traps, the WCAG focus-visibility commitment — Chapter 027. Only the *styling seam* (`:focus-visible`, `aria-*` pointer) appears here.
- **Container-query relational state** — ch021 L7.
- **The full pseudo-element set for content insertion** — `::before`/`::after` (generated content), `::marker` (list bullets) — recognition mention at most; the chapter doesn't dedicate space (ch018 L1 named `before:`/`after:` as a bespoke-CSS boundary).
- **`:target`-driven UI, drag-and-drop pseudo-states** — recognition/out of scope.

**Prereqs assumed (one-line re-glosses only, do not re-teach):** Tailwind variant grammar and `group-*`/`peer-*`/`has-*`/`data-*`/`aria-*` families (ch018 L4); the focus ring `ring-*`/`outline` utilities (ch021 L3); semantic tokens `bg-accent`/`border-destructive`/`text-muted-foreground`/`ring-ring` (ch018 L5, ch021 L2); `opacity-50` as the disabled fade (ch021 L2); Preflight stripping the default focus outline (ch019 L3); `gap`/`divide-*` retiring sibling-spacing selectors (ch020, ch021 L3).

---

## Code conventions notes (for downstream agents)

- **Semantic tokens in prose/app-code examples** (`bg-accent`, `border-destructive`, `ring-ring`, `text-muted-foreground`, `border-primary`) — Code conventions §tokens; ch018 L5 / ch021 L2 reflex. **Deliberate divergence in live `ReactCoding` exercises:** the Tailwind Play CDN can't ingest `@theme`, so exercises substitute CDN-resolvable equivalents (`bg-slate-100`, `border-blue-500`, `ring-blue-500/50`, `text-slate-400`) and an in-prose note flags that app code uses the semantic token. This is the same intentional staging ch021 L1–L3 used — do **not** "correct" it.
- **`focus-visible:` is the course default** for focus rings (never bare `focus:`) — Code conventions §focus, ch018/ch021 L3. The lesson *teaches why*, so bare `:focus` appears only as the explicitly-labeled anti-pattern in the focus-trio section and MultipleChoice.
- **Variants over inline conditionals** (`has-*`, `not-*`, `aria-*` read DOM state, not React state) — Code conventions §407. This lesson is the deepest articulation of *why* for the pseudo-class half; keep `useState` framed as the considered last resort.
- **Deliberate divergence — static state simulation:** `:hover`/`:focus-visible`/`:has()` cannot fire in a static `Code` block or screenshot. Where a non-live illustration is unavoidable (e.g. the `DiagramSequence` before/after code panels), the "after" className is shown as the *literal string* with prose explaining what fires — not a rendered live state. Flag any such block as intentional, mirroring ch021 L3's `FocusRingShift` permanent-class note.
- **No template-literal class concatenation; `cn()` for conditional composition** (ch018 L3) — relevant only in the `DiagramSequence` "before" (2022) panels, which deliberately show the *old* `cn()`-conditional pattern being deleted. Mark these as the anti-pattern being retired, not the recommended shape.
