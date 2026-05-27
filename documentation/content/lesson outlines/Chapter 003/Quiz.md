sources:
  3.1: The object as workhorse record
  3.2: Arrays and the non-mutating update
  3.3: The array method surface
  3.4: When Set and Map earn their weight
  3.5: Iteration and the lazy helpers
  3.6: "Regex: the modern flavor"
  3.7: VS Code as a team artifact
  3.8: Run TypeScript locally
questions:
  - source: 3.2
    question: |
      A click handler runs this code and the React list never re-orders on screen, even though the underlying array is genuinely sorted:

      ```ts
      setInvoices(invoices.sort((a, b) => a.amountCents - b.amountCents));
      ```

      What is the senior one-line fix?
    choices:
      - text: |
          Replace `.sort` with `.toSorted` so a new array reference is handed to `setInvoices`.
        correct: true
      - text: |
          Wrap the call in `setInvoices([...invoices].sort(...))` to force React to re-render.
        correct: false
      - text: |
          Call `setInvoices(invoices)` a second time so React picks up the in-place mutation.
        correct: false
    why: |
      `.sort` mutates in place and returns the same reference, so React's reconciler sees identity equality and skips the re-render. `.toSorted` (ES2023) returns a fresh array — new reference, render lands. The spread copy works but the senior reach is the named non-mutating twin.

  - source: 3.1
    question: |
      Under `noUncheckedIndexedAccess`, you read a field whose key comes from a `fieldName` variable. Which form says what the code means and gets the right type?
    choices:
      - text: |
          `obj.fieldName` — the dot is the default reach for any field access.
        correct: false
      - text: |
          `obj[fieldName]` — bracket access is earned by the dynamic-key trigger, and the result is correctly typed as `T | undefined`.
        correct: true
      - text: |
          `obj['fieldName']` — quoting the variable name keeps the dot semantics with a string key.
        correct: false
    why: |
      Dot access (`obj.fieldName`) reads the literal field `fieldName`, not the field named by the variable. Bracket access is the trigger-earned form for keys held in a variable, and under `noUncheckedIndexedAccess` it correctly returns `T | undefined` because TS can't prove the key is present.

  - source: 3.3
    question: |
      Which `.filter` call narrows `(string | null)[]` to `string[]`?
    choices:
      - text: |
          `rawIds.filter(Boolean)`
        correct: false
      - text: |
          `rawIds.filter((x) => x !== null)`
        correct: true
      - text: |
          `rawIds.filter((x) => !!x)`
        correct: false
    why: |
      Since TypeScript 5.5, a simple non-null check like `x !== null` is automatically recognized as a type predicate and narrows the result. `Boolean` (and `!!x`) is explicitly excluded because truthiness drops `0`, `''`, and `false` — values that are valid members of their types. The `(x): x is string => x !== null` explicit form works too, but the inferred predicate is the daily reach.

  - source: 3.4
    question: |
      A 10,000-row invoice list is filtered with `bigInvoices.filter((i) => watchedIds.includes(i.customerId))` where `watchedIds` is a 200-element array. The senior refactor is:
    choices:
      - text: |
          Build a `Set` from `watchedIds` once outside the filter, then `.has` inside — turning `O(n × m)` into `O(n + m)`.
        correct: true
      - text: |
          Replace `.filter` with a `for...of` loop so the inner check short-circuits.
        correct: false
      - text: |
          Sort both arrays first so `.includes` can binary-search the watch list.
        correct: false
    why: |
      `.includes` is `O(n)` per call; nested inside `.filter`, the operation is `O(n × m)`. Building a `Set` once is one walk; the inner `.has` is amortized `O(1)`. The pattern to spot in review is any membership check nested inside another walk. `Array.prototype.includes` doesn't binary-search regardless of sort order.

  - source: 3.5
    question: |
      Predict the output. Given:

      ```js
      function* events() {
        for (const item of ['a', 'b', 'c', 'd', 'e']) {
          console.log(`yielding ${item}`);
          yield item;
        }
      }
      const result = Iterator.from(events())
        .filter((x) => x === 'b' || x === 'd' || x === 'e')
        .take(2)
        .toArray();
      ```

      How many `yielding` lines print before `result` is assigned?
    choices:
      - text: |
          2 — `.take(2)` limits the source to two yields.
        correct: false
      - text: |
          4 — the source is pulled until `.take(2)` has accepted its second value (`b` then `d`).
        correct: true
      - text: |
          5 — the entire source is materialized before the chain runs.
        correct: false
    why: |
      Each terminal pull walks the source until `.filter` finds a match. First pull: `a` dropped, `b` passes (2 yields). Second pull: `c` dropped, `d` passes (4 yields). `.take(2)` is satisfied and the chain stops — `e` is never yielded. If the chain were eager (`[...events()]`), all five would print before any filtering.

  - source: 3.4
    question: |
      A multi-select UI holds the selected invoice IDs in a `Set` and POSTs them to the server:

      ```ts
      await fetch('/api/save', {
        method: 'POST',
        body: JSON.stringify({ selected }),
      });
      ```

      What does the server receive in `selected`?
    choices:
      - text: |
          The full array of IDs — `JSON.stringify` serializes `Set` entries as an array.
        correct: false
      - text: |
          An empty object — `JSON.stringify` only sees own enumerable properties, and `Set` stores entries in internal slots.
        correct: true
      - text: |
          A string like `"Set(2) { 'inv_1', 'inv_2' }"` — the default `toString` representation.
        correct: false
    why: |
      `JSON.stringify(new Set([...]))` returns `'{}'` — no error, no warning, just empty. `Map` has the same trap. Convert at the boundary: `JSON.stringify({ selected: Array.from(selected) })`. (React Server Components use a richer serializer that does preserve `Set`/`Map`, but that's the exception, not the default.)

  - source: 3.6
    question: |
      A sign-up form validates usernames with `/^[a-zA-Z0-9]+$/u.test(input)` and rejects `Müller`, `José`, and `小明`. What's the senior fix?
    choices:
      - text: |
          Add the `i` flag so the regex is case-insensitive across scripts.
        correct: false
      - text: |
          Replace `[a-zA-Z]` with the `\p{Letter}` property escape (the `u` flag is what makes it work).
        correct: true
      - text: |
          Switch to the `v` flag so emoji and accented characters match.
        correct: false
    why: |
      `[a-zA-Z]` is the 52 ASCII letters by definition — adding `i` doesn't extend it to non-ASCII scripts, and `v` is about set operations inside character classes, not about which letters count. `\p{Letter}` is the Unicode property escape that means "any letter in any script," and the `u` flag (which the pattern already has) is what enables `\p{...}`.

  - source: 3.6
    question: |
      You want every match of a capturing regex on a string, with access to each match's `.groups`. Which method do you reach for?
    choices:
      - text: |
          `string.match(pattern)` with the `g` flag.
        correct: false
      - text: |
          `string.matchAll(pattern)` with the `g` flag.
        correct: true
      - text: |
          `pattern.test(string)` in a loop with `lastIndex`.
        correct: false
    why: |
      `.match` with `g` returns a plain `string[]` of full matches and discards the per-match groups and indices — the asymmetry that trips every regex user once. `.matchAll` requires `g` and returns an iterator of full match objects, each with `.groups`, `.index`, and captures intact. Reusing a `g`-flag regex with `.test` carries a `lastIndex` cursor between calls and is rarely what you want.

  - source: 3.3
    question: |
      Which scenario triggers reaching for `for...of` over a method chain?
    choices:
      - text: |
          You need to `await` an async call per item, sequenced one after another.
        correct: true
      - text: |
          The source array has more than 1000 elements.
        correct: false
      - text: |
          You want to combine `.filter` and `.map` in one walk.
        correct: false
    why: |
      `for...of` is the only loop form that integrates cleanly with `await` for sequenced async work — `.forEach(async ...)` ignores the returned promises and `.map(async ...)` fans out in parallel. Array size alone isn't a trigger (the lazy iterator helpers are the answer when a source is large or streamed). Combining a filter and a map in one walk is what `.flatMap` is for.

  - source: 3.8
    question: |
      You run `node script.ts` on Node 24 and get `Cannot find package '@/lib'`. What's the right reach?
    choices:
      - text: |
          Pass `--experimental-resolve-paths` to `node` so it reads `tsconfig.json`.
        correct: false
      - text: |
          Switch to `tsx` — it reads `tsconfig.json` and resolves the path alias.
        correct: true
      - text: |
          Run `tsc --noEmit` first to compile the alias into a relative import.
        correct: false
    why: |
      Native Node strips types but doesn't read `tsconfig.json`, so path aliases like `@/lib/...` look like scoped package names and fail to resolve. The path-alias trigger is one of the five that flip the default from `node` to `tsx`. `tsc --noEmit` only type-checks (it emits no JS), and the `--experimental-resolve-paths` flag doesn't exist.

  - source: 3.7
    question: |
      Which of these belong in the repo's `.vscode/settings.json` rather than in your personal User settings? Select all that apply.
    choices:
      - text: |
          `editor.formatOnSave: true`
        correct: true
      - text: |
          `editor.defaultFormatter: "biomejs.biome"`
        correct: true
      - text: |
          `workbench.colorTheme: "GitHub Dark"`
        correct: false
      - text: |
          `editor.fontFamily: "JetBrains Mono"`
        correct: false
    why: |
      The workspace file is a team artifact — settings that change how the project itself behaves (formatter, on-save actions, TypeScript SDK) belong there so every teammate's editor agrees. Theme and font are personal preferences and belong in User settings; pushing them to the workspace is the kind of change that gets reverted on PR review without discussion.
