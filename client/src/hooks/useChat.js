import { useCallback } from 'react';
import { useChatStore } from '../store/chatStore';
import { streamResearch } from '../services/api';

/**
 * useChat – encapsulates the entire SSE streaming pipeline flow.
 * Reads from Zustand store and dispatches state updates as events arrive.
 */
export function useChat() {
  const {
    addMessage,
    updateProgress,
    setLoading,
    clearProgress,
    patientContext,
    sessionId,
  } = useChatStore();

  const sendQuery = useCallback(
    async (query) => {
      // Build history from last 3 turns (6 messages) for multi-turn context
      const allMessages = useChatStore.getState().messages;
      const history = allMessages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .slice(-6)
        .map((m) => ({
          role: m.role,
          // For assistant messages, summarise the conditionOverview to keep tokens low
          content:
            m.role === 'user'
              ? m.content
              : typeof m.content === 'object'
              ? (m.content.conditionOverview || '').slice(0, 300)
              : String(m.content).slice(0, 300),
        }));

      // Add user turn to UI immediately
      addMessage({ role: 'user', content: query, timestamp: Date.now() });
      setLoading(true);
      updateProgress({ step: 'starting', message: '🚀 Starting pipeline...' });

      try {
        const stream = streamResearch({
          ...patientContext,
          query,
          history,
          sessionId,
        });

        for await (const { type, payload } of stream) {
          switch (type) {
            case 'progress':
              updateProgress(payload);
              break;

            case 'result':
              addMessage({
                role: 'assistant',
                content: payload.data,
                sources: payload.topSources,
                expandedQuery: payload.expandedQuery,
                keywords: payload.keywords,
                timestamp: Date.now(),
              });
              clearProgress();
              break;

            case 'error':
              addMessage({
                role: 'error',
                content: payload.error || 'An error occurred in the pipeline.',
                timestamp: Date.now(),
              });
              clearProgress();
              break;

            case 'done':
              break;

            default:
              break;
          }
        }
      } catch (err) {
        addMessage({
          role: 'error',
          content: err.message || 'A network error occurred. Is the server running?',
          timestamp: Date.now(),
        });
        clearProgress();
      } finally {
        setLoading(false);
      }
    },
    [patientContext, sessionId, addMessage, updateProgress, setLoading, clearProgress]
  );

  return { sendQuery };
}
