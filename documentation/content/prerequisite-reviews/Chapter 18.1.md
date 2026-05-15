# Chapter 18.1 prerequisites review

## Missing prerequisites

- Lesson 18.1.4 — the `{ pattern, timezone }` object form of Trigger.dev's `schedules.task` `cron` argument. Quote: "From 13.1.4: `schedules.task` accepts a `cron` pattern and a `timezone` argument naming an IANA zone. Canonical shape for '9 AM weekday Eastern': `schedules.task({ id: 'weekly-summary', cron: { pattern: '0 9 * * 1-5', timezone: 'America/New_York' }, run: async (payload) => { ... } })`". Chapter 13.1.4's outline only shows the plain-string cron form (`cron: '0 9 * * *'`) — the `cron: { pattern, timezone }` object shape and the `timezone` argument are never introduced there. Suggested source: extend 13.1.4 to show the object form with `timezone`, or add a short beat to Lesson 18.1.4 that introduces the API shape before using it. Severity: medium.
