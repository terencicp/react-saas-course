---
name: mdx-writing
description: MDX parser gotchas. Use when writing or editing any .mdx file.
---

# MDX writing gotchas

- **Module-scope declarations must be exported.** Use `export const foo = ...` even when nothing imports it.
- **String literals at module scope are JSX-parsed.** A literal `'Promise<Result>'` inside `export const x = ...` is read as JSX and chokes on the unclosed tag. Break the substring up (`'Promise' + '<' + 'Result' + '>'`) or HTML-escape the brackets.
- **Inside `{/* TODO ... */}` placeholder blocks, wrap any `<`, `>`, `{`, `}` in backticks** so the MDX parser doesn't try to parse them as JSX/expression syntax.
