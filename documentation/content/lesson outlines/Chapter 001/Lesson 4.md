# Lesson title

- **Title (h1):** Why `.length` lies
- **Sidebar label:** Why `.length` lies

# Lesson framing

Lesson 3 closed by installing the boundary-discipline reflex — validate at the seam, not downstream. This lesson is the same shape applied to strings: `.length` is a serialization detail (UTF-16 code units), not a count of anything a user perceives. The student leaves able to predict that `'🇺🇸'.length === 4`, knows the three different counts and which one to reach for, has installed `Intl.Segmenter` as the 2026 default for any user-facing length check, knows to call `.normalize('NFC')` at the storage boundary, and has a tight reference of the senior `String.prototype` surface for everyday work.

**Conclusions from brainstorming that apply lesson-wide:**

- **One structural insight, three counts.** The spine: `.length` reports UTF-16 **code units**, not characters. From that single fact fall three different counts a senior chooses between by intent — code units (`.length`), code points (`[...string].length`), grapheme clusters (`Intl.Segmenter`). The lesson is structured around that picker, not around Unicode internals.
- **Failure-first per pedagogical filter.** Open with the 280-emoji bio bug — a real SaaS scenario where the user types 280 emojis into a "280-character limit" field and gets rejected. The student should see `'🇺🇸'.length === 4` printed before any explanation lands.
- **No Unicode encoding theory.** Do not teach planes, BMP, surrogate pairs as their own topic, or UTF-8 vs UTF-16 vs UTF-32 trade-offs. Name "UTF-16 code units" once with a `<Term>` definition and move on. The student needs the consequence and the senior reach, not the encoding history.
- **`Intl.Segmenter` as the 2026 default.** It is Baseline Newly Available (April 2024) and reaches Baseline Widely Available October 2026, ships in Node 16+ and every modern browser the course targets. No polyfill discussion; no "but what about old runtimes" qualifications. The course targets Node 24 LTS — segmenter is just there.
- **Normalization is a boundary concern.** Frame `string.normalize('NFC')` as "do this once at the database write boundary," not "do this at every comparison." The pattern mirrors Lesson 3's `Number.isFinite`-at-the-boundary reflex.
- **String method surface as a tight reference, not a tour.** The course never enumerates `String.prototype` for completeness. List only the daily-reach methods with one-line triggers. Name the dropped/deprecated surface (`substr`, `escape`, HTML wrappers) in one paragraph so the student recognizes them as legacy and doesn't ask "why aren't we covering these?"
- **Forward links land in one sentence.** Zod custom refinements (Unit 6) for length validation; `String.raw` (Lesson 5 of this chapter) for template-literal authoring; regex Unicode flags (Chapter 003 regex lesson). No detours.
- **Cognitive load discipline.** Three concepts: the three counts, normalization, the method surface. The three-counts diagram is the visual anchor; the rest is prose with tight code blocks. One short coding exercise validates the segmenter reach.

Estimated student time: 25–30 minutes.

# Lesson sections

## Introduction (no h2)

Open with the production failure in two sentences: a bio field has a 280-character limit; the user types 280 emojis and gets a "too long" error, or pastes a name with combining marks and the duplicate-name check passes against a visually identical existing row. Diagnose plainly: both bugs come from one root — `string.length` in JavaScript counts UTF-16 **code units**, not characters the user perceives. Promise the student that by the end of the lesson they'll know which count to reach for and how to compare strings the user thinks of as identical.

Keep it 3–4 sentences. No bullet list, no headers in the intro.

## The surprise: `.length` doesn't count characters

**Goal:** make the divergence between `.length` and human perception unavoidable before any explanation lands.

Open with a `<PredictOutput>` on three subtle cases. The surprise is the lesson:

```ts
console.log('hello'.length);
console.log('🇺🇸'.length);
console.log('👨‍👩‍👧‍👦'.length);
```

Expected output:

```
5
4
11
```

`<PredictWhy>` reveals the rule in one paragraph: every JavaScript string is a sequence of **UTF-16 code units**, and `.length` reports that count. `'hello'` happens to be five ASCII characters, each one code unit — so `.length` matches what you see. The US flag emoji is built from two regional-indicator characters, each above the 16-bit boundary, so each takes a surrogate pair (two code units): four total. The family emoji is four people joined by zero-width joiners, each person above the 16-bit boundary, so it lands at eleven code units. None of these match what a user sees on screen.

Use a `<Term>` for "UTF-16 code units" with definition: "The 16-bit chunks JavaScript strings are stored in. Characters above U+FFFF (most emoji, many CJK characters) need two code units — a *surrogate pair* — to represent one user-perceived character."

Close with one terse sentence: `.length` is a **serialization detail**, not a count of anything human. The rest of the lesson is the three counts a senior actually chooses between.

## Three counts, three reaches

**Goal:** install the picker — given intent, what's the right count?

State the rule first: there are three different "lengths" a string can have, and the senior reaches for the one that matches the intent. Don't ask "how long is this string?" — ask "code units, code points, or grapheme clusters?"

Show the three counts against the same input in one tight fenced `ts` block — the divergence is the lesson:

```ts
const family = '👨‍👩‍👧‍👦';

family.length;                                            // 11 (code units)
[...family].length;                                       // 7  (code points)
[...new Intl.Segmenter('en', { granularity: 'grapheme' })
  .segment(family)].length;                               // 1  (grapheme clusters)
```

Walk the three in prose, each with the one-line trigger that names when to reach for it:

- **Code units** — `string.length`. The right answer when the value is a key, an index into the same string, a serialized payload byte budget, or anything else byte-shaped. Fast; no allocation; correct for ASCII. Wrong for "how many characters does the user see."
- **Code points** — `[...string].length` or `Array.from(string).length`. Spread iterates by Unicode code point, correctly handling surrogate pairs. Better than `.length` for any human-shaped count, still wrong for emoji built from joined sequences (the family emoji is seven code points but one cluster).
- **Grapheme clusters** — `new Intl.Segmenter(locale, { granularity: 'grapheme' })` then count the segments. The right answer for **"how many characters does the user see"** — the 2026 senior reach for any length validation on a user-facing field.

**Diagram (the visual anchor):** A small HTML+CSS table inside a `<Figure>` showing the three counts for three inputs in a 4×4 grid (header row + three input rows):

| Input | `.length` (code units) | `[...str].length` (code points) | `Intl.Segmenter` (grapheme clusters) |
|-------|-----|-----|-----|
| `'café'` (combining acute) | 5 | 5 | 4 |
| `'🇺🇸'` (US flag) | 4 | 2 | 1 |
| `'👨‍👩‍👧‍👦'` (family) | 11 | 7 | 1 |

Color-code the columns: red for code units (wrong default), orange for code points (better, still wrong for some inputs), green for grapheme clusters (the senior reach for user-facing counts). The pedagogical goal: the divergence becomes a single image the student can recall later when validating a form field. Keep it compact (≤300px height). Author as an HTML table inside `<Figure>` per the diagrams index's recommendation for "annotated illustration: HTML + CSS."

Forward-link in one sentence: Zod's `.length()` on string schemas (Unit 6) defaults to `.length` — code units — so user-facing length validation needs a custom refinement that runs the segmenter. The pattern lands in Unit 6.

## `Intl.Segmenter`: the 2026 user-facing length

**Goal:** install the canonical segmenter pattern as a reach the student writes confidently.

Open with the platform fact in one sentence: `Intl.Segmenter` is part of the platform baseline as of 2024 — shipped in every modern browser the course targets and Node 16+ (the course pins Node 24 LTS, so it's just there). No polyfill, no feature check.

Show the canonical one-liner the student should memorize as a fenced `ts` block:

```ts
const countCharacters = (input: string): number =>
  [...new Intl.Segmenter('en', { granularity: 'grapheme' }).segment(input)].length;

countCharacters('🇺🇸');        // 1
countCharacters('👨‍👩‍👧‍👦');     // 1
countCharacters('café');        // 4
```

Walk the snippet in two prose beats — small enough to read top-to-bottom, no `<AnnotatedCode>` needed:

- The `Intl.Segmenter` constructor takes a locale (for scripts where grapheme rules differ — Thai, Khmer, Devanagari) and a `granularity` option. `'grapheme'` is the user-perceived-character mode; `'word'` and `'sentence'` are the companions named in the next paragraph.
- `.segment(input)` returns an iterable of `{ segment, index, ... }` objects, one per cluster. Spreading and counting is the idiomatic length form. There's no `.size` or `.length` shortcut on the segmenter result — the spread is the pattern.

Companion granularities in one sentence — `granularity: 'word'` is the right reach for word-count features (with the `isWordLike` flag on each segment to skip punctuation and whitespace), `granularity: 'sentence'` for sentence-count features. Both rare in SaaS UI; named so the student knows the segmenter is the same tool for all three jobs.

Watch-out in one `<Aside type="caution">`: never **truncate** a string at an arbitrary character index — slicing in the middle of a surrogate pair or a grapheme cluster produces broken Unicode. If the field needs a hard truncation (preview text, SMS body), iterate segments and concatenate them up to the limit, never `slice(0, n)`. The course returns to this pattern when display-text truncation lands in a later UI lesson.

Forward-link in one sentence: the same `Intl.*` namespace also exposes `Intl.NumberFormat` (Lesson 3's reference), `Intl.Collator` (sorting), `Intl.DateTimeFormat` — the platform i18n surface the course leans on instead of pulling in libraries.

## Normalization at the storage boundary

**Goal:** install `.normalize('NFC')` as a one-time write-boundary reflex; don't let the student think it belongs at every comparison site.

Open with the failure observable. Use a fenced `ts` block:

```ts
const a = 'café';            // precomposed: 'c', 'a', 'f', 'é' (4 code points)
const b = 'café';      // decomposed: 'c', 'a', 'f', 'e', combining acute
a === b;                     // false
a.length;                    // 4
b.length;                    // 5
```

Diagnose plainly: the two strings look identical and a user typed them as the same word, but they're different sequences of code points — one uses a single precomposed `é`, the other uses `e` plus a combining acute accent. `===` compares the bytes (Lesson 2); the bytes differ.

State the fix in one sentence: call `.normalize('NFC')` on user input at the storage boundary; both forms collapse to the same canonical sequence. Show the fix in a one-line snippet:

```ts
a.normalize('NFC') === b.normalize('NFC');   // true
```

Name the four normalization forms tersely — one-line triggers each, no deep treatment:

- **`NFC`** (Canonical Composition) — combine characters into their precomposed form. **The senior default** for storage, comparison, and search. This is the form the lesson teaches.
- **`NFD`** (Canonical Decomposition) — split precomposed characters into base + combining marks. Useful for accent-insensitive search where you strip the combining marks after.
- **`NFKC`** / **`NFKD`** (Compatibility forms) — collapse visually-similar-but-semantically-distinct characters (e.g. `ﬁ` ligature → `fi`, full-width digits → ASCII digits). Useful for fuzzy matching at a search boundary; the wrong default for storage because it loses information.

The senior rule, in one paragraph: **normalize once, at the database write boundary.** If every value in the table is NFC, every comparison and every length count works against a canonical form. Don't sprinkle `.normalize('NFC')` at every `===` or `.length` call site — that's a sign the storage boundary isn't doing its job. The same boundary that runs Zod validation (Unit 6) is where normalization lives.

Forward-link in one sentence: Drizzle's `text` and `varchar` columns (Unit 5) don't normalize for you — Postgres stores the bytes you give it. The normalization belongs in the Zod schema or the action handler before the row hits the database.

## The senior `String.prototype` surface

**Goal:** install a tight reference list of the methods the rest of the course will reach for; name the dropped/deprecated surface once so the student recognizes it as legacy.

Frame it as one paragraph: the `String.prototype` surface is huge and most of it is legacy. The 2026 senior reaches for a small set with clear triggers; the long tail is recognition-only.

Show the surface as a tight prose list with one-line triggers each. Author this as a markdown list, not a table — the triggers are short and the prose reads denser than a grid:

- **`includes`** / **`startsWith`** / **`endsWith`** — substring tests. The senior reach over `indexOf(needle) !== -1`, which reads as "where is it?" not "is it there?"
- **`at(-1)`** — last-character access. Cleaner than `string[string.length - 1]` and works for any index (negative indices count from the end).
- **`slice(start, end)`** — substring extraction. The default. Prefer over `substring` (which silently swaps arguments if `start > end`) and `substr` (deprecated).
- **`split`** / **`join`** — the array-of-segments boundary, always paired. `split(sep)` to break into parts, `join(sep)` to reassemble.
- **`replaceAll(needle, replacement)`** — the modern reach over `.replace` with a global regex when the needle is a literal string. No more `replace(/needle/g, ...)` boilerplate.
- **`trim`** / **`trimStart`** / **`trimEnd`** — whitespace cleanup at input boundaries. Pair with the empty-string guard from Lesson 3 when converting form input.
- **`padStart`** / **`padEnd`** — fixed-width formatting. Rare in SaaS UI; occasional in logs and CLI output.
- **`localeCompare(other, locale, options)`** — locale-aware comparison for sorting. The right answer for any user-visible alphabetical sort; `<` and `>` on strings sort by code unit, which mangles accented characters.
- **`normalize(form)`** — the boundary tool from the previous section.

Then a tight "doesn't earn a place" paragraph naming the legacy surface so the student recognizes it on sight and doesn't reach for it:

- **`substr`** — deprecated by the spec; behaves like `slice` with a length argument instead of an end index. Use `slice`.
- **`substring`** — older sibling of `slice` that silently swaps arguments if `start > end`. No reason to prefer it.
- **`escape`** / **`unescape`** (these are globals, not on `String.prototype`, but commonly grouped) — deprecated; use `encodeURIComponent` / `decodeURIComponent` for URL escaping.
- **`String.prototype.bold`** / **`italics`** / **`fontcolor`** / **etc.** — HTML-wrapping methods from the 1990s, deprecated; the JSX layer owns markup.
- **`String.raw`** — the template-literal escape hatch; lives in Lesson 5 of this chapter where tagged templates earn their treatment.

This section is intentionally a reference list — no exercise, no deep walk. The student should leave able to skim it once and recognize each method on sight in later lessons.

## Practice: count what the user sees

**Goal:** practice the segmenter reach as a small boundary function the student writes from scratch.

A `<ScriptCoding>` exercise where the student implements `countCharacters(input)` returning the user-perceived character count. Use `runner="sandpack"` so the snippet runs as `.ts` with the same shape as the worked example above — this is the only `.ts` exercise in the lesson and matches the production form. (Deliberate divergence from Lesson 3, which used `vanilla` because the integer-cents rule was runtime-shaped; here the segmenter call is short enough that the type-checker overhead is worth the consistency with the worked example.)

Starter:

```ts
export const countCharacters = (input: string): number => {
  // Return the number of characters the user perceives.
  // Hint: Intl.Segmenter with granularity: 'grapheme'.
  return 0;
};
```

Tests:

```ts
test('counts ASCII as the obvious length', () => {
  expect(countCharacters('hello')).toBe(5);
});
test('counts a flag emoji as one character', () => {
  expect(countCharacters('🇺🇸')).toBe(1);
});
test('counts a family emoji as one character', () => {
  expect(countCharacters('👨‍👩‍👧‍👦')).toBe(1);
});
test('counts combining marks as one character', () => {
  // 'café' with a combining acute: 'cafe' + U+0301
  expect(countCharacters('café')).toBe(4);
});
test('counts an empty string as zero', () => {
  expect(countCharacters('')).toBe(0);
});
test('counts a multi-emoji string', () => {
  expect(countCharacters('🇺🇸🇪🇸')).toBe(2);
});
```

The flag-emoji and family-emoji tests are the lesson's point — they fail loudly if the student uses `.length` or the spread form. The combining-mark test catches the student who reaches only for `[...str].length`. Tests reveal the gap on the first wrong run; the student fixes by switching to the segmenter call.

## External resources

A small `<CardGrid>` of one or two `<ExternalResource>` cards at the end of the lesson:

- **MDN — `Intl.Segmenter`** (`https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Segmenter`) — full reference, including the `word` and `sentence` granularities with `isWordLike` examples.
- **MDN — `String.prototype.normalize`** (`https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/normalize`) — the four normalization forms with worked examples.

Skip the YouTube video on this lesson — the failure-observable code blocks and the three-counts diagram carry the explanation more efficiently than a video would. A short embedded video would compete with the lesson's visual anchor.

## Terms requiring `<Term>` tooltips

Use sparingly — the lesson defines most terms inline.

- **UTF-16 code units** — at first use in the "The surprise" section. Definition: "The 16-bit chunks JavaScript strings are stored in. Characters above U+FFFF (most emoji, many CJK characters) need two code units — a *surrogate pair* — to represent one user-perceived character."
- **grapheme cluster** — at first use in the "Three counts" section. Definition: "One character as the user perceives it on screen. Can span multiple Unicode code points — a base letter plus combining marks, an emoji built from a zero-width-joiner sequence, a regional-indicator pair forming a flag."
- **serialization detail** — at first use in "The surprise" close. Definition: "A property of how the value is stored or transmitted, not of what the value represents. `.length` reports the storage form, not the human-meaningful count."

Skip tooltips for terms defined in prose (`code points`, `normalization`, `surrogate pair` — covered inline in the UTF-16 definition).

# Scope

**This lesson covers:** the three counts a senior chooses between (code units via `.length`, code points via spread, grapheme clusters via `Intl.Segmenter`); the canonical `Intl.Segmenter` pattern with `granularity: 'grapheme'`; the `word` and `sentence` granularities named in one sentence; the truncation watch-out (never `slice(0, n)` on user-facing strings); Unicode normalization with `.normalize('NFC')` as a one-time storage-boundary discipline; the four normalization forms named with one-line triggers; the senior `String.prototype` method surface as a tight reference list; the legacy/dropped surface named once for recognition; the forward link to Zod custom refinements for length validation.

**Out of scope (explicit, with destinations):**

- **Unicode internals.** No planes, no BMP, no UTF-8 vs UTF-16 vs UTF-32 trade-offs, no encoding history. The `<Term>` tooltip on "UTF-16 code units" is the only depth the student needs. Surrogate pairs named once, never deeper than "two code units make one character."
- **Regex Unicode flags (`u`, `v`) and property escapes.** Owned by the regex lesson in Chapter 003. Named in zero sentences here — regex doesn't appear in this lesson at all.
- **Internationalization broadly.** The course defaults to English-only UI; `next-intl` is named in passing in later units. This lesson covers `Intl.Segmenter` because grapheme counting is the senior reach for any UI, not as an i18n lesson.
- **`Intl.Collator` in depth.** `localeCompare` is named in the method surface with one-line trigger; the full `Intl.Collator` reference is MDN territory.
- **`String.raw` and tagged templates.** Owned by Lesson 5 of this chapter. Named in one sentence in the "doesn't earn a place" list pointing to Lesson 5.
- **Template literals as the interpolation default.** Owned by Lesson 5. This lesson uses backticks only for string output examples (already established by previous lessons).
- **String encoding for URLs, HTML, JSON.** `encodeURIComponent` is named once in the "doesn't earn a place" paragraph; full treatment lives wherever URL handling first appears.
- **Polyfills for `Intl.Segmenter`.** The course targets Node 24 LTS and modern browsers — no polyfill discussion. Mentioning polyfills would teach the student that the segmenter is a "new" thing to be cautious about; in 2026 it's just baseline.
- **String performance characteristics.** Rope vs flat representation, V8 internals, intern pools — not on the senior path.
- **Zod string schema details.** Forward-linked in one sentence; the full treatment lives in Unit 6.

**Prerequisite reactivation (concise):** The student has Lesson 1's binding model (primitives copy by value; `string` is a primitive but the value is an immutable sequence — already implicit). Lesson 2's `===` semantics on primitives (compares the bytes — which is exactly why two visually-identical strings can be `!==` when their byte sequences differ; the diagnosis in the normalization section leans on this). Lesson 3's boundary-discipline reflex (validate once at the seam, not downstream) — normalization is the same shape for strings. The student knows `const`-bound arrow functions, inference-led typing, and `.ts` as the working form. The student has **not** been taught Zod, Drizzle, `Intl.NumberFormat` in depth, or any UI form-validation patterns — keep forward links to one sentence and do not detour.

# Code conventions notes

- All snippets in the lesson body are `.ts` per the chapter's TypeScript-flavored rule. Inference-led; the only return-type annotation is `countCharacters`'s `: number` (a boundary function — the signature is the lesson).
- Arrow functions bound to `const` for the helpers. The `<ScriptCoding>` exercise also uses an arrow-function `const` export — the segmenter call is short enough that TypeScript adds no overhead, and matching the production shape is the higher-leverage call here than the runtime-speed argument that drove Lesson 3's vanilla runner.
- Naming: semantic and domain-tied (`input`, `family`, `a`/`b` only in the precomposed-vs-decomposed minimal example where the variable names are deliberately shape-neutral to keep the focus on the byte comparison).
- `const` only; no `let`. Lesson 6 owns `let`.
- Use single quotes for strings (Biome convention); backticks only when interpolating (none in this lesson) or for the template-literal output examples in `<PredictOutput>` blocks.
- `console.log` only in the `<PredictOutput>` blocks; everywhere else show the result with a comment tail (`// 1`, `// false`) per Lesson 3's pattern.
- **Method surface formatting.** Method names in the reference list go in inline code (` `includes` `), one bullet per related-group when overloads share a trigger (e.g. `trim` / `trimStart` / `trimEnd` on one line).
- **Diagram form.** The three-counts visual is an HTML+CSS table inside `<Figure>`. Per the diagrams index, "annotated illustration" picks HTML+CSS over a graph engine. The table has three rows of data (one per input) and three result columns plus the input column; color the column headers (not the cells) to signal default/better/best.
- **`Intl.Segmenter` constructor locale.** Use `'en'` in every snippet — the course defaults to English-only UI. Don't introduce locale comparisons here; that's i18n territory.
- **No polyfill, no feature check, no try/catch around the segmenter.** It's baseline; treat it as native. Adding a fallback in the lesson teaches the wrong reflex.
