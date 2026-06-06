// Course units, as a flat lookup keyed by chapter number.
//
// Chapters live on disk as un-nested folders (`NNN Chapter title`), so the
// unit a chapter belongs to is not encoded in the filesystem. This is the
// single source of truth that maps a chapter to its unit, used by the Sidebar
// override (src/components/overrides/Sidebar.astro) to render a blue all-caps
// divider above the first chapter group of each unit.
//
// Names and ranges mirror documentation/content/overview/Units.md. Units are
// contiguous chapter ranges, so each entry only needs the chapter the unit
// starts at; `unitForChapter` resolves any chapter to the last unit that
// started at or before it.

export interface Unit {
  name: string;
  startChapter: number;
}

export const units: Unit[] = [
  { name: "JavaScript and TypeScript", startChapter: 1 },
  { name: "HTTP and the Browser Platform", startChapter: 10 },
  { name: "React, JSX, and Tailwind", startChapter: 17 },
  { name: "Next.js and the App Router", startChapter: 29 },
  { name: "Postgres and Drizzle", startChapter: 36 },
  { name: "Forms, Validation, Server Actions", startChapter: 42 },
  { name: "Transactional Email", startChapter: 48 },
  { name: "Authentication with Better Auth", startChapter: 51 },
  { name: "Organizations and RBAC", startChapter: 56 },
  { name: "Lists, URL State, and Soft Delete", startChapter: 60 },
  { name: "Webhooks and Stripe Billing", startChapter: 63 },
  { name: "Background Work and Object Storage", startChapter: 66 },
  { name: "Notifications", startChapter: 70 },
  { name: "Cache and Rate Limiting", startChapter: 72 },
  { name: "TanStack Query and Zustand", startChapter: 76 },
  { name: "Errors and Security", startChapter: 80 },
  { name: "Time and Internationalization", startChapter: 83 },
  { name: "Testing", startChapter: 86 },
  { name: "Observability and Performance", startChapter: 92 },
  { name: "Git, CI, Deployment, Migrations", startChapter: 96 },
  { name: "Documentation and Code Review", startChapter: 101 },
  { name: "AI with the Vercel AI SDK", startChapter: 105 },
];

// The unit a chapter belongs to, or null for chapters outside any unit (e.g.
// the "0 Demos" sandbox folder, which carries chapter number 0).
export function unitForChapter(n: number | null): string | null {
  if (n == null || n < 1) return null;
  let found: Unit | null = null;
  for (const u of units) {
    if (n >= u.startChapter) found = u;
    else break;
  }
  return found?.name ?? null;
}
