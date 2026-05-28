# Lesson 2 — Classes, narrowly

- **Title (h1):** Classes, narrowly
- **Sidebar label:** Classes, narrowly

## Lesson framing

This is the chapter's most decision-heavy lesson. The student already knows: `Result<T, E>` (ch 008 L1), custom `Error` subclasses with literal `name` discriminants (ch 008 L2), discriminated unions (ch 005 L1), branded IDs (ch 005 L4), modules as the grouping primitive (ch 006). The senior question this lesson answers is **"when does a `class` declaration earn its weight in 2026 SaaS code?"** — and the answer is "rarely". The lesson installs a *decision filter* (three triggers) and a *minimum surface* (what to ship when a class earns it).

Pedagogical posture:

- **Trigger before tool.** Lead with the three legitimate triggers, then the surface. The student should leave with "do I have a trigger?" as the first reflex, "what's the minimum shape?" as the second. Reflect this in the section ordering — refusal list comes *after* the triggers and surface so the contrast is concrete.
- **Anti-pattern as foil.** Open with the `class UserService` smell the new contributor reaches for, since the student's prior-language muscle memory (Java, C#, Python) often pulls that way. The lesson's job is to replace that reflex with "module of functions over a typed record."
- **Functional-first, not anti-class.** The lesson is not a screed against OOP — it carves out three legitimate uses and refuses the rest. Tone: pragmatic, not ideological.
- **Concrete code over abstract principle.** Every trigger gets a concrete canonical example tied to a real SaaS seam: `BillingError` (Stripe-shaped), `BillingClient` (Stripe SDK wrapper), `Cart` (the rare stateful domain object). These ride into Unit 12.
- **Continuity-aware.** The Error-subclass shape was installed in ch 008 L2; here we *connect* it to the broader class-trigger taxonomy and add the SDK-wrapper and stateful-domain triggers as two new uses, not three from scratch. Reuse the `BillingError` / `TenancyError` names from L2 continuity.
- **Cognitive load.** The class surface in TS has many primitives (constructor, fields, getters, setters, static blocks, abstract, decorators, mixins, parameter properties). Don't enumerate every primitive then label allowed/refused. Instead, *show only the minimum surface* first (constructor + `readonly` + `#private` + arrow-field + `static` factory), then a short refusal list explaining what's deliberately absent. The student's working memory carries five primitives, not fifteen.
- **No re-teaching.** Ch 008 L2 already covered the canonical `Error` subclass shape — recall it as the first trigger with a one-line restatement and a pointer; don't re-derive it.

Target end state — the student can:

1. Answer "should this be a class?" by walking the three-trigger filter.
2. Author the minimum-surface class when a trigger fires.
3. Recognize the four anti-patterns (`UserService` namespace, inheritance hierarchy, accessor surprise, TS-only `private` leak) on PR review.
4. Wrap a third-party SDK in an adapter class that hides the vendor type from the rest of the app.

## Lesson sections

### Introduction (no header)

Open with the concrete smell: a new contributor opens a PR introducing `class UserService` with five methods (two `static`, one losing `this` inside a `.map`). Frame the lesson's load-bearing claim: **2026 SaaS code is records and functions by default; `class` is a carve-out with three named triggers.** Name the three triggers in one sentence each so the student has the map before they read the body:

1. Custom `Error` subclasses (already familiar from ch 008 L2).
2. Third-party SDK adapter wrappers.
3. The rare stateful domain object.

Close with: "Everything else is a function over a typed record." Keep this short — 4–5 sentences. The student needs the lay of the land, not the philosophy.

### When a class earns its weight

The chapter's load-bearing decision filter. Walk each of the three triggers in turn, each as a short prose paragraph (no h3). Pedagogical goal: install the trigger as a *concrete pattern*, not an abstract category. For each, name (a) what state or behavior makes it a class, (b) the canonical example on this stack, (c) why a record + function can't do the job.

- **Trigger 1 — Custom `Error` subclasses.** One-paragraph recall from ch 008 L2: `class ValidationError extends Error` works because the runtime *expects* `Error` as the throwable contract, and the literal `name` field is the discriminant. Pointer back, no re-derivation. Trigger is *runtime contract dictated by the platform*.
- **Trigger 2 — Third-party SDK adapter wrappers.** Stripe ships a `Stripe` class; the application wraps it in `class BillingClient` to (a) hide the vendor type, (b) centralize construction (apiKey, apiVersion, defaults), (c) expose application-shaped methods (`createCheckoutSession`, not `stripe.checkout.sessions.create`). Trigger is *centralize SDK state across calls and present an application-shaped surface*.
- **Trigger 3 — The rare stateful domain object.** A long-lived in-memory entity with invariants enforced by methods. Canonical example: a `Cart` that totals itself. Be explicit about the rarity — in this stack, *state lives in Postgres, Zustand, or React state*. Most "stateful objects" the student is tempted to write are domain *records*; this trigger fires for genuine in-memory aggregates with method-enforced invariants (think token-bucket rate limiter, an in-memory cache wrapper). Trigger is *long-lived in-memory state with invariants*.

Visual aid: use **`StateMachineWalker` with `kind="decision"`** to make the trigger filter interactive. The student walks the senior decision tree once and lands on a recommendation (one of the three triggers, or "use a module of functions"). This earns its weight because the decision tree *is* the lesson — the student commits to a path one question at a time, exactly the muscle memory we want. Sketch:

```
Q1: Does the runtime contract require an Error subclass?
  → yes → Leaf "Custom Error subclass" (link to ch 008 L2)
  → no  → Q2
Q2: Are you wrapping a third-party SDK to centralize state and present an app-shaped surface?
  → yes → Leaf "SDK adapter wrapper"
  → no  → Q3
Q3: Long-lived in-memory state with invariants only methods can enforce?
  → yes → Leaf "Stateful domain object — and reconsider once more"
  → no  → Leaf "Module of typed functions over a record (the default)"
```

The final leaf is the load-bearing one — by walking the filter, "module of functions" arrives as the *default*, not the omission. Set `title="Does this earn a class?"`.

### Why records and functions are the default

Short section (~2 paragraphs). Pedagogical goal: ground the trigger filter in the two concrete failure modes that drove the 2026 shift away from class-everything.

- **Failure mode 1: `this` binding.** Methods detach from `this` when passed as callbacks. The class fix is arrow-field methods, but arrow fields break inheritance and balloon memory (one closure per instance). The function-over-record alternative has *no `this` to lose*. Tiny illustrative snippet using `Code` (no annotation needed) — three lines showing `users.map(svc.normalize)` losing `this`.
- **Failure mode 2: Class instances don't cross the wire.** Reference ch 009 L1: `JSON.stringify` drops methods and `#fields`. Server Components, Server Actions, RSC payload — all serialize records, not classes. A class instance crossing the network boundary arrives stripped. Records + functions match the SSR / Server Action shape the course will teach.

One `Aside` (`type="tip"`): record + module function is *also* what makes server/client splits trivial — the function lives in `lib/users.ts`; the record type lives next to the schema; nothing needs `'use client'` until React state enters.

### The minimum class surface

When a trigger fires, ship only these primitives. This section is the "tool" half of the trigger-before-tool pair. Pedagogical goal: keep the surface small enough the student can hold it in working memory.

Five primitives, named in order — each as a short subsection or a tight prose paragraph:

1. **`constructor` with one options-object parameter.** Two positional args max, then options object (continuity from §Function form). Keep the constructor body thin — assignment only.
2. **`readonly` on every field not mutated after construction.** Default is `readonly` everywhere unless mutation *is* the lesson (see Cart example).
3. **`#private` (hash-private), not TS `private`.** This is the load-bearing distinction. TS `private` is erased at compile and accessible via bracket notation at runtime; `#private` is enforced by the runtime and survives the compile. Use `#private`.
4. **Arrow-field methods only when detachment matters.** Default is regular methods (one prototype copy, cheap, fine). Reach for `handle = (x) => {...}` arrow-field shape when the method is detached — passed as a callback, stored in a Map, attached as an event listener. Regular method everywhere else.
5. **`static` factory methods for non-trivial construction.** When multiple construction paths exist (`fromJson`, `fromRow`), make them `static`. Constructor stays one shape.

Use **`AnnotatedCode`** for this section. The single code block is a complete `BillingClient` class showing all five primitives in one place. Each `AnnotatedStep` highlights one primitive and explains it. Keep `maxLines={20}` if needed; if longer, split into two annotated blocks. The block must use the SDK-wrapper canonical example (continuity with Trigger 2 above and Unit 12). Sketch:

```ts
import 'server-only';
import Stripe from 'stripe';

type CheckoutInput = { priceId: string; customerId: string; successUrl: string };
type CheckoutSession = { id: string; url: string };

export class BillingClient {
  readonly #stripe: Stripe;

  constructor(options: { apiKey: string }) {
    this.#stripe = new Stripe(options.apiKey, { apiVersion: '2026-04-22.dahlia' });
  }

  createCheckoutSession = async (input: CheckoutInput): Promise<CheckoutSession> => {
    const session = await this.#stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: input.priceId, quantity: 1 }],
      customer: input.customerId,
      success_url: input.successUrl,
    });
    return { id: session.id, url: session.url ?? '' };
  };

  static fromEnv(env: { STRIPE_KEY: string }): BillingClient {
    return new BillingClient({ apiKey: env.STRIPE_KEY });
  }
}
```

Use the current Stripe `apiVersion` value `'2026-04-22.dahlia'` (the May-2026 current). Note for the writer: if the SDK's published types pin a different literal, defer to the SDK — the lesson is about the *class shape*, not the API version string.

Annotation steps (one per primitive):

- Step 1 (constructor, options-object) — `meta="{8-10}"`, color `blue`.
- Step 2 (`readonly #stripe`) — `meta={`{6} "readonly" "#stripe"`}`, color `green`. Call out *both* `readonly` (compile-time field immutability) and `#stripe` (runtime-enforced privacy).
- Step 3 (arrow-field method) — `meta={`{12-19} "createCheckoutSession ="`}`, color `orange`. Explain "this method is called as a callback in Step 4's lifecycle, so we arrow-field it" — or just "arrow-field preserves `this`; we reach for it when detachment is likely".
- Step 4 (`static fromEnv`) — `meta={`{21-23} "static"`}`, color `violet`. Why this beats a second constructor signature: readability at the call site (`BillingClient.fromEnv(env)`).
- Step 5 (`import 'server-only'`) — `meta="{1}"`, color `red`. The wrapper carries a secret; the file must never ship to the client. Forward-pointer to ch 010 / Unit 9 — don't expand.

After the annotated block, one short paragraph on **module-level singletons**: when a wrapper has no per-request state, export a configured instance: `export const billing = BillingClient.fromEnv(env)`. Per-request instance only when the wrapper carries request-scoped state (rare).

### What the surface refuses

Short list section. Pedagogical goal: explicitly name the primitives the student *won't* find in 2026 SaaS code, with a one-line "why" each. The refusal list is short and curated — not every primitive in the spec, only the ones the student's prior language pulls them toward.

Render as `<Buckets>`? Reconsider — this section is more "labeled list" than "drag-and-drop classification." A simple prose list with bolded primitive names is cleaner. Keep as prose.

Six refused primitives:

1. **Class inheritance hierarchies beyond `extends Error`.** Composition over inheritance — the LSP traps and brittle-base-class problem don't pay for themselves. The alternative is a discriminated union (ch 005 L1) or composition via interface satisfaction.
2. **`abstract class`.** TS-only marker, no runtime guard. Reach for a type and a discriminated union instead.
3. **Mixins.** `Object.assign(C.prototype, M)` gymnastics. The cure is composition.
4. **Decorators.** Stage 3 since TypeScript 5.0 (2023), spec-stable; widely used in NestJS / TypeORM. The SaaS stack the course teaches (Next.js + Drizzle + Better Auth) doesn't reach for them. Named once, dismissed for this stack — *not* "decorators are bad" but "this stack doesn't need them."
5. **Getters / setters (`get x()` / `set x(v)`).** They look like field reads but execute code; the surprise is the cost. Plain methods (`getX()`, `setX(v)`) when computed access is needed.
6. **Class expressions (`const C = class { ... }`).** Anonymous classes complicate stack traces. Always `class C { }`.

One paragraph follows summarizing the principle: the senior reach is *the smallest surface that makes the trigger work*. Every refusal is a `Term` candidate or a one-line aside, not a section unto itself.

Embed a short **`MultipleChoice`** at the end of this section to lock the trigger filter. Single-correct shape, with a `class UserService { ... }` snippet as one of the wrong answers, the `BillingClient` shape as the right answer.

```mdx
<MultipleChoice>
  Which of these earns a `class` declaration on this stack?

  <McqChoice>
    A grouping of related read helpers (`getUser`, `listUsers`, ...) that the
    feature module exports.
  </McqChoice>

  <McqChoice correct>
    A wrapper around the Stripe SDK that hides the vendor type, centralizes
    `apiKey` + `apiVersion`, and exposes app-shaped methods.
  </McqChoice>

  <McqChoice>
    A `User` data shape with fields and a `formatName` derived value.
  </McqChoice>

  <McqWhy>
    The SDK adapter wrapper is the second of the three legitimate triggers. Read
    helpers are a module of functions; a record + a function over it covers the
    `formatName` case without a class.
  </McqWhy>
</MultipleChoice>
```

### `#private` and the runtime privacy story

A focused subsection on the one primitive most likely to trip the student: TS `private` vs `#private`. Pedagogical goal: install the runtime-vs-compile-time distinction concretely. This is a watch-out that earns its own short section because the failure mode (a "private" field leaking through bracket access) is structural, not stylistic.

Use **`CodeVariants`** with three tabs:

- **Tab 1 — TS `private` (the leak):** `class C { private secret = 'x' }` plus a call site reading `instance['secret']` (works at runtime). Label as `TS private` with red `del=` framing on the bracket-access line that shouldn't work.
- **Tab 2 — `#private` (the fix):** Same class with `#secret`, same bracket-access call site — `SyntaxError` at parse time and `TypeError` if reached via reflection. Label as `#private (preferred)`.
- **Tab 3 — Subclass collision:** Brief illustration that two unrelated classes can both define `#secret` without colliding (per-class scope), while TS-`private` fields share a string namespace and can shadow on inheritance. Label as `Subclass safety`.

Six lines of prose per tab max. After the variants, one `Aside` (`type="note"`): hash-private is enforceable runtime privacy, the only privacy `JSON.stringify` actually respects (drops it). Pointer back to ch 009 L1's "class instances drop their `#fields` and methods on the wire" observation.

### Putting it together — the stateful domain object

A short worked example for Trigger 3, the rarest of the three. Pedagogical goal: show what a *real* class-worthy domain object looks like, so the student can compare it against the "should this be a class?" cases that don't qualify. This section is short because the trigger itself is rare.

Use a single `Code` block (no annotation needed; it's a worked example, not a walkthrough) showing a `Cart` class. The implementation must use a `totalCents()` *method* (not a getter) to stay coherent with the refusal list one section earlier; and must implement `toJSON()` to ride the connection back to L1 — the wire shape is the explicit `{ lines, totalCents }` record, the class earns its weight in memory.

```ts
type CartLine = { sku: string; quantity: number; unitPriceCents: number };

export class Cart {
  readonly #lines = new Map<string, CartLine>();

  addLine(line: CartLine): void {
    const existing = this.#lines.get(line.sku);
    const merged = existing
      ? { ...existing, quantity: existing.quantity + line.quantity }
      : line;
    this.#lines.set(line.sku, merged);
  }

  removeLine(sku: string): void {
    this.#lines.delete(sku);
  }

  totalCents(): number {
    let total = 0;
    for (const line of this.#lines.values()) {
      total += line.quantity * line.unitPriceCents;
    }
    return total;
  }

  toJSON(): { lines: CartLine[]; totalCents: number } {
    return { lines: [...this.#lines.values()], totalCents: this.totalCents() };
  }
}
```

Note the deliberate divergence from the §Function form rule (which says "default parameters fire only on undefined" and would default to arrow-functions for callbacks): here `addLine`, `removeLine`, `totalCents`, and `toJSON` are *all* regular methods because none are passed as callbacks. Call this out in the prose ("note we use regular methods, not arrow fields — the methods are always called as `cart.method()`").

One short paragraph after the block: this class earns its trigger because (a) the `#lines` Map is private state, (b) the invariant "lines are deduplicated by SKU" lives in the method, not the data, (c) the wire shape is the `toJSON()` record. None of these survive a refactor to "module of functions over a `Map<string, CartLine>`" — or rather, you *can* refactor it that way, but you have to hand-thread the Map and the invariant becomes a discipline rather than a guarantee.

Close the section by noting this is rare. Most "stateful domain objects" the student is tempted to write are records the app stores in React state or Postgres.

### Equality, `instanceof`, and the cross-realm trap

Compact section recalling and extending the `instanceof` discussion from ch 008 L2. Pedagogical goal: lock the "name discriminant, not `instanceof`" rule and pivot it to the non-Error case.

- **Reference equality.** `===` on two class instances is identity, not value equality. Two `Cart` instances built from the same data are not equal. The cure for "I keep needing instance equality" is to use a record (not a class).
- **`instanceof` and realms.** Recall the cross-realm trap from ch 008 L2. For `Error` subclasses, the `name` literal discriminant is the durable check. For non-error classes (the two other triggers), the boundary is usually a serialization seam where the class is reconstructed anyway, so `instanceof` is fine *within* a realm. The senior reflex: write `instanceof` for in-realm narrowing on `BillingClient`-style wrappers; reach for `name` discriminants on errors that cross boundaries.

Use a `Term` for *realm* (recall from ch 008 L2 in the tooltip) and `Term` for *literal type discriminant* (concept defined in ch 005 L3 if applicable).

### Watch-outs

Closing checklist. Render as a `<Aside type="caution">` block with a short bullet list. Pedagogical goal: collect the five most likely PR-review findings into one place so the student carries a checklist away. Keep to five — discipline over completeness.

1. `private` (TS) is erased at runtime; reach for `#private` everywhere privacy actually matters.
2. Passing `instance.method` as a callback strips `this`. Use `instance.method.bind(instance)` or — better — arrow-field the method at declaration.
3. `static` methods don't see instance fields. Common copy-paste bug from instance to static.
4. `JSON.stringify(instance)` drops methods and `#fields`. Implement `toJSON()` explicitly if the wire shape matters (back-pointer to ch 009 L1).
5. Using a class to "group related functions" is a smell. The module is the grouping primitive.

### Final reality-check (interactive)

End the lesson with a **`TrueFalse`** round (4–5 statements) to lock the decision filter. Five candidates:

- "A `UserService` class with five static methods is the senior shape for a feature's read helpers." → **False** (module + functions).
- "`JSON.stringify` on a class instance preserves `#private` fields." → **False** (drops them; `toJSON` is the seam).
- "`extends Error` is the only inheritance the SaaS stack reaches for." → **True**.
- "`readonly` and `#private` mean the same thing." → **False** (`readonly` is compile-time field-immutability; `#private` is runtime-enforced visibility).
- "Arrow-field methods (`handle = () => {}`) are the right reach when the method is passed as a callback." → **True**.

Include `<TfWhy>` on each statement — short rationale, no new content.

### External resources (optional)

Two `ExternalResource` cards at the very end:

- TC39 [Class fields proposal](https://github.com/tc39/proposal-class-fields) — the source of `#private` semantics.
- MDN [`#private` fields reference](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Private_elements).

## Tooltips (`Term` candidates)

Strategic — only terms that recall a prior concept or define a load-bearing new one:

- **realm** — short tooltip recalling ch 008 L2 ("an isolated JS execution context: an iframe, a Worker, a `vm` sandbox; cross-realm values fail `instanceof`").
- **arrow-field method** — first time it's named in the course; short tooltip ("class field whose value is an arrow function; `this` is bound to the instance at construction").
- **hash-private** — first time named here; tooltip ("the `#name` field syntax; runtime-enforced visibility, can't be read via bracket access or reflection").
- **module-level singleton** — short tooltip ("a single configured instance exported from a module — `export const billing = ...`; the rest of the app imports the instance, never the class").
- **prototype chain** — short tooltip if used (likely in the `instanceof` discussion).

Do not Term-define every primitive; reserve for non-obvious recalls.

## Scope

### What this lesson teaches

- The three legitimate triggers for `class` on this stack.
- The minimum class surface (`constructor`, `readonly`, `#private`, arrow-field, `static` factory).
- What the surface refuses and why (inheritance hierarchies, `abstract`, mixins, decorators, accessors, class expressions).
- TS `private` vs `#private` and the runtime privacy story.
- The `Cart`-style stateful domain object as the rarest trigger, with `toJSON` as the wire seam.
- `instanceof` equality and the cross-realm trap (recall + extension from ch 008 L2).

### What this lesson does NOT teach

- The `Error` taxonomy, `name` discriminants, `cause` chains, `ensureError` — **ch 008 L2** (recall only).
- Discriminated unions as the alternative to inheritance — **ch 005 L1** (name once as the alternative).
- Branded IDs as the type-level alternative to wrapper classes — **ch 005 L4** (name once).
- Module patterns for grouping functions, `verbatimModuleSyntax` — **ch 006** (assumed prerequisite).
- The Stripe SDK at depth, the three-method `lib/billing/` interface — **Unit 12** (use `BillingClient` as the canonical example shape but don't expand the Stripe surface).
- Decorators (Stage 3) — named once, dismissed; not taught.
- React class components — gone in the React 19 surface; **ch 023+** owns the function-component model.
- DI containers (`InversifyJS`, `tsyringe`) — out of scope; not part of the SaaS stack.
- ES2022 `static {}` initialization blocks — niche; not taught.
- `Object.create(null)` for prototype-free records — out of scope (named once in the chapter outline; cut here as a niche the student doesn't need yet).
- `JSON.stringify` semantics for class instances at depth — **ch 009 L1** (recall the "drops methods and `#fields`" fact only).
- Custom `toJSON()` design at depth — **ch 009 L1 owed it as a debt; this lesson pays it off in the `Cart` example**, but does not generalize to a "always implement `toJSON`" rule.
- Server / client module boundaries (`'use server'`, `'use client'`, `'server-only'`) — **Unit 4 / ch 006**; named in the `BillingClient` example but not taught.
- Equality of records via deep equality / `structuredClone` — **ch 001 L1** (assumed prerequisite, named once as the cure for "I keep needing instance equality").

### Prerequisites the student already has

- Custom `Error` subclasses with literal-typed `name` and `cause` (ch 008 L2).
- `Result<T, E>` two-channel error contract (ch 008 L1).
- Discriminated unions and `assertNever` (ch 005 L1, L3).
- Modules as the grouping primitive, named exports default (ch 006).
- Branded IDs (ch 005 L4).
- `JSON.stringify` semantics for class instances (ch 009 L1, the prior lesson).
- `readonly`, `as const`, `satisfies` (Unit 1 prior chapters).
