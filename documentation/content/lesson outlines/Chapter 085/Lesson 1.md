# Lesson 1 — Project overview

- **Lesson title:** Project overview
- **Sidebar title:** Overview
- **Lesson type:** Project overview

## Lesson framing

The student installs the senior reflex this whole project exists to teach: ship i18n from day one as a structural property of the codebase, not a retrofit.
By the end they have the chapter 062 invoices surface running locally as a tri-locale (`en-US` / `en-GB` / `fr-FR`), tz-aware app — routing every locale but not yet localizing (every locale resolves to the en-US catalog, `<html lang="en-US">` hard-coded), the full inspector loaded (DST and currency panels live, hreflang/sitemap panels still empty), and a clear map of the three build lessons ahead.
No feature is built here; the payoff is the mental model — `[locale]` segment, one catalog, the `useFormatter` / `useTranslations` reflex — so that adding a fourth locale later is one PR, not a 3–6 week rewrite.

## Lesson sections

### What we're building (intro, no header)

One paragraph plus one figure.
Prose: this is chapter 062's invoices surface (URL-state filters, soft-delete, `version` concurrency) lifted into a tz-aware, three-locale surface where every string flows through `t()`, every number through `useFormatter().number`, every date through `useFormatter().dateTime` with the user's profile `timeZone`, while marketing emits `hreflang`, per-locale sitemap entries, and locale-aware OG metadata.
Name that the data substrate is the chapter 062 in-memory store read through a cookie-driven dev session — no Postgres, no auth wall, no provisioning — so it boots under `pnpm dev` clean.
State plainly that the starter routes but does not yet localize; the three build lessons close that gap.

Figure: `Screenshot` (use `TabbedContent` for the four panels) of the finished app —
1. `/invoices` in English showing `'$1,234.56'`;
2. `/fr-FR/invoices` showing `'1 234,56 €'`;
3. the inspector DST panel showing BST-vs-GMT side by side;
4. view-source on `/fr-FR/` with three `<link rel="alternate">` tags plus `x-default`.
These are end-state screenshots for motivation; the lesson builds none of it.

### What we'll practice (h2: "What we'll practice")

A bulleted list framed as skills, not files. Lead with the senior payoff sentence, then the bullets:

- The senior payoff up top: i18n from day one means every later surface inherits `[locale]`, the catalog, and the `useFormatter` / `useTranslations` reflex — a fourth locale becomes one PR, not a multi-week retrofit.
- Resolving locale once in middleware (`src/proxy.ts`) and reading only the resolved value downstream — never `Accept-Language` or `navigator.language` outside the sign-up form.
- Routing every UI string through `t()` / `t.rich`, every number through `useFormatter().number`, every date through `useFormatter().dateTime` with the profile `timeZone` read from the session at the call site.
- Writing ICU `plural` catalogs that respect CLDR categories per language, including French's `many` branch and the `=0` exact-match override.
- Treating currency as data on the invoice and formatting it per the viewer's locale.
- Emitting bidirectional `hreflang` with `x-default`, a locale-specific canonical, and a per-locale sitemap from `generateMetadata` and `app/sitemap.ts`.
- Holding the structural discipline that keeps i18n maintainable: grep-able keys, formatters in one seam, `<html lang>` from the resolved locale, static rendering preserved via `setRequestLocale`.

### Architecture (h2: "Architecture")

Shape only — a labeled list of the request path (no diagram needed; the flow is linear and a labeled list carries it without prose overhead).
Six labeled entries, each one line on what it owns:

- **Middleware (`src/proxy.ts`).** `createMiddleware(routing)` resolves the locale through the five-step negotiation chain (URL → profile → cookie → `Accept-Language` best-match → default) and rewrites once; matcher excludes `inspector`.
- **Request config (`src/i18n/request.ts`).** `getRequestConfig` settles `locale`, `messages` (per-locale dynamic import), and shared `formats` once per request — nothing request-tied (no session, `timeZone`, `now`) so static prerender of every locale stays green.
- **Session + store.** `src/server/session.ts` resolves the `acting-identity` cookie to one of four seeded identities; `src/server/store.ts` is the in-memory "Postgres"; `lib/user-time.ts` reads `locale` / `timeZone` off the session.
- **`[locale]/` segment.** `setRequestLocale` keeps marketing static; `<html lang>` matches the URL prefix; `NextIntlClientProvider` ships a scoped catalog slice (`invoices`, `nav`, `locale-switcher`).
- **Render seams.** `useTranslations` / `getTranslations` for strings; `useFormatter` (client table) for dates and currency; `src/i18n/formats.ts` holds presets; `lib/temporal.ts` holds the codecs; the page reads the tz on the server and threads it into the table.
- **SEO surface.** `src/lib/seo/alternates.ts` feeds every marketing `generateMetadata`; `src/app/sitemap.ts` emits per-locale alternates.

Optional `Aside` (note): name that locale and timezone are independent fields — the seeded `(fr-FR, Pacific/Auckland)` user proves the decoupling. Keep it to a sentence; the depth lives in lesson 3.

### Starting file tree (h2: "Starting file tree")

Use `FileTree`. Render the architect's starter tree from the chapter framing, but comment only the files the lessons touch and highlight the `TODO(L2/L3/L4)` deltas as the focus.

Highlighted student-write files (mark these — they carry TODOs):
- `src/i18n/request.ts` — `TODO(L2)`: real per-locale dynamic import (start hard-codes en-US).
- `src/i18n/formats.ts` — `TODO(L2)` dateTime/number(compact); `TODO(L3)` number.currency.
- `app/[locale]/layout.tsx` — `TODO(L2)`: `<html lang={locale}>` + scoped provider.
- `app/[locale]/(app)/invoices/page.tsx` — `TODO(L2)` t()+counter; `TODO(L3)` tz + due delta.
- `app/[locale]/(app)/invoices/table.tsx` — `TODO(L2)` t() labels; `TODO(L3)` formatters.
- `app/[locale]/(app)/invoices/actions.ts` — `TODO(L2)`: `setLocaleAction` body.
- `app/[locale]/(marketing)/{page,pricing/page,features/page}.tsx` — `TODO(L4)`: `generateMetadata`.
- `messages/en-GB.json` — `TODO(L2)`: ~15-key diff from en-US.
- `messages/fr-FR.json` — `TODO(L2)`: full French translation with ICU `many` branch.

Leave uncommented except where a lesson reads them: the chapter 062 carry-in (invoices toolbar/tabs/pagination/chips/[id]/edit), the provided seams (`src/i18n/{routing,navigation}.ts`, `src/proxy.ts`, `src/global.ts`, `lib/{temporal,user-time}.ts`, `lib/i18n/supported.ts`, `lib/seo/*`, `app/sitemap.ts`, `app/robots.ts`, the store/session, `next.config.ts` plugin wiring), and the inspector.

Below the tree, brief annotations (one or two sentences each, full depth deferred to the owning lesson):
- `messages/en-US.json` is the provided source contract — keys are `feature.surface.role`, named placeholders, `t.rich` tagged keys, counter carrying `=0 / one / other`. Its shape is taught in lesson 2 where the student mirrors it into the other two catalogs.
- The store (`src/server/store.ts`) seeds four users — `(en-US, America/New_York)`, `(en-GB, Europe/London)`, `(fr-FR, Europe/Paris)`, `(fr-FR, Pacific/Auckland)` — plus 30 invoices/org with a USD/GBP/EUR mix, two DST fixtures, one archived row, one soft-deleted row. The `(fr-FR, Pacific/Auckland)` pairing is deliberate: locale and timezone are independent fields. Currency is text on the invoice — issued in EUR regardless of the viewer's locale.
- `lib/user-time.ts` (`getCurrentUserTimeZone` / `getCurrentUserLocale`, react-`cache`d, reading off the session) and `lib/i18n/supported.ts` (`SUPPORTED_LOCALES = ['en-US','en-GB','fr-FR'] as const`, the single source whose `as const` narrows to the `Locale` union) are provided seams.
- `next.config.ts` already wraps with `createNextIntlPlugin('./src/i18n/request.ts')` and carries `cacheComponents: true` from chapter 062 — the wiring that hooks the request-config module.

### Roadmap (h2: "Roadmap")

`CardGrid` with one `Card` per build lesson (lesson number + title + one sentence):

- **Lesson 2 — Wire next-intl and ship three catalogs.** Wires the request-config dynamic import, finishes `[locale]/layout.tsx` and `setLocaleAction`, fills the two catalogs, and routes every UI string through `t()` with a CLDR-correct pluralized counter.
- **Lesson 3 — Format dates in profile tz and currency from data.** Flows every date through the formatter with the profile `timeZone` and every amount through the formatter with the invoice's stored currency, plus a Temporal-driven relative-due column.
- **Lesson 4 — Emit hreflang, sitemap alternates, and per-locale OG.** Adds the public SEO surface: bidirectional `hreflang` with `x-default`, a locale-specific canonical, and per-locale OG images on the marketing pages (the sitemap ships provided).

### Setup (h2: "Setup")

`Steps` component, exact commands in order. No env var list (the project has none).

1. Get the starter codebase from the [project repository](https://github.com/terencicp/react-saas-course-projects), under `Chapter 085/start/`.
2. Install dependencies: `pnpm install`.
3. Start the dev server: `pnpm dev`.

State there is no database, no Docker, no `.env` — the data substrate is the in-memory store and the dev session is a cookie, so it boots with no provisioning. `APP_URL` for canonical/`hreflang` URLs is a constant in `lib/seo/alternates.ts` (`https://app.example.com`).

Expected result (the before-state that ends the lesson): `/invoices` and `/fr-FR/invoices` both route and render chapter 062's surface, but **English in both** — the start's `request.ts` resolves every locale to en-US and `<html lang>` is hard-coded `en-US`, the honest "routes-but-doesn't-localize" before-state. `/inspector` loads with the DST, currency, and plural panels live and the hreflang/sitemap panels empty (filled in L4). Show this expected output with `Code` (terminal/dev-server output) where it helps.

## Scope

- No RTL, no `'de-DE'` / `'es-ES'` / `'pt-PT'` — only the three shipped locales (a fourth is the "one PR" rehearsal referenced for chapter 104, not built here).
- Catalogs live in the repo; no TMS integration (Crowdin/Lokalise/Phrase) — the JSON format is TMS-ready by design but wiring one is out of scope.
- Per-locale OG on marketing only; no schema.org structured-data localization, no A/B locale variants, no domain-based locale routing — lesson 4 owns the marketing SEO surface.
- The in-memory store stands in for a database; no Postgres/Drizzle/auth (Unit 5 / Unit 8 own those).
- No Temporal arithmetic surface beyond the single relative-due day delta — lesson 5 of chapter 083 owns the rest.
- This lesson builds no feature and writes no code; the next-intl spine is wired in lesson 2, the formatter seam in lesson 3, the SEO surface in lesson 4.
