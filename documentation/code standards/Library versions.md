# Library versions

Pinned versions for all course libraries. Source: npm registry latest. Checked 2026-05-24. Format: `name@exact`.

## Runtime
node@24.16.0 (LTS) · pnpm@11.2.2 · mise@2026.5.15

## Packages
typescript@6.0.3
tsx@4.22.3
@types/node@25.9.1
react@19.2.6
react-dom@19.2.6
@types/react@19.2.15
@types/react-dom@19.2.3
next@16.2.6
@next/bundle-analyzer@16.2.6
tailwindcss@4.3.0
@tailwindcss/postcss@4.3.0
shadcn@4.8.0
radix-ui@1.4.3
@radix-ui/react-slot@1.2.4
class-variance-authority@0.7.1
clsx@2.1.1
tailwind-merge@3.6.0
next-themes@0.4.6
@biomejs/biome@2.4.15
babel-plugin-react-compiler@1.0.0
eslint-plugin-react-hooks@7.1.1
drizzle-orm@0.45.2
drizzle-kit@0.31.10
drizzle-zod@0.8.3
postgres@3.4.9
@t3-oss/env-nextjs@0.13.11
uuidv7@1.2.1
zod@4.4.3
resend@6.12.3
react-email@6.3.2
@react-email/components@1.0.12
better-auth@1.6.11
nuqs@2.8.9
stripe@22.1.1
@trigger.dev/sdk@4.4.6
@aws-sdk/client-s3@3.1053.0
@upstash/redis@1.38.0
@upstash/ratelimit@2.0.8
@tanstack/react-query@5.100.14
zustand@5.0.13
next-intl@4.12.0
temporal-polyfill@0.3.2
vitest@4.1.7
@vitest/coverage-v8@4.1.7
msw@2.14.6
@playwright/test@1.60.0
@testing-library/react@16.3.2
@testing-library/jest-dom@6.9.1
vite-tsconfig-paths@6.1.1
@sentry/nextjs@10.53.1
pino@10.3.1
posthog-js@1.376.0
posthog-node@5.35.1
@vercel/analytics@2.0.1
@lhci/cli@0.15.1
ai@6.0.191
@ai-sdk/anthropic@3.0.79
@ai-sdk/openai@3.0.65
@ai-sdk/google@3.0.79
dompurify@3.4.5

## Constraints
- Keep version-locked: `next` == `@next/bundle-analyzer`; `vitest` == `@vitest/coverage-v8`; `tailwindcss` == `@tailwindcss/postcss`. `drizzle-orm` and `drizzle-kit` are NOT version-paired in the 0.x line — pair `drizzle-orm@0.45.x` with `drizzle-kit@>=0.31.4` per Better Auth's peer range.
- `better-auth` orgs/RBAC plugin ships in-package; no separate install.
- R2 uses `@aws-sdk/client-s3` (S3-compatible).
- Drizzle uses `postgres` (postgres-js) as the driver, imported via `drizzle-orm/postgres-js`.
- Zod helpers (`createSelectSchema`, `createInsertSchema`, `createUpdateSchema`, `createSchemaFactory`) come from the separate `drizzle-zod` package in the 0.45 line. They move into the `drizzle-orm/zod` subpath when the project moves to Drizzle 1.0 (see note below).
- **Drizzle 1.0 migration is deferred** until Better Auth ships with `drizzle-orm@^1.0` support — tracked in [better-auth#6766](https://github.com/better-auth/better-auth/issues/6766) and [PR #9489](https://github.com/better-auth/better-auth/pull/9489), targeting better-auth 1.8 or later. When that lands: bump `drizzle-orm` and `drizzle-kit` to `^1.0`, drop `drizzle-zod`, and rewrite the four **Data layer (Drizzle)** bullets flagged in `Code conventions.md`.
- `babel-plugin-react-compiler`, `eslint-plugin-react-hooks`, `@types/*`, `@testing-library/*`, `vite-tsconfig-paths`, `@vitest/coverage-v8`, `@tailwindcss/postcss` are devDependencies.
