# Chapter 4.1 — JSX and HTML semantics through JSX

## Chapter framing

Unit 4 opens here, bridging the substrate of Units 1–3 to the UI layer. JSX and HTML are taught as one surface viewed from two sides: the student writes JSX, the browser receives HTML, and every prop, element, and attribute is a decision read by the browser, the accessibility tree, the crawler, and React's reconciler. Core threads run through every lesson: semantics over visuals (reach for `<button>`, `<a>`, `<nav>`, `<main>`, `<ul>`, `<table>` first; reach for `<div>`/`<span>` only when no semantic element fits); accessibility installed at the call site (Chapter 4.11 picks up the cross-cutting baseline on top); the JSX-as-property-syntax model and rename table from Chapter 3.5.2 (`className`, `htmlFor`, camelCase events, boolean attributes); lists with stable data-tied keys (`key={row.id}`, never the index); forms as a contract where `name` attributes key the `FormData` Chapter 7.3 will read; and the Elements panel plus the accessibility tree as the daily recognition instruments. The chapter installs the minimum viable element vocabulary a 2026 SaaS UI ships — document structure, landmarks, headings, buttons, links, lists, forms, `data-*` and `aria-*`, tables — and refuses the long-tail HTML catalog.

Six teaching lessons plus a quiz, ordered by dependency: 4.1.1 installs the JSX surface every later lesson rides on; 4.1.2 the Next.js root layout (which lands again at Server Components, the metadata API, and `next-themes`); 4.1.3 semantic landmarks and the heading hierarchy; 4.1.4 buttons, links, and lists; 4.1.5 forms as the element contract Chapter 7.3 will wire; 4.1.6 folds tables into the data-and-aria lesson because tables are short enough in 2026 SaaS code that a standalone lesson would be padding, and they share the "structural markup for assistive tech" frame with `aria-*`. Senior anchors seeded here land again across later units (reconciliation in 4.7.2, resetting state with key in 4.7.5, Server Components in 5.2, the metadata API in 5.6.9, native forms in 7.3, security headers in 17.2.1, the full ARIA treatment in 4.11.3). The deliverable is fluency: the student writes a root layout, a navigation surface, and a sign-in form in JSX with the right elements, the right props, the right ARIA, and the right keys — and recognizes each of those choices as a decision, not a default.

---

## Lesson 4.1.1 — JSX as HTML through React's lens

Topics to cover:

- **The senior question.** The student writes `<button className="btn" onClick={handleSubmit}>Save</button>` and the browser receives `<button class="btn">Save</button>` with a click handler attached at the React root. The lesson names JSX as property-syntax sugar that compiles through the JSX transform into element descriptors React renders into the DOM, and walks the differences from HTML — each one a specific bug class.
- **JSX in one paragraph.** JavaScript with an XML-like element syntax. The React automatic runtime (run by Turbopack) turns `<div className="row">Hello</div>` into `jsx('div', { className: 'row', children: 'Hello' })`. The student writes JSX; the transform handles the rest.
- **Element name as tag vs. component.** Lowercase names (`<div>`, `<button>`) are HTML tags; uppercase names (`<Button>`, `<SignInForm>`) are React components. The capitalization rule is structural. Chapter 4.6 owns components in depth.
- **Props are property syntax** — the rename table from Chapter 3.5.2 operating on the JSX surface:
  - **`className`** (not `class` — reserved word; DOM property is `className`).
  - **`htmlFor`** (not `for` — reserved word).
  - **`tabIndex`, `readOnly`, `maxLength`, `colSpan`, `rowSpan`** — camelCase matches the DOM property name, not the HTML attribute.
  - **`data-*` and `aria-*`** — stay kebab-case in JSX; passed through to the DOM as-is.
  - **Event props** — `onClick`, `onChange`, `onSubmit`, `onKeyDown`, `onFocus`, `onBlur`. CamelCase, value is a function. Chapter 4.7.6 owns synthetic events; Chapter 3.5.3 owns the DOM event model.
- **JavaScript in `{}`.** The expression slot. Valid uses: interpolation as a prop value (`href={profileUrl}`), interpolation as a child (`{user.name}`), conditional rendering with `&&` (`{isAdmin && <AdminPanel />}`), ternaries for two-branch rendering (`{user ? <Dashboard /> : <SignInPrompt />}`), nested function calls (`{formatCurrency(amount)}`). Statements are not allowed.
- **The `&&` short-circuit and the `0` trap.** `{items.length && <List />}` renders the literal `0` when the array is empty. Senior fix: explicit boolean coercion (`items.length > 0 && ...`) or a ternary.
- **Rendering lists with `.map` and the key rule.**
  - **The pattern.** `{rows.map(row => <Row key={row.id} {...row} />)}`.
  - **The key rule.** Keys must be stable, sibling-unique, and tied to the data — usually `key={row.id}`.
  - **The array-index trap** — the canonical wrong key; bug fires on filter/sort/reorder (the row at position 0 changes but React reuses the same DOM node and stale state).
  - **When data has no natural ID** — generate one at fetch time and persist (senior default), or `crypto.randomUUID()` at creation (Chapter 3.7.1). Never `Math.random()`, never the index.
  - **Forward references.** Chapter 4.7.2 owns reconciliation; Chapter 4.7.5 owns the resetting-state-with-`key` pattern.
- **Fragments — `<>...</>`.** Group siblings without a wrapping `<div>`. Use `<React.Fragment key={...}>` when the fragment itself needs a key (fragments in a `.map`). A `<div>` wrap purely to satisfy JSX's "one root" rule pollutes the DOM tree and breaks CSS/a11y assumptions.
- **Void elements and self-closing.** `<img>`, `<input>`, `<br>`, `<hr>`, `<meta>`, `<link>`, `<source>`, `<col>`, `<area>`, `<base>`, `<embed>`, `<param>`, `<track>`, `<wbr>` must self-close in JSX. Non-void elements may self-close when childless.
- **`dangerouslySetInnerHTML`** — the explicit XSS escape hatch. JSX children are escaped by default; legitimate sites are sanitized Markdown (`react-markdown`) and CMS-sanitized rich text (`dompurify` for user input). Chapter 9.4.4 owns the security depth.
- **Comments in JSX.** `{/* ... */}` inside JSX trees; usual `//` and `/* */` outside.
- **The JSX type system.** TypeScript types JSX via `JSX.IntrinsicElements` for built-ins and the component's prop type for components — autocomplete on props, compile-time errors on typos like `classname`.
- **`children` as a prop.** Content between a component's opening and closing tags arrives as `children`. Chapter 4.6.1 owns the children-as-API pattern.
- **The `style` prop** — an object with camelCase CSS property names, not a string. Rare in the course's stack (Tailwind utilities are the default — Chapter 4.2); reserved for dynamic values that don't fit a utility.
- **The watch-outs a senior names:**
  - The `&&` `0` trap — coerce to boolean when the left-hand side is numeric.
  - The array-index key trap — keys tied to data, never to position.
  - Forgetting the self-close on void elements (JSX parse error).
  - `className` not `class`, `htmlFor` not `for` — the two most-common typos.
  - Numbers vs. strings — `<div data-count={5}>` produces `data-count="5"` (attributes are strings); `<div>{5}</div>` produces a text node.
  - `null`/`undefined`/`false`/`true` render nothing; accessing properties on `undefined` throws (guard with `?.` or `&&`).
  - Multiple roots without a fragment is a syntax error.
  - `onClick={handleClick()}` calls on every render — pass the reference or wrap in an arrow.
  - The whitespace rule — JSX collapses whitespace between elements; use explicit `{' '}` when spacing matters.
  - JSX expressions accept expressions, not statements — use ternaries, `&&`, or extract above the return.

What this lesson does not cover:

- The HTML document structure at the Next.js root layout (4.1.2).
- Semantic landmarks and heading hierarchy (4.1.3).
- The button/link/list element families (4.1.4).
- Forms (4.1.5).
- `data-*` and `aria-*` at depth (4.1.6).
- React components, props, and composition at depth (Chapter 4.6).
- The render model and reconciliation (Chapter 4.7).
- Synthetic events at depth (Chapter 4.7.6).
- `children` as an API (Chapter 4.6.1).
- The Tailwind class composition surface and `cn()` (Chapter 4.2.3).
- The full XSS treatment and `dangerouslySetInnerHTML` security depth (Chapter 9.4.4).
- The JSX transform mechanics, classic vs. automatic runtime configuration — out of scope; Next.js handles it.

---

## Lesson 4.1.2 — The Next.js root layout: html, head, body, meta

Topics to cover:

- **The senior question.** A component returns `<h1>Welcome</h1>` and the browser renders a full page — `<html>`, `<head>` (with `<title>`, `<meta charset>`), `<body>`, the React tree, bundle scripts. In Next.js 16 App Router, `app/layout.tsx` and the metadata API author each piece. The lesson installs the document-structure model and names the senior watch-outs (hydration mismatches, third-party `<script>` injection, the misplaced `'use client'`).
- **The HTML document structure in one paragraph.** Every page has the same outer shape: `<!DOCTYPE html>` then `<html lang>` wrapping `<head>` (with `<meta charset>`, `<meta viewport>`, `<title>`, other metadata) and `<body>` (visible content).
  - **`<!DOCTYPE html>`** — standards-mode declaration. Next.js emits it.
  - **`<html lang="en">`** — root element with document language; always set `lang`. For i18n (Chapter 18.2), rendered dynamically per locale.
  - **`<head>`** — non-rendered metadata (`<meta>`, `<title>`, `<link>`, rare `<script>`).
  - **`<body>`** — visible content; React tree mounts here.
- **The Next.js App Router root layout.** `app/layout.tsx` defines the outermost shell: a default-exported `RootLayout` taking `{ children }: { children: React.ReactNode }` and returning `<html lang="en"><body>{children}</body></html>`.
  - **Server Component by default** (Chapter 5.2.1) — no `'use client'`, no hooks, renders on the server to HTML.
  - **Owns `<html>` and `<body>`**, exclusively. Nested layouts (Chapter 5.1.4) return JSX that slots inside `<body>`.
  - **The `children` prop** — Next.js injects the page (or nested layout) via the framework convention.
  - **The `lang` attribute** belongs here; for i18n, rendered from the URL/session locale.
- **Metadata — the `<head>` content, declaratively.** Export a `metadata` object (typed as `Metadata` from `next`, with fields like `title`, `description`, `icons`) or a `generateMetadata` async function for dynamic per-route metadata. Next.js renders `<title>`, `<meta name="description">`, `<link rel="icon">`, Open Graph and Twitter tags. Chapter 5.6.9 owns the full surface.
- **The `<meta charset>` and `<meta viewport>` defaults.** Next.js emits both automatically (UTF-8; `width=device-width, initial-scale=1`). `generateViewport` (Chapter 5.6.10) is the senior reach when per-route variation is needed — rare. Chapter 4.5.6 (responsive design) cashes in.
- **The `<body>` and the React tree.** Three patterns inside `<body>`:
  - The `{children}` slot.
  - Global providers wrapping `{children}` — theme (`next-themes`, Chapter 4.2.6), query client (TanStack Query, Chapter 16.1), i18n (`next-intl`, Chapter 18.2).
  - Persistent UI — navbar, toaster portal target (`<div id="toast-root" />`), global error boundary. Keep the root layout lean; push feature UI into nested layouts (Chapter 5.1.4).
- **Font and style integrations.**
  - **`next/font`** — load fonts at the root layout (`import { Inter } from 'next/font/google'`), invoke with `subsets`, apply the resulting `className` to `<html>` or `<body>`. Self-hosted by Next.js, subsetted, preloaded, CSS-variable-ready. Chapter 5.6.7 owns the depth.
  - **Global styles** — the root layout imports `globals.css` (Tailwind v4 entry point — Chapter 4.2).
- **The `'use client'` boundary doesn't belong on the root layout.** It poisons the whole tree as a client subgraph. Client concerns wrap in a `<Providers>` Client Component imported from a separate file and rendered as a child of `<body>`.
- **What does NOT belong in the root layout.**
  - Per-page metadata — overridden per-route by the page's `metadata` export.
  - Per-page UI — use nested layouts.
  - Heavy data fetching — every navigation pays; keep close to the page that needs it.
  - Direct `<head>` JSX — use the metadata API (handles dedup, ordering, overrides).
  - Client-only logic — push into `<Providers>`.
- **Hydration and the root layout.** Renders on the server to HTML; React hydrates by walking the same tree client-side and attaching handlers. Per-request randomness or time-dependent content (`Date.now()`, `crypto.randomUUID()`, server-only API calls) in the root layout produces mismatch warnings. Fix: scope to a Client Component, or `suppressHydrationWarning` on the specific element (rare; `next-themes` in Chapter 4.2.6 uses it on `<html>` because the theme class is set by an inline script before hydration). Chapter 5.2.8 owns the depth.
- **The `lang` attribute and i18n.** Hardcoded `<html lang="en">` for monolingual SaaS; dynamic from URL/session for i18n. Chapter 18.2 wires the depth.
- **The watch-outs a senior names:**
  - No `'use client'` on the root layout — poisons the tree.
  - No `<head>` JSX directly — use the metadata API. Rare exceptions for `<link rel="preconnect">`/`dns-prefetch` performance hints that the API doesn't fully cover (use the metadata `other` field).
  - Don't forget `lang` — missing it is an a11y regression.
  - No dynamic per-request content in the root layout without the SSR-safety pattern — push into a Client Component.
  - Don't import heavy server-only modules into the root layout — every navigation pays the cost.
  - The metadata API is the source of truth for `<head>` — manual tags risk dedup/ordering issues.
  - `<title>` belongs in the metadata API, not inline JSX.
  - `<html>` and `<body>` only in the root layout; nested layouts render inside `<body>`.
  - `React.ReactNode` is the type for `children`.

What this lesson does not cover:

- Semantic landmarks and heading hierarchy inside `<body>` (4.1.3).
- Per-page metadata, `generateMetadata`, OG/Twitter tags, dynamic OG images (Chapter 5.6.9).
- SEO file conventions — `robots.ts`, `sitemap.ts`, favicons (Chapter 5.6.10).
- `next/font` at depth (Chapter 5.6.7).
- The full Server / Client Component boundary treatment (Chapter 5.2).
- Hydration at depth and the full hydration-mismatch surface (Chapter 5.2.8).
- Nested layouts and the layout/page render boundary (Chapter 5.1.4).
- `next-themes` integration (Chapter 4.2.6).
- The `next-intl` integration (Chapter 18.2.5).

---

## Lesson 4.1.3 — Semantic landmarks and the heading hierarchy

Topics to cover:

- **The senior question.** A dashboard with a top nav, sidebar, main content, footer. Naive reach: four `<div>`s. Senior reach: `<header>`, `<nav>`, `<aside>`, `<main>`, `<footer>`. Landmarks form a navigable map for screen readers (JAWS `D` key, VoiceOver rotor), guide crawlers to the main content, support reader-mode, and keep the page legible without CSS.
- **The six landmark elements.**
  - **`<header>`** — introductory content for the page or a section. One page-level `<header>`; nested `<header>`s allowed inside `<article>`/`<section>` for their own intros.
  - **`<nav>`** — navigation. One primary `<nav>`; secondary navs (sidebar links, footer sitemap) also `<nav>` with `aria-label` to distinguish. Reserved for *navigation* — not every list of links.
  - **`<main>`** — the unique main content. Exactly one per page; not nested inside header/nav/aside/footer. Enables the "skip to main content" affordance.
  - **`<aside>`** — tangentially related content (related-articles sidebar, tip callout, contextual help). Not "the app's sidebar" if that sidebar holds navigation — that's `<nav>`.
  - **`<article>`** — self-contained content (blog post, comment, forum reply, product card). The test: would it make sense pasted elsewhere?
  - **`<section>`** — generic thematic grouping with a heading. Senior reach pairs it with `aria-labelledby` pointing at the heading's `id`.
  - **`<footer>`** — closing content for the page or a section. One page-level `<footer>`; nested allowed (`<article>` footers carry author/date/tags).
- **The page outline.** The landmark tree is the structural map a screen reader user navigates. Canonical SaaS shell: `<body>` containing `<header>` (with site name link and `<nav aria-label="Primary">`), `<main>` (with `<h1>` and two `<section aria-labelledby>`s each opened by `<h2 id>`), and `<footer>` (with `<nav aria-label="Footer">` and copyright).
- **The heading hierarchy (`<h1>` through `<h6>`).**
  - **`<h1>`** — the page's primary heading. Exactly one per page.
  - **`<h2>` through `<h6>`** — subsections in strictly decreasing significance. No skipped levels (`<h1>` → `<h3>` is an a11y violation).
  - **Senior reach.** Level is determined by outline position, not visual size. Style with Tailwind utilities; pick the level by content structure.
  - **The bug.** A `<div className="text-2xl font-bold">` styled to look like a heading produces a page with no navigable outline. Fix: use the right heading; style with utilities.
  - **Recognition tools.** NVDA's heading list, the Chrome Accessibility extension's outline view.
- **The `<p>` element.** The default block-level text container. Body text goes in `<p>` (not `<div>`, not raw text in `<main>`). `<br />` reserved for semantically meaningful hard line breaks; visual spacing uses CSS.
- **The `<ul>`, `<ol>`, `<li>` list elements.**
  - **`<ul>`** — unordered.
  - **`<ol>`** — ordered (`start` for starting number, `reversed` to count down).
  - **`<li>`** — direct child of `<ul>` or `<ol>` only.
  - **Senior reach.** Any sequence of related items is a list. Visual treatment (bullets, numbers, none) is independent — Tailwind's `list-none` strips markers; the semantic list remains announced.
  - **Watch-out.** A nav-as-flex-of-anchors without the `<ul>`/`<li>` wrap loses the "list of N items" announcement.
- **The `<div>` and `<span>` fallbacks.** `<div>` block-level, `<span>` inline. Use only when no semantic element fits. Avoid "div soup" — every level of nesting is a decision.
- **The `<br />` and `<hr />` elements.** `<br />` for semantically meaningful hard line breaks (addresses, poems); `<hr />` for thematic breaks. Rare in modern SaaS UI — a Tailwind border utility usually handles the visual divider.
- **The accessibility tree.** A parallel tree to the DOM (computed roles, names, states) that screen readers consume. Chrome DevTools → Elements → Accessibility shows it for the selected element. The recognition reach for "is this `<button>` actually announced as a button?" Chapter 4.11 owns the a11y baseline in depth.
- **`aria-labelledby` and `aria-label` for landmark naming.**
  - **`aria-labelledby="id"`** — name from a referenced element's text (section labelled by its heading). Avoids text duplication.
  - **`aria-label="text"`** — literal text as the name (`<nav aria-label="Primary">` vs. `<nav aria-label="Footer">`).
  - **Senior reach.** `aria-labelledby` when a visible heading exists; `aria-label` otherwise. Multiple same-type landmarks each get a distinguishing name.
- **The watch-outs a senior names:**
  - No `<div>`s where semantic elements fit — Tailwind styles any element.
  - Exactly one `<h1>` per page.
  - No skipped heading levels — fix by inserting or downgrading.
  - One `<main>` per page; no nested same-type landmarks at the same level.
  - `<section>` needs a heading; without one, downgrade to `<div>`.
  - Multiple `<nav>`s need `aria-label`s to disambiguate.
  - `<article>` for self-contained content only — a dashboard card is not an article.
  - Landmarks don't replace headings — the two systems cooperate.
  - "Skip to main content" link as the senior-level a11y affordance — a visually hidden link to `#main`, revealed on focus. Chapter 4.11.4 owns focus management.

What this lesson does not cover:

- The full accessibility baseline (Chapter 4.11) — keyboard navigation, focus management, contrast, reduced motion.
- ARIA roles, states, properties (4.1.6 covers the basics; Chapter 4.11.3 the depth).
- Button and link elements (4.1.4).
- Form elements (4.1.5).
- Tables (4.1.6 covers tables alongside data attributes).
- The Open Graph / Twitter metadata for sharing (Chapter 5.6.9).
- The `<dialog>` element for modals — out of scope here; modals via Radix in Chapter 4.6.5.

---

## Lesson 4.1.4 — Buttons, links, and lists

Topics to cover:

- **The senior question.** Three things on a page: a "Save" action, a navigation to `/dashboard`, a list of features. Naive reaches: `<div onClick>`, `<button>` for nav, a stack of `<div>`s. Senior reaches: `<button>`, `<a href>`, `<ul>`/`<ol>`. Each choice is a decision the keyboard, screen reader, autofill, right-click "Open in new tab," `Cmd+F`, and the accessibility tree all read.
- **Buttons in one paragraph.** A control that performs an *action* (form submit, modal open, row delete, toggle). Not navigation — that's a link. Browser handles keyboard activation for free (`Tab` focuses, `Enter`/`Space` activates, focus ring renders). Default styling stripped by Tailwind Preflight (Chapter 4.3.3); utilities or shadcn `<Button>` (Chapter 4.11.1) paint the visual.
- **`<button type>` and the form-submit default** — the load-bearing senior reflex. A `<button>` inside a `<form>` defaults to `type="submit"`. The three types: `submit` (default — submits the form), `button` (inert; runs `onClick`), `reset` (rare, anti-pattern). Senior reflex: every `<button>` declares its `type` explicitly. Recognition signal: a Cancel/Close button inside a form triggering an unintended submit.
- **`<button>` vs. `<a>` vs. `<div role="button">` — the decision.**
  - **`<button>`** for same-page actions (submit, modal open, delete, sort toggle).
  - **`<a href>`** for URL navigation. Gets `Cmd+click`, right-click "copy address," `Tab+Enter`, link announcement for free.
  - **`<div role="button">`** — the explicit anti-pattern. Requires manual keyboard activation (`onKeyDown` for `Enter`/`Space`), `tabIndex={0}`, focus-ring CSS, `aria-pressed` for toggles, cursor styling. Never; reach for `<button>` styled differently.
- **`<a href>` — the link element.**
  - **`href`** — required for activatability. Without it, `<a>` is inert (no focus, no activation).
  - **`<a target="_blank">`** — opens in a new tab. Pairs with `rel="noopener noreferrer"` (security against tabnabbing, privacy against `Referer` leak). Browser defaults are improving; explicit `rel` is still senior practice.
  - **`<a download>`** — file links; optional value renames the download.
  - **`<a rel>`** — common values `noopener noreferrer` (for `_blank`), `nofollow` (user-generated links), `external` (mostly stylistic).
- **Next.js `<Link>` and the navigation model.** `<Link href="/dashboard">` (from `next/link`) wraps `<a>` and adds soft client-side navigation; renders as plain `<a href>` in HTML (for SEO, `Cmd+click`, JS-off fallback). Internal links use `<Link>`; external use plain `<a target="_blank" rel="noopener noreferrer">`. Chapter 5.1.9 owns the depth.
- **Tailwind buttons and links — styling, not semantics.** Visual treatment via utilities (Chapter 4.2) or shadcn `<Button>` (Chapter 4.11.1), both composing into the same `<button>` or `<a>`. A button styled as a link is still a `<button>` (it acts); a link styled as a button is still an `<a>` (it navigates).
- **Lists in one paragraph.** `<ul>` unordered, `<ol>` ordered, `<li>` direct child of either. Any sequence of related items is a list — navs, feature grids, comment threads, audit entries.
- **Lists and the JSX surface.**
  - **`.map` over data, key per `<li>`** — `{items.map(item => <li key={item.id}>...</li>)}`. Pattern from Lesson 4.1.1.
  - **Nesting lists** for hierarchical content (file browser, threaded comments).
  - **`<ol>` attributes** — `start`, `reversed`, `type` (usually leave to CSS).
- **The `list-none` reset and the link-list pattern.** Tailwind Preflight strips default list styling (Chapter 4.3.3). The canonical nav: `<nav aria-label="Primary">` wrapping a `<ul className="flex gap-4">` of `<li>` items each containing a `<Link>` — semantic list, custom visual.
- **Lists vs. a flex of `<div>`s — the decision.** Related-and-parallel items (nav links, feature cards, comments) are lists. Unrelated visually-arranged items (hero + CTA, header + button) are not. The test: "would a screen reader user usefully know 'list of N items' here?"
- **Anchor-link best practice — `<a href="#section-id">`.** Native scroll-into-view and URL hash update. Senior reach for TOCs, skip-to-main links. Target needs a unique `id`. Smooth scrolling via CSS `scroll-behavior: smooth` (Tailwind `scroll-smooth`).
- **The `<button>` as a JSX form member.** Inside a `<form>`: `<button type="submit">` is the primary submit; `Enter` on any text input also submits. Cancel/Reset/Toggle buttons must be `type="button"` to avoid surprise submit. Chapter 7.3 wires the Server Action.
- **Disabled state on buttons.** `disabled` is a boolean prop; non-activatable; browser dims by default (Tailwind/shadcn give a refined state). A11y consequence: disabled buttons may be skipped in tab order — never put critical actions behind one without surfacing why (tooltip, inline message, `aria-describedby`).
- **`aria-label` and icon-only buttons.** Buttons whose only child is an icon (trash, copy, X) need `aria-label` for the accessible name. Common in toolbars and table rows. Chapter 4.11.3 owns ARIA depth.
- **The watch-outs a senior names:**
  - Every `<button>` declares its `type`.
  - `<a target="_blank">` pairs with `rel="noopener noreferrer"`.
  - Internal links use `<Link>` from `next/link`; external links use plain `<a>`.
  - Icon-only buttons need `aria-label`.
  - Disabled buttons aren't a substitute for explaining unavailability — surface the reason.
  - Semantic element matches behavior, not look — a link styled as a button is still a link; a button styled as a link is still a button.
  - `<a>` without `href` is inert; if the intent is action-on-click, it's a button.
  - `<button onClick={() => router.push('/dashboard')}>` is a navigation in button clothing — use `<Link>`.
  - `<div role="button">` requires manual a11y plumbing — never.
  - Lists inside `<nav>` are the canonical shape; bare anchors lose "list of N items."
  - `<button>` type values are lowercase (`type="button"`, not `"Button"`).
  - `formAction`, `formMethod`, `formEncType`, `formNoValidate`, `formTarget` on `<button>` override the parent form's attributes per-submit. Rare; named for recognition.

What this lesson does not cover:

- Forms in depth — `<form>` element, `<input>` types, `<label>`, the form contract (4.1.5).
- The Constraint Validation API and `setCustomValidity` (Chapter 7.3.7).
- The shadcn `<Button>` component and CVA variants (Chapter 4.11.1, Chapter 4.6.3).
- Focus management at depth (Chapter 4.11.4).
- The full ARIA treatment (Chapter 4.11.3).
- Tailwind utilities for buttons and links (Chapter 4.2).
- Next.js `<Link>` at depth — prefetching, the navigation model, scroll restoration (Chapter 5.1.9).
- The `<dialog>` element — out of scope; Radix/shadcn handle modals.

---

## Lesson 4.1.5 — Forms: the element contract

Topics to cover:

- **The senior question.** A sign-up form (email, password, confirmation checkbox, submit). Naive reach: controlled `<input>`s everywhere with `useState` and a custom submit handler. Senior reach: a `<form>` with `<label>` + `<input>`s carrying `name` attributes, a `<button type="submit">`, and server-side Zod validation reading from `FormData`. The lesson installs the form element surface as a *contract*; Chapter 7.3 wires the Server Action.
- **The `<form>` element.** Container for input controls submitted together.
  - **`action`** — URL or function (Chapter 7.3 wires the Server Action reference; plain HTML takes a URL string). Default: current URL.
  - **`method`** — `"get"` (default — query string) or `"post"` (request body). Any state-mutating form: `post`.
  - **`encType`** — default `application/x-www-form-urlencoded`; `multipart/form-data` for file uploads; `text/plain` rare.
  - **2026 reality.** `<form action={serverAction}>` is the senior default (Chapter 7.3.3) — the action is a function; React handles the wiring.
- **The `<input>` element — the typed-input surface.** The `type` attribute determines behavior, mobile keyboard, autofill suggestions. SaaS-relevant types:
  - **`text`** — default; names, addresses, free-form.
  - **`email`** — basic shape validation, email keyboard.
  - **`password`** — masked input; pairs with password manager.
  - **`number`** — numeric keyboard, `min`/`max`/`step`. Returns a *string* in `FormData`.
  - **`tel`** — phone-pad keyboard; no format validation.
  - **`url`** — URL-optimized keyboard.
  - **`date`** — date picker; value is ISO `yyyy-mm-dd`. Chapter 18.1 owns Temporal.
  - **`time`** — time picker; `hh:mm` or `hh:mm:ss`.
  - **`datetime-local`** — combined picker; `yyyy-mm-ddThh:mm`.
  - **`checkbox`** — single boolean; `checked` initial state.
  - **`radio`** — one of N in a group sharing `name`; `value` is what `FormData` receives.
  - **`file`** — file picker (Chapter 3.7.3 owns Blob/File).
  - **`hidden`** — not displayed but submitted; carries record IDs through submit.
  - **`submit`** — legacy submit-as-input; prefer `<button type="submit">` (more flexible content).
- **The `name` attribute as the contract.** The key under which the input value appears in `FormData`. Missing `name` silently drops the value from submission. Naming convention: pick one (`camelCase` is the senior reach in a Server Actions + Zod codebase to align with TypeScript) and stick.
- **The `<label>` element and form-element association.**
  - **Two patterns.** Explicit: `<label htmlFor="email">Email</label>` + sibling `<input id="email" name="email" type="email" />`. Implicit: a `<label>` wrapping both the text and the `<input>`.
  - **Why labels matter.** Screen-reader announcement on focus; expanded click target (mobile + motor difficulties); autofill identification.
  - **Senior reach.** Explicit `htmlFor` — works regardless of DOM nesting; integrates cleanly with form libraries.
  - **Placeholder is not a label.** 2010-era anti-pattern — screen readers ignore it, context disappears on focus, contrast is too low.
- **`<fieldset>` and `<legend>` for grouping.** `<fieldset>` groups related controls; `<legend>` (its first child) names the group, announced before each input. Default border stripped by Tailwind Preflight. Canonical site: a `<fieldset>` of `<input type="radio">` buttons.
- **The form input subset a senior reaches for daily.**
  - **`<textarea>`** — multi-line text. `name`, `rows`, `cols`, `maxLength`. `defaultValue` (uncontrolled) or `value` + `onChange` (controlled, Chapter 7.3.1).
  - **`<select>` with `<option>` children** — dropdowns. `name` on `<select>`; `value` on each `<option>`; `selected` for default; `multiple` for multi-select.
  - **`<input type="checkbox">`** — single boolean. Explicit `value` (default `"on"`) is the senior reach.
  - **`<input type="radio">` groups** — shared `name`; only one checked; `value` is what gets submitted.
- **Native constraints — the Constraint Validation API (light).**
  - **`required`** — blocks submission; native message per locale.
  - **`type`-based validation** — `email`, `url`, `number` enforce shape.
  - **`min` / `max`** — numeric and date ranges.
  - **`minLength` / `maxLength`** — string bounds. Watch-out: `maxLength` doesn't apply to `type="number"` — use `min`/`max`.
  - **`pattern`** — regex match. Rare in 2026 SaaS (Zod is more legible); named for completeness.
  - **Senior call.** Native constraints are UX, not security — pair with server-side Zod (Chapter 7.3.7) always. Chapter 7.3.7 owns the depth.
- **Submit without JavaScript — the progressive-enhancement frame.** With JS disabled, a `<form action method="post">` still submits via the browser default. The Server Action pattern (Chapter 7.3.3) preserves this; JS-disabled fallback works.
- **The `FormData` API** (Chapter 3.6.1 introduced; Chapter 7.3.2 cashes in). The browser builds `FormData` from named inputs on submit.
  - Values are strings — `type="number"` still yields a string; Zod's `z.coerce.number()` parses.
  - Checkboxes contribute their `value` when checked, nothing when unchecked.
  - Radio groups contribute the checked radio's `value` once under the shared `name`.
  - Multi-select contributes multiple entries (`FormData.getAll`).
  - The form's elements and `name` attributes define the `FormData` shape; the Zod schema validates it — the two are designed together.
- **The `autoComplete` attribute — the autofill contract.** The browser and password managers read it.
  - **Canonical SaaS values.** `email`, `username`, `current-password`, `new-password`, `given-name`, `family-name`, `name`, `street-address`, `postal-code`, `country`, `tel`, `organization`, `cc-number`, `cc-name`, `cc-exp`.
  - **Senior reach.** Every input that maps to a known category gets the right `autoComplete`. `autoComplete="off"` on passwords is a UX regression — use the semantic value.
- **Disabled and readonly inputs.** `disabled` — non-interactive and *not* submitted. `readOnly` — non-interactive but *is* submitted. Most "show but don't allow edit" cases are `readOnly`.
- **The watch-outs a senior names:**
  - Every input needs a `name` — missing it drops the value silently.
  - Every input needs a `<label>` — explicit `htmlFor`; placeholder is not a label.
  - `<button>` inside a `<form>` defaults to `type="submit"` (named in 4.1.4).
  - Native constraints are UX, not security — server-side Zod always (Chapter 7.3.7).
  - `<input type="number">` produces strings; Zod coerces.
  - `autoComplete="off"` is a UX regression — use the semantic value.
  - `<form>` inside `<form>` is illegal HTML — the browser drops the inner; refactor.
  - `Enter` on any text input submits — for forms where that's wrong, the input handles its own keydown.
  - `onSubmit` handlers need `event.preventDefault()` for custom JS handling; Server Actions handle it via the `action` prop.
  - `defaultValue` (initial, uncontrolled) vs. `value` + `onChange` (controlled) — uncontrolled is the Server Actions default; controlled is the React Hook Form conditional (Chapter 7.4). Chapter 3.5.2 installed the distinction.
  - File inputs are uncontrolled — `<input type="file">` can't have `value` set by React; read via `inputRef.current?.files?.[0]`.
  - `Enter` submits a form with no visible submit button too — include one (visually hidden if needed) or capture on the input.

What this lesson does not cover:

- The native React 19 form pattern with Server Actions (Chapter 7.3.3).
- `useActionState`, `useFormStatus`, `useOptimistic` (Chapter 7.3.4 through 7.3.6).
- Controlled vs. uncontrolled inputs at depth (Chapter 7.3.1).
- The Constraint Validation API at depth — `setCustomValidity`, `ValidityState`, `:invalid` (Chapter 7.3.7).
- Zod schema authoring (Chapter 7.1).
- React Hook Form as the conditional past the native pattern (Chapter 7.4).
- File uploads — `<input type="file">` mechanics, `Blob`/`File` primitives (Chapter 3.7.3).
- The shadcn `<Form>` primitives (Chapter 4.11.1, Chapter 7.6.2).
- Multi-step wizards (Chapter 16.4 conditional project).

---

## Lesson 4.1.6 — Data attributes, ARIA basics, and tables

Topics to cover:

- **The senior question.** A delegated click handler that needs to know which row was clicked (`data-row-id`), an icon-only button screen readers need to announce as "Delete" (`aria-label`), a sort-state toggle whose pressed state assistive tech needs (`aria-pressed`), and an audit-log view that's genuinely tabular (`<table>`). Three attribute families and one element family — none individually a full lesson, but each is the senior reflex in its corner.
- **`data-*` attributes — the model.**
  - **The pattern.** Custom attributes the browser stores but doesn't render. JavaScript reads via `element.dataset.fooBar` (Chapter 3.5.1 introduced the API). Canonical site: delegation hooks (`event.target.closest('[data-action]')`).
  - **Kebab-case to camelCase translation.** `data-row-id` in HTML reads as `dataset.rowId` in JS — the DOM API translates.
  - **The 2026 consumers.** Delegation (Chapter 3.5.3), test selectors (Playwright in Chapter 19.5 — `data-testid`), analytics (`data-event-name`), Tailwind structural variants (Chapter 4.2.4 — `data-[state=...]`).
  - **Senior reflexes.** `data-*` for structural hooks — not display content, not what `aria-*` is for. Always the `data-` prefix; never invented attributes.
  - **The JSX form.** Kebab-case in JSX (`data-row-id`), camelCase in the reader (`dataset.rowId`).
- **`aria-*` attributes — the basics.** Chapter 4.11.3 owns the full ARIA treatment; this lesson installs the daily-reach surface.
  - **The first rule of ARIA** — no ARIA is better than bad ARIA. Reach for the semantic element first; ARIA fills gaps the native semantics don't cover.
  - **`aria-label`** — accessible name for an element with no visible text. Canonical sites: icon-only buttons (4.1.4), multi-instance `<nav>` regions (4.1.3), inputs without an associated label (rare — prefer `<label>`).
  - **`aria-labelledby="id"`** — name by reference to another element's text (e.g., a section labelled by its heading). Avoids duplication.
  - **`aria-describedby="id"`** — extended description by reference (form field paired with an error message `<p id role="alert">`).
  - **`aria-current="page"`** — current item in a set (nav link pointing at the current page).
  - **`aria-expanded="true|false"`** — disclosure toggle (panel, accordion, dropdown). Pairs with `aria-controls="id"`.
  - **`aria-pressed="true|false"`** — toggle button (bold/italic, favorite).
  - **`aria-hidden="true"`** — hide from the accessibility tree (decorative icons whose meaning is conveyed by adjacent text). Never on interactive elements — creates an unreachable trap.
  - **`role="..."`** — overrides the default role. Rarely the right reach in 2026; legitimate uses are `role="alert"` (urgent live region), `role="status"` (non-urgent), `role="dialog"` on modal containers (though `<dialog>` is the more modern choice).
- **Live regions for dynamic content** — named once; Chapter 4.11.3 cashes in. `aria-live="polite"` (idle announcement — toasts, "saved"), `aria-live="assertive"` (interrupts — critical alerts), `role="alert"` (shorthand for assertive — senior reach for inline form errors).
- **Tables — the senior decision.** When is `<table>` right?
  - **For tabular data only** — rows and columns of related info indexed by (R, C). Canonical SaaS sites: audit logs, invoice line items, billing breakdowns, metrics dashboards.
  - **Not for layout, card lists, or forms.** Use CSS grid, `<ul>` with grid layout, or `<form>` with `<fieldset>` respectively.
  - **Decision test.** Could rows and columns be swapped as a meaningful transposition? Are rows heterogeneous "things" with a shared attribute structure?
- **The `<table>` element family.** `<table>` container; `<thead>`/`<tbody>`/`<tfoot>` row groups (multiple `<tbody>`s rare; `<tfoot>` rare in dashboards, common in invoices); `<tr>` row; `<th scope="col|row">` header cell; `<td>` data cell. `<thead>` stays visible on scroll with `position: sticky` (Tailwind utility).
- **The canonical SaaS table shape.** `<table>` with a `<thead>` row of `<th scope="col">` cells, and a `<tbody>` mapping rows where each `<tr>` keys on `row.id` (React reconciliation), carries `data-row-id` (delegation), opens with a `<th scope="row">` for the row's identifier column, and uses `<td>` for the rest. Numeric columns use `className="text-right"`.
- **`<caption>`** — table title (above by default; `caption-side: bottom` flips it). Announced before column headers. Every standalone table has one (visible or visually hidden).
- **`colspan` / `rowspan`** — span across columns/rows. Rare in 2026 SaaS; canonical use is a `<tfoot>` "Total" row. In JSX: `colSpan`/`rowSpan` (camelCase).
- **`<colgroup>` / `<col>`** — column-level styling/spanning. Rarely written by hand; named for recognition.
- **Tables and accessibility.**
  - **`<th scope>`** is load-bearing for header-to-cell association.
  - **Row and column counts** are announced to screen reader users navigating the table ("table, 8 columns, 50 rows").
  - **`<caption>`** provides the table name.
  - **Empty cells** — render an explicit em-dash (`—`) or `aria-label="No value"` for "intentionally empty."
- **When to drop the `<table>`.** Card list / grid of items → `<ul>` with grid layout. Two-column form layout → CSS grid on `<form>`. Product comparison → could be a table; depends on whether rows-and-columns is the natural model.
- **Responsive tables.** Wrap in `<div className="overflow-x-auto">` for horizontal scroll. For complex tables, switch to a card-per-row layout below `md` (Tailwind responsive variants — Chapter 4.5.6). Don't `display: block` on `<tr>`/`<td>` — breaks the accessibility-tree structure.
- **The watch-outs a senior names:**
  - `data-*` for structural hooks, `aria-*` for assistive-tech signals — not interchangeable.
  - No ARIA is better than bad ARIA — semantic element first.
  - `aria-label` on a `<button>` with visible text *overrides* the text (and risks mismatch) — only label icon-only buttons.
  - `aria-hidden` on focusable elements creates an unreachable trap — only on decorative elements (icons next to text labels, ornamental SVGs).
  - `role="button"` on a `<div>` is wrong — use `<button>`. Same for `role="link"`, `role="checkbox"`, `role="textbox"`.
  - `<table>` for layout is a 1990s reflex — use CSS grid (Chapter 4.4.4).
  - `<th scope>` is non-negotiable in data tables.
  - `data-row-id` for delegation hooks; the HTML `id` attribute is for unique identifiers (anchor links, label associations).
  - `data-testid` is fine for Playwright but the senior reach is accessible queries (`getByRole`, `getByLabelText`) first (Chapter 19.4).
  - Kebab in JSX `data-*`, camelCase in `dataset` reader — translation is automatic.
  - Mobile tables: wrap or switch to a card layout; never break semantics with `display: block`.

What this lesson does not cover:

- The full ARIA treatment (Chapter 4.11.3) — every role, every state, the WAI-ARIA Authoring Practices.
- Focus management at depth (Chapter 4.11.4) — focus trap, focus restoration on route change.
- Live regions at depth — when to use `polite` vs. `assertive`, screen reader behavior across browsers.
- The full table accessibility specification — `headers` attribute (manual header references), `<col>` and `<colgroup>` styling at depth.
- TanStack Table or the data-grid component family — out of scope.
- Sorting, filtering, virtualized tables — out of scope for this lesson.
- The `<dialog>` element — out of scope; Radix-managed dialogs in Chapter 4.6.5.

---

## Lesson 4.1.7 — Quiz

Top ten topics to quiz:

1. JSX is property syntax — compiles to `jsx(...)` calls producing element descriptors that React renders into the DOM. The prop names follow the DOM property names, not the HTML attribute names: `className`, `htmlFor`, `tabIndex`, `readOnly`, `colSpan`. `data-*` and `aria-*` stay kebab-case in JSX.
2. List rendering needs keys; keys must be stable, unique among siblings, tied to the data. The array index is the canonical wrong key — the bug fires when the list is filtered, sorted, or reordered. The senior default is `key={row.id}`.
3. The `&&` short-circuit's `0` trap — `{items.length && <List />}` renders `0` when the array is empty. The senior reach is explicit boolean coercion (`{items.length > 0 && ...}` or a ternary).
4. Void elements (`<img>`, `<input>`, `<br>`, `<hr>`, `<meta>`) must self-close in JSX (`<img />`). Fragments (`<>...</>`) group siblings without an extra wrapping element.
5. The Next.js root layout (`app/layout.tsx`) is a Server Component that owns the `<html>` and `<body>` tags; the `metadata` export (or `generateMetadata` for dynamic) generates the `<head>` content. Don't put `'use client'` on the root layout — wrap client concerns in a `<Providers>` child.
6. The six landmark elements — `<header>`, `<nav>`, `<main>`, `<aside>`, `<article>`, `<section>`, `<footer>` — form the page outline assistive tech navigates. Multiple `<nav>` regions need `aria-label`s to distinguish them. Headings (`<h1>` through `<h6>`) follow a strict hierarchy — exactly one `<h1>` per page, no skipped levels; the level is determined by outline position, not visual size.
7. `<button>` is for actions, `<a href>` is for navigation. `<button>` inside a `<form>` defaults to `type="submit"` — every button declares its `type` explicitly. `<a target="_blank">` always pairs with `rel="noopener noreferrer"`. Internal Next.js navigation uses `<Link>`; external links use plain `<a>`. Icon-only buttons need `aria-label`.
8. Form elements form a contract — `name` attributes are the keys into `FormData`, `<label htmlFor>` associates labels to inputs (placeholder is not a label), `<fieldset>` + `<legend>` group related inputs, `<button type="submit">` is the senior reflex. Native constraints (`required`, `type`, `pattern`, `minLength`) are UX, not security — always pair with server-side Zod (Chapter 7.3.7).
9. `data-*` for script hooks (delegation, tests, CSS state) vs. `aria-*` for assistive-tech signals (`aria-label`, `aria-labelledby`, `aria-describedby`, `aria-current`, `aria-expanded`, `aria-pressed`, `aria-hidden`, `role="alert"`). The first rule of ARIA — no ARIA is better than bad ARIA. Reach for the semantic element first.
10. `<table>` for tabular data only — rows and columns of related information indexed by (R, C). The semantic structure: `<table>`, `<caption>`, `<thead>` with column-header `<th scope="col">`, `<tbody>` with `<tr>` rows where the row identifier is `<th scope="row">` and other cells are `<td>`. Wrap in `overflow-x-auto` for responsive layouts; don't `display: block` the table elements (breaks the accessibility tree).

---

## Total chapter time

Roughly 275 to 335 minutes across the six teaching lessons plus the quiz. The chapter fits across three to four evenings — JSX-as-HTML in the first sitting (50-60 minutes); the root layout in a second short sitting (35-45 minutes); landmarks and headings in a third sitting (45-55 minutes); buttons-links-lists and forms across two sittings (95-115 minutes total); data-and-ARIA-and-tables in a final sitting (50-60 minutes plus the quiz). The student finishes the chapter able to write JSX with `className`/`htmlFor`/event props/curly-brace expressions/list keys/fragments/void elements by reflex, configure the Next.js root layout with the right `<html lang>` and `metadata` export, structure a page with the six landmark elements and a clean heading hierarchy, pick `<button>` vs. `<a>` vs. `<Link>` by intent, write forms whose elements are a contract with the server-side Zod schema, place `data-*` and `aria-*` attributes at the right call sites with the right consumers in mind, and reach for `<table>` only when the data is actually tabular. Chapter 4.2 opens on the other side with Tailwind — the styling surface that paints the semantic elements this chapter just installed.
