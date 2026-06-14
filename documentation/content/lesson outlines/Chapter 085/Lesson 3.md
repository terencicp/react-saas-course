# Lesson 3 — Format dates in profile tz and currency from data

- **Sidebar title:** Dates in tz, currency from data
- **Type:** Implementation

## Lesson framing

The student installs the senior reflex that the *right wall-clock* and the *right currency symbol* are both decided by data handed to the formatter, never by the runtime. Every invoice date renders in the viewer's profile timezone (DST-correct for free because `Temporal.Instant` + IANA zone is DST-aware by construction), every amount renders in the invoice's stored currency formatted for the viewer's locale, and a relative-due column reads naturally per language. The payoff is the seam that pre-empts the silent UTC bug: the formatter is always handed an explicit `timeZone`, so no user's data ever silently formats in the deploy region's clock.

## Codebase state

**Entry.** Lesson 2 left next-intl wired end-to-end: locale routing live, every UI string routed through `t()`, the CLDR-correct pluralized counter rendering per locale, `<html lang>` matching the prefix, the locale switcher writing profile + cookie. Catalogs (`en-GB.json`, `fr-FR.json`) are filled. `src/i18n/formats.ts` carries `dateTime.short/withTime` and `number.compact` but **not** `number.currency`. In `invoices/page.tsx` strings flow through `t()` and the count is ICU `plural`, but there is no `getCurrentUserTimeZone` read, no `nowMs`, no `dueInDaysById`; `InvoicesTable` receives only `{ rows, view, role }`. In `invoices/table.tsx` headers/status/labels are translated, but the value cells are carry-in shape: amount as `{currency} {total}`, dates via raw `toLocaleDateString()`, no date column, no due column. The `(tested by L2)` routing and plural assertions are green.

**Exit.** `formats.ts` carries `number.currency` (`style: 'currency', currencyDisplay: 'narrowSymbol'`). `page.tsx` reads `tz` via `getCurrentUserTimeZone()`, captures a stable `nowMs`, computes `today = Temporal.Now.plainDateISO(tz)` and a `dueInDaysById` map via one `today.until(row.dueDate, { largestUnit: 'day' }).days` call, and threads `timeZone`/`nowMs`/`dueInDaysById` into `InvoicesTable`. `table.tsx` formats via `useFormatter()`: the date cell with an explicit `timeZone`, the amount via `format.number(amountMinor/100, 'currency', { currency: row.currency })`, the archived-on line with `timeZone`, and a relative-due cell via `format.relativeTime`. The DST and currency-by-data inspector panels come alive. Lesson 4 (SEO) is the only remaining slice.

## Lesson sections

Render the Implementation section list from the contract: intro (no header) / **Your mission** / **Coding time** / **Moment of truth**.

### Goal + Finished result (intro, no header)

One-sentence goal in user terms: every invoice date renders in the viewer's profile timezone and every amount in the invoice's stored currency, formatted for the viewer's locale, plus a relative-due column. Then a one-paragraph (or `Screenshot` via `TabbedContent`) description of the feature working: `/invoices` as an `(en-US, America/New_York)` user shows USD `'$1,234.56'` and dates in EDT/EST; switching to fr-FR reflows the *same data* to `'1 234,56 €'` (EUR) and `'1 234,56 $'` (USD, narrow symbol); switching the user to `Europe/London` in the inspector renders `2026-07-01T18:00:00Z` as `'7:00 PM'` BST and `2026-01-01T18:00:00Z` as `'6:00 PM'` GMT. No new dependencies, no env, no setup commands — the codebase is already running from L1.

### Your mission

Coherent prose, no subsection headers, no implementation hints. Weave:

- **Feature** (user terms): move every date and money render onto the formatting seam so dates display in the viewer's profile timezone and amounts in the invoice's stored currency, formatted for the viewer's locale, with a relative "due" column.
- **Load-bearing idea:** the right wall-clock and the right currency are decided by data the formatter is handed, not by the runtime. Because the request config is prerender-safe and carries no tz, the timezone is read once on the server (`getCurrentUserTimeZone`) and threaded into the client table as a prop; each `format.dateTime` call is handed `timeZone` — omit it and the formatter falls back to the runtime tz (UTC on Vercel) and silently formats everyone's data in UTC, a bug that passes every test written without a tz-spanning fixture. `Temporal.Instant` + IANA zone is DST-aware by construction, which is why the seeded July/January instants render different wall-clock hours in London with no explicit DST code. Currency is data on the invoice (`currency: row.currency`), never hard-coded and never inferred from the viewer's locale; the symbol style is a UI decision (`narrowSymbol` for compact cells) living in the shared preset, while the currency tag rides at the call site because it is data.
- **Constraints:** zero `Date.prototype.toLocaleString` and zero raw `Intl.*` inside `app/[locale]/` — formatting goes through the `useFormatter` seam; the presets stay centralized in `formats.ts`.
- **Out of scope** (one line): live per-minute relative time (a client island is the right shape when truly needed — a server-rendered list with fresh-per-navigation data is not) and amounts beyond `Number.MAX_SAFE_INTEGER` (named, not built); Temporal arithmetic beyond the single day delta (Chapter 083 Lesson 5 owns the rest).

**Requirements** — numbered list, every item tagged `[tested]`/`[untested]`, phrased as a verifiable outcome (never a file/export). Render via `Checklist`/`ChecklistItem` with the tested/untested chip:

1. Every invoice date renders in the viewer's profile timezone — an `America/New_York` user sees EDT/EST. `[tested]`
2. The two DST-spanning instants render correctly for a `Europe/London` user — `2026-07-01T18:00:00Z` as `'7:00 PM'` BST and `2026-01-01T18:00:00Z` as `'6:00 PM'` GMT — and as `'2:00 PM'` EDT / `'1:00 PM'` EST for an `America/New_York` user. `[tested]`
3. Each amount renders in the invoice's stored currency formatted for the viewer's locale: the same EUR datum shows `'1 234,56 €'` in fr-FR; a USD datum shows `'$1,234.56'` in en-US and `'1 234,56 $'` in fr-FR (narrow symbol). `[tested]`
4. The relative-due column reads naturally per locale: `'in 3 days'` / `'5 days ago'` in en-US, `'dans 3 jours'` / `'il y a 5 jours'` in fr-FR. `[tested]`
5. Switching the profile timezone in the inspector shifts the wall-clock of every date cell without any data change. `[untested]`
6. Switching to the `(fr-FR, Pacific/Auckland)` user renders French strings with dates in NZDT/NZST — locale and timezone are independent and the combination works with no combo-specific code. `[untested]`
7. The structural audit stays green: zero `Date.prototype.toLocaleString` and zero raw `Intl.*` inside `app/[locale]/`. `[untested]`

(Tests target observable wall-clock/currency output, not formatter internals or file paths. Items 5–7 are confirmed by hand / reference solution only.)

### Coding time

One line directing the student to implement against the brief and the tests, then the hidden reference solution (writer wraps in `<details>`), organized as the files appear in the repo. Three files change; all are existing files with `TODO(L3)` markers.

Use `AnnotatedCode` for `page.tsx` and `table.tsx` (multiple parts need student focus — the tz read, the `until` call, each formatter call site); `Code` for the small `formats.ts` delta.

**`src/i18n/formats.ts`** — add the `number.currency` preset:
```ts
number: { compact: { notation: 'compact' }, currency: { style: 'currency', currencyDisplay: 'narrowSymbol' } }
```
Rationale: the narrow-symbol *display* lives in the preset so a UI-wide currency tweak is one edit; the `currency` *code* stays at the call site because it is data on the row, not a presentation choice. Callout: there is deliberately **no** `relativeTime` key — next-intl's `Formats` type has only `dateTime`/`number`/`list`/`displayName`, so adding one fails `tsc`; relative-time options ride at the call site.

**`src/app/[locale]/(app)/invoices/page.tsx`** — after `listInvoices`, read the tz once and compute the day-delta map:
```ts
const tz = await getCurrentUserTimeZone();
const nowMs = Date.now();
const today = Temporal.Now.plainDateISO(tz);
const dueInDaysById = Object.fromEntries(
  rows.map((row) => [row.id, today.until(row.dueDate, { largestUnit: 'day' }).days]),
);
```
Then thread `timeZone={tz}`, `nowMs={nowMs}`, `dueInDaysById={dueInDaysById}` into `<InvoicesTable rows={rows.map(toInvoiceRow)} … />`. Rationale callouts:
- Why the tz is read here on the server and threaded down rather than read in the request config (config is prerender-safe; a session read there would break the static locale shell — link to L2's request-config callout, don't re-explain).
- `largestUnit: 'day'` is **required** — without it the duration splits across units (months/days) and `.days` is wrong; this is the lesson's single Temporal arithmetic beat (`Temporal.Now.plainDateISO(tz).until(dueDate)`).
- The stable `nowMs` is read once (after the dynamic tz, so the clock trails a request source — Cache Components safe) so the relative-due column never drifts between server and client paint.
- Temporal instances can't cross the RSC → Client boundary, so rows serialize via `toInvoiceRow` (`createdAtMs` / `dueDateISO`) and the table reconstructs `new Date(row.createdAtMs)`.

**`src/app/[locale]/(app)/invoices/table.tsx`** (client) — via `const format = useFormatter();`:
- Date cell (`data-testid="invoice-date"`): `format.dateTime(new Date(row.createdAtMs), { dateStyle: 'medium', timeStyle: 'short', timeZone })`.
- Amount cell (`data-testid="invoice-amount"`): `format.number(row.amountMinor / 100, 'currency', { currency: row.currency })` — named `currency` preset (narrow symbol) plus the row's own currency tag.
- Relative-due cell (`data-testid="invoice-due-relative"`): a local `addDays(now, days)` helper builds the target date `now + dueInDaysById[row.id]`, passed to `format.relativeTime(target, { now, unit: 'day' })`; next-intl applies CLDR `numeric: 'auto'` internally so it reads "tomorrow"/"in N days"/"il y a N jours".
- The archived-on line also moves to `format.dateTime(new Date(row.archivedAt), { dateStyle: 'medium', timeZone })` (replacing the carry-in `toLocaleDateString()`).
- New `columns.date` and `columns.due` header cells via `t(...)` (keys already in the catalogs from L2).

Rationale callouts (one-two sentences each, covering the `[untested]` requirements — code organization, naming, error handling placement):
- Why `timeZone` is mandatory on every `dateTime` call (frame as the lint-rule discipline) and why it's threaded from the server rather than read in config — covers requirement 7's "no raw `Intl.*`" and the seam's purpose.
- Why `currencyDisplay: 'narrowSymbol'` belongs in the preset (`'name'` / `'code'` are the other options) and why the `currency` tag is data at the call site, not in the catalog.
- The `amountMinor / 100` conversion and its `Number.MAX_SAFE_INTEGER` ceiling (the out-of-scope note made concrete).
- Why the relative delta is computed server-side and `now` is stable across the render (requirement 6's locale/tz independence falls out for free — no combo code).

For `Temporal.Instant` / `Temporal.PlainDate` codecs and the profile-`timeZone` seam, **link** to Chapter 083 Lesson 1 and Lesson 3 rather than re-explaining.

Optionally include one deliberate-misuse rehearsal inline as a `CodeVariants` before/after (seam vs. omitted `timeZone`) to make the UTC bug visceral — but the actual revert-after experiment belongs in Moment of truth.

### Moment of truth

The test command and expected pass output:
```
pnpm test:lesson 3
```
Expected: a green pass for the date- and currency-formatting assertions, including the DST-spanning fixture (tests assert wall-clock and currency output, not formatter internals). Show the pass summary via `Code`.

Then a by-hand `Checklist` for what the tests don't fully cover, each item ticked as the student goes:
- `/invoices` as `(en-US, America/New_York)` shows USD `'$1,234.56'` and EDT/EST dates; switching to fr-FR reflows to `'1 234,56 €'` (EUR) and `'1 234,56 $'` (USD) with no data change.
- Inspector DST panel as a `Europe/London` user: July → `'7:00 PM'` BST, January → `'6:00 PM'` GMT; switch to `America/New_York` → `'2:00 PM'` EDT / `'1:00 PM'` EST.
- Currency-by-data panel's nine cells (three currencies × three locales) are each consistent — same amount, same currency tag, locale-specific format.
- Relative-due column reads naturally in both locales.
- The `(fr-FR, Pacific/Auckland)` user renders French strings with NZDT/NZST dates — locale and tz independent, no combo-specific code.
- **Deliberate-misuse rehearsal:** temporarily remove `timeZone` from a `dateTime` call → both DST rows render in UTC (revert after observing). Optionally also hard-code `currency: 'USD'` at the table call site → every amount renders USD regardless of the invoice's currency (revert). These are the failures the seam prevents.

## Scope

- Locale routing, catalogs, the pluralized counter, `setRequestLocale`, the locale switcher — Lesson 2 of this chapter (entry state; don't re-teach).
- `hreflang`, canonical, sitemap alternates, per-locale OG — Lesson 4 of this chapter.
- `Temporal.Instant`/`PlainDate` codecs, `timestamptz` ↔ Temporal, the profile `timeZone` field — Chapter 083 Lessons 1 and 3 (link only).
- Temporal arithmetic beyond the single relative-due day delta — Chapter 083 Lesson 5.
- `Intl.NumberFormat`/`Intl.DateTimeFormat` Temporal-native APIs and `useFormatter` construct-once mechanics — Chapter 084 Lesson 3 (link only).
- next-intl integration tests against the formatters / negotiation middleware (and the `(fr-FR, Pacific/Auckland)` decoupling fixture) — Chapter 088.
