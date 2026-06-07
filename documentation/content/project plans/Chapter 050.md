# Chapter 050 — Project plan: the welcome email send path

## Project goals

Cement the Unit 7 transactional-email disciplines by wiring one real send path end-to-end: a suppression-gated, idempotency-keyed `sendEmail` seam (`lib/email.ts`), a pure props-only React Email template (`emails/welcome.tsx`), and a five-seam Server Action (`app/actions/send-welcome.ts`) the provided inspector page fires.
The student practices: installing a single side-effect boundary as the chokepoint every future email flows through (Architectural Principle #3); reading a suppression list at the boundary and short-circuiting before the external call; defaulting `from`/`reply_to` from validated env; requiring an idempotency key so replays collapse; writing a template that reads only typed props (no env/DB/session) so it renders identically in preview, test, and production; composing a Server Action that parses first and returns a `Result` rather than throwing.
The codebase is deliberately minimal — one inspector route, one template, one action, one wrapper — so the student completes it quickly and the structural lesson (every send is "write the template, write the action, call `sendEmail`") lands without app-feature noise.

## Student position

The student has finished Units 1-6 plus Unit 7 chapters 048 (sender identity/deliverability) and 049 (authoring templates). They know: TypeScript strict, React 19, Next.js 16 App Router (Server/Client Components, Cache Components, Suspense), Tailwind v4, Postgres + Drizzle 0.45 (Relations v1, `casing: 'snake_case'`, `$inferSelect`), `@t3-oss/env-nextjs`, Zod 4 (`z.email()`, `z.strictObject`, `safeParse(Object.fromEntries(formData))`, `z.flattenError(err).fieldErrors`), Server Actions in the five-seam shape, `useActionState`, `useFormStatus`, the canonical `Result<T>` with seven error codes, Resend + the `sendEmail` wrapper shape, SPF/DKIM/DMARC, the `email_suppressions` table, and React Email primitives with `<Tailwind config>`, `pixelBasedPreset`, and `PreviewProps`.

Not yet known — do NOT use in the project:
- **Better Auth / real sessions.** No `cookies()`, no session reader. Identity comes only from `getActiveContext()` (the stub). The `verifyUrl` is a hardcoded placeholder with a `// TODO(Unit 8)` marker.
- **The bounce/complaint webhook writer** (Chapter 063) — `email_suppressions` is read-only here; rows arrive via the seed, never written by app code.
- **Marketing send path / `List-Unsubscribe` / Broadcasts** — transactional only; `kind: 'transactional'` is the only branch exercised.
- **`revalidatePath` / `revalidateTag`** — no list to revalidate on this surface.
- **TanStack Query, Zustand, nuqs, next-intl** — none introduced.
- **A generic `EmailProvider` adapter** — the wrapper is a thin convenience layer over Resend, never an abstraction (Principle #5).

## Scaffolding recipe

Fork the **Chapter 047 `solution/`** codebase, then strip the invoicing feature surface down to the email project's minimum. The scaffolder builds the full file tree below; the four student-owned files ship as compiling stubs carrying `TODO(L<n>)` markers (the slice-coders fill them).

### Fork then strip
Carry over unchanged: `tsconfig.json`, `biome.json`, `next.config.ts`, `drizzle.config.ts`, `docker-compose.yml`, `pnpm-workspace.yaml`, `vitest.config.ts`, `scripts/test-lesson.mjs`, `src/lib/result.ts`, `src/lib/auth-stub.ts`, `src/lib/utils.ts`, `src/db/columns.ts`, `src/app/globals.css`, `src/app/_components/providers.tsx`, `src/app/_components/field-error.tsx`, and `src/components/ui/{button,card,input,label,separator,skeleton,sonner}.tsx`.

Carry over with the small edits noted in the relevant sections: `src/db/index.ts` (drop the `...relations` spread, see Schema and seed changes), `src/app/layout.tsx` (literal app-name metadata, see Files to create now), and `src/app/_components/submit-button.tsx` (**widen its props to forward rest attributes** so the locked `send-button` `data-testid` reaches the DOM). The 047 `SubmitButton` types its props as `{ children: ReactNode; variant?: … }` and renders `<Button type="submit" variant={variant} disabled={pending}>` **without spreading rest props**; `data-*` attributes are universally accepted in JSX so `<SubmitButton data-testid="send-button">` still type-checks, but the attribute is silently dropped at runtime and the `send-button` selector never appears (verified: the `inspector-renders` Rendered check's `send-button` selector and the validation check's click target both fail). Change it to `type SubmitButtonProps = ComponentProps<typeof Button> & { children: ReactNode }` and render `<Button type="submit" disabled={pending} {...props}>{…}</Button>` (the underlying shadcn `Button` already spreads `...props`).

Delete (invoicing surface, not used here): `src/app/invoices/` (entire tree), `src/app/page.tsx` redirect target logic (replace per below), `src/lib/invoices/`, `src/db/queries/`, `src/db/cursor.ts`, `src/db/relations.ts` (re-author trimmed, see below), `src/components/ui/{badge,dialog,native-select}.tsx`, and `tests/lessons/Lesson {2,3,4,5,6}.test.ts`.

### Schema and seed changes
- `src/db/schema.ts`: keep `organizations` and `users` (auth-stub + seed need them). Drop `memberRole`/`invoiceStatus` enums, `orgMembers`, `customers`, `invoices`, `invoiceLines`. Add the canonical `emailSuppressions` table (carry-in from Chapter 048 L4 — do not drift; Chapter 063 writes it later):
  - `suppressionReason = pgEnum('suppression_reason', ['hard_bounce', 'soft_bounce_threshold', 'complaint', 'manual_unsubscribe'])`
  - `emailSuppressions` columns: `id` uuid PK `.default(sql\`uuidv7()\`)`; `email text().notNull().unique('email_suppressions_email_unique')` (normalized, load-bearing); `reason: suppressionReason().notNull()`; `providerEventId: text()` nullable; `bypassUntil: timestamp({ withTimezone: true })` nullable; `metadata: jsonb()` nullable; `...timestamps` (and an `updatedAt` peer alongside the inherited `createdAt` — both `timestamptz notNull defaultNow()`).
  - Export `EmailSuppression` / `NewEmailSuppression` types.
- `src/db/relations.ts`: delete (no relations needed — `emailSuppressions`, `organizations`, `users` are queried directly). Update `src/db/index.ts` `drizzle(client, { schema: { ...tables }, casing: 'snake_case' })` to spread only `tables` (drop the `...relations` spread and its import).
- `scripts/seed.ts`: re-author to a small deterministic seed. `reset(db, { organizations, users, emailSuppressions })`, then insert one org (`{ name: 'Acme', slug: 'acme' }`), one user (`{ name: 'Ada Lovelace', email: 'ada@acme.test' }`), and one pre-suppressed row: `{ email: 'suppressed@send.acme.example', reason: 'complaint' }`. Keep the `pathToFileURL` entry-point guard. The seeded suppression address is a placeholder the README tells the student to replace with `suppressed@send.<their-domain>` before `pnpm db:seed`.
- Generate a fresh init migration into `drizzle/` reflecting the trimmed schema (`drizzle-kit generate --name init_schema`).

### Dependencies to add
Production: `resend@^6.12.4`, `react-email@^6.5.0`, `server-only@^0.0.1`. (React Email 6 ships every primitive, `pixelBasedPreset`, `render`, and the `email dev` CLI from the single `react-email` package — do NOT add the deprecated `@react-email/components`.) `react-email`/`resend` are runtime; if peer warnings surface for `react`/`react-dom`, they are already at 19.2.4.
Dev: `@react-email/ui@^6.5.0`. (Verified against `react-email@6.5.0`: `@react-email/ui` is the preview-server's UI and is **NOT** pulled in transitively — running `email dev` without it prints `To run the preview server, the package "@react-email/ui" must be installed. Would you like to install it? (Y/n)` and **blocks on an interactive prompt**. Ship it as an explicit devDep so `pnpm email` boots non-interactively; it is build-time tooling only, never imported by app code.)
Remove from the fork (now-unused): `tw-animate-css` may stay (harmless, used by globals.css) — keep it. Keep `lucide-react`, `next-themes`, `radix-ui`, `sonner` (Toaster wired in layout), `clsx`, `tailwind-merge`, `class-variance-authority`, `uuidv7`, `drizzle-orm`, `postgres`, `zod`, `@t3-oss/env-nextjs`. Keep dev deps as-is; **Vitest** (`vitest@^4.1.8`) is already present in `devDependencies`.

### Scripts
`package.json` scripts: set `"verify": "biome ci . && tsc --noEmit && next build"` (replace the 047 variant that prefixed `next typegen`). Keep `"test:lesson": "node scripts/test-lesson.mjs"` (the node wrapper runs exactly one `tests/lessons/Lesson <Y>.test.ts` by absolute path — confirmed it narrows to one file, no glob OR-match). Add `"email": "email dev --dir ./src/emails --port 3001"` (React Email 6 preview server; `--dir` because templates live under `src/emails`, `--port 3001` per the 049 port-clash note). Keep `dev`, `build`, `start`, `format`, `lint`, `check`, `db:*`, `preinstall`.

### Lesson test files
Ship `tests/lessons/Lesson 3.test.ts` and `tests/lessons/Lesson 4.test.ts` as `describe.todo` placeholders (node env, no DOM). `project-lesson-test-coder` fills them later; each gate inlines its own helpers — no shared helpers module.

### Files to create now (provided)
Most of these are fully built; the five marked **stub** below ship compiling-but-incomplete with `TODO` markers (slice-coders fill them).
- `src/env.ts`: **stub** (`TODO(L3)`). Fork from 047, keep `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `SEED` intact (server block + runtimeEnv), and ship the five new keys **absent** so the app boots and `tsc` passes against the existing surface. S1 adds `RESEND_API_KEY`/`EMAIL_FROM`/`EMAIL_REPLY_TO` (server) and `NEXT_PUBLIC_APP_NAME`/`NEXT_PUBLIC_APP_URL` (client).
- `src/emails/email-tailwind-config.ts`: provided. Default export `emailTailwindConfig = { presets: [pixelBasedPreset], theme: { extend: { colors: { brand: '#4f46e5', 'brand-foreground': '#ffffff', muted: '#71717a' } } } }`. Import `pixelBasedPreset` from `react-email`.
- `src/emails/components/email-layout.tsx`: provided. Exports `EmailLayout({ children }: { children: ReactNode })`. Renders the brand chrome **inside** `<Body>`: a header `<Section>` with the logo `<Img src={`${APP_URL}/logo.png`} width={120} height={32} alt={APP_NAME} />`, a `<Container className="max-w-[600px] mx-auto">` slot for `{children}`, and a footer `<Section>` with a static legal address line and a hardcoded copyright year literal (`© 2026` — never `new Date().getFullYear()`, which breaks build under Cache Components). `APP_URL`/`APP_NAME`/legal address are **module-level literal constants in this file**, NOT `process.env` reads — the React Email preview server (`pnpm email`) runs templates in its own `.react-email` working dir where `process.env.NEXT_PUBLIC_*` is undefined and `@/` aliases may not resolve, so env reads here would break the preview. Keeping chrome on literals keeps the template/layout pure and renders identically in preview, the inspector iframe, and a real send. Does NOT render `<Html>`/`<Head>`/`<Tailwind>` — those wrap it from the template.
- `src/app/inspector/send-welcome/page.tsx`: provided server component. Renders an `<h1>`, the `SendWelcomeForm` (client), and a server-rendered email preview panel: `const previewHtml = await render(<WelcomeEmail {...WelcomeEmail.PreviewProps} />)` then `<iframe srcDoc={previewHtml} data-testid="email-preview-frame" title="Welcome email preview" />`. Imports `render` from `react-email`, `WelcomeEmail` from `@/emails/welcome`. Reads NO request-time DB/network data in its body (so no `loading.tsx`/Suspense seam is required). Wrap the whole page body in a single `<main data-testid="inspector-page">` element.
- `src/app/inspector/send-welcome/send-welcome-form.tsx`: provided client component (`'use client'`). `useActionState(sendWelcomeEmail, null)`; a `<form action={formAction}>` with: an email `<Input name="recipientEmail" defaultValue="suppressed@send.acme.example" data-testid="recipient-input">`, a `FieldError name="recipientEmail"`, a text `<Input name="firstName" defaultValue="Ada" data-testid="firstname-input">`, a `FieldError name="firstName"`, and `<SubmitButton data-testid="send-button">Send welcome</SubmitButton>`. Renders exactly one of three result cards from `state`, each a `Card`:
  - success (`state?.ok === true`): `data-testid="success-card"` — shows `state.data.id`, a "View in Resend dashboard" link, and the "check inbox" line.
  - suppression (`state?.ok === false && state.error.code === 'forbidden'`): `data-testid="suppression-card"` — banner "Suppression path hit — Resend was NOT called" plus the recipient and the gate reminder.
  - validation/error (`state?.ok === false && state.error.code !== 'forbidden'`): `data-testid="error-card"` — `state.error.userMessage` and, when present, `state.error.fieldErrors` (the `FieldError`s above also render inline).
- `src/app/page.tsx`: provided. `redirect('/inspector/send-welcome')`.
- `src/app/layout.tsx`: carry over; keep `Providers` + `Toaster`. Confirm metadata title reads `NEXT_PUBLIC_APP_NAME` via env only if env is populated — to stay boot-safe, hardcode the layout `<title>`/metadata to a literal app name string; do not read `env.NEXT_PUBLIC_APP_NAME` here (it is a student-owned stub).
- `src/emails/welcome.tsx`: **stub** (`TODO(L4)`) — see Start derivation for stub body. Must compile and export a default component plus `WelcomeEmail.PreviewProps` so the inspector preview iframe renders from scaffold.
- `src/lib/suppressions.ts`: **stub** (`TODO(L3)`) — see Start derivation for the stub body.
- `src/lib/email.ts`: **stub** (`TODO(L3)`) — see Start derivation for the stub body.
- `src/app/actions/send-welcome.tsx`: **stub** (`TODO(L4)`). Ship with the `.tsx` extension (it constructs JSX once filled); the stub returns `err('internal', 'Not implemented')` and takes `(prevState, formData)`.
- `.env.example`: provided. List `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `SEED`, `RESEND_API_KEY=re_xxx`, `EMAIL_FROM='Acme <noreply@send.acme.example>'`, `EMAIL_REPLY_TO=support@acme.example`, `NEXT_PUBLIC_APP_NAME=Acme`, `NEXT_PUBLIC_APP_URL=http://localhost:3000`.
- `AGENTS.md`, `README.md`: provided. README carries the verified-domain ceremony recap, the DNS checklist, the seed-placeholder replacement note, and the two-server run instructions (`pnpm dev` + `pnpm email`).

Scope boundary: the scaffolder builds everything above and leaves the five marked stubs (`src/env.ts` new keys, `src/lib/suppressions.ts`, `src/lib/email.ts`, `src/emails/welcome.tsx`, `src/app/actions/send-welcome.tsx`) as `TODO` for the slice-coders. The scaffolded app must boot (`pnpm dev`), render `/inspector/send-welcome` with the form and a preview iframe, and pass `pnpm verify`.

## Slices

### Slice S1

Scope: Lesson 3 — the suppression-gated send wrapper. Fill `src/env.ts`, `src/lib/suppressions.ts`, `src/lib/email.ts`. No visible surface changes.

`src/env.ts`: add to the `server` block `RESEND_API_KEY: z.string().min(1)`, `EMAIL_FROM: z.string().min(1)`, `EMAIL_REPLY_TO: z.email()`; add to the `client` block `NEXT_PUBLIC_APP_NAME: z.string().min(1)`, `NEXT_PUBLIC_APP_URL: z.url()`. Wire all five into `runtimeEnv` (server keys from `process.env.*`; the two `NEXT_PUBLIC_*` from `process.env.NEXT_PUBLIC_*`). Remove the `TODO(L3)` markers.

`src/lib/suppressions.ts`: `import 'server-only'` first line. Export `isSuppressed(email: string, opts: { kind: 'transactional' | 'marketing' }): Promise<{ suppressed: boolean; reason?: string; bypassUntil?: Date }>`. Normalize `email` (`.trim().toLowerCase()`) before the query. Single indexed lookup: `db.select().from(emailSuppressions).where(eq(emailSuppressions.email, normalized)).limit(1)`. Resolution order: no row → `{ suppressed: false }`; `bypassUntil` set and `> new Date()` → `{ suppressed: false, bypassUntil }`; `reason === 'manual_unsubscribe'` and `kind === 'transactional'` → `{ suppressed: false, reason: 'manual_unsubscribe' }`; otherwise → `{ suppressed: true, reason }`.

`src/lib/email.ts`: `import 'server-only'` first line; type-only `import type { ReactNode } from 'react'` (a type import is allowed in `lib/`; no runtime React). Module-scope singleton `const resend = new Resend(env.RESEND_API_KEY)`. Define `type SendInput = { to: string; subject: string; react: ReactNode; idempotencyKey: string; replyTo?: string; bypassSuppression?: boolean }` (matches Chapter 048 L1's `react: ReactNode`). Export `sendEmail(input: SendInput): Promise<Result<{ id: string }>>`. Body: normalize `to` (`.trim().toLowerCase()`); call `isSuppressed(normalizedTo, { kind: 'transactional' })` inside a `try` that `catch`es and returns `err('internal', 'Could not send email.')` (fail closed); if `{ suppressed: true }` and not `input.bypassSuppression`, `console.info('[email] suppressed', { to: normalizedTo })` and return **`err('forbidden', 'This recipient is on the suppression list.')` without calling Resend** (suppressed maps to the existing `forbidden` code — see Locked decisions); otherwise `const { data, error } = await resend.emails.send({ from: env.EMAIL_FROM, to: [normalizedTo], replyTo: input.replyTo ?? env.EMAIL_REPLY_TO, subject: input.subject, react: input.react }, { idempotencyKey: input.idempotencyKey })` (wrap `to` as an array, matching Chapter 048 L1); on `error || !data` `console.error('[email] failed', { to: normalizedTo, error })` and return `err('internal', 'Email send failed.')`; else `console.info('[email] sent', { id: data.id, to: normalizedTo, subject: input.subject })` and return `ok({ id: data.id })`.

Excludes: the template, the action, any marketing branch (the `kind` arg exists but only `'transactional'` is called), any per-call `from` override, any throw on expected failure.

Contracts created: `isSuppressed` (above), `sendEmail` (above), `SendInput`. `idempotencyKey` is required (not optional). `from` is env-only.

Screenshot: none.

### Slice S2

Scope: Lesson 4 (template half). Fill `src/emails/welcome.tsx` as a pure props-only renderer.

Default-export `WelcomeEmail({ firstName, verifyUrl }: WelcomeEmailProps)` with `type WelcomeEmailProps = { firstName: string; verifyUrl: string }`. Structure, outermost-in:
`<Tailwind config={emailTailwindConfig}>` → `<Html lang="en" dir="auto">` → `<Head>` containing ``<title>{`Welcome to ${appName}`}</title>`` (a **template literal** — `<title>Welcome to {appName}</title>` makes `children` a two-node Array, which React rejects at render with an error-level log: *"React expects the `children` prop of `<title>` tags to be a string … but found an Array with length 2"*; the `<Preview>` line tolerates the split form because it is a React Email component, not a raw `<title>`), `<meta name="color-scheme" content="light dark" />`, `<meta name="supported-color-schemes" content="light dark" />`, and an inline `<style>` with `:root { color-scheme: light dark; }` → `<Preview>Welcome to {appName} — verify your email</Preview>` → `<Body className="bg-zinc-50">` → `<EmailLayout>` → `<Section>` with `<Heading as="h1">Welcome, {firstName}</Heading>`, one `<Text>` welcome paragraph, `<Button href={verifyUrl} className="rounded-md bg-brand px-5 py-3 text-brand-foreground">Verify your email</Button>`, and a small alternate-link `<Text>` carrying the raw URL so the CTA survives a stripped button.
`appName` is a module-level literal constant in this file (e.g. `const APP_NAME = 'Acme'`) — the template reads NO env/DB/session. Export `WelcomeEmail.PreviewProps = { firstName: 'Ada', verifyUrl: 'https://acme.example/verify/abc-123' } satisfies WelcomeEmailProps`. Import all components and `pixelBasedPreset` from `react-email`; import `emailTailwindConfig` from `./email-tailwind-config` and `EmailLayout` from `./components/email-layout` (same-folder **relative** imports, NOT `@/` aliases — the preview server may not resolve `@/`).

Best practices: brand tokens (`bg-brand`, `text-brand-foreground`) not raw hex or `zinc` for the CTA; no `flex`/`grid` (use `<Section>`/`<Row>`/`<Column>`); `<Button>` for the CTA so padding clears a 44px touch target; one `<h1>` stating purpose. The same file must render identically in the preview server, the inspector iframe, and a real send.

Excludes: the action, env reads inside the component, `<picture>` dark-logo swap (project ships one brand-neutral logo), any DB/session access.

Contracts created: `WelcomeEmail` default export + `WelcomeEmailProps` + `WelcomeEmail.PreviewProps`. Consumed by the provided inspector preview iframe (`render(<WelcomeEmail {...PreviewProps} />)`) and by S3's action.

Screenshot: Lesson 4 — `inspector-email-preview` — route `/inspector/send-welcome`, viewport desktop (1280×900), state settled; captures the server-rendered welcome template inside the inspector preview iframe (heading, body, branded CTA). (The email's mobile-reflow and dark-mode behavior render inside the email client and are verified by hand against the preview server and a real inbox, not by an app screenshot.)

### Slice S3

Scope: Lesson 4 (action half). Fill `src/app/actions/send-welcome.tsx`. This slice makes the inspector submit path functional end-to-end.

File-level `'use server'`. Export `sendWelcomeEmail(prevState: Result<{ id: string }> | null, formData: FormData): Promise<Result<{ id: string }>>`. Five seams:
1. Parse `Object.fromEntries(formData)` with `z.strictObject({ recipientEmail: z.email(), firstName: z.string().min(1).max(80) })`; on failure `return err('validation', 'Check the highlighted fields.', z.flattenError(parsed.error).fieldErrors)`. (Use `flattenError`, NOT `treeifyError` — the course `Result.error.fieldErrors` is the flat `Record<string, string[]>` the provided `FieldError` reads via `fieldErrors?.[name]?.[0]`; this matches every Unit 6 action the student already shipped.)
2. `const { userId } = await getActiveContext()`.
3. `const normalizedRecipient = parsed.data.recipientEmail.trim().toLowerCase(); const idempotencyKey = \`welcome:${userId}:${normalizedRecipient}\`;`.
4. `const verifyUrl = \`${env.NEXT_PUBLIC_APP_URL}/verify/placeholder-${idempotencyKey}\`;` with a `// TODO(Unit 8) — replace placeholder with a real Better Auth verification token` comment.
5. `return await sendEmail({ to: parsed.data.recipientEmail, subject: \`Welcome to ${env.NEXT_PUBLIC_APP_NAME}\`, react: <WelcomeEmail firstName={parsed.data.firstName} verifyUrl={verifyUrl} />, idempotencyKey });` — return the wrapper's `Result` **unchanged** (never re-shape a `forbidden` suppression result into `validation`).

Imports: `getActiveContext` from `@/lib/auth-stub`, `sendEmail` from `@/lib/email`, `WelcomeEmail` from `@/emails/welcome`, `env` from `@/env`, `z` from `zod`, `err` from `@/lib/result`.

Best practices: parse before authorize (malformed input never pays the auth cost); thin orchestrator that owns no failure taxonomy; `.tsx` extension because it constructs JSX server-side (never serialized to client).

Excludes: any MX-record probe, any `cookies()`/session reader, any `revalidatePath`, any re-shaping of the wrapper `Result`.

Contracts created: `sendWelcomeEmail` (the action `useActionState` signature). Consumed by the provided `send-welcome-form.tsx`.

Screenshot: none. (The inspector form surface is captured under S2's shot, which already renders the full page; S3 changes only the submit behavior, not the settled layout.)

## Start derivation

Derive `start/` from the finished `solution/` by replacing the four student-owned files with compiling stubs; every other file is byte-identical. Each stub body carries a `// TODO(L<n>) — <task>` marker so `rg TODO start/` enumerates the work.

- `src/env.ts` — `TODO(L3)`. Remove the five new keys from `server`/`client` and from `runtimeEnv`, leaving the three existing keys. Marker above the `server` block: `// TODO(L3) — add RESEND_API_KEY, EMAIL_FROM, EMAIL_REPLY_TO (server) and NEXT_PUBLIC_APP_NAME, NEXT_PUBLIC_APP_URL (client), wire into runtimeEnv.`
- `src/lib/suppressions.ts` — `TODO(L3)`. Body: `import 'server-only';` then `export const isSuppressed = async (_email: string, _opts: { kind: 'transactional' | 'marketing' }): Promise<{ suppressed: boolean; reason?: string; bypassUntil?: Date }> => { // TODO(L3) — normalize, query email_suppressions, apply bypassUntil + manual_unsubscribe/transactional rules\n  return { suppressed: false };\n};`. (Returning a clear result keeps `lib/email.ts`'s stub and the build green.)
- `src/lib/email.ts` — `TODO(L3)`. Body: `import 'server-only';` + type-only `import type { ReactNode } from 'react';` + the `SendInput` type (kept, so callers typecheck) + `export const sendEmail = async (_input: SendInput): Promise<Result<{ id: string }>> => { // TODO(L3) — singleton Resend client, suppression read at the boundary, env-default from/replyTo, return Result\n  return err('internal', 'sendEmail not implemented');\n};`. Do not construct the Resend singleton in the stub (env keys are absent in start).
- `src/emails/welcome.tsx` — `TODO(L4)`. Minimal compiling stub that still renders in the inspector iframe: default-export a component taking `WelcomeEmailProps` that returns `<Tailwind config={emailTailwindConfig}><Html><Body><Text>Welcome email — TODO(L4)</Text></Body></Html></Tailwind>`, plus the `WelcomeEmail.PreviewProps` export. Imports `emailTailwindConfig` from `./email-tailwind-config` (relative). Marker: `// TODO(L4) — build the welcome template: EmailLayout, Preview, Heading/Text/Button, dark-mode head meta, alternate text link.`
- `src/app/actions/send-welcome.tsx` — `TODO(L4)`. File-level `'use server'`; `export const sendWelcomeEmail = async (_prevState: Result<{ id: string }> | null, _formData: FormData): Promise<Result<{ id: string }>> => { // TODO(L4) — five seams: parse, getActiveContext, idempotency key, placeholder verifyUrl, sendEmail\n  return err('internal', 'Not implemented');\n};`. Keep `.tsx`. (Provided inspector form imports this; the stub keeps the app booting and the submit button erroring — the intended runnable starting point.)

The provided files (`inspector/`, `emails/email-layout.tsx`, `emails/email-tailwind-config.ts`, `db/`, `lib/result.ts`, `lib/auth-stub.ts`, `lib/utils.ts`, UI, config, scripts, tests, README) are identical between `start/` and `solution/`.

## Locked decisions

- **`'suppressed'` resolves to the existing `forbidden` code — `lib/result.ts` is NOT modified.** Chapter 048 L4 taught `return err('forbidden', 'This address is on the suppression list.')` ("suppressed maps to the existing `forbidden` code, no new outcome shape"), and Chapter 043 fixed the seven-code set and rejected new codes. The Chapter 050 outline's invented `'suppressed'` code and `{ reason: 'suppressed' }` shape are dropped to stay consistent with what the student was taught. The `sendEmail` wrapper returns `err('forbidden', 'This recipient is on the suppression list.')`; the inspector's Suppression card branches on `code === 'forbidden'`. On this surface suppression is the only `forbidden` source (auth is stubbed, no other authorization path), so the branch is unambiguous. The `ErrorCode` union stays `'validation' | 'conflict' | 'not_found' | 'unauthorized' | 'forbidden' | 'rate_limited' | 'internal'`.
- **React Email 6 unified package.** Import every primitive, `pixelBasedPreset`, and `render` from `react-email` (`react-email@^6.5.0`), NOT from the deprecated `@react-email/components`. React Email 6.0 (April 2026) unified all components into `react-email` and deprecated `@react-email/components`. The student's taught concepts (vocabulary, `<Tailwind config>`, `PreviewProps`, props-only templates) are unchanged; only the import specifier differs. `react-email` is the sole new email **runtime** dependency (it bundles the components, `pixelBasedPreset`, `render`, and the `email dev` CLI). The preview server's UI lives in `@react-email/ui`, which `react-email@6.5.0` does NOT pull in transitively — it must ship as an explicit **devDep** (`@react-email/ui@^6.5.0`) or `pnpm email` blocks on an interactive install prompt (see Dependencies to add).
- **Email Tailwind config + layout wiring (Chapter 049-consistent).** The project ships `src/emails/email-tailwind-config.ts` (kebab-case file, default export `emailTailwindConfig`) with `pixelBasedPreset` and hex brand tokens (`brand`/`brand-foreground`/`muted`). `<Tailwind config={emailTailwindConfig}>` is **outermost**, wrapping `<Html>` (Chapter 049 L3: keep `<Tailwind>` above `<Html>`/`<Head>`). `<EmailLayout>` lives inside `<Body>` and renders header/footer chrome only — it does NOT render `<Html>`/`<Head>`/`<Tailwind>`. CTA uses `bg-brand`/`text-brand-foreground`, never raw `zinc`/hex. File names kebab-case, component names PascalCase (`WelcomeEmail`, `EmailLayout`).
- **Resend client is a module-scope singleton** in `lib/email.ts`, never per-call; the wrapper is a thin convenience layer (suppression read + env defaults + `Result`), never a generic adapter (Principle #5).
- **Suppression read lives only at the wrapper.** Callers never re-check; the action returns the wrapper `Result` unchanged.
- **`idempotencyKey` is a required `SendInput` field.** Format `welcome:${userId}:${normalizedRecipient}`.
- **Templates are pure renderers.** No env/DB/session reads inside `welcome.tsx` or `email-layout.tsx`; the action computes per-send values and passes props. `appName`, the logo URL, and the legal address are module-level literal constants. The action (running in Next) reads `env.NEXT_PUBLIC_APP_NAME`/`env.NEXT_PUBLIC_APP_URL` for the subject and `verifyUrl` only.
- **Preview-server safety.** Files under `src/emails/` import each other with same-folder **relative** paths (`./email-tailwind-config`, `./components/email-layout`), never `@/` aliases — the React Email 6 preview server (`pnpm email`) runs in a `.react-email` working dir where `@/` may not resolve and `process.env.NEXT_PUBLIC_*` is undefined. `render` and all primitives import from `react-email`. The Next inspector page (where `@/` resolves) imports `WelcomeEmail` from `@/emails/welcome` and `render` from `react-email`.
- **No `new Date()` in any server-rendered component** (`EmailLayout` footer year is the literal `© 2026`) — reading an IO clock without awaiting a dynamic source breaks `next build` under `cacheComponents: true` (Toolchain constraint).
- **Inspector page reads no request-time DB/network data in its body**, so no `loading.tsx`/Suspense seam is needed; the email-preview iframe is built from `render(<WelcomeEmail {...PreviewProps} />)` (static props).
- **Stable selectors.** Every checked surface exposes a `data-testid`: `inspector-page` (page `<main>`), `recipient-input`, `firstname-input`, `send-button`, `email-preview-frame` (the preview iframe), `success-card`, `suppression-card`, `error-card`. Checks read these, never positional/text selectors.
- **Toolchain constraints honored (from `documentation/code standards/Toolchain constraints.md`):**
  - `tsconfig.json` (forked from 047, unchanged): `"jsx": "react-jsx"`, `"skipLibCheck": true`, `"incremental": true`, both `".next/types/**/*.ts"` and `".next/dev/types/**/*.ts"` baked into `include`, `"allowJs": false`, no `baseUrl` (paths resolve under `moduleResolution: "bundler"`; TS 6 errors on `baseUrl`).
  - `biome.json` (unchanged): `"performance": { "noImgElement": "off" }`, `"css": { "parser": { "tailwindDirectives": true } }`, ignores written without trailing `/**` (`"!.next"`, `"!node_modules"`, `"!next-env.d.ts"`).
  - `next.config.ts` (unchanged): `cacheComponents: true`, `typedRoutes: true`, `reactCompiler: true`, `turbopack: { root: __dirname }`. `reactCompiler: true` requires `babel-plugin-react-compiler@1.0.0` in devDependencies (present in the fork). No dynamic-route href strings exist on the inspector surface, so the `typedRoutes` + standalone-`tsc` gap does not bite.
  - `pnpm-workspace.yaml` (unchanged, in **both** `start/` and `solution/`): `onlyBuiltDependencies: [sharp]`, `allowBuilds: { sharp: true, esbuild: false }` — sharp (next) and esbuild (tsx/drizzle-kit) ledger entries, else `next build` hard-fails on a cold install.
  - Drizzle pinned to `drizzle-orm@0.45.x` + `drizzle-kit@0.31.x`; runtime `casing: 'snake_case'` on the client; flat migration layout; `drizzle-zod@^0.8` (not used here, but stays pinned); seed uses `reset()` then direct inserts; `pathToFileURL` entry-point guard (paths contain spaces).
  - Versions pinned: `next@16.2.7`, `react`/`react-dom@19.2.4`, `typescript@^6.0.3`, `@biomejs/biome@2.4.16`, `zod@^4.4.3`, `@t3-oss/env-nextjs@^0.13.11`, `resend@^6.12.4`, `react-email@^6.5.0`.
- **Code conventions honored (from `documentation/code standards/Code conventions.md`):**
  - **`z.flattenError`, not `z.treeifyError`.** The action's validation `fieldErrors` use `z.flattenError(parsed.error).fieldErrors` (flat `Record<string, string[]>`) to match the `Result` contract and the provided `FieldError` (`fieldErrors?.[name]?.[0]`) — the same shape every Unit 6 action shipped. The outline's `treeifyError(...).properties` is dropped (wrong shape for this `Result`).
  - **Arrow-`const` exports**, not `function` declarations, for `isSuppressed`, `sendEmail`, `sendWelcomeEmail`, and `EmailLayout`. `function` only for type guards/hoisting (none here).
  - **`console.*` structured logging** (`console.info('[email] sent', { id, to, subject })`, `console.error('[email] failed', { to, error })`) — pino/AsyncLocalStorage is Chapter 092 (not yet taught); the structured-`console` pattern is what Chapter 048 L3 codified for this chapter. Fixed key sets, no string concatenation.
  - **Five-seam action**: parse → authorize → mutate(send) → return. No revalidate seam (no list to revalidate); the external send is outside any transaction (there is no transaction). Form wires via `<form action={...}>` with uncontrolled `defaultValue` inputs; `useActionState` at the form root; `useFormStatus` only inside `SubmitButton`.
  - **Zod 4 top-level builders**: `z.email()`, `z.url()`, `z.strictObject` (extra form keys are a bug). `safeParse` first, before any auth/DB/network.
  - **Imports**: side-effecting `import 'server-only'` first, then external (`react-email`, `zod`, `resend`), then `@/` aliases, then same-folder relatives; alphabetical within groups. No barrel files. Template default-export is the sanctioned exception (one template per file; `welcome.tsx` → `WelcomeEmail`).
  - **Accessibility floor for the email** (Chapter 049 L3): one `<h1>` stating purpose, `<Button>` CTA clearing a 44×44 touch target, descriptive link text, `<Html lang="en" dir="auto">`. The light template must pass WCAG contrast on its own; dark-mode head meta is an enhancement layer.

## File tree

Tree after the last slice (`solution/`). Provided files carry no slice tag; student-owned files tag their creating/editing slice.

```
projects/Chapter 050/solution/
├── package.json                              — adds resend/react-email deps + @react-email/ui devDep, "email" + "verify" scripts
├── next.config.ts                            — cacheComponents/typedRoutes/reactCompiler/turbopack
├── tsconfig.json
├── biome.json
├── vitest.config.ts
├── drizzle.config.ts
├── docker-compose.yml
├── pnpm-workspace.yaml
├── .env.example                              — DB + RESEND_API_KEY/EMAIL_FROM/EMAIL_REPLY_TO/NEXT_PUBLIC_APP_*
├── AGENTS.md
├── README.md                                 — verified-domain ceremony recap, DNS checklist, two-server run
├── scripts/
│   ├── seed.ts                               — org + user + one suppressed row (deterministic)
│   └── test-lesson.mjs                       — runs one tests/lessons/Lesson <n>.test.ts
├── drizzle/
│   └── 0000_init_schema.sql                  — organizations, users, email_suppressions (+ suppression_reason enum)
├── tests/lessons/
│   ├── Lesson 3.test.ts                      — describe.todo placeholder
│   └── Lesson 4.test.ts                      — describe.todo placeholder
└── src/
    ├── env.ts                                — [stubbed by: scaffold; edited by: S1] adds 5 email/app keys
    ├── app/
    │   ├── globals.css
    │   ├── layout.tsx                         — Providers + Toaster, literal app-name metadata
    │   ├── page.tsx                           — redirect('/inspector/send-welcome')
    │   ├── _components/
    │   │   ├── providers.tsx                  — next-themes ThemeProvider
    │   │   ├── submit-button.tsx              — useFormStatus submit button
    │   │   └── field-error.tsx                — first fieldErrors[name] message, role=alert
    │   ├── inspector/
    │   │   └── send-welcome/
    │   │       ├── page.tsx                    — server page: form + email-preview iframe (render(PreviewProps))
    │   │       └── send-welcome-form.tsx       — client: useActionState, three result cards
    │   └── actions/
    │       └── send-welcome.tsx               — [created by: S3] sendWelcomeEmail action (five seams)
    ├── components/ui/
    │   ├── button.tsx
    │   ├── card.tsx
    │   ├── input.tsx
    │   ├── label.tsx
    │   ├── separator.tsx
    │   ├── skeleton.tsx
    │   └── sonner.tsx
    ├── db/
    │   ├── schema.ts                          — organizations, users, emailSuppressions
    │   ├── columns.ts                         — shared timestamps
    │   └── index.ts                           — db singleton (snake_case), dbUnpooled alias
    ├── emails/
    │   ├── welcome.tsx                        — [created by: S2] WelcomeEmail template + PreviewProps
    │   ├── email-tailwind-config.ts           — emailTailwindConfig (pixelBasedPreset + brand tokens)
    │   └── components/
    │       └── email-layout.tsx               — EmailLayout brand chrome (header/footer)
    └── lib/
        ├── utils.ts                           — cn()
        ├── result.ts                          — Result<T>, ok, err, isUniqueViolation (UNCHANGED)
        ├── auth-stub.ts                       — getActiveContext() (acme org + ada user)
        ├── suppressions.ts                    — [created by: S1] isSuppressed()
        └── email.ts                           — [created by: S1] sendEmail() wrapper
```

## Verification

### Static checks (reviewer executes)

1. **both** — `cd <scope> && pnpm verify` (biome ci + tsc --noEmit + next build) → exits 0. (`<scope>` = `solution/` and `start/`.)
2. **both** — `rg "@react-email/components" src/` → no matches (the deprecated package must never be imported; all imports come from `react-email`).
3. **solution** — `rg -q "err\('forbidden'" src/lib/email.ts` → matches (the suppression short-circuit returns `forbidden`). And `rg -q "'suppressed'" src/lib/result.ts` → **no** match (no invented code).
4. **solution** — `rg -q "isSuppressed\(" src/lib/email.ts` → matches (the wrapper actually reads suppressions; fails if the gate is absent and the wrapper ships inert).
5. **solution** — `rg -q "new Resend\(" src/lib/email.ts` and `rg -q "resend.emails.send" src/lib/email.ts` → both match (the wrapper constructs the singleton and calls Resend; fails if the send path is a stub).
6. **solution** — `rg -q "idempotencyKey" src/app/actions/send-welcome.tsx` and `rg -q "idempotencyKey" src/lib/email.ts` → both match (the key is built in the action and passed to Resend; fails if dropped).
7. **solution** — `rg -q "import 'server-only'" src/lib/email.ts src/lib/suppressions.ts` → matches in both.
8. **solution** — `rg -q "PreviewProps" src/emails/welcome.tsx` and `rg -q "render\(" src/app/inspector/send-welcome/page.tsx` → both match (the template exports preview data; the inspector renders it — fails if the preview surface ships inert).
9. **solution** — `rg -q "getActiveContext" src/app/actions/send-welcome.tsx` → matches (identity from the stub, not `cookies()`); and `rg "cookies\(" src/app/actions/send-welcome.tsx` → no match.
10. **start** — `rg -c "TODO\(L" start/src` → ≥ 5 across the five stub files (`env.ts`, `lib/suppressions.ts`, `lib/email.ts`, `emails/welcome.tsx`, `app/actions/send-welcome.tsx`).
11. **both** — `pnpm test:lesson 3` and `pnpm test:lesson 4` → each runs exactly one file (placeholders report as todo; non-vacuous: the runner names the single `Lesson <n>.test.ts`).

### Rendered checks (slice coders + inspector run against the running app)

- **id**: `inspector-renders` — **slice** S2 — **route** `/inspector/send-welcome` — **viewport** 1280×900 — **state** settled — **intent** the inspector page renders the controls and the email-preview surface as one page. **selectors** `inspector-page`, `recipient-input`, `firstname-input`, `send-button`, `email-preview-frame`. **assertion** `inspector-page` is present and contains all four of: `recipient-input`, `firstname-input`, `send-button`, and `email-preview-frame`; `recipient-input`'s value defaults to a `suppressed@…` address and `firstname-input`'s value defaults to `Ada`. No result card (`success-card`/`suppression-card`/`error-card`) is present before submit.
- **id**: `email-preview-content` — **slice** S2 — **route** `/inspector/send-welcome` — **viewport** 1280×900 — **state** settled — **intent** the welcome template actually renders (not an empty/error iframe), proving the props-only template + preview wiring work. **selectors** `email-preview-frame`. **assertion** the `email-preview-frame` iframe's document body is non-empty and contains the heading text "Welcome, Ada" and a link/button whose text is "Verify your email" pointing at the `PreviewProps` verify URL; the CTA's rendered background color is the brand color (`#4f46e5`), not transparent/unstyled.
- **id**: `validation-card-on-empty-submit` — **slice** S3 — **route** `/inspector/send-welcome` — **viewport** 1280×900 — **state** transient after clearing `recipient-input` and clicking `send-button` (the action's parse seam rejects the empty string before any auth/DB/network call, so this is deterministic offline; `recipient-input` must stay **non-`required`** — the provided form leaves it so — or the browser blocks submit on the empty field and the action never runs). **intent** the action wires `useActionState` and surfaces validation through the error card and inline field error. **selectors** `error-card`, `recipient-input`, `firstname-input`. **assertion** after submitting with `recipient-input` emptied, `error-card` appears with the `userMessage` text ("Check the highlighted fields."), an inline field-error message renders for the recipient field (the `#recipientEmail-error` `role="alert"` node, text "Invalid email address"), and `firstname-input` retains its typed value; no `success-card` or `suppression-card` is present.

(The success and suppression cards, deliverability, dark-mode, and mobile reflow require a real Resend call and a seeded DB / real inbox; they are covered by the lessons' by-hand checklists, not by automated rendered checks.)
