# Chapter 21.5 prerequisites review

## Missing prerequisites

- **Lesson 21.5.2** — `hey` HTTP load-testing CLI. Quote: "rate limit (`hey -n 50 -c 5 https://<APP_URL>/api/auth/sign-in` returns 429s after the threshold)". The `hey` binary is used without prior introduction; no prior chapter names it or explains how to install it. Chapter 21.3.8 describes the same verification step as "a script hitting `/api/auth/sign-in` 50 times in 10 seconds" but names no specific tool. Suggested source: add a one-liner introduction of `hey` (or an equivalent such as `curl` in a loop) in Lesson 21.3.8 where the rate-limit launch-checklist row is first described. Severity: low.
