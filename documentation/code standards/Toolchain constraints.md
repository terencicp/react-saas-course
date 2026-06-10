# Toolchain constraints

Config knobs the toolchain forces, breaks, or mishandles. Plans locking these must follow the listed fix. Append entries when reviewer/corrector finds a new framework conflict.

## Next.js 16

- **`tsconfig.json` drift** — every `next build` rewrites/injects values; bake all of these into the locked `tsconfig.json` so it's idempotent from build 1:
  - `"jsx": "react-jsx"` (build rewrites `"preserve"`; mandatory).
  - `"skipLibCheck": true` (added every run; omitting it also breaks standalone `tsc --noEmit` under a monorepo whose parent `node_modules` hoists incompatible `@types/*`, e.g. `@types/mdx` → "Cannot find namespace 'JSX'").
  - `"incremental": true` (injected on first run; composes with `"noEmit": true`).
  - `include` must contain **both** `".next/types/**/*.ts"` and `".next/dev/types/**/*.ts"` — Next 16.2.x re-requests both across successive builds though only `.next/types/` is generated; committing one leaves it drifting.
  - `allowJs`: build suggests `true` but only when absent — an explicit `"allowJs": false` survives, so set it explicitly if you don't want it.
  - Only `jsx`/`module`/`moduleResolution`/`esModuleInterop`/`isolatedModules`/`resolveJsonModule` are "mandatory" rewrites; `include` and `allowJs` are "suggested."
- **`next-env.d.ts`** — auto-regenerated with double-quoted imports, conflicts with Biome `quoteStyle: 'single'`. Exclude: `"files": { "includes": ["**", "!next-env.d.ts"] }`.
- **Multi-lockfile warning** (parent dir has its own lockfile) — silence with `turbopack: { root: __dirname }` in `next.config.ts`.
- **`typedRoutes: true` + dynamic href strings** — template-literal `href={`/path/${id}`}` and `router.push("/path?x=y")` fail typecheck (`Route` is a branded union). But the augmentation lives in `.next/types/link.d.ts` and `next-env.d.ts` only references `routes.d.ts`, so **`tsc --noEmit` silently passes** unless you add `/// <reference path="./.next/types/link.d.ts" />` to `next-env.d.ts`. Fix: cast site-by-site (`as Route`, `as Parameters<typeof router.push>[0]`) or route href construction through a typed helper. Plans flipping this must pre-state both the reference-path wiring and the cast pattern.
- **`reactCompiler: true`** — Next 16 doesn't bundle the Babel plugin it runs through; build fails "Failed to resolve package babel-plugin-react-compiler". Pin `babel-plugin-react-compiler` (stable `1.0.0`) as a devDep.
- **pnpm blocks `sharp` native build → `next build` fails on cold install** — Next pulls `sharp` transitively; pnpm 10+ (pinned `11.3.0`) won't run its native build unattended. `pnpm install` only warns, but `next build` re-runs the dep-status check and surfaces a hard `ERR_PNPM_IGNORED_BUILDS` (only on a cold `node_modules` — ships latent). Ship `pnpm-workspace.yaml` (no `packages:` key) with exactly `allowBuilds:\n  sharp: true` in **both** `solution/` and `start/`; overwrite the stub create-next-app emits. pnpm 11 removed `onlyBuiltDependencies`/`ignoredBuiltDependencies`/`neverBuiltDependencies`/`onlyBuiltDependenciesFile` and no longer reads `package.json#pnpm` — `allowBuilds` (map of `pkg: true|false`) is the sole replacement. `strictDepBuilds` defaults `true`, so an unlisted/placeholder native build is a hard error. Needed even without `next/image`. (pnpm 11.3.0, June 2026.)

### Cache Components (`cacheComponents: true`)

- **Uncached request-time reads need a `<Suspense>` seam** — a Server Component page reading uncached live data (DB query, `fetch` `no-store`) in its body fails `next build` prerender with "Uncached data was accessed outside of `<Suspense>`", even after `await searchParams`/`await params` (that marks the route dynamic but doesn't wrap reads). Cheapest fix: ship segment-level `app/<segment>/loading.tsx` (default export) → route builds as Partial Prerender. `'use cache'` or hand-written `<Suspense>` are alternatives; `loading.tsx` is cleanest. Enumerate it in the file tree for any per-request live-data page.
- **Slot `default.tsx` re-export propagates dynamic reads** — a parallel-route slot `default.tsx` doing `export { default } from './page'` pushes the page's dynamic reads into sibling routes' prerender (the slot's own `@<slot>/loading.tsx` only guards its own `page.tsx`), failing every sibling with the same error. Fix: segment-level `loading.tsx` at the parallel-routes parent, or move reads behind `'use cache'`.
- **`new Date()` / IO clock in a Server Component** without first awaiting a dynamic source breaks the build (common in `© {new Date().getFullYear()}` footers). Fix: hardcode the year, move to a Client Component, or precede with an `await` on a dynamic source.

### Parallel routes

- **Implicit `children` slot needs its own `default.tsx`** — when a layout declares named slots, the implicit `children` slot also needs `app/<segment>/default.tsx`. Without it, URLs matching only named slots render HTTP 200 with the named slots fine but the children area showing Next's 404 fallback (`NEXT_HTTP_ERROR_FALLBACK;404`). Always enumerate `default.tsx` for `children` alongside each `@<slot>/default.tsx`.
- **A slot returning a fragment flattens into the parent layout** — `<><A /><B /></>` adds no wrapper, so when the layout drops `{slot}` into a `grid`/`flex` container each child becomes its own grid/flex item (a one-slot region silently splits into several cells). Each multi-child slot return must resolve to a single wrapping element. (Ch. 035.)

## TypeScript 6

- **`baseUrl` is a hard error** — `typescript@latest` is 6.x; TS 6 makes `baseUrl` an error (`TS5101`, exits 1), failing standalone `tsc` in `pnpm verify`. `next build`'s own typecheck does NOT surface it → ships latent if the gate is build-only. Fix: drop `baseUrl`; `"paths": { "@/*": ["./src/*"] }` resolves without it under `moduleResolution: "bundler"`, and Next doesn't re-inject it. (Non-preferred alt: keep `baseUrl` + `"ignoreDeprecations": "6.0"`.)

## Biome 2.4

- **`css.parser.tailwindDirectives`** — Tailwind v4 directives (`@theme`, `@apply`, `@custom-variant`, `@import "tailwindcss"`) emit parse errors without `"css": { "parser": { "tailwindDirectives": true } }`.
- **`lint/performance/noImgElement`** warns on raw `<img>` (no `next` domain in Biome 2.4). Plans mandating raw `<img>` must set `"lint": { "rules": { "performance": { "noImgElement": "off" } } }`.
- **`files.includes` folder globs** — write ignores without trailing `/**` (`biome check --write` auto-strips it and `biome ci` rejects the pinned suffix): `["!.next", "!node_modules"]`.
- **`<ul role="list">` (Safari VoiceOver fix)** trips `lint/a11y/noRedundantRoles`. Fix: per-element `biome-ignore`, or disable the rule globally; architects mandating the role must pre-declare the choice.
- **`lint/suspicious/noArrayIndexKey` on static placeholder lists** — errors on `Array.from({length:8}).map((_,i) => <li key={i}>)` even when non-reorderable, and a `biome-ignore` above `.map` doesn't suppress the nested `<li key={i}>` (biomejs/biome#9469). Fix: map over a stable string-key tuple (`const KEYS = ['row-0', …] as const`) or use fixed explicit elements. Skeletons ship the tuple up front.
- **`pnpm check --write` doubles the flag** — the script is `"check": "biome check --write ."`, so appending `--write` runs `biome check --write . --write` (rejected). Just run `pnpm check`.

## Shadcn UI

- **CLI v4 init defaults to Base UI — pass `--base radix`** — v4 (March 2026) replaced `style` with presets. `init -y` still prompts (hangs CI); `init -y -d` skips prompts but defaults to preset `base-nova` → installs Base UI (`@base-ui/react`), clashing with a `radix-ui`-locked plan. Use `init -y -d --base radix` → `"style": "radix-nova"`, `iconLibrary: lucide`, Radix umbrella kept. `add` also needs `-y` (else prompts to create `components.json`). Side-effect: a bare `init` adds `shadcn` (sometimes `msw`) to `dependencies` — strip them (registry tooling, not app deps). (shadcn@4.10, June 2026.)
- **Radix umbrella package** — v4-style presets depend on the `radix-ui` umbrella, not per-primitive `@radix-ui/react-*`. Pin `radix-ui@^1.4.3`.
- **Primitive formatting** — `pnpm dlx shadcn add` writes double quotes + `import * as React` (not `import type`), triggering Biome warnings; accept on first commit, let `pnpm check --write` normalize.
- **`Card` has no `asChild`** — renders a `<div>`, can't retarget to `<article>`. Plans needing a semantic root must inline Card's container classes onto the chosen element and nest `CardHeader`/`CardTitle`/`CardDescription`, not wrap `Card`.
- **Radix primitives ship `'use client'`** (`dialog`, `sheet`, `separator`, …). Any verification counting `'use client'` files must include installed `components/ui/*`, not just authored islands.

## eslint-plugin-react-hooks 7 (Compiler diagnostics)

- **`flat.recommended` has no `files` glob or parser** — it's a bare rules/plugins object. Spread alone on a TS-only project, ESLint 9 matches nothing (default extensions exclude `.ts`/`.tsx`) and `eslint .` exits 0 having linted zero files — silently inert. Add `files: ['**/*.{ts,tsx}']` and `languageOptions: { parser: tseslint.parser }` (ship `typescript-eslint@^8.60` devDep) inside the spread. Verify non-vacuously: a `--print-config` on a `.tsx` must report it checked, not "File ignored…".
- **`react-hooks/set-state-in-effect` false-positives the next-themes mount gate** — flags the canonical `useEffect(() => setMounted(true), [])` (facebook/react#34743). Plans locking that gate AND wiring this layer must set `'react-hooks/set-state-in-effect': 'off'`; other compiler diagnostics stay on.

## lucide-react 1.x

- **All brand icons removed** — 1.0 dropped `Github`/`Twitter`/`Linkedin`/`Youtube`/`Facebook`/`Instagram`/`Slack`/`Gitlab`/…; importing throws "export X doesn't exist" and fails `next build`. Use non-brand glyphs that still ship (`Mail`, `MessageCircle`, `Globe`, `Rss`, `Send`, `AtSign`, `Share2`) or a separate brand-icon package (Simple Icons). Never reference brand-name lucide icons.

## Tailwind CSS 4

- **`scale-*` sets the CSS `scale` property, not `transform`** — `scale-105` compiles to `scale: …`, so `getComputedStyle(el).transform` is always `"none"`. Rendered checks must read the computed `scale` (e.g. `"1.05"`), never `transform` (a `transform` assertion passes in both states — not falsifiable).
- **`motion-reduce:` must stack under the responsive variant** — a bare `motion-reduce:scale-100` is inert against `md:scale-105` (v4 emits `motion-reduce:` earlier in source order; equal specificity → `md:` wins). Stack as `md:motion-reduce:scale-100`. Plans pairing a responsive transform with a reduced-motion fallback must stack the fallback under the same breakpoint.

## React Email 6

Unified package `react-email@^6.5.0` exports every primitive (`Body`, `Button`, `Container`, `Head`, `Heading`, `Html`, `Img`, `Link`, `Preview`, `Row`, `Section`, `Tailwind`, `Text`, …) plus `pixelBasedPreset`, `render`, and the `email` CLI bin. Import from `react-email`, never `@react-email/components` (deprecated).

- **`email dev` blocks on an interactive `@react-email/ui` install prompt** — that UI isn't bundled or pulled transitively; `email dev` without it prints "the package @react-email/ui must be installed. … (Y/n)" and hangs (fails in CI). Ship `@react-email/ui@^6.<minor>` (match the `react-email` minor) as a devDep — build-time tooling, never imported.
- **`<title>` with interpolated text needs a template literal** — raw `<title>Welcome to {appName}</title>` makes `children` a two-node Array, which React rejects at render (error log, pollutes the Next overlay / console-error sweeps though it doesn't fail the build). Write `` <title>{`Welcome to ${appName}`}</title> ``. React Email's `<Preview>` tolerates the split form.
- **Preview server runs in its own `.react-email` dir** — templates under `src/emails/` must import siblings with same-folder relative paths (`./email-tailwind-config`), never `@/` aliases, and read NO `process.env`/`NEXT_PUBLIC_*` (undefined there) — keep chrome on module-level literal constants.

## Resend 6

`resend@^6.12.4`. Send shape: `resend.emails.send(payload, options?)`. `payload` accepts `react: React.ReactNode`, `replyTo?: string | string[]` (camelCase), `to: string | string[]`, `from`, `subject`. The second `options` arg carries `idempotencyKey?: string` (not a payload field or manual header). Returns `{ data, error }` — never throws on a normal failure.

## Better Auth 1.6 (Drizzle adapter + organization plugin)

- **Plugin-owned ids are `text`, not `uuid`** — `auth:generate` emits every table id (`user.id`, `organization.id`, `member.id`, `invitation.id`, …) as `text` (base62 random, not a UUID). A hand-authored FK column typed `uuid` referencing one passes `tsc` (Drizzle `.references()` doesn't check type compat) but `drizzle-kit migrate` fails at apply: "incompatible types: uuid and text". Declare FK columns to Better Auth tables as `text`. A standalone PK with no incoming FK may still be `uuid`/`uuidv7()`. Knock-on: any RLS `current_setting(...)::uuid` cast on such a column must drop the cast.
- **Hand-rolled `tx.insert` into a plugin table must supply `id` (and any no-default column)** — the plugin's own write path generates `id`/`createdAt`, but the generated `id text primaryKey()` has no DB default and some `createdAt` lack `defaultNow()`. Direct `tx.insert(member|invitation)` (e.g. same-tx audit row, bypassing `auth.api.*`) must pass `id: crypto.randomUUID()`, `createdAt: new Date()`. Seed inserts too.
- **`z.uuid()` rejects plugin ids** — use `z.string().min(1)` for plugin-id inputs in action schemas.
- **`additionalFields` inviter relation is aliased by the FK target** — the generated `invitationRelations` names the `one(user, …)` join on `invitation.inviterId` as `user` (the target table), not `inviter`. Use `with: { user: true }` and read the inviter off `.user`. (Better Auth `additionalFields` type-inference on `auth.api.*` returns is buggy — better-auth#5122 — so the Drizzle `$inferSelect` table type is the source of truth for plugin columns.)
- **Regenerating clobbers hand edits** — `pnpm auth:generate` overwrites the schema file wholesale; an index/constraint added to a plugin table's Drizzle callback is silently dropped. Add such indexes as a `--custom` migration, never a callback edit.

## Postgres 18 (Docker)

- **Volume mount path** — PG 18 stores data under `/var/lib/postgresql/18/docker`. Mount the parent so `pg_upgrade --link` works across majors (`/var/lib/postgresql/data` is writable but breaks upgrades):
  ```yaml
  volumes:
    - pgdata:/var/lib/postgresql
  ```
- **`@neondatabase/serverless` cannot reach vanilla Postgres** — the Neon driver speaks HTTP/WebSocket only, not the wire protocol. For local Docker chapters use the pinned `postgres` (postgres-js) driver via `drizzle-orm/postgres-js` — wire protocol, bundles cleanly under Turbopack, no `serverExternalPackages` entry.
- **RLS `TO authenticated` fails — the role doesn't exist on Docker** — `drizzle-orm/neon`'s `authenticatedRole`/`crudPolicy` emit `CREATE POLICY … TO authenticated`, but `authenticated`/`anonymous` are Neon/Supabase roles; vanilla Docker has only `postgres`, so `db:migrate` fails the policy migration ("role authenticated does not exist") and drizzle-kit never creates it. Ship a `--custom` migration creating it idempotently, **ordered before** the first policy migration: `DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF; END $$;`. Roles are cluster-wide (one create suffices). The app still connects as superuser `postgres` (has `BYPASSRLS`); the role exists only so the DDL applies and a `SET ROLE authenticated` session can prove deny behavior.

## AWS SDK v3 (S3 client + presigner, Cloudflare R2)

`@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` pinned at the same `3.x` minor. Targeting Cloudflare R2 (not AWS S3):

- **The `3.x` default checksum behavior breaks R2 presigned PUTs** — since `3.729` the SDK defaults `requestChecksumCalculation`/`responseChecksumValidation` to `WHEN_SUPPORTED`, baking `x-amz-checksum-crc32` + `x-amz-sdk-checksum-algorithm=CRC32` into a signed `PutObjectCommand` URL (and `x-amz-checksum-mode=ENABLED` into a `GetObjectCommand` URL). R2 does not implement CRC32, and a browser `XMLHttpRequest` PUT that sends only `Content-Type` can't supply the checksum header → the upload fails (`Header 'x-amz-checksum-algorithm' with value 'CRC32' not implemented` / `SignatureDoesNotMatch`). Fix: construct the R2 `S3Client` with `requestChecksumCalculation: 'WHEN_REQUIRED'` and `responseChecksumValidation: 'WHEN_REQUIRED'`. With both set, the signed PUT URL carries only `content-length;content-type;host` in `X-Amz-SignedHeaders` and no checksum query params. (Confirmed against `@aws-sdk/client-s3@3.1065.0`, June 2026.)
- **`region: 'auto'` is mandatory** — the SigV4 signer requires a region; R2 ignores the value but errors without one.
- **The signed URL is virtual-hosted** — the SDK emits `https://<bucket>.<account-id>.r2.cloudflarestorage.com/<key>?…`, which is the form R2 expects. Do not set `forcePathStyle`. (The endpoint is `https://<account-id>.r2.cloudflarestorage.com`; the SDK prepends the bucket as a subdomain.)

## Drizzle 0.45

Pinned to `drizzle-orm@0.45.x` + `drizzle-kit@0.31.x` until Better Auth ships `drizzle-orm@^1.0` support ([better-auth#6766](https://github.com/better-auth/better-auth/issues/6766), target 1.8+). Constraints (with 1.0 deltas noted):

- **Runtime `casing` lives on the client** — `drizzle({ client, casing: 'snake_case', schema })` snake-cases all columns; per-column escape hatch is an explicit name (`uuid('organization_id')`). (1.0: flips to `pgTableCreator((name) => toSnakeCase(name), 'snake_case')`, second arg mandatory or columns stay camelCase.)
- **Migration layout is flat** — `generate` emits `drizzle/<timestamp>_<name>.sql` + top-level `drizzle/meta/_journal.json` + `<id>_snapshot.json`. Pass `--name <verb>_<noun>`; renaming the timestamp prefix breaks journal lookup. (1.0: per-migration dirs `drizzle/<timestamp>_<name>/{migration.sql,snapshot.json}`, no top-level `meta/`.)
- **Relations v1** — `relations(<table>, ({ many, one }) => ({…}))` per-table; `db.query.<table>.findMany({ with: {…} })` is N+1-safe. (1.0: single `defineRelations(schema, (r) => ({…}))`; `r.one` defaults `optional: true`, flip to `false` on NOT NULL FKs.)
- **Zod helpers in a separate package** — `createSelectSchema`/`createInsertSchema`/`createUpdateSchema` import from `drizzle-zod@^0.8` (peer `drizzle-orm@>=0.36`, `zod@^4`), not `drizzle-orm/zod`. (1.0: moves them under `drizzle-orm/zod`.)
- **`drizzle-seed` `with` keys are table names, not relation aliases** — `with: { invoiceLines: [...] }`, not `lines:`. Junction tables hand-populated post-seed need `{ count: 0 }` in the refine. (Both versions.)
- **`drizzle-seed@0.3.x` cannot seed constraint-heavy schemas — direct-insert, keep only `reset()`.** (vs `drizzle-seed@0.3.1` + `drizzle-orm@0.45`): (1) any `unique`/composite-unique throws "Values length equals zero." at `.refine()` (and `valuesFromArray({ isUnique: true })` throws even with an oversized pool) — [drizzle-orm#4354](https://github.com/drizzle-team/drizzle-orm/issues/4354); (2) the default `numeric` generator emits large negative out-of-precision values violating `check (col >= 0)` / `numeric(p,s)`; (3) `uuid` PKs get the generator's own **v4** value (its `uuid` branch fires before `hasDefault`), overriding `default(sql\`uuidv7()\`)` even when `id` is omitted — and those v4 ids aren't RFC-variant-valid, so Zod 4 `z.uuid()` rejects them; (4) `with`-fanned children don't inherit the parent's tenant FK (`organizationId`), and per-parent sequential columns (`position`) can't be expressed. Fix for these shapes: `reset(db, schema)` for the wipe, then direct-insert every row with a fixed-seed PRNG, leaving `uuid` PKs to the SQL default (direct inserts honor it). Reserve `.refine()` generators for unconstrained scratch tables.
- **`tsx`/`drizzle-kit` pull `esbuild` → pnpm ignored-build hard-fails `next build`** — they drag in `esbuild` majors pnpm 11.3.0 won't build unattended; even a warm `pnpm install` exits non-zero (`ERR_PNPM_IGNORED_BUILDS: esbuild`) and `next build` surfaces it (same mechanism as sharp). esbuild needs no build step (binary ships in `@esbuild/<platform>`), so acknowledge-but-skip: `allowBuilds: { sharp: true, esbuild: false }` in **both** `solution/` and `start/`.
- **CLI `import.meta.url` entry-point guard breaks on paths with spaces** — `if (import.meta.url === \`file://${process.argv[1]}\`)` no-ops silently when the path has a space (course dirs are `Chapter NNN/…`): `import.meta.url` percent-encodes it (`Chapter%20041`), `process.argv[1]` keeps it literal → always false, body never runs but exits 0. Use `import { pathToFileURL } from 'node:url'; const e = process.argv[1]; if (e && import.meta.url === pathToFileURL(e).href) {…}`.
