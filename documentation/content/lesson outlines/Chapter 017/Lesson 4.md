# Actions, navigations, and item sequences

- **Title (h1):** Actions, navigations, and item sequences
- **Sidebar label:** Buttons, links, and lists

---

## Lesson framing

This is the third element-vocabulary lesson of the chapter. L3 installed the page skeleton (landmarks + headings); this lesson installs the three interactive/structural families that live *inside* that skeleton: the things that **do** something (`<button>`), the things that **go** somewhere (`<a>` / `<Link>`), and the things that are a **sequence** (`<ul>` / `<ol>` / `<li>`). L5 then takes forms.

**The one mental model the whole lesson hangs on:** *the element is chosen by behavior, never by appearance.* A control that performs an action is a `<button>` even if it looks like a link; a control that goes to a URL is an `<a>` even if it looks like a button. Styling is an orthogonal knob (Tailwind, Ch 018; shadcn, Ch 027) — it never changes which element is correct. Make this audible as a recurring spine: **"behavior picks the element; the class picks the look."** It directly extends L3's "the element carries the outline, the class carries the look."

**Why this matters / the pain it relieves (lead with stakes, per the pedagogy doc).** The naive reach — `<div onClick>` for everything — silently drops a pile of behavior the browser gives a real `<button>`/`<a>` *for free*: Tab focusability, `Enter`/`Space` (button) and `Enter` (link) activation, a focus ring, the screen-reader role announcement, right-click "Open in new tab" / "Copy link", `Cmd`/`Ctrl`-click, middle-click, and (for `<a>`) the address showing in the status bar. The senior frame: every one of these is a feature you'd otherwise have to *rebuild by hand and get wrong*. The `<div role="button">` anti-pattern is the concrete demonstration of how much plumbing you sign up for the moment you leave the semantic element.

**Three high-value reflexes** the student must leave with, in priority order:
1. **`<button>` vs `<a>` vs `<Link>` by intent** — the central decision; everything else is detail.
2. **`<button type>` is explicit, always** — the single most common real bug in this lesson's territory (a Cancel/Close button inside a `<form>` defaulting to `submit` and blowing away the form). Frame in production stakes: "the user clicked Cancel and lost their work."
3. **`<a target="_blank">` pairs with `rel="noopener noreferrer"`** — the security/privacy reflex.

Two supporting reflexes: **icon-only buttons need `aria-label`** (no visible text = no accessible name), and **lists are for related parallel items** (`.map` keys per `<li>`, the `list-none` + `<Link>` nav pattern).

**Cognitive-load sequencing.** Teach the three families in order of decision weight, each as its own h2: buttons first (introduces `type`, disabled, icon-`aria-label`), then links (`href`, `target`/`rel`, then `<Link>` as the Next.js layer on top of `<a>`), then the decision itself gets its own consolidating section (button vs a vs Link vs div), then lists. The decision section comes *after* both buttons and links are taught so the student has both halves before being asked to choose between them. Lists are last and lightest — they were already named in L3, so this is the "now actually write them" beat plus the nav-list pattern.

**Reuse, don't re-teach.** Keys + `.map` (L1), landmarks/`<nav>` naming (L3), `<html lang>`/root layout (L2) are prerequisites — invoke by name, redefine in one clause max. The lesson rides the L1 JSX surface: lowercase tags, camelCase event props (`onClick`), boolean props (`disabled`), `target`/`rel` as plain string attrs, kebab `aria-label`.

**Code-sample discipline.** Examples stay deliberately under-styled — Tailwind is Ch 018. The *one* load-bearing styling cameo allowed: the `list-none flex gap-4` nav so the student sees the canonical "semantic `<ul>`, custom look" shape. Note this divergence from the "real components use `cn()` + shadcn `<Button>`" convention is **deliberate and staged** — say so in a one-line aside so downstream agents don't "upgrade" the examples. `<Button>`/CVA is explicitly Ch 027 / Ch 022; `<Link>` depth (prefetch, scroll) is Ch 029 L4.

**Visuals + interaction budget.** Two diagrams (the "free behavior" comparison; a button-vs-a-vs-Link-vs-div decision walker), two checking exercises (a ReactCoding to *fix* the wrong elements, a Buckets to sort controls into button/link/list), plus small Tokens or Dropdowns beats inline. No video — the topic is decision-reflex, better served by the decision walker than a talking-head.

---

## Lesson sections

### Three controls, three elements (introduction)

No h2 — this is the lesson intro per the structure doc. Open on the concrete senior scenario from the outline: one screen needs a **Save** action, a **go to `/dashboard`** navigation, and a **list of features**. Show the naive reach (`<div onClick>`, `<button>` used for nav, a stack of `<div>`s) beside the senior reach (`<button>`, `<a href>`/`<Link>`, `<ul>`). State the spine — *behavior picks the element, the class picks the look* — and preview the payoff: by the end the student picks correctly by reflex and knows the free behavior they'd lose by guessing wrong. Connect back to L3 ("you built the page's rooms; now you wire what the user clicks inside them"). Keep it warm and tight, ≤2 short paragraphs.

Render the naive-vs-senior contrast as a small **`CodeVariants`** (two tabs: "Naive" / "Semantic", each ~6 lines, the three controls). First sentence of each tab carries the framing. This is the hook, not a teaching block — keep prose minimal.

---

### Buttons perform actions

h2. The first family. Define a button in one line: **a control that performs an action in place** — submit a form, open a modal, delete a row, toggle a sort. Not navigation (that's the next section). Contrast it immediately with what the student might reach for instead.

**Free behavior.** Enumerate what the browser hands you for a real `<button>`: `Tab` focus, `Enter`/`Space` activation, a default focus ring, the "button" role announced to AT, disabled handling. Frame each as "code you don't write." Note default visual styling is stripped by Tailwind's Preflight reset (named only — Ch 019 L3) so in this course buttons start visually bare and utilities/`<Button>` paint them; the *element* is still a button.

**`<button type>` — the load-bearing reflex.** This is the section's centerpiece; give it the most weight. A `<button>` **inside a `<form>` defaults to `type="submit"`**. The three values (lowercase — call that out, it's an L1-style watch-out): `submit` (default; submits the form), `button` (inert; runs only its `onClick`), `reset` (clears the form — rare, an anti-pattern, name and move on). The senior reflex: **every `<button>` declares its `type` explicitly.** Make the bug concrete and stakes-driven: a "Cancel" button next to "Save" in a form, no `type`, one click submits the form the user meant to abandon.

- Component: **`AnnotatedCode`** (tsx, ~8 lines) on a tiny form with a Save (`type="submit"`) and a Cancel (`type="button"`) button. Steps: (1) the `<form>` wrapper, (2) the submit button — `color="green"`, "this one is meant to submit", (3) the Cancel button *without* a type → "defaults to submit, this is the bug" `color="red"`, then the same line fixed to `type="button"` `color="green"` in a following step. Lets the student watch the one-attribute fix. Forward-ref the Server Action wiring to Ch 044 in one clause; the form here is illustrative only.

**Disabled buttons.** `disabled` is a boolean prop (L1 boolean-attr surface). Non-activatable; browser dims it; not in the activation path. The senior watch-out (production stakes): a disabled button **can be skipped in the tab order and gives the user no reason why** — never hide a critical action behind a bare `disabled` without surfacing the reason (inline message, tooltip, or `aria-describedby` — the last named only, ARIA depth is Ch 027 L3 / L6). This connects to the a11y convention (touch targets, focus) without going deep.

**Icon-only buttons need a name.** A `<button>` whose only child is an icon (trash, copy, X) has **no accessible name** — screen readers announce "button" with no label. Fix: `aria-label="Delete"`. Canonical sites: toolbars, table-row actions. Pair with the watch-out (preview of L6): `aria-label` on a button that *already* has visible text overrides that text — only label icon-only buttons. Keep ARIA shallow; Ch 027 L3 owns it.

- Small inline **`CodeTooltips`** on an icon button block: tooltip the `aria-label` substring ("the accessible name screen readers announce; required when there's no visible text child") and the `type="button"` substring. Cheap reinforcement without prose interruption.

Terms (use `<Term>`): **accessible name** (the label AT announces for a control), **tabnabbing** (deferred to the links section — see below), **Preflight** (Tailwind's base reset that zeroes default element styling — Ch 019).

---

### Links navigate to URLs

h2. The second family. Define: **a control that takes the user to a URL** — another page, an external site, a fragment on the same page, a downloadable file. The mirror of the button: buttons act, links go.

**`href` is what makes a link a link.** Without `href`, `<a>` is **inert** — not focusable, not activatable, no role. The watch-out: an `<a>` with only an `onClick` and no `href` is a button in disguise; if the intent is act-on-click, it's a `<button>`. The free behavior a real `<a href>` gives: focusable, `Enter` activates, right-click "Copy link"/"Open in new tab", `Cmd`/`Ctrl`/middle-click, the URL in the status bar, crawler-followable.

**`target="_blank"` and the `rel` pairing.** `target="_blank"` opens a new tab. It **pairs with `rel="noopener noreferrer"`** — `noopener` severs the new page's `window.opener` handle (prevents <Term>tabnabbing</Term> — the opened page redirecting your original tab to a phishing clone), `noreferrer` strips the `Referer` header (privacy). Modern browsers imply `noopener` for `target="_blank"`, but **explicit `rel` is still the senior reflex** (don't rely on the default; older embedded webviews and `rel`-stripping cases exist). Mention other common `rel` values briefly: `nofollow` (user-generated links — don't pass ranking signal), `external` (mostly stylistic). Keep it tight.

**`download` and fragment links.** `<a download>` for file links (optional value renames the saved file) — one sentence. `<a href="#section-id">` for in-page navigation: native scroll-into-view + URL hash update; the target needs a unique `id`; smooth scroll via CSS `scroll-behavior: smooth` (Tailwind `scroll-smooth`, named). Canonical sites: TOCs, the skip-to-main link (named in L3). One example line each is enough.

- Component: **`CodeTooltips`** on a single block holding an internal-ish `<a href>`, an external `<a target="_blank" rel="noopener noreferrer">`, and an `<a href="#pricing">`. Tooltip `target="_blank"` ("opens a new tab"), `rel` ("noopener stops tabnabbing, noreferrer strips Referer"), and the `#pricing` href ("scrolls to the element with id='pricing', updates the URL hash"). Directs attention to the three meta-attributes without splitting into a stepped walkthrough.

#### Next.js `<Link>` for internal navigation

h3 under links. Build the layer on top of `<a>` so the student sees `<Link>` as "`<a>` plus client-side navigation," not a separate thing. `<Link href="/dashboard">` from `next/link` **renders to a plain `<a href>` in the HTML** (so SEO, `Cmd`-click, copy-link, and the JS-off fallback all still work) and adds **soft client-side navigation** (no full-document reload). The decision rule, stated flatly: **internal routes use `<Link>`; external links use plain `<a target="_blank" rel="noopener noreferrer">`.** The classic disguise watch-out (production stakes — this is a real perf/UX regression seniors catch in review): `<button onClick={() => router.push('/dashboard')}>` is a navigation wearing button clothes — it loses copy-link, middle-click, crawlability; use `<Link>`. Depth (prefetching, the navigation/render model, scroll restoration) is explicitly Ch 029 L4 — one-line forward ref.

- Component: **`CodeVariants`** (3 tabs) — "Internal (`<Link>`)", "External (`<a target=_blank>`)", "Navigation-in-button-clothing (avoid)". The third tab uses `del=` framing / a red mark to mark it the anti-pattern, first sentence "Don't — this is a link pretending to be a button." Compact A/B/C glance.

Terms: **soft navigation** (client-side route change with no full document reload), **tabnabbing**.

---

### Choosing the element: button, link, or div

h2. The consolidating decision section — placed after both buttons and links so the student has both halves. This is the lesson's pedagogical climax: turn the two definitions into one reflex. Lead with the rule restated: **match the element to the behavior, not the look.** Two corollaries the student must be able to recite: a `<button>` styled to look like a link still *acts* (it's a button); an `<a>` styled to look like a button still *navigates* (it's a link).

**The `<div role="button">` anti-pattern — the cost demonstration.** This is the most persuasive teaching moment in the lesson: show *everything* you must hand-wire to make a `<div>` behave like a `<button>`, precisely the list the real element gives free. Enumerate: `role="button"`, `tabIndex={0}`, an `onKeyDown` handling both `Enter` and `Space` (and `preventDefault` on Space to stop page scroll), focus-ring CSS, `aria-pressed` if it's a toggle, `cursor-pointer`. Verdict: **never** — reach for `<button>` and restyle it. (Same logic kills `role="link"` on a `<div>` — named once.)

- Component: **`StateMachineWalker`** (`kind="decision"`, no diagram slot). The senior's question order made walkable. Root question: **"Does it perform an action or go to a URL?"**
  - "Performs an action (submit / open / delete / toggle)" → Leaf **`<button type="...">`** (reason: free keyboard + role + focus; declare the `type`).
  - "Goes to a URL" → second question **"Internal route or external site?"** → "Internal" → Leaf **`<Link href>`** (soft nav, renders as `<a>`); "External" → Leaf **`<a target="_blank" rel="noopener noreferrer">`**.
  - Root also offers a trap branch: "I'll just use a `<div onClick>`" → Leaf **"Don't — you'd rebuild button behavior by hand"** listing the plumbing. This makes the anti-pattern a *destination the student can choose and get corrected on*, which lands harder than prose. Decision-tree shape with terminal recommendations is exactly the walker's `kind="decision"` fit per its doc.

- Component: **`ArrowDiagram`** inside a `<Figure>` — the "free behavior" map. Left: a single `<button>` box. Right: a vertical stack of small cards, one per free behavior (Tab focus, Enter/Space, focus ring, "button" role, disabled handling). Arrows from the button to each card, labeled "free." Pedagogical goal: make "the element gives you all this for nothing" *visible* and quantced — the visual weight of five arrows is the argument. Cross-region socket config (`right`→`left`), generous column gap per the ArrowDiagram doc; keep ≤5 target cards to stay under the height cap. (If arrows crowd, fall back to a plain HTML two-column "element → free behaviors" panel inside `<Figure>` — note this fallback for the building agent.)

**Checking exercise (the lesson's main practice beat).**

- Component: **`ReactCoding`**, tests-graded, `hidePreview`. Starter: a small UI with three planted mistakes — a `<div onClick>` "Delete" control, a `<button onClick={() => router.push('/settings')}>Settings</button>`, and a Cancel `<button>` inside a `<form>` with no `type`. Instructions: "Fix each control to the right element and attributes: the delete action, the settings navigation, and the cancel button." Tests assert: a real `<button>` exists for delete (and the `<div role=button>` is gone), an `<a>`/`Link`-rendered anchor with `href="/settings"` exists for settings, and the cancel button has `type="button"`. Because `<Link>` renders to `<a>` in the iframe, query for `a[href="/settings"]`. This is a guided fix-the-bug exercise (preferable to a sandbox per the brief) hitting all three core reflexes at once. Note for the building agent: keep the starter ≤14 lines; `router` won't exist in the iframe, so the fix is to *replace* the button with a link rather than wire navigation.

---

### Lists group related items

h2. The third family — lightest, since L3 already named `<ul>`/`<ol>`/`<li>`. The beat here is "now write them, and know when *not* to." One-line model: `<ul>` unordered, `<ol>` ordered, `<li>` is a direct child of either — nothing else goes directly inside a list. Any sequence of related, parallel items is a list: navs, feature grids, comment threads, audit entries.

**Lists on the JSX surface.** `.map` over data, **one `key` per `<li>` tied to data identity** (`key={item.id}`, never the index) — explicitly a callback to L1, restated in one clause. Nesting lists for hierarchy (file browser, threaded comments) — one mention. `<ol>` attributes `start` / `reversed` / `type` named for recognition (usually leave numbering to content/CSS).

- Component: **`Code`** (simple block) for the `.map` → `<li key>` pattern — it's a known shape from L1, doesn't need a stepped walkthrough.

**The list-vs-`<div>`s decision.** The test, stated as the senior asks it: **"Would a screen-reader user usefully hear 'list, N items' here?"** If yes → list. Related-and-parallel (nav links, feature cards, comments) = list. Unrelated, merely visually-arranged items (hero + CTA, logo + button in a header) = not a list, just elements in a container. The watch-out: a nav built as a bare flex of `<a>`s loses the "list of N items" announcement.

**The nav-list pattern (the one styling cameo).** Tie it back to L3's named-but-unbuilt nav. The canonical SaaS nav: `<nav aria-label="Primary">` wrapping a `<ul className="flex gap-4 list-none">` of `<li>` each holding a `<Link>`. Two points: (1) Tailwind's Preflight strips bullets/margins so a styled horizontal nav needs no fighting (Ch 019 L3, named), and `list-none` is belt-and-suspenders; (2) the list is **still announced** as a list even with markers visually gone — semantics survive styling. This is the lesson's clean synthesis: list semantics + `<Link>` navigation + `<nav>` landmark, all from prior lessons, composed. Allowed to carry the `flex gap-4` cameo; mark it as the single deliberate styling exception.

- Component: **`AnnotatedCode`** (tsx, ~10 lines) on the nav-list. Steps: (1) `<nav aria-label="Primary">` — the landmark from L3, `color="blue"`; (2) `<ul className="flex gap-4 list-none">` — semantic list, visual stripped, `color="green"`; (3) `.map` → `<li key={item.href}>` — the key rule; (4) the `<Link href>` inside each `<li>` — internal nav. Synthesizes four prior concepts in one artifact.

**Sorting exercise.**

- Component: **`Buckets`** (`twoCol`), the classification check. Three buckets: **`<button>`**, **`<a>` / `<Link>`**, **`<ul>`/`<ol>`**. Items (chips): "Submit the sign-up form" (button), "Open a confirmation modal" (button), "Delete this row" (button), "Go to the billing page" (link), "Open the docs in a new tab" (link), "Jump to the FAQ section" (link), "The app's primary nav items" (list), "Comments under a post" (list), "Invoice line items" (list — or table; keep it clearly list-shaped to avoid ambiguity with L6). Instructions: "Sort each control or content into the element family it should use." Verifies the whole-lesson decision in one drill. Note for the building agent: avoid items that are genuinely tabular (those are L6) so the list bucket isn't contested.

---

### `<button>` and `<a>` as form and JSX members (recognition)

h2, short — a recognition/forward-ref section, not a deep teach. Two small jobs.

**The button inside a form (bridge to L5).** Restate compactly: inside a `<form>`, `<button type="submit">` is the primary submit, and `Enter` on any text input also submits — which is *why* Cancel/Toggle buttons must be `type="button"`. Name `formAction` / `formMethod` / `formEncType` / `formNoValidate` / `formTarget` as per-submit overrides of the parent form's attributes — **recognition only**, one sentence, "rare; you'll see them, reach for them almost never." The Server Action wiring is L5 + Ch 044 — explicit forward ref. Keep this tight; it's a handoff, not a lesson.

- Optional small **`Dropdowns`** (fenced mode) to close the chapter's button thread: a 4–5 line form skeleton with `___` blanks for the submit button's `type` (answer `submit`), the cancel button's `type` (answer `button`), and the input `type`. Cheap recall check that also previews L5's input surface. Skip if the section already feels complete — leave the call to the building agent.

---

### External resources

Optional, end of lesson, per the structure doc. 1–3 `ExternalResource` cards: MDN `<a>` (or the `rel`/`target` security note), MDN `<button>` (the `type` attribute), and the Next.js `<Link>` API reference. Building agent picks the current canonical URLs (verify live).

---

## Scope

**This lesson teaches:** `<button>` and `type` (`submit`/`button`/`reset`, the form-submit default, explicit-type reflex); `disabled` on buttons + the "surface the reason" rule; icon-only-button `aria-label`; `<a href>` (inert without `href`), `target="_blank"` + `rel="noopener noreferrer"`, `download`, fragment `#id` links; Next.js `<Link>` for internal nav (renders to `<a>`, soft navigation) vs plain `<a>` for external; the button-vs-link-vs-`<Link>`-vs-`<div role=button>` decision; `<ul>`/`<ol>`/`<li>` (the `.map`+key pattern, list-vs-`<div>`s test, the `list-none`+`<Link>` nav-list pattern); the per-submit `form*` button overrides (recognition only).

**Explicitly out of scope (redirect, don't teach):**
- Forms in depth — `<form>`, `<input>` types, `<label htmlFor>`, the `name`→`FormData` contract, `<fieldset>`/`<legend>`, `autoComplete`, native constraints → **L5**.
- The React 19 Server Action wiring (`action={fn}`, `useActionState`, `useFormStatus`) → **L5 / Ch 044**. Forms here are illustrative shells only.
- `data-*` and `aria-*` at depth, the full ARIA surface (`aria-pressed`/`aria-current`/`aria-expanded`/`role`), live regions → **L6 and Ch 027 L3**. This lesson uses only `aria-label` (icon buttons) and names `aria-describedby`/`aria-pressed` in passing.
- The `<table>` decision → **L6**. Keep list-bucket exercise items clearly non-tabular.
- shadcn `<Button>`, CVA variants, `asChild`/Slot polymorphism → **Ch 027 L1 / Ch 022 L3**. Examples use raw `<button>`/`<a>`.
- Tailwind utilities, `cn()`, the Preflight reset internals → **Ch 018 / Ch 019 L3**. Preflight named only; the `flex gap-4 list-none` nav cameo is the lone deliberate styling exception.
- `<Link>` depth — prefetching, the navigation/render model, scroll restoration → **Ch 029 L4**.
- Focus management depth (focus traps, route-change focus, skip-link mechanics) → **Ch 027 L4**. Skip-link named only.
- The `<dialog>` element / modals → out of scope; Radix/shadcn dialogs in **Ch 022 L5**.

**Prerequisites to invoke (one clause each, don't re-teach):** L1 — `.map` + data-tied `key`, camelCase event props (`onClick`), boolean props (`disabled`), lowercase tag rule, `target`/`rel`/`aria-label` as plain attrs; L2 — root layout / `<html lang>` (only if a `<Link>` example needs app context); L3 — landmarks (`<nav>` + `aria-label` naming), the "behavior/look are separate knobs" frame, the named-but-unbuilt nav-as-list, accessible name / accessibility tree.
