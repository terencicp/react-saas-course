# Lesson 5 — Backticks and tagged templates

## Lesson title

- **Title (h1):** Backticks and tagged templates
- **Sidebar label:** Backticks and tags

## Lesson framing

This is a Mechanics lesson with a small Reference moment for the two canonical tags. The student learns one syntax family (template literals) and one extension (tagged templates), then meets the two production cases — `sql\`...\`` and `` dedent`...` `` — that justify the whole family in a 2026 SaaS stack.

Two production failure modes drive the lesson:

1. Hand-built SQL via `+` concatenation: the door SQL injection walks through.
2. Hand-built multi-line strings via `+ '\n'`: unreadable source, breaks the moment a translator or a system prompt grows past five lines.

The student should leave able to:

- Reach for backticks by default for any interpolated or multi-line string.
- Read a tagged-template call and explain what the tag receives.
- Recognize `sql\`...\`` and `` dedent`...` `` on sight in later units (Drizzle's `sql` escape hatch lands in Unit 5; `dedent` shows up wherever the course authors prompts, email bodies, or fixture text).
- Know that the parameterization in `sql\`...\`` is **what** makes SQL safe — not the developer's discipline.

The student does **not** need to author production tag functions. The mechanics-of-the-tag-call section is for *recognition*, not authorship; one tiny tag example exists to make the mechanics legible, no more.

Pedagogical thread that ties the lesson together: **the tag is a function call wearing a string costume.** Once that costume comes off, the rest of the lesson reads as ordinary function-call semantics.

Cognitive-load staging:

1. Backticks as a plain string with two extras (interpolation, newlines). Familiar shape, new affordances.
2. Tags as a *call* that receives the static and dynamic pieces separately. One conceptual jump.
3. Two production tags. The conceptual jump pays off — `sql` parameterizes, `dedent` re-aligns; the syntax shape is identical.

No diagrams of complex systems are needed. One annotated walkthrough of the tag-call mechanics is the only structural visual. The lesson is short by design (20–25 min) and earns its place by installing recognition for two patterns the student will see repeatedly.

The chapter's continuity rules apply: all `.ts`, `const`-bound arrow functions, inference-led, single quotes for strings (Biome), backticks only when interpolating or multi-line, no emojis in code. Variable names are domain-tied (`user`, `invoice`, `cents`), never `foo`/`bar`.

## Lesson sections

### Section 1 — Two strings, two bugs (intro)

Open with the two failure modes side-by-side in a `<CodeVariants>` block. Each variant is the *wrong* shape — these are not "before / after," they're "two faces of the same anti-pattern."

- Variant A (label "Concatenated SQL", tinted orange): `const query = "SELECT * FROM users WHERE email = '" + email + "'";` — one sentence below noting the injection door (e.g., `email = "x' OR '1'='1"`).
- Variant B (label "Concatenated multi-line", tinted orange): a 5-line prompt or email body assembled with `+ '\n'` and indented variables — one sentence below noting that the source no longer reads as the output.

Then one paragraph naming the fix in advance: **backticks for both, tags when the string is structured.** One sentence preview that `sql\`...\`` is what Drizzle gives the student in Unit 5 to safely write hand-crafted queries when the query builder doesn't fit, and `dedent` is the npm package the course uses for multi-line text.

Reasoning: opening with the concrete production smell lands the "Decisions before syntax" filter. The two failure modes are unrelated *cosmetically* but identical *structurally* — they're both "string built by concatenation." The lesson teaches one syntax for both.

### Section 2 — Backticks as the default

The shape: backticks, `${expression}` placeholders, expressions can be anything (variable, function call, ternary, property access). Multi-line allowed; backticks preserve newlines.

Use one short `Code` block (a single fence) showing four daily shapes a senior writes:

```ts
const path = `/invoices/${invoiceId}`;
const heading = `${count} active invoices`;
const className = `rounded-md ${variant === 'primary' ? 'bg-blue-600' : 'bg-zinc-200'}`;
const log = `User ${user.id} requested invoice ${invoice.id}`;
```

One paragraph after the block: any string built from variables uses a template literal; concatenation with `+` is a smell.

Sub-section "Multi-line and the indentation gotcha" (h3): show one multi-line example where the backtick string is authored inside an indented function body, and the leading whitespace becomes part of the string. Two paragraphs:

1. Backticks preserve everything between them — including the four spaces of indentation that align the line with the surrounding code.
2. That's exactly what `dedent` exists to fix, which is the bridge to the tagged-templates section.

Show this with an `<AnnotatedCode>` block. Two steps:

- Step 1 (color blue, line range covering the whole template literal): "The string preserves every character between the backticks."
- Step 2 (color orange, lines containing leading whitespace): "Every line carries the function-body indentation into the output. Annoying for system prompts, broken for whitespace-sensitive formats like YAML."

A `<Term>` on `template literal` with definition: "A string literal authored with backticks. Supports `${expr}` interpolation and multi-line content."

One sentence on `String.raw` — named once, not taught. Tag function on `String` that returns the raw text without processing escape sequences; useful authoring Windows paths or regex sources where `\n` shouldn't become a newline. One line, no example, the student should recognize it on sight if they see it in a library.

Reasoning: introduces backticks as a familiar-shaped string with two new affordances. The indentation gotcha is the *bridge* to dedent — it's not a watch-out, it's the motivation. The lesson sets up dedent's existence before dedent appears.

### Section 3 — A tag is a function call

This is the mechanics moment. The student needs to understand that `tag\`Hello, ${name}!\`` is the same shape as `tag(['Hello, ', '!'], name)` — once that lands, every tagged-template surface in the wider TypeScript ecosystem reads naturally.

Use an `<AnnotatedCode>` block authored with a tiny `currency` tag that interpolates an integer-cents amount as a formatted dollar string (callback to lesson 3's integer-cents discipline — the tag formats `1995` as `$19.95`):

```ts
const currency = (
  strings: TemplateStringsArray,
  ...values: number[]
): string => {
  return strings.reduce((acc, str, i) => {
    const value = values[i];
    const formatted = value === undefined ? '' : `$${(value / 100).toFixed(2)}`;
    return acc + str + formatted;
  }, '');
};

const cents = 1995;
const message = currency`Your total is ${cents} including tax.`;
```

Four steps:

- Step 1 (color blue, `{1-9}`, highlight `strings: TemplateStringsArray` and `...values: number[]`): "The tag receives two things: an array of the static string segments — everything between the `${}` placeholders — and the resolved values from each `${}`, spread as rest parameters."
- Step 2 (color blue, `{11}`, highlight `cents`): "Plain `number` — this is the same integer-cents value lesson 3 stored."
- Step 3 (color green, `{12}`, highlight `` currency`...` ``): "The tag call. The runtime splits the literal into `['Your total is ', ' including tax.']` and the value `1995`, then passes them to `currency`."
- Step 4 (color green, `{4-6}`): "The tag walks the segments, interleaving each with a formatted value. The result is a regular string the caller uses like any other."

One paragraph after the walkthrough: **the tag can do whatever it wants with those arguments**. Escape HTML. Parameterize a SQL query. Strip indentation. Validate the inputs. Return something other than a string. The shape is fixed; the semantics are the tag's call.

A `<Term>` on `tagged template` with definition: "A function call whose arguments are the static and dynamic pieces of a template literal."

A `<Term>` on `TemplateStringsArray` with definition: "The first argument to a tag function — a readonly array of the static string segments between `${}` placeholders."

A `<PredictOutput>` exercise at the end of this section. Author a *very small* identity tag that joins segments and values in order, then ask the student to predict the output of one call. Expected output is a normal interpolated string. The point is to confirm the student tracks how segments and values interleave, not to test exotic behavior.

```ts
const join = (
  strings: TemplateStringsArray,
  ...values: unknown[]
): string => {
  return strings.reduce((acc, str, i) => {
    return acc + str + (i < values.length ? String(values[i]) : '');
  }, '');
};

const role = 'admin';
const count = 3;
console.log(join`${count} ${role}s online`);
```

Expected: `3 admins online`. `<PredictWhy>`: "`strings` is `['', ' ', 's online']`. The reduce interleaves segments and values: `'' + '' + '3' + ' ' + 'admin' + 's online'`."

Reasoning: this is the only mechanics moment in the lesson. One annotated walkthrough and one prediction exercise — that's the budget. The `currency` example doubles as a callback to lesson 3 (integer cents), keeping the chapter's threads woven. The `PredictWhy` text makes the segments-array shape explicit so it's not magic.

### Section 4 — The two production tags

Two subsections, parallel structure. Each subsection: one paragraph of framing, one `Code` block of a real-world call, one paragraph of senior takeaway.

#### 4.1 `sql\`...\`` — parameterized queries by default

Framing: in 2026, every modern SQL client and ORM ships a `sql` tagged template that **automatically parameterizes the interpolated values**. Drizzle exposes `sql` as the escape hatch for the rare query the query builder doesn't fit — and the values inside the `${}` placeholders are sent to the database as separately-bound parameters, never as inlined strings.

Show a Drizzle-shaped example (forward-link to Unit 5, not load-bearing here):

```ts
import { sql } from 'drizzle-orm';

const status = 'paid';
const orgId = '019385f0-1234-7000-a000-000000000001';

const rows = await db.execute(
  sql`SELECT id, total_cents FROM invoices
      WHERE org_id = ${orgId} AND status = ${status}
      ORDER BY created_at DESC LIMIT 50`,
);
```

Use a `<CodeTooltips>` wrapper on this fence with two tooltips:

- `sql` — "Drizzle's tagged template. Returns a SQL fragment with the dynamic values bound as parameters, not interpolated as strings."
- `${orgId}` — "Sent to the database as a bound parameter ($1), not interpolated into the SQL text. The injection door stays shut."

Senior takeaway paragraph: the tagged-template shape is **what makes SQL safe by default**. A string concatenation would inline `orgId` into the SQL text and require the developer to escape it manually. The `sql` tag intercepts the value, binds it to a placeholder, and the database driver handles the parameterization. To write an injection-vulnerable Drizzle query, the developer has to *deliberately* leave the tagged form (via `sql.raw`) and assemble the string by hand — and that escape hatch is named and rare. Forward link in one sentence: Unit 5 lands the full Drizzle treatment; this lesson just teaches the *shape* the student will see.

An `<Aside type="caution">` after the takeaway: "`sql.raw` exists for the genuine cases where the dynamic value is a column or table name, not a value — and it has no parameterization. User input never goes through `sql.raw`."

#### 4.2 `` dedent`...` `` — multi-line strings without indentation noise

Framing: the indentation gotcha from section 2 has a tag-shaped fix. The `dedent` npm package ships a tag that strips the common leading whitespace from every line of a multi-line template literal. The source reads aligned with its surroundings; the output is clean.

Show a `<CodeVariants>` block contrasting `without dedent` and `with dedent` on the same multi-line value (e.g., a tiny system prompt or a fixture body):

- Variant A (label "Without `dedent`", tinted orange): a backtick string authored inside an indented function body where every line carries six spaces of leading whitespace into the output. Below the fence, one sentence noting the YAML-breaking / prompt-mangling consequence.
- Variant B (label "With `dedent`", tinted green): same source, prefixed with `` dedent`...` ``. Below the fence, one sentence noting the output is aligned and indentation-free.

Code shape for variant B:

```ts
import dedent from 'dedent';

const prompt = dedent`
  You are an invoicing assistant.
  Customer ${customerName} has ${unpaidCount} unpaid invoices.
  Reply in fewer than 200 words.
`;
```

Senior takeaway paragraph: `dedent` earns its place because the alternatives all hurt readability — either the source string un-indents (visually out of phase with its surroundings) or the runtime output carries indentation it shouldn't. The tag is a one-import fix and is the course's default for any string over a few lines: email bodies (Unit 7), system prompts (later units), and fixture text in tests. One sentence forward link, no more.

A `<Term>` on `dedent` with definition: "An npm package exposing a tagged template that strips the common leading whitespace from every line of a multi-line string."

Reasoning: two production tags, parallel framing, one screen of code each. The student leaves with two recognition shapes and a clear "why" for each. The `sql` story carries the security punch (which is the senior-grade contribution); the `dedent` story carries the daily-ergonomics punch.

### Section 5 — Check yourself

One `<Matching>` exercise with four pairs. Left column: the string the student wants to author. Right column: the tag (or absence of tag) that's the right reach.

- Left: "A short interpolated string like `` `/invoices/${id}` ``." → Right: "Plain template literal, no tag."
- Left: "A 200-line system prompt the team edits inside the source file." → Right: ``dedent`...` ``.
- Left: "A hand-written SQL query selecting rows by a user-submitted org ID." → Right: ``sql`...` ``.
- Left: "A small log line built from a user ID and an action name." → Right: "Plain template literal, no tag."

`instructions` prop: "Match each string to the right shape."

Reasoning: the lesson is a recognition install, not an authorship install. The matching exercise is the highest-leverage check for "did the student install the senior reflex for which tag to reach for." Two "no tag" answers are intentional — the student should not over-reach for tags. A `<MultipleChoice>` was considered but rejected: matching pairs are stronger for "pick the right tool from a small set" than a single MCQ would be.

### Section 6 — External resources

A `<CardGrid>` of two or three `<ExternalResource>` cards:

- MDN — Template literals. `simple-icons:mdnwebdocs`. Description: "Reference for the syntax and edge cases not covered here."
- Drizzle — `sql` template. `simple-icons:drizzle` (or `lucide:database`). Description: "The Drizzle escape hatch the lesson previews."
- `dedent` on npm. `simple-icons:npm`. Description: "The package this course uses for multi-line strings."

Reasoning: standard close. Each card is a one-jump path for the student who wants the next layer of depth without forcing it into the lesson.

## Scope

**In scope:**

- Backticks as the default for interpolation and multi-line strings.
- The indentation gotcha (segue to `dedent`).
- Tagged-template mechanics — what the tag function receives, illustrated with one tiny `currency` tag.
- `sql\`...\`` as the parameterized-queries case (Drizzle-shaped example, but the shape is the lesson, not the ORM).
- `` dedent`...` `` as the multi-line authoring case.

**Explicitly out of scope (handled elsewhere or deliberately cut):**

- Authoring production tag functions from scratch — recognition only. The mechanics are shown once for legibility; the course never asks the student to write a tag.
- `String.raw` at depth. One-sentence mention so the student recognizes it.
- HTML templating via tagged templates (lit-html, Hono's `html`). Out of stack.
- CSS-in-JS via styled-components / Emotion. Stack-incompatible (Tailwind v4).
- The full `String.prototype` surface — covered in lesson 4 of this chapter.
- Drizzle query-builder depth, `sql.raw` patterns, parameter binding internals — Unit 5 territory.
- Email-template authoring patterns — Unit 7 territory.
- TC39 proposals around template literals or string interpolation.

**Prerequisite redefinitions (concise):**

- "Integer cents" — money stored as `number` of the smallest currency unit (cents for USD); lesson 3 installed this. Re-named in one sentence when the `currency` tag example uses it.
- "Reference equality" — lesson 2 territory; the lesson doesn't lean on it.
- "`const`-bound arrow function" — the course's default function form; no re-explanation needed, the student has seen it across lessons 1–4.

## Components used (summary for downstream agents)

- `<CodeVariants>` + `<CodeVariant>` — section 1 (two anti-patterns), section 4.2 (with / without dedent).
- `<Code>` (fenced blocks) — section 2 (daily backtick shapes), section 4.1 (`sql` example).
- `<AnnotatedCode>` + `<AnnotatedStep>` — section 2 (indentation gotcha, 2 steps), section 3 (`currency` tag mechanics, 4 steps).
- `<CodeTooltips>` — section 4.1 (tooltips on `sql` and `${orgId}` inside the Drizzle example).
- `<PredictOutput>` + `<PredictWhy>` — section 3 (identity-tag prediction).
- `<Matching>` + `<Pair>` — section 5 (recognition check).
- `<Term>` — `template literal`, `tagged template`, `TemplateStringsArray`, `dedent`.
- `<Aside type="caution">` — section 4.1 (`sql.raw` caveat).
- `<CardGrid>` + `<ExternalResource>` — section 6.

No custom lesson-specific components are needed for this lesson (no `src/components/lessons/001/5/` directory required). The mechanics are simple enough that the pre-built components carry the whole load.

No `<VideoCallout>` for this lesson — the topic is short and the existing prose-plus-annotated-code coverage is enough. If a downstream agent finds a strong, recent 5–8-minute explainer specifically on tagged templates (not on backticks broadly), they may add one to section 3; otherwise skip.

No sandbox callout — the `PredictOutput` is sufficient; there's no productive sandbox use case for tagged templates that doesn't reduce to "write a tag," which the lesson deliberately doesn't ask for.

## Estimated student time

20–25 minutes (matches the chapter outline budget).
