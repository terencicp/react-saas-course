// Per-card bootstrap. Mounts CodeMirror with a Postgres SQL grammar, drives the
// Run button into the PGlite runtime, and renders the result set as a table.
// The exercise's success condition (if any) is a row-match against
// `expectedRows`; rows are subset-matched per column, so adding `SELECT *`
// doesn't fail a query whose lesson only pinned `{ name: '…' }`.

import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { bracketMatching, indentOnInput } from '@codemirror/language';
import { sql, PostgreSQL } from '@codemirror/lang-sql';
import { oneDark } from '@codemirror/theme-one-dark';

import { SQLRunner, type QueryResult } from './pglite-runtime';
import { streamPrompt, OllamaError, pingOllama } from '../../../lib/ollama';

const ollamaReady = pingOllama();

document.querySelectorAll<HTMLElement>('.sc-card').forEach((card) => {
  const editorEl = card.querySelector<HTMLElement>('.sc-editor')!;
  const runBtn = card.querySelector<HTMLButtonElement>('.sc-run')!;
  const resetBtn = card.querySelector<HTMLButtonElement>('.sc-reset')!;
  const statusEl = card.querySelector<HTMLElement>('.sc-status')!;
  const resultEl = card.querySelector<HTMLElement>('.sc-result')!;
  const errorEl = card.querySelector<HTMLElement>('.sc-error')!;
  const criteriaEl = card.querySelector<HTMLElement>('.sc-criteria');
  // The feedback UI is only rendered on cards with expectedRows — a sandbox
  // card with no goal has nothing for the AI tutor to nudge toward, and the
  // Astro template omits the trio entirely. All feedback paths below must
  // tolerate these being null.
  const feedbackBtn = card.querySelector<HTMLButtonElement>('.sc-feedback-btn');
  const feedbackEl = card.querySelector<HTMLElement>('.sc-feedback');
  const feedbackStream = card.querySelector<HTMLElement>('.sc-feedback-stream');
  const instructionsEl = card.querySelector<HTMLElement>('.sc-instructions');
  const instructions = instructionsEl?.textContent?.trim() ?? '';

  const starter = editorEl.dataset.starter ?? '';
  const seed = card.dataset.seed ?? '';
  const expectedRowsRaw = card.dataset.expectedRows ?? '';
  const expectedRows: Array<Record<string, unknown>> | null = expectedRowsRaw
    ? JSON.parse(expectedRowsRaw)
    : null;
  const ordered = card.dataset.ordered !== 'false';

  const runner = new SQLRunner(seed);
  let latestResult: QueryResult | null = null;
  let latestError: string | null = null;

  const view = new EditorView({
    state: EditorState.create({
      doc: starter,
      extensions: [
        lineNumbers(),
        history(),
        bracketMatching(),
        indentOnInput(),
        sql({ dialect: PostgreSQL, upperCaseKeywords: true }),
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
    // Criteria are run-gated — reset returns the card to its "not yet run" state.
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

    if (outcome.ok) {
      latestResult = outcome.result;
      latestError = null;
      renderResult(outcome.result);
      evaluateCriteria(outcome.result.rows);
      statusEl.dataset.state = '';
      statusEl.textContent = '';
    } else {
      latestResult = null;
      latestError = outcome.error;
      renderError(outcome.error);
      evaluateCriteria(null);
      statusEl.dataset.state = 'error';
      statusEl.textContent = 'Error';
    }

    runBtn.disabled = false;
  });

  function clearOutput() {
    resultEl.innerHTML = '';
    resultEl.hidden = true;
    errorEl.hidden = true;
    errorEl.textContent = '';
    // Hide the checklist while a run is in flight. `data-met='false'` now
    // renders red ("failed"), so showing the items during the async wait
    // would briefly suggest the new query failed before it has finished
    // executing. `evaluateCriteria` reveals the list with the final state.
    if (criteriaEl) {
      criteriaEl.hidden = true;
      criteriaEl.querySelectorAll<HTMLElement>('.sc-criterion').forEach((li) => {
        li.dataset.met = 'false';
      });
    }
  }

  function renderResult(result: QueryResult) {
    resultEl.hidden = false;
    resultEl.innerHTML = '';

    if (result.rows.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'sc-result-summary';
      // Show affectedRows if non-zero (INSERT/UPDATE/DELETE return 0 rows but
      // an affectedRows count) — otherwise just "0 rows".
      empty.textContent =
        result.affectedRows != null && result.affectedRows > 0
          ? `${result.affectedRows} row${result.affectedRows === 1 ? '' : 's'} affected`
          : '0 rows';
      resultEl.appendChild(empty);
      return;
    }

    const cols = result.fields?.length
      ? result.fields.map((f) => f.name)
      : Object.keys(result.rows[0]);

    // Postgres accepts `SELECT FROM t GROUP BY k` — n rows × 0 columns. Without
    // an explicit message this renders as a blank table with a confusing
    // "N rows" summary; spell it out instead.
    if (cols.length === 0) {
      const note = document.createElement('div');
      note.className = 'sc-result-summary sc-result-note';
      note.textContent =
        `${result.rows.length} row${result.rows.length === 1 ? '' : 's'} × 0 columns — ` +
        `Add column names after SELECT.`;
      resultEl.appendChild(note);
      return;
    }

    const wrap = document.createElement('div');
    wrap.className = 'sc-result-tablewrap';
    const table = document.createElement('table');
    table.className = 'sc-result-table';

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
    for (const row of result.rows) {
      const tr = document.createElement('tr');
      for (const col of cols) {
        const td = document.createElement('td');
        const v = (row as Record<string, unknown>)[col];
        td.textContent = formatCell(v);
        if (v === null) td.classList.add('sc-cell-null');
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    wrap.appendChild(table);
    resultEl.appendChild(wrap);

    const summary = document.createElement('div');
    summary.className = 'sc-result-summary';
    summary.textContent = `${result.rows.length} row${result.rows.length === 1 ? '' : 's'}`;
    resultEl.appendChild(summary);
  }

  function formatCell(v: unknown): string {
    if (v === null) return 'NULL';
    if (v === undefined) return '';
    if (v instanceof Date) return v.toISOString();
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  }

  function renderError(message: string) {
    errorEl.hidden = false;
    errorEl.textContent = message;
  }

  function evaluateCriteria(rows: Array<Record<string, unknown>> | null) {
    if (!criteriaEl || !expectedRows) return;
    // Reveal the checklist on first evaluate — kept hidden by the Astro
    // template until the student has actually run the query, so the success
    // condition doesn't pre-spoil the answer.
    criteriaEl.hidden = false;
    const items = criteriaEl.querySelectorAll<HTMLElement>('.sc-criterion');
    items.forEach((li) => {
      const kind = li.dataset.kind;
      let met = false;
      if (kind === 'rows' && rows) {
        met = compareRows(rows, expectedRows, ordered);
      }
      li.dataset.met = met ? 'true' : 'false';
    });
  }

  // Feedback wiring — same shape as the AssertCoding card. Gate: Ollama
  // reachable AND the student has edited the starter (no point asking for
  // feedback on code you haven't touched). Sandbox cards skip this entirely.
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
    if (latestError) return `Query failed with error: ${latestError}`;
    if (!latestResult) return '(query has not been run yet)';
    if (latestResult.rows.length === 0) return '(query returned 0 rows)';
    const cols = latestResult.fields?.length
      ? latestResult.fields.map((f) => f.name)
      : Object.keys(latestResult.rows[0]);
    const head = cols.join(' | ');
    const body = latestResult.rows
      .slice(0, 10)
      .map((r) => cols.map((c) => formatCell((r as Record<string, unknown>)[c])).join(' | '))
      .join('\n');
    const trailer =
      latestResult.rows.length > 10 ? `\n… (${latestResult.rows.length - 10} more)` : '';
    return `${head}\n${body}${trailer}`;
  }

  function describeCriteriaForPrompt(): string {
    if (!expectedRows) return '(none)';
    return JSON.stringify(expectedRows, null, 2);
  }

  // Pre-computed pass/fail + a specific reason. Small local models (Ollama
  // gemma3, llama3) reliably hallucinate "perfect!" when asked to compare two
  // row dumps themselves; we do the comparison here and hand the AI the
  // verdict, which constrains its output much more reliably.
  function diagnoseResult(): string {
    if (latestError) return `FAIL: query raised a SQL error — ${latestError}`;
    if (!latestResult) return 'NOT_RUN: the student has not run the query yet';
    if (!expectedRows) return 'NO_CRITERIA: sandbox card';

    const actualRows = latestResult.rows;
    const actualCols = latestResult.fields?.length
      ? latestResult.fields.map((f) => f.name)
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
        `Likely cause: missing AS alias, wrong column name, or unselected expression.`
      );
    }

    if (actualRows.length !== expectedRows.length) {
      return (
        `FAIL: returned ${actualRows.length} row(s); expected ${expectedRows.length}. ` +
        `Likely cause: wrong WHERE filter, wrong JOIN type (INNER vs LEFT), or wrong GROUP BY.`
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
      `You are an AI tutor helping a student on a SQL exercise. ` +
      `The grader has already evaluated the student's query and produced ` +
      `a DIAGNOSIS that you MUST treat as ground truth. Do not re-derive ` +
      `pass/fail by inspecting the rows yourself.\n\n` +
      (instructions ? `INSTRUCTIONS:\n${instructions}\n\n` : '') +
      `SCHEMA / SEED:\n${seed}\n\n` +
      `STUDENT'S CURRENT QUERY:\n${view.state.doc.toString()}\n\n` +
      `DIAGNOSIS:\n${diagnosis}\n\n` +
      `CURRENT RESULT:\n${describeResultForPrompt()}\n\n` +
      `EXPECTED ROWS (subset match per column):\n${describeCriteriaForPrompt()}\n\n` +
      `Rules:\n` +
      `- If DIAGNOSIS starts with PASS: briefly affirm in one sentence and stop.\n` +
      `- If DIAGNOSIS starts with FAIL: you MUST NOT say "perfect", "great", ` +
      `"correct", or any congratulation. Point at the specific failure named ` +
      `in DIAGNOSIS in plain language a beginner can act on. Do NOT give the ` +
      `full SQL solution — nudge, don't solve.\n` +
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

// Subset match: every key in `expected` exists in `actual` with an equal value.
// Extra columns in `actual` are tolerated — exercises pin the columns they
// care about and `SELECT *` shouldn't fail a row-match. Numeric/string coercion
// covers Postgres returning BIGINT as a string while the author wrote a number.
function subsetMatch(actual: Record<string, unknown>, expected: Record<string, unknown>): boolean {
  for (const key of Object.keys(expected)) {
    const a = actual[key];
    const e = expected[key];
    if (!valueEqual(a, e)) return false;
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
