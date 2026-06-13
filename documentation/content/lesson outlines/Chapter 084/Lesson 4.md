# Lesson 4 — The locale resolution chain

Title: The locale resolution chain
Sidebar label: Locale resolution

---

## Lesson framing

This is the **negotiation / algorithm** lesson of the chapter. L1–L3 built the discipline (keys, ICU, `Intl.*` formatters); every one of those formatters takes a `locale` argument as a given. This lesson answers the upstream question those lessons deferred: **where does that one `locale` value come from on each request, and how is the choice made deterministic?** The student leaves with a mental model of a five-input priority chain that runs once per request, resolves to a single validated BCP 47 tag, and feeds every downstream formatter and `t()` call.

Core pedagogical decisions, lesson-wide:

- **Lead with the senior decision, not the API.** The whole lesson is "what's the *order* you ask the inputs in, and why that order." This is a senior-mindset lesson: the value isn't a function call, it's the priority ranking and the reasoning behind each rung (why URL beats profile, why profile beats header, why geo-IP is never primary). Frame it as a decision the student is making, not a library feature they're consuming.
- **This lesson is library-agnostic on purpose.** The chain is a *concept* the student must own independently of next-intl; L5 wires the exact same chain into next-intl's middleware. State explicitly that next-intl runs this chain for you in middleware (so the student isn't confused about where the code lives), but teach the algorithm itself with the framework-neutral ponyfill (`@formatjs/intl-localematcher`) so the student understands what next-intl is doing under the hood and can reproduce it in standalone contexts (a Server Action, a CLI, a route handler outside the middleware). The continuity contract: do **not** teach `defineRouting` / `createMiddleware` / `getRequestConfig` file shapes here — those are L5's. Reference next-intl's middleware by name only, as "the place this chain runs."
- **The `Accept-Language` best-match is the single highest-value mechanic.** The canonical bug — browser sends `pt-BR`, supported set is `['pt-PT', 'en-US']`, naive code (`supported.includes(header)` or a bare equality check) falls straight through to the English default — is where beginners reliably fail. The fix (RFC 4647 `Lookup`: strip the region subtag, retry the base language) is the one piece of real algorithmic content. Walk it concretely with a worked trace; do not hand-wave it as "the library handles it."
- **Two profile columns, two independent axes.** Reinforce from L3 / Ch083 that `users.locale` (how text reads) and `users.timeZone` (when things happen) are orthogonal — a Berlin operator reading in `en-GB` is real. This pairs the new column with the one Ch083 already shipped; the student should see them as siblings on `users`, seeded together at sign-up, edited together on the profile page, never inferred from each other.
- **Cognitive-load staging.** Build the chain incrementally: first the simplest case (anonymous marketing visitor → header + default, two rungs), then add the cookie (persisted choice), then add the profile column (authenticated user), then add the URL prefix (the deep-link / SEO override that trumps all). Each rung is motivated by a concrete scenario it solves before it's added to the ranking. End with the full five-rung chain as a single diagram.
- **Anti-pattern as load-bearing content.** Geo-IP is taught only as the thing you must *not* put at the top: the "French speaker in Brazil" / "English expat in Tokyo" pair makes it visceral. The student should leave able to explain why IP is a weak, last-resort fallback at best.
- **Production stakes throughout.** Wrong-locale rendering is a churn / trust bug (a paying French customer seeing English, a hydration mismatch flashing the wrong language). Frame the chain as the thing that prevents support tickets, not as theory.

Target student: junior dev, comfortable with Next.js request lifecycle (middleware/`proxy.ts`, cookies, headers from prior units), Drizzle schema columns, BCP 47 tags and `Intl.*` from L3, Zod enums. They have not seen locale negotiation before.

---

## Lesson sections

### Introduction (no header)

Open with the concrete senior scenario verbatim-style from the outline: a French user (`users.locale = 'fr-FR'`) signs in from a German hotel whose browser sends `Accept-Language: de-DE,de;q=0.9,en;q=0.7`; separately, an anonymous visitor on the marketing site sends `Accept-Language: pt-BR,pt;q=0.9`; the product supports `['en-US', 'fr-FR', 'de-DE', 'es-ES', 'pt-PT']`. Ask the reader: which locale renders for each, and what rule makes the answer the *same* every time? State the payoff: a single resolution chain — **URL prefix → profile → cookie → `Accept-Language` best-match → default** — that runs once per request and lands a typed `locale` that drives every formatter, every `t()`, and `<html lang>`. Connect back: L3's formatters all took `locale` as an argument; this is where that argument is born. Keep it to ~4 sentences plus the scenario. Note next-intl will run this chain for us (L5); here we learn what it's actually doing.

### The five signals a request carries

Enumerate the five inputs, each with one sentence on *what it is* and *how strong a signal it is*. This is the inventory before the ordering — keep it descriptive, not yet ranked.

1. **URL prefix** — `/fr-FR/dashboard`. Explicit, in the address bar, shareable. Strongest signal: the user (or a link, or a crawler) asked for this locale by name.
2. **Profile column** — `users.locale`, set on the settings page by an authenticated user. A durable, deliberate preference.
3. **Cookie** — `NEXT_LOCALE`, written by the locale switcher. Persists a choice for anonymous users across visits.
4. **`Accept-Language` header** — the browser's ranked language list with q-values. A hint, not a decision: it reflects OS/browser settings, not necessarily this user's intent on this site.
5. **Geo-IP** — `request.geo.country` on Vercel. The weakest signal; covered below as the rung that is *never* primary.

Use a small **Figure with a plain HTML/CSS strip or `ArrowDiagram`** showing the five signals feeding into a single "resolve()" box that emits one `locale`. Pedagogical goal: establish that many inputs collapse to one output before we discuss priority. Keep it static and compact.

Tooltip (`Term`) candidates in this section: **q-value** (the `;q=0.9` quality weight in `Accept-Language`, 0–1, ranks the list), **BCP 47** (restate briefly: `language-REGION` tag like `fr-FR`; defined in L3 — one-clause refresher), **geo-IP** (mapping an IP address to an approximate country).

### Why the order is the whole game

State the principle before the mechanism: resolution is a **priority chain**, not a vote. The signals are tried top-down; the first one that yields a *supported* locale wins; resolution stops there. Explain the design reasoning rung by rung, framed as "more explicit / more deliberate beats less":

- URL prefix is first because it's the most explicit act — a shared `/de-DE/...` link must render German regardless of who clicks it, and SEO crawlers request specific localized URLs.
- Profile beats cookie and header because a signed-in user who set `fr-FR` in settings means it everywhere, even on a German hotel's browser (resolves the opening scenario's first user → `fr-FR`).
- Cookie beats header because a switcher click is a deliberate override of the browser default; it must survive the next page load.
- Header is a fallback hint, the best guess for a brand-new anonymous visitor with no other signal.
- Default is the floor — there is always an answer.

Use a **`StateMachineWalker` with `kind="decision"`** as the centerpiece. This is the ideal component: it forces the student through the *order the senior asks the questions in*, one commit at a time, exactly the "cardinality before frequency" pattern the walker doc describes. Author it as a funnel:

- `Question id="url"` prompt "Does the URL carry a locale prefix?" → Branch "Yes" to `leaf-url`; Branch "No" to `profile`.
- `Question id="profile"` prompt "Is the user signed in with a saved `users.locale`?" → "Yes" to `leaf-profile`; "No" to `cookie`.
- `Question id="cookie"` prompt "Is there a `NEXT_LOCALE` cookie?" → "Yes" to `leaf-cookie`; "No" to `header`.
- `Question id="header"` prompt "Does `Accept-Language` best-match a supported locale?" → "Yes" to `leaf-header`; "No" to `leaf-default`.
- Five `Leaf` nodes, each `verdict` = the resolved source ("URL prefix wins", etc.) and a one-line reason. The `leaf-header` body previews the best-match nuance (next section). The `leaf-default` body notes the floor.

Pedagogical goal: the lesson lives in the *order*, and the walker makes the order the interaction. Do not wrap it in `<Figure>` (it's self-carded).

### Best-matching `Accept-Language` against the supported set

This is the algorithmic heart. Motivate with the failure first: show the naive code and why it's wrong.

Use **`CodeVariants`** for a before/after:

- **Tab "The bug"**: naive matching — `SUPPORTED_LOCALES.includes(acceptLanguageHeader)` or `=== 'pt-BR'`-style equality. Walk the opening scenario's second user: header `pt-BR`, supported `['pt-PT', 'en-US']`, no exact `pt-BR` entry → falls through to `en-US`. A Portuguese speaker gets English. Name it the canonical i18n negotiation bug.
- **Tab "The fix"**: `match()` from `@formatjs/intl-localematcher`, fed parsed tags. `pt-BR` strips its region → `pt` base → matches `pt-PT`. Portuguese speaker gets Portuguese.

Then teach the mechanism in two layers (simplified-then-complete, per the cognitive-load rule):

1. **The idea: RFC 4647 `Lookup`.** Parse the header into ranked tags (highest q-value first). For each tag, try the exact tag against the supported set; if no hit, strip the trailing subtag (`de-DE` → `de`) and retry; move to the next ranked tag; if all exhausted, return the default. "Lookup" = progressively less specific until something matches. Contrast one clause with `best fit` (distance-based, region-aware, implementation-dependent) — note `match()`'s default is `best fit` but the concept to *understand* is `Lookup`; for teaching clarity show `Lookup` and mention `best fit` exists as the smarter default.
2. **The 2026 implementation.** `Intl.LocaleMatcher` is **TC39 Stage 1** — not native yet. The senior reach is `@formatjs/intl-localematcher` (the proposal's ponyfill, used across the i18n ecosystem). Show the real signature: `match(requestedLocales, availableLocales, defaultLocale, options?)` returns one tag. **Important accuracy point the student must not miss:** `match()` does *not* parse `Accept-Language` itself — it takes already-parsed arrays. Parsing the raw header (splitting on commas, reading q-values) is done by a companion like `negotiator` (the Next.js i18n guide's standard pairing) or a small hand-rolled parser.

Use a **`DiagramSequence`** to trace `Lookup` step-by-step for the `pt-BR` case against `['pt-PT', 'en-US']`:
- Step 1: parse header → `['pt-BR', 'pt']` (ranked).
- Step 2: try `pt-BR` exact → no match in supported set.
- Step 3: strip region → `pt` → still no exact `pt` entry, but `pt-PT` shares the `pt` base → match `pt-PT`.
- Step 4: resolved = `pt-PT`.
Pedagogical goal: make the subtag-stripping concrete and visual; the student sees *why* `pt-PT` is the right answer, not magic.

Then state the crucial framing: **the chapter's running wiring delegates this to next-intl's middleware** (L5) — you rarely call `match()` by hand in app code. You write it directly only *outside* the middleware (a Server Action, a CLI script, a route handler that needs to negotiate without the middleware's resolved value). Audit reflex: any `Accept-Language` read in component or page code that *isn't* the middleware-resolved locale is a finding.

`AnnotatedCode` on the standalone helper (the form you'd write outside middleware): a `negotiateLocale(acceptLanguageHeader: string): Locale` function — parse header → ranked tags, `match(tags, SUPPORTED_LOCALES, DEFAULT_LOCALE)`. Highlight: (1) the parse step, (2) the `match` call with the supported-set constant, (3) the typed return. Keep the parse step minimal (a comment can stand in for `negotiator` to avoid over-teaching header parsing — note this deliberately).

Tooltip (`Term`) candidates: **RFC 4647** (the IETF spec defining language-range matching, `Lookup` vs `Filter`), **`Lookup`** (the most-specific-first matching algorithm), **ponyfill** (a polyfill you import explicitly rather than one that patches globals), **TC39 Stage 1** (the earliest "worth pursuing" stage of the JS standards process — far from shippable).

### `users.locale`: the profile column, paired with `users.timeZone`

Land the data model. The locale isn't only negotiated per-request; for authenticated users it's a durable column — the rung-2 source in the chain.

- **Schema.** Show the Drizzle column added to `users`: `locale: text('locale').notNull().default('en-US')`. Full BCP 47 tag, never bare `'en'` (restate L3's "locale is a contract" rule — `en-US` and `en-GB` format dates and currency differently). Use **`Code`** (simple block) for the column; if showing it alongside the existing `timeZone` column for the pairing, use a short snippet showing both lines together.
- **The supported-locales constant.** `export const SUPPORTED_LOCALES = ['en-US', 'fr-FR', 'de-DE', 'es-ES', 'pt-PT'] as const;` and `export const DEFAULT_LOCALE = 'en-US'` in `lib/i18n.ts` (align with code conventions' `i18n/` shape — note the constant lives near routing config). Derive a `Locale` type: `type Locale = (typeof SUPPORTED_LOCALES)[number]`.
- **Validation at the write edge.** `z.enum(SUPPORTED_LOCALES)` on the profile-update schema — an unsupported tag never reaches the column. Show the Zod schema with **`Code`**. Connect to the Zod discipline from prior units.
- **Seeding and editing.** Seeded at sign-up from the browser (`navigator.language`, or the negotiated value) — the same sign-up moment that captures `users.timeZone` in Ch083. Editable on the profile page via a `<select>`. Display nicety: render each option's name *in its own locale* with `Intl.DisplayNames` (`Français`, `Deutsch`, not `French`, `German`) — callback to L3's `DisplayNames`. Keep this as a one-paragraph mention + a tiny snippet, not a full component build.

Subsection: **Locale and timezone are independent.** Make this its own beat (small h3 or a strong paragraph). Two concrete pairs: a Berlin user reading `en-GB` operating in `Europe/Berlin`; a San Francisco user reading `es-ES` operating in `America/Los_Angeles`. Two columns, two pickers, no inference between them. A small **`Figure`** with two side-by-side cards (HTML/CSS) — "how it reads" (locale) vs "when it happens" (timezone) — each listing its column, its picker, its consumers. Pedagogical goal: kill the beginner instinct to derive one from the other (e.g. `de-DE` ⇒ `Europe/Berlin`).

### Anonymous visitors and the locale cookie

Now the marketing-site / logged-out shape, where the chain collapses to **URL → cookie → `Accept-Language` → default** (no profile rung).

- **Why the cookie exists.** Scenario: an anonymous visitor clicks the switcher to French on the marketing site; their browser still sends `en` in `Accept-Language`. Without persistence, the next page load reverts to English. The `NEXT_LOCALE` cookie remembers the override across navigations and visits. It's the anonymous-user analogue of `users.locale`.
- **next-intl 4's cookie behavior (state precisely, it's a recent change).** The locale cookie defaults to a **session cookie** (cleared when the browser closes) and is **only written when the user picks a locale that differs from their `Accept-Language`** — i.e. only on a real override. A cookie that merely mirrors the header carries no information and isn't written. Bump persistence with a `maxAge`; disable entirely with `localeCookie: false`. (Don't teach the routing-config API surface — that's L5 — but state the *behavior* so the student's mental model is correct.)
- **The GDPR angle, one paragraph.** A locale cookie is "strictly necessary / essential for functionality" (it makes the site work in the chosen language), not a tracking cookie — so it isn't consent-gated. The session-by-default + write-only-on-override design is what keeps it on the right side of that line. Connect to Ch081's security/consent baseline by name only.

Tooltip (`Term`) candidate: **session cookie** (a cookie with no expiry that the browser drops when it closes, vs a persistent cookie with a `maxAge`).

### The locale switcher and `<html lang>`

Tie the chain to two concrete UI/output surfaces.

- **The switcher.** A dropdown in the layout. On select it does three things: writes the cookie, calls a Server Action to update `users.locale` *if the user is authenticated*, and navigates to the **same path under the new locale prefix** (preserve the deep route — switching locale on `/fr-FR/billing/123` lands on `/de-DE/billing/123`, not the home page). next-intl's `usePathname` / `useRouter` handle the prefix rewrite (named only; L5 wires it). Options display in their own language (`Intl.DisplayNames`, restated). Describe this in prose + one small illustrative snippet of the `onChange` intent; do not build the full component.
- **`<html lang>` — the load-bearing accessibility + SEO hook.** Set on the root layout from the *resolved* locale: `<html lang={locale}>`. Screen readers pick voice and pronunciation from it; browsers choose hyphenation and spell-check dictionaries; search engines and machine translation key on it. **Critical bug to call out:** render it from the *resolved* value (the chain's output), never from the raw cookie or `navigator.language`, or server and client disagree → React hydration mismatch and a flash of the wrong language. Pair with `dir` for RTL — out of scope, named once (`dir={isRtl(locale) ? 'rtl' : 'ltr'}`).
- **`Content-Language` response header.** One sentence: mirrors `<html lang>` (`Content-Language: fr-FR`); crawlers and proxies read it; cheap to set in middleware.

Tooltip (`Term`) candidates: **hydration mismatch** (server-rendered HTML disagreeing with the client's first render, forcing React to discard and re-render — restate from earlier React units), **RTL** (right-to-left scripts like Arabic/Hebrew where layout direction flips).

### `Accept-Language` is one signal, not the truth

A short consolidating section that hardens the mental model and lists the failure modes as qualifying content for the chain just taught (not a dumping-ground "watch-outs" section — these directly qualify the header rung and the chain's outputs).

What `Accept-Language` carries: ranked BCP 47 tags with q-values. What it does **not** carry: timezone, currency, calendar system, or region of residence — `en-US` from a German on vacation is real data, not an error. Hence it's rung 4, a hint, never truth.

Then the **geo-IP anti-pattern**, given real weight: using `request.geo.country` as a *primary* signal breaks two real users — the French speaker working in Brazil (gets Portuguese, wanted French) and the English-speaking expat in Tokyo (gets Japanese, wanted English). Geo-IP is at best a weak last-resort tiebreaker, never above explicit signals; the chapter's chain omits it from the primary five for exactly this reason. Also: **auto-redirecting** anonymous users by IP breaks deep links and confuses SEO crawlers (a crawler from a US datacenter requesting `/fr-FR/...` must get French, not a redirect to `/en-US/`).

Close with the remaining concrete failure modes, each tied to its rung: storing a bare `'en'` instead of full BCP 47 (rung 2, breaks region-specific formatting); updating `users.locale` without also updating the cookie (anonymous navigation stuck in the old locale until next sign-in); rendering `<html lang>` from the cookie instead of the resolved value (hydration mismatch). Keep each to one line.

### Check your understanding

Two exercises near the end, after the full chain is established.

1. **`Sequence`** — order the five resolution rungs from highest to lowest priority (URL prefix, profile, cookie, `Accept-Language` best-match, default). Source order = correct order. Instructions: "A request arrives. Order the signals from the one checked first to the last-resort fallback." Directly drills the lesson's central idea.
2. **`Dropdowns`** (inline prose mode) — three or four scenario blanks the student resolves by walking the chain. Examples: "An anonymous visitor with no cookie sends `Accept-Language: pt-BR`; supported set is `['pt-PT','en-US']`. They get `___`." (answer `pt-PT`, options `pt-PT` / `pt-BR` / `en-US`). "A user with `users.locale = 'fr-FR'` opens `/de-DE/billing` from a shared link. They get `___`." (answer `de-DE` — URL prefix trumps profile; options `de-DE` / `fr-FR` / `en-US`). One more on cookie-beats-header. Pedagogical goal: force the student to *apply* the priority order and the best-match rule together, including the counterintuitive URL-beats-profile case.

Optionally, a `MultipleChoice` on "why is geo-IP never the primary signal?" if a third check feels warranted — but the two above are the priority.

### External resources

A couple of `ExternalResource` cards: the `@formatjs/intl-localematcher` docs, the TC39 `Intl.LocaleMatcher` proposal repo, and the next-intl middleware/routing docs page (for the student who wants to see where L5 is heading). Optionally MDN on `Accept-Language` / `Content-Language`.

---

## Scope

**Prerequisites to restate briefly (do not re-teach):**
- BCP 47 tags and the "locale is a contract, `'en'` is incomplete" rule — established L3; one-clause refresher only.
- `Intl.DisplayNames` (rendering locale names) and `Intl.*` formatters taking a `locale` — established L3; referenced, not re-taught.
- `users.timeZone` column, sign-up timezone capture, hydration mismatch from React units, Drizzle column syntax, Zod enum validation, Next.js middleware/`proxy.ts` and cookies — all prior; referenced as known.

**Explicitly out of scope (belongs to other lessons):**
- next-intl file shape and APIs — `defineRouting`, `createMiddleware`, `getRequestConfig`, `setRequestLocale`, `generateStaticParams`, `NextIntlClientProvider`, typed `Link`/`redirect`/`usePathname`/`useRouter`, `IntlMessages` global type. **This is L5.** Reference next-intl's middleware *by name only* as "where this chain runs"; show no next-intl config code. This is the sharpest boundary in the lesson — the student must own the chain as a concept first.
- Translation-key / catalog discipline (L1), ICU MessageFormat (L2), the `Intl.*` formatter family at depth (L3) — done; reference only.
- `hreflang`, `alternates.languages`, per-locale canonicals, sitemaps, OG locale, the SEO surface — **L6.** `<html lang>` and `Content-Language` are taught here as accessibility/output hooks of the resolved locale; the SEO routing surface is L6's. Do not preview hreflang.
- Geo-IP routing *at depth* (provider APIs, edge config) — out of scope; taught here only as the anti-pattern that must not be primary.
- `navigator.languages` (plural — multi-language readers) — out of scope; if mentioned, one clause only. The lesson uses the singular `navigator.language` for sign-up capture.
- RTL / `dir` layout handling — out of scope; named once alongside `<html lang>`.
- Region-targeted variants at depth (`en-US` vs `en-GB` vs `en-AU` as separately translated catalogs) — out of scope; the supported set is language-targeted, mentioned once.

**Code-shape note for downstream agents:** the standalone `negotiateLocale` / `match()` helper is shown as the *outside-middleware* form deliberately (the in-tree path is next-intl's middleware, L5). Don't present hand-rolled `match()` as the everyday app-code reach — it's the "what next-intl does for you / what you write when next-intl isn't in scope" form. Keep header-parsing minimal (lean on `negotiator` by name or a commented stand-in) rather than teaching `Accept-Language` grammar in depth.
