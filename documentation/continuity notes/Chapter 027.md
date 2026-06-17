# Chapter 027 — shadcn/ui and the accessibility baseline

## Lesson 1 — Own the source, not the dependency

**Taught** — shadcn/ui as a CLI+registry that copies component source into `components/ui/` (no runtime package); the build-vs-library-vs-own decision; three ownership consequences (fork-without-PR / source-is-docs / you-own-upgrades); `init`+`add` workflow; `components.json` fields; Radix-vs-Base engine choice; `asChild` compound-component composition; semantic-token theming location; the className→variant→wrap→fork escalation ladder; registry namespaces and blocks (recognition).

**Cut** — none of substance; recognition-only topics (`migrate`, `--dry-run`/`--diff`, `package.json#imports` target aliases, registry authoring, theme generators) named but not drilled, as scoped.

**Debts**
- Token-on-token contrast as an a11y commitment (`--primary-foreground` on `--primary`) → L2.
- Accessibility commitments at discipline level (keyboard, contrast, motion, target size) → L2; only named here as "primitive solves a11y for its surface, don't undo it."
- Radix `Dialog` focus-trap contract → L4 (named here as evidence the primitive does a11y work; not taught).
- Blocks consumed at project scale → Chapter 028.

**Terminology / mental models** (later lessons should reuse, not redefine)
- **"You own the code, not a dependency"** — the chapter through-line.
- **Seam location** framing: styled library puts the seam at the npm boundary; shadcn moves it into your repo.
- **headless primitive**, **registry**, **CLI**, **compound component**, **block**, **`pnpm dlx`** — all given `<Term>` definitions here.
- **`asChild` = merge, not wrap** — renders no element of its own, forwards behavior/ref/ARIA onto the single child via `Slot` (from `radix-ui`). Established as the recurring idiom; every later `<...Trigger asChild>` is recognition.
- **Escalation ladder** (the lesson's single most transferable takeaway): `className` override → new `cva` variant → wrap-and-compose (`components/<feature>-*.tsx`) → fork (`components/ui/`). Fork only when the primitive's *abstraction* is wrong, not its *look*.

**Patterns and best practices** (project codebase must follow)
- Primitives live in `components/ui/`; `cn()` in `lib/utils.ts`; tokens + `@theme` in `app/globals.css`; config in `components.json`. Imports resolve via `@/components/ui/...` and `@/lib/utils` — never `node_modules`.
- **Wrap, don't fork** for visual/behavioral divergence; fork is a last resort and must carry a comment stating why.
- `add` on demand, not upfront (avoids bundle/diff bloat).
- One engine per project, chosen at `init` (default Radix; Base UI when public-page bundle size binds); never mix.
- Upgrade discipline: re-run `add` overwrites file → review diff → re-apply fork edits → test behavior (esp. dialog/sheet focus trap when a peer bumps in lockfile) → commit.

**Misc.**
- Currency corrections applied (verified June 2026): Radix is the **unified singular `radix-ui` package** (not `@radix-ui/react-*`); imports read `import { Dialog as DialogPrimitive } from "radix-ui"`. Engine is an **init-time choice**, changed only via re-init/manual edit + `migrate` — **not** `shadcn apply` (which switches presets only). CLI is **v4**. Later lessons/chapter outlines that still say `@radix-ui/react-*` or "engine switchable via `apply`" are outdated; follow this.
- Lesson deliberately diverges from the chapter outline's looser fork framing toward the tighter Code-conventions line (wrap-first); do not "correct" it back.
- Dependency surface named as peers the copied files import: `radix-ui`, `class-variance-authority`, `tailwind-merge`+`clsx` (`cn()`), `tw-animate-css`, `lucide-react` (icons typed `LucideIcon`).
- Components used: `StateMachineWalker` decision (×2: build-vs-buy-vs-own, the wrap-vs-fork escalation ladder — the lesson's two decision walks), `FileTree` (project shape after `add`, owned files bolded), `Buckets` (buys-vs-costs sort), `Steps`+`Code` (init→add procedure), `AnnotatedCode` (`components.json` fields), `CodeVariants` (asChild: double-element vs merged), `Term`, `VideoCallout` (×2: Slot/asChild, end-to-end restyle), `ExternalResource`. No lesson-specific Astro components. Opening hook = five-widget screen (Dialog/DropdownMenu/Select/Toast/Calendar), two wrong instincts.

## Lesson 2 — The four commitments

**Taught** — accessibility as a discipline-level commitment (parallel to security/type-safety), not a QA phase; **WCAG 2.2 AA** as the engineering floor; the four commitments, each framed as a property of a *central artifact* not a per-element chore: (1) keyboard — Tab/Enter/Space/Esc contract per control type, tab-order-follows-DOM, the three `tabindex` values; (2) contrast — audit the token *pair*, not the call site; (3) motion — `prefers-reduced-motion` + replace-don't-delete for communicative motion; (4) target size — 24×24 floor / 44×44 practical, grow hit area with padding not icon. Plus "semantic HTML first, ARIA second" (first rule) and the tooling-limit reflex (automated tools catch a minority of WCAG issues; clean report necessary not sufficient).

**Cut** — none of substance; stays at recognition depth for every call-site mechanic (named + chapter-linked, not re-derived), as scoped. Dropped the invented "~30% of adults have vestibular disorders" stat the chapter outline floated; legal frame kept to one tight paragraph.

**Debts (paid here)**
- Token-on-token contrast a11y commitment (deferred from L1) — paid in Commitment 2.

**Debts (forward)**
- ARIA mechanics, "no ARIA is better than bad ARIA," live regions, icon-only-button label → L3 (planted: "ARIA only changes what's announced, never behavior").
- Focus management — DOM-order-vs-CSS-order *fix*, focus trap depth, route-change focus, `tabindex="-1"` script-focus usage → L4 (planted: "Tab follows the DOM," "Esc returns focus to trigger").
- axe-in-Playwright + Lighthouse CI pipeline gate → Ch 095 (this lesson = local pre-merge habit only).

**Terminology / mental models** (reuse, don't redefine)
- **The four commitments** — keyboard / contrast / motion / target size; the spine. Refer to by name.
- **"Central artifact, not per-element chore"** — each commitment audited in one place (token / global stylesheet / DOM order).
- **The shadcn dividend** (reused from L1) — primitive owns keyboard/focus/ARIA for its surface; "what you still own" = landmarks, heading hierarchy, form labels, token contrast, reduced-motion in *your* animations, route-change focus, live regions.
- **`<Term>` defined here**: roving tabindex, focus trap (named, full depth L4), contrast ratio, vestibular disorder, `(pointer: coarse)`, ARIA.
- **"Replace, don't delete"** — reduced motion swaps communicative motion for a non-motion equivalent.
- **"Semantic HTML first, ARIA second"** — the first rule; bridge into L3.

**Patterns and best practices** (project codebase must follow)
- **WCAG 2.2 AA** is the floor (not 2.1 — chapter outline says 2.1 but SC 2.5.8 Target Size is a 2.2 addition; matches `Code conventions.md`). Use 2.2 throughout the chapter/project; do not "correct" to 2.1.
- Audit **contrast at the token pair**, not rendered elements; dark mode is a second palette audited independently.
- `motion-reduce:` on every above-the-fold animation — no exceptions; author the reduced case deliberately on top of full motion.
- Touch-primary controls: `min-h-11 min-w-11` (44px); grow hit area via padding, keep icon ~16px. shadcn `size="icon"`/`size="sm"` can fall below 44px — verify on touch surfaces.
- Pre-merge keyboard-only pass (unplug-the-mouse) is a process gate, not a one-off.

**Misc.**
- Legal frame stated as demanding *AA* (not a specific WCAG version): US ADA via DOJ guidance, EU EAA in force since 28 June 2025, UK Equality Act, Canada ACA. Keep claims at "AA," don't tie a statute to "2.2."
- Tooling-limit number stated as an approximation with its basis (~⅓ of AA success criteria by count, or ~57% of issues by volume per Deque axe-core), not a bare "30%."
- Lesson-specific Astro components live at `src/components/lessons/027/2/` (note: `<lesson id>/<n>/`, not the `027-2/` the outline guessed): `KeyboardWalkthrough` (step-driven, fed into `DiagramSequence`), `reduced-motion-demo`, `target-size-figure`.
- Figures/exercises: contrast `ParamPlayground` (`wcagContrast`/`wcagPasses` expr helpers, OKLCH-lightness sliders, live AA pass/fail `Readout`); `DiagramSequence` of 5 `KeyboardWalkthrough` steps (Tab→Enter→Esc-returns-focus); `ReducedMotionDemo` toggle (simulates the OS pref, owns its own CSS — does not read the real setting); `TargetSizeFigure` (16px icon in 44px vs 24px hit area); `Buckets` two-col semantic-first sort; closing `TrueFalse` (6 claims); `VideoCallout` (Web Dev Simplified a11y masterclass); 4 `ExternalResource` cards (APG / WebAIM contrast / WCAG 2.2 quickref / MDN reduced-motion).

## Lesson 3 — No ARIA is better than bad ARIA

**Taught** — the **four ARIA surfaces** a SaaS engineer authors (roles / labels / descriptions / live regions), gated behind the first rule of ARIA; the load-bearing model **"ARIA only changes what AT announces, never behavior"** (canonical `<div role="button">` failure: writes a promise the markup can't keep); the role cut (implicit roles make most explicit roles redundant; primitive owns the complex taxonomy; you author only `status`/`alert`, `presentation`/`none` as inheritance escape hatch, landmarks only when the tag can't change); the accessible-name precedence chain (visible text > `aria-label` > `aria-labelledby` > `title`) with **one source, never stack**; the icon-only-button fix (`aria-label` or `sr-only` child on the **button**, never the icon); `aria-describedby` wiring with `useId`; the three-audience hide decision (`sr-only` / `aria-hidden` / `hidden`, organized by "who needs to perceive this?"); live regions — the four-attribute contract, the **pre-mount rule**, `status`-vs-`alert` severity cut, and the Sonner dividend.

**Cut** — none of substance; full role taxonomy and per-AT (NVDA/JAWS/VoiceOver) quirks stay recognition-only as scoped.

**Debts (paid here)**
- ARIA mechanics / "no ARIA is better than bad ARIA" / live regions / icon-only-button label (planted L2) — paid.

**Debts (forward)**
- Focusable-`aria-hidden` trap planted as a `:::caution` watch-out; **focus order / focus management depth → L4**.
- Form-field `aria-describedby` + `aria-invalid`, error-announcement-on-validation → **Ch 044** (only benign help-text wiring shown here, no validating form).
- Live regions applied to loading/error states → **L5** (named, not pre-taught).
- Sonner provider/install setup → later chapter (recognition only).
- Optimistic UI as a live-region surface → Ch 043/060 (one-line mention).

**Terminology / mental models** (reuse, don't redefine)
- **"ARIA changes announcement, not behavior"** — the lesson's spine; reuse verbatim.
- **The four surfaces** — roles / labels / descriptions / live regions; refer to by name.
- **The shadcn dividend** (reused) — primitive owns the role taxonomy; your ARIA = labels for unlabeled controls + your own live state.
- **Accessible name**, **implicit role**, **landmark**, **`sr-only`**, **accessibility tree**, **`aria-hidden`**, **live region**, **`role="status"`/`role="alert"`**, **Sonner**, **APG/WAI-ARIA**, **assistive technology (AT)** — `<Term>` defined here. (ARIA itself defined L2 — not re-Termed.)
- **The pre-mount rule** — AT announces a *mutation inside an already-watched region*, not a region that appears with text already in it; region must mount empty, toggle contents only.
- **"One source wins, never stack"** (naming) and **"who needs to perceive this?"** (hide decision) — the two decision framings.
- **`status` by default, `alert` is the exception you justify** — "alert turns the screen reader into a slot machine."

**Patterns and best practices** (project codebase must follow)
- Before any `aria-*`: ask whether a native element or shadcn primitive already does it — if so, fixing the markup is the correct move, not adding the attribute.
- Icon-only buttons (`size="icon"`) always carry an accessible name on the button; Lucide icons are already `aria-hidden` by default — never hand-add it.
- Live regions mount empty and always-present; toggle only contents (never `{cond && <div role="…">}`).
- Toasts via Sonner (self-mounts one root live region); old `components/ui/toast` `Toast` is deprecated/legacy. `toast.success` = polite, `toast.error` = assertive.
- Canonical hand-built live region = filter/search result count (`role="status"` in results header); no primitive covers it.
- Cross-element id references (`aria-describedby`, `aria-labelledby`) use `useId` (Ch 024), never hand-written ids; reference and target live and die together (no stale `describedby`).

**Misc.**
- **Deliberate divergence from chapter outline** (do not "correct"): outline's "Lucide icons default to no role; you decide per call site" is stale — Lucide v1 ships every icon `aria-hidden="true"` by default; the label goes on the button. WCAG **2.2** AA floor (consistent with L2).
- Components used: `CodeVariants` (×3: div-vs-button, conditional-vs-mounted, broken-vs-fixed region), `AnnotatedCode` (×2: icon-button fix, live-region contract), `CodeTooltips`, `Code`, `DiagramSequence` (the pre-mount-rule sequence — the lesson's one real diagram, AT's POV over time, always-mounted vs conditional), `StateMachineWalker` decision (hide-it-right), `Buckets` (hide-it sort), `MultipleChoice` multi-select (which-warrant-alert), `ReactCoding` tests-graded `hidePreview` (label-the-toolbar), `VideoCallout` (×2: Karl Groves span+role lie, Ross Robino live-region build with VoiceOver), `ExternalResource` (APG / MDN ARIA / web.dev ARIA-and-HTML / WebAIM Million). One lesson-specific Astro component: `PreMountRule` at `src/components/lessons/027/3/` (drives the `DiagramSequence` steps).
- Opening hook = WebAIM Million 2026 (~59 errors with ARIA vs ~42 without).

## Lesson 4 — Where focus belongs

**Taught** — focus as a **single cursor** (`document.activeElement`, walks the DOM via Tab/Shift+Tab) and the **two verbs**: `tabindex="-1"` (focusable by script, skipped by Tab) + `element.focus({ preventScroll: true })` (move there) — the canonical pairing to focus a non-interactive `<h1>`/`<main>`. The three SaaS focus situations by "how much the platform does for you": (1) **modal** — Radix owns the four-part **focus-trap contract** (focus-in / Tab cycles within / Esc returns to trigger / behind made `inert`); never hand-write a trap; the one custom edge is the **deleted-trigger** case (intercept `onCloseAutoFocus`, redirect to a stable anchor). (2) **route change** — the load-bearing pattern: Next.js App Router moves focus *nowhere* on soft navigation, so a `<RouteFocus>` client component keyed on `usePathname` focuses `#page-heading` inside a `requestAnimationFrame` (post-paint) with `preventScroll`; plus the **skip link** (`sr-only focus:not-sr-only` anchor → `<main id="main-content" tabIndex={-1}>`). (3) **submission** — focus by outcome (navigated → route pattern handles it / stayed → deliberate anchor + `role="status"` / failed → first-error field wired `aria-describedby` to `role="alert"`), under the rule **"move focus and announce, or do neither"** and the over-focusing caution. Plus `autoFocus` (right on single-purpose landings, wrong on multi-section forms and dialogs); the **DOM-order-governs-Tab** rule (fix the DOM, never `tabindex`/CSS); the `disabled` vs `aria-disabled` decision (discoverability decides; `aria-disabled` needs a guarded `onClick`); and the custom-element focus-ring reminder (`focus-visible:ring-2 focus-visible:ring-ring`).

**Cut** — none of substance; the form-submission case ships only the **focus+announce skeleton** (no validating form), and navigation-hook depth stays a forward-ref, both as scoped.

**Debts (paid here)**
- Focus-trap contract depth (planted L1/L2), DOM-order-vs-CSS *fix* + `tabindex="-1"` script-focus usage (planted L2), focusable-`aria-hidden`/focus-order (planted L3) — paid.

**Debts (forward)**
- Full `usePathname`/navigation-hooks, `push`/`replace`/`refresh` → Ch 033 L5 (here `usePathname` is the route-change signal only).
- Form-level submission: `useActionState`, `aria-invalid`, generating ids with `useId`, rendering the error tree, the validating form → Ch 044 (this lesson owns only the focus+announce half).
- Scroll restoration → Ch 029/032 (named only to justify `preventScroll: true`).
- `useLockBodyScroll` / iOS body-scroll lock, the mobile `Sheet` drawer consuming all of this → Ch 026 catalog + Ch 028 project (focus trap is the primitive's job; scroll lock is the project's hook).
- Loading/empty/error states (nothing to focus *yet*) → L5 (explicitly handed off at lesson close).

**Terminology / mental models** (reuse, don't redefine)
- **The single focus cursor** + **the two verbs** (`tabindex="-1"` makes targetable / `.focus({ preventScroll: true })` moves) — the lesson's spine; "you almost always need both."
- **The three situations** — modal / route change / submission, ordered by how little the platform does.
- **Focus-trap contract** (four guarantees) — reused from L2's `<Term>`, paid to full depth here; do not redefine.
- **The shadcn/Radix dividend** (reused) — primitive owns the trap; the gaps live *between* primitives, page-level, where no primitive is mounted.
- **"Move focus and announce, or do neither"** — the one genuinely new rule; where this lesson's focus and L3's live regions compose.
- **Over-focusing** — moving focus on every state change steals AT announcements; move only on disruptive transitions.
- **`<Term>` defined here**: `document.activeElement`, `inert`, `soft navigation`. (`usePathname` defined inline via prose, lightly.)

**Patterns and best practices** (project codebase must follow)
- Page-level focus moves use `.focus({ preventScroll: true })` — never fight framework scroll restoration.
- Every page: one `<h1>` (or `<main>`) carrying `tabIndex={-1}` and a stable id (`page-heading` / `main-content`) as the route-change + skip-link focus target.
- A `<RouteFocus>` client component mounted once in the layout, keyed on `usePathname`, deferring one `requestAnimationFrame` and querying the heading by id fresh inside the effect (never a ref to a node from the previous route). This `useEffect` is **sanctioned** (external-system sync) — keep `usePathname` in deps, `exhaustive-deps` stays on; do not "fix it away."
- Skip link is the **first** focusable element in the layout; `sr-only focus:not-sr-only` reveal-on-focus.
- Never hand-write a focus trap — Radix, or a library (`focus-trap`/`react-focus-lock`) for a portal-rooted custom surface only.
- Destructive-in-a-list actions: redirect focus in `onCloseAutoFocus` (`event.preventDefault()` + focus a stable anchor); `onCloseAutoFocus` override stays at the call site, never in `components/ui/`.
- Default to native `disabled`; reach for `aria-disabled` only when the control must stay discoverable, and then **guard the `onClick`** (early-return) since `aria-disabled` doesn't block activation.
- Wrong focus order ⇒ reorder the **DOM**, never positive `tabindex` or a CSS-order patch; mirror layout via logical properties (Ch 020).
- Custom focusable elements get a visible ring via the semantic `--ring` token (`focus-visible:ring-2 focus-visible:ring-ring`); never remove a focus ring to tidy a design.

**Misc.**
- Refs are plain props typed `Ref<T>` (React 19 — no `forwardRef`), per Code conventions.
- Skeletons (`firstErrorRef`, skip-link) are intentionally stripped of production plumbing (Server Action, `useActionState`, `useId` ids) owned by Ch 044/024 — prose marks the boundary as deliberate, not unfinished.
- Components used (all built): `Code` (×4: heading-focus pairing, skip-link, focus-first-error skeleton, custom-focus-ring), `CodeVariants` (delete-trigger: survives vs deleted), `AnnotatedCode`+`AnnotatedStep` (the 4-step `RouteFocus`), `DiagramSequence`+`DiagramStep` (the 4-step focus-cursor walk — the one real diagram, makes the invisible cursor visible), `ReactCoding` tests-graded `hidePreview` off (build-the-skip-link, 4 assertions, with `<details>` reference solution), `StateMachineWalker` decision + `Question`/`Branch`/`Leaf` (disabling-a-control, 2 questions / 3 leaves), `TrueFalse`+`Statement`+`TfWhy` (7-claim recall), `VideoCallout` (Pope Tech keyboard-only test), 4 `ExternalResource` cards (APG dialog pattern / WebAIM Keyboard Accessibility / jshakespeare route-change autofocus walkthrough / MDN `HTMLElement.focus`). One lesson-specific Astro component: `FocusCursorWalk` at `src/components/lessons/027/4/focus-cursor-walk.astro` (drives the 4 `DiagramStep`s of the focus-cursor walk).
- Re-invokes L2's unplug-the-mouse pass as the *detection* tool (the bug is invisible to mouse users) and L2's "tools catch a minority" reflex (route-change gap is invisible to Lighthouse).
- The `RouteFocus` target id is **`page-heading`** (the per-page `<h1>`); the skip-link target id is **`main-content`** (the `<main>` landmark) — two distinct ids, both `tabIndex={-1}`.

## Lesson 5 — Four states, not one

**Taught** — the **four-state component contract** (loading / empty / error / populated), held as a contract from the first commit ("before you write the populated view, name the other three"); **empty is a *loaded* state, the opposite of loading** (loading = before the answer; empty = the answer is "none"); the **three-boolean ladder is the canonical bug** (order-dependent, 2³=8 representable combos for 4 real states, no home for loading-with-stale-data) and the **discriminated union with a `status` discriminant** is the cure (each state named once, carries only its own data, `switch (state.status)` narrows each branch, impossible states unrepresentable); the loading affordance *decision* — `Skeleton` (known shape, sized to the populated layout to avoid layout shift) / `Spinner` (short indeterminate / unknown shape) / `Progress` (measurable, never faked), plus the sub-200ms flash trap; the **empty state as the `Empty` composition + a cause-specific CTA** (four variants: first-run / filtered / search / permission — copy differs by cause); the **error state as inline `Alert variant="destructive"`** with a Retry and a copyable correlation id; the per-state a11y twin (loading → `role="status"`+`sr-only`; empty → real heading+focusable CTA, *no* live region since it's settled content; error → `role="alert"`+focusable Retry); the **state-machine view** of the four states with transitions (resolve/reject/refetch/retry) and the stale-while-refetching refinement; `<DataPanel>` slot wrapper and optimistic state (both recognition only).

**Cut** — none of substance. Chapter outline's stale specifics corrected (see Misc.): `Loader2`→`Spinner`/`LoaderCircle`, "Empty block"→the real `Empty` composition.

**Debts (paid here)**
- Live regions applied to loading/error states (planted L3), loading/empty/error states with nothing-to-focus-yet (handed off L4) — paid.

**Debts (forward)**
- Real data fetching / `fetch`/`await` / Suspense / route-level `loading.tsx` → **Ch 031** (data source abstracted to a hand-set `status`; no fetching here).
- The full server-data loading lifecycle at list-view scale → **Ch 060**.
- State *transitions* in code (the fetch machine, `useReducer`/effects) and server-state libraries doing stale-while-refetch by default → the **server-state / TanStack Query chapter** (Unit 4; refer by description, id not pinned) — this lesson hand-sets `status` to teach *rendering* only.
- Optimistic mutations at depth (the "fifth state") → **Ch 043/060** + the TanStack Query chapter (named once, rollback announced via `role="alert"`).
- React error boundaries / `error.tsx` (render-time exceptions, distinct from data-error state) → **Ch 080** (named only to distinguish layers).
- Form-field validation errors / `aria-invalid` / `aria-describedby` wiring → **Ch 044** (this lesson's error is a *data-load* failure, not field validation).
- `correlationId`/`retry` as real refetch + logging plumbing, the user-message-vs-operator-detail split at depth → data + observability chapters (here abstracted props + one copyable id).
- Delayed-skeleton (`useDelayedShow`) hook → **Ch 026** catalog (sub-200ms trap named as watch-out, hook not built).

**Terminology / mental models** (reuse, don't redefine)
- **The four-state contract** — loading / empty / error / populated; mutually exclusive, exactly one on screen. The chapter's "live state must be perceivable" thread made concrete.
- **"Empty is not loading"** — loading is *before* the answer, empty *is* the answer ("none"); different pixels, different announcements.
- **`status` discriminant / discriminated union over flag booleans** — one value, `switch (state.status)`, each variant carries only its own data. This lesson is the canonical demo of the Code-conventions rule; reuse `<Term>` *discriminant* / *discriminated union* by name (defined here + TS chapters).
- **"A spinner says *something is happening*; a skeleton says *this is coming*"** — the loading-affordance one-liner.
- **The shadcn dividend** (reused) — `Skeleton`/`Spinner`/`Empty`/`Alert`/`Progress` ship the visual shell; *yours* is choosing the state, matching skeleton dimensions, writing empty copy+CTA, pairing the `role`.
- **`<Term>` defined here**: discriminated union, discriminant, skeleton, layout shift, CTA, correlation id, stale data.
- **The state machine** — four states + events (resolve/reject/refetch/retry); "a component doesn't *have* states, it *moves* between them."
- **Stale-while-refetching** — on refetch keep stale data on screen with a subtle indicator; never blow populated back to a full skeleton.

**Patterns and best practices** (project codebase must follow)
- Every data surface (list/table/card/widget) renders all four states; a component that only renders populated is unfinished. Drive from one `status` discriminated union, never independent `isLoading`/`error`/`data` booleans.
- Each variant carries only its own data (`error` has no invoices, `populated` has no error); `switch` on `status`; a `never`-asserting `default` for exhaustiveness is recognition-only.
- `Skeleton` built *from* the populated layout (same row count, same column widths) so the table swaps in without layout shift; `Skeleton` is Radix-free (pure Tailwind + `cn`). Skeleton for known shape, `Spinner` for short/unknown, `Progress` for measurable progress — never animate fake progress.
- Empty state copy differs by cause; ship a cause-specific CTA, never the first-run "create your first…" into a filtered/permission empty. `EmptyTitle` renders a real heading.
- Error state = human message + focusable Retry + copyable correlation id; never bare "Something went wrong," never a raw stack trace at the user.
- a11y pairing per state: loading `role="status"`+`sr-only` "Loading…"; error `role="alert"`+focusable Retry; empty needs *no* live region (settled content — real heading + focusable CTA suffice). Live regions only for async *changes*.
- The reusable `<DataPanel><T>` shape (props: `state`, `loading`, `empty`, `error(err, retry)`, `children(data)`) — every later-project data surface is one of these; recognition now, written in projects.

**Misc.**
- **Lesson is the chapter's last teaching lesson (L6 = quiz);** synthesis section ties every state's primitive + a11y twin together in the StateMachineWalker.
- **Deliberate divergences from chapter outline** (do not "correct"): teach the first-class `Spinner` primitive (not `Loader2`; current Lucide name is `LoaderCircle`); teach the real `Empty` *composition* (`Empty`>`EmptyHeader`>(`EmptyMedia`+`EmptyTitle`+`EmptyDescription`)+`EmptyContent`) not a loose "block"; WCAG 2.2 AA (consistent with L2-L4).
- **Deliberate teaching abstractions** (prose marks each as intentional, not unfinished): `status` hand-set not fetched; `retry`/`correlationId` abstracted props; ReactCoding exercise uses inline stub `Skeleton`/`Empty`/`Alert` (no shadcn in the live runtime) clearly marked as stand-ins, not the real import shape.
- Components used (lesson fully built): `Buckets` (empty-vs-loading sort), `CodeVariants` (the spine: three-booleans red vs discriminated-union green), `AnnotatedCode`+`AnnotatedStep` (invoice-table skeleton, 3 steps — two blue layout steps + one green a11y step), `Code` (×3: empty composition with `collapse`, error branch in a `data-mark-color="blue"` div, `DataPanel<T>` signature), `TabbedContent`+`TabbedItem` (two empty variants: first-run / filtered), `StateMachineWalker` `kind="machine"`+`Question`/`Branch` with a Mermaid `stateDiagram-v2` in the `Figure` diagram slot (the one real diagram), `MultipleChoice`+`McqChoice`/`McqWhy` single-correct (filtered-empty copy), `ReactCoding` tests-graded `hidePreview` off (refactor-to-four-states, 5 assertions, with `<details>` reference solution), `TrueFalse`+`Statement`/`TfWhy` (8-claim recall), `VideoCallout` (×3: Andrew Burgess exhaustive switch / NN/g skeleton-vs-spinner-vs-progress / NN/g empty states), 2 `ExternalResource` cards (shadcn `Empty` docs / Kent C. Dodds "stop using isLoading booleans"). No lesson-specific Astro components.
