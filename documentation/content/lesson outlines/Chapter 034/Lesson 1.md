# The typed next.config.ts

- Title (h1): `The typed next.config.ts`
- Sidebar label: `next.config.ts`

---

## Lesson framing

This is the chapter opener. Its job is twofold: (1) give the student a durable **mental map** of the project-level config surface — "what lives in `next.config.ts` and what each entry costs" — and (2) teach one entry to real depth, `serverExternalPackages`, as the canonical "this Node SDK won't bundle" lever. Everything else in the chapter (images, redirects/rewrites, headers) is a deep dive into one config key; this lesson is the index that tells the student which lesson owns which key. Keep it a **map, not a tour of every feature** — the temptation is to over-explain `images`, `redirects`, etc.; resist it, those have their own lessons.

Pedagogical spine (from brainstorm):

- **Senior framing, not a settings reference.** The senior contribution here is *judgment about what earns a line in this file*. Frame the whole lesson around the lifecycle of a config file: a new project's config is ~10 lines; over a year it accretes image domains, redirects, security headers, and a stubborn SDK. The student should leave able to look at any `next.config.ts` and reason about why each entry is there and what it costs — not memorize keys.
- **Defaults before conditionals.** Two of the keys we turn *on* (`cacheComponents`, `typedRoutes`) are "always on for a new 2026 project" — present them as non-negotiable scaffolding flags, briefly, with the *why*, not as decisions. `serverExternalPackages` is the opposite: a **conditional power-tool** you reach for only when a specific failure mode appears. Name the trigger (a bundling crash) before the tool. This contrast — "flags you always set" vs. "levers you add only on a trigger" — is itself a teaching point and the spine of the lesson.
- **The pain `serverExternalPackages` relieves.** Turbopack bundles your Server Component dependencies. Some Node-native packages (native `.node` bindings, dynamic `require`, reading sibling files at runtime) break when bundled. The student has not yet hit this wall, so the lesson must *manufacture the pain concretely*: show the error message they'll see ("module not found" / "native binding missing" at runtime), then show the one-line fix. The mental model: this key moves a package from "bundled into the function" to "`require`d natively at runtime."
- **The non-obvious 2026 reality (corrects the brainstorm).** Next.js ships a **large default opt-out list** already — `@prisma/client`, `sharp`, `pg`, `mongodb`, `@aws-sdk/client-s3`, `puppeteer`, `better-sqlite3`, and ~80 more. So the realistic senior reflex is **"check the default list first — most popular Node SDKs are already covered; only reach for `serverExternalPackages` for the package that isn't."** This is a meaningful correction to the chapter-outline brainstorm, which implied you routinely add Prisma/sharp by hand. You don't. Downstream agent: do **not** use Prisma or sharp as the worked-example package — they're already externalized. Use a plausible *not-listed* native SDK instead (e.g. a niche analytics/native-crypto/`node-canvas`-adjacent or vendor SDK) and call out explicitly that the common ones are already handled.
- **`transpilePackages` is the easy-to-confuse twin.** Name it once and draw the one-sentence contrast: `serverExternalPackages` = bundle *out* (external runtime `require`); `transpilePackages` = pull *in* and compile (raw TS/JSX from a monorepo package). Same neighborhood, opposite direction. A small Buckets exercise nails this.
- **Operational reality students get wrong.** Config is read at server **startup**; most edits need a **dev-server restart**. This is the single most common real-world footgun ("I changed the config and nothing happened") — give it its own beat, not a buried watch-out.
- **Mental model to leave with:** `next.config.ts` is a *typed, restart-on-change, build-and-server-time* object. A handful of keys are always-on flags; the rest are conditional and each one you add carries a cost (cold-start tax, larger function output, a global rule with no per-route override). The typed import is what keeps the file honest.

Verified facts to enforce (Next.js 16.2, Dec 2025 docs):

- `next.config.ts` is the officially documented TS form. Shape: `import type { NextConfig } from 'next'; const nextConfig: NextConfig = {...}; export default nextConfig;`. It **works out of the box** when Next loads it (`next dev`/`next build`) — Next compiles the TS internally. Do **not** mention the `--experimental-next-config-strip-types` Node-native-stripping flag; it's a niche path irrelevant to a SaaS dev.
- `typedRoutes: true` is **stable** and **top-level** (no longer `experimental.typedRoutes`). Requires TypeScript.
- `cacheComponents: true` is **top-level**; `experimental.dynamicIO` / `experimental.useCache` are deprecated predecessors.
- `serverExternalPackages` is **stable** (since v15; renamed from `serverComponentsExternalPackages`). Transitive-dependency externalization works automatically as of **Next.js 16.1** — you no longer declare an SDK's internal deps.
- `.cts` / `.cjs` config extensions are **not supported**. `.mjs`/`.mts` exist for CommonJS projects, but the course default is an ESM project, so `.ts` is correct. Treat "always `.ts`" as the rule.

---

## Lesson sections

### Introduction (no heading)

Warm, brief, decision-first. Open on the lifecycle hook: a brand-new Next.js project's `next.config.ts` is almost empty — a few flags. Fast-forward a year of a real SaaS and it has image domains, a permanent redirect from an old URL scheme, a stack of security headers, and one stubborn SDK that refuses to bundle. Pose the senior question implicitly: *what earns a line in this file, and what does each line cost?* Preview the two-part payload: a one-screen **map** of the surface (so the student always knows where a given concern lives), then one entry to depth — `serverExternalPackages`. Connect to what they know: they've just spent chapters 032–033 inside the route tree (rendering, `cookies()`/`headers()`, `proxy.ts`); this file is the project-level surface that *wraps* those routes. No code yet.

### The file Next reads before your routes

Goal: establish the file's identity and the typed shape before any keys.

- What the file *is*: a Node module Next loads at **build and server startup**, default-exporting one config object. It never ships to the browser.
- The typed form. Show the canonical skeleton with `Code` (it's short and the focus is the whole shape, not parts):
  ```ts
  import type { NextConfig } from 'next';

  const nextConfig: NextConfig = {
    // config goes here
  };

  export default nextConfig;
  ```
- Why typed (the payoff, stated as a decision): `NextConfig` gives autocomplete over the whole surface and turns a mistyped key or wrong value type into an **editor/build error** instead of a silently-ignored option. A config typo is otherwise invisible — the option just does nothing. This is *why* the course rule is "always `.ts`."
- Always `.ts`, never `.js`/`.mjs` in this course (ESM project). Mention `.cts`/`.cjs` are not even supported by Next — reinforces that the file format is not a free choice. Mixing a `.js` and a `.ts` config is a footgun (Next picks one; the other silently does nothing).
- Use `import type` for `NextConfig` — aligns with the course's `verbatimModuleSyntax` convention; worth modeling correctly here since this is a config file the student will copy.

Components: a single `Code` block for the skeleton. No annotation needed — it's four lines and the point is holistic.

Terms (`Term`): **Turbopack** (Next.js's Rust bundler/dev server; the thing that compiles and bundles your app) — define on first use here, it recurs throughout. **bundling** (combining your code + its dependencies into the files the server actually runs) — light gloss, since the whole `serverExternalPackages` section hinges on it.

### A one-screen map of the surface

Goal: the student leaves able to point at any concern and say "that's a `next.config.ts` key, and it's taught in lesson N." This is the lesson's backbone deliverable.

- Frame as a map: these are the keys a real SaaS config touches. Group them by *kind*, because the kind is the actual lesson:
  - **Always-on flags** (set once, leave on): `cacheComponents`, `typedRoutes` — covered in *this* lesson, just below.
  - **Platform-pipeline config**: `images` (lesson 2).
  - **Edge routing rules**: `redirects`, `rewrites`, `headers`, `trailingSlash` (lesson 3; `headers` security baseline deferred to chapter 081).
  - **Bundling levers**: `serverExternalPackages` (this lesson, in depth), `transpilePackages` (named).
  - **`experimental`**: the staging area for not-yet-stable options — and a warning that keys here churn between minor versions, so a copied `experimental` block can break on upgrade.
- Best vehicle is a **diagram**, not a prose list, because "a map" is inherently spatial and it doubles as a chapter table of contents the student can re-scan. **Build it as an `ArrowDiagram` inside a `Figure`** (or plain HTML+CSS grouped boxes if arrows add nothing): a central `next.config.ts` node with labeled grouped boxes radiating out — each group titled by kind, listing its keys, tagged with the lesson that owns it (e.g. "→ Lesson 2"). Pedagogical goal: spatial memory of *where each concern lives* and an honest "this lesson only owns two boxes; the rest are signposted." Cap height per the diagram guidance; prefer a horizontal/grid layout. Caption: "Everything `next.config.ts` touches in a 2026 SaaS — and where this chapter teaches each piece."
- Keep prose minimal around the diagram — one sentence per group at most. Explicitly say: no deep dives here; this is the index.

Watch-out to fold in (not a separate section): `experimental` keys come and go between minor versions — never copy an `experimental` block from a blog post without checking it still exists.

### Two flags every new project turns on

Goal: dispatch `cacheComponents` and `typedRoutes` quickly and correctly as non-negotiable scaffolding, with just enough *why* to make them stick. These are defaults, not decisions — keep the tone "set it and move on," but justify each in one tight beat.

- `cacheComponents: true`. This is the opt-in for the chapter-032 rendering model (dynamic-by-default with per-component `use cache`). One sentence on what it turns on, then: **stays on for every new project in this course.** Do **not** re-teach the Cache Components model — it's owned by lesson 1 of chapter 032; a one-line redefinition only ("flips routes to dynamic-by-default with explicit caching opt-in"). Cross-reference it.
- `typedRoutes: true`. The high-value one to actually *show*. It turns your app's route strings into a **typed union**, so a typo in `<Link href="/dashbord">` becomes a **build error**, not a runtime 404 the user finds. This is the senior reflex made automatic: the type system catches dead internal links. Stable and top-level in 16 (call this out — older tutorials show it under `experimental`).
  - Show the payoff with a tiny before/after using **`CodeVariants`** (two tabs): tab "Without typedRoutes" — `<Link href="/dashbord">` compiles, breaks at runtime; tab "With typedRoutes" — same line is a red squiggle / build error. The point is the *failure moves left* (runtime → build). Keep each tab 2–4 lines. (Note for downstream: this requires `<Link>` from `next/link`, introduced in chapter 029 — assume known, don't re-teach `<Link>`.)
- Add both to the running config object so the student sees them accumulate (this object grows across the lesson into the worked example).

Components: `CodeVariants` for the typedRoutes before/after. Plain `Code` for the two-line config additions.

Term (`Term`): **typed union** *only if* not already a established prerequisite by this point — likely known from the TS unit; skip unless brainstorm of prior chapters suggests otherwise. Lean toward **not** adding it.

### When an SDK won't bundle: serverExternalPackages

Goal: the depth section. This is the conditional power-tool — teach the **trigger, the mechanism, the decision rule, and the cost**, in that order. This is where the real senior judgment of the lesson lives.

Structure as subsections:

#### The wall you hit (h3 — or fold into the section intro)

- Manufacture the pain. The student installs a Node-native SDK (give a concrete plausible example that is **not** on the default list — pick a native-binding or dynamic-`require` SDK), imports it in a Server Component or route handler, and the dev server / build **crashes**: a "module not found" or "native binding missing" / "can't be bundled" error at runtime. Show the *shape* of that error in a `Code` block (bash/log lang) so they recognize it in the wild — recognition is the deliverable, not the exact string.
- Why it happens, plainly: Turbopack tries to bundle the package's code into the server output, but the package depends on a compiled `.node` binary or does `require()` dynamically — things a bundler can't statically follow. Keep the explanation conceptual; the student is a junior dev who needs the *category* ("native or dynamic-require packages resist bundling"), not bundler internals.

#### What the flag actually does

- `serverExternalPackages: ['the-sdk']` tells Next: **don't bundle this — `require` it natively at runtime** from `node_modules`. The package is opted out of Server Component bundling; Node's normal resolution loads it.
- Best visual: a tiny **before/after diagram** of where the package lives. Two states — **Bundled** (package code folded inside the server function output, ✗ breaks) vs. **External** (function output holds a thin `require('the-sdk')`; the real package resolved from `node_modules` at runtime, ✓ works). A **`DiagramSequence`** (two/three steps: "default: bundled → crash" → "add to serverExternalPackages" → "runtime require → works") makes the *change* legible as a sequence. Alternatively a 2-tab `TabbedContent` of two `ArrowDiagram`s (Bundled vs External). Pedagogical goal: cement the mental model that this key *relocates* the package from inside-the-bundle to required-at-runtime. Prefer `DiagramSequence` since the teaching point is the transition.
- The cost, stated honestly (this is the senior framing): externalizing trades a slightly **larger function output** and a marginally **slower cold start** (the `require` happens at runtime) for a working SDK. Cheap when needed, pure tax when not. This sets up the decision rule.

#### Check the default list first

- The 2026-correct reflex (the brainstorm correction): Next **already ships a large opt-out list** — `@prisma/client`, `prisma`, `sharp`, `pg`, `mongodb`, `better-sqlite3`, `@aws-sdk/client-s3`, `puppeteer`, and ~80 more. So **most popular Node SDKs are already handled** — you don't touch the config for them.
- Decision rule, as a crisp procedure (this is the takeaway):
  1. Install the SDK and use it. Don't pre-configure anything.
  2. If it works — done. (Most do, either because they bundle fine or they're already on the default list.)
  3. Only **if** it crashes with a bundling / native-binding error, and only **if** it's not already on the default list, add it to `serverExternalPackages`.
- Hammer the anti-pattern: **don't preemptively externalize**, and don't use `serverExternalPackages` to paper over a genuinely missing dependency — that hides the real bug (a package you forgot to install) behind a runtime `require` that will still fail, just later and more confusingly.
- Best vehicle for the rule: a short **`StateMachineWalker`** (`kind="decision"`) — "SDK throws at build/runtime?" → "native binding / dynamic require error?" → "already on the default list?" → leaf: *add to serverExternalPackages* vs *fix the real problem* vs *do nothing*. This turns the rule into something the student walks, matching the "decisions before syntax" stance. If a walker is overkill for three questions, a `flowchart LR` Mermaid decision tree in a `Figure` is the fallback. Prefer the walker — it's interactive and the decision is the lesson.

#### serverExternalPackages vs transpilePackages

- The confusable twin, named and contrasted in one tight beat. `serverExternalPackages` = a finished Node package that breaks when bundled → push it **out**, `require` at runtime. `transpilePackages` = a raw, *un-compiled* TS/JSX package (typically your own monorepo `packages/*`) that Next must **pull in and compile** before bundling. Opposite directions; opposite problems.
- Lock it with a tiny **`Buckets`** exercise (`twoCol`): two buckets ("serverExternalPackages — bundle out" / "transpilePackages — compile in"), ~5 chips to sort — e.g. "a native image-processing binary," "your monorepo `@acme/ui` shipped as raw `.tsx`," "a DB driver with a `.node` addon," "an internal `@acme/utils` TS-only package," "an SDK that does dynamic `require()`." Grading: native/dynamic-require items → external; raw-TS monorepo items → transpile. Goal: the student can *classify* a new package by symptom, which is the actual skill.

#### Transitive dependencies are handled for you

- Short forward-looking beat so students reading older configs/blog posts aren't confused. **As of Next.js 16.1**, when you externalize a package, Turbopack also externalizes *its* internal dependencies automatically — you no longer hand-list an SDK's transitive deps (a real pain in older versions). Name it so an older config pattern (declaring child deps) is *recognized as obsolete*, not copied. One paragraph; no code needed.

Terms in this section (`Term`): **native binding** (a compiled `.node` module — machine code a bundler can't read or rewrite, only `require` at runtime); **cold start** (the first-request latency when a serverless function spins up from idle) — both support the cost/mechanism story and are likely unfamiliar to a career-changer.

### A real config edit does nothing until you restart

Goal: the operational footgun, given its own short section because it burns hours in practice and applies to *every* key in the file, not just one.

- The rule: `next.config.ts` is read at **server startup**. Edit it while the dev server runs and the old config keeps running — your change appears to do nothing. Fix: **restart the dev server** after a config change. (Foreshadow lesson 3: this same gotcha makes "I added a redirect and it didn't fire" a classic confusion.)
- Frame as a debugging reflex, not a rule to memorize: "config edit + no effect → did you restart?" is the first thing to check.
- One or two sentences max; no component needed. Could be an `Aside` (caution) since it's a sharp operational warning that benefits from standing out — acceptable here because it qualifies the whole file, but keep it teaching-prose-adjacent, not a dumping ground.

### A production next.config.ts, end to end

Goal: synthesis. Assemble everything into the single realistic file the student would actually ship — under 30 lines — and walk it so each line's *presence* is justified.

- The file (one `next.config.ts`): typed import; `cacheComponents: true`; `typedRoutes: true`; a one-entry `serverExternalPackages` (the not-on-default-list SDK from earlier, so it's honest); a `headers()` placeholder commented as "security baseline — chapter 081" (forward reference, do not implement); `export default`. Keep `images`/`redirects` *out* — point at lessons 2–3 with a comment so the student sees the seams where the file will grow.
- Walk it with **`AnnotatedCode`** (this is the canonical use — one file, multiple parts deserve focused attention): steps highlight (1) the typed import + why, (2) the two always-on flags, (3) the single `serverExternalPackages` entry + the "only because it's not on the default list and it crashed" justification, (4) the `headers` placeholder as a signpost. Each step ≤6 lines of prose, colored (blue default; maybe green on the flags, orange on the externalized entry to mark "conditional"). Goal: the student reads a real config and can defend every line.
- Close the synthesis with the mental model restated in one line: a typed object, read at startup, a few always-on flags plus conditional levers each carrying a cost.

Components: `AnnotatedCode` for the worked file. This is the section's centerpiece.

### Check your map (optional consolidation)

Goal: lightweight recall check on the *map* and the `serverExternalPackages` decision — the two things this lesson must leave behind. Optional; include if it doesn't bloat the lesson past ~35 min.

- One or two `MultipleChoice` items, decision-flavored not trivia:
  - "An SDK with a native binding crashes at build with 'native binding missing.' What's the senior first move?" — correct: check whether it's already on Next's default external list / try it before configuring; distractors: immediately add to `serverExternalPackages`, switch to `transpilePackages`, set `unoptimized`.
  - "You added a `redirect`/flag to `next.config.ts` and nothing changed. Most likely cause?" — correct: dev server needs a restart; distractors: typo silently ignored (plausible-but-second), wrong file extension, needs `experimental`.
- Keep it to a couple of questions. The `Buckets` and `StateMachineWalker` already did most of the checking inline; don't over-assess.

### External resources (optional)

- One or two `ExternalResource` cards: the Next.js `next.config.ts` / configuration reference and the `serverExternalPackages` page (it carries the live default list, which is the single most useful thing to bookmark). Keep to official docs.

---

## Scope

**Prerequisites to redefine briefly (one line each, do not re-teach):**

- Cache Components / `cacheComponents` model — owned by lesson 1 of chapter 032. One-line gloss only.
- `cookies()`/`headers()`, `proxy.ts` — chapter 033. Reference as "the request surface" when contrasting with project-level config; don't explain.
- `<Link>` from `next/link` — chapter 029. Assumed known for the `typedRoutes` example.
- Server Components / route handlers — assumed known (Unit context). `serverExternalPackages` only affects *these* (server-side bundling); say so without re-teaching them.
- TypeScript typing, `import type` — Unit on TS. Just use the conventions correctly.

**Explicitly out of scope (defer, with a pointer where natural):**

- `images` config (`remotePatterns`, `qualities`, `formats`, etc.) — **lesson 2 of chapter 034**. Name the key on the map; do not configure it.
- `redirects`, `rewrites`, `trailingSlash`, and the `source`/`has`/`missing` syntax — **lesson 3 of chapter 034**. Name on the map only.
- Security headers (`headers()` contents: CSP, HSTS, etc.) — **chapter 081**. The worked example has a *commented placeholder* only; do not implement any header.
- The Cache Components rendering model itself, `use cache`, `cacheTag`/`cacheLife` — chapter 032. `cacheComponents: true` is shown as a flag to enable, nothing more.
- `reactCompiler` — it's a real top-level flag and may appear in a scaffolded config, but the React Compiler is owned elsewhere (UI/hooks unit). Optionally mention as a one-word "also a flag you'll see" on the map; do **not** teach it.
- `next/font`, `next/script`, `next/image` *usage* — later lessons of this chapter. Out of scope here.
- Turbopack/webpack config internals, custom loaders, `output: 'standalone'`, self-hosting — out of scope (self-hosting is chapter 098).
- The `--experimental-next-config-strip-types` Node-native-stripping flag — deliberately omitted; not relevant to a SaaS dev and adds confusion.
- Monorepo setup itself — `transpilePackages` is *named and contrasted* only; do not teach monorepo tooling.

---

## Notes for downstream agents

- The worked-example externalized package **must not** be Prisma, `sharp`, `pg`, `mongodb`, `puppeteer`, `@aws-sdk/client-s3`, or `better-sqlite3` — all already on Next's default list. Pick a plausible native/dynamic-require SDK that is *not* listed, or invent a clearly-fictional `@acme/native-sdk`, and state that the common ones are pre-handled. This honesty is load-bearing for the whole `serverExternalPackages` argument.
- `typedRoutes` and `cacheComponents` are **top-level** keys in Next 16. Any code that shows them under `experimental` is wrong — older tutorials do this.
- Transitive externalization = **Next.js 16.1**. If a version number is stated, use 16.1.
- Keep the lesson a map-plus-one-depth. If it grows a second deep dive, cut it — the other keys have dedicated lessons.
