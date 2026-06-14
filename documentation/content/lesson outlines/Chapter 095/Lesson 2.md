# Chapter 095 — Lesson 2 outline

## Lesson title

**Page title:** The audit method, modeled on finding 7
**Sidebar:** The audit method

The chapter-outline title fits — it names both the deliverable (the audit method) and the worked example (finding 7). Keep it.

## Lesson type

`Walkthrough`

Rationale: the chapter outline opens the lesson with "A walkthrough." No feature is shipped against tests — the lesson teaches a *cadence* and demonstrates it by filling one findings file end to end. `Lesson 2.test.ts` is `describe.todo` and will later assert the shape of `findings/007-missing-priority.md`, but this lesson has no *Your mission* brief and no student-built code surface; it is step-by-step scaffolding. The test-coder does not branch for walkthroughs. The writer renders the walkthrough section list (step sections, supporting videos in body, closing external-resources), not the implementation contract.

## Lesson framing

The student walks away with the audit's operating discipline — open the running app, hold it side by side with source, read one finding's fingerprint on its diagnostic surface, write it before moving on — and a completed `findings/007-missing-priority.md` that fixes the rule-location-consequence-fix shape every later finding copies. The senior payoff is the inversion: a junior reads source top to bottom and misses half the bugs; a senior drives from the running app's signals (DevTools Performance, Network, the dev console) toward the source line, because three of the four observability findings surface in under a minute on a live surface that source reading can't reveal (a raw `<img>` or a missing config file leaves no grep target). The student leaves able to name which of the chapter's eight findings lives on which surface and to write a finding whose consequence is operator- or user-visible, never "code smell."

## Codebase state

**Entry.** The `start/` tree boots locally (lesson 1 setup complete): app on `localhost:3000`, seeded org_acme with ~30 customers, 240 invoices, ≥3 members; student signed in as `alice@example.com`. All eight findings live and unfixed: Sentry unwired (no config files), logger leaks `stripe-signature` with no `requestId`, PostHog captures pre-consent, RSC dashboard awaits sequentially, `lucide-react` barrel import in the protected layout, hero `<Image>` missing the eager-load prop, N+1 in `invoices-with-customer.ts`. The `findings/` skeleton ships with `template.md`, ten numbered placeholder files each carrying empty `Category` / `Severity` / `Rule` / `Location` / `Consequence` / `Fix` sections and a `TODO(LN)` comment, `SUMMARY.md`, `out-of-scope.md`, and an empty `screenshots/`. No finding documented, no wiring installed.

**Exit.** Source tree unchanged — no app code edited. `findings/007-missing-priority.md` is filled with all five fields (Category, Severity, and the four template sections), its Location naming `src/app/(marketing)/page.tsx` lines 21–27 plus the DevTools Performance LCP marker as the surfacing command, its Consequence stating the LCP timing past 2.5s at p75, its Fix naming the three layers (the eager-load prop, the `no-img-element` lint as regression guard, `width`/`height` as the separate CLS layer). The other nine findings files remain empty placeholders for later lessons. The student has navigated each diagnostic surface once and can map each finding to its surface.

## Lesson sections

Walkthrough structure: an unheaded intro, then sequential h2 sections (one per phase of the cadence), supporting videos inline, a closing external-resources section. No exercises, no `<details>` solution, no test command framed as the deliverable (the Moment-of-truth confirmation is woven into the closing section as a self-check, not an implementation gate).

### Intro (no header)

State the goal in one short paragraph: this lesson installs the *method* the rest of the chapter runs on, then proves it by writing the reference finding. Name the inversion that motivates it — the running app is the primary diagnostic surface; reading source alone is the slow path and misses the findings that leave no grep target. Preview the two halves: a surface-by-surface tour of all eight findings, then finding 7 written end to end as the shape every later file copies.

### The audit cadence

The discipline stated as four beats: open the running app → hold it beside the source → read one finding's fingerprint on its surface → write it before moving on. One short paragraph. Frame why "write it before moving on" matters — batching observations loses the surface evidence (the trace, the Network row) you can't reconstruct later. Reference the rule-location-consequence-fix template (`findings/template.md`) as the shape each write lands in; do not re-explain it (carried from chapter 082, link the chapter 082 audit lesson).

### Tour the running app, surface by surface

Walk the five live signals in order, naming which finding each reveals and which DevTools/console surface is canonical. Each is a short step the student performs against their booted app. Use `Code` for the exact commands/URLs the student hits; use `Screenshot` (wrapped in `Figure`) where a DevTools panel state is load-bearing (the LCP marker, the `/ingest` Network row).

1. **Dashboard RSC waterfall (finding 5).** Open `/dashboard` with DevTools Performance recording; watch the four reads (`requireOrgUser` → `getOrganization` → `listInvoicesWithCustomer` → `listMembers`) run sequentially with idle gaps. Surface: Performance trace.
2. **Marketing hero LCP (finding 7).** Open `/` with Performance recording; the LCP marker lands on the hero past 2.5s. Surface: Performance LCP marker + Network priority/initiator. This is the finding modeled below — flag it as the worked example.
3. **PostHog pre-consent capture (finding 4).** Open Network filtered to `ingest`, reload pre-consent; the `/ingest` capture fires on first load (PostHog routes through the `/ingest` reverse proxy, pre-wired in `next.config.ts`, from chapter 093). Surface: Network panel — note it is faster than reading `providers.tsx`.
4. **Sentry not wired (finding 1).** Hit `GET /api/test/throw`; the default Next.js error page renders and no Sentry event appears. Surface: the (empty) Sentry dashboard + the absent config files.
5. **Logger secret leak (finding 2).** Tail the dev console and replay the webhook flow; the log line includes the raw `stripe-signature`. Surface: dev console.

Callout (`Aside`): three of the four observability findings surface here in under a minute; this is the speed argument for driving from the running app.

A supporting video belongs here if one demonstrates DevTools Performance LCP/waterfall reading (resourcer fills later) — brief it as the inline body video the walkthrough contract allows.

### Map each finding to its source cluster

Hold the running app beside the source and name where each finding clusters and which seams the audit runs against. Use `FileTree` to render the cluster compactly (this is the file-tour use FileTree is for). Annotate only the finding-bearing files and the named-for-orientation seams:

- Finding 1 — the four missing Sentry config files (`instrumentation-client.ts` / `instrumentation.ts` / `sentry.server.config.ts` / `sentry.edge.config.ts`), `next.config.ts` not wrapped.
- Finding 2 — `src/lib/logger.ts` has no `redact` seam; finding 3 — same file, no `requestId` mixin.
- Finding 4 — `src/app/_components/providers.tsx` (ungated PostHog).
- Finding 5 — `src/app/(protected)/dashboard/page.tsx` (sequential awaits).
- Finding 6 — `src/app/(protected)/layout.tsx` (`lucide-react` barrel).
- Finding 7 — `src/app/(marketing)/page.tsx` (missing eager-load).
- Finding 8 — `src/db/queries/invoices-with-customer.ts` (N+1).

Existing seams named for orientation (untouched here): `src/env.ts` (Sentry keys land later), `src/proxy.ts` (correlation-ID scope lands later), the healthy `src/db/queries/invoices.ts` (already uses the relations API — the N+1 lives in the *dedicated* `invoices-with-customer.ts` helper so the grep stays falsifiable), and `requireUser` / `requireOrgUser` / `tenantDb` / `audit-log`. Note the consent banner does not exist yet — built from scratch in lesson 5.

Callout (`Aside`): findings are deliberately spread so each has a distinct grep target or DevTools view; a raw `<img>` (finding 7) or a missing config file (finding 1) leaves no grep target, which is why the live surface leads.

### Write finding 7 end to end

The worked example — the heart of the lesson. Walk the four template sections being filled for `findings/007-missing-priority.md`, mirroring the solution file the student converges on. Use `AnnotatedCode` on the hero `<Image>` block from `src/app/(marketing)/page.tsx` (lines 21–27) to direct attention to the present props (`src`, `alt`, `width`, `height`) versus the absent eager-load prop. Show the finding file being filled with `Code` (markdown block).

Cover each section as the model:

- **Category / Severity.** LCP / Core Web Vitals (chapter 094 lesson 2); high — unauthenticated first impression and the route Search scores; not critical because nothing is lost, the page renders, it is slow not broken. Model the two-line severity justification.
- **Rule.** Eager-load the LCP element exactly once per page so the browser fetches it during parse, not at layout (chapter 094 lesson 2). Name the Next.js 16 rename: the `next/image` prop is `preload`; `priority` is the deprecated alias for the same behavior. Link the chapter 094 lesson section, don't re-explain.
- **Location.** `src/app/(marketing)/page.tsx` lines 21–27 **plus the surfacing command** — the DevTools Performance LCP marker as primary, the `rg -n "<Image" ...` grep as source-side confirmation. Stress the template requirement that Location names the diagnostic surface, not just the line.
- **Consequence.** The LCP regression near 4s past the 2.5s p75 threshold; the largest element (the product screenshot) arrives late on the slowest connections; Search scores LCP at p75 over a rolling 28-day window so the regression lags two weeks and is search-ranking exposure on the most-indexed route. Operator/user-visible with a timing — never "code smell."
- **Fix.** Three layers: (1) add the eager-load prop to the hero `<Image>` exactly once; (2) add `@next/next/no-img-element` at error as the regression guard (lives in `eslint-config-next/core-web-vitals`, not Biome — naming it is the documented reach, not a wiring change to this target); (3) keep `width`/`height` as the separate CLS layer. Note this is documented, not patched — the marketing page keeps the defect so the surface stays readable for the chapter.

`Aside` (tip): half-credit names only the prop and stops; full credit names the renamed prop, the lint guard, and `width`/`height` as the orthogonal CLS layer.

### The cadence rules the rest of the chapter relies on

Close on the two rules that carry forward. First: observability findings 1–4 get *fixed* in the wire lessons, so their finding files' Fix sections will be a paragraph naming the seam installed (not a diff), and those placeholders stay empty until their wire lesson completes — only finding 7 is fully written now. Second: read the trace before the source on performance findings; inverting it misses bugs where the dependency only *looks* present. State the self-check that closes the lesson (the Moment-of-truth confirmation woven in as prose, not a test gate): `findings/007-missing-priority.md` carries all four sections, its Location matches the hero `<Image>`, its Consequence is operator-/user-visible (the LCP timing), and the student can name which surface reveals which finding.

### External resources (no header content from this agent)

Closing external-resources section per the walkthrough contract (resourcer fills later): candidates are the web.dev LCP/Core Web Vitals reference and the Next.js `next/image` docs. Brief as a placeholder; do not author cards.

## Scope

- **Wiring Sentry, the logger, the consent gate** — not here; lessons 3, 4, 5 fix observability findings 1–4. This lesson only *documents* finding 7 and *tours* the rest.
- **Writing findings 5, 6, 8 and `SUMMARY.md`** — lesson 6 (performance half). The barrel-import in-place fix and bundle-analyzer before/after also live in lesson 6.
- **Bonus findings 9 (raw `<link>` font) and 10 (composite index)** — surfaced in lesson 6 / lesson 5 as optional reach; not written here.
- **The rule-location-consequence-fix template internals** — owned by the chapter 082 audit lesson; link, don't re-teach.
- **`next/image` eager-load and Core Web Vitals theory** — owned by chapter 094 lesson 2; link, don't re-explain. This lesson applies the rule, it doesn't teach it.
- **Self-grading against `solution/`** — lesson 7; the answer key stays unread until the commit.
