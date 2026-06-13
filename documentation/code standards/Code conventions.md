# Code conventions

Production code shape for everything that ships in `react-saas-course-projects/` (starter and solution code) and for code blocks shown in lesson MDX. Lesson MDX additionally follows §4 of `Pedagogical guidelines.md` for stripping and display.

These rules are the **2026 senior default** for the course's stack — React 19, Next.js 16, TypeScript, Tailwind v4, Zod 4, Drizzle, Better Auth, Biome, pnpm 11+, Node 24 LTS via mise. They are not negotiable per project. Uniform shape across all 22 chapter projects is the point; the win condition is that a student can move between projects without re-learning where things live or how they're named.

## Index

- **Baseline** — [Formatting](#formatting) · [TypeScript](#typescript) · [Function form](#function-form) · [Naming](#naming)
- **Code organisation** — [File and folder layout](#file-and-folder-layout) · [Module boundaries](#module-boundaries) · [Imports](#imports)
- **UI** — [Components and JSX](#components-and-jsx) · [Hooks and the React Compiler](#hooks-and-the-react-compiler) · [Client server state (TanStack Query)](#client-server-state-tanstack-query) · [Styling — Tailwind v4](#styling--tailwind-v4) · [shadcn primitives](#shadcn-primitives) · [Accessibility](#accessibility) · [Internationalization (next-intl)](#internationalization-next-intl)
- **Server** — [Forms and Server Actions](#forms-and-server-actions) · [Route handlers](#route-handlers) · [Schemas with Zod 4](#schemas-with-zod-4) · [Data layer (Drizzle)](#data-layer-drizzle) · [Authentication (Better Auth)](#authentication-better-auth) · [Caching and invalidation](#caching-and-invalidation) · [Background work (Trigger.dev)](#background-work-triggerdev)
- **Cross-cutting** — [Error handling](#error-handling) · [Async, cancellation, and time](#async-cancellation-and-time) · [Logging](#logging) · [Testing](#testing) · [Security baseline](#security-baseline) · [Supply chain and tooling](#supply-chain-and-tooling) · [Comments and inline docs](#comments-and-inline-docs)
- **Closing** — [How to read this doc](#how-to-read-this-doc) · [Where to extend this doc](#where-to-extend-this-doc)

## How to read this doc

- Each section is a flat list of imperative rules. The default is "always" unless a carve-out is named.
- "Why" lines appear only when the rule is non-obvious or has bitten people before.
- `TODO(<unit>)` markers flag rules that go live as a specific unit lands.
- This doc governs **production code shape**. §4 of `Pedagogical guidelines.md` governs **lesson MDX display** (when to strip imports, how to mark `// new` / `// changed`). The two never conflict — displayed code obeys both.

## Formatting

Biome owns formatting. The canonical `biome.json` in `configs/` **overrides Biome's defaults** in two places: single quotes (Biome ships double) and 2-space indent (Biome ships tabs). The rest of the list matches Biome defaults.

- Single quotes for strings. Double quotes only inside JSX attributes.
- Backtick template strings only when interpolating (`` `Hello, ${name}` ``) or multiline. Never as the default string form.
- Trailing commas everywhere multiline.
- Semicolons on.
- 2-space indent.
- Line length 80 (Biome default).
- One blank line between top-level declarations. No double blank lines.
- Files end with a single newline.

## TypeScript

Inference-led at the boundaries; strict at the seams.

- `strict: true` plus `noUncheckedIndexedAccess`, `noFallthroughCasesInSwitch`, `noImplicitOverride`, `forceConsistentCasingInFileNames`. The `@/*` path alias is set in `tsconfig.json` and used everywhere.
- Annotate parameters and **return types of exported functions**. Let inference handle locals, intermediate values, and internal-helper returns. Annotate explicitly when inference is wrong, when the signature is itself the lesson, or when narrowing is the point.
- Never `any`. Use `unknown` when typing forces the issue and narrow at the boundary (`typeof`, `in`, `instanceof`, `Array.isArray`, discriminant fields).
- `type` for everything by default — unions, intersections, mapped types, object aliases. `interface` only when you genuinely need declaration merging (extending third-party module types). Why: one alias form keeps the codebase legible and removes the type-vs-interface debate.
- Prefer discriminated unions over flag booleans. `{ ok: true; data } | { ok: false; error }` over `{ success, data?, error? }`.
- `as const` for literal tuples and read-only object literals you'll narrow against.
- `satisfies` to validate a value's shape without widening it. Use it on typed-config objects: `export const config = { ... } as const satisfies AppConfig`.
- Generic constraints: `<T extends ...>` over loose `<T>`. The `const` modifier on type parameters (`<const T>`) when call-site literals must stay narrow.
- Branded IDs for cross-entity ID safety. The brand factory and `Brand<T, Name>` helper live in `lib/branded.ts`.
- Never `enum`. Use `as const` objects with `keyof typeof` or string literal unions.
- `import type { ... }` for type-only imports — `verbatimModuleSyntax` enforces it.

## Function form

- Arrow functions bound to `const` for components, callbacks, and inline use. The default.
- `function` declarations only for: hoisting, named recursion, and type-guard signatures (`function isFoo(x: unknown): x is Foo`).
- Named exports everywhere except where the framework dictates default exports — Next App Router's `page.tsx`, `layout.tsx`, `template.tsx`, `route.ts`, `error.tsx`, `global-error.tsx`, `loading.tsx`, `not-found.tsx`, `proxy.ts`, `default.tsx`, `opengraph-image.tsx`, `icon.tsx`, `apple-icon.tsx`. Default exports nowhere else.
- Two positional parameters max. Past two, take an options object.
- Default parameter values fire only on `undefined`. Required parameters before optional.

## Naming

Semantic and domain-tied. Never `foo`, `bar`, `baz`, `temp`, `data2`, `myVariable`, `helper`.

- Variables and functions: `camelCase`.
- React components and TypeScript types: `PascalCase`.
- Filenames: `kebab-case` (`new-invoice-form.tsx`, `auth-client.ts`) except where the framework dictates (`page.tsx`, `layout.tsx`, `proxy.ts`, `AGENTS.md`, etc.).
- Folder names: `kebab-case`. Private folders use the Next.js `_` prefix (`_components/`, `_lib/`). Route groups wrap in parens (`(marketing)`, `(app)`).
- True compile-time constants exported at module top level: `SCREAMING_SNAKE_CASE`. Regular state — even frozen objects, env objects, model handles — stays `camelCase`.
- Booleans read as predicates: `isLoading`, `hasUnsavedChanges`, `canEdit`, `shouldRevalidate`. Never `loading`, `unsavedChanges`, `edit`.
- Negated booleans are forbidden. Use `isEnabled`, not `isDisabled`. Why: `!isDisabled` reads two negations.

### Functions by intent

- **Reads — single record:** `getInvoice(id)`. Returns the row or `null`. `getInvoiceOrThrow(id)` when callers genuinely can't continue on miss.
- **Reads — multiple records:** `listInvoices(filter)`. Returns an array, possibly with cursor metadata. Always paginated past a known small ceiling.
- **Reads — require/redirect on miss:** `requireInvoice(id)`, `requireUser()`, `requireOrgUser()`. Throws to the framework boundary (`notFound()`, `redirect()`).
- **Server Actions:** verb + noun. `createInvoice`, `archiveInvoice`, `acceptInvitation`. No `Action` suffix unless disambiguating from a same-named non-action.
- **Pure helpers in `/lib`:** verb-led, intent-named. `buildObjectKey`, `parseCursor`, `roleAtLeast`. Never `helper`, `util`, `do`.
- **Zod schemas:** `<verbEntity>Schema` for input shapes that mirror an action (`createInvoiceSchema`), `<entity>Schema` for canonical shapes (`invoiceSchema`).
- **Drizzle tables:** plural `camelCase` (`invoices`, `orgMembers`). SQL is `snake_case` via `casing: 'snake_case'`.
- **Drizzle relations:** singular for one-to-one, plural for one-to-many (`customer`, `lines`).
- **Hooks:** `use<Thing>` — the linted contract. Custom hooks return tuples when ordered, objects when named (`useToggle()` → `[on, toggle]`; `useForm()` → `{ register, handleSubmit, ... }`).
- **React components:** noun phrases (`FieldError`, `InvoiceTable`, `MobileNav`). Avoid `Container`, `Wrapper`, `Manager` — they describe implementation, not intent.
- **Files that export one thing:** filename matches the export, kebab-cased (`field-error.tsx` exports `FieldError`).

## File and folder layout

```
src/
  app/                          # Next App Router routes
    _components/                # non-route shared components, feature-scoped
    _lib/                       # non-route shared helpers, feature-scoped
    (marketing)/                # route groups never change the URL
    api/<...>/route.ts          # public route handlers
    layout.tsx, page.tsx, ...   # framework-named files (default-exported)
  components/                   # repo-wide shared components
    ui/                         # shadcn primitives (copied in, owned)
  lib/                          # pure helpers and side-effect adapters
    branded.ts                  # branded-ID factory
    result.ts                   # Result<T> type and ok/err helpers
    utils.ts                    # cn() and other tiny utilities
    auth.ts                     # Better Auth server instance (Unit 9+)
    auth-client.ts              # Better Auth browser client (Unit 9+)
    billing/                    # Stripe adapter (Unit 12+)
    email.ts                    # Resend wrapper (Unit 8+)
    r2.ts                       # R2 client (Unit 13+)
    rate-limit.ts               # Upstash limiters (Unit 15+)
    temporal.ts                 # Temporal codecs (Unit 18+)
    tags.ts                     # cache tag helpers (Unit 15+)
  db/
    schema.ts                   # source of truth — all tables
    relations.ts                # defineRelations graph
    index.ts                    # the `db` client (pooled + unpooled)
    queries/                    # tenant-scoped read helpers
  emails/                       # React Email templates (Unit 8+)
  proxy.ts                      # request gate — renamed from middleware.ts
  env.ts                        # @t3-oss/env-nextjs + Zod
```

- One concept per file. A file named `field-error.tsx` exports `FieldError`, not three loosely related components.
- `lib/` is **mostly** pure utilities. The carve-out is SDK adapters that need centralization (`lib/billing/`, `lib/email.ts`, `lib/r2.ts`, `lib/auth.ts`). Every such file begins with `import 'server-only';`. No React imports in `lib/`.
- `db/` holds schema, relations, the client, and tenant-scoped read helpers. No business logic.
- Co-locate route-scoped UI and helpers under `_components/` and `_lib/` inside the route folder. Only promote to `/components/` or `/lib/` once a second route imports it.
- **No barrel files** in `lib/`, `db/`, `app/_lib/`. Import the file you need. Why: barrel re-exports defeat tree-shaking and Server Component / Client Component splits.

## Module boundaries

The server / client / edge cut is structural. Make it explicit.

- **Server Components are the default.** No directive needed. Async function bodies allowed. Direct DB and filesystem access allowed.
- `'use client';` at the **top** of a file when that file uses React state, effects, browser APIs, or DOM event handlers that aren't Server Action props. Keep the boundary at the smallest interactive leaf.
- `'use server';` at the **top** of a file whose exports are Server Actions. The whole file becomes Server-Action-only. Inline `'use server';` inside a function body when the action is a one-off scoped to a Server Component.
- `import 'server-only';` at the top of any module that must never ship to the client — DB client, SDK with a secret key, files that read env vars marked server-only. Turns a leaked import into a build error.
- `import 'client-only';` at the top of any module that touches browser-only APIs (`window`, `document`, `localStorage`) and shouldn't be reachable from a Server Component.
- Client Components must not be `async`. They take Promises as props and read them with `use()`, or they `useActionState` over a Server Action.
- The RSC wire accepts structured-cloneable values (`Date`, `Map`, `Set`, typed arrays, BigInt) plus React extensions (Promises, JSX, Server/Client/Action references). It **rejects** functions, class instances, and any object with a custom prototype. `Temporal.*` values fall into the rejected bucket — encode them as ISO strings (or epoch numbers for `Instant`) at the boundary. Don't assume a future React release will add Temporal serialization.
- Never put secrets in props. Anything reachable from a Client Component is reachable from the browser.

## Imports

Three groups, separated by one blank line each:

```ts
import { z } from 'zod';                  // 1. external packages
import { headers } from 'next/headers';   // (next/* counts as external)

import { db } from '@/db';                // 2. @/ aliases
import { ok, err } from '@/lib/result';

import { FieldError } from './field-error'; // 3. relative imports (same folder only)
```

- Within each group, alphabetical.
- `import type { ... }` on its own line when the import is purely types and the runtime value isn't needed. Mixed `import { type Foo, bar }` form is allowed when both surfaces are needed.
- No deep relative imports (`../../../lib/...`). Use `@/`.
- Same-folder relatives are fine and preferred for tightly co-located files.
- No barrel re-exports (`export * from './foo'`). Re-export an explicit name when you must, with a comment naming why.
- Side-effecting imports (`import 'server-only'`, `import './globals.css'`) appear first, before group 1.

## Components and JSX

- Typed props as the function parameter. No `any`, no implicit `unknown`. Use `ComponentProps<'button'>` to extend HTML element props.
- React 19: refs are a regular prop typed `Ref<T>`. No `forwardRef`.
- `children: ReactNode`. Not `JSX.Element`, not `ReactElement` (those rule out strings, numbers, fragments).
- Default-destructure props at the parameter site: `({ size = 'md', className, ...rest }: ButtonProps)`.
- Class composition through `cn()` with `className` **last** so caller overrides win.
- Polymorphism through shadcn's `asChild` + `@radix-ui/react-slot`, paired with `class-variance-authority` (`cva`) for variants. Never invent a custom `as` prop. Carve-out: primitives that don't expose `asChild` (notably `Card` — its container is a plain `<div>`) can't be retargeted; inline the container's classes onto the chosen semantic element and nest the sub-parts inside, rather than double-wrapping.
- Lists need a stable `key` tied to data identity. Never the array index for reorderable lists.
- Conditional render with `condition && <Node />` is allowed only when `condition` is a proper boolean. Use `Boolean(value) && <Node />` or `value != null && <Node />` for nullable values. Never `0 && <Node />`.
- Server Components compose Client Components by importing them. Client Components compose Server Components only via `children` (or other ReactNode props).

## Hooks and the React Compiler

The React Compiler (enabled in `next.config.ts` via `reactCompiler: true`) auto-memoizes. Skip the manual reflex.

- No `useMemo` / `useCallback` / `React.memo` by default — the Compiler handles memoization. Reach for them only when (a) measurement shows the work is the bottleneck, (b) referential equality is required by a third-party hook, or (c) you need precise control the Compiler can't infer. When you add one, comment with the reason.
- `'use no memo'` is an escape hatch, not a discipline. Use it only for a known compiler bug and pair it with a TODO linking the issue.
- Hooks at the top level, in the same order every render. The two ESLint rules (`react-hooks/rules-of-hooks`, `react-hooks/exhaustive-deps`) are required and never disabled.
- `useState` for local UI state. Lift to a parent only when a sibling needs to read it. URL state lives in the URL via `nuqs`, not `useState`.
- `useReducer` when coordinated transitions multiply (3+ `useState` calls that update together).
- `useRef` is the non-rendering escape hatch — for DOM nodes and instance values that the JSX doesn't read.
- `useEffect` is for synchronization with external systems (subscriptions, timers, third-party widgets). Not for deriving state, not for handling events, not for fetching server data. Read "You probably don't need an effect" before reaching for one.
- `useEffectEvent` to read latest props/state from inside an effect without re-running.
- `useTransition` and `useDeferredValue` mark updates as non-urgent. They are priority markers, not speed boosts.
- `use(promise)` reads a server-streamed Promise inside a Client Component, wrapped in a Suspense boundary. The promise must be stable across renders.

## Client server state (TanStack Query)

Server Components and Server Actions own server state by default. Reach for TanStack Query only when one of the four triggers applies: polling, cross-view caching, optimistic with rollback into cached queries, infinite scroll with reuse. Otherwise, don't install it.

- **One Provider per app**, mounted in a `<Providers>` Client Component at the root layout (`app/_components/providers.tsx`).
- **Per-request `QueryClient`** via React `cache()`-wrapped `getQueryClient()`. The `typeof window === 'undefined'` branch returns the cached server instance; the browser branch returns the module singleton. Why: a shared server `QueryClient` leaks one request's data into another's render on multi-tenant deploys.
- **Query keys are typed and centralized** per feature in a `<feature>Keys` helper:
  ```ts
  export const commentKeys = {
    all: ['comments'] as const,
    lists: (invoiceId: string) => [...commentKeys.all, 'list', invoiceId] as const,
    detail: (id: string) => [...commentKeys.all, 'detail', id] as const,
  };
  ```
  Inline string-array keys at call sites are forbidden — they drift.
- **SSR-hydrated initial data.** `prefetchQuery` (or `prefetchInfiniteQuery`) in the Server Component, then wrap children in `<HydrationBoundary state={dehydrate(queryClient)}>`. The Client Component renders the hydrated first page with no loading state.
- **Senior defaults** set once on the `QueryClient`: `staleTime: 60_000`, `gcTime: 5 * 60_000`, `refetchOnWindowFocus: false`. Per-query overrides require a comment naming the reason.
- **The two-system invalidation discipline.** A Server Action that mutates an entity must invalidate **both** systems — `updateTag(...)` (or `revalidateTag(...)`) so Server Components re-render, **and** `queryClient.invalidateQueries({ queryKey: <feature>Keys.<scope>() })` on the client so TanStack reads refresh. Forgetting either side produces the canonical bug class: list paints fresh, detail stays stale.
- **Optimistic mutations** with `useMutation`: `onMutate` cancels in-flight queries, snapshots, and `setQueryData`s the optimistic shape; `onError` restores; `onSettled` invalidates. The optimistic value carries the same UUID hidden input the Server Action receives so the persisted row replaces the optimistic one by key.
- **Polling**: `refetchInterval` paired with `refetchIntervalInBackground: false`. `useInfiniteQuery` polling additionally requires a `maxPages` cap to bound memory.
- **Org switch**: `queryClient.clear()` on `activeOrganizationId` change. The cache cannot survive a tenant change.
- **DevTools** are dynamically imported behind `process.env.NODE_ENV !== 'production'` so they tree-shake from the prod bundle.
- **The dual fetcher split.** When the same data is read SSR (Server Component) and on the client (TanStack), the read function branches on `typeof window` — the server runs the Drizzle query in-process; the client `fetch`es the `authedRoute` handler. Both branches use the same Zod-validated response schema.

## Forms and Server Actions

The five-seam Server Action shape is universal:

```
parse → authorize → mutate → revalidate → return
```

- File-level `'use server';` at the top of `actions.ts`.
- `Object.fromEntries(formData)` then `safeParse` the action's Zod schema **first**, before any cookie read, DB call, or log. Return `Result.err({ code: 'validation', ... })` on parse failure.
- Authorize next. The `authedAction(role, schema, fn)` wrapper (Unit 10+) lifts session, role, schema parse, and tenant context out of every action body. The wrapper is the only Architectural-Principle-5 carve-out the project sanctions.
- Mutations run inside `db.transaction(async (tx) => …)` when more than one row changes. External calls (email send, Stripe, R2, queue trigger) live **outside** the transaction.
- `revalidatePath` / `updateTag` / `revalidateTag` after the database write and **before** the return — never inside a transaction.
- Return `Result<T>`. Throw only for impossible situations the framework boundary should catch (programmer error, never user input).
- Tenant filters belong in the database `where` clause via `tenantDb(orgId)` (Unit 10+). Never as a post-load check.
- Forms wire to actions through `<form action={serverAction}>`. Uncontrolled inputs only — `defaultValue`, not `value`. State and pending flow through `useActionState` at the form root. `useFormStatus` reads pending from a descendant (the canonical `<SubmitButton>`) — never re-read from the action state when `useFormStatus` will do.
- Optimistic UI through `useOptimistic` with a client-generated UUID hidden input that reconciles by key.
- Action functions should be `async` and return a Promise that resolves (or rejects). An unresolved Promise leaves the transition pending — that's the failure mode to watch for, not a synchronous return.

## Route handlers

Reach past Server Actions to `app/api/<...>/route.ts` only when:

1. A non-browser client calls the endpoint (webhook, mobile app, server-to-server).
2. The response must be cacheable HTTP.
3. The response is a stream (SSE, file download).
4. A third party requires a specific URL or status code.
5. The endpoint serves OG cards, sitemaps, or other framework-named files.

Otherwise, prefer Server Actions.

- One handler file per route. Export `GET`, `POST`, etc. as named exports.
- Parse `Params`, `Headers`, `Query`, `Body` in cheapest-first order with separate Zod schemas. The `authedRoute(role, schema, fn)` wrapper (Unit 10+) is the route-handler twin of `authedAction`.
- Errors return RFC 9457 Problem Details (`application/problem+json`). Status-code table is enforced: 400 (malformed), 401 (no identity), 403 (identity, no permission), 404 (record not found or cross-tenant), 409 (conflict), 422 (validation), 429 (rate limited), 5xx (server bug).
- Webhook handlers: verify signature on the raw body **before** parsing. Then claim the event in `processed_events` inside one transaction. The handler is the single writer for the entity it owns.
- Idempotency via the `Idempotency-Key` header on public mutating endpoints.

## Schemas with Zod 4

When a Zod schema defines an input shape, every consumer reads from it. Form `name` attributes match schema keys. Action bodies `safeParse` before doing anything. No parallel type definitions.

- Top-level format builders, never the deprecated `.string().x()` chains: `z.email()`, `z.uuid()`, `z.url()`, `z.iso.datetime()`, `z.ipv4()`. Why: v4 deprecated `z.string().email()` (and the other format chains) in favor of dedicated top-level builders that carry their own error messages and JSON Schema shape. The deprecated chains still parse with a warning; new code uses the top-level form.
- `z.object` is the default. `z.strictObject` when extra keys are a bug. `z.looseObject` only when you actively want extras forwarded.
- `z.discriminatedUnion` for tagged variants. `z.union` only for shapeless alternatives.
- `safeParse` everywhere user input arrives. `parse` only for trusted server-internal calls.
- Form errors: `z.treeifyError(result.error)` returns a form-shaped tree (read a field at `tree.properties?.<field>?.errors`). `z.flattenError(result.error)` returns a flat `{ formErrors, fieldErrors }` shape where `fieldErrors` is `Record<string, string[]>` (read a field at `fieldErrors?.<field>?.[0]`). Pick the projection that matches your `Result` contract: the course's `Result.error.fieldErrors` is the flat `Record<string, string[]>`, so the course uses `z.flattenError(result.error).fieldErrors` and forms read `state.error.fieldErrors?.<field>?.[0]`. Reach for `treeifyError` only when a form is genuinely nested and the contract is shaped to match.
- `FormData` boundary: `z.coerce.number()`, `z.coerce.date()`, `z.preprocess` for the HTML checkbox `"on"` shape. Empty-string inputs need explicit handling — `z.literal('').transform(() => undefined)`. **Avoid `z.coerce.boolean()` for form data** — it uses JavaScript `Boolean()` rules, so the string `"false"` coerces to `true`. Use `z.preprocess(v => v === 'on' || v === true, z.boolean())` for HTML checkboxes, and explicit string-equality preprocessing for any other boolean form input.
- Derive variants from one source: `.extend`, `.pick`, `.omit`, `.partial`. Never copy a schema and edit.
- `z.infer<typeof s>` for the parsed output type. `z.input<typeof s>` when transforms make input ≠ output.
- One schema per intent. The `createInvoiceSchema` and `updateInvoiceSchema` are derived from a base, not hand-written twice.
- `createSelectSchema`, `createInsertSchema`, and `createUpdateSchema` from `drizzle-zod` are the canonical way to derive validators from a Drizzle table. Per-column override map adds refinements (`email`, `url`, length caps) on top of the inferred shape. Hand-writing a parallel Zod schema for a table is a smell. (Drizzle 1.0 moves these into the `drizzle-orm/zod` subpath and drops the separate `drizzle-zod` install.)
- `.describe()` strings on tool input schemas (Unit 23+) — the LLM reads them.

## Data layer (Drizzle)

`db/schema.ts` is the source of truth (Architectural Principle #2). Row types, insert types, Zod validators, form `name` attributes, and RLS column names all derive from it.

- Snake-case mapping is set **on the client**, not in every table. `drizzle({ client, casing: 'snake_case', schema })` — TS code reads `createdAt` and SQL is `created_at` from one declaration. Explicit snake-case column names (`uuid('organization_id')`) are the per-column escape hatch. (When the project moves to Drizzle 1.0 the runtime option is removed; this flips to `pgTableCreator((name) => toSnakeCase(name), 'snake_case')`. The second argument is mandatory for column casing — the first only transforms table names.)
- Row types come from `typeof <table>.$inferSelect`. Insert types from `$inferInsert`. Never hand-write a row interface.
- Primary keys: UUIDv7 for user-facing entities (`id: uuid('id').primaryKey().$defaultFn(() => uuidv7())`). The course standardizes on v7 for index-locality on time-ordered inserts — teams without that pressure may prefer Postgres-native `gen_random_uuid()` (v4). `bigint generatedAlwaysAsIdentity` for high-volume internals. Natural keys only for immutable external identifiers.
- Foreign keys: explicit `onDelete`. `cascade` for owned children (invoice lines under an invoice), `restrict` for cross-aggregate references that must block deletion, `set null` for optional pointers, `set default` rarely.
- Tenant filters live in the `where` clause via the `tenantDb(orgId)` factory (Unit 10+). Bare `db.select(...).from(invoices)` is forbidden once `tenantDb` exists; the linter pattern is the unqualified `db.<table>` import.
- Unique constraints carry tenancy: `unique on (org_id, slug)`, not just `slug`. Use partial uniques for soft-delete lifecycle (`where deleted_at is null`).
- Relations declared in `db/relations.ts` via the per-table `relations(<table>, ({ many, one }) => ({ ... }))` helper (Relations v1). `db.query.<table>.findMany({ with: { ... } })` is the N+1-safe traversal. (Drizzle 1.0 replaces this with the single-call `defineRelations(schema, (r) => ({ ... }))` shape.)
- Transactions: `db.transaction(async (tx) => …)`. Thread `tx` through any helper called inside the block. Never `await` an external service (email, Stripe, R2) inside a transaction — pool starvation.
- No raw SQL except for fixed-string identifier interpolation via `sql.raw`. The `sql\`\`` tagged template (with implicit parameterization) for query fragments.
- Migrations: `drizzle-kit generate` → review → `migrate`. Never `push` in production. Expand-migrate-contract for any breaking change (Unit 21+).
- **Migration file naming.** Drizzle 0.45 + drizzle-kit 0.31 generate `drizzle/<timestamp>_<name>.sql` plus `drizzle/meta/_journal.json` and `drizzle/meta/<id>_snapshot.json` — flat layout with a top-level `meta/` directory. Pass `--name <verb>_<noun>` to `drizzle-kit generate` so the migration name is intentional from the start, never random. Never touch the timestamp prefix; it's the journal key. Review every generated `migration.sql`; never let an unread file ship. (Drizzle 1.0 switches to per-migration directories: `drizzle/<timestamp>_<name>/{migration.sql, snapshot.json}`, no top-level `meta/`.)
- **Index naming.** Always pass an explicit `name` to `index()` and `uniqueIndex()`. Convention: `idx_<table>_<col1>[_<col2>...]` for B-tree, `idx_<table>_<col>_gin` for GIN, `idx_<table>_<col>_partial` for partial. Uniques: `<table>_<col>[_<col2>]_unique`. Why: Drizzle's auto-generated names rotate on schema reorderings and make diffs noisy.
- **Composite indexes for tenant-scoped lookups** lead with the tenant column: `index('idx_invoices_org_status').on(t.orgId, t.status, t.createdAt.desc())`. The leading column is always `orgId` for any table in the tenant-data tier.
- **`db/queries/`** is the home for tenant-scoped read helpers. One file per entity (`db/queries/invoices.ts`, `db/queries/customers.ts`). Each file exports verb-led functions (`listInvoices`, `getInvoice`, `requireInvoice`) that close over `tenantDb(orgId)` or take `tx` as the first argument. No business logic — these compose into actions and route handlers.
- **The `db` client** is exported once from `db/index.ts`. Two named exports: `db` (pooled, the default) and `dbUnpooled` (for migrations and long-running transactions that need a stable connection).
- RLS reserved for `audit_logs` and other append-only-or-quarantined tiers (Unit 10+). Application-layer scoping via `tenantDb` is the default for everything else.

## Authentication (Better Auth)

The `auth` instance is the single seam for every authentication and session decision. Imported by exactly the files the rules below name; no parallel `getSession` calls anywhere.

- **File shape:**
  - `lib/auth.ts` — server `auth` instance. Starts with `import 'server-only';`. Composes the Drizzle adapter, `nextCookies()`, the organization plugin (Unit 10+), and any other plugins. Also exports `SESSION_COOKIE_PREFIX` (`SCREAMING_SNAKE_CASE`) so the proxy and any other cookie reader can match the configured `advanced.cookiePrefix` without restating the literal.
  - `lib/auth-client.ts` — browser `authClient` with the matching plugin set. No Node-only code.
  - `app/api/auth/[...all]/route.ts` — catch-all mount. Two-line body, the canonical Better Auth shape.
- **The session-read ladder.** Three helpers in `lib/auth.ts`, all React-`cache`d per request so `getSession` runs once:
  - `getCurrentUser()` — returns `User | null`. The reflex for surfaces that render differently when signed in vs out.
  - `requireUser(next?)` — returns `User` or `redirect('/sign-in?next=...')`. The reflex for protected pages and actions.
  - `requireOrgUser(role?)` — returns `{ user, orgId, role }` or `redirect('/sign-in')` / `notFound()`. The reflex for everything under the authenticated app.
- All three resolve through `auth.api.getSession({ headers: await headers() })` exactly once. Never call `getSession` directly from a page, layout, action, or route handler.
- **Cookie hardening (project overrides Better Auth defaults).** Better Auth ships with `cookiePrefix: 'better-auth.'`, `expiresIn` 7 days, and `freshAge` 1 day. The course tightens to `__Host-` prefix (no `Domain` attribute; `Path=/` required), `expiresIn` 30 days, `updateAge` 1 day, and `freshAge` 10 minutes — the last so high-stakes mutations re-prompt frequently. Cookie flags remain `HttpOnly; Secure; SameSite=Lax`. Preview and dev may relax `Secure`; production never does.
- **Cookie-cache staleness window.** Better Auth caches the decoded session for a short window (default 5 minutes) to avoid a DB hit per request. After `revokeSession` or a role change, `proxy.ts` may read a stale session for up to that window. Two consequences:
  - **Authorization decisions live at the action boundary**, re-checked against the DB. Never the proxy. The proxy only does cookie-presence gating.
  - **Credential-mutating actions** (`changePassword`, `changeEmail`, role demote) pass `revokeOtherSessions: true` and force a fresh sign-in on the affected user.
- **`freshAge` elevation.** For high-stakes mutations — change password, enable 2FA, delete account, transfer ownership — the action checks `session.freshAge` and returns `Result.err({ code: 'requires-re-authentication' })` when the session is too old. The UI re-prompts for the password, refreshes the session, and re-fires the action.
- **Enumeration discipline.** Sign-up and sign-in errors are opaque by default. Same `Result.err({ code: 'invalid-credentials' })` for "user doesn't exist" and "password wrong." Holds across every entry point (password, magic link, password reset, OAuth callback).
- **Sign-in / sign-up Server Actions** wrap `auth.api.signInEmail` / `signUpEmail` and translate their thrown errors into `Result` codes (`invalid-credentials`, `email-not-verified`, `too-many-attempts`, `requires-second-factor`). Never expose Better Auth error messages directly to the UI.
- **The proxy gate** is cookie-presence only via `getSessionCookie(req, { cookiePrefix: SESSION_COOKIE_PREFIX })`. `getSessionCookie` defaults to `'better-auth.'` and silently misses any cookie set under a different prefix — pass the exported constant from `lib/auth.ts` so the two never drift. Real session validation is the layout's `requireUser()` call. The proxy's job is to bounce signed-out users to `/sign-in` cheaply, not to authorize.

## Caching and invalidation

Next.js 16 with `cacheComponents: true`. Dynamic by default; cache by opt-in.

- `'use cache'` directive on the function or component that should be cached. Pair with `cacheLife(<preset>)` and one or more `cacheTag(...)` calls.
- `cacheLife` presets: `'seconds'`, `'minutes'`, `'hours'`, `'days'`, `'weeks'`, `'max'`. Custom `{ stale, revalidate, expire }` profiles only when no preset fits.
- Tags use the `tags.ts` helpers, never inline strings. Four scopes — entity, record, org, user — funneled through one helper file so read-side and write-side strings always align:
  ```ts
  invoiceTags.list(orgId)         // entity
  invoiceTags.record(orgId, id)   // record
  orgTags.all(orgId)              // org
  userTags.all(userId)            // user
  ```
- Invalidation decision tree, picked by user expectation:
  - **Read-your-writes from a Server Action:** `updateTag(...)`. Synchronous within the request.
  - **Eventual from a webhook or background job:** `revalidateTag(tag, profile)`. The `cacheLife` profile is now required as the second argument; the single-argument form is deprecated and is a TypeScript error.
  - **Path-scoped, no tag scheme:** `revalidatePath(path)`.
  - **Client-only refresh after navigation:** `router.refresh()`.
- React `cache()` for request-scoped memoization of work that depends on request data (e.g., `getCurrentUser()`). `'use cache'` for cross-request persistence. They are different tools.
- Async request APIs are Promises in Next.js 16: `await params`, `await searchParams`, `await cookies()`, `await headers()`. Client Components use `React.use()` on them. `connection()` is the explicit dynamic opt-in.
- Cached functions: outer-scope variables are automatically captured and folded into the cache key, so both arguments and captured values must be serializable. Never capture request-scoped data (it would be baked into a shared cross-request entry) — pass it as an argument or, for request-scoped work, reach for React `cache()` instead.

## Error handling

Two channels: return the expected, throw the unexpected.

- For functions that fail in expected ways (validation, conflict, not-found, unauthorized, rate-limited), return a `Result<T>` discriminated union:
  ```ts
  export type Result<T> =
    | { ok: true; data: T }
    | {
        ok: false;
        error: {
          code:
            | 'validation'
            | 'conflict'
            | 'not_found'
            | 'unauthorized'
            | 'forbidden'
            | 'rate_limited'
            | 'internal';
          userMessage: string;
          fieldErrors?: Record<string, string[]>;
        };
      };
  ```
  The type and the `ok(data)` / `err(code, userMessage, fieldErrors?)` helpers live at `lib/result.ts`.
- Throw only for impossible situations — programmer errors, code paths that should never execute. Never throw on user-input failure. Framework boundaries (`error.tsx`, `global-error.tsx`, route handler catch) handle thrown errors.
- Every gate that controls access (authorization, tenancy, paywall, signature verify) treats an **exception inside the check as a refusal**. Wrap the check in `try`/`catch` that defaults to deny.
- Custom error classes for domain failures live next to where they're thrown. Literal-typed `name` discriminants. `Error.cause` for wrap-and-rethrow.
- User-facing messages and operator-facing records diverge at the wrapper, never at the UI. The user sees `userMessage`; the operator sees the full chain in logs.
- Narrow `unknown` in `catch` with `instanceof Error` and an `ensureError(e)` normalizer in `lib/errors.ts`. Never `catch (e: any)`.

## Async, cancellation, and time

- `async`/`await` uniformly. `.then` chains only when teaching Promise mechanics directly (lesson code, not project code).
- `Promise.all` for independent parallel awaits. Serial awaits only when a dependency requires the previous result. Run the dependency-check reflex before adding a second `await`.
- `Promise.allSettled` when one failure should not cancel the rest.
- Bounded concurrency for `map`-style fan-out: `Promise.all` is fine up to a known small N; past that, a bounded helper (`pMap`) or a database batch.
- Cancellation: every async function that does IO takes `{ signal }: { signal?: AbortSignal }` in its options when cancellation is reachable. `AbortSignal.timeout(ms)` for deadlines. `AbortSignal.any([...])` to compose signals.
- `return await` inside `try` blocks — preserves the stack trace through `catch`.

### Time

- **`Temporal` is the default.** `Date` is forbidden in domain code; it lives only at third-party seams via the codec in `lib/temporal.ts`.
- `Temporal.Instant` for a moment in time (UTC, no zone).
- `Temporal.ZonedDateTime` when zone matters — wall-clock display, DST-aware arithmetic, recurring schedules.
- `Temporal.PlainDate` for calendar days (`dueDate`, `birthDate`). Never model a calendar day as midnight-UTC `Date`.
- `Temporal.Duration` for spans. Never raw milliseconds in domain types.
- Postgres storage: `timestamptz` for instants, `date` for calendar days. The codec in `lib/temporal.ts` is the only place `Date` ↔ `Temporal` conversion happens.
- Wire format: ISO 8601 strings. Parse to Temporal at the boundary.
- Polyfill via `temporal-polyfill` on Node 24 LTS (the course's pinned runtime). Native Temporal shipped unflagged in Node 26.0.0 (May 2026); Node 26 enters LTS October 2026. The polyfill swap is a one-line `import` change once the course's pinned Node version moves.

## Background work (Trigger.dev)

For work that doesn't fit inline `await` or `after()`. The named thresholds are in `Pedagogical guidelines.md` Unit 13; the conventions here are how it ships in code.

- **One file per task** in `trigger/<task-name>.ts`. The task is the file's named export.
- **`schemaTask` over `task`** for any task with a payload. The Zod schema is the input contract — typed, validated at trigger time, visible in the dashboard.
- Payload schemas live next to the task. If callers consume them too, hoist to `lib/triggers/<task-name>.schema.ts`.
- **Queues declared at module scope.** Static (`queue({ name: 'exports' })`) for shared workloads; dynamic per-tenant (`queue({ name: \`org:${orgId}:exports\` })`) for any workload that must serialize per tenant. Trigger.dev v4 enforces this — dynamic queue declarations inside a task body are rejected. Parameterize the queue name at the call site, not the declaration.
- **Idempotency keys are required** on every `tasks.trigger`, `triggerAndWait`, and `wait.forToken`. The naming convention:
  - **User-triggered daily jobs:** `` `${userId}:${taskId}:${ymd}` ``. Same user, same day → same key, idempotent.
  - **Child tasks under a parent:** `` `${ctx.run.id}:${step}:${n}` ``. The parent run ID is the namespace.
  - **Webhook fan-outs:** `` `webhook:${event.id}:${step}` ``. The claimed event ID is the namespace.
- **`triggerAndWait`** for sequential dependency (parent needs child's result). **`trigger`** for fire-and-forget. **`batchTriggerAndWait`** for parallel children with one wait.
- **External IO inside tasks**, never inside Server Actions when the work is past ~5 seconds, multi-step, or must retry. The "no external calls inside `db.transaction`" rule holds inside a task — break the task into steps if you need both DB writes and external calls.
- `wait.for` and `wait.until` for durable pauses. `wait.forToken` with `publicAccessToken` for third-party callbacks and human-in-the-loop approvals. Mandatory `timeout` on every wait — an indefinite wait is a leak.
- `AbortTaskRunError` for definitive failures that should not retry. Regular `throw` retries with exponential backoff and jitter.
- **Tasks inherit no auth context.** Pass `{ userId, orgId }` in the payload and resolve helpers from that. `requireOrgUser()` does not exist inside a task — DB scoping uses `tenantDb(orgId)` directly.
- **`metadata.set(...)`** for live progress visible from the dashboard and the in-app inspector. Update after each meaningful step, not every iteration.

## Styling — Tailwind v4

CSS-first configuration. No `tailwind.config.ts`.

- All theme tokens live in `app/globals.css` under `@theme { ... }`. Colors in OKLCH. Spacing scale tied to `--spacing`.
- The v4 directives: `@import "tailwindcss"`, `@theme`, `@utility`, `@custom-variant`, `@source`, `@plugin`. No legacy JS config.
- Three-tier token model: primitive (`--color-blue-500`), semantic (`--color-primary`), component-rare. Components reach for **semantic** tokens. Direct primitive use is a smell.
- `cn()` from `lib/utils.ts` — `twMerge(clsx(inputs))`. Used everywhere class composition is conditional. `className` is **always** the last argument so caller overrides win.
- Variants over inline conditionals: `data-*`, `aria-*`, `group-*`, `peer-*`, `has-*`, `*:`, `not-*`. State-driven styling reads DOM state, not React state.
- Dark mode via `@custom-variant dark` and `.dark` token overrides. `next-themes` for the toggle. `suppressHydrationWarning` on `<html>` only.
- Container queries (`@container`, `@sm:`, `@md:`) over viewport breakpoints for component-level layout.
- `gap` for spacing in flex and grid containers. Sibling margins are forbidden.
- Logical properties (`ps-*`, `pe-*`, `inset-s-*`) over physical (`pl-*`, `pr-*`) so RTL works for free.
- `motion-reduce:` variant on every animation that's visible enough to notice. No exceptions.

## shadcn primitives

- Installed into `components/ui/` via `pnpm dlx shadcn@latest add <primitive>`. Source files are committed; never re-installed by upgrade.
- Used **as imported** for primitive composition. Don't fork a primitive to customize visual specifics — wrap and compose at the app level (`components/<feature>-button.tsx` wrapping `<Button>`).
- The fork threshold: you may edit the primitive when the abstraction itself is wrong (e.g., the primitive's API doesn't admit a third state your product needs). Comment the edit with the senior call.
- `cn()` lives at `lib/utils.ts` (shadcn convention). Required for the primitives to compose correctly.
- shadcn primitives inherit accessibility behavior from Radix / Base UI. Don't undo it — keep `aria-*` attributes, focus traps, and roving tabindex where the primitive set them.

## Accessibility

WCAG 2.2 AA is the floor. Every project, every screen.

- Semantic HTML first. `<button>` for actions, `<a>` for navigation, `<form>` for submissions, `<fieldset>`/`<legend>` for grouped controls. ARIA is the fallback when semantics aren't enough.
- `aria-describedby` and `aria-invalid` wired on every form field that has a possible error. `useId()` for the stable cross-SSR IDs.
- `aria-label` on icon-only buttons. The visible text wins when present.
- Focus management:
  - Visible focus on every interactive element (Tailwind `focus-visible:*` utilities).
  - Skip link on every layout.
  - Modal focus traps live in Radix — keep them.
  - Route-change focus is **not** automatic in Next.js. Move focus to the new page's `<h1>` on client-side navigation.
  - Post-submission focus on the first error or the success affordance.
- Touch targets: 24×24 px minimum (WCAG 2.2 SC 2.5.8). 44×44 for primary actions.
- Color contrast: 4.5:1 for text, 3:1 for UI controls and large text. Test with axe DevTools before shipping.
- `prefers-reduced-motion`: `motion-reduce:` variant required on every transition and animation visible above the fold.
- Loading / empty / error / populated as the four states for every list and detail surface. `<Skeleton>` over spinners; `<Empty>` with a CTA; `<Alert>` with retry; the populated case as default.
- `role="status"` for non-urgent live updates, `role="alert"` for urgent ones. Live regions mounted before content fills them.

## Internationalization (next-intl)

- **Translation keys in code, never user text.** Every visible string flows through `useTranslations()` / `getTranslations()`. The reviewer reflex: any string literal in JSX that isn't a key is a finding.
- **Dot-namespaced keys**: `invoices.list.title`, `errors.unauthorized`, `forms.invoice.submit`. The namespace mirrors the feature folder.
- **One string per key.** Reuse keys when the message is the same; never split `errors.unauthorized.invoice` and `errors.unauthorized.customer` for the same English text.
- **No concatenation, ever.** `t('hello') + ' ' + name` is forbidden — it breaks word order, plurals, and gendered grammar. Use named placeholders: `t('greeting', { name })`.
- **ICU MessageFormat for plurals**: `{count, plural, one {1 item} other {# items}}`. CLDR categories per locale, not English's two-form assumption.
- **`t.rich` for embedded markup**: `t.rich('terms', { link: chunks => <a href="/terms">{chunks}</a> })`. The translator inserts the markup; the developer provides the components. Never `dangerouslySetInnerHTML` for translations.
- **Catalogs**: `messages/<locale>.json` per locale. English is the source of truth; other locales fill in. One file per locale, no per-feature splits.
- **Formatters** (`useFormatter()` / `getFormatter()`) for every date, number, list, and relative time. Currency comes from data (`invoice.currency`); timezone comes from `users.timeZone` on the session; locale comes from the resolved request locale. Never inline-call `Intl.*` inside a component — go through next-intl so locale and timezone resolution stays consistent.
- **Locale resolution chain**: URL prefix > `users.locale` > cookie > `Accept-Language` best-match > default. Wired in `proxy.ts` via `createMiddleware(routing)`.
- **next-intl file shape:**
  - `i18n/routing.ts` — `defineRouting` with the locale list and default.
  - `i18n/navigation.ts` — typed navigation primitives (`Link`, `useRouter`, `redirect`, `usePathname`).
  - `i18n/request.ts` — `getRequestConfig` resolves messages, timezone, and `now`.
  - `i18n/formats.ts` — shared formatter presets (introduced in the project chapter, not the teaching lessons).
  - `proxy.ts` — `createMiddleware(routing)` runs before the auth gate. Next.js 16 dispatches on either a default export or a named `proxy` export. The standalone form is `export default createMiddleware(routing)`; use the named `proxy` function only when composing the middleware with auth.
  - `app/[locale]/layout.tsx` — calls `setRequestLocale(locale)` first thing.
- **`setRequestLocale(locale)`** at the top of every `page.tsx` and every `layout.tsx` under `app/[locale]/`. Skipping it in a page or layout forces dynamic rendering and breaks static prerendering. The rule applies to nested pages, not only the root layout.
- **Type-safe keys.** Augment next-intl's `AppConfig` interface (`declare module 'next-intl' { interface AppConfig { Messages: ...; Formats: ...; Locale: ... } }`) so missing or misspelled keys are a build error. All three keys are optional — register `Messages` (typed from `messages/en.json`) and `Locale` at minimum; add `Formats` when shared format presets exist.
- **SEO surface**: `alternates.languages` in metadata with one entry per locale, self-reference, and `x-default`. Per-locale canonical URLs. Per-locale entries in `sitemap.ts`. OG cards with `og:locale` and a per-locale `opengraph-image.tsx`.

## Logging

- `pino` as the logger. Fixed JSON key set, no free-form string concatenation in messages.
- `requestId` threaded through every server-side seam via AsyncLocalStorage (`lib/logger.ts`). Every log line carries it.
- Structural redaction config drops `password`, `token`, `authorization`, `cookie`, `set-cookie`, and any field in `PII_KEYS` before serialization. Redaction lives in the logger config, not at call sites.
- One child logger per seam (`logger.child({ seam: 'webhook.stripe' })`). The seam name matches the file.
- Log levels: `error` (incident reconstruction), `warn` (recoverable abnormality), `info` (significant state changes), `debug` (development only). No `info` for routine reads.
- The "3am rule": log what you'd need at 3am to reconstruct what happened. Operator audience, not user audience.
- Audit log writes (Unit 10+) go through `logAudit(tx, event)` — they are not pino logs. Different table, different audience.

## Testing

Vitest as the runner. Multiple projects keep node and jsdom separated.

- `vitest.config.ts` with `globals: false` and `vite-tsconfig-paths`. Three projects: `unit` (node), `integration` (node, real DB), `component` (jsdom).
- File colocation: `name.ts` next to `name.test.ts`. Integration tests live in `tests/integration/` because they cross modules.
- AAA shape (Arrange, Act, Assert) per test. Each `it('<outcome> when <conditions>')` asserts one behavior.
- Factories over fixtures: `buildInvoice({ status: 'paid' })` returns a fresh row with valid defaults. Factories live next to the schema they build (`db/schema.ts` → `db/factories.ts`).
- Pin time, IDs, and randomness behind seams: `lib/clock.ts`, `lib/ids.ts`, `lib/random.ts`. Tests swap the seam; production uses the real impl.
- Type-level tests with `expectTypeOf` in `*.test-d.ts` files, run by `vitest --typecheck`. Pin discriminated unions, branded IDs, and `Result` contracts.
- Async assertions: `await expect(p).resolves.toEqual(...)` is the canonical form. Never assert on a non-awaited promise.
- Integration tests run against a real Postgres (Docker for local, Neon branch for CI). One database per worker, keyed by `VITEST_POOL_ID`. The `withRollback(tx)` wrapper rolls back every test's writes.
- Mock the **wire**, not the SDK. MSW (`setupServer` + `http.*`) for outbound HTTP. Mocking Drizzle, Stripe SDK, or Resend SDK is forbidden.
- Component tests only when (a) shared library, (b) complex state, or (c) critical UX. Otherwise let the seam test cover it.
- E2E (Playwright) reserved for **money paths** — sign-in, Checkout, invitation accept, primary value loop. Zero or four E2Es by year one; nothing in between.
- Flake has a structural cause. `--retry` is forbidden. `--shuffle` and `--repeat` to locate; fix the structure.

## Security baseline

- Env vars validated at build time through `@t3-oss/env-nextjs` + Zod in `env.ts`. Missing `DATABASE_URL` fails `pnpm build`. The `server` / `client` split is enforced — only `NEXT_PUBLIC_*` may be read in client modules.
- Secrets never in code, never client-bundled. Vercel's "sensitive" flag on production secrets. Three environments, three sets, no sharing.
- `__Host-` cookie prefix with `HttpOnly; Secure; SameSite=Lax; Path=/` defaults. Sessions never readable from JS.
- Security headers split between `next.config.ts` (HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, frame-ancestors) and `proxy.ts` (per-request nonce-based CSP with `'strict-dynamic'`). Six headers minimum.
- Rate limits via `safeLimit(...)` wrapper around `@upstash/ratelimit`. Module-scope declaration in `lib/rate-limit.ts`. Fail-open on Redis-auth errors with a logged warning; fail-closed only on actual quota exhaustion. Dual-key (per-IP and per-email) on auth endpoints.
- Audit log appends only via `logAudit(tx, event)` (Unit 10+). The signature forces a transaction. RLS denies `UPDATE` and `DELETE` on `audit_logs` at the database level — defense in depth.
- Webhook verification on the raw body **before** any parse. HMAC compare in constant time. Replay defense via `processed_events(provider, event_id)` ledger.
- Open-redirect closure on every `?next=` parameter. Use the `safeNext(url)` helper in `lib/redirects.ts`; never `redirect(searchParams.get('next'))`.
- Sanitize any `dangerouslySetInnerHTML` input through `DOMPurify`. The default is to refuse the input.
- Consent gate before any non-essential analytics or marketing fires. The `useConsent()` provider is the single source.

## Supply chain and tooling

- **Package manager:** pnpm 11+ via mise. `packageManager` field in `package.json` pins the exact version. `only-allow pnpm` in `preinstall` blocks `npm`/`yarn`.
- pnpm `.npmrc` defaults (committed):
  - `minimumReleaseAge=1440` — fresh package versions wait 24 hours before they resolve.
  - `blockExoticSubdeps=true` — sub-deps must come from the configured registries.
  - `onlyBuiltDependencies` allowlist — explicit list of packages allowed to run install scripts. On pnpm 11+, the newer `allowBuilds` matcher map is an acceptable alternative (finer-grained control over which packages may run lifecycle scripts). Pick one per repo; don't mix.
  - `auto-install-peers=true`.
- Lockfile (`pnpm-lock.yaml`) committed. CI runs `pnpm install --frozen-lockfile`.
- `pnpm audit --prod` as a CI signal job (non-blocking). Renovate or Socket for dependency PRs.
- **Runtime:** Node 24 LTS, pinned in `.mise.toml`. Three execution paths for `.ts` files — native (no flag; Node 24 strips types by default) as the default, `tsx` past the named triggers (path aliases, JSX, decorators, enums, namespaces — anything that needs transformation, not just stripping), `tsc` only for library publishing or `--noEmit` type-check. `--experimental-transform-types` is the in-between option if you want native Node to handle enums or namespaces.
- **Linter / formatter:** Biome 2.x for the formatter and general lint surface; the canonical `biome.json` lives in `configs/`. ESLint with `eslint-plugin-react-hooks@7.x` runs alongside, not optional: Biome 2.4 ports two of the seventeen hook rules (`useHookAtTopLevel` ≈ `rules-of-hooks`, `useExhaustiveDependencies` ≈ `exhaustive-deps`); the other fifteen are the React Compiler diagnostics (`set-state-in-effect`, `set-state-in-render`, `preserve-manual-memoization`, `purity`, `immutability`, `refs`, …) absorbed into `eslint-plugin-react-hooks` v6/v7, and the course enables `reactCompiler: true`. Revisit when Biome ports them. Beyond `eslint-plugin-react-hooks`, ESLint stays out unless a project needs a rule Biome hasn't ported — name the rule and the reason in `AGENTS.md` when you add it.
- **Editor:** VS Code is the committed editor. `.vscode/extensions.json`, `.vscode/settings.json`, `.editorconfig` are committed.
- TypeScript: one canonical `tsconfig.json` in `configs/`. Projects extend it.

## Comments and inline docs

Rare. Code names itself.

- **Allowed inline:**
  - `TODO(<lesson>) — <thing>` in starter stubs naming the lesson that builds it.
  - Runtime invariants the reader can't infer (`// must run before middleware redirects`).
  - Security or compliance notes (`// constant-time compare to prevent timing attack`).
  - The reason behind a non-obvious choice that survived a code review.
- **Forbidden inline:**
  - Narrating what the next line does.
  - Restating type signatures.
  - "Explaining" simple code.
- **TSDoc** on the exported public surface only. The first sentence is the IDE hover — make it accurate.
  ```ts
  /**
   * Returns the user if the session is valid; redirects to `/sign-in` otherwise.
   *
   * @param next - The path to return to after sign-in.
   */
  export async function requireUser(next?: string): Promise<User> { ... }
  ```
- TSDoc tag set: `@param`, `@returns`, `@throws`, `@deprecated`, `@see`, `@example`. Skip the rest.
- The schema file, `env.ts`, and Server Action signatures **are** the docs for what they describe. README links to them; never duplicates them.
- Starter-code stubs get a top-line TODO comment naming the lesson:
  ```ts
  // TODO(7.6.3) — implement createInvoice, updateInvoice, deleteInvoice
  ```

## Where to extend this doc

Add unit-specific sections only when the unit lands and the convention has been exercised on a real project. Keep each section short — this doc is a reference, not a tutorial. Once a section ships, refine it against what the project actually committed to, not what the TOC promised.

Open candidates, gated until the unit lands:

- **Drizzle 1.0 migration** — gated on Better Auth 1.8+ shipping with `drizzle-orm@^1.0` support ([better-auth#6766](https://github.com/better-auth/better-auth/issues/6766), [PR #9489](https://github.com/better-auth/better-auth/pull/9489)). When that lands, four § Data layer bullets flip back to their 1.0 form (runtime `casing` is removed → `pgTableCreator(_, 'snake_case')`; `relations()` → `defineRelations`; flat migration files → per-migration directories; `drizzle-zod` is uninstalled and helpers move to `drizzle-orm/zod`). The forward-looking parentheticals in those four bullets become the primary wording; the 0.45 wording moves into a legacy parenthetical.
- **Resend conventions** — once Unit 8 ships. Add: the `lib/email.ts` wrapper shape, the suppression-list read, the per-send `Idempotency-Key` convention, the transactional-vs-marketing subdomain rule.
- **Stripe / billing conventions** — once Unit 12 ships. Add: the three-method `lib/billing/` interface (`upgrade`, `openPortal`, `requirePlan`), the `plan_entitlements` projection shape, the webhook-is-the-only-writer rule.
- **R2 / object storage conventions** — once Chapter 072 ships. Add: the `lib/r2.ts` singleton shape, the `buildObjectKey` tenancy convention, the presigned PUT / HEAD / insert two-step write.
- **Notification dispatcher conventions** — once Unit 14 ships. Add: the `notifiable_events` registry, the dispatcher signature, the 60-second dedup window keying.
- **Upstash rate-limit conventions** — once Chapter 078 ships. Add: the `safeLimit` wrapper, the dual-key auth-endpoint pattern, the `RateLimit-*` header shape.
- **Sentry / Pino observability conventions** — once Unit 20 ships. Add: the `redact` seam reused in Pino and `beforeSend`, the `requestId` AsyncLocalStorage shape, the release-tag pipeline.
- **Vercel AI SDK conventions** — once Unit 23 ships. Add: the `lib/llm/models.ts` handle pattern, the tool `inputSchema` with closure-scoped tenancy, the quota-gate placement, the `onFinish` audit write.

Anything that lives in this doc must be **exercised on a real project**. Speculative conventions are a smell; add the rule the first time a lesson or project commits to it.
