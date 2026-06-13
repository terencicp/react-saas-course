// Row-table renderer + comparison helpers. SQL and Drizzle cards both render
// Postgres-shaped result sets and grade against a subset-match expected-rows
// declaration; the logic was duplicated verbatim across both bootstraps.

import type { QueryResult, Row } from './types';

export function formatCell(v: unknown): string {
    if (v === null) return 'NULL';
    if (v === undefined) return '';
    if (v instanceof Date) return v.toISOString();
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
}

export function renderResultTable(
    container: HTMLElement,
    result: QueryResult,
): void {
    container.hidden = false;
    container.innerHTML = '';

    if (result.rows.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'lc-result-summary';
        // Show affectedRows when non-zero (INSERT/UPDATE/DELETE return 0 rows
        // but an affectedRows count) — otherwise just "0 rows".
        empty.textContent =
            result.affectedRows != null && result.affectedRows > 0
                ? `${result.affectedRows} row${result.affectedRows === 1 ? '' : 's'} affected`
                : '0 rows';
        container.appendChild(empty);
        return;
    }

    const cols = result.fields?.length
        ? result.fields.map((f) => f.name)
        : result.columns?.length
          ? result.columns
          : Object.keys(result.rows[0]);

    // Postgres accepts `SELECT FROM t GROUP BY k` — n rows × 0 columns.
    // Render an explicit message instead of a blank table with a confusing
    // "N rows" summary.
    if (cols.length === 0) {
        const note = document.createElement('div');
        note.className = 'lc-result-summary';
        note.textContent =
            `${result.rows.length} row${result.rows.length === 1 ? '' : 's'} × 0 columns — ` +
            `Add column names after SELECT.`;
        container.appendChild(note);
        return;
    }

    const wrap = document.createElement('div');
    wrap.className = 'lc-result-tablewrap';
    const table = document.createElement('table');
    table.className = 'lc-result-table';

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
            const v = (row as Row)[col];
            td.textContent = formatCell(v);
            if (v === null) td.classList.add('lc-cell-null');
            tr.appendChild(td);
        }
        tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    wrap.appendChild(table);
    container.appendChild(wrap);

    const summary = document.createElement('div');
    summary.className = 'lc-result-summary';
    const durationSuffix =
        result.durationMs != null ? ` · ${result.durationMs.toFixed(0)}ms` : '';
    summary.textContent =
        `${result.rows.length} row${result.rows.length === 1 ? '' : 's'}${durationSuffix}`;
    container.appendChild(summary);
}

// ---- Comparison ----

export function compareRows(actual: Row[], expected: Row[], ordered: boolean): boolean {
    if (actual.length !== expected.length) return false;
    if (ordered) {
        return actual.every((row, i) => subsetMatch(row, expected[i]));
    }
    // Unordered: every expected row must match some unused actual row.
    const used = new Set<number>();
    for (const exp of expected) {
        const idx = actual.findIndex(
            (row, i) => !used.has(i) && subsetMatch(row, exp),
        );
        if (idx === -1) return false;
        used.add(idx);
    }
    return true;
}

// Subset match: every key in `expected` exists in `actual` with an equal
// value. Extra columns in `actual` are tolerated — exercises pin the columns
// they care about and `SELECT *` shouldn't fail a row-match. String/number
// coercion covers Postgres returning BIGINT as a string while the author
// wrote a number.
export function subsetMatch(actual: Row, expected: Row): boolean {
    for (const key of Object.keys(expected)) {
        if (!valueEqual(actual[key], expected[key])) return false;
    }
    return true;
}

export function valueEqual(a: unknown, e: unknown): boolean {
    if (Object.is(a, e)) return true;
    if (a === null || e === null) return a === e;
    if (typeof a === 'object' && typeof e === 'object') {
        return JSON.stringify(a) === JSON.stringify(e);
    }
    return String(a) === String(e);
}

// ---- Diagnosis for the AI tutor ----

export interface DiagnoseOpts {
    actualRows: Row[] | null;
    actualCols: string[];
    expectedRows: Row[];
    ordered: boolean;
    error?: string | null;
}

/**
 * Pre-computed pass/fail + a specific reason. Small or cheap models reliably
 * hallucinate "perfect!" when asked to compare two row dumps themselves; we do
 * the comparison here and hand the AI the verdict, which constrains its output
 * much more reliably.
 */
export function diagnoseRows(opts: DiagnoseOpts): string {
    const { actualRows, actualCols, expectedRows, ordered, error } = opts;
    if (error) return `FAIL: query raised an error — ${error}`;
    if (actualRows == null) return 'NOT_RUN: the student has not run the query yet';

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

export function describeRowsForPrompt(result: QueryResult | null): string {
    if (!result) return '(query has not been run yet)';
    if (result.rows.length === 0) return '(query returned 0 rows)';
    const cols = result.fields?.length
        ? result.fields.map((f) => f.name)
        : result.columns?.length
          ? result.columns
          : Object.keys(result.rows[0]);
    const head = cols.join(' | ');
    const body = result.rows
        .slice(0, 10)
        .map((r) => cols.map((c) => formatCell((r as Row)[c])).join(' | '))
        .join('\n');
    const trailer =
        result.rows.length > 10 ? `\n… (${result.rows.length - 10} more)` : '';
    return `${head}\n${body}${trailer}`;
}
