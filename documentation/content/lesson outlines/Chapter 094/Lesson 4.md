# Reading the bundle treemap

**Title (h1):** Reading the bundle treemap
**Sidebar label:** Reading the bundle treemap

---

## Lesson framing

Tooling-and-decision archetype. The load-bearing content is the **four scan passes** for reading a bundle treemap (biggest tile, per-route weight, duplicate dependency, shared/global chunk) plus the **triage decision tree** that maps each finding to a fix. This lesson is where L2 (image weight) and L3 (the barrel trap) cash out: it's the instrument that *measures* the wins those lessons only named.

**The one load-bearing idea.** A bundle is a sized tree, not a number. The treemap turns "the bundle is too big" — an unactionable feeling — into "*this* module, on *this* route, is *this* many bytes, pulled in *because of this import chain*." The skill is reading area as bytes and tracing a surprising tile back to the line that added it.

**Mental model the student should leave with.** "When INP creeps or the bundle feels heavy, I open the treemap. Big tile I expected (framework runtime) is the floor, not a target. Big tile I *didn't* expect is the lead. I filter to the client environment because that's the JS the browser downloads, find the surprise, click it to see why it's bundled, and route the finding through a fixed decision tree — surprise dep → remove/replace, heavy route chunk → move work to the server or code-split, duplicate dep → dedupe, barrel bloat → `optimizePackageImports`. The treemap is static bytes only; runtime cost and third-party scripts live elsewhere."

**CRITICAL reframing — fact-checked, supersedes the chapter outline.** The chapter outline was written against an older tool landscape. Two corrections are load-bearing; downstream agents must follow these, not the outline:

1. **The course default tool is the built-in Turbopack bundle analyzer**, not `@next/bundle-analyzer`. Turbopack is the Next.js 16 default builder, and `@next/bundle-analyzer` is the *Webpack* plugin — it's incompatible with Turbopack (logs Webpack warnings, doesn't reflect the real build). Next.js 16.1 (Dec 2025) shipped a built-in analyzer integrated with Turbopack's module graph: run `pnpm next experimental-analyze` for an interactive treemap, or `pnpm next experimental-analyze --output` to write a static copy to `.next/diagnostics/analyze` for sharing/diffing. It is still under the `experimental-` command name as of 16.2 (Feb 2026). Teach this as the default. Name `@next/bundle-analyzer` **once**, as the legacy Webpack fallback for projects not yet on Turbopack — do not build the lesson around it.
2. **The `next build` "First Load JS" per-route table was REMOVED in Next.js 16.** Vercel dropped it because the size/First-Load-JS numbers were inaccurate for RSC architectures (Turbopack and Webpack disagreed on how to count Client Component payload). The chapter outline's "build report is the smell test, analyzer is the diagnosis" framing is **dead** — do not teach a per-route build table as a current signal. Reframe: the *smell* now comes from field data (Speed Insights INP, ch093 L1) and the Lighthouse total-JS number (L5); the treemap is the *diagnosis*. The student may mention the old table only as "removed in 16, don't look for it."

**Where beginners go wrong (anchor the prose in these).**
- Read a treemap once, declare victory, never run it again — bundles drift release over release; this is the regression class the whole chapter fights.
- Stare at the framework-runtime tile and try to "optimize" it — that's the floor, not the lead.
- Run the analyzer against the dev bundle and read meaningless numbers — it analyzes a production build.
- Read the *raw/parsed* size when the *transfer (gzipped)* size is what the user downloads.
- See a big tile and guess at the cause instead of clicking it to trace the import chain back to the line.
- Assume a small bundle means a fast page — runtime work (heavy `JSON.parse`, a sync loop in a click handler) and third-party scripts (`next/script`) are invisible to the analyzer; INP can be bad with a tiny bundle.
- Look for the deleted "First Load JS" build table and think their setup is broken.

**Production stakes framing.** Frame the lesson as the senior question from the outline: INP is rising and the build feels heavier, but nobody can name the dependency that did it. The treemap is how a regression stops being a vibe and becomes an attributable line in a PR. Tie the recurring-vigilance thread: this is a *per-dep-change* habit and a CI artifact, not a one-off.

**Code's role.** Minimal and operational — this is a *tooling* lesson, not an algorithm one. The "code" is mostly commands (`pnpm next experimental-analyze`), a one-line `optimizePackageImports` callback to L3's fix, and the `dynamic()` triage shape (named, not taught — Unit 3 owns it). No full compilable files. The hero artifact is the **treemap reading**, carried by diagrams, not source.

**Diagrams are the spine.** This lesson is fundamentally visual — "reading a treemap" can't be taught in prose alone. The center of gravity is an annotated treemap diagram walked pass-by-pass via `DiagramSequence`, plus a `StateMachineWalker` for the triage tree. See the per-section detail. We render a *representative* treemap as HTML+CSS (nested sized rectangles), not a real screenshot — a fabricated screenshot of a specific app would be dishonest and brittle, and an illustrative diagram teaches the *reading skill* better than one real capture. One real screenshot of the analyzer UI chrome is acceptable *only* if the resourcer can capture the public demo (`turbopack-bundle-analyzer-demo.vercel.sh`); otherwise skip it.

**Verification honesty.** L3 forward-pointed here to *prove* the barrel fix (lucide ~600KB → ~30KB). Honor that callback but stay honest: present it as "this is the tile you'd watch shrink after applying `optimizePackageImports`," using the same illustrative shape L3 used, not a fabricated exact byte readout from a specific build. We did not run a real analyzer for this lesson; do not invent precise measured numbers or a specific app's treemap screenshot.

**Tone.** Adult, terse, senior-mindset. Lead each section with the decision the treemap informs, not the tool's button layout. The tool is simple; the value is the *reading discipline* and the triage reflex.

---

## Lesson sections

### Introduction (no header)

Open on the senior question verbatim from the framing: INP is creeping up, the production build feels heavier release over release, but the PR diffs look clean and nobody can point at the dependency responsible. State the lesson goal: install the instrument that makes bundle bloat *attributable* — a treemap of the production bundle — and the four-pass reading plus triage tree that turns a tile into a fix. Connect back: L1 tied INP to client JS weight; L2 and L3 named two big leaks (images, barrels) — this lesson is how you *see* and *measure* them. Preview the practical skill: run the analyzer, find the surprise tile, trace it to the import, and route it through a fixed decision. One sentence cashing L3's debt: "the barrel fix you applied last lesson — this is where you confirm the chunk actually shrank."

Keep to ~4–6 sentences, warm and brief. The senior question carries motivation; don't over-explain.

### What a treemap shows you

Establish the artifact and the core reading skill *before* any tooling. A bundle treemap is a nested set of rectangles where **area = bytes**: the whole production bundle is the canvas, sliced into routes, sliced into chunks, sliced into modules. A module that takes up a quarter of the picture is a quarter of your bytes. That single equation — area is weight — is the whole reading primitive.

Make three reading rules explicit, because each is a beginner trap:
1. **Read the transfer size, not the raw size.** What hurts the user is the gzipped/compressed bytes over the wire, not the unminified source. When the tool offers multiple size views, read the one closest to "what the browser downloads." (Don't over-specify column names for the Turbopack tool — state the principle: prefer the compressed/transfer figure.)
2. **Filter to the client environment.** The analyzer shows both *client* modules (JS the browser downloads — what drives INP) and *server* modules (the Node bundle — relevant to cold starts, not INP). For a performance-vigilance pass, the client side is the one that matters; name the server side as a secondary use (function/lambda cold-start size).
3. **The framework runtime is the floor.** The biggest legitimate tile is React + Next's runtime. It's the baseline every app pays; it is not the optimization target. Beginners waste time here — say so plainly.

**Diagram — the annotated treemap (the lesson's hero).** A `DiagramSequence` walking one representative treemap pass by pass. Build the treemap once as HTML+CSS nested sized rectangles (follow html-css.md gotchas: `margin: 0` everywhere, `box-sizing: border-box`, saturated mid-tone fills with white labels so it reads in both themes; cap height per the vertical-space rule ~≤800px). Tiles to depict: a large "framework runtime" block (the floor), a medium per-route chunk, a *surprise* oversized tile (e.g. a charting or date library pulled via a barrel), two equal tiles of the same library name (the duplicate), and a "shared" chunk. Each `DiagramStep` highlights one tile and explains how to read it — this same figure is reused as the visual for the four scan passes below, so the reader meets the picture here and learns the passes against it next. Caption: "Illustrative treemap — area is bytes. Your real one comes from `next experimental-analyze`."

Tooltips: `Term` on **treemap** ("A space-filling chart where nested rectangles' *area* encodes a quantity — here, bytes. Bigger rectangle, more bytes."), **gzip / transfer size** ("The compressed byte count actually sent over the network — what the user's connection pays, smaller than the raw source.").

### Running the analyzer

Now the tool, framed as the default and *one command*. Lead with the decision, not the install: Turbopack is the Next.js 16 builder, so the analyzer that understands the real build is the **built-in Turbopack analyzer** — no plugin to install, no `next.config.ts` change.

The mechanics (plain `Code` blocks, `bash`):
- `pnpm next experimental-analyze` — builds the production bundle and opens an interactive treemap in the browser. (Confirmed: it analyzes a *production* build; the dev bundle is irrelevant and intentionally unoptimized — L3 already established the `optimizePackageImports` rewrite runs in production only, so reinforce: never read a dev bundle.)
- `pnpm next experimental-analyze --output` — skips the interactive view and writes a static copy to `.next/diagnostics/analyze`, which you can copy aside (`cp -r .next/diagnostics/analyze ./analyze-before`) to diff before/after a fix. This is the command behind the CI-artifact pattern and the before/after verification.

Name the interactive UI's controls because the scan passes use them: filter by **route**, by **environment** (client / server), by **type** (JS / CSS / JSON), and **search by file**; **click a module** to see its size and its **import chain** — the exact path of imports that pulled it in. The import-chain trace is the feature that answers "*why* is this here," and it's what upgrades guessing into diagnosis.

**The legacy fallback — named once.** A single short paragraph (or a small `Aside note`): older projects still on Webpack use the `@next/bundle-analyzer` plugin (`pnpm add @next/bundle-analyzer`, wrap `next.config` gated by `ANALYZE=true`, run `ANALYZE=true pnpm build`, opens HTML treemaps). It's the *Webpack* tool and does not work correctly with Turbopack — so on the course stack it's the fallback, not the default. Do not expand this into a parallel tutorial; one paragraph, then move on.

**The deleted build table — defuse the beginner trap.** One or two sentences: Next.js 16 removed the per-route "First Load JS" table from `next build` output because those numbers were inaccurate for Server Component apps. If a tutorial tells you to read it, it's pre-16. Your smell test is now field data (Speed Insights INP) and Lighthouse's total-JS figure (L5); the treemap is the diagnosis when the smell test trips.

Code-conventions note for downstream agents: commands use `pnpm` (course package manager). No `next.config.ts` edit is needed for the built-in analyzer — do **not** show a config wrapper for it (that's the legacy plugin's shape and would be wrong for the default tool).

### The four scan passes

The load-bearing procedure. Frame as a fixed *reading order* a senior runs every time — you don't wander the treemap, you run four passes. Reuse the hero treemap figure from "What a treemap shows you" as the shared visual; each pass maps to a tile the student already saw highlighted. Present the four passes as a `Steps` list (numbered procedure the reader follows in order) or four tight `Card`s — each pass is: *what to look at → what it means → where it points.*

1. **Biggest tile — expected or surprise?** The single largest module. Expected = framework runtime (the floor; leave it). Surprise = a library you didn't think you shipped, or a known-heavy one bigger than it should be (a date library, a chart library, an icon set pulled whole via a barrel). The surprise is the lead. Click it, read the import chain, identify the line.
2. **Per-route weight — which routes carry heavy client chunks?** Filter by route. A route with a fat client chunk usually has a heavy *interactive* component on its leaves — a chart, a rich editor, a map. The fix shape: move the work server-side if it doesn't need interactivity, or code-split it (`dynamic()`) if it's below the fold or behind interaction. (Name `dynamic()` as the reach; Unit 3 owns the mechanics — do not teach it here.)
3. **Duplicate dependency — the same library twice.** The same package name appearing as two separate tiles (often two versions) means two copies in the dependency tree, usually a peer-dependency mismatch. It's pure waste — the browser downloads the same library twice. The fix is at the package manager, not the code (`pnpm dedupe`).
4. **Shared / global chunk — did the floor rise?** The chunk loaded on *every* route (shared runtime + anything imported by a global provider or root layout). It should be near-constant release to release. If it grew, a heavy library landed on every page — often something added to a top-level provider or `layout.tsx`. This is the most expensive kind of bloat because every route pays it.

After the four passes, a one-line synthesis: passes 1–2 find route-local bloat, passes 3–4 find global/structural bloat; global bloat is worse because it's paid everywhere.

**Exercise — `Buckets` (classification).** "Each finding came from one of the four passes — sort it." Buckets: **Biggest tile** / **Per-route chunk** / **Duplicate dep** / **Shared chunk**. Chips (findings phrased as observations): "a charting library is the largest module on the canvas" (biggest tile), "only `/dashboard` ships a 200KB editor chunk" (per-route), "`date-fns` appears as two tiles under different versions" (duplicate), "the chunk on every route grew 80KB after adding an analytics provider to the root layout" (shared). Goal: drill the pass→meaning mapping so the reader runs the passes as reflex. Grading: bucket match. Place immediately after the passes.

### From tile to fix: the triage tree

Turn the four findings into actions via a `StateMachineWalker` (`kind="decision"`) — the lesson lives in the *order* a senior triages, not any single leaf. Do **not** wrap in `<Figure>` (the walker is its own card).

Tree shape:
- Root: "You found an oversized tile. Is it the framework runtime?"
  - Yes → Leaf: "It's the floor. Leave it — that's the baseline every app pays."
  - No → "Did you expect this dependency at all?"
    - No (surprise) → Leaf: "Trace its import chain, then remove it or swap for a lighter alternative. An unexpected heavy dep is the highest-value fix."
    - Yes → "Is it the *same* library appearing twice?"
      - Yes → Leaf: "Duplicate — fix in the package manager: `pnpm dedupe`, then audit the peer-dependency that forced two versions."
      - No → "Is it a multi-export package dragged whole by a barrel import?"
        - Yes → Leaf: "Barrel bloat — `experimental.optimizePackageImports` (L3). Re-run the analyzer to confirm the tile shrank."
        - No → "Is the weight concentrated on one route via an interactive component?"
          - Yes → Leaf: "Heavy route chunk — move the work to a Server Component if it doesn't need interactivity, or code-split it with `dynamic()` (Unit 3)."
          - No → Leaf: "It lives in the shared/global chunk — find what pulled it into the root layout or a global provider and scope it to where it's actually used."

Pedagogical goal: a replayable decision the student runs at any surprising tile. Each leaf names the *exact* reach and, where relevant, points back (L3 `optimizePackageImports`) or sideways (Unit 3 `dynamic()`) without re-teaching.

This section also cashes L3's debt explicitly: a short paragraph + a small HTML+CSS before/after bar (reuse L3's illustrative shape, two bars ~600KB → ~30KB) captioned "the lucide tile you'd watch shrink after `optimizePackageImports` — run `experimental-analyze` before and after to confirm." Be honest in the caption that the numbers are illustrative shape, not a measured readout from a specific build.

### What the treemap can't see

The honesty section that prevents over-trusting the instrument — and it's load-bearing for the chapter's "INP" thread. Two blind spots:

1. **Runtime cost.** The treemap is *static bytes*. A small bundle can still produce bad INP if the JS that *did* ship does heavy work — a synchronous `JSON.parse` of a large payload, an O(n²) loop in a click handler, an over-rendering client tree. The instrument for that is the Chrome DevTools Performance panel (back-referenced to Unit 2), not the analyzer. State the rule: bundle size and INP are correlated, not identical.
2. **Third-party scripts.** A `<script>` loaded via `next/script` (analytics, chat widgets, tag managers) is *not* bundled, so it never appears on the treemap — yet heavy third-parties often outweigh the team's own code on the wire. The Network panel shows them. Mention the mitigations as a pointer only (defer with a `lazyOnload`-style strategy, gate behind consent) — depth is elsewhere; here the point is *the analyzer won't warn you about them.*

Pedagogical goal: the student leaves knowing the treemap is one of several instruments, with a clear sense of which question each answers. This directly serves the chapter map (treemap = static bytes; Performance panel = runtime/INP; Speed Insights = field verdict).

### Vigilance, not a one-off

Close on the chapter's recurring-discipline thread: a bundle audit is a *habit*, not a launch task. Two cadences:
- **Per-dep-change PR.** Any PR that adds or bumps a dependency, or adds a heavy interactive component, gets an analyzer pass. The cheap structural version: run `next experimental-analyze --output`, commit the artifact to the PR (or upload it as a CI artifact), and a reviewer eyeballs the diff against `main`. No bot required — a PR-template checklist line covers the regression class. Name the CI wiring as a *forward pointer* to L1 of ch097 (GitHub Actions primitives) and as a sibling to L5's Lighthouse CI gate; do not build the workflow here. Name the `hashicorp/nextjs-bundle-analysis` action once as "the formal version exists" — but flag it's Webpack-/build-table-era, so on a Turbopack project the `--output` artifact + reviewer-diff is the honest recommendation.
- **Pre-launch deep pass.** Once before shipping, walk the treemap on the top routes (marketing, dashboard, primary task screen), run the four passes, triage, fix, re-run. This is the L5 pre-launch-audit sibling on the bundle axis.

End with the one-sentence chapter tie: field data (Speed Insights, L1/ch093) tells you *that* it regressed; the treemap tells you *what* did. Keep it tight.

### External resources (optional)

`ExternalResource` cards: the Next.js "Package Bundling" guide (the canonical doc for both the Turbopack analyzer and `optimizePackageImports`), and the public Turbopack bundle-analyzer demo (`turbopack-bundle-analyzer-demo.vercel.sh`) so the student can click a real treemap without building anything. Optionally a recent, accurate video via `VideoCallout` if the resourcer finds one specifically on the Next.js 16 built-in analyzer — but do not block on it and do not link a pre-16 `@next/bundle-analyzer` tutorial (it teaches the wrong default tool and the dead build table). No video is required; the hero diagram + demo link serve the concept.

---

## Scope

**Prerequisites — redefine in one line each, do not re-teach:**
- INP and that client JS weight drives it — defined ch094 L1; reference, don't re-explain.
- The barrel trap, `optimizePackageImports`, `sideEffects: false` — taught ch094 L3; this lesson *measures* that fix and routes barrel bloat to it, but does not re-derive why barrels defeat tree-shaking.
- Image bundle weight and `next/image` `preload` — taught ch094 L2; not revisited.
- `'use client'` boundaries and Server Components doing the work — Unit 4; assumed (named as the "move work server-side" reach).
- DevTools Performance panel and Network panel — Unit 2; referenced as the runtime/third-party instruments, not taught.

**This lesson does NOT cover (hand off explicitly):**
- **`dynamic()` / `next/dynamic` code-splitting mechanics** — Unit 3. Named as the reach for a heavy per-route interactive chunk; the *how* (lazy boundaries, `ssr: false`, loading states) is out of scope. If tempted to teach it, stop at naming it.
- **The barrel-trap mechanism and the `optimizePackageImports` / `sideEffects` config** — ch094 L3. This lesson points back to it as the fix for pass-1 barrel bloat; it must not re-teach the config or re-explain tree-shaking.
- **Image optimization** — ch094 L2.
- **Lighthouse, total-JS budgets, and CI perf gates** — ch094 L5. This lesson names Lighthouse's total-JS number as part of the *smell test* and points the CI-artifact pattern at L5/ch097 as siblings, but builds no Lighthouse config and no GitHub Actions workflow.
- **GitHub Actions primitives** (workflow/job/step, triggers, artifacts, caching) — ch097 L1. The CI-artifact pattern is named as a forward-pointed shape only.
- **Server-bundle / Vercel function size optimization** — out of scope; named only as the secondary use of the analyzer's server view (cold-start size), not a workflow.
- **RSC fetch waterfalls and `Promise.all`** — ch094 L6 (the *runtime* server-side perf lesson). "What the treemap can't see" points at runtime cost generally; the waterfall pattern itself is L6.
- **DB indexes / N+1** — ch094 L7.
- **Webpack/Turbopack bundler internals** — name the analyzer's *behavior* (treemap, import-chain trace, route/environment filters), not how Turbopack constructs the module graph.
- **`@next/bundle-analyzer` as a primary workflow** — explicitly demoted to a one-paragraph legacy/Webpack fallback. Do not write a parallel tutorial around it; do not show its `next.config` wrapper as the default setup.

---

## Code conventions notes (for downstream agents)

- Commands use `pnpm` (course package manager): `pnpm next experimental-analyze`, `pnpm next experimental-analyze --output`. Show as `bash` `Code` blocks.
- The built-in Turbopack analyzer needs **no** `next.config.ts` change — do not show a config wrapper for it. A config wrapper appears *only* in the one-paragraph legacy `@next/bundle-analyzer` fallback, and even there keep it minimal/illustrative.
- Any `optimizePackageImports` reference is a *callback* to L3's already-taught shape (`experimental.optimizePackageImports`, under `experimental` — deliberate, do not "fix" to top-level); show at most a one-line fragment, do not re-teach the config.
- `dynamic()` is named, never shown as full code (Unit 3 owns it).
- No full compilable files in this lesson — it is commands + diagrams. This is deliberate for a tooling lesson; downstream agents should not pad it with invented source files.
- **Deliberate divergence / fact-pinned (do not "modernize" backward):** (1) default tool is the built-in `next experimental-analyze`, NOT `@next/bundle-analyzer`; (2) there is no per-route "First Load JS" build table in Next.js 16 — do not reintroduce it; (3) `--output` writes to `.next/diagnostics/analyze`. These are verified against the Next.js 16.2 docs (Feb 2026) and supersede the chapter outline.
