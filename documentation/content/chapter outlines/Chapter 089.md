# Chapter 089 — Project: tri-locale invoices list

## Chapter framing

Chapter 089 cashes in Unit 18 as one runnable surface. chapter 087's storage/domain/edge split (`timestamptz` ↔ `Temporal.Instant`, `users.timeZone` profile column, mandatory `timeZone` argument on every formatter) and chapter 088's i18n discipline (translation keys, ICU MessageFormat with CLDR plural categories, the `Intl.*` family, the five-step locale negotiation chain, next-intl 4 on Next.js 16, `alternates.languages`) all converge here. The student takes the chapter 066 invoices list (URL-state filters, soft-delete, `version` concurrency) and lifts it into a tri-locale, tz-aware surface: `en-US`, `en-GB`, `fr-FR` shipped from day one, every string flowing through `t()`, every number through `useFormatter().number`, every date through `useFormatter().dateTime` with the user's profile `timeZone` from the session, `hreflang` and per-locale sitemap entries emitted from `generateMetadata` and `app/sitemap.ts`. Each build slice closes on a runnable state: lesson 3 of chapter 089 ends with the `[locale]` segment live, the negotiation middleware rewriting URLs, three catalogs translating every UI string, and the pluralized "N invoices" counter rendering per locale; lesson 4 of chapter 089 ends with every invoice date displayed in the user's profile tz and every amount formatted per-locale with the invoice's stored currency; lesson 5 of chapter 089 ends with `hreflang` in the rendered HTML and a sitemap with per-locale entries; lesson 6 of chapter 089 walks "Done when" clause-by-clause against the DST-spanning render, the locale-switch reflow, and the source-HTML `hreflang` audit.

Threads through every lesson. **Locale is resolved once in middleware** (`proxy.ts`); downstream code reads only the resolved value — never `Accept-Language` or `navigator.language` outside the sign-up form. **The user's `timeZone` is a profile column** (lesson 3 of chapter 087) piped through `getRequestConfig` so every `useFormatter().dateTime` call gets the right tz without prop-drilling. **Every UI string goes through `t()` or `t.rich`** — a grep for hard-coded JSX strings is a finding; `en-US.json` is the source contract, the other two are translations. **Pluralized counts use ICU `plural`**, never a ternary; `invoices.list.count` carries `=0 / one / other` for English and `=0 / one / many / other` for French (CLDR). **Currency is data on the invoice** — `invoices.currency` rendered via `Intl.NumberFormat(locale, { style: 'currency', currency })`; the same amount renders as `'$1,234.56'` in en-US and `'1 234,56 €'` in fr-FR. **Dates are `Temporal.Instant` from the DB, formatted at the edge** with the user's profile `timeZone` — never the request's; the DST-spanning fixture (`2026-07-01T18:00:00Z` vs `2026-01-01T18:00:00Z` rendered in `Europe/London`) is the load-bearing verification. **Canonical URL is the locale-prefixed URL** (not the default); `hreflang` is bidirectional with `x-default`; `<html lang>` matches the URL prefix every render.

### Dependency carry-in

- **From chapter 066:** `app/(app)/invoices/page.tsx` Server Component (URL-state filters, status filter, cursor pagination), `listInvoices` / `getInvoiceDetail`, soft-delete via `deletedAt`, `version`-precondition update action, the `invoices` / `invoice_lines` / `customers` schema with `currency` text column on `invoices` and `dueDate` on each row.
- **From lesson 1 of chapter 087 / lesson 2 of chapter 087:** `lib/temporal.ts` codecs — `instant` pair (`Temporal.Instant.from` / `.toString()`) and `plainDate` pair; `invoices.createdAt` / `paidAt` read as `Temporal.Instant`, `dueDate` as `Temporal.PlainDate`.
- **From lesson 3 of chapter 087:** `users.timeZone` column (IANA, `'UTC'` default), seeded from the browser at sign-up, validated via `Intl.supportedValuesOf('timeZone')`; `getCurrentUserTimeZone()` helper in `lib/user-time.ts`.
- **From lesson 1 of chapter 088–lesson 3 of chapter 088:** key naming `feature.surface.role`; one-string-one-key; named placeholders; `t.rich` for embedded markup; ICU `plural` with CLDR categories and `=0` exact-match override (`#` for formatted count, `other` mandatory); `Intl.NumberFormat` currency (`style: 'currency'`, `currencyDisplay: 'narrowSymbol'`, `currency` from data); `Intl.DateTimeFormat` Temporal-native with mandatory `timeZone`; `Intl.RelativeTimeFormat` with `numeric: 'auto'`; construct-once via `useFormatter`.
- **From lesson 4 of chapter 088 / lesson 5 of chapter 088:** five-step negotiation chain (URL → profile → cookie → `Accept-Language` best-match → default); `users.locale` paired with `users.timeZone`; `defineRouting` with `localePrefix: 'as-needed'`; `createMiddleware` in `proxy.ts`; `getRequestConfig` returning `{ messages, timeZone, now }`; `setRequestLocale` for static rendering; `generateStaticParams` per-locale; `useTranslations` / `getTranslations`; typed `Link` / `redirect` / `usePathname` from `createNavigation`; the `IntlMessages` global type from `typeof import('../messages/en-US.json')`.
- **From lesson 6 of chapter 088:** `alternates.languages` with self-reference + bidirectional + `x-default`; canonical is the locale-specific URL; `MetadataRoute.Sitemap` with `alternates.languages`; `og:locale` underscore form.
- **From chapter 061 / chapter 063 / chapter 059 / chapter 046:** `authedAction(role, schema, fn)`, `tenantDb(orgId)`, `logAudit`, Better Auth session returning `{ user: { id, email, locale, timeZone }, orgId, role }`; Zod 4 `strictObject`; canonical Result.

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
    tenant-db.ts                  # provided (chapter 060)
    authed-action.ts              # provided (chapter 061)
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
          page.tsx                # provided shell from chapter 066; TODO student: t(), useFormatter
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
- **Env entries:** no new entries over chapter 066 + chapter 088 carry-in.

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

### Verify recipe mapped to "Done when"

| Done-when clause | Verify step |
| --- | --- |
| `fr-FR` re-renders list with French strings | Open `/invoices` as en-US user → header "Invoices". Switch locale → French. Lands `/fr-FR/invoices`; header "Factures". `users.locale` updated; `NEXT_LOCALE` cookie set. |
| Comma decimal separator in fr-FR | EUR `1234.56` renders `'1 234,56 €'` (NBSP thousands); USD same data shows `'1 234,56 $US'`; GBP `'£1,234.56'` in en-GB. Inspector currency-by-data panel verifies in one screen. |
| `EUR` renders correctly per locale | Same `currency: 'EUR'` data, three locale-specific renderings — currency is data, format is locale. |
| Due dates across EU DST render correct zone | London/`Europe/London` user: `2026-07-01T18:00:00Z` → `'7:00 PM'` BST; `2026-01-01T18:00:00Z` → `'6:00 PM'` GMT. Switch user to `America/New_York`: `'2:00 PM'` EDT and `'1:00 PM'` EST. |
| Three `hreflang` tags + `x-default` | Source-HTML panel: every page lists all three locales plus `x-default`. Bidirectional. |
| Pluralized counter respects CLDR | en-US: `'1 invoice'` / `'5 invoices'`; fr-FR: `'1 facture'` / `'1 000 000 de factures'` (the `many` branch); all `=0`: `'No invoices'` / `'Aucune facture'`. |
| Static rendering preserved for marketing | Static-vs-dynamic panel: marketing = static all three locales; app dynamic (auth-forced). |
| Sitemap per-locale alternates | `/sitemap.xml` → one `<url>` per canonical path, with `<xhtml:link rel="alternate" hreflang>` per locale. |
| Canonical is locale-specific URL | `curl /fr-FR | grep canonical` → `https://app.example.com/fr-FR`. Not `/`. |
| `<html lang>` matches URL prefix | `/fr-FR/invoices` → `<html lang="fr-FR">`; unprefixed → `<html lang="en-US">`; `/en-GB/invoices` → `<html lang="en-GB">`. |
| Locale-switcher preserves path | At `/invoices?status=paid` → switch French → `/fr-FR/invoices?status=paid`. |
| No hard-coded strings in JSX | Message-key audit zero hits inside `app/[locale]/`. |
| No `Intl.X` / `toLocaleString` outside seam | Audit zero hits outside `lib/i18n/` and `lib/temporal.ts`. |
| Refresh on non-default URL keeps locale | `/fr-FR/invoices` survives refresh, cookie clear, sign-out. URL prefix is strongest signal. |
| Anonymous `Accept-Language: fr-FR` lands French | Private window, browser lang fr-FR, visit `/` → 302 → `/fr-FR/`. |
| Best-match `pt-BR` falls to default | No `pt` in supported set; `Lookup` returns `en-US` (default). |

### Concepts demonstrated → owning lesson

- Translation-key discipline (`feature.surface.role`, one-string-one-key, named placeholders, `t.rich`) — lesson 1 of chapter 088.
- ICU `plural` with CLDR categories; `=0` exact-match; `other` mandatory — lesson 2 of chapter 088.
- `Intl.NumberFormat` currency from data; `Intl.DateTimeFormat` Temporal-native with mandatory `timeZone`; construct-once via `useFormatter` — lesson 3 of chapter 088.
- Five-step negotiation chain; BCP 47 `Lookup`; geo-IP never primary — lesson 4 of chapter 088.
- `defineRouting` + `localePrefix: 'as-needed'`; `createMiddleware` in `proxy.ts` (Next.js 16 rename) — lesson 5 of chapter 088.
- `getRequestConfig` resolving `messages`, `timeZone`, `now` once per request — lesson 5 of chapter 088 + lesson 3 of chapter 087.
- `setRequestLocale` for static rendering; `generateStaticParams` per-locale — lesson 5 of chapter 088.
- `useTranslations` / `getTranslations`, `useFormatter` / `getFormatter` — lesson 5 of chapter 088 + lesson 3 of chapter 088.
- Typed `Link` / `redirect` / `usePathname` from `createNavigation` — lesson 5 of chapter 088.
- The `IntlMessages` global type for compile-time key safety — lesson 5 of chapter 088.
- `users.locale` paired with `users.timeZone`; `<html lang>` from resolved locale — lesson 4 of chapter 088 + lesson 3 of chapter 087.
- `timestamptz` ↔ `Temporal.Instant` codec; `users.timeZone` piped to every formatter — lesson 1 of chapter 087 + lesson 3 of chapter 087.
- `alternates.languages` with self-reference + bidirectional + `x-default`; canonical = locale-specific URL — lesson 6 of chapter 088.
- `MetadataRoute.Sitemap` with `alternates.languages` emitting `xhtml:link` — lesson 6 of chapter 088.
- OG `og:locale` underscore form + `og:locale:alternate` — lesson 6 of chapter 088.
- `authedAction` wrapper + canonical Result — chapter 061 + chapter 047.

---

## Lesson 1 — Brief and Done-when

Frames the build, scope cuts, and the "Done when" clauses for lifting the chapter 066 invoices list into a tri-locale, tz-aware surface with `hreflang` and per-locale sitemap entries.

Goals:

- Frame the build: take chapter 066's invoices list and ship it in three locales with full tz-awareness. Every string through `t()`; every number through `useFormatter().number`; every date through `useFormatter().dateTime` with profile `timeZone`. Locale resolution runs in `proxy.ts`, settles on the request, downstream reads the resolved value only. Marketing ships `hreflang`, per-locale sitemap entries, locale-aware OG metadata.
- State "Done when" in one paragraph: switching profile locale to `fr-FR` re-renders list with French strings, comma decimal separator, EUR rendered as `'1 234,56 €'`; due dates straddling EU DST render correct wall-clock per user's `timeZone`; rendered HTML emits bidirectional `<link rel="alternate" hreflang>` plus `x-default` for all three locales.
- Scope cuts: only three locales (no RTL, no `'de-DE'` / `'es-ES'` / `'pt-PT'` shipped); no TMS integration (catalogs in repo); no per-locale OG for the app surface (marketing only); no schema.org structured-data localization; no A/B locale variants; no domain-based locale routing; no edit-invoice CRUD (chapter 066 owns); no Temporal arithmetic surface (lesson 5 of chapter 087 owns); refresh-resets explicitly not a concern.
- Senior payoff: the canonical 2026 shape for "ship i18n from day one." Every later surface inherits `[locale]`, the catalog, the `useFormatter` / `useTranslations` reflex; adding a fourth locale is one PR, not a refactor. The discipline is structural — keys grep-able, formatters in one place, `hreflang` auto-emitted. Single-locale launches that skip this pay 3–6 weeks of retrofit later.
- Show the end UX: `/invoices` English with `'$1,234.56'`; `/fr-FR/invoices` with `'1 234,56 €'`; the DST panel showing BST-vs-GMT side-by-side; view-source on `/fr-FR/` with three `<link rel="alternate">` tags.
- Link the starter via `degit`.

Senior calls and watch-outs:

- The starter ships the chapter 066 surface end-to-end, `users.locale` + `users.timeZone` already migrated, `next-intl@^4` installed. All changes live under `[locale]/`, `lib/i18n/`, `lib/seo/`, `messages/`, and marketing — chapter 066's list query and concurrency action stay untouched.
- English source catalog provided in full; the student fills `en-GB.json` (small diff) and `fr-FR.json` (full French including the `many` ICU category). The pedagogical point is the *shape*, not language proficiency.
- Three locales ships with bidirectional `hreflang` and `x-default`. Skipping `x-default` (or canonicalizing all locales to en-US) is the canonical SEO failure — the verify lesson rehearses both as deliberate-misuse demos.
- DST-spanning render is the load-bearing observation: same UTC instant, different wall-clock hour, because London observes DST in summer but not winter. Two specific seeded instants make the proof concrete.

Codebase state at entry: empty repo. At exit: starter cloned, schema migrated, seed loaded; `/invoices` lists in English (chapter 066 unchanged); `/fr-FR/invoices` 404s; `/inspector` loads with placeholder panels.

Estimated student time: 10–15 minutes.

---

## Lesson 2 — Tour the starter

Walks the provided file tree, the English source catalog, the four seeded locale/tz user combinations, and the inspector panels that map to each verification clause.

Goals:

- Walk file tree: provided vs stubbed (per the framing's tree). Linger on the eleven files the student writes.
- Read `messages/en-US.json` end-to-end. Every key `feature.surface.role`. Pluralized counter carries `=0 / one / other` for English; the student mirrors with French's `=0 / one / many / other`. Named placeholders (`{date}`, `{count}`, `{name}`); `t.rich` tagged keys (`auth.signUp.terms`). Read 10 keys aloud to internalize the shape.
- Read seeded data: four users — `(en-US, America/New_York)`, `(en-GB, Europe/London)`, `(fr-FR, Europe/Paris)`, `(fr-FR, Pacific/Auckland)`. The last pairs an unusual locale-tz combo deliberately (independent columns from lesson 3 of chapter 087). 30 invoices/org with USD/GBP/EUR mix; `dueDate` straddling 2026 DST boundaries.
- Read `lib/user-time.ts`: `getCurrentUserTimeZone()` returns `session?.user.timeZone ?? 'UTC'`; same for locale. These are the seams `getRequestConfig` reads.
- Read the locale-switcher: three options rendered in their own language (`'English (US)' / 'English (UK)' / 'Français'`), calls `setLocaleAction` (TODO) then `router.replace(usePathname({ locale: newLocale }))`.
- Read `lib/i18n/supported.ts`: `SUPPORTED_LOCALES = ['en-US','en-GB','fr-FR'] as const;` — single source.
- Read `next.config.ts`: next-intl plugin wraps the config (`createNextIntlPlugin('./src/lib/i18n/request.ts')`); `cacheComponents: true` carries from chapter 066.
- Read the inspector tour so the student maps panels to verification clauses.
- Run the app: `/invoices` renders chapter 066's surface in English. `/fr-FR/invoices` → 404. `/inspector` loads; audit panels show pre-build state (hard-coded strings, no `hreflang`, no sitemap).

Senior calls and watch-outs:

- The `[locale]` segment replaces the current `app/(app)/invoices/page.tsx` path — the starter ships the file already under `[locale]/`, so the student edits imports and string sites; the move itself is conceptual.
- `SUPPORTED_LOCALES as const` — type narrows to the union, `Locale = typeof routing.locales[number]` resolves to `'en-US' | 'en-GB' | 'fr-FR'`. Spine of compile-time safety.
- The `(fr-FR, Pacific/Auckland)` combo verifies the chapter's premise: locale and timezone are independent. A naive "render in the locale's default tz" produces wrong results for this user.
- `invoices.currency` is text — currency is data, not UI. The invoice was issued in EUR regardless of viewer's locale.
- `next.config.ts` already wires the plugin; the wiring teaches what `createNextIntlPlugin` does (hooks the request-config module).

Codebase state at entry: starter cloned. At exit: every provided file read, inspector clicked through. No code written.

Estimated student time: 20–30 minutes.

---

## Lesson 3 — Wire next-intl and ship three catalogs

Fills `routing.ts`, `navigation.ts`, `request.ts`, `formats.ts`, `proxy.ts`, and `app/[locale]/layout.tsx`, writes the en-GB and fr-FR catalogs with CLDR plurals, and routes every UI string through `t()`.

Goals:

- Fill `lib/i18n/routing.ts`: `defineRouting({ locales: SUPPORTED_LOCALES, defaultLocale: 'en-US', localePrefix: 'as-needed' })`. Each option explained: `locales` (BCP 47 union), `defaultLocale` (unprefixed under `'as-needed'`), `localePrefix: 'as-needed'` ('en-US' unprefixed, others prefixed). Alternatives named: `'always'` (every URL prefixed) and `'never'` (rare, SEO weak).
- Fill `lib/i18n/navigation.ts`: `export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing)`. Audit grep for `from 'next/link'` inside `app/[locale]/` is the finding rule.
- Fill `lib/i18n/request.ts`: `getRequestConfig` per the reference signature — reads `requestLocale`, validates via `hasLocale`, reads tz from session, dynamic-imports messages by locale, returns `{ locale, messages, timeZone, now, formats }`. Walk each field: `locale` (validated), `messages` (locale-specific code-split), `timeZone` (session seam from lesson 3 of chapter 087), `now` (stable per-request anchor for `RelativeTimeFormat`), `formats` (shared presets, minimal for now).
- Fill `lib/i18n/formats.ts` minimally for lesson 4 of chapter 089: `dateTime: { short, withTime }`, `number: { compact }`, `as const satisfies Formats`. Presets named at config layer, not inlined per-call-site.
- Fill `proxy.ts` (note Next.js 16 rename from `middleware.ts`): `export default createMiddleware(routing); export const config = { matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'] }`. Skips API, static assets, internals.
- Fill `app/[locale]/layout.tsx`: `generateStaticParams` returns `routing.locales.map((locale) => ({ locale }))`; layout is async, awaits `params`, validates via `hasLocale` (else `notFound`), calls `setRequestLocale(locale)` *before* any next-intl call (load-bearing — without it the layout silently converts to dynamic), reads `await getMessages()`, wraps `{children}` in scoped `<NextIntlClientProvider messages={pick(messages, ['nav','locale-switcher'])}>`. `<html lang={locale}>` on root.
- Translate `messages/en-GB.json`: small diffs from `en-US` (~15 keys: colour, date order, currency phrasing). Copy/paste then edit.
- Translate `messages/fr-FR.json` end-to-end. Pluralized counter: `'{count, plural, =0 {Aucune facture} one {# facture} many {# de factures} other {# factures}}'` — note the `many` branch (CLDR's French rule for large numbers / fractions) and `=0`. Status: "Brouillon", "Envoyée", "Réglée", "En retard". ~80 keys; ~20–25 minutes with the source as scaffold.
- Fill `app/[locale]/(app)/invoices/actions.ts`'s `setLocaleAction` per reference: writes profile column *and* sets `NEXT_LOCALE` cookie. Both signals updated so anonymous-session-style navigation honors the override.
- Transform the invoice page to read translated strings: `const t = await getTranslations('invoices.list')`; replace every hard-coded JSX string. Pluralized counter: `<p>{t('count', { count: rows.length })}</p>`. Currency and date formatters land in lesson 4 of chapter 089 — for now, leave existing en-US formatters in place so the page renders. Intermediate runnable: locale-prefixed URLs work, strings translate, but currency/date still hard-coded en-US.
- Run the app: `/` loads (default unprefixed). `/fr-FR/` loads French marketing. `/invoices` English strings + counter. `/fr-FR/invoices` French strings + counter (try 0, 1, 5, 1000000 — categories switch correctly). Locale-switcher in header changes user's locale + URL. Inspector pluralization probe confirms.

Senior calls and watch-outs:

- `proxy.ts` not `middleware.ts` — Next.js 16's rename. Functionally identical; the new name is what current code uses.
- `setRequestLocale` is mandatory in every page/layout under `[locale]/`. Skip it and the route silently converts to dynamic — perf regression invisible without monitoring. Top-of-file reflex before any next-intl call.
- `hasLocale(routing.locales, requested)` is the safe validator — the request can carry an unknown string; `hasLocale` narrows the type and lets the layout `notFound()` cleanly. Skipping validation means TypeScript can't narrow `string` to `Locale` downstream.
- Cookie's `sameSite: 'lax'` is the senior default — sufficient for locale-switch, doesn't break OAuth callbacks, GDPR-essential-for-functionality. Cookie name `NEXT_LOCALE` (next-intl default).
- French plural categories include `many` for ~1000000 — verify in the probe panel. A catalog that ships only `one / other` for French silently mistranslates large numbers (the `other` branch fires when it shouldn't). CLDR is the source of truth.
- `<NextIntlClientProvider messages={pick(...)}>` scope keeps the client payload small. Full catalog × 3 locales would be 240 entries; picking two namespaces ships 8.
- `import('../../messages/${locale}.json')` dynamic import code-splits per locale. Production loads only the active locale's JSON.
- Catalogs check into the repo. TMS integration (Crowdin, Lokalise, Phrase) round-trips the JSON; chapter doesn't ship integration, ships the format every TMS consumes.

Codebase state at entry: chapter 066 surface in English only, `next-intl@^4` installed, schema with locale + tz columns, no proxy, no `[locale]/`, hard-coded strings everywhere.
Codebase state at exit: `routing.ts`, `navigation.ts`, `request.ts`, `formats.ts` (minimal) filled. `proxy.ts` middleware live. `app/[locale]/layout.tsx` renders with `setRequestLocale` and `<html lang>`. Three catalogs complete. `setLocaleAction` wired. Invoice page reads translated strings and renders pluralized counter per locale. `/fr-FR/invoices` and `/en-GB/invoices` route correctly; locale-switcher works end-to-end. **Runnable — locale routing live, every UI string translated, pluralized counter respects CLDR; currency and date formatting still hard-coded (transformed in lesson 4 of chapter 089).**

Estimated student time: 75–90 minutes. Heaviest setup lesson — wiring + translation converge here.

---

## Lesson 4 — Format dates in profile tz, currency from data

Routes every invoice date through `useFormatter().dateTime` with the user's profile `timeZone` and every amount through `format.number` with the invoice's stored `currency`, plus a Temporal-driven relative-due column.

Goals:

- Transform every date / currency render on the invoice list to flow through `useFormatter` / `getFormatter`. Data side from chapter 087: `createdAt: Temporal.Instant`, `dueDate: Temporal.PlainDate`, `amountMinor: bigint`, `currency: text`. Formatting side: `format.dateTime(instant, { dateStyle, timeStyle, timeZone })` and `format.number(amount, { style: 'currency', currency })`.
- Read user's tz from the request: `const tz = await getCurrentUserTimeZone()`. Pass `timeZone: tz` into every `dateTime` call. Load-bearing — without it, the formatter defaults to runtime tz (UTC on Vercel) and silently formats every user's data in UTC.
- Transform the invoice page. Pattern per row: `format.dateTime(row.createdAt, { dateStyle: 'medium', timeStyle: 'short', timeZone: tz })` for `createdAt`; `format.dateTime(row.dueDate, { dateStyle: 'medium' })` for `dueDate` (`PlainDate` needs no tz); `format.number(Number(row.amountMinor) / 100, { style: 'currency', currency: row.currency, currencyDisplay: 'narrowSymbol' })` for amount.
- Add the "due relative" column: `const today = Temporal.Now.plainDateISO(tz); const days = today.until(row.dueDate, { largestUnit: 'days' }).days; <span>{format.relativeTime(days, 'day')}</span>`. en-US: `'in 3 days'` / `'5 days ago'`; fr-FR: `'dans 3 jours'` / `'il y a 5 jours'`. `numeric: 'auto'` adds `'yesterday'` / `'tomorrow'` where supported.
- Extend `lib/i18n/formats.ts` with canonical presets. `dateTime.short` (date only, medium style), `dateTime.withTime` (date + time medium), `number.currency` as `{ style: 'currency', currencyDisplay: 'narrowSymbol' }` (currency tag at call site since it's data), `relativeTime: { numeric: 'auto' }`. Senior reach: presets centralized so UI-wide change is one edit.
- Wire inspector currency-by-data panel: three rows × three locales × three currencies. Wire DST-proof panel: two seeded instants viewed as London user — `'7:00 PM'` BST and `'6:00 PM'` GMT. Switch to NY user: `'2:00 PM'` EDT and `'1:00 PM'` EST. Same UTC instants, formatter respects DST without explicit handling because `Temporal.Instant` + IANA `timeZone` is DST-aware by construction.
- Audit step: grep `Date.prototype.toLocaleString` and raw `Intl.NumberFormat` across `app/[locale]/`. Zero hits expected. Grep `Intl.DateTimeFormat()` (no arg) — zero hits; add one deliberately, see the finding, revert.
- Run the app: `/invoices` correct for en-US (USD as `'$1,234.56'`, dates in EDT/EST). Switch to fr-FR: same data reflows (`'1 234,56 €'` for EUR, `'1 234,56 $US'` for USD). Switch user to London via inspector: `2026-07-01T18:00:00Z` shows `'7:00 PM'` BST. Inspector panels pass.

Senior calls and watch-outs:

- Currency is *data*, not UI. Never hard-code the symbol or assume the viewer's locale carries it; `currency: row.currency` is the seam end-to-end.
- `currencyDisplay: 'narrowSymbol'` is the UI default (compact `$` instead of `US$` for table cells). `'name'` for verbose receipts ("US dollars"); `'code'` for technical surfaces ("USD"). Switch in the preset; never per-call-site.
- The `timeZone` argument is mandatory in code review terms. The typed `useFormatter` hook accepts `timeZone` per call (not constructor-time), so the engineer writes it every time. Lint rule: any `dateTime(` call without `timeZone` in options is a finding.
- `Temporal.PlainDate` doesn't need a `timeZone` — calendar date, location-independent. Passing one is harmless (formatter ignores); omission is senior intent.
- Relative-time uses `Temporal.Now.plainDateISO(tz).until(row.dueDate, { largestUnit: 'days' }).days`. `largestUnit: 'days'` is required — without it the duration returns multiple units separately. Pick the unit that matches UI resolution.
- For "live" relative-time ("3 minutes ago" updating per-minute), chapter doesn't reach — server-rendered list, fresh data per navigation. A client island for live updates is the right shape when needed; named once.
- `format.number(Number(row.amountMinor) / 100, ...)` — `amountMinor` is bigint cents; convert to `number` for the formatter. For amounts exceeding `Number.MAX_SAFE_INTEGER`, the senior reach is `BigInt` end-to-end with `Intl.NumberFormat`'s bigint support — out of scope; named.
- The `formats` object in `request.ts` makes presets reusable. `format.dateTime(value, 'short')` references the named preset instead of inlining options. Chapter ships both forms; senior call: prefer presets, inline only when surface is genuinely unique.
- `getFormatter()` async is fine in Server Components. Client uses the `useFormatter()` hook. Mixing is a tell a component should split.

Codebase state at entry: locale-prefixed URLs work, every UI string translated, pluralized counter respects CLDR, but every date and amount still rendered through hard-coded en-US formatters.
Codebase state at exit: every invoice list cell flows through `useFormatter` / `getFormatter`; `dateTime` calls pass `timeZone: tz`; `number` calls pass `currency: row.currency`; DST-spanning instants render with correct wall-clock per viewer's tz; the currency-by-data panel verifies; `formats.ts` carries shared presets. **Runnable — full tz-aware, currency-aware list view; SEO surface (hreflang, sitemap) not yet wired.**

Estimated student time: 55–70 minutes.

---

## Lesson 5 — Emit hreflang, sitemap alternates, and per-locale OG

Builds `generateAlternates`, transforms marketing's `generateMetadata` with locale-specific canonical plus bidirectional `hreflang` and `x-default`, and emits `app/sitemap.ts` with per-entry locale alternates.

Goals:

- Fill `lib/seo/alternates.ts`'s `generateAlternates(pathname, currentLocale)`: returns `{ canonical, languages }`. `canonical` is the locale-prefixed URL for `currentLocale` (locale-specific, not default). `languages` is keyed by each BCP 47 tag plus `x-default` mapped to default locale's URL. Use `getPathname({ locale, href: pathname })` from `lib/i18n/navigation.ts` — handles `'as-needed'` prefix correctly. Single seam; every `generateMetadata` calls it.
- Transform marketing's `generateMetadata` per reference: reads `locale` from params, calls `getTranslations({ locale, namespace: 'marketing.meta' })` for title/description (async sibling of `useTranslations`, required because `generateMetadata` is not a component), calls `generateAlternates('/', locale)`, assembles `openGraph` with `bcp47ToOgLocale(locale)` and `alternateLocale` mapped over the other locales.
- Repeat the `generateMetadata` pattern for in-app pages (`app/[locale]/(app)/invoices/page.tsx`) but with `metadata.robots = { index: false }` — authed pages don't get indexed; `hreflang` unnecessary on noindex. Locale resolution still runs but the public SEO surface is dark. Chapter installs discipline (`generateMetadata` on every page) even on noindex pages so future copy editors expect it.
- Fill `app/sitemap.ts` per reference. One `<url>` entry per *canonical path* with alternates ride-along; not three entries per path. Next.js emits `<xhtml:link rel="alternate" hreflang>` inside each `<url>` block. Root-level, not under `[locale]/`.
- Wire `app/[locale]/(marketing)/opengraph-image.tsx` (provided): exports default async function that reads `locale` from params, calls `getTranslations`, returns `ImageResponse`. Each locale gets its own OG image at build; rendered text matches page's locale.
- Run inspector source-HTML `hreflang` panel: each page lists three alternates (self + two others) plus `x-default`. Bidirectional: en-US lists fr-FR; fr-FR lists en-US. `x-default` points to `/`.
- Run inspector sitemap preview: parses `/sitemap.xml`, shows tree of `<url>` entries with `<xhtml:link>` alternates.
- Audit: `curl /fr-FR | grep canonical` → `https://app.example.com/fr-FR`. Verify the wrong reach is *not* in place (canonical of `/` on fr-FR would kill the page's ranking).

Senior calls and watch-outs:

- Canonical = locale-specific URL, *not* default. Canonicalizing all locales to en-US tells Google "fr-FR is a duplicate; only rank en-US" and kills French organic traffic. Most common ranking-killer in i18n SEO; chapter rehearses the right shape.
- Self-reference is mandatory: fr-FR page lists `hreflang="fr-FR"` for itself. Google validates; missing self-reference silently drops the entire group. `generateAlternates` includes current locale automatically.
- Bidirectionality is mandatory: every page lists every other supported locale. One-sided declarations silently ignored. `Object.fromEntries(routing.locales.map(...))` is the structural defense — every page generates the full set.
- `x-default` is the Google fallback when user's locale doesn't match any alternate. Chapter's senior reach: `x-default` → default locale's URL (`/`). Locale-picker landing page is the alternative; for SaaS, defaulting to the strongest market locale is the senior call.
- OG locale uses underscore form (`'fr_FR'`); BCP 47 uses hyphen (`'fr-FR'`). The `bcp47ToOgLocale` helper converts. Forgetting ships `'fr-FR'` in the OG tag — silently treated as invalid by Facebook/LinkedIn.
- Authed app pages get `robots: { index: false }` — not SEO targets. Chapter installs `generateMetadata` on every page so future additions don't ship without it, but only marketing declares `alternates`.
- Sitemap is one `<url>` per canonical path with alternates ride-along. Google reads `xhtml:link` alternates inside each `<url>`. Per-locale sitemaps separately is the older convention; modern Next.js-native uses `MetadataRoute.Sitemap`'s `alternates.languages`.
- `app/sitemap.ts` is at the root, not under `[locale]/`. Sitemap is locale-agnostic — serves the whole site's URL graph with locales declared inside each entry.
- Per-locale OG images are *strong* signals for marketing pages, weaker for authed. Chapter ships per-locale OG only on marketing; app routes get default OG (noindex anyway).
- The "untranslated content" rule from lesson 6 of chapter 088: a locale not yet shipped should not list a `hreflang` alternate to its URL (or that URL should `noindex`). Chapter ships all three translated; named for the senior who carries the discipline into a real 5-locale rolling rollout.

Codebase state at entry: full tz-aware, currency-aware list view live; no SEO metadata, no sitemap, no `hreflang`.
Codebase state at exit: `lib/seo/alternates.ts` filled; marketing's `generateMetadata` returns localized title/description + `alternates.languages` + OG locale shape; in-app pages declare `robots: { index: false }`; `app/sitemap.ts` returns `MetadataRoute.Sitemap` with per-entry alternates; inspector source-HTML `hreflang` panel shows three tags + `x-default` per page, bidirectionally; sitemap preview shows one entry per canonical path with locale alternates. **Runnable — full project surface; ready for verify pass.**

Estimated student time: 50–65 minutes.

---

## Lesson 6 — Verify the locale switch, DST render, and hreflang audit

Walks every "Done when" clause with deliberate-misuse demos for the load-bearing rules: DST-spanning render, bidirectional `hreflang` with `x-default`, locale-specific canonical, CLDR plurals, and `setRequestLocale` preserving static rendering.

Goals:

- Walk every "Done when" clause from the framing's verify recipe in order. The recipe is the script; this lesson executes plus runs deliberate-misuse demos for load-bearing rules.
- **Locale switch reflow (headline check):** as `(en-US, NY)`, `/invoices` shows USD `'$1,234.56'`, dates in EDT/EST. Switch to "Français" → `/fr-FR/invoices`; "Factures"; same data reflows with French separator (`'1 234,56 €'` for EUR, `'1 234,56 $US'` for USD), French status labels; `users.locale` and cookie updated.
- **DST-spanning render (load-bearing proof):** switch to `(en-GB, Europe/London)`. Inspector DST panel: `2026-07-01T18:00:00Z` → `'7:00 PM'` BST (UTC+1); `2026-01-01T18:00:00Z` → `'6:00 PM'` GMT (UTC+0). Same UTC instants, different wall-clock hours, because London observes DST only in summer. Deliberate-misuse: remove `timeZone: tz`; both rows now render in UTC; revert.
- **`hreflang` in source, bidirectional with `x-default`:** inspector panel + view-source on `/fr-FR/`: three tags + `x-default`. Bidirectional. Deliberate-misuse: remove fr-FR from en-US page's alternates; inspector flags the one-sided link; revert.
- **Canonical is locale-specific:** `curl /fr-FR/pricing | grep canonical` → `https://app.example.com/fr-FR/pricing`. Deliberate-misuse: set canonical to default URL across all locales; bug is silent (page loads) but Google would treat as duplicate; revert.
- **Pluralized counter respects CLDR:** probe panel — en-US `'No invoices'` / `'1 invoice'` / `'5 invoices'`; fr-FR `'Aucune facture'` / `'1 facture'` / `'1 000 000 de factures'` (the `many` branch with `de` preposition). Deliberate-misuse: replace message with `'{count} invoices'`; probe shows `'1 invoices'`; revert.
- **Currency per locale, currency is data:** currency-by-data panel — nine cells (three currencies × three locales). Same amount, same currency tag, locale-specific format. Deliberate-misuse: hard-code `currency: 'USD'`; everything renders as USD; revert.
- **Locale-switcher preserves path:** at `/invoices?status=paid&cursor=abc123`, switch French → `/fr-FR/invoices?status=paid&cursor=abc123`. Typed `usePathname` swaps prefix; query carries through.
- **`Accept-Language` for anonymous:** private window with fr-FR visits `/` → 302 to `/fr-FR/`. Repeat with `pt-BR`; no match, falls to en-US, loads `/` unprefixed.
- **`<html lang>` matches URL prefix:** view-source on each locale's path. Deliberate-misuse: hard-code `lang="en"`; revert.
- **No hard-coded strings / `toLocaleString` / raw `Intl.X` outside seam:** audit panel zero hits. Deliberate-misuse: add `<button>Save</button>`; audit shows one; revert.
- **`setRequestLocale` preserves static rendering:** static-vs-dynamic panel — marketing static, app dynamic (auth). Deliberate-misuse: remove `setRequestLocale`; rebuild; marketing converts to dynamic; revert.
- **Sitemap with per-entry alternates:** sitemap preview — one `<url>` per canonical path with three `<xhtml:link>` ride-alongs.
- **Per-locale OG images:** `/fr-FR/`'s `og:image` URL points to `/fr-FR/opengraph-image`; fetched, shows French title.
- **Locale and timezone independent:** switch to `(fr-FR, Pacific/Auckland)`. French strings, dates in NZDT/NZST. The combination works without code; the column split is the discipline.
- Name the senior calls once more:
  - Locale resolved once in `proxy.ts`; downstream reads only the resolved value.
  - `users.timeZone` and `users.locale` are independent profile columns; both piped explicitly into formatters at the edge.
  - Every UI string through `t()` / `t.rich`; every number through `format.number`; every date through `format.dateTime` with `timeZone: tz`; no hard-coded strings, no `toLocaleString`, no raw `Intl.X` outside `lib/i18n/`.
  - ICU plurals respect CLDR per language; `=0` exact-match for `'No invoices'` UX.
  - Currency is data (the column), not UI; symbol/format follows viewer's locale, currency follows invoice.
  - `setRequestLocale` mandatory in every page/layout under `[locale]/` to preserve static rendering.
  - Canonical is the locale-specific URL, not default; `hreflang` bidirectional with self-reference plus `x-default`; one `<url>` per canonical path in the sitemap with alternates ride-along.
  - `proxy.ts` not `middleware.ts` (Next.js 16 rename); `next-intl@^4` with `createNavigation` for typed routing.
  - DST is a property of calendar plus tz, not the timestamp; `Temporal.Instant` + IANA `timeZone` is DST-aware by construction.
- Forward references:
  - chapter 092 — integration tests against the negotiation middleware and formatters; the `(fr-FR, Pacific/Auckland)` fixture exercises decoupling.
  - chapter 094 — Playwright money-path in en-US default; one parallel run in fr-FR catches locale-specific bugs.
  - chapter 098 — performance audit; per-locale message-catalog payload is one optimization (provider scope, namespace lazy-load).
  - lesson 3 of chapter 101 — CI smoke test fetches `/` and `/fr-FR/`, asserts `<link rel="alternate">` matches `routing.locales`. Regression catcher.
  - chapter 086 — error and security baseline; locale-switch action is one finding category (Zod validation against supported-locales constant).
  - chapter 108 — review a PR adding `'de-DE'`; the "one PR, not a refactor" rehearsal lands here.

Senior calls and watch-outs:

- Verify lesson rehearses every failure mode the chapter prevents. If a verification fails, point at the owning build lesson.
- Deliberate-misuse demos run as named single-flag changes (remove `timeZone: tz`, hard-code currency, drop self-reference, canonical to default, replace plural with concat, remove `setRequestLocale`). Verify each in isolation, then revert.
- DST-spanning render is the single most important verification. The two seeded instants viewed in London produce `'7:00 PM'` and `'6:00 PM'` — different wall-clock from constant UTC offset. Senior can recite this off the top; rehearsal makes recall durable.
- `hreflang` audit is the second most important. Wrong shapes (canonical to default, missing self-reference, one-sided, missing `x-default`) are all silently-ignored-by-Google failures — invisible until ranking drops six months later. Inspector's panel is the rehearsal of the audit a senior runs on a real launch.
- "Every string through `t()`" rule is checked structurally via grep, not by eye. The structural defense is the audit panel as a green check in CI.

Codebase state at entry: full project surface live — locale routing, catalogs, tz-aware date and currency, `hreflang` and sitemap.
Codebase state at exit: every "Done when" clause verified; the student can articulate the load-bearing rules (locale resolved once in proxy, profile-stored tz piped to every formatter, every string through `t()`, currency is data, canonical is the locale-specific URL, `hreflang` bidirectional with `x-default`, `setRequestLocale` preserves static rendering, DST handled by `Temporal.Instant` + IANA tz) and which forward unit will lean on them.

Estimated student time: 35–50 minutes.
