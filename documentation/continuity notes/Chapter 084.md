# Chapter 084 — Internationalization

## Lesson 1 — Keys, catalogs, and the no-concatenation rule

**Taught.** The three-party contract (engineer holds keys, catalog holds text, translator edits catalog); flat dot-namespaced keys (2–3 levels); named placeholders never positional; one JSON catalog file per locale with nested objects mirroring dot-paths; one key per meaning (not per English spelling); source-locale completeness as a build requirement with per-key fallback for other locales; `t.rich` as the correct shape for strings with embedded markup (previewed, not wired); plural/gender logic stays in the catalog not the component (previewed); `getTranslations` (async, server) vs. `useTranslations` (sync hook, client) call shapes introduced by name only.

**Cut.** Chapter outline's "single 50K-line catalog → split by namespace" watch-out was not taught; the lesson's code-conventions-aligned default (one file per locale) was taught instead, with a one-clause mention that per-namespace splitting is a supported option. The chapter outline's framing of `common.*` reuse as categorically wrong was reconciled to "meaning-not-spelling" with both over-sharing and mechanical-splitting shown as failure directions.

**Debts.**
- ICU MessageFormat syntax (`plural`, `select`, `selectordinal`, CLDR categories, `#`, `=0`/`=1` overrides) — Lesson 2.
- `Intl.*` formatters (`NumberFormat`, `DateTimeFormat`, `RelativeTimeFormat`, `Collator`, `ListFormat`, `DisplayNames`) — Lesson 3.
- Locale negotiation chain (URL → profile → cookie → `Accept-Language` → default), `users.locale` column — Lesson 4.
- `next-intl` full wiring (`defineRouting`, `createMiddleware`, `getRequestConfig`, `setRequestLocale`, `generateStaticParams`, `IntlMessages` global type, `useFormatter`/`getFormatter`, `NextIntlClientProvider` scoping) — Lesson 5.
- `t.rich` at depth (multiple tag patterns, provider, typing) — Lesson 5.
- `hreflang` / `alternates.languages` / per-locale SEO — Lesson 6.

**Terminology.**
- `t('namespace.leaf', { slot })` — the call shape used everywhere; library is `next-intl`.
- `useTranslations('namespace')` — sync hook for Client Components; `getTranslations('namespace')` — async for Server Components and outside the render tree.
- `t.rich(key, { tag: (chunks) => <Component>{chunks}</Component> })` — returns `ReactNode`; the no-concatenation shape for strings with embedded markup.
- Catalog path convention: `messages/en-US.json`, `messages/fr-FR.json` — full BCP 47 tag as filename, not bare language code.
- Key shape: `feature.context.role` (2–3 dot-separated levels); leaf names the role (`title`, `cta`, `count`), never the English text.
- `{slotName}` — named placeholder inside catalog values; `%s` / `{0}` are the rejected positional forms.
- Three-party contract mental model: "engineer → key → catalog ← translator; catalog → rendered string."
- Source locale: `en-US` (full BCP 47, not `en`).

**Patterns and best practices.**
- Every user-visible string goes through `t()`. String literals in JSX are a finding; machine-facing strings (logs, enum tokens, routes) stay as-is.
- `dangerouslySetInnerHTML` is never used for translated content; `t.rich` is the correct surface.
- Catalog files live in the repo (`messages/`), version-controlled, shipped in the build — not a remote service.
- Key reuse test: "Could a translator legitimately want these two to differ in some language?" Yes → separate keys; No → one key.
- `eslint-plugin-i18n-json` named as the lint guard for orphaned/missing keys (not set up in this lesson).

**Misc.**
- `{count}` treated as a plain named slot in this lesson; ICU plural syntax wrapping it is Lesson 2's subject. Later lessons must not assume the student understands `{count, plural, ...}` until after Lesson 2.
- Lesson deliberately shows `useTranslations`/`getTranslations` call shapes as "the form you'll write" without any provider or file-shape setup — that contract is Lesson 5's to fulfill. Later lessons should not reference `NextIntlClientProvider`, `defineRouting`, or `getRequestConfig` as if they were introduced here.
- Catalog-splitting (per-namespace files) is explicitly framed as non-default; Lesson 5 must not present it as the recommended shape.
- The outline said no `VideoCallout`; the built lesson includes one (Web Dev Simplified, "How To Handle Internationalization Like A Senior Dev", 39 min, videoId `VbZVx13b2oY`). Resourcer already placed it.
- The three-party contract diagram was implemented as a custom `ThreePartyContract` Astro component (`src/components/lessons/084/1/ThreePartyContract.astro`) rather than the outline's `ArrowDiagram`-in-`Figure` suggestion.

---

## Lesson 2 — ICU MessageFormat: plurals, select, gendered forms

**Taught.** ICU MessageFormat (MF1) for all three selector keywords — `plural` (cardinal counts with CLDR categories and exact-match overrides), `selectordinal` (ordinal positions), and `select` (free string enums) — including nested `select`-over-`plural` for gendered counts; `#` as the formatted selector token vs. `{count}` as the silent bug; `Intl.PluralRules` as the native engine under every plural message; `other` as the mandatory fallback; MessageFormat 2 named as the mechanical-migration future.

**Cut.** Inline ICU number/date formatting (`{x, number, ::currency/USD}`, `{d, date, ...}`) was named once and explicitly handed off to Lesson 3's `Intl.*` family — it was not taught. The chapter outline's `{#, number, ::compact-short}` override syntax was not mentioned. DB-stored / CMS-edited messages were named once as a write-time-validation concern only, not taught.

**Debts.**
- `Intl.PluralRules` as a standalone daily-reach formatter (shown here only as "the engine under `plural`") — Lesson 3.
- Inline ICU number/date formatting skeletons (`{amount, number, ::currency/USD}`) — deliberately deferred to `Intl.*` formatter coverage in Lesson 3; if Lesson 3 addresses ICU skeletons at all, it should frame them as the reach not to default to.
- `Intl.NumberFormat` locale-aware grouping (referenced via `#` token behavior) — Lesson 3.

**Terminology.**
- `{variable, plural, =0 {…} one {# …} other {# …}}` — ICU `plural` form; `variable` matches the key in `t(key, { variable })`.
- `{rank, selectordinal, one {#st} two {#nd} few {#rd} other {#th}}` — ordinal form; consults CLDR ordinal rules.
- `{variable, select, valA {…} valB {…} other {…}}` — free string enum; branches are literal matches.
- `#` — the formatted selector value inside a plural/ordinal branch (locale-aware number grouping); distinct from `{variableName}` which re-interpolates the raw value.
- CLDR plural categories: `zero`, `one`, `two`, `few`, `many`, `other` — the six named buckets; which fire and for which numbers is per-language.
- Exact matches: `=0`, `=1`, `=2` — tried before category keywords; for narrative wording overrides only, not as substitutes for category keywords.
- Cardinal number — a counting number (what `plural` branches on).
- Ordinal number — a positional number (what `selectordinal` branches on).
- MessageFormat 2 (MF2) — the next ICU syntax revision; not yet the `next-intl` default as of 2026.
- `Intl.PluralRules(locale).select(n)` — returns the CLDR category string for `n` in `locale`.

**Patterns and best practices.**
- Never write `count === 1 ? … : …` in component code; push plural logic into the catalog as an ICU `plural` string.
- Default to CLDR category keywords (`one`, `other`, …); use exact matches (`=0`, `=1`) only when the *wording itself* changes (e.g. "No messages" vs. "0 messages").
- `select` branches on a value the database already stores — never infer a `select` variant (e.g. gender) from a name or other heuristic.
- Nest `select` (lower-cardinality, outer) over `plural` (inner) for gendered counts; the engineer call stays flat: `t(key, { gender, count })`.
- `other` is mandatory in all three keywords; its absence is a parse error at message load time.
- Validate catalog ICU strings by running them through the actual runtime, not by reading them — JSON editors don't know ICU escaping rules.

**Misc.**
- `Intl.PluralRules` was introduced in this lesson only as the engine under `plural`; its standalone framing (including `{ type: 'ordinal' }`) belongs to Lesson 3. Lesson 3 should not assume prior standalone coverage.
- French plural categories were taught as two everyday categories (`one`, `other`) with a note that `many` exists but fires only for very large numbers — do not contradict this framing in later lessons.
- The lesson's running example uses `inbox.unread` (count message from Lesson 1) and `notification.newMessages` (gendered count). Later lessons can reference these key names as known examples.
- `next-intl` was confirmed to support all three keywords (`plural`, `selectordinal`, `select`); Lesson 5 should not re-introduce this as new information.

---

## Lesson 3 — The Intl.* formatter family

**Taught.** The shared `new Intl.X(locale, options)` → `.format(value)` shape; construct-once/reuse discipline (module-scope `Map` cache keyed by `locale:JSON.stringify(options)`); `Intl.NumberFormat` (currency/percent/decimal/compact/unit styles, `toFixed` bug class, NaN guard); `Intl.DateTimeFormat` Temporal interop (accepts `Instant` + plain types, rejects `ZonedDateTime` with `TypeError`); the `formatDate` body with required `locale` + `timeZone` arguments; `Intl.RelativeTimeFormat` (`numeric: 'auto'`, unit-picking from `Temporal.Duration`, stable-`now` as required argument); `Intl.Collator` (`numeric: true`, `sensitivity`, `usage`, `localeCompare` anti-pattern); `Intl.PluralRules` standalone call; `Intl.ListFormat` and `Intl.DisplayNames` named once; locale-is-a-contract (`'en'` is incomplete); audit-grep set.

**Cut.** Chapter outline's `format(zonedDateTime)` example was explicitly not reproduced (spec-incorrect — `ZonedDateTime` throws). `Intl.Segmenter` named once and deferred (Chapter 001 L4). `Intl.NumberFormat` V3 options (`roundingMode`, `trailingZeroDisplay`) not surveyed. Live-updating relative-time client island was described as the rule but not built. ICU number/date skeletons (`{amount, number, ::currency/USD}`) named once as the form not to default to, with explicit `Intl.*` call as the preferred reach.

**Debts.**
- `users.locale` column build-out and locale resolution chain — Lesson 4.
- next-intl `useFormatter`/`getFormatter` (the in-tree wrappers over these same constructors) — Lesson 5. `lib/format.ts` helpers are explicitly the standalone (outside-React-tree) form; Lesson 5 introduces the in-tree hook as the parallel front door.
- `t.rich` at depth — Lesson 5.
- `hreflang` / `alternates.languages` / per-locale SEO — Lesson 6.

**Terminology.**
- `lib/format.ts` — the standalone `Intl.*` helper module (pure, no React imports, runs on both sides); home for formatters used outside the React tree (utilities, tests, scripts).
- `getNumberFormatter(locale, options)` / `getDateFormatter(locale, options)` / `getCollator(locale, options)` — module-scope memo cache helpers; same pattern for all three, cache key `locale:JSON.stringify(options)`.
- `formatDate(value, { locale, timeZone, ...options }): string` — wrapper with both `locale` and `timeZone` required; `FormatDateValue = Temporal.Instant | Temporal.PlainDate`; accepts Temporal types directly, never `new Date()`.
- `formatRelative(instant, { locale, now }): string` — renders largest non-zero unit from `instant.since(now, { largestUnit: 'day' })`; `now` is a required argument (never read internally); tops out at `'day'` because `Instant.since` cannot balance into months/years without `relativeTo`.
- `UNITS` constant — `[['days','day'],['hours','hour'],['minutes','minute'],['seconds','second']] as const` — the unit-picker walk order in `formatRelative`.
- `Temporal.ZonedDateTime` → `.format()` throws `TypeError` — the single most surprising Temporal-interop fact; correct paths are `zdt.toLocaleString(locale, options)` (no `timeZone` option) or `formatter.format(zdt.toInstant())`.
- `dateStyle`/`timeStyle` preset vs. component options — mixing them throws; pick one mode per formatter.
- `currencyDisplay: 'narrowSymbol'` — senior default for compact UI (`'$'` not `'US$'`).
- `numeric: 'auto'` on `RelativeTimeFormat` — enables "yesterday"/"tomorrow"/"now" special-cases; `'always'` forces counted form.
- `sensitivity: 'base'` (collator) — senior default for search/equality; `'accent'` — senior default for sorting with diacritics.
- `numeric: true` (collator) — natural-numeric sort; senior default for filenames and version strings.
- CLDR — Unicode Common Locale Data Repository; the locale database bundled in the runtime.
- BCP 47 — `language-REGION` tag format (e.g. `en-US`); `'en'` alone is an incomplete contract.
- ISO 4217 — three-letter currency codes (`USD`, `EUR`); always data from the record, never a UI constant.

**Patterns and best practices.**
- Every currency, percent, and large-number render goes through `Intl.NumberFormat`. `value.toFixed(2)` + concatenated symbol is the bug class.
- Currency code is always read from the invoice/account record, never hard-coded as a string literal.
- `formatter.format(NaN)` returns localized `'NaN'` string — guard nullable/NaN inputs at the wrapper before reaching the formatter.
- Money is stored and computed as integer minor units (cents); divide by 100 only at display time.
- `formatDate` and `formatRelative` both require `locale` and (respectively) `timeZone` / `now` as explicit arguments — the structural defense that makes the Vercel-UTC silent-wrong bug unexpressible.
- Construct formatters once (module-scope cache); never inside a render loop, map, or sort callback.
- `String.prototype.localeCompare` inside a sort callback constructs a fresh collator per comparison (O(n log n) constructions); always build one `Intl.Collator` and pass `.compare` to `.sort`.
- Translatable lists → `Intl.ListFormat`; never `array.join(', ')`.
- Store and pass full BCP 47 tags (`'en-US'`) to every formatter; a bare `'en'` stored in `users.locale` is a code smell.
- `Intl.PluralRules` direct use is for non-text branching only (icons, CSS classes); if the variant is text, it belongs in the catalog as an ICU `plural` string (Lesson 2 rule).

**Misc.**
- `lib/format.ts` is explicitly not the `useFormatter`/`getFormatter` surface — that is Lesson 5's next-intl wiring. Do not present both as interchangeable in Lessons 4–6; they wrap the same constructors but serve different call sites (outside-tree vs. in-tree).
- The stable-`now` rule: a single `now` anchor is captured once per request and threaded as a prop; `formatRelative` never reads time internally. Live-ticking "X minutes ago" is a client island that re-renders on its own interval, not a tree-wide timer — not built in this lesson, but the rule is stated and must not be contradicted.
- `Intl.DateTimeFormat` built without `timeZone` silently defaults to the runtime zone (UTC on Vercel) — same bug class as Chapter 083 L3's no-arg trap. This lesson's required-argument wrapper is the direct payoff of that earlier promise; Lessons 4+ must not introduce any code path that omits `timeZone` from a date formatter.

---

## Lesson 4 — The locale resolution chain

**Taught.** The five-input resolution chain (URL prefix → profile `users.locale` → cookie `NEXT_LOCALE` → `Accept-Language` best-match → default), with full rationale for the priority order; RFC 4647 `Lookup` algorithm traced step-by-step for the `pt-BR` → `pt-PT` case; `@formatjs/intl-localematcher` `match()` as the 2026 ponyfill (`Intl.LocaleMatcher` still TC39 Stage 1); the `negotiateLocale` helper form for use outside middleware; `SUPPORTED_LOCALES as const` + derived `Locale` type + `z.enum` guard; `users.locale` Drizzle column; locale vs. timezone independence; the `NEXT_LOCALE` session-cookie write-only-on-override behavior (next-intl 4); `<html lang>` driven from the resolved value; `Content-Language` response header; geo-IP as the anti-primary anti-pattern.

**Cut.** Chapter outline's cognitive-load staging approach (build the chain incrementally, anonymous-visitor-first) was not followed — the lesson taught the full five-rung chain up front and used the interactive walker to sequence discovery. The `navigator.languages` plural form was omitted (not named even once, per outline scope). RTL `dir` attribute was named once alongside `<html lang>` without a helper function — no `isRtl(locale)` snippet shown. `request.geo.country` API shape was not shown (anti-pattern named as concept only).

**Debts.**
- `defineRouting`, `createMiddleware`, `getRequestConfig`, `setRequestLocale`, `generateStaticParams`, `NextIntlClientProvider`, typed `Link`/`redirect`/`usePathname`/`useRouter` — Lesson 5.
- `useFormatter`/`getFormatter` wiring — Lesson 5.
- next-intl `localeCookie` configuration option (`maxAge`, `localeCookie: false`) — Lesson 5 (behavior described here; config knob deferred).
- `hreflang` / `alternates.languages` / per-locale SEO — Lesson 6.

**Terminology.**
- Resolution chain — URL prefix → `users.locale` → `NEXT_LOCALE` cookie → `Accept-Language` best-match → default locale; first satisfied rung wins, chain stops.
- `SUPPORTED_LOCALES` — `as const` array in `lib/i18n.ts`; single source of truth for which locales exist.
- `DEFAULT_LOCALE` — `'en-US'`; the floor that guarantees resolution never returns empty.
- `Locale` type — `(typeof SUPPORTED_LOCALES)[number]`; union derived from the constant; add a locale once, type updates everywhere.
- `@formatjs/intl-localematcher` `match(requestedLocales, availableLocales, defaultLocale)` — returns one supported tag; takes already-parsed tag arrays (not raw header).
- `negotiator` package — parses raw `Accept-Language` header into ranked tag array; separate responsibility from `match()`.
- `negotiateLocale(acceptLanguage: string): Locale` — the outside-middleware helper combining `Negotiator` + `match()`.
- RFC 4647 `Lookup` — try exact tag, strip trailing subtag, retry, advance to next tag, return default if exhausted.
- q-value — weight in `Accept-Language` (`;q=0.9`); ranks the tag list.
- Session cookie — no `maxAge`; browser drops it when the window closes; next-intl 4's `NEXT_LOCALE` default.
- Ponyfill — explicitly imported polyfill that patches no globals.
- TC39 Stage 1 — "worth exploring," not shippable; context for `Intl.LocaleMatcher`.
- Hydration mismatch — server-rendered HTML disagrees with client's first render; caused here by driving `<html lang>` from cookie or `navigator.language` instead of the resolved value.
- RTL — right-to-left; `dir` attribute pairs with `<html lang>`; full handling out of scope.
- `Content-Language: fr-FR` — response header mirroring `<html lang>`; set in middleware.

**Patterns and best practices.**
- `lib/i18n.ts` owns `SUPPORTED_LOCALES`, `DEFAULT_LOCALE`, and the `Locale` type — one edit point when adding a locale.
- `z.enum(SUPPORTED_LOCALES)` on every profile-update schema; unsupported or bare-language tags are rejected at the write edge before reaching the column.
- `users.locale` stores the full BCP 47 tag (`'en-US'`), never the bare language code (`'en'`); bare `'en'` is a schema smell.
- `users.locale` and `users.timeZone` are two independent columns, two independent pickers; neither is inferred from the other.
- `<html lang>` is always driven from the middleware-resolved locale, never from the raw cookie or `navigator.language`.
- Locale is negotiated once, in middleware; no component, no formatter, no Server Action re-reads `Accept-Language` outside middleware. Any `Accept-Language` read outside middleware is a finding.
- The locale switcher does three things on selection: writes `NEXT_LOCALE` cookie, calls Server Action to update `users.locale` (if authenticated), navigates to the same path under the new locale prefix (not the home page).
- Geo-IP is never a primary signal; never auto-redirect anonymous users by IP.

**Misc.**
- The lesson is deliberately library-agnostic on next-intl internals — `createMiddleware`, `defineRouting`, `getRequestConfig` are not shown. Lesson 5 owns all next-intl config code. Referencing those APIs as if introduced here would be an error.
- `negotiateLocale` is framed as the outside-middleware form (Server Actions, CLIs, route handlers that need negotiation without the middleware-resolved value); it is not the everyday in-app reach.
- The locale-seeding at sign-up (`navigator.language` or the negotiated value) is mentioned but not built — it pairs with `users.timeZone` capture from Chapter 083; Lesson 5 or the project chapter wires it.
- next-intl 4's write-only-on-override cookie behavior is established as mental model here; the config surface (`localeCookie` option) is Lesson 5's.
- Three custom Astro components were built for this lesson: `SignalsFunnel` (five-signals-in-one-locale-out figure), `LookupTrace` (interactive step-by-step RFC 4647 Lookup trace for `pt-BR` → `pt-PT`), and `LocaleVsTimezone` (locale-vs-timezone independence figure) — all at `src/components/lessons/084/4/`. The outline called for `DiagramSequence` for the trace; `LookupTrace` is a custom interactive component instead.

---

## Lesson 5 — Wiring next-intl into Next.js 16

**Taught.** Six-file wiring that makes every L1–L4 rule executable: `i18n/routing.ts` (`defineRouting`), `i18n/navigation.ts` (`createNavigation`), `i18n/request.ts` (`getRequestConfig` — locale + catalog + timezone + `now` in one seam), `proxy.ts` (`createMiddleware`), `app/[locale]/layout.tsx` (`setRequestLocale` + `generateStaticParams` + `NextIntlClientProvider`), and `global.ts` (`AppConfig` module augmentation); `useTranslations` vs `getTranslations` (render-tree vs. outside-tree rule); `t.rich` for embedded markup; `useFormatter`/`getFormatter` as the in-tree front doors over `lib/format.ts` engines; `NextIntlClientProvider` payload scoping; type-safe keys via `AppConfig`.

**Cut.** Chapter outline's `localeCookie` configuration option (`maxAge`, `localeCookie: false`) deferred; it was promised in L4 continuity notes but did not land here. `i18n/formats.ts` shared presets named via `AppConfig.Formats` but not taught (project ch085 owns it). RTL `dir` helper function not built. next-intl SWC plugin / ICU pre-compilation not covered.

**Debts.**
- `generateMetadata` with `getTranslations`/`getFormatter` to produce localized page titles, `alternates.languages`, `hreflang` — Lesson 6.
- `i18n/formats.ts` shared formatter presets at depth — project ch085.

**Terminology.**
- Six-file map: `i18n/routing.ts` (locale list + prefix mode) → `i18n/navigation.ts` (locale-aware Link/redirect/usePathname/useRouter/getPathname) → `i18n/request.ts` (per-request locale + catalog + timezone + now) → `proxy.ts` (resolution chain runs here) → `app/[locale]/layout.tsx` (setRequestLocale + html lang + provider) → `global.ts` (AppConfig type augmentation).
- `defineRouting({ locales, defaultLocale, localePrefix })` — single source; `routing` object feeds both `createMiddleware` and `createNavigation`.
- `localePrefix: 'as-needed'` — default locale gets unprefixed URLs; other locales get prefixed; the chapter's chosen mode.
- `createNavigation(routing)` — produces locale-aware `Link`, `redirect`, `useRouter`, `usePathname`, `getPathname`; imports inside `app/[locale]/` always come from `@/i18n/navigation`, never `next/link` or `next/navigation`.
- `usePathname()` from `@/i18n/navigation` — returns pathname **without** the locale prefix; the primitive the locale switcher uses to re-prefix the current path.
- `createMiddleware(routing)` — the default export form (i18n-only); named `proxy` function form for composition with auth + CSP headers.
- `getRequestConfig` — runs once per request; returns `{ locale, messages, timeZone, now }`.
- Dynamic import `(await import('../messages/${locale}.json')).default` — loads only the active locale's catalog; a static import would ship all catalogs to every request.
- `setRequestLocale(locale)` — writes locale to per-request store so `useTranslations`/`useFormatter` resolve without a dynamic `headers()` read, re-enabling static rendering; must be called before any next-intl call in the file; required in every `page.tsx` and `layout.tsx` under `app/[locale]/`.
- `generateStaticParams()` — maps `routing.locales` to `{ locale }` objects; tells Next.js which locales to prerender at build time.
- `useTranslations(namespace)` — sync, works in both Server and Client Components; `getTranslations(namespace)` — async sibling for `generateMetadata`, Server Actions, route handlers (outside the render tree).
- `t.rich(key, { tag: (chunks) => <Component>{chunks}</Component> })` — returns `ReactNode`; correct surface for strings with embedded markup (no `dangerouslySetInnerHTML`).
- `useFormatter()` — in-tree hook; `locale` and `timeZone` auto-wired from `getRequestConfig`; `getFormatter()` — async sibling for outside-tree call sites.
- Two front doors rule: `useFormatter`/`getFormatter` inside the render tree; `lib/format.ts` outside it. Same `Intl.*` constructors underneath.
- `NextIntlClientProvider messages={pick(messages, ['namespace'])}` — scoped provider; `messages={null}` = full opt-out; bare provider without `messages` prop in next-intl v4 inherits the entire catalog (the payload bug).
- `AppConfig` — `declare module 'next-intl'` augmentation with `Messages` (keys against en-US.json), `Formats` (shared presets), `Locale` (union from routing.locales); v4 pattern replacing deprecated `IntlMessages` global interface.
- `render tree` — the components React renders for a page; `generateMetadata`, Server Actions, route handlers run outside it.
- `catalog` — per-locale JSON file of translations (`messages/fr-FR.json`).
- `matcher` — proxy config path pattern; excludes API routes, `_next`, `_vercel`, and paths with file extensions.

**Patterns and best practices.**
- Every user-visible string through `t()` or `t.rich`; string literals in JSX are a finding.
- Every number, date, relative-time in the render tree through `useFormatter` or `getFormatter`; bare `Intl.X()` or `.toLocaleString()` in a component is a finding.
- Every navigation import inside `app/[locale]/` from `@/i18n/navigation`; `next/link` import in a localized route is a review finding.
- Every `page.tsx` and `layout.tsx` under `app/[locale]/` starts with `setRequestLocale(locale)` — nested pages included; skipping silently converts the route to dynamic with no error or warning.
- `NextIntlClientProvider` is scoped to the smallest subtree that needs client messages; `pick()` the namespaces; Server Components never need the provider.
- `i18n/` directory lives at project root beside `app/`, not under `lib/`; `lib/i18n.ts` holds domain locale facts (`SUPPORTED_LOCALES`, `DEFAULT_LOCALE`, `Locale` type); `i18n/` files hold framework plumbing that imports from `lib/i18n.ts`.
- Locale list declared once in `lib/i18n.ts`; `routing` imports it; adding a locale is one edit.
- In proxy composition order: i18n negotiation/rewrite runs first; auth gate and CSP headers layer onto the response it returns.

**Misc.**
- next-intl v4 `AppConfig` (not the deprecated v3 `IntlMessages` global interface) is the type-safety pattern; L1 continuity notes listed `IntlMessages` as the upcoming pattern — that note is superseded; the `AppConfig` pattern is the canonical form.
- Root-layout snippet in this lesson shows a bare `<NextIntlClientProvider>` for simplicity; the lesson explicitly flags it as not the production shape. Project ch085 will implement scoped providers.
- `proxy.ts` accepts either `export default createMiddleware(routing)` (i18n-only) or `export function proxy(request)` (composed); the code conventions' "must be named `proxy`" for default export is overstated — both forms are valid in Next.js 16.
- `users.timeZone` from ch083 L3 is attached in `getRequestConfig` as the one structural seam; every `format.dateTime` downstream gets it without a manual argument; anonymous requests fall back to `'UTC'`.
- `now` is a single per-request anchor from `getRequestConfig`; `format.relativeTime` reads it, ensuring server render is deterministic and hydration-safe (the stable-`now` rule from L3 kept structurally).
- `<html lang>` is driven from the resolved URL param in the layout, never from the cookie (would mismatch the URL and break hydration).
- The lesson owns only the i18n layer of `proxy.ts` and the seam where auth/CSP slot in; ch081 and ch033/ch054 own the auth gate and security header code.

---

## Lesson 6 — hreflang, per-locale canonicals, and SEO

**Taught.** The three signals that make translated pages discoverable in their own language SERPs — `hreflang` alternates (declare language-sibling cluster), per-locale self-canonicals (each variant is its own authority), and per-locale sitemap entries — plus OG locale signals and locale-aware OG images; the three `hreflang` rules Google enforces (self-reference mandatory, bidirectionality mandatory, `x-default` for unmatched languages); a `lib/seo.ts` helper (`generateAlternates`) that guarantees all three rules by construction; the anti-pattern of canonicalizing every locale to the default (silently deletes translated pages from search); the untranslated-content decision (marketing → `noindex`; app → fall through, don't list); the `robots.txt`-vs-`noindex` distinction; Next.js 16 streaming metadata behavior and its implications for the "must be in `<head>`" myth.

**Cut.** Chapter outline scoped sitemap index files (per-locale child sitemaps), schema.org structured-data localization, A/B-testing locale variants, region-vs-language targeting at depth (`en-US`/`en-GB`/`en-AU`), and RTL/`dir` (named in L4) — none taught. The Playwright/CI hreflang smoke-test was named as the validation home but deliberately not built (Playwright arrives ch090). The `localeCookie` config option promised in L4 continuity notes was not fulfilled here either (still unresolved debt).

**Debts.**
- Playwright-based CI smoke test asserting symmetric `hreflang` head tags — Chapter 090 / CI testing chapter.
- Wiring `generateAlternates`, `bcp47ToOgLocale`, per-locale `sitemap.ts`, and per-locale `opengraph-image.tsx` into the running invoices app — Chapter 085 L4.

**Terminology.**
- `hreflang` — `<link rel="alternate" hreflang="fr-FR" href="…">` head tag declaring a page's language/region alternates; name fuses `href` + `lang`.
- `x-default` — pseudo-locale value in `hreflang` declaring the fallback URL for users whose language matches no alternate; this chapter points it at the default-locale URL.
- `alternates.languages` — the `generateMetadata` field Next.js reads to emit the full `hreflang` tag set; keys are BCP 47 locale tags plus `'x-default'`.
- `alternates.canonical` — the `generateMetadata` field declaring this page's authoritative URL; for locale variants this must be the variant's own localized URL.
- `generateAlternates(locale, href)` — helper in `src/lib/seo.ts`; calls `getPathname` over `routing.locales` to build the complete, symmetric `{ canonical, languages }` object; satisfies all three `hreflang` rules by construction.
- `bcp47ToOgLocale(locale)` — helper in `src/lib/seo.ts`; converts `fr-FR` → `fr_FR` (hyphen to underscore); the one deliberate exception to the full BCP 47 tag rule, isolated in one place.
- `og:locale` / `og:locale:alternate` — Open Graph fields read by social platforms; use underscore form (`fr_FR`), not BCP 47 hyphen form; always derived through `bcp47ToOgLocale`.
- `SERP` — search engine results page.
- `MetadataRoute.Sitemap` — Next.js type for a typed sitemap; each entry can carry `alternates.languages` for per-locale sibling links emitted as `<xhtml:link rel="alternate" hreflang>`.
- `<xhtml:link rel="alternate" hreflang>` — the sitemap-embedded variant of the `hreflang` declaration, inside each `<url>` entry.
- `htmlLimitedBots` — Next.js config list of User-Agent patterns that receive blocking `<head>` metadata instead of streamed body-appended tags.
- `hreflang` cluster — the set of language-variant URLs Google treats as one logical page once bidirectional `hreflang` links are declared; ranking authority is pooled across the cluster.
- Marketing-vs-app dichotomy — public pages (landing, `/pricing`, `/features`) get the full `hreflang`/sitemap/OG-image surface and are indexable; authenticated app routes (`/dashboard`, `/settings`) are `noindex` and their SEO surface is dark.

**Patterns and best practices.**
- Every marketing page calls `alternates: generateAlternates(locale, href)` verbatim — no overriding `canonical` separately; doing so is the canonical-collapse bug.
- `lib/seo.ts` is the single home for `generateAlternates` and `bcp47ToOgLocale`; never hand-type `hreflang` alternates or OG locales inline on a page.
- Sitemap and `generateMetadata` both build URLs with `getPathname` from `@/i18n/navigation` — the single prefix-mode source of truth; they can never disagree about where a locale lives.
- Sitemap URLs must be absolute (no `metadataBase` in `sitemap.ts`); prepend `BASE` constant, still use `getPathname` for the path portion.
- `MARKETING_PATHS` constant in `sitemap.ts` enumerates only public routes; authenticated routes are absent by design.
- Untranslated marketing page → `metadata.robots = { index: false }` (noindex) until catalog ships; never use `robots.txt` to block indexing (Google can't see `noindex` on a page it can't crawl).
- Untranslated app route → fall through to source-locale content via next-intl per-key fallback; do not list the URL as a `hreflang` alternate while content is actually English.
- Publicly indexable locales documented in `lib/i18n.ts` beside `SUPPORTED_LOCALES` (e.g. a "soft-launch locales" set) — one place answers "which locales are indexable now?"
- `metadata` and `generateMetadata` are Server-Component-only exports; hand-injecting `<link rel="alternate">` from a Client Component is the review smell (no streaming guarantee, no `htmlLimitedBots` handling).
- Body-appended `hreflang` tags under Next.js 16 streaming are correct behavior, not a bug; do not disable streaming to "fix" them.
- Per-locale OG images (`opengraph-image.tsx`) on marketing routes; default-locale OG image inside the authenticated app.

**Misc.**
- `generateAlternates` returns relative paths; `metadataBase` (from ch034) resolves them to absolute URLs in `generateMetadata`. `sitemap.ts` has no `metadataBase` — absolute URLs required there.
- The `localeCookie` configuration debt from L4 was not resolved in L5 or L6; it remains open for a future lesson or the project chapter.
- Chapter 085 L4 ("Emit hreflang, sitemap alternates, and per-locale OG") is the assessment where students wire all three signals into the running invoices app; do not pre-empt that deliverable.
- The CI smoke test for hreflang (fetch rendered HTML per locale, assert symmetric `<link rel="alternate" hreflang>` tag count in head) is named as the validation home; Playwright arrives ch090 and is the tool for building it.
