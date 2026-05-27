sources:
  2.1: Arrow by default, declaration on demand
  2.2: Signatures that stay readable past two parameters
  2.3: Name for intent, not implementation
  2.4: "Flat control flow: guards, ternaries, and exhaustive switch"
  2.5: "The null-safe operator trio: ?., ??, and ??="
  2.6: Destructuring as the API call-shape
  2.7: "Closures: lexical capture by reference"
questions:
  - source: 2.1
    question: |
      You're writing a helper that's used by code earlier in the same module, and a separate type predicate `isInvoice(x: unknown): x is Invoice`. Which forms does a 2026 senior reach for?
    choices:
      - text: |
          Both as `const` arrow expressions — arrow is the default, no exceptions.
        correct: false
      - text: |
          The earlier-used helper as a `function` declaration (hoisting trigger); the type predicate as a `function` declaration (signature trigger).
        correct: true
      - text: |
          The earlier-used helper as an arrow; the type predicate as a `function` expression assigned to `const`.
        correct: false
    why: |
      Arrow `const` is the default, but three triggers earn `function`: hoisting (so the binding is callable before its declaration line), named recursion, and TypeScript predicate/assertion signatures. The first trigger covers the early-use helper; the third covers the predicate — `x is T` is conventionally declared with `function`, and `asserts x is T` *only* parses on a `function` form.

  - source: 2.2
    question: |
      What does this snippet print?

      ```ts
      const list = (page: number = 1, size: number = 20) =>
        console.log(`p=${page} s=${size}`);

      list(undefined, 0);
      list(null as unknown as number, 10);
      ```
    choices:
      - text: |
          `p=1 s=20` then `p=1 s=10`
        correct: false
      - text: |
          `p=1 s=0` then `p=null s=10`
        correct: true
      - text: |
          `p=1 s=0` then `p=1 s=10`
        correct: false
    why: |
      Parameter defaults fire *only* on `undefined`. The first call: `page` is `undefined` so the default `1` fires; `size` is `0` (falsy but defined) so the default does not fire and `0` flows through. The second call: `null` is not `undefined`, so the `page` default does not fire and `null` is interpolated; `size` is explicitly `10`.

  - source: 2.3
    question: |
      Which of these names violate the "name for intent, not implementation" principle? Select all that apply.
    choices:
      - text: |
          `customerArray`
        correct: true
      - text: |
          `pendingInvoices`
        correct: false
      - text: |
          `notDisabled`
        correct: true
      - text: |
          `data`
        correct: true
    why: |
      `customerArray` leaks the container — rename the type and the name lies. `notDisabled` is a negated boolean that compounds with `!` at use sites into a double negative; name the positive condition (`isEnabled`). `data` is a vague abstraction that fits anything and communicates nothing. `pendingInvoices` is fine — concrete, intent-revealing, no container suffix.

  - source: 2.4
    question: |
      Under `noFallthroughCasesInSwitch` with the discriminated union `type Payment = { status: 'pending' } | { status: 'paid' } | { status: 'failed' }`, which `switch` compiles?
    choices:
      - text: |
          ```ts
          switch (p.status) {
            case 'pending':
              log('p');
            case 'paid':
              return 'paid';
            case 'failed':
              return 'failed';
            default:
              return assertNever(p);
          }
          ```
        correct: false
      - text: |
          ```ts
          switch (p.status) {
            case 'pending':
              return 'p';
            case 'paid':
              return 'paid';
            default:
              return assertNever(p);
          }
          ```
        correct: false
      - text: |
          ```ts
          switch (p.status) {
            case 'pending':
              throw new Error('pending');
            case 'paid':
              return 'paid';
            case 'failed':
              return 'failed';
            default:
              return assertNever(p);
          }
          ```
        correct: true
    why: |
      The first fails: `case 'pending'` runs `log('p')` without a terminator, so `noFallthroughCasesInSwitch` errors on the fallthrough. The second fails exhaustiveness: `'failed'` has no case, so at `default` `p` is still `{ status: 'failed' }`, not `never`, and `assertNever(p)` is rejected. The third compiles — `throw` is a valid terminator, every variant has a case, and `p` narrows to `never` at the `default`.

  - source: 2.5
    question: |
      A teammate writes `const pageSize = input.pageSize || 20` and `const city = user?.profile.address.city`. Which fixes does a 2026 senior land in review? Select all that apply.
    choices:
      - text: |
          Change `||` to `??` so that a caller passing `pageSize: 0` (meaning "show no rows") isn't silently swapped for `20`.
        correct: true
      - text: |
          Add `?.` at every nullable link — `user?.profile?.address?.city` — because each `?.` only guards the one access to its left.
        correct: true
      - text: |
          Leave `||` alone; in TypeScript with strict mode, `||` and `??` behave identically.
        correct: false
    why: |
      `||` fires on every falsy value (`0`, `''`, `false`, plus nullish), so the `pageSize: 0` case is swallowed; `??` fires only on nullish. Optional chaining short-circuits one link at a time — the original chain still throws at `.address` if `profile` is nullish. Strict mode does not change runtime operator semantics.

  - source: 2.6
    question: |
      After `const { foo: bar } = obj`, what's true?
    choices:
      - text: |
          `foo` is now a local binding holding `obj.bar`.
        correct: false
      - text: |
          `bar` is now a local binding holding `obj.foo`. `foo` is not in scope.
        correct: true
      - text: |
          Both `foo` and `bar` are in scope, both holding `obj.foo`.
        correct: false
    why: |
      Destructure rename reads field-on-source `:` local-binding. The source field is `foo`; the local binding the line creates is `bar`. This is the inverse direction from object-literal shorthand, which is why it's the most mis-read piece of destructuring syntax — and why flipping it ships shadow bugs.

  - source: 2.7
    question: |
      A Server Action file does `const user = await getCurrentUser()` at module scope and then references `user` inside the exported action body. What goes wrong?
    choices: 
      - text: |
          `getCurrentUser()` runs once at module load, and every later request closes over that same `user` binding — authorization checks pass or fail based on whoever first loaded the module, not the current caller.
        correct: true
      - text: |
          Nothing — module-scope captures are re-evaluated per request, so each invocation reads a fresh `user`.
        correct: false
      - text: |
          The build fails because Server Actions cannot reference module-scope bindings at all.
        correct: false
    why: |
      Module-scope code runs once, at import. A closure over that `user` binding sees whatever value it held at load time — not per-request data. The fix is to read request-scoped APIs (`getCurrentUser`, `cookies()`, `headers()`) *inside* the action body, so each invocation resolves its own request context. Same closure model as the stale-closure-in-loop bug, surfacing in a different production site.
