# Component docs index

API reference for the Astro components used in lessons, grouped by category. Each entry below links to its detailed doc; categories listed without links aren't documented yet.

---

## Starlight built-ins → [`starlight/`](./starlight/)

Stock components re-exported from `@astrojs/starlight/components`. No relative import path — same module for all of them.

| Choice | Reach for it when… | Doc |
| --- | --- | --- |
| Plain code block (Expressive Code) | Default for any code. | [code-blocks.md](./starlight/code-blocks.md) |
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

| Choice | Reach for it when… | Doc |
| --- | --- | --- |
| `CodeTooltips` | Hover tooltips on chosen substrings inside a single code block. Useful for short inline definitions. | [code-tooltips.md](./code/code-tooltips.md) |
| `AnnotatedCode` + `AnnotatedStep` | Stepped walkthrough of a single code block, with parts of the code highlighted, each step has its own text explaing the highlighted code.  Use when one code block is complex and you need to focus student's attention on specific parts of the code at a time. | [annotated-code.md](./code/annotated-code.md) |
| `CodeVariants` + `CodeVariant` | Tabbed comparison of two or more versions of the same code, each tab contains text explaining that variant. | [code-variants.md](./code/code-variants.md) |

---

## Figures → `figures/` *(not yet documented)*

- `ArrowDiagram`
- `Figure`
- `DiagramSequence` (`DiagramSequence`, `DiagramStep`)
- `TabbedContent` (`TabbedContent`, `TabbedItem`)

---

## Live coding → `live-coding/` *(not yet documented)*

- `DrizzleCoding`
- `DrizzleSchemaCoding`
- `HtmlCssCoding`
- `ReactCoding`
- `SQLCoding`
- `ScriptCoding`
- `TypeCoding`
- `ZodCoding`

---

## Exercises → `exercises/` *(not yet documented)*

- `Tokens`
- `Buckets` (`Buckets`, `Bucket`, `Item`)
- `CodeReview` (`CodeReview`, `ReviewFile`, `ReviewIssue`, `Why`)
- `Dropdowns` (`Dropdowns`, `Choice`)
- `Matching` (`Matching`, `Pair`)
- `MultipleChoice` (`MultipleChoice`, `Choice`, `Why`)
- `PredictOutput` (`PredictOutput`, `Why`)
- `Sequence` (`Sequence`, `Step`)
- `TextAnswer` (`TextAnswer`, `Why`)
- `TrueFalse` (`TrueFalse`, `Statement`, `Why`)

---

## UI → [`ui/`](./ui/)

Lesson UI elements.

| Choice | Reach for it when… | Doc |
| --- | --- | --- |
| `SandboxCallout` | Expandable container, lazy loading. Embedding an interactive code sandbox for optional free exploration. | [sandbox-callout.md](./ui/sandbox-callout.md) |
| `VideoCallout` | Expandable container, lazy loading. Embedding a YouTube video as supplementary material. | [video-callout.md](./ui/video-callout.md) |

---

## Quiz → `quiz/` *(not yet documented)*

- `Quiz`

---
