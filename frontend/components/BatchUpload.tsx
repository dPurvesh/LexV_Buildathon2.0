'use client';

import { DragEvent, FormEvent, useRef, useState } from 'react';

type FileStatus = 'queued' | 'hashing' | 'checking' | 'duplicate' | 'tampered' | 'uploading' | 'anchored' | 'error';

type BatchFile = {
  file: File;
  status: FileStatus;
  hash: string;
  progress: number;
  error: string;
  isTampered?: boolean;
  matchedTitle?: string;
  similarityPct?: number;
  result?: { minio_object_key: string; eth_tx_hash: string };
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

async function sha256(file: File): Promise<string> {
  const digest = await window.crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function mimeIcon(type: string): string {
  if (type.startsWith('image/')) return '🖼️';
  if (type.startsWith('video/')) return '🎬';
  if (type.startsWith('audio/')) return '🎵';
  return '📄';
}

const STATUS_LABELS: Record<FileStatus, string> = {
  queued: 'Queued',
  hashing: 'Hashing SHA-256…',
  checking: 'Forensic Pre-Check…',
  duplicate: 'Duplicate detected',
  tampered: '⚠ Tampered Derivative',
  uploading: 'Uploading…',
  anchored: '✓ Anchored',
  error: 'Failed',
};

export default function BatchUpload() {
  const [files, setFiles] = useState<BatchFile[]>([]);
  const [caseNumber, setCaseNumber] = useState('CASE-2026-');
  const [custodian, setCustodian] = useState('mock-custodian');
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (newFiles: FileList | File[]) => {
    const batch: BatchFile[] = Array.from(newFiles).map((f) => ({
      file: f,
      status: 'queued' as FileStatus,
      hash: '',
      progress: 0,
      error: '',
    }));
    setFiles((prev) => [...prev, ...batch]);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateFile = (idx: number, update: Partial<BatchFile>) => {
    setFiles((prev) => prev.map((f, i) => (i === idx ? { ...f, ...update } : f)));
  };

  const processAll = async (e: FormEvent) => {
    e.preventDefault();
    if (!files.length) return;
    setBusy(true);

    for (let i = 0; i < files.length; i++) {
      const entry = files[i];
      if (entry.status === 'anchored' || entry.status === 'duplicate') continue;

      try {
        // 1. Hash locally
        updateFile(i, { status: 'hashing', progress: 0, error: '' });
        const hash = await sha256(entry.file);
        updateFile(i, { hash, status: 'checking' });

        // 2. Perform deep forensic pre-check via Verify API
        const vForm = new FormData();
        vForm.append('file', entry.file);
        const verifyRes = await fetch(`${API_BASE}/api/v1/evidence/verify`, {
          method: 'POST',
          body: vForm,
        });
        const verifyData = await verifyRes.json();

        // Exact hash duplicate check
        if (verifyData.verified) {
          updateFile(i, { status: 'duplicate' });
          continue;
        }

        // Tampered derivative check (pHash or PDF text matches existing record)
        let isTamperedFlag = false;
        let matchedTitle = '';
        let similarityPct = 0;

        if (verifyData.match_found) {
          isTamperedFlag = true;
          matchedTitle = verifyData.matched_evidence?.title ?? 'Existing evidence';
          similarityPct = verifyData.matched_evidence?.similarity_pct ?? 0;
          updateFile(i, {
            status: 'tampered',
            isTampered: true,
            matchedTitle,
            similarityPct,
          });
          // Brief pause so investigator sees the tamper detection flag
          await new Promise((r) => setTimeout(r, 800));
        }

        // 3. Upload and anchor to vault and Ethereum
        updateFile(i, { status: 'uploading' });
        const title = entry.file.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');
        const form = new FormData();
        form.append('case_number', caseNumber);
        form.append('title', title);
        form.append('initial_custodian', custodian);
        form.append('client_sha256', hash);
        form.append('file', entry.file);

        const uploadResult = await new Promise<string>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', `${API_BASE}/api/v1/evidence/upload`);
          xhr.upload.onprogress = (pe) => {
            if (pe.lengthComputable) updateFile(i, { progress: Math.round((pe.loaded / pe.total) * 100) });
          };
          xhr.onload = () =>
            xhr.status >= 200 && xhr.status < 300
              ? resolve(xhr.responseText)
              : reject(new Error(JSON.parse(xhr.responseText).detail ?? 'Upload failed'));
          xhr.onerror = () => reject(new Error('Network error'));
          xhr.send(form);
        });

        const result = JSON.parse(uploadResult);
        updateFile(i, {
          status: 'anchored',
          isTampered: isTamperedFlag || result.is_tampered,
          matchedTitle: isTamperedFlag ? matchedTitle : undefined,
          similarityPct: isTamperedFlag ? similarityPct : undefined,
          progress: 100,
          result: { minio_object_key: result.minio_object_key, eth_tx_hash: result.eth_tx_hash },
        });
      } catch (err) {
        updateFile(i, { status: 'error', error: err instanceof Error ? err.message : 'Upload failed' });
      }
    }

    setBusy(false);
  };

  const completed = files.filter((f) => f.status === 'anchored' || f.status === 'duplicate').length;
  const totalProgress = files.length ? Math.round((completed / files.length) * 100) : 0;
  const queuedCount = files.filter((f) => f.status === 'queued' || f.status === 'tampered').length;

  return (
    <section className="panel batch-upload-panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">BATCH EVIDENCE INGESTION</span>
          <h2>Preserve &amp; Cryptographically Anchor Evidence</h2>
          <p className="batch-subtitle">
            Upload multiple files at once with client-side SHA-256 pre-checks, multi-modal tamper detection, MinIO WORM storage, and on-chain ledger registration.
          </p>
        </div>
        <div className="batch-badges">
          <span className="status-chip">🔒 SHA-256 PRE-CHECK</span>
          <span className="status-chip">🔬 FORENSIC TAMPER AUDIT</span>
          <span className="status-chip">⛓️ SEPOLIA ANCHOR</span>
        </div>
      </div>

      <form className="batch-form" onSubmit={processAll}>
        <div className="batch-fields-grid">
          <div className="batch-field-card">
            <div className="batch-field-header">
              <span className="batch-field-icon">📁</span>
              <label htmlFor="batch-case">Case Identifier</label>
            </div>
            <input
              id="batch-case"
              value={caseNumber}
              onChange={(e) => setCaseNumber(e.target.value)}
              placeholder="e.g. CASE-2026-CR-8092"
              required
            />
            <small className="batch-field-hint">Docket / case number for this batch</small>
          </div>

          <div className="batch-field-card">
            <div className="batch-field-header">
              <span className="batch-field-icon">🛡️</span>
              <label htmlFor="batch-custodian">Initial Custodian</label>
            </div>
            <input
              id="batch-custodian"
              value={custodian}
              onChange={(e) => setCustodian(e.target.value)}
              placeholder="e.g. Officer Smith / 0x..."
              required
            />
            <small className="batch-field-hint">Officer, lab tech, or address logging the handoff</small>
          </div>
        </div>

        <div
          className={`batch-dropzone ${dragging ? 'batch-dropzone-active' : ''}`}
          onDragEnter={() => setDragging(true)}
          onDragLeave={() => setDragging(false)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            hidden
            multiple
            accept="image/*,audio/*,video/*,.pdf,application/pdf"
            onChange={(e) => {
              if (e.target.files?.length) addFiles(e.target.files);
            }}
          />
          <div className="batch-dropzone-inner">
            <div className="batch-dropzone-icon">📥</div>
            <strong className="batch-dropzone-title">Drag &amp; drop evidence files here</strong>
            <p className="batch-dropzone-desc">or click anywhere to browse local files from your workstation</p>
            <div className="batch-format-pills">
              <span>🖼️ Images (JPG, PNG)</span>
              <span>🎬 Video (MP4, MKV)</span>
              <span>🎵 Audio (WAV, MP3)</span>
              <span>📄 Documents (PDF)</span>
            </div>
          </div>
        </div>

        {files.length > 0 && (
          <div className="file-queue-section">
            <div className="file-queue-header">
              <div className="file-queue-title">
                <strong>Ingestion Queue</strong>
                <span className="result-count">
                  {files.length} file{files.length !== 1 ? 's' : ''} staged
                </span>
              </div>
              <div className="file-queue-meta">
                <span>
                  {completed} / {files.length} processed
                </span>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setFiles([])}
                  disabled={busy}
                  style={{ color: '#ef4444', marginLeft: '12px' }}
                >
                  Clear all
                </button>
              </div>
            </div>

            <div className="file-queue-list">
              {files.map((entry, i) => (
                <div className={`file-queue-item file-status-${entry.isTampered ? 'tampered' : entry.status}`} key={i}>
                  <span className="fq-icon">{mimeIcon(entry.file.type)}</span>
                  <div className="fq-info">
                    <strong title={entry.file.name}>{entry.file.name}</strong>
                    <div className="fq-meta">
                      <span>{formatSize(entry.file.size)}</span>
                      {entry.hash && <code className="fq-hash">SHA: {entry.hash.slice(0, 16)}…</code>}
                      {entry.matchedTitle && (
                        <span style={{ color: '#ef4444', fontWeight: 600 }}>
                          ⚠ Derivative of &quot;{entry.matchedTitle}&quot; ({entry.similarityPct}%)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="fq-status">
                    <span className={`file-status-label status-${entry.isTampered && entry.status === 'anchored' ? 'tampered' : entry.status}`}>
                      {entry.isTampered && entry.status === 'anchored'
                        ? '⚠ Anchored (Tamper Alert)'
                        : STATUS_LABELS[entry.status]}
                    </span>
                    {entry.status === 'uploading' && (
                      <div className="fq-progress-bar">
                        <div style={{ width: `${entry.progress}%` }} />
                      </div>
                    )}
                    {entry.status === 'error' && <span className="fq-error-text">{entry.error}</span>}
                  </div>
                  {entry.status === 'queued' && (
                    <button
                      type="button"
                      className="fq-remove-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(i);
                      }}
                      title="Remove file"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            {busy && (
              <div className="batch-overall-progress">
                <div className="progress-wrap">
                  <div className="progress-bar" style={{ width: `${totalProgress}%` }} />
                  <span>{totalProgress}% total batch progress</span>
                </div>
              </div>
            )}

            <div className="batch-actions-bar">
              <button className="button button-primary batch-submit-btn" disabled={busy || queuedCount === 0}>
                {busy
                  ? 'Processing & Anchoring Batch…'
                  : `🔒 Ingest & Anchor ${queuedCount} Evidence File${queuedCount !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        )}
      </form>
    </section>
  );
}
