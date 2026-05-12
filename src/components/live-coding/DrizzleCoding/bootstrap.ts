// Per-card bootstrap. Mounts CodeMirror with TypeScript support, drives the
// Run button into the Drizzle runtime (Web Worker + PGlite), and renders the
// result rows as a table. Success criterion (if any) is a row-match against
// `expectedRows`; rows are subset-matched per column so a `db.select()` with
// extra columns doesn't fail a query whose lesson only pinned `{ name: '…' }`.

import { DrizzleRunner, type RunOutcome } from './drizzle-runtime';
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
import type { QueryResult, Row } from '../_shared/types';

function outcomeToQueryResult(outcome: RunOutcome): QueryResult | null {
    if (!outcome.ok) return null;
    return {
        rows: outcome.rows,
        columns:
            outcome.columns.length > 0
                ? outcome.columns
                : outcome.rows[0]
                  ? Object.keys(outcome.rows[0])
                  : [],
        durationMs: outcome.durationMs,
    };
}

document.querySelectorAll<HTMLElement>('.lc-drizzle').forEach((card) => {
    const refs = getCardRefs(card);
    const resultEl = card.querySelector<HTMLElement>('.lc-result')!;
    const criteriaEl = card.querySelector<HTMLElement>('.lc-criteria');

    const starter = card.dataset.starter ?? '';
    const schemaSource = card.dataset.schema ?? '';
    const seedSQL = card.dataset.seed ?? '';
    const expectedRowsRaw = card.dataset.expectedRows ?? '';
    const expectedRows: Row[] | null = expectedRowsRaw
        ? JSON.parse(expectedRowsRaw)
        : null;
    const ordered = card.dataset.ordered !== 'false';

    const runner = new DrizzleRunner({ schemaSource, seedSQL });
    let latestOutcome: RunOutcome | null = null;

    const view = createEditor({
        parent: refs.editor,
        doc: starter,
        lang: 'ts',
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
            latestOutcome = null;
        },
    });

    refs.runBtn!.addEventListener('click', async () => {
        refs.runBtn!.disabled = true;
        setStatus(refs.status, 'running');
        clearOutput();

        const outcome = await runner.run(view.state.doc.toString());
        latestOutcome = outcome;

        if (outcome.ok) {
            renderResultTable(resultEl, outcomeToQueryResult(outcome)!);
            evaluateCriteria(outcome.rows);
            setStatus(refs.status, 'idle');
        } else {
            setError(refs.errorPane, outcome.error);
            evaluateCriteria(null);
            setStatus(refs.status, 'error', outcome.timedOut ? 'Timed out' : 'Error');
        }

        refs.runBtn!.disabled = false;
    });

    function clearOutput(): void {
        resultEl.innerHTML = '';
        resultEl.hidden = true;
        setError(refs.errorPane, null);
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
            const queryResult = latestOutcome ? outcomeToQueryResult(latestOutcome) : null;
            const actualCols = queryResult?.columns ?? [];
            const error =
                latestOutcome && !latestOutcome.ok ? latestOutcome.error : null;
            const diagnosis = expectedRows
                ? diagnoseRows({
                      actualRows: queryResult?.rows ?? null,
                      actualCols,
                      expectedRows,
                      ordered,
                      error,
                  })
                : 'NO_CRITERIA: sandbox card';
            return (
                `You are an AI tutor helping a student on a Drizzle (TypeScript ORM) exercise. ` +
                `The grader has already evaluated the student's query and produced a ` +
                `DIAGNOSIS that you MUST treat as ground truth. Do not re-derive pass/fail ` +
                `by inspecting the rows yourself.\n\n` +
                (refs.instructions ? `INSTRUCTIONS:\n${refs.instructions}\n\n` : '') +
                `DRIZZLE SCHEMA:\n${schemaSource}\n\n` +
                `SEED SQL:\n${seedSQL}\n\n` +
                `STUDENT'S CURRENT CODE:\n${view.state.doc.toString()}\n\n` +
                `DIAGNOSIS:\n${diagnosis}\n\n` +
                `CURRENT RESULT:\n${describeRowsForPrompt(queryResult)}\n\n` +
                `EXPECTED ROWS (subset match per column):\n${expectedRows ? JSON.stringify(expectedRows, null, 2) : '(none)'}\n\n` +
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
        },
    });
});
