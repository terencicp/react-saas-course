sources:
  102.1: TSDoc the public surface
  102.2: Comment the why, not the what
  102.3: Docs ship in the PR, or they're already wrong

questions:
  - source: 102.1
    question: |
      You're deciding which of these declarations earns a TSDoc block. Which one earns it?
    choices:
      - text: |
          A private helper used once, in the same file it's defined in.
        correct: false
      - text: |
          A Server Action a component calls from another module.
        correct: true
      - text: |
          `type UserInput = z.infer<typeof userInputSchema>`.
        correct: false
    why: |
      The cut is the *public surface* — a declaration read one call site away from where it lives.
      The Server Action crosses a module boundary and carries a contract (preconditions, side effects, failure modes) the signature can't show, so it earns a block.
      The private helper has no second reader, and the `z.infer` alias is just a derived view of the schema — the schema is the doc, a block would be a copy of a copy.

  - source: 102.1
    question: |
      A teammate writes this `@param` on a function with the signature `createCustomer(email: string)`:

      ```ts
      /**
       * Creates a Stripe customer.
       *
       * @param {string} email - the user's email
       */
      ```

      What's wrong with it?
    choices:
      - text: |
          The `{string}` type duplicates what the TypeScript signature already states — TSDoc tags never carry types.
        correct: true
      - text: |
          The summary should restate the parameter and return types so the hover is complete.
        correct: false
      - text: |
          `@param` should always be omitted; the parameter name is enough.
        correct: false
    why: |
      `@param {string}` is JSDoc muscle memory. JavaScript needed types in the comment because it had none; TypeScript moved the type to the signature, where the compiler keeps it correct.
      The tag's job shrinks to what the signature can't express — the parameter's *purpose*. Repeating the type just gives you a second copy that drifts.

  - source: 102.2
    question: |
      Same line of code, two files. Which comment earns its place?
    choices:
      - text: |
          ```ts
          // add one to the retry count
          retries += 1;
          ```
        correct: false
      - text: |
          ```ts
          // Stripe retries this webhook up to 3×; cap our own retry so the two don't compound into 9 attempts.
          retries += 1;
          ```
        correct: true
    why: |
      The test isn't whether the line "looks complicated" — it's whether the answer to "why is it written this way?" lives *outside* the file.
      The first comment restates the code; nothing comes from outside, so it carries zero information. The second names Stripe's retry behavior — invisible from the line — so without it a future reader "simplifies" the cap away.

  - source: 102.2
    question: |
      Which of these `// why` comments should be **promoted** out of prose into something the compiler or runtime enforces? Select all that apply.
    choices:
      - text: |
          `// callers must run safeParse on the body before this touches the DB`
        correct: true
      - text: |
          `// don't reorder: the audit insert has to land before we enqueue the email`
        correct: true
      - text: |
          `// timestamps come back rounded to the microsecond, so compare rounded values`
        correct: false
      - text: |
          `// the same webhook can land twice and in either order`
        correct: false
    why: |
      The cut is whether the constraint is a fact about *our* code or about an *external system*.
      The first two are ours: the validate-first reminder becomes a `parse` at the boundary, the ordering becomes one transactional function — in both the comment dissolves into a guarantee.
      The last two describe Postgres's precision and a provider's delivery behavior; no type can hold an external system to a promise, so they stay well-written comments.

  - source: 102.3
    question: |
      A PR splits the test suite and renames `pnpm test` to `pnpm test:unit`. The README still says `pnpm test`. Your teammate suggests fixing the README in a quick follow-up PR right after this one merges. Why isn't that good enough?
    choices:
      - text: |
          Between the two merges, `main` is self-contradictory — a live wrong doc in production for the whole window, and a wrong doc is worse than no doc.
        correct: true
      - text: |
          A follow-up PR is fine; the README isn't code, so its accuracy isn't urgent.
        correct: false
      - text: |
          The README should never mention commands at all, so neither PR is needed.
        correct: false
    why: |
      Code review is the one checkpoint where someone looks at the change with attention; the next checkpoint is production.
      A separate doc PR doesn't escape the problem, it just narrows the drift window to zero width only if code and doc land in the *same* merge. A wrong doc costs the next reader the time to read it, believe it, discover it's lying, and stop trusting every doc near it.

  - source: 102.3
    question: |
      A reviewer wants to know which doc-drift checks they can hand off to automation and which they have to run themselves. Which of these is the one a machine can fully catch — no human judgment needed?
    choices:
      - text: |
          Whether `.env.example` declares the same set of keys as `env.ts`.
        correct: true
      - text: |
          Whether a TSDoc summary sentence still describes what the function actually does.
        correct: false
      - text: |
          Whether this PR's new behavior warranted an ADR nobody wrote.
        correct: false
    why: |
      Lint catches the drift a machine can *compare*; the reviewer catches the drift only a human can *read*.
      Key-parity is a pure set comparison — zero judgment, the cleanest thing to automate. Whether a summary sentence still tells the truth, or whether a change was architecturally significant, requires reading intent against behavior, which no linter can do.
