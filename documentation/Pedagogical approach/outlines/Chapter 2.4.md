## Concept 1 — The widest type that compiles is a bug class

**Why it's hard.** Students learn TypeScript as "annotations on values" and reach for the widest type that compiles. `status: string` typechecks; so does `payload: any`. The misconception is that the type system did its job because the file compiles. It didn't — the type was just wide enough to permit the bug.

**Ideal teaching artifact.** A misconception-first ambush. Open with two near-identical snippets — `status: string` and a literal-union `status: 'draft' | 'sent' | 'paid'` — and ask the student which of four call sites *should* fail to compile. The student predicts before reading prose. Both compile under the wide type; only the literal-union version catches `'pendng'`, the typo a real codebase shipped. Same ambush for the `any` form: a `payload: any` that silently swallows a `null` and crashes a downstream `.length` read. The artifact is a Concept-archetype prediction round that *trains the reflex* "the type isn't right just because it compiles."

**Engagement.** A `PredictOutput` round across both snippets where the student picks which call sites pass type-check, then sees the literal-union form catch what the wide form let through.

**Components.**
- `PredictOutput` for the four-call-site prediction pair (one for `status: string`, one for the literal union; same for `any` vs. `unknown`).
- `CodeVariants` for the side-by-side after the reveal — same call sites, narrower type, the typo now red.

---

## Concept 2 — The four corners and the trigger for each

**Why it's hard.** `any`, `unknown`, `never`, and `void` look like four flavors of "no real type" to the junior eye. The senior reads them as four distinct positions in the type lattice, each with one production trigger. Mixing them — using `any` where `unknown` was right, returning `void` where `undefined` was meant — is the bug class.

**Ideal teaching artifact.** A Reference-archetype four-quadrant card with one trigger per corner, paired with a sorting drill. The card shows each corner as a short box: name, one-sentence position in the lattice (top/bottom, escape/sound), the one trigger that earns it. No survey, no exhaustive list of behaviors. The drill is where it lands: the student receives eight real values from a SaaS codebase (a JSON body from `fetch`, a `catch` binding, a function that always throws, a callback for `forEach`, a third-party SDK return with no types, an impossible discriminant branch, a Zod-parsed object, an `addEventListener` handler) and sorts each into the corner that fits.

**Engagement.** The `Buckets` sort *is* the recall moment — six lanes (`primitive`, `literal union`, `unknown`, `never`, `void`, `needs a brand`), eight value cards, drag once. Follow-up `MultipleChoice` confirms one tricky case: "this function always throws — what's its return type?"

**Components.**
- `Figure` wrapping a hand-SVG four-quadrant lattice diagram (top vs. bottom, sound vs. unsound) — one image, used once, no forward-link to other chapters, so it stays inline SVG, not a bespoke component.
- `Buckets` for the eight-value sort.
- `MultipleChoice` for the `never` follow-up.

---

## Concept 3 — `type` always, `interface` only for declaration merging

**Why it's hard.** Codebases mix both. Every junior dev has read three Stack Overflow answers giving three different rules. The student needs one rule plus one exception, internalized so deeply that they don't think about it again.

**Ideal teaching artifact.** A Decision-archetype one-page comparison: a two-column table where the left column is "what `type` does" (objects, unions, intersections, primitives, tuples, generics, conditionals, mapped) and the right is "what `interface` does" (object shapes, classes, declaration merging). The asymmetry is the lesson — `type` is a superset of `interface`'s reach plus the one thing `interface` does that `type` can't: merge. The exception lands as a single concrete preview: a `declare module 'better-auth'` block extending `Session`. The student doesn't write declaration merging in this chapter — they recognize the trigger and trust the default.

**Engagement.** A short `MultipleChoice`: five real codebase situations ("typing a route handler's body," "extending Drizzle's relation type," "a union of payload shapes," "a class's constructor argument," "a third-party `Session` shape to add an `orgId`") — pick `type` or `interface`. The merge case is the only `interface` answer.

**Components.**
- `Figure` wrapping a hand-authored asymmetric comparison table — used once, no forward-link, stays static.
- `MultipleChoice` for the five-scenario drill.

---

## Concept 4 — `?` vs. `| undefined` under `exactOptionalPropertyTypes`

**Why it's hard.** Most students believe `field?: string` and `field: string | undefined` are the same thing. Under strict tsconfig they aren't, and the difference bites at `'key' in obj`, at `Object.keys`, and at form-payload serialization. The compiler can teach this if the student sees the divergence on the same value.

**Ideal teaching artifact.** A controllable two-pane comparison. Left pane: an object typed `{ email?: string }`. Right pane: an object typed `{ email: string | undefined }`. Below, four operations the student toggles: assign `{ email: undefined }`, read `'email' in obj`, run `Object.keys(obj)`, serialize with `JSON.stringify`. Each toggle produces a labeled "does it compile / what's the runtime" badge per pane. The student sees the two types diverge at every operation. This is a Mechanics-archetype side-by-side that the existing toolkit half-covers — the static comparison fits `CodeVariants`, but the per-operation toggle is what makes the distinction stick.

**Engagement.** A `Dropdowns` exercise: five field-modifier scenarios with three blanks each — student fills in `?`, `| undefined`, or both, and the resulting `'key' in obj` and `Object.keys` behavior auto-resolve.

**Components.**
- Primary: `CodeVariants` with two tabs (the `?` form, the `| undefined` form), each tab showing the same four operations and outputs. Read-only but pedagogically sufficient.
- Alternative: a new bespoke `OptionalityComparator` widget. Single-use in this chapter with no forward-link — demoted; `CodeVariants` carries the load.
- `Dropdowns` for the follow-up recall.

---

## Concept 5 — `readonly` binds the field, not the value

**Why it's hard.** Students who learned `const` from 2.1.6 already know "the binding is locked, the value isn't." `readonly` on a field repeats the same shape one level deeper — and students still mis-extrapolate it as deep immutability. The bug they ship: a `readonly user` whose `user.name` got mutated downstream.

**Ideal teaching artifact.** A pair of "what compiles / what doesn't" snippets driven by a Mechanics-archetype walk: assign to the readonly field (fails), reassign a nested property (compiles), push into a `readonly T[]` (fails), push into a nested array (compiles). The same shape as 2.1.6's `const`-binds-not-freezes, restated at the type level so the student sees the parallel. One sentence on `Readonly<T>` as the per-field shorthand; the recursive-immutability discussion stays a one-line forward link.

**Engagement.** A `Tokens` exercise on a single code block with six expressions — student clicks the three that the compiler rejects.

**Components.**
- `Code` for the four wrong-then-right snippets.
- `Tokens` for the click-the-rejected-expressions drill.

---

## Concept 6 — When a tuple beats an object

**Why it's hard.** Tuples look like arrays with a weird type signature. The student doesn't see why `useState` returns `[value, setter]` instead of `{ value, setter }`. The senior rule — "destructure-and-rename at every call site" — is the lesson, and it isn't visible from the syntax.

**Ideal teaching artifact.** A Decision-archetype side-by-side: the same custom hook (`useToggle`) implemented twice — tuple return vs. object return — with three call sites under each that show how the destructure plays at the call site. Tuple: `const [isDarkMode, toggleDarkMode] = useToggle()` reads cleanly because position is renamed-on-the-way-out. Object: `const { value: isDarkMode, toggle: toggleDarkMode } = useToggle()` shows the rename verbosity. The artifact makes the senior rule visible: when every caller renames, position carries no penalty.

**Engagement.** A `script-coding` (or `TypeCoding`) exercise where the student types a `useToggle` hook's return as a labeled `readonly` tuple — the test pins the resolved type to `readonly [boolean, () => void]`. Plus one `MultipleChoice` matching four shapes (3D coordinates, a user record, a `Map` entry, a five-field config) to tuple vs. object.

**Components.**
- `CodeVariants` for the tuple-vs-object call-site comparison.
- `TypeCoding` for the typed `useToggle` return (with `^?` query pinning the resolved type to the labeled readonly tuple).
- `MultipleChoice` for the shape-decision close.

---

## Concept 7 — Index signature vs. `Record<LiteralUnion, V>`: the completeness payoff

**Why it's hard.** Both forms type "an object with dynamic keys." The student writes `Record<string, User>` everywhere and misses that `Record<'draft' | 'sent' | 'paid', string>` is a different kind of contract — one that *requires* every key in the union to be present. Completeness checking is the senior payoff and the student doesn't know it exists.

**Ideal teaching artifact.** A Decision-archetype three-shapes prompt at the top — "type a cache by user ID, a status-to-label lookup, and arbitrary JSON from the wire" — paired with a `TypeCoding` puzzle that walks the student through each. The puzzle starts with all three typed `Record<string, string>` (compiles but loses the completeness payoff on the lookup). The student rewrites the lookup as `Record<'draft' | 'sent' | 'paid', string>`, removes one key, and watches the error appear. The artifact carries both the discrimination and the recall.

**Engagement.** The `TypeCoding` puzzle itself is the recall — the criteria pin the lookup's exhaustiveness error. Follow-up `Buckets` sorts six dynamic-keyed shapes (cache by user ID, status-to-label, JSON from the wire, HTTP method to handler, i18n messages keyed by locale, Drizzle row by primary key) into "index signature" and "`Record<LiteralUnion, V>`" to lock the discrimination.

**Components.**
- `TypeCoding` for the three-shapes puzzle (instructions, three `Record` types, one `^?` for the resolved-key-union, one `expectedError` for the missing-key case).
- `Buckets` for the shape-sort follow-up.

---

## Concept 8 — `noUncheckedIndexedAccess` divergence

**Why it's hard.** Students read `Record<string, User>` and `Record<'a' | 'b', User>` as variants of the same type. Under `noUncheckedIndexedAccess`, the first returns `User | undefined` on every read and the second returns `User`. The divergence is invisible until the student tries to call a method on the result.

**Ideal teaching artifact.** A controllable type-hover comparison. Two identical read sites (`cache[userId]` and `labels[status]`); the student hovers each `^?` and sees `User | undefined` on one, `string` on the other. The artifact makes the divergence visible at the type level *before* the student writes runtime code. This is a Concept-archetype reveal — the engineering implication ("you must narrow the open-keyed read; the finite-keyed read is safe to use directly") follows from the type display, not from prose.

**Engagement.** Same `TypeCoding` puzzle as Concept 7 carries this — the criteria pin both `^?` types (one with `| undefined`, one without). The completeness payoff and the read-narrowing payoff land in one widget.

**Components.**
- `TypeCoding` (shared with Concept 7) — second `^?` query and second criteria row.

---

## Concept 9 — The shape-union landmine

**Why it's hard.** A union of object types lets you read only fields that exist on every variant. The student who writes `function render(value: User | Guest) { return value.email }` is surprised when TypeScript rejects it — they were thinking "value is either, so read either's fields." The mental model needed: a union value is *one* of the alternatives, and the type system only trusts what every alternative guarantees.

**Ideal teaching artifact.** A Concept-archetype Venn-style diagram showing two object types (`User` with `id`, `email`, `role`; `Guest` with `id`, `sessionToken`) and a third panel showing what's readable on `User | Guest` (only `id`, the intersection of *fields*). Paired with a wrong-by-default code block — the `value.email` access fails to compile — and the fix-via-narrowing preview that 2.4.6 will own. The diagram is what makes the inversion ("union of types = intersection of readable fields") stop feeling backwards.

**Engagement.** A `TypeCoding` exercise where the student receives `function describe(value: User | Guest) { return /* fill */ }` with criteria that the body must compile *without* `as` — the student is forced to either return a common field or narrow first.

**Components.**
- Primary: `Figure` wrapping a hand-SVG two-circle Venn with three labeled regions — one image, used once in this chapter; no forward-link. Stays inline SVG.
- `TypeCoding` for the wrong-by-default fix.

---

## Concept 10 — Intersection: set-intersection of constraints

**Why it's hard.** The semantics flip from union. `A & B` has *more* fields, not fewer. And `string & number` is `never`, which mystifies the student who reads it as "a thing that is both a string and a number."

**Ideal teaching artifact.** A Mechanics-archetype paired walk on a single composition example: `type RequestBase = { id: string }` intersected with `type CreateUser = { name: string; email: string }` produces `{ id: string; name: string; email: string }`. Then the contrast: `string & number` resolves to `never`. The artifact is two `TypeCoding` snippets with `^?` queries — the resolved-shape one and the `never` one — so the student *sees* the intersection at the type level rather than reading prose about it.

**Engagement.** The `TypeCoding` `^?` queries are the recall (the resolved type must contain "name: string; email: string"; the second must resolve to "never"). Follow-up: one `MultipleChoice` asking which of four pairs `&` produces `never`.

**Components.**
- `TypeCoding` with two `^?` queries.
- `MultipleChoice` for the `never` follow-up.

---

## Concept 11 — The discriminated-union shape, seeded

**Why it's hard.** The student will meet this pattern in full force in 2.5.1. This chapter plants the shape — a union of object types each carrying a literal discriminant field — without teaching the full pattern. The risk is over-teaching or under-teaching: too much detail steals 2.5.1's lesson; too little leaves the next chapter without language.

**Ideal teaching artifact.** A single worked example — `type RequestState = { status: 'loading' } | { status: 'success'; data: User } | { status: 'error'; error: Error }` — built up in a `DiagramSequence` of three steps: (1) the three plain object types, (2) the union with no discriminant (which has the landmine from Concept 9), (3) the same union with the literal `status` field added, and a one-line preview that "next chapter, this is the shape narrowing rides on." Pattern-archetype foreshadow; the student leaves with the *recognition* of the shape, not the full narrowing rules.

**Engagement.** A `Tokens` click on the worked example: "which field is the discriminant?" — single click, one correct target, one decoy (the `data` field).

**Components.**
- `DiagramSequence` for the three-step build.
- `Tokens` for the discriminant click.

---

## Concept 12 — The narrowing surface

**Why it's hard.** Six narrowing forms (`typeof`, equality, `in`, `instanceof`, `Array.isArray`, type predicates) each match a specific shape of input. The junior reflex is to pick `typeof` for everything; the senior reflex is to pick the form that matches the input's shape. Bonus difficulty: the narrowing scope rule — a narrow holds only inside the block, and a reassignment invalidates it.

**Ideal teaching artifact.** A Reference-archetype card stack — six small cards, one narrowing form each, with its trigger ("mixed primitives," "shape union with discriminant," "shape union without discriminant," "class hierarchy," "T | T[]," "anything custom"). Paired with a `script-coding` puzzle where the student receives a function whose parameter is some union shape and must pick the right narrowing form to access the field — the test cases include all six shapes. The student writes once, six times, each time picking the matching form. The artifact carries the recall.

**Engagement.** The puzzle is the engagement (one `script-coding` or `TypeCoding` per form, or one with six test cases). Follow-up `Buckets` sorts eight scenarios into the six forms plus "narrowing won't help — refactor the input shape."

**Components.**
- `Figure` wrapping a six-card reference grid (hand-authored, used once, no forward-link — stays static).
- `TypeCoding` for the picking-the-right-form puzzle (six test cases, criteria pin the resolved branch type at each narrow).
- `Buckets` for the form-sort.

---

## Concept 13 — Why `as` lies and the three triggers that earn it

**Why it's hard.** `as` is the easiest tool in the language. It always compiles. It always *feels* like the right fix. The student who reaches for it is silencing the type system at the point where the type system was most useful. The lesson installs the reflex "narrow first; `as` is the exception with three named triggers."

**Ideal teaching artifact.** A misconception-first, wrong-by-default sandbox. The student opens a `TypeCoding` exercise with a function `(value as User).email` already written — it compiles. Then the lesson's prose introduces a *second* test fixture where `value` is actually a `Guest`. The student runs in their head — does the compiler help? It doesn't. The student then rewrites with narrowing (the test pins both branches' return types). The artifact's structure *is* the argument: the assertion compiles cleanly while being wrong; the narrow compiles cleanly *and* is right.

The three legitimate triggers (post-Zod parse, "TypeScript can't see what you can prove," DOM type gaps) land as a tight `Aside` immediately after the rewrite — three bullets, one example each. They are the escape-hatch list, not the topic.

**Engagement.** The `TypeCoding` rewrite is the recall — criteria pin "no `as` in the solution" via a forbidden-substring or by pinning the narrowed branch types. Follow-up `Buckets` sorts eight scenarios into "narrow" vs. "`as`/`!` is acceptable here."

**Components.**
- `TypeCoding` for the assertion-to-narrowing rewrite. (If forbidden-substring criteria aren't supported, fall back to two `^?` queries that only resolve correctly when narrowing is used.)
- `Aside` for the three legitimate triggers.
- `Buckets` for the scenario sort.

---

## Concept 14 — `as const`: the value-site freeze

**Why it's hard.** The student writes `const ROUTES = { home: '/', about: '/about' }` and is surprised the inferred type is `{ home: string; about: string }`, not the literal-typed shape they meant. Object property types widen by default. `as const` is the override and it's invisible from the value alone — the student has to know it exists *and* know the three sites it earns its weight.

**Ideal teaching artifact.** A scrubbable before/after on the *same* `ROUTES` value. Pane A: no `as const` — `^?` shows `{ home: string; about: string }`, downstream `keyof typeof ROUTES` is `'home' | 'about'` (still useful) but `typeof ROUTES[keyof typeof ROUTES]` is `string` (useless). Pane B: with `as const` — `^?` shows `{ readonly home: '/'; readonly about: '/about' }`, downstream `typeof ROUTES[keyof typeof ROUTES]` is `'/' | '/about'` (now useful). The student watches the downstream type derivations sharpen when the freeze fires. Pattern-archetype reveal: the value didn't change, the type did.

**Engagement.** A `TypeCoding` exercise where the student adds `as const` to a routes object and the criteria pin both `^?` queries — one on the value's type, one on `typeof ROUTES[keyof typeof ROUTES]` resolving to the literal union.

**Components.**
- `CodeVariants` for the two-pane before/after (with `^?` types shown as labeled output blocks under each pane).
- `TypeCoding` for the add-`as const` exercise.

---

## Concept 15 — `satisfies` and the combined `as const satisfies T` idiom

**Why it's hard.** Three forms (annotation, `as const`, `satisfies`) do related but distinct things. The student needs the contrast: annotation widens to the type and validates; `as const` freezes and doesn't validate; `satisfies` validates without widening. Mixing them in the wrong order, or substituting one for another, is the bug class.

**Ideal teaching artifact.** A three-row contrast table on a single `ROUTES` example, then a Pattern-archetype worked build for the combined idiom. Row 1: `const ROUTES: Record<string, string> = { ... }` — typed wide, validated, literal types lost. Row 2: `const ROUTES = { ... } as const` — narrow, not validated. Row 3: `const ROUTES = { ... } as const satisfies Record<string, string>` — narrow *and* validated. Each row shows the resolved type next to it, so the student reads the three forms as a comparison, not as three separate tools.

**Engagement.** A `TypeCoding` build: the student types a permissions table with `as const satisfies Record<Role, readonly Permission[]>` — criteria pin `^?` on `typeof PERMISSIONS['admin'][number]` resolving to the literal `Permission` union *and* require an `expectedError` if the student removes a required role key. Plus one `MultipleChoice` matching four config scenarios to annotation / `as const` / `satisfies` / `as const satisfies T`.

**Components.**
- `Figure` wrapping a hand-authored three-row contrast table — single use, no forward-link, stays inline.
- `TypeCoding` for the permissions-table build.
- `MultipleChoice` for the four-scenario match.

---

## Concept 16 — Annotate the boundaries, infer the inside (plus `import type`)

**Why it's hard.** Two failure modes coexist. The over-annotator types every local variable and every callback parameter; the under-annotator infers everywhere and exposes implementation details across module boundaries. The senior rule is one sentence — annotate at the seams (parameters, exported APIs); infer everywhere else — but the student needs to feel where the seams are. Plus the `verbatimModuleSyntax` rule turns "is this import a type or a value" into a per-line decision.

**Ideal teaching artifact.** A Decision-archetype annotated module. One short file — a service with one exported function, one local helper, one inline `.map`, one type alias, and three imports (one type-only, one value, one mixed). Each declaration site gets a margin label: "annotate," "infer," or "type-only import." The student reads the file once and sees the rule applied across every site the chapter has covered. The boundary rule isn't a list of cases — it's a single legible artifact.

**Engagement.** A `Buckets` sort across ten declaration sites pulled from a real module: "exported function parameter," "internal helper parameter," "local sum variable," "inline `.map` callback parameter," "exported type alias," "internal function return," "exported function return," "an imported `User` used only as a type," "an imported `db` used as a value," "a mixed import." Sort into "annotate," "infer," or "`import type` / mixed import." That's the chapter-closing assessment.

**Components.**
- Primary: `AnnotatedCode` walking the single module — each step highlights one declaration site and explains why it's annotated, inferred, or `import type`. This is the highest-fit existing component for the artifact.
- `Buckets` for the ten-site sort.

---

## Component proposals

None. Every concept above resolves to existing components from `INDEX.md`. The two cases where a bespoke widget tempted me (the `?` vs. `| undefined` per-operation toggle in Concept 4, and a "completeness-checker visualizer" for `Record<LiteralUnion, V>` in Concept 7) both fail the single-use discipline — neither recurs in this chapter and neither has a forward-link to a later chapter that would compound the build. `CodeVariants` and `TypeCoding` carry those concepts at acceptable pedagogical cost.

The chapter is unusually well-served by `TypeCoding`. Eight of the sixteen concepts (4, 6, 7, 8, 9, 10, 12, 13, 14, 15) ride on its `^?` query and `expectedError` surface — the type system *is* the lesson, and `TypeCoding`'s "make tsc quiet plus pin the resolved type" model is exactly the assessment shape this chapter wants. The teaching depth comes from the framing prose and the misconception-first openers, not from new component machinery.

## Build priority

No new components to build. The build priority for the chapter is the *authoring* of dense `TypeCoding` exercises — the ten-or-so `^?`-pinned puzzles across Concepts 6–15 carry most of the chapter's teaching load and are where the human effort should concentrate. The two prediction openers (Concept 1's typo-catch and Concept 13's `as User` lie) and the chapter-closing annotated module (Concept 16) are the next investment.

## Open pedagogical questions

- Concept 13's `TypeCoding` rewrite wants a "forbidden substring" criterion to enforce "no `as` in the solution." If that criterion isn't supported, the fallback (pinning the narrowed branch types via `^?`) works but is less direct — confirm before authoring.
- Concept 4's `CodeVariants` pane carries the `?` vs. `| undefined` distinction with output blocks but doesn't let the student *manipulate* the operations. If reader feedback shows the distinction isn't sticking, an `OptionalityComparator` bespoke widget becomes worth revisiting — but only if a second chapter (likely Unit 7's forms work) would reuse it.
