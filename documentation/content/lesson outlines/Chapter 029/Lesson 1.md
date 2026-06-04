# Lesson 1 — File tree, page.tsx, and co-location

- **Title (h1):** The file system is the route table
- **Sidebar label:** File tree and page.tsx

---

## Lesson framing

First lesson of the App Router chapter and the student's first contact with Next.js routing. The student arrives knowing JSX, that `app/layout.tsx` is the Server Component that owns `<html>`/`<body>` (Ch 017.2), the `<Link>` vs `<a>` distinction (Ch 017.4), the metadata API exists (Ch 017.2), and the module graph + `"use client"` (Ch 006). They have never created a route.

**The one mental model to install:** *the folder tree under `app/` is the route table — you don't register routes, you create folders.* A folder is a URL segment; a `page.tsx` inside it makes that segment a visitable page; folders without a `page.tsx` exist but render nothing. Everything else in the lesson hangs off this single mapping. The student should leave able to look at any `app/` tree and read off its URLs, and look at a target URL and create the folders/files that serve it.

**The second pillar, given equal weight: Architectural Principle #1 — co-locate by feature, not by layer.** This is the first numbered architectural principle the student meets in the framework context, and it's the senior reflex the whole course's project structure depends on. Route-specific code lives *inside* the route folder under private `_components/`/`_lib/` folders, not in top-level `components/`/`hooks/`/`services/` buckets. Frame it as a decision with stakes (where does a teammate look for the dashboard's chart? — next to the dashboard), not a style preference.

**Pedagogical stance.** This is a convention-recognition lesson: the payload is a vocabulary of file/folder conventions the student must recognize on sight and know the required shape of. Lead each convention with the senior question it answers, show the smallest tree that proves it, then state the rule. Keep cognitive load low by teaching the *core* mapping (folder→segment, `page.tsx`→leaf) fully before layering co-location, private folders, the outside-`app/` surface, and the named-once conventions (`route.ts`, Pages Router, SEO files). The named-once items get one or two sentences each — recognition, not depth — and explicitly defer to their owning chapter. Diagrams carry the folder→URL mapping (this is inherently spatial); a `FileTree` is the native vehicle and should appear repeatedly. One decision-walker for "where does this file go." Two light interactive checks (folder→URL reading, co-location sorting). No live coding — there is no runtime to exercise; the skill is structural, best checked by classification/mapping drills.

**Tone:** adult, terse, decision-first. No "what is a folder." Pin Next.js 16 (Turbopack default) and React 19 throughout. Pages Router gets exactly one line.

---

## Lesson sections

### Introduction (no header)

Open with the senior question, concretely: *the starter gives you `app/` with one `layout.tsx` and one `page.tsx`. Product says "ship `/dashboard` and `/dashboard/invoices`." What files do you create?* State that in Next.js there is no route-registration file, no router config array — **the folder tree under `app/` is the route table.** Preview the payoff: by the end the student reads any `app/` tree as a list of URLs, creates folders to add routes, and knows the one rule that decides where every non-route file in the project lives. Keep it to a short paragraph plus the question. Do not enumerate conventions here.

### A folder is a URL segment, a page.tsx makes it a page

The core mapping — teach this fully before anything else.

- Establish the two-part rule: (1) every folder under `app/` is a **route segment** = one slash-separated piece of the URL; (2) a route is only *visitable* once it contains a `page.tsx` whose default export is the component rendered at that URL. A folder with no `page.tsx` is legal but produces no page (it's a 404 if visited directly) — useful purely to nest deeper segments.
- `app/page.tsx` with no folder is the index route `/`. `app/dashboard/page.tsx` is `/dashboard`. `app/dashboard/invoices/page.tsx` is `/dashboard/invoices`. Answer the intro question explicitly here: create `app/dashboard/page.tsx` and `app/dashboard/invoices/page.tsx`.
- **Primary diagram — `FileTree` + URL mapping (`Figure`).** Show the `app/` tree on the left conceptually and the URLs it produces. Since `FileTree` renders a tree only, pair it with a `Figure` caption or an adjacent two-column HTML strip mapping each `page.tsx` to its URL. Recommended approach: a `Figure` wrapping a small HTML grid — left column the `FileTree`, right column the resulting URL list with the matching `page.tsx` bolded. Pedagogical goal: make the folder→URL function visually literal. This is THE diagram of the lesson.
- **`page.tsx` shape — `Code` block.** Minimal Server Component default export:
  ```tsx
  export default function DashboardPage() {
    return <h1>Dashboard</h1>;
  }
  ```
  Teach the three load-bearing facts at the call site, not as preamble: (a) the export must be `default` (the framework imports the default — this is one of the few places the course's "named exports everywhere" rule yields to a framework mandate; say so explicitly, cross-ref Code conventions); (b) the **component name is irrelevant to routing** — `DashboardPage`, `Page`, `Foo` all route identically, the *folder* names the route; (c) it's a Server Component by default (no `"use client"`), full meaning deferred to Ch 030 — here just "renders on the server, ships no client JS by default."
- `CodeTooltips` is overkill for this tiny block; prefer one or two inline `Term`s if needed.

### Read the tree, write the tree

An interactive beat to cement the core mapping before adding complexity — this is where the student proves they internalized folder→URL both directions.

- **Exercise — `Matching` (folder path ↔ URL).** Left column: `page.tsx` paths (`app/page.tsx`, `app/settings/page.tsx`, `app/settings/billing/page.tsx`, `app/dashboard/page.tsx`). Right column: URLs (`/`, `/settings`, `/settings/billing`, `/dashboard`). Goal: read the mapping fluently in isolation. Cheap, fast, directly checks the lesson's spine.
- Follow with one short prose "now reverse it" prompt: given target URL `/team/members`, name the two files. Answer inline or in a `<details>`. Reinforces the write direction without a heavyweight component.

### The starter is the source of truth, not the wizard

Address `create-next-app` for recognition only — the course ships its own starter (Ch 031.2) and the student should not run the wizard, but will see its output everywhere.

- Frame: every Next.js tutorial, repo, and screenshot the student meets started from `pnpm create next-app`. Name it so they recognize its artifacts, then point them back at the course starter as canonical.
- **Diagram — `FileTree` of the wizard's recommended-defaults output.** Show the shape: `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `next.config.ts`, `tsconfig.json` (with the `@/*` alias), `eslint.config.mjs` (or Biome — see below), `package.json`, `AGENTS.md`. Caption ties each to a concept the student already owns or will own.
- State the current (Next 16) wizard accurately: it offers a one-keystroke **recommended defaults** path (TypeScript, ESLint, Tailwind v4, App Router, AGENTS.md) and a **customize** path that additionally prompts for the **linter (ESLint / Biome / None)**, **React Compiler**, a `src/` directory, and the import alias. Turbopack is the default bundler in 16 — no flag. The course's starter selects Biome (the wizard now offers it as a first-class choice) and the `src/` directory, so the student's tree is `src/app/…`, not bare `app/…`. This nuance matters: the chapter outline listed Biome, and the wizard does surface it under customize — present it truthfully rather than claiming Biome is the *default*.
- One sentence: `AGENTS.md` ships in the template specifically to steer coding agents toward current Next.js patterns — connect to the course's AI-driven-development reality without dwelling.
- Keep this section tight. The student's takeaway is recognition + "use the course starter," not a wizard walkthrough.
- `Term` candidates: **Turbopack** (Rust-based bundler, Next's default in 16), **Biome** (fast Rust linter+formatter, the course's pick over ESLint).

### Co-locate by feature, not by layer

Architectural Principle #1 — the lesson's second pillar. Give it real weight and frame it as a decision with production stakes.

- **Lead with the senior question:** the dashboard needs a `RevenueChart` component, a `formatCents` helper, and an `archiveInvoice` action, all used *only* by the dashboard. Where do they go? Present the two answers side by side and let the student feel the difference.
- **Diagram — `TabbedContent` with two `FileTree`s (by-layer vs by-feature).** Tab 1 "By layer (the legacy form)": top-level `components/`, `hooks/`, `lib/`, `services/`, `actions/` with the dashboard's files scattered across all five. Tab 2 "By feature (the App Router reflex)": everything dashboard-specific living under `app/dashboard/`. Pedagogical goal: make the scatter visceral — the by-layer tab forces five folders open to understand one feature; the by-feature tab is one folder. Caption: "to delete a feature, delete its folder."
- State Principle #1 as a rule: **organize by purpose, not by file kind.** A feature's components, helpers, and actions live inside its route folder. Name the by-layer alternative once as the pattern the App Router moves away from — not wrong everywhere, but the wrong default for route-scoped code.
- Connect to what they know: this is the same locality-of-behavior instinct as keeping a function's helpers near it; the App Router just extends it to the file system. The framework *rewards* co-location because the file system is already feature-shaped (it's the route tree).
- Stakes: name churn cost — when the dashboard changes, a senior wants one folder to open and one folder to delete; by-layer spreads one feature's lifecycle across the repo.

### Private folders keep non-route files out of the router

The mechanism that makes co-location safe: `_folder`.

- Bridge from the previous section: co-location raises an obvious worry — *if every folder is a route, won't my `RevenueChart` folder become a URL?* Resolve it: a folder prefixed with `_` (e.g. `_components/`, `_lib/`) is **invisible to the router** — it and everything under it opt out of routing entirely. So `app/dashboard/_components/revenue-chart.tsx` is reachable by import but never a URL.
- Nuance worth stating (it's a senior distinction, and the official docs are explicit): files in `app/` are *safely colocated by default* — a bare `chart.tsx` next to `page.tsx` is already non-routable because only `page.tsx`/`route.ts` create routes. So why the underscore? Three senior reasons: (1) it groups supporting files so the route folder stays readable; (2) it's the ecosystem-consistent convention other devs and tools expect; (3) it **future-proofs against new framework file conventions** — a bare `default.tsx` you wrote would silently become a parallel-route fallback (Ch 029.5), but `_lib/default.ts` never collides. Frame the underscore as cheap insurance, not a hard requirement.
- **Diagram — `FileTree` of a co-located route folder.** `app/dashboard/` containing `page.tsx`, `layout.tsx` (named, owned by L2), `_components/revenue-chart.tsx`, `_components/kpi-card.tsx`, `_lib/format-cents.ts`, `_actions.ts`. Bold the `page.tsx`; the underscore items get a dimmed "not a route" comment. Goal: the canonical shape of a real feature folder, which recurs for the rest of the course.
- Connect to Code conventions: filenames are kebab-case except framework-mandated names; `_actions.ts` is the route-scoped server-actions file (forward-ref Ch 043, one line). Cross-ref the No-barrel-files rule briefly: import the file you need from `_lib/`, no `index.ts` re-export — because barrels defeat the Server/Client split (one sentence, owned elsewhere).

### What lives outside the route folder

The complement to co-location: the threshold for promoting code to the project-root shared surface.

- The rule that resolves every "where does this go" question: **co-locate under `_components/`/`_lib/` until a second feature imports it; then promote to top-level `components/` or `lib/`.** The threshold is "used by two or more features." Single quotable heuristic.
- **Diagram — `FileTree` of the project-root surface.** Show `src/` with: `app/` (routes), `components/` (app-wide UI, "often shadcn — Ch 027"), `components/ui/` (shadcn primitives), `lib/` (shared helpers — `utils.ts` with `cn()`, `result.ts`), `db/` ("Drizzle — Unit 5"), `env.ts` ("typed env — Ch 037.2"), plus config files at root (`next.config.ts`, `tsconfig.json`, `proxy.ts` — "Ch 033"). Each non-obvious entry gets a one-line forward-ref comment. Goal: orient the student in the full repo shape they'll inhabit for the rest of the course, while making clear most of it is owned by future chapters — this is a map, not a syllabus.
- **`@/*` import alias — `CodeVariants` (relative vs alias).** Two tabs: Tab 1 the deep relative import (`../../../lib/utils`) — count the dots, feel the fragility on move. Tab 2 the alias (`@/lib/utils`). State the contract: `tsconfig.json` maps `@/*` to the source root; the senior reach is `@/` for everything **except intra-feature relative imports** (same-folder/sibling files inside one feature stay relative — `./revenue-chart`). Tie to the Code-conventions import-ordering rule (external, then `@/`, then relative) with one line. This is the durable takeaway: `@/` for cross-feature, relative for intra-feature.
- `Term` candidate: **import alias** (a `tsconfig` path mapping that turns `@/x` into an absolute import from the source root).

### Where does this file go?

A decision exercise that operationalizes the two pillars (co-location + the promotion threshold) into a reusable reflex.

- **`StateMachineWalker` (`kind="decision"`).** The senior placement filter. Root question: *"Is this file a routable page?"* → yes → `page.tsx` in its route folder. → no → *"Used by only one feature?"* → yes → *"Is it a component or a helper/action?"* → component → `app/<feature>/_components/` → helper/action → `app/<feature>/_lib/` or `_actions.ts`. → used by 2+ features → *"UI or logic?"* → UI → `components/` → logic → `lib/`. Leaves name the exact destination folder. Pedagogical goal: convert the prose rules into the literal question-order a senior runs when dropping a new file, so the student internalizes the decision, not a list. This component shows one path at a time, matching how the decision is actually made.

### Files the framework reads at the top of app/

The named-once conventions — recognition only, so `page.tsx` and `route.ts` don't get confused with arbitrary files. Keep each to a sentence or two and defer to the owning chapter.

- **`route.ts` — the other routable file.** A `route.ts` (not `page.tsx`) in a segment makes it a **route handler**: it returns HTTP responses (JSON, redirects), not UI. Same folder→segment rule, different leaf. Named here purely so the student doesn't confuse it with `page.tsx`; full surface is Ch 046. One contrast sentence: `page.tsx` = UI at a URL, `route.ts` = HTTP endpoint at a URL.
- **Top-level files Next reads at `app/`'s root.** Brief list with one-line roles: `globals.css` (global stylesheet imported by the root layout), `favicon.ico` (auto-served tab icon), and the metadata-file conventions `robots.ts`, `sitemap.ts`, `opengraph-image.{ext}`, `twitter-image.{ext}`, `icon.{ext}`, `apple-icon.{ext}` — these generate SEO/social artifacts by *existing* at that path. State that the full SEO set is owned by Ch 034; here the point is only "some filenames are framework-reserved at `app/` root, don't reuse them."
- **The Pages Router — one line.** A `pages/` directory is the pre-App-Router system; a legacy codebase may have one, the course teaches only the App Router, migration is out of scope. Do not explain Pages Router mechanics.
- Consider a single compact `FileTree` here showing `app/` root with these reserved files annotated, rather than prose-listing them — visual reinforces "reserved name" better. Optional; prose is acceptable if the section is getting long.

### Sorting routable from non-routable

Closing comprehension check that ties the whole lesson together — does the student know what creates a URL and what doesn't?

- **Exercise — `Buckets` (twoCol).** Two buckets: "Creates a URL" vs "Never a URL." Items: `app/page.tsx` (URL), `app/blog/page.tsx` (URL), `app/api/health/route.ts` (URL — handler), `app/dashboard/_components/chart.tsx` (no — private folder), `app/dashboard/` *(folder with no page)* (no — not routable), `app/(marketing)/page.tsx` (URL — group is invisible; light forward-ref to L2, mark correct as URL), `src/lib/utils.ts` (no — outside `app/`), `app/_lib/format.ts` (no). Goal: force the student to apply every rule from the lesson — `page.tsx`/`route.ts` create routes, underscores and missing pages don't, outside-`app/` doesn't. The `(marketing)` item plants the route-group seed for L2 without teaching it (caption can note "route groups: next lesson").
- Keep the route-group item's feedback to "the parentheses make the folder invisible to the URL — Lesson 2."

### External resources (optional)

One or two `ExternalResource` cards: the Next.js "Project structure and organization" docs page (the canonical reference for these conventions) and optionally the "Getting Started: Installation" page for the wizard. Skip a video — this topic is structural and better served by the docs reference than a walkthrough.

---

## Scope

**Prerequisites to restate concisely (do not re-teach):** JSX returns from a component (Ch 017.1); `app/layout.tsx` is a Server Component owning `<html>`/`<body>` (Ch 017.2) — referenced when explaining `page.tsx` is a sibling leaf, but layouts are NOT taught here; `<Link>`/`<a>` distinction (Ch 017.4) — not used in code here; the module graph and `"use client"` (Ch 006) — referenced one line re: barrels and Server Components, not re-explained; kebab-case filenames and named-exports default (Code conventions) — restated only at the `page.tsx` default-export exception.

**Explicitly out of scope (owned elsewhere — name in context at most, never teach):**

- **Layouts, nested layouts, the layout/page render boundary** — Lesson 2. `layout.tsx` appears in co-located-folder `FileTree`s as a labeled box only; do not explain what it does beyond "shared shell, next lesson."
- **Route groups `(folder)`** — Lesson 2. Appears once in the closing `Buckets` exercise as a forward-ref item; mark it URL-creating, defer the mechanics.
- **Dynamic/catch-all segments `[id]`, `[...slug]`, `params` as a Promise** — Lesson 3. Do not introduce brackets.
- **Navigation (`<Link>`, `useRouter`, `redirect`/`notFound`)** — Lesson 4.
- **Parallel routes `@slot`, `default.tsx`** — Lesson 5. The `_folder` future-proofing rationale may name "a bare `default.tsx` would collide with a framework convention" as motivation, without teaching parallel routes.
- **Intercepting routes `(.)`** — Lesson 6.
- **Server vs Client Components in depth** — Ch 030. `page.tsx` is "a Server Component by default — renders on the server, ships no client JS"; stop there.
- **`loading.tsx`/`error.tsx`/`not-found.tsx`** — Ch 031. Not mentioned except possibly in the named-once reserved-files `FileTree` as labels.
- **The `metadata` export and `<head>`** — introduced Ch 017.2, owned Ch 034. Only `opengraph-image`/`icon`/etc. file *names* appear in the reserved-files list.
- **`route.ts` route handlers in full** — Ch 046. One contrast sentence only.
- **SEO file set (`robots`, `sitemap`, OG images) in full** — Ch 034. Names only, in the reserved-files list.
- **`proxy.ts` (the renamed middleware)** — Ch 033. Appears as a root-level config file label only.
- **`env.ts` typed environment** — Ch 037.2. One forward-ref comment in the project-root `FileTree`.
- **Drizzle/`db/`, shadcn/`components/ui/`** — Units 5 / Ch 027. One-line forward-ref comments only.
- **The Pages Router** — one recognition line, never taught.

---

## Code conventions notes for downstream agents

- **Default export is deliberate here** and contradicts the course's "named exports everywhere" rule — this is the documented framework-mandated exception (Code conventions, framework-named files). Call it out at the `page.tsx` block so the student doesn't read it as a violation.
- Filenames in examples: kebab-case (`revenue-chart.tsx`, `format-cents.ts`) except framework names (`page.tsx`, `layout.tsx`, `route.ts`). Folder names kebab-case; private folders `_components/`/`_lib/`; the one route group shown is `(marketing)`.
- Use `src/app/…` paths throughout (the course starter uses the `src/` directory) — but when quoting the bare-`create-next-app` default tree, `app/` at root is correct; flag the difference once.
- Import examples follow the three-group ordering (external / `@/` / relative) and the `@/`-for-cross-feature, relative-for-intra-feature rule.
- No barrel files in `_lib/` — examples import the specific file; do not write an `index.ts` re-export.
