# Chapter 4.11 — shadcn/ui and the accessibility baseline

## Chapter framing

Chapter 4.10 closed the hook surface and the React Compiler. Chapter 4.11 lands the component system the rest of the course builds on — shadcn/ui — and the accessibility discipline that ships with it. The senior framing is that in 2026 a SaaS team does not build buttons, dialogs, dropdowns, and date pickers from scratch; they take an audited, accessible primitive (Radix or Base UI) and own the markup via shadcn's copy-into-repo model. The chapter is the bridge from "I can write a React component" (Chapter 4.6) to "I can ship a screen out of a system" (Chapter 4.12 project, every project after).

Several threads run through every lesson. **You own the code, not a dependency** — shadcn ships source files into `components/ui/`, not a package, and the senior consequence is that you can fork, you can audit, and you must maintain. **Accessibility is non-negotiable at the discipline level** — keyboard, contrast, reduced motion, focus order are not afterthoughts but defaults; per-element specifics were taught at their call sites in 4.1–4.6 and are now consolidated as commitments. **Semantic HTML is the first move, ARIA the second** — the "first rule of ARIA" frames every lesson: native elements first, ARIA only when no semantic equivalent exists. **Live state must be perceivable** — loading, empty, error, and success states are part of the contract, not decoration; live regions surface async changes to screen readers. **Focus is state** — modals, route changes, and post-submission flows are explicit focus-management problems the platform does not solve for you. The chapter ships five teaching lessons plus the quiz, feeding directly into 4.12 (themed product surface with mobile drawer, focus trap, and theme toggle). Forward references: Chapter 5.3 (Suspense and route-level loading), Chapter 7.3 (forms, validation messages, `aria-invalid`/`aria-describedby` wiring at depth), Chapter 11.1 (empty/loading/error at the list-view scale), Chapter 17.2 (security baseline), Chapter 20.4 (Lighthouse and axe in CI).

---

## Lesson 4.11.1 — Own the source, not the dependency

Teaches the shadcn/ui copy-into-repo model — the CLI workflow, `components.json` config, Radix-vs-Base engine choice, `asChild` slot composition, semantic-token theming, the fork threshold, and the registry namespace system.

Topics to cover:

- **The senior question.** A team needs a `Dialog`, a `DropdownMenu`, a `Select`, a `Toast`, and a `Calendar`. Building from scratch costs weeks and ships accessibility bugs; pulling a styled package (MUI, Mantine) couples you to someone else's design and upgrade cadence. shadcn/ui is the 2026 default because it splits the seam: the *behavior* comes from an audited primitive (Radix UI by default, Base UI as alternative), the *markup* lives in your repo as Tailwind-styled source files you own.
- **What shadcn/ui is — and is not.** Not a component library. A CLI plus a registry that copies source files into `components/ui/` in your project. You import from `@/components/ui/button`, not from a node module. The dependency graph: `@radix-ui/react-*` (or `@base-ui-components/react`), `class-variance-authority`, `tailwind-merge`, `clsx`, `tw-animate-css`, `lucide-react`. Cross-ref 4.6.3 (`Slot`, `cva`), 4.5.5 (`tw-animate-css`).
- **The copy-paste model — why senior teams pick it.** Three consequences of source-in-repo: (1) you can fork a component when design diverges, no PR upstream needed; (2) you read the implementation when debugging, no source-map archaeology; (3) you accept ownership of upgrades — there is no `npm update shadcn`. The trade is correct for SaaS where design is a competitive surface; the trade is wrong for an internal tool where you'd rather not maintain.
- **The CLI in 2026.** `pnpm dlx shadcn@latest init` scaffolds `components.json`, the `cn()` utility, and Tailwind tokens. `pnpm dlx shadcn@latest add button dialog select` copies components and installs Radix peers. `shadcn apply` switches presets (engine, theme, icons) without restarting the project. Recognition only on the full CLI surface; install + add is the daily workflow.
- **`components.json` — the config that matters.** The fields a senior touches: `style` (theme preset), `tsx` (TypeScript on), `tailwind.cssVariables` (semantic-token model, on by default), `aliases.components` and `aliases.utils` (the import-alias surface), `iconLibrary` (`lucide` default). The `registries` field for the namespace model below.
- **The primitive engine choice.** shadcn 2026 supports both Radix UI and Base UI as the underlying primitive. Radix is the broader default (more components, longer track record); Base UI is leaner and headless-first. For SaaS in 2026 the default is Radix unless bundle size on a public-marketing surface is the constraint. Choice is per-project, set at init, switchable via `shadcn apply`.
- **Slot composition revisited.** Every shadcn primitive is a compound component (`<Dialog>`, `<DialogTrigger>`, `<DialogContent>`, `<DialogHeader>`, `<DialogTitle>`, `<DialogDescription>`). The `asChild` prop from 4.6.3 is how you give the trigger your own element — `<DialogTrigger asChild><Button variant="outline">Open</Button></DialogTrigger>`. Naming this pattern out loud once because it appears in every dialog, dropdown, popover, and menu the rest of the course writes.
- **Theming — the semantic-token bridge.** shadcn writes CSS variables (`--background`, `--foreground`, `--primary`, `--muted`, `--destructive`, `--ring`, `--border`) into `globals.css` and maps Tailwind utilities to them via `@theme` (Chapter 4.2.5). Changing the theme is editing the CSS variables; dark mode is a `.dark` class flipping the same names. The `tweakcn` / theme-generator workflow as recognition.
- **When to fork a component.** The senior threshold: when design diverges by more than a class tweak — a custom button variant goes into `cva` variants on the existing file, but a redesigned `Select` with custom anchor positioning is a fork. Edit the file in `components/ui/` directly. The git diff is the documentation.
- **When *not* to fork.** Reach for variants and `className` overrides first. A fork is a maintenance liability — you've cut yourself off from upstream improvements (including accessibility fixes). Audit before forking.
- **The registry and namespace model.** shadcn's namespace system (`@namespace/component`) lets you pull from multiple registries — shadcn's own, third-party (`@shadcnblocks`, `@kibo`, etc.), your private team registry. Configure under `registries` in `components.json`. The senior reach: a team-private registry for shared internal patterns (a branded `OrgSwitcher`, a `ProTable`) imported the same way. Recognition only on registry authoring; consumption is the daily skill.
- **Blocks vs. components.** Components are atomic (`<Button>`); blocks are full sections (`dashboard-01`, `login-04`, `pricing-02`) — composed of multiple components, copied as a starting point for a screen. The 2026 registry ships 1000+ blocks; reach for them as scaffolds, then trim. Naming the term so students recognize it; not a deep treatment.
- **Package imports and target aliases (2026).** shadcn now resolves `package.json#imports` entries (the `#name` private-alias syntax) so a team can keep a long-lived alias even as the file moves. Recognition for senior teams; default install uses `@/components/ui` and is fine.
- **Upgrading shadcn components.** Re-running `add` overwrites the file. The discipline: review the diff, re-apply your fork edits if any, commit. There is no auto-upgrade; this is the price of owning the source.
- **The dependency surface a senior tracks.** Radix peers update with security and a11y fixes — keep them current. `tw-animate-css` is the animation engine; outdated versions break dialog/sheet animations. `lucide-react` is the icon set; tree-shakeable. Each named icon component is typed as `LucideIcon` (importable from `lucide-react`) — reach for it when a prop or registry slot needs to accept any icon by reference. `class-variance-authority` and `tailwind-merge` move slowly.
- **Watch-outs:**
  - Treating shadcn as a black box and never reading the file — the model collapses; the source is the documentation.
  - Forking on first divergence — try `className` + variants first.
  - Mixing engines (Radix and Base) in one project — pick one at init.
  - Editing `components/ui/` files but checking in `pnpm-lock.yaml` changes from peer updates without testing — the components depend on specific Radix versions for accessibility behavior.
  - Importing shadcn components from `node_modules` (they don't live there) — the alias is the entry point.
  - "I'll add every component upfront" — `add` on demand keeps the diff small and the bundle honest.

What this lesson does not cover:

- Accessibility commitments at the discipline level — Lesson 4.11.2.
- ARIA roles, labels, and live regions — Lesson 4.11.3.
- Focus management — Lesson 4.11.4.
- Empty/loading/error UI patterns with `Skeleton` and `Empty` — Lesson 4.11.5.
- `cva` and the variant table — Chapter 4.6.3 (owns).
- Semantic-token CSS variables and the dark variant — Chapter 4.2.5 (owns).
- `tw-animate-css` mechanics — Chapter 4.5.5 (owns).
- The chapter project consuming the system — Chapter 4.12.

---

## Lesson 4.11.2 — The four commitments

Consolidates the four discipline-level accessibility commitments — keyboard navigation, WCAG 2.2 AA contrast, `prefers-reduced-motion`, and touch target size — and names semantic HTML as the first move before any ARIA.

Topics to cover:

- **The senior question.** Accessibility is not a feature added at the end; it is a set of commitments the team holds *while* writing every screen. The lesson consolidates the four discipline-level commitments — keyboard, contrast, motion, target size — that every SaaS UI in 2026 ships against, and names the per-element specifics (already taught at call sites) so the student knows where the surface lives.
- **Why baseline, not exhaustive.** Specific accessibility mechanics live at the elements that need them — `<button type>` defaults in 4.1.4, `<label htmlFor>` in 4.1.5, `:focus-visible` in 4.5.4, `useId` in 4.8.6, semantic landmarks in 4.1.3. This lesson is the senior-mindset frame on top of them: when you commit to these commitments, the call-site practices fall into place. ARIA mechanics get their own lesson (4.11.3); focus management gets its own (4.11.4).
- **The legal and business frame, briefly.** WCAG 2.2 AA is the baseline most jurisdictions and procurement contracts demand (US ADA via DOJ guidance, EU Accessibility Act effective June 2025, UK Equality Act, Canada ACA). Failing it costs deals and lawsuits. The senior frame: accessibility is a quality bar like security, not a charity. No moralizing; the constraint is real.
- **Commitment 1 — keyboard navigation works for every interactive control.** Every clickable element must be reachable by Tab, activatable by Enter or Space (per its role), and dismissable where applicable by Esc. The senior test is a one-line one: unplug your mouse and use your app for five minutes. Cross-ref: `<button>` over `<div onClick>` (4.1.4), the `:focus-visible` ring (4.5.4), Radix primitives handle keyboard semantics for you.
- **The keyboard contract per control type.** Buttons: Enter and Space. Links: Enter. Dropdown/select: Arrow keys move, Enter selects, Esc closes. Dialog: Esc closes, Tab cycles within, Shift+Tab reverses. Disclosure (`<details>` or accordion): Enter and Space toggle. Tab order follows DOM order — manipulating `tabindex` (beyond `0` and `-1`) is a code smell.
- **`tabindex` — the three values that exist.** `0` makes a non-interactive element focusable in document order; reach for it on the rare custom-interactive element where a native control doesn't fit (almost never in a shadcn-using codebase). `-1` makes an element focusable by script only, used by focus-management code (4.11.4). Positive values are an anti-pattern — they reorder focus and break user expectations.
- **Commitment 2 — color contrast meets WCAG 2.2 AA.** 4.5:1 for normal text, 3:1 for large text (18pt+ or 14pt+ bold) and UI components. The senior reflex: design tokens are auditable centrally — a `--primary` that fails contrast on `--background` fails everywhere, so fix once at the token. Tools: Chrome DevTools "Accessibility" pane, axe DevTools extension, the contrast checker built into Figma/the theme generator. Don't audit at the call site; audit the palette.
- **The semantic-token implication.** A theme with `--foreground` on `--background` and `--primary-foreground` on `--primary` makes contrast a *property of the theme*, not the page. Dark mode is a second palette that must pass the same bar.
- **Commitment 3 — respect `prefers-reduced-motion`.** Vestibular disorders affect ~30% of adults at some point. Honor the user preference. Tailwind's `motion-reduce:` variant (`motion-reduce:transition-none motion-reduce:animate-none`) and the CSS `@media (prefers-reduced-motion: reduce)` block in the global stylesheet — disable transforms, opacity transitions, parallax, and looping animations. Cross-ref 4.5.5. shadcn's `tw-animate-css` animations are designed to respect reduced motion when configured.
- **The motion exceptions.** Some motion is communicative (a toast sliding in tells you it appeared). Replace with a non-motion equivalent (instant appearance, color flash) under reduced motion — don't just remove. The principle: convey the same information without vestibular cost.
- **Commitment 4 — touch target size and pointer affordances.** WCAG 2.5.8 (AA in WCAG 2.2): interactive targets at least 24×24 CSS pixels with spacing, 44×44 is the Apple HIG and Material baseline most teams hold. Reach: `min-h-11 min-w-11` (44px in Tailwind's spacing scale) on touch-primary buttons, increased hit area with padding rather than scaling icons. The `(hover: hover)` and `(pointer: coarse)` queries from 4.5.6 let you split styles per input modality.
- **The "first rule of accessibility" — semantic HTML.** Before any ARIA or any custom widget, ask: does a native element do this? `<button>` over `<div onClick>`, `<a>` over `<span onClick>`, `<details>` over a custom accordion, `<dialog>` (or Radix's `Dialog`) over a div with `role="dialog"`. Native elements come with keyboard, focus, and screen-reader semantics for free.
- **The shadcn dividend.** Using Radix primitives via shadcn means the keyboard, focus, and ARIA work is done — your job is to (1) not break it by overriding markup carelessly, (2) hold the four commitments above for the rest of the page, (3) layer in the focus-management and live-region patterns from 4.11.3 and 4.11.4 where the primitive doesn't reach.
- **What you still own with shadcn in the mix.** Page landmarks (`header`, `main`, `nav`, `footer` — Chapter 4.1.3). Heading hierarchy (one `h1` per page, no level skips — Chapter 4.1.3). Form labels (`<label htmlFor>` — Chapter 4.1.5). Color contrast in your tokens. Reduced-motion respect in your custom animations. Focus on route changes (4.11.4). Live regions for async state (4.11.3).
- **Auditing — what a senior runs.** Lighthouse a11y in DevTools as the daily smoke test. axe DevTools (extension) for deeper rules. Keyboard-only nav as a manual pass before merge. Chapter 20.4 owns the CI surface (axe in Playwright, Lighthouse CI).
- **What auditing tools miss.** Automated tools catch ~30% of WCAG issues. The other 70% — heading hierarchy that makes sense, link text that describes destination, alt text that conveys meaning, focus order that matches reading order — needs a human. The senior reflex: a tool's clean report is necessary, not sufficient.
- **Watch-outs:**
  - "We'll do accessibility later" — retrofit is expensive; the commitments cost almost nothing if held from day one.
  - Designing dark mode with reduced contrast for "softness" — fails AA, fails users in bright environments.
  - Disabling focus rings to "clean up" the design — strip the user's only navigation cue. Style them, don't kill them.
  - Animating with `prefers-reduced-motion: no-preference` as the default and forgetting the `reduce` case — invert the default in the global stylesheet.
  - Treating Lighthouse 100 as accessible — automated tools have known coverage gaps.
  - Adding ARIA to compensate for non-semantic markup — fix the markup instead.
  - Hit areas tuned for the designer's pointing precision, not a thumb on a phone.

What this lesson does not cover:

- ARIA roles, labels, and live regions at depth — Lesson 4.11.3.
- Focus management for modals, route changes, and post-submission — Lesson 4.11.4.
- Empty/loading/error UI patterns — Lesson 4.11.5.
- Per-element accessibility specifics (button types, label-for, focus-visible) — Chapters 4.1, 4.5, 4.8 (own).
- Form validation accessibility (`aria-invalid`, `aria-describedby`) — Chapter 7.3.
- axe in CI and Lighthouse CI — Chapter 20.4.
- Internationalization and `lang` attribute beyond the root — Chapter 18.2.

---

## Lesson 4.11.3 — No ARIA is better than bad ARIA

Teaches the four ARIA surfaces a SaaS engineer reaches for — roles, labels, descriptions, and live regions — the icon-only button label pattern, the `sr-only`/`aria-hidden`/`hidden` decision tree, the live-region pre-mount rule, and `role="status"` vs. `role="alert"`.

Topics to cover:

- **The senior question.** Native HTML covers 90% of accessibility for free. The remaining 10% — custom interactive widgets, async state changes, regions that need a screen-reader-only name — is where ARIA earns its weight. The lesson lands the four ARIA surfaces a SaaS engineer reaches for in 2026: roles, labels, descriptions, and live regions; and lands the "first rule of ARIA" as the non-negotiable filter.
- **The first rule of ARIA.** "No ARIA is better than bad ARIA." From the WAI-ARIA Authoring Practices: if a native element does the job, use it. ARIA does not change behavior — it only changes what assistive tech announces. Adding `role="button"` to a `<div>` does *not* make it Enter-activatable; it tells the screen reader the div is a button while still being inert to the keyboard. The fix is `<button>`, not the role.
- **Where ARIA earns its weight.** (1) Custom widgets with no semantic equivalent (a tab list, a tree, a combobox before `<selectlist>` ships universally). (2) Labeling a control without visible text (an icon-only button). (3) Describing a control with help text or an error. (4) Announcing async state changes a sighted user sees visually (toasts, save indicators, validation errors, search-result counts).
- **The shadcn dividend, reframed.** Every Radix/Base primitive in `components/ui/` wires roles and `aria-*` attributes correctly. Your job for those: provide the visible labels (or `aria-label` on icon-only triggers) and let the primitive do the rest. ARIA work is for *your* custom components and *your* live state.
- **Roles — the cut.** The course teaches the roles a SaaS engineer actually writes: `role="alert"` and `role="status"` (covered under live regions below), `role="dialog"` (handled by Radix), `role="presentation"` / `role="none"` (suppressing implicit semantics on a wrapping element), and the awareness that landmark roles (`banner`, `navigation`, `main`, `contentinfo`) are mostly redundant with HTML5 landmark elements (`<header>`, `<nav>`, `<main>`, `<footer>`). The vast `role` taxonomy (tab, treeitem, grid, combobox) is what shadcn already covers — recognition only.
- **Labels — the three mechanisms.** (1) Visible text content as the label — the default for buttons and links. (2) `<label htmlFor>` for form controls (Chapter 4.1.5 owns). (3) `aria-label` for controls with no visible text (icon-only buttons: `<button aria-label="Close">`). (4) `aria-labelledby` pointing at an element's ID when the visible label lives elsewhere (a section's heading labeling a region). One-of, not stacked; precedence is `aria-labelledby` > `aria-label` > content > `title`.
- **Icon-only buttons — the canonical case.** A `<Button size="icon"><X /></Button>` from shadcn must carry `aria-label="Close"` (or a `<span className="sr-only">Close</span>` child). Without it, the screen reader announces nothing or just "button." Pattern named here because it appears in every modal, drawer, toast, and table row the course writes.
- **Descriptions and help text — `aria-describedby`.** Use to associate a control with help text or an error message — `<input aria-describedby="email-help email-error" />`. The screen reader reads the description after the label. Chapter 7.3 owns the validation pattern; this lesson establishes the wiring.
- **`useId` for ARIA wiring.** When labels and descriptions live in separate elements, they need stable IDs that match across SSR and the client. `const id = useId(); <label htmlFor={id} /><input id={id} />`. Chapter 4.8.6 owns the hook; this lesson names the canonical reach.
- **Hidden helpers — `sr-only` vs. `aria-hidden` vs. `hidden`.** `sr-only` (Tailwind utility) makes content visible to screen readers, invisible visually — the canonical reach for skip links, icon-button labels, and descriptive context. `aria-hidden="true"` hides content from assistive tech while leaving it visible — the canonical reach for decorative icons next to a label. `hidden` (or `display: none`) hides from everyone. The decision tree: who needs to perceive this?
- **Decorative vs. meaningful icons.** A `<Mail />` next to "Send" is decorative — `aria-hidden`, the visible word does the work. A standalone `<Mail />` button is meaningful — `aria-label="Compose email"`. Lucide icons default to no role; you decide per call site.
- **Live regions — the four-attribute contract.** (1) `aria-live="polite"` (announce when idle) or `"assertive"` (interrupt) — polite is the default reflex, assertive only for genuine errors. (2) `aria-atomic="true"` to announce the whole region on every change vs. just the changed portion. (3) `role="status"` (polite + atomic implied, the toast-and-status reach) or `role="alert"` (assertive + atomic, the error reach). (4) The element must exist in the DOM *before* the content arrives — screen readers monitor the region, they don't announce its initial render.
- **The pre-mount rule.** A `<div aria-live="polite">{error}</div>` works because the region exists empty and the content is inserted later. A `{error && <div role="alert">{error}</div>}` does *not* reliably announce because the region appears with content already in it. Pattern named here as the most-cited live-region bug.
- **The shadcn `Toast` / `Sonner` example.** `sonner` (shadcn's default toast library in 2026) and the older shadcn Toast both render a persistent live region at the page root and inject toast content into it. Toasts announce automatically — your job is to call `toast.success("Saved")` or `toast.error("Failed to save")`. The wiring is solved; the discipline is choosing the right severity.
- **`role="status"` vs. `role="alert"` — the cut.** `status` for "the form is saving," "search returned 12 results," "draft autosaved." `alert` for "your session expired," "payment failed," "this field is required." Misuse `alert` and you steal screen-reader attention every time; reach for `status` by default.
- **Common SaaS live-region surfaces.** Toasts (handled). Inline form errors (a `role="alert"` next to the field, populated on validation failure — Chapter 7.3 owns the depth). Search-result count ("Showing 12 of 134" announced after a filter — `role="status"` in the results header). Optimistic-mutation indicators ("Saved" badge appearing after a mutation completes — `role="status"`).
- **Watch-outs:**
  - Adding `role="button"` to a div instead of using `<button>` — does nothing for keyboard, misleads the screen reader.
  - Stacking `aria-label`, `aria-labelledby`, and visible content — only one wins; the redundancy confuses maintenance.
  - `aria-label` on a `<div>` with no role — silently ignored by some screen readers. ARIA labels need an element with a role (implicit or explicit).
  - Live regions injected with their content already inside — won't announce.
  - `aria-live="assertive"` on every status update — turns the screen reader into a slot machine.
  - Decorative icons announced as "image" or the file name — add `aria-hidden`.
  - Removing `aria-describedby` when the error clears but leaving stale IDs in the DOM — the screen reader reads the empty element.
  - `aria-hidden="true"` on a focusable element — focus lands on something the screen reader won't announce; user is stranded.

What this lesson does not cover:

- Focus order and management — Lesson 4.11.4.
- Form validation announcements at depth — Chapter 7.3.
- Native semantic elements (`<button>`, `<a>`, `<label>`) — Chapter 4.1.
- `useId` mechanics — Chapter 4.8.6.
- The full WAI-ARIA role taxonomy — out of scope.
- Screen-reader-specific quirks across NVDA/JAWS/VoiceOver — out of scope.
- Toast library setup at depth — recognition only here.

---

## Lesson 4.11.4 — Where focus belongs

Teaches focus management across the three canonical SaaS situations — modal focus traps (Radix-handled), the route-change focus reflex Next.js does not provide, and post-submission focus — plus skip links, the `disabled` vs. `aria-disabled` decision, and the DOM-order rule for tab order.

Topics to cover:

- **The senior question.** Where is focus right now, and where should it be? On a static page the browser handles this; in a SPA with dialogs and async submissions it is the engineer's job. The three canonical situations a SaaS engineer manages: focus inside a modal (trap), focus after a route change (reset), and focus after a submission (move to the result or stay put deliberately). The lesson lands all three with the shadcn primitives that solve them and the custom patterns where the primitive does not reach.
- **Why this matters in 2026.** Next.js App Router announces page titles on route change but does not move focus. A keyboard or screen-reader user who tabs through a list, clicks a link, and lands on the next page finds focus still on the now-unmounted link — the next Tab does something arbitrary. The fix is small and load-bearing.
- **The three primitives at the page level.** `:focus-visible` (Chapter 4.5.4) for the visible ring on keyboard-only focus. `tabindex="-1"` for elements that take programmatic focus but not Tab focus (a region heading you focus on route change). `element.focus()` and `element.focus({ preventScroll: true })` for the move itself; `preventScroll` is the senior reflex when you don't want the page to jump.
- **Focus traps — the modal contract.** When a dialog opens: (1) focus moves to the dialog (typically the first focusable element or the close button), (2) Tab cycles within the dialog and does not escape, (3) Esc closes and returns focus to the trigger, (4) opening with the keyboard and opening with the pointer both behave correctly. Radix's `Dialog`, `AlertDialog`, `Sheet`, `Drawer`, `Popover`, and `DropdownMenu` handle all four. Naming the contract so the student recognizes what the primitive is doing.
- **Why you almost never write a focus trap by hand.** A correct focus trap handles Tab and Shift+Tab cycling, the case where focus is outside the trap (browser autofill, dev tools), the case where the dialog content changes (dynamic content), and the return-focus restoration. Libraries (`focus-trap`, `react-focus-lock`) and Radix get this right. Reach for the library only if you're shipping a portal-rooted custom widget shadcn doesn't cover.
- **The mobile drawer case — 4.12 preview.** Chapter 4.12's mobile nav drawer uses shadcn's `Sheet` (or `Drawer`), which handles focus trap, scroll lock, and Esc close. The custom hook the project writes — `useLockBodyScroll` — is for the body-scroll lock part on iOS where the platform fights you. The focus-trap part is the primitive's job.
- **Returning focus to the trigger.** When a dialog closes, focus must return to the element that opened it. Radix does this automatically. The exception: if the trigger has unmounted (the dialog was opened from a now-deleted row), focus needs an explicit destination — a stable nearby element like a section heading, or the list container. Pattern named because it surfaces in delete-confirmation flows.
- **Focus on route change — the App Router reflex.** Next.js does not move focus on `router.push` or `<Link>` navigation. The senior fix: a `useEffect` in a layout (or a small `<RouteFocus />` client component) that runs on `pathname` change (read via `usePathname` from `next/navigation` — the Next.js hook that returns the current pathname; full treatment in 5.5.5) and moves focus to the page's `<h1>` or main landmark with `tabindex="-1"`. The mechanics: focus the main heading on first paint of the new route, `preventScroll: true` so the user's scroll position is governed by the framework's scroll-restoration.
- **The skip link.** A `<a href="#main-content" className="sr-only focus:not-sr-only ...">Skip to content</a>` at the top of the layout, focusing the `<main id="main-content" tabindex="-1">` on activation. Standard accessibility pattern for keyboard users who don't want to Tab through the nav on every page. Implementation is small; presence is the differentiator on a 2026 accessibility audit.
- **Post-submission focus — three cases.** (1) Submission succeeds and the page navigates (a create flow) — route-change focus handles it. (2) Submission succeeds and the user stays put (an inline edit, a comment post) — focus typically returns to a sensible anchor: the success indicator (`role="status"`), the next form field, or the action that originated the submission. (3) Submission fails with field errors — focus moves to the first field with an error and the error message is announced via the live region. Chapter 7.3 owns the form-level depth.
- **The `aria-live` and focus interaction.** When focus moves to an element with an associated error (`aria-describedby` pointing at a `role="alert"` element), the screen reader announces the label, the value, and the error in one pass. This is the senior submission pattern: move focus *and* surface the message — never just one.
- **`autoFocus` — the careful reach.** Reach for it on login screens and dedicated single-input pages where the user's intent on landing is unambiguous. Avoid on multi-section forms (steals focus from screen readers reading context) and on dialogs (Radix handles initial focus; `autoFocus` fights it). React's `autoFocus` prop is per-mount; remounting fires it again.
- **Focus order — the DOM order rule.** Tab follows DOM order. Visual reordering with CSS (`flex-direction: row-reverse`, `order: -1`, `grid-template-areas`) does *not* reorder focus. The fix is to reorder the DOM, not the CSS. Pattern surfaces with sidebar-vs-main layouts and right-to-left content; cross-ref logical properties in 4.4.1.
- **The disabled-vs-aria-disabled decision.** A disabled form control (`disabled` attribute) is unfocusable and announces as disabled. Sometimes that's wrong — a submit button you want the user to be able to focus and read the error from is `aria-disabled="true"` with `onClick` guarded against the disabled state. Reach for `aria-disabled` when the disabled element still needs to be discoverable; default to native `disabled` otherwise.
- **Focus visibility in custom components.** When you build a clickable card or a custom selectable row, the focus ring must be visible — typically `focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none` on the focusable element. shadcn's `--ring` token is the canonical color. Cross-ref 4.5.4.
- **Watch-outs:**
  - Writing a focus trap by hand — almost always buggy; use the primitive.
  - Moving focus on every state change ("over-focusing") — disorienting and steals announcements from screen readers.
  - Focusing an element with `display: none` or `visibility: hidden` — silently fails or breaks; check visibility before focusing.
  - `tabindex="0"` on every clickable div instead of using `<button>` — the wrong layer of the fix.
  - Positive `tabindex` values — reorder focus globally and break expectations.
  - Forgetting `preventScroll: true` on programmatic focus — page jumps to the focused element disorientingly.
  - Auto-focusing the first field on a multi-step form on every step — interrupts screen reader announcement of the step transition.
  - Trapping focus inside a non-modal element (a sidebar, an accordion) — only true modals should trap; anything else must let Tab escape.

What this lesson does not cover:

- `:focus-visible` styling at depth — Chapter 4.5.4.
- `useId` for the skip-link / heading-focus ID pairing — Chapter 4.8.6.
- Form-error focus management at depth — Chapter 7.3.
- Scroll restoration on route change — Chapter 5.1.
- `useLockBodyScroll` implementation — Chapter 4.10.1 (custom-hook catalog) and Chapter 4.12 (project consumption).
- Internationalization and RTL focus order — Chapter 18.2.

---

## Lesson 4.11.5 — Four states, not one

Teaches the loading/empty/error/populated component contract — `Skeleton` over spinners, `Empty` with a CTA, `Alert` with retry, the accessibility pairing for each state, and the discriminated-union state model that replaces three booleans.

Topics to cover:

- **The senior question.** Every list, card, table, and widget in a SaaS app exists in four states, not one: loading (the data is in flight), empty (the data is loaded and there is none), error (the data didn't load), and populated (the happy path). Juniors design the populated state; seniors design all four. The lesson lands the trio every component needs alongside populated, the shadcn primitives that ship for each, and the discipline of pairing visual state with accessibility state.
- **Why this is a 4.11 lesson, not a Chapter 5 lesson.** The four-state contract is a *component-level* discipline — every leaf component needs it, regardless of where the data comes from. Chapter 5.3 (Suspense, route-level loading) and Chapter 11.1 (URL-state list views, server-data loading) lay these patterns over server data; this lesson establishes the component-level pattern they build on.
- **The loading state — `Skeleton` over spinners.** shadcn's `Skeleton` component (a `<div className="animate-pulse bg-muted rounded ..." />`) is the 2026 default for loading content with known shape — table rows, card grids, lists, dashboard widgets. The principle: a skeleton that matches the populated layout's dimensions prevents layout shift on load. Spinners are for short, indeterminate operations (a button submitting); skeletons are for content panels.
- **When a skeleton is wrong.** Very short loads (under ~200ms) — the skeleton flashes and adds perceived jank; reach for no UI change or a delayed-show pattern (`<Skeleton>` that mounts after 200ms). Operations where the shape is unknown — a generic spinner or progress bar is honest.
- **The progress reach.** Long-running operations with known progress (file upload, bulk import) use `<Progress>` (Radix primitive in shadcn). For unknown progress, indeterminate `<Progress />` or a single status line ("Importing..."). Don't fake progress.
- **The empty state — `Empty` as a first-class component.** shadcn ships an `Empty` block (and many in the registry). The senior shape: an illustration or icon, a heading naming what's missing, a one-line description, and a primary call-to-action that resolves the empty state. "No invoices yet" + "Create your first invoice to get started" + `<Button>New invoice</Button>`. The CTA is the discriminator between a useful empty state and a polite shrug.
- **Empty-state variants.** (1) First-time empty (no data ever) — onboarding CTA. (2) Filtered empty (data exists, filters returned none) — "No invoices match your filters" + "Clear filters" link. (3) Search empty — show the query, offer to broaden or correct. (4) Permission-empty (data exists but user can't see it) — explain access, not absence. The lesson names the four variants because the right copy differs.
- **The error state — the component-level pattern.** Inline error states for a leaf component (a card that failed to load) get a compact card with: an error message, a "Retry" action, and optionally an error code/ID for support. shadcn's `Alert` with `variant="destructive"` is the canonical container. Distinct from form-field errors (Chapter 7.3) and page-level error boundaries (Chapter 17.1).
- **Error boundaries — naming the layer.** React error boundaries (and Next.js `error.tsx`) catch render errors at a tree boundary. Distinct from *data-fetch errors* surfaced through state. The lesson names this so students know the error-state UI we're writing is for *data* errors; render errors get the framework's boundary, taught in 17.1.
- **The accessibility pairing for each state.** Loading: announce "Loading invoices" via `role="status"` (especially for assistive-tech users who can't see the skeleton). Empty: a screen reader user must hear the empty message and the CTA — semantic heading (`<h2>`) plus the action button. Error: `role="alert"` on the error message for immediate announcement; "Retry" button is focusable and labeled.
- **The state-machine view.** Render this as a small state diagram: `loading → empty | error | populated`, with `populated` looping to `loading` on refetch. The senior reach: drive the UI from a single discriminated union (`{ status: 'loading' } | { status: 'empty' } | { status: 'error'; error } | { status: 'populated'; data }`), not from three booleans. Recognition only; Chapter 11.1 owns the data-fetching state-machine pattern. Cross-ref the flow-state-machine seed in 2.5.2.
- **Two booleans is the canonical bug.** `if (loading) ... else if (error) ... else if (data.length === 0) ... else ...` — order matters and is easy to get wrong; intermediate states (loading-with-stale-data) get lost. The discriminated union forces every state to be named once and rendered once.
- **The "stale data while refetching" pattern.** Once data has loaded once, subsequent fetches usually shouldn't blow the populated state back to a skeleton — show stale data with a subtle loading indicator (a `Progress` bar at the top, a `Loader2` icon in the refresh button). Chapter 11 and Chapter 16 own server-state libraries that do this by default; the discipline starts here.
- **Component composition — the slot-based shape.** A reusable `<DataPanel>` (or whatever name fits the codebase) accepts `loading`, `empty`, `error`, and `children` slots. Pattern recognition because it appears once in every Chapter 11+ project, written as a custom hook output or a small wrapper component.
- **Optimistic state — the briefest mention.** Mutations can show their "after" state immediately while the request is in flight, rolling back on failure. Live-region announcement on the rollback ("Failed to save, reverted"). Chapter 7.2 and Chapter 11.1 own this; named once here as the fifth state the senior recognizes.
- **Watch-outs:**
  - Designing the populated state only and bolting on loading/empty/error at QA time — the layout shifts, the empty CTA is missing, the error message is "Something went wrong" with no retry.
  - Skeleton dimensions that don't match populated content — content jumps on load; defeats the purpose.
  - Generic "Loading…" text everywhere — adds noise, blocks scanning, hurts perceived speed.
  - Polling silently with no indicator — user doesn't know data is changing.
  - Empty state with no action — leaves the user at a dead end.
  - Error states that hide the error from support ("Something went wrong") — give a code or a copyable correlation ID. Chapter 17.1 and 20.1 own the depth.
  - Three independent boolean flags governing the four states — the discriminated union is the cure.
  - Loading skeletons for sub-200ms loads — adds flicker; delay the skeleton.

What this lesson does not cover:

- Error boundaries at the page and route level — Chapter 17.1.
- Server-data fetching states with Suspense — Chapter 5.3.
- URL-state list view with full server-data loading lifecycle — Chapter 11.1.
- Form-level validation errors and `aria-invalid` wiring — Chapter 7.3.
- Optimistic mutations at depth — Chapter 7.2, Chapter 11.1, Chapter 16.
- Toast notifications — Lesson 4.11.3 (live regions, named).
- Server-state libraries (TanStack Query) — Chapter 16.

---

## Lesson 4.11.6 — Quizz

Top 10 topics to quiz:

- shadcn/ui's copy-into-repo model — what gets installed where, what the dependencies are (Radix or Base UI, `cva`, `tailwind-merge`, `tw-animate-css`, `lucide-react`), and the consequences (you own the files, no `npm update`).
- The `asChild` slot pattern from Radix and the compound-component shape of every shadcn primitive — when and how to compose with `<DialogTrigger asChild>`.
- The semantic-token theming model — CSS variables in `globals.css`, the `--background`/`--foreground`/`--primary` family, dark mode via `.dark` class, and where contrast must be audited.
- The four discipline-level accessibility commitments — keyboard navigation, WCAG 2.2 AA contrast, `prefers-reduced-motion`, touch target size (24×24 minimum, 44×44 default).
- The "first rule of ARIA" — no ARIA is better than bad ARIA; native semantic elements first, ARIA only when no semantic equivalent exists.
- The four ARIA surfaces a SaaS engineer reaches for — roles (mostly handled by primitives), labels (`aria-label`, `aria-labelledby`), descriptions (`aria-describedby`), and live regions (`aria-live`, `role="status"` / `role="alert"`).
- The live-region pre-mount rule — the region must exist in the DOM empty before content is injected; the polite-vs-assertive cut and `role="status"` vs. `role="alert"`.
- The icon-only button label pattern — `aria-label` (or `sr-only` text) on every `size="icon"` button; `aria-hidden` on decorative icons next to a visible label.
- Focus management — modal focus trap (Radix handles it), Esc-and-return-focus contract, the route-change focus reflex Next.js does not provide, the skip-link pattern, post-submission focus rules.
- The four-state component contract (loading, empty, error, populated) — `Skeleton` for loading, `Empty` with a CTA for empty, `Alert` with retry for error; the discriminated-union state model and why three booleans is the canonical bug.
