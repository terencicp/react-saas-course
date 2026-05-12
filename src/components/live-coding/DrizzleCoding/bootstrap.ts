// Per-card bootstrap. Mounts CodeMirror with TypeScript support, drives the
// Run button into the Drizzle runtime, and renders the result rows as a table.
// The exercise's success condition (if any) is a row-match against
// `expectedRows`; rows are subset-matched per column so adding extra columns
// (`return await db.select().from(users)`) doesn't fail a query whose lesson
// only pinned `{ name: '…' }`.

import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { bracketMatching, indentOnInput } from '@codemirror/language';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';

import { DrizzleRunner, type RunOutcome, type QueryRow } from './drizzle-runtime';
import { streamPrompt, OllamaError, pingOllama } from '../../../lib/ollama';

const ollamaReady = pingOllama();

document.querySelectorAll<HTMLElement>('.dc-card').forEach((card) => {
  const editorEl = card.querySelector<HTMLElement>('.dc-editor')!;
  const runBtn = card.querySelector<HTMLButtonElement>('.dc-run')!;
  const resetBtn = card.querySelector<HTMLButtonElement>('.dc-reset')!;
  const statusEl = card.querySelector<HTMLElement>('.dc-status')!;
  const resultEl = card.querySelector<HTMLElement>('.dc-result')!;
  const errorEl = card.querySelector<HTMLElement>('.dc-error')!;
  const criteriaEl = card.querySelector<HTMLElement>('.dc-criteria');
  // Feedback trio is only rendered on cards with expectedRows — sandbox cards
  // have nothing for the tutor to nudge toward, and the Astro template omits
  // it entirely. All paths must tolerate these being null.
  const feedbackBtn = card.querySelector<HTMLButtonElement>('.dc-feedback-btn');
  const feedbackEl = card.querySelector<HTMLElement>('.dc-feedback');
  const feedbackStream = card.querySelector<HTMLElement>('.dc-feedback-stream');
  const instructionsEl = card.querySelector<HTMLElement>('.dc-instructions');
  const instructions = instructionsEl?.textContent?.trim() ?? '';

  const starter = editorEl.dataset.starter ?? '';
  const schemaSource = card.dataset.schema ?? '';
  const seedSQL = card.dataset.seed ?? '';
  const expectedRowsRaw = card.dataset.expectedRows ?? '';
  const expectedRows: Array<Record<string, unknown>> | null = expectedRowsRaw
    ? JSON.parse(expectedRowsRaw)
    : null;
  const ordered = card.dataset.ordered !== 'false';

  const runner = new DrizzleRunner({ schemaSource, seedSQL });
  let latestOutcome: RunOutcome | null = null;

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
          if (u.docChanged && feedbackBtn) updateFeedbackEnabled();
        }),
      ],
    }),
    parent: editorEl,
  });

  resetBtn.addEventListener('click', () => {
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: starter } });
    clearOutput();
    if (criteriaEl) criteriaEl.hidden = true;
    if (feedbackEl) feedbackEl.hidden = true;
    if (feedbackStream) feedbackStream.textContent = '';
  });

  runBtn.addEventListener('click', async () => {
    runBtn.disabled = true;
    statusEl.dataset.state = 'running';
    statusEl.textContent = 'Running…';
    clearOutput();

    const outcome = await runner.run(view.state.doc.toString());
    latestOutcome = outcome;

    if (outcome.ok) {
      renderResult(outcome.rows, outcome.columns, outcome.durationMs);
      evaluateCriteria(outcome.rows);
      statusEl.dataset.state = '';
      statusEl.textContent = '';
    } else {
      renderError(outcome.error);
      evaluateCriteria(null);
      statusEl.dataset.state = 'error';
      statusEl.textContent = outcome.timedOut ? 'Timed out' : 'Error';
    }

    runBtn.disabled = false;
  });

  function clearOutput() {
    resultEl.innerHTML = '';
    resultEl.hidden = true;
    errorEl.hidden = true;
    errorEl.textContent = '';
    if (criteriaEl) {
      criteriaEl.hidden = true;
      criteriaEl.querySelectorAll<HTMLElement>('.dc-criterion').forEach((li) => {
        li.dataset.met = 'false';
      });
    }
  }

  function renderResult(rows: QueryRow[], columns: string[], durationMs: number) {
    resultEl.hidden = false;
    resultEl.innerHTML = '';

    if (rows.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'dc-result-summary';
      empty.textContent = `0 rows · ${durationMs.toFixed(0)}ms`;
      resultEl.appendChild(empty);
      return;
    }

    // Drizzle returns plain objects — the column list is whatever keys the
    // first row has. If the runner couldn't synthesize one (return was a
    // primitive wrapped into `[{value: ...}]`), fall back to the first row.
    const cols = columns.length > 0 ? columns : Object.keys(rows[0]);

    const wrap = document.createElement('div');
    wrap.className = 'dc-result-tablewrap';
    const table = document.createElement('table');
    table.className = 'dc-result-table';

    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    for (const col of cols) {
      const th = document.createElement('th');
      th.textContent = col;
      headRow.appendChild(th);
    }
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    for (const row of rows) {
      const tr = document.createElement('tr');
      for (const col of cols) {
        const td = document.createElement('td');
        const v = (row as Record<string, unknown>)[col];
        td.textContent = formatCell(v);
        if (v === null) td.classList.add('dc-cell-null');
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    wrap.appendChild(table);
    resultEl.appendChild(wrap);

    const summary = document.createElement('div');
    summary.className = 'dc-result-summary';
    summary.textContent =
      `${rows.length} row${rows.length === 1 ? '' : 's'} · ${durationMs.toFixed(0)}ms`;
    resultEl.appendChild(summary);
  }

  function formatCell(v: unknown): string {
    if (v === null) return 'NULL';
    if (v === undefined) return '';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  }

  function renderError(message: string) {
    errorEl.hidden = false;
    errorEl.textContent = message;
  }

  function evaluateCriteria(rows: Array<Record<string, unknown>> | null) {
    if (!criteriaEl || !expectedRows) return;
    criteriaEl.hidden = false;
    const items = criteriaEl.querySelectorAll<HTMLElement>('.dc-criterion');
    items.forEach((li) => {
      const kind = li.dataset.kind;
      let met = false;
      if (kind === 'rows' && rows) {
        met = compareRows(rows, expectedRows, ordered);
      }
      li.dataset.met = met ? 'true' : 'false';
    });
  }

  // Feedback wiring — same shape as SQLCoding/ScriptCoding. Gated on Ollama
  // reachable AND the student having edited the starter.
  let ollamaOk = false;
  let streaming = false;
  function updateFeedbackEnabled(): void {
    if (!feedbackBtn || streaming) return;
    const codeChanged = view.state.doc.toString() !== starter;
    feedbackBtn.disabled = !(ollamaOk && codeChanged);
    feedbackBtn.title = !ollamaOk
      ? 'AI tutor unavailable — Ollama is not reachable.'
      : !codeChanged
        ? 'Edit the query first, then ask for feedback.'
        : '';
  }
  if (feedbackBtn) {
    feedbackBtn.disabled = true;
    ollamaReady.then((ok) => {
      ollamaOk = ok;
      updateFeedbackEnabled();
    });
  }

  function describeResultForPrompt(): string {
    if (!latestOutcome) return '(query has not been run yet)';
    if (!latestOutcome.ok) return `Query failed with error: ${latestOutcome.error}`;
    if (latestOutcome.rows.length === 0) return '(query returned 0 rows)';
    const cols = latestOutcome.columns.length
      ? latestOutcome.columns
      : Object.keys(latestOutcome.rows[0] ?? {});
    const head = cols.join(' | ');
    const body = latestOutcome.rows
      .slice(0, 10)
      .map((r) => cols.map((c) => formatCell((r as Record<string, unknown>)[c])).join(' | '))
      .join('\n');
    const trailer =
      latestOutcome.rows.length > 10 ? `\n… (${latestOutcome.rows.length - 10} more)` : '';
    return `${head}\n${body}${trailer}`;
  }

  function describeCriteriaForPrompt(): string {
    if (!expectedRows) return '(none)';
    return JSON.stringify(expectedRows, null, 2);
  }

  // Pre-compute pass/fail so the LLM can't hallucinate "perfect!" against a
  // failing query. Drizzle-specific hints reference the operator surface
  // (eq/and/asc, missing where, wrong column ref) rather than SQL syntax.
  function diagnoseResult(): string {
    if (!latestOutcome) return 'NOT_RUN: the student has not run the query yet';
    if (!latestOutcome.ok) {
      return `FAIL: query raised a runtime error — ${latestOutcome.error}`;
    }
    if (!expectedRows) return 'NO_CRITERIA: sandbox card';

    const actualRows = latestOutcome.rows;
    const actualCols = latestOutcome.columns.length
      ? latestOutcome.columns
      : actualRows[0]
        ? Object.keys(actualRows[0])
        : [];
    const expectedCols = Array.from(
      new Set(expectedRows.flatMap((r) => Object.keys(r))),
    );

    const missingCols = expectedCols.filter((c) => !actualCols.includes(c));
    if (missingCols.length > 0) {
      return (
        `FAIL: result is missing expected column(s) [${missingCols.join(', ')}]; ` +
        `actual columns are [${actualCols.join(', ')}]. ` +
        `Likely cause: a select() projection that omits the column, a missing ` +
        `alias in a select({ alias: table.col }) shape, or a wrong column reference.`
      );
    }

    if (actualRows.length !== expectedRows.length) {
      return (
        `FAIL: returned ${actualRows.length} row(s); expected ${expectedRows.length}. ` +
        `Likely cause: wrong where() condition, wrong join type (innerJoin vs leftJoin), ` +
        `missing groupBy, or a forgotten filter (e.g. soft-delete deletedAt IS NULL).`
      );
    }

    if (compareRows(actualRows, expectedRows, ordered)) {
      return 'PASS: rows match the expected output exactly';
    }

    // Same shape & length but values diverge — find the first divergent cell.
    for (let i = 0; i < expectedRows.length; i++) {
      const exp = expectedRows[i];
      const act = actualRows[i];
      for (const key of Object.keys(exp)) {
        if (!valueEqual(act?.[key], exp[key])) {
          return (
            `FAIL: row ${i + 1} column "${key}": expected ${JSON.stringify(exp[key])}, ` +
            `got ${JSON.stringify(act?.[key])}.` +
            (ordered ? '' : ' (row order is not checked.)')
          );
        }
      }
    }
    return 'FAIL: rows differ from expected (unable to localize)';
  }

  function buildFeedbackPrompt(): string {
    const diagnosis = diagnoseResult();
    return (
      `You are an AI tutor helping a student on a Drizzle (TypeScript ORM) exercise. ` +
      `The grader has already evaluated the student's query and produced a ` +
      `DIAGNOSIS that you MUST treat as ground truth. Do not re-derive pass/fail ` +
      `by inspecting the rows yourself.\n\n` +
      (instructions ? `INSTRUCTIONS:\n${instructions}\n\n` : '') +
      `DRIZZLE SCHEMA:\n${schemaSource}\n\n` +
      `SEED SQL:\n${seedSQL}\n\n` +
      `STUDENT'S CURRENT CODE:\n${view.state.doc.toString()}\n\n` +
      `DIAGNOSIS:\n${diagnosis}\n\n` +
      `CURRENT RESULT:\n${describeResultForPrompt()}\n\n` +
      `EXPECTED ROWS (subset match per column):\n${describeCriteriaForPrompt()}\n\n` +
      `Rules:\n` +
      `- If DIAGNOSIS starts with PASS: briefly affirm in one sentence and stop.\n` +
      `- If DIAGNOSIS starts with FAIL: you MUST NOT say "perfect", "great", ` +
      `"correct", or any congratulation. Point at the specific failure named ` +
      `in DIAGNOSIS in plain Drizzle terms (where/select/join/groupBy/orderBy/eq/and). ` +
      `Do NOT give the full code solution — nudge, don't solve.\n` +
      `- If DIAGNOSIS starts with NOT_RUN: tell the student to click Run query first.\n\n` +
      `Reply with 1-2 short sentences (under 30 words). Second person, terse, ` +
      `no warm-up phrases, no restating the query. No code blocks, no headers.`
    );
  }

  if (feedbackBtn && feedbackEl && feedbackStream) {
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
        updateFeedbackEnabled();
      }
    });
  }
});

function compareRows(
  actual: Array<Record<string, unknown>>,
  expected: Array<Record<string, unknown>>,
  ordered: boolean,
): boolean {
  if (actual.length !== expected.length) return false;
  if (ordered) {
    return actual.every((row, i) => subsetMatch(row, expected[i]));
  }
  // Unordered: every expected row must match some unused actual row.
  const used = new Set<number>();
  for (const exp of expected) {
    const idx = actual.findIndex((row, i) => !used.has(i) && subsetMatch(row, exp));
    if (idx === -1) return false;
    used.add(idx);
  }
  return true;
}

// Subset: every key in `expected` must be present in `actual` with an equal
// value. Extra columns in `actual` are tolerated — exercises pin the columns
// they care about, so a `db.select().from(users)` shouldn't fail a row-match
// that only fixed `{ name: '…' }`. Numeric/string coercion handles Postgres
// BIGINT-as-string vs. an MDX author writing the value as a number.
function subsetMatch(actual: Record<string, unknown>, expected: Record<string, unknown>): boolean {
  for (const key of Object.keys(expected)) {
    if (!valueEqual(actual[key], expected[key])) return false;
  }
  return true;
}

function valueEqual(a: unknown, e: unknown): boolean {
  if (Object.is(a, e)) return true;
  if (a === null || e === null) return a === e;
  if (typeof a === 'object' && typeof e === 'object') {
    return JSON.stringify(a) === JSON.stringify(e);
  }
  return String(a) === String(e);
}
