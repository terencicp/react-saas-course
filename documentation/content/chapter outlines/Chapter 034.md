# Chapter 034 — The server / client boundary

## Chapter framing

Chapter 034 teaches the line that runs through every Next.js 16 codebase: which component renders on the server, which renders in the browser, and what passes between them. The student already knows the App Router file system from Chapter 033 and JSX from Chapter 021. What they don't yet know is that every component in an App Router project is a Server Component by default, that crossing into the client costs JavaScript, and that the framework polices the boundary with directives and module-graph rules the student must learn to read on sight. The chapter is build-time, runtime, and wire-format all at once: where the code executes, what happens at hydration, and what the framework can and can't serialize across the RSC payload.

Threads that run through every lesson: Server Components are the default, Client Components are an opt-in for interactivity, and the senior reach pushes the `"use client"` boundary as deep into the tree as possible; the directives (`"use client"`, `"use server"`) are framework magic made explicit at the file head, the canonical site for Architectural Principle #6 ("prefer explicit over magic"); the `server-only` and `client-only` packages turn a leaked import into a build error; the RSC wire carries structured-clone-compatible values plus React extensions, but rejects functions, class instances, and most user-defined object shapes; hydration is the moment server HTML meets client JS and any divergence is a bug; the same starter from Chapter 033 is the demo surface throughout. The chapter ships five teaching lessons plus a quiz, ordered by dependency: Server Components first, then Client Components and the boundary contract, then the directives and structural enforcement, then what crosses the wire, then hydration — Chapter 035 picks up with the async-UI primitives that sit on top.

---

## Lesson 1 — Server Components as the default

Renders on the server only, ships zero client JS, supports async bodies with direct DB and filesystem access, and composes with Client Components through import or `children`.

Topics to cover:

- **The senior question.** Why does every file in `app/` default to Server Component, and what does that mean for how the student reads the file? The lesson names the default rendering model the App Router ships: components render on the server, the result streams to the client as HTML plus an RSC payload, and no component code reaches the browser unless the student opts in.
- **What a Server Component is.** A React component that runs only on the server, renders to an RSC payload, ships zero JavaScript to the client, has no hooks, no `useState`, no event handlers, no browser APIs. It can be `async`, can read databases, files, environment variables, and can `await` data directly in the function body.
- **The default — no directive, no opt-in.** Every component in `app/` is a Server Component unless a `"use client"` boundary above it flips it. The student writes the same JSX they always have; the framework decides where it runs based on the module graph.
- **The async component shape.** `export default async function Page()` is the canonical 2026 form. `await` at the top of a component body is legal and idiomatic. No `useEffect` plus `fetch` dance for server-side data.
- **Server-side data fetching in the body.** Direct `await db.query(...)`, `await fetch(...)`, `await fs.readFile(...)`. The senior reflex: data lives next to where it renders, no loader functions, no `getServerSideProps`. The Next.js 16 fetch cache and React `cache()` are named in context; Chapter 036 owns caching.
- **What Server Components can do that Client Components can't.** Read secrets from `process.env` without leaking; query the database directly; import server-only SDKs without bloating the client bundle; render large dependency trees (markdown parsers, syntax highlighters) without shipping them.
- **What Server Components can't do.** No `useState`, `useEffect`, `useRef`; no event handlers (`onClick`, `onChange`); no browser globals (`window`, `document`, `localStorage`); no React Context consumers (without going through a client provider).
- **Composition with Client Components — Server can render Client, not the reverse at import time.** A Server Component can import and render a Client Component as a child. A Client Component cannot import a Server Component, but it can receive one as a `children` prop — the canonical pattern for "interactive shell wrapping server-rendered content."
- **Where the boundary lives.** The student's job is to keep the Server Component tree wide and the Client Component leaves narrow. A page is Server, its layout shell is Server, the interactive `<DatePicker />` leaf is Client. Full Principle in lesson 3 of chapter 034.
- **The RSC payload — named once.** What the server sends back is not HTML alone; it's HTML plus a serialized React tree the client uses to reconcile. Full surface in lesson 4 of chapter 034.
- **Watch-outs.** No hooks; `async` is fine in a Server Component but not in a Client Component (use `React.use()` instead); reading cookies/headers/searchParams is async in Next.js 16 (lesson 8 of chapter 036); importing a Node-only module accidentally into a Client Component crashes the build (lesson 3 of chapter 034 owns the structural fix); secrets in a Server Component are safe but secrets *passed as props* to a Client Component leak — the RSC wire is visible in network DevTools.

What this lesson does not cover:

- Client Components and the boundary contract (lesson 2 of chapter 034).
- The `"use client"` and `"use server"` directives in depth (lesson 3 of chapter 034).
- `server-only` / `client-only` packages (lesson 3 of chapter 034).
- What crosses the RSC wire and serialization rules (lesson 4 of chapter 034).
- Hydration (lesson 5 of chapter 034).
- Suspense and streaming — Chapter 035.
- Caching, `use cache`, `cacheLife`, `cacheTag` — Chapter 036.
- Async Request APIs (`cookies()`, `headers()`, `params`, `searchParams`) at depth — lesson 8 of chapter 036 and lesson 1 of chapter 037.
- Server Actions and `"use server"` for mutations — Chapter 047.

Estimated student time: 55 to 70 minutes. Load-bearing for every page in Chapter 035 onward, every data-fetching pattern in Unit 6, and every server-rendered surface in the course.

---

## Lesson 2 — Client Components and pushing the boundary down

The two-render model (server HTML plus browser hydration), what earns a `"use client"` boundary, the cost in client JS, and the senior reflex of keeping the boundary at the smallest interactive leaf.

Topics to cover:

- **The senior question.** When does a component need to run in the browser, what does opting into the client cost, and how is the boundary drawn in the module graph? The lesson names `"use client"` as a directive at the top of a file that flips the file — and every module the file imports — into the Client Component subgraph.
- **What a Client Component is.** A React component that runs on the server during initial render (to produce HTML) *and* in the browser (during hydration and on every subsequent interaction). It can use hooks, refs, event handlers, browser APIs, and Context. Its code ships to the client.
- **`"use client"` as the boundary marker — orientation.** The directive lives at the top of a file; everything in that file *and* everything imported from it (transitively) becomes part of the Client Component graph. The directive marks the *entry point* into client land, not a per-component flag. Full directive semantics in lesson 3 of chapter 034.
- **The two-render model.** Client Components render on the server to produce initial HTML (so the user sees content before JS loads), then hydrate in the browser to attach event listeners and become interactive. Both renders must produce the same output — divergence is a hydration mismatch (lesson 5 of chapter 034).
- **The boundary contract — what crosses, in shape.** A Server Component renders a Client Component by importing it and passing props. Props must be serializable through the RSC wire — strings, numbers, plain objects, arrays, Promises, JSX (as `children`), Maps, Sets, Dates. No functions, no class instances. Full rules in lesson 4 of chapter 034.
- **Pushing the boundary down — the senior reflex.** Default to Server; flip to Client at the smallest leaf that needs interactivity. A page rendering a list of products with a "buy" button keeps the page, the list, and each card as Server Components; only the `<BuyButton />` is Client. The dependency tree under that button is the only JavaScript that ships.
- **The Client renders Server via `children` pattern.** A Client Component can't `import` a Server Component (that would force the server module into the client bundle), but it can accept a Server Component instance as `children`. The shell-wraps-content pattern (tabs that animate, modals with server-rendered bodies) lives here.
- **What earns a `"use client"` boundary.** State (`useState`, `useReducer`); effects (`useEffect`, `useLayoutEffect`); refs to DOM elements; event handlers; browser APIs; Context (`createContext` + provider must be Client); third-party libraries that use any of the above; libraries that read `window` during import.
- **What does not earn it.** Async data fetching (do it in a Server Component); rendering markdown, code blocks, large static content (Server); reading environment variables (Server); reading the URL on the server-rendered path (Server, via `params`/`searchParams`).
- **The cost ledger.** Every `"use client"` boundary adds to the client JS bundle: the file's code, its dependencies, and React's client runtime if not already present. The diagnostic is `next build` output and `@next/bundle-analyzer` (lesson 4 of chapter 098); the senior reach is to read the bundle report before merging anything that adds a Client Component.
- **The "is this file Server or Client?" reading habit.** A senior reads a file by first checking the directive header and the imports. If a file has no `"use client"` and is imported only from Server Components or `app/` pages, it's Server. If it has `"use client"` or is imported transitively from a `"use client"` file, it's Client. The student trains this reading reflex.
- **Watch-outs.** A Client Component imported from a Server Component renders fine; a Server Component imported from a Client Component fails (the framework crashes at build time with a clear message); Context providers must be in a `"use client"` file; third-party components without their own `"use client"` (older libraries) require wrapping in a thin client file; props passed to Client Components are visible in the RSC payload — don't pass secrets; large props bloat the wire — keep the boundary narrow on data, not just on JS.

What this lesson does not cover:

- The full `"use client"` and `"use server"` directive semantics, edge cases, and bundler behavior (lesson 3 of chapter 034).
- Architectural Principle #6 (lesson 3 of chapter 034).
- `server-only` / `client-only` packages and structural enforcement (lesson 3 of chapter 034).
- The exact list of types that survive RSC serialization (lesson 4 of chapter 034).
- Hydration mechanics and mismatch causes (lesson 5 of chapter 034).
- Suspense and `loading.tsx` for client transitions — Chapter 035.

Estimated student time: 55 to 70 minutes. Load-bearing for every interactive component in the course, the form patterns in Unit 7, and the auth flows in Unit 9.

---

## Lesson 3 — Directives and server-only enforcement

`"use client"` and `"use server"` semantics at the file head, Architectural Principle #6 (prefer explicit over magic), and the `server-only` / `client-only` packages that turn a leaked import into a build error.

Topics to cover:

- **The senior question.** What exactly does `"use client"` do to the module graph, where does `"use server"` belong, and how does the student make a misplaced import fail at build time instead of at runtime in production? The lesson names the two directives, then introduces `server-only` and `client-only` as the structural enforcement that turns convention into compile-time guarantee.
- **`"use client"` — the directive in full.** A bare string at the top of a file (`'use client'`, before any imports). Marks the file as the *boundary* between the Server module graph and the Client module graph. Every export from this file is a Client export; every module transitively imported is bundled for the client. Subsequent `"use client"` directives lower in the import tree are no-ops (the boundary is already crossed).
- **`"use server"` — the directive in full.** Marks a file or an inline function as a Server Action — a function callable from a Client Component but executed on the server. File-level (`'use server'` at the top) makes every export a Server Action; inline (`async function() { 'use server'; ... }`) makes the single function one. Server Actions are an RPC mechanism, not a way to "run server code in a component." Full action surface in Chapter 047 — named here so the student doesn't confuse the two directives.
- **The two directives do different jobs — name the asymmetry.** `"use client"` marks *components* that ship to the browser. `"use server"` marks *functions* that execute on the server when called from the browser. They are not symmetric, despite the parallel naming. A `"use server"` file has nothing to do with Server Components.
- **Architectural Principle #6 — prefer explicit over magic.** Introduced here as the canonical "name the magic" case. The framework could have inferred the boundary, the directives could have been a build-tool concept. Instead the student writes a literal string at the top of the file: the boundary is visible in the source, in code review, in git diffs. The senior preference across the stack: prefer mechanisms that make their behavior legible at the call site. Other examples named in passing: explicit dependency arrays in hooks, explicit Zod schemas at IO boundaries, explicit error types on Server Actions.
- **The directive must be the first non-comment line.** No statements before it, no imports before it, no `'use strict'`. The string itself is literal (`'use client'`, `"use client"`, either quote style). A typo (`"use-client"`, `'use clinet'`) is silently ignored — no error, just runtime breakage in the Client Component path. The senior habit: copy-paste from a known-good file, never type by hand.
- **The structural enforcement problem.** Without enforcement, a developer can import a server-only module (DB client, secret-reading helper, Node `fs`) into a file that later gets imported from a Client Component. The build may or may not catch it; even when it builds, secrets can leak into the client bundle. The directive convention is necessary but not sufficient.
- **`server-only` — the package that fails the build on client import.** A trivially small npm package whose import is rigged to throw if it appears in the client bundle. Add `import 'server-only';` at the top of any file that must never run in the browser (database access, secret-using helpers, server-internal services). If a Client Component imports the file (directly or transitively), `next build` fails with a clear error pointing at the offending import chain.
- **`client-only` — the mirror package.** Same mechanism, opposite direction. Add `import 'client-only';` at the top of any file that must never run on the server (browser-API-bound helpers, libraries that read `window` on import). Less common in practice but earns its weight for browser-only third-party libraries the team wraps.
- **Next.js's built-in handling.** Next.js recognizes `server-only` and `client-only` imports internally; the package contents from npm are essentially marker files. The senior reach: install both as devDependencies of the app, add the imports at every file that crosses the boundary's intent, treat the rule as the team's compile-time contract.
- **The senior pattern — every server-only helper has the line.** `db/index.ts`, `lib/auth/session.ts`, `lib/email/send.ts`, action files: all start with `import 'server-only';`. The cost is one line; the payoff is that the bundle never silently ships server code.
- **`server-only` is not the same as `"use server"`.** Easy confusion. `import 'server-only'` says "this file errors if it reaches the client bundle." `'use server'` at the top says "every export here is a Server Action callable from the client." A `lib/db/index.ts` uses `server-only`; an `app/dashboard/_actions.ts` uses `'use server'`.
- **Watch-outs.** Directive must be the first non-comment line; typos in directives fail silently; `"use server"` does not make a file a Server Component (Server Components are the default everywhere); `"use server"` exports are RPC endpoints — anyone who can reach them can call them, validate inputs (Chapter 047); `server-only` and `'use server'` solve different problems; Context providers are Client-bounded — they need `"use client"`; importing a `"use client"` file from a Server Component is fine, importing it from another `"use client"` file is fine (the directive is a one-way door); third-party packages without directives sometimes need a wrapper file; the build error from `server-only` is the early warning system — don't suppress it.

What this lesson does not cover:

- The full Server Actions surface (`'use server'` as RPC, validation, errors, redirects) — Chapter 047.
- The exact serialization rules at the boundary (lesson 4 of chapter 034).
- Hydration (lesson 5 of chapter 034).
- Async Request APIs at depth — lesson 8 of chapter 036.
- Route handlers as the alternative to Server Actions — Chapter 050.

Estimated student time: 50 to 65 minutes. Load-bearing for every Server Action in Unit 7, every server-only helper in Units 6 and 9, and the security baseline in Chapter 085.

---

## Lesson 4 — What crosses the RSC wire

Structured-clone-compatible values plus React extensions (Promises, JSX, Server/Client/Action references), the rejection of functions and class instances, and the secrets-in-props leak the student must catch.

Topics to cover:

- **The senior question.** When a Server Component renders a Client Component and passes props, what exactly can those props contain, and why does the student see "Functions cannot be passed directly to Client Components" the first time they try to pass a callback? The lesson names the RSC wire format: structured clone plus React extensions, no functions, no class instances.
- **The RSC payload — what actually crosses.** The server renders the Server Component tree, then serializes the result into the RSC payload: a stream of instructions ("render this Client Component with these props," "here is a chunk of HTML," "resolve this Promise with this value"). The Client Component placeholders carry their props serialized into this format. The browser parses the stream and reconciles the resulting React tree.
- **Structured clone as the baseline.** The set of values the RSC wire can carry overlaps heavily with the browser's structured-clone algorithm: primitives (string, number, boolean, null, undefined, BigInt), plain objects, arrays, `Map`, `Set`, `Date`, typed arrays (Uint8Array, etc.), `RegExp`, `ArrayBuffer`. The student already knows structured clone from lesson 1 of chapter 005's `structuredClone`; RSC reuses the mental model.
- **React's extensions on top.** RSC also carries React-specific values: JSX (Server-rendered React tree); Promises (the client can `await` or use `React.use()` to consume them); Suspense boundaries; Client Component references; Server Action references; named symbols (`Symbol.for('foo')`).
- **What does not cross — the failure list.** Functions (a closure on the server cannot meaningfully run in the browser); class instances (the class is the server's, the wire has no constructor); Errors (only the message survives — full Error handling is Chapter 084); DOM nodes; React elements with non-serializable props; Symbols (except `Symbol.for`); WeakMap, WeakSet.
- **The two ways to "pass a function."** Wrong: define a regular function in a Server Component and pass it as `onSomething` — the build/runtime error is immediate. Right: define a Server Action (a `"use server"` function) and pass its reference — the RSC wire carries an opaque ID, the Client Component invokes it via a generated fetch under the hood. Server Actions are the only function-like value the wire carries; full mechanism in Chapter 047.
- **Class instances — the canonical failure.** Drizzle row objects are plain objects (fine); Date instances are fine (structured-clone supports them); a custom `User` class instance with methods is not. The senior pattern: shape data into plain objects at the database boundary, keep behavior on the server where the instance was created.
- **`Map` and `Set` cross.** The earlier RSC payload was JSON-shaped and required converting to arrays. The current implementation supports them directly. Senior reach: still prefer plain shapes when the consumer doesn't need the API of `Map`/`Set`, for one less moving part.
- **Promises cross.** A Server Component can pass a `Promise<T>` as a prop; the Client Component reads it with `React.use(promise)` and Suspends until it resolves. The canonical "start the request on the server, render the client UI immediately, resolve when ready" pattern. Chapter 035 owns Suspense and the streaming model.
- **JSX crosses — the `children` pattern revisited.** A Server Component can pass an already-rendered Server tree as a prop or as `children` to a Client Component. The Client Component renders the prop opaquely — it doesn't see the source. This is how server-rendered content lives inside a Client-interactive shell.
- **Secrets in props — the leak the student must catch.** Props passed to Client Components are visible in the RSC payload in the network panel. Never pass database connection strings, API tokens, full user records with hashed passwords, or anything else the server alone should see. The senior pattern: pick the fields the UI needs (`{ id, name, email }`), pass the slice, leave the rest on the server.
- **`toJSON` and customization — named once, dropped.** Not the senior reach in 2026; shape the data into a plain object before crossing the boundary.
- **Watch-outs.** "Cannot pass function" is the canonical first error; convert to a Server Action or move the handler inside the Client Component; class instances fail silently or with a confusing message — flatten to plain objects; Errors don't fully cross — use error boundaries (Chapter 035) and `error.tsx` for the user-visible surface; the RSC payload is visible in DevTools — treat it like any other network response; keep props narrow, both for security and for wire size; large server-rendered trees in props are still wire bytes; Promise props plus `React.use()` is the streaming pattern (Chapter 035); `Date` is fine, `dayjs.Dayjs` is a class instance and fails — pass the raw `Date` (Chapter 087).

What this lesson does not cover:

- Server Actions in full — Chapter 047.
- Suspense, `React.use()`, streaming — Chapter 035.
- The full caching model — Chapter 036.
- Error handling and error boundaries — Chapter 035 and chapter 084.
- The structured clone API itself in browser contexts (`postMessage`, `IndexedDB`) — Chapter 020 in passing.
- Hydration (lesson 5 of chapter 034).

Estimated student time: 50 to 65 minutes. Load-bearing for every Server-to-Client prop in the course, the Promise-streaming pattern in Chapter 035, and the data shape decisions in Unit 6.

---

## Lesson 5 — Hydration and its mismatch failure modes

The server-HTML-meets-client-React handshake, the canonical mismatch causes (`Date.now`, `Math.random`, locale, timezone, browser extensions, stale `.next/dev`), and the fixes via `useEffect`, `useId`, and narrow `suppressHydrationWarning`.

Topics to cover:

- **The senior question.** Why does the page render correctly on first load, then suddenly throw "Hydration failed because the server-rendered HTML didn't match the client" the moment a `Date.now()` lands in a Client Component? The lesson names hydration as the handshake between server-rendered HTML and the client React tree, the strict equality requirement that handshake imposes, and the small set of causes that break it in production.
- **What hydration is — the mental model.** The server renders Client Components to HTML during initial response, sends that HTML plus the RSC payload, the browser shows the HTML immediately, then React in the browser walks the same Client Component tree to attach event listeners and reconcile its virtual DOM with the existing HTML. If the second render doesn't produce the same output as the first, React refuses to attach — the mismatch is the bug.
- **Why hydration exists at all.** Without it, the user would see blank HTML, wait for JS to load, then see content. With it, content appears first, interactivity follows. The cost is the strict-equality constraint between the two renders.
- **The canonical mismatch causes.** Time-dependent values: `Date.now()`, `new Date().toLocaleString()`, `Math.random()`, anything that varies between server and client. Locale and timezone divergence: the server is UTC, the browser is Pacific. Browser-only API access during render: `typeof window !== 'undefined'` ternaries, `localStorage` reads, `navigator` reads. Browser extensions injecting attributes (`cz-shortcut-listen="true"` from Colorzilla, Grammarly's `data-gr-*` attributes) — common in production, not the developer's bug.
- **The senior fixes — in priority order.** First: don't render the non-deterministic value during initial render. Move it into a `useEffect` that runs only on the client after hydration, with a stable placeholder for the first paint. The pattern: render `null` or a skeleton on the server, swap in the real value after mount. This is the default reach for "current time," "user-specific formatting," and anything else that's intentionally client-only.
- **`useId` for stable IDs across renders.** When a component needs a unique ID (form labels, ARIA references), `useId()` produces the same value on server and client. Never use `Math.random()` or a counter — both break hydration.
- **`suppressHydrationWarning` — the narrow escape hatch.** A boolean prop that silences the mismatch warning *for that single element and its direct text content*. Senior reach: timestamps and intentionally-client-only values that can't be `useEffect`-deferred for UX reasons. Not a general suppression — the element below still hydrates strictly. Overuse hides real bugs.
- **The "fix it in `useEffect`" pattern in full.** Render the server-safe shape (placeholder, "Loading...", a fallback locale); in `useEffect`, set state to the client value; React re-renders past hydration with the right output. The user sees a stable handshake plus a quick swap.
- **The stale `.next/dev` cache — the 2026 production-of-frustration cause.** When the error message points at HTML the student can't find in their source, the build cache is the suspect. `rm -rf .next` and restart dev. Common enough that it earns explicit naming; the framework's error message hasn't caught up.
- **Browser extension noise — recognize and suppress.** Colorzilla injects `cz-shortcut-listen`, Grammarly injects `data-gr-*`, password managers inject `data-1p-*`. The user's browser, not the code. `suppressHydrationWarning` on the `<body>` is the senior workaround; the alternative is to ignore in dev and trust production users won't all run the same extensions.
- **Reading the React 19 hydration error.** The message now points at the exact element and shows server-vs-client output side by side. Read it, find the offending line, apply the right fix from the list above.
- **What is *not* hydration.** Server Components don't hydrate — they ship HTML plus reconciliation data, not interactivity. Only Client Components hydrate. A Server Component bug is a server bug, not a hydration bug. The student diagnoses correctly by reading whether the failing file has `"use client"`.
- **The bigger picture — hydration as the cost of SSR.** Pure CSR has no hydration but ships a blank page first. Pure SSG has no hydration but doesn't interact. The App Router's Server-plus-Client model has hydration as the seam between the two; mastering its failure modes is the cost of admission.
- **Watch-outs.** Non-deterministic values during initial render are the #1 cause; `useEffect` is the canonical escape; `useId` for stable IDs; never `Math.random()` or a counter for IDs; `suppressHydrationWarning` is narrow, not a band-aid; browser extensions are real; stale `.next/dev` cache is a real diagnostic step; only Client Components hydrate; Server Components don't have a hydration concept; the wire and the HTML are different transports — both have to be consistent.

What this lesson does not cover:

- Suspense, streaming, and how server-rendered async content arrives — Chapter 035.
- `error.tsx` and `global-error.tsx` — Chapter 035.
- Static vs. dynamic rendering and Cache Components — Chapter 036.
- Time, timezone, and locale handling in depth — Chapters 087 and chapter 088.
- `useId` semantics beyond hydration (form/ARIA at depth) — Chapter 028.

Estimated student time: 50 to 60 minutes. Load-bearing for every Client Component in the course, the form patterns in Unit 7, and the time/locale patterns in Unit 18.

---

## Lesson 6 — Quizz

Top 10 topics to quiz:

- The default — every component in `app/` is a Server Component unless a `"use client"` directive above it flips it.
- What Server Components can do that Client Components can't (async body, direct DB access, secrets, zero client JS) and vice versa (state, effects, event handlers, browser APIs).
- The composition rules — Server can render Client by import; Client can render Server only via `children` or other prop slots, never by import.
- The `"use client"` directive — first non-comment line in the file, marks the boundary, every transitive import becomes part of the client graph.
- The `"use server"` directive — file-level or inline-function; marks Server Actions (callable from client, executed on server); not the same as Server Components.
- Architectural Principle #6 — prefer explicit over magic, named at the directive boundary as the canonical case.
- `server-only` and `client-only` packages — structural enforcement that turns a leaked import into a build error; distinct from the directives.
- The RSC wire format — structured-clone-compatible values plus React extensions (Promises, JSX, Server/Client references, `Symbol.for`); functions and class instances do not cross.
- Server Actions as the only "function-like" value crossing the wire — pass a `"use server"` reference, not a regular callback.
- Hydration — only Client Components hydrate; the canonical mismatch causes (Date, Math.random, timezone, browser APIs, browser extensions) and the canonical fixes (`useEffect`, `useId`, `suppressHydrationWarning` narrowly).
