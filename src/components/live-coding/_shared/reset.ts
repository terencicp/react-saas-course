// Reset-button helper. Every card resets to the original starter and clears
// transient UI (output, feedback, criteria). Cards with custom transient state
// (live-update timers, iframes) pass an `onAfterReset` callback.

import type { EditorView } from '@codemirror/view';

export interface WireResetOpts {
    card: HTMLElement;
    resetBtn: HTMLButtonElement;
    view: EditorView;
    starter: string;
    feedbackPanel?: HTMLElement | null;
    feedbackStream?: HTMLElement | null;
    errorPane?: HTMLElement | null;
    onAfterReset?: () => void;
}

export function wireReset(opts: WireResetOpts): void {
    opts.resetBtn.addEventListener('click', () => {
        opts.view.dispatch({
            changes: {
                from: 0,
                to: opts.view.state.doc.length,
                insert: opts.starter,
            },
        });
        if (opts.feedbackPanel) opts.feedbackPanel.hidden = true;
        if (opts.feedbackStream) opts.feedbackStream.textContent = '';
        if (opts.errorPane) {
            opts.errorPane.hidden = true;
            opts.errorPane.textContent = '';
        }
        // Criteria are run-gated: any checklist on the card should hide again
        // and snap back to its "not yet run" state. The shell uses the
        // .lc-criteria class; hide it but leave individual `data-met` attrs
        // alone — the next run flips them.
        const criteria = opts.card.querySelector<HTMLElement>('.lc-criteria');
        if (criteria) {
            criteria.hidden = true;
            criteria
                .querySelectorAll<HTMLElement>('.lc-criterion')
                .forEach((li) => {
                    li.dataset.met = 'false';
                });
        }
        opts.onAfterReset?.();
    });
}
