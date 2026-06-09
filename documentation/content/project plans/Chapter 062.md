# Chapter 062 — Project plan: The production list view

## Project goals

The student turns a plain invoice list into the production list view every SaaS app grows into: filter, sort, search, and cursor pagination all carried in the URL via `nuqs`; soft-delete plus archive as two distinct lifecycle states with restore; and optimistic concurrency on update that turns a silent two-tab overwrite into an honest 409 with a refresh-and-retry conflict surface. Coding cements four durable skills: (1) promoting view-state out of component state and into the URL so a view is shareable and survives refresh; (2) composing a lifecycle-aware, tenant-scoped base-query helper so a read cannot forget the tenancy or the `deletedAt IS NULL` filter; (3) adding tenancy + lifecycle + `version` preconditions to every UPDATE and converting zero-rows-affected into a recoverable conflict; (4) wiring `useActionState` (and, as a layered note, `useOptimistic`) to drive one success/conflict shape. The student practices each by filling stubs against a brief and verifying behavior in a running `/invoices` surface plus an `/inspector` verification panel.

**Persistence substrate (architect's call — read this first).** The render pipeline boots `solution/` with `pnpm dev` only: no Docker, no Postgres, no auth session. The teaching surface of this chapter is overwhelmingly *visible* (chips, view tabs, lifecycle badges, pagination, conflict banner, optimistic disappearance), so every behavior must render deterministically in that boot. Following the chapter 035 precedent (the course's other UI-focused list project, which ships no database), this project backs invoices with a **deterministic in-memory module store** (`src/server/store.ts`), not Postgres/Drizzle/Better Auth. The taught *shapes* are preserved faithfully — `scopedInvoices(orgId).active()/.archived()/.includingDeleted()`, the `version`-precondition-and-honest-409 mutation, `authedAction(role, schema, fn)`, the `nuqs` URL-state layer, `useActionState`/`useOptimistic`, audit-log writes — but they execute against the store. SQL-only artifacts (real partial unique index, `EXPLAIN ANALYZE`, `db.transaction`, Drizzle `$dynamic()` builders) are represented in prose and a static explanatory panel, not live SQL. This diverges deliberately from the chapter outline's Postgres framing (a preliminary brainstorm); the concepts are all preserved and demonstrable in-browser, and the student finishes fast with zero bring-up.

## Student position

The student has completed Units 1–9 and the URL-state (Ch 060) and lifecycle/concurrency (Ch 061) teaching chapters. They know: TypeScript (generics, discriminated unions, narrowing, `satisfies`), React 19 (Server/Client Components, `useActionState`, `useOptimistic`, `useTransition`, `useDeferredValue`, refs-as-props — no `forwardRef`), Next.js 16 App Router (Server Component `async` `searchParams`/`params`, Suspense, `cacheComponents`), Tailwind v4 + shadcn/ui, Zod 4 (`z.strictObject`, `z.infer`, top-level format builders, `z.flattenError`), the canonical `Result<T>` shape with `ok`/`err`, Server Actions (five-seam `parse → authorize → mutate → revalidate → return`, uncontrolled inputs with `defaultValue`), `nuqs` (parsers, `createSearchParamsCache`, `useQueryState`/`useQueryStates`, `replace`+`scroll:false` defaults, `limitUrlUpdates: debounce(ms)`, `shallow:false` for RSC writes, cursor-reset invariant), soft-delete/archive/restore semantics, and version-based optimistic concurrency in concept.

**Not yet known — do not use these in the project:** Stripe/billing, webhooks, TanStack Query, Zustand, `cacheTag`/`updateTag`/`revalidateTag` tag-based invalidation (Unit 14 — use `revalidatePath` only), `next-intl`/`Intl` formatters/Temporal (Unit 17 — format dates with plain `toLocaleDateString` or pre-formatted strings; no timezone work), Vitest/Playwright/RTL beyond the lesson gate runner, Sentry/Pino/observability, rate limiting. Although the course teaches Drizzle/Postgres/Better Auth in earlier units, this project does **not** use them (see substrate note) — do not import `drizzle-orm`, `postgres`, `better-auth`, or `@t3-oss/env-nextjs`. The student has never seen this project use a real DB, so a real DB connection here would be an unfamiliar, unteachable surface.

## Scaffolding recipe

**Fresh scaffold**, modeled on chapter 035 (no DB, no auth, in-memory data). Do not fork a prior solution.

Run:
```
pnpm create next-app@16.2.7 solution --ts --app --no-src-dir --import-alias "@/*" --turbopack --use-pnpm --no-eslint --tailwind
```
Then restructure into `src/` (move `app/` → `src/app/`) and apply the patches below. (If `create-next-app` flags differ on the installed version, match the resulting layout: `src/app`, Tailwind v4, alias `@/*`, no ESLint.)

**Dependencies to add (pinned):**
- runtime: `nuqs@^2.8.9`, `class-variance-authority@^0.7.1`, `clsx@^2.1.1`, `tailwind-merge@^3.6.0`, `lucide-react@^1.17.0`, `tw-animate-css@^1.4.0`, `zod@^4.4.3`, `next-themes@^0.4.6`, `sonner@^2.0.7`, `radix-ui@^1.4.3`, `uuidv7@^1.0.2`
- dev: `@biomejs/biome@2.4.16`, `vitest@^4.1.8`, `vite-tsconfig-paths@^5.1.4`, `typescript@^6.0.3`, `@types/node@^25.9.1`, `@types/react@^19.2.16`, `@types/react-dom@^19.2.3`, `@tailwindcss/postcss@^4.3.0`, `tailwindcss@^4.3.0`, `babel-plugin-react-compiler@1.0.0`
- pin `react@19.2.4`, `react-dom@19.2.4`, `next@16.2.7`.

**shadcn primitives.** First init the project on the **Radix umbrella** with `pnpm dlx shadcn@latest init -y -d --base radix` (CLI v4, March 2026): the `--base radix` flag is load-bearing — the bare `-d` default is now `base-nova`, which installs Base UI (`@base-ui/react`) and clashes with the locked `radix-ui@^1.4.3`; `--base radix` yields `"style": "radix-nova"` + `iconLibrary: lucide` and keeps the `radix-ui` umbrella. Then add `button`, `badge`, `card`, `input`, `label`, `select`, `separator`, `skeleton`, `sonner`, `dropdown-menu`, `dialog` via `pnpm dlx shadcn@latest add … -y`. The CLI v4 prompts (template, preset) hang without flags, so always pass `-y -d` (init) / `-y` (add); after `init`, remove any stray `shadcn`/`msw` entry it adds to `package.json` deps (the registry side-effect — they are not project deps). Accept double-quote/`import * as React` formatting on first add; `pnpm check` normalizes. Do **not** install Radix `tabs` — the view tabs write the `view` URL param via a `nuqs` setter (URL is the source of truth), so they render as styled `<button>`s, not a Radix tablist that owns its own selected state.

**Config files (verbatim content):**
- `package.json` scripts: `"dev": "next dev"`, `"build": "next build"`, `"start": "next start"`, `"format": "biome format --write ."`, `"lint": "biome lint ."`, `"check": "biome check --write ."`, `"verify": "biome ci . && next typegen && tsc --noEmit && next build"`, `"test:lesson": "node scripts/test-lesson.mjs"`, `"preinstall": "npx only-allow pnpm"`. Add `"packageManager": "pnpm@11.3.0"`, `"engines": { "node": ">=24" }`, `"type": "module"`, `"private": true`.
- `next.config.ts`: `{ cacheComponents: true, typedRoutes: true, reactCompiler: true, turbopack: { root: __dirname }, devIndicators: false }`.
- `tsconfig.json`: `"jsx": "react-jsx"`, `"moduleResolution": "bundler"`, `"module": "esnext"`, `"target": "ES2022"`, `"strict": true`, `"noUncheckedIndexedAccess": true`, `"skipLibCheck": true`, `"incremental": true`, `"isolatedModules": true`, `"esModuleInterop": true`, `"resolveJsonModule": true`, `"verbatimModuleSyntax": true`, `"noEmit": true`, `"allowJs": false`, no `baseUrl`, `"paths": { "@/*": ["./src/*"] }`, `"include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts", ".next/dev/types/**/*.ts"]`. (Excluding `next-env.d.ts` from lint is Biome's `files.includes` job, below — not a tsconfig setting.)
- `biome.json`: `quoteStyle: 'single'`, `css.parser.tailwindDirectives: true`, `files.includes: ["**", "!next-env.d.ts", "!.next", "!node_modules"]` (no trailing `/**`), organizeImports on.
- `pnpm-workspace.yaml`: replace the stub `create-next-app` emits (`allowBuilds: { sharp: set this to true or false }` + `ignoredBuiltDependencies: [sharp, …]`) with exactly `allowBuilds:\n  sharp: true`. pnpm 11.3.0 removed `onlyBuiltDependencies`/`ignoredBuiltDependencies` entirely — `allowBuilds` is the only key it reads, and an unresolved stub value (or `sharp` left under `ignoredBuiltDependencies`) makes the cold `pnpm install` hard-fail `ERR_PNPM_IGNORED_BUILDS: sharp` (which `next build` re-surfaces, failing `pnpm verify`). Do **not** ship `onlyBuiltDependencies` — it is a dead key on this line.
- `scripts/test-lesson.mjs`: a node wrapper that reads the lesson number from `process.argv[2]` and runs exactly that one file via vitest, so `pnpm test:lesson 3` runs only `lesson-verification/Lesson 3.ts`. Body: resolve `const n = process.argv[2]`, spawn `vitest run --root . "lesson-verification/Lesson ${n}.ts"` (use `node:child_process` `spawnSync` with `stdio: 'inherit'`, exit with its status). It must work in `start/` with no extra config (node env, no DOM). Confirm `pnpm test:lesson 2` narrows to one file before locking.
- `vitest.config.ts`: `{ plugins: [tsconfigPaths()], test: { environment: 'node', globals: false, include: ['lesson-verification/**/*.ts'] } }` — ship `vite-tsconfig-paths@^5` as a devDep so gates may import source via the `@/` alias (matches the Code-conventions testing shape and removes a resolver footgun). `globals: false`, so gates `import { describe, it, expect } from 'vitest'`. Gates are node-env, no DOM; each inlines the helpers it needs (no shared helpers module).
- `lesson-verification/` directory with placeholder `Lesson 2.ts` … `Lesson 5.ts`, each `import { describe } from 'vitest'; describe.todo('Lesson N')` so the runner is green pre-lesson. (`project-lesson-test-coder` overwrites these later.)
- `AGENTS.md`: one short paragraph naming the app (in-memory invoices list view) and the daily commands (`pnpm dev`, `pnpm verify`, `pnpm test:lesson <n>`).

**Provided source the scaffolder writes in full (NOT stubs — this is the working baseline + all infra):**

- `src/lib/result.ts` — the canonical `Result<T>` union + `ok`/`err`, plus a `conflict<T>(userMessage, current: T)` helper that returns `{ ok: false, error: { code: 'conflict', userMessage, current } }` (current is a sibling field; `err`'s third arg stays `fieldErrors`).
- `src/lib/utils.ts` — `cn()`.
- `src/server/types.ts` — `InvoiceStatus = 'draft'|'sent'|'paid'|'overdue'`; `Role = 'owner'|'admin'|'member'` + `roleAtLeast(role, required)`; `Invoice` row type `{ id: string; orgId: string; number: string; customerName: string; status: InvoiceStatus; total: string; currency: string; createdAt: string; dueAt: string | null; deletedAt: string | null; archivedAt: string | null; version: number }`; `AuditLog` `{ id: string; orgId: string; actorUserId: string; action: string; subjectId: string; createdAt: string }`.
- `src/server/store.ts` — `import 'server-only';` a module-singleton in-memory store. Seeds deterministically on first import: 2 orgs (`org-acme`, `org-globex`), 2 users per org (an `admin` and a `member`), ~45 active invoices for `org-acme` across statuses with ISO `createdAt` descending and stable ids `inv-0001`…`inv-0045` (`inv-0001` is a live, editable row — the conflict-demo target, never archived/deleted in the seed), plus **one pre-archived** row (its own id, `archivedAt` set) and **one pre-soft-deleted** row (its own distinct id, `deletedAt` set) whose `number` equals a live row's `number` (to demo that a partial-unique-on-`number-where-deleted_at-is-null` lets the number be re-used — the colliding rows have different ids). Exports the raw arrays `invoices: Invoice[]`, `auditLogs: AuditLog[]`, and primitive mutators used by actions (`pushAudit`, `findInvoice`). Idempotent re-seed (a `reseed()` the inspector calls). No randomness that drifts across boots (fixed seed values). This is the "Postgres" of the project; comment says so.
- `src/server/session.ts` — `import 'server-only';` a cookie-driven dev session: `getSession()` reads an `acting-identity` cookie (default `org-acme:admin`) and returns `{ userId, orgId, role }`; `setActingIdentity(value)` is a Server Action writing the cookie. Stands in for `requireOrgUser`. Never redirects (no auth wall) so every route renders.
- `src/lib/authed-action.ts` — `authedAction(role, schema, fn)`: resolves `getSession()`, refuses with `err('forbidden', …)` when `!roleAtLeast(session.role, role)`, `safeParse`s the schema (`err('validation', …, flattenError)` on failure), then calls `fn(input, ctx)` with `ctx = { session, orgId: session.orgId, userId: session.userId, role: session.role }`. Returns the `(prev, formData) => Promise<Result>` shape. Wrap the gate in try/catch defaulting to deny.
- `src/lib/invoices/scoped-query.ts` — **provided as a working but naive baseline that the student replaces in S3.** Exports `scopedInvoices(orgId)` whose three methods currently all return the same org-filtered list (no lifecycle split) — i.e. the chapter-061-bug baseline. Also exports `activeFilter`/`archivedFilter` predicate helpers as `TODO`-free stubs the student rewires. (S3 makes `active()/archived()/includingDeleted()` honest.)  *Scaffolder ships the naive version; S3 owns the fix.*
- `src/lib/invoices/queries.ts` — `listInvoices({ orgId, view, status, sort, q, cursor, role, pageSize=20 })` and `getInvoiceDetail({ orgId, id, role })`. Scaffolder ships a working baseline that ignores `view`/`role` (always active-ish), applies `status`/`q`/`sort`/`cursor` against the store, returns `{ rows, nextCursor, hasPrev }`. S3 routes on `view` + RBAC; S2 wires the toolbar to it. Keep the sort/cursor/filter logic real here so S2 has something to drive.
- `src/lib/invoices/search-params.ts` — **stubbed file, `TODO(L2)`**: exports must exist as typed stubs so the page compiles (export `invoiceListSearchParams` as an empty-ish object placeholder and `invoiceListSearchParamsCache`), student fills in S2.
- `src/lib/invoices/actions.ts` — `'use server';` ships `updateInvoice` as the chapter-047 baseline (no version precondition; silent overwrite) so the edit form works pre-S5. `archiveInvoice`/`restoreInvoice`/`softDeleteInvoice` are **`TODO(L4)` stubs** returning `err('internal','Not implemented')`. The `version` precondition + conflict branch on `updateInvoice` is **`TODO(L5)`**.
- UI baseline (working, local-state filters, no URL state): `src/app/(app)/invoices/page.tsx` (RSC reading `searchParams`, calling `listInvoices`, rendering `<Toolbar />` + `<InvoicesTable />` + `<Pagination />` inside an `invoices-grid` two-region layout), `loading.tsx`, `toolbar.tsx` (`TODO(L2)` — ships a local-`useState` filter baseline), `table.tsx` (renders rows + a row `<DropdownMenu>`; row actions are `TODO(L4)`), `pagination.tsx` (`TODO(L2)`), `active-filter-chips.tsx` (`TODO(L2)`), `view-tabs.tsx` (`TODO(L2)/L3`), `[id]/edit/page.tsx` (reads invoice + version, renders form), `[id]/edit/edit-form.tsx` (`useActionState(updateInvoice)`, hidden `version` `defaultValue`; conflict banner is `TODO(L5)`).
- `/inspector` surface (provided in full): `src/app/inspector/page.tsx` (RSC) with a row-counts banner (total/active/archived/deleted for current org via the store), an identity switcher (org + role, posting `setActingIdentity`), a "Reset and re-seed" Server Action, an audit-log tail (last 20), a "Force version drift" control (a Server Action bumping a target row's `version` directly in the store), an "Open in two tabs" helper, and a **static** "Index & plan" explainer panel (prose describing the partial-index/EXPLAIN story — no live SQL). Each panel carries a `data-testid`.
- `src/app/layout.tsx` (Providers + Toaster + a slim top nav linking `/invoices` and `/inspector`; **wraps children in `<NuqsAdapter>` from `nuqs/adapters/next/app`** — load-bearing: without it every `nuqs` client hook throws at runtime and the toolbar/pagination break), `src/app/page.tsx` (`redirect('/invoices')`), `src/app/_components/providers.tsx` (next-themes), `globals.css` (Tailwind v4 + tokens), `src/components/ui/*` (shadcn primitives).

Wrap every request-time store read in a route under a segment `loading.tsx` (Cache Components needs the Suspense seam). The store is in-process and synchronous, but treat reads as request-time (the page `await`s `searchParams`), so ship `loading.tsx` for `/invoices`, `/invoices/[id]/edit`, and `/inspector`.

After scaffolding, `pnpm verify` passes and `pnpm dev` renders `/invoices` with seeded rows (local filters only), the edit form (silent overwrite), and `/inspector` with live counts — the chapter-outline "starter state."

## Slices

### Slice S1 — Move every control to the URL

Lift the toolbar's filter, sort, search, and view state into the URL through `nuqs`, and render active-filter chips. The `/invoices` page becomes a Server Component that reads the URL via a `searchParamsCache`; the toolbar writes back via `nuqs` setters.

In scope:
- Fill `src/lib/invoices/search-params.ts`: five parsers matching the reference — `status: parseAsStringEnum(['draft','sent','paid','overdue'])` (bare — nuqs parsers are nullable by default, so absent ⇒ `null` with no `.withDefault`), `sort: parseAsStringEnum(['-createdAt','createdAt','-total','total','-customer','customer']).withDefault('-createdAt')`, `q: parseAsString.withDefault('')`, `view: parseAsStringEnum(['active','archived','all']).withDefault('active')`, `cursor: parseAsString` (bare — nullable default). **Do not call `.withDefault(null)`**: nuqs's `withDefault` is typed `(defaultValue: NonNullable<T>)`, so `parseAsString.withDefault(null)` / `parseAsStringEnum(...).withDefault(null)` fail `tsc` with `TS2345` — the `null` default is the parser's built-in absence behavior, expressed by omitting `withDefault`. Export `invoiceListSearchParams` (the parser map) and `invoiceListSearchParamsCache = createSearchParamsCache(invoiceListSearchParams)`.
- `page.tsx`: `const parsed = await invoiceListSearchParamsCache.parse(props.searchParams)`; pass parsed slices into `listInvoices` and `parsed` into `<Toolbar parsed={parsed} />` (controlled-from-prop, no second client read).
- `toolbar.tsx` (`'use client'`): one component using `useQueryStates(invoiceListSearchParams, { shallow: false, limitUrlUpdates: debounce(300) })` — status `<Select>`, sort `<Select>`, search `<Input type="search">`, and `<ViewTabs>` (`active`/`archived`/`all`). Every setter call bundles `cursor: null`. The search input holds typed state in `useState` and syncs the *deferred* value (`useDeferredValue` + `useTransition`) to `setQueryStates({ q: deferred || null, cursor: null })` (empty coerces to `null` so the param strips). Do not re-set `history`/`scroll` (nuqs defaults).
- `active-filter-chips.tsx`: a Server Component reading `parsed`, emitting one chip per non-default filter (status, q, non-default sort); each chip's clear "x" is a tiny `'use client'` `<ClearChip param=... />` calling the matching setter with `cursor: null`. Render inside the page above the table.
- `view-tabs.tsx`: renders the three tabs writing `view` (+`cursor:null`). The `all` tab is shown to everyone for now (RBAC gating + correct rows land in S3); only `active` returns rows correctly until S3.

Out of scope: pagination control internals (S2), `view` routing/RBAC/badges (S3), lifecycle actions (S4), conflict banner (S5).

Contracts: creates `invoiceListSearchParams` + `invoiceListSearchParamsCache` (the URL contract every later slice reads); `Toolbar` takes `{ parsed }`. Selectors: `toolbar`, `filter-status`, `filter-sort`, `search-input`, `view-tabs`, `view-tab-active`/`view-tab-archived`/`view-tab-all`, `active-filter-chips`, `chip-<param>`.

Screenshot: none (S3 captures the settled `/invoices` after view tabs return correct rows and badges render — the last slice to change this surface's headline state for L2/L3).

### Slice S2 — Cursor pagination and the responsive search

Fill the pagination control and confirm the deferred-search + cursor-reset rhythm end-to-end, so Next advances the cursor in the URL and every result-set-changing write drops the cursor.

In scope:
- `pagination.tsx` (`'use client'`): read `cursor` via `useQueryState('cursor', cursorParser.withOptions({ shallow: false }))`; receive `nextCursor` and `hasPrev` as props from the page. "Next" → `setCursor(nextCursor)`; "First page" → `setCursor(null)` (strips the param). Disable "Next" when `!nextCursor`, "First page" when `cursor == null`. Real `<nav aria-label="Pagination">` + `<button type="button">`. No debounce (clicks aren't keystrokes).
- `page.tsx`: pass `nextCursor`/`hasPrev` from `listInvoices` into `<Pagination />`.
- Confirm (and fix if needed) that the S1 toolbar bundles `cursor: null` on status/sort/search/view changes so changing any of them returns page one of the new set.
- The search box stays responsive: typed `useState` drives the input, the deferred value drives the URL write under `limitUrlUpdates: debounce(300)`; assert the input never blocks.

Out of scope: bidirectional/`before` cursor (forward-only by design), `view` routing (S3).

Contracts: `Pagination` takes `{ cursor, nextCursor, hasPrev }`. Selectors: `pagination`, `pagination-next`, `pagination-first`.

Screenshot: none (folded into S3's settled capture).

### Slice S3 — Scoped reads and the view tabs

Replace the naive scoped-query baseline with an honest lifecycle-aware, tenant-scoped helper; route `listInvoices`/`getInvoiceDetail` on the `view` param; gate `all` to admin at the read; render lifecycle badges. After this slice the `/invoices` surface is feature-complete for the read path.

In scope:
- `src/lib/invoices/scoped-query.ts`: make `scopedInvoices(orgId)` return three honestly-distinct, chainable views over the store: `active()` (neither `deletedAt` nor `archivedAt` set), `archived()` (`archivedAt` set, `deletedAt` null), `includingDeleted()` (everything in org). Each returns a small chainable object exposing `.filter(predicate)`, `.sort(...)`, `.cursorAfter(cursor)`, `.take(n)` — the in-memory analogue of the Drizzle `$dynamic()` builder, so callers compose status/sort/cursor onto whichever view the helper returns. Export `activeFilter(inv)`/`archivedFilter(inv)` predicates used by both the helper and any hand-written join. Add a top-of-file comment: this is the only sanctioned way reads touch invoices; a bare `store.invoices` read elsewhere is the review red flag.
- `queries.ts`: route `listInvoices` on `view` — `active` → `active()`, `archived` → `archived()`, `all` → `includingDeleted()` — and **drop `all` to `active` unless `role === 'admin'`** (the read-layer RBAC gate). Apply status/sort/cursor by composing on the returned view. Same routing in `getInvoiceDetail` (archived loads for restore; soft-deleted loads only for admin).
- `view-tabs.tsx`: hide the `all` tab unless `role === 'admin'` (passed from the page via session). A member hand-typing `?view=all` is already served `active` rows by the read gate.
- `table.tsx`: render a `<Badge>` for archived rows ("Archived") and soft-deleted rows ("Deleted"); show an "Archived on …" date label in the archived view.
- `page.tsx`: pass `role` into `listInvoices`, `<ViewTabs>`, and `<InvoicesTable>`.

Out of scope: lifecycle write actions (S4), conflict (S5).

Contracts: `scopedInvoices(orgId)` view API (`active/archived/includingDeleted` + chainable `filter/sort/cursorAfter/take`), `activeFilter`/`archivedFilter`. `listInvoices`/`getInvoiceDetail` gain `role` routing. Selectors: `invoice-row`, `badge-archived`, `badge-deleted`, `archived-on`.

Screenshot:
- L2 (`/invoices`, desktop 1280, settled, default `active` view): toolbar + chips area + table + pagination + view tabs all visible — the finished list view for the overview/L2 figure.
- L3 (`/invoices?view=all` as admin, desktop 1280, settled): the All view showing a row with a "Deleted" badge and a row with an "Archived" badge.

### Slice S4 — Archive, restore, and delete

Ship the three lifecycle Server Actions with audit-log writes and wire them into the row action menu, with optimistic archive.

In scope:
- `actions.ts`: implement `archiveInvoice = authedAction('member', z.strictObject({ id: z.string(), version: z.number().int() }), …)` — find the row scoped to `ctx.orgId`; refuse (conflict) if `version` mismatches or it's already archived/deleted; set `archivedAt = now`, `version += 1`; push an audit row (`action: 'invoice.archive'`) in the same logical step; return `ok(row)` or `conflict(userMessage, current)`. `restoreInvoice` (member) clears whichever of `archivedAt`/`deletedAt` is set (admin path may restore a soft-deleted row); `softDeleteInvoice = authedAction('admin', …)` sets `deletedAt = now`. Each writes an audit row. Keep the "same transaction" discipline as a single atomic store mutation + audit push (comment names that in real Postgres this is one `db.transaction`).
- `table.tsx`: wire each action into the row `<DropdownMenu>`. `authedAction` returns the two-arg `(prev, formData) => Promise<Result>` shape, which **cannot** be passed straight to `<form action={…}>` (a form action is `(formData) => void`), so drive each through `useActionState(action, null)` and bind the returned dispatcher to `<form action={dispatch}>` (the `useActionState` call also gives the in-flight/toast feedback). Hidden `id`+`version` inputs. Show Restore in the archived view, the admin-only un-delete control on `all`-view rows with `deletedAt`, and the admin-only delete control on active rows. On `conflict` surface a Sonner toast ("This invoice changed elsewhere — refresh to retry"); on `ok` a success toast; `revalidatePath('/invoices')` inside the action.
- Optimistic archive: wrap the table list in `useOptimistic` so an archived row leaves the table the instant the user clicks, reappearing if the action returns `{ ok: false }` (the optimistic value expires when the transition ends — not a throw rollback). Comment names this precisely.

Out of scope: the `version` precondition on the edit/update path and the rich conflict banner (S5) — lifecycle actions return their conflict Result but surface only a toast.

Contracts: `archiveInvoice`/`restoreInvoice`/`softDeleteInvoice` `(prev, formData) => Promise<Result<Invoice>>`. Selectors: `row-actions`, `row-action-archive`, `row-action-restore`, `row-action-delete`, `row-action-undelete`.

Screenshot:
- L4 (`/invoices`, desktop 1280, state `row-menu-open`): the row action `DropdownMenu` open on an active row showing Archive and (as admin) Delete.

### Slice S5 — Two tabs, one winner

Add the `version` precondition to `updateInvoice`, return an honest 409 with `current`, and render the conflict banner with "Use latest" and an admin-gated "Overwrite".

In scope:
- `actions.ts` `updateInvoice`: add `version: z.number().int()` to the schema; the store mutation only applies when the row's current `version === input.version` and tenancy + `deletedAt IS NULL` hold; on match set fields + `version += 1`, push an audit row, return `ok(updated)`; on mismatch (zero rows) re-read the current row scoped to org and return `conflict(userMessage, current)` (one round trip, no client refetch). Accept an `overwrite` flag (admin-only) that bypasses the version precondition. `revalidatePath('/invoices')`.
- `edit-form.tsx`: the hidden `<input type="hidden" name="version" defaultValue={invoice.version} />` already exists (uncontrolled); extend the `useActionState` Result type to include the conflict branch; on `error.code === 'conflict'` render `<ConflictBanner current={...} />`.
- `conflict-banner.tsx` (`'use client'`): shows the server's `current` values; "Use latest" replaces the form's controlled fields with `current` and resets the hidden version to `current.version` so the resubmit succeeds; "Overwrite anyway" renders only when `role === 'admin'` and re-fires with `overwrite: true`. Name the admin gate loudly in a comment.
- Pass `role` into the edit page/form so the overwrite affordance is gated.

Out of scope: nothing further — this completes the chapter acceptance bar.

Contracts: `updateInvoice` gains `version` + `overwrite`; `ConflictBanner` takes `{ current, onUseLatest, onOverwrite, canOverwrite }`. Selectors: `edit-form`, `version-input`, `conflict-banner`, `conflict-use-latest`, `conflict-overwrite`, `conflict-current-total`.

Screenshot:
- L5 (`/invoices/inv-0001/edit`, desktop 1280, state `conflict`): the edit form showing the conflict banner with the current server values and the Use latest / Overwrite controls. (Drive the state via the inspector's "Force version drift" then submit, or seed a stale version.)

## Start derivation

Derive `start/` from the completed `solution/` by reverting only the student-owned files to stubs; every other file is byte-identical. Each stub body carries a `// TODO(L<n>) — <task>` marker so `rg "TODO" start/` enumerates the work.

Stub these (lesson owners in parens):
- `src/lib/invoices/search-params.ts` (L2) — export typed placeholders (`invoiceListSearchParams` as `{}` cast / `invoiceListSearchParamsCache` as a `createSearchParamsCache({})` placeholder) so the page still compiles. `// TODO(L2) — define the five parsers + searchParamsCache`.
- `src/app/(app)/invoices/toolbar.tsx` (L2) — revert to the local-`useState` baseline that renders the controls but doesn't write the URL. `// TODO(L2) — lift filter/sort/search/view into the URL via useQueryStates`.
- `src/app/(app)/invoices/active-filter-chips.tsx` (L2) — render nothing (`return null`). `// TODO(L2) — render a chip per non-default filter`.
- `src/app/(app)/invoices/pagination.tsx` (L2) — render disabled buttons, no setter. `// TODO(L2) — wire cursor next/first via useQueryState`.
- `src/app/(app)/invoices/view-tabs.tsx` (L2/L3) — render the three tabs without RBAC hiding and without writing `view` correctly. `// TODO(L2) — write view (+cursor:null); TODO(L3) — hide all tab unless admin`.
- `src/lib/invoices/scoped-query.ts` (L3) — the naive baseline where all three methods return the same org list. `// TODO(L3) — make active/archived/includingDeleted honest`.
- `src/lib/invoices/queries.ts` (L3) — revert `listInvoices`/`getInvoiceDetail` to ignore `view`/`role`. `// TODO(L3) — route on view + gate all to admin`.
- `src/app/(app)/invoices/table.tsx` (L3, L4) — keep row rendering but drop badges (L3) and row actions (L4). `// TODO(L3) — render archived/deleted badges; TODO(L4) — wire archive/restore/delete row actions + optimistic archive`.
- `src/lib/invoices/actions.ts` (L4, L5) — `archiveInvoice`/`restoreInvoice`/`softDeleteInvoice` return `err('internal','Not implemented')` (`// TODO(L4)`); `updateInvoice` reverts to the no-version-precondition baseline (`// TODO(L5) — add version precondition + conflict branch + overwrite`).
- `src/app/(app)/invoices/[id]/edit/edit-form.tsx` (L5) — keep `useActionState(updateInvoice)` + hidden version, but no conflict branch. `// TODO(L5) — render ConflictBanner on the conflict branch`.
- `src/app/(app)/invoices/[id]/edit/conflict-banner.tsx` (L5) — file exists, body `return null`. `// TODO(L5) — show current values + Use latest / admin Overwrite`.

Provided-and-identical in start (never stub): the whole `src/server/*`, `src/lib/result.ts`, `src/lib/utils.ts`, `src/lib/authed-action.ts`, all `/inspector` files, layout/providers/page, `loading.tsx` files, `src/components/ui/*`, all config, `scripts/`, `lesson-verification/` placeholders.

## Locked decisions

- **No database, no auth, no Drizzle/Better Auth/Postgres.** Persistence is the in-memory `src/server/store.ts` singleton; identity is the `acting-identity` cookie via `src/server/session.ts`. Do not import `drizzle-orm`, `postgres`, `better-auth`, `@t3-oss/env-nextjs`, or add `docker-compose.yml`/`.env`. This is the substrate that lets the surface render under `pnpm dev` with no bring-up.
- **Single store module is the source of truth.** All reads go through `scopedInvoices(orgId)`; all writes through the actions (which mutate the store + push audit atomically). No component or route reads `store.invoices` directly except the helper and the inspector's count/explainer panels.
- **`Result` + `conflict` shape (verbatim).** `Result<T>` is the canonical union; the conflict carries `current` as a sibling of the existing `'conflict'` `code` (not a new code, not in `fieldErrors`). `err(code, userMessage, fieldErrors?)` keeps its third-arg meaning.
- **RBAC gate lives at the read and the action, never only in the UI.** `view=all` drops to `active` for non-admins in `listInvoices`; `softDeleteInvoice`/overwrite are `authedAction('admin', …)`. Hiding a tab/control is cosmetic on top.
- **Cursor-reset invariant.** Every setter that re-orders or shrinks the result set (status, sort, search, view, chip-clear) bundles `cursor: null` in the same call. Forward-only pagination (Next + First page); no `before` cursor.
- **nuqs usage.** `replace` + `scroll:false` are nuqs defaults — never re-set them. RSC-driving writes pass `shallow: false`. Search throttling is `limitUrlUpdates: debounce(300)` (never `throttleMs`, removed/deprecated). Whole-hook options are the 2nd arg of `useQueryStates`; single-key uses `parser.withOptions({...})`.
- **Forms.** Uncontrolled inputs (`defaultValue`, never `value`) wired via `<form action={serverAction}>`; state/pending through `useActionState` at the form root; `useFormStatus` in the `<SubmitButton>` descendant. The hidden `version` is `defaultValue={invoice.version}`; on `ok:true` the form's row becomes the returned row so the next save doesn't self-conflict.
- **`useOptimistic` semantics.** The optimistic value is never committed on `{ ok: false }`; it expires when the pending transition ends. Do not write "rollback on error" — the course returns Results, it does not throw for conflicts.
- **Layout invariant: the `/invoices` content region is one grid with exactly two children** (list region left, detail/empty region right at desktop; stacked at mobile). The page composes `<Toolbar/>` + `<InvoicesTable/>` + `<Pagination/>` inside the list region — they must not become extra top-level grid items. Any region the layout places as a single slot resolves to a single wrapping element.
- **Stable selectors via `data-testid`.** Every surface a rendered check or screenshot reads exposes a `data-testid` (listed per slice). Reads use these, never positional/structural selectors. Canonical ids: `invoices-page`, `invoices-grid`, `toolbar`, `filter-status`, `filter-sort`, `search-input`, `view-tabs`, `view-tab-{active,archived,all}`, `active-filter-chips`, `chip-<param>`, `invoices-table`, `invoice-row`, `badge-archived`, `badge-deleted`, `archived-on`, `pagination`, `pagination-next`, `pagination-first`, `row-actions`, `row-action-{archive,restore,delete,undelete}`, `edit-form`, `version-input`, `conflict-banner`, `conflict-use-latest`, `conflict-overwrite`, `conflict-current-total`, `inspector-page`, `row-counts`, `count-{total,active,archived,deleted}`, `identity-switcher`, `force-version-drift`, `audit-tail`, `audit-row`, `index-explainer`.
- **Toolchain constraints (from `documentation/code standards/Toolchain constraints.md`):** `tsconfig` pins `"jsx":"react-jsx"`, `"skipLibCheck":true`, `"incremental":true`, no `baseUrl` (TS6 error-level; `paths` resolves under `moduleResolution:"bundler"`), `include` carries both `.next/types/**/*.ts` and `.next/dev/types/**/*.ts`. `next.config.ts` sets `reactCompiler:true` (requires `babel-plugin-react-compiler` devDep), `turbopack.root:__dirname` (silence multi-lockfile), `typedRoutes:true` — so construct dynamic `href`s through typed helpers or cast `as Route` (template-literal hrefs like `/invoices/${id}/edit` need a cast; pre-state it), and ensure `next-env.d.ts` references `.next/types/link.d.ts` or accept the IDE-only check. Biome: `css.parser.tailwindDirectives:true`, `files.includes` without trailing `/**`, exclude `next-env.d.ts`. shadcn primitives ship `'use client'` + double quotes (normalize via `pnpm check`); `Card` has no `asChild`. `pnpm-workspace.yaml` keeps `allowBuilds:{ sharp:true }`. Pages reading request-time data ship a segment `loading.tsx`. Parallel-route note is N/A (no parallel routes here — the `invoices-grid` is a plain CSS grid, the detail region is rendered inline, not a `@slot`).
- **Versions (pinned):** next `16.2.7`, react/react-dom `19.2.4`, nuqs `^2.8.9`, zod `^4.4.3`, typescript `^6.0.3`, biome `2.4.16`, vitest `^4.1.8`, radix-ui `^1.4.3`, lucide-react `^1.17.0`, babel-plugin-react-compiler `1.0.0`, pnpm `11.3.0`. No lucide brand icons.

## File tree

```
solution/
  package.json                                  [scaffold]
  next.config.ts                                [scaffold]
  tsconfig.json                                 [scaffold]
  biome.json                                    [scaffold]
  vitest.config.ts                              [scaffold]
  pnpm-workspace.yaml                           [scaffold]
  postcss.config.mjs                            [scaffold]
  next-env.d.ts                                 [scaffold]
  AGENTS.md                                     [scaffold]
  components.json                               [scaffold]
  scripts/
    test-lesson.mjs                             [scaffold]
  lesson-verification/
    Lesson 2.ts … Lesson 5.ts                   [scaffold placeholders; lesson-test-coder fills]
  src/
    app/
      layout.tsx                                [scaffold]
      page.tsx                                  [scaffold]
      globals.css                               [scaffold]
      _components/
        providers.tsx                           [scaffold]
        submit-button.tsx                       [scaffold]
      (app)/
        invoices/
          page.tsx                              [scaffold, edited by: S1, S2, S3]
          loading.tsx                           [scaffold]
          toolbar.tsx                           [scaffold, edited by: S1]
          view-tabs.tsx                         [scaffold, edited by: S1, S3]
          active-filter-chips.tsx               [scaffold, edited by: S1]
          pagination.tsx                        [scaffold, edited by: S2]
          table.tsx                             [scaffold, edited by: S3, S4]
          [id]/
            edit/
              page.tsx                          [scaffold, edited by: S5]
              loading.tsx                       [scaffold]
              edit-form.tsx                     [scaffold, edited by: S5]
              conflict-banner.tsx               [scaffold, edited by: S5]
      inspector/
        page.tsx                                [scaffold]
        loading.tsx                             [scaffold]
        actions.ts                              [scaffold]
    components/ui/                              [scaffold: button, badge, card, input, label, select, separator, skeleton, sonner, dropdown-menu, dialog]
    lib/
      result.ts                                 [scaffold]
      utils.ts                                  [scaffold]
      authed-action.ts                          [scaffold]
      invoices/
        search-params.ts                        [scaffold stub, edited by: S1]
        scoped-query.ts                         [scaffold naive, edited by: S3]
        queries.ts                              [scaffold, edited by: S3]
        actions.ts                              [scaffold, edited by: S4, S5]
    server/
      types.ts                                  [scaffold]
      store.ts                                  [scaffold]
      session.ts                                [scaffold]
```

## Verification

### Static checks (reviewer-run)

- both: `pnpm verify` exits 0 in `solution/` and `start/` (biome ci + next typegen + tsc --noEmit + next build).
- both: `pnpm test:lesson 2` runs exactly one file (`lesson-verification/Lesson 2.ts`), not all of them — confirms the runner narrows.
- both: `rg -n "drizzle-orm|from 'postgres'|better-auth|@t3-oss/env" solution/src start/src` returns nothing — substrate decision held.
- start: `rg -n "TODO\(L[2-5]\)" start/src | wc -l` ≥ 11 — every student file carries its marker; `rg "TODO" solution/src` returns nothing.
- solution: `rg -q "limitUrlUpdates" solution/src/app/\(app\)/invoices/toolbar.tsx` — the search box throttles URL writes (fails inert if the toolbar writes the URL on every keystroke).
- solution: `rg -q "shallow: false" solution/src/app/\(app\)/invoices/toolbar.tsx` — RSC-driving writes notify the server (fails if the list never re-queries).
- solution: `rg -q "cursor: null" solution/src/app/\(app\)/invoices/toolbar.tsx` — the cursor-reset invariant is wired (fails if a filter change keeps a stale cursor).
- solution: `rg -q "includingDeleted" solution/src/lib/invoices/scoped-query.ts` and `rg -q "role === 'admin'" solution/src/lib/invoices/queries.ts` — the All view exists and is RBAC-gated at the read (fails if `view=all` is ungated).
- solution: `rg -q "version" solution/src/lib/invoices/actions.ts` and `rg -q "conflict" solution/src/lib/invoices/actions.ts` — the update path checks version and returns a conflict (fails if update silently overwrites).
- solution: `rg -q "authedAction\('admin'" solution/src/lib/invoices/actions.ts` — soft-delete (and overwrite) is admin-gated at the action.
- solution: `rg -q "useOptimistic" solution/src/app/\(app\)/invoices/table.tsx` — optimistic archive is wired.

### Rendered checks (slice coders + inspector run against the running app)

- id `r-grid-two-regions` · slice S1 · route `/invoices` · viewport 1280×800 · state settled · intent: the content region is one grid with exactly two children, not split by the toolbar/table/pagination. · selectors: `invoices-grid` · assertion: `invoices-grid` has exactly 2 direct element children (list region, detail/empty region), side by side in the same row.
- id `r-toolbar-renders` · slice S1 · route `/invoices` · viewport 1280×800 · state settled · intent: toolbar controls + chips render above the table. · selectors: `toolbar`, `filter-status`, `filter-sort`, `search-input`, `view-tabs`, `active-filter-chips` · assertion: all six are present and visible; `toolbar` sits above `invoices-table` in document order.
- id `r-url-writes` · slice S1 · route `/invoices` · viewport 1280×800 · state settled · intent: changing a control rewrites the URL and clearing to defaults strips the query string. · selectors: `filter-status` · assertion: selecting status `paid` updates `location.search` to include `status=paid`; selecting back to default leaves `location.search` empty (no `status`).
- id `r-chip-clear` · slice S1 · route `/invoices?status=paid` · viewport 1280×800 · state settled · intent: a chip renders for the active filter and its clear control removes it. · selectors: `active-filter-chips`, `chip-status` · assertion: `chip-status` is present; activating its clear control removes `status` from `location.search` and the chip disappears.
- id `r-pagination` · slice S2 · route `/invoices` · viewport 1280×800 · state settled · intent: Next advances the cursor; First page strips it. · selectors: `pagination`, `pagination-next`, `pagination-first` · assertion: `pagination-first` is disabled initially; clicking `pagination-next` adds a `cursor=` param to `location.search` and enables `pagination-first`; clicking `pagination-first` removes `cursor`.
- id `r-cursor-reset` · slice S2 · route `/invoices` · viewport 1280×800 · state settled · intent: a filter change after paging drops the cursor. · selectors: `pagination-next`, `filter-status` · assertion: after clicking `pagination-next` (cursor present), changing `filter-status` removes `cursor` from `location.search`.
- id `r-search-responsive` · slice S2 · route `/invoices` · viewport 1280×800 · state settled · intent: typing keeps the input responsive while the URL settles. · selectors: `search-input` · assertion: typing a 12-char string into `search-input` updates its value immediately on each keystroke; `location.search` gains a `q=` param only after input settles (not one entry per keystroke).
- id `r-view-tabs-rows` · slice S3 · route `/invoices` · viewport 1280×800 · state settled · intent: the Active view hides archived/deleted rows; the Archived view shows the badge and the archived-on date label. · selectors: `view-tab-archived`, `invoice-row`, `badge-archived`, `archived-on` · assertion: in the default Active view no `badge-archived`/`badge-deleted` is present; activating `view-tab-archived` renders at least one `invoice-row` carrying `badge-archived`, and that row exposes an `archived-on` element whose text is non-empty.
- id `r-all-view-admin` · slice S3 · route `/invoices?view=all` · viewport 1280×800 · state settled (acting identity admin) · intent: All view shows deleted+archived rows with badges for admin. · selectors: `view-tab-all`, `badge-deleted`, `badge-archived` · assertion: `view-tab-all` is present; the list contains at least one row with `badge-deleted` and at least one with `badge-archived`.
- id `r-all-view-member` · slice S3 · route `/invoices?view=all` · viewport 1280×800 · state settled (acting identity member) · intent: a member is refused the All view at the read and the tab is hidden. · selectors: `view-tab-all`, `badge-deleted` · assertion: `view-tab-all` is absent; no `badge-deleted` row renders (the read served `active` rows despite the URL).
- id `r-invoices-mobile` · slice S3 · route `/invoices` · viewport 375×812 · state settled · intent: the two regions stack on mobile. · selectors: `invoices-grid` · assertion: the two children of `invoices-grid` stack vertically (second child's top is below the first child's bottom).
- id `r-row-menu` · slice S4 · route `/invoices` · viewport 1280×800 · state `row-menu-open` (acting identity admin) · intent: the row action menu offers Archive and admin Delete. · selectors: `row-actions`, `row-action-archive`, `row-action-delete` · assertion: opening `row-actions` on an active row reveals `row-action-archive` and `row-action-delete`.
- id `r-archive-optimistic` · slice S4 · route `/invoices` · viewport 1280×800 · state settled · intent: archiving removes the row from the active list. · selectors: `invoice-row`, `row-action-archive` · assertion: triggering `row-action-archive` on an active row removes that row from the list (the `invoice-row` count decreases by one) without a full reload.
- id `r-restore` · slice S4 · route `/invoices?view=archived` · viewport 1280×800 · state `row-menu-open` (acting identity admin) · intent: an archived row's menu offers Restore, and restoring removes it from the archived list. · selectors: `invoice-row`, `row-actions`, `row-action-restore` · assertion: opening `row-actions` on an archived row reveals `row-action-restore` (and not `row-action-archive`); triggering it decreases the archived-view `invoice-row` count by one.
- id `r-conflict-banner` · slice S5 · route `/invoices/inv-0001/edit` · viewport 1280×800 · state `conflict` (acting identity admin; drive via inspector Force-version-drift then submit) · intent: a stale submit renders the conflict banner with current values and recovery controls. · selectors: `edit-form`, `conflict-banner`, `conflict-current-total`, `conflict-use-latest`, `conflict-overwrite` · assertion: after the stale submit, `conflict-banner` is present showing `conflict-current-total`; `conflict-use-latest` is present; `conflict-overwrite` is present for the admin identity.
- id `r-inspector` · slice S3 · route `/inspector` · viewport 1280×800 · state settled · intent: the verification surface renders live counts, the identity switcher, the audit tail, and the index explainer. · selectors: `inspector-page`, `row-counts`, `count-total`, `count-active`, `count-archived`, `count-deleted`, `identity-switcher`, `audit-tail`, `force-version-drift`, `index-explainer` · assertion: all are present; `count-total` shows a number > 0 and equals roughly `active + archived + deleted` for the current org.
