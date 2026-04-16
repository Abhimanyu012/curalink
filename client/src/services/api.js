/**
 * Streams SSE events from POST /api/research using the Fetch ReadableStream API.
 * Works with Vite's proxy — no absolute URL needed.
 *
 * @param {Object} payload – { patientName, disease, query, location, history, sessionId }
 * @yields {{ type: string, payload: any }}
 */
export async function* streamResearch(payload) {
  const response = await fetch('/api/research', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Server returned ${response.status}: ${text || 'Unknown error'}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // SSE events are separated by double newlines
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? ''; // keep incomplete last line in buffer

    let eventType = null;
    let eventData = null;

    for (const line of lines) {
      if (line.startsWith('event: ')) {
        eventType = line.slice(7).trim();
      } else if (line.startsWith('data: ')) {
        eventData = line.slice(6).trim();
      } else if (line === '' && eventType && eventData !== null) {
        try {
          yield { type: eventType, payload: JSON.parse(eventData) };
        } catch {
          yield { type: eventType, payload: eventData };
        }
        eventType = null;
        eventData = null;
      }
    }
  }
}
