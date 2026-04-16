import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import SourceCard from './SourceCard';

/**
 * MessageBubble – renders a single chat turn.
 *
 * Roles:
 *  - 'user'      → right-aligned gradient bubble
 *  - 'assistant' → full-width structured report sections
 *  - 'error'     → red-tinted error box
 */
export default function MessageBubble({ message }) {
  const { role, content, sources, timestamp } = message;
  const time = timestamp ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

  if (role === 'user') {
    return (
      <div className="msg-wrapper user">
        <div className="msg-bubble user">{content}</div>
        {time && <span className="msg-time">{time}</span>}
      </div>
    );
  }

  if (role === 'error') {
    return (
      <div className="msg-wrapper error">
        <div className="msg-bubble error">
          ⚠️ {content}
        </div>
      </div>
    );
  }

  // ── Structured assistant response ─────────────────────────────────────────
  if (role === 'assistant' && typeof content === 'object' && content !== null) {
    return (
      <div className="msg-wrapper assistant">
        <StructuredResponse data={content} sources={sources} />
        {time && <span className="msg-time">{time}</span>}
      </div>
    );
  }

  // Fallback for plain string assistant messages
  return (
    <div className="msg-wrapper assistant">
      <div style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.7, maxWidth: 820 }}>
        <ReactMarkdown remarkPlugins={[remarkGfm]} className="md">
          {String(content)}
        </ReactMarkdown>
      </div>
      {time && <span className="msg-time">{time}</span>}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function StructuredResponse({ data, sources }) {
  const {
    conditionOverview,
    researchInsights = [],
    clinicalTrials = [],
    sourceAttribution = [],
  } = data;

  // Prefer sourceAttribution from the LLM; fall back to raw topSources
  const sourceList = sourceAttribution.length > 0 ? sourceAttribution : (sources || []);

  return (
    <div className="structured-response">
      {/* ── Condition Overview ── */}
      {conditionOverview && (
        <section className="resp-section">
          <div className="resp-section-head">
            <span className="sec-icon overview">🩺</span>
            <span className="sec-title">Condition Overview</span>
          </div>
          <div className="resp-section-body">
            <div className="overview-text md">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {conditionOverview}
              </ReactMarkdown>
            </div>
          </div>
        </section>
      )}

      {/* ── Research Insights ── */}
      {researchInsights.length > 0 && (
        <section className="resp-section">
          <div className="resp-section-head">
            <span className="sec-icon insights">📚</span>
            <span className="sec-title">Research Insights</span>
            <span className="sec-badge">{researchInsights.length} findings</span>
          </div>
          <div className="resp-section-body">
            <div className="insights-list">
              {researchInsights.map((item, i) => (
                <div key={i} className="insight-item">
                  <span className="insight-dot" />
                  <div className="insight-body">
                    <p className="insight-finding">{item.finding}</p>
                    {item.source && (
                      <p className="insight-source">— {item.source}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Clinical Trials ── */}
      {clinicalTrials.length > 0 && (
        <section className="resp-section">
          <div className="resp-section-head">
            <span className="sec-icon trials">🧪</span>
            <span className="sec-title">Clinical Trials</span>
            <span className="sec-badge">{clinicalTrials.length} trials</span>
          </div>
          <div className="resp-section-body">
            <div className="trials-list">
              {clinicalTrials.map((trial, i) => {
                const statusClass = trial.status?.toLowerCase().includes('recruit')
                  ? 'recruiting'
                  : '';
                return (
                  <div key={i} className="trial-card">
                    <div className="trial-name">
                      {trial.url ? (
                        <a href={trial.url} target="_blank" rel="noopener noreferrer">
                          {trial.title}
                        </a>
                      ) : (
                        trial.title
                      )}
                    </div>
                    <div className="trial-meta">
                      {trial.phase && trial.phase !== 'N/A' && (
                        <span className="t-badge phase">{trial.phase}</span>
                      )}
                      {trial.status && (
                        <span className={`t-badge status ${statusClass}`}>
                          {trial.status}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Source Attribution ── */}
      {sourceList.length > 0 && (
        <section className="resp-section">
          <div className="resp-section-head">
            <span className="sec-icon sources">🔗</span>
            <span className="sec-title">Source Attribution</span>
            <span className="sec-badge">{sourceList.length} sources</span>
          </div>
          <div className="resp-section-body">
            <div className="sources-grid">
              {sourceList.map((src, i) => (
                <SourceCard key={src.url || i} source={src} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
