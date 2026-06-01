# Lesson title

- **Title:** Landmarks and the heading outline
- **Sidebar label:** Landmarks and headings

---

# Lesson framing

This is lesson 3 of Chapter 017 (JSX and HTML semantics). Lesson 2 closed with the root layout owning `<html lang>` and `<body>` and renting `<head>` to the metadata API. This lesson answers the next question: **what structure goes _inside_ `<body>`?** The naive answer is "a pile of `<div>`s." The senior answer is a handful of landmark elements plus a strict heading outline. The deliverable: the student can structure the Acme app shell (top bar, nav, main, footer) with the right landmarks and a clean `<h1>`–`<h6>` outline, and recognize the "div soup" anti-pattern on sight.

Continuity to honor (from lesson 1 + 2):
- Canonical app is **"Acme — Invoicing for small teams."** Reuse it.
- Examples stay **under-styled** — Tailwind is Chapter 018. Where a heading "looks big," say so in prose; don't reach for utility classes except to make the one load-bearing point that *level ≠ size* (and even there, keep it to a single `className` mention, not a styled mock).
- JSX surface is installed: `className`, `.map` with `key={x.id}`, `aria-*`/`data-*` stay kebab-case in JSX. The student knows `<html>`/`<body>` live only in the root layout, so landmarks slot inside `{children}` / a nested layout — not next to `<html>`.
- The lesson 2 spine "the document shell is a set of decisions read by machines you never see" extends perfectly here: landmarks and headings are the *navigable* layer of that same machine-read document. Reuse the "second audience" frame.

The two load-bearing concepts, taught as **two cooperating-but-separate systems** (this separation is the single most important takeaway — beginners conflate them):
1. **Landmarks** — region-level map (where am I on the page?). Screen-reader users jump landmark-to-landmark.
2. **The heading outline** — content-level map (what's the structure of this region?). Screen-reader users jump heading-to-heading, and the levels form a table of contents.

Pedagogical strategy:
- **Lead with the senior question, shown not told.** Open with the same dashboard rendered two ways — four `<div>`s vs. five landmarks — that produce *visually identical* pages but radically different machine-readable structure. The whole lesson is "why the second one is correct."
- **Make the invisible visible early.** The core pain point: students can't *see* what they're getting wrong because both versions look the same in the browser. The fix is to show them the recognition instruments (the accessibility tree, the landmark/heading navigation a screen reader exposes) so the second audience becomes concrete. A diagram of the landmark map and an outline tree carry most of the teaching weight here — this is a fundamentally *visual/structural* topic.
- **Minimize cognitive load by staging.** Teach landmarks first (coarse map), then headings (fine map), then the content elements that fill them (`<p>`, `<div>`/`<span>` fallback), then the two ARIA naming attributes that disambiguate repeated landmarks — introduced only at the moment two `<nav>`s collide, never as preamble. Build the Acme shell incrementally across sections so the student sees one coherent artifact grow.
- **Frame every rule as production stakes**, not pedantry: SEO crawlers find main content via `<main>`, reader-mode and "skip to content" rely on landmarks, WCAG 2.2 AA is the project floor (per code conventions), and a heading-as-styled-div ships a page that is literally un-navigable for a screen-reader user. Senior teams treat this as non-negotiable, not nice-to-have.
- **Alternatives worth naming** to justify the choice: `<div role="banner">` vs. `<header>` (semantic element wins — "no ARIA is better than bad ARIA," named here, owned in lesson 6); generic `<section>` vs. `<div>` (the heading test decides).

Exercises: the topic is recognition + classification, so the assessment mix is (a) a Buckets drill sorting UI regions into landmarks, (b) a small ReactCoding refactor turning div-soup into landmarks (tests on the rendered DOM), and (c) a Tokens or Dropdowns drill on the heading outline. No SQL/Drizzle/Zod here.

---

# Lesson sections

## Introduction (no header)

Per the pedagogical guidelines, no "Introduction" header — open directly with prose + the senior question.

- Open on the Acme dashboard: a top bar with the logo and primary nav, a left sidebar of section links, a main content area, a footer. Ask: how do you mark this up?
- Show the **naive version** and the **senior version** side by side with `CodeVariants` (two tabs: "Div soup" / "Landmarks"). Both produce the *same pixels*. The hook: the difference is invisible to you and load-bearing for everyone else who reads the page — the screen reader, the crawler, reader-mode, the next engineer.
  - Tab 1 "Div soup": `<div className="header">…</div>`, `<div className="nav">…</div>`, `<div className="main">…</div>`, `<div className="footer">…</div>`. Keep it under-styled; the `className`s are just labels here.
  - Tab 2 "Landmarks": the same tree with `<header>`, `<nav>`, `<main>`, `<footer>`. Note in the variant prose that this is the entire change — same content, semantic containers.
- State the lesson goal warmly: by the end you'll structure a page so its *outline* is legible to machines and assistive tech, using two cooperating systems — landmarks (the region map) and headings (the content map) — and you'll know how to verify it.
- Connect back: lesson 2 handed you `<body>`; this lesson fills it. And the "machines you never see" frame from lesson 2 is exactly the audience for landmarks and headings.
- **`Term` candidates here:** `landmark` (a region of the page assistive tech can jump to), `accessibility tree` (defer the full def to its own section), `WCAG` (Web Content Accessibility Guidelines — the standard; AA is the project floor).

## A screen reader reads your page as a map, not a wall of text

The conceptual foundation — establish the *second audience* before any element list, so every later rule has a "for whom" attached. This is the section that makes the rest of the lesson make sense.

- Explain how a sighted user scans a page (visual hierarchy, position, size) versus how a screen-reader user navigates: not top-to-bottom always, but by **jumping** — landmark to landmark, heading to heading, link to link. Name the concrete affordances so it's real, not abstract: NVDA/JAWS landmark navigation (the `D` key), the VoiceOver rotor, the heading list. Keep tool names light — recognition, not a tutorial.
- Introduce the **accessibility tree**: a parallel tree the browser computes from your DOM (roles, names, states) that assistive tech consumes. Your semantic HTML *is* the input to that tree. A `<header>` becomes a `banner` landmark in it; a `<div>` becomes nothing navigable. Point at the recognition instrument: Chrome DevTools → Elements → Accessibility pane shows it for the selected node. Defer depth to Chapter 027.
- **Diagram (central, carries the section):** a side-by-side "two trees" figure. Left: the DOM as the student wrote it (the landmark version from the intro). Right: the accessibility tree / landmark map the screen reader navigates — `banner`, `navigation`, `main`, `contentinfo` as jumpable regions. Goal: make "the second audience" a concrete artifact the student can picture.
  - Engine: **Plain HTML + CSS inside `<Figure>`** (per diagrams INDEX — color-coded regions with labels, devtools-inspectable, horizontal layout). Two columns, each a small nested-box tree, same color per matching region so the eye reads DOM→a11y correspondence by tint (color-matching beats arrows here — no crossing curves). Cap height; this is short laptop-viewport-friendly.
- Land the mental model sentence the student carries: **your markup is the API the accessibility tree is built from — semantic elements feed it, `<div>`s starve it.**
- **`Term` candidates:** `role` (the semantic identity of an element in the accessibility tree, e.g. a `<header>`'s role is `banner`), `screen reader` (only if not already obvious to the audience — judgment call; likely skip, the student has web exposure).

## The landmark elements partition the page

The core element vocabulary. Teach the **seven** elements as the region map. Note: the chapter framing lists seven (`<header>`, `<nav>`, `<main>`, `<aside>`, `<article>`, `<section>`, `<footer>`) even though it says "six" — teach all seven; flag in passing that `<section>`/`<article>` are landmarks only conditionally (see below), which is why people miscount.

Teach them grouped by role, not as a flat list, to reduce load:

- **The page-frame trio — `<header>`, `<main>`, `<footer>`:**
  - `<header>` — introductory content. One page-level header (logo, primary nav live here). Nested `<header>`s are allowed *inside* `<article>`/`<section>` for their own intros — name this so the "one header" rule isn't overgeneralized.
  - `<main>` — the unique main content. **Exactly one per page**, never nested inside header/nav/aside/footer. This is what powers "skip to main content" and tells a crawler where the real content starts.
  - `<footer>` — closing content (copyright, footer sitemap). One page-level footer; nested footers allowed (an `<article>` footer carries author/date).
- **The navigation element — `<nav>`:** navigation regions. Reserved for *navigation*, not every list of links (a list of related links inside an article is just a `<ul>`). One primary nav, but secondary navs (sidebar, footer sitemap) are also `<nav>` — which forces the naming problem the next section solves.
- **The grouping elements — `<section>` and `<article>`, the two that trip people up:**
  - `<article>` — self-contained, independently distributable content. The **test**: would it still make sense pasted somewhere else? (blog post, comment, forum reply). A dashboard metric card is *not* an article — name this misuse explicitly (chapter outline flags it).
  - `<section>` — a generic thematic grouping **that has a heading**. The test: it's a section if it has (or should have) a heading; otherwise it's a `<div>`. This is the bridge to the headings section — landmarks and headings are starting to interlock.
  - Senior nuance, kept light: `<section>` and `<article>` only become navigable landmarks when they have an accessible name (a heading via `aria-labelledby`, or `aria-label`). Without a name they're semantic grouping but not jumpable. Forward-reference the naming section; don't fully explain here.
- **The aside — `<aside>`:** tangentially related content (related-articles rail, tip callout, contextual help). The trap to name: "the app's left sidebar" is usually **`<nav>`**, not `<aside>`, when it holds navigation. `<aside>` is for content beside the main content, not for the nav chrome.

Fact-check note (verified June 2026, MDN ARIA landmark mapping): the element→role mapping this lesson rests on is current — `<header>`→`banner`, `<nav>`→`navigation`, `<main>`→`main`, `<aside>`→`complementary`, `<footer>`→`contentinfo`, `<section>`→`region` (only when it has an accessible name). `<search>` is now also a standard landmark element (→`search` role) — out of scope for a basic invoicing shell, but the writer may name it in a single recognition line if it fits naturally. Do **not** teach the subtlety that a `<header>`/`<footer>` nested inside `<article>`/`<section>`/`<main>` does *not* expose `banner`/`contentinfo` — that depth belongs to Chapter 027; here, just allow nested header/footer for sub-content intros/outros without claiming landmark status for them.

Components & treatment:
- Use a **`Code` block per element** is too fragmented; instead present the vocabulary as prose with short inline `<element>` mentions, then anchor it all with the diagram below. Keep individual code to one compact `Code` block showing the Acme shell skeleton using the page-frame trio + nav, building directly on the intro's "Landmarks" tab.
- **Diagram (central):** the **canonical Acme page-outline map** — a single figure showing the landmark regions nested as they sit on the page: `<body>` containing `<header>` (with the site-name link + `<nav>`), `<main>` (with two `<section>`s), `<footer>` (with a footer `<nav>`). Render it as a **mocked page layout** (real CSS boxes that look like a page: top bar, content, footer) with each region **labeled with its element name** as a corner pill. Goal: bind element name → visual region so the student maps their own UI onto landmarks.
  - Engine: **Plain HTML + CSS inside `<Figure>`** (mocked UI built from `<div>`s with labels — exactly the html-css doc's "annotated illustration" sweet spot; arrows not needed, labels sit on the regions). Heed the prose-margin gotcha (`margin: 0` on every inner box) and the fieldset-legend pill technique for the region labels.
- **Exercise — Buckets** at the end of this section: sort concrete Acme UI fragments into the landmark they should use. This is the highest-value recognition drill in the lesson.
  - Buckets: `<header>`, `<nav>`, `<main>`, `<aside>`, `<article>`, `<footer>` (six buckets, `twoCol`).
  - Items (each a short phrase, the realistic-misuse ones are the teaching value): "The site logo + top links" → header; "The list of dashboard section links down the left" → nav; "The footer's sitemap links" → nav; "An invoice list — the page's primary content" → main; "A single customer testimonial that could be quoted elsewhere" → article; "A 'Pro tip' callout beside the invoice form" → aside; "Copyright + company address row" → footer; "A single comment in a thread" → article. Include at least one deliberate trap (the left sidebar → nav not aside).
  - `instructions`: "Each fragment is part of the Acme dashboard. Sort it into the landmark element it should use."

## Multiple landmarks of the same type need names

Introduce `aria-label` / `aria-labelledby` **here**, at the exact moment the previous section created the problem (two `<nav>`s, several `<section>`s). Trigger-before-tool, per guidelines.

- State the problem concretely: a screen-reader user pulls up the landmark list and sees "navigation, navigation, navigation." Which is the primary nav? Which is the footer sitemap? Indistinguishable. Same for three unnamed `<section>`s — "section, section, section."
- **The fix is to name them**, and there are two ways:
  - **`aria-label="Primary"`** — literal text becomes the accessible name. Use when there's no visible text to point at. Canonical: `<nav aria-label="Primary">`, `<nav aria-label="Footer">`.
  - **`aria-labelledby="id"`** — name *by reference* to another element's text, via that element's `id`. Use when a visible heading already says it — point the section at its own `<h2 id="...">`. Avoids duplicating the text and keeps the name in sync with the visible heading.
- **Senior reach (the decision rule):** if a visible heading exists, prefer `aria-labelledby` (one source of truth); otherwise `aria-label`. Repeated same-type landmarks each get a *distinguishing* name. (Verified June 2026 against W3C WAI / MDN — naming priority is `aria-labelledby` referencing on-screen text, then `aria-label`; this is current best practice.)
- Connect to JSX surface (reinforce lesson 1): `aria-label` and `aria-labelledby` stay **kebab-case** in JSX, value is a string. The referenced `id` is a normal HTML `id`.
- Seed "no ARIA is better than bad ARIA" lightly — these two attributes are ARIA, but they're *naming* native landmarks, which is exactly the legitimate gap-filling use. The full ARIA treatment is lesson 6 / Chapter 027.
- **Component:** a single `AnnotatedCode` walkthrough of the Acme shell now carrying named landmarks — steps highlighting (1) `<nav aria-label="Primary">` in the header, (2) a `<section aria-labelledby="billing-heading">` paired with (3) its `<h2 id="billing-heading">`, (4) `<nav aria-label="Footer">` in the footer. `color` to tint the label↔id pairing. This is the section's anchor and it grows the shell artifact further. Keep `maxLines` ≤ 18.
- **`Term` candidates:** `accessible name` (the label assistive tech announces for an element — computed from its content, `aria-label`, or `aria-labelledby`).

## Headings form the page's outline

The second cooperating system. The critical teaching job: **headings are a _separate_ outline from landmarks** — students assume `<main>` or a `<section>` "is" the heading. Hammer the separation.

- Frame: landmarks answer "what regions exist"; headings answer "what's the content structure *within and across* those regions." A screen-reader user navigates headings as a table of contents independent of landmarks.
- **The rules, stated as hard constraints (these are the testable facts):**
  - **Exactly one `<h1>` per page** — the page's primary heading (Acme: the page title, e.g. "Invoices").
  - **`<h2>`–`<h6>` descend by significance, no skipped levels.** `<h1>` → `<h3>` with no `<h2>` between is a real a11y violation (it breaks the outline tree — a screen-reader user hears a missing level as "is there content I skipped?"). Fix by inserting the missing level or downgrading. (Verified June 2026 — skipped levels fail WCAG 1.3.1 / the heading-order audit; "drop only one level at a time" is still the current rule. Note: the long-dead HTML5 "document outline algorithm" that auto-scoped headings per `<section>` is *not* a thing — teach the explicit `<h1>`–`<h6>` outline only.)
  - **Level is determined by _outline position_, not visual size.** This is the senior reframing and the heart of the section.
- **The central bug, taught as a before/after:** a `<div className="text-2xl font-bold">Billing</div>` that *looks* like a heading but contributes **nothing** to the outline — the page has a visual hierarchy and no navigable one. The fix: use the right heading element, style it with utilities. This is the one place a single `className` mention is justified to make the point "the element carries the outline; the class carries the look — they're independent."
  - **Component:** `CodeVariants` — tab "Looks like a heading" (`<div className="text-2xl font-bold">`) vs. tab "Is a heading" (`<h2 className="text-2xl font-bold">`). Same rendered size; only one is in the outline. Drive home: changing the *level* (`h2`→`h3`) is a structure decision; changing the *class* is a style decision; never pick the level to get a font size.
- **Diagram (central):** the **heading outline tree** for the Acme invoices page — `h1 Invoices` → `h2 Overdue`, `h2 This month` → (under one) `h3 …`. Render as an indented tree showing the nesting, with a parallel "skipped level = broken" mini-example (an `h1`→`h3` jump shown as a gap in the tree).
  - Engine: **Plain HTML + CSS nested `<ul>`** inside `<Figure>` (the diagrams INDEX "file/dependency tree" shape → `<FileTree>` is for files; a styled nested list is the right analog for an outline). Indentation = level. Use a `TabbedContent` with two tabs — "Clean outline" / "Skipped level (broken)" — to contrast correct vs. violation in one figure without doubling vertical space.
- **Recognition tools:** name them briefly — NVDA's heading-list (`H` key cycles headings), the Chrome a11y/Lighthouse outline view, the WAVE/axe extensions. Recognition only.
- **Landmarks ≠ headings, stated explicitly as the closing beat:** the two systems cooperate. A `<section>` is a landmark region; its `<h2>` is the outline node. `aria-labelledby` is literally the wire that connects one system to the other. Neither replaces the other — a page needs both.
- **Exercise — Dropdowns (fenced-code mode):** the Acme page markup with the heading levels blanked (`<h___>`), student picks the right level from `<select>`s so the outline is valid (no skips, single h1). This drills the "level by position" rule directly. Alternatively a `Sequence`/`Tokens` drill, but Dropdowns on the levels is the tightest fit for "pick the correct level."

## The content elements that fill the landmarks

The text and fallback elements. Scope discipline: the chapter outline dumps `<p>`, `<ul>/<ol>/<li>`, `<div>/<span>`, `<br>/<hr>` here, but **lists get their full treatment in lesson 4** ("Actions, navigations, and item sequences"). Resolve the overlap: this section teaches the *generic text container vs. generic fallback* decision (`<p>`, `<div>`, `<span>`, `<br>`, `<hr>`) — the elements that fill landmark regions with prose — and treats lists only as a named example of "real content lives in semantic elements," deferring `<ul>/<ol>/<li>` depth to lesson 4. State this boundary so the writer doesn't re-teach lists.

- **`<p>` — the default block of body text.** Prose goes in `<p>`, not in a bare `<div>` and not as raw text dumped in `<main>`. Quick and concrete.
- **`<div>` and `<span>` — the semantic-free fallbacks.** `<div>` block-level, `<span>` inline. The rule: reach for them **only when no semantic element fits** — a pure styling/grouping hook with no meaning. Name "div soup" (callback to the intro): every level of nesting is a decision, and a `<div>` where a landmark or heading belongs is a silent regression. This section closes the loop opened by the intro's div-soup tab.
- **`<br />` and `<hr />` — rare, semantic-only.** `<br />` for *meaningful* hard line breaks (postal address, a line of poetry), **never** for visual spacing (that's CSS/Tailwind margin). `<hr />` for a *thematic* break in content, not a decorative divider line (a Tailwind border utility handles the visual case). Both self-close in JSX — reinforce the lesson-1 void-element rule. Keep this short; they're recognition-level in modern SaaS.
- **Lists, named not taught:** one sentence — sequences of related items (`<ul>`/`<ol>`/`<li>`) are the right container for things like the nav links inside `<nav>`, and lesson 4 owns them in full. Don't expand.
- Component: a single short `Code` block contrasting a small block of correct content elements (a `<p>`, a heading, a `<div>` used legitimately as a layout wrapper) — keep it tight; this section is a vocabulary cleanup, not a deep dive.
- **`Term` candidate:** `div soup` (markup built from nested `<div>`s where semantic elements belong — visually fine, structurally meaningless) — though it's defined inline, a Term reinforces it.

## Putting the shell together and checking it

Synthesis + verification. Pull the running Acme artifact into one complete, correct example and hand the student the recognition workflow — closing the "make the invisible visible" arc.

- **The complete Acme shell**, the artifact every prior section grew: `<header>` (site name link + `<nav aria-label="Primary">`) → `<main>` (`<h1>`, two `<section aria-labelledby>` each opened by `<h2 id>`) → `<footer>` (`<nav aria-label="Footer">` + copyright). Present as one `Code` block with `title="app/(dashboard)/layout.tsx"` or a page file — keep it under-styled, semantically complete. Note it slots inside `<body>` (lesson 2) — landmarks live in the page/nested-layout, not the root layout's `<html>`/`<body>` line.
- **The verification workflow** (the payoff of "make the invisible visible"): how a senior checks this without a screen reader — open DevTools → Elements → Accessibility pane to see roles/landmarks; run Lighthouse/axe for the heading-order and landmark audits; tab through to confirm focus order. Recognition-level; Chapter 027 owns the full a11y audit.
- **The "skip to main content" link — named as the senior affordance, not built.** A visually-hidden `<a href="#main">` (paired with `id="main"` on `<main>`) revealed on focus, first in the tab order, so keyboard users skip the repeated nav. Explain *why it exists* (every page repeats the nav; keyboard users shouldn't tab through it every time) and that it's the canonical first child of the body. Defer the focus-management mechanics and the visually-hidden technique to lesson 4 of Chapter 027 (focus management) — name it, point forward, don't implement the CSS.
- **Exercise — ReactCoding (tests mode, `hidePreview`):** give the student the intro's div-soup shell and ask them to refactor it into landmarks + a valid heading outline. Tests assert on the rendered DOM: exactly one `<main>`, exactly one `<h1>`, a `<nav>` with a non-empty `aria-label`, no `<h3>` without a preceding `<h2>` (or simpler: the headings present are `h1` then `h2`), the top bar is a `<header>` and the closing row a `<footer>`. This is the capstone — it forces the student to *produce* correct structure, not just recognize it. Keep the starter small (header/nav/main/footer skeleton) so the refactor is focused. Write test *names* that communicate the requirement (per ReactCoding doc — failure text is hidden from the student).
  - `instructions`: "Refactor this div-based shell into semantic landmarks with a valid heading outline: one `<main>`, one `<h1>`, named navigation, no skipped heading levels."
- **Closing mental model** (compact, mirrors lesson 2's closer): a page is two cooperating maps — **landmarks** (the region map machines and assistive tech jump through) and **headings** (the content outline, one `<h1>`, no skipped levels, level by position not size). Reach for the semantic element first; `<div>`/`<span>` only when none fits; name repeated landmarks with `aria-label`/`aria-labelledby`. Same content, but now it's legible to the second audience.

## External resources

Optional `CardGrid` of `ExternalResource` cards (match lesson 2's pattern). Candidates:
- MDN — HTML structural/sectioning elements (the landmark elements reference).
- MDN — Heading elements (`<h1>`–`<h6>`).
- W3C WAI — ARIA landmarks tutorial / Landmark Regions (APG) (the canonical landmark-region guidance).
- W3C WAI — Headings tutorial (page structure) (the canonical heading-outline guidance).
Keep to ~3–4. These are bookmark-for-later, not required reading.

---

# Scope

**This lesson covers:** the seven landmark elements and the region map they form; the strict `<h1>`–`<h6>` heading outline as a separate cooperating system; `aria-label` / `aria-labelledby` *only* for naming/disambiguating landmarks; the `<p>` / `<div>` / `<span>` / `<br>` / `<hr>` content-and-fallback decision; the accessibility tree as the recognition concept and DevTools/axe as the recognition instruments; the "skip to main content" link **named only**.

**Out of scope — do not teach (redefine prerequisites in one line max where needed):**
- **Root layout, `<html>`/`<body>`, metadata, `<head>`** — lesson 2 (this chapter). Treat as known; landmarks slot inside `<body>`.
- **JSX surface** (`className`, `.map`/`key`, kebab-case `aria-*`/`data-*`, void self-close) — lesson 1 (this chapter). Reinforce in passing, don't re-teach.
- **Buttons, links, `<Link>`** — lesson 4 (this chapter). The site-name link and nav links appear in examples but are not explained; don't cover `<a>`/`<button>` semantics.
- **`<ul>`/`<ol>`/`<li>` in depth, the nav-as-list pattern, `list-none`** — lesson 4 (this chapter). Name lists once as the right container for nav links; defer the treatment.
- **Forms, `<label>`, `<fieldset>`/`<legend>`** — lesson 5 (this chapter).
- **`data-*` and the full `aria-*` surface** (`aria-current`, `aria-expanded`, `aria-pressed`, `aria-hidden`, `role`, live regions), "no ARIA is better than bad ARIA" in depth, tables — lesson 6 (this chapter). This lesson uses *only* `aria-label`/`aria-labelledby` for landmark naming; seed the "semantic first" principle lightly without the full rule set.
- **The full accessibility baseline** — keyboard navigation, focus management, the visually-hidden / skip-link *mechanics*, contrast, reduced motion, route-change focus — Chapter 027 (lesson 4 owns focus management). Name skip-link and the verification tools; don't implement.
- **The accessibility tree at depth** — Chapter 027. Here it's the conceptual "second tree" + where to find it in DevTools.
- **Tailwind utilities / `cn()`** — Chapter 018. Examples stay under-styled; the only `className` mentions are the load-bearing "level ≠ size" point.
- **`<dialog>` / modals** — out of scope (Radix in Chapter 022 lesson 5).
- **Open Graph / social metadata** — Chapter 034.
- **Nested layouts and route groups** — Chapter 029; if the synthesis example uses a layout file path, present it as "a file inside `app/`" without explaining nested-layout mechanics.

---

# Notes for downstream agents

- The lesson-specific diagram components live under `src/components/lessons/017/3/` (mirrors lesson 2's `017/2/`). Likely candidates to build: `DomVsA11yTree.astro` (two-tree correspondence), `PageOutlineMap.astro` (mocked-page landmark map), `HeadingOutlineTree.astro` (the indented outline tree). Confirm against the html-css diagram doc's gotchas (prose-margin reset, theme variables, label-on-border pill technique).
- The Acme shell artifact should be **the same growing code block** across the landmark / naming / synthesis sections (as lesson 2 grew `app/layout.tsx`) — author it once conceptually and show it accreting. Keep every version ≤ 18 lines where it lands in `AnnotatedCode`.
- Deliberate divergence from "teach the form they'll write": examples are under-styled (no Tailwind), per the chapter's standing decision (Chapter 018 owns styling). The single exception is the `text-2xl font-bold` mention proving level ≠ size.
