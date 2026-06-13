# ICU MessageFormat: plurals, select, gendered forms

- **Title (h1):** ICU MessageFormat: plurals, select, gendered forms
- **Sidebar label:** ICU MessageFormat

---

## Lesson framing

This is the chapter's load-bearing rule for any string carrying a count or a person-variant. Lesson 1 deliberately left `{count}` as a plain named slot and named "ICU MessageFormat" only via a `Term`; this lesson is where that slot grows teeth. The whole lesson lives **inside the catalog value** — the engineer's call never changes (it's still `t('inbox.unread', { count })` from Lesson 1), only the string the translator owns gets more expressive.

Conclusions from the brainstorm that apply lesson-wide:

- **Anchor on the pain, then disarm it.** The opening hook is the `count === 1 ? 'message' : 'messages'` ternary the student would write today — the exact instinct Lesson 1 forbade for word order, now forbidden for plurals. The senior reach is to push that logic *off the JS heap and into the catalog string*, where CLDR per-language rules apply. Lead every concept with "what breaks without this," then show the ICU shape that makes the bug hard to write.
- **The mental model to install:** an ICU message is a tiny declarative template language the **runtime interprets per locale**. The engineer passes a value; the message picks a branch using the locale's CLDR plural/ordinal categories; `#` substitutes the locale-formatted number. The translator edits *inside the branches*; they never see or write JavaScript. "The ICU syntax is the boundary; everything inside a branch is just text" is the recurring refrain.
- **Cognitive-load staging.** Build complexity in one strict order so nothing arrives unmotivated: (1) `plural` anatomy with English's two forms, (2) why two forms is an English accident — CLDR categories per language, (3) `Intl.PluralRules` as the engine underneath, (4) exact-match `=0`/`=1` overrides as a product call, (5) `selectordinal` as plural's ordinal sibling, (6) `select` for free string enums, (7) nesting select-over-plural for gendered counts. Each step reuses the prior step's example string so the student tracks one running example (the unread-messages inbox line, then the "liked your post" notification) rather than meeting fresh context each section.
- **Make per-language plural categories *visible*, not asserted.** The single most surprising fact for a first-timer is that "one/other" is parochial — Russian needs four branches, Arabic six, Chinese one. A diagram comparing the same message's branch set across en/fr/ru/ar carries this far better than prose. This is the lesson's centerpiece visual.
- **`#` vs `{count}` is the highest-frequency beginner bug** and gets its own explicit treatment plus a PredictOutput drill, because the failure ("5 5 messages") is silent and survives review.
- **Two interactive checks, both grounded in the real engine.** One ScriptCoding on native `Intl.PluralRules` (proves the categories are real, runs in the browser with zero deps), and one Dropdowns drill on authoring a correct ICU string (keyword vs exact-match, `#` vs `{count}`, mandatory `other`). A short PredictOutput nails the `#`-vs-`{count}` trap.
- **`select` ≠ plural.** Stress the type difference: `plural`/`selectordinal` branch on a *number* via CLDR categories; `select` branches on a *string* via literal match. Beginners conflate them and try `select` on a count, or `plural` on a role. The `other` fallback is mandatory in all three — surface this as the one rule the parser enforces at load time.
- **The data-must-carry-it rule for `select`.** The canonical `select`-for-gender bug is inferring gender from `user.name`. Frame `select` as rendering a variant the *data already knows*; if the data doesn't carry the distinction, the English source collapses to gender-neutral writing and `other` is the only branch.
- **Forward/back references kept tight.** Number/date formatting inside ICU (`{x, number, …}`) is named once and explicitly handed to Lesson 3's `Intl.*` formatters — the senior reach is the explicit formatter call at the seam, not ICU's inline number skeleton. MessageFormat 2 is named once as the mechanical-migration future, not taught.
- **Code component strategy:** ICU strings are short but structurally dense — `AnnotatedCode` is the workhorse for anatomizing the `plural` form part-by-part (variable / keyword / branch table / `#`). `CodeVariants` for the wrong-vs-right framings (ternary-in-component vs ICU-in-catalog; `{count}` vs `#`; `=1`-everywhere vs CLDR keyword). `TabbedContent` for the per-language category comparison and for the nested gendered-count message shown flat vs structured. `Term` for the CLDR/cardinal/ordinal/skeleton vocabulary.

---

## Lesson sections

### Introduction (no header)

Open on the running example from Lesson 1: the inbox line now needs to say "You have 1 unread message" / "You have 5 unread messages." Show the reach the student would write **today**, post-Lesson-1, believing they're being disciplined:

```tsx
// catalog gave us the sentence; surely the plural is ours to handle?
const noun = count === 1 ? t('inbox.message') : t('inbox.messages');
t('inbox.unread', { count, noun });
```

Name why it's a trap in one beat: this is the *same* mistake Lesson 1 killed for word order, now reappearing for number agreement. English has two plural forms; Russian has four, Arabic six, Welsh six, Chinese one. The ternary hard-codes English's grammar back into the component the rule just cleaned. State the lesson's promise: the plural logic moves *into the catalog string* as **ICU MessageFormat**, the runtime applies the right per-language rule, and the engineer's call collapses back to one value — `t('inbox.unread', { count })`. Connect to Lesson 1's thesis explicitly: same three-party contract, the catalog just got a richer vocabulary inside the slot. Preview the skill: by the end the student can read and author `plural`, `selectordinal`, and `select` messages, including nested gendered counts, and can spot the four ways they break.

Keep it warm and brief per pedagogical guidelines. Do not re-derive the no-concatenation rule — reference it as established.

### What ICU MessageFormat is

Define the thing before dissecting it. ICU MessageFormat is a **Unicode-standardized string syntax** for putting *locale-aware choice logic* inside a single message string. Key framing points:

- The catalog value stops being a flat sentence and becomes a tiny template: `'{count, plural, =0 {No messages} one {# message} other {# messages}}'`.
- At render time the **runtime** parses the string, reads the variable (`count`), looks up which plural category that value falls into *for the current locale*, picks the matching branch, and substitutes `#` with the locale-formatted number.
- It is defined in Unicode CLDR; "ICU" is the reference C/Java implementation whose syntax everyone adopted (`Term`: ICU = International Components for Unicode). `next-intl` ships an ICU MessageFormat parser; the student already met the library by name in Lesson 1.
- The five things ICU can do, named as a set so the student has the map: **plural** (cardinal counts), **selectordinal** (ordinals — 1st/2nd/3rd), **select** (free string enums — gender, role, type), plus inline **number** and **date** formatting. State the chapter's scope decision plainly: **this lesson teaches the first three at depth; number and date hand off to the `Intl.*` formatters directly in Lesson 3.** The senior reach is the explicit formatter call at the seam, not ICU's inline `{x, number, …}` skeleton — name it once here and move on so the student doesn't go looking for it.

Use a short prose intro plus one `Code` block of the full example message. Keep this section tight — it's orientation, the depth is below. `Term` candidates here: **ICU**, **CLDR** (Unicode Common Locale Data Repository — the dataset of per-language rules every formatter reads).

### Anatomy of a plural message

The core dissection. Use **`AnnotatedCode`** over the single message `'{count, plural, =0 {No messages} one {# message} other {# messages}}'` (lang `text` or `json` — it lives in a JSON value; show it as the bare ICU string for clarity, `maxLines` default). Step through the three structural parts plus the special token, one highlight per step, blue default per the AnnotatedStep guidance, varying color where it aids contrast:

- **Step 1 — the variable** (`count`, highlighted): names which passed value drives the choice; matches the key in the `t(key, { count })` object. This is the one tie back to the engineer's call.
- **Step 2 — the selector keyword** (`plural`, highlighted, distinct color): declares *how* to branch — `plural` means "treat the value as a cardinal number and use CLDR cardinal categories." (Foreshadow: `selectordinal` and `select` are the other two keywords, coming up.)
- **Step 3 — the branch table** (the `=0 {…} one {…} other {…}` span, highlighted): a list of `selector {message}` arms. Two kinds of selector live here — **exact matches** (`=0`, `=1`, `=2`) tried first, and **CLDR keywords** (`zero one two few many other`) tried after. `other` is **mandatory** and is the catch-all.
- **Step 4 — the `#` token** (each `#`, highlighted, distinct color): inside a branch, `#` is the value formatted as a locale-aware number (grouping, decimals). Stress: `#`, *not* `{count}` — this is the seam to the next section.

After the walkthrough, a short prose beat: the engineer's call for this message is just `t('inbox.unread', { count })` — all the branching is catalog-side. Tie back to Lesson 1's "logic about *how* a string varies lives in the catalog, not the component."

### `#` is the formatted count, `{count}` is a bug

A focused micro-section on the single highest-frequency authoring mistake, because it's silent. Explain: inside a plural branch, `#` is the placeholder for the formatted selector value. Writing `{count}` instead re-interpolates the raw variable *in addition to* nothing replacing `#`'s intended slot — the classic output is `"5 5 messages"` when the branch reads `{count} {count} messages`, or a stray unformatted number. Also note `#` carries locale formatting for free (a count of `12345` renders `12,345` in en-US, `12 345` in fr-FR) whereas a bare re-interpolation may not.

Lock it in with a **`PredictOutput`** drill. Program: a tiny snippet that formats one ICU message with `count = 1234` two ways (one branch using `#`, a sibling broken message using `{count}` doubled), printing both. The student predicts the two output lines; `expected` shows the correct `1,234 messages` vs the broken `1234 1234 messages`. `PredictWhy`: `#` is the formatted selector value; `{count}` re-prints the raw variable and leaves `#`'s job undone. (Author note: present as a conceptual snippet with `console.log` lines; the runner detail doesn't matter for PredictOutput since output is author-supplied.)

### One language has two forms — most don't

The conceptual centerpiece: plural categories are per-language, and English's two-form world is the parochial default that quietly breaks everything else. Prose first: CLDR declares, per language, which **plural categories** exist. English uses only `one` and `other`. French folds **both 0 and 1** into `one` (its everyday set is `one`/`other`; a `many` category exists but only for large numbers in the millions — don't lead with it). Russian needs `one`, `few`, `many`, `other` every day, driven by the last digit and the teens exception (numbers ending in 1 but not 11 → `one`; ending 2–4 but not 12–14 → `few`; the rest → `many`). Arabic and Welsh use all six (`zero one two few many other`). Chinese has just `other` — no plural inflection at all. The engineer writes one message shape per *source* language; the translator supplies the branch set *their* language needs. The runtime delegates the category lookup to CLDR — the engineer never enumerates languages.

This is the lesson's primary diagram. Use **`TabbedContent`** (alternatives of one idea — the same message across locales — which the doc says is its sweet spot; not `CodeVariants` because the point is the *category set* differing, with per-tab captions doing teaching work):

- Tab **English (en)**: branch set `{ one, other }`, e.g. `one {# message} other {# messages}`. Caption: two forms — the default that misleads.
- Tab **French (fr)**: everyday categories are `one` (covers **both 0 and 1** — "0 fichier", "1 fichier") and `other`; caption leads with that. (Fact-checked against the Unicode CLDR chart: French *does* also have a `many` category, but it only fires for large numbers in the millions — mention it in one clause if at all, do not foreground it, or it muddies the contrast. The teaching point is "French folds 0 into the singular, unlike English," not the millions edge case.)
- Tab **Russian (ru)**: `{ one, few, many, other }`, caption: chosen by the last digit (1 → one; 2–4 → few; 0/5–20 → many).
- Tab **Arabic (ar)**: all six `{ zero, one, two, few, many, other }`, caption: the full CLDR set.

Pedagogical goal: make "plural categories are a property of the language, not a universal" spatial and undeniable, and show the engineer's single call (`t('inbox.unread', { count })`) is identical across all four — only the catalog branch set changes. State that constant call once in surrounding prose.

`Term` candidates: **cardinal** (a counting number — 1, 2, 3 — the kind `plural` handles), **plural category** (one of CLDR's named buckets: zero/one/two/few/many/other).

Link out at section end via `ExternalResource`: the Unicode CLDR plural-rules chart (the per-language table is reference, not memorization — name it as the place to look up a language's categories, never to learn by heart).

### `Intl.PluralRules` is the engine

Show the machinery under the message so the abstraction isn't magic. `Intl.PluralRules` is the native JS API that maps a number to its CLDR plural category for a given locale: `new Intl.PluralRules('ru').select(5)` returns `'many'`. Every ICU MessageFormat implementation calls this (or a polyfill) to pick the branch. The student rarely calls it directly — ICU does it for them — but seeing it demystifies the per-language behavior and connects to Lesson 3, which restates `Intl.PluralRules` as a standalone formatter-family member. Note `{ type: 'ordinal' }` switches it to ordinal categories (the engine behind `selectordinal`, next section).

Reinforce with a **`ScriptCoding`** exercise (vanilla runner — `Intl.PluralRules` is native to the JS runtime, **no npm import needed**, so the default fast iframe works; explicitly note this so the build agent doesn't reach for sandpack). Task: implement `categoryFor(locale, n)` returning the plural category string. Tests assert `categoryFor('en-US', 1) === 'one'`, `categoryFor('en-US', 2) === 'other'`, `categoryFor('ru-RU', 5) === 'many'`, `categoryFor('ru-RU', 2) === 'few'`, `categoryFor('ar', 0) === 'zero'`. Instructions frame it as "prove to yourself the categories are real — they ship in your runtime." This is the load-bearing 'aha': the student watches Russian return `many`/`few` from one line of standard JS.

`Term`: this is a good spot to *not* re-Term ICU; keep tooltips for genuinely new vocab.

### Exact-match overrides for product copy

The `=0` / `=1` carve-out, framed as a *product decision*, not a grammar rule. Many products want "No messages" instead of "0 messages," or "You" instead of "1 person" in narrative copy. ICU's exact matches (`=0`, `=1`, `=2`) are literal value matches tried **before** category keywords. Convention: list exact matches first, then CLDR keywords, then `other`.

The senior nuance, stated as a rule: **exact matches are for narrative overrides; the CLDR keyword is the default.** Using `=1` *instead of* `one` works in English (where `one` only ever matches 1) but breaks in languages where `one` matches more than the literal 1 (e.g. some languages' `one` covers numbers ending in 1 like 21, 31) — `=1` would only catch the literal 1 and silently drop the rest to `other`. Frame the heuristic: reach for `one`/`other` by default; reach for `=0`/`=1` only when the *wording itself* changes ("No messages", not "0 messages"). The source-locale catalog declares the override; each translator decides whether their language wants the same carve-out.

Use a **`CodeVariants`** two-tab wrong-vs-right: tab "`=1` as the plural" (uses `=1 {…} other {…}`, marked as the trap, prose: works in English, drops 21/31/… to `other` in languages whose `one` is broader) vs tab "CLDR keyword + `=0` override" (uses `=0 {No messages} one {# message} other {# messages}`, the senior shape). Per-pane mark colors (red / green) per the CodeVariants color hook.

### Ordinals need `selectordinal`

Plural's sibling for ranks and positions. `selectordinal` consults CLDR's **ordinal** rules (distinct from cardinal): `'{rank, selectordinal, one {#st place} two {#nd place} few {#rd place} other {#th place}}'` produces English's "1st / 2nd / 3rd / 4th / … / 21st." Stress the distinction with a concrete English example, since it's counter-intuitive that the *same* numbers map to *different* categories under cardinal vs ordinal: 1 is cardinal-`one` and ordinal-`one`, but 2 is cardinal-`other` yet ordinal-`two`, and 3 is ordinal-`few`. Other languages differ entirely (German "1.", "2."; Japanese 番). Reach for it for leaderboards, ranks, positions, "your Nth invoice."

Keep this section lean — one `Code` block of the message plus the cardinal-vs-ordinal contrast for English (a small inline table or two-row comparison is enough; a full diagram is overkill). `Term`: **ordinal** (a position number — 1st, 2nd, 3rd — distinct from a counting cardinal).

### `select` for variants the data already carries

Pivot to the third keyword and mark the **type difference** hard. `plural`/`selectordinal` branch on a *number* via CLDR categories the runtime computes; **`select` branches on a *string* via literal match**, with `other` as the mandatory fallback. Canonical example, the new running example for the rest of the lesson:

`'{gender, select, male {He liked your post} female {She liked your post} other {They liked your post}}'`

Use cases: gender (when the data records it), notification type (`{type, select, invoice {…} payment {…} other {…}}`), organization role (`admin`/`member`/`other`). English source often collapses gender variants to neutral writing; German renders three forms because nouns and pronouns inflect — the same data-driven message, more branches in the German catalog.

The load-bearing watch-out, stated as a rule: **`select` renders a distinction the data already carries — never one you infer.** The bug is parsing `user.name` to guess gender. If the data doesn't store the distinction, the message has only the `other` branch and that's correct. Frame the senior call: the database column feeds the selector; absence of the column means gender-neutral `other` is the truth, not a gap to paper over.

Component: `Code` block for the message, prose for the type distinction. A small **`Dropdowns`** drill could pair here OR be deferred to the consolidated drill below — fold it into the consolidated drill to avoid drill fatigue (decision: one authoring drill near the end, this section stays prose + code).

`Term`: keep this section Term-light; "enum" may already be familiar — only Term it if the surrounding chapters haven't (skip).

### Gendered counts: nesting select over plural

The capstone composition. Real notifications combine both dimensions — "He has 3 new messages" needs gender *and* a count. ICU nests: a `select` whose branches each contain a `plural`:

```
{gender, select,
  male {{count, plural, one {He has # message} other {He has # messages}}}
  female {{count, plural, one {She has # message} other {She has # messages}}}
  other {{count, plural, one {They have # message} other {They have # messages}}}}
```

Senior framing for the *ordering* decision: nest the **lower-cardinality / outer** dimension (gender — 3 values) on the outside and the **plural** on the inside. Rationale to give: the outer selector is the coarser cut; plural multiplies inside each. (Keep this as a practical heuristic, not a hard law — the real driver is readability and the translator's mental model.) The engineer's call stays flat: `t('notification.messages', { gender, count })` — two values, one key, all structure catalog-side.

This nested string is dense; use **`AnnotatedCode`** to walk it: step 1 highlights the outer `select` + `gender`, step 2 highlights one `male {...}` arm and notes its body is itself a complete plural message, step 3 highlights the inner `plural`'s branch table, step 4 highlights the `#` to reinforce it still means the formatted count even two levels deep. This reuses the anatomy skill from earlier on a harder example — deliberate spiral.

Reinforce the translator boundary one more time: even at this nesting depth, the translator only ever edits the text inside the innermost `{…}` arms. They never touch the structure, never see JS. "The ICU syntax is the boundary; everything inside a branch is text" — restate as the closing refrain of the teaching body.

### Authoring an ICU message: the rules that bite

Consolidated practice + the watch-out set, placed as a section (not a tip dump) because authoring-correctness is itself the skill. Lead with prose stating the four rules the student must internalize, each tied to its failure:

1. **`other` is mandatory** — omit it and the parser throws at load time (a real error, surfaced early — the one thing tooling catches for free).
2. **`#` for the count inside plural branches, never `{count}`** — silent "5 5 messages" otherwise (callback to the earlier section).
3. **CLDR keyword by default, exact match only for wording overrides** — `=1`-as-plural breaks non-English (callback).
4. **`select` needs the data to carry the value** — don't infer from `name`.

Plus two shorter watch-outs woven into prose: ICU quote-escaping (a literal `'` or `{` inside text must be escaped, which trips up JSON editors — validate the catalog with the actual runtime, not by eye); and "some libraries advertise 'ICU support' but skip `selectordinal` or `select`" — `next-intl` covers all three, but confirm with the runtime if you swap libraries. If messages are ever stored in a DB and edited by content editors, validate ICU syntax at write time (named once; DB-stored content is otherwise out of scope).

Close the section with a **`Dropdowns`** fenced-code drill: a partially-blanked ICU message (the gendered-count or a simpler unread-count message) where the student fills `___` blanks choosing: the selector keyword (`plural` vs `select` vs `selectordinal`), `#` vs `{count}`, `other` vs `default` vs (missing), and `one` vs `=1`. `answers` array in source order; options are the plausible wrong forms. Instructions: "Complete the ICU message. Each blank has exactly one form that's correct across all languages." This is the summative authoring check.

### MessageFormat 2, in one breath

A single short paragraph, no exercise. Unicode is finalizing **MessageFormat 2** (MF2) with explicit `.input` / `.local` / `.match` declarations and first-class named-formatter integration. As of 2026 most i18n libraries — `next-intl` included — still target **MF1**, the syntax taught here. The migration is mechanical when the ecosystem adopts MF2; nothing learned today is wasted. Name it so the student recognizes the term in the wild and doesn't think the lesson is stale; do not teach the syntax. `Term`: **MessageFormat 2 (MF2)**.

### Recap

One-paragraph synthesis: count-shaped and person-variant strings stay single keys; the *logic* lives in the catalog as ICU MessageFormat; `plural`/`selectordinal` branch on a number via CLDR categories the runtime computes, `select` branches on a string the data carries, `#` is the formatted count, `other` is always required, and the translator edits only inside the branches. Restate the engineer's invariant: the call is always `t(key, { count })` / `t(key, { gender, count })` — flat, no branching, no inference. Forward-point to Lesson 3: the number and date formatting ICU handed off — currencies, dates, relative time — is the `Intl.*` formatter family, next.

`ExternalResource` cards (2-3): next-intl messages/ICU usage doc; the Unicode CLDR plural-rules chart (reference table); optionally the ICU MessageFormat working-spec or the FormatJS message-syntax doc as the canonical syntax reference.

---

## Scope

**Prerequisites to restate concisely (do not re-teach):**
- The three-party contract, `t('namespace.leaf', { slot })` call shape, named-not-positional placeholders, one-file-per-locale catalogs (`messages/en-US.json`), source-locale completeness with per-key fallback — all from Lesson 1. Reference in one clause each; assume fluency.
- `useTranslations` (client) / `getTranslations` (server) exist and share one engine — named in Lesson 1; do not re-explain the boundary here. ICU works identically through both.

**Explicitly out of scope (defer, do not teach):**
- **Translation-key naming / catalog discipline** — Lesson 1; done.
- **Inline ICU number/date formatting** (`{x, number, ::currency/USD}`, `{d, date, ::yyyyMMdd}`) — named once as the thing that hands off to `Intl.*`; the actual `Intl.NumberFormat`/`DateTimeFormat`/`RelativeTimeFormat`/`Collator`/`ListFormat`/`DisplayNames` family is **Lesson 3**. Do not teach formatter options here.
- **`Intl.PluralRules` as a standalone daily-reach formatter** — shown here *only* as the engine under `plural`; its standalone framing is Lesson 3. Keep this lesson's use strictly "prove the engine is real."
- **Locale negotiation / the `users.locale` column / `Accept-Language`** — Lesson 4. This lesson assumes "the current locale" exists and is resolved; do not explain how.
- **`next-intl` wiring** (`defineRouting`, `createMiddleware`, `getRequestConfig`, `setRequestLocale`, `IntlMessages` global type, `useFormatter`/`getFormatter`, `NextIntlClientProvider`) — Lesson 5. Do not show file shape or setup. The `t()` call is used as the established contract only.
- **`t.rich` at depth** — Lesson 5; not needed here (no embedded-markup messages in this lesson).
- **hreflang / per-locale SEO** — Lesson 6.
- **MessageFormat 2 syntax** — named once, not taught.
- **The full CLDR plural-rule table per language** — linked out as reference, never enumerated for memorization.
- **DB-stored / CMS-edited messages** — named once as a write-time-validation watch-out; the architecture is out of scope.
- **Continuity guard:** do not assume the student has seen `NextIntlClientProvider`, `defineRouting`, or `getRequestConfig` (Lesson 1 continuity notes flag this). Do not present per-namespace catalog splitting as default (Lesson 1 framed it non-default).
