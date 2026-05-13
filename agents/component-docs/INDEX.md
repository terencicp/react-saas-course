# Component docs index

API reference for the pre-built Astro components used in lessons, grouped by category. Each entry below links to its detailed doc.

---

## Starlight built-ins → [`starlight/`](./starlight/)

| Choice | Use when… | Doc |
| --- | --- | --- |
| `Code` | Default for any code. Expressive Code. | [code-blocks.md](./starlight/code-blocks.md) |
| `Card`, `CardGrid` | Grouping a small set of related items in a responsive grid; each tile has a title, optional icon, and free-form body. | [cards.md](./starlight/cards.md) |
| `LinkCard` | A single clickable tile that points elsewhere — external resource, related lesson, follow-up reading. Combine with `CardGrid` for a row of related links. | [link-cards.md](./starlight/link-cards.md) |
| `Aside` | Setting a paragraph apart from prose as a note, tip, caution, danger. | [asides.md](./starlight/asides.md) |
| `Badge` | A short inline status pill. | [badges.md](./starlight/badges.md) |
| `FileTree` | File tree. | [file-tree.md](./starlight/file-tree.md) |
| `Icon` | Built-in icons, standalone or accepted by `Card`, `Aside`, `TabItem`. | [icons.md](./starlight/icons.md) |
| `Steps` | Numbered procedure the reader follows in order. | [steps.md](./starlight/steps.md) |
| `Tabs`, `TabItem` | Alternatives the reader chooses between. For tabbed *code* comparisons, prefer `CodeVariants` instead. | [tabs.md](./starlight/tabs.md) |

---

## Code → [`code/`](./code/)

Embed code in lessons.

| Choice | Use when… | Doc |
| --- | --- | --- |
| `CodeTooltips` | Hover tooltips on chosen substrings inside a single code block. Useful for short inline definitions. | [code-tooltips.md](./code/code-tooltips.md) |
| `AnnotatedCode` | Stepped walkthrough of a single code block, with parts of the code highlighted, each step has its own text explaing the highlighted code.  Use when one code block is complex and you need to focus student's attention on specific parts of the code at a time. | [annotated-code.md](./code/annotated-code.md) |
| `CodeVariants` | Tabbed comparison of two or more versions of the same code, each tab contains text explaining that variant. | [code-variants.md](./code/code-variants.md) |

---

## Figures → [`figures/`](./figures/)

Visual scaffolds — wrappers, diagrams, and tabbed/sequenced panels.

| Choice | Use when… | Doc |
| --- | --- | --- |
| `Figure` | Wrapper for any visual, card with an optional caption. Slot anything inside (custom HTML, `<ArrowDiagram>`, hand-coded SVG, etc.). | [figure.md](./figures/figure.md) |
| `ArrowDiagram` | Box-and-arrow diagrams. Author the boxes as children with `id`s; pass an `arrows` array describing the connections. Goes inside a `<Figure>`. | [arrow-diagram.md](./figures/arrow-diagram.md) |
| `DiagramSequence` | A temporal sequence the student scrubs through with a slider + back/forward chevrons, content can be anything. | [diagram-sequence.md](./figures/diagram-sequence.md) |
| `TabbedContent` | Tabbed comparison of panels with any type of content, each with its own optional caption. For tabbed *code* comparisons, prefer `CodeVariants`. | [tabbed-content.md](./figures/tabbed-content.md) |

---

## Live coding → [`live-coding/`](./live-coding/)

Exercises based on CodeMirror editors wired to in-browser runtimes, with criteria-driven grading and optional AI feedback.

| Choice | Use when… | Doc |
| --- | --- | --- |
| `SQLCoding` | The student writes a SQL query against a Postgres-in-WASM (PGlite). Author seeds the schema and rows; criteria match expected result rows. | [sql-coding.md](./live-coding/sql-coding.md) |
| `DrizzleCoding` | Same as `SQLCoding` but the student writes a TypeScript Drizzle query. The schema is the single source of truth — DDL is emitted automatically. | [drizzle-coding.md](./live-coding/drizzle-coding.md) |
| `DrizzleSchemaCoding` | Schema-design exercises — the student writes the Drizzle schema; the grader checks tables, columns, flags, and constraints. Optional SQL probes verify the constraints fire. | [drizzle-schema-coding.md](./live-coding/drizzle-schema-coding.md) |
| `HtmlCssCoding` | HTML + CSS (+ optional JS) exercises driven by a same-origin `srcdoc` iframe. Live update on every keystroke by default. Optional DOM-based tests. | [html-css-coding.md](./live-coding/html-css-coding.md) |
| `ReactCoding` | TSX exercises with React 19 + Tailwind v4 in a same-origin iframe. Three modes: tests, target-match (Target \| Your output preview), or pure exploration. | [react-coding.md](./live-coding/react-coding.md) |
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
| `Dropdowns` | Fill-in-the-blank with `<select>`s — either inline prose with `<Choice>`, or a fenced code block with `___` placeholders and an `answers` prop. | [dropdowns.md](./exercises/dropdowns.md) |
| `Matching`  | Two-column matching drill — click a left item, then its corresponding right item; they link with a line. | [matching.md](./exercises/matching.md) |
| `MultipleChoice` | Single multiple-choice question. Two or more `correct` choices auto-switch the card to multi-select mode. | [multiple-choice.md](./exercises/multiple-choice.md) |
| `PredictOutput` | "What does this program print?" drill. Expected output withheld on the first wrong attempt. | [predict-output.md](./exercises/predict-output.md) |
| `Sequence` | Ordering drill — drag steps into the correct order. Optional fixed code block above the steps. | [sequence.md](./exercises/sequence.md) |
| `TrueFalse` | A round of true/false statements with end-of-round score and a card-by-card review. | [true-false.md](./exercises/true-false.md) |
| `TextAnswer` | Free-text answer graded by AI. Use as last resort only, when it's important to verify the student's understanding but other exercises are not appropriate. | [text-answer.md](./exercises/text-answer.md) |

---

## UI → [`ui/`](./ui/)

Lesson UI elements.

| Choice | Use when… | Doc |
| --- | --- | --- |
| `SandboxCallout` | Expandable container, lazy loading. Embedding an interactive code sandbox for optional free exploration. | [sandbox-callout.md](./ui/sandbox-callout.md) |
| `VideoCallout` | Expandable container, lazy loading. Embedding a YouTube video as supplementary material. | [video-callout.md](./ui/video-callout.md) |

---

## Quiz → [`quiz/`](./quiz/)

| Choice | Use when… | Doc |
| --- | --- | --- |
| `Quiz` | End-of-chapter assessment. | [quiz.md](./quiz/quiz.md) |

---
