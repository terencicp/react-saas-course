# Hooks for scripts, signals for assistive tech, and the table decision

Title: Hooks for scripts, signals for assistive tech, and the table decision
Sidebar label: data-*, aria-*, and tables

## Lesson framing

Chapter 017's closer. It bundles three surfaces the chapter outline groups together because each is the senior reflex in its corner but none earns a standalone lesson: `data-*` (custom attributes for *your own scripts*), `aria-*` (signals for *assistive tech*), and `<table>` (the element for *genuinely tabular data*). The unifying frame, and the through-line to keep audible: **all three are markup written for a consumer that isn't the sighted user reading the screen** — your JavaScript, the screen reader, the test runner, the crawler. This continues the chapter spine ("you write JSX, machines you never see read it") and L3's "two cooperating maps" / "your markup is the API the a11y tree is built from."

Audience and stakes. The student already writes JSX with the rename table (L1), structures pages with landmarks + headings (L3), picks `<button>`/`<a>`/`<Link>` by behavior (L4 — where `aria-label` on icon-only buttons was *named but deferred here*), and writes forms as a `name`→`FormData` contract (L5). This lesson is where three loose ends from earlier lessons get their proper home, plus the table element family. The senior payoff is reflexes, not breadth: reach for `data-*` not an invented attribute; reach for the semantic element before any `aria-*` ("no ARIA is better than bad ARIA"); reach for `<table>` only when rows-and-columns is the natural model, never for layout.

Pedagogical priorities, in priority order:

1. **The three-way "who reads this attribute?" sort is the spine.** The single most common beginner error this lesson prevents is using the wrong family: `aria-*` as a styling/scripting hook, `data-*` to convey meaning to a screen reader, `role`/`<div>` where a semantic element belongs. Open by naming the three consumers, sort every attribute by consumer throughout, and close the `data-*`/`aria-*` halves with a classification drill.
2. **`data-*` is the easy, mechanical one — teach it first and fast.** It cashes in `element.dataset` (Ch 014 L1, recognized) and the kebab↔camelCase translation. Low cognitive load; builds confidence before the judgment-heavy ARIA half.
3. **`aria-*` is judgment, not syntax.** The hard part isn't the attribute names — it's *when not to use them*. Lead every ARIA attribute with "the semantic element already does this; reach for ARIA only when it can't." Keep the surface to the daily-reach set (the outline's list); Ch 027 L3 owns the depth — say so once and move on.
4. **`<table>` is a decision before it's an element.** The lesson's value is the decision test (is this rows-and-columns indexed by (R,C)?), not the tag list. Teach the decision first, then the canonical SaaS shape, then accessibility (`<th scope>`, `<caption>`) and responsive handling — folding in the chapter's recurring keys (`key={row.id}`), `data-row-id` (this lesson's `data-*`), and where `aria-label` does/doesn't belong (this lesson's ARIA). The table section is the chapter's natural synthesis moment; lean into it.

Cognitive-load management. Three distinct topics in one sitting (~50–60 min). Treat them as three movements sharing one frame, each opening by placing itself on the "who reads this?" map. Keep code examples reusing the **Acme invoicing** surface from L2–L5 (audit log, invoice line items) so no new domain context is spent. Examples stay under-styled (Tailwind is Ch 018) except the few load-bearing utility cameos the topics require (`text-right`, `overflow-x-auto`, `sticky`, `data-[state=...]`), each flagged in-lesson so downstream agents don't "upgrade" them.

Verification beats. A `Buckets` sort for the `data-*`-vs-`aria-*` consumer distinction; a `StateMachineWalker` (`kind="decision"`) for the `<table>`-or-not decision; one `ReactCoding` (tests mode, `hidePreview`) to build the canonical accessible invoice table; a short `TrueFalse` or `MultipleChoice` to catch the headline ARIA traps. Diagrams are lightweight HTML/CSS aids, not system graphs.

No video as primary. Optionally one short `VideoCallout` on a screen reader navigating a table (the "table, 8 columns, 50 rows" announcement is hard to convey in text) — only if a current, embeddable, focused clip exists; the resourcer pass decides. Do not invent a video ID.

## Lesson sections

### Introduction (no header)

State the goal warmly and briefly, then drop into the body. Open on the senior question from the outline made concrete on the Acme surface: a row of an audit log a delegated click handler must identify (`data-invoice-id`), a trash-icon button a screen reader must announce as "Delete invoice" (`aria-label`), a sort-direction toggle whose pressed state assistive tech needs (`aria-pressed`), and the audit log itself, which is genuinely tabular (`<table>`). Name the organizing question that runs through the whole lesson — **"who reads this attribute?"** — and the three answers: *your scripts* (`data-*`), *assistive tech* (`aria-*`), *the browser's layout + a11y engine* (`<table>` and its parts). Frame the lesson as installing the daily-reach surface of each, plus the judgment to pick the right one. Connect explicitly back: this is where L4's deferred icon-button `aria-label` and L3's promise of "ARIA basics" land. Reason: the chapter has trained "every markup choice is a decision read by someone"; this lesson's job is to make the *reader* the sorting key.

### Custom attributes your scripts read: `data-*`

Teach `data-*` first — mechanical, low-load, confidence-building, and it sets up `data-row-id` for the table section.

Content:
- **The model.** Any attribute prefixed `data-` is valid HTML the browser stores but never renders or styles by default. It's a private channel from your markup to your own JavaScript (and CSS, and tooling). The browser ignores its meaning entirely — that's the point: it's *yours*.
- **Reading it back.** `element.dataset.invoiceId` (recognized from Ch 014 L1 — name the API as already-met, don't re-teach the DOM traversal). The headline mechanic students trip on: **kebab in the attribute, camelCase in `dataset`** — `data-invoice-id` → `dataset.invoiceId`. The DOM does the translation automatically. In JSX the attribute stays kebab-case (L1 rename-table cash-in: `data-*` is one of the two pass-through families).
- **The 2026 consumers** — present as a short tour of *where a senior actually reaches for it*, each one-liner tying to a future lesson so the student sees the payoff without going deep:
  - **Event delegation** — one listener on a container reads `event.target.closest('[data-action]')?.dataset.action` instead of a listener per row (Ch 014 L3, recognized). The canonical SaaS site.
  - **Test selectors** — `data-testid` for Playwright (Ch 090). Name the senior caveat now so it doesn't read as the default: accessible queries (`getByRole`, `getByLabelText`) come first; `data-testid` is the fallback when no accessible handle exists (Ch 089). This pre-empts the common over-reliance on `data-testid`.
  - **Analytics hooks** — `data-event-name` read by a delegated tracking listener.
  - **Tailwind state variants** — `data-[state=open]:rotate-180` styles off a `data-state` attribute (Ch 018 L4). Recognition only; this is *why* you'll see `data-state` everywhere in shadcn/Radix output.
- **The senior reflexes:** `data-*` carries *structural/behavioral hooks for code*, never display content (that's a text node) and never meaning for assistive tech (that's `aria-*` / semantics — the next section). Always the `data-` prefix; an invented bare attribute (`<div rowid>`) is invalid and won't round-trip through `dataset`. Numbers become strings on the way out (`data-count={5}` → `dataset.count === "5"`) — L1 cash-in.

Components:
- A small **`CodeTooltips`** block showing the JSX↔reader translation on one element: `<li data-invoice-id={invoice.id} data-status={invoice.status}>` with tooltips on `data-invoice-id` ("reads as `dataset.invoiceId`") and `data-status` ("reads as `dataset.status`; also the hook for `data-[status=paid]:…`"). Goal: make the kebab↔camel translation visible at a glance without prose.
- A compact **`Code`** block of the delegation pattern (container listener + `closest('[data-action]')` + `dataset.action` switch) to ground "this is what it's *for*." Keep it ≤12 lines; this is recognition of an Acme toolbar, not a delegation lesson.

Reasoning: leading with the mechanical family lowers entry cost and front-loads the `data-row-id` the table section will reuse, so the synthesis later feels earned.

### Signals for assistive tech: `aria-*`

The judgment-heavy middle movement. Frame hard around restraint before introducing a single attribute.

#### The first rule of ARIA: reach for the element first

- State it plainly: **no ARIA is better than bad ARIA.** The accessibility tree (L3, recognized) already gets correct roles, names, and states *for free* from semantic elements — a `<button>` is announced as a button, a `<nav>` as navigation, a `<label>`-associated `<input>` as a named field. ARIA exists to fill gaps native semantics can't express, and to *override* defaults (which is where it goes wrong).
- The decision order, stated once and applied for the rest of the section: (1) is there a semantic element that already conveys this? use it; (2) if not, is there an `aria-*` that adds the missing name/state/relationship? use the minimum; (3) `role` to change an element's identity is the last resort and rarely right in 2026.
- Forward-reference: Ch 027 L3 owns the full ARIA surface, roles catalog, and WAI-ARIA Authoring Practices. This section is the *daily-reach subset*. Say it once.

Reasoning: every beginner ARIA disaster traces to skipping step (1). Installing the order before the attributes is the whole pedagogical point of the section.

#### The attributes a senior reaches for weekly

Group by job (not alphabetically) so the student builds a mental index keyed on *the problem*, each with its canonical Acme site:
- **Naming an element that has no visible text:**
  - `aria-label="Delete invoice"` — literal string. The home for L4's deferred icon-only button case; also multi-instance `<nav>` regions (L3 cash-in). Watch-out, stated where it lands: on an element that *already* has visible text, `aria-label` **overrides** it (and risks drift) — only label the text-less.
  - `aria-labelledby="invoices-heading"` — name *by reference* to another element's `id` (a `<section>` named by its `<h2>` — L3 cash-in). Single source of truth; prefer it when a visible label exists.
- **Pointing one element at another for description:**
  - `aria-describedby="email-error"` — attaches extended/secondary text (a field pointing at its error `<p>`). Name the pairing with `role="alert"`/`aria-invalid` as the form-error shape but defer the wiring to Ch 027 L1 / Ch 044 (L5 deliberately rendered no error feedback — keep that boundary).
- **State the eye sees but the a11y tree needs told:**
  - `aria-current="page"` — the nav link for the page you're on (Acme sidebar). The set of values (`page`/`step`/`true`/…) named in one line.
  - `aria-expanded="true|false"` + `aria-controls="id"` — a disclosure/accordion/menu trigger and the panel it owns.
  - `aria-pressed="true|false"` — a toggle button (the sort-direction toggle from the intro; favorite/bold). The distinction from a checkbox/link named in one line.
- **Hiding the decorative:**
  - `aria-hidden="true"` — remove a node from the a11y tree. The canonical site: a decorative icon *beside* a visible text label, so the screen reader doesn't read the glyph twice. The load-bearing watch-out: **never on a focusable/interactive element** — it creates a node you can reach with Tab but the screen reader can't announce (an unreachable trap). Pair this with the `aria-label` icon-button case: icon *with* text → `aria-hidden` the icon; icon *alone* → `aria-label` the button.
- **Changing what an element *is* (last resort):**
  - `role="..."` — overrides the default role. State the 2026 reality: rarely correct because you almost always have a better element. The legitimate survivors are the **live-region** roles below; `role="dialog"` named only as "and even that loses to `<dialog>` / Radix" (Ch 022 L5 boundary).

#### Announcing changes the user didn't trigger: live regions

Named once here; Ch 027 L3 cashes in. Keep tight — this is recognition, not implementation.
- The problem: content that appears *after* load (a "Saved" toast, an inline validation error, a search-result count) is silent to a screen reader unless the region is marked to announce.
- `aria-live="polite"` (announce when idle — toasts, status), `aria-live="assertive"` (interrupt — critical), and `role="alert"` as the senior shorthand for an assertive live region (the standard inline-form-error reach). One-line each; the watch-out that the region must exist in the DOM *before* the content fills it (else the change isn't observed) — name it, defer the depth.

Components for the ARIA section:
- An **`AnnotatedCode`** walkthrough on a single Acme fragment that earns several ARIA attributes at once — an invoices toolbar/list row containing: a `<nav aria-label="Invoice filters">`, a current-filter `<a aria-current="page">`, a sort `<button aria-pressed={isDesc}>` whose label is text + an `aria-hidden` chevron icon, and a trash `<button aria-label="Delete invoice">` with an icon-only child. Steps: (1) the bare semantic skeleton — "notice how much is already announced for free"; (2) name the icon-only button; (3) mark the current nav item; (4) the pressed toggle + the `aria-hidden` decorative chevron; (5) the describedby→error pointer (named, not wired). Color steps consistently (blue default, orange for the watch-out steps). Goal: show ARIA as *thin additions to already-semantic markup*, reinforcing rule #1 by making the "free" baseline visible in step 1.
- A **`Buckets`** drill (`twoCol`) closing the `data-*`+`aria-*` halves: sort chips into **"`data-*` — my scripts read this"** vs **"`aria-*` — assistive tech reads this."** Items (mix of correct picks across both, no decoy third bucket): `data-testid`, `aria-label`, "the row id a delegated click handler needs", "the accessible name of an icon button", `data-state` for a Tailwind variant, `aria-current` for the active nav link, "an analytics event name", `aria-describedby` to a field's error. `instructions` framing it as "who consumes each attribute?" Goal: directly drill the spine and surface the #1 misuse (crossing the streams) as a gradeable distinction.
- A short **`MultipleChoice`** (or two-item `TrueFalse`) on the two highest-stakes ARIA traps: `aria-label` overriding visible text (only icon-only), and `aria-hidden` on a focusable element creating a trap. Goal: lock the two watch-outs most likely to ship as real bugs.

`Term` candidates in this section: **ARIA** (Accessible Rich Internet Applications — non-obvious acronym, define inline on first use), **accessibility tree** (re-explain from L3 without breaking flow), **live region** (term-of-art the student hasn't met), **disclosure** (the a11y name for a show/hide toggle, used by `aria-expanded`).

### When the data is genuinely tabular: `<table>`

The synthesis movement. Decision before element; then shape, accessibility, and responsiveness. This is where the chapter's threads converge.

#### Is this actually a table? The decision

Lead with the decision, not the tags — the value of the section is preventing both failure modes (`<table>` for layout; `<div>` soup for real tabular data).
- The positive test: **rows and columns of related records indexed by (row, column)** — every row is the same *kind* of thing, every column the same attribute across rows. The transposition check from the outline: would swapping rows and columns be a *meaningful* (if unusual) view? If yes, it's tabular.
- Canonical SaaS *yes* cases on the Acme surface: an **audit log**, **invoice line items**, a **billing breakdown**, a **metrics grid**.
- The *no* cases and their right element, stated as a quick redirect: page/section layout → CSS grid (Ch 020, the 1990s `<table>`-for-layout reflex named and buried); a list of cards → `<ul>` + grid (L3/L4); a form's two-column field arrangement → `<form>` + CSS grid (L5). The unifying line: a table is for *data you'd compare across rows*, not for *positioning boxes*.

Component: a **`StateMachineWalker`** (`kind="decision"`, no diagram slot) — "Should this be a `<table>`?" Root question: "Is every row the same kind of record with the same columns?" Branches funnel through "are you reaching for it to position things on the page?" (→ leaf: CSS grid) and "is it a list of one thing per item?" (→ leaf: `<ul>` + grid) to the affirmative leaf (→ `<table>`, with the canonical-shape teaser). Goal: encode the *order a senior asks the questions in*, per the walker's stated strength; the lesson lives in the funnel, not the leaves.

#### The canonical accessible invoice table

Build the one shape a 2026 SaaS ships, folding in every chapter thread.
- The element family, taught as a labeled anatomy (not a spec dump): `<table>` (container) › `<caption>` (the table's name, announced first) › `<thead>` › `<tr>` › `<th scope="col">` (column headers) ; `<tbody>` › `<tr>` › `<th scope="row">` (the row's identifier cell — e.g. invoice number) + `<td>` (the rest). `<tfoot>` named as "rare in dashboards, common on invoices (the Total row)"; multiple `<tbody>` and `<colgroup>`/`<col>` as recognition-only one-liners.
- The chapter-synthesis points, called out explicitly as cash-ins so the student *sees* the threads converge:
  - `key={invoice.id}` on each mapped `<tr>` (L1 keys — reconciliation reason).
  - `data-invoice-id={invoice.id}` on the `<tr>` for row delegation (this lesson's `data-*` — and the senior distinction the outline names: `data-row-id` is the *delegation hook*; the HTML `id` attribute is reserved for unique page identifiers like anchor/label targets — do not conflate).
  - Numeric columns (amount) get `className="text-right"` — one load-bearing Tailwind cameo, flagged so it isn't stripped or over-styled.
  - No `aria-label` on the table when a `<caption>` is present — the caption *is* the accessible name (ties back to "element first": the native part already names it).
- Accessibility, framed as "what the screen reader announces": `<th scope>` is **load-bearing** — it wires each data cell to its header so the reader says "Amount: $200" not just "$200"; row/column counts are announced on entry ("table, 4 columns, 50 rows"); `<caption>` supplies the name. Empty cells: render an explicit em-dash `—` (or `aria-label` for "intentionally empty") rather than a blank `<td>`, so "empty" is a deliberate value, not a gap.

Component: an **`AnnotatedCode`** of the complete Acme invoice `<table>` rendered from a `.map`, with steps walking (1) the `<caption>` + `<thead scope="col">` header row, (2) the `<tbody>` map with `key`, (3) the `<th scope="row">` identifier cell vs `<td>` cells, (4) the `data-invoice-id` delegation hook + `text-right` numeric column, (5) the em-dash empty-cell convention. Goal: one canonical artifact the student can copy as their table template; the steps make each chapter thread's contribution explicit.

Optional **`VideoCallout`** here *only if* the resourcer finds a current, embeddable, focused clip of a screen reader reading a data table (the "table, N columns, M rows" + header-cell association is genuinely hard to convey in prose). One short sentence of framing. Do not fabricate an ID; omit if none qualifies.

#### Keeping tables usable on small screens

The practical close — tables overflow narrow viewports and beginners "fix" it by breaking the semantics.
- The senior reach: wrap in `<div className="overflow-x-auto">` for horizontal scroll (one Tailwind cameo, flagged); `<thead>` can stay pinned with `sticky top-0` (named, recognition). For genuinely complex tables, switch to a **card-per-row** layout below a breakpoint (Tailwind responsive variants — Ch 021 L6, recognition only).
- The load-bearing watch-out: **never `display: block` on `<tr>`/`<td>`** to force a mobile stack — it strips the table semantics from the a11y tree (the "table, N rows" announcement and header association vanish). This is the canonical mobile-table bug; state it as the thing not to do and why. Ties the section back to the spine: the layout you give the *eye* must not blind the *other reader*.

#### Build it: the accessible invoice table

A **`ReactCoding`** exercise (tests mode, `hidePreview` — the grade is on the markup, not the look), capping the section and the chapter's HTML-semantics arc. Starter: an Acme invoice table half-built from a provided `invoices` array — `<table>` present but missing `<caption>`, header cells using `<td>` instead of `<th scope="col">`, the identifier column not a `<th scope="row">`, no `key`, no `data-invoice-id`. Task (in `instructions`): add the caption, fix the header cells' scope, make the invoice-number cell a row header, key each row on `invoice.id`, and add the `data-invoice-id` delegation hook. Tests assert: a `<caption>` exists; `thead th` carry `scope="col"`; each body row's first cell is a `th[scope="row"]`; rows carry `data-invoice-id`. Write each test name to communicate the fix (failures are hidden from the student — name them like "first cell of each row is a scoped row header"). Goal: the student *produces* the canonical shape under graded constraints, integrating keys (L1), `data-*` (this lesson), and table a11y in one artifact.

`Term` candidates in this section: **tabular data** (define the (R,C) sense precisely on first use), **scope** (the `<th scope>` attribute's job — header-to-cell association), **transposition** (only if used in the decision test — the rows↔columns swap).

### External resources (optional)

One or two `ExternalResource` cards if a current canonical source fits: MDN on `data-*`/`dataset`, MDN ARIA basics or the WAI-ARIA "first rule," MDN `<table>` accessibility. Resourcer decides; keep to genuinely canonical, current pages.

## Scope

Prerequisites to restate in one line each (do not re-teach): the JSX rename table and `data-*`/`aria-*` as kebab-case pass-through families + `key={row.id}` (L1); the accessibility tree and "your markup is the API it's built from" + `aria-label`/`aria-labelledby` for landmark naming (L3); icon-only buttons need an accessible name (L4, *deferred to here*); the `name`→`FormData` form contract and the deliberate absence of rendered error feedback (L5); `element.dataset` and event delegation as already-met DOM APIs (Ch 014 L1, L3).

This lesson does **not** cover:
- The full ARIA surface — every role, every state, the WAI-ARIA Authoring Practices, complex widget patterns (Ch 027 L3).
- Focus management — focus traps, route-change focus, skip-link *implementation* (Ch 027 L4; skip link named only).
- Live regions at depth — `polite` vs `assertive` behavior across screen readers, mounting/timing rules (Ch 027 L3). Named here only.
- Form-error wiring — `aria-invalid`, `aria-describedby`→error, `role="alert"` *implementation*, `useId()` for cross-SSR IDs (Ch 027 L1 / Ch 044 / Ch 047). Pairings named, not wired.
- shadcn primitives and how Radix sets `data-state`/ARIA for you (Ch 022 L3 / Ch 027 L1). `data-state` named only as the reason you'll see it.
- Tailwind utilities and the `data-[...]`/`aria-[...]` variant syntax at depth (Ch 018, esp. L4). Cameos flagged; not taught.
- The full table-a11y spec — the `headers`/`id` manual association attribute, `<colgroup>`/`<col>` styling depth (recognition-only here).
- TanStack Table, data grids, sorting, filtering, virtualization, pagination (out of scope entirely).
- Event delegation, `dataset`, and the DOM event model as *new* teaching (Ch 014 — recognized, not re-taught).
- `<dialog>` and Radix-managed modals (Ch 022 L5; `role="dialog"` named only as "use the element/primitive instead").
- Playwright and accessible-query testing depth (Ch 089 / Ch 090; `data-testid` named with its caveat).
- CSS grid for layout (Ch 020; named only as the right answer when a table is being misused for layout).
