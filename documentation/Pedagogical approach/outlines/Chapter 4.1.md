# Chapter 4.1 — Pedagogical approach

## Concept 1 — JSX is property syntax, not HTML

**Why it's hard.** Students arrive having read JSX *as* HTML, then get punished by it — `class`, `for`, lowercase event names, missing self-close. The fix is a single mental model: JSX is a function call surface with DOM-property names; every visible difference from HTML is a downstream consequence of that one fact, not a list to memorize.

**Ideal teaching artifact.** A three-pane scrubbable transform — left, the JSX the student writes; middle, the `jsx('button', { className, onClick, children })` call the runtime emits; right, the HTML the browser receives. The student steps through five short JSX snippets (a `className`, a `htmlFor`, an event handler, a `data-*`, a void `<input />`) and watches each pane update together. Each step's caption names the one bug class the rename prevents (`class` would clash with the JS reserved word; lowercase `onclick` would attach a DOM attribute, not a React handler). Concept archetype. The rename table never appears as a flat reference — every row is met where its consequence lives.

**Engagement.** A `Tokens` round on a fresh `<form>` JSX block: click every prop that exists *only because of the JSX-to-DOM rename* (`className`, `htmlFor`, `onChange`, `tabIndex`). Decoys: `data-row-id`, `aria-label`, `name`. Lands the rule that kebab `data-*`/`aria-*` are passthroughs and camelCase props are the renames.

**Components.**
- `DiagramSequence` for the scrubbable three-pane transform — each step's slide is a `Figure` holding three side-by-side `Code` blocks (JSX, transform output, rendered HTML) with the caption naming the bug class.
- `Tokens` for the rename-spotting round.

**Project link.** The themed product surface (4.12) is written entirely in JSX; the rename reflex is the daily-keystroke surface the project rides on.

## Concept 2 — The expression slot and the `&&` zero trap

**Why it's hard.** `{}` looks like a template placeholder, so students treat it as one. The `0`-from-`&&` bug only fires on the empty state — the exact path no one tests by reflex — and the fix (`> 0`) feels superstitious until the student watches `0` render into their UI.

**Ideal teaching artifact.** A wrong-by-default React sandbox with a notifications list. The visible output reads `0` in a tiny corner of the page when the array is empty — the student has to find it, then fix the guard. The harness toggles the array length with a control so the student sees `0` appear and disappear under their JSX. Pattern archetype with the artifact carrying the discovery. Static prose names "render literally what the expression evaluates to" once and then steps out of the way.

**Engagement.** A `PredictOutput` round following the sandbox: four `{...}` expressions (`{count && <Badge />}` with `count=0`, `{user?.name}` with `user=undefined`, `{isAdmin ? <X /> : <Y />}`, `{false}`) — student calls each rendered result before reveal.

**Components.**
- `ReactCoding` in target-match mode for the sandbox — array length control via a button or input, the bug visible in the rendered output, tests gate the fix.
- `PredictOutput` for the recall round.

## Concept 3 — Keys are data identity, not array position

**Why it's hard.** `key={index}` silences React's warning, so the student thinks they've satisfied the rule. The bug stays dormant until a sort, filter, or insertion — and when it fires it presents as "the wrong row's input shows the wrong text," which reads as a state bug, not a key bug.

**Ideal teaching artifact.** A side-by-side reorder simulator. Two identical rendered lists of input rows, each row keyed differently — left keyed by index, right keyed by `row.id`. Each row has a focused text input the student fills with a different word. A "shuffle" button reorders the underlying array. On the left, the typed text stays welded to position 0, 1, 2 — visibly attached to the wrong rows. On the right, the text follows its row. The student does this once and the misconception is gone. Concept archetype where the bug is shown live, not described.

**Engagement.** A `Buckets` sort: four datasets (rows with stable DB IDs; rows from a freshly fetched array with no ID; a list reordered by user drag; a stable presentational list that never changes) into "key by id" / "generate id at fetch time" / "index is acceptable" buckets. Forces the trigger judgment, not just the rule.

**Components.**
- New component **`ReorderRace`** (see proposals) for the side-by-side simulator. Forward-links to Chapter 4.7.2 (reconciliation) and 4.7.5 (resetting state with `key`) where the same visual lands twice more.
- `Buckets` for the trigger round.

## Concept 4 — The root layout is a Server Component that owns `<html>` and `<body>`

**Why it's hard.** The mental model collision is steep: a React component returning a `<button>` ships a full HTML document, and the boundary between "Next emits this for me" and "I author this" is invisible in the source. Students paste `'use client'` at the top of `layout.tsx` to make a hook work and poison the whole tree.

**Ideal teaching artifact.** An anatomy diagram of a rendered Next.js page — `<!DOCTYPE html>`, `<html lang>`, `<head>` with metadata-API-emitted tags, `<body>`, the React tree, the bundle scripts — with each region color-coded by *author*: Next-emitted, metadata-API-emitted, root-layout-authored, page-authored, providers-authored. The student sees that the root layout's surface is small and exact: `<html lang>`, `<body>`, providers, `{children}`. Concept archetype, with the diagram doubling as the recognition instrument the student returns to when they're tempted to drop `<head>` JSX or `'use client'` in the wrong place.

**Engagement.** A `Buckets` exercise: ten artifacts (`<title>`, `<meta charset>`, `<html lang>`, `'use client'`, global CSS import, `<Providers>`, per-page `<h1>`, font className on `<html>`, `<link rel="icon">`, heavy DB call) sorted into "root layout" / "metadata API" / "next emits automatically" / "page or nested layout" / "never here." The boundaries the diagram drew, now under the student's hands.

**Components.**
- `Figure` wrapping a hand-authored SVG of the rendered document with color-coded authorship regions and a legend. Single-use, no forward-link to a different artifact (5.2.1 will own its own Server-Component visual), so SVG-in-`Figure` is the right call over a bespoke component.
- `Buckets` for the sort.

**Project link.** The 4.12 project's `app/layout.tsx` and `ThemeProvider` wiring is the first place the authorship boundaries cash in — the student writes the root layout from scratch and the diagram is the recognition surface.

## Concept 5 — Hydration mismatches start in the root layout

**Why it's hard.** The student writes `{new Date().toLocaleString()}` in the root layout, it works locally, and breaks at noon UTC for a user in Tokyo. The failure mode is invisible at write-time; it surfaces as a console warning the student dismisses, then as a real bug they can't reproduce.

**Ideal teaching artifact.** A timeline diagram showing the server render and the client hydration as two parallel passes producing two strings. A second frame shows the diff — the server emitted `5/15/2026, 10:00 AM` and the client computed `5/15/2026, 7:00 PM`, with the warning rendering inline. The fix path is named in prose: scope the dynamic value to a Client Component, or `suppressHydrationWarning` as the narrow exception (the `next-themes` case in 4.2.6). Mechanics archetype on a short surface — the depth is Chapter 5.2.5.

**Engagement.** A `MultipleChoice` round on three snippets — pick which one will mismatch and name the reason. (Snippets: `<html lang="en">` static, `<p>{Date.now()}</p>` in layout, `<p>{user.name}</p>` from a Server Component prop.)

**Components.**
- `Figure` with a two-frame hand-SVG (server-side string vs. client-side string, then the highlighted diff). Single-use here; 5.2.5 owns hydration in depth with its own visuals — SVG is the right call.
- `MultipleChoice`.

## Concept 6 — Landmarks form the page outline assistive tech navigates

**Why it's hard.** A sighted student stares at a dashboard, sees a header, sidebar, content, footer, and infers "four boxes, use four `<div>`s." The invisibility of the failure — screen reader users get a navigable tree the sighted student never sees — keeps the misconception alive.

**Ideal teaching artifact.** A two-pane comparison. Left: a SaaS dashboard mock rendered as `<div>` soup. Right: the same mock with `<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>`. Below each, the *landmarks list* a screen reader would announce — empty on the left ("no landmarks found"), structured on the right ("banner, navigation 'Primary', main, complementary, contentinfo"). The student toggles between them; the rendered visual is identical, the assistive-tech view is night and day. Concept archetype, paired with a second short beat on multi-`<nav>` naming via `aria-label`.

**Engagement.** A `Matching` drill: six page roles (site header, primary nav, sidebar of related links, blog post, footer sitemap nav, page main content) matched to landmark elements (`<header>`, `<nav aria-label="Primary">`, `<aside>`, `<article>`, `<nav aria-label="Footer">`, `<main>`).

**Components.**
- New component **`LandmarkMap`** (see proposals) for the two-pane comparison with the synthetic screen-reader landmarks list. Reuses in 4.1.4 (nav in landmarks) and forward-links to 4.11.2 (a11y commitments) and 4.11.4 (focus / skip links).
- `Matching` for the recall round.

**Project link.** The 4.12 themed surface ships a full landmark shell — header, nav, main, footer — and a "skip to main content" link; this concept is the first time the student writes that shape.

## Concept 7 — Heading hierarchy is outline position, not visual size

**Why it's hard.** Tailwind makes `text-3xl font-bold` cheaper to type than picking the right heading. The bug — a page that reads as a flat wall to a screen reader — never shows up in design review.

**Ideal teaching artifact.** A live HTML/CSS sandbox where the student writes a landing page. A side panel renders the page's *outline* as a tree (`<h1>` Pricing → `<h2>` Plans → `<h3>` Starter, etc.), regenerated on every keystroke. The starter document has three "headings" written as `<div className="text-2xl font-bold">` — the outline panel shows them as missing. The student converts them to the right level and the outline tree fills in. Skip a level (`<h1>` → `<h3>`) and the panel flags it. Pattern archetype, structural enforcement: the student can't satisfy the panel without picking the right element.

**Engagement.** The sandbox itself carries the assessment — the outline tree must validate. Follow with a one-question `TrueFalse` round on three statements ("the level is determined by visual size", "exactly one `<h1>` per page", "skipping from `<h2>` to `<h4>` is fine if the visual weight matches") to confirm the rule.

**Components.**
- `HtmlCssCoding` for the sandbox. The outline panel itself is a new component **`HeadingOutlinePanel`** (see proposals) embeddable inside the rendered iframe or as a sibling pane that observes the iframe's DOM.
- `TrueFalse` for the recall round.

## Concept 8 — Button, link, or `<Link>` is a decision read by every consumer

**Why it's hard.** Visually, the choice doesn't matter — Tailwind can paint any of them as anything. The consequences (keyboard activation, `Cmd+click`, right-click "copy address," screen-reader role announcement, autofill of nothing, SEO crawl) are all invisible from the JSX.

**Ideal teaching artifact.** A decision tree the student walks. The root question is *what does activation do?* — performs an action on this page, navigates to another URL within the app, navigates to an external URL, opens an in-page anchor — and each leaf names the element (`<button type>`, `<Link>`, `<a target rel>`, `<a href="#id">`) plus the consequence the choice unlocks. Decision archetype. Below it, a tiny "wrong-element catalog" — `<div onClick>`, `<a onClick>` without `href`, `<button onClick={() => router.push(...)}>` — each tagged with the consumer it breaks.

**Engagement.** A `Buckets` round on twelve scenarios ("Save invoice draft," "Open user profile page," "Open Stripe docs in new tab," "Jump to FAQ section," "Toggle sidebar," "Delete row," "Read about us") sorted into `<button>` / `<Link>` / `<a target="_blank" rel>` / `<a href="#anchor">`.

**Components.**
- `Figure` wrapping a hand-SVG decision tree, with the wrong-element catalog as a sibling `Aside`. Decision trees are a recurring shape across the course (5.1.4 navigation primitives, 4.4.2 hide-decision-tree, etc.) — but they're typically authored per-chapter as SVG, and the tree here is single-use. SVG-in-`Figure` is the right call.
- `Buckets` for the recall round.

## Concept 9 — Lists are for related-parallel sequences

**Why it's hard.** "When is it a list?" gets answered by visual layout — if the items stack vertically, it's a list. The actual test is whether *"a sequence of N related items"* is information the assistive-tech user benefits from. Nav-of-bare-anchors is the canonical fail.

**Ideal teaching artifact.** A short `TabbedContent` comparison of three page fragments — a navbar, a feature grid, and a hero+CTA — each shown two ways: as bare elements vs. wrapped in `<ul><li>`. Each tab includes the synthetic screen-reader announcement underneath ("link, link, link" vs. "list of four items, link, link, ...") and a one-line verdict on whether the list semantics earn their weight here. The hero+CTA tab is the trick — it's *not* a list, and the lesson lands the "related and parallel" predicate by negative example. Decision archetype on a small surface.

**Engagement.** A two-question `MultipleChoice` round: a comment thread (list); a layout row of unrelated dashboard widgets (not a list); a sequence of breadcrumbs (list).

**Components.**
- `TabbedContent` with each tab a `Figure` holding the rendered fragment plus a synthetic announcement caption.
- `MultipleChoice`.

## Concept 10 — Forms are a contract: `name`, `<label>`, and `FormData`

**Why it's hard.** The `name` attribute looks like an afterthought — every other attribute affects what the user sees, `name` doesn't. Students drop it, the form "works" (the input shows), submit fires, and the value silently vanishes from `FormData`. The Zod schema on the other end then complains about a missing field that the JSX appeared to provide.

**Ideal teaching artifact.** A live form rig. Left: the student edits a sign-up `<form>` JSX (email, password, terms checkbox, submit). Right: a `FormData` keyer — a table that updates on every submit, listing each `name` and its captured value. Drop the `name` on `password` and the row disappears. Replace `<label htmlFor>` with a `placeholder` and the rig flags the input as unlabeled. Pattern archetype where the contract is visible at every keystroke. A short second beat: a `<table>` of the senior `autoComplete` values keyed to the input types they pair with — `email` → `"email"`, password (sign-in) → `"current-password"`, password (sign-up) → `"new-password"` — taught at the call site, not as a reference list.

**Engagement.** A `Tokens` round on the finished form JSX: click every attribute that participates in the *server contract* (`name`, `type`, `required`, `autoComplete`) vs. presentation (`className`, `placeholder`). Lands the contract/cosmetic split.

**Components.**
- New component **`FormDataMirror`** (see proposals) — a live form harness that surfaces the captured `FormData` and a labeled-input audit alongside. Reuses in 4.1.6 (icon-only-button form contexts) and forward-links to Chapter 7.3 (Server Actions reading `FormData`) where the same mirror clarifies the action signature.
- `Tokens` for the contract/cosmetic split.

**Project link.** Forms don't appear until later units, but the contract installed here is the surface 7.3's Server Action lands on.

## Concept 11 — Native constraints are UX; server validation is security

**Why it's hard.** `required` and `type="email"` make the form *feel* validated. The student ships and the malformed POST request from a curl call writes garbage into the database. The rule is one sentence, but it has to *land* — the senior who's seen this once never forgets.

**Ideal teaching artifact.** A wrong-by-default `ReactCoding` sandbox in target-match mode. The starter form has `required`, `type="email"`, `minLength={8}`. The test harness submits via `fetch` with `FormData` bypassing the browser's submit path — and writes through. The student sees the "validation" was theater. The fix: name the watch-out in prose, then forward-link to Chapter 7.3.7 (Zod at the action) where the actual fix lives. Pattern archetype; the lesson surfaces the failure mode without trying to solve it here.

**Engagement.** A `TrueFalse` round on four claims ("`required` blocks malformed submissions from any client," "`minLength` is a security control," "native constraints improve UX," "the server can trust `type='email'` to deliver only valid emails").

**Components.**
- `ReactCoding` in target-match or test mode, with the test harness performing the bypass POST.
- `TrueFalse`.

## Concept 12 — `data-*` is for scripts; `aria-*` is for assistive tech

**Why it's hard.** Both are kebab-case custom-looking attributes that compile straight through. The student sees them as interchangeable "extra props" and reaches for `aria-row-id` (wrong — pollutes the accessibility tree) or `data-label` (wrong — invisible to screen readers).

**Ideal teaching artifact.** A two-column reference card framed as *who reads this?* — left column lists the consumers of `data-*` (event delegation, Playwright tests, Tailwind `data-[state=...]` variants, analytics) with one micro-example each; right column lists the consumers of `aria-*` (screen readers, the accessibility tree, browser a11y APIs) with the daily-reach attribute set as compact rows: `aria-label`, `aria-labelledby`, `aria-describedby`, `aria-current`, `aria-expanded`, `aria-pressed`, `aria-hidden`, `role="alert"`. Each row carries its one-line "reach for it when." Reference archetype on a tight scope — the full ARIA treatment is 4.11.3.

**Engagement.** A `Buckets` round: ten attribute placements ("delegated click hook on table rows," "naming a trash-icon button," "Tailwind variant for an open accordion," "Playwright selector," "noting a sort button's current state," "linking an error message to its input," "the description on a panel toggle") sorted into `data-*` / `aria-*`.

**Components.**
- `Figure` containing a hand-authored two-column SVG/HTML reference card. Tables in MDX would render flatter; the visual columns matter here. Single-use here, but the *shape* (consumer-keyed reference) recurs whenever two attribute families look alike — defer the bespoke component until a second case appears.
- `Buckets`.

## Concept 13 — Reach for `<table>` only when the data is genuinely tabular

**Why it's hard.** The 2010-table-for-layout reflex is gone, but the inverse mistake — cards-of-rows for what's actually tabular data — is the 2026 version. Students hesitate to reach for `<table>` because it feels heavy, and ship card grids that lose `<th scope>`, row/column count announcements, and the keyboard table-navigation shortcuts.

**Ideal teaching artifact.** A decision rubric tied to four concrete SaaS surfaces: an audit log (table), an invoice (table with `<tfoot>`), a dashboard of summary cards (not a table — grid), a product comparison page (table — heterogeneous "products" sharing attributes). The student walks each surface; the lesson names the test ("could you swap rows and columns as a meaningful transposition?") and shows the right markup. The canonical `<table>` shape — `<caption>`, `<thead>`/`<th scope="col">`, `<tbody>` with `<th scope="row">` opening each row — is shown once, with `<th scope>` highlighted as the load-bearing attribute. Decision + Mechanics blend.

**Engagement.** A `Tokens` round on the canonical table JSX: click every attribute or element load-bearing for *assistive-tech announcement* (`<caption>`, `scope="col"`, `scope="row"`, `key={row.id}`). Decoys: `className`, `data-row-id`, `colSpan`. Forces the student to separate accessibility plumbing from the rest.

**Components.**
- `Figure` for the four-surface decision visual with the test annotated.
- `AnnotatedCode` for the canonical `<table>` JSX with stepped highlights on `<caption>`, the two `scope` values, and the row-key.
- `Tokens` for the recall round.

---

## Component proposals

- **`ReorderRace`** — side-by-side list reorder simulator. Inputs: an array of items with at least an `id` and a label, a "left key strategy" (`index`) and a "right key strategy" (`id`), an optional per-item editable text field. Shows the two lists rendering from the same array, with a shuffle/sort/filter control; preserves typed input across the reorder to make the index-key failure visible.
  - **Uses in this chapter** — Concept 3.
  - **Forward-links** — Chapter 4.7.2 (reconciliation), Chapter 4.7.5 (resetting state with `key`); the same simulator is the natural visual in both.
  - **Leanest v1** — fixed three-row list, one editable text input per row, one "shuffle" button, two columns hard-coded to index-key vs. id-key. No filter, no sort, no insertion. The shuffle alone makes the bug visible; richer controls are 4.7-era depth.

- **`LandmarkMap`** — two-pane page-structure comparison. Inputs: a left and right JSX snippet (or rendered fragment), an optional `aria-label` map for multi-instance landmarks. Renders both fragments side by side and computes a synthetic landmarks list per pane (the rolled-up "what a screen reader announces").
  - **Uses in this chapter** — Concept 6.
  - **Forward-links** — Chapter 4.11.2 (the four commitments), Chapter 4.11.4 (skip links and focus), both of which build on the landmark surface; reusable any time a lesson contrasts semantic-vs-non-semantic markup.
  - **Leanest v1** — accept two static fragments as children and render the landmarks list from a hardcoded prop array (author-supplied, not computed). Skip auto-derivation. v1 still teaches: the contrast is what matters, the synthetic announcement is the payoff.

- **`HeadingOutlinePanel`** — outline tree derived from a rendered HTML fragment. Inputs: a reference to the rendered iframe (`HtmlCssCoding`-style) or a static HTML string. Walks the DOM for `h1`–`h6`, builds a nested outline, flags skipped levels and missing `<h1>`.
  - **Uses in this chapter** — Concept 7.
  - **Forward-links** — Chapter 4.11.2 (a11y commitments), Chapter 5.6.6 (metadata and the page outline for crawlers). Reusable any time the outline-vs-visual-size lesson lands again.
  - **Leanest v1** — sibling pane (not embedded in the iframe) that takes a static HTML string and renders the tree. Skip live iframe observation. The student paste-copies their HTML once after edits; teaching value holds. Embed-into-iframe is v2.

- **`FormDataMirror`** — live form harness. Inputs: a child `<form>` (the student-editable JSX), an auto-rendered "captured FormData" table updated on submit, an auto-rendered label/input audit panel that flags inputs without an accessible name. Submit is intercepted; nothing posts.
  - **Uses in this chapter** — Concept 10 (potentially Concept 12 in the icon-only-button label case).
  - **Forward-links** — Chapter 7.3.2 (the `FormData` API at depth), Chapter 7.3.3 (Server Action signature), Chapter 7.3.7 (Zod validation). The mirror is the same recognition instrument across all three.
  - **Leanest v1** — wrap a child `<form>`, intercept submit, render a two-column key/value table from the captured `FormData`. Skip the label-audit panel for v1 (cover it in prose in this chapter, add the panel when 7.3 lands).

## Build priority

`FormDataMirror` and `ReorderRace` carry the most teaching load across the curriculum and should land first. `FormDataMirror` is the higher priority — it has the broadest forward-link footprint (three lessons in Chapter 7.3), and the form-as-contract concept is one of the chapter's hardest mental shifts, with a payoff that compounds the moment Server Actions land. `ReorderRace` is second: the index-key failure is a recurring teaching moment across 4.1, 4.7.2, and 4.7.5, and the leanest v1 is genuinely small (one shuffle button on three rows). `LandmarkMap` and `HeadingOutlinePanel` are third-tier — both have credible forward-links into Chapter 4.11, but their teaching weight in this chapter is satisfied by their v1 forms, so build them when 4.11 forces the issue rather than ahead of it.

## Open pedagogical questions

- Concept 5 (hydration in the root layout) sits awkwardly between 4.1.2's surface and 5.2.5's depth. The current cut treats it as a Mechanics-level warning with a forward link — but if students consistently struggle with the misconception here, the right move may be to grow the artifact to a Concept-level animation now and let 5.2.5 carry only the recovery patterns.
- Concept 11 (native constraints are UX) is taught as a wrong-by-default sandbox, but the actual fix lives in 7.3.7. The risk is the student internalizes "the form is broken" without internalizing "the server is the boundary." Worth a second pass on whether the artifact needs a stub-level Zod glimpse here, or whether the forward-link is enough.
