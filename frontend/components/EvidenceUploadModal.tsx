'use client';

import { FormEvent, useRef, useState } from 'react';

type UploadResult = { minio_object_key: string; eth_tx_hash: string; block_number: number; mock_chain?: boolean };
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
const EXPLORER_BASE = process.env.NEXT_PUBLIC_BLOCK_EXPLORER_URL || 'https://coral.mstscan.com';

async function sha256(file: File) {
  const digest = await window.crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export default function EvidenceUploadModal() {
  const [caseNumber, setCaseNumber] = useState('CASE-2026-');
  const [title, setTitle] = useState('');
  const [custodian, setCustodian] = useState('mock-custodian');
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!file) { setError('Select an evidence file first.'); return; }
    setBusy(true); setError(''); setResult(null); setProgress(0);
    try {
      const digest = await sha256(file);
      const form = new FormData();
      form.append('case_number', caseNumber);
      form.append('title', title);
      form.append('initial_custodian', custodian);
      form.append('client_sha256', digest);
      form.append('file', file);
      const response = await new Promise<XMLHttpRequest>((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open('POST', `${API_BASE}/api/v1/evidence/upload`);
        request.upload.onprogress = (progressEvent) => { if (progressEvent.lengthComputable) setProgress(Math.round((progressEvent.loaded / progressEvent.total) * 100)); };
        request.onload = () => request.status >= 200 && request.status < 300 ? resolve(request) : reject(new Error(JSON.parse(request.responseText).detail ?? 'Upload failed'));
        request.onerror = () => reject(new Error('Network error while uploading evidence'));
        request.send(form);
      });
      setResult(JSON.parse(response.responseText));
      setProgress(100);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Upload failed');
    } finally { setBusy(false); }
  }

  return <section className="panel upload-panel"><div className="section-heading"><div><span className="eyebrow">NEW EVIDENCE</span><h2>Preserve a new item in the vault</h2></div><span className="status-chip">SHA-256 + WORM</span></div><form className="evidence-form" onSubmit={submit}><label>Case number<input value={caseNumber} onChange={(event) => setCaseNumber(event.target.value)} required /></label><label>Evidence title<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Traffic camera still, 14:32" required /></label><label>Initial custodian<input value={custodian} onChange={(event) => setCustodian(event.target.value)} required /><small>Use an MST address or mock-custodian for local mode.</small></label><div className="file-picker"><input ref={fileInput} type="file" accept="image/*,audio/*,video/*,.pdf,application/pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} required /><span>{file?.name ?? 'Images, audio, video, or PDF'}</span><button type="button" className="button button-secondary" onClick={() => fileInput.current?.click()}>Choose file</button></div>{busy && <div className="progress-wrap"><div className="progress-bar" style={{ width: `${progress}%` }} /><span>{progress}% uploaded</span></div>}{error && <div className="alert alert-error">{error}</div>}<button className="button button-primary" disabled={busy}>{busy ? 'Anchoring evidence…' : 'Upload and anchor evidence'}</button></form>{result && <div className="result-card verified-card upload-result"><span className="badge badge-green">EVIDENCE ANCHORED</span><div className="facts-grid"><div><small>MinIO object key</small><code>{result.minio_object_key}</code></div><div><small>Transaction hash</small><code>{result.eth_tx_hash?.startsWith('0x') ? <a href={`${EXPLORER_BASE.replace(/\/$/, '')}/tx/${result.eth_tx_hash}`} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>{result.eth_tx_hash.slice(0, 10)}… ↗ (MSTScan)</a> : result.eth_tx_hash}</code></div><div><small>Block</small><strong>{result.block_number || 'Mock ledger'}</strong></div></div></div>}</section>;
}
