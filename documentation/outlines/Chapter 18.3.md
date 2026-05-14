# Chapter 18.3 — Project: localized, tz-aware list view

## Chapter framing

Chapter 18.3 cashes in Unit 18's two teaching chapters — 18.1's storage/domain/edge split (`timestamptz` ↔ `Temporal.Instant`, `users.timeZone` as a profile column, mandatory `timeZone` argument on every formatter) and 18.2's i18n discipline (translation keys, ICU MessageFormat with CLDR plural categories, the `Intl.*` family, the five-step locale negotiation chain, next-intl 4 on Next.js 16, `alternates.languages` for SEO) — as one runnable surface. The student takes the Unit 11.3 invoices list (URL-state filters, soft-delete, `version` concurrency) and lifts it into a tri-locale, tz-aware product surface: `en-US`, `en-GB`, `fr-FR` shipped from day one, every string flowing through `t()`, every number through `useFormatter().number`, every date through `useFormatter().dateTime` with the user's `timeZone` piped in from the session, `hreflang` and per-locale sitemap entries emitted from `generateMetadata` and `app/sitemap.ts`. Each build slice closes on a runnable state: 18.3.3 ends with the `[locale]` segment live, the negotiation middleware rewriting URLs, three message catalogs translating every UI string, and the pluralized "N invoices" counter rendering correctly in all three locales; 18.3.4 ends with every invoice date displayed in the user's profile tz and every amount formatted per-locale with the invoice's stored currency; 18.3.5 ends with `hreflang` tags in the rendered HTML and a sitemap index serving per-locale entries; 18.3.6 walks the "Done when" clause-by-clause against the DST-spanning render, the locale-switch reflow, and the source-HTML `hreflang` audit.

Threads through every lesson. **The locale is resolved once, in middleware** (`proxy.ts`), and downstream code reads only the resolved value — never `Accept-Language`, never `navigator.language` outside the sign-up form. **The user's `timeZone` is a profile column** (18.1.3) piped into the next-intl `getRequestConfig` callback so every `useFormatter().dateTime` call gets the right tz without prop-drilling. **Every UI string goes through `t()` or `t.rich()`** — a grep for hard-coded JSX strings is a finding; the source-locale catalog (`en-US.json`) is the contract, the other two catalogs are translations. **Pluralized counts use ICU `plural`**, never a ternary, never string concatenation; the `invoices.list.count` key carries `=0 / one / other` for English and `=0 / one / many / other` for French (CLDR categories). **Currency is data on the invoice, not a UI decision** — `invoices.currency` (USD / GBP / EUR) is preserved end-to-end and rendered with `Intl.NumberFormat(locale, { style: 'currency', currency })`; the same amount renders as `'$1,234.56'` in en-US and `'1 234,56 €'` in fr-FR. **Dates are `Temporal.Instant` from the DB, formatted at the edge** with the user's profile `timeZone` — never the request's; the DST-spanning fixture (`2026-07-01T18:00:00Z` vs `2026-01-01T18:00:00Z` rendered in `Europe/London`) is the load-bearing verification. **The canonical URL is the locale-prefixed URL** (not the default), `hreflang` is bidirectional with `x-default`, and the `<html lang>` attribute matches the URL prefix every render. **Refresh-the-locale-cookie is fine on user override, but never on geo-IP** — the senior call from 18.2.4 carries through.

### Dependency carry-in

- **From 11.3:** `app/(app)/invoices/page.tsx` Server Component (URL-state filters, status filter, cursor pagination), `getInvoices({ orgId, status, cursor, q })`, `getInvoice(id)`, soft-delete via `deletedAt`, `version`-precondition update Server Action, the `invoices` / `invoice_lines` / `customers` schema with `currency` text column on `invoices` and `dueDate` on each row.
- **From 18.1.1:** `lib/temporal.ts` codec — `instant` pair (`fromDb: Temporal.Instant.from`, `toDb: instant.toString()`), `plainDate` pair; every `invoices.createdAt` / `paidAt` / `dueDate` reads as Temporal in domain code.
- **From 18.1.2:** `invoices.dueDate` is a `date` column (`Temporal.PlainDate`); the project does not render the due date in a timezone — it renders as a calendar day.
- **From 18.1.3:** `users.timeZone` column (IANA identifier, `'UTC'` default), seeded from the browser on sign-up, validated via `Intl.supportedValuesOf('timeZone')`; `getCurrentUserTimeZone()` helper in `lib/user-time.ts`.
- **From 18.2.1:** key naming `feature.surface.role`; one-string-one-key; named placeholders only; `t.rich` for embedded markup; per-locale JSON catalogs as the translator surface.
- **From 18.2.2:** ICU MessageFormat `plural` (CLDR categories), `=0` exact-match override, `#` for the formatted count; `other` is mandatory; nested plural+select reserved for genuinely combined cases.
- **From 18.2.3:** `Intl.NumberFormat` for currency (`style: 'currency'`, `currency` from data, `currencyDisplay: 'narrowSymbol'`); `Intl.DateTimeFormat` Temporal-native with mandatory `timeZone`; `Intl.RelativeTimeFormat` with `numeric: 'auto'` for "due in N days"; construct-once-reuse via next-intl's `useFormatter`.
- **From 18.2.4:** the five-step negotiation chain (URL prefix → profile → cookie → `Accept-Language` best-match → default); `users.locale` profile column paired with `users.timeZone`; `<html lang>` driven by the resolved locale.
- **From 18.2.5:** `defineRouting` with `localePrefix: 'as-needed'`, `createMiddleware` in `proxy.ts`, `getRequestConfig` returning `{ messages, timeZone, now }`, `setRequestLocale` for static rendering, `generateStaticParams` per-locale, `useTranslations` / `getTranslations`, `useFormatter` / `getFormatter`, typed `Link` / `redirect` from `lib/i18n/navigation.ts`, the `IntlMessages` global type from `typeof import('../messages/en-US.json')`.
- **From 18.2.6:** `alternates.languages` in `generateMetadata`, self-reference + bidirectional + `x-default`, the canonical URL is the locale-specific URL, `MetadataRoute.Sitemap` with `alternates.languages`, `og:locale` underscore form.
- **From 10.2 / 10.4:** `authedAction(role, schema, fn)`, `tenantDb(orgId)`, active-org slot in session, `writeAuditLog(tx, event)`.
- **From 9.5:** Better Auth session surface returning `{ user: { id, email, locale, timeZone }, orgId, role }`.
- **From 7.1 / 7.2:** Zod 4 `strictObject`, canonical Result `{ ok: true, data } | { ok: false, error }`.

### Starter file tree (stubs marked with TODO)

```
docker-compose.yml                      # provided: postgres:18
drizzle.config.ts                       # provided
next.config.ts                          # provided: cacheComponents: true, next-intl plugin wired
.env.example                            # provided: DATABASE_URL, BETTER_AUTH_SECRET, APP_URL
package.json                            # provided: next-intl@^4, @formatjs/intl-localematcher,
                                        #           temporal-polyfill if pinned to Node 24 LTS
scripts/
  seed.ts                               # provided: 2 orgs, 4 users (one en-US/America/New_York,
                                        #           one en-GB/Europe/London, one fr-FR/Europe/Paris,
                                        #           one fr-FR/Pacific/Auckland), 30 invoices/org
                                        #           with USD/GBP/EUR currency mix, due dates
                                        #           straddling 2026 EU + US DST boundaries
src/
  db/
    schema.ts                           # provided: users w/ locale + timeZone columns (from 18.1.3 +
                                        #           18.2.4 migration baked in), invoices, customers
    client.ts                           # provided
  lib/
    temporal.ts                         # provided: instant + plainDate codecs (18.1.1 / 18.1.2)
    tenant-db.ts                        # provided (10.1)
    authed-action.ts                    # provided (10.2)
    audit-log.ts                        # provided
    user-time.ts                        # provided: getCurrentUserTimeZone(), getCurrentUserLocale()
    i18n/
      routing.ts                        # TODO: defineRouting({ locales, defaultLocale: 'en-US',
                                        #         localePrefix: 'as-needed' })
      navigation.ts                     # TODO: createNavigation(routing) -> Link, redirect,
                                        #         usePathname, useRouter
      request.ts                        # TODO: getRequestConfig: load messages, resolve tz
                                        #         from session, return { locale, messages,
                                        #         timeZone, now }
      formats.ts                        # TODO: shared formats const (dateTime.short, number.currency)
      supported.ts                      # provided: SUPPORTED_LOCALES = ['en-US','en-GB','fr-FR'] as const
    seo/
      alternates.ts                     # TODO: generateAlternates(pathname) -> { canonical,
                                        #         languages: { 'en-US': ..., 'fr-FR': ...,
                                        #         'de-DE': ..., 'x-default': ... } }
      og-locale.ts                      # provided: bcp47ToOgLocale ('fr-FR' -> 'fr_FR')
  messages/
    en-US.json                          # provided: full source catalog (every key)
    en-GB.json                          # TODO student: translate where en-GB diverges (date order,
                                        #               currency display, "color" -> "colour"), copy
                                        #               source where it doesn't
    fr-FR.json                          # TODO student: full French translation with ICU plurals
  proxy.ts                              # TODO: export default createMiddleware(routing)
  app/
    global-error.tsx                    # provided
    [locale]/
      layout.tsx                        # TODO: setRequestLocale(locale), <html lang={locale}>,
                                        #         <NextIntlClientProvider> (scoped subtree),
                                        #         generateStaticParams() from routing.locales
      (marketing)/
        page.tsx                        # provided: marketing landing for hreflang demo
        opengraph-image.tsx             # provided: per-locale OG via getTranslations
        layout.tsx                      # provided
      (app)/
        invoices/
          page.tsx                      # provided shell from 11.3; TODO: swap hard-coded strings
                                        #         for t(), wrap pluralized counter, swap date
                                        #         formatter for useFormatter().dateTime, currency
                                        #         for useFormatter().number
          locale-switcher.tsx           # provided: client component, three-option dropdown,
                                        #         calls setLocaleAction + usePathname swap
          actions.ts                    # TODO: setLocaleAction(locale) — authedAction writes
                                        #         users.locale, sets NEXT_LOCALE cookie
        layout.tsx                      # provided: requireAuth, mounts locale switcher in header
      sitemap.ts                        # TODO: MetadataRoute.Sitemap returning per-locale entries
                                        #         with alternates.languages
      robots.ts                         # provided: allow all, authenticated routes noindex per layout
  app/inspector/page.tsx                # provided: locale + tz override switcher, "render at
                                        #         2026-07-01" vs "2026-01-01" toggle for DST proof,
                                        #         source-HTML hreflang panel, message-key audit
                                        #         (grep hits), Lighthouse score panel, sitemap
                                        #         XML preview
```

### Reference solution signatures lessons display

- **Routing** (`lib/i18n/routing.ts`): `defineRouting({ locales: SUPPORTED_LOCALES, defaultLocale: 'en-US', localePrefix: 'as-needed' })`; `export type Locale = typeof routing.locales[number]`.
- **Navigation** (`lib/i18n/navigation.ts`): `export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing)`.
- **Request config** (`lib/i18n/request.ts`): `getRequestConfig(async ({ requestLocale }) => { const requested = await requestLocale; const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale; const session = await auth(); const timeZone = session?.user.timeZone ?? 'UTC'; const messages = (await import(\`../../messages/${locale}.json\`)).default; return { locale, messages, timeZone, now: new Date(), formats }; })`.
- **Shared formats** (`lib/i18n/formats.ts`): `dateTime: { short, withTime }`, `number: { compact, currency }`, `relativeTime: { numeric: 'auto' }` — `as const satisfies Formats`.
- **Proxy** (`proxy.ts`): `export default createMiddleware(routing)`; `config.matcher = ['/((?!api|_next|_vercel|.*\\..*).*)']`.
- **Locale layout** (`app/[locale]/layout.tsx`): `generateStaticParams` returns `routing.locales.map((locale) => ({ locale }))`; layout awaits `params`, validates via `hasLocale` (else `notFound`), calls `setRequestLocale(locale)`, awaits `getMessages()`, returns `<html lang={locale}><body><NextIntlClientProvider messages={pick(messages, ['nav','locale-switcher'])}>{children}</NextIntlClientProvider></body></html>`.
- **`messages/en-US.json` (excerpt):** `"invoices.list.title": "Invoices"`, `"invoices.list.count": "{count, plural, =0 {No invoices} one {# invoice} other {# invoices}}"`, status labels for `draft / sent / paid / overdue`. Currency is rendered via `format.number(amount, { style: 'currency', currency: row.currency })` at the call site, not in the message — currency is data, not a literal.
- **`messages/fr-FR.json` (excerpt):** `"invoices.list.title": "Factures"`, `"invoices.list.count": "{count, plural, =0 {Aucune facture} one {# facture} many {# de factures} other {# factures}}"`, status labels `Brouillon / Envoyée / Réglée / En retard`.
- **Set-locale action** (`app/[locale]/(app)/invoices/actions.ts`): `setLocaleAction = authedAction({ role: 'member', schema: z.strictObject({ locale: z.enum(SUPPORTED_LOCALES) }), fn: async ({ ctx, input }) => { await db.update(users).set({ locale: input.locale }).where(eq(users.id, ctx.userId)); (await cookies()).set('NEXT_LOCALE', input.locale, { path: '/', sameSite: 'lax' }); return { ok: true, data: null }; } })`.
- **Invoices page (excerpt)** (`app/[locale]/(app)/invoices/page.tsx`): `const t = await getTranslations('invoices.list')`; `const format = await getFormatter()`; `const tz = await getCurrentUserTimeZone()`. Row date: `format.dateTime(row.createdAt, { dateStyle: 'medium', timeStyle: 'short', timeZone: tz })`. Row currency: `format.number(Number(row.amountMinor) / 100, { style: 'currency', currency: row.currency, currencyDisplay: 'narrowSymbol' })`. Counter: `t('count', { count: rows.length })`.
- **Alternates helper** (`lib/seo/alternates.ts`): `generateAlternates(pathname, currentLocale)` returns `{ canonical: getPathname({ locale: currentLocale, href: pathname }), languages: { ...Object.fromEntries(routing.locales.map((l) => [l, getPathname({ locale: l, href: pathname })])), 'x-default': getPathname({ locale: routing.defaultLocale, href: pathname }) } }` — URL constants prefixed with `env.APP_URL`.
- **Per-page metadata** (`app/[locale]/(marketing)/page.tsx`): `generateMetadata` reads `locale` from `params`, calls `getTranslations({ locale, namespace: 'marketing.meta' })` for title / description, calls `generateAlternates('/', locale)`, assembles `openGraph` with `bcp47ToOgLocale(locale)` and `alternateLocale` mapped over the other locales.
- **Sitemap** (`app/sitemap.ts`): returns `MetadataRoute.Sitemap` — one entry per canonical path (`/`, `/pricing`, `/features`) with `alternates.languages` mapped over `routing.locales`.
- **Env entries:** no new entries over 11.3 + 18.2 carry-in (`APP_URL` already present).

### Inspector page spec

Single Server Component at `/inspector`, the verification surface for the build slices and the verify lesson. The inspector itself is locale-agnostic (mounted at `/inspector`, not `/[locale]/inspector`) so it can read the rendered output of every locale variant without being subject to its own switcher.

- **Header:** session-user switcher (four seeded users covering the four locale/tz pairs), org switcher (two orgs).
- **Locale + tz override panel:** force-set the active user's `locale` and `timeZone` to any supported value, then deep-link into `/[locale]/invoices` to inspect the render. Restores on reset.
- **DST-proof toggle:** render two seeded invoice rows side-by-side — one with `createdAt = 2026-07-01T18:00:00Z` and one with `2026-01-01T18:00:00Z`. With `timeZone = 'Europe/London'`, the first must render as `'7:00 PM'` (BST = UTC+1), the second as `'6:00 PM'` (GMT = UTC+0). Same UTC offset, different wall-clock display because London observes DST in summer but not in winter — the load-bearing verification from the project brief.
- **Currency-by-data panel:** three invoice rows seeded with different currencies (USD, GBP, EUR), rendered in each of the three locales. Confirms the same amount value renders differently per-locale (separator, position) while the currency stays the data-driven choice.
- **Source-HTML `hreflang` panel:** fetches `/`, `/fr-FR`, `/pricing`, `/fr-FR/pricing` via server `fetch` and extracts every `<link rel="alternate" hreflang="...">` tag from each response's HTML, displayed in a table. Verifies self-reference, bidirectionality, and `x-default` presence.
- **Sitemap preview:** renders the parsed XML output of `/sitemap.xml` in a tree view with each URL's `xhtml:link` alternates.
- **Message-key audit:** grep hits for hard-coded JSX strings, `Date.prototype.toLocaleString` outside `lib/`, raw `Intl.NumberFormat` outside `lib/i18n/`. Each hit links to file + line. Zero hits is the green state.
- **Pluralization probe:** input a count, see the rendered string for each locale's `invoices.list.count` message. Type 0, 1, 2, 5, 21, 1000000 — verify English shows one/other transitions at 1↔2 and French shows few/many transitions at 2↔1000000.
- **Static-vs-dynamic indicator:** each locale's marketing page render mode (static prerender vs. dynamic) as resolved by Next.js's build manifest. `setRequestLocale` correctly applied = static; missing = dynamic = finding.
- **Lighthouse SEO score panel:** runs Lighthouse against the marketing root for each locale; failures call out the missing `hreflang` / `canonical` / `<html lang>` issues.

Student writes only `lib/i18n/routing.ts`, `lib/i18n/navigation.ts`, `lib/i18n/request.ts`, `lib/i18n/formats.ts`, `lib/seo/alternates.ts`, `proxy.ts`, `app/[locale]/layout.tsx`, the invoice page transformation, the locale-switcher action, the marketing page's `generateMetadata`, `app/sitemap.ts`, and the `en-GB.json` + `fr-FR.json` catalogs.

### Verify recipe mapped to "Done when"

| Done-when clause | Verify step |
| --- | --- |
| Switching profile language to `fr-FR` re-renders the list with French strings | User signed in, profile locale `en-US`. Open `/invoices` — header "Invoices". Click locale switcher → French. Page reloads at `/fr-FR/invoices`. Header now "Factures". `users.locale` updated; `NEXT_LOCALE` cookie set. |
| Comma decimal separator on currency in fr-FR | Same flow. Invoice with `amount = 1234.56, currency = 'EUR'` renders as `'1 234,56 €'` in fr-FR (NBSP between thousands), `'$1,234.56'` in en-US, `'£1,234.56'` in en-GB (for a GBP invoice). Inspector "Currency-by-data" panel verifies in one screen. |
| `EUR` currency renders correctly per locale | Inspector confirms — same `currency: 'EUR'` data, three different renderings depending on the *viewer's* locale, not the invoice's source locale. The currency is data; the format is locale. |
| Due dates straddling EU DST boundary render with correct zone abbreviation | User with `timeZone: 'Europe/London'`. Inspector DST-proof toggle: row with `createdAt = 2026-07-01T18:00:00Z` shows `'7:00 PM'` (BST, UTC+1); row with `2026-01-01T18:00:00Z` shows `'6:00 PM'` (GMT, UTC+0). Then switch user `timeZone` to `'America/New_York'`: same instants render as `'2:00 PM'` (EDT, UTC-4) and `'1:00 PM'` (EST, UTC-5). |
| Rendered HTML emits `<link rel="alternate" hreflang="...">` for all three locales | Inspector "Source-HTML hreflang" panel: every page in every locale shows three `hreflang` tags (`en-US`, `en-GB`, `fr-FR`) plus an `x-default`. Bidirectionality: en-US page lists fr-FR, fr-FR page lists en-US. View-source on `/` and `/fr-FR` to read the raw HTML. |
| Pluralized counter respects CLDR categories | Inspector "Pluralization probe": en-US shows "1 invoice" / "5 invoices"; en-GB same; fr-FR shows "1 facture" / "5 factures" / "1 000 000 de factures" (many category). All `=0` exact-match overrides render "No invoices" / "Aucune facture". |
| Static rendering preserved for marketing pages | Inspector "Static-vs-dynamic" panel: marketing routes for all three locales = static. Build output's prerender manifest confirms. App routes (`/invoices`) = dynamic because auth resolution forces it — expected. |
| Sitemap serves per-locale entries with `xhtml:link` alternates | Inspector "Sitemap preview" or `curl https://app.example.com/sitemap.xml`: every URL entry includes `<xhtml:link rel="alternate" hreflang="...">` per supported locale. The number of `<url>` blocks = number of canonical paths (deduped across locales — alternates ride inside one entry). |
| Canonical URL is the locale-specific URL, not the default | `curl /fr-FR | grep canonical` → `<link rel="canonical" href="https://app.example.com/fr-FR">`. Not `/`. The translated page is its own canonical; the wrong reach (canonicalizing all locales to the default) kills the fr-FR page's discoverability. |
| `<html lang>` matches the URL prefix every render | View-source on `/fr-FR/invoices` → `<html lang="fr-FR">`. On `/invoices` (default, unprefixed) → `<html lang="en-US">`. On `/en-GB/invoices` → `<html lang="en-GB">`. |
| Locale-switcher preserves the current path on switch | At `/invoices?status=paid`, switch to French. Lands at `/fr-FR/invoices?status=paid`, not `/fr-FR`. The typed `usePathname` from `lib/i18n/navigation.ts` handles the prefix swap. |
| No hard-coded strings in JSX | Grep audit (inspector "Message-key audit" panel) returns zero hits inside `app/[locale]/`. Then deliberately re-introduce one (`<button>Save</button>` somewhere); audit shows one hit. Revert. |
| No `Intl.X` or `toLocaleString` outside the i18n / format seam | Same audit: zero hits outside `lib/i18n/` and `lib/temporal.ts`. Every formatting call goes through `useFormatter` / `getFormatter`. |
| Refresh on a non-default-locale URL keeps the locale | Navigate to `/fr-FR/invoices`. Hit refresh. Stays on `/fr-FR/invoices`. The URL prefix is the strongest negotiation signal; cookie and profile reinforce. Then clear cookie + sign out; visit `/fr-FR/`; still loads French (URL wins). |
| Anonymous user with `Accept-Language: fr-FR` lands on the French version | Open private window; set browser language to French; visit `/`. Middleware resolves locale via `Accept-Language` best-match against supported set; redirects to `/fr-FR/`. Confirm in network tab (302 from `/` → `/fr-FR/`). |
| Best-match against supported set works (`pt-BR` → fallback) | Open private window; set browser language to `pt-BR`; visit `/`. Supported set is `['en-US','en-GB','fr-FR']`; `Lookup` returns `en-US` (no `pt` match, falls to default). Confirm. |

### Concepts demonstrated → owning lesson

- The translation-key discipline (`feature.surface.role`, one-string-one-key, named placeholders, `t.rich` for embedded markup) — 18.2.1.
- ICU MessageFormat `plural` with CLDR categories; `=0` exact-match; `other` mandatory — 18.2.2.
- `Intl.NumberFormat` for currency with `currency` from data; `Intl.DateTimeFormat` Temporal-native with mandatory `timeZone`; the "construct once, reuse" rule via `useFormatter` — 18.2.3.
- The five-step locale negotiation chain (URL → profile → cookie → `Accept-Language` → default); BCP 47 `Lookup`; geo-IP never a primary signal — 18.2.4.
- `defineRouting` + `localePrefix: 'as-needed'`; `createMiddleware` in `proxy.ts` (Next.js 16's renamed middleware) — 18.2.5.
- `getRequestConfig` resolving `messages`, `timeZone`, `now` once per request — 18.2.5 + 18.1.3.
- `setRequestLocale` for static rendering; `generateStaticParams` per-locale — 18.2.5.
- `useTranslations` / `getTranslations` and `useFormatter` / `getFormatter` — 18.2.5 + 18.2.3.
- Typed `Link` / `redirect` / `usePathname` from `createNavigation` — 18.2.5.
- The `IntlMessages` global type for compile-time key safety — 18.2.5.
- `users.locale` profile column paired with `users.timeZone`; `<html lang>` driven by middleware-resolved locale — 18.2.4 + 18.1.3.
- The `timestamptz` ↔ `Temporal.Instant` codec; `users.timeZone` piped to every formatter — 18.1.1 + 18.1.3.
- `alternates.languages` in `generateMetadata`; self-reference + bidirectional + `x-default`; canonical is the locale-specific URL — 18.2.6.
- `MetadataRoute.Sitemap` with per-entry `alternates.languages` emitting `xhtml:link` — 18.2.6.
- Open Graph `og:locale` (underscore form) + `og:locale:alternate` — 18.2.6.
- The Server Action wrapper (`authedAction`) and the canonical Result — 10.2 + 7.2.

---

## Lesson 18.3.1 — Project brief

Goals:

- Frame the build: take the 11.3 invoices list and ship it in three locales (`en-US`, `en-GB`, `fr-FR`) with full tz-awareness. Every string flows through `t()`; every number through `useFormatter().number`; every date through `useFormatter().dateTime` with the user's profile `timeZone`. Locale resolution runs in `proxy.ts`, settles on the request, and downstream code reads only the resolved value. The marketing surface ships `hreflang`, per-locale sitemap entries, and locale-aware OG metadata.
- State the "Done when" in one paragraph: switching profile locale to `fr-FR` re-renders the list with French strings, comma decimal separator, the invoice's stored `EUR` currency rendered as `'1 234,56 €'`; due dates straddling EU DST boundaries render with the correct wall-clock hour per the user's `timeZone`; the rendered HTML emits bidirectional `<link rel="alternate" hreflang="...">` plus `x-default` for all three locales.
- Scope cuts: only three locales (no RTL, no `'es-ES'` / `'pt-PT'` / `'de-DE'` shipped); no translation-management-system integration (catalogs are checked into the repo); no per-locale OG images for the *app* surface (marketing only); no schema.org structured-data localization (next layer past `hreflang`); no A/B-testing locale variants; no domain-based locale routing (the chapter ships `localePrefix: 'as-needed'`, not `domains`); no edit-existing-invoice surface (11.3 owns CRUD; the project transforms the list view); no Temporal arithmetic surface (18.1.5 owns it; the project formats values, not derives them); refresh-resets-anything is explicitly *not* a concern — locale and tz are profile-backed, not client state.
- Senior payoff: the canonical 2026 shape for "ship i18n from day one." Every later surface added to this app inherits the `[locale]` segment, the message catalog, the `useFormatter` / `useTranslations` reflex; adding a fourth locale is one PR (translate the JSON, add to `routing.locales`), not a refactor. The discipline is structural — keys grep-able, formatters in one place, `hreflang` auto-emitted from `generateAlternates`. Single-locale launches that skip this shape pay 3–6 weeks of retrofit when international demand shows up; the project rehearses the rehearsable.
- Show the end UX: a capture of `/invoices` in English with `'$1,234.56'`; the same page at `/fr-FR/invoices` with `'1 234,56 €'`; the inspector DST panel showing BST-vs-GMT side-by-side; view-source on `/fr-FR/` with the three `<link rel="alternate">` tags visible.
- Link the starter via `degit react-saas-course-projects/localized-tz-list/starter`.

Senior calls and watch-outs:

- The starter ships the Unit 11.3 surface end-to-end, the `users.locale` + `users.timeZone` columns already migrated, and `next-intl@^4` installed. The 11.3 list query and concurrency action stay untouched — every change lives under `[locale]/`, `lib/i18n/`, `lib/seo/`, `messages/`, and the marketing surface.
- The English source catalog (`en-US.json`) is provided in full so the student is never blocked on translation work; they fill `en-GB.json` (small diff against `en-US`) and `fr-FR.json` (full French, including ICU plural categories for `many`). The pedagogical point is the *shape*, not language proficiency.
- Three locales ships with bidirectional `hreflang` and `x-default` correctly. Skipping `x-default` (or canonicalizing all locales to `en-US`) is the canonical failure that breaks French ranking — the verify lesson rehearses both bugs as deliberate-misuse demos.
- The DST-spanning render is the load-bearing observation: same UTC instant, different wall-clock hour, because London observes DST in summer but not in winter. Verify it with two specific seeded instants (`2026-07-01T18:00:00Z` and `2026-01-01T18:00:00Z`) — the chapter's most concrete time-zone proof.

Codebase state at entry: empty repo (student runs `degit`).
Codebase state at exit: starter cloned, Postgres up, schema migrated, seed loaded; `/invoices` lists invoices in English (the 11.3 surface unchanged); `/fr-FR/invoices` 404s (no `[locale]` segment wired); `/inspector` loads with placeholder panels; no proxy, no message catalogs filled.

Estimated student time: 10 to 15 minutes.

---

## Lesson 18.3.2 — Starter walkthrough

Goals:

- Walk the file tree, calling out provided vs. stubbed. Provided: the 11.3 surface, `next-intl@^4` in deps, `next.config.ts` with the next-intl plugin wired, the schema with `users.locale` and `users.timeZone`, the seed with four cross-locale users, `lib/temporal.ts`'s codecs, `lib/user-time.ts`, `lib/i18n/supported.ts`'s `SUPPORTED_LOCALES`, the marketing page, `opengraph-image.tsx`, the locale-switcher client component, the inspector. Stubbed: `routing.ts`, `navigation.ts`, `request.ts`, `formats.ts`, `proxy.ts`, `app/[locale]/layout.tsx`, `app/[locale]/(app)/invoices/page.tsx`'s string/formatter transformation, `app/[locale]/(app)/invoices/actions.ts`'s `setLocaleAction`, `app/[locale]/(marketing)/page.tsx`'s `generateMetadata`, `lib/seo/alternates.ts`, `app/sitemap.ts`, the `en-GB.json` and `fr-FR.json` catalogs.
- Read `messages/en-US.json` end-to-end. Every key follows `feature.surface.role`. The pluralized counter (`invoices.list.count`) carries `=0 / one / other` for the English plural surface; the student will mirror with French's `=0 / one / many / other`. Named placeholders (`{date}`, `{count}`, `{name}`); `t.rich` tagged keys (`auth.signUp.terms` carries `<terms>...</terms>` and `<privacy>...</privacy>`). Read 10 keys aloud to internalize the shape.
- Read the seeded data: four users — `(en-US, America/New_York)`, `(en-GB, Europe/London)`, `(fr-FR, Europe/Paris)`, `(fr-FR, Pacific/Auckland)`. The last pairs an unusual locale-tz combo deliberately (independent columns from 18.1.3). 30 invoices per org with USD / GBP / EUR currency mix and `dueDate` straddling 2026 DST boundaries (March 8 US, March 29 EU, November 1 US, October 25 EU).
- Read `lib/user-time.ts`: `getCurrentUserTimeZone()` returns `session?.user.timeZone ?? 'UTC'`; `getCurrentUserLocale()` returns the same for locale. These are the seams `getRequestConfig` reads.
- Read the locale-switcher client component (provided): three-option dropdown, names rendered in their own language (`'English (US)' / 'English (UK)' / 'Français'`), `onValueChange` calls `setLocaleAction` (TODO) then `router.replace(usePathname({ locale: newLocale }))`.
- Read `lib/i18n/supported.ts`: `export const SUPPORTED_LOCALES = ['en-US', 'en-GB', 'fr-FR'] as const;` — the single source for the locale list. `routing.ts` will pass it directly into `defineRouting`; `setLocaleAction`'s Zod schema validates against `z.enum(SUPPORTED_LOCALES)`; the alternates helper iterates it.
- Read `next.config.ts`: the next-intl plugin wraps the config (`createNextIntlPlugin('./src/lib/i18n/request.ts')`); `cacheComponents: true` from 11.3 carries through. No additional Webpack / Turbopack config required.
- Read the inspector tour end-to-end so the student knows which panel verifies which slice — DST proof, currency-by-data, source-HTML hreflang, sitemap preview, message-key audit, pluralization probe, static-vs-dynamic indicator.
- Run the app: `/invoices` renders the seeded list in English (the 11.3 surface). `/fr-FR/invoices` returns 404 (no `[locale]` segment yet). `/inspector` loads; every audit panel shows the pre-build state (hard-coded strings everywhere, no `hreflang` in source, no sitemap).

Senior calls and watch-outs:

- The `[locale]` segment will *replace* the current `app/(app)/invoices/page.tsx` path — the student moves the file under `app/[locale]/(app)/invoices/page.tsx` in 18.3.3. Walk the file move now so the student understands the change isn't additive; it's a relocation plus instrumentation. The starter ships the file *already* under `[locale]/`, so the student edits the imports and string sites; the move itself is conceptual, not mechanical.
- `lib/i18n/supported.ts` exports `as const` — the type narrows to the union, not `string[]`. Every type signature downstream picks up the literal union; `Locale = typeof routing.locales[number]` resolves to `'en-US' | 'en-GB' | 'fr-FR'`. This is the spine of compile-time safety in the project.
- The four-user seed includes the `(fr-FR, Pacific/Auckland)` deliberate combo — verify the chapter's premise that locale and timezone are independent. A naive "render in the locale's default tz" would produce wrong results for this user; the discipline (read tz from profile, pass explicitly) is what saves it.
- Currency on `invoices.currency` is text (`'USD'`, `'GBP'`, `'EUR'`) — the chapter formats with `useFormatter().number(amount, { style: 'currency', currency: row.currency })`. Currency is *data*, not UI; the invoice was issued in EUR regardless of the viewer's locale.
- `next.config.ts` already wires the next-intl plugin so the student doesn't fight build configuration; the wiring teaches what the plugin actually does (`createNextIntlPlugin` hooks the request-config module).

Codebase state at entry: starter cloned, Postgres running, schema migrated, seed loaded.
Codebase state at exit: every provided file read, inspector clicked through, seeded users / invoices / currencies confirmed. No code written. The student understands the build surface (eleven files to write or transform) and the verification surface (the inspector panels mapped to "Done when" clauses).

Estimated student time: 20 to 30 minutes.

---

## Lesson 18.3.3 — next-intl wiring, locale negotiation, and the three message catalogs

Goals:

- Fill `lib/i18n/routing.ts`: `import { defineRouting } from 'next-intl/routing'; export const routing = defineRouting({ locales: SUPPORTED_LOCALES, defaultLocale: 'en-US', localePrefix: 'as-needed' });`. Explain each option: `locales` is the union of supported tags (BCP 47, full form); `defaultLocale` is the unprefixed locale under `'as-needed'`; `localePrefix: 'as-needed'` means `'en-US'` URLs are unprefixed (`/invoices`), other locales are prefixed (`/fr-FR/invoices`). Senior call: `'always'` is the alternative when no locale gets default treatment (every URL prefixed); `'never'` is rare (URLs identical across locales, SEO weak). The project's senior reach is `'as-needed'`.
- Fill `lib/i18n/navigation.ts`: `import { createNavigation } from 'next-intl/navigation'; export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);`. Every navigation in the app now imports from here instead of `next/link` / `next/navigation`. The audit grep for `from 'next/link'` inside `app/[locale]/` is the finding rule.
- Fill `lib/i18n/request.ts`: `export default getRequestConfig(async ({ requestLocale }) => { const requested = await requestLocale; const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale; const session = await auth(); const timeZone = session?.user.timeZone ?? 'UTC'; const messages = (await import(\`../../messages/${locale}.json\`)).default; return { locale, messages, timeZone, now: new Date(), formats }; });`. Walk each return field: `locale` (the validated tag), `messages` (dynamic `import()` so locale-specific catalogs code-split per route), `timeZone` (read from the session — this is the seam 18.1.3 designed for), `now` (anchored once per request so server and client formatters agree on a stable "now" for `RelativeTimeFormat`), `formats` (shared presets — Lesson 18.3.4 introduces them; for now, a re-export of the empty `formats.ts`).
- Fill `lib/i18n/formats.ts` with the minimum shared presets used by 18.3.4. `dateTime: { short: { day: 'numeric', month: 'short', year: 'numeric' }, withTime: { dateStyle: 'medium', timeStyle: 'short' } }` and `number: { compact: { notation: 'compact' } } as const satisfies Formats`. The senior reach: presets named at the format-config layer, not inlined at the call site, so locale-specific overrides land in one place.
- Fill `proxy.ts` (note the Next.js 16 rename from `middleware.ts`): `import createMiddleware from 'next-intl/middleware'; import { routing } from '@/lib/i18n/routing'; export default createMiddleware(routing); export const config = { matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'] };`. The matcher skips API routes, static assets, and `_next` internals so the proxy only intercepts user-facing routes.
- Fill `app/[locale]/layout.tsx`: declare `generateStaticParams` returning `routing.locales.map((locale) => ({ locale }))` so every locale prerenders. The layout itself is async; reads `params.locale`, validates against `routing.locales` via `hasLocale`, calls `setRequestLocale(locale)` *before* any next-intl call (the load-bearing line — without it, the layout silently converts to dynamic), reads `await getMessages()`, wraps `{children}` in `<NextIntlClientProvider messages={pick(messages, ['nav', 'locale-switcher'])}>` — scoped subtree, not the full catalog. Set `<html lang={locale}>` on the root html element. The static-rendering verification lands in 18.3.6.
- Translate `messages/en-GB.json`: small diffs from `en-US` — "color" → "colour", "Cancel" identical, but currency labels and date phrasings shift. The student copy/pastes `en-US` then edits ~15 keys. The pedagogical point: locale-vs-locale within the same language is real (US vs UK English diverge on currency display, week-start, date order, sometimes vocabulary).
- Translate `messages/fr-FR.json` end-to-end. Every key from `en-US.json` gets a French translation. The pluralized counter carries `'{count, plural, =0 {Aucune facture} one {# facture} many {# de factures} other {# factures}}'` — note the `many` branch (CLDR's French rule for "large numbers / fractions where the digits are e.g. 1000000+") and the `=0` exact match. Status labels: "Brouillon", "Envoyée", "Réglée", "En retard". The student writes ~80 keys; aided by the provided source, takes 20-25 minutes.
- Fill `app/[locale]/(app)/invoices/actions.ts`'s `setLocaleAction`: `authedAction({ role: 'member', schema: z.strictObject({ locale: z.enum(SUPPORTED_LOCALES) }), fn: async ({ ctx, input }) => { await db.update(users).set({ locale: input.locale }).where(eq(users.id, ctx.userId)); (await cookies()).set('NEXT_LOCALE', input.locale, { path: '/', sameSite: 'lax' }); return { ok: true as const, data: null }; } });`. Writes profile column *and* sets the cookie — both signals updated so anonymous-session-style navigation honors the override too.
- Transform the invoice page to read translated strings: `const t = await getTranslations('invoices.list')`; replace every hard-coded JSX string. Wire the pluralized counter: `<p>{t('count', { count: rows.length })}</p>`. The currency and date formatters land in 18.3.4 — for now, leave the existing English-only formatters in place so the page renders without crashing. The intermediate runnable state: locale-prefixed URLs work, strings translate, but currency and date formatting still hard-coded to en-US.
- Run the app: `/` redirects to `/` (default unprefixed) — actually loads. `/fr-FR/` loads the French marketing page (still missing metadata work; comes in 18.3.5). `/invoices` shows English strings, English pluralized counter. `/fr-FR/invoices` shows French strings, French pluralized counter (try 0, 1, 5, 1000000 — categories switch correctly). Locale-switcher in header changes the user's locale + URL. Inspector "Pluralization probe" panel confirms across all three locales.

Senior calls and watch-outs:

- `proxy.ts` not `middleware.ts` — Next.js 16's rename. The two names are functionally identical but `middleware.ts` is deprecated in 16; new code uses `proxy.ts`. The next-intl docs caught up; the student writes the current name.
- `setRequestLocale` is mandatory in every page and layout under `[locale]/`. Skip it and the route silently converts to dynamic — the perf regression is invisible without monitoring. The senior reflex: top-of-file, before any next-intl call. Add it to the layout for the layout's own messages, then to each page for the page's own. The inspector's "Static-vs-dynamic" panel surfaces missed calls.
- `hasLocale(routing.locales, requested)` is the safe validator — the request can carry an unknown string (a hand-crafted URL like `/pt-BR/invoices`); `hasLocale` narrows the type and lets the layout `notFound()` cleanly. Skipping validation and trusting the param means TypeScript can't narrow `string` to `Locale` downstream.
- The cookie's `sameSite: 'lax'` is the senior default — sufficient for the locale-switch surface, doesn't break OAuth callbacks, GDPR-essential-for-functionality. The cookie name is `NEXT_LOCALE` (next-intl's default) so the middleware reads it without extra config.
- French plural categories include `many` for numbers like 1000000 — verify in the probe panel. A catalog that ships only `one / other` for French silently mistranslates large numbers (the `other` branch fires when it shouldn't). CLDR is the source of truth; the translator's job is to fill the categories the language requires; the engineer's job is to enable them in the message string.
- The `<NextIntlClientProvider messages={pick(messages, ['nav','locale-switcher'])}>` scope keeps the client-side payload small. The full catalog is ~80 keys × 3 locales — passing all of it through the provider would ship 240 entries to every client; picking the two namespaces a Client Component actually reads ships 8.
- The `import('../../messages/${locale}.json')` dynamic import code-splits per locale. Production loads only the active locale's JSON; static analysis catches the path; switching locales kicks off a fresh import for the new locale on first visit and caches thereafter.
- Catalogs check into the repo (`messages/*.json`). The senior reach for translation-management-system integration (Crowdin, Lokalise, Phrase) is "round-trip the JSON" — TMS imports, translators edit in their UI, TMS exports back to the same shape, PR. The chapter doesn't ship TMS integration; it ships the catalog format that *every* TMS consumes.

Codebase state at entry: 11.3 surface live in English only, `next-intl@^4` installed, schema with locale + timeZone columns, no proxy, no `[locale]/` segment, hard-coded strings everywhere.
Codebase state at exit: `routing.ts`, `navigation.ts`, `request.ts`, `formats.ts` (minimal) filled. `proxy.ts` middleware live. `app/[locale]/layout.tsx` renders with `setRequestLocale` and `<html lang>`. Three message catalogs complete. `setLocaleAction` wired. Invoice page reads translated strings and renders pluralized counter correctly per-locale. `/fr-FR/invoices` and `/en-GB/invoices` route correctly; locale-switcher works end-to-end. **Runnable — locale prefix routing live, every UI string translated, pluralized counter respects CLDR; currency and date formatting still hard-coded (transformed in 18.3.4).**

Estimated student time: 75 to 90 minutes. The chapter's heaviest setup lesson — wiring + translation work converge here.

---

## Lesson 18.3.4 — Date rendering with Temporal in profile tz and currency via `Intl.NumberFormat`

Goals:

- Transform every date / currency render on the invoice list to flow through next-intl's `useFormatter` / `getFormatter`. The data side is in place from 18.1: `invoice.createdAt` reads as `Temporal.Instant`, `invoice.dueDate` as `Temporal.PlainDate`, `invoice.amountMinor` is bigint cents, `invoice.currency` is text. The formatting side is `useFormatter().dateTime(instant, { dateStyle, timeStyle, timeZone })` and `useFormatter().number(amount, { style: 'currency', currency })`.
- Read the user's tz from the request: `const tz = await getCurrentUserTimeZone()` (helper from 18.1.3, reads `session?.user.timeZone ?? 'UTC'`). Pass `timeZone: tz` into every `dateTime` call. The `tz` is the load-bearing argument — without it, the formatter defaults to the runtime's tz (UTC on Vercel) and silently formats every user's data in UTC, regardless of profile.
- Transform the invoice page: `const t = await getTranslations('invoices.list'); const format = await getFormatter(); const tz = await getCurrentUserTimeZone();`. Each row's `createdAt` cell: `<td>{format.dateTime(row.createdAt, { dateStyle: 'medium', timeStyle: 'short', timeZone: tz })}</td>`. Each row's `dueDate` cell (calendar date, no tz): `<td>{format.dateTime(row.dueDate, { dateStyle: 'medium' })}</td>` — `PlainDate` doesn't need a tz, the formatter handles it. Each row's `amount` cell: `<td>{format.number(Number(row.amountMinor) / 100, { style: 'currency', currency: row.currency, currencyDisplay: 'narrowSymbol' })}</td>`.
- Add the "due relative" column to surface `Intl.RelativeTimeFormat`. The senior pairing with Temporal: `const today = Temporal.Now.plainDateISO(tz); const days = today.until(row.dueDate, { largestUnit: 'days' }).days; <span>{format.relativeTime(days, 'day')}</span>`. In en-US this renders as `'in 3 days'` / `'5 days ago'`; in fr-FR as `'dans 3 jours'` / `'il y a 5 jours'`. The `numeric: 'auto'` shared format adds `'yesterday'` / `'tomorrow'` special-cases where the language supports them.
- Extend `lib/i18n/formats.ts` with the canonical presets. `dateTime.short` (date only, medium style), `dateTime.withTime` (date + time, both medium), `number.currency` carved out as `{ style: 'currency', currencyDisplay: 'narrowSymbol' }` (currency tag injected at call site since it's data), `relativeTime: { numeric: 'auto' }`. The senior reach: presets centralized so a UI-wide change ("everyone wants short dates as `DD MMM YYYY`") is one edit.
- Wire the inspector "Currency-by-data" panel: three invoice rows seeded with USD / GBP / EUR amounts of `123456` (minor units), rendered in each of three locales — nine cells total. Confirms en-US renders USD as `'$1,234.56'` and EUR as `'€1,234.56'`; fr-FR renders EUR as `'1 234,56 €'` and USD as `'1 234,56 $US'` (locale convention puts the symbol after for fr-FR). Inspector "DST proof" panel: two seeded invoices with `createdAt` at `2026-07-01T18:00:00Z` and `2026-01-01T18:00:00Z`, rendered for the `(en-GB, Europe/London)` user — confirms `'7:00 PM'` BST and `'6:00 PM'` GMT. Switch user to `(en-US, America/New_York)` — same instants, `'2:00 PM'` EDT and `'1:00 PM'` EST. The render proves the formatter respects DST without explicit handling, because `Temporal.Instant` + IANA `timeZone` is DST-aware by construction.
- Audit step: grep `Date.prototype.toLocaleString` and raw `Intl.NumberFormat` across `app/[locale]/`. Zero hits expected. Then grep `Intl.DateTimeFormat()` (no argument) — zero hits; deliberately add one in a Server Component, run the audit panel, see the finding, revert. The structural defense: every formatter call goes through `useFormatter` / `getFormatter`, which wires `locale` and `now` automatically and requires the engineer to pass `timeZone` explicitly.
- Run the app: `/invoices` renders correctly for the en-US user (USD invoices as `'$1,234.56'`, dates in `America/New_York`). Switch locale to fr-FR: `/fr-FR/invoices` re-renders with the *same* underlying data (`createdAt`, `dueDate`, `amount`, `currency` unchanged) but formatted per fr-FR conventions. Switch user to `(en-GB, Europe/London)` via inspector: invoice with `2026-07-01T18:00:00Z` shows `'7:00 PM'` (BST). Inspector DST panel passes. Inspector Currency-by-data panel passes.

Senior calls and watch-outs:

- The currency is *data*, not UI. The chapter never hard-codes the currency symbol or assumes the viewer's locale carries it; `currency: row.currency` is the seam. A USD invoice viewed by a French user still renders as USD (with French separator and the `$US` label per fr-FR convention). The senior reach: the `currency` text column on the invoice is the contract, end-to-end.
- `currencyDisplay: 'narrowSymbol'` is the chapter's UI default — compact (`$` instead of `US$`) for table cells. `'name'` is the right reach for verbose receipts ("US dollars"); `'code'` for technical surfaces ("USD"). Switch in the preset; never inline per-call-site.
- The `timeZone` argument is mandatory in code review terms. The structural defense is the typed `useFormatter` hook — it accepts `timeZone` per call (not constructor-time), so the engineer writes it every time. The audit lint rule: any `dateTime(` call without `timeZone` in the options object is a finding.
- `Temporal.PlainDate` doesn't need a `timeZone` — it's a calendar date, location-independent. The formatter renders correctly without one. A `dueDate` formatted with `timeZone: tz` works (the formatter ignores the tz on a `PlainDate`) but the omission is the senior intent — calendar dates aren't timezones.
- The relative-time column uses `Temporal.Now.plainDateISO(tz).until(row.dueDate, { largestUnit: 'days' }).days` for the count. Note `largestUnit: 'days'` — without it, the duration returns `years` / `months` / `days` separately, and the formatter doesn't know which to render. The senior reach: pick the unit that matches the UI's resolution.
- For "live" relative-time strings ("3 minutes ago" updating per minute), the chapter doesn't reach — server-rendered list, fresh data each navigation. A client-island that re-renders every minute is the right shape when needed; the chapter names it once.
- Use `format.number(Number(row.amountMinor) / 100, ...)` — `amountMinor` is bigint cents from the schema; convert to a `number` for `Intl.NumberFormat` (which accepts `number` or `bigint`, but `bigint` doesn't handle the divide). For amounts exceeding `Number.MAX_SAFE_INTEGER`, the senior reach is `BigInt` end-to-end with `Intl.NumberFormat`'s bigint support — out of chapter scope; named once.
- The `formats` object in `request.ts` makes presets reusable. `format.dateTime(value, 'short')` references the named preset instead of inlining the options object. The chapter ships both forms (named preset for common cases, inline options for one-offs); senior call: prefer presets, inline only when the surface is genuinely unique.
- The `getFormatter()` async call is fine in a Server Component — it's the await of a per-request context lookup. In a Client Component, use the hook form `useFormatter()`. Mixing is a tell that a component should split.

Codebase state at entry: locale-prefixed URLs work, every UI string translated, pluralized counter respects CLDR, but every date and amount still rendered through hard-coded en-US formatters.
Codebase state at exit: every invoice list cell flows through `useFormatter` / `getFormatter`; `dateTime` calls pass `timeZone: tz`; `number` calls pass `currency: row.currency`; the DST-spanning instants render with correct wall-clock hour per the viewer's tz; the currency-by-data panel verifies; `formats.ts` carries the shared presets. **Runnable — full tz-aware, currency-aware list view; SEO surface (hreflang, sitemap) not yet wired.**

Estimated student time: 55 to 70 minutes.

---

## Lesson 18.3.5 — `alternates.languages` metadata and per-locale sitemap entries

Goals:

- Fill `lib/seo/alternates.ts`'s `generateAlternates(pathname, currentLocale)`: returns `{ canonical, languages }`. `canonical` is the locale-prefixed URL for `currentLocale` (the locale-specific URL — not the default). `languages` is a record keyed by each supported locale's BCP 47 tag, with `x-default` mapped to the default locale's URL. Use `getPathname({ locale, href: pathname })` from `lib/i18n/navigation.ts` to construct each variant — handles the `'as-needed'` prefix correctly (`'en-US'` → no prefix, others → prefixed). The function is the single seam; every `generateMetadata` calls it.
- Transform marketing's `app/[locale]/(marketing)/page.tsx`'s `generateMetadata`: `export async function generateMetadata({ params }): Promise<Metadata> { const { locale } = await params; const t = await getTranslations({ locale, namespace: 'marketing.meta' }); const alternates = generateAlternates('/', locale); return { title: t('title'), description: t('description'), alternates, openGraph: { title: t('ogTitle'), description: t('ogDescription'), locale: bcp47ToOgLocale(locale), alternateLocale: routing.locales.filter((l) => l !== locale).map(bcp47ToOgLocale), url: alternates.canonical, type: 'website' }, twitter: { card: 'summary_large_image', title: t('title'), description: t('description') } }; }`. Walk each metadata field: localized `title` / `description` via `getTranslations` (the async sibling of `useTranslations`, required because `generateMetadata` is not a component); `alternates.canonical` and `alternates.languages` from the helper; OG locale in underscore form (`'fr_FR'`, not `'fr-FR'`) — `bcp47ToOgLocale` does the conversion.
- Repeat the `generateMetadata` pattern for the in-app pages (`app/[locale]/(app)/invoices/page.tsx`) but with `metadata.robots = { index: false }` because authenticated pages don't get indexed. `hreflang` is unnecessary on noindex pages; the locale resolution still runs but no SEO surface ships. The chapter installs the discipline (`generateMetadata` exists on every page) even on noindex pages because future copy editors expect it.
- Fill `app/sitemap.ts`: `export default function sitemap(): MetadataRoute.Sitemap { const paths = ['/', '/pricing', '/features']; return paths.map((path) => ({ url: \`${env.APP_URL}${getPathname({ locale: routing.defaultLocale, href: path })}\`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: path === '/' ? 1.0 : 0.8, alternates: { languages: Object.fromEntries(routing.locales.map((l) => [l, \`${env.APP_URL}${getPathname({ locale: l, href: path })}\`])) } })); }`. Note: one `<url>` entry per *canonical path*, with alternates ride-along; not three entries per path. Next.js emits `<xhtml:link rel="alternate" hreflang="...">` inside each `<url>` block. The sitemap index at `/sitemap.xml` aggregates per-locale variants without duplication.
- Wire `app/[locale]/(marketing)/opengraph-image.tsx` (provided): the file exports `default async function OG({ params }) { const { locale } = await params; const t = await getTranslations({ locale, namespace: 'marketing.meta' }); return new ImageResponse(<div>...{t('ogTitle')}...</div>, { width: 1200, height: 630 }); }`. Each locale gets its own OG image at build time; the rendered image text matches the page's locale.
- Run the inspector "Source-HTML hreflang" panel: fetches `/`, `/en-GB`, `/fr-FR`, `/pricing`, `/en-GB/pricing`, `/fr-FR/pricing` via server-side `fetch`, extracts every `<link rel="alternate">` tag from the response HTML, displays in a table. Each page lists three alternates (self plus two others) plus `x-default`. Bidirectionality verified: en-US page lists fr-FR; fr-FR page lists en-US. `x-default` points to `/` (the default locale's URL).
- Run the inspector "Sitemap preview" panel: parses `/sitemap.xml` (Next.js renders it on demand), shows the tree of `<url>` entries with their `<xhtml:link>` alternates. The senior reach is to validate it against Google Search Console's sitemap reader (out of chapter scope, named once).
- Audit step: `curl /fr-FR | grep canonical` → `<link rel="canonical" href="https://app.example.com/fr-FR">`. Then verify the wrong reach is *not* in place: a canonical of `/` on the fr-FR page would kill its ranking. Read `lib/seo/alternates.ts` — confirm `canonical` is locale-specific.

Senior calls and watch-outs:

- The canonical URL is the locale-specific URL, *not* the default. The wrong reach (canonicalizing all locales to en-US) tells Google "the fr-FR page is a duplicate of en-US; only rank en-US" and kills the French page's organic traffic. The senior reach is one canonical per locale; `hreflang` declares the relationships. This is the most common ranking-killer mistake in i18n SEO and the chapter rehearses the right shape.
- Self-reference is mandatory: the fr-FR page lists `hreflang="fr-FR"` for itself, not just the alternates. Google validates; missing self-reference means the entire group is silently dropped. `generateAlternates` includes the current locale in the languages record automatically.
- Bidirectionality is mandatory: every page lists every other supported locale as an alternate. If the en-US page lists fr-FR but the fr-FR page doesn't list en-US, Google ignores both. The helper's `Object.fromEntries(routing.locales.map(...))` is the structural defense — every page generates the full set.
- `x-default` is the fallback Google serves when the user's locale doesn't match any alternate. The chapter's senior reach: `x-default` points to the default locale's URL (`/`). Some teams use a locale-picker landing page (`/locale-picker`); for SaaS, defaulting to the strongest market locale is the senior call.
- OG locale uses underscore form (`'fr_FR'`), BCP 47 uses hyphen (`'fr-FR'`). The `bcp47ToOgLocale` helper converts; forgetting it ships `'fr-FR'` in the OG tag, which Facebook and LinkedIn silently treat as invalid. Named placeholder for the typo.
- Authenticated app pages get `robots: { index: false }` — they're not SEO targets; `hreflang` is unnecessary; the locale resolution still runs but the public surface is dark. The chapter installs `generateMetadata` on every page so future surface additions don't ship without it, but only marketing pages declare `alternates`.
- The sitemap is one `<url>` per canonical path with alternates ride-along; not three URLs per path. Google reads the `xhtml:link` alternates inside each `<url>` block. Submitting per-locale sitemaps separately is the older convention; the modern (and Next.js-native) approach uses `MetadataRoute.Sitemap`'s `alternates.languages` directly.
- The `app/sitemap.ts` file is at the root, not under `[locale]/`. The sitemap is locale-agnostic — it serves the *whole site*'s URL graph, with locales declared inside each entry. Putting it under `[locale]/` would produce three sitemaps (one per locale) which is redundant; the root sitemap is the senior shape.
- Per-locale OG images via `opengraph-image.tsx` are *strong* SEO/social signals for marketing pages, weaker for authenticated pages. The chapter ships per-locale OG only on marketing (`/`, `/pricing`, `/features`); app routes get the default OG image because they're noindex anyway.
- The "untranslated content" rule from 18.2.6: a locale that hasn't shipped yet should not list a `hreflang` alternate to its URL (or the URL should `noindex`). The chapter ships all three locales translated, so the question doesn't arise; named for the senior who carries the discipline into a real 5-locale launch with rolling rollout.

Codebase state at entry: full tz-aware, currency-aware list view live; no SEO metadata, no sitemap, no `hreflang` in source.
Codebase state at exit: `lib/seo/alternates.ts` filled; `app/[locale]/(marketing)/page.tsx`'s `generateMetadata` returns localized title/description plus `alternates.languages` plus OG locale shape; in-app pages declare `robots: { index: false }`; `app/sitemap.ts` returns `MetadataRoute.Sitemap` with per-entry alternates; the inspector source-HTML hreflang panel shows three `hreflang` tags plus `x-default` per page, bidirectionally; the sitemap preview shows one entry per canonical path with locale alternates. **Runnable — the full project surface; ready for verify pass.**

Estimated student time: 50 to 65 minutes.

---

## Lesson 18.3.6 — Verify

Goals:

- Walk every "Done when" clause from the framing's verify recipe in order. The recipe table is the script; this lesson executes it plus runs deliberate-misuse demos for the load-bearing rules.
- **Locale switch reflow (the brief's headline check).** As `(en-US, America/New_York)`, open `/invoices` — USD invoices as `'$1,234.56'`, dates in EDT/EST. Switch locale to "Français". Lands at `/fr-FR/invoices`; header now "Factures"; same data reflows with French separator (`'1 234,56 €'` for EUR, `'1 234,56 $US'` for USD), French status labels; `users.locale` and `NEXT_LOCALE` cookie both updated.
- **DST-spanning render (the project's load-bearing proof).** Switch to `(en-GB, Europe/London)`. Inspector DST panel: `2026-07-01T18:00:00Z` → `'7:00 PM'` (BST = UTC+1); `2026-01-01T18:00:00Z` → `'6:00 PM'` (GMT = UTC+0). Same UTC instants, different wall-clock hours, because London observes DST in summer but not winter. Deliberate-misuse: remove `timeZone: tz` from the `dateTime` call; both rows now render in UTC (`'6:00 PM'` and `'6:00 PM'`); revert.
- **`hreflang` tags in source, bidirectional with `x-default`.** Inspector source-HTML panel and view-source on `/fr-FR/`: three `<link rel="alternate" hreflang="...">` plus `x-default`. Bidirectional — `/` lists `/fr-FR/`, `/fr-FR/` lists `/`. Deliberate-misuse: remove fr-FR from the en-US page's alternates; inspector flags the missing one-sided link; revert.
- **Canonical is the locale-specific URL.** `curl /fr-FR/pricing | grep canonical` → `https://app.example.com/fr-FR/pricing`, not `/pricing`. Deliberate-misuse: set canonical to default URL across all locales; verify the bug is silent (page loads) but Google would treat as duplicate of en-US; revert.
- **Pluralized counter respects CLDR.** Pluralization probe: en-US shows `'No invoices'` / `'1 invoice'` / `'5 invoices'`; fr-FR shows `'Aucune facture'` / `'1 facture'` / `'1 000 000 de factures'` (the `many` branch with the `de` preposition). Deliberate-misuse: replace message with `'{count} invoices'` (no plural); probe shows `'1 invoices'`; revert.
- **Currency renders per locale, currency is data.** Currency-by-data panel: nine cells (three currencies × three locales). Same amount, same currency tag, locale-specific separator/position. Deliberate-misuse: hard-code `currency: 'USD'`; every invoice renders as USD regardless of stored currency; revert.
- **Locale-switcher preserves the current path.** At `/invoices?status=paid&cursor=abc123`, switch to French; lands at `/fr-FR/invoices?status=paid&cursor=abc123`. The typed `usePathname` does the prefix swap, query string carries through.
- **`Accept-Language` negotiation for anonymous users.** Private window with browser language fr-FR visits `/`; middleware redirects to `/fr-FR/` (302). Repeat with `pt-BR`; no match, falls to default `en-US`, loads `/` unprefixed.
- **`<html lang>` matches URL prefix.** View-source on `/fr-FR/invoices` → `<html lang="fr-FR">`; on `/invoices` → `<html lang="en-US">`. Deliberate-misuse: hard-code `lang="en"`; revert.
- **No hard-coded strings, no `toLocaleString`, no raw `Intl.X` outside the i18n seam.** Inspector message-key audit returns zero hits. Deliberate-misuse: add one `<button>Save</button>`; audit shows one hit; revert.
- **`setRequestLocale` preserves static rendering.** Inspector static-vs-dynamic panel: marketing routes all static; app routes dynamic (auth). Deliberate-misuse: remove `setRequestLocale(locale)`; rebuild; marketing routes converted to dynamic; revert.
- **Sitemap with per-entry alternates.** Sitemap preview: one `<url>` per canonical path with three `<xhtml:link>` ride-alongs.
- **Per-locale OG images.** `/fr-FR/`'s `og:image` URL points to `/fr-FR/opengraph-image`; fetched, shows French title.
- **Locale and timezone independent.** Switch to `(fr-FR, Pacific/Auckland)`. French strings, dates in NZDT/NZST. The combination works without code; the column split is the discipline.
- Name the senior calls one more time:
  - Locale resolved once in `proxy.ts`, downstream code reads only the resolved value.
  - `users.timeZone` and `users.locale` are independent profile columns; both piped explicitly into formatters at the edge.
  - Every UI string flows through `t()` / `t.rich`; every number through `format.number`; every date through `format.dateTime` with `timeZone: tz`; no hard-coded strings, no `toLocaleString`, no raw `Intl.X` outside `lib/i18n/`.
  - ICU plurals respect CLDR categories per language; `=0` exact-match for `'No invoices'` UX.
  - Currency is data (the `invoices.currency` column), not UI; the symbol and format follow the viewer's locale, the currency follows the invoice.
  - `setRequestLocale` is mandatory in every page / layout under `[locale]/` to preserve static rendering.
  - Canonical is the locale-specific URL, not the default; `hreflang` is bidirectional with self-reference plus `x-default`; one `<url>` per canonical path in the sitemap with alternates ride-along.
  - `proxy.ts` not `middleware.ts` (Next.js 16's rename); `next-intl@^4` with `createNavigation` for typed routing primitives.
  - DST is a property of the calendar plus tz, not the timestamp; `Temporal.Instant` + IANA `timeZone` is DST-aware by construction.
- Forward references:
  - Chapter 19.3 — integration tests against the locale negotiation middleware and the formatters; the `(fr-FR, Pacific/Auckland)` cross-locale-tz fixture exercises decoupling.
  - Chapter 19.5 — Playwright money-path tests run in en-US by default; one parallel run in fr-FR catches locale-specific rendering bugs.
  - Chapter 20.3 — performance audit; the per-locale message-catalog payload is one optimization (scope `<NextIntlClientProvider>` subtree, lazy-load by namespace).
  - Chapter 21.2.3 — CI gate: a smoke test that fetches `/`, `/fr-FR`, asserts the `<link rel="alternate">` set matches `routing.locales`. Catches regression on every PR.
  - Chapter 17.3 — error and security baseline audit; the locale-switch action is one audited finding category (Zod validation against the supported-locales constant).
  - Unit 22.4 — review a PR adding a fourth locale (`'de-DE'`); the rehearsal of "one PR, not a refactor" lands here.

Senior calls and watch-outs:

- Verify lesson rehearses every failure mode the chapter exists to prevent. If a verification fails, point at the owning build lesson.
- Deliberate-misuse demos must run as named single-flag changes (remove `timeZone: tz`, hard-code currency to USD, drop self-reference from alternates, set canonical to default, replace plural message with concat, remove `setRequestLocale`). Verify each in isolation, then revert.
- The DST-spanning render is the single most important verification. The two seeded instants (`2026-07-01T18:00:00Z` and `2026-01-01T18:00:00Z`) viewed in `'Europe/London'` produce `'7:00 PM'` and `'6:00 PM'` respectively — different wall-clock hours from a constant UTC offset. The senior can recite this off the top of their head; the rehearsal is what makes the recall durable.
- The `hreflang` audit is the second most important. The wrong shapes (canonical to default, missing self-reference, one-sided declarations, missing `x-default`) are all silently-ignored-by-Google failures — the bug is invisible until ranking drops six months later. The inspector's source-HTML panel is the rehearsal of the audit step a senior runs on a real launch.
- The "every string through `t()`" rule is checked structurally via grep, not by eye. A new contributor can read the audit panel and know if the rule holds. Every later PR is one keypress away from a regression; the structural defense is the audit panel as a green check in CI.

Codebase state at entry: full project surface live — locale routing, message catalogs, tz-aware date and currency, `hreflang` and sitemap.
Codebase state at exit: every "Done when" clause verified clause-by-clause; the student can articulate the load-bearing rules (locale resolved once in proxy, profile-stored tz piped to every formatter, every string through `t()`, currency is data, canonical is the locale-specific URL, `hreflang` is bidirectional with `x-default`, `setRequestLocale` preserves static rendering, DST handled by `Temporal.Instant` + IANA tz) and which forward unit will lean on them.

Estimated student time: 35 to 50 minutes.
