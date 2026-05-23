# Toolchain constraints

Configuration knobs the toolchain forces, breaks, or mishandles. Plans that lock any of these knobs must follow the listed resolution. Append entries when reviewer or corrector surfaces a new framework conflict.

## Next.js 16

### `tsconfig.json: "jsx"`
Next rewrites `"preserve"` → `"react-jsx"` on every `next build` and prints "mandatory change." Pin `"jsx": "react-jsx"` in plans.

### `next-env.d.ts`
Auto-regenerated on each build with double-quoted imports, conflicting with Biome `quoteStyle: 'single'`. Exclude from Biome: `"files": { "includes": ["**", "!next-env.d.ts"] }`.

### Multi-lockfile warning
Next emits a workspace-root warning when a parent directory has its own lockfile (common in this monorepo). Set `turbopack: { root: __dirname }` in `next.config.ts` to silence.

## Biome 2.4

### `css.parser.tailwindDirectives`
Tailwind v4 directives (`@theme`, `@apply`, `@custom-variant`, `@import "tailwindcss"`) emit parse errors without this flag. Always include `"css": { "parser": { "tailwindDirectives": true } }` in `biome.json`.

### `lint/performance/noImgElement` (next domain)
The `next` domain warns on raw `<img>`. Plans that mandate raw `<img>` (theme-aware image swaps, plain logos) must override the rule: `"lint": { "rules": { "performance": { "noImgElement": "off" } } }`.

## Shadcn UI

### Primitive formatting
`pnpm dlx shadcn add` writes primitives with double quotes and `import * as React` (not `import type`), triggering Biome warnings on first lint. Accept on first commit; let `pnpm check --write` normalize them.

### Radix umbrella package
Recent shadcn installs depend on `radix-ui` (umbrella) rather than per-primitive `@radix-ui/react-*`. Plans should pin `radix-ui@^1.4.3` instead of enumerating per-primitive deps.

## Pinned versions

### `babel-plugin-react-compiler`
`^19.0.0` does not exist on npm. Stable graduated as `1.0.0` in Next 16. Pin `^1.0.0`.
