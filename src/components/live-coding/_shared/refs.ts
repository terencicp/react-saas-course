// One place that knows the shell's class names. Wrappers consume `getCardRefs`
// instead of doing their own `card.querySelector('.lc-…')` — so renaming a
// shell class is a one-file change.

export interface CardRefs {
    card: HTMLElement;
    editor: HTMLElement;
    /** Run is absent in chip/live-update cards (data-controls='chips'). */
    runBtn: HTMLButtonElement | null;
    resetBtn: HTMLButtonElement;
    /** Feedback trio is absent on pure sandbox cards (hasFeedback={false}). */
    feedbackBtn: HTMLButtonElement | null;
    feedbackPanel: HTMLElement | null;
    feedbackStream: HTMLElement | null;
    feedbackClose: HTMLButtonElement | null;
    /** Status indicator (toolbar-only cards). */
    status: HTMLElement | null;
    errorPane: HTMLElement;
    /** The boot pill chip (Type/Zod). */
    boot: HTMLElement | null;
    instructions: string;
}

export function getCardRefs(card: HTMLElement): CardRefs {
    return {
        card,
        editor: card.querySelector<HTMLElement>('.lc-editor')!,
        runBtn: card.querySelector<HTMLButtonElement>('.lc-run'),
        resetBtn: card.querySelector<HTMLButtonElement>('.lc-reset')!,
        feedbackBtn: card.querySelector<HTMLButtonElement>('.lc-feedback-btn'),
        feedbackPanel: card.querySelector<HTMLElement>('.lc-feedback'),
        feedbackStream: card.querySelector<HTMLElement>('.lc-feedback-stream'),
        feedbackClose: card.querySelector<HTMLButtonElement>('.lc-feedback-close'),
        status: card.querySelector<HTMLElement>('.lc-status'),
        errorPane: card.querySelector<HTMLElement>('.lc-error')!,
        boot: card.querySelector<HTMLElement>('.lc-boot'),
        instructions:
            card.querySelector<HTMLElement>('.lc-instructions')?.textContent?.trim() ?? '',
    };
}
