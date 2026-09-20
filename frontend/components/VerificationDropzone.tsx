'use client';

import { DragEvent, useState } from 'react';

type VerificationResponse = {
  verified: boolean;
  sha256_hash: string;
  reason?: string;
  title?: string;
  on_chain?: {
    registered_at?: number;
    current_custodian?: string;
    block_number?: number;
    tx_hash?: string;
  };
  custody_history?: Array<{ to_custodian: string; timestamp: string; eth_tx_hash?: string }>;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

async function sha256(file: File) {
  const digest = await window.crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function explorerLink(tx?: string) {
  return tx?.startsWith('0x') ? `https://sepolia.etherscan.io/tx/${tx}` : undefined;
}

export default function VerificationDropzone() {
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [hash, setHash] = useState('');
  const [result, setResult] = useState<VerificationResponse | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function verify(file: File) {
    setBusy(true);
    setError('');
    setResult(null);
    setFileName(file.name);
    try {
      const computed = await sha256(file);
      setHash(computed);
      const response = await fetch(`${API_BASE}/api/v1/evidence/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sha256_hash: computed }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.detail ?? 'Verification request failed');
      setResult(payload);
    } catch (verificationError) {
      setError(verificationError instanceof Error ? verificationError.message : 'Verification failed');
    } finally {
      setBusy(false);
    }
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) void verify(file);
  }

  const tx = result?.on_chain?.tx_hash ?? result?.custody_history?.[0]?.eth_tx_hash;
  const registeredAt = result?.on_chain?.registered_at ? new Date(result.on_chain.registered_at * 1000).toLocaleString() : 'Unavailable';

  return (
    <section className="panel verification-panel">
      <div className="section-heading">
        <div><span className="eyebrow">PUBLIC TAMPER CHECK</span><h2>Verify a file before it enters the vault</h2></div>
        <span className="status-chip">Browser-only hash</span>
      </div>
      <div className={`dropzone ${dragging ? 'dropzone-active' : ''}`} onDragEnter={() => setDragging(true)} onDragLeave={() => setDragging(false)} onDragOver={(event) => event.preventDefault()} onDrop={onDrop}>
        <input id="verify-file" type="file" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void verify(file); }} />
        <label htmlFor="verify-file" className="dropzone-content"><span className="upload-mark">↥</span><strong>{busy ? 'Computing SHA-256…' : 'Drop evidence here'}</strong><span>or choose a local image, audio, video, or PDF</span></label>
      </div>
      {fileName && <div className="hash-line"><span>{fileName}</span><code>{hash}</code></div>}
      {error && <div className="alert alert-error">{error}</div>}
      {result?.verified ? <div className="result-card verified-card"><div className="result-title"><span className="badge badge-green">AUTHENTIC &amp; VERIFIED</span><strong>{result.title}</strong></div><div className="facts-grid"><div><small>Registered</small><strong>{registeredAt}</strong></div><div><small>Custodian</small><strong>{result.on_chain?.current_custodian ?? 'Unavailable'}</strong></div><div><small>Block</small><strong>{result.on_chain?.block_number ?? 'Mock ledger'}</strong></div><div><small>Transaction</small>{explorerLink(tx) ? <a href={explorerLink(tx)} target="_blank" rel="noreferrer">View on explorer ↗</a> : <strong>{tx ?? 'Mock transaction'}</strong>}</div></div></div> : result && <div className="result-card breach-card"><div className="result-title"><span className="badge badge-red">TAMPERED / INTEGRITY BREACH</span><strong>Digest does not match a registered evidence record</strong></div><div className="anomaly-list"><span>SHA-256 lookup: {result.reason ?? 'Evidence not found'}</span><span>ELA compression anomalies: requires indexed media analysis</span><span>Perceptual hash divergence: requires indexed media analysis</span></div></div>}
    </section>
  );
}
