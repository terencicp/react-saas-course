# hreflang, per-locale canonicals, and SEO

- **Title (h1):** hreflang, per-locale canonicals, and SEO
- **Sidebar label:** hreflang and SEO

---

## Lesson framing

This is the chapter's closing lesson and its SEO/discovery payoff. L1–L5 made the app *render* correctly in every locale (keys, ICU, `Intl.*`, negotiation, next-intl wiring). This lesson makes Google and social platforms *route the right locale to the right user*. The whole topic is invisible at code review and in local dev — it only shows up as lost organic traffic months later — so the pedagogy must make the failure mode vivid and the structural defense concrete.

**The single mental model the student must leave with:** each locale variant is its own first-class page that *declares its peers*. Three signals carry that declaration — `hreflang` alternates (which URLs are language-siblings), a self-canonical (this URL is authoritative, not a duplicate of English), and a sitemap entry (so crawl finds every variant). Get those three right and the rest is detail. The recurring anti-pattern that ties the lesson together: **canonicalizing every locale to the default URL**, which tells Google "these are all duplicates of English, only rank English" and silently kills translated rankings. Frame the lesson around preventing that one bug.

**Senior-mindset throughline.** This is a "decisions before syntax" lesson. The Next.js metadata surface (`alternates.languages`, `alternates.canonical`, `openGraph.locale`, `MetadataRoute.Sitemap`) is small; the senior content is *why each field has the value it does* and the bidirectionality/self-reference rules Google validates. Lead every section with the failure mode, then the structural form that makes the bug hard to write.

**Prerequisite leverage — do not re-teach.** The student already owns the single-locale SEO surface from **Chapter 034 L6–L7**: static `metadata` export, `generateMetadata`, `metadataBase`, `alternates.canonical`, `opengraph-image.tsx` with `ImageResponse`, `robots.ts`, `sitemap.ts`. Treat all of these as known. This lesson is strictly the *i18n delta* on that surface. Reference them in one clause each ("the `generateMetadata` you wrote in 034, now reading `params.locale`") rather than re-explaining.

**Wiring already in hand from this chapter.** From L5: `routing` object (with `routing.locales`, `defaultLocale`, `localePrefix: 'as-needed'`), the typed `@/i18n/navigation` module including **`getPathname({ locale, href })`** (the primitive this lesson uses to build per-locale canonical/hreflang/sitemap URLs — next-intl's documented tool for exactly this), `getTranslations({ locale, namespace })` (async, outside render tree — the form `generateMetadata` uses), `app/[locale]/` route shape, `<html lang>` driven from the resolved param. From L4: `SUPPORTED_LOCALES` / `DEFAULT_LOCALE` / `Locale` in `lib/i18n.ts`, locale-vs-timezone independence, geo-IP-as-anti-pattern. From L3: `lib/format.ts` standalone formatters. Build on these; don't reintroduce them.

**Archetype: Pattern lesson.** Most code blocks are named for what they prevent (wrong-locale serving in the SERP). The deliverable shape is a small set of `lib/seo.ts` helpers (`generateAlternates`, `bcp47ToOgLocale`) plus the shape of a localized `generateMetadata`, a localized `sitemap.ts`, and a per-locale `opengraph-image.tsx`. The student does not wire a running app here — that's Chapter 085 L4. The goal is that they can read, write, and review this surface and catch the canonical/bidirectionality bugs.

**Marketing-vs-app split is load-bearing and should be stated early and reused.** The full public `hreflang`/sitemap/OG-image surface applies to marketing routes (`/`, `/pricing`, `/features`) — the SEO target. The authenticated app (`/dashboard`, `/settings`) is `noindex`; locale resolution still runs but the public SEO surface is dark. Establish this dichotomy in the intro so every later section can say "marketing only" or "both" without re-arguing it.

**Cognitive-load sequencing.** Start with the concrete SERP failure (the senior question), then teach `hreflang` as a concept with its three rules *before* showing any Next.js syntax — students conflate the framework field with the underlying tag and miss that Google validates bidirectionality regardless of framework. Only once the concept is solid, show how `alternates.languages` emits the tags. Then canonical, then sitemap, then OG, then the untranslated-content decision, then validation. Each builds on the prior.

**Diagrams over prose for the routing model.** Two visuals carry disproportionate weight: (1) a SERP-routing illustration showing the wrong vs. right outcome, and (2) an `hreflang` bidirectionality/self-reference graph. Both are simple HTML/CSS or ArrowDiagram, not system architecture.

---

## Lesson sections

### Introduction (no header)

Open with the senior question as a concrete scenario, lifted from the chapter outline: a French user in Paris Googles "logiciel de facturation"; the SaaS has a translated `/fr-FR/billing` and the English `/billing`. Without the right wiring Google shows the English page in the French SERP, the user bounces, and the team wrongly blames the translation. State the lesson's promise: three structural signals — `hreflang`, self-canonical, sitemap entry — make Google serve the right variant, and the whole surface is small Next.js metadata once the rules are clear.

Connect to prior knowledge in two sentences: the student shipped per-locale *rendering* across L1–L5 and the single-locale *metadata* surface back in Chapter 034; this lesson is the bridge that tells search engines those locale variants exist and how they relate. Preview the deliverable: a `lib/seo.ts` helper and the shape of a localized `generateMetadata` / `sitemap.ts` / `opengraph-image.tsx`.

State the **marketing-vs-app dichotomy** here as a one-paragraph framing the rest of the lesson leans on: public `hreflang`/sitemap/OG is a marketing-route concern; the authenticated app is `noindex` and its SEO surface is dark, though locale resolution still runs there.

Keep it warm and brief, then move into the first section. No "what is SEO" scaffolding — assume competence.

### Why translated pages don't rank without help

Pedagogical goal: make the invisible failure mode vivid *before* any syntax, so the student is motivated and has a mental model to hang the tags on.

Explain what goes wrong by default. Without `hreflang`, Google treats `/billing` and `/fr-FR/billing` as two unrelated pages competing for the same intent; it indexes both but consolidates ranking signals poorly and may surface only the variant with the most backlinks (usually the English original), or flag them as near-duplicates. With `hreflang`, the variants are declared as a *cluster*: Google understands they're the same page in different languages, shares authority across them, and serves the variant matching the user's own language/region signals.

**Diagram (SERP routing, primary visual of the lesson).** A side-by-side "without / with" illustration. Use `TabbedContent` with two tabs ("Without hreflang", "With hreflang") OR a two-panel HTML/CSS figure inside `<Figure>`. Each panel: a stylized French SERP query at top, then the page Google serves. Left/"without": French query → English `/billing` result → bounce. Right/"with": French query → `/fr-FR/billing` result → engaged. Keep it flat HTML/CSS (boxes, arrows via simple CSS, a checkmark/cross). Pedagogical goal: anchor the entire lesson in the user-facing consequence. Caption names the lost-organic-traffic stake.

Close the section by naming the three signals the lesson will install (hreflang, self-canonical, sitemap) as a roadmap, plus OG for social as a fourth, smaller surface.

**Term candidates:** `SERP` (search engine results page), `hreflang` (define on first use as the link annotation declaring a page's language/region alternates).

### hreflang: declaring a page's language siblings

Pedagogical goal: teach the concept and its three validation rules *independent of Next.js*, because Google validates them no matter how the tags are produced. This is the conceptual core; the framework section that follows is just emission.

Show the raw tag shape first with a plain `Code` block, so the student sees what Next.js will eventually generate:

```html
<link rel="alternate" hreflang="en-US" href="https://app.example.com/billing" />
<link rel="alternate" hreflang="fr-FR" href="https://app.example.com/fr-FR/billing" />
<link rel="alternate" hreflang="de-DE" href="https://app.example.com/de-DE/billing" />
<link rel="alternate" hreflang="x-default" href="https://app.example.com/billing" />
```

Then teach **the three rules that catch teams**, each as a short subsection of prose with the failure mode stated first. These are the load-bearing content:

1. **Self-reference is mandatory.** The French page lists *itself* as `hreflang="fr-FR"` alongside its siblings. A page that omits its own entry is treated as not part of the cluster. So every page emits N entries for N locales — including its own.
2. **Bidirectionality is mandatory.** If `/fr-FR/billing` points to `/billing` as `en-US`, then `/billing` must point back to `/fr-FR/billing` as `fr-FR`. Google silently ignores one-sided declarations — no error, just no effect. This is why a *helper that generates the full symmetric set for every page* is the only safe shape; hand-maintained per-page lists drift and break silently.
3. **`x-default` is the fallback.** `hreflang="x-default"` declares which URL serves users whose language matches no alternate (a Japanese speaker when you ship only en/fr/de). Senior default: the default-locale URL (`/billing`) is the `x-default`, emitted on every page. Mention the alternative (a language-picker landing page) in one clause.

Use full BCP 47 tags throughout (`fr-FR`, not `fr`) and connect to L4's "locale is a contract" rule: the `hreflang` value must match the locale tag the URL prefix represents. Precision note for the writer: Google *accepts* a region-less language code (`fr` is valid; the region is optional), and language-only targeting can even be broader. The chapter standardizes on the **full tag for codebase consistency** — the `hreflang` value, the URL prefix, and `users.locale` all carry the same `fr-FR` string, so there's one tag format everywhere and no mapping layer. Frame it as a consistency decision, not a Google mandate. Google's one hard rule here: the language code is mandatory and a country code alone (`be`, `us`) is invalid — Google won't infer language from region. Note region-vs-language *targeting* (`en-US` vs `en-GB` as distinct audiences) is out of scope (chapter ships language-targeted), name once.

**Diagram (bidirectionality graph, second key visual).** Goal: make "every page points to every sibling, both ways, including itself" visually obvious — this is the rule students most often get wrong. Use `<ArrowDiagram>` inside `<Figure expandable={false}>` (ArrowDiagram must opt out of expand per its docs). Three boxes for the three locale URLs of one page (`/billing`, `/fr-FR/billing`, `/de-DE/billing`) arranged in a triangle; bidirectional arrows between every pair, plus a small self-loop or a self-tag badge on each box to represent self-reference. Alternatively, if the triangle of bidirectional arrows reads as cluttered, fall back to a simple HTML matrix/grid (rows = "page", columns = "declares alternate for", cells = checkmarks showing the full symmetric N×N grid including the diagonal/self). The matrix may actually be the *clearer* choice for showing self-reference (the diagonal) and bidirectionality (symmetry) at once — recommend the matrix as primary, arrows as fallback. Caption: "Every variant declares every sibling, both directions, plus itself — the diagonal is self-reference, the symmetry is bidirectionality."

**Exercise (concept check).** A `MultipleChoice` or `TrueFalse` round testing the three rules against small scenarios: e.g. "`/fr-FR/about` lists `/about` as en-US but `/about` lists no French alternate — does Google honor the French targeting?" (No — one-sided is ignored.) "Does the French page need to list itself?" (Yes.) Keep to 3–4 statements. Pedagogical goal: lock in the rules before syntax, since they're the part that survives any framework.

**Term candidates:** `x-default`, `BCP 47` (if not already a page-level term from earlier lessons — define as the `language-REGION` tag format), `canonical cluster` / `alternates cluster` (optional).

### Emitting hreflang with Next.js `alternates.languages`

Pedagogical goal: show that the framework turns a single metadata object into the symmetric tag set, and give the student the reusable helper that guarantees self-reference + bidirectionality + x-default for free.

Show the `Metadata.alternates` shape mapped onto the billing example with `AnnotatedCode` (the object has several parts the student must distinguish — `canonical` vs `languages` vs the `x-default` key):

```ts
// inside generateMetadata for app/[locale]/billing/page.tsx
alternates: {
  canonical: '/fr-FR/billing',
  languages: {
    'en-US': '/billing',
    'fr-FR': '/fr-FR/billing',
    'de-DE': '/de-DE/billing',
    'x-default': '/billing',
  },
},
```

AnnotatedCode steps: (1) the whole `alternates` block — Next.js reads this and emits `<link rel="alternate" hreflang>` tags plus the canonical; (2) highlight `canonical` — *this page's* self-canonical is the fr-FR URL, foreshadow the next section; (3) highlight `languages` — one entry per locale, **including self** (`fr-FR` is present even though this is the fr-FR page); (4) highlight the `x-default` key — special pseudo-locale key Next.js maps to `hreflang="x-default"`. Note `metadataBase` (from Ch034) makes these relative paths absolute.

**The helper — the senior reach, built on next-intl's `getPathname`.** The structural defense is a `generateAlternates(locale, pathname)` helper in `lib/seo.ts` that maps over `routing.locales` to build the full languages map programmatically, so self-reference and bidirectionality are *guaranteed* (every page calls the same function, so every page emits the same symmetric set). Use **`getPathname` from `@/i18n/navigation`** (the typed navigation module from L5) to construct each locale's URL — next-intl's docs explicitly call this out as the intended tool for "constructing hreflang/canonical link elements." Critically, `getPathname({ locale, href })` already encodes `localePrefix: 'as-needed'` (default-locale URLs come back unprefixed, others prefixed), so the helper doesn't hand-roll prefix logic and can't drift from the routing config. Use `Code` (single focused block):

```ts
// lib/seo.ts
import { routing } from '@/i18n/routing';
import { getPathname } from '@/i18n/navigation';
import type { Locale } from '@/lib/i18n';

export function generateAlternates(locale: Locale, href: string) {
  const languages = Object.fromEntries(
    routing.locales.map((l) => [l, getPathname({ locale: l, href })]),
  );
  return {
    canonical: getPathname({ locale, href }),
    languages: {
      ...languages,
      'x-default': getPathname({ locale: routing.defaultLocale, href }),
    },
  };
}
```

Explain why `getPathname` over a hand-rolled string concat: it's the single source of truth for the prefix mode, it handles the `pathnames` localized-route-name case if the project ever adopts it, and it keeps `lib/seo.ts` from re-deriving routing rules that already live in `i18n/routing.ts`. Note the relative paths returned here are resolved to absolute by `metadataBase` (Ch034) when Next emits the tags. Flag for downstream agents: `generateAlternates` takes the current `locale` as its first arg precisely so `canonical` can be the *self* URL — this is the mechanism that makes "canonical = localized URL" automatic, foreshadowing the next section.

**The streaming-metadata reality (correct the common myth).** A senior dev who half-remembers older advice "hreflang must be in `<head>` or Google ignores it" will misread Next.js 16's behavior, so address it head-on. As of Next.js 15.2+/16, `generateMetadata` **streams**: when it resolves after the initial UI, the tags are appended to `<body>`, *by design*. Next.js has verified that JS-executing crawlers (Googlebot) inspect the full DOM and read them correctly; **HTML-limited bots** that don't run JS (e.g. `facebookexternalhit`) automatically get *blocking* metadata in `<head>` via Next's User-Agent detection (`htmlLimitedBots`, overridable in `next.config.ts`). So the senior takeaways are: (1) body-appended hreflang under streaming is **not** a bug — don't "fix" it by disabling streaming unless you have a measured reason; (2) the one hard rule is that `metadata`/`generateMetadata` are **Server-Component-only** — a Client Component literally cannot export them, and hand-injecting `<link rel="alternate">` from a client component *is* the smell (no streaming guarantee, no `htmlLimitedBots` handling). Frame the reviewer reflex around "is this metadata coming from the framework export on a Server Component?" not around "head vs body." Mention the CI defense (an assertion that the rendered DOM contains the expected symmetric hreflang set) but defer the tooling — Playwright arrives in Chapter 090, CI smoke tests in a later chapter; name them as the validation home, don't build them here.

**Term candidates:** `metadataBase` (one-clause refresher: the base URL that makes relative metadata paths absolute — from Ch034).

### The canonical is the localized URL, not the default

Pedagogical goal: isolate and hammer the single most damaging mistake in i18n SEO. It deserves its own section because it's the lesson's central anti-pattern and the easiest to get wrong (it *feels* right to point everything at the "real" English page).

State the rule up front: **each locale variant is its own canonical.** The fr-FR page's canonical is `/fr-FR/billing`; the en-US page's canonical is `/billing`. Then the failure mode, explicitly: canonicalizing all variants to the default (`canonical: '/billing'` on every locale) tells Google the translated pages are *duplicates* of English and should not rank independently — the translated pages vanish from their language SERPs even though they exist and are correct. This is the bug the whole lesson exists to prevent; connect it back to the intro's French-user scenario.

Show the contrast with `CodeVariants` (before/after is exactly this component's sweet spot):
- **Tab "Wrong — collapses to default":** `canonical: '/billing'` hardcoded on the fr-FR page. Prose: kills the French page's discoverability; Google dedupes it away.
- **Tab "Right — self-canonical":** `canonical: '/fr-FR/billing'` (or `getPathname({ locale, href })` — the self URL). Prose: each variant ranks in its own language SERP; `hreflang` handles the relationship between them.

Clarify the division of labor so the student doesn't confuse the two mechanisms: **canonical** says "this is the authoritative URL *for this content in this language*"; **hreflang** says "here are the *other-language* versions." They work together — self-canonical + hreflang cluster — not in competition. A one-line callout (`Aside` tip) reinforcing this is appropriate here (the watch-out lives in the section teaching the concept, per the outline rules).

Reconcile with Ch034: there, `alternates.canonical` was taught for the single-locale case (canonical = the page's own clean URL, dropping query params etc.). The i18n delta is only that "its own URL" now means "its own *localized* URL." Frame it as a natural extension, not a new rule.

### Per-locale sitemaps with `MetadataRoute.Sitemap`

Pedagogical goal: ensure crawl *discovers* every locale variant, and show that Next.js's typed sitemap can carry the same alternates as the head tags (often the easier surface for large sites).

Recall in one clause that `sitemap.ts` returning `MetadataRoute.Sitemap` is from Ch034 (single-locale). The i18n delta: each `url` entry carries an `alternates.languages` map, and Next.js emits `<xhtml:link rel="alternate" hreflang>` children inside each `<url>` — functionally equivalent to the head-level `hreflang` tags, and often preferred because alternates live in one crawlable file instead of being fetched per-page.

Show with `AnnotatedCode` (the entry object has multiple fields worth pointing at). Sitemap URLs must be **absolute** (unlike `generateMetadata`, the sitemap file has no `metadataBase` to resolve relatives), so prepend the base; still build the path with the same `getPathname` so the prefix logic stays single-sourced:

```ts
// app/sitemap.ts
import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { getPathname } from '@/i18n/navigation';

const BASE = 'https://app.example.com';
const MARKETING_PATHS = ['/', '/pricing', '/features'];

function abs(locale: string, href: string) {
  return `${BASE}${getPathname({ locale, href })}`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  return MARKETING_PATHS.flatMap((href) =>
    routing.locales.map((locale) => ({
      url: abs(locale, href),
      lastModified: new Date(),
      alternates: {
        languages: Object.fromEntries(routing.locales.map((l) => [l, abs(l, href)])),
      },
    })),
  );
}
```

AnnotatedCode steps: (1) `MARKETING_PATHS` — **marketing routes only**; the authenticated app is `noindex` and excluded (callback to the dichotomy); (2) the `flatMap`/`map` cross-product — one `<url>` per locale per path; (3) `abs` wraps `getPathname` with the base URL — same prefix source of truth as `generateAlternates`, so sitemap and head tags can't disagree; (4) `alternates.languages` — the per-entry sibling map Next emits as `<xhtml:link rel="alternate" hreflang>` children inside each `<url>`.

Mention the sitemap *index* pattern (a root `/sitemap.xml` referencing per-locale child sitemaps) as the scale option for very large sites, one or two sentences — the chapter's default is the single typed `sitemap.ts` with per-entry alternates, which is simpler and sufficient at startup scale. Don't over-teach the index; name it.

Close with: submit `/sitemap.xml` to Search Console (validation section expands on this).

**Term candidates:** `MetadataRoute.Sitemap` (the Next.js type for a typed sitemap — refresher clause), `<xhtml:link>` (the sitemap-embedded alternate tag).

### Open Graph locale signals and locale-aware OG images

Pedagogical goal: extend the same locale-declaration discipline to social cards, and flag the one underscore-vs-hyphen footgun that the type system won't catch.

Two parts.

**`og:locale` and `og:locale:alternate`.** Facebook/LinkedIn/Slack/X read these. The footgun, stated up front: OG locale uses **underscore** form (`fr_FR`), not the hyphen BCP 47 form (`fr-FR`) used everywhere else in the codebase — and Next.js's metadata typing won't flag a wrong value, so it's a silent bug. Show the `openGraph.locale` / `openGraph.alternateLocale` fields and a tiny `bcp47ToOgLocale(locale)` helper in `lib/seo.ts` that does the `fr-FR → fr_FR` swap, so the conversion happens in one audited place rather than being hand-typed per page. Use `Code`:

```ts
// lib/seo.ts
export function bcp47ToOgLocale(locale: string) {
  return locale.replace('-', '_'); // 'fr-FR' -> 'fr_FR'
}
```

Then the metadata usage: `openGraph: { locale: bcp47ToOgLocale(locale), alternateLocale: routing.locales.filter(l => l !== locale).map(bcp47ToOgLocale) }`.

**Locale-aware OG images.** Recall `opengraph-image.tsx` + `ImageResponse` from Ch034 (single-locale). The i18n delta: when the share card contains *text* ("Billing software" / "Logiciel de facturation"), the image must render per-locale copy. `opengraph-image.tsx` receives `params.locale` and calls `getTranslations({ locale, namespace: 'Metadata' })` to fetch the localized strings it draws. Show the shape briefly (don't rebuild the whole ImageResponse — it's known from Ch034; show only the locale-reading delta). Senior framing, stated as a decision: per-locale OG images are a strong signal for **translated marketing pages**, weak value behind auth — so per-locale OG on marketing, default-locale OG inside the app. This reuses the dichotomy.

Note the perf consideration in one clause: rendering OG images on every share request adds latency; for marketing, these are effectively static and cached — don't generate them dynamically per request unnecessarily. Defer cache-warming detail (it was a Ch034 topic).

**Term candidates:** `Open Graph` / `og:locale` (the social-card metadata protocol — brief definition).

### Handling untranslated pages

Pedagogical goal: give the student the senior decision for the realistic case where a translation hasn't shipped yet — this is where naive i18n SEO leaks duplicate/empty content and tanks quality signals.

Frame the scenario: the English source of `/features` exists; the French catalog for it is empty or partial. Two defensible options, presented as a *decision with a default*, not a single rule:

- **(a) Fall through to source locale:** serve the English content under `/fr-FR/features` (next-intl's per-key fallback from L1). Crucial rule: **do not list this URL as a French `hreflang` alternate** while its content is actually English — otherwise Google sees duplicate English content under a French URL and may penalize the cluster. Good for *app* routes where a fallback prevents broken UX and the page isn't an SEO target anyway.
- **(b) `noindex` the untranslated locale** until the catalog ships, via `metadata.robots = { index: false }` on that locale's variant. Good for *marketing*, where SEO quality matters more than coverage and you'd rather have no French result than a duplicate-English one.

State the chapter's senior defaults explicitly: **(b) for marketing, (a) for app** — and that the choice should be documented in `lib/i18n.ts` next to `SUPPORTED_LOCALES` (e.g. a `soft-launch locales` notion), so the team has one place that says which locales are publicly indexable.

Tie in the `robots.txt`-vs-`noindex` distinction (the student met `robots.ts` in Ch034): never use `robots.txt` to keep a page out of the index — blocking crawl means Google can't even see the `noindex`. "Don't crawl" ≠ "don't rank"; for "exists but don't rank yet," use `noindex`. One short paragraph; it's a reinforcement, not new material.

**Exercise (decision drill).** A `Buckets` two-column sort, or a short `MultipleChoice` scenario set: given situations (a fully-translated marketing page; a marketing page with no French copy yet; an authenticated dashboard; a soft-launch locale), the student sorts each into "list as hreflang alternate", "noindex this locale", or "fall through, don't list". Pedagogical goal: rehearse the decision matrix rather than memorize a single rule. If `Buckets` categories get awkward, use 3 MultipleChoice scenarios instead.

### Validating the setup in Search Console and CI

Pedagogical goal: close the loop — the student knows the signals are invisible locally, so show where they're actually verified, and set realistic expectations about feedback latency.

Brief, practical section. Two verification surfaces:

- **Google Search Console.** Submit the sitemap; the "International Targeting" / hreflang reports surface errors. The three most common, mapped back to the rules taught: missing return links (bidirectionality), malformed BCP 47 tags (`fr` instead of `fr-FR`), missing `x-default`. Note the realistic latency — these reports populate over days/weeks after crawl, which is *why* the structural-helper approach matters: you can't iterate quickly on hreflang via trial and error.
- **CI smoke test (named, not built).** The durable defense is an automated check that fetches the rendered HTML for each locale and asserts the expected `<link rel="alternate" hreflang>` tags are present **in `<head>`** and symmetric. Name Playwright (Chapter 090) and the CI smoke-test chapter as where this lands; here, just establish that the assertion exists and what it checks (head-level tag count per page). This reconnects to the head-vs-body warning.

Keep this section tight — it's orientation toward future chapters and the project, not a build-out.

### External resources

A small `CardGrid` of `ExternalResource` cards (3–4 max), current authoritative sources:
- Google Search Central — "Tell Google about localized versions of your page" (the canonical hreflang reference).
- Next.js docs — Metadata `alternates` / `MetadataRoute.Sitemap` API reference.
- next-intl docs — SEO / metadata + `generateMetadata` guidance.
- Optional: Open Graph protocol spec (`ogp.me`) for the locale fields.

Verify exact URLs during fact-check.

---

## Scope

**This lesson covers:** the i18n delta on the SEO surface — `hreflang` concept and its self-reference/bidirectionality/`x-default` rules; emitting it via Next.js `alternates.languages` plus a `generateAlternates` helper; per-locale self-canonicals (and the canonicalize-to-default anti-pattern as the central lesson); per-locale sitemaps via `MetadataRoute.Sitemap` `alternates.languages`; OG `og:locale`/`alternateLocale` (underscore form) and locale-aware `opengraph-image.tsx`; the untranslated-content decision (fall-through vs `noindex`); validation in Search Console + a named CI smoke test; the marketing-vs-app indexing split.

**Already taught — refresh in one clause, do not re-teach:**
- Static `metadata` export, `generateMetadata`, `metadataBase`, `alternates.canonical` (single-locale), `opengraph-image.tsx` + `ImageResponse`, `robots.ts`, `sitemap.ts` — **Chapter 034 L6–L7**. Assume full fluency; this lesson only adds the locale dimension.
- `routing`/`routing.locales`/`localePrefix: 'as-needed'`, `getTranslations({ locale, namespace })`, `app/[locale]/` shape, `<html lang>` from resolved locale — **Ch084 L5**.
- `SUPPORTED_LOCALES`/`DEFAULT_LOCALE`/`Locale`, BCP 47 "locale is a contract", locale-vs-tz independence, geo-IP anti-pattern, source-locale fallback — **Ch084 L1, L3, L4**.

**Explicitly out of scope (do not teach):**
- Translation keys/catalogs (L1), ICU MessageFormat (L2), `Intl.*` formatters (L3), locale negotiation chain (L4), next-intl wiring internals — `defineRouting`/`createMiddleware`/`getRequestConfig`/`setRequestLocale` (L5). Reference by name only.
- **Wiring this into the running invoices app** — that is the assessment in **Chapter 085 L4** ("Emit hreflang, sitemap alternates, and per-locale OG"). This lesson teaches the pattern and the helpers; it does not stand up a live app or a full end-to-end page. Don't pre-empt the project's deliverable.
- **Building** the Playwright/CI hreflang assertion — Playwright is introduced in **Chapter 090**; the CI smoke test in a later testing chapter. Name them as the validation home only.
- Schema.org / structured-data localization — name once, out of scope.
- A/B-testing locale variants — out of scope.
- Region-vs-language regional variants at depth (`en-US`/`en-GB`/`en-AU`) — chapter ships language-targeted; name once.
- RTL/`dir` — out of chapter scope (named in L4); not revisited here.
- Sitemap index files at depth — name as the scale option, default is single typed `sitemap.ts`.

---

## Code-convention alignment notes

- Code conventions §Internationalization names the SEO surface exactly as this lesson teaches it: `alternates.languages` with self-reference + `x-default`, per-locale canonicals, per-locale `sitemap.ts` entries, OG `og:locale` + per-locale `opengraph-image.tsx`. Fully aligned.
- **`localePrefix: 'as-needed'`** (default locale unprefixed) is the chapter/L5 choice; the `localizedPath` helper encodes it. Keep consistent — the default-locale URL has no prefix, so its canonical and hreflang entries are the bare path.
- **Full BCP 47 tags everywhere** (`fr-FR`, never `fr`) per the conventions and L4. The OG underscore form (`fr_FR`) is the one deliberate exception, isolated in `bcp47ToOgLocale`.
- **Route-handler/framework-file convention:** `sitemap.ts`, `opengraph-image.tsx`, `robots.ts` are framework-named files (conventions §Route handlers point 5) — correct home for this surface; not Server Actions.
- **Type-safety note for downstream agents:** the conventions doc still references the deprecated `IntlMessages` global type, but Ch084 L5 continuity notes establish next-intl v4's `AppConfig` module augmentation as the canonical pattern. This lesson doesn't introduce key typing, but if `getTranslations` namespaces are shown, assume `AppConfig`-typed keys (the `Metadata` namespace), not `IntlMessages`.
- Single-quote, 2-space indent, `import type` for type-only imports (`MetadataRoute`) per §Formatting/§Imports.
