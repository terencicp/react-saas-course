## Concept 1 — Keys are the wire format; strings are the rendered output

**Why it's hard.** Students who've added "another language" before reach for the obvious thing: concatenate translated fragments around the `user.name` and the `count`. The bug class isn't a bad rendering — it's a *frozen word order*: the source-language sentence structure is welded into the component, and German, Japanese, Arabic translators can't reorder the slots. The lesson has to install the keys-and-named-placeholders discipline as the *only* shape allowed, including for single-locale launches, before any ICU or wiring lands.

**Ideal teaching artifact.** A *Pattern* misconception-first ambush. The student opens with a working-looking English component: `<p>Welcome, {user.name}! You have {count} unread messages.</p>`. A "Translate to French" toggle appears. The naive reach — string concatenation — is shown first as a code variant; output is "Bienvenue, Sophie! Vous avez 5 messages non lus." which reads fine. Then a "Translate to German" toggle reveals the rendering, which now needs verb-second word order and a different placeholder position — the concatenation cannot produce it. A third toggle "Translate to Japanese" makes the failure visceral: subject-object-verb destroys the slot order entirely. The reveal lands the structural fix: every user-visible string is a *key* in code and an *entry with named placeholders* in a per-locale catalog the translator owns. The chapter's `t.rich` preview rides along as the second beat — when the string carries embedded JSX (`<Link>`), the same discipline applies; splitting into prefix/link/suffix keys reproduces the concatenation bug in JSX form.

**Engagement.** A `Buckets` sort of twelve strings into "key in code + catalog entry" vs. "stays as a string literal" — covering user-visible JSX text, `aria-label`, `placeholder`, `title`, `alt`, toast text, validation messages on the in-bucket side, and debug logs, machine-readable IDs, structural ARIA, hidden test fixtures on the out-bucket side. The sort tests the "what is a translation key" reflex right after the rule lands.

**Components.**
- `CodeVariants` for the four locale toggles (English / French / German / Japanese) showing the naive-concat version producing wrong output.
- `CodeVariants` (second instance) for the right shape: `t('inbox.greeting', { name, count })` in component code paired with `{ "inbox": { "greeting": "Bienvenue, {name} !..." } }` in the catalog.
- `Buckets` for the in-vs-out classification.
- `Figure` with a hand-authored SVG of the "key in code → catalog entry → rendered string" arrow chain — the mental model the chapter rests on.

**Project link.** 18.3.3's "every UI string through `t()`" gate is exactly this rule installed at audit-grep depth across the invoices list.

## Concept 2 — ICU plural with CLDR categories

**Why it's hard.** The student's reflex is `count === 1 ? 'message' : 'messages'`. English has two plural forms; the student has never seen four-form Russian or six-form Arabic and doesn't have a felt sense that the *categories themselves* differ per language. Without that felt sense, ICU's `one`/`few`/`many`/`other` reads as bureaucratic ceremony layered on top of an obvious binary. The lesson has to make the per-language category set *visible* before the ICU syntax can mean anything.

**Ideal teaching artifact.** A *Concept* explorable cross-product widget. Two controls: a count slider (0 to 1,000,000) and a language picker (en, fr, ru, ar, cy, ja). Below, the live output of one canonical ICU plural string in the selected locale, with the matched branch highlighted in the catalog entry shown to the right. As the student slides through Russian, the branch flips from `one` (1, 21, 31) to `few` (2–4, 22–24) to `many` (5–20, 25–30) to `other` (fractions, large numbers) — visible, immediate, surprising. The student then toggles to English: the same slider only ever selects `one` or `other`. To Welsh: every category lights up at some count. The CLDR-categories-are-per-language rule lands as a property of what the student just watched happen. The `=0`/`=1` exact-match overrides land in the second beat: a toggle adds "No messages" as `=0` and the student confirms the override only kicks in for English's catalog while Russian's catalog (which didn't add the override) still says "0 сообщений" via the `other` branch.

**Engagement.** A `PredictOutput` round of four prompts: given a count and a locale (Russian / 5, Arabic / 0, Welsh / 2, English / 21), predict which CLDR category fires and what the rendered string is. The widget reveals the answer.

**Components.**
- New `IcuPluralExplorable` — inputs: ICU message string, locales array, count range. Renders count slider + locale picker, evaluates `Intl.PluralRules(locale).select(count)` live, highlights the matched branch in the message. Forward-links to 18.2.5's `t()` rendering and Unit 22's analytics-count strings.
- `PredictOutput` for the four-prompt round.
- `Figure` with a hand-authored SVG of the per-language category-set bar chart (en: 2 bars, fr: 3, ru: 4, ar: 6, cy: 6, ja: 1) as the takeaway reference.

**Project link.** 18.3.3 ships en-GB and fr-FR catalogs with CLDR plurals; the explorable is the felt sense the student needs to write the French `one`/`other` branch correctly without copying English's shape.

## Concept 3 — `select` and the nested plural-in-select shape

**Why it's hard.** Once plural is on the table, `select` looks like the same thing for strings instead of numbers, and the student copies the shape. The trap is the *nested* form for gendered counts — outer `select` on gender, inner `plural` on count. The catalog string crosses a brace-nesting threshold most students have never written, and the wrong reach is to split into N strings ("male singular", "male plural", "female singular", ...) which both explodes the catalog and re-creates the concatenation bug class from Concept 1.

**Ideal teaching artifact.** A *Mechanics* anatomized worked example with hover annotations. One canonical ICU message — `'{gender, select, male {{count, plural, one {He has # message} other {He has # messages}}} female {{count, plural, one {She has # message} other {She has # messages}}} other {{count, plural, one {They have # message} other {They have # messages}}}}'` — is displayed in full with each structural element annotated on hover: the outer variable, the outer selector keyword, each branch's brace pair, the inner plural's variable, the inner branches. Below, two paired controls — gender picker and count slider — drive a live render that shows which combined branch the engine reaches. The student sees the nesting *as a tree*, not as a string of curly braces, and the `t('notification.likedYourPosts', { gender, count })` engineer surface stays one line on top of all that catalog logic. The `selectordinal` survey rides along in two lines as the third selector keyword for ordinals — same syntactic shape, distinct CLDR rule table.

**Engagement.** A `Dropdowns` exercise: a partially-filled ICU message with three blanks — the outer selector keyword, one branch label inside the inner plural, and the mandatory `other` fallback — that the student fills from a small `<select>` per blank. Tests the parts the student is most likely to forget when writing from scratch.

**Components.**
- `AnnotatedCode` on the full nested ICU message, stepped through the outer selector → outer branches → inner plural → inner branches.
- `TabbedContent` with one tab per (gender × count) combination showing the rendered output, paired with the same matched-branch highlighting from Concept 2's explorable.
- `Dropdowns` on the fill-in exercise.

## Concept 4 — The `Intl.*` family shares one shape

**Why it's hard.** Each formatter has its own surface (`NumberFormat`'s `style`/`currency`, `DateTimeFormat`'s `dateStyle`/`timeStyle`, `Collator`'s `sensitivity`) and the student treats each as a distinct API to memorize. The shared shape — `new Intl.X(locales, options)` returns an instance with `.format(value)` and the construction is expensive — gets lost in the option soup. The construct-once-reuse rule never lands because the student never saw the constructor as a *thing to hold*.

**Ideal teaching artifact.** A *Reference* survey card with one shared anatomy panel up front. The panel shows the canonical shape — locales → constructor → options → instance → `.format()` / `.formatToParts()` / optionally `.formatRange()` — with one example value flowing through each step, no specific formatter chosen yet. Then five small cards in a grid, one per daily-reach formatter (`NumberFormat`, `DateTimeFormat`, `RelativeTimeFormat`, `Collator`, plus `ListFormat`/`DisplayNames` together as the "named once" sixth card). Each card is reach-for-it-when on top, one canonical line of code, one rendered output. The construct-once rule lives in a small benchmark panel below the grid: same `Intl.NumberFormat` constructed inside a 1,000-row render vs. constructed once at module scope and reused — wall-clock times displayed side by side. The number is the argument, not the prose.

**Engagement.** A `Matching` drill pairing eight SaaS rendering tasks ("currency in checkout", "compact KPI number", "natural-language list of teammates", "language picker showing each option in its own language", "case-insensitive search across user-entered tags", "ordinal rank in leaderboard", "relative timestamp in inbox", "billing-period range") with the right formatter. Tests the reach-for-it-when reflex.

**Components.**
- `Figure` with a hand-authored SVG of the shared `locales → options → instance → format` anatomy.
- `CardGrid` with one `Card` per formatter, each containing a `Code` block with the canonical call.
- `Figure` with a small benchmark bar-chart SVG (constructed-per-row vs. cached) — hand-authored, numbers from a reference run.
- `Matching` for the reach-for-it-when drill.

## Concept 5 — Temporal-native `DateTimeFormat` with mandatory `timeZone`

**Why it's hard.** 18.1 installed the rule "every formatter receives the user's tz explicitly." This chapter has to land the same rule *into the rendering surface* without re-teaching the storage layer. The trap is that `Intl.DateTimeFormat(locale, { dateStyle: 'long' })` looks complete — it produces a string. The missing `timeZone` is invisible until staging runs in UTC and the rendered string is silently wrong for every user. The discipline is that the wrapper signature *requires* both locale and timeZone; passing only locale is a type error, not a runtime drift.

**Ideal teaching artifact.** A *Pattern* trace-from-storage walkthrough. One real moment — `Temporal.Instant.from('2026-03-08T07:30:00Z')` — flows through the rendering edge for three users: Sophie (`fr-FR` / `Europe/Paris`), Ken (`en-US` / `America/New_York`), Yui (`ja-JP` / `Asia/Tokyo`). Each user's row shows the same `Instant` reaching `formatDate(instant, { locale, timeZone, dateStyle: 'long' })` and producing a distinct rendered string. The wrapper signature is shown above with both arguments required. Then the deliberate-misuse beat: the same code with `timeZone` removed; on the developer's MacBook (Madrid), all three rows render approximately right; on Vercel (UTC runtime), all three rows are wrong; the diff is shown by toggling a "Deployment" pill above the demo. The lesson lands the rule as a structural defense: the wrapper's TypeScript signature is the audit point. `formatRange` rides along in a final beat — same shape, two Temporal values in, idiomatic locale-aware range out.

**Engagement.** A `ReactCoding` (tests mode) exercise: the student is dropped into `lib/format.ts` with a stub `formatDate` signature that's missing the `timeZone` parameter. Tests fail (the staging-UTC fixture renders wrong); the student adds the parameter to the signature, threads it to `Intl.DateTimeFormat`, and updates the three call sites. Tests pass when the staging-UTC fixture renders correctly for all three user profiles.

**Components.**
- `Figure` with a hand-authored SVG of the three-user trace (one `Instant`, three rendered strings, three rows).
- `TabbedContent` with two panels (local-dev / Vercel-UTC) showing the broken-no-tz version's output diff.
- `ReactCoding` for the wrapper-signature exercise.

**Project link.** 18.3.4 routes every invoice date through this exact wrapper, with the user's profile `timeZone` threaded explicitly — the exercise is the rehearsal.

## Concept 6 — The no-args bug class

**Why it's hard.** This is the chapter's deployment-trap concept, the structural twin of 18.1.3's `Intl.DateTimeFormat().resolvedOptions().timeZone` bug. `value.toLocaleString()` with no arguments uses the runtime locale and the runtime tz; on a developer's MacBook it looks right, on Vercel it ships UTC and `en-US` to every user. The student knows the rule by Concept 5 for dates; the failure mode is the same shape across `NumberFormat`, `RelativeTimeFormat`, and `Collator` (and the `.toLocaleString()` / `.localeCompare()` shortcuts on built-in prototypes), and it has to be installed once as a *pattern* across the formatter family, not concept-by-concept.

**Ideal teaching artifact.** A *Concept* deployment-toggle ambush, modeled exactly on 18.1.3's pattern. One panel with six code snippets — `(1234.56).toLocaleString()`, `new Intl.NumberFormat().format(1234.56)`, `'ä'.localeCompare('z')`, `new Intl.RelativeTimeFormat().format(-3, 'day')`, plus the two correct-shape counterparts for contrast. A "Deployment" toggle switches between three environments: developer MacBook (`en-US` / `Europe/Madrid`), Vercel production (`en-US` / `UTC`), staging container (`POSIX C` / `UTC`). Each snippet's output updates across all three. The student watches `'1,234.56'` flip to `'1234.56'` under POSIX C, `'il y a 3 jours'` collapse to `'3 days ago'` everywhere, `'ä'.localeCompare('z')` return inconsistent results across the three. The reveal lands the rule: every `Intl` call and every `.toLocale*` shortcut takes explicit `locale` and (where relevant) `timeZone` arguments. The audit-grep set is named in the closing beat — `\.toLocaleString\(\)`, `\.localeCompare\(`, `new Intl\.\w+\(\)` with no arguments — as the lint-rule shape.

**Engagement.** A `Tokens` exercise on a longer code block with twelve formatter calls embedded: the student clicks the no-argument calls (eight correct picks, four decoys with explicit arguments). Tests the visual-scan reflex.

**Components.**
- `TabbedContent` with three deployment-environment tabs, each containing the six-snippet panel with its environment-specific output.
- `CodeVariants` showing each snippet's broken vs. fixed pair.
- `Tokens` for the audit-grep exercise.

## Concept 7 — `RelativeTimeFormat` and the Temporal `since`/`until` pairing

**Why it's hard.** "3 days ago" is the most common malformed render in production SaaS. Students who reach for `Intl.RelativeTimeFormat` still hand-roll the unit selection (`if (diff > 86400) 'day' else if (diff > 3600) 'hour'`) and pass `Date.now() - timestamp` math that drifts across DST. The senior reach is to pair the formatter with Temporal's `since`/`until` — which returns a `Duration` whose largest non-zero unit is the right unit for relative-time rendering — and to anchor "now" once per request so hydration doesn't mismatch. Without the pairing, every team writes their own broken version of `formatRelative`.

**Ideal teaching artifact.** A *Pattern* before/after walkthrough plus a hydration-trap diagram. Before: a `formatRelative(timestamp)` implementation using `Date.now() - timestamp.getTime()`, a hand-rolled unit ladder, a `setInterval` ticking the rendered "1 minute ago" → "2 minutes ago" inside a Server Component. Three failure modes are highlighted: DST drift across the 1-AM transition, hydration mismatch (server's "now" ≠ client's "now"), and the "now" zero-case rendering as "0 minutes ago." After: the senior shape — `Temporal.Instant.from(timestamp).since(now, { largestUnit: 'day' })` returns a `Duration`, the largest non-zero unit becomes the formatter input, `formatter.format(-duration.days, 'day')` produces the string. A stable `now` is passed as an argument, anchored per-request server-side; client islands that need live updates re-render with their own `now` clock. The hydration diagram shows the same instant rendered at request time (server) vs. mount time (client) with the gap visible — and the fix (anchor "now" server-side, pass to client) closing the gap.

**Engagement.** A `ScriptCoding` exercise: the student fills in `formatRelative(instant, { locale, now })` using `Temporal.Instant.since` plus `Intl.RelativeTimeFormat`. Tests cover three fixtures — 3 days ago, 5 minutes ago, 30 seconds in the future — across `en-US` and `fr-FR`. The "now" parameter is passed explicitly; tests reject any use of `Date.now()`.

**Components.**
- `CodeVariants` showing the broken hand-rolled vs. the Temporal-paired version.
- `Figure` with a hand-authored SVG of the server-vs-client "now" hydration gap and the fix.
- `ScriptCoding` for the implementation.

## Concept 8 — The five-input locale resolution chain

**Why it's hard.** Five inputs (URL prefix, profile, cookie, `Accept-Language`, default) and the question "which wins" has a precise answer the student has to internalize as a fixed priority order, not a heuristic. The bug class is non-determinism: a French user signs in from a German hotel and the app renders in German because the team trusted `Accept-Language` without best-matching against the supported set, or rendered from `navigator.language` in a Client Component while the Server Component used the cookie. Senior reach is one resolution chain, run once in middleware, with the resolved locale carried through every downstream read.

**Ideal teaching artifact.** A *Concept* explorable simulator of the resolution chain. The student configures the five inputs as toggleable panels — URL prefix (none / `/fr` / `/de`), authenticated user profile locale (none / `'fr-FR'` / `'de-DE'`), `NEXT_LOCALE` cookie (none / `'es-ES'`), `Accept-Language` header (free string, with a preset menu of common headers like `'de-DE,de;q=0.9,en;q=0.7'`), and supported-locales constant (`['en-US', 'fr-FR', 'de-DE', 'es-ES', 'pt-PT']`). Below, the chain runs left-to-right: each step lights up green if it produced a match (and short-circuits), red-with-strikethrough if it didn't, with the matched value displayed under the winning step. The student plays scenarios: the French-user-in-Germany ambush (profile wins over `Accept-Language`); the `pt-BR`-browser-against-`pt-PT`-supported case (best-match falls back to `'pt-PT'`); the anonymous-marketing visitor (chain collapses to cookie → `Accept-Language` → default). Geo-IP appears as a *missing* input with a struck-through label and the explicit rule "never primary" annotated.

**Engagement.** The simulator is the assessment for chain order. Follow-up beat: a `Sequence` drill — the student drags the five inputs into priority order from scratch. Locks in the order without the simulator's scaffold.

**Components.**
- New `LocaleNegotiationSimulator` — inputs: supported locales, configurable URL/profile/cookie/Accept-Language values. Runs the chain, lights up the winning step, shows the BCP 47 best-match output for the `Accept-Language` step. Forward-link to 18.2.5 (the same chain in middleware code) and to project 18.3.3.
- `Sequence` for the priority-order drill.
- `Figure` with a hand-authored SVG of the chain as a left-to-right gate diagram — the static takeaway.

**Project link.** 18.3.3's `proxy.ts` wires this chain via `createMiddleware`; the simulator is the model the student tests their wiring against.

## Concept 9 — `users.locale` is profile data; geo-IP is never primary

**Why it's hard.** "User in France → show French" is the seductive heuristic. It's wrong for the French speaker in Brazil, the English expat in Tokyo, and the SEO crawler from a US datacenter. The student needs to feel the bug — geo-IP is a *fallback signal*, not a primary one — and the structural fix is two profile columns (`users.locale` paired with `users.timeZone` from 18.1.3) that are independent, BCP-47-validated, and seeded from the browser at sign-up.

**Ideal teaching artifact.** A *Decision* comparison card with three failure-mode scenarios. Top row: three "what if" cards — (a) French user vacationing in Berlin, (b) English-speaking expat living in Tokyo, (c) Googlebot crawling from a US datacenter. Each card has two columns: "geo-IP primary" (the rendered locale this approach picks) and "profile + chain" (the rendered locale the chapter's approach picks). The user sees three rows of wrong-vs-right side by side. Below, a small schema panel shows the `users` table with `timeZone` (from 18.1.3) and `locale` (added here) as independent NOT NULL columns, both BCP 47 / IANA validated, both seeded at sign-up from `navigator.language` / `Intl.DateTimeFormat().resolvedOptions().timeZone`. The "independent" claim lands with a one-line example: a Berlin user reading in `'en-GB'` (locale) and operating in `'Europe/Berlin'` (timeZone) — two columns, no inference.

**Engagement.** A `DrizzleSchemaCoding` exercise: the student adds the `locale` column to the `users` schema (text, NOT NULL, default `'en-US'`), then writes a Zod schema `z.enum(SUPPORTED_LOCALES)` validating the column at the write edge. Schema grader checks the column declaration plus a SQL probe asserting that an invalid locale insert rejects.

**Components.**
- `Figure` with a hand-authored SVG of the three-scenario comparison table.
- `DrizzleSchemaCoding` for the column-plus-validator exercise.
- `MultipleChoice` follow-up on the "should we ever derive locale from geo-IP" question — single-correct, with the "yes, as final fallback only after profile + cookie + Accept-Language" answer paired against three plausible-but-wrong distractors.

**Project link.** 18.3.2 seeds the four locale/tz user combinations into the starter; this concept is why the seed has both columns and why the combinations are independent.

## Concept 10 — The next-intl six-place file shape

**Why it's hard.** next-intl spreads its wiring across six files in three directories, and the student's first reach is to put everything in one file and watch Next.js's static rendering silently break. The senior shape is that each file does *one* thing — `defineRouting` declares the locale set, `createMiddleware` runs the negotiation chain, `getRequestConfig` resolves messages plus tz, `setRequestLocale` re-enables static, `useTranslations`/`getTranslations` consume — and the seam between them is precise. Without seeing all six places at once, the wiring reads as a stack of incantations.

**Ideal teaching artifact.** A *Setup/Wiring* file-tree-with-flow walkthrough. The artifact opens with the project's file tree showing the six places highlighted: `lib/i18n/routing.ts`, `lib/i18n/navigation.ts`, `proxy.ts`, `i18n/request.ts`, `app/[locale]/layout.tsx`, `messages/{locale}.json`. On click, each file expands to show the canonical code and the named exports — `defineRouting`, `createNavigation`, `createMiddleware`, `getRequestConfig`, `setRequestLocale` + `<NextIntlClientProvider>` + `<html lang>`, and the catalog shape. A flow overlay connects them: routing.ts feeds navigation.ts and proxy.ts; proxy.ts runs per request, sets the locale on the URL; request.ts reads that locale, loads messages, returns tz; layout.tsx calls `setRequestLocale` and wraps children. The `useTranslations` (sync, render tree) vs. `getTranslations` (async, outside the tree) sibling-pair lands as the consumer surface — same engine, two calling conventions for two contexts. The `IntlMessages` global type closes the loop: the source `en.json` becomes the compile-time key set.

**Engagement.** A `Sequence` drill: ten code fragments from the six files are shuffled; the student orders them by which file they belong to and by their position in the request lifecycle (middleware first, then layout, then page-level consumer). Locks in the *flow* of the wiring, not just the file names.

**Components.**
- `FileTree` of the six places highlighted, with file labels.
- `AnnotatedCode` stepped through each of the six files in lifecycle order, with the named exports highlighted.
- `Figure` with a hand-authored SVG of the request-time flow overlay (request → middleware → request.ts → layout → consumers).
- `Sequence` for the order drill.

**Project link.** 18.3.3 has the student fill `routing.ts`, `navigation.ts`, `request.ts`, `formats.ts`, `proxy.ts`, and `app/[locale]/layout.tsx` — exactly the six places, in the order this concept teaches.

## Concept 11 — `setRequestLocale` and the static-rendering trap

**Why it's hard.** Static rendering is invisible discipline — it works until it silently doesn't. next-intl's `useTranslations` in a Server Component without `setRequestLocale(locale)` at the top of the page or layout falls back to `headers()` to read the locale, which opts the route into dynamic rendering. No error, no warning — just a Lighthouse perf regression and a Vercel bill nobody can explain. The senior reach is the rule "every `app/[locale]/**/page.tsx` and `app/[locale]/**/layout.tsx` starts with `setRequestLocale(locale)`," enforced at code review.

**Ideal teaching artifact.** A *Pattern* wrong-by-default ambush with a build-output diff. Two routes are shown side by side: `app/[locale]/marketing/page.tsx` — one calling `setRequestLocale(locale)` as line one, the other not. Both consume `useTranslations` and render identical-looking output. The build output is shown below in a `Next.js build` terminal panel: the first route is marked `○ (Static)` and prerendered per locale; the second is `ƒ (Dynamic)` and rendered on every request. Toggling between the two — adding/removing the `setRequestLocale` call — flips the route classification in real time. The student feels the silent conversion. The second beat lands the `generateStaticParams` pairing: without both `setRequestLocale` *and* `generateStaticParams() { return routing.locales.map(...) }`, only the default locale prerenders even when the call is there.

**Engagement.** A `CodeReview` exercise: the student is dropped into a PR with four `app/[locale]/.../page.tsx` files, two of which are missing `setRequestLocale`, one missing `generateStaticParams`, one correct. The student leaves inline review comments naming the missing call and the consequence. AI grades each comment against the kernel rubric ("names the missing call + names that it forces dynamic rendering").

**Components.**
- `CodeVariants` showing the two routes (with / without `setRequestLocale`).
- `Figure` with a hand-authored SVG of the Next.js build output panel showing `○` vs. `ƒ` per route.
- `CodeReview` for the four-file PR exercise.

## Concept 12 — `hreflang` self-reference and bidirectionality

**Why it's hard.** `hreflang` rules are precise and the failure modes are silent: a missing self-reference makes Google drop the alternate relationship entirely; a one-sided declaration is silently ignored; missing `x-default` means users whose locale doesn't match any alternate get a coin-flip ranking. None of these throw errors. None show up in QA. They surface as "the French page isn't ranking" three weeks after launch. The discipline is structural — `generateAlternates(pathname)` produces the correct shape every time, and a CI assertion confirms head-level rendering.

**Ideal teaching artifact.** A *Pattern* failure-mode walkthrough with a structural diagram. Three "wrong" cases are shown first, each with the rendered `<head>` tags and the SERP consequence: (1) French page lists English alternate but not itself — Google drops the relationship; (2) French lists English, English doesn't list French — Google ignores both declarations; (3) no `x-default` — Google's pick for `en-CA` users is arbitrary. Each case shows the rendered head, an annotated arrow diagram of which declarations exist vs. which Google requires, and the SERP impact. Then the "right" shape: a single page declares every alternate including itself plus `x-default`, with the `generateAlternates(pathname)` helper mapping over `routing.locales`. The chapter's CI assertion — a Playwright check on production HTML counting head-level `<link rel="alternate">` tags per page — appears in the closing beat as the structural-defense layer.

**Engagement.** A `Buckets` sort of eight `hreflang` configurations into "valid" vs. "Google will silently ignore" — covering all three rules (self-reference, bidirectionality, `x-default`) plus distractors (correctly bidirectional, missing self, one-sided, missing `x-default`, language-only vs. region tag, body-rendered tags).

**Components.**
- `TabbedContent` with three tabs (one per failure case) showing rendered `<head>` + arrow diagram + SERP impact.
- `Figure` with a hand-authored SVG of the bidirectional-alternates graph (n locales × n declarations, with self-reference highlighted).
- `Buckets` for the valid-vs-ignored sort.

**Project link.** 18.3.5 builds `generateAlternates` and the bidirectional `hreflang` with `x-default` exactly as this concept describes; the failure walkthrough is why the helper exists.

## Concept 13 — The canonical is the locale-specific URL

**Why it's hard.** The student's reflex from non-i18n sites is "one canonical URL per page." Carried into i18n, this becomes the killshot: pointing every locale's canonical to the default-locale URL tells Google "these are duplicates of English, only rank the English one," and the translated pages never rank in their target markets. The team blames "the translation isn't working" when the structural cause is one wrong `alternates.canonical` line per page.

**Ideal teaching artifact.** A *Concept* misconception-first SERP simulation. The student sees a French user in Paris Googling "logiciel de facturation." Two side-by-side SERP screenshots are shown: (Left) the team set `canonical: '/billing'` on every locale's invoice page — the French SERP shows only the English page, no French alternate ranks. (Right) the team set `canonical: '/fr-FR/billing'` on the French page and `canonical: '/billing'` on the English page — the French SERP shows the French page in position 3, English page nowhere visible. The diff is one line of `generateMetadata` per page. The senior rule lands: each variant is its own canonical; `hreflang` declares the relationship; canonical declares the authority. The `og:locale` underscore-form and locale-aware OG image surfaces ride along in the closing beat — `og:locale: fr_FR` (not `fr-FR`), and `opengraph-image.tsx` accepting `params.locale` for per-locale share-card text — as the same structural concept extended to social-card metadata.

**Engagement.** A `MultipleChoice` round of three questions: (1) "The French page's canonical should point to…" (2) "An untranslated French page that falls back to English content should…" (3) "`og:locale` for French is…" — locks in the canonical rule, the noindex-vs-fallback decision from the lesson's "untranslated content rule," and the underscore-vs-hyphen form trap in one round.

**Components.**
- `TabbedContent` with two SERP-simulation panels (wrong canonical vs. right canonical), each containing a `Figure` with a hand-authored SVG mock of the Google SERP for `'logiciel de facturation'`.
- `CodeVariants` showing the broken-vs-fixed `generateMetadata` per page.
- `MultipleChoice` for the three-question round.

**Project link.** 18.3.5's "locale-specific canonical plus bidirectional hreflang and x-default" verification clause is exactly this rule in code.

## Component proposals

- **`IcuPluralExplorable`** — inputs: ICU message string (with `plural` selector), locales array, count range; renders a count slider and a locale picker; calls `Intl.PluralRules(locale).select(count)` live and highlights the matched branch in the displayed message; shows the rendered output. **Uses in this chapter:** Concept 2, with reuse pattern reachable in Concept 3 (gendered counts add a gender control and an outer `select` highlight). **Forward-links:** Unit 22's analytics-count strings hit the same plural surface; project 18.3.3 writes CLDR plurals for fr-FR and en-GB and the explorable is the felt sense the student tests their catalog against. **Leanest v1:** a `TabbedContent` with one tab per (count, locale) pair plus a hand-SVG of the per-language category-set chart. v1 drops live manipulation; the felt sense of *seeing the branch flip as the slider moves* is what the full version buys, and that's what makes Russian/Welsh categories click. Build the full version — the static v1 doesn't carry the surprise.

- **`LocaleNegotiationSimulator`** — inputs: supported-locales constant, plus configurable URL prefix, profile locale, `NEXT_LOCALE` cookie, `Accept-Language` header. Runs the five-step chain left-to-right, lights up the winning step (others struck through), shows BCP 47 best-match output for the `Accept-Language` step. **Uses in this chapter:** Concept 8. **Forward-links:** project 18.3.3 wires `createMiddleware` against this exact chain; the simulator is the model the student verifies their wiring against. Reusable in any future locale-related lesson (Unit 22 if it surfaces auth-flow locale persistence). **Leanest v1:** a `DiagramSequence` with hand-SVG steps for three pre-baked scenarios (French-in-Germany, pt-BR-against-pt-PT-only, anonymous-marketing). v1 drops the free configuration; the chain order still lands. The full version's value is that the student can *break* the chain by changing inputs — the "what if the user has no profile" scenario reaches further with interactivity than three pre-baked cards. Build the full version if 18.3 promises hands-on chain testing; v1 otherwise.

## Build priority

`IcuPluralExplorable` is the higher-priority build. CLDR plural categories are the chapter's most counter-intuitive teaching surface — every other concept builds on the felt sense that plural categories vary per language, and a static category chart cannot produce the "huh, Russian flipped to `few` at 2 and to `many` at 5" reaction that locks the rule in. The forward-link into project 18.3.3 is direct: the student needs the explorable to *check* their fr-FR catalog work. Three uses across the chapter (Concepts 2, 3, 9-adjacent if `select` reuses the rendering frame), plus the project, plus Unit 22 — this earns its bespoke build.

`LocaleNegotiationSimulator` is the second-priority build. The chain order is precise and binary-correct (the priority is the priority); a `DiagramSequence` v1 teaches it adequately. The full simulator earns its build only if the project's hands-on verification motion is interactive enough to demand it. Recommend shipping v1 first and promoting to the full version if project pilot feedback flags students confused by the chain in middleware code.

## Open pedagogical questions

- Concept 6's deployment-toggle ambush is the structural twin of 18.1.3's `Intl.DateTimeFormat().resolvedOptions().timeZone` trap. If 18.1.3's lesson copy already lands the no-args bug class as a generalized rule, Concept 6's panel can shrink to a "this is the same trap, surfacing across the formatter family" reference card; if 18.1.3 stays narrowly on the tz case, Concept 6 carries the full pattern. Depends on how 18.1.3's MDX lands.
- Concept 11's `CodeReview` exercise assumes the AI grader can reliably distinguish "names the missing `setRequestLocale` + names the dynamic-rendering consequence" from partial answers that only name one half. If the grader struggles with the two-part rubric, the exercise falls back to a `Buckets` sort of route configurations into static/dynamic — less authentic but more gradable.
- Concept 13's SERP-mock screenshots are hand-authored visual approximations; they need to be plausibly close to a real Google SERP without being scraped from one. If design bandwidth doesn't cover plausible mocks, the artifact falls back to an annotated rank table (position 1 / 2 / 3 / off-SERP per scenario) — same teaching, less visceral.
