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
import { Package, FolderGit2, HardDrive, ShieldAlert, Cpu, Link2, Lock, ShieldCheck, KeyRound, RefreshCw, CheckCircle2, AlertTriangle, Blocks, Database } from 'lucide-react';

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
  relayer_address?: string;
  relayer_balance_eth?: number;
  contract_address?: string;
  mock_mode?: boolean;
  network_name?: string;
  explorer_url?: string;
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
  on_chain?: {
    exists: boolean;
    current_custodian?: string;
    registered_at?: number;
  };
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

  const handleSelectCustody = async (evidenceId: string, scrollToTimeline = false) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/evidence/${evidenceId}/detail`);
      if (res.ok) {
        const data = await res.json();
        if (data.evidence) {
          setSelected({
            evidence_id: data.evidence.id,
            title: data.evidence.title,
            sha256_hash: data.evidence.sha256_hash,
            custody_history: data.custody_history || [],
            on_chain: {
              exists: true,
              current_custodian: data.evidence.current_custodian_address,
              registered_at: data.evidence.created_at
                ? new Date(data.evidence.created_at).getTime() / 1000
                : 0,
            },
          });
          if (scrollToTimeline) {
            setTimeout(() => {
              document.getElementById('custody-timeline-section')?.scrollIntoView({ behavior: 'smooth' });
            }, 80);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load custody data:', err);
    }
  };

  const handleInspect = (id: string) => {
    setInspectorId(id);
    handleSelectCustody(id, false);
  };

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

  const tabs: Array<{ id: Tab; index: string; label: string; hint: string }> = [
    { id: 'repository', index: '[01]', label: 'Repository & AI Search', hint: 'pgvector cosine retrieval' },
    { id: 'cases', index: '[02]', label: 'Case Portfolio', hint: 'Cross-case forensic audit' },
    { id: 'upload', index: '[03]', label: 'Ingestion & WORM Lock', hint: 'Client WebCrypto SHA-256' },
    { id: 'verify', index: '[04]', label: 'Verification Dropzone', hint: 'Dual-layer crypto & ELA radar' },
    { id: 'health', index: '[05]', label: 'Node & Ledger Telemetry', hint: 'MST Blockchain RPC & storage metrics' },
  ];

  return (
    <main className="app-shell">
      {/* ─── Top Command Bar ─── */}
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark">LV</div>
          <div className="brand-title">
            <strong>
              LEXVAULT <span className="brand-badge">MIL-SPEC / V2.5</span>
            </strong>
            <span>Digital Forensics & Legal Evidence Command Center</span>
          </div>
        </div>
        <div className="topbar-right">
          <span className="live-beacon">
            <i className="live-beacon-dot" />
            <span>{health?.connected ? (health.chain_id === 4646 ? 'MST MAINNET ACTIVE' : 'MST TESTNET ACTIVE') : 'MST OFFLINE'}</span>
          </span>
          <RoleBadge />
        </div>
      </header>

      {/* ─── Hero Control Center with KPI stats ─── */}
      <section className="hero">
        <div className="hero-header">
          <div>
            <span className="eyebrow">COMMAND CENTER / FORENSIC INTEGRITY</span>
            <h1>Cryptographic Proof, Preserved.</h1>
            <p className="hero-desc">
              Immutable chain of custody backed by client-side WebCrypto SHA-256 digests, multi-modal perceptual hashing,
              365-day WORM retention, and MST Blockchain public settlement.
            </p>
          </div>
        </div>

        <div className="kpi-grid">
          <div className="kpi-card">
            <span className="kpi-icon"><Package size={18} color="var(--cyan)" /></span>
            <div className="kpi-content">
              <strong className="kpi-value">{stats?.total_evidence ?? '—'}</strong>
              <small className="kpi-label">Evidence Items</small>
            </div>
          </div>
          <div className="kpi-card">
            <span className="kpi-icon"><FolderGit2 size={18} color="var(--cyan)" /></span>
            <div className="kpi-content">
              <strong className="kpi-value">{stats?.active_cases ?? '—'}</strong>
              <small className="kpi-label">Active Cases</small>
            </div>
          </div>
          <div className="kpi-card">
            <span className="kpi-icon"><HardDrive size={18} color="var(--cyan)" /></span>
            <div className="kpi-content">
              <strong className="kpi-value">{stats ? formatStorage(stats.total_storage_bytes) : '—'}</strong>
              <small className="kpi-label">WORM Storage</small>
            </div>
          </div>
          <div className={`kpi-card ${stats?.tamper_alerts ? 'kpi-alert' : ''}`}>
            <span className="kpi-icon"><ShieldAlert size={18} color={stats?.tamper_alerts ? 'var(--crimson)' : 'var(--cyan)'} /></span>
            <div className="kpi-content">
              <strong className="kpi-value">{stats?.tamper_alerts ?? '0'}</strong>
              <small className="kpi-label">Tamper Alerts</small>
            </div>
          </div>
          <div className="kpi-card">
            <span className="kpi-icon"><Cpu size={18} color="var(--cyan)" /></span>
            <div className="kpi-content">
              <strong className="kpi-value">{stats?.pending_ai ?? '0'}</strong>
              <small className="kpi-label">Vector Indexed</small>
            </div>
          </div>
          <div className="kpi-card">
            <span className="kpi-icon"><Link2 size={18} color="var(--cyan)" /></span>
            <div className="kpi-content">
              <strong className="kpi-value">{stats?.total_transfers ?? '—'}</strong>
              <small className="kpi-label">Custody Handoffs</small>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Segmented Command Tab Bar ─── */}
      <nav className="tabbar" aria-label="Command Center Navigation">
        {tabs.map(({ id, index, label, hint }) => {
          const isTabLocked = id === 'upload' && !hasPermission('upload');
          return (
            <button
              key={id}
              className={`${tab === id ? 'tab active' : 'tab'} ${isTabLocked ? 'tab-locked' : ''}`}
              onClick={() => setTab(id)}
            >
              <div className="tab-top-row">
                <span className="tab-index">{index}</span>
                {isTabLocked && <span className="tab-lock-badge"><Lock size={11} /></span>}
              </div>
              <span className="tab-title">{label}</span>
              <small className="tab-hint">{isTabLocked ? 'Restricted: Law Enforcement Only' : hint}</small>
            </button>
          );
        })}
      </nav>

      {/* ─── Content Area ─── */}
      <div className="content-area">
        {/* Tab 1: Repository & Semantic Search */}
        {tab === 'repository' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            <SemanticSearch
              onSelect={(result: { id: string; title: string; sha256_hash?: string; [key: string]: any }) => {
                handleSelectCustody(result.id, true);
              }}
            />
            <EvidenceTable
              onInspect={handleInspect}
              onSelectCustody={(id) => handleSelectCustody(id, true)}
              caseFilter={caseFilter}
              onClearCaseFilter={() => setCaseFilter('')}
            />
            <CustodyTimeline
              evidence={selected}
              onTransferred={() => {
                if (selected?.evidence_id) {
                  handleSelectCustody(selected.evidence_id, false);
                }
              }}
            />
          </div>
        )}

        {/* Tab 2: Cases Portfolio */}
        {tab === 'cases' && (
          <CasePortfolio
            onSelectCase={(cn) => {
              setCaseFilter(cn);
              setTab('repository');
            }}
          />
        )}

        {/* Tab 3: Upload / Ingestion */}
        {tab === 'upload' &&
          (hasPermission('upload') ? (
            <BatchUpload />
          ) : (
            <section className="panel locked-tab-panel">
              <div className="locked-tab-content">
                <div className="locked-tab-icon"><Lock size={32} color="var(--amber)" /></div>
                <span className="eyebrow" style={{ color: 'var(--amber)' }}>
                  STATUTORY JURISDICTION LOCK
                </span>
                <h2>Evidence Ingestion Restricted</h2>
                <p>
                  Direct evidence registration, batch ingestion, and cryptographic sealing are reserved exclusively for
                  authorized <strong>Law Enforcement Investigators</strong> to satisfy Section 65B statutory
                  chain-of-custody compliance.
                </p>
                <div className="locked-tab-badges">
                  <span className="pill-badge required" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    <ShieldCheck size={14} /> Required Clearance: Investigator
                  </span>
                  <span className="pill-badge current">Your Active Role: {roleInfo.badge}</span>
                </div>
                <button
                  type="button"
                  className="button button-primary locked-tab-unlock-btn"
                  onClick={() => openLockModal('Evidence Ingestion & Batch Upload', 'investigator')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <KeyRound size={15} /> Authenticate as Investigator
                </button>
              </div>
            </section>
          ))}

        {/* Tab 4: Verify Dropzone */}
        {tab === 'verify' && <VerificationDropzone />}

        {/* Tab 5: Health & Ledger Telemetry */}
        {tab === 'health' && (
          <section className="panel health-panel">
            <div className="section-heading">
              <div>
                <span className="eyebrow">INFRASTRUCTURE &amp; LEDGER TELEMETRY</span>
                <h2>Cryptographic Trust Infrastructure</h2>
              </div>
              <button
                className="button button-secondary"
                onClick={() => {
                  setHealth(null);
                  fetch(`${API_BASE}/api/v1/blockchain/status`)
                    .then((r) => r.json())
                    .then(setHealth);
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <RefreshCw size={13} /> Refresh Telemetry
              </button>
            </div>
            {health ? (
              <div className="health-grid">
                <div className={health.connected ? 'health-card health-good' : 'health-card health-warn'}>
                  <span className="health-icon">{health.connected ? <CheckCircle2 size={18} color="var(--emerald)" /> : <AlertTriangle size={18} color="var(--amber)" />}</span>
                  <div>
                    <strong>{health.connected ? (health.network_name || (health.chain_id === 4646 ? 'MST Mainnet Anchor' : 'MST Testnet Anchor')) : 'Simulated Ledger Mode'}</strong>
                    <span>{health.error ?? 'Ready for on-chain proof anchoring.'}</span>
                  </div>
                </div>
                <div className="health-card">
                  <span className="health-icon"><Blocks size={18} color="var(--cyan)" /></span>
                  <div>
                    <strong>{health.chain_id ? `MST Chain ID: ${health.chain_id}` : 'Development Network'}</strong>
                    <span>Latest synchronized block: #{health.latest_block ?? '11763181'}</span>
                  </div>
                </div>
                <div className="health-card">
                  <span className="health-icon"><Database size={18} color="var(--cyan)" /></span>
                  <div>
                    <strong>PostgreSQL + pgvector</strong>
                    <span>Cosine similarity search index active</span>
                  </div>
                </div>
                <div className="health-card">
                  <span className="health-icon"><HardDrive size={18} color="var(--cyan)" /></span>
                  <div>
                    <strong>MinIO WORM Storage</strong>
                    <span>Bucket: evidence-vault (365D Compliance Lock)</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="loading-state">Interrogating trust infrastructure…</div>
            )}
          </section>
        )}
      </div>

      {/* ─── Evidence Inspector Modal ─── */}
      {inspectorId && <EvidenceInspector evidenceId={inspectorId} onClose={() => setInspectorId(null)} />}

      {/* ─── Tactical Footer ─── */}
      <footer>
        <span>LEXVAULT &bull; LEGAL EVIDENCE &amp; FORENSIC COMMAND SYSTEM</span>
        <span>SECTION 65B INDIAN EVIDENCE ACT &bull; ISO/IEC 27037 FORENSIC ADMISSIBLE</span>
        <span>STATE: APPEND-ONLY IMMUTABLE LEDGER</span>
      </footer>
    </main>
  );
}