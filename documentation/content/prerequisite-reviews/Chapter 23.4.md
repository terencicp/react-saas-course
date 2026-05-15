# Chapter 23.4 prerequisites review

## Missing prerequisites

- Lesson 23.4.3 — `ctx.orgName` used without prior introduction. Quote: "invoiceQAPrompt({ orgName: ctx.orgName })". The `authedRoute` context as defined in 10.2.3 contains `{ user, orgId, role, db }` — no `orgName` field. No prior chapter extends the context shape or shows how to retrieve the org's display name alongside `orgId`. The student cannot derive where `ctx.orgName` comes from. Suggested source: extend 10.2.3 to include `orgName` in the `ctx` payload (one additional lookup inside `requireOrgUser`), or add a brief note in 23.4.3 itself showing the fetch from `ctx.db.query.organization.findFirst`. Severity: medium.
