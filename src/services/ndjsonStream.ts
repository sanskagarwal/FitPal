// Reusable reader for newline-delimited JSON (NDJSON) streams.
//
// The server emits one JSON object per line as `{ "t": <type>, "v": <value> }`.
// This helper buffers the response body, splits it on newlines, parses each
// complete line, and hands the decoded event to `onEvent`. Partial/garbled
// lines are skipped. The caller decides what each event type means.

export interface NdjsonEvent {
  t: string;
  v: unknown;
}

export async function readNdjsonStream(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: NdjsonEvent) => void
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const handleLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    let event: NdjsonEvent;
    try {
      event = JSON.parse(trimmed);
    } catch {
      return; // ignore partial/garbled lines
    }
    onEvent(event);
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let newlineIndex: number;
    while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 1);
      handleLine(line);
    }
  }
  if (buffer.trim()) handleLine(buffer);
}
