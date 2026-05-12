// Per-card bootstrap. Mounts CodeMirror, debounces edits, and renders
// diagnostics plus Twoslash `^?` query results below the editor. Type-checking
// is live (no Run button) because the senior payoff is watching the type
// ripple as you change the source.

import { createEditor } from '../_shared/editor';
import { getCardRefs } from '../_shared/refs';
import { wireReset } from '../_shared/reset';
import { wireFeedback } from '../_shared/feedback-loop';
import type { Diagnostic, TypeQuery } from '../_shared/types';

const DEBOUNCE_MS = 300;

document.querySelectorAll<HTMLElement>('.lc-type').forEach((card) => {
    const refs = getCardRefs(card);
    const diagnosticsEl = card.querySelector<HTMLElement>('.lc-diagnostics')!;
    const queriesWrap = card.querySelector<HTMLElement>('.lc-queries')!;
    const queriesList = card.querySelector<HTMLElement>('.lc-queries-list')!;
    const criteriaEl = card.querySelector<HTMLElement>('.lc-criteria');

    const starter = card.dataset.starter ?? '';

    // Latest type-checker output — kept around so the feedback prompt can
    // include the same errors/queries the student is looking at without re-
    // running tsc.
    let latestDiagnostics: Diagnostic[] = [];
    let latestQueries: TypeQuery[] = [];

    const view = createEditor({
        parent: refs.editor,
        doc: starter,
        lang: 'ts',
        onDocChange: () => {
            scheduleCheck();
            feedback.refreshGate();
        },
    });

    wireReset({
        card,
        resetBtn: refs.resetBtn,
        view,
        starter,
        feedbackPanel: refs.feedbackPanel,
        feedbackStream: refs.feedbackStream,
    });

    const feedback = wireFeedback({
        card,
        button: refs.feedbackBtn,
        panel: refs.feedbackPanel,
        stream: refs.feedbackStream,
        closeBtn: refs.feedbackClose,
        unavailableBehavior: 'hide',
        isDirty: () => view.state.doc.toString() !== starter,
        buildPrompt: () =>
            `You are an AI tutor helping a student who is stuck on a TypeScript ` +
            `typing exercise. Give a short, encouraging hint that nudges them ` +
            `forward — do NOT give the full solution.\n\n` +
            (refs.instructions ? `INSTRUCTIONS:\n${refs.instructions}\n\n` : '') +
            `STUDENT'S CURRENT CODE:\n${view.state.doc.toString()}\n\n` +
            `CURRENT TYPE ERRORS:\n${collectDiagnostics(latestDiagnostics)}\n\n` +
            `CURRENT RESOLVED TYPE QUERIES (\`^?\`):\n${collectQueries(latestQueries)}\n\n` +
            `Reply with 1–2 short sentences (under 30 words total) addressed to the ` +
            `student in second person. Be terse: point at the single thing to check ` +
            `next, no warm-up phrases, no restating what they did. ` +
            `No code blocks, no headers, no preamble.`,
    });

    let timer: number | null = null;
    function scheduleCheck(): void {
        if (timer != null) window.clearTimeout(timer);
        timer = window.setTimeout(runCheck, DEBOUNCE_MS);
    }

    // Lazy-import the ts-env module so the multi-MB TypeScript compiler bundle
    // isn't on the editor's critical path.
    async function runCheck(): Promise<void> {
        const code = view.state.doc.toString();
        try {
            const { createTsEnv } = await import('../_shared/ts-env');
            // Each card gets its own env, but the lib map is cached in
            // localStorage by @typescript/vfs so subsequent cards on the
            // page are near-instant.
            const env = getEnv(createTsEnv);
            const { diagnostics, queries } = await env.check(code);
            latestDiagnostics = diagnostics;
            latestQueries = queries;
            renderQueries(queries);

            const expectedErrorMatchers = evaluateCriteria(diagnostics, queries);
            const unexpectedDiagnostics = diagnostics.filter(
                (d) =>
                    !expectedErrorMatchers.some(
                        (ee) =>
                            d.message.includes(ee.contains) &&
                            (ee.line == null || d.line === ee.line),
                    ),
            );
            renderDiagnostics(unexpectedDiagnostics);

            // The first successful check hides the boot pill.
            if (refs.boot) refs.boot.hidden = true;
        } catch (err) {
            if (refs.boot) refs.boot.textContent = 'Type-checker failed to load';
            console.error(err);
        }
    }

    // The criteria checklist is the single source of truth for what an
    // exercise checks. Each <li> declares its kind + match config via data-
    // attrs; this function reads them, decides met/unmet, and writes back
    // data-met. Returns the set of error matchers so unexpected diagnostics
    // can be filtered out of the visible errors panel.
    function evaluateCriteria(
        diagnostics: Diagnostic[],
        queries: TypeQuery[],
    ): Array<{ contains: string; line?: number }> {
        const matchers: Array<{ contains: string; line?: number }> = [];
        if (!criteriaEl) return matchers;
        criteriaEl
            .querySelectorAll<HTMLElement>('.lc-criterion')
            .forEach((li) => {
                const kind = li.dataset.kind;
                let met = false;
                if (kind === 'query') {
                    // Line is informational only — student refactors often
                    // shift the `^?` marker; we match on substring.
                    const contains = li.dataset.contains ?? '';
                    met = queries.some((q) => q.type.includes(contains));
                } else if (kind === 'error') {
                    const lineRaw = li.dataset.line ?? '';
                    const line = lineRaw === '' ? undefined : Number(lineRaw);
                    const contains = li.dataset.contains ?? '';
                    met = diagnostics.some(
                        (d) =>
                            d.message.includes(contains) &&
                            (line == null || d.line === line),
                    );
                    matchers.push({ contains, line });
                } else if (kind === 'clean') {
                    met = diagnostics.length === 0;
                }
                li.dataset.met = met ? 'true' : 'false';
            });
        return matchers;
    }

    function renderDiagnostics(items: Diagnostic[]): void {
        diagnosticsEl.innerHTML = '';
        if (items.length === 0) {
            diagnosticsEl.hidden = true;
            return;
        }
        diagnosticsEl.hidden = false;
        for (const d of items) {
            const li = document.createElement('li');
            li.className = 'lc-diagnostic';
            li.dataset.category = d.category;
            const loc = document.createElement('span');
            loc.className = 'lc-diag-loc';
            loc.textContent = `${d.line}:${d.column}`;
            const msg = document.createElement('span');
            msg.className = 'lc-diag-msg';
            msg.textContent = d.message;
            li.append(loc, msg);
            diagnosticsEl.appendChild(li);
        }
    }

    function renderQueries(items: TypeQuery[]): void {
        queriesList.innerHTML = '';
        if (items.length === 0) {
            queriesWrap.hidden = true;
            return;
        }
        queriesWrap.hidden = false;
        for (const q of items) {
            const li = document.createElement('li');
            li.className = 'lc-query';
            const loc = document.createElement('span');
            loc.className = 'lc-query-loc';
            // The `^?` marker points at the previous line, so that's what we
            // show.
            loc.textContent = String(q.line - 1);
            const type = document.createElement('code');
            type.className = 'lc-query-type';
            type.textContent = q.type;
            li.append(loc, type);
            queriesList.appendChild(li);
        }
    }

    // Initial pass so the learner sees the starter's type state without typing.
    scheduleCheck();
});

// One env per page — `getEnv` memoizes the factory so multiple TypeCoding
// cards on the same page share one TS LanguageService.
let sharedEnv: ReturnType<typeof import('../_shared/ts-env').createTsEnv> | null =
    null;
function getEnv(
    factory: typeof import('../_shared/ts-env').createTsEnv,
): ReturnType<typeof factory> {
    if (!sharedEnv) sharedEnv = factory();
    return sharedEnv;
}

function collectDiagnostics(latest: Diagnostic[]): string {
    if (latest.length === 0) return '(none)';
    return latest
        .map((d) => `- ${d.line}:${d.column} [${d.category}] ${d.message}`)
        .join('\n');
}

function collectQueries(latest: TypeQuery[]): string {
    if (latest.length === 0) return '(none)';
    return latest.map((q) => `- line ${q.line - 1}: ${q.type}`).join('\n');
}
