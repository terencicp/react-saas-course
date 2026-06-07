# JSX for the email DOM

Sidebar label: JSX for the email DOM

## Lesson framing

This is the chapter's entry lesson and the first time the student writes an actual email template. The senior question that opens it is already set up by Ch048 lesson 1: the `resend.emails.send` call accepted a React component as its `react` prop (`<WelcomeEmail name="Ada" />`), but that was a placeholder. This lesson answers: what HTML actually goes on the wire when that component renders, why can't the team ship the same JSX it ships to the browser, and what component vocabulary makes the constrained email-HTML subset feel like normal React.

Archetype: mechanics lesson with a single running artifact (a worked `WelcomeEmail` template) assembled across the lesson. Estimated student time 50-60 min.

The dominant pedagogical risk is **cognitive load from a large vocabulary**. The chapter outline lists ~15 component primitives. Dumping them as a reference table is the failure mode — the student skims and retains nothing. The fix: motivate the *constraint* first (why email HTML is its own subset), then introduce primitives in functional clusters (shell / layout / content / CTA-and-image / inbox-metadata), each cluster justified by a job it does, and only as many as the running `WelcomeEmail` needs. Treat the full set as a read-once vocabulary the preview server (lesson 2) and repeated use will cement, not something to memorize here.

The second mental-model anchor: **React Email is the same React, a different DOM.** The student already knows JSX, components, typed props, and Tailwind utilities from Units 3-6. The whole lesson reframes those known tools onto a new render target. Lead every primitive with "you know `<p>` / `<a>` / a flex row — here's its email-safe equivalent and why the raw one breaks." This keeps the new surface area small by hanging it on existing knowledge.

Third anchor, and the senior reflex that pays off in lessons 2-3 and the Ch050 project: **templates are pure renderers parameterized by typed props, with mock data co-located as `PreviewProps`.** Every dynamic value comes from props; the template never reads env, the session, or the DB. This is what makes the same file render identically in the preview, a unit test, and a real send. Establish it early and reinforce it when `PreviewProps` lands.

Key decisions baked into section ordering:

- Open with the constraint (the worst-client baseline), because "decisions before syntax" demands the student understand *why* the subset exists before meeting the components that target it. Without this, the components look like arbitrary ceremony.
- Visualize the render pipeline (JSX -> inline-styled HTML -> SDK-assembled dual-part MIME message) once, early, with a diagram. It's the load-bearing mental model and prose alone makes it abstract.
- Defer `<Tailwind>` until after the raw primitives, so the student first sees that primitives carry sensible defaults, then learns Tailwind layers brand styling on top. Introducing both at once muddies which tool does what.
- The Tailwind-v4-to-v3 config bridge is genuinely fiddly and a known footgun; give it its own section but teach only the *shape* (one TS module, hex fallbacks for OKLCH), not an extraction algorithm.
- End by composing everything into the running `WelcomeEmail` plus an `EmailLayout`, so the lesson lands a concrete, reusable artifact rather than a pile of isolated snippets.

ReactCoding cannot load `@react-email/components` (per project constraint: the iframe runs only the React family from esm.sh, no third-party npm). So **no live coding** in this lesson — checks are non-coding (Buckets, Dropdowns, MultipleChoice) plus heavy use of `Code` / `AnnotatedCode` / `CodeVariants` for worked snippets. The real hands-on loop is lesson 2's preview server.

## Lesson sections

### Introduction (no header)

Open by reconnecting to Ch048: the send call worked, the inbox received it, but `<WelcomeEmail name="Ada" />` was a stand-in. Pose the senior question directly (what HTML goes on the wire / why not ship browser JSX / what's the API that makes the constraint ergonomic). State the concrete payoff: by the end the student has a typed `emails/welcome.tsx` they could pass to `sendEmail` unchanged. Keep it to a short warm paragraph. Do not enumerate the component list here — that is the body's job.

### Why email HTML is its own subset

Goal: install the constraint that motivates everything downstream. This is the "trigger before tool" section — name the threshold the browser-CSS default crosses.

Teach:
- The mailbox-client landscape has no shared modern-CSS baseline. The same email is parsed by Gmail web, Gmail iOS/Android, Apple Mail (macOS/iOS), Outlook Windows (historically the Word rendering engine, now Edge-based but legacy installs persist), Outlook Mac, Yahoo, Proton, plus enterprise webmail — each with different, often ancient, rendering rules.
- The unreliable list, framed as "everything you reach for on the web": flexbox, grid, custom properties, `@layer`, container queries, viewport units. None are dependable across that matrix.
- The interoperable baseline is roughly HTML 4 + table layouts + inline styles + a small media-query subset. Frame this as "2004-shaped HTML."
- React Email's one-sentence job: let the team write 2026 React while the renderer emits the 2004-shaped HTML the worst client still parses. This is the thesis of the whole chapter — state it cleanly.

How to convey: a compact visual beats prose for the landscape. Use a **`<Figure>` with a simple HTML+CSS support matrix** — rows = a handful of modern CSS features (flexbox, grid, custom properties, container queries), columns = "modern browser" vs "email baseline", cells = check / cross. Goal: one glance shows the gulf. Keep it small (4-5 rows), horizontal, well under the height cap. This is a "simple visual aid" diagram, not a system graph — exactly the kind the diagram guidance encourages.

Briefly name the alternative and drop it: MJML / `mjml-react` is the legacy tool for extreme Outlook compatibility; mention once, say React Email is the 2026 default, move on. (Satisfies "mention alternatives so the student understands the choice" without a historical detour.)

Tooltip candidates here: `VML` (Vector Markup Language — the legacy Outlook vector format that bulletproof buttons exploit; will recur in the `<Button>` section), `MIME`.

### From JSX to a message on the wire

Goal: the load-bearing mental model — a template is a server-rendered React component that compiles to email-safe HTML with styles inlined at render time, and the Resend SDK turns that into a two-part MIME message for you. Get this right and the `react` prop, the plain-text fallback (lesson 3), and "no CSS file is loaded" all follow.

IMPORTANT — fact-check correction (verified June 2026, see notes at end). The chapter outline says `render()` returns `{ html, text }`; it does **not**. `render(<Template />)` (from `@react-email/render`, re-exported by `react-email`) returns an **HTML string**. The plain-text part is produced separately — either by the Resend SDK automatically, or via the `toPlainText(html)` utility (lesson 3 territory). Teach the corrected shape.

Teach:
- A React Email template is server-rendered React. `const html = await render(<WelcomeEmail … />)` returns the email-safe HTML string (inline styles, tables).
- The crucial senior point, now *stronger* than the outline implies: the Resend Node SDK (since Aug 2025) auto-generates the plain-text part from the `react` (or `html`) value you pass. So passing the React node to the `react` prop yields **both** the `text/html` and `text/plain` MIME parts with zero extra work. The application almost never calls `render` itself; calling `await render(...)` at the send site is redundant and throws away the SDK's automatic plain-text generation. Tie back to the `lib/email.ts` wrapper from Ch048: the wrapper takes a `react` node, not a pre-rendered string.
- The plain-text part exists and matters (screen readers, plain-text clients, clipping fallback) — name it as lesson 3's subject, do not teach it here. The one-line takeaway: you get it for free by passing `react`.
- Styles are inlined per element at render time. No external/`<style>` stylesheet is loaded by the client (the dark-mode `<style>` exception is lesson 3). This is *why* the Tailwind component compiles to inline styles rather than classes.

How to convey: a **`<DiagramSequence>`** is the right vehicle — the pipeline is inherently temporal and stepping through it controls cognitive load. Steps:
1. `welcome.tsx` — the JSX you author (show a 3-4 line skeleton).
2. `render()` runs on the server — JSX tree + inline-style pass.
3. Out comes the email-safe **HTML string** (inline styles, table layout) — show a small snippet of the inlined output so the student sees the 2004-shaped result.
4. The Resend SDK auto-derives the plain-text part and packs both into one `multipart/alternative` message on the wire.
5. The client picks the part it renders.
Pedagogical goal: make "JSX in, inline-styled HTML out, SDK adds the text part and sends" concrete and sequential. Caption each step in one line.

Then a short `Code` block showing the canonical call shape, reinforcing that the wrapper receives the node:
```ts
await sendEmail({ to, subject, react: <WelcomeEmail firstName="Ada" verifyUrl={url} /> });
```
Mark via a one-line aside that `render` exists but is for tests/inspection (it returns the HTML string), not the send path.

Tooltip candidates: `multipart/alternative`, `render` (one-line: "React Email's server-side renderer; returns the email-safe HTML string").

### The component vocabulary

Goal: install the read-once primitive set, clustered by job, sized to what `WelcomeEmail` needs. This is the largest section; the anti-dump discipline matters most here. Frame the opening sentence as the senior reach: reach for these named primitives instead of raw `<div>`/`<table>`/`<style>`, because they carry the email-safe defaults and the Outlook fallbacks you'd otherwise hand-roll.

Structure as h3 sub-sections per cluster. For each primitive, lead with the web element the student already knows, then the email-safe equivalent and the one reason the raw version breaks.

#### The document shell — `Html`, `Head`, `Body`

- `<Html>` is the email's `<html>` (carries `lang` later, lesson 3); `<Head>` holds `<Title>`, `<Font>`, and the dark-mode meta (lesson 3); `<Body>` is the canvas. Every template is wrapped in this trio.

#### Framing the column — `Container`

- `<Container>` is the centered max-width wrapper (default 600px) — the email equivalent of a page's main content area. 600px is the de-facto safe column width across clients; name it as the convention, not a magic number.

#### Stacking and splitting — `Section`, `Row`, `Column`

- The senior payoff line: these *are* the table layout, so you never write `<table>` yourself. `<Section>` is a vertical band (stack things down the page). `<Row>` + `<Column>` is the horizontal split (logo-and-CTA header, two-up cards). Explicitly: this is how you do horizontal layout when flexbox is off the table — the renderer emits the table cells.

#### Text — `Heading`, `Text`, `Link`

- `<Heading as="h1">` / `as="h2">` (the `as` prop sets the level — heading hierarchy is a lesson-3 accessibility concern, name it here). `<Text>` is the paragraph default with sensible line-height/margin (vs a raw `<p>` that inherits client defaults). `<Link>` is the styled anchor.

#### The call to action — `Button`

- The headline primitive of this cluster. `<Button href=...>` renders a **bulletproof button** — a table-cell-based CTA whose Outlook VML fallback is generated for you. The senior call: pick `<Button>` over a styled `<a>` for any CTA, because a styled `<a>` loses its background/padding in Outlook. Connect back to the VML tooltip.

#### Images — `Img`

- `<Img>` requires `width`, `height`, `alt`, `src`. The non-negotiable point: `width`/`height` are *attributes*, not CSS — Outlook ignores CSS dimensions and renders the image at its natural pixel size without them, blowing past the 600px column. This is a watch-out taught inline, not parked at the end.

#### Inbox metadata — `Preview` (and `Hr`, `CodeBlock`, `CodeInline`)

- `<Preview>` deserves its own emphasis: a hidden element whose text becomes the **preheader** — the gray preview line next to the subject in the inbox list. Every transactional template sets one; leaving it blank lets the client pull the first visible body text, which almost always duplicates the subject. Frame as "the one primitive beginners forget that hurts every open."
- `<Hr>` (divider), `<CodeBlock>`/`<CodeInline>` (for templates that show codes/snippets) — name briefly, these are situational.

How to convey the cluster: use a **`Code` block of a minimal but complete template skeleton** showing the shell + container + one section + a heading + text + button, so the student sees how the primitives nest. Then an **`AnnotatedCode`** walkthrough over a slightly richer version of that same block, one step per cluster, highlighting the lines for that cluster with a tinted color. This directs attention to one group at a time inside a single block — exactly `AnnotatedCode`'s purpose — and keeps the block as the single source of truth. Keep `maxLines` reasonable; if the block exceeds ~18 lines, trim to the essential primitives.

Do not also build a giant reference table — the AnnotatedCode walkthrough *is* the vocabulary delivery. A terse one-line-each bullet list under each h3 is enough reference.

Exercise to consolidate the vocabulary without coding: a **`Buckets`** drill — buckets = "Layout", "Text", "CTA / media", "Document & metadata"; items = `Container`, `Section`, `Row`, `Column`, `Heading`, `Text`, `Link`, `Button`, `Img`, `Preview`, `Html`/`Head`/`Body`. Goal: cement which primitive does which job, which is the retrievable knowledge that matters more than exact syntax. Place it at the end of this section.

Tooltip candidates: `preheader`, `bulletproof button`.

### Tailwind without a third syntax

Goal: reframe the student's Unit-3 Tailwind muscle memory onto the email target, and surface the two things that differ — narrower supported subset, and inline-style output. This is the "same vocabulary, new render target" anchor applied to styling.

Teach:
- Wrap the body in `<Tailwind>` (from `@react-email/components`) and the template uses the familiar utilities: `text-lg`, `font-semibold`, `bg-zinc-50`, `mx-auto`, `max-w-[600px]`. Same vocabulary as the web app.
- What the wrapper actually does: at render time it compiles each used class into **inline styles per element** and drops unrecognized ones with a console warning. This is the payoff of "no CSS file is loaded" from the pipeline section — Tailwind can't ship a stylesheet, so it inlines. (The wrapper is built on Tailwind 4.x internally — verified June 2026 — so the utility vocabulary matches the web app's v4 build.)
- The narrower subset, stated as concrete senior watch-outs: **no `flex`, no `grid`** (use `<Row>`/`<Column>` instead — tie back to the layout cluster); the `space-*` utilities and complex selectors are unsupported because of how styles inline; arbitrary values like `max-w-[37.5rem]` work and are useful; the `dark:` variant needs the head-tag plumbing from lesson 3, so don't reach for it yet.
- The most insidious trap, taught inline: `flex`/`grid` *look like they work in the preview* because the preview renders in Chrome, but Gmail collapses them to default block flow. The preview's correctness is not the inbox's correctness. (This also seeds lesson 2's "the inbox is the only place that matters.")

How to convey: a **`CodeVariants`** before/after is ideal here — two tabs, "Browser instinct (breaks)" using `<div className="flex gap-4">` vs "Email-safe" using `<Row><Column>` with Tailwind utilities for spacing. First-sentence framing per the component's convention ("renders in Chrome, collapses in Gmail" vs "table cells, renders everywhere"). This makes the failure mode vivid and contrastive rather than a bullet warning.

Mention the `config` prop briefly (it accepts a Tailwind config object for theme tokens and presets) but defer the full treatment to the next section — that's where the brand-token bridge lives.

Tooltip candidate: `arbitrary value` (Tailwind's `[...]` bracket syntax).

### Bridging the brand tokens — `emailTailwindConfig.ts`

Goal: solve the real-project friction — the web app's design tokens live in a Tailwind v4 `@theme` CSS block (Ch018), but `<Tailwind>` is configured through a **JS config object passed to the `config` prop**, and many of the web tokens are OKLCH which a handful of mailbox clients don't parse. Teach the *shape* of the bridge, not an extraction algorithm.

IMPORTANT — fact-check correction (verified June 2026, see notes at end). The chapter outline frames this as a "v4-to-v3 config" mismatch; that framing is stale. The `<Tailwind>` component runs Tailwind 4.x internally, and its `config` prop takes a JS config object whose `theme.extend` shape is the same in v3 and v4 — so the real mismatch is **CSS-first `@theme` (web) vs a JS config object (email)**, not a version gap. The other genuinely current detail the outline omits: the `pixelBasedPreset`. Teach the corrected framing below.

Teach:
- The mismatch in one sentence: the web app declares tokens in a CSS `@theme` block; the `<Tailwind>` component reads a **JS config object** instead. They don't share a source, so the brand tokens are mirrored by hand.
- The `pixelBasedPreset` (from `@react-email/components`) — the senior default for email. Tailwind's units are `rem`-based for accessibility, but some email clients don't honor `rem`; the preset re-bases the utilities on `16px`. Include it in the config: `presets: [pixelBasedPreset]`. Name *why* (rem unreliable in some clients), not just that it exists.
- The reach: a small hand-maintained `emails/emailTailwindConfig.ts` — one TS module, one default export — that sets `presets: [pixelBasedPreset]` and mirrors the brand tokens under `theme.extend.colors` with **hex/RGB values (not OKLCH)**, keyed by the same names the web app uses (so `bg-brand` means the same thing in both places).
- Usage: `<Tailwind config={emailTailwindConfig}>` in every template.
- Why hex/RGB specifically: a handful of mailbox clients drop properties whose values they can't parse (OKLCH), and the brand color silently disappears — relating to the broader watch-out that class-derived colors can vanish, so the email config uses concrete hex fallbacks for each token.
- Frame as maintained by hand as the palette evolves — not auto-generated. Keep expectations honest: the student needs the shape and the why, not a sync script.

How to convey: a single `Code` block of a trimmed `emailTailwindConfig.ts` — `import { pixelBasedPreset } from '@react-email/components'`, a default export with `presets: [pixelBasedPreset]` and 3-4 color tokens each as a hex value under `theme.extend.colors` — plus the `<Tailwind config={emailTailwindConfig}>` usage line. Keep it short — the point is the shape.

Aside (caution) for the OKLCH-drops-silently footgun, since it's one of the two non-obvious reasons this file exists (the other being `pixelBasedPreset`).

Tooltip candidates: `OKLCH` (one-line: "a modern CSS color space; wider gamut than hex/RGB but not parsed by some older clients"), `pixelBasedPreset`.

### One template per file — the `emails/` convention

Goal: install the file convention so the student knows where templates live and why placement is load-bearing (it couples to the preview server in lesson 2). Short section.

Teach:
- React Email scans an `emails/` directory at the repo root by default. Each `*.tsx` file is one template, **default-exported**. (Reinforce the code-conventions "one concept per file" rule — confirm `emails/` is the canonical location per the project layout.)
- Naming and placement are deliberate: the CLI's preview path (lesson 2) and the file location work together — moving a template breaks its preview path.
- Subdirectories are supported (React Email 6) for grouping: `emails/auth/`, `emails/billing/`. Name as available, don't over-engineer for the project's handful of templates.

How to convey: a small **`<FileTree>`** showing the `emails/` directory with `welcome.tsx` (bold, the running artifact), a shared `email-layout.tsx`, `emailTailwindConfig.ts`, and an `auth/` subfolder placeholder. One glance communicates the convention. Note: per code conventions, file names are kebab-case (`email-layout.tsx`) while the exported component is PascalCase (`EmailLayout`) — keep the tree and the component names consistent and call this out, because it's a place students conflate the two.

### Props are the template's contract

Goal: the senior reflex that makes templates testable and previewable — templates are pure renderers parameterized by typed props, and mock data ships beside them as `PreviewProps`. This is the anchor that pays off in lessons 2-3 and Ch050.

Teach:
- The default export is a React component with **typed props**: `type WelcomeEmailProps = { firstName: string; verifyUrl: string }`. Every dynamic value reads from props. (Per code conventions: `type`, not `interface`, for prop aliases — diverge from the chapter outline's `interface WelcomeEmailProps` wording deliberately and follow the house rule.)
- The reflex stated as a rule: the template **never** reads env vars, the current user, or DB rows. The caller — a Server Action — computes the values and passes them as props. Connect to the RSC/boundary discipline the student already knows: templates are pure presentation; data fetching lives in the action.
- Why this matters concretely (the three-render payoff): a pure props-only template renders **identically** in the preview server (with mock props), a unit-test render, and a real send (with real props). No special-casing per environment. This is the durable reason, not style.
- `PreviewProps` — the bridge: a template exports `WelcomeEmail.PreviewProps = { firstName: 'Ada', verifyUrl: 'https://yourapp.com/verify/abc' }`. The preview server (lesson 2) auto-detects these and renders the template with them; production supplies real values. Frame as "mock data co-located with the template — this is what obviates a separate Storybook for email."

How to convey: an **`AnnotatedCode`** over a compact `welcome.tsx` that includes the `type WelcomeEmailProps`, the default-exported component reading `firstName`/`verifyUrl` from props, and the `WelcomeEmail.PreviewProps` assignment. Steps: (1) the typed props alias = the contract; (2) the component body reads only from props, never from env/DB; (3) the `PreviewProps` line = mock data for the preview. Use `CodeTooltips` is unnecessary here — the AnnotatedCode prose carries it.

Exercise: a **`Dropdowns`** fill-in-the-blank over a small template stub — blanks for the props type keyword (`type`), the prop access in JSX (`firstName` from `props`/destructure), and the `PreviewProps` export name. Goal: the student reconstructs the contract shape from memory. Alternatively a short `MultipleChoice` ("which of these belongs *inside* the template vs. in the calling Server Action?" — listing `db.query`, `process.env`, `props.firstName`, the rendered `<Text>`) to drill the purity boundary. Prefer the MultipleChoice — the purity boundary is the higher-value concept and the misconception is concrete.

Tooltip candidate: `PreviewProps`.

### Composing the shared chunks — `EmailLayout`

Goal: land the running artifact and the reuse pattern. Most transactional templates share a header (logo + product name), a padded body container, and a footer (legal address per CAN-SPAM, support link, the year). The senior reach is one composed `EmailLayout`, not duplicated chrome per template.

Teach:
- `EmailLayout` wraps the shell + header + footer + brand tokens once; templates compose it: `<EmailLayout><Section>…body…</Section></EmailLayout>`.
- Brand surface (colors, typography, logo URL) lives in this single shared component, not copy-pasted. Tie back to `emailTailwindConfig` for the color tokens.
- The footer's legal address is named as a real constraint (CAN-SPAM) — one line, full treatment is marketing-email territory and out of scope; here it's just "the footer carries it."

Subsection or inline: **Images — host them, don't embed them.** This is a distinct, high-stakes idea so give it visible weight (could be an h3 under this section or its own short section — keep it here, it's about the layout's logo).
- `<Img src>` must point to a publicly accessible HTTPS URL — a CDN, the project's R2 bucket (named, Unit 13b), or the marketing site's `/og/` directory.
- The senior reach: one CDN-hosted logo URL referenced across templates.
- The hard constraint that drives lean-template discipline: **inline base64 images bloat the message past Gmail's 102 KB clipping threshold.** When Gmail clips, it hides everything after the cut — including the unsubscribe link and the legal address — a deliverability *and* compliance problem. Some clients also strip base64 outright. State the 102 KB budget as the named real constraint.
- Repeat the `width`/`height`-attributes-for-Outlook point in the logo context, since the layout's logo is the first `<Img>` the student writes.

How to convey: a **`CodeVariants`** is strong for the reuse story — tab "Duplicated chrome (don't)" showing two templates each repeating header/footer markup vs tab "Composed `EmailLayout` (do)" showing the layout component + a template that wraps its body in it. Drives home the DRY senior reach contrastively.

For the 102 KB / base64 point, a small **`Code` snippet** contrasting `<Img src="data:image/png;base64,iVBOR…(huge)…" />` (commented as "clips the message") vs `<Img src="https://cdn.yourapp.com/logo.png" width={120} height={32} alt="YourApp" />` (commented "lean, Outlook-safe"). Keep it tight.

Aside (caution): the clipping consequence — what specifically gets hidden (unsubscribe, legal address) — to make the abstract KB budget feel like a real failure.

Tooltip candidates: `CAN-SPAM` (one-line: "US law requiring commercial email to carry a physical address and unsubscribe path"), `clipping` / `102 KB` if not already covered inline.

### The running artifact — the assembled welcome email

Goal: a satisfying close that shows the whole `welcome.tsx` the student has been building, every prior concept in one file. This is the mechanics-lesson payoff: a real, shippable template.

Teach: present the complete `emails/welcome.tsx` — `<Tailwind config={emailTailwindConfig}>` wrapping `<EmailLayout>` wrapping `<Preview>`, a `<Heading as="h1">`, `<Text>` body, `<Button href={verifyUrl}>`, typed `WelcomeEmailProps`, and `WelcomeEmail.PreviewProps`. This is the file passed unchanged to `sendEmail`'s `react` prop.

How to convey: a single **`Code` block** (the full file, possibly with a couple of `// new`-style focus comments) since the student has already seen each part annotated — here they see it whole. If it runs long, an **`AnnotatedCode`** with 4-5 steps mapping each region back to the section that taught it (shell+layout, preview, content, button, props+PreviewProps) reinforces retrieval. Prefer `AnnotatedCode` only if the whole-file block exceeds comfortable reading; otherwise a plain `Code` block with a short "what each part does" recap list is cleaner for a finale.

Close with a one-line bridge to lesson 2: the template is written, but the only place that matters is the inbox — next lesson boots the preview server and the iteration loop that catches what Chrome won't.

### Recap (optional short list)

A terse bulleted recap of the durable takeaways: email HTML is a constrained 2004-shaped subset; React Email is the same React, a different DOM; the SDK's `react` prop renders both MIME parts so you pass the node, not a string; reach for the named primitives over raw tags; `<Tailwind>` inlines a narrower subset (no flex/grid); `<Preview>` sets the preheader; templates are pure props-only renderers with co-located `PreviewProps`; host images, never base64 (102 KB clip). Keep to one line each. Optional — only if it aids retention without bloat.

### External resources (optional)

One or two `ExternalResource` cards: the React Email components docs (the canonical primitive reference, so the student has the full vocabulary to hand) and the React Email Tailwind component page. Optional `VideoCallout` only if a recent, high-quality React Email walkthrough exists — do not force one; the lesson stands without it.

## Scope

Prerequisites to redefine concisely (do not re-teach):
- JSX, components, typed props, default exports — known from Units 4-6; assume fluency.
- Tailwind utilities and the v4 `@theme` CSS-first config — Unit 3 / Ch018; reference, never re-teach. The CSS `@theme` block is named only to motivate why the email side needs its own JS config object.
- The `resend.emails.send` call, the `react` prop, and the `lib/email.ts` wrapper — Ch048 lesson 1; this lesson builds the component that fills the `react` prop, so recap the call shape in one line and move on.
- Server Actions and the RSC server/client boundary — known; used to justify props-only purity, not taught.

Explicitly out of scope (belongs to other lessons — name and defer, do not teach):
- **The preview dev server, `pnpm email dev`, viewport/dark-mode toggles, test-send** — lesson 2. This lesson may *say* "the preview server picks up `PreviewProps`" but teaches none of its mechanics.
- **Plain-text generation as a feature (the `toPlainText(html)` utility / the SDK's auto-derivation), the accessibility checklist, dark-mode posture and `color-scheme` head plumbing, `lang`/`<Title>`/heading-order/alt/contrast** — lesson 3. This lesson names that the outgoing message carries an HTML part and an auto-derived plain-text part, and that `<Head>` will later hold meta tags, and stops. Do not teach the `dark:` variant, the `<picture>` logo swap, or `dir="auto"`. Note for the lesson-3 author: confirm `render({ plainText: true })` vs the newer `toPlainText(html)` — June 2026 sources indicate `toPlainText` is the current path and `plainText: true` is being phased out.
- **The send call internals, idempotency, suppression list** — Ch048; not revisited.
- **Marketing-email layouts, multi-column hero sections, one-click unsubscribe, preferences center** — out of scope chapter-wide; the project sends transactional mail only.
- **MJML / `mjml-react`** — named once as the legacy alternative, dropped.
- **CI snapshot testing of rendered HTML** — lesson 2 names it; not here.
- **Localized templates / `next-intl` ICU** — Ch085; not named here beyond the lesson-3 `dir="auto"` mention, which itself is out of scope for this lesson.

Keep the lesson focused on: the constraint, the render pipeline, the component vocabulary, the Tailwind wrapper + config bridge, the file convention, props-and-`PreviewProps`, and the composed `EmailLayout` / `WelcomeEmail` artifact.

## Fact-check notes (verified June 2026 — for downstream authors)

The chapter outline predates several React Email / Resend changes. Corrections already folded into the sections above; collected here so the lesson author treats them as deliberate, not as outline fidelity to restore.

- **`render()` returns an HTML string, not `{ html, text }`.** The chapter outline's `{ html, text }` is stale. `const html = await render(<Template />)`. (react.email `/docs/utilities/render`.)
- **The Resend Node SDK auto-generates the plain-text part** from the `react` (or `html`) value since Aug 21 2025. So passing the `react` node yields both MIME parts for free — the "don't call `render` at the send site" senior point is now *stronger*, not weaker. (Resend changelog, "Automatic Plain Text Emails".)
- **`render({ plainText: true })` is being superseded by `toPlainText(html)`.** Mostly lesson 3's problem; this lesson only references the plain-text part's existence, which is fine. Flagged for the lesson-3 author.
- **`<Tailwind>` runs Tailwind 4.x internally (4.1.x).** The "v4-to-v3 config" framing in the outline is stale — the `config` prop's `theme.extend` shape is shared across v3/v4. The real mismatch is CSS `@theme` (web) vs JS config object (email). (react.email `/docs/components/tailwind`.)
- **`pixelBasedPreset` is the email senior default** (`presets: [pixelBasedPreset]`) — re-bases rem-based utilities on 16px for clients that ignore rem. The outline omits it; the config-bridge section now teaches it. (Same docs page; also flags `space-*` and complex selectors as unsupported.)
- **Confirmed-current (no change needed):** Gmail's 102 KB clipping threshold (multiple sources Nov 2025–Mar 2026); the default repo-root `emails/` scan directory and subdirectory grouping (`react-email` v6.5.0); `<Img>` requiring `width`/`height` attributes for Outlook; the bulletproof-`<Button>` VML fallback. Minor lesson-2 detail surfaced in passing: `_`-prefixed dirs are hidden from the preview sidebar and a `static/` dir serves assets — not this lesson's concern.
