# Chapter 050 — Lesson 4 outline

## Lesson title

The chapter-outline title fits. Keep **The welcome email send path**.
Sidebar: **The send path**.

## Lesson type

`Implementation`

The test-coder runs for this lesson and fills `tests/lessons/Lesson 4.test.ts` (currently `describe.todo`). The writer renders the Implementation section list.

## Lesson framing

The student ships the two pieces that turn the wrapper from Lesson 3 into a real delivered email: a props-only `WelcomeEmail` template and the `sendWelcomeEmail` Server Action that fires it. The senior payoff is the *pure-renderer* discipline (template takes typed props, reads no env/DB/session, so its `PreviewProps` never drift from production) joined to the five-seam action shape that funnels every outcome — success, suppression, validation — through one `Result` without re-shaping the wrapper's failure taxonomy. By the end a click on the inspector button lands an authenticated, DKIM-signed email in the student's own inbox, the seeded suppressed recipient short-circuits visibly, and a double-click collapses to one send: the canonical transactional surface every later unit reuses.

## Lesson sections

Implementation type. Sections in contract order. This is the chapter's final lesson, so close the *Coding time* / *Moment of truth* with the senior recap and forward-references (the brief calls for it at the end of *Moment of truth*).

### Goal + Finished result (intro, no header)

One-sentence goal in user terms: clicking the inspector's "Send welcome" button delivers a real, rendered welcome email to the student's own inbox. Then a short paragraph describing the working feature: success card shows the Resend send ID and a dashboard link within ~2s, the email arrives within ~15s, the seeded `suppressed@…` recipient renders the suppression card with no Resend call, and validation errors surface inline. Carry one `Screenshot` (or `TabbedContent` of two): the inspector success card beside the rendered email in the inbox. Note the live preview iframe already renders the template (the page calls `render(<WelcomeEmail {...PreviewProps} />)`), so the student watches the template light up in the iframe as they build it.

### Your mission (h2)

Coherent prose paragraph, no subsection headers, no implementation hints. Weave:

- **Feature.** Write the `WelcomeEmail` template the recipient sees and the `sendWelcomeEmail` action the inspector fires, so the button delivers an authenticated welcome email end-to-end.
- **Constraints.** The template is a *pure renderer*: typed props in, HTML + text out, no env reads, no DB reads, no session reads inside the component — the action computes values and passes them as props (the moment the template reads `env`, its `PreviewProps` drift from production and the preview server lies). Build from the chapter 049 React Email vocabulary. The action follows the chapter 043 five-seam shape and returns the wrapper's `Result` *unchanged* — never re-shape a `'forbidden'` suppression failure into `'validation'`; the action is a thin orchestrator, the wrapper owns the failure taxonomy. Identity comes from the `getActiveContext()` stub — do not reach for `cookies()` or invent a session reader (Unit 8 swaps the stub cleanly). The idempotency key collapses repeated clicks to one send. Parse-before-authorize (parse is cheap; the auth read becomes a session+DB hit in Unit 8).
- **Out of scope.** No MX-record probe on the recipient (the suppression read after a bounce catches typos); token-signing for the verify link is Unit 8's job — ship an explicit placeholder.

Then the **Functional requirements** as a `Checklist`, each item tagged `[tested]` or `[untested]`. Phrase each as a verifiable outcome, never as a file/export. Mapping (the test-coder asserts only `[tested]`):

1. `[tested]` Submitting valid input keys the send idempotently and routes it through the wrapper, returning a success `Result` carrying the Resend send ID. *(action unit test: stub `getActiveContext` + `sendEmail`, assert the action calls `sendEmail` once with the computed idempotency key and returns the wrapper's `ok` result unchanged.)*
2. `[tested]` Clicking send twice for the same recipient — even with a changed `firstName` — produces the same idempotency key (`one welcome per user per recipient`), so the key ignores `firstName` and normalizes the recipient. *(assert key stability across two invocations with differing `firstName` and mixed-case/whitespace recipient.)*
3. `[tested]` Submitting an empty `recipientEmail` returns a `validation` `Result` with `fieldErrors.recipientEmail`; an empty `firstName` returns `fieldErrors.firstName`. *(assert the `err('validation', …, fieldErrors)` shape from `z.flattenError`.)*
4. `[tested]` The action returns the wrapper's failure `Result` unchanged — a `'forbidden'` suppression result is not re-shaped. *(stub `sendEmail` to return `err('forbidden', …)`, assert the action returns it verbatim.)*
5. `[tested]` Rendering the template to HTML carries the `<Preview>` preheader text, the compiled `<Tailwind>` styles, the dark-mode `<head>` meta (`color-scheme` / `supported-color-schemes`), and the `verifyUrl` on the button href. *(render `<WelcomeEmail {...PreviewProps} />` via react-email `render`, assert on the HTML string.)*
6. `[tested]` The plain-text rendering stands alone: heading text, the welcome paragraph, and the verify URL all present in the `plainText` output. *(render with the plain-text option, assert substrings.)*
7. `[untested]` Submitting the student's own inbox delivers a real email within ~15s; the success card shows the send ID within ~2s.
8. `[untested]` The delivered `from` matches `EMAIL_FROM`; replying lands at `EMAIL_REPLY_TO`, not the `noreply@` mailbox.
9. `[untested]` The delivered message passes auth in "Show original": SPF=pass, DKIM=pass for `send.<student>.<tld>`, DMARC=pass — confirmed on Gmail and one non-Gmail client.
10. `[untested]` The delivered message carries both `text/plain` and `text/html` under `multipart/alternative`.
11. `[untested]` Submitting the seeded `suppressed@…` recipient renders the suppression card and produces no entry in the Resend dashboard logs.
12. `[untested]` The template renders cleanly across desktop, the 375 px mobile toggle (button stays a 44 px tappable target), and dark mode (background/text invert, logo survives Gmail Android's blanket inversion) in `pnpm email`.

Rationale for the tested/untested split: behavior reachable from a Node test (action branching, idempotency-key derivation, render-to-string output) is `[tested]`; everything requiring a real inbox, a registrar's live DNS, or a human eye (deliverability, auth headers, MIME structure, visual reflow) is `[untested]` and ticked by hand in *Moment of truth*.

### Coding time (h2)

One line directing the student to implement `src/emails/welcome.tsx` and `src/app/actions/send-welcome.tsx` against the brief and the tests, then attempt before reading. The writer wraps the reference solution in `<details>` (collapsed). Organize as it appears in the repo.

**`src/emails/welcome.tsx`** — present the full template with `AnnotatedCode` (multiple parts need focus: the `<Tailwind config>` outermost wrap, the `<Html lang="en" dir="auto">`, the dark-mode `<Head>` block, the `<Preview>` preheader, and the `<Section>` body with `<Heading>`/`<Text>`/`<Button href={verifyUrl}>`/alternate-link `<Text>`). Default export; props `WelcomeEmailProps = { firstName: string; verifyUrl: string }`; `APP_NAME = 'Acme'` module literal; `WelcomeEmail.PreviewProps = { firstName: 'Ada', verifyUrl: 'https://acme.example/verify/abc-123' } satisfies WelcomeEmailProps`. Decision rationale (one or two sentences each):
- The pure-renderer rule and why brand strings live on `EmailLayout`'s literals: the preview server's `.react-email` working dir can't resolve `process.env.NEXT_PUBLIC_*` or the `@/` alias, so per-send values (`firstName`, `verifyUrl`) come from the action as props while brand chrome stays on literals. Link to lesson 1 of chapter 049 for the primitive vocabulary rather than re-explaining.
- The alternate-link `<Text>` echoes `verifyUrl` so the CTA survives a stripped button — covers the plain-text-coherence `[untested]` clause.
- `PreviewProps` as the mock-data contract that the inspector iframe and `pnpm email` both consume.
- Callout: `EmailLayout` already provides the `<Container className="mx-auto max-w-[600px]">` wrap and brand chrome, so the template adds no `<Container>` and no env reads of its own.

**`src/app/actions/send-welcome.tsx`** — present with `AnnotatedCode`, stepping the five seams. File-level `'use server'`. (1) `z.strictObject({ recipientEmail: z.email(), firstName: z.string().min(1).max(80) }).safeParse(Object.fromEntries(formData))`; on failure `err('validation', 'Check the highlighted fields.', z.flattenError(parsed.error).fieldErrors)`. (2) `const { userId } = await getActiveContext()`. (3) `normalizedRecipient = recipientEmail.trim().toLowerCase()`, `idempotencyKey = \`welcome:${userId}:${normalizedRecipient}\``. (4) `verifyUrl = \`${env.NEXT_PUBLIC_APP_URL}/verify/placeholder-${idempotencyKey}\`` with the `// TODO(Unit 8) — replace placeholder with a real Better Auth verification token.` comment. (5) `return await sendEmail({ to, subject: \`Welcome to ${env.NEXT_PUBLIC_APP_NAME}\`, react: <WelcomeEmail … />, idempotencyKey })`. Decision rationale and `[untested]`-requirement coverage:
- Parse-before-authorize ordering: malformed input shouldn't pay the auth cost once Unit 8 makes the auth read a session+DB hit.
- The idempotency key keys on `userId` + normalized recipient and *not* `firstName` — "one welcome per user per recipient" — so a changed name still collapses to one send (covers req 2's intent).
- Returning the wrapper's `Result` unchanged preserves the diagnostic surface (the inspector branches on `code === 'forbidden'`); re-shaping would break the suppression card.
- The intentional `verifyUrl` placeholder deferred to Unit 8 (the `// TODO(Unit 8)` comment is a forward note, not a student task).
- Callout: the action file is `.tsx`, not `.ts`, because it constructs the `<WelcomeEmail … />` JSX element — built and rendered server-side, never serialized to a client. Link to lesson 3 of chapter 043 for the five-seam shape rather than re-explaining.
- Note the provided `SendWelcomeForm` already reads `useActionState(sendWelcomeEmail, null)` and renders the three cards, so submitting works end-to-end once the action lands — no client wiring required.

External resources (if any) appended here after the `<details>` with no header (added later by the resourcer).

No diagram needed — the send flow is the Project Overview's architecture list; do not re-draw it here.

### Moment of truth (h2)

Test command and expected pass output:
- Command: `pnpm test:lesson 4`.
- Expected: the Lesson 4 suite (template render + action branching) passes, all green; describe the brief pass summary line. The writer should mark this output `Code` (plain block).

Then the by-hand `Checklist` for the `[untested]` clauses the tests can't reach (deliverability, headers, MIME, rendering — each needs a real inbox or eye):
- Set `recipientEmail` to the student's own Gmail, click send; confirm the success card with the send ID (~2s) and the email in the inbox (~15s). Confirm `from` reads as `EMAIL_FROM`; click Reply and confirm the recipient is `EMAIL_REPLY_TO`.
- In Gmail "Show original": confirm SPF=pass, DKIM=pass for `send.<student>.<tld>`, DMARC=pass; if any line is FAIL/NEUTRAL, re-check the Lesson 2 DNS via `dig`. Optionally re-send to `check-auth@verifier.port25.com`.
- Re-send to a non-Gmail inbox (Outlook.com or Proton); confirm the same three pass — catches a misconfiguration Gmail's lenient parser hides.
- Eyeball the delivered body: heading reads `Welcome, {firstName}`, CTA renders in the brand color (not Outlook blue or unstyled gray). Open on a phone (reflows, button tappable) and in dark mode (background inverts, text readable, logo survives).
- In "Show original" confirm `Content-Type: multipart/alternative` with both `text/plain` and `text/html`; the text part carries the heading, the welcome paragraph, and `Verify your email [https://…]`. View in a plain-text-only mode (Apple Mail "Plain Text") for the no-HTML case.
- Set `recipientEmail` to the seeded `suppressed@send.<student>.<tld>`, click send; confirm the suppression card renders (branches on `code === 'forbidden'`) and the Resend "Logs" tab shows no entry. Confirm the `[email] suppressed` line — not a `resend.emails.send` call — fires in the `pnpm dev` terminal.
- Send to a fresh inbox, note the send ID, immediately click again with the same recipient; confirm the same send ID and exactly one inbox email. Change `firstName`, click again — still one email, same key.

Close with the **senior recap and forward references** (chapter's final lesson). Name the disciplines installed: one named send seam; suppression read at the wrapper; required idempotency key; pure-renderer template; five-seam action funneling all failures through one `Result`; env fail-closed at boot; verified domain + DKIM/DMARC + suppression as the deliverability floor. Point to the chapter-framing forward-references list for where each extends (Unit 8 verification email, Unit 9 invitations, Chapter 064 receipts, Unit 13 dispatcher, lesson 5 of chapter 063 webhook writer, the DMARC `p=none`→`p=quarantine`→`p=reject` graduation). Note the "Show original" header check is the 2026 reflex for every later send — run the cross-client check once per chapter, not per send; on production rollout the Vercel env panel uses the *production* Resend key (the per-environment key discipline from lesson 1 of chapter 048).

## Scope

- Does not cover the Resend account, domain verification, or SPF/DKIM/DMARC setup — that is Lesson 2 (the verified-domain ceremony). This lesson assumes the subdomain reads `Verified`.
- Does not cover `src/lib/email.ts`, `isSuppressed`, or the env-schema additions — those land in Lesson 3 (the suppression-gated send wrapper). The action consumes them as given.
- Does not implement the verify link's real token — Unit 8 (Better Auth) replaces the placeholder and reuses this exact wrapper/action shape.
- Does not write to `email_suppressions` — the bounce/complaint webhook *writer* is lesson 5 of chapter 063; this lesson only reads through the wrapper.
- Does not touch the inspector page or form — both are provided; the lesson only wires the action they already import.
