# Lesson 1 — Server Components as the default

**Title (h1):** Server Components as the default
**Sidebar label:** Server Components by default

---

## Lesson framing

This is the first lesson of Chapter 030 (the server/client boundary) and the conceptual hinge of Unit 4.
The student arrives from Chapter 029 already writing `app/` files — `page.tsx`, `layout.tsx`, dynamic `[id]` segments — and has been *told* twice (Ch 029 L1, L2) that these are "Server Components by default" with the meaning deferred to here.
This lesson cashes that debt.

**The senior question this lesson answers (state it implicitly in the intro, not as a heading):** every file the student has written in `app/` runs *only on the server* and ships *zero JavaScript* to the browser — why is that the default, and how does it change how they read and write a component? Until now the student's mental model of React (from Ch 017 JSX, and any prior exposure) is "components run in the browser." This lesson inverts that default. That inversion is the single most important takeaway.

**The mental model to install:** A component in `app/` is a function that runs once, on the server, during the request, and returns markup. It can `await`. It can touch the database, the filesystem, `process.env`. The browser never sees its code — only its output. Interactivity is the *exception* you opt into later, not the baseline.

**What the student should be able to do by the end:**
- Read any `app/` file and know, on sight, that it's a Server Component (absent a `"use client"` boundary above it).
- Write the canonical 2026 data-fetching page: `export default async function Page() { const data = await ... }`, with the `await` in the component body — no `useEffect`, no loader function.
- Recite the two capability lists (what a Server Component *can* do that the browser can't, and what it *can't* do that needs the client) and predict which list a given line of code lands in.
- Compose a Server Component with a Client Component in both legal directions: Server imports-and-renders Client (fine), Client receives Server via `children` (the pattern), and recognize that Client *importing* Server is the one move that's illegal.

**Pedagogical strategy (minimize cognitive load):**
1. **Lead with the inversion, motivated by a concrete pain.** Open on the thing the student already knows is clumsy: fetching data in plain React means `useState` + `useEffect` + a loading flag + a fetch-in-the-browser round trip that exposes the API. Show that the App Router deletes all of it. The "trigger before tool" framing from the pedagogical guidelines: name the pain the default relieves *before* defining the term.
2. **Two-environment framing is the spine.** Every capability the student learns gets filed under "this runs on the server" or "this needs the browser." Build one durable two-column visual early and refer back to it. Keep the *full* server→client wire mechanics (RSC payload internals, serialization, hydration) named-once and explicitly deferred — they own L4 and L5. This lesson is about *where code runs and what that lets it do*, not *how bytes cross*.
3. **Stage the complexity.** Start with "a Server Component is just the JSX you already write, it happens to run on the server." Add async. Add direct data access. *Then* add the can't-do list. *Then* add composition. Never front-load the constraints.
4. **The senior thread runs throughout:** keep the Server tree wide, the Client leaves narrow (named here, owned in full by L2/L3 — do not over-teach the boundary-pushing reflex, just plant it). And: secrets are safe *in* a Server Component but leak the instant they're passed as props to a Client Component — plant this as a watch-out, full treatment in L4.
5. **Honor the iframe constraint from Ch 029.** The App Router does **not** run in the in-browser React iframe (`ReactCoding`/Sandpack render React, not Next's server). So **no live App-Router coding exercise** — the continuity notes flag this for L3–L6 of Ch 029 and it holds here. Checks are recognition/classification (`Buckets`, `MultipleChoice`, `Dropdowns`) plus the purpose-built `RequestTrace` figure, which *simulates* the model correctly by construction.

**Continuity to honor (from Ch 029 notes):**
- Paths are `src/app/...` (course starter uses `src/` + Biome), not bare `app/`.
- `page.tsx`/`layout.tsx` are the sanctioned default exports; every other component is a **named** export in a **kebab-case** file.
- Through-line domain: **invoices in a multi-tenant SaaS**. Reuse it. `getInvoice`/`listInvoices` are the established verb-led data-layer names (data layer itself is Unit 5 — keep query bodies as thin, honest stubs or `await db...` one-liners, flagged).
- `PageProps<'/route'>` is the established way to type page props (Ch 029 L3). When a page in this lesson reads `params`, use it; don't hand-write the Promise annotation.
- Already taught and reusable: `await params` is a Promise (Ch 029 L3); `notFound()`/`redirect()` throw (Ch 029 L4); co-location Principle #1 (Ch 029 L1); the "framework fills `children`, you receive them" framing (Ch 029 L2) — this lesson extends it to "the framework decides *where* your component runs."

---

## Lesson sections

### Introduction (no heading — lesson intro prose)

Open on the data-fetching pain the student already feels. Show, in a few lines of plain React, the old browser-side dance: a component that needs invoice data has to declare `useState`, kick off a `fetch` inside `useEffect`, juggle a loading flag, and re-render when the data lands — and that `fetch` runs in the *browser*, so the API endpoint and any auth header are exposed, and the user stares at a spinner while a second round trip happens after the page already loaded.

Then the pivot: in the App Router, the component that needs invoice data just… asks for it.

```tsx
export default async function InvoicesPage() {
  const invoices = await listInvoices();
  return <InvoiceTable invoices={invoices} />;
}
```

No state, no effect, no spinner-by-default, no exposed endpoint. State the why in one sentence — this component runs on the server, so it can `await` the database directly and the browser only ever receives the finished HTML — and promise the lesson will make that sentence fully load-bearing. Keep it warm and brief (pedagogical guidelines §3). Connect explicitly to what they know: "You've been writing these files since Chapter 29 and we kept calling them Server Components by default. Here's what that actually means."

Use a `Code` block (simple, single file) for the snippet. `listInvoices` is a stub from the established data layer — a one-line comment can flag it (`// data layer: Unit 5`).

---

### A component that runs on the server, not in the browser

**Goal:** install the inverted default and the two-environment mental model. This is the load-bearing section.

Content:
- Name it plainly: **every component under `app/` is a React Server Component by default.** No directive, no opt-in, no import. The student has already been writing them.
- Contrast the two environments concretely. A traditional React component is JavaScript that ships to the browser and runs there. A Server Component is JavaScript that runs *on the server during the request* and never ships to the browser — the browser receives the *output* (HTML now, the precise wire format in L4), not the code.
- The consequence chain, stated simply: runs on the server → has access to everything a server has (DB, filesystem, secrets) → ships no JavaScript for itself → cannot do anything that requires a browser (no state that survives, no clicks, no `window`).
- Reframe the Ch 029 "the framework fills `children`" line: the framework also decides *where each component runs*. The student writes the same JSX; the framework places it on the server unless told otherwise. This is Architectural Principle territory but the explicit-boundary principle (#6) is L3's — here just establish that the default is server and it's automatic.
- Make the "zero JS" claim vivid: the dependency a Server Component imports (a markdown parser, a date library, a syntax highlighter) runs on the server and adds **nothing** to the bundle the user downloads. This is the payoff the student should feel.

**Visual — the two-environment split (build this, it's the spine of the lesson).**
A simple **HTML+CSS** diagram (per diagrams INDEX: "color-coded segments / layout concepts rendered with real CSS" → Plain HTML+CSS), wrapped in `<Figure>`. Two labeled columns/zones: **Server** (left) and **Browser** (right), a vertical divider between them = "the boundary." In the Server zone: "Server Component — runs here, once, per request" with bullet chips: `await db`, `process.env`, `fs`, "ships 0 KB JS." In the Browser zone: a smaller chip "receives output only." The pedagogical goal: a single picture the student can recall that anchors *every* later capability to a side. Keep it horizontal and short (vertical-space constraint). This same Server/Browser geography is reused mentally for the whole chapter.

Do **not** use `RequestTrace` here yet — it models the temporal pipeline (render → wire → hydrate) and would front-load L4/L5 mechanics. Save it for the composition section where "where does each component run" is the actual question.

**Tooltips (`Term` / `CodeTooltips`):**
- `Term`: **RSC** (React Server Component) — expand the acronym once.
- `Term`: **bundle** — the JavaScript the browser downloads to run the app (the student may know this loosely; one-line reinforce since "zero bundle cost" is the headline benefit).

---

### Awaiting data in the component body

**Goal:** teach the canonical async component shape and direct server-side data fetching — the form the student will write on nearly every page in the rest of the course.

Content:
- The shape: `export default async function Page() { ... }`. A Server Component can be an **`async` function**, and `await` at the top of the body is legal and idiomatic. This is impossible in a browser component — React components in the browser can't be async functions.
- Direct data access in the body: `await db.query(...)`, `await fetch(...)`, `await fs.readFile(...)`. The data lives next to where it renders. No separate loader, no `getServerSideProps` (name it once as the dead Pages-Router pattern, recognition-only, no detour — thesis: "no historical detours").
- The senior reflex: **fetch at the component that owns the data** (ties to Ch 029 L2's "fetch at the level that owns the data"). Co-locate the read with the render.
- Name caching in *one* sentence and move on: repeated `fetch`/data reads can be cached (Next.js `fetch` cache, React's `cache()`), but caching is **Chapter 032's** subject — here, treat each read as a direct fetch. Do not teach `cache()` usage; just name it so the student isn't surprised it exists.
- Show the full canonical page using the invoices through-line, typed with `PageProps` if it reads `params`.

**Component — `AnnotatedCode`** for the canonical async page (one block, several parts to direct attention to, per the components INDEX guidance "focus the student's attention on specific parts"). Steps:
1. `{1}` the `async` keyword on the default-exported `Page` — "this is the part that's new; a component you can `await` inside." (color blue)
2. the `await params` line if present — reuses Ch 029 L3, one step, "URL params arrive as a Promise, you already know this." (color violet)
3. the `await listInvoices()` / `await db...` line — "data fetched right here, in render, on the server." (color green)
4. the `return` JSX consuming the data — "by the time we render, the data is already here. No loading state."

Author the code block once on the parent; keep each step ≤6 lines of prose. Use the established names (`listInvoices`, invoice fields `{ id, total, status }`).

**Exercise — `Dropdowns` (fenced-code, `answers` prop).** Give a small Server Component page with blanks: the `___` before `function` (answer: `async`), the `___` keyword before the data call (answer: `await`). Low-stakes syntax check that the student internalizes the async shape. This is the one place syntax-drilling earns its weight because the async-component shape is genuinely new muscle memory.

**Tooltips:**
- `Term` / `CodeTooltips`: **`getServerSideProps`** — the Pages-Router data-loading function this replaces; named once so the student recognizes it in old code, never used.

---

### What only a Server Component can do

**Goal:** the capability ledger, server side. Frame each as "this is why running on the server is powerful," tied to real SaaS stakes.

Content (each is a short, concrete bullet — keep tight, this is a ledger not an essay):
- **Read secrets from `process.env` without leaking them.** A `STRIPE_SECRET_KEY`, a database URL, an internal API token — used on the server, never shipped. (Next.js detail to state precisely: only `NEXT_PUBLIC_`-prefixed env vars reach the browser; unprefixed ones are server-only and become an empty string if referenced in client code — this is the *framework's* guardrail, but the durable rule is "secrets live on the server.")
- **Query the database directly.** No API layer between the page and the data for the app's own reads. `await db.select()...`.
- **Import heavy, server-only SDKs and dependencies** without bloating the client bundle — the Stripe Node SDK, a markdown parser, a syntax highlighter, an email renderer. They run server-side and ship zero browser JS.
- **Render large dependency trees cheaply.** A 200 KB markdown-to-HTML pipeline costs the user *nothing* because only its output crosses.

Stakes framing: in a real SaaS, the difference between "the Stripe key is on the server" and "the Stripe key is in the browser bundle" is the difference between a working product and a breach. The default puts you on the safe side automatically.

**Watch-out (inline, in this section — not bundled at the end):** secrets are safe *inside* a Server Component, but the moment you pass one as a **prop to a Client Component**, it crosses the wire and is visible in the browser. Plant it firmly here with a one-line "we'll see exactly how this leaks in L4." This is the highest-stakes beginner mistake in the chapter; seed it early, pay it off in L4.

Use a `Code` block or two for `process.env` and `await db` examples. Keep them short. An `Aside type="caution"` is appropriate for the secrets-in-props watch-out (asides are sanctioned for setting a caution apart, per components INDEX).

---

### What a Server Component can't do

**Goal:** the other half of the ledger — the wall that makes Client Components necessary (and sets up L2). Frame as "here's where the server model runs out, and why the next lesson exists."

Content (tight list, each with the one-line *why*):
- **No state hooks** — `useState`, `useReducer`. The function runs once and is gone; there's no living instance in the browser to hold state.
- **No effects / lifecycle** — `useEffect`, `useLayoutEffect`, `useRef` to DOM. Nothing mounts in the browser to run them.
- **No event handlers** — `onClick`, `onChange`, `onSubmit`. There's no JavaScript shipped to wire them up.
- **No browser globals** — `window`, `document`, `localStorage`, `navigator`. They don't exist on the server.
- **No React Context *consumer*** directly — Context needs a client provider (named here, the provider-must-be-client detail is L2/L3; just flag that Context is a client-side concern).

The unifying explanation (state it once, it makes the whole list memorable): **all five are things that need a living component in the browser.** A Server Component has no life after it returns its output. Anything that has to *respond to the user over time* needs the client — and that's what `"use client"` and Lesson 2 are for.

Forward-pointer (one line): the fix for every item on this list is a Client Component, the subject of the next lesson. Don't teach `"use client"` here beyond naming it.

**Exercise — `Buckets` (two-column, classification).** This is the section's payoff and a strong fit (classification drill, per components INDEX). Instructions: "Sort each capability into where it can run." Two buckets: **Server Component** and **Needs a Client Component**.
- Server bucket items: `await fetch(...)`, reading `process.env.STRIPE_SECRET_KEY`, querying the database, rendering markdown to HTML, importing a heavy Node SDK.
- Client bucket items: `useState`, an `onClick` handler, reading `localStorage`, a `useEffect` cleanup, `window.scrollY`.
Grading is built-in (chip turns green/red). This single exercise verifies both ledgers at once — the highest-value check in the lesson.

**Tooltips:** none new required here; the hook names are reinforced in prose. (The student met `useState`/`useEffect` conceptually only by name so far — keep prose self-explanatory rather than tooltipping every hook.)

---

### Composing Server and Client Components

**Goal:** the composition rules — the part beginners get wrong most often. Two legal moves, one illegal move. This sets the boundary geography that L2/L3 deepen.

Content, staged:
1. **Server can render Client by importing it.** A Server Component imports a Client Component (`<LikeButton />`, `<DatePicker />`) and renders it, passing props. This is the common case and it "just works." Show the canonical shape: server page renders an interactive leaf.
2. **The asymmetry — why Client can't import Server.** A `"use client"` file pulls *everything it imports* into the client bundle (full mechanism is L3 — name it lightly here). So if a Client Component `import`ed a Server Component, that server code (and its DB access, its secrets) would be dragged into the browser — which defeats the entire model. The framework forbids it.
3. **The pattern: Client receives Server via `children` (or any prop slot).** A Client Component can't *import* a Server Component, but it can *accept one as `children`*. The Server Component is rendered on the server ahead of time; its finished output is handed to the Client Component, which slots it in without ever seeing the source. Canonical use: an interactive shell (a `<Modal>`, a tab strip, a collapsible) wrapping server-rendered content (a `<Cart>`, an invoice detail). "Interactive shell, server-rendered filling."

State the durable one-liner the student should keep: **"Wrap, don't import."** When a Client Component needs server-rendered content inside it, the parent Server Component passes it down as `children` — the Client Component never imports it.

Tie back to Ch 029: the student already saw this exact pattern in Ch 029 L6 (the `<Modal>` client wrapper composing `<PhotoDetail>` server content via `{children}`). Cite it — "you've already written this once; here's the rule behind it." This is a strong reuse that lowers cognitive load.

**Component — `CodeVariants`** for the three moves (best fit: "show the incorrect and correct version" / grouped related files, per components INDEX). Three tabs:
- **"Server renders Client" (✓)** — server page imports `<BuyButton />` (client). First sentence: "The common case. Server imports Client, passes props, done."
- **"Client imports Server" (✗)** — a `"use client"` file with `import { InvoiceDetail }` and a `del=`-marked import line. First sentence: "Illegal — this drags server code into the browser bundle. The framework errors."
- **"Client receives Server via children" (✓)** — the `<Modal>{children}</Modal>` shell on the client, and the parent server page passing `<InvoiceDetail />` as the child, with `ins=` marks. First sentence: "The fix: wrap, don't import. Server content is passed down, not imported."

Keep each tab's prose to one paragraph (component constraint). The `del=`/`ins=` markers carry the before/after.

**Visual — `RequestTrace` (now it earns its place).** This component is purpose-built for "where does each component run" (its own docs ship a "Where does FilterBar run?" example). Use the boundary preset `phases="request,server-render,wire,hydrate"`. Tree: a server `InvoicePage` → server `InvoiceList` (with `await="db: invoices"`) → client `BuyButton`. Pedagogical goal: let the student *scrub* and see that the client `BuyButton` **still runs on the server first** (produces HTML) and only "wakes up" at the hydrate phase — pre-empting the L2/L5 misconception that `"use client"` means "skip the server." Add two `<Phase>` captions: at `server-render`, "Every component runs on the server first — even the client one"; at `hydrate`, "Only now does `BuyButton` become interactive; `InvoiceList` shipped zero JS." Keep the tree to ≤4 nodes, depth ≤2 (component guidance). Do **not** add `<WireProp>` rows here — serialization is L4; this trace is purely about *where each node runs and when it wakes up*. One sentence after the figure must point forward: "What actually crosses that wire — and what can't — is Lesson 4."

**Watch-out (inline):** the error message you get from importing a Server Component into a Client Component is a build-time error — name that it fails *at build*, loudly, not silently at runtime. The reassurance: the framework catches this one for you. (Contrast with the silent secrets-in-props leak, which it does *not* catch — reinforce the asymmetry from the previous section.)

**Tooltips:**
- `Term`: **boundary** — the line in the module graph where server-land ends and client-land begins; "you'll see exactly how `"use client"` draws it in Lesson 3." One-line, since the term recurs all chapter.

---

### Recap and what's next (no heading or short heading)

Brief consolidation (pedagogical guidelines: keep it tight, no celebratory tone). Restate the inverted default in one line, the async-body shape in one line, the two ledgers as a paired phrase ("server: data, secrets, zero JS; client: state, events, browser"), and the composition rule ("Server renders Client by import; Client renders Server by `children`; never the reverse import"). Then the one-line bridge to L2: "Everything on the *can't* list is what Client Components unlock — and opting in has a cost. That's next."

Optional `ExternalResource` cards (pedagogical guidelines §3 sanctions closing LinkCards):
- Next.js docs — "Server and Client Components" (the canonical reference this lesson tracks).
- React docs — `react.dev/reference/rsc/server-components`.
Keep to two; this is reference, not a reading list.

**Video (optional, resourcer-gated).** A `VideoCallout` could support the two-environment model if a current, high-quality Next.js 16 Server Components explainer exists (≤~15 min, post-Next-16). Flag as optional — the resourcer decides; the lesson must stand without it. Do not invent a video id.

---

## Scope

**This lesson covers:** the default-Server-Component model; the async component body and direct server-side data fetching; the two capability ledgers (server-only powers vs. client-only needs); and the three composition moves (Server→Client by import ✓, Client→Server by import ✗, Client receives Server via `children` ✓). The mental model "where code runs and what that enables."

**Explicitly out of scope — defer, do not teach (redefine prerequisites only in one line where needed):**
- **`"use client"` mechanics / Client Components in depth** → L2 of this chapter. Here, name `"use client"` only as "the opt-in that draws the boundary"; do not explain its module-graph semantics.
- **The two-render model and hydration** → L2 (two-render) and L5 (hydration mechanics + mismatches). The `RequestTrace` may *show* a hydrate phase, but do not teach hydration rules or mismatch causes here.
- **Architectural Principle #6 (explicit over magic), `"use server"`, the directive deep-dive, `server-only`/`client-only` packages** → L3. Name the secrets boundary as a *risk* here; the structural-enforcement *fix* (`import 'server-only'`) is L3's. (Note: per current Next.js 16 docs these packages are optional since Next handles the imports internally — L3 should reflect that nuance; this lesson doesn't touch it.)
- **What crosses the RSC wire / serialization rules / the secrets-in-props leak in full / `RSC payload` internals** → L4. Name the RSC payload *once* ("the browser receives output, not code"); plant the secrets-in-props watch-out; do **not** enumerate serializable types or show the wire panel.
- **Suspense, streaming, `loading.tsx`, `error.tsx`, `React.use()` for streamed promises** → Chapter 031. The Promise-as-prop streaming pattern is named-once at most.
- **Caching: `fetch` cache, `cache()`, `use cache`, `cacheLife`, `cacheTag`, static vs. dynamic rendering, PPR / Cache Components** → Chapter 032. Name `cache()`/the fetch cache in one sentence; teach nothing.
- **Async Request APIs at depth (`cookies()`, `headers()`, `searchParams`)** → Ch 032.8 / Ch 033. `params` is *reused* from Ch 029 L3 (already a Promise, `await` it) — not re-taught, just used.
- **Server Actions and `"use server"` for mutations** → Chapter 043. The data layer (`getInvoice`, `listInvoices`, the real Drizzle queries) is **Unit 5** — keep query bodies as flagged stubs / one-line `await db...`, never flesh out.
- **`@next/bundle-analyzer` / reading the bundle report** → Ch 094 (named in L2's cost ledger, not here).

**Prerequisites the student already has (use freely, redefine in ≤1 line only if load-bearing):** `app/` file-system routing, `page.tsx`/`layout.tsx` as default exports (Ch 029 L1–L2); `await params` as a Promise + `PageProps<'/route'>` typing (Ch 029 L3); the `<Modal>{children}</Modal>` Client-wraps-Server pattern by example (Ch 029 L6); JSX (Ch 017); `async`/`await` and Promises (Unit 1); `process.env` / module graph basics (Ch 006 L2, which already named `"use client"` and `server-only` as module-graph rules — this lesson is the payoff of that seed).

---

## Code conventions to honor (from Code conventions.md, § Function form / Naming / File layout)

- `export default async function Page()` / `Layout()` are the **sanctioned default exports**; every other component (`InvoiceTable`, `BuyButton`, `Modal`, etc.) is a **named export** in a **kebab-case** file (`buy-button.tsx`, `invoice-table.tsx`).
- Paths shown as `src/app/...`, `src/components/...`, `src/lib/...`.
- Data-layer reads are verb-led: `getInvoice(id)` (single, returns row or `null`), `listInvoices(filter)` (array). Bodies are stubs/one-liners flagged `// data layer: Unit 5`.
- Single quotes; 2-space indent; named imports grouped external → `@/` → relative.
- Type page props with the generated `PageProps<'/route'>` when reading `params`; never hand-write the `Promise<{...}>` annotation (Ch 029 L3 convention).
- Components and types `PascalCase`; props typed at the parameter (`{ invoices }: { invoices: Invoice[] }`), `React.ReactNode` for `children` (never `JSX.Element`).
- **Deliberate divergences (note for downstream agents):** data-layer query bodies are intentionally thin stubs (real Drizzle is Unit 5); the opening "old React" `useEffect`+`fetch` snippet is intentionally the *anti-pattern* being retired — mark it clearly as the before, not course-standard code.
