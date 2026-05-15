# Chapter 8.3 prerequisites review

## Missing prerequisites

- Lesson 8.3.4 — `NEXT_PUBLIC_APP_URL` env variable. Quote: "const verifyUrl = `${env.NEXT_PUBLIC_APP_URL}/verify/placeholder-${idempotencyKey}`". The variable is used as if already present in `lib/env.ts`, but it is not listed among the entries added in 8.3.3 (`RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`, `NEXT_PUBLIC_APP_NAME`), and no prior chapter outline introduces it — the earliest appearance is Chapter 9.2 (Unit 9). The starter README or 8.3.2's file-tree walk should either add `NEXT_PUBLIC_APP_URL` to the env block in 8.3.3, or the starter should provide it as a carry-in entry with a `TODO Unit 9` comment. Suggested source: add to 8.3.3's env setup block, or note it as provided in the starter alongside `DATABASE_URL`. Severity: medium.
