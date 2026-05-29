# Chapter 013 — Cookies and the trust model

## Lesson 1 — Set-Cookie attributes and the safe default

**Taught.** Every `Set-Cookie` attribute (`HttpOnly`, `Secure`, `SameSite` Strict/Lax/None, `Path`, `Domain`, `Max-Age`/`Expires`, `__Host-`/`__Secure-` prefixes, `Partitioned`/CHIPS) mapped to the failure mode it prevents, the memorized safe-default line, and the Next.js 16 `cookies()` read/write/delete helper.

**The canonical safe default (verbatim, reuse identically everywhere):**
```
Set-Cookie: __Host-sid=<value>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000
```
Next.js option-bag form: `{ name: '__Host-sid', value, httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 }`. Session cookie name in examples is `sid`/`__Host-sid`, holding an opaque ID only.

**Cut.** Cookie size/count caps (4 KB, 50/domain) and the `Cookie:` request-header concatenation cost — outline watch-outs, dropped as non-load-bearing for downstream lessons.

**Debts.**
- XSS depth -> later security chapter (named only as `Term`).
- CSRF token / double-submit patterns -> security-baseline chapter (Ch 081). Lesson states `SameSite=Lax` + state-changing methods is "the floor, not the whole story."
- Session value design (opaque ID vs JWT, signing, rotation) -> Better Auth chapter (Ch 052). Lesson asserts opaque server-stored session, cookie carries only the ID.
- `cookies()` full API (`RequestCookies` vs `ResponseCookies`, the streaming/rendering boundary) -> App Router unit (Unit 4). Lesson states only the rule: write in Server Actions / Route Handlers, never a rendering Server Component (throws).
- Server Components / Server Actions / Route Handlers named as the three App Router server contexts but defined in Units 4 & 6.

**Terminology.** "ambient credential" (browser attaches automatically, app code never does); "on-path attacker"; "top-level navigation"; "safe method" (GET/HEAD); CHIPS = Cookies Having Independent Partitioned State; FedCM (named only). Three-beat section structure: what it controls / what breaks without it / the default.

**Patterns and best practices.**
- Always write `SameSite` explicitly, never rely on the implicit-Lax default.
- `__Host-` prefix is the 2026 default for host-locked cookies; `__Secure-` + `Domain` only when cross-subdomain sharing is the explicit feature.
- Cross-site embed cookie shape: `Secure; SameSite=None; Partitioned` (set both `SameSite=None; Secure` and `Partitioned` during transition).
- Drop `HttpOnly` only for genuinely client-read cookies (`theme`, double-submit CSRF token).
- Four memorized triggers to leave the default: cross-site embed, client-must-read, cross-subdomain sharing, legacy HTTP fixture.
- Local dev assumes HTTPS via mkcert (Ch 010) so `Secure`/`__Host-` cookies behave as in prod.

**Misc.** 2026 third-party-cookie stance baked in: Safari/Firefox block by default; Google (Apr 2025) will NOT deprecate 3p cookies in Chrome and ships no choice prompt; Oct 2025 retired most Privacy Sandbox APIs but keeps CHIPS, FedCM, Private State Tokens. Conclusion to keep consistent: 3p cookies not dead but unreliable; CHIPS is the surviving cross-site mechanism. Round-trip rule emphasized: a `set` cookie is not readable in the same request (lands on next request). 400-day lifetime cap. Lesson uses raw `Set-Cookie` header strings (wire format) for teaching, TS only in the helper section — intentional staging.
