// AI feedback wiring. Identical state machine across every card that offers AI
// feedback: gate the button on (a) the student has edited the starter, (b) no
// in-flight stream. The buildPrompt callback is the only per-component thing —
// wrappers assemble their own component-specific prompt (with diagnoses,
// results, schema, etc.) and hand it in.
//
// Feedback streams from the shared OpenRouter client (same key/model as the
// chat widget). The key is checked at click time, not gate time: the button
// shows whenever the code is dirty, and an explicit click with no key opens the
// chat panel so the student can paste one — staying silent until then.

import {
    streamFeedback,
    hasFeedbackKey,
    openKeySetup,
    describeError,
} from '../../ai-chat/lib/exercise-feedback';

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

    let streaming = false;

    const refreshGate = (): void => {
        if (streaming) return;
        const dirty = hooks.isDirty();
        if (behavior === 'hide') {
            button.hidden = !dirty;
            // Chip-style controls visibility only; once shown the button must
            // be clickable. (The shell renders the button with `hidden` and
            // we never set `disabled` here.)
            button.disabled = false;
        } else {
            button.disabled = !dirty;
            button.title = dirty ? '' : 'Edit the code first, then ask for feedback.';
        }
    };

    // Initial gate: not dirty yet, so hide/disable until the student edits.
    refreshGate();

    closeBtn?.addEventListener('click', () => {
        panel.hidden = true;
    });

    button.addEventListener('click', async () => {
        // No key yet — open the chat panel (it auto-shows the key modal) and
        // bail. The student pastes a key once, then clicks again.
        if (!hasFeedbackKey()) {
            openKeySetup();
            return;
        }
        streaming = true;
        // Disable during the stream so a fast double-click can't fire two
        // requests. Hide-mode chips would jump out from under the cursor if
        // hidden mid-stream, so we keep them visible but disabled.
        button.disabled = true;
        panel.hidden = false;
        card.dataset.feedbackState = 'pending';
        stream.textContent = '';
        try {
            for await (const chunk of streamFeedback(hooks.buildPrompt(), {
                temperature: 0.3,
            })) {
                stream.textContent = (stream.textContent ?? '') + chunk;
            }
        } catch (err) {
            stream.textContent = describeError(err);
        } finally {
            delete card.dataset.feedbackState;
            streaming = false;
            refreshGate();
        }
    });

    return { refreshGate };
}
