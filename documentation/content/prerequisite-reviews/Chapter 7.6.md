# Chapter 7.6 prerequisites review

## Missing prerequisites

- **Lesson 7.6.6** — Sonner toast setup and usage pattern. Quote: "the `/invoices` page reads it and renders a shadcn `Sonner` toast ('Invoice INV-0042 deleted')". Prior chapters name Sonner as the course's canonical toast library (4.6.5: "the student installs and reads, doesn't reimplement"; 4.11.3: "recognition only here") but never establish the full setup: adding `<Toaster>` to the root layout and wiring a Server Component `searchParams` read to a client-side `toast.success()` call. The pattern is used in 7.6.6 as if fully known. Suggested source: a brief new callout in the 7.6.2 starter walkthrough (showing the `<Toaster>` already in the layout and the one-line `toast.success()` call shape), or a dedicated half-lesson in Chapter 4.11 or 4.12. Severity: low.
