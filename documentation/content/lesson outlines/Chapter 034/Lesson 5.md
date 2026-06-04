# Lesson outline — Chapter 034, Lesson 5

## Lesson title

- **Title (h1):** Third-party scripts with next/script
- **Sidebar label:** Third-party scripts

---

## Lesson framing

**What this lesson is.** The fourth platform primitive of the chapter, after `next/image` (l2) and `next/font` (l4). Same spine the chapter repeats: a plain HTML element (`<script>`) silently regresses a perf metric, and Next ships a component whose *defaults* structurally enforce the careful-engineer choice. Here the failure is render-blocking / hydration-delaying JS, and the component is `next/script`, whose whole job is **choosing the lifecycle moment a script loads** so it stops competing with first-party code.

**The single most important idea.** The student must leave able to answer one question for any vendor snippet a stakeholder hands them: *"when does this need to run, and what breaks if it runs late?"* — and map the answer to one of four strategies. Strategy selection is the lesson. Syntax is trivial; the senior judgment is in defaulting to `afterInteractive`, reaching for `lazyOnload` aggressively, and treating `beforeInteractive` as a rare, justify-it-out-loud choice. The outline's "what would break if this script disappeared tomorrow?" framing is the durable takeaway — bake it into the strategy section, not a closing aside.

**The second idea (the senior off-ramp).** `<Script>` is the *fallback*, not the destination. Modern vendors (PostHog, Sentry, LaunchDarkly) ship typed npm SDKs; Google's GA4/GTM ship through the official `@next/third-parties/google` package. The senior reaches for the SDK or the dedicated package *first*, and only drops to `<Script>` for a vendor that offers nothing better. Frame `<Script>` as "the primitive everything else is built on, and the tool you use directly only when there's no purpose-built option." This reframes the whole lesson: we teach the primitive thoroughly *because* it's the floor, while pointing at the ceiling.

**Where students struggle (target these).**
1. **Reflexive `beforeInteractive`.** Beginners read "before interactive" as "safest / earliest / best" and reach for it by default — the exact move that tanks LCP. The lesson must make `beforeInteractive` feel *expensive and narrow* (root-layout-only, head-injected, for bot-detection / consent-manager class scripts), and `afterInteractive` feel *boring and correct*.
2. **The `'use client'` cliff.** A bare `<Script src>` works fine in a Server Component. The moment you add `onLoad`/`onReady`/`onError`, the file must be a Client Component — the callbacks "do not work in Server Components" (verified, docs 16.2). Students hit a cryptic error and don't connect it to the callback. Teach this as a clean rule: *callbacks ⇒ `'use client'`; no callbacks ⇒ leave it on the server.*
3. **Inline-script `id`.** External scripts dedup automatically (load-once-per-layout). Inline scripts **silently fail to optimize** without an `id`. This asymmetry trips people; teach it explicitly.
4. **Loading on every route / before consent.** A pixel dropped in the root layout runs everywhere, including before a GDPR banner is answered. The placement decision (which layout) is a real engineering decision with legal stakes, not a styling choice.

**Mental model to leave them with (one-liner for the intro/recap):** *"`next/script` doesn't make scripts faster — it makes them load at the right moment. Pick the latest moment that still works, and prefer a real SDK to a snippet whenever the vendor ships one."*

**Tone / level.** Adult, terse, decision-first per pedagogical guidelines. This is a 30–40 min lesson — the smallest of the chapter's primitives. No exhaustive prop table; the surface is tiny (`src`, `strategy`, `id`, three callbacks, inline children). Spend the budget on the *strategy decision* and the *SDK-vs-snippet* judgment, not API enumeration.

**Cache Components note.** Keep the chapter-wide reflex light here: a `<Script>` is a client-side concern injected into the rendered output; it doesn't itself force a route dynamic. Don't over-explain — one sentence at most where placement is discussed. Not a focus of this lesson.

---

## Lesson sections

### Intro (no header)

Per guidelines: warm, brief, decision-first. Open on the outline's concrete scene — marketing wants a product-analytics snippet, checkout needs Stripe.js, support wants a chat widget. Three scripts, three *different* urgencies, and dropping three plain `<script>` tags in the layout makes all three fight first-party JS for the main thread, regresses LCP, and runs them on every route. Name the lesson's job: `next/script` is the one primitive every third-party script flows through, and its only real decision is *when* each script loads. Preview the four strategies and the SDK off-ramp. Connect back to l2/l4: same pattern — plain element regresses a Core Web Vital, platform component encodes the discipline as a default. Reuse the chapter's `Term` for **LCP** / **Core Web Vitals** if re-stated (defined in l2 — refresh in one clause, don't re-teach; depth is ch.094).

Keep it to ~2 short paragraphs.

### What next/script actually does

**Goal:** establish the primitive before the strategies — *what* the component controls, so the strategy section is about choosing a value, not learning a concept.

Content:
- The naive baseline: a raw `<script src>` in JSX (or worse, hand-injected) is render-blocking by default and has no concept of "after hydration." Show it as the anti-pattern before-state (consistent with l2's raw-`<img>` framing — the naive version is a deliberate anti-pattern).
- What `<Script>` does on top of a plain tag: **inserts the script at a chosen lifecycle moment**, **dedups it** (loads once even across navigations within a layout), **exposes load/error/ready callbacks**, and **doesn't block render** unless you explicitly ask it to. The verb that matters is *schedules* — it's a scheduler for `<script>` tags.
- The minimal call: `import Script from 'next/script'` then `<Script src="https://..." />`. Default strategy is `afterInteractive`, so the boring-correct case is also the shortest to write. This is the "pit of success" point — make it explicit.
- One sentence on where it can live: any page or layout (with one exception coming for `beforeInteractive`). Defer the placement *decision* to its own section.

**Component:** a `CodeVariants` (2 tabs) for naive `<script>` vs `<Script>` — "Raw tag" (del-marked, render-blocking, no dedup) and "`next/script`" (ins-marked default). One-paragraph prose each per the component's six-line rule. This is the cleanest way to show the before/after without prose listing.

**Terms:** `Term` on **hydration** (defined ch.030 l2 — one-clause refresh: "the browser attaching interactivity to server-rendered HTML"; the whole strategy story is *relative to* this moment, so a quick anchor pays off). `Term` on **main thread** if used (the single browser thread that runs JS and paints — why a heavy script blocks everything).

### The four loading strategies

**Goal:** the heart of the lesson. The student should finish able to pick a strategy on sight and justify it. Teach as *defaults before conditionals* (guidelines): `afterInteractive` is the default everyone starts from; the others are deviations earned by a specific condition.

Structure the section as four named subsections-in-prose (h3 is overkill for four short entries — use bolded strategy names as the spine, or light h3s if the writer prefers; keep each to a tight paragraph + when-to-use). Teach in *judgment order*, not doc order:

1. **`afterInteractive` — the default you rarely override.** Loads right after hydration begins. The right home for analytics snippets, tag managers, error-monitoring loaders — anything that should run ASAP but never ahead of the app's own JS. Frame it as: if you don't have a reason to pick another, this is the answer.
2. **`lazyOnload` — reach for this aggressively.** Loads during browser idle, after every other resource. Chat widgets, social embeds, retargeting pixels — anything not needed for the first interaction. The senior heuristic lives here: *"what breaks if this loads five seconds late, or not at all? If 'nothing the user notices,' it's `lazyOnload`."* Push the student to default *non-critical* scripts here rather than leaving them at `afterInteractive`.
3. **`beforeInteractive` — narrow, expensive, root-layout-only.** Loads before any Next.js code, always injected into `<head>` regardless of placement, and **must live in the root layout** (verified: docs require `app/layout.tsx`). Reserved for scripts that must run before the page paints/hydrates: **bot/fraud detectors** and **cookie-consent managers** (the docs' own canonical examples — use these, they're more honest than "polyfills"). The teaching beat: this is the strategy beginners over-reach for; make them feel its cost (it competes with first-party fetch, it's site-wide). Rule: *if you can't name why it must beat hydration, it's not `beforeInteractive`.*
4. **`worker` — named once, you can't use it here.** Offloads to a Web Worker via Partytown so the main thread stays free. **Experimental, requires the `nextScriptWorkers` flag, and does not work with the App Router — pages-directory only today** (verified, docs 16.2). Since this course is App-Router-only, the honest framing is: *know the word, know it's the future direction for heavy third-party JS, know you can't reach for it yet.* One short paragraph; do not teach setup.

**Component — the strategy decision.** A `StateMachineWalker` (`kind="decision"`, default) is the right vehicle: it forces the student through the *order a senior asks the questions* (the component's stated strength), and the lesson lives in the order, not any single leaf. Tree shape:
- Root Q: *"Must this run before the page hydrates?"* (e.g. consent gate, bot detection) → yes → Leaf `beforeInteractive` (verdict + "root layout only, it lands in `<head>`"). → no → next Q.
- Q2: *"Is it needed for the first interaction / above-the-fold experience?"* → yes → Leaf `afterInteractive`. → no → Leaf `lazyOnload` ("idle-time; the default for chat, embeds, pixels").
- Optional terminal aside leaf for `worker` reachable from a "heavy compute, touches no DOM?" branch, OR just mention it in prose and keep the walker three-leaf clean. Prefer **three leaves** + prose mention of `worker` — keeps the walk crisp.
This is do-not-wrap-in-`Figure` (component provides its own card).

**Reinforcement exercise.** After the walker, a `Buckets` drill: students sort ~6 real vendor scripts into `afterInteractive` / `lazyOnload` / `beforeInteractive` buckets (`twoCol` off, 3 buckets). Items e.g.: "Product analytics loader (PostHog snippet)" → afterInteractive; "Intercom chat widget" → lazyOnload; "Cookie-consent manager" → beforeInteractive; "Twitter/X embed" → lazyOnload; "Error-monitoring loader" → afterInteractive; "Bot/fraud detector" → beforeInteractive. This checks the exact judgment the section teaches and is faster than a coding exercise for a categorization skill. (`worker` deliberately absent — nothing in our stack buckets there.)

**Terms:** `Term` on **Partytown** (the library `worker` uses to run scripts off the main thread) and **Web Worker** (background browser thread with no DOM access — why not every script tolerates `worker`).

### Callbacks and the use client cliff

**Goal:** teach `onLoad`/`onReady`/`onError` *and* the rule that they pull the file into a Client Component — the most common silent footgun.

Content:
- The three callbacks: `onLoad` (fires once when the script finishes loading — init code that needs the global the script defines), `onError` (network/load failure), `onReady` (fires on load **and** on every subsequent component re-mount — the hook for re-initializing on navigation).
- **The cliff (lead with the rule, verified):** all three callbacks *only work inside a Client Component* — they "do not work in Server Components." So: a bare `<Script src>` with no callbacks is fine on the server; add any callback and the file needs `'use client'` at the top. Make this the section's memorable rule. Tie back to the boundary discipline from ch.030 / Code Conventions: callbacks are event handlers, and event handlers live on the client.
- Two constraints worth one clause each: `onLoad` and `onError` **can't** pair with `beforeInteractive` — use `onReady` there instead (verified). Don't belabor; it's a footnote-grade fact.
- The canonical use of `onReady`: re-running vendor init after a client navigation (the Google-Maps-re-embed pattern from the docs). Keep the *analytics pageview* pattern light — the honest 2026 answer for GA pageviews is `@next/third-parties` (next section), not hand-rolling `usePathname` + `onReady`. Mention `usePathname` + a manual pageview call exists as the raw pattern but immediately point at the SDK/package as the reason you rarely write it. (Avoids re-teaching `usePathname`, which is ch.033 l5.)

**Component:** `AnnotatedCode` over a single small `'use client'` Client Component that renders a `<Script>` with `onLoad` (and shows the `id`). Steps: (1) the `'use client'` line — *because of the callback below*; (2) the `<Script>` with `src` + `strategy`; (3) the `onLoad` callback firing once after load; (4) (optional) `onReady` contrast. `AnnotatedCode` is right here — one block, attention directed to multiple parts in sequence, especially the causal link between the directive and the callback. `color="orange"` on the `'use client'`↔callback steps to visually bind them.

**Terms:** none new needed; `'use client'` / Client Component are prior knowledge (ch.030) — refresh in prose, not a `Term`.

### Placement, dedup, and inline scripts

**Goal:** the *where it lives* decision + the inline-script mechanics, including the consent/privacy threshold.

Content:
- **Placement is a scoping decision, not cosmetic.** A `<Script>` in a layout loads for that layout's whole subtree and persists across navigations within it; in the root layout it loads everywhere. So: marketing pixels → `(marketing)` layout, app analytics → app layout, Stripe.js → checkout route/layout only. The rule: *put the script in the narrowest layout that covers every route that needs it.* (Mirrors l4's "loading scope matches render scope" reflex — call that parallel out explicitly for continuity.) Echo the docs' own recommendation: scope scripts to specific pages/layouts, don't blanket the root.
- **Dedup, stated precisely (verified — corrects the chapter outline's loose "by `src`"):** Next loads a given script **once even across navigations within a layout**. For **external** scripts this is automatic — no `id` needed. For **inline** scripts you **must** supply an `id` or Next can't track/optimize it (it silently won't dedup). Teach the asymmetry as the reason inline scripts always carry an `id`.
- **Inline scripts.** Initializers written as `children` (`<Script id="...">{\`...\`}</Script>`) or via `dangerouslySetInnerHTML`. Always set an `id`, always pick a strategy. One line: prefer the vendor's hosted snippet/SDK over pasting inline JS when offered.
- **Privacy / consent threshold (name it, don't build it).** Many analytics/marketing scripts legally require user consent (GDPR / ePrivacy) before loading. The senior reflex: don't drop them in a layout where they fire before the banner is answered — gate behind consent state and/or load `lazyOnload` so they're conditional. Full consent-flow implementation is out of scope; the *threshold* and the *risk* are the lesson. (The `StateMachineWalker` consent-machine demo elsewhere is the eventual home — don't rebuild it here.)

**Component:** small `CodeVariants` (2 tabs) contrasting **external** (`<Script src>`, dedups automatically, no `id` needed) vs **inline** (`<Script id="...">{children}</Script>`, `id` mandatory). One-paragraph prose each stating the dedup rule. This makes the asymmetry concrete in code, which is more memorable than prose.

**Terms:** `Term` on **GDPR** / **ePrivacy** (EU privacy regimes requiring consent before non-essential tracking — why pixel placement has legal stakes) — one combined or two short. Don't over-define; this is a threshold mention.

### When not to reach for Script at all — the SDK off-ramp

**Goal:** the chapter's senior-mindset payload. The student should leave knowing `<Script>` is the floor, and that the *first* question for any vendor is "do they ship something better than a snippet?"

Content:
- The reframe: most modern vendors ship a **typed npm SDK** — PostHog, Sentry, LaunchDarkly, etc. The SDK is tree-shakable, typed, integrates with React (hooks, providers), and you `import` it like any dependency instead of injecting a tag. Prefer it. `<Script>` is the fallback for vendors that *only* give you a snippet.
- **The Google case (verified, current — add this; the chapter outline omitted it):** for Google Analytics 4 and Google Tag Manager specifically, the official **`@next/third-parties/google`** package ships `GoogleAnalytics` / `GoogleTagManager` components (also `GoogleMapsEmbed`, `YouTubeEmbed`) plus `sendGAEvent` / `sendGTMEvent` — hydration-aware loading wrapped for you (it loads the underlying scripts *after hydration* by default). This is the purpose-built tool for that vendor family; you would *not* hand-roll GA/GTM with raw `<Script>`. **Accuracy note (verified docs 16.2):** the package is still officially marked **experimental** ("under active development," installed with the `latest`/`canary` flag). So frame it as *"the official, recommended package — still experimental, but already the right reach for GA/GTM over a raw snippet,"* not as a settled stable API. Don't overstate. (Forward-ref: full analytics setup is ch.093 — here it's just "the right tool exists, prefer it over a hand-injected tag.")
- The decision, compressed: **SDK if the vendor ships one → dedicated package (`@next/third-parties`) for Google → raw `<Script>` only when nothing better exists.** This is the senior order.
- Close on the cost framing (the outline's durable line, surfaced here as the section's spine): every third-party script costs JS download + parse + main-thread execution. The reflex question — *"what breaks if this disappeared tomorrow?"* — drives both the strategy choice (push to `lazyOnload` / delete) and the SDK choice (a typed SDK you can configure beats a tag you can't).

**Component:** a compact `StateMachineWalker` *or* simple prose decision. Prefer **prose + a tight 3-line decision recap** here rather than a second walker — one walker per lesson keeps it from feeling like a quiz. If a visual is wanted, a small `ArrowDiagram` or even a plain ordered list "SDK → @next/third-parties → `<Script>`" suffices. Keep this section short and punchy; it's the takeaway, not new mechanics.

**No new `Term`s.**

### Worked example: three scripts, three decisions

**Goal:** synthesis. The outline's worked example — show the *reasoning*, not just syntax, for three scripts with three different correct answers.

Content (place inline, per guidelines — this is the body's payoff, not an appendix):
- **Stripe.js** → `<Script src="https://js.stripe.com/v3" strategy="afterInteractive" />` placed in the **checkout layout only** (not root — it's useless on marketing pages). Reasoning: needed for the interaction, not before hydration, scoped tight.
- **PostHog** → **SDK, not `<Script>`.** Show the one-line "use the SDK" answer (import + init in a client provider, gestured at — full setup is ch.093). This is the section's teaching spike: the *right answer is to not use the component at all.*
- **Intercom (chat widget)** → `<Script ... strategy="lazyOnload" />` with an **`id`** if inline, in the layout where support is offered. Reasoning: zero first-interaction value → idle-time.

**Component:** `CodeVariants` with three tabs (`label` = "Stripe.js", "PostHog", "Intercom"), each a short block + one-paragraph *placement-and-strategy reasoning* (not just code). The PostHog tab's prose leads with "the right move is the SDK" so the contrast lands. This directly realizes the outline's "placement reasoning, not just syntax."

**Optional check:** a single `MultipleChoice` — "Marketing pastes a retargeting pixel into the root layout with `beforeInteractive`. What's wrong?" with distractors (LCP regression + runs on every route incl. before consent = correct; "needs an `id`" = plausible-but-not-the-point decoy). Quick recall check on the two headline mistakes. Optional — include only if the lesson feels light on self-check after the `Buckets` drill.

### External resources (optional)

One or two `ExternalResource` cards: the official `next/script` API/guide page, and the `@next/third-parties` guide. Per guidelines these are optional tail links, not required.

---

## Scope

**Prerequisites to lean on (assume taught — refresh in one clause max, never re-teach):**
- **Hydration / the two-render model** (server HTML + browser hydration) and `'use client'` boundaries — ch.030 l1–l2. The strategy story is entirely relative to hydration; anchor on it, don't derive it.
- **Core Web Vitals / LCP / CLS** — `Term`-defined in ch.034 l2; depth deferred to ch.094. Refresh LCP in a clause; do not re-explain.
- **`next/image` (l2) and `next/font` (l4)** — same chapter, same "plain element regresses a metric → platform component" pattern. Explicitly call the parallel for continuity; the student has seen this shape twice already.
- **`usePathname`** — ch.033 l5. Referenced for the raw pageview pattern only; do not re-teach the hook.
- **Layouts / route groups** (`(marketing)`, app layout) — ch.029. Use freely for placement; don't explain route groups.
- **Server vs Client Components** — ch.030. The callback cliff builds on it.

**Explicitly out of scope (do NOT teach — name-and-defer only where the outline says):**
- **Analytics setup / PostHog or GA configuration** → ch.093. Here: "use the SDK / the package," not how to wire events, dashboards, or pageviews end-to-end.
- **Error-monitoring SDK setup (Sentry)** → ch.092. Named as an SDK example only.
- **Stripe integration** (checkout, webhooks, server SDK) → ch.064. Here: only Stripe.js's *client snippet placement* as a strategy example.
- **Full consent / cookie-banner implementation** (the consent state machine, the `useConsent` flow) → out of scope; the threshold is named, the build is not. The `StateMachineWalker` consent demo is *not* this lesson's job.
- **`worker` / Partytown setup** — named once, explicitly flagged as App-Router-incompatible today; no configuration, no `nextScriptWorkers` walkthrough.
- **Security headers / CSP `nonce` for scripts** → ch.081. The `nonce` prop may appear in passing in a code sample but its *contents/CSP story* is not taught here.
- **`next.config.ts`** — `next/script` needs zero config (a useful contrast to l1–l3 and l2's image config; state it in one line, mirroring l4's "no config needed" beat). Don't open the config file.

**Deliberate divergences from the chapter outline (flag for downstream agents):**
- **Dedup precision:** the outline says "external scripts dedupe by `src`." Verified behavior is *load-once-per-layout, automatic for external scripts; `id` is the requirement for **inline** scripts specifically.* Teach the verified version.
- **`worker`:** outline says "named once" but doesn't state it's unusable in the App Router. It is (pages-dir only, experimental, flag-gated — verified docs 16.2). Teach the honest "you can't reach for it yet."
- **`beforeInteractive` examples:** outline says "rare polyfills." The docs' own canonical examples are **bot detectors and cookie-consent managers** — more honest and current. Lead with those; "polyfills for older runtimes" can be a secondary mention.
- **Addition — `@next/third-parties/google`:** not in the outline; it's the genuine 2026 answer for GA4/GTM and belongs in the SDK off-ramp section. Add it.
- **Addition — the `'use client'` callback cliff** as a first-class teaching beat (outline buries it in a watch-out). Verified, high-frequency footgun; promote it to its own section.

---

## Code conventions applied

- `import Script from 'next/script'` (default import; `next/*` is group-1 external per Imports convention).
- `'use client';` as the **first line** only in the callback example and the inline-with-callback cases — and *because* a callback is present; the bare-`<Script src>` examples stay server (no directive). Demonstrates the smallest-leaf boundary discipline (Code Conventions §Module boundaries).
- Single quotes, 2-space indent, `@/` alias if any local import appears (none likely needed).
- Strategy strings written as string literals (`strategy="afterInteractive"`).
- Inline scripts always carry an `id` in every sample (enforced by the dedup rule, not just style).
- Keep examples minimal/staged — these are teaching snippets, not full vendor integrations; note any elision (`// init your SDK here`) so downstream agents know it's deliberate.
