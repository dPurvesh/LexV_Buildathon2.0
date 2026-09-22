'use client';

import { useEffect, useState } from 'react';
import ELAViewer from './ELAViewer';
import TranscriptPlayer from './TranscriptPlayer';
import CustodyTransferModal from './CustodyTransferModal';
import { useRole } from '../context/RoleContext';

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

function txLink(hash?: string) {
  return hash?.startsWith('0x') ? `https://sepolia.etherscan.io/tx/${hash}` : undefined;
}

export default function EvidenceInspector({
  evidenceId,
  onClose,
}: {
  evidenceId: string;
  onClose: () => void;
}) {
  const [evidence, setEvidence] = useState<EvidenceDetail | null>(null);
  const [custody, setCustody] = useState<CustodyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showELA, setShowELA] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const score = evidence?.tamper_score ?? 0;
  const gaugeColor = score >= 0.25 ? '#ef4444' : score >= 0.1 ? '#f59e0b' : '#10b981';
  const arcLength = Math.min(score, 1) * 157; // 157 is the approximate arc length

  const copyShareLink = () => {
    fetch(`${API_BASE}/api/v1/evidence/${evidenceId}/share-url?expiry_minutes=15&view_mode=preview`)
      .then((r) => r.json())
      .then((data) => {
        if (data.url) {
          navigator.clipboard.writeText(data.url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
      });
  };

  return (
    <>
      <div className="inspector-backdrop" onClick={onClose} />
      <aside className="inspector-drawer">
        <div className="inspector-header">
          <div>
            <span className="eyebrow">EVIDENCE INSPECTOR</span>
            <h3>{evidence?.title ?? 'Loading…'}</h3>
          </div>
          <button className="inspector-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {loading ? (
          <div className="loading-state">Loading evidence details…</div>
        ) : evidence ? (
          <div className="inspector-body">
            {/* Identity */}
            <div className="inspector-section">
              <h4>Identity</h4>
              <div className="detail-grid">
                <div className="detail-row">
                  <span className="detail-label">Case</span>
                  <span className="detail-value">
                    <code>{evidence.case_number}</code>
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Filename</span>
                  <span className="detail-value">{evidence.file_name}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Type</span>
                  <span className="detail-value">{evidence.mime_type}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Size</span>
                  <span className="detail-value">{formatSize(evidence.file_size_bytes)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Uploaded</span>
                  <span className="detail-value">{new Date(evidence.created_at).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Integrity */}
            <div className="inspector-section">
              <h4>Integrity</h4>
              <div className="tamper-gauge-container">
                <svg className="tamper-gauge" viewBox="0 0 120 70" width="120" height="70">
                  <path
                    d="M 10 60 A 50 50 0 0 1 110 60"
                    fill="none"
                    stroke="rgba(51,65,85,.3)"
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
                    style={{ filter: `drop-shadow(0 0 6px ${gaugeColor})` }}
                  />
                  <text x="60" y="52" textAnchor="middle" fill={gaugeColor} fontSize="14" fontWeight="bold">
                    {(score * 100).toFixed(1)}%
                  </text>
                  <text x="60" y="66" textAnchor="middle" fill="#8190a5" fontSize="8">
                    TAMPER SCORE
                  </text>
                </svg>
                <span className={`tamper-badge ${evidence.is_tampered ? 'tamper-alert' : 'tamper-clean'}`}>
                  {evidence.is_tampered ? '⚠ TAMPERED' : '✓ CLEAN'}
                </span>
              </div>
              <div className="detail-grid">
                <div className="detail-row">
                  <span className="detail-label">SHA-256</span>
                  <code className="detail-value hash-value">{evidence.sha256_hash}</code>
                </div>
                <div className="detail-row">
                  <span className="detail-label">pHash</span>
                  <code className="detail-value">{evidence.phash ?? 'Pending'}</code>
                </div>
              </div>
            </div>

            {/* Blockchain */}
            <div className="inspector-section">
              <h4>Blockchain Anchor</h4>
              <div className="detail-grid">
                <div className="detail-row">
                  <span className="detail-label">Tx Hash</span>
                  {txLink(evidence.eth_tx_hash) ? (
                    <a href={txLink(evidence.eth_tx_hash)} target="_blank" rel="noreferrer" className="detail-value">
                      {evidence.eth_tx_hash.slice(0, 10)}…{evidence.eth_tx_hash.slice(-6)} ↗
                    </a>
                  ) : (
                    <code className="detail-value">{evidence.eth_tx_hash || 'Mock'}</code>
                  )}
                </div>
                <div className="detail-row">
                  <span className="detail-label">Block</span>
                  <span className="detail-value">{evidence.block_number || 'Mock ledger'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Custodian</span>
                  <span className="detail-value">{evidence.current_custodian_address?.trim()}</span>
                </div>
              </div>
            </div>

            {/* EXIF */}
            {evidence.exif_data && typeof evidence.exif_data === 'object' && Object.keys(evidence.exif_data).length > 0 && (
              <div className="inspector-section">
                <h4>EXIF Metadata</h4>
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

            {/* Custody */}
            {custody.length > 0 && (
              <div className="inspector-section">
                <h4>Custody Chain ({custody.length})</h4>
                <div className="mini-timeline">
                  {custody.map((entry, i) => (
                    <div className="mini-timeline-node" key={i}>
                      <span className="mini-dot" />
                      <div>
                        <strong>{entry.action_type}</strong>
                        <small>
                          {entry.from_custodian?.trim().slice(0, 10)}… → {entry.to_custodian?.trim().slice(0, 10)}…
                        </small>
                        {entry.notes && <p className="notes-text">{entry.notes}</p>}
                        <time>{new Date(entry.timestamp).toLocaleString()}</time>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="inspector-actions">
              {hasPermission('custody_transfer') ? (
                <button className="button button-primary" onClick={() => setShowTransfer(true)}>
                  ⚡ Transfer Custody
                </button>
              ) : (
                <button
                  type="button"
                  className="button button-primary locked-action-btn"
                  onClick={() =>
                    openLockModal('Chain of Custody Transfer', 'investigator', () => setShowTransfer(true))
                  }
                  title="Restricted: Requires Law Enforcement Investigator clearance (PIN 1001)"
                >
                  🔒 Transfer Custody
                </button>
              )}

              {evidence.mime_type?.startsWith('image/') &&
                (hasPermission('ela_heatmap') ? (
                  <button className="button button-secondary" onClick={() => setShowELA(true)}>
                    🔬 ELA Heatmap
                  </button>
                ) : (
                  <button
                    type="button"
                    className="button button-secondary locked-action-btn"
                    onClick={() =>
                      openLockModal('Error Level Analysis Heatmap', 'forensic_analyst', () => setShowELA(true))
                    }
                    title="Restricted: Requires Forensic Analyst clearance (PIN 2002)"
                  >
                    🔒 ELA Heatmap
                  </button>
                ))}

              {(evidence.mime_type?.startsWith('audio/') || evidence.mime_type?.startsWith('video/')) &&
                (hasPermission('transcript') ? (
                  <button className="button button-secondary" onClick={() => setShowTranscript(true)}>
                    🎙 Transcript
                  </button>
                ) : (
                  <button
                    type="button"
                    className="button button-secondary locked-action-btn"
                    onClick={() =>
                      openLockModal('Speech-to-Text Transcription', 'forensic_analyst', () => setShowTranscript(true))
                    }
                    title="Restricted: Requires Forensic Analyst clearance (PIN 2002)"
                  >
                    🔒 Transcript
                  </button>
                ))}

              {hasPermission('court_dossier') ? (
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => window.open(`${API_BASE}/api/v1/evidence/${evidenceId}/certificate`, '_blank')}
                  title="Generate and download court-admissible PDF certificate with QR verification"
                >
                  📜 Court Dossier (PDF)
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
                >
                  🔒 Court Dossier (PDF)
                </button>
              )}

              <button className="button button-secondary" onClick={copyShareLink}>
                {copied ? '✓ Copied!' : '🔗 Share Link'}
              </button>
            </div>
          </div>
        ) : (
          <div className="empty-state">Evidence not found</div>
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
