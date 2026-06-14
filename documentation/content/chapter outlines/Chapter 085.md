# Chapter 085 — Project: tri-locale invoices list

## Chapter framing

Chapter 085 cashes in Unit 17 as one runnable surface. chapter 083's storage/domain/edge split (`timestamptz` ↔ `Temporal.Instant`, a per-user `timeZone` profile field, mandatory `timeZone` argument on every formatter) and chapter 084's i18n discipline (translation keys, ICU MessageFormat with CLDR plural categories, the `Intl.*` family, the five-step locale negotiation chain, next-intl 4 on Next.js 16, `alternates.languages`) all converge here. The student takes the chapter 062 invoices list (URL-state filters, soft-delete, `version` concurrency) and lifts it into a tri-locale, tz-aware surface: `en-US`, `en-GB`, `fr-FR` shipped from day one, every string flowing through `t()`, every number through `useFormatter().number`, every date through `useFormatter().dateTime` with the user's profile `timeZone` read from the session, `hreflang` and per-locale sitemap entries emitted from `generateMetadata` and `app/sitemap.ts`. The data substrate is the chapter 062 in-memory store (`src/server/store.ts`) read through a cookie-driven dev session (`src/server/session.ts`, the `acting-identity` cookie) — there is no Postgres, Better Auth, or Docker; the store stands in for the database so the surface renders under `pnpm dev` with no provisioning. Each build slice closes on a state the student can confirm in the browser or the inspector: the locale-routing slice ends with the `[locale]` segment live, the negotiation middleware rewriting URLs, three catalogs translating every UI string, and the pluralized "N invoices" counter rendering per locale; the formatting slice ends with every invoice date displayed in the user's profile tz and every amount formatted per-locale with the invoice's stored currency; the SEO slice ends with `hreflang` in the rendered HTML and a sitemap with per-locale entries.

### Project goals

The project is done when the student can confirm each of these behaviors in the running app and the inspector:

- Switching the profile locale to `fr-FR` re-renders the list with French strings, French status labels, and the comma decimal separator; the URL becomes `/fr-FR/invoices`, the store user's `locale` updates, and the `NEXT_LOCALE` cookie is set.
- The same `currency` data renders per-locale: EUR `1234.56` shows `'1 234,56 €'` (NBSP thousands) in fr-FR, the same data shows `'1 234,56 $'` for a USD invoice in fr-FR (narrow symbol), and `'£1,234.56'` in en-GB — currency is data on the invoice, format follows the viewer's locale.
- Due dates straddling EU DST render the correct wall-clock for the user's profile `timeZone`: for a `Europe/London` user, `2026-07-01T18:00:00Z` shows `'7:00 PM'` BST and `2026-01-01T18:00:00Z` shows `'6:00 PM'` GMT; switch the user to `America/New_York` and the same instants show `'2:00 PM'` EDT and `'1:00 PM'` EST.
- The pluralized counter respects CLDR per language: en-US shows `'No invoices'` / `'1 invoice'` / `'5 invoices'`; fr-FR shows `'Aucune facture'` / `'1 facture'` / `'1 000 000 de factures'` (the `many` branch).
- Rendered HTML emits bidirectional `<link rel="alternate" hreflang>` plus `x-default` for all three locales on every marketing page, with self-reference present.
- The canonical URL is the locale-specific URL: `curl /fr-FR/pricing | grep canonical` returns `https://app.example.com/fr-FR/pricing`, not the default.
- `<html lang>` matches the URL prefix every render: `/fr-FR/invoices` yields `<html lang="fr-FR">`, an unprefixed path yields `<html lang="en-US">`, `/en-GB/invoices` yields `<html lang="en-GB">`.
- The locale switcher preserves the path and query: at `/invoices?status=paid&cursor=abc123`, switching to French lands `/fr-FR/invoices?status=paid&cursor=abc123`.
- The sitemap at `/sitemap.xml` carries one `<url>` per canonical path with a `<xhtml:link rel="alternate" hreflang>` per locale; marketing OG images render per-locale.
- Marketing routes stay statically rendered across all three locales (the invoices surface is dynamic because it reads `searchParams` and the session cookie).
- Anonymous negotiation works: a private window with browser language `fr-FR` visiting `/` is redirected to `/fr-FR/`; an unsupported `pt-BR` falls back to `en-US` and loads `/` unprefixed; the locale survives refresh and a cookie clear because the URL prefix is the strongest signal.
- The structural-discipline audits are green: zero hard-coded JSX strings inside `app/[locale]/`, zero `Date.prototype.toLocaleString` or raw `Intl.*` outside `i18n/`, `lib/temporal.ts`, and the inspector.

### Cross-cutting discipline (threads through every lesson)

**Locale is resolved once in middleware** (`src/proxy.ts`); downstream code reads only the resolved value — never `Accept-Language` or `navigator.language` outside the sign-up form. **The user's `timeZone` is a profile field** on the store user (lesson 3 of chapter 083) read at each formatter call site via `getCurrentUserTimeZone()` — not piped through `getRequestConfig`, which stays prerender-safe and returns only `{ locale, messages, formats }`. The page reads the tz once on the server and threads it (plus a stable `now` and a per-row day delta) into the client table where `useFormatter` renders. **Every UI string goes through `t()` or `t.rich`** — a grep for hard-coded JSX strings is a finding; `en-US.json` is the source contract, the other two are translations. **Pluralized counts use ICU `plural`**, never a ternary; `invoices.list.count` carries `=0 / one / other` for English and `=0 / one / many / other` for French (CLDR). **Currency is data on the invoice** — `invoice.currency` rendered via `Intl.NumberFormat(locale, { style: 'currency', currency, currencyDisplay: 'narrowSymbol' })`; the same amount renders as `'$1,234.56'` in en-US and `'1 234,56 €'` in fr-FR. **Dates are `Temporal.Instant` from the store, formatted at the edge** with the user's profile `timeZone` — never the request's; the DST-spanning fixture (`2026-07-01T18:00:00Z` vs `2026-01-01T18:00:00Z` rendered in `Europe/London`) is the load-bearing verification. **Canonical URL is the locale-prefixed URL** (not the default); `hreflang` is bidirectional with `x-default`; `<html lang>` matches the URL prefix every render.

### Dependency carry-in

- **From chapter 062:** `app/[locale]/(app)/invoices/page.tsx` Server Component (URL-state filters via nuqs, status filter, cursor pagination), `listInvoices` / `getInvoiceDetail` / `toInvoiceRow` in `lib/invoices/queries.ts`, the `scopedInvoices(orgId)` query builder, soft-delete via `deletedAt`, the `version`-precondition update action plus `archiveInvoice` / `restoreInvoice` / `softDeleteInvoice` in `lib/invoices/actions.ts`. Invoices are plain objects in the in-memory store with a `currency` text field and a `dueDate` per row.
- **From lesson 1 of chapter 083 / lesson 2 of chapter 083:** `lib/temporal.ts` seam — `Temporal` (polyfill or global), `instantFromString` / `plainDateFromString`; store invoices carry `createdAt` as `Temporal.Instant` and `dueDate` as `Temporal.PlainDate`.
- **From lesson 3 of chapter 083:** the store user's `timeZone` field (IANA); `getCurrentUserTimeZone()` / `getCurrentUserLocale()` helpers in `lib/user-time.ts` (react `cache`, read off the session).
- **From lesson 1 of chapter 084–lesson 3 of chapter 084:** key naming `feature.surface.role`; one-string-one-key; named placeholders; `t.rich` for embedded markup; ICU `plural` with CLDR categories and `=0` exact-match override (`#` for formatted count, `other` mandatory); `Intl.NumberFormat` currency (`style: 'currency'`, `currencyDisplay: 'narrowSymbol'`, `currency` from data); `Intl.DateTimeFormat` Temporal-native with mandatory `timeZone`; `Intl.RelativeTimeFormat` with `numeric: 'auto'`; construct-once via `useFormatter`.
- **From lesson 4 of chapter 084 / lesson 5 of chapter 084:** five-step negotiation chain (URL → profile → cookie → `Accept-Language` best-match → default); the store user's `locale` paired with `timeZone`; `defineRouting` with `localePrefix: 'as-needed'`; `createMiddleware` in `src/proxy.ts`; `getRequestConfig` returning `{ locale, messages, formats }` (no `timeZone`/`now` — read at the call site); `setRequestLocale` for static rendering; `generateStaticParams` per-locale; `useTranslations` / `getTranslations`; typed `Link` / `redirect` / `usePathname` from `createNavigation`; the `AppConfig` type augmentation in `src/global.ts` (`Locale`, `Messages` from `en-US.json`, `Formats` from `formats.ts`).
- **From lesson 6 of chapter 084:** `alternates.languages` with self-reference + bidirectional + `x-default`; canonical is the locale-specific URL; `MetadataRoute.Sitemap` with `alternates.languages`; `og:locale` underscore form.
- **From chapter 057 / chapter 042:** `authedAction(role, schema, fn)` wrapping session → RBAC → parse → fn, with `AuthedCtx = { session, orgId, userId, role }`; Zod 4 `strictObject`; canonical `Result<T>`. The session is the cookie-driven dev `getSession()` (no Better Auth, no `tenantDb`, no `logAudit`); the inspector writes audit rows directly via `pushAudit`.

### Starter file tree

The start and solution share an identical file tree — no files are added across the project. The routing/navigation source of truth, the proxy, the global type augmentation, the SEO seams, the sitemap, the session/store substrate, and the full inspector are all **provided and working** in the start. The student's work is the in-file deltas marked `TODO(L2)` / `TODO(L3)` / `TODO(L4)` below — wire the request-config dynamic import, fill the two catalogs and the format presets, route strings through `t()`, finish the `[locale]/layout.tsx` (`<html lang>` + scoped provider), write the `setLocaleAction` body, move dates/currency onto the formatter seam, and add SEO metadata. The start boots green: it routes the carry-in list but every locale still resolves to the en-US catalog with `<html lang="en-US">`, the honest "routes-but-doesn't-localize" before-state.

```
next.config.ts                    # provided: cacheComponents, typedRoutes, reactCompiler,
                                  #           createNextIntlPlugin('./src/i18n/request.ts')
package.json                      # provided: next-intl@^4, nuqs, temporal-polyfill (no DB deps)
vitest.config.ts / biome.json / tsconfig.json / components.json   # provided
src/
  global.ts                       # provided: augments next-intl AppConfig (Locale, Messages, Formats)
  proxy.ts                        # provided: createMiddleware(routing); matcher excludes inspector
  i18n/
    routing.ts                    # provided: defineRouting, localePrefix 'as-needed'
    navigation.ts                 # provided: createNavigation exports
    request.ts                    # TODO(L2): real per-locale dynamic import (start hard-codes en-US)
    formats.ts                    # TODO(L2) dateTime/number(compact); TODO(L3) number.currency
  lib/
    temporal.ts                   # provided: Temporal + instantFromString/plainDateFromString
    user-time.ts                  # provided: getCurrentUserTimeZone, getCurrentUserLocale (react cache)
    authed-action.ts              # provided: AuthedCtx = { session, orgId, userId, role }
    result.ts                     # provided: Result<T> + ok/err/conflict
    i18n/supported.ts             # provided: SUPPORTED_LOCALES = ['en-US','en-GB','fr-FR'] as const
    invoices/                     # provided (chapter 062): search-params, scoped-query, queries, actions
    seo/
      alternates.ts               # provided: generateAlternates(pathname, locale); APP_URL constant
      og-locale.ts                # provided: bcp47ToOgLocale ('fr-FR' -> 'fr_FR')
  server/
    types.ts                      # provided: Invoice, UserProfile, Role, roleAtLeast, etc.
    session.ts                    # provided: cookie-driven getSession (acting-identity cookie)
    store.ts                      # provided: in-memory "Postgres" — 4 users (4 locale/tz pairs incl
                                  #           fr-FR/Pacific/Auckland), 30 invoices/org USD/GBP/EUR mix,
                                  #           2 DST fixtures, 1 archived, 1 deleted; reseed()
  messages/
    en-US.json                    # provided: full source catalog
    en-GB.json                    # TODO(L2): diff against en-US (~15 keys: colour, date order)
    fr-FR.json                    # TODO(L2): full French translation with ICU plurals (many branch)
  app/
    layout.tsx                    # provided: bare root (each segment owns its <html>/<body>)
    robots.ts                     # provided: allow all, sitemap URL
    sitemap.ts                    # provided: MetadataRoute.Sitemap, PATHS × locales w/ xhtml:link
    [locale]/
      layout.tsx                  # provided shell (generateStaticParams, setRequestLocale, NuqsAdapter);
                                  #   TODO(L2): drive <html lang={locale}> + scope provider via pick()
      (marketing)/
        layout.tsx                # provided: header nav + LocaleSwitcher
        opengraph-image.tsx       # provided: per-locale OG via getTranslations
        page.tsx                  # provided shell; TODO(L4): generateMetadata
        pricing/page.tsx          # provided shell; TODO(L4): generateMetadata
        features/page.tsx         # provided shell; TODO(L4): generateMetadata
      (app)/
        layout.tsx                # provided: generateMetadata(robots noindex), header + LocaleSwitcher
        invoices/
          page.tsx                # provided shell; TODO(L2) t()+counter; TODO(L3) tz + due delta
          table.tsx               # provided shell (client); TODO(L2) t() labels; TODO(L3) formatters
          locale-switcher.tsx     # provided: client; calls setLocaleAction + router.replace
          actions.ts              # TODO(L2): setLocaleAction body (store profile + NEXT_LOCALE cookie)
          toolbar / view-tabs / pagination / chips / [id]/edit / loading   # provided (chapter 062)
    inspector/                    # provided, fully working: row counts, identity switcher, locale/tz
                                  #   override, DST proof, currency grid, plural probe, hreflang panel,
                                  #   sitemap preview, force-version-drift, audit tail
  components/ui/                  # provided: shadcn/ui primitives (verbatim)
```

### Reference solution signatures lessons display

- **Routing** (`src/i18n/routing.ts`, provided): `defineRouting({ locales: SUPPORTED_LOCALES, defaultLocale: 'en-US', localePrefix: 'as-needed' })`; `export type Locale = (typeof routing.locales)[number]`.
- **Navigation** (`src/i18n/navigation.ts`, provided): `export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing)`.
- **Request config** (`src/i18n/request.ts`, student L2): `getRequestConfig(async ({ requestLocale }) => { const requested = await requestLocale; const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale; const messages = (await import(\`../messages/${locale}.json\`)).default; return { locale, messages, formats }; })`. No session read, no `timeZone`, no `now` — keeping the config prerender-safe is what lets the static locale shell build; the tz is read at each formatter call site instead.
- **Shared formats** (`src/i18n/formats.ts`, student L2/L3): `dateTime: { short: { dateStyle: 'medium' }, withTime: { dateStyle: 'medium', timeStyle: 'short' } }`, `number: { compact: { notation: 'compact' }, currency: { style: 'currency', currencyDisplay: 'narrowSymbol' } }` — `as const satisfies Formats`. No `relativeTime` key (not part of next-intl's `Formats` type).
- **Proxy** (`src/proxy.ts`, provided): `export default createMiddleware(routing); export const config = { matcher: ['/((?!api|_next|_vercel|inspector|.*\\..*).*)'] }` — note `inspector` is excluded so the locale-agnostic inspector is never prefixed.
- **Locale layout** (`app/[locale]/layout.tsx`, student L2): async; `generateStaticParams = () => routing.locales.map((locale) => ({ locale }))`; awaits `params`, validates via `hasLocale` (else `notFound`), calls `setRequestLocale(locale)`, awaits `getMessages()`, returns `<html lang={locale} suppressHydrationWarning><body><Providers><NuqsAdapter><NextIntlClientProvider messages={pick(messages, ['invoices', 'nav', 'locale-switcher'])}>{children}</NextIntlClientProvider><Toaster /></NuqsAdapter></Providers></body></html>`.
- **`messages/en-US.json` (excerpt, provided):** `"invoices.list.title": "Invoices"`, `"invoices.list.count": "{count, plural, =0 {No invoices} one {# invoice} other {# invoices}}"`, status labels `draft / sent / paid / overdue`. Currency lives at call site as data, not in the catalog.
- **`messages/fr-FR.json` (excerpt, student L2):** `"invoices.list.title": "Factures"`, `"invoices.list.count": "{count, plural, =0 {Aucune facture} one {# facture} many {# de factures} other {# factures}}"`, status `Brouillon / Envoyée / Réglée / En retard`.
- **Set-locale action** (`app/[locale]/(app)/invoices/actions.ts`, student L2): `setLocaleAction = authedAction('member', z.strictObject({ locale: z.enum(SUPPORTED_LOCALES) }), async (input, ctx) => { setUserLocale(ctx.userId, input.locale); (await cookies()).set('NEXT_LOCALE', input.locale, { path: '/', sameSite: 'lax' }); return ok(null); })` — writes the store profile, not a DB row.
- **Invoices page (excerpts, student L2/L3):** `const t = await getTranslations('invoices.list'); const tz = await getCurrentUserTimeZone();`. The page does **not** call `getFormatter`; it reads the session, runs `listInvoices`, computes `const today = Temporal.Now.plainDateISO(tz)` and a `dueInDaysById` map via `today.until(row.dueDate, { largestUnit: 'day' }).days`, then passes `rows.map(toInvoiceRow)`, `timeZone: tz`, `nowMs`, and `dueInDaysById` into the client `InvoicesTable`. Counter: `t('count', { count: rows.length })`.
- **Invoices table (excerpts, student L2/L3):** client component; `const t = useTranslations('invoices.list'); const format = useFormatter();`. Date cell: `format.dateTime(new Date(row.createdAtMs), { dateStyle: 'medium', timeStyle: 'short', timeZone })`. Amount: `format.number(row.amountMinor / 100, 'currency', { currency: row.currency })` (the named `currency` preset carries `narrowSymbol`; the currency tag is data at the call site). Relative due: `format.relativeTime(addDays(now, dueInDaysById[row.id] ?? 0), { now, unit: 'day' })`.
- **Alternates helper** (`src/lib/seo/alternates.ts`, provided): `APP_URL = 'https://app.example.com'` (a constant, not validated env); `generateAlternates(pathname, currentLocale)` returns `{ canonical: APP_URL + getPathname({ locale: currentLocale, href: pathname }), languages: { ...Object.fromEntries(routing.locales.map((l) => [l, APP_URL + getPathname({ locale: l, href: pathname })])), 'x-default': APP_URL + getPathname({ locale: routing.defaultLocale, href: pathname }) } }`.
- **Marketing metadata** (student L4): `generateMetadata` reads `locale` from `params`, re-validates via `hasLocale` (falls back to `defaultLocale`), calls `getTranslations({ locale, namespace: 'marketing.meta' })`, calls `generateAlternates('/', resolved)`, assembles `openGraph` with `locale: bcp47ToOgLocale(resolved)` and `alternateLocale` mapped over the other locales.
- **Sitemap** (`src/app/sitemap.ts`, provided): one `MetadataRoute.Sitemap` entry per canonical path (`/`, `/pricing`, `/features`) with `alternates.languages` mapped over `routing.locales` via `getPathname`. Root-level, not under `[locale]/`; absolute URLs built from `APP_URL`.
- **Env entries:** none. The project has no `env` module and no `.env` — `APP_URL` is a constant in `lib/seo/alternates.ts`, the data substrate is in-memory.

### Inspector page spec

Single Server Component at `/inspector` (locale-agnostic, not under `[locale]/`; provided fully working, not student work) — verifies all build slices. Its own document shell is a fixed en-US `NextIntlClientProvider` so the panels render before the catalogs are filled.

- **Row counts:** total / active / archived / deleted for the acting org.
- **Acting identity:** switcher over the four seeded identities (`<orgId>:<role>`), posting `switchIdentity`; shows the resolved locale and tz.
- **Locale + tz override:** force-set the active user's `locale` and `timeZone` via `setLocaleOverride` / `setTimeZoneOverride`, plus a link into `/{locale}/invoices`.
- **DST proof:** renders the two seeded fixtures side-by-side — `2026-07-01T18:00:00Z` and `2026-01-01T18:00:00Z` — formatted in the acting user's `timeZone`. With `timeZone = 'Europe/London'`, first → `'7:00 PM'` (BST), second → `'6:00 PM'` (GMT). Same UTC offset, different wall-clock because London observes DST only in summer.
- **Currency by data:** three amounts × three locales = nine cells (`narrowSymbol`). Same amount, three currencies, three locale-specific renderings.
- **Pluralization probe:** client component (`createTranslator` per locale) with a live count input — type 0, 1, 2, 5, 1000000 to verify category transitions, including French's `many` branch.
- **Source-HTML `hreflang` panel:** server-`fetch`es each marketing path, extracts `<link rel="alternate" hreflang>` tags, displays per path. Empty until L4. Verifies self-reference, bidirectionality, `x-default`.
- **Sitemap preview:** parses `/sitemap.xml` per `<url>` block and shows each canonical `<loc>` with its `<xhtml:link>` alternates.
- **Reset and re-seed / Force version drift / Audit tail:** carry-in inspector controls — reseed the store, bump a row's `version` to stale an open edit form, and the last 20 audit entries.

There is no static-vs-dynamic indicator, no Lighthouse panel, and no message-key grep panel — the structural-discipline audits (no hard-coded JSX strings, no raw `Intl.*` outside the seams) are verified by hand and by the lesson tests, not by an inspector panel.

Student writes only `src/i18n/request.ts`, `src/i18n/formats.ts`, `app/[locale]/layout.tsx`, the locale-switcher `setLocaleAction`, the invoice page and table transformations, marketing's three `generateMetadata`, `en-GB.json`, and `fr-FR.json`. Routing, navigation, the proxy, the SEO seams, the sitemap, and the inspector are provided complete.

### Concepts demonstrated → owning lesson

- Translation-key discipline (`feature.surface.role`, one-string-one-key, named placeholders, `t.rich`) — lesson 1 of chapter 084.
- ICU `plural` with CLDR categories; `=0` exact-match; `other` mandatory — lesson 2 of chapter 084.
- `Intl.NumberFormat` currency from data; `Intl.DateTimeFormat` Temporal-native with mandatory `timeZone`; construct-once via `useFormatter` — lesson 3 of chapter 084.
- Five-step negotiation chain; BCP 47 `Lookup`; geo-IP never primary — lesson 4 of chapter 084.
- `defineRouting` + `localePrefix: 'as-needed'`; `createMiddleware` in `proxy.ts` (Next.js 16 rename) — lesson 5 of chapter 084.
- `getRequestConfig` resolving `messages` once per request (prerender-safe; no `timeZone`/`now`) — lesson 5 of chapter 084.
- `setRequestLocale` for static rendering; `generateStaticParams` per-locale — lesson 5 of chapter 084.
- `useTranslations` / `getTranslations`, `useFormatter` (client) for dates and currency — lesson 5 of chapter 084 + lesson 3 of chapter 084.
- Typed `Link` / `redirect` / `usePathname` from `createNavigation` — lesson 5 of chapter 084.
- The `AppConfig` type augmentation (`src/global.ts`) for compile-time key safety — lesson 5 of chapter 084.
- The store user's `locale` paired with `timeZone`; `<html lang>` from resolved locale — lesson 4 of chapter 084 + lesson 3 of chapter 083.
- `timestamptz` ↔ `Temporal.Instant` codec; profile `timeZone` read at every formatter call — lesson 1 of chapter 083 + lesson 3 of chapter 083.
- `alternates.languages` with self-reference + bidirectional + `x-default`; canonical = locale-specific URL — lesson 6 of chapter 084.
- `MetadataRoute.Sitemap` with `alternates.languages` emitting `xhtml:link` — lesson 6 of chapter 084.
- OG `og:locale` underscore form + `og:locale:alternate` — lesson 6 of chapter 084.
- `authedAction` wrapper (cookie-driven `getSession`, `AuthedCtx`) + canonical `Result` — chapter 057 + chapter 043.

---

## Lesson 1 — Project Overview

The student leaves with the chapter 062 invoices starter running locally — routing the carry-in list but not yet localizing (every locale resolves to the en-US catalog, `<html lang="en-US">`) — the full inspector loaded (DST and currency panels live, hreflang/sitemap panels still empty), and a clear map of the three build lessons ahead. No feature is built yet.

This is the chapter's tri-locale invoices list: chapter 062's invoices surface (URL-state filters, soft-delete, `version` concurrency) lifted into a tz-aware, three-locale surface — `en-US`, `en-GB`, `fr-FR` — where every string flows through `t()`, every number through `useFormatter().number`, and every date through `useFormatter().dateTime` with the user's profile `timeZone`, while marketing emits `hreflang`, per-locale sitemap entries, and locale-aware OG metadata. The data substrate is the chapter 062 in-memory store read through a cookie-driven dev session — no Postgres, no auth wall. One figure shows the finished app: `/invoices` in English with `'$1,234.56'`, `/fr-FR/invoices` with `'1 234,56 €'`, the inspector DST panel showing BST-vs-GMT side-by-side, and view-source on `/fr-FR/` with three `<link rel="alternate">` tags plus `x-default`.

### What we'll practice

- Resolving locale once in middleware (`src/proxy.ts`) and reading only the resolved value downstream — never `Accept-Language` or `navigator.language` outside the sign-up form.
- Routing every UI string through `t()` / `t.rich`, every number through `useFormatter().number`, and every date through `useFormatter().dateTime` with the profile `timeZone` read from the session at the call site.
- Writing ICU `plural` catalogs that respect CLDR categories per language, including French's `many` branch and the `=0` exact-match override.
- Treating currency as data on the invoice and formatting it per the viewer's locale.
- Emitting bidirectional `hreflang` with `x-default`, a locale-specific canonical, and a per-locale sitemap from `generateMetadata` and `app/sitemap.ts`.
- Holding the structural discipline that keeps i18n maintainable: grep-able keys, formatters in one seam, `<html lang>` from the resolved locale, static rendering preserved via `setRequestLocale`.

The senior payoff is the canonical 2026 shape for "ship i18n from day one": every later surface inherits `[locale]`, the catalog, and the `useFormatter` / `useTranslations` reflex, so adding a fourth locale is one PR, not a 3–6 week retrofit.

### Architecture

Shape only — a labeled list of the request path:

- **Middleware (`src/proxy.ts`).** `createMiddleware(routing)` resolves the locale through the five-step negotiation chain (URL → profile → cookie → `Accept-Language` best-match → default) and rewrites the URL once; the matcher excludes `inspector`.
- **Request config (`src/i18n/request.ts`).** `getRequestConfig` settles `locale`, `messages` (per-locale dynamic import), and shared `formats` once per request — and nothing tied to the request (no session, no `timeZone`, no `now`) so the static prerender of every locale stays green.
- **Session + store.** `src/server/session.ts` resolves the `acting-identity` cookie to one of the seeded identities; `src/server/store.ts` is the in-memory "Postgres". `lib/user-time.ts` reads `locale`/`timeZone` off the session.
- **`[locale]/` segment.** `setRequestLocale` keeps marketing static; `<html lang>` matches the URL prefix; `NextIntlClientProvider` ships a scoped slice of the catalog (`invoices`, `nav`, `locale-switcher`).
- **Render seams.** `useTranslations` / `getTranslations` for strings; `useFormatter` (in the client table) for dates and currency; `src/i18n/formats.ts` holds the presets; `lib/temporal.ts` holds the codecs. The page reads the tz on the server and threads it into the client table.
- **SEO surface.** `src/lib/seo/alternates.ts` feeds every marketing `generateMetadata`; `src/app/sitemap.ts` emits per-locale alternates.

### Starting file tree

The annotated top-level layout is the architect's tree in the Chapter framing (`Starter file tree`). For the lesson body, comment one line each only on files the lessons touch and mark the `TODO(L2/L3/L4)` deltas as the highlighted focus: the student writes `src/i18n/request.ts` (real per-locale import), `src/i18n/formats.ts`, `app/[locale]/layout.tsx`, the locale-switcher `setLocaleAction`, the invoice page and table transformations, marketing's three `generateMetadata`, `messages/en-GB.json`, and `messages/fr-FR.json`. Leave the chapter 062 carry-in, the provided seams (`src/i18n/{routing,navigation}.ts`, `src/proxy.ts`, `src/global.ts`, `lib/temporal.ts`, `lib/user-time.ts`, `lib/i18n/supported.ts`, `lib/seo/*`, `app/sitemap.ts`, the store/session, `next.config.ts`'s plugin wiring), and the inspector uncommented except where a lesson reads them.

The orientation that earlier sat in the standalone tour belongs here as brief annotations and lands in full where each file is first written:

- `messages/en-US.json` is the provided source contract — every key `feature.surface.role`, named placeholders, `t.rich` tagged keys, the counter carrying `=0 / one / other`. Its shape is explained in depth in lesson 2 where the student mirrors it into the other two catalogs.
- The store (`src/server/store.ts`) seeds four users — `(en-US, America/New_York)`, `(en-GB, Europe/London)`, `(fr-FR, Europe/Paris)`, `(fr-FR, Pacific/Auckland)` — plus 30 invoices/org with a USD/GBP/EUR mix, two DST fixtures, one archived row, and one soft-deleted row. The `(fr-FR, Pacific/Auckland)` pairing is deliberate: locale and timezone are independent fields (lesson 3 of chapter 083). Currency is text on the invoice — the invoice was issued in EUR regardless of the viewer's locale.
- `lib/user-time.ts` (`getCurrentUserTimeZone` / `getCurrentUserLocale`, reading `locale`/`timeZone` off the session, react-`cache`d) and `lib/i18n/supported.ts` (`SUPPORTED_LOCALES = ['en-US','en-GB','fr-FR'] as const`, the single source whose `as const` narrows to the `Locale` union) are provided seams; the invoice page reads the first, `routing.ts` reads the second. The locale-switcher (provided client component) renders three options in their own language and calls `setLocaleAction` then a typed `router.replace`; the action body is written in lesson 2.
- `next.config.ts` already wraps the config with `createNextIntlPlugin('./src/i18n/request.ts')` and carries `cacheComponents: true` from chapter 062 — the wiring hooks the request-config module.

### Roadmap

One Card per lesson:

- **Lesson 2 — Wire next-intl and ship three catalogs.** Wires the request-config dynamic import, finishes `[locale]/layout.tsx` and the `setLocaleAction`, fills the two catalogs, and routes every UI string through `t()` with a CLDR-correct pluralized counter.
- **Lesson 3 — Format dates in profile tz and currency from data.** Flows every date through the formatter with the profile `timeZone` and every amount through the formatter with the invoice's stored currency, plus a Temporal-driven relative-due column.
- **Lesson 4 — Emit hreflang, sitemap alternates, and per-locale OG.** Adds the public SEO surface: bidirectional `hreflang` with `x-default`, a locale-specific canonical, and per-locale OG images on the marketing pages (the sitemap ships provided).

### Setup

Command sequence (Steps): clone the starter via `degit`, then `pnpm install` and `pnpm dev`. There is no database, no Docker, and no `.env` — the data substrate is the in-memory store and the dev session is a cookie, so the app boots with no provisioning. `APP_URL` for canonical/`hreflang` URLs is a constant in `lib/seo/alternates.ts` (`https://app.example.com`).

Dev server command, then the expected result that ends the lesson: `/invoices` and `/fr-FR/invoices` both route and render chapter 062's surface, but **English in both** — the start's `request.ts` resolves every locale to the en-US catalog and `<html lang>` is hard-coded `en-US`, the honest "routes-but-doesn't-localize" before-state. `/inspector` loads with the DST, currency, and plural panels live and the hreflang/sitemap panels empty (filled in L4).

Scope cuts named here so expectations are set: only three locales (no RTL, no `'de-DE'` / `'es-ES'` / `'pt-PT'`); catalogs live in the repo (no TMS integration); per-locale OG on marketing only; no schema.org structured-data localization, no A/B locale variants, no domain-based locale routing; the in-memory store stands in for a database (no Postgres/Drizzle/auth); no Temporal arithmetic surface beyond the single relative-due day delta (lesson 5 of chapter 083 owns the rest).

---

## Lesson 2 — Wire next-intl and ship three catalogs

The student wires locale routing end-to-end so that locale-prefixed URLs work, every UI string renders through `t()`, and the pluralized counter renders the right CLDR category per locale.

After this lesson, `/` and `/fr-FR/` both load in their own language, `/invoices` and `/fr-FR/invoices` route correctly, `<html lang>` matches the prefix, the header locale-switcher changes the user's locale and the URL, and the "N invoices" counter renders `'No invoices'` / `'1 invoice'` / `'5 invoices'` in English and `'Aucune facture'` / `'1 facture'` / `'1 000 000 de factures'` in French. Currency and dates still render through the carry-in shape — the amount as `{currency} {total}` and the created/due cells unformatted — lesson 3 moves those onto the formatter seam, so the page still renders end-to-end at the locale-prefixed URL.

### Your mission

This lesson activates the next-intl spine the whole project hangs from. The routing source of truth and `proxy.ts` (Next.js 16's rename of `middleware.ts`) are provided; what the student wires is the per-locale dynamic import in `request.ts` (the start hard-codes the en-US catalog for every locale), the `<html lang={locale}>` and scoped provider in `[locale]/layout.tsx`, and the `setLocaleAction` body. Every page and layout under `[locale]/` calls `setRequestLocale` before any next-intl call — skip it and the route silently converts from static to dynamic, a perf regression invisible without monitoring. The request can carry an unknown locale string, so `hasLocale(routing.locales, requested)` is the validator that both narrows the type to `Locale` and lets the layout `notFound()` cleanly. The client payload stays small by wrapping children in a `NextIntlClientProvider` scoped via `pick` to the three namespaces the client needs (`invoices`, `nav`, `locale-switcher`), not the full 3-locale catalog; messages are dynamic-imported per locale so production loads only the active locale's JSON. The English source catalog is provided in full — the pedagogical point is the *shape*, not language proficiency — and the student fills the small en-GB diff and the full fr-FR translation. The load-bearing trap is French pluralization: CLDR gives French a `many` category for large numbers, so a catalog shipping only `one / other` silently mistranslates `1000000`; the counter must use ICU `plural` with `=0 / one / many / other`, never a ternary. Catalogs check into the repo in the exact JSON format every TMS (Crowdin, Lokalise, Phrase) round-trips, but TMS integration is out of scope. Currency and date formatting are deliberately deferred to lesson 3 — leave the carry-in cells in place here so the page renders. The locale-switch action writes both the store user's profile (`setUserLocale`) and the `NEXT_LOCALE` cookie (`sameSite: 'lax'` — sufficient for locale, doesn't break OAuth callbacks, GDPR-essential-for-functionality) so the override survives across navigation.

Requirements the student confirms:

- Visiting `/` loads the default-locale marketing page unprefixed, and `/fr-FR/` loads the French marketing page.
- `/invoices` and `/fr-FR/invoices` both route and render, with `/en-GB/invoices` also reachable.
- Every UI string on the invoice surface renders from the catalog, not from hard-coded JSX; switching locale swaps every string.
- The "N invoices" counter renders the correct CLDR category per locale across 0, 1, 5, and 1000000 — including French's `many` branch (`'1 000 000 de factures'`) and the `=0` text (`'Aucune facture'` / `'No invoices'`).
- The header locale switcher changes the active user's locale: the URL gains the right prefix, the store user's `locale` updates, and the `NEXT_LOCALE` cookie is set.
- `<html lang>` matches the URL prefix on every locale's path.
- An unprefixed visit by an anonymous browser sending `Accept-Language: fr-FR` is redirected to `/fr-FR/`, and the marketing routes remain statically rendered.

### Coding time

Build prompt directs the student to implement against this brief and the tests, then a hidden `<details>` solution walkthrough, organized as the files appear in the repo. (The routing source of truth, navigation helpers, and `proxy.ts` are provided complete — orient the student to them but don't have them rewrite them; the `'as-needed'` rationale, the typed-`Link` discipline, and the Next.js 16 `middleware.ts` → `proxy.ts` rename are worth a callout as they read the provided files.)

- `src/i18n/request.ts`: replace the start's en-US-for-every-locale import with the real per-locale dynamic import (`await import(\`../messages/${locale}.json\`)`), `locale` validated via `hasLocale`. Callout: this config returns only `{ locale, messages, formats }` — no session read, no `timeZone`, no `now`, because `getRequestConfig` runs during the static prerender of every `generateStaticParams` locale and any request-tied read would fail it. The tz is read at the call site in lesson 3 instead.
- `src/i18n/formats.ts`: for this lesson, `dateTime: { short: { dateStyle: 'medium' }, withTime: { dateStyle: 'medium', timeStyle: 'short' } }`, `number: { compact: { notation: 'compact' } }`, `as const satisfies Formats`. The `number.currency` preset arrives in lesson 3. No `relativeTime` key (not part of next-intl's `Formats` type). Presets named at the config layer, not inlined.
- `app/[locale]/layout.tsx`: the provided shell already wires `generateStaticParams`, `setRequestLocale`, and `NuqsAdapter`; the student changes `<html lang="en-US">` to `<html lang={locale}>` and scopes the `NextIntlClientProvider` via `pick(messages, ['invoices', 'nav', 'locale-switcher'])`. Callout on why `setRequestLocale` placement (before any next-intl call) is load-bearing for static rendering, and why `<html lang>` is driven from the resolved param, never the cookie.
- `app/[locale]/(app)/invoices/actions.ts`'s `setLocaleAction`: fill the `authedAction('member', …)` body to call `setUserLocale(ctx.userId, input.locale)` and set the `NEXT_LOCALE` cookie, returning `ok(null)`; rationale for updating both signals (store profile read by the negotiation chain's profile step, cookie read by the cookie step).
- The invoice page transformation: `getTranslations('invoices.list')`, the heading and `selectPrompt` from the catalog, the count paragraph as `t('count', { count: rows.length })`; note that the date/currency/relative-due cells in the client table stay carry-in shape until lesson 3.
- The invoice table transformation: `useTranslations('invoices.list')` for the column headers, status (`t('status.<value>')`), badge, and row-action labels; the value cells (date/amount/due) stay carry-in shape until lesson 3.
- `messages/en-GB.json`: the ~15-key diff from en-US (British spellings like "localised", "time zone", date order) — copy then edit.
- `messages/fr-FR.json`: the full translation, with the counter `'{count, plural, =0 {Aucune facture} one {# facture} many {# de factures} other {# factures}}'` and status labels `Brouillon / Envoyée / Réglée / En retard`; callout on the `many` branch (CLDR's French rule) and `=0`.

Decision-rationale callouts: the scoped provider keeps the client payload to three namespaces instead of the full catalog; dynamic import code-splits per locale; `sameSite: 'lax'` on the cookie; cookie name `NEXT_LOCALE` is the next-intl default; catalogs check into the repo as the format every TMS consumes. For the profile `timeZone` seam, link to lesson 3 of chapter 083 rather than re-explaining.

### Moment of truth

Run the lesson's test suite with the project's test command; the expected output is a green pass for the locale-routing and pluralization assertions (the tests target observable behavior: which strings render at which URL, which plural category fires per count).

Confirm by hand the requirements the tests don't fully cover, ticking each as you go:

- [ ] `/` loads unprefixed and `/fr-FR/` loads French marketing; `/invoices`, `/fr-FR/invoices`, and `/en-GB/invoices` all route and render in their own language.
- [ ] In the inspector pluralization probe, typing 0, 1, 2, 5, 1000000 walks each locale's counter through the right category transitions — French shows the `many` branch (`'1 000 000 de factures'`) at large counts, and both locales show their `=0` text.
- [ ] Using the header locale switcher lands the prefixed URL, updates the store user's `locale`, and sets the `NEXT_LOCALE` cookie; `<html lang>` matches the prefix on each path.
- [ ] A private window sending `Accept-Language: fr-FR` is redirected from `/` to `/fr-FR/`; an unsupported `pt-BR` loads `/` unprefixed (falls to `en-US`).
- [ ] `next build` reports the marketing routes as static (a missing `setRequestLocale` would flip them to dynamic); verify by hand — there is no inspector panel for this.
- [ ] The switcher preserves path and query: at `/invoices?status=paid&cursor=abc123`, switching to French lands `/fr-FR/invoices?status=paid&cursor=abc123`.
- [ ] A by-hand grep finds zero hard-coded JSX strings inside `app/[locale]/`; the locale survives a refresh and a cookie clear on a prefixed URL.

Note: currency and dates still render in the carry-in shape at this stage by design (`{currency} {total}`, unformatted dates) — lesson 3 moves them onto the formatter seam, so do not treat that as a failure here.

---

## Lesson 3 — Format dates in profile tz and currency from data

The student makes every invoice date render in the viewer's profile timezone and every amount render in the invoice's stored currency, formatted for the viewer's locale, plus a relative "due" column.

After this lesson, `/invoices` shows USD as `'$1,234.56'` with dates in the en-US user's EDT/EST for an `(en-US, America/New_York)` user; switching to fr-FR reflows the same data to `'1 234,56 €'` for EUR and `'1 234,56 $'` for USD (narrow symbol); and switching the user to `Europe/London` in the inspector renders `2026-07-01T18:00:00Z` as `'7:00 PM'` BST and `2026-01-01T18:00:00Z` as `'6:00 PM'` GMT.

### Your mission

This lesson moves every date and money render onto the formatting seam, and the load-bearing idea is that the right wall-clock and the right currency are both decided by data the formatter is handed, not by the runtime. Because the request config is prerender-safe and carries no tz, the timezone is read once on the server in `page.tsx` (`getCurrentUserTimeZone`) and threaded into the client table as a prop, where each `format.dateTime` call is handed `timeZone` — omit it and the formatter falls back to the runtime tz (UTC on Vercel) and silently formats every user's data in UTC, a bug that passes every test written without a tz-spanning fixture. `Temporal.Instant` plus an IANA `timeZone` is DST-aware by construction, which is why the two seeded July/January instants render different wall-clock hours in London with no explicit DST handling. Currency is data on the invoice (`currency: row.currency`), never hard-coded and never inferred from the viewer's locale; the symbol style is a UI decision (`currencyDisplay: 'narrowSymbol'` for compact table cells) that lives in the shared `number.currency` preset, while the `currency` tag itself rides at the call site because it is data. `Temporal.PlainDate` is a location-independent calendar date — the relative-due delta is computed once on the server (`Temporal.Now.plainDateISO(tz).until(row.dueDate, { largestUnit: 'day' }).days`, one Temporal arithmetic call, `largestUnit` required or the duration splits across units) and passed down per row; the client renders it through `format.relativeTime`. Out of scope: live per-minute relative time (this is a server-rendered list with fresh data per navigation; a client island is the right shape when truly needed) and amounts beyond `Number.MAX_SAFE_INTEGER` (named, not built). Note the boundary: Temporal instances can't cross the RSC → Client boundary, so the page serializes rows via `toInvoiceRow` (`createdAtMs` / `dueDateISO`) and the table reconstructs `new Date(row.createdAtMs)` before formatting.

Requirements the student confirms:

- Every invoice date renders in the viewer's profile timezone: an `America/New_York` user sees EDT/EST, and switching the user to `Europe/London` in the inspector shifts the wall-clock accordingly.
- The two DST-spanning instants render correctly for a `Europe/London` user — `2026-07-01T18:00:00Z` as `'7:00 PM'` BST and `2026-01-01T18:00:00Z` as `'6:00 PM'` GMT — and as `'2:00 PM'` EDT / `'1:00 PM'` EST for a `America/New_York` user.
- Each amount renders in the invoice's stored currency formatted for the viewer's locale: the same EUR datum shows `'1 234,56 €'` in fr-FR, and a USD datum shows `'$1,234.56'` in en-US and `'1 234,56 $'` in fr-FR (narrow symbol).
- The relative-due column reads naturally per locale: `'in 3 days'` / `'5 days ago'` in en-US, `'dans 3 jours'` / `'il y a 5 jours'` in fr-FR.
- The inspector currency-by-data panel shows nine consistent cells (three currencies × three locales), and the DST panel shows the BST-vs-GMT pair side by side. (Both panels are provided; they come alive once the formats preset and the page/table seams are wired.)
- The structural audit stays green: zero `Date.prototype.toLocaleString` and zero raw `Intl.*` inside `app/[locale]/` (formatting goes through the seam).

### Coding time

Build prompt directs the student to implement against this brief and the tests, then a hidden `<details>` solution walkthrough, organized as the files appear in the repo:

- `src/i18n/formats.ts` extended with the currency preset: `number.currency` as `{ style: 'currency', currencyDisplay: 'narrowSymbol' }` (the `currency` tag stays at the call site since it's data) — centralized so a UI-wide change is one edit.
- The invoice page (`page.tsx`): read `const tz = await getCurrentUserTimeZone()` once, capture a stable `nowMs`, compute `const today = Temporal.Now.plainDateISO(tz)` and the `dueInDaysById` map via `today.until(row.dueDate, { largestUnit: 'day' }).days`, and pass `timeZone`, `nowMs`, and `dueInDaysById` into `InvoicesTable`.
- The invoice table (`table.tsx`, client): via `useFormatter()`, the date cell `format.dateTime(new Date(row.createdAtMs), { dateStyle: 'medium', timeStyle: 'short', timeZone })`; the amount `format.number(row.amountMinor / 100, 'currency', { currency: row.currency })`; the relative-due cell `format.relativeTime(addDays(now, dueInDaysById[row.id] ?? 0), { now, unit: 'day' })`. The archived-on line also uses `format.dateTime(..., { timeZone })`.

Decision-rationale callouts: why `timeZone` is mandatory on every `dateTime` call (the lint-rule framing) and why it is threaded from the server rather than read in the request config; why `currencyDisplay: 'narrowSymbol'` belongs in the preset (`'name'` / `'code'` are the other options); why `largestUnit: 'day'` is required; the `amountMinor / 100` conversion and its safe-integer ceiling; why the relative delta is computed server-side and the `now` is stable across the render. For `Temporal.Instant` / `Temporal.PlainDate` and the profile `timeZone` seam, link to lesson 1 of chapter 083 and lesson 3 of chapter 083 rather than re-explaining.

### Moment of truth

Run the lesson's test suite with the project's test command; the expected output is a green pass for the date- and currency-formatting assertions, including the DST-spanning fixture (the tests assert wall-clock output, not formatter internals).

Confirm by hand the requirements the tests don't fully cover, ticking each as you go:

- [ ] `/invoices` as an `(en-US, America/New_York)` user shows USD `'$1,234.56'` and dates in EDT/EST; switching to fr-FR reflows to `'1 234,56 €'` (EUR) and `'1 234,56 $'` (USD) with no data change.
- [ ] In the inspector DST panel as a `Europe/London` user, the July instant shows `'7:00 PM'` BST and the January instant `'6:00 PM'` GMT; switching to `America/New_York` shows `'2:00 PM'` EDT and `'1:00 PM'` EST.
- [ ] The currency-by-data panel's nine cells are each consistent — same amount, same currency tag, locale-specific format.
- [ ] The relative-due column reads naturally in both locales.
- [ ] Switching to the `(fr-FR, Pacific/Auckland)` user renders French strings with dates in NZDT/NZST — locale and timezone are independent, and the combination works without any combo-specific code.
- [ ] Temporarily removing `timeZone` from a `dateTime` call makes both DST rows render in UTC (revert after observing); this is the rehearsal of the failure the seam prevents.

---

## Lesson 4 — Emit hreflang, sitemap alternates, and per-locale OG

The student gives the marketing surface its public SEO shape: every page emits bidirectional `hreflang` with `x-default`, a locale-specific canonical, and a per-locale OG image — by wiring each marketing page's `generateMetadata` to the provided SEO seams.

After this lesson, view-source on any marketing page lists all three locales plus `x-default` (bidirectionally), the canonical of `/fr-FR/pricing` is `https://app.example.com/fr-FR/pricing` (not the default), `/sitemap.xml` carries one `<url>` per canonical path with a `<xhtml:link>` per locale, and `/fr-FR/`'s OG image renders French title text.

### Your mission

This lesson is where the discipline becomes structural defense against the silent failures that define i18n SEO. The `generateAlternates` seam, the `bcp47ToOgLocale` helper, the sitemap, and the per-locale `opengraph-image.tsx` are provided complete; the student's work is wiring each marketing page's `generateMetadata` to call them — but the senior payoff is understanding *why each seam is shaped that way*. The canonical must be the locale-specific URL, not the default — canonicalizing every locale to en-US tells Google "fr-FR is a duplicate, only rank en-US" and quietly kills French organic traffic, the single most common i18n ranking-killer. `hreflang` must be self-referential (every page lists its own locale) and bidirectional (every page lists every other supported locale); a missing self-reference or a one-sided declaration is silently dropped by Google, which is exactly why `generateAlternates` builds the full set from `routing.locales` in one place and every `generateMetadata` calls that one seam rather than hand-assembling tags. `x-default` is the fallback when no alternate matches the user's locale, and for a SaaS the senior call is to point it at the strongest-market default locale (`/`). The OG locale tag uses the underscore form (`'fr_FR'`) where BCP 47 uses the hyphen (`'fr-FR'`); the `bcp47ToOgLocale` helper converts, and shipping the hyphen form is silently treated as invalid by Facebook and LinkedIn. The authed app surface gets `robots: { index: false }` and declares no `alternates` — set once on `(app)/layout.tsx`'s `generateMetadata`, the discipline of declaring metadata even where the SEO surface is intentionally dark. The provided sitemap is one `<url>` per canonical path with alternates riding along inside each entry (the modern Next.js-native shape, not separate per-locale sitemaps) and lives at the root, not under `[locale]/`, because it is locale-agnostic. Per-locale OG images are strong signals for marketing and weak for authed pages, so they ship on marketing only. One discipline to name but not exercise here: a locale not yet translated should not list a `hreflang` alternate to its URL (or that URL should `noindex`) — this project ships all three translated, but the rule matters for a real rolling multi-locale rollout.

Requirements the student confirms:

- Every marketing page's rendered HTML lists all three locales plus `x-default`, bidirectionally, with the page's own locale self-referenced.
- The canonical on each marketing page is that page's locale-specific URL — `curl /fr-FR/pricing | grep canonical` returns `https://app.example.com/fr-FR/pricing`.
- The OG locale tag is the underscore form for the current locale, with the other locales listed as alternates, and `/fr-FR/`'s OG image renders French title text.
- The authed app surface declares `robots: { index: false }` and emits no `hreflang` alternates.
- `/sitemap.xml` (provided) carries one `<url>` per canonical path (`/`, `/pricing`, `/features`) with a `<xhtml:link rel="alternate" hreflang>` per locale inside each entry.

### Coding time

Build prompt directs the student to implement against this brief and the tests, then a hidden `<details>` solution walkthrough, organized as the files appear in the repo. The work is the three marketing `generateMetadata` exports; the seams they call are provided and worth orienting to.

- The provided `lib/seo/alternates.ts`'s `generateAlternates(pathname, currentLocale)` returns `{ canonical, languages }`: canonical is the locale-specific URL, `languages` is the full set keyed by BCP 47 tag plus `x-default`, built via `getPathname` so the `'as-needed'` prefix is handled. Read it; it is the single seam every `generateMetadata` calls. (`APP_URL` is a constant in this file, not validated env.)
- Each marketing page's `generateMetadata` (home, pricing, features): read `locale` from `params`, re-validate via `hasLocale` (fall back to `defaultLocale`), `getTranslations({ locale: resolved, namespace: 'marketing.meta' })` for title/description (the async sibling, required because `generateMetadata` is not a component), `alternates: generateAlternates('/', resolved)` (or the page's own path), and `openGraph` assembled with `locale: bcp47ToOgLocale(resolved)` plus `alternateLocale` over the other locales.
- The authed surface's noindex lives on the provided `(app)/layout.tsx` `generateMetadata` returning `{ robots: { index: false } }` — orient the student to it; no per-page metadata is needed.
- The provided `app/sitemap.ts` (one entry per canonical path with `alternates.languages` over `routing.locales`; root-level) and `app/[locale]/(marketing)/opengraph-image.tsx` (reads `locale`, calls `getTranslations`, returns `ImageResponse`) need no edits — read them to understand the surface.

Decision-rationale callouts: why canonical must be locale-specific (the duplicate-content trap); why self-reference and bidirectionality are mandatory and how `Object.fromEntries(routing.locales.map(...))` is the structural guarantee in the provided seam; the `x-default` choice; the OG underscore-vs-hyphen conversion; why the sitemap is one entry per path at the root. For `alternates.languages`, the sitemap shape, and the OG locale form, link to lesson 6 of chapter 084 rather than re-explaining.

### Moment of truth

Run the lesson's test suite with the project's test command; the expected output is a green pass for the `hreflang`, canonical, and sitemap assertions (the tests parse rendered HTML and the sitemap XML, asserting the emitted tags rather than the source files).

Confirm by hand the requirements the tests don't fully cover, ticking each as you go:

- [ ] The inspector source-HTML `hreflang` panel shows three alternates plus `x-default` on every marketing page, bidirectionally (en-US lists fr-FR and vice versa); `x-default` points to `/`.
- [ ] `curl /fr-FR/pricing | grep canonical` returns the locale-specific URL, not the default.
- [ ] The inspector sitemap preview shows one `<url>` per canonical path with three `<xhtml:link>` alternates each.
- [ ] `/fr-FR/`'s `og:image` points at the French OG image and the fetched image shows French title text; the authed surface carries `robots: { index: false }`.
- [ ] Temporarily setting the canonical to the default URL across all locales loads fine but is the silent ranking-killer (revert after observing); temporarily dropping fr-FR from the en-US page's alternates makes the panel show the now one-sided link — en-US no longer lists fr-FR (revert).

This lesson completes the project surface — locale routing, tz-aware dates and currency, and the SEO surface are all live and confirmed.

---

## Removed — verification folded into per-lesson Moments of truth

The former standalone verify lesson ("Verify the locale switch, DST render, and hreflang audit") is dissolved: each "Done when" clause now lives in the project goals (Chapter framing) and in the owning lesson's Moment of truth. The material below is retained as a reference inventory of deliberate-misuse demos and forward references for the lesson agents to distribute; it is not a lesson.

**Deliberate-misuse demos** (distribute into the owning lesson's Moment of truth as single-flag, revert-after changes — each is the rehearsal of a failure the seam prevents):

- Remove `timeZone` from a `dateTime` call → both DST rows render in UTC. (Lesson 3)
- Hard-code `currency: 'USD'` at the table call site → every amount renders as USD regardless of the invoice's currency. (Lesson 3)
- Replace the plural message with `'{count} invoices'` → the probe shows `'1 invoices'` and French loses its `many` branch. (Lesson 2)
- Remove `setRequestLocale` → marketing routes convert from static to dynamic on `next build`. (Lesson 2)
- Hard-code `<html lang="en-US">` (the start's before-state) → the lang attribute stops matching the URL prefix. (Lesson 2)
- Add a hard-coded `<button>Save</button>` inside `app/[locale]/` → a by-hand grep for JSX strings reports one hit. (Lesson 2)
- Set canonical to the default URL across all locales → pages load but Google would treat the non-default locales as duplicates. (Lesson 4)
- Drop fr-FR from the en-US page's alternates → the `hreflang` panel shows the one-sided link (en-US no longer lists fr-FR). (Lesson 4)

**Forward references** (for the lesson agents to weave where natural, likely the Project Overview's senior framing or the final lesson's close):

- chapter 088 — integration tests against the negotiation middleware and formatters; the `(fr-FR, Pacific/Auckland)` fixture exercises the locale/tz decoupling.
- chapter 090 — Playwright money-path in en-US default; one parallel run in fr-FR catches locale-specific bugs.
- chapter 094 — performance audit; per-locale message-catalog payload is one optimization (provider scope, namespace lazy-load).
- lesson 3 of chapter 097 — CI smoke test fetches `/` and `/fr-FR/`, asserts `<link rel="alternate">` matches `routing.locales`. Regression catcher.
- chapter 082 — error and security baseline; the locale-switch action is one finding category (Zod validation against the supported-locales constant).
- chapter 104 — review a PR adding `'de-DE'`; the "one PR, not a refactor" rehearsal lands here.
