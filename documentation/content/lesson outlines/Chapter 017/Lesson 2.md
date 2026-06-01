# Lesson 2 — The Next.js root layout owns the document shell

- **Title:** The Next.js root layout owns the document shell
- **Sidebar label:** The root layout

---

## Lesson framing

Second lesson of Unit 3. Lesson 1 installed the JSX surface — the student can read and write JSX, interpolate expressions, render lists, and recognizes `children` as a prop (named there as a forward reference, cashed in here).
This lesson answers a question the student has implicitly carried since they first ran `pnpm dev`: a component returns `<h1>Welcome</h1>`, yet the browser shows a full HTML document — `<!DOCTYPE html>`, `<html lang>`, `<head>` with a `<title>` and `<meta charset>`, `<body>`, the React tree, bundle scripts. *Who writes the rest of the page?* The answer is the Next.js App Router root layout plus the metadata API, and this lesson installs the model of which file authors which piece of the document.

The spine is **three authors of one document**: `app/layout.tsx` owns `<html lang>` and `<body>` (and nothing else owns them); the metadata API (`metadata` export / `generateMetadata`) owns `<head>`; a `<Providers>` Client Component owns the client subgraph inside `<body>`. Every later framework lesson rides on this split — Server Components (Ch 030), the metadata API at depth (Ch 034 L6), `next-themes` (Ch 018 L6), nested layouts (Ch 029 L4) all re-enter through the door this lesson opens. Keep that "three authors" framing audible from the introduction to the recap.

The senior-mindset thread: the document shell is a set of *decisions read by machines you don't see* — the crawler reads `<title>` and `<meta description>`, the screen reader reads `<html lang>`, the browser reads `<meta charset>` before it can decode a single byte, the React runtime reads the server-rendered tree to hydrate it. The root layout is where those decisions are authored once for the whole app, so the cost of getting it wrong (or putting the wrong thing there) is global. Three watch-outs carry the most production weight and must land as *recognizable failure modes*, not trivia: `'use client'` on the root layout poisons the entire tree; per-request nondeterminism (`Date.now()`, random IDs) in the layout produces hydration mismatches; heavy data fetching or `<head>` JSX in the layout taxes every navigation.

Mental model the student should leave with: **the root layout is a Server Component that renders once around every page, owns `<html lang>` and `<body>` exclusively, delegates `<head>` to the metadata API, and pushes anything client-only into a `<Providers>` child — and the things you must NOT put there (a `'use client'` directive, raw `<head>` tags, per-request randomness, heavy fetches) each map to a specific, nameable failure.**
At the end the student can write a correct `app/layout.tsx` from memory — `lang`, `{children}` typed as `React.ReactNode`, a `metadata` export, `globals.css` import, a font className, a `<Providers>` wrapper — and can explain why each line is where it is and what breaks if it moves.

Cognitive-load management: the topic is conceptually shallow but has many small parts. Sequence from the artifact outward — show the rendered document first (the thing the student has already seen in DevTools), then reveal its authors one at a time: the shell file, then `<head>` via metadata, then the three things inside `<body>`, then the integrations (fonts, global CSS), then the `'use client'` boundary and *why* it lives on `<Providers>`, then the hydration footgun, then a consolidating "what does NOT belong" section. Fold each watch-out into the section teaching the concept it qualifies. Server / Client Components, hydration depth, metadata depth, fonts depth, nested layouts are all explicitly downstream (see Scope) — name them as forward references, do not teach them.

Code style: examples ship the real 2026 shape (a typed `RootLayout`, `Metadata` import, `next/font`, `globals.css`, `<Providers>`) but stay deliberately under-styled — Tailwind utilities beyond a font className are Chapter 018. Keep every snippet to the minimum that makes the point; the layout file is short by design and the lesson should reinforce "keep the root layout lean."

---

## Lesson sections

### Introduction (no header)

Warm, brief, one concrete scene. The student's whole app so far is components returning fragments of UI, yet `view-source` on any page shows a complete HTML document they never wrote — doctype, `<html lang="en">`, a `<head>` with `<title>` and `<meta charset="utf-8">`, `<body>`, then the React tree and bundle `<script>`s.
Name the question: *who authors the document the components live inside?* Answer in one sentence: in the Next.js App Router, one file (`app/layout.tsx`) plus the metadata API write that shell, and knowing which piece each owns is the difference between a layout a senior trusts and one that silently breaks SEO, accessibility, or hydration.
State the goal: by the end, write a correct root layout from memory and know what must never go in it. Connect back to Lesson 1 ("you learned JSX produces the React tree — this lesson is about the document that tree mounts into, and you'll finally meet `children` as the prop Lesson 1 named").
No header — flow into the first h2.

### Every page is the same HTML document

**Goal:** install (recap, fast) the universal outer shape of an HTML document, so the rest of the lesson can talk about "the `<head>`", "the `<body>`", "`lang`" without ambiguity. The student saw the DOM as a tree in Ch 014; this is the *document* frame on top of it.

Content:
- Every web page, regardless of framework, has the same outer skeleton: `<!DOCTYPE html>` then `<html lang>` wrapping two children — `<head>` (metadata the user never sees rendered) and `<body>` (the visible content).
- The four load-bearing pieces, one line each:
  - **`<!DOCTYPE html>`** — the standards-mode switch. Not an element; a parser instruction. Next.js emits it; you never write it.
  - **`<html lang="en">`** — the root element; `lang` declares the document's language to screen readers (pronunciation), the browser (hyphenation), and translation tools. Always set it.
  - **`<head>`** — non-rendered metadata: `<title>`, `<meta charset>`, `<meta viewport>`, `<link rel="icon">`, social tags.
  - **`<body>`** — everything visible; the React tree mounts here.
- The senior point to plant for the whole lesson: `<head>` content is *machine-read* — `<title>` is the browser tab and the search result heading, `<meta charset>` tells the browser how to decode bytes (wrong or missing = mojibake), `<meta name="description">` is the search snippet. These aren't decoration; they're contracts with crawlers and the browser.

**Diagram — hand-coded SVG or HTML/CSS, wrapped in `<Figure>`.** A single annotated illustration of the document skeleton: a labelled tree/box showing `<!DOCTYPE html>` → `<html lang>` → { `<head>` (with a couple of child meta tags listed) , `<body>` (with a "React tree mounts here" note) }. Pedagogical goal: give the student one canonical picture of the shell to anchor every later "the layout owns this part, metadata owns that part" claim. Keep it small and static — this is a labelled diagram, not a sequence. Per the diagrams guide, "picture of a specific thing" (document structure) is the SVG sweet spot; a simple HTML/CSS nested-box version is an equally good fallback and is devtools-inspectable. Cap height tightly.

**Term tooltips:** *standards mode* ("the modern, spec-compliant browser rendering mode that `<!DOCTYPE html>` switches on — the alternative, quirks mode, emulates 1990s bugs"); *mojibake* only if used ("garbled text from decoding bytes with the wrong character encoding").

### app/layout.tsx is the shell

**Goal:** install the root layout file — its location, its exact shape, that it is a Server Component, and that it owns `<html>` and `<body>` exclusively. This is the structural heart of the lesson.

Content:
- The convention: in the App Router, `app/layout.tsx` is the *root layout* — the outermost component, rendered once around every page in the app. It is **required**; Next.js won't build without it.
- The shape, walked piece by piece (see AnnotatedCode below):
  - A **default export** named `RootLayout`. Default export here is mandatory — the App Router dispatches on it. Tie to the code convention: default exports are used *only* where the framework dictates (`layout.tsx`, `page.tsx`, `route.ts`, …), named exports everywhere else. Name this so the student doesn't read it as a style contradiction.
  - It takes **`{ children }: { children: React.ReactNode }`**. `children` is the page (or a nested layout) that Next.js injects via the framework convention — this is the `children` prop Lesson 1 named, now load-bearing. `React.ReactNode` is the type for *anything React can render* (JSX, strings, numbers, arrays, `null`/`undefined`); the full children-as-API treatment is Ch 022 L1 — here just name the type.
  - It returns **`<html lang="en"><body>{children}</body></html>`**. The layout *is* the document shell — it literally renders the `<html>` and `<body>` tags.
- **Server Component by default** — the single most important architectural fact. No `'use client'` directive, no hooks, no browser APIs; it renders on the server to HTML. The student hasn't met the Server/Client split formally (Ch 030) — give it one honest sentence here ("Next.js components run on the server by default and ship no JavaScript to the browser; you opt a component into the browser with a directive you'll meet in a moment") and forward-reference Ch 030 for the depth. Do not teach the two-render model here.
- **Owns `<html>` and `<body>` exclusively.** No other file renders these tags. Nested layouts (Ch 029 L4 — forward reference only) return JSX that slots *inside* `<body>` via their own `children`; they never re-render `<html>`/`<body>`. State this as a hard rule with a one-line reason: two `<html>` tags is invalid HTML.
- **`lang` belongs here.** Hardcode `lang="en"` for a monolingual SaaS. For i18n the value is rendered dynamically from the URL/session locale (Ch 084) — one-line forward reference, no detail. Missing `lang` is a real accessibility regression (the screen reader guesses the language), so it earns the senior reflex "every root layout sets `lang`."

**Component — AnnotatedCode.** The canonical minimal `app/layout.tsx` (default-exported `RootLayout`, typed `children`, `globals.css` import, returns `<html lang="en"><body>{children}</body></html>`), walked in 4–5 steps:
1. `{1}` import `globals.css` — names the Tailwind entry point (detail deferred to Ch 018); color `violet`.
2. the `export default function RootLayout` line + the `{ children }: { children: React.ReactNode }` param — default export is framework-mandated, `children` is the injected page; color `blue`.
3. `<html lang="en">` — owns the root element, sets the language; color `green`.
4. `<body>{children}</body>` — the page mounts here; color `green`.
5. (optional) a closing step highlighting the whole return to restate "this file *is* the shell."
AnnotatedCode is right: one short file, attention directed to specific lines in sequence. This is the file the student must be able to reproduce, so the walkthrough is the spine of the section.

**Diagram — `<FileTree>`.** Tiny tree showing `app/` with `layout.tsx` (bold/highlighted), `page.tsx`, `globals.css`, and a `_components/providers.tsx` placeholder, to ground "where does this file live" before the providers section references it. Matches the code-convention repo layout (`app/`, `app/_components/`). Keep it to ~6 rows.

**Term tooltips:** *root layout* ("the App Router's outermost layout at `app/layout.tsx`, rendered once around every route — owns `<html>` and `<body>`"); *Server Component* ("a component that runs only on the server and ships no JavaScript to the browser — the Next.js default; full treatment in a later chapter"); *`React.ReactNode`* ("the TypeScript type for anything React can render: JSX, strings, numbers, arrays, `null`/`undefined`").

### The metadata API writes the head

**Goal:** install the metadata API as the *declarative* owner of `<head>` content, and the reflex that you never hand-write `<head>` tags in the layout.

Content:
- The reframe: you don't put `<title>` or `<meta>` tags inside the layout's JSX. Instead you **export a `metadata` object** (typed `Metadata` from `next`) from `layout.tsx` (or any `page.tsx`), and Next.js renders the corresponding `<head>` tags for you.
- The minimal shape: `export const metadata: Metadata = { title: 'Acme', description: '…' }` → Next.js emits `<title>Acme</title>` and `<meta name="description" content="…">`. Show the common fields a SaaS sets at the root: `title`, `description`, `icons` (favicon). Name that `title` can be a template object for per-page suffixes — one line, depth is Ch 034.
- **Static vs. dynamic.** `metadata` (a constant object) for values known at build time; `generateMetadata` (an async function returning `Metadata`) when the title/description depend on the route's data (e.g. an invoice's number). Name `generateMetadata` and its shape in one or two sentences; the full surface — OG/Twitter cards, `metadataBase`, dynamic OG images — is Ch 034 L6 (forward reference, no detail).
- **The defaults Next.js gives you free.** `<meta charset="utf-8">` and `<meta name="viewport" content="width=device-width, initial-scale=1">` are emitted automatically — you don't write them, and you rarely override them. The separate `viewport` export / `generateViewport` exists for per-route variation (theme color, etc.) and is a rare senior reach — Ch 034 L7, forward reference only.
- **Why the API instead of raw tags** — the senior reasoning, stated plainly: the metadata API **deduplicates and orders** head tags and lets a page **override** the layout's defaults (a page's `title` wins over the layout's). Hand-written `<head>` JSX bypasses all of that and risks duplicate/conflicting tags. This is the *reason* behind the watch-out, so it must be argued, not asserted.
- The one honest exception, named for recognition: performance hints like `<link rel="preconnect">` / `dns-prefetch` that the typed fields don't fully cover go through the metadata `other` field — not raw JSX. One sentence.

**Diagram — `<ArrowDiagram>` inside `<Figure>` (`expandable={false}`), mapping the `metadata` object to rendered `<head>` tags.** Left box: a small `metadata` object literal (`title`, `description`, `icons`). Right box: the rendered `<head>` with `<title>`, `<meta name="description">`, `<link rel="icon">`. Arrows (or color-matched tints — prefer color-matching per the ArrowDiagram guide, since three parallel field→tag correspondences in one gap is exactly the "use tints, not curves" case): `title` → `<title>`, `description` → `<meta name="description">`, `icons` → `<link rel="icon">`. Pedagogical goal: make "the object you export *becomes* the head tags" concrete and dispel the urge to write the tags by hand. Author the boxes as real HTML code-lines per the ArrowDiagram MDX-brace rules. If arrows read cleaner than tints for only three rows, that's an acceptable call — leave the choice to the writer but default to color-matched identity.

**Exercise — `Buckets` (two-column).** Instructions: "Sort each task into who owns it in the document." Buckets: **Metadata API** (`<head>` content) vs **Root layout JSX** (`<html>`/`<body>` structure). Items: "The page `<title>`" (metadata), "The `<meta name=\"description\">`" (metadata), "The favicon link" (metadata), "The `lang` attribute" (layout), "The `<body>` element" (layout), "Wrapping the page in `{children}`" (layout), "The `<meta charset>`" (metadata — *automatic*, but conceptually the API/framework's job, not hand-written JSX). Pedagogical goal: cement the "who authors what" split, which is the lesson's spine. Two buckets, clean discrimination, high signal.

**Term tooltips:** *metadata API* ("Next.js's declarative way to author `<head>` — export a `metadata` object or `generateMetadata` function instead of writing `<head>` tags by hand"); *favicon* only if helpful ("the small site icon shown in the browser tab and bookmarks").

### What lives inside the body

**Goal:** install the three things that legitimately go inside `<body>` around `{children}` — the children slot, global providers, and persistent UI — and the "keep the root layout lean" discipline.

Content:
- Three patterns, in order of how often they appear:
  - **The `{children}` slot** — always present; the page renders here.
  - **Global providers wrapping `{children}`** — app-wide context every page needs: theme (`next-themes`, Ch 018 L6), the query client (TanStack Query, Ch 076), i18n (`next-intl`, Ch 084). These are the canonical reason a root layout has a child wrapper. (The *why they're a Client Component* is the next section's job — here just establish that providers wrap `{children}`.)
  - **Persistent UI** — chrome that survives navigation: a global toaster portal target (`<div id="toast-root" />`), a top-level error boundary. Mention a site-wide navbar as a *candidate* but immediately qualify: feature/section UI belongs in **nested layouts** (Ch 029 L4), not the root — the root layout is shared by *every* route including sign-in and marketing pages.
- **The lean-root discipline** (senior reflex): the root layout runs on every navigation, so everything in it is paid for globally. Keep it to the shell, providers, and truly global chrome; push everything route-specific down into nested layouts. State this as the principle behind several of the later watch-outs.

Use a single `Code` block showing the `<body>` with `<Providers>{children}</Providers>` plus a `<div id="toast-root" />` sibling — enough to make the three patterns concrete without a heavy walkthrough. Prose carries the "lean root" point.

**Term tooltips:** *provider* ("a component that supplies app-wide context — theme, auth, data cache — to everything rendered beneath it"); *portal target* ("a fixed DOM node, like `#toast-root`, that React renders overlay UI into from anywhere in the tree").

### Fonts and global styles load at the root

**Goal:** install the two integrations the root layout is the canonical home for — `next/font` and the `globals.css` import — at recognition depth, without teaching either subsystem.

Content:
- **`next/font`** — load fonts in the root layout because the font applies to the whole document. The shape: `import { Inter } from 'next/font/google'`, call it once at module scope with options (`const inter = Inter({ subsets: ['latin'] })`), then apply the returned `inter.className` (or its CSS variable) to `<html>` or `<body>`. The payoff to *name* (not teach): Next.js self-hosts and subsets the font at build time and preloads it, so there's no layout-shift flash and no request to Google at runtime. Depth — `next/font/local`, variable fonts, the Tailwind CSS-variable bridge — is Ch 034 L4 (and Ch 021 L1); forward reference only.
- **`globals.css`** — the root layout imports it (`import './globals.css'`). This is the single global stylesheet for the app and the Tailwind v4 entry point (`@import "tailwindcss"`); Chapter 018 owns Tailwind. Name that the import lives in the root layout so global styles apply everywhere, and that it's imported for its side effect (no named export).
- Tie both together: the root layout is "load once, apply everywhere" — fonts and global CSS belong here for the same reason `<html lang>` does.

**Component — AnnotatedCode** (or extend the earlier one — writer's call; a fresh small block is cleaner). The root layout with the font import + `globals.css` import + `className={inter.className}` on `<html>`, walked in 3 steps: the `globals.css` import (side-effect, Tailwind entry), the `Inter({ subsets })` call (self-hosted at build), the `className` application (font cascades to the whole document). Color the font line and the className line the same to show they're connected.

**Term tooltips:** *subsetting* ("shipping only the glyphs a language needs — e.g. Latin — to shrink the font file"); *layout shift* / *CLS* ("content jumping as a late-loading font or image arrives — `next/font` prevents the font-driven case").

### Client code belongs in a Providers child, not the root

**Goal:** the lesson's highest-stakes architectural rule — never put `'use client'` on the root layout — taught as *cause and effect*, with the `<Providers>` pattern as the fix.

Content:
- The directive in one sentence: `'use client'` at the top of a file marks it (and everything it imports) as code that also runs in the browser — the opt-in out of the Server Component default. (Recognition depth only; Ch 030 owns the boundary model.)
- **Why it must not go on the root layout:** the directive is *contagious downward* — a `'use client'` layout turns the entire app, every page beneath it, into a client subgraph. That forfeits the Server Components default (server-only data access, zero-JS rendering) for the whole app. Frame it as the failure mode: "one wrong directive at the top of `layout.tsx` and you've shipped your entire app to the browser as client JavaScript." This is the watch-out the chapter framing flags first; make it *visceral*.
- **The fix — a `<Providers>` Client Component.** Client concerns (theme provider, query client provider — anything that uses React state, effects, or context) live in a separate file (`app/_components/providers.tsx`) that carries `'use client'` at its top, takes `children`, and wraps them in the providers. The root layout stays a Server Component and renders `<Providers>{children}</Providers>` inside `<body>`. Tie to the code convention: "one Provider shell, mounted in a `<Providers>` Client Component at the root layout." The key insight: a Server Component *can* render a Client Component as a child and pass it `children` — the boundary is at `<Providers>`, the layout above it stays on the server.

**Component — CodeVariants (the canonical before/after).** Two tabs over the same goal "add a theme provider to the app":
- **Tab "`'use client'` on the layout (wrong)":** `'use client'` at the top of `app/layout.tsx`; prose names the failure — the directive poisons every route into a client subgraph, the whole app loses the Server Component default. Use `del=`/highlight on the directive line.
- **Tab "`<Providers>` child (right)":** `app/layout.tsx` stays a Server Component and renders `<Providers>{children}</Providers>`; a second small fence (or the prose) shows `providers.tsx` with `'use client'` at *its* top. Prose names why the boundary belongs on the leaf.
CodeVariants is the right pick — this is a textbook wrong/right comparison of the same code, and the before/after framing is exactly its sweet spot. Keep prose to the one-paragraph cap; the two-file "right" tab may need a second fence, which the slot allows.

**Term tooltips:** *`'use client'`* ("a file-top directive marking a module — and everything it imports — as Client Component code that also runs in the browser; the opt-out of the Server Component default"); *client subgraph* ("the portion of the React tree below a `'use client'` boundary that ships and runs as browser JavaScript").

### The root layout and hydration mismatches

**Goal:** name the second high-stakes footgun — per-request nondeterminism in the layout breaks hydration — at recognition depth, with the fix, without teaching the hydration model.

Content:
- One-paragraph mechanism (shallow): the root layout renders to HTML on the server; in the browser React **hydrates** — it walks the same tree again and attaches event handlers, *expecting the browser-rendered markup to match the server's exactly*. When they differ, React warns (and may discard the server HTML).
- **The footgun:** content that differs between the server render and the client render — `Date.now()`, `Math.random()`, `crypto.randomUUID()`, anything reading per-request or per-moment state — placed in the root layout produces a hydration mismatch. Because the layout wraps every page, the mismatch is global. Frame it as: the server computed one value, the browser computed another, and React can't reconcile them.
- **Two fixes, in order of preference:**
  - **Scope the dynamic bit to a Client Component** — move the time/random/per-request logic into a small `'use client'` leaf that computes it in the browser (often in an effect, post-hydration), so the server and the first client render agree. This is the senior default.
  - **`suppressHydrationWarning` on the specific element** — a deliberate, surgical opt-out for the *one* element whose mismatch is expected and benign. The canonical legitimate use is `next-themes` setting the theme class on `<html>` via an inline script before hydration (Ch 018 L6) — name it as the textbook case so the student recognizes the attribute later. Stress: it suppresses the warning for that element only, it is not a blanket fix, and reaching for it to silence a *real* mismatch hides a bug.
- Forward-reference the depth: the full hydration-mismatch surface is Ch 030 L5. Here the student only needs to *recognize* the failure and the two fixes.

Use a short `Code` block contrasting the mismatch source (`<p>{new Date().toLocaleTimeString()}</p>` in the layout) against the `suppressHydrationWarning` on `<html>` for the `next-themes` case — two tiny snippets, prose carries the rest. No heavy component; this is a recognition section.

**Term tooltips:** *hydration* ("the browser-side step where React reuses the server-rendered HTML and attaches event handlers by re-rendering the same tree — it expects the markup to match"); *hydration mismatch* ("when the browser render differs from the server's, React warns and may discard the server HTML").

### What does not belong in the root layout

**Goal:** consolidate the lesson into a scannable "anti-pattern checklist," each item tied to the section that explained *why*. Reinforcement, not new concepts.

Content — a tight list, each one line, each pointing back to its mechanism:
- **No `'use client'`** — poisons the whole tree into a client subgraph (→ the Providers section). Push client concerns into `<Providers>`.
- **No raw `<head>` JSX** — bypasses the metadata API's dedup/ordering/override (→ the metadata section). Use the `metadata` export; `<title>` especially is never inline JSX. (Name the lone exception: `<link rel="preconnect">` via the metadata `other` field.)
- **No per-request randomness or time** — hydration mismatch, globally (→ the hydration section). Scope it to a Client Component.
- **No heavy / server-only data fetching** — the layout runs on every navigation, so the cost is paid on every page transition (→ the lean-root discipline). Fetch close to the page that needs it.
- **No per-page UI or per-page metadata** — both belong to nested layouts / the page's own `metadata` export (→ the body section). The root is shared by every route.
- **Don't forget `lang`** — the one thing people *omit* rather than misplace; an accessibility regression (→ the shell section).

Keep this as prose + a compact list; the section *is* the emphasis. Optionally close with a short **TrueFalse** round (3–4 statements) spanning the three big watch-outs (`'use client'` placement, `<head>` via metadata not JSX, per-request randomness → mismatch) as a light self-check — keep it optional and short; the Buckets and CodeVariants did the heavier assessment.

### External resources (optional)

One or two `ExternalResource` cards, verified live (June 2026): the Next.js App Router docs for [layouts and the root layout](https://nextjs.org/docs/app/api-reference/file-conventions/layout) and for the [Metadata API](https://nextjs.org/docs/app/api-reference/functions/generate-metadata). Pick at most two; don't over-link.

---

## Scope

**This lesson installs:** the universal HTML document shape (`<!DOCTYPE html>`, `<html lang>`, `<head>`, `<body>`) as a recap-depth frame; the App Router root layout (`app/layout.tsx`) — its required default export, `{ children }: { children: React.ReactNode }` signature, that it is a Server Component, and that it owns `<html>`/`<body>` exclusively; the `lang` attribute as a hardcoded monolingual default; the metadata API (`metadata` object typed `Metadata`, `generateMetadata` named) as the declarative owner of `<head>`, plus the automatic `charset`/`viewport` defaults and the *reason* (dedup/ordering/override) to prefer it over raw tags; the three `<body>` patterns (`{children}`, global providers, persistent UI) and the lean-root discipline; `next/font` and `globals.css` as root-layout integrations (recognition depth); the `'use client'`-poisons-the-tree rule and the `<Providers>` Client Component fix; per-request-nondeterminism → hydration mismatch and its two fixes (scope to a Client Component; `suppressHydrationWarning` on the specific element); and a consolidated "what does NOT belong" checklist.

**Prerequisites to redefine concisely (do not re-teach):**
- JSX, the `{}` expression slot, `children` as a prop — **owned by Lesson 1 / Ch 022.** `children` was named in Lesson 1; here it becomes load-bearing as the injected page. One-line recall, not re-teaching.
- The DOM as a tree of typed nodes — Ch 014 L1. The document/`<head>`/`<body>` framing sits on top; recall in a sentence.
- Default vs. named exports — the code convention (default only where the framework dictates). Recall in one line when the layout's default export appears, so it doesn't read as contradicting the named-exports rule.

**This lesson does NOT cover (reserve for later):**
- Semantic landmarks (`<header>`/`<nav>`/`<main>`/…) and the heading hierarchy inside `<body>` — Ch 017 L3. (This lesson's `<body>` examples stay structurally minimal — `{children}`, `<Providers>`, a portal `<div>` — and do not model the landmark shell.)
- The full Server / Client Component boundary model, the two-render model, pushing the boundary down — Ch 030 L1–L2. (Named here at one-sentence recognition depth only.)
- Hydration at depth and the full mismatch surface — Ch 030 L5. (Recognition + two fixes only.)
- Nested layouts and the layout/page render boundary — Ch 029 L4. (Forward reference only; established here that nested layouts render *inside* `<body>` and never re-render `<html>`/`<body>`.)
- Per-page metadata, `generateMetadata` at depth, OG/Twitter cards, `metadataBase`, dynamic OG images — Ch 034 L6. (`generateMetadata` named, not taught.)
- The separate `viewport` / `generateViewport` export at depth, and SEO file conventions (`robots.ts`, `sitemap.ts`, `icon`/`apple-icon`, `manifest.ts`) — Ch 034 L7. (Automatic `viewport` default named; the export is a one-line forward reference.)
- `next/font` at depth — `next/font/local`, variable fonts, the Tailwind CSS-variable bridge, CLS internals — Ch 034 L4 / Ch 021 L1. (Recognition depth only.)
- Tailwind v4, `globals.css` internals, the `@theme`/`@import "tailwindcss"` surface, `cn()` — Chapter 018. (Examples stay nearly unstyled; `globals.css` named as the import that lives in the root layout.)
- `next-themes` wiring, `<ThemeProvider>`, `useTheme()`, the FOUC-free toggle — Ch 018 L5–L6. (Named as the canonical `suppressHydrationWarning` / provider case for recognition.)
- TanStack Query provider wiring, the per-request `getQueryClient()` factory, `<HydrationBoundary>` — Ch 076. (Named as a canonical provider only.)
- `next-intl` and dynamic `lang` from the locale — Ch 084. (One-line forward reference for the i18n `lang` case.)
- `global-error.tsx` as the boundary above the root layout — Ch 031 L4. (Out of scope; not named unless it aids the persistent-UI error-boundary mention.)

---

## Notes for the writer

- Keep the "three authors of the document" frame (`layout.tsx` → `<html>`/`<body>`, metadata API → `<head>`, `<Providers>` → client subgraph) explicit from the introduction through the recap — it is the lesson's spine and the through-line every watch-out hangs on.
- The root layout file is short by design. Reuse the *same* canonical `app/layout.tsx` across the AnnotatedCode walkthroughs (shell → fonts/globals) so the student sees one file grow coherently rather than several disconnected snippets. Adding `<Providers>` and the metadata export to that same mental file in their sections reinforces "this is one small file."
- Examples ship the real 2026 shape but stay under-styled (no Tailwind beyond a font className) — Chapter 018 hasn't happened. Reinforce "keep the root layout lean" by keeping the examples lean.
- The two highest-stakes watch-outs (`'use client'` poisons the tree; per-request nondeterminism → hydration mismatch) must land as *named, recognizable failure modes with their fixes*, not as trivia. They are the senior payoff of the lesson.
- Server/Client Components and hydration are taught for real in Ch 030 — resist deepening them here. Give each exactly the one or two honest sentences the layout decisions require, then forward-reference.
- Exercises inline at their concept: Buckets (who-owns-what, after the metadata section — highest value), CodeVariants (the `'use client'` wrong/right), optional TrueFalse in the recap. Three well-placed interactions; don't over-add.
