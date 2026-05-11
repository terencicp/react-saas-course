export const ENDPOINT = 'http://localhost:11434';
export const MODEL = 'qwen3.5:9b';

export class OllamaError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'OllamaError';
  }
}

export type OllamaOptions = { temperature?: number };

async function chat(
  prompt: string,
  stream: boolean,
  options?: OllamaOptions,
): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(`${ENDPOINT}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        stream,
        think: false,
        ...(options ? { options } : {}),
      }),
    });
  } catch (cause) {
    throw new OllamaError(
      `Could not reach Ollama at ${ENDPOINT}. ` +
        `Make sure it's running, qwen3.5:9b is installed, and ` +
        `the request is not blocked by CORS.`,
      { cause },
    );
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    if (res.status === 404 && /model .* not found/i.test(body)) {
      throw new OllamaError(
        `Model \`${MODEL}\` is not available on the Ollama server. ` +
          `Pull it first with \`ollama pull ${MODEL}\`.`,
      );
    }
    throw new OllamaError(
      `Ollama returned ${res.status} ${res.statusText}.` + (body ? `\n${body}` : ''),
    );
  }

  if (!res.body) {
    throw new OllamaError('Ollama returned an empty response body.');
  }
  return res;
}

export async function* streamPrompt(
  prompt: string,
  options?: OllamaOptions,
): AsyncGenerator<string, void, void> {
  const res = await chat(prompt, true, options);
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let nl: number;
      while ((nl = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line) continue;
        let chunk: { message?: { content?: string }; done?: boolean; error?: string };
        try { chunk = JSON.parse(line); } catch { continue; }
        if (chunk?.error) {
          throw new OllamaError(`Ollama error: ${chunk.error}`);
        }
        const piece = chunk?.message?.content;
        if (piece) yield piece;
        if (chunk?.done) return;
      }
    }
  } catch (cause) {
    if (cause instanceof OllamaError) throw cause;
    throw new OllamaError(
      `The connection to Ollama was interrupted while streaming the response.`,
      { cause },
    );
  }
}

// Lightweight health probe — used by UI to decide whether features that
// depend on the local model should be offered at all. Resolves true if the
// Ollama server responds, false on any network / non-2xx error. Never throws.
export async function pingOllama(): Promise<boolean> {
  try {
    const res = await fetch(`${ENDPOINT}/api/tags`);
    return res.ok;
  } catch {
    return false;
  }
}

export async function runPrompt(prompt: string, options?: OllamaOptions): Promise<string> {
  const res = await chat(prompt, false, options);
  let body: { message?: { content?: string }; error?: string };
  try {
    body = await res.json();
  } catch (cause) {
    throw new OllamaError('Ollama returned a malformed JSON response.', { cause });
  }
  if (body?.error) {
    throw new OllamaError(`Ollama error: ${body.error}`);
  }
  return body?.message?.content ?? '';
}
