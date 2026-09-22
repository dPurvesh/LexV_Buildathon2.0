'use client';

import { useEffect, useState } from 'react';
import CustodyTimeline from '../components/CustodyTimeline';
import SemanticSearch from '../components/SemanticSearch';
import VerificationDropzone from '../components/VerificationDropzone';
import EvidenceTable from '../components/EvidenceTable';
import EvidenceInspector from '../components/EvidenceInspector';
import BatchUpload from '../components/BatchUpload';
import CasePortfolio from '../components/CasePortfolio';
import RoleBadge from '../components/RoleBadge';
import { useRole } from '../context/RoleContext';

type Tab = 'repository' | 'cases' | 'upload' | 'verify' | 'health';
type DashboardStats = {
  total_evidence: number;
  active_cases: number;
  total_storage_bytes: number;
  pending_ai: number;
  tamper_alerts: number;
  total_transfers: number;
};
type Health = {
  connected?: boolean;
  chain_id?: number;
  latest_block?: number;
  error?: string;
};
type SelectedEvidence = {
  evidence_id?: string;
  sha256_hash: string;
  title?: string;
  custody_history?: Array<{
    from_custodian: string;
    to_custodian: string;
    action_type: string;
    notes?: string;
    eth_tx_hash?: string;
    timestamp: string;
  }>;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

function formatStorage(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function Home() {
  const { currentRole, roleInfo, hasPermission, openLockModal } = useRole();
  const [tab, setTab] = useState<Tab>('repository');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [selected, setSelected] = useState<SelectedEvidence | null>(null);
  const [inspectorId, setInspectorId] = useState<string | null>(null);
  const [caseFilter, setCaseFilter] = useState('');

  // Fetch dashboard stats (refresh every 30s)
  useEffect(() => {
    const refresh = () =>
      fetch(`${API_BASE}/api/v1/stats/dashboard`)
        .then((r) => r.json())
        .then(setStats)
        .catch(() => {});
    refresh();
    const timer = setInterval(refresh, 30000);
    return () => clearInterval(timer);
  }, []);

  // Fetch blockchain health (refresh every 15s)
  useEffect(() => {
    const refresh = () =>
      fetch(`${API_BASE}/api/v1/blockchain/status`)
        .then((r) => r.json())
        .then(setHealth)
        .catch(() => setHealth({ error: 'Ledger status unavailable' }));
    refresh();
    const timer = setInterval(refresh, 15000);
    return () => clearInterval(timer);
  }, []);

  const tabs: Array<[Tab, string, string]> = [
    ['repository', 'Repository', 'Search & inspect'],
    ['cases', 'Cases', 'Portfolio view'],
    ['upload', 'Upload', 'Batch preserve'],
    ['verify', 'Verify', 'Integrity check'],
    ['health', 'Health', 'Services & chain'],
  ];

  return (
    <main className="app-shell">
      {/* ─── Top bar ─── */}
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark">LE</div>
          <div>
            <strong>LEXVAULT</strong>
            <span>Evidence intelligence platform</span>
          </div>
        </div>
        <div className="topbar-right">
          <span className="live-dot" /> Local vault online
          <RoleBadge />
        </div>
      </header>

      {/* ─── Hero with KPI stats ─── */}
      <section className="hero">
        <div>
          <span className="eyebrow">DIGITAL EVIDENCE / CONTROL ROOM</span>
          <h1>Proof, preserved.</h1>
          <p>One place to register, verify, search, and transfer custody of every critical file.</p>
        </div>
        <div className="kpi-grid">
          <div className="kpi-card">
            <span className="kpi-icon">📦</span>
            <div>
              <strong className="kpi-value">{stats?.total_evidence ?? '—'}</strong>
              <small className="kpi-label">Evidence Items</small>
            </div>
          </div>
          <div className="kpi-card">
            <span className="kpi-icon">📁</span>
            <div>
              <strong className="kpi-value">{stats?.active_cases ?? '—'}</strong>
              <small className="kpi-label">Active Cases</small>
            </div>
          </div>
          <div className="kpi-card">
            <span className="kpi-icon">💾</span>
            <div>
              <strong className="kpi-value">{stats ? formatStorage(stats.total_storage_bytes) : '—'}</strong>
              <small className="kpi-label">Storage Used</small>
            </div>
          </div>
          <div className={`kpi-card ${stats?.tamper_alerts ? 'kpi-alert' : ''}`}>
            <span className="kpi-icon">🛡</span>
            <div>
              <strong className="kpi-value">{stats?.tamper_alerts ?? '—'}</strong>
              <small className="kpi-label">Tamper Alerts</small>
            </div>
          </div>
          <div className="kpi-card">
            <span className="kpi-icon">🤖</span>
            <div>
              <strong className="kpi-value">{stats?.pending_ai ?? '—'}</strong>
              <small className="kpi-label">Pending AI</small>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Tab navigation ─── */}
      <nav className="tabbar" aria-label="Dashboard sections">
        {tabs.map(([id, label, hint]) => {
          const isTabLocked = id === 'upload' && !hasPermission('upload');
          return (
            <button
              key={id}
              className={`${tab === id ? 'tab active' : 'tab'} ${isTabLocked ? 'tab-locked' : ''}`}
              onClick={() => setTab(id)}
            >
              <span>
                {label} {isTabLocked && <small className="tab-lock-badge">🔒</small>}
              </span>
              <small>{isTabLocked ? 'Restricted (Investigator)' : hint}</small>
            </button>
          );
        })}
      </nav>

      {/* ─── Content area ─── */}
      <div className="content-area">
        {/* Repository tab */}
        {tab === 'repository' && (
          <>
            <SemanticSearch
              onSelect={(result: { id: string; title: string; sha256_hash?: string; [key: string]: any }) => {
                if (!result.sha256_hash) return;
                fetch(`${API_BASE}/api/v1/evidence/verify`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ sha256_hash: result.sha256_hash }),
                })
                  .then((r) => r.json())
                  .then((payload) =>
                    setSelected({
                      ...payload,
                      title: result.title,
                      evidence_id: result.id,
                      sha256_hash: result.sha256_hash,
                    }),
                  );
              }}
            />
            <EvidenceTable onInspect={(id) => setInspectorId(id)} caseFilter={caseFilter} />
            <CustodyTimeline
              evidence={selected}
              onTransferred={(payload: any) =>
                setSelected((current) =>
                  current
                    ? {
                        ...current,
                        custody_history: [
                          ...(current.custody_history ?? []),
                          {
                            from_custodian: String(payload.from_custodian ?? ''),
                            to_custodian: String(payload.to_custodian ?? ''),
                            action_type: 'CUSTODY_TRANSFER',
                            eth_tx_hash: String(payload.tx_hash ?? ''),
                            timestamp: new Date().toISOString(),
                          },
                        ],
                      }
                    : current,
                )
              }
            />
          </>
        )}

        {/* Cases tab */}
        {tab === 'cases' && (
          <CasePortfolio
            onSelectCase={(cn) => {
              setCaseFilter(cn);
              setTab('repository');
            }}
          />
        )}

        {/* Upload tab */}
        {tab === 'upload' &&
          (hasPermission('upload') ? (
            <BatchUpload />
          ) : (
            <section className="panel locked-tab-panel">
              <div className="locked-tab-content">
                <div className="locked-tab-icon">🔒</div>
                <span className="eyebrow" style={{ color: '#6366f1' }}>
                  RESTRICTED JURISDICTION
                </span>
                <h2>Evidence Ingestion Locked</h2>
                <p>
                  Direct evidence registration, batch ingestion, and cryptographic sealing are restricted exclusively to
                  authorized <strong>Law Enforcement Investigators</strong> to preserve Section 65B statutory
                  chain-of-custody.
                </p>
                <div className="locked-tab-badges">
                  <span className="pill-badge required">Required Clearance: 🛡️ Investigator</span>
                  <span className="pill-badge current">Your Active Role: {roleInfo.badge}</span>
                </div>
                <button
                  type="button"
                  className="button button-primary locked-tab-unlock-btn"
                  onClick={() => openLockModal('Evidence Ingestion & Batch Upload', 'investigator')}
                >
                  🔑 Authenticate as Investigator
                </button>
              </div>
            </section>
          ))}

        {/* Verify tab */}
        {tab === 'verify' && <VerificationDropzone />}

        {/* Health tab */}
        {tab === 'health' && (
          <section className="panel health-panel">
            <div className="section-heading">
              <div>
                <span className="eyebrow">SYSTEM &amp; LEDGER HEALTH</span>
                <h2>Trust infrastructure status</h2>
              </div>
              <button
                className="button button-secondary"
                onClick={() => {
                  setHealth(null);
                  fetch(`${API_BASE}/api/v1/blockchain/status`)
                    .then((r) => r.json())
                    .then(setHealth);
                }}
              >
                Refresh status
              </button>
            </div>
            {health ? (
              <div className="health-grid">
                <div className={health.connected ? 'health-card health-good' : 'health-card health-warn'}>
                  <span className="health-icon">{health.connected ? '✓' : '!'}</span>
                  <div>
                    <strong>{health.connected ? 'Blockchain connected' : 'Mock ledger active'}</strong>
                    <span>{health.error ?? 'Local mode is ready for evidence anchoring.'}</span>
                  </div>
                </div>
                <div className="health-card">
                  <span className="health-icon">◫</span>
                  <div>
                    <strong>{health.chain_id ? `Chain ${health.chain_id}` : 'Development network'}</strong>
                    <span>Latest block: {health.latest_block ?? 'simulated'}</span>
                  </div>
                </div>
                <div className="health-card">
                  <span className="health-icon">◉</span>
                  <div>
                    <strong>PostgreSQL + pgvector</strong>
                    <span>Semantic index available through API</span>
                  </div>
                </div>
                <div className="health-card">
                  <span className="health-icon">▣</span>
                  <div>
                    <strong>MinIO WORM vault</strong>
                    <span>evidence-vault / COMPLIANCE retention</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="loading-state">Reading infrastructure status…</div>
            )}
          </section>
        )}
      </div>

      {/* ─── Inspector drawer (overlays on top) ─── */}
      {inspectorId && <EvidenceInspector evidenceId={inspectorId} onClose={() => setInspectorId(null)} />}

      {/* ─── Footer ─── */}
      <footer>
        <span>LEXVAULT / INTERNAL OPERATIONS</span>
        <span>Evidence state is append-only</span>
      </footer>
    </main>
  );
}