# Chapter 2.2 — Functions, naming, and control flow

## Chapter framing

Chapter 2.1 installed the values-and-references mental model and the equality and primitive-surface reflexes that follow from it. This chapter teaches the next layer the rest of the course is written in: the function — the unit a senior reaches for to name an operation — and the syntactic surface that surrounds it. Function forms, parameter shapes, the naming discipline that decides whether a callsite reads, the control flow that connects calls, the null-safe operators that 2026 code reaches for instead of nested `if`s, destructuring as the call-shape every API surface uses, and closures as the model that explains why a `"use server"` action sees the variables it captures.

The senior framing for the chapter: **the function is where intent lives.** A clear function is a clear name, a clear parameter shape, and a clear flow from input to output — and in 2026 SaaS code the bar is high because every function gets read more often than it gets written. Every lesson in the chapter foregrounds one piece of that bar: the form that fits the role, the name that telegraphs intent, the flow that stays flat under cognitive load.

Threads that must run through every lesson:

- **The default function form is the arrow `const`-bound expression.** Top-level helpers, components, callbacks, hooks — all arrow. The course writes `function` declarations only when hoisting, named recursion, or a type guard's narrowing signature genuinely earns it. This is the form the rest of the course uses; the lesson on function forms (2.2.1) sets the rule and every later snippet honors it.
- **Types live on parameters and exported APIs; locals stay inferred.** This is the 2.4.10 rule, applied here from the first snippet. Every parameter has a type. Return types are inferred unless the signature *is* the lesson or inference would be wrong. No `any`; `unknown` is the escape hatch and never the default.
- **Naming is a load-bearing skill, not a style preference.** Architectural Principle #4 — name things for intent, not implementation — lands in 2.2.3 and recurs in every later naming-matters moment in the course. The chapter's earlier lessons already write the form (semantic variable names, verb-first function names, boolean prefixes) so when the principle is finally named the student recognizes the discipline that's been operating all along.
- **Flat control flow over nested.** Guard clauses, early returns, ternaries for expression-level branching, `switch` for finite enumerations with exhaustive-checking turned on. The course writes one or two levels of nesting; past that the senior reflex is to extract a function or invert the condition. The control-flow lesson teaches the reflex inline.
- **Null-safe operators are the 2026 default.** `?.`, `??`, and `??=` are the surface; `||` for defaults is a code smell because `0`, `''`, and `false` are legitimate values in production code. The lesson names the trigger for each operator, the pitfalls (the silent `obj?.fn()` when `fn` is `undefined` but `obj` isn't, `??` precedence with `||` and `&&`), and the TS narrowing that fires on each.
- **Closures explain the server/client boundary later.** The closures lesson is small but load-bearing: lexical capture is the model that makes `"use server"` actions, `useEffect` cleanup, and route-handler factories legible in later units. The senior anchor is named here so the student has the vocabulary when they meet it in Units 5 and 7.

This chapter ships small standalone snippets in TypeScript, no application code. Live coding components carry the practice. The student finishes the chapter able to write a function whose name reads, whose signature is precise, whose body is flat, and whose closure behavior they can explain on a code review.

The chapter order reflects the dependency between lessons. Function forms come first because every later lesson references them. Parameter shapes follow because they're the second half of "how to write a function." Naming lands in the middle because it's a principle that hangs on functions but also seeds every variable name and control-flow branch that follows it. Control flow comes after naming because a flat function reads only when its branches are well-named. The null-safe operators follow control flow because `?.` and `??` are the form a senior reaches for instead of an `if (x !== null && x !== undefined)` guard. Destructuring lands next because the call-shape it produces is what every later API in the course consumes. Closures close the chapter because the model only makes sense after all the function mechanics are locked in.

---

## Lesson 2.2.1 — Arrow by default, declaration on demand

Teaches the three function forms, the senior rule that arrow expressions bound to `const` are the 2026 default, and the narrow triggers (hoisting, named recursion, type-guard signatures) that earn a `function` declaration.

Topics to cover:

- The senior question: which function form does a 2026 SaaS codebase reach for, and why. The answer the course commits to: **arrow expressions assigned to `const` are the default**, for top-level helpers, callbacks, hooks, components, and inline use. `function` declarations are the conditional — used when hoisting, named recursion, type-guard narrowing signatures, or interop with a library that expects a named function genuinely earn the keyword. The lesson does not survey the spec; it names the rule and shows the three forms.
- The three forms, named for what each is and what it costs:
  - **Arrow expression bound to `const`** — the default. Lexical `this`, no `arguments` object, can't be used as a constructor, can't be hoisted (the binding is in the TDZ until the line evaluates). The course writes `const formatInvoice = (invoice: Invoice) => ...` everywhere this fits.
  - **`function` declaration** — hoists fully (the function is callable from the top of the file, defined at the bottom), has its own `this` and `arguments`, named in stack traces by default. The senior triggers: a recursive helper that wants to refer to itself by name, a type-guard function where TypeScript needs the named signature for narrowing in 2.4.7 (`function isAdmin(user: User): user is Admin`), the rare case where hoisting genuinely improves the file's reading order.
  - **`function` expression bound to a `const`** — the historical compromise. Named or anonymous. The course doesn't write this form — the arrow expression supersedes it for everything except the `this`-and-`arguments` cases, and those cases are rare enough that the `function` declaration is the better tool when they arise.
- The `this` and `arguments` story, named once and dismissed. Arrow functions don't bind their own `this` or `arguments` — they capture the enclosing scope's. In 2026 React + Next.js code this is what the senior wants by default: hooks, callbacks, and component bodies never want a fresh `this`, and `...rest` parameters replace `arguments` everywhere. The exception is class methods (where `this` is the instance) and the rare adapter wrapping a class-based SDK; the course doesn't write classes by default (Lesson 2.9.2 names where they earn their weight).
- The named-vs-anonymous trade-off in stack traces. Anonymous arrows show up in stack traces as the variable name they're bound to in modern engines and bundlers — `const formatInvoice = (...) => ...` traces as `formatInvoice`, not as `<anonymous>`. The senior reflex: don't bother naming the function expression separately; let the binding name carry the trace. The exception is callbacks passed inline (a `.map((item) => ...)` is fine anonymous; the iteration callsite is the trace anchor).
- TypeScript on function forms. Every parameter gets a type. Return types are inferred for ordinary helpers (the 2.4.10 rule) and explicit for exported APIs and type-guard signatures. The arrow form types as `const fn = (param: Param): Return => ...` when the return type is annotated; the function-declaration form as `function fn(param: Param): Return { ... }`. Both are equivalent at the type level; the choice is about hoisting and stack traces, not types.
- A note on generator functions and async functions in this lesson's frame. `async` is a modifier on both forms (`async function foo()`, `const foo = async () => ...`) — the full async treatment is 2.7. Generators (`function*`) are out of scope for 2026 SaaS work — named once as "you'll see this in a library; you won't write it."

What this lesson does not cover:

- Parameter shapes (defaults, rest, spread) — that's 2.2.2.
- Closures — 2.2.7.
- `async`/`await` — Unit 2.7.
- Generator functions and `yield` — out of scope.
- Class methods, method shorthand on objects — light treatment in 2.9.2; otherwise out of scope.
- Type-guard function signatures in depth — 2.4.7 owns the narrowing surface.

Pedagogical approach:

Decision archetype with a Mechanics body. Open with the senior question — "which form does a 2026 SaaS codebase reach for?" — and answer in one sentence: arrow expressions bound to `const`, with `function` as the conditional for hoisting and named-recursion. That commitment frames the lesson. Show the three forms in one `CodeVariants` block — same operation written each way, the student sees them side by side and the syntactic difference is obvious. Then a tight Mechanics walk: a `ScriptCoding` where the student writes a `formatInvoice` helper as an arrow expression with typed parameters, then converts it to a `function` declaration and watches the hoisting behavior (call it before the declaration, see it work for `function`, see the `ReferenceError` for the arrow on the TDZ). The contrast cements the rule. Close with a `Buckets` exercise sorting eight function snippets — a recursive Fibonacci helper, a `useEffect` callback, a React component, a type guard, a `.map` callback, an exported utility, a hoisted top-level helper, an event handler — into "arrow `const`" or "function declaration" with the senior reason for each. No sandbox; the live coding has done the work.

Estimated student time: 30 to 40 minutes.

---

## Lesson 2.2.2 — Signatures that stay readable past two parameters

Teaches the two-positional-parameter rule and the options-object pattern, parameter defaults firing only on `undefined`, rest parameters and call-site spread, and the TypeScript ordering of required vs. optional parameters.

Topics to cover:

- The senior question: how does a function signature stay readable when it grows past two parameters. The 2026 answer: it doesn't grow past two positional parameters — past that, the signature collapses into a single options object. The lesson names the rule before it teaches the syntax: positional parameters for one or two values whose order is obvious at the callsite (`updateStatus(invoiceId, 'paid')`); a single typed options object past that (`createInvoice({ orgId, customerId, lineItems, dueAt })`). The cost the rule prevents: positional callsites where the reader has to count commas to know what the third argument is.
- Default parameters. The `param = defaultValue` syntax, evaluated lazily (each call re-evaluates), with full access to earlier parameters in the same signature (`(amount: number, taxRate: number = defaultTaxFor(amount))`). The senior watch-outs: defaults fire on `undefined`, not on `null` — passing `null` to a parameter with a default uses `null`, not the default; defaults make a parameter optional at the type level (the parameter is typed as `Param`, not `Param | undefined`, but the callsite can omit it).
- Rest parameters. The `...rest` syntax binds remaining positional arguments into a typed array (`(first: string, ...rest: number[])`). The senior triggers: variadic APIs (`Math.max`, `Math.min`, custom logger that joins arguments), forwarding to another function (`(...args: Parameters<typeof inner>) => inner(...args)`). The course rarely writes variadic functions in application code; rest parameters are common in utilities and adapters.
- Spread at the callsite. The mirror of rest — `fn(...args)` unpacks an array into positional arguments. The senior triggers: forwarding (above), spreading into array-accepting APIs (`Math.max(...values)`), tuple-typed argument spreading (`fn(...[a, b, c] as const)`). The course uses spread heavily on object literals and array literals (taught in 2.3.1 / 2.3.2); function-call spread is rarer but earns its weight in adapters.
- The options-object pattern as the default for three-plus parameters. The signature `function createInvoice(options: CreateInvoiceOptions)` where `CreateInvoiceOptions` is a named `type` or `interface` (taught in 2.4.2). The reasons named: callsite reads (`createInvoice({ orgId, customerId, lineItems, dueAt })` is self-documenting), the type lives in one place (other functions can `Pick`/`Omit` from it), adding a parameter is non-breaking at the callsite. The pattern is so load-bearing that every React component (Unit 4), every server action (Unit 7.2), every route handler (Unit 7.5), and every Drizzle query builder consumes it as the default shape — the student needs the muscle memory.
- The destructuring shortcut, previewed. `function createInvoice({ orgId, customerId, ...rest }: CreateInvoiceOptions)` destructures the options object inline. Named here so the student sees the form, taught in depth in 2.2.6.
- TypeScript shapes a parameter signature: required positional parameters first, optional and defaulted parameters last (TypeScript enforces this ordering — required-after-optional is a compile error). Optional parameters as `param?: Param` (typed `Param | undefined`, no default value). Defaulted parameters as `param: Param = default` (typed `Param`, callsite can omit). The two are different at the type level; the lesson names the distinction so the student picks the right one.
- One forward reference. Function overloads (multiple signatures for the same implementation) are a TS feature named in passing in 2.4 — 2026 SaaS code rarely writes them, preferring a discriminated-union parameter (the pattern from 2.5.2) over overloads.

What this lesson does not cover:

- Object destructuring in parameters — previewed here, owned by 2.2.6.
- Function overloads — 2.4 names them in passing.
- TypeScript's `Parameters<T>` and `ReturnType<T>` utility types — 2.5.7.
- Generics on functions — 2.5.8.

Pedagogical approach:

Mechanics archetype with a Decision opening. Open with the "past two parameters, options object" rule in one sentence and a single `CodeVariants` showing the same function written four ways — five positional parameters (bad), the same with three of them as object properties (better), the same as one options object (the form), and the options object destructured inline (the form with the destructuring sugar from 2.2.6 previewed). The student sees the progression in one visual sweep. Then a `ScriptCoding` block exercising defaults — the student writes `createInvoice` with a defaulted `currency: string = 'USD'`, calls it once without and once with `null` (sees that `null` overrides the default), and once with `undefined` (sees the default fire). The surprise is the lesson. A small `AnnotatedCode` walks one rest-parameter signature with the annotations pointing at the rest type, the spread callsite, and the `Parameters<typeof inner>` forwarding pattern as a footnote. Close with a `CodeReview` exercise: a four-parameter `sendEmail` function whose callsites are unreadable — the student refactors to options-object form with TS types. No sandbox.

Estimated student time: 30 to 40 minutes.

---

## Lesson 2.2.3 — Name for intent, not implementation

Teaches Architectural Principle #4 across the four naming surfaces (variables, functions, parameters, types), the boolean-prefix convention, and the three bad-name classes (implementation-leaking, vague abstractions, negated booleans).

Topics to cover:

- The principle introduction, named explicitly. **Architectural Principle #4 — name things for intent, not implementation.** A name should answer "what does this represent in the domain," not "how is it computed." The student has been reading the discipline since Chapter 2.1 (`totalCents` over `total`, `userInput` over `s`); this lesson names it and makes it teachable. The principle recurs at every later naming-matters moment: server-action verbs in 7.2, Drizzle column names in 6.2, React component names in 4.6, file co-location in 5.1, and every project chapter where the student names a function for the first time.
- The four naming surfaces the lesson teaches, with the senior reflex for each:
  - **Variables and constants.** Nouns for values, prefixed for booleans (`isPaid`, `hasInvoice`, `canEdit`, `shouldRetry`). The senior watch-out: `data`, `result`, `value`, `item` are usually under-named — the right name is the domain noun (`invoice`, `customer`, `lineItem`). Loop variables in short iterations can stay single-letter (`for (const i of indexes)` is fine inside three lines); past that, the iteration variable earns the domain noun.
  - **Functions.** Verbs for actions (`createInvoice`, `sendReminderEmail`), nouns or verb-phrases for pure transformations (`invoiceTotal(invoice)` reads as the noun the function returns; `formatInvoiceTotal(invoice)` reads as the verb when the formatting is the point). Boolean-returning functions take the boolean prefix (`isAdmin(user)`, `hasPermission(user, action)`). The senior call: the function name should make the callsite read as English — `if (canDelete(user, invoice))` is the bar.
  - **Parameters.** Same rules as variables, with one addition: a parameter name lives in the public surface of the function. `function update(x: Invoice, y: Status)` reads at the callsite as `update(invoice, 'paid')` — the parameter names disappear at the call. But the names live in the signature, in autocomplete, in TS error messages, and in the destructuring of options objects (`createInvoice({ orgId, customerId })` — the option keys *are* the parameter names). Names that don't read as English break the destructuring callsite. Name parameters as if they were going to be destructured.
  - **Types and interfaces.** Domain nouns (`Invoice`, `OrgRole`, `BillingPlan`), suffixed with intent when the type is a shape-of-something rather than the thing itself (`InvoiceFormState` for the form, `InvoiceRow` for the table row, `CreateInvoiceInput` for the server-action input). The course doesn't use `I`-prefixed interface names (`IInvoice`) — that convention is dead in 2026 TypeScript codebases.
- The three classes of bad name the lesson teaches the student to spot:
  - **Implementation-leaking names.** `userMap`, `invoiceArray`, `getDataFromApi` — the name describes the data structure or the mechanism, not the value. The senior reflex: rename to the value (`usersById`, `invoices`, `fetchInvoices`).
  - **Vague abstractions.** `data`, `info`, `details`, `manager`, `handler`, `utils`. The name carries no information past "this is a thing." Rename to the domain noun.
  - **Negated booleans.** `isNotPaid`, `shouldNotRetry`, `hasNoErrors`. The double-negative at the callsite (`if (!isNotPaid)`) defeats the reader. The senior reflex: invert the name to its positive form (`isPaid`, `shouldRetry`, `isValid`) and let the callsite use `!` when it needs the negative.
- The "name in the domain" rule. The course's examples come from invoicing, organizations, users, and other concrete SaaS domains because the names anchor in something the reader recognizes. A returning dev who has shipped a billing system reads `lineItems` and immediately knows what the variable holds; the same dev reads `items` and has to look at the type. The principle is: write names that a teammate landing on the codebase next week can read without scrolling up.
- One sentence on file names and folder names. The same principle extends — `lib/invoice-formatting.ts` reads at the import site (`import { formatInvoiceTotal } from '~/lib/invoice-formatting'`) as the domain area. File co-location and Architectural Principle #1 (taught in 5.1.2) is where the file-naming discipline lands fully; this lesson plants the seed.
- The TypeScript bonus. Well-named types and parameters produce well-named autocomplete and error messages. Renaming a parameter from `x` to `invoice` upgrades every IDE prompt, every error message, and every destructuring callsite for free. The principle pays compound interest in TypeScript-first codebases.

What this lesson does not cover:

- File-system co-location (Architectural Principle #1, 5.1.2).
- React component naming (4.6).
- Drizzle column naming (6.2).
- Server-action verb conventions (7.2).
- `enum` vs. literal-union naming — the course writes literal unions (2.4.1 / 2.4.6), so `enum` naming is out of scope.

Pedagogical approach:

Pattern archetype with a Decision frame. The lesson teaches a discipline, not a syntax — the form is wrong-then-right contrasts the student internalizes by reading and rewriting. Open with the principle as a one-paragraph statement, then show the discipline operating in a `CodeReview` exercise: a small function with five badly-named identifiers (`data`, `arr`, `flag`, `tmp`, `fn`), and the student rewrites them to domain names. The exercise is the lesson — students learn naming by renaming, not by reading rules. After the exercise, a tight `CodeVariants` showing four canonical bad/good pairs (`userMap` vs. `usersById`, `getData` vs. `fetchInvoices`, `isNotPaid` vs. `isPaid`, `handleClick` as the React exception — handlers are an established convention worth keeping). Each pair gets one sentence of senior reasoning. A `Dropdowns` exercise on a five-line snippet — the student picks the best name from three options at each blank, with each correct choice flashing the senior reason. Close with a one-paragraph reminder that the principle recurs across the course and the student will see it cited at every naming-matters moment. No sandbox — the work is intellectual, not exploratory.

Estimated student time: 30 to 40 minutes.

---

## Lesson 2.2.4 — Guard clauses, ternaries, and exhaustive `switch`

Teaches flat control flow through early-return guards, expression-level ternaries, `switch` with `noFallthroughCasesInSwitch` and `assertNever`, the lookup-map alternative, and the loop forms a 2026 senior reaches for.

Topics to cover:

- The senior question: how does a function with five branches stay readable. The 2026 answer: with guard clauses and early returns at the top, the happy path in the body, and exhaustive `switch` for finite enumerations. Nesting past two levels is a refactor signal — extract a function, invert a condition, or restructure the data. The lesson names the rule and teaches the four control-flow primitives a SaaS engineer reaches for daily.
- `if` / `else if` / `else`. The default branching primitive. The senior style: prefer guard clauses (`if (!user) return null;` at the top) over nested conditionals; reach for `else if` chains for two or three branches at most, past which `switch` or a lookup map earns its weight. Truthy / falsy coercion is named once — the seven falsy values (`false`, `0`, `-0`, `0n`, `''`, `null`, `undefined`, `NaN`) — with the senior reflex: write explicit comparisons (`if (count === 0)`) for numeric zero, empty-string, and nullish checks because `if (!count)` ships the bug where 0 is a valid value (the same lesson as `??` over `||` in 2.2.5).
- Guard clauses and early returns. The pattern that makes a function flat. The student writes `if (!user) return null;` at the top of a function instead of wrapping the body in `if (user) { ... }`. The senior framing: a guard clause states a precondition explicitly, fails fast, and lets the rest of the function read as the happy path. The lesson shows one canonical refactor — nested-conditional pyramid into a flat guard-clause sequence — and names the rule: past two levels of nesting, invert.
- Ternary expressions. `condition ? a : b` for expression-level branching where the result is a value, not a statement. The senior triggers: assigning to a variable (`const label = isPaid ? 'Paid' : 'Open'`), returning a value (`return user.isAdmin ? canonicalActions : limitedActions`), inline in JSX (Unit 4 — `{isPaid && <PaidBadge />}` and `{isPaid ? <PaidBadge /> : <OpenBadge />}` are the two React forms). The senior watch-out: nested ternaries past one level are unreadable; past one level, extract a function or use a `switch`. The course never writes `a ? b : c ? d : e` chains.
- `switch` with `noFallthroughCasesInSwitch`. The strictness flag was wired in 1.4.3; this lesson cashes it in. `switch` earns its weight when branching on a finite, discriminated value — a status enum (`'paid' | 'open' | 'void'`), a notification type, an event-handler discriminator. The senior style: one `case` per value, `return` from each `case` (no `break` needed because returning bypasses fallthrough), an exhaustive `assertNever` in `default` for type-safety against unhandled cases (named here, full treatment in 2.5.4). The lesson does not write `break`-style `switch`es — return-from-case is the form, and the `noFallthroughCasesInSwitch` flag makes the alternative a compile error. The `assertNever` pattern is the load-bearing payoff: adding a fourth status to the enum becomes a compile error in every `switch` that's missing the new case, which is the discriminated-union safety net the chapter is paving the way for.
- The lookup-map alternative. Past three or four cases, a `Record<Discriminator, Handler>` lookup is often cleaner than a `switch` — the student sees one example (`const formatters: Record<Status, (invoice: Invoice) => string> = { paid: ..., open: ..., void: ... }; return formatters[invoice.status](invoice);`). The senior call: `switch` when the per-case logic is complex; lookup map when the per-case logic is a single expression. Both compose with `assertNever` at the type level.
- The loop primitives, briefly. `for...of` for iterating values, `for...in` named once and dismissed (iterates *keys*, including inherited prototype keys — almost never what a senior wants in 2026), `for (let i = 0; ...)` only when the index is genuinely needed (very rare). `while` and `do...while` named in passing — used in retry loops, polling loops, queue-drainers. The full treatment of array iteration (`.map`, `.filter`, `.reduce`, `for...of`) lives in 2.3.3 / 2.3.5; this lesson names the loop forms so the student has the vocabulary.
- The `break`, `continue`, and labeled-statement story. `break` and `continue` are fine in loops; labels are out of scope for 2026 SaaS work (named once as "you'll see this in algorithm code; you won't write it in a SaaS handler"). `throw` as control flow — named here as the seam to Unit 2.8 (`throw` exits a function, propagates up the call stack; the full error-handling treatment is in 2.8).
- One forward reference. The discriminated-union pattern (2.5.2) and the `assertNever` exhaustiveness check (2.5.4) are previewed in the `switch` section. The student sees the shape; the full treatment is in Unit 2.5.

What this lesson does not cover:

- Array iteration methods (`.map`, `.filter`, `.reduce`) — 2.3.3 owns the surface.
- Iteration helpers and lazy iteration — 2.3.5.
- `throw` / `try` / `catch` — Unit 2.8.
- Loops over async work (`for await...of`, the N+1 trap) — 2.7.3.
- React conditional rendering specifics — Unit 4.

Pedagogical approach:

Pattern archetype with a Mechanics body. The lesson's center of gravity is the flat-control-flow discipline, taught through wrong-then-right contrasts. Open with the senior question, then a `CodeReview` exercise: a pyramid-of-doom function with four levels of nested `if`s. The student refactors to guard clauses with early returns and watches the indentation collapse. The exercise is the lesson — internalizing the reflex by doing the rewrite. After the exercise, a tight Mechanics walk: a `ScriptCoding` block for the `switch` with `assertNever`, where the student writes a `formatStatus` function on a `'paid' | 'open' | 'void'` union, sees the exhaustiveness check fire when they add `'pending'` to the union without handling it. The TS error is the payoff. A small `CodeVariants` shows the `switch` vs. lookup-map comparison on the same example so the student knows when to pick each. Close with a `PredictOutput` exercise on five truthy / falsy traps — `if (count)` when `count` is `0`, `if (name)` when `name` is `''`, etc. — the student predicts the branch taken and learns to prefer explicit comparisons. No sandbox; the live coding has carried the exercises.

Estimated student time: 35 to 45 minutes.

---

## Lesson 2.2.5 — The null-safe operator trio

Teaches `?.` for nullable access at each chain link, `??` over `||` for defaults (with the `0` / `''` / `false` trap), and `??=` for lazy initialization, plus the operator-precedence rules that force parentheses.

Topics to cover:

- The senior question: what replaced the `if (obj && obj.user && obj.user.name)` guard in 2026 code. Three operators, each named for the bug class it eliminates:
  - **`?.`** — optional chaining. `obj?.user?.name` short-circuits to `undefined` if any link in the chain is `null` or `undefined`. The senior reflex: any access through a nullable reference reaches for `?.` first.
  - **`??`** — nullish coalescing. `value ?? fallback` returns `fallback` only if `value` is `null` or `undefined` — not on `0`, `''`, or `false`. This is the senior default over `||` for fallback values, because production data has legitimate falsy values that `||` would override.
  - **`??=`** — logical nullish assignment. `cache.value ??= computeExpensiveValue()` assigns only if `cache.value` is nullish. The conditional power tool past lazy-init triggers — initializing a memo, populating a missing field, defaulting a config property at runtime.
- Optional chaining surface, with the senior watch-outs:
  - **Property access**: `obj?.prop`, `obj?.['prop']` (bracket access on a nullable), `obj?.method?.()` (optional method call on a nullable method). The double `?.` on the method call is the trap — `obj?.method()` only guards `obj`, not `method`; if `obj` is non-null but `method` is undefined, this still throws. The senior reflex when both might be missing: `obj?.method?.()`.
  - **Array access**: `users?.[0]?.name`. The `noUncheckedIndexedAccess` flag (turned on in 1.4.3) makes `users[0]` return `User | undefined`, so the second `?.` is type-required, not just defensive.
  - **Function calls**: `callback?.(args)` calls `callback` if it exists and is callable, otherwise short-circuits. Used in optional event-handler patterns (`onClick?.(event)`).
  - **What `?.` doesn't catch**: it only checks the value immediately to its left. `obj?.user.name` does not protect against `user` being `null` — `?.` short-circuits if `obj` is nullish, but if `obj` exists and `user` is `null`, accessing `.name` still throws. The senior rule: place `?.` at every link in the chain that could legitimately be nullish.
  - **Left-hand side**: `obj?.prop = value` is a syntax error. Optional chaining cannot be used for assignment; the senior reflex when the target might not exist is an explicit `if (obj) obj.prop = value;` or `??=` for the missing-field case.
- Nullish coalescing surface:
  - **The trigger**: any default value where `0`, `''`, or `false` would be a legitimate value. `const pageSize = params.pageSize ?? 25` is correct; `const pageSize = params.pageSize || 25` is the bug where the user explicitly requested page-size 0 (or whatever 0 means in the domain).
  - **The exception where `||` is fine**: defaulting a string that has no legitimate empty value (`const label = title || 'Untitled'` — an empty title is the same as no title). The senior call: when in doubt, write `??` because `??` matches what `null` and `undefined` mean in the type system, while `||` matches falsy coercion which is a different question.
  - **Operator precedence**: TypeScript refuses to compile `a ?? b || c` and `a ?? b && c` without explicit parentheses, because the operator-precedence rules between `??`, `||`, and `&&` are ambiguous in the spec. The senior reflex: parenthesize when mixing.
- Logical nullish assignment surface:
  - **The trigger**: lazy initialization of a property or variable where overwriting an existing value would be wrong. `cache[key] ??= fetchExpensive(key)` is the canonical use — populate if missing, leave alone if present.
  - **The cousins**: `||=` and `&&=` exist as well. `||=` assigns on falsy (the same bug as `||`); `&&=` assigns when the value is truthy (a rare conditional). The course writes `??=` as the default and names `||=` once with the warning that the falsy case bites.
- TypeScript on the three operators. `?.` preserves the union with `undefined` in the resulting type. `??` narrows the result to the non-nullish branch's type. `??=` narrows the variable's type to the non-nullish result after the assignment. All three integrate with control-flow narrowing (taught in 2.4.7) so the IDE shows the correct type after the operator. The student writes a small example and watches the type narrow in the editor.
- One forward reference. Zod schemas with `.default()` (Unit 7.1) shift this kind of defaulting from runtime operators to the validation boundary in production code — but inside a function body, the three operators are the senior surface.

What this lesson does not cover:

- Truthy / falsy coercion in depth — named in 2.2.4 with the falsy list; this lesson cashes the rule in for `??` vs. `||`.
- Control-flow narrowing — 2.4.7.
- Zod `.default()` and schema-level defaulting — 7.1.
- The "Elvis operator" terminology (the historical name) — out of scope; the course names it "optional chaining."

Pedagogical approach:

Mechanics archetype with a Decision opening for the `??`-vs-`||` call. Open with a `ScriptCoding` block where the student computes a `pageSize` from a nullable `params.pageSize` using `||` (the bug fires when the test input is `0`) and then `??` (the fix). The wrong-then-right contrast is the lesson's seed — the student feels the bug class before reading the prose. Then a tight Mechanics walk through `?.`: a `ScriptCoding` block with a nested object where the student adds `?.` at each level and watches the result, including the `obj?.method?.()` double-guard case and the `users?.[0]?.name` array-access case. A small `CodeVariants` shows the four canonical patterns side by side — `obj?.prop`, `arr?.[i]`, `fn?.()`, `obj?.method?.()` — each labeled with its trigger. A `ScriptCoding` block exercises `??=` on a cache populate-if-missing example. Close with a `Buckets` exercise sorting eight expressions into "`?.`", "`??`", "`??=`", or "explicit `if`" — the student earns the reflex of picking the right operator. Optional `SandboxCallout` with a small `params` object and a default-extraction utility — the student plays with the operators on real-shaped data. No sandbox if the live coding has carried the lesson.

Estimated student time: 30 to 40 minutes.

---

## Lesson 2.2.6 — Destructuring as the API call-shape

Teaches object and array destructuring with rename, defaults, and rest, the signature-level destructure that React and server actions consume, and the destructure-then-rebuild pattern that prevents accidental field forwarding.

Topics to cover:

- The senior question: how do you extract three properties from a function's options-object argument without writing `options.orgId, options.customerId, options.dueAt` everywhere. The answer is destructuring, and in 2026 SaaS code it's not optional — every server action, every React component, every Drizzle row mapper destructures its input at the signature. The lesson teaches the form the rest of the course consumes.
- Object destructuring. The base form: `const { orgId, customerId } = invoice;`. The four extensions named with the trigger for each:
  - **Rename**: `const { orgId: organizationId } = invoice;` — when the property name clashes with a local binding or when the local name reads better than the property name. The senior watch-out: don't rename for cosmetics; rename when the rename earns its weight.
  - **Defaults**: `const { pageSize = 25 } = params;` — applies the default when the property is `undefined` (not `null` — same trap as parameter defaults). The default and rename can combine: `const { pageSize: size = 25 } = params;`.
  - **Rest**: `const { id, ...rest } = invoice;` — collects the remaining own enumerable properties into a new object. The senior trigger: splitting "the thing's identity" from "the thing's content" (`const { id, createdAt, ...fields } = row;` to map a database row, drop server-internal fields before sending to a client, or compose two objects with one's identity).
  - **Nested**: `const { customer: { email } } = invoice;` — destructures into the nested property. The senior watch-out: nesting past one level becomes unreadable; past one level, prefer destructuring at the call shallowly and accessing the rest by dot notation.
- Array destructuring. The base form: `const [first, second] = pair;`. The three patterns named:
  - **Tuple-like return values**: `const [value, setValue] = useState(initialValue);` — React hooks return tuples and destructuring is the consumer shape. Same for `useEffect`'s cleanup, `useReducer`, custom hooks that return paired values.
  - **Index-skipping**: `const [, , third] = array;` — when the caller only needs the third element. Rare in SaaS code; named once and moved on.
  - **Rest**: `const [first, ...rest] = items;` — the array equivalent of the object rest. Used in recursive list processing and inputs-vs-options patterns.
- Destructuring in function parameters. The form 2.2.2 previewed: `function createInvoice({ orgId, customerId, lineItems }: CreateInvoiceOptions) { ... }`. The senior call: destructure at the signature when every property is consumed by the function; keep the options object un-destructured when the function passes it through to another function. The destructured form is the dominant shape in React component props, server action handlers, and route handlers.
- The "destructure-then-rebuild" pattern, named for what it prevents. The bug it prevents: forwarding more than you meant to. The senior reflex: `const { secret, ...publicFields } = row; return publicFields;` makes "send everything except the secret" structurally enforced — adding a new sensitive column to the table doesn't accidentally leak it through this function, because the explicit destructure forces a decision. Used heavily in API serialization (preview for Unit 7.5).
- TypeScript on destructuring. The destructured locals inherit their types from the source (`const { orgId } = invoice;` types `orgId` as the property's type). The signature-destructured form is typed at the parameter (`function fn({ orgId }: { orgId: OrgId })` — the destructuring pattern doesn't carry its own type annotation; the annotation lives on the parameter itself). The senior watch-out: a common beginner mistake is `function fn({ orgId: OrgId })` thinking it's a type — that's actually a *rename* to a local called `OrgId`. The correct form is `function fn({ orgId }: { orgId: OrgId })`.
- The mutation-vs-binding clarification. Destructuring creates new bindings, not new copies — `const { items } = invoice;` binds `items` to the same array `invoice.items` references. Mutating `items.push(...)` mutates `invoice.items`. The lesson cashes in 2.1.1's mental model: destructuring is a series of `const items = invoice.items` bindings, not a deep clone.

What this lesson does not cover:

- Spread in object and array literals (the mirror of rest in destructuring) — 2.3.1 / 2.3.2 own the construction side.
- Object property shorthand and computed property names — 2.3.1.
- `Object.entries` / `Object.fromEntries` destructuring patterns — 2.3.1.
- Destructuring on iterators — 2.3.5 names the iterator surface.

Pedagogical approach:

Mechanics archetype. Open with the senior question and a `CodeVariants` showing the four canonical shapes side by side: base destructure, rename, defaults, rest. The student sees the surface in one block. Then a `ScriptCoding` block where the student writes a `createInvoice` server-action signature with destructured parameters and a default for `currency`, calls it with various argument shapes, and watches the destructuring fire. Another `ScriptCoding` walks the destructure-then-rebuild pattern on a row-to-API payload mapping — the student writes `const { secret, ...publicFields } = row;` and confirms the secret doesn't leak. A small `AnnotatedCode` walks the parameter-destructure type-annotation form, with the annotation pointing at the common beginner mistake (`{ orgId: OrgId }` as a rename rather than a type). Close with a `Tokens` exercise on a five-line function whose signature can be rewritten to a destructured form — the student picks the destructuring pattern that fits. Optional `SandboxCallout` for free play. No sandbox required.

Estimated student time: 30 to 40 minutes.

---

## Lesson 2.2.7 — Closures: lexical capture by reference

Teaches closures as lexical capture by reference (not by value), the stale-closure trap in async code, and the three production sites the model later explains: Server Actions, `useEffect` cleanups, and route-handler factories.

Topics to cover:

- The senior question: when a function returns another function and that inner function references a variable from the outer, what happens to the outer variable when the outer call returns. The 2026 answer: the inner function holds a reference to the outer variable's binding — the variable doesn't get garbage-collected because there's still a reference, and the inner function reads (and can write) the same binding every time it's called. This is closure, and the lesson names it for what it actually does: lexical capture by reference, not by value.
- The mechanics, walked once concretely. A factory function pattern: `function createCounter() { let count = 0; return () => count++; }`. Each call to `createCounter` produces a new closure with its own `count`; each call to the returned function increments *that* closure's `count`. The student writes the example, runs it twice with two different counters, and sees the independence — two boxes, two labels, the 2.1.1 mental model fires here.
- The capture-by-reference rule. Closures capture *the binding*, not the value at capture time. If the outer function reassigns the variable after the closure is created but before the closure is called, the closure sees the new value. This is the `for` loop's iteration-variable bug from 2.1.6, restated: `var i` is function-scoped, so every callback in the loop closes over the same `i`, which holds the final value by the time the callbacks run. `let i` is block-scoped per iteration, so each callback closes over a fresh binding. The lesson names the rule and references back to the 2.1.6 setup.
- Three places closures fire in production SaaS code, named so the student recognizes the model when they meet it:
  - **`"use server"` actions** (full treatment in 7.2). When a Server Action references an imported module's variable, the function captures that variable's binding at module-evaluation time — the request handler reads from the same binding every invocation. The senior anchor: this is why server-only imports inside a `"use client"` boundary fail at runtime (2.6.2's lesson), and why a server action's closure over a database client works even though the action is serialized across the wire. The student doesn't need to understand the full Next.js boundary yet; the closure model is what explains it when they meet it.
  - **`useEffect` cleanups** (full treatment in 4.9). The cleanup function captures the effect's local variables (event listeners, timeouts, subscriptions) so the cleanup can tear them down. This is the canonical "I set up a thing in render, I close over the teardown handle in the cleanup" pattern, and it's pure closure mechanics under the hood.
  - **Route-handler factories and middleware** (full treatment in 7.5 and 17.2). A `withAuth(handler)` wrapper returns a new handler that closes over the original. The wrapper pattern is closure — the inner function references the outer's parameter every invocation.
- The senior watch-out: stale closures in async code. When a closure captures a value that changes over time (a piece of state, a ref, a counter), the closure sees the binding's *current* value at call time, not its value at capture time. In React's `useEffect` with stale dependencies, this produces the canonical "my effect logs the wrong value" bug. The full treatment is in Unit 4.9; this lesson names the watch-out so the student has the vocabulary when they hit it.
- The memory-and-garbage-collection footnote. A closure that holds a reference to a large outer-scope variable keeps that variable alive for as long as the closure is reachable. In 2026 SaaS code this rarely bites — modern engines are good at collecting unreachable closures, and the patterns the course teaches don't create accidental retention. Named in one sentence so the student knows the cost exists.
- TypeScript on closures. The captured binding's type is what it was at capture time, with control-flow narrowing applied — if the outer scope narrowed `user: User | null` to `User`, the closure sees `User`. The exception is mutable bindings: if the outer scope reassigns the variable in a later branch, the closure's type is the broader union (TS doesn't track post-capture reassignments for the closure's view). The lesson names this once and moves on; the full narrowing treatment is in 2.4.7.

What this lesson does not cover:

- The `useEffect` / `useCallback` / `useMemo` API surface — 4.8 / 4.9.
- Server Actions and the `"use server"` directive in depth — 7.2.
- Memoization patterns and the lodash-style `memoize` — out of scope; React's hooks own the surface.
- Currying as a pattern (the historical functional-programming form) — named in passing; rarely the senior's first reach in 2026 SaaS code, where options-objects supersede currying for most use cases.

Pedagogical approach:

Concept archetype. The lesson teaches a mental model with three production payoffs named at the end. Open with the `createCounter` factory example as the load-bearing snippet — a `ScriptCoding` block where the student creates two counters and watches them tick independently. The cause-and-effect is the lesson; the prose explanation follows. A small interactive diagram — an SVG inside a `Figure`, or a custom widget — shows two outer-function call frames each pointing at their own `count` binding, with the inner function's arrow pointing into the frame. The student sees the model visually after they've felt it in code. Then a `ScriptCoding` block walks the capture-by-reference rule with a deliberate reassignment after capture — the closure sees the new value, the student predicts and confirms. A small reference block names the three production patterns (Server Actions, `useEffect` cleanups, route-handler factories) in one paragraph each, with a forward reference to the lesson that owns each. Close with a `PredictOutput` exercise on three closure snippets — a counter factory, a loop with `let` vs. `var`, and a stale-closure trap — the student predicts the output for each. No sandbox; the mechanics are tight enough that the live coding carries the lesson.

Estimated student time: 35 to 45 minutes.

---

## Lesson 2.2.8 — Quizz

Top ten topics to quiz:

1. The senior default for function form in 2026 SaaS code (arrow expressions bound to `const`) and the conditional triggers for `function` declarations (hoisting, named recursion, type-guard narrowing signatures).
2. The two-positional-parameter rule and the options-object pattern past it.
3. Default parameters firing on `undefined` but not `null` (the same trap as `??` vs. `||`).
4. Naming for intent — picking the domain-noun name over the implementation-leaking name (`usersById` vs. `userMap`).
5. The boolean-prefix convention (`is`, `has`, `can`, `should`) and the negated-name reflex (`isPaid`, not `isNotPaid`).
6. Guard clauses and early returns — refactoring a nested-pyramid `if` into a flat sequence.
7. `switch` with `noFallthroughCasesInSwitch` and the `assertNever` exhaustive-check pattern.
8. `??` over `||` for default values, with the `0` / `''` / `false` legitimate-value trap.
9. The destructure-then-rebuild pattern (`const { secret, ...publicFields } = row;`) and what bug class it prevents.
10. Closures as capture-by-reference, with one of the three production-pattern recognitions (Server Action, `useEffect` cleanup, route-handler factory).

---

## Total chapter time

Roughly 220 to 290 minutes across the seven teaching lessons plus the quiz. The chapter splits naturally across four evenings — function forms and parameter shapes (2.2.1 + 2.2.2) as one sitting, naming and control flow (2.2.3 + 2.2.4) as the second, the null-safe operators and destructuring (2.2.5 + 2.2.6) as the third, and closures plus the quiz as a short fourth. The student finishes able to write a function whose name reads, whose signature is precise, whose body is flat, and whose closure behavior they can defend on a code review. Chapter 2.3 (Objects, arrays, and collections) lands directly on this floor — every later iteration method, every Set/Map call, every iterator helper is consumed through the function and destructuring shapes the student now writes by reflex.
