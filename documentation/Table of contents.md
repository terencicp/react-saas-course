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
- 2.8.1 Error handling — `try`/`catch`/`finally`, throwing, subclassing `Error`, `Error.cause`
- 2.8.2 `unknown` in catch bindings (TS strict default) — narrowing with `instanceof Error` or a Zod schema; why the language can't promise an `Error`
- 2.8.3 Quizz

### Chapter 2.9 — Practical odds and ends
- 2.9.1 JSON — parsing, stringifying, the serialization gotchas (`Date`, `undefined`, `BigInt`)
- 2.9.2 Classes (light) — where they show up: custom `Error` subclasses, the rare adapter wrapping a class-based SDK; why everything else stays as functions
- 2.9.3 `Date`'s known problems and the senior pivot to `Temporal` for arithmetic — Stage 4 / ES2026 (March 2026), unflagged in Node 26 (May 2026); polyfilled (`temporal-polyfill` or `@js-temporal/polyfill`) on the Node 24 LTS line still in production use; full treatment in Chapter 18.1
- 2.9.4 Quizz

---

## Unit 3 — HTTP, the Browser Platform, and the APIs Under React

> Cover the request lifecycle, the DOM substrate, and the browser APIs every later pattern reaches for — at the depth a SaaS engineer needs, no deeper.

### Chapter 3.1 — How a request becomes a page
- 3.1.1 The browser request lifecycle — URL bar to pixels, the frame SSR and hydration will land into
- 3.1.2 HTTPS and certificates at the depth that bites in development
- 3.1.3 Quizz

### Chapter 3.2 — HTTP at the depth a SaaS engineer needs
- 3.2.1 HTTP method semantics and idempotency (GET, POST, PUT, PATCH, DELETE) — the senior anchor for designing safe-to-retry endpoints
- 3.2.2 HTTP status codes — the 2xx/3xx/4xx/5xx subset that bites in SaaS, plus 409, 422, 429
- 3.2.3 HTTP headers — content negotiation, caching, auth, custom headers
- 3.2.4 Quizz

### Chapter 3.3 — URLs, origins, and security boundaries
- 3.3.1 The URL spec — origin, pathname, search, hash, percent-encoding; `URLSearchParams`
- 3.3.2 Same-origin policy
- 3.3.3 CORS — preflights, credentials, common failure modes
- 3.3.4 Quizz

### Chapter 3.4 — Cookies and the trust model (light)
- 3.4.1 Cookies — `Secure`, `HttpOnly`, `SameSite`, expiration, scope (the conceptual frame; auth wires later)
- 3.4.2 Quizz

### Chapter 3.5 — The DOM and event substrate
- 3.5.1 The DOM as a tree of nodes — the substrate every later UI lands on
- 3.5.2 Element attributes vs. properties — what HTML serializes vs. what JavaScript reads from a live element (`class` vs. `className`, `for` vs. `htmlFor`, value-as-property)
- 3.5.3 The DOM event model — bubble vs. capture, delegation, passive listeners
- 3.5.4 Quizz

### Chapter 3.6 — Fetch and live data
- 3.6.1 The Fetch API — Request, Response, Headers, FormData, ReadableStream
- 3.6.2 Streaming responses, SSE, chunked transfer
- 3.6.3 Quizz

### Chapter 3.7 — Browser platform APIs the SaaS UI reaches for
- 3.7.1 Web Crypto random primitives — `randomUUID`, `getRandomValues`
- 3.7.2 Web Crypto HMAC — `subtle` for sign/verify, with constant-time comparison as the timing-attack mitigation (load-bearing for invitations, magic-link, webhook signatures)
- 3.7.3 Clipboard API — `navigator.clipboard.writeText`/`readText`, secure-context constraints (load-bearing for copy-invite-link, copy-API-key, copy-webhook-secret)
- 3.7.4 Blob, File, `URL.createObjectURL` — the file-upload primitives (closed in Chapter 13.3 with R2)
- 3.7.5 localStorage / sessionStorage (light — theme preference, transient state)
- 3.7.6 Quizz

---

## Unit 4 — React, JSX, and Tailwind as the UI Layer

> Teach the React render model, hooks, and Tailwind as one cohesive UI layer — components and the cascade learn together because they ship together.

### Chapter 4.1 — JSX and HTML semantics through JSX
- 4.1.1 JSX as HTML — `className`, event props, fragments, conditional rendering, lists with keys; void elements and self-closing in JSX
- 4.1.2 HTML at the Next.js root layout — document structure (`html`, `head`, `body`, `meta`)
- 4.1.3 HTML semantic elements (`header`, `nav`, `main`, `article`, `section`, `aside`, `footer`) and heading hierarchy — why screen readers care
- 4.1.4 Buttons vs. links; `<button type="submit">` defaults; `<a target/rel>`; lists
- 4.1.5 HTML forms surface — `<form>`, `<input>` types, `<label htmlFor>`, `<fieldset>`, `<legend>`, `<button type>`
- 4.1.6 HTML data attributes and `aria-*`
- 4.1.7 HTML `<table>` — when actually right
- 4.1.8 Quizz

### Chapter 4.2 — Tailwind as the CSS surface, where it touches React
- 4.2.1 Tailwind utility-first thinking; modifiers; variants; arbitrary values
- 4.2.2 Tailwind v4 specifics — CSS-first config via `@theme`, custom utilities via `@utility`, container queries via `@container`
- 4.2.3 Tailwind class composition — `clsx` + `tailwind-merge` packaged as the `cn()` helper; how composition resolves conflicts; the failure shape of naive concatenation across CVA variants
- 4.2.4 Tailwind state and structural variants — `group-*`, `peer-*`, `data-[state=...]:`, `aria-*:`, `has-*`, `not-*`, `*:`
- 4.2.5 Wiring dark mode through Tailwind's `dark:` variant
- 4.2.6 `next-themes` — React-side dark mode wiring, system mode, FOUC-free hydration, theme persistence
- 4.2.7 Quizz

### Chapter 4.3 — The cascade, inheritance, and design tokens
- 4.3.1 The cascade and specificity — named explicitly with `@layer` and `!important`
- 4.3.2 CSS inheritance and what does/doesn't inherit
- 4.3.3 Tailwind Preflight — the implicit base reset; what it strips; naming the magic, when to lean in vs. override
- 4.3.4 CSS custom properties; how Tailwind theme tokens compile to them; design tokens as semantic names
- 4.3.5 Quizz

### Chapter 4.4 — Layout and sizing
- 4.4.1 CSS box model and `box-sizing` (at Tailwind spacing utilities)
- 4.4.2 CSS display modes — block, inline, inline-block, flex, grid
- 4.4.3 CSS flexbox model — main axis, cross axis, justify and align (at Tailwind utilities)
- 4.4.4 CSS grid — the model, named lines, `grid-template-areas` (at Tailwind utilities)
- 4.4.5 Sizing — `width`/`height`, `min-*`/`max-*`, `size-*`, `aspect-ratio`; intrinsic vs. extrinsic sizing
- 4.4.6 Spacing inside containers — `gap` as the senior default; `space-x`/`space-y`; `divide-x`/`divide-y`; gap-vs-margin as a decision
- 4.4.7 CSS position — static, relative, absolute, sticky, fixed
- 4.4.8 CSS overflow and scroll containers — `overflow` modes, `overscroll-behavior`, the iOS scroll-chain bug, scroll containment for sticky headers and dialogs
- 4.4.9 CSS stacking context, z-index
- 4.4.10 CSS logical properties — `margin-inline`, `padding-block`
- 4.4.11 Quizz

### Chapter 4.5 — Typography, color, motion, responsive
- 4.5.1 CSS typography — font, line-height, letter-spacing
- 4.5.2 CSS color, opacity, the modern color spaces
- 4.5.3 CSS borders, border-radius, box-shadow
- 4.5.4 CSS pseudo-classes (`:hover`, `:focus`, `:focus-visible`, `:has`)
- 4.5.5 Tailwind animation system — `animate-*`, custom `@keyframes` via `@theme`, `tw-animate-css` as the dependency shadcn dialog/sheet/accordion expect
- 4.5.6 CSS media queries and the responsive design model (at Tailwind responsive variants)
- 4.5.7 CSS container queries (at Tailwind `@container`)
- 4.5.8 Quizz

### Chapter 4.6 — Components and composition
- 4.6.1 Components and composition — props, children, slots
- 4.6.2 Composition patterns — children-as-API, slot props
- 4.6.3 Polymorphic components — Radix `Slot` keeping types intact through `asChild`; `class-variance-authority` + `VariantProps` so variants live in one place
- 4.6.4 Refs in React 19 — the prop-passing model (no more `forwardRef`)
- 4.6.5 Portals — modals, toasts, anchored popovers
- 4.6.6 Quizz

### Chapter 4.7 — The render model
- 4.7.1 The render model — what triggers re-render, reference identity in props
- 4.7.2 Reconciliation — keys, diffing, when components remount
- 4.7.3 Keeping components pure — render is a pure function of props and state; side effects belong in handlers/effects; the rule the React Compiler relies on
- 4.7.4 State as a snapshot — render is a snapshot of state; the updater form `setX(prev => ...)` under React 19 automatic batching
- 4.7.5 Resetting state with `key` — component identity as a state-reset; the canonical "form fields stuck on the previous record" fix
- 4.7.6 JSX synthetic events — capture vs. bubble (callback to the DOM events introduced in Chapter 3.5)
- 4.7.7 Quizz

### Chapter 4.8 — Hooks: state and refs
- 4.8.1 `useState` — basics
- 4.8.2 Lazy initial state — `useState(() => expensiveCompute())`
- 4.8.3 Derived state — compute during render rather than mirroring; the "syncing with an effect" anti-pattern
- 4.8.4 Lifting state up — when state belongs higher; weighed against colocating at the leaf and pushing into the URL
- 4.8.5 `useReducer` — when state has multiple transitions
- 4.8.6 `useRef` — DOM access and instance values
- 4.8.7 `useId` — stable IDs across SSR/hydration
- 4.8.8 Quizz

### Chapter 4.9 — Hooks: effects and external systems
- 4.9.1 Strict Mode — the dev-mode contract; double-invocation as the impurity-surfacing mechanism that makes effect rules bite
- 4.9.2 `useEffect` — the rules and the much narrower role in 2026
- 4.9.3 You might not need an effect — derived values, event-handler logic, parent-driven resets
- 4.9.4 `useContext` and the perf footgun
- 4.9.5 `useTransition` and `useDeferredValue` — marking updates as low-priority
- 4.9.6 `use()` — unwrapping promises and contexts
- 4.9.7 The rules of hooks — named explicitly per "explicit over magic"; the lint rule
- 4.9.8 Quizz

### Chapter 4.10 — Custom hooks and what to stop hand-tuning
- 4.10.1 Custom hooks — extracting reusable behavior, the `use*` naming convention, when a custom hook earns its weight
- 4.10.2 The React Compiler — what it auto-memoizes and how to enable it (`reactCompiler: true` in `next.config.ts`, `babel-plugin-react-compiler` installed); stable in Next 16 but not default-on, named explicitly per "explicit over magic"
- 4.10.3 When manual memoization still earns its weight — the narrow cases for `memo` / `useMemo` / `useCallback`; what to stop hand-tuning, including `useMemo` everywhere and premature `dynamic()`
- 4.10.4 Quizz

### Chapter 4.11 — shadcn/ui and the accessibility baseline
- 4.11.1 shadcn/ui — copy-paste model, slot composition, theming, when to fork; the registry and namespace model
- 4.11.2 Accessibility baseline — keyboard navigation, prefers-reduced-motion, color contrast (WCAG AA) as discipline-level commitments; per-element specifics (`<button type>` defaults, `<label htmlFor>`, `:focus-visible`) are taught at their call sites in earlier chapters
- 4.11.3 ARIA basics — roles, labels, live regions, the "first rule of ARIA"
- 4.11.4 Focus management and tab order — modals, route changes, post-submission
- 4.11.5 Empty/loading/error state UI patterns at the component level — the trio every list view, card, and widget needs
- 4.11.6 Quizz

### Chapter 4.12 — Project: themed product surface
- 4.12.1 Project brief
- 4.12.2 Starter walkthrough — what the scaffold ships, what's stubbed
- 4.12.3 Build it — header, hero, and the feature grid with CVA variants
- 4.12.4 Build it — pricing table, footer, and the theme toggle without FOUC
- 4.12.5 Build it — mobile nav drawer with the `useLockBodyScroll` custom hook and focus trap
- 4.12.6 Verify — Lighthouse a11y, keyboard-only nav, no-FOUC reload, responsive reflow at 360/768/1280, drawer scroll lock + focus trap + `Esc` close

---

## Unit 5 — Next.js and the App Router

> Wire React into the App Router, name the server/client boundary, and learn the rendering and caching model that every later SaaS pattern relies on.

### Chapter 5.1 — The first project — file structure and routing
- 5.1.1 Scaffolding the first Next.js 16 project — `pnpm create next-app`, the generated tree, what each top-level file does
- 5.1.2 Architectural Principle #1 introduced — co-locate by feature, not by layer; the `app/` directory as the canonical shape
- 5.1.3 File-system routing — `app/`, `page.tsx`
- 5.1.4 Layouts and nested layouts; the layout/page render boundary
- 5.1.5 Dynamic route segments; catch-all and optional catch-all
- 5.1.6 Route groups
- 5.1.7 Parallel routes — named slots (`@slot`) rendered alongside `children` in a layout, each route segment owning its own loading and error boundary; the canonical use case is a list-plus-detail surface where both live under the same URL; `default.tsx` for the unmatched-slot fallback that prevents a 404 on direct navigation; how parallel slots stream independently when paired with Suspense (revisited in 5.3.2)
- 5.1.8 Intercepting routes — `(.)`, `(..)`, `(..)(..)`, `(...)` markers; soft-navigation interception for the "modal or side-panel that has a real URL" pattern; the always-paired non-intercepting `page.tsx` that shadows the intercepted route on direct visits, refresh, and `Cmd+click`; the senior anchor for why a state-driven modal loses URL persistence, refreshability, and shareability
- 5.1.9 `<Link>` and the navigation model
- 5.1.10 `redirect`, `notFound`, `permanentRedirect`
- 5.1.11 Quizz

### Chapter 5.2 — The server / client boundary
- 5.2.1 Server Components — fundamentals, async components, server-side data fetching
- 5.2.2 Client Components — fundamentals, the boundary contract
- 5.2.3 `"use client"` and `"use server"` — what each means, what each constrains
- 5.2.4 Architectural Principle #6 introduced — prefer explicit over magic; named at the `"use client"` / `"use server"` boundary as the canonical "name the magic" example
- 5.2.5 `server-only` / `client-only` packages — structural enforcement of the boundary
- 5.2.6 Server Component → Client Component prop serialization — what crosses the RSC wire, common failure shapes (Map, Set, class instances, functions)
- 5.2.7 Structured clone — what it can/can't carry across boundaries
- 5.2.8 Hydration — what it is, hydration mismatches, common causes (`Date.now`, random IDs, locale)
- 5.2.9 Quizz

### Chapter 5.3 — Async UI primitives
- 5.3.1 Suspense as a declarative loading contract
- 5.3.2 Streaming and Suspense at the route boundary
- 5.3.3 `loading.tsx`, `error.tsx`, `not-found.tsx` — the platform's async-UI primitives; `error.tsx` wraps React's underlying class-based Error Boundary mechanism, named once where it bites (the file-convention is the form learners will write)
- 5.3.4 `global-error.tsx` — the root-layout error boundary that catches what `error.tsx` can't
- 5.3.5 Quizz

### Chapter 5.4 — Rendering and caching in Next.js 16
- 5.4.1 Static vs. dynamic rendering — under Cache Components (`cacheComponents: true`), every route is dynamic by default in Next.js 16; per-component opt-in via `use cache`
- 5.4.2 Partial Prerendering — static shell with streamed dynamic holes; the canonical 2026 rendering shape
- 5.4.3 Cache Components — `cacheComponents: true` and the `use cache` directive at function and component level
- 5.4.4 `cacheLife` and `cacheTag` — keying a cached value's freshness window and the tags that name it for invalidation
- 5.4.5 React `cache()` for per-request memoization in server work; `use cache` for cross-request caching
- 5.4.6 `updateTag`, `revalidateTag`, `revalidatePath`, `router.refresh` — the post-mutation decision tree; `updateTag` (Server-Action-only, immediate expiry) when the user expects to see their change right after a redirect or navigation; `revalidateTag` (stale-while-revalidate, also usable in route handlers) for webhooks, scheduled jobs, and admin mutations where a brief stale read is fine
- 5.4.7 Route segment config — `dynamic`, `revalidate`, `runtime` under Cache Components
- 5.4.8 Async Request APIs in Next.js 16 — `params`, `searchParams`, `cookies()`, `headers()`, `draftMode()` return Promises; `await` them in Server Components, unwrap with `React.use()` in Client Components; `connection()` as the explicit dynamic opt-in
- 5.4.9 Quizz

### Chapter 5.5 — Server-side reads, middleware, and URL state
- 5.5.1 `cookies()`, `headers()` — server-side reads; the dynamic-rendering implication
- 5.5.2 `proxy.ts` orientation and matcher config — the Node-runtime-only file convention that replaces `middleware.ts` in Next.js 16; `middleware.ts` named once as the deprecated Edge-runtime predecessor
- 5.5.3 Rewrites and redirects in `proxy.ts`
- 5.5.4 `searchParams` and route params — the URL-state pattern (foundation for SaaS pattern #7)
- 5.5.5 Client-side navigation hooks — `useRouter`, `usePathname`, `useSearchParams`, `useParams` from `next/navigation`; when to read URL state on the server vs. on the client
- 5.5.6 Quizz

### Chapter 5.6 — The Next.js project surface
- 5.6.1 `next.config.ts` orientation — the typed config; what kinds of settings live here (image config, redirects/rewrites, security headers, server-external packages)
- 5.6.2 Image domains and formats in `next.config.ts`
- 5.6.3 Redirects and rewrites for legacy URLs in `next.config.ts`
- 5.6.4 `serverExternalPackages` — when an SDK breaks bundling
- 5.6.5 `next/image` — `priority`, `sizes`, `placeholder`
- 5.6.6 Image transforms (light) — what Vercel's automatic image optimization gives you for free
- 5.6.7 `next/font` — Google fonts and self-hosted
- 5.6.8 `next/script` — when third-party scripts are unavoidable; loading strategies and the perf cost named at each
- 5.6.9 Metadata API — `generateMetadata`, OG/Twitter, dynamic OG images
- 5.6.10 SEO file conventions — `robots.ts`, `sitemap.ts`, `favicon.ico`, `icon.{ext}`, `apple-icon.{ext}`, `opengraph-image.{ext}`, `twitter-image.{ext}`; `generateViewport`
- 5.6.11 `generateStaticParams` — SSG for dynamic routes
- 5.6.12 Quizz

### Chapter 5.7 — Project: list-plus-detail with parallel routes
- 5.7.1 Project brief
- 5.7.2 Starter walkthrough — App Router scaffold, in-memory invoice fixture, typed server functions
- 5.7.3 Build it — the two parallel slots with `default.tsx` fallbacks and the server-side `?status=` filter from `searchParams`
- 5.7.4 Build it — the intercepting modal route and its paired non-intercepting `page.tsx`
- 5.7.5 Build it — Suspense boundaries with slot-specific skeletons
- 5.7.6 Verify — direct visit, soft nav, refresh, `Cmd+click`, and `?status=paid` survives reload

---

## Unit 6 — Data — Postgres through Drizzle

> Model the data backplane: the relational model, Drizzle as the data-access layer, and the schema as the single source of truth that every later layer derives from.

### Chapter 6.1 — The relational model and the data backplane
- 6.1.1 The relational model — tables, rows, columns, why normalization
- 6.1.2 The local development database — Docker Postgres or a Neon dev branch; the senior call (offline-capable but drifts from prod vs. matches prod exactly but needs connectivity)
- 6.1.3 Neon — branching per preview deploy, scale-to-zero, HTTP driver
- 6.1.4 Connection pooling on the Neon serverless driver
- 6.1.5 Quizz

### Chapter 6.2 — Defining schema with Drizzle
- 6.2.1 Architectural Principle #2 introduced — the schema is the source of truth
- 6.2.2 Drizzle schema — `pgTable`, columns, relations, references
- 6.2.3 Postgres data types — text, integer, bigint, numeric, boolean, timestamptz, date, jsonb, uuid, enum, arrays
- 6.2.4 NOT NULL, DEFAULT, generated columns
- 6.2.5 Primary keys — surrogate vs. natural; UUID vs. bigserial; composite primary keys
- 6.2.6 Foreign keys; ON DELETE and ON UPDATE behavior
- 6.2.7 UNIQUE and CHECK constraints
- 6.2.8 Many-to-many junction tables
- 6.2.9 `$inferSelect` / `$inferInsert` as the canonical row types
- 6.2.10 Quizz

### Chapter 6.3 — Querying and mutating
- 6.3.1 Drizzle queries — select, insert, update, delete; where, orderBy, limit/offset; SQL injection handled by Drizzle's parameterization (named explicitly so learners know why)
- 6.3.2 Joins — inner, left, right, full
- 6.3.3 Drizzle's relational query API
- 6.3.4 Aggregations — GROUP BY, HAVING
- 6.3.5 Upserts (`INSERT ... ON CONFLICT`) and RETURNING
- 6.3.6 Pagination — cursor vs. offset; cursor encoding (opaque base64 of last-row sort key + tiebreaker), stable ordering for cursor stability, when offset is fine vs. when cursor wins (live data, deep pagination, large tables); page size as a query param
- 6.3.7 Subqueries and CTEs (WITH)
- 6.3.8 Full-text search in Postgres (light, brief)
- 6.3.9 JSONB columns and querying — when to reach for JSONB vs. a real column
- 6.3.10 When to drop to raw SQL via `` sql`` `` and what it costs
- 6.3.11 Quizz

### Chapter 6.4 — Performance and integrity
- 6.4.1 Indexes — B-tree, partial, composite, expression, unique; when to add them
- 6.4.2 The N+1 query problem at the Drizzle layer (foreshadowed for the RSC waterfall lesson in Chapter 20.3)
- 6.4.3 EXPLAIN ANALYZE — reading a query plan
- 6.4.4 Transactions and isolation levels (read committed, repeatable read, serializable)
- 6.4.5 Quizz

### Chapter 6.5 — Migrations and the seed workflow
- 6.5.1 Drizzle Kit — generating migrations, applying them, the studio
- 6.5.2 Database seeding for dev and test
- 6.5.3 Quizz

### Chapter 6.6 — Project: org-scoped schema and queries
- 6.6.1 Project brief
- 6.6.2 Starter walkthrough — empty `db/schema.ts`, Drizzle Kit config, Docker Postgres
- 6.6.3 Build it — the schema and the generated migration
- 6.6.4 Build it — the seed script with two orgs and 50+ invoices each
- 6.6.5 Build it — paginated list query and the single-round-trip detail query
- 6.6.6 Verify — inspector page, idempotent seed, `EXPLAIN ANALYZE` on the detail query

---

## Unit 7 — Forms, Validation, and Server Actions

> Validate at every boundary, define the Server Action seam first, write native React 19 forms against it, and decide the error model where it actually bites.

### Chapter 7.1 — Schema-first validation with Zod 4
- 7.1.1 Zod 4 schemas — primitives, objects, arrays, unions, literals, enums; `z.strictObject` / `z.looseObject` as the top-level forms (the v3 `.strict()` / `.passthrough()` methods are legacy)
- 7.1.2 Top-level string format APIs — `z.email`, `z.uuid`, `z.url`, `z.cuid`, `z.ulid`, `z.ipv4`, ISO date/time validators (the v3 `z.string().email()` chain is deprecated)
- 7.1.3 Refinements and transforms — checks live inside the schema (the v4 "checks" model), transforms in a dedicated class; `.overwrite()` as the type-preserving transform
- 7.1.4 Composing schemas — extending, picking, omitting, merging; `z.record(keySchema, valueSchema)` now requires both arguments
- 7.1.5 Inferring TS types from schemas (`z.infer`)
- 7.1.6 Parsing vs. safe-parsing
- 7.1.7 The unified `error` param — replacing v3's separate `message` / `invalid_type_error` / `required_error`
- 7.1.8 drizzle-zod — `createSelectSchema`, `createInsertSchema` (now lives inside the drizzle-orm repo, same API surface)
- 7.1.9 Quizz

### Chapter 7.2 — Server Actions
- 7.2.1 Server Actions — definition and invocation from the client
- 7.2.2 The canonical Server Action Result return shape — `{ ok: true; data: T } | { ok: false; error: { userMessage; code } }` (ties Principle #7 to SaaS pattern #6)
- 7.2.3 `throw` vs. `Result` — the error-model decision now that the canonical Result shape exists; throw at the edge, return Result inside server actions and lib helpers where the caller branches on the failure shape
- 7.2.4 Server-side Zod validation as the boundary discipline
- 7.2.5 The serializable-args constraint for Server Actions
- 7.2.6 Architectural Principle #3 introduced — pure functions in `/lib`, side effects at named boundaries; the server-action / route-handler / job seam
- 7.2.7 Architectural Principle #5 introduced — use the framework's conventions, don't invent parallel ones; the temptation to roll a tRPC-style call wrapper named ahead
- 7.2.8 `revalidatePath` after a mutation — the basic move at the first server action; the full decision tree was covered in Chapter 5.4
- 7.2.9 Wrapping a server action in a Drizzle transaction — when multi-step mutations need atomicity; the `db.transaction(async (tx) => …)` shape; revisits the transactions thread from Chapter 6.4
- 7.2.10 Idempotency keys foreshadowed at the action layer — why double-clicks and dropped connections need a unique-on-key constraint; full pattern in Chapter 12.1
- 7.2.11 Quizz

### Chapter 7.3 — The native React 19 / Next.js 16 form pattern
- 7.3.1 Forms basics — controlled vs. uncontrolled, why uncontrolled fits the React 19 server-action pattern
- 7.3.2 `FormData` and the form/input contract — load-bearing for server actions
- 7.3.3 `<form action={serverAction}>` as the default form pattern
- 7.3.4 `useActionState` — pending state and result
- 7.3.5 `useFormStatus` — nested pending state
- 7.3.6 Optimistic UI with `useOptimistic`
- 7.3.7 Constraint Validation API — `required`, `pattern`, `minLength`, `inputmode`, `autocomplete`, `ValidityState`, `setCustomValidity`; senior call of which checks happen in the browser before submit vs. in the Zod parse on the server
- 7.3.8 Progressive enhancement and what you get for free
- 7.3.9 Quizz

### Chapter 7.4 — When the platform isn't enough — RHF (conditional)
- 7.4.1 When React Hook Form earns its weight — the threshold past the native pattern: change/blur-triggered validation, dynamic field arrays, multi-step wizards spanning many components, optimistic UX with fine-grained pending states
- 7.4.2 React Hook Form — `register`, `control`, the resolver model
- 7.4.3 RHF + Zod resolver — keeping the same Zod schema honest on both sides of the wire
- 7.4.4 RHF in our app — wiring it into the project where the trigger is met
- 7.4.5 Quizz

### Chapter 7.5 — Route handlers and API contracts
- 7.5.1 Route handlers — `route.ts`; when to reach for them vs. server actions
- 7.5.2 Designing API contracts with Zod — request and response shapes
- 7.5.3 Applying HTTP semantics to your own endpoints — methods, status codes, the idempotency rule made operational
- 7.5.4 Filtering, sorting, search at the API boundary
- 7.5.5 Quizz

### Chapter 7.6 — Project: CRUD via Server Actions
- 7.6.1 Project brief
- 7.6.2 Starter walkthrough — Unit 6 schema, shadcn `<Form>` primitives, page shell
- 7.6.3 Build it — Zod schemas and the three Server Actions returning the canonical Result
- 7.6.4 Build it — form components with `useActionState` and inline field errors driven by the Result
- 7.6.5 Build it — `useOptimistic` on create with rollback on action failure
- 7.6.6 Build it — the delete confirmation wrapped in a Drizzle transaction
- 7.6.7 Verify — JS-disabled flow, invalid-data field errors, optimistic rollback on failure

---

## Unit 8 — Email — Transactional Mail with Resend + React Email

> Set up Resend before any other unit needs it — auth verification, magic-links, password reset, invitations, and the notification dispatcher all build on the email plumbing introduced here.

### Chapter 8.1 — Sender identity and deliverability
- 8.1.1 Resend — sending and the verified-domain setup
- 8.1.2 DKIM, SPF, DMARC — what to set up before sending
- 8.1.3 Transactional vs. marketing email
- 8.1.4 Email bounces and complaints — the `email_suppressions` table and the never-re-send-to-suppressed discipline; the webhook handler that populates it lands in Chapter 12.1
- 8.1.5 Quizz

### Chapter 8.2 — Composing email
- 8.2.1 React Email — components and templating (closes the loop with JSX)
- 8.2.2 Previewing email locally — React Email's dev server, the iteration loop before any send-from-staging
- 8.2.3 Plain-text fallbacks and accessibility in HTML email
- 8.2.4 Quizz

### Chapter 8.3 — Project: transactional email send
- 8.3.1 Project brief — verified domain, the Resend setup, the suppression read
- 8.3.2 Build it — `lib/email.ts`, the env entries, and the suppression read
- 8.3.3 Build it — the Server Action that composes and sends the welcome email
- 8.3.4 Verify — real-inbox arrival on the student's verified domain, DKIM/SPF pass, suppression path returns `{ ok: false }` without calling Resend

---

## Unit 9 — Authentication with Better Auth

> Wire identity onto the data backplane: sessions, sign-in flows, and the request-time reads that downstream patterns lean on.

### Chapter 9.1 — Auth concepts
- 9.1.1 Authentication vs. authorization made explicit
- 9.1.2 Sessions, tokens, cookies — the conceptual model lifted into a working auth flow
- 9.1.3 The OAuth 2.0 authorization-code flow with PKCE — the protocol Better Auth abstracts
- 9.1.4 Quizz

### Chapter 9.2 — Better Auth setup
- 9.2.1 Better Auth Drizzle adapter and the tables it owns
- 9.2.2 The session table and why it earns its weight
- 9.2.3 Session strategies — server-stored sessions vs. JWTs, revocation, multi-device sessions
- 9.2.4 Session reads in middleware, layouts, and server actions
- 9.2.5 Quizz

### Chapter 9.3 — Sign-in flows
- 9.3.1 Email + password sign-up — the verification-gated flow
- 9.3.2 Email + password sign-in — the rate-limited surface and failed-attempt counter
- 9.3.3 Email verification — the token, the link, the verified-email gate
- 9.3.4 Password reset — the secure flow end to end
- 9.3.5 Magic-link / passwordless email auth
- 9.3.6 2FA / TOTP — enrolling, verifying, the recovery codes
- 9.3.7 Passkeys / WebAuthn — registration and assertion at Better Auth's level
- 9.3.8 OAuth providers in Better Auth — redirect URIs, scopes, the callback route, the accounts table, provider-specific quirks
- 9.3.9 Account linking — multiple identities pointing at one user record
- 9.3.10 Quizz

### Chapter 9.4 — Auth at request time and account management
- 9.4.1 Auth gating in `proxy.ts` — session reads, redirect-to-sign-in, the protected-routes pattern
- 9.4.2 Credential changes — change password, change email (with verification)
- 9.4.3 Session management — list active sessions, revoke individual sessions
- 9.4.4 Browser security defaults in this stack — CSRF (same-site cookies as the default mitigation) and XSS (handled by React's escaping; what `dangerouslySetInnerHTML` opts out of)
- 9.4.5 Quizz

### Chapter 9.5 — Project: email+password auth with verification
- 9.5.1 Project brief
- 9.5.2 Starter walkthrough — Better Auth instance skeleton, migrations, Unit 8 send
- 9.5.3 Build it — Better Auth instance config and first sign-up working (unverified)
- 9.5.4 Build it — email-verification template, send through Unit 8, and the token-handling callback
- 9.5.5 Build it — `proxy.ts` matcher, session reads in the layout, and the sign-out action
- 9.5.6 Verify — sign-up → verify → sign-in → protected route → sign-out cycle

---

## Unit 10 — Multi-Tenancy, Organizations, and RBAC

> Pin every record to an organization, enforce the role check at the action boundary structurally, and write the audit trail that survives discovery.

### Chapter 10.1 — Organizations as the tenancy model
- 10.1.1 Organization data model — creation, the active org in the session, switching orgs
- 10.1.2 Multi-tenancy — every record org-scoped; the tenant-aware query helper (SaaS pattern #1)
- 10.1.3 When Row-Level Security earns its weight — the threshold past application-layer scoping: the highest-stakes data classes where one missed scope is unacceptable; Postgres RLS as the power-tool tenancy enforcer (named, not defaulted)
- 10.1.4 RLS primitives — Postgres policies, `current_setting`, session-variable wiring from Drizzle/Neon
- 10.1.5 RLS in our app — applying it to the data class where the trigger is met
- 10.1.6 Quizz

### Chapter 10.2 — RBAC and the audit trail at the action boundary
- 10.2.1 RBAC — owner / admin / member as the year-1 default
- 10.2.2 The `authedAction(role, schema, fn)` wrapper — RBAC at the server-action boundary (SaaS pattern #2; the authz carve-out to Architectural Principle #5)
- 10.2.3 The same authz discipline at the route handler boundary — `authedAction` ported to `route.ts` so the missing-call class stays structurally hard at every untrusted-input seam
- 10.2.4 Member management — listing, roles, removal, leave-org, ownership transfer
- 10.2.5 The `audit_logs` table — append-only, never updated, never deleted; what role-changes, ownership transfers, and exports must record (revisited under the security baseline in Unit 17)
- 10.2.6 Quizz

### Chapter 10.3 — Invitations and seat management (SaaS pattern #3)
- 10.3.1 The invitations table — token, email, role, expiry, `acceptedAt`
- 10.3.2 Email-bound handshake; the signed accept link — token scope and expiry
- 10.3.3 Re-invites — handling a fresh invite when one already exists
- 10.3.4 Invitee already has an account — resolving the token to an existing user
- 10.3.5 Inviter losing seat before acceptance — what happens to pending invitations
- 10.3.6 Quizz

### Chapter 10.4 — Project: org, RBAC, and invitations
- 10.4.1 Project brief
- 10.4.2 Starter walkthrough — Unit 9 auth, Unit 8 send, the existing schema
- 10.4.3 Build it — `organizations` + `org_members` schema and migration
- 10.4.4 Build it — `invitations` + `audit_logs` schema and migration
- 10.4.5 Build it — the `authedAction(role, schema, fn)` wrapper and the `tenantDb(orgId)` helper
- 10.4.6 Build it — the invite send and accept actions, with audit-log writes
- 10.4.7 Verify — role refusal, invite accept across email sessions, audit panel updates

---

## Unit 11 — SaaS Building Blocks I: Lists, URL State, Soft Delete

> Build the list view every SaaS screen ends up being — URL-state filters, base-query helpers that prevent missing-`deletedAt` bugs, and concurrency that catches stale writes.

### Chapter 11.1 — URL-state list views (SaaS pattern #7)
- 11.1.1 URL-state list views — pagination, filter, sort, search
- 11.1.2 Filtering, sorting, search in the URL — what belongs vs. transient state
- 11.1.3 Pagination as URL state — encoding cursor or offset in `searchParams`, the share-and-refresh consequences (mechanics covered in Chapter 6.3)
- 11.1.4 Quizz

### Chapter 11.2 — Soft delete, archive, and concurrency
- 11.2.1 Soft delete, archive, restore — `deletedAt`; archive as a distinct user-facing state (SaaS pattern #9)
- 11.2.2 Base query helpers that make missing `deletedAt IS NULL` filters impossible
- 11.2.3 Optimistic concurrency control — version columns or `updatedAt` preconditions; HTTP 409 on conflict; when last-write-wins is fine
- 11.2.4 Quizz

### Chapter 11.3 — Project: URL-state list with soft delete and concurrency
- 11.3.1 Project brief
- 11.3.2 Starter walkthrough — Unit 7 CRUD surface, `deletedAt` + `version` already in schema
- 11.3.3 Build it — lift filter, sort, and cursor to `searchParams`
- 11.3.4 Build it — the base-query helper, soft-delete action, restore action
- 11.3.5 Build it — the `version` precondition on update and the 409 surface
- 11.3.6 Verify — share-and-refresh URL, soft-deleted visibility toggle, two-tab 409 race

---

## Unit 12 — Webhooks and Stripe Billing

> Ingest webhooks idempotently and derive plan entitlements from Stripe — the async-and-money seam where careless code becomes expensive in production.

### Chapter 12.1 — Webhook ingestion (SaaS pattern #5)
- 12.1.1 Webhook ingestion — signature verification at the route handler boundary, with constant-time comparison as the timing-attack mitigation (closes the Web Crypto thread from Chapter 3.7)
- 12.1.2 The `processed_events` table to dedupe replays
- 12.1.3 Outer transaction so partial state never lands
- 12.1.4 Out-of-order events; the redirect-vs-webhook race
- 12.1.5 Idempotency as a unifying discipline — the unique-on-key DB constraint pattern, consolidated for webhooks, server actions, and retried jobs
- 12.1.6 Stripe CLI for local webhook testing — `stripe listen` as the local-development corollary
- 12.1.7 Resend bounce/complaint webhooks — the same ingestion shape applied to email deliverability; populating `email_suppressions` from the idempotent handler pattern (closes the loop with Chapter 8.1)
- 12.1.8 Quizz

### Chapter 12.2 — Stripe billing (SaaS pattern #4)
- 12.2.1 Stripe — products, prices, customers, subscriptions
- 12.2.2 Stripe Checkout sessions
- 12.2.3 The Stripe customer portal
- 12.2.4 Plan entitlements as a derived view your app reads from
- 12.2.5 Trial / past-due / cancelled as first-class statuses, not boolean flags
- 12.2.6 The thin internal billing interface (`billing.upgrade`, `billing.openPortal`, `billing.requirePlan`) — the billing carve-out to Architectural Principle #5
- 12.2.7 When an SDK adapter earns its weight — only the two named carve-outs (the authz wrapper from Chapter 10.2, the billing interface above); Resend, Trigger.dev, and R2 are explicitly NOT wrapped, because their swap cost doesn't justify the tax
- 12.2.8 Quizz

### Chapter 12.3 — Project: Stripe webhook to plan entitlements
- 12.3.1 Project brief
- 12.3.2 Starter walkthrough — Stripe test mode, the CLI, `pnpm seed:stripe` for products, route handler stub
- 12.3.3 Build it — signature verification with constant-time compare
- 12.3.4 Build it — the outer transaction and `processed_events` dedup
- 12.3.5 Build it — the three event handlers and the derived `plan_entitlements` row
- 12.3.6 Build it — the `billing.upgrade` / `openPortal` / `requirePlan` interface and the inspector portal button
- 12.3.7 Verify — `stripe trigger` lands once, replay doesn't mutate twice, portal opens, signature tampering returns 400

---

## Unit 13 — Conditional Infrastructure: Background Work and Object Storage

> Run scheduled and durable jobs when the platform default isn't enough, and handle uploads when the product genuinely needs them.

### Chapter 13.1 — Background work — defaults and Trigger.dev
- 13.1.1 Inline async work in Server Actions — short, sync-friendly mutations
- 13.1.2 Vercel Cron — scheduled jobs default
- 13.1.3 When Trigger.dev earns its weight — the threshold past inline async + Vercel Cron: workloads that demand durability (multi-step flows that must survive failures, retries with backoff, fan-out, jobs that exceed Vercel function time limits, event-driven flows that span steps)
- 13.1.4 Trigger.dev v4 primitives — `task` and `schemaTask` (Zod-validated payloads), runs, code-defined queues (declared in code before deployment, not at trigger time as in v3), concurrency limits, schedules (cron and dynamic)
- 13.1.5 Waitpoints — the v4 primitive that blocks runs until conditions are met; callback-URL completion for third-party hand-offs, timeouts, human-in-the-loop pauses; one waitpoint can block many runs and one run can wait on many waitpoints
- 13.1.6 The durable-execution model — retries with backoff, `wait.for` / `wait.until`, idempotency at every trigger and wait (`idempotencyKey`, `idempotencyKeyTTL`), run priority as a queue-ordering offset
- 13.1.7 Trigger.dev in our app — where the workload genuinely demands durability
- 13.1.8 Quizz

### Chapter 13.2 — Project: Trigger.dev durable export job
- 13.2.1 Project brief
- 13.2.2 Starter walkthrough — Trigger.dev v4 project, the cloud link, the local dev CLI for the kill/resume verification, the empty task file, the pre-built `ExportReadyEmail.tsx` template
- 13.2.3 Build it — the `schemaTask` with payload schema and the code-defined queue declaration
- 13.2.4 Build it — paginate the export with `wait.for` between pages and idempotency keys per page
- 13.2.5 Build it — the final send-email step rendering `ExportReadyEmail` and calling the Unit 8 send
- 13.2.6 Verify — visible run progress, mid-run local-worker kill resumes, parallel triggers per org serialize

### Chapter 13.3 — Object storage (conditional)
- 13.3.1 When object storage earns its weight — most SaaS have no user-uploaded files; the trigger conditions (avatars, documents, generated assets) and why R2 (not S3, not UploadThing) for SaaS unit economics
- 13.3.2 Cloudflare R2 — buckets, the S3-compatible API, the Workers/Vercel-side configuration
- 13.3.3 Presigned URLs for direct browser uploads (closes the Blob/File primitives thread from Chapter 3.7)
- 13.3.4 File metadata in Postgres alongside the object reference
- 13.3.5 R2 in our app — wiring uploads when the product calls for them
- 13.3.6 Quizz

### Chapter 13.4 — Project: presigned R2 upload
- 13.4.1 Project brief
- 13.4.2 Starter walkthrough — R2 bucket, credentials env, S3-compatible SDK, upload page shell
- 13.4.3 Build it — the `presignedPut` server action and the env entries
- 13.4.4 Build it — the client-side direct-to-R2 upload and the `file_metadata` migration + save
- 13.4.5 Build it — the `Files` list page rendering rows with fresh presigned GET URLs
- 13.4.6 Build it — wire back to the Unit 13a export job so it uploads the CSV to R2 and the email carries the presigned download link
- 13.4.7 Verify — file lands in R2, metadata matches, download works after the GET URL window, Unit 13a job emails a working R2 link

---

## Unit 14 — Notifications

> A centralized dispatcher for in-app inbox + email + future channels — events fire once, preferences are checked once, and call sites stay free of channel-specific code.

### Chapter 14.1 — Notifications as a centralized layer (SaaS pattern #10)
- 14.1.1 The `notifiable_events` table; the dispatcher
- 14.1.2 Channel-specific sends — email via Resend; in-app inbox via DB rows
- 14.1.3 `user_notification_preferences` checked once in the dispatcher, never at the call site
- 14.1.4 Dedup / coalesce on rapid duplicate events
- 14.1.5 Notifiable vs. logged events — what counts as user-facing vs. audit-only
- 14.1.6 Quizz

### Chapter 14.2 — Project: notification dispatcher
- 14.2.1 Project brief
- 14.2.2 Starter walkthrough — Unit 8 send, Unit 10 schema, a seeded invitation row
- 14.2.3 Build it — the `notifiable_events` registry and the dispatcher with the 60-second dedup window keyed by `(event_type, subject_id)`
- 14.2.4 Build it — the email channel send, the in-app inbox writer, and the `user_notification_preferences` read
- 14.2.5 Build it — wire three call sites (invite sent, role changed, billing past-due)
- 14.2.6 Verify — pref toggle, rapid-fire dedup, default-on for missing pref

---

## Unit 15 — Cache and Rate Limiting

> Cache decisions as architecture, not afterthought — and rate limiting on the abusable endpoints from the moment the project ships to a public URL.

### Chapter 15.1 — Cache decisions as architecture (SaaS pattern #8)
- 15.1.1 Cache decisions as architecture — which routes are statically cacheable vs. always-dynamic in a SaaS; when to reach for `cacheTag` so a single mutation can invalidate exactly the right caches
- 15.1.2 Cache invalidation after a mutation — `updateTag`, `revalidateTag`, `revalidatePath`, `router.refresh` decision tree applied to worked SaaS cases (list view post-edit, post-purchase, post-membership-change); the `updateTag`-vs-`revalidateTag` call (immediate expiry for user-driven mutations vs. stale-while-revalidate for background ones) made operational on real flows; revisits Chapter 5.4
- 15.1.3 Quizz

### Chapter 15.2 — Project: cacheTag-driven invalidation
- 15.2.1 Project brief
- 15.2.2 Starter walkthrough — Unit 11 list, stub Trigger.dev summary job
- 15.2.3 Build it — annotate the list with `use cache`, lay down the cache-tag scheme, and emit `fetchedAt` from inside each cached function
- 15.2.4 Build it — call `updateTag` from the edit action and `revalidateTag` from the background job
- 15.2.5 Verify — `fetchedAt` stays stable across cache hits, refreshes after `updateTag`, and refreshes only on the next visit after `revalidateTag`

### Chapter 15.3 — Rate limiting and shared session-shaped data (Upstash)
- 15.3.1 Edge controls (light) for basic rate limiting before launch
- 15.3.2 When Upstash Redis becomes part of the baseline — pre-launch demos can lean on Vercel/Cloudflare edge controls; the moment the project ships to a public URL, `@upstash/ratelimit` on auth endpoints is non-negotiable; distributed cache and shared session storage as the further reasons it earns its weight
- 15.3.3 Upstash Redis primitives — rate limiting on abusable endpoints (sign-up, sign-in, password reset, public APIs)
- 15.3.4 Upstash in our app — wiring `@upstash/ratelimit` on the auth endpoints
- 15.3.5 Quizz

### Chapter 15.4 — Project: Upstash rate limit on auth endpoints
- 15.4.1 Project brief
- 15.4.2 Starter walkthrough — Unit 9 auth flows, the Upstash Redis project
- 15.4.3 Build it — declare the three sliding-window limiters (sign-in, sign-up, reset)
- 15.4.4 Build it — wrap sign-in with per-IP and per-email keys; wrap sign-up and reset; emit `RateLimit-*` headers
- 15.4.5 Verify — 11th request returns 429 with headers, window resets release tokens, Upstash dashboard shows the keys

---

## Unit 16 — Conditional Client-State Tools

> The two conditional client-state libraries — reach for them only when Server Components, Server Actions, `useState`, and URL state aren't enough.

### Chapter 16.1 — TanStack Query (conditional)
- 16.1.1 When TanStack Query earns its weight — the threshold past Server Components / Server Actions: real-time UI (polling/frequent refetches), complex client-side caching across views, optimistic mutations with rollback, infinite scroll with cache reuse
- 16.1.2 TanStack Query primitives — queries, mutations, optimistic updates, infinite queries
- 16.1.3 TanStack Query in the App Router — `QueryClientProvider`, `HydrationBoundary`; hydrating server-fetched data into the client cache
- 16.1.4 TanStack Query in our app — the screen where the trigger is met
- 16.1.5 Quizz

### Chapter 16.2 — Project: TanStack Query on optimistic comments
- 16.2.1 Project brief
- 16.2.2 Starter walkthrough — Unit 11 invoices, the comments route handlers, seeded comments
- 16.2.3 Build it — `QueryClientProvider` + `HydrationBoundary` for SSR-hydrated initial data
- 16.2.4 Build it — `useInfiniteQuery` for the thread with cursor paging and the polling interval
- 16.2.5 Build it — `useMutation` with optimistic add and rollback on `onError`
- 16.2.6 Verify — cross-session arrival within the poll window, optimistic visibility, forced 500 rollback

### Chapter 16.3 — Zustand (conditional)
- 16.3.1 When Zustand earns its weight — the threshold past `useState` and URL state: genuinely shared client state across deeply nested components (multi-step wizards, global UI flags, cart-style stores); client-only, never in server components
- 16.3.2 Zustand primitives — global client state; slices
- 16.3.3 Zustand in our app — the wizard or shared-flag case where the trigger is met
- 16.3.4 Quizz

### Chapter 16.4 — Project: Zustand for a multi-step wizard
- 16.4.1 Project brief
- 16.4.2 Starter walkthrough — four route segments, per-step Zod schemas
- 16.4.3 Build it — the Zustand store with per-step slices and a typed selector surface
- 16.4.4 Build it — wire each step's form to the store and the Next-gate validation
- 16.4.5 Build it — the final submit action, the success-reset, and back/forward navigation
- 16.4.6 Verify — back/forward preserves, refresh loses (the senior call), no double-submit on step 4

---

## Unit 17 — Errors and the Security Baseline (SaaS patterns #6 and #12)

> The pre-launch audit pass — error discipline at every seam, plus the irreducible security baseline a senior wouldn't ship without. Two audits, not new ideas: by this point the error commitments have been used at server actions, webhooks, billing, and invitations, and this unit walks the seams against them; the security baseline names the headers, rate limits, audit logs, GDPR posture, consent gating, secrets, and dep hygiene in one explicit pass.

### Chapter 17.1 — Error discipline
- 17.1.1 Errors fail closed — anything that looks like authorization (`requireRole`, paywall checks, tenancy filters) refuses by default; an exception inside the check is treated as a refusal, not an allow
- 17.1.2 User-message vs. operator-message split — what reaches the user is operator-safe to read aloud (no internal IDs, no stack traces, no "DB constraint X failed"); diagnostic detail goes to Sentry and the audit log
- 17.1.3 The two commitments revisited at the seams — where each commitment lands in `authedAction`, billing, and webhook code
- 17.1.4 Quizz

### Chapter 17.2 — The security baseline
- 17.2.1 Security headers — CSP, HSTS, X-Frame-Options, Referrer-Policy — set in `next.config.ts`
- 17.2.2 Rate limiting on abusable endpoints (revisit; Upstash now in place from Chapter 15.3)
- 17.2.3 Audit logs as discipline — what to log, what not to (revisits the table introduced at RBAC)
- 17.2.4 GDPR posture — retention timers, deletion-on-request that actually works
- 17.2.5 Cookie consent gate — single source of truth for analytics opt-in; gates PostHog events, session replay, and any non-essential third-party
- 17.2.6 Secrets management — env vars, never in code, never in client bundles
- 17.2.7 Type-safe environment variables (revisit; in place from Chapter 1.4) — confirming the `@t3-oss/env-nextjs` discipline as part of the security baseline audit
- 17.2.8 Dep hygiene — `pnpm audit`, "is this maintained" check, lockfile committed
- 17.2.9 Quizz

### Chapter 17.3 — Project: error and security baseline audit
- 17.3.1 Audit brief — the eight categories, the rule-location-consequence-fix template
- 17.3.2 Audit target walkthrough — the seeded codebase, the running app, one modeled finding end-to-end
- 17.3.3 Audit it — error discipline pass (fail-closed checks, user/operator message split, `dangerouslySetInnerHTML`)
- 17.3.4 Audit it — security baseline pass (headers, rate limits, audit-log gaps, secrets, GDPR posture, dep hygiene)
- 17.3.5 Verify — match findings against the published answer key, quantify any misses

---

## Unit 18 — Time and Internationalization

> Store time canonically, render it locally, and treat translation as a discipline before it's a feature.

### Chapter 18.1 — Time, dates, and timezones (SaaS pattern #13)
- 18.1.1 UTC in Postgres (`timestamptz`); local at the edge (consolidates the earlier Temporal thread)
- 18.1.2 Date-only values modeled as `date`, not midnight timestamps
- 18.1.3 The user's timezone in their profile, not derived per-request
- 18.1.4 DST transitions and recurring jobs
- 18.1.5 Date arithmetic with Temporal — never hand-rolled month math; native and unflagged from Node 26 (May 2026), `temporal-polyfill` (FullCalendar, ~20KB) or `@js-temporal/polyfill` (TC39 champions, full-spec) on the Node 24 LTS line that most production SaaS still runs on
- 18.1.6 Quizz

### Chapter 18.2 — Internationalization (SaaS pattern #14)
- 18.2.1 The i18n discipline — translation keys with interpolation, never string concatenation
- 18.2.2 ICU MessageFormat for plurals and gendered forms
- 18.2.3 `Intl.NumberFormat`, `Intl.DateTimeFormat`, `Intl.RelativeTimeFormat`, `Intl.PluralRules`, `Intl.Collator`
- 18.2.4 Locale negotiation — profile preference + `Accept-Language`
- 18.2.5 next-intl — the 2026 Next.js i18n library and how it implements the discipline
- 18.2.6 i18n SEO — `hreflang` tags, per-locale sitemap entries, canonical URLs, locale-aware OG images
- 18.2.7 Quizz

### Chapter 18.3 — Project: localized, tz-aware list view
- 18.3.1 Project brief
- 18.3.2 Starter walkthrough — Unit 11 list, profile `locale` + `timezone` columns, `next-intl` installed
- 18.3.3 Build it — `next-intl` config, locale negotiation in the layout, and three message catalogs with ICU plurals
- 18.3.4 Build it — date rendering with Temporal in profile tz and currency via `Intl.NumberFormat`
- 18.3.5 Build it — `alternates.languages` metadata and per-locale sitemap entries
- 18.3.6 Verify — locale switch reflow, DST-spanning render, `hreflang` tags in source

---

## Unit 19 — Testing

> Test behavior, not implementation; concentrate on the seams where bugs actually cost money.

### Chapter 19.1 — The shape of a test suite
- 19.1.1 Vitest setup and the test runner model
- 19.1.2 The shape of the suite — most tests unit, fewer integration, very few E2E; the honeycomb shape for a Next.js SaaS
- 19.1.3 Coverage philosophy — what to chase, what not to; 100% coverage as theatre
- 19.1.4 The shape of a single test — Arrange / Act / Assert, one behavior per test, descriptive name; behavior over implementation as the rule that survives a refactor
- 19.1.5 Quizz

### Chapter 19.2 — Unit tests for `/lib`
- 19.2.1 Unit tests for pure logic in `/lib`
- 19.2.2 Test fixtures and factories
- 19.2.3 Determinism — controlling time, randomness, and IDs (fake timers, injected `now()` / `uuid()`)
- 19.2.4 Type-level testing with `expectTypeOf` / `assertType` — guarding the moves from Principle #7
- 19.2.5 Testing async code — the forgotten-`await` trap, fake timers with promises
- 19.2.6 Testing the unhappy path — `expect(...).toThrow`, expected-failure assertions, error-result shape
- 19.2.7 Quizz

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
- 22.1.1 AGENTS.md — what earns a place, what doesn't (introduced at first project setup in Chapter 1.4; full treatment here)
- 22.1.2 README discipline — first contact only, link out from there
- 22.1.3 ADRs in `/docs/adr/` — Michael Nygard template (Context / Decision / Consequences); one decision per file; write the ADR as the decision is being made, not after
- 22.1.4 The course's opinionated picks worth an ADR — Drizzle over Prisma, Better Auth over Clerk, Biome over ESLint+Prettier, Cloudflare R2 over S3, Node runtime not edge, native forms before RHF
- 22.1.5 Docs live next to the truth — the schema file IS the data-model doc
- 22.1.6 Diataxis vocabulary — tutorial / how-to / reference / explanation
- 22.1.7 Quizz

### Chapter 22.2 — Comments, TSDoc, and team discipline
- 22.2.1 TSDoc on public surfaces, not on internals
- 22.2.2 Comments answer why, not what; never deleted in a refactor
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
