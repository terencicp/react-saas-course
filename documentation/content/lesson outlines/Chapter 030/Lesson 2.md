# Lesson outline — Chapter 030, Lesson 2

- **Title:** Client Components and pushing the boundary down
- **Sidebar label:** Client Components

---

## Lesson framing

This is L2 of a 5-lesson chapter on the server/client boundary, immediately after L1 ("Server Components as the default").
L1 did a lot of L2's groundwork already, so the single most important authoring constraint is **do not re-teach L1**.
L1 already established: the boundary geography (the `ServerBrowserSplit` diagram is the chapter's spine image), the invoice domain, data-layer stubs (`getInvoice(id)`, `listInvoices()`), `PageProps<'/route'>`, the three composition moves (Server imports Client ✓, Client imports Server ✗ build error, Client receives Server via `children` ✓under the slogan "wrap, don't import"), the can't-list (no state/effects/handlers/browser globals/Context), and the one-sentence fact that **every component — Client ones included — runs on the server first and only Client ones wake up at hydrate** (shown via a `RequestTrace`).

So L2 is not "here is what a Client Component is" from scratch.
L2's four genuinely-new jobs, in order:

1. **The two-render model in depth.** L1 *named* "runs on server first, wakes at hydrate" in one sentence and a trace. L2 owns the actual model: render-on-server-to-HTML, ship HTML, then hydrate-in-browser-to-attach-listeners, and the consequence that **both renders must agree** (planting hydration as a contract, full failure modes owed to L5). This is the conceptual core.
2. **What earns `"use client"` — the decision.** A crisp two-list rubric (state / effects / refs-to-DOM / handlers / browser APIs / Context / interactive third-party libs EARN it; data fetching / markdown / heavy static / env reads / URL-on-server DO NOT). This is the lesson's most practically useful takeaway — the student should leave able to look at a feature and decide.
3. **Pushing the boundary down — the senior reflex.** "Server tree wide, Client leaves narrow" was *planted* in L1 and is *owned here*. Frame it as a cost decision: every `"use client"` boundary is JavaScript the user downloads. Teach the refactor move (lift the directive off the page, push it onto the smallest interactive leaf) and the real-stakes diagnostic (`next build` per-route JS, `@next/bundle-analyzer` named as the forward tool → Ch 094 L4).
4. **The "is this file Server or Client?" reading reflex.** A senior reads a file by checking the directive header + how it's imported. Train this as a habit, because the directive marks a *transitive subgraph*, not a per-component flag — a file with no directive is still Client if it's imported from a `"use client"` file.

`"use client"` is *oriented* here (where it goes, that it pulls its import subtree into the client) but **not fully specified** — first-non-comment-line rules, typo-fails-silently, `"use server"`, no-op-when-already-crossed, and `server-only`/`client-only` are all L3. L2 says just enough about the directive to teach the boundary; it explicitly hands the mechanics forward.

Teaching stance per the guidelines: lead with the senior decision (when is the browser worth its cost?), not syntax. The student already writes `'use client'` since Ch 029; the value L2 adds is *judgment about where the boundary goes*, not the keystroke. Keep the invoice domain and L1's vocabulary. Cognitive-load order: re-anchor on the boundary (cheap recall) → two-render model (the mechanism) → the earns-it rubric (apply the mechanism) → push-it-down + cost (the senior move) → reading reflex (the durable habit) → recap. Each section builds on the previous; no section assumes anything L5 owns.

Iframe constraint inherited from Ch 029 and reaffirmed in L1's continuity notes: **no live App-Router coding exercise** (App Router can't run in the in-browser iframe runtimes). Checks are recognition/classification (`Buckets`, `Dropdowns`, `Tokens`) plus the `RequestTrace` simulation and a custom boundary-refactor visual. Do not author a `ReactCoding`/Sandpack exercise that pretends to run a Next.js server.

Markup ships as `{/* TODO START: "Component" (slug) */}` … `{/* TODO END */}` blocks describing each code sample/figure/exercise for the downstream agent, matching L1's house style — author the outline-level intent, not always literal final code, except where exact code is load-bearing (then give it).

---

## Lesson sections

### Introduction (no header)

Open on the senior question, framed as a cost decision the student now faces *because* L1 made Server the default.
Concrete hook: the invoice page from L1 is all-server and ships zero JS — great — but now the product needs a "Mark as paid" button, a status filter, a date picker.
Those need the browser. The naive instinct is to slap `'use client'` at the top of the page to "make it interactive." Name that this works and is also the single most common junior mistake in an App Router codebase: it drags the entire page — list, rows, the heavy formatting deps — into the browser bundle to light up one button.

State the lesson's promise: by the end, the student can (1) explain what actually happens when a Client Component loads (the two renders), (2) decide on sight whether a given feature earns `"use client"`, and (3) draw the boundary at the smallest leaf so they pay for interactivity in bytes, not by accident.
Connect explicitly back to L1: "L1 gave you the default and the can't-list; this lesson is about the opt-in — what it costs and where to put it." Warm, brief, terse-adult tone (no bootcamp scaffolding).

Components: prose only. Optionally one tiny `Code` block showing the tempting-but-wrong `'use client'` at the top of `page.tsx` to make the hook concrete (mark clearly as "the tempting move", not course-standard) — but keep it to ~3 lines; the real before/after refactor lands in the "push it down" section, so don't pre-empt it here.

---

### What "interactive" costs: the two-render model

**Goal:** own the mechanism L1 only named. The student must end with the mental model: a Client Component renders **twice** — once on the server (to HTML, for instant first paint) and once in the browser (to attach interactivity) — and the price of that is that **both renders must produce the same output**.

Content / how to convey:
- Re-anchor in one sentence on L1's fact ("recall: even Client Components run on the server first") so this reads as a zoom-in, not a new topic. Don't re-explain it.
- Define a Client Component precisely *for this lesson's purpose*: a component whose code **ships to the browser** and which therefore runs in **both** places. Contrast crisply with a Server Component (code stays on server, runs once). Keep this to the delta vs L1 — the new word is "ships to the browser / runs twice", not "what a component is".
- Walk the two renders as a sequence:
  1. **Server render →** the Client Component runs on the server, produces HTML. User sees content immediately, before any JS arrives. (This is *why* SSR exists: no blank page.)
  2. **Ship →** HTML arrives and paints; the component's JavaScript downloads in parallel.
  3. **Hydrate →** React runs the *same* component again in the browser, walks the already-present HTML, and attaches event listeners / state so it becomes interactive. Define <Term> "hydration" here as "the browser-side second render that brings server HTML to life," and immediately point forward: the *failure modes* of this handshake (and how to fix them) are L5 — here we only need the shape.
- The load-bearing consequence, stated as the contract: **the second render must match the first.** If the server said one thing and the browser renders another, React can't reconcile and you get a hydration error. Plant this as "the price of getting instant HTML *and* interactivity" — don't enumerate causes (L5). One sentence is enough: "anything that differs between server and browser — a random number, the current time, a `window` read — breaks the match; that's L5's whole subject."
- Tie back to the cost thesis: this two-render machinery, plus the component's own code and React's client runtime, is **what `"use client"` buys with bundle bytes.** Server Components have none of it. This sentence is the bridge to the "push it down" section.

Components:
- **`DiagramSequence`** (preferred) OR a `RequestTrace` reuse — pick `DiagramSequence` here so it stays distinct from L1's `RequestTrace` and can show the *two renders of the same component* as the focus (L1's trace showed *where each node runs across a tree*; this one zooms into one Client leaf's lifecycle). Three-or-four-step scrub: (1) server render → leaf becomes HTML; (2) HTML paints in browser, "not yet interactive" badge, JS downloading; (3) hydrate → listeners attach, "interactive" badge; (4 optional) click works. Pedagogical goal: make "runs twice, same output both times" *visible and temporal*, so the hydration contract feels inevitable rather than arbitrary. Wrap in `<Figure>` with a one-line caption. If the author judges `RequestTrace` (phases `request,server-render,wire,hydrate`, single client leaf, no `WireProp`) communicates this more cheaply and with less new-component cost, that's an acceptable substitute — but it risks reading as a near-duplicate of L1's trace, so `DiagramSequence` is the recommendation.
- `Term` on **hydration**.

---

### What earns `"use client"` — and what doesn't

**Goal:** the lesson's most reusable takeaway. Give the student a crisp decision rubric so they stop reaching for `'use client'` reflexively. This is the "trigger before tool" section — name the threshold that flips a component to the client.

Content / how to convey:
- Frame as a single question the student asks of any component: **"does this need to be alive in the browser?"** If yes → Client; if no → leave it Server (the default). Everything below is that question, itemized.
- **Earns it** (each with the one-line *why*, mirroring L1's can't-list reasoning so it feels continuous):
  - `useState` / `useReducer` — state has to live in a mounted instance in the browser.
  - `useEffect` / `useLayoutEffect` — there's no "after render in the browser" without the browser.
  - a `ref` to a DOM node — you need the real node, which only exists client-side.
  - event handlers (`onClick`, `onChange`, `onSubmit`) — attaching a listener is browser JS.
  - browser APIs (`window`, `localStorage`, `navigator`, `IntersectionObserver`).
  - **Context** — a `createContext` provider *and* its consumers are client-bound (call this out specifically; it's the one beginners forget, and L1 listed "no Context" on the server side — here's the other half: the provider file needs `"use client"`). Full provider-placement pattern is a later concern; here just "the provider lives in a `"use client"` file."
  - **third-party components that use any of the above internally** — a carousel, a charting lib, an animation lib. Even if *your* usage looks declarative, if the library reaches for state/effects/`window`, it needs the client. Sub-point: some older libraries don't ship their own `"use client"` and need a thin wrapper file — name this exists, defer the mechanics (it leans on directive semantics → L3).
- **Does NOT earn it** (this list is the one that corrects the junior instinct — give it equal weight):
  - **async data fetching** — do it in a Server Component body (`await` in render, per L1). The #1 false trigger: "I need data, so I need client." No.
  - rendering markdown / code blocks / large static content — Server, and you get the zero-bundle win from L1.
  - reading environment variables / secrets — Server (recall L1's "secrets live on the server").
  - reading the URL on the server-rendered path — Server, via `params` / `searchParams` (recall `PageProps` from Ch 029 / L1).
- Senior reframe to close: most of a page does NOT earn it. The earns-it list is short and specific; when in doubt, default Server.

Components:
- **`Buckets`** (`twoCol`), the section's payoff check, mirroring L1's structure (L1 used a server-vs-client Buckets for *capabilities*; this one sorts *features/triggers* into "Earns `"use client"`" vs "Stays a Server Component" — distinct framing, not a repeat). `instructions`: "Decide which of these force a component into the browser." Items must include the tempting false-positives (an `await db.query`, "render a 50-paragraph markdown doc", "read `searchParams`") in the Server bucket and the genuine triggers (a `useState` toggle, an `onClick`, a Context provider, "a third-party date picker") in the Client bucket. Use inline-code chips for code-shaped items, prose for descriptive ones — match L1's chip style.
- A short `Code` block per list is optional; prefer prose + the Buckets check over many tiny snippets here (the rubric is verbal, not syntactic). One small illustrative snippet showing a Context provider file headed with `'use client'` is worth including, since "provider must be client" is the non-obvious item.
- `Term` candidates: **hydration** already defined; consider `Term` on **provider** if not assumed known (Context was named in L1 but provider placement is new emphasis) — keep it short.

---

### Pushing the boundary down

**Goal:** own the senior reflex L1 planted ("server tree wide, client leaves narrow"). Convert the two-render *cost* into an actionable refactor habit: flip to Client at the **smallest leaf**, not the whole page.

Content / how to convey:
- State the reflex as a rule: **default Server; opt into Client at the smallest leaf that needs interactivity.** Everything above that leaf stays Server and ships nothing.
- The canonical worked example (this is the lesson's centerpiece refactor): an invoice page rendering a list of invoices, each row with a "Mark as paid" button.
  - **Before:** `'use client'` at the top of the *page*. Now the page, the list, every row, and every dependency they import all ship to the browser — to power one button per row. Name the chain of damage: you also lost the `async` body (Client Components can't be async — recall L1 / this is a hard rule), so you've had to drag data fetching back into a `useEffect`, undoing L1's whole win.
  - **After:** the page, list, and row stay Server Components (async data fetch intact); only `<MarkPaidButton />` is a Client Component. The *only* JavaScript that ships is that button and its dependencies.
  - Drive home: same UI, same interactivity, a fraction of the client JS. The boundary moved *down* the tree.
- Connect to "wrap, don't import" from L1 (do **not** re-teach it): the reason you *can* keep the page server while a client shell wraps server content is L1's `children` move. One sentence + pointer; this lesson reuses the tool, L1 owns it. The new idea here is *direction of effort* — actively pushing the directive downward — not the composition mechanic.
- **The cost ledger (real production stakes).** Make the abstract concrete:
  - Every `"use client"` boundary adds to the client bundle: the file's code + its transitive dependencies + React's client runtime (if not already loaded).
  - The diagnostic a senior actually runs: **FACT-CHECKED, IMPORTANT — Next.js 16 removed the `size` / `First Load JS` columns from the `next build` terminal output** (they were inaccurate for RSC architectures; the framework's own note says Turbopack and Webpack disagreed on how to count Client Component payload). **Do NOT tell the student to read per-route JS from `next build`.** The current measurement path is `@next/bundle-analyzer`'s treemap (run with `ANALYZE=true next build`, then open the generated `client.html`). Name `@next/bundle-analyzer` as the tool and point forward to **Ch 094 L4** ("reading the bundle treemap") for how to read it — do not teach the treemap here, just establish that the boundary decision is *measurable* and gets verified before merge. May also name Lighthouse / real-user analytics in one clause as the runtime-side measure, since that is what the framework now points at for route weight.
  - The senior habit one-liner: check the bundle impact (via the analyzer) before merging anything that adds a Client Component.
- Watch-out to fold in here (not its own section): a narrow boundary protects *bundle size*, but you also keep props narrow for *security* (secrets-in-props leak, L1's caution) and *wire size* (large props are still bytes on the wire — full wire story is L4). One sentence linking "narrow on JS" to "narrow on data" so the student carries both; defer depth to L4. (Optional, ≤1 clause: Next.js ships a `taint` API that can flag a server value so passing it to a Client Component throws — name it exists as the framework's backstop for the secrets leak, defer mechanics to the security chapter; do not teach it here.)

Components:
- **`CodeVariants`** — the before/after refactor, two tabs ("Boundary at the page" / "Boundary at the leaf"), reusing L1's `del=`/`ins=` convention. Tab 1 (`page.tsx` with `'use client'` + a `useEffect` fetch, the whole page client) marked to show the damage; tab 2 (server `page.tsx` with `await` data + a single imported `<MarkPaidButton />` client leaf, plus the tiny `mark-paid-button.tsx` with `'use client'`). This A/B is the single highest-value artifact in the lesson — give the downstream agent exact code. Keep each tab's prose to one paragraph per the component limit.
- A **boundary-shrinking diagram** to make "the boundary moved down" spatial. Two options, author's choice:
  - **Preferred — custom Plain HTML+CSS in `<Figure>`** (a lesson-specific component at `src/components/lessons/030/2/<Name>.astro`, e.g. `BoundaryDepth.astro`): the same small component tree drawn twice side by side — left, the whole tree shaded "client" with the boundary line at the root; right, only the leaf shaded "client" with the boundary line low. The shaded area *is* the JS that ships; the visual rhetoric is "less shading = less bundle," echoing L1's `ServerBrowserSplit` asymmetry rhetoric so the chapter's visual language stays consistent. Cap height well under 800px, horizontal. Pedagogical goal: make the cost difference *visible as area*. Describe boxes + shading fully for the builder.
  - Acceptable fallback — `RenderTracking`-style tree is *not* a fit (it's about re-render counts, wrong concept); if not building custom, a simple two-panel `TabbedContent` with two `<FileTree>`/box sketches works but is weaker. Recommend the custom diagram.
- `Term` candidates: **`@next/bundle-analyzer`** is worth a short `Term` (one line: the dev tool that visualizes what's in the client bundle as a treemap). Do **not** add a `First Load JS` Term — that `next build` metric was removed in Next.js 16 (see fact-check note above).

---

### Reading a file's side at a glance

**Goal:** install the durable habit — a senior knows whether any file is Server or Client *before* reading its body, from the directive header and the import graph. This also correctly orients the student on the one directive fact L2 owns (transitive subgraph) while explicitly deferring the rest to L3.

Content / how to convey:
- The two-step read a senior runs on any file:
  1. **Does the file start with `'use client'`?** If yes → Client, and so is everything it imports.
  2. **If no directive — how is it reached?** A file with no directive is Server *only if* nothing above it in the import chain is a `"use client"` file. If it's imported (directly or transitively) from a Client Component, it's pulled into the client graph **even without its own directive.** This is the key non-obvious fact: the directive marks a *boundary/entry point* into client-land, and everything downstream of it is client too.
- State the orientation crisply and then *hand it forward*: `"use client"` is the marker for the entry into the client subgraph — it flips the file and its transitive imports. The *full* semantics (must be the first non-comment line, typos fail silently, repeated directives lower in the tree are no-ops, the `"use server"` sibling, `server-only`/`client-only` enforcement) are **L3**. L2 deliberately stops at "it marks the boundary and propagates downward." Make this forward-pointer explicit so the student isn't left thinking they've seen all of it.
- Practical payoff: this is *why* "Client imports Server" is illegal (L1's forbidden move) — importing a Server Component into a Client file would drag the server code across the boundary the directive just drew. One sentence connecting the reading reflex to L1's rule (don't re-derive the rule, just show the reflex explains it).

Components:
- **`Dropdowns`** (inline-prose mode, mirroring L1's drill style) OR **`Tokens`** — a short "is this Server or Client?" diagnostic over 3–4 mini-file scenarios. Preferred: a small set of `MultipleChoice`/`TrueFalse`-flavored picks framed as "given this file head + import, which side is it on?" Concretely, a **`Buckets`** is overused by now in the chapter — instead use **`Dropdowns`** in prose: present 3 tiny file descriptions inline ("a file with no directive, imported only from `page.tsx`" → [Server]; "a file with no directive, imported from a `'use client'` component" → [Client]; "a file starting with `'use client'`" → [Client]) with `<DropdownChoice>` per blank. This checks the transitive-graph reasoning, which is the section's whole point. Keep it to 3 blanks.
- Optionally a tiny `Code`/`FileTree` sketch showing a `'use client'` parent file importing a no-directive helper, to make "no directive but still client" concrete before the drill.

---

### Recap and what's next

**Goal:** consolidate the three takeaways and hand cleanly to L3.

Content:
- Bullet recap, tight:
  - **The two renders:** a Client Component runs on the server (HTML, instant paint) and again in the browser (hydrate, interactivity) — both must match.
  - **The rubric:** state, effects, refs, handlers, browser APIs, Context, and interactive third-party libs earn `"use client"`; data, secrets, markdown, and URL-on-server do not.
  - **The reflex:** default Server, push the boundary to the smallest interactive leaf, and read the bundle cost before merging.
- Forward pointer to **L3**: you've used `'use client'` as a boundary marker; next is the directive in full — its exact rules, its `"use server"` sibling, Architectural Principle #6 (prefer explicit over magic), and the `server-only` / `client-only` packages that turn a leaked import into a build error. (Name these so the deferrals land somewhere visible.)
- Briefly name **L4** (what actually crosses the wire — the serialization rules behind "props must be serializable") and **L5** (hydration's failure modes and fixes) as the two threads this lesson left open on purpose.

Components:
- One or two `ExternalResource` cards (reference, not a reading list), matching L1's closing pattern:
  - Next.js docs — "Server and Client Components" (same canonical page L1 cited; this lesson tracks its Client-Component half). URL to verify in fact-check: https://nextjs.org/docs/app/getting-started/server-and-client-components
  - Optionally React docs — "use client" directive reference (verify exact URL in fact-check; React documents directives under its reference section).
- **Optional `VideoCallout`** — resourcer-gated, do not invent an id. A short, current (post-Next.js-16) explainer on "where to put the use client boundary / pushing it down" would reinforce the cost reflex. Lesson must stand without it. Leave for the resourcer to fill or drop, exactly as L1 did.

---

## Scope

**This lesson does NOT cover (defer, do not teach):**

- **Full `"use client"` / `"use server"` directive semantics** — first-non-comment-line rule, silent-typo failure, no-op-when-already-crossed, the `"use server"` directive and Server Actions, bundler behavior → **L3**. L2 only orients (`"use client"` marks the boundary and propagates to transitive imports).
- **Architectural Principle #6 (prefer explicit over magic)** → **L3**.
- **`server-only` / `client-only` packages and structural build-time enforcement** → **L3**.
- **The exact serialization rules / type list at the boundary** (structured-clone + React extensions, what throws, what leaks) → **L4**. L2 may say "props must be serializable" and reuse L1's secrets-in-props caution in one sentence, no enumeration.
- **Hydration failure modes and fixes** (`Date.now`/`Math.random`/locale/timezone/browser extensions/stale `.next` cache; `useEffect`-defer, `useId`, `suppressHydrationWarning`) → **L5**. L2 teaches the two-render *contract* ("both renders must match") and names that mismatches exist; it does not list causes or fixes.
- **Suspense, `loading.tsx`, streaming, `React.use()` on a Promise prop** → **Chapter 031**. (Client Components taking Promises via `use()` is mentioned in code conventions but belongs to Ch 031's async-UI lesson; do not introduce `use()` here.)
- **`@next/bundle-analyzer` usage / reading the treemap** → **Ch 094 L4**. L2 names it as the diagnostic and stops.
- **Caching (`use cache`, `cacheLife`, `cacheTag`, fetch cache, `cache()`)** → **Chapter 032**.
- **Server Actions as the way to "pass a function" across the boundary** → **Chapter 043** (and referenced in L4). Do not introduce here.

**Prerequisites to assume taught (redefine in ≤1 sentence only if reused, do not re-teach):**

- Server Components are the App Router default; async body with `await`-in-render; the can't-list; "every component runs on the server first, Client ones wake at hydrate"; the three composition moves and "wrap, don't import"; secrets-in-props leak (caution only) — all **L1**.
- The boundary geography + the `ServerBrowserSplit` reference image — **L1** (recall it, don't redraw it).
- `PageProps<'/route'>`, `await params`, the URL-backed modal as a Client shell wrapping server `children` — **Ch 029** (referenced, not re-taught).
- JSX, `useState`/`useEffect`/event handlers as React concepts — **Unit 4 / Ch 017+** (the student knows how to write them; L2 is about *where they force the component to run*, not how to use them).

**Domain/code continuity (carry from L1):**

- Stay in the **invoices** domain. Reuse data-layer stubs `getInvoice(id)` / `listInvoices()` as thin stubs flagged `// data layer: Unit 5`.
- New interactive leaf for the worked example: `<MarkPaidButton />` (or `<InvoiceStatusFilter />`) in its own `'use client'` file — a realistic SaaS interaction, not a toy counter.
- Page props typed `PageProps<'/invoices/[id]'>` / `PageProps<'/invoices'>`; `await params` reused, not re-taught.
- Client Components must not be `async` — state this as a hard rule when it bites in the "before" refactor (the page-as-client loses its async body).

---

## Notes for downstream agents

- Maintain L1's tone: terse, adult, senior-framed, warm-but-brief intro, no celebratory bootcamp voice.
- Reuse L1's component vocabulary and conventions (`del=`/`ins=` markers, inline-code chips in `Buckets`, `<Term>` for first-use vocabulary, `{/* TODO START/END */}` blocks).
- The `CodeVariants` before/after refactor and the `BoundaryDepth` diagram are the two load-bearing artifacts — invest there.
- Do not author any exercise that claims to *run* a Next.js App Router server in-browser (iframe constraint). Checks are recognition/classification + the scrubbable trace/sequence.
- Per-file directive: when showing a Client leaf, the file starts with `'use client';` on the first line (single quotes, semicolon — match code-conventions house style).
