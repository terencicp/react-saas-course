# Lesson 4 — Custom properties and the three-tier token model

- **Title (h1):** Custom properties and the three-tier token model
- **Sidebar label:** Custom properties & tokens

---

## Lesson framing

This is the chapter's synthesis lesson and the *why* under everything Chapter 018 taught.
Across Ch018 the student wrote `bg-card`, defined `--color-brand` in `@theme`, and watched `.dark` swap a whole palette — but always as a *consumer* of machinery presented as magic.
This lesson opens that machinery: the magic is one primitive, the CSS custom property, and one architectural pattern stacked on top of it, the three-tier token model.

**The single mental-model shift to land:** a custom property is a *binding*, not a constant.
`--color-foreground` is not "the value `oklch(...)`" — it is a live reference that the browser re-resolves at every use site, every time the value under it changes, anywhere in its subtree.
That one reframe explains four things the student has already seen but couldn't yet explain: why `.dark { --color-foreground: ... }` on `<html>` repaints the entire app (Ch019 L2: custom properties inherit), why a Tailwind utility can change appearance with no rebuild (Ch018 L5), why JavaScript can repaint without a React re-render, and why a subtree can carry its own theme.
Everything in the lesson is a consequence of "binding, not constant."

**Two distinct topics, taught in this order — substrate, then architecture.**
First the *primitive* (custom properties: read, write, inherit, scope, live-update, the JS DOM API, the React inline-style shape).
Then the *pattern* (three tiers: primitive → semantic → component, naming, why components read the semantic tier).
The pattern only makes sense once the student feels the substrate, so the substrate must come first and must be made tangible — this is a `ParamPlayground`-heavy lesson because "binding, not constant" is something you *feel* by sliding a value and watching the cascade re-resolve, not something you read.

**Senior-mindset spine (foreground decisions, per Pedagogical guidelines §2):**
- Components read *semantic* tokens, never primitives — `bg-primary`, not `bg-blue-600`. Direct primitive use in a component is the smell this lesson inoculates against (Code conventions, Styling §: "Direct primitive use is a smell").
- Token *names describe purpose, not appearance* — `--color-destructive`, not `--color-red`. A red destructive button that turns orange next quarter shouldn't require renaming a token.
- Custom-property writes from JS are a *visual* channel, not a *state* channel — they bypass React; if a component needs to *know* the value, it stays in React state. Beginners reach for `setProperty` and then wonder why a component didn't re-render.
- Runtime tokens (multi-tenant brand color from server data) need a *pre-paint* write to avoid FOUC — same discipline as the `next-themes` inline script the student met in Ch018 L6.

**What the student should be able to do by the end:** read any `var(--token)` in the project and name which tier it belongs to and what overrides it; predict what a subtree override (`.dark`, `[data-org]`) does to descendants; write and read a custom property from JS and from a React `style={{}}`; explain why that write doesn't re-render React; and place a new token in the correct tier with a purpose-named identifier.

**Cognitive-load staging.** Build the primitive in three passes of increasing complexity: (1) a custom property is just a `--name`/`var()` pair you can read; (2) it *inherits and is live* (the binding reveal — the load-bearing pass); (3) you can *write* it — from a subtree selector, from JS, from React. Only then introduce the architecture. Never show the JS DOM API before the student has felt inheritance + liveness, or `setProperty` looks like a magic incantation instead of "writing the value the binding reads."

**Continuity guards (from Continuity notes + Ch018 reads):**
- The shipped `globals.css` uses `@import "tailwindcss"`, plain `@theme { ... }` (not `@theme inline`), and `@custom-variant dark (&:is(.dark *))`. Mirror exactly; do not "correct" the `:is()` form (L1 continuity note).
- Ch018 L2 already taught the `--{namespace}-{name}` → utility-family rule and that `@theme` extends defaults. **Do not re-teach it** — cross-ref and cash it in as "those `@theme` tokens are `:root` custom properties; here's what that *buys* you."
- Ch018 L5 already taught the dark-mode semantic swap and the naive `dark:`-on-every-element anti-pattern. **Do not re-teach** the swap mechanics — reference it as the canonical worked example of a subtree override and of the semantic tier.
- Ch019 L2 named "custom properties inherit" as the *why* `.dark` reaches everything but deferred the model here (L2 debt this lesson repays). Repay it explicitly.
- Ch019 L1 deferred dynamic `style={{}}` (runtime custom props) to this lesson (L1 debt). Repay it: inline `style` for a *static* conflict is a smell (L1), but inline `style` for a *dynamic per-instance value* is the correct and only tool.

**Components/exercises at a glance:** two `ParamPlayground`s (the binding reveal; the three-tier resolution chain), one `ReactCoding` (write a custom prop from React `style={{}}` + arbitrary-value utility), one `PredictOutput` (JS read-after-write, the string-with-whitespace gotcha), one `Buckets` (sort tokens into the three tiers), one custom lesson component (`TokenResolutionChain` — an `<ArrowDiagram>`-or-HTML figure of one utility resolving down through the three tiers), and `Term` tooltips. A `VideoCallout` only if a tight, current custom-properties-as-API explainer surfaces (resourcer's call; not load-bearing).

---

## Lesson sections

### Introduction (no header)

Open on the **runtime-write question** the chapter outline specifies, framed as three concrete senior questions the student can't yet answer despite a full chapter of Tailwind theming:
- Can JavaScript change a token *while the page is live*, and if so, does React need to know?
- Can one *section* of the page carry a different theme than the rest, without touching any component inside it?
- What *is* the thing a `var(--color-primary)` reference actually points at?

Tie each to something already seen: the `.dark` swap (Ch018 L5) repainted everything — *how?*; a brand-blue token (Ch018 L2) — could a customer set their *own*?
State the payoff: by the end the `var()` you've been writing on faith becomes a thing you can read, write, scope, and architect.
Name the boundary up front (one sentence, expanded in Scope): this is the substrate and the architecture, not color theory (Ch021) or animation (Ch021) or shadcn's exact list (Ch027).

Keep warm and brief (Pedagogical guidelines §3). The senior question is implicit in the three bullets, not labelled.

### A custom property is a binding, not a constant

The center of the lesson. Land "binding, not constant" before any API.

Define the primitive in one line, the course's compression style:
- Any property named `--*` is a custom property. You declare it on a selector; you read it with `var(--name, fallback)`.
- Build it up in the three passes named in the framing. Pass 1 (read): a trivial `--gap: 1rem` on a parent, `gap: var(--gap)` on a child — looks like a constant, deliberately underwhelming.
- Pass 2 (the reveal): it **inherits** through the DOM tree (repay the Ch019 L2 debt explicitly — "L2 told you custom properties are in the inheriting family; here's the consequence") and it is **live** — change the declared value and every `var()` that reads it recomputes, with no reload. This is where "constant" dies. Make the language precise: `var()` resolves *at use time*, against the *computed value of the custom property on that element*. Reuse the L1/L2 phrase "computed value" deliberately (Continuity terminology).

**Diagram — the binding, felt not read.** `ParamPlayground` (provides its own card; do **not** wrap in `<Figure>`).
- One slider drives `--accent` (a hue or a spacing value); the `<Preview>` contains *several* nested elements that each read `var(--accent)` in different properties (a background, a border, a piece of text).
- Pedagogical goal: sliding *one* control visibly updates *many* elements at once — the student sees inheritance + liveness + single-source in one gesture. This is the "constant can't do this" moment.
- Add a `<Readout>` echoing the raw value so the binding's current state is legible.
- Suffix the slider (`px`/`deg`) so the preview writes `var(--accent)` directly (ParamPlayground gotcha: bake the unit into `suffix`).

Close the section by connecting to Tailwind: cross-ref Ch018 L2 — every `@theme` token *is* one of these, sitting in `:root`, and every utility that consumes it (`bg-card`) is just a `var()` read. The student has been writing bindings the whole time. One-line watch-out: this is why **plain `@theme` (not `@theme inline`)** is what makes runtime overrides reach utilities — `@theme inline` bakes the literal value into the utility and severs the binding; the project uses plain `@theme` on purpose. (Minor addition beyond the chapter outline; load-bearing for "why subtree overrides work," verified against current Tailwind docs.)

Code handling: simple fenced `Code` for the `--gap`/`var()` pair (two tiny blocks, before/after is not needed — it's additive). The `ParamPlayground` carries the weight; prose stays short around it.

`Term` candidates: **custom property** (the spec name; "CSS variable" is the colloquial name — note they're the same thing once), **computed value** (re-explain concisely; prerequisite from L1/L2, defining it without breaking flow).

### Overriding tokens down the tree

The first *write* mechanism, and the one most aligned with what the student already saw.
Teach the senior pattern: **defaults on `:root`, overrides on a descendant selector.**
- `:root { --color-foreground: ... }` is the default; `.dark { --color-foreground: ... }` re-declares it for the dark subtree; the override flows down by inheritance and every `var()` below re-resolves.
- This is *exactly* the Ch018 L5 dark-mode swap — name it as such, do not re-derive it. The new framing: "you've already shipped a subtree override; here's the general shape."
- Generalize beyond `.dark`: a marketing section (`.marketing-hero { --color-primary: ... }`), a multi-tenant wrapper (`[data-org="acme"] { --color-primary: ... }`). Same mechanic, different selector. Multi-tenant branding is named as a *SaaS* use case (foregrounds production stakes) but flagged as a future custom build, not a shipped feature (Scope — Unit 9 introduces orgs).

Why this is the senior reflex and not per-element overrides: one declaration re-themes an entire subtree; the components inside change *nothing*. Connect back to the L1/L2 principle "tokens on `:root`/`.dark`" (Continuity, L2 best practices).

Watch-out: this works *because* utilities reference `var(--token)` (plain `@theme`), and *because* custom properties inherit — both already established, here paying off together. A `:root` vs `html` aside is in the chapter outline but is genuinely niche — fold into a single sentence at most (`:root` has one higher specificity point than `html`; irrelevant in practice because you don't fight yourself for this token), or cut. Lean toward cut to protect cognitive budget.

Code handling: `CodeVariants` is a strong fit here — tabs for **Default (`:root`)** / **Dark (`.dark`)** / **Per-tenant (`[data-org]`)**, each a small block showing the *same* token re-declared, prose naming what subtree it governs. Reinforces "one token, many scopes." Keep each variant ≤6 lines (CodeVariants constraint).

### Reading and writing tokens from JavaScript

The repay of the L1 dynamic-`style` debt and the "does React need to know?" question.
Introduce the DOM API as the imperative twin of the CSS you just wrote:
- **Write:** `element.style.setProperty('--brand', value)`.
- **Read:** `getComputedStyle(element).getPropertyValue('--brand')`.
- **Remove:** `element.style.removeProperty('--brand')`.
- Scope of the write *is* the element you call it on: `document.documentElement` for a global swap (the whole `:root`), a deeper node for a scoped one. Tie back to the previous section — JS `setProperty` on an element is the imperative version of declaring the token on that selector.

**The load-bearing senior point:** these writes update *pixels*, not React. A `setProperty` call repaints via the cascade with **no re-render** — that's a feature (a color-picker that drags smoothly, a slider-driven animation that doesn't thrash the React tree) and a trap (if a component must *read* the value to make a decision, the value has to live in React state too; the custom property is a one-way visual output). Frame in real stakes: a theme color-picker writes the property live for instant feedback *and* commits to React/persistence on release.

Use cases named (chapter outline): live theme color-picker; multi-tenant brand color written from server data via a **pre-paint inline `<script>` in `<head>`** to avoid FOUC (explicitly parallel the Ch018 L6 `next-themes` pre-paint script — same disease, same cure, recognition cross-ref only, no re-teach); slider-driven CSS animation.

Watch-outs (chapter outline, surfaced inline where each belongs, not bundled):
- `getPropertyValue` returns a **string, possibly with leading whitespace** — trim before comparing/parsing. This is the classic first bug; make it concrete.
- Custom properties are **case-sensitive** (`--Brand` ≠ `--brand`).
- `var()` fallbacks (`var(--x, 1rem)`) are rarely needed in a project that *owns* its tokens — name the syntax, note it's mostly for consuming tokens you didn't define.

**Exercise — `PredictOutput`** for the read-after-write + whitespace gotcha. Small program: set `--brand` to `' #2563eb'` (or read a value declared with surrounding space), read it back, `console.log` the raw string and its `.length` or a strict `===` comparison that *fails* because of whitespace. `<PredictWhy>` explains `getPropertyValue` returns the literal token text including whitespace; `.trim()` is the fix. Pedagogical goal: the string-channel reality lands as a *surprise the student debugged*, not a footnote. (PredictOutput withholds expected output on first wrong attempt — ideal for a gotcha.)

Code handling: `AnnotatedCode` for the color-picker handler — one block, stepped highlights on (1) the input event, (2) `setProperty` on `documentElement`, (3) the "and commit to React state on change/release" line, (4) the comment that no re-render happened. AnnotatedCode is right because the focus must move across *parts* of one handler to make the "visual vs state channel" distinction land (component-selection rationale per task spec). Keep ≤18 lines, blue tint default.

`Term` candidates: **FOUC** (flash of unstyled content — acronym, recognition cross-ref to Ch018 L6).

### Writing tokens from React with `style={{}}`

The component-author's form of the JS write — the React-idiomatic, declarative path.
Teach the shape: `style={{ '--card-padding': '1.5rem' }}` on a JSX element, paired with the **arbitrary-value utility** that reads it: `p-[var(--card-padding)]`.
- The pattern: a prop-driven, component-local token. A component takes a prop, projects it onto a custom property via inline `style`, and a utility reads it. The value can differ per instance — which is *exactly* what static utilities can't do.
- This is the repay of the L1 debt with the senior nuance made explicit: L1 said "never use inline `style` to win a *static* conflict." This is the legitimate inverse — inline `style` is the *correct and only* tool for a **dynamic, per-instance value**. State the contrast in one sentence so the two rules don't seem to clash.

**The arbitrary-value form** (`bg-[var(--name)]`, `w-[var(--name)]`): the bracket escape hatch for runtime variables and any property whose token isn't on a `@theme` namespace. Note it's *rare* in component code (most values come from semantic tokens) and *common* for genuine one-offs (a single element's width/transform driven by a variable). Don't oversell it — it's the exception, the semantic token is the rule.

**Exercise — `ReactCoding`** (target-match or tests). Student receives a `<Card>` that takes an `accent` prop; they wire `style={{ '--accent': accent }}` on the root and a `border-[var(--accent)]` (or `bg-[var(--accent)]`) utility on a child, so two cards render with different accents from the same component. Target-match mode (`live`) lets them *see* the two accents diverge; or a tests mode asserting the inline style and the resolved color. Pedagogical goal: feel that one component instance can carry its own token value — the bridge from "props" to "custom properties." (ReactCoding renders the `App` export; Tailwind on by default — arbitrary `var()` utilities work under the Play CDN.)

Code handling: the exercise *is* the code surface here; surrounding prose uses one small fenced `Code` block to show the `style` + `p-[var(--…)]` pairing before the exercise.

### Designing the token system: primitive, semantic, component

The pivot from substrate to architecture. The student can now read/write/scope a custom property; this section answers *how to organize hundreds of them so a design system stays changeable* — the senior contribution (Pedagogical guidelines §2: "how the code is shaped so it stays changeable").

Teach the three tiers, simplest framing first, each tier motivated by a problem the previous tier can't solve:
- **Primitive (raw palette):** `--gray-50` … `--gray-950`, `--blue-500`. Values, not meanings. The literal colors/spacings. This is Tailwind's default palette (Ch018 L2) — name that connection.
- **Semantic (the component contract):** `--color-foreground`, `--color-primary`, `--color-destructive`, `--color-muted`. These *name a role* and *point at* a primitive. **This is the tier components read.** shadcn's token set is exactly this tier (recognition cross-ref to Ch027, named not detailed). The dark swap works because `.dark` re-points the *semantic* token at a *different primitive* — connect explicitly to the previous sections and Ch018 L5.
- **Component (optional, rare):** `--button-primary-bg`, `--card-padding`. A token scoped to one component when the semantic tier genuinely can't express it. Flag as the *exception* — most components never need this tier (matches Code conventions "component-rare").

**The load-bearing rule, stated as the senior reflex:** components reference the **semantic** tier, never primitives. `bg-primary`, never `bg-blue-600`. Direct primitive use in a component is a code smell (Code conventions, Styling §). Give the *why* in production terms: rebrand = change the semantic→primitive pointer in *one* place; if components hard-code primitives, rebrand = a find-and-replace across the entire codebase that's never complete.

**Diagram — the resolution chain.** Custom lesson component `TokenResolutionChain` at `src/components/lessons/019/4/`.
- Pedagogical goal: make the *indirection* visible — show one utility (`bg-primary`) resolving down through the tiers: `bg-primary` → reads `var(--color-primary)` (semantic) → which is declared as `var(--blue-600)` (primitive) → which is `oklch(...)` (value). Then a second strand showing `.dark` re-pointing `--color-primary` at `--blue-400`, the same `bg-primary` now landing on a different primitive *without the component changing*.
- Build as an `<ArrowDiagram>` (boxes are real HTML showing the token text, arrows trace the indirection — `<ArrowDiagram>` is exactly for "nodes are real code/text with lines between them"; remember `expandable={false}` on its `<Figure>` per the leader-line caveat) OR as plain HTML+CSS three-column strip if arrows would cross text (annotated-illustration shape). Author's call at build time; prefer HTML+CSS color-matching if the arrow geometry gets busy (ArrowDiagram doc: "when color matching beats arrows").
- Horizontal/compact layout (diagram height budget ~800px max, laptop-short viewports — Diagrams INDEX vertical constraint).

**Alternatively or additionally — a second `ParamPlayground`** to *feel* the chain: a "theme" select (`light`/`dark`) plus the resolution shown live, so flipping the toggle re-points the semantic token and the preview swatch jumps to the new primitive. Decide one of {ArrowDiagram, second ParamPlayground} as primary to avoid redundancy; the ArrowDiagram is the better teacher of *structure*, the ParamPlayground of *behavior*. Recommend the ArrowDiagram/HTML figure as primary (structure is the lesson here; behavior was covered by the first playground). If both ship, group under `TabbedContent` (Diagram / Live) to avoid stacking two big figures.

**Exercise — `Buckets`** (three buckets: Primitive / Semantic / Component). Chips: `--blue-500`, `--gray-900`, `--color-primary`, `--color-foreground`, `--color-destructive`, `--button-primary-bg`, `--card-padding`, `--radius-md` (semantic), `--spacing-4` (primitive). Goal: the student *operationalizes* the tier distinction by sorting — the canonical check that "name the tier of any token" skill landed. (Buckets shuffles pool; `bucket` must match exactly.) Consider a second column or instructions clarifying primitive = value, semantic = role, component = one-component scope.

Code handling: `CodeVariants` or stacked small `Code` blocks showing the three tiers as CSS — a primitive declaration, a semantic declaration that reads the primitive (`--color-primary: var(--blue-600)`), and a component token that reads the semantic. The *chained `var()`* (`--color-primary: var(--blue-600)`) is the textual proof of indirection — highlight it.

`Term` candidates: **design token** (the cross-tool name for a named design decision; brief), **semantic token** (the contract tier — define once, it recurs).

### Naming tokens for purpose, not appearance

Short, high-leverage section — naming is where junior token systems rot, so it earns its own header (content-driven, not a tip bundle).
Teach the conventions as *decisions*:
- `--color-{role}` and the paired `--color-{role}-foreground` for guaranteed-contrast text-on-surface (e.g. `--color-primary` / `--color-primary-foreground`). Name the pairing pattern — it's how shadcn guarantees legible text on every surface (recognition, Ch027).
- States are usually expressed by **opacity modifiers** (`bg-primary/80`) rather than a `--color-primary-hover` token — fewer tokens, same result. Name this as the 2026 default (matches Code conventions opacity-modifier preference).
- Other namespaces follow the same purpose rule: `--spacing-{role}`, `--radius-{role}`, `--shadow-{role}`.
- **The rule:** the name describes *what it's for*, never *what it looks like*. `--color-destructive`, not `--color-red`. A destructive action styled red today might be styled differently after a brand refresh; the token name must survive that. Production framing: the name is an API; renaming it is a breaking change, so name it after the durable thing (purpose), not the volatile thing (color).

Optionally a tiny **`Matching`** or inline `Dropdowns` pairing bad name → good name (`--color-red` → `--color-destructive`, `--padding-16` → `--spacing-card`, `--color-primary-hover` → `bg-primary/80`) if a check fits without bloating; otherwise prose + the earlier Buckets carry it. Lean toward *not* adding a third exercise here unless it's a fast `Dropdowns` — protect lesson length.

Code handling: simple `Code`, a few token names side by side. No heavy component.

### `@property`: giving a token a type

The narrowest, last section — recognition-level, gated by a real trigger (Pedagogical guidelines: "trigger before tool"). Name the threshold the default crosses *first*: plain custom properties are untyped strings to the browser, so the browser **can't interpolate them** — a CSS transition or animation on a bare custom property *snaps* instead of animating. That's the problem `@property` solves.

Teach the registration shape (verified current — Baseline since July 2024, universally available):
```css
@property --gradient-angle {
  syntax: '<angle>';
  inherits: false;
  initial-value: 0deg;
}
```
- `syntax` (the type — `<angle>`, `<color>`, `<length>`, `*`), `inherits` (does it flow down — `true`/`false`), `initial-value` (required unless `syntax` is the universal `*`).
- The 2026 reach is narrow and specific: **animatable/transitionable custom properties** — a gradient angle that spins, a custom property driving a transform that needs to *interpolate* between values. For a static token, plain `@theme`/`:root` is enough; `@property` is only worth it when the value must *animate*.
- Watch-out (chapter outline): `@property` is *required* for transitions on custom properties — without registration the browser treats the value as a string and jumps. State this as the recognition: "token animates but snaps → it's an unregistered custom property."

Defer the actual animation/transition syntax to Ch021 L5 (Scope) — this section names the *enabling primitive*, not how to write keyframes. One short fenced `Code` block; no exercise (recognition-level, and the chapter quiz covers it). Keep this section genuinely brief so it doesn't outweigh its narrow real-world reach.

`Term` candidates: **`@property`** (define inline as "the at-rule that gives a custom property a type so the browser can animate it") — or skip the Term and let the section header + first sentence define it; prefer the latter since the section *is* the definition.

### External resources (optional)

`ExternalResource` cards (Pedagogical guidelines §3, optional closing): MDN "Using CSS custom properties," MDN `@property`, web.dev "@property: next-gen CSS variables" (the Baseline write-up). Keep to 2–3, official/canonical only. A `VideoCallout` only if resourcer finds a current, tight custom-properties explainer — not required; the `ParamPlayground`s carry the intuition this lesson needs.

---

## Scope

**Prerequisites to redefine concisely (do not re-teach):**
- The `--{namespace}-{name}` → utility-family rule and that `@theme` extends defaults (Ch018 L2) — one-line cross-ref, then cash in.
- The dark-mode semantic swap and the naive `dark:`-everywhere anti-pattern (Ch018 L5) — referenced as the canonical subtree-override + semantic-tier example.
- That custom properties inherit (Ch019 L2) — repaid here as the *why* behind subtree overrides; the inheritance *model* stays in L2.
- The cascade/layer machinery (Ch019 L1) and Preflight (Ch019 L3) — assumed, not restated beyond a passing mention.
- The pre-paint inline-script-to-avoid-FOUC pattern (Ch018 L6) — recognition cross-ref only; the `next-themes`/React wiring is *not* re-taught.

**This lesson does NOT cover (defer, with the owning lesson named so the writer doesn't bleed scope):**
- The cascade, specificity, layers — Ch019 L1.
- CSS inheritance at depth, the `inherit`/`initial`/`unset`/`revert` keywords — Ch019 L2.
- Preflight's reset rules — Ch019 L3.
- The `@theme` / `@utility` / `@container` / `@custom-variant` directives as *directives* — Ch018 L2 (used here, not taught).
- `next-themes` and the React-side theme toggle wiring — Ch018 L6.
- **Color spaces (OKLCH, sRGB, P3) and color theory** — Ch021 L2. Tokens *hold* colors here; what a good color *value* is, is out of scope. Use OKLCH literals to match shipped code but do not explain the channels (Ch018 already deferred this).
- **CSS animations and transitions** — Ch021 L5. `@property` names the *enabling primitive* for animatable tokens; writing keyframes/transitions is deferred.
- shadcn's exact semantic-token list — Ch027 L1 (named as "the semantic tier you'll meet," not enumerated).
- Multi-tenant theming as a shipped SaaS feature — Unit 9 introduces organizations; per-org theming is named as a *use case* and flagged as a future custom build, not built here.
- Typography/spacing *scales* at depth — Ch021 L1 (typography), Ch020 (box model). Tokens for them are named; the scales aren't taught.
- The `:root` vs `html` specificity nuance — mention in ≤1 sentence or cut; not worth cognitive budget.

---

## Notes for downstream agents

- Lesson MDX path: `src/content/docs/019 The cascade, inheritance, and design tokens/4 Custom properties and the three-tier token model.mdx`. Frontmatter shape and import block: mirror lesson 3 (`chapter-id: 19`, `sidebar: { order: 4, label: Custom properties & tokens }`).
- New lesson components go in `src/components/lessons/019/4/` (only `TokenResolutionChain` proposed; build the others from existing primitives).
- Deliberate divergences from Code conventions, flagged so they're not "corrected": (1) arbitrary-value utilities (`p-[var(--x)]`) and raw inline `style={{ '--x': ... }}` are shown as the *taught pattern*, which is correct here, not the smell L1 warned about — make the static-vs-dynamic distinction explicit in prose. (2) Bare primitive utilities (`bg-blue-600`) appear only as the *anti-example* of the semantic-tier rule — never as endorsed component code. (3) Raw CSS custom-property declarations (`--color-primary: var(--blue-600)`) are shown as pedagogical illustration of the tier chain, consistent with the chapter's convention of showing literal CSS.
- Keep the shipped `globals.css` shapes verbatim (`@import "tailwindcss"`, plain `@theme`, `@custom-variant dark (&:is(.dark *))`). Do not introduce `@theme inline` except as the named one-line watch-out for why it would *break* runtime overrides.
