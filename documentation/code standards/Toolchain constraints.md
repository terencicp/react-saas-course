# Toolchain constraints

Configuration knobs the toolchain forces, breaks, or mishandles. Plans locking these must follow the listed resolution. Append entries when reviewer/corrector finds a new framework conflict.

## Next.js 16

- **`tsconfig.json: "jsx"`** — `next build` rewrites `"preserve"` → `"react-jsx"` ("mandatory change"). Pin `"jsx": "react-jsx"` in plans.
- **`next-env.d.ts`** — auto-regenerated with double-quoted imports, conflicts with Biome `quoteStyle: 'single'`. Exclude from Biome: `"files": { "includes": ["**", "!next-env.d.ts"] }`.
- **Multi-lockfile warning** — emitted when a parent dir has its own lockfile (monorepo case). Silence with `turbopack: { root: __dirname }` in `next.config.ts`.
- **`tsconfig.json` auto-injection** — each `next build` injects `"allowJs": true`, appends `".next/dev/types/**/*.ts"` to `include`, reformats arrays multiline, prints "mandatory change." Bake both into plans' locked `tsconfig.json` so slices running `next build` don't re-introduce drift.
- **Cache Components + slot `default.tsx` re-export** — under `cacheComponents: true`, parallel-route slot `default.tsx` files re-exporting their `page.tsx` (`export { default } from './page'`) propagate the page's dynamic data reads into sibling routes' prerender. The slot-scoped `@<slot>/loading.tsx` only acts as a Suspense boundary for the slot's *own* `page.tsx`, not when composed into a sibling route. Result: build fails with "Uncached data was accessed outside of `<Suspense>`" on every sibling route. Resolution: add segment-level `loading.tsx` at the parallel-routes parent (`app/<segment>/loading.tsx`), or move dynamic reads behind `'use cache'`. Hand-written `<Suspense>` is last resort; segment-level `loading.tsx` is the cleanest seam.
- **Parallel routes implicit `children` slot needs `default.tsx`** — when a layout declares named slots, the implicit `children` slot also needs its own `default.tsx` at the same level. Without it, URLs matching only the named slots return HTTP 404 even when the named slots render. Always enumerate `app/<segment>/default.tsx` alongside `@<slot>/default.tsx` files in plans.
- **`typedRoutes: true` + dynamic href strings** — template-literal `href={`/path/${id}`}` and `router.push("/path?x=y")` with built strings fail typecheck because `Route` is a branded string union. Resolution: cast site-by-site (`as Route` or `as Parameters<typeof router.push>[0]`), or route href construction through a typed helper. Plans flipping `typedRoutes: true` should pre-state the cast pattern.
- **`new Date()` in Server Components under Cache Components** — reading `new Date()` (or any IO clock source) inside a Server Component without first awaiting a dynamic source breaks `next build` under `cacheComponents: true`. Surfaces most often in inherited footers (`© {new Date().getFullYear()}`). Resolution: hardcode the literal year, move into a Client Component, or precede the read with an `await` on a dynamic source.

## Biome 2.4

- **`css.parser.tailwindDirectives`** — Tailwind v4 directives (`@theme`, `@apply`, `@custom-variant`, `@import "tailwindcss"`) emit parse errors without this flag. Always include `"css": { "parser": { "tailwindDirectives": true } }` in `biome.json`.
- **`lint/performance/noImgElement` (next domain)** — the `next` domain warns on raw `<img>`. Plans mandating raw `<img>` (theme-aware image swaps, plain logos) must override: `"lint": { "rules": { "performance": { "noImgElement": "off" } } }`.
- **`files.includes` folder-glob normalization** — `useBiomeIgnoreFolder` rejects `"!folder/**"` and `biome check --write` auto-strips to `"!folder"`. Plans pinning the `/**` suffix on ignore entries fail `biome ci` until rewritten. Write folder ignores without trailing glob: `["!.next", "!node_modules"]`, not `["!.next/**", "!node_modules/**"]`.
- **`<ul role="list">` Safari VoiceOver workaround** — the standard Safari fix for `list-style: none` stripping AT list semantics trips both `lint/a11y/noRedundantRoles` and `lint/a11y/useSemanticElements`. Both must be silenced for any element carrying the role. Resolution: suppress per-element with two `biome-ignore` comments, or disable both rules globally in `biome.json` when the project commits to the workaround. Architects mandating the role must pre-declare the chosen reconciliation.

## Shadcn UI

- **Primitive formatting** — `pnpm dlx shadcn add` writes primitives with double quotes and `import * as React` (not `import type`), triggering Biome warnings on first lint. Accept on first commit; let `pnpm check --write` normalize.
- **Radix umbrella package** — recent shadcn installs depend on `radix-ui` (umbrella) rather than per-primitive `@radix-ui/react-*`. Pin `radix-ui@^1.4.3` instead of enumerating per-primitive deps.
- **`Card` has no `asChild` slot** — shadcn's `Card` renders a `<div>` with no `asChild` prop, so it can't be retargeted to `<article>` or other semantic roots. Plans needing a semantic root (e.g. `FeatureCard` typed as `ComponentProps<'article'>`) must inline `Card`'s container classes onto the chosen element and nest `CardHeader` / `CardTitle` / `CardDescription` inside, rather than wrapping `Card`. Compose-by-hand, don't double-wrap.
- **Radix primitives ship `'use client'`** — `dialog`, `sheet`, `separator`, and other Radix-wrapping primitives carry the directive. Any verification check counting `'use client'` files must include the installed `components/ui/*` set, not just authored islands.

## Postgres 18 (Docker)

- **Volume mount path** — Postgres 18 official image expects volume at `/var/lib/postgresql`, not the historic `/var/lib/postgresql/data`. Old path causes restart-loop crash on first boot. Use:
  ```yaml
  volumes:
    - pgdata:/var/lib/postgresql
  ```
- **`@neondatabase/serverless` cannot reach vanilla Postgres** — the Neon driver speaks HTTP/WebSocket only, not Postgres wire protocol; against local Docker it errors before connect. For local Docker chapters, use `pg` + `drizzle-orm/node-postgres` (and `serverExternalPackages: ['pg']` in `next.config.ts`). Neon driver is correct only when targeting Neon (or a `wsproxy` sidecar).

## Drizzle 1.0 (rc)

- **No runtime `casing` option** — `casing: 'snake_case'` on `drizzle({...})` and on top-level `Config` was removed; pass explicit snake_case column names in `pgTable` (`uuid('organization_id')`, `timestamp('created_at', { withTimezone: true })`) or use `pgTableCreator` with a casing fn.
- **Migration directory layout** — `drizzle-kit generate` emits `drizzle/<timestamp>_<name>/{migration.sql, snapshot.json}`; the historic `drizzle/<NNNN>_<name>.sql` + `drizzle/meta/` shape is gone. Renaming the timestamp prefix breaks the journal lookup. Plans must lock the per-migration-directory shape.
- **`drizzle-seed` `with` keys are table names, not relation aliases** — refining a parent with children uses the schema's table binding (`with: { invoiceLines: [...] }`), not the relation alias (`lines:`). Junction tables hand-populated post-seed need `{ count: 0 }` in the refine to suppress the default fill.
- **Relations v2 requires 1.0.0+** — `defineRelations(schema, (r) => ...)`, object-filter `where`, and `r.one.<table>({ from, to, alias })` only exist on the 1.0 line. Plans using this API must pin `drizzle-orm@^1.0.0-rc.x` and `drizzle-kit@^1.0.0-rc.x` together (mismatched majors fail at kit-read time). `r.one` relations default to `optional: true`; mark `optional: false` on relations backed by NOT NULL FKs so query result types stay non-nullable.
