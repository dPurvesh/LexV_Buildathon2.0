'use client';

import { FormEvent, useState } from 'react';

type CustodyEntry = { from_custodian: string; to_custodian: string; action_type: string; notes?: string; eth_tx_hash?: string; timestamp: string };
type Evidence = { evidence_id?: string; sha256_hash: string; title?: string; custody_history?: CustodyEntry[] };
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

const shorten = (value?: string) => value && value.length > 12 ? `${value.slice(0, 6)}...${value.slice(-4)}` : value || 'Unknown';
const txLink = (hash?: string) => hash?.startsWith('0x') ? `https://sepolia.etherscan.io/tx/${hash}` : undefined;

export default function CustodyTimeline({ evidence, onTransferred }: { evidence: Evidence | null; onTransferred: (payload: unknown) => void }) {
  const [open, setOpen] = useState(false);
  const [toCustodian, setToCustodian] = useState('');
  const [action, setAction] = useState('COURT_SUBMISSION');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (!evidence)
    return (
      <section className="panel timeline-panel custody-empty-state">
        <div className="custody-empty-icon">⛓️</div>
        <div className="custody-empty-content">
          <span className="eyebrow">CHAIN OF CUSTODY</span>
          <h2>Select evidence to inspect its timeline</h2>
          <p>Click any evidence record above or verify a file to view its immutable cryptographic handoff history.</p>
        </div>
      </section>
    );
  const selectedEvidence = evidence;

  async function transfer(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      if (!selectedEvidence.evidence_id) throw new Error('Selected evidence has no identifier');
      const response = await fetch(`${API_BASE}/api/v1/evidence/${selectedEvidence.evidence_id}/custody`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to_custodian: toCustodian, action_type: action, notes }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.detail ?? 'Custody transfer failed');
      onTransferred(payload); setOpen(false); setToCustodian(''); setNotes('');
    } catch (transferError) { setError(transferError instanceof Error ? transferError.message : 'Custody transfer failed'); } finally { setBusy(false); }
  }

  return <section className="panel timeline-panel"><div className="section-heading"><div><span className="eyebrow">CHAIN OF CUSTODY</span><h2>{evidence.title ?? 'Evidence timeline'}</h2></div><button className="button button-secondary" onClick={() => setOpen(!open)}>+ Transfer custody</button></div><div className="timeline">{(evidence.custody_history ?? []).map((entry, index) => <div className="timeline-node" key={`${entry.timestamp}-${index}`}><span className="timeline-dot" /><div className="timeline-copy"><div className="timeline-top"><strong>{entry.action_type}</strong><time>{new Date(entry.timestamp).toLocaleString()}</time></div><p>{shorten(entry.from_custodian)} <span>→</span> {shorten(entry.to_custodian)}</p>{entry.notes && <small>{entry.notes}</small>}{txLink(entry.eth_tx_hash) ? <a href={txLink(entry.eth_tx_hash)} target="_blank" rel="noreferrer">Transaction {shorten(entry.eth_tx_hash)} ↗</a> : <small>Mock ledger transaction</small>}</div></div>)}</div>{open && <form className="transfer-form" onSubmit={transfer}><label>To custodian<input value={toCustodian} onChange={(event) => setToCustodian(event.target.value)} placeholder="0x... or mock-custodian" required /></label><label>Action<select value={action} onChange={(event) => setAction(event.target.value)}><option>FORENSIC_ANALYSIS</option><option>COURT_SUBMISSION</option><option>CUSTODY_TRANSFER</option></select></label><label>Notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Reason for handoff" /></label>{error && <div className="alert alert-error">{error}</div>}<button className="button button-primary" disabled={busy}>{busy ? 'Recording…' : 'Record transfer'}</button></form>}</section>;
}
