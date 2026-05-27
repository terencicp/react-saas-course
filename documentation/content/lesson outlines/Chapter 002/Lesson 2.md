# Lesson 2 — Signatures that stay readable past two parameters

- **Title (h1):** `Signatures that stay readable past two parameters`
- **Sidebar label:** `Function signatures`

---

## Lesson framing

This lesson installs the second pillar of the chapter's function discipline (Lesson 1 picked the **form** — arrow `const`; this one picks the **shape** of its parameter list). The bug class is real: a `createUser('alex', 'a@x.com', true, false, true)` call site is unreadable, unsafe to reorder, and breaks every caller when a new flag is added. The senior reflex that prevents it is structural — **two positional parameters max, then switch to an options object** — and the lesson installs it as a pattern, not a tip.

The pedagogical archetype is **Pattern** (the options-object shape) with two embedded **Mechanics** beats: the `undefined`-only firing rule for parameter defaults (the most common returning-dev surprise from older codebases where `||` did the defaulting) and the rest/spread duality at signature vs. call site. The lesson closes with a **CodeReview** refactor where the student takes a five-positional-arg function and turns it into the options-object form — that hands-on conversion is the senior-reflex install.

Three threads from the chapter framing run through this lesson:

- **Decisions before syntax.** Open with the failure mode (unreadable call site), then the structural rule, then the syntax that implements it.
- **One language, TypeScript-flavored.** All snippets are `.ts` with inline object-type literals. The `?` optional modifier and the inline object-type literal syntax appear in shape; their depth lives in Ch 004 L2.
- **Forward links land softly.** Server Actions (Ch 030), React component props (Ch 022), and Drizzle query builders (Unit 5) all consume the options-object shape this lesson installs. One sentence each, no derivations.

Two soft links forward into Lesson 6:

- **Signature destructure** is the natural companion to the options-object pattern (`({ name, email, admin = false })` is the canonical form Server Actions and React props consume). This lesson shows the **type literal** shape; Lesson 6 owns the **destructure mechanics**. Reference, don't re-teach.
- **Default at the field level** (`{ pageSize = 20 } = {}`) is the syntactic composition of parameter defaults + destructuring. The lesson plants the pattern in one snippet but flags that the destructure half lands in Lesson 6.

The lesson does **not** teach generics (the typed `...args` wrapper that preserves the original signature lives in Ch 005 L7), function overloads (Ch 005 L7 if at all), or the `this` parameter declaration (class-adjacent, parked in Lesson 1).

Estimated student time: 25 to 30 minutes.

---

## Section: Intro (no h2)

Three short paragraphs. Plant the failure mode, the rule, and the lesson's shape.

- **Para 1 — the smell.** Show the unreadable five-positional-arg call site in prose, inline: `createUser('alex', 'a@x.com', true, false, true)`. The reviewer can't tell which boolean is `admin`, which is `sendWelcomeEmail`, which is `acceptedTerms`. Reordering the booleans is silently catastrophic. Adding a new parameter breaks every caller in the codebase. The bug class isn't syntax — it's API design at the function level.
- **Para 2 — the rule, in one sentence.** Two positional parameters max. Past two, the function takes a single options object. State it plainly; the rest of the lesson works the mechanics.
- **Para 3 — the lesson's shape.** The two-param rule and the options-object pattern as the structural fix; the `undefined`-only firing rule for parameter defaults (with the four-case test that catches it); the TypeScript required-before-optional rule (and how the options object dissolves it); rest/spread duality at signature vs. call site; the field-level default form (`{ pageSize = 20 } = {}`) for paginated functions; a closing refactor exercise. Reference Lesson 1's arrow-`const` form explicitly — every snippet in this lesson is `const fn = (args) => …`. Forward-link Lesson 6 in one sentence as the lesson that owns the destructure half of the canonical signature.

---

## Section: Two parameters max, then switch to an options object

The pattern section. Single h2. This is the lesson's structural core.

- **The failure mode worked.** Use `<CodeVariants>` with two tabs — **green** for the options-object form, **orange** for the positional-soup form — so the student sees the call site difference adjacent.
  - **Orange tab** (label `Positional soup`):
    ```ts
    const createUser = (
      name: string,
      email: string,
      admin: boolean,
      sendWelcomeEmail: boolean,
      acceptedTerms: boolean,
    ) => { /* ... */ };

    createUser('alex', 'a@x.com', true, false, true);
    ```
    Prose: "Five positional booleans. The call site doesn't say which `true` is which. Reordering silently catastrophic. Adding a `marketingOptIn` parameter breaks every caller in the repo."
  - **Green tab** (label `Options object`):
    ```ts
    const createUser = (options: {
      name: string;
      email: string;
      admin?: boolean;
      sendWelcomeEmail?: boolean;
      acceptedTerms: boolean;
    }) => { /* ... */ };

    createUser({
      name: 'alex',
      email: 'a@x.com',
      admin: true,
      sendWelcomeEmail: false,
      acceptedTerms: true,
    });
    ```
    Prose: "Every argument self-documents at the call site. Order is meaningless — object fields are unordered. Adding a `marketingOptIn` field doesn't break existing callers. The inline `{ … }` after `options:` is an **object type literal** (Ch 004 L2 owns the depth); the `?` after a field name is the optional modifier — the field can be omitted at the call site."

- **The two-parameter rule, stated once.** One sentence, plain: "**Past two positional parameters, switch to an options object.**" That's the rule. The lesson doesn't soften it into "two or three" — two is the rule, the exception is named below.

- **The one exception: arity-meaningful functions.** One short paragraph. When the positions are *semantic*, they stay positional even past two:
  - A comparator: `(a, b) => number` — `a` is "left," `b` is "right," reordering changes the result.
  - A reducer callback: `(acc, x) => acc` — `acc` is the accumulator, `x` is the current item; the roles are fixed.
  - A binary operator helper: `(min, max) => …` — the two arguments encode a range.
  - The trigger to keep positional: the function's identity *requires* a fixed argument order (e.g. mathematical conventions, callback contracts the runtime invokes). Most application code doesn't qualify.

- **One paragraph on the deeper refactor signal.** When a function reaches four or five parameters, the senior reads that as "this function does too many things" before "this function needs an options object." Sometimes the right answer is to split the function — `createUserAndSendWelcomeEmail` is two operations pretending to be one. Named here as the deeper heuristic; the lesson's primary teach is still the options-object pattern.

- **Forward link, one sentence.** "This is the shape **Server Actions** (Ch 030), **React component props** (Ch 022), and **Drizzle query builders** (Unit 5) all consume. The form was decided here."

No exercise in this section — the refactor at the end of the lesson is where the student practices it.

---

## Section: Parameter defaults fire only on `undefined`

The first Mechanics beat. Single h2. Short and dense — the rule plus the four-case `PredictOutput` exercise that makes the semantics unavoidable.

- **The rule.** State it plainly: **a parameter default fires only when the argument is `undefined`. Not `null`, not `0`, not `''`, not `false`.** The returning student often expects falsy-coercion semantics from older codebases that used `||` to default (covered fully in Lesson 5 with `??`); the parameter-default rule is *narrower* and *more predictable* — `undefined` and only `undefined`.

- **Worked snippet.** One `<Code lang="ts">` block showing the four cases call the same function and what each returns:
  ```ts
  const greet = (name: string = 'friend') => `Hello, ${name}!`;

  greet();           // 'Hello, friend!'  (no argument → undefined → default fires)
  greet(undefined);  // 'Hello, friend!'  (explicit undefined → default fires)
  greet(null as any);// 'Hello, null!'    (null is not undefined → default does NOT fire)
  greet('');         // 'Hello, !'        ('' is falsy but defined → default does NOT fire)
  ```
  Caption: "The default fires on the missing/undefined call, **only**. Every other value — including the falsy ones — flows through."

- **`<PredictOutput>` exercise.** Four cases, the student types the output. Use the multi-line `expected` template-string form. The exercise pins the semantics in muscle memory.

  ````mdx
  <PredictOutput expected={`page=1, size=20
  page=1, size=20
  page=1, size=0
  page=1, size=10`}>

  ```ts
  const list = (page: number = 1, size: number = 20) =>
    console.log(`page=${page}, size=${size}`);

  list();
  list(undefined, undefined);
  list(1, 0);
  list(1, 10);
  ```

  <PredictWhy>The default fires only on `undefined`. `0` is a real value the caller asked for — defaults don't second-guess it. This is the same nullish-vs-falsy distinction `??` and `||` will formalize in Lesson 5.</PredictWhy>

  </PredictOutput>
  ````

- **One sentence forward link to Lesson 5.** "The same nullish-vs-falsy split shows up in the `??` vs. `||` operator pair — Lesson 5 owns the operator side. Parameter defaults are the *signature*-level form of the same idea."

---

## Section: Required parameters before optional — and how the options object dissolves the rule

Short single h2. The TypeScript-flavored rule and the structural escape.

- **The rule.** TypeScript rejects a required positional parameter after an optional one: `(options?: Options, url: string)` is a compile error. The fix when it bites: reorder so required comes first, or — the senior reach — put everything on a single options-object parameter, where field-level `?` doesn't carry positional constraints.

- **Worked snippet.** One short `<Code lang="ts">` block showing the compile-error shape and its options-object replacement:
  ```ts
  // The rule bites:
  // ❌ const fetch = (options?: Options, url: string) => { ... };

  // The options-object fix:
  const fetch = (options: { url: string; headers?: Headers; timeoutMs?: number }) => {
    /* ... */
  };
  ```
  Caption: "On a single options-object parameter, the required-before-optional rule disappears — fields are unordered, and the `?` modifier marks individual fields as omittable without affecting the others."

- **One-sentence carve-out.** "TypeScript does allow an optional positional **with a default value** (`url: string = 'http://…'`) to come before a required parameter — but the call site has to pass `undefined` explicitly to skip it, which is the same readability problem positional booleans have. The course doesn't reach for this; the options object reads better." This addresses the niche but real exception without legitimizing it.

No exercise here — the refactor at the end of the lesson uses this rule implicitly.

---

## Section: Rest at the signature, spread at the call site

The second Mechanics beat. Single h2. Two tight subsections (no h3 needed if it stays compact, but break to h3 if either grows past ~6 lines of prose).

- **The mental model, in one sentence.** **Rest binds positions to an array on receive; spread unpacks an array to positions on send.** Same three dots, opposite directions. The lesson teaches both sides and the one production pattern they compose into.

- **Rest at the signature.** One `<Code lang="ts">` block:
  ```ts
  const tag = (label: string, ...ids: string[]) => {
    for (const id of ids) console.log(`${label}: ${id}`);
  };

  tag('user', 'u_1', 'u_2', 'u_3');
  ```
  Caption: "`...ids` collects every trailing positional argument into an array typed `string[]`. The rest parameter must be **the last parameter** in the signature."

- **Spread at the call site.** One `<Code lang="ts">` block:
  ```ts
  const ids = ['u_1', 'u_2', 'u_3'];
  tag('user', ...ids);
  ```
  Caption: "`...ids` at the call site unpacks the array back into positional arguments. The same dots, opposite direction."

- **The wrapper pattern.** This is the most common 2026 use — show it once. One `<Code lang="ts">` block:
  ```ts
  const logged = (...args: Parameters<typeof baseFn>) => {
    console.log('calling baseFn with', args);
    return baseFn(...args);
  };
  ```
  Caption: "Forwarding every argument to a wrapped function. `Parameters<typeof baseFn>` preserves the original signature — the typed-wrapper depth lives in Ch 005 L7's generics chapter, but the rest/spread shape is what makes the pattern work at runtime."

- **One sentence on `arguments`.** "Older JavaScript used a magic `arguments` object inside `function` declarations to collect call-site arguments — it's not array-typed, it doesn't exist inside arrow functions, and rest parameters replace it completely. The course never writes `arguments`; named once for recognition when you see it in old code."

No exercise here — the rest/spread mechanics are simple enough to land in prose, and the closing refactor doesn't depend on them.

---

## Section: Defaults inside the options-object pattern

Short single h2. The compositional form every paginated function in the course will use.

- **The shape.** One `<Code lang="ts">` block:
  ```ts
  const listInvoices = ({
    pageSize = 20,
    sort = 'asc',
  }: {
    pageSize?: number;
    sort?: 'asc' | 'desc';
  } = {}) => {
    /* ... */
  };

  listInvoices();                          // pageSize=20, sort='asc'
  listInvoices({ pageSize: 50 });          // pageSize=50, sort='asc'
  listInvoices({ pageSize: 50, sort: 'desc' });
  ```
  Caption: "Two composition pieces. Field-level defaults (`pageSize = 20`) supply per-field fallbacks. The trailing `= {}` on the parameter itself makes the whole function callable with no argument — without it, `listInvoices()` would crash trying to destructure `undefined`."

- **One sentence on the destructure half.** "The `{ pageSize = 20, sort = 'asc' } = ...` form is **parameter destructuring at the signature** — the mechanic Lesson 6 owns. Here you read the canonical shape; Lesson 6 derives why it works."

- **One sentence on the type position.** "The `: { pageSize?: number; sort?: 'asc' | 'desc' }` annotation is an **inline object-type literal**. Ch 004 L2 owns the type-system depth; here you read the shape every list-style function in the course writes."

No exercise — the closing refactor exercises this shape.

---

## Section: Refactor — from positional soup to options object

The lesson's closing exercise. Single h2. This is where the student does the work that converts the rule into a reflex.

- **`<CodeReview>` exercise.** Present a single-file diff containing two functions: a five-positional-arg `createUser` (the orange shape from the opener) and a three-positional-arg `listInvoices` (just barely over the rule — the threshold case). Both have call sites in the same file. The student leaves inline review comments on the relevant lines.

- **Two `<ReviewIssue>` plants.** Both target the signature line of each function:
  1. **`createUser` line** — `kernel="five positional parameters past the two-param rule; needs an options object so the call site self-documents and adding fields stays backward-compatible"`. Reveal explains the unreadable call site and the structural payoff.
  2. **`listInvoices` line** — `kernel="three positional parameters past the two-param rule; switch to an options object even though it's only three — three is past two"`. Reveal addresses the "is three really too many?" question head-on: the rule is two, not "two-ish."

- **Instructions prop:** "Review this PR. The team's rule is two positional parameters max. Flag every function that breaks it and explain what the refactor should look like."

- **`<ReviewWhy>` debrief.** Restate the pattern in one paragraph: the two-param rule is structural — past two, the call site stops reading clearly and adding fields breaks callers. The fix is uniform across the codebase: options object with field-level optionals. This is the shape every Server Action, every React component prop, and every Drizzle helper in the rest of the course will take.

- **One follow-up `<ScriptCoding runner="sandpack">` block** (kept short — this is the "now write it" beat that complements the "now spot it" CodeReview). The student rewrites a function signature from positional to options-object form, with tests pinning the field-level default behavior:

  ````mdx
  <ScriptCoding
    runner="sandpack"
    instructions="Refactor `formatAddress` to take a single options object. Required fields: `street`, `city`. Optional fields with defaults: `country` defaults to `'US'`, `zip` has no default (omit if missing). The function returns a formatted string."
    starter={`export const formatAddress = (
    street: string,
    city: string,
    country: string = 'US',
    zip?: string,
  ): string => {
    const parts = [street, city, country];
    if (zip) parts.push(zip);
    return parts.join(', ');
  };
  `}
    tests={`
  test('uses default country when omitted', () => {
    expect(formatAddress({ street: '1 Main', city: 'Austin' }))
      .toBe('1 Main, Austin, US');
  });
  test('caller can override country', () => {
    expect(formatAddress({ street: '1 Main', city: 'Berlin', country: 'DE' }))
      .toBe('1 Main, Berlin, DE');
  });
  test('zip is appended when provided', () => {
    expect(formatAddress({ street: '1 Main', city: 'Austin', zip: '78701' }))
      .toBe('1 Main, Austin, US, 78701');
  });
  test('passing undefined for country still gets the default', () => {
    expect(formatAddress({ street: '1 Main', city: 'Austin', country: undefined }))
      .toBe('1 Main, Austin, US');
  });
  `}
  />
  ````

  The fourth test is deliberate — it pins the `undefined`-only firing rule from the earlier section into the refactored form. The student has to internalize *both* the structural shape and the firing semantics for all tests to pass.

---

## Section: External resources

`<CardGrid>` with 2 `<ExternalResource>` cards. Short and curated.

- **MDN — Default parameters** — `https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Default_parameters` — icon `simple-icons:mdnwebdocs`. Description: "The canonical reference for parameter defaults, including the `undefined`-only firing rule and the interaction with destructured parameters."
- **MDN — Rest parameters** — `https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/rest_parameters` — icon `simple-icons:mdnwebdocs`. Description: "Rest parameter syntax, restrictions (must be last), and the contrast with the legacy `arguments` object."

No video for this lesson. The pattern is structural and the `PredictOutput` + `CodeReview` + `ScriptCoding` triple carries the reps better than a passive embed would.

---

## Scope

### Included

- The two-positional-parameter rule and the senior reflex to switch past two.
- The options-object pattern as the structural replacement, with call-site self-documentation and field-add backward-compatibility as the two payoffs.
- The one exception: arity-meaningful functions (comparator, reducer, range helpers) keep positional shape because positions are semantic.
- The deeper "too many params" refactor signal (the function might do too many things) — named in one paragraph, not derived.
- Parameter defaults fire only on `undefined` — not `null`, `0`, `''`, or `false`. Four-case `PredictOutput` confirms it.
- TypeScript required-before-optional positional rule, and the carve-out that an optional with a default *can* come before a required (named once, not encouraged).
- The structural escape: a single options-object parameter dissolves the positional-ordering constraint into field-level `?`.
- Rest parameters at the signature (`...ids: string[]`) — collects trailing positionals to an array, must be last.
- Spread at the call site (`fn(...ids)`) — unpacks an array back into positionals.
- The wrapper pattern (`(...args) => baseFn(...args)`) as the most common 2026 rest/spread use, with `Parameters<typeof baseFn>` named for shape recognition (depth in Ch 005 L7).
- The `arguments` object — named in one line as legacy to recognize.
- Defaults inside the options object: field-level `pageSize = 20` plus trailing parameter `= {}` to make the function callable with no argument.
- Forward-link mentions: Server Actions (Ch 030), React component props (Ch 022), Drizzle query builders (Unit 5), inline object-type literals + `?` modifier (Ch 004 L2), signature destructure (Ch 002 L6), typed wrappers with generics (Ch 005 L7), `??` vs. `||` nullish-vs-falsy (Ch 002 L5).

### Explicitly excluded

- **Signature destructure mechanics.** The lesson shows the canonical shape (`{ pageSize = 20 } = {}`) in one snippet because every paginated function in the course writes it, but the **destructure depth** — rename, nested, rest at destructure, the four extensions — is owned by **Ch 002 L6**. One sentence flagging this.
- **Inline object-type literal depth.** Lessons in this lesson show the shape `{ name: string; admin?: boolean }`; the type-system mechanics (object type literals, the `?` optional modifier, the difference between `?: T` and `T | undefined`) live in **Ch 004 L2**.
- **Function overloads.** Multiple call signatures for one implementation. Niche; owned by **Ch 005 L7** if at all. Not named.
- **Currying and partial application.** Not in the 2026 SaaS senior daily reach. Not named.
- **Typed `...args` wrappers with generics.** `Parameters<typeof baseFn>` is named in the wrapper snippet for shape recognition; the generics depth (`<T extends (...args: any[]) => any>`, `ReturnType<T>`, variadic tuple types) is owned by **Ch 005 L7**.
- **The `this` parameter declaration** (`function foo(this: Element)`). Class-adjacent; parked in Lesson 1. Not named.
- **Async/await in signatures.** Several snippets could naturally be `async`; the lesson keeps them sync to avoid splitting attention. The async surface lands in its dedicated lesson.
- **`arguments`, `caller`, `callee` depth.** Named in one line as legacy; not taught.
- **The `??` vs. `||` distinction.** Parameter defaults reuse the nullish-not-falsy semantics, but the **operator** comparison is owned by **Ch 002 L5**. One forward-link sentence in the defaults section.

### Prerequisites the student already has

- **Ch 001 L2** — strict equality and the four falsy literals (`0`, `''`, `false`, `NaN`) and the two nullish values (`null`, `undefined`). The defaults section relies on the student already knowing what "falsy" and "nullish" mean.
- **Ch 001 L6** — `const`-by-default. Every snippet in this lesson is `const fn = (args) => …`.
- **Ch 002 L1** — arrow `const` as the function form. The lesson assumes this; never re-derives.

---

## Code conventions applied

- All snippets `.ts`. Single quotes. 2-space indent. Trailing commas on multiline. Semicolons on.
- `const`-bound arrow functions everywhere. No `function` declarations in this lesson (none of the three triggers from Lesson 1 fire here).
- Inference-led; explicit return-type annotations omitted except where the signature is the topic (the `formatAddress` exercise pins `: string`).
- Parameter type annotations explicit (per Code conventions §TypeScript: "annotate parameters").
- Variable and function names intent-led: `createUser`, `listInvoices`, `formatAddress`, `tag`, `logged`, `baseFn` — no `foo`/`bar`/`tmp`.
- Booleans on options objects read as predicates with prefixes (`admin`, `sendWelcomeEmail`, `acceptedTerms` — these are domain-shaped flags from the failure-mode example; future code conventions chapters install `is*`/`has*` prefixes for new code, but the failure example uses the unprefixed names because that's what the bad code in the wild looks like — names are not the bug being flagged here, the parameter shape is).
- `<CodeVariants>` color convention reaffirmed: green = senior default (options object), orange = anti-pattern (positional soup).
- Field-level optionals use `?` (covered for recognition only); the type literal shape matches what Lesson 6 will destructure.

---

## Component checklist for the writer agent

- `<CodeVariants>` ×1 — orange (positional soup) vs. green (options object), in the lesson's structural-core section. Two tabs, prose on each.
- `<Code lang="ts">` ×7 (approximate) — short single-purpose snippets across the lesson: the defaults rule worked example, the required-before-optional rule, rest at signature, spread at call site, the wrapper pattern, the options-object with field defaults, and one or two inline pieces.
- `<PredictOutput>` ×1 — four-case parameter-default exercise with `<PredictWhy>` inside. Multi-line `expected` as template string.
- `<CodeReview>` ×1 — closing refactor exercise. Two `<ReviewIssue>` plants, single file, both targeting positional-soup signatures. Includes `<ReviewWhy>`.
- `<ScriptCoding runner="sandpack">` ×1 — the `formatAddress` refactor with four tests, including the `undefined`-only firing pin.
- `<CardGrid>` + `<ExternalResource>` ×2 — MDN Default parameters, MDN Rest parameters.
- `<Term>` ×1 minimum — `object type literal` in the options-object section, hover-defining "inline `{ field: Type; field?: Type }` shape; the `?` marks a field optional. Depth in Ch 004 L2." Optional second on `arity` in the carve-out paragraph if the writer thinks it earns it.
- `<Aside type="note">` ×0–1 — optional. The most candidate spot is at the end of the rest/spread section to flag the wrapper-pattern's generics depth lives in Ch 005 L7. Not required.
- No `<VideoCallout>` — intentional. The pattern is structural and three exercises carry the reps.
- No new lesson-specific component required.
