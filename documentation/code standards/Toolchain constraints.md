# Toolchain constraints

Configuration knobs the toolchain forces, breaks, or mishandles. Plans that lock any of these knobs must follow the listed resolution. Append entries when reviewer or corrector surfaces a new framework conflict.

## Next.js 16

### `tsconfig.json: "jsx"`
Next rewrites `"preserve"` → `"react-jsx"` on every `next build` and prints "mandatory change." Pin `"jsx": "react-jsx"` in plans.

### `next-env.d.ts`
Auto-regenerated on each build with double-quoted imports, conflicting with Biome `quoteStyle: 'single'`. Exclude from Biome: `"files": { "includes": ["**", "!next-env.d.ts"] }`.

### Multi-lockfile warning
Next emits a workspace-root warning when a parent directory has its own lockfile (common in this monorepo). Set `turbopack: { root: __dirname }` in `next.config.ts` to silence.

### `tsconfig.json` auto-injection
Each `next build` injects `"allowJs": true` and appends `".next/dev/types/**/*.ts"` to `include`, reformats arrays multiline, and prints "mandatory change." Bake both into plans' locked `tsconfig.json` — otherwise every slice that runs `next build` re-introduces them and reviewers flag the drift.

### Cache Components + slot `default.tsx` re-export
Under `cacheComponents: true`, parallel-route slot `default.tsx` files that re-export their `page.tsx` (`export { default } from './page'`) propagate the page's dynamic data reads into sibling routes' prerender. The slot-scoped `@<slot>/loading.tsx` only acts as a Suspense boundary for the slot's *own* `page.tsx`, not for the slot composed into a sibling route. Result: build fails with "Uncached data was accessed outside of `<Suspense>`" on every sibling route. Resolution: add a segment-level `loading.tsx` at the parallel-routes parent (`app/<segment>/loading.tsx`), or move dynamic reads behind `'use cache'`. Hand-written `<Suspense>` is the last resort; the segment-level `loading.tsx` is the cleanest seam.

### Parallel routes implicit `children` slot needs `default.tsx`
When a layout declares named slots, the implicit `children` slot also needs an explicit `default.tsx` at the same level. Without it, URLs that match only the named slots return HTTP 404 even when the named slots render. Always enumerate `app/<segment>/default.tsx` alongside `@<slot>/default.tsx` files in plans.

### `typedRoutes: true` + dynamic href strings
Template-literal `href={`/path/${id}`}` and `router.push("/path?x=y")` with built strings fail typecheck because `Route` is a branded string union. Resolution: cast the href argument site-by-site (`as Route` or `as Parameters<typeof router.push>[0]`), or route href construction through a typed helper. Plans that flip `typedRoutes: true` should pre-state the cast pattern they expect.

### `new Date()` in Server Components under Cache Components
Reading `new Date()` (or any IO clock source) inside a Server Component without first awaiting a dynamic source breaks `next build` under `cacheComponents: true`. Surfaces most often in inherited site footers (`© {new Date().getFullYear()}`). Resolution: hardcode the literal year, move the line into a Client Component, or precede the read with an `await` on a dynamic source.

## Biome 2.4

### `css.parser.tailwindDirectives`
Tailwind v4 directives (`@theme`, `@apply`, `@custom-variant`, `@import "tailwindcss"`) emit parse errors without this flag. Always include `"css": { "parser": { "tailwindDirectives": true } }` in `biome.json`.

### `lint/performance/noImgElement` (next domain)
The `next` domain warns on raw `<img>`. Plans that mandate raw `<img>` (theme-aware image swaps, plain logos) must override the rule: `"lint": { "rules": { "performance": { "noImgElement": "off" } } }`.

### `files.includes` folder-glob normalization
Biome 2.4's `useBiomeIgnoreFolder` rejects `"!folder/**"` and `biome check --write` auto-strips it to `"!folder"`. Plans that pin the `/**` suffix on ignore entries fail `biome ci` until rewritten. Always write folder ignores without the trailing glob: `["!.next", "!node_modules"]`, not `["!.next/**", "!node_modules/**"]`.

### `<ul role="list">` Safari VoiceOver workaround
The standard Safari fix for `list-style: none` stripping AT list semantics (`<ul role="list">`) trips two recommended a11y rules at once: `lint/a11y/noRedundantRoles` and `lint/a11y/useSemanticElements`. Both must be silenced for any element carrying the role. Resolution: either suppress per-element with two `biome-ignore` comments, or disable both rules globally in `biome.json` when the project commits to the workaround. Architects that mandate the role must pre-declare the chosen reconciliation.

## Shadcn UI

### Primitive formatting
`pnpm dlx shadcn add` writes primitives with double quotes and `import * as React` (not `import type`), triggering Biome warnings on first lint. Accept on first commit; let `pnpm check --write` normalize them.

### Radix umbrella package
Recent shadcn installs depend on `radix-ui` (umbrella) rather than per-primitive `@radix-ui/react-*`. Plans should pin `radix-ui@^1.4.3` instead of enumerating per-primitive deps.

### `Card` has no `asChild` slot
Shadcn's `Card` primitive renders a `<div>` with no `asChild` prop, so it cannot be retargeted to `<article>` or other semantic roots. Plans that need a semantic root (e.g. `FeatureCard` typed as `ComponentProps<'article'>`) must inline the `Card` container classes onto the chosen element and nest `CardHeader` / `CardTitle` / `CardDescription` inside, rather than wrapping `Card`. Compose-by-hand, don't double-wrap.

## Postgres 18 (Docker)

### Volume mount path
The Postgres 18 official image expects the volume at `/var/lib/postgresql`, not the historic `/var/lib/postgresql/data`. The old mount path causes the container to crash in a restart loop on first boot. Always use:
```yaml
volumes:
  - pgdata:/var/lib/postgresql
```

## Pinned versions

### `babel-plugin-react-compiler`
`^19.0.0` does not exist on npm. Stable graduated as `1.0.0` in Next 16. Pin `^1.0.0`.
