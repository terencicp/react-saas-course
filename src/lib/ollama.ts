export const ENDPOINT = 'http://localhost:11434';
export const MODEL = 'qwen3.5:9b';

export async function* streamPrompt(prompt: string): AsyncGenerator<string, void, void> {
  const res = await fetch(`${ENDPOINT}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      stream: true,
      think: false,
    }),
  });
  if (!res.ok || !res.body) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status} ${res.statusText}\n${body}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let nl: number;
    while ((nl = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;
      let chunk: { message?: { content?: string }; done?: boolean };
      try { chunk = JSON.parse(line); } catch { continue; }
      const piece = chunk?.message?.content;
      if (piece) yield piece;
      if (chunk?.done) return;
    }
  }
}
