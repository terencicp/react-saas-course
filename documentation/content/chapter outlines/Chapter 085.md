# Chapter 085 — Project: tri-locale invoices list

## Chapter framing

Chapter 085 cashes in Unit 17 as one runnable surface. chapter 083's storage/domain/edge split (`timestamptz` ↔ `Temporal.Instant`, `users.timeZone` profile column, mandatory `timeZone` argument on every formatter) and chapter 084's i18n discipline (translation keys, ICU MessageFormat with CLDR plural categories, the `Intl.*` family, the five-step locale negotiation chain, next-intl 4 on Next.js 16, `alternates.languages`) all converge here. The student takes the chapter 062 invoices list (URL-state filters, soft-delete, `version` concurrency) and lifts it into a tri-locale, tz-aware surface: `en-US`, `en-GB`, `fr-FR` shipped from day one, every string flowing through `t()`, every number through `useFormatter().number`, every date through `useFormatter().dateTime` with the user's profile `timeZone` from the session, `hreflang` and per-locale sitemap entries emitted from `generateMetadata` and `app/sitemap.ts`. Each build slice closes on a state the student can confirm in the browser or the inspector: the locale-routing slice ends with the `[locale]` segment live, the negotiation middleware rewriting URLs, three catalogs translating every UI string, and the pluralized "N invoices" counter rendering per locale; the formatting slice ends with every invoice date displayed in the user's profile tz and every amount formatted per-locale with the invoice's stored currency; the SEO slice ends with `hreflang` in the rendered HTML and a sitemap with per-locale entries.

### Project goals

The project is done when the student can confirm each of these behaviors in the running app and the inspector:

- Switching the profile locale to `fr-FR` re-renders the list with French strings, French status labels, and the comma decimal separator; the URL becomes `/fr-FR/invoices`, `users.locale` updates, and the `NEXT_LOCALE` cookie is set.
- The same `currency` data renders per-locale: EUR `1234.56` shows `'1 234,56 €'` (NBSP thousands) in fr-FR, the same data shows `'1 234,56 $US'` for a USD invoice in fr-FR, and `'£1,234.56'` in en-GB — currency is data on the invoice, format follows the viewer's locale.
- Due dates straddling EU DST render the correct wall-clock for the user's profile `timeZone`: for a `Europe/London` user, `2026-07-01T18:00:00Z` shows `'7:00 PM'` BST and `2026-01-01T18:00:00Z` shows `'6:00 PM'` GMT; switch the user to `America/New_York` and the same instants show `'2:00 PM'` EDT and `'1:00 PM'` EST.
- The pluralized counter respects CLDR per language: en-US shows `'No invoices'` / `'1 invoice'` / `'5 invoices'`; fr-FR shows `'Aucune facture'` / `'1 facture'` / `'1 000 000 de factures'` (the `many` branch).
- Rendered HTML emits bidirectional `<link rel="alternate" hreflang>` plus `x-default` for all three locales on every marketing page, with self-reference present.
- The canonical URL is the locale-specific URL: `curl /fr-FR/pricing | grep canonical` returns `https://app.example.com/fr-FR/pricing`, not the default.
- `<html lang>` matches the URL prefix every render: `/fr-FR/invoices` yields `<html lang="fr-FR">`, an unprefixed path yields `<html lang="en-US">`, `/en-GB/invoices` yields `<html lang="en-GB">`.
- The locale switcher preserves the path and query: at `/invoices?status=paid&cursor=abc123`, switching to French lands `/fr-FR/invoices?status=paid&cursor=abc123`.
- The sitemap at `/sitemap.xml` carries one `<url>` per canonical path with a `<xhtml:link rel="alternate" hreflang>` per locale; marketing OG images render per-locale.
- Marketing routes stay statically rendered across all three locales (the app surface is dynamic because auth-forced).
- Anonymous negotiation works: a private window with browser language `fr-FR` visiting `/` is redirected to `/fr-FR/`; an unsupported `pt-BR` falls back to `en-US` and loads `/` unprefixed; the locale survives refresh, cookie clear, and sign-out because the URL prefix is the strongest signal.
- The structural-discipline audits are green: zero hard-coded JSX strings inside `app/[locale]/`, zero `Date.prototype.toLocaleString` or raw `Intl.*` outside `lib/i18n/` and `lib/temporal.ts`.

### Cross-cutting discipline (threads through every lesson)

**Locale is resolved once in middleware** (`proxy.ts`); downstream code reads only the resolved value — never `Accept-Language` or `navigator.language` outside the sign-up form. **The user's `timeZone` is a profile column** (lesson 3 of chapter 083) piped through `getRequestConfig` so every `useFormatter().dateTime` call gets the right tz without prop-drilling. **Every UI string goes through `t()` or `t.rich`** — a grep for hard-coded JSX strings is a finding; `en-US.json` is the source contract, the other two are translations. **Pluralized counts use ICU `plural`**, never a ternary; `invoices.list.count` carries `=0 / one / other` for English and `=0 / one / many / other` for French (CLDR). **Currency is data on the invoice** — `invoices.currency` rendered via `Intl.NumberFormat(locale, { style: 'currency', currency })`; the same amount renders as `'$1,234.56'` in en-US and `'1 234,56 €'` in fr-FR. **Dates are `Temporal.Instant` from the DB, formatted at the edge** with the user's profile `timeZone` — never the request's; the DST-spanning fixture (`2026-07-01T18:00:00Z` vs `2026-01-01T18:00:00Z` rendered in `Europe/London`) is the load-bearing verification. **Canonical URL is the locale-prefixed URL** (not the default); `hreflang` is bidirectional with `x-default`; `<html lang>` matches the URL prefix every render.

### Dependency carry-in

- **From chapter 062:** `app/(app)/invoices/page.tsx` Server Component (URL-state filters, status filter, cursor pagination), `listInvoices` / `getInvoiceDetail`, soft-delete via `deletedAt`, `version`-precondition update action, the `invoices` / `invoice_lines` / `customers` schema with `currency` text column on `invoices` and `dueDate` on each row.
- **From lesson 1 of chapter 083 / lesson 2 of chapter 083:** `lib/temporal.ts` codecs — `instant` pair (`Temporal.Instant.from` / `.toString()`) and `plainDate` pair; `invoices.createdAt` / `paidAt` read as `Temporal.Instant`, `dueDate` as `Temporal.PlainDate`.
- **From lesson 3 of chapter 083:** `users.timeZone` column (IANA, `'UTC'` default), seeded from the browser at sign-up, validated via `Intl.supportedValuesOf('timeZone')`; `getCurrentUserTimeZone()` helper in `lib/user-time.ts`.
- **From lesson 1 of chapter 084–lesson 3 of chapter 084:** key naming `feature.surface.role`; one-string-one-key; named placeholders; `t.rich` for embedded markup; ICU `plural` with CLDR categories and `=0` exact-match override (`#` for formatted count, `other` mandatory); `Intl.NumberFormat` currency (`style: 'currency'`, `currencyDisplay: 'narrowSymbol'`, `currency` from data); `Intl.DateTimeFormat` Temporal-native with mandatory `timeZone`; `Intl.RelativeTimeFormat` with `numeric: 'auto'`; construct-once via `useFormatter`.
- **From lesson 4 of chapter 084 / lesson 5 of chapter 084:** five-step negotiation chain (URL → profile → cookie → `Accept-Language` best-match → default); `users.locale` paired with `users.timeZone`; `defineRouting` with `localePrefix: 'as-needed'`; `createMiddleware` in `proxy.ts`; `getRequestConfig` returning `{ messages, timeZone, now }`; `setRequestLocale` for static rendering; `generateStaticParams` per-locale; `useTranslations` / `getTranslations`; typed `Link` / `redirect` / `usePathname` from `createNavigation`; the `IntlMessages` global type from `typeof import('../messages/en-US.json')`.
- **From lesson 6 of chapter 084:** `alternates.languages` with self-reference + bidirectional + `x-default`; canonical is the locale-specific URL; `MetadataRoute.Sitemap` with `alternates.languages`; `og:locale` underscore form.
- **From chapter 057 / chapter 059 / chapter 055 / chapter 042:** `authedAction(role, schema, fn)`, `tenantDb(orgId)`, `logAudit`, Better Auth session returning `{ user: { id, email, locale, timeZone }, orgId, role }`; Zod 4 `strictObject`; canonical Result.

### Starter file tree (stubs marked TODO)

```
docker-compose.yml                # provided: postgres:18
drizzle.config.ts                 # provided
next.config.ts                    # provided: cacheComponents: true, next-intl plugin wired
.env.example                      # provided: DATABASE_URL, BETTER_AUTH_SECRET, APP_URL
package.json                      # provided: next-intl@^4, @formatjs/intl-localematcher
scripts/seed.ts                   # provided: 2 orgs, 4 users covering 4 locale/tz pairs incl
                                  #           (fr-FR, Pacific/Auckland), 30 invoices/org with
                                  #           USD/GBP/EUR mix, dueDates straddling 2026 DST
src/
  db/schema.ts                    # provided: users w/ locale + timeZone, invoices, customers
  db/client.ts                    # provided
  lib/
    temporal.ts                   # provided: instant + plainDate codecs
    tenant-db.ts                  # provided (chapter 056)
    authed-action.ts              # provided (chapter 057)
    audit-log.ts                  # provided
    user-time.ts                  # provided: getCurrentUserTimeZone, getCurrentUserLocale
    i18n/
      supported.ts                # provided: SUPPORTED_LOCALES = ['en-US','en-GB','fr-FR'] as const
      routing.ts                  # TODO student
      navigation.ts               # TODO student
      request.ts                  # TODO student
      formats.ts                  # TODO student: shared dateTime/number/relativeTime presets
    seo/
      alternates.ts               # TODO student: generateAlternates(pathname, currentLocale)
      og-locale.ts                # provided: bcp47ToOgLocale ('fr-FR' -> 'fr_FR')
  messages/
    en-US.json                    # provided: full source catalog
    en-GB.json                    # TODO student: diff against en-US (~15 keys: colour, date order)
    fr-FR.json                    # TODO student: full French translation with ICU plurals
  proxy.ts                        # TODO student: createMiddleware(routing)
  app/
    global-error.tsx              # provided
    [locale]/
      layout.tsx                  # TODO student: setRequestLocale, <html lang>, NextIntlClientProvider
      (marketing)/
        page.tsx                  # provided shell; TODO student: generateMetadata
        opengraph-image.tsx       # provided: per-locale OG via getTranslations
        layout.tsx                # provided
      (app)/
        invoices/
          page.tsx                # provided shell from chapter 062; TODO student: t(), useFormatter
          locale-switcher.tsx     # provided: client component, calls setLocaleAction + path swap
          actions.ts              # TODO student: setLocaleAction writes profile + cookie
        layout.tsx                # provided: requireAuth, mounts locale switcher in header
      sitemap.ts                  # (note: actual sitemap at app/sitemap.ts; root-level)
      robots.ts                   # provided: allow all; authed routes noindex per layout
  app/sitemap.ts                  # TODO student: MetadataRoute.Sitemap with alternates.languages
  app/inspector/page.tsx          # provided: locale + tz override, DST toggle, source-HTML hreflang,
                                  #           message-key audit, pluralization probe, sitemap preview,
                                  #           static-vs-dynamic indicator, Lighthouse panel
```

### Reference solution signatures lessons display

- **Routing** (`lib/i18n/routing.ts`): `defineRouting({ locales: SUPPORTED_LOCALES, defaultLocale: 'en-US', localePrefix: 'as-needed' })`; `export type Locale = typeof routing.locales[number]`.
- **Navigation** (`lib/i18n/navigation.ts`): `export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing)`.
- **Request config** (`lib/i18n/request.ts`): `getRequestConfig(async ({ requestLocale }) => { const requested = await requestLocale; const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale; const session = await auth(); const timeZone = session?.user.timeZone ?? 'UTC'; const messages = (await import(\`../../messages/${locale}.json\`)).default; return { locale, messages, timeZone, now: new Date(), formats }; })`.
- **Shared formats** (`lib/i18n/formats.ts`): `dateTime: { short, withTime }`, `number: { compact, currency: { style: 'currency', currencyDisplay: 'narrowSymbol' } }`, `relativeTime: { numeric: 'auto' }` — `as const satisfies Formats`.
- **Proxy** (`proxy.ts`): `export default createMiddleware(routing); export const config = { matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'] }`.
- **Locale layout** (`app/[locale]/layout.tsx`): async; `generateStaticParams = () => routing.locales.map((locale) => ({ locale }))`; awaits `params`, validates via `hasLocale` (else `notFound`), calls `setRequestLocale(locale)`, awaits `getMessages()`, returns `<html lang={locale}><body><NextIntlClientProvider messages={pick(messages, ['nav','locale-switcher'])}>{children}</NextIntlClientProvider></body></html>`.
- **`messages/en-US.json` (excerpt):** `"invoices.list.title": "Invoices"`, `"invoices.list.count": "{count, plural, =0 {No invoices} one {# invoice} other {# invoices}}"`, status labels `draft / sent / paid / overdue`. Currency lives at call site as data, not in the catalog.
- **`messages/fr-FR.json` (excerpt):** `"invoices.list.title": "Factures"`, `"invoices.list.count": "{count, plural, =0 {Aucune facture} one {# facture} many {# de factures} other {# factures}}"`, status `Brouillon / Envoyée / Réglée / En retard`.
- **Set-locale action** (`app/[locale]/(app)/invoices/actions.ts`): `setLocaleAction = authedAction('member', z.strictObject({ locale: z.enum(SUPPORTED_LOCALES) }), async (input, ctx) => { await db.update(users).set({ locale: input.locale }).where(eq(users.id, ctx.user.id)); (await cookies()).set('NEXT_LOCALE', input.locale, { path: '/', sameSite: 'lax' }); return { ok: true, data: null }; })`.
- **Invoices page (excerpts):** `const t = await getTranslations('invoices.list'); const format = await getFormatter(); const tz = await getCurrentUserTimeZone();`. Row date: `format.dateTime(row.createdAt, { dateStyle: 'medium', timeStyle: 'short', timeZone: tz })`. Row currency: `format.number(Number(row.amountMinor) / 100, { style: 'currency', currency: row.currency, currencyDisplay: 'narrowSymbol' })`. Counter: `t('count', { count: rows.length })`. Relative due: compute `Temporal.Now.plainDateISO(tz).until(row.dueDate, { largestUnit: 'days' }).days`, feed to `format.relativeTime(days, 'day')`.
- **Alternates helper** (`lib/seo/alternates.ts`): `generateAlternates(pathname, currentLocale)` returns `{ canonical: env.APP_URL + getPathname({ locale: currentLocale, href: pathname }), languages: { ...Object.fromEntries(routing.locales.map((l) => [l, env.APP_URL + getPathname({ locale: l, href: pathname })])), 'x-default': env.APP_URL + getPathname({ locale: routing.defaultLocale, href: pathname }) } }`.
- **Marketing metadata:** `generateMetadata` reads `locale` from `params`, calls `getTranslations({ locale, namespace: 'marketing.meta' })`, calls `generateAlternates('/', locale)`, assembles `openGraph` with `bcp47ToOgLocale(locale)` and `alternateLocale` mapped over the other locales.
- **Sitemap** (`app/sitemap.ts`): one `MetadataRoute.Sitemap` entry per canonical path (`/`, `/pricing`, `/features`) with `alternates.languages` mapped over `routing.locales`. Root-level, not under `[locale]/`.
- **Env entries:** no new entries over chapter 062 + chapter 084 carry-in.

### Inspector page spec

Single Server Component at `/inspector` (locale-agnostic, not under `[locale]/`) — verifies all build slices.

- **Header:** session-user switcher (four seeded users covering the four locale/tz pairs), org switcher.
- **Locale + tz override:** force-set the active user's `locale` and `timeZone`, deep-link into `/[locale]/invoices`.
- **DST-proof toggle:** renders two seeded invoices side-by-side — `2026-07-01T18:00:00Z` and `2026-01-01T18:00:00Z`. With `timeZone = 'Europe/London'`, first → `'7:00 PM'` (BST), second → `'6:00 PM'` (GMT). Same UTC offset, different wall-clock display because London observes DST only in summer.
- **Currency-by-data panel:** three rows × three locales = nine cells. Same amount, three currencies, three locale-specific renderings.
- **Source-HTML `hreflang` panel:** fetches each locale's marketing pages via server `fetch`, extracts `<link rel="alternate" hreflang>` tags, displays in a table. Verifies self-reference, bidirectionality, `x-default`.
- **Sitemap preview:** parses `/sitemap.xml` and displays the tree with `xhtml:link` alternates.
- **Message-key audit:** grep for hard-coded JSX strings, `Date.prototype.toLocaleString` outside `lib/`, raw `Intl.NumberFormat` outside `lib/i18n/`. Zero hits is green.
- **Pluralization probe:** count input drives each locale's `invoices.list.count` rendering — type 0, 1, 2, 5, 1000000 to verify category transitions.
- **Static-vs-dynamic indicator:** marketing routes = static when `setRequestLocale` correctly applied; missing = dynamic = finding.
- **Lighthouse SEO panel:** runs against marketing root per locale.

Student writes only `lib/i18n/{routing,navigation,request,formats}.ts`, `lib/seo/alternates.ts`, `proxy.ts`, `app/[locale]/layout.tsx`, the invoice page transformation, the locale-switcher action, marketing's `generateMetadata`, `app/sitemap.ts`, `en-GB.json`, and `fr-FR.json`.

### Concepts demonstrated → owning lesson

- Translation-key discipline (`feature.surface.role`, one-string-one-key, named placeholders, `t.rich`) — lesson 1 of chapter 084.
- ICU `plural` with CLDR categories; `=0` exact-match; `other` mandatory — lesson 2 of chapter 084.
- `Intl.NumberFormat` currency from data; `Intl.DateTimeFormat` Temporal-native with mandatory `timeZone`; construct-once via `useFormatter` — lesson 3 of chapter 084.
- Five-step negotiation chain; BCP 47 `Lookup`; geo-IP never primary — lesson 4 of chapter 084.
- `defineRouting` + `localePrefix: 'as-needed'`; `createMiddleware` in `proxy.ts` (Next.js 16 rename) — lesson 5 of chapter 084.
- `getRequestConfig` resolving `messages`, `timeZone`, `now` once per request — lesson 5 of chapter 084 + lesson 3 of chapter 083.
- `setRequestLocale` for static rendering; `generateStaticParams` per-locale — lesson 5 of chapter 084.
- `useTranslations` / `getTranslations`, `useFormatter` / `getFormatter` — lesson 5 of chapter 084 + lesson 3 of chapter 084.
- Typed `Link` / `redirect` / `usePathname` from `createNavigation` — lesson 5 of chapter 084.
- The `IntlMessages` global type for compile-time key safety — lesson 5 of chapter 084.
- `users.locale` paired with `users.timeZone`; `<html lang>` from resolved locale — lesson 4 of chapter 084 + lesson 3 of chapter 083.
- `timestamptz` ↔ `Temporal.Instant` codec; `users.timeZone` piped to every formatter — lesson 1 of chapter 083 + lesson 3 of chapter 083.
- `alternates.languages` with self-reference + bidirectional + `x-default`; canonical = locale-specific URL — lesson 6 of chapter 084.
- `MetadataRoute.Sitemap` with `alternates.languages` emitting `xhtml:link` — lesson 6 of chapter 084.
- OG `og:locale` underscore form + `og:locale:alternate` — lesson 6 of chapter 084.
- `authedAction` wrapper + canonical Result — chapter 057 + chapter 043.

---

## Lesson 1 — Project Overview

The student leaves with the chapter 062 invoices starter running locally in English, the inspector loaded with its pre-build panels, and a clear map of the four lessons ahead. No feature is built.

This is the chapter's tri-locale invoices list: chapter 062's invoices surface (URL-state filters, soft-delete, `version` concurrency) lifted into a tz-aware, three-locale surface — `en-US`, `en-GB`, `fr-FR` — where every string flows through `t()`, every number through `useFormatter().number`, and every date through `useFormatter().dateTime` with the user's profile `timeZone`, while marketing emits `hreflang`, per-locale sitemap entries, and locale-aware OG metadata. One figure shows the finished app: `/invoices` in English with `'$1,234.56'`, `/fr-FR/invoices` with `'1 234,56 €'`, the inspector DST panel showing BST-vs-GMT side-by-side, and view-source on `/fr-FR/` with three `<link rel="alternate">` tags plus `x-default`.

### What we'll practice

- Resolving locale once in middleware (`proxy.ts`) and reading only the resolved value downstream — never `Accept-Language` or `navigator.language` outside the sign-up form.
- Routing every UI string through `t()` / `t.rich`, every number through `useFormatter().number`, and every date through `useFormatter().dateTime` with the profile `timeZone` piped in from the session.
- Writing ICU `plural` catalogs that respect CLDR categories per language, including French's `many` branch and the `=0` exact-match override.
- Treating currency as data on the invoice and formatting it per the viewer's locale.
- Emitting bidirectional `hreflang` with `x-default`, a locale-specific canonical, and a per-locale sitemap from `generateMetadata` and `app/sitemap.ts`.
- Holding the structural discipline that keeps i18n maintainable: grep-able keys, formatters in one seam, `<html lang>` from the resolved locale, static rendering preserved via `setRequestLocale`.

The senior payoff is the canonical 2026 shape for "ship i18n from day one": every later surface inherits `[locale]`, the catalog, and the `useFormatter` / `useTranslations` reflex, so adding a fourth locale is one PR, not a 3–6 week retrofit.

### Architecture

Shape only — a labeled list of the request path:

- **Middleware (`proxy.ts`).** `createMiddleware(routing)` resolves the locale through the five-step negotiation chain (URL → profile → cookie → `Accept-Language` best-match → default) and rewrites the URL once.
- **Request config (`lib/i18n/request.ts`).** `getRequestConfig` settles `messages`, `timeZone` (from the session profile column), `now`, and shared `formats` once per request.
- **`[locale]/` segment.** `setRequestLocale` keeps marketing static; `<html lang>` matches the URL prefix; `NextIntlClientProvider` ships a scoped slice of the catalog.
- **Render seams.** `useTranslations` / `getTranslations` for strings; `useFormatter` / `getFormatter` for dates and currency; `lib/i18n/formats.ts` holds the presets; `lib/temporal.ts` holds the codecs.
- **SEO surface.** `lib/seo/alternates.ts` feeds every marketing `generateMetadata`; `app/sitemap.ts` emits per-locale alternates.

### Starting file tree

The annotated top-level layout is the architect's tree in the Chapter framing (`Starter file tree (stubs marked TODO)`). For the lesson body, comment one line each only on files the lessons touch and mark the TODO stubs as the highlighted focus: the eleven files the student writes are `lib/i18n/{routing,navigation,request,formats}.ts`, `lib/seo/alternates.ts`, `proxy.ts`, `app/[locale]/layout.tsx`, the invoice page transformation, the locale-switcher action, marketing's `generateMetadata`, `app/sitemap.ts`, `messages/en-GB.json`, and `messages/fr-FR.json`. Leave the chapter 062 carry-in, the provided seams (`lib/temporal.ts`, `lib/user-time.ts`, `lib/i18n/supported.ts`, the seeded data, `next.config.ts`'s plugin wiring), and the inspector uncommented except where a lesson reads them.

The orientation that earlier sat in the standalone tour belongs here as brief annotations and lands in full where each file is first written:

- `messages/en-US.json` is the provided source contract — every key `feature.surface.role`, named placeholders, `t.rich` tagged keys, the counter carrying `=0 / one / other`. Its shape is explained in depth in lesson 2 where the student mirrors it into the other two catalogs.
- The seed ships four users — `(en-US, America/New_York)`, `(en-GB, Europe/London)`, `(fr-FR, Europe/Paris)`, `(fr-FR, Pacific/Auckland)` — plus 30 invoices/org with a USD/GBP/EUR mix and `dueDate`s straddling 2026 DST. The `(fr-FR, Pacific/Auckland)` pairing is deliberate: locale and timezone are independent columns (lesson 3 of chapter 083). Currency is text on the invoice — the invoice was issued in EUR regardless of the viewer's locale.
- `lib/user-time.ts` (`getCurrentUserTimeZone` / `getCurrentUserLocale`, each falling back to `'UTC'` / default) and `lib/i18n/supported.ts` (`SUPPORTED_LOCALES = ['en-US','en-GB','fr-FR'] as const`, the single source whose `as const` narrows to the `Locale` union) are the provided seams; `request.ts` reads the first, `routing.ts` reads the second. The locale-switcher (provided client component) renders three options in their own language and calls `setLocaleAction` then a typed path swap; the action is written in lesson 2.
- `next.config.ts` already wraps the config with `createNextIntlPlugin('./src/lib/i18n/request.ts')` and carries `cacheComponents: true` from chapter 062 — the wiring hooks the request-config module.

### Roadmap

One Card per lesson:

- **Lesson 2 — Wire next-intl and ship three catalogs.** Stands up locale routing end-to-end and routes every UI string through `t()` with a CLDR-correct pluralized counter.
- **Lesson 3 — Format dates in profile tz and currency from data.** Flows every date through the formatter with the profile `timeZone` and every amount through the formatter with the invoice's stored currency, plus a Temporal-driven relative-due column.
- **Lesson 4 — Emit hreflang, sitemap alternates, and per-locale OG.** Adds the public SEO surface: bidirectional `hreflang` with `x-default`, a locale-specific canonical, a per-locale sitemap, and per-locale OG images.

### Setup

Command sequence (Steps): clone the starter via `degit`, install dependencies, bring up `postgres:18` via `docker compose`, push the schema, and run the seed. Env vars come from `.env.example` — `DATABASE_URL` (the local Postgres connection string from `docker-compose.yml`), `BETTER_AUTH_SECRET` (any sufficiently long random string for local sessions), and `APP_URL` (the local origin, `http://localhost:3000`, used to build canonical and `hreflang` URLs). No new env entries over the chapter 062 + chapter 084 carry-in.

Dev server command, then the expected result that ends the lesson: `/invoices` lists chapter 062's surface in English (the list query and concurrency action are unchanged), `/fr-FR/invoices` 404s (the `[locale]` segment is not wired yet), and `/inspector` loads with placeholder panels showing pre-build state (hard-coded strings, no `hreflang`, no sitemap).

Scope cuts named here so expectations are set: only three locales (no RTL, no `'de-DE'` / `'es-ES'` / `'pt-PT'`); catalogs live in the repo (no TMS integration); per-locale OG on marketing only; no schema.org structured-data localization, no A/B locale variants, no domain-based locale routing; no edit-invoice CRUD (chapter 062 owns it); no Temporal arithmetic surface (lesson 5 of chapter 083 owns it).

---

## Lesson 2 — Wire next-intl and ship three catalogs

The student wires locale routing end-to-end so that locale-prefixed URLs work, every UI string renders through `t()`, and the pluralized counter renders the right CLDR category per locale.

After this lesson, `/` and `/fr-FR/` both load, `/invoices` and `/fr-FR/invoices` route correctly, the header locale-switcher changes the user's locale and the URL, and the "N invoices" counter renders `'No invoices'` / `'1 invoice'` / `'5 invoices'` in English and `'Aucune facture'` / `'1 facture'` / `'1 000 000 de factures'` in French. Currency and dates still render through the existing en-US formatters — lesson 3 transforms those — so the page renders end-to-end at the locale-prefixed URL.

### Your mission

This lesson stands up the next-intl spine the whole project hangs from. Locale is resolved exactly once, in `proxy.ts` (Next.js 16's rename of `middleware.ts`), through the five-step negotiation chain; every page and layout under `[locale]/` calls `setRequestLocale` before any next-intl call — skip it and the route silently converts from static to dynamic, a perf regression invisible without monitoring. The request can carry an unknown locale string, so `hasLocale(routing.locales, requested)` is the validator that both narrows the type to `Locale` and lets the layout `notFound()` cleanly. The client payload stays small by wrapping children in a `NextIntlClientProvider` scoped to the two namespaces the client needs (`pick`), not the full 3-locale catalog; messages are dynamic-imported per locale so production loads only the active locale's JSON. The English source catalog is provided in full — the pedagogical point is the *shape*, not language proficiency — and the student fills the small en-GB diff and the full fr-FR translation. The load-bearing trap is French pluralization: CLDR gives French a `many` category for large numbers, so a catalog shipping only `one / other` silently mistranslates `1000000`; the counter must use ICU `plural` with `=0 / one / many / other`, never a ternary. Catalogs check into the repo in the exact JSON format every TMS (Crowdin, Lokalise, Phrase) round-trips, but TMS integration is out of scope. Currency and date formatting are deliberately deferred to lesson 3 — leave the existing en-US formatters in place here so the page renders. The locale-switch action writes both the profile column and the `NEXT_LOCALE` cookie (`sameSite: 'lax'` — sufficient for locale, doesn't break OAuth callbacks, GDPR-essential-for-functionality) so the override survives across navigation.

Requirements the student confirms:

- Visiting `/` loads the default-locale marketing page unprefixed, and `/fr-FR/` loads the French marketing page.
- `/invoices` and `/fr-FR/invoices` both route and render, with `/en-GB/invoices` also reachable.
- Every UI string on the invoice surface renders from the catalog, not from hard-coded JSX; switching locale swaps every string.
- The "N invoices" counter renders the correct CLDR category per locale across 0, 1, 5, and 1000000 — including French's `many` branch (`'1 000 000 de factures'`) and the `=0` text (`'Aucune facture'` / `'No invoices'`).
- The header locale switcher changes the active user's locale: the URL gains the right prefix, `users.locale` updates, and the `NEXT_LOCALE` cookie is set.
- `<html lang>` matches the URL prefix on every locale's path.
- An unprefixed visit by an anonymous browser sending `Accept-Language: fr-FR` is redirected to `/fr-FR/`, and the marketing routes remain statically rendered.

### Coding time

Build prompt directs the student to implement against this brief and the tests, then a hidden `<details>` solution walkthrough, organized as the files appear in the repo:

- `lib/i18n/routing.ts`: `defineRouting({ locales: SUPPORTED_LOCALES, defaultLocale: 'en-US', localePrefix: 'as-needed' })` plus `export type Locale`. Rationale for `'as-needed'` (default unprefixed, others prefixed) with `'always'` / `'never'` named as the alternatives and why they lose.
- `lib/i18n/navigation.ts`: `createNavigation(routing)` exports; the grep for `from 'next/link'` inside `app/[locale]/` is the discipline rule.
- `lib/i18n/request.ts`: `getRequestConfig` per the reference signature, walking each returned field — `locale` (validated via `hasLocale`), `messages` (locale-specific dynamic import, code-split), `timeZone` (the session seam from lesson 3 of chapter 083), `now` (stable per-request anchor for relative time), `formats` (minimal here, extended in lesson 3).
- `lib/i18n/formats.ts`: minimal for this lesson — `dateTime: { short, withTime }`, `number: { compact }`, `as const satisfies Formats`. Presets named at the config layer, not inlined.
- `proxy.ts`: `createMiddleware(routing)` plus the `matcher` config skipping API, static assets, and internals; callout on the Next.js 16 rename from `middleware.ts`.
- `app/[locale]/layout.tsx`: `generateStaticParams` over `routing.locales`; async layout awaits `params`, validates via `hasLocale` (else `notFound`), calls `setRequestLocale` before any next-intl call, reads `getMessages`, wraps children in a scoped `NextIntlClientProvider`, sets `<html lang={locale}>`. Callout on why `setRequestLocale` placement is load-bearing.
- `app/[locale]/(app)/invoices/actions.ts`'s `setLocaleAction` per the reference signature: writes the profile column and sets the cookie; rationale for updating both signals.
- The invoice page transformation: `getTranslations('invoices.list')`, every hard-coded JSX string replaced, the counter as `t('count', { count: rows.length })`; note that currency and date formatters stay as the existing en-US calls until lesson 3.
- `messages/en-GB.json`: the ~15-key diff from en-US (colour, date order, currency phrasing) — copy then edit.
- `messages/fr-FR.json`: the full ~80-key translation, with the counter `'{count, plural, =0 {Aucune facture} one {# facture} many {# de factures} other {# factures}}'` and status labels; callout on the `many` branch (CLDR's French rule) and `=0`.

Decision-rationale callouts: scoped provider keeps the client payload at ~8 entries instead of 240; dynamic import code-splits per locale; `sameSite: 'lax'` on the cookie; cookie name `NEXT_LOCALE` is the next-intl default; catalogs check into the repo as the format every TMS consumes. For `getRequestConfig`'s `timeZone` seam and the `users.timeZone` column, link to lesson 3 of chapter 083 rather than re-explaining.

### Moment of truth

Run the lesson's test suite with the project's test command; the expected output is a green pass for the locale-routing and pluralization assertions (the tests target observable behavior: which strings render at which URL, which plural category fires per count).

Confirm by hand the requirements the tests don't fully cover, ticking each as you go:

- [ ] `/` loads unprefixed and `/fr-FR/` loads French marketing; `/invoices`, `/fr-FR/invoices`, and `/en-GB/invoices` all route and render.
- [ ] In the inspector pluralization probe, typing 0, 1, 2, 5, 1000000 walks each locale's counter through the right category transitions — French shows the `many` branch (`'1 000 000 de factures'`) at large counts, and both locales show their `=0` text.
- [ ] Using the header locale switcher lands the prefixed URL, updates `users.locale`, and sets the `NEXT_LOCALE` cookie; `<html lang>` matches the prefix on each path.
- [ ] A private window sending `Accept-Language: fr-FR` is redirected from `/` to `/fr-FR/`; an unsupported `pt-BR` loads `/` unprefixed (falls to `en-US`).
- [ ] The inspector static-vs-dynamic panel shows marketing static across all three locales (a missing `setRequestLocale` would flip it to dynamic).
- [ ] The switcher preserves path and query: at `/invoices?status=paid&cursor=abc123`, switching to French lands `/fr-FR/invoices?status=paid&cursor=abc123`.
- [ ] The inspector message-key audit shows zero hard-coded JSX strings inside `app/[locale]/`; the locale survives a refresh, a cookie clear, and sign-out on a prefixed URL.

Note: currency and date formatting are still en-US at this stage by design — lesson 3 transforms them, so do not treat their en-US rendering as a failure here.

---

## Lesson 3 — Format dates in profile tz and currency from data

The student makes every invoice date render in the viewer's profile timezone and every amount render in the invoice's stored currency, formatted for the viewer's locale, plus a relative "due" column.

After this lesson, `/invoices` shows USD as `'$1,234.56'` with dates in the en-US user's EDT/EST for an `(en-US, America/New_York)` user; switching to fr-FR reflows the same data to `'1 234,56 €'` for EUR and `'1 234,56 $US'` for USD; and switching the user to `Europe/London` in the inspector renders `2026-07-01T18:00:00Z` as `'7:00 PM'` BST and `2026-01-01T18:00:00Z` as `'6:00 PM'` GMT.

### Your mission

This lesson moves every date and money render onto the formatting seam, and the load-bearing idea is that the right wall-clock and the right currency are both decided by data the formatter is handed, not by the runtime. The user's timezone is read once per render from the session (`getCurrentUserTimeZone`) and passed as `timeZone` into every `dateTime` call — omit it and the formatter falls back to the runtime tz (UTC on Vercel) and silently formats every user's data in UTC, a bug that passes every test written without a tz-spanning fixture. `Temporal.Instant` plus an IANA `timeZone` is DST-aware by construction, which is why the two seeded July/January instants render different wall-clock hours in London with no explicit DST handling. Currency is data on the invoice (`currency: row.currency`), never hard-coded and never inferred from the viewer's locale; the symbol style is a UI decision (`currencyDisplay: 'narrowSymbol'` for compact table cells) that lives in the shared preset, not at the call site. `Temporal.PlainDate` is a location-independent calendar date and takes no `timeZone`. The relative-due column uses `Temporal.Now.plainDateISO(tz).until(dueDate, { largestUnit: 'days' }).days` — `largestUnit` is required or the duration splits across units. Out of scope: live per-minute relative time (this is a server-rendered list with fresh data per navigation; a client island is the right shape when truly needed) and bigint amounts beyond `Number.MAX_SAFE_INTEGER` (named, not built). The formatter is async (`getFormatter`) in Server Components and the `useFormatter` hook in client ones; mixing them in one component is a tell it should split.

Requirements the student confirms:

- Every invoice date renders in the viewer's profile timezone: an `America/New_York` user sees EDT/EST, and switching the user to `Europe/London` in the inspector shifts the wall-clock accordingly.
- The two DST-spanning instants render correctly for a `Europe/London` user — `2026-07-01T18:00:00Z` as `'7:00 PM'` BST and `2026-01-01T18:00:00Z` as `'6:00 PM'` GMT — and as `'2:00 PM'` EDT / `'1:00 PM'` EST for a `America/New_York` user.
- Each amount renders in the invoice's stored currency formatted for the viewer's locale: the same EUR datum shows `'1 234,56 €'` in fr-FR, and a USD datum shows `'$1,234.56'` in en-US and `'1 234,56 $US'` in fr-FR.
- The relative-due column reads naturally per locale: `'in 3 days'` / `'5 days ago'` in en-US, `'dans 3 jours'` / `'il y a 5 jours'` in fr-FR.
- The inspector currency-by-data panel shows nine consistent cells (three currencies × three locales), and the DST panel shows the BST-vs-GMT pair side by side.
- The structural audit stays green: zero `Date.prototype.toLocaleString` and zero raw `Intl.*` inside `app/[locale]/` (formatting goes through the seam).

### Coding time

Build prompt directs the student to implement against this brief and the tests, then a hidden `<details>` solution walkthrough, organized as the files appear in the repo:

- The invoice page transformation, per row: `format.dateTime(row.createdAt, { dateStyle: 'medium', timeStyle: 'short', timeZone: tz })`; `format.dateTime(row.dueDate, { dateStyle: 'medium' })` (no tz for `PlainDate`); `format.number(Number(row.amountMinor) / 100, { style: 'currency', currency: row.currency, currencyDisplay: 'narrowSymbol' })`; and the relative-due span via `Temporal.Now.plainDateISO(tz).until(row.dueDate, { largestUnit: 'days' }).days` fed to `format.relativeTime(days, 'day')`. `const tz = await getCurrentUserTimeZone()` read once at the top.
- `lib/i18n/formats.ts` extended with the canonical presets: `dateTime.short` / `dateTime.withTime`, `number.currency` as `{ style: 'currency', currencyDisplay: 'narrowSymbol' }` (currency tag stays at the call site since it's data), `relativeTime: { numeric: 'auto' }` — centralized so a UI-wide change is one edit.
- The inspector currency-by-data and DST panels wired to the seeded data.

Decision-rationale callouts: why `timeZone` is mandatory on every `dateTime` call (the lint-rule framing); why `currencyDisplay` belongs in the preset not the call site (`'name'` / `'code'` are the other options); why `largestUnit: 'days'` is required; the `Number(amountMinor) / 100` conversion and its bigint ceiling. For `Temporal.Instant` / `Temporal.PlainDate` codecs and the `users.timeZone` column, link to lesson 1 of chapter 083 and lesson 3 of chapter 083 rather than re-explaining.

### Moment of truth

Run the lesson's test suite with the project's test command; the expected output is a green pass for the date- and currency-formatting assertions, including the DST-spanning fixture (the tests assert wall-clock output, not formatter internals).

Confirm by hand the requirements the tests don't fully cover, ticking each as you go:

- [ ] `/invoices` as an `(en-US, America/New_York)` user shows USD `'$1,234.56'` and dates in EDT/EST; switching to fr-FR reflows to `'1 234,56 €'` (EUR) and `'1 234,56 $US'` (USD) with no data change.
- [ ] In the inspector DST panel as a `Europe/London` user, the July instant shows `'7:00 PM'` BST and the January instant `'6:00 PM'` GMT; switching to `America/New_York` shows `'2:00 PM'` EDT and `'1:00 PM'` EST.
- [ ] The currency-by-data panel's nine cells are each consistent — same amount, same currency tag, locale-specific format.
- [ ] The relative-due column reads naturally in both locales.
- [ ] Switching to the `(fr-FR, Pacific/Auckland)` user renders French strings with dates in NZDT/NZST — locale and timezone are independent, and the combination works without any combo-specific code.
- [ ] Temporarily removing `timeZone: tz` from a `dateTime` call makes both DST rows render in UTC (revert after observing); this is the rehearsal of the failure the seam prevents.

---

## Lesson 4 — Emit hreflang, sitemap alternates, and per-locale OG

The student gives the marketing surface its public SEO shape: every page emits bidirectional `hreflang` with `x-default`, a locale-specific canonical, a per-locale OG image, and the sitemap carries per-locale alternates.

After this lesson, view-source on any marketing page lists all three locales plus `x-default` (bidirectionally), the canonical of `/fr-FR/pricing` is `https://app.example.com/fr-FR/pricing` (not the default), `/sitemap.xml` carries one `<url>` per canonical path with a `<xhtml:link>` per locale, and `/fr-FR/`'s OG image renders French title text.

### Your mission

This lesson is where the discipline becomes structural defense against the silent failures that define i18n SEO. The canonical must be the locale-specific URL, not the default — canonicalizing every locale to en-US tells Google "fr-FR is a duplicate, only rank en-US" and quietly kills French organic traffic, the single most common i18n ranking-killer. `hreflang` must be self-referential (every page lists its own locale) and bidirectional (every page lists every other supported locale); a missing self-reference or a one-sided declaration is silently dropped by Google, so `generateAlternates` builds the full set from `routing.locales` in one place and every `generateMetadata` calls that one seam rather than hand-assembling tags. `x-default` is the fallback when no alternate matches the user's locale, and for a SaaS the senior call is to point it at the strongest-market default locale (`/`). The OG locale tag uses the underscore form (`'fr_FR'`) where BCP 47 uses the hyphen (`'fr-FR'`); the `bcp47ToOgLocale` helper converts, and shipping the hyphen form is silently treated as invalid by Facebook and LinkedIn. Authed app pages get `robots: { index: false }` and declare no `alternates` — but they still get a `generateMetadata` so future additions don't ship without one. The sitemap is one `<url>` per canonical path with alternates riding along inside each entry (the modern Next.js-native shape, not separate per-locale sitemaps) and lives at the root, not under `[locale]/`, because it is locale-agnostic. Per-locale OG images are strong signals for marketing and weak for authed pages, so they ship on marketing only. One discipline to name but not exercise here: a locale not yet translated should not list a `hreflang` alternate to its URL (or that URL should `noindex`) — this project ships all three translated, but the rule matters for a real rolling multi-locale rollout.

Requirements the student confirms:

- Every marketing page's rendered HTML lists all three locales plus `x-default`, bidirectionally, with the page's own locale self-referenced.
- The canonical on each marketing page is that page's locale-specific URL — `curl /fr-FR/pricing | grep canonical` returns `https://app.example.com/fr-FR/pricing`.
- The OG locale tag is the underscore form for the current locale, with the other locales listed as alternates, and `/fr-FR/`'s OG image renders French title text.
- Authed app pages declare `robots: { index: false }` and emit no `hreflang` alternates.
- `/sitemap.xml` carries one `<url>` per canonical path (`/`, `/pricing`, `/features`) with a `<xhtml:link rel="alternate" hreflang>` per locale inside each entry.

### Coding time

Build prompt directs the student to implement against this brief and the tests, then a hidden `<details>` solution walkthrough, organized as the files appear in the repo:

- `lib/seo/alternates.ts`'s `generateAlternates(pathname, currentLocale)` returning `{ canonical, languages }` per the reference signature: canonical is the locale-specific URL, `languages` is the full set keyed by BCP 47 tag plus `x-default`, built via `getPathname` so the `'as-needed'` prefix is handled. The single seam every `generateMetadata` calls.
- Marketing's `generateMetadata` per reference: `getTranslations({ locale, namespace })` for title/description (the async sibling, required because `generateMetadata` is not a component), `generateAlternates('/', locale)`, and `openGraph` assembled with `bcp47ToOgLocale(locale)` plus `alternateLocale` over the other locales.
- In-app `generateMetadata` with `robots: { index: false }` and no `alternates` — the discipline of declaring metadata everywhere even where the SEO surface is dark.
- `app/sitemap.ts` per reference: one entry per canonical path with `alternates.languages` over `routing.locales`; root-level, not under `[locale]/`.
- The provided `app/[locale]/(marketing)/opengraph-image.tsx` wired (reads `locale`, calls `getTranslations`, returns `ImageResponse`); the inspector source-HTML `hreflang` and sitemap-preview panels wired.

Decision-rationale callouts: why canonical must be locale-specific (the duplicate-content trap); why self-reference and bidirectionality are mandatory and how `Object.fromEntries(routing.locales.map(...))` is the structural guarantee; the `x-default` choice; the OG underscore-vs-hyphen conversion; why the sitemap is one entry per path at the root. For `alternates.languages`, the sitemap shape, and the OG locale form, link to lesson 6 of chapter 084 rather than re-explaining.

### Moment of truth

Run the lesson's test suite with the project's test command; the expected output is a green pass for the `hreflang`, canonical, and sitemap assertions (the tests parse rendered HTML and the sitemap XML, asserting the emitted tags rather than the source files).

Confirm by hand the requirements the tests don't fully cover, ticking each as you go:

- [ ] The inspector source-HTML `hreflang` panel shows three alternates plus `x-default` on every marketing page, bidirectionally (en-US lists fr-FR and vice versa); `x-default` points to `/`.
- [ ] `curl /fr-FR/pricing | grep canonical` returns the locale-specific URL, not the default.
- [ ] The inspector sitemap preview shows one `<url>` per canonical path with three `<xhtml:link>` alternates each.
- [ ] `/fr-FR/`'s `og:image` points at the French OG image and the fetched image shows French title text; authed pages carry `robots: { index: false }`.
- [ ] Temporarily setting the canonical to the default URL across all locales loads fine but is the silent ranking-killer (revert after observing); temporarily dropping fr-FR from the en-US page's alternates makes the panel flag the one-sided link (revert).

This lesson completes the project surface — locale routing, tz-aware dates and currency, and the SEO surface are all live and confirmed.

---

## Removed — verification folded into per-lesson Moments of truth

The former standalone verify lesson ("Verify the locale switch, DST render, and hreflang audit") is dissolved: each "Done when" clause now lives in the project goals (Chapter framing) and in the owning lesson's Moment of truth. The material below is retained as a reference inventory of deliberate-misuse demos and forward references for the lesson agents to distribute; it is not a lesson.

**Deliberate-misuse demos** (distribute into the owning lesson's Moment of truth as single-flag, revert-after changes — each is the rehearsal of a failure the seam prevents):

- Remove `timeZone: tz` from a `dateTime` call → both DST rows render in UTC. (Lesson 3)
- Hard-code `currency: 'USD'` → every amount renders as USD regardless of the invoice's currency. (Lesson 3)
- Replace the plural message with `'{count} invoices'` → the probe shows `'1 invoices'` and French loses its `many` branch. (Lesson 2)
- Remove `setRequestLocale` → marketing routes convert from static to dynamic on rebuild. (Lesson 2)
- Hard-code `<html lang="en">` → the lang attribute stops matching the URL prefix. (Lesson 2)
- Add a hard-coded `<button>Save</button>` → the message-key audit reports one hit. (Lesson 2)
- Set canonical to the default URL across all locales → pages load but Google would treat the non-default locales as duplicates. (Lesson 4)
- Drop fr-FR from the en-US page's alternates → the `hreflang` panel flags the one-sided link. (Lesson 4)

**Forward references** (for the lesson agents to weave where natural, likely the Project Overview's senior framing or the final lesson's close):

- chapter 088 — integration tests against the negotiation middleware and formatters; the `(fr-FR, Pacific/Auckland)` fixture exercises the locale/tz decoupling.
- chapter 090 — Playwright money-path in en-US default; one parallel run in fr-FR catches locale-specific bugs.
- chapter 094 — performance audit; per-locale message-catalog payload is one optimization (provider scope, namespace lazy-load).
- lesson 3 of chapter 097 — CI smoke test fetches `/` and `/fr-FR/`, asserts `<link rel="alternate">` matches `routing.locales`. Regression catcher.
- chapter 082 — error and security baseline; the locale-switch action is one finding category (Zod validation against the supported-locales constant).
- chapter 104 — review a PR adding `'de-DE'`; the "one PR, not a refactor" rehearsal lands here.
