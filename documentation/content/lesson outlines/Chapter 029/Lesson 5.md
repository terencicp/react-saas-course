# Lesson 5 — Parallel routes and slots

- **Title (h1):** Parallel routes and slots
- **Sidebar label:** Parallel routes

---

## Lesson framing

Conclusions from brainstorming that apply lesson-wide:

**The senior question (state implicitly in the intro).** "How do I build a list-plus-detail surface — invoice list on the left, the selected invoice on the right — where both panes share one URL, each pane gets its own loading/error/not-found behavior, and the list does not re-render when the detail changes?" The student already shipped the pieces: layouts (L2), dynamic `[id]` segments (L3), `<Link>` soft navigation (L4). What they cannot yet do is render **two route trees at one URL**. That gap is the lesson.

**Anchor everything to the `children` mental model the student already owns.** L2 drilled "the framework fills `children`, you receive them, you don't pass them." The single most effective framing for parallel routes: **a `@slot` folder is just another framework-filled prop on the layout, sitting beside `children`.** `children` *is itself* the unnamed slot (the segment's own `page.tsx`). Everything else — independent rendering, independent streaming, per-slot loading/error — follows once the student sees a slot as "another `children`, but named." Lead with this; it collapses most of the apparent novelty.

**`default.tsx` is the highest-leverage concept in the lesson — budget for it.** The chapter outline names forgetting `default.tsx` as "the single most common parallel-routes bug." The reason it bites is subtle: it only manifests on **hard navigation** (direct visit, refresh, `Cmd+click`), so the feature works in dev clicking around and 404s the moment a user shares the URL. This demands the soft-vs-hard navigation distinction (recall the Term from L4) be made *visually*, not just stated. A `DiagramSequence` carries this. Do not let `default.tsx` be a one-line watch-out — it is a teaching section.

**Three folder conventions now "don't change the URL" — disambiguate explicitly.** The student has met `_folder` (private, not a route — L1), `(folder)` (route group, no URL segment — L2), and now `@folder` (slot, no URL segment). Collision risk is high. A small comparison table (three rows: prefix, what it is, effect on URL, what the layout receives) pays for itself. This is a content section, not an appendix.

**Staged complexity.** Build the model in three passes, each shippable-as-far-as-it-goes: (1) one slot beside `children`, layout receives it as a prop, renders side by side — the "it's just a named child" reveal; (2) make the slot a real mini route tree with its own dynamic segment so `/invoices/42` fills the detail slot while the list stays mounted — the payoff; (3) add `default.tsx` and the soft-vs-hard mechanics — the durability. Independent streaming (own `loading.tsx` per slot) is mentioned as a capability and forward-referenced to Ch 031, not built out — this lesson owns the *routing* surface, Ch 031 owns Suspense.

**Mental model to leave the student with.** "A layout is a function of `children` plus any named slots; each slot is its own independent route tree resolved from the same URL; on soft navigation unmatched slots keep their last content, on hard navigation they fall back to `default.tsx` or the whole route 404s." And the reflex: reach for parallel routes when **two or more regions of one screen each need their own URL-driven state, loading, or error behavior** — otherwise a single page is simpler.

**Tone/format.** Adult, terse, decision-first per the guidelines. The domain through-line stays **invoices in a multi-tenant SaaS** (consistent with L3/L4). File trees via `<FileTree>` are load-bearing here — the whole topic is folder conventions — so use them generously. No live App-Router exercise is possible (the React iframe runs React but not the App Router, same constraint flagged in L3/L4); checks are recognition/ordering drills plus one `FileTree`-reading drill.

**This lesson is the foundation for L6 (intercepting routes literally live inside a `@modal` slot) and Ch 035 (the project wires the full surface).** Close by forward-pointing to L6: the same slot machinery, plus a folder that intercepts navigation, produces a modal with a real URL.

---

## Lesson sections

### Intro (no header)

Open on the list-plus-detail screen the student has seen in every SaaS tool (Gmail, Linear, an invoices dashboard): a list, and a detail pane that updates when you pick a row, all at one shareable URL. State the senior question (above) in prose. Inventory what they can already build with L2–L4 tools and name precisely the missing capability: **rendering two route trees at one URL, each independent.** Name the convention — parallel routes via `@slot` folders — and preview the three-pass build. Keep it to ~4 sentences plus the screen description. Optionally a single `<Screenshot>` of the target list-plus-detail UI (or skip if it costs build effort — the prose carries it).

### A slot is another child the layout receives

Goal: install the core mental model before any new folder rules — **a `@slot` is a named, framework-filled prop on the layout, beside `children`.**

- Recall from L2: the layout receives `children`; the framework fills it. State the reframe: `children` is the layout's *unnamed* slot — it's the same-segment `page.tsx`. A `@slot` folder adds a *named* slot, filled the same way.
- Minimal file tree with `<FileTree>`: `app/invoices/` containing `layout.tsx`, `page.tsx`, and `@detail/page.tsx`. Bold the `@detail/` folder as the focus. Dimmed comments: `page.tsx` = "fills `children`", `@detail/page.tsx` = "fills the `detail` prop".
- The layout component, shown with `AnnotatedCode` (the focus needs directing to the prop signature and the two render slots). Code:
  ```tsx
  export default function InvoicesLayout({
    children,
    detail,
  }: {
    children: React.ReactNode;
    detail: React.ReactNode;
  }) {
    return (
      <div className="grid grid-cols-[1fr_2fr] gap-6">
        <section>{children}</section>
        <aside>{detail}</aside>
      </div>
    );
  }
  ```
  - Step 1 (`{2-3}` or `"children" "detail"`, color blue): the prop list — `children` you already know; `detail` is new and its name is the slot folder name minus the `@`. **This is the load-bearing rule: the prop name matches the slot folder.**
  - Step 2 (`"children: React.ReactNode" "detail: React.ReactNode"`): both are typed `React.ReactNode` — a slot is filled with rendered UI, exactly like `children`. Note (deliberate, flag for downstream): types are hand-written here for teaching clarity; the framework also generates `LayoutProps<'/invoices'>` which types the slot names automatically — name it in one sentence and forward-reference (L3 introduced the `PageProps`/`LayoutProps` generated-types family). Keep the hand-written shape as the shown form so the slot→prop correspondence is visible.
  - Step 3 (the two JSX slots, `{9-10}`, color green): you place `detail` wherever you want in the layout — the framework decides *what's in it*, you decide *where it goes*. Same contract as `children`.
- Land the one-sentence model: **add a `@x` folder, get an `x` prop.** Everything else in the lesson is consequences of that.
- `Term`: `slot` ("A named region of a layout filled by the framework from a `@`-folder's matching route, beside `children`.").

### Each slot is its own route tree

Goal: the payoff — show that a slot is a *full* mini route tree, and that this is what makes the list stay mounted while only the detail changes.

- The claim: a `@slot` folder isn't a single file, it's an independent route subtree — its own `page.tsx`, its own dynamic `[id]` segments, its own `loading.tsx`/`error.tsx`/`not-found.tsx`. The URL is matched against **every** slot independently and the matches are handed to the layout together.
- Build the real structure with `<FileTree>` (the canonical list-plus-detail shape):
  ```
  app/invoices/
    layout.tsx              receives { children, detail }
    page.tsx                the list (children)  — /invoices
    @detail/
      page.tsx              empty/placeholder detail — /invoices
      [id]/
        page.tsx            the selected invoice — /invoices/42
  ```
  Bold `@detail/[id]/page.tsx`. This is the moment to make the URL→slot mapping explicit.
- Walk the two URLs with a `DiagramSequence` (or `RequestTrace`-adjacent — but this is route *matching*, not the render pipeline, so `DiagramSequence` is the right tool; `RequestTrace` is for Ch 030–032 render phases). Two steps:
  - Step A — URL `/invoices`: `children` ← `app/invoices/page.tsx` (the list), `detail` ← `@detail/page.tsx` (placeholder). Show the layout with both slots filled, detail empty.
  - Step B — URL `/invoices/42`: `children` ← still `app/invoices/page.tsx` (the list — **unchanged**, so it stays mounted), `detail` ← `@detail/[id]/page.tsx` with `params.id = '42'`. Highlight that only the detail slot's content swapped; the list pane is identical between steps.
  - Caption hammers the payoff: **clicking a row navigates to `/invoices/42`; only the `detail` slot re-renders; the list keeps its scroll position and any client state.** This is the thing the SaaS world hand-rolled for a decade, now URL-backed for free.
- Each slot reads its own slice of URL state independently: the detail slot's `[id]/page.tsx` awaits `params` (L3 — `params` is a Promise in Next 16, `await` it); the list's `page.tsx` would await `searchParams` for filters. Show the detail page briefly with `Code` (simple block) to reinforce it's an ordinary dynamic page:
  ```tsx
  export default async function InvoiceDetail({
    params,
  }: PageProps<'/invoices/[id]'>) {
    const { id } = await params;
    // capture → validate → query  (L3 reflex)
    return <InvoiceCard id={id} />;
  }
  ```
  - Note in prose, do not build: filtering the list via `searchParams` is the same idea on the other slot; the full `searchParams` URL-state model is Ch 033.4. Keep this a one-liner so the lesson stays on routing.
- Reinforce the "stays mounted" point by connecting to L2's render boundary: the layout and the list pane are above the navigation that changed; only the matched slot below swapped. Same mental model as nested-layout persistence, now with two independent below-the-fold trees instead of one.

### default.tsx and the unmatched slot

Goal: the durability pass and the #1 bug. Teach **why** `default.tsx` exists by making soft-vs-hard navigation visible, then make shipping one per slot a reflex.

- Set up the problem precisely. The router holds **one match per slot**. On **soft navigation** (a `<Link>` click — L4 Term), the router only re-resolves the slots whose match changed and **keeps the previous match for the others** — that's why clicking `/invoices/42` updates `detail` and leaves `children` alone. But on **hard navigation** — a direct visit to `/invoices/42`, a refresh (F5), or `Cmd/Ctrl+click` opening a new tab — there is no "previous match" to keep. The router must resolve **every** slot from the URL alone, and if any slot has no matching route for that URL, the framework has nothing to render there.
  - Recall `soft navigation` vs `hard navigation` as Terms (defined L4): `Term` each here too, since the whole section pivots on the distinction. Soft = client-side page swap, no document reload, previous slot matches survive. Hard = full document load, every slot resolved fresh from the URL.
- The failure: without a fallback, an unmatched slot on hard navigation **404s the entire route** — not just the slot. So the page works while you click around in dev, then breaks the instant a user opens the shared link or refreshes. This is exactly why it's the most common parallel-routes bug: the happy path hides it.
- The fix: `default.tsx`. A `default.tsx` in a slot folder is the **unmatched-slot fallback** — what the framework renders for that slot when the URL doesn't match any of the slot's routes on hard navigation. Same default-export shape as `page.tsx`. Often it's the slot's "empty/neutral" state (for `@detail`, a "Select an invoice" placeholder) or even `export default function Default() { return null; }`.
- Make the mechanics concrete with a `DiagramSequence` (three steps) — this is the section's load-bearing visual:
  - Step 1 — soft nav `/invoices` → `/invoices/42`: router keeps `children`'s match, swaps only `detail`. Both slots filled. Caption: "Soft navigation remembers the other slots."
  - Step 2 — hard nav: refresh on `/invoices/42`. Router resolves both slots fresh. `children` matches `page.tsx`; `detail` matches `[id]/page.tsx`. Fine — both match, no fallback needed. Caption: "On refresh every slot is resolved from the URL."
  - Step 3 — hard nav to a URL where a slot **can't** match, with two panels via inner `TabbedContent` or two captioned sub-steps: **without `default.tsx`** → the whole route 404s (show the slot as a red "no match → 404"); **with `default.tsx`** → that slot renders its default, the route survives (green). Caption: "`default.tsx` is the difference between a shareable URL and a 404."
- Updated file tree with `<FileTree>`: add `@detail/default.tsx` (bold it). Restate the reflex as a one-liner the student can carry: **every parallel slot ships a `default.tsx`.** Reinforce with an `Aside` (caution) right here — not a trailing watch-out — since this is the bug that bites in production: "If a slot has no `default.tsx` and no match on a hard load, Next 404s the whole page. Add `default.tsx` to every slot, even if it just returns `null`."
- Mini reinforcement: a small `Code` block showing the trivial `@detail/default.tsx` and the placeholder one side by side via `CodeVariants` (label "Return null" vs "Neutral placeholder"), one paragraph each — both are legitimate, pick by whether the empty state needs UI.
- Note (prose, pre-empts the natural "do I need one for `children` too?" question — phrase carefully, this is a verified subtlety): `children` is itself an *implicit* slot, so the `default.tsx` rule applies to it too. In the simple single-segment case here, `children` always matches the segment's `page.tsx`, so no `@children`/`default.tsx` is needed. But the framework can still fail to recover `children`'s active state on a hard load once slots nest deeper — Next.js's own "missing `default.js`" guidance explicitly covers `children`. So state the durable rule as: **a `default.tsx` is needed wherever a slot — named or the implicit `children` — can be unmatched on hard navigation**, and keep the "every named slot ships one" reflex as the practical floor. Do **not** claim `children` never needs one.

### Slots stream on their own

Goal: name the streaming capability and its boundary owner (Ch 031) without teaching Suspense. Keep this short — it's a capability flag, not a build.

- Because each slot is an independent route tree, each can carry its own `loading.tsx`. The framework wraps each slot in its own Suspense boundary: the layout shell and any already-resolved slots paint immediately while a slow slot shows its own skeleton and streams in when ready. So a slow `detail` query never blocks the list from rendering.
- Tiny `<FileTree>` delta: `@detail/loading.tsx` alongside `@detail/page.tsx`. One sentence: this skeleton shows only while the *detail* slot loads, independently of the list.
- Hard stop and forward-reference: Suspense, streaming, `loading.tsx`, and the boundary-placement rules are Ch 031 — here it's enough to know **each slot is its own loading boundary**. Do not explain Suspense mechanics. Use an `Aside` (note) to mark the boundary cleanly so downstream agents don't over-build this.

### @slot, (folder), and _folder

Goal: disambiguate the three "doesn't change the URL" folder conventions the student has now met, before they conflate them.

- Frame: three folder prefixes now affect routing without adding a URL segment — but they do *different* things. State the discriminator up front: `_folder` is **not a route at all**; `(folder)` and `@folder` *are* routes, but contribute no URL segment — the difference is what they hand the layout.
- Comparison table (plain markdown table, content section not appendix):

  | Convention | What it is | Adds a URL segment? | Layout receives |
  | --- | --- | --- | --- |
  | `_folder` (L1) | Private folder — colocated, non-routable code | No (invisible to router) | Nothing; it's not a route |
  | `(folder)` (L2) | Route group — organizes siblings / picks a layout | No | Normal `children` |
  | `@folder` (this lesson) | Parallel slot — independent route tree | No | A **named prop** beside `children` |

- One-line mnemonic per the L1/L2 terminology already in use: `_folder` = "not a route"; `(folder)` = "a route minus its segment"; `@folder` = "a route that becomes a named prop." 
- Watch-out folded in here (not trailing): `@detail` is **not** a route group — you never write `/invoices/@detail/...`; the `@` segment is invisible to the URL just like `(group)` is, but it surfaces as a *prop*, not as more `children`. And a slot is scoped to **one** layout — the layout in the same segment as the `@folder`; it isn't visible to parent or child layouts.
- Quick check: `MultipleChoice` (single correct) — give a 4-folder tree and ask which folder name becomes a prop on the layout (correct: `@detail`; decoys: `_lib`, `(app)`, `[id]`). Phrase the answer reasoning in `McqWhy`, not lifted verbatim from the table.

### When parallel routes earn their weight

Goal: the senior decision filter — when to reach for this vs. simpler tools. Per "defaults before conditionals," name the threshold the default crosses.

- The default is **one page**. Parallel routes are a power tool; reach for them only when the threshold is crossed: **two or more regions of one screen each need their own URL-driven state, loading, error, or not-found behavior**, *and* you want both reflected/refreshable in a single URL.
- The three earn-it cases (from the outline): (1) list-plus-detail and similar split surfaces where each pane has independent URL state; (2) independent loading/error per region (a dashboard where the feed can error without taking down the KPIs); (3) the foundation for the intercepting-route modal pattern (L6) — the `@modal` slot.
- The anti-reach (this is where beginners overuse it): **two unrelated routes that merely share a layout are not parallel routes — that's nested layouts (L2).** A single page that fetches two things is not parallel routes either. If the regions don't each need independent *URL/loading/error* behavior, a plain layout + page is simpler and you should prefer it. Connect explicitly back to L2 so the student files parallel routes as the *escalation* from nested layouts, not a replacement.
- `StateMachineWalker` (`kind="decision"`, default) — a short decision funnel the student walks, since the lesson "lives in the order the senior asks the questions." Shape:
  - Q1 "Does the screen have 2+ regions that each need their own URL state, loading, or error behavior?" → No → Leaf "A single `page.tsx` (+ a layout if shared)." / Yes → Q2.
  - Q2 "Do those regions need to be independently shareable/refreshable at one URL?" → No → Leaf "Nested layouts or one page with `Promise.all` reads." / Yes → Q3.
  - Q3 "Is one region a modal/overlay that should also have a direct-visit full page?" → No → Leaf "Parallel routes (`@slot` per region + `default.tsx`)." / Yes → Leaf "Parallel routes **plus** an intercepting route — Lesson 6." (verdict forward-points to L6.)
  - Keep leaves to 1–2 sentences; this is a reach-for filter, not a tutorial.

### Recap and what's next

Goal: consolidate the mental model and hand off to L6.

- Three-line recap: (1) `@folder` → named prop on the layout, beside `children`; (2) each slot is an independent route tree resolved from the same URL — list stays mounted, detail swaps; (3) every slot ships a `default.tsx` or hard navigation 404s the route.
- An ordering `Sequence` drill to check the "what fills what on which URL" model: given the canonical `app/invoices/{layout,page,@detail/{page,[id]/page,default}}` tree (as the fixed code/file block above the steps), order the events for a **refresh on `/invoices/42`**: (1) browser issues a full document request for `/invoices/42`; (2) router resolves `children` against `app/invoices/page.tsx`; (3) router resolves `@detail` against `@detail/[id]/page.tsx` (matches, so `default.tsx` is not used); (4) layout receives `{ children, detail }` both filled; (5) page renders with the list and the selected invoice. This tests the hard-navigation resolution model — the exact thing the lesson is about.
- Forward-point to L6: a `@modal` slot holding an *intercepting* route gives "show details in a modal without leaving the list" UI a real, shareable, refreshable URL — same slot machinery you just learned, plus one folder that intercepts soft navigation. One sentence, no detail.
- Optional `ExternalResource` LinkCard to the Next.js parallel-routes docs (and the `default.js` reference) for the student who wants the full convention surface.

---

## Scope

**Prerequisites — redefine in one clause each, do not re-teach:**
- Layouts receive framework-filled `children`; layouts stay mounted across in-subtree navigation (L2). Used as the anchor; restate in a sentence, don't re-derive.
- `[id]` dynamic segment; `params` is a Promise in Next 16, `await` it; `PageProps<'/route'>` typed props; capture→validate→query (L3). The detail slot reuses this; reference, don't re-teach Zod/validation depth.
- `<Link>` soft navigation; soft vs hard navigation Terms; `notFound()` (L4). Soft-vs-hard is *applied* here at depth (it's why `default.tsx` exists) but the Terms themselves were defined in L4 — cite them.
- Route groups `(folder)` and private `_folder` (L1/L2) — appear only in the disambiguation table; don't re-teach their mechanics, just contrast.

**Explicitly out of scope (owned elsewhere):**
- **Suspense, streaming mechanics, `loading.tsx`/`error.tsx`/`not-found.tsx` at depth — Ch 031.** Slots are named as *independent loading/error boundaries* and `loading.tsx` appears in a file tree, but the lesson must not teach how Suspense works, boundary placement rules, or the `error.tsx` `reset` prop. Hard boundary.
- **`searchParams` and the URL-as-view-state model — Ch 033.4.** Filtering the list slot via `searchParams` is named in one line as "same idea, other slot" and forward-referenced; do not build the filter, do not teach `searchParams` shape/Zod/`nuqs`.
- **Intercepting routes and the modal pattern — L6.** The `@modal` slot is named as the bridge to L6 in the "earn their weight" funnel and the closing; do not teach `(.)`/`(..)` prefixes, the non-intercepting sibling, or modal UI here.
- **The full list-plus-detail project (server data, real queries, the wired modal, per-slot streaming in anger) — Ch 035.** This lesson teaches the routing surface with thin/placeholder components (`<InvoiceCard>`, `<InvoiceList>` referenced but not implemented); no data layer, no Server Actions.
- **The Cache Components / PPR render model and why static-shell-then-stream — Ch 032.** Not even named beyond "streams in" colloquially.
- **`proxy.ts` / tenant-scoped slot rendering — Ch 033.** Not mentioned.
- **`generateStaticParams` for the detail slot — Ch 034.** Not mentioned.

**Components intentionally left as thin placeholders:** `<InvoiceCard id={id} />`, `<InvoiceList />`, the "Select an invoice" placeholder — referenced to keep examples concrete, never implemented. Data fetching is Ch 035. Flag this so downstream agents don't flesh them out.

---

## Code conventions notes (for downstream agents)

- **Default exports are correct here** for `page.tsx`, `layout.tsx`, and `default.tsx` — all three are on the framework-sanctioned default-export list (Code conventions §Function form). Every other helper/component is a named export in a `kebab-case` file.
- **Paths use `src/app/…`** (course starter uses `src/` + Biome), not bare `app/`. File trees and prose say `src/app/invoices/…`. (Continuity: L1/L2 established `src/`.)
- **Type page/layout props at the parameter** with the generated `PageProps<'/route'>` / `LayoutProps<'/route'>` helpers as the senior default (L3 convention). The hand-written `{ children, detail }: { children: React.ReactNode; detail: React.ReactNode }` shape in the first layout example is a **deliberate teaching simplification** to make the slot→prop correspondence visible — flag it in prose ("the framework also generates `LayoutProps<'/invoices'>` that names these slots for you"), then prefer the generated helper in any subsequent/complete example.
- **`React.ReactNode`** for slot/children prop types — never `JSX.Element`/`ReactElement` (L2 convention).
- **`async function` page** for the detail slot (sanctioned default export, awaits `params`).
- Tailwind utilities for the layout grid (course is Tailwind v4 on JSX). Keep layout CSS minimal and real.
- Filenames `default.tsx`/`page.tsx`/`layout.tsx`/`loading.tsx` are framework-dictated; folder `@detail` is the slot name (kebab-case if multi-word).
