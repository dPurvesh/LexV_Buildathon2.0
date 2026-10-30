'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, ArrowUpRight, FolderGit2, ShieldCheck, Database, Calendar } from 'lucide-react';

type CaseInfo = {
  case_number: string;
  evidence_count: number;
  latest_upload: string;
  has_tampered: boolean;
  total_size: number;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' ? 'https://lexvault-backend.onrender.com' : 'http://localhost:8000');

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export default function CasePortfolio({
  onSelectCase,
}: {
  onSelectCase: (caseNumber: string) => void;
  onInspectEvidence?: (evidenceId: string) => void;
}) {
  const [cases, setCases] = useState<CaseInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/v1/stats/cases`)
      .then((r) => r.json())
      .then((data) => setCases(data.cases ?? []))
      .catch(() => setCases([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">CASE MANAGEMENT</span>
          <h2>Evidence portfolio by case</h2>
        </div>
        <span className="result-count">{cases.length} cases</span>
      </div>

      {loading ? (
        <div className="loading-state">Loading case portfolio…</div>
      ) : cases.length > 0 ? (
        <div className="case-grid">
          {cases.map((c) => (
            <div key={c.case_number} className="case-card" onClick={() => onSelectCase(c.case_number)} role="button" tabIndex={0}>
              <div className="case-card-header">
                <code className="case-id">{c.case_number}</code>
                {c.has_tampered ? (
                  <span className="tamper-badge tamper-alert">
                    <AlertTriangle size={11} style={{ display: 'inline', marginRight: 3 }} /> Tamper Alert
                  </span>
                ) : (
                  <span className="tamper-badge tamper-clean">
                    <ShieldCheck size={11} style={{ display: 'inline', marginRight: 3 }} /> Clean Ledger
                  </span>
                )}
              </div>
              <div className="case-card-body">
                <div className="case-stat">
                  <strong>{c.evidence_count}</strong>
                  <small>Evidence item{c.evidence_count !== 1 ? 's' : ''}</small>
                </div>
                <div className="case-stat">
                  <strong>{formatSize(c.total_size)}</strong>
                  <small>Total size</small>
                </div>
              </div>
              <div className="case-card-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <small style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={11} /> Latest: {new Date(c.latest_upload).toLocaleDateString()}
                </small>
                <button
                  type="button"
                  className="button button-secondary"
                  style={{ fontSize: '10.5px', padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectCase(c.case_number);
                  }}
                  title="Open in Evidence Vault"
                >
                  Vault <ArrowUpRight size={10} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state compact">
          <h3>No cases yet</h3>
          <p>Cases will appear here when you upload evidence.</p>
        </div>
      )}
    </section>
  );
}
