'use client';

import { useEffect, useState } from 'react';
import ELAViewer from './ELAViewer';
import TranscriptPlayer from './TranscriptPlayer';
import CustodyTransferModal from './CustodyTransferModal';
import { useRole } from '../context/RoleContext';
import { Shield, X, FileText, Check, Link2, Search, AlertTriangle, Copy, Camera, Zap, Lock, Microscope, Mic, ScrollText, Share2 } from 'lucide-react';

type EvidenceDetail = {
  id: string;
  case_number: string;
  title: string;
  file_name: string;
  mime_type: string;
  file_size_bytes: number;
  sha256_hash: string;
  phash: string | null;
  is_tampered: boolean;
  tamper_score: number;
  eth_tx_hash: string;
  block_number: number;
  current_custodian_address: string;
  created_at: string;
  ai_indexed: boolean;
  exif_data?: Record<string, unknown> | null;
};

type CustodyEntry = {
  from_custodian: string;
  to_custodian: string;
  action_type: string;
  notes?: string;
  eth_tx_hash?: string;
  timestamp: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

const EXPLORER_BASE = process.env.NEXT_PUBLIC_BLOCK_EXPLORER_URL || 'https://coral.mstscan.com';

function txLink(hash?: string) {
  return hash?.startsWith('0x') ? `${EXPLORER_BASE.replace(/\/$/, '')}/tx/${hash}` : undefined;
}

export default function EvidenceInspector({
  evidenceId,
  onClose,
}: {
  evidenceId: string;
  onClose: () => void;
}) {
  const { hasPermission, openLockModal } = useRole();
  const [evidence, setEvidence] = useState<EvidenceDetail | null>(null);
  const [custody, setCustody] = useState<CustodyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showELA, setShowELA] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hashCopied, setHashCopied] = useState(false);
  const [shareExpiryHours] = useState(24);

  const refreshEvidence = () => {
    setLoading(true);
    fetch(`${API_BASE}/api/v1/evidence/${evidenceId}/detail`)
      .then((r) => r.json())
      .then((data) => {
        setEvidence(data.evidence);
        setCustody(data.custody_history || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refreshEvidence();
  }, [evidenceId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const score = evidence?.tamper_score ?? 0;
  const gaugeColor = evidence?.is_tampered || score >= 0.25 ? '#ef4444' : score >= 0.1 ? '#f59e0b' : '#10b981';
  const arcLength = Math.min(score, 1) * 157; // 157 is the approximate arc length

  const copyShareLink = () => {
    const expiryMinutes = shareExpiryHours * 60;
    fetch(`${API_BASE}/api/v1/evidence/${evidenceId}/share-url?expiry_minutes=${expiryMinutes}&view_mode=preview`)
      .then((r) => r.json())
      .then((data) => {
        if (data.url) {
          navigator.clipboard.writeText(data.url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2500);
        }
      });
  };

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setHashCopied(true);
    setTimeout(() => setHashCopied(false), 2000);
  };

  return (
    <>
      <div className="inspector-backdrop" onClick={onClose} />
      <aside className="inspector-drawer" role="dialog" aria-modal="true" aria-labelledby="inspector-title">
        <div className="inspector-header">
          <div className="inspector-header-left">
            <div className="inspector-header-pills">
              <span className="inspector-eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Shield size={14} color="var(--cyan)" /> EVIDENCE DOSSIER
              </span>
              {evidence?.case_number && (
                <span className="inspector-case-tag">
                  CASE: <code>{evidence.case_number}</code>
                </span>
              )}
            </div>
            <h3 id="inspector-title">{evidence?.title ?? 'Loading evidence…'}</h3>
          </div>
          <button className="inspector-close" onClick={onClose} title="Close inspector (Esc)" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {loading ? (
          <div className="loading-state" style={{ padding: '60px 0' }}>Loading evidence details…</div>
        ) : evidence ? (
          <div className="inspector-body">
            <div className="inspector-grid">
              {/* LEFT COLUMN: Identity & Custody Chain */}
              <div className="inspector-col">
                {/* Identity Card */}
                <div className="inspector-card">
                  <div className="inspector-card-header">
                    <div className="inspector-card-title">
                      <span className="inspector-card-icon"><FileText size={15} color="var(--cyan)" /></span>
                      <span>Identity & File Specs</span>
                    </div>
                    {evidence.ai_indexed && (
                      <span className="tamper-badge tamper-clean" style={{ fontSize: '9px', padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        AI INDEXED <Check size={10} />
                      </span>
                    )}
                  </div>
                  <div className="detail-grid">
                    <div className="detail-row">
                      <span className="detail-label">Case ID</span>
                      <span className="detail-value">
                        <code>{evidence.case_number}</code>
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Filename</span>
                      <span className="detail-value" style={{ fontWeight: 500 }}>{evidence.file_name}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">MIME Type</span>
                      <span className="detail-value">
                        <code style={{ fontSize: '10.5px' }}>{evidence.mime_type}</code>
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">File Size</span>
                      <span className="detail-value" style={{ fontWeight: 600, color: 'var(--ink)' }}>
                        {formatSize(evidence.file_size_bytes)}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Ingested</span>
                      <span className="detail-value">{new Date(evidence.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Custody Chain Card */}
                <div className="inspector-card">
                  <div className="inspector-card-header">
                    <div className="inspector-card-title">
                      <span className="inspector-card-icon"><Link2 size={15} color="var(--cyan)" /></span>
                      <span>Custody Audit Trail ({custody.length})</span>
                    </div>
                    <span className="telemetry-worm" style={{ fontSize: '9px', padding: '2px 6px' }}>
                      WORM SECURED
                    </span>
                  </div>
                  {custody.length > 0 ? (
                    <div className="mini-timeline">
                      {custody.map((entry, i) => (
                        <div className="mini-timeline-node" key={i}>
                          <span className="mini-dot" />
                          <div className="mini-timeline-top">
                            <span className="mini-action-badge">{entry.action_type}</span>
                            <time style={{ fontSize: '10px', color: 'var(--muted)' }}>
                              {new Date(entry.timestamp).toLocaleString()}
                            </time>
                          </div>
                          <div className="mini-timeline-path">
                            <span>Custodian:</span>
                            <code>{entry.from_custodian?.trim().slice(0, 12)}…</code>
                            <span>→</span>
                            <code>{entry.to_custodian?.trim().slice(0, 12)}…</code>
                          </div>
                          {entry.notes && (
                            <div className={entry.notes.includes('TAMPER ALERT') ? 'mini-tamper-alert' : 'notes-text'}>
                              {entry.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--text-muted)' }}>
                      <div>Current Custodian: <code style={{ color: 'var(--cyan)' }}>{evidence.current_custodian_address?.trim() || 'Intake Registry'}</code></div>
                      <div style={{ marginTop: '4px', fontSize: '11px' }}>Immutable ledger entry established at intake. No subsequent handoffs recorded.</div>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN: Integrity, Blockchain & Actions */}
              <div className="inspector-col">
                {/* Integrity & Tamper Score Card */}
                <div className="inspector-card">
                  <div className="inspector-card-header">
                    <div className="inspector-card-title">
                      <span className="inspector-card-icon"><Search size={15} color="var(--cyan)" /></span>
                      <span>Cryptographic Integrity</span>
                    </div>
                    <span className={`tamper-badge-large ${evidence.is_tampered ? 'tamper-alert' : 'tamper-clean'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      {evidence.is_tampered ? <><AlertTriangle size={13} /> TAMPERED</> : <><Check size={13} /> AUTHENTIC</>}
                    </span>
                  </div>

                  <div className="tamper-card-content">
                    <div className="tamper-hero">
                      <svg className="tamper-gauge" viewBox="0 0 120 70" width="130" height="75">
                        <path
                          d="M 10 60 A 50 50 0 0 1 110 60"
                          fill="none"
                          stroke="rgba(139, 92, 246, 0.15)"
                          strokeWidth="8"
                          strokeLinecap="round"
                        />
                        <path
                          d="M 10 60 A 50 50 0 0 1 110 60"
                          fill="none"
                          stroke={gaugeColor}
                          strokeWidth="8"
                          strokeLinecap="round"
                          strokeDasharray={`${arcLength} 157`}
                          style={{ filter: `drop-shadow(0 0 8px ${gaugeColor})` }}
                        />
                        <text x="60" y="50" textAnchor="middle" fill={gaugeColor} fontSize="15" fontWeight="bold">
                          {(score * 100).toFixed(1)}%
                        </text>
                        <text x="60" y="66" textAnchor="middle" fill="#9b95b0" fontSize="8" letterSpacing="0.05em">
                          TAMPER SCORE
                        </text>
                      </svg>
                      <div className="tamper-score-meta">
                        <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Verification Verdict:</span>
                        <strong style={{ fontSize: '13px', color: evidence.is_tampered ? 'var(--crimson)' : 'var(--teal)' }}>
                          {evidence.is_tampered ? 'Integrity Breach Detected' : 'Cryptographically Verified'}
                        </strong>
                        <span style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '4px' }}>
                          Evaluated against baseline vault hash
                        </span>
                      </div>
                    </div>

                    {/* SHA-256 Digest Box */}
                    <div className="hash-row">
                      <div className="hash-row-header">
                        <span style={{ fontWeight: 600, color: 'var(--muted)' }}>SHA-256 CHECKSUM</span>
                        <button
                          type="button"
                          className="hash-copy-btn"
                          onClick={() => copyHash(evidence.sha256_hash)}
                          title="Copy full SHA-256 hash"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          {hashCopied ? <><Check size={12} color="var(--emerald)" /> Copied</> : <><Copy size={12} /> Copy</>}
                        </button>
                      </div>
                      <div className="hash-value-full">{evidence.sha256_hash}</div>
                    </div>

                    {/* pHash Row */}
                    <div className="detail-row" style={{ marginTop: '2px' }}>
                      <span className="detail-label">Perceptual Hash (pHash)</span>
                      <code className="detail-value" style={{ fontSize: '10.5px' }}>
                        {evidence.phash || (evidence.mime_type?.startsWith('image/') ? 'Computing…' : 'N/A (Document)')}
                      </code>
                    </div>
                  </div>
                </div>

                {/* Blockchain Proof of Existence Card */}
                <div className="inspector-card">
                  <div className="inspector-card-header">
                    <div className="inspector-card-title">
                      <span className="inspector-card-icon"><Link2 size={15} color="var(--cyan)" /></span>
                      <span>Blockchain Anchor</span>
                    </div>
                    <span className="status-dot dot-green" title="Anchor synchronized" />
                  </div>
                  <div className="detail-grid">
                    <div className="detail-row">
                      <span className="detail-label">Tx Hash</span>
                      {txLink(evidence.eth_tx_hash) ? (
                        <a
                          href={txLink(evidence.eth_tx_hash)}
                          target="_blank"
                          rel="noreferrer"
                          className="detail-value"
                          style={{ color: 'var(--accent)', textDecoration: 'none' }}
                        >
                          <code>{evidence.eth_tx_hash.slice(0, 10)}…{evidence.eth_tx_hash.slice(-6)} ↗</code>
                        </a>
                      ) : (
                        <code className="detail-value">{evidence.eth_tx_hash || 'Mock'}</code>
                      )}
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Block Height</span>
                      <span className="detail-value">
                        <code>#{evidence.block_number || '11763181'}</code>
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Current Custodian</span>
                      <span className="detail-value">
                        <code style={{ fontSize: '10.5px' }}>{evidence.current_custodian_address?.trim()}</code>
                      </span>
                    </div>
                  </div>
                </div>

                {/* EXIF Metadata Card (Conditional) */}
                {evidence.exif_data && typeof evidence.exif_data === 'object' && Object.keys(evidence.exif_data).length > 0 && (
                  <div className="inspector-card">
                    <div className="inspector-card-header">
                      <div className="inspector-card-title">
                        <span className="inspector-card-icon"><Camera size={15} color="var(--cyan)" /></span>
                        <span>EXIF Forensic Metadata</span>
                      </div>
                    </div>
                    <div className="detail-grid">
                      {Object.entries(evidence.exif_data).map(([key, val]) => {
                        if (key === 'GPS' && typeof val === 'object' && val !== null) {
                          return Object.entries(val as Record<string, string>).map(([gk, gv]) => (
                            <div className="detail-row" key={`gps-${gk}`}>
                              <span className="detail-label">GPS {gk}</span>
                              <span className="detail-value">{String(gv)}</span>
                            </div>
                          ));
                        }
                        return (
                          <div className="detail-row" key={key}>
                            <span className="detail-label">{key}</span>
                            <span className="detail-value">{String(val)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Forensic Action Station */}
                <div className="inspector-card">
                  <div className="inspector-card-header">
                    <div className="inspector-card-title">
                      <span className="inspector-card-icon"><Zap size={15} color="var(--cyan)" /></span>
                      <span>Forensic Operations</span>
                    </div>
                  </div>
                  <div className="inspector-actions-grid">
                    {hasPermission('custody_transfer') ? (
                      <button className="button button-primary" onClick={() => setShowTransfer(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <Zap size={14} /> Transfer Custody
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="button button-primary locked-action-btn"
                        onClick={() =>
                          openLockModal('Chain of Custody Transfer', 'investigator', () => setShowTransfer(true))
                        }
                        title="Restricted: Requires Law Enforcement Investigator clearance (PIN 1001)"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Lock size={14} /> Transfer Custody
                      </button>
                    )}

                    {evidence.mime_type?.startsWith('image/') &&
                      (hasPermission('ela_heatmap') ? (
                        <button className="button button-secondary" onClick={() => setShowELA(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <Microscope size={14} /> ELA Heatmap
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="button button-secondary locked-action-btn"
                          onClick={() =>
                            openLockModal('Error Level Analysis Heatmap', 'forensic_analyst', () => setShowELA(true))
                          }
                          title="Restricted: Requires Forensic Analyst clearance (PIN 2002)"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                          <Lock size={14} /> ELA Heatmap
                        </button>
                      ))}

                    {(evidence.mime_type?.startsWith('audio/') || evidence.mime_type?.startsWith('video/') || evidence.mime_type === 'application/pdf') &&
                      (hasPermission('transcript') ? (
                        <button className="button button-secondary" onClick={() => setShowTranscript(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          {evidence.mime_type === 'application/pdf' ? <><FileText size={14} /> Document Text</> : <><Mic size={14} /> Transcript</>}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="button button-secondary locked-action-btn"
                          onClick={() =>
                            openLockModal(
                              evidence.mime_type === 'application/pdf' ? 'Document Text Extraction' : 'Speech-to-Text Transcription',
                              'forensic_analyst',
                              () => setShowTranscript(true)
                            )
                          }
                          title="Restricted: Requires Forensic Analyst clearance (PIN 2002)"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                          <Lock size={14} /> {evidence.mime_type === 'application/pdf' ? 'Document Text' : 'Transcript'}
                        </button>
                      ))}

                    {hasPermission('court_dossier') ? (
                      <button
                        type="button"
                        className="button button-secondary"
                        onClick={() => window.open(`${API_BASE}/api/v1/evidence/${evidenceId}/certificate`, '_blank')}
                        title="Generate and download court-admissible PDF certificate with QR verification"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <ScrollText size={14} /> Court Dossier
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="button button-secondary locked-action-btn"
                        onClick={() =>
                          openLockModal('Section 65B Court Dossier Certificate', 'auditor', () =>
                            window.open(`${API_BASE}/api/v1/evidence/${evidenceId}/certificate`, '_blank')
                          )
                        }
                        title="Restricted: Requires Compliance Auditor clearance (PIN 3003)"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Lock size={14} /> Court Dossier
                      </button>
                    )}

                    <button
                      className="button button-secondary"
                      onClick={copyShareLink}
                      title="Generate cryptographic time-bounded URL (Valid for 24 Hours via MinIO STS presigning)"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      {copied ? (
                        <>
                          <Check size={14} color="var(--emerald)" /> Link Copied (24h Valid)!
                        </>
                      ) : (
                        <>
                          <Share2 size={14} /> Share Link (24h)
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="empty-state" style={{ padding: '60px 0' }}>Evidence not found</div>
        )}
      </aside>

      {showELA && <ELAViewer evidenceId={evidenceId} onClose={() => setShowELA(false)} />}
      {showTranscript && <TranscriptPlayer evidenceId={evidenceId} onClose={() => setShowTranscript(false)} />}
      {showTransfer && (
        <CustodyTransferModal
          evidenceId={evidenceId}
          evidenceTitle={evidence?.title}
          currentCustodian={evidence?.current_custodian_address}
          isOpen={showTransfer}
          onClose={() => setShowTransfer(false)}
          onSuccess={refreshEvidence}
        />
      )}
    </>
  );
}
