## Concept 1 — Locale resolved once in `proxy.ts`, then read

**Why it's hard.** Returning devs reach for locale signals where they need them — a `navigator.language` read in a client component, an `Accept-Language` sniff inside an action, a header read on the API route. That scattering produces three different answers per request and makes the resolved locale impossible to audit. The senior shape is the opposite: one chain runs in middleware, the result rides the request, every downstream caller reads only the resolved value.

**Ideal teaching artifact.** A scrubbable five-step decision diagram (Concept archetype): the same incoming request is fed through `URL prefix → users.locale → NEXT_LOCALE cookie → Accept-Language best-match → defaultLocale`, with each step lighting up as the slider advances and visibly halting at the first hit. Three preset requests demonstrate three different exit points (URL-prefix exit for `/fr-FR/...`, cookie exit for an anonymous returning visitor, `Accept-Language` exit with `pt-BR` falling to `en-US` because `Lookup` finds no match). The slider terminates at a single boxed "resolved locale" panel — downstream code from this point on sees only that value. The artifact's load-bearing claim is visual: only the proxy sees the chain; everything past the boundary line reads one variable.

**Engagement.** A 4-question `Buckets` sort after the diagram: classify code snippets into "lives in proxy.ts" (chain inputs, `createMiddleware`) vs "lives downstream and reads the resolved value" (`getTranslations`, `getCurrentUserLocale`, `<html lang>`) vs "wrong — never reach for this at the leaf" (raw `navigator.language` in a Server Component, `headers().get('accept-language')` in an action).

**Components.**
- `DiagramSequence` with five steps, each a hand-SVG inside `Figure`. Three preset switches via `TabbedContent` above the sequence (URL exit, cookie exit, `Accept-Language` fallback). All achievable with existing components.
- `Buckets` for the post-diagram sort.

**Project link.** The chapter writes `proxy.ts` in 18.3.3; this diagram is the mental model the student carries into that file edit, and the rule it teaches ("read the resolved value, never re-sniff") is the audit lens applied throughout the build.

## Concept 2 — Locale and timezone are independent profile columns

**Why it's hard.** It's tempting to treat locale as a bundle ("French speaker → format like Paris time") because most users do match the cliché. The chapter's `(fr-FR, Pacific/Auckland)` user breaks that assumption deliberately. The senior shape is two columns, each piped through its own seam.

**Ideal teaching artifact.** A small 2×2 user-grid (Concept archetype, single static `Figure`): four seeded users from the chapter — `(en-US, NY)`, `(en-GB, London)`, `(fr-FR, Paris)`, `(fr-FR, Auckland)` — shown as four cards, each with the locale column on top and the tz column underneath, plus the rendered output for one fixed UTC instant and one fixed amount. The artifact does its work by adjacency: the two French users render identical strings but the date columns diverge wildly. The grid sits next to the schema fragment showing `users.locale text` and `users.timeZone text` as two independent columns; the visual pairing is the argument.

**Engagement.** A `PredictOutput` round: given a fifth user `(en-GB, Asia/Tokyo)` and the same UTC instant, predict the date string the formatter emits before scrolling to see the answer. Forces the student to apply the two-column model rather than collapse it back to "locale picks the tz".

**Components.**
- `Figure` wrapping a hand-SVG/HTML grid of four user cards with rendered outputs. Single-use for this chapter — `Figure` is the right primitive, no new component needed.
- `PredictOutput` for the fifth-user prediction.

**Project link.** The Auckland-French user is in the chapter seed for exactly this reason; the student sees the column independence verified in 18.3.4 the first time they switch to that user and watch French strings render with NZDT/NZST dates.

## Concept 3 — `setRequestLocale` and the silent-dynamic regression

**Why it's hard.** It's a one-line ritual whose omission produces no error, no warning, no visible behavior change — just a performance regression invisible without monitoring. Every page under `[locale]/` that forgets it silently flips from static to dynamic at build time. The teaching has to make the invisible cost visible.

**Ideal teaching artifact.** A wrong-by-default sandbox (new archetype — "silent regression demo"). The student sees a two-pane build-output panel: left pane shows `pnpm build` output for a layout *without* `setRequestLocale`; right pane shows the same build *with* it. The marketing routes' Static/Dynamic badge in the build summary is the only difference — left is `ƒ` (dynamic), right is `○` (static), nothing else changes. The student then sees the corresponding source code diff: one line added at the top of the async layout. The artifact's punch is the asymmetry — the consequence (every marketing render now executes per-request) is gigantic; the fix is one line; the failure mode is dead silent.

**Engagement.** A single `MultipleChoice` immediately after: "Which of these signals would catch this regression in CI?" with options including bundle analyzer output, the build summary's static/dynamic glyph, a unit test, and TypeScript errors. The right answer is the build-summary glyph — locking in the rule "the static/dynamic indicator is the only signal; you watch the build output or you don't catch it."

**Components.**
- New `BuildOutputDiff` component — props: `leftOutput` (string, multi-line monospaced), `rightOutput` (string), `highlightLines` (line indices to mark per side). Renders two terminal-styled panes side-by-side with the marked lines tinted. Or, leanest version: `TabbedContent` with two `Code` blocks (one per build output) labeled "Without setRequestLocale" / "With setRequestLocale" — loses the side-by-side punch but keeps the comparison.
- `MultipleChoice` for the follow-up.

**Project link.** The inspector's static-vs-dynamic indicator (Lesson 18.3.6 verify) is the runtime form of this artifact — the student rehearses the deliberate-misuse here before doing it in the project.

## Concept 4 — Catalog discipline: keys, placeholders, and never concatenate

**Why it's hard.** Naming translation keys is one of those skills that looks trivial until a real catalog grows past 200 entries and starts collapsing under duplicates, vague keys, and concatenated fragments that don't survive into French. The misconception is "a key is a string ID, any name works." The senior shape is `feature.surface.role`, one-string-one-key, named placeholders, and `t.rich` for anything with embedded markup.

**Ideal teaching artifact.** A guided puzzle (Pattern archetype): the student is shown a "junior catalog" — six wrong keys with their English values (`btn1: "Save"`, `dashboardTitle: "Dashboard"`, `inv_count_zero: "No invoices"`, `inv_count_one: "1 invoice"`, `inv_count_other: "{n} invoices"`, `welcome: "Hi, " + name`). The student rewrites each entry into the right shape using a series of small interactions: rename `btn1` to `invoices.list.actions.save`, collapse the three plural keys into one ICU message, replace the string-concat in `welcome` with a placeholder. Each fix is a `Dropdowns` choice with the correct senior shape as one option. The artifact carries the assessment — the puzzle *is* the test.

**Engagement.** The puzzle carries the recall. A confirm beat after: a 3-statement `TrueFalse` round on the rules ("one string, one key always" — true; "concatenate translated fragments when the order is predictable" — false; "use `t.rich` for messages with inline `<a>` or `<strong>`" — true).

**Components.**
- `Dropdowns` for the puzzle's fix-the-key fill-ins, with the wrong catalog shown above as a `Code` block.
- `TrueFalse` for the post-puzzle confirm.

**Project link.** The student writes `en-GB.json` and `fr-FR.json` in 18.3.3; the puzzle is the rehearsal of the discipline they apply across ~80 keys in the French catalog.

## Concept 5 — ICU `plural` with CLDR categories

**Why it's hard.** English has `one / other`; this is the entire experience of plurals for most devs and it lies. French adds `many` for ~1,000,000+ (with the `de` preposition: "1 000 000 *de* factures"). Replacing the ICU message with `{count === 1 ? '1 invoice' : count + ' invoices'}` ships and looks correct against any test fixture the dev typed by hand, then silently mistranslates the moment a French user sees a million-row report.

**Ideal teaching artifact.** A controllable simulation (new archetype — "CLDR plural probe"): a single number-input drives three side-by-side locale columns (en-US, en-GB, fr-FR), each rendering the same ICU message in real time. The student types `0, 1, 2, 5, 21, 1000000` and watches French jump categories at the million mark while English never does. Above the simulator, a small reference table shows which CLDR categories each locale uses. Below it, the ICU source-string for each locale catalog is shown as labeled `Code`. The artifact closes by inviting the student to break it — replace one fr-FR message with the naive ternary, watch `1 000 000 factures` (no `de`) render incorrectly, revert.

**Engagement.** A single `MultipleChoice` immediately after: "Why does the French catalog include a `many` branch when English only needs `one / other`?" with one right answer (CLDR defines per-language plural categories; French uses `many` for large/fractional counts) and three distractors built from common wrong intuitions ("French uses different grammar for thousands," "It's a next-intl quirk," "Plural categories are a UX choice the team makes").

**Components.**
- New `PluralProbe` component — props: `locales` (array of BCP 47 tags), `messages` (map of locale → ICU string), default `count`. Renders one numeric input above N labeled output cells. Could reuse internally for any plural-category lesson and forward-links into 18.2.2 if it's built here first.
- `MultipleChoice` for the follow-up.

**Project link.** The chapter's pluralized counter (`invoices.list.count`) is the production analog; the probe rehearses exactly the CLDR transitions the student verifies in the inspector's pluralization panel in 18.3.6.

## Concept 6 — Currency is data, formatting is locale

**Why it's hard.** Many devs conflate "what currency is this invoice in?" with "how should I format this number?" — the same value picks both. The chapter's split is structural: `invoices.currency` is a column on the row; the symbol, separator, and position come from the viewer's locale. EUR rendered to a fr-FR viewer is `1 234,56 €`; the same `EUR` value rendered to an en-US viewer is `€1,234.56`. The data didn't change, the format did.

**Ideal teaching artifact.** A 3×3 grid (Concept archetype, mirror of the inspector's currency-by-data panel): rows are currencies (USD, EUR, GBP), columns are viewer locales (en-US, en-GB, fr-FR). Same amount in every cell. The student reads the grid horizontally first — one currency renders three ways across locales — then vertically — one locale renders three currencies with locale-appropriate symbol placement, decimal mark, thousands separator. A toggle above the grid swaps `currencyDisplay` between `'narrowSymbol'`, `'symbol'`, `'code'`, and `'name'` so the student sees the four senior reach options against the same cells.

**Engagement.** A `Buckets` sort: classify five claims into "true" or "false" — "the invoice's currency follows the viewer's locale" (false), "the symbol position follows the viewer's locale" (true), "currency code is a `text` column on the invoice" (true), "the formatter needs both the amount and the currency tag" (true), "use a hard-coded `currency: 'USD'` and convert in JS" (false).

**Components.**
- New `LocaleCurrencyGrid` component — props: `currencies`, `locales`, `amount`, `displayMode`. Renders a labeled 3×3 (or N×M) grid of `Intl.NumberFormat` outputs with a small dropdown for `currencyDisplay`. Lean v1: a static `Figure` containing a hand-authored HTML table with the nine cells precomputed and the four `currencyDisplay` modes shown as four sibling tables in `TabbedContent`. Both versions carry the teaching; the bespoke version adds the toggle reflex.
- `Buckets` for the sort.

**Project link.** Lesson 18.3.4 wires this exact shape into the invoice row; the inspector's currency-by-data panel in 18.3.6 is the in-project verification rehearsed here.

## Concept 7 — DST emerges from `Temporal.Instant` + IANA tz

**Why it's hard.** Devs intuit DST as a thing the timestamp "has" — that an instant from July is "summer time" and one from January is "winter time." It's the opposite: the instant is just a UTC moment. DST is a property of `(calendar, tz)` evaluated at format time. The two seeded instants `2026-07-01T18:00:00Z` and `2026-01-01T18:00:00Z` viewed in `Europe/London` produce 7:00 PM (BST) and 6:00 PM (GMT) — same delta to UTC in the stored value, different wall-clock hours because London observes DST in summer.

**Ideal teaching artifact.** A wall-clock simulator (new archetype — "DST clock pair"). Two clock faces side-by-side, fixed on the two seeded UTC instants. A tz selector above lets the student switch viewer: `Europe/London` shows 7 PM / 6 PM; `America/New_York` shows 2 PM / 1 PM; `Pacific/Auckland` flips them — the July instant lands in NZ winter (NZST) and the January one in NZ summer (NZDT), so the relative ordering on the clock face inverts. The simulator's "show internals" toggle reveals the underlying `Temporal.Instant` (unchanged across all tz selections) versus the derived `ZonedDateTime` (which carries the tz-applied wall-clock). The artifact's load-bearing reveal is the constancy of the instant against the variability of the displayed hour.

A second beat: a small ladder diagram showing the conversion graph for the row — `timestamptz` in Postgres → `Temporal.Instant` via codec → `format.dateTime(instant, { timeZone: tz })` at the edge. The simulator shows *what* happens; the ladder shows *where* in the stack each transition lives.

**Engagement.** A `PredictOutput` round: given a third instant `2026-03-29T01:30:00Z` (during London's spring-forward transition) and `Europe/London` as viewer, predict the wall-clock string. Senior call: the formatter is unambiguous because the instant is in UTC; the trap only bites going the other way (parsing a wall-clock during a DST transition).

**Components.**
- New `DstClockPair` component — props: `instants` (two ISO strings), `timezones` (array of IANA names for the selector), optional `showInternals` toggle. Two clock-face SVGs reactive to tz selection. Forward-links: this concept appears in 18.1.1 and 18.1.4 in the source curriculum; if it's built here it pays back across the unit.
- `Figure` wrapping a hand-SVG ladder for the storage/domain/edge conversion. Reusable shape; 18.1.1 already needs the same picture, so the asset compounds.
- `PredictOutput` for the spring-forward prediction.

**Project link.** This *is* the project's load-bearing verification (Done-when clause: "Due dates across EU DST render correct zone"). The DST panel in the inspector is the simulator restated against live seeded data.

## Concept 8 — `timeZone:` is mandatory on every formatter call

**Why it's hard.** It's not a hard concept — it's a discipline. The failure mode is that omitting `timeZone:` defaults to the *runtime's* zone (UTC on Vercel, the dev's laptop locally), which means dates look correct on the dev machine and wrong in production for every user not in UTC. The senior shape: every `dateTime` call carries `timeZone: tz` where `tz` came from `getCurrentUserTimeZone()`. Treat it as a lint rule even if no linter enforces it.

**Ideal teaching artifact.** A `CodeReview`-style diff (Pattern archetype). The student is shown a junior PR adding a new "last updated" cell to the invoice row, using `format.dateTime(row.updatedAt, { dateStyle: 'medium', timeStyle: 'short' })` — missing `timeZone:`. The student leaves an inline comment naming the failure mode ("defaults to runtime tz; ships UTC in prod; every user with a non-UTC profile sees the wrong hour"). The rubric checks for the production-consequence framing, not just "missing arg." The artifact carries the assessment.

**Engagement.** A confirm beat: `Tokens` exercise on a finished invoice-page snippet where every `dateTime(` call is highlighted. Student clicks each call to verify the `timeZone: tz` argument is present; one decoy call missing the arg is the trap.

**Components.**
- `CodeReview` for the diff. Existing component, exact fit.
- `Tokens` for the confirm.

**Project link.** Audit step in 18.3.4 — grep every `dateTime(` call across `app/[locale]/`; zero hits without `timeZone:` is the green check.

## Concept 9 — Bidirectional `hreflang` with `x-default`

**Why it's hard.** Google's `hreflang` rules are pathologically silent — wrong shapes don't produce errors, warnings, or visible site behavior, just slow ranking decay six months out. The four canonical failure modes (missing self-reference, one-sided declaration, no `x-default`, canonical pointing to default) all look fine in dev. The senior reach is structural: generate the full alternates map for every page from a single helper, so the failure is unwritable rather than rare.

**Ideal teaching artifact.** A misconception-first ambush. The student is shown the rendered `<head>` of four real-world product pages (named and recognizable — pick four open-source SaaS docs sites or similar) with their actual `hreflang` tags. Three of the four have subtle errors (missing self-reference on one, one-sided on another, no `x-default` on the third). The fourth is correct. The student picks which is right; the reveal annotates each wrong site with the silent-decay consequence. Then the correct shape — three alternates plus `x-default`, fully bidirectional — is shown as the template `generateAlternates` emits.

A second beat: an N×N matrix view of the project's three locales. Rows are "page being rendered," columns are "alternate listed." All nine cells should be filled (every page lists every locale including itself) plus a `x-default` column. The matrix makes the bidirectionality visible — a missing cell is structurally obvious.

**Engagement.** A `Sequence` exercise: given a scrambled list of `<link rel="alternate" hreflang="...">` tags for the fr-FR pricing page, drag them into the correct emitted order, including the self-reference and `x-default`. The student commits the full shape, not just recognizes it.

**Components.**
- `MultipleChoice` for the "which page is correct?" picker, with four hand-authored `<head>` snippets shown as `Code` blocks above.
- `Figure` wrapping a hand-SVG/HTML N×N matrix. Single-use, but the structural visualization is hard to substitute.
- `Sequence` for the post-reveal ordering drill.

**Project link.** The inspector's source-HTML `hreflang` panel (Lesson 18.3.6) is the in-project audit; this artifact rehearses the failure modes that panel catches.

## Concept 10 — Canonical = locale-specific URL, never the default

**Why it's hard.** A senior dev's instinct is "the canonical URL is the *real* URL" — and "real" is often misread as "the default-locale version" because the default is unprefixed and feels primary. Telling Google `canonical: /` on the `/fr-FR/` page says "these are duplicates, only rank `/`" and kills French organic traffic. The fix is one rule: canonical for `/fr-FR/X` is `/fr-FR/X`, never `/X`.

**Ideal teaching artifact.** A scrubbable two-state diagram (Concept archetype). State A: every locale's page canonicalizes to the default URL. The diagram shows Google's resulting ranking model — `en-US` indexed, fr-FR and en-GB shown as "duplicate of en-US, not ranked." State B: every locale canonicalizes to its own URL. Now all three are independently rankable. The student scrubs between states and sees the indexing graph reshape. The artifact's frame: the canonical isn't telling Google *what page this is*, it's telling Google *which URL to rank*. One state is "rank one"; the other is "rank three."

**Engagement.** A `MultipleChoice` with the four canonical-shape variants for a specific URL `/fr-FR/pricing`: (a) `/`, (b) `/pricing`, (c) `/fr-FR/pricing`, (d) `/fr-FR/`. Right answer: (c). Distractors (a) and (b) are the failure mode; (d) is the off-by-one trap of canonicalizing to the locale root instead of the page.

**Components.**
- `DiagramSequence` with two scrubbable states, each a hand-SVG inside `Figure` showing Google's indexing model. Existing components carry it.
- `MultipleChoice` for the confirm.

**Project link.** Done-when clause "Canonical is locale-specific URL"; `curl /fr-FR | grep canonical` in 18.3.6 verify.

## Concept 11 — Sitemap shape: one entry per canonical path, alternates ride-along

**Why it's hard.** The intuitive sitemap shape is "one URL per page," which for three locales reads as nine entries. The correct 2026 shape is three entries (one per canonical path) with locale alternates declared inside each via `<xhtml:link rel="alternate" hreflang="...">`. Same total information, structurally different. Per-locale sitemaps are the older convention and still work but cost discoverability and double the file count.

**Ideal teaching artifact.** A side-by-side comparison (Decision archetype) of three sitemap shapes for the same site: (1) nine flat `<url>` entries — the naive shape; (2) three per-locale sitemaps with a sitemap index — the older convention; (3) three `<url>` entries with `xhtml:link` ride-alongs — the 2026 shape. Each shape is shown as actual XML. Annotations on each name what Google does with it. The third shape is highlighted as the default; the second is named with its trigger ("reach for it when your site exceeds 50,000 URLs per locale and you want per-locale crawl budgets").

**Engagement.** A `MultipleChoice` on the canonical 2026 shape: "Your site has 3 locales and 4 marketing pages. How many `<url>` entries does `sitemap.xml` contain?" Right answer: 4. Distractors: 12, 3, 1. The arithmetic locks in the "one entry per canonical path" rule.

**Components.**
- `CodeVariants` with three tabs, one per sitemap shape, each containing the XML and a short annotation. Existing component, exact fit.
- `MultipleChoice` for the count question.

**Project link.** Lesson 18.3.5 — `app/sitemap.ts` returns `MetadataRoute.Sitemap`; the inspector's sitemap preview renders the tree.

## Concept 12 — Verify by deliberate misuse

**Why it's hard.** Verification by happy-path screenshot tells you the system *can* be right; it never tells you what shape it'd be in when wrong. The senior reach is to introduce each failure mode as a single deliberate change, observe the consequence, then revert. The exercise builds the muscle of "I know what this codebase looks like in every wrong shape" — which is what makes a code review fast and durable.

**Ideal teaching artifact.** A debugging-table reference (Reference archetype): seven rows, each one a single-flag misuse the chapter introduces deliberately (remove `timeZone: tz`, hard-code `currency: 'USD'`, drop self-reference from alternates, set canonical to default URL, replace ICU plural with concat, remove `setRequestLocale`, hard-code `<html lang="en">`). Each row carries: *the flip*, *what to look for*, *which inspector panel surfaces it*, *the silent-vs-loud rating* (some failures are visible immediately, others only via the panel, others only via Lighthouse weeks later). The table is the rehearsal map for 18.3.6.

**Engagement.** A `Matching` drill: match each deliberate misuse on the left to the failure signal on the right (build-output glyph flips to dynamic, inspector hreflang panel shows missing self-reference, currency panel shows USD across all rows, etc.). The match is the post-table assessment.

**Components.**
- `Figure` containing a hand-authored HTML table for the seven rows. Single-use, but the structural format is the point.
- `Matching` for the engagement.

**Project link.** This *is* the structure of Lesson 18.3.6. The artifact is the planning surface; the lesson is the execution.

## Component proposals

- **`PluralProbe`** — single number input drives N locale columns rendering the same ICU `plural` message; configurable `locales` and per-locale `messages`. Used in Concept 5. Forward-links: 18.2.2 (the lesson that owns ICU plurals end-to-end) and any future lesson teaching grammatical features that vary across CLDR locales. Leanest v1: same shape but with a fixed number-input control and three hard-coded locale columns; skip the configurable-locales prop.

- **`DstClockPair`** — two clock-face SVGs reactive to a tz selector; same UTC instants in, different wall-clock outputs. Used in Concept 7. Forward-links: 18.1.1 (the storage/domain/edge codec lesson), 18.1.4 (DST and recurring jobs), and 19.3 (integration testing around tz fixtures). Leanest v1: two static SVG clock faces with a `select` dropdown for tz; no animation between transitions, just instant re-render.

- **`LocaleCurrencyGrid`** — N×M grid of `Intl.NumberFormat` outputs (currencies × locales) with a `currencyDisplay` toggle. Used in Concept 6. Forward-links: 18.2.3 (the `Intl.*` formatter family lesson) and any future lesson on per-locale numeric formatting. Leanest v1: drop the toggle; ship a static 3×3 `Figure` for the most common `narrowSymbol` mode, with the other three modes referenced in prose. If the toggle pulls its weight in 18.2.3, build it there.

- **`BuildOutputDiff`** — two terminal-styled panes side-by-side, marked lines tinted, for comparing build outputs (or any paired log output) where the asymmetry is the lesson. Used in Concept 3. Forward-links: 20.4 (observability, when teaching log-diff investigation), and any future lesson where a single-line change shifts a build flag. Leanest v1: skip the build of a bespoke component entirely — use `TabbedContent` with two `Code` blocks. Build the bespoke version only if Unit 20 needs the side-by-side punch.

## Build priority

`DstClockPair` carries the most teaching load across the curriculum — it serves Concept 7 here, the entire DST narrative in 18.1.1/18.1.4, and the testing fixtures in 19.3. Build first.

`PluralProbe` is the second priority — it's the one artifact that makes CLDR categories *feel* real, and 18.2.2 needs it as much as 18.3.3 does. Build alongside 18.2.2's authoring.

`LocaleCurrencyGrid` and `BuildOutputDiff` are demotable. The lean static `Figure` versions teach the concept; the bespoke components add toggle reflexes that compound only if 18.2.3 and Unit 20 actually pull them in. Defer until the forward-link materializes.

## Open pedagogical questions

- Concept 4's "guided puzzle" leans hard on `Dropdowns`. If the catalog rewrites need more than fill-in-the-blank — for example, restructuring nested plural categories — the puzzle may need a small bespoke "catalog refactor" component. Worth a check against the actual 18.2.1 lesson draft before committing.
- Concept 9's "misconception-first ambush" cites real-world product sites. Whether to use named sites (high recognition, dates the lesson) or anonymized composites (durable, weaker recognition) is a voice call the author should make.
