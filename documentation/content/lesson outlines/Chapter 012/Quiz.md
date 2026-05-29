sources:
  12.1: Parse, don't concatenate
  12.2: Origin is the unit of browser trust
  12.3: The preflight dance

questions:
  - source: 12.1
    question: |
      You build a search URL by hand: `` `?q=${encodeURIComponent(searchTerm)}` ``. Later, on the server, you parse it with `new URLSearchParams(req.url.search)`. A user searches for the literal string `a+b`. What goes wrong?
    choices:
      - text: |
          Nothing — `encodeURIComponent` and `URLSearchParams` agree on every character, so the round trip is safe.
        correct: false
      - text: |
          `encodeURIComponent` leaves the `+` untouched, and `URLSearchParams` decodes that `+` as a space — so the search term comes back as `a b`.
        correct: true
      - text: |
          `URLSearchParams` throws because the query string was not built by a `URLSearchParams` instance.
        correct: false
    why: |
      The two tools disagree about `+`. In a form-urlencoded query, `+` means space, so `URLSearchParams` reads `a+b` as `a b`. The fix is a posture, not a character lookup: encode and decode with the same model end to end — do both with `URLSearchParams`.

  - source: 12.1
    question: |
      Your `base` URL comes from a validated environment variable at boot, while a `next` redirect target comes from a query string a user controls. Which construction pattern fits each?
    choices:
      - text: |
          Use `new URL()` for the env-derived base and let it throw; guard the user-supplied `next` with `URL.canParse()` before parsing.
        correct: true
      - text: |
          Wrap both in `try`/`catch` so neither can ever crash the request.
        correct: false
      - text: |
          Use `URL.canParse()` for the base and `new URL()` for `next`, since user input is the one you want to fail fast on.
        correct: false
    why: |
      The rule splits by trust. A malformed config value is a deploy bug you *want* to fail fast and loud, so let `new URL()` throw. Bad user input is data you fully expected to receive, so guard it with `URL.canParse()` instead of throwing.

  - source: 12.2
    question: |
      Classify the pair `https://a.github.io` and `https://b.github.io` on both axes.
    choices:
      - text: |
          Same site (they share `github.io`), different origin.
        correct: false
      - text: |
          Different origin *and* different site — `github.io` is on the Public Suffix List as an eTLD, so the registrable domain is the whole `a.github.io`.
        correct: true
      - text: |
          Same origin and same site — they only differ by a subdomain label.
        correct: false
    why: |
      "Same site = last two labels" is the shortcut that breaks here. `github.io` is an eTLD on the Public Suffix List, so eTLD+1 is the full `a.github.io` / `b.github.io` — two unrelated owners, two different sites.

  - source: 12.2
    question: |
      A developer wires account deletion to `GET /account/delete?id=42` and assumes the same-origin policy protects it from `evil.com`. Why is the account still deletable from an attacker's page?
    choices:
      - text: |
          The same-origin policy gates the *response read*, not the request. The `GET` fires (e.g. from an `<img>`), the session cookie attaches, the delete runs — and no CORS error ever appears because the attacker never needed to read the response.
        correct: true
      - text: |
          The same-origin policy only applies to `fetch`, so embedding the URL in an `<img>` bypasses it entirely as a loophole.
        correct: false
      - text: |
          It is protected — the browser would block the cross-origin `GET` and show a CORS error, so the account is safe.
        correct: false
    why: |
      The policy protects the *user* (confidentiality of the response), not the *server*. It blocks the read, never the request. State changes belong behind `POST`/`PUT`/`PATCH`/`DELETE`, defended by `SameSite` cookies and CSRF tokens — never a `GET`.

  - source: 12.3
    question: |
      Which of these cross-origin `fetch` calls trigger a preflight `OPTIONS` request? (Select all that apply.)
    choices:
      - text: |
          A `POST` sending `Content-Type: application/json`.
        correct: true
      - text: |
          A `GET` carrying an `Authorization: Bearer …` header.
        correct: true
      - text: |
          A plain `GET` with no custom headers and no body.
        correct: false
    why: |
      A request is "simple" only when method, headers, and `Content-Type` all stay on the CORS-safelist. `application/json` is not safelisted, and `Authorization` is not a safelisted header — so both preflight. The working reality: any JSON or token-bearing call preflights, which is nearly your whole authenticated API surface.

  - source: 12.3
    question: |
      Your client sends `fetch(url, { credentials: 'include' })` and the server replies with `Access-Control-Allow-Origin: *` plus `Access-Control-Allow-Credentials: true`. The browser blocks the read. What is the fix?
    choices:
      - text: |
          Validate the incoming `Origin` against an allow-list, echo that exact origin back in `Access-Control-Allow-Origin`, and add `Vary: Origin`.
        correct: true
      - text: |
          Change the client to `credentials: 'same-origin'` so the wildcard becomes legal again.
        correct: false
      - text: |
          Add `Access-Control-Max-Age` so the browser caches the preflight and stops re-checking the wildcard.
        correct: false
    why: |
      The wildcard is legal only without credentials — "anyone may read this, with the user's cookies attached" is the one combination the browser forbids. Echo the exact validated origin instead, and because the response now depends on `Origin`, send `Vary: Origin` so caches key by origin.

  - source: 12.3
    question: |
      A cross-origin call fails with the console error *"Response to preflight request doesn't pass access control check: It does not have HTTP ok status."* Where is the bug?
    choices:
      - text: |
          The `OPTIONS` preflight handler returned a non-2xx status — it should return `204` with the CORS headers.
        correct: true
      - text: |
          The client `fetch` call set the wrong `mode`; switch it to `'no-cors'`.
        correct: false
      - text: |
          `Access-Control-Allow-Origin` is missing from the *real* request's response — add it to the `GET`/`POST` handler.
        correct: false
    why: |
      This error is specifically about the preflight round trip. The browser sent an `OPTIONS` and got back a non-OK status, so it cancelled the real request. A CORS error is almost always a server fix — here, make the `OPTIONS` export return `204` with the headers.
