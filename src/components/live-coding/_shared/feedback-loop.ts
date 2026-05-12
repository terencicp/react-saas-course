// Ollama feedback wiring. Identical state machine across every card that
// offers AI feedback: gate the button on (a) Ollama reachable, (b) student
// has edited the starter, (c) no in-flight stream. The buildPrompt callback
// is the only per-component thing — wrappers assemble their own component-
// specific prompt (with diagnoses, results, schema, etc.) and hand it in.

import {
    streamPrompt,
    OllamaError,
    pingOllama,
} from '../../../lib/ollama';

// One shared probe per page — Ollama is either reachable or not; no point
// hitting /api/tags once per card.
const ollamaReady = pingOllama();

export interface FeedbackHooks {
    card: HTMLElement;
    button: HTMLButtonElement | null;
    panel: HTMLElement | null;
    stream: HTMLElement | null;
    closeBtn?: HTMLButtonElement | null;
    /** Code !== starter. Wrappers call `refreshGate()` from their editor's
     * doc-change listener so the button enables/disables live. */
    isDirty: () => boolean;
    buildPrompt: () => string;
    /** Chip-style cards hide the button when unavailable so it doesn't take
     * space in the editor overlay. Toolbar cards disable it (a missing button
     * would leave a gap between Run and Reset). Default: 'disable'. */
    unavailableBehavior?: 'hide' | 'disable';
}

export interface FeedbackController {
    /** Re-evaluate the button's enabled/visible state. Called from the
     * editor's updateListener whenever the doc changes. */
    refreshGate(): void;
}

export function wireFeedback(hooks: FeedbackHooks): FeedbackController {
    const behavior = hooks.unavailableBehavior ?? 'disable';
    const { card, button, panel, stream, closeBtn } = hooks;

    // Sandbox card with no feedback — return a no-op controller so callers
    // don't need to guard every refreshGate() call.
    if (!button || !panel || !stream) {
        return { refreshGate: () => {} };
    }

    let ollamaOk = false;
    let streaming = false;

    const refreshGate = (): void => {
        if (streaming) return;
        const dirty = hooks.isDirty();
        const unavailable = !(ollamaOk && dirty);
        if (behavior === 'hide') {
            button.hidden = unavailable;
            // Chip-style controls visibility only; once shown the button must
            // be clickable. (The shell renders the button with `hidden` and
            // we never set `disabled` here.)
            button.disabled = false;
        } else {
            button.disabled = unavailable;
            button.title = !ollamaOk
                ? 'AI tutor unavailable — Ollama is not reachable.'
                : !dirty
                  ? 'Edit the code first, then ask for feedback.'
                  : '';
        }
    };

    // Initial gate: disable/hide until the ping resolves.
    if (behavior === 'hide') button.hidden = true;
    else button.disabled = true;
    ollamaReady.then((ok) => {
        ollamaOk = ok;
        refreshGate();
    });

    closeBtn?.addEventListener('click', () => {
        panel.hidden = true;
    });

    button.addEventListener('click', async () => {
        streaming = true;
        // Disable during the stream so a fast double-click can't fire two
        // requests. Hide-mode chips would jump out from under the cursor if
        // hidden mid-stream, so we keep them visible but disabled.
        button.disabled = true;
        panel.hidden = false;
        card.dataset.feedbackState = 'pending';
        stream.textContent = '';
        try {
            for await (const chunk of streamPrompt(hooks.buildPrompt(), {
                temperature: 0.3,
            })) {
                stream.textContent = (stream.textContent ?? '') + chunk;
            }
        } catch (err) {
            stream.textContent =
                err instanceof OllamaError
                    ? err.message
                    : 'Could not reach the AI tutor. Please try again.';
            // Stream failure usually means Ollama died between probe and
            // click. Mark unavailable so the next refresh disables.
            ollamaOk = false;
        } finally {
            delete card.dataset.feedbackState;
            streaming = false;
            refreshGate();
        }
    });

    return { refreshGate };
}
