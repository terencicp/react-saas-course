# Attributes vs. properties: parsed state vs. live state

- Title: Attributes vs. properties: parsed state vs. live state
- Sidebar label: Attributes vs. properties

## Lesson framing

This is L2 of a substrate-only chapter (vanilla JS/TS, zero JSX/hooks — hold this line; the React side is named as forward reference only).
L1 installed the spine: "HTML source is a byte snapshot the parser saw once; the DOM is live program state" (the photograph-vs-running-program framing). This lesson is the direct payoff of that spine: it explains *why* a `value` attribute and a `value` property disagree — the debt L1 opened and named but did not explain.

The single mental model the whole lesson serves: **an attribute is a string the parser captured at load time; a property is a typed, live value on the node object the runtime reads and writes.** They are two different storage slots that *sometimes* sync, *often* diverge, *occasionally* differ in type, and *frequently* differ in name. Everything else (boolean traps, hydration mismatches, JSX prop naming, `dataset`) is a consequence of that one split.

Pedagogical priorities, in order of weight:
1. **The split itself** — attribute = parsed snapshot, property = live value. Make this concrete and visceral with the `<input>` typing demo before any taxonomy.
2. **The four canonical patterns** — the recognition vocabulary (identical-name / renamed / default-vs-current / attribute-or-property-only). This is the load-bearing payload; a senior reads any HTML/JSX attribute and instantly knows which bucket it's in.
3. **Boolean attributes** — the highest-frequency real-world footgun (`disabled="false"` still disables). Presence semantics.
4. **The JSX recognition payoff** — `className`, `htmlFor`, `tabIndex` are the *property* names speaking through React, not React inventions. This is the senior-mindset reframe that makes the lesson stick and pays forward to Unit 3.

Why this matters / senior framing: the student will spend their career writing JSX, never `setAttribute`. So why teach the DOM split? Because the abstraction leaks in exactly four production places, and each is illegible without this model: hydration-mismatch console errors, the `defaultValue`-vs-`value` controlled/uncontrolled decision, boolean-attribute bugs, and `data-*`/`dataset` for state-driven Tailwind variants and delegation. The lesson's job is to install the vocabulary that makes those leaks *legible* later, not to drill an API the student will type daily. Frame every primitive as "rare reach, recognize it" per the chapter's trigger-before-tool stance.

Where beginners struggle / get wrong:
- They assume `getAttribute('value')` reflects what the user typed. It doesn't — that's the canonical confusion this lesson dissolves.
- They write `setAttribute('disabled', false)` expecting it to enable. It disables (string `"false"` is a present value).
- They coerce attribute strings to booleans (`Boolean(getAttribute('disabled'))`) and get `true` for `"false"`.
- They think JSX renamed `class`→`className` arbitrarily, so they never transfer DOM knowledge to JSX (or vice versa).

Cognitive-load management: introduce the simplified model (two slots) first via one demo, *then* layer the four patterns one at a time, *then* the two special cases (boolean presence, enumerated canonicalization), *then* the React leak sites last. Never front-load the taxonomy. Each pattern gets a tiny concrete example, not an abstract rule.

Visual strategy: the split is fundamentally a "two storage slots, one node" picture — a custom HTML/CSS diagram of a single node box with an "Attributes (parsed strings)" shelf and a "Properties (live typed values)" shelf is the strongest single visual and should anchor the lesson. The typing demo is best as a `DiagramSequence` (scrub through: initial parse → user types → read both sides). The four patterns are a natural `Buckets` classification exercise. Boolean traps and the coercion footgun are perfect `PredictOutput` material.

Code samples are vanilla DOM JS/TS (single quotes, 2-space, `const`+arrow, per conventions). The DOM property/attribute API *is* the subject here, so `getAttribute`/`setAttribute`/`.value`/`.disabled` appear at the call site deliberately — this is one of the rare lessons where the imperative DOM surface is the lesson, not an anti-pattern. Note this divergence for downstream agents: unlike most course code, these samples are intentionally imperative DOM manipulation because that is precisely the substrate being taught.

## Lesson sections

### Introduction (no header)

Open with the senior question, concretely (per pedagogical guidelines — the senior question is implicit in the intro, not a section). Scenario: a user types "hello" into a text input. Inspect it. The page's View-Source still shows `<input value="">`. But `input.value` returns `'hello'`, while `input.getAttribute('value')` returns `''`. Which one is the truth? Both — they track different things. State the lesson's goal: install the model that explains every form bug, every `defaultValue`-vs-`value` decision, and every hydration-mismatch error the student will hit in React. Connect explicitly back to L1's spine ("source is the snapshot, DOM is live state") — this lesson is that idea applied to a single node's data. Keep it warm and brief, 2-3 short paragraphs.

### Two slots on every node: the parsed string and the live value

Teach the core model in its simplest form before any taxonomy. One node carries (at least) two parallel stores for many of its data points:
- The **attribute**: the string the HTML parser read out of the source and recorded when it built the node. Reached via `getAttribute(name)` / `setAttribute(name, value)` / `removeAttribute(name)` / `hasAttribute(name)`. Always a string (or `null` when absent).
- The **property**: a named field on the live element object, with a real type (string, boolean, number, object). Reached via `element.propName`.

Anchor with the **central diagram** here — pedagogical goal: make "two slots, one node" spatial and memorable so every later pattern hangs off it. A custom HTML/CSS figure (devtools-inspectable, matches the conventions' "layout concepts rendered with real CSS" preference) inside `<Figure>`: a single rounded node box labeled `<input>`, split into two horizontal shelves — top shelf "Attributes — parsed strings (`getAttribute`)" listing `value="hello"` style string entries; bottom shelf "Properties — live typed values (`.value`)" listing typed entries. A subtle connector/arrow between a synced pair, and a visibly *broken* connector between `value` (the diverging pair) to foreshadow default-vs-current. Keep it horizontal and short (vertical-space constraint).

Then the **typing demo** as a `DiagramSequence` (pedagogical goal: show the divergence happening *over time*, which a static diagram can't). Steps the student scrubs:
1. Parse time: `<input value="">` → both attribute `''` and property `''` agree.
2. User types `hello`: the property updates to `'hello'`; the attribute is untouched, still `''`.
3. Read both: `input.value` → `'hello'` (live), `input.getAttribute('value')` → `''` (snapshot).
4. Punchline: the attribute is the *initial* value the parser saw; the property is the *current* live value. Neither is wrong.

Land the one-line model explicitly as a callout (`Aside` note): attribute = parsed snapshot at load time; property = live typed value the runtime mutates.

`Term` candidates in this section: "reflect" (defined: when writing one side auto-updates the other) — used later, define on first use.

### The four ways an attribute and a property relate

The recognition payload. Frame as: once you know an attribute and a property *exist* for a given thing, there are only four ways they can relate. Learning to instantly classify any HTML attribute into one of these four buckets is the senior skill this lesson installs. Introduce each as an h3, one at a time, each with a tiny concrete example (use `Code` blocks — these are short and don't need stepped annotation; reserve `CodeTooltips` for the renamed table where the rename mapping benefits from inline hover).

#### Identical name, kept in sync

`id`, `hidden`, `lang`, `title`. Same name on both sides; reading or writing either side stays synced (these *reflect*). The reflex: just use the property in code (`el.id = 'x'`), it's typed and live. Tiny example reading/writing `id` both ways and showing they agree.

#### Renamed properties: why JSX says className

The payoff pattern. The DOM property is renamed (usually to camelCase, or to dodge a JS reserved word) even though the attribute keeps the HTML spelling. The canonical table:
- `class` → `className` (`class` is a reserved word)
- `for` → `htmlFor` (`for` is a reserved word)
- `tabindex` → `tabIndex`
- `readonly` → `readOnly`
- `maxlength` → `maxLength`
- `cellpadding`/`rowspan`-style → camelCase (mention pattern, don't enumerate exhaustively)

Present as a compact two-column reference (attribute → property). Consider `CodeTooltips` on a small JSX snippet (`<label htmlFor="email" className="block">`) where hovering `htmlFor` and `className` reveals "this is the DOM *property* name, not a React invention" — this is the highest-value recognition moment in the lesson. **The reframe to land hard:** JSX prop names follow the *property* side because JSX assigns to properties, not attributes. So `className` and `htmlFor` are not React quirks to memorize — they are DOM property names the student now already knows. This is the senior-mindset connection that makes the chapter pay forward to Unit 3. State it explicitly. (Verified June 2026: `className`/`htmlFor` remain required in React 19 — `class`/`for` are not accepted as element props.)

#### Default vs. current: value, checked, selected

The most consequential pattern (drives the entire controlled/uncontrolled story later). Pairs:
- `value` (attribute = initial) vs. `.value` (property = current); the dedicated `.defaultValue` property exposes the attribute side as a property.
- `checked` vs. `.checked` / `.defaultChecked`
- `selected` vs. `.selected` / `.defaultSelected`

The attribute is the *initial* value the parser saw; the property is the *live current* value. After user input or a programmatic `.value = …`, they diverge — exactly the intro demo. Call back to the `DiagramSequence`. Then the forward bridge (recognition only, do not teach React): React's `defaultValue` prop writes the *attribute* (initial, uncontrolled); React's `value` prop writes the *property* (controlled). So when Unit 6's forms lesson distinguishes controlled from uncontrolled, the student should recognize it as a *consequence of this platform split*, not a React invention. One sentence, flagged as forward reference.

#### Attribute-only and property-only

Some data lives on only one side.
- **Property-only** (no attribute exists): `textContent`, `innerHTML`, `nodeName`, `tagName`, `value` of computed cases. You can't `getAttribute('textContent')`.
- **Attribute-only / attribute-canonical**: `aria-*` attributes have **no property mirror** — `aria-label` is *always* `getAttribute('aria-label')` / `setAttribute(...)`. (Forward-ref ARIA semantics to L6 of ch017; recognition only here.)
- **The `dataset` bridge** (`data-*`): gets its own section below because it has a rename rule worth its own treatment.

After all four h3s, the **classification exercise** — `Buckets`, `twoCol`. Goal: active recall that the student can sort real attributes into the four patterns. Buckets: "Identical / synced", "Renamed property", "Default vs. current", "One side only". Items (inline-code chips): `id`, `className`/`class`, `htmlFor`/`for`, `value`, `checked`, `tabIndex`, `aria-label`, `textContent`, `readOnly`, `hidden`. Place this immediately after the four patterns to consolidate before moving to the special cases.

### Boolean attributes: presence is the value

Highest-frequency footgun, so it earns its own section with an exercise. The rule: for boolean attributes (`disabled`, `checked`, `readonly`, `required`, `hidden`, `multiple`, `selected`), the browser cares only whether the attribute is **present or absent** — the *value string is ignored entirely*. So `disabled=""`, `disabled="disabled"`, and `disabled="false"` all **disable** the element; only *removing* the attribute enables it. The property side, by contrast, is a real typed boolean (`el.disabled === true`).

Spec-accuracy note for the writer (verified against the WHATWG HTML Living Standard, June 2026): a boolean attribute's *valid* value is the empty string or a case-insensitive match of its own name, so `disabled="false"` is technically *invalid markup* an HTML validator flags — yet every browser still treats the attribute as present, hence disabled. Frame `"false"` as a double trap: non-functional AND invalid. Do not imply `disabled="false"` is legal HTML.

The two reflexes:
- Raw DOM: set the property (`el.disabled = false`) — typed, intuitive — or `removeAttribute('disabled')`. Never `setAttribute('disabled', 'false')`.
- JSX (recognition/forward-ref): you pass a boolean (`disabled={isLoading}`) and React translates to presence/absence for you.

**Exercise — `PredictOutput`** (pedagogical goal: make the footgun bite in a safe place so it never bites in production). A short vanilla script that logs the surprising results, e.g.:
```
input.setAttribute('disabled', 'false');
console.log(input.disabled);          // true  (present = disabled)
console.log(input.getAttribute('disabled')); // 'false'
console.log(Boolean(input.getAttribute('disabled'))); // true  (non-empty string)
```
Expected output is three lines; `PredictWhy` explains presence semantics and the string-coercion trap (`Boolean('false') === true`). This single exercise covers two watch-outs (presence semantics + boolean coercion footgun) at once.

### Enumerated attributes: the browser picks a legal value

Briefer section (one pattern, recognition-level). For enumerated attributes like `<input type>`, the property returns a *canonicalized, spec-legal* value, not the raw parsed string. `<input type="numbr">` → `getAttribute('type')` returns `'numbr'` (what was parsed) but `.type` returns `'text'` (the spec's fallback for an unrecognized value). The takeaway: the *property is the engineered/normalized value the browser will actually act on*; the *attribute is the raw bytes*. Tiny `Code` example. Reinforces the spine one more time from a different angle (parsed-vs-resolved).

### data-* and the dataset bridge

`data-*` is the one attribute family with a *typed, ergonomic* property mirror: `dataset`. `<div data-user-id="42">` is read as `el.dataset.userId`. The rename rule: strip the `data-` prefix, kebab-case → camelCase. Show the round-trip in a `Code` block (`data-user-id` ↔ `dataset.userId`; setting `el.dataset.userId = '7'` writes the attribute back). Values are always strings (it's an attribute store underneath).

Why a senior reaches for `data-*` in 2026 (frame the three reaches, keep recognition-level):
- **State-driven Tailwind variants** — `data-[state=open]:…` styles read DOM state, not React state (this is the conventions' "state-driven styling reads DOM state" rule; cite lightly). Forward-ref.
- **Event-delegation discriminators** — a handler routes on `target.closest('[data-action]').dataset.action`. This is the direct setup for **L3** (delegation) — name it as the bridge to the next lesson.
- **Test selectors** — `data-testid`. Recognition only.

The student writes `data-*` in JSX and reads it as `dataset.*` in delegation handlers — say this explicitly to close the loop between authoring and reading.

### Reading both sides in DevTools

Short, practical, closes the lesson on a debugging skill (callback to L1's "Elements panel is the live tree"). The Elements panel's right rail has an **Attributes** view (the parsed strings) and a **Properties** subpanel (the full live property surface of `$0`). The senior debugging move: when an attribute *looks* right but the page misbehaves (or vice versa), check the *other* side — the bug is almost always the attribute/property divergence this lesson named. Tie back to the intro scenario: inspect the typed input, see `value=""` in Attributes but `value: "hello"` in Properties. A `Screenshot` of the two panes side by side would help if a clean capture is available; otherwise describe the panel locations in prose. Mention `$0.value` vs `$0.getAttribute('value')` in the Console as the fastest manual probe (reuses L1's `$0`).

### Where this leaks in a React codebase (recognition, not instruction)

Consolidating closer. Pull the four leak sites together so the student leaves knowing *why they learned this*. Keep each to 1-2 sentences, all recognition/forward-ref — teach no React:
- **JSX prop naming** (`className`, `htmlFor`, `tabIndex`) is the property side speaking — already landed, restate as the first leak.
- **`defaultValue` vs `value`** decides uncontrolled vs controlled — Unit 6 forms.
- **Hydration-mismatch errors**: React renders server HTML (attributes), then hydrates against the live DOM (properties); boolean-attribute and `value`/`checked` mismatches are the canonical bug class. This is the L1 debt ("hydration mismatch = snapshot-vs-live gap") now made precise — explicitly close that debt. Forward-ref Unit 4. (Verified June 2026: React 19 still surfaces attribute/property divergence as a hydration error, with `suppressHydrationWarning` as the documented one-level escape hatch — name only if useful, do not teach.)
- **Controlled input with a server-rendered `value`** warns in console — recognition only.

Optional `MultipleChoice` or `TrueFalse` round here to self-check the leak-site recognition (e.g., "`setAttribute('disabled', 'false')` enables the button — T/F"; "`className` is a name React invented — T/F"). Keep it to 3-4 statements; this is reinforcement, not the main exercise.

### External resources (optional)

`ExternalResource` cards: MDN "Attributes vs. properties" / the HTML spec's reflection section (recognition-level only — the per-element reflection table is explicitly NOT lesson material), and the React DOM attributes reference (the `className`/`htmlFor` list) as a forward-looking bridge. One or two cards max.

## Scope

Prerequisites to redefine concisely (already taught, do NOT re-teach):
- The DOM-as-live-tree spine and the photograph-vs-program framing (L1) — restate in one line in the intro only.
- `getElementById`/`querySelector`, the node hierarchy, `$0`, DevTools Elements panel (L1) — used freely, not re-explained.
- HTML parsing builds the DOM (010 L2), DevTools/`$0` (010 L3, 006 L3) — established prerequisites, reuse without teaching.

Explicitly out of scope (do not teach):
- Tree structure, node hierarchy, query methods — L1.
- The event model, delegation, `closest()` in handlers — L3 (name `data-*` as the delegation *discriminator* and bridge, but do not teach delegation here).
- React controlled-vs-uncontrolled components — Unit 6 owns forms; this lesson installs the platform *why*, named as forward reference only.
- The full hydration/SSR story — Unit 4; install only *why* mismatches happen.
- `style` as `CSSStyleDeclaration` at depth — Chapter 019 (CSS/tokens). Mention `style`-string-vs-`style`-object only if needed as a one-line attribute-vs-property-type example; do not go deep.
- ARIA semantics — ch017 L6; `aria-*` named only as an attribute-only (no property mirror) case.
- The `dataset` API beyond recognition + the rename rule — deeper delegation use is L3.
- Per-element reflection rules / the spec's IDL-attribute table — recognition vocabulary only; the spec table is explicitly not chapter material.
- No JSX/hooks/React syntax in code samples — chapter is substrate-only (vanilla JS/TS). All React mentions are prose-level forward references.

## Code conventions notes

- Vanilla DOM JS/TS: single quotes, 2-space indent, semicolons on, `const` + arrow functions, trailing commas multiline (per Formatting section).
- **Deliberate divergence:** these samples use imperative DOM APIs (`getAttribute`, `setAttribute`, `.value`, `.disabled`, `dataset`) directly. This is intentional — the imperative DOM surface IS the subject of this lesson, not an anti-pattern to avoid. Downstream agents should not "modernize" these into JSX.
- The few JSX snippets used purely for the recognition payoff (`<label htmlFor=… className=…>`, `disabled={isLoading}`) use double quotes inside JSX attributes per conventions, and are illustrative prose-level only — never wired into runnable exercises (the chapter is substrate-only).
- `data-*` / `aria-*` usage aligns with the conventions' state-driven-styling rule ("Variants over inline conditionals … State-driven styling reads DOM state, not React state") — cite lightly as the real-world reach, do not teach Tailwind here.
