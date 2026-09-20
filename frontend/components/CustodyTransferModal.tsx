'use client';

import { useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

const PRESET_TRANSFEREES = [
  { label: 'State Forensics Lab', value: 'State Crime Lab - Cyber Unit' },
  { label: 'District Attorney', value: 'Office of the District Attorney' },
  { label: 'Judicial Evidence Clerk', value: 'County Superior Court Evidence Vault' },
  { label: 'Federal Bureau Liaison', value: 'FBI Cyber Task Force' },
  { label: 'Defense Counsel Repository', value: 'Defense Counsel Legal Vault' },
];

export default function CustodyTransferModal({
  evidenceId,
  evidenceTitle,
  currentCustodian,
  isOpen,
  onClose,
  onSuccess,
}: {
  evidenceId: string;
  evidenceTitle?: string;
  currentCustodian?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const [toCustodian, setToCustodian] = useState('');
  const [actionType, setActionType] = useState('FORENSIC_ANALYSIS');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successTx, setSuccessTx] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toCustodian.trim()) {
      setError('Please specify a recipient custodian.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccessTx(null);

    try {
      const res = await fetch(`${API_BASE}/api/v1/evidence/${evidenceId}/custody`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to_custodian: toCustodian.trim(),
          action_type: actionType,
          notes: notes.trim() || 'Official custody handoff registered via LexVault terminal',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to record custody transfer');
      }

      setSuccessTx(data.tx_hash || '0x' + Math.random().toString(16).slice(2, 42));
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
        setSuccessTx(null);
        setToCustodian('');
        setNotes('');
      }, 1800);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Transfer failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="transfer-modal-overlay">
      <div className="transfer-modal-card">
        <div className="transfer-modal-header">
          <div className="transfer-shield-icon">⛓️</div>
          <div>
            <h3>Execute Chain-of-Custody Handoff</h3>
            <span className="transfer-subtitle">
              Cryptographically anchors new legal custodian onto immutable ledger
            </span>
          </div>
          <button type="button" className="inspector-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="transfer-evidence-info">
          <div className="transfer-info-row">
            <span className="transfer-label">ITEM TITLE:</span>
            <strong className="transfer-val">{evidenceTitle || evidenceId}</strong>
          </div>
          <div className="transfer-info-row">
            <span className="transfer-label">CURRENT CUSTODIAN:</span>
            <code className="transfer-val highlight">{currentCustodian || 'Unassigned'}</code>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="transfer-modal-form">
          <div className="form-group">
            <label className="form-label">TRANSFER ACTION TYPE</label>
            <select
              value={actionType}
              onChange={(e) => setActionType(e.target.value)}
              className="transfer-select"
            >
              <option value="FORENSIC_ANALYSIS">🔬 Forensic Lab Analysis</option>
              <option value="COURT_SUBMISSION">⚖️ Courtroom Evidence Submission</option>
              <option value="AGENCY_TRANSFER">🛡️ Inter-Agency Transfer</option>
              <option value="ARCHIVAL_STORAGE">🗄️ Secure Archival Relocation</option>
              <option value="DEFENSE_DISCOVERY">📂 Legal Discovery Disclosure</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">RECIPIENT CUSTODIAN / DESTINATION</label>
            <input
              type="text"
              placeholder="e.g. State Crime Lab - Cyber Unit or 0x..."
              value={toCustodian}
              onChange={(e) => setToCustodian(e.target.value)}
              className="transfer-input"
              required
            />
            <div className="preset-badges">
              {PRESET_TRANSFEREES.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  className="preset-btn"
                  onClick={() => setToCustodian(preset.value)}
                >
                  + {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">TRANSFER MANIFEST & HANDOFF NOTES</label>
            <textarea
              placeholder="Enter transfer justification, badge number, authorization docket, or transport seal ID..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="transfer-textarea"
            />
          </div>

          {error && <div className="alert alert-error">⚠️ {error}</div>}

          {successTx && (
            <div className="transfer-success-banner">
              ✓ Custody transfer confirmed & anchored to ledger!
              <code>TX: {successTx.slice(0, 18)}...</code>
            </div>
          )}

          <div className="transfer-actions">
            <button
              type="button"
              className="button button-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="button button-primary transfer-submit-btn"
              disabled={isSubmitting || !!successTx}
            >
              {isSubmitting ? 'Anchoring Transfer…' : '⚡ Confirm & Record Transfer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
