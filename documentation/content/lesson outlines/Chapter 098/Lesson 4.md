# Custom domains and automatic SSL

**Sidebar label:** Custom domains & SSL

---

## Lesson framing

Setup/wiring + decision lesson. The `*.vercel.app` URL works but is a dev artifact (established L2 — "share the project alias until the custom domain lands"). Going live means a brand domain that resolves correctly and serves a valid certificate. This lesson lands the smallest set of DNS records, what Vercel automates (the cert), the one decision the student makes once (apex vs `www` canonical), and the one senior pitfall (Cloudflare-in-front SSL mode).

Mental model the student should leave with: **a live domain is a pointer plus a lock.** The *pointer* is DNS — the student's job, set once at the registrar. The *lock* is TLS — Vercel's job, fully automatic via Let's Encrypt. Frame the pointer half against L1's already-installed "alias is a pointer" model: DNS points the domain at Vercel's edge; Vercel's alias points the edge at the current deployment. Two pointers in series.

Where beginners struggle first time:
- **DNS record types.** A vs CNAME vs ANAME/ALIAS, and *why apex often can't CNAME*. This is the single most confusing first-contact moment. Spend a diagram on it.
- **Propagation feels broken.** "I added the record, the dashboard still says invalid." Not broken — TTL-bound caching. Name the mechanism so the student waits instead of thrashing.
- **The double-TLS hop with Cloudflare.** Two independent certs (Cloudflare's edge cert, Vercel's origin cert), two terminations. "Flexible" mode silently leaves the second hop unencrypted. This is invisible until someone audits it — the senior diff.

Pain relieved: no cert purchase, no OpenSSL CSR ritual, no manual renewal, no expiry outage at 2am. Vercel + Let's Encrypt is why the 2026 default is "type two DNS records and walk away." Lead with that relief — the student may have a mental image of SSL as painful from older tutorials; correct it early.

Tone: terse, senior. This is a procedure lesson, so the through-line is "what do I actually set, and how do I prove it's done" — not DNS theory for its own right. Anchor the close on a copy-pasteable verification checklist (the `dig`/`curl` commands) so the student finishes with a concrete "domain is ready" gate, mirroring the chapter's checklist-as-structural thread (the L8 launch checklist will reference it).

Almost no React/TSX. Artifacts: DNS records (rendered as a small table, not code), three shell commands for verification, and one tiny `next.config.ts` redirect note (deferred mostly to L8 for HSTS). Authenticated Vercel UI (Settings → Domains) shown as an HTML/CSS mock, not a real screenshot — matches L2's figure convention.

---

## Lesson sections

### Introduction (no header)

Open on the relief, not the theory. The student already shipped to `<project>.vercel.app` (L2); that URL is fine for the team, wrong for customers — it's unbranded and signals "not a real product." Going live = a custom domain with a green padlock. State the payoff up front: in 2026 that's two DNS records and zero certificate work, because Vercel provisions and renews the TLS certificate for you. Preview the four things this lesson delivers: (1) the records to set, (2) the cert Vercel handles automatically, (3) the one-time apex-vs-`www` decision, (4) the Cloudflare-in-front pitfall. Name the senior question implicitly: *what's the minimum to set, what does the platform handle, and what's the failure mode while DNS is mid-flight?*

### A live domain is a pointer plus a lock

Install the core mental model before any clicking. Two independent concerns:

- **The pointer (DNS).** The domain name has to resolve to Vercel's edge. That's a DNS record at the registrar. The student's responsibility, set once.
- **The lock (TLS).** Browsers demand HTTPS; the domain needs a valid certificate. Vercel's responsibility, fully automatic.

Connect explicitly to L1: there the production *alias* was a pointer Vercel re-aims at the current deployment. Now there's a second pointer *upstream* of it — DNS points `app.example.com` at Vercel; Vercel's alias points its edge at the live deployment. A request traverses both. Reusing the pointer metaphor lowers cognitive load — the student already owns half the model.

Small diagram here (described in next section's first figure) is optional but the two-pointers-in-series idea is worth a one-line visual. Keep this section short — it's the frame, not the content.

Terms to gloss with `Term`: **DNS** (the internet's name→address lookup; turns `example.com` into the address a browser connects to), **TLS** (the protocol behind HTTPS; the "lock" — encrypts the connection and proves the server's identity), **TLS certificate** (the signed file proving the domain owns its TLS identity; what expires and must renew).

### Apex versus www: pick one canonical

The one decision the student makes, and it's near-irreversible in practice (flip-flopping is a migration with redirect/SEO cost). Teach the trade and force a choice.

- **Apex** (`example.com`) — shortest, the brand. The modern default for the marketing site.
- **`www`** (`www.example.com`) — historically easier on DNS (see next section's CNAME constraint), and some large sites still prefer it.
- The rule: **pick one as canonical, 301/308-redirect the other to it.** Never serve both — search engines see two sites (duplicate content), and links fragment. Vercel does the redirect for you once both are added and one is marked canonical.

Course default: **apex canonical**, `www` redirects to it. State it as the default and move on — this is "defaults before conditionals."

Briefly name the SaaS subdomain split as a forward pointer without teaching it: marketing on the apex, the app commonly on `app.example.com`, docs on `docs.example.com`. Per-tenant subdomains (`<tenant>.example.com`) are an explicit Unit 9 topic — name once, do not teach. This keeps the lesson from sprawling into multi-tenancy.

Exercise candidate: a short `MultipleChoice` — "You're shipping a marketing site and want the cleanest brand URL; which do you make canonical and what happens to the other?" One correct (apex canonical, `www` 308-redirects), distractors that serve both (duplicate-content trap) or CNAME the apex (sets up the next section's lesson). Lightweight; reinforces the decision before the mechanics.

### The two DNS records, and why apex is the awkward one

The technical heart. This is where first-timers get stuck, so go slow and lead with the *why*.

Content:
- **`www` / any subdomain → CNAME** to the value Vercel shows. A CNAME aliases one name to another name — clean, standard, supported everywhere. **Current Vercel reality (verified June 2026):** Vercel now issues *per-project, dynamic* DNS targets — a CNAME like `<project>.vercel-dns-NNN.com` and an Anycast IP drawn from a plan-tailored pool — rather than the single legacy `cname.vercel-dns.com` / `76.76.21.21`. The legacy values still resolve, but the dashboard's per-project value is canonical. The durable lesson is therefore *"copy whatever Settings → Domains tells you,"* not any specific string.
- **Apex → the problem.** The DNS spec forbids a CNAME at the apex (the zone root coexists with required `SOA`/`NS` records; a CNAME can't share a name with other records). So the apex can't simply CNAME to Vercel.
- **Two fixes for the apex:** (1) an **`A` record** to Vercel's Anycast IP — always works, but the IP is Vercel-owned and could change (Vercel publishes the current per-project value in the dashboard; copy it from there, don't hardcode from memory). (2) **`ANAME`/`ALIAS`** (a "CNAME-flattening" record) if the registrar supports it — behaves like a CNAME at the apex, auto-tracks Vercel's IP changes. Prefer ANAME/ALIAS when available; fall back to the A record.

Teach the mechanism, not a memorized IP — the continuity rule is "check current value in UI." Explicitly tell the writer: **do not hardcode a specific Vercel CNAME target or anycast IP in prose as authoritative**; show any value as a clearly-labeled placeholder ("example — read the live per-project value from Settings → Domains") because Vercel issues these dynamically per project and rotates them.

This section carries the lesson's anchor diagram.

**Figure — `TabbedContent`, two tabs, the record-setup comparison.** Pedagogical goal: make the apex-vs-subdomain asymmetry visual and concrete, since the abstract "apex can't CNAME" rule is what trips people. Each tab is a small HTML/CSS DNS-record table (Type / Name / Value / TTL columns).
- Tab "`www` subdomain (CNAME)": one row — `CNAME | www | <project>.vercel-dns-NNN.com | 300`, with the value clearly marked "example — read your per-project value from the dashboard."
- Tab "Apex (A or ALIAS)": two rows showing the alternatives — `A | @ | <Vercel Anycast IP, read from dashboard> | 300` and `ALIAS | @ | <project>.vercel-dns-NNN.com | 300` with a caption noting "use ALIAS/ANAME if your registrar offers it, otherwise the A record." Caption ties back to *why*: the apex can't be a CNAME. Every value rendered as a labeled placeholder, never as an authoritative string (Vercel issues these per-project and rotates them).
Use `TabbedContent` (not `CodeVariants`) because these are config tables, not code. Keep tables compact, horizontal.

The "add the domain in Vercel" click flow goes here as a short `Steps` block: Settings → Domains → enter the domain → Vercel shows the exact record(s) to create → create them at the registrar → Vercel auto-detects and provisions. Pair with an HTML/CSS mock of the Vercel Domains panel (Figure + the same mock-not-screenshot convention as L2) showing the "Valid Configuration" / "Invalid Configuration" status states — the status pill is the thing the student watches.

Terms: **apex / zone root** (the bare domain with no subdomain — `example.com`), **CNAME** (a DNS record aliasing one name to another), **A record** (maps a name directly to an IP), **ANAME/ALIAS** (a CNAME-like record allowed at the apex; resolves to the target's IP — also called CNAME flattening), **anycast** (one IP announced from many locations; the network routes to the nearest — how Vercel's edge serves one A-record IP globally), **TTL** (time-to-live; how long resolvers cache a record before re-querying).

### Propagation, and the automatic certificate

Two coupled ideas: the wait, and what happens at the end of it (the cert). Pairing them keeps the student from panicking during the wait.

- **Propagation.** From "saved at the registrar" to "Vercel sees it" is seconds to hours, bounded by the *old* record's TTL still living in caches. The dashboard polls and shows status; the student waits, doesn't re-edit. **Senior move:** lower the record's TTL to ~300s *before* making changes, so a later cutover propagates fast; raise it back to 3600+ once stable. Frame TTL as a dial you turn down before surgery and up after.
- **Automatic SSL.** Once DNS resolves to Vercel, Vercel automatically requests a **Let's Encrypt** certificate, installs it, and **auto-renews** it before expiry. No CSR, no upload, no cron, no renewal outage. This is the relief promised in the intro — make it land here explicitly: the entire historical cert ritual collapses to "wait for the green status." Custom-uploaded certs are Enterprise-only; the student never needs one.
- **HTTPS enforcement.** Vercel auto-redirects HTTP→HTTPS on custom domains. But the **HSTS header is not added automatically** — that's an app-level response header. Name it here as a one-liner and forward-reference: the `Strict-Transport-Security` header is set in `next.config.ts` and verified on the L8 launch checklist (and authored fully there / Chapter 081). Do not teach HSTS syntax here — just plant that "HTTP→HTTPS redirect is automatic; the HSTS *header* is your job, covered at launch." This matches the code-conventions split (headers in `next.config.ts`).

`Term`: **Let's Encrypt** (free, automated certificate authority; issues the short-lived certs Vercel auto-renews), **HSTS** (HTTP Strict Transport Security; a response header telling browsers to only ever use HTTPS for this domain), **propagation** (the delay while DNS caches expire and pick up a changed record).

Optional `Aside` (caution): the "it's been 5 minutes and still says invalid" reassurance — propagation is normal, check from an external resolver (next section's `dig`) rather than re-saving the record.

### Putting Cloudflare in front without breaking TLS

The senior pitfall and the most error-prone real-world config. Many SaaS teams front Vercel with Cloudflare for WAF, DDoS protection, analytics, and edge rules. The setup introduces a *second* TLS termination, and getting the mode wrong is silently insecure.

**Senior framing first (verified June 2026):** Vercel itself now *discourages* a Cloudflare proxy in front of Vercel — it blinds Vercel's own Firewall/Bot Protection to real client traffic, adds latency, and complicates caching. Vercel's built-in Firewall is the default edge-security answer for a 2026 SaaS; Cloudflare-in-front is a deliberate exception teams choose for specific needs (existing Cloudflare WAF rules, multi-origin edge logic). Frame the section as "*if* you run Cloudflare in front — and the default is don't — here's the one rule that keeps it secure." This keeps the lesson from implying the proxy is the recommended path while still teaching the pitfall that bites teams who do it.

- **The topology.** Domain's nameservers move to Cloudflare; Cloudflare proxies (orange-cloud / proxy-on) to Vercel via a CNAME. Now there are **two TLS hops**: browser→Cloudflare, and Cloudflare→Vercel. Two certs: Cloudflare's edge cert (browser-facing) and Vercel's origin cert (Cloudflare-facing, the Let's Encrypt one from the previous section).
- **The rule:** Cloudflare SSL/TLS mode **must be "Full (strict)."** Walk the modes to make the failure modes concrete:
  - *Flexible* — Cloudflare→Vercel hop is **plain HTTP**. Browser shows a padlock but the origin leg is unencrypted, and Vercel (HTTPS-only) will redirect-loop. Wrong and insecure.
  - *Full* — origin leg is encrypted but Cloudflare does **not validate** Vercel's cert. Encrypted but spoofable.
  - *Full (strict)* — origin leg encrypted **and** Vercel's cert validated end-to-end. The only correct setting.
- Why this is a senior diff: the padlock looks fine in all three modes from the browser; only "Full (strict)" is actually end-to-end secure. The bug is invisible without auditing the second hop.

**Figure — `ArrowDiagram` (or simple HTML+CSS strip), the two-hop TLS path.** Pedagogical goal: make the *two independent terminations* visible, because the whole pitfall is that beginners model it as one connection with one lock. Three boxes left→right: Browser → Cloudflare edge → Vercel edge. Two arrows, each labeled with its TLS hop and its cert: arrow 1 "TLS · Cloudflare edge cert", arrow 2 "TLS · Vercel (Let's Encrypt) cert". A caption states the rule: "'Full (strict)' is the only mode where *both* arrows are encrypted and validated." Use `expandable={false}` if `ArrowDiagram` (per its leader-line constraint). If arrows would crowd, fall back to a plain HTML strip with two colored hop segments — the two-segment idea is the whole point.

Exercise candidate: `MultipleChoice` (or `TrueFalse` round) on the Cloudflare modes — "Browser shows a padlock, so the connection is end-to-end encrypted: true/false" (false — Flexible leaves the origin hop plain), plus "which mode validates the origin cert" (Full strict). This is the highest-value check in the lesson because it targets the invisible failure. Prefer a 2-3 statement `TrueFalse` round to hit both the padlock-illusion and the mode choice.

`Aside` (danger): the one-liner — "Cloudflare on 'Flexible' in front of Vercel is the classic insecure-but-looks-fine setup. Default to 'Full (strict)'." Place it right after the modes walk-through.

Note the verification record dance briefly: moving a domain already attached to another Vercel project may require a TXT verification record at the registrar; add it, verify, and don't delete it (Vercel re-checks). One sentence — it's an edge case, not core.

### Proving the domain is ready

The concrete payoff and the durable artifact. The student should finish with a copy-pasteable gate, not a vague "looks done." This mirrors the chapter's checklist-as-structural thread and is explicitly the thing L8 will reference.

Present as a short checklist of five command-line checks, each with the command and the pass condition. Use a `Code` block (bash) plus a tight numbered `Steps` list, or a `Checklist`/`ChecklistItem` block so the student can tick them:

1. **DNS resolves to Vercel** from an external resolver — `dig +short example.com @1.1.1.1` returns Vercel's IP (proves the pointer, bypassing local cache).
2. **HTTPS serves a valid cert** — `curl -sI https://example.com` returns `200` with no cert error (proves the lock).
3. **HTTP redirects to HTTPS** — `curl -sI http://example.com` returns `308`/`301` with an `https://` `Location`.
4. **The canonical redirect works** — `curl -sIL https://www.example.com` follows to the apex (proves the apex-vs-`www` decision is wired).
5. **Browser sanity check** — load it, see the padlock, click around.

Explain *why each command*, briefly: `@1.1.1.1` dodges the student's own stale cache (the #1 source of "it works for me / it doesn't for them"); `-I` is headers-only; `-L` follows redirects to confirm the canonical hop. Teaching the student to verify from *outside* their own machine is the durable senior habit here.

`Term`: **`dig`** (command-line DNS lookup tool), **resolver** (the DNS server that answers a lookup; `1.1.1.1` is Cloudflare's public one).

Close with a one-line cutover note for domains already live elsewhere: lower TTL ahead of time, prepare the Vercel records before flipping, expect minutes of partial propagation (SSL provisions *after* DNS resolves), do it during low traffic, keep the old DNS records ready to revert. Frame revert-DNS as the rollback primitive for a domain cutover — connects to the chapter's rollback thread (L7) without teaching it.

### External resources (optional)

`ExternalResource` / `LinkCard` to Vercel's "Adding & configuring a custom domain" docs and Cloudflare's SSL/TLS modes doc. Optional `VideoCallout` only if a current (last ~12 months), focused walk-through of "custom domain on Vercel" surfaces — do not force one; the procedure is short enough that a video adds little. Resourcer's call.

---

## Scope

**Prerequisite, redefine in one line each (do not re-teach):**
- The deploy/alias model and "alias is a pointer" — L1. Reuse the metaphor; don't re-explain immutability.
- `<project>.vercel.app` is a dev artifact replaced by the custom domain — L2. One sentence.
- Function region / runtime — L3. Not relevant here beyond a passing nod; do not revisit.

**Out of scope — defer, do not teach:**
- **HSTS / CSP / security-header authoring** — name HSTS as "your job, automatic redirect is not" only; full authoring is the **L8 launch checklist** and **Chapter 081**. The `next.config.ts` `headers()` syntax belongs there.
- **Preview deployments and per-PR Neon branches** — L5. Custom domains are production-facing; previews get `*.vercel.app`.
- **Environment variable scoping** — L6.
- **Rollback mechanics** (`vercel rollback`/`promote`) — L7. Only the one-line "revert DNS is the cutover rollback" pointer here.
- **Per-tenant subdomain routing / wildcard provisioning** — Unit 9. Name `<tenant>.example.com` and wildcard certs once as "exists, later"; do not wire.
- **Domain registration / buying a domain** — assume the student owns a domain at a registrar. Not a Vercel topic.
- **`vercel domains` CLI subcommands** — the dashboard flow is the default; the CLI domain commands are not worth the surface here. Mention `dig`/`curl` (verification) but not `vercel domains add`.
- **Email/MX, DKIM/SPF records** — out of scope; this lesson is web-serving DNS only.

**Convention locks (for downstream agents):**
- Never write `middleware.ts` — it's `proxy.ts` (Next.js 16; established L3). Security headers live in `next.config.ts` + `proxy.ts` per Code conventions; this lesson only *names* the `next.config.ts` side for HSTS.
- Do not hardcode a Vercel anycast IP as authoritative — show as a clearly-labeled example, instruct reading the live value from the dashboard.
- Cross-references: L1/L2/L3 are built — wire real slugs (`/098-ship-to-vercel-and-go-live/...`). L5–L8 are not yet built — refer to them in prose ("the launch checklist lesson"), not as live links.
- Vercel UI figures are HTML/CSS mocks, not screenshots (matches L2).
