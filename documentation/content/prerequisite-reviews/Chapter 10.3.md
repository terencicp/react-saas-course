# Chapter 10.3 prerequisites review

## Missing prerequisites

- Lesson 10.3.1 — `crypto.subtle.digest` SHA-256 at implementation depth. Quote: "The token is 32 bytes of `crypto.getRandomValues` encoded as base64url (43 characters) ... only `sha256(token)` lands in the database." The call shape for `crypto.subtle.digest('SHA-256', buffer)` is used as if known throughout the chapter. Lesson 3.7.1 names `digest` only at recognition level: "The lesson teaches HMAC at depth and names the rest for recognition." No prior lesson gives the call shape, the `ArrayBuffer` return, or the bytes-to-hex pipeline needed to produce `tokenHash`. Suggested source: expand 3.7.1 to teach `digest` at the same depth as HMAC sign/verify, or add a brief callout in 3.7.1's Watch-outs. Severity: high.
