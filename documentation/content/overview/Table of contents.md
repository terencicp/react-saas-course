# Web Dev Course (2026) — Proposed Curriculum Structure (v3)

---

## Unit 1 — Setup and Toolchain

### Chapter 001 — The contract
- 1 Who this is for (Sets the reader profile, the production-code-review win condition, the evenings-not-bootcamp time shape, and a private self-check that recommends starting here, elsewhere, or with a fundamentals course first.)
- 2 The two pillars (Installs the course's operational filters — senior mindset over syntax, and the minimum viable 2026 stack — and states once why AI is deliberately absent from lesson material.)
- 3 The stack at a glance (Lays out a one-page map of every load-bearing tool grouped by role, with the senior reason each wins (or the trigger that would flip it), pinned to May 2026.)
- 4 Rusty, not new (Frames prerequisites as returning-developer territory, lists what is assumed without ceremony, what is re-taught at adult depth (and where), what is deliberately cut, and a litmus self-assessment.)
- 5 How to read this course (Names the defaults-vs-triggers reading rule, the canonical lesson anatomy, the inline placement of principles and patterns, the project repo and `degit` flow, and the hosted-service accounts (plus one cheap domain) needed later.)

### Chapter 002 — Runtime and package manager
- 1 Pinning the toolchain with mise (Install mise, pin Node 24 LTS in a `.mise.toml`, and make the runtime a property of the repo rather than the machine.)
- 2 pnpm and the post-Corepack package.json (Install pnpm through mise, write the minimum viable `package.json` with `packageManager` and `.npmrc`, and learn the four daily pnpm commands.)
- 3 The lockfile as a contract (Commit `pnpm-lock.yaml` as the deterministic resolution record, enforce `--frozen-lockfile` in CI, and guard against mixed package managers with `only-allow pnpm`.)
- 4 Three ways to run a .ts file (Partition `.ts` execution into native strip-types as the default, `tsx` past a named trigger (path aliases, JSX, decorators), and `tsc` reserved for library publishing or `--noEmit` type-checking.)

### Chapter 003 — The feedback loop
- 1 VS Code as a team artifact (Teaches the editor commitment, the minimum-viable extension set with one senior reason each, and the repo-owned configuration files (`.editorconfig`, `.vscode/extensions.json`, `.vscode/settings.json`) that make editor setup a teammate-shared surface rather than a personal preference.)
- 2 Biome, the single-binary linter and formatter (Teaches Biome as the 2026 default over ESLint+Prettier (single Rust binary, dependency-aware domains), the `next lint` removal in Next.js 16, the minimum-viable `biome.json` wired to `.editorconfig`, the four daily scripts, and the safe-versus-unsafe fix distinction.)
- 3 DevTools: the four panels that earn their keep (Teaches the senior workflows in Elements (live DOM and cascade), Network (open before the action, throttle, copy-as-fetch), Console (REPL, `$0`, `console.table`), and Application (cookies, storage, service workers), with React DevTools installed here for its first call in Unit 4.)

### Chapter 004 — The first project scaffold
- 1 Cloning the starter and the dev/build cycle (Fetch the course's pinned Next.js 16 scaffold with `degit`, read the file tree end to end, and run `pnpm dev` and `pnpm build` to commit the toolchain decisions from Chapters 002–003 into a real first commit.)
- 2 AGENTS.md as the next contributor's briefing (Read the starter's `AGENTS.md` to see what earns a place (thesis, pinned stack, layout, commands, conventions pointers) and what doesn't (aspirational prose, duplicated rules, hand-maintained file lists), with the deeper documentation doctrine deferred to Chapter 105.)
- 3 The strictness floor the project owns in tsconfig.json (Walk the project-owned half of `tsconfig.json` — `strict`, `noUncheckedIndexedAccess`, `noFallthroughCasesInSwitch`, `noImplicitOverride`, `forceConsistentCasingInFileNames`, the `@/*` path aliases — naming each flag by the bug class it catches and parking `exactOptionalPropertyTypes` as the conditional.)
- 4 The compatibility flags Next.js owns in tsconfig.json (Read the framework-owned half of the same file — `target`/`lib`, `module`/`moduleResolution: "bundler"`, the transpiler-alignment trio (`verbatimModuleSyntax`, `isolatedModules`, `esModuleInterop`), `jsx: "preserve"`, `noEmit`, the Next.js plugin, `next-env.d.ts` — under the rule that if you're tempted to edit a flag in this lesson, you're probably wrong.)
- 5 Type-safe environment variables with @t3-oss/env-nextjs (Wire build-time env validation with `@t3-oss/env-nextjs` and Zod 4 so a missing `DATABASE_URL` fails `pnpm build` before deploy, covering the `server`/`client` split, the `NEXT_PUBLIC_*` convention, the `.env.example` → `.env.local` pattern, and `SKIP_ENV_VALIDATION` as a deliberate escape hatch.)

---

## Unit 2 — JavaScript and TypeScript

### Chapter 005 — The JavaScript value model
- 1 Bindings, not boxes (Teaches what assignment actually does: primitive copy vs. shared object references, function-call pass-by-value-vs-reference, and shallow vs. deep copy with `structuredClone`.)
- 2 What === actually compares (Teaches value vs. reference equality, `Object.is` for `NaN` and signed zero, `Number.isNaN` over the coercing global, and why the course never writes `==`.)
- 3 Store cents, not dollars (Teaches IEEE 754 at the depth that bites, the integer-cents money rule, the `Number.is*` family, when `BigInt` earns its weight, and the `parseInt` vs. `Number` conversion choice.)
- 4 Why .length lies (Teaches code units vs. code points vs. grapheme clusters, `Intl.Segmenter` for user-perceived counts, `normalize` for visually-identical inputs, and the senior string-method surface.)
- 5 Backticks and tagged templates (Teaches template literals as the default for interpolation and multi-line strings, the tag-function mechanics, and `sql` and `dedent` as the canonical tagged-template cases.)
- 6 const binds, it doesn't freeze (Teaches `const` vs. `let` and when each earns its weight, block scope, the Temporal Dead Zone, hoisting demystified, and why `const` alone doesn't narrow types.)
- 7 Quiz

### Chapter 006 — Functions, naming, and control flow
- 1 Arrow by default, declaration on demand (Teaches the three function forms, the senior rule that arrow expressions bound to `const` are the 2026 default, and the narrow triggers (hoisting, named recursion, type-guard signatures) that earn a `function` declaration.)
- 2 Signatures that stay readable past two parameters (Teaches the two-positional-parameter rule and the options-object pattern, parameter defaults firing only on `undefined`, rest parameters and call-site spread, and the TypeScript ordering of required vs. optional parameters.)
- 3 Name for intent, not implementation (Teaches Architectural Principle #4 across the four naming surfaces (variables, functions, parameters, types), the boolean-prefix convention, and the three bad-name classes (implementation-leaking, vague abstractions, negated booleans).)
- 4 Guard clauses, ternaries, and exhaustive switch (Teaches flat control flow through early-return guards, expression-level ternaries, `switch` with `noFallthroughCasesInSwitch` and `assertNever`, the lookup-map alternative, and the loop forms a 2026 senior reaches for.)
- 5 The null-safe operator trio (Teaches `?.` for nullable access at each chain link, `??` over `||` for defaults (with the `0` / `''` / `false` trap), and `??=` for lazy initialization, plus the operator-precedence rules that force parentheses.)
- 6 Destructuring as the API call-shape (Teaches object and array destructuring with rename, defaults, and rest, the signature-level destructure that React and server actions consume, and the destructure-then-rebuild pattern that prevents accidental field forwarding.)
- 7 Closures: lexical capture by reference (Teaches closures as lexical capture by reference (not by value), the stale-closure trap in async code, and the three production sites the model later explains: Server Actions, `useEffect` cleanups, and route-handler factories.)
- 8 Quiz

### Chapter 007 — Picking the right container
- 1 The object as workhorse record (Read, build, and reshape a record-shaped value with dot and bracket access, the three construction sugars (shorthand, computed keys, spread), and the `Object.*` static surface including `Object.groupBy`.)
- 2 Arrays and the non-mutating update (Index arrays under `noUncheckedIndexedAccess`, reach for `.at()` and the ES2023 non-mutating update family (`.toSorted`, `.toReversed`, `.toSpliced`, `.with`), and recognize the mutating methods that React state forbids.)
- 3 The array method surface (Walk `.map`, `.filter` with type predicates, `.reduce`, the `.find` family, `.some`/`.every`, `.flatMap`, and `.forEach`, and learn the rule for when to drop out of a chain into a `for...of` loop.)
- 4 When Set and Map earn their weight (Pick `Set` for dedup and membership, `Map` for keyed lookup at scale, `WeakMap` for GC-coupled caches, and reach for the ES2025 Set composition methods and `Map.groupBy` that retire the lodash habit.)
- 5 Iteration and the lazy helpers (Learn the iteration protocol behind every iterable, default to `for...of` for side effects, and reach for the ES2025 `Iterator.prototype` helpers when the input is large, lazy, or short-circuited.)
- 6 Regex: the modern flavor (Write 2026-flavor regex with named capture groups, lookarounds, the `u` and `v` Unicode flags and property escapes, the `.matchAll` iterator surface, and the boundary where a parser replaces the regex.)
- 7 Quiz

### Chapter 008 — Typing values you know
- 1 Primitives, literals, and the four corners (The seven primitive types, literal unions as the senior reach for finite domains, and the `any`/`unknown`/`never`/`void` corners with the trigger that earns each.)
- 2 Object shapes: type, interface, and field modifiers (When to default to `type` (always) and reach for `interface` (declaration merging), paired with the per-field `?` and `readonly` modifiers plus the array-level `readonly T[]` and `Readonly<T>` cousins.)
- 3 Tuples: positions with labels (Tuple syntax with element labels, optional and rest positions, `readonly` tuples, and the concrete patterns (`useState`, custom hooks, `Object.entries`) where a tuple beats a named-field object.)
- 4 Dynamic keys: index signatures and Record<K, T> (The two forms for dynamic-keyed objects, the completeness payoff of `Record<LiteralUnion, V>`, and how `noUncheckedIndexedAccess` narrows reads differently across the open-keyed and finite-keyed cases.)
- 5 Composing types: unions and intersections (The `|` and `&` operators across literal, mixed-primitive, shape, and nullable unions plus shape-and-narrowing intersections, with the discriminated-union shape seeded for Chapter 009.)
- 6 Narrow, don't assert (Control-flow narrowing through `typeof`, equality, `in`, `instanceof`, `Array.isArray`, and discriminant fields, with the three legitimate triggers that earn `as` and `!` named as conditional escape hatches.)
- 7 Keeping literals narrow: as const and satisfies (The value-site freeze that keeps literal types from widening, the contract check that validates without losing the narrow, and the combined `as const satisfies T` idiom for typed-config patterns.)
- 8 Annotate the boundaries, infer the inside (The senior rule for where annotations earn their weight (parameters, exported APIs) and where inference wins (locals, return types, inline callbacks), plus the `import type` discipline that `verbatimModuleSyntax` enforces.)
- 9 Quiz

### Chapter 009 — TypeScript bug-class moves
- 1 Impossible states, unrepresentable (Teaches the discriminated-union shape, Architectural Principle #7, the canonical SaaS variants (request state, Result, event message, UI variant), and narrowing by a literal discriminant.)
- 2 States plus transitions (Teaches the flow state-machine pattern as discriminated unions extended with per-transition function signatures, per-state invariants, and the three canonical SaaS machines (optimistic mutation, upload, subscription).)
- 3 Exhaustiveness, enforced (Teaches type predicates (block-scoped narrow), assertion functions (scope-wide narrow), and the `assertNever` plus `satisfies never` idioms that make a missing variant a compile error.)
- 4 Branded IDs (Teaches the branded-string pattern (`unique symbol` and `__brand` forms), brand factories, the Zod and Drizzle integration points, and the line between IDs that earn a brand and strings that don't.)
- 5 Derive types from values (Teaches the `typeof V`, `keyof T`, and `T[K]` operators and the load-bearing 2026 idioms (`typeof ARR[number]`, `keyof typeof OBJ`) that keep types tracking the values they describe.)
- 6 The utility-type toolbox (Teaches the eleven daily-reach utility types grouped by what they reshape (`Partial`/`Required`/`Readonly`, `Pick`/`Omit`, `Record`, `NonNullable`, `Extract`/`Exclude`, `ReturnType`/`Parameters`, `Awaited`) and how they compose into derived types.)
- 7 Generics with constraints (Teaches generic functions and types, `extends` constraints (including `K extends keyof T`), default type parameters, the `const` modifier, and the senior 2026 wrapper idioms (`safeAction`, `requireRole`, `cache`).)
- 8 Quiz

### Chapter 010 — Modules as a graph
- 1 The four import-export shapes (Teaches the named, default, side-effecting, and dynamic export forms with their matching import surface, the type-only import discipline under `verbatimModuleSyntax`, and the bare-specifier resolution algorithm that picks the file behind every `import 'pkg'`.)
- 2 Walking the graph: evaluation, live bindings, and the client bundle (Teaches modules as a depth-first-evaluated directed graph with live-binding semantics, dynamic `import()` as a deferred edge that drives code splitting, and `"use client"` plus `import 'server-only'`/`'client-only'` as the module-graph rule that keeps server code out of the browser.)
- 3 Top-level await vs. lazy init (Teaches top-level `await` as a graph-level change that turns every upstream consumer async, the canonical `env.ts` shape, and the senior call between top-level await for cheap startup validation and a lazy `getDb()` for expensive or conditional setup.)
- 4 Augmenting third-party modules (Teaches the `declare module` pattern in dedicated `.d.ts` files to extend a published package's interfaces (Better Auth `Session`, Drizzle relations, `next-intl` messages) and tie branded IDs to the third-party session shape at the source.)
- 5 Quiz

### Chapter 011 — Async semantics
- 1 The event loop and the microtask queue (Teaches the three-part runtime model (call stack, microtask queue, macrotask queue), the tick recipe that drains microtasks before the next macrotask, and `await` as a microtask-paced suspension so the student can predict the order of output in any small async program.)
- 2 Promises: combinators and withResolvers (Teaches the Promise three-state model, the four combinators (`all`, `allSettled`, `any`, `race`) with the senior trigger and failure mode for each, and `Promise.withResolvers()` as the modern replacement for the deferred-pattern boilerplate when resolvers must live outside the constructor's executor.)
- 3 async/await: parallel by default, sequential by dependency (Teaches the dependency-check reflex that picks `Promise.all` over consecutive `await`s when no data flows between them, the N+1 trap inside `.map(async ...)` with its bounded (`Promise.all`), unbounded (`pMap`), and database-batched fixes, `for await...of` for streams and paginated APIs, and the `return await` discipline that preserves stack traces.)
- 4 Cancellation with AbortController and AbortSignal (Teaches the `{ signal }` parameter shape every modern web API speaks, the canonical user-cancel pattern with `AbortError` discrimination at the catch, `AbortSignal.timeout(ms)` as the 2026 replacement for `Promise.race` timeouts, and `AbortSignal.any([...])` for composing user-cancel, timeout, and shutdown signals into one.)
- 5 Quiz

### Chapter 012 — Errors as a first-class concern
- 1 Two channels: throw the unexpected, return the expected (Teaches the `try`/`catch`/`finally` mechanics, the async-throw flow, the "only throw `Error`" rule, and the heuristic for routing each failure into either a `Result<T, E>` return or a throw the framework boundary catches.)
- 2 Narrowing the catch and authoring domain errors (Teaches the `unknown`-in-catch narrow with `instanceof Error` and the `ensureError` normalizer, small custom `Error` subclasses with literal-typed `name` discriminants, `Error.cause` for re-wrap and chain walking, and the `error.name` fallback for `AbortError`, `TimeoutError`, and the cross-realm `instanceof` gotcha.)
- 3 Quiz

### Chapter 013 — JSON, classes, and the Temporal pivot
- 1 JSON at the wire boundary (Teaches `JSON.parse`/`JSON.stringify`, the four serialization gotchas (`undefined`, `Date`, `BigInt`, `NaN`/`Infinity`), and the parse-to-`unknown`-then-validate-with-Zod discipline that closes the type story at every wire seam.)
- 2 Classes, narrowly (Teaches the three sites where classes still earn their weight in 2026 SaaS code (custom `Error` subclasses, SDK adapters, the rare stateful domain class) and the minimum class surface (constructor, `readonly`/`#field`, arrow-field methods, static factory) — refusing inheritance hierarchies, abstract classes, mixins, decorators, and accessors.)
- 3 Date's problems and the Temporal pivot (Teaches `Date`'s known design issues (zero-indexed months, in-place mutation, timezone as second-class, no real duration type, the `Invalid Date` sentinel) and the senior 2026 pivot to Temporal — Stage 4 March 2026, unflagged in Node 26, with `temporal-polyfill` for the Node 24 LTS line.)
- 4 Quiz

---

## Unit 3 — HTTP and the Browser Platform

### Chapter 014 — How a request becomes a page
- 1 URL bar to first byte (Walk the four-step network leg from a URL commit to the first byte of HTML — DNS resolution, TCP/QUIC connection, the TLS handshake, and the HTTP request — and read each step on the DevTools Network waterfall against the 2026 HTTP/3-over-QUIC protocol stack.)
- 2 First byte to pixels (Trace the browser-side pipeline from HTML bytes to an interactive page — parser to DOM, CSSOM, render tree, layout, paint, composite — and overlay the SSR plus hydration model that Unit 4 and Unit 5 will land on.)
- 3 HTTPS on localhost with mkcert (Install the TLS 03 handshake and certificate-chain mental model at debug depth, then wire a local CA with `mkcert` to unblock the secure-context-required APIs (cookie `Secure`, Clipboard, WebCrypto) that silently fail on `http://localhost`.)
- 4 Quiz

### Chapter 015 — The HTTP contract every endpoint signs
- 1 Methods and the safe-to-retry contract (Teaches the GET/POST/PUT/PATCH/DELETE palette, idempotency as the anchor that decides whether a network blip can be retried, and the `Idempotency-Key` header pattern that makes non-idempotent POSTs retry-safe.)
- 2 Status codes and Problem Details (Teaches the 2xx/3xx/4xx/5xx codes a SaaS engineer reaches for, the 400-vs-422-vs-409 discriminations, the 4xx/5xx split as the on-call paging contract, and RFC 9457 Problem Details as the 2026 default error-body shape.)
- 3 Headers as the metadata channel (Teaches the header surface a SaaS engineer touches — content negotiation, `Cache-Control` directives, `Authorization` schemes, rate-limit signaling, security-baseline headers, and the custom-header naming convention — and which headers infrastructure reads versus which the application sets.)
- 4 Quiz

### Chapter 016 — URLs, origins, and security boundaries
- 1 Parse, don't concatenate (Teaches the URL as a structured value with origin/pathname/search/hash, `new URL()` and `URLSearchParams` as the senior reach, percent-encoding rules (including the `%20`-vs-`+` split), and the bug classes string concatenation produces.)
- 2 Origin is the unit of browser trust (Teaches origin as the `(scheme, host, port)` tuple versus site as `(scheme, eTLD+1)`, what the same-origin policy blocks versus what it always allows, and the load-bearing point that the policy protects the user (not the server) by gating the response, not the request.)
- 3 The preflight dance (Teaches CORS as the opt-in that loosens same-origin, the simple-vs-preflighted decision, the `Access-Control-Allow-*` response-header palette, the wildcard-with-credentials trap, and the canonical browser error messages with their fixes.)
- 4 Quiz

### Chapter 017 — Cookies and the trust model
- 1 Set-Cookie attributes and the safe default (Reads the `Set-Cookie` header attribute by attribute — `HttpOnly`, `Secure`, `SameSite`, `Path`, `Domain`, `Max-Age`, the `__Host-` prefix, and the `Partitioned` (CHIPS) attribute — names the senior default (`HttpOnly; Secure; SameSite=Lax; Path=/`), maps each attribute to the failure mode it prevents, and threads the Next.js `cookies()` helper and the 2026 third-party-cookie reality.)
- 2 Quiz

### Chapter 018 — The DOM and event substrate
- 1 The DOM as a live tree of typed nodes (Teaches the DOM as a tree of typed node objects built once at parse time and mutated thereafter, walks the `Node` / `Element` / `HTMLElement` / tag-specific subclass hierarchy, names the access surface (`getElementById`, `querySelector`, `closest`, `matches`) and the live-vs-static collection distinction (`childNodes`, `children`, `NodeList`, `HTMLCollection`), and frames every primitive against its rare 2026 reach behind refs, portals, and DevTools.)
- 2 Attributes vs. properties: parsed state vs. live state (Teaches the split between HTML attributes (the strings the parser captured at load time) and DOM properties (the live values JavaScript reads and mutates), walks the four canonical patterns (identical-name pairs, renamed properties like `class`/`className` and `for`/`htmlFor`, default-vs-current pairs on `value`/`checked`/`selected`, and attribute-only or property-only cases), maps every example to its JSX prop name, and installs the recognition vocabulary that makes hydration mismatches and boolean-attribute traps legible.)
- 3 The event model: capture, bubble, delegate (Teaches the three-phase DOM event model (capture, target, bubble), installs event delegation as the canonical pattern with `event.target.closest` and `data-*` hooks, distinguishes `event.target` from `event.currentTarget` and `preventDefault` from `stopPropagation`, names the `addEventListener` option surface (`capture`, `once`, `passive`, `signal`), and locks in the 2026 cleanup reach with `AbortController` and the `{ passive: true }` default for scroll, wheel, and touch listeners.)
- 4 Quiz

### Chapter 019 — Fetch and live streams
- 1 The universal HTTP client (Write any `fetch` call with the senior shape — `Request`, `Response`, `Headers`, `FormData`, the body consumer methods, `AbortSignal.timeout`, the `if (!response.ok)` branch, and the Zod parse on the success path.)
- 2 Streaming progress with SSE (Read response bodies as `ReadableStream` chunks, emit Server-Sent Events from a Next.js Route Handler, consume them with `EventSource` or `fetch`, and pick between SSE, WebSockets, and polling.)
- 3 Quiz

### Chapter 020 — Browser capability APIs
- 1 Web Crypto: random IDs and HMAC signatures (Installs the `crypto` global's three surfaces — `randomUUID`, `getRandomValues`, and the asynchronous `subtle` HMAC sign / verify pair — with constant-time comparison as the timing-attack mitigation for any signature check.)
- 2 The Clipboard API: the Copy button surface (Installs `navigator.clipboard.writeText` as the senior copy reach, the secure-context-plus-user-activation constraints, and the canonical "Copy" button shape with `'use client'`, `try/catch`, feedback state, and `aria-label`.)
- 3 Blob, File, and URL.createObjectURL: the upload primitives (Installs the three binary primitives every file-upload UI builds on — `Blob`, `File`, and `URL.createObjectURL` with `revokeObjectURL` cleanup — and foreshadows the R2 presigned-PUT flow from pick to preview to direct upload.)
- 4 Web Storage: where localStorage earns its weight (Installs the `localStorage` and `sessionStorage` API surface, the SSR safety dance under Next.js 16, and the cookie / URL state / server state / `localStorage` / `useState` decision tree with what `localStorage` is explicitly not for.)
- 5 Quiz

---

## Unit 4 — React, JSX, and Tailwind

### Chapter 021 — JSX and HTML semantics
- 1 JSX is property syntax for HTML (The JSX surface every later lesson rides on: the rename table (`className`, `htmlFor`, camelCase events), curly-brace expressions, fragments, void self-close, list keys tied to data, and the `&&` zero trap.)
- 2 The Next.js root layout owns the document shell (The `app/layout.tsx` Server Component renders `<html lang>` and `<body>`, the metadata API writes the `<head>`, and `'use client'` belongs on a `<Providers>` child, not the root.)
- 3 Landmarks and the heading outline (The six landmark elements (`<header>`, `<nav>`, `<main>`, `<aside>`, `<article>`, `<section>`, `<footer>`) plus the strict `<h1>`-through-`<h6>` hierarchy form the page outline assistive tech navigates.)
- 4 Actions, navigations, and item sequences (`<button type>` for actions versus `<a href>` and `<Link>` for navigation, `target="_blank"` paired with `rel="noopener noreferrer"`, `aria-label` on icon-only buttons, and `<ul>`/`<ol>` for related parallel items.)
- 5 Forms as a contract with the server (`<form>`, typed `<input>`s, `<label htmlFor>`, `<fieldset>`/`<legend>`, the `name` attribute as the `FormData` key, `autoComplete` for autofill, and native constraints as UX paired with server-side Zod.)
- 6 data-*, aria-*, and the <table> decision (`data-*` for script hooks (delegation, tests, Tailwind state), `aria-*` for assistive-tech signals (`aria-label`, `aria-current`, `aria-expanded`, `aria-pressed`, `role="alert"`), and `<table>` with `<th scope>` and `<caption>` only when the data is genuinely tabular.)
- 7 Quiz

### Chapter 022 — Tailwind v4 inside the React component
- 1 Utility-first on JSX (Teaches the utility-class families, the theme scale, prefix-and-colon variants, opacity modifiers, and arbitrary values as the escape hatch.)
- 2 CSS-first config in globals.css (Teaches the v4 directives — `@import "tailwindcss"`, `@theme` tokens, `@utility`, `@custom-variant`, `@container`, `@source`, `@plugin` — that replace `tailwind.config.ts`.)
- 3 Composing classes with cn() (Teaches the `clsx` + `tailwind-merge` helper, the defaults-then-`className`-last override pattern, and conditional class forms for component props.)
- 4 Variants that read DOM state (Teaches `data-*`, `aria-*`, `group-*`, `peer-*`, `has-*`, `*:`, `not-*`, and positional variants so state-driven styling skips `useState`.)
- 5 Dark mode via semantic tokens (Teaches the shadcn-style `@custom-variant dark` plus `@theme` and `.dark` OKLCH token overrides so components ship one theme-agnostic class string.)
- 6 Theme switching without FOUC (Teaches the `next-themes` `<ThemeProvider>` wiring, `suppressHydrationWarning`, the `useTheme()` hook, and a hydration-safe `<ThemeToggle>`.)
- 7 Quiz

### Chapter 023 — The cascade, inheritance, and design tokens
- 1 How the browser picks a winning rule (Teaches the four-step cascade algorithm (origin, layer, specificity, source order), Tailwind v4's `theme`/`base`/`components`/`utilities` layers, specificity weights and `:where()`, why `!important` is a smell, and how to trace conflicts in the DevTools Computed panel.)
- 2 What flows down the DOM tree (Teaches CSS inheritance per property family (typography, color, custom properties inherit; box-model, layout, background don't), the `inherit`/`initial`/`unset`/`revert` keywords, form elements as inheritance-rebels, `currentColor` for SVG icons, and the atomic-utility consequence (typography on `<body>`, box-model per element).)
- 3 Preflight, the deliberately blank canvas (Teaches what Preflight strips (heading sizes, list bullets, link underlines, form-element typography, default margins, `box-sizing`), where it lives in `@layer base`, the two legitimate carve-outs (`@tailwindcss/typography` with `prose` for Markdown, scoped overrides for third-party widgets), and why senior devs never strip it globally.)
- 4 Custom properties and the three-tier token model (Teaches CSS custom properties as runtime-reactive inheriting bindings, the Tailwind `@theme`-to-utility flow, subtree overrides for theming and multi-tenancy, reading and writing tokens from JavaScript and React inline styles, the three-tier token model (primitive, semantic, component) with naming conventions, and `@property` for animatable typed properties.)
- 5 Quiz

### Chapter 024 — Layout and sizing
- 1 The box model and the inline/block axis (How the four boxes compose under `border-box`, the Tailwind `--spacing` scale, margin collapse as a smell, logical `ps-*`/`pe-*`/`inset-s-*` utilities, and `mx-auto` as the one centering case where margin still earns its weight.)
- 2 Display modes and the hide decision tree (The choice between `block`, `inline`, `inline-block`, `flex`, `grid`, and `contents` as layout primitives, plus the `display: none` / `visibility: hidden` / `aria-hidden` decision tree for the three ways to hide an element.)
- 3 Flexbox, the 1D primitive (The flex container's main and cross axes, the `flex-1` / `flex-auto` / `flex-none` / `shrink-0` item sizing forms, `justify-*` vs. `items-*` alignment, `gap` as the spacing default, the `min-w-0` companion fix, and the five canonical layouts a senior reaches for.)
- 4 Grid, the 2D primitive (Explicit tracks, the `fr` unit, `repeat(auto-fit, minmax(...))` for responsive without breakpoints, `grid-template-areas` for page shells, `subgrid` for nested alignment, `place-items-*` shorthands, item placement, and the flex-vs-grid decision.)
- 5 Sizing, viewport units, and aspect-ratio (The `w-*` / `h-*` / `size-*` / `min-*` / `max-*` sizing primitives, the `vh` / `dvh` / `svh` / `lvh` viewport-unit family with `min-h-dvh` as the iOS reflex, `aspect-ratio` for zero-CLS media containers, intrinsic vs. extrinsic sizing, and `clamp()` for fluid sizes without breakpoints.)
- 6 Gap, the universal spacing default (Why `gap` replaces sibling-margin tricks and `space-x` / `space-y` inside flex and grid containers, the gap-vs-margin decision, `divide-x` / `divide-y` for visible hairlines between items, and the padding / gap / margin parallel.)
- 7 Position and inset utilities (The five `position` modes (`static`, `relative`, `absolute`, `sticky`, `fixed`), containing-block rules with the `relative` parent reflex for `absolute` children, the physical and logical `inset-*` family, canonical layouts for badges / sticky headers / toasts / drawers, and CSS anchor positioning plus the Popover API as forward references.)
- 8 Overflow and scroll containers (The overflow modes (`visible` / `hidden` / `clip` / `auto` / `scroll`), `overscroll-behavior` for the iOS scroll-chain and pull-to-refresh bugs, `scrollbar-gutter: stable` for layout stability, sticky-inside-overflow, the page-scroll vs. app-shell-scroll decision, and `scroll-snap-*` as the modern carousel primitive.)
- 9 Stacking context and z-index (How z-index is scoped to its stacking context, the trigger list (`opacity < 1`, `transform`, `filter`, `position: fixed/sticky`, `isolation: isolate`, and friends), the canonical trapped-modal bug, the three fixes (portal to `<body>`, `isolation: isolate`, restructure the DOM), and z-index tier conventions.)
- 10 Quiz

### Chapter 025 — The visual surface
- 1 Type, scale, and the reading surface (Teaches the system-plus-`next/font` stack, Tailwind's `text-*`/`leading-*`/`tracking-*` scales, `text-balance` and `text-pretty` reflexes, `max-w-prose` reading width, and the `truncate` / `line-clamp-*` / `tabular-nums` utilities the student writes daily.)
- 2 OKLCH, color-mix(), and the alpha syntax (Teaches OKLCH as the token storage form, `color-mix(in oklch, ...)` for runtime mixing, the `bg-blue-500/50` alpha syntax and how it compiles to `color-mix()`, semantic tokens over primitives, `opacity` vs. per-property alpha, and `prefers-color-scheme` vs. the `.dark` class.)
- 3 Borders, radius, and the elevation scale (Teaches `border` / `border-*` / `divide-*`, the `rounded-*` scale, `outline` vs. `border` for focus rings, `ring-*` as the multi-layer shorthand, the `shadow-*` elevation tiers, `drop-shadow` vs. `box-shadow`, and `backdrop-filter` for glass-morphism headers.)
- 4 Pseudo-classes and the :has() parent selector (Teaches `:focus-visible` as the canonical focus reflex, `:focus-within` for parent-of-focused, the disabled/checked/invalid state pseudo-classes, `:has()` and the JavaScript class toggles it retired, `:not()`, the `::placeholder` / `::selection` pseudo-elements, and the iOS sticky-hover gate.)
- 5 Motion: transitions, keyframes, and tw-animate-css (Teaches `transition-*` for property motion (with `transform` and `opacity` as the cheap properties), `animate-*` with `@keyframes` declared in `@theme`, `tw-animate-css` as the shadcn dialog/sheet/accordion dependency, the `data-[state=open]:animate-in` choreography pattern, and `prefers-reduced-motion` with the `motion-reduce:` variant.)
- 6 Breakpoints and the mobile-first reflex (Teaches mobile-first as the senior default, the Tailwind `sm`/`md`/`lg`/`xl`/`2xl` scale, breakpoints as content-driven not device-driven, the `prefers-*` media-feature family, `@media (hover: hover)` against the iOS sticky-hover bug, and the `hidden md:block` / `md:hidden` visibility pattern.)
- 7 Container queries for component-level layout (Teaches `container-type: inline-size` as the senior default, `@container` plus the `@sm:` / `@md:` Tailwind variants, the `cqi` unit with `clamp()` for fluid component typography, named containers for nested structures, and the viewport-vs-container decision rule.)
- 8 Quiz

### Chapter 026 — Components and composition
- 1 The typed props contract (Teaches how to write a React 19 component as a typed function of props, using `ComponentProps`, variant unions, default destructuring, and the `className`-plus-`...rest` discipline.)
- 2 Children and compound components (Teaches `children: ReactNode`, the shadcn-style compound-component pattern for multi-region UIs, prop-as-slot for single named regions, render props as a recognition-only fallback, and the conditional-render `0`-falsy trap.)
- 3 Polymorphism with Slot and CVA (Teaches the shadcn-style polymorphic component built from `@radix-ui/react-slot` plus `asChild`, the `class-variance-authority` variant table with `VariantProps` and `compoundVariants`, and why this pair beats a generic `as` prop.)
- 4 Refs as a regular prop (Teaches React 19's ref-as-prop model, the `Ref<T>` and `RefObject<T>` types, ref callbacks with the new cleanup return, merging multiple refs onto one node, and `useImperativeHandle` as the rare escape valve.)
- 5 Portals and the layout escape (Teaches `createPortal` for modals, toasts, and anchored popovers, the SSR `document` guard, the accessible-modal contract (focus trap, scroll lock, `Esc`), the native `<dialog>` and CSS anchor-positioning alternatives, and why events still bubble through the React tree.)
- 6 Quiz

### Chapter 027 — The render model
- 1 What triggers a render (Render as a function call re-run, the three triggers (own state, parent, context), `Object.is` on props, inline literals as identity churn, and the React Compiler retiring most manual memoization.)
- 2 Reconciliation and the key prop (How React diffs trees by element type, identifies siblings by position, uses `key` as explicit identity, and why index-as-key breaks reorderable lists.)
- 3 The purity contract (Render as a pure function of props and state, the no-mutation and no-side-effect rules, why concurrent rendering and the React Compiler depend on it, and the DevTools badge as your audit signal.)
- 4 State is a snapshot (Each render closing over its own state, the `setCount(count + 1)` bug, the updater form for sequential updates, React 19 automatic batching, `flushSync` as the opt-out, and immutable updates that avoid the `Object.is` bailout.)
- 5 Remounting with key (Using a `key` change to discard local state on identity switches, the canonical record-bound form fix, the animation-replay and button-bump variants, and when to lift or derive state instead.)
- 6 Synthetic events (The `SyntheticEvent` wrapper, delegation at the React root, typed handlers parameterized by element, `e.currentTarget` over `e.target`, `e.key` and modifiers for keyboard input, and pointer events as the unified mouse/touch/pen primitive.)
- 7 Quiz

### Chapter 028 — Hooks for holding state
- 1 The useState surface and lazy initialization (Teaches the `useState` signature, typing pitfalls, the `Object.is` bailout, immutable-update reflex, lazy initializer form, setter stability, and what `useState` is not for.)
- 2 Derive in render, do not mirror into state (Teaches that values computable from existing props and state belong in the function body, names the canonical mirror-prop-into-state-and-sync-with-effect anti-pattern, and lands the three fixes (derive, lift, `key`-reset).)
- 3 The four homes for state (Teaches the local-lifted-URL-server decision tree, the colocate-then-lift-on-demand reflex, URL state with `nuqs` as the 2026 reach, and the prop-drilling-is-not-a-context-bug distinction.)
- 4 useReducer when transitions multiply (Teaches the threshold where coordinated `useState`s become a reducer, the discriminated-union action shape, the reducer purity contract, lazy init via the `init` argument, and the async-lives-in-the-handler rule.)
- 5 useRef as the non-rendering escape hatch (Teaches the two flavors of ref (DOM nodes and instance values), the state-vs-ref rule ("does the JSX read it?"), the four canonical DOM-ref reaches, the don't-read-or-write-during-render rule, and how refs interact with the React Compiler.)
- 6 useId for ARIA wiring across SSR (Teaches the position-in-the-tree derivation that keeps IDs stable across server and client, composing multiple IDs from one call, the label-input-error wiring pattern, and the not-for-list-keys rule.)
- 7 Quiz

### Chapter 029 — Effects, context, and concurrent hooks
- 1 Strict Mode is the messenger (How `<StrictMode>` double-invokes renders, initializers, and the effect lifecycle in dev so impurity and missing cleanups surface before production.)
- 2 useEffect as synchronization (The `useEffect` signature, the setup/cleanup/resync lifecycle, the four canonical cleanup pairings, abort and ignore-flag race patterns, and the dependency-array contract.)
- 3 useEffectEvent and the non-reactive seam (How `useEffectEvent` lets an effect read latest props and state without re-running, the reactive vs. non-reactive distinction, and the call-site restrictions that make it safe.)
- 4 You probably don't need an effect (The five-quadrant audit (derive, handle, server, cache, sync) and the catalog of effect anti-patterns paired with their correctly shaped replacements.)
- 5 useContext without the re-render storm (`useContext` as propagation primitive, the every-consumer-re-renders footgun, and the three mitigations: split contexts, separate state from dispatch, and stable provider values.)
- 6 Marking updates as non-urgent (`useTransition` and `useDeferredValue` as priority markers (not speed boosts), the wrap-the-setter vs. wrap-the-value cut, async transitions, and the Suspense interaction that keeps old UI visible.)
- 7 Reading promises with use() (The `use()` primitive for unwrapping promises into Suspense and reading context conditionally, the stable-promise rule, and the Server-to-Client streaming pattern that replaces effect-based fetching.)
- 8 Rules of hooks and the lint that enforces them (Why hooks must run at the top level in the same order every render (the indexed-slot mechanic), the `use*` naming contract, and the two ESLint rules that enforce structure and dependencies.)
- 9 Quiz

### Chapter 030 — Custom hooks and the compiler-era memoization cut
- 1 Extracting custom hooks (The `use*` naming contract, the share-code-not-state rule, the three-condition extraction threshold, canonical hook shapes and generics, and the 2026 catalog of useful custom hooks.)
- 2 The React Compiler (What the compiler auto-memoizes, how to enable it in Next.js 16 (`reactCompiler: true` plus `babel-plugin-react-compiler`), the annotation mode for incremental adoption, the `'use no memo'` escape hatch, and how to verify it via the DevTools `Memo` badge.)
- 3 Memoization as escape hatch (The four narrow cases where `useMemo` / `useCallback` / `React.memo` still earn their weight, the 2020-era reflexes to stop (blanket memoization, premature `dynamic()`, blanket `<Suspense>`), and the measure-then-memoize workflow with comment discipline.)
- 4 Quiz

### Chapter 031 — shadcn/ui and the accessibility baseline
- 1 Own the source, not the dependency (Teaches the shadcn/ui copy-into-repo model — the CLI workflow, `components.json` config, Radix-vs-Base engine choice, `asChild` slot composition, semantic-token theming, the fork threshold, and the registry namespace system.)
- 2 The four commitments (Consolidates the four discipline-level accessibility commitments — keyboard navigation, WCAG 06 AA contrast, `prefers-reduced-motion`, and touch target size — and names semantic HTML as the first move before any ARIA.)
- 3 No ARIA is better than bad ARIA (Teaches the four ARIA surfaces a SaaS engineer reaches for — roles, labels, descriptions, and live regions — the icon-only button label pattern, the `sr-only`/`aria-hidden`/`hidden` decision tree, the live-region pre-mount rule, and `role="status"` vs. `role="alert"`.)
- 4 Where focus belongs (Teaches focus management across the three canonical SaaS situations — modal focus traps (Radix-handled), the route-change focus reflex Next.js does not provide, and post-submission focus — plus skip links, the `disabled` vs. `aria-disabled` decision, and the DOM-order rule for tab order.)
- 5 Four states, not one (Teaches the loading/empty/error/populated component contract — `Skeleton` over spinners, `Empty` with a CTA, `Alert` with retry, the accessibility pairing for each state, and the discriminated-union state model that replaces three booleans.)
- 6 Quiz

### Chapter 032 — Project: themed product surface
- 1 The bar and the brief (Frame the static marketing surface as a SaaS pattern, state the seven "Done when" verifications, show the final UX at three widths, set the scope cut, and clone the starter.)
- 2 Tour the starter (Walk the file tree, read the `@theme` token block, `ThemeProvider` wiring, `components.json`, typed `data.ts`, page placeholders, and `next.config.ts`, then confirm `pnpm dev` renders the shell with system theme respected.)
- 3 Header, hero, and feature grid (Build the semantic header with desktop nav, the hero with `<Button asChild>` CTAs and a CSS-only `ThemeAwareImage`, and a `cva`-driven `FeatureCard` mapped into a responsive three-column grid.)
- 4 Pricing, footer, and a flicker-free theme toggle (Compose the pricing cards with a data-driven featured tier, build the three-column footer, and wire a `next-themes` toggle that respects `prefers-reduced-motion` and survives hard reload without hydration warnings or FOUC.)
- 5 Mobile drawer with scroll lock (Write the `useLockBodyScroll` hook that restores prior overflow on cleanup, then drop it inside a shadcn `Sheet`-based `MobileNav` that traps focus, closes on `Esc` and link click, and keeps the desktop and mobile navs single-source via `hidden md:flex` / `md:hidden`.)
- 6 Verify clause by clause (Walk every "Done when" check — no-FOUC reload, Lighthouse 100, keyboard-only traversal, reflow at 360/768/1280, drawer focus trap, scroll lock, and `Esc` close — plus an axe DevTools audit, and name the senior calls one more time.)

---

## Unit 5 — Next.js and the App Router

### Chapter 033 — File-system routing with the App Router
- 1 File tree, page.tsx, and co-location (Teaches how folders under `app/` become URL segments, how `page.tsx` makes a route routable, and the feature co-location rule that puts route-specific code under `_components/` and `_lib/` private folders.)
- 2 Layouts and route groups (Teaches `layout.tsx` as the persistent shell that composes down the tree, the layout/page render boundary, `template.tsx` for the remount case, and route groups (`(folder)`) for organizing siblings under distinct layouts without affecting the URL.)
- 3 Dynamic and catch-all segments (Teaches `[param]` for single dynamic segments, `[...slug]` and `[[...slug]]` for variable-depth URLs, why `params` is a Promise in Next.js 16, and validating captured strings with Zod before they hit a query.)
- 4 Navigation primitives (Teaches `<Link>` for client-side soft navigation with intelligent prefetching, `useRouter().push` for programmatic moves, and the throwing trio `redirect()` (307), `permanentRedirect()` (308), and `notFound()` for server-side flow control.)
- 5 Parallel routes and slots (Teaches `@slot` folders as named props on a layout that render and stream independently, `default.tsx` as the unmatched-slot fallback, and the canonical list-plus-detail surface where both panes live under one URL.)
- 6 Intercepting routes and URL-backed modals (Teaches the `(.)`, `(..)`, `(..)(..)`, and `(...)` prefixes for intercepting soft navigations, the always-paired non-intercepting sibling for direct visits, and the combined parallel-plus-intercepting pattern that gives modals a real, shareable, refreshable URL.)
- 7 Quiz

### Chapter 034 — The server / client boundary
- 1 Server Components as the default (Renders on the server only, ships zero client JS, supports async bodies with direct DB and filesystem access, and composes with Client Components through import or `children`.)
- 2 Client Components and pushing the boundary down (The two-render model (server HTML plus browser hydration), what earns a `"use client"` boundary, the cost in client JS, and the senior reflex of keeping the boundary at the smallest interactive leaf.)
- 3 Directives and server-only enforcement (`"use client"` and `"use server"` semantics at the file head, Architectural Principle #6 (prefer explicit over magic), and the `server-only` / `client-only` packages that turn a leaked import into a build error.)
- 4 What crosses the RSC wire (Structured-clone-compatible values plus React extensions (Promises, JSX, Server/Client/Action references), the rejection of functions and class instances, and the secrets-in-props leak the student must catch.)
- 5 Hydration and its mismatch failure modes (The server-HTML-meets-client-React handshake, the canonical mismatch causes (`Date.now`, `Math.random`, locale, timezone, browser extensions, stale `.next/dev`), and the fixes via `useEffect`, `useId`, and narrow `suppressHydrationWarning`.)
- 6 Quiz

### Chapter 035 — Loading, errors, and the four async files
- 1 Suspense, the fallback contract (What the user sees while a Server Component awaits: `<Suspense fallback>` as React's declarative loading boundary, the two suspending shapes (async Server Components and `React.use()` on a streamed Promise), the unit-of-UX rule for placement, nested-boundary composition, and the `key` prop for re-suspending on param change.)
- 2 Streaming a page in chunks (How the App Router flushes the shell first and resolved boundaries later: chunked HTTP transport, parallel data fetching with one Suspense boundary per independent read, `Promise.all` versus parallel boundaries, and the above-the-fold and sequential-await anti-patterns that defeat streaming.)
- 3 The three segment files (The file conventions that wrap a route segment in Suspense, an Error Boundary, and a 404 surface: `loading.tsx` as Server-Component fallback, `error.tsx` as a `"use client"` boundary with `error` and `reset` props, `not-found.tsx` paired with `notFound()` from `next/navigation`, and their composition around `page.tsx`.)
- 4 Catching the root layout (`global-error.tsx` as the only boundary above the root layout: why `error.tsx` cannot catch its own layout, the file's `"use client"` requirement, its responsibility for `<html>` and `<body>`, its production-only behavior, and the styling and monitoring constraints of a page that must not itself fail.)
- 5 Quiz

### Chapter 036 — The Cache Components rendering model
- 1 Dynamic by default (How `cacheComponents: true` flips every route to dynamic-by-default with per-component opt-in caching, and the explicit signals (`params`, `searchParams`, `cookies()`, `headers()`, `draftMode()`, `connection()`) that mark a code path dynamic.)
- 2 Shells and holes with PPR (How Partial Prerendering ships a cached static shell from the edge and streams dynamic holes through Suspense boundaries, plus the pure-static and pure-dynamic degenerate cases.)
- 3 The use cache directive (The three placements (page, component, function) of `use cache`, the compiler-generated cache key, the serializable-arguments-and-return-value contract, and the closure rules cached functions must obey.)
- 4 Lifetimes and tags (The three-number `cacheLife` contract (stale, revalidate, expire) with its preset profiles, and `cacheTag` naming conventions for entity-level and record-level invalidation.)
- 5 Per-request memoization with React cache() (React's `cache()` as the request-scoped deduplication primitive for work that depends on request data, contrasted with `use cache` for cross-request persistence, with the canonical request-scoped-user pattern.)
- 6 Invalidating after a mutation (The four-tool decision tree — `updateTag` (Server-Action-only, read-your-writes), `revalidateTag` (stale-while-revalidate), `revalidatePath`, and `router.refresh` — picked by the user-expectation question.)
- 7 Async request APIs and legacy segment config (Awaiting `params`, `searchParams`, `cookies()`, `headers()`, and `draftMode()` as Promises with `React.use()` for Client Components, `connection()` as the explicit dynamic opt-in, and the migration away from the deprecated `dynamic`, `revalidate`, and `fetchCache` segment exports.)
- 8 Quiz

### Chapter 037 — The request surface
- 1 Reading the request with cookies() and headers() (Teaches the async, server-only, read-only `cookies()` and `headers()` APIs from `next/headers`, the senior pattern of reading once at the top and passing resolved values down, the trust-the-platform caveat on proxy headers, and the build-time constraints these reads place on Cache Components.)
- 2 proxy.ts and the matcher (Teaches the Next.js 16 rename of `middleware.ts` to Node-only `proxy.ts`, the canonical file shape with `NextRequest`/`NextResponse`, the matcher config as the cost-control surface, the proxy-to-route header pattern, and what belongs in the proxy versus the route.)
- 3 Rewrites and redirects in proxy.ts (Teaches the redirect-vs-rewrite semantic split, 307/308 status codes, the proxy-vs-`next.config.ts`-vs-`redirect()` decision tree, the subdomain-rewrite multi-tenant pattern, and open-redirect prevention on the `?next=` return-URL idiom.)
- 4 URL state with searchParams and route params (Teaches the URL-vs-component-state decision rule, the `params`-for-identity / `searchParams`-for-view-state split, the async Promise shape in Next.js 16, Zod validation at the boundary, opaque base64 cursors, and `nuqs` as the production layer.)
- 5 Client-side navigation hooks (Teaches the four `next/navigation` hooks (`useRouter`, `usePathname`, `useSearchParams`, `useParams`), the read-on-server / write-on-client division of labor, `push` vs. `replace` vs. `refresh`, the Suspense requirement on `useSearchParams`, and the chip-list pattern that puts it all together.)
- 6 Quiz

### Chapter 038 — Project config, platform primitives, and SEO
- 1 The typed next.config.ts (Teaches the typed `next.config.ts` surface as a one-screen map (`cacheComponents`, `typedRoutes`, `images`, `headers`, `experimental`) and `serverExternalPackages` as the lever for Node-native SDKs that break Turbopack bundling.)
- 2 Images with next/image (Teaches `next/image` as the platform default for sized, lazy, format-negotiated images, the required `sizes`/`priority`/`placeholder` props, the Next.js 16 `qualities` requirement, and `remotePatterns` as the mandatory security gate for external sources.)
- 3 Edge redirects and rewrites (Teaches `redirects()` and `rewrites()` in `next.config.ts` as the edge-applied home for request-independent rules, the `source`/`has`/`missing` pattern syntax, 308-vs-307 SEO consequences, and the decision tree against `proxy.ts` and `redirect()`.)
- 4 Self-hosted fonts with next/font (Teaches `next/font/google` and `next/font/local` as the build-time self-hosting pipeline that eliminates CLS via fallback metrics, the required `subsets`, variable-font defaults, and the Tailwind CSS-custom-property bridge.)
- 5 Third-party scripts with next/script (Teaches the four `next/script` strategies (`beforeInteractive`, `afterInteractive`, `lazyOnload`, `worker`), the `onLoad`/`onReady` callbacks, placement and dedup with `id`, and the SDK-over-snippet preference for vendors that ship one.)
- 6 Metadata and dynamic OG cards (Teaches the static `metadata` export, `generateMetadata` with cached resource reads, `metadataBase` and `alternates.canonical`, and `opengraph-image.tsx` with `ImageResponse` for per-resource social cards.)
- 7 Robots, sitemaps, icons, viewport (Teaches the SEO file conventions (`robots.ts`, `sitemap.ts`, `icon.{ext}`, `apple-icon`, `manifest.ts`), the separate `viewport` export with `themeColor`, env-aware robots, and post-deploy OG cache warming.)
- 8 generateStaticParams for static catalogs (Teaches `generateStaticParams` as the hook that materializes dynamic segments at build time, the `dynamicParams` toggle for closed lists, and the pairing with `use cache` and `cacheTag` for the production content-page shape.)
- 9 Quiz

### Chapter 039 — Project: list-plus-detail with parallel routes
- 1 Project brief (Frames the list-plus-detail surface, the modal-with-real-URL pattern, the "Done when" verifications, and the scope cut against future units.)
- 2 Starter walkthrough (Tours the provided file tree, the queries and Zod schema in `/lib`, the pure render components, and the two-slot layout the student will fill in.)
- 3 Wiring the @list and @detail slots (Fills the slot `page.tsx` and `default.tsx` files, reads `searchParams` server-side with Zod validation, and uses `notFound()` for missing records.)
- 4 Modal with a real URL (Builds the `(.)new` intercepting modal and its non-intercepting twin so soft nav opens a dialog while refresh and `Cmd+click` open the full page.)
- 5 Independent streaming per slot (Adds `loading.tsx` and skeleton components to each slot so the list and detail stream independently under throttled network.)
- 6 Verify (Walks every "Done when" clause as a verification step, names the senior calls, and points at the forward references in Units 6, 7, and 11.)

---

## Unit 6 — Postgres and Drizzle

### Chapter 040 — Postgres on Neon
- 1 Tables, rows, and 3NF (Teaches the relational model — tables, rows, typed columns, primary and foreign keys — and 3NF as the default schema shape, with the three legitimate triggers for denormalization.)
- 2 Local dev: Docker, Neon branch, or Neon Local (Teaches the three credible local-database options for 2026 — Docker Postgres, a Neon dev branch, and Neon Local — and the offline-vs-prod-parity trade that picks between them under one `DATABASE_URL` contract.)
- 3 Neon branching and scale-to-zero (Teaches Neon's storage/compute separation, copy-on-write branch-per-preview-deploy via the Vercel integration, and the scale-to-zero pricing model that makes ephemeral preview branches economically sustainable.)
- 4 The serverless driver and the pooled URL (Teaches the `@neondatabase/serverless` driver, the HTTP-vs-WebSocket decision for reads vs. transactions, PgBouncer transaction-mode pooling, and the two-DB-clients pattern with pooled and unpooled connection strings.)
- 5 Quiz

### Chapter 041 — Schema as source of truth with Drizzle
- 1 Principle #2: schema is the source of truth (Establishes Architectural Principle #2 by naming `db/schema.ts` as the canonical root from which row types, insert types, Zod validators, form fields, and RLS column names all derive.)
- 2 pgTable and the snake_case bridge (Introduces the `db/` folder layout, the minimal `pgTable` call, column builders, and the `casing: 'snake_case'` config that maps TS camelCase to SQL snake_case.)
- 3 Postgres data types, the 2026 subset (Surveys the durable `pg-core` types — `text`, `numeric` for money, `timestamptz`, `uuid`, `jsonb` with `$type<…>`, `pgEnum`, arrays — with a "reach for it when" rule per type.)
- 4 NOT NULL, defaults, and generated columns (Teaches the three per-column decisions — nullability, defaults (`.default`, `.defaultNow`, `.$defaultFn`, `$onUpdate`), and `generatedAlwaysAs` — plus the reusable-columns pattern.)
- 5 Primary keys: UUIDv7 and identity bigint (Lands the surrogate-key decision tree — UUIDv7 for user-facing entities, `bigint generatedAlwaysAsIdentity` for high-volume internals, natural keys only for immutable external identifiers.)
- 6 Foreign keys and ON DELETE (Covers `.references(() => other.id, { onDelete })` and the four-way cascade/set null/restrict/set default decision per relationship, plus the hard-delete vs. soft-delete split.)
- 7 UNIQUE and CHECK constraints (Pushes invariants into the database with single-column, composite, partial, and case-insensitive UNIQUE constraints plus `CHECK` predicates as the safety net Zod can't replace.)
- 8 Many-to-many junction tables (Models N:M with two FKs and a composite PK, names the junction-vs-entity trigger, and shows the promotion path when the relationship grows metadata.)
- 9 Drizzle Relations v2 (Declares the TS-side traversal graph with `defineRelations` in `db/relations.ts` — one/many/through shapes — that enables `db.query.…({ with: … })` nested reads in 042.3.)
- 10 $inferSelect and $inferInsert (Cashes Principle #2 in by deriving every row, insert, and prop type from `typeof table.$inferSelect`/`$inferInsert`, replacing every hand-written row interface in the codebase.)
- 11 Quiz

### Chapter 042 — Querying and mutating
- 1 CRUD and the four chain methods (Teaches `db.select`/`insert`/`update`/`delete` with `where`, `orderBy`, `limit`, `offset`, the operator helpers, the missing-`where` failure mode, and Drizzle's automatic parameterization.)
- 2 Joining tables (Teaches `innerJoin`, `leftJoin`, `rightJoin`, and `fullJoin`, labeled vs. flat selections, left-join nullability, self-joins via `alias`, and many-to-many through a junction table.)
- 3 Nested reads with the relational API (Teaches `db.query.<table>.findMany` and `findFirst`, the `with` traversal option, nested `with` with column projection, filtering joined rows, and why this API is N+1-safe by construction.)
- 4 Aggregations and grouping (Teaches `count`, `sum`, `avg`, `min`, `max`, and their distinct variants alongside `groupBy`, `having`, filtered aggregates with `FILTER (WHERE …)`, and `selectDistinctOn`.)
- 5 Upserts and RETURNING (Teaches `onConflictDoUpdate` and `onConflictDoNothing`, the `target` constraint requirement, the `excluded` pseudo-table, conditional `targetWhere`/`setWhere`, and `.returning()` as the round-trip eliminator.)
- 6 Cursor pagination (Teaches when offset is enough, the cursor model with a mandatory tiebreaker, opaque base64 cursor encoding and validation, the fetch-n+1 has-next-page trick, and the composite index cursors depend on.)
- 7 Subqueries and CTEs (Teaches inline subqueries in `where` and `from`, `db.$with` and `$withRecursive` for CTEs, `exists`/`notExists`, window functions like `row_number()`, and the readability call between layered SQL and app-code passes.)
- 8 Full-text search in Postgres (Teaches the `tsvector`/`tsquery` model, a generated `tsvector` column, `websearch_to_tsquery` for user input, `ts_rank` ordering with `ts_headline`, and the volume threshold where external search earns its weight.)
- 9 JSONB columns (Teaches when to reach for `jsonb` vs. real columns, `$type<...>` claims, the `->`/`->>` accessors, `@>` containment and key-existence operators, partial updates via `||` and `jsonb_set`, and the promote-to-column trigger.)
- 10 The raw SQL escape hatch (Teaches the `sql\`\`` tagged template with implicit parameterization, embedding raw fragments inside the builder, typing with `sql<T>`, `db.execute` for one-offs, and `sql.raw` reserved for fixed-string identifier interpolation.)
- 11 Quiz

### Chapter 043 — Indexes, plans, and transactions
- 1 Indexes that earn their weight (Teaches the four senior triggers for adding an index (FK columns, selective `where`, `order by` keys, unique constraints), the index-type decision tree (B-tree default, GIN, partial, composite, expression, unique), how to declare them in Drizzle, and the write/disk cost that bounds when not to add one.)
- 2 Spotting and fixing N+1 (Teaches the four canonical N+1 shapes (await-in-loop, `Promise.all` over a parameterized map, per-card RSC fetches, mixed `findMany`/`findFirst`), why `Promise.all` doesn't fix it, and the structural fix via the relational query API or a hand-written join.)
- 3 Reading EXPLAIN ANALYZE (Teaches how to run `EXPLAIN (ANALYZE, BUFFERS)` through Drizzle, read the plan tree bottom-up, interpret the node types (`Seq Scan`, `Index Scan`, `Nested Loop`, `Hash Join`, `Sort`) and the numbers that matter (estimated vs. actual rows, loop counts, buffer hits), and run the measure-hypothesize-verify loop one change at a time.)
- 4 Transactions and isolation levels (Teaches the `db.transaction(async (tx) => …)` shape, the four senior triggers for a transaction, the four Postgres isolation levels with their SaaS use cases, the SQLSTATE 40001 retry pattern, `SELECT ... FOR UPDATE` for row locking, and the pool-starvation rule that keeps external IO outside the transaction.)
- 5 Quiz

### Chapter 044 — Migrations and seeding
- 1 The Drizzle Kit daily loop (Teaches the `drizzle.config.ts` contract, the migration folder layout, the `generate` → review → `migrate` workflow, and Drizzle Studio as the in-stack dev GUI.)
- 2 Production-safe migrations (Teaches the push-vs-generate decision, the five-question SQL review checklist, `CREATE INDEX CONCURRENTLY` with statement breakpoints, the column-change patterns that bite, and expand-backfill-contract as the zero-downtime reflex.)
- 3 Deterministic seeding with drizzle-seed (Teaches the `seed().refine(...)` call shape, FK-aware insertion order, the idempotent reset-and-seed script, the same-seed determinism guarantee, and the test-factory boundary.)
- 4 Quiz

### Chapter 045 — Project: the org-scoped invoicing data layer
- 1 The brief: what we're building and what we're not (Frames the org-scoped invoicing surface, the seven "Done when" verifications, the explicit scope cuts (no mutations, no real auth, no RBAC yet), and the senior payoff of installing tenant-aware schema discipline now.)
- 2 Tour of the starter and the inspector contract (Walks the provided file tree (`drizzle.config.ts`, the pooled `db` client, the cursor helpers, the inspector page, the `db:*` scripts), brings up Docker Postgres, and pins the contracts the student's queries must satisfy.)
- 3 Authoring the schema and shipping the init migration (Fills `db/schema.ts` and `db/relations.ts` with the six tables (`organizations`, `users` stub, `org_members`, `customers`, `invoices`, `invoice_lines`) including UUIDv7 PKs, FK `ON DELETE` decisions, tenant-scoped uniques, the three composite indexes, and the `$inferSelect` row types, then generates and runs the initial migration.)
- 4 A deterministic, idempotent seed for two orgs (Writes `scripts/seed.ts` using `reset` plus `seed().refine(...)` with `weightedRandom`, `valuesFromArray`, and `with` to produce two orgs with overlapping members and 100+ invoices, dropping to direct `db.insert` where the seeder's shape doesn't fit.)
- 5 Writing the two tenant-scoped reads (Implements `listInvoices` (cursor pagination with the composite tiebreaker predicate and the `limit(pageSize + 1)` trick) and `getInvoiceDetail` (relational `findFirst` with `lines` and `customer`), with the `organizationId` tenant guard baked into every `where`.)
- 6 Verifying the seven "Done when" clauses (Runs each Done-when check end-to-end (clean migrate, idempotent seed, cursor pagination, server-side status filter, cross-org tenant guard, single-round-trip detail, `EXPLAIN ANALYZE` showing the right indexes) and forward-references Units 7, 9, 10, and 11.)

---

## Unit 7 — Forms, Validation, and Server Actions

### Chapter 046 — Zod 4: the validation contract
- 1 The eight builders (Walks the core Zod 4 schema constructors — primitives, `z.object` / `z.strictObject` / `z.looseObject`, arrays, tuples, literals, `z.enum`, `z.union`, and `z.discriminatedUnion` — that compose every validator in the chapter.)
- 2 Formats over regexes (Catalogues the v4 top-level format builders (`z.email`, `z.uuid` vs. `z.guid`, `z.url`, `z.iso.datetime`, IP and ID encodings) plus number, bigint, and date constraints, replacing the deprecated `z.string().email()` chains.)
- 3 Checks and transforms (Teaches single-field and cross-field `.refine` with `path`, `.superRefine` for multi-issue rules, `.transform` versus type-preserving `.overwrite`, `.pipe` for staged validation, and the v4 transform-on-refine-fail behavior.)
- 4 Derive, don't duplicate (Teaches `.extend`, `.merge`, `.pick`, `.omit`, `.partial`, `.required`, and `.readonly` for deriving schema variants from a canonical source, plus `z.infer` versus `z.input` versus `z.output` for transform schemas.)
- 5 parse, safeParse, and the error contract (Covers the four parse methods, the `ZodError` issue anatomy, `z.treeifyError` as the v4 form-friendly shape, and the unified `error` option that replaces v3's `message` / `invalid_type_error` / `required_error` trio.)
- 6 Crossing the FormData boundary (Teaches `z.coerce` (number, boolean, date, bigint), `z.preprocess` for the HTML checkbox shape, the `Object.fromEntries(formData)` pattern, the empty-string and `"on"` traps, `z.coerce.date` versus `z.iso.datetime`, and `File` validation.)
- 7 drizzle-zod: one source of truth (Teaches `createSelectSchema`, `createInsertSchema`, and `createUpdateSchema` to derive validators from the Drizzle table, the per-column override map for refinement-on-top, the `jsonb` schema pairing, and `createSchemaFactory` for custom Zod instances.)
- 8 Quiz

### Chapter 047 — Server Actions
- 1 The "use server" seam (Defines a Server Action, names the file-level and inline declaration sites, walks the three call shapes, and locks the serializable-args contract that crosses the wire.)
- 2 Parse on entry, every time (Installs the five-seam action shape and the `safeParse`-on-`Object.fromEntries(formData)` discipline that runs before any cookie read, database call, or log statement.)
- 3 Result, or throw (Locks the canonical `Result<T>` discriminated-union return shape, the `ok` / `err` helpers, the throw-at-the-framework-edge rule, and the standardized error codes every action shares.)
- 4 Thin actions, pure /lib (Introduces Principle #3 (pure helpers in `/lib`, side effects at named boundaries) and Principle #5 (don't invent a parallel call wrapper), and names the auth and billing carve-outs that earn their weight later.)
- 5 After the write (Teaches `revalidatePath` as the basic post-mutation move, the `db.transaction` wrapping pattern with its no-external-calls rule, and foreshadows the idempotency-key slot for Chapter 067.)
- 6 Quiz

### Chapter 048 — Forms the platform way
- 1 Uncontrolled inputs, FormData contract (Teaches uncontrolled inputs with `defaultValue`, the `name` attribute as the schema contract, and how `FormData` round-trips between the form and the Server Action without per-field state.)
- 2 Wiring the action prop (Teaches the `<form action={serverAction}>` primitive, the submit lifecycle, the automatic reset on success, `formAction` per-button overrides, and when Next.js's `<Form>` earns its weight.)
- 3 useActionState, pending and result (Teaches the `useActionState` hook's three returns, the `(prevState, formData)` action signature, the canonical form-component shape, and field-error rendering from the `Result` tree.)
- 4 useFormStatus and the SubmitButton (Teaches the `useFormStatus` hook for descendant pending state, the difference from `useActionState.isPending`, and the reusable `<SubmitButton>` component pattern.)
- 5 useOptimistic with implicit rollback (Teaches the threshold for optimism, the `useOptimistic` hook's reducer shape, React's implicit rollback on failure, the pairing with `useActionState`, and the client-generated UUID pattern.)
- 6 Constraint Validation, the cheap layer (Teaches the platform's Constraint Validation API (`required`, `pattern`, `type`, `inputmode`, `autocomplete`, `ValidityState`, `setCustomValidity`, `:user-invalid`), the line that separates it from the Zod schema, and the shadcn form layout primitives.)
- 7 Progressive enhancement for free (Teaches what works without JS (action prop, constraint API, redirect, revalidate) and what doesn't, the five disciplines that preserve PE, and the manual JS-disabled test at feature-launch.)
- 8 Quiz

### Chapter 049 — React Hook Form
- 1 The four triggers that flip the choice (Names the four UX shapes that break the native 48 form pattern and justify reaching for React Hook Form, the cost of adopting it, and the 2026 form-library landscape (Conform, TanStack Form) at one paragraph each.)
- 2 The five primitives: useForm, register, Controller, handleSubmit, formState (Teaches RHF's core surface — the form root, the uncontrolled and controlled field paths, the submit interceptor, the read-side state, and how the shadcn `<Form>` wrapper consumes the form instance.)
- 3 zodResolver: one schema, both sides of the wire (Wires `@hookform/resolvers/zod` so the form and the Server Action validate against the same Zod schema, covering the `z.input` vs `z.output` type bridge, the `FormData` vs typed-object action call shape, and mapping server-returned `fieldErrors` back into RHF via `setError`.)
- 4 useFieldArray: dynamic lists of fields (Teaches the hook for variable-length row sets — the `append`/`remove`/`move`/`replace` operations, the `field.id` vs domain-ID split, the `z.array(z.object(...))` schema shape with per-row error access, and the action-side insert/update/delete diff inside a transaction.)
- 5 Multi-step wizards with FormProvider (Builds an end-to-end wizard with one `useForm` at the root, `useFormContext` per step, `trigger(fieldNames)` plus schema `.pick()` for per-step validation, `shouldUnregister: false` for back-navigation, and the progressive-enhancement casualty named explicitly.)
- 6 Quiz

### Chapter 050 — Route handlers and API contracts
- 1 When to reach past Server Actions (The five triggers that flip a mutation from Server Action to `route.ts`, the route-handler file shape, and the dynamic-by-default caching posture.)
- 2 Wire contracts as Zod schemas (Authoring `Params`/`Headers`/`Query`/`Body` schemas parsed in cheapest-first order, typed response schemas, and RFC 9457 Problem Details as the canonical error shape.)
- 3 Methods, status codes, and idempotency (Method-by-intent (GET/POST/PUT/PATCH/DELETE), the status-code table a reviewer enforces (400 vs. 422, 404 over 403 on tenant scope, 409 on conflict), and operationalizing the `Idempotency-Key` header.)
- 4 List endpoints: filter, sort, search, paginate (The query-schema shape, the prefix-form sort convention, opaque base64 cursors with `{ data, pageInfo }` envelope, and the shared `where`-builder pure function consumed by both the handler and the in-app Server Component.)
- 5 Quiz

### Chapter 051 — Project: CRUD via Server Actions
- 1 Project brief (The scope, the five "Done when" clauses, the deferred-to-later-units carve-outs, and the senior payoff of installing the canonical Server Action shape on a real CRUD surface.)
- 2 Reading the starter (A tour of the provided files (`Result<T>`, the auth stub, the page shells, the shadcn `<Form>` primitives) and the TODO stubs the student will fill across the chapter.)
- 3 Schemas and actions: parse, mutate, revalidate, return (Authoring the three `createInsertSchema`-derived mutation schemas and the create/update/delete actions in the canonical five-seam shape with `safeParse`, `Result`, tenant-scoped `where` clauses, and `revalidatePath`.)
- 4 Wiring the forms to the actions (Building the create, edit, and delete client forms with `useActionState`, uncontrolled inputs mirroring schema constraints, the reusable `<SubmitButton>` and `<FieldError>` components, and a shadcn `<Dialog>` delete with a no-JS fallback.)
- 5 Optimistic create with a client-generated UUID (Adding `useOptimistic` to the invoice list, a UUIDv7 hidden input that reconciles the optimistic and persisted rows by key, and a `?fail=1` debug branch to observe the implicit rollback.)
- 6 Delete inside a Drizzle transaction (Refactoring `deleteInvoice` to a `db.transaction` block that holds the shape for later audit-log and notification extensions, with the "no external calls inside the tx" rule and a URL-param success toast.)
- 7 Verify and forward-reference (Walking each "Done when" clause as a test (JS-disabled submit, field errors, conflict path, optimistic rollback, transactional delete, revalidation) and naming the Units 8–015 layers that will extend each discipline.)

---

## Unit 8 — Transactional Email

### Chapter 052 — Sender identity and deliverability
- 1 Resend and the first verified send (Picks Resend as the 2026 transactional default, walks the verified-domain ceremony and per-environment API-key discipline, installs the SDK, and writes the first `resend.emails.send` call with the canonical `from` shape, idempotency key, and `lib/email.ts` wrapper.)
- 2 Authenticating the sender: SPF, DKIM, DMARC (Teaches the three protocols that gate inbox placement in 2026, the DMARC alignment rule that ties them to the visible `From:`, the DNS records Resend asks for, and the staged `p=none` → `quarantine` → `reject` rollout against the Gmail/Yahoo/Microsoft bulk-sender bar.)
- 3 The transactional subdomain split (Draws the transactional-versus-marketing line, installs the `send.yourapp.com` vs. `marketing.yourapp.com` subdomain architecture that isolates reputations, and teaches the per-purpose local-part conventions and the `noreply@` plus `reply_to` pattern.)
- 4 The suppression list as a send-time chokepoint (Defines the `email_suppressions` table schema, the bounce/complaint taxonomy that writes to it, the read-before-send check enforced inside `lib/email.ts`, the `bypassSuppression` carve-out, and the 0.3 percent complaint-rate budget the team manages against.)
- 5 Quiz

### Chapter 053 — Authoring templates
- 1 JSX for the email DOM (Teaches the React Email component vocabulary, the Tailwind styling wrapper, the JSX-to-inline-table render pipeline, and the `emails/*.tsx` props-and-`PreviewProps` file convention.)
- 2 The preview server loop (Teaches the `pnpm email dev` server, the viewport and dark-mode toggles, the HTML and plain-text tabs, and the test-send-to-inbox cross-client verification path.)
- 3 Readable in every client (Teaches the auto-generated plain-text fallback via `render({ plainText: true })`, the email accessibility checklist (lang, headings, link text, alt, contrast, font size, touch targets), and the three-tier dark-mode posture with its `color-scheme` head plumbing.)
- 4 Quiz

### Chapter 054 — Project: the welcome email send path
- 1 Brief and scope cuts (Frames the welcome send as the canonical transactional surface every later unit reuses, states the six "Done when" clauses, names the scope cuts, and calls out the cheap-real-domain prerequisite.)
- 2 Starter tour and the verified-domain ceremony (Walks the provided file tree, then re-runs the Resend + SPF/DKIM/DMARC setup against the student's own registrar so the transactional subdomain is `Verified` before any code is written.)
- 3 Env, suppression helper, and the send wrapper (Adds the three Resend env entries, fills `lib/suppressions.ts` with the normalize-on-read `isSuppressed` helper, and builds the `lib/email.ts` wrapper as the single suppression-gated, idempotency-key-required send seam.)
- 4 Welcome template and the send action (Writes the props-only `<WelcomeEmail />` React Email template, eyeballs it in the preview server (desktop, mobile, dark, plain-text), then wires the five-seam `sendWelcomeEmail` Server Action that the inspector button fires.)
- 5 Verify the send path clause by clause (Walks every "Done when" clause as a verification step — real-inbox arrival, DKIM/SPF/DMARC pass in headers, template render across clients, plain-text fallback, suppression short-circuit, idempotency-key retry, and env fail-closed — then recaps disciplines and forward references.)

---

## Unit 9 — Authentication with Better Auth

### Chapter 055 — The auth mental model
- 1 Authn, authz, and the 401/403 split (Distinguishes authentication from authorization, places each check at its proper boundary in the request lifecycle, and catalogues the misframes (identification-vs-authentication, signed-in-vs-allowed, paid-vs-authorized) that produce the 401-versus-403 bugs seniors must recognize.)
- 2 Sessions versus JWTs, and the cookie that carries them (Compares server-stored opaque sessions against signed JWTs with revocation as the load-bearing trade, then specifies the `__Host-` cookie defaults, the session row's load-bearing columns, and the issue/refresh/revoke/expire lifecycle that the rest of Unit 9 assumes.)
- 3 OAuth 05, PKCE, and the code-for-tokens exchange (Walks the eight-step authorization-code-with-PKCE flow end-to-end — verifier/challenge derivation, `state` for CSRF, exact-match redirect URIs, the token exchange, `id_token` verification against JWKS — and names the OAuth-05 hardenings that make the 2026 social-login button legible.)
- 4 Quiz

### Chapter 056 — Better Auth setup
- 1 Wiring the auth instance (Installs `better-auth`, defines the server `auth` instance with `nextCookies`, mounts the `[...all]` catch-all route handler, sets up the browser `authClient`, and adds the two required env entries.)
- 2 Schema and the four core tables (Wires the Drizzle adapter, generates the canonical `user`, `session`, `account`, and `verification` tables via the Better Auth CLI, walks their load-bearing columns and cascades, and ships the first migration through Drizzle Kit.)
- 3 Session lifetimes and cookie hardening (Configures `expiresIn`, `updateAge`, and `freshAge`, sets the `__Host-` cookie prefix and SameSite defaults, weighs the cookie-cache staleness trade, and names `secondaryStorage` and `trustedOrigins` as deferred reaches.)
- 4 getCurrentUser across the five surfaces (Establishes the one `auth.api.getSession({ headers: await headers() })` call shape used in proxy, layouts, Server Components, Server Actions, and route handlers, wraps it in `React.cache`-backed `getCurrentUser`/`requireUser` helpers, and stands up the minimum `proxy.ts` gate.)
- 5 Quiz

### Chapter 057 — Authentication flows
- 1 Password sign-up (Teaches how to configure `emailAndPassword` for sign-up with Argon2id hashing, verification-gated sessions, and an enumeration-safe Server Action that wraps `auth.api.signUpEmail`.)
- 2 Password sign-in (Teaches the sign-in Server Action, its full `Result` discriminant surface (`'invalid-credentials'`, `'email-not-verified'`, `'too-many-attempts'`, `'requires-second-factor'`, `'ok'`), and how the per-account lockout composes with the per-IP rate limit.)
- 3 Email verification (Teaches how to wire `sendVerificationEmail` through the Unit 8 Resend pipeline, the hashed-token row in the `verification` table, the click-through endpoint that flips `emailVerified`, and the enumeration discipline that holds across every entry point.)
- 4 Password reset (Teaches the six-step reset flow with `sendResetPassword`, the 10-minute token expiry, and the non-negotiable session-invalidation-on-success property that defines a secure reset.)
- 5 Magic links (Teaches the `magicLink()` plugin, the four-step inbox-as-credential flow, the `disableSignUp` and `expiresIn` knobs, and the product call for when passwordless earns the call over email+password.)
- 6 TOTP and recovery codes (Teaches the `twoFactor()` plugin, six-step enrollment with QR-code + recovery codes, the `'requires-second-factor'` sign-in challenge, and the elevation requirement on every 2FA toggle.)
- 7 Passkeys and WebAuthn (Teaches the `passkey()` plugin, the WebAuthn registration and authentication ceremonies, `rpID`/origin scoping, conditional-UI autofill, and the synced-versus-device-bound trade.)
- 8 Social sign-in with OAuth (Teaches `socialProviders` config with Google as canonical, per-environment redirect URI registration, post-callback `account` table population, the lookup logic for first-time-OAuth vs existing users, and the per-provider quirks for GitHub, Apple, and Microsoft.)
- 9 Account linking (Teaches `account.accountLinking` config, the `trustedProviders` allowlist as a security decision, link-on-sign-in versus link-from-settings, the `allowDifferentEmails` knob, and the unlink guard that prevents leaving a user with no sign-in method.)
- 10 Quiz

### Chapter 058 — The signed-in session
- 1 The two-layer gate in proxy.ts (Teaches the production-shaped protected-routes proxy — cookie-presence-only checks with `getSessionCookie`, matcher design (allowlist vs matchall-minus-public), the `?next=` round-trip with open-redirect closure, the inverse gate that bounces signed-in users off `/sign-in`, and the rule that keeps authorization decisions at the action boundary rather than the proxy.)
- 2 Changing the password and the email (Teaches the `/settings/security` credential-mutation surface — `changePassword` with `revokeOtherSessions: true` as the senior default, `changeEmail` verified on the current address with notices to both, the current-password prompt vs `freshAge` elevation distinction, the `'requires-re-authentication'` Result branch, and the OAuth-only-user edge with no `'credential'` row.)
- 3 Active sessions and revoke-across-devices (Teaches the `/settings/security/sessions` audit surface — `listSessions` with per-row device/location parsing and current-session detection, the `revokeSession` / `revokeOtherSessions` / `revokeSessions` trio with the right copy for each button, the cookie-cache staleness window on revoke, and the "new device signed in" notification that turns the list into real takeover detection.)
- 4 CSRF and XSS: the defaults and the footguns (Teaches the structural browser-security defenses the 2026 stack already ships — `SameSite=Lax` plus the Server Actions origin check for CSRF, React 19's auto-escaping plus `HttpOnly` cookies for XSS — paired with the one footgun per category (`SameSite=None`, `dangerouslySetInnerHTML`), the `DOMPurify` sanitization shape, and CSP / full security headers named as Chapter 086's territory.)
- 5 Quiz

### Chapter 059 — Project: email+password auth with verification
- 1 Project brief (What the project ships, the eight "Done when" verifications, the scope cuts (no OAuth, passkeys, 2FA, magic links, password reset), and the senior payoff each call earns.)
- 2 Tour the starter (Walk the provided file tree, confirm the Zod-validated env entries, bring up Postgres, and prove the Unit 8 Resend pipeline still works before any code is written.)
- 3 Wire the auth spine (Configure the `betterAuth` instance with `nextCookies()`, generate the four-table schema, mount the catch-all handler, and ship a first unverified sign-up that lands a `__Host-` cookie.)
- 4 Lock the verification gate (Build the React Email verification template, flip `requireEmailVerification` on, wire `sendVerificationEmail` through the Unit 8 pipeline, and add the sign-in action with opaque errors and `?next=` sanitization.)
- 5 Gate the protected surface (Write the `proxy.ts` cookie-presence gate with inverse redirect, install the layout-level `requireUser()` validating read, and ship the sign-out Server Action that deletes the session row.)
- 6 Verify the cycle (Walk every "Done when" clause against Postgres rows, browser cookies, and inbox arrivals, run adversarial probes against `?next=` and the inverse gate, and name the production checklist for shipping.)

---

## Unit 10 — Organizations and RBAC

### Chapter 060 — Organizations as the tenancy model
- 1 Standing up organizations and the active-org slot (Install Better Auth's organization plugin, extend the session with `activeOrganizationId`, and wire the create / switch / list flows that move a user between orgs without leaking stale cache.)
- 2 tenantDb(orgId): making the missing-where not compile (Wrap Drizzle's relational query API in a typed `tenantDb(orgId)` factory that injects the org predicate on every read and write so the missing-org-filter bug class is structurally impossible.)
- 3 The threshold where RLS earns its cost (Frame Postgres Row-Level Security as a conditional power tool — the three triggers (highest-stakes data, many writer paths, external writers) that push past application-layer scoping, and the per-table decision tree that lands RLS on `audit_logs` and nowhere else for this stack.)
- 4 Wiring RLS on audit_logs: policies, SET LOCAL, and the withTenant helper (Author the policy through Drizzle's `pgPolicy` / `crudPolicy`, enable and force RLS on the table, set `app.org_id` via `SET LOCAL` inside an explicit transaction with a `withTenant(orgId, fn)` wrapper, and prove the isolation with an integration test that runs as the app role.)
- 5 Quiz

### Chapter 061 — Roles, action wrappers, and the audit trail
- 1 Owner, admin, member (Teaches the year-1 three-role RBAC default, the authority gradient between roles, the single-owner invariant, the `roleAtLeast` helper, and extending `requireOrgUser()` to return the current member's role.)
- 2 The authedAction wrapper (Teaches the `authedAction(role, schema, fn)` factory that lifts session, role check, and schema parse out of every Server Action body, the `ctx = { user, orgId, role, db }` payload it threads, the `Result` return contract, and the named carve-out from Principle #5 that justifies the wrapper.)
- 3 The authedRoute twin (Teaches the route-handler port of the same discipline as `authedRoute(role, schema, fn)`, the 401 / 403 / 422 / 404 status map, RFC 9457 Problem Details responses, and sharing one business function across the Server Action and route handler seams through `/lib`.)
- 4 The five member-management flows (Teaches the listing query and the four privileged actions — change role, remove member, leave org, transfer ownership — the invariants that live in the helpers, the multi-row transactions they run inside, and how a removed member's stale session resolves itself on the next request.)
- 5 The append-only audit_logs table (Teaches the audit table's column shape, the three-layer append-only enforcement (RLS policy, table grants, application discipline), the `logAudit(tx, event)` helper whose signature forces a transaction, the canonical event set, and the retention story.)
- 6 Quiz

### Chapter 062 — Invitations and the seat-handoff lifecycle
- 1 The seat reservation that outlives the request (Model Better Auth's `invitation` table with `tokenHash` and `acceptedAt` additions, the `pending` -> `accepted` / `canceled` state machine, the seven-day expiry as a security primitive, and the partial unique index on `(orgId, lower(email))` where `status = 'pending'`.)
- 2 Minting the signed accept link (Build `sendInvitationAction` with a 32-byte Web Crypto token, SHA-256 hash at rest, HMAC-signed accept URL, Resend dispatch after the DB transaction commits, and the `'invitation.sent'` audit event.)
- 3 Four arrival shapes on one accept URL (Route signed-in same-email, signed-in different-email, signed-out with account, and signed-out without account through one accept route with a verify order, an explicit Accept-button consent gate, auto-`emailVerified` for invite-sourced signups, and an active-org switch on accept.)
- 4 Pending invites: list, resend, revoke, collide (Build the admin's pending-invites surface with an expiry-filtered list, `resendInvitationAction` that rotates the token, `revokeInvitationAction` that sets `status = 'canceled'`, and a catch-and-translate of the unique-pending constraint into `'already-invited'`.)
- 5 Orphans, mismatches, and the double-click race (Make the senior calls on inviter-removed-before-accept (honor the invite), strict email-mismatch refusal, the double-click race against the `WHERE status='pending'` filter, and the already-a-member short-circuit.)
- 6 Quiz

### Chapter 063 — Project: org, RBAC, and invitations end-to-end
- 1 Brief and finished screenshot (Framing of the multi-tenant SaaS build, the inspector verification surface, the "Done when" list, the explicit scope cuts, and the starter `degit`.)
- 2 Tour the starter and the broken inspector (Tour of the provided files, the stubbed modules, the seed script, the Better Auth CLI flow, and the inspector page that throws until `requireOrgUser` exists.)
- 3 Install the organization plugin and requireOrgUser (Adding the `organization()` plugin with custom invitation fields, the `session.create` hook that seeds `activeOrganizationId`, regenerating the auth schema, and shipping `roleAtLeast` plus `requireOrgUser`.)
- 4 audit_logs with RLS deny-write policies (Defining the `auditLogs` table and its indexes, declaring tenant SELECT / INSERT and deny UPDATE / DELETE `pgPolicy` rules, and shipping `withTenant` plus the transaction-required `logAudit(tx, event)` signature.)
- 5 tenantDb, authedAction, and the role-change action (Building the typed `tenantDb(orgId)` facade, the four-step `authedAction(role, schema, fn)` wrapper, and the `changeMemberRoleAction` that refuses owner targets, refuses last-owner demotion, and audits in-transaction.)
- 6 Send an invitation with a signed accept URL (Generating the 32-byte token, hashing at rest, HMAC-signing the URL, writing the row plus the `invitation.sent` audit event in one transaction, sending the React Email after commit, and translating the partial-unique-index collision into `already-invited`.)
- 7 Accept the invitation across four arrival shapes (Server-Component accept page that verifies signature → row → hash → expiry → status and branches on session and email, plus the `acceptInvitationAction` that joins, switches active org, auto-verifies email, and audits inside one transaction.)
- 8 Verify RBAC, append-only, and cross-tenant probes (Clause-by-clause rehearsal of the "Done when" list — RBAC refusals, `psql` UPDATE / DELETE refusals on `audit_logs`, cross-tenant probes through both `tenantDb` and the unwrapped client, and the full invite handshake on a real inbox.)

---

## Unit 11 — Lists, URL State, and Soft Delete

### Chapter 064 — URL-state list views
- 1 The list-view anatomy (Teaches the four-pillar SaaS list pattern (filter, sort, search, paginate) as URL state with a server-reads-and-writes-client division, `router.replace` over `push`, the share-and-refresh contract, and the `nuqs` `searchParamsCache` setup that becomes the chapter's reference shape.)
- 2 Filter shapes and sort encoding (Teaches the four filter shapes (single-value enum, multi-value array, range as two parameters, boolean toggle with omitted default), the `-key` sort string with its enum-constrained indexed columns, the cursor-reset invariant on filter or sort change, and active-filter chips with a "clear all" affordance.)
- 3 Typed input, committed URL (Teaches the typed-vs-committed split for search inputs, React 19's `useDeferredValue` plus `useTransition` for input rhythm, `nuqs` `throttleMs` for URL-write rhythm, the `replace`-only history policy, and the `isPending` loading affordance.)
- 4 Cursor by default, offset when small (Teaches the cursor-vs-offset decision for list pagination, the opaque base64 cursor shape with sort key plus tiebreaker, the next-extra-row trick for `hasNext`, cursor versioning against sort, the row-inserted-during-pagination failure mode under offset, and the "position not snapshot" contract for shared URLs.)
- 5 Quiz

### Chapter 065 — Soft delete, archive, and concurrency
- 1 Two timestamps, three actions (Teaches the soft-delete-vs-archive distinction, the `deletedAt`/`archivedAt` schema with partial unique and composite indexes, and the `softDelete`/`archive`/`restore` Server Actions that drive the lifecycle.)
- 2 Making the missing filter impossible (Teaches the base-query helper that composes on top of `tenantDb` to expose `active()`, `archived()`, and `includingDeleted()` so every read carries the lifecycle and tenancy filters by construction.)
- 3 Version columns and the honest 409 (Teaches version-based optimistic concurrency, the Drizzle UPDATE precondition that turns a race into a typed 409 Result, and the React 19 refresh-and-retry surface built on `useActionState` and `useOptimistic`.)
- 4 Quiz

### Chapter 066 — Project: The production list view
- 1 The list view every SaaS ships (Frames the project goal — turning the Unit 7 invoice CRUD into a URL-state list with soft delete, archive, restore, and optimistic concurrency — and names the "Done when" verifications, scope cuts, and senior payoff.)
- 2 Tour the starter (Walks the stub vs. provided file tree, the lifecycle columns and partial indexes in the schema, the seeded archived and soft-deleted rows, the inspector verification surface, and the `tenantDb` plus `authedAction` helpers the project leans on.)
- 3 Move every control to the URL (Builds the `nuqs` parsers and `searchParamsCache`, wires the Server Component page and the toolbar Client Component, refactors `listInvoices` to the parsed shape, adds active-filter chips, cursor pagination, and the deferred-search rhythm with the cursor-reset invariant.)
- 4 Scoped reads, archive, restore, delete (Implements `invoiceScope(orgId)` with `active()` / `archived()` / `includingDeleted()` on top of `tenantDb`, routes `listInvoices` on the `view` param with RBAC gating, and ships the `archiveInvoice`, `restoreInvoice`, and `softDeleteInvoice` Server Actions with audit-log writes inside the same transaction.)
- 5 Two tabs, one winner (Adds the `version` precondition to `updateInvoice`, returns the 409 Result with a `current` payload on zero rows, wires the hidden version field and `<ConflictBanner>` into the edit form with "Use latest" and admin-gated "Overwrite anyway", and surfaces lifecycle-action conflicts as toasts.)
- 6 Run the failure modes (Walks every "Done when" clause — share-and-refresh, cursor reset, search responsiveness, archive and restore, soft-delete with RBAC, partial unique index recovery, two-tab 409, optimistic rollback, cross-tenant probe, index-plan check — and points forward to notifications, cache invalidation, audit-log hardening, and integration tests.)

---

## Unit 12 — Webhooks and Stripe Billing

### Chapter 067 — Webhook ingestion
- 1 Verify before parse (Teaches the route handler trust boundary for Stripe webhooks — raw body via `request.text()`, HMAC-SHA-256 over `${t}.${rawBody}`, constant-time compare, the 5-minute timestamp tolerance, the `stripe.webhooks.constructEvent` SDK helper, and returning 400 with RFC 9457 problem+json on failure before any business logic runs.)
- 2 Claim once, mutate once (Teaches the `processed_events(provider, eventId)` ledger with `INSERT ... ON CONFLICT DO NOTHING RETURNING` as atomic check-and-claim, wrapping the dedup insert and the business mutation in one transaction, returning 200 (not 4xx) on lost-claim, and the 30-second Stripe timing budget that pushes side-effects to background jobs.)
- 3 Newer wins, single writer (Teaches the `event.created` plus `last_event_at` predicate inside the UPDATE WHERE for out-of-order delivery, UPDATE-RETURNING to detect stale no-ops, the "webhook is the only writer" rule, and the success-page read-and-poll via `router.refresh()` that closes the redirect-versus-webhook race without double-writing entitlements.)
- 4 One pattern, four surfaces (Promotes the unique-on-key constraint plus atomic insert into a portable idempotency discipline applied identically to webhooks (`event.id`), Server Actions (Client-Component `crypto.randomUUID()` form key), retried background jobs (stable `runId`), and public route handlers (the RFC `Idempotency-Key` header with scoped-per-client response caching).)
- 5 Resend bounces and complaints (Ships the second instance of the pattern — Svix signature verification (`svix-id` / `svix-timestamp` / `svix-signature`), the `email.bounced` and `email.complained` handlers writing to `email_suppressions` with `ON CONFLICT DO NOTHING`, and the audited `bypassSuppression` carve-out for password-reset and other critical transactional sends.)
- 6 Quiz

### Chapter 068 — Stripe billing and plan entitlements
- 1 The Stripe object graph (Teaches the four-object Stripe model (Products, Prices, Customers, Subscriptions) the rest of the chapter assumes, including `lookup_key` over hardcoded IDs, metadata as the carry-channel for `organization_id`, and the test-vs-live mode discipline.)
- 2 Starting subscriptions with Checkout (Teaches the Server Action that creates a hosted Checkout session, lazy Stripe Customer creation per organization, trials via `subscription_data`, and the success-page polling that waits for the webhook to land the entitlement.)
- 3 Managing subscriptions with the Portal (Teaches the hosted Customer Portal as the default for plan changes, period-end cancellation, payment-method updates, and invoice history, plus deep-link flows and the rule that the return URL is a navigation hint, not state-change proof.)
- 4 Plan entitlements as a derived view (Teaches the `plan_entitlements` schema, the one-row-per-org projection of Stripe state, the single-writer rule (only the webhook writes it), and the `getEntitlement` read helper that every request-path gate calls instead of touching Stripe.)
- 5 Subscription status as first-class state (Teaches the Stripe status enum (`trialing`, `active`, `past_due`, `canceled`, `incomplete`, `unpaid`), the `hasActiveAccess` decision table, grace-period banners over instant lockout, and the `cancel_at_period_end` winding-down state.)
- 6 The thin billing interface (Teaches the `billing.*` carve-out to Architectural Principle #5 — `upgrade`, `openPortal`, and `requirePlan` as the three methods, `requirePlan` as the load-bearing server-side gate, and `/lib/billing/` as the only place the Stripe SDK is imported.)
- 7 When an SDK adapter earns its weight (Teaches the three-test threshold for wrapping an SDK (read-hostile shape, real swap cost, discipline to centralize), and applies it to show why auth and billing earn interfaces while Resend, Trigger.dev, and R2 only earn helpers.)
- 8 Quiz

### Chapter 069 — Project: From Stripe webhook to plan entitlement
- 1 The brief (Frames the build, the "Done when" verification recipe, scope cuts, and the senior payoff of owning the webhook seam end-to-end.)
- 2 Tour the starter and open the Stripe CLI tunnel (Walks the file tree, reads the provided `claimEvent` / SDK singleton / catalog, runs `stripe listen` + one `stripe trigger` to prove the local tunnel is alive.)
- 3 Verify before you parse (Writes the route handler's read-raw-body, `constructEvent`, 400-with-problem+json-on-failure skeleton with structured logging on every disposition.)
- 4 Claim the event inside one transaction (Wraps the post-verify path in `db.transaction`, calls `claimEvent` to dedupe against `processed_events`, and stubs the dispatch switch with structured logging.)
- 5 Project three events into one entitlement row (Completes the `plan_entitlements` schema, writes the pure `subscriptionToEntitlement` projection, and lands the three handlers with the `last_event_at` ordering predicate plus audit logs.)
- 6 Ship the three-method billing interface (Implements `upgrade`, `openPortal`, and `requirePlan` behind `lib/billing/`, wires the inspector's Checkout and Portal buttons, and exercises the Stripe-hosted flow end-to-end with a test card.)
- 7 Rehearse every failure mode (Walks every "Done when" clause as a deterministic probe — tamper, replay, out-of-order, Portal cancel, redirect race, cross-tenant metadata, every `hasActiveAccess` status — and lands the metadata cross-check hardening.)

---

## Unit 13 — Background Work and Object Storage

### Chapter 070 — Background work
- 1 Inline, then after() (Teaches the 0-tier (inline `await`) and 0.5-tier (`after()`) defaults for post-request work in Server Actions, the four thresholds that break them, and the `maxDuration` / error-swallow gotchas of running after the response.)
- 2 Vercel Cron as the schedule default (Teaches the Vercel Cron topology and `vercel.json` shape, `CRON_SECRET` verify-first auth, at-least-once delivery with dedup keys, UTC expressions, and the time-budget threshold that bumps a job up to Trigger.dev.)
- 3 When Trigger.dev earns its weight (Teaches the five named conditions that justify Trigger.dev (past function time, multi-step orchestration, automatic retries, fan-out, event-driven pauses), the 2026 alternatives, the decision tree, and the org-context separation tasks inherit.)
- 4 Tasks, schemaTask, queues, schedules (Teaches the v4 API surface — `task` and `schemaTask` with Zod payloads, `tasks.trigger` versus `triggerAndWait`, code-defined queues as the v3-to-v4 break, per-tenant dynamic queues, and static and dynamic schedules.)
- 5 Surviving crashes — retries, waits, idempotency keys (Teaches checkpoints at step boundaries, exponential retries with jitter and `AbortTaskRunError`, `wait.for` / `wait.until` for durable pauses, `idempotencyKey` and `idempotencyKeyTTL` on every trigger and wait, and cooperative cancellation via `ctx.run.abortSignal`.)
- 6 Waitpoints for callbacks and approvals (Teaches `wait.forToken` with `publicAccessToken` as a third-party callback URL, programmatic `wait.completeToken` for human-in-the-loop approval, mandatory timeouts, multi-token aggregation, and live progress via `ctx.run.metadata`.)
- 7 Wiring our app — which workloads go where (Teaches which three jobs in the course's app run on Trigger.dev (CSV export, Stripe reconciliation, notification dispatcher), which four stay on the platform default, the env surface, and the deploy-Trigger.dev-before-the-app ordering rule.)
- 8 Quiz

### Chapter 071 — Project: Durable CSV export with Trigger.dev
- 1 The export job, end to end (Frame the durable paginated CSV export, state the "Done when" clauses, name the scope cuts (no R2 yet, no streaming, no schedule), and clone the starter.)
- 2 Tour the starter and the two-terminal loop (Walk the provided files and the three TODO task stubs, read the inspector and `exports` table, and run the `pnpm trigger:dev` + `pnpm dev` loop to confirm the cloud link.)
- 3 The task boundary: schemaTask and the per-org queue (Write the `exportInvoices` `schemaTask` with a Zod payload and a dynamic per-org queue, plus the `startExport` Server Action that fires it with a daily idempotency key.)
- 4 One checkpoint per page (Spawn each page as a `paginatePage.triggerAndWait` child with `${ctx.run.id}:page:N` keys, drive progress through `metadata.set`, and abort permanently on empty resultsets with `AbortTaskRunError`.)
- 5 Send the email, write the audit log (Add the `sendExportEmail` child task guarded by a `${ctx.run.id}:email` key, then close the parent run by updating the `exports` row and writing `export.invoices.completed` to `audit_logs` in one tenant transaction.)
- 6 Verify: progress, kill-resume, serialization, exactly-once email (Walk each "Done when" clause clause-by-clause: visible per-page progress, the Ctrl-C kill-resume drill, per-org serialization vs. cross-org parallelism, schema-boundary validation, and email-send-once across parent retries.)

### Chapter 072 — Object storage
- 1 Defending the no — when object storage earns its weight (Names the three trigger conditions (user uploads, generated assets the app serves back, third-party media) that put R2 on the table, the conditions that do not, and why R2 beats S3 and the upload SaaS wrappers on unit economics for any read-heavy product.)
- 2 Standing up R2 — buckets, scoped tokens, and CORS (Sets up the minimum R2 surface a SaaS trusts in production: one bucket per environment, bucket-scoped tokens with minimum operations, the S3-compatible client in `lib/r2.ts`, the CORS rule with explicit origins and headers, and the `org/${orgId}/files/${id}` object-key tenancy convention.)
- 3 Presigned URLs — signing the upload seam (Teaches the presigned PUT and GET mechanics that move bytes from browser to R2 without touching the function: signed `ContentType` and `ContentLength`, 5-10 minute expiries, the layered size defense, and the sign-then-finalize two-step write with post-upload HEAD verification.)
- 4 Postgres owns identity, R2 owns bytes (Designs the `file_metadata` row as the canonical record (id-as-key-segment, tenant-scoped reads, soft-delete with cooled-off object cleanup, HEAD-verified `byteSize`, no persisted URL) and names the orphan failure modes in both directions.)
- 5 Wiring R2 into our app — two workloads, one mechanism (Picks the two call sites R2 covers (the 73 user-upload path with `file_metadata` and the 71 CSV export retrofit with a server-side PUT and no metadata row), names the workloads kept off R2, and pre-loads the lib surface and env shape for the 73 project.)
- 6 Quiz

### Chapter 073 — Project: presigned R2 upload
- 1 Brief and Done-when (Frames the runnable upload surface, locks the "Done when" clauses (5 MB lands, list downloads, 11-minute-later refresh still works, export emails a real R2 link), and names the scope cuts (no transforms, no multipart, no virus scan, no soft-delete UI).)
- 2 Tour the starter (Walks the provided pieces (singleton `lib/r2.ts`, pure `buildObjectKey` keyed off the validated content type, `UploadError` codes, idempotent CORS script) and identifies the five `lib/files/` TODOs plus the two `app/files/` TODOs the student will fill in.)
- 3 Sign the PUT, no DB write (Builds the `presignedPut` Server Action with Zod-validated input, server-generated `uploadId`, a server-constructed `objectKey`, and a 5-minute signed `PutObjectCommand`, verified end-to-end by `curl`-PUTting bytes straight to R2.)
- 4 Browser PUT, HEAD, then insert (Lands the `file_metadata` migration, the `finalizeUpload` action that HEADs the object for true size and content-type before inserting the row inside a `tenantDb` transaction, and the XHR-driven client form that streams bytes direct to R2 with a live progress bar.)
- 5 Fresh-per-render GETs (Writes `getFileDownloadUrl`, `listFiles`, and the un-cached `/files` server component that signs a new GET per row per render, then proves the discipline by watching a copied URL die at 11 minutes while a refreshed page keeps working.)
- 6 Real downloadUrl for the export (Retrofits the 71 export task to do a server-side `PutObjectCommand` under the `org/<id>/exports/` prefix, hand a fresh `getSignedGetForKey` URL to the email, and rely on the lifecycle rule for cleanup with no `file_metadata` row written.)
- 7 Verify (Walks each "Done when" clause as a runnable check — the 11-minute URL-death proof, function-side byte-pipe inspection, cross-org GET denial, `SIZE_MISMATCH` from a lying client, CORS preflight on a non-allowed host, and the exports-have-no-row SQL.)

---

## Unit 14 — Notifications

### Chapter 074 — The notification dispatcher
- 1 One seam, many channels (The dispatcher pattern, the `notifiable_events` registry, the dispatcher's contract, and the line between user-facing notifications and operator-facing audit logs.)
- 2 Email and inbox, independent channels (The uniform channel-function signature, the email send via the Unit 8 wrapper, the in-app inbox row written at dispatch, and the rule that one channel's failure never kills the other.)
- 3 Preferences, read once, default-on (The category-grained `user_notification_preferences` schema, the default-on rule for missing rows, the critical-channel override, and the one-place read inside the dispatcher.)
- 4 Dedup the rapid duplicates (The 60-second window in `notification_dedup` keyed by `(event_type, dedup_key, recipient_user_id)`, registry-defined dedup keys, the dedup-vs-coalesce line, and where the check sits inside the dispatcher flow.)
- 5 Quiz

### Chapter 075 — Project: notification dispatcher
- 1 Project brief (Three events, one dispatcher: scope, "Done when", and the demo loop you will reproduce.)
- 2 Tour the starter (Walk the file tree, schema stubs, seeded users, and inspector panels before writing any code.)
- 3 Registry, dispatcher, dedup (Define the three notifiable events, write `dispatch()` with stub channels, and prove the 60-second dedup window from the inspector.)
- 4 Channels and preferences live (Replace the stubs with the inbox writer, the email channel, and a batched preferences read with default-on and the critical-channel override.)
- 5 Wire the three call sites (Add `dispatch()` after commit in the invite action, the role-change action, and the Stripe past-due webhook branch.)
- 6 Verify clause by clause (Walk every "Done when" item in order — dedup, prefs, critical override, channel independence, fire-after-commit, tenant isolation, and the unsubscribe link.)

---

## Unit 15 — Cache and Rate Limiting

### Chapter 076 — Cache decisions as architecture
- 1 Route classes and the tag scheme (Classify every route as fully dynamic, partially cached, or fully static, then design an org-scoped tag scheme (entity, record, org, user) funneled through a `tags.ts` helper so read-side and write-side strings always align.)
- 2 Picking the right invalidation call (Resolve `updateTag`, `revalidateTag`, `revalidatePath`, and `router.refresh` on two axes (read-your-writes vs. eventual, tag vs. path) and trace the decision tree through worked flows: post-edit lists, post-purchase plan flips, membership changes, webhooks, and background jobs.)
- 3 Quiz

### Chapter 077 — Project: caching the invoices list with tag-driven invalidation
- 1 Brief and the finished cache shape (Frame the build: two `use cache` reads (list and per-org summary), a three-helper `tags.ts`, `updateTag` fan-out from four actions, `revalidateTag` from a Trigger.dev summary task, and the `<FetchedAtStrip />` as the on-page cache-state readout.)
- 2 Starter tour and inspector surface (Walk the 66-based starter, the new `org_invoice_summaries` table, the empty stubs (`tags.ts`, queries directives, action invalidations, task body), and every inspector panel that will verify later lessons.)
- 3 Tag helpers, cached reads, and fetchedAt (Write `tags.ts`, annotate `listInvoices`, `getOrgInvoiceSummary`, and `getInvoiceDetail` with `'use cache'` + `cacheLife` + `cacheTag`, return `fetchedAt`, and verify hits through the inspector's hit/miss probe.)
- 4 Wiring both invalidation paths (Fan out three `updateTag` calls after commit in the four lifecycle actions, implement the `summaryRecomputeTask` that calls `revalidateTag`, and wire the deliberate misuse-`revalidateTag`-from-action branch as the failure-mode demo.)
- 5 Verify clause-by-clause (Walk every "Done when" clause via the inspector: cache hits, read-your-writes through `updateTag`, record-level scoping, cross-org isolation, lifecycle fan-out, eventual via `revalidateTag`, the misuse demo, and the tag-string and closure-rule disciplines.)

### Chapter 078 — Rate limiting with Upstash Redis
- 1 Two layers: edge WAF and application limiter (Teaches the layering of Vercel WAF (per-IP edge controls) and `@upstash/ratelimit` (per-key application controls), the public-URL-with-auth trigger that makes Upstash non-negotiable, why Upstash Redis is the 2026 default, and the fail-open-on-auth policy.)
- 2 The @upstash/ratelimit API surface (Teaches the connectionless `Redis.fromEnv()` client, the module-scope `Ratelimit` declaration with prefix and analytics, the three algorithms (sliding window default, token bucket, fixed window), the `limit(key)` return shape, key design, and the `pending` analytics flush via `waitUntil`.)
- 3 Dual-keying the auth endpoints (Teaches the three module-scope limiters for sign-in, sign-up, and password reset, the per-IP-and-per-email dual-keying rule that defeats credential stuffing without lockout, the gate-first-work-second seam inside the action, the RFC-shape `RateLimit-*` headers, the user-safe 429 body, and the fail-open `safeLimit` wrapper.)
- 4 Quiz

### Chapter 079 — Project: Upstash rate limits on the auth surface
- 1 Project brief (Frames the build: wrap the 59 sign-in, sign-up, and reset actions with three Upstash limiters, swap out Better Auth's built-in limiter, and verify the 11th-request 429 against the inspector and the Upstash dashboard.)
- 2 Tour the 59 auth starter and the inspector (Reads the provided file tree, the still-on Better Auth built-in limiter, the empty `lib/` stubs, the seeded `alice` / `bob` / `eve` accounts, the mocked email counter, and every panel and toggle on `/inspector`.)
- 3 Declare the Redis client and three module-scope limiters (Adds the two Upstash env vars, writes `redis.ts` as `Redis.fromEnv()`, declares the sign-in, sign-up, and reset `Ratelimit` instances at module scope with distinct prefixes and per-limiter `ephemeralCache`, and lights up the inspector's "Remaining tokens" panel via `getRemaining`.)
- 4 Gate the actions: dual-keying, headers, fail-open (Fills `keys.ts`, `safe-limit.ts`, and `rate-limit-headers.ts`; wraps sign-in with per-IP-and-per-email gates, sign-up with per-IP, and reset with per-IP-plus-per-email; flips Better Auth's built-in limiter off; and hands each `pending` to `after()`.)
- 5 Verify against "Done when" (Walks every clause: the 11th-request 429 with `Retry-After`, the cross-IP per-email proof, window resets, opaque 429 bodies, gate-before-work timing, the fail-open log, module-scope cache hits, `pending` off-path, and the Upstash dashboard keys with TTLs.)

---

## Unit 16 — TanStack Query and Zustand

### Chapter 080 — TanStack Query
- 1 When TanStack Query earns its weight (The four named triggers (polling, cross-view caching, optimistic with rollback into cached queries, infinite scroll with reuse) that justify reaching past Server Components, Server Actions, `useState`, and `nuqs` for a client-side server-state library.)
- 2 The four primitives the project reaches for (`useQuery` (with `staleTime` and the `isPending`/`isFetching` split), `useMutation` (the five-callback lifecycle), the v5 optimistic-update two-shape decision (via-variables vs. cache-update), and `useInfiniteQuery` with `maxPages` — plus query keys as the cache contract, `refetchInterval` polling, and the `invalidateQueries`/`setQueryData`/`removeQueries` trio.)
- 3 Wiring without leaking the cache across requests (The `'use client'` `<Providers>` shell, the per-request `getQueryClient()` helper via React's `cache()` (the multi-tenant isolation trap), SSR-hydrated initial data through `prefetchQuery` plus `<HydrationBoundary>`, the senior `staleTime`/`gcTime` defaults, the two-system invalidation reality after a Server Action, and the org-switch `queryClient.clear()` discipline.)
- 4 The per-invoice comment thread clears the bar (Running the four-trigger funnel against one concrete screen, splitting the read side (`useInfiniteQuery` with 10s polling, `maxPages: 10`, SSR-prefetched first page) from the write side (Server Action plus client-side `invalidateQueries`), and the cache-update optimistic-add shape — framing the 81 build.)
- 5 Quiz

### Chapter 081 — Project: TanStack Query on optimistic comments
- 1 Project brief (Frames the build: bolt a polling, infinite-scrolling, optimistically-added comment thread onto the 66 invoice detail page with TanStack Query scoped to the leaf, names the "Done when" clauses, and links the starter.)
- 2 Tour the starter and the inspector (Walks the provided file tree, the new `invoice_comments` schema and seed, the route-handler scaffolding, the shared Zod schemas, the in-process `listCommentsPage` read, and every inspector panel and debug toggle.)
- 3 Provider, per-request factory, and the SSR-hydrated first page (Wires `getQueryClient()` with the `typeof window` branch and React `cache()`, the `commentKeys` helper, the `<Providers>` shell with senior defaults and gated devtools, the in-process fetcher branch, and the invoice page's `prefetchInfiniteQuery` plus `<HydrationBoundary>` so the seeded thread paints with no client loading state.)
- 4 Infinite scroll, polling, and the route handler (Fills the client fetcher branch, the `authedRoute` `GET` handler as the public read seam, and the leaf's `useInfiniteQuery` with cursor paging, `maxPages: 10`, 10-second `refetchInterval`, and `refetchIntervalInBackground: false` so "Load older" and cross-session arrival both work.)
- 5 Optimistic add and rollback with useMutation (Writes the `addCommentAction` Server Action with audit-log and `revalidateTag`, then wires the form's `useMutation` with `cancelQueries`, snapshot, `setQueryData`, restore in `onError`, and `invalidateQueries` in `onSettled` — surfacing the two-system invalidation reality at the seam.)
- 6 Verify against "Done when" (Walks every clause: SSR-hydrated first paint, infinite scroll with `maxPages` cap, cross-session polling arrival within 10 seconds, tab-hide pause, optimistic happy path, forced-500 rollback, two-system invalidation, per-request server `QueryClient` isolation, leaf-scoping, `commentKeys` discipline, route-handler tenancy, Zod-drift recovery, and devtools tree-shaking.)

### Chapter 082 — Zustand
- 1 When Zustand earns its weight (The three triggers that justify reaching for Zustand past the five client-state defaults, the per-feature rule, and the "client-only, never global ambient" framing for SaaS codebases.)
- 2 Primitives and the per-request provider (The v5 API surface — `createStore`, the slices pattern with `StateCreator`, selector subscriptions with `useShallow`, the `useRef`-pinned Context provider for App Router SSR, and the middleware lineup named once.)
- 3 The routed wizard, end to end (The four-step customer-onboarding wizard as the in-app trigger — the four-slice store shape, per-step Zod gates, the Server-Action submit boundary, back/forward preserves vs. refresh loses, and reset discipline at submit-success and org-switch.)
- 4 Quiz

### Chapter 083 — Project: routed customer wizard with Zustand
- 1 Project brief (Frames the four-step routed customer wizard you will build on top of the 66 customers surface, states the "Done when" clauses, and calls out the two structural decisions (shared-layout provider, vanilla `createStore`) that prevent the canonical bugs.)
- 2 Tour the starter (Walks the file tree, the per-step Zod schemas, the four route segments, the progress and footer shells, and the inspector page with its debug flags so you know exactly which eight files you will fill in.)
- 3 Build the store skeleton (Defines the four-slice `WizardState`, writes the typed slice factories, composes them through a vanilla `createStore` factory, mounts the `useRef`-pinned provider on the shared layout, and exposes the typed `useWizardStore<T>(selector)` hook.)
- 4 Wire the forms and the Next-gate (Binds every step-1/2/3 field through atomic selectors and slice setters, renders inline Zod errors, and wires the footer so Next gates on the current slice's `safeParse` and advances both store and URL together.)
- 5 Submit, reset, and guard (Builds the composite-payload Server Action with audit log, reads the three slices on step 4 through `useShallow`, and wires the submit button with `useTransition` for the pending guard, success-reset, and redirect.)
- 6 Verify clause by clause (Walks every "Done when" clause through the inspector — back/forward preserves, refresh loses by design, atomic re-render scoping, per-request store isolation, action-failure keeps the draft, double-submit fires once — with deliberate flag flips to demo each canonical bug.)

---

## Unit 17 — Errors and Security

### Chapter 084 — Error discipline
- 1 Refuse by default (Every gate that controls access — authorization, tenancy, paywall, signature verify — treats an exception inside the check as a refusal, with the throw-and-catch structure that makes fail-open hard to write.)
- 2 Two audiences, two messages (Every error splits into a sanitized user string (no IDs, no stacks, no constraint names) and a fully-instrumented operator record (cause chain, ctx, redacted input), diverging at the wrapper and never at the UI.)
- 3 Walking the six error seams (A seam-by-seam audit of `authedAction`, `authedRoute`, page-level `requireOrgUser`, the webhook receiver, the rate limiter, and the `error.tsx` boundaries, naming where each commitment lands and what to grep for to catch bypasses.)
- 4 Quiz

### Chapter 085 — The security baseline
- 1 Headers that block live attacks (The irreducible six security headers — HSTS, nonce-based CSP with `'strict-dynamic'`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `frame-ancestors` — split between `next.config.ts` (static) and `proxy.ts` (per-request CSP nonce), with the static-prerender trade-off and report-only rollout.)
- 2 The abusable-endpoint matrix (The seven categories of abusable endpoints, the three triggers that make a limiter mandatory, per-category key strategy, the `safeLimit` seam, module-scope declaration in `lib/rate-limit.ts`, and the coverage matrix as deliverable.)
- 3 What belongs in the audit log (The six-category canonical event set, what's forbidden (reads, failed auth), the per-entry field shape with per-event payload schemas, PII redaction policy, append-only defense in depth, transaction-scoped `logAudit(tx, event)`, three audiences, and anonymization on user deletion.)
- 4 Retention and the right to be forgotten (The per-table retention catalog driven by a daily Trigger.dev job (R2 lifecycle for blobs), the async deletion-on-request flow, the three deletion shapes (hard / soft / anonymize), third-party deletion calls, legal retention carve-outs, and the no-real-PII-in-non-prod rule.)
- 5 Nothing fires pre-consent (Essential vs. non-essential cookies, the four-state consent machine, the single `useConsent()` provider, PostHog's `opt_out_capturing_by_default` plus dynamic SDK import, the three-button banner with equal-weight Accept/Reject, the consent-record audit entry, and the marketing-email opt-in boundary.)
- 6 Where secrets live and how they rotate (The five secrets rules (never in code, never client-bundled, in the platform store with Vercel's "sensitive" flag, three environments / three sets, rotation as a documented Vercel-before-provider operation), `.env.example` discipline, pre-commit secret scanning, and the canonical leak audit.)
- 7 The env schema as single source of truth (The four `@t3-oss/env-nextjs` invariants (typed `env` for every access, server/client split, `.env.example` parity, `SKIP_ENV_VALIDATION` only in legitimate places), the schema-as-documentation read, `NODE_ENV`-conditional production-only vars, and the one-page env audit deliverable.)
- 8 Supply-chain defaults after Shai-Hulud (The 2026 pnpm 11+ load-bearing defaults (`minimumReleaseAge: 1440`, `blockExoticSubdeps`, `only-built-dependencies` allow-list), `pnpm audit --prod` posture, committed lockfile with CI `--frozen-lockfile`, the three-question "is this maintained" check, Renovate / Socket, and canonical incident defenses.)
- 9 Quiz

### Chapter 086 — Project: the pre-launch audit pass
- 1 Eight categories, one template (Teaches the audit's coverage contract — the eight categories drawn from 84 and 85, the rule-location-consequence-fix template, the read-only scope, and the honor-system answer-key tag.)
- 2 Tour the target, model finding one (Teaches the audit target's file tree and canonical helpers, the running-app reading rhythm, and walks the fail-closed finding in `lib/admin/transferOwnership.ts` end-to-end as the reference shape.)
- 3 Error-discipline pass (Teaches the grep-driven audit of the three error-discipline categories — fail-closed bypasses, the user-vs-operator message split, and `dangerouslySetInnerHTML` plus adjacent XSS sinks — and surfaces findings one, two, and three.)
- 4 Security-baseline pass (Teaches the curl-and-grep audit of the five remaining categories — security headers, rate-limit coverage, audit-log gaps, secrets and env validation with GDPR deletion, and pnpm 11+ supply-chain defaults — and surfaces findings four through eight plus the two bonus senior-reach findings.)
- 5 Commit, then self-grade (Teaches the irreversible-commit-then-peek discipline, the clause-by-clause comparison against the `v1.0-answer-key` tag, the partial-credit scoring rule (rule and location are the floor, fix detail is the senior reach), and the forward references into Units 19 through 22.)

---

## Unit 18 — Time and Internationalization

### Chapter 087 — Time, dates, and timezones
- 1 Storage, domain, edge (Teaches the three-layer split for time: `timestamptz` (UTC) in Postgres, `Temporal.Instant` in the domain via a single codec in `lib/temporal.ts`, ISO 8601 on the wire, with `Date` confined to third-party seams.)
- 2 Calendar days, not midnight instants (Teaches the second storage pair — Postgres `date` columns and `Temporal.PlainDate` with its codec — and why calendar-day semantics like `dueDate` and `birthDate` must never be modeled as midnight-UTC `timestamptz`.)
- 3 Timezone on the profile (Teaches storing the user's IANA timezone as a `users.timeZone` column seeded from the browser at sign-up, validated with `Intl.supportedValuesOf('timeZone')`, read from the session, and passed explicitly to every formatter and scheduler — never derived per-request.)
- 4 DST and recurring jobs (Teaches how to schedule recurring work across DST transitions using Trigger.dev `schedules.task` with a named IANA `timezone` for wall-clock jobs and UTC for internal cadence, plus `Temporal.ZonedDateTime` disambiguation and per-tenant dynamic schedules.)
- 5 Arithmetic with Temporal (Teaches the daily Temporal surface — the `Instant` / `ZonedDateTime` / `PlainDate` / `Duration` type catalog, `add` / `subtract` / `since` / `until` / `with` / `round`, month-end clamping, the conversion graph, the six anti-patterns to retire, and the polyfill seam for Node 24 LTS.)
- 6 Quiz

### Chapter 088 — Internationalization
- 1 Keys, catalogs, and the no-concatenation rule (Translation keys in code, per-locale JSON catalogs with named placeholders, one-string-per-key, and the `t.rich` pattern for embedded markup.)
- 2 ICU MessageFormat: plurals, select, gendered forms (ICU `plural` with CLDR categories and exact-match overrides, `selectordinal` for ordinals, `select` for free enums, and nested plural-inside-select for gendered counts.)
- 3 The Intl.* formatter family (The daily-reach `Intl.*` formatters — `NumberFormat`, `DateTimeFormat` (Temporal-native, mandatory `timeZone`), `RelativeTimeFormat`, `Collator`, plus `ListFormat` / `DisplayNames` — and the construct-once-reuse rule.)
- 4 The locale resolution chain (The five-input negotiation order (URL prefix, profile, cookie, `Accept-Language` best-match, default), BCP 47 `Lookup` via `@formatjs/intl-localematcher`, and `users.locale` paired with `users.timeZone`.)
- 5 Wiring next-intl into Next.js 16 (The next-intl file shape — `defineRouting`, `createMiddleware`, `getRequestConfig`, `setRequestLocale`, `generateStaticParams`, `useTranslations` / `getTranslations`, `useFormatter`, typed navigation, and the `IntlMessages` global type.)
- 6 hreflang, per-locale canonicals, and SEO (The `alternates.languages` metadata surface with self-reference and bidirectionality, `x-default`, locale-specific canonicals, per-locale sitemaps, and OG `og:locale` with locale-aware OG images.)
- 7 Quiz

### Chapter 089 — Project: tri-locale invoices list
- 1 Brief and Done-when (Frames the build, scope cuts, and the "Done when" clauses for lifting the 66 invoices list into a tri-locale, tz-aware surface with `hreflang` and per-locale sitemap entries.)
- 2 Tour the starter (Walks the provided file tree, the English source catalog, the four seeded locale/tz user combinations, and the inspector panels that map to each verification clause.)
- 3 Wire next-intl and ship three catalogs (Fills `routing.ts`, `navigation.ts`, `request.ts`, `formats.ts`, `proxy.ts`, and `app/[locale]/layout.tsx`, writes the en-GB and fr-FR catalogs with CLDR plurals, and routes every UI string through `t()`.)
- 4 Format dates in profile tz, currency from data (Routes every invoice date through `useFormatter().dateTime` with the user's profile `timeZone` and every amount through `format.number` with the invoice's stored `currency`, plus a Temporal-driven relative-due column.)
- 5 Emit hreflang, sitemap alternates, and per-locale OG (Builds `generateAlternates`, transforms marketing's `generateMetadata` with locale-specific canonical plus bidirectional `hreflang` and `x-default`, and emits `app/sitemap.ts` with per-entry locale alternates.)
- 6 Verify the locale switch, DST render, and hreflang audit (Walks every "Done when" clause with deliberate-misuse demos for the load-bearing rules: DST-spanning render, bidirectional `hreflang` with `x-default`, locale-specific canonical, CLDR plurals, and `setRequestLocale` preserving static rendering.)

---

## Unit 19 — Testing

### Chapter 090 — The shape of a test suite
- 1 Picking Vitest and wiring the runner (Installs Vitest as the 2026 runner, walks `vitest.config.ts` with `globals: false` and `vite-tsconfig-paths`, and splits node from jsdom suites via test-projects.)
- 2 The honeycomb shape for a Next.js SaaS (Names the honeycomb over the pyramid and trophy, sets integration at the seams as the center of gravity, and gates component and E2E tests behind triggers.)
- 3 Coverage as a diagnostic, not a target (Reads branch over line, sets per-directory thresholds on `/lib` and the seams, and adds the absence-of-tests audit via `coverage.all: true`.)
- 4 Arrange, act, assert one behavior (Installs the AAA shape with descriptive `it('<outcome> when <conditions>')` names and the rule that asserts the contract the caller observes, not private helpers.)
- 5 Quiz

### Chapter 091 — Unit tests for /lib
- 1 Pure-function tests, the daily shape (Teaches the `name.ts` / `name.test.ts` colocation rule, AAA in three lines, matcher selection by value shape, sparing `describe` nesting, and why `/lib` tests need no mocks or `beforeEach`.)
- 2 Factories over shared fixtures (Teaches the `buildEntity(overrides)` factory pattern returning fresh instances with valid defaults, where factories live, when to use static JSON for external payloads, and how factories differ from fixtures and seeds.)
- 3 Pinning time, IDs, and randomness (Teaches the `lib/clock.ts`, `lib/ids.ts`, and `lib/random.ts` seams, `vi.useFakeTimers` setup and teardown, Temporal's decoupled clock, frozen-instant conventions, and the spy-versus-mock decision.)
- 4 Type-level tests with expectTypeOf (Teaches `expectTypeOf` and `assertType` in `*.test-d.ts` files run by `vitest --typecheck`, and how to pin discriminated unions, branded IDs, generic inference, and `Result` contracts at compile time.)
- 5 Async tests without the forgotten-await trap (Teaches `await expect(p).resolves` as the canonical async form, `expect.assertions(n)` for branchy paths, the `*Async` fake-timer variants for microtask flushing, and the Vitest 4 awaited-assertion contract.)
- 6 Asserting the unhappy path (Teaches the two-path rule, `toThrow(ClassName)` and structured-code matching over message strings, `toMatchObject` and custom matchers for `Result.err`, Zod issue inspection, and `Error.cause` chain assertions.)
- 7 Quiz

### Chapter 092 — Integration tests at the seams
- 1 Transaction rollback against real Postgres (Teaches the `withRollback` wrapper, the `tx` seam threaded through production code, and why integration tests run against a real test Postgres instead of mocking Drizzle.)
- 2 One database per worker (Teaches the `VITEST_POOL_ID`-keyed database scheme, `globalSetup` vs. per-worker `setupFiles`, fsync-off tuning, and Neon branch-per-CI-run as the conditional move.)
- 3 The signedInAs fixture (Teaches a single-call auth fixture that inserts user, org, and session inside `tx`, stubs `cookies()` and `auth()`, and parameterizes role, plan, and tenant for every Server Action and route-handler test.)
- 4 Mock the wire, not the SDK (Teaches why mocking at `fetch` keeps SDK serialization, signing, retry, and parsing under test, and where the "mock what you don't own, roll back what you do" line sits.)
- 5 MSW mechanics in practice (Teaches the MSW v2 `setupServer` + `http.*` API, default handlers per third party, per-test overrides via `server.use`, sequenced responses with `{ once: true }`, and capturing requests for after-the-fact assertions.)
- 6 Webhook receivers under test (Teaches end-to-end testing of a Stripe webhook handler by signing raw-body bytes and covering the valid, invalid, expired, replayed, malformed, and unhandled-type paths against a real `processed_events` table inside `tx`.)
- 7 Server Actions through the full wrapper (Teaches calling exported actions with auth fixtures, real `tx`, and MSW handlers; asserting `Result.ok`/`Result.err`, DB rows, `revalidatePath`, and `NEXT_REDIRECT` across happy, validation-fail, unauth, forbid, and plan-gated branches.)
- 8 Flake has a structural cause (Teaches the nine flake taxa (DB leak, timer leak, MSW leak, mock-impl leak, real clock, unawaited promise, random data, port collision, order dependency), why `--retry` hides bugs, and how `--shuffle` and `--repeat` quantify and locate them.)
- 9 Quiz

### Chapter 093 — Component tests, off by default
- 1 When RTL earns its weight (The three triggers (shared library, complex state, critical UX) plus the accessibility-regression trigger that make React Testing Library worth its cost, and the anti-triggers that say delete the test instead of writing it.)
- 2 The jsdom project and the render helper (Wiring the third Vitest project against jsdom, pinning the `@testing-library/*` set for React 19, and building the `render` wrapper that pre-applies providers and returns a ready `userEvent` instance.)
- 3 The query ladder is the accessibility audit (The role-plus-name priority ladder, the `getBy` / `queryBy` / `findBy` split, and the rule that behavior is what a user observes — never internal state, props, or class names.)
- 4 The catalog: five components that earn the test (A walk through the course app's component tests — cookie consent, subscribe form, date-range picker, data table, checkout summary — naming the trigger met, the behaviors to assert, and what to leave to the seam or to E2E.)
- 5 Quiz

### Chapter 094 — E2E on money paths only
- 1 The money-path filter (Teaches when a Playwright test earns its runtime cost — failure that moves money, breaks identity, or loses unrecoverable data — and why year-one zero is the correct default for a small Next.js 16 SaaS in 2026.)
- 2 Config, storageState, and the trace viewer (Teaches the smallest 2026 Playwright surface — `playwright.config.ts` with `webServer` against a production build, `auth.setup.ts` writing `storageState` per role, role-first auto-waiting locators, fixtures, and `trace: 'on-first-retry'` as the debugger.)
- 3 The four-path catalog (Walks the four canonical money paths in the course's app — sign-in, Stripe Checkout round-trip with plan flip, invitation acceptance with seat grant, and the primary value loop — naming the locator shape, data hygiene, and CI integration for each.)
- 4 Quiz

### Chapter 095 — Project: testing the Stripe webhook and Checkout money path
- 1 Brief and Done-when (Frames the deliverable: three webhook integration tests plus one Playwright money-path test, the scope cuts, and the "Done when" clauses that gate the chapter.)
- 2 Reading the test harness (Walks every provided file in the starter — Vitest integration config, MSW handlers, auth fixtures, the rollback helper, the Stripe event factory, `postWebhook`, `callAction`, Playwright config, and the auth setup — and runs both empty suites to confirm the harness boots.)
- 3 The happy-path webhook test (Writes the first integration test that drives a signed `checkout.session.completed` event through the real route handler and asserts on the `processed_events`, `plan_entitlements`, and `audit_logs` rows that result.)
- 4 Replay and tamper tests (Adds two integration tests proving that a replayed event is a no-op (`duplicate: true`, no extra rows) and that a tampered signature returns 400 problem+json with zero downstream writes.)
- 5 Driving Checkout end to end (Writes the single Playwright test that signs in via `storageState`, clicks Upgrade, fills the Stripe Checkout iframe with `4242 4242 4242 4242`, returns to `/billing/success`, and watches the poller flip the UI to Pro.)
- 6 Verify and mutation drills (Walks every "Done when" clause, runs the deliberate-handler-mutation drills that prove each test isolates the right failure, and names the coverage gaps to absorb as homework.)

---

## Unit 20 — Observability and Performance

### Chapter 096 — Error monitoring and structured logs
- 1 Sentry: capture, releases, breadcrumbs (Install Sentry for Next.js with the wizard, wire `onRequestError` and manual `captureException` in handled-error seams, tag events with releases and user context, and add domain breadcrumbs.)
- 2 Structured logs with correlation IDs (Set up `pino` with a fixed JSON key set, thread a per-request `requestId` through AsyncLocalStorage, and emit child loggers from every server-side seam.)
- 3 The 3am rule and PII exclusion (Decide what each seam logs for incident reconstruction and enforce a structural redaction config that keeps passwords, tokens, headers, and GDPR-class PII out of the log stream.)
- 4 Shipping logs with Vercel Drains (Wire a Vercel Drain to Axiom, verify indexed fields, and walk the Sentry-to-logs pivot that resolves a real production incident by `requestId`.)
- 5 Server-side debugging with the inspector (Launch `next dev --inspect`, attach VS Code, and use breakpoints, conditional breakpoints, and logpoints to resolve a failing server action that logs and Sentry alone couldn't crack.)
- 6 Quiz

### Chapter 097 — Product analytics
- 1 The cookieless floor: Vercel Analytics and Speed Insights (Install Vercel Web Analytics and Speed Insights as the cookieless default that ships before any event taxonomy decision, covering traffic, top pages, and Core Web Vitals without a consent banner.)
- 2 When PostHog earns its weight (Name the four needs (events, flags, replay, experiments) that cross the threshold past Vercel Analytics, and pick PostHog Cloud EU as the one-platform answer over the four-vendor alternative.)
- 3 Wiring PostHog through the consent gate (Wire `@posthog/next` end-to-end in the App Router with a consent-gated dynamic import, the `/ingest` proxy route, `opt_out_capturing_by_default` as the safety floor, and a verified pre- and post-consent test.)
- 4 Events, properties, and the identify handshake (Install the Object-Action event taxonomy, a typed `track()` helper backed by an event dictionary, the person/event/super-property split, and the `identify`/`reset` handshake that stitches anonymous to known users and orgs.)
- 5 Flags, rollouts, and experiments on one primitive (Ship feature flags as kill switches, percentage rollouts, and metric-driven A/B experiments, with server-side `bootstrapFlags` to kill the flash-of-default-variant and a stale-flag deletion discipline.)
- 6 Session replay with masking by default (Turn on PostHog session replay with the mask-vs-block masking catalog, sampling discipline, consent-gated start, and a replay-to-bug-fix workflow for the UX bugs that throw no error.)
- 7 Quiz

### Chapter 098 — Performance vigilance
- 1 The Core Web Vitals (Definitions of LCP, INP, and CLS, their p75 thresholds, the primary cause and one structural reach for each, and the field-data-versus-lab-data discipline that anchors the chapter.)
- 2 priority on the LCP element (How `next/image`'s `priority` prop preloads the LCP element, which exact image gets it, and the ESLint-enforced ban on raw `<img>` that keeps CLS and lazy-loading defaults in place.)
- 3 The barrel-export trap (Why barrel re-exports defeat tree-shaking, the lucide-react case study, and `optimizePackageImports` plus `sideEffects: false` as the modern fix that keeps imports readable while shipping per-export shape.)
- 4 Reading the bundle treemap (Installing `@next/bundle-analyzer`, the four scan passes for reading its treemap (biggest tile, per-route chunks, duplicates, shared chunk), and the triage decision tree from finding to fix.)
- 5 Lighthouse as the pre-launch gate (The two pre-launch audit surfaces (marketing page and one authenticated screen), `@lhci/cli` as the CI regression gate with performance budgets, and the threshold cheat sheet that calibrates lab scores against field data.)
- 6 RSC waterfalls and Promise.all (Diagnosing sequential parent-then-child awaits in a Sentry trace, the dependency-check reflex before adding a second `await`, and the `Promise.all` rewrite (with Suspense streaming as a sibling reach) that turns serial waits into parallel ones.)
- 7 Indexes and N+1 in production (Revisiting the two SQL failure classes at production scale: missing composite `(org_id, ...)` indexes diagnosed via `EXPLAIN ANALYZE`, N+1 fixed with Drizzle relations or joins, plus the pre-launch DB checklist and weekly slow-query review.)
- 8 Quiz

### Chapter 099 — Project: wire observability, audit performance
- 1 Brief: eight findings, two artifacts (Frames the deliverable as working observability plus a `findings/` report against eight seeded issues, restates the rule-location-consequence-fix template, names the scope cuts and the answer-key honor system, and links the starter.)
- 2 Walk the target, model finding 7 (Tours the eight finding clusters in the running app and source side-by-side, then writes `findings/007-missing-priority.md` end-to-end as the chapter's reference shape.)
- 3 Wire Sentry, the redactor seam, and correlation IDs (Wires Sentry across client/server/edge with source maps and release tags, builds a single `redact` seam reused in Pino and `beforeSend`, and adds a `proxy.ts` correlation-ID middleware backed by `AsyncLocalStorage`.)
- 4 Gate PostHog behind the consent banner (Flips `opt_out_capturing_by_default: true`, routes accept/reject through a single `grantAnalyticsConsent`/`revokeAnalyticsConsent` seam, restores session continuity on reload, and verifies zero pre-consent network requests.)
- 5 Document the waterfall, N+1, and the barrel before/after (Documents findings 5, 6, and 8 with the rule-location-consequence-fix template, fixes the barrel import in-place to capture `@next/bundle-analyzer` before/after screenshots, and writes `findings/SUMMARY.md` as the coverage-and-evidence artifact.)
- 6 Verify on each surface, self-grade against the answer key (Runs the verify recipe one surface at a time (Sentry dashboard, console logs, PostHog network panel, `findings/`), commits, then diffs the work against the `v1.0-answer-key` tag to score coverage and surface senior-reach details.)

---

## Unit 21 — Git, CI, Deployment, and Migrations

### Chapter 100 — Git as shipping discipline
- 1 Trunk-based Git for teams (The four Git objects, the everyday loop, and the rebase-locally / squash-merge-on-PR defaults that keep `main`'s history one commit per shipped change.)
- 2 Reflog, bisect, and the rescue toolkit (The four power tools — `reflog` for recovery, `bisect` for regression hunting, `cherry-pick` and `revert` for surgical moves, `rebase -i` for shaping history before push — and the trigger that earns each.)
- 3 The pull request as designed artifact (The small-reviewable-reversible rule, the six-section description template, draft PRs, CODEOWNERS routing, and the fixup-commit-plus-squash-merge review loop.)
- 4 Rulesets that enforce the workflow (The six-rule minimum-viable ruleset for `main` — PR required, approvals, stale-approval dismissal, code-owner review, required status checks, linear history — plus bypass actors and the `.github/` policy surface.)
- 5 Quiz

### Chapter 101 — The CI gate on GitHub Actions
- 1 GitHub Actions primitives (The workflow/job/step model, the trigger surface, pnpm-aware caching, least-privilege `permissions:`, secrets, and `concurrency:` — the GHA surface a senior needs to author the workflows that produce required status checks.)
- 2 The four-job merge gate (The `.github/workflows/ci.yml` baseline of parallel typecheck / lint / test / build jobs, why these four and no others gate the merge, the five-minute speed budget, and the job-name discipline that keeps the ruleset enforceable.)
- 3 Signal checks and dependency hygiene (The gate-vs-signal split for non-blocking jobs (`pnpm audit`, `actionlint`, scheduled link-check), the 2026 supply-chain layer (signature verification, `minimumReleaseAge`, SHA-pinning), and Dependabot grouping with patch auto-merge.)
- 4 Quiz

### Chapter 102 — Ship to Vercel and go live
- 1 The push-is-the-deploy model (Maps git events to immutable deployments, distinguishes the three environment scopes, and explains why production is just an alias swap.)
- 2 From repo to live URL (Walks the Import-from-GitHub flow, the first production and preview URLs, and the `vercel link` / `vercel env pull` setup every dev runs on clone.)
- 3 Region, runtime, and Fluid Compute (The three platform knobs that govern cold start, latency, and bill — matching the function region to the database, defaulting to Node.js over Edge, and tuning Fluid Compute concurrency safely.)
- 4 Custom domains and automatic SSL (DNS records for apex and `www`, Vercel's Let's Encrypt provisioning, the canonical redirect, and the Cloudflare-in-front "Full (strict)" SSL rule.)
- 5 A Neon branch per preview (Wires the Native Vercel-Neon Integration so every PR gets a copy-on-write database branch, runs migrations against it, and tears it down on close.)
- 6 Env vars across dev, preview, and prod (Scoping rules for the three environments, the `NEXT_PUBLIC_*` split, the Zod env validator that fails the build on misconfiguration, and OIDC federation as the replacement for long-lived cloud keys.)
- 7 Two-layer rollback when prod breaks (Instant alias re-promotion on Vercel paired with `git revert` on `main`, plus what rollback resets, what it doesn't, and where the feature-flag escape hatch fits.)
- 8 The launch checklist (The eight rows that make a URL defensible — env validation, error monitoring, rate limits, audit logs, security headers, pooled DB with matching region, tested backups, and external uptime monitoring with a human paged.)
- 9 Quiz

### Chapter 103 — Migrating a live schema without an outage
- 1 Expand, migrate, contract (The three-deploy cadence that ships a breaking schema change without an outage: add the new shape alongside the old, dual-write and backfill from app code, then drop the old shape once nothing reads it.)
- 2 Which migrations need the cadence (The trigger map and three-question decision tree that separate one-deploy additive changes from three-deploy renames, type rewrites, NOT NULL promotions, and FK-required columns.)
- 3 Rehearsing on a Neon preview branch (The four-check rehearsal that runs each cadence step against production-shaped data before merge, catching FK violations, missed dual-write sites, slow backfills, and leftover reads of the old shape.)
- 4 Quiz

### Chapter 104 — Project: ship to production, then live-migrate the schema
- 1 The brief: three PRs, zero outages (Frames the build, the "Done when" bar, and the three-PR plan that splits `customer_name text` into a `customer_id` FK without any moment of app/DB incompatibility in production.)
- 2 From green repo to a live production URL (Wires Vercel, Neon, env validation, preview password protection, and the launch checklist concretely on the starter to produce the production URL the rest of the chapter targets.)
- 3 PR 1 (Expand): add the nullable FK column (Ships an additive-only migration that adds `customer_id uuid` with a `NOT VALID` FK, rehearses it on the Neon preview branch, merges, and verifies the running 66 app code stays healthy against the expanded schema.)
- 4 PR 2 (Migrate): dual-write, backfill, dual-read (Lands the structural dual-write in actions, the `coalesce` fall-through in queries, the bounded-idempotent backfill script, the production backfill run, and the `VALIDATE CONSTRAINT` follow-up PR — all while production keeps serving traffic.)
- 5 PR 3 (Contract): drop the old column, promote the FK (Drops `customer_name`, flips `customer_id` to `NOT NULL`, removes every legacy reference from actions and queries, and verifies production lands on the target schema with the cadence's safety claims intact.)
- 6 Rollback rehearsal and the schema caveat (Promotes the previous production deployment against the contract PR to make the "alias rollback does not undo migrations" caveat concrete, then writes the durable runbook for the four-step gesture.)

---

## Unit 22 — Documentation and Code Review

### Chapter 105 — Docs that live next to the truth
- 1 Diataxis: the four jobs a doc can do (Learn the Diataxis vocabulary (tutorial, how-to, reference, explanation), the 2x2 axes behind it, the "mixing trap" that wrecks most READMEs, where each type lives in a 2026 SaaS repo, and the "could this be a link?" reflex.)
- 2 The thin README and source-as-doc (Learn the README's one job (first contact), its five-section template, the "what does NOT belong" list, and the rule that the schema file, `env.ts`, and Server Action signatures ARE the docs for what they describe so the README links instead of duplicating.)
- 3 AGENTS.md, the conventions file (Learn the 2026 `AGENTS.md` standard — its two audiences (coding agents and humans), the canonical sections (overview, layout, commands, conventions, don'ts, pointers), the hierarchical lookup rule, and the boundaries against README and ADRs.)
- 4 ADRs: one decision per file (Learn the Nygard ADR template (Title, Status, Context, Decision, Consequences), the three-test inclusion check, the "write while deciding" discipline, the supersession lifecycle, and six worked ADR sketches on the course's own opinionated picks (Drizzle, Better Auth, Biome, R2, Node runtime, native forms).)
- 5 Quiz

### Chapter 106 — Docs that live in the code
- 1 TSDoc the public surface (Learn which declarations earn a TSDoc block, the minimal 2026 tag set, the first-sentence-is-the-hover writing posture, and the link-don't-duplicate reflex.)
- 2 Comment the why, not the what (Learn the why-not-what rule for inline comments, the four kinds that earn their place, the negative space to avoid, and the reflex to carry comments through refactors or promote them to structural enforcement.)
- 3 Docs ship in the PR, or they're already wrong (Learn the five-artifact reflex at PR-open time, the reviewer's doc checklist, the PR-template scaffolding, and the boundary where automation catches mechanical drift but review catches semantic drift.)
- 4 Quiz

### Chapter 107 — The review surface
- 1 Where the eyes go first (The five-layer review stack a senior runs top-down on every diff, and the principle-and-pattern map that turns the diff into a small set of checks instead of a line-by-line crawl.)
- 2 The comment that lands (The four-part comment anatomy, the five severity labels (`blocking:`, `suggestion:`, `question:`, `nit:`, `praise:`), the blocking-vs.-suggesting cut, and the language of disagreement that keeps reviews actionable.)
- 3 Quiz

### Chapter 108 — Project: Review a PR, write the ADR
- 1 The brief, the cheatsheet, the pass order (Sets up the seeded PR and its two deliverables, walks the four-part comment template and the Nygard ADR scaffold, and locks in the review stack pass order before the diff opens.)
- 2 Walk the diff, model one comment (Tours the nine changed files against the canonical helpers they bypass, then writes the first finding (the missing `authedAction` wrapper) end-to-end in the four-part template as the review's rhythm-setter.)
- 3 Four more findings, all blocking (Surfaces the side-effect import, the `Date` arithmetic, the derived-state effect, and the missing audit-log write as four `blocking:` comments, fills the `## Summary` totals, and names the senior-reach bonus findings the rubric awards extra credit for.)
- 4 ADR 0007 — the cache decision (Runs the three-test inclusion check across the diff's candidate decisions, then writes `0007-cache-entitlement-reads-with-cacheTag.md` with a crisp Decision line, the named alternative, and an honest Consequences list that enumerates every `updateTag` seam.)
- 5 Commit, then self-grade (Commits the review and ADR, checks out the `v1.0-answer-key` rubric tag, scores each comment and ADR section against the floor-and-senior-reach criteria, and writes the request-changes verdict at the bottom of the review file.)

---

## Unit 23 — AI with the Vercel AI SDK

### Chapter 109 — When AI features earn their weight
- 1 The four triggers that justify an LLM surface (The four product shapes that make an LLM-backed feature the right tool, the anti-triggers that don't, and why the AI SDK is the canonical 2026 Next.js integration.)
- 2 Bounding spend before the surface goes public (The cost-and-quota discipline for user-facing LLM calls — output-token caps, pre- and post-call accounting, per-user daily quotas, sliding-window rate limits, and the seven abuse shapes a senior structurally mitigates.)
- 3 One-line model swaps and the AI Gateway (The provider-abstraction discipline that keeps vendor swap cheap — role-named handles in `lib/llm/models.ts`, the AI Gateway as the senior production default, failover, and the embedding-portability trap.)
- 4 Quiz

### Chapter 110 — Text, objects, and the chat surface
- 1 streamText, generateText, and the route-handler seam (The two text-generation primitives, the messages-array conversation contract, the system prompt as controller, and the Next.js 16 route handler shape that wraps every LLM call with auth, quotas, `onFinish` audit writes, `finishReason` handling, and `abortSignal` cancellation.)
- 2 Zod schemas as the model contract (`generateObject` and `streamObject` for type-safe structured output, Zod schema design with `.describe` as prompt-shape carrier, the schema constraints the model can render, `enum` and `array` modes, the `maxRetries` cost trade-off, and why structured output is the more provider-swap-friendly call shape.)
- 3 useChat, useObject, and the parts array (The v5 transport-based UI hooks (`useChat`, `useCompletion`, `useObject`), the `UIMessage` `parts` array as rendering source of truth, manually managed input state with plain `useState`, `sendMessage` / `regenerate` / `stop` / `status`, the `convertToModelMessages` / `toUIMessageStreamResponse` handler contract, and the Server-Component-loads-`initialMessages` / Client-Component-mounts-`useChat` boundary.)
- 4 Quiz

### Chapter 111 — Tool calling, generative UI, and retrieval
- 1 Tools and the agentic loop (Defining tools with Zod `inputSchema`, the server-side `execute` trust boundary, and the v5 `stopWhen` loop with `onStepFinish` audit and quota seams.)
- 2 Generative UI via tool parts (Rendering bespoke React components by switching on `UIMessage` tool-part `type` and `state`, with `InferUITools` typing the client and per-tool skeletons over generic spinners.)
- 3 Embeddings and pgvector RAG (When retrieval earns its weight, the `embed` / `embedMany` primitives, and the two-phase index-and-query pipeline on pgvector via Drizzle with `orgId`-filtered retrieval.)
- 4 Quiz

### Chapter 112 — Project: Ask-your-invoices chat with tool calling
- 1 Project brief (Frames the build: a right-rail chat on `/invoices` powered by `streamText`, a single org-scoped `getInvoiceStats` tool, a 5-step `stopWhen` cap, and a per-user daily token quota with typed refusals.)
- 2 Starter walkthrough (Tours the starter file tree, the provided `lib/llm/models.ts`, the `usage_quota_daily` and `llm_audit_events` tables, and the inspector's verification toggles before any code is written.)
- 3 Streaming route under auth with the agentic loop (Wraps `streamText` in `authedRoute('member', …)` with `stopWhen(stepCountIs(5))`, the tool-grounded system prompt, `convertToModelMessages`, `toUIMessageStreamResponse`, and an `onFinish` audit write.)
- 4 Tool with closure-scoped tenancy and the daily quota (Defines `getInvoiceStats` with a closure over `ctx.orgId` (never input), aggregate `outputSchema`, "return don't throw" errors, and wires `reserveQuotaOrRefuse` plus `onStepFinish` token accounting against a 100k daily cap.)
- 5 Typed useChat, tool parts, and the usage panel (Builds the client: `useChat<InvoiceUIMessage>` with manually managed input state, a parts-switch rendering text bubbles and `tool-getInvoiceStats` cards across all four lifecycle states with a per-tool skeleton, plus a 10s-polling token-usage panel.)
- 6 Verify (Walks every "Done when" clause: grounded answers cite real Drizzle numbers, forged `orgId` is refused, the loop caps at 5 steps, the quota returns 429, tools return typed errors instead of throwing, and the `authedRoute` wrap holds.)
