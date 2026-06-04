# Lesson 8 — Feature grid with CVA card variants

## Lesson title

Chapter-outline title fits. Keep: **Feature grid with CVA card variants**.
Sidebar short title: **Feature grid**.

## Lesson type

`Implementation`

## Lesson framing

The student installs the senior reflex of making invalid visual states unrepresentable: instead of a pile of boolean style props, the feature card exposes two closed unions (`tone`, `emphasis`) through one `cva` variant table, so the data file — not ad-hoc `className` overrides — decides how every card looks, and a typo can't produce a card that doesn't exist. They ship a responsive three-column feature band whose cards theme for free off semantic tokens. The payoff is the design-system muscle from Chapter 022 cashed out on a real surface: one variant table replacing combinatorial prop sprawl.

## Codebase state

**Entry.** The provided scaffold runs; `pnpm dev` serves the page shell. Lessons 6 (site header) and 7 (hero + theme-aware image) are done — `SiteHeader` and `Hero` render. `src/app/page.tsx` already mounts `<FeatureGrid />` between `<Hero />` and `<PricingTable />`. The two target files are TODO scaffolds: `src/components/feature-card.tsx` exports a `FeatureCardProps` type (with `tone`/`emphasis` as plain optional unions) and a stub `FeatureCard` returning `<article data-testid="feature-card">{title}</article>`; `src/components/feature-grid.tsx` returns a bare `<section id="features" data-testid="feature-grid"><h2>Features</h2></section>`. `src/lib/data.ts` already imports `FeatureCardProps` from the card and exports `features: FeatureCardProps[]` (3 entries, each with `title`, `description`, `icon`, `tone`, `emphasis`). The shadcn `Card` family (`CardHeader`/`CardTitle`/`CardDescription`/…) is provided in `src/components/ui/card.tsx`.

**Exit.** `feature-card.tsx` carries the `featureCardVariants` `cva` table (`tone`: default/brand/muted, `emphasis`: quiet/loud, with `defaultVariants`), `FeatureCardProps` now derives the variant props via `VariantProps<typeof featureCardVariants>`, and `FeatureCard` is an `<article>` composing the shadcn header building blocks with a token-backed icon container. `feature-grid.tsx` renders the `<h2>` intro plus a `grid-cols-1 md:grid-cols-3` band mapping `features`. The feature section renders three data-driven cards at desktop, one column below `md`, and recolors with the active theme. `pnpm verify` passes.

## Lesson sections

### Goal + Finished result (intro, no header)

One-sentence goal in user terms: a responsive three-column band of feature cards whose tone and emphasis are chosen from data, collapsing to a single column on mobile. Follow with a one-paragraph description (or screenshot reference) of the working result: three cards in a row at 1280 px, each styled per its data-driven tone (one brand-tinted and lifted, one default, one muted), stacking to one column below `md`. Use `Screenshot` (desktop + mobile via `TabbedContent`) if a captured image is available; otherwise a tight prose description.

### Your mission

Prose paragraph (no subsection headers, no implementation hints) framing the capability in project terms: this is where the design-system muscle pays off — the card should expose one `tone` union and one `emphasis` union so invalid visual states are unrepresentable and the data file decides each card's look, rather than a tangle of boolean props. Weave in the constraints: colors come only from semantic tokens (`--primary`, `--muted`, `--foreground` / their utility forms), never literal hex, so cards theme for free; the card composes the shadcn header building blocks by hand rather than dropping in a whole `<Card>` block; the `<h2>` must not skip a level from the hero's `<h1>`. State out of scope in one line: per-card hover motion, and any fourth column or carousel.

Then the requirements checklist — the only list in the section, rendered with `Checklist`/`ChecklistItem`, each item tagged `[tested]` or `[untested]`. Phrase each as an observable outcome, never a file/export.

1. The grid renders one card per entry in `features`, each showing its icon, title, and description. `[tested]`
2. Each card's tone and emphasis reflect the values set in the data, with no invalid combination expressible. `[tested]`
3. At desktop the cards form three columns; below `md` they collapse to one column with no horizontal scroll. `[untested]`
4. The section is introduced by an `<h2>` with no heading-level skip from the hero's `<h1>`. `[untested]`
5. Card colors respond to the active theme because they read semantic tokens, not literal colors. `[untested]`

Test-coder note: items 1–2 are the assertable core (card count matches data length; rendered classes/markup reflect the per-card `tone`/`emphasis` from `data.ts`, and the variant prop types reject an out-of-union value). Items 3–5 are visual/manual and live in the by-hand checklist + the reference solution.

### Coding time

One-line build prompt directing the student to fill `src/components/feature-card.tsx` and `src/components/feature-grid.tsx` against the brief and the tests. Then the reference solution hidden in `<details>` (writer wraps it). Organize as the two files appear in the repo.

`feature-card.tsx` — show the full file. Use `AnnotatedCode` so focus lands on the three distinct parts in turn: (a) the `featureCardVariants = cva(base, { variants: { tone, emphasis }, defaultVariants })` table — base string carries the card surface (`rounded-xl border border-border bg-card py-6 text-card-foreground shadow-sm`); `tone` maps `default: ''`, `brand: 'border-primary/20 bg-primary/5'`, `muted: 'bg-muted'`; `emphasis` maps `quiet: ''`, `loud: 'shadow-md ring-1 ring-primary/20'`; (b) `FeatureCardProps = ComponentProps<'article'> & VariantProps<typeof featureCardVariants> & { title; description; icon: LucideIcon }`; (c) the `FeatureCard` `<article>` (`data-testid="feature-card"`, `className={cn(featureCardVariants({ tone, emphasis }), className)}`, spreading `...props`) wrapping `CardHeader` with a token-backed icon span (`bg-primary/10 text-primary`, the `Icon` at `size-5`), `CardTitle`, `CardDescription`.

`feature-grid.tsx` — show the full file with `Code`: the `<section id="features" data-testid="feature-grid">` at `container mx-auto`, the intro block (`<h2>` + supporting `<p>` in `text-muted-foreground`), and the `grid grid-cols-1 gap-6 md:grid-cols-3` mapping `features` into `<FeatureCard key={feature.title} {...feature} />`.

Decision rationale (one or two sentences each):
- Why one `tone` union and one `emphasis` union beat three booleans: with booleans, `N` flags give `2^N` combinations the type permits but the design doesn't; a `cva` table enumerates only the real states, so invalid combinations are unrepresentable and the spread (`{...feature}`) wires data straight to variants. Covers requirement 2's "no invalid combination expressible."
- Why `VariantProps<typeof featureCardVariants>` instead of hand-written `tone?`/`emphasis?` unions (as the scaffold had): the variant table is the single source of truth — adding a `tone` value updates the prop type automatically, no second edit. Link the CVA + `VariantProps` material (lesson 3 of chapter 022) rather than re-explaining.
- Why compose `CardHeader`/`CardTitle`/`CardDescription` piecewise rather than the whole `<Card>`: the `<article>` itself is the card surface (the base `cva` string), so wrapping in `<Card>` would double the border/padding; the header sub-parts give the internal rhythm without a second box.
- Coverage of untested requirements: card colors use only token utilities (`bg-card`, `bg-primary/5`, `bg-muted`, `text-card-foreground`, `text-primary`) so theme-switching is automatic (req 5); the grid is `grid-cols-1 md:grid-cols-3` for the responsive collapse (req 3); naming — `featureCardVariants` follows the `…Variants` convention of the shadcn `buttonVariants`; `key={feature.title}` is a stable, content-derived key. The `<h2>` lives in the grid section, one level below the hero's `<h1>` (req 4).
- Callout on what looks unusual: the icon `<Icon className="size-5" />` is rendered from a `LucideIcon` component passed *through data* (`icon: Zap`), not imported in the card — the card stays content-agnostic. No diagram needed; the flow is linear.

Link rather than re-explain: CVA + `VariantProps` and the `cn()` merge order — lesson 3 of chapter 022; `dark:`/`.dark` token recoloring — lesson 5 of chapter 018; CSS Grid responsive columns — lesson 3 of chapter 020; semantic-token model — lesson 4 of chapter 019.

(External resources, if any, are appended by the resourcer after the `<details>`, no header.)

### Moment of truth

Command: `pnpm test:lesson 8` (and `pnpm verify` for the Biome + typecheck + build gate). Show the expected pass output (the lesson-8 suite green). Note: at authoring time `tests/lessons/Lesson 8.test.ts` is a `describe.todo` placeholder — the test-coder writes the assertions for requirements 1–2 against the `data-testid` hooks; the harness and config are already in place. Then a by-hand checklist (`Checklist`) for the visual requirements 3–5: at 1280 px three columns; below `md` one column with no horizontal scroll; the `<h2>` reads correctly in the DevTools accessibility heading outline (no skip from `<h1>`); toggle the OS/theme and confirm card colors follow because they are token-backed.

## Scope

- Does not build the pricing row or its featured-tier lift / `motion-reduce:` handling — Lesson 9.
- Does not add per-card hover or scroll motion; reduced-motion discipline is exercised in Lesson 9 (pricing lift) and the chapter's motion commitment from Lesson 1.
- Does not introduce CVA itself or `VariantProps` mechanics — taught in lesson 3 of chapter 022; this lesson applies them.
- Does not cover the theme toggle UI (the active theme is switched via OS preference here) — Lesson 11.
- Does not re-teach the semantic-token model or `dark:` flip — chapters 019 and 018.
