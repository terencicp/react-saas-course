# Chapter 085 — Project plan: the tri-locale invoices list

## Substrate decision (architect's call — read first)

The chapter outline frames this project on a real Postgres/Drizzle/Better Auth/Temporal stack with `users.timeZone`/`users.locale` columns and `Temporal.Instant` rows read from `timestamptz`. **The actual chapter-062 codebase this project forks does not have any of that.** Ch062 (the direct ancestor in the dependency map, and the surface this chapter lifts) backs invoices with a deterministic **in-memory module store** (`src/server/store.ts`), a **cookie-driven dev session** (`src/server/session.ts`, no Better Auth), and string dates/currency — chosen there so the visible surface renders under `pnpm dev` with zero bring-up. That decision carries forward: this project is overwhelmingly *visible* (locale-swapped strings, per-locale currency/dates, the DST panel, `hreflang` in view-source), so the render pipeline must boot `solution/` with `pnpm dev` only — no Docker, no Postgres, no auth wall.

So this plan keeps the ch062 substrate and grafts the i18n surface onto it, preserving every *taught shape* faithfully while executing against the store:

- **`users.timeZone` / `users.locale`** become two fields on the in-memory `StoreUser` (IANA tz, BCP 47 locale), returned by `getSession()`. `getRequestConfig` reads them off the session exactly as the conventions require — the session is the seam, the store is the "Postgres."
- **`Temporal.Instant` / `Temporal.PlainDate` from `lib/temporal.ts`** are real: the store seeds invoice `createdAt` as `Temporal.Instant` and `dueDate` as `Temporal.PlainDate` (polyfilled via `temporal-polyfill`), so the DST-spanning fixture renders genuinely DST-aware wall-clock. There is no DB codec (`customType`) because there is no DB — `lib/temporal.ts` ships only the polyfill seam plus `instantFromString`/`plainDateFromString` parse helpers used by the seed. This is the single Temporal import path.
- **`amountMinor` (integer minor units)** is added to the `Invoice` row so `format.number(Number(row.amountMinor) / 100, { style: 'currency', currency })` is honest; `currency` is the existing ch062 text column.
- **SQL-only / Better-Auth-only artifacts** (real `timestamptz`, `additionalFields`, `requireOrgUser`) are represented in prose where a lesson references them, never as live code.

This diverges deliberately from the chapter outline's Postgres framing (a preliminary brainstorm). Every i18n concept the unit teaches — locale routing, the negotiation chain, ICU plurals with CLDR categories, currency-from-data, tz-aware dates with the profile zone, `hreflang`/canonical/sitemap/OG — is preserved and demonstrable in-browser, and the student finishes fast with no infra. Coder agents must not introduce `drizzle-orm`, `postgres`, `better-auth`, `@neondatabase/serverless`, `@t3-oss/env-nextjs`, or a `docker-compose.yml`.

## Project goals

The project cements Unit 17 (Time + i18n) as one runnable surface: the student lifts the ch062 invoices list into a tri-locale (`en-US`, `en-GB`, `fr-FR`), timezone-aware surface and gives the marketing pages a real i18n SEO shape. Coding develops five durable senior skills: (1) **resolve locale once in middleware** (`proxy.ts`) through the five-step negotiation chain and read only the resolved value downstream — never `Accept-Language`/`navigator.language` outside sign-up; (2) **route every UI string through `t()`** with grep-able `feature.surface.role` keys, and **every count through an ICU `plural`** that respects CLDR per language (French's `many` branch, the `=0` override), never a ternary; (3) **format dates and money on one seam** — `useFormatter`/`getFormatter` with the profile `timeZone` piped from the session and the currency read from the invoice row, so the right wall-clock and the right currency are decided by data the formatter is handed, not the runtime; (4) **emit the i18n SEO triple structurally** — bidirectional `hreflang` with `x-default`, a locale-specific canonical, per-locale sitemap entries and OG, all built from `routing.locales` in one helper so the rules hold by construction; (5) **hold the structural discipline** that keeps i18n maintainable — formatters in one place, `<html lang>` from the resolved locale, static rendering preserved via `setRequestLocale`. The student practices each by filling stubs against a brief and confirming behavior in a running `/[locale]/invoices` surface plus an `/inspector` verification panel that probes plural categories, the DST pair, the currency grid, and the rendered `hreflang`.

The goal is not a realistic app; it is to walk the canonical 2026 "ship i18n from day one" workflow so the `[locale]` segment, the catalog, and the `useFormatter`/`useTranslations` reflex are cemented — adding a fourth locale becomes one PR, not a retrofit. Features stay minimal: three locales, no RTL, no TMS, no edit-invoice CRUD (ch062 owns it), no Temporal arithmetic surface (ch083 L5 owns it).

## Student position

The student has finished Units 1–16 plus both Unit 17 teaching chapters (083 time/dates/timezones, 084 internationalization) — the chapters this project consumes. They know: TypeScript 6 strict (generics, discriminated unions, narrowing, `satisfies`, `as const` → union), React 19 (Server/Client Components, `useActionState`, `useOptimistic`, `useTransition`, `useDeferredValue`, refs-as-props — no `forwardRef`), Next.js 16 App Router (async `searchParams`/`params`, Suspense, `cacheComponents`, `proxy.ts` = the renamed middleware, route handlers, the metadata API with `generateMetadata`/`opengraph-image.tsx`/`sitemap.ts`/`robots.ts`), Tailwind v4 + shadcn/ui, Zod 4 (`z.strictObject`, `z.enum`, top-level builders, `z.flattenError`), the canonical single-param `Result<T>` + `ok`/`err`/`conflict`, Server Actions (five-seam `parse → authorize → mutate → revalidate → return`, uncontrolled inputs, `authedAction(role, schema, fn)`), `nuqs` URL state (the whole ch062 list surface), and — the Unit 17 carry-in this project *is* — **Temporal** (`Instant` for moments, `PlainDate` for calendar days, the always-pass-`timeZone` reflex, the `lib/temporal.ts` polyfill seam, DST awareness by construction) and **i18n** (`feature.surface.role` keys, one-key-one-meaning, named placeholders, `t.rich`, ICU `plural`/`select`/`selectordinal` with CLDR categories and `=0`/`#`, the `Intl.*` family, `currencyDisplay: 'narrowSymbol'`, the five-step negotiation chain + `@formatjs/intl-localematcher`, `SUPPORTED_LOCALES as const` → `Locale`, the six-file next-intl wiring `routing`/`navigation`/`request`/`proxy`/`[locale]/layout`/`AppConfig`, `setRequestLocale` + `generateStaticParams`, `useTranslations`/`getTranslations`, `useFormatter`/`getFormatter`, typed `Link`/`redirect`/`usePathname` from `createNavigation`, `NextIntlClientProvider` scoping via `pick`, and the SEO triple `alternates.languages`/per-locale canonical/sitemap `xhtml:link`/`bcp47ToOgLocale`).

**Not yet known — do not introduce these into the project:**
- **Vitest/Playwright/RTL/MSW test suites.** Unit 18 (chapters 086–091). Ship only the `test:lesson` gate placeholders; never propose "write a test" as a step.
- **Sentry, Pino, AsyncLocalStorage, PostHog, Core Web Vitals tooling.** Unit 19. No observability wiring.
- **CI / GitHub Actions / Vercel deploy / expand-migrate-contract.** Unit 20.
- **Real Postgres/Drizzle, Better Auth, `@t3-oss/env-nextjs`.** Although earlier units teach these, **this project does not use them** (see substrate decision) — the student has never seen this project use a real DB or auth wall, so introducing one is an unfamiliar, unteachable surface. Use the in-memory store + cookie session.
- **`updateTag`/`revalidateTag` tag-based invalidation, TanStack Query, Zustand, AI/Vercel AI SDK.** Not in scope; use `revalidatePath` only where revalidation is needed.
- **Temporal *arithmetic* depth** (`.since`/`.round`/`Duration` storage) beyond the single relative-due computation (`Temporal.Now.plainDateISO(tz).until(dueDate, { largestUnit: 'day' }).days`). ch083 L5 owns the arithmetic surface.

## Scaffolding recipe

**Fork the chapter-062 `solution/`** (the production invoices list view) as the baseline, then layer the i18n substrate and the unbuilt routing/catalog/SEO seams. Do not scaffold fresh — the ch062 list surface (URL-state toolbar, view tabs, lifecycle badges, pagination, the in-memory store, the cookie session, the inspector, all config) is the working baseline this project transforms. The scaffolding-coder builds everything below now; what it must leave as `TODO` stubs for the slice-coders is called out explicitly at the end.

Read the ch062 codebase summary at `documentation/content/project code outlines/Chapter 062.md` for the exact file set and contracts to fork. Reproduce its `solution/` structure (the in-memory `store.ts`, cookie `session.ts`, `authed-action.ts`, `result.ts`, the `(app)/invoices/*` surface, the `/inspector`, all config) **with these modifications and additions**:

**Dependencies to add over the ch062 set (pinned):**
- runtime: `next-intl@^4.5.0`, `temporal-polyfill@^0.3.0`
- (No `negotiator` / `@formatjs/intl-localematcher`: next-intl's `createMiddleware` runs `Accept-Language` negotiation internally via its own bundled localematcher. The chapter-outline starter listed `@formatjs/intl-localematcher` for the ch084-L4 manual `negotiateLocale` helper — this project never builds that helper, so the dep is unused. Confirmed against next-intl 4 docs, June 2026.)
- keep the ch062 runtime/dev pins verbatim: `next@16.2.7`, `react@19.2.4`, `react-dom@19.2.4`, `nuqs@^2.8.9`, `zod@^4.4.3`, `next-themes@^0.4.6`, `radix-ui@^1.4.3`, `lucide-react@^1.17.0`, `class-variance-authority@^0.7.1`, `clsx@^2.1.1`, `tailwind-merge@^3.6.0`, `sonner@^2.0.7`, `uuidv7@^1.0.2`, `tw-animate-css@^1.4.0`; dev `@biomejs/biome@2.4.16`, `typescript@^6.0.3`, `tailwindcss@^4.3.0`, `@tailwindcss/postcss@^4.3.0`, `vitest@^4.1.8`, `babel-plugin-react-compiler@1.0.0`, `vite-tsconfig-paths@^5.1.4`, `@types/node@^25.9.1`, `@types/react@^19.2.16`, `@types/react-dom@^19.2.3`. (`nuqs` is kept — the ch062 toolbar still uses it.)
- No `drizzle-orm`, `postgres`, `better-auth`, `@neondatabase/serverless`, `@t3-oss/env-nextjs`.

**Config:**
- `package.json` scripts: `"dev": "next dev"`, `"build": "next build"`, `"start": "next start"`, `"format": "biome format --write ."`, `"lint": "biome lint ."`, `"check": "biome check --write ."`, `"verify": "biome ci . && tsc --noEmit && next build"`, `"test:lesson": "node scripts/test-lesson.mjs"`, `"preinstall": "npx only-allow pnpm"`. `"packageManager": "pnpm@11.3.0"`, `"engines": { "node": ">=24" }`, `"type": "module"`, `"private": true`. (The `verify` string is exactly `biome ci . && tsc --noEmit && next build`.)
- `next.config.ts`: wrap the config with the next-intl plugin. `import createNextIntlPlugin from 'next-intl/plugin'; const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts'); export default withNextIntl({ cacheComponents: true, typedRoutes: true, reactCompiler: true, turbopack: { root: __dirname }, devIndicators: false })`.
- `tsconfig.json`: identical to ch062 — `"jsx":"react-jsx"`, `"moduleResolution":"bundler"`, `"module":"esnext"`, `"target":"ES2022"`, `"strict":true`, `"noUncheckedIndexedAccess":true`, `"skipLibCheck":true`, `"incremental":true`, `"isolatedModules":true`, `"esModuleInterop":true`, `"resolveJsonModule":true`, `"verbatimModuleSyntax":true`, `"noEmit":true`, `"allowJs":false`, no `baseUrl`, `"paths":{"@/*":["./src/*"]}`, `"include":["next-env.d.ts","**/*.ts","**/*.tsx",".next/types/**/*.ts",".next/dev/types/**/*.ts"]`.
- `biome.json`: `quoteStyle:'single'`, `css.parser.tailwindDirectives:true`, `files.includes:["**","!next-env.d.ts","!.next","!node_modules"]`, organizeImports on.
- `pnpm-workspace.yaml`: `allowBuilds:\n  sharp: true\n  '@parcel/watcher': false\n  '@swc/core': false` (no `packages:` key). pnpm 11.3.0 reads only `allowBuilds`. **`next-intl@4.13` (the `^4.5.0` float) pulls `@swc/core` and `@parcel/watcher` as direct deps, both with native build scripts pnpm 11.3.0 (`strictDepBuilds:true`) refuses unattended — a cold `pnpm install` exits 1 and `next build` re-surfaces it as `ERR_PNPM_IGNORED_BUILDS`, failing `pnpm verify`.** Both ship prebuilt platform binaries (`@swc/core-<platform>`, `@parcel/watcher-<platform>`), so their source-build step is unnecessary: list them `false` (acknowledge-but-skip, the same shape the toolchain notes use for `esbuild`). pnpm also auto-writes a placeholder entry for any unlisted native build, which `strictDepBuilds` then treats as a hard error — so listing them explicitly is mandatory. Ship this in **both** `solution/` and `start/`. (next-intl 4.13 / pnpm 11.3.0, June 2026.)
- `scripts/test-lesson.mjs`: node wrapper reading the lesson number from `process.argv[2]` and running exactly that one file via vitest — `spawnSync('npx', ['vitest', 'run', '--root', '.', \`lesson-verification/Lesson ${n}.ts\`], { stdio: 'inherit' })`, exit with its status. A bare `vitest run` glob won't narrow (pnpm passes `<n>` as a positional vitest OR-matches against every `Lesson *.ts`), so the wrapper is mandatory. Must work in `start/` with no extra config (node env, no DOM). Confirm `pnpm test:lesson 2` narrows to one file before locking.
- `vitest.config.ts`: `{ plugins: [tsconfigPaths()], test: { environment: 'node', globals: false, include: ['lesson-verification/**/*.ts'] } }`. `globals:false` → gates `import { describe, it, expect } from 'vitest'`. Node env, no DOM; each gate inlines the helpers it needs (no shared helpers module). The runner observes SSR/first-paint output and source shape, not interaction.
- `lesson-verification/` with placeholder `Lesson 2.ts`, `Lesson 3.ts`, `Lesson 4.ts`, each `import { describe } from 'vitest'; describe.todo('Lesson N')` so the runner is green pre-lesson.
- `AGENTS.md`: one short paragraph naming the app (tri-locale in-memory invoices list) and the daily commands (`pnpm dev`, `pnpm verify`, `pnpm test:lesson <n>`).

**Substrate modifications to the forked ch062 source (scaffolder writes these in full):**

- `src/lib/temporal.ts` — **new.** Line 1 is `import 'temporal-polyfill/global';` (side-effect: installs `globalThis.Temporal` at runtime **and** declares the ambient `Temporal` type namespace — without it `Temporal.Instant`/`Temporal.PlainDate` as type annotations are `TS2503` and `globalThis.Temporal` is `TS7017`), then `import { Temporal as TemporalPolyfill } from 'temporal-polyfill';` and `export const Temporal = globalThis.Temporal ?? TemporalPolyfill;` (the single Temporal import path), plus two parse helpers used by the seed: `instantFromString(s: string): Temporal.Instant` and `plainDateFromString(s: string): Temporal.PlainDate`. No Drizzle `customType` (no DB). Comment: this is the only file that touches the polyfill; a Node 26 move is a one-line change here.
- `src/server/types.ts` — extend ch062's types. Add `locale: Locale` and `timeZone: string` to `StoreUser`. Change the `Invoice` row so `createdAt: Temporal.Instant`, `dueDate: Temporal.PlainDate`, add `amountMinor: number` (integer minor units), keep `currency: string` (ISO 4217 from data) and `status`/`version`/`deletedAt`/`archivedAt`. `Session` gains `locale` and `timeZone`. Import `Locale` from `lib/i18n/supported.ts` (below) — keep the type import light to avoid cycles; if a cycle appears, inline the `Locale` union here and re-export.
- `src/lib/i18n/supported.ts` — **new, provided.** `export const SUPPORTED_LOCALES = ['en-US','en-GB','fr-FR'] as const; export type Locale = (typeof SUPPORTED_LOCALES)[number];` The single source the routing config and Zod guard read.
- `src/server/store.ts` — extend the seed. 4 users covering 4 (locale, tz) pairs across the 2 orgs: `(en-US, America/New_York)`, `(en-GB, Europe/London)`, `(fr-FR, Europe/Paris)`, `(fr-FR, Pacific/Auckland)` — the last pairing deliberate (locale and tz are independent). ~30 invoices/org with a **USD/GBP/EUR mix** in `currency` + matching `amountMinor`, `createdAt` as `Temporal.Instant` (seeded via `instantFromString`), `dueDate` as `Temporal.PlainDate`. Include the two **DST-spanning fixtures** as fixed rows the inspector targets: `createdAt = instantFromString('2026-07-01T18:00:00Z')` and `createdAt = instantFromString('2026-01-01T18:00:00Z')` (same UTC offset, different London wall-clock). Keep one pre-archived + one pre-soft-deleted row from ch062. Fixed-seed, idempotent `reseed()`. Comment: this is the project's "Postgres."
- `src/server/session.ts` — extend `getSession()` to return `{ userId, orgId, role, locale, timeZone }` read from the seeded `StoreUser`; default identity `org-acme:admin`. `setActingIdentity(value)` unchanged. Never redirects.
- `src/lib/user-time.ts` — **new, provided.** `getCurrentUserTimeZone(): Promise<string>` and `getCurrentUserLocale(): Promise<Locale>`, each a thin `React.cache`d resolver over `getSession()` (falling back to `'UTC'` / `'en-US'`). `import 'server-only';`
- `src/lib/seo/og-locale.ts` — **new, provided.** `bcp47ToOgLocale(locale: Locale): string` converting `'fr-FR'` → `'fr_FR'`.

**i18n routing mechanism the scaffolder ships COMPLETE (provided, not stubs).** The negotiation mechanism — `routing.ts`, `navigation.ts`, `proxy.ts`, `global.ts` — was already built by the student in the ch084 L5 *teaching* chapter; re-typing it here is hollow review and, if stubbed, leaves `start/` unable to route any URL (the `[locale]` segment can't match `/invoices` without the middleware rewriting unprefixed paths). Ship these working so `start/` boots and routes the carry-in list in English; the project's genuine new learning lives in the request-config tz/locale seam, the formatter presets, the `[locale]` layout's `setRequestLocale`+scoped-provider, the three catalogs, the switch action, and the SEO triple — all of which stay student work below.

- `src/i18n/routing.ts` — **provided.** `defineRouting({ locales: SUPPORTED_LOCALES, defaultLocale: 'en-US', localePrefix: 'as-needed' })` + `Locale` type.
- `src/i18n/navigation.ts` — **provided.** `createNavigation(routing)` exports (`Link`, `redirect`, `usePathname`, `useRouter`, `getPathname`).
- `src/proxy.ts` — **provided.** `export default createMiddleware(routing); export const config = { matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'] };`
- `src/global.ts` — **provided.** `declare module 'next-intl'` `AppConfig` augmentation (`Messages` from `en-US.json`, `Formats` from `i18n/formats`, `Locale` from `routing`).

**i18n + SEO seams the scaffolder leaves as `TODO` stubs (the slice-coders complete these):**

- `src/i18n/request.ts` — `TODO(L2)`. Stub `getRequestConfig` returning a minimal `{ locale: 'en-US', messages: (await import('../messages/en-US.json')).default }` so the plugin boots and `start/` renders English; student fills the real five-step-resolved version (`hasLocale`, dynamic per-locale import, `timeZone` from the session seam, `formats` — **no** `now: new Date()`, which would break Cache Components prerender). Owner S1.
- `src/i18n/formats.ts` — `TODO(L2)` (minimal) then `TODO(L3)` (currency/relative presets). Stub exporting an empty `formats` object `as const satisfies Formats`. Owner S1 (minimal), S2 (extend).
- `src/app/[locale]/layout.tsx` — `TODO(L2)`. The whole `[locale]` segment is new. Stub a **working** async layout that renders `<html lang="en-US" suppressHydrationWarning><body>` + the providers (`<NuqsAdapter>`, `<ThemeProvider>`, `<Toaster>`) wrapping `{children}` — so the carry-in list renders in `start/` before the student finishes. The TODO is the locale-dynamic transformation: `generateStaticParams`, await + `hasLocale`/`notFound` the locale param, `setRequestLocale(locale)` before any next-intl call, `<html lang={locale}>`, and the scoped `NextIntlClientProvider messages={pick(messages, ['nav','locale-switcher'])}`. Owner S1.
- `src/messages/en-US.json` — **provided in full** (source catalog, nested objects, every `feature.surface.role` key, the counter as ICU `plural` with `=0`/`one`/`other`, status labels, marketing meta, nav, locale-switcher). NOT a stub.
- `src/messages/en-GB.json` — `TODO(L2)`. Stub: empty `{}` (safe in `start/` only because the stub `request.ts` resolves en-US for every locale — next-intl has **no** cross-locale per-key fallback; a key missing from the active catalog throws `MISSING_MESSAGE` and fails prerender), TODO to fill it as a **complete** copy of en-US with the ~15-key diff (colour, date order phrasing). Owner S1.
- `src/messages/fr-FR.json` — `TODO(L2)`. Stub: empty `{}`, TODO to fill the full French translation including the counter's `many` branch. Owner S1.
- `src/lib/seo/alternates.ts` — `TODO(L4)`. Stub `generateAlternates(pathname, currentLocale)` returning a placeholder; student builds the full `{ canonical, languages }` from `routing.locales`. Owner S3.
- `src/app/sitemap.ts` — `TODO(L4)`. Stub returning `[]`; student emits per-canonical-path entries with `alternates.languages`. Owner S3.

**Routes the scaffolder creates new (the ch062 app had only `/invoices` + `/inspector`):**

- `src/app/[locale]/` segment wrapping the app + marketing surfaces. The ch062 `(app)/invoices/*` and root layout move under `[locale]/`. The `/inspector` route stays **locale-agnostic at `src/app/inspector/`** (not under `[locale]/`) — it deep-links into `/[locale]/invoices`.
- `src/app/[locale]/(marketing)/page.tsx` — provided marketing-home shell (a few `t()`-driven strings); `generateMetadata` is `TODO(L4)`. Owner S3.
- `src/app/[locale]/(marketing)/pricing/page.tsx` and `.../features/page.tsx` — provided shells with `setRequestLocale` + a heading via `t()`; `generateMetadata` `TODO(L4)`. Owner S3.
- `src/app/[locale]/(marketing)/layout.tsx` — provided; `setRequestLocale`, renders children + a header with the locale switcher.
- `src/app/[locale]/(marketing)/opengraph-image.tsx` — **provided in full**: reads `locale` from params, `getTranslations({ locale, namespace: 'marketing.meta' })`, returns `ImageResponse` with the localized title. (Provided complete so S3 wires it via metadata, not authors the image.)
- `src/app/[locale]/(app)/invoices/page.tsx` — forked ch062 list page, moved under `[locale]/`. Its strings/dates/currency stay as ch062's English/`toLocaleString` baseline; `TODO(L2)` (route strings through `t()` + the counter) and `TODO(L3)` (dates/currency through the formatter, relative-due). Owner S1 (strings), S2 (formatting).
- `src/app/[locale]/(app)/invoices/locale-switcher.tsx` — **provided in full**: `'use client'`, renders the three locales each in their own language, calls `setLocaleAction` then a typed path swap via `usePathname`/`useRouter` from `@/i18n/navigation` preserving path + query. Provided complete so students focus on the action + wiring.
- `src/app/[locale]/(app)/invoices/actions.ts` — `TODO(L2)` `setLocaleAction` stub (`authedAction('member', z.strictObject({ locale: z.enum(SUPPORTED_LOCALES) }), …)` writing the store user's `locale` + the `NEXT_LOCALE` cookie). Owner S1.
- `src/app/[locale]/(app)/layout.tsx` — provided; `setRequestLocale`, mounts the locale switcher in the header, no auth wall (cookie session).
- `src/app/[locale]/layout.tsx` — see stub above (the locale root layout).
- `src/app/robots.ts` — provided: allow all; authed routes carry `noindex` per their metadata.
- The forked ch062 list internals (`toolbar.tsx`, `view-tabs.tsx`, `table.tsx`, `pagination.tsx`, `active-filter-chips.tsx`, `loading.tsx`, the `[id]/edit/*` surface) ship **complete and working** (this project does not re-teach the list mechanics) but move under `[locale]/(app)/invoices/`. They will need their hard-coded strings routed through `t()` in S1 and their date/currency cells through the formatter in S2 — mark those two transformation points `TODO(L2)`/`TODO(L3)` in `table.tsx` (the cell renderer) and any string-bearing control.

**Inspector additions (`src/app/inspector/page.tsx`, locale-agnostic, provided in full):** keep ch062's panels (row counts, identity switcher, reseed, audit tail) and add the i18n verification panels per the chapter outline's inspector spec, each with a `data-testid`:
- **Locale + tz override** — force-set the active user's `locale`/`timeZone`, deep-link to `/[locale]/invoices`.
- **DST-proof panel** — renders the two seeded DST instants side-by-side via `getFormatter` using the Instant→Date conversion (`new Date(instant.epochMilliseconds)` + `timeZone` option); with `timeZone='Europe/London'`, `2026-07-01T18:00:00Z` → `7:00 PM` BST, `2026-01-01T18:00:00Z` → `6:00 PM` GMT.
- **Currency-by-data panel** — 3 amounts × 3 locales = 9 cells (same amount, three currencies, locale-specific format).
- **Pluralization probe** — a count input driving each locale's `invoices.list.count` across 0, 1, 2, 5, 1000000 (French `many` at 1000000).
- **Source-HTML `hreflang` panel** — server-`fetch`es each marketing page, extracts `<link rel="alternate" hreflang>` tags into a table (self-ref, bidirectional, `x-default`).
- **Sitemap preview** — parses `/sitemap.xml`, shows the tree with `xhtml:link` alternates.
- **Static-vs-dynamic indicator** + **message-key audit** (greps for hard-coded JSX strings / raw `Intl.*` outside the seams) — both provided.

Because these panels read live i18n state, **provide them fully functional**; they are the inspector, not student work. The DST/currency/plural panels can render correctly the moment the formatter + catalog seams are wired (S2/S1); the `hreflang`/sitemap panels render correctly after S3 — that is the expected progression, not a failure.

**The `<html>` ownership (locked — exactly one `<html>` per route).** Because `/inspector` lives outside `[locale]/`, the standard next-intl split applies: the **root `src/app/layout.tsx` returns a bare `{children}` fragment** (no `<html>`/`<body>`), and each top-level segment renders its own document shell. `src/app/[locale]/layout.tsx` renders `<html lang={locale}>` + `<body>` + the providers (`<NuqsAdapter>`, `<ThemeProvider>`, `<Toaster>`) wrapping the scoped `NextIntlClientProvider`. `src/app/inspector/layout.tsx` (provided) renders `<html lang="en-US">` + `<body>` + the same providers for the locale-agnostic inspector, with the `NextIntlClientProvider` wrapped in a `<Suspense>` inside `<body>` (under Cache Components the server-rendered next-intl provider reads request config at the document boundary, which `loading.tsx` can't guard — see the locked decision). No layout other than these two renders `<html>`; this prevents the nested-`<html>` hydration break. `<NuqsAdapter>` is required in both shells (the ch062 toolbar's nuqs hooks throw without it).

Wrap each request-time store read under a segment `loading.tsx` (Cache Components needs the Suspense seam): ship `loading.tsx` for `[locale]/(app)/invoices`, `[locale]/(app)/invoices/[id]/edit`, and `/inspector`.

After scaffolding, `pnpm verify` passes and `pnpm dev` renders the "starter state": `/invoices` lists the ch062 surface in English (strings hard-coded, dates via `toLocaleString`, currency via the ch062 baseline). Because the routing mechanism is provided, `/fr-FR/invoices` *routes* (the layout renders) but every string is still English and `<html lang>` reads `en-US` — the stub `request.ts` resolves only en-US messages and the stub layout omits `setRequestLocale` — so the locale prefix has no visible effect yet. `/inspector` loads with its panels showing pre-build state. S1 turns the prefix into real per-locale rendering; this "routes-but-doesn't-localize" before-state is the honest starting point, not a 404.

## Slices

A lesson can map to one or more slices. The chapter outline's three build lessons map to three slices, one per lesson surface: S1 = L2 (routing + catalogs), S2 = L3 (dates + currency), S3 = L4 (SEO).

### Slice S1 — Wire next-intl and ship three catalogs

Stand up locale routing end-to-end so locale-prefixed URLs work, every UI string renders through `t()`, and the pluralized counter renders the right CLDR category per locale. After this slice `/` and `/fr-FR/` both load, `/invoices`/`/fr-FR/invoices`/`/en-GB/invoices` all route and render, the header locale switcher changes the user's locale + URL, and the counter renders `No invoices`/`1 invoice`/`5 invoices` (en-US) and `Aucune facture`/`1 facture`/`1 000 000 de factures` (fr-FR). **Dates and currency stay at the ch062 baseline here** (S2 transforms them) so the page renders end-to-end at the prefixed URL.

The routing mechanism (`routing.ts`, `navigation.ts`, `proxy.ts`, `global.ts`) is **already provided** (see Scaffolding recipe) — S1 builds the request-config seam, the catalogs, the layout, the strings, and the action on top of it.

In scope:
- `src/i18n/request.ts`: `getRequestConfig(async ({ requestLocale }) => { const requested = await requestLocale; const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale; const session = await getSession(); const timeZone = session.timeZone ?? 'UTC'; const messages = (await import(\`../messages/${locale}.json\`)).default; return { locale, messages, timeZone, formats }; })` — locale validated via `hasLocale`, messages dynamic-imported (code-split), `timeZone` from the session seam (the load-bearing project-specific beat), `formats` imported from `i18n/formats.ts`. (`getSession()` here stands in for the ch084 `auth()` seam; the conventions' session source.) **Do NOT return `now: new Date()` from the request config.** Under `cacheComponents: true`, the request config is evaluated by `getMessages()`/`getTranslations()`/`getFormatter()` (including in `[locale]/layout.tsx`'s static prerender), and a clock read there fails the build with `next-prerender-current-time` ("used `new Date()` before accessing … Request data"). next-intl's `now` is only the default anchor for `relativeTime`; S2 passes a per-render `now` at each `format.relativeTime` call site instead (after a dynamic read), which keeps the static shell prerenderable. (next-intl 4.13 + Next 16 Cache Components, June 2026.)
- `src/i18n/formats.ts`: minimal for this slice — `export const formats = { dateTime: { short: { dateStyle: 'medium' }, withTime: { dateStyle: 'medium', timeStyle: 'short' } }, number: { compact: { notation: 'compact' } } } as const satisfies Formats;`
- `src/app/[locale]/layout.tsx`: async; `export const generateStaticParams = () => routing.locales.map((locale) => ({ locale }));`; awaits `params`, validates the locale via `hasLocale` (else `notFound()`), calls `setRequestLocale(locale)` **before any other next-intl call**, awaits `getMessages()`, renders `<html lang={locale} suppressHydrationWarning><body>` + the providers + `<NextIntlClientProvider messages={pick(messages, ['nav','locale-switcher'])}>{children}</NextIntlClientProvider>`. `pick` is a tiny local helper (or `lodash/pick`) — scope the provider to the two client namespaces, not the full catalog.
- `src/app/[locale]/(app)/invoices/actions.ts`: `setLocaleAction = authedAction('member', z.strictObject({ locale: z.enum(SUPPORTED_LOCALES) }), async (input, ctx) => { /* update the store user's locale */ setUserLocale(ctx.userId, input.locale); (await cookies()).set('NEXT_LOCALE', input.locale, { path: '/', sameSite: 'lax' }); return ok(null); })` — writes both signals (store + cookie). Add a tiny `setUserLocale` mutator to `store.ts` if not present (scaffolder may pre-add it; if it's a stub, S1 implements the action against it).
- Route every hard-coded UI string on the invoices surface and its controls through `getTranslations('invoices.list')` (page) / `useTranslations(...)` (client controls), including the counter as `t('count', { count: rows.length })`. Status labels read from the catalog. Note in a comment: currency/date cells stay ch062-baseline until S2.
- `src/messages/en-GB.json`: **copy en-US in full**, then edit the ~15-key diff (colour, date-order phrasing, currency phrasing). It must contain every en-US key — next-intl does not fall back per-key across locales, so a gap throws `MISSING_MESSAGE` and fails the en-GB prerender.
- `src/messages/fr-FR.json`: fill the full French translation (every en-US key present), the counter as `"{count, plural, =0 {Aucune facture} one {# facture} many {# de factures} other {# factures}}"`, status labels `Brouillon / Envoyée / Réglée / En retard`.

Out of scope: date/currency formatting + relative-due (S2); `hreflang`/sitemap/OG (S3).

Contracts created: `getRequestConfig` (now resolves the real per-locale `messages` + session `timeZone` + `formats`), the three filled catalogs, `setLocaleAction`. (`routing`/`Locale`/navigation/`AppConfig` are provided contracts S1 consumes.) Selectors: `invoices-page`, `invoices-list`, `invoice-count`, `locale-switcher`, `locale-option-en-US`/`-en-GB`/`-fr-FR`, `invoice-status` (per row).

Screenshot: none (S2 captures the settled `/invoices` after currency + dates render per-locale — the last slice to change this surface's headline state for L2/L3).

### Slice S2 — Format dates in profile tz and currency from data

Move every invoice date and amount onto the formatter seam: dates render in the viewer's profile `timeZone`, amounts in the invoice's stored `currency` formatted for the viewer's locale, plus a relative-due column. After this slice `/invoices` for the `(en-US, America/New_York)` user shows `$1,234.56` and EDT/EST dates; switching to fr-FR reflows the same data to `1 234,56 €` (EUR) and `1 234,56 $US` (USD); switching the user to `Europe/London` in the inspector renders `2026-07-01T18:00:00Z` → `7:00 PM` BST and `2026-01-01T18:00:00Z` → `6:00 PM` GMT.

**next-intl ⇄ Temporal conversion (load-bearing — read first).** next-intl's `useFormatter`/`getFormatter` wrap `Intl.*` but the v4 API is documented for `Date`, **not** Temporal — pass a Temporal value straight in and behavior is unsupported. So the domain stays Temporal (the store holds `Instant`/`PlainDate`, the lesson's teaching model) and the **conversion happens at the formatter call site**. The DST correctness comes from the `timeZone` option, not from the value's type, so converting `Instant → Date` via `epochMilliseconds` is lossless and keeps the July/January fixture DST-accurate. The chapter outline's reference calls (`format.dateTime(instant, …)` and `format.relativeTime(days, 'day')`) are superseded by the calls below — do not revert to them.

In scope:
- The invoices page/table cell transformation, per row, with `const format = await getFormatter()` and `const tz = await getCurrentUserTimeZone()` read once at the top:
  - **Instant date:** `format.dateTime(new Date(row.createdAt.epochMilliseconds), { dateStyle: 'medium', timeStyle: 'short', timeZone: tz })`. **`timeZone` is mandatory** — omitting it falls back to the runtime tz (UTC) and silently mis-renders; it is also what makes the conversion DST-correct.
  - **Calendar date (`PlainDate`):** convert with `new Date(\`${row.dueDate.toString()}T00:00:00Z\`)` and format `{ dateStyle: 'medium', timeZone: 'UTC' }` — pinning `timeZone: 'UTC'` is mandatory here so the calendar day never shifts across the viewer's zone (a `PlainDate` is zone-independent; UTC-pinning preserves that).
  - **Amount:** `format.number(Number(row.amountMinor) / 100, { style: 'currency', currency: row.currency, currencyDisplay: 'narrowSymbol' })`.
  - **Relative-due:** compute the integer day delta with Temporal (the arithmetic teaching beat) — `const days = Temporal.Now.plainDateISO(tz).until(row.dueDate, { largestUnit: 'day' }).days;` — then render it through next-intl by handing the formatter two `Date`s and a fixed unit: `format.relativeTime(addDays(now, days), { now, unit: 'day' })`, where `now` is a stable per-render `Date` (`const now = new Date()` after `getCurrentUserTimeZone()` has read the session, so the clock read trails a dynamic source — required under Cache Components) and `addDays` is a tiny local helper (`new Date(now.getTime() + days * 86_400_000)`). This keeps both the Temporal-`largestUnit` lesson and the next-intl formatter discipline. next-intl's `relativeTime` applies CLDR `numeric: 'auto'` **internally and unconditionally** — it always emits "tomorrow"/"yesterday"/"in N days" specials; there is no `numeric` knob to set (next-intl's `RelativeTimeFormatOptions` accepts only `now`/`unit`/`style`/`numberingSystem`).
- `src/i18n/formats.ts` extended: add only `number.currency: { style: 'currency', currencyDisplay: 'narrowSymbol' }` (the `currency` tag stays at the call site — it is data). **Do not add a `relativeTime` key** — next-intl's `Formats` type has only `dateTime`/`number`/`list`/`displayName`, so `relativeTime: …` fails `tsc` (`Object literal may only specify known properties`); `relativeTime` has no preset/`Formats` slot in next-intl 4. Centralized so a UI-wide change is one edit. (Confirmed against next-intl 4.13 `Formats`/`RelativeTimeFormatOptions` types, June 2026.)
- The inspector DST + currency-by-data panels use the same conversion pattern (they were scaffolded; confirm they render the documented cells).

Out of scope: any `hreflang`/sitemap/OG (S3); live per-minute relative time (server-rendered list, fresh per navigation); Temporal arithmetic beyond the one `until` call.

Contracts: extends `i18n/formats.ts` presets; the invoices page now reads `getCurrentUserTimeZone`. Selectors: `invoice-amount`, `invoice-date`, `invoice-due-relative` (per row).

Screenshot:
- L2 (`/invoices`, desktop 1280×800, settled, `(en-US, America/New_York)` default user): the finished list in English — toolbar/tabs + rows with `$1,234.56` amounts and EDT/EST dates — the overview/L2 figure.
- L3 (`/fr-FR/invoices`, desktop 1280×800, settled, switched to the `(fr-FR, Europe/Paris)` user): the same list reflowed to French strings, `1 234,56 €` / `1 234,56 $US` amounts, and French dates — the L3 currency/tz figure.

### Slice S3 — Emit hreflang, sitemap alternates, and per-locale OG

Give the marketing surface its public SEO shape: bidirectional `hreflang` with `x-default`, a locale-specific canonical, a per-locale OG image, and a sitemap with per-locale alternates. After this slice view-source on any marketing page lists all three locales + `x-default` bidirectionally, the canonical of `/fr-FR/pricing` is `https://app.example.com/fr-FR/pricing` (not the default), `/sitemap.xml` carries one `<url>` per canonical path with an `<xhtml:link>` per locale, and `/fr-FR/`'s OG image renders French title text.

In scope:
- `src/lib/seo/alternates.ts`: `generateAlternates(pathname, currentLocale)` returning `{ canonical, languages }` — canonical is the **locale-specific** URL (`APP_URL + getPathname({ locale: currentLocale, href: pathname })`), `languages` is the full set keyed by BCP 47 tag built via `Object.fromEntries(routing.locales.map((l) => [l, APP_URL + getPathname({ locale: l, href: pathname })]))` plus `'x-default'` → the default-locale URL. The single seam every `generateMetadata` calls; building from `routing.locales` is what makes self-reference + bidirectionality hold by construction. `APP_URL` is a module constant `'https://app.example.com'` (no env validation in this project — see substrate note; comment that production would read it from validated `env`).
- Marketing `generateMetadata` (home, pricing, features): reads `locale` from `params`, `getTranslations({ locale, namespace: 'marketing.meta' })` for title/description, calls `generateAlternates(<path>, locale)`, assembles `openGraph` with `locale: bcp47ToOgLocale(locale)` and `alternateLocale` mapped over the other locales via `bcp47ToOgLocale`. `generateMetadata` is async (not a component).
- In-app `generateMetadata` (the `[locale]/(app)/layout.tsx` or invoices page): `robots: { index: false }` and **no** `alternates` — the discipline of declaring metadata everywhere even where the SEO surface is dark.
- `src/app/sitemap.ts`: `MetadataRoute.Sitemap` — one entry per canonical path (`/`, `/pricing`, `/features`) with `alternates.languages` mapped over `routing.locales` via `getPathname`. Root-level, **not** under `[locale]/`. Absolute URLs (prepend `APP_URL`).
- Wire the provided `opengraph-image.tsx` through the marketing metadata (it is authored; S3 confirms it is referenced and renders French text for `/fr-FR/`).
- Confirm the inspector source-HTML `hreflang` panel and sitemap preview now show the full, symmetric set.

Out of scope: nothing further — this completes the chapter acceptance bar.

Contracts: `generateAlternates(pathname, currentLocale)` → `{ canonical, languages }`; `app/sitemap.ts`. Selectors (inspector panels, already scaffolded): `hreflang-panel`, `hreflang-row`, `sitemap-preview`, `sitemap-url`.

Screenshot:
- L4 (`/inspector`, desktop 1280×800, state `hreflang-loaded`): the source-HTML `hreflang` panel showing three alternates + `x-default` per marketing page, bidirectionally — the L4 SEO figure. (Capture on the inspector because the rendered `hreflang` tags live in `<head>` and are not visible on the marketing page itself; the inspector table is the teaching surface.)

## Start derivation

Build `solution/` fully (all three slices), then derive `start/` by reverting only the student-owned files to stubs; every other file is byte-identical. Each stub body carries a `// TODO(L<n>) — <task>` marker (or the file's native comment syntax) so `rg "TODO" start/` enumerates the work; for JSON catalogs use a `_todo` string field (`{ "_todo": "TODO(L2) — fill the fr-FR translation incl the many branch" }`) since JSON has no comments.

Stub these (lesson owners in parens):
- `src/i18n/request.ts` (L2) — minimal `getRequestConfig` returning `{ locale:'en-US', messages: en-US default }` (so `start/` renders English). `// TODO(L2) — resolve locale via hasLocale, dynamic-import the locale's messages, timeZone from session, formats (no now: new Date() — breaks Cache Components prerender)`.
- `src/i18n/formats.ts` (L2/L3) — `export const formats = {} as const satisfies Formats`. `// TODO(L2) — dateTime/number(compact); TODO(L3) — number.currency (no relativeTime key — not in next-intl's Formats type)`.
- `src/app/[locale]/layout.tsx` (L2) — the working-but-hardcoded shell (`<html lang="en-US">` + providers + `{children}`, no `setRequestLocale`/`generateStaticParams`/scoped provider). `// TODO(L2) — generateStaticParams, hasLocale/notFound, setRequestLocale, <html lang={locale}>, scoped NextIntlClientProvider`.
- `src/app/[locale]/(app)/invoices/actions.ts` (L2) — `setLocaleAction` returns `err('internal','Not implemented')`. `// TODO(L2) — write store locale + NEXT_LOCALE cookie`.
- `src/app/[locale]/(app)/invoices/page.tsx` (L2/L3) — revert UI strings to hard-coded JSX and date/currency cells to the ch062 baseline. `// TODO(L2) — route strings through t() + counter via ICU plural; TODO(L3) — dates in profile tz + currency from data + relative-due`.
- `src/app/[locale]/(app)/invoices/table.tsx` (L2/L3) — same revert at the cell renderer. `// TODO(L2) — t() for labels/status; TODO(L3) — format.dateTime/number + relativeTime`.
- `src/messages/en-GB.json` (L2) — `{ "_todo": "TODO(L2) — diff against en-US (~15 keys: colour, date order)" }`.
- `src/messages/fr-FR.json` (L2) — `{ "_todo": "TODO(L2) — full French translation incl the plural many branch + =0" }`.
- `src/app/[locale]/(marketing)/page.tsx`, `pricing/page.tsx`, `features/page.tsx` (L4) — drop `generateMetadata`. `// TODO(L4) — generateMetadata with getTranslations + generateAlternates + per-locale OG`.
- `src/app/[locale]/(app)/layout.tsx` (L4) — drop the `robots:{index:false}` `generateMetadata`. `// TODO(L4) — generateMetadata robots noindex, no alternates`.
- `src/lib/seo/alternates.ts` (L4) — `generateAlternates` returns a placeholder `{ canonical:'', languages:{} }`. `// TODO(L4) — build canonical (locale-specific) + languages from routing.locales + x-default`.
- `src/app/sitemap.ts` (L4) — `return []`. `// TODO(L4) — one entry per canonical path with alternates.languages`.

Provided-and-identical in start (never stub): `src/i18n/routing.ts`, `src/i18n/navigation.ts`, `src/proxy.ts`, `src/global.ts`, `src/lib/temporal.ts`, `src/lib/user-time.ts`, `src/lib/i18n/supported.ts`, `src/lib/seo/og-locale.ts`, the whole `src/server/*` (store/session/types), `src/lib/result.ts`/`utils.ts`/`authed-action.ts`, the forked ch062 list internals (`toolbar`/`view-tabs`/`pagination`/`active-filter-chips`/`loading`/`[id]/edit/*` — these are working carry-in, not student work here), the locale-switcher component, the marketing layout + `opengraph-image.tsx`, `messages/en-US.json`, all `/inspector` files, root layout/providers/page, `robots.ts`, `src/components/ui/*`, all config, `scripts/`, `lesson-verification/` placeholders.

## Locked decisions

- **No DB, no auth wall, no Drizzle/Better Auth/Postgres.** Persistence is the in-memory `src/server/store.ts`; identity is the `acting-identity` cookie via `src/server/session.ts`, extended to carry `locale`/`timeZone`. Do not import `drizzle-orm`, `postgres`, `better-auth`, `@neondatabase/serverless`, `@t3-oss/env-nextjs`, or add `docker-compose.yml`/`.env`. This is the substrate that lets the surface render under `pnpm dev` with no bring-up.
- **Temporal via `lib/temporal.ts` only.** `Instant` for `createdAt`, `PlainDate` for `dueDate`; the polyfill (`temporal-polyfill`) is imported in exactly one file. That file's first line is `import 'temporal-polyfill/global';` (the side-effect import that both installs `globalThis.Temporal` at runtime and declares the ambient `Temporal` type namespace), then `import { Temporal as TemporalPolyfill } from 'temporal-polyfill';` and `export const Temporal = globalThis.Temporal ?? TemporalPolyfill;`. The global import is what makes `Temporal.Instant` / `Temporal.PlainDate` usable as **type** annotations across `types.ts`/`store.ts`/the page and stops `globalThis.Temporal` being a `TS7017` (no index signature) error — without it `tsc` fails with `TS2503 Cannot find namespace 'Temporal'`. No `Date` in domain code except the per-render relative-time anchor (`const now = new Date()` after a dynamic read, S2) and the third-party seam — **not** in `getRequestConfig` (breaks Cache Components prerender; see the locale decisions). Money is integer minor units (`amountMinor`), divided by 100 only at display. (temporal-polyfill 0.3.x, June 2026.)
- **Locale resolved once, in `proxy.ts`.** Downstream code reads only the resolved value (URL prefix → session `locale` → `NEXT_LOCALE` cookie → `Accept-Language` best-match → `en-US`). No `Accept-Language`/`navigator.language` read anywhere except (conceptually) sign-up. `routing` (from `defineRouting`) is the single source feeding both `createMiddleware` and `createNavigation`. `localePrefix: 'as-needed'` (default locale unprefixed, others prefixed).
- **Every UI string through `t()`/`t.rich`; never inline `Intl.*` in a component.** A hard-coded JSX string inside `app/[locale]/` is a finding. `en-US.json` is the source contract; en-GB/fr-FR are **complete** translations (every en-US key present — next-intl has no cross-locale per-key fallback; a gap throws `MISSING_MESSAGE` and fails prerender). Catalogs are **nested-object JSON** mirroring dot-paths (the shape ch084 L1 taught), not flat dot-keys — the outline's flat excerpts are shorthand only.
- **Pluralized counts use ICU `plural`, never a ternary.** `invoices.list.count` carries `=0`/`one`/`other` (English) and `=0`/`one`/`many`/`other` (French, CLDR); `#` is the formatted count, `other` mandatory.
- **Currency is data on the invoice; format follows the viewer's locale.** `format.number(..., { style:'currency', currency: row.currency, currencyDisplay:'narrowSymbol' })` — the `currency` tag at the call site (data), the display style in the shared preset. Never hard-code a currency or infer it from locale.
- **next-intl ⇄ Temporal: convert at the formatter call site.** next-intl v4's `useFormatter`/`getFormatter` are documented for `Date`, not Temporal; the domain stays Temporal and each formatter call converts (`new Date(instant.epochMilliseconds)` for instants; `new Date(\`${plainDate}T00:00:00Z\`)` for calendar dates). Never pass a Temporal value straight into `format.dateTime`/`format.relativeTime`. The chapter outline's `format.dateTime(instant, …)` / `format.relativeTime(days, 'day')` signatures are superseded.
- **`timeZone` is mandatory on every instant `dateTime` call**, sourced from the session profile via `getCurrentUserTimeZone()` / `getRequestConfig` — it does the wall-clock/DST work after the Instant→Date conversion. Calendar-date (`PlainDate`) calls pin `timeZone: 'UTC'` so the day never shifts. Omitting `timeZone` on an instant is the silent-UTC bug the seam prevents.
- **`setRequestLocale(locale)` first in every `page.tsx`/`layout.tsx` under `app/[locale]/`** (nested included) — before any next-intl call; skipping it silently converts the route to dynamic. `<html lang>` is driven from the resolved URL param, never the cookie (hydration mismatch). `NextIntlClientProvider` is scoped via `pick` to the client namespaces only.
- **Narrow the `locale` param before handing it to next-intl, in every segment.** `defineRouting({ locales: SUPPORTED_LOCALES … })` types next-intl's `Locale` as the `'en-US'|'en-GB'|'fr-FR'` union (independent of the `AppConfig` augmentation), so `setRequestLocale`, `getTranslations({ locale })`, and `getMessages` all reject a raw `string`. Every `page.tsx`/`layout.tsx`/`generateMetadata`/`opengraph-image.tsx` under `[locale]/` types `params` as `Promise<{ locale: string }>`, then `const { locale } = await params; if (!hasLocale(routing.locales, locale)) notFound();` (or, in `generateMetadata`/`opengraph-image` where `notFound()` is awkward, fall back to `routing.defaultLocale`) **before** the first next-intl call — that one check both 404s unknown locales and narrows `string → Locale` so `tsc` passes. (next-intl 4.13, June 2026.)
- **next-intl does NOT auto-fall-back across locales — a missing key throws.** A key absent from the active catalog raises `MISSING_MESSAGE`, which **fails `next build` during prerender** (not just a console warning). So `en-GB.json` and `fr-FR.json` must each carry **every key `en-US.json` carries** (en-GB is a near-copy of en-US with the ~15-key diff, not a sparse override). The `start/` stubs are therefore the only place an empty/partial catalog is allowed — and `start/` must not statically render a `[locale]` page that reads those catalogs at a non-default locale until S1 fills them (the provided stub `request.ts` resolves only en-US, so the unfilled en-GB/fr-FR routes are not prerendered in the starter state). Do not rely on per-key cross-locale fallback; there is none without a custom `getMessageFallback`. (next-intl 4.13, June 2026.)
- **The locale-agnostic `/inspector` shell wraps its `NextIntlClientProvider` in `<Suspense>`.** `src/app/inspector/layout.tsx` renders `<html lang="en-US"><body><Suspense><NextIntlClientProvider locale="en-US" messages={…}>{children}</NextIntlClientProvider></Suspense></body></html>`. Under `cacheComponents: true` the server-rendered `NextIntlClientProvider` reads request configuration at the document (`<html>/<body>`) boundary even with explicit `locale`/`messages` props, which a page-level `loading.tsx` cannot guard — the `<Suspense>` boundary inside `<body>` is required or `next build` fails the inspector with "Uncached data was accessed outside of `<Suspense>`". (The `[locale]/layout.tsx` provider is exempt: `setRequestLocale(locale)` runs there first, satisfying the prerender.) (next-intl 4.13 + Next 16 Cache Components, June 2026.)
- **Canonical is the locale-specific URL; `hreflang` is bidirectional with `x-default`.** `generateAlternates` builds the full set from `routing.locales` in one place; every marketing `generateMetadata` calls it verbatim — never hand-assemble tags, never collapse canonical to the default (the silent ranking-killer). OG locale uses the underscore form via `bcp47ToOgLocale`. Authed routes declare `robots:{index:false}` and no `alternates`. The sitemap is root-level (`app/sitemap.ts`), one entry per canonical path.
- **`/inspector` is locale-agnostic** at `src/app/inspector/` (not under `[locale]/`); it deep-links into `/[locale]/invoices`. It and the marketing `opengraph-image.tsx` + locale-switcher are provided complete (not student work).
- **Layout invariant: any region a layout places as a single slot resolves to a single wrapping element.** The `[locale]/(app)` invoices layout renders the list region as one element; the toolbar/table/pagination compose inside it, never becoming extra top-level grid/flex items. (No parallel routes here — plain CSS layout, no `@slot`.)
- **Forms.** Uncontrolled inputs (`defaultValue`), `<form action={dispatch}>` driven by `useActionState`; `authedAction`'s `(prev, formData) => Promise<Result>` shape is bound through `useActionState`, never passed straight to `action`. `setLocaleAction` is `authedAction('member', …)`.
- **Stable selectors via `data-testid`.** Every surface a rendered check or screenshot reads exposes a `data-testid`; reads use these, never positional/structural selectors. Canonical ids: `invoices-page`, `invoices-list`, `invoice-row`, `invoice-count`, `invoice-status`, `invoice-amount`, `invoice-date`, `invoice-due-relative`, `locale-switcher`, `locale-option-{en-US,en-GB,fr-FR}`, `inspector-page`, `dst-panel`, `dst-cell-bst`, `dst-cell-gmt`, `currency-grid`, `currency-cell`, `plural-probe`, `plural-probe-input`, `plural-probe-output`, `hreflang-panel`, `hreflang-row`, `sitemap-preview`, `sitemap-url`.
- **Toolchain constraints (from `documentation/code standards/Toolchain constraints.md`):** `tsconfig` pins `"jsx":"react-jsx"`, `"skipLibCheck":true`, `"incremental":true`, no `baseUrl` (TS6 makes it a hard error; `paths` resolves under `moduleResolution:"bundler"`), `include` carries both `.next/types/**/*.ts` and `.next/dev/types/**/*.ts`. `next.config.ts` sets `reactCompiler:true` (needs `babel-plugin-react-compiler` devDep), `turbopack.root:__dirname`, `typedRoutes:true` — construct dynamic `href`s through the typed `getPathname`/`Link` from `@/i18n/navigation` (which return typed routes) or cast `as Route`; template-literal hrefs need a cast (pre-state it). `next-env.d.ts` excluded from Biome (`files.includes` with `!next-env.d.ts`, no trailing `/**`). Biome `css.parser.tailwindDirectives:true`. The `globalThis` lazy-init for the store splits into two statements (`biome` `noAssignInExpressions`): `globalThis.__store ??= seed();` then `const store = globalThis.__store;`. shadcn primitives ship `'use client'` + double quotes (normalize via `pnpm check`); any `'use client'` file count must include `components/ui/*`. `pnpm-workspace.yaml` keeps `allowBuilds:{ sharp:true, '@parcel/watcher':false, '@swc/core':false }` — next-intl 4.13 drags `@swc/core`/`@parcel/watcher` (both prebuilt, both with native build scripts pnpm 11.3 won't run unattended), so an unlisted/placeholder entry hard-fails cold `next build` via `ERR_PNPM_IGNORED_BUILDS`. Pages reading request-time store data ship a segment `loading.tsx`.
- **Versions (pinned):** next `16.2.7`, react/react-dom `19.2.4`, next-intl `^4.5.0`, temporal-polyfill `^0.3.0`, nuqs `^2.8.9`, zod `^4.4.3`, typescript `^6.0.3`, biome `2.4.16`, vitest `^4.1.8`, radix-ui `^1.4.3`, lucide-react `^1.17.0`, babel-plugin-react-compiler `1.0.0`, pnpm `11.3.0`. No lucide brand icons.

## File tree

```
solution/
  package.json                                       [scaffold]
  next.config.ts                                     [scaffold]
  tsconfig.json                                      [scaffold]
  biome.json                                         [scaffold]
  vitest.config.ts                                   [scaffold]
  pnpm-workspace.yaml                                [scaffold]
  postcss.config.mjs                                 [scaffold]
  next-env.d.ts                                      [scaffold]
  AGENTS.md                                          [scaffold]
  components.json                                    [scaffold]
  scripts/
    test-lesson.mjs                                  [scaffold]
  lesson-verification/
    Lesson 2.ts … Lesson 4.ts                        [scaffold placeholders; lesson-test-coder fills]
  src/
    global.ts                                        [scaffold]
    proxy.ts                                          [scaffold]
    i18n/
      routing.ts                                     [scaffold]
      navigation.ts                                  [scaffold]
      request.ts                                     [scaffold stub, edited by: S1]
      formats.ts                                     [scaffold stub, edited by: S1, S2]
    messages/
      en-US.json                                     [scaffold — full source catalog]
      en-GB.json                                     [scaffold stub, edited by: S1]
      fr-FR.json                                     [scaffold stub, edited by: S1]
    app/
      layout.tsx                                     [scaffold — bare {children} fragment, no <html>]
      sitemap.ts                                     [scaffold stub, edited by: S3]
      robots.ts                                      [scaffold]
      globals.css                                    [scaffold]
      [locale]/
        layout.tsx                                   [scaffold stub, edited by: S1 — renders <html lang> + providers]
        (marketing)/
          layout.tsx                                 [scaffold]
          page.tsx                                   [scaffold, edited by: S3]
          opengraph-image.tsx                        [scaffold — full]
          pricing/page.tsx                           [scaffold, edited by: S3]
          features/page.tsx                          [scaffold, edited by: S3]
        (app)/
          layout.tsx                                 [scaffold, edited by: S3]
          invoices/
            page.tsx                                 [scaffold, edited by: S1, S2]
            loading.tsx                              [scaffold]
            toolbar.tsx                              [scaffold — carry-in]
            view-tabs.tsx                            [scaffold — carry-in]
            active-filter-chips.tsx                  [scaffold — carry-in]
            pagination.tsx                           [scaffold — carry-in]
            table.tsx                                [scaffold, edited by: S1, S2]
            locale-switcher.tsx                      [scaffold — full]
            actions.ts                               [scaffold stub, edited by: S1]
            [id]/edit/
              page.tsx                               [scaffold — carry-in]
              loading.tsx                            [scaffold]
              edit-form.tsx                          [scaffold — carry-in]
              conflict-banner.tsx                    [scaffold — carry-in]
      inspector/
        layout.tsx                                   [scaffold — <html lang="en-US"> + providers; NextIntlClientProvider wrapped in <Suspense>]
        page.tsx                                     [scaffold — full]
        loading.tsx                                  [scaffold]
        actions.ts                                   [scaffold]
      _components/
        providers.tsx                                [scaffold]
        submit-button.tsx                            [scaffold]
    components/ui/                                    [scaffold — shadcn primitives]
    lib/
      result.ts                                      [scaffold]
      utils.ts                                       [scaffold]
      authed-action.ts                               [scaffold]
      temporal.ts                                    [scaffold]
      user-time.ts                                   [scaffold]
      i18n/
        supported.ts                                 [scaffold]
      seo/
        og-locale.ts                                 [scaffold]
        alternates.ts                                [scaffold stub, edited by: S3]
      invoices/
        search-params.ts                             [scaffold — carry-in]
        scoped-query.ts                              [scaffold — carry-in]
        queries.ts                                   [scaffold — carry-in]
        actions.ts                                   [scaffold — carry-in]
    server/
      types.ts                                       [scaffold]
      store.ts                                       [scaffold]
      session.ts                                     [scaffold]
```

## Verification

### Static checks (reviewer-run)

- both: `pnpm verify` exits 0 in `solution/` and `start/` (biome ci + tsc --noEmit + next build).
- both: `pnpm test:lesson 2` runs exactly one file (`lesson-verification/Lesson 2.ts`), not all — confirms the runner narrows.
- both: `rg -n "drizzle-orm|from 'postgres'|better-auth|@neondatabase|@t3-oss/env" solution/src start/src` returns nothing — substrate decision held.
- both: `rg -n "from 'temporal-polyfill'" solution/src start/src` matches only `src/lib/temporal.ts` — the single polyfill seam.
- start: `rg -n "TODO\(L[2-4]\)" start/src | wc -l` ≥ 12 — every student source file carries its marker; `rg "TODO" solution/src` returns nothing; `rg -n "_todo" start/src/messages` matches en-GB + fr-FR.
- both: `rg -q "localePrefix: 'as-needed'" solution/src/i18n/routing.ts start/src/i18n/routing.ts` — routing uses the chosen prefix mode in both (provided mechanism; fails inert if mis-wired).
- solution: `rg -q "hasLocale" solution/src/i18n/request.ts` — the request config validates the incoming locale (fails if it trusts the raw string); absent in `start/` (the stub returns a fixed locale).
- solution: `rg -q "setRequestLocale" solution/src/app/\[locale\]/layout.tsx` — the layout re-enables static rendering (fails if marketing silently goes dynamic).
- solution: `rg -q "plural" solution/src/messages/fr-FR.json` and `rg -q "many" solution/src/messages/fr-FR.json` — French uses ICU plural with the `many` branch (fails if the counter ships a ternary or drops `many`).
- solution: `rg -q "timeZone: tz" solution/src/app/\[locale\]/\(app\)/invoices/*.tsx` (or the table) — date formatting passes the profile tz (fails inert if every date renders in UTC).
- solution: `rg -q "currency: row.currency" solution/src/app/\[locale\]/\(app\)/invoices/*.tsx` (or the table) — currency comes from the row (fails if hard-coded `'USD'`).
- solution: `rg -q "currencyDisplay" solution/src/i18n/formats.ts` — the narrow-symbol preset lives in the shared formats.
- solution: `rg -q "x-default" solution/src/lib/seo/alternates.ts` and `rg -q "getPathname" solution/src/lib/seo/alternates.ts` — `hreflang` includes `x-default` and is built from the routing helper (fails if hand-assembled or missing `x-default`).
- solution: `rg -q "canonical" solution/src/lib/seo/alternates.ts` and confirm it uses `currentLocale` (not `defaultLocale`) — canonical is locale-specific (fails the duplicate-content trap).
- solution: `rg -q "alternates" solution/src/app/sitemap.ts` and `rg -q "MetadataRoute.Sitemap" solution/src/app/sitemap.ts` — the sitemap emits per-locale alternates (fails if it ships one flat list).
- solution: `rg -q "robots" solution/src/app/\[locale\]/\(app\)/layout.tsx` with `index: false` — authed routes are noindex.
- both: `rg -q "createMiddleware" solution/src/proxy.ts start/src/proxy.ts` — locale negotiation runs in the proxy (provided mechanism, present in both).
- solution: `rg -q "NEXT_LOCALE" solution/src/app/\[locale\]/\(app\)/invoices/actions.ts` — the switch action writes the cookie signal.

### Rendered checks (slice coders + inspector run against the running app)

- id `r-locale-routes` · slice S1 · route `/fr-FR/invoices` · viewport 1280×800 · state settled · intent: the `[locale]` segment routes a non-default locale end-to-end. · selectors: `invoices-page`, `invoices-list` · assertion: `/fr-FR/invoices` returns 200 and renders `invoices-page` with at least one `invoice-row`; `document.documentElement.lang === 'fr-FR'`.
- id `r-html-lang` · slice S1 · route `/invoices` and `/en-GB/invoices` · viewport 1280×800 · state settled · intent: `<html lang>` matches the URL prefix every render. · selectors: (none — reads `documentElement.lang`) · assertion: at `/invoices` `documentElement.lang === 'en-US'`; at `/en-GB/invoices` it is `'en-GB'`.
- id `r-strings-translated` · slice S1 · route `/fr-FR/invoices` · viewport 1280×800 · state settled · intent: every UI string renders from the catalog, not hard-coded English. · selectors: `invoices-page`, `invoice-status` · assertion: the page heading and at least one `invoice-status` render French text (e.g. a status reads one of `Brouillon/Envoyée/Réglée/En retard`), with no visible hard-coded English label on the surface.
- id `r-plural-cldr` · slice S1 · route `/inspector` · viewport 1280×800 · state `plural-probe` · intent: the counter walks CLDR categories per locale including French `many` and the `=0` override. · selectors: `plural-probe-input`, `plural-probe-output` · assertion: setting the probe to 0/1/5 yields en-US `No invoices`/`1 invoice`/`5 invoices`; setting 0/1/1000000 yields fr-FR `Aucune facture`/`1 facture`/`1 000 000 de factures`.
- id `r-locale-switch` · slice S1 · route `/invoices?status=paid` · viewport 1280×800 · state settled · intent: the switcher preserves path + query and re-prefixes the URL. · selectors: `locale-switcher`, `locale-option-fr-FR` · assertion: activating `locale-option-fr-FR` navigates to `/fr-FR/invoices?status=paid` (path and query preserved) and the page re-renders in French.
- id `r-currency-by-data` · slice S2 · route `/inspector` · viewport 1280×800 · state settled · intent: the same amount renders per-locale by the invoice's currency, not the viewer's. · selectors: `currency-grid`, `currency-cell` · assertion: the 3×3 `currency-grid` shows a EUR amount as `1 234,56 €` in the fr-FR row and `€1,234.56` in the en-US row, and a USD amount as `1 234,56 $US` in the fr-FR row and `$1,234.56` in the en-US row (NBSP thousands in fr-FR).
- id `r-dst-walltime` · slice S2 · route `/inspector` · viewport 1280×800 · state settled (active user tz `Europe/London`) · intent: DST-spanning instants render the correct wall-clock for the profile tz. · selectors: `dst-panel`, `dst-cell-bst`, `dst-cell-gmt` · assertion: with `timeZone='Europe/London'`, `dst-cell-bst` (the `2026-07-01T18:00:00Z` row) reads `7:00 PM` and `dst-cell-gmt` (the `2026-01-01T18:00:00Z` row) reads `6:00 PM`; switching the override to `America/New_York` shifts them to `2:00 PM` / `1:00 PM`.
- id `r-invoice-row-formatted` · slice S2 · route `/fr-FR/invoices` · viewport 1280×800 · state settled (`(fr-FR, Europe/Paris)` user) · intent: list rows render localized amount + date + relative-due together. · selectors: `invoice-row`, `invoice-amount`, `invoice-date`, `invoice-due-relative` · assertion: a row shows an `invoice-amount` with a comma decimal separator and the currency symbol, an `invoice-date` in French medium format, and an `invoice-due-relative` reading a French relative phrase (e.g. `dans N jours` / `il y a N jours`).
- id `r-invoices-mobile` · slice S2 · route `/fr-FR/invoices` · viewport 375×812 · state settled · intent: the list region holds together as one element on mobile (no slot-splitting). · selectors: `invoices-page`, `invoices-list` · assertion: `invoices-list` is a single element containing the rows; the toolbar/table/pagination are nested within the list region, not siblings of it at the page root.
- id `r-hreflang-symmetric` · slice S3 · route `/inspector` · viewport 1280×800 · state `hreflang-loaded` · intent: every marketing page emits self-referential, bidirectional `hreflang` + `x-default`. · selectors: `hreflang-panel`, `hreflang-row` · assertion: for each marketing path the panel lists exactly four `hreflang-row`s (`en-US`, `en-GB`, `fr-FR`, `x-default`); the fr-FR page lists en-US and en-GB (bidirectional) and self-references fr-FR; `x-default` points at the default-locale (`/`) URL.
- id `r-canonical-locale-specific` · slice S3 · route `/fr-FR/pricing` · viewport 1280×800 · state settled · intent: the canonical is the locale-specific URL, not the default. · selectors: (none — reads `<head>`) · assertion: the rendered `<link rel="canonical">` href ends with `/fr-FR/pricing` (contains the `fr-FR` prefix), not the unprefixed default.
- id `r-sitemap-alternates` · slice S3 · route `/inspector` · viewport 1280×800 · state settled · intent: the sitemap carries per-locale alternates per canonical path. · selectors: `sitemap-preview`, `sitemap-url` · assertion: the preview shows one `sitemap-url` per canonical path (`/`, `/pricing`, `/features`), each listing three `xhtml:link` alternates (one per locale).
- id `r-og-french` · slice S3 · route `/fr-FR/` (marketing home) · viewport 1280×800 · state settled · intent: per-locale OG image + underscore locale tag ship on marketing. · selectors: (none — reads `<head>`) · assertion: the rendered `og:locale` is `fr_FR` (underscore form) and the `og:image` URL resolves to the `/fr-FR` opengraph image; fetching that image returns an image whose rendered title text is French.
- id `r-inspector` · slice S2 · route `/inspector` · viewport 1280×800 · state settled · intent: the verification surface renders its i18n panels. · selectors: `inspector-page`, `dst-panel`, `currency-grid`, `plural-probe` · assertion: all four are present and populated (the DST panel shows two cells, the currency grid nine, the plural probe an input + output).
