## Concept 1 — The file system *is* the URL space

**Why it's hard.** Students arriving from React Router, Express, or any router-as-config background expect to register routes somewhere. The App Router inverts that: there is no route table, and the folder structure isn't an organizational suggestion — it is the contract the framework enforces. Until that flips, every later convention (`page.tsx`, `[id]`, `(group)`, `@slot`, `(.)`) reads as arbitrary syntax instead of as moves on a single board.

**Ideal teaching artifact.** A *Concept* shown as a side-by-side mapper: on the left, a tiny `app/` tree (root `page.tsx`, `dashboard/page.tsx`, `dashboard/invoices/page.tsx`, plus a `dashboard/_components/` folder); on the right, the URL surface that tree produces (`/`, `/dashboard`, `/dashboard/invoices`, with the private folder visibly absent). The student edits the tree — rename a folder, delete a `page.tsx`, add `_components/` — and the URL list updates beat by beat. The point isn't the mapping; it's that the mapping is *the only* mapping, and that there's nothing else to configure.

**Engagement.** After the artifact, a `Tokens` round on a real `app/` tree screenshot — click every file that produces a route, with `layout.tsx`, `_components/Button.tsx`, and a stray `utils.ts` as decoys. Wrong-pick feedback names exactly why each decoy doesn't route.

**Components.**
- Primary: `FileTree` + adjacent prose-rendered URL list inside a `Figure`, paired with a `Tokens` round.
- Alternative: a new `FileTreeToURL` widget (folder tree as an editable list, URL surface as a derived right pane). Demoted because the static `FileTree` plus `Tokens` carries the same teaching load without bespoke build, and the dynamic edit-and-see-URLs version doesn't recur outside this chapter.

**Project link.** The 5.7 starter tree is the first thing the student reads in 5.7.2 — recognizing each folder's routing role on sight is the win.

---

## Concept 2 — Co-locate by feature, not by layer (and `_folder` is how)

**Why it's hard.** Junior-to-mid devs trained on "top-level `components/`, `hooks/`, `services/`" treat the by-layer split as default-correct. The App Router rejects it for a structural reason — *every* folder under `app/` is a route candidate, so layer-named folders compete with the framework's namespace. The underscore-private convention is the mechanism that lets feature co-location work without polluting the URL surface.

**Ideal teaching artifact.** A *Pattern* shown as a before/after of the same feature: a "by-layer" project (top-level `components/dashboard/Sidebar.tsx`, `hooks/useDashboardFilters.ts`, `lib/dashboardQueries.ts`) and a "by-feature" project (`app/dashboard/_components/Sidebar.tsx`, `app/dashboard/_lib/queries.ts`, `app/dashboard/_actions.ts`). The pairing is shown side-by-side so the student sees three failure modes the layer split causes (deleting the feature requires touching N top-level folders, two features named the same thing collide, route-specific code drifts away from its route) and the single rule that fixes them.

**Engagement.** A `Buckets` round: ten files (`Sidebar.tsx`, `dateUtils.ts`, `db/schema.ts`, `useInvoiceStatus.ts`, `_lib/getInvoices.ts`, etc.) sorted into "inside the route folder," "inside `_lib/` or `_components/` under the route folder," or "top-level outside `app/`." The threshold the student internalizes is "used by 2+ features" → top-level.

**Components.**
- Primary: two `FileTree` instances inside a `TabbedContent` (or side-by-side in a `Figure`), followed by `Buckets` for placement decisions.

**Project link.** The 5.7 starter places `lib/invoices/queries.ts` outside `app/` because Unit 6 will share it across features — the student should be able to defend that placement against "shouldn't this be co-located?" using the threshold rule.

---

## Concept 3 — Layouts compose down the tree, and stay mounted

**Why it's hard.** The render boundary between layout and page is the source of two persistent misconceptions: (1) that layouts re-render on every navigation (they don't, within their subtree), and (2) that `children` is something the developer fills in (the framework fills it). The senior payoff — putting persistent UI like a sidebar toggle or media player in the layout because its state survives navigation — is invisible until both misconceptions are corrected.

**Ideal teaching artifact.** A *Concept* delivered as a scrubbable "navigation timeline." The student sees a three-level tree (`RootLayout` → `DashboardLayout` → page) rendered as nested boxes, with a counter inside `DashboardLayout` and a counter inside the page. They scrub a slider through three navigations: `/dashboard` → `/dashboard/invoices` → `/dashboard/settings`. At each step, the diagram highlights which boxes re-mount (the page counter resets) and which stay (the layout counter holds). The visual lesson is the render boundary; the counters are the proof.

**Engagement.** A `PredictOutput` exercise: given a `DashboardLayout` with `useState(0)` in a client child and a page with its own `useState(0)`, predict what each counter shows after the student clicks "increment" twice and navigates to a sibling route. Three answer slots, one for each counter, after each step.

**Components.**
- Primary: `DiagramSequence` with three slides (one per navigation step), each slide a hand-SVG tree with re-mount and persist markers, inside a `Figure`. Pair with `PredictOutput`.
- Alternative: a new `NavigationTimeline` interactive widget (live counters that actually persist or reset). Demoted — the scrubbed `DiagramSequence` plus a code-side `PredictOutput` carries the lesson, and a live widget here doesn't reappear elsewhere.

**Project link.** The 5.7 layout (`invoices/layout.tsx`) holds the two-slot grid; recognizing that the grid stays mounted while only the slot pages re-render is what makes independent streaming (5.7.5) feel inevitable rather than magical.

---

## Concept 4 — Route groups are URL-invisible organizers

**Why it's hard.** The `(folder)` syntax is overloaded with three uses (one shell across siblings without a URL prefix; multiple distinct shells in one app like `(marketing)` and `(app)`; team/domain organization), and the parens-don't-affect-the-URL rule sounds like a trick. The student needs both the "what it does" and "when it earns its weight" — without the latter they reach for it everywhere or never.

**Ideal teaching artifact.** A *Decision* shown as a small file-tree puzzle. Given a SaaS app with a marketing site (`/`, `/pricing`, `/about` — shared marketing shell), a product (`/dashboard`, `/dashboard/invoices` — shared app shell), and an auth flow (`/sign-in`, `/sign-up` — minimal shell), the student is shown three candidate file trees and picks the one that achieves all three URLs without a `/marketing/` or `/app/` prefix. One candidate uses no groups (and produces ugly URLs), one uses groups correctly, one creates a URL collision across groups (which the framework rejects at build time). Each candidate's URL output is displayed.

**Engagement.** The puzzle itself is the assessment. Follow up with a one-line `MultipleChoice`: "Two pages in different route groups resolving to the same URL produce…" — build-time error / silent override / runtime 404 / works fine.

**Components.**
- Primary: three `FileTree` panels inside a `TabbedContent` (each tab is a candidate solution with its URL output and verdict), followed by `MultipleChoice`. The puzzle-as-tabbed-comparison carries the assessment; the multiple choice confirms recall of the collision rule specifically.

**Project link.** Not load-bearing for 5.7 directly, but every Unit-9-and-later project uses `(auth)`/`(app)` splits — the recognition matters there.

---

## Concept 5 — Dynamic segments and the `params`-is-a-Promise change

**Why it's hard.** Two distinct things need to land at once: the `[id]` folder convention for capturing URL segments as parameters, and the Next.js 16 change that made `params` a Promise. The Promise part is the production-bite — forgetting `await` produces a runtime Promise that React happily renders as `[object Promise]`, and the error trail doesn't point at the missing keyword.

**Ideal teaching artifact.** A *Mechanics* lesson with two stacked beats. First beat: a small filetree showing `app/invoices/[id]/page.tsx` next to its rendered URL (`/invoices/inv_017`) and the resolved `params` value (`{ id: 'inv_017' }`) — the convention, deadpan. Second beat: a wrong-then-right `CodeVariants` block. Variant A reads `params.id` without awaiting (broken — annotated with what the page actually renders); variant B awaits `params` first (correct). The contrast is the lesson — the rule isn't "always await" stated abstractly, it's "this is what breaks when you don't."

**Engagement.** A `ReactCoding` exercise: given a page stub with `params: Promise<{ slug: string }>` typed correctly, the student writes the async body that awaits, reads `slug`, and renders it. Tests assert the rendered output for two seeded URLs.

**Components.**
- Primary: `FileTree` + `Figure` for the convention beat, `CodeVariants` for the wrong/right contrast, `ReactCoding` for the exercise.

**Project link.** 5.7.3 wires `@detail/[id]/page.tsx` with `params: Promise<{ id: string }>` and awaits it — direct repeat of this exercise's shape.

---

## Concept 6 — Catch-all vs. optional catch-all decision

**Why it's hard.** Three patterns sit at the same level (`[id]`, `[...slug]`, `[[...slug]]`) and the difference between catch-all and optional catch-all is one bracket and one rule: optional matches the parent URL, catch-all doesn't. Junior students reach for catch-all when they mean dynamic, and rarely reach for either when the use case is genuinely variable depth.

**Ideal teaching artifact.** A *Decision* presented as a matching table. The student is given six concrete URL specs ("a detail page per invoice ID," "a docs site where `/docs`, `/docs/foo`, and `/docs/foo/bar` all render from one place," "a tenant-scoped invoice — `/orgs/:slug/invoices/:id`," etc.) and matches each to the right folder shape: `[id]`, multiple `[…]/[…]`, `[...slug]`, or `[[...slug]]`. Each correct match reveals the rule that picked it (known-depth single variable, multi-axis scoping, variable depth with separate parent, one-page-serves-all).

**Engagement.** The matching is the assessment. Follow up with a one-line `TrueFalse` round on the parent-matching rule: `[...slug]` matches the parent URL alone (false), `[[...slug]]` matches the parent URL alone (true), `[id]` matches `/foo/bar/baz` (false), etc.

**Components.**
- Primary: `Matching` for the spec-to-shape exercise, followed by `TrueFalse` for the parent-matching rule.

**Project link.** Not used in 5.7 (single dynamic segment only), but the decision is the entry to docs-site and CMS-driven content in later units.

---

## Concept 7 — Validate captured params at the boundary

**Why it's hard.** A captured segment is a string from an untrusted URL — but typed as `string`, it looks safe to a TypeScript-trained eye. The senior reflex is to treat `params` and `searchParams` like form input: parse at the boundary with Zod, let parse failures surface as 404s or error boundaries, and never pass an unvalidated string to a database query.

**Ideal teaching artifact.** A *Pattern* shown as a small "wrong-by-default sandbox": the student is given a page that takes `params.status` and passes it straight to `getInvoices({ status })`, plus a `getInvoices` function whose body is `db.query.invoices.findMany({ where: eq(invoices.status, status) })`. Three test URLs are shown — `/invoices?status=paid` (works), `/invoices?status=banana` (silent empty result, the senior bug), and `/invoices?status=<sql-payload>` (the trust failure). The student adds a Zod parse at the boundary and the same three URLs now route correctly (parse, fallback, reject). The artifact carries the assessment — the student can't proceed without the fix.

**Engagement.** The wrong-by-default repair is itself the assessment. Follow up with a single `MultipleChoice`: where should the Zod parse live? — inside the database query / at the top of the page Server Component / inside a `useEffect` after render / in `proxy.ts`. The correct answer reinforces "at the boundary," not "wherever it ends up."

**Components.**
- Primary: `ReactCoding` (target-match mode — student sees the three URL results, must produce the same outputs in their version) followed by `MultipleChoice`. The repair-the-sandbox shape is the engagement.

**Project link.** 5.7.3 wires exactly this pattern with `searchParamsSchema.safeParse` — the project's silent-fallback-on-invalid-status is the same move the student just learned.

---

## Concept 8 — `<Link>` and the prefetching default

**Why it's hard.** `<Link>` looks like an `<a>` tag and the distinction "use `<Link>` in-app, `<a>` for external" is easy to state but easy to forget. The harder beat is *why* — prefetching. Most students never inspect the network tab on hover, so the "the framework fetched the destination's bundle and data before you clicked" model stays abstract.

**Ideal teaching artifact.** A *Mechanics* lesson with a network-tab replay. The student watches a recorded sequence (or a scrubbable timeline): mouse moves toward a `<Link>`, the Network tab lights up with an RSC payload request before the click happens, the click resolves instantly because the data is already there. Alongside, a one-table comparison of the three `prefetch` modes (`null`/default, `true`, `false`) with the senior reach line: "the default is right unless prefetching is expensive."

**Engagement.** A `Buckets` round: ten navigation scenarios sorted into "use `<Link>` with default prefetch," "use `<Link prefetch={false}>`," "use `<a>`." Scenarios include "link to `/dashboard` in the sidebar," "link to `mailto:`," "link to a rarely-clicked admin page that costs to prefetch," "link to a partner's site," etc.

**Components.**
- Primary: a hand-SVG or screenshot-style `Figure` showing the hover-prefetch network sequence (annotated), plus a small prose comparison table, plus `Buckets` for the decision round.
- Alternative: a new `LinkPrefetchTimeline` widget (animated mouse-toward-link with a live network panel). Demoted — single-use within this chapter, and a static annotated `Figure` of the same sequence teaches the same model.

**Project link.** 5.7.4 uses `<Link href="/invoices/new">` for the modal trigger — the prefetch default is what makes the modal feel instant.

---

## Concept 9 — The throwing trio: `redirect`, `permanentRedirect`, `notFound`

**Why it's hard.** Three server-side flow-control mechanisms that *throw* instead of return — and the throwing semantics catch students out. Code after the call doesn't run; wrapping the call in `try/catch` swallows the framework's signal and breaks the redirect. The trio also splits on HTTP semantics (307 vs 308) and on user-expectation (missing resource vs auth gate vs URL migration) — three decisions packed into a one-line API.

**Ideal teaching artifact.** A *Decision* delivered as a decision flowchart (one screen) plus a misconception-first ambush. The ambush goes first: show four short Server Component snippets, each calling one of the trio in a different shape (one wraps `redirect()` in `try/catch`, one calls `console.log` after `notFound()`, one uses `permanentRedirect` for a session-based redirect, one is correct). The student picks the broken ones and names why. *Then* the decision tree is revealed: "missing resource → `notFound()`; auth gate or post-action → `redirect()`; URL has permanently moved → `permanentRedirect()`."

**Engagement.** The misconception-spot is the assessment. Follow with a single `MultipleChoice` on the HTTP code each throws — `redirect()` is 307, `permanentRedirect()` is 308, `notFound()` is 404 — to lock the SEO-relevant difference.

**Components.**
- Primary: `MultipleChoice` (multi-correct mode) on the four snippets for the ambush, then a `Figure` with a Mermaid flowchart of the decision, then a single-correct `MultipleChoice` for the HTTP codes.

**Project link.** 5.7.3 calls `notFound()` when `getInvoice(id)` returns null — the project uses exactly the "missing resource" branch of the decision.

---

## Concept 10 — Parallel routes: `@slot` as a layout prop

**Why it's hard.** The mental model is genuinely new. The student has internalized "a layout wraps a page" — parallel routes break that into "a layout wraps `children` *and* one or more named slot props, each of which is its own mini route tree." On top of that, slots have invisible URL semantics (the slot folder doesn't appear in the URL but does receive its own segment match), and each slot has its own loading/error boundary. The list-plus-detail shape is the payoff, but without seeing it laid out, slots feel like an exotic convention rather than the right tool.

**Ideal teaching artifact.** A *Concept* shown as a layered anatomy diagram. On the left, the file tree (`invoices/layout.tsx`, `invoices/@list/page.tsx`, `invoices/@detail/[id]/page.tsx`); in the middle, the layout signature with `children`, `list`, and `detail` props highlighted; on the right, the rendered UI with three labeled regions (shell, list pane, detail pane) showing which file populates which region. A second beat shows a navigation: clicking `/invoices/inv_017` updates only the `@detail` region; `@list` stays mounted. The visual job is to make "slot folder ↔ layout prop ↔ rendered region" a single object in the student's head.

**Engagement.** A `Matching` round: four slot folder paths (`@list/page.tsx`, `@detail/[id]/page.tsx`, `@modal/(.)photo/[id]/page.tsx`, `default.tsx`) matched to four layout-prop usages (`{list}`, `{detail}`, `{modal}`, "fallback when slot has no match"). Forces the folder-to-prop mapping into a discrete decision.

**Components.**
- Primary: a `Figure` with a hand-SVG anatomy diagram (file tree, layout signature, rendered UI mapped with arrows), followed by `Matching`.
- Alternative: a new `SlotAnatomy` interactive widget (hover a folder, the prop and rendered region highlight). Demoted — the static annotated SVG conveys the mapping cleanly, and a generic component-anatomy widget doesn't have an obvious second customer in this curriculum.

**Project link.** 5.7 is built on this exact shape. The student wires `@list` and `@detail` slots in 5.7.3 — recognizing the layout's three-prop signature on sight is the load-bearing transfer.

---

## Concept 11 — `default.tsx` and the hard-navigation gap

**Why it's hard.** This is the single most common parallel-routes bug, and the failure mode is non-obvious: soft navigation works, the dev server works, hard refresh produces a 404. The cause — a slot with no matched segment on direct visit needs a `default.tsx` fallback — is invisible from any individual file's behavior. It only surfaces when navigation history is gone.

**Ideal teaching artifact.** A *Pattern* delivered as a wrong-by-default scenario the student debugs. The student is shown a working list-plus-detail surface (soft nav from `/invoices` to `/invoices/inv_017` works) and asked to predict what happens when the user refreshes on `/invoices/inv_017`. The naive prediction ("same thing, just slower") is wrong: `@list` has no segment match for `/invoices/inv_017` (its match was `/invoices`, which doesn't exist in the URL anymore), so without `default.tsx` the whole route 404s. After the reveal, the student adds `@list/default.tsx` that returns the same content as `@list/page.tsx`, and the refresh works.

**Engagement.** The repair is the assessment. Follow with a one-line `TrueFalse` round to lock the soft-vs-hard distinction: "soft navigation keeps the previous slot match when no new match exists" (true), "`default.tsx` is rendered on every refresh" (false — only when the slot has no match), "every parallel slot must ship a `default.tsx`" (true).

**Components.**
- Primary: `PredictOutput` for the refresh-prediction ambush, then `ReactCoding` (or a step-by-step `Steps` walkthrough with files shown in `FileTree` + code blocks) to wire the fix, then `TrueFalse`.

**Project link.** 5.7.3 explicitly names `default.tsx` as "the silent must-have" and has the student write both `@list/default.tsx` and `@detail/default.tsx` — the prediction-and-repair from this lesson is exactly the move the project asks for.

---

## Concept 12 — Intercepting routes and the paired non-intercepting twin

**Why it's hard.** Intercepting routes are the hardest convention in the App Router for three reasons stacked: the `(.)`, `(..)`, `(...)` prefix syntax looks like route groups but isn't; the intercepter only fires on soft navigation, so the student tests it once and it "works," then hard-refresh breaks; and the canonical use case — a modal with a real URL — requires *combining* intercepting routes with parallel routes (`@modal` slot) which the student just learned. The pairing with a non-intercepting sibling is the contract that makes the whole thing degrade gracefully, and it's the part students skip.

**Ideal teaching artifact.** A two-beat *Pattern*. **Beat one**: a navigation comparison artifact — three columns, one per entry path (click a `<Link>` from the feed, hard-refresh on the modal URL, `Cmd+click` the photo). For each entry path, the diagram traces which file renders: soft-click hits `(.)photo/[id]/page.tsx` (modal); refresh and `Cmd+click` hit `app/photo/[id]/page.tsx` (full page). The student sees that without the non-intercepting twin, two of three entry paths 404. **Beat two**: the file tree of the combined pattern — `@modal` slot containing `(.)photo/[id]/page.tsx`, `@modal/default.tsx` (empty), sibling `app/photo/[id]/page.tsx` — with each file labeled with which entry path triggers it. The two beats together build "modal-with-real-URL" as a single composable pattern rather than two unrelated features bolted together.

**Engagement.** A `Sequence` exercise: given the seven files needed for the photo-modal pattern (root layout, feed layout with `@modal` slot, feed `page.tsx`, `@modal/default.tsx`, `@modal/(.)photo/[id]/page.tsx`, `photo/[id]/page.tsx`, shared `PhotoDetail.tsx` component), order them by "which file fires for which user action" and identify which two files would, if missing, break the pattern.

**Components.**
- Primary: a `Figure` with hand-SVG showing the three entry paths and which file renders for each (beat one), a `FileTree` for the combined-pattern tree (beat two), followed by `Sequence`.
- Alternative: a new `NavigationPathTracer` widget (pick an entry path, see the rendered file highlighted in a live file tree). Demoted — the static three-column figure carries the comparison; the only forward-link would be the 5.7.4 build, where the project itself is the interactive version.

**Project link.** 5.7.4 builds exactly this pattern — `(.)new/page.tsx` as the modal, `new/page.tsx` as the twin, soft-click opens dialog, refresh and `Cmd+click` open the full page. The student writes the non-intercepting twin *first* (5.7.4's deliberate ordering) so the lesson's "always paired" rule is enforced by the project's lesson sequence.

---

## Component proposals

None. Every concept fits within the existing toolkit using `FileTree`, `Figure` (with hand-SVG or Mermaid), `ArrowDiagram`, `DiagramSequence`, `TabbedContent`, `CodeVariants`, `ReactCoding`, `Matching`, `Buckets`, `Tokens`, `MultipleChoice`, `PredictOutput`, `TrueFalse`, `Sequence`, and `Steps`. The candidate bespoke components considered inline (Concept 1's `FileTreeToURL`, Concept 3's `NavigationTimeline`, Concept 8's `LinkPrefetchTimeline`, Concept 10's `SlotAnatomy`, Concept 12's `NavigationPathTracer`) all failed the single-use discipline — none recur within the chapter, and none has a credible forward-link strong enough to justify a bespoke build over a static `Figure` composition that teaches the same model.

## Build priority

No new components proposed. The chapter's teaching weight lands on careful composition of existing components — especially `FileTree` paired with annotated `Figure` SVGs (Concepts 1, 2, 10, 12), `CodeVariants` for the wrong-then-right beats (Concepts 5, 7), and `ReactCoding` in target-match mode for the repair-the-sandbox patterns (Concepts 7, 11). If the team wants to invest in one reusable artifact that would compound here and forward, it is *not* a routing-specific widget but a richer "file-tree-with-side-annotations" composition pattern — a `FileTree` whose nodes can carry an inline label (URL produced, render role, framework convention name). That would lift Concepts 1, 2, 4, 10, and 12 simultaneously and recur in every later App Router and Unit-9-and-up project chapter. It's worth pricing as a `FileTree` prop extension rather than a new component.

## Open pedagogical questions

- Concept 5's wrong-then-right `CodeVariants` block leans on showing the `[object Promise]` render artifact. If Next.js 16's error overlay catches the un-awaited case at dev time before render, the failure mode shifts from "renders garbage" to "dev-overlay error" — the lesson still works but the visceral payoff weakens. Worth verifying when the lesson is drafted.
- Concept 8's network-tab prefetch sequence reads best as a short recorded animation. Whether to commit to a static annotated screenshot (cheap, ages well) or a recorded GIF (more visceral, ages with DevTools UI changes) is a production-cost call.
- Concept 11's hard-refresh-404 prediction depends on the refresh actually 404-ing without `default.tsx`. If Next.js 16 changed the fallback behavior to a less dramatic failure (e.g., empty slot render), the ambush loses bite. Verify the current behavior before authoring the `PredictOutput`.
