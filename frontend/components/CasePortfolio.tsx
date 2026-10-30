'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { AlertTriangle, MapPin, LayoutGrid, Layers, ArrowUpRight } from 'lucide-react';

const CrimeSceneMap = dynamic(() => import('./CrimeSceneMap'), {
  ssr: false,
  loading: () => (
    <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)' }}>
      <span className="live-beacon-dot" style={{ display: 'inline-block', marginRight: '8px' }} />
      Loading Mil-Spec Crime Scene Geolocation Radar…
    </div>
  ),
});

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

export default function CasePortfolio({
  onSelectCase,
  onInspectEvidence,
}: {
  onSelectCase: (caseNumber: string) => void;
  onInspectEvidence?: (evidenceId: string) => void;
}) {
  const [cases, setCases] = useState<CaseInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCaseForMap, setSelectedCaseForMap] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'both' | 'grid' | 'map'>('both');

  useEffect(() => {
    fetch(`${API_BASE}/api/v1/stats/cases`)
      .then((r) => r.json())
      .then((data) => setCases(data.cases ?? []))
      .catch(() => setCases([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* ─── Case Portfolio Summary Panel ─── */}
      <section className="panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">CASE INTELLIGENCE &amp; GEOLOCATION</span>
            <h2>Evidence Portfolio &amp; Crime Scene Radar</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="result-count">{cases.length} active cases</span>
            {/* View Mode Toggle */}
            <div className="view-mode-toggle" style={{ display: 'flex', background: 'var(--bg-card)', padding: '3px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <button
                type="button"
                className={`button button-ghost ${viewMode === 'both' ? 'active' : ''}`}
                style={{ padding: '4px 10px', fontSize: '11.5px', borderRadius: '4px' }}
                onClick={() => setViewMode('both')}
                title="Split View (Cases & Map)"
              >
                <Layers size={13} style={{ marginRight: 4 }} /> Combined View
              </button>
              <button
                type="button"
                className={`button button-ghost ${viewMode === 'grid' ? 'active' : ''}`}
                style={{ padding: '4px 10px', fontSize: '11.5px', borderRadius: '4px' }}
                onClick={() => setViewMode('grid')}
                title="Case Cards Grid"
              >
                <LayoutGrid size={13} style={{ marginRight: 4 }} /> Cards Only
              </button>
              <button
                type="button"
                className={`button button-ghost ${viewMode === 'map' ? 'active' : ''}`}
                style={{ padding: '4px 10px', fontSize: '11.5px', borderRadius: '4px' }}
                onClick={() => setViewMode('map')}
                title="Crime Scene Radar Map"
              >
                <MapPin size={13} style={{ marginRight: 4 }} /> Full Map
              </button>
            </div>
          </div>
        </div>

        {/* Case Cards Grid */}
        {(viewMode === 'both' || viewMode === 'grid') && (
          loading ? (
            <div className="loading-state">Loading case portfolio…</div>
          ) : cases.length > 0 ? (
            <div className="case-grid">
              {cases.map((c) => {
                const isSelectedOnMap = selectedCaseForMap === c.case_number;
                return (
                  <div key={c.case_number} className={`case-card ${isSelectedOnMap ? 'case-card-focused' : ''}`}>
                    <div className="case-card-header">
                      <code className="case-id">{c.case_number}</code>
                      {c.has_tampered && (
                        <span className="tamper-badge tamper-alert">
                          <AlertTriangle size={11} style={{ display: 'inline', marginRight: 3 }} /> Tamper Alert
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
                      <small>Latest: {new Date(c.latest_upload).toLocaleDateString()}</small>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          className="button button-ghost"
                          style={{ fontSize: '10.5px', padding: '2px 8px', color: 'var(--cyan)' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCaseForMap(c.case_number);
                            if (viewMode === 'grid') setViewMode('both');
                          }}
                          title="Focus Crime Scene Map on this Case"
                        >
                          <MapPin size={11} style={{ marginRight: 2 }} /> Pinpoint
                        </button>
                        <button
                          type="button"
                          className="button button-secondary"
                          style={{ fontSize: '10.5px', padding: '2px 8px' }}
                          onClick={() => onSelectCase(c.case_number)}
                          title="Open in Evidence Vault"
                        >
                          Vault <ArrowUpRight size={10} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state compact">
              <h3>No cases yet</h3>
              <p>Cases will appear here when you upload evidence.</p>
            </div>
          )
        )}
      </section>

      {/* ─── Crime Scene Geolocation Radar Map ─── */}
      {(viewMode === 'both' || viewMode === 'map') && (
        <section className="panel" style={{ padding: '0', overflow: 'hidden' }}>
          <CrimeSceneMap
            selectedCase={selectedCaseForMap}
            onSelectEvidence={onInspectEvidence}
          />
        </section>
      )}
    </div>
  );
}
