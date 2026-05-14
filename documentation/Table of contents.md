# Web Dev Course (2026) — Proposed Curriculum Structure (v3)

---

## Unit 1 — Setup and the Toolchain

> Pin a working machine and scaffold the first project — the practical floor every later unit assumes.

### Chapter 1.1 — Introduction
- 1.1.1 Who this course is for and what you'll be able to ship — the returning-developer reader, the production-code-review bar, the time shape, and a self-check before committing
- 1.1.2 The two pillars — senior-mindset over syntax and the minimum viable 2026 stack as operational filters, plus the deliberate silence on AI in lesson material
- 1.1.3 The 2026 stack at a glance — a one-page map of every load-bearing tool, grouped by role, with the senior reason each wins (or the trigger that would flip it), pinned to May 2026
- 1.1.4 Prerequisites — what's assumed without ceremony, what's re-taught properly (closures, the cascade, modules, async, HTTP semantics, the React render model) and where, what's deliberately cut, plus a returning-dev litmus self-assessment
- 1.1.5 How a lesson works and how to use this course — defaults vs. conditionals, "name the trigger" before any power tool, principles inline, lesson anatomy, quizzes, the project repo and `degit` fetch, the hosted-service accounts (and the one cheap domain) needed later

### Chapter 1.2 — Runtime and package manager
- 1.2.1 Pinning the toolchain with mise — Node 24 LTS and the broader polyglot toolchain pinned per-repo so every contributor and CI box runs identical versions; nvm/Volta dismissed with the trigger that would flip the choice
- 1.2.2 pnpm: install, scripts, and self-managed versions — pnpm pinned through mise, the post-Corepack `packageManager` flow, the minimum viable `package.json` and `.npmrc`, the four daily commands, and the one-line dismissal of Bun
- 1.2.3 The lockfile as a contract — what `pnpm-lock.yaml` records, what committing it prevents (and never in `.gitignore`), `--frozen-lockfile` in CI, merge-conflict handling, and the `only-allow pnpm` preinstall guard
- 1.2.4 Running TypeScript: native strip-types, tsx, and tsc — native stripping (stable since Node 25.2.0, backported to 24.12 and 22.18) as the default for backend scripts and CLIs; `tsx` past the named trigger (path aliases, JSX, decorators, downleveling) since native stripping ignores `tsconfig.json`; `tsc → .js` reserved for library publishing and `tsc --noEmit` for CI type-checking

### Chapter 1.3 — Editor and code-quality tools
- 1.3.1 VS Code, the workspace settings the repo owns — the minimum-viable extension set with a senior reason each, `.editorconfig`, and the `.vscode/` files (`extensions.json`, `settings.json`) checked into version control as team artifacts rather than personal preference
- 1.3.2 Biome: one tool, one config, format and lint — Biome as the 2026 default over ESLint+Prettier (single Rust binary, 10–25x faster, domains that auto-enable per dependency), the `next lint` removal in Next.js 16, the minimum-viable `biome.json` wired to `.editorconfig`, the four daily scripts (`format`, `lint`, `check`, `check:ci`), and the safe-vs-unsafe fix distinction
- 1.3.3 Browser DevTools: the four panels you actually use — Elements (live DOM and cascade), Network (open before the action, throttle, copy-as-fetch), Console (REPL, `$0`, `console.table`), and Application (cookies, storage, service workers); React DevTools installed here for its first call in Unit 4

### Chapter 1.4 — The first project scaffold
- 1.4.1 Cloning the starter and the dev/build cycle — `degit` the course's pinned Next.js 16 + TS + Drizzle scaffold, read the file tree end to end, run `pnpm dev` and `pnpm build` (Turbopack on both by default in Next.js 16), commit the toolchain decisions from Chapters 1.2–1.3 into a real codebase
- 1.4.2 AGENTS.md as the next contributor's briefing — the file the next human or coding agent reads on day one; what earns a place (thesis, pinned stack, layout, commands, conventions), what doesn't (aspirational prose, duplicated rules, hand-maintained file lists); full doctrine in Chapter 22.1
- 1.4.3 The strictness floor the project owns in tsconfig.json — `strict`, `noUncheckedIndexedAccess`, `noFallthroughCasesInSwitch`, `noImplicitOverride`, `forceConsistentCasingInFileNames`, path aliases; each flag named by the bug class it catches, `exactOptionalPropertyTypes` parked as the conditional
- 1.4.4 The compatibility flags Next.js owns in tsconfig.json — `target`/`lib`, `module`/`moduleResolution: "bundler"`, the transpiler-alignment trio (`verbatimModuleSyntax`, `isolatedModules`, `esModuleInterop`), `jsx: "preserve"`, `noEmit`, the Next.js plugin; the rule "if you're tempted to edit a flag in this lesson, you're probably wrong"
- 1.4.5 Type-safe environment variables with `@t3-oss/env-nextjs` — Zod 4-validated env at build time so a missing or misnamed `DATABASE_URL` fails before deploy, not at first request in production; the `server`/`client` split, the `NEXT_PUBLIC_*` convention, the `.env.example` → `.env.local` pattern, `SKIP_ENV_VALIDATION` as a deliberate escape hatch; non-negotiable from the first scaffold (revisited under the security baseline in Chapter 17.2)

---

## Unit 2 — JavaScript and TypeScript as One Language

> Re-teach the JS surface a returning dev needs at adult depth, with the type system woven through it from the first lesson — and seed the naming-for-intent discipline that recurs everywhere.

### Chapter 2.1 — Values, references, and equality
- 2.1.1 Values, references, and what assignment actually does — primitives vs. objects, shared references, `structuredClone` as the deep-copy reach
- 2.1.2 Equality semantics — `===` as the default, `Object.is` for `NaN` and signed zero, `Number.isNaN` over the coercing global, why `==` is never the senior's first reach
- 2.1.3 Numbers, BigInt, and money — IEEE 754 at the depth that bites, the cents-as-integers rule, the `Number.is*` family, when `BigInt` earns its weight
- 2.1.4 Strings, Unicode, and the length problem — code units vs. code points vs. graphemes, `Intl.Segmenter` for user-perceived counts, the common string-method surface, `normalize` for visually-identical inputs
- 2.1.5 Template literals and tagged templates — the senior default for interpolation and multi-line, tagged templates as the conditional with `sql\`...\`` as the canonical case
- 2.1.6 Variables — `let`, `const`, scope, and the TDZ — what `const` prevents vs. what it doesn't, block scope, the Temporal Dead Zone as structural enforcement
- 2.1.7 Quizz

### Chapter 2.2 — Functions, naming, and control flow
- 2.2.1 Function forms and when each earns its weight — declarations, expressions, arrow functions; arrow-`const` as the 2026 default, `function` as the conditional for hoisting, named recursion, type-guard narrowing
- 2.2.2 Parameters, defaults, rest, and spread — the two-positional-parameter rule, the options-object pattern, `undefined`-vs-`null` default firing, rest and spread at the call site (TS-typed throughout)
- 2.2.3 Naming for intent (Architectural Principle #4 introduced) — name things for intent, not implementation; the four naming surfaces (variables, functions, parameters, types) and the three bad-name classes; recurring beat thereafter at every later naming-matters moment (action names, schema fields, components, table names, file co-location)
- 2.2.4 Control flow that stays flat — `if` / `else if` / `else`, guard clauses and early returns, ternaries, `switch` with `noFallthroughCasesInSwitch` and `assertNever` exhaustiveness, the lookup-map alternative, the loop forms (`for...of` default)
- 2.2.5 Optional chaining, nullish coalescing, logical assignment — `?.` at each link, `??` over `||` for defaults (the `0` / `''` / `false` trap), `??=` for lazy initialization
- 2.2.6 Destructuring — object, array, rename, defaults, rest; the parameter-destructure form, the destructure-then-rebuild pattern for explicit field forwarding
- 2.2.7 Closures and the boundary they explain later — lexical capture by reference, with the senior anchors for Server Actions, `useEffect` cleanups, and route-handler factories already named
- 2.2.8 Quizz

### Chapter 2.3 — Objects, arrays, and collections
- 2.3.1 Objects: access, construction, and the static `Object.*` helpers — property access, computed keys, shorthand, spread; `Object.keys`/`values`/`entries`/`fromEntries`; `Object.groupBy`
- 2.3.2 Arrays: indexing, length, and the immutable update reflex — index access under `noUncheckedIndexedAccess`, `.at`, `length` semantics; the non-mutating update family (`.toSorted`, `.toReversed`, `.toSpliced`, `.with`)
- 2.3.3 The array method surface a senior reaches for — `map`, `filter` with type predicates, `reduce`, `find`/`findLast`, `some`/`every`, `flatMap`; when to drop out of the chain
- 2.3.4 Set, Map, WeakSet, WeakMap, and the modern Set methods — when each earns its weight; `Map.groupBy`; the ES2025 Set composition methods (`intersection`, `union`, `difference`, `symmetricDifference`, `isSubsetOf`, `isSupersetOf`, `isDisjointFrom`) that kill the lodash reach
- 2.3.5 Iteration, `for...of`, and iterator helpers — the iteration protocol; `for...of`; iterator helpers (`Iterator.prototype.map`/`filter`/`take`/`drop`/`flatMap`/`toArray`/`reduce`) as the lazy alternative to materializing through an array first
- 2.3.6 Regex: the modern flavor — named capture groups, lookaheads and lookbehinds, the `u` and `v` Unicode flags, property escapes; `.matchAll` and the boundary where parsers replace regex
- 2.3.7 Quizz

### Chapter 2.4 — TypeScript: typing the values you already know
- 2.4.1 Primitives, literal types, and the four corners — `unknown` vs. `any` vs. `never` vs. `void`
- 2.4.2 `type` vs. `interface` and per-field modifiers — `?`, `readonly`, the array-level `readonly` and `Readonly<T>` cousin
- 2.4.3 Tuples and readonly tuples — labeled positions, the `useState` shape, when an object beats a tuple
- 2.4.4 Index signatures and `Record<K, T>` — open-keyed records vs. finite-keyed completeness, and the `noUncheckedIndexedAccess` divergence
- 2.4.5 Unions and intersections — the composition operators, with the discriminated-union shape seeded for Chapter 2.5
- 2.4.6 Narrowing without `as` and `!` — control-flow, `typeof`/`instanceof`/`in`/`Array.isArray` guards, and the three legitimate triggers for the assertion escape hatches
- 2.4.7 `as const` and `satisfies` — keeping literal types narrow and validating against contracts without widening
- 2.4.8 Inference, annotations, and type-only imports — annotate the boundaries, infer the locals, route types through `import type`
- 2.4.9 Quizz

### Chapter 2.5 — TypeScript moves that prevent bug classes
- 2.5.1 Discriminated unions and Architectural Principle #7 — making impossible states unrepresentable; the principle introduced — TypeScript for the moves that prevent bug classes, not as syntax
- 2.5.2 Flow state machines — multi-step processes modeled as states + transitions + per-state invariants; canonical examples (optimistic-mutation triplet, upload state, subscription state) seeded here, cashed in at the call sites in later units
- 2.5.3 Type predicates, assertion functions, and `assertNever` — exhaustiveness as compile-time safety
- 2.5.4 Branded types for IDs — `userId` and `orgId` stop being interchangeable strings
- 2.5.5 `keyof`, `typeof`, and indexed access types — derive types from values, never duplicate
- 2.5.6 Utility types — the daily-reach surface (`Partial`, `Pick`, `Omit`, `Record`, `Readonly`, `Required`, `NonNullable`, `Extract`, `Exclude`, `ReturnType`, `Parameters`, `Awaited`)
- 2.5.7 Generics — basics, constraints, defaults
- 2.5.8 Quizz

### Chapter 2.6 — Modules and the module graph
- 2.6.1 ESM exports, imports, and the bare-specifier model — named/default/side-effecting/dynamic export forms, the matching import surface under `verbatimModuleSyntax`, `node_modules` resolution and the `package.json` `exports` field
- 2.6.2 The module graph: evaluation order, live bindings, dynamic import, and the server/client boundary — depth-first walk and cycle handling, live-binding semantics vs. CJS copy, dynamic `import()` as a deferred edge, `"use client"` as a client-subgraph root, `import 'server-only'`/`'client-only'` poisoning
- 2.6.3 Top-level await and module-init patterns — the canonical `env.ts` shape, the cost of async modules propagating upward, the senior call between top-level await and lazy init
- 2.6.4 Module augmentation: extending third-party types — `declare module` in `.d.ts` files, the canonical sites (Better Auth `Session`, Drizzle relations, `next-intl` messages), tying branded IDs to a third-party session shape at the source
- 2.6.5 Quizz

### Chapter 2.7 — Async semantics
- 2.7.1 The event loop and the microtask queue — the runtime model under every async API: call stack, microtask drain rule, macrotask tick, `await` as microtask-paced
- 2.7.2 Promises: the combinator surface and modern construction — `.then`/`.catch`/`.finally`, `Promise.all`/`allSettled`/`any`/`race` with senior triggers per combinator, `Promise.withResolvers` as the modern replacement for the deferred-pattern boilerplate
- 2.7.3 `async`/`await`: sequential vs. parallel, the N+1 trap, async iteration — the dependency-check reflex, `Promise.all` over independent operations, the N+1 trap inside `.map()`, `for await...of` for streams and paginated APIs
- 2.7.4 `AbortController`, `AbortSignal`, and structured cancellation — fetch cancellation, `AbortSignal.timeout`, `AbortSignal.any` for composing user-cancel and timeout, the `{ signal }` parameter shape every modern web API speaks
- 2.7.5 Quizz

### Chapter 2.8 — Errors as a first-class concern
- 2.8.1 `try`/`catch`/`finally` and the throw-vs-return decision — synchronous and async mechanics, the "only throw `Error`" rule, expected failures as `Result<T, E>` values vs. unexpected failures as throws the framework boundary catches
- 2.8.2 `unknown` in catch, custom errors, and `Error.cause` — narrowing `unknown` with `instanceof Error` and `ensureError`; custom `Error` subclasses with literal `name` discriminants; `Error.cause` for re-wrap and chain walking; the `error.name` fallback for `AbortError`/`TimeoutError` and cross-realm `instanceof`
- 2.8.3 Quizz

### Chapter 2.9 — Practical odds and ends
- 2.9.1 JSON at the wire boundary — `JSON.parse`/`JSON.stringify`, the serialization gotchas (`Date`, `undefined`, `BigInt`, `NaN`/`Infinity`), the parse-to-`unknown`-then-validate-with-Zod discipline (full schema authoring in Unit 7.1)
- 2.9.2 Classes, narrowly: where they still earn their weight — the three sites (custom `Error` subclasses, adapters wrapping a class-based SDK, the rare custom domain class with identity and state); the minimum class surface (constructor, `readonly`/`#field`, the arrow-field method, the static factory); why everything else stays as functions
- 2.9.3 `Date`'s problems and the Temporal pivot — `Date`'s known design issues (zero-indexed months, mutability, timezone as second-class, the `Invalid Date` sentinel), Temporal as the 2026 senior reach (Stage 4 / ES2026 March 2026, unflagged in Node 26 May 2026), `temporal-polyfill` on the Node 24 LTS line; full timezone/storage/formatting treatment in Chapter 18.1
- 2.9.4 Quizz

---

## Unit 3 — HTTP, the Browser Platform, and the APIs Under React

> Cover the request lifecycle, the DOM substrate, and the browser APIs every later pattern reaches for — at the depth a SaaS engineer needs, no deeper.

### Chapter 3.1 — How a request becomes a page
- 3.1.1 URL bar to first byte — DNS, transport, and the request: the four-step network leg, the 2026 protocol stack (HTTP/3 over QUIC, HTTP/2 fallback), reading the DevTools Network waterfall
- 3.1.2 First byte to pixels — parsing, painting, and hydration: the browser pipeline (DOM, CSSOM, render tree, paint), CSR vs. SSR vs. streaming SSR, hydration as the seam Unit 4 and Unit 5 will land on
- 3.1.3 HTTPS and certificates — the dev-time leak: the TLS 1.3 handshake at the depth that matters, the cert chain, `mkcert` as the local-CA bridge, the secure-context-required APIs that won't fire on `http://`
- 3.1.4 Quizz

### Chapter 3.2 — HTTP at the depth a SaaS engineer needs
- 3.2.1 Methods and idempotency: the safe-to-retry contract — GET, POST, PUT, PATCH, DELETE semantics; idempotency as the retry anchor; the `Idempotency-Key` header pattern
- 3.2.2 Status codes: the response contract — the 2xx/3xx/4xx/5xx subset that bites in SaaS (200, 201, 202, 204; 301, 302, 303, 307; 400, 401, 403, 404, 409, 422, 429; 500, 502, 503, 504) and RFC 9457 Problem Details as the 2026 error-body shape
- 3.2.3 Headers: content, caching, auth, and the metadata channel — content negotiation, `Cache-Control` directives, `Authorization` schemes, rate-limit signaling, custom-header conventions
- 3.2.4 Quizz

### Chapter 3.3 — URLs, origins, and security boundaries
- 3.3.1 The URL spec: anatomy, parsing, and `URLSearchParams`
- 3.3.2 The same-origin policy: the browser's default trust boundary
- 3.3.3 CORS: preflights, credentials, and the failure modes
- 3.3.4 Quizz

### Chapter 3.4 — Cookies and the trust model (light)
- 3.4.1 Cookies: attributes, scope, and the senior defaults — `HttpOnly`, `Secure`, `SameSite`, `Path`/`Domain`, the `__Host-` prefix, expiration, and the 2026 third-party-cookie reality (the conceptual frame; auth wires later)
- 3.4.2 Quizz

### Chapter 3.5 — The DOM and event substrate
- 3.5.1 The DOM as a tree of nodes — the substrate every later UI lands on
- 3.5.2 Attributes vs. properties — what HTML serializes vs. what JavaScript reads from a live element (`class` vs. `className`, `for` vs. `htmlFor`, value-as-property)
- 3.5.3 The DOM event model — bubble, capture, delegation, passive listeners, and `AbortController` cleanup
- 3.5.4 Quizz

### Chapter 3.6 — Fetch and live data
- 3.6.1 Fetch fundamentals — Request, Response, Headers, FormData
- 3.6.2 Streaming responses — ReadableStream, chunked transfer, and Server-Sent Events
- 3.6.3 Quizz

### Chapter 3.7 — Browser platform APIs the SaaS UI reaches for
- 3.7.1 Web Crypto: random IDs and HMAC signatures — `crypto.randomUUID`, `crypto.getRandomValues`, and `crypto.subtle` for HMAC sign/verify with constant-time comparison as the timing-attack mitigation (load-bearing for invitations, magic-link tokens, webhook signatures)
- 3.7.2 The Clipboard API: copy and paste from web pages — `navigator.clipboard.writeText`/`readText`, secure-context plus transient-user-activation constraints, the canonical "Copy" button shape (load-bearing for copy-invite-link, copy-API-key, copy-webhook-secret)
- 3.7.3 Blob, File, and `URL.createObjectURL`: the upload primitives — file picker, MIME-type / size validation, preview through `blob:` URLs with `revokeObjectURL` cleanup, foreshadowing the R2 presigned-PUT in Chapter 13.3
- 3.7.4 Web Storage: localStorage and sessionStorage, lightly — the cookie / URL state / server state / `localStorage` / `useState` decision; SSR safety, what `localStorage` is not for (auth, PII, large or expiring values)
- 3.7.5 Quizz

---

## Unit 4 — React, JSX, and Tailwind as the UI Layer

> Teach the React render model, hooks, and Tailwind as one cohesive UI layer — components and the cascade learn together because they ship together.

### Chapter 4.1 — JSX and HTML semantics through JSX
- 4.1.1 JSX as HTML through React's lens — `className`, event props, fragments, conditional rendering, lists with keys; void elements and self-closing in JSX
- 4.1.2 The Next.js root layout — document structure (`html`, `head`, `body`, `meta`), the metadata API, and the Server Component default
- 4.1.3 Semantic landmarks and the heading hierarchy — `header`, `nav`, `main`, `article`, `section`, `aside`, `footer`, and the h1–h6 outline
- 4.1.4 Buttons, links, and lists — `<button type>` defaults, `<a target rel>` security, `<Link>` vs. `<a>`, `<ul>`/`<ol>` semantics
- 4.1.5 Forms: the element contract — `<form>`, `<input>` types, `<label htmlFor>`, `<fieldset>`, `<legend>`, `name` as the `FormData` key
- 4.1.6 Data attributes, ARIA basics, and tables — `data-*` for script hooks, `aria-*` for assistive-tech signals, `<table>` when the data is actually tabular
- 4.1.7 Quizz

### Chapter 4.2 — Tailwind as the CSS surface, where it touches React
- 4.2.1 Utility-first thinking, variants, and arbitrary values
- 4.2.2 Tailwind v4 CSS-first config: `@theme`, `@utility`, `@container`
- 4.2.3 Class composition with `cn()` (`clsx` + `tailwind-merge`)
- 4.2.4 State and structural variants: `data-*`, `aria-*`, `group`, `peer`, `has`
- 4.2.5 The `dark:` variant and the semantic-token model
- 4.2.6 `next-themes`: React-side theme wiring without FOUC
- 4.2.7 Quiz

### Chapter 4.3 — The cascade, inheritance, and design tokens
- 4.3.1 Cascade resolution: layers, specificity, and the `!` modifier
- 4.3.2 Inheritance and which properties flow through the tree
- 4.3.3 Preflight: naming Tailwind's base reset
- 4.3.4 CSS custom properties as the design-token substrate
- 4.3.5 Chapter quiz

### Chapter 4.4 — Layout and sizing
- 4.4.1 The box model, `box-sizing`, and the inline/block axis — content/padding/border/margin, `border-box` as the Preflight default, the Tailwind `--spacing` scale, and logical properties (`ps-*`/`pe-*`/`ms-*`/`me-*` and the new `inset-s-*`/`inset-e-*`/`inset-bs-*`/`inset-be-*` family) as the RTL-aware form
- 4.4.2 Display modes: block, inline, flex, grid, contents — the choice of layout primitive, `inline-flex` for icon-and-label clusters, `display: contents` for semantic wrappers that shouldn't disrupt layout, the `display: none` / `visibility: hidden` / `aria-hidden` decision tree
- 4.4.3 Flexbox: the 1D layout primitive — main and cross axes, `flex-1` and `shrink-0`, `justify-*` vs. `items-*`, `gap` as the spacing default, the `min-w-0` companion fix, the five canonical layouts
- 4.4.4 Grid: the 2D layout primitive — tracks, the `fr` unit, `repeat(auto-fit, minmax(...))` for responsive without breakpoints, `grid-template-areas` for page shells, `subgrid` for nested alignment, `place-items-*`
- 4.4.5 Sizing: width, height, min/max, viewport units, aspect-ratio — `size-*` (the v4 width-and-height shortcut), the `vh`/`dvh`/`svh`/`lvh` family (with `min-h-dvh` as the mobile reflex), `aspect-ratio` for media containers, intrinsic vs. extrinsic sizing, `clamp()` for fluid sizing
- 4.4.6 Spacing inside containers: `gap` as the senior default — `space-x`/`space-y` as legacy, `divide-x`/`divide-y` for visible separators between items, the gap-vs-margin decision
- 4.4.7 Position and the inset utilities — static, relative, absolute, sticky, fixed; the containing-block rules; the `inset-*` family; CSS anchor positioning (Baseline 2026) as a forward reference for popovers
- 4.4.8 Overflow and scroll containers — overflow modes, `overscroll-behavior` for the iOS scroll-chain bug, `scrollbar-gutter: stable`, sticky-inside-overflow, the page-scroll vs. app-shell-scroll decision, scroll-snap for carousels
- 4.4.9 Stacking context and z-index — what creates a stacking context (`opacity < 1`, `transform`, `filter`, `position: fixed/sticky`, `isolation: isolate`, etc.), the canonical trapped-modal bug, the fix is portal-to-body or `isolation: isolate`, z-index tier conventions
- 4.4.10 Chapter quiz

### Chapter 4.5 — Typography, color, motion, responsive
- 4.5.1 Typography: fonts, scale, and the reading surface — the system-plus-`next/font` stack, the `text-*`/`leading-*`/`tracking-*` scales, `text-balance` on headings and `text-pretty` on body, `max-w-prose` reading width, `truncate` / `line-clamp-*` / `tabular-nums`
- 4.5.2 Color, opacity, and the modern color spaces — OKLCH as the token storage form, `color-mix(in oklch, ...)` for runtime mixing, the `bg-blue-500/50` alpha syntax compiling to `color-mix()`, semantic tokens over primitives, `opacity` vs. per-property alpha and the stacking-context trigger, `prefers-color-scheme` vs. `.dark`
- 4.5.3 Borders, radius, and shadows — `outline` vs. `border` for focus rings, `ring-*` as the multi-layer shorthand, the `shadow-*` elevation scale, `drop-shadow` vs. `box-shadow`, `backdrop-filter` for glass-morphism headers
- 4.5.4 Pseudo-classes for interaction state and the `:has()` reach — `:focus-visible` as the canonical focus reflex, `:focus-within` for parent-of-focused, disabled/checked/invalid states, `:has()` and the JavaScript class toggles it retired, `:not()`, placeholder pseudo-elements, the iOS sticky-hover gate
- 4.5.5 Animation: keyframes, transitions, and the shadcn dependency — `transition-*` for property motion (cheap properties: `transform`, `opacity`), `animate-*` with `@keyframes` in `@theme`, `tw-animate-css` as the shadcn dialog/sheet/accordion dependency, the `data-[state=open]:animate-in` pattern, `prefers-reduced-motion` and `motion-reduce:`
- 4.5.6 Media queries and the responsive design model — mobile-first as the senior default, the Tailwind `sm`/`md`/`lg`/`xl`/`2xl` scale, breakpoints are content-driven not device-driven, the `prefers-*` family, `@media (hover: hover)` and the iOS sticky-hover bug, `hidden md:block` / `md:hidden`
- 4.5.7 Container queries: component-level responsive — `container-type: inline-size` as the default, `@container` plus `@sm:` / `@md:` Tailwind variants, the `cqi` unit with `clamp()` for fluid component typography, named containers for nested structures, the viewport-vs-container decision rule
- 4.5.8 Chapter quiz

### Chapter 4.6 — Components and composition
- 4.6.1 Components, props, and the typed contract — destructured props, `type Props` over `interface`, `ComponentProps<'tag'>` and `ComponentProps<typeof Component>` for native-attribute inheritance and wrapper typing, variant unions over boolean props, `className` plus `...rest` as the styling discipline, default values via destructuring
- 4.6.2 `children`, composition patterns, and the named-slot reach — `ReactNode` as the universal slot type, compound components (the shadcn `<Card><CardHeader>...</CardHeader></Card>` shape) as the 2026 default, prop-as-slot for one named region, render-prop and `Children.toArray` as recognition-level patterns, fragments and the conditional-render `0`-falsy trap
- 4.6.3 Polymorphic components with `Slot`, `asChild`, and `cva` — `@radix-ui/react-slot` merging classes/props/refs onto the consumer's child, `class-variance-authority` for the variant table, `VariantProps<typeof variants>` for typing, `compoundVariants` for combination tweaks, the canonical shadcn Button template, the generic `as` prop named once and rejected
- 4.6.4 Refs as a prop in React 19 — destructuring `ref` from props (no more `forwardRef`), ref types (`Ref<T>`, `RefObject<T>`), ref callbacks with the React 19 cleanup return, merging multiple refs onto one node, `useImperativeHandle` as the rare escape valve, the legacy migration path
- 4.6.5 Portals: modals, toasts, and anchored overlays — `createPortal` as the layout escape, the three canonical reaches (modals, toasts, anchored popovers), the SSR `document` guard, the accessible-modal contract (focus trap, scroll lock, `Esc`), the native `<dialog>` element and CSS anchor positioning as the platform alternatives, event bubbling through the React tree not the DOM tree
- 4.6.6 Chapter quiz

### Chapter 4.7 — The render model
- 4.7.1 Render triggers and reference identity — what triggers re-render (own state, parent, context), `Object.is` on props, inline literals as identity churn, the React Compiler as the retirement of manual memoization
- 4.7.2 Reconciliation, keys, and component identity — the same-type-updates-in-place heuristic, identity by position by default and by `key` when provided, the index-as-key anti-pattern
- 4.7.3 Keeping components pure — render is a pure function of props and state; side effects belong in handlers/effects; the contract the React Compiler depends on; the DevTools compiler badge as the audit signal
- 4.7.4 State as a snapshot and the updater form — render is a snapshot of state; the updater form `setX(prev => ...)` under React 19 automatic batching; stale closures in async callbacks
- 4.7.5 Resetting state with the `key` prop — component identity as a state-reset; the canonical "form fields stuck on the previous record" fix; the reset-by-button-bump pattern
- 4.7.6 JSX synthetic events — `SyntheticEvent` over native, delegation at the React root, typed handlers (`MouseEvent<HTMLButtonElement>`), `e.currentTarget` over `e.target`, `e.key`, pointer events as the unified primitive
- 4.7.7 Chapter quiz

### Chapter 4.8 — Hooks: state and refs
- 4.8.1 `useState` — the surface, the bailout rule, and lazy initial state for non-trivial initial computations
- 4.8.2 Derived state — compute in render; the canonical "mirror a prop into state and sync with an effect" anti-pattern and its three fixes (derive, lift, `key`-reset)
- 4.8.3 Where state lives — the four homes (local, lifted, URL, server), the colocate-then-lift reflex, `nuqs` as the URL-state reach
- 4.8.4 `useReducer` — the threshold for multi-transition state, discriminated-union actions, the reducer purity contract, async-lives-in-the-handler
- 4.8.5 `useRef` — DOM access and instance values; the state-vs-ref rule (does the JSX read it?); the don't-read-or-write-in-render rule; refs and the React Compiler
- 4.8.6 `useId` — stable IDs across SSR for ARIA wiring; the position-in-the-tree derivation; the not-for-list-keys rule
- 4.8.7 Chapter quiz

### Chapter 4.9 — Hooks: effects and external systems
- 4.9.1 Strict Mode as the dev-time correctness contract — double-invocation as the impurity- and missing-cleanup-surfacing mechanism
- 4.9.2 `useEffect`: synchronizing with external systems — the cleanup-and-resync model, dependency rules, and the narrowed 2026 role
- 4.9.3 `useEffectEvent` for non-reactive logic inside effects — the reactive/non-reactive seam (React 19.2, stable)
- 4.9.4 You might not need an effect — the five-quadrant audit and the canonical anti-patterns
- 4.9.5 `useContext` and the re-render cost — split-context, state/dispatch split, stable provider values
- 4.9.6 `useTransition` and `useDeferredValue` for concurrent updates — urgency over speed; wrap-setter vs. wrap-value
- 4.9.7 `use()` for promises and contexts — the Server-to-Client streaming primitive and the conditional-call exception
- 4.9.8 The rules of hooks and the lint rule — the indexed-slot mechanic and the ESLint surface
- 4.9.9 Chapter quiz

### Chapter 4.10 — Custom hooks and what to stop hand-tuning
- 4.10.1 Custom hooks: extracting reusable behavior — the `use*` naming convention, the share-code-not-state rule, when a custom hook earns its weight, the canonical 2026 catalog
- 4.10.2 The React Compiler — what it auto-memoizes and how to enable it (`reactCompiler: true` in `next.config.ts`, `babel-plugin-react-compiler` installed); stable in Next 16 but not default-on, named explicitly per "explicit over magic"
- 4.10.3 Manual memoization, the narrow cases that remain — the four cases where `memo` / `useMemo` / `useCallback` still earn their weight; what to stop hand-tuning, including `useMemo` everywhere and premature `dynamic()`
- 4.10.4 Chapter quiz

### Chapter 4.11 — shadcn/ui and the accessibility baseline
- 4.11.1 shadcn/ui — the copy-into-repo component system: CLI, `components.json`, Radix-vs-Base engine choice, `asChild` slot composition, semantic-token theming, when to fork, the registry and namespace model
- 4.11.2 The accessibility baseline as discipline — the four commitments (keyboard, WCAG 2.2 AA contrast, `prefers-reduced-motion`, touch target size); per-element specifics (`<button type>`, `<label htmlFor>`, `:focus-visible`) are taught at their call sites in earlier chapters
- 4.11.3 ARIA: roles, labels, and live regions — the "first rule of ARIA," icon-only button labels, `aria-describedby` wiring, the live-region pre-mount rule, `role="status"` vs. `role="alert"`
- 4.11.4 Focus management — modal focus trap (Radix-handled), the route-change focus reflex Next.js does not provide, skip links, post-submission focus rules, the `disabled` vs. `aria-disabled` decision
- 4.11.5 Empty, loading, and error states — `Skeleton`, `Empty`, `Alert`; the four-state component contract; the discriminated-union state model over three booleans; stale-while-refetching and optimistic-state recognition
- 4.11.6 Chapter quiz

### Chapter 4.12 — Project: themed product surface
- 4.12.1 Project brief
- 4.12.2 Starter walkthrough
- 4.12.3 Header, hero, and the feature grid with CVA variants
- 4.12.4 Pricing table, footer, and the theme toggle without FOUC
- 4.12.5 Mobile nav drawer with `useLockBodyScroll` and focus trap
- 4.12.6 Verify

---

## Unit 5 — Next.js and the App Router

> Wire React into the App Router, name the server/client boundary, and learn the rendering and caching model that every later SaaS pattern relies on.

### Chapter 5.1 — The first project — file structure and routing
- 5.1.1 The App Router project: file tree, `page.tsx`, and co-location — `pnpm create next-app` named for recognition only (the course pins a starter); the canonical `app/` shape; `page.tsx` as the route leaf; Architectural Principle #1 introduced — co-locate by feature, not by layer; private folders (`_components/`, `_lib/`) as the senior form for non-routable colocation
- 5.1.2 Layouts, nested layouts, and route groups — `layout.tsx` as the shell every nested route renders inside; layouts compose down the tree; the layout/page render boundary (layouts stay mounted, pages re-mount); `template.tsx` named once for the remount-on-navigation case; route groups (`(folder)`) for organization without URL impact and for shared-layout-without-URL-prefix patterns
- 5.1.3 Dynamic segments and catch-all routes — `[param]` for single dynamic segments; `params` as a Promise in Next.js 16 (awaited in Server Components, unwrapped with `React.use()` in Client Components); catch-all `[...slug]` for genuinely variable-depth URLs; optional catch-all `[[...slug]]` for "match parent and all children"; validating `params` with Zod; `generateStaticParams` named once as the build-time SSG hook (Chapter 5.6.11)
- 5.1.4 Navigation: `<Link>`, `redirect`, `notFound`, `permanentRedirect` — `<Link>` for in-app soft navigation with intelligent prefetching (static on viewport, dynamic on hover); `useRouter().push` for programmatic navigation from Client Components (full surface in 5.5.5); `redirect()` (307) for server-side temporary; `permanentRedirect()` (308) for permanent URL moves with the SEO threshold; `notFound()` for "resource doesn't exist" signals; `<a>` reserved for external links
- 5.1.5 Parallel routes and slots — named slots (`@slot`) rendered alongside `children` in a layout, each owning its own loading, error, and not-found boundary; the canonical list-plus-detail surface where both live under the same URL; `default.tsx` per slot for the unmatched-slot fallback that prevents a 404 on direct navigation; how parallel slots stream independently when paired with Suspense (revisited in 5.3.2)
- 5.1.6 Intercepting routes and the modal-with-real-URL pattern — `(.)`, `(..)`, `(..)(..)`, `(...)` prefixes; soft-navigation interception for the "modal or side-panel that has a real URL" pattern; the always-paired non-intercepting `page.tsx` that shadows the intercepted route on direct visits, refresh, and `Cmd+click`; closing the modal as a navigation, not a state toggle; the senior anchor for why a state-driven modal loses URL persistence, refreshability, and shareability
- 5.1.7 Quizz

### Chapter 5.2 — The server / client boundary
- 5.2.1 Server Components — fundamentals, async components, server-side data fetching, composition with Client Components
- 5.2.2 Client Components and the boundary contract — fundamentals, the two-render model, the "push the boundary down" reflex, the cost ledger
- 5.2.3 Directives and structural enforcement of the boundary — `"use client"` and `"use server"` semantics; Architectural Principle #6 introduced (prefer explicit over magic, named at the directives as the canonical "name the magic" case); `server-only` / `client-only` packages as compile-time enforcement
- 5.2.4 What crosses the wire — RSC serialization and structured clone; supported shapes (primitives, plain objects, arrays, `Map`, `Set`, `Date`, typed arrays, Promises, JSX, Server/Client references); rejected shapes (functions, class instances, WeakMap); the secrets-in-props leak
- 5.2.5 Hydration — what it is, mismatch causes (`Date.now`, `Math.random`, locale, timezone, browser extensions, stale `.next/dev` cache), `useEffect`/`useId`/`suppressHydrationWarning` as the canonical fixes
- 5.2.6 Quizz

### Chapter 5.3 — Async UI primitives
- 5.3.1 Suspense as a declarative loading contract
- 5.3.2 Streaming at the route boundary
- 5.3.3 `loading.tsx`, `error.tsx`, and `not-found.tsx` — the platform's async-UI primitives; `error.tsx` wraps React's underlying class-based Error Boundary mechanism, named once where it bites (the file-convention is the form learners will write)
- 5.3.4 `global-error.tsx` — the root-layout error boundary that catches what `error.tsx` can't
- 5.3.5 Quizz

### Chapter 5.4 — Rendering and caching in Next.js 16
- 5.4.1 Static and dynamic rendering under Cache Components — `cacheComponents: true` flips the default so every route is dynamic in Next.js 16; per-component opt-in via `use cache`; the explicit dynamic signals (`params`, `searchParams`, `cookies()`, `headers()`, `draftMode()`, `connection()`)
- 5.4.2 Partial Prerendering as the 2026 rendering shape — static shell with streamed dynamic holes; the Suspense boundary as the seam; the pure-static and pure-dynamic degenerate cases
- 5.4.3 Cache Components and the `use cache` directive — three placements (page, component, function); the compiler-generated cache key; serializable arguments and return value; the closure rules
- 5.4.4 `cacheLife` for freshness and `cacheTag` for invalidation — the three-number lifetime (stale, revalidate, expire); preset profiles; tag naming conventions for entity-level and record-level invalidation
- 5.4.5 React `cache()` for per-request memoization — the request-scoped layer; the contrast with `use cache` for cross-request persistence; the canonical pattern for the request-scoped user
- 5.4.6 The post-mutation invalidation surface — `updateTag` (Server-Action-only, read-your-writes), `revalidateTag` (stale-while-revalidate), `revalidatePath`, `router.refresh`; the user-expectation question that picks between them
- 5.4.7 Route segment config and async request APIs — the deprecated config (`dynamic`, `revalidate`, `fetchCache`) under Cache Components and what replaces it; awaiting `params`, `searchParams`, `cookies()`, `headers()`, `draftMode()`; `connection()` as the explicit dynamic opt-in; `React.use()` for Client Component unwrap
- 5.4.8 Quizz

### Chapter 5.5 — Server-side reads, the proxy, and URL state
- 5.5.1 Reading the request with `cookies()` and `headers()` — async, server-only, read-only by default; setting cookies requires a Server Action context
- 5.5.2 `proxy.ts` and the matcher — the Node-runtime-only file convention that replaces `middleware.ts` in Next.js 16 (`middleware.ts` named once as the deprecated Edge-runtime predecessor); the matcher as the cost-control surface; what the proxy is for and what it isn't
- 5.5.3 Rewrites and redirects in `proxy.ts` — redirect vs. rewrite semantics, 307 vs. 308, the proxy-vs-`next.config.ts`-vs-`redirect()` decision tree, open-redirect prevention on `?next=`
- 5.5.4 URL state with `searchParams` and route params — `params` for identity, `searchParams` for view state; Zod validation at the boundary; the cursor encoding shape; nuqs as the production layer (foundation for SaaS pattern #7)
- 5.5.5 Client-side navigation hooks — `useRouter`, `usePathname`, `useSearchParams`, `useParams` from `next/navigation`; the read-on-server, write-on-client division; `push` vs. `replace` vs. `refresh`; the Suspense requirement on `useSearchParams`
- 5.5.6 Quizz

### Chapter 5.6 — The Next.js project surface
- 5.6.1 `next.config.ts` orientation and server externals — the typed config, the keys the chapter visits, `serverExternalPackages` for SDKs that break bundling, `typedRoutes`, `cacheComponents` flag
- 5.6.2 Images: `next/image`, `remotePatterns`, and the optimization pipeline — required props, `sizes`/`priority`/`placeholder`, the new-in-16 `qualities` requirement, what Vercel's automatic optimization gives for free
- 5.6.3 Static redirects and rewrites in `next.config.ts` — the static, edge-applied side of the redirect/rewrite decision tree
- 5.6.4 `next/font` for self-hosted typography — Google fonts and `localFont`, variable fonts, the Tailwind variable bridge, Geist as the 2026 scaffold default
- 5.6.5 `next/script` for third-party scripts — `beforeInteractive`/`afterInteractive`/`lazyOnload`/`worker`, callbacks, the SDK preference over snippets
- 5.6.6 Metadata API and dynamic OG images — static `metadata`, `generateMetadata`, `metadataBase`, `opengraph-image.tsx` with `ImageResponse`
- 5.6.7 SEO file conventions, viewport, and icons — `robots.ts`, `sitemap.ts`, `icon.{ext}`, `apple-icon`, the separate `viewport` export, `generateViewport`, `themeColor`, JSON-LD named once
- 5.6.8 `generateStaticParams` for build-time route materialization — the catalog hook, `dynamicParams`, pairing with `use cache` and `cacheTag` for the production content-page shape
- 5.6.9 Quizz

### Chapter 5.7 — Project: list-plus-detail with parallel routes
- 5.7.1 Project brief
- 5.7.2 Starter walkthrough
- 5.7.3 Parallel slots with the server-side status filter
- 5.7.4 The intercepting modal and its paired full page
- 5.7.5 Slot-specific Suspense boundaries and skeletons
- 5.7.6 Verify

---

## Unit 6 — Data — Postgres through Drizzle

> Model the data backplane: the relational model, Drizzle as the data-access layer, and the schema as the single source of truth that every later layer derives from.

### Chapter 6.1 — The relational model and the data backplane
- 6.1.1 The relational model: tables, rows, columns, and normalization
- 6.1.2 The local development database: Docker Postgres vs. Neon dev branch
- 6.1.3 Neon: branching per preview deploy and scale-to-zero
- 6.1.4 The Neon serverless driver and connection pooling
- 6.1.5 Chapter quiz

### Chapter 6.2 — Defining schema with Drizzle
- 6.2.1 Architectural Principle #2: the schema is the source of truth
- 6.2.2 pgTable, the schema file, and the casing convention
- 6.2.3 Postgres data types via Drizzle
- 6.2.4 Column modifiers: NOT NULL, DEFAULT, generated columns
- 6.2.5 Primary keys: UUIDv7 by default, identity for high-volume internals
- 6.2.6 Foreign keys and the ON DELETE decision
- 6.2.7 UNIQUE and CHECK constraints
- 6.2.8 Many-to-many junction tables
- 6.2.9 The Drizzle Relations v2 declarative API
- 6.2.10 `$inferSelect` and `$inferInsert`: the canonical row types
- 6.2.11 Chapter quiz

### Chapter 6.3 — Querying and mutating
- 6.3.1 Select, insert, update, delete; where, orderBy, limit; parameterization
- 6.3.2 Joins: inner, left, right, full
- 6.3.3 The relational query API for nested reads
- 6.3.4 Aggregations: count, sum, GROUP BY, HAVING
- 6.3.5 Upserts with ON CONFLICT and RETURNING
- 6.3.6 Pagination: cursor by default, offset when small
- 6.3.7 Subqueries, CTEs, and when to layer the query
- 6.3.8 Light Postgres full-text search
- 6.3.9 JSONB columns and querying
- 6.3.10 When to drop to raw SQL via `` sql`` ``
- 6.3.11 Chapter quiz

### Chapter 6.4 — Performance and integrity
- 6.4.1 Indexes — B-tree, partial, composite, expression, unique; when to add them
- 6.4.2 The N+1 query problem at the Drizzle layer
- 6.4.3 EXPLAIN ANALYZE — reading a query plan
- 6.4.4 Transactions and isolation levels
- 6.4.5 Chapter quiz

### Chapter 6.5 — Migrations and the seed workflow
- 6.5.1 Drizzle Kit: config, generate, migrate, and the studio
- 6.5.2 Migrations in production: hand-edits, push vs. generate, and the zero-downtime discipline
- 6.5.3 Seeding with drizzle-seed: dev fixtures and test factories
- 6.5.4 Chapter quiz

### Chapter 6.6 — Project: org-scoped schema and queries
- 6.6.1 Project brief
- 6.6.2 Starter walkthrough
- 6.6.3 Schema, relations, and the first migration
- 6.6.4 The deterministic seed
- 6.6.5 The two reads: paginated list and single-round-trip detail
- 6.6.6 Verify

---

## Unit 7 — Forms, Validation, and Server Actions

> Validate at every boundary, define the Server Action seam first, write native React 19 forms against it, and decide the error model where it actually bites.

### Chapter 7.1 — Schema-first validation with Zod 4
- 7.1.1 Schemas: primitives, objects, arrays, unions, literals, enums — `z.strictObject` / `z.looseObject` as the top-level forms (the v3 `.strict()` / `.passthrough()` methods are legacy); discriminated unions for tagged shapes
- 7.1.2 Top-level string formats and built-in validators — `z.email`, `z.uuid` (strict RFC) vs. `z.guid` (v3-compatible), `z.url`, `z.cuid`, `z.ulid`, `z.ipv4`, `z.iso.date`/`datetime`/`duration`, number/bigint/date constraints (the v3 `z.string().email()` chain is deprecated)
- 7.1.3 Refinements, transforms, and the checks model — single-field and cross-field `.refine` with `path`, `.superRefine` for multi-issue rules, `.transform` vs. type-preserving `.overwrite()`, `.pipe` for staged validation; the v4 transform-on-refine-fail behavior
- 7.1.4 Composing schemas and inferring types — `.extend`/`.merge`/`.pick`/`.omit`/`.partial`/`.required`/`.readonly`; `z.record(keySchema, valueSchema)` now requires both arguments; `z.infer` vs. `z.input` vs. `z.output` for transform schemas
- 7.1.5 Parsing, safe-parsing, and error customization — `parse` vs. `safeParse` vs. async variants, the `ZodError` issue shape, `z.treeifyError` (replacing v3's `.format()`), the unified `error` option (replacing v3's separate `message` / `invalid_type_error` / `required_error`)
- 7.1.6 Coercion and the `FormData` boundary — `z.coerce` (number, boolean, date, bigint), `z.preprocess` for the HTML checkbox shape, `Object.fromEntries(formData)`, the empty-string and `"on"` traps, `z.coerce.date` vs. `z.iso.datetime`, `File` validation
- 7.1.7 drizzle-zod: the database as the schema's source of truth — `createSelectSchema`, `createInsertSchema`, `createUpdateSchema` (lives inside the drizzle-orm repo); the refinement-on-top pattern, the `jsonb` schema pairing, `createSchemaFactory` for custom Zod instances
- 7.1.8 Quizz

### Chapter 7.2 — Server Actions
- 7.2.1 Defining and invoking a Server Action — `"use server"` at the file or inline, the call-site shapes (`<form action>`, `useActionState`, direct invoke), the serializable-args contract for inputs and return values, what gets stripped from the client bundle
- 7.2.2 Validation as the entry discipline — the five-seam action shape (parse, authorize, mutate, revalidate, return); `safeParse` on `Object.fromEntries(formData)` as the first line of every action; the `drizzle-zod`-plus-refinement source for the input schema; why server-side validation isn't optional even with constraint-API client validation
- 7.2.3 The Result return shape and the throw-versus-Result decision — the canonical `{ ok: true; data } | { ok: false; error: { code, userMessage, fieldErrors? } }` (ties Principle #7 to SaaS pattern #6); the `ok` and `err` helpers; throw at the framework edge (`notFound`, `redirect`, unrecoverable), return Result wherever the form branches on the failure; mapping known database errors to typed codes
- 7.2.4 Architectural principles around the action seam — Principle #3 introduced (pure functions in `/lib`, side effects at named boundaries; the server-action / route-handler / job seam) and the directory shape the chapter writes from; Principle #5 introduced (use the framework's conventions, don't invent a tRPC-style call wrapper); the auth-and-billing carve-outs named ahead for 10.2 and 12.2
- 7.2.5 After the mutation — revalidation, transactions, and idempotency foreshadowed — `revalidatePath` as the basic move (full decision tree in 5.4.6); wrapping multi-step mutations in `db.transaction(async (tx) => …)` and the no-external-calls-inside-the-transaction rule; the idempotency-key slot foreshadowed for 12.1
- 7.2.6 Quizz

### Chapter 7.3 — The native React 19 / Next.js 16 form pattern
- 7.3.1 Uncontrolled inputs and the `FormData` contract — controlled vs. uncontrolled, the `name` attribute as the schema contract, `defaultValue` not `value`, why uncontrolled fits the server-action pattern
- 7.3.2 `<form action={serverAction}>` as the default — the React 19 form primitive, the submit lifecycle, the automatic reset on success, `formAction` per button, when Next.js's `<Form>` earns its weight
- 7.3.3 `useActionState` — pending state and the latest result — the three returns, the action signature change, the canonical form-component shape, field-error rendering from the `Result` tree
- 7.3.4 `useFormStatus` — nested pending state and the `<SubmitButton>` pattern
- 7.3.5 `useOptimistic` — immediate UI updates with rollback — when optimism earns its weight, the implicit rollback, the pairing with `useActionState`, the client-generated UUID pattern
- 7.3.6 The Constraint Validation API for cheap client-side checks — `required`, `pattern`, `type`, `inputmode`, `autocomplete`, `ValidityState`, `setCustomValidity`, the `:user-invalid` pseudo, the line that separates these checks from the Zod schema on the server, the shadcn form layout primitives
- 7.3.7 Progressive enhancement and what falls out for free — what works without JS, what doesn't, the disciplines that keep it working, the manual JS-disabled test
- 7.3.8 Quizz

### Chapter 7.4 — When the platform isn't enough: React Hook Form (conditional)
- 7.4.1 When React Hook Form earns its weight — the four triggers past the native pattern: per-field validation timing, dynamic field arrays, multi-step wizards spanning components, controlled UI library inputs; the form-library landscape (Conform, TanStack Form) named once
- 7.4.2 RHF fundamentals — `useForm`, `register` for native inputs, `Controller`/`useController` for UI library inputs, `handleSubmit`, the `formState` read-side, the shadcn `<Form>` wrapper consuming the RHF instance
- 7.4.3 `zodResolver` — one schema for both sides of the wire; the `z.input` vs `z.output` type bridge; `FormData` vs typed-object action call shape; mapping server-returned `fieldErrors` back into RHF
- 7.4.4 `useFieldArray` — dynamic lists of fields; `append`/`remove`/`move`/`replace`; `field.id` versus the domain ID; per-row error access; the action's insert/update/delete diff inside a transaction
- 7.4.5 Multi-step wizards with `FormProvider` — one `useForm` at the root, `useFormContext` per step, `trigger(fieldNames)` plus schema `.pick()` for per-step validation, `shouldUnregister: false` for back-navigation, the PE casualty named
- 7.4.6 Quizz

### Chapter 7.5 — Route handlers and API contracts
- 7.5.1 When a route handler earns its weight — the five triggers past the Server Action envelope (non-React callers, webhooks, GETs, streaming/large bodies, custom HTTP semantics), the `route.ts` shape, the dynamic-by-default caching, the "do not invent a parallel router" anchor
- 7.5.2 Designing the request/response contract with Zod — the four input sources (path params, headers, query, body) parsed in cheapest-first order, response schemas as contract, RFC 9457 Problem Details as the canonical error shape, schemas-as-OpenAPI named once
- 7.5.3 HTTP semantics applied to your own endpoints — method-by-intent (GET/POST/PUT/PATCH/DELETE), the status-code table the reviewer enforces (400 vs. 422, 404 over 403 on tenant leaks, 409 for conflicts), the `Idempotency-Key` header operationalized
- 7.5.4 Filter, sort, search, paginate at the API boundary — the query-schema shape, the prefix-form sort convention, opaque base64 cursors, the `{ data, pageInfo }` envelope, the shared `where`-builder pure function consumed by both the handler and the in-app Server Component
- 7.5.5 Quizz

### Chapter 7.6 — Project: CRUD via Server Actions
- 7.6.1 Project brief
- 7.6.2 Starter walkthrough — Unit 6 schema carry-in, shadcn form primitives, page shells, auth stub
- 7.6.3 Mutation schemas and the three Server Actions — `safeParse`, `Result`, `revalidatePath`
- 7.6.4 Forms, inline field errors, and the `<SubmitButton>`
- 7.6.5 `useOptimistic` on create with implicit rollback
- 7.6.6 Wrapping the delete in a Drizzle transaction
- 7.6.7 Verify — JS-disabled flow, field errors, optimistic rollback, transactional delete

---

## Unit 8 — Email — Transactional Mail with Resend + React Email

> Set up Resend before any other unit needs it — auth verification, magic-links, password reset, invitations, and the notification dispatcher all build on the email plumbing introduced here.

### Chapter 8.1 — Sender identity and deliverability
- 8.1.1 Resend, the verified domain, and the send call
- 8.1.2 DKIM, SPF, DMARC, and the 2026 bulk-sender bar
- 8.1.3 Transactional and marketing: the subdomain split and the address discipline
- 8.1.4 Suppression discipline and the complaint-rate budget — the `email_suppressions` table and the read-before-send pattern; the webhook handler that populates it lands in Chapter 12.1
- 8.1.5 Quizz

### Chapter 8.2 — Composing email
- 8.2.1 React Email components and the JSX bridge
- 8.2.2 The preview dev server and the iteration loop
- 8.2.3 Plain-text fallback, accessibility, and dark mode
- 8.2.4 Quizz

### Chapter 8.3 — Project: transactional email send
- 8.3.1 Project brief
- 8.3.2 Starter walkthrough and the verified-domain ceremony
- 8.3.3 Env entries, the suppression helper, and the `lib/email.ts` wrapper
- 8.3.4 The `WelcomeEmail` template and the welcome Server Action
- 8.3.5 Verify — real-inbox arrival, DKIM/SPF/DMARC pass, suppression short-circuit, idempotency-key retry

---

## Unit 9 — Authentication with Better Auth

> Wire identity onto the data backplane: sessions, sign-in flows, and the request-time reads that downstream patterns lean on.

### Chapter 9.1 — Auth concepts
- 9.1.1 Authentication versus authorization
- 9.1.2 Sessions, tokens, and the cookie that carries them
- 9.1.3 OAuth 2.1 and the authorization-code flow with PKCE
- 9.1.4 Chapter quiz

### Chapter 9.2 — Better Auth setup
- 9.2.1 The `auth` instance, the catch-all handler, and the client
- 9.2.2 The Drizzle adapter and the four core tables
- 9.2.3 Session configuration and the cookie surface
- 9.2.4 Reading the session at the call site
- 9.2.5 Chapter quiz

### Chapter 9.3 — Sign-in flows
- 9.3.1 Email and password sign-up
- 9.3.2 Email and password sign-in
- 9.3.3 Email verification
- 9.3.4 Password reset
- 9.3.5 Magic link sign-in
- 9.3.6 TOTP two-factor authentication
- 9.3.7 Passkeys and WebAuthn
- 9.3.8 OAuth providers
- 9.3.9 Account linking
- 9.3.10 Chapter quiz

### Chapter 9.4 — Auth at request time and account management
- 9.4.1 The protected-routes gate in `proxy.ts`
- 9.4.2 Credential changes and the elevation tier
- 9.4.3 Session management across devices
- 9.4.4 Browser security defaults: what the stack ships, what would undo them
- 9.4.5 Chapter quiz

### Chapter 9.5 — Project: email+password auth with verification
- 9.5.1 Project brief
- 9.5.2 Starter walkthrough — env, Postgres, the Unit 8 send carry-in
- 9.5.3 Build it — Better Auth instance, catch-all handler, and the first (unverified) sign-up
- 9.5.4 Build it — verification template, send-on-signup, and the sign-in gate
- 9.5.5 Build it — `proxy.ts` two-layer gate, protected layout, and the sign-out action
- 9.5.6 Verify — sign-up → verify → sign-in → protected route → sign-out cycle

---

## Unit 10 — Multi-Tenancy, Organizations, and RBAC

> Pin every record to an organization, enforce the role check at the action boundary structurally, and write the audit trail that survives discovery.

### Chapter 10.1 — Organizations as the tenancy model
- 10.1.1 The organization data model and the active-org slot — Better Auth's organization plugin tables, `activeOrganizationId` on the session, create / switch / list flows
- 10.1.2 The tenant-aware query helper (SaaS pattern #1) — `tenantDb(orgId)` wrapping Drizzle so missing the org filter doesn't compile; the named carve-out from Principle #5
- 10.1.3 When Row-Level Security earns its weight — the threshold past application-layer scoping (highest-stakes data, many code paths, external writers); RLS as defense-in-depth, not the default
- 10.1.4 Postgres RLS through Drizzle: policies, session variables, and applying it to `audit_logs` — `pgPolicy` / `crudPolicy`, `SET LOCAL` inside a transaction, the `withTenant(orgId, fn)` helper, the bypass-by-owner trap
- 10.1.5 Chapter quiz

### Chapter 10.2 — RBAC and the audit trail at the action boundary
- 10.2.1 The three-role RBAC model — owner / admin / member as the year-1 default, the authority gradient, the single-owner invariant, `roleAtLeast` and `requireOrgUser` returning `{ user, orgId, role }`
- 10.2.2 The `authedAction(role, schema, fn)` wrapper at the Server Action boundary (SaaS pattern #2; the authz carve-out to Architectural Principle #5) — the four wrapper steps, the `ctx = { user, orgId, role, db = tenantDb(orgId) }` payload, the `Result` return contract
- 10.2.3 `authedAction` ported to the route handler boundary — `authedRoute(role, schema, fn)` so the missing-call class stays structurally hard at every untrusted-input seam; HTTP status map (401 / 403 / 422 / 404), RFC 9457 Problem Details; sharing the business function across both seams via `/lib`
- 10.2.4 Member management — listing, role change, removal, leave-org, ownership transfer; the single-owner invariant in the helper, the multi-row transaction shape, the session-after-removal behavior
- 10.2.5 The `audit_logs` table — append-only by contract, by RLS policy denying UPDATE/DELETE, and by application discipline; `logAudit(tx, event)` whose signature forces a transaction; the canonical event set; what gets audited and what doesn't (revisited under the security baseline in Unit 17)
- 10.2.6 Chapter quiz

### Chapter 10.3 — Invitations and seat management (SaaS pattern #3)
- 10.3.1 The invitation table and the seat lifecycle — Better Auth's `invitation` table plus `tokenHash` / `acceptedAt`, the `pending` → `accepted` / `canceled` state machine, the seven-day expiry as a security primitive, the partial unique index on `(orgId, lower(email))` where `status = 'pending'`
- 10.3.2 Sending an invitation — the signed accept link — `sendInvitationAction` with 32-byte Web Crypto token, SHA-256 hash at rest, HMAC-signed URL, Resend send *after* the DB transaction commits, `'invitation.sent'` audit event
- 10.3.3 Accepting an invitation across arrival shapes — the four arrival shapes (signed-in same email, signed-in different email, signed-out with account, signed-out without account), the verify order, the explicit Accept-button consent gate, auto-`emailVerified` for invite-sourced signups, active-org switch on accept
- 10.3.4 Managing pending invitations — list, resend, revoke, re-invite — the pending-invites list filtered on expiry, `resendInvitationAction` with token rotation, `revokeInvitationAction` setting `status = 'canceled'`, catching the unique-pending constraint as `'already-invited'`
- 10.3.5 Edge cases — orphan invites, email mismatch, expiry, races — the inviter-removed-before-accept senior call (honor the invite), the strict email-mismatch refusal, the double-click race against the `WHERE status='pending'` filter, the already-a-member short-circuit
- 10.3.6 Chapter quiz

### Chapter 10.4 — Project: org, RBAC, and invitations
- 10.4.1 Project brief
- 10.4.2 Starter walkthrough — Unit 9 auth, Unit 8 send, the existing schema
- 10.4.3 Build it — the organization plugin, `activeOrganizationId`, and `requireOrgUser`
- 10.4.4 Build it — `audit_logs` with RLS deny-write policies and the `withTenant` helper
- 10.4.5 Build it — `tenantDb`, `authedAction`, and the role-change action
- 10.4.6 Build it — invite send with the signed accept URL
- 10.4.7 Build it — accept-invite page and the accept action
- 10.4.8 Verify — RBAC refusal, append-only enforcement, cross-tenant probes, full invite handshake on a real inbox

---

## Unit 11 — SaaS Building Blocks I: Lists, URL State, Soft Delete

> Build the list view every SaaS screen ends up being — URL-state filters, base-query helpers that prevent missing-`deletedAt` bugs, and concurrency that catches stale writes.

### Chapter 11.1 — URL-state list views (SaaS pattern #7)
- 11.1.1 The list-view pattern — URL state and the server/client division
- 11.1.2 Filters and sort in the URL
- 11.1.3 Search — typed state, deferred URL writes
- 11.1.4 Pagination — cursor by default, offset when small
- 11.1.5 Chapter quiz

### Chapter 11.2 — Soft delete, archive, and concurrency
- 11.2.1 Soft delete, archive, and restore — `deletedAt` and `archivedAt`, the three Server Actions, partial unique and composite indexes; archive as a distinct user-facing state (SaaS pattern #9)
- 11.2.2 The base-query helper — `active()`, `archived()`, `includingDeleted()` composed on top of `tenantDb` so missing `deletedAt IS NULL` is structurally impossible
- 11.2.3 Optimistic concurrency control — the `version` column precondition, the 409 Server Action Result, the React 19 refresh-and-retry surface; `updatedAt` as the alternative; when last-write-wins is correct
- 11.2.4 Chapter quiz

### Chapter 11.3 — Project: URL-state list with soft delete and concurrency
- 11.3.1 Project brief
- 11.3.2 Starter walkthrough — Unit 7 CRUD surface with `deletedAt`, `archivedAt`, `version` in schema
- 11.3.3 Build it — lift filter, sort, search, and cursor to the URL
- 11.3.4 Build it — the scoped query helper and the lifecycle actions
- 11.3.5 Build it — the `version` precondition and the 409 surface
- 11.3.6 Verify — share-and-refresh, view tabs, partial unique index, two-tab 409, optimistic rollback

---

## Unit 12 — Webhooks and Stripe Billing

> Ingest webhooks idempotently and derive plan entitlements from Stripe — the async-and-money seam where careless code becomes expensive in production.

### Chapter 12.1 — Webhook ingestion (SaaS pattern #5)
- 12.1.1 Signature verification at the route handler boundary — raw body via `request.text()`, HMAC over `${t}.${rawBody}`, constant-time compare, timestamp tolerance, 400 with RFC 9457 on failure; closes the Web Crypto thread from 3.7.1; `stripe listen` and `stripe trigger` as the local loop
- 12.1.2 Dedup and the outer transaction — `processed_events` with composite `UNIQUE(provider, eventId)`, `INSERT ... ON CONFLICT DO NOTHING` as both check and claim, dedup INSERT and business work in one transaction so partial state never lands
- 12.1.3 Out-of-order events and the redirect-versus-webhook race — `event.created` and a `last_event_at` predicate in the UPDATE WHERE; "the webhook is the only writer," the success page reads-and-polls via `router.refresh()`
- 12.1.4 Idempotency as a unifying discipline — the unique-on-key DB constraint pattern consolidated across webhooks (`event.id`), Server Actions (form-supplied UUID), and retried jobs (stable run ID); the `Idempotency-Key` HTTP header for public route handlers
- 12.1.5 Applying the pattern: Resend bounce and complaint webhooks — Svix-flavored signature verification, `email.bounced` and `email.complained` populating `email_suppressions` (closes the loop with 8.1.4), the `bypassSuppression` carve-out for critical transactional flows
- 12.1.6 Quizz

### Chapter 12.2 — Stripe billing (SaaS pattern #4)
- 12.2.1 The Stripe object graph — Products, Prices, Customers, Subscriptions; one Customer per organization; `lookup_key` over hardcoded `price_id`; metadata as the carry-channel for `organization_id`
- 12.2.2 Stripe Checkout sessions — the Server Action that creates the session, lazy Customer creation, hosted-vs-embedded as the 2026 default, trials via `subscription_data`, the success-URL polling against the webhook
- 12.2.3 The Stripe customer portal — plan changes, cancellation at period end, payment-method update, deep-link flows; the return URL as navigation hint not state-change proof
- 12.2.4 Plan entitlements as a derived view your app reads from — one row per org, written exclusively by the webhook, never call `stripe.*` on the hot path; the projection function from event to entitlement
- 12.2.5 Subscription status as first-class application state — `trialing` / `active` / `past_due` / `canceled` / `incomplete` semantics, the `hasActiveAccess` gate, grace banners over instant lockout, `cancel_at_period_end` as the winding-down state
- 12.2.6 The thin internal billing interface (`billing.upgrade`, `billing.openPortal`, `billing.requirePlan`) — the billing carve-out to Architectural Principle #5; `requirePlan` as the load-bearing gate; `/lib/billing/` as the only place `stripe` is imported
- 12.2.7 When an SDK adapter earns its weight — only the two named carve-outs (the authz wrapper from Chapter 10.2, the billing interface above); Resend, Trigger.dev, and R2 are explicitly NOT wrapped, because their swap cost doesn't justify the tax
- 12.2.8 Quizz

### Chapter 12.3 — Project: Stripe webhook to plan entitlements
- 12.3.1 Project brief
- 12.3.2 Starter walkthrough — Stripe test mode, the CLI, `pnpm seed:stripe` for products, route handler stub
- 12.3.3 Build it — signature verification with constant-time compare
- 12.3.4 Build it — the outer transaction and `processed_events` dedup
- 12.3.5 Build it — the three event handlers and the derived `plan_entitlements` row
- 12.3.6 Build it — the `billing.*` interface and the inspector portal button
- 12.3.7 Verify — `stripe trigger` lands once, replay doesn't mutate twice, portal opens, signature tampering returns 400, ordering predicate no-ops stale events

---

## Unit 13 — Conditional Infrastructure: Background Work and Object Storage

> Run scheduled and durable jobs when the platform default isn't enough, and handle uploads when the product genuinely needs them.

### Chapter 13.1 — Background work — defaults and Trigger.dev
- 13.1.1 Inline async work and `after()` in Server Actions — the 0-tier and 0.5-tier defaults, the thresholds that break them
- 13.1.2 Vercel Cron — scheduled jobs by default; `CRON_SECRET`, at-least-once delivery, time-budget threshold
- 13.1.3 When Trigger.dev earns its weight — the five trigger conditions (past function time, multi-step orchestration with intermediate state, automatic retries with backoff, fan-out, event-driven / human-in-the-loop pauses), the 2026 alternatives, the decision tree
- 13.1.4 Trigger.dev v4 primitives — tasks, schemaTask, queues, schedules; `task` / `schemaTask` (Zod-validated payloads), `tasks.trigger` vs `tasks.triggerAndWait`, code-defined queues (the v3-to-v4 break), per-tenant dynamic queues, static and dynamic schedules
- 13.1.5 Durable execution — retries, waits, idempotency; checkpoints at step boundaries, exponential backoff with jitter, `AbortTaskRunError`, `wait.for` / `wait.until`, `idempotencyKey` and `idempotencyKeyTTL` on every trigger and wait, cross-step keys, `runs.cancel` and `ctx.run.abortSignal`
- 13.1.6 Waitpoints — external callbacks, timeouts, human-in-the-loop; `wait.forToken` with `publicAccessToken` URL completion, `wait.completeToken`, mandatory timeouts, multi-token aggregation, run metadata for live progress
- 13.1.7 Trigger.dev in our app — picking the workloads; the three Trigger.dev-bound jobs (CSV export, Stripe reconciliation, notification dispatcher) and the four that stay on platform default, deploy ordering, env surface
- 13.1.8 Quizz

### Chapter 13.2 — Project: Trigger.dev durable export job
- 13.2.1 Project brief
- 13.2.2 Starter walkthrough — Trigger.dev v4 project, the cloud link, the local dev CLI for the kill/resume verification, the empty task file, the pre-built `ExportReadyEmail.tsx` template
- 13.2.3 The `schemaTask` skeleton and the per-org dynamic queue — `schemaTask` with payload schema, dynamic per-tenant queue declaration, the `startExport` Server Action with `tasks.trigger` and the daily idempotency key
- 13.2.4 Paginated export with `triggerAndWait` and cross-step idempotency — each page as its own checkpointed child task, `${ctx.run.id}:page:N` cross-step keys for durability, `metadata.set` for live progress, `AbortTaskRunError` for the empty-resultset case
- 13.2.5 The email step and the final audit log — `sendExportEmail` child task rendering `ExportReadyEmail`, the `${ctx.run.id}:email` idempotency key guarding against parent retries, audit-log write on completion
- 13.2.6 Verify — visible run progress, mid-run local-worker kill resumes, parallel triggers per org serialize, across-org parallelism, payload validation at the boundary, email-send-once across parent retries

### Chapter 13.3 — Object storage (conditional)
- 13.3.1 When object storage earns its weight — most SaaS have no user-uploaded files; the trigger conditions (avatars, documents, generated assets) and why R2 (not S3, not UploadThing) for SaaS unit economics
- 13.3.2 Cloudflare R2 — buckets, credentials, and CORS
- 13.3.3 Presigned URLs for direct browser uploads (closes the Blob/File primitives thread from Chapter 3.7)
- 13.3.4 File metadata in Postgres alongside the object reference
- 13.3.5 R2 in our app — picking the workloads
- 13.3.6 Quizz

### Chapter 13.4 — Project: presigned R2 upload
- 13.4.1 Project brief
- 13.4.2 Starter walkthrough — provided `lib/r2.ts` + `buildObjectKey` + CORS script, TODOs in `lib/files/` and `app/files/`
- 13.4.3 The `presignedPut` Server Action — Zod-validated input, server-generated `uploadId`, signed `PutObjectCommand`, no DB write
- 13.4.4 The browser direct-to-R2 upload, the migration, and `finalizeUpload` — `file_metadata` migration, HEAD-and-insert action, XHR upload form with progress
- 13.4.5 The `Files` list with fresh presigned GETs — server-rendered list, per-render signing, the 11-minute-later refresh proof
- 13.4.6 Retrofit the 13.2 export with R2 — server-side worker PUT, real `downloadUrl` in the email, no `file_metadata` row for exports
- 13.4.7 Verify — file lands in R2, metadata matches, GET window proof, export emails working R2 link, tenancy + size + CORS proofs

---

## Unit 14 — Notifications

> A centralized dispatcher for in-app inbox + email + future channels — events fire once, preferences are checked once, and call sites stay free of channel-specific code.

### Chapter 14.1 — Notifications as a centralized layer (SaaS pattern #10)
- 14.1.1 The dispatcher seam and the notifiable-vs-logged line — the `notifiable_events` registry, the dispatcher contract, and the user-facing-vs-audit-only distinction
- 14.1.2 The two channels — email via Resend and the in-app inbox via DB rows, with the uniform channel-function signature and the independence rule
- 14.1.3 Preferences resolved once, default-on for missing rows — `user_notification_preferences` checked inside the dispatcher with the critical-channel override
- 14.1.4 Dedup and coalesce on rapid duplicates — the 60-second window keyed by `(event_type, dedup_key, recipient_user_id)`
- 14.1.5 Chapter quiz

### Chapter 14.2 — Project: notification dispatcher
- 14.2.1 Project brief
- 14.2.2 Starter walkthrough
- 14.2.3 The registry, the dispatcher, and dedup
- 14.2.4 The two channels and the prefs read
- 14.2.5 Wire three call sites
- 14.2.6 Verify

---

## Unit 15 — Cache and Rate Limiting

> Cache decisions as architecture, not afterthought — and rate limiting on the abusable endpoints from the moment the project ships to a public URL.

### Chapter 15.1 — Cache decisions as architecture (SaaS pattern #8)
- 15.1.1 Classifying routes and designing the tag scheme — the three route classes (fully dynamic, partially cached, fully static), the cacheable-in-a-SaaS shortlist, `cacheLife` profile selection as a UX question, the four tag shapes (entity, record, org-scoped, user-scoped), and the `tags.ts` helper that keeps read-side and write-side strings aligned
- 15.1.2 The four-way invalidation decision tree on real flows — `updateTag`, `revalidateTag`, `revalidatePath`, `router.refresh` resolved on two axes (read-your-writes vs. eventual, tag vs. path) and applied to worked SaaS cases (list view post-edit, post-purchase, post-membership-change, webhook-driven status, background-job rebuild); the "invalidate after commit, then redirect" sequence; revisits Chapter 5.4
- 15.1.3 Quizz

### Chapter 15.2 — Project: cacheTag-driven invalidation
- 15.2.1 Project brief
- 15.2.2 Starter walkthrough
- 15.2.3 Tag helper, cached reads, and `fetchedAt`
- 15.2.4 `updateTag` from actions and `revalidateTag` from the task
- 15.2.5 Verify

### Chapter 15.3 — Rate limiting and shared session-shaped data (Upstash)
- 15.3.1 When edge controls are enough and when Upstash earns its weight — pre-launch Vercel/Cloudflare edge controls for crude IP-shaped abuse; the public-URL-with-email+password trigger that flips application-level `@upstash/ratelimit` from optional to non-negotiable; the three further workloads (cross-process cache, shared session-shaped tokens, dispatcher pub/sub later) Upstash earns as upside; the fail-open-on-auth policy
- 15.3.2 Upstash Redis and `@upstash/ratelimit` primitives — the connectionless HTTP/REST client, module-scope limiter declaration, the three algorithms (sliding window default, token bucket, fixed window), the `limit(key)` return shape, the RFC-shape `RateLimit-*` headers, key design and the `pending` analytics flush
- 15.3.3 Wiring `@upstash/ratelimit` on the auth endpoints — three module-scope limiters (sign-in, sign-up, reset); the dual-keying rule on sign-in (per-IP **and** per-email as two independent gates); the seam inside the action (gate first, work second); the user-safe 429 body and the operator-honest structured log; the fail-open fallback; replacing Better Auth's built-in limiter with the application-level pattern
- 15.3.4 Quizz

### Chapter 15.4 — Project: Upstash rate limit on auth endpoints
- 15.4.1 Project brief
- 15.4.2 Starter walkthrough — Unit 9 auth flows, the Upstash Redis project
- 15.4.3 Redis client, three limiters, and the live readout
- 15.4.4 Wire the three actions with dual-keying, headers, and fail-open
- 15.4.5 Verify — 11th request returns 429 with headers, window resets release tokens, Upstash dashboard shows the keys

---

## Unit 16 — Conditional Client-State Tools

> The two conditional client-state libraries — reach for them only when Server Components, Server Actions, `useState`, and URL state aren't enough.

### Chapter 16.1 — TanStack Query (conditional)
- 16.1.1 When TanStack Query earns its weight — the threshold past Server Components / Server Actions: real-time UI (polling/frequent refetches), complex client-side caching across views, optimistic mutations with rollback, infinite scroll with cache reuse
- 16.1.2 Queries, mutations, optimistic updates, infinite queries — `useQuery`/`useMutation` lifecycle, query keys as the cache contract, the v5 optimistic-via-variables vs. cache-update decision, `useInfiniteQuery` with `maxPages`, `refetchInterval` for polling
- 16.1.3 Wiring TanStack Query into the App Router — `QueryClientProvider` in a Client Component, the per-request `getQueryClient()` helper via React `cache()`, `<HydrationBoundary>` for SSR-hydrated initial data, the two-system invalidation reality, the org-switch `queryClient.clear()` discipline
- 16.1.4 The trigger in our app — the per-invoice comment thread — running the four-trigger check on a concrete screen; the read/write split between `useInfiniteQuery` and the Server Action; the framing for the 16.2 project
- 16.1.5 Quizz

### Chapter 16.2 — Project: TanStack Query on optimistic comments
- 16.2.1 Project brief
- 16.2.2 Starter walkthrough — Unit 11 invoices, the comments route handler stub, seeded comments
- 16.2.3 Provider, per-request factory, and the SSR-hydrated first page
- 16.2.4 Infinite scroll, polling, and the route handler
- 16.2.5 Optimistic add and rollback with `useMutation`
- 16.2.6 Verify — cross-session arrival within the poll window, optimistic visibility, forced 500 rollback

### Chapter 16.3 — Zustand (conditional)
- 16.3.1 When Zustand earns its weight — the threshold past `useState`, lifted state + Context, URL state, and TanStack Query: genuinely shared client state across cross-route or disjoint subtrees (multi-step wizards, global UI flags, cart-style stores); per-feature, never global ambient; client-only, never in server components
- 16.3.2 Stores, slices, selectors, and the per-request provider — `createStore` vs. `create`, the `set`/`get` API, the slices pattern with `StateCreator`, selector-based subscriptions and `useShallow`, the `useRef`-pinned provider for App Router SSR, `persist`/`subscribeWithSelector`/`devtools` middlewares named once, the reset action
- 16.3.3 The trigger in our app — the customer-onboarding wizard — the four-step routed wizard, the three-trigger check, the four-slice store shape, per-step Zod gates, the Server-Action submit boundary, back/forward preserves vs. refresh loses, reset at submit-success and org-switch
- 16.3.4 Chapter quiz

### Chapter 16.4 — Project: routed multi-step wizard with Zustand
- 16.4.1 Project brief
- 16.4.2 Starter walkthrough — four route segments, per-step Zod schemas, inspector debug flags
- 16.4.3 Store, slices, provider, and the typed hook
- 16.4.4 Form wiring, atomic selectors, and the Next-gate
- 16.4.5 Review, submit action, success-reset, and the double-submit guard
- 16.4.6 Verify — back/forward preserves, refresh loses (the senior call), no double-submit, atomic re-render scoping, per-request store

---

## Unit 17 — Errors and the Security Baseline (SaaS patterns #6 and #12)

> The pre-launch audit pass — error discipline at every seam, plus the irreducible security baseline a senior wouldn't ship without. Two audits, not new ideas: by this point the error commitments have been used at server actions, webhooks, billing, and invitations, and this unit walks the seams against them; the security baseline names the headers, rate limits, audit logs, GDPR posture, consent gating, secrets, and dep hygiene in one explicit pass.

### Chapter 17.1 — Error discipline
- 17.1.1 Errors fail closed — anything that looks like authorization (`requireRole`, paywall checks, tenancy filters) refuses by default; an exception inside the check is treated as a refusal, not an allow
- 17.1.2 User-message vs. operator-message split — what reaches the user is operator-safe to read aloud (no internal IDs, no stack traces, no "DB constraint X failed"); diagnostic detail goes to Sentry and the audit log
- 17.1.3 The two commitments revisited at the seams — where each commitment lands across the six error seams: `authedAction`, `authedRoute`, page-level `requireOrgUser`, webhook receivers, the rate limiter (the documented fail-open carve-out), and the `error.tsx` / `global-error.tsx` boundaries
- 17.1.4 Chapter quiz

### Chapter 17.2 — The security baseline
- 17.2.1 Security headers in `next.config.ts` — HSTS, CSP with per-request nonce and `'strict-dynamic'`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `frame-ancestors`; static set in `next.config.ts`, dynamic CSP nonce in `proxy.ts`; the static-page trade-off; report-only rollout
- 17.2.2 Rate-limit coverage across abusable endpoints — the seven categories, the three triggers that make a limiter mandatory, key strategy per category, the coverage matrix; revisits Upstash from Chapter 15.3 through the security-baseline lens
- 17.2.3 Audit logs as discipline — the canonical six-category event set, what's forbidden, fields per entry, PII redaction in payload, append-only defense in depth, the three audiences (customer admin, platform operator, compliance); revisits 10.2.5
- 17.2.4 GDPR posture: retention timers and deletion-on-request — per-table retention catalog driven by a daily Trigger.dev job, R2 lifecycle for blobs; the async deletion job (validate, audit, enqueue, complete); the three deletion shapes (hard, soft, anonymize); third-party deletion calls; legal retention carve-out
- 17.2.5 The cookie consent gate — essential vs. non-essential, the four-state machine, the single `useConsent()` source of truth, PostHog's `opt_out_capturing_by_default` plus dynamic SDK import, the three-button banner with equal-weight Accept/Reject, the load-bearing rule that nothing fires pre-consent
- 17.2.6 Secrets management — never in code, never `NEXT_PUBLIC_*` for secrets, three environments / three sets, Vercel "sensitive" flag, rotation on event with the "Vercel-before-provider" order, the canonical leak audit; the April 2026 Vercel incident
- 17.2.7 Type-safe environment variables: baseline audit — four invariants (every access through typed `env`, server/client split, `.env.example` parity, `SKIP_ENV_VALIDATION` only in legitimate places); the one-page env audit deliverable; revisits 1.4.5
- 17.2.8 Dep hygiene and supply-chain defaults — pnpm 11+ `minimumReleaseAge: 1440` and `blockExoticSubdeps`, post-install allow-list, `pnpm audit --prod`, lockfile committed and CI `--frozen-lockfile`, Renovate / Dependabot, the "is this maintained" three-question check
- 17.2.9 Chapter quiz

### Chapter 17.3 — Project: error and security baseline audit
- 17.3.1 Project brief — the eight audit categories and the rule-location-consequence-fix template
- 17.3.2 Audit target walkthrough and one modeled finding end-to-end
- 17.3.3 Audit pass — error discipline (fail-closed, user/operator message split, `dangerouslySetInnerHTML`)
- 17.3.4 Audit pass — security baseline (headers, rate limits, audit-log gaps, secrets, GDPR posture, dep hygiene)
- 17.3.5 Verify — self-grade against the published answer key

---

## Unit 18 — Time and Internationalization

> Store time canonically, render it locally, and treat translation as a discipline before it's a feature.

### Chapter 18.1 — Time, dates, and timezones (SaaS pattern #13)
- 18.1.1 UTC in Postgres `timestamptz`; Temporal at the domain edge — the three-layer storage / domain / edge split; the `Temporal.Instant` codec in `lib/temporal.ts`; ISO 8601 strings as the universal wire format; `Date` only at the third-party seam
- 18.1.2 Date-only values: the `date` type, not midnight `timestamptz` — calendar-day semantics belong in Postgres `date` and `Temporal.PlainDate`; the second codec; the canonical midnight-UTC anti-pattern and its three failure modes
- 18.1.3 The user's timezone in their profile, not derived per-request — `users.timeZone` as an IANA identifier; seeded from the browser at sign-up, validated via `Intl.supportedValuesOf('timeZone')`, read from the session, passed explicitly to every formatter; the `Intl.DateTimeFormat()` no-argument bug on Vercel
- 18.1.4 DST transitions and recurring jobs — named IANA tz for user-facing wall-clock jobs (Trigger.dev `schedules.task` with `{ cron: { pattern, timezone } }`), UTC for internal cadence jobs; the spring-forward gap and fall-back repeat; recompute the fire instant at fire time
- 18.1.5 Date arithmetic with Temporal — the type catalog (`Instant` / `ZonedDateTime` / `PlainDate` / `Duration`), `add` / `subtract` / `since` / `until` / `with` / `round`, month-end clamping with `overflow: 'reject'` as opt-out, the six anti-patterns the senior never writes; native and unflagged from Node 26 (May 2026), `temporal-polyfill` (FullCalendar, ~20KB) or `@js-temporal/polyfill` on the Node 24 LTS line
- 18.1.6 Chapter quiz

### Chapter 18.2 — Internationalization (SaaS pattern #14)
- 18.2.1 Translation keys, interpolation, never concatenation — the three-artifact discipline (keys in code, ICU-shaped entries in per-locale catalogs, named placeholders), one-string-one-key, `t.rich` for embedded markup, the JSON-catalog lifecycle
- 18.2.2 ICU MessageFormat: plurals, select, gendered forms — `plural` with CLDR categories and `=0`/`=1` overrides, `selectordinal` for ordinals, `select` for free enums, nested plural-inside-select for gendered counts, `Intl.PluralRules` as the underlying engine, MF2 named as the path forward
- 18.2.3 `Intl.NumberFormat`, `DateTimeFormat`, `RelativeTimeFormat`, `Collator` — the daily-reach formatters with `ListFormat` / `DisplayNames` named once; Temporal interop on `DateTimeFormat`; the "construct once, reuse" rule; mandatory `locale` and `timeZone` arguments
- 18.2.4 Locale negotiation: profile preference plus `Accept-Language` — the five-input resolution chain (URL prefix → profile → cookie → `Accept-Language` best-match → default); BCP 47 `Lookup` via `@formatjs/intl-localematcher`; `users.locale` paired with `users.timeZone`; never geo-IP as a primary signal
- 18.2.5 next-intl: wiring the discipline in Next.js 16 — `defineRouting` / `createMiddleware` / `getRequestConfig` / `setRequestLocale` / `generateStaticParams` / `useTranslations` / `useFormatter` / typed navigation; the `IntlMessages` global type for compile-time key safety; static-vs-dynamic rendering boundary
- 18.2.6 i18n SEO: `hreflang`, per-locale sitemaps, canonical URLs — `alternates.languages` in `generateMetadata`, the self-referencing and bidirectional rules, `x-default`, locale-specific canonicals, `MetadataRoute.Sitemap` with alternates, OG `og:locale` and locale-aware OG images
- 18.2.7 Chapter quiz

### Chapter 18.3 — Project: localized, tz-aware list view
- 18.3.1 Project brief
- 18.3.2 Starter walkthrough — Unit 11 list, profile `locale` + `timeZone` columns, `next-intl` installed
- 18.3.3 Build it — `next-intl` wiring, locale negotiation, and the three message catalogs
- 18.3.4 Build it — date rendering with Temporal in profile tz and currency via `Intl.NumberFormat`
- 18.3.5 Build it — `alternates.languages` metadata and per-locale sitemap entries
- 18.3.6 Verify — locale switch reflow, DST-spanning render, `hreflang` tags in source

---

## Unit 19 — Testing

> Test behavior, not implementation; concentrate on the seams where bugs actually cost money.

### Chapter 19.1 — The shape of a test suite
- 19.1.1 Vitest setup and the runner model
- 19.1.2 The honeycomb shape for a Next.js SaaS
- 19.1.3 Coverage as a diagnostic, not a target
- 19.1.4 One behavior per test; behavior over implementation
- 19.1.5 Quizz

### Chapter 19.2 — Unit tests for `/lib`
- 19.2.1 Unit tests for pure logic in `/lib`
- 19.2.2 Test fixtures and factories
- 19.2.3 Determinism: time, randomness, and IDs
- 19.2.4 Type-level testing with `expectTypeOf`
- 19.2.5 Testing async code
- 19.2.6 Testing the unhappy path
- 19.2.7 Chapter quiz

### Chapter 19.3 — Integration tests at the seams
- 19.3.1 Integration tests against a real test Postgres with transaction-rollback per test
- 19.3.2 Test database lifecycle — `drizzle-kit migrate` against the test DB, per-worker isolation in Vitest, Neon branch-per-CI-run as the conditional move
- 19.3.3 Shared auth fixtures for "signed-in user with role X in org Y"
- 19.3.4 Mocking the network at the boundary, not the function
- 19.3.5 MSW (Mock Service Worker) as the network-boundary mock — handlers per test, the request-level seam
- 19.3.6 Webhook handler testing — fixture payloads, signature verification in test mode, idempotency replay assertions against `processed_events`
- 19.3.7 Testing a Server Action end-to-end — stub session/`cookies()`, run Zod parse, exercise the `authedAction` wrapper, assert the Postgres mutation, assert the typed return
- 19.3.8 Test isolation and ordering — no shared state, no run-order dependency, the cost of flake
- 19.3.9 Quizz

### Chapter 19.4 — Component tests (conditional)
- 19.4.1 When React Testing Library earns its weight — bulk-testing presentational components has poor cost-benefit; reach for it on shared component libraries, complex stateful components, and critical UX paths
- 19.4.2 React Testing Library — setup and the basics
- 19.4.3 RTL query philosophy — by role, by label, by text; `getByTestId` as last resort; what "behavior" means at the component level
- 19.4.4 RTL in our app — the components where the trigger is met
- 19.4.5 Quizz

### Chapter 19.5 — E2E (conditional)
- 19.5.1 When Playwright earns its weight — not a coverage tool; reach for it only on the 20–30 paths where failure costs real money (auth, checkout, Stripe-touching flows); many SaaS skip E2E entirely in their first year
- 19.5.2 Playwright primitives — running it on auth, checkout, money paths
- 19.5.3 Playwright in our app — the money paths that pay back the runtime cost
- 19.5.4 Quizz

### Chapter 19.6 — Project: integration + E2E tests for the Stripe checkout flow
- 19.6.1 Project brief
- 19.6.2 Starter walkthrough — Vitest config, MSW handlers, auth fixture factory, test-DB lifecycle
- 19.6.3 Build it — happy-path integration test against real test Postgres with transaction rollback
- 19.6.4 Build it — duplicate-event idempotency test and signature-tampered rejection test
- 19.6.5 Build it — Playwright money-path test (sign-in → Stripe Checkout test card → plan updated)
- 19.6.6 Verify — suite green twice in a row; deliberate handler mutations fail the expected tests only

---

## Unit 20 — Observability and Performance

> What broke, when, and why — and the perf vigilance that keeps the production app fast under iteration.

### Chapter 20.1 — Error monitoring and structured logs
- 20.1.1 Sentry — error capture, source maps, release tagging, breadcrumbs
- 20.1.2 Structured logs with request correlation IDs — the discipline, not a specific library
- 20.1.3 The "log inputs you'd want at 3am" rule and the PII/secrets exclusion
- 20.1.4 Vercel Log Drains — shipping logs to a searchable destination; reading production logs in anger
- 20.1.5 Debugging server-side Next.js — `node --inspect`, attaching from VS Code, the server-action-failed-and-I-can't-tell-why workflow; how structured logs and Sentry breadcrumbs interleave with a live debugger
- 20.1.6 Quizz

### Chapter 20.2 — Product analytics
- 20.2.1 Vercel Analytics — what it covers without configuration (the default)
- 20.2.2 When PostHog earns its weight — the threshold past Vercel Analytics: event-level product analytics, feature flags for gradual rollouts, session replay for UX debugging, experiments; folding 4–5 separate tools into one platform as the minimum-stack philosophy in action
- 20.2.3 PostHog primitives — events, feature flags, session replay, experiments
- 20.2.4 PostHog in our app — wiring it gated by the cookie consent gate from Unit 17
- 20.2.5 Quizz

### Chapter 20.3 — Performance vigilance (SaaS pattern #15)
- 20.3.1 The Core Web Vitals — LCP, INP, CLS, what each measures, how to move each
- 20.3.2 `next/image` `priority` for above-the-fold (revisit) and never raw `<img>`
- 20.3.3 Per-icon imports vs. barrel imports — the bundle-size cost of shipping the whole icon set
- 20.3.4 `@next/bundle-analyzer` — running it and reading what it shows
- 20.3.5 Lighthouse passes on the marketing page and one critical authenticated screen pre-launch
- 20.3.6 RSC waterfalls — sequential parent-then-child awaits compounding latency; the `Promise.all` rewrite (the RSC-side cousin of N+1)
- 20.3.7 Database query performance — index hits, N+1 (revisit; the Drizzle thread cashes in)
- 20.3.8 Quizz

### Chapter 20.4 — Project: observability and performance audit
- 20.4.1 Project brief — Sentry + PostHog wiring plus the seeded performance findings
- 20.4.2 Audit target walkthrough — the seeded codebase, one modeled finding
- 20.4.3 Wire it — Sentry with source maps, release tagging, and breadcrumbs
- 20.4.4 Wire it — PostHog events gated by the cookie consent gate
- 20.4.5 Audit it — performance pass (RSC waterfall, barrel import, missing `priority`, N+1, bundle analyzer)
- 20.4.6 Verify — Sentry captures a deliberate throw, PostHog records post-consent, bundle before/after attached, findings match the seeded list

---

## Unit 21 — Git, CI, Deployment, and Schema Migrations

> The shipping discipline: the version-control habits that make change reversible, the CI baseline that makes regressions structural, and the migration cadence that keeps live deploys safe.

### Chapter 21.1 — Git and version control
- 21.1.1 Git fundamentals — branches, commits, the staging area, rebase vs. merge as a team-style choice
- 21.1.2 Git for recovery and history shaping — cherry-pick, bisect, reflog, interactive rebase
- 21.1.3 Pull requests as the unit of change — small, reviewable, reversible
- 21.1.4 Branch protection rules that prevent direct pushes to main
- 21.1.5 Quizz

### Chapter 21.2 — CI on GitHub Actions
- 21.2.1 GitHub Actions — workflows, jobs, steps, secrets, cached deps
- 21.2.2 The CI baseline — type-check, lint, test, build
- 21.2.3 Supplementary CI checks — `pnpm audit` for dep hygiene, `markdown-link-check` on docs
- 21.2.4 Quizz

### Chapter 21.3 — Vercel deployment and going live
- 21.3.1 The Vercel deployment model — what gets pushed where on each git push
- 21.3.2 First deploy — connecting the GitHub repo, the first preview URL, the first production URL
- 21.3.3 Vercel platform specifics — regions, fluid compute, function size, runtime selection (Vercel Functions on the Node.js runtime as the default; the Edge Runtime as a niche optimization)
- 21.3.4 Custom domains and SSL
- 21.3.5 Preview deployments per PR (Vercel + Neon branching wired together)
- 21.3.6 Branch-per-preview on Neon to validate every migration against a real-shaped DB
- 21.3.7 Environment management — dev / preview / prod, secret scoping
- 21.3.8 Production rollbacks — promoting a previous deployment when something on `main` breaks production
- 21.3.9 The launch checklist — env validation green, error monitoring wired, rate limits live, audit logs writing, security headers set
- 21.3.10 Quizz

### Chapter 21.4 — Schema migrations against a live app (SaaS pattern #11)
- 21.4.1 The expand → migrate → contract cadence
- 21.4.2 Which migrations actually need it (renames, type changes, NOT NULL on existing, drops still referenced mid-deploy)
- 21.4.3 Testing a migration against the Neon preview branch before merge — what to run, what to look at; the failure modes the three-step cadence is designed to catch
- 21.4.4 Quizz

### Chapter 21.5 — Project: deploy and a live expand-migrate-contract migration
- 21.5.1 Project brief — the migration class that demands the cadence; the rollback expectation
- 21.5.2 First deploy — connecting the repo to Vercel, the first production URL, environment scoping
- 21.5.3 PR 1 (Expand) — add the FK column nullable, ship to preview, verify production keeps working
- 21.5.4 PR 2 (Migrate) — backfill and dual-write, ship to preview, verify production keeps working
- 21.5.5 PR 3 (Contract) — drop the old text column, make the FK non-null, ship
- 21.5.6 Rollback rehearsal — promote the previous deployment, document the steps

---

## Unit 22 — Documentation and Code Review

> Documentation is part of shipping — make it durable, keep it next to the truth, and review code through the principles and patterns the course taught.

### Chapter 22.1 — Documentation that lives next to code
- 22.1.1 Diataxis as the documentation vocabulary — tutorial / how-to / reference / explanation, and which artifact in a SaaS repo owns each
- 22.1.2 README discipline and docs that live next to the truth — first-contact-only README; the schema file, env.ts, and Server Actions as their own reference docs
- 22.1.3 AGENTS.md as the conventions surface — what earns a place, the canonical sections, and the boundary against README and ADRs (introduced at first project setup in Chapter 1.4; full treatment here)
- 22.1.4 ADRs and the decisions worth recording — Michael Nygard template (Context / Decision / Consequences); one decision per file; write the ADR as the decision is being made; worked examples on the course's opinionated picks (Drizzle, Better Auth, Biome, R2, Node runtime, native forms)
- 22.1.5 Quizz

### Chapter 22.2 — Comments, TSDoc, and team discipline
- 22.2.1 TSDoc on public surfaces, not on internals
- 22.2.2 Comments answer why, not what
- 22.2.3 Docs ship with the PR — or they're already wrong
- 22.2.4 Quizz

### Chapter 22.3 — Code review
- 22.3.1 What a senior reviewer looks for — mapping reviews to the architectural principles (#1–#7) and SaaS patterns (#1–#15)
- 22.3.2 How to leave a good review comment — suggesting vs. blocking, the language of disagreement
- 22.3.3 Quizz

### Chapter 22.4 — Project: PR review and one ADR
- 22.4.1 Project brief — the seeded PR diff, the principles/patterns cheatsheet, the Nygard template
- 22.4.2 Audit target walkthrough — read the diff once, model one review comment end-to-end
- 22.4.3 Review it — five line-level comments on the seeded issues; distinguish suggesting from blocking
- 22.4.4 Write it — the ADR for the one decision in the diff, all three Nygard sections, named after the decision
- 22.4.5 Verify — comments map to seeded issues; ADR has a real `Decision` line, not a hedged one

---

## Unit 23 — AI Integration with the Vercel AI SDK (conditional)

> When the product genuinely calls for an LLM-backed surface — the SDK that makes the integration durable across providers.

### Chapter 23.1 — When AI features earn their weight
- 23.1.1 When the Vercel AI SDK earns its weight — most 2026 SaaS still ship without LLM features; the trigger is any LLM-backed product surface (chat, generation, classification, agentic flows); the AI SDK as the de-facto Next.js LLM integration
- 23.1.2 Cost and rate-limit thinking when LLM calls are user-facing — token accounting, per-user quotas, abuse mitigation
- 23.1.3 Provider abstraction and the AI SDK's role in keeping vendor-swap cheap
- 23.1.4 Quizz

### Chapter 23.2 — Generating text and structured output
- 23.2.1 AI SDK Core — `streamText` and `generateText`; the message shape and conversation primitives
- 23.2.2 Structured output — `generateObject` and `streamObject` with Zod schemas
- 23.2.3 AI SDK UI hooks — `useChat`, `useCompletion` under v5's transport-based architecture; the `UIMessage` `parts` array as the message-state-of-truth (replaces v4's flat `.content`); `sendMessage` / `regenerate` (renamed from v4's `append` / `reload`); manually managed input state (no longer auto-managed by the hook); streaming response patterns and progressive rendering (text deltas, partial objects)
- 23.2.4 Quizz

### Chapter 23.3 — Tools, agents, and generative UI
- 23.3.1 Tool calling — defining tools with Zod, the execution loop, multi-step under v5's `stopWhen` parameter with built-in stop conditions (`stepCountIs(n)`, `hasToolCall(name)`, `isLoopFinished()`) — replaces v4's client-side `maxSteps`; the agentic loop, tool-result handling
- 23.3.2 Generative UI with `ai/rsc` — `streamUI`, server-rendered tool components, `useUIState` / `useAIState`
- 23.3.3 Embeddings and vector search (light) — when retrieval-augmented features earn their weight
- 23.3.4 AI SDK in our app — wiring an LLM-backed surface where the trigger is met
- 23.3.5 Quizz

### Chapter 23.4 — Project: LLM-backed invoice Q&A with tool calling
- 23.4.1 Project brief
- 23.4.2 Starter walkthrough — Unit 10/11 surface, AI SDK installed, provider key
- 23.4.3 Build it — the route handler with `streamText` and the agentic loop via `stopWhen(stepCountIs(5))`
- 23.4.4 Build it — the `getInvoiceStats` tool with Zod and org-scoped authz inside the tool, plus the daily-quota check
- 23.4.5 Build it — wire `useChat` to render the `UIMessage` `parts` array and the token-usage panel
- 23.4.6 Verify — grounded answers cite real Drizzle numbers; forged `orgId` refused; 11th question hits the quota
