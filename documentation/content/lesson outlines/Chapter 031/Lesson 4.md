# Lesson outline — Chapter 031, Lesson 4

## Lesson title

- **Title:** Catching the root layout
- **Sidebar label:** Global error

## Lesson framing

This is a short lesson (~30-40 min, the chapter outline's own estimate) that resolves a cliffhanger L3 deliberately planted: a throw in the **root layout** sails straight past `app/error.tsx` and hits the browser's bare default error screen. L3's last `error.tsx` section already taught *why* an Error Boundary can't catch the layout it sits beside (the layout is the boundary's parent; it renders before the boundary exists). This lesson reuses that exact structural argument, walks it up one level to the root, and names the one file that lives *above* the root layout: `global-error.tsx`. The whole lesson is the answer to one senior question — "why didn't my `error.tsx` catch this, and what does?" — so it should feel like the natural close of the chapter, not a fresh topic.

Pedagogical spine, in order of decisions:

1. **Reproduce the failure first.** Open by *showing* the broken state — root layout throws, `app/error.tsx` is in place, user still gets the ugly default screen. Don't re-derive the boundary-can't-catch-its-parent rule from scratch; L3 taught it. Re-state it in one sentence and then escalate: the root layout has no `error.tsx` above it, so its throw escapes the whole tree. This is the trigger that the platform default (segment `error.tsx`) crosses — exactly the "trigger before tool" filter.

2. **Name the tool and place it on the tree.** `global-error.tsx` is the single Error Boundary that wraps the root layout itself. Drive home *where* it sits — it is the absolute outermost boundary, above `app/layout.tsx`. The mental model the student leaves with: every other `error.tsx` is a boundary *inside* the app shell; `global-error.tsx` is the boundary *around* the shell, the last net before the browser default.

3. **Teach the file's two non-negotiables as consequences, not rules.** (a) `'use client'` — same reason as `error.tsx` (Error Boundaries are stateful class machinery), already taught, so this is a one-line callback. (b) **It must render its own `<html>` and `<body>`.** This is the genuinely new idea and the one beginners get wrong. Frame it causally: when `global-error.tsx` fires, the root layout — the thing that normally renders `<html>`/`<body>` — is the thing that just crashed. There is no parent shell left. So `global-error.tsx` *replaces* the root layout and must reconstruct the document skeleton itself. This causal framing is the whole point; a student who understands *why* will never forget the tags.

4. **The "page that must not fail" discipline.** This is the senior reach and the most transferable lesson. `global-error.tsx` is the last line of defense; if *it* throws, the user gets nothing recoverable. So it must be the most defensive component in the codebase: no data fetching, no business logic, no providers that can fail, minimal styling, nothing that can itself throw. Tie this to two concrete constraints the student must respect — global CSS / fonts / providers from the crashed layout may not be in effect, and locale/i18n setup probably hasn't loaded. Both are instances of one rule: *assume nothing above you survived.*

5. **Close the chapter.** A short synthesis: the four-states/four-files frame from L3 plus this one root-level escape hatch = the complete error surface of an App Router app. End with the senior config — `app/error.tsx` *and* `app/global-error.tsx` both at the root, segment-level `error.tsx` where a feature deserves a tailored message.

Cognitive-load notes: this lesson rides almost entirely on prior knowledge. The new surface area is small — one file, two hard rules, one discipline. Spend the budget on the *causal why* of the `<html>`/`<body>` requirement and the *judgment* of what may not belong, not on syntax. Keep code minimal; the canonical `global-error.tsx` is ~10 lines. One scrubbable diagram for the "where it sits / what survives" model, one before/after code comparison, one compact assessment. No live-coding exercise — same constraint L1-L3 hit (framework file-convention wiring and production-vs-dev rendering can't be modeled in the in-browser React runtime); say so in the continuity notes.

Tone: terse, adult, senior-framed. This is the resilience capstone of the chapter — frame it in production stakes (a deploy with a bad env var in the root layout takes the *entire site* to a blank screen unless this file exists).

## Lesson sections

### Introduction (no header)

Open on the unresolved thread from L3. Brief, concrete: the student has `app/error.tsx` wired and feels covered for the whole app. Then the failing scenario — the root layout (`app/layout.tsx`) does something at request time that throws: a misconfigured provider, a bad env var read, an auth/session setup call that blows up. The result is *not* the friendly `error.tsx` UI — it's the browser's stark default error page, the whole app gone. State the lesson's job in one line: name the one file that catches this, understand why it's shaped the way it is, and know what must never go in it. Connect explicitly back to L3's `error.tsx` finale ("the deliberate handoff I promised"). Keep it to ~2 short paragraphs; preview that by the end the student ships `app/global-error.tsx` as the site's last line of defense.

Mention the estimated student time is short and that this is the chapter's resilience capstone — set the expectation that it's a focused lesson building on what they already know.

### Why your `error.tsx` lets the root layout through

Goal: re-anchor the structural rule from L3 (one sentence of callback, not a re-derivation) and escalate it to the root.

Content:
- One-sentence recall: an Error Boundary catches throws from its *descendants*; the layout it sits beside is its *parent*, so a render error in that layout happens before the boundary exists to catch it. (This is L3's `error.tsx`-can't-catch-its-own-layout rule — cite it as already known.)
- The escalation: walk it up the tree. `app/error.tsx` is a boundary *inside* `app/layout.tsx`. So `app/error.tsx` can't catch a throw in `app/layout.tsx`. And there is no `error.tsx` *above* the root layout — the root layout is the top of the application tree. A throw there has nowhere to bubble. It escapes every boundary you've written and lands on the framework's bare fallback.
- Land the gap precisely: the segment files from L3 cover everything *under* the root layout; nothing covers the root layout *itself*. That's the hole this lesson fills.

Visual — **the failing render, scrubbable**: use a `DiagramSequence` (owns its own card, no `<Figure>` wrapper) of 3 short steps reusing L3's nested-box HTML+CSS style for visual continuity. Author boxes as `<div>`s with a small inline `<style>` block, horizontal, well under the height cap.
- Step 1 — "The tree you have." Outer box `app/layout.tsx (root layout)` neutral/grey. Inside it, an `app/error.tsx boundary` box (red ring) wrapping a `page.tsx` core (green check, "caught"). Caption: errors under the root layout are caught by `app/error.tsx`, exactly as L3 taught.
- Step 2 — "The root layout throws." Mark the outer `app/layout.tsx` box with a red ✕ and a label "throws here". Show (arrow/label) the throw is *outside* the `error.tsx` boundary — the boundary is its child. Caption: the boundary lives inside the layout, so a layout render error happens before the boundary exists.
- Step 3 — "Nothing catches it." Show the throw escaping past the top of the `app/` tree to a stark `browser default error screen` box (grey, no branding). Caption: there is no `error.tsx` above the root layout — the throw escapes the whole app and the user gets the framework's bare fallback.

Pedagogical goal of the diagram: make "the boundary is the layout's child" spatially obvious one more time, then show the escape visually so the *need* for a boundary above the root is felt before the tool is named. This is the "trigger before tool" beat rendered as a picture.

Terms for `<Term>`: none new here — "boundary," "route segment," "bubble up" were all defined in L3; do not redefine, just use them. (Note for writer: L3 defined these inline; reuse the vocabulary so the lesson reads as continuous.)

### `global-error.tsx`: the boundary above the root layout

Goal: name the tool, place it on the tree, and show its minimal shape.

Content:
- The reveal: `global-error.tsx`, at `app/global-error.tsx`, is the one Error Boundary the framework wires *above* the root layout. It is the absolute outermost boundary in the App Router tree. Errors that escape every `error.tsx`, plus errors in the root layout itself, plus errors in the framework's own root render, all surface here.
- State the mental model crisply (this is the line to remember): every other `error.tsx` is a boundary *inside* the app shell; `global-error.tsx` is the boundary *around* the shell — the last net before the browser default.
- Where it sits, one line tying to the diagram from the previous section: it wraps `app/layout.tsx` itself.

Code — the minimal shape via a single `Code` block (this is short enough that AnnotatedCode would be overkill for the *whole* file, but the `<html>`/`<body>` line needs focused attention — so present the block plainly, then make the two key facts their own short callouts/subsections below). Block:

```tsx title="app/global-error.tsx"
'use client';

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <h2>Something went wrong</h2>
        {error.digest != null && <p>Reference: {error.digest}</p>}
        <button onClick={() => unstable_retry()}>Try again</button>
      </body>
    </html>
  );
}
```

Code conventions (verified against the live Next.js 16.2 docs, 2026-03-25):
- Props are **exactly** `{ error: Error & { digest?: string }; unstable_retry: () => void }` — identical to the `error.tsx` signature L3 taught. Call this out explicitly: *same props as `error.tsx`*, so there's nothing new to learn about the contract. Continuity-critical: L3 used `unstable_retry` (added v16.2.0) as the retry prop and `error.digest != null &&` (explicit null check). Mirror both verbatim.
- `'use client';` single-quoted, at the very top.
- Default export — sanctioned framework exception to the named-exports rule (already established in L3 for the other convention files; `global-error.tsx` is on the same allow-list in the code conventions doc). One-line reminder, not a re-teach.
- Add `lang="en"` to `<html>` — small senior detail (accessibility/SEO baseline) and a natural hook into the i18n caveat later.

Prose after the block: point out the three things the student already recognizes (`'use client'`, the `error`/`unstable_retry` props, the `digest` shown for support tickets — all from L3's `error.tsx`) and the **one new thing**: the `<html>`/`<body>` tags. That sets up the next two subsections, which explain the two non-negotiables.

#### `'use client'` — the same reason as `error.tsx`

Goal: dispatch this in a few lines; it's pure callback.

Content: `global-error.tsx`, like `error.tsx`, must start with `'use client'`. Same reason, stated once: React Error Boundaries are class-component machinery (`getDerivedStateFromError`, `componentDidCatch`) and hold state — client-only. Omit the directive and the build fails. Don't re-explain Error Boundaries; reference L3. One extra current-fact worth a single sentence (verified in the live docs): because it must be a Client Component, `metadata`/`generateMetadata` exports are **not** supported in `global-error.tsx` — if you need a tab title, use React's `<title>` element inside the returned JSX. Keep this to one sentence; it's a precise, current detail, not a rabbit hole.

#### Why it must render its own `<html>` and `<body>`

Goal: this is the conceptual heart of the lesson. Teach it causally so it's unforgettable.

Content:
- The causal chain, stated plainly: normally `app/layout.tsx` renders the `<html>` and `<body>` wrapper for the whole app, and every page renders *inside* that shell. But `global-error.tsx` fires precisely *because the root layout crashed*. When it renders, the root layout — and therefore the `<html>`/`<body>` it would have produced — is gone. There is no parent document for `global-error.tsx` to render into.
- The consequence: `global-error.tsx` **replaces** the root layout entirely when it's active. It is rendered as the whole document, so it must reconstruct the document skeleton itself — its own `<html>` and `<body>`. (This is exactly the framing in the live Next.js docs: "This file replaces the root layout or template when active.")
- The failure mode, concrete: omit the tags and you ship a document with no `<html>`/`<body>` — a broken/blank page in production, which is the worst possible thing for the file whose entire job is the catastrophe screen. The student should leave knowing the tags aren't boilerplate ceremony — they're the reason the page renders at all.

Pedagogical note: do **not** present this as a rule to memorize ("global-error needs html and body"). Present the *why* first (root layout is what crashed → no shell left → you are the shell now), and let the rule fall out. A student who internalizes the causal chain reconstructs the rule on demand; one who memorizes the rule forgets it under pressure.

Optional small visual aid (writer's judgment — only if it earns its space): a tiny two-panel `TabbedContent` or inline HTML+CSS `Figure` contrasting the normal nesting (`<html>/<body>` from layout wrapping the page) vs. the global-error case (`global-error.tsx` *is* the `<html>/<body>`). If it adds clutter rather than clarity given the diagram already in §2, skip it — the causal prose is the load-bearing teaching here.

### Why this is production-only — and the dev trap

Goal: the verify-in-production-build discipline, mirroring L3's identical lesson for `error.tsx`. This is a known trap escalated to the root level.

Content (verified against live docs + the v15.2 changelog, the chapter outline's "production-only by default" phrasing needed this correction):
- The accurate, current behavior: in `next dev`, when the root layout throws, the Next.js dev **error overlay** appears on top — full message, full stack. As of Next.js 15.2, `global-error.tsx` *is* also rendered underneath in development (a deliberate change so devs can preview it), **but the overlay covers it.** So in dev you are still looking at the developer experience, not the user experience.
- The rule, identical to L3: **never sign off on `global-error.tsx` from `next dev` alone.** Build the app and run the production build locally to see the real thing — no overlay, the generic message, the `digest`, your actual layout. State plainly that the overlay covering the file in dev is *why* people ship a broken `global-error.tsx` without noticing.
- One sentence connecting to L3: this is the same "verify error UX in a production build" rule you learned for `error.tsx` — it applies with even more force here, because a broken `global-error.tsx` means the whole site, not one segment, has no recoverable screen.

Component: a short `:::caution` Aside is the right weight for the dev-overlay trap. Don't over-build it.

Note for the writer (accuracy guardrail): the chapter outline says "production-only by default… the fallback only renders in production." That was true pre-15.2 and is now stale. The current behavior is: it renders in dev too, but the overlay sits on top. Teach the *current* behavior. The practical advice (use a production build to verify) is unchanged and is what matters; just get the mechanism right so the lesson isn't teaching a stale claim.

### A page that must not fail

Goal: the senior discipline — the most transferable idea in the lesson. What belongs, what must never go in, and why.

Content:
- The principle, stated up front: `global-error.tsx` is the last line of defense. If it throws while rendering, there is no boundary below it — the user gets nothing recoverable. So it must be the single most defensive file in the codebase. Its one job is to render a page that *cannot itself fail*.
- **What belongs:** the catastrophe UI — a calm message, the `error.digest` for support correlation, a "Try again" wired to `unstable_retry()`, a brand-aligned but stripped-down shell, a "contact support" path. And — the monitoring hook — this is the canonical place to report the catastrophe to your error-tracking service. (Mirror L3's framing: a `useEffect` that calls the monitoring SDK belongs here; the full integration is later in the course — name the location, defer the wiring. The live `error.tsx` docs show exactly this `useEffect(() => { /* report */ }, [error])` pattern, so it's consistent.)
- **What must never go in:** business logic, data fetching, anything that can throw. Spell out the bitter irony — an error page that itself errors is unrecoverable.
- Two concrete constraints that are *instances of the same rule* ("assume nothing above you survived") — teach them as a pair, not as disconnected gotchas:
  - **Styling.** When `global-error.tsx` renders, the global CSS, fonts, and design-system providers imported by the *crashed* root layout may not be in effect — the layout that loaded them is gone. Keep the page simple: minimal inline styles or a small set of Tailwind utility classes (the framework's Tailwind layer is still available), no design-system providers, no custom-font dependency, no client-only context providers. (This matches the live docs: global-error "must define its own global styles, fonts, or other dependencies that your error page requires.")
  - **Internationalization.** Locale-aware copy needs the i18n setup to have loaded *before* the crash — for a top-of-layout failure it usually hasn't. So keep `global-error.tsx` in a single default-locale string ("Something went wrong" + the digest), not a translated message. Name that proper i18n is a later chapter; here, just don't depend on it. (This is the one place the lesson reaches forward — keep it to a sentence and a forward-pointer, no i18n teaching.)
- Synthesize the two: both constraints are the same instinct — *the things above you in the tree are exactly the things that just failed, so depend on none of them.* That sentence is the senior takeaway; make it explicit.

Component: prose-led. The two constraints can be a short `:::note` or just tight paragraphs. The "report to monitoring belongs here" point is one sentence + a forward-pointer, matching how L3 handled it. Avoid a second large code block — one minimal `global-error.tsx` (already shown) is enough; if a "what a real one looks like" illustration helps, a single small additional `Code` block adding the monitoring `useEffect` and a "contact support" line is acceptable, but keep it short and don't let it balloon the lesson.

### The complete error surface

Goal: chapter-closing synthesis. Place `global-error.tsx` against `app/error.tsx` and the L3 segment files so the student leaves with the whole map.

Content:
- The relationship, crisp: `app/error.tsx` catches errors in `app/page.tsx` and any nested segment without its own `error.tsx`. `app/global-error.tsx` catches errors in `app/layout.tsx` *plus* anything that escapes `app/error.tsx`. They are complementary, not redundant — and the senior config ships **both** at the app root.
- The full picture, tied back to L3's "four states, four files": L3 gave the four states of a *segment* and the four files that ship them; this lesson adds the one boundary that sits *above* the whole app for the case where the shell itself fails. Together that's the complete error surface of an App Router app.
- The senior default to leave with: `app/error.tsx` + `app/global-error.tsx` at the root, plus segment-level `error.tsx` files wherever a feature deserves a tailored failure message. State it as the shippable recommendation.

Visual: a small `FileTree` showing the app root with both files, to make the "both at the root" config concrete and echo L3's closing FileTree style:
```
app
  layout.tsx        the app shell
  error.tsx         catches everything under the shell
  global-error.tsx  catches the shell itself
  page.tsx
```
Plus one line naming what each catches (as inline comments in the tree, matching L3's FileTree-with-comments convention).

### Check your understanding

Goal: lightweight recall on the three things the lesson most wants to stick — the two non-negotiables, the dev trap, and the discipline. Keep it to one drill given the lesson's short length.

Component: a single `TrueFalse` round (matches L3's assessment style; sizes well, surfaces the gotchas). ~5 statements. Proposed:
- TRUE — `global-error.tsx` must render its own `<html>` and `<body>` tags. (Why: it replaces the crashed root layout, which normally renders them — there's no parent shell left, so global-error *is* the document.)
- TRUE — `global-error.tsx` must start with `'use client'`. (Why: same as `error.tsx` — Error Boundaries are stateful client-only class machinery; omit it and the build fails.)
- FALSE — You can verify your `global-error.tsx` UI by triggering the error in `next dev`. (Why: the dev overlay covers it; since 15.2 the file *renders* in dev but the overlay sits on top, so you see the dev experience, not the user's — verify in a production build.)
- FALSE — `global-error.tsx` is a good place to fetch the data you need to render a richer error page. (Why: it's the last line of defense — any throw, including a failed fetch, leaves the user with nothing recoverable. No data fetching, no logic that can fail.)
- FALSE — `app/global-error.tsx` makes `app/error.tsx` redundant; you only need one. (Why: they cover different scopes — `error.tsx` catches under the shell, `global-error.tsx` catches the shell itself and anything escaping `error.tsx`. Ship both at the root.)

Each `<Statement>` carries a `<TfWhy>` with the parenthetical above as the explanation. Add an `instructions` lead-in like "Each claim is about `global-error.tsx` and the app's error surface."

(Optional second drill only if the writer judges the lesson too thin with one: a tiny `Buckets` mapping "root layout throws / a page component throws / global CSS unavailable" to the right file/behavior. Default to just the TrueFalse — the lesson is intentionally short and the chapter quiz (L5) covers `global-error.tsx` again.)

### Going further

One or two `ExternalResource` cards.
- Primary: the Next.js `error.js` file-convention reference on nextjs.org (the same page documents `global-error` under its "Global Error" example) — short description: the official prop table and the `global-error` shape, including the current `unstable_retry` API and the `<html>`/`<body>` requirement. (Note for resourcer: confirm the canonical URL `https://nextjs.org/docs/app/api-reference/file-conventions/error` and that `unstable_retry` is still the prop name at publish time — it landed in v16.2.0 and is the documented default, but carries the `unstable_` prefix and may be renamed.)
- Optional: the Next.js "Error Handling" getting-started guide for the conceptual overview. Skip if one card reads cleaner.

## Scope

**Prerequisites (assume taught, redefine in one line at most):**
- `error.tsx` as a segment-level Error Boundary, its `'use client'` requirement, its `error`/`unstable_retry`/`reset` props, the `digest`, and the rule that it can't catch the layout it sits beside (L3). This lesson *builds directly* on all of it — re-state, never re-teach.
- "boundary," "route segment," "bubble up" as defined inline in L3 — reuse the vocabulary, do not redefine.
- `loading.tsx`, `not-found.tsx`, the "four states / four files" frame (L3) — referenced in the synthesis section only.
- Server-default / client-opt-in reflex, `'use client'` mechanics (Ch030, reinforced L3).
- "Full Error never crosses the wire; Server Component errors are stripped to a generic message + digest" (Ch030, L3) — the `digest` line in the code rides on this; one-clause callback, no re-teach.
- `unstable_retry()` vs `reset()` semantics (L3 taught this in depth) — here, just use `unstable_retry` in the example and reference the prior treatment; do **not** re-litigate the retry comparison.

**Explicitly out of scope (do not teach here):**
- Segment-level `error.tsx`, `not-found.tsx`, `loading.tsx` in any depth — that's L3, done. Reference only.
- The `unstable_retry()` vs `reset()` deep comparison — L3 owns it.
- Error monitoring / Sentry integration in depth (the `captureException`/`useEffect` wiring) — Ch092. Name the *location* (the monitoring report belongs in `global-error.tsx`), defer the *how*.
- Custom error classes and the error-handling discipline at large — Ch080.
- Internationalization proper — Ch084. Here, only the one-sentence caveat that `global-error.tsx` can't depend on i18n that hasn't loaded; point forward, don't teach.
- Server Action error handling / the expected-failure channel (structured return + inline render) — Ch043. L3 already drew the throw-vs-return line; don't reopen it.
- `global-not-found.js` (experimental, multiple root layouts) — L3 named it once and dropped it; do not resurrect.
- Page-level metadata for error pages — Ch034 L9. (The one sentence here is only that `metadata` export is *unsupported* in `global-error.tsx` and `<title>` is the workaround — a constraint of *this* file, not a metadata lesson.)
- Partial Prerendering, caching, `cacheLife`/`cacheTag` — Ch032.

**Depth ceiling:** this is a 30-40 min capstone, not a deep dive. The new teaching is: one file, two non-negotiables (`'use client'` callback + `<html>`/`<body>` causal teach), one discipline ("a page that must not fail" + its two constraints), one synthesis. Resist expanding any of these into a sub-treatise. If a topic tempts a deep dive, it's almost certainly owned by another chapter (see above).
