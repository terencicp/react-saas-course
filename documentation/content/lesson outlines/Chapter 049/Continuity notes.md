# Chapter 049 — Authoring templates

## Lesson 1 — JSX for the email DOM

**Taught** — React Email as "same React, different DOM": the constrained 2004-shaped email-HTML subset, the JSX→inline-styled-table render pipeline, the component primitive vocabulary, the `<Tailwind>` wrapper + hand-maintained JS brand-token config, the `emails/*.tsx` file convention, and props-only templates with co-located `PreviewProps`, assembled into a worked `emails/welcome.tsx`.

**Cut** — `<Hr>`/`<CodeBlock>`/`<CodeInline>` named only in passing (not used); `space-*`/complex-selector and arbitrary-value caveats kept brief; `@layer` dropped from the unreliable-CSS list (matrix shows flexbox/grid/custom-props/container-queries/viewport-units).

**Debts**
- Plain-text part: stated it ships free via the `react` prop and the SDK auto-derives it; the feature/`toPlainText` + accessibility get lesson 3.
- Dark mode: `<Head>` meta plumbing, `dark:` variant, `<picture>` logo swap, `<Html lang>`/`<Title>`/heading-order/alt/contrast all deferred to lesson 3. Lesson said "don't reach for `dark:` yet."
- Preview server: `PreviewProps` auto-detection, viewport/dark toggles, test-send all named as lesson 2; preview path is derived from file location.
- `EmailLayout` footer's legal address named (CAN-SPAM) as out of scope; R2-hosted images point to Unit 12/13.
- Built on Ch048's `sendEmail` wrapper (takes a `react` node, not a string).

**Terminology**
- Canonical `welcome.tsx` contract: `type WelcomeEmailProps = { firstName: string; verifyUrl: string }`, default export `WelcomeEmail`, `WelcomeEmail.PreviewProps = { firstName: 'Ada', verifyUrl: 'https://yourapp.com/verify/abc123' } satisfies WelcomeEmailProps`.
- Files: `emails/welcome.tsx`, `emails/email-layout.tsx` (exports `EmailLayout`), `emails/email-tailwind-config.ts` (default export `emailTailwindConfig`). File names kebab-case, components PascalCase.
- Email config shape: `{ presets: [pixelBasedPreset], theme: { extend: { colors: { brand: '#4f46e5', 'brand-foreground': '#ffffff', muted: '#71717a' } } } }`; used as `<Tailwind config={emailTailwindConfig}>`.
- Coined terms / tooltips: "2004-shaped HTML", "worst-client baseline", bulletproof button, VML, preheader (`<Preview>`), `multipart/alternative`, `render` (returns HTML string), MIME, OKLCH, `pixelBasedPreset`, arbitrary value, data URL.
- Container default width 600px (de-facto safe column). Gmail clips messages >102 KB.

**Patterns and best practices**
- Templates pure: never read env/session/DB; caller (Server Action) passes finished props. Same file renders identically in preview, test, real send.
- Pass the React node to `react`, never call `render` at the send site (loses free plain-text). `render` is for tests/inspection only.
- `<Img>` needs `width`/`height` as HTML attributes (Outlook ignores CSS dims); host images at HTTPS URL, never base64.
- No `flex`/`grid` in email Tailwind — use `<Row>`/`<Column>`. Brand colors as hex, not OKLCH (silently dropped). `<Preview>` on every template.
- Deliberate exception to named-exports rule: templates are default-exported, one per file.

**Misc.** — Outline divergences folded deliberately (verified June 2026): `render()` returns an HTML string (not `{ html, text }`); SDK auto-generates plain-text; `<Tailwind>` runs Tailwind 4.x internally so the mismatch is CSS `@theme` (web) vs JS config (email), not a v4→v3 gap; prop shapes use `type` not `interface`. Lesson uses placeholder brand "YourApp"; CTA classes `rounded-md bg-brand px-5 py-3 text-brand-foreground`. No live coding (ReactCoding can't load `react-email`).

---

## Lesson 2 — The preview server loop

**Taught** — The `pnpm email dev` workflow: `"email": "email"` `package.json` script + `@react-email/ui` devDep (`pnpm add -D @react-email/ui`; not pulled in transitively, else `email dev` blocks on an interactive install prompt) boot the React Email preview server (file watcher + hot reload), the live props panel as a what-if surface, the desktop/mobile/dark lenses, the HTML and plain-text output views, the test-send-through-Resend gate, and the canonical 7-step iteration loop. Spine: preview server = iteration loop, test-send = verification gate.

**Cut** — CI snapshot-testing of rendered output (`renderToStaticMarkup` + `toMatchSnapshot`), which the chapter outline named as a senior reach, was dropped entirely to protect the workflow focus (not in the project chapter).

**Debts**
- Plain-text discipline (coherence-check criteria, accessibility, `render({ plainText: true })`) explicitly handed to lesson 3 — this lesson only names the plain-text *view* and says "read it."
- Dark-mode *implementation* (head meta plumbing, `@media (prefers-color-scheme: dark)`, `dark:` variant, `<picture>` logo swap) handed to lesson 3 — this lesson only covers what the dark toggle *shows* and how far to trust it.
- Reuses lesson 1's `welcome.tsx` + its `PreviewProps` verbatim, and Ch048's `sendEmail({ react: … })` wrapper as the loop's final step.

**Terminology**
- The 7-step loop (memorize as a chain, each step catches what the prior can't): write template → define realistic `PreviewProps` → run `pnpm email dev` → eyeball desktop/mobile/dark → read plain-text view → test-send to 2 real inboxes (Gmail + Apple Mail) → wire into Server Action.
- "inner loop" / "the gate"; "three lenses" (desktop, mobile, dark); "live what-if" (props panel).
- Tooltips coined: file watcher, hot-reload, `prefers-color-scheme: dark`, color inversion, VML (re-tooltipped from lesson 1).
- Default port 3000 for both `pnpm dev` and `pnpm email dev`; override the email server with `--port 3001` (short `-p`). Preview server serves `emails/static/` at `/static/…`.

**Patterns and best practices**
- Keep the preview server running in a second terminal during any template work.
- Keep `PreviewProps` honest — shaped like the real production payload (real-length names/URLs), never `firstName: 'x'`.
- Mobile viewport check is non-negotiable before a template is "done"; the dark toggle only *emulates* client inversion (not authoritative) — confirm dark mode only via test-send.
- Test-send only counts if sent to inboxes you actually open in the real client; it spends real Resend quota — not for iteration.
- Move the email server (not the Next.js app) off port 3000 and document the chosen port in the README.

**Misc.** — All preview-UI figures are `{/* TODO */}` `<Screenshot>` placeholders (alt + caption specified) for a human to capture the real React Email 6 UI later. Loop `DiagramSequence` reuses lesson 1's render-pipeline visual grammar (horizontal lit/dimmed node strip) for cross-lesson consistency. Despite the outline saying "skip VideoCallout," the finished lesson embeds one (Cosden Solutions "React Email with Resend", `videoId="btZII7TXlhk"`, 24 min) in the Booting section as a full-workflow walkthrough — the resourcer found a usable current video.

---

## Lesson 3 — Readable in every client

**Taught** — Cross-client readability posture (one send, many renders): the `multipart/alternative` two-body model (text auto-derived by Resend SDK from the `react` node, opt out via `text`/`text: ''`); reading the generated plain-text for coherence and fixing defects in the JSX; the email a11y checklist (`lang`, `<Title>`, one `<h1>` = purpose, descriptive link text, decorative-vs-informational `alt`, 4.5:1/3:1 contrast, 14/16px font, 44×44 CTA, no meaning in color alone), each mapped to a `welcome.tsx` attribute; the three-tier dark-mode model (no transform / partial / full inversion), `color-scheme` `<Head>` plumbing + `@media (prefers-color-scheme: dark)` block, with `dir="auto"` named as the one-line i18n carry-over.

**Cut** — `<picture>` logo swap and the full dark-everything redesign named-not-built (project ships one brand-neutral logo); `[data-ogsc]`/`[data-ogsb]` Outlook-Android hacks, dark-mode background images dropped; the chapter-outline's `render({ plainText: true })` call site deliberately not taught (deprecated — see Misc.).

**Debts**
- `dir="auto"` is the only i18n done here; translated copy, ICU plurals, per-locale templates, `next-intl` all deferred to Unit 17 / Ch085.
- `<picture>` dark-logo swap named as the pattern to recognize, not built — a project that ships a non-neutral logo would need it.
- Reuses L1's `welcome.tsx`/`EmailLayout`/`emailTailwindConfig`, L1's `pixelBasedPreset` (why pixel sizes are predictable), L2's preview plain-text tab + dark toggle as inspection surfaces, and Ch048's `react`-prop send path.

**Terminology**
- `toPlainText(html)` — the manual/test utility (from `react-email`, run on `render()`'s HTML output) behind the preview's plain-text tab and unit tests; NOT a `plainText` flag on `render`.
- Three-tier dark-mode model: "no transformation" (Apple Mail macOS, recent Outlook) / "partial inversion" (Gmail iOS, Outlook iOS) / "full inversion" (Gmail Android some configs).
- Dark-mode `<Head>` plumbing: `<meta name="color-scheme" content="light dark" />`, `<meta name="supported-color-schemes" content="light dark" />`, inline `<style>` `:root { color-scheme: light dark; }`, plus `@media (prefers-color-scheme: dark)` block targeting class/`data-` selectors. Example swap classes used: `.cta`, `.logo-light`, `.logo-dark`.
- Tooltips coined: `multipart/alternative` (re), MIME (re), `toPlainText`, WCAG, touch target (44×44, iOS HIG), `prefers-color-scheme: dark` (re), color inversion (re), `<picture>`/`<source>` `media`, `color-scheme` meta, `dir="auto"`.

**Patterns and best practices**
- Never hand-maintain a parallel `text` field — it drifts; rely on the SDK-generated body (pass only `react`). Extends L1's "pass the node, don't pre-render."
- A bad plain-text version is a bug in the HTML JSX, fixed there — there is no separate text file.
- `alt=""` (empty, explicit) drops a decorative image from text/a11y tree; never strip an *informational* image's `alt` to quiet noisy text (blinds screen-reader users) — reword the HTML instead.
- The *light* template must pass WCAG contrast on its own; dark mode is a courtesy layer behind opt-in head plumbing, never the a11y/contrast strategy (most clients ignore the preference; some Gmail clients strip `<style>` so `@media`/`dark:` are enhancement-only).
- Transactional CTA touch target = 44×44 (primary action); do not surface the web app's 24×24 general-control minimum here. Contrast floors 4.5:1 text / 3:1 large match Code conventions.
- One `<h1>` states the message purpose, never the brand/logo (it's the screen reader's first nav target). Reach for `<Button>` for CTAs (its padding clears 44×44; hand-styled `<Link>` usually doesn't).
- For dark-mode media-query styles, keep `<Tailwind>` outermost (above `<Html>`/`<Head>`) — L1's artifact already does. `dark:` Tailwind variant now unlocked (L1 said "not yet") but narrower than the `@media` block — Apple Mail/recent Outlook only.

**Misc.** — Only `welcome.tsx` (and conceptually `EmailLayout`'s shared `<Head>`) changes; no new files. `<Html lang="en">` (already in L1) gains `dir="auto"`; new `<Head>` content is `<Title>Verify your email</Title>` + the dark-mode metas/`:root`/`@media` block. The deprecated `render(<T/>, { plainText: true })` from the chapter outline was corrected to the SDK-auto-generate + `toPlainText` reality (verified June 2026), consistent with L1/L2's continuity. No live coding (runtime can't load `react-email`); static `Code`/`AnnotatedCode`/`CodeVariants` + non-coding exercises (`MultipleChoice`, `Buckets`, `TrueFalse`). Client-render figures are `{/* TODO */}` placeholders per L2 convention. This is the chapter's last teaching lesson; a quiz (L4) follows.
