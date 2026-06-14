# Lesson 2 outline — Priority on the LCP element

## Lesson title

- **Title:** Priority on the LCP element
- **Sidebar label:** LCP element priority

---

## Lesson framing

**Archetype.** Mechanics. Two load-bearing takeaways:
1. **`preload` on exactly the one LCP image per page** — the hint that front-loads the largest above-the-fold element's fetch.
2. **The structural ban on raw `<img>`** (the `@next/next/no-img-element` rule pinned to `error`) that keeps sizing, lazy-loading, and the optimizer on by default.

**The senior question (drives the intro).** Field LCP on the marketing page is red (e.g. 4.1 s — past the 2.5 s "good" threshold from L1). L1 already diagnosed *which* element is slow and gave the one-line fix as a forward promise ("mark the LCP image, next lesson"). This lesson cashes that promise: it tells the browser to fetch the hero immediately, and it makes the safe-image default un-bypassable.

**CRITICAL terminology resolution — read before writing a single line of code.**
This lesson title and the Chapter 094 outline both say "priority". That word is now a *concept* name, not the prop name. **In Next.js 16 the `priority` prop is deprecated; the prop is `preload`.** (Confirmed against the live Next.js docs, v16.2.9, version-history row `v16.0.0`: "`preload` prop added, `priority` prop deprecated".)
- The already-shipped sibling **ch034 L2** teaches `preload` as the Next.js 16 name and explicitly tells the student "`priority` is the old name, write `preload`." This lesson **must stay consistent with that** — teach `preload`.
- The already-shipped **ch094 L1** prose and its closing chapter-map diagram say "mark the LCP image priority / next lesson (priority on the LCP element)." Treat "priority" there as the *concept* (prioritizing the LCP fetch). When this lesson opens, do a one-sentence bridge: "L1 called this 'marking the image priority'; the Next.js 16 prop that does it is `preload`." Do not contradict L1 — reconcile.
- So: **the page title keeps the conceptual word "Priority"; every code sample and every API mention uses `preload`.** `priority` appears exactly once, named as the deprecated alias the student will see in old code and tutorials.

**Relationship to ch034 L2 — the hard scope line.** ch034 L2 already taught the *entire* `next/image` surface: static vs remote, the four required props, `fill`, `sizes`, `placeholder`, `quality`/`qualities`, `remotePatterns`, `unoptimized`, the optimizer, and even introduced `preload` and named the `<img>` ban. **This lesson does NOT re-teach that surface.** It re-frames a thin slice of it through one question — "how do I make my LCP element fast, and how do I stop a teammate from regressing it?" The new, non-overlapping content is:
- The *mechanics* of what `preload` emits and **why** it shaves 200–600 ms (the discovery-timing story L1 set up but didn't open: HTML → discover → fetch → paint).
- **`preload` vs `fetchPriority="high"` vs `loading="eager"`** — the decision ch034 L2 only gestured at in one `:::note`. This is genuinely new and is the lesson's second pillar of depth.
- The **structural ban as an enforced rule**, not a passing mention: which exact ESLint rule, why it's pinned to `error` (not the default warning), the *honest* tooling story (Biome is the course's primary linter but this is a Next-specific rule that rides in `@next/eslint-plugin-next` via flat-config ESLint), the `next lint` removal in Next.js 16, and the MDX carve-out.
- **Verifying the fix** in DevTools (Network Initiator = Parser, fetchpriority high) and in Speed Insights (lab drops now, field lags the 28-day window — the L1 cadence cashed in).

Anything ch034 L2 owns (remotePatterns config, qualities allowlist, fill/sizes derivation, the optimizer pipeline) is **recalled in one sentence with a back-reference, never re-explained.**

**Mental model the student leaves with.** "The browser can't fetch what it hasn't discovered yet. By default it discovers the hero late, during layout. `preload` moves that discovery to document-parse time so the hero's bytes start downloading alongside the CSS and JS. I do this for *exactly one* image per page — the LCP candidate — because the high-priority lane is a budget, not a free upgrade. And I keep the whole safe-image default un-bypassable by banning raw `<img>` at lint-error."

**What the student can DO at the end.** (1) Identify the LCP element on a page (DevTools Performance LCP marker / PageSpeed Insights). (2) Add `preload` to that one image and justify why not the others. (3) Choose correctly between `preload`, `fetchPriority="high"`, and `loading="eager"` for the viewport-dependent-hero edge case. (4) Explain the `<img>` ban and the one MDX carve-out. (5) Verify the fix in the Network panel and read the Speed-Insights lag correctly.

**Beginner pitfalls to design against (each lands in-section, never bundled).** Sprinkling `preload` on every above-the-fold image (budget split → no image wins); using `preload` for a hero that differs by viewport (preloads an image one layout never paints); reaching for raw `<img>` "just this once"; assuming `priority` still works; assuming the optimizer/CLS protection survives a raw `<img>` (it doesn't); thinking `preload` makes a slow server fast (it only fixes *discovery* latency, not TTFB — bridge back to L1's reading order).

**Cognitive-load shape.** Start from the one image the student already half-knows (the hero from ch034 L2), open the timing mechanism that L1 deliberately left closed, then widen to the decision table, then to the structural guardrail, then to verification. One diagram carries the core idea (parser discovery timeline); the rest is tight prose + two short code blocks + two quick checks. The lesson is code-light by design (mechanics, not a build) — most `<Image>` syntax is a fragment, since the full compilable shape is ch034 L2's job.

**Stack/version facts pinned (fact-checked, see §Fact-checking).** Next.js 16; `preload` is the prop, `priority` deprecated since 16.0; `preload` injects `<link rel="preload">` in `<head>` **and** auto-sets `fetchPriority="high"` on the `<img>`; do **not** combine `preload` with `loading` or `fetchPriority` (redundant hints get ignored); `loading` defaults to `lazy`, `decoding` defaults to `async`; `next lint` removed in Next.js 16, ESLint now flat-config (`eslint.config.mjs`) with `@next/eslint-plugin-next`; `no-img-element` default severity is *warn*, course pins it to *error*.

---

## Lesson sections

### Intro (no header)

- Open on the senior question: marketing-page field LCP is red, L1 already pointed at the hero as the LCP element and promised the fix here. Now deliver it.
- One-sentence reconciliation bridge: "L1 called this 'marking the image priority'; in Next.js 16 the prop that does it is `preload` — same idea, current name. (`priority` was renamed; more on that below.)"
- State the lesson's two claims plainly: (1) `preload` front-loads the *one* LCP image; (2) a lint rule bans raw `<img>` so the safe default can't quietly regress.
- Recall in one line that ch034 L2 already built the full `next/image` surface — "you know the component; this lesson is about making its *one most important instance* fast and keeping the default enforced." Sets the scope expectation so the reader doesn't expect a re-teach.
- Keep it warm and short (≈4 short paragraphs). Reuse L1's threshold number (2.5 s good) so the chapter feels continuous.

### Why the hero loads late by default

**Pedagogical goal:** open the box L1 left closed. L1 said LCP is "HTML arrive → discover → fetch → paint" and that the fix is "mark it high priority," but did not explain *why* a normal `<Image>` loses the race. This is the conceptual core; everything else is mechanics on top of it.

Content:
- Walk the default lifecycle of a below-`<head>` hero `<Image>`: the browser streams HTML, builds the DOM, and only *discovers* the `<img>` when it reaches it during parse/layout — late. Its bytes can't start downloading before discovery. On a real mobile connection that discovery gap is **200–600 ms** added straight onto LCP.
- Contrast: the CSS and JS bundle are referenced in `<head>`, so the browser starts fetching them almost immediately. The hero, sitting in `<body>`, queues behind them. By default `next/image` also lazy-loads, which is *correct* for the avatar three screens down and *wrong* for the hero.
- Land the one-line mental model: **"you can't fetch what you haven't discovered; `preload` moves discovery to `<head>`-parse time."**

**Diagram (the lesson's anchor visual): `DiagramSequence`, 3 steps — "Default discovery vs preloaded discovery."**
- Custom HTML inside each `DiagramStep` (no engine needed): a simple horizontal time axis with three stacked resource lanes — `HTML`, `CSS/JS bundle`, `hero image` — drawn as CSS bars (HTML + CSS bar grid, per diagrams INDEX "sequential phase strip"). Cap height per the vertical-space rule.
- **Step 1 — Default, the late start:** hero bar starts only after a "discovered during layout" tick well to the right; an LCP marker sits at the hero bar's end, late. Caption: the hero waits until the browser trips over it in the body.
- **Step 2 — `preload` added:** a `<link rel="preload">` chip appears in the `<head>` lane; the hero bar slides left to start alongside CSS/JS; LCP marker jumps left by the saved 200–600 ms. Caption names the saving.
- **Step 3 — over-preloading (the anti-pattern preview):** three hero-ish bars all marked high-priority, all competing in the same lane, none finishing earlier than the single-preload case. Caption: the high-priority lane is a budget; preload everything and you preload nothing. (Seeds the "exactly one" rule the next section states.)
- `DiagramSequence` provides its own card — do **not** wrap in `<Figure>`.
- Pedagogical payoff: the timing idea is hard in prose, trivial as a scrubbable before/after.

### What `preload` actually emits

**Pedagogical goal:** make the abstract hint concrete and falsifiable — the student should know exactly what to look for in the rendered HTML and DevTools.

Content:
- `preload` does three concrete things: (1) inserts `<link rel="preload" as="image" ...>` into the document `<head>`; (2) sets `fetchpriority="high"` on the underlying `<img>`; (3) opts the image out of lazy-loading (`loading="eager"` behaviour). One prop, three effects — the student doesn't hand-write any of the three.
- Show the fragment with the prop, then (briefly) the rendered `<img>` it produces, so the student can recognise it in DevTools Elements.

**Component:** one small `Code` block for the authoring fragment, then a second `Code` block (html) showing the emitted markup. Keep both as **fragments** (a single `<Image>` and the resulting `<img>`/`<link>`), explicitly *not* a full file — note in prose that the convention-complete component lives in ch034 L2. Use a one-line `title` on the fragment so it reads as "inside your hero component."

```tsx
// authoring (fragment)
<Image src={hero} alt="Dashboard overview" preload sizes="100vw" />
```
- `sizes` shown alongside because the student already owns it from ch034 L2 and the hero is full-bleed; recall in half a sentence, don't re-teach.
- Name `decoding="async"` / `loading` defaults only as "what you'll see in Elements, the component picks these" — one sentence, so DevTools is readable. Do not turn this into a props tour (that's ch034 L2).

**Tooltip terms (`Term`):** `fetchpriority` (the HTML attribute that hints relative download urgency to the browser — distinct from the order of discovery). Reuse but do **not** redefine LCP/CLS — they were `Term`-defined in ch034 L2 and taught in full in L1; a bare mention is fine. (Continuity notes confirm L2-L7 may reference LCP without re-explaining.)

### One preload per page — picking the LCP element

**Pedagogical goal:** the discipline rule, plus the practical skill of *identifying* which image is the LCP element.

Content:
- The rule, stated hard: **preload exactly one image per page — the LCP candidate.** Every other image stays default-lazy, above-the-fold or not. Reconnect to the diagram's Step 3: two preloads split the high-priority budget and neither lands sooner.
- **Identifying the LCP element** (the part ch034 L2 explicitly deferred — its `:::note` said "which element is your LCP candidate is a measurement question the course answers later"; *here* is later):
  - Chrome DevTools → Performance panel → record a load → the **LCP marker** points at the element.
  - PageSpeed Insights highlights the LCP element in its field-data view.
  - Workflow: pick the candidate at build time (it's almost always the first big thing above the fold — hero image or lead product photo), then *verify* with DevTools after the build. "Guess, then measure," echoing L1's field-vs-lab spine.
- Watch-out lands here: above-the-fold ≠ LCP element. A small logo above the fold is not the LCP element; don't preload it.

**Exercise — `MultipleChoice` (single best answer).** A page description: full-bleed hero photo, a logo in the header, two product thumbnails in a row, an avatar. "Which one gets `preload`?" Correct: the hero. Distractors: "all four above the fold," "the logo (it's first in the DOM)," "the two thumbnails." `McqWhy` reinforces budget-split + LCP-is-the-largest-painted-element. Cheap recall check at the exact moment the rule is taught.

### `preload`, `fetchPriority`, or `loading="eager"`?

**Pedagogical goal:** the lesson's second area of genuine new depth. ch034 L2 only gestured at this in one note ("when the largest element changes by viewport, reach for `loading='eager'` or `fetchPriority='high'`"). Senior-mindset framing: knowing *which* hint, and why combining them is wrong.

Content (simple model first, then the one wrinkle):
- **Default case (90% of pages): `preload`.** Single, stable LCP image → `preload` is the complete answer (it already implies `fetchpriority="high"` + eager). Stop here unless you hit the wrinkle.
- **The wrinkle — viewport-dependent hero.** When the LCP element *differs by viewport* (a different hero on mobile vs desktop, or an art-directed `<picture>`/theme-swapped image), `preload` is wrong: it would inject a preload link for an image one layout never displays, wasting the fetch. Reach for **`fetchPriority="high"`** (and/or `loading="eager"`) on the image that *is* shown, so the hint follows the rendered element instead of being hard-committed in `<head>`. (Grounded in the Next.js docs' own "theme detection" + "when not to use preload" guidance: don't use `preload` when multiple images could be the LCP depending on viewport.)
- **The combine trap (watch-out, in-section):** never set `preload` together with `loading` or `fetchPriority` — redundant hints, the browser ignores the extras and you pay only the confusion. `preload` is a superset; pick `preload` OR the eager/fetchPriority pair, not both.

**Component — decision table as a `Code`-free visual:** a compact 3-row table (plain markdown table is fine, it's small and text-only) — columns: *Situation* / *Reach for* / *Why*. Rows: single stable LCP image → `preload`; LCP differs by viewport / art direction → `fetchPriority="high"` (± `loading="eager"`); everything else (below-fold, secondary) → nothing, stay lazy. A table beats a diagram here because the content is a discrete lookup, not a process or geometry.

**Tooltip terms (`Term`):** `art direction` (serving a deliberately different crop/image per viewport, not just a different size — the case `sizes`/`srcset` can't cover).

### The ban on raw `<img>`

**Pedagogical goal:** the structural-protection pillar. ch034 L2 *named* the ban ("an ESLint rule rejects a raw `<img>` later"); this lesson makes it real and explains the enforcement honestly. This is where "defaults before audits / make the safe thing un-bypassable" (chapter spine) cashes in for images.

Content:
- **Why ban it.** A raw `<img>` ships none of what the last two lessons leaned on: no reserved box (CLS, the L1 cause), no `srcset` (oversized bytes → slower LCP), no optimizer, and lazy-loading is opt-in and easy to forget. One raw `<img>` quietly reintroduces the exact failures `next/image` exists to prevent. The ban turns "remember to use `<Image>`" into "you cannot compile/ship a raw `<img>`."
- **The exact rule and its severity — and the idiomatic reason it's an error.** The rule is `@next/next/no-img-element`. In Next.js's *base* recommended ruleset it's only a **warning**; it becomes an **error** the idiomatic way — by adopting **`eslint-config-next/core-web-vitals`**, the config that upgrades every Core-Web-Vitals-impacting rule (including `no-img-element`) from warning to error, and the config Create Next App ships by default. So the right framing is **not** "we hand-wrote `'no-img-element': 'error'`" — it's "the course uses the `core-web-vitals` config, so a raw `<img>` *fails the lint run / CI*, not just nags." Frame the warn→error jump as a deliberate Core-Web-Vitals guardrail: a warning is ignorable, an error is a wall.
- **The honest tooling story (do not get this wrong — it's a code-conventions trap).** The course's primary linter is **Biome 2.x**; ESLint runs alongside only for rules Biome hasn't ported (per Code conventions §Supply chain and tooling — `eslint-plugin-react-hooks` plus named additions when a project needs a rule Biome lacks). `no-img-element` is exactly such a Next-specific rule with no Biome equivalent, so it rides in through `@next/eslint-plugin-next` (bundled in `eslint-config-next`) on the flat-config **`eslint.config.mjs`**. Also flag the Next.js 16 change: **`next lint` and the `eslint` key in `next.config` were removed in v16.0** — linting now runs through the ESLint CLI / flat config directly, not `next lint`. Keep this to a tight paragraph: the student needs the accurate mental model (Biome ≠ what enforces this; the `core-web-vitals` config is what makes it an error), not an ESLint-config tutorial.
- **The one carve-out: MDX content.** Inside MDX/markdown content (e.g. a CMS-rendered article body) authors write plain `<img>`; the MDX renderer maps those to `next/image` at compile time, so the optimizer still applies and the rule shouldn't fight authored content. Name it as the single legitimate exception so the student doesn't think the ban is absolute — and contrast with feature code, where there are *no* exceptions.

**Component:** a `CodeVariants` before/after — tab 1 (red, `del`) the raw `<img src="/hero.png" />`; tab 2 (green) the `<Image>` equivalent with `preload`. First sentence of each pane carries the framing ("banned: reintroduces CLS + oversized bytes" / "enforced default: sized, optimized, preloaded"). One paragraph max per pane per the component's six-line rule. This directly mirrors (but does not duplicate) ch034 L2's before/after — here the point is the *ban + preload*, there it was *the four fixes*. Optionally show a tiny `Code` block (`title="eslint.config.mjs"`) of the **idiomatic** wiring — spreading `eslint-config-next/core-web-vitals` (which is what makes `no-img-element` an error), not a hand-written `'no-img-element': 'error'` line. If shown, keep it to the 3-4 lines that matter (import + spread).

**Tooltip terms (`Term`):** `flat config` (ESLint's `eslint.config.mjs` array-of-objects format that replaced `.eslintrc`, now the only supported form) — non-obvious to a student new to the JS lint ecosystem and the student won't have met it elsewhere in the chapter.

### Verifying the fix

**Pedagogical goal:** close the loop with the chapter's field-vs-lab spine (L1) — a fix you can't verify is a guess. Also pre-empts the "I added preload but the dashboard score didn't move" confusion.

Content:
- **Network panel (lab, immediate):** after adding `preload`, the LCP image appears with **Initiator = "Parser"** (came from the `<head>` preload, not discovered in body), priority **High**, and starts fetching within ~200 ms of navigation start. This is the concrete, same-session proof.
- **Speed Insights (field, lagged):** lab LCP improves immediately; **field LCP lags the 28-day rolling window** (the cadence taught in L1). So don't panic when the production pill stays red for a week or two — that's the window being a stability feature, not a broken fix. Explicitly back-reference L1's 28-day-window teaching rather than re-explaining it.
- Re-assert the diagnostic reading order from L1 as a guardrail: `preload` fixes *discovery* latency only. If LCP is still bad after preloading, the bottleneck is upstream — TTFB (slow server, L6/L7) or the FCP gap — not something a second preload will fix. This kills the "throw more preloads at it" reflex.

**Exercise — `Dropdowns` (fenced-code mode), the lesson's synthesis check.** A hero `<Image>` fragment with two blanks: the responsive `sizes` value for a full-bleed hero (`"100vw"`) and the prop that front-loads it (`preload`). Distractors for blank 2 must include **`priority`** (the deprecated name — the most tempting wrong pick, given the chapter/ecosystem still says "priority") and `loading="eager"`. This is deliberately close to ch034 L2's closing Dropdowns but the decoy set is sharpened to test the `preload`-not-`priority` and single-LCP knowledge that *this* lesson owns. `instructions` prop names the scenario (full-bleed hero, make it the preloaded LCP element).

### External resources (optional, `ExternalResource` in a `CardGrid`)

- Next.js `<Image>` API reference (the `preload` / `priority`-deprecated / `fetchPriority` section). Anchor that this is the source of truth as the prop names settle.
- web.dev — "Optimize LCP" (the platform-agnostic theory behind preloading the LCP resource).
- Optionally the `@next/eslint-plugin-next` rules reference for `no-img-element`.
Keep to 2-3 cards; do not duplicate the four cards ch034 L2 already shipped (Image API, images config, web.dev image-performance, MDN responsive images) — pick the LCP/preload-specific ones, not the general image ones.

**Video:** *Optional, low priority.* ch034 L2 already embeds two strong image videos and L1 embeds a CWV video. A third generic image/CWV video risks redundancy. Only embed if a tightly-scoped "preload the LCP image in Next.js / fetchpriority" clip surfaces; otherwise skip — the lesson is short and the diagram carries the core. (Defer to resourcer; flag as nice-to-have, not required.)

---

## Scope

**Already taught — recall in ≤1 sentence with a back-ref, never re-teach:**
- The entire `next/image` surface — static vs remote `src`, `src`/`alt`/`width`/`height`/`fill`, `sizes` derivation, `placeholder="blur"`, `quality` + the `qualities` allowlist, `remotePatterns` as the security gate, `unoptimized`, the optimizer pipeline, SVG handling, off-Vercel loaders — **ch034 L2** (this lesson links back; it is the canonical reference for all of it).
- `next/font` for the primary typeface (the *font* half of the LCP fix) — **ch034 L4**. Mention only that "font is the other LCP lever; that's `next/font`, ch034 L4" — do not teach it.
- **LCP / INP / CLS** definitions, p75 thresholds, the 28-day CrUX window, field-vs-lab discipline, TTFB→FCP→LCP reading order, the chapter-map diagram — **ch094 L1**. Use the numbers (LCP ≤ 2.5 s good) and reading order as established facts.
- DevTools Performance/Network panels as tools — **Unit 2**. Use them; don't tutorialize them.
- Speed Insights install/streaming — **ch093 L1**. Assumed live.

**Deliberately out of scope — defer with a one-line pointer where natural:**
- **LCP measurement methodology / what counts as the LCP element formally** — beyond "use the DevTools marker / PSI highlight to find it." The metric *definition* is L1's; this lesson only needs the practical identify-it skill.
- **Bundle weight / barrel exports / the analyzer** — ch094 L3-L4 (image bytes here, JS bytes there).
- **TTFB and server-side causes** (RSC waterfalls, DB) — ch094 L6-L7. This lesson explicitly says `preload` does *not* fix these and points forward.
- **Lighthouse / CI perf gate** — ch094 L5 (don't introduce `@lhci` here; "verify" here means DevTools + Speed Insights only).
- **R2 / asset hosting** — Chapter 068.
- **CSP / security-header story for SVGs** — named as "later in the course" in ch034 L2; do not open it.
- **`getImageProps`, theme/art-direction implementation depth** — name `fetchPriority="high"` as the reach for the viewport-dependent case; do not build the `<picture>`/`getImageProps` machinery (it's an advanced escape hatch, not minimum-viable-stack).
- **A full ESLint flat-config tutorial** — give the accurate enforcement model (which rule, what severity, which plugin, where it lives, Biome's role) but not a config walkthrough.

**Prerequisite redefinitions to keep tight (one phrase each):** LCP = wait for the largest above-the-fold element to paint; CLS = layout jump from unreserved boxes; p75 / 28-day window = how field scores are aggregated and why they lag. All already owned by L1 — a glance, not a section.

---

## Notes for downstream agents

- **Do not write the `priority` prop in any code sample.** Every `<Image>` uses `preload`. `priority` appears once, in prose, labelled "deprecated since Next.js 16, the old name for `preload`." This is the single highest-risk error in the lesson because the title and chapter outline both say "priority."
- The lesson is **code-light**: fragments only (one `<Image>` + its emitted HTML + one before/after + an optional short `eslint.config.mjs` spread). No full compilable file — that's ch034 L2's job; say so once so the absence is clearly deliberate.
- Keep within the **25-35 min** budget (mechanics archetype). The two depth areas are the discovery-timing diagram and the `preload`/`fetchPriority`/`eager` decision; everything else is tight.
- When recalling ch034 L2 / ch094 L1 material, **link, don't restate.** The reviewer will flag any re-teach of the `next/image` surface or the Vitals definitions as scope bleed.
- Honest tooling claim is load-bearing: **Biome is the primary linter but does NOT enforce `no-img-element`; the `@next/eslint-plugin-next` rule does, and it's an *error* because the course adopts `eslint-config-next/core-web-vitals` (not a hand-written override).** Do not write "Biome bans `<img>`," and do not invent a manual `'no-img-element': 'error'` line as the mechanism.
