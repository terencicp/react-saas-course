# Lesson outline — Chapter 029, Lesson 6

## Lesson title

- **Title:** Intercepting routes and URL-backed modals
- **Sidebar label:** Intercepting routes

## Lesson framing

This is the capstone of Chapter 029. It adds exactly **one** new convention on top of everything already built: the intercepting-route prefix (`(.)`, `(..)`, `(..)(..)`, `(...)`). Everything else in the lesson is the L5 parallel-routes machinery (`@slot` → named layout prop, each slot an independent route tree, `default.tsx` as the hard-navigation fallback) plus the L4 soft-vs-hard navigation distinction, recombined. L5's closing already promised this: "same slot machinery + one intercepting folder = modal with a real URL." Open by cashing that promise.

**The senior question (state implicitly in the intro):** how do you ship a feed where clicking a photo opens a modal at `/photo/42` — shareable, refreshable, with working back/forward and Cmd+click — while a *direct* visit to `/photo/42` renders a full standalone page? Lead with the pain the student already knows: the hand-rolled `useState(selectedId)` + conditional `<Dialog>` modal. It works, but the modal is invisible to the URL — you can't deep-link it, refresh closes it, the back button leaves the page instead of closing the modal, Cmd+click can't open it in a new tab, and pasting the link doesn't reproduce the view. Intercepting routes give that modal a **real URL** while preserving the in-context render. That payoff — URL-backed UI — is the whole lesson.

**The mental model to build (in stages, to keep cognitive load low):**
1. The React `useState` modal and its four URL deficiencies — frame the stakes first.
2. The intercepter alone: a folder prefix that says "when *soft-navigating* to this URL **from here**, render *this* instead of the real page."
3. The always-paired non-intercepting sibling: why both files must exist, mapped one-to-one onto soft vs hard navigation.
4. Combine with the `@modal` slot from L5: where the intercepter lives, the empty `@modal/default.tsx`, and closing the modal with `router.back()`.
5. The prefix arithmetic and the single biggest gotcha — the prefix is **URL-segment-relative, not file-system-relative** (route groups don't count).
6. When the pattern earns its weight, and when a plain `useState` dialog is still correct.

**The two hardest ideas — give each its own diagram.**
- *The dual render path.* The **same** URL renders two different things depending on **how** you arrived. This is where beginners fail: they build the intercepter, forget the non-intercepting sibling, and a refresh or a shared link 404s. The fix-it line: *the intercepter is a render override for soft navigation only; the real page is always the ground truth.*
- *Prefix arithmetic is URL-relative.* `(..)` means "one URL segment up," and a `(group)` folder in the path is skipped because it contributes no segment. This is the #2 bug.

**Mental-model summary line to land near the end:** an intercepting route is a soft-navigation render override; it always ships with its real page, and it lives in a parallel slot so the modal renders *beside* — not *instead of* — the page underneath.

**Through-line domain.** L3–L5 used invoices in a multi-tenant SaaS. This lesson's canonical worked example is a **photo feed** (`/feed` → `/feed/photo/[id]`), because the lightbox-with-a-URL is the instantly-recognizable textbook case (everyone has seen Instagram / Dribbble) and the chapter outline frames L6 around it. To keep SaaS relevance and chapter continuity, explicitly map it to the SaaS reach (invoice-row → invoice-detail modal, a message thread, an in-context edit) in the "earns its weight" section. Downstream agents: the photo feed is the primary code/diagram vehicle; SaaS examples are named in prose, not built.

**Format reality (carry the L3–L5 constraint):** the App Router does **not** run inside the React iframe, so there is no live-coding exercise for routes. Checks are recognition/decision drills only. Likewise, `RequestTrace` simulates the *render/stream* pipeline (server → wire → hydrate), **not** navigation/interception branching — do **not** reach for it here; the dual-path model is a routing concept, shown with `TabbedContent` / `DiagramSequence`.

---

## Lesson sections

### Section 1 (intro, no heading) — The modal that forgot it had a URL

Warm, brief. Open on the photo feed scenario and the hand-rolled modal the student already knows from React: `const [selectedId, setSelectedId] = useState<string | null>(null)` and a conditionally-rendered `<Dialog>`. State plainly that it *works* — then enumerate the four things it can't do, because the modal lives in component state, not the URL:
- **Not shareable / deep-linkable** — paste the link, you land on the feed with no modal.
- **Refresh closes it** — state resets on reload.
- **Back button leaves the page** instead of closing the modal.
- **Cmd/Ctrl+click can't open it in a new tab** — there's no URL to open.

One tight `Code` block (TSX) showing the `useState` modal is enough; do not over-explain it (the student wrote this in Unit 4). Land the thesis: the fix is to give the modal a real URL, and Next.js ships a convention built exactly for "show details in-context but keep a real URL" — **intercepting routes**. Forward-point that we already have most of the machinery from L5 (parallel routes); today adds one folder prefix.

`Term` candidates in this section: **deep link** (a URL that reproduces a specific in-app view).

### Section 2 — Two ways to arrive at the same URL

Teach the conceptual core *before* any folder syntax: one URL, two render paths, chosen by **how the user got there**. This reuses the L4/L5 vocabulary, so re-anchor it with one-line reminders (`Term`), then make it the spine of the whole pattern.

- **Soft navigation** (`Term`, remind from L4): an in-app `<Link>` click or `router.push` — client-side, no document reload, surrounding layout stays mounted. This is the path interception fires on.
- **Hard navigation** (`Term`): a full document load — pasting the URL, refresh, Cmd+click into a new tab, an external inbound link. Interception does **not** fire; the browser resolves the URL from scratch.

State the rule the rest of the lesson hangs on: an intercepting route is the **soft-navigation** render path; the **hard-navigation** path always renders the real, standalone page. So every intercepting route is **paired** with a non-intercepting sibling — one file per path. Forgetting the sibling is the single most common interception bug; name it here and again in §3.

**Diagram D1 — the dual render path (primary diagram of the lesson).** Use `TabbedContent` with two tabs, each an HTML/CSS mock of a small browser window (chrome + URL bar + rendered result), captioned with the file that produced it:
- Tab **"Soft nav — clicked a photo in the feed"**: URL bar reads `/feed/photo/42`; the mock shows the *feed* still visible behind a centered modal card. Caption: rendered by the **intercepter** `@modal/(.)photo/[id]/page.tsx`, over the still-mounted feed.
- Tab **"Hard nav — refresh / shared link / Cmd+click"**: the URL is `/photo/42` (the real route's own URL; on soft nav the same content is *masked* under `/photo/42` while the feed stays beneath — keep the URL story consistent with the §4 tree), and the mock shows a **full standalone photo page**, no feed behind it. Caption: rendered by the real page `app/photo/[id]/page.tsx`; `@modal` has no match so its `default.tsx` (empty) renders nothing.

(Note on URL masking, verified against Next.js 16 docs: on soft navigation the intercepter renders the modal while the browser URL is *masked* to the photo's real URL `/photo/42` — so the address bar shows a shareable URL even though the feed is still mounted underneath. Keep this accurate; the URL the user sees on soft nav is the real route's URL, which is exactly what makes it shareable.)

Pedagogical goal: make "same URL, two outcomes, decided by navigation kind" visible and memorable in one glance — this is the concept students most often miss. Put this diagram early so every later code sample is read against it. (Author's note for the diagram agent: do **not** use `RequestTrace` — it models the render pipeline, not navigation branching. A simple two-tab UI mock is the right tool.)

### Section 3 — `(.)folder`: the intercepting prefix

Now introduce the syntax, anchored to the §2 model. A folder whose name is prefixed with an interception marker says: "intercept soft navigations to *this* URL and render *me* in place." The marker encodes **how far up the URL tree** the intercepted segment lives, relative to the intercepter's own folder.

Present the four prefixes as a short table (use a `Code`-style table or prose list, not a heavy component):
- `(.)folder` — intercept a route at the **same** URL level.
- `(..)folder` — one URL level **up**.
- `(..)(..)folder` — two levels up.
- `(...)folder` — from the **root** `app/` directory.

**The load-bearing gotcha — state it loudly (verified against Next.js 16 docs):** the count is **URL-segment-relative, not file-system-relative**. Folders that add no URL segment are **not** counted: `@slot` parallel folders and route groups `(folder)` both contribute zero segments. The `@slot` case is the one that decides the prefix in *this* lesson's pattern — the intercepter lives inside the feed's `@modal` slot, yet `@modal` is invisible to the count, so the `photo` route sits **one URL segment up** even though it's **two file-system levels up**. That is why the canonical example uses **`(..)photo`**, not `(...)`. Make this the centerpiece of the gotcha; it is the single most counterintuitive point in the lesson. Route groups being skipped is the same rule's secondary instance — mention it as "and the same goes for `(folder)` groups."

**Diagram D2 — prefix arithmetic on the URL (file-system levels vs URL levels).** An HTML+CSS annotated illustration inside `<Figure>`. Show **two parallel strips**: the **file-system path** of the intercepter on top (`app` · `feed` · `@modal` · `(..)photo` · `[id]`) and the **URL** it intercepts below (`/` · `feed` · `photo` · `42`), with the `@modal` folder visibly *dropping out* between the two strips (greyed / struck / with a "0 segments" tag) so the eye sees the file-system level and the URL level diverge. Annotate that `(..)` counts **URL** levels (one up = `feed`), landing on the `photo` route, not file-system levels (which would be two). Pedagogical goal: make "two file-system levels up = one URL segment up, because `@modal` doesn't count" a *spatial* fact, not a memorized rule. Keep it horizontal and short (laptop-viewport rule). Prefer color-matched chips (URL-level ↔ prefix) over arrows — the relationship is pure correspondence, and arrows would cross the strips.

State the concrete prefix the worked example uses (`(..)photo`) and recount the segments out loud against D2 wherever the file tree appears (§4) so the prefix is identical across §3, §4, and §5. (Author's note, now confirmed by the official docs: real route at top-level `app/photo/[id]`, intercepter at `app/feed/@modal/(..)photo/[id]` — `@modal` is skipped, hence `(..)`. Keep this geometry; do not switch to `(.)` or `(...)`.)

`Term` candidates: **route group** (one-line reminder from L2: a `(folder)` that organizes routes but adds no URL segment) — relevant here as the *secondary* example of the skipped-in-the-count rule.

### Section 4 — Wiring the modal: the `@modal` slot, the intercepter, and the real page

The full pattern, assembled from parts the student already has. This is the heart of the lesson. Build it as a file tree first, then the code for each file, emphasizing the **one** genuinely new idea in the code: the intercepter and the real page **share a content component** and differ only in their wrapper.

**Diagram D3 — the canonical file tree (verified geometry).** A `<FileTree>` with annotated comments mapping each file to its §2 path. The committed shape:
- `app/feed/page.tsx` — the feed (the `children` slot of the feed layout).
- `app/feed/layout.tsx` — receives the `@modal` slot as a prop beside `children` (L5 machinery).
- `app/feed/@modal/default.tsx` — `return null` (closed-modal fallback on hard nav).
- `app/feed/@modal/(..)photo/[id]/page.tsx` — the **intercepter**; `(..)` because `@modal` is not a URL segment (see §3 / D2). Renders `<Modal><PhotoDetail/></Modal>`.
- `app/photo/[id]/page.tsx` — the **real, standalone route** (hard-nav target). Renders `<PhotoDetail/>` full-page.
- `app/_components/photo-detail.tsx` (or co-located) — the **shared** content component both pages import.

Annotate each row: which renders on soft nav, which on hard nav, which is the closed-modal fallback. Pedagogical goal: anchor the abstract pattern in concrete files before showing code. Keep this tree byte-for-byte consistent with the prefix in §3/§5.

**Code — the shared component across two wrappers.** Use `CodeVariants` with two tabs to make the "same content, different chrome" point visually:
- Tab **"Modal (intercepted)"**: the intercepter `page.tsx` — a Server Component that awaits `params`, validates, and renders `<Modal><PhotoDetail id={id} /></Modal>`.
- Tab **"Full page (direct)"**: the real `app/photo/[id]/page.tsx` — same capture→validate→query, renders `<PhotoDetail id={id} />` with page chrome and **no** `<Modal>` wrapper.

First sentence of each tab's prose carries the contrast ("rendered on soft nav, wraps the detail in a dialog" vs "rendered on hard nav, full standalone page"). Reinforce: both `import` the **same** `<PhotoDetail>` — write the detail once, present it two ways. This reuses L3's capture→validate→query reflex (`PageProps<'/route'>`, `await params`, `safeParse`, `notFound()` on miss) — keep that machinery but don't re-teach it; cite L3.

**Code — the empty slot fallback.** One tiny `Code` block: `@modal/default.tsx` exporting `export default function Default() { return null }`. Tie it straight back to L5: on hard navigation the `@modal` slot has no match, so without `default.tsx` the **whole route** 404s; `return null` means "closed modal, render nothing." This is the same `default.tsx` muscle-memory L5 drilled — name the continuity.

**Code — the `<Modal>` wrapper (Client Component).** Use `AnnotatedCode` to walk the small client component built on Chapter 027's shadcn `<Dialog>`. Keep it thin — Ch 027 owns the Dialog mechanics (focus trap, Esc-to-close, return-focus); cite it and do **not** re-teach a11y here. Annotate the load-bearing lines:
- `'use client'` at the top (it uses a hook and an event handler).
- The dialog rendered **open by default** (`open` defaults to `true` / `defaultOpen`) — because reaching this route *is* the "open" signal.
- `onOpenChange` → call `router.back()` when the dialog requests close. **This is the key insight: closing the modal is navigation, not a state toggle.** Closing pops the URL back to `/feed`, `@modal` loses its match, the modal unmounts. Back/forward, Esc (via Radix), and the close button all funnel through the same navigation.
- `useRouter` imported from `next/navigation` (remind from L4: not `next/router`).

Land the closing-is-navigation idea explicitly in prose under the annotation — it's the conceptual counterpart to "opening is navigation" and explains *why* browser back closes the modal for free.

`Term` candidates: **parallel route / slot** (one-line reminder from L5) if not already fresh.

### Section 5 — When intercepting routes earn their weight

The senior-judgment section. Intercepting routes are a power tool with real cost (two render paths, an extra route, a slot) — name the threshold that justifies them and the cases where a plain dialog is still right.

**Reach for an intercepting-route modal when** the UI is "show details / edit in context without leaving the list," **and** that detail view deserves a real URL — i.e. it should be shareable, deep-linkable, refreshable, and survive back/forward. Map the photo feed onto the **SaaS reach** here (this is where the through-line connects): an invoice row that opens an invoice-detail modal at `/invoices/42`; a message that opens a thread; an in-context "edit settings" modal you can link a teammate to. State the recurring senior reflex this builds: *when a piece of UI deserves a URL, give it one.*

**Don't reach for it when** the dialog is ephemeral and app-internal with no sharing/deep-link value — a confirm-delete prompt, a transient command palette, a form-validation popover. Those stay a plain `useState` + `<Dialog>` (the §1 pattern), which is correct, not a workaround. Name once, without building, the **other** URL-driven modal pattern — a `searchParams`-keyed dialog (`?modal=invite`) — as the lighter alternative when you want URL persistence but not a whole intercepted route; defer the full `searchParams` story to Ch 033.

Optionally close with a `StateMachineWalker` (`kind="decision"`) as the decision aid — "Does this modal need a URL? → no: plain `<Dialog>`; yes, and it's a detail/edit of a list item: intercepting route + `@modal`; yes, but it's a lightweight toggle: `searchParams` dialog (Ch 033)." Keep it to ~3 questions / 3 leaves. This is optional; the prose decision criteria above are the floor.

**Exercises (place in this section or §3/§4 as fitted):**
- **MultipleChoice (primary check, the dual-path model):** present the §4 file tree, then a navigation ("a user pastes `/photo/42` into a fresh tab" / "a user clicks a photo from `/feed`") and ask **which file renders**. Two questions (one soft, one hard) cover the core skill. This tests THIS lesson's new content directly. The hard-nav question's wrong answers should include "the intercepter" and "a 404" so the value of the non-intercepting sibling and `default.tsx` is reinforced.
- **Matching (prefix arithmetic):** left column `(.)` / `(..)` / `(..)(..)` / `(...)`; right column "same URL level" / "one level up" / "two levels up" / "from app root." Pure correspondence — `Matching` fits.
- **MultipleChoice (the URL-relative gotcha):** a file path containing a `(group)` route-group folder; ask which prefix intercepts a target one *URL* segment up. Correct answer requires *not* counting the group folder. This is the highest-value trap in the lesson — worth its own question.

Do **not** add a `Sequence` "what happens on refresh" drill — it would overlap L5's hard-nav resolution ordering drill; keep the checks on interception-specific content.

### Section 6 (closing, brief) — What you can now reach for, and what comes next

One short paragraph. Recap the muscle memory: intercepter = soft-nav render override; always ship its non-intercepting sibling (the real page) and the empty `@modal/default.tsx`; closing the modal is `router.back()`. Restate the durable senior reflex — *URL-backed UI for anything worth sharing or deep-linking* — which recurs in every later SaaS list/detail surface. Forward-point: Chapter 035 wires this exact pattern into the list-plus-detail project with real data and Server Actions; Chapter 031 adds `loading.tsx` / `error.tsx` at the slot boundary; Chapter 027 (already taught) owns the Dialog's focus and Esc behavior the `<Modal>` leans on.

**Optional `VideoCallout`:** a short, recent explainer of the URL-backed-modal pattern *if* the resourcer surfaces a high-quality one — not load-bearing, the diagrams carry the concept. Do not force a search against quota for it.

**Optional `ExternalResource` / LinkCard:** the Next.js docs pages for Intercepting Routes and Parallel Routes.

---

## Scope

**This lesson teaches:** the four intercepting prefixes (`(.)`, `(..)`, `(..)(..)`, `(...)`) and that they are URL-segment-relative (route groups skipped); the always-paired non-intercepting sibling and its soft-vs-hard-navigation rationale; the combined parallel-route + interception pattern for a URL-backed modal (intercepter inside `@modal`, empty `default.tsx`, shared content component, `router.back()` to close); the senior judgment of when a modal deserves a URL.

**Reused (remind in one line, do not re-teach):**
- Soft vs hard navigation, `<Link>`, `useRouter().push/back`, `next/navigation` import — L4.
- Parallel routes / `@slot` as a named layout prop, each slot an independent route tree, `default.tsx` as the hard-navigation fallback — L5.
- `[id]` dynamic segment, `await params`, `PageProps<'/route'>`, capture→validate→query with `safeParse` + `notFound()` — L3.
- Route groups `(folder)` contribute no URL segment — L2 (relevant here only because they're skipped in prefix counting).

**Explicitly out of scope (cite the owner, do not teach):**
- Dialog mechanics — focus trap, Esc-to-close, return-focus, `DialogTrigger`/`asChild` composition, icon-button labels — **Chapter 027** (the `<Modal>` wrapper *uses* shadcn's `<Dialog>`; treat it as a known component).
- `loading.tsx`, `error.tsx`, `not-found.tsx` at the slot/route level — **Chapter 031**.
- The real data layer, `getPhoto`/`getInvoice`, Server Actions, and the fully-wired list-plus-detail build — **Chapter 035** (the project) / Unit 5. Content components and queries here are thin placeholders.
- `searchParams` / URL-as-state and the `?modal=` dialog alternative — **Chapter 033** (named once as the lighter alternative, not built).
- Modal open/close animations and View Transitions — **Chapter 021.5**.
- Parallel-routes mechanics themselves (the `@slot`→prop model, independent streaming) — **L5** (reused, not re-derived).

---

## Code-convention notes for downstream agents

- Paths use `src/app/…` (course starter uses `src/` + Biome). Framework-named files `page.tsx` / `layout.tsx` / `default.tsx` are the **sanctioned default exports**; every other component (`<PhotoDetail>`, `<Modal>`) is a **named export** in a **kebab-case** file (`photo-detail.tsx`, `modal.tsx`).
- The intercepter and the real page are both `export default async function`, awaiting `params`, typed with the generated `PageProps<'/route'>` — keep the L3 reflex; don't hand-write the Promise annotation.
- `<Modal>` is a Client Component (`'use client'` at the top); `<PhotoDetail>` is a Server Component (default). Client composes server via `children` — pass `<PhotoDetail>` as a child of `<Modal>`, never make `<Modal>` import `<PhotoDetail>` directly if it would force the detail client-side (the intercepter page composes both: it renders `<Modal>` and passes `<PhotoDetail>` as the child).
- `default.tsx` returns `null` (the closed-modal floor); name it the same `default.tsx` discipline from L5.
- Import `useRouter` from `next/navigation`. No barrel files. Import groups external → `@/` → relative.
- The `<PhotoDetail>` query and any `getPhoto` are intentional thin placeholders (data layer is Ch 035 / Unit 5) — mark with a brief `// TODO(Ch 035)`-style comment, do not flesh out.
- Validate `params` with `safeParse` (never `parse`) and bail with `notFound()` on miss; never `try/catch` the throwing `notFound()` (L3/L4 discipline).

## Fact-check status (verified 2026-06 against Next.js 16 docs)

Confirmed against the official **Next.js 16** Intercepting Routes + Parallel Routes docs (last updated 2025-06; doc version 16.2.7):
- Prefixes `(.)` (same level) / `(..)` (one up) / `(..)(..)` (two up) / `(...)` (root `app`) — exact match.
- "Based on **route segments, not the file-system**; does **not** consider `@slot` folders" — confirmed; this is why the example uses **`(..)photo`** ("one segment level higher despite being two file-system levels higher"). Geometry committed in §3/§4 matches the docs verbatim.
- `@modal/default.tsx` returning `null` as the closed-modal fallback — confirmed.
- Dual path (soft nav → modal with **masked URL** = the real route's URL; hard nav / refresh / share → full page) — confirmed; URL-masking note added to §2.
- Docs explicitly list the deep-link / refresh-preservation / back-closes / forward-reopens benefits the lesson sells in §1 and §5 — aligned.

Still to confirm by the writing agent when building the `<Modal>`:
- That shadcn `<Dialog>` `onOpenChange` → `router.back()` + default-open is the current idiom; cross-check Ch 027's committed `<Dialog>` component shape.
- (Sanity, already reasoned) `RequestTrace` has no interception/navigation phase — keep the dual path on `TabbedContent`, not `RequestTrace`.
