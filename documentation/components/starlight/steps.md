# `Steps`

Wraps a markdown ordered list and restyles it as a vertical numbered procedure — a big circled number per step, connector line between them, more breathing room than a default `<ol>`. Use when the reader is expected to follow the items in order; use a regular bullet list otherwise.

## Import

```ts
import { Steps } from '@astrojs/starlight/components';
```

## Props

None.

## Slot — what counts as a valid child

A **single top-level ordered list**. Each `<li>` becomes one numbered step.

- Numbering is automatic, starting at 1. The actual numbers you type (`1.`, `2.`, `1.`, `1.`) don't matter — markdown re-numbers them.
- Any markdown is allowed **inside** each `<li>`: paragraphs, code fences, sub-lists, components. Indent continuation lines by 3 spaces so markdown keeps them inside the same list item.
- Don't put prose, headings, or fences directly inside `<Steps>` — only the `<ol>`.

## Example

```mdx
import { Steps } from '@astrojs/starlight/components';

<Steps>
1. Install the dependency.

   ```bash
   npm install drizzle-orm
   ```

2. Create a connection module.

   ```ts
   // src/lib/db.ts
   import { drizzle } from 'drizzle-orm/postgres-js';
   export const db = drizzle(process.env.DATABASE_URL!);
   ```

3. Import `db` wherever you need it.
</Steps>
```
