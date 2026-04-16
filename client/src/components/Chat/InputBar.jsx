import React, { useState, useRef, useEffect } from 'react';
import { useChatStore } from '../../store/chatStore';
import { useChat } from '../../hooks/useChat';
import toast from 'react-hot-toast';

export default function InputBar() {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);
  const { isLoading, patientContext } = useChatStore();
  const { sendQuery } = useChat();

  const canSend = text.trim().length > 0 && !isLoading;

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 130)}px`;
  }, [text]);

  // Listen for suggestion chip clicks
  useEffect(() => {
    const handler = (e) => {
      setText(e.detail);
      textareaRef.current?.focus();
    };
    window.addEventListener('curalink:suggest', handler);
    return () => window.removeEventListener('curalink:suggest', handler);
  }, []);

  const submit = () => {
    const query = text.trim();
    if (!query) return;

    if (!patientContext.disease?.trim()) {
      toast.error('Please enter a Disease / Condition in the sidebar first.', {
        icon: '⚠️',
        duration: 3500,
      });
      return;
    }

    setText('');
    sendQuery(query);
  };

  const handleKeyDown = (e) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="input-bar-area">
      <div className={`input-bar${isLoading ? ' disabled' : ''}`}>
        <textarea
          id="query-input"
          ref={textareaRef}
          className="input-ta"
          rows={1}
          placeholder={
            isLoading
              ? 'Analysing… please wait'
              : 'Ask about treatments, trials, or research…'
          }
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          aria-label="Research query"
        />
        <button
          id="send-btn"
          className="send-btn"
          onClick={submit}
          disabled={!canSend}
          aria-label="Send query"
          title="Send (Enter)"
        >
          {isLoading ? '⏳' : '↑'}
        </button>
      </div>
      <p className="input-hint">
        Press <kbd>Enter</kbd> to send · <kbd>Shift+Enter</kbd> for newline
      </p>
    </div>
  );
}
