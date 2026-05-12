// Per-card bootstrap. Mounts CodeMirror with a Postgres SQL grammar, drives
// the Run button into the PGlite runtime, and renders the result set as a
// table. Success criterion (if any) is row-match against `expectedRows`;
// rows are subset-matched per column so `SELECT *` doesn't fail an exercise
// that only pinned `{ name: '…' }`.

import { SQLRunner, type QueryResult } from './pglite-runtime';
import { createEditor } from '../_shared/editor';
import { getCardRefs } from '../_shared/refs';
import { setStatus, setError } from '../_shared/status';
import { wireReset } from '../_shared/reset';
import { wireFeedback } from '../_shared/feedback-loop';
import {
    renderResultTable,
    compareRows,
    describeRowsForPrompt,
    diagnoseRows,
} from '../_shared/result-table';
import type { Row } from '../_shared/types';

document.querySelectorAll<HTMLElement>('.lc-sql').forEach((card) => {
    const refs = getCardRefs(card);
    const resultEl = card.querySelector<HTMLElement>('.lc-result')!;
    const criteriaEl = card.querySelector<HTMLElement>('.lc-criteria');

    const starter = card.dataset.starter ?? '';
    const seed = card.dataset.seed ?? '';
    const expectedRowsRaw = card.dataset.expectedRows ?? '';
    const expectedRows: Row[] | null = expectedRowsRaw
        ? JSON.parse(expectedRowsRaw)
        : null;
    const ordered = card.dataset.ordered !== 'false';

    const runner = new SQLRunner(seed);
    let latestResult: QueryResult | null = null;
    let latestError: string | null = null;

    const view = createEditor({
        parent: refs.editor,
        doc: starter,
        lang: 'sql',
        onDocChange: () => feedback.refreshGate(),
    });

    wireReset({
        card,
        resetBtn: refs.resetBtn,
        view,
        starter,
        feedbackPanel: refs.feedbackPanel,
        feedbackStream: refs.feedbackStream,
        errorPane: refs.errorPane,
        onAfterReset: () => {
            resultEl.innerHTML = '';
            resultEl.hidden = true;
            latestResult = null;
            latestError = null;
        },
    });

    refs.runBtn!.addEventListener('click', async () => {
        refs.runBtn!.disabled = true;
        setStatus(refs.status, 'running');
        clearOutput();

        const outcome = await runner.run(view.state.doc.toString());

        if (outcome.ok) {
            latestResult = outcome.result;
            latestError = null;
            renderResultTable(resultEl, outcome.result);
            evaluateCriteria(outcome.result.rows);
            setStatus(refs.status, 'idle');
        } else {
            latestResult = null;
            latestError = outcome.error;
            setError(refs.errorPane, outcome.error);
            evaluateCriteria(null);
            setStatus(refs.status, 'error');
        }

        refs.runBtn!.disabled = false;
    });

    function clearOutput(): void {
        resultEl.innerHTML = '';
        resultEl.hidden = true;
        setError(refs.errorPane, null);
        // Hide the checklist while a run is in flight; `data-met='false'`
        // renders red, so showing items during the async wait would briefly
        // suggest a failed run before the query finishes.
        if (criteriaEl) {
            criteriaEl.hidden = true;
            criteriaEl
                .querySelectorAll<HTMLElement>('.lc-criterion')
                .forEach((li) => {
                    li.dataset.met = 'false';
                });
        }
    }

    function evaluateCriteria(rows: Row[] | null): void {
        if (!criteriaEl || !expectedRows) return;
        criteriaEl.hidden = false;
        criteriaEl
            .querySelectorAll<HTMLElement>('.lc-criterion')
            .forEach((li) => {
                const kind = li.dataset.kind;
                let met = false;
                if (kind === 'rows' && rows) {
                    met = compareRows(rows, expectedRows, ordered);
                }
                li.dataset.met = met ? 'true' : 'false';
            });
    }

    const feedback = wireFeedback({
        card,
        button: refs.feedbackBtn,
        panel: refs.feedbackPanel,
        stream: refs.feedbackStream,
        closeBtn: refs.feedbackClose,
        isDirty: () => view.state.doc.toString() !== starter,
        buildPrompt: () => {
            const actualCols = latestResult?.fields?.length
                ? latestResult.fields.map((f) => f.name)
                : latestResult?.rows[0]
                  ? Object.keys(latestResult.rows[0])
                  : [];
            const diagnosis = expectedRows
                ? diagnoseRows({
                      actualRows: latestResult?.rows ?? null,
                      actualCols,
                      expectedRows,
                      ordered,
                      error: latestError,
                  })
                : 'NO_CRITERIA: sandbox card';
            return (
                `You are an AI tutor helping a student on a SQL exercise. ` +
                `The grader has already evaluated the student's query and produced ` +
                `a DIAGNOSIS that you MUST treat as ground truth. Do not re-derive ` +
                `pass/fail by inspecting the rows yourself.\n\n` +
                (refs.instructions ? `INSTRUCTIONS:\n${refs.instructions}\n\n` : '') +
                `SCHEMA / SEED:\n${seed}\n\n` +
                `STUDENT'S CURRENT QUERY:\n${view.state.doc.toString()}\n\n` +
                `DIAGNOSIS:\n${diagnosis}\n\n` +
                `CURRENT RESULT:\n${describeRowsForPrompt(latestResult)}\n\n` +
                `EXPECTED ROWS (subset match per column):\n${expectedRows ? JSON.stringify(expectedRows, null, 2) : '(none)'}\n\n` +
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
        },
    });
});
