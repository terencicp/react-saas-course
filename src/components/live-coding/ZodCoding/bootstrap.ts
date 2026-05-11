// Per-card bootstrap. Mounts CodeMirror, debounces edits, kicks off both halves
// of the hybrid lesson (TS type-check + Zod runtime parse), and renders the
// resulting state into the card. Feedback prompt collects diagnostics, resolved
// `^?` queries, AND per-fixture pass/fail so the AI tutor's hint can address
// whichever side the student is stuck on.

import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { bracketMatching, indentOnInput } from '@codemirror/language';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';

import type { Diagnostic, TypeQuery } from './type-checker';
import type { Fixture, FixtureResult } from './parse-runner';
import { streamPrompt, OllamaError, pingOllama } from '../../../lib/ollama';

// Slightly longer than TypeCoding's 300ms — the runtime side spins up an
// iframe, so debouncing more aggressively keeps a fast typer from queuing
// half a dozen sandbox boots they immediately invalidate.
const DEBOUNCE_MS = 450;

const ollamaReady = pingOllama();

document.querySelectorAll<HTMLElement>('.zc-card').forEach((card) => {
  const editorEl = card.querySelector<HTMLElement>('.zc-editor')!;
  const resetBtn = card.querySelector<HTMLButtonElement>('.zc-reset')!;
  const feedbackBtn = card.querySelector<HTMLButtonElement>('.zc-feedback-btn')!;
  const feedbackEl = card.querySelector<HTMLElement>('.zc-feedback')!;
  const feedbackStream = card.querySelector<HTMLElement>('.zc-feedback-stream')!;
  const bootEl = card.querySelector<HTMLElement>('.zc-boot')!;
  const queriesWrap = card.querySelector<HTMLElement>('.zc-queries')!;
  const queriesList = card.querySelector<HTMLElement>('.zc-queries-list')!;
  const instructionsEl = card.querySelector<HTMLElement>('.zc-instructions');
  const fixturesStatusEl = card.querySelector<HTMLElement>('.zc-fixtures-status');
  const fixturesBodyEl = card.querySelector<HTMLElement>('.zc-fixtures-table tbody');

  const instructions = instructionsEl?.textContent?.trim() ?? '';
  const starter = editorEl.dataset.starter ?? '';
  const schemaName = card.dataset.schemaName ?? '';
  const fixtures: Fixture[] = parseFixtures(card.dataset.fixtures ?? '[]');

  // Latest snapshots — kept around so the feedback prompt can include the
  // same state the student is looking at without re-running anything.
  let latestDiagnostics: Diagnostic[] = [];
  let latestQueries: TypeQuery[] = [];
  let latestFixtureResults: FixtureResult[] = [];
  let latestHarnessError: string | null = null;

  const view = new EditorView({
    state: EditorState.create({
      doc: starter,
      extensions: [
        lineNumbers(),
        history(),
        bracketMatching(),
        indentOnInput(),
        javascript({ typescript: true }),
        oneDark,
        keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
        EditorView.updateListener.of((u) => {
          if (u.docChanged) {
            scheduleCheck();
            updateFeedbackEnabled();
          }
        }),
      ],
    }),
    parent: editorEl,
  });

  resetBtn.addEventListener('click', () => {
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: starter } });
    feedbackEl.hidden = true;
    feedbackStream.textContent = '';
  });

  // Feedback gating mirrors TypeCoding: hidden until Ollama is reachable AND
  // the student has edited the starter. During a live stream we keep it
  // visible but disabled so the chip doesn't move out from under the cursor.
  let ollamaOk = false;
  let streaming = false;
  function updateFeedbackEnabled(): void {
    if (streaming) return;
    const codeChanged = view.state.doc.toString() !== starter;
    feedbackBtn.hidden = !(ollamaOk && codeChanged);
  }
  feedbackBtn.hidden = true;
  ollamaReady.then((ok) => { ollamaOk = ok; updateFeedbackEnabled(); });

  function collectDiagnostics(): string {
    if (latestDiagnostics.length === 0) return '(none)';
    return latestDiagnostics
      .map((d) => `- ${d.line}:${d.column} [${d.category}] ${d.message}`)
      .join('\n');
  }

  function collectQueries(): string {
    if (latestQueries.length === 0) return '(none)';
    return latestQueries
      .map((q) => `- line ${q.line - 1}: ${q.type}`)
      .join('\n');
  }

  function collectFixtures(): string {
    if (latestHarnessError) return `(harness error) ${latestHarnessError}`;
    if (latestFixtureResults.length === 0) return '(not yet run)';
    return latestFixtureResults
      .map((r) => {
        const verdict = r.ok ? 'matched expectation' : 'did NOT match expectation';
        const err = r.errorMessage ? ` — error: ${r.errorMessage}` : '';
        return `- ${r.name}: expected ${r.expect}, got ${r.actual} (${verdict})${err}`;
      })
      .join('\n');
  }

  function buildFeedbackPrompt(): string {
    return (
      `You are an AI tutor helping a student who is stuck on a Zod schema ` +
      `exercise. They are writing a TypeScript schema that must (a) produce ` +
      `the right inferred type and (b) accept/reject the lesson's fixtures ` +
      `correctly. Give a short, encouraging hint — do NOT give the full ` +
      `solution.\n\n` +
      (instructions ? `INSTRUCTIONS:\n${instructions}\n\n` : '') +
      `SCHEMA NAME UNDER TEST: ${schemaName || '(unknown)'}\n\n` +
      `STUDENT'S CURRENT CODE:\n${view.state.doc.toString()}\n\n` +
      `CURRENT TYPE ERRORS:\n${collectDiagnostics()}\n\n` +
      `CURRENT RESOLVED TYPE QUERIES (\`^?\`):\n${collectQueries()}\n\n` +
      `CURRENT FIXTURE RESULTS:\n${collectFixtures()}\n\n` +
      `Reply with 1–2 short sentences (under 30 words total) addressed to the ` +
      `student in second person. Be terse: point at the single thing to check ` +
      `next, no warm-up phrases, no restating what they did. ` +
      `No code blocks, no headers, no preamble.`
    );
  }

  feedbackBtn.addEventListener('click', async () => {
    streaming = true;
    feedbackBtn.disabled = true;
    feedbackEl.hidden = false;
    card.dataset.feedbackState = 'pending';
    feedbackStream.textContent = '';
    try {
      for await (const chunk of streamPrompt(buildFeedbackPrompt(), { temperature: 0.3 })) {
        feedbackStream.textContent = (feedbackStream.textContent ?? '') + chunk;
      }
    } catch (err) {
      feedbackStream.textContent =
        err instanceof OllamaError
          ? err.message
          : 'Could not reach the AI tutor. Please try again.';
      ollamaOk = false;
    } finally {
      delete card.dataset.feedbackState;
      streaming = false;
      feedbackBtn.disabled = false;
      updateFeedbackEnabled();
    }
  });

  // ───── Type + parse loop ────────────────────────────────────────────
  // A single debounced trigger kicks off both halves. The two halves run
  // independently — a type error doesn't gate the runtime check, and vice
  // versa — but we cancel any in-flight parse run when a newer one starts
  // so we don't apply stale results.

  let timer: number | null = null;
  let cancelParseRun: (() => void) | null = null;
  let runToken = 0;

  function scheduleCheck() {
    if (timer != null) window.clearTimeout(timer);
    timer = window.setTimeout(runCheck, DEBOUNCE_MS);
  }

  async function runCheck() {
    const myToken = ++runToken;
    const code = view.state.doc.toString();

    // Type-check side — lazy import keeps the (heavy) TS compiler bundle off
    // the editor's critical path; dynamic import() is deduped by the loader.
    let typeCheckPromise: Promise<{ diagnostics: Diagnostic[]; queries: TypeQuery[] }> | null = null;
    try {
      const { checkCode } = await import('./type-checker');
      typeCheckPromise = checkCode(code);
    } catch (err) {
      bootEl.textContent = 'Type-checker failed to load';
      console.error(err);
    }

    // Parse side — only run if the lesson actually pinned fixtures. The
    // iframe is light but it does network out to esm.sh; skip when there's
    // nothing to verify.
    if (fixtures.length > 0) {
      if (cancelParseRun) cancelParseRun();
      startParseRun(code, myToken);
    }

    if (typeCheckPromise) {
      const { diagnostics, queries } = await typeCheckPromise;
      if (myToken !== runToken) return;
      // Diagnostics aren't rendered visually — the fixtures table is the
      // student-facing signal. We still keep the latest snapshot in scope
      // so the AI feedback prompt can include TS errors when it generates
      // a hint (the tutor sees what the student doesn't).
      latestDiagnostics = diagnostics;
      latestQueries = queries;
      renderQueries(queries);
      bootEl.hidden = true;
    }
  }

  function startParseRun(code: string, token: number) {
    if (!fixturesStatusEl || !fixturesBodyEl) return;
    fixturesStatusEl.textContent = 'running…';
    fixturesStatusEl.dataset.state = 'running';
    resetFixtureRows();
    const incoming: FixtureResult[] = [];
    latestHarnessError = null;

    // Dynamic import keeps the iframe-spinning code out of the initial bundle.
    import('./parse-runner').then(({ runFixtures }) => {
      // Belt-and-suspenders: if a newer run started before the module loaded,
      // don't bother spinning the iframe up.
      if (token !== runToken) return;
      cancelParseRun = runFixtures(
        card,
        code,
        schemaName,
        fixtures,
        (r) => {
          if (token !== runToken) return;
          incoming.push(r);
          updateFixtureRow(r);
        },
        (msg) => {
          if (token !== runToken) return;
          latestHarnessError = msg;
          markFixturesHarnessFailure(msg);
        },
        () => {
          if (token !== runToken) return;
          latestFixtureResults = incoming;
          // A harness error already painted the status; don't let the
          // "N/M passing" summary overwrite it.
          if (!latestHarnessError) finalizeFixtures(incoming);
        },
      );
    }).catch((err) => {
      if (token !== runToken) return;
      console.error(err);
      markFixturesHarnessFailure('Could not load the parse runner.');
    });
  }

  function resetFixtureRows() {
    if (!fixturesBodyEl) return;
    fixturesBodyEl.querySelectorAll<HTMLElement>('.zc-fixture-row').forEach((row) => {
      row.dataset.status = 'pending';
    });
  }

  function updateFixtureRow(r: FixtureResult) {
    if (!fixturesBodyEl) return;
    // The row's pass/fail icon + colored background is the whole signal —
    // the Zod error string (`r.errorMessage`) is still collected on the
    // result object so the AI feedback prompt can use it, but it's not
    // surfaced visually to the student. Lessons that specifically teach
    // Zod's error shapes (e.g. Chapter 7.1.7) would opt that back in.
    const row = fixturesBodyEl.querySelector<HTMLElement>(
      `.zc-fixture-row[data-fixture-name="${cssEscape(r.name)}"]`,
    );
    if (row) row.dataset.status = r.ok ? 'ok' : 'bad';
  }

  function finalizeFixtures(results: FixtureResult[]) {
    if (!fixturesStatusEl) return;
    const total = fixtures.length;
    const okCount = results.filter((r) => r.ok).length;
    const allOk = okCount === total && results.length === total;
    fixturesStatusEl.textContent = `${okCount} / ${total} passing`;
    fixturesStatusEl.dataset.state = allOk ? 'ok' : 'fail';
  }

  function markFixturesHarnessFailure(msg: string) {
    if (!fixturesStatusEl || !fixturesBodyEl) return;
    fixturesStatusEl.textContent = msg;
    fixturesStatusEl.dataset.state = 'fail';
    fixturesBodyEl.querySelectorAll<HTMLElement>('.zc-fixture-row').forEach((row) => {
      row.dataset.status = 'bad';
    });
  }

  function renderQueries(items: TypeQuery[]) {
    queriesList.innerHTML = '';
    if (items.length === 0) {
      queriesWrap.hidden = true;
      return;
    }
    queriesWrap.hidden = false;
    for (const q of items) {
      const li = document.createElement('li');
      li.className = 'zc-query';
      const loc = document.createElement('span');
      loc.className = 'zc-query-loc';
      loc.textContent = String(q.line - 1);
      const type = document.createElement('code');
      type.className = 'zc-query-type';
      type.textContent = q.type;
      li.append(loc, type);
      queriesList.appendChild(li);
    }
  }

  scheduleCheck();
});

// data-fixtures is JSON-stringified at SSR time; parse defensively so a
// malformed prop doesn't take the whole page down.
function parseFixtures(raw: string): Fixture[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (f): f is Fixture =>
        f && typeof f === 'object' && typeof f.name === 'string' && (f.expect === 'pass' || f.expect === 'fail'),
    );
  } catch {
    return [];
  }
}

// Lightweight CSS.escape shim — used for the per-fixture row selector.
function cssEscape(s: string): string {
  return s.replace(/["\\]/g, '\\$&');
}
