import React, { useState } from 'react';
import { useChatStore } from '../../store/chatStore';
import PatientForm from '../PatientForm';

export default function Sidebar({ isOpen, onToggle }) {
  const { newSession, messages, patientContext } = useChatStore();

  const hasDisease = Boolean(patientContext.disease?.trim());
  const hasName    = Boolean(patientContext.patientName?.trim());

  const statusDot = hasDisease && hasName ? 'ready' : hasDisease ? 'partial' : 'empty';
  const statusText =
    hasDisease && hasName
      ? `${patientContext.patientName} · ${patientContext.disease}`
      : hasDisease
      ? `${patientContext.disease} (no name)`
      : 'No patient context set';

  const msgCount = messages.filter((m) => m.role === 'user').length;

  return (
    <nav className={`sidebar${isOpen ? '' : ' collapsed'}`} aria-label="Sidebar">
      {/* ── Header ── */}
      <div className="sidebar-header">
        <div className="logo-mark">🧬</div>
        <div className="logo-info">
          <span className="logo-text">Curalink</span>
          <span className="logo-tagline">AI Research Assistant</span>
        </div>
      </div>

      <div className="sidebar-scroll">
        {/* ── Actions ── */}
        <div>
          <div className="sidebar-section-label">Session</div>
          <button
            id="new-chat-btn"
            className="new-chat-btn"
            onClick={newSession}
            title="Start a new research session"
          >
            <span>＋</span> New Session
          </button>

          {msgCount > 0 && (
            <div className="context-status" style={{ marginTop: 8 }}>
              <span>💬</span>
              <span>{msgCount} {msgCount === 1 ? 'query' : 'queries'} this session</span>
            </div>
          )}
        </div>

        {/* ── Status ── */}
        <div>
          <div className="sidebar-section-label">Context Status</div>
          <div className="context-status">
            <span className={`status-dot ${statusDot}`} />
            <span style={{ fontSize: 11, lineHeight: 1.4 }}>{statusText}</span>
          </div>
        </div>

        {/* ── Patient Form ── */}
        <div>
          <div className="sidebar-section-label">Patient Context</div>
          <PatientForm />
        </div>

        {/* ── Tips ── */}
        <div
          style={{
            padding: '10px 12px',
            background: 'rgba(0,212,170,0.04)',
            border: '1px solid rgba(0,212,170,0.12)',
            borderRadius: 10,
            fontSize: 11.5,
            color: 'var(--text-secondary)',
            lineHeight: 1.7,
          }}
        >
          <strong style={{ color: 'var(--accent)', display: 'block', marginBottom: 4 }}>
            💡 Tips
          </strong>
          Fill in <em>Disease</em> (required) before querying. Add name &amp; location for
          a personalised report. Follow-up queries include your previous context automatically.
        </div>
      </div>
    </nav>
  );
}
