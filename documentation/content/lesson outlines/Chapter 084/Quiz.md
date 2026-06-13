sources:
  84.1: Keys, catalogs, and the no-concatenation rule
  84.2: "ICU MessageFormat: plurals, select, gendered forms"
  84.3: The Intl.* formatter family
  84.4: The locale resolution chain
  84.5: Wiring next-intl into Next.js 16
  84.6: hreflang, per-locale canonicals, and SEO

questions:
  - source: 84.1
    question: |
      Forty buttons across your app read "Save" in English. A teammate proposes routing all of them through a single `t('common.save')` key to avoid duplication. What is the senior call?
    choices:
      - text: |
          Mint a separate key per surface. The settings page's "Save" (save preferences) and the checkout's "Save" (place the order) may need different words in German — a shared key takes that choice away from the translator.
        correct: true
      - text: |
          Use the shared `common.save` key. The English text is identical, so deduplicating is good engineering and keeps the catalog small.
        correct: false
      - text: |
          Use `common.save` but override it per page in component code with a conditional, so each surface can diverge when needed.
        correct: false
    why: |
      Key reuse follows *meaning*, not English spelling. The test is "could a translator legitimately want these to differ in some language?" For the two "Save" surfaces the answer is yes, so they get separate keys — even though the English is identical today. Branching in the component reintroduces the very logic the catalog is supposed to own.

  - source: 84.2
    question: |
      You are authoring the catalog string for "You have N unread messages." Which branch table is correct across *every* language, not just English?
    choices:
      - text: |
          ```text
          {count, plural, =0 {No unread messages} one {# unread message} other {# unread messages}}
          ```
        correct: true
      - text: |
          ```text
          {count, plural, =0 {No unread messages} =1 {{count} unread message} other {{count} unread messages}}
          ```
        correct: false
    why: |
      Two traps in the wrong answer. `=1` matches only the literal number 1, so languages whose `one` category also covers 21, 31, … silently fall to `other` — use the CLDR keyword `one`, reserving exact matches for wording overrides like `=0`. And inside a branch the count is `#` (locale-formatted), not `{count}` (raw, and here doubled-up risk); `{count}` ships ungrouped numbers like `1234` instead of `1,234`.

  - source: 84.3
    question: |
      A 1,000-row invoice table renders each amount with `value.toLocaleString(locale, { style: 'currency', currency })`. The output is correct for every user. What is the problem, and what fixes it?
    choices:
      - text: |
          It is a scale bug: `toLocaleString` builds a throwaway formatter on every call, loading a CLDR slice each time. Construct one `Intl.NumberFormat` (behind a module-scope cache) and reuse it across all rows.
        correct: true
      - text: |
          It is silently wrong output: `toLocaleString` ignores the `currency` option, so reach for `Intl.NumberFormat` to get the symbol right.
        correct: false
      - text: |
          Nothing is wrong — `toLocaleString` is the recommended shortcut and the runtime caches the formatter internally between calls.
        correct: false
    why: |
      `toLocaleString` produces correct output but constructs a fresh formatter on every invocation — fine once, a real CPU cost across a thousand rows. The defense is the family's core rule: construct once, reuse, via a `getNumberFormatter(locale, options)` memo. This is "correct but wasteful," distinct from the "silently wrong" no-argument trap (`toLocaleString()` with nothing passed).

  - source: 84.4
    question: |
      A signed-in user whose `users.locale` is `'fr-FR'` opens a shared link to `/de-DE/billing` from a browser sending `Accept-Language: en-US`. Which locale renders?
    choices:
      - text: |
          `de-DE` — the URL prefix is the most explicit signal and sits at the top of the chain, above even a saved profile preference.
        correct: true
      - text: |
          `fr-FR` — a signed-in user's saved profile is the most deliberate, durable preference and should win over a URL someone else shared.
        correct: false
      - text: |
          `en-US` — the browser's `Accept-Language` reflects what this device is actually configured for right now.
        correct: false
    why: |
      Resolution is a priority chain, not a vote: URL prefix → profile → cookie → `Accept-Language` best-match → default, first hit wins. A shared localized link is the most explicit request anyone can make, so it beats the profile — for the length of that link the user asked for something specific. The header is only rung 4, a hint, never the truth.

  - source: 84.5
    question: |
      Which statements about wiring next-intl into the Next.js 16 App Router are correct? (Select all that apply.)
    choices:
      - text: |
          Every `page.tsx` and `layout.tsx` under `app/[locale]/` must start with `setRequestLocale(locale)`; skip it in any one and that route silently converts to dynamic rendering with no error or warning.
        correct: true
      - text: |
          In next-intl v4, mounting `<NextIntlClientProvider>` with no `messages` prop forwards the entire catalog into the client bundle — scope it to the smallest subtree and `pick` only the namespaces those client components use.
        correct: true
      - text: |
          Server Components must use `getTranslations` because `useTranslations` is a hook that only runs in Client Components.
        correct: false
    why: |
      `setRequestLocale` is the most common production mistake — it writes the locale to a per-request store so downstream calls resolve without a dynamic header read, re-enabling static rendering; omitting it regresses perf invisibly. The v4 provider auto-inherits *all* messages when given no `messages` prop, so scope and `pick`. And `useTranslations` is synchronous but runs in *both* Server and Client Components; `getTranslations` is for code *outside* the render tree (`generateMetadata`, Server Actions, route handlers).

  - source: 84.6
    question: |
      You ship `/billing` (English, default) and `/fr-FR/billing` (French). On the French page, what should `alternates.canonical` point to?
    choices:
      - text: |
          `/fr-FR/billing` — each locale variant is its own canonical, so the French page claims itself as authoritative.
        correct: true
      - text: |
          `/billing` — English is the source of truth and the translations are derivatives, so all variants should canonicalize to the original.
        correct: false
    why: |
      Pointing the French page's canonical at `/billing` tells Google "this French page is a duplicate of the English one — don't index it," and Google obliges, deleting your translation from French results. Each variant is its own canonical; `hreflang` (not the canonical) declares the relationship to the sibling languages. The `generateAlternates(locale, href)` helper sets this correctly by construction.
