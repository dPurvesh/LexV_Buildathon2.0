'use client';

import { FormEvent, useState } from 'react';
import { useRole } from '../context/RoleContext';
import {
  Link2,
  X,
  Zap,
  AlertTriangle,
  ArrowRight,
  ArrowRightLeft,
  CheckCircle2,
  ShieldCheck,
  Shield,
  Microscope,
  Scale,
  Database,
  FileText,
  ExternalLink,
  Clock,
  Lock,
} from 'lucide-react';

type CustodyEntry = {
  from_custodian: string;
  to_custodian: string;
  action_type: string;
  notes?: string;
  eth_tx_hash?: string;
  timestamp: string;
};

type Evidence = {
  evidence_id?: string;
  sha256_hash: string;
  title?: string;
  custody_history?: CustodyEntry[];
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

const formatCustodian = (value?: string) => {
  if (!value) return 'Intake Registry';
  const trimmed = value.trim();
  if (trimmed === 'mock-custodian') return 'Forensic Intake Officer (Vault)';
  if (trimmed.startsWith('0x') && trimmed.length >= 40) {
    return `${trimmed.slice(0, 6)}…${trimmed.slice(-4)}`;
  }
  return trimmed;
};

const shortenTx = (hash?: string) => {
  if (!hash) return 'Simulated Proof';
  if (hash.startsWith('0x') && hash.length > 18) {
    return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
  }
  return hash;
};

const EXPLORER_BASE = process.env.NEXT_PUBLIC_BLOCK_EXPLORER_URL || 'https://coral.mstscan.com';
const txLink = (hash?: string) =>
  hash?.startsWith('0x') ? `${EXPLORER_BASE.replace(/\/$/, '')}/tx/${hash}` : undefined;

const getActionMeta = (actionType: string) => {
  switch (actionType) {
    case 'INITIAL_INTAKE':
      return {
        label: 'Initial Intake & Cryptographic Seal',
        icon: ShieldCheck,
        color: 'var(--cyan)',
        bg: 'rgba(6, 182, 212, 0.1)',
        border: 'rgba(6, 182, 212, 0.3)',
      };
    case 'CUSTODY_TRANSFER':
      return {
        label: 'Department Custody Handoff',
        icon: ArrowRightLeft,
        color: '#818cf8',
        bg: 'rgba(99, 102, 241, 0.12)',
        border: 'rgba(99, 102, 241, 0.3)',
      };
    case 'FORENSIC_ANALYSIS':
      return {
        label: 'Forensic Lab Analysis',
        icon: Microscope,
        color: '#c084fc',
        bg: 'rgba(168, 85, 247, 0.12)',
        border: 'rgba(168, 85, 247, 0.3)',
      };
    case 'COURT_SUBMISSION':
      return {
        label: 'Judicial Evidence Submission',
        icon: Scale,
        color: '#fbbf24',
        bg: 'rgba(245, 158, 11, 0.12)',
        border: 'rgba(245, 158, 11, 0.3)',
      };
    case 'ARCHIVAL_STORAGE':
    case 'STORAGE_MIGRATION':
      return {
        label: 'Secure Archival Relocation',
        icon: Database,
        color: '#34d399',
        bg: 'rgba(16, 185, 129, 0.12)',
        border: 'rgba(16, 185, 129, 0.3)',
      };
    case 'DEFENSE_DISCOVERY':
      return {
        label: 'Legal Discovery Disclosure',
        icon: FileText,
        color: '#94a3b8',
        bg: 'rgba(148, 163, 184, 0.12)',
        border: 'rgba(148, 163, 184, 0.3)',
      };
    default:
      return {
        label: actionType.replace(/_/g, ' '),
        icon: Shield,
        color: 'var(--cyan)',
        bg: 'rgba(6, 182, 212, 0.1)',
        border: 'rgba(6, 182, 212, 0.3)',
      };
  }
};

export default function CustodyTimeline({
  evidence,
  onTransferred,
}: {
  evidence: Evidence | null;
  onTransferred: (payload: unknown) => void;
}) {
  const { hasPermission, openLockModal } = useRole();
  const [open, setOpen] = useState(false);
  const [toCustodian, setToCustodian] = useState('');
  const [action, setAction] = useState('COURT_SUBMISSION');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!evidence) {
    return (
      <section id="custody-timeline-section" className="panel timeline-panel" style={{ textAlign: 'center', padding: '48px 24px' }}>
        <div className="radar-core-icon" style={{ margin: '0 auto 16px' }}>
          <Link2 size={24} color="var(--cyan)" />
        </div>
        <span className="eyebrow">[05] IMMUTABLE CHAIN OF CUSTODY</span>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
          Select Evidence to Interrogate Custody Timeline
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', maxWidth: '480px', margin: '6px auto 0' }}>
          Click any evidence card or row in the repository to inspect its cryptographic handoffs, statutory transfer notes, and on-chain ledger proofs.
        </p>
      </section>
    );
  }

  async function transfer(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');

    try {
      if (!evidence?.evidence_id) throw new Error('Selected evidence has no identifier');
      const response = await fetch(`${API_BASE}/api/v1/evidence/${evidence.evidence_id}/custody`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to_custodian: toCustodian, action_type: action, notes }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.detail ?? 'Custody transfer failed');
      onTransferred(payload);
      setOpen(false);
      setToCustodian('');
      setNotes('');
    } catch (transferError) {
      setError(transferError instanceof Error ? transferError.message : 'Custody transfer failed');
    } finally {
      setBusy(false);
    }
  }

  const history = evidence.custody_history ?? [];

  return (
    <section id="custody-timeline-section" className="panel timeline-panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">[05] STATUTORY CHAIN OF CUSTODY</span>
          <h2>{evidence.title ?? 'Evidence Custody Graph'}</h2>
        </div>
        {hasPermission('custody_transfer') ? (
          <button
            type="button"
            className="button button-primary"
            onClick={() => setOpen(!open)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            {open ? <><X size={14} /> Cancel Transfer</> : <><Zap size={14} /> Transfer Custody</>}
          </button>
        ) : (
          <button
            type="button"
            className="button button-primary locked-action-btn"
            onClick={() =>
              openLockModal('Chain of Custody Transfer', 'investigator', () => setOpen(true))
            }
            title="Restricted: Requires Law Enforcement Investigator clearance (PIN 1001)"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Lock size={14} /> Transfer Custody
          </button>
        )}
      </div>

      {open && (
        <form onSubmit={transfer} className="inspector-card" style={{ padding: '24px', marginBottom: '20px' }}>
          <div className="inspector-card-header">
            <span className="inspector-card-title" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Zap size={14} color="var(--cyan)" /> Log Custody Transition
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={{ font: '700 11px var(--font-mono)', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                RECEIVING CUSTODIAN
              </label>
              <input
                className="search-input"
                style={{ padding: '10px 14px' }}
                value={toCustodian}
                onChange={(e) => setToCustodian(e.target.value)}
                placeholder="e.g. State Crime Lab - Cyber Unit"
                required
              />
              <div className="preset-badges" style={{ marginTop: '8px' }}>
                {['State Crime Lab - Cyber Unit', 'Office of the District Attorney', 'County Superior Court Evidence Vault', 'FBI Cyber Task Force'].map((p) => (
                  <button
                    key={p}
                    type="button"
                    className="preset-btn"
                    onClick={() => setToCustodian(p)}
                  >
                    + {p.split(' - ')[0]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ font: '700 11px var(--font-mono)', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                TRANSITION ACTION
              </label>
              <select
                className="search-input"
                style={{ padding: '10px 14px' }}
                value={action}
                onChange={(e) => setAction(e.target.value)}
              >
                <option value="COURT_SUBMISSION">COURT_SUBMISSION (Judicial Filing)</option>
                <option value="FORENSIC_ANALYSIS">FORENSIC_ANALYSIS (Lab Extraction)</option>
                <option value="CUSTODY_TRANSFER">CUSTODY_TRANSFER (Department Handoff)</option>
                <option value="STORAGE_MIGRATION">STORAGE_MIGRATION (Vault Compliance)</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ font: '700 11px var(--font-mono)', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
              STATUTORY TRANSFER NOTES &amp; COMPLIANCE JUSTIFICATION
            </label>
            <textarea
              className="search-input"
              style={{ width: '100%', minHeight: '80px', padding: '10px 14px' }}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Reason for handoff, courier details, or judicial order reference..."
            />
          </div>

          {error && (
            <div className="alert alert-error">
              <AlertTriangle size={15} style={{ display: 'inline', marginRight: 6 }} /> {error}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px' }}>
            <button className="button button-primary" disabled={busy}>
              {busy ? 'Recording on Ledger…' : 'Confirm Custody Handoff'}
            </button>
          </div>
        </form>
      )}

      {/* ─── Luminous Vertical Node Graph ─── */}
      <div className="luminous-timeline">
        {history.map((entry, index) => {
          const meta = getActionMeta(entry.action_type);
          const IconComponent = meta.icon;
          const isIntake =
            entry.action_type === 'INITIAL_INTAKE' ||
            entry.from_custodian.trim() === entry.to_custodian.trim();

          return (
            <div className="luminous-node" key={`${entry.timestamp}-${index}`}>
              <span className="luminous-dot" />
              <div className="luminous-node-top">
                <span
                  className="action-type-pill"
                  style={{ color: meta.color, background: meta.bg, borderColor: meta.border }}
                >
                  <IconComponent size={13} color={meta.color} />
                  {meta.label}
                </span>
                <time
                  style={{
                    font: '500 11px var(--font-mono)',
                    color: 'var(--text-muted)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <Clock size={11} />
                  {new Date(entry.timestamp).toLocaleString()}
                </time>
              </div>

              {/* Custodian Flow */}
              <div className="luminous-custodian-bar">
                {isIntake ? (
                  <div className="custodian-side">
                    <span className="custodian-label">ORIGINATING INTAKE CUSTODIAN</span>
                    <div className="custodian-pill active">
                      <Shield size={13} color="var(--cyan)" />
                      <span>{formatCustodian(entry.to_custodian)}</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="custodian-side">
                      <span className="custodian-label">RELEASED BY</span>
                      <div className="custodian-pill">
                        <span>{formatCustodian(entry.from_custodian)}</span>
                      </div>
                    </div>
                    <div className="custodian-arrow">
                      <ArrowRight size={14} color="var(--cyan)" />
                    </div>
                    <div className="custodian-side">
                      <span className="custodian-label">RECEIVED BY</span>
                      <div className="custodian-pill active">
                        <span style={{ color: 'var(--cyan)' }}>{formatCustodian(entry.to_custodian)}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Manifest Notes */}
              {entry.notes && (
                <div className={`luminous-notes ${entry.notes.includes('TAMPER') ? 'tamper' : ''}`}>
                  {entry.notes.includes('TAMPER') ? (
                    <AlertTriangle size={14} color="var(--crimson)" style={{ flexShrink: 0, marginTop: 1 }} />
                  ) : (
                    <FileText size={14} color="var(--cyan)" style={{ flexShrink: 0, marginTop: 1 }} />
                  )}
                  <div className="notes-content">
                    <span className="notes-label">STATUTORY MANIFEST</span>
                    <p>{entry.notes}</p>
                  </div>
                </div>
              )}

              {/* Footer Audit Row */}
              <div className="luminous-footer">
                {txLink(entry.eth_tx_hash) ? (
                  <a
                    href={txLink(entry.eth_tx_hash)}
                    target="_blank"
                    rel="noreferrer"
                    className="tx-badge"
                  >
                    <ExternalLink size={11} />
                    <span>MST Chain TX: <code>{shortenTx(entry.eth_tx_hash)}</code></span>
                  </a>
                ) : (
                  <div className="tx-badge simulated">
                    <Lock size={11} />
                    <span>Ledger Tx: <code>{shortenTx(entry.eth_tx_hash)}</code></span>
                  </div>
                )}
                <span className="worm-verified-pill">
                  <CheckCircle2 size={12} color="var(--emerald)" />
                  <span>WORM COMPLIANT</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
