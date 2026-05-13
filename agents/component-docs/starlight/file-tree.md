# `FileTree`

Renders a directory listing styled like an IDE sidebar: folders, files, file-type icons inferred from extension, and optional inline comments. Authored as a plain markdown unordered list inside the slot — no JSX per row.

## Import

```ts
import { FileTree } from '@astrojs/starlight/components';
```

## Props

None.

## Slot — authoring conventions

A single markdown unordered list. The component walks it and styles each row.

| Pattern | Effect |
| --- | --- |
| `- src/` | Trailing slash → folder. |
| `- file.ts` | No slash → file. Icon inferred from extension. |
| Nested `-` items | Subdirectory contents. Indent with two spaces per level. |
| `- **file.ts**` | Bold → highlighted as the focus of the diagram. |
| `- file.ts trailing words` | Anything after the filename renders as a dimmed comment. Inline markdown (`**bold**`, `*italics*`, `` `code` ``) works in the comment. |
| `- ...` or `- …` | Placeholder for "more files here, not shown". |
| `` - `weird name.ts` `` | Backtick-wrap filenames that contain spaces, underscores, or other special characters. |

## Constraints & gotchas

- Top-level slot content must be the unordered list — no prose before or after inside the slot.
- Folder vs file is decided **only** by the trailing slash. `src` alone renders as a file.
- Icons are extension-driven; nothing to configure. To explicitly pick a different look, use a code-fence elsewhere or rename in the diagram.

## Example

```mdx
import { FileTree } from '@astrojs/starlight/components';

<FileTree>
- package.json
- **astro.config.mjs** the file you'll edit
- src/
  - content/
    - docs/
      - index.mdx
      - …
  - components/
    - Header.astro
    - Footer.astro
- `README FIRST.md`
</FileTree>
```
