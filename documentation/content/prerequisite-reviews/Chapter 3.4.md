# Chapter 3.4 prerequisites review

## Missing prerequisites

- **Lesson 3.4.1** — Server Components, Server Actions, and Route Handlers as distinct Next.js execution contexts. Quote: "Read in a Server Component or Route Handler … Write in a Server Action or Route Handler … Calling `set` from a Server Component throws." The lesson uses these three terms as established labels and provides working code examples keyed to each context. Unit 5 (App Router) is where these are taught; it has not been reached yet. Suggested source: forward-introduce Server Components and Server Actions in Chapter 1.3 (toolchain overview) or add a brief orientation paragraph at the start of the `cookies()` section in 3.4.1 itself. Severity: **medium**.

- **Lesson 3.4.1** — XSS (cross-site scripting) as an attack concept. Quote: "XSS that finds an unescaped `innerHTML` sink can read every non-`HttpOnly` cookie and exfiltrate the session." No prior chapter in Units 1–3 introduces XSS. The first formal coverage is Chapter 4.1 (`dangerouslySetInnerHTML`, with depth deferred to 9.4.4), which comes after this chapter. The lesson relies on the student already knowing what XSS is to understand why `HttpOnly` matters. Suggested source: one-sentence inline definition at first use in 3.4.1, or a forward-ref note similar to the CSRF treatment in 3.3.2. Severity: **low**.
