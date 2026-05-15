# Chapter 21.4 prerequisites review

## Missing prerequisites

- <Lesson 21.4.3> — `neonctl` CLI tool (install, auth, subcommands). Quote: "a manual `neonctl branches create --parent main` produces a fresh one at any moment" and "close and re-open the PR to get a fresh branch, or `neonctl branches reset`". The CLI is used in two distinct "reach" scenarios — creating an on-demand branch for a sensitive migration rehearsal, and resetting a stale preview branch — with no prior lesson introducing what `neonctl` is, how to install it, or how to authenticate it. Chapter 21.3.5 covers the Native Vercel-Neon Integration for automatic branching but never mentions the `neonctl` CLI. Suggested source: add a brief `neonctl` introduction (install via npm/brew, `neonctl auth`, branches subcommand surface) to Chapter 21.3.5 where manual branch management is already contextually relevant, or open a short dedicated lesson in Chapter 21.3. Severity: medium.
