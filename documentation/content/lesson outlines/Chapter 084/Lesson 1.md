# Keys, catalogs, and the no-concatenation rule

- **Title (h1):** Keys, catalogs, and the no-concatenation rule
- **Sidebar label:** Keys and catalogs

---

## Lesson framing

This is the discipline-installation lesson of the i18n chapter. It teaches **no syntax the runtime forces on you** — `next-intl` wiring is lesson 5, ICU is lesson 2, `Intl.*` is lesson 3. What it teaches is a **shape**: every user-visible string is a *key* the application code holds, paired with a *translation entry* in a per-locale catalog the translator owns, with *named interpolations* the catalog can reorder, and **never** runtime concatenation across translatable fragments. The senior thesis from the chapter framing — *i18n as a discipline before it's a feature; a single-locale launch ships through the same shape so the second locale is one PR, not a refactor* — is the spine of the whole lesson.

Brainstorm conclusions that shape the whole lesson:

- **Lead with the bug, not the API.** The hook is a concrete naive reach (`'Bienvenue, ' + user.name + ...`) that *looks* like it works and falls apart on the second locale. The student must *feel* the pain (frozen word order, hand-rolled plurals, no translator landing spot) before the discipline reads as relief instead of ceremony. This is the "decisions before syntax" filter: the senior question is *what happens to this string when a translator who doesn't read code, doesn't run the app, and inverts subject-and-verb in their language gets hold of it?*
- **The mental model is a three-party contract, not a function call.** Three roles touch a string: the **engineer** (writes the key + passes named values), the **catalog** (the per-locale JSON, the wire format), the **translator** (edits text inside the catalog, never opens code). Every rule in the lesson is downstream of "which party owns what." Keep returning to this triangle — it is the load-bearing diagram of the lesson.
- **Frame in production stakes.** The cost of getting this wrong is not "ugly French" — it's a refactor across hundreds of components when the second locale lands, broken word order shipped to paying customers, and a translation pipeline that can't function because the strings are welded into source-language grammar. The discipline is cheap to adopt on day one and brutally expensive to retrofit.
- **Anchor to what the student already knows.** Chapter 083's spine was *"pass `locale` / `timeZone` explicitly to every formatter, never derive per-request"* — the exact same shape (an explicit, validated input threaded to the edge) reappears here for translatable text. The Server/Client component boundary (Chapter 030) is the other anchor: translations cross it transparently, which is worth stating plainly because students will worry about it. Reuse these anchors verbatim so the chapter feels continuous.
- **Stay disciplined about scope — this lesson is mostly "the rule," with previews clearly labeled.** ICU plurals, `t.rich` depth, and locale negotiation each get a *short* preview framed as "the discipline exists; the syntax is lesson N." Do not teach the syntax. The risk is this lesson bloating into lessons 2/5; resist it. Every preview ends with a pointer.
- **The library is `next-intl`, but keep it light here.** The student hasn't wired it yet (lesson 5). Show `useTranslations` / `getTranslations` / `t.rich` call shapes *as the form they'll write*, name the library once, and move on. Do not explain the file shape, providers, or middleware — that is lesson 5's job. Naming the API at the call site (not as preamble) is the "teach the form they will write" filter.
- **Cognitive-load staging.** Build the model in one direction: (1) the bug, (2) key + catalog split, (3) named placeholders, (4) the catalog file format, (5) the reuse/completeness rules that govern catalog *content*, (6) the audit (what *is* a key), (7) the boundary (server/client) and previews. Each section adds exactly one idea to a model the student already holds.
- **Visual-first where the split is the point.** Two diagrams carry real load: the three-party contract triangle, and a side-by-side "naive concatenation vs. key+catalog" data-flow. Code components (`CodeVariants`, `AnnotatedCode`) carry the rest. Two interactive checks (a `Buckets` audit drill, a `Tokens` concatenation-spotting drill) let the student *apply* the rule, which is the whole point of a discipline lesson.

Estimated student time: 40-50 min. Sentence case throughout.

---

## Lesson sections

### Introduction (no header)

Open under the `<CourseProgressBar>` with the concrete scene, not a definition. A component renders one warm, ordinary line:

```tsx
<p>Welcome, {user.name}! You have {count} unread messages.</p>
```

Ship date moves up; French is now required. Show the naive reach a competent-but-i18n-naive dev writes:

```ts
'Bienvenue, ' + user.name + '! Vous avez ' + count + ' messages non lus.'
```

Then land the senior question implicitly by listing what just broke, in plain terms:
- The word order is frozen in **English's** order; German would put the verb last and many languages reorder subject/object — concatenation can't move the pieces.
- The plural (`message` vs `messages`) is hand-rolled in JS; Russian needs four forms, Arabic six — this branch will be wrong in most languages.
- There is **no place for a translator to land**. The French text lives inside `.ts` source, welded between `+` operators. A translator who doesn't read code can't touch it.

State the lesson's promise: by the end you'll hold a single shape — **key in code, text in a per-locale catalog, named slots the catalog reorders, zero concatenation** — that makes the first locale and the fortieth locale the same amount of work. Connect back to Chapter 083: same move as timezone — an explicit, validated input threaded to the edge, never welded into the code. Keep it to ~5 short paragraphs/bullets; warm and terse.

Reasoning: the pedagogical guidelines demand the senior question be implicit in the intro and the topic be motivated by a concrete problem. The naive snippet is the emotional hook; everything after is relief.

**Tooltip (`Term`) candidates in this section:** `i18n` (numeronym: "i" + 18 letters + "n", internationalization), `locale` (a language+region identity like `fr-FR` that selects formatting and translation conventions — full definition deferred to lesson 4, one-line here).

---

### The three parties a string passes through

Install the mental model before any rule. Three roles, three responsibilities:

- **Engineer** — writes a *key* (`t('inbox.unread.count')`) and passes *named values* (`{ count }`). Never writes the user-facing text; never writes the translation.
- **Catalog** — the per-locale JSON file (`messages/en.json`, `messages/fr.json`). The **wire format** between engineer and translator. Holds the actual text and the ICU logic (previewed later).
- **Translator** — opens the catalog, edits the text *inside* the entries, reorders named slots to fit their grammar. Never opens component code, never runs the app.

State the load-bearing line from the chapter framing verbatim in spirit: **translation keys are the wire format; strings are the rendered output.** Application code holds `t('invoice.pastDue.title')`; the catalog holds the localized text; concatenation in component code is the bug class this chapter exists to prevent.

**Diagram — the three-party contract triangle.** Build with `<ArrowDiagram>` inside `<Figure expandable={false}>` (ArrowDiagram must opt out of expand per the Figure docs). Three boxes: **Component code** (holds `t('inbox.unread.count', { count })`), **Catalog `en.json` / `fr.json`** (holds `"{count, plural, ...}"`), **Translator** (edits inside the catalog). Arrows: code → catalog labeled "looks up by key"; translator → catalog labeled "edits text + reorders slots"; catalog → rendered UI labeled "returns localized string". Pedagogical goal: make "who owns what" spatial and memorable so every later rule has a home. Keep horizontal, compact (vertical-space constraint).

Reasoning: a discipline lesson needs one organizing image. Every subsequent rule ("named placeholders," "one string per key," "what's not a key") is a property of one edge of this triangle; referencing the triangle keeps cognitive load flat.

---

### Keys in code, text in the catalog

The first concrete rule. Replace the concatenation with the shape:

Use `<CodeVariants>` for the before/after (the doc's recommended use: incorrect vs. correct).
- **Variant "Concatenation" (`del`-marked):** the `'Bienvenue, ' + user.name + ...` line. Prose: *frozen word order, hand-rolled plural, no translator landing spot* — one sentence.
- **Variant "Key + named values" (`ins`-marked):** `t('inbox.greeting', { name: user.name, count })` in the component, beside the `en.json` entry `"greeting": "Welcome, {name}! You have {count} unread messages."`. Prose: *the component names the slots; the catalog owns the sentence and can reorder.*

Then show the call shapes the student will actually write — name `next-intl` once here, defer wiring to lesson 5:
- Client Component: `const t = useTranslations('inbox'); ... t('greeting', { name, count })`
- Mention `getTranslations` exists for the async/server side; full treatment lands in "Translations cross the server/client boundary" below.

Keep the catalog value's ICU plural (`{count, plural, ...}`) *out* of this section — here `count` is just a named slot. State explicitly: "the plural rules live in the catalog too; that's lesson 2 — for now `{count}` is a named slot like `{name}`." This is deliberate staging to avoid front-loading ICU.

**Tooltip (`Term`) candidates:** `interpolation` (substituting a runtime value into a string at a named slot), `catalog` (the per-locale file mapping keys to translated text — also called a message file or translation file).

Reasoning: `CodeVariants` is purpose-built for incorrect/correct framing and keeps both forms on screen for direct contrast. Showing the component call and the catalog entry *together* makes the key↔entry correspondence concrete.

---

### What a key looks like

Teach the key-naming convention as a senior decision with a failure mode, not a style rule.

- **Flat, namespaced dot-paths:** `invoice.pastDue.title`, `inbox.unread.count`, `auth.signIn.cta`. The namespace groups by feature and **mirrors the feature folder** (per code conventions); the leaf names the *role* of the string (title, cta, count), not its English text.
- **Two or three levels, never five.** Five-level keys become unsearchable and the namespacing stops paying for itself. State the ceiling explicitly.
- **Keys are stable; catalog values are mutable.** You can rewrite the English copy without touching a single component; you rename a key only as a coordinated change (component + *every* catalog file). This stable/mutable split is the reason keys aren't the English text (next section).
- **The senior reach for safety:** keys are validated at build time — `next-intl`'s `IntlMessages` global type (previewed, lesson 5) makes a misspelled key a *compile error*, and lint tooling (`eslint-plugin-i18n-json` named once) flags orphaned/missing keys. Frame this as "the compiler guards the contract" — don't teach the setup.

**Exercise — `Dropdowns` (inline prose mode).** A short paragraph describing three real strings ("the heading of the past-due-invoice banner", "the label on the sign-in submit button", "the unread-count line in the inbox"), each with a `<DropdownChoice>` picking the best key from plausible options. Decoys: English-text-as-key (`t('Welcome back!')`), locale-baked-in (`fr.welcome`), five-levels-deep, and the leaf naming the value instead of the role. Goal: the student practices *recognizing* a well-formed key and rejects the common malformations in one pass. This is lighter-weight than a coding sandbox and exactly fits a naming-convention check.

Reasoning: key naming is where beginners drift (English-as-key, over-nesting). A `Dropdowns` drill forces the discrimination cheaply. Naming the type-safety/lint payoff here motivates *why* keys are worth the indirection.

---

### Named placeholders, never positional

Why the slots are named, and why that single choice is what makes translation possible.

- A named slot (`{count}`, `{name}`) carries **meaning** and a **stable identity**. The French value `"Vous avez {count} messages non lus."` keeps the name and **moves it to a different position**; German can invert subject and verb and the slot follows. The translator sees `{count}` and knows what it is.
- **Positional placeholders are the C-stdlib mistake.** `"You have %s unread %s"` — the translator can't move the slots (order is fixed by the argument list), can't rename them, can't tell what `%s` *means*. Show this as the explicit anti-pattern.

Use a small `<TabbedContent>` (or a compact table) showing *the same key* across three locales with the named slot reordered: en `"You have {count} unread messages"`, a locale that fronts the count, a locale that moves the noun — to make "the catalog reorders named slots, the engineer never does" visible. This is a simple visual aid (the diagram docs explicitly endorse "any simple visual aid"), not a system graph.

Close by pointing forward: ICU MessageFormat (lesson 2) is the *syntax* that lives inside these slots for plurals and selects; **named placeholders are the rule** that makes ICU work. One sentence, then move on.

**Tooltip (`Term`) candidate:** `positional placeholder` (a slot identified by argument order like `%s` / `{0}`, not by name — the translator can't reorder it).

Reasoning: the named-vs-positional contrast is the crux of *why* concatenation fails (concatenation is positional-by-construction). Showing one key across three locales with the slot in three positions is the cheapest possible proof.

---

### The catalog file format

Make the wire format concrete.

- **One JSON file per locale:** `messages/en.json`, `messages/fr.json`, `messages/de.json`. Per code conventions and next-intl's own official recommendation: **one file per locale** is the default — the whole catalog for a locale lives in one file, and you namespace *within* it via nested objects. (Resolve the chapter-outline "split by namespace into multiple files" idea here: next-intl *supports* splitting a locale into multiple files merged at runtime via dynamic import, but its docs frame that as an optional organizational choice and even point to editor tooling for managing one large file instead. This stack's default is the single file; teach that, mention splitting exists in one clause so a curious student isn't misled, and do **not** present per-feature files as the norm.)
- **Nested objects mirror the dot-paths:** show `{ "invoice": { "pastDue": { "title": "Invoice past due" } } }` resolving to key `invoice.pastDue.title`. Use a small `<AnnotatedCode>` over a ~10-line `en.json` excerpt: step 1 highlights the namespace object, step 2 the leaf string, step 3 a value carrying a named slot, step 4 a sibling namespace — so the path↔nesting mapping clicks. Color the steps (blue default per AnnotatedStep guidance).
- **Why JSON:** every TMS (Lokalise, Crowdin, Tolgee, Phrase — named once, as a set, not taught) round-trips JSON cleanly; the `next-intl` ecosystem standardizes on it. YAML works but JSON is the default here. One sentence.
- **Catalogs live in the repo, ship in the build, are version-controlled with the code that uses them.** This is why a renamed key is a coordinated commit — the catalog is *code-adjacent*, not a remote service. Reinforces the stable/mutable point.

**Tooltip (`Term`) candidate:** `TMS` (Translation Management System — the SaaS where translators work, e.g. Lokalise/Crowdin; out of scope, named once).

Reasoning: `AnnotatedCode` is the right tool — one JSON block, attention directed to the nesting↔path correspondence one piece at a time. The file-per-locale rule is a hard convention; stating the divergence from the chapter outline's "split by namespace" prevents a downstream agent from teaching per-feature files.

---

### One string per key — and when reuse is actually fine

The most nuanced rule in the lesson; it's where the chapter outline and the code conventions *appear* to disagree, and the senior framing reconciles them. Teach the reconciliation, don't pick a side blindly.

- **The rule:** key reuse follows **meaning**, not **English spelling**. Reuse a key when the message is genuinely the *same concept* in the same role (code conventions: "reuse keys when the message is the same"). Mint a **new** key when two surfaces happen to share an English string but mean different things — because a translator may need to diverge per locale.
- **The canonical trap:** `common.save` reused across forty buttons. In English every one reads "Save." In German the *settings* page wants "Speichern" (save preferences) while a *checkout* action means "place order" and wants different wording. One shared key forces both surfaces to the same translation; the bug is invisible until a German speaker reads the checkout. **Different surfaces, different meaning → different keys**, even when the source string is identical.
- **The flip side (so the student doesn't over-rotate):** do *not* split `errors.unauthorized` into `errors.unauthorized.invoice` and `errors.unauthorized.customer` when it's the same message in the same role (code conventions' example). Mechanical duplication is its own smell. The test is always: *could a translator legitimately want these two to differ in some locale?* Yes → separate keys. No → one key.
- The catalog can carry duplicate *values* across keys; that's fine and expected. The translator decides per-key, per-locale.

**Exercise — `Buckets` (two-column).** Buckets: **"Same key"** vs **"Separate keys"**. Items are pairs of surfaces sharing an English string: e.g. *"Save" on settings vs "Save" on checkout* → separate; *"Unauthorized" error on invoices route vs customers route* → same; *"Delete" on a row vs "Delete" on a destructive account-closure modal* → separate; *"Loading…" on two different lists* → same. Instructions: "Decide whether these two surfaces should share one translation key or get their own." Goal: the student internalizes the *meaning-not-spelling* test by applying it to ambiguous real pairs — exactly the judgment beginners get wrong in both directions.

Reasoning: this is the lesson's hardest judgment call and the spot where blindly following either source misleads. A `Buckets` drill on ambiguous pairs is the right instrument because the skill is *classification under ambiguity*, not recall.

---

### Source-locale completeness, and graceful fallback

The rule that lets a single-locale team ship and a translation pipeline run asynchronously.

- **Every key has a value in the source locale** (`en-US` on this stack — restate from Chapter 083 that `en-US` is the full BCP 47 tag, not bare `en`). A key with no source value is a **build error** — you cannot ship a string with nowhere to render.
- **Other locales may have gaps.** When `fr.json` is missing a key, the runtime **falls back to the source locale** and renders English. The French user sees one English string instead of a crash or an empty box.
- **Gaps are observable, not silent.** Missing-key events surface to logs (dev console, Sentry — named) so the translation pipeline knows what to fill. Frame as: *ship in source-locale-complete state; let translators ship the other locales asynchronously through the TMS.*
- This is the concrete mechanism behind the chapter thesis: a single-locale launch already has `en.json` complete and the shape in place — adding French is dropping a `fr.json`, not refactoring components.

Small `<Aside type="note">`: the fallback is *per-key*, not per-file — a partially translated `fr.json` renders French where it can and English where it can't, key by key.

Reasoning: this closes the loop on "discipline before feature" — it's the rule that makes shipping one locale and shipping ten the same code. Worth its own short section because it's the payoff sentence of the whole chapter framing.

---

### Strings with embedded markup: `t.rich` (preview)

Preview only — depth is lesson 5. Teach *that the discipline extends to JSX*, and the anti-pattern it kills.

- The hard case: a string with an inline element — `<Link>`, `<strong>`, an icon. Example message: `"By signing up, you agree to our <link>Terms</link>."`
- The wrong reach: split into three keys (`prefix`, `linkText`, `suffix`) and concatenate JSX. This is concatenation wearing a costume — same frozen-word-order bug, now in markup; many locales can't place the link where English does.
- The right reach: **one key**, with `t.rich` mapping the catalog's `<link>` tag to a component:
  ```tsx
  t.rich('terms.agreement', { link: (chunks) => <Link href="/terms">{chunks}</Link> })
  ```
  The translator owns the whole sentence *and* where the link sits inside it; the engineer provides the component for the tag. Returns a `ReactNode`.
- One sentence: depth (provider, typing, more tag patterns) is lesson 5.

Use a `Code` block (simple) for the message + the `t.rich` call; this is a preview, not a walkthrough — don't over-invest. Note `dangerouslySetInnerHTML` for translations is forbidden (code conventions) — one clause.

Reasoning: the chapter outline explicitly wants this previewed "because the discipline exists." Keeping it to one anti-pattern + one correct shape + a forward pointer respects the staging rule.

---

### Counts and gendered forms stay in the catalog (preview)

Short preview of lesson 2's discipline framing (not the ICU syntax).

- **Never branch on `count === 1` in component code.** Every count-shaped string is a *single key* whose catalog value carries the plural logic. The component passes `{ count }`; the catalog decides the forms per locale.
- Same for gender/role variants — the catalog is the surface (ICU `select`), not the component.
- One sentence: the syntax (`plural`, `select`, CLDR categories) is lesson 2.

Keep to ~3 sentences + maybe one `Code` line showing `t('inbox.unread', { count })` with the catalog value elided as `"{count, plural, ...}"`. Reinforces "logic lives in the catalog" without teaching ICU.

Reasoning: ties the no-concatenation rule to the most common place beginners reintroduce it (a JS plural ternary). Explicitly bounded to avoid bleeding into lesson 2.

---

### What is *not* a translation key

The audit boundary — equally important as the rule, because over-applying it (translating debug logs, machine values) is its own waste.

- **Translate:** any string a *user reads* — JSX text content (`<>...</>`), user-facing prop values (`aria-label`, `title`, `placeholder`, `alt`), toast/notification text, validation messages.
- **Don't translate:** debug/server logs, ARIA roles on purely structural elements, machine-readable values, IDs, enum *values* (the underlying token, not its display label), URLs/route segments.
- Frame the reviewer reflex from code conventions: *any string literal in JSX that isn't a key is a finding* — but pair it with its inverse so the student doesn't translate `console.log` calls.

**Exercise — `Tokens`.** A ~12-line component mixing both kinds: user-facing JSX text and an `aria-label` (targets), alongside a `console.error` message, an enum value `'PAST_DUE'`, and a route string `/invoices` (decoys). Prompt: "Click every string that must become a translation key." Goal: the student performs the exact audit a reviewer does — discriminating user-visible from machine-facing strings. `Tokens` is purpose-built for "click the matching tokens in this code" and maps perfectly to a grep-the-codebase audit.

Reasoning: the audit is a daily senior activity; making the student *do* it on mixed code (not just read about it) is the highest-value interaction in the lesson. The decoys teach the boundary that prose alone blurs.

---

### Translations cross the server/client boundary

Address the worry students from Chapter 030 will have, and close the loop on the two call shapes.

- The React boundary is unchanged from Chapter 030. **Server Components** reach for `getTranslations` (async); **Client Components** reach for `useTranslations` (sync hook). Both speak the same key and call the same engine.
- **Catalog data is server-only by default**; the active locale's slice ships to the client only when a Client Component consumes it. State this plainly — it answers "does my whole catalog get bundled to the browser?" (No, by default; scoping is lesson 5.)
- Keep it to the *call shape* and the *mental model* — full wiring (`NextIntlClientProvider`, scoping with `pick`, the request config) is lesson 5. Name that pointer.

Small `<CodeVariants>` with two tabs — "Server Component" (`const t = await getTranslations('inbox')`) and "Client Component" (`'use client'` + `const t = useTranslations('inbox')`) — same key in both, to show the boundary is transparent.

Reasoning: students who internalized the server/client split will otherwise stall on "which translation function where?" Answering it in the discipline lesson (call shape only) removes a blocker without pre-teaching lesson 5's wiring.

---

### Recap and external resources

Two or three sentences restating the through-line: **key in code, text in the per-locale catalog, named slots the catalog reorders, zero concatenation; source-locale-complete to ship, fallback for the rest.** Restate the chapter thesis once: the second locale is one PR because the shape was there from string one.

`ExternalResource` cards (use `<ExternalResource>`, not bare links — per components):
- next-intl — messages / catalog structure docs (the authoritative source for the catalog shape the student just learned).
- ICU MessageFormat overview (forward reference for lesson 2 — message syntax).
- Optionally the `eslint-plugin-i18n-json` repo (named once for the lint guard).

No `VideoCallout` proposed: this is a conventions/discipline lesson with no single canonical talk that beats prose + drills; an embedded video would be filler. (Lessons 2/3's mechanics are stronger video candidates.) State this decision so the resourcer doesn't force one.

---

## Scope

**Prerequisites to restate briefly (one line each, do not re-teach):**
- From Chapter 083: `users.timeZone` is a profile column passed explicitly to every formatter; `en-US` is a full BCP 47 tag (not bare `en`); the "explicit validated input threaded to the edge" pattern. Reuse as the analogy for translatable text.
- From Chapter 030: the Server/Client Component boundary. Restate only that translations cross it transparently.

**Explicitly out of scope (defer with a pointer, do not teach):**
- **ICU MessageFormat syntax** — `plural`, `select`, `selectordinal`, CLDR categories, `=0`/`=1` overrides. Lesson 2. This lesson previews *that* counts/gender live in the catalog; it teaches **no** ICU syntax. `{count}` is treated as a plain named slot throughout.
- **`Intl.*` formatters** — `NumberFormat`, `DateTimeFormat`, `RelativeTimeFormat`, `Collator`, etc. Lesson 3. Not mentioned except as "formatting numbers/dates is a separate engine, lesson 3" if it comes up.
- **Locale negotiation / resolution chain** — `Accept-Language`, cookie, `users.locale`, BCP 47 best-match, the middleware. Lesson 4. This lesson treats "the active locale" as a given; *how it's chosen* is lesson 4. Define `locale` only at the one-line `Term` level.
- **`next-intl` wiring / file shape** — `defineRouting`, `createMiddleware`, `getRequestConfig`, `setRequestLocale`, `generateStaticParams`, providers, the `IntlMessages` type *setup*, `useFormatter`. Lesson 5. This lesson shows only the *call shapes* (`useTranslations`/`getTranslations`/`t.rich`) as the form the student will write, and names the type-safety payoff without the setup.
- **`t.rich` at depth** — multiple tag patterns, provider/typing, nesting. Lesson 5. Preview is one anti-pattern + one correct shape.
- **hreflang / per-locale SEO** — Lesson 6. Not touched.
- **The TMS pipeline** (Lokalise/Crowdin/Tolgee/Phrase) — out of chapter scope; named once as a set, not taught.
- **RTL / `dir` handling** — out of chapter scope; do not mention beyond at most a one-clause "named once for future scaling" if natural.
- **Catalog splitting into per-feature files** — *not* the default; code conventions and next-intl's official guidance both make one file per locale the norm. Splitting is mentioned in one clause as a supported option, not taught as the recommended shape. Don't let the chapter outline's "split by namespace" brainstorm become the lesson's default.

---

## Code conventions alignment notes

- **One file per locale** is the default (conventions + next-intl official docs), overriding the chapter outline's "split by namespace into multiple files." Within a file, namespace via nested objects. Splitting is a supported-but-optional pattern, mentioned in one clause, not taught as the norm. Stated in the catalog-format section.
- **Reuse follows meaning, not spelling** — reconciles the conventions' "reuse keys when the message is the same" with the outline's "no `common.*` reuse." Taught as the *meaning-not-spelling* test, with both failure directions (over-sharing and mechanical splitting) shown.
- **Dot-namespaced keys mirror the feature folder**, **named placeholders only**, **no concatenation**, **`t.rich` for markup (never `dangerouslySetInnerHTML`)**, **`en` source of truth with fallback** — all taken directly from the Internationalization section of the conventions.
- Call shapes (`useTranslations` / `getTranslations` / `t.rich`) shown exactly as the conventions write them; deeper API surface deferred to lesson 5 by design (note for downstream agents: this staging is deliberate, not an omission).
