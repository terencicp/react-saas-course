# Own the source, not the dependency

- **Title (h1):** Own the source, not the dependency
- **Sidebar label:** Own the source

---

## Lesson framing

This is the chapter's foundation lesson: it lands shadcn/ui, the component system every project after Chapter 028 builds on, and the mental model that makes the whole chapter cohere — **you own the code, not a dependency.**

**Target student & angle.** The student can already write a typed React component, `cva` variants, an `asChild`-polymorphic component (Ch 022 L3), and semantic-token dark mode (Ch 018 L5). What they have *not* met is the senior decision *upstream* of writing UI: in 2026 you don't hand-build a `Dialog`/`Select`/`Calendar`, and you don't `npm install` a styled component library either. shadcn splits the seam — audited behavior from a primitive (Radix/Base UI), markup you own as source in your repo. This lesson is almost entirely a **decisions lesson**, not a syntax lesson: the syntax (`cva`, `asChild`, CSS tokens) is prerequisite; what's new is *why this model, what it costs, when to fork, where components come from*. Keep the senior-question framing dominant.

**Cognitive-load spine — one running example.** The chapter outline lists ~14 topics; taught as a flat list they read as trivia. Thread them through **one concrete artifact: adding a `Dialog`** to a project. The narrative arc is the natural order a senior actually moves through: (1) the build-vs-buy-vs-own decision → (2) what shadcn physically *is* (CLI + registry, not a package) → (3) run the CLI to add the dialog → (4) read the file it dropped and the config that placed it → (5) compose it with `asChild` → (6) theme it via tokens → (7) the day it needs to diverge: wrap vs. fork → (8) where else components come from: registries & blocks. Every abstract claim lands on the dialog the student just installed. This is the simplified-model-first principle: start with "I ran one command and got a file," add the dependency graph, the config surface, the registry namespace only as the story needs them.

**The mental model the student leaves with.** shadcn is a *transfer mechanism*, not a runtime dependency. The CLI copies source into `components/ui/`; from then on the file is yours — you read it to debug, you wrap it to extend, you (rarely) fork it when the abstraction is wrong, and you own its upgrades because there is no `npm update shadcn`. The behavior underneath comes from a real, audited primitive so accessibility is solved *for the primitive's surface* — but ownership means you can also break it, so "don't undo the a11y" is the discipline.

**What the student can do at the end.** Explain build-vs-library-vs-shadcn and defend the shadcn choice for SaaS. Run `init` and `add`. Read `components.json` and name the fields that matter. Recognize the dependency surface (`radix-ui`, `cva`, `tailwind-merge`, `clsx`, `tw-animate-css`, `lucide-react`). Compose a primitive's compound parts with `asChild`. Locate where theming lives. Apply the fork threshold: **wrap-and-compose first, fork only when the primitive's abstraction itself is wrong.** Recognize the registry/namespace and blocks vocabulary.

**Currency corrections baked in (verified June 2026 — see Scope notes).** The chapter outline predates two early-2026 shadcn changes that downstream agents MUST honor:
- **Radix is now a single unified `radix-ui` package** (Feb 2026), not per-component `@radix-ui/react-*`. Imports inside `components/ui/` read `import { Dialog as DialogPrimitive } from "radix-ui"`. The dependency-graph teaching uses `radix-ui` (singular), and `Slot` comes from `radix-ui` too. Do not teach `@radix-ui/react-dialog`-style imports as current.
- **The engine is an init-time choice** (`init --base radix|base`), changeable only by re-init/manual `components.json` edit — **not** via `shadcn apply`. `apply` switches *presets* (theme, fonts, design-system presets), not the primitive engine. The chapter outline's "switchable via `shadcn apply`" for the engine is wrong; correct it.
- **CLI is v4** (March 2026); `init` scaffolds full project templates; a `migrate` command exists (`migrate radix`, `migrate icons`). Recognition only.

**Pacing & recognition discipline.** Many topics are explicitly recognition-only in the chapter outline (full CLI surface, registry *authoring*, blocks, `package.json#imports` target aliases, `migrate`). Treat these as named-once, one-or-two-sentences, no exercise. Spend the real teaching budget on: the build-vs-buy-vs-own decision, the copy-into-repo model and its three consequences, reading the dropped file, `asChild` composition (it recurs in every dialog/menu/popover the course writes), and the fork threshold. The dialog example carries the recurring concepts so they're rehearsed, not just stated.

**Tone.** Adult, terse, no bootcamp scaffolding. Lead with the senior question implicitly in the intro (no "The senior question" heading). No moralizing about accessibility — it's a quality bar, and the depth lives in L2–L5; here it's just one consequence of the ownership model.

---

## Lesson sections

### Introduction (no heading)

Open on the concrete senior problem: a team's next screen needs a `Dialog`, a `DropdownMenu`, a `Select`, a `Toast`, and a `Calendar`. Two familiar instincts, both wrong for 2026 SaaS:
- **Build from scratch** — weeks of work and you *will* ship keyboard-trap and focus bugs; accessible primitives are genuinely hard.
- **`npm install` a styled library** (MUI, Mantine, Chakra) — fast, but you've married someone else's design language and their upgrade cadence; restyling fights the library, and a breaking major is your problem on their schedule.

Name the third path as the 2026 default: shadcn/ui splits behavior from markup. Behavior comes from an audited headless primitive; the markup is Tailwind-styled **source files that land in your repo and become yours.** State the through-line that anchors the chapter: *you own the code, not a dependency.* Preview the practical payoff: by the end you'll have added a `Dialog` to a project, read the file it produced, composed it, themed it, and you'll know exactly when to wrap it and when to fork it.

Connect to prior knowledge explicitly so this feels like a capstone, not a new island: the `cva` variant table and `asChild`/`Slot` polymorphism (Ch 022 L3) and the semantic-token CSS variables and `.dark` variant (Ch 018 L5) are the exact machinery shadcn ships — this lesson is where those pieces snap together into a system.

Keep it warm and brief (≤4 short paragraphs).

---

### Build, buy, or own

The core decision lesson — give it real weight; this is the senior contribution.

Frame three options as a spectrum of *who owns the markup and who owns the upgrade cadence*:
1. **Build it yourself** — you own everything, including the accessibility bugs. Right only for a genuinely novel widget with no primitive.
2. **Install a styled library** — the vendor owns markup and design; you rent it. Coupling to their design system and release schedule is the cost. Right for internal tools where design is not a competitive surface and you'd rather not maintain UI.
3. **shadcn's copy-into-repo** — the primitive vendor owns *behavior* (and ships a11y fixes you pull on your terms); *you* own the markup. Right for SaaS, where design **is** a competitive surface and you need to restyle freely without fighting a dependency.

Make the senior reasoning explicit: the choice is a trade about *where the seam sits*. A styled library puts the seam at the npm boundary — opaque, versioned, theirs. shadcn moves the seam *into your repo* — the styled source is a file you read and edit, the behavior stays an audited dependency. State the honest counter-case plainly so it's not dogma: for an internal admin tool a styled library is often the *correct* call — ownership is a liability you don't want there.

**Component — `StateMachineWalker` (`kind="decision"`).** A short build-vs-buy-vs-own decision walk. This is the canonical "trigger before tool" fit the walker exists for, and it makes the student *move through the order a senior asks the questions in* rather than reading a verdict table.
- Root question: "Does an audited primitive already cover this widget's behavior?" → No → branch toward build (Leaf: *Build from scratch — own behavior + a11y; reserve for genuinely novel widgets*). → Yes → next question: "Is UI design a competitive surface here, or an internal tool?"
  - *Internal tool, design not a differentiator* → Leaf: *Styled library (MUI/Mantine) — rent the markup; ownership is a liability you don't want.*
  - *Product surface, design is a differentiator* → next question: "Will you need to restyle beyond a token tweak?" → Yes/either → Leaf: *shadcn/ui — own the source, audited behavior underneath.*
- Keep leaves to 2–3 sentences each; the lesson lives in the *order*, not any single leaf.

Pedagogical goal: convert a flat pros/cons list into an internalized decision procedure.

---

### What shadcn actually is — and is not

Kill the most common misconception up front: **shadcn is not a component library.** It's a **CLI + a registry** that copies source files into your project. The payoff line: you import from `@/components/ui/button`, *not* from a node module — the components do not live in `node_modules`, and looking for them there is the tell that the model hasn't landed yet.

Teach the physical reality with a file tree so "into your repo" is concrete, not abstract.

**Component — `FileTree`.** Show the project shape after `add`, with the owned files highlighted (bold) and an inline comment on the key line:
```
- src/
  - components/
    - ui/                       # shadcn primitives — copied in, you own these
      - **button.tsx**          # source, yours to read and edit
      - **dialog.tsx**
  - lib/
    - utils.ts                  # cn() lives here (shadcn convention)
  - app/
    - globals.css               # semantic-token CSS variables + @theme
  - components.json             # the config the CLI reads
```
(Aligns with Code conventions file-layout: `components/ui/`, `lib/utils.ts`, tokens in `globals.css`.)

**The dependency surface (recognition, but name it precisely).** What `add` *does* pull into `package.json` — the runtime deps the copied files import:
- `radix-ui` — the unified primitive package (behavior/a11y). **Singular, unified** as of Feb 2026; not `@radix-ui/react-*`. (Or `@base-ui-components/react` if the project chose Base UI at init.)
- `class-variance-authority` (`cva`) and `tailwind-merge` + `clsx` (behind `cn()`) — Ch 022 L3 / Ch 018 L3 own these; name them as already-met.
- `tw-animate-css` — the animation engine shadcn's dialog/sheet/accordion choreography depends on (Ch 021 L5 owns).
- `lucide-react` — the default icon set; tree-shakeable, one component per icon.

Frame these as *peers the components import*, not as "the shadcn package" — there is no shadcn runtime package. Reinforces the model.

Present this as a short labeled list or a tiny `ArrowDiagram` is overkill here — a plain bullet list with one-line roles is enough; the FileTree already carries the spatial model. **Decision: bullet list, no diagram.**

`Term` candidates in this section: **registry** (def: "a server the shadcn CLI reads component source from; the default is shadcn's, but it can be third-party or your team's private one"), **headless primitive** (def: "an interactive component that ships behavior, keyboard handling, and ARIA but no visual styling — you bring the markup").

---

### The three consequences of owning the source

The heart of the "why senior teams pick this" argument. The copy-paste model isn't laziness — it buys three specific things. Teach each as a consequence with its matching cost, so the trade is honest.

1. **You can fork without a PR upstream.** When design diverges past a token tweak, you edit the file. No waiting on a maintainer, no patch-package hack. *Cost:* you've now cut a branch from upstream — including its future a11y fixes. (Forward-link to the fork-threshold section; don't resolve it yet.)
2. **The source is the documentation.** Debugging a misbehaving dropdown means *reading `dropdown-menu.tsx`*, not spelunking source maps into a minified node module. The implementation is right there, in your editor, at your import. *Cost:* you have to actually read it — treating it as a black box collapses the whole model (name this as the #1 way teams misuse shadcn).
3. **You own the upgrades.** There is no `npm update shadcn`. Re-running `add` re-fetches the *current* registry version and overwrites your file; you review the diff and re-apply any local edits. *Cost:* upgrades are a deliberate, reviewed act, not a lockfile bump.

Land the senior synthesis: this trade is **correct for SaaS** (design is a competitive surface, ownership is leverage) and **wrong for an internal tool** (ownership is a maintenance liability) — same conclusion as the decision walk, now grounded in mechanics.

**Exercise — `Buckets` (classification).** Sort short cards into **"shadcn buys you this"** vs. **"shadcn costs you this."** Items: *"read the implementation in your editor"* (buys), *"no upstream a11y fixes auto-applied"* (costs), *"restyle freely, it's your file"* (buys), *"you review every component upgrade by hand"* (costs), *"fork when design diverges"* (buys), *"no `npm update` for components"* (costs/buys — accept as cost: it's effort). Goal: force the student to hold *both sides* of the trade, which is exactly the senior literacy this lesson teaches. Low-stakes, fast, fits right after the prose.

---

### Adding a component: the CLI workflow

Now the hands-on spine. Recognition on the *full* CLI surface; the daily workflow is exactly two commands.

**`init` — once per project.** `pnpm dlx shadcn@latest init` scaffolds `components.json`, writes the `cn()` util to `lib/utils.ts`, and wires the semantic-token CSS variables into `globals.css`. CLI v4 (2026) can also scaffold a full project template (`--template next`) and picks the primitive engine here via `--base radix` (default) or `--base base`. Name the v4 template ability once; don't dwell.

**`add` — the daily move.** `pnpm dlx shadcn@latest add dialog` copies `dialog.tsx` into `components/ui/` and installs its peers (the unified `radix-ui`, etc.). Add **on demand**, not upfront — name the "I'll add every component now" reflex as the anti-pattern it is: it bloats the bundle and the diff for components you don't use yet. `add button dialog select` takes a list.

**Recognition-only surface (name, don't drill):** `apply <preset>` switches *presets* (theme, fonts, design-system presets) on an existing project — explicitly **not** the primitive engine, which is fixed at init. `migrate` runs mechanical codemods (`migrate radix` moved old projects onto the unified package; `migrate icons` swaps icon libraries). `--dry-run` / `--diff` preview changes. One sentence each, then move on.

**Component — `Steps` + `Code`.** A two-step numbered procedure (`init`, then `add dialog`) with a `bash` code block per step. `Steps` is the right component for an ordered procedure the reader follows. Keep the command blocks tiny.

Show the post-`add` state by referring back to the FileTree (the `dialog.tsx` that appeared) — closes the loop between "I ran a command" and "a file I own showed up."

**Watch-out placed inline here:** importing a shadcn component from `node_modules` — it isn't there; `@/components/ui/...` is the only entry point.

`Term` candidate: **`pnpm dlx`** (def: "pnpm's run-a-package-without-installing command, like `npx`; fetches the shadcn CLI, runs it once, leaves nothing behind"). The student may not have met `dlx` specifically.

---

### components.json: the config the CLI reads

The config that controls every `add`. Don't tour all fields — name the ones a senior touches and why; the rest are recognition.

**Component — `AnnotatedCode`.** One `components.json` block, stepped. This is the textbook `AnnotatedCode` case: a single config file where the student's attention must land on specific fields one at a time. Steps (color-tinted), each ≤6 lines of prose:
1. `"style"` and `"tsx": true` — the preset baseline and TypeScript-on (blue).
2. `"tailwind": { "cssVariables": true }` — **the semantic-token model**, on by default. This is the switch that makes theming a property of CSS variables (the bridge to the theming section); `false` would inline color utilities instead. Tint green — it's the field that matters most.
3. `"aliases": { "components": "@/components", "utils": "@/lib/utils" }` — the import-alias surface; this is *why* `@/components/ui/button` resolves and where `cn()` is found. Tint orange.
4. `"iconLibrary": "lucide"` — the default icon set (violet).
5. `"registries"` — the namespace map for pulling from sources beyond shadcn's default (forward-link to the registries section). Neutral/blue.

Pedagogical goal: `components.json` is not magic config — each field maps to a behavior the student has already seen (the alias that resolves imports, the CSS-variable theming, the icon set). Reading it demystifies the CLI.

**The engine field — handle the currency correction here.** Note that the primitive engine (Radix vs Base UI) is recorded in `components.json` and was chosen at `init`. State plainly: switching it later means re-init or a manual edit + `migrate`; it is *not* a `shadcn apply` operation. (Corrects the chapter outline.) Brief — engine *choice rationale* gets its own short section next.

---

### Radix or Base UI: the engine under the markup

Short, decision-framed. The student picks this once per project at init.

Frame the choice as *which audited behavior layer sits under your owned markup* — both expose the same shadcn component API, so your markup and imports barely change; only the primitive underneath differs.
- **Radix UI** — the broad default: more components, longest track record, the path of least resistance. Unified into a single `radix-ui` package in 2026.
- **Base UI** — leaner, headless-first, from the MUI team; the lighter bundle on a public-marketing surface, and actively shipping.

Give the 2026 senior default honestly and with a hedge grounded in current reality: **default to Radix** for a SaaS app dashboard (breadth wins); **reach for Base UI** when bundle size on a public, content-heavy surface is the binding constraint. Mention the live nuance lightly — Radix's pace slowed post-acquisition while Base UI is shipping actively — so the student understands this is a *moving* default, not a law. Keep it to a short paragraph plus a two-row comparison; do **not** build a heavy diagram.

**Watch-out inline:** don't mix engines in one project — pick one at init; a codebase with both Radix and Base primitives fights itself.

---

### Composing a primitive with asChild

The one piece of *syntax* worth real teaching time, because it recurs in every dialog, dropdown, popover, menu, and sheet the rest of the course writes. The student met `asChild`/`Slot` in Ch 022 L3 as a *concept*; here they see it as the *daily composition idiom* on a real compound component.

**Compound-component shape first.** Every shadcn primitive is a set of parts, not one element. Show the `Dialog` family: `<Dialog>`, `<DialogTrigger>`, `<DialogContent>`, `<DialogHeader>`, `<DialogTitle>`, `<DialogDescription>`, `<DialogFooter>`. Name *why* it's split this way — each part is a styled slot you arrange, and the structure is what lets the primitive wire ARIA relationships (title ↔ dialog, trigger ↔ content) for you.

**`asChild` — the merge, not the wrap.** The trigger renders its *own* element by default. `asChild` tells it to *merge its behavior onto your child element* instead of rendering a wrapper — so `<DialogTrigger asChild><Button variant="outline">Open</Button></DialogTrigger>` gives you a real shadcn `Button` that *is* the trigger, not a button nested inside a trigger. Tie back to `Slot` from Ch 022 L3: `asChild` is the prop, `Slot` (from `radix-ui`) is the mechanism — the trigger uses `Slot` to forward its props/ref/handlers onto the single child.

**Component — `CodeVariants`** (two tabs, before/after framing of the *wrong* vs *right* composition). This is the ideal `CodeVariants` use: two versions of the same JSX where the difference is one prop.
- Tab **"Without `asChild` (double element)"** — `<DialogTrigger><Button>Open</Button></DialogTrigger>` renders a `button` inside a `button`-ish wrapper: invalid/awkward nesting, doubled semantics. Prose: the trigger emits its own element *and* you nested a Button — two interactive elements where you wanted one.
- Tab **"With `asChild` (merged)"** — add `asChild`; now the `Button` *is* the trigger. Highlight the `asChild` token. Prose: one element, your Button's styling, the trigger's behavior and ARIA wiring.

**Component — `Code`** for the full minimal working `Dialog` (trigger + content + title + description + a close), so the student sees the assembled shape once end-to-end. Keep it to the parts that matter; this is the artifact they installed two sections ago, now wired up.

Pedagogical goal: name the pattern *out loud, once,* on the example it'll recur on — so when L3/L4 and every project reach for `<...Trigger asChild>` it's recognition, not novelty.

`Term` candidate: **compound component** (def: "a component exposed as a set of cooperating parts — `Dialog`, `DialogTrigger`, `DialogContent` — that share state implicitly; you arrange the parts, the set wires the relationships"). (May reuse the Ch 022 L2 framing; keep concise.)

---

### Theming through semantic tokens

Where customization actually lives. Short — Ch 018 L5 *owns* the token mechanics; here the job is to show that shadcn *uses* exactly that machinery, so the student knows the lever to pull.

shadcn writes a family of CSS variables into `globals.css` — `--background`, `--foreground`, `--primary`, `--primary-foreground`, `--muted`, `--destructive`, `--ring`, `--border` (name them as a set, not exhaustively) — and maps Tailwind utilities to them via `@theme` (Ch 018 L5). The component files reference `bg-primary text-primary-foreground` etc., never raw colors.

The two senior payoffs to state crisply:
- **Theming = editing the variables, not the components.** Restyle the whole app by changing `--primary` once; every primitive follows because they all read the token. The components are theme-agnostic by construction.
- **Dark mode is the same names under a `.dark` class.** Flip the class, the variables re-resolve, every component re-themes — no component edits. (Direct callback to Ch 018 L5.)

Name the generator workflow as **recognition only**: visual theme generators (the shadcn theme editor / `tweakcn`-style tools) emit a block of CSS variables you paste into `globals.css`. One sentence — don't tutorialize it.

**Component — a tiny `Code` block** showing a few `:root` token lines and the `.dark` override of the same names, to make "same names, two values" concrete. No diagram needed; the token-swap is better shown as code than drawn.

Forward-link (one clause): *which* token-on-token pairs must pass contrast (e.g. `--primary-foreground` on `--primary`) is an accessibility commitment — that's L2's job; here we only locate where the colors live.

---

### When to wrap, when to fork

The highest-value judgment call in the lesson, and the place where I deliberately **diverge toward the Code conventions** over the chapter outline's looser framing.

**The reconciliation (note for downstream agents).** The chapter outline says a redesigned `Select` "is a fork — edit the file in `components/ui/` directly." The Code conventions (the canonical code authority) draw a *tighter* line: *don't* fork a primitive to customize visual specifics — **wrap and compose at the app level** (`components/<feature>-button.tsx` wrapping `<Button>`); fork (edit `components/ui/`) **only when the primitive's abstraction itself is wrong** (its API can't admit a state your product needs). Teach the conventions' line — it's the better senior default and it keeps the student on the upgrade path. This is a deliberate divergence from the chapter outline; flagged so it isn't "corrected" back.

Teach a three-rung escalation ladder (least to most invasive — defaults before power tools):
1. **`className` override** — a one-off spacing/color/size tweak at the call site. `cn()` puts `className` last so your override wins (Ch 018 L3). Reach here first, always.
2. **A new `cva` variant** — a *repeated* visual variation (a `variant="brand"` button used across the app) goes into the variant table on the existing file. Still owning-via-extension, upstream-compatible.
3. **Wrap-and-compose** — product behavior layered on top (a `<SubmitButton>` that wraps `<Button>` with a pending spinner and `disabled` wiring) lives in `components/<feature>-button.tsx`, importing the primitive. The primitive stays pristine and upgradeable.
4. **Fork (last resort)** — edit `components/ui/` *only* when the abstraction is wrong: the primitive's API genuinely can't express what you need. Comment the edit with the senior call (why the fork was necessary). Accept that you've left the upgrade path for that file — including its future a11y fixes.

Make the cost of forking vivid: a fork is a standing liability — every upstream improvement (especially accessibility fixes) now requires a manual merge. **Audit before forking; try rungs 1–3 first.** The git diff on a forked file is its only documentation, so the comment matters.

**Upgrades & forks interact.** Re-running `add` overwrites the file → review the diff, re-apply fork edits, commit. State this as the concrete upgrade discipline; it's why rung 4 is expensive.

**Component — `StateMachineWalker` (`kind="decision"`)** *or* a compact `ArrowDiagram` ladder — **prefer the walker** here too, for the same reason as the build-vs-buy section: the value is the *order* of escalation. Root: "How far does the change go?"
- "One-off look tweak" → Leaf: *`className` at the call site.*
- "Repeated visual variant" → Leaf: *Add a `cva` variant on the file.*
- "New product behavior on top" → Leaf: *Wrap in `components/<feature>-*.tsx`.*
- "The primitive's API can't express the state I need" → Leaf: *Fork — edit `components/ui/`, comment the call, accept the upgrade cost.*

(One decision walk per lesson is ideal; if two walkers feel heavy, render *this* one as the walker and demote the build-vs-buy section to prose + the `Buckets` already there. **Author's call — default to walker here, since the escalation order is the single most transferable takeaway.**)

**Watch-outs inline:** forking on first divergence (try rungs 1–3); checking in `pnpm-lock.yaml` peer bumps from an `add` without testing the dialog/sheet behavior (the primitives depend on specific Radix versions for their a11y wiring — name this consequence concretely).

---

### Where components come from: registries and blocks

Close by widening the aperture — recognition only, but it's vocabulary the student will hit immediately in the wild. Keep it brief; no exercise.

**The registry & namespace model.** `add` defaults to shadcn's own registry, but `components.json#registries` maps **namespaces** to other sources: third-party registries (`@shadcnblocks`, `@kibo`, …) and a **team-private registry** for shared internal patterns. You then install with `add @namespace/component` — same command, different source. The senior reach: a private registry lets a team distribute a branded `OrgSwitcher` or `ProTable` to every app the *same way they install a `Button`*. Registry *authoring* is out of scope — **consumption** is the daily skill; name authoring's existence in half a sentence.

**Blocks vs components.** Components are atomic (`<Button>`). **Blocks** are whole composed sections — `dashboard-01`, `login-04`, `pricing-02` — copied as a *starting point* for a screen, then trimmed to fit. The 2026 registry ships these in bulk. Frame the workflow: reach for a block as scaffold, then own and cut it down — same copy-into-repo model, larger unit. Just name the term so it's recognized later (Chapter 028's project surfaces this).

**One-line recognition each (no dwelling):**
- `package.json#imports` target aliases — shadcn can resolve the `#name` private-alias syntax so a team keeps a stable alias even if files move; default `@/components/ui` is fine.
- `lucide-react` icons are typed `LucideIcon` (importable) — reach for that type when a prop or registry slot must accept any icon by reference.

`Term` candidate: **block** (def: "a full pre-composed UI section — a dashboard, a login screen — copied in as a scaffold and trimmed, vs. a single-element component").

---

### External resources (optional `ExternalResource` cards)

- shadcn/ui docs — CLI & `components.json` reference (current v4).
- shadcn changelog (Radix unification, Base UI, CLI v4) — for the moving-target context.
- Radix UI / Base UI primitives docs — the behavior layer.

Keep to 2–3 cards; this lesson is dense enough.

---

## Scope

**This lesson teaches:** the build-vs-library-vs-own decision; what shadcn physically is (CLI + registry, source into `components/ui/`, no runtime package); the dependency surface (recognition); the three ownership consequences; the `init`/`add` daily workflow (recognition on the rest of the CLI); the `components.json` fields that matter; the Radix-vs-Base engine choice; `asChild` compound-component composition; where theming lives (semantic tokens, pointer to Ch 018 L5); the wrap-vs-fork escalation ladder; the registry/namespace and blocks vocabulary (recognition).

**Out of scope — defer, do not teach:**
- **Accessibility commitments at the discipline level** (keyboard, contrast, reduced motion, target size) — **L2 of this chapter.** Here, accessibility appears *only* as a consequence of the ownership model ("the primitive solves a11y for its surface; don't undo it; you own the rest"). Do not enumerate the four commitments.
- **ARIA roles/labels/descriptions/live regions, icon-only-button labels** — **L3.** When the icon-only-button case is tempting (it isn't really, here), defer it.
- **Focus management, focus traps, route-change focus, skip links** — **L4.** May *name* that Radix's `Dialog` handles its focus trap (as evidence the primitive does a11y work for you), but do not teach the trap contract or any custom focus code.
- **Loading/empty/error/populated states, `Skeleton`/`Empty`/`Alert`, discriminated-union state** — **L5.**
- **`cva` mechanics, the variant table, `VariantProps`, `compoundVariants`** — **Ch 022 L3 owns.** Use `cva` as already-known; reference, don't re-teach. A "new variant" rung in the fork ladder may *mention* adding to the table without teaching its syntax.
- **`asChild`/`Slot` first principles** — **Ch 022 L3 owns.** Here it's applied as a daily idiom on a compound component; re-state the one-sentence definition, don't re-derive.
- **Semantic-token CSS variables, `@theme`, the `.dark` variant mechanics, OKLCH** — **Ch 018 L5 owns.** Locate where shadcn's tokens live and that theming = editing them; don't teach how `@theme` or OKLCH work.
- **`tw-animate-css` mechanics / the `data-[state=open]:animate-in` choreography** — **Ch 021 L5 owns.** Name it as a dependency only.
- **`next-themes` / the `ThemeProvider` / FOUC-free toggle** — **Ch 018 L6 owns**, consumed in Ch 028. Don't wire it here.
- **The chapter project that consumes the system** (themed product surface, mobile drawer, theme toggle) — **Ch 028.** This lesson sets up the model; the project applies it.
- **Toast/Sonner setup** — named at most in passing under live regions in **L3**; not here.

**Prerequisites to restate concisely (one line each, not re-teach):** `cn()` = `clsx` + `tailwind-merge`, `className` last (Ch 018 L3). `asChild`/`Slot` = polymorphism without an `as` prop (Ch 022 L3). Semantic tokens + `.dark` = theme as CSS variables (Ch 018 L5). React 19 typed-props component shape (Ch 022 L1).
