# Component docs index

API reference for the pre-built Astro components used in lessons, grouped by category. Each entry below links to its detailed doc.

---

## Starlight built-ins → [`starlight/`](./starlight/)

| Choice | Use when… | Doc |
| --- | --- | --- |
| `Code` | Default for any code or code output. Expressive Code. Can be combined with Tabs to for multiple code blocks that logically grouped together. | [code.md](./starlight/code.md) |
| `Card`, `CardGrid` | Grouping a small set of related items in a responsive grid; each tile has a title, optional icon, and free-form body. | [cards.md](./starlight/cards.md) |
| `Aside` | Setting a paragraph apart from prose as a note, tip, caution, danger. | [asides.md](./starlight/asides.md) |
| `Badge` | A short inline status pill. | [badges.md](./starlight/badges.md) |
| `FileTree` | File tree. | [file-tree.md](./starlight/file-tree.md) |
| `Icon` | Built-in icons, standalone or accepted by `Card`, `Aside`, `TabItem`. | [icons.md](./starlight/icons.md) |
| `Steps` | Numbered procedure the reader follows in order. | [steps.md](./starlight/steps.md) |
| `Tabs`, `TabItem` | Alternatives the reader chooses between. For tabbed *code* comparisons, prefer `CodeVariants` instead. | [tabs.md](./starlight/tabs.md) |
| `<details>` | Collapsible disclosure — clickable `<summary>` line expands to reveal hidden content. Native HTML. Use for reveal-on-demand reference solutions or optional deep-dives. | [details.md](./starlight/details.md) |

---

## Code → [`code/`](./code/)

Embed code blocks in lessons.

| Choice | Use when… | Doc |
| --- | --- | --- |
| `CodeTooltips` | Hover tooltips on chosen substrings inside a single code block. Useful for short inline definitions. | [code-tooltips.md](./code/code-tooltips.md) |
| `AnnotatedCode` | Stepped walkthrough of a single code block, with parts of the code highlighted, each step has its own text explaing the highlighted code.  Use when one code block is complex and you need to focus student's attention on specific parts of the code at a time. | [annotated-code.md](./code/annotated-code.md) |
| `CodeVariants` | Tabbed comparison of two or more versions of the same code, each tab contains text explaining that variant. Useful to show the incorrect and correct version of the code or group related files. | [code-variants.md](./code/code-variants.md) |

---

## Figures → [`figures/`](./figures/)

Visual scaffolds — wrappers, diagrams, and tabbed/sequenced panels.

| Choice | Use when… | Doc |
| --- | --- | --- |
| `Figure` | Wrapper for any visual, card with an optional caption. Slot anything inside (custom HTML, `<ArrowDiagram>`, hand-coded SVG, etc.). | [figure.md](./figures/figure.md) |
| `ArrowDiagram` | Box-and-arrow diagrams. Author the boxes as children with `id`s; pass an `arrows` array describing the connections. Goes inside a `<Figure>`. | [arrow-diagram.md](./figures/arrow-diagram.md) |
| `DiagramSequence` | A temporal sequence the student scrubs through with a slider + back/forward chevrons, content can be anything. | [diagram-sequence.md](./figures/diagram-sequence.md) |
| `TabbedContent` | Tabbed comparison of panels with any type of content, each with its own optional caption. For tabbed *code* comparisons, prefer `CodeVariants`. | [tabbed-content.md](./figures/tabbed-content.md) |
| `ParamPlayground` | Live preview driven by a column of controls. Control values pipe into the preview as CSS custom properties; optional chips below echo a value or evaluate an expression. | [param-playground.md](./figures/param-playground.md) |
| `RenderTracking` | A tree of labeled "components" with per-node render-count badges. Triggers tick the badges of nodes you tag as re-rendering; optional tabs for comparisons. | [render-tracking.md](./figures/render-tracking.md) |
| `RequestTrace` | A scrubbable trace of one request through the App Router. | [request-trace.md](./figures/request-trace.md) |
| `StateMachineWalker` | A chained multi-choice walk: each step is a question with branch buttons, and picking one advances to the next step. Two modes — decisions that end on a recommendation, or state machines whose questions are states with cycles allowed, synced topology diagram highlighting current state. | [state-machine-walker.md](./figures/state-machine-walker.md) |
| `GraphExplorer` | Graph, click nodes or edge labels for info on bottom panel; optional play buttons that walk a named path through the graph. | [graph-explorer.md](./figures/graph-explorer.md) |

---

## Live coding → [`live-coding/`](./live-coding/)

Exercises based on CodeMirror editors wired to in-browser runtimes, with criteria-driven grading and optional AI feedback.

| Choice | Use when… | Doc |
| --- | --- | --- |
| `SQLCoding` | The student writes a SQL query against a Postgres-in-WASM (PGlite). Author seeds the schema and rows; criteria match expected result rows. | [sql-coding.md](./live-coding/sql-coding.md) |
| `DrizzleCoding` | Same as `SQLCoding` but the student writes a TypeScript Drizzle query. The schema is the single source of truth — DDL is emitted automatically. | [drizzle-coding.md](./live-coding/drizzle-coding.md) |
| `DrizzleSchemaCoding` | Schema-design exercises — the student writes the Drizzle schema; the grader checks tables, columns, flags, and constraints. Optional SQL probes verify the constraints fire. | [drizzle-schema-coding.md](./live-coding/drizzle-schema-coding.md) |
| `ReactCoding` | TSX exercises with React 19 + Tailwind v4 in a same-origin iframe. Three modes: tests, target-match (Target \| Your output preview), or pure exploration. | [react-coding.md](./live-coding/react-coding.md) |
| `HtmlCssCoding` | HTML + CSS (+ optional JS) exercises driven by a same-origin `srcdoc` iframe. Live update on every keystroke by default. Optional DOM-based tests. The course is JSX and Tailwind-based, always prefer ReactCoding. | [html-css-coding.md](./live-coding/html-css-coding.md) |
| `ScriptCoding` | JS, TS, TSX exercises with jest-flavoured assertions. Vanilla JS iframe runner by default; opt into a Sandpack bundler for JSX/TS/npm. | [script-coding.md](./live-coding/script-coding.md) |
| `TypeCoding` | Type-only exercises — no runtime. `satisfies`, branded types, discriminated unions, `keyof`, etc. Twoslash `^?` query criteria, optional expected diagnostics. | [type-coding.md](./live-coding/type-coding.md) |
| `ZodCoding` | Zod exercises — type-checker pane + real-Zod iframe runner that runs pinned `safeParse` scenarios. | [zod-coding.md](./live-coding/zod-coding.md) |

---

## Exercises → [`exercises/`](./exercises/)

Interactive non-coding exercises.

| Choice | Use when… | Doc |
| --- | --- | --- |
| `Tokens` | Click pre-highlighted parts of the code on a block — identify operators, calls, literals, etc. Targets are correct, decoys are clickable wrong picks. | [tokens.md](./exercises/tokens.md) |
| `Buckets` | Classification drag-and-drop. Sort items into the right category. One- or two-column layout. | [buckets.md](./exercises/buckets.md) |
| `CodeReview` | PR-style review — student leaves inline comments on a diff, AI grades each against a short `kernel` rubric phrase. | [code-review.md](./exercises/code-review.md) |
| `Dropdowns` | Fill-in-the-blank with `<select>`s — either inline prose with `<DropdownChoice>`, or a fenced code block with `___` placeholders and an `answers` prop. | [dropdowns.md](./exercises/dropdowns.md) |
| `Matching`  | Two-column matching drill — click a left item, then its corresponding right item; they link with a line. | [matching.md](./exercises/matching.md) |
| `MultipleChoice` | Single multiple-choice question. Two or more `correct` choices auto-switch the card to multi-select mode. | [multiple-choice.md](./exercises/multiple-choice.md) |
| `PredictOutput` | "What does this program print?" drill. Expected output withheld on the first wrong attempt. | [predict-output.md](./exercises/predict-output.md) |
| `Sequence` | Ordering drill — drag steps into the correct order. Optional fixed code block above the steps. | [sequence.md](./exercises/sequence.md) |
| `TrueFalse` | A round of true/false statements with end-of-round score and a card-by-card review. | [true-false.md](./exercises/true-false.md) |
| `TextAnswer` | Free-text answer graded by AI. Use as last resort only, when it's important to verify the student's understanding but other exercises are not appropriate. | [text-answer.md](./exercises/text-answer.md) |

---

## Embeds → [`embeds/`](./embeds/)

Collapsible callouts that lazy-load and embedded iframes. The site is cross-origin isolated (`COOP: same-origin` + `COEP: credentialless`) so WebContainer sandboxes can boot; the iframes carry the `credentialless` attribute.

| Choice | Use when… | Doc |
| --- | --- | --- |
| `StackBlitzCallout` | Embedding a StackBlitz WebContainer sandbox by GitHub repo or project ID. | [stackblitz-callout.md](./embeds/stackblitz-callout.md) |
| `CodeSandboxCallout` | Embedding a CodeSandbox sandbox by sandbox ID or public GitHub repo. | [codesandbox-callout.md](./embeds/codesandbox-callout.md) |
| `TSPlaygroundCallout` | Embedding a TypeScript Playground with either a pre-computed share URL or a raw `code` + `flags` pair that gets LZ-compressed client-side. | [ts-playground-callout.md](./embeds/ts-playground-callout.md) |
| `ZodPlaygroundCallout` | Embedding the marilari88 Zod Playground with a schema (and optional sample values, version, `zod/mini` flag) prefilled via LZ-compressed `?appdata=…`. | [zod-playground-callout.md](./embeds/zod-playground-callout.md) |
| `SandpackCallout` | In-page React/TS sandbox via `sandpack-react` — prefill `files`, `dependencies`, `options` as props (not a URL). Use for editable React examples in Unit 4 onward; lazy-mounts on first click. | [sandpack-callout.md](./embeds/sandpack-callout.md) |
| `ReactTestingCallout` | Embedding [Testing Playground](https://testing-playground.com) with HTML markup (and optional starter `screen.*` query) prefilled via LZ-compressed `#markup=…&query=…`. Use for React Testing Library query-ladder demos. | [react-testing-callout.md](./embeds/react-testing-callout.md) |
| `SandboxCallout` | Generic expandable iframe-callout. Embedding any third-party sandbox by URL. | [sandbox-callout.md](./embeds/sandbox-callout.md) |
| `VideoCallout` | Embedding a YouTube video. | [video-callout.md](./embeds/video-callout.md) |
| `PlaywrightEmbed` | Embed the Playwright trace viewer (`trace.playwright.dev`) prefilled with a public `trace.zip`. | [playwright-embed.md](./embeds/playwright-embed.md) |
| `GitBranchingEmbed` | Inline embed of [learngitbranching.js.org](https://learngitbranching.js.org). Use in Git lessons. | [git-branching-embed.md](./embeds/git-branching-embed.md) |

---

## UI → [`ui/`](./ui/)

Lesson UI elements.

| Choice | Use when… | Doc |
| --- | --- | --- |
| `Term` | Inline word or phrase in prose with a dashed underline and a hover/focus tooltip showing a short definition. | [term.md](./ui/term.md) |
| `ExternalResource` | Clickable card linking out to an external resource with an icon badge, title, hostname, and short description. | [external-resource.md](./ui/external-resource.md) |

---

## Icons

Import `Icon` from `astro-icon/components` and reference an icon by `set:name`.

| Set | Use for | Catalog |
| --- | --- | --- |
| `lucide:*` | Generic UI glyphs. | [lucide.dev/icons](https://lucide.dev/icons) |
| `simple-icons:*` | Brand logos. | [simpleicons.org](https://simpleicons.org) |

---

## Quiz → [`quiz/`](./quiz/)

| Choice | Use when… | Doc |
| --- | --- | --- |
| `Quiz` | End-of-chapter assessment. | [quiz.md](./quiz/quiz.md) |

---
