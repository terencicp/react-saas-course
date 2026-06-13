# Lesson outline — Chapter 084, Lesson 3

## Lesson title

- **Title:** The Intl formatter family
- **Sidebar label:** The Intl.* family

## Lesson framing

This is the chapter's deepest-mechanics lesson and the daily-reach surface for **every locale-aware render** in the codebase.
Lessons 1–2 installed the *where* of i18n (keys in code, text + ICU in catalogs); this lesson installs the *engine* that turns a value (`1234.56`, a `Temporal.Instant`, a list of names) into a locale-correct string.
The senior thesis the whole lesson defends: in 2026 the native `Intl.*` family **is** the formatting layer — not a library, not `toLocaleString()` with no arguments, not `value.toFixed(2)` plus a hard-coded `'$'`.
next-intl's `useFormatter`/`getFormatter` (Lesson 5) are a thin wrapper over exactly these constructors; teaching the engine first means Lesson 5 is wiring, not new mechanics.

**Target student.** Has programming experience, just finished Chapter 083 (Temporal, `users.timeZone`, the no-arg `Intl.DateTimeFormat()` trap named but not resolved). Knows the `formatDate(value, { timeZone })` *signature* exists as a required-argument wrapper but has never seen its *body*. Knows Temporal computes a `Duration` for "3 hours ago" but was told the rendering belongs here.

**Three load-bearing mental models the student must leave with.**

1. **Every formatter shares one shape.** `new Intl.X(locales, options)` → instance; `.format(value)` → string; `.formatToParts(value)` → tokens; some have `.formatRange(a, b)`. Learn the shape once, the five formatters are variations.
2. **Construct once, reuse.** Construction is the expensive step (it loads a CLDR data slice); `.format()` is cheap. A `new Intl.NumberFormat(...)` inside a render or a sort callback is the scale bug. The defense is a tiny module-scope memo cache (`getNumberFormatter(locale, options)`).
3. **Locale is a contract, not a string.** Every constructor takes a BCP 47 tag; `'en'` is incomplete (`'en-US'` ≠ `'en-GB'` for date and currency). The profile column stores the full tag and the formatter receives it directly.

**Pain points this lesson relieves**, framed in production stakes throughout: a German customer seeing `$1,234.56` instead of `1.234,56 €`; a balance rendered with `toFixed(2)` that loses thousands separators; "3 days ago" computed from `Date.now()` math that drifts across DST; a sort that puts `item10` before `item2`; a list joined with `', '` that reads wrong in French. Each formatter section opens with the broken render it prevents.

**Where beginners go wrong (address each at its formatter).** Calling `value.toLocaleString()` with no arguments (silently uses the runtime locale + tz — the Chapter 083 Vercel-UTC bug, restated for numbers); constructing the formatter inside the render loop; hard-coding `'$'`; passing a `Date` into a Temporal codebase; calling `localeCompare` per element in a sort; auto-ticking relative time on a render timer (hydration mismatch).

**The crucial Temporal-interop correction (verified against current MDN/spec, supersedes the chapter outline).** `Intl.DateTimeFormat.prototype.format()` accepts the calendar/clock Temporal types — `Temporal.PlainDate`, `Temporal.PlainDateTime`, `Temporal.PlainTime`, `Temporal.PlainYearMonth`, `Temporal.PlainMonthDay` — and `Temporal.Instant` (MDN's `Temporal.Instant.prototype.toLocaleString` documents the exact equivalence `new Intl.DateTimeFormat(locales, options).format(instant)`, with `timeZone` passed through the options). It **explicitly rejects `Temporal.ZonedDateTime` with a `TypeError` by design** — MDN's note: use `Temporal.ZonedDateTime.prototype.toLocaleString()` or convert to `Temporal.PlainDateTime`/`.toInstant()` instead. So the app's primary path is `format(instant)` with an explicit `timeZone` (matches the `formatDate(value, { timeZone })` wrapper); `ZonedDateTime` is rendered with its own `.toLocaleString(locale, options)` (no `timeZone` option — it derives from the object's own zone) or by converting `.toInstant()` first. The chapter outline's bare `format(zonedDateTime)` example is spec-incorrect and must not be reproduced. The single fact most likely to surprise the student: passing a `ZonedDateTime` to `.format()` throws. See Scope for the exact rule.

**This lesson finally ships two implementations** the prior chapter only promised: the body of `formatDate(value, { locale, timeZone, ...options })` (Chapter 083 L3 shipped the signature) and `formatRelative(instant, { locale, now })` (Chapter 083 L5 deferred the "3 days ago" render here). Both live in `lib/format.ts` (a new repo-wide module, framed as the standalone-`Intl.*` home that Lesson 5's next-intl wrapper will later parallel for in-tree code).

**Cognitive-load sequencing.** Open with the shared shape + the cache rule (the two ideas every formatter reuses), then walk the five formatters in reach-frequency order (`NumberFormat` → `DateTimeFormat` → `RelativeTimeFormat` → `Collator` → `PluralRules` restated), then name `ListFormat`/`DisplayNames` once, then close on the "locale is a contract" rule + the audit-grep set. Each formatter is taught simplified-first (the one common call) then enriched (the options that matter), never a full option dump.

**Component strategy.** `Code` for single illustrative blocks. `AnnotatedCode` for the two wrapper bodies (`formatDate`, the cache helper) where attention must move across parts. `CodeVariants` for every broken-vs-correct beat (the lesson's spine — each formatter has one). `TabbedContent` for the cross-locale "same value, three locales" output panels (the payoff visual — show the *output strings*, not a diagram). One `ScriptCoding` (vanilla runner — `Intl.*` is native browser API, no npm/JSX needed) for hands-on number/collator play. One `MultipleChoice` or `Buckets` to check the no-arg-trap / construct-once understanding. `Term` for BCP 47, CLDR, ICU. No system diagram is warranted; the locale-aware *output* is the visual that teaches.

## Lesson sections

### Introduction (no header)

Open on the senior question from the chapter outline, concretely: a balance is the number `1234.56`. Show the three target renders side by side in prose — `$1,234.56` (en-US), `1.234,56 €` (de-DE), `1 234,56 €` (fr-FR, narrow non-breaking space) — then "3 days ago" / `il y a 3 jours` / `vor 3 Tagen`, then the sort question (does `ä` sort with `a` or after `z`?).
State the resolution: each is a *runtime, locale-dependent* decision, and the 2026 senior reach is the native `Intl.*` family — already in Node and every browser, CLDR-backed, zero dependencies.
Connect back: Chapter 083 left `formatDate(value, { timeZone })` as a signature with no body and deferred "3 days ago" to here; this lesson writes both and surveys the five formatters every SaaS reaches for daily.
Keep it to ~3 short paragraphs. Preview the end state: a `lib/format.ts` with cached, locale-and-tz-correct formatters the rest of the codebase calls.

### One shape, constructed once

Teach mental models 1 and 2 together — this is the spine the five formatters hang off.

- **The shared shape.** `new Intl.X(locales, options)` returns a formatter instance; `.format(value)` returns the string. Some add `.formatToParts(value)` (token array for styling individual parts — name the use case: wrapping the currency symbol in a `<span>`) and `.formatRange(a, b)` (ranges). Show the shape abstractly with one concrete `Intl.NumberFormat` instantiation in a plain `Code` block so the pattern is visible before any specific formatter.
- **Construct once, reuse — the why.** Construction loads a CLDR data slice and is the expensive step; `.format()` is cheap. Frame the production stake from the chapter outline: a per-row `new Intl.NumberFormat(...)` in a 1000-row table is ~double-digit ms × 1000 = seconds of wasted CPU. Cite the verified MDN note: an `Intl.DateTimeFormat` object "may decide to cache a slice of the [CLDR] database," which is exactly why you reuse the instance rather than re-calling `toLocaleString` (which rebuilds it).
- **The cache helper.** Introduce the canonical module-scope `Map` memo keyed by `` `${locale}:${JSON.stringify(options)}` ``. Use `AnnotatedCode` for `getNumberFormatter(locale, options)` — steps: (1) the module-scope `Map` (persists across calls), (2) the composite cache key, (3) the get-or-create-and-store branch, (4) return the cached instance. Note that next-intl's `useFormatter`/`getFormatter` do this internally (forward-reference Lesson 5 in one clause), so standalone code in `lib/format.ts` does it explicitly. Keep the helper generic enough that the date/collator helpers later in the lesson are obviously the same pattern.

Reasoning: front-loading the shape + cache means each formatter section can focus purely on *its* options without re-teaching instantiation or perf.

`Term`: **CLDR** (Unicode Common Locale Data Repository — the locale database the runtime bundles).

### Numbers, currency, and the toFixed bug — `Intl.NumberFormat`

The daily reach; the deepest of the five. Open with the broken render.

- **Broken-vs-correct, the spine beat.** `CodeVariants`: left tab `` `$${value.toFixed(2)}` `` → `$1234.56` (no grouping, hard-coded symbol, wrong for every non-USD account and every non-en locale); right tab `new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value)`. First sentence of each variant names the failure / the fix. This is the lesson's `value.toFixed(2)` is-the-bug-class moment.
- **The five styles, simplified-first.** Teach `style` as the primary knob:
  1. **`'currency'`** — needs `currency` (the ISO 4217 code). Stress: **the currency code is *data*** (`invoice.currency`), never a UI constant. `currencyDisplay`: `'symbol'` (default), `'narrowSymbol'` (`'$'` not `'US$'` — senior default for compact UI), `'code'`, `'name'`.
  2. **`'percent'`** — input is the *fraction* (`0.15` → `'15%'`); the classic bug is passing `15` and getting `1,500%`. Call this out.
  3. **`'decimal'`** — with `minimumFractionDigits`/`maximumFractionDigits` for fixed precision.
  4. **`'compact'`** via `notation: 'compact'` → `'12K'`, `'1.7M'`; pair with `compactDisplay`. Use case: KPI tiles, dashboards.
  5. **`'unit'`** with `unit: 'kilometer' | 'megabyte' | 'hour'`.
- **Cross-locale payoff.** `TabbedContent` with three tabs (en-US / de-DE / fr-FR), each showing the *output strings* for the same inputs across currency, percent, and compact. Caption each tab. Pedagogical goal: make "same code, locale-correct output" viscerally concrete — this is the whole point of the family in one view. (Show output text, not a diagram engine.)
- **Senior rule, stated.** Every currency / percent / large-number render goes through `Intl.NumberFormat`; `value.toFixed(2)` and string-concatenated symbols are the bug class.
- **Guard the seam.** `formatter.format(NaN)` returns a locale-specific "NaN" string — guard nullable/NaN inputs at the wrapper, don't let them reach the formatter.

`Term`: **BCP 47** (the IETF tag standard — `language-REGION`, e.g. `en-US`); **ISO 4217** (three-letter currency codes — `USD`, `EUR`).

### Live: format a balance and a percent

Place immediately after `NumberFormat` so the student practices the syntax while it's fresh.

`ScriptCoding`, **vanilla runner** (`Intl.*` is a native browser global — no npm, no JSX, instant boot).
- `instructions`: implement `formatMoney(amountInCents, currency, locale)` that returns a correctly grouped currency string, and `formatPercent(fraction, locale)`.
- `starter`: stubs with a `// your code here` and a hint that cents must be divided by 100.
- `tests`: assert `formatMoney(123456, 'USD', 'en-US')` contains `'1,234.56'` and `'$'`; `formatMoney(123456, 'EUR', 'de-DE')` contains `'1.234,56'`; `formatPercent(0.15, 'en-US')` is `'15%'`. Use `.toContain` (not `.toBe`) for the currency assertions because the exact symbol placement and whitespace vary — note this in the test comments so the grading is robust across engine/CLDR versions.
- Goal: cement that the locale + currency arguments do the work, and that percent takes a fraction.

### Rendering Temporal values — `Intl.DateTimeFormat`

This is the section that pays off Chapter 083. The student arrives holding `Temporal.Instant` / `PlainDate` / `ZonedDateTime` in memory and must render at the edge.

- **The Temporal-interop rule, taught precisely (the verified correction).** `Intl.DateTimeFormat.prototype.format()` accepts `Temporal.Instant` (via the documented `format(instant)` equivalence, `timeZone` passed through options) and the plain calendar/clock types (`PlainDate`, `PlainDateTime`, `PlainTime`, `PlainYearMonth`, `PlainMonthDay`) — **but `Temporal.ZonedDateTime` throws a `TypeError`** by design. Teach the two paths:
  - **Primary (the app's default):** `formatter.format(instant)` where the formatter carries the `timeZone`. This is what `formatDate` does.
  - **`ZonedDateTime`:** use `zdt.toLocaleString(locale, options)` (derives `timeZone` from the object — do *not* pass `timeZone`), or `zdt.toInstant()` then format. Make the "ZonedDateTime is not accepted by `.format()`" fact explicit and memorable — it's the most likely runtime surprise.
  Use `CodeVariants` (label tabs "Instant + timeZone", "ZonedDateTime → toLocaleString") to set the two correct shapes side by side, with a one-line note that passing a `ZonedDateTime` to `.format()` throws.
- **The `timeZone` option is mandatory — restated from 083 L3.** A formatter built without `timeZone` defaults to the *runtime's* zone: UTC on Vercel, the dev's local on `pnpm dev` — silently wrong, no error. This is the same bug class as the no-arg trap; the structural defense is the required-argument wrapper. No `new Date()`, no `.toISOString()` round-trip anywhere.
- **Ship `formatDate`'s body (the payoff).** `AnnotatedCode` on `formatDate(value, { locale, timeZone, ...options })` in `lib/format.ts`. Steps: (1) the options object *requires* both `locale` and `timeZone` (the shape that makes the bug unwriteable — tie back to 083 L3's promise), (2) pull a cached `Intl.DateTimeFormat` via the `getDateFormatter` cache, (3) `return formatter.format(value)` for `Instant`/`PlainDate`. Keep the body small; the lesson is the *shape*, not exhaustive overloads. (If handling `ZonedDateTime` inside the wrapper, branch to `.toLocaleString` — keep this a one-line aside, not the focus.)
- **Presets vs. component options.** `dateStyle` (`'short' | 'medium' | 'long' | 'full'`) paired with `timeStyle` is the senior default — least code, locale-idiomatic. Component options (`year`, `month`, `day`, `hour`, …) for fine control. **Mixing `dateStyle` with a component option throws** — call this out as a common error.
- **`formatRange(a, b)`.** Renders date ranges idiomatically: `'Jan 5 – 7, 2026'` (en-US) vs `'5–7 janv. 2026'` (fr-FR). Use cases: booking windows, billing periods, event durations. One `Code` block.
- **Cross-locale output panel.** `TabbedContent` (en-US / de-DE / ja-JP) showing the same `Instant` rendered with `dateStyle: 'long'` — make month-name and ordering differences concrete (and show a non-Latin script with ja-JP so the student sees the engine handles it).

Reasoning: `DateTimeFormat` is where the Temporal substrate and the formatter family meet; getting the interop rule exactly right is the single highest-value correction in the lesson.

### "3 days ago" the right way — `Intl.RelativeTimeFormat`

Pays off the boundary Chapter 083 L5 explicitly drew ("L5 computes the `Duration`; 084 L3 renders it").

- **The call.** `new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-3, 'day')` → `'3 days ago'` (en-US), `'il y a 3 jours'` (fr-FR), `'vor 3 Tagen'` (de-DE). `numeric: 'auto'` enables special-cased words ("yesterday", "tomorrow", "now"); `'always'` always forces the numeric form. Show both with a `CodeVariants` or a compact `Code` pair so the difference is concrete.
- **Pairing with Temporal — ship `formatRelative`.** From 083 L5, `instant.since(now)` / `until(now)` returns a `Temporal.Duration`. The render needs: the largest non-zero unit (the formatter takes one unit) and the sign (negative for "ago"). `AnnotatedCode` on `formatRelative(instant, { locale, now })`: (1) compute the `Duration` via `since`, (2) pick the largest non-zero unit + its signed value, (3) feed `(value, unit)` to a cached `Intl.RelativeTimeFormat`. Keep the unit-picking logic small and readable; this helper hides the duration→unit mapping so callers write one line. Explicitly note the `Temporal` import comes from `lib/temporal.ts` (Chapter 083's single-import-path rule), not the polyfill package.
- **The stable-`now` watch-out (production stake).** Computing "3 days ago" from `Date.now()` on every render, or auto-ticking on a timer that re-renders the tree, produces **hydration mismatches** (server `now` ≠ client `now`) — tie back to the Chapter 030 hydration trap named in 083. The senior shape: a **stable `now` anchor per request** passed in as an argument (never read inside the helper); for live-updating timestamps, a small client island re-renders on its own interval. State this as the rule, don't build the island here.
- **Zero-guard.** `numeric: 'always'` on a value that reaches zero shows "in 0 seconds" — guard the zero case (fall to "now"). One clause.

### Locale-aware sorting and search — `Intl.Collator`

Open with the broken sort: `['item2', 'item10'].sort()` → `['item10', 'item2']` (lexicographic), and `ä` sorting wrong.

- **The call.** `new Intl.Collator(locale)` returns a comparator; pass `collator.compare` straight to `Array.prototype.sort`. Show `items.sort(collator.compare)` — the idiomatic shape.
- **The options that matter (simplified-first).**
  - **`sensitivity`**: `'base'` (ignores accents *and* case — senior default for **search/equality**), `'accent'` (distinguishes accents, ignores case — senior default for **sorting** with diacritics), `'case'`, `'variant'` (default).
  - **`usage`**: `'sort'` (default, ordering) vs `'search'` (substring/equality matching).
  - **`numeric: true`**: natural-numeric sort so `'item2'` precedes `'item10'` — senior default for filenames and version strings. This is the headline fix; lead the options with it.
- **The `localeCompare` anti-pattern (the spine beat).** `CodeVariants`: left `array.sort((a, b) => a.localeCompare(b))` — constructs a *fresh collator per comparison*, O(n log n) constructions; right `const collator = new Intl.Collator(locale, { numeric: true }); array.sort(collator.compare)` — one construction. Ties directly back to "construct once, reuse." First sentence names the perf failure.

### The plural engine, restated — `Intl.PluralRules`

Short section — close the loop opened in Lesson 2 without re-teaching ICU.

- Lesson 2 taught that every ICU `plural` message delegates to `Intl.PluralRules` under the hood. Here, name it as a **standalone formatter** for the rare case ICU doesn't fit: choosing between two non-text outputs by plural category (e.g. picking one of two icons, or a CSS class) where there's no string to put in a catalog.
- The call: `new Intl.PluralRules(locale).select(n)` → a CLDR category string (`'one'`, `'other'`, `'few'`, …). Cardinal by default; `{ type: 'ordinal' }` for ordinal categories (the engine under `selectordinal`).
- Restate the Lesson 2 boundary explicitly so the student doesn't reach for this when ICU is right: **if the variant is text, it belongs in the catalog as an ICU `plural` string, not a `PluralRules` branch in component code.** Direct use is the exception.

Reasoning: keep this tight — its job is to connect Lesson 2's "engine" to the family surface and draw the when-not-to-use boundary, not to re-teach plurals.

### Two more in the family — `Intl.ListFormat` and `Intl.DisplayNames`

Name once each (chapter-outline scope: "named once"), with the one call and the one reason to reach.

- **`Intl.ListFormat`.** `new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' }).format(['Alice', 'Bob', 'Carol'])` → `'Alice, Bob, and Carol'` (en-US) / `'Alice, Bob et Carol'` (fr-FR). Types: `'conjunction'` ("and"), `'disjunction'` ("or"), `'unit'`. Rule: whenever joining a translatable list, never `array.join(', ')` — the separator and final conjunction are locale-specific.
- **`Intl.DisplayNames`.** `new Intl.DisplayNames(locale, { type: 'language' }).of('fr')` → `'French'`. Two senior reaches: (1) the **locale picker** renders each option in *its own* locale (`new Intl.DisplayNames('fr', { type: 'language' }).of('fr')` → `'français'`) — forward-reference Lesson 4's switcher in one clause; (2) region/currency labels rendered in the *user's* locale.

Use a single `CardGrid` (two cards) or compact prose + one `Code` each — these are reference items, not deep teaches.

### Locale is a contract, and the audit grep

Closing section that hardens the discipline and gives the student a reviewer's checklist.

- **"Locale is a contract, not a string."** Restate mental model 3 with the stake: `'en'` produces different date/currency conventions than `'en-US'` vs `'en-GB'`. The profile column (`users.locale`, Lesson 4) stores the full BCP 47 tag; the formatter receives it directly; a bare `'en'` stored value is a smell. (Name `users.locale` as the source-of-truth column without building it — Lesson 4 owns it.)
- **The audit-grep set** (from the chapter outline's watch-outs, consolidated as the section that *teaches the defense*, not a tip dump): `value.toLocaleString()` / `Date.prototype.toLocaleString()` with no arguments; `Intl.X()` constructed inside a render or sort callback; hard-coded currency symbols; a `Date` passed where the codebase uses Temporal (convert at the seam); `.localeCompare` inside a sort; `array.join(', ')` on a translatable list; relative time from `Date.now()` math.
- **Comprehension check.** `MultipleChoice` (or `Buckets`) targeting the two highest-value traps: "which of these renders silently wrong on Vercel?" (the no-arg `toLocaleString` / no-`timeZone` cases) and/or sort the snippets into "construct-once-correct" vs "constructs-per-call-bug" buckets. Goal: verify the student can *spot* the bug class, which is the senior skill the lesson sells.

### External resources (optional)

One or two `ExternalResource` cards: MDN `Intl` namespace reference; optionally the `Intl.NumberFormat`/`DateTimeFormat` MDN pages. Keep to canonical docs.

## Scope

**Prerequisites — redefine concisely, do not re-teach.**
- `Temporal.Instant` / `PlainDate` / `ZonedDateTime` and that the app holds them in memory (Chapter 083) — name them; the lesson's job is *rendering* them, not modeling them.
- `users.timeZone` lives on the profile and is read from the session; the no-arg `Intl.DateTimeFormat()` / no-`timeZone` bug was named in 083 L3 — restate in one clause as the bug this lesson's required-argument wrapper defends against.
- `formatDate(value, { timeZone })` *signature* shipped in 083 L3 — this lesson writes the *body*.
- `lib/temporal.ts` is the single Temporal import path (083) — `formatRelative` imports `Temporal` from there.
- A `Temporal.Duration` is what `since`/`until` returns (083 L5) — this lesson consumes it; do not re-teach Temporal arithmetic.

**Explicitly out of scope (owned elsewhere — name once, do not teach):**
- **Translation-key / catalog discipline** — Lesson 1.
- **ICU MessageFormat (`plural`/`select`/`selectordinal`, CLDR categories, `#`)** — Lesson 2. `Intl.PluralRules` appears here only as a standalone formatter + the engine-under-ICU callback; do not re-teach plural messages.
- **Inline ICU number/date skeletons** (`{x, number, ::currency/USD}`) — Lesson 2 deferred these here; the lesson's stance (per the 084 L2 continuity note) is to frame the explicit `Intl.*` call at the seam as the reach, and ICU skeletons as the form *not* to default to. Name the skeleton once, point at the explicit formatter as preferred, move on.
- **Locale negotiation / resolution chain** (URL → profile → cookie → `Accept-Language` → default), `users.locale` column build-out, `@formatjs/intl-localematcher`, `Intl.LocaleMatcher` (still an early-stage TC39 proposal in 2026, not native) — Lesson 4. This lesson treats "the resolved locale" as a given string passed to `formatX`; name `users.locale` as the source column without wiring it.
- **next-intl's `useFormatter` / `getFormatter`** — Lesson 5. Name once as "the in-tree wrapper over exactly these constructors"; the standalone `lib/format.ts` helpers are this lesson's deliverable. Do **not** introduce `NextIntlClientProvider`, `getRequestConfig`, `defineRouting`, or `setRequestLocale` here.
- **`hreflang` / `alternates.languages` / per-locale SEO** — Lesson 6.
- **BiDi / RTL / `dir`** — out of chapter scope; do not mention beyond at most one clause if unavoidable.
- **`Intl.Segmenter`** — out of daily-reach scope (depth is Chapter 001 L4); name once at most if grapheme-truncation comes up, otherwise omit.
- **`Intl.NumberFormat` V3 options** (`roundingMode`, `roundingPriority`, `trailingZeroDisplay`) — baseline-available in 2026 but niche; name `roundingMode`/`minimum`/`maximumFractionDigits` only as far as fixed-precision decimals need; do not survey the full V3 surface.
- **CLDR's full per-language plural/collation tables** — link out, never enumerate.

**Boundary reminders for the writer:**
- Do not reproduce the chapter outline's `format(zonedDateTime)` example — it is spec-incorrect (`ZonedDateTime` is rejected by `.format()`). Teach the `.toLocaleString()` / `.toInstant()` paths instead.
- Do not build the live-updating relative-time client island — state the stable-`now` rule and defer the island.
- Keep `lib/format.ts` as the home for standalone helpers; do not present next-intl's formatter hooks as already wired.

## Code conventions notes

Aligned with `Code conventions.md`:
- **§Internationalization** — the lesson's "never inline-call `Intl.*` inside a component; go through a wrapper so locale/tz resolution stays consistent" matches the convention exactly. Note: the convention's *production* form routes through next-intl's `useFormatter`/`getFormatter`; this lesson ships the **standalone `lib/format.ts`** form deliberately, because next-intl wiring is Lesson 5. Flag this to downstream agents: `lib/format.ts` is the for-code-outside-the-react-tree home (utilities, tests, CLI), and Lesson 5 will introduce the in-tree hook as the parallel reach — both wrap the same constructors. This is an intentional staging divergence, not a contradiction.
- **§Async, cancellation, and time** — `Temporal` is the domain default; `Date` only at seams. The lesson's "pass a `Date` into a Temporal codebase = type-discipline leak, convert at the seam" reinforces this; `formatRelative` imports `Temporal` from `lib/temporal.ts`.
- **§Function form / §Naming** — `formatDate`, `formatRelative`, `formatMoney`, `getNumberFormatter`, `getDateFormatter`, `getCollator` are verb-led intent names; exported functions get return-type annotations; two-positional-max → the `{ locale, timeZone, ...options }` options object on `formatDate`. `SUPPORTED_LOCALES`-style constants are `SCREAMING_SNAKE_CASE` (referenced, not defined here).
- **§TypeScript** — `as const` for any literal option tuples; locale typed as the BCP 47 string the contract demands.
- **Module shape** — `lib/format.ts` is a pure helper module (no React imports). If any helper needs `server-only` framing, note it is *not* server-only (formatters run on both sides) — unlike the `lib/` SDK-adapter carve-outs.
