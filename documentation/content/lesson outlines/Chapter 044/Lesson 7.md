# Progressive enhancement for free

- Title: `Progressive enhancement for free`
- Sidebar label: `Progressive enhancement`

## Lesson framing

The chapter closer. Archetype: **concept**, short (25–35 min). The inversion is the whole lesson: the student does **not** build progressive enhancement (PE) here — they learn that the six prior lessons already produced it, what exactly survives a no-JS submit and what degrades, and the small discipline list that keeps it intact. The senior posture to install verbatim: **don't try to make the form PE-compatible; don't break the PE the platform already gave you.**

Why this lesson exists (state it early, it reframes the student's instinct): the 2018–2023 SPA era trained the reflex that a form needs JS to work, so PE reads as a niche extra-effort concern. In the chapter's pattern (`action` prop + uncontrolled inputs + Server Action) it's the *default*, and you have to actively work to lose it. That reframing is the lesson's payoff, not a new API.

Target student: junior dev who just wired `useActionState`, `useFormStatus`, `useOptimistic`, and the Constraint Validation API across lessons 1–6. They can build the form. The gap this lesson closes is **why it keeps working when the bundle isn't there**, and **which of the niceties they just learned are JS-only enhancements layered on top**. No new hook, almost no new code — the cognitive move is re-seeing the existing form through the no-JS lens.

Mental model to leave the student with: **one Server Action, two front doors.** The JS-enhanced door (React intercepts the submit, POSTs in the background, reads the returned `Result`, renders inline) and the native-browser door (the browser does a plain form POST to the action's URL, the action runs identically, the response is a navigation). Both doors lead to the same action body — the seam from chapter 043. The action is mode-agnostic; the *experience* differs, the *function* does not. This "two doors, one room" framing is the spine of the lesson and the central diagram.

Pedagogical spine — keep cognitive load low by sequencing:
1. Concrete failure scenario (flaky connection, bundle not yet loaded) → the question "what happens to the submit?"
2. The reassuring answer + the two-doors model (the central diagram).
3. The honest ledger: what works without JS vs what degrades — a side-by-side, this is the lesson's information core.
4. The one real design decision PE forces: the no-JS error path (redirect-and-render vs the degraded fallback). This is where senior judgment lives; everything before is mechanism.
5. The discipline list (the "don't break it" rules) — each rule tied back to a lesson 1–6 reflex the student already holds, so it lands as consolidation, not new material.
6. The test: one manual JS-disabled pass at feature-launch. Cheap, real, named as the verify step the project chapter inherits.

Treat this lesson as a **synthesis** of the chapter. Nearly every point is "remember X from lesson N — here's its PE consequence." Lean hard on that; do not re-teach the mechanics, point back. The continuity notes for lessons 1–6 are the source of truth for the exact APIs, terminology, and worked entity (the **invoices / `createInvoice`** domain — continue it; the form is `app/invoices/new-invoice-form.tsx`, action from `./actions`).

Tone: terse, adult, decision-first. The student should finish able to (a) explain to a teammate why the form works without JS, (b) name what degrades, (c) make the no-JS-error-path call deliberately, (d) run the manual test. No celebratory framing of PE as heroic — it's the natural consequence, and the lesson's confidence comes from that.

## Lesson sections

### Introduction (no heading — opens the page)

Open on the concrete scenario, not a definition: a user on a flaky mobile connection (or a slow first paint) taps **Create invoice** before the JS bundle has finished downloading and hydrating. React's `action`-prop machinery isn't wired up yet — there's no `onSubmit` interceptor, no background POST, no `useActionState`. The senior question, stated implicitly: *does the submit just fail?*

Answer immediately and reassuringly: no — the invoice still gets created. The browser falls back to what `<form>` has always done: a native POST to the action's URL with the form's `FormData` as the body; the framework routes that POST to the same Server Action; the action parses, mutates, revalidates, redirects; the user lands on the result. **This is progressive enhancement, and the form got it for free** — every choice in lessons 1–6 (the `action` prop over `onSubmit`+`fetch`, uncontrolled inputs over per-field state, the Server Action over a client `fetch`) was already a PE choice; the student just didn't have the name for it yet.

State the lesson's shape in one line: this is a short closer; the goal is to *see* the PE the chapter already built, know its limits, and learn not to break it. Connect to prior knowledge explicitly — name the seam (chapter 043 Server Action) and the form pattern (lessons 1–6) as the things that combine into PE.

Define PE precisely once, scoped to this chapter (don't let it drift to the broad web-platform meaning): **a form is progressively enhanced when its submit succeeds with JavaScript disabled or before the JS bundle has loaded — the form's *function* works in both modes; the *experience* degrades without JS.** Bold the function/experience split — it's the distinction the whole lesson turns on.

Use a `Term` on **progressive enhancement** at first mention (definition: building so the core function works on the baseline platform, with JS layering richer experience on top — not "graceful degradation," which starts from the rich version and strips down).

### One Server Action, two front doors

The conceptual core. Teach the two submit paths as two doors into the same room (the action body).

- **The JS-enhanced door** (lessons 2–3, recap in two sentences, do not re-teach): React intercepts the submit, serializes named inputs to `FormData`, calls the bound `formAction` as a background POST, flips `isPending`, reads the returned `Result`, re-renders inline (banner, field errors, or auto-reset on success). No navigation.
- **The native-browser door** (the new framing): with no JS, the browser does what it does for any `<form>` — collects the named inputs into `FormData` and issues a real HTTP POST to the form's `action` URL. The framework registered that URL for the Server Action at build time (recall lesson 2's **opaque action ID** — the import was rewritten to an ID that doubles as the POST endpoint). The action runs identically. The response is a full document / navigation, not an inline patch.
- **The convergence point**: both doors call the *same* `createInvoice`, with the *same* `FormData` shape (the `name` contract from lesson 1 holds in both modes — this is why uncontrolled-by-default matters here, callback to lesson 1's "the lighter the client state, the more the platform does for you"). The action is written once and is unaware which door the request came through.
- **Precision the writer must hold (verified, June 2026):** the native door only exists because the chapter uses a **Server Action** passed to the form. A Server Function submitted pre-hydration / no-JS becomes a real HTTP POST. A *client* action passed to a form would instead be **queued until hydration** — no native door. Don't overgeneralize to "any `action` prop works without JS"; it's specifically the Server-Action shape (the chapter's default) that earns PE. One sentence is enough; the student only ever uses Server Actions here.

Central diagram — **`DiagramSequence`** (it's a temporal walk; the student scrubs the same submit through both modes). This is the lesson's anchor visual; goal: cement "two doors, one room." Build the two paths as parallel horizontal lanes (JS lane on top, no-JS lane below) sharing a single terminal node (the Server Action), authored as plain HTML+CSS inside each `DiagramStep` (per diagrams INDEX: sequential phase strips → HTML+CSS; keep horizontal, cap height). Steps:
1. **Submit fired** — both lanes light their first node: JS lane "React intercepts"; no-JS lane "browser native POST". Caption: same click, two mechanisms.
2. **Wire format** — both lanes converge visually toward one `FormData` node. Caption: identical `FormData` either way — the `name` contract is mode-agnostic.
3. **The action runs** — both lanes feed the single shared `createInvoice` node (the room). Caption: one action body, five seams (chapter 043), unaware of the door.
4. **The response** — lanes diverge again: JS lane → "`Result` returned, inline re-render (`isPending`→false, banner/fields/reset)"; no-JS lane → "303 redirect, browser navigates to new page". Caption: function identical, experience differs — this divergence *is* progressive enhancement.

Do not wrap `DiagramSequence` in `Figure` (it provides its own card — per its doc). Provide per-step captions.

`Term` candidates in this section: **opaque action ID** (re-gloss from lesson 2 in one phrase — the build-time identifier the imported action reference is rewritten to, which also serves as the POST endpoint); **hydration** (if not already a settled term for the student by this chapter — the step where React attaches its event handlers to the server-rendered HTML; before it finishes, only the native door is open).

### What survives without JavaScript

The honest ledger — the lesson's information core. The goal is a crisp, memorable two-column split so the student can answer "does X work without JS?" for any piece of the chapter. Frame as: everything the **platform** provides survives; everything **React-the-runtime** provides does not.

Survives (platform-level):
- The `<form action={serverAction}>` submit itself — native POST to the action URL (the build-time-registered endpoint).
- The **Constraint Validation API** (lesson 6) — `required`, `type="email"`, `pattern`, `min`/`max`, etc. fire in the browser before submit, no JS needed. This is the *only* validation layer that survives a no-JS submit (callback to lesson 6's named PE fact). The native error bubble is back (the design-system inline rendering was the JS layer).
- `redirect()` from inside the action (chapter 043) — the framework returns a 303, the browser navigates.
- `revalidatePath()` (chapter 043) — the next request reads fresh data; the post-redirect page is current.
- The Server Component re-render after the redirect — the user sees the updated invoice list rendered server-side.

Degrades / absent (React-runtime-level):
- `useActionState`'s **inline** render of the `Result` — no React, no re-render in place. The `Result` still gets *produced* by the action; it just has nowhere to render without the hook. (This is the crux that forces the next section's decision.)
- `useFormStatus` — pending spinner / disabled `<SubmitButton>` (lesson 4). With no JS, `pending` is `false` forever (lesson 4's named PE fact); no in-flight affordance.
- `useOptimistic` — the instant UI change (lesson 5) is a pure JS enhancement; no-JS users wait for the real round-trip and see the result only after the post-action navigation (lesson 5's named fact).
- The automatic form reset on success (lesson 2) — React owns it; without JS, after a redirect the user is simply on a new page, so the "reset" is moot for the create case (the redirect replaced the page).
- Inline `Result`-driven field errors — same root cause as `useActionState`: no React to read `state` and render under the input.

Component: render this as a **`TabbedContent`** with two tabs ("Works without JS" / "Needs JS") — OR a two-column HTML+CSS table inside a `Figure`. Prefer the table-in-`Figure` for at-a-glance comparison (the student wants both columns visible simultaneously, not behind tabs); use color-coded columns (green/amber) with the lesson-N callback noted per row. Reasoning: a ledger is most useful when both sides are in view; tabs hide one side. Keep it horizontal and compact.

Reinforcement exercise — **`Buckets`** (two-column, `twoCol`), goal: the student sorts chapter features into "survives no-JS" vs "needs JS." This is the ideal check for a binary classification and consolidates the ledger actively. Buckets: `survives` ("Works without JS") / `needs-js` ("Needs JavaScript"). Items (chips, inline code where apt): `<form action={…}>` submit → survives; `required` / constraint validation → survives; `redirect()` → survives; `revalidatePath()` → survives; `useActionState` inline errors → needs-js; `useFormStatus` spinner → needs-js; `useOptimistic` instant update → needs-js; automatic form reset → needs-js. Place it directly after the ledger so it lands while fresh.

### The no-JS error path is the one real decision

The single section where senior judgment, not mechanism, is taught — give it weight. Everything prior was "here's what the platform does"; this is "here's the call *you* make."

The problem precisely: on the JS door, a validation failure returns `{ ok: false, error }` and `useActionState` renders it inline — fix the field, resubmit, never leave the page. On the no-JS door there's no hook to render that `Result`. The action still produces it, but the browser is mid-navigation. So: how does a no-JS user *see* a validation error?

Two honest answers — present as a decision, not a recipe:
- **Encode-and-redisplay (the thorough path):** on failure, the action `redirect()`s back to the form's route with the error encoded in a URL search param (or the framework's equivalent); the form's Server Component reads `searchParams` and server-renders the error state. The no-JS user sees a real inline error. Cost: meaningfully more code, a second rendering path for errors that the JS door never uses.
- **Accept the degraded path (the pragmatic default):** let the no-JS error experience be a plain re-render with the browser's native constraint bubbles catching the cheap cases, and accept that richer server-authored field errors only render on the JS door. The form still *works* — a no-JS user with a genuinely invalid submit that passed constraint validation gets a less polished failure, but cannot create a bad row (the server still rejected it).

The senior call to state plainly: for a typical 2026 SaaS at this stage, **accept the degraded no-JS error UX.** The no-JS cohort is small; the success path (the common case) already works and redirects cleanly; the cheap validation cases are caught by the constraint API in both modes; the expensive encode-and-redisplay machinery rarely earns its weight. Name the trigger that flips the call: a form that *must* be flawless without JS (regulatory, a public unauthenticated high-traffic form, an audience known to run no-JS) justifies the thorough path. Default off; reach when the form's stakes demand it.

The PE-friendly action shape, stated as the natural consequence (not new API): the action's `redirect()` on success is *already* the correct no-JS move — it's what makes the success path work in both doors. Recall chapter 043: success → `redirect()` to the new resource; failure → return `Result`. On the JS door the returned `Result` renders inline; on the no-JS door it's the success `redirect()` that carries the experience, and the failure `Result` is what the encode-and-redisplay path would have to surface manually. So a chapter-043-correct action is *already* PE-shaped for the success path — the only open question is how hard you work on the failure path.

The **`permalink`** argument of `useActionState` — name it once, correctly, then move on (it's a footnote, not a feature to adopt). **Verified semantics (React docs, June 2026) — state these precisely, both the chapter outline and lesson 3's continuity notes are imprecise:** `useActionState(action, initial, permalink?)`'s third argument is a URL string; when the action is a **Server Function** and the form is submitted **before the JS bundle loads**, the browser **navigates to** the permalink URL (it does **not** POST to it — correct the chapter-outline line 269 wording "a URL string the no-JS fallback POSTs to"). The destination page must render the **same form component** (same action, same permalink) so React can carry the state across. Once the page is interactive, the argument has no effect. In practice Next.js's default routing already handles the common form layouts, so the argument is usually omitted. The 2026 reflex: omit it unless a specific pre-hydration navigation requires a different destination than the current route; do not reach for it reflexively.

Component for the two paths: **`CodeVariants`** with two tabs — "Degraded (default)" showing the chapter-043 action unchanged (success `redirect`, failure `return err(...)`) with a comment marking where the no-JS failure UX degrades; "Encode-and-redisplay" showing the failure branch redirecting back with the error in a search param plus the Server Component reading `searchParams`. Each tab's prose makes the cost/benefit explicit. Reasoning: this is a before/after of the *same* action's failure branch — exactly `CodeVariants`' purpose. Keep both under the conventions' 18-line focus where possible; the second tab may need two short blocks (action + page read).

Avoid over-engineering the encode-and-redisplay sample — show the shape, not a production-grade param schema. Note for downstream agent: this is a *deliberately illustrative* divergence from the project's full error contract; the lesson's point is the decision, not a copy-paste pattern. The project chapter (047) ships only the degraded default.

`Term` candidate: **pre-hydration** (the window between server-rendered HTML arriving and React finishing hydration; submits in this window take the native door even with JS enabled — the reason PE matters even for JS users on slow connections, not just for JS-disabled users). This is an important nuance — emphasize it: PE isn't only about the tiny JS-disabled cohort, it's about *every* user during the first-paint-to-interactive gap.

### Five disciplines that keep it working

Reframe the standard "watch-outs" as a consolidation checklist — each rule is a lesson-1–6 reflex the student already holds, now revealed as also being the thing that protects PE. Goal: the student leaves with a short "don't break it" list, and each item reinforces a prior lesson rather than introducing load. Present as `Steps` or a tight ordered list; for each, one line stating the rule + one line naming the lesson it came from and the failure if broken.

1. **Use the `action` prop, not `onSubmit` + `fetch`** (lesson 2). The `fetch` reflex requires JS for the submit itself — break this and there is no native door at all. Lesson 2's "who owns the endpoint" rule already pointed here; PE is the deeper reason.
2. **Keep inputs uncontrolled** (lesson 1). Controlled inputs need JS to hold the value; uncontrolled inputs round-trip through the platform's native POST. The `defaultValue`-not-`value` reflex is a PE reflex.
3. **Don't put load-bearing UI behind a React-only hook** (lessons 4–5). `useOptimistic` / `useFormStatus` are enhancements; if the *result* of a mutation is only visible through `useOptimistic`, the no-JS user never sees it — pair the mutation with the action's `redirect()` + `revalidatePath()` so the server-rendered page carries the truth.
4. **Don't gate the submit button behind a JS-only condition** (callback to lessons 3–4). A `disabled={someClientState}` that's wrong/absent without JS can block or mis-enable the button. Default the button enabled; the server is the boundary of correctness (chapter 043). Tie to the double-submit nuance: pre-hydration the button may be enabled before `isPending` can fire — accept it and rely on the action's idempotency (chapter 043 lesson 5), don't try to JS-gate your way out.
5. **Keep the HTML semantic** (lessons 1, 6). `<button type="submit">`, `<label for>`, `<form action>` — native elements work in both doors. A `<div onClick>` submit button has no native door.

Close the section with the named posture (reuse as the chapter's PE anchor): **you don't add PE; you avoid removing it.** These five are the removal list.

Optional small reinforcement here — a `MultipleChoice` "which of these forms breaks PE?" showing 3–4 short form snippets (one with `onSubmit`+`fetch`, one with a controlled input, one clean, one with a `<div onClick>` submit), correct answers = the broken ones. Only include if it doesn't bloat the closer; the `Buckets` above already carries the active-check load. Lean toward *omitting* to keep the lesson short — note it as optional for the writer's judgment.

### Test it once: submit with JavaScript off

The verify reflex — short, concrete, actionable. Goal: the student knows the one cheap test and when to run it.

The 2026 senior posture: every important form gets **one manual test pass with JS disabled** at feature-launch time — DevTools → Command Palette → "Disable JavaScript" (or Settings → Debugger → Disable JavaScript), reload, submit, confirm the row is created and the user lands on a sensible page. That's it. Frame what "pass" means: the *function* works (row created, navigation happens, constraint validation catches the cheap errors) — not that the experience matches the JS path (it won't, by design).

State the cost/benefit explicitly so the student calibrates: automated PE testing in CI is heavyweight and rarely worth it for a SaaS at this stage; the value is in the one manual pass that catches the regressions the disciplines above are meant to prevent (someone refactors a form to `onSubmit`+`fetch`, someone makes an input controlled). The manual test is the backstop for the discipline list. Name it as the verify step the **project chapter (047)** inherits — it ends with exactly this check.

Use a `Steps` block for the concrete procedure (disable JS → reload the form → fill and submit → confirm creation + landing page). Optionally a `Screenshot` of the DevTools "Disable JavaScript" command-palette entry if a downstream agent has one — low priority, the `Steps` carries it.

Frame the "why test at all if it's automatic" tension and resolve it: PE is the default *of the pattern*, but a refactor can silently break it (the arrow-wrapped action from lesson 2, a controlled-input creep, an `onSubmit` added for "just one thing"). The test confirms the default is still intact. Tie back to the disciplines: the test verifies the five rules held.

### Why this was free (closing synthesis — can fold into the test section or stand alone)

One short closing beat, not a full section if it bloats the page — the writer may merge it into the prior section's end. Restate the lesson's thesis now that the student has the full picture: the chapter never spent a lesson "adding" PE because the platform-native form pattern produces it as a byproduct. The `action` prop, uncontrolled inputs, and the Server Action seam each had their own justification in lessons 1–6; PE is the dividend they pay together. The senior takeaway, one last time: **don't engineer PE — refuse to break it, and test once that you didn't.**

Mention the file-upload edge case here in one sentence (named once, full story deferred): a `<form>` with `<input type="file">` needs `enctype="multipart/form-data"` for the native door to send the file as a file rather than a filename string — the framework sets it when the `action` prop is wired, but the explicit `enctype` is the safe move for the no-JS path. Point forward to the file-upload chapter (068) for the full story; do not teach uploads here.

Optional external resources (LinkCards / `ExternalResource`): the React docs on `useActionState` (for the `permalink` argument), the Next.js docs section on Server Actions + progressive enhancement, and optionally an MDN page on the `<form>` element's native submission. Include 1–2, not a wall. A `VideoCallout` is **not** warranted — this is a synthesis/concept lesson with no procedural content a video clarifies; skip it.

## Scope

This lesson is the chapter closer and is deliberately **thin on new mechanics** — it synthesizes lessons 1–6. Aggressively point back; do not re-teach.

In scope:
- The definition of PE for this chapter (function vs experience).
- The two-doors model: JS-enhanced submit vs native-browser POST, converging on one Server Action.
- The ledger: what survives a no-JS submit (action-prop submit, constraint validation, `redirect`, `revalidatePath`, server re-render) vs what degrades (`useActionState` inline render, `useFormStatus`, `useOptimistic`, auto-reset, inline field errors).
- The one real decision: the no-JS error path (degraded default vs encode-and-redisplay), with the trigger that flips it.
- `permalink` named once (pre-hydration navigation fallback), reflex = omit by default.
- The five disciplines that preserve PE, each tied to a prior lesson.
- The manual JS-disabled test as the feature-launch verify reflex.
- File-upload `enctype` named once.

Out of scope (do not teach — redefine prerequisites in one line max if needed, then point back):
- The `action` prop wiring, submit lifecycle, opaque action ID, auto-reset mechanics — **lesson 2** (recap in one or two sentences only).
- `useActionState` mechanics, the `Result` shape, field-error rendering — **lesson 3** / chapter 043 (recap by name only).
- `useFormStatus` / `<SubmitButton>` — **lesson 4** (name only).
- `useOptimistic` mechanics, rollback, client UUID — **lesson 5** (name only).
- Constraint Validation API attribute surface, `:user-invalid`, `noValidate`, `setCustomValidity`, shadcn form primitives — **lesson 6** (name the API only; the PE-relevant fact is "it survives no-JS," nothing more).
- Uncontrolled inputs, `name` contract, `FormData` shapes — **lesson 1** (name only).
- The Server Action five-seam body, `redirect`, `revalidatePath` internals — **chapter 043** (name only).
- The Zod schema and validation messages — **chapter 042** (name only).
- The framework's exact internal PE wiring for action invocations — lives in the Next.js docs; describe behavior, not internals.
- Server-rendered error *pages* (the `error.tsx` boundary) — **chapter 080**; the encode-and-redisplay path here uses `searchParams` on the form's own route, not a global error page — keep the distinction.
- The Next.js `<Form>` component for search forms with prefetch — **chapter 060** (lesson 2 already named it; do not revisit).
- Accessibility beyond PE — **chapter 027 lesson 5** (the a11y baseline; PE and a11y overlap on semantic HTML but are distinct concerns — don't conflate).
- Idempotency keys for non-retryable mutations — **chapter 043 lesson 5** (name once in discipline 4, the real defense behind the pre-hydration double-submit).
- React Hook Form — **chapter 045** (not relevant here; RHF forms have their own PE story out of scope).
- Building the project's CRUD forms with this knowledge — **project chapter 047** (which inherits the manual-test verify step).

Fact-check status (resolved during outline authoring, June 2026 — writer does not need to re-verify, just don't regress):
- **React 19 `useActionState` `permalink`** — RESOLVED against react.dev: it is a **navigation** target for **Server Function** actions submitted **before the JS bundle loads** (browser *navigates to* it, does not POST to it); destination must render the same form component; no effect once interactive. Both the chapter outline (line 269, "POSTs to") and lesson 3's continuity notes ("fallback URL") are imprecise — follow the corrected wording in the lesson body.
- **Next.js Server Actions PE** — RESOLVED: a Server Action passed to a `<form>` submits as a standard HTTP POST with JS disabled / pre-hydration; a *client* action is queued until hydration instead. The native-door model holds because the chapter uses Server Actions. Success `redirect()` is the documented PE success carrier.
- **Chrome DevTools "Disable JavaScript"** — RESOLVED against developer.chrome.com: Cmd+Shift+P (Mac) / Ctrl+Shift+P (Win/Linux) → type "javascript" → "Disable JavaScript" → reload. JS stays disabled while DevTools is open. `Steps` block should use this path.

## Code conventions notes

- Server Action shape follows the five seams (`parse → authorize → mutate → revalidate → return`) and the `Result<T>` contract from `Code conventions.md` (Forms and Server Actions; Error handling). The action samples here are *recaps* of the chapter-043 shape — do not re-derive, reuse the established `createInvoice` / `Result` shapes.
- Forms wire through `<form action={serverAction}>` with uncontrolled inputs (`defaultValue`, never `value`) — the convention's PE-relevant rule; this lesson is the *justification* for that line in the conventions.
- `redirect()` on success, `revalidatePath()` after the write and before the return — both are the PE success-path carriers; reuse from chapter 043.
- The encode-and-redisplay sample is a **deliberate simplification** for illustration (raw `searchParams` error encoding, not a hardened param schema) — flag this so downstream agents don't treat it as the project's error contract. The project (047) ships the degraded default only.
- Continue the worked entity: invoices / `createInvoice`, form at `app/invoices/new-invoice-form.tsx`, action from `./actions` (per lessons 2–6 continuity notes).
