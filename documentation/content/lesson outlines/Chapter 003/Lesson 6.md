# Lesson 6 — Regex: the modern flavor

- **Title (h1):** `Regex: the modern flavor`
- **Sidebar label:** `Regex`

The chapter-outline title fits — it names the lesson's two halves (modern flavor that 2026 ships, *and* the senior under-reach reflex). Sidebar shortens to one word; the chapter sidebar already reads as a list of containers, so a single-word entry for the tool that isn't a container reads cleanly.

---

## Lesson framing

**Pedagogical archetype.** Mechanics with a strong Decision close, as the chapter outline specifies. The mechanics half installs the 2026 syntax surface (flags, named groups, `\p{...}`, lookarounds, `.matchAll`); the decision half installs the under-reach reflex (when a parser replaces the regex). Both halves matter — without the syntax surface, the student writes 2015-flavor regex; without the decision rule, they reach for regex on structured formats where it silently fails.

**The senior question.** Regex is the *one* tool in this chapter where the senior reflex is to *not reach for it*. Every previous container lesson taught "here's the tool, here's the trigger that earns it." This lesson does the same — the trigger that earns a regex is *unstructured text matching with no available parser* — and spends as much time on what disqualifies a regex as on what regex syntax to write when one is earned.

**Two opening bug shapes** (consistent with the chapter's "open cold with bug snippets" pattern, per Continuity notes for L1–L5):

1. A username validator `/^[a-zA-Z0-9]+$/` that rejects every non-Latin name — the Unicode bug landing on the first non-English signup.
2. An email "validation" regex used in a Server Action where Zod's `z.email()` does the job correctly — the regex-where-parser-belongs bug.

Both fire in the first 30 lines so the student arrives at the syntax half already knowing what the senior reflex prevents.

**Continuity threads to maintain (from Continuity notes):**

- **Open cold, no intro h2.** Two bug snippets land before the first heading.
- **Seed domain.** Invoices `{id, amountCents, status, customerId, dueDate}` plus user-input shapes (username, email, ISO date) for the validation examples. Use real invoice fields where regex would land in a SaaS codebase (invoice number format `INV-2026-0042`, ISO date parsing).
- **Trigger-before-tool framing.** Each conditional surface (`v` flag, lookbehind, named group) gets named with its trigger.
- **`Term` for non-obvious vocabulary.** Reuse the dashed-underline pattern from L1–L5.
- **Forward-link sentences soft.** One sentence per Unit 6 / Ch 012 / Ch 009 reference, no expansion.
- **Node 24 LTS recall.** Brief mention that the `v` flag and `\p{...}` are universally available because of the pinned runtime baseline.
- **`CodeReview` Decision close.** L3 ended with `CodeReview`; L6's Decision-archetype close earns the same exercise component (different rubric — "drop the regex").

**Mental model the student leaves with.** A two-step gate before any regex is written:

1. **Is the input a structured format?** (email, URL, JSON, HTML, CSV, Markdown, date, IANA-typed thing.) → Use the parser. Zod for emails/URLs at the schema boundary; `new URL()` for URLs; `JSON.parse()` for JSON; `DOMParser` for HTML; `Temporal.PlainDate.from` for ISO dates. **No regex.**
2. **Is the regex going to be longer than ~20 characters of escapes?** → A small parser (a few `.indexOf`/`.slice` calls or a tokenizer) is the right reach.

If both gates pass — a small unstructured pattern on bounded human text — write modern regex: literal form, `v` flag for emoji-aware classes (else `u`), named capture groups, `.matchAll` for capture iteration, `\p{Letter}` over `[a-zA-Z]`.

**What students get wrong on first contact (and what the lesson defuses):**

- Reach for regex on emails, URLs, dates by default. Defused by the opening bug pair and the "drop the regex" threshold section.
- Write `[a-zA-Z]` thinking it covers "all letters." Defused by the `\p{Letter}` before/after demo with non-Latin names.
- Write `.match` with `g` and try to read capture groups. Defused by the `.match` vs `.matchAll` asymmetry section with a `PredictOutput`.
- Conflate `u` and `v` or assume both can co-exist. Defused by the flag-surface enumeration and one-line note that `u` and `v` are mutually exclusive.
- Reach for `match[1]`, `match[2]` instead of named groups. Defused by the named-group section being the *first* group-handling form taught (not introduced after indexed groups).
- Forget that `.test` with `g` carries `lastIndex` state. Defused by the result-surface section, one line + one snippet.

**No video.** The surface is enumerated and the visual elements (before/after demos, syntax breakdowns) are best handled inline; a YouTube embed would dilute the tight beat structure.

**Estimated student time:** 35 to 40 minutes (matches chapter outline estimate).

---

## Lesson sections

The lesson runs cold open → six h2 sections → external resources. No intro h2 (per Ch 003 cold-open convention). The first h2 is the construction-form section after the two bug snippets land.

### Cold open (no heading)

Two adjacent `CodeVariants` panels — each a single tab — showing the two bug shapes named in the lesson framing. Each is at most 10 lines, with one-paragraph callouts naming the bug class without yet teaching the fix.

- **Bug 1 — the Latin-only username validator.** `/^[a-zA-Z0-9]+$/` rejects `"Müller"`, `"小明"`, `"José"`. One paragraph: "This regex shipped to a sign-up form on launch day. By the next morning the support inbox had thirty complaints from non-English users."
- **Bug 2 — the hand-rolled email regex.** A 60-character regex attempting RFC 5322 validation in a Server Action input parse. One paragraph: "The regex is shorter than RFC 5322 and longer than the team would maintain. Zod 4's `z.email()` is one method call away."

End the cold open with a single sentence: *"This lesson teaches the regex flavor a 2026 senior actually writes, and the threshold where the regex stops being the right tool."*

**Why this opening:** the two bugs frame both halves of the lesson — Unicode-correctness for the mechanics half, parser-replacement for the decision half. Consistent with L1–L5 cold-open pattern from Continuity notes.

**Components:** `CodeVariants` is the wrong shape for adjacent single-tab snippets; use two plain fenced `Code` blocks with prose between them. (The two snippets are different bug shapes, not before/after of the same code.)

### Two construction forms: literal versus constructor

Tight one-beat section. The two forms in two short snippets side by side via `CodeVariants` (two tabs: "Literal" and "Constructor").

**Literal form `/pattern/flags`** — the senior default. Short, flags visible, compiled once at parse time.

**Constructor `new RegExp(pattern, flags)`** — the conditional reach when the pattern is built from a variable.

The senior watch-out, named in one paragraph: with the constructor, every backslash in the pattern string doubles. `new RegExp('\\d+')` not `new RegExp('\d+')`. The fix when interpolation is genuinely needed: build the pattern with a template literal and a small `escapeRegex` helper for any user-supplied substring. (Sketch the helper in 3 lines — `replace(/[.*+?^${}()|[\]\\]/g, '\\$&')` — and name it as the form `Object.fromEntries(escapeRegex) → new RegExp` rather than reaching for an npm package.)

**Trigger for the constructor:** the pattern itself is dynamic (a user-supplied search term, a parameterized field name). Otherwise, literal.

### The flag surface

Six flags the course actually reaches for, in a tight enumerated block. Use a small two-column reference card: flag letter on the left, one-line trigger on the right. Plain markdown table or `Buckets`-style layout would over-engineer this — a `Code` block with comments is the cleanest form.

Brief one-line per flag:

- **`g`** — required for `.matchAll` and `.replaceAll(regex, ...)`. Without it, `.match` stops at the first hit.
- **`i`** — case-insensitive. Daily reach for human input.
- **`m`** — `^` and `$` match line boundaries, not just string boundaries.
- **`s`** — `.` matches newlines (dotAll). Required for any pattern that spans lines.
- **`u`** — Unicode mode. Full code-point matching, validates escape sequences, enables `\p{...}` property escapes. Always on for human text.
- **`v`** — ES2024 successor to `u`. Same as `u` plus set operations inside character classes (`&&`, `--`, nested classes) and properties-of-strings (`\p{RGI_Emoji}`).

**The `u`/`v` rule, stated in one paragraph and underlined.** They are *mutually exclusive* — writing `/pattern/uv` is a syntax error. The senior default is `u`. Reach for `v` when matching emoji sequences or composing character classes with intersection/difference. Both are universally available in May 2026 (Node 24, Chrome 117+, Firefox 119+, Safari 17.4+) — recall that the Node 24 LTS pin from L8 makes this a non-question.

Wrap the `u` vs `v` distinction in a `<Term definition="...">` for `unicode mode` and `unicode sets mode` so the dashed underline lets students probe without breaking flow.

**Forward-link.** Zod's `.regex(...)` accepts a `RegExp`; the flags travel with the pattern. One sentence.

### Named capture groups

The senior form for any regex that captures structure — taught *before* indexed groups so the student's first mental model is named.

One worked snippet, parsed via `AnnotatedCode` with three steps to focus attention on the pattern → result.match → result.groups chain:

```ts
const dateRe = /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})$/;
const match = '2026-05-26'.match(dateRe);
if (match?.groups) {
  const { year, month, day } = match.groups;
  // year: '2026', month: '05', day: '26'
}
```

**`AnnotatedCode` steps:**

1. The `(?<name>...)` syntax — highlight the three named groups, name the syntax once.
2. The `match.groups` accessor — highlight `match.groups` and the destructure, note that `.groups` is `undefined` on no-match so the `match?.groups` guard is the senior form.
3. TypeScript inference on `.groups` — note that under default `lib`, `.groups` is typed as `{ [key: string]: string }` (or `undefined` when no match). For tighter typing, `as const` on the pattern doesn't help; the type can be narrowed at the call site with a small `satisfies`-led result type if it matters. (One sentence — the deeper template-literal-type machinery is out of scope.)

**Why named first:** the chapter-outline says `match[1]`, `match[2]` is the form the senior never reaches for in 2026. Teaching indexed groups first installs the wrong default. Indexed groups get *one sentence* mentioning they exist (`/...(...)/.exec()` returns array-indexed captures) and a one-line backreference example using `\k<name>` (named) and `\1` (indexed) — with one sentence on ReDoS as the only watch-out attached.

**ReDoS** (`<Term definition="Regular-expression Denial of Service — adversarial input on patterns with nested quantifiers like (a+)+ causes catastrophic backtracking">ReDoS</Term>`) gets one sentence: *don't nest quantifiers, don't follow unbounded `.*` with alternation, and run untrusted input through length limits before the regex sees it.* This is the entire ReDoS surface for the lesson.

### Property escapes: `\p{Letter}` over `[a-zA-Z]`

The single biggest senior-reflex install in the lesson. The bug that opened the lesson (`[a-zA-Z]` rejecting non-Latin names) gets resolved here.

**Before/after** via `CodeVariants` with two tabs:

- **Tab 1 — "Latin-only (broken)":** `/^[a-zA-Z]+$/u` tested against `['Müller', '小明', 'José', 'Smith']`. Three out of four fail.
- **Tab 2 — "Unicode-aware (correct)":** `/^\p{Letter}+$/u` tested against the same array. All four pass.

Use `del=` / `ins=` markers on the pattern line in each tab; show the test output as a small `// →` comment trail under the array.

**The `\p{...}` surface, named once each in a tight enumeration:**

- `\p{Letter}` — any letter in any script (the common reach for "this looks like a name").
- `\p{Number}` — any numeric character.
- `\p{White_Space}` — any whitespace including non-ASCII spaces.
- `\p{Emoji}` — any emoji code point.
- `\p{Script=Latin}`, `\p{Script=Han}`, etc. — script-specific filters when intentional.

**Trigger:** any regex on human text. Reach for `\p{Letter}` by reflex; `[a-zA-Z]` lives only in patterns over ASCII-by-contract data (an ASCII hex token, a Base64 chunk).

**The `v`-flag set operations, named at the trigger** (not earlier). One short snippet showing one operation:

```ts
// Letters that are ASCII (Latin alphabet only, explicitly)
const asciiLetter = /^[\p{Letter}&&\p{ASCII}]+$/v;
```

One sentence on the other two operators: `--` for difference (`[\p{Letter}--\p{ASCII}]` for non-ASCII letters), nested classes for union by default. This is a recognition surface, not a daily-write surface — the student needs to recognize `&&` and `--` inside a class without confusing them with logical operators.

### The result surface: `.test`, `.match`, `.matchAll`, `.replaceAll`

The four-method API for executing a regex against a string. Tight enumeration; the asymmetry between `.match` with/without `g` is the trap that earns a `PredictOutput`.

Use one `Code` block per method, each three to five lines:

**`pattern.test(string)`** — returns boolean. Fastest, cleanest, the senior reach for "does this match." Watch-out: a `g`-flag regex carries `lastIndex` state across `.test` calls — avoid `g` on patterns reused with `.test`. One snippet: a module-scope `const isHexColor = /^#[\da-f]{6}$/i;` plus three `.test` calls.

**`string.match(pattern)`** — the asymmetric one.
- *Without `g`:* returns one match object with `.groups`, `.index`, the full match, and captures.
- *With `g`:* returns a plain array of matched strings — *no* groups, no indices, no captures.

This is the historical footgun. The senior fix: never use `.match` with `g` when groups are needed; reach for `.matchAll` instead.

**`string.matchAll(pattern)`** — *requires* `g` (throws `TypeError` otherwise). Returns an iterator of full match objects, each with `.groups`, `.index`, captures. Pair with `for...of` (from L5) for natural iteration; pair with `Array.from(...)` when an array is needed.

**`string.replaceAll(pattern, replacement)`** — with a string argument, plain substring replacement (no regex involvement). With a regex argument, the regex *must* have `g` (TypeScript errors and runtime throws otherwise) — this strictness prevents the historical `.replace(/x/, ...)` bug that silently replaced only the first occurrence. Replacement can be a string with `$<name>` / `$1` backrefs, or a function `(match, ...groups) => string`. One snippet showing the function form on a `.matchAll`-style pattern.

**`PredictOutput` exercise** at the end of this section. The trap: `.match` with `g` returning strings (no groups).

```ts
const text = 'order INV-2026-0001 and INV-2026-0042';
const re = /INV-(?<year>\d{4})-(?<num>\d{4})/g;
const result = text.match(re);
console.log(result?.[0]);
console.log(result?.[0]?.groups);
```

Expected output:
```
INV-2026-0001
undefined
```

`PredictWhy`: *"`.match` with `g` returns a plain `string[]` — the per-match group objects are thrown away. Switch to `text.matchAll(re)` and the result is an iterator of `RegExpExecArray` with `.groups` on each."*

### Lookarounds

Four forms, one snippet, the trigger named.

The senior trigger: the surrounding context is part of the match *condition* but shouldn't be part of the *captured text*. Otherwise, just capture and slice — lookarounds are not a daily-write surface.

One `Code` block enumerating the four forms with one-line examples:

```ts
// (?=...)  positive lookahead — assert what follows
// (?!...)  negative lookahead
// (?<=...) positive lookbehind — assert what precedes
// (?<!...) negative lookbehind

// "Match a number followed by px, without capturing the px"
const pxValue = /\d+(?=px)/g;
'16px 24em 32px'.match(pxValue); // → ['16', '32']
```

All four ship universally in 2026; no compatibility note needed.

### When to drop the regex

The Decision-archetype close. This is where the lesson's mental model lands.

Two clear triggers, each with one parser named:

**Trigger 1: the input is a structured format.** A small table or enumerated block naming the format and the parser:

| Format | Parser (senior reach) |
| --- | --- |
| Email | `z.email()` (Zod 4, forward link Unit 6) |
| URL | `new URL(input)` — throws on invalid |
| JSON | `JSON.parse(input)` (forward link Ch 009) |
| HTML | `DOMParser` (browser) or a real HTML parser (server) |
| CSV | a CSV library (named once; not regex) |
| Markdown | a Markdown parser (named once) |
| ISO date | `Temporal.PlainDate.from(input)` (forward link Ch 009 / Unit 17) |

**Trigger 2: the regex is becoming unreadable.** The 20-character-of-escapes rule. When the reviewer can't tell what the regex matches in one read, the threshold is crossed — a small parser (a few `.indexOf` / `.slice` calls, or a real tokenizer if the format earns it) is the right reach.

**`CodeReview` exercise** as the closing beat. A small validation function reaches for a regex where a parser belongs; the student plants comments on the right lines.

The seed: a function `validateContactInput(input: string)` (the field is supposed to accept either an email or a URL) using two hand-rolled regexes against the input. Both regexes are subtly wrong (the email one allows `..` runs, the URL one matches `http:////foo`). The PR-diff shows the function being added in a single file.

**Two seeded `ReviewIssue` plants:**

1. **Line targeting the email regex.** Kernel: `"hand-rolled email regex where z.email() does the job"`. Reveal: senior names Zod 4's `z.email()` as the form, with one sentence that hand-rolled email regex are a perennial source of false rejections; the schema-level validator carries error messages and JSON Schema shape for free.
2. **Line targeting the URL regex.** Kernel: `"hand-rolled URL regex where new URL() does the job"`. Reveal: senior names `try { new URL(input); } catch { ... }` (or the `URL.canParse(input)` static — universally available in 2026 — as the boolean form) as the right reach.

Optional `ReviewWhy`: *"Two regex-vs-parser flags in one file. The lesson here is to scan any input-validation function for hand-rolled regex against structured formats — those are almost always wrong."*

**Why `CodeReview` here:** L3 closed with `CodeReview` on the "drop into `for...of`" decision; the same exercise component on the "drop the regex" decision keeps the chapter's Decision-archetype rhythm consistent. The student practices the *spotting* skill, not the writing skill — which matches the Decision-archetype goal.

### External resources

Closing `CardGrid` with `ExternalResource` cards. Five cards, all canonical sources (MDN for the regex reference, web.dev / V8 blog for the `v` flag landing post, TC39 proposal for `Iterator`-adjacent backstory if it earns a slot, Zod docs for `z.email()` / `z.url()`, and a Unicode property escape reference).

Suggested cards:

- **MDN — Regular expression syntax** — canonical reference for the full surface. `icon="simple-icons:mdnwebdocs"`.
- **MDN — Unicode property escapes (`\p{...}`)** — the property-name catalog. Same icon.
- **V8 blog — RegExp `v` flag** — the canonical landing post for the `v` flag and set operations. `icon="simple-icons:v8"` if available, else a generic lucide glyph.
- **Zod 4 — String formats** — the top-level format builders (`z.email`, `z.url`, `z.iso.datetime`) referenced as the parser replacement for regex on structured formats. `icon="simple-icons:zod"`.
- **regex101.com** — the interactive regex playground; the place to take a regex when reading it goes from "obvious" to "I need a tool." Useful both as a sanity-check workflow and as the moment the regex is about to cross the unreadable threshold. `icon` generic.

(MDN cards under the same h2 heading "External resources" per Continuity notes L1: "no MDN 'Further reading' h2 heading — cards placed under `## External resources` instead.")

---

## `Term` glossary (terms for inline dashed-underline tooltips)

- `unicode mode` — *"The `u` regex flag enables Unicode-aware matching: full code-point handling, validation of escape sequences, and `\p{...}` property escapes."*
- `unicode sets mode` — *"The `v` regex flag (ES2024). Supersedes `u`: adds set operations (`&&`, `--`) inside character classes and properties-of-strings like `\p{RGI_Emoji}`. Mutually exclusive with `u`."*
- `ReDoS` — *"Regular-expression Denial of Service. Adversarial input on patterns with nested quantifiers like `(a+)+` causes catastrophic backtracking. Avoid nesting quantifiers; length-cap untrusted input before the regex."*
- `lookaround` — *"A regex assertion that matches *position* by what surrounds it, without consuming characters. Four forms: `(?=...)`, `(?!...)`, `(?<=...)`, `(?<!...)`."*
- `property escape` — *"A `\p{...}` (or `\P{...}` for the negation) escape that matches Unicode characters by named property — `\p{Letter}`, `\p{Number}`, `\p{Script=Han}`. Requires the `u` or `v` flag."*

Reuse `<Term>` patterns already established in L1–L5. No need to re-define `noUncheckedIndexedAccess` (it doesn't land in this lesson).

---

## Component checklist (final shape)

- **`Code`** — two cold-open snippets, the constructor-form snippets, the flag enumeration block, the lookaround block, the result-surface mini-snippets.
- **`CodeVariants` + `CodeVariant`** — the literal-vs-constructor pair; the `\p{Letter}` before/after pair.
- **`AnnotatedCode` + `AnnotatedStep`** — the named-capture-groups three-step walkthrough.
- **`Term`** — five inline definitions named above.
- **`PredictOutput` + `PredictWhy`** — the `.match`-with-`g`-drops-groups trap.
- **`CodeReview` + `ReviewFile` + `ReviewIssue` + `ReviewWhy`** — the closing "drop the regex" exercise with two plants.
- **`CardGrid` + `ExternalResource`** — closing five-card row.
- **No `VideoCallout`** — surface is enumerated; no video earns its weight.
- **No `Figure` / diagram** — the lesson is text + code, not visual structure. The closest a diagram could come is a decision-tree for "regex or parser," but the two-trigger list does the job more economically.
- **No `Buckets`** — the lesson's decision shape is binary (regex vs parser), not a multi-way classification; `CodeReview` lands the same install with stronger transfer.

---

## Scope

### What this lesson covers

- The two construction forms (literal default, constructor for interpolation).
- The six daily-reach flags (`g`, `i`, `m`, `s`, `u`, `v`) with the `u`/`v` mutual-exclusivity rule.
- Named capture groups as the senior default for any structured capture.
- Indexed groups and backreferences named once each.
- Property escapes (`\p{Letter}`, `\p{Number}`, `\p{Emoji}`, `\p{Script=...}`).
- `v`-flag set operations (`&&`, `--`, nested classes) as a recognition surface.
- The four-method result surface (`.test`, `.match`, `.matchAll`, `.replaceAll`) and the `.match`-with-`g`-loses-groups asymmetry.
- The four lookarounds (lookahead/lookbehind, positive/negative).
- The "drop the regex" decision — when a parser (Zod, `new URL`, `JSON.parse`, `Temporal.PlainDate.from`, `DOMParser`) is the right reach.
- One-sentence ReDoS mitigation rules.

### What this lesson does not cover

- **Regex engine internals.** NFA vs DFA, V8 vs JSC differences — the course uses regex as a tool, engine choice is invisible at the senior level.
- **The sticky `y` flag and `lastIndex` write surface.** Named in one line at most.
- **The `d` flag (hasIndices) for match positions.** Useful for tooling/highlighting; not in daily SaaS reach. Named in one line at most.
- **Regex performance tuning beyond the ReDoS sentence.**
- **Building regex from regex literals at runtime** (`new RegExp(literal.source + ...)`) — composition path is unusual; not taught.
- **Full RFC 5322 email parsing or robust HTML parsing via regex.** Both are explicitly disqualified by the "drop the regex" section — pointing students at a parser instead.
- **Async iteration.** Owned by Ch 007 L3. Forward-linked from L5, not here.
- **Zod 4's `.regex()`, `.email()`, `.url()` API in depth.** Owned by Unit 6 (Chapters 042–047). Named at the call site as "the parser replacement," with one forward-link sentence.
- **`new URL` in depth.** Owned by Ch 012. Named as the URL-validation reach.
- **`JSON.parse` and serialization round-trips.** Owned by Ch 009 L1. Named in one line as the JSON parser.
- **`Temporal.PlainDate.from` in depth.** Owned by Ch 009. Named in one line as the ISO-date parser.
- **`DOMParser` in depth.** Owned by Unit 2 (DOM). Named in one line as the HTML parser.
- **The `escapeRegex` helper as a library.** Sketched in 3 lines as the form for "interpolate user input into a regex"; not promoted to an exported utility (that lands when projects start in Unit 3).
- **Custom Biome / ESLint rules for regex.** Out of scope; the linter conversation happens in Ch 028 L5.

### Prerequisite recall (already taught, used here)

- **`noUncheckedIndexedAccess`** (L1, used implicitly when handling `.match` returning `RegExpMatchArray | null`).
- **`for...of`** (L5, used in one snippet to iterate `.matchAll`).
- **`Array.from(iterable)`** (L2, used in the `Array.from(text.matchAll(re))` aside).
- **Spread `...`** (Ch 001 L1, used in any small array building inside an example).
- **Optional chaining `?.`** and **nullish coalescing `??`** (Ch 002 L5, used pervasively).
- **Node 24 LTS pin** (chapter framing recall) as the runtime making the `v` flag and `\p{...}` universally available.

### Forward links (one-sentence each, no expansion)

- **Zod 4 `z.email()`, `z.url()`, `z.iso.datetime()`, `z.string().regex(...)`** — Unit 6.
- **`new URL(input)` and `URL.canParse(input)`** — Ch 012 (HTTP).
- **`JSON.parse` and serialization** — Ch 009 L1.
- **`Temporal.PlainDate.from`** — Ch 009 / Unit 17.
- **`DOMParser`** — Unit 2 (DOM).
- **The `dedent` / `sql` tagged-template parsers** named in Ch 001 L5 as the precedent where a parser replaced regex on multi-line strings (one sentence — backward link, not forward).
