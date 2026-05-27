# Lesson 3 — Exhaustiveness, enforced

- **Title (h1):** Exhaustiveness, enforced
- **Sidebar label:** Exhaustiveness, enforced

---

## Lesson framing

This is a **pattern archetype** lesson closing Chapter 005's union-modeling triad (L1 shape → L2 transitions → L3 enforcement). It teaches one move: end every `switch` on a discriminant with a `never`-typed bottom so a future variant lands as a **compile error**, not a silent fall-through. The lesson also installs two narrowing helpers — **type predicates** (`value is T`, block-scoped) and **assertion functions** (`asserts value is T`, scope-wide) — that the rest of the chapter and the rest of the course rely on for typing `unknown`-from-the-wire reads and array filters.

**Posture.** Decisions before syntax. Open with the production bug L1 and L2 don't catch: a new variant ships on a discriminated union, the team forgets to update one of the consumers, and the consumer's `default` branch silently swallows the new value. The runtime keeps booting; the bug surfaces weeks later as a missed webhook or a missing UI state. The compiler should refuse to build the missing handler.

**The lesson's center of gravity** is the **`never` floor**. Once the student understands that the bottom of an exhaustive `switch` on a fully-narrowed discriminant **is** `never`, every enforcement idiom in the lesson falls out of the same idea: pass that bottom value to something whose parameter is `never`, and any missing variant fails the assignability check. `assertNever` and `satisfies never` are two surface shapes for one mechanic.

**Cognitive load plan.**
1. Bug first — the event handler that silently dropped a new variant because the `switch` had no enforcement.
2. The `never` floor — the type with no inhabitants, why an exhaustive narrow lands there, and why a missed variant doesn't.
3. `assertNever` — the helper function form. Compile-time check + runtime throw. The default.
4. `satisfies never` — the operator form. Pure compile-time check, zero runtime cost. The threshold reach.
5. The companion strict-flag (`noFallthroughCasesInSwitch`) named once.
6. The lookup-map alternative — `Record<Variant, Handler>` for dispatch where each case is a value.
7. Type predicates — block-scoped narrow. Recall from Chapter 004 Lesson 6, now with proper depth and the array-filter use case. Includes the TypeScript 5.5+ inferred-predicate note for the simplest filter shapes.
8. Assertion functions — scope-wide narrow. The test-fixture and parse-or-throw seam.
9. Authoring the runtime check — defer to Zod (Chapter 042) for production parsers; don't hand-roll.
10. Exercises — make a missing variant fail to compile; match five scenarios to the right narrowing tool.

**What this lesson does NOT do.**
- Does not re-teach the discriminated-union shape (L1 owns) or transitions (L2 owns). Recall in one sentence each.
- Does not author Zod schemas. The body of `isUser` for production should be a Zod parse; the lesson **names** Zod as the parser of record (Chapter 042) and shows a hand-written body only as the simplest illustration of the type-predicate signature.
- Does not teach the `unknown`-in-`catch` narrow with `instanceof Error` — Chapter 008 Lesson 2 owns.
- Does not teach conditional types or `infer` (library-author territory).
- Does not teach branded IDs — L4 owns nominal typing. Plain `string` throughout.
- Does not teach `typeof V` / `keyof T` / `T[K]` — L5 owns. The lookup-map alternative uses a hand-written `Record<...>` with the variant union restated via `AppEvent['type']`, with a one-line note that L5 owns indexed access at depth.
- Does not introduce alternative runtime-validation libraries (Valibot, ArkType). Zod is the course's commit.

**Recurring vocabulary.** "Exhaustiveness," "`never` floor," "type predicate," "assertion function," "block-scoped narrow," "scope-wide narrow," "missing-variant bug," "lookup map." Carry over from L1: discriminated union, discriminant, variant. Carry over from L2: nothing required.

**Naming and form conventions.**
- `function` keyword for type predicates and assertion functions — Code conventions §Function form names "type-guard signatures" as one of the carve-outs from the arrow-function default. Restate the carve-out at the point of first use so the student notices the deliberate switch from L1/L2's `const`-bound arrows.
- `assertNever` is the helper's canonical name. Place it in `lib/assert-never.ts` (single-export file, kebab-case filename matching the export) so the import path matches Code conventions §File and folder layout.
- The event-message vocabulary continues from L1: dotted `type` names (`'user.created'`, `'invoice.paid'`, etc.), `type` as the discriminant for events.

---

## Lesson sections

### Introduction (no h2 — prose lead-in)

Three short paragraphs, no preamble.

1. **The carry-over.** One sentence pointing back to L1 and L2: the student now writes discriminated unions whose **shape** (variants + per-variant fields) is watertight and whose **transitions** are typed. The variants exist; the moves between them are typed. Good.
2. **The crack.** Variants and transitions are typed, but **consumers** still aren't. Code that reads a discriminated union — a `switch`, a router, an event handler — has no compile-time link between "which variants exist" and "which variants are handled." Add a fifth event variant to the union; the existing `switch` over the four old variants keeps compiling. The new variant falls through the `default` branch (a `return null`, a `console.warn`, a logged-and-ignored payload) and nobody notices until production telemetry flags the gap.
3. **The bug.** A webhook handler receives event payloads typed as a four-variant union: `'user.created'`, `'invoice.paid'`, `'subscription.canceled'`, `'session.revoked'`. The team ships a new event type — `'invoice.refunded'` — and updates the producer side. The consumer's `switch` keeps compiling because TypeScript doesn't track "every variant has a case." Refunds go unhandled for two weeks. The fix is to make the missing case a **compile error** at the moment a new variant lands on the union. The compiler should refuse to build the missing handler.

Show the bug as a single `Code` block — the four-variant event union, the unguarded `switch` with a `default` branch returning `null`, and a comment line where the new variant would land. Keep it under 15 lines. Annotate inline: `// adding 'invoice.refunded' to AppEvent here would not break this switch — that is the bug`.

Reasoning: the introduction's production stake is the silently-dropped variant. The student needs to feel that a `switch` that compiles is not the same as a `switch` that handles every case. This is the lesson's pivot from "the type system catches what we wrote" to "the type system catches what we **forgot** to write."

### The `never` floor

The mechanical foundation. Short section — the rest of the lesson sits on this.

**Content.**
- Definition: **`never` is the type with no inhabitants** — no value is assignable to `never`. It is the bottom of TypeScript's type lattice. Use a `<Term>` tooltip on **`never`** at first use. Suggested text: "The bottom type — no value is assignable to `never`. Used to mark unreachable code and to enforce exhaustiveness on discriminated unions."
- The mechanic: inside a `switch` on the discriminant of a discriminated union, the compiler narrows the value down one variant at a time. When every variant has been handled (each `case` returns or throws), the value at the `default` branch has nothing left in its type — TypeScript narrows it to **`never`**. If a variant is missed, the value at `default` is **the missed variant**, not `never`.
- The enforcement idea: pass that bottom value to a function whose parameter is typed `never`. When the bottom is `never`, the call compiles. When the bottom is the missed variant, the call fails — the missed variant is not assignable to `never`. The compile error names the missing variant. The student leaves with this one sentence: **any time the type at the bottom of a `switch` is something other than `never`, a variant was missed.**

Show this with a single `Code` block: a four-variant `switch`, every `case` returning, and a `^?`-style inline comment at the `default` showing the resolved type is `never`. Then show the same `switch` with one `case` removed and the `default`'s resolved type now being the missed variant. No fancy component — two short blocks, one after the other, with one-paragraph framing between them. Title the second block "What the compiler sees when a variant is missed."

**Component.** Two sequential `Code` blocks. `CodeVariants` would force the reader to click between them; the contrast is short enough that adjacency reads better.

### `assertNever` — the default

The helper-function form. Compile-time check **plus** a runtime throw for the pathological case where a bad payload reaches the bottom anyway.

**Content.**
- The helper, in full:
  ```ts
  export function assertNever(value: never): never {
    throw new Error(`Unhandled variant: ${JSON.stringify(value)}`);
  }
  ```
  Notes on the shape: `function` keyword (Code conventions §Function form names type-guard signatures as one of the carve-outs from the arrow default; `assertNever` rides the same carve-out because its **return type `never`** is the point of the signature). Single export, file at `lib/assert-never.ts` per Code conventions §File and folder layout.
- The usage: at the `default` branch of a `switch` on the discriminant:
  ```ts
  switch (event.type) {
    case 'user.created':       return handleUserCreated(event);
    case 'invoice.paid':       return handleInvoicePaid(event);
    case 'subscription.canceled': return handleSubscriptionCanceled(event);
    case 'session.revoked':    return handleSessionRevoked(event);
    default:                   return assertNever(event);
  }
  ```
- Two-channel value, named once: **`assertNever` is both a compile-time exhaustiveness check and a runtime throw.** The compile error fires when the developer adds a variant without updating the `switch`. The runtime throw fires when a malformed payload somehow reaches the consumer at runtime — a webhook from a future API version, a manually-crafted JSON body, a database row populated by a deprecated codepath. Both branches of the value matter; the runtime fallback is part of the contract, not an afterthought.
- Why the throw is loud, not silent. State the senior reflex: if the consumer is reached with an unhandled variant, the team needs the error in their logs immediately, not a swallowed `console.warn`. The `Error` carries the offending value in its message (via `JSON.stringify`) so the on-call engineer doesn't have to chase a missing field.

**Component.** Use `<AnnotatedCode>` for the `switch` + `assertNever` block (3 steps). The block ties together the variants from L1's event-message example, the helper, and the import — three focal points the student should walk through one at a time:
1. **The four handled cases** — highlight all four `case` lines. One sentence: each variant gets exactly one case; the handlers themselves are elided for the lesson's purposes.
2. **The `default: assertNever(event)` line** — color green. The compile-time check lives on this one line. The argument's type is `never` only when every variant above has been handled.
3. **The compile error when a variant is missing** — keep the same code visible, but reframe: remove (mentally) one `case` line and the call to `assertNever(event)` no longer compiles because `event` at the `default` is `{ type: 'session.revoked'; ... }`, not `never`. Color red. The error message TypeScript produces — `Argument of type '...' is not assignable to parameter of type 'never'` — should be in the prose so the student recognizes it in their IDE.

This walkthrough is the lesson's center. The student should be able to write `assertNever` from memory after it.

### `satisfies never` — when the runtime throw is not needed

The TypeScript 4.9+ form for cases where the compile-time check alone is the point.

**Content.**
- The shape:
  ```ts
  switch (event.type) {
    case 'user.created':       return handleUserCreated(event);
    case 'invoice.paid':       return handleInvoicePaid(event);
    case 'subscription.canceled': return handleSubscriptionCanceled(event);
    case 'session.revoked':    return handleSessionRevoked(event);
    default:                   event satisfies never;
  }
  ```
- The `satisfies` operator (Chapter 004 Lesson 7, recalled in one sentence): checks that the value on the left is assignable to the type on the right **without** widening or asserting. `event satisfies never` compiles iff `event`'s type at that point is `never`. The line erases at compile time — zero runtime cost.
- When to reach for which:
  - **`assertNever`** — the default. Use when the consumer is a real handler (a webhook router, a reducer, a switch in a render function) and a bad payload reaching the `default` should fail loudly. The runtime throw is part of the contract.
  - **`satisfies never`** — the threshold reach. Use when the bottom is **structurally unreachable** and the type check alone is the point: a function that returns before the `switch` ends, a `switch` inside a pure type-narrowing helper, a test fixture's branch coverage check. The lesson should state the rule plainly: **`satisfies never` is for the cases where you don't want to throw at runtime; everywhere else, `assertNever` is the default.**
- One sentence on why `assertNever` remains the chapter's default: production handlers want the loud throw, not a silent erase.

**Component.** A single `Code` block with the `satisfies never` form, followed by a small two-row reference table inside `<Aside>` (`type="tip"`):

| Reach | Use when |
| --- | --- |
| `assertNever(event)` | Real consumer — a webhook router, a reducer, a render dispatch. Runtime throw is part of the contract. |
| `event satisfies never` | The bottom is structurally unreachable. Pure compile-time check, no runtime cost. |

The `<Aside>` is the right reach because the table is a quick lookup, not the section's main idea. The main idea is the principle stated in prose: throw at runtime in real handlers, satisfy-only when the bottom can't be hit.

### `noFallthroughCasesInSwitch` — the strict-flag companion

One paragraph naming the tsconfig flag that completes the picture. Code conventions §TypeScript lists `noFallthroughCasesInSwitch` as one of the strict flags every project enables.

**Content.**
- The flag turns a `case` without an explicit `break`, `return`, `throw`, or `continue` into a compile error. So a `case` body that forgets to terminate doesn't silently fall through to the next case.
- Combined with `assertNever` at the bottom, the `switch` becomes both **exhaustive** (every variant handled) and **unambiguous** (no accidental fall-through). The two enforcements are independent and they compose.
- One sentence on the project default: the course's `tsconfig.json` (Code conventions §TypeScript) ships with this flag on. The student doesn't need to enable it manually; they need to recognize the error message when it fires.

Render as plain prose. No code — the flag's effect is obvious once named.

### The lookup-map alternative

For dispatch where each case is **a value, not a procedure**, a `Record<Variant, Handler>` is the cleaner shape and produces the same exhaustiveness guarantee.

**Content.**
- The shape: when the `switch` body is just "look up the right thing for this variant," a record indexed by the variant literal gives the same exhaustiveness check via `Record`'s key requirement. Show:
  ```ts
  type EventType = AppEvent['type'];

  const HANDLERS: Record<EventType, (event: AppEvent) => Promise<void>> = {
    'user.created':         handleUserCreated,
    'invoice.paid':         handleInvoicePaid,
    'subscription.canceled': handleSubscriptionCanceled,
    'session.revoked':      handleSessionRevoked,
  };

  // dispatch:
  await HANDLERS[event.type](event);
  ```
- The compile-time guarantee: `Record<EventType, Handler>` requires **every** key in the union to have a handler. Add `'invoice.refunded'` to `AppEvent` and the `HANDLERS` constant fails to type-check — exactly the same enforcement as `assertNever`, expressed as a completeness constraint on the record's keys instead of a bottom-of-switch check.
- When to reach for it: when each case is a one-to-one handler reference (no branching, no inline logic) the lookup map reads cleaner than a `switch`. When each case has nontrivial inline logic, `switch + assertNever` reads better because the body of each case is local to the discriminant check.
- Recall from L1: this is the same `Record<LiteralUnion, V>` shape Chapter 004 Lesson 4 taught. The exhaustiveness check is already there; this section just names the use case.
- One-sentence forward link: L5 owns indexed access (`AppEvent['type']`) at depth. Here, the form is used directly because it's the most direct way to name the discriminant union; L5 will make this and the other derivation operators mechanical.

**Component.** A single `Code` block. No `<AnnotatedCode>` — the block is short enough that adjacency works.

### Type predicates — block-scoped narrowing

The first of the two narrowing helpers. Chapter 004 Lesson 6 named this; here we install the depth.

**Content.**
- The signature: a function whose return type is `value is T`. When the function returns `true`, the compiler narrows `value` to `T` **inside the if-block where the call appears**. Outside that block, the type is unchanged. State the **block-scoped** rule plainly.
- The canonical shape:
  ```ts
  function isUser(value: unknown): value is User {
    return typeof value === 'object'
      && value !== null
      && 'id' in value
      && 'email' in value;
  }
  ```
  Use a `<Term>` tooltip on **type predicate** at first use. Suggested text: "Function whose return type `value is T` tells the compiler that when the function returns `true`, the argument is `T` inside the if-block where the call appears."
- The two highest-leverage uses:
  - **Array filtering — named, reusable predicate.** Narrowing a `(User | Guest)[]` down to `User[]` via `.filter(isUser)`. Because the predicate's return type names `User`, the result of `.filter` narrows to `User[]`. This is the use case Chapter 004 Lesson 6 flagged and deferred — name the carry-over in one sentence.
    ```ts
    const allMembers: (User | Guest)[] = await listOrgMembers(orgId);
    const users = allMembers.filter(isUser);
    //    ^? User[]
    ```
  - **Narrowing `unknown` from the wire.** Before passing a parsed-but-not-yet-validated value into typed code, run the type predicate to narrow it.
    ```ts
    const payload: unknown = await req.json();
    if (isUser(payload)) {
      // payload is User here
      await sendWelcome(payload);
    }
    ```
- **Inline predicates and the TypeScript 5.5+ inference.** TypeScript 5.5 (June 2024) added **inferred type predicates** — when an inline arrow callback's body is a single boolean expression that refines the parameter, TypeScript now infers the `value is T` predicate **without** the developer writing it. The canonical case:
  ```ts
  const maybeUsers: (User | undefined)[] = [...];
  const users = maybeUsers.filter((u) => u !== undefined);
  //    ^? User[]   // inferred as `u is User` since TS 5.5
  ```
  State the senior reach plainly: **for one-shot inline `.filter` predicates whose body is a simple refinement, the inferred form is the cleanest reach in 2026 — no helper function needed.** For named, reusable, multi-condition predicates (the `isUser` shape above), the explicit `value is T` form is still the senior default because the signature documents the predicate's intent and the body can grow without losing the type narrow.
- The runtime-check rule, stated plainly: **the body of a non-trivial type predicate must actually validate the shape.** A hand-written `'id' in value && typeof value.id === 'string'` chain is fine for simple shapes but drifts the moment the type changes. Production code uses **Zod**: write the schema once, derive the type from `z.infer<typeof schema>`, and the type predicate becomes `(value: unknown): value is z.infer<typeof schema> => schema.safeParse(value).success`. Forward link in one sentence: Chapter 042 owns the Zod depth; here, the type predicate's signature is the lesson, not the parser's body.
- The carve-out from `const`-bound arrows for **named** type predicates: they use the **`function` keyword**, not arrow form. State the reason — Code conventions §Function form names type-guard signatures as one of the four carve-outs from the arrow default. The `function` form is the senior reach for any reusable, exported predicate. (Inline anonymous arrow callbacks like `.filter((u) => u !== undefined)` are the TS-5.5 inferred shape — a different surface, not a carve-out conflict.)

**Component.** Use `<AnnotatedCode>` (4 steps) for one combined block that shows the explicit predicate + a filter use + the TS-5.5 inferred case + an `unknown` narrow:
1. **The signature** — color blue. Highlight `value is User`. One sentence: this return-type form is the type predicate's whole API surface.
2. **The filter use (explicit predicate)** — color green. Highlight the `.filter(isUser)` call and the inferred `User[]` result. One sentence: the array narrows because the predicate's return type informs `.filter`'s inferred signature.
3. **The TS-5.5 inferred form** — color violet. Highlight the inline arrow `.filter((u) => u !== undefined)` and the inferred `User[]` result. One sentence: TypeScript 5.5+ infers the predicate when the body is a simple refinement; no helper needed for one-shot filters.
4. **The `unknown` narrow** — color orange. Highlight the `if (isUser(payload))` block. One sentence: inside the if-block, `payload` is `User`; outside it, it's still `unknown`.

### Assertion functions — scope-wide narrowing

The second narrowing helper. Same idea, different scope.

**Content.**
- The signature: a function whose return type is `asserts value is T`. When the function returns (without throwing), the compiler narrows `value` to `T` **for the rest of the scope** — not just inside an if-block. State the **scope-wide** rule plainly.
- The canonical shape:
  ```ts
  function assertIsUser(value: unknown): asserts value is User {
    if (!isUser(value)) {
      throw new Error(`Expected User, got: ${JSON.stringify(value)}`);
    }
  }
  ```
  Use a `<Term>` tooltip on **assertion function** at first use. Suggested text: "Function whose return type `asserts value is T` tells the compiler that after the call returns (without throwing), the argument is `T` for the rest of the scope."
- The two highest-leverage uses:
  - **Parse-or-throw at a service boundary.** A function reads `unknown` from a third-party SDK, asserts the shape, and continues with the narrowed type. No nested if-block needed.
    ```ts
    const raw: unknown = await stripe.invoices.retrieve(id);
    assertIsInvoice(raw);
    // raw is Invoice for the rest of this function
    return raw;
    ```
  - **Test fixtures and harnesses.** An `expect(value).toBeUser()`-style helper that asserts inside a test and lets the rest of the test access the narrowed value. The scope-wide narrow is what makes the test body readable.
- The trade-off, stated plainly: **assertion functions throw** to enforce the narrow; type predicates return a boolean and let the caller decide. The choice between them is "do I want the caller to handle the false case (predicate) or do I want the call site to fail fast (assertion)?" Production parse boundaries usually want the assertion form because the upstream wire shape is a contract — a violation is a bug, not a branch.
- Same `function`-keyword carve-out as type predicates. State it once: assertion functions also use `function`, not arrow form.
- Forward link in one sentence: Chapter 042's Zod parsers expose a `.parse(value)` method whose return type implicitly narrows — the same pattern, owned by the schema library.

**Component.** Use a small `<TabbedContent>` with two tabs:
- **"Type predicate (`is T`)"** — the `isUser` block from the previous section, recalled, with one-line caption: "Block-scoped narrow — `value` is `T` inside the if-block."
- **"Assertion function (`asserts is T`)"** — the `assertIsUser` block + the Stripe example, with one-line caption: "Scope-wide narrow — `value` is `T` for the rest of the function after the call returns."

`TabbedContent` is the right reach because the comparison is the lesson — the two helpers are siblings with one structural difference (scope of the narrow). Tabs let the student flip between them; sequential blocks would force scrolling. (Note: `<CodeVariants>` is for tabbed code comparisons; here the comparison includes prose framing of the scope difference, so `<TabbedContent>` reads better.)

### Why production parsers don't hand-roll the runtime check

One paragraph. The runtime-check rule restated as a senior reflex.

**Content.**
- The bodies shown in this lesson (`'id' in value && typeof value.id === 'string'`) are illustrative. **Production code does not author runtime validators by hand.** They drift from the schema, miss edge cases (nested optionals, discriminated unions, refinement constraints), and duplicate the type information.
- The senior reflex: **the schema is the source of truth.** Author the schema in Zod once; derive the TypeScript type from `z.infer<typeof schema>`; build the type predicate or assertion function on top of `schema.safeParse(value).success` or `schema.parse(value)`. Forward link: Chapter 042 owns the schema authoring and the runtime/type round-trip; the type predicate's signature is the lesson here, not the parser's body.

Render as plain prose, three sentences. No code — the section is a reminder, not a teach.

### Exercise — make a missing variant fail to compile

A `<TypeCoding>` exercise. The chapter outline suggests `script-coding`; `TypeCoding` is the right reach because:
- The exercise is about the **compile error** (the type-level contract), not runtime behavior.
- `expectedErrors` can pin the "not assignable to never" diagnostic to a specific line, which is the load-bearing observation.
- No runtime is needed to verify the pattern works — the `switch` doesn't need to actually dispatch.

**Setup (Widget B form — recommended).** Ship the starter with the union already containing **five** variants and the `switch` only handling four. The `default: return assertNever(event)` line already exists. Because `event` at the `default` is the missing variant, the call fails to compile — and the student's job is to add the missing `case` to make the `switch` exhaustive again. This matches the rest of the chapter's TypeCoding polarity ("make all errors go away").

```ts
type AppEvent =
  | { type: 'user.created'; userId: string }
  | { type: 'invoice.paid'; invoiceId: string; amount: number }
  | { type: 'subscription.canceled'; subscriptionId: string }
  | { type: 'session.revoked'; sessionId: string }
  | { type: 'invoice.refunded'; invoiceId: string };

function assertNever(value: never): never {
  throw new Error(`Unhandled variant: ${JSON.stringify(value)}`);
}

function handle(event: AppEvent): void {
  switch (event.type) {
    case 'user.created':           return notify(event.userId);
    case 'invoice.paid':           return record(event.invoiceId, event.amount);
    case 'subscription.canceled':  return cleanup(event.subscriptionId);
    case 'session.revoked':        return revoke(event.sessionId);
    // TODO: handle the missing variant so the `assertNever(event)` line compiles.
    default:                       return assertNever(event);
  }
}

// stubs — do not edit
declare function notify(userId: string): void;
declare function record(invoiceId: string, amount: number): void;
declare function cleanup(subscriptionId: string): void;
declare function revoke(sessionId: string): void;
declare function refund(invoiceId: string): void;
```

**Task.** Add a `case 'invoice.refunded':` branch that returns `refund(event.invoiceId)`. The compile error on the `assertNever(event)` line should disappear once every variant is handled. The widget's auto-added "Fix all errors" criterion grades the result.

**Instructions text.** "The `AppEvent` union has five variants; the `switch` only handles four. The `return assertNever(event)` line refuses to compile because `event` at the `default` is the unhandled variant, not `never`. Add the missing `case` to fix the call."

**Note for lesson author.** The natural TypeCoding polarity is "make all errors go away" — Widget B above matches that polarity. An alternative authoring (Widget A) would ship a four-variant union with the `default` returning `null` and ask the student to add `return assertNever(event)`; this also works but does **not** let the student feel the missing-variant error fire. Widget B is the recommended form because it surfaces the load-bearing observation (the compile error names the missed variant) as part of the starter.

### Exercise — pick the narrowing tool

A `<Matching>` exercise. The chapter outline calls for four narrowing scenarios paired to the right tool. This is the lesson's recall test — does the student recognize when each tool applies?

**Setup.** Five pairs. Left column: a real narrowing scenario. Right column: the tool that fits.

**Pairs.**
1. **Left:** "Filter an array of `(User | Guest)[]` down to just the `User[]` values, using a named, reusable predicate." **Right:** "Named type predicate — `function isUser(value: unknown): value is User`."
2. **Left:** "Validate an `unknown` payload from a third-party SDK before continuing the function." **Right:** "Assertion function — `function assertIsInvoice(value: unknown): asserts value is Invoice`."
3. **Left:** "Set up a test fixture so the rest of the test can access the value as a `User` without re-checking." **Right:** "Assertion function — scope-wide narrow."
4. **Left:** "Make a `switch` on a discriminated union refuse to compile when a future variant is added." **Right:** "`assertNever(value)` at the `default` branch."
5. **Left:** "Same exhaustiveness check, but the bottom of the function is structurally unreachable and you don't want a runtime throw." **Right:** "`value satisfies never` at the bottom."

Five pairs (bumped from outline's four) because the `assertNever` vs `satisfies never` distinction is the lesson's senior reach and deserves to be explicitly tested. `<Matching>` shuffles both columns on render, so source order does not affect difficulty.

**Instructions.** "Pair each scenario to the narrowing tool that fits. Two of the right-side options handle exhaustiveness on discriminated unions; the other three handle narrowing a wider type to a narrower one."

### External resources

A short `<ExternalResource>` cluster wrapped in `<CardGrid>`. Three cards is the chapter's default cadence.

1. **TypeScript Handbook — Narrowing (`never` and exhaustiveness)** — the authoritative reference for `never`-based exhaustiveness checking. URL: `https://www.typescriptlang.org/docs/handbook/2/narrowing.html#exhaustiveness-checking`. Icon: `simple-icons:typescript`.
2. **TypeScript Handbook — `satisfies` operator** — the canonical doc for the `satisfies` form, useful for the `satisfies never` section. URL: `https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html#the-satisfies-operator`. Icon: `simple-icons:typescript`.
3. **Total TypeScript — "Type Predicate Inference: The TS 5.5 Feature No One Expected"** — Matt Pocock's piece on inferred type predicates, the 2026 reach for inline `.filter` callbacks. URL: `https://www.totaltypescript.com/type-predicate-inference`. Icon: `simple-icons:typescript` (or generic web). **Fallback** if the URL has moved: TypeScript 5.5 release notes (`https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-5.html`) — same content, official source.

The third card should be verified online at write time. Three cards is the cap — the lesson's external surface is the `never` floor, the `satisfies` operator, and the TS-5.5 inferred-predicate moment; further cards dilute.

---

## Scope

### What this lesson includes

- The `never` type as the bottom of TypeScript's type lattice, and its role in exhaustiveness.
- `assertNever(value: never): never` as the helper-function form (compile-time check + runtime throw) — the lesson's default.
- `value satisfies never` as the operator form (pure compile-time check, zero runtime) — the threshold reach.
- `noFallthroughCasesInSwitch` as the strict-flag companion — named once.
- The lookup-map alternative — `Record<Variant, Handler>` for dispatch where each case is a value.
- Type predicates (`value is T`) — block-scoped narrowing, with the named-predicate `.filter` use, the `unknown`-narrow use, and the TypeScript 5.5+ inferred-predicate form for inline anonymous arrow filters.
- Assertion functions (`asserts value is T`) — scope-wide narrowing, with the parse-or-throw and test-fixture use cases.
- The `function`-keyword carve-out from the chapter's arrow-default for **named** type predicates and assertion functions (inline inferred predicates are anonymous arrows, no carve-out conflict).
- The runtime-check rule: production bodies use Zod, not hand-rolled chains (forward link only).
- Two exercises: make a missing variant fail to compile (`TypeCoding`); pair five narrowing scenarios to the right tool (`Matching`).

### What this lesson does NOT include

- **The discriminated-union shape itself** — Chapter 005 Lesson 1 owns. Recall in one sentence in the introduction.
- **State machines and typed transition functions** — Chapter 005 Lesson 2 owns. The `switch` examples here are render-side dispatches, not transitions.
- **Branded IDs** — Chapter 005 Lesson 4 owns. Plain `string` for all IDs (event payloads, session IDs, invoice IDs).
- **`typeof V`, `keyof T`, `T[K]` derivation operators at depth** — Chapter 005 Lesson 5 owns. The lookup-map example uses `AppEvent['type']` for the key union as the most direct form; one sentence notes that L5 owns indexed access. Do not derive other types in this lesson.
- **Utility types** (`Partial`, `Pick`, `Omit`, `Extract`, etc.) — Chapter 005 Lesson 6 owns. Do not slice the union with `Extract<AppEvent, { type: 'user.created' }>` even though it would work; direct case-handling is the appropriate form here.
- **Generics with constraints** — Chapter 005 Lesson 7 owns. The lookup-map's handler type is shown as `(event: AppEvent) => Promise<void>` (concrete), not generic.
- **Zod schema authoring** — Chapter 042 (Unit 5) owns. The runtime-check rule is stated and Zod is named as the parser of record; no Zod code samples in this lesson.
- **`instanceof Error` and `unknown`-in-`catch` narrowing** — Chapter 008 Lesson 2 owns. This lesson's `unknown` narrow uses the type-predicate form, not catch-block narrowing.
- **Conditional types and `infer`** — out of scope (library-author territory; mentioned in the L7 outline as not taught at depth).
- **Alternative runtime-validation libraries** (Valibot, ArkType, Effect Schema) — Zod is the course's commit.
- **Reducer authoring at depth** — Chapter 024 (`useReducer`) and Chapter 078–079 (Zustand) own. The `switch + assertNever` pattern is mentioned as "the shape every reducer should end with," nothing more.

### Prerequisites — concise refreshers only

- **Discriminated unions** (Chapter 005 Lesson 1) — one sentence: "A discriminated union is a union of object types each carrying a literal-typed discriminant the compiler narrows on; `switch` on the discriminant is the highest-leverage consumer pattern."
- **`switch` narrowing by the discriminant** (Chapter 005 Lesson 1) — one sentence: "Inside each `case`, the value is narrowed to the matching variant."
- **`satisfies` operator** (Chapter 004 Lesson 7) — one sentence at first use: "The `satisfies` operator checks the value's type against a target type without widening or asserting."
- **Type predicate form** (Chapter 004 Lesson 6) — one sentence: "Chapter 004 Lesson 6 named the `value is T` return type as one of the six narrowing forms; this lesson installs the depth."
- **`Record<K, V>` with literal-union keys** (Chapter 004 Lesson 4) — one sentence at first use in the lookup-map section: "When `K` is a literal union, `Record<K, V>` requires every key to be present — the same exhaustiveness check, expressed differently."

---

## Components and diagrams at a glance

| Section | Component | Purpose |
| --- | --- | --- |
| Introduction | Single `<Code>` block | The missing-variant bug — four-variant union, unguarded `switch`. |
| The `never` floor | Two sequential `<Code>` blocks | Exhaustive `switch` (bottom is `never`) vs missed-variant `switch` (bottom is the missed variant). |
| `assertNever` — the default | `<AnnotatedCode>` (3 steps) | The full `switch + assertNever` walkthrough; the lesson's center. |
| `satisfies never` | Single `<Code>` block + `<Aside type="tip">` with reach table | The operator form + a two-row "when to reach for which" reference. |
| `noFallthroughCasesInSwitch` | Plain prose | The strict-flag companion, named once. |
| The lookup-map alternative | Single `<Code>` block | `Record<EventType, Handler>` — the same exhaustiveness check, expressed differently. |
| Type predicates | `<AnnotatedCode>` (4 steps) | Signature + named `.filter` use + TS-5.5 inline inferred predicate + `unknown` narrow. |
| Assertion functions | `<TabbedContent>` (2 tabs) | Predicate (block-scoped) vs assertion (scope-wide) side by side. |
| Why production parsers don't hand-roll | Plain prose | Zod is named; no schema authoring here. |
| Exercise — exhaustiveness | `<TypeCoding>` (Widget B form) | Add the missing `case` to a five-variant `switch` so `assertNever` compiles. |
| Exercise — pick the tool | `<Matching>` (5 pairs) | Pair narrowing scenarios to the right tool. |
| External resources | 3 × `<ExternalResource>` in `<CardGrid>` | TypeScript Handbook (exhaustiveness), TypeScript Handbook (`satisfies`), Total TypeScript / TS 5.5 release notes (inferred predicates). |

## `<Term>` tooltips to include

- **`never`** — at first use in §The `never` floor. "The bottom type — no value is assignable to `never`. Used to mark unreachable code and to enforce exhaustiveness on discriminated unions."
- **type predicate** — at first use in §Type predicates. "Function whose return type `value is T` tells the compiler that when the function returns `true`, the argument is `T` inside the if-block where the call appears."
- **assertion function** — at first use in §Assertion functions. "Function whose return type `asserts value is T` tells the compiler that after the call returns (without throwing), the argument is `T` for the rest of the scope."

Do not re-render the L1 tooltips (variant, discriminant, discriminated union, impossible state) — they live in the cross-lesson glossary already. Three tooltips is the cap for this lesson.

## Diagrams

This lesson does **not** include a Mermaid or D2 diagram. The visual hook of the lesson is the **type at the bottom of the switch** — `never` when exhaustive, the missed variant when not — and that is best shown as adjacent `Code` blocks with the inferred type written inline (`// ^? never` vs `// ^? { type: 'session.revoked'; ... }`). A separate diagram of "narrowing one variant at a time down to `never`" is conceivable but adds nothing over the two side-by-side code blocks; the type lattice would be over-staged for a lesson whose center is mechanical.

The only optional visual aid that might earn its weight is a small inline **scope diagram** for the type-predicate vs assertion-function comparison — a tiny HTML+CSS sketch showing "narrow region" (an if-block bracketed) vs "narrow region" (everything after the call bracketed). Mention this as an **optional enhancement** for the lesson author; the `<TabbedContent>` with prose captions does the job and the lesson runs without the sketch.
