sources:
  4.1: Primitives, literals, and the four corners
  4.2: Object shapes — type, interface, and field modifiers
  4.3: Tuples — positions with labels
  4.4: Dynamic keys — index signatures and Record<K, V>
  4.5: Composing types — unions and intersections
  4.6: Narrow, don't assert
  4.7: Keeping literals narrow with as const and satisfies
  4.8: Annotate the boundaries, infer the inside
questions:
  - source: 4.1
    question: |
      A webhook handler receives a payload whose shape isn't known at compile time. Two engineers reach for different annotations:

      ```ts
      const handleA = (payload: any) => payload.user.email;
      const handleB = (payload: unknown) => payload.user.email;
      ```

      Which best describes the operational difference between the two?
    choices:
      - text: |
          They are equivalent — both compile, and only `handleB` errors at runtime.
        correct: false
      - text: |
          `handleA` compiles and may crash at runtime; `handleB` fails at compile time until the value is narrowed.
        correct: true
      - text: |
          `handleB` compiles but disables type-checking on `payload`; `handleA` requires narrowing before any read.
        correct: false
    why: |
      `any` disables type-checking on every read off the value, so `handleA` compiles and ships — and crashes the moment the payload's shape doesn't match. `unknown` is the sound top: it accepts every value but refuses every read until the code narrows the shape the compiler can see. That refusal is the feature.

  - source: 4.2
    question: |
      The course defaults to `type` for every alias. Which scenario is the one trigger that earns a reach for `interface` instead?
    choices:
      - text: |
          Composing a request payload from a base shape and a route-specific extension.
        correct: false
      - text: |
          Augmenting a third-party type (for example Better Auth's `Session`) inside a `declare module` block.
        correct: true
      - text: |
          Declaring an object shape whose fields might later need optional or `readonly` modifiers.
        correct: false
    why: |
      Declaration merging is the one job `type` can't do — two `type` declarations with the same name are a duplicate-identifier error. The canonical use is augmenting a type a package shipped via `declare module` plus an `interface`. Composition uses `&`; modifiers work identically on either form.

  - source: 4.3
    question: |
      `useState` returns `[value, setter]` instead of `{ value, setValue }`. What's the senior reason the tuple shape wins here?
    choices:
      - text: |
          A tuple is faster at runtime than a named-field object.
        correct: false
      - text: |
          The caller destructures-and-renames on every use, so the positional shape carries no naming penalty — each call site picks the names it wants.
        correct: true
      - text: |
          TypeScript can't infer object property types from generic hooks, so a tuple is the only shape that works.
        correct: false
    why: |
      The tuple earns its weight precisely when the caller will destructure-and-rename on every use site. Two callers in the same file can write `[isOpen, toggleOpen]` and `[isHovered, toggleHover]` from the same hook without collision. Past two slots, names win and the object is the senior call.

  - source: 4.4
    question: |
      You're typing a lookup table from invoice status to display label. The status is `'draft' | 'sent' | 'paid'`. Under `noUncheckedIndexedAccess`, which type catches a missing key at the literal site **and** reads back as `string` (not `string | undefined`)?
    choices:
      - text: |
          `Record<string, string>`
        correct: false
      - text: |
          `{ [status: string]: string }`
        correct: false
      - text: |
          `Record<'draft' | 'sent' | 'paid', string>`
        correct: true
    why: |
      The literal-union form earns two payoffs at once. Completeness fires at the literal site if any member is missing, and reads return `V` directly (no `| undefined`) because every key in the union is guaranteed present. The `Record<string, ...>` and index-signature forms both admit any string and force a `| undefined` at every read.

  - source: 4.5
    question: |
      A function takes `value: User | Guest`. `User` has an `email` field; `Guest` doesn't. You need to read `email` when it exists. Which moves are correct senior reflexes? (Select all that apply.)
    choices:
      - text: |
          Narrow with `if ('email' in value)` before the read.
        correct: true
      - text: |
          Widen the parameter to `{ email?: string; name: string }` so the read compiles.
        correct: false
      - text: |
          Write `(value as User).email` — you know the call sites only pass users with emails.
        correct: false
      - text: |
          Add a literal-typed discriminant to each variant and switch on it.
        correct: true
    why: |
      The shape-union access rule: only fields common to every variant are readable without narrowing. Narrow with a runtime check the language tracks (`in`, or equality on a discriminant). Widening hides the bug; asserting lies to the compiler — the runtime value is unchanged, and a real `Guest` will crash the next line that touches `email`.

  - source: 4.6
    question: |
      Which of the following is **not** one of the three legitimate triggers for reaching for `as`?
    choices:
      - text: |
          A `userSchema.parse(raw)` boundary where the parser validates `unknown` and returns a typed value.
        correct: false
      - text: |
          A `document.querySelector('button[type="submit"]') as HTMLButtonElement` in a tightly-scoped one-shot.
        correct: false
      - text: |
          Casting a `User | Guest` parameter to `User` because most call sites pass users.
        correct: true
      - text: |
          A `cache.get(id) as User` immediately after `cache.set(id, user)`, where the type system can't track the round-trip.
        correct: false
    why: |
      The three legitimate triggers are boundary parse-then-trust, the proof gap TypeScript can't see, and the DOM/third-party type seam. Asserting past a union because "most callers" send a `User` is the opening bug of the lesson — the runtime value is unchanged, and the first real `Guest` will crash the next line.

  - source: 4.7
    question: |
      Consider the four scenarios below. Which calls for the combined `as const satisfies T` idiom?
    choices:
      - text: |
          The signature of an exported function — `(input: { email: string }) => void`.
        correct: false
      - text: |
          A module-level routes map whose keys must cover every `RouteName` and whose values must remain literal paths so `(typeof ROUTES)[keyof typeof ROUTES]` narrows.
        correct: true
      - text: |
          A local variable holding the result of a `reduce` over a list of numbers.
        correct: false
    why: |
      Typed configs are the canonical site for the combined idiom. `as const` keeps the literal paths so `(typeof ROUTES)[keyof typeof ROUTES]` reads the narrow union; `satisfies Record<RouteName, string>` checks completeness without re-widening. An annotation on the same value would erase the literals; `as const` alone would skip the contract check.

  - source: 4.8
    question: |
      Which line is the wrong reach under the boundary rule and `verbatimModuleSyntax`?
    choices:
      - text: |
          ```ts
          const total = items.reduce((acc, item) => acc + item.price, 0);
          ```
        correct: false
      - text: |
          ```ts
          export const createInvoice = async (
            input: CreateInvoiceInput,
          ): Promise<Result<Invoice>> => { /* ... */ };
          ```
        correct: false
      - text: |
          ```ts
          import { User } from './user';

          const greet = (user: User) => `Hello, ${user.name}`;
          ```
        correct: true
    why: |
      Under `verbatimModuleSyntax`, a value import for a name used only as a type is a compile error — write `import type { User }` so the compiler erases the import and the bundler never sees it. The `reduce` is the canonical "infer the inside" case; the exported async function annotates parameters and return type at the boundary, exactly where the rule wants them.
