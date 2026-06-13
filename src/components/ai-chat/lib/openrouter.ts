// Browser-side OpenRouter client. The student's own API key (BYOK) is sent
// straight from the browser — there is no backend. Streaming uses the
// OpenAI-compatible SSE protocol over fetch.
import type { ModelInfo } from './storage';

const API = 'https://openrouter.ai/api/v1';

/** App-attribution headers OpenRouter asks integrations to send. */
const attribution = () => ({
	'HTTP-Referer': location.origin,
	'X-Title': 'Learn React SaaS',
});

// OpenRouter's zero-cost auto-router. The default so a student with a fresh
// key can chat without spending credits; they can switch to any model in the
// full picker list. https://openrouter.ai/openrouter/free
export const DEFAULT_MODEL_ID = 'openrouter/free';

/** Models below this context length may not fit a long lesson's context. */
export const SMALL_CONTEXT_THRESHOLD = 131072;

export class OpenRouterError extends Error {
	status: number;
	constructor(status: number, message: string) {
		super(message);
		this.status = status;
	}
}

/** Human-readable message for the inline error bubble. */
export const describeError = (err: unknown): string => {
	if (err instanceof OpenRouterError) {
		if (err.status === 401) return 'OpenRouter rejected the API key. Check it in settings.';
		if (err.status === 402)
			return 'Your OpenRouter account is out of credits. Top up at openrouter.ai/credits or switch to a :free model in settings.';
		if (err.status === 429) return 'Rate limited by OpenRouter. Wait a moment and retry.';
		if (err.status === 400 && /context|token/i.test(err.message))
			return 'The lesson context overflowed this model’s context window. Pick a larger-context model in settings.';
		return `OpenRouter error (${err.status}): ${err.message}`;
	}
	if (err instanceof TypeError) return 'Network error reaching OpenRouter. Check your connection.';
	return err instanceof Error ? err.message : 'Something went wrong.';
};

const errorFromResponse = async (res: Response): Promise<OpenRouterError> => {
	let message = res.statusText;
	try {
		const body = await res.json();
		message = body?.error?.message ?? message;
	} catch {}
	return new OpenRouterError(res.status, message);
};

/** Lists models; tries unauthenticated first, retries with the key on 401. */
export const fetchModels = async (apiKey?: string): Promise<ModelInfo[]> => {
	let res = await fetch(`${API}/models`);
	if (!res.ok && apiKey) {
		res = await fetch(`${API}/models`, {
			headers: { Authorization: `Bearer ${apiKey}` },
		});
	}
	if (!res.ok) throw await errorFromResponse(res);
	const body = await res.json();
	return (body.data as ModelInfo[])
		.map((m) => ({
			id: m.id,
			name: m.name,
			context_length: m.context_length,
			pricing: { prompt: m.pricing?.prompt ?? '0', completion: m.pricing?.completion ?? '0' },
		}))
		.sort((a, b) => a.name.localeCompare(b.name));
};

/** Cheap key check against the key-info endpoint (no tokens spent). */
export const validateKey = async (apiKey: string): Promise<void> => {
	const res = await fetch(`${API}/auth/key`, {
		headers: { Authorization: `Bearer ${apiKey}` },
	});
	if (!res.ok) throw await errorFromResponse(res);
};

export type StreamRequest = {
	apiKey: string;
	model: string;
	messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
	signal: AbortSignal;
	/** Sampling temperature. Omitted from the request when undefined (the chat
	 * leaves it unset; exercise grading pins it low for deterministic output). */
	temperature?: number;
};

/** Streams completion deltas. Throws OpenRouterError on HTTP or mid-stream errors. */
export async function* streamChat({
	apiKey,
	model,
	messages,
	signal,
	temperature,
}: StreamRequest): AsyncGenerator<string> {
	const res = await fetch(`${API}/chat/completions`, {
		method: 'POST',
		signal,
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json',
			...attribution(),
		},
		body: JSON.stringify({
			model,
			messages,
			stream: true,
			...(temperature !== undefined ? { temperature } : {}),
		}),
	});
	if (!res.ok || !res.body) throw await errorFromResponse(res);

	const reader = res.body.getReader();
	const decoder = new TextDecoder();
	let buffer = '';
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		buffer += decoder.decode(value, { stream: true });
		const lines = buffer.split('\n');
		buffer = lines.pop() ?? '';
		for (const line of lines) {
			if (!line.startsWith('data: ')) continue; // skips ": OPENROUTER PROCESSING" comments
			const data = line.slice(6).trim();
			if (data === '[DONE]') return;
			let parsed: any;
			try {
				parsed = JSON.parse(data);
			} catch {
				continue;
			}
			if (parsed.error) {
				throw new OpenRouterError(parsed.error.code ?? 500, parsed.error.message ?? 'stream error');
			}
			const delta = parsed.choices?.[0]?.delta?.content;
			if (delta) yield delta;
		}
	}
}
