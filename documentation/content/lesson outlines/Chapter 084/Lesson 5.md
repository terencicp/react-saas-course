# Lesson 5 outline — Wiring next-intl into Next.js 16

## Lesson title

- **Title:** Wiring next-intl into Next.js 16
- **Sidebar label:** Wiring next-intl

## Lesson framing

This is the chapter's **Setup/Wiring** lesson. Lessons 1–4 installed the discipline as *rules with call shapes the student couldn't yet run*: keys + catalogs (L1), ICU MessageFormat (L2), the standalone `Intl.*` family + `lib/format.ts` (L3), the locale resolution chain + `users.locale` + `negotiateLocale` (L4). The student has been writing `t('namespace.leaf')`, `useTranslations`/`getTranslations`, and `format.*` call shapes on faith. **This lesson is the payoff: every prior promise lands as a concrete file the student can point to.** Frame the whole lesson as "here is where each rule you already learned actually lives."

The senior question the lesson answers (state it implicitly in the intro, not as a heading): *which library lands the i18n discipline in Next.js 16's App Router with the least drift, and what is the minimum set of files that wires it?* Answer: **next-intl v4**, six files. The lesson's job is not to re-teach i18n concepts — it is to show the wiring that makes the concepts executable, and to install the two rules unique to the wiring layer that have no analog in L1–L4: **`setRequestLocale` as the static-rendering gate**, and **`AppConfig` module augmentation as the compile-time key/locale safety net**.

Pedagogical spine — **follow one request through the six files in order**. The student already knows the resolution chain (L4) as an abstract priority list; here they watch it run as `createMiddleware` in `proxy.ts`, hand off to `getRequestConfig` in `i18n/request.ts`, surface in `app/[locale]/layout.tsx` via `setRequestLocale`, and reach components as `useTranslations`/`useFormatter`. The request-flow framing turns six disconnected config files into one legible pipeline. This is the dominant cognitive-load move: a beginner meeting next-intl sees six files and a dozen exports and freezes; sequencing them as one request's journey makes the shape inevitable.

Minimize new mechanics. The student already owns the *behavior* of negotiation (L4) and the *behavior* of formatters (L3); do not re-derive either. Spend the budget on (1) the file map, (2) `setRequestLocale` + `generateStaticParams` (genuinely new, genuinely error-prone), (3) `useTranslations` vs `getTranslations` and `useFormatter`/`getFormatter` as the *in-tree front doors* over engines they already know, (4) `NextIntlClientProvider` scoping, (5) the `AppConfig` type. Everything else is glue shown once.

Three research-driven corrections to the chapter outline that this outline bakes in (downstream agents must follow these, not the chapter-outline text):
1. **Files live in `i18n/` (project root, beside `app/`), not `lib/i18n/`.** This matches the code conventions and current next-intl docs. The chapter outline's `lib/i18n/routing.ts` paths are superseded.
2. **Type safety in next-intl v4 is `declare module 'next-intl'` with an `AppConfig` interface (`Messages`, `Formats`, `Locale`), not the global `IntlMessages` interface.** `IntlMessages` is the deprecated v3 pattern; the chapter outline and the code conventions both still name it. Teach `AppConfig`. Note this divergence inline so it is not mistaken for an error.
3. **`proxy.ts` accepts a default export *or* a named `proxy` function.** The code conventions' "must be named `proxy`, not default" is overstated — Next.js 16 dispatches on either. next-intl's standalone setup is `export default createMiddleware(routing)`. The named-`proxy`-function form is the *composition* shape (when wrapping i18n + auth into one file). Teach both honestly: default export for the i18n-only file, named function when composing.

Tone: adult, terse, senior. No celebration. This stack ships single-locale at launch (chapter thesis: "i18n as discipline before feature"), so frame the wiring as the one-time cost that makes the *second* locale a one-PR change.

---

## Lesson sections

### Introduction (no heading)

Warm, brief. Land three beats:
1. **Callback to the running thread.** "For four lessons you've written `t('invoice.pastDue.title')`, `useTranslations`, `format.dateTime(...)` — call shapes with nothing behind them. This lesson wires the engine." Name the four prior lessons' contributions in one sentence each so the student feels the debt being paid.
2. **The library choice, decided fast.** next-intl v4 is the 2026 default: native Server-Component support, App-Router-shaped routing primitives, ICU built in (the L2 syntax runs unchanged), `Intl.*` wrappers (the L3 engines, wired to request locale + tz), build-time key typing, Next.js 16 compatible, ~2KB client runtime. One-line dismissal of alternatives with the *reason* each loses: `react-intl`/FormatJS (full ICU but no App-Router routing primitive), `next-i18next` (Pages-Router-shaped), Lingui (heavier compile step). Decisions-before-syntax: name the threshold, don't comparison-shop.
3. **What you'll have built by the end.** Six files; a request that negotiates a locale, loads a catalog, and renders translated, locale-formatted output; type-safe keys. Preview the file map.

Use `Term` for **next-intl** (define: "the i18n library this stack wires for Next.js's App Router; v4 as of 2026") on first mention.

### The six files, one request

The orienting map for the whole lesson. **Lead with a diagram, then a `FileTree`.**

**Diagram — request flow through the six files.** Build it as a `DiagramSequence` (5–6 steps), one request walking the pipeline, highlighting the active file at each step. Pedagogical goal: collapse "six config files" into "one request's path," so every later section slots into a place the student already has a mental slot for.
- Step 1 — request `GET /dashboard` hits `proxy.ts`; `createMiddleware(routing)` reads URL prefix / cookie / `Accept-Language` (callback: "the L4 chain, now running"), picks a locale, rewrites to the resolved form.
- Step 2 — `i18n/routing.ts` is the config `createMiddleware` was built from (`locales`, `defaultLocale`, `localePrefix`). Show it as the shared source feeding both middleware and navigation.
- Step 3 — `i18n/request.ts` (`getRequestConfig`) runs per request: takes the resolved locale, loads `messages/{locale}.json`, attaches `timeZone` (from `users.timeZone`, L4/ch083) and `now`.
- Step 4 — `app/[locale]/layout.tsx` calls `setRequestLocale(locale)`, sets `<html lang>`, optionally mounts `NextIntlClientProvider`.
- Step 5 — a Server Component calls `useTranslations`/`useFormatter`; output is translated + locale-formatted.
- Step 6 (optional) — a Client Component inside the provider reads the same `t`/`format` synchronously.
Render the boxes as labeled HTML nodes (file name + one-line role) with an `is-on` highlight per step, matching the `DiagramSequence` example pattern. Cap height ~500px. Do **not** wrap in `<Figure>` (DiagramSequence is self-carded).

Consider `RequestTrace` *instead* only if the team wants the canonical App-Router trace styling — but it is tuned for render/wire/hydrate phases, not a config-file pipeline, so `DiagramSequence` with custom nodes is the better fit here. Recommend `DiagramSequence`.

**`FileTree`** immediately after, the static reference:
```
i18n/
  routing.ts        defineRouting — locale list, default, prefix mode
  navigation.ts     createNavigation — locale-aware Link/redirect/usePathname/useRouter
  request.ts        getRequestConfig — per-request messages, timeZone, now
proxy.ts            createMiddleware(routing) — runs the resolution chain
app/[locale]/
  layout.tsx        setRequestLocale + <html lang> + provider
messages/
  en-US.json        catalogs from Lesson 1
  fr-FR.json
  de-DE.json
global.ts           AppConfig augmentation — type-safe keys
```
Seven entries (six wiring files + the catalogs dir + `global.ts` for typing). Keep the one-line role annotations — they double as the section table of contents.

**Tooltips this section:** `Term` for **middleware** ("code that runs before a route renders; in Next.js 16 the file is `proxy.ts`"), **prerender** ("Next.js builds the HTML at build time, not per request").

### Routing config: `defineRouting`

The shared source of truth. Short section — it is one object.

`Code` block (simple, no annotation needed — it's a flat config object):
```ts
// i18n/routing.ts
import { defineRouting } from 'next-intl/routing';
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from '@/lib/i18n';

export const routing = defineRouting({
  locales: SUPPORTED_LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: 'as-needed',
});
```
Callback to L4: `SUPPORTED_LOCALES`/`DEFAULT_LOCALE` already live in `lib/i18n.ts` (L4 established them as `as const` + the `Locale` type). `routing` consumes them — single source, no second list. State the rule: the locale list is declared once in `lib/i18n.ts`; `routing` imports it; middleware and navigation both derive from `routing`. Adding a locale is one edit.

**`localePrefix` modes** — the one real decision in this file. Present as a tight three-row comparison (a small `Code` block or a 3-row table, not a full `CodeVariants` — the difference is URL shape, not code shape):
- `'always'` — every URL prefixed (`/en-US/dashboard`, `/fr-FR/dashboard`); deterministic, ugly default-locale URLs; reach when multi-locale from day one.
- `'as-needed'` — default locale unprefixed (`/dashboard`), others prefixed (`/fr-FR/dashboard`); the chapter default; best when one market dominates.
- `'never'` — no prefixes, locale entirely from cookie; SEO suffers (no per-locale URL for `hreflang`, ch084 L6), rarely correct.
Pick `'as-needed'` and say why: matches the single-locale-launch thesis (the default market gets clean URLs) while keeping per-locale URLs available for L6's SEO surface. One watch-out, inline: with `'as-needed'`, a `<Link locale="fr-FR">` still renders a prefixed href even from the default locale — it has to, so a stale cookie gets corrected before the unprefixed route loads. (Sourced from next-intl docs; prevents a "why is my link prefixed" confusion.)

### Locale-aware navigation: `createNavigation`

Why `next/link` is wrong inside `app/[locale]/` and what replaces it.

Open with the failure: a plain `<Link href="/settings">` from `next/link` drops the locale prefix — a French user on `/fr-FR/dashboard` clicking it lands on the default-locale `/settings`, silently switching language. The fix is next-intl's navigation factory.

`Code` block:
```ts
// i18n/navigation.ts
import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
```
Explain each export in one clause: `Link` (locale-prefix-aware `<a>`), `redirect` (server/action redirect that keeps the locale), `usePathname` (returns the path *without* the locale prefix — so the locale switcher can re-prefix it, callback to L4's "switch on a deep route preserves the path"), `useRouter` (programmatic nav), `getPathname` (build a prefixed href without navigating).

State the rule (matches code conventions, restate as a finding): inside `app/[locale]/**`, every import is from `@/i18n/navigation`, never `next/link` / `next/navigation`. Mention the L4 locale-switcher now has its primitives: it called a Server Action to write `users.locale` + the cookie (L4), and uses `usePathname` + `router.replace` (or `<Link locale=...>`) to re-prefix the current path. Do not re-build the switcher UI (L4 owns it) — just close the loop on which primitive does the navigation half.

`CodeTooltips` candidate: on `usePathname` in the snippet, tooltip "returns the pathname **without** the locale prefix" — the single most surprising behavior, worth flagging in place.

### The proxy: running the resolution chain

Where the L4 chain executes. This is the file the student has been promised since L4.

Two shapes, taught with `CodeVariants` (this is exactly the before/after-style A/B the component is for):
- **Variant "i18n only"** — the next-intl standalone form:
  ```ts
  // proxy.ts
  import createMiddleware from 'next-intl/middleware';
  import { routing } from '@/i18n/routing';

  export default createMiddleware(routing);

  export const config = {
    matcher: '/((?!api|_next|_vercel|.*\\..*).*)',
  };
  ```
  Prose: "If i18n were the only thing running before routes, this is the whole file — a default export." Explain the `matcher` in one line (skip API, framework internals, and files-with-extensions; run on page routes).
- **Variant "composed with auth"** — the real stack form, a named `proxy` function:
  ```ts
  // proxy.ts
  import createMiddleware from 'next-intl/middleware';
  import { routing } from '@/i18n/routing';
  import type { NextRequest } from 'next/server';

  const handleI18n = createMiddleware(routing);

  export function proxy(request: NextRequest) {
    // i18n negotiation + rewrite runs first
    const response = handleI18n(request);
    // auth gate, security headers (ch081) layer onto `response`
    return response;
  }

  export const config = {
    matcher: '/((?!api|_next|_vercel|.*\\..*).*)',
  };
  ```
  Prose: "Real apps run i18n *and* an auth gate *and* CSP headers in one proxy. next-intl's middleware is a function you call; wrap it in a named `proxy` and layer the rest onto its response."

Then resolve the export confusion explicitly (this is the research correction): Next.js 16's `proxy.ts` dispatches on **either** a default export **or** a named `proxy` function. The i18n-only file uses `export default`; the composed file uses `export function proxy`. The order matters — i18n negotiation/rewrite runs *before* the auth gate so downstream code sees a resolved, prefixed URL. Cross-reference ch081 (`proxy.ts` already hosts the security-header / CSP logic) and the ch033/ch054 middleware-composition pattern as the place auth slots in — but **do not** write the auth or CSP code here; this lesson owns only the i18n layer and the seam where the others attach.

Restate the rule from L4: negotiation happens **once**, here. No component, formatter, or action re-reads `Accept-Language`. The `Accept-Language`-outside-`proxy.ts` finding (L4) is enforced by this file existing.

`Term`: **matcher** ("the path pattern that decides which requests the proxy runs on").

### Per-request config: `getRequestConfig`

The seam where locale, catalog, and timezone converge. The conceptual heart of the wiring.

`AnnotatedCode` — this block does three distinct jobs and the student's attention must be directed to each in turn:
```ts
// i18n/request.ts
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';
import { getUserTimeZone } from '@/lib/session';
import type { Locale } from '@/lib/i18n';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = (routing.locales.includes(requested as Locale)
    ? requested
    : routing.defaultLocale) as Locale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
    timeZone: await getUserTimeZone(),
    now: new Date(),
  };
});
```
Steps:
1. `{1-5}` "`getRequestConfig` runs once per request; `requestLocale` is the value the proxy already resolved." (callback: the chain ran in `proxy.ts`; this reads its output.)
2. `{6-9} "routing.locales.includes"` — validate-and-fall-back: an unknown locale floors to the default. Same guard shape as L4's negotiation, here as the last line of defense.
3. `"import(\`../messages/${locale}.json\`)"` color green — **dynamic import**, the load-bearing perf move: only the active locale's catalog is bundled into the response, not all of them. Callback to L1 (catalogs are `messages/{locale}.json`, one file per locale).
4. `"timeZone"` color blue — the cross-chapter seam: `users.timeZone` (ch083 L3 / ch084 L4) is attached here so every `format.dateTime` downstream gets it without a manual arg. State the rule: this is the *only* place tz is wired into the tree; the L3 "every date formatter requires `timeZone`" promise is kept structurally. Anonymous requests fall back to `'UTC'` (or org default).
5. `"now"` — a single per-request `now` anchor (callback to L3's stable-`now` rule, which forbade reading time inside `formatRelative`); `format.relativeTime` reads this, so server renders are deterministic and hydration-safe.

Drive home the one-seam idea: locale + catalog + tz + now all originate here; downstream code never re-derives any of them. This is the file that makes "every render reads the resolved locale" (L4) and "every formatter gets the profile tz" (L3) true by construction.

### Static rendering: `setRequestLocale` and `generateStaticParams`

**The genuinely new, genuinely error-prone rule of the lesson.** Give it room — this is where production sites silently regress.

Motivate with the failure first (decisions-before-syntax). Next.js 16 prefers static rendering. next-intl normally reads the locale dynamically (via request headers), which forces a page to render per-request — fine for the authenticated app, a real Lighthouse/CDN regression for public marketing pages that *should* be static. The fix is a per-request locale store you opt into.

`AnnotatedCode` on the root locale layout:
```tsx
// app/[locale]/layout.tsx
import { setRequestLocale } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';
import { routing } from '@/i18n/routing';
import { notFound } from 'next/navigation';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as Locale)) notFound();

  setRequestLocale(locale);

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
```
Steps:
1. `"generateStaticParams"` green — "tells Next.js which locales to prerender; without it only the default builds." Maps over `routing.locales` — single source again.
2. `"const { locale } = await params"` — params is a Promise in Next.js 16 (callback to the App Router params-await convention the student has met); validate, `notFound()` on an unsupported segment.
3. `"setRequestLocale(locale)"` orange — **the rule**. Writes the locale to a per-request store so downstream `useTranslations`/`useFormatter` resolve *without* a dynamic `headers()` read, re-enabling static rendering. Must be called **before** any next-intl call in the file.
4. `"<html lang={locale}>"` — callback to L4 (the load-bearing a11y/SEO hook), driven from the resolved param, never the cookie.
5. `"NextIntlClientProvider"` — the client bridge; detailed in the next section. Here just note it wraps the tree.

**The rule, stated sharply and once more:** every `page.tsx` and every `layout.tsx` under `app/[locale]/` starts with `setRequestLocale(locale)` — nested pages too, not just the root layout. Skipping it converts the route to dynamic *silently* — no error, no warning, only a perf regression invisible at code review. This is the single most common next-intl production mistake; the defense is the blanket rule, not vigilance.

**Static-vs-dynamic decision**, brief: public marketing → static + `setRequestLocale` + per-locale prerender → CDN-cacheable; authenticated app → dynamic anyway (auth reads cookies), so `setRequestLocale` is still called but the static win doesn't apply. Rule: never call `headers()`/`cookies()` in a public layout without meaning to opt out of static.

**Exercise — `Sequence`.** Order the top-of-layout operations correctly: `await params` → validate / `notFound` → `setRequestLocale(locale)` → render with `useTranslations`. Goal: cement that `setRequestLocale` precedes any translation call and follows param resolution. A fixed code block above the steps showing the layout skeleton with the bodies blanked. Small, high-value, directly targets the ordering bug.

`Term`: **static rendering** ("HTML built once at build time and served from cache, vs. dynamic per-request rendering").

### Reading translations: `useTranslations` vs `getTranslations`

The two front doors over the L1/L2 engine. The student knows the call shapes (L1 introduced both by name); here, *when* each.

Frame as one rule: **`use*` inside the render tree, `get*` outside it.** Both speak the same key (L1) and run the same ICU engine (L2).

`CodeVariants` (two/three tabs — same string, different call site):
- **Server Component** — `useTranslations` works here too (sync, despite the `use` prefix), the default for most rendering:
  ```tsx
  import { useTranslations } from 'next-intl';
  export function PastDueBadge() {
    const t = useTranslations('invoice.pastDue');
    return <span>{t('title')}</span>;
  }
  ```
- **Client Component** — identical hook, identical call:
  ```tsx
  'use client';
  import { useTranslations } from 'next-intl';
  export function DismissButton() {
    const t = useTranslations('inbox.unread');
    return <button>{t('dismiss')}</button>;
  }
  ```
  Prose: "Same hook on both sides of the boundary — translations cross it transparently (the ch030 boundary, unchanged)."
- **Outside the tree** — `generateMetadata`, Server Actions, route handlers are async and not components, so the hook can't apply; use the async sibling:
  ```ts
  import { getTranslations } from 'next-intl/server';
  export async function generateMetadata() {
    const t = await getTranslations('invoice.meta');
    return { title: t('title') };
  }
  ```
  Prose: callback forward to L6 — `generateMetadata` is exactly where L6's localized titles come from.

**`t.rich` for embedded markup** — the L1 preview, now wired. Subsection or tight block. The message carries `<tag>…</tag>`; the call supplies the component:
```tsx
t.rich('terms.line', {
  link: (chunks) => <Link href="/terms">{chunks}</Link>,
});
// message: "By signing up, you agree to our <link>Terms</link>."
```
Returns a `ReactNode`. State the rule (matches conventions): this replaces the "split into prefix/linkText/suffix and concatenate JSX" anti-pattern (L1's no-concatenation rule, now with a tool); never `dangerouslySetInnerHTML` for translated content. Use the L1 example key names so it reads as a continuation. Keep it to one pattern — multiple-tag depth is genuinely L5's to own but one clear example suffices; do not balloon into a `t.rich` reference.

`Term`: **render tree** ("the components React renders for a page; `generateMetadata`, Server Actions, and route handlers run *outside* it").

### Formatting in the tree: `useFormatter`

The in-tree front door over the L3 `Intl.*` engines. Short — the student already knows the engines.

The pitch: in L3 they built `lib/format.ts` for code *outside* React (utilities, tests, scripts) and threaded `locale` + `timeZone` by hand. Inside the tree, `useFormatter` wires both automatically from `getRequestConfig` — engineer passes only options.

`Code` block:
```tsx
import { useFormatter } from 'next-intl';
const format = useFormatter();

format.number(invoice.total, { style: 'currency', currency: invoice.currency });
format.dateTime(invoice.dueDate, { dateStyle: 'long' });   // timeZone auto-wired
format.relativeTime(invoice.paidAt, now);
```
Each line is a callback: `number` → L3 `NumberFormat` (currency from data, never hard-coded); `dateTime` → L3 `DateTimeFormat`, and the tz that was *required* as an explicit arg in `lib/format.ts` is now supplied by the request config (the L3 promise, kept by the wiring); `relativeTime` → L3 `RelativeTimeFormat` with the per-request `now` anchor from `getRequestConfig`.

State the two-front-doors rule clearly (echo continuity-notes terminology so it doesn't read as contradiction): **`useFormatter`/`getFormatter` in the tree; `lib/format.ts` outside it.** Same `Intl.*` constructors underneath, different call sites. `getFormatter` is the async sibling for `generateMetadata`/actions, mirroring `getTranslations`. Mention `i18n/formats.ts` exists to hold shared presets (named in code conventions) but defer its depth to project ch085 — name once, do not teach.

Audit grep (echo L3/conventions): inside `app/[locale]/`, dates/numbers/relative-times go through `useFormatter`/`getFormatter` or `lib/format.ts`; a bare `Intl.X()` or `Date.prototype.toLocaleString` in a component is a finding.

### Sending translations to the client: `NextIntlClientProvider` scope

The payload-size decision. New and consequential.

The problem: Client Components that call `useTranslations` need their messages in client JS. The provider supplies them. **The v4-specific trap:** `NextIntlClientProvider` *automatically inherits* all messages and formats from `i18n/request.ts` when you pass no `messages` prop — so a bare provider at the root silently ships the **entire catalog** to every client (a 10K-key catalog now in the bundle). This is a v4 default change worth flagging: in v3 you passed `messages` explicitly; in v4 the convenience default is "forward everything," which is precisely the payload bug at scale.

`CodeVariants` — the scope decision as before/after:
- **Wrong** — bare provider at the root, whole catalog inherited:
  ```tsx
  <NextIntlClientProvider>{children}</NextIntlClientProvider>
  ```
  Prose: "No `messages` prop = v4 forwards the whole catalog. Fine for a 50-key demo, a payload bug at SaaS scale."
- **Right** — opt out of the auto-inherit with `messages={null}`, then pass back only the namespaces this subtree needs:
  ```tsx
  import { pick } from '@/lib/utils';
  const messages = await getMessages();
  <NextIntlClientProvider messages={pick(messages, ['inbox', 'invoice'])}>
    <ClientInbox />
  </NextIntlClientProvider>
  ```
  Prose: "Minimal subtree, `pick` the namespaces the client subtree consumes. Passing an explicit `messages` prop overrides the auto-inherit; `messages={null}` is the full opt-out when a subtree needs no client messages at all. Server Components don't need the provider — they read messages server-side."

State the rule: Server Components read translations directly; the provider exists only to ferry the slice that Client Components consume. Default to the smallest wrapping subtree; `pick` the namespaces. (next-intl v4 can forward all messages by default when the provider sees them in context — the discipline is to scope what reaches it.) Cross-ref ch030's "what crosses the boundary" model: messages are just serializable props; sending the whole catalog is the same class of mistake as over-fetching a row.

Note: the root-layout snippet two sections up showed a bare provider for brevity; flag here that production scopes it. (Prevents the student copying the simplified root-layout provider as the final shape — the kind of staged-simplification note downstream agents need.)

`Term`: **catalog** ("the per-locale JSON file of translations; `messages/fr-FR.json`").

### Type-safe keys: the `AppConfig` augmentation

The compile-time safety net. **Research correction lives here — teach `AppConfig`, not `IntlMessages`.**

Motivate: `t('invoice.greting')` (typo) should be a build error, not a runtime missing-key. next-intl derives key types from the source catalog via TypeScript module augmentation.

`Code` block (the v4 shape):
```ts
// global.ts
import type messages from './messages/en-US.json';
import type { formats } from './i18n/request';
import type { routing } from './i18n/routing';

declare module 'next-intl' {
  interface AppConfig {
    Messages: typeof messages;
    Formats: typeof formats;
    Locale: (typeof routing.locales)[number];
  }
}
```
Explain the three registrations:
- `Messages` — types every `t(key)` against `en-US.json` (the source locale, L1's completeness rule means it's the complete keyset). `t('invoice.greting')` → compile error; missing placeholder args → compile error.
- `Formats` — types the shared presets (ties to `i18n/formats.ts`, named only).
- `Locale` — strict locale union app-wide, derived from `routing.locales`; pairs with L4's `Locale` type from `lib/i18n.ts` (same union, now also registered with next-intl so `useLocale()` returns the narrow type).

**State the divergence explicitly** so no downstream agent "fixes" it back: in next-intl v4, type safety is registered under `declare module 'next-intl'` with `AppConfig`. The older global `IntlMessages` interface (which the chapter outline and some docs still reference) is the deprecated v3 pattern — `AppConfig` is the current, single-type approach. This is deliberate.

Close the loop: with this file, the keyset (L1), the locale union (L4), and the format presets are all compile-checked. The "rename a key is a coordinated change" worry from L1 is now caught by `tsc`, not just by `eslint-plugin-i18n-json`.

`Term`: **module augmentation** ("extending a library's types with your own via `declare module`, so the library's APIs know your app's shapes").

### The wired rule, end to end

Short closing synthesis (not a summary dump — a single consolidated rule + a self-check). Once wired, the audit set is mechanical:
- Every user-read string → `t()` / `t.rich` (no JSX string literals).
- Every number/date/relative-time in the tree → `useFormatter`/`getFormatter` (no bare `Intl.X()` / `toLocaleString` in components).
- Every navigation in `app/[locale]/` → `@/i18n/navigation` (no `next/link`).
- Every `page.tsx`/`layout.tsx` under `app/[locale]/` → starts with `setRequestLocale`.
- Locale negotiated once in `proxy.ts`; never re-read downstream.

**Exercise — `MultipleChoice` or `Buckets` (pick one).**
- Option A (`Buckets`, recommended): sort a list of i18n tasks into the file that owns each — "load the active catalog" → `i18n/request.ts`; "decide URL prefix mode" → `i18n/routing.ts`; "run the resolution chain" → `proxy.ts`; "enable static rendering" → `layout.tsx` (`setRequestLocale`); "type-check keys" → `global.ts`; "prefix-aware Link" → `i18n/navigation.ts`. Goal: verify the file-map mental model — the lesson's core deliverable. Two-column layout (file vs. responsibility).
- Option B (`MultipleChoice`): single question — "A public marketing page renders per-request instead of statically. Most likely cause?" with `setRequestLocale` missing as the correct answer and plausible distractors (wrong `localePrefix`, missing `generateStaticParams`, provider at root). Targets the lesson's highest-stakes bug.
Prefer A as the primary (covers the whole shape); B is a good secondary if room allows.

### External resources (optional)

1–2 `ExternalResource` cards: next-intl App Router setup docs (next-intl.dev/docs/routing/setup), and the Next.js 16 `proxy.ts` reference. Keep to the two canonical sources; do not pad.

---

## Scope

**Prerequisites to restate concisely (do not re-teach):**
- L1 — keys, catalogs (`messages/{locale}.json`), `t()` call shape, `t.rich` concept, `useTranslations`/`getTranslations` *names*. This lesson *wires* them; assume the discipline is known.
- L2 — ICU MessageFormat syntax. next-intl runs it unchanged; do not re-explain `plural`/`select`/`#`.
- L3 — the `Intl.*` family, `lib/format.ts`, the required-`timeZone` rule, stable-`now` rule. `useFormatter` wraps these; restate only the "two front doors" relationship.
- L4 — the five-input resolution chain, `SUPPORTED_LOCALES`/`DEFAULT_LOCALE`/`Locale` in `lib/i18n.ts`, `users.locale`, `<html lang>` from the resolved value, the locale-switcher behavior, `negotiateLocale` as the outside-middleware form. This lesson shows the chain *running* in `proxy.ts`; do not re-derive the priority order or the BCP 47 `Lookup` algorithm.
- ch083 L3 — `users.timeZone`. Surfaces in `getRequestConfig`; one-clause callback only.
- App Router basics (ch030–033) — Server/Client boundary, `params` as a Promise, middleware composition, `generateMetadata`. Assumed.

**This lesson does NOT cover (defer / out of scope):**
- `hreflang`, `alternates.languages`, per-locale canonicals, sitemaps, OG locale — **L6**. `generateMetadata` appears only as a *call site* for `getTranslations`/`getFormatter`; its SEO payload is L6's. Hard boundary: do not emit any `alternates` metadata here.
- The locale-switcher UI build — **L4 owns it**; this lesson only names which navigation primitive (`usePathname`/`Link`) does the path-preserving half.
- `i18n/formats.ts` shared presets at depth — **project ch085**; named once via `AppConfig.Formats`, not taught.
- ICU syntax, `Intl.*` mechanics, negotiation algorithm — prior lessons; restate as callbacks only.
- The auth gate / CSP code in `proxy.ts` — **ch081 / ch033 / ch054** own it; show only the seam where i18n's middleware sits relative to it.
- TMS / translation pipeline (Lokalise/Crowdin/Tolgee) — out of chapter scope; do not mention beyond L1's existing one-time naming.
- RTL / `dir` handling — out of chapter scope; named once at most alongside `<html lang>` if natural, no helper.
- next-intl SWC plugin / ICU pre-compilation — out of scope (the runtime parser is fine at 2026 scale); a single watch-out clause at most, not a section.
- `eslint-plugin-i18n-json` setup — named in L1 as the lint guard; not configured here.

**Estimated student time:** 50–60 minutes. The chapter's Setup/Wiring lesson; the file shape that cashes in L1–L4.
