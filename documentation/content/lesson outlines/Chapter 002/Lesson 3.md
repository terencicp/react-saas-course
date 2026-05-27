# Lesson 3 — Name for intent, not implementation

- **Title (h1):** `Name for intent, not implementation`
- **Sidebar label:** `Naming for intent`

---

## Lesson framing

This lesson installs **Architectural Principle #4** — *a name says what the value is or what the function does, not how it's computed* — across the four naming surfaces (variables, functions, parameters, types). After lessons 1 and 2 picked the **form** and **shape** of functions, this one picks the **labels** that hang on every binding in the codebase. Naming is the only piece of code the next reader sees before they read the implementation; getting it wrong is a coordination cost paid by every future reader, on every PR, forever.

The pedagogical archetype is **Concept** with a heavy **Recognition** close. The student doesn't need to memorize a verb glossary — they need a reflex that fires in code review when they see `data`, `userArray`, or `notDisabled`. Three forces shape the lesson:

- **Three classes of bad names, named.** The lesson groups every bad-name failure into three recognizable categories: implementation-leaking, vague abstractions, negated booleans. Reflex install via category is sharper than rule-by-rule prose. The student leaves with three filters they can run on every name in a diff.
- **Asymmetric principle.** A vague *acceptable* name (`user`, `total`) is fine. An implementation-leaking name that pins a future reader to today's representation (`userArray`, `totalReducer`) is the smell. The principle isn't "be specific" — it's "don't leak how, do say what." This asymmetry is the senior-vs-bootcamp tell and the lesson states it explicitly.
- **Boolean prefixes as a recognition pattern.** `is*` / `has*` / `can*` / `should*` aren't typing discipline — they're a visual contract. When the reader sees `is`, they know the value is a boolean *before* they read its type annotation. The convention isn't about style; it's about reading speed.

Three threads from the chapter framing run through this lesson:

- **Decisions before syntax.** Open with three real bugs that start at the name — `data`, `processOrder`, `notDisabled`. The categorization follows the failure.
- **Senior reflexes, not surveys.** The course doesn't legislate a verb glossary (`fetch` vs `load` vs `get` is a team-codebase call). It legislates the **three categories of bad names** and the **boolean-prefix convention**. Consistency beats correctness when both are acceptable.
- **Forward links land softly.** Type names in Ch 004. Hook prefix `use*` in Unit 3 (the only structurally-enforced naming convention React enforces). Server Action verb+noun (Ch 030). Drizzle table/column casing (Unit 5). One sentence each.

Two non-obvious calls the lesson makes:

- **No "tools we use" framing.** Biome can lint the easy parts (no `enum`, no negated boolean predicate via a custom rule) but naming is fundamentally a human discipline. The lesson names Biome's role honestly — small — and centers the human reflex.
- **No live-coding exercises.** Naming isn't a thing to "play with" in a sandbox; it's a recognition pattern. The lesson closes with a `CodeReview` (spot the bad name in a diff) and a `Buckets` sort (categorize names by class). These are the right reps for a recognition reflex; a `ScriptCoding` would be busy-work.

Estimated student time: 25 to 30 minutes.

---

## Section: Intro (no h2)

Three short paragraphs. Plant the failure mode, the principle, and the lesson's shape.

- **Para 1 — three real bugs that start at the name.** Each bug in one sentence with the name in inline code:
  - A variable `data` whose shape nobody can know without opening three files.
  - A function `processOrder` whose body the next reader has to read end-to-end to learn what "process" means in this codebase.
  - A boolean `notDisabled` that a future reader misreads when they negate it with `!notDisabled` six months later — a double-negative that reads as "enabled" but doesn't say so.
  Frame these as documentation failures, not style preferences. Every reader pays the cost on every read.
- **Para 2 — the principle, in one sentence.** "**A name says what the value is or what the function does, not how it's computed.**" Mark it as Architectural Principle #4 in the course's running list. The principle is *asymmetric* — a vague-but-fitting name (`user`, `total`) is acceptable; an implementation-leaking name (`userArray`, `totalReducer`) is the smell. State the asymmetry once; the lesson will return to it in the bad-name section.
- **Para 3 — the lesson's shape.** Four naming surfaces (variables, functions, parameters, types), the boolean-prefix convention, three classes of bad names, a paragraph on abbreviations and one on consistency, a `CodeReview` and a `Buckets` to close. Reference Ch 001 L6 in passing (the discipline-not-syntax framing established there) and Lesson 1's `function`/arrow decision (the form is set; this lesson picks the labels).

---

## Section: The principle and the asymmetry

The decision section. Single h2. This is where the lesson states the rule and the asymmetry that makes it senior-shaped rather than bootcamp-shaped.

- **The principle, restated.** One short callout-style `<Aside type="tip">` containing only the sentence: *A name says what the value is or what the function does, not how it's computed.* Labeled as **Architectural Principle #4**.

- **The asymmetry, worked.** Use `<CodeVariants>` with two tabs to land the "vague is fine, leaking is not" point side-by-side. Both tabs show the *same* concrete situation — a function that returns the list of pending invoices for a customer.
  - **Tab 1 — `Acceptable` (green, label `Vague but fitting`):**
    ```ts
    const invoices = getPendingInvoices(customerId);
    ```
    Prose: "`invoices` is unspecific — it doesn't say the source, the filter, or the type. That's fine. The name fits what the value *is*: a collection of invoices. If you renamed the function to return them from cache instead of the DB, the variable name still fits. Vague is acceptable when the value's identity is what the reader needs."
  - **Tab 2 — `Anti-pattern` (orange, label `Implementation-leaking`):**
    ```ts
    const invoicesArray = getPendingInvoicesQueryResult(customerId);
    ```
    Prose: "Both names leak today's implementation. `invoicesArray` pins the reader to the array representation — change to a generator, a Map, or a paginated cursor and the variable name lies. `getPendingInvoicesQueryResult` pins the reader to the DB query origin — change to a cache hit or an API call and the function name lies. The names *encode how*, not what."

- **One paragraph on the principle's edge.** The "asymmetric" word matters: vagueness is a *direction* the principle tolerates, not a *target* the principle promotes. The right name is *as specific as the value warrants*. `pendingInvoices` reads better than `invoices` when the filtering is the point. The lesson encourages "as specific as warranted, never more implementation-coupled than needed."

No exercise here — the principle lands in the closing CodeReview and Buckets.

---

## Section: The four naming surfaces

Walk-through section. Single h2 with four short h3 subsections. Each subsection: one or two short snippets, two sentences of framing, no exercise. The closing sort and CodeReview are where the student practices recognition.

### Subsection (h3): Variables — nouns, concrete over abstract

- **The rule, one sentence.** Variables are nouns. Concrete beats abstract. `pendingInvoices` beats `data`; `activeUser` beats `obj`. Length proportional to scope: a one-line callback parameter can be `x`; a module-level constant cannot.
- **Worked example.** One short `<Code lang="ts">` block contrasting two callbacks of different scope:
  ```ts
  const totalCents = invoices.reduce((sum, invoice) => sum + invoice.cents, 0);

  const pendingInvoicesForCurrentMonth = await db
    .select()
    .from(invoicesTable)
    .where(/* … */);
  ```
  Caption: "`sum` and `invoice` are fine inside a one-line `.reduce` — the scope is one expression. `pendingInvoicesForCurrentMonth` carries its full intent because it lives at module scope where a reader miles away from the assignment needs to know what it is."

### Subsection (h3): Functions — verbs that signal the kind of operation

- **The rule, one sentence.** Functions are verbs or verb phrases. The verb signals the *kind* of operation: `load`/`fetch`/`get` for reads, `create`/`update`/`archive` for writes, `parse`/`validate` for transformation, `format`/`render` for output.
- **Worked example.** One `<Code lang="ts">` block showing the senior reach across verbs:
  ```ts
  const invoice = await getInvoice(id);
  const validated = parseCreateInvoiceInput(formData);
  const formatted = formatCurrency(invoice.cents, 'USD');
  await archiveInvoice(invoice.id);
  ```
  Caption: "Each verb signals the operation's shape — `get` is a read, `parse` is a transformation, `format` is an output projection, `archive` is a write. A reviewer skims the verbs and knows the function's category before reading its body."
- **One sentence on consistency.** The course doesn't legislate a single verb glossary — `fetchInvoice` and `loadInvoice` both communicate intent. The rule is consistency *across* the codebase: pick one and stick to it. The team's codebase enforces; the course names the principle.

### Subsection (h3): Parameters — same rules, public surface

- **The rule, one sentence.** Parameter names follow the variable rules, with one tighter constraint: parameter names appear in the function's **public surface** — TypeScript shows them on hover, in errors, in IDE tooltips. A vague parameter name pollutes every call site that uses the function.
- **Worked example.** Use `<CodeVariants>` with two tabs to land the IDE-tooltip point. The student visualizes what a hover shows in each variant.
  - **Tab 1 — `Acceptable` (green, label `Self-documenting`):**
    ```ts
    const createUser = ({ name, email, role }: CreateUserInput) => { /* … */ };
    ```
    Prose: "On hover, the IDE shows `(options: CreateUserInput) => User`, and the destructured fields read `name`, `email`, `role`. The call site `createUser({ name: 'alex', email: 'a@x.com', role: 'admin' })` self-documents."
  - **Tab 2 — `Anti-pattern` (orange, label `Opaque on hover`):**
    ```ts
    const createUser = (a: string, b: string, c: string) => { /* … */ };
    ```
    Prose: "On hover, the IDE shows `(a: string, b: string, c: string) => User`. The reader has to open the function body to learn what to pass. Every call site is a mystery. The call site `createUser('alex', 'a@x.com', 'admin')` says nothing about which string is which."
- **One sentence forward link to Lesson 6.** The destructure form (`{ name, email, role }`) is the canonical parameter shape — Lesson 6 owns the mechanics. The naming rule here applies whether the destructure is at the signature or the body's first line.

### Subsection (h3): Types and type members — PascalCase nouns, no noise suffixes

- **The rule, one sentence.** Types are PascalCase nouns. Fields are camelCase. Don't suffix types with `Type` (`Invoice`, not `InvoiceType`) or `Interface` (`User`, not `IUser`) or prefix them with Hungarian markers (`Status`, not `EStatus`).
- **Worked example.** One short `<Code lang="ts">` block:
  ```ts
  type Invoice = {
    id: string;
    customerId: string;
    status: 'paid' | 'pending' | 'overdue';
    amountCents: number;
  };
  ```
  Caption: "The type is a noun (`Invoice`). The fields are camelCase nouns. No `Type` suffix — the alias keyword `type` is already the marker. No `I`-prefix — the course never writes Hungarian-style type naming."
- **One sentence on `IFoo` and `FooType`.** "These suffixes/prefixes come from older codebases (Java-era `IFoo`, C-era Hungarian) and the TypeScript community dropped them years ago. If you see them in third-party code, recognize them — never replicate them. Type-system depth and `type` vs `interface` mechanics land in Ch 004."

---

## Section: Booleans get a verb prefix that names the truth condition

Dense single h2. The convention is small but high-leverage — a visual contract that fires before the reader reads the type annotation.

- **The rule, stated once.** Boolean values and predicates get a verbal prefix that makes the truth condition unambiguous. Five prefixes cover the surface:
  - `is*` — current state. `isAdmin`, `isLoading`, `isPublished`.
  - `has*` — possession or membership. `hasUnpaidInvoices`, `hasAccess`, `hasErrors`.
  - `can*` — permission or capability. `canEdit`, `canDelete`, `canRetry`.
  - `should*` — conditional intent (often for behavior gating). `shouldRetry`, `shouldRevalidate`, `shouldOpenOnMount`.
  - `will*` — future state or pending behavior. Rare; use when the timing matters.

- **The payoff, one sentence.** When the reader sees `is`, they know the value is a boolean *before* they read its type annotation. The prefix is a visual contract for reading speed.

- **One `<Code lang="ts">` block** showing the convention across three contexts (state, predicate, prop):
  ```ts
  const isAdmin = user.role === 'admin';
  const hasUnpaidInvoices = invoices.some((i) => i.status === 'pending');
  const canEditInvoice = isAdmin || invoice.ownerId === user.id;
  ```
  Caption: "Three booleans, three prefixes, three truth conditions — each one names the condition the value answers."

- **One short `<Aside type="caution">`** to flag the misuse: prefixes are for booleans only. A `String` named `isAdminLabel` reads as a boolean and lies. The prefix is a *contract*, not decoration.

---

## Section: The three classes of bad names

The lesson's center. Single h2 with **three h3 subsections**. Each subsection: one short snippet showing the smell and its fix, two sentences of framing. The closing CodeReview makes the student spot them in the wild.

### Subsection (h3): Implementation-leaking — the container is in the name

- **The smell.** The container or representation appears in the name: `userArray`, `customerMap`, `loadingFlag`, `invoicesQueryResult`. Renaming the type forces renaming the variable; switching the representation breaks the name.
- **The fix.** Name what's *in* the container, not the container itself. `customers` (a plural noun) instead of `customerArray`. `isLoading` instead of `loadingFlag` (the prefix already names it as a boolean). `pendingInvoices` instead of `invoicesQueryResult`.
- **Worked example.** Use `<CodeVariants>` with two tabs:
  - **Tab 1 — `Anti-pattern` (orange, label `Container in the name`):**
    ```ts
    const customerArray = await listCustomers();
    const loadingFlag = false;
    const invoicesQueryResult = await db.select().from(invoicesTable);
    ```
  - **Tab 2 — `Fixed` (green, label `What's in the container`):**
    ```ts
    const customers = await listCustomers();
    const isLoading = false;
    const invoices = await db.select().from(invoicesTable);
    ```
  Prose under the green tab: "Plurality and the boolean prefix do the work the container suffix was trying to do — without coupling the name to today's representation. Switch from an array to a Map or a generator and the name still fits."

### Subsection (h3): Vague abstractions — names that fit anything fit nothing

- **The smell.** Names that could attach to any value: `data`, `info`, `result`, `manager`, `helper`, `util`, `handler`. They communicate nothing because they communicate everything.
- **The fix.** Replace with the concrete thing. `data` → `weeklyMetrics`. `result` → `validatedInput`. `manager` → split the file because no single class earns the name (a `UserManager` usually means three or four unrelated operations bundled together).
- **Worked example.** One short `<Code lang="ts">` block with `del=`/`ins=` to show the rename in place:
  ```ts del={1,4} ins={2,5}
  const data = await fetchWeeklyMetrics();
  const weeklyMetrics = await fetchWeeklyMetrics();

  const result = validateInput(form);
  const validatedInput = validateInput(form);
  ```
  Caption: "Both renames make the *next* reader's job easier — they see what the value represents without opening the function that produced it."
- **One sentence on the deeper signal.** When a file's central object is genuinely called `manager` or `helper`, that's a refactor signal: the abstraction isn't a thing, it's a bundle of operations that should each be their own function in `/lib`. The course's `pure helpers in /lib` convention (verb-led, intent-named) names this exactly.

### Subsection (h3): Negated booleans — double-negative footguns

- **The smell.** A boolean named with a negation: `notDisabled`, `isNotLoading`, `noErrors`. The name compounds with the negation operator: `!notDisabled` reads as a double-negative that means "enabled" but doesn't say so. Six months later a reader misreads it.
- **The fix.** Name the *positive* condition. `isEnabled` instead of `notDisabled`. `isLoading` instead of `isNotLoading` (then negate at the use site as `!isLoading`). `hasErrors` instead of `noErrors`.
- **Worked example.** Use `<AnnotatedCode lang="ts">` with two steps showing the negation footgun and the fix on the same code:
  ```ts
  if (!notDisabled) submitButton.disabled = true;
  if (!isEnabled) submitButton.disabled = true;
  ```
  - **Step 1** (orange, `meta={"{1}"}`): "`!notDisabled` is a double negative. The reader has to mentally cancel the two negations to know what condition fires. Six months later they cancel them wrong."
  - **Step 2** (green, `meta={"{2}"}`): "`!isEnabled` reads in one pass: 'if not enabled.' The negation operator pairs with a positively-named boolean and the meaning is unambiguous."
- **One sentence on the structural enforcement.** The Code conventions doc bans negated booleans outright. Biome doesn't have a built-in rule for this, but a custom lint or a `CodeReview` reflex catches them at PR time.

---

## Section: Abbreviations and consistency

Short single h2 with two beats. These are the two adjacent disciplines that round out the naming rules.

- **The abbreviation rule.** Don't abbreviate unless the abbreviation is **more common than the spelled-out form** in the domain. Acceptable: `url`, `id`, `db`, `api`, `http`, `jwt`, `ms` (milliseconds), `auth`, `env`. Never invent new abbreviations: not `usr`, not `prfl`, not `qty`. The reader-cost of disambiguating an unfamiliar abbreviation is always higher than the writer-cost of typing the full word, especially in 2026 where every editor autocompletes.

- **A short `<Matching>` exercise** to install the recognition. Five abbreviations on the left, two outcomes on the right ("Acceptable" or "Don't abbreviate") — but since `<Matching>` pairs one-to-one, use a `<Buckets>` instead for the sort. Actually use this exercise here in the consistency section. Keep `<Matching>` for term-to-definition pairs elsewhere if needed.

  - **Better — use `<Buckets>` for the abbreviation drill:**
    ```mdx
    <Buckets twoCol instructions="Sort each abbreviation by whether the course writes it or spells it out.">
      <Bucket name="ok" label="Acceptable" description="More common than the spelled-out form" />
      <Bucket name="dont" label="Spell it out" description="Invented or non-standard abbreviation" />

      <Item bucket="ok">`url`</Item>
      <Item bucket="ok">`id`</Item>
      <Item bucket="ok">`db`</Item>
      <Item bucket="dont">`usr`</Item>
      <Item bucket="dont">`qty`</Item>
      <Item bucket="dont">`prfl`</Item>
      <Item bucket="ok">`api`</Item>
      <Item bucket="dont">`acct`</Item>
    </Buckets>
    ```

- **The consistency rule, one paragraph.** When two names both pass the principle — `fetchUser` and `loadUser`, `customers` and `customerList`, `validate` and `check` — the choice between them is a *team-codebase* call, not a course call. The rule the course legislates: **pick one across the codebase and stick to it.** Drift between synonyms in the same repo is the real smell, not the choice itself.

---

## Section: Spot the bad name

The lesson's closing exercise. Single h2. This is where the student does the recognition work that converts the three classes into a reflex.

- **`<CodeReview>` exercise.** A single-file diff of ~14 lines containing **five named values**, three of which violate one of the three bad-name classes. The student leaves inline comments on the offenders.

- **The file shape.** A small helper module that loads pending invoices and computes a summary. Approximate content (for the lesson writer to refine):
  ```ts
  import { db } from '@/db';
  import { invoicesTable } from '@/db/schema';

  export const getInvoiceSummary = async (customerId: string) => {
    const invoicesQueryResult = await db
      .select()
      .from(invoicesTable)
      .where(/* customerId filter */);

    const data = invoicesQueryResult.filter((i) => i.status === 'pending');
    const notPaid = data.length > 0;
    const totalCents = data.reduce((sum, i) => sum + i.cents, 0);

    return { pending: data, hasPending: notPaid, totalCents };
  };
  ```

- **Three `<ReviewIssue>` plants.**
  1. **`invoicesQueryResult` line** — `kernel="implementation-leaking name; pins the variable to the DB-query origin even though the value is just a list of invoices"`. Reveal explains the fix (`invoices`) and connects to the principle's asymmetry.
  2. **`data` line** — `kernel="vague abstraction; 'data' fits anything and communicates nothing about the filter that was applied"`. Reveal proposes `pendingInvoices` and connects to the four-surfaces section.
  3. **`notPaid` line** — `kernel="negated boolean; compounds with '!' at use sites into a double negative — name the positive condition (hasPending)"`. Reveal connects to the boolean-prefix convention.

- **Two non-violations to keep honest.** `getInvoiceSummary` and `totalCents` are fine — they're intent-led, prefix-less (totals aren't booleans), and don't leak implementation. The student should *not* flag them. Leaving correct names un-flagged is half the recognition reflex.

- **Instructions prop:** "Review this PR. Flag every name that violates the principle — name for intent, not implementation. Three of the five named values have problems. Two are fine."

- **`<ReviewWhy>` debrief.** One paragraph restating the three classes (implementation-leaking, vague, negated) and the principle's asymmetry. End with the reflex: when you see a name in a diff, run the three filters before you read the implementation. The names you can't justify in a sentence — those are the ones to flag.

---

## Section: External resources

`<CardGrid>` with 2 `<ExternalResource>` cards. Short and curated.

- **Clean Code — chapter 2 (Meaningful Names)** — `https://www.oreilly.com/library/view/clean-code-a/9780136083238/chapter02.html` — icon `lucide:book-open`. Description: "Robert C. Martin's chapter on naming. The course's principle is a 2026-stack restatement of the same ideas — read for the worked examples in older codebases."
- **Code conventions — Naming** — `/code-conventions/#naming` (or wherever the project's Code conventions live) — icon `simple-icons:files`. Description: "The course's full naming rules for variables, functions, parameters, types, files, and folders — including the `Functions by intent` glossary for reads, writes, helpers, schemas, and Drizzle tables."

No video for this lesson. Naming is a recognition pattern that lands better in adjacent before/after snippets and a `CodeReview` than in a passive embed.

---

## Scope

### Included

- Architectural Principle #4: a name says what the value is or what the function does, not how it's computed.
- The principle's asymmetry: vague-but-fitting names are acceptable; implementation-leaking names are the smell.
- The four naming surfaces:
  - Variables — nouns, concrete over abstract, length proportional to scope.
  - Functions — verbs or verb phrases, verb signals kind of operation.
  - Parameters — same rules as variables, with public-surface payoff (IDE tooltips, errors, call-site readability).
  - Types and type members — PascalCase nouns for types, camelCase for fields, no `Type`/`Interface` suffixes, no `I`-prefix.
- The boolean-prefix convention: `is*`, `has*`, `can*`, `should*`, `will*`. The prefix is a visual contract for reading speed.
- The three classes of bad names:
  - Implementation-leaking (`userArray`, `loadingFlag`, `invoicesQueryResult`).
  - Vague abstractions (`data`, `result`, `manager`, `helper`).
  - Negated booleans (`notDisabled`, `isNotLoading`, `noErrors`).
- The abbreviation discipline: only the abbreviation that is more common than the spelled-out form in the domain.
- The consistency rule: when two names both fit, the choice is a team-codebase call — but consistency across the codebase is non-negotiable.
- Forward-link mentions: type names in Ch 004, hook `use*` prefix in Unit 3, Server Action verb+noun in Ch 030, Drizzle table casing in Unit 5, "pure helpers in /lib" verb-led naming pattern from Code conventions.

### Explicitly excluded

- **Specific verb glossaries** (`fetch` vs `load` vs `get`, `update` vs `patch` vs `modify`). The course doesn't legislate one — the team's codebase does. The Code conventions doc lists *one* canonical set (`getInvoice` / `listInvoices` / `requireInvoice`); this lesson references that set as an example, not as a learning target.
- **File and folder naming conventions** (kebab-case files, `_components`/`_lib` private prefixes, route groups in parens). These live in Unit 21 (project documentation) and are enforced by Next.js routing conventions. One forward-link sentence in the types section if needed.
- **Hungarian notation depth** (history, when it made sense in untyped C, why TypeScript made it obsolete). Named once as the historical practice the principle replaces.
- **Linguistic discussions** (plurality conventions across languages, gendered identifiers, casing across alphabets). The course writes English-only identifiers and doesn't engage with these debates.
- **The `Action` suffix debate for Server Actions.** Touched on in the verb-rule beat for one sentence ("no `Action` suffix unless disambiguating from a same-named non-action") because the Code conventions doc names it; depth lives in Ch 030.
- **React component naming depth.** Noun phrases for components is mentioned in the four-surfaces section; the full set of component-naming rules (avoid `Container`, `Wrapper`, `Manager`) lives in Unit 3 with first-class examples. One sentence forward link.
- **Hook naming (`use*` prefix).** Mentioned once as "the only structurally-enforced naming convention React enforces" — depth in Unit 3.
- **Drizzle schema/relation naming.** Plural `camelCase` tables, singular/plural relations, `snake_case` SQL casing — these are named in the Code conventions doc and owned by Unit 5. Not taught here.
- **Type-system depth** (the difference between `type` and `interface`, when to reach for `interface` for declaration merging, branded types). Owned by Ch 004 and Ch 005. The lesson uses `type` for the example in the types subsection without explaining why.
- **Biome rules.** The lesson notes Biome doesn't have built-in rules for most of the naming discipline — naming is human discipline. No deep Biome rule list here.

### Prerequisites the student already has

- **Ch 001 L6** — `const`-by-default. Every snippet uses `const`. The "discipline-not-syntax" framing in the intro continues that thread.
- **Ch 002 L1** — arrow `const` as the function form. All function examples are `const fn = (args) => …`.
- **Ch 002 L2** — options-object pattern. The parameter-naming subsection references the destructured options-object shape from L2; doesn't re-derive.
- **Ch 001 L2** — boolean truthiness/falsiness. The boolean-prefix section assumes the student knows what a boolean *is*; the section's contribution is the naming contract on top.

---

## Code conventions applied

- All snippets `.ts`. Single quotes. 2-space indent. Trailing commas on multiline. Semicolons on.
- `const`-bound arrow functions everywhere; no `function` declarations in this lesson (none of the three triggers from L1 fire here).
- Inference-led; no return-type annotations except where the signature is the topic (none in this lesson).
- All identifiers are intent-led, domain-tied. The "bad" examples in the bad-name section deliberately use the smells (`data`, `notDisabled`, `userArray`) — they are the lesson's topic, marked orange via `<CodeVariants>` color or `del=`/`ins=` to flag them as anti-patterns.
- Boolean prefixes (`is*`, `has*`, `can*`, `should*`) used on every boolean in every "good" snippet — the section's content is also the lesson's code style enforcement.
- Types named as PascalCase nouns without `Type`/`Interface` suffix (`Invoice`, `User`, `CreateUserInput`).
- `<CodeVariants>` color convention reaffirmed: green = senior default (intent-revealing name), orange = anti-pattern (implementation-leaking, vague, or negated).
- The `<CodeReview>` plant kernels are written as single-sentence rubric phrases per the component's docs, with longer prose in the `<ReviewIssue>` slot for the senior reveal.

---

## Component checklist for the writer agent

- `<Aside type="tip">` ×1 — the principle statement (Architectural Principle #4) as a labeled callout in the "principle and asymmetry" section.
- `<CodeVariants>` ×3 — (1) acceptable vs implementation-leaking in the asymmetry section, (2) self-documenting vs opaque parameters in the parameters subsection, (3) container-in-name vs what's-in-the-container in the implementation-leaking bad-name subsection. All three use the green/orange convention.
- `<Code lang="ts">` ×~6 — short single-purpose snippets across the lesson: the scope-proportional variable example, the verb-glossary example, the type example, the boolean-prefix example, the vague-abstraction `del=`/`ins=` rename, the closing CodeReview source file.
- `<AnnotatedCode lang="ts">` ×1 — the negated-boolean footgun with 2 steps (orange/green), one snippet showing the double-negative misread and the fix on the same code.
- `<Aside type="caution">` ×1 — booleans-only flag in the prefix section (a `String` named `isAdminLabel` lies).
- `<Buckets twoCol>` ×1 — the 8-item abbreviation sort in the consistency section.
- `<CodeReview>` ×1 — closing 5-name spot-the-bad-name exercise. Three `<ReviewIssue>` plants, single file, `<ReviewWhy>` debrief. Two non-violations are deliberately not plants to catch the student over-flagging.
- `<CardGrid>` + `<ExternalResource>` ×2 — Clean Code chapter 2, the project's Code conventions naming section.
- `<Term>` — minimum 1 candidate: `Architectural Principle #4` (hover-defines "the course's running list of senior-mindset principles — full list in [TBD reference]"). Optional second on `Hungarian notation` in the types subsection if the writer wants to spare the prose explanation.
- No `<VideoCallout>` — intentional. Naming is a recognition pattern; the CodeReview and Buckets carry it.
- No live-coding (`ScriptCoding`, `TypeCoding`, `ReactCoding`) — intentional. Naming isn't a sandbox activity; recognition reps in `CodeReview` + `Buckets` are the right format.
- No new lesson-specific component required.
