# Chapter 085 — Lesson 4 outline

## Lesson title

Chapter-outline title fits. Keep: **Emit hreflang, sitemap alternates, and per-locale OG**.
Sidebar (short): **hreflang and per-locale OG**.

## Lesson type

`Implementation` — the test-coder runs; the writer renders the Implementation section list.

## Lesson framing

The student installs the senior reflex that keeps a multi-locale SaaS from quietly losing its non-English organic traffic: the canonical is the locale-specific URL, `hreflang` is self-referential and bidirectional with an `x-default`, and the OG locale tag ships in the underscore form crawlers accept. They ship it by wiring each marketing page's `generateMetadata` to the provided `generateAlternates` / `bcp47ToOgLocale` seams — the payoff is understanding *why* each seam is shaped to make those guarantees hold by construction, so a fourth locale never reintroduces the silent ranking-killers. This is the chapter's last build slice; with it, locale routing (L2), tz-aware dates and currency (L3), and the public SEO surface are all live and confirmable in the inspector.

## Codebase state

### Entry
L3 complete. Every UI string flows through `t()`; the invoices list renders dates in the viewer's profile `timeZone`, amounts in the invoice's stored currency, and a relative-due column, all per-locale. The three catalogs (`en-US` / `en-GB` / `fr-FR`) are filled, `<html lang>` matches the URL prefix, the locale switcher works. The marketing pages (`home`, `pricing`, `features`) render translated copy but export **no `generateMetadata`** — `<head>` carries no `hreflang`, no locale-specific canonical, no OG locale tags. The inspector's source-HTML `hreflang` panel and sitemap-preview panel are still empty (the panels exist and work; they have nothing to read yet). The provided SEO seams (`lib/seo/alternates.ts`, `lib/seo/og-locale.ts`), the root `sitemap.ts`, `robots.ts`, the per-locale `opengraph-image.tsx`, and the `(app)/layout.tsx` noindex are all present and working but unconsumed by the marketing pages.

### Exit
The three marketing pages each export a `generateMetadata` that calls `generateAlternates(<path>, resolved)` for canonical + `languages`, pulls `title` / `description` from `marketing.meta` via `getTranslations`, and assembles `openGraph` with `locale: bcp47ToOgLocale(resolved)` plus `alternateLocale` over the other two locales. Rendered HTML on every marketing page now lists all three locales plus `x-default` (bidirectionally, self-referenced), the canonical of `/fr-FR/pricing` is `https://app.example.com/fr-FR/pricing`, `/sitemap.xml` carries one `<url>` per canonical path with a `<xhtml:link>` per locale, and `/fr-FR/`'s OG image renders French title text. The inspector's `hreflang` and sitemap panels are now populated. The project surface is feature-complete.

## Lesson sections

Implementation type → intro (no header) / **Your mission** / **Coding time** / **Moment of truth**.

### Goal + Finished result (intro, no header)

One-sentence goal in user terms: give the marketing surface its public SEO shape — every page emits bidirectional `hreflang` with `x-default`, a locale-specific canonical, and a per-locale OG image. Then a one-paragraph description of the result: view-source on any marketing page lists all three locales plus `x-default`; `curl /fr-FR/pricing | grep canonical` returns the locale-specific URL; `/sitemap.xml` shows one `<url>` per path with per-locale `<xhtml:link>`s; `/fr-FR/`'s OG image renders French title text. No figure needed — the artifacts are HTML tags; a small `Code` block of the rendered `<head>` excerpt (three `<link rel="alternate">` + `x-default` + canonical) carries it better than a screenshot. Optionally reference the inspector `hreflang` panel as the in-app confirmation surface.

### Your mission

Prose paragraph (no subsection headers, no implementation hints), weaving the senior decisions and traps:
- This is where i18n discipline becomes structural defense against silent SEO failures — the bugs that load fine in the browser and only show up as lost rankings weeks later.
- Canonical must be the **locale-specific** URL. Canonicalizing every locale to en-US tells Google "fr-FR is a duplicate, rank only en-US" and quietly kills French organic traffic — the single most common i18n ranking-killer.
- `hreflang` must be **self-referential** (every page lists its own locale) and **bidirectional** (every page lists every supported locale). A missing self-reference or one-sided declaration is silently dropped by Google.
- `x-default` is the fallback when no alternate matches the user's locale; the senior call for a SaaS is to point it at the strongest-market default locale (`/`).
- The OG locale tag uses the **underscore** form (`fr_FR`) where BCP 47 uses the hyphen (`fr-FR`); shipping the hyphen is silently treated as invalid by Facebook/LinkedIn.
- The seams (`generateAlternates`, `bcp47ToOgLocale`, the root sitemap, the per-locale OG image) are provided complete; the student's work is wiring each marketing page's `generateMetadata` to call them.
- Per-locale OG ships on marketing only (strong signal there, weak for authed pages); the authed surface declares `robots: { index: false }` and no `alternates` (provided on `(app)/layout.tsx`) — the discipline of declaring metadata even where the SEO surface is intentionally dark.
- The sitemap is one `<url>` per canonical path with alternates riding inside each entry (modern Next-native shape, not separate per-locale sitemaps), at the root because it is locale-agnostic.
- One discipline to name but not exercise: a not-yet-translated locale should not list a `hreflang` alternate to its URL (or that URL should `noindex`); this project ships all three translated, but the rule matters for a rolling rollout.
- **Out of scope (one line):** schema.org structured-data localization, A/B locale variants, domain-based locale routing, TMS integration.

Then the requirements **Checklist** (the only list in the section), each item one verifiable outcome, tagged `[tested]` / `[untested]`. The test-coder asserts only the `[tested]` items by parsing rendered HTML and the sitemap XML:

1. `[tested]` Every marketing page's rendered HTML lists all three locales plus `x-default`, bidirectionally, with the page's own locale self-referenced.
2. `[tested]` The canonical on each marketing page is that page's locale-specific URL (`/fr-FR/pricing` → `https://app.example.com/fr-FR/pricing`, not the default).
3. `[tested]` The OG locale tag is the underscore form for the current locale, with the other locales listed as `og:locale:alternate`.
4. `[tested]` `/sitemap.xml` carries one `<url>` per canonical path (`/`, `/pricing`, `/features`) with a `<xhtml:link rel="alternate" hreflang>` per locale inside each entry. (Sitemap is provided; the test still asserts the emitted XML.)
5. `[untested]` `/fr-FR/`'s OG image renders French title text (visual artifact — confirmed by hand against the inspector / fetched image).
6. `[untested]` The authed app surface declares `robots: { index: false }` and emits no `hreflang` alternates (provided on `(app)/layout.tsx`; orient only).

Note for the test-coder: assertions target observable HTML/XML output, not file paths or symbol names; failure messages should point at the likely cause (e.g. "canonical resolved to the default locale URL — check `generateAlternates` is called with the resolved locale").

### Coding time

One line directing the student to implement against the brief and the tests, then the hidden `<details>` solution walkthrough, organized as the files appear in the repo. The writer wraps the solution in `<details>` (collapsed). The student writes **only the three marketing `generateMetadata` exports**; everything else is provided and read for orientation.

Reference implementation and rationale:

1. **`lib/seo/alternates.ts` (provided — read, do not edit).** Present `generateAlternates(pathname, currentLocale)` returning `{ canonical, languages }`: canonical via `absolute(currentLocale, pathname)`, `languages` built as `Object.fromEntries(routing.locales.map(...))` plus `'x-default'` → default-locale URL, all through `getPathname` so the `'as-needed'` prefix is handled. Use `AnnotatedCode` to direct attention to the three load-bearing parts: (a) canonical is the locale-specific URL, never collapsed to default; (b) the `Object.fromEntries(routing.locales.map(...))` line is the structural guarantee that self-reference + bidirectionality hold for any locale set; (c) `x-default` keyed entry. Callout: `APP_URL` is a constant in this file (`https://app.example.com`), not validated env — production would read a validated `env.APP_URL`.

2. **`lib/seo/og-locale.ts` (provided — read, do not edit).** `bcp47ToOgLocale = (locale) => locale.replace('-', '_')`. Simple `Code` block. Callout: the underscore-vs-hyphen mismatch is the OG trap; this is the single converter.

3. **`app/[locale]/(marketing)/page.tsx` `generateMetadata` (student writes).** Full export: `await params`, re-validate via `hasLocale(routing.locales, locale)` falling back to `routing.defaultLocale` (`generateMetadata` runs where the param can be an unknown string), `getTranslations({ locale: resolved, namespace: 'marketing.meta' })` (the async sibling — required because `generateMetadata` is not a component), return `{ title, description, alternates: generateAlternates('/', resolved), openGraph: { title, description, locale: bcp47ToOgLocale(resolved), alternateLocale: routing.locales.filter((o) => o !== resolved).map(bcp47ToOgLocale) } }`. `AnnotatedCode` here (multiple parts: the `hasLocale` re-validation, the `generateAlternates` call, the `openGraph.locale` vs `alternateLocale` pairing). Rationale callouts: why re-validate even though the layout already did (each route entry resolves params independently); why `getTranslations` over `useTranslations` here; why `alternateLocale` filters out the current locale.

4. **`app/[locale]/(marketing)/pricing/page.tsx` and `features/page.tsx` `generateMetadata` (student writes).** Identical shape to home with the page's own path (`'/pricing'`, `'/features'`) and `marketing.meta` keys (`pricing.*`, `features.*`). Show with `CodeVariants` (tabs: Home / Pricing / Features) so the student sees the three are the same wiring with two values swapped — the repetition is the point (each page owns its metadata), and the seam is what keeps it DRY where it matters.

5. **`app/[locale]/(app)/layout.tsx` noindex (provided — orient only).** `generateMetadata` returns `{ robots: { index: false } }`, no `alternates`. Simple `Code` excerpt; callout: declaring metadata even where the surface is intentionally dark.

6. **`app/sitemap.ts` (provided — read, do not edit).** One entry per `PATHS` element (`/`, `/pricing`, `/features`); `url` is the default-locale absolute URL; `alternates.languages` mapped over `routing.locales` via `getPathname`. Root-level, not under `[locale]/`. `Code` block; callout: one-`<url>`-per-path with alternates inside (vs separate per-locale sitemaps), and why it lives at the root (locale-agnostic).

7. **`app/[locale]/(marketing)/opengraph-image.tsx` (provided — read, do not edit).** Reads `locale`, `getTranslations({ locale: resolved, namespace: 'marketing.meta' })`, returns `ImageResponse` rendering `t('home.title')`; `generateStaticParams` per locale. `Code` block (or excerpt); callout: this is why `/fr-FR/`'s OG renders French — the image itself is locale-aware.

Decision-rationale callouts to include: the duplicate-content trap (canonical must be locale-specific); how `Object.fromEntries(routing.locales.map(...))` makes self-reference + bidirectionality a structural guarantee rather than a per-page chore; the `x-default` → strongest-market default choice; OG underscore-vs-hyphen conversion; sitemap one-entry-per-path-at-root. For `alternates.languages`, the sitemap shape, and the OG locale form, **link to lesson 6 of chapter 084** rather than re-explaining.

No diagram needed — the surface is HTML tags and a flat seam call; prose plus annotated code carries it.

### Moment of truth

Test command: `pnpm test:lesson 4`. Expected output: green pass for the `hreflang`, canonical, OG locale, and sitemap assertions (`[tested]` items 1–4) — the tests parse rendered HTML and sitemap XML, asserting emitted tags, not source files. Show the expected passing terminal output as a `Code` block.

Then a by-hand **Checklist** for what the tests don't fully cover (student ticks as they go):
- [ ] The inspector source-HTML `hreflang` panel shows three alternates plus `x-default` on every marketing page, bidirectionally (en-US lists fr-FR and vice versa); `x-default` → `/`.
- [ ] `curl /fr-FR/pricing | grep canonical` returns the locale-specific URL, not the default.
- [ ] The inspector sitemap-preview panel shows one `<url>` per canonical path with three `<xhtml:link>` alternates each.
- [ ] `/fr-FR/`'s `og:image` points at the French OG image and the fetched image shows French title text; the authed surface carries `robots: { index: false }`.

Deliberate-misuse demos (single-flag, revert-after — the rehearsal of the failure the seam prevents):
- [ ] Temporarily set the canonical to the default URL across all locales → pages load fine but Google would treat non-default locales as duplicates (the silent ranking-killer). Revert after observing.
- [ ] Temporarily drop fr-FR from the en-US page's alternates → the `hreflang` panel shows the now one-sided link (en-US no longer lists fr-FR). Revert after observing.

Close with one line: this lesson completes the project surface — locale routing, tz-aware dates and currency, and the SEO surface are all live and confirmed.

## Scope

- Catalog wiring, request config, message loading — owned by **Lesson 2** of this chapter.
- Routing UI strings through `t()`, the pluralized counter, filling the catalogs — **Lesson 2**.
- Date formatting in profile tz, currency from data, relative-due column — **Lesson 3**.
- The mechanics of `alternates.languages`, `MetadataRoute.Sitemap`, and the OG `og:locale` underscore form as concepts — taught in **lesson 6 of chapter 084**; this lesson applies them, links rather than re-explains.
- CI smoke test asserting `<link rel="alternate">` matches `routing.locales` — **lesson 3 of chapter 097** (forward reference; mention only if it lands naturally).
- A PR adding a `'de-DE'` locale (the "one PR, not a refactor" payoff) — **chapter 104** (optional forward reference in the close).
