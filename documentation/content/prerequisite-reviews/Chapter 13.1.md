# Chapter 13.1 prerequisites review

## Missing prerequisites

- <Lesson 13.1.1> — Vercel Fluid Compute time caps and `maxDuration`. Quote: "Vercel fluid compute caps at 14 minutes on paid, 1 minute on Hobby, and every second is on the user's request". The specific tier caps and the `maxDuration` config key are used as established threshold facts in 13.1.1, 13.1.2 ("A cron job is a function invocation — same caps as any route"), and 13.1.3 ("Past function time limit — work needing more than 14 minutes on Pro fluid compute (1 minute on Hobby)"). The dedicated lesson covering Fluid Compute is 21.3.3, which arrives eight units later. Suggested source: a brief treatment in Chapter 5.1 or 5.2 (Next.js / App Router fundamentals), or a new standalone lesson in Unit 5 covering the serverless invocation model and `maxDuration` tier caps. Severity: high.
