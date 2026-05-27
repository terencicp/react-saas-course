# Lesson 4 — Dynamic keys: index signatures and Record<K, V>

- **Title**: Dynamic keys — index signatures and Record<K, V>
- **Sidebar label**: Dynamic keys

## Lesson framing

Lessons 1–3 covered scalar values (primitives, literal unions, four corners), named-field object shapes (`type` + `?` + `readonly`), and positional records (tuples with labels). This lesson installs the **third object shape**: objects with **dynamic keys** — the cache, the lookup table, the JSON-from-the-wire payload — and the senior reflex for picking between an **index signature** and a **`Record<K, V>` utility type**.

The lesson is a **decision archetype** with a small mechanics anchor. The mechanics are tiny: two forms (`{ [key: string]: V }` and `Record<K, V>`), interchangeable when `K` is `string`, divergent when `K` is a literal union. The decision is the lesson: **open keys → index signature (or `Record<string, V>`); finite keys → `Record<LiteralUnion, V>`**, because the literal-union form is the one that gives the **completeness check** and the **safe read** (no `| undefined` under `noUncheckedIndexedAccess`).

Three production realizations anchor everything:

1. **Three shapes, three correct types.** The student needs to type a cache keyed by user ID (genuinely open), a status-to-label lookup (finite, known at design time), and a JSON object parsed from the wire (open, plus values unknown). One form for all three is a vocabulary failure. The lesson splits the cases.
2. **The completeness payoff.** A `Record<'draft' | 'sent' | 'paid', string>` whose initializer is missing `'paid'` is a compile error at the literal site. The same payload typed as `{ [key: string]: string }` accepts the missing key silently — and the bug surfaces at the read site, three components away, as a label that displays the raw status string. The literal-union `Record` turns runtime "missing key" bugs into design-time errors.
3. **The `noUncheckedIndexedAccess` divergence.** Under the strict tsconfig from chapter 003, an index-signature read returns `V | undefined`. A `Record<LiteralUnion, V>` read returns `V` directly — every key in the union is guaranteed present, so the type checker doesn't widen. The two payoffs (compile-time completeness + read-side narrowing) are why the senior reach is `Record<LiteralUnion, V>` whenever the keys are finite.

The lesson keeps the **bug-anchor → rule → mechanics → exercise** rhythm the chapter has established. The student leaves able to read both forms in library types (Drizzle row return shapes, `next-intl` messages, Better Auth's session shape) and **author** the right one in their own code — and able to defend the call between the two in one sentence.

Cognitive build:

1. The three-shapes scenario in the introduction — caches, lookup tables, JSON payloads. The senior question lands without naming the answer yet.
2. The two forms — `{ [key: string]: V }` and `Record<K, V>`. Side-by-side, interchangeable for `K = string`.
3. The literal-union payoff — `Record<'draft' | 'sent' | 'paid', V>`. The completeness check + the read-side narrowing.
4. The `noUncheckedIndexedAccess` divergence — index-signature reads return `V | undefined`; `Record<LiteralUnion, V>` reads return `V`. Show both type pins.
5. The mixed shape — known fields plus an open dynamic surface. Recognition-only, with the per-field constraint named.
6. Existence checks — `in` and `obj[key] !== undefined`. Brief, the full narrowing surface lands in lesson 6.
7. Closing exercise: a `Buckets` exercise sorting six dynamic-keyed shapes into the two forms.

Pedagogical reflex throughout: **the senior call is the lesson; the syntax is the floor**. Both forms exist in TypeScript; the question is which one a senior reaches for, and why. The student leaves with one sentence on the call: "open keys, index signature; finite keys, `Record<LiteralUnion, V>` — that's where the completeness check and the safe read live."

The student should leave able to:

- Read `{ [key: string]: V }` and `Record<K, V>` and name the difference (or note when they're interchangeable).
- Type a cache, a status-to-label lookup, and a parsed JSON payload — three different shapes, three different correct types.
- Explain why `Record<LiteralUnion, V>` is the senior reach for finite keys (completeness at write, no `| undefined` at read).
- Use `in` (or `obj[key] !== undefined`) as the existence check on an index-signature object.

## Lesson sections

### Introduction (no heading)

Open with the three-shapes scenario. One short paragraph naming the situations the student will type today: a cache keyed by user ID (`'usr_01j…'` → user record), a status-to-label lookup (`'draft' | 'sent' | 'paid'` → display string), and a JSON payload parsed from the wire (arbitrary keys, arbitrary values). All three are objects with **dynamic keys** — the keys aren't declared up front like `id` or `email` from lesson 2.

Show one tiny `Code` block to anchor the scenario:

```ts
const userCache = {
  'usr_01j8aa': { id: 'usr_01j8aa', email: 'a@x.com' },
  'usr_01j8ab': { id: 'usr_01j8ab', email: 'b@x.com' },
};

const statusLabels = {
  draft: 'Draft',
  sent: 'Sent',
  paid: 'Paid',
};
```

Ask the implicit senior question in one paragraph: **three shapes, three correct types — but which type for which shape, and why?** Reaching for the same form for all three is a vocabulary failure; the student who does that ships subtle bugs (silently-missing keys in lookups, type errors at the read site of the cache). The lesson splits the cases.

One short bug-anchor paragraph: a lookup table typed too loosely lets a missing key slip past at write time, then surfaces as a broken label at the read site. A cache typed too tightly forces casts everywhere reads happen. The two forms — the index signature and `Record<K, V>` — exist precisely because the cases are different. Pick the right one and the bugs are caught where they happen; pick the wrong one and they migrate three components away.

Close the intro with a one-sentence preview: the lesson teaches both forms, the literal-union form (the completeness payoff), and the `noUncheckedIndexedAccess` divergence that makes the literal-union form the senior reach whenever the keys are finite.

Keep this section tight: one code block and three short paragraphs.

### The two forms: index signature and Record<K, V>

**Goal:** the student leaves able to read both forms and knows they're interchangeable when `K` is `string`.

Open with the bare syntax in one paragraph. An **index signature** is an object-type member that says "every key of this type maps to a value of this type": `{ [key: string]: User }`. The `key` is the **label** (the same all-or-nothing labeling rule from lesson 3's tuples — pure documentation, surfaced in tooltips); the `string` is the **key constraint**; the `User` is the **value type**. The `Record<K, V>` utility type is the same idea wrapped in a generic: `Record<string, User>`.

Use a `CodeVariants` with two tabs to make the side-by-side concrete:

- **Tab 1: "Index signature — `{ [key: string]: User }`"** — show the form, type a `userCache` against it, and add one literal that compiles. Prose: this is the form a senior reaches for when the dynamic surface coexists with named fields (the next section) or when reading legacy types.

  ```ts
  type UserCache = { [userId: string]: User };

  const userCache: UserCache = {
    'usr_01j8aa': { id: 'usr_01j8aa', email: 'a@x.com' },
    'usr_01j8ab': { id: 'usr_01j8ab', email: 'b@x.com' },
  };
  ```

- **Tab 2: "Record — `Record<string, User>`"** — the same `userCache` typed with `Record`. Prose: identical at the type-system level. **The course writes `Record<string, V>` for legibility** — the generic reads "object whose keys are strings, whose values are `V`" without the bracket syntax's noise.

  ```ts
  type UserCache = Record<string, User>;

  const userCache: UserCache = {
    'usr_01j8aa': { id: 'usr_01j8aa', email: 'a@x.com' },
    'usr_01j8ab': { id: 'usr_01j8ab', email: 'b@x.com' },
  };
  ```

After the variants, one paragraph stating the equivalence explicitly: `{ [key: string]: V }` and `Record<string, V>` are **interchangeable** at the type-system level for `K = string`. The senior call is legibility — `Record<string, V>` reads first, so prefer it unless the index-signature syntax is needed for a mixed shape (covered later).

One brief `Aside type="note"`: the `Record` form generalizes — its first parameter can be any `PropertyKey` (a `Term` candidate: "the union `string | number | symbol`; the set of types a JavaScript object key can take"). The numeric-key form (`Record<number, V>`) is rare in SaaS code (arrays cover most cases); the symbol-key form is rarer still. The lesson uses `string` throughout and names the others in one line.

Pedagogical note: keep the section terse — two tabs, two short paragraphs, one aside. The point is recognition and interchangeability for `K = string`, not depth.

`Term` tooltip candidates in this section:

- **index signature** — "An object-type member that declares the type of every dynamic key. Syntax: `{ [keyName: KeyType]: ValueType }`. The `keyName` is documentation; the constraint is the `KeyType`."
- **`Record<K, V>`** — "Utility type for objects whose keys are of type `K` and values of type `V`. With `K = string`, equivalent to an index signature; with `K` a literal union, requires every key to be present."
- **`PropertyKey`** — "Built-in type for any valid object key: `string | number | symbol`."

### Record<LiteralUnion, V> and the completeness payoff

**Goal:** the student leaves with the rule — **finite keys live in a `Record<LiteralUnion, V>`** — and the completeness check that earns the rule.

Open with the second of the three scenarios from the intro: the status-to-label lookup. The keys aren't open — they're `'draft' | 'sent' | 'paid'`, the same literal union from lesson 1. Type the lookup with `Record<string, string>` and the type system can't tell whether `'paid'` is present; type it with `Record<'draft' | 'sent' | 'paid', string>` and the missing-key error fires **at the value's definition site**, the literal site where excess-property checks (lesson 2) fire. That's the senior payoff.

Use an `AnnotatedCode` walkthrough on a single block to step the student through three states. The shared code is a `statusLabels` constant typed three ways; the steps highlight what the type system catches at each.

```ts
type Status = 'draft' | 'sent' | 'paid';

// Form 1: Record<string, string> — accepts anything, catches nothing
const labelsLoose: Record<string, string> = {
  draft: 'Draft',
  sent: 'Sent',
  // 'paid' missing — no error
};

// Form 2: Record<Status, string> — every key must be present
const labelsStrict: Record<Status, string> = {
  draft: 'Draft',
  sent: 'Sent',
  // @ts-expect-error — 'paid' missing
};

// Form 3: Record<Status, string>, complete
const labels: Record<Status, string> = {
  draft: 'Draft',
  sent: 'Sent',
  paid: 'Paid',
};
```

`AnnotatedStep` breakdown (each step highlights one of the three forms with `color`):

1. **Form 1 (`Record<string, string>`)** — `color="red"`. The type accepts any keys; `'paid'` is missing and TypeScript stays quiet. Prose: this is the bug the lesson prevents. The student who reaches for `string` here ships the missing-key silently.
2. **Form 2 (`Record<Status, string>`, incomplete)** — `color="orange"`. The literal-union key forces every member of the union to appear in the literal. The `// @ts-expect-error` line marks the missing `'paid'` — the compiler error fires at the value site. Prose: this is the **completeness check** the literal-union form earns. The error lands where the value is defined, not three components away when something tries to read `labelsStrict.paid`.
3. **Form 3 (complete)** — `color="green"`. All three keys present, no error. Prose: shipping shape. The same coverage rule will fire again whenever a teammate adds a new status to the union — every `Record<Status, V>` initializer in the codebase becomes a compile error until they all add the new key. That's a feature.

After the walkthrough, state the rule in one sentence in its own paragraph: **if the keys are finite and known at design time, type the object as `Record<LiteralUnion, V>` — the literal-union form is the senior reach whenever the union is known.** Same posture as lesson 1's literal-union rule for primitives, applied to keys.

One short `Aside type="tip"`: when the literal union grows (a new status, a new locale, a new permission), every `Record<LiteralUnion, V>` initializer becomes a compile error pointing at the missing key. That's the desired refactor surface — the type system finds every site you need to update, no grep required.

Pedagogical note: the `AnnotatedCode` walkthrough is the right tool here because the three forms share the same shape and the lesson is the **divergence between them**. Three separate `Code` blocks would scatter the comparison; one walkthrough keeps the eye on the differences.

### The noUncheckedIndexedAccess divergence

**Goal:** the student leaves with the second payoff — the literal-union form reads without `| undefined`; the open form reads with it.

Open with one short paragraph naming the flag. The chapter 003 strict tsconfig (built out in lesson 5 of chapter 024) ships with `noUncheckedIndexedAccess: true`. That flag changes how index reads are typed: under the strict default, **any read through an index signature returns `V | undefined`** — TypeScript no longer assumes the key is present just because the type says every key maps to a `V`. The literal-union `Record<K, V>` reads return `V` directly because every key in the union is **guaranteed** present.

Use a `CodeVariants` with two tabs to make the divergence visible at the type level. Both tabs use `^?` comments (which Expressive Code renders as inline type pins via the `twoslash` reader — or, simpler for static MDX, just label the inferred type in a trailing comment).

- **Tab 1: "Open keys — `string | undefined` at the read site"** — index-signature or `Record<string, V>` read.

  ```ts
  const userCache: Record<string, User> = {};

  const u = userCache['usr_01j8aa'];
  //    ^? User | undefined
  ```

  Prose: under `noUncheckedIndexedAccess`, the read returns `User | undefined` regardless of whether the key looks "obvious." The senior reflex is to narrow the result before using it (`if (u) { ... }`, full narrowing surface in lesson 6).

- **Tab 2: "Finite keys — narrow type at the read site"** — `Record<LiteralUnion, V>` read.

  ```ts
  type Status = 'draft' | 'sent' | 'paid';
  const labels: Record<Status, string> = {
    draft: 'Draft',
    sent: 'Sent',
    paid: 'Paid',
  };

  const status: Status = 'draft';
  const label = labels[status];
  //    ^? string
  ```

  Prose: the read returns `string` directly. Every key in the `Status` union is guaranteed present (the completeness check from the previous section), so the type system doesn't widen to `| undefined`. **No narrowing required at the read site** — the literal-union form pays off at both ends.

After the variants, one paragraph stating the senior call explicitly: **use `Record<LiteralUnion, V>` when the keys are finite and known; use `Record<string, V>` (or the index signature) when the keys are open.** The two forms are interchangeable at the type-system level when `K = string`; the divergence appears when `K` is a literal union, and the divergence is what earns the senior reach.

One short `Aside type="caution"`: a `Record<LiteralUnion, V>` read using a key typed as `string` (rather than as `LiteralUnion`) reverts to the `| undefined` shape — the type system can't prove the `string` is actually a member of the union. Type the key variable as the union, not as `string`, or narrow before the lookup. (Foreshadows lesson 6's narrowing surface.)

Pedagogical note: this is the central section of the lesson. The `^?` notation should appear in the prose as the conventional "the inferred type is" syntax (don't pre-teach Twoslash machinery; the line-comment form is enough). The two tabs carry the load; everything else supports.

### Mixed shapes: known fields plus a dynamic surface

**Goal:** the student leaves able to read `{ name: string; [key: string]: string | number }` and knows the per-field constraint that mixed shapes impose.

Open with one paragraph: occasionally a type has both **named fields** (lesson 2's territory) and a **dynamic surface** (this lesson's territory) on the same object — a serialized config with a `name` field plus arbitrary string/number values, an event payload with a `type` discriminant plus arbitrary metadata. The index-signature syntax is the form that admits the combination; `Record<K, V>` doesn't have a slot for named fields, so the mixed shape lives in the index-signature form.

Show one short `Code` block:

```ts
type Metadata = {
  name: string;
  createdAt: string;
  [key: string]: string | number;
};

const m: Metadata = {
  name: 'project-alpha',
  createdAt: '2026-05-26T10:00:00Z',
  retries: 3,
  region: 'us-east-1',
};
```

After the block, state the constraint in one sentence: **every named field's type must be assignable to the index signature's value type.** If the index signature is `string | number` and a named field is `boolean`, the type errors at the named field's declaration — TypeScript enforces that the dynamic surface covers every named field too.

Use a `CodeTooltips` (one fence, two tooltipped substrings) to surface the constraint inline. Highlight the index-signature line and one named field; tooltips name what the constraint says and why.

One brief `Aside type="note"`: mixed shapes are rare in 2026 SaaS code — the senior reach is usually to split the type into a named-field section and a `Record`-typed metadata field (`{ name: string; metadata: Record<string, string | number> }`), which keeps the named fields free of the index-signature constraint. Mention the split form in one line; recognize the mixed form when reading library types.

Pedagogical note: keep this section short. It's recognition-only, with one short rule. The exercise at the end of the lesson doesn't test this — it's a library-reading affordance.

### Reading dynamic-keyed objects: existence checks

**Goal:** the student leaves with two ways to check whether a dynamic key is present — `in` and `obj[key] !== undefined` — and knows the full narrowing surface lands in lesson 6.

Open with one paragraph: every read through an index signature under `noUncheckedIndexedAccess` returns `V | undefined`. To use the value, the student narrows. Two narrowing forms cover the common cases.

Use a tight `Code` block with both forms side-by-side as comments:

```ts
const cache: Record<string, User> = {};

// Form 1: the `in` operator — narrows the cache type, value type unchanged
if ('usr_01j8aa' in cache) {
  const u = cache['usr_01j8aa'];
  //    ^? User (narrowed)
}

// Form 2: undefined check on the read — narrows the value
const u = cache['usr_01j8aa'];
if (u !== undefined) {
  // u is User here
}
```

After the block, two short rules, one per paragraph:

- **`in` is the existence-check reflex.** It tests whether the key is a property of the object — what the language ships for "does this key exist." Pair with the narrowing it earns: the read on the same key inside the `if` block is typed as `V`, not `V | undefined`.
- **`obj[key] !== undefined` is the value-existence reflex.** Slightly different intent — it tests whether the value is present and not the literal `undefined`. Under `noUncheckedIndexedAccess` either form narrows the read correctly.

One short `Aside type="note"`: the full narrowing surface — `typeof`, `instanceof`, `Array.isArray`, discriminant equality, custom type predicates — lives in lesson 6. The two forms shown here are the dynamic-keyed-object subset.

Pedagogical note: this section is a hook for lesson 6. Don't over-teach; show the two forms and move on.

### Decide which form to reach for

**Goal:** the student leaves able to defend the call between the two forms in one move.

A `Buckets` exercise (two columns) sorting six dynamic-keyed shapes into the two forms. The bucket choices are:

- **Index signature / `Record<string, V>`** — open keys, no design-time enumeration.
- **`Record<LiteralUnion, V>`** — finite keys, every member known at design time.

Items (six total, mix of clear and subtle):

1. Cache from user ID → user record — **`Record<string, User>`**. User IDs are open.
2. Status → display label, where statuses are `'draft' | 'sent' | 'paid'` — **`Record<Status, string>`**. Finite keys.
3. Arbitrary JSON parsed from a third-party webhook — **`Record<string, unknown>`**. Open keys, unknown values (the `unknown` reach from lesson 1).
4. HTTP method (`'GET' | 'POST' | 'PUT' | 'DELETE'`) → handler function — **`Record<Method, Handler>`**. Finite keys.
5. i18n messages keyed by locale, where the locale set is the project's known list (`'en' | 'es' | 'fr'`) — **`Record<Locale, Messages>`**. Finite keys.
6. Drizzle row lookup table keyed by primary key (UUID) — **`Record<string, Row>`**. Keys are open (UUIDs); the value is the typed row from `$inferSelect`.

Wrap the `Buckets` in `instructions` explaining the call rule once: "Sort each shape by **whether the keys are finite and known at design time**."

One paragraph after the exercise summarizing the senior reflex in one move: **finite keys → `Record<LiteralUnion, V>`** (compile-time completeness + safe reads); **open keys → `Record<string, V>` or an index signature** (narrow the read with `in` or `!== undefined` before using it). One rule, two cases.

Pedagogical note: the `Buckets` exercise is the canonical-sort install. The mix of clear cases (1, 2) and subtle ones (3, 6 — both open keys but for different reasons) makes the student think rather than pattern-match. The two-column layout keeps the contrast visible.

### External resources

Three `ExternalResource` cards in a `CardGrid` at the end:

- **TypeScript Handbook — [Index Signatures](https://www.typescriptlang.org/docs/handbook/2/objects.html#index-signatures)** — the official treatment, terse and accurate.
- **TypeScript Handbook — [The Record Type](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)** — `Record<K, V>` reference in the utility-types section.
- One current 2026 piece on dynamic keys / `Record` / `noUncheckedIndexedAccess` — the lesson writer should pick a live, recent (2025–2026) link from a credible source (Total TypeScript, Matt Pocock, 2ality, or similar). **Don't link an outdated piece**; if no current resource fits, drop the third card. The first two cards carry the load.

Optionally consider a `VideoCallout` for one of:

- Matt Pocock or Andrew Burgess on `Record` vs. index signatures — one short clip (≤10 minutes) reinforcing the senior call. Only include if a current (2025+) clip exists; don't link a 2020 video.

Pedagogical note: the chapter has established the pattern of three `ExternalResource` cards. Hold to the pattern; if the third slot doesn't have a current resource, drop it rather than reach for a stale one.

## Scope

**The student already knows (don't re-teach):**

- Objects with **known field names**, `type` as the default, the `?` and `readonly` modifiers (lesson 2 of chapter 004). Reference the lesson; don't re-derive.
- Tuples and the positional-record shape (lesson 3 of chapter 004). Out of scope here; the dynamic-keyed object is the third shape, distinct from the tuple.
- The seven primitives, literal unions, `unknown`, and the four corners (lesson 1 of chapter 004). The `Record<LiteralUnion, V>` rule **reuses** lesson 1's literal-union rule for keys — reference it, don't re-state.
- Excess-property checks (lesson 2 of chapter 004). The completeness check on `Record<LiteralUnion, V>` rhymes with excess-property checks (both fire at the literal site); reference the connection, don't re-teach.
- Arrays, `for...of`, `Object.entries` (chapter 003). The lesson uses arrays in examples without re-teaching.
- Strict tsconfig is on (`strict`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax` — chapter 003 and chapter 024 lesson 5). The lesson **uses** `noUncheckedIndexedAccess` as a load-bearing assumption; name the flag, don't re-derive.
- `Map<K, V>` vs. `Record<K, V>` at the runtime level (chapter 003 lesson 4). The type-level summary is one line in this lesson; the runtime distinction is assumed.

**Reserved for later lessons (don't pre-teach):**

- **Unions and intersections (`|`, `&`).** Lesson 5 of chapter 004. The lesson uses one `string | number` in the mixed-shape example; one short cross-reference, no formal teaching.
- **Narrowing surface.** Lesson 6 of chapter 004. The lesson shows `in` and `!== undefined` as the dynamic-keyed-object subset; the full surface (`typeof`, `instanceof`, `Array.isArray`, discriminant equality, custom predicates) is reserved.
- **`as const` and `satisfies`.** Lesson 7 of chapter 004. The lesson doesn't reach for either; if a `Record<LiteralUnion, V>` typed-config example tempts the writer toward `as const satisfies`, hold — that's lesson 7's territory.
- **Annotation-vs-inference rule and `import type` discipline.** Lesson 8 of chapter 004. The lesson uses `: Record<...>` annotations on `const` declarations; don't formalize the rule.
- **Mapped types** (`{ [K in keyof T]: ... }`). Reserved for lesson 6 of chapter 005 alongside the utility-type surface. The lesson uses `Record<K, V>` as a built-in utility; doesn't derive it from a mapped type.
- **`keyof` and `typeof` operators.** Reserved for lesson 5 of chapter 005. The lesson references neither — typed keys here come from a hand-declared literal union, not derived from a value's `keyof`.
- **Branded keys** (`UserId` vs. `OrgId` at the type level). Mentioned in lesson 1 of chapter 004 as a forward link; built out in lesson 4 of chapter 005. The lesson uses raw `string` for IDs in cache examples; don't reach for the brand.
- **Discriminated unions.** Seeded in lesson 5 of chapter 004; built out in lesson 1 of chapter 005. Out of scope here.
- **Drizzle row return shapes as `Record`-typed surfaces.** Mentioned in one line as a forward link; full treatment in Unit 5.
- **Better Auth session and `next-intl` messages typed via module augmentation.** Mentioned in one line as forward links; full treatment in lesson 4 of chapter 006.

**One-line mentions only (named, not taught):**

- **`Record<number, V>` and `Record<symbol, V>`** — named in one line in the two-forms section as rare variants; the lesson uses `string` keys throughout.
- **`PropertyKey`** — defined inline as a `Term` tooltip in the two-forms section ("`string | number | symbol`"). One-line mention.
- **The split-into-metadata-field pattern** for mixed shapes — named in one line in the mixed-shapes section as the senior reach when both named fields and a dynamic surface coexist.
- **`Map<K, V>` at the runtime level vs. `Record<K, V>` at the type level** — one-line cross-reference to chapter 003 lesson 4. Don't re-teach.
- **Drizzle row return shapes as `Record`-shaped** — one-line forward link to Unit 5.
- **Module augmentation for Better Auth session and `next-intl` messages** — one-line forward link to lesson 4 of chapter 006.
- **The full narrowing surface (lesson 6)** — one-line forward link in the existence-checks section.
