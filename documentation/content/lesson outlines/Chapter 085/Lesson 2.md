# Chapter 085 — Lesson 2 outline

## Lesson title

Keep: **Wire next-intl and ship three catalogs**. Accurate — it names the spine wired (next-intl) and the deliverable (three catalogs) without overpromising the formatting/SEO that come later.

Sidebar short title: **Wire next-intl + catalogs**

## Lesson type

`Implementation`

(Test-coder runs. Writer renders the Implementation section list: Goal + Finished result / Your mission / Coding time / Moment of truth.)

## Lesson framing

The student installs the canonical 2026 i18n spine: locale resolved once in middleware, every UI string read from a per-locale catalog through `t()`, and a pluralized counter that honors CLDR categories per language (including French's `many` branch). The senior payoff is that locale routing now works end-to-end — `/fr-FR/invoices` renders French with `<html lang="fr-FR">`, the switcher rewrites the URL and persists the choice, and the catalog is a grep-able contract every later surface inherits — turning "add a locale" into a translation diff, not a retrofit.

## Codebase state

### Entry

The chapter 062 invoices surface lifted under `[locale]/` and routing, but **not localizing**. `src/i18n/request.ts` resolves every locale to the en-US catalog (hard-coded `import('../messages/en-US.json')`). `app/[locale]/layout.tsx` hard-codes `<html lang="en-US">` and ships the full unscoped catalog to the client via `NextIntlClientProvider messages={messages}`. `messages/en-GB.json` and `messages/fr-FR.json` are `{ "_todo": ... }` stubs. `src/i18n/formats.ts` is `{} as const satisfies Formats`. The invoices `page.tsx` heading is hard-coded `"Invoices"` with no count paragraph and passes only `rows/view/role` to the table; `table.tsx` has hard-coded column headers, `capitalize` status, `{row.currency} {row.total}` amount, `toLocaleDateString` archived-on line. `setLocaleAction` returns `err('internal', 'Not implemented')`. Provided complete: `routing.ts`, `navigation.ts`, `proxy.ts`, `global.ts`, `lib/temporal.ts`, `lib/user-time.ts`, `lib/i18n/supported.ts`, `lib/seo/*`, `app/sitemap.ts`, session/store, the full inspector, `messages/en-US.json`. The app boots green at `/invoices` and `/fr-FR/invoices` — both render English.

### Exit

Locale routing live end-to-end. `request.ts` dynamic-imports the active locale's catalog (`import(\`../messages/${locale}.json\`)`). `formats.ts` carries `dateTime.short/withTime` and `number.compact` (the `number.currency` preset is L3). `[locale]/layout.tsx` drives `<html lang={locale}>` and scopes the client provider to `pick(messages, ['invoices', 'nav', 'locale-switcher'])`. The invoices page reads `getTranslations('invoices.list')`, renders the heading, `selectPrompt`, and `t('count', { count })`; the table routes column headers, status, badges, and row-action labels through `useTranslations`. `setLocaleAction` writes `setUserLocale(ctx.userId, ...)` and the `NEXT_LOCALE` cookie. `en-GB.json` is the British diff; `fr-FR.json` is the full French catalog with the ICU `many`/`=0` counter. Still carry-in shape (deferred to L3): the date cell stays `toLocaleDateString`-style, the amount stays `{row.currency} {row.total}`, no date/due value cells wired to the formatter, and `page.tsx` does not yet read `tz`/`nowMs`/`dueInDaysById`. `formats.ts` has no `currency` preset yet.

## Lesson sections

Implementation contract order. No diagram (the request-path shape is owned by the Project Overview architecture list; this lesson is hands-on wiring).

### Goal + Finished result (intro, no header)

One sentence: by the end, locale-prefixed URLs render in their own language with the right plural form per locale. Then a one-paragraph description of the working result (no screenshot needed, prose is enough — optionally one `Screenshot` of `/invoices` vs `/fr-FR/invoices` side by side showing the heading + count swapped, plus view-source `<html lang>`): `/` unprefixed loads default-locale marketing, `/fr-FR/` loads French; `/invoices`, `/fr-FR/invoices`, `/en-GB/invoices` all route and render in their own language; the header switcher rewrites the URL and persists; the counter reads `No invoices` / `1 invoice` / `5 invoices` (en-US) and `Aucune facture` / `1 facture` / `1 000 000 de factures` (fr-FR). Note explicitly that currency and dates still render carry-in shape (`{currency} {total}`, unformatted dates) — L3 moves them onto the formatter seam.

### Your mission (h2)

Prose paragraph (no implementation hints, no subsection headers), then the requirements checklist.

Weave into the prose:
- **Feature** (user terms): locale-prefixed URLs that render the whole invoices surface in the viewer's language, a header switcher that changes language and sticks, and a "N invoices" counter that reads naturally in each language.
- **Constraints that shape the solution:** every page/layout under `[locale]/` calls `setRequestLocale` before any next-intl call or the route silently flips static→dynamic (a perf regression invisible without monitoring); the request can carry an unknown locale string, so `hasLocale(routing.locales, requested)` is the validator that narrows the type and lets the layout `notFound()` cleanly; the client payload stays small via a `pick`-scoped provider (three namespaces, not the full 3-locale catalog) plus per-locale dynamic import so production loads only the active locale's JSON; the switch action must write **both** signals (store profile + `NEXT_LOCALE` cookie, `sameSite: 'lax'`) so the choice survives navigation. The load-bearing trap: CLDR gives French a `many` category for large numbers, so an ICU `plural` shipping only `one / other` silently mistranslates `1000000` — the counter uses `=0 / one / many / other`, never a ternary.
- **Out of scope:** date/currency formatting (L3), TMS integration (catalogs check into the repo in the format Crowdin/Lokalise/Phrase round-trip, but no TMS wiring), SEO metadata (L4).
- Note the provided seams the student reads but does not rewrite: `routing.ts` (the `'as-needed'` prefix), `navigation.ts` (typed `Link`/`redirect`), `proxy.ts` (Next.js 16's rename of `middleware.ts`).

Requirements checklist (`Checklist`/`ChecklistItem` with `tested`/`untested` chips). Tag each — the test-coder asserts the `[tested]` ones:

1. `[tested]` Every UI string on the invoice surface renders from the catalog, not hard-coded JSX; switching locale swaps every string (assert: French strings appear at `/fr-FR/invoices`, English at `/invoices`).
2. `[tested]` The "N invoices" counter renders the correct CLDR category per locale across 0/1/5/1000000 — en-US `No invoices`/`1 invoice`/`5 invoices`, fr-FR `Aucune facture`/`1 facture`/`1 000 000 de factures` (the `many` branch).
3. `[tested]` `<html lang>` matches the URL prefix on every locale's path (`/fr-FR/...` → `fr-FR`, unprefixed → `en-US`, `/en-GB/...` → `en-GB`).
4. `[tested]` The locale-switch action updates the store user's `locale` and sets the `NEXT_LOCALE` cookie.
5. `[untested]` `/` loads default-locale marketing unprefixed; `/fr-FR/` loads French marketing; `/invoices`, `/fr-FR/invoices`, `/en-GB/invoices` all route and render in their own language. (Browser confirmation.)
6. `[untested]` An anonymous browser sending `Accept-Language: fr-FR` is redirected from `/` to `/fr-FR/`; an unsupported `pt-BR` loads `/` unprefixed (falls to `en-US`). (Negotiation is provided in `proxy.ts`; confirmed in a private window.)
7. `[untested]` Marketing routes stay statically rendered after `next build` (a missing `setRequestLocale` flips them dynamic — no inspector panel, verify by hand).
8. `[untested]` The switcher preserves path and query: `/invoices?status=paid&cursor=abc123` → `/fr-FR/invoices?status=paid&cursor=abc123`.

### Coding time (h2, wrapped in `<details>` by the writer)

One-line build prompt: implement against this brief and the lesson tests; the walkthrough below is to read after attempting. Organize by file as it appears in the repo. Code-sample guidance per file noted inline.

- **`src/i18n/request.ts`** — `Code`. Replace `import('../messages/en-US.json')` with `import(\`../messages/${locale}.json\`)`; `locale` validated via `hasLocale`. Callout: this config returns only `{ locale, messages, formats }` — no session read, no `timeZone`, no `now` — because `getRequestConfig` runs during the static prerender of every `generateStaticParams` locale and any request-tied read fails it ("Uncached data accessed outside of `<Suspense>`"). The tz is read at the call site in L3. Dynamic import code-splits per locale so production loads only the active catalog.

- **`src/i18n/formats.ts`** — `Code`. `dateTime: { short: { dateStyle: 'medium' }, withTime: { dateStyle: 'medium', timeStyle: 'short' } }`, `number: { compact: { notation: 'compact' } }`, `as const satisfies Formats`. Callouts: the `number.currency` preset arrives in L3; no `relativeTime` key (not part of next-intl's `Formats` type); presets named at the config layer, not inlined at call sites.

- **`app/[locale]/layout.tsx`** — `CodeVariants` (before: provided shell with `lang="en-US"` + unscoped provider; after: `lang={locale}` + `pick`-scoped provider) — the two-line delta is best shown as before/after. The shell already wires `generateStaticParams`, `setRequestLocale`, `NuqsAdapter`. Student changes: `<html lang={locale}>` and `messages={pick(messages, ['invoices', 'nav', 'locale-switcher'])}`. Callouts: why `setRequestLocale` placement (before any next-intl call) is load-bearing for static rendering; why `<html lang>` is driven from the resolved param, never the cookie (hydration-mismatch avoidance, hence `suppressHydrationWarning` only for the theme class); why the scoped provider keeps the client payload to the three namespaces client components actually read (marketing copy + metadata stay server-only). The `pick` helper is provided in the shell.

- **`app/[locale]/(app)/invoices/actions.ts`** (`setLocaleAction`) — `Code`. Fill the `authedAction('member', z.strictObject({ locale: z.enum(SUPPORTED_LOCALES) }), ...)` body: `setUserLocale(ctx.userId, input.locale)`, then `(await cookies()).set('NEXT_LOCALE', input.locale, { path: '/', sameSite: 'lax' })`, `return ok(null)`. Rationale: writes the store profile (read by the negotiation chain's profile step) and the cookie (read by the cookie step) so session and URL agree; `sameSite: 'lax'` is sufficient for locale, doesn't break OAuth callbacks, GDPR-essential-for-functionality; `NEXT_LOCALE` is the next-intl default cookie name. The provided `locale-switcher.tsx` calls this then a typed `router.replace` to re-prefix the URL — orient, don't rewrite.

- **`app/[locale]/(app)/invoices/page.tsx`** — `AnnotatedCode` (direct focus to the three deltas: `setRequestLocale(locale)`, `const t = await getTranslations('invoices.list')`, the `t('title')`/`t('selectPrompt')`/`t('count', { count: rows.length })` substitutions). Explicitly note the date/currency/relative-due wiring (the `tz`/`nowMs`/`dueInDaysById` reads and the extra table props) stays absent until L3 — the table still receives only `rows/view/role` here.

- **`app/[locale]/(app)/invoices/table.tsx`** — `Code` (excerpt: header row + status/badge/action labels). `const t = useTranslations('invoices.list')`; column headers via `t('columns.*')`, status via `t('status.<value>')` (replacing the `capitalize` raw render), badges via `t('badge.deleted'|'archived')`, row-action labels via `t('actions.*')`. Callout: the value cells (date/amount/due) stay carry-in shape (`{row.currency} {row.total}`, `toLocaleDateString`) until L3; `useFormatter` is not introduced here.

- **`messages/en-GB.json`** — `Code`. The ~15-key British diff from en-US: copy en-US, then edit spellings ("localised", "time zone") and any date-order copy. Callout: same key shape as en-US (the augmented `Messages` type enforces it); only the diverging values change.

- **`messages/fr-FR.json`** — `AnnotatedCode` (focus the counter and the status labels). Full translation; the counter `"{count, plural, =0 {Aucune facture} one {# facture} many {# de factures} other {# factures}}"`, status `Brouillon / Envoyée / Réglée / En retard`. Callout: the `many` branch (CLDR's French rule for large numbers) and the `=0` exact-match override; `#` is the formatted count; `other` is mandatory. The English source carries `=0 / one / other` — French adds `many`. For ICU `plural` / CLDR categories, link to lesson 2 of chapter 084 rather than re-explaining. For key-naming discipline (`feature.surface.role`), link to lesson 1 of chapter 084.

Decision-rationale recap callouts (one or two sentences each): scoped provider trims the client payload to three namespaces; dynamic import code-splits per locale; `sameSite: 'lax'`; `NEXT_LOCALE` is the next-intl default; catalogs check in as the TMS-consumable format. For the profile `timeZone` seam (`getCurrentUserTimeZone`), link to lesson 3 of chapter 083 — not exercised here.

External resources: none authored by this outline; resourcer appends after the `<details>` if any.

### Moment of truth (h2)

Test command: `pnpm test:lesson 2`. Expected output: green pass for the locale-routing and pluralization assertions (tests target observable behavior — which strings render at which URL, which plural category fires per count, `<html lang>` per prefix, the action's profile+cookie writes). Show the expected pass summary in a `Code` block.

By-hand checklist (`Checklist`/`ChecklistItem`) for the `[untested]` requirements, each a revert-after misuse demo where useful:
- `/` unprefixed + `/fr-FR/` French marketing; `/invoices`, `/fr-FR/invoices`, `/en-GB/invoices` route in their own language.
- Inspector pluralization probe: type 0/1/2/5/1000000 per locale; French shows `many` at 1000000, both show `=0` text. (Misuse demo: replace the plural message with `'{count} invoices'` → probe shows `1 invoices` and French loses `many`; revert.)
- Header switcher lands the prefixed URL, updates the store `locale`, sets `NEXT_LOCALE`; `<html lang>` matches each prefix. (Misuse demo: re-hardcode `<html lang="en-US">` → lang stops matching the prefix; revert.)
- Private window sending `Accept-Language: fr-FR` redirected `/` → `/fr-FR/`; `pt-BR` loads `/` unprefixed.
- `next build` reports marketing routes static. (Misuse demo: remove `setRequestLocale` → routes flip dynamic; revert.)
- Switcher preserves path+query: `/invoices?status=paid&cursor=abc123` → `/fr-FR/invoices?...`.
- By-hand grep finds zero hard-coded JSX strings inside `app/[locale]/`. (Misuse demo: add `<button>Save</button>` → grep reports one hit; revert.) Locale survives a refresh and a cookie clear on a prefixed URL (the URL prefix is the strongest signal).

Closing note: currency and dates intentionally still render carry-in shape (`{currency} {total}`, unformatted dates) — not a failure; L3 moves them onto the formatter seam.

## Scope

- **Date and currency formatting** — the formatter seam (`useFormatter`, profile `timeZone`, currency-from-data, relative-due) — lesson 3.
- **SEO surface** (`hreflang`, canonical, sitemap alternates, per-locale OG) — lesson 4.
- **The negotiation chain internals and `proxy.ts`** — provided complete here; owned conceptually by lesson 4/lesson 5 of chapter 084. This lesson reads them, does not build them.
- **ICU `plural` / CLDR categories** and **key-naming discipline** — taught in chapter 084 (lesson 2 and lesson 1); link, don't re-teach.
- **The profile `timeZone` field and `Temporal` codecs** — chapter 083 (lesson 3, lesson 1); link, don't re-teach.
- **TMS integration, RTL, additional locales (de-DE/es-ES/pt-PT), schema.org localization** — out of project scope (named in the Project Overview setup cuts).
