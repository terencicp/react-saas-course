sources:
  6.1: The four import-export shapes
  6.2: Walking the graph — evaluation, live bindings, and the client bundle
  6.3: Top-level await vs. lazy init
  6.4: Augmenting third-party modules
questions:
  - source: 6.1
    question: |
      You need a local helper in `lib/format.ts` that exports a single `formatPrice` function used by a handful of components. A teammate suggests `export default formatPrice` so callers can import it as any name they like. What's the senior cut?
    choices:
      - text: |
          Use a named export — `export const formatPrice = ...`. Default exports earn their weight only where the framework demands them (`page.tsx`, `layout.tsx`, etc.); everywhere else, named exports win because renames propagate and the call-site spelling is fixed.
        correct: true
      - text: |
          Use a default export — it's the cleaner shape for a single-function module and lets the importer pick a shorter local name.
        correct: false
      - text: |
          Either is fine — the named-vs-default question is purely stylistic in 2026.
        correct: false
    why: |
      The named-vs-default debate is closed in 2026. Defaults are framework-mandated (App Router special files, route-handler exports), and a small set of third-party packages ship a default. Everywhere else, named exports win — renames propagate through every caller, tree-shaking is reliable, and the import line names exactly what it pulls in. "Importer picks the name" is a downside, not a feature, in app code.

  - source: 6.2
    question: |
      A client component imports a pure `formatDate` helper from `lib/utils.ts`. The same file also exports `getCurrentUser`, which queries the database. The build succeeds, but the client bundle balloons by 800KB. Why, and what's the structural fix?
    choices:
      - text: |
          The bundler walks every reachable static-import edge from a `'use client'` entry, including `getCurrentUser`'s database dependencies. Split the file into `lib/format.ts` (pure) and `lib/auth.ts` with `import 'server-only'` as its first line — the build will then refuse to ship if any client file ever reaches the server seam.
        correct: true
      - text: |
          `formatDate` accidentally captured a server-only closure; rename the export to break the reference.
        correct: false
      - text: |
          Tree-shaking is disabled inside `'use client'` files; add `"sideEffects": false` to `package.json` to fix it.
        correct: false
    why: |
      The graph is the answer. Static imports draw eager edges, and the bundler crawls every reachable module from a client entry — so a single helper file mixing pure and server-only code drags the server world along. The structural fix is file-per-responsibility plus `import 'server-only'` at the server seam, which converts the bug class from "ships silently" to "build error pointing at the offending chain."

  - source: 6.2
    question: |
      Two files import each other at the value level:

      ```ts
      // a.ts
      import { fromB } from './b';
      export const fromA = fromB + 1;
      ```

      ```ts
      // b.ts
      import { fromA } from './a';
      export const fromB = fromA + 1;
      ```

      An entry module imports `a.ts`. What happens, and what's the experienced reflex?
    choices:
      - text: |
          Produces `NaN` at runtime — `b.ts` reads a partial `a.ts` whose `fromA` hasn't been assigned yet, so `fromB = undefined + 1`. The fix is to extract the shared symbol into a third module both sides import from (a Y-shape, no cycle).
        correct: true
      - text: |
          Build fails — modern bundlers refuse to emit cyclic value-level edges.
        correct: false
      - text: |
          Both exports settle to `1` — the runtime re-evaluates each module until the cycle stabilizes.
        correct: false
    why: |
      Value-level cycles read at the top level hit a partial-module window: whichever side starts second sees the other mid-evaluation and reads `undefined`. The arithmetic produces `NaN`; the build is happy. The reflex is structural — extract shared symbols into a third module so the graph becomes a Y-shape with deterministic evaluation order. (Type-only cycles, by contrast, are erased and harmless.)

  - source: 6.3
    question: |
      Which of these setup tasks belong in a **lazy cached getter** (`getX()`) rather than top-level work at module load?
    choices:
      - text: |
          A Postgres connection pool used by some routes but not others.
        correct: true
      - text: |
          A Stripe SDK that only initializes when `STRIPE_SECRET_KEY` is set.
        correct: true
      - text: |
          Env-var validation with Zod that every server file depends on.
        correct: false
      - text: |
          A signing key loaded from a secret manager and used to verify every incoming request.
        correct: false
    why: |
      Top-level work earns its weight when it's cheap, mandatory for every consumer, and deterministic — env validation and the universally-used signing key both qualify. Lazy init is for expensive (a connection pool) or conditional (Stripe only when configured) work, so importers that never need the resource don't pay for it. Hiding env validation behind a getter defers the failure to first request, which is the opposite of fail-closed.

  - source: 6.3
    question: |
      A developer adds a top-level `await loadFlagsFromService()` in a leaf module `feature-flags.ts` that fetches feature flags from a remote service on every cold start. The page that ultimately imports it now takes two seconds longer to render. Why?
    choices:
      - text: |
          Top-level await propagates upward along static-import edges — every module above `feature-flags.ts` becomes implicitly async and cannot finish its own top-level code until the leaf resolves. In a Server Component, the page render sits at the top of that chain, so the slow leaf becomes a render-blocker.
        correct: true
      - text: |
          `await` at module scope is illegal in Next.js 16; the slowdown is a fallback path that synchronously polls until the promise resolves.
        correct: false
      - text: |
          Top-level await disables HTTP keep-alive on the importing page, so each request re-opens a TCP connection.
        correct: false
    why: |
      Top-level await is a graph-level change, not a local one. The wait cascades to every static importer, all the way to the entry. That makes it the right reach for fast, deterministic, mandatory work (env validation), and the wrong reach for slow per-request fetches — those belong inside a Server Component with Suspense, where streaming can render around the wait.

  - source: 6.4
    question: |
      Better Auth's published `Session.user.id` is `string`, but your project has a branded `UserId`. Every Server Action that reads the session is casting `session.user.id as UserId`. What's the senior reach?
    choices:
      - text: |
          Skip `declare module` here — Better Auth ships its own extension contract (`additionalFields` + `typeof auth.$Infer.Session`) for adding fields, and for the bare-string-to-brand case, re-brand at the query boundary with the brand factory. Augmenting `declare module 'better-auth'` would lie about what the runtime actually hydrates.
        correct: true
      - text: |
          Augment `declare module 'better-auth' { interface Session { user: { id: UserId } } }` in `types/better-auth.d.ts` — the augmentation is the standard reach for any third-party type mismatch.
        correct: false
      - text: |
          Weaken every receiving function to accept `string` — the brand has outlived its usefulness once a third-party library is involved.
        correct: false
    why: |
      Question zero is "does the library ship its own extension contract?" Better Auth does — `$Infer` derives the type from the same config that hydrates the runtime, so the type and the value stay in sync. A `declare module` augmentation here would tell the type checker the field is branded while the runtime still hands you a bare string, re-introducing the bug class the brand existed to prevent. The right re-brand happens at the application boundary with the brand factory.

  - source: 6.4
    question: |
      A teammate writes the following in `types/next-intl.d.ts` and the augmentation never fires:

      ```ts
      declare module 'next-intl' {
        interface AppConfig {
          Messages: { home: { title: string } };
        }
      }
      ```

      What's the most likely cause?
    choices:
      - text: |
          The file has no top-level `import` or `export`, so TypeScript treats it as a global ambient declaration. `declare module 'next-intl'` then declares a non-existent global module instead of merging into the package. Adding `import type { ... } from '...'` at the top flips the file to module mode and the augmentation fires.
        correct: true
      - text: |
          `AppConfig` must be declared as a `type` alias, not an `interface`, for the augmentation to merge.
        correct: false
      - text: |
          Augmentation files have to live inside `src/`; placing them in a top-level `types/` directory hides them from `tsc`.
        correct: false
    why: |
      A `.d.ts` file with no top-level imports or exports is an ambient script file — `declare module 'x'` inside it declares a global module by that name rather than augmenting the real package. The fix is a top-level `import`/`export` so TypeScript treats the file as a module. The interface-vs-type rule runs the other way: interfaces merge, type aliases refuse — so `AppConfig` must stay an interface.

  - source: 6.1
    question: |
      What does `'@/db'` resolve to, and where is the resolution rule defined?
    choices:
      - text: |
          A TypeScript path alias resolved against the `paths` field of `tsconfig.json` — not a `node_modules` lookup at all. Both `tsc` and the bundler read the same `tsconfig.json` and agree on the resolution.
        correct: true
      - text: |
          A package-name lookup — Node walks up the directory tree looking for `node_modules/@/db/package.json`.
        correct: false
      - text: |
          A subpath import resolved through the `exports` field of the `@` package in `node_modules`.
        correct: false
    why: |
      The `@/` prefix is a project-defined alias in `tsconfig.json`'s `paths`, not a scoped npm package name. Both the type checker and the bundler resolve it against the same config. Bare specifiers split three ways: package names (`'react'`) resolved via `node_modules` and the package's `exports` field, subpaths (`'next/headers'`) gated by `exports` keys, and `@/*` aliases resolved through `tsconfig.json`.
