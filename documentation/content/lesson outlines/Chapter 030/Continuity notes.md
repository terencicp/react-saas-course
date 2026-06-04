# Chapter 030 — The server / client boundary

## Lesson 1 — Server Components as the default

**Taught:** every `app/` file is a React Server Component by default (no directive); runs once on the server per request, ships zero browser JS, the browser receives output not code; the canonical async-body page shape (`export default async function Page() { const data = await ... }`) with direct DB/fetch/fs reads in the body, no `useEffect`/loader/`getServerSideProps`; the two capability ledgers (server: data, secrets, zero bundle; client: state, events, browser globals); the three composition moves (Server imports Client ✓, Client imports Server ✗ build-time error, Client receives Server via `children` ✓); every component — Client ones included — runs on the server first and only Client ones wake up at hydrate.

**Cut:** Chapter-outline "RSC payload" detail kept to a single named-once mention (output vs code); no enumeration of streaming/wire internals.

**Debts (forward-pointers to honor):**
- `"use client"` named only as the opt-in directive that draws the boundary — full module-graph semantics owed to **L2/L3**.
- "What crosses the wire" / serialization / the secrets-in-props leak shown in full → **L4** (planted here as a caution).
- Hydration mechanics/mismatches → **L5** (the `RequestTrace` shows a hydrate phase but teaches no rules).
- `cache()` / `fetch` cache named once, taught nowhere → **Chapter 032**.
- `server-only`/`client-only` structural fix → **L3**; Architectural Principle #6 → **L3**.

**Terminology / mental models:**
- **The boundary** — the server/browser divide; "the boundary" geography is the chapter's spine, reused every lesson. Custom `ServerBrowserSplit` diagram at `src/components/lessons/030/1/ServerBrowserSplit.astro` is the durable reference image.
- **"Wrap, don't import"** — the one-liner for Client-renders-Server composition (Client accepts Server via `children`, never imports it).
- "Server tree wide, Client leaves narrow" — the senior reflex, planted here, owned by L2.
- "The framework decides *where* each component runs" — extension of Ch 029 L2's "framework fills `children`" framing.
- Asymmetry to reuse: the illegal Client-imports-Server move fails **loudly at build time**; the secrets-in-props leak fails **silently** — framework guards one, not the other.

**Patterns / best practices:** fetch at the component that owns the data (co-locate read with render); secrets safe inside a Server Component but leak the instant passed as a prop to a Client Component; only `NEXT_PUBLIC_`-prefixed env vars reach the browser (durable rule: "secrets live on the server").

**Misc.:**
- Through-line domain stays invoices; data-layer names `getInvoice(id)`/`listInvoices()` reused, bodies kept as thin stubs flagged `// data layer: Unit 5`.
- Page props typed with `PageProps<'/route'>`; `await params` reused from Ch 029 L3, not re-taught.
- No live App-Router coding exercise (iframe constraint from Ch 029 holds) — checks are `Dropdowns`/`Buckets` recognition plus the `RequestTrace` simulation. This constraint persists for all of Ch 030.
- The opening `useEffect`+`fetch` snippet is a deliberate anti-pattern marked as "the before", not course-standard code.
- Resources already spent here (don't re-suggest downstream): `VideoCallout` videoId `rGPpQdbDbwo` (Web Dev Simplified, RSC overview); and Dan Abramov's overreacted.io "What Does 'use client' Do?" link card — L3 owns `"use client"` semantics but this canonical explainer is already linked from L1.

## Lesson 2 — Client Components and pushing the boundary down

**Taught:** the two-render model (Client Component runs once on the server → HTML for instant paint, ships its JS, then re-runs in the browser to attach listeners/state = hydration) and its contract: both renders must produce the same output or it's a hydration error; the earns-it rubric — EARN `'use client'`: `useState`/`useReducer`, `useEffect`/`useLayoutEffect`, DOM `ref`, event handlers, browser APIs, Context (provider file too), interactive third-party libs; DO NOT earn it: data fetching, markdown/heavy static, env/secrets, URL-on-server (`params`/`searchParams`); the senior reflex — default Server, push `'use client'` down to the smallest interactive leaf (centerpiece `MarkPaidButton` refactor: page-as-client loses `async` body and forces `useEffect` fetch vs. leaf-as-client keeps server `await`); the bundle cost of every boundary (file + transitive deps + React client runtime); the two-step "is this file Server or Client?" read — directive header, else how it's imported (no directive but imported from a `'use client'` file = still client, transitively).

**Cut:** chapter-outline "boundary contract — what crosses, in shape" (serializable props list) reduced to a one-liner "narrow on JS, narrow on data" + pointer; the Client-renders-Server-via-`children` pattern only referenced (one sentence), not re-taught (L1 owns it).

**Debts (forward-pointers to honor):**
- Full `'use client'`/`'use server'` semantics (first-non-comment-line, silent-typo, no-op-when-crossed), Architectural Principle #6, `server-only`/`client-only` → **L3** (explicitly named in recap).
- Serialization rules / "what crosses the wire" / `taint` API → **L4** (named: props-serializable, secrets-in-props, wire size).
- Hydration failure modes + fixes (random/time/`window` mismatches) → **L5** (the contract is taught here, causes/fixes are not).
- `@next/bundle-analyzer` treemap reading → **Ch 094** (performance); named here as the diagnostic only.
- Real `MarkPaidButton` mutation via Server Action → **Unit 6 / Ch 043** (button flips local `useState` only, deliberately runnable without an action).

**Terminology / mental models:**
- **Hydration** — `<Term>`-defined: the browser-side second render that re-runs a Client Component over server-sent HTML to attach listeners/state.
- **"The two renders"** / "runs twice, both must agree" — the hydration contract, the lesson's conceptual core.
- **"Pushing the boundary down"** — actively moving `'use client'` toward the leaf; the new idea is *direction of effort*, not the composition mechanic.
- **"Narrow on JavaScript, narrow on data"** — the one-liner tying small client leaf to small props (bundle + security + wire).
- `'use client'` marks an **entry point** into the client subgraph and propagates to all transitive imports (the one directive fact L2 owns).
- Custom `BoundaryDepth` diagram at `src/components/lessons/030/2/BoundaryDepth.astro` — same tree drawn twice, shaded area = client bundle; reuses chapter's server=cool/client=warm colour language.
- Custom `TwoRenderLifecycle` diagram at `src/components/lessons/030/2/TwoRenderLifecycle.astro` — the two-render/hydration lifecycle (server render → ship → hydrate) for one client leaf; built as a bespoke component, not the outline's recommended `DiagramSequence`/`RequestTrace`.

**Patterns / best practices:** Client Components cannot be `async` (hard rule — surfaced when page-as-client loses its `await`); Context provider files need `'use client'` (the commonly-forgotten earns-it item); React 19 Context renders via `<ThemeContext value={...}>` directly, no `.Provider`; check bundle impact (analyzer) before merging anything that adds a Client Component; client leaf files live in `app/<route>/_components/` (e.g. `mark-paid-button.tsx`).

**Misc.:**
- Next.js 16 removed the per-route JS size column from `next build` output (was misleading for RSC); the bundle analyzer treemap is the measurement path now — do not tell students to read per-route JS from `next build`.
- The "tempting move" (`'use client'` at top of `page.tsx`) snippet is a labelled anti-pattern, not course-standard.
- Iframe constraint holds: checks are `Buckets`/`Dropdowns` recognition + custom `TwoRenderLifecycle` diagram (distinct from L1's `RequestTrace` — follows one client leaf's lifecycle, not a whole tree).
- Resources spent here (don't re-suggest downstream): `VideoCallout` videoId `Qdkg_mrniLk` (ByteGrad, where/when to add `'use client'`); link cards — Next.js "Server and Client Components" docs (also cited L1, Client half here), React `use client` directive reference, Josh Comeau "Making Sense of RSC" interactive explainer, patterns.dev "React Server Components".

## Lesson 3 — Directives and server-only enforcement

**Taught:** the two directives in full and the structural enforcement that backs them. `'use client'` = a bare string literal at the file head, above all imports/code (comments may precede it; single/double quotes only, **not backticks**); a typo or a misplaced import silently demotes the file to a Server Component with no build error (crashes at first render on the wrong path); re-declaring it deeper in the client subgraph is a harmless no-op (one-way door). `'use server'` marks a **Server Action** (an RPC function the client can invoke, body runs server-side), placed file-level (every export becomes an action, convention `_actions.ts`) or inline (`'use server';` as first line of an async function body); it has nothing to do with Server Components (the directive-less default). Architectural Principle #6 **prefer explicit over magic** named at its canonical site (directive is a readable/reviewable/blameable string the framework could have inferred but deliberately didn't). The convention-isn't-enforcement gap: `'use client'` marks the boundary but never inspects what crosses it, so a transitive server import leaks (silently if pure JS, cryptically if Node-only). `import 'server-only';` / `import 'client-only';` = side-effecting imports that turn that leak into a loud `next build` error naming the offending chain.

**Cut:** nothing material from chapter-outline scope; all action bodies kept as stubs (`// mutation logic: the forms chapter`) per the hard Server-Action boundary.

**Debts (forward-pointers to honor):**
- Full Server Action surface (validation, errors, return shapes, form wiring, `useActionState`) → **Chapter 043** (referred to as "the forms chapter"); every `'use server'` example here is a stub.
- "Exactly what crosses the wire" / serialization / secrets-in-props in full / Server Action reference as the only function-like value that crosses → **L4** (named as next lesson).
- Hydration failure modes (server/client render disagreement) → **L5**.
- Route handlers as the Server-Action alternative → **Ch 046** (not mentioned, stays out per outline).

**Terminology / mental models:**
- **Directive** — `<Term>`-defined: a literal string at a module/function head the bundler reads as an instruction, not runtime code.
- **Server Action** — `<Term>`-defined: server function exposed to Client Components as a callable endpoint via `'use server'`; React's RPC mechanism (also `<Term>`-defined). Owned in full by Ch 043.
- **side-effecting import** — `<Term>`-defined: `import 'x';` with no binding (covers `server-only` and `import './globals.css'`).
- **transitive import** — `<Term>`-defined: a module pulled in through an import chain, not directly; why a leak hides hops deep.
- **Two must-kill confusions** (reusable framing): (a) `'use server'` ≠ Server Components; (b) `import 'server-only'` ("slams a door" — file errors if it reaches the client) ≠ `'use server'` ("opens a window" — exposes endpoints the client can call). Opposite intents.
- "Marker, not guard" — `'use client'` draws the boundary; it does not check what's on either side. The line that motivates `server-only`.
- The **four boundary strings** consolidated in custom `FourStringsReference` (`src/components/lessons/030/3/FourStringsReference.astro`, `Figure`-wrapped table) — string / **kind** / what-it-marks / direction / failure / canonical file, server=cool / client=warm tints. Adds an orthogonal **kind axis** (`directive` vs `guard` badge) so the within-colour opposite-jobs contrast reads explicitly; the lesson's durable disambiguation artifact.
- Custom `MagicVsExplicit` (`src/components/lessons/030/3/MagicVsExplicit.astro`, `TabbedContent`-based, no `Figure` wrap) — "inferred boundary" (cog, unreadable) vs "explicit directive" (glowing `'use client'` first line); makes "legible at a glance" literally visual for Principle #6.

**Patterns / best practices:**
- **Every module that must stay on the server opens with `import 'server-only';`** — durable rule for the rest of the course: `db/index.ts`, `lib/auth.ts`, `lib/email.ts`, billing adapters, every `_actions.ts`. Course code conventions already bake this into `lib/` SDK adapters.
- **Never hand-type a directive** — copy from a known-good file or use an editor snippet (the string is unguarded by any tool).
- `server-only`/`client-only` npm packages are **optional to install** as of current Next.js — Next.js recognizes both internally and ships its own type declarations; the *import line* is the contract, not the package. Install (as devDeps) only to keep linters quiet. (Corrects older "you must install" guidance.)
- Import ordering: side-effecting import (`'server-only'`) sits alone first, then external packages, then `@/` aliases, blank-line-grouped.
- `'use client'` / `client-only` belong on the **client/warm** side; `'use server'` / `server-only` on the **server/cool** side — but within each colour the two strings do opposite jobs.

**Misc.:**
- File-name conventions reused/established: client leaves `app/invoices/_components/mark-paid-button.tsx`; server actions `app/invoices/_actions.ts`; guards on `db/index.ts`, `lib/auth.ts`.
- Iframe constraint persists: checks are `Buckets` (sort behaviors by job, never by literal string) + `Matching` (file → correct opening line, with "no directive" as a deliberate correct answer to defend against over-marking).
- `'use cache'`/`cacheLife`/`cacheTag` are also directives but were kept out — they belong to Ch 032 and must not be grouped with `'use client'`/`'use server'`.

## Lesson 4 — What crosses the RSC wire

**Taught:** the wire contract for Server→Client props = **`structuredClone` (Ch 001) + four React extensions**. Structured-clone set that crosses: primitives (`string`/`number`/`boolean`/`null`/`undefined`/`bigint`/`symbol`), built-in collections (`Array`/`Map`/`Set`/`TypedArray`/`ArrayBuffer`), `Date`, and **plain objects** (`{}`-shape, includes Drizzle rows). The four React extensions: **Promises** (un-awaited Promise crosses, client consumes via `React.use()`+Suspense → Ch 031), **JSX** (server-rendered tree crosses as serialized JSX — "wrap, don't import" from the wire side), **Client/Server Component references** (a pointer "mount component #N", not the code, which was bundled separately), **Server Action references** (opaque ID, never the body — the one function-shaped value the wire carries). Rejected: functions/closures, class instances / custom-or-null-prototype objects, DOM nodes, non-`Symbol.for` symbols, `WeakMap`/`WeakSet`; `Error` crosses partially (message yes, stack no). The two boundary errors (function-prop, class-instance) and the skill of **reading the message** (it names the prop and which side complained) over memorizing it. The two-ways-to-pass-a-function decision: (A) **move the handler into the client leaf** (the common answer when work is pure browser interaction — reach first), (B) **make it a Server Action** (only when work must run server-side). The silent-leak section: every Client-Component prop sits in the RSC payload as plain text readable in DevTools Network; framework guards the *type* contract, not the *contents*; **pick the slice** (`{ id }`, not the row) for security + payload size.

**Cut:** `RegExp` (listed in chapter outline's structured-clone set) not enumerated; `toJSON` customization (outline "named once, dropped") omitted entirely; `taint` APIs left out (slice-the-object is the taught defence).

**Debts (forward-pointers to honor):**
- Full Server Action surface (declaration, validation, form wiring) → **Ch 043**; every `'use server'` here is a stub.
- `React.use()` + Suspense + the Promise-streaming consumption side → **Ch 031** (Promises-cross taught as *what*, not *how consumed*).
- Error serialization / `error.tsx` / boundaries → **Ch 031 + Ch 080** ("errors cross partially" named only).
- Caching → **Ch 032**.
- Time/date library handling (`dayjs`, `Temporal` encode-as-ISO-string-at-the-boundary) → **Ch 083/087**; named here as a class-instance failure.
- Hydration (HTML + payload are two transports that must agree) → **L5** (next).

**Terminology / mental models:**
- **RSC payload** — `<Term>`-defined: the serialized React tree the server streams alongside the HTML to reconcile what React renders; an ordinary HTTP response, readable in DevTools Network. Two transports per render: HTML (instant paint) + RSC payload (reconcile + carries serialized Client props).
- **structured clone** — `<Term>`-re-anchored from Ch 001 as "the algorithm that deep-copies a value across a boundary, dropping functions/DOM nodes"; the RSC wire is that same algorithm as a network format. Core teaching move: recognition, not a new rule.
- **"Props are a postcard"** — the leak metaphor (planted L1, cashed here); the wire **rejects a function loudly** but **accepts an over-wide object silently** — the chapter's loud-vs-silent asymmetry paying off.
- **"Pick the slice"** / "narrow on data" (from L2) — now with security teeth: pass exactly the fields the UI reads.
- "Plain object is load-bearing" — `{}`-shape crosses; a custom prototype (class instance) does not.

**Patterns / best practices:**
- **Never put a secret in a Client-Component prop** — it ships to public JS regardless of `NEXT_PUBLIC_` (ties to L1's env rule); a secret in props = a secret in the browser.
- **Shape data into plain values at the edge where it leaves the server** — encode `Temporal`/`dayjs`/class instances as ISO strings or epoch numbers before they become props; keep the rich object server-side. `Date` itself crosses fine.
- Prefer plain array/object over `Map`/`Set` when the consumer doesn't need the collection API (one fewer moving part) — even though both now cross natively (stale guidance said convert-to-array first).
- Reach for the client-leaf handler before a Server Action — over-reaching for `'use server'` when no server work happens is the classic over-correction.

**Misc.:**
- Two figures shipped as custom `.astro` components at `src/components/lessons/030/4/`: **`RscLanes`** (server→browser HTML lane vs RSC-payload lane, "props serialized here") and **`LeakedPayload`** (DevTools-style Network response with a leaked sensitive field highlighted) — reusable references for any later lesson illustrating the RSC wire or a payload leak. Server=cool / client=warm colour language reused.
- Error strings are load-bearing but drift between React releases — the lesson quotes the *Server-Component→Client-Component prop* form (wording shifts to "...passed to Server Actions..." for the arg direction); teaching point is "read the message," which survives rewrites.
- Iframe constraint persists: checks are recognition only — `Buckets` (crosses/doesn't-cross, the primary check, spans accept+reject lists), `MultipleChoice`, `Matching` (safe-to-pass vs keep-on-server).
- Canonical leak example: passing a full invoice row (with `internalNotes`/joined customer) to `MarkPaidButton` when it needs only `{ id }`.
- Resources spent here (don't re-suggest downstream): `VideoCallout` videoId `aZAMP-4Szgg` (Codevolution, RSC rendering lifecycle); `ExternalResource` cards — React `use client` serializable-types reference, Next.js Server/Client Components docs (also cited L1/L2), MDN structured-clone-algorithm.

## Lesson 5 — Hydration and its mismatch failure modes

**Taught:** WHY the two renders diverge and the fix ladder (L2 owned the contract; this lesson cashes that debt). A mismatch = the two renders saw different inputs (same code, different *environment*: server is one machine/instant/UTC/no-DOM, browser is another a beat later in the user's zone with an extension-touched DOM). Causes split into two buckets: **your non-determinism** (time/`Date.now()`/relatives, `Math.random()`, locale+timezone formatting, browser-only reads during render — real bugs you fix) vs **the browser's noise** (extension-injected attrs `data-gr-*`/`data-1p-*`/`cz-shortcut-listen` — not your bug, suppress narrowly). Plus a named-once non-bucket cause: invalid HTML nesting (parser repairs malformed markup → different DOM). Three fixes in priority order: (1) **`useEffect` deferral** — render a deterministic placeholder, swap the real value in after mount (effect never runs on server, so never in the hydration comparison); generalizes to an `isMounted` gate + skeleton for whole client-only subtrees (e.g. reading `localStorage`); (2) **`useId`** — stable id from tree position, identical on both machines, for `htmlFor`/`id` and ARIA wiring; (3) **`suppressHydrationWarning`** — per-element, one level deep, escape hatch for correctly-different-by-design values + body-level extension noise only. Two diagnostics: only Client Components hydrate so a no-`"use client"` file → it's a *server* bug not a hydration bug (cashes L1/L2); stale `.next` cache → `rm -rf .next && pnpm dev`.

**Debts (forward-pointers to honor):**
- `useId` semantics for forms/ARIA at depth → **Ch 024** (here purely the hydration-safe id source).
- Time/timezone/locale correct handling, `Intl`, `Temporal` → **Ch 084/087** (appear here only as mismatch causes; teach the *defer* fix, not i18n).
- `next-themes` / dark-mode setup → its own later lesson; the `<html suppressHydrationWarning>` theme-script line is *referenced* to disambiguate from the `<body>` extension case, not taught.
- `'use cache'` / Cache Components model → **Ch 032** (the `.next` note is dev-tooling only, no cache theory).
- Suspense / streaming / `error.tsx` → **Ch 031** (not taught as hydration topics).

**Terminology / mental models:**
- **Hydration** `<Term>` (consistent with L2), **reconciliation** `<Term>` (React's diff of would-render vs existing DOM; strict during hydration), **non-deterministic** `<Term>`, **hydration mismatch** `<Term>` (the error string), **`useId`** `<Term>`, **`suppressHydrationWarning`** `<Term>`.
- **"Hydration is the cost of SSR"** — the senior frame: CSR = no hydration/bad first paint; SSG = no hydration/no interactivity; App Router gives both and hydration is the bill → your render must be reproducible on two machines.
- **Two buckets** — *your non-determinism* (fix) vs *the browser's noise* (acknowledge + suppress narrowly); the load-reducing split because the fix differs per bucket.
- **"Non-deterministic value → defer to `useEffect`, render a stable placeholder first"** — the terminal reflex.
- Same prop, two elements, two reasons: `<html suppressHydrationWarning>` = theme script; `<body suppressHydrationWarning>` = extension noise. `suppressHydrationWarning` does **not** cascade to children (the misconception to kill).

**Patterns / best practices:**
- Never use `Math.random()` / a module-level counter / `crypto.randomUUID()` for an id in a Client Component subtree — always `useId`.
- `useEffect` for wall-clock/locale here is the *legitimate* "synchronize with an external system" use, not the deriving-state/data-fetching misuse warned against earlier.
- Pick a fallback that reads fine on its own (absolute timestamp, skeleton, dash) — the user sees it before the swap.
- Reach for `useEffect`/`useId` before `suppressHydrationWarning`; suppressing a mismatch you don't understand hides a real divergence.

**Misc.:**
- Iframe constraint persists — recognition-only checks (`Buckets` deterministic-vs-not, `Dropdowns` pick-the-fix, `MultipleChoice`, `RequestTrace` hydrate phase); no live mismatch repro.
- Lesson tracks the chapter outline closely; nothing material cut.
- Reuses `MarkPaidButton` / invoice-detail surface (plus sibling `PaidLabel` client leaf); canonical example = "Paid N minutes ago" relative timestamp. Server=cool / client=warm colour language reused in custom figures.
- The "Mismatch" code variant is a labelled anti-pattern (the "before"), not course-standard code.
- Opener reuses the chapter's `RequestTrace` figure type (`phases="request,server-render,wire,hydrate"`) scoped to the invoice page — only the warm `MarkPaidButton` leaf wakes at hydrate; no new custom diagram built.
- Only one custom figure shipped: `MismatchTwoStrings.astro` at `src/components/lessons/030/5/` — same `<span>Paid {when}</span>` rendered as two divergent strings (server vs browser); reusable reference for any later lesson illustrating a render-time divergence.
- The three fixes shipped as a three-tab `CodeVariants` block (Mismatch / Deferred / Mounted gate) — the mounted-flag + skeleton gate is the generalized form (reads `localStorage` for a saved filter).
- Resources spent here (don't re-suggest downstream): `VideoCallout` videoIds `87i0pejrULw` (Dillion Megida, hydration model + disable-JS demo) and `KAjemAivU24` (ByteGrad, hydration-error causes hands-on); `ExternalResource` cards — Next.js "Hydration error" docs, Josh W. Comeau "The Perils of Rehydration", React `useId`, React `hydrateRoot` (the `suppressHydrationWarning` reference).
