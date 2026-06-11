sources:
  74.1: "Two layers: edge WAF and application limiter"
  74.2: "The @upstash/ratelimit API surface"
  74.3: "Dual-keying the auth endpoints"

questions:
  - source: 74.1
    question: |
      Your app is about to launch publicly on a custom domain with the Better Auth email-and-password sign-in form. You already have a Vercel WAF rule capping requests per IP on `/api/auth/*`. Is that enough?
    choices:
      - text: |
          No. The WAF sees IP, path, and headers but never the email in the request body, so it can't stop a botnet spread across thousands of IPs from hammering one victim's email — that per-email check has to run inside the application.
        correct: true
      - text: |
          Yes. A per-IP cap at the edge covers credential stuffing — every attacker request still comes from *some* IP, so the WAF eventually throttles them all.
        correct: false
      - text: |
          Yes, as long as the per-IP budget is set aggressively low so even a handful of extra requests gets blocked.
        correct: false
    why: |
      The public-URL-plus-auth trigger is exactly the moment the application limiter becomes non-negotiable. Distributed credential stuffing sends one request per IP — no per-IP cap trips — and a cap tight enough to try would lock out a whole office behind one NAT. Only a per-email limit, visible after the body is parsed, catches it. The WAF stays as the outer ring; the app limiter is the inner ring.

  - source: 74.1
    question: |
      Upstash is down for maintenance and `limiter.limit(key)` is throwing on every sign-in attempt. What's the senior default for the auth path, and why?
    choices:
      - text: |
          Fail open — allow the request through and log a loud `rate_limit_unavailable` error — because fail-closed would turn a limiter outage into a total sign-in outage for every user.
        correct: true
      - text: |
          Fail closed — reject the request as if it were over budget — because an unverifiable gate should always deny, the same as a broken authorization check.
        correct: false
      - text: |
          Swallow the error quietly and allow the request, so monitoring isn't flooded with noise during the incident.
        correct: false
    why: |
      A bounded abuse window during a Redis incident is far less bad than locking the entire user base out of their own accounts, and the WAF outer ring still catches crude abuse. So the auth path fails open — but never silently: the catch writes a structured error so a sustained stream surfaces as an Upstash incident. (High-value endpoints like a non-retryable billing webhook may flip to fail-closed; sign-in isn't one of them.)

  - source: 74.2
    question: |
      A teammate declares `new Ratelimit(...)` inside the route handler's `POST` function instead of at module scope. The counts in Redis still look correct in testing. What's actually wrong?
    choices:
      - text: |
          A fresh limiter with a cold, empty in-memory cache is built on every request, so every call pays a Redis round-trip — slower and pricier under load, while passing fine in dev where the process stays hot.
        correct: true
      - text: |
          The counts will be wrong in production because each request resets the counter to zero.
        correct: false
      - text: |
          Nothing — declaring the limiter inside the handler is the correct place for it, since it needs the request to exist first.
        correct: false
    why: |
      The library's `ephemeralCache` only survives if the limiter object survives between requests, which means module scope. Declared in the handler it's rebuilt every call with an empty cache — the counts stay correct (so dev never reveals it), but every call hits Redis. The cost surfaces only under real traffic, as latency and bill.

  - source: 74.2
    question: |
      You're rate-limiting an endpoint that calls an LLM: you want to tolerate a short burst of requests but cap sustained spend over time. Which algorithm fits, and why isn't sliding window the obvious pick here?
    choices:
      - text: |
          Token bucket — the bucket lets a full burst through, then throttles to the steady refill rate, which matches "burst is fine, cap the ongoing rate."
        correct: true
      - text: |
          Sliding window — it's always the right default, including for bursty workloads.
        correct: false
      - text: |
          Fixed window — its boundary spike is exactly the burst behavior you want.
        correct: false
    why: |
      Sliding window is the default *for the auth surface* because it gives the smoothest cap with no boundary spike — but when a burst is legitimate and you only care about sustained rate (an LLM endpoint), token bucket is the deliberate reach: full bucket allows the burst, refill rate caps the long-run spend. Fixed window's boundary slop is a weakness, not a feature.

  - source: 74.3
    question: |
      The sign-in action runs two `safeLimit` calls on the same `signInLimiter` — one keyed `ip:${ip}`, one keyed `email:${email}`. Which statements about this design are correct? (Select all that apply.)
    choices:
      - text: |
          Both `success` values must be checked with their own early return; checking only the IP gate leaves the credential-stuffing vector wide open.
        correct: true
      - text: |
          The `ip:` and `email:` prefixes on the *key* keep the two budgets in separate Redis counters even though they share one limiter and one prefix.
        correct: true
      - text: |
          The per-email budget should be set *tighter* than the per-IP budget, since the email is what you're really protecting.
        correct: false
    why: |
      Both gates are real gates — drop either `if (!...) return` and half the defense is silently off. The `ip:`/`email:` key prefixes split one limiter into two independent budgets (`rl:signin:ip:...` vs `rl:signin:email:...`). And the per-email budget must be comparable to or *looser* than per-IP: make it tighter and an attacker behind a shared NAT can burn a victim's email budget and re-open the lockout vector.

  - source: 74.3
    question: |
      Sign-up is gated per-IP only, while sign-in and password reset are also gated per-email. Why does sign-up skip the per-email gate?
    choices:
      - text: |
          On sign-up the email is the attacker's own choice — they can cycle a fresh address every request, so a per-email budget never fills and the gate does nothing. The originating IP is the abusable identity there.
        correct: true
      - text: |
          Sign-up traffic is too low to bother adding a second gate.
        correct: false
      - text: |
          A per-email gate on sign-up would confirm whether an email already exists, leaking account enumeration.
        correct: false
    why: |
      The key strategy falls out of one question: who is the abusable identity? On sign-in and reset a *victim's* email is in play, so the per-email gate protects them. On sign-up the email belongs to the attacker, who just rotates it — keying on it is no gate at all, so sign-up gates the one thing they can't change for free: the source IP.
