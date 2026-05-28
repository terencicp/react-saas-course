sources:
  7.1: The event loop and the microtask queue
  7.2: "Promises: combinators and withResolvers"
  7.3: "async/await: parallel by default, sequential by dependency"
  7.4: Cancellation with AbortController and AbortSignal
questions:
  - source: 7.1
    question: |
      Predict the output of this program.

      ```js
      setTimeout(() => console.log('A'), 0);
      Promise.resolve().then(() => console.log('B'));
      console.log('C');
      ```
    choices:
      - text: |
          `C`, `B`, `A`
        correct: true
      - text: |
          `C`, `A`, `B` — `setTimeout(..., 0)` runs before any queued microtask because its delay has already elapsed.
        correct: false
      - text: |
          `A`, `B`, `C` — scheduled callbacks fire before the rest of the synchronous script.
        correct: false
    why: |
      The script itself is the current macrotask, so all synchronous code runs first — `C` prints. Then the runtime drains the microtask queue completely before picking the next macrotask, so `B` (a Promise continuation) runs before `A` (a `setTimeout` callback). The `0` on the timer never lets a macrotask jump the microtask drain.

  - source: 7.2
    question: |
      A dashboard renders three independent reads — the user, the org, and the recent invoices. The user read is critical; the other two are nice-to-have, and the page should render whatever succeeded. Which combinator fits?
    choices:
      - text: |
          `Promise.allSettled` — it never rejects and hands back per-item `{ status, value? , reason? }`, so the caller decides per result what to render.
        correct: true
      - text: |
          `Promise.all` — wrap everything in one `await`; if a non-critical read fails, catch it at the top and render anyway.
        correct: false
      - text: |
          `Promise.any` — it succeeds as soon as one of the three reads fulfills, which covers the "render what you can" case.
        correct: false
    why: |
      `Promise.all` is the wrong tool for "render what you can" — a single rejection drops the other two resolved values on the floor. `Promise.any` resolves on the first success and discards the rest, which is for redundant providers, not heterogeneous reads. `Promise.allSettled` is the shape that surfaces every result so the caller can make a per-item decision.

  - source: 7.3
    question: |
      A route handler runs:

      ```ts
      const user = await getUser(userId);
      const org = await getOrg(orgId);
      const invoices = await listRecentInvoices(orgId);
      ```

      Each call takes ~200ms; nothing reads the previous return value. What's the senior rewrite?
    choices:
      - text: |
          ```ts
          const [user, org, invoices] = await Promise.all([
            getUser(userId),
            getOrg(orgId),
            listRecentInvoices(orgId),
          ]);
          ```
        correct: true
      - text: |
          Wrap the awaits in a `for...of` loop over `[getUser, getOrg, listRecentInvoices]` to keep them in order while reducing the syntax noise.
        correct: false
      - text: |
          Leave it — sequential `await`s are the safest default; rewriting to `Promise.all` opens the code to race conditions between the three reads.
        correct: false
    why: |
      The dependency check passes: nothing flows from one read to the next, so all three should start at the same time. `Promise.all` collapses the three sequential pauses into one — total time becomes `max(t1, t2, t3)`, not `t1 + t2 + t3`. There's no race condition because each Promise resolves independently; combining them changes latency, not correctness.

  - source: 7.4
    question: |
      A `fetch` whose signal was created with `AbortSignal.timeout(5_000)` rejects after the deadline elapses. Which `catch` block correctly distinguishes user-cancel from a deadline expiry?
    choices:
      - text: |
          ```ts
          catch (err) {
            if (err instanceof Error && err.name === 'AbortError') return;
            if (err instanceof Error && err.name === 'TimeoutError') {
              notify('Request timed out');
              return;
            }
            throw err;
          }
          ```
        correct: true
      - text: |
          ```ts
          catch (err) {
            if (err instanceof DOMException) return; // covers abort and timeout
            throw err;
          }
          ```
        correct: false
      - text: |
          ```ts
          catch (err) {
            if (err instanceof Error && err.name === 'AbortError') return;
            throw err;
          }
          ```
        correct: false
    why: |
      `AbortSignal.timeout(ms)` deliberately rejects with `name === 'TimeoutError'`, not `'AbortError'` — a user-cancel is silent and intentional, a timeout is unintentional and probably worth surfacing. Folding both into one branch swallows the timeout silently. `instanceof DOMException` is also wrong: it's a browser type, and the same logical "aborted" can come from Node drivers as different concrete classes that share the `name` string. The portable form across the SaaS stack is `err.name`.

  - source: 7.2
    question: |
      You need to expose "the next inbound message on this socket" as a Promise. Which shape is the 2026 default?
    choices:
      - text: |
          ```ts
          const { promise, resolve, reject } = Promise.withResolvers<Message>();
          socket.once('message', resolve);
          socket.once('error', reject);
          return promise;
          ```
        correct: true
      - text: |
          ```ts
          let resolve!: (m: Message) => void;
          let reject!: (e: Error) => void;
          const promise = new Promise<Message>((res, rej) => {
            resolve = res;
            reject = rej;
          });
          socket.once('message', resolve);
          socket.once('error', reject);
          return promise;
          ```
        correct: false
      - text: |
          ```ts
          return new Promise<Message>((resolve, reject) => {
            Promise.race([
              new Promise<Message>((r) => socket.once('message', r)),
              new Promise<Message>((_, r) => socket.once('error', r)),
            ]).then(resolve, reject);
          });
          ```
        correct: false
    why: |
      `Promise.withResolvers()` is the standardized replacement for the legacy deferred pattern — one line, no dangling `let`s, no executor whose only job is to leak its arguments. The hand-rolled `let resolve; new Promise(r => resolve = r)` shape works (the executor runs synchronously) but it's fragile and noisy. Racing two ad-hoc Promises over `once` listeners reinvents what `withResolvers` does in one call and risks leaving the loser's listener attached.

  - source: 7.3
    question: |
      An admin tool calls `await Promise.all(orderIds.map((id) => fetchOrder(id)))` where `orderIds.length` can be 500 and `fetchOrder` is a database read. The page either times out or exhausts the connection pool. Which of these are correct fixes? (Select all that apply.)
    choices:
      - text: |
          Replace with a single batched query: `db.select().from(orders).where(inArray(orders.id, orderIds))`.
        correct: true
      - text: |
          Use `pMap(orderIds, fetchOrder, { concurrency: 8 })` to cap concurrency.
        correct: true
      - text: |
          Rewrite as `for (const id of orderIds) { results.push(await fetchOrder(id)); }` — sequential is the safe default for large N.
        correct: false
      - text: |
          Wrap the existing `Promise.all` in `Promise.allSettled` — failures will no longer crash the page.
        correct: false
    why: |
      Two valid moves. When N awaits hit the same backend, the structural fix is one batched query — one round trip instead of N. When the work really must fan out (a rate-limited third-party API, say), `pMap` with a concurrency cap is the right reach. The serial-`await` "fix" trades a rate-limit failure for N round trips' worth of latency; `allSettled` masks the symptom (rejections) while leaving the real problem (500 concurrent connections) untouched.

  - source: 7.1
    question: |
      True or false: code that appears *before* the first `await` inside an `async` function runs synchronously on the caller's stack, and the function only returns a pending Promise once it actually hits the `await`.
    choices:
      - text: |
          True.
        correct: true
      - text: |
          False — the entire body of an `async` function is deferred to a microtask the moment the function is called.
        correct: false
    why: |
      `async` is not a "run this later" wrapper. The body executes top-to-bottom on the caller's stack until it hits an `await`; only then does the function return a pending Promise and schedule its continuation as a microtask. The reflex this installs: the code before the first `await` in an `async` function is not asynchronous at all — it just happens to live in one.

  - source: 7.4
    question: |
      You want a single `fetch` to be cancellable from three independent sources: the user clicking Stop, a 30-second deadline, and a process-wide shutdown signal. What's the canonical 2026 shape?
    choices:
      - text: |
          ```ts
          const signal = AbortSignal.any([
            userController.signal,
            AbortSignal.timeout(30_000),
            shutdownSignal,
          ]);
          await fetch(url, { signal });
          ```
        correct: true
      - text: |
          ```ts
          await Promise.race([
            fetch(url, { signal: userController.signal }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 30_000)),
            new Promise((_, reject) => shutdownSignal.addEventListener('abort', () => reject(new Error('shutdown')))),
          ]);
          ```
        correct: false
      - text: |
          ```ts
          if (userController.signal.aborted || shutdownSignal.aborted) return;
          await fetch(url, { signal: AbortSignal.timeout(30_000) });
          ```
        correct: false
    why: |
      `AbortSignal.any([...])` composes multiple cancellation sources into one signal that fires the moment any input fires, and propagates the right `reason` (so `AbortError` vs `TimeoutError` discrimination at the catch still works). The `Promise.race` variant is the retired pattern from before composition existed — it leaks the in-flight `fetch` past the timeout, allocates a manual timer, and loses the reason metadata. Checking `signal.aborted` once before the call only guards the entry point; it can't stop the request mid-flight.
