sources:
  13.1: Set-Cookie attributes and the safe default

questions:
  - source: 13.1
    question: |
      Your transfer endpoint is a `POST`, and the session cookie is set with `SameSite=Lax`. A user clicks a malicious link in another tab that silently POSTs to that endpoint. What happens, and why?
    choices:
      - text: |
          The browser withholds the session cookie on the cross-site POST, so the server sees an unauthenticated request and refuses — the CSRF attack fails.
        correct: true
      - text: |
          The cookie is attached because the POST targets your own site, so the transfer goes through — `Lax` only blocks `<img>` and `<iframe>` loads.
        correct: false
      - text: |
          The cookie is attached because the request is a top-level navigation, so you need `SameSite=Strict` to block it.
        correct: false
    why: |
      `Lax` attaches the cookie on same-site requests and on top-level *safe-method* navigations (an `<a>` click, a GET), but **not** on cross-site `POST`. That is exactly the CSRF surface: a cross-site state-changing POST arrives with no cookie, the server sees a logged-out request, and the action fails. `SameSite=Lax` plus putting every state-changing endpoint behind POST/PUT/DELETE is the CSRF floor.

  - source: 13.1
    question: |
      A teammate adds `HttpOnly` to the session cookie and says "now an XSS bug on the page can't touch the session." What is the precise correction?
    choices:
      - text: |
          `HttpOnly` blocks a script from *reading* the cookie value, but a script can still fire authenticated requests like `fetch('/transfer', { method: 'POST' })` — the browser attaches the cookie regardless of who triggered the request.
        correct: true
      - text: |
          He's right — `HttpOnly` removes the cookie from every request a script makes, so injected script runs unauthenticated.
        correct: false
      - text: |
          `HttpOnly` only matters over HTTP; on HTTPS it has no effect, so the session is still fully exposed.
        correct: false
    why: |
      `HttpOnly` closes the JavaScript *read* path (`document.cookie` can't see it), which cuts off the most damaging move: steal the cookie and replay it elsewhere indefinitely. It does **not** stop XSS from acting inside the page — the browser, not the script, attaches the cookie, so authenticated `fetch` calls still carry it. It's defense-in-depth, not a cure.

  - source: 13.1
    question: |
      You want a session cookie locked to the exact host that set it, with no chance a subdomain like `marketing.acme.com` can read or plant it. Which configuration does that?
    choices:
      - text: |
          `Set-Cookie: __Host-sid=...; HttpOnly; Secure; SameSite=Lax; Path=/` — omit `Domain` entirely.
        correct: true
      - text: |
          `Set-Cookie: sid=...; HttpOnly; Secure; SameSite=Lax; Path=/; Domain=acme.com` — set `Domain` explicitly to be safe.
        correct: false
      - text: |
          `Set-Cookie: __Host-sid=...; HttpOnly; Secure; SameSite=Lax; Path=/; Domain=acme.com` — the prefix plus `Domain` double-locks it.
        correct: false
    why: |
      Host-only scope is the *default you get by leaving `Domain` off* — reaching for `Domain=acme.com` does the opposite, handing the cookie to every subdomain (including a lower-security marketing CMS). The `__Host-` prefix is the browser-enforced guarantee: it *requires* no `Domain`, plus `Secure` and `Path=/`. So the third option is rejected by the browser outright — `__Host-` and `Domain` are mutually exclusive.
