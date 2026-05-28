# Lesson 3 outline — DevTools: the four panels that earn their keep

## Lesson title

- **Title (h1):** DevTools: the four panels that earn their keep
- **Sidebar label:** DevTools tour

The chapter-outline title is sharp and signals the editorial filter ("the four that *earn their keep*" — survey-with-a-stance, not encyclopaedia). Keep verbatim.

---

## Lesson framing — conclusions from brainstorm

**Target student.** Junior coming straight from lessons 1 and 2 — the network spine (URL → first byte) and browser pipeline (first byte → pixels) are mapped. They have already opened the Network panel mid-lesson 1 and seen the Protocol column and Timing breakdown. This lesson takes them on a tour of the other three panels they will live in for the rest of the course, and pre-installs React DevTools so Unit 3 doesn't have to.

**What this lesson is.** A **reference / survey** with a strong "reach for it when" backbone. Not a manual; not deep mastery of any one panel. The student finishes able to (a) name which of four panels answers each of four senior questions — *what's actually rendered? what did the server send back? what does the page think it knows? what's in storage right now?*; (b) recognise the senior moves inside each panel (preserve log, disable cache, throttle, copy as fetch, `$0`, `console.table`, "Clear site data"); (c) recall the deferred panels (Performance / Lighthouse / Sources) and *why* they're deferred so the absence is principled, not gap-filled later.

**The senior framing carried forward.** Lessons 1–2 ended on "a slow page load is a *stage* problem — name the stage." This lesson closes the feedback loop: the browser surfaces *where* you read each stage. The network waterfall reads stages 1–4; the Elements live DOM and Computed styles read what stages 4–6 of the rendering pipeline produced; the Application panel reads the state the page persists across requests; the Console reads the live JS world. DevTools is the engineer's stethoscope; the lesson is which patch to put it on.

**Pedagogical levers.**
- **Reference archetype, not concept.** Four sibling sections, one per panel, all the same shape — *what it is*, *senior moves*, *one small worked beat*. Uniform geometry reduces cognitive load; the student can skim and revisit.
- **Geography matters.** Each panel section needs a labelled visual (annotated screenshot inside `<Screenshot>` and `<Figure>`, or a hand-coded SVG/HTML mock if a clean capture is hard). The mental map is half the lesson — a junior who knows *where* the throttle dropdown lives finds it the first time.
- **One panel-specific worked beat per section, not a deep tutorial.** A short ordered list of moves the student can replicate against any open page. Avoids "list every button" — names the moves a senior actually uses.
- **Defaults before conditionals.** Chromium DevTools is the default (it ships the deepest DevTools and React DevTools lands cleanly). Firefox and Safari named in one line for cross-browser sanity and iOS work; not detoured.
- **Trigger before tool.** Each panel is introduced by the senior *question* it answers, not by a feature list. "What did the server actually send back?" → Network. "Why isn't this rule applying?" → Elements. "What does `localStorage` think it has?" → Application. "What does the page evaluate `user.email` to right now?" → Console.
- **No AI naming.** Per project filter, do not mention DevTools' AI panels or Console Insights as a default. The chapter outline explicitly dismisses them; carry that.
- **Cognitive load.** Open with a one-paragraph senior frame (DevTools is the feedback half of the loop, four panels carry the SaaS weight). Walk the four. Close with a recall drill (`Matching` scenarios → panels) plus an optional `SandboxCallout` for hands-on confirmation.
- **No bootcamp scaffolding.** No "what is a browser." Adult tone. The student has *opened* DevTools — what they haven't done is *use it like a senior*.

**Common beginner traps to defuse.**
- **Confusing Elements with View Source.** Elements is the live DOM after JS has mutated it; View Source is the original HTML the server returned. The two often disagree on a React app — that's the *expected* result, not a bug.
- **Opening Network after the action fired.** Network only captures requests *while it's open*. The senior reflex: open the panel first, then trigger. Pair with **Preserve log** so navigation doesn't wipe the trace.
- **Forgetting Disable cache** when DevTools is open. The cached request returns instantly, the student concludes the change worked, but the next user (cold cache) sees the old behaviour.
- **Trying to read a redirect's payload.** Without Preserve log, the redirect's response is gone before you can click it. Senior fix: turn on Preserve log on day one.
- **`console.log`-ing an array of objects.** The output is a single-line `[Object, Object, Object, ...]` that requires expanding each. `console.table()` renders a real table.
- **Hovering an element to inspect its `:hover` state.** Hovering off the element kills the state. Senior fix: toggle pseudo-states explicitly via the `:hov` button in the Styles pane.
- **Reading "the cookie is set" without checking SameSite/Secure.** A cookie can be in the jar but rejected for cross-site sending. The Application panel shows the full attribute set; the eye trained to skim past them misses the bug.
- **Treating "Clear site data" as nuclear and avoiding it.** The senior nuke is exactly the right move when "it works in incognito" surfaces; teaching them to reach for it is the lesson.

**Forward links named once each, never elaborated:**
- Performance panel and Core Web Vitals → Unit 19.
- Lighthouse audits → Unit 19.
- Sources / debugger / breakpoints → no dedicated lesson; the course's day-to-day is Server Components and Server Actions where the debugger lives in the Node process. Named in one dismissive line.
- React DevTools' Components panel and Profiler at depth → chapter 023 (Unit 3) and revisited in Unit 19.
- Tailwind cascade reading in the Styles pane → chapter 019.
- Cookies / `Secure` / `SameSite` semantics → chapter 013.
- Local Storage vs. Session Storage usage patterns → Unit 10 (URL state list project) and Unit 15.
- Device Mode usage → chapter 021 (responsive Tailwind).
- IndexedDB / Service Workers / Cache Storage → named as panel placement only; not on this stack's daily path.

**Out-of-scope, no application code.** No React, no `fetch` examples beyond the trivial `copy(value)` and `console.table(arr)` lines. The lesson is browser-shaped, not editor-shaped. The optional sandbox at the end is a tiny prebuilt HTML page the student debugs *using DevTools only*.

**Estimated student time:** 35–40 minutes.

---

## Lesson sections

The lesson opens with an introduction (no h2), pre-installs React DevTools, then walks the four panels in the senior-question order (Elements → Network → Console → Application). Two short forward-link beats (deferred panels; Device Mode) follow. Close with the recall drill and the optional sandbox.

Flow:

1. Introduction — the feedback loop framing; four panels.
2. Browser and extension setup — Chromium default; install React DevTools.
3. Elements — what's actually rendered? (live DOM, cascade, pseudo-state toggles, edit-live.)
4. Network — what did the server send back? (open-before-action, preserve log, disable cache, throttle, copy-as-fetch.)
5. Console — what does the page think it knows? (`$0`, `console.table`, `console.dir`, `console.trace`, `copy()`.)
6. Application — what's in storage right now? (Cookies, Local/Session Storage, IndexedDB and SW named, "Clear site data".)
7. The panels deferred on purpose — Performance, Lighthouse, Sources, Memory, Recorder, Security; Device Mode named once.
8. Closing recall drill — `Matching` of scenarios to panels.
9. Optional — `SandboxCallout` with a deliberately-broken page.
10. What stays out — forward links named once.

### Introduction (no header)

Three short beats:

1. **The carry-over.** Lesson 1 named the Network panel as the read-out surface for the four wire stages. Lesson 2 mapped the browser pipeline that turns bytes into pixels. This lesson is the rest of DevTools — the panels the student will live in for the rest of Unit 2, Unit 3, and beyond. DevTools is the **feedback half** of every loop the engineer runs; the panels carry which loop.
2. **The four panels that earn their keep on SaaS.** Elements (live DOM and the cascade), Network (every request, headers, payload, response, timing), Console (live JS REPL inside the page), Application (cookies and storage and service workers). Four senior questions, four panels — and a fifth (Performance/Lighthouse) deliberately deferred because measuring performance on an empty page is theatre.
3. **What walks out.** Not mastery of any one panel — recall of which panel answers which question, plus the senior moves inside each. The student should leave able to skim a bug report and reach the right panel without thinking.

End with a one-line directive: "Have any site open in a Chromium tab with DevTools docked. We'll switch panels mid-lesson."

### Browser and extension setup

A short, action-oriented section. The chapter outline is explicit: "React DevTools as the one extension worth installing alongside" and "Installed here so it never has to be again."

**Structure:**

- **Chromium DevTools as the default.** One paragraph. Chrome, Edge, Arc, Brave — anything Chromium-based — ships the deepest DevTools surface. React DevTools lands here cleanly. Firefox DevTools is the cross-browser sanity check (one line); Safari DevTools is the iOS-specific tool the course returns to in Unit 20 (one line). The course teaches against Chromium DevTools.
- **React DevTools install.** A `<Steps>` block with three steps:
  1. Open the [React Developer Tools listing on the Chrome Web Store](https://chromewebstore.google.com/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi) and click *Add to Chrome*.
  2. Verify by opening any page that uses React (e.g. `react.dev`) with DevTools open — the **Components** and **Profiler** tabs should appear in the DevTools tab strip.
  3. (Firefox users) install the same extension from the Firefox Add-ons store. Same UI, cross-browser.
- **One-paragraph deferred mention.** The two tabs will be used the moment Unit 3 writes its first component (chapter 023's render-tree drill, then Profiler again in Unit 19). No mechanics here — installation only.
- Use `<ExternalResource>` for the React DevTools listing in the inline link, *or* a `<CardGrid>` with two `<ExternalResource>` cards if both Chrome and Firefox listings are linked. The latter is tidier.

### Elements — what's actually rendered?

**Framing paragraph.** One paragraph. The Elements panel shows the **live DOM** — the in-memory tree as it stands right now, after every JS mutation. Not the source HTML the server returned (use View Source for that, named in one parenthetical). On a React app, the two will routinely disagree, and that disagreement is the *expected* mechanics — not a bug. The right pane shows the cascade for the currently-selected element: every rule that targeted it, in cascade order, with overridden rules struck through. This is *how* a senior reads the cascade in practice; the cascade itself is taught in chapter 019.

**Annotated visual.** Place after the framing paragraph. Use `<Screenshot viewport="desktop">` inside `<Figure>` with a captured Chromium Elements panel against any well-styled site (e.g. `react.dev` or the course site itself). Annotate the four load-bearing regions with overlaid labels (or call them out in the caption + a numbered list under the figure):

1. The DOM tree (left).
2. The Styles pane with cascade-ordered rules and struck-through overrides (right).
3. The Computed tab (right pane sibling).
4. The `:hov` button for pseudo-state toggles (small button atop the Styles pane).

Store the capture at `public/screenshots/010/03-elements-panel.png`. Caption: "Elements panel — live DOM on the left, the rules cascade on the right. Struck-through rules lost the cascade; the Computed tab is the resolved final value."

**Senior moves.** A short ordered list (not `<Steps>` — these are reference moves, not a procedure):

- **Inspect to find.** `Cmd/Ctrl + Shift + C` toggles the inspector cursor. Click any pixel on the page; the corresponding DOM node lights up. The senior reflex when a user says "this thing isn't styled right" — start here.
- **Read the cascade in the Styles pane.** Rules are listed top-down by *cascade winner*; overridden rules are struck through. The struck-through line tells you *why* your rule didn't apply — usually specificity or order. The Tailwind layer ordering Unit 3 will teach is read here.
- **Edit styles live (no reload).** Click any rule's value to edit it in place. The page updates as you type. The senior rule: "if it works in DevTools, it'll work in the code" — make the change here first, then go write it.
- **Toggle pseudo-states explicitly.** Click `:hov` to force `:hover`, `:focus-visible`, `:active`, or `:focus-within` on the selected element. The student's instinct is to hover the element; that kills the hover state as soon as they move to the panel. Forced toggles are the senior move.
- **Computed tab for the final value.** When the cascade gets dense, the Computed tab shows the single resolved value the browser ended up using, plus which selector won. Use this when the question is "what *is* the colour, regardless of why."

Use `<Term definition="The browser's tree of typed element nodes as it stands right now — including every change React or any other JS has applied since the page loaded. Different from the source HTML the server returned.">live DOM</Term>` and `<Term definition="The colon-prefixed states an element can be in — :hover, :focus, :active, :focus-visible, :focus-within. Toggling them in DevTools forces the state without needing the mouse or keyboard interaction.">pseudo-states</Term>` on first use.

**One small worked beat.** A short paragraph the student can replicate immediately: "Open this page in a new tab, inspect any button. In the Styles pane, click `:hov` and toggle `:hover`. Watch the styles change. Now edit the `background-color` value directly — say, to `red`. The button updates with no reload. That's the dev loop tightened from minutes to milliseconds."

### Network — what did the server send back?

**Framing paragraph.** One paragraph. The Network panel logs every request the page makes — Document, Fetch/XHR, JS, CSS, Images, Fonts, WebSockets — and surfaces each as a row with timing, headers, payload, and response. Lesson 1 used the Protocol column and Timing breakdown; this section is the rest of the panel a senior actually uses.

**Annotated visual.** `<Screenshot viewport="desktop">` of the Network panel with the toolbar visible, four regions labelled:

1. The **Preserve log** and **Disable cache** checkboxes in the toolbar.
2. The **Throttling** dropdown (defaults to "No throttling"; presets are "Fast 4G", "Slow 4G", "3G", "Offline").
3. The request-type filter chips (All / Fetch&XHR / JS / CSS / Img / Media / Font / Doc / WS / Wasm / Other).
4. The right-pane request detail with its tabs (Headers / Payload / Preview / Response / Initiator / Timing / Cookies).

Store at `public/screenshots/010/03-network-panel.png`. Caption: "Network panel — every request, every header, every payload. The toolbar checkboxes and the right-pane tabs carry the senior workflow."

**Senior moves.** A short ordered list:

- **Open before the action.** Network only captures while the panel is open. The senior reflex: open the panel, then click the button that triggers the request. "Open afterwards" misses the request entirely.
- **Preserve log on.** Without it, a redirect or full-page navigation wipes the request that caused it. Turn it on as a permanent default in your DevTools settings.
- **Disable cache while DevTools is open.** Tick it. Otherwise the cached request returns in 1ms and you'll think your change worked when it didn't.
- **Throttle to "Slow 4G" or "3G" when testing loading states.** The 2026 throttle presets are "Fast 4G", "Slow 4G", "3G", and "Offline". The senior reflex for "this looks fine on localhost" — flip to "Slow 4G" and watch the skeletons. Mention in one line that *per-request* throttling (right-click a row → "Override request → Throttle") shipped in late 2025.
- **Filter by type to drop the noise.** Doc shows just the page navigation requests; Fetch/XHR shows the application API calls. Most SaaS debugging happens in Fetch/XHR.
- **Read the right pane in this order:** Headers (auth, content type, status), Payload (what the client sent), Response (what the server sent back, with a Preview tab for JSON pretty-print), Timing (where the time went — folded onto lesson 1's diagram).
- **Right-click → Copy → Copy as fetch / Copy as cURL.** This is the move that turns a captured request into a debuggable reproduction. Paste into a terminal or a `fetch()` call and the request runs exactly as the browser sent it. Foreshadow chapter 015 (Fetch chapter).

Use `<Term definition="The DevTools throttle simulates a slower network connection from the browser side. 2026 presets: Fast 4G (≈9 Mbps down, 40ms RTT), Slow 4G (≈3 Mbps, 150ms RTT), 3G (≈400 Kbps, 400ms RTT), Offline (no network).">throttling</Term>` on first use.

**One small worked beat.** "Open the Network panel on this page. Tick Preserve log and Disable cache. Reload. Right-click the document request row → Copy → Copy as fetch. Paste into the Console (`$_` if you want to evaluate). The browser request just became a JavaScript reproduction you can edit and re-run."

### Console — what does the page think it knows?

**Framing paragraph.** One paragraph. The Console is a REPL inside the running page. Anything in the global scope is reachable; anything you `console.log` from anywhere lands here; anything you type runs in the page's own JS context. It is also the most under-used senior tool in DevTools — most juniors call `console.log()` and stop there.

**Annotated visual.** `<Screenshot viewport="desktop">` of the Console with three regions labelled: the log-level filter (Verbose / Info / Warning / Error / All levels), the prompt input, and a sample log including a `console.table()` output. Store at `public/screenshots/010/03-console-panel.png`. Caption: "Console — REPL inside the page, with log-level filtering. `console.table` and `$0` are two of the moves that separate junior from senior."

**Senior moves.** A short ordered list:

- **Log levels and filtering.** `console.log` (default), `console.info`, `console.warn`, `console.error`. Each prints to a level; the level filter lets you drop everything but errors when a noisy page is talking to you. The senior reflex for production debugging logs: use `console.warn` and `console.error` so the noise stays filterable.
- **`console.table(arrayOfObjects)`** — renders an actual table with columns for each object key. Use it instead of `console.log` for any array of objects, ever.
- **`console.dir(domNode)`** — prints the full property tree of a DOM node (rather than the rendered HTML, which is what `console.log(node)` gives you). Use when the question is "what JS properties does this node carry?"
- **`console.trace()`** — prints the stack trace at the call site. Use when "who called this?" is the question and you don't want to set a breakpoint.
- **`$0`, `$1`, `$2`, `$3`, `$4`** — references to the last five elements selected in the Elements panel. Click a node in Elements, switch to Console, type `$0.getBoundingClientRect()` to inspect it programmatically. This is the bridge between the two panels most juniors don't know exists.
- **`copy(value)`** — copies any value to the clipboard. Useful for `copy($0.outerHTML)` to grab the live rendered markup, or `copy(JSON.stringify(state, null, 2))` to grab a state snapshot.
- **Live evaluation as you type.** Start typing `document.queryS…` and DevTools shows you the result of the current expression in a faded preview before you hit Enter. Useful for refining a selector against the live DOM before pasting it into code.

Use `<Term definition="DevTools console utilities — short variables and functions only available in the Console (not in your scripts). $0 to $4 reference recently-inspected elements; copy() puts a value on the clipboard; $_ holds the last evaluated expression.">console utilities</Term>` on first use.

**One small worked beat.** "In Elements, inspect any element on the page. Switch to Console. Type `$0` — the element prints. Type `console.dir($0)` — its full JS surface unfolds. Type `copy($0.outerHTML)` — paste anywhere; the live rendered markup is on your clipboard."

**Small `Code` block to anchor the section.** A single fenced JS block with five lines showing the moves; not `CodeVariants` (these are not alternatives, they're a vocabulary):

```js
console.table(users);        // an array of objects rendered as a real table
console.dir($0);             // full JS property tree of the inspected element
console.trace();             // stack at this line
copy($0.outerHTML);          // live markup → clipboard
copy(JSON.stringify(state)); // snapshot any value
```

Comments are illustrative, not production code; the `Code` block is reference vocabulary.

### Application — what's in storage right now?

**Framing paragraph.** One paragraph. The Application panel is the storage and identity inspector. Cookies, Local Storage, Session Storage, IndexedDB, Cache Storage, Service Workers — every place the page persists data is here, and every entry can be inspected, edited, or deleted from the panel. For SaaS work the day-to-day surface is Cookies (the auth chapter's session cookies) and Local/Session Storage (URL-state-list project, client-state tooling); the rest is named so the geography is mapped.

**Annotated visual.** `<Screenshot viewport="desktop">` of the Application panel sidebar with the major sections visible: **Manifest**, **Service Workers**, **Storage** (with sub-items Local Storage / Session Storage / IndexedDB / Cookies / Cache Storage), and the **Clear site data** button. Store at `public/screenshots/010/03-application-panel.png`. Caption: "Application panel — every storage surface and identity slot the page touches, all editable from here."

**Senior moves.** A short ordered list:

- **Cookies — the auth surface.** Expand the Cookies node under Storage, click the origin you care about. The right pane lists every cookie with its full attribute set: name, value, domain, path, expires/max-age, `HttpOnly`, `Secure`, `SameSite`. Edit a value in place; double-click any attribute to flip it; delete a row with the delete key. When the auth chapter lands (chapter 013 / Unit 8 server-side), this is where you'll read the session cookie. Senior reflex: when "auth doesn't work," check the cookie's `SameSite` and `Secure` flags before checking server logs.
- **Local Storage / Session Storage.** Same edit-and-clear surface, keyed by origin. Local Storage persists across tabs and reloads; Session Storage is per-tab and clears on tab close.
- **IndexedDB — one line.** Persistent client-side database. Surfaces here, mentioned in one line: when offline state earns its weight, this is the panel. Not the default on this stack.
- **Service Workers and Cache Storage — one line each.** Service workers appear under their own sidebar entry; Cache Storage shows what they've cached. Named here so the geography is mapped; the course doesn't ship a service worker on this stack — Server Components and Next.js's data fetching cover the surface. Forward link: Unit 14 (cache + rate limiting).
- **"Clear site data" — the senior nuke.** A single button at the top of the Application section that wipes cookies, storage, cache, service workers, the lot for the current origin. The fix for "it works in incognito but not here" — your local state has drifted from the server's expectations, and clearing is faster than diffing. Reach for it without ceremony.

Use `<Term definition="The DevTools button under Application → Storage that wipes every persistence surface for the current origin: cookies, local/session storage, cache storage, IndexedDB, service workers. The fix for &quot;works in incognito, breaks here.&quot;">Clear site data</Term>` on first use.

**One small worked beat.** "Open Application → Storage → Cookies on this page. Click your origin. Read the attributes column on any cookie. Notice `SameSite`, `Secure`, `HttpOnly` — those four characters in the wrong combination are why your authenticated request silently dropped its cookie on a cross-site fetch. Chapter 013 owns the senior defaults; the panel is where you'll diagnose them."

### The panels deferred on purpose

A short, no-header beat after the four panels. Three to four sentences:

- **Performance + Lighthouse.** Both exist, both surface Core Web Vitals and performance traces, both are tuned in Unit 19. Skipped here because measuring performance on an empty teaching page is theatre — you can't tune what you haven't built.
- **Sources.** The debugger / breakpoint surface. The course's day-to-day is heavy on Server Components and Server Actions where the debugger lives in the Node process, not the browser. One line. Reach for it when you're debugging Client Component logic in production-shape detail; otherwise the Console covers most needs.
- **Memory, Recorder, Security.** Named in one line each: Memory for heap snapshots when a leak earns the dig; Recorder for capturing and replaying a flow as a Puppeteer script; Security for the connection's TLS state (a glance, not a workflow). Not on the daily path.
- **Device Mode toolbar.** Named once. The viewport simulator that toggles mobile / tablet / desktop sizes lives in the top-left of DevTools (laptop+phone icon, shortcut `Cmd+Shift+M` / `Ctrl+Shift+M`). The Tailwind responsive chapter (chapter 021) will lean on it; the workflow is taught there.

Use `<Aside type="note">` to wrap this whole beat — it's a meta-note about scope, not lesson content. Title: "Panels we're deliberately skipping."

### Closing recall drill — scenarios to panels

One `Matching` exercise. The student matches eight production-like scenarios (left column) to the panel they would open first (right column). This is the lesson's active-recall confirmation that the geography stuck.

**Pairs (left = scenario, right = panel — repeats allowed because the same panel may be the right answer twice):**

1. Left: "The API call returns 401 but the page renders fine" — Right: **Network** (check the response and request headers).
2. Left: "A class is in the DOM but the style doesn't apply" — Right: **Elements** (read the cascade; the rule is struck through).
3. Left: "A session cookie is set but the next request doesn't send it" — Right: **Application** (inspect the cookie's `SameSite` and `Secure` attributes).
4. Left: "We ship a fetch but the user sees a stale response" — Right: **Network** (check the cache headers and verify Disable cache is on while testing).
5. Left: "The React tree shows the component but its prop is undefined" — Right: **React DevTools — Components** (the React component panel reads props directly).
6. Left: "A redirect happens before I can read the response" — Right: **Network** (turn on Preserve log).
7. Left: "The user reports `localStorage` data they shouldn't have" — Right: **Application** (inspect Local Storage; the answer is "Clear site data" in incognito too).
8. Left: "I want to copy the live rendered HTML of one node" — Right: **Console** (`copy($0.outerHTML)` after inspecting in Elements).

The `Matching` component shuffles both columns; the grading is automatic. Instructions string: "For each scenario, click the panel you would open first."

Note: with eight pairs, several map to **Network** and **Application**. Repeat right-side labels are allowed in the `Matching` component — but verify in the source: if the connector lines for repeats are visually confusing, drop to six pairs covering all four panels exactly once or twice.

### Optional — `SandboxCallout` with a deliberately-broken page

One `<SandboxCallout>` at the very end, expandable. Inside an embedded sandbox host (CodeSandbox or a static page deployed to the course's site), a tiny HTML page is broken in four ways, one per panel:

1. A 404 hidden in a `fetch()` to a stale endpoint (Network finds it).
2. A struck-through CSS rule on a heading where a higher-specificity selector overrides it (Elements finds it).
3. A `console.error` nobody reads ("`null is not an object`") thrown on init (Console finds it).
4. A stale `auth` token in `localStorage` from a previous session that triggers a broken UI state (Application finds it; "Clear site data" or deleting the key fixes it).

**Description on the callout body:** "A small page deliberately broken in four ways — one bug per panel. Open it, find all four using only DevTools, and confirm the geography stuck."

**Implementation note for the writer agent:** authoring this sandbox is more effort than the rest of the lesson combined. If time-boxed, skip; the `Matching` exercise above is the load-bearing recall drill. The sandbox is *optional confirmation*. If shipped, host the four-bug page on the course site under `/labs/010-devtools/` and embed via `SandboxCallout` with `label="Open the four-bug page"` and the prose body above.

### What stays out (named once)

A two-line wrap, no header:

- Performance / Lighthouse / Core Web Vitals tuning → Unit 19.
- React DevTools mechanics in depth (component tree inspection, profiler flame charts) → chapter 023 (Unit 3) and Unit 19.
- Cookie attribute semantics (`HttpOnly`, `Secure`, `SameSite`) → chapter 013.
- The Sources debugger workflow → no dedicated lesson; mentioned in one line above.
- The cascade itself, the box model, the React render model — read through DevTools, taught in their owning chapters.

No `ExternalResource` cards needed here — the forward links are course-internal.

### Optional — `<details>` deep-dive

If extra room remains: a collapsed `<details>` with title "DevTools' AI panels — why this course ignores them." One short paragraph echoing the chapter outline: AI features in DevTools (Console Insights, the inline AI explainer) ship and break on Chrome stable channels; the project filter is "no AI naming unless the feature being taught is AI"; the senior reflex of *reading* the panel will outlast any inline summariser.

If the lesson reads complete without it, omit.

---

## Components and tools to use

| Element | Component / engine |
| --- | --- |
| The React DevTools install procedure | `<Steps>` |
| The Chrome Web Store link (and optional Firefox link) | `<ExternalResource>` (one) or `<CardGrid>` of two `<ExternalResource>`s |
| Each panel's labelled overview | `<Screenshot viewport="desktop">` inside `<Figure caption="…">` — four total, one per panel |
| Each panel's senior moves | Unnumbered bullet lists in prose — these are reference moves, not procedures, so not `<Steps>` |
| Each panel's small worked beat | One short prose paragraph after the moves list |
| The Console vocabulary anchor | A single fenced `js` `Code` block (five-line cheatsheet) |
| Inline term definitions | `<Term>` on `live DOM`, `pseudo-states`, `throttling`, `console utilities`, `Clear site data` |
| Senior watch-outs and the deferred-panels note | `<Aside type="caution">` for traps, `<Aside type="note">` for the deferred-panels meta-beat |
| Closing recall drill | `<Matching>` with 6–8 scenario/panel pairs |
| Optional confirmation lab | `<SandboxCallout>` (only if the four-bug page is built) |
| Optional AI-panels meta-note | `<details>` |

No live-coding components; the lesson is browser-shaped. No diagrams beyond the annotated screenshots — DevTools *is* the diagram.

## Term tooltips to author

Strategic. Each `<Term>` carries one or two sentences of plain text. Use at first occurrence; do not sprinkle.

- `live DOM` — in-memory tree as it stands after JS mutation, distinct from source HTML.
- `pseudo-states` — `:hover`, `:focus-visible`, `:active`, `:focus-within`; toggleable explicitly from the Styles pane.
- `throttling` — network throttle presets with their approximate down/RTT values.
- `console utilities` — `$0`–`$4`, `$_`, `copy()` etc., only available in the Console (not in scripts).
- `Clear site data` — single-button wipe of every storage surface for the current origin.

`<Term>` placement: at first use in the section that introduces each.

## Screenshots to capture

Four desktop screenshots, stored under `public/screenshots/010/`:

- `03-elements-panel.png` — Elements panel with the DOM tree, Styles pane (cascade visible with at least one struck-through rule), Computed tab visible, `:hov` button visible.
- `03-network-panel.png` — Network panel with the toolbar visible (Preserve log + Disable cache checked, Throttling dropdown showing "No throttling" or "Slow 4G"), filter chips visible, the right-pane detail with its tabs visible.
- `03-console-panel.png` — Console with the log-level filter visible, prompt with a `console.table` result printed above it (use a small inline array of user-like objects to seed the screenshot).
- `03-application-panel.png` — Application panel sidebar expanded to show Manifest, Service Workers, Storage (with sub-items), Background Services. The Cookies sub-item should be selected to show a cookie row with its attributes.

All four captures should be from the same well-styled site (e.g. `react.dev` or this course's site) for visual consistency. Annotate the regions either via overlaid labels in the image itself or via a small numbered list in the caption — choose one consistent approach across the four. Numbered captions are easier to author and adapt better to dark/light mode than baked-in annotations.

`alt` text on each `<img>` must describe the panel layout in one sentence so the screenshot is accessible without sight.

---

## Scope

### What this lesson covers

- The Chromium DevTools default; Firefox and Safari named once each as alternates.
- React DevTools install — Chrome Web Store, Firefox Add-ons, verification step. Mechanics deferred to chapter 023 and Unit 19.
- **Elements panel:** live DOM vs. source HTML, cascade reading in the Styles pane, struck-through-overrides visualisation, live editing of values, pseudo-state toggles (`:hov`), the Computed tab.
- **Network panel:** open-before-action reflex, Preserve log, Disable cache, throttling (2026 presets: Fast 4G / Slow 4G / 3G / Offline + per-request override), request-type filters, right-pane reading order (Headers → Payload → Response → Timing), Copy as fetch / Copy as cURL.
- **Console panel:** log levels and filtering, `console.table`, `console.dir`, `console.trace`, `$0`–`$4`, `copy()`, `$_`, live evaluation while typing.
- **Application panel:** Cookies with their full attribute set (named here, semantics in chapter 013), Local Storage and Session Storage, IndexedDB and Service Workers + Cache Storage as one-liners, "Clear site data" as the senior nuke.
- The deferred panels (Performance, Lighthouse, Sources, Memory, Recorder, Security) named with their owners — Unit 19 for performance, one-line dismissal for the rest.
- The Device Mode toolbar named in one line; mechanics deferred to chapter 021 (responsive Tailwind).
- One `Matching` exercise (six to eight scenario → panel pairs) as the active-recall confirmation.
- Optionally, one `<SandboxCallout>` with a deliberately-broken page exercising all four panels — *if* the lab page is authored, otherwise omitted without loss.

### What this lesson does NOT cover (owned by other lessons, do not re-teach)

- **Network protocol details** (HTTP/3, QUIC, TLS, the Timing breakdown semantics) — chapter 010 lesson 1 owns those. Re-state in one line if needed for flow.
- **The browser-side rendering pipeline stages** — chapter 010 lesson 2. The Elements panel reads what those stages produce; do not re-teach the pipeline.
- **HTTPS on localhost, secure contexts, `mkcert`** — chapter 010 lesson 4.
- **HTTP method/status/header contract** — chapter 011. Do not detail status code families or header categories; the Network panel reads them, the contract is taught later.
- **CORS, origins, the same-origin policy** — chapter 012.
- **Cookies' `HttpOnly` / `Secure` / `SameSite` semantics** — chapter 013. The Application panel surfaces them; the contract is taught there.
- **The cascade itself, specificity, the box model, Tailwind layers** — chapters 019–021. DevTools reads the cascade; the cascade is taught in its owning chapter.
- **React component tree inspection at depth, prop edits via DevTools, Profiler flame charts** — chapter 023 and Unit 19.
- **`fetch` semantics, Request/Response objects, error handling** — chapter 015.
- **Core Web Vitals, Performance flame charts, Lighthouse audits, bundle analyzer** — Unit 19.
- **Sources panel: breakpoints, watch expressions, scope, conditional breakpoints, blackboxing** — surfaced in one dismissive line; the course doesn't teach the browser debugger as a workflow on this stack.
- **DevTools' AI features (Console Insights, AI explainer)** — explicitly out by project filter. Optional one-line `<details>` only.
- **Mobile responsive testing through Device Mode** — chapter 021.
- **Service Worker authoring** — out of scope across the course on this stack.
- **AI-related framing.** No AI naming in this lesson.

### Prerequisites the student already has (do not re-teach)

The student arrives from lessons 1 and 2 with:

- The four-stage network mental model (DNS, transport, TLS, HTTP).
- Familiarity with the Network panel — protocol column, Timing breakdown, hover-to-inspect a row.
- The browser-side rendering pipeline (parse → DOM, CSS → CSSOM, render tree, layout, paint, composite).
- The senior framing: a slow load is a stage problem; name the stage, debug the stage.
- Reading-only HTML and CSS fluency; no Tailwind yet.
- General awareness that DevTools exists and how to open it (`Cmd/Ctrl+Opt+I` / `F12`).

Do not re-define what DevTools is, how to open it, what the Network panel does at a high level, or what cookies / localStorage *are* as concepts (their semantics live in chapter 013 and Unit 15). One-line refreshers fine; do not detour.

---

## Notes for the writer agent

- **The lesson is browser-shaped.** No application code beyond the five-line Console cheatsheet. Code conventions don't apply to those illustrative lines — comments are explanatory, not production-shape.
- **Annotated screenshots are the diagrams.** Build the four captures carefully — same site, same DevTools theme (dark or light, pick one and stay), same docked position, similar zoom level. Consistency carries half the comprehension; mismatched captures read as four different panels in four different products.
- **Numbered callouts in captions over baked-in label overlays.** Easier to author, adapts to theme switches, accessible to screen readers via caption text. If you go baked-in, use a single neutral colour and a sans-serif font on all four.
- **The `Matching` exercise must repeat panels.** Eight scenarios spread across four panels means some panels appear two or three times. Verify the `Matching` component's connectors stay readable with repeats; if not, drop to six pairs.
- **Tone discipline.** Adult, terse. No "fun fact." No "the magic of DevTools." No celebratory framing of any single keystroke. The senior reads the panel; the panel reads the page.
- **Do not name AI as a panel feature.** Per project filter; the chapter outline is explicit on this.
- **2026 fact-check pins:**
  - Network throttle presets are **Fast 4G / Slow 4G / 3G / Offline** (the old "Fast 3G / Slow 3G" names were renamed in Chrome 130+). Per-request throttling shipped in December 2025.
  - React DevTools extension is current; install path is the Chrome Web Store / Firefox Add-ons; tabs in DevTools are **Components ⚛** and **Profiler ⚛**.
  - Application panel sidebar in 2026 carries: **Manifest**, **Service Workers**, **Storage** (with Local Storage / Session Storage / IndexedDB / Cookies / Cache Storage / Shared Storage), **Background Services**.
  - Device Mode is opened with the **toggle-device-toolbar** button (laptop+phone icon) or `Cmd/Ctrl+Shift+M`. Chrome calls it "Device Mode" / "device toolbar"; the shorthand "responsive mode" matches Firefox.
- **The optional sandbox is high effort for moderate gain.** If the lesson's time budget tightens, ship without it. The `Matching` exercise is the load-bearing recall drill.
- **The lesson is intentionally short (35–40 min).** Resist the urge to teach every button. Survey, not manual.
