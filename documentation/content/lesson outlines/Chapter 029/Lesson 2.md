# Layouts and route groups

- **Title (h1):** Layouts and route groups
- **Sidebar label:** Layouts & route groups

---

## Lesson framing

This is lesson 2 of Chapter 029 (file-system routing). Lesson 1 established the spine the student carries in: a folder under `src/app/` is a URL segment, `page.tsx` (default-exported component) is the route leaf, `_components/`/`_lib/` are route-private colocation (Architectural Principle #1), `@/` is the cross-feature alias. Lesson 1's closing Buckets already teased route groups via `(marketing)`. This lesson adds the second framework file the student meets — `layout.tsx` — and the second organizational convention — route groups `(folder)`.

**The two senior questions this lesson answers, stated implicitly in the intro (filter: decisions before syntax):**
1. How do I share a shell (sidebar, top nav) across a cluster of pages *without re-rendering it on every navigation*?
2. How do I give `/sign-in` and `/dashboard` *completely different shells* without leaking `/auth/` or `/app/` into their URLs?

The answers are `layout.tsx` and route groups. These are not independent topics — the SaaS reality that motivates the whole lesson is the **`(auth)` / `(app)` split**: one app, two top-level shells (a bare centered card for sign-in/sign-up; a sidebar+header chrome for the dashboard), neither with a URL prefix. That split is named in the chapter framing as load-bearing for Unit 8 and the Chapter 035 project, so it's the through-line example: every concept lands on a fragment of that one tree.

**The single hardest idea, and the lesson's center of gravity: the layout/page render boundary.** Students arriving from a React-only mental model (Unit 4) assume the whole tree re-renders on navigation. The senior insight — *layouts stay mounted across navigations within their subtree; only the page swaps* — is what makes "put the persistent sidebar/audio-player/scroll-position in the layout" a reflex rather than a trick. This is a *which-boxes-light-up* misconception, exactly the shape `RenderTracking` was built for. The diagram does the heavy lifting; prose supports it. This is the one concept worth spending interactive budget on.

**Mental model to install (build it incrementally, simplest first — filter: minimize cognitive load):**
- Stage 1: a layout is a function that wraps a page — `layout(page)`.
- Stage 2: layouts compose down the tree like nested function calls — `root(dashboard(page))` — "Russian dolls."
- Stage 3: the wrapping is *persistent* — re-navigating swaps only the innermost `page`, the doll shells stay put. (This is the render-boundary payoff and where `RenderTracking` lands.)
- Stage 4: route groups let *sibling* subtrees pick *different* outermost dolls without a URL cost.

**What the student should be able to do by the end:**
- Recognize `layout.tsx` on sight, know its default export takes `children`, and know only the root owns `<html>`/`<body>`.
- Predict what re-renders vs. persists on a given navigation.
- Reach for `layout.tsx` by default and recognize the rare `template.tsx` trigger.
- Build the `(auth)`/`(app)` two-group, two-layout structure and explain why no `/auth/` appears in the URL.
- Anticipate the route-group URL-collision build error.

**What beginners get wrong in the real world (fold into the relevant sections, not a tip dump):**
- Treating `template.tsx` as the default and getting mysterious state loss (or reaching for it to "fix" a re-render they misdiagnosed).
- Putting deep-child data fetching in a high layout, blocking the whole subtree.
- Forgetting that `<html>`/`<body>` belong *only* to the root and trying to add them in a nested layout.
- Expecting `(folder)` to show up in the URL, or accidentally colliding two group paths.
- Believing layout non-re-render is a bug to work around rather than the feature.

**Prerequisite alternatives worth one line (filter: trigger before tool):** the React-only way to share a shell is to import a `<Shell>` into every page and hand-wire it — that re-mounts on every navigation and loses sidebar state. Naming this once is what makes `layout.tsx` land as a relief, not just a convention.

**Component strategy (optimize for the render-boundary payoff):**
- `FileTree` for every structure shown — it's the canonical "file system is the URL" vehicle the chapter leans on.
- `RenderTracking` (its own card, no `Figure`) for the render boundary — the load-bearing interactive.
- `AnnotatedCode` for the root layout (multiple parts need focus: directive-free Server Component, `children` typing, `<html>`/`<body>` ownership, `metadata` named-not-taught).
- `CodeVariants` for `layout.tsx` vs `template.tsx` (same shape, different behavior — the canonical A/B the component is built for) and for the before/after of the React-only shell vs the layout.
- A small `DiagramSequence` (HTML/CSS nodes) for layout composition as nesting dolls — cheap visual, big clarity win.
- `Dropdowns` (fenced mode) as a low-stakes structure-building check; a `Buckets` or `MultipleChoice` to check the render boundary.
- `StateMachineWalker` (decision kind) for the closing "layout vs template vs route group vs nested layout" senior decision filter.

Keep it terse and adult (filter: no bootcamp scaffolding). Estimated 50–65 min.

---

## Lesson sections

### Introduction (no header)

Open on the concrete problem, not definitions. The student has (from L1) a `src/app/` with `page.tsx` leaves. Now the dashboard needs a sidebar on every page, and `/sign-in` needs none of it. Pose both senior questions in prose. Name the React-only reflex they'd reach for — import a `<Shell>` into each `page.tsx` — and the two things wrong with it: it re-mounts on every navigation (sidebar scroll/toggle resets) and it duplicates the wrapper across files. State the two conventions this lesson installs (`layout.tsx`, route groups) and the one structure they're building toward: the `(auth)`/`(app)` split. Warm, ~5 lines. Connect explicitly back to L1's "the file system is the route table" — these are two more file-system conventions on that same contract.

### `layout.tsx` — the shell every nested route renders inside

Introduce `layout.tsx` as the framework's answer to "shared shell." Teach the shape:
- Default export required (framework convention — tie back to L1's "default export only for framework files" rule).
- Takes a single prop, `children: ReactNode` — **the framework fills `children`, not the developer**. This is the most important shape fact; a beginner expects to pass children themselves.
- Server Component by default, no directive (carry L1's "Server Component by default, full meaning in Ch 030" framing — do not re-teach RSC).
- Only the **root layout** (`src/app/layout.tsx`) returns `<html>` and `<body>`. Nested layouts return a fragment or a wrapper `<div>` that lands *inside* the root's `<body>`.

Use `AnnotatedCode` for the root layout (`src/app/layout.tsx`): one block, steps highlighting (1) the default export + no `'use client'`, (2) the `children: ReactNode` param, (3) `<html lang="en">`/`<body>`, (4) where the shared chrome (`<SkipLink/>`, a header) sits relative to `{children}`. Mark `metadata` as "named, owned by Ch 017/034 — don't worry about it here" if shown, or omit it to reduce surface. Keep the body minimal and realistic (a `lang`, a skip link per the a11y baseline, `{children}`).

Reinforce the "where does `children` come from" point with an `ArrowDiagram` **only if** it reads cleanly: a tiny two-box figure, `page.tsx` → the `{children}` slot in `layout.tsx`, one labeled arrow "framework injects". If the arrow would cross code text, drop it and use color-matching (tint `page.tsx`'s export and the `{children}` token the same) per the ArrowDiagram color-match guidance. Pedagogical goal: kill the "I must pass children" misconception visually.

`Term` candidates here: `ReactNode` (def: "any renderable React value — element, string, number, fragment, array, null"); "Server Component" (one-line, deferring to Ch 030).

### Layouts compose down the tree

Teach composition: the framework matches **root layout → nested layout → page** and wraps each level like nested function calls. Use the nesting-dolls metaphor explicitly.

`DiagramSequence` (HTML/CSS nodes, own card) — "layout composition as nesting dolls." 3 steps:
1. Just the page rendering bare.
2. The dashboard layout wraps it (sidebar chrome appears around the page region).
3. The root layout wraps that (the `<html>`/`<body>` + app-wide header appears around the dashboard chrome).
Render the nesting as concentric labeled boxes (root outermost, page innermost), captions naming the file at each ring. Pedagogical goal: make "compose down the tree" spatial and obvious before the render-boundary nuance lands. Keep height capped, horizontal-friendly.

Show the matching `FileTree` beside it so the spatial nesting maps to the folder nesting:
```
src/app/
  layout.tsx        ← root shell (<html>/<body>)
  dashboard/
    layout.tsx      ← dashboard shell (sidebar)
    page.tsx        ← the leaf
```
Then the "Russian dolls" output sketch as a small `Code` block (pseudo-JSX): `<RootLayout><DashboardLayout><DashboardPage/></DashboardLayout></RootLayout>`. This is the bridge to the render boundary — the student now sees the tree as composed before learning what persists.

### What re-renders on navigation — the layout/page boundary

**The center of the lesson.** State the senior insight directly: *layouts stay mounted across navigations within their subtree; only the page swaps.* Consequences, stated as the payoff:
- State in a Client Component **inside a layout survives** navigation within that subtree (sidebar open/closed, a scroll position, a corner audio player).
- State in the **page does not** survive — the page unmounts and remounts.
- Therefore the senior reflex: persistent UI lives in the layout, transient/per-page UI lives in the page.

`RenderTracking` (own card, no `Figure`) is the load-bearing interactive. Tree:
- `root` label "RootLayout"
  - `dashboard` label "DashboardLayout (sidebar state)"
    - `page` label "Page"

Triggers (root-level, no `Implementation` needed for the core point):
- `nav-invoices` label "navigate /dashboard → /dashboard/invoices" renders `"page"` (only the page re-mounts; both layouts persist).
- `toggle-sidebar` label "toggle the sidebar (state in DashboardLayout)" renders `"dashboard,page"` (layout re-renders its own state, page below re-renders).

Pedagogical goal: the misconception ("navigation re-renders everything") dies the instant the student clicks `nav-invoices` and sees only `page` flash. Caption/prose: "this is the feature, not a bug — it's why the sidebar's scroll survives."

Optionally add an `Implementation` toggle to contrast "shell imported into each page (React-only)" vs "shell in layout.tsx": in the React-only variant, `nav-invoices` renders `"root,dashboard,page"` (the whole imported shell re-mounts); in the layout variant it renders `"page"`. This makes the relief concrete and ties back to the intro's rejected alternative. Use only if it doesn't overload the figure — the two-trigger core is the priority.

Watch-out woven in (not a separate tip): **don't put deep-child data fetching in a high layout.** A layout that fetches data the page three levels down needs will block that whole subtree and re-fetch nothing on page-only navigation (the layout doesn't re-run). State the rule positively: fetch at the level that owns the data. Forward-ref `loading.tsx`/Suspense as "Ch 031 owns how layouts stream" — name only.

Comprehension check here: `MultipleChoice` or short `Buckets` — "which of these survives a navigation from `/dashboard` to `/dashboard/settings`?" with items like *sidebar collapsed/expanded state (layout)* → survives, *unsaved text in a page form* → resets, *the `<html lang>` (root)* → survives. Sorts into "persists" / "remounts." Reinforces the boundary by application.

### Nested layouts

Brief — composition already taught; this is the "more than two levels" case. Multiple layout levels stack like dolls (e.g., root → dashboard layout → an invoices layout adding a tab bar → the invoice page). Each nested `layout.tsx` returns a fragment/wrapper, not `<html>`/`<body>`. Show a `FileTree` with three layout levels and one sentence on each ring's job. Reuse the through-line: `(app)` shell → invoices-section tab bar → leaf. Keep to a short paragraph + tree; don't re-explain composition mechanics.

### `template.tsx` — when remount is the call

Frame as the **conditional** against the `layout.tsx` **default** (filter: defaults before conditionals; name the threshold the default crosses). `template.tsx` has the *same shape* as `layout.tsx` (default export, takes `children`, Server Component by default) but the framework gives it a **unique key per segment**, so it **remounts on every navigation into that segment** — Client Component state resets, `useEffect` re-fires, the DOM subtree is recreated.

The senior trigger list (narrow — "99% of the time you want `layout.tsx`"):
- A child input/state that *should* reset per navigation (e.g., a fresh form per record).
- `useEffect` that must re-synchronize on every navigation (per-page analytics ping, enter animations).
- Changing the Suspense-fallback default: a Suspense boundary in a *layout* shows its fallback only on first load; in a *template* it shows on every navigation. (Name this precisely — it's the non-obvious one — and forward to Ch 031.)

`CodeVariants` (`layout.tsx` vs `template.tsx`) — the canonical use of this component. Two tabs, near-identical code (the only diff is the filename and a one-word framing). Tab prose: layout = "persists, state survives, the default"; template = "remounts per navigation, state resets, reach for it only on the triggers above." Use `data-mark-color` green on layout, orange on template to echo the persist/reset semantics.

Precision facts to get right (verified against Next.js 16.2.7 docs):
- `template.tsx` renders **between** the layout and the page (`<Layout><Template key={...}>{children}</Template></Layout>`) — it does *not* wrap the layout in the same segment.
- The key is per-segment: navigating within a *deeper* segment does not remount a higher template; search-param changes do **not** remount.
- `template.tsx` and `layout.tsx` can coexist in the same segment.

`Term`: "remount" (def: "React unmounts the old component instance and mounts a fresh one — state is lost, effects re-run").

### Route groups — organize siblings without touching the URL

Pivot to the second question. Introduce `(folder)`: a folder whose name is wrapped in parentheses is **invisible to the URL**. `src/app/(app)/dashboard/page.tsx` serves `/dashboard`, not `/app/dashboard`. Tie back to L1's private-folder `_folder` (also invisible, but to the *router* for colocation) — contrast crisply: `_folder` hides from routing entirely (no URL, not routable); `(folder)` is fully routable but contributes **zero URL segment**. This contrast is worth drawing explicitly because both "disappear" and students conflate them.

The three uses (lead with the one that motivates the lesson):
1. **Give sibling subtrees different layouts** with no URL prefix — *the `(auth)`/`(app)` split.*
2. Opt a cluster of routes into one shared layout while keeping others out.
3. Organize routes by domain/team for humans, with no URL effect.

Center this section on the through-line `FileTree` — the full `(auth)`/`(app)` structure, the artifact the whole lesson built toward:
```
src/app/
  layout.tsx                 ← one root: <html>/<body>, app-wide providers
  (auth)/
    layout.tsx               ← centered card, no chrome
    sign-in/page.tsx         → /sign-in
    sign-up/page.tsx         → /sign-up
  (app)/
    layout.tsx               ← sidebar + header
    _components/sidebar.tsx   ← Principle #1: layout-specific code co-located
    dashboard/page.tsx       → /dashboard
```
Annotate each `(group)` with "→ no URL segment" and each `page.tsx` with its resolved URL so the "parentheses vanish" rule is visible on every row. Call out the co-located `(app)/_components/sidebar.tsx` as Principle #1 applied to a layout (the chapter-framing requirement) — layout-specific code lives with the layout, never a top-level `components/` until a second group needs it.

`Dropdowns` (fenced mode) comprehension check: a small tree with `___` blanks where the student fills resolved URLs for a couple of `(group)/segment/page.tsx` paths (answer: the group contributes nothing), reinforcing the rule by doing.

`Term`: "route group" is taught, not tooltipped. No new tooltip needed here.

### One root, many shells — and the URL collision that crashes the build

Two tightly-coupled points that belong with route groups.

**The single-root reach (the senior default for a SaaS app):** keep **one** `src/app/layout.tsx` owning `<html>`/`<body>` and app-wide providers; give each group its *own* `layout.tsx` (a fragment/wrapper) for its distinct chrome. This is the `(auth)`/`(app)` shape from the previous section — make explicit that *only the root* has `<html>`/`<body>`; the group layouts are nested layouts that happen to sit just under the root.

**Multiple root layouts (rare — name only, per chapter scope):** when two groups need *truly independent* `<html>`/`<body>` (different `lang`, different top-level providers, a marketing site vs an app that share no shell), you **drop** `src/app/layout.tsx` and place a `layout.tsx` *with its own* `<html>`/`<body>` inside each group. State the two real caveats so it's not folklore:
- Cross-root navigation triggers a **full page reload** (the browser document is replaced) — this is the cost, and the reason one-root is the default.
- With no top-level `layout.tsx`, the home route `/` must live inside one of the groups.
Frame as "you'll almost never do this in a SaaS app; recognize it when you see it."

**Route-group conflict — a compile-time crash:** two pages in different groups that resolve to the **same URL** (`(marketing)/about/page.tsx` and `(shop)/about/page.tsx` both → `/about`) **error the build**. Frame positively: groups don't change the URL, so the URL space is still flat — two groups can't both own `/about`. `Aside` (caution) is appropriate here for the failure mode, since it qualifies the route-group concept just taught.

### Choosing the right tool

Closing senior decision filter that ties the lesson's four moves together. Lead with one sentence: most of the time the answer is `layout.tsx` + a route group; the others are conditionals you reach for on a named trigger.

`StateMachineWalker` (`kind="decision"`, own card) — the walk forces the student through the order a senior asks:
- Root Q: "What are you trying to do?" branches:
  - "Share UI across a cluster of pages, persist its state" → Q "Do siblings need *different* shells, no URL prefix?" → yes: **Leaf: route group + per-group `layout.tsx`**; no: **Leaf: a single `layout.tsx`**.
  - "Reset child state / re-fire effects on every navigation" → **Leaf: `template.tsx`** (reason: the only file with per-navigation remount; name the input-reset / analytics / per-nav-Suspense triggers).
  - "Add another shell level inside an existing layout" → **Leaf: nested `layout.tsx`**.
  - "Organize routes for humans with no URL or UI change" → **Leaf: route group, no extra layout.**
Each leaf's body: one line of when-it-earns-its-weight + the file to create. Pedagogical goal: convert the four conventions into a single reflexive decision the student can replay on their own codebase.

### External resources (optional)

1–2 `ExternalResource` cards: Next.js docs "Layouts and Pages" (getting started) and the `route-groups` file-convention reference. Keep to canonical Next.js docs only.

---

## Scope

**Reuse from Lesson 1 (redefine in one line each, do not re-teach):** folder = URL segment; `page.tsx` = default-exported leaf; `_folder`/`_components`/`_lib` = router-invisible colocation; `@/` alias; "default export only for framework files"; Server Component by default (meaning deferred to Ch 030). Paths use `src/app/...` (course starter uses `src/` + Biome).

**This lesson does NOT cover (route to owner):**
- The root layout's `metadata` export, `<head>` content, fonts — named only; lesson 2 of Chapter 017 introduced, Chapter 034 owns. Show `<html>`/`<body>` as structure, not as a metadata lesson.
- `'use client'` mechanics and the Server/Client Component model in depth — Chapter 030. This lesson *uses* "Server Component by default" and "Client-Component state survives in a layout" as established facts; it does not explain the boundary.
- `loading.tsx`, `error.tsx`, `not-found.tsx`, and Suspense at the layout/segment level — Chapter 031. Name them only where layout streaming or the template-vs-layout Suspense-fallback difference comes up; forward, don't teach.
- Dynamic segments `[param]`, catch-all — lesson 3 of Chapter 029. Keep all example routes static (`dashboard`, `sign-in`, `invoices`).
- Navigation (`<Link>`, `redirect`, `notFound`) — lesson 4 of Chapter 029. Describe navigation in prose ("navigating from /dashboard to /dashboard/invoices") without showing `<Link>` or router APIs.
- Parallel routes `@slot` and `default.tsx` — lesson 5 of Chapter 029. Explicitly a *different model* from nested layouts; do not conflate. One sentence max if disambiguation is needed.
- Intercepting routes — lesson 6 of Chapter 029.
- Multiple root layouts *at depth* / full marketing-vs-app multi-root architecture — named for recognition only (chapter scope); do not build it out.
- `proxy.ts` / middleware routing — Chapter 033.
- shadcn/Radix specifics for the sidebar/header chrome — components are referenced by intent only; Chapter 027 owns primitives.
- TanStack Query, data layer, auth wiring — the `(auth)`/`(app)` split is a *routing/layout* structure here; the actual auth gate (`requireUser`) is Unit 8+. Mention the structure, not the session read.

---

## Code conventions notes (for downstream agents)

- All paths `src/app/...` (course starter uses `src/`, not bare `app/`). Kebab-case folders/files except framework names (`layout.tsx`, `template.tsx`, `page.tsx`).
- `layout.tsx`/`template.tsx`/`page.tsx` are the sanctioned default exports (Function form rule). Everything else (the sidebar, header) is a named export in a kebab-case file under `(app)/_components/`.
- Props typed at the parameter: `({ children }: { children: ReactNode })`. `children: ReactNode` per the Components-and-JSX rule — never `JSX.Element`/`ReactElement`.
- Root layout body stays minimal but real: `<html lang="en">`, a skip link (a11y baseline requires one per layout), `<body>{children}</body>`. Don't add providers/metadata machinery beyond a one-line "named, owned elsewhere" note.
- Import groups external → `@/` → relative; no barrel files (carry L1's conventions). Layout importing a co-located component uses a same-folder relative (`./_components/sidebar` style) per the relatives-for-intra-feature rule.
- **Deliberate simplification (note for agents):** layouts are shown as plain Server Components with no data fetching, no auth, no `metadata`. This is staged on purpose — the render boundary and the file conventions are the lesson, not a production-complete layout. Downstream lessons (Ch 030/031, Unit 8) add the real machinery.
