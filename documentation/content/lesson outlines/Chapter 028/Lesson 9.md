# Chapter 028 — Lesson 9 outline

## Lesson title

Page title: **Pricing table with a featured tier**
Sidebar: **Pricing table**

(Chapter-outline title fits; keep it.)

## Lesson type

`Implementation` — the test-coder runs for this lesson; the writer renders the Implementation section list (Goal + Finished result / Your mission / Coding time / Moment of truth).

## Lesson framing

The student installs the senior reflex that *visual emphasis is data, not markup*: a single `featured` flag in `pricingTiers` drives the accent ring, the badge, and the scale lift across the whole table, so a fourth tier or a moved "most popular" never touches a component. Shipped alongside is the accessibility floor that pricing pages routinely break — the lift is gated behind `motion-reduce:` so reduced-motion users get a static layout, and muted price text holds AA contrast because it rides the provided tokens. The payoff is a pricing band where promotion is declarative and the motion/contrast traps are pre-empted by construction, not patched after a Lighthouse fail.

## Codebase state

**Entry.** The toolchain (Lessons 2-5) is understood and the surface is partly built: `site-header.tsx` (L6), `hero.tsx` + `theme-aware-image.tsx` (L7), and `feature-card.tsx` + `feature-grid.tsx` (L8) are implemented. `page.tsx` already mounts `<PricingTable />` between `<FeatureGrid />` and `<SiteFooter />`. The two L9 files are start scaffolds: `pricing-card.tsx` exports the full `PricingCardProps` type but the component renders only `{name}` inside a bare `<article>` with the correct `data-testid`; `pricing-table.tsx` renders an empty `<section id="pricing" data-testid="pricing-table">` with a placeholder `<h2>Pricing</h2>`. The provided `src/lib/data.ts` exports `pricingTiers: PricingCardProps[]` — three tiers (Starter $0, Pro $19 `featured: true`, Team $49), each with `name`/`price`/`period`/`features[]`/`cta`. The shadcn `Card` family, `Button`, and `Badge` primitives are in `@/components/ui/`. `pricingTiers` imports `PricingCardProps` *from* the card component, so the props type must keep its public shape.

**Exit.** `pricing-card.tsx` renders a full `<article>` card (header with tier name, price, period; feature list with check rows; footer CTA) whose `featured` branch adds the accent ring, the "Most popular" badge, and a `default`-variant button. `pricing-table.tsx` maps `pricingTiers` into a responsive `md:grid-cols-3` band and passes the `md:scale-105 md:motion-reduce:scale-100` lift only to the featured card. `pnpm dev` shows three tiers at desktop with Pro accented and lifted, stacked below `md`, static under reduced motion. `pnpm verify` (Biome + typecheck + build) passes.

## Lesson sections

Implementation lesson. Section order and headers fixed by the contract: intro (no header) → **Your mission** → **Coding time** → **Moment of truth**.

### Goal + Finished result (intro, no header)

One-sentence goal in user terms: ship a pricing band driven by `pricingTiers` where one tier reads as "most popular" and reduced-motion users get a flat layout. Follow with a one-paragraph description (or a `Screenshot` in `TabbedContent` if a finished-state image is available) of the working feature: three cards in a row at desktop with Pro accented and lifted, stacking to one column below `md`. Keep it to the visible outcome — no implementation detail leaks here.

### Your mission

Prose brief, no implementation hints, weaving feature + requirements + constraints + out-of-scope into coherent paragraphs. Use the `Checklist` component (`tested`/`untested` chips) for the numbered requirements.

**Feature.** A responsive pricing table built from data: one card per tier showing name, price, period, feature list, and CTA, with the data-flagged tier promoted as "most popular."

**Functional requirements** (numbered; each tagged):
1. The table renders one card per entry in `pricingTiers`, each showing name, price, period, feature list, and CTA. `[tested]`
2. The tier flagged `featured` is visually distinct — accent ring plus a "Most popular" badge — and no other tier is. `[tested]`
3. The featured tier's scale lift is suppressed when the user prefers reduced motion. `[tested]`
4. At desktop the tiers form three columns; below `md` they stack with no horizontal scroll. `[untested]`
5. The muted price/period text meets AA contrast against its background. `[untested]`
6. The decorative check icons carry no misleading accessible text. `[untested]`

**Constraints** (woven into prose, no header). Emphasis must be data-driven — the single `featured` flag produces the accent, badge, and lift; nothing is hand-placed per tier. The lift must not punish reduced-motion users. Colors come only from semantic tokens (`text-muted-foreground` over `bg-background` already clears AA — do not invent colors).

**Out of scope** (one line). A monthly/yearly toggle and real checkout — the CTAs are anchor links into `data.ts`.

Phrase every requirement as a verifiable outcome, never as a file/export. The brief contains no class names or component-tree hints.

### Coding time

One-line build prompt ("fill `src/components/pricing-card.tsx` and `src/components/pricing-table.tsx` against the brief and the tests"), then the reference solution in `<details>` (writer wraps it). Present the two files in repo order: card first, then table.

Code-sample handling: use `Code` (Expressive Code) for both files — they are short and read top-to-bottom. Reach for `AnnotatedCode` on `pricing-card.tsx` only if directing focus to the three `featured`-driven decision points at once (the `data-testid` ternary, the `cn()` accent line, the `variant={featured ? 'default' : 'outline'}` button) reads better stepped than as callout prose; default to `Code` plus inline rationale. No `CodeVariants`/`CodeTooltips`/`FileTree` needed.

Reference implementation to surface (organized as in the repo):

`src/components/pricing-card.tsx`
- `PricingCardProps = ComponentProps<'article'> & { name; price; period: 'month' | 'year'; features: string[]; featured?: boolean; cta: { label; href } }` — the start scaffold ships `PricingCardProps` *without* `ComponentProps<'article'>`; the solution intersects it so the table can pass `className` through. Call this out: the spread of native article props is what lets the table own the lift.
- Destructure `featured = false`, `className`, `...props`; `data-testid={featured ? 'pricing-card-featured' : 'pricing-card'}`.
- Base classes hand-rolled on the `<article>` (not a `<Card>` wrapper) — `flex flex-col gap-6 rounded-xl border border-border bg-card py-6 text-card-foreground shadow-sm` — merged via `cn()` with `featured && 'border-primary shadow-md ring-1 ring-primary'` then the incoming `className`. Rationale: the article *is* the card surface; composing `CardHeader`/`CardContent`/`CardFooter` building blocks by hand (mirroring L8) gives per-section control without the full `Card` block.
- Header: `<Badge>Most popular</Badge>` rendered only when `featured`; `<h3>` tier name (covers no-heading-skip from the section `<h2>`); price as `text-4xl font-bold text-foreground` with `/ {period}` in `text-muted-foreground` (requirement 5 — AA via tokens).
- Content: `<ul>` mapping `features`, each `<li>` a `<Check className="size-4 text-primary" />` + `text-sm text-muted-foreground` label.
- Footer: `<Button asChild className="w-full" variant={featured ? 'default' : 'outline'}><Link href={cta.href}>{cta.label}</Link></Button>` — `asChild`/`Slot` reused (link rather than re-explain).

`src/components/pricing-table.tsx`
- `<section id="pricing" data-testid="pricing-table">` at `container mx-auto` width with the heading block (`<h2>` + supporting `<p>`).
- `grid grid-cols-1 items-start gap-6 md:grid-cols-3` mapping `pricingTiers`, key on `tier.name`, spread `{...tier}`.
- The lift: `className={tier.featured ? 'md:scale-105 md:motion-reduce:scale-100' : undefined}` — **the table, not the card, owns the lift.** Rationale callout: keeps the card a pure presentation of one tier and concentrates the responsive/motion concern in the layout owner. Note `items-start` so the scaled card doesn't stretch its row siblings.

Decision rationale to state (one or two sentences each): why one `featured` flag beats per-tier markup (requirement 2 — emphasis declarative, a moved flag re-promotes with zero component edits); why the lift is paired with `motion-reduce:` (requirement 3 — `md:scale-105` only applies at `md+`, and `md:motion-reduce:scale-100` zeroes it for users who asked for less motion); why tokens cover contrast (requirement 5).

Coverage of `[untested]` requirements in prose: requirement 4 (the `grid-cols-1 md:grid-cols-3` reflow), requirement 5 (token-backed muted text), requirement 6 — the lucide `<Check />` renders a bare `<svg>` with no text node, so it carries no *misleading* accessible name; the solution does not individually `aria-hidden` each icon. Add a one-line callout: a stricter a11y pass would add `aria-hidden`, but the bare svg already satisfies the requirement as written; link the ARIA icon rules (lesson 3 of chapter 027) rather than re-explaining.

Links rather than re-explanation: `prefers-reduced-motion` / `motion-reduce:` (lesson 5 of chapter 021); CVA/`Slot`/`asChild` Button shape (lesson 3 of chapter 022); the hand-composed Card building blocks established in L8; ARIA icon rules (lesson 3 of chapter 027).

No diagram — the flow is two short files of static JSX; prose carries it.

### Moment of truth

Command: `pnpm test:lesson 9` (and `pnpm verify` for the Biome + typecheck + build gate). State the expected pass output (a green Vitest run for `Lesson 9.test.ts`). Then a by-hand `Checklist` for what the tests don't assert: at 1280 px three columns with Pro accented and lifted; below `md` stacked, no horizontal scroll; enable "Emulate reduce motion" in DevTools Rendering and confirm the lift drops to flat; run a contrast check on the muted price/period text and confirm AA.

Note for the writer: the shipped `tests/lessons/Lesson 9.test.ts` is currently a `describe.todo` placeholder — the test-coder fills it. The `data-testid` hooks (`pricing-table`, `pricing-card`, `pricing-card-featured`) and the public `PricingCardProps` shape are the stable contract to assert against; the test-coder should target the `[tested]` requirements (1, 2, 3) through observable DOM, not file paths.

## Scope

- The flicker-free `next-themes` mechanics and the theme toggle control itself — Lesson 11.
- The mobile drawer, `Sheet`, focus trap, and `useLockBodyScroll` — Lesson 12.
- Next.js `<Image>` optimization (the CTAs and cards use no images) — Unit 4.
- Real checkout / Stripe and plan entitlements — Unit 11.
- The CVA variant-table pattern is owned by L8 (`feature-card`); L9 reuses the hand-composed Card building blocks but introduces no new variant table — reference L8, don't re-teach.
