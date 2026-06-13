// Shared AI-feedback adapter for the interactive exercises. Exercises talk to
// the same OpenRouter client as the chat widget (streamChat), reusing the
// student's BYOK key and model from settings — no second AI backend, no second
// key. The chat owns key entry: when no key is set, an explicit feedback
// request opens the chat panel, which auto-shows its settings modal.
import { streamChat, DEFAULT_MODEL_ID } from './openrouter';
import { loadSettings } from './storage';

export { OpenRouterError, describeError } from './openrouter';

export type FeedbackOptions = { temperature?: number };

/** True when the student has saved an OpenRouter key (shared with the chat). */
export const hasFeedbackKey = (): boolean => !!loadSettings()?.apiKey;

/** Opens the chat panel; with no key set it auto-shows the key-settings modal
 * (ChatApp drains this via the Footer loader). The no-key branch of an explicit
 * feedback request — never call this from a passive/page-load path. */
export const openKeySetup = (): void => {
	document.dispatchEvent(new CustomEvent('ai-chat:open'));
};

/** Streams feedback for a single prompt against the shared model. Callers gate
 * with hasFeedbackKey() first; this assumes a key is present and lets
 * OpenRouterError surface on HTTP/stream failures so the caller can fall back. */
export async function* streamFeedback(
	prompt: string,
	options?: FeedbackOptions,
): AsyncGenerator<string> {
	const settings = loadSettings();
	yield* streamChat({
		apiKey: settings?.apiKey ?? '',
		model: settings?.modelId || DEFAULT_MODEL_ID,
		messages: [{ role: 'user', content: prompt }],
		// Exercises don't expose a cancel control; a fresh, never-aborted signal
		// satisfies streamChat's contract.
		signal: new AbortController().signal,
		temperature: options?.temperature,
	});
}

/** Non-streaming convenience: collects the full completion into one string.
 * Replaces the old Ollama runPrompt for graders that parse a complete response
 * (e.g. CodeReview's JSON scores). */
export async function runFeedback(
	prompt: string,
	options?: FeedbackOptions,
): Promise<string> {
	let out = '';
	for await (const chunk of streamFeedback(prompt, options)) out += chunk;
	return out;
}
