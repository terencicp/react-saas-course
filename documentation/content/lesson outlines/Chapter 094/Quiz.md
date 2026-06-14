sources:
  94.1: The Core Web Vitals
  94.2: Priority on the LCP element
  94.3: The barrel-export trap
  94.4: Reading the bundle treemap
  94.5: Lighthouse as the pre-launch gate
  94.6: RSC waterfalls and Promise.all
  94.7: Indexes and N+1 in production

questions:
  - source: 94.1
    question: |
      You ship a fix at 9am and want to know within the hour whether it improved performance. Why can't you rely on the Speed Insights field score to tell you?
    choices:
      - text: |
          The field score is a trailing 28-day p75 of real traffic, so a same-day change won't visibly move it for a week or two.
        correct: true
      - text: |
          Speed Insights only updates its dashboard once a day, so you'd see the change tomorrow morning.
        correct: false
      - text: |
          Field data is averaged across all users, so a single deploy is too small a sample to register.
        correct: false
    why: |
      Field data is a rolling 28-day window — a stability signal, not a same-day alarm. That's exactly why regression detection has to happen *before* deploy with a lab tool like Lighthouse. (And the score is p75, not an average — that's a separate property.)

  - source: 94.2
    question: |
      A marketing page has a small header logo (first in the DOM), a full-bleed hero photo, and two product thumbnails — all above the fold. To improve LCP, which gets the `preload` prop?
    choices:
      - text: |
          Only the full-bleed hero photo — it's the largest painted element, and `preload` is a fixed budget you spend on one image.
        correct: true
      - text: |
          The header logo, because it's first in the DOM and the browser discovers it earliest.
        correct: false
      - text: |
          All three — they're above the fold, so front-loading every one makes the page paint sooner.
        correct: false
    why: |
      The L in LCP is *largest*: the hero dwarfs the logo and thumbnails. Preloading all three splits the browser's high-priority budget so none lands as early as the hero alone would. One `preload` per page, on the element that defines LCP.

  - source: 94.3
    question: |
      You add `experimental.optimizePackageImports` to `next.config.ts`. Which packages actually belong in that list?
    choices:
      - text: |
          Libraries Next.js doesn't already optimize — most often your own internal packages — since lucide-react, date-fns and friends are on the default list already.
        correct: true
      - text: |
          Every multi-export dependency you import, including lucide-react and date-fns, to be safe.
        correct: false
      - text: |
          Only CommonJS packages like plain `lodash`, since those are the ones that can't be tree-shaken.
        correct: false
    why: |
      Next.js maintains a default-optimized list (lucide, date-fns, recharts, the icon sets) that gets rewritten for you automatically. You only list the ones it doesn't cover — typically internal monorepo packages. And listing a CommonJS package like `lodash` won't help; the fix there is to switch to `lodash-es`.

  - source: 94.4
    question: |
      In the production bundle treemap, the single biggest tile is the React + Next runtime. What's the right move?
    choices:
      - text: |
          Leave it — the framework runtime is the floor every app pays, not an optimization target.
        correct: true
      - text: |
          It's the biggest tile, so it's the highest-value fix — trace its import chain and trim it.
        correct: false
      - text: |
          Code-split it with `dynamic()` so it only loads on routes that need it.
        correct: false
    why: |
      Beginners see the largest rectangle and assume "biggest equals problem." The framework runtime is the baseline; there's no win there. The leads are *surprise* dependencies, heavy per-route chunks, duplicates, and a growing shared chunk — not the floor.

  - source: 94.5
    question: |
      Your Lighthouse report shows green LCP and CLS. Why does it never show you an INP value?
    choices:
      - text: |
          Lighthouse is a synthetic load with no user clicking anything, so there's no interaction to measure — it reports TBT as a partial lab proxy instead.
        correct: true
      - text: |
          Lighthouse measures INP but only surfaces it when it crosses the poor threshold, to reduce noise.
        correct: false
      - text: |
          INP only applies to authenticated pages, and Lighthouse audits the marketing page by default.
        correct: false
    why: |
      INP is the latency of *real* interactions, and a lab run never clicks. Lighthouse reports Total Blocking Time as the partial proxy — a high TBT warns INP will likely be bad in the field — but there is no INP number in a Lighthouse report. For a real INP figure, go to Speed Insights or the DevTools Performance panel.

  - source: 94.6
    question: |
      You wrap two co-located Server Component awaits in `Promise.all`, but the second read actually needed the first's value. What happens?
    choices:
      - text: |
          No error — the second read runs with `undefined` and quietly produces wrong data.
        correct: true
      - text: |
          `Promise.all` throws immediately because it detects the missing dependency.
        correct: false
      - text: |
          The build fails, because Next.js validates await dependency order at compile time.
        correct: false
    why: |
      This is the silent, dangerous failure: nothing throws, the page just renders on garbage. The dependency check — "does this read need the value I just awaited?" — is the only thing standing between you and that bug. If yes, keep it sequential.

  - source: 94.7
    question: |
      In a production trace, the invoice list is one fat 280ms span while the audit-log page is a staircase of fifty thin spans. Match each signature to its structural fix.
    choices:
      - text: |
          Fat span → add the composite `(organization_id, …)` index; staircase → collapse the N+1 with Drizzle `with` or a join.
        correct: true
      - text: |
          Fat span → collapse the N+1; staircase → add the missing index.
        correct: false
      - text: |
          Both → wrap the queries in `'use cache'` so warm requests skip the latency.
        correct: false
    why: |
      One fat span means a single query doing too much work — a sequential scan a composite index removes. A staircase of thin spans means N+1: one query per row, collapsed into one statement with a relation or join. Caching only hides the cost — every cold request still pays it, and the slow shape is still there underneath.
