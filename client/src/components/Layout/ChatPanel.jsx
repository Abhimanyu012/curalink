import React, { useEffect, useRef } from 'react';
import { useChatStore } from '../../store/chatStore';
import MessageBubble from '../Chat/MessageBubble';
import InputBar from '../Chat/InputBar';

const SUGGESTIONS = [
  'Latest GLP-1 treatments for Type 2 Diabetes',
  'Immunotherapy options for Non-Small Cell Lung Cancer',
  'BRCA mutation clinical trials',
  'mRNA vaccine research for cancer',
];

export default function ChatPanel({ onToggleSidebar }) {
  const { messages, progress, isLoading, patientContext } = useChatStore();
  const bottomRef = useRef(null);

  // Auto-scroll to new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, progress]);

  const disease = patientContext.disease?.trim();

  return (
    <main className="chat-panel">
      {/* ── Top Bar ── */}
      <div className="chat-topbar">
        <button
          id="toggle-sidebar-btn"
          className="topbar-toggle"
          onClick={onToggleSidebar}
          title="Toggle sidebar"
          aria-label="Toggle sidebar"
        >
          ☰
        </button>

        <div className="topbar-info">
          <span className="topbar-title">
            {disease ? `Research: ${disease}` : 'Curalink Research'}
          </span>
          <span className="topbar-sub">
            ClinicalTrials · PubMed · OpenAlex · HuggingFace LLM
          </span>
        </div>

        <div className="topbar-badge">AI Pipeline</div>
      </div>

      {/* ── Messages ── */}
      <div className="chat-messages" role="log" aria-live="polite">
        {messages.length === 0 ? (
          <EmptyState suggestions={SUGGESTIONS} />
        ) : (
          messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
        )}

        {/* Progress indicator while streaming */}
        {progress && (
          <div className="progress-wrap">
            <div className="progress-spinner" />
            <span className="progress-text">{progress.message}</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input ── */}
      <InputBar />
    </main>
  );
}

function EmptyState({ suggestions }) {
  const { patientContext } = useChatStore();
  const name = patientContext.patientName?.trim();

  return (
    <div className="empty-state">
      <div className="empty-icon">🔬</div>
      <h1 style={{ fontSize: 21, fontWeight: 700, letterSpacing: '-0.3px' }}>
        {name ? `Welcome, ${name}` : 'Medical Research AI'}
      </h1>
      <p>
        Ask about treatments, clinical trials, and the latest research. Fill in your
        patient context in the sidebar for a personalised report.
      </p>
      <div className="suggestion-chips">
        {suggestions.map((s) => (
          <SuggestionChip key={s} text={s} />
        ))}
      </div>
    </div>
  );
}

function SuggestionChip({ text }) {
  // Import here to avoid circular dep — useChat is used only on click
  const { patientContext } = useChatStore();

  const handleClick = () => {
    // Dispatch a custom event that InputBar / useChat can pick up
    window.dispatchEvent(new CustomEvent('curalink:suggest', { detail: text }));
  };

  return (
    <button className="chip" onClick={handleClick} type="button">
      {text}
    </button>
  );
}
