// Per-card bootstrap. Mounts CodeMirror, debounces edits, kicks off both halves
// of the hybrid lesson (TS type-check + Zod runtime parse), and renders the
// resulting state into the card. Feedback prompt collects diagnostics, resolved
// `^?` queries, AND per-fixture pass/fail so the AI tutor's hint can address
// whichever side the student is stuck on.

import { EditorView, Decoration, WidgetType, hoverTooltip } from '@codemirror/view';
import type { DecorationSet, Tooltip } from '@codemirror/view';
import { StateField, StateEffect } from '@codemirror/state';

import type { Fixture, FixtureResult } from './parse-runner';
import { ZOD_SHIM_DTS } from './zod-shim';
import { createEditor } from '../_shared/editor';
import { getCardRefs } from '../_shared/refs';
import { wireReset } from '../_shared/reset';
import { wireFeedback } from '../_shared/feedback-loop';
import type { Diagnostic, TypeQuery } from '../_shared/types';

// ─── Hover-driven type-query reveal ───────────────────────────────────
// The lesson author still writes `// ^?` in the starter code (so authoring
// matches the Twoslash convention students will see in VS Code), but at
// render time we:
//   1. HIDE the `^?` marker line with a block-level replace decoration
//   2. UNDERLINE the symbol on the line above at the `^` column with a
//      mark decoration carrying the resolved type as a data attribute
//   3. SHOW a tooltip with that type on hover, via CodeMirror's built-in
//      hoverTooltip extension — styled to match the CodeTooltips widget

class HiddenLineWidget extends WidgetType {
    toDOM(): HTMLElement {
        const el = document.createElement('span');
        el.style.cssText = 'display: none';
        return el;
    }
    ignoreEvent(): boolean { return true; }
}

const setQueriesEffect = StateEffect.define<TypeQuery[]>();

function buildQueryDecorations(
    doc: {
        lines: number;
        line(n: number): { from: number; to: number; text: string; length: number };
    },
    queries: TypeQuery[],
) {
    const ranges: Array<{ from: number; to: number; deco: Decoration }> = [];
    for (const q of queries) {
        if (q.line < 1 || q.line > doc.lines) continue;
        const markerLine = doc.line(q.line);
        ranges.push({
            from: markerLine.from,
            to: markerLine.to + 1,
            deco: Decoration.replace({ block: true, widget: new HiddenLineWidget() }),
        });
        if (q.line > 1) {
            const caretCol = Math.max(0, markerLine.text.indexOf('^'));
            const targetLine = doc.line(q.line - 1);
            const text = targetLine.text;
            const local = Math.min(caretCol, text.length);
            const isIdent = (ch: string) => /[A-Za-z0-9_$]/.test(ch);
            let start = local;
            while (start > 0 && isIdent(text[start - 1])) start--;
            let end = local;
            if (end < text.length && isIdent(text[end])) {
                while (end < text.length && isIdent(text[end])) end++;
            } else {
                end = Math.min(local + 1, text.length);
            }
            if (end > start) {
                ranges.push({
                    from: targetLine.from + start,
                    to: targetLine.from + end,
                    deco: Decoration.mark({
                        class: 'cm-query-mark',
                        attributes: { 'data-type': q.type },
                    }),
                });
            }
        }
    }
    ranges.sort((a, b) => a.from - b.from || a.to - b.to);
    return ranges;
}

const queryDecorationsField = StateField.define<DecorationSet>({
    create(): DecorationSet { return Decoration.none; },
    update(decos, tr): DecorationSet {
        decos = decos.map(tr.changes);
        for (const e of tr.effects) {
            if (e.is(setQueriesEffect)) {
                const ranges = buildQueryDecorations(tr.newDoc, e.value);
                decos = Decoration.set(
                    ranges.map((r) => r.deco.range(r.from, r.to)),
                    true,
                );
            }
        }
        return decos;
    },
    provide: (f) => EditorView.decorations.from(f),
});

const queryHoverTooltip = hoverTooltip((view, pos): Tooltip | null => {
    const decos = view.state.field(queryDecorationsField);
    let found: { from: number; to: number; type: string } | null = null;
    decos.between(pos, pos + 1, (from, to, deco) => {
        const typeText = (deco.spec.attributes as Record<string, string> | undefined)?.[
            'data-type'
        ];
        if (typeText) {
            found = { from, to, type: typeText };
            return false;
        }
    });
    if (!found) return null;
    const hit = found as { from: number; to: number; type: string };
    return {
        pos: hit.from,
        end: hit.to,
        above: true,
        create() {
            const dom = document.createElement('div');
            dom.className = 'zc-cm-tip';
            dom.textContent = hit.type;
            return { dom };
        },
    };
});

// Slightly longer than TypeCoding's 300ms — the runtime side spins up an
// iframe, so debouncing more aggressively keeps a fast typer from queuing
// half a dozen sandbox boots they immediately invalidate.
const DEBOUNCE_MS = 450;

document.querySelectorAll<HTMLElement>('.lc-zod').forEach((card) => {
    const refs = getCardRefs(card);
    const fixturesBodyEl = card.querySelector<HTMLElement>(
        '.lc-zc-fixtures-table tbody',
    );
    const harnessErrorRowEl = card.querySelector<HTMLElement>('.lc-zc-harness-error-row');
    const harnessErrorCellEl = card.querySelector<HTMLElement>('.lc-zc-harness-error-cell');

    const starter = card.dataset.starter ?? '';
    const schemaName = card.dataset.schemaName ?? '';
    const fixtures: Fixture[] = parseFixtures(card.dataset.fixtures ?? '[]');

    let latestDiagnostics: Diagnostic[] = [];
    let latestQueries: TypeQuery[] = [];
    let latestFixtureResults: FixtureResult[] = [];
    let latestHarnessError: string | null = null;

    const view = createEditor({
        parent: refs.editor,
        doc: starter,
        lang: 'ts',
        extraExtensions: [queryDecorationsField, queryHoverTooltip],
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
            `You are an AI tutor helping a student who is stuck on a Zod schema ` +
            `exercise. They are writing a TypeScript schema that must (a) produce ` +
            `the right inferred type and (b) accept/reject the lesson's fixtures ` +
            `correctly. Give a short, encouraging hint — do NOT give the full ` +
            `solution.\n\n` +
            (refs.instructions ? `INSTRUCTIONS:\n${refs.instructions}\n\n` : '') +
            `SCHEMA NAME UNDER TEST: ${schemaName || '(unknown)'}\n\n` +
            `STUDENT'S CURRENT CODE:\n${view.state.doc.toString()}\n\n` +
            `CURRENT TYPE ERRORS:\n${collectDiagnostics(latestDiagnostics)}\n\n` +
            `CURRENT RESOLVED TYPE QUERIES (\`^?\`):\n${collectQueries(latestQueries)}\n\n` +
            `CURRENT FIXTURE RESULTS:\n${collectFixtures(latestFixtureResults, latestHarnessError)}\n\n` +
            `Reply with 1–2 short sentences (under 30 words total) addressed to the ` +
            `student in second person. Be terse: point at the single thing to check ` +
            `next, no warm-up phrases, no restating what they did. ` +
            `No code blocks, no headers, no preamble.`,
    });

    // ───── Type + parse loop ────────────────────────────────────────────
    let timer: number | null = null;
    let cancelParseRun: (() => void) | null = null;
    let runToken = 0;

    function scheduleCheck(): void {
        if (timer != null) window.clearTimeout(timer);
        timer = window.setTimeout(runCheck, DEBOUNCE_MS);
    }

    async function runCheck(): Promise<void> {
        const myToken = ++runToken;
        const code = view.state.doc.toString();

        // Type-check side — lazy import keeps the (heavy) TS compiler bundle
        // off the editor's critical path.
        let typeCheckPromise: Promise<{ diagnostics: Diagnostic[]; queries: TypeQuery[] }> | null =
            null;
        try {
            const { createTsEnv } = await import('../_shared/ts-env');
            typeCheckPromise = getEnv(createTsEnv).check(code);
        } catch (err) {
            if (refs.boot) refs.boot.textContent = 'Type-checker failed to load';
            console.error(err);
        }

        // Parse side — only when the lesson pinned fixtures. The iframe is
        // light but networks out to esm.sh; skip when there's nothing to
        // verify.
        if (fixtures.length > 0) {
            if (cancelParseRun) cancelParseRun();
            startParseRun(code, myToken);
        }

        if (typeCheckPromise) {
            const { diagnostics, queries } = await typeCheckPromise;
            if (myToken !== runToken) return;
            latestDiagnostics = diagnostics;
            latestQueries = queries;
            // Push the resolved types into the editor: the StateField listens
            // for this effect and rebuilds the decoration set.
            view.dispatch({ effects: setQueriesEffect.of(queries) });
            if (refs.boot) refs.boot.hidden = true;
        }
    }

    function startParseRun(code: string, token: number): void {
        if (!fixturesBodyEl) return;
        resetFixtureRows();
        const incoming: FixtureResult[] = [];
        latestHarnessError = null;

        import('./parse-runner')
            .then(({ runFixtures }) => {
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
                    },
                );
            })
            .catch((err) => {
                if (token !== runToken) return;
                console.error(err);
                markFixturesHarnessFailure('Could not load the parse runner.');
            });
    }

    function resetFixtureRows(): void {
        if (!fixturesBodyEl) return;
        fixturesBodyEl
            .querySelectorAll<HTMLElement>('.lc-zc-fixture-row')
            .forEach((row) => {
                row.dataset.status = 'pending';
            });
        if (harnessErrorRowEl) harnessErrorRowEl.hidden = true;
        if (harnessErrorCellEl) harnessErrorCellEl.textContent = '';
    }

    function updateFixtureRow(r: FixtureResult): void {
        if (!fixturesBodyEl) return;
        const row = fixturesBodyEl.querySelector<HTMLElement>(
            `.lc-zc-fixture-row[data-fixture-name="${cssEscape(r.name)}"]`,
        );
        if (row) row.dataset.status = r.ok ? 'ok' : 'bad';
    }

    function markFixturesHarnessFailure(msg: string): void {
        if (!fixturesBodyEl) return;
        if (harnessErrorRowEl && harnessErrorCellEl) {
            harnessErrorCellEl.textContent = msg;
            harnessErrorRowEl.hidden = false;
        }
        fixturesBodyEl
            .querySelectorAll<HTMLElement>('.lc-zc-fixture-row')
            .forEach((row) => {
                row.dataset.status = 'bad';
            });
    }

    scheduleCheck();
});

// One TS env per page, seeded with the Zod ambient module declaration so
// `import { z } from 'zod'` resolves without us having to wire up a
// node_modules layout in the vfs.
let sharedEnv: ReturnType<typeof import('../_shared/ts-env').createTsEnv> | null =
    null;
function getEnv(
    factory: typeof import('../_shared/ts-env').createTsEnv,
): ReturnType<typeof factory> {
    if (!sharedEnv) {
        sharedEnv = factory({ ambientFiles: { '/zod.d.ts': ZOD_SHIM_DTS } });
    }
    return sharedEnv;
}

function parseFixtures(raw: string): Fixture[] {
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(
            (f): f is Fixture =>
                f &&
                typeof f === 'object' &&
                typeof f.name === 'string' &&
                (f.expect === 'pass' || f.expect === 'fail'),
        );
    } catch {
        return [];
    }
}

function cssEscape(s: string): string {
    return s.replace(/["\\]/g, '\\$&');
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

function collectFixtures(
    latest: FixtureResult[],
    harnessError: string | null,
): string {
    if (harnessError) return `(harness error) ${harnessError}`;
    if (latest.length === 0) return '(not yet run)';
    return latest
        .map((r) => {
            const verdict = r.ok ? 'matched expectation' : 'did NOT match expectation';
            const err = r.errorMessage ? ` — error: ${r.errorMessage}` : '';
            return `- ${r.name}: expected ${r.expect}, got ${r.actual} (${verdict})${err}`;
        })
        .join('\n');
}
