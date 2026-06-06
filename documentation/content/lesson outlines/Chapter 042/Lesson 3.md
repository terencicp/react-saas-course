# Lesson title

- Title: `Checks and transforms`
- Sidebar label: `Checks and transforms`

# Lesson framing

This is the conceptual center of the chapter. L1 gave the eight builders, L2 gave the format catalog. Both shared one limit: everything they validate is a *named, prebuilt* check. This lesson teaches the two extension points for rules **no built-in covers** — custom checks (refinements) and value transforms — which is where Zod stops validating primitive shapes and starts validating the domain.

Mental model the student should leave with: a schema is not just "the right builders" — it's a pipeline of **checks** (predicates that pass/fail, type-preserving) and **transforms** (functions that reshape the value, possibly changing the inferred output type). Refinements answer "is this value *acceptable*?"; transforms answer "what should this value *become*?". Two separate jobs, two separate tools, and confusing them (using a transform where a check belongs, or expecting a refine to mutate) is the dominant beginner error.

Pedagogical decisions for the lesson as a whole:

- **Continue the running examples.** L1/L2 established `signupSchema` (email/token/startAt) and the invoice shape. This lesson's three opening scenarios are all extensions of those: password + confirmation (cross-field), `dueAt > issuedAt` (cross-field on the invoice), email normalization (transform). Reuse them — do not invent new domains. Stay camelCase schema / PascalCase type per the chapter convention.
- **Lead each tool with the senior question, not the API.** Every section opens with the concrete rule that has no built-in, *then* names the tool. "Decisions before syntax" — the student must feel the gap before meeting the fix.
- **The check vs. transform split is the spine.** Frame the whole lesson as: validators so far were prebuilt; these two are how you write your own. One sub-decision recurs — *does this rule change the value, or just judge it?* — and it routes refine vs. transform every time. Make that question explicit and repeat it.
- **The v3→v4 delta is named once, lightly.** The chapter rule (from continuity notes) is: name a v3 legacy form once where relevant, then write v4 everywhere. Here that's the `ZodEffects`-wrapper-to-`checks`-array shift. The student doesn't need v3 mechanics; they need to know *why* refinements now compose cleanly and that older docs/AI output may show the wrapper model. One paragraph, no struck-through code drill (unlike L2's `.email()` — the call-site syntax is unchanged, so a before/after fence would mislead).
- **Two genuine v4 footguns get real estate, not asides.** (1) transform-runs-on-refine-fail, (2) the cross-field-refine-without-`path` problem. Both are "your mental model from older docs is wrong" traps. Per pedagogical guidelines, watch-outs live *in the section teaching the concept they qualify*, not bundled at the end.
- **The schema-vs-action boundary is reinforced, not re-taught.** L2 already drew this line for cross-resource format rules ("uniqueness/blocklists live at the action"). This lesson draws the *same* line for custom logic rules and explicitly calls back to L2's framing, then forward-points to Server Actions (Ch043, next chapter). This is Architectural Principle #3 territory but that principle isn't formally introduced until ch043 L4 — so reference the *idea* (pure validation in the schema, side-effects at the boundary) without naming the numbered principle.
- **One graded ZodCoding exercise is the keystone.** The canonical ZodCoding pitch is "inferred type + per-fixture pass/fail in one card." The best fit here is the cross-field refine: the student adds a `.refine` with a `path`, fixtures flip, and (critically) the `^?` query does **not** move — proving refinements don't change inference. That non-movement is the teachable moment that distinguishes refine from transform. A second, smaller transform exercise shows the `^?` query *moving* (string → Date) for contrast.
- **Cognitive load order: refine → superRefine → transform → overwrite → pipe.** Simplest predicate first, build to multi-issue, then cross over to the value-changing tools, ending with the heaviest (`.pipe`). Each tool's introduction names the threshold the previous one crosses (trigger before tool): `.superRefine` only when one predicate yields *multiple* issues; `.pipe` only when the post-transform validation is itself a non-trivial schema.
- **Async refinements are named once and deferred.** `.refine` accepts an async predicate (needs `parseAsync`), but this lesson is synchronous-only. One sentence pointing forward (AI tool validation, Unit 22) and to L5 (`parseAsync`). Do not drill it.
- **Components:** lean on `AnnotatedCode` for the cross-field-refine-with-path walkthrough (multiple parts of one block need focus: the predicate, the `path`, where the issue lands), `CodeVariants` for refine-vs-transform and overwrite-vs-transform contrasts (inferred-type difference is the payoff and belongs in a trailing comment per tab), plain `Code` for single-shape snippets, `ZodCoding` for the two graded exercises, `ZodPlaygroundCallout` once for the transform-on-refine-fail surprise (let the student watch the real runtime do the surprising thing), and a small `DiagramSequence` for the `.pipe` staged-validation flow. `version="4.4.3"` on every Zod runtime callout to match the chapter pin set in L1/L2 (npm latest stable at authoring time was 4.4.3, June 2026, with 4.5.0 in canary — keep `4.4.3` for chapter consistency unless the live version picker rejects it, in which case fall to the latest 4.4.x).

# Lesson sections

## Introduction (no header — opens the page)

Open on the running examples' unfinished business. The `signupSchema` validates that `password` is a string of at least eight characters (`z.string().min(8)` — a constraint the student already has from L2). But a real sign-up needs more, and none of it is a built-in: `password === passwordConfirmation`, `password` not equal to `email`, and the stored email lowercased and trimmed. Same for the invoice: `dueAt` is a valid `z.iso.datetime()` (L2), but the business rule is `dueAt > issuedAt` — a relationship between two fields no format builder can see.

State the gap plainly: every check so far has been *named and prebuilt*. These rules are *yours*. Zod 4 has exactly two extension points for them — **refinements** (write your own pass/fail check) and **transforms** (reshape the value). Preview the skill: by the end, the student writes single-field and cross-field custom rules, attaches errors to the right form field, and reshapes parsed values (normalize a string, turn an ISO string into a `Date`) — while knowing exactly which tool each job needs.

Plant the spine question that recurs all lesson: *does this rule judge the value, or change it?* Judge → refine. Change → transform. Keep it warm and brief per the guidelines.

Reasoning: the student arrives able to validate shapes; the motivating pain is the first domain rule that doesn't fit a builder. Leading with `signupSchema`/invoice continuity means zero new domain cognitive load — all the load goes to the new mechanic.

## A schema carries a list of checks

The conceptual frame before any syntax. Establish that a Zod schema isn't a single validation — it's a **pipeline**: the base type check, then any constraints (L2's `.min`, `.max`), then any refinements you add, then any transforms. Refinements are *checks* — predicates that return pass/fail and never alter the value or its type. Transforms are *functions* — they produce a new value and can change the inferred output type. This is the mental model the rest of the lesson hangs on; install it before the tools.

Then the v3→v4 delta, once, lightly. In Zod 3, `.refine()` wrapped your schema in an outer `ZodEffects` object — a different type sitting *around* the schema. In Zod 4, refinements are stored as a **`checks` array on the schema itself**. The student doesn't need the old mechanics; they need two consequences:
1. Refinements now **compose** with `.pick`, `.omit`, `.extend` (the derivation methods L4 teaches) — no `ZodEffects` wrapper to unwrap first; in v3 you couldn't interleave `.refine()` with `.min()` at all, and v4 fixes that. This is *why* the v4 model is better. (Honest caveat for the writer, not the student: a refinement defined on an object does not automatically survive a later `.omit`/`.partial` if it referenced a now-removed/now-optional field — a known sharp edge. L4 owns derivation depth; here keep the claim to "checks live on the schema and interleave with constraints," which is the load-bearing and uncontested part.)
2. The call-site syntax (`.refine(predicate, options)`) is **unchanged** from v3 — so unlike L2's `z.email()` migration, there's no before/after rewrite to learn. Older docs and AI output may *describe* the wrapper model; recognize it as stale framing, not stale syntax.

Crucially: **refinements do not change the inferred type.** A `z.string().refine(...)` is still inferred as `string`. Foreshadow that this is the single sharpest line between refinements and transforms (which *do* change the type) — the contrast pays off two sections later and again in the keystone exercise.

No code block needed here — this is a framing section. One short prose-embedded illustration is enough: name that `z.string().min(8).refine(p => !p.includes(' '))` is "string check, then length check, then your check," all producing a `string`.

Reasoning: students coming from older Zod docs (or AI trained on them) carry the `ZodEffects` mental model and the "refine returns a wrapped schema" intuition. Naming the shift up front prevents the composition surprises L4 would otherwise inherit. Putting "refinements don't change the type" here, before the tools, sets up every later contrast.

`Term` candidates in this section: **refinement** ("a custom pass/fail check you attach to a schema; stored in the schema's `checks` array in Zod 4, it validates without changing the value or its inferred type"), **predicate** ("a function that returns `true` or `false` — here, `true` means the value passes the check").

## `.refine` for a rule the built-ins miss

The single-field case first — simplest predicate, full attention on the mechanic. Motivate with a rule from the running set that has no builder: a password with no spaces, or a coupon code that must be uppercase-and-present. Show `z.string().refine(predicate, options)`.

Plain `Code` block (single shape, no multi-part focus needed):
```ts
const passwordSchema = z
  .string()
  .min(8)
  .refine((value) => !value.includes(' '), {
    error: 'Password cannot contain spaces',
  });
```

Teach four things in prose:
1. **The predicate returns `true` on pass.** This is the convention beginners invert — returning `true` for the *bad* case is the classic bug. State it explicitly: `true` = acceptable.
2. **The `error` option authors the message.** In v4 this is the unified `error` param. Name that v3 used a separate `message` key (legacy) — one mention, consistent with the chapter's "name the v3 form once" rule. A static string is the common case; the *function form* (`error: (issue) => ...`) and the **full** unified-error surface are L5's job — say so and don't drill them here. Keep this lesson's `error` usage to static strings plus one brief function-form taste, so L5 owns the depth.
3. **Refinements run after the base checks pass.** If the value isn't a string, the refine never runs — the type check fails first. So inside the predicate, the value is already the validated type; no defensive narrowing needed.
4. **The inferred type is unchanged** — restate: `passwordSchema` is still `string`. Reinforces the framing section.

The senior framing: `.refine` is the reach for *any* rule a built-in doesn't cover that is *local to a single field*. Pair this with the "where checks belong" payoff later — this is pure, value-only validation, exactly what belongs in a schema.

Reasoning: single-field `.refine` is the atom; isolating it (no `path`, no cross-field complexity) lets the student nail the predicate convention and the `error` option before the harder cross-field case stacks on. The `true`-means-pass inversion is the highest-frequency beginner bug and earns an explicit callout.

## Cross-field rules and the `path` that anchors the error

The cross-field case — the lesson's most important practical pattern, because it's where the `path` option lives and where beginners ship broken forms. Motivate with the running example: `password === passwordConfirmation`. The rule references *two* fields, so it can't live on either field's schema — it goes on the **object** schema.

Use `AnnotatedCode` here (multiple parts of one block need sequential focus): the object schema with `.refine` attached at the object level.
```ts
const passwordChangeSchema = z
  .object({
    password: z.string().min(8),
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    error: "Passwords don't match",
    path: ['confirm'],
  });
```
Steps:
- Step 1 (the object, `{1-4}`, blue): the two fields. A cross-field rule can't attach to one field — it needs to see both, so it attaches to the whole object.
- Step 2 (the predicate, the `.refine` line, green): `data` is the whole parsed object; the predicate compares two fields. Same `true`-means-pass convention.
- Step 3 (the `path: ['confirm']` line, orange): **this is the load-bearing line.** Without it, the issue attaches to the object *root* — the form layer has no field to anchor the message to, and the user sees a generic form-level error with no idea which input is wrong. `path: ['confirm']` tells the form layer "render this under the `confirm` field." Name that `path` is an array because it can point into nested shapes (`['address', 'zip']`).

Then the watch-out, **in this section** (it qualifies this exact concept): a cross-field refine *without* `path` is a real bug — it produces a message the UI can't place. The 2026 reflex: **every cross-field check names its `path`.** Use a `:::caution` for this.

Forward-point lightly: *how* the form actually reads `path` to render the message under the input is the `useActionState` + `treeifyError` story (L5 for the error tree, ch044 L4 for the form wiring). Here the student just needs to author the `path` correctly so that machinery has something to anchor to.

### Keystone exercise — add the cross-field check

`ZodCoding`, the chapter's canonical graded widget. This is the keystone: it proves the refine mechanic *and* the "refinements don't change the type" claim in one card.

- `schemaName="passwordChangeSchema"`.
- `instructions`: the starter is an object with `password` (min 8) and `confirm`, but no rule linking them — so a mismatched pair wrongly passes. Add a `.refine` that requires `password === confirm` with `path: ['confirm']`. Watch the `^?` query under the schema: it does **not** move. Refinements tighten the runtime contract without touching the inferred type — that's the line between a refine and a transform.
- starter: the object above *without* the `.refine`, plus `type PasswordChange = z.infer<typeof passwordChangeSchema>` and a `^?` marker.
- Fixtures (grade the target schema *with* the refine):
  - `{ password: 'longenough', confirm: 'longenough' }` → pass
  - `{ password: 'longenough', confirm: 'different' }` → fail, `errorContains: "match"`
  - `{ password: 'short', confirm: 'short' }` → fail (the `.min(8)` still fires)
- The "matching pair passes, mismatched pair fails, while `^?` stays `{ password: string; confirm: string }` throughout" is the teaching payoff.

Reasoning: cross-field + `path` is the single most reused pattern from this lesson in every real form, so it gets the heavy-component walkthrough and the graded exercise. The non-moving `^?` is the cleanest possible proof of the refine-vs-transform distinction, set up here and contrasted in the transform section.

## `.superRefine` when one rule raises many issues

The trigger-before-tool introduction: name the threshold `.refine` crosses. `.refine` adds **one** issue when its predicate fails. When a single logical rule needs to raise **multiple distinct issues** — each with its own message and possibly its own `path` — `.refine` can't express it, and `.superRefine` is the reach.

The canonical motivating case (concrete, from the running domain): a password *policy* that reports every failure at once — too short, no uppercase, no digit — so the user fixes all three in one round-trip instead of three.

Plain `Code` block:
```ts
const passwordPolicySchema = z.string().superRefine((value, ctx) => {
  if (value.length < 8) {
    ctx.addIssue({ code: 'custom', message: 'At least 8 characters' });
  }
  if (!/[A-Z]/.test(value)) {
    ctx.addIssue({ code: 'custom', message: 'At least one uppercase letter' });
  }
  if (!/[0-9]/.test(value)) {
    ctx.addIssue({ code: 'custom', message: 'At least one digit' });
  }
});
```

Teach:
- The signature is `(value, ctx)`, not a boolean predicate. You don't *return* pass/fail — you **push issues** onto `ctx` via `ctx.addIssue(...)`. No issues pushed = the value passed.
- Each `ctx.addIssue` can carry its own message and `path`, which is why it handles the multi-issue and conditional-path cases `.refine` can't.
- **API note for the writer (verified against zod.dev/api, June 2026):** inside `ctx.addIssue({ ... })` the message key is **`message`**, *not* `error` — `addIssue` takes a raw issue object (`{ code: 'custom', message, path?, input? }`). This is a real inconsistency with `.refine`'s options object, which uses `error`. Do **not** "harmonize" the `.superRefine` snippet to `error:` — it would be wrong. Flag this divergence in one sentence of prose so the student isn't tripped by it, then move on; the full issue anatomy (codes, `path`, code-specific fields) is L5.

The watch-out **in this section**: `.superRefine` is *heavier* and more verbose than `.refine` — more surface to get wrong, no clean boolean to read. **Reach for it only when one predicate genuinely produces multiple issues.** A single-issue rule that's been written as a `.superRefine` is over-engineered; collapse it to `.refine`. `:::note`.

Reasoning: students discovering `.superRefine` tend to over-apply it (it *feels* more powerful), so the section's center of gravity is the *threshold* — multi-issue is the only justification. The password-policy example makes the "report everything at once" UX win concrete, which is the real-world reason it exists.

## `.transform` reshapes the value — and the type

The crossover. Up to now every tool *judged* the value. Transforms *change* it. Bring the spine question back: refine answered "is this acceptable?"; transform answers "what should this become?".

Two motivating jobs from the running set: (1) normalize the signup email — but that's actually a job for `.overwrite` (next section), so lead instead with (2) the type-changing case — take a validated `z.iso.datetime()` string and produce a `Date` the action can do math on.

Plain `Code` blocks (two shapes):
```ts
z.string().transform((value) => value.toUpperCase());
//                                                  → output: string (value changed)

z.iso.datetime().transform((value) => new Date(value));
//                                                     → output: Date (TYPE changed)
```

Teach:
- `.transform(fn)` returns a **new schema** whose output is whatever `fn` returns. The parse no longer hands back the input — it hands back the transformed value.
- **The inferred output type updates to match.** `z.iso.datetime().transform(s => new Date(s))` *accepts* a string but *infers as* `Date`. This is the exact opposite of a refinement — and it's the payoff of the `^?`-doesn't-move observation from the keystone exercise. Call that contrast back explicitly: refine left the type alone; transform moved it.
- The senior reach: when the schema's job is *part validation, part normalization-to-domain-type*. Pair with `z.iso.datetime()` to land a `Date` in a Server Action's typed input — the canonical use.
- Plant the input-vs-output-type wrinkle: once a transform splits "what the parse accepts" from "what it returns," there are *two* types, and L4 names the helpers (`z.input` / `z.output`) for each. One sentence, defer.

### Contrast exercise — watch the type move

A small second `ZodCoding` (deliberately lighter than the keystone) whose whole point is the `^?` query **moving**, mirror-image of the keystone where it stayed put.
- `schemaName="startAtSchema"`.
- `instructions`: the starter validates `startAt` as an ISO datetime string. Add `.transform(s => new Date(s))` and watch the `^?` query flip from `string` to `Date`. A refine left the type alone; a transform moves it — that's the whole difference.
- starter: `export const startAtSchema = z.iso.datetime();` + `type StartAt = z.infer<typeof startAtSchema>` + `^?`.
- Fixtures: a valid ISO string passes (and now yields a `Date`); `'not-a-date'` fails; the format check still runs *before* the transform. (Keep fixtures minimal — the type movement is the lesson, not the parse matrix.)

Reasoning: pairing two near-identical ZodCoding cards — one where `^?` holds, one where it moves — is the highest-clarity way to cement refine-vs-transform. The contrast does the teaching; neither card alone would.

## `.overwrite` for normalization that keeps the type

Trigger-before-tool again. `.transform` is right when the type *should* change. But the most common real transform — normalization (trim, lowercase, NFC-unicode) — produces the **same** type it consumed: a lowercased string is still a string. Using `.transform` there technically works but *widens the inferred type away from `ZodString`* into a generic transform output, which costs you the string-schema methods downstream and muddies the type. `.overwrite` is the v4 answer: it runs a value-changing function but **preserves the input type**.

`CodeVariants`, two tabs, because the inferred-type difference is the entire payoff and belongs side by side:
- Tab 1 "`.transform` — type drifts": `z.string().transform(v => v.trim().toLowerCase())` — first sentence: "Normalizes, but the schema is no longer a `ZodString` — the type generalized to a transform output." Trailing comment notes the output is still `string` but the *schema type* is no longer the string schema.
- Tab 2 "`.overwrite` — type held": `z.string().overwrite(v => v.trim().toLowerCase())` — first sentence: "Same normalization, still a `ZodString` — downstream code keeps every string method and the clean type." This is the senior default for normalization.

Connect to L2: L2 introduced `.trim()` / `.toLowerCase()` as built-in normalizers that *mutate the value while keeping the type* — `.overwrite` is the general-purpose version of that same idea for normalization logic the built-ins don't cover (e.g. NFC unicode normalization, stripping a currency symbol). Frame `.overwrite` as "`.trim()`'s machinery, for your own normalizers."

The senior trigger, stated as a rule: **normalization → `.overwrite`; conversion to a different type → `.transform`.** This is the cleanest decision heuristic and the watch-out folds into it (a `.transform` used for normalization is a type-drift bug; reach for `.overwrite`). Keep the watch-out in-section.

Reasoning: `.overwrite` is new in v4 and the student won't reach for it unless they feel the type-drift cost of `.transform`. The two-tab inferred-type contrast makes that cost visible. Tying it to L2's built-in normalizers anchors it to something already known rather than presenting it as a novel mechanic.

## `.pipe` for validation after a transform

The heaviest tool, last. Trigger: a `.transform` produces a value, but that value sometimes needs its *own* validation — and you want that validation expressed as a real schema, not a hand-rolled check inside the transform. `.pipe` chains schemas: the first schema's output feeds the second schema's input.

Canonical shape:
```ts
z.string()
  .transform((value) => Number(value))
  .pipe(z.number().int().positive());
```

A `DiagramSequence` (3 steps) to make the staged flow concrete — this is a small visual aid, exactly the kind the diagrams guidance endorses, not a system graph. Plain HTML/CSS pill stages inside each `DiagramStep`:
- Step 1: input `"42"` (a string) entering `z.string()` — caption: "A string arrives and passes the first schema."
- Step 2: `.transform(Number)` produces `42` (a number) — caption: "The transform reshapes the value: string → number."
- Step 3: `42` enters `z.number().int().positive()` and passes — caption: "The piped schema validates the *transformed* value. `"-1"` would pass step 1 but fail here."
The pedagogical goal: show that `.pipe` runs a *second full validation pass* on the output of the first, which a bare transform cannot do.

Teach:
- `.pipe(nextSchema)` validates the previous schema's output against `nextSchema`. Use it when the post-transform validation is itself non-trivial (a constrained number, another object shape).
- The honest senior call: `.pipe` is **heavier than the alternative for the common form-data case.** The everyday "string from a form → number" job is `z.coerce.number()` (the lighter, dedicated tool — L6 owns it). Name that explicitly: reach for `.pipe` only when coercion's defaults don't fit *and* the follow-on validation is a real schema. One forward-point to L6.

Reasoning: `.pipe` is genuinely the least-reached-for tool in the lesson, so it's last and explicitly bounded against `z.coerce` (which the student meets in L6). The diagram earns its place because "a second validation pass on transformed output" is hard to convey in prose but obvious as three stages.

## The transform that runs even after a refine fails

A dedicated section for the v4 footgun — it's a "your older mental model is wrong" trap and deserves real estate, not a buried aside. The surprise: in Zod 4, **a `.transform` on a schema chain can run even when an earlier `.refine` on that chain has already failed.** A student whose intuition came from v3 (or AI trained on it) expects a failed refine to short-circuit everything after it. It doesn't — this is a deliberate v4 performance change.

`ZodPlaygroundCallout` (let the real runtime do the surprising thing — this is exactly when to embed the live playground rather than assert an output):
- `title="When a refine fails but the transform still runs"`, `version="4.4.3"`.
- Schema (ending `return schema`): a chain where a `.refine` rejects the input but a `.transform` would also touch it — constructed so the student can observe the transform executing despite the refine failure. Keep it small and self-contained.
- One or two sample values that trip the refine.
- slot message: invites the student to watch the order of operations against the real runtime.

The senior pattern (the actionable takeaway, not just the gotcha): **write transforms to be safe over any input the schema would structurally accept**, and let the refine raise the validation issue *separately*. Don't write a transform that assumes a refine "protected" it — because it didn't run after the refine in the order you imagined. A `:::caution` restates this as the rule.

Reasoning: this is the headline v4-vs-v3 footgun the continuity-notes-style "name once" rule flags; it's behavior, not syntax, so a live playground (observe it happen) beats a static claim. Giving it its own section signals its weight; folding it into another section would bury a real production trap.

## Pure checks in the schema, side-effects at the action

The closing boundary section — reinforces, doesn't re-teach. L2 already drew this line for *format/cross-resource* rules ("uniqueness, blocklists live at the action layer"). Draw the **same** line for *custom logic* rules and call the L2 framing back explicitly so the student sees one consistent principle, not two rules.

The split:
- **Belongs on the schema:** any rule the schema can prove from the value(s) *alone*, with no external resource — single-field `.refine`, cross-field `.refine`, `.superRefine` policies, transforms, normalization. Everything this lesson taught.
- **Belongs in the Server Action body, after the parse:** any rule needing a **database lookup or external call** — "is this email already registered," "is this org slug taken," "does the current plan permit this action." These can't be predicates on a schema because the value alone can't answer them.

State the failure mode concretely (same shape as L2's): a schema that needs a database connection to parse has crossed a line — it can't run in a test without a DB, can't run at the edge, and tangles pure validation with live infrastructure. The fix is the boundary: pure checks in the schema, side-effects in the action, with their own typed error path the form renders (forward-point: ch043 Server Actions next chapter, ch044 L4 the form rendering).

Reference the *idea* of Architectural Principle #3 (pure validation in the schema, side-effects at the named boundary) without naming the number — it's not formally introduced until ch043 L4, and naming it here would front-run that. A `:::note` carries the one-line rule.

A short `Buckets` drill (twoCol) to close — classification cements the boundary better than prose:
- instructions: "Each rule needs a home. Sort it: can the schema prove it from the value alone, or does it need the database?"
- Bucket "On the schema" (description: "Provable from the value — a `.refine` or transform"): items — "password matches its confirmation", "`dueAt` is after `issuedAt`", "the email is trimmed and lowercased", "the password has an uppercase letter and a digit".
- Bucket "In the action body" (description: "Needs a database lookup or external call"): items — "the email isn't already registered", "the org slug isn't taken", "the customer's plan allows another invoice".

Reasoning: ending on the boundary ties the lesson back to the chapter's spine (the schema is the validation contract; it stays pure) and to L2's identical line, so the student leaves with *one* durable principle reinforced twice rather than two disconnected rules. The Buckets drill is the right assessment shape — it's a classification judgment, exactly what the boundary requires the student to make on every rule.

## Where to go deeper

`CardGrid` with two `ExternalResource` cards (mirror L1/L2's closing pattern):
- Zod — Defining schemas (`https://zod.dev/api`), the refinements + transforms reference. icon `lucide:book-open` or `simple-icons:zod` with `iconColor="#3E67B1"` (match L1).
- Zod Playground (`https://zod-playground.vercel.app/`), to try refine/transform chains live. icon `lucide:flask-conical`.

Optionally one `VideoCallout` if the resourcer finds a current (last ~6 months) Zod 4 refinements/transforms walkthrough — not required; the lesson stands without it. Do not block on it.

# Scope

**Already taught — redefine in one line at most, do not re-teach:**
- The eight builders, `z.object`/`z.strictObject`, primitives, `.optional`/`.nullable`, `z.enum`, `z.discriminatedUnion`, `z.infer`, the schema-is-a-parser-with-a-type model, camelCase-schema/PascalCase-type naming (L1).
- Format builders (`z.email`, `z.uuid`, `z.iso.datetime`), number/string constraint chains (`.min`, `.max`, `.int`, `.positive`, `.multipleOf`), the built-in normalizers `.trim`/`.toLowerCase`/`.toUpperCase` and that they mutate-value-but-keep-type, and the first drawing of the schema-vs-action boundary (L2). The running examples `signupSchema` and the invoice shape (L1/L2).

**Reserved for later — name once and forward-point, do not teach:**
- The **full unified `error` object surface** (function form depth, `message`/`invalid_type_error`/`required_error` v3 trio, per-parse overrides, global config) → L5. This lesson uses `error` only as a static string on a check, plus one brief function-form taste.
- The full **`ZodError` / issue anatomy** (issue `code`s, `path` arrays in the error, code-specific fields) and `z.treeifyError` → L5. This lesson authors `path` *on a refine* but does not cover how the error tree is consumed.
- `parse` vs `safeParse`, `parseAsync` → L5. This lesson shows `.parse(...)` in illustrative snippets only; the throw-vs-Result decision is L5's.
- `z.input` / `z.output` (the two types a transform creates) and composition methods `.pick`/`.omit`/`.extend`/`.partial` → L4. Named where transforms split the type and where v4 refinements compose cleanly; not taught.
- `z.coerce` / `z.preprocess` and the `FormData` boundary (checkbox `"on"`, empty-string-to-zero) → L6. Named as the lighter alternative to `.pipe` for the common string→number form case; not taught.
- **Async refinements** (async predicate + `parseAsync`) → named once, deferred to L5 (`parseAsync`) and Unit 22 (AI tool validation). Synchronous only here.
- **Server Actions** themselves, `useActionState`, the typed `Result` error path, and the formal **Architectural Principle #3** → ch043 (next chapter) and ch044 L4. This lesson reinforces the *boundary idea* and forward-points; it does not implement an action.
- The deep **money** (numeric-as-string, decimal lib) and **timezone-aware date** stories → L7 and Ch083. The `z.iso.datetime().transform(s => new Date(s))` shape lands a `Date`; the timezone correctness is explicitly out of scope.
- `drizzle-zod` and generating schemas from the database → L7.

# Code conventions applied

- camelCase schema const, PascalCase inferred-type alias on the line directly below, same file in `/lib` (chapter convention, established L1; overrides any PascalCase-schema instinct).
- Top-level format builders only (`z.iso.datetime()`, never `.string().datetime()`) in every snippet (Code conventions "Schemas with Zod 4").
- The unified `error` option (not v3 `message`) on every refinement (Code conventions; chapter v3→v4 rule).
- `:::caution` / `:::note` asides carry the in-section watch-outs (guidelines: watch-outs live with the concept they qualify).
- Two-space indent, single quotes, trailing commas in multiline literals — match the L1/L2 MDX house style.
- Deliberate divergence: snippets use `.parse(...)` for illustration before L5 formally introduces `parse` vs `safeParse`. This is staged simplicity — the lesson is about *what the schema validates*, not *how it's invoked at a boundary*. Downstream agents: do not "fix" these to `safeParse`; that decision is L5's and would import its whole apparatus prematurely.
