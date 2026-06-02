# Composing classes with cn()

- **Title (h1):** Composing classes with cn()
- **Sidebar label:** Composing with cn()

---

## Lesson framing

This lesson cashes the debt Lesson 1 opened ("never assemble a Tailwind class name from a string; no template-literal conditional concatenation") and Lesson 2 forward-hooked.
The senior question that drives it: *a reusable `<Button>` accepts a `className` prop so consumers can override its look — how do you merge that override with the component's own classes so the consumer actually wins, every time, deterministically?*

The whole lesson is built around **one bug and one reflex**.
The bug: two utilities that set the same CSS property both survive into the class string, and the cascade resolves them by **Tailwind's fixed source order in the emitted stylesheet**, not by the order they appear in the consumer's string. So `cn`-less concatenation produces a class string where the consumer's `px-8` and the component's `px-4` both land on the element, and `px-4` may win — silently, and in a way that can shift between builds. The reflex: **for Tailwind classes, always `cn()`, never template-string concatenation.**

Pedagogically the lesson must make that bug **visible and concrete before** naming the solution (decisions-before-syntax; trigger-before-tool). The student is a token *consumer* from Lessons 1–2 and now becomes a *component author* — the first time in this chapter they write a component that other code styles. That framing (override pattern, not "string helper") is what keeps `cn()` from looking like a cosmetic utility.

`cn()` is then deconstructed into its **two independent jobs**, taught in pipeline order: `clsx` flattens conditionals (strings/objects/arrays/falsy) into a flat string but is **Tailwind-blind**; `tailwind-merge` is **Tailwind-aware** and dedupes conflicts last-wins. The mental model to leave the student with: `cn = clsx then tailwind-merge` — *first decide which classes are present, then resolve which conflicting ones survive.* Both halves are necessary; neither alone is enough. This split is the load-bearing insight and the part beginners most often blur.

The override-order rule (**defaults → conditional/variant classes → consumer `className` last**) is the single most important production takeaway and must be drilled, because last-position-wins is *the only thing* that makes consumer overrides reliable. Every shadcn primitive the student will meet in Chapter 027 follows this exact shape, so the lesson is laying a foundation they'll see again.

Cognitive-load staging: (1) the override scenario and the naive failure; (2) `clsx` alone; (3) `tailwind-merge` alone; (4) compose them into `cn()`; (5) the component-author pattern with `className` last; (6) the four conditional forms as a quick reference; (7) boundaries (what `tailwind-merge` can't see) and the short watch-out cluster. CVA is named once as a forward pointer (Chapter 022 L3), not taught.

**Path decision (resolves the discrepancy the continuity notes flag):** `cn()` lives at `lib/utils.ts`, imported as `@/lib/utils`. The chapter-018 outline's `src/lib/cn.ts` / `@/lib/cn` is **overridden** by `Code conventions.md` (shadcn convention) per the continuity-notes instruction. Downstream agents must use `@/lib/utils` everywhere.

Code-component strategy: lean on `CodeVariants` for the naive-vs-`cn()` before/after and for the four conditional forms; `AnnotatedCode` for the one place attention must move across multiple lines (the override-order component); a `DiagramSequence` to animate the `clsx → tailwind-merge` pipeline transforming a concrete string; one `ReactCoding` target-match exercise to make the bug felt in the student's hands, and one `Tokens` drill to cement "which argument is the consumer override." Keep all code at semantic role-named tokens (`bg-primary`, `text-primary-foreground`) per the chapter's pre-wiring of Lesson 5 — never raw `bg-blue-500`.

---

## Lesson sections

### Introduction (no header)

Open on the concrete scenario, not the helper.
A `<Button>` is reused across the app; on one screen it needs wider horizontal padding, so the consumer passes `className="px-8"`. The component already sets `px-4` internally. Show the two-line mental sketch (consumer call site + naive component body that does `` `... px-4 ... ${className}` ``) and pose the question the lesson answers: *which padding wins, and can you rely on the answer?* State the goal — by the end the student writes the `cn()` helper, understands its two halves, and applies the `className`-last override pattern that every reusable component (and every shadcn primitive) in this course uses.
Connect back: Lessons 1–2 made them fluent *reading and writing* utility strings and *defining* tokens; this lesson is the first where they author a component **other code styles**, which is exactly where naive string-building breaks.
Keep it warm, ~4–6 sentences. No `cn()` definition yet.

### Two classes, one property: the bug behind the bug

**Goal:** make the failure concrete and explain *why* it happens at the cascade level, so `cn()` reads as a fix for a real defect rather than a style preference. This is the trigger the rest of the lesson is the tool for.

Content:
- Walk the naive component body: `className={\`inline-flex rounded-md bg-primary px-4 py-2 ${className}\`}`. With the consumer passing `px-8`, the **element's class attribute ends up containing both `px-4` and `px-8`**. Both are valid; both set `padding-inline`. The browser must pick one.
- The load-bearing explanation: CSS picks the winner by the cascade, and for two classes of equal specificity the **last rule in the stylesheet wins** — and Tailwind emits utilities in **its own fixed source order**, independent of the order tokens sit in your `class` attribute. So the winner is decided by *where Tailwind happens to put `px-4` vs `px-8` in the generated CSS*, not by the consumer putting `px-8` last in the string. (Restate from Lesson 1's asserted "two utilities on the same property, one wins"; the cascade *mechanics* themselves are Chapter 019's job — assert, don't derive.)
- Name the two reasons this is dangerous: it's **silent** (no error, both classes are "valid"), and it's **build-dependent / unpredictable** (the consumer cannot reason about the outcome from their own code). A component whose overrides can't be reasoned about is a broken component.
- Land the reflex as the section's thesis: **template-literal concatenation is the wrong tool for Tailwind classes** because it can't remove the loser — it only appends. You need something that *deletes* the conflicting class. That something is `tailwind-merge`, reached via `cn()`.

Components:
- `CodeVariants` with two tabs, **"Naive (string concat)"** and **"What the DOM gets"**. Tab 1: the consumer call site + the naive component body (`tsx`), with `"${className}"` highlighted. Tab 2: a `html` block showing the rendered `class="inline-flex rounded-md bg-primary px-4 py-2 px-8"` with both `"px-4"` and `"px-8"` marked (use `data-mark-color="red"`), prose: "Both survive. The cascade — not your string — decides which paints." Six-line prose cap per tab.
- A short `Aside` (caution) right after, one sentence: this is the bug Lesson 1 told you to avoid when it banned template-literal class concatenation — here is *why*.

`ReactCoding` (target-match, `live`) — **"Feel the bug."**
Place it at the end of this section so the student experiences the unpredictability before being handed the fix.
- `instructions`: "This `<Badge>` builds its class string by concatenation. Pass `className=\"bg-primary\"` and try to make the badge primary-colored. Notice you can't reliably override the built-in `bg-muted`."
- `starter`: an `App` rendering a small `Badge`-like component whose body does naive concat with `bg-muted` baked in and `${className}` appended, called once with a `className` prop the student edits.
- `target`: the same badge rendered primary-colored (`bg-primary text-primary-foreground`).
- The pedagogical point is the *frustration*: depending on emit order the override may or may not take. AI feedback nudges toward "concatenation can't delete the conflicting class." Keep starter ≤ ~12 lines.
- Mark deliberately: this exercise is meant to be *hard to pass cleanly* — that's the lesson. The next section resolves it.

### clsx: deciding which classes are present

**Goal:** teach the *first* half of the pipeline in isolation. `clsx` answers "which classes are in the string at all," handling conditionals; it does **not** know anything about Tailwind or conflicts.

Content:
- One-paragraph framing: `clsx` is a tiny (~240B), dependency-free utility that builds a space-joined class string from a mix of inputs — strings, arrays, and **objects whose keys are emitted when their value is truthy** — silently dropping `false`, `null`, `undefined`, `0`, `''`. Its entire job is conditional assembly.
- Show the input shapes it accepts with a single compact example mixing a base string, an object (`{ 'opacity-50': isDisabled }`), and a falsy value that vanishes. Emphasize: output is *just concatenation* — if you feed it `px-4` and `px-8` it returns `"px-4 px-8"` unchanged. **`clsx` is Tailwind-blind.** That blindness is exactly why it's not enough alone, and it motivates the next section.
- Frame `clsx`'s role precisely with terminology to carry forward: *clsx flattens conditionals into a flat string.*

Components:
- `CodeTooltips` on a single `tsx` block showing `clsx('rounded-md', { 'opacity-50': isDisabled }, isActive && 'ring-2')`. Tooltips: `clsx` ("Joins truthy inputs into a space-separated string. Drops false/null/undefined/0/empty."), `{ 'opacity-50': isDisabled }` ("Object form: the key is included only when its value is truthy."). Keep it to one short block.
- A one-line `Code` block (`ts`) proving the blindness: `clsx('px-4 px-8') // -> 'px-4 px-8'` with a comment. This is the hinge into the next section.

### tailwind-merge: deciding which conflicting class survives

**Goal:** teach the *second* half. `tailwind-merge` is Tailwind-aware: given a string where two utilities target the same property, it keeps the **last** one and deletes the rest — making override-by-position actually work.

Content:
- One-paragraph framing: `tailwind-merge` parses a class string *as Tailwind*, groups utilities by the CSS property they control, and within each conflict group keeps only the **last** class. `twMerge('px-4 py-2 px-8')` → `'py-2 px-8'`. Now "last wins" is governed by **your string order**, which is what you want.
- What it understands (so the student trusts it): variant prefixes (`hover:`, `md:`, `dark:`), responsive prefixes, shorthand-vs-longhand families, arbitrary values. `twMerge('p-4 px-8')` correctly keeps both where they don't conflict and resolves them where they do (name the shorthand/longhand awareness as the "it's smarter than string matching" proof point).
- Version pinning watch-out, stated once and plainly: `tailwind-merge`'s conflict knowledge is keyed to a Tailwind version, so the installed `tailwind-merge` must be compatible with the project's Tailwind v4 — a mismatch silently mis-resolves. (Don't overdwell; it ships pinned in the scaffold, and current `tailwind-merge` supports Tailwind v4.)
- The "last wins" mechanic is the bridge to the override pattern: because `tailwind-merge` makes the **last** conflicting class win, putting the consumer's `className` **last** is what guarantees the consumer wins. Plant this sentence here; the next section formalizes it.

Components:
- `DiagramSequence` — **the pipeline, animated on a concrete string.** Pedagogical goal: show the student the two transformations happening in order, so `cn()` is never a black box. Build it in plain HTML/CSS pill-rows (each utility a small pill; conflicting pills tinted; deleted pills struck/faded). Steps:
  1. **Inputs** — the raw arguments as authored: `'inline-flex rounded-md bg-primary px-4 py-2'`, `{ 'opacity-50': isDisabled }` (isDisabled = false, shown greyed), and the consumer `'px-8'`. Caption: "Three inputs: base string, a conditional object, the consumer override."
  2. **After clsx** — flattened to one pill-row: `inline-flex rounded-md bg-primary px-4 py-2 px-8` (the `opacity-50` pill dropped because the condition was false). Caption: "clsx flattens conditionals and drops falsy values — still has both `px-4` and `px-8`."
  3. **Conflict detected** — `px-4` and `px-8` pills highlighted as a conflict group. Caption: "tailwind-merge sees two utilities on the same property."
  4. **After tailwind-merge** — `px-4` struck out and removed; final row: `inline-flex rounded-md bg-primary py-2 px-8`. Caption: "Last one wins. `px-4` is deleted; the consumer's `px-8` survives."
- A bare `Code` (`ts`) line under it restating `twMerge('px-4 py-2 px-8') // -> 'py-2 px-8'`.

### Writing cn(): clsx then tailwind-merge

**Goal:** compose the two halves into the canonical helper and lock in its location and signature. Short, declarative — the two-job model is already taught, so this is assembly + placement.

Content:
- Present the canonical implementation verbatim — the exact shape every shadcn project ships:
  ```ts
  import { type ClassValue, clsx } from 'clsx';
  import { twMerge } from 'tailwind-merge';

  export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
  }
  ```
- Read it left-to-right against the model: `clsx` runs **first** (flatten conditionals, drop falsy), its output feeds `twMerge` **second** (resolve conflicts last-wins). The nesting order *is* the pipeline. `ClassValue` is `clsx`'s exported input type, so `cn` accepts everything `clsx` accepts.
- **Location, stated as a rule:** `cn()` lives at `lib/utils.ts`, imported everywhere as `@/lib/utils`. This is the shadcn convention and ships from the Chapter 004 scaffold — the student doesn't create it, they import it. (Per the path decision in the framing.)
- One sentence on cost so no one over-thinks it: `cn()` runs at render and costs sub-millisecond per call; at SaaS component scale it never matters. Don't memoize it. (Forward-points nothing; just defuses premature optimization.)

Components:
- `AnnotatedCode` on the helper + its import site is overkill (4 lines) — use a plain `Code` block (`ts`) for the implementation, with `CodeTooltips` on `ClassValue` ("clsx's input type: string | number | boolean | null | undefined | array | object of those.") and `twMerge` / `clsx` if not already tooltipped above.
- A second tiny `Code` (`ts`) showing the one-line import a consumer writes: `import { cn } from '@/lib/utils';`.

### The override pattern: className last

**Goal:** the production payload of the lesson. Teach the **defaults → conditionals → consumer `className` last** ordering inside a real reusable component, and make explicit *why* last-position is non-negotiable.

Content:
- Show the corrected `<Button>` end to end: typed props extending `ComponentProps<'button'>`, `{ className, ...rest }` destructured, body returns `<button className={cn('inline-flex items-center rounded-md bg-primary px-4 py-2 text-primary-foreground', isDisabled && 'opacity-50', className)} {...rest} />`. The argument order is the whole point.
- The rule, stated as the section thesis and the lesson's headline takeaway: **inside `cn()`, the consumer's `className` is always the last argument.** Because `tailwind-merge` keeps the last conflicting class, last position is what lets the consumer override a default. Move it earlier and the component's defaults would clobber the consumer — the override silently stops working.
- Tie back to the cold open: now `className="px-8"` *reliably* wins, because `cn` deletes `px-4` and keeps the later `px-8`. The bug from section 1 is closed, and closed deterministically.
- Two boundary notes kept inside the teaching, not bundled at the end:
  - **Only reach for `cn()` when there are conditionals or an override to merge.** A static class string with no conditions and no consumer `className` doesn't need `cn()` — `className="flex gap-2"` is fine. `cn()` earns its place exactly when something conditional or overridable is in play.
  - **`cn()` belongs on the render path.** It computes a class string for JSX; don't call it inside `useEffect` or other non-render code (effects are Chapter 025 — name only). If a class isn't showing up in the DOM, the debugging move is "`cn()` merged it out" — restating Lesson 1's "is the class in the DOM?" reflex, now with the merge as a possible cause.

Components:
- `CodeVariants`, two tabs **"Naive"** vs **"With cn()"**, the *same* `<Button>` both ways, `del`/`ins` framing on the changed line. Tab 1 prose: "Consumer override unreliable — both paddings land." Tab 2 prose: "`className` last → consumer's `px-8` wins, deterministically." This is the canonical before/after the chapter has been building toward; mark `"${className}"` (red) in tab 1 and `className` as the last `cn` arg (green) in tab 2.
- `AnnotatedCode` on the **"With cn()"** `<Button>` to walk the argument order explicitly (this is the one place attention must move across the call): step 1 `{ className, ...rest }` destructure (`color="blue"`); step 2 the base/default classes — first `cn` arg (`color="blue"`); step 3 the conditional `isDisabled && 'opacity-50'` — middle arg (`color="orange"`); step 4 `className` — **last** arg, "consumer wins because last conflicting class survives" (`color="green"`); step 5 `{...rest}` spread so consumer `onClick`, `aria-*`, etc. pass through. `maxLines` default fine.

`Tokens` drill — **"Spot the consumer override."**
Place at the end of this section to check the single most important recognition: *which argument must come last.*
- `prompt`: "Click the argument that must be passed last to `cn()` so consumer overrides win."
- Slot: a `tsx` block of a `cn(...)` call with base classes, a conditional, and `className`.
- `targets`: `['className']` (the last arg).
- `decoys`: the base-class string literal and the conditional expression (e.g. `'opacity-50'`).
- Cements the rule kinesthetically without a full coding task.

### Conditional classes: the four forms

**Goal:** a fast reference so the student can read any `cn()` call they encounter and pick a clean form. Not a deep dive — the mechanics (clsx semantics) are already taught; this is *style selection*.

Content — the four conditional forms `clsx` (and thus `cn`) accepts, each with its one-line "use when":
- **`&&` (boolean toggle) — the canonical default.** `isActive && 'bg-accent'`. Reads cleanest for a single on/off class. Restate the Lesson-1 / Code-conventions rule: the left side must be a **real boolean** — `Boolean(x) && '...'` or `x != null && '...'` for nullable values, never a bare `0`/`''` that would leak a falsy value into the string. (This is the one watch-out that genuinely belongs here.)
- **Object form** — `{ 'bg-accent': isActive, 'opacity-50': isDisabled }`. Best when several independent classes each gate on their own boolean; keeps the conditions aligned and scannable.
- **Ternary (two-branch)** — `isOpen ? 'rotate-180' : 'rotate-0'`. When the choice is genuinely two-sided (this *or* that), not present/absent.
- **Array form** — grouping mixed inputs `['rounded-md', condition && 'border']`. Rare; mostly when assembling from pieces. Name for recognition.
- Closing guidance: pick the form that reads cleanest at the call site; they all flow through the same `clsx` step, so the choice is legibility, not behavior.

Components:
- `CodeVariants`, four tabs (`&&`, **object**, **ternary**, **array**), each a 1–3 line `cn(...)` snippet doing the *same* visual thing (e.g. toggling an active state) so the student compares *form*, not effect. First sentence of each tab is the "use when." `maxLines` small. This is the natural shape for "same thing, N ways."
- An `Aside` (tip) on the `&&` tab or just after: the real-boolean rule, one sentence, cross-referencing that nullable values need `value != null && ...`.

### Where the merge stops: cn()'s blind spots

**Goal:** set honest boundaries so the student doesn't over-trust `tailwind-merge` and knows the one escape hatch's name. Short.

Content:
- What `tailwind-merge` **knows**: Tailwind's own utility surface, variant/responsive prefixes, shorthand/longhand groups, arbitrary values that follow Tailwind conventions.
- What it **can't see** (and so won't dedupe): bespoke hand-written CSS classes (`.card-legacy`), third-party library classes, and arbitrary-property forms that don't map to a Tailwind utility group. Two of those targeting the same property will *both* survive — `cn()` is not magic, only Tailwind-aware. The mitigation is the same discipline from Lesson 1: stay on the utility surface; bespoke classes are a named boundary, not the default.
- Name the escape hatch once, for recognition only: when you ship **custom utilities** (`@utility` from Lesson 2) whose conflicts `tailwind-merge` can't infer, `extendTailwindMerge` teaches it new conflict groups. Rare; the student will almost never reach for it. Don't show full config — one sentence and move on.
- One sentence on the v4 `!important` modifier (Lesson 1's trailing `!`): it interacts predictably with `tailwind-merge` — an `important` utility still participates in conflict resolution by its base utility group. No special handling needed. (Cascade/`!important` depth is Chapter 019 — assert only.)
- Close the lesson by re-landing the two takeaways in one breath: **(1) `cn()` = `clsx` then `tailwind-merge`** — flatten conditionals, then resolve conflicts; **(2) consumer `className` last** so overrides win. Then the one forward pointer: when a component grows *orthogonal* variants (size × variant × state) and the conditional logic multiplies, **CVA (`class-variance-authority`)** declares that matrix once and pairs with `cn()` — that's Chapter 022's job; every shadcn primitive uses CVA + `cn` together. Name it, don't teach it.

Components:
- A small two-column `Buckets` exercise — **"Will `tailwind-merge` resolve it?"** Items are short class-pair scenarios; buckets are **"Dedupes (Tailwind-aware)"** vs **"Both survive (blind to it)."** Examples for the dedupe bucket: `px-4 px-8`, `hover:bg-primary hover:bg-accent`, `p-2 px-8`. For the blind bucket: `card-legacy my-custom-card` (two bespoke classes), a third-party `btn btn-lg` pair. Reinforces the boundary as a recognition skill. Keep to ~5–6 items.
- Optional closing `Aside` (note) naming CVA as the forward pointer, one sentence — keeps it out of the teaching flow.

---

## Scope

**Prerequisites — restate briefly, do not re-teach:**
- Utility-class grammar, variant prefixes (`hover:`, `md:`, `dark:`), the `class` attribute on JSX (Lesson 1). Assume fluency reading any utility string.
- Semantic role-named tokens (`bg-primary`, `text-primary-foreground`, `bg-muted`) defined via `@theme` (Lessons 1–2). Use them in every sample; the student already knows they resolve to CSS variables. Do **not** re-explain token definition.
- The asserted conflict fact from Lesson 1 ("two utilities on the same property, one wins"). This lesson explains the *override-order consequence* but not the cascade mechanics themselves.
- Typed component props / `ComponentProps<'button'>` / `{...rest}` spread are used in the `<Button>` sample. They are React-component basics the student has met; use them without a detour. React 19 `ref`-as-prop and forwarding `className` through a `ref` are **out of scope** (Chapter 022 L4) — the `<Button>` here is plain, no `ref`.

**Explicitly out of scope (do not teach; pointer only where noted):**
- **CVA (`class-variance-authority`)** and the variant-matrix pattern → Chapter 022 L3. One forward sentence at the close; never shown.
- **`asChild` + Radix `Slot`** polymorphism → Chapter 022 L3. Not mentioned.
- **shadcn/ui component templates** and the copy-paste model → Chapter 027 L1. May note "every shadcn primitive follows this `cn` + `className`-last shape" as motivation, but don't open shadcn.
- **The cascade, specificity, `@layer`, `:where()` mechanics, `!important` at depth** → Chapter 019 L1. Assert "last rule wins, Tailwind controls emit order"; do not derive it.
- **DOM-state / structural variants** (`group-*`, `peer-*`, `has-*`, `data-*`, `aria-*`) → Lesson 4. The `<Button>` uses a plain `isDisabled && 'opacity-50'` boolean, *not* `disabled:` or `aria-disabled:` styling, to keep the focus on composition. (If a sample shows `disabled:opacity-50` it's incidental utility usage, not the lesson's subject.)
- **`dark:` wiring and semantic-token theme swap** → Lessons 5–6. Tokens are used; theming is not discussed.
- **The `style` prop for dynamic CSS** → introduced Chapter 017 L1; out of scope here. `cn()` is for class strings only.
- **`extendTailwindMerge` configuration in full** — named once for recognition; no config walkthrough.
- **`useMemo`/memoizing `cn()`** — explicitly *not* needed (React Compiler + sub-ms cost); state the non-action, don't teach memoization.
- **`useEffect` / non-render paths** — named only as "don't call `cn()` there"; effects are Chapter 025.

---

## Terms for Tooltip / Term treatment

Strategic, supporting the lesson's goals — not every jargon word:
- **`clsx`** (`Term` or `CodeTooltips`) — "Tiny utility that joins truthy class inputs (strings/arrays/objects) into one space-separated string; drops falsy values. Tailwind-unaware."
- **`tailwind-merge`** — "Tailwind-aware deduplicator: when two utilities set the same property, keeps the last and removes the rest."
- **`ClassValue`** (`CodeTooltips`, in the helper block) — clsx's exported input union type; explains what `cn(...inputs)` accepts.
- **cascade** (`Term`, at first mention in section 1) — one-line: "CSS rule that decides which of several conflicting declarations applies; among equal-specificity rules, the last in the stylesheet wins." (Keeps the section-1 explanation from needing a detour; depth is Chapter 019.)
- **`@/lib/utils`** — optional `Term` at the location rule: "Project path alias; `@/` maps to the app source root. `cn()` lives here by shadcn convention."
