import React, { useState } from 'react';

/**
 * SourceCard – displays a single source attribution entry.
 * Clicking expands the snippet.
 */
export default function SourceCard({ source }) {
  const [expanded, setExpanded] = useState(false);

  const {
    title = 'Untitled',
    authors,
    year,
    platform = 'Unknown',
    url,
    snippet,
  } = source;

  const displayAuthors =
    authors && authors !== 'Unknown' ? authors.slice(0, 60) + (authors.length > 60 ? '…' : '') : null;

  return (
    <div
      className={`src-card${expanded ? ' expanded' : ''}`}
      onClick={() => setExpanded((e) => !e)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && setExpanded((v) => !v)}
      aria-expanded={expanded}
    >
      <div className="src-card-top">
        <span className={`platform-pill ${platform}`}>{platform}</span>
        <div className="src-title">
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              title={title}
            >
              {title}
            </a>
          ) : (
            title
          )}
        </div>
      </div>

      <div className="src-meta">
        {displayAuthors && <span>{displayAuthors}</span>}
        {year && <span className="src-year">{year}</span>}
      </div>

      {snippet && (
        <div className="src-snippet">{snippet}</div>
      )}

      {snippet && (
        <div className="src-expand-hint">{expanded ? '▲ collapse' : '▼ show excerpt'}</div>
      )}
    </div>
  );
}
