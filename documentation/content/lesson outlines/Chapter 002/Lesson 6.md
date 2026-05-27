# Lesson 6 — Destructuring as the API call-shape

## Title and sidebar

- **Title (h1):** `Destructuring as the API call-shape`
- **Sidebar label:** `Destructuring`

## Lesson framing

This is the sixth lesson of Chapter 002 (Functions, naming, and control flow). The previous five lessons installed the function form (arrow `const`), the options-object pattern past two params (L2), intent-revealing names (L3), flat control flow (L4), and the null-safe operator trio (L5). This lesson is the syntactic close on the function-shape spine: **destructuring is how the options-object pattern from L2 actually gets consumed**, and it's also the call-shape every Server Action and React component the student will write past Unit 3 expects.

### Pedagogical conclusions (lesson-wide)

- **Decisions before syntax — frame as bug-prevention, not feature surface.** Destructuring is well-trod ground; what gives the lesson senior weight is the two failure modes the form prevents: wholesale-forwarding leaks and missed-rename shadowing. The lesson opens with both bugs and earns the syntax by fixing them.
- **The signature-level destructure is the headline shape.** Not "destructuring exists, here are six forms." The student leaves writing `function createInvoice({ customerId, amountCents = 0 }: CreateInvoiceInput)` by reflex because that's the literal shape every Server Action, every React component, and every options-object helper they'll write in the rest of the course uses.
- **Build the form incrementally; the four extensions are variations on one base.** Rename, default, combined, and rest are the same `{ key }` syntax with one additional piece each. Use four small adjacent code samples around the *same* input object so the only thing that changes across the samples is the variation.
- **Destructure-then-rebuild is the structural lesson, not a tip.** This is the pattern that prevents a `password` field from leaking from a form submission to an audit log or to a third-party API call — a real 2026 SaaS bug. It earns a full subsection with a before/after, not a parenthetical mention.
- **Anchor every semantic to a prior lesson.** Defaults fire only on `undefined` — same rule as L2 parameter defaults. Nested destructure throws on nullish — fix it with `?.` from L5. Rest destructure picks fields by name, never by position — the natural companion to L2's "options-object means callers don't depend on order." The student should feel like the chapter is converging, not branching.
- **Array destructuring earns one tight section.** Two daily reaches (positional unpacking and the head-and-rest split). It's load-bearing for `useState` and `Object.entries` later, but secondary to the object form for SaaS data. Don't over-weight it.
- **Forward links are one sentence each.** React props in Ch 022, Server Action input in Ch 030 L4, `useState` tuple destructure in Ch 023. The course later doesn't re-explain the form — it's decided here.
- **No video.** The L5 lesson already shipped a `TSPlaygroundCallout` for the parens-required syntax. Destructuring doesn't have a comparably tight live-playground moment — the bugs land best in static before/after fences. The closing `Buckets` exercise from the chapter outline is right; it tests recognition across "valid / wrong / throws at runtime" which is the discipline the lesson installs.
- **Pedagogical style established by L1–L5.** Adult-terse, no celebratory tone, lesson opens with two bugs from one root, principles named once in bold, anchors back to prior lessons via `Term` and inline references. Match it.

## Lesson sections

### Introduction (no heading)

State the lesson's center in the first paragraph: destructuring is the syntactic form 2026 SaaS code uses to *consume* an options-object parameter, and the wrong reflex around it ships two bugs.

Set up both failure modes side-by-side:

1. **Wholesale-forward leak.** A function receives `options` and passes the whole object downstream (e.g. to an audit log, a third-party SDK, a database insert). A future field added upstream silently leaks downstream. This is the bug that retires when the team destructures exactly the fields it forwards.
2. **Rename shadowing.** A React component destructures a prop with rename to avoid a naming clash with an outer binding (`const { name: customerName } = props`). Get the rename wrong and the renamed variable silently shadows the wrong outer binding, or — worse — fails to shadow and the body reaches a stale variable.

State what the lesson installs: object destructuring with its four extensions (rename, default, combined, rest), array destructuring for its two daily reaches, the signature-level destructure as the canonical Server Action / React prop shape, and the destructure-then-rebuild pattern as the structural fix for the wholesale-forward leak.

Anchor: this lesson is the syntactic close on the options-object pattern from "Signatures that stay readable past two parameters" (L2) — destructuring is how those options-object parameters get *consumed*. Reference L2 by lesson name in prose.

### Object destructuring and its four extensions

Open with the base form against a small `customer` object reused across the section. Establish the input once so the variations below only change one thing each:

```ts
const customer = {
  id: 'cust_123',
  name: 'Alex',
  email: 'alex@example.com',
  pageSize: 0,
};
```

Then introduce the base form: `const { name, email } = customer`. One sentence on what it desugars to (two `const` assignments by key) — that's the entire mental model.

Use a `CodeVariants` block with four tabs, each holding one fenced block applied to the same `customer` object and a short prose explanation of *the trigger* — when each variation is the right reach. Tab labels and content:

- **Rename** — `const { name: customerName } = customer`. Trigger: the outer scope already binds `name` (which would shadow), or the local context wants a more specific name than the field name. Note that the syntax reads backwards from object-literal shorthand — left of `:` is the field name in the source, right of `:` is the local binding being created. The course flags this explicitly because it's the part students mis-read.
- **Default** — `const { pageSize = 20 } = customer`. Trigger: the field may be missing and you have a sensible substitute. Same nullish-vs-undefined semantic as L2 parameter defaults — fires **only on `undefined`**, not on `null`, `0`, `''`, `false`. Reference the L5 `??`-vs-`||` table once. (Anchor: with the `customer` object above where `pageSize: 0`, the default does *not* fire — `0` is preserved.)
- **Combined rename + default** — `const { pageSize: limit = 20 } = customer`. The senior form when local naming and default are both wanted. State the read order in one sentence: **rename first, then default applies to the renamed binding.** Show that the default expression sees the renamed identifier (`limit`), not the original field name (`pageSize`).
- **Rest** — `const { id, ...rest } = customer`. Trigger: pull a few fields out by name, collect the others into a new object. Single most common 2026 use: omit a single field before forwarding (covered in depth in the destructure-then-rebuild section below). One sentence: `...rest` must be the *last* element in the pattern.

Color convention reaffirmed from L2/L5: this section is informational, no orange/green pairing. The colored variants come back in the destructure-then-rebuild section.

After the variants, add one tight `MultipleChoice` (single-correct) that pins the rename direction — the part students get wrong on first contact. Give a pattern like `const { foo: bar } = obj` and ask which name now lives in the local scope and which name was in the source. The point is to lock the left/right reading.

### Array destructuring: the two daily reaches

One short section. Open with the form: `const [first, second] = arr`. The companion: holes for skipping (`const [, second] = arr`) and head-and-rest (`const [head, ...tail] = arr`).

Frame array destructuring as **the position-aware sibling** of object destructuring. Where object destructuring picks by name and is order-independent, array destructuring binds positions. State the trigger plainly: reach for array destructuring when the data is *meaningfully ordered* — a `useState` return value (state, setter), an `Object.entries` pair (key, value), an HTTP method tuple. Don't reach for it on a plain array of records where position carries no semantic.

One small `Code` block showing the three forms against a fixed input:

```ts
const pair = ['admin', true];
const [role, isActive] = pair;
const [, isActive2] = pair;
const [first, ...rest] = ['a', 'b', 'c'];
```

Forward-link in one sentence each: `useState` in Ch 023 returns a tuple students destructure positionally; `Object.entries` in Ch 003 yields `[key, value]` pairs that array-destructure inside `for...of`. Name these once; the form is decided here.

Use a single `Aside` (note) flagging that array destructuring is **less common than object destructuring in SaaS code** — most domain data is shaped (records), not positional. The reason to learn it is the React hooks surface in Unit 3.

### Signature-level destructure: the canonical 2026 shape

The headline shape of the lesson. One full snippet, marked as canonical, showing the literal form every Server Action and React component will use. Use `CodeTooltips` over one fence so the student can hover the parts they haven't formally seen yet (the inline object-type annotation, the `?` modifier) without breaking the lesson flow.

```ts
const createInvoice = ({
  customerId,
  amountCents,
  notes = '',
}: {
  customerId: string;
  amountCents: number;
  notes?: string;
}) => {
  // body reads the same names as the call site
};
```

Tooltip targets:
- `customerId: string;` → "Inline object-type annotation — defined inline at the parameter. Full mechanics in the chapter on TypeScript object shapes."
- `notes?:` → "The `?` marks the field as optional in the type. Field-level defaults fire only on `undefined`, same rule as L2 parameter defaults."
- `notes = ''` → "Field-level default — fires only when the caller omits the field or passes `undefined`."

Make the three payoffs explicit in prose immediately after the block:

1. **Names match the call site.** The caller writes `createInvoice({ customerId, amountCents })`; the body reads the same identifiers. No mental remap.
2. **Adding a field never breaks existing callers.** Field-order is irrelevant on the consumer side because the destructure picks by name.
3. **Defaults live at the signature.** The body never starts with `const notes = options.notes ?? ''` boilerplate — the default is at the field.

Then a short paragraph: **this is the shape every options-object function in this course will write.** React component props are this. Server Action input is this. Drizzle query builders take this. Forward-link each in one sentence (Ch 022 React props, Ch 030 L4 Server Action input, Unit 5 Drizzle helpers).

End with the body-vs-signature destructure call in two sentences (per chapter outline): **signature destructure is the senior default for API-shaped functions.** Reach for body destructure (`const { x, y } = options;` on the first line) only when the original `options` reference needs to stay in scope for logging, forwarding, or repeated reference. Don't dwell.

### Destructure-then-rebuild: the no-accidental-forwarding pattern

The structural fix for the wholesale-forward leak from the intro. This is the section that earns the lesson its place — every other section above is mechanics; this is the discipline.

State the principle once, in bold: **when forwarding data to a downstream call, destructure exactly the fields needed and rebuild the object literal that goes downstream. Never forward the original object wholesale.**

Walk a worked before/after using `CodeVariants` with two tabs and the green/orange color convention reaffirmed from L2/L5:

- **Orange — wholesale forward leaks `password`.** A `signUp` handler receives form submission data (`{ name, email, password, marketingOptIn }`) and forwards the whole object to `auditLog.record(input)`. The audit log now stores the password in plaintext. The bug isn't visible at the call site — the leak is in the field nobody named explicitly.

  ```ts
  const signUp = (input: SignUpInput) => {
    db.insert(usersTable).values(input);
    auditLog.record(input); // leaks password
  };
  ```

- **Green — destructure to the exact downstream shape.** Pull the fields needed for each downstream call into the literal that goes there. `auditLog.record({ email, name })` cannot receive `password` because the developer didn't write it into the object.

  ```ts
  const signUp = ({ name, email, password, marketingOptIn }: SignUpInput) => {
    db.insert(usersTable).values({ name, email, password });
    auditLog.record({ name, email });
  };
  ```

Make the structural point in one paragraph after the variants: a new field added upstream **cannot reach the downstream call without the developer choosing to destructure it.** This is the same principle as L2's options-object — make the surface area visible at the call site — applied to the *return* side. The form is structural enforcement: no `password` leak is possible from this shape.

Add a second use of the `...rest` extension, now in its load-bearing application: omit a specific field and forward the rest deliberately. One short block:

```ts
const { password, ...safeFields } = user;
return safeFields;
```

Frame this as the canonical "strip a sensitive field" idiom. Anchor: this is the form a real audit-log helper or a "send user to client" serializer takes. Forward-link in one sentence to Server Actions in Ch 030 — the same principle applies to which fields are passed to Drizzle's `insert()`.

### The nested-destructure watch-out

One short subsection. The bug: `const { profile: { address: { city } } } = user` throws if `profile` or `address` is nullish. Show the throwing form and the fix.

```ts
// Throws if user.profile is nullish:
const { profile: { address: { city } } } = user;

// Safer reach: optional chaining from L5.
const city = user.profile?.address?.city;
```

Frame the rule in one sentence: **the course writes shallow destructures by default and reaches for `?.` from the previous lesson for nullable paths.** Nested destructure as a *form* is legal and sometimes the right call, but past one level of nesting the reader cost spikes and the `?.` form usually reads better. Forward link this back to L5's `?.`-overuse-trap discussion: pick the form that matches the type's nullability story.

### Closing exercise — recognize the forms

Close the lesson with the `Buckets` exercise from the chapter outline. Two columns (`twoCol`), three categories:

- **Valid** — syntactically correct destructure that won't throw on the given input.
- **Syntactically wrong** — would not parse / TypeScript rejects.
- **Throws at runtime** — parses but throws when the input field is nullish.

Six chip items (one fenced code each) covering the distinctions the lesson installed:

1. `const { name, email } = customer` — valid (base form).
2. `const { profile: { address } } = user` where `user.profile = null` — throws at runtime.
3. `const { name = 'Anon' } = { name: '' }` — valid; default does *not* fire on `''` (anchors the nullish semantic).
4. `const { ...rest, id } = customer` — syntactically wrong; rest must be last.
5. `const { id: , name } = customer` — syntactically wrong; rename needs an identifier on the right.
6. `const { customer: { id } = {} } = order` where `order.customer` is `undefined` — valid; the intermediate default `= {}` saves the nested access.

The categorization confirms the three pieces of the model: form, semantics, and runtime safety.

### External resources

Match the L5 pattern (four cards, matching the senior-default sources). Suggested:

- **MDN — Destructuring assignment.** Canonical reference for object and array forms.
- **MDN — Default parameters.** Cross-reference for the "fires only on `undefined`" semantic that backs the destructure default.
- **TypeScript handbook — Object types** (destructure in function parameters section). Where the signature-level form is documented at language depth.
- **Biome — `noShadow`** rule. The build-time backstop for the rename-shadowing failure mode from the intro. (Verify the exact rule name during fact-check.)

## Scope

### Out of scope (covered elsewhere)

- **`?` optional modifier and inline object-type literal depth.** Covered in Ch 004 L2. Here it's *read* via `CodeTooltips`, not derived.
- **Type-level narrowing through destructured nullable fields.** Defer to Ch 004 L6 (narrowing).
- **`?.` and `??` operator semantics.** Just installed in L5 — referenced, not re-explained.
- **Rest parameters at the signature** (`...args`) and call-site spread. Covered in L2 — distinct from object destructure rest (`...rest` in `{ id, ...rest }`). Mention the distinction in one sentence only if it threatens to confuse; the contexts are different enough that it's usually fine to leave alone.
- **React props in JSX form.** Forward link to Ch 022.
- **Server Action `FormData` parsing** and Zod input shape. Forward link to Ch 030 L4.
- **`useState` array destructure** mechanics and hook conventions. Forward link to Ch 023.
- **Destructuring inside assignment expressions** (the parens-required `({ a, b } = obj)` form). One-line mention or skip entirely — rare in modern code per chapter outline.
- **Symbol-keyed destructure and property descriptors.** Niche; skip entirely.
- **Complex assignment patterns** (e.g., destructure inside `for...of` of an object's entries). Defer to Ch 003 if it lands at all.

### In-scope, briefly

- The `customer`/`order`/`invoice`/`auditLog` seed domain continues from L2/L3/L4/L5 — keep it.
- The two-positional-parameter rule and options-object pattern from L2 are the *justification* for signature destructure; reference by lesson name, don't re-explain.
- The "defaults fire only on `undefined`" rule from L2 is reused at field-level — say it once with the L2 reference, don't re-derive.
- The `?.` form from L5 is the right reach for nullable nested paths — reference and move on.
