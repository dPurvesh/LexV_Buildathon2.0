'use client';

import { useEffect, useState } from 'react';

type CaseInfo = {
  case_number: string;
  evidence_count: number;
  latest_upload: string;
  has_tampered: boolean;
  total_size: number;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export default function CasePortfolio({ onSelectCase }: { onSelectCase: (caseNumber: string) => void }) {
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
            <button key={c.case_number} className="case-card" onClick={() => onSelectCase(c.case_number)}>
              <div className="case-card-header">
                <code className="case-id">{c.case_number}</code>
                {c.has_tampered && <span className="tamper-badge tamper-alert">⚠</span>}
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
              <div className="case-card-footer">
                <small>Latest: {new Date(c.latest_upload).toLocaleDateString()}</small>
              </div>
            </button>
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
