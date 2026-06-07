# The preview server loop

- Title (h1): The preview server loop
- Sidebar label: The preview server loop

---

## Lesson framing

Setup-and-mechanics lesson. The student already has a shippable `emails/welcome.tsx` from lesson 1 (typed props `firstName`/`verifyUrl`, default export `WelcomeEmail`, co-located `WelcomeEmail.PreviewProps`, `<Tailwind config={emailTailwindConfig}>`, `<EmailLayout>`, `<Preview>`). Lesson 1 closed by naming the open question this lesson answers: *you've read the template as code, but you haven't seen it — and Chrome lies to you about `flex` and dark mode, so where do you actually look?* This lesson is that answer: boot `pnpm email dev`, learn the inner loop, and learn where the loop ends (the test-send to a real inbox).

The senior frame to carry through every section: **the preview server is the iteration loop; the test-send is the verification gate.** These are two different tools for two different jobs, and conflating them is the failure mode the whole lesson guards against. The preview is fast and lets you catch most problems in a second-terminal save-and-eyeball cycle; it is *not* authoritative for the things real mail clients do unpredictably (dark-mode inversion, Outlook VML). The lesson's spine is the canonical end-to-end loop (write → PreviewProps → run dev → eyeball desktop/mobile/dark → read plain-text → test-send → wire into the Server Action), and each step exists because the previous step has a failure mode it can't catch. That "each step catches what the last one missed" structure is the lesson's pedagogical engine — teach it as a chain, not a checklist.

Pedagogical decisions that apply lesson-wide:
- **This is a workflow lesson, not a syntax lesson.** The "code" the student writes is one `package.json` script line and one CLI flag. The substance is the *loop* and the *judgment* (what each preview affordance does and does not prove). So the dominant teaching vehicles are screenshots of the actual preview UI (annotated), a scrubbable `DiagramSequence` of the loop, and a `Sequence` ordering exercise — not code blocks.
- **No live coding.** Per continuity notes and the `ReactCoding`/Sandpack memory, the React sandbox can't load `react-email`, and there's no runtime that boots a CLI dev server in-page anyway. Do not propose a live-coding exercise. Interactivity comes from the `DiagramSequence`, the `Sequence` drill, an `MultipleChoice`, and a `TrueFalse` round on the preview-vs-test distinction.
- **Lean on what lesson 1 built.** Every example uses the existing `welcome.tsx`. Do not introduce a new template. The `PreviewProps` shape (`{ firstName: 'Ada', verifyUrl: 'https://yourapp.com/verify/abc123' }`) is the contract already shipped — reuse it verbatim.
- **Screenshots are placeholders.** The author cannot capture the real React Email 6 preview UI. Every screenshot is specified as a `{/* TODO */}` block describing exactly what the capture must show and its `alt` text, stored under `public/screenshots/049/`, for a human to fill later. Describe each capture precisely so the human knows what to grab. Do not invent pixel-perfect UI claims beyond what's described.
- **Cognitive-load order:** start with the single command (instant payoff — they see their lesson-1 template rendered), then layer the affordances one at a time (props editing → viewport → dark → HTML/plain-text tabs), then the test-send (the gate), then assemble the whole loop, then the port-clash operational footnote. Simple-first, complexity added gradually.
- **Version grounding (verified June 2026):** React Email 6.0 (April 2026), `react-email` package 6.x; the CLI binary is `email`, shipped by the `react-email` package; `email dev` default port 3000, override with `--port 3001` (also `-p`); the preview server's UI lives in `@react-email/ui` (v6), which `react-email` does NOT pull in transitively — ship it as an explicit devDep (`pnpm add -D @react-email/ui`) or the first `email dev` run blocks on an interactive install prompt (and hangs in CI). The student adds the devDep once, then runs the `email` CLI. Dark-mode switcher landed in preview-server 5.0 (Nov 2025) and explicitly "emulates email client color inversion." Mobile-viewport view since 2.0. HTML code view + plain-text view + Send-test button all present. File watching / hot reload present. The preview server also serves `emails/static/` at `/static/...` — a real detail worth one mention (ties back to lesson 1's image-hosting rule). Do not re-teach lesson 1's import surface; if the topic of `@react-email/components` vs unified `react-email` imports comes up, leave it — lesson 1 settled it.

---

## Lesson sections

### Introduction (no heading)

Open by collecting the debt lesson 1 left: the student has `welcome.tsx` on disk, read it as code, and has three unanswered questions — does the heading wrap badly at 600px, is the button readable in dark mode, is the preheader what they meant? State the senior framing plainly: the only place those answers are *real* is the inbox, but you don't want to send-from-staging-and-refresh-Gmail forty times to find out. So there are two tools — a fast local preview loop for iterating, and a test-send for final cross-client confirmation — and this lesson installs both and, crucially, teaches when each one is trustworthy. Preview the end state: by the lesson's close they'll have a `pnpm email dev` script, a running preview server, and a repeatable loop they run on every template before it ships. Warm, brief, connects directly to the lesson-1 cliffhanger.

Name the anti-pattern explicitly here as the pain the loop relieves: the "send from staging, alt-tab to Gmail, refresh, squint, repeat" cycle — slow, pollutes a real inbox, burns send quota, and still only shows you one client. The preview server collapses that minutes-long loop into a sub-second one for the 90% of problems that don't need a real client.

### Booting the preview server

The instant-payoff section. Teach the two-step setup with `<Steps>`:
1. Add the script to `package.json` — `"email": "email"` in the `scripts` block. One short `Code` block (json) showing just the `scripts` fragment with the new line. State plainly: the `react-email` package ships the `email` CLI binary; this script just exposes its `dev`/`build`/`export` subcommands through `pnpm email …`.
2. Run `pnpm email dev`. State what happens: it boots a local server (default `http://localhost:3000`), scans the `emails/` directory, lists every template in a left panel, and renders the selected one using its `PreviewProps`. Because the student already has `welcome.tsx` with `PreviewProps` from lesson 1, this is the moment they *see* their template render — call that out as the payoff.

Then the senior reflex, stated once and reinforced later: **keep this running in a second terminal during any template work.** The whole value is the file-watcher — save a `.tsx`, the preview hot-reloads, you eyeball, you fix. The loop is "save, alt-tab, eyeball, fix," measured in seconds.

Screenshot here: `{/* TODO */}` — a `<Screenshot viewport="desktop">` inside a `<Figure>` showing the React Email 6 preview server with the left-hand template list (showing `welcome.tsx`) and the main panel rendering the welcome email with its mock `firstName: 'Ada'`. Caption: ties the rendered output back to the lesson-1 `PreviewProps`. Specify the alt text describing the two-pane layout. Note to the human capturer: this is the canonical "preview server, default state" shot reused conceptually throughout the lesson.

`Term` candidates in this section: `pnpm` (briefly — package-manager-running-a-script, if not already saturated earlier in the course; use judgment, likely skip as over-taught), file watcher / hot reload (one short tooltip if the term feels assumed). Keep tooltips minimal — this is a known-audience workflow lesson.

Tie-back: explicitly remind that `PreviewProps` (lesson 1) is *why* the server can render anything at all — no mock data, nothing to show. This is the bridge concept between the two lessons and worth one sentence.

### Editing props live

Short section, high value. The preview server reads the template's `PreviewProps` and surfaces each field as an editable control in the UI. Teach the senior use: don't just look at the happy path with `firstName: 'Ada'` — stress-test the layout *through the props panel*, which is faster than re-running the app's Server Action with different inputs. Concrete stress cases to name (these are the realistic failure modes):
- Swap `firstName` for a long string ("Maximilian-Alexander") to see whether the heading wraps cleanly or overflows.
- Swap `verifyUrl` for a very long URL to see whether the `<Button>` (or a bare link) overflows the column.
- Try an empty-ish or edge value to see the template's behavior with sparse data.

The teaching point: `PreviewProps` is the template's mock-data contract, and the preview panel turns it into a live what-if surface. State the watch-out inline: keep `PreviewProps` honest — realistic values shaped like the real production payload, not `firstName: 'x'`. A `PreviewProps` that doesn't resemble the real send teaches you nothing about the real send. (This is the "stale PreviewProps" watch-out from the outline, taught at the moment it's relevant rather than bundled.)

Screenshot: `{/* TODO */}` — `<Screenshot viewport="desktop">` showing the props-editing panel with `firstName` mid-edit to a long value and the heading visibly reflowing in the preview. Caption frames it as "the props panel is a live what-if." Specify alt text.

No exercise here — the concept is small and the live demo (screenshot) carries it.

### Desktop, mobile, and dark mode

The three preview switches, taught as three lenses on the same template. Group the screenshots with `TabbedContent` (three tabs: Desktop / Mobile / Dark) so the student sees the same `welcome.tsx` under each lens without three stacked figures — this is exactly the "alternatives of the same idea" case `TabbedContent` is for.

**Viewport (desktop / mobile).** The preview chrome has a desktop/mobile viewport toggle. Teach mobile as non-negotiable in the loop: most consumer mail is opened on mobile, and a template that wraps cleanly at 600px desktop can stack illegibly at ~375px. The senior call: always check mobile before declaring a template done. (Cite the "majority of email opens are mobile" stat directionally — phrase as "the majority of consumer email opens happen on phones" without pinning a precise percentage to a specific year, to stay durable. If a number is used, attribute it loosely to recent Litmus/email-client surveys.)

**Dark mode.** The preview chrome has a dark-mode switcher that renders the template under `prefers-color-scheme: dark`. Here is the most important judgment call in the lesson, so give it weight: **this toggle approximates `prefers-color-scheme: dark`, but it is not authoritative.** Real clients do their own thing — Apple Mail and Gmail Android each apply color-inversion heuristics the preview can't reproduce. The product docs themselves describe the switcher as *emulating* client inversion. So the correct mental model: use the dark toggle to catch *obviously* broken cases (a near-white logo vanishing on an inverted near-white background), but treat dark mode as confirmed only after a real test-send. This sets up the test-send section and seeds the lesson's central preview-vs-gate distinction. Do not teach how to *build* dark-mode styles here — that's lesson 3; this section is strictly "what the toggle shows and how much to trust it."

`Term` candidates: `prefers-color-scheme` (one tooltip — the CSS media feature for the user's light/dark OS preference), and a one-line tooltip for "color inversion" if it reads as jargon.

Screenshots (in `TabbedContent`): three `{/* TODO */}` `<Screenshot>` captures of `welcome.tsx` — desktop (`viewport="desktop"`), mobile (`viewport="mobile"`), and dark (`viewport="desktop"`, dark toggle on). Per-tab captions: desktop = the baseline; mobile = "check the stack at 375px"; dark = "approximate only — the toggle emulates inversion, the real client decides." Specify alt text for each. Note to human: the dark capture must show the preview server's own dark toggle engaged, not the OS theme of the browser chrome.

### Reading the HTML and plain-text views

The preview UI exposes a view of the rendered output beyond the visual preview: an HTML/code view and a plain-text view. Teach what each is *for* in the loop:

- **HTML view** shows the literal markup that goes on the wire. The senior uses it to confirm the things you can't see in the visual render: that the `<Tailwind>` classes actually compiled to inline styles (lesson 1's pipeline made concrete — you can *see* `class="..."` became `style="..."`), that the `<Preview>` hidden preheader text is present in the document, and that the `<head>` carries what it should. Frame it as the "is the pipeline doing what lesson 1 promised" inspection point.
- **Plain-text view** shows the auto-derived text part (the one the Resend SDK generates from the React node — lesson 1 established it ships free). The senior reflex: actually *read* this, and confirm it's a coherent standalone message, not just "the HTML with tags stripped." Name the audience it serves (screen readers, HTML-stripping clients, the Gmail-clip fallback) but keep it light — **lesson 3 owns the plain-text discipline and the accessibility checklist.** This section's job is only "the tab exists, here's what to glance at." Be explicit in the outline that this section must *not* drift into teaching `render({ plainText: true })` or the coherence-check criteria — that's lesson 3's territory; here we name the tab and hand off.

Screenshot: `{/* TODO */}` — a `<Screenshot viewport="desktop">` (or a 2-tab `TabbedContent`: HTML view / Plain-text view) showing the welcome email's HTML output (with a visible inlined `style="..."` and the `<Preview>` text) and its plain-text output. Caption frames the HTML view as "see the pipeline's output" and the plain-text view as "lesson 3 teaches what to read for." Specify alt text.

Brief mention (one sentence, optional): the preview server also serves files dropped in `emails/static/` at `/static/...`, so a logo can be previewed locally without hosting it first — but lesson 1's rule still stands for *production* (host at a real HTTPS URL; `emails/static/` is a dev convenience, not a send-time CDN). Include only if it doesn't bloat the section; it's a genuine connect-back to lesson 1's image rule.

### The test-send is the gate

The verification half of the lesson. The preview UI has a "Send" button that fires a real email through Resend (using the same `RESEND_API_KEY` the app uses) to an address the developer types in. Teach this as the **verification gate**, distinct in purpose from the iteration loop:

- The loop (preview server) is where you *iterate* — fast, local, catches layout and content problems.
- The test-send is where you *verify* — slow, real, the only way to see what an actual client does with your message.

The canonical practice: render the template, then test-send to a spread of real accounts you actually open — a personal Gmail, an iCloud/Apple Mail, an Outlook.com, a Proton — and eyeball each in the real client. This is the only way to catch what the preview's dark toggle can't (Gmail Android's blanket inversion, Outlook's VML button rendering). State the gate rule crisply: **the preview server is the inner loop; the test-send is the gate the template passes before it's wired into a Server Action and shipped.**

Watch-outs, inline at the point they bite:
- Test-send only works if the destination inbox is one you *actively open in the real client* — sending to a dead address or a webmail you never check proves nothing.
- The test-send uses your real Resend key and real send quota — it's a real send, treat it as one (don't spam-test a hundred times; the loop is for iteration, the test-send is for the final check).

Screenshot: `{/* TODO */}` — `<Screenshot viewport="desktop">` of the preview server's Send dialog (recipient field + Send button). Caption: "the gate — a real send through Resend to an inbox you actually read." Specify alt text.

`Term` candidate: VML (one tooltip — already coined in lesson 1; re-tooltip here since it appears in a different lesson and the student may have forgotten; Vector Markup Language, the legacy Outlook button-rendering path).

Exercise — `TrueFalse` round (this section or right after, since it tests the central distinction the lesson is built on). Statements probing preview-vs-gate judgment, e.g.:
- "If the dark-mode toggle in the preview looks correct, the email is confirmed correct in dark mode on every client." (false)
- "The preview server's file-watcher hot-reloads the template when you save, so you don't restart it per change." (true)
- "A test-send to an inbox you never open still verifies cross-client rendering." (false)
- "The preview server is the fast iteration loop; the test-send is the final verification gate." (true)
- "`flex` layout that renders fine in the preview will render fine in Gmail." (false — connects back to lesson 1's flex trap, reinforcing that the preview's Chrome renderer lies)
Keep ~4–5 statements, each mapping to a watch-out or the core distinction.

### The loop, end to end

The synthesis section — the spine of the lesson made explicit. Present the canonical loop as an ordered, scrubbable sequence, then drill it.

Teach the loop as a chain where each step catches a failure the previous step can't:
1. Write the template in `emails/welcome.tsx`.
2. Define realistic `PreviewProps` (lesson 1 — restate as step, don't re-teach).
3. Run `pnpm email dev` in a side terminal.
4. Save → eyeball desktop → toggle mobile → toggle dark.
5. Read the plain-text view, confirm it's coherent.
6. Test-send to two real inboxes (one Gmail, one Apple Mail) for cross-client confidence.
7. Wire into the Server Action via `sendEmail({ react: <WelcomeEmail … /> })` (lesson 1's wrapper / Ch048's `sendEmail`).

Vehicle: a `DiagramSequence` (do NOT wrap in `<Figure>`) with one `DiagramStep` per loop stage. Each step shows the loop as a simple horizontal strip of labeled nodes with the current stage lit and the rest dimmed (same visual grammar as lesson 1's render-pipeline `DiagramSequence`, for cross-lesson consistency). Each step's caption states *what this step catches that the previous didn't* — that's the pedagogical payload. Spell out per-step captions in the outline so the diagram agent has the exact "catches what the last missed" framing:
- Write template — "the starting point: code on disk, unseen."
- PreviewProps — "without realistic mock data the preview has nothing to render; this is what makes the rest of the loop possible."
- Run dev server — "turns code-on-disk into something you can look at, and watches for saves."
- Eyeball desktop/mobile/dark — "catches layout: the 600px wrap, the 375px stack, the obviously-broken dark case."
- Read plain-text — "catches the text-part incoherence the visual render hides."
- Test-send — "catches what the preview can't fake: real client inversion and Outlook quirks."
- Wire into Server Action — "the template, now verified, goes live behind real props."

Keep nodes small, whole figure under the height cap.

Exercise — `Sequence` ordering drill immediately after, so the student reconstructs the loop from memory. Reuse the seven steps as draggable `<Step>`s (source order = correct order). Custom `instructions`: "Order the steps of the template iteration loop, from writing the template to shipping it." This is the right exercise type because the lesson's core skill *is* the ordering/sequence of the workflow — reconstructing it is the assessment. (Per memory, no live coding is possible here; the `Sequence` drill is the best available active-recall check for a workflow.)

### When two dev servers want the same port

Short operational footnote, last because it's a gotcha, not a concept. Both `pnpm dev` (Next.js) and `pnpm email dev` (React Email) default to port 3000. Teach the fix and the senior habit:
- Override one: `pnpm email dev --port 3001` is the standard (the email server is the one to move, since the app's URLs are baked into more config). Mention `-p` as the short flag.
- Both servers run side-by-side fine — the email server is independent of the Next.js app.
- Document the port choice in the project README so a teammate (or the student in three weeks) doesn't hit the clash cold.

One short `Code` block (bash) showing `pnpm email dev --port 3001`.

`Aside` (tip) is appropriate here for the README-documentation habit, since it qualifies the port fix rather than being a standalone concept — but keep it attached to this section, not floated to the end.

### Recap

Bulleted durable takeaways:
- `pnpm email dev` boots the preview server: a left-panel template list, a live render driven by `PreviewProps`, and a file-watcher that hot-reloads on save — keep it in a second terminal.
- The props panel turns `PreviewProps` into a live what-if surface — stress-test long names and long URLs there; keep `PreviewProps` shaped like the real payload.
- The viewport toggle's mobile view is non-negotiable; the dark-mode toggle *approximates* inversion and is not authoritative.
- The HTML view shows the pipeline's inlined output; the plain-text view shows the auto-derived text part (lesson 3 teaches what to read for).
- The preview server is the iteration loop; the **test-send is the verification gate** — send to real inboxes you actually open before wiring the template into a Server Action.
- Move one dev server off port 3000 (`--port 3001`) and document it.

### External resources

One or two `ExternalResource` cards:
- React Email — CLI / preview server docs (`https://react.email/docs/cli`). Description: the dev command, the script setup, and the preview-server affordances this lesson walked.
- Optionally React Email 6 announcement (`https://resend.com/blog/react-email-6`) for the current preview-server feature set — only if it adds value beyond the CLI doc.

(Skip `VideoCallout` — no high-signal, durable, recent video on the React Email *preview server workflow specifically* is worth embedding; the UI changes release-to-release and a video would age badly. If the resourcer later finds a current official walkthrough, this section can take a `VideoCallout`, but do not block on it.)

---

## Scope

**Prerequisites to restate concisely (taught in lesson 1 / Ch048 — do NOT re-teach):**
- The `emails/welcome.tsx` artifact and its shape (props `firstName`/`verifyUrl`, default export, `PreviewProps`, `<Tailwind config={emailTailwindConfig}>`, `<EmailLayout>`, `<Preview>`). Reference it; don't rebuild it.
- `PreviewProps` as co-located mock data — lesson 1 defined it; this lesson shows the *preview server consuming it*. Restate in one sentence as the bridge, no more.
- The render pipeline (JSX → inline-styled HTML, SDK auto-derives plain-text). Reference when explaining the HTML/plain-text views; don't re-derive.
- The `flex`/`grid` trap and "the preview's Chrome renderer lies." Reuse as reinforcement (it's *the* reason the test-send exists), but the concept itself is lesson 1's.
- `sendEmail` wrapper taking a `react` node (Ch048). Named only as the loop's final step.

**This lesson does NOT cover:**
- The component vocabulary, `<Tailwind>` component, brand-token config — lesson 1.
- Plain-text generation as a *feature* (`render({ plainText: true })`), the text-coherence check criteria, the accessibility checklist, and the dark-mode *implementation* (head meta plumbing, `@media (prefers-color-scheme: dark)`, `dark:` variant, `<picture>` logo swap) — all lesson 3. This lesson names the plain-text/dark *preview affordances* and stops; it teaches what the toggles/views *show*, never how to *build* the underlying behavior.
- CI snapshot-testing of rendered output (`renderToStaticMarkup` + `toMatchSnapshot`) — outline names it as a senior reach "once, in passing" but it is not part of the project chapter; CUT it from this lesson to protect the workflow focus, or mention in a single sentence at most in the test-send/loop section if it earns its place. Default: cut.
- Cross-client testing services (Litmus, Email on Acid) full screenshot matrices — name once at most as "the marketing-heavy-product reach beyond a manual test-send," then drop.
- The Resend dashboard's sent-email "Preview" view — adjacent capability, not the loop; do not cover.
- Sender identity, SPF/DKIM/DMARC, suppressions — Ch048, settled.
- BIMI / inbox brand mark — out of scope chapter-wide.

---

## Notes for downstream agents

- **Screenshots are the dominant visual and all are placeholders.** Every preview-UI claim must be backed by a `{/* TODO */}` `<Screenshot>` spec, not invented rendering. The human curator captures the real React Email 6 preview server later. Write alt text and captions now; specify what each capture must show.
- **No live coding** (`ReactCoding`/Sandpack can't load `react-email`, and no in-page runtime boots a CLI). Active recall comes from the `Sequence` drill, `TrueFalse`, and `MultipleChoice`.
- **Reuse lesson-1 artifacts verbatim** — `welcome.tsx`, its `PreviewProps`, `sendEmail`. Introduce no new template.
- **Hold the preview/gate line everywhere** — it's the lesson's spine. Every section either teaches the loop or teaches the gate; the dark-mode and test-send sections must reinforce the distinction explicitly.
- **Do not drift into lesson 3** — when plain-text or dark mode comes up, name the *preview affordance* and hand off. The temptation is strong in "Reading the HTML and plain-text views" and "Desktop, mobile, and dark mode"; resist it.
- **Code blocks are minimal** — `package.json` script fragment (json), `pnpm email dev --port 3001` (bash). That's essentially all the code. Use plain `Code`; no `AnnotatedCode`/`CodeVariants` needed (nothing complex enough to warrant them).
- **Diagram consistency** — the loop `DiagramSequence` should echo lesson 1's render-pipeline `DiagramSequence` visual grammar (horizontal lit/dimmed node strip) for cross-lesson coherence.
