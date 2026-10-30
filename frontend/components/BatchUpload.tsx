'use client';

import { DragEvent, FormEvent, useRef, useState } from 'react';
import LiveCrimeShutter from './LiveCrimeShutter';
import { ImageIcon, Video, Music, FileText, FolderGit2, ShieldCheck, Camera, Download, X, AlertTriangle, CheckCircle2, Lock, RefreshCw, Cpu, Hourglass } from 'lucide-react';

type FileStatus = 'queued' | 'hashing' | 'checking' | 'duplicate' | 'tampered' | 'uploading' | 'mining' | 'anchored' | 'error';

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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' ? 'https://lexvault-backend.onrender.com' : 'http://localhost:8000');

async function sha256(file: File): Promise<string> {
  const digest = await window.crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function mimeIcon(type: string): React.ReactNode {
  if (type.startsWith('image/')) return <ImageIcon size={18} color="var(--cyan)" />;
  if (type.startsWith('video/')) return <Video size={18} color="#a855f7" />;
  if (type.startsWith('audio/')) return <Music size={18} color="var(--amber)" />;
  return <FileText size={18} color="var(--crimson)" />;
}

const STATUS_LABELS: Record<FileStatus, string> = {
  queued: 'Queued for Ingestion',
  hashing: 'WebCrypto SHA-256…',
  checking: 'Forensic Pre-Check…',
  duplicate: 'Duplicate Hash Detected',
  tampered: 'Tampered Derivative',
  uploading: 'Streaming to WORM Vault…',
  mining: 'Mining on MST Chain (~15-20s)…',
  anchored: 'Anchored & Sealed',
  error: 'Ingestion Error',
};

export default function BatchUpload() {
  const [files, setFiles] = useState<BatchFile[]>([]);
  const [caseNumber, setCaseNumber] = useState('CASE-2026-');
  const [custodian, setCustodian] = useState('mock-custodian');
  const [intakeMode, setIntakeMode] = useState<'batch' | 'shutter'>('batch');
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
        // 1. Hash locally using client WebCrypto
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
          // Brief pause so investigator observes the alert
          await new Promise((r) => setTimeout(r, 800));
        }

        // 3. Upload and anchor to vault and MST Blockchain
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
            if (pe.lengthComputable) {
              const pct = Math.round((pe.loaded / pe.total) * 100);
              updateFile(i, { progress: pct });
              if (pct >= 100) {
                updateFile(i, { status: 'mining', progress: 100 });
              }
            }
          };
          xhr.upload.onload = () => {
            updateFile(i, { status: 'mining', progress: 100 });
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
  const queuedCount = files.filter((f) => f.status === 'queued' || f.status === 'tampered' || f.status === 'error').length;
  const errorCount = files.filter((f) => f.status === 'error').length;

  return (
    <section className="panel batch-upload-panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">[03] SECURE INGESTION &amp; IMMUTABLE ANCHORING</span>
          <h2>Digital Evidence Ingestion Pipeline</h2>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <span className="status-chip">365D WORM Lock</span>
          <span className="status-chip">MST Blockchain Public Anchor</span>
        </div>
      </div>

      {/* ─── 4-Stage Ingestion Pipeline Tracker ─── */}
      <div className="pipeline-tracker">
        <div className={`pipeline-step ${files.length > 0 ? (busy ? 'complete' : 'active') : ''}`}>
          <span className="pipeline-step-num">STAGE 01</span>
          <span className="pipeline-step-name">Client WebCrypto Hashing</span>
          <span className="pipeline-step-sub">In-memory SHA-256 pre-check</span>
        </div>
        <div className={`pipeline-step ${busy ? 'active' : completed > 0 ? 'complete' : ''}`}>
          <span className="pipeline-step-num">STAGE 02</span>
          <span className="pipeline-step-name">Multipart S3 Stream</span>
          <span className="pipeline-step-sub">MinIO 365D Compliance lock</span>
        </div>
        <div className={`pipeline-step ${completed > 0 ? 'complete' : ''}`}>
          <span className="pipeline-step-num">STAGE 03</span>
          <span className="pipeline-step-name">MST Settlement</span>
          <span className="pipeline-step-sub">On-chain transaction anchor</span>
        </div>
        <div className={`pipeline-step ${completed > 0 ? 'complete' : ''}`}>
          <span className="pipeline-step-num">STAGE 04</span>
          <span className="pipeline-step-name">Multimodal AI Extraction</span>
          <span className="pipeline-step-sub">Whisper speech &amp; CLIP vectors</span>
        </div>
      </div>

      {/* ─── Intake Channel Switcher ─── */}
      <div className="intake-channel-nav" style={{ display: 'flex', gap: '10px', margin: '4px 0 16px 0' }}>
        <button
          type="button"
          className={`button ${intakeMode === 'batch' ? 'button-primary' : 'button-secondary'}`}
          onClick={() => setIntakeMode('batch')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '13px' }}
        >
          <FolderGit2 size={15} /> Batch Evidence Intake Pipeline
        </button>
        <button
          type="button"
          className={`button ${intakeMode === 'shutter' ? 'button-primary' : 'button-secondary'}`}
          onClick={() => setIntakeMode('shutter')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '13px', border: intakeMode === 'shutter' ? 'none' : '1px solid var(--emerald)' }}
        >
          <Camera size={15} color={intakeMode === 'shutter' ? '#ffffff' : 'var(--emerald)'} /> 
          <span style={{ color: intakeMode === 'shutter' ? '#ffffff' : 'var(--emerald)', fontWeight: 600 }}>
            Live Crime Scene Shutter (On-Spot Seizure)
          </span>
        </button>
      </div>

      {intakeMode === 'shutter' ? (
        <LiveCrimeShutter defaultCase={caseNumber} defaultCustodian={custodian} />
      ) : (
      <form onSubmit={processAll} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          <div className="inspector-card">
            <div className="inspector-card-header">
              <span className="inspector-card-title" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <FolderGit2 size={15} color="var(--cyan)" /> Case Docket Number
              </span>
            </div>
            <input
              id="batch-case"
              className="search-input"
              style={{ padding: '12px 14px' }}
              value={caseNumber}
              onChange={(e) => setCaseNumber(e.target.value)}
              placeholder="e.g. CASE-2026-CR-8092"
              required
            />
            <small style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', display: 'block' }}>
              Docket or statutory case identifier
            </small>
          </div>

          <div className="inspector-card">
            <div className="inspector-card-header">
              <span className="inspector-card-title" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={15} color="var(--cyan)" /> Initial Custodian
              </span>
            </div>
            <input
              id="batch-custodian"
              className="search-input"
              style={{ padding: '12px 14px' }}
              value={custodian}
              onChange={(e) => setCustodian(e.target.value)}
              placeholder="e.g. Officer Smith / 0x..."
              required
            />
            <small style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', display: 'block' }}>
              Officer, laboratory specialist, or MST address
            </small>
          </div>
        </div>

        {/* Dropzone */}
        <div
          className={`radar-scanner-container ${dragging ? 'dropzone-active' : ''}`}
          style={{ padding: '36px 20px' }}
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
          <div className="radar-core-icon" style={{ width: '52px', height: '52px' }}>
            <Download size={24} color="var(--cyan)" />
          </div>
          <strong style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', zIndex: 2 }}>
            Drag &amp; drop evidence files to stage for ingestion
          </strong>
          <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '4px', zIndex: 2 }}>
            or click to browse files from your local forensic workstation
          </p>
          <div className="radar-formats-pill">
            <span>FORMATS:</span> IMAGES (JPG, PNG) &bull; VIDEO (MP4) &bull; AUDIO (WAV) &bull; PDF DOCUMENTS
          </div>
        </div>

        {/* File Queue */}
        {files.length > 0 && (
          <div className="inspector-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <strong style={{ fontSize: '15px', color: 'var(--text-primary)' }}>Ingestion Staging Queue</strong>
                <span className="status-chip" style={{ marginLeft: '10px' }}>
                  {files.length} File{files.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ font: '600 12px var(--font-mono)', color: 'var(--text-muted)' }}>
                  {completed} / {files.length} Processed
                </span>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setFiles([])}
                  disabled={busy}
                  style={{ color: 'var(--crimson)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <X size={13} /> Clear All
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {files.map((entry, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: 'rgba(8, 12, 20, 0.6)',
                    border: `1px solid ${entry.isTampered ? 'var(--crimson-border)' : 'var(--border-subtle)'}`,
                    borderRadius: 'var(--radius-md)',
                    gap: '14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '220px' }}>
                    <span style={{ fontSize: '20px' }}>{mimeIcon(entry.file.type)}</span>
                    <div>
                      <strong style={{ fontSize: '13.5px', color: 'var(--text-primary)', display: 'block' }}>
                        {entry.file.name}
                      </strong>
                      {entry.error ? (
                        <small style={{ font: '500 11px var(--font-mono)', color: 'var(--crimson)', display: 'block' }}>
                          {entry.error}
                        </small>
                      ) : (
                        <small style={{ font: '500 11px var(--font-mono)', color: 'var(--text-muted)' }}>
                          {formatSize(entry.file.size)}
                        </small>
                      )}
                    </div>
                  </div>

                  {entry.hash && (
                    <code style={{ fontSize: '11px', color: 'var(--cyan)' }}>
                      SHA: {entry.hash.slice(0, 16)}…
                    </code>
                  )}

                  {entry.matchedTitle && (
                    <span style={{ color: 'var(--crimson)', font: '600 11.5px var(--font-sans)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <AlertTriangle size={12} /> Derivative of &ldquo;{entry.matchedTitle}&rdquo; ({entry.similarityPct}%)
                    </span>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {entry.status === 'mining' ? (
                      <span
                        className="tamper-badge"
                        style={{
                          background: 'var(--orange-bg)',
                          border: '1px solid var(--orange-border-soft)',
                          color: 'var(--orange-text)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                      >
                        <Hourglass size={11} className="spin-slow" /> Mining on MST Chain (~15s)
                      </span>
                    ) : (
                      <span
                        className={`tamper-badge ${
                          entry.isTampered
                            ? 'tamper-alert'
                            : entry.status === 'anchored'
                            ? 'tamper-clean'
                            : ''
                        }`}
                        style={{
                          background:
                            entry.status === 'queued'
                              ? 'rgba(255,255,255,0.06)'
                              : entry.status === 'hashing' || entry.status === 'uploading'
                              ? 'var(--cyan-subtle)'
                              : undefined,
                          color:
                            entry.status === 'queued'
                              ? 'var(--text-muted)'
                              : entry.status === 'hashing' || entry.status === 'uploading'
                              ? 'var(--cyan)'
                              : undefined,
                        }}
                      >
                        {entry.isTampered && entry.status === 'anchored' ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <AlertTriangle size={11} /> ANCHORED (TAMPER ALERT)
                          </span>
                        ) : entry.status === 'anchored' ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle2 size={11} /> {STATUS_LABELS[entry.status]}
                          </span>
                        ) : (
                          STATUS_LABELS[entry.status]
                        )}
                      </span>
                    )}

                    {(entry.status === 'queued' || entry.status === 'error') && (
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        style={{ color: 'var(--text-muted)', padding: '4px', display: 'flex', alignItems: 'center' }}
                        title="Remove file"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {busy && (
              <div style={{ marginTop: '16px' }}>
                <div className="hashing-track">
                  <div className="hashing-bar" style={{ width: `${totalProgress}%` }} />
                </div>
                <small style={{ display: 'block', textAlign: 'center', marginTop: '6px', font: '600 11px var(--font-mono)', color: 'var(--primary)' }}>
                  {totalProgress}% TOTAL BATCH PROGRESS
                </small>

                {files.some((f) => f.status === 'mining') && (
                  <div
                    style={{
                      marginTop: '12px',
                      padding: '12px 16px',
                      background: 'var(--orange-bg)',
                      border: '1px solid var(--orange-border-soft)',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                    }}
                  >
                    <Cpu size={18} color="var(--orange-text)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ fontSize: '12px', color: 'var(--orange-text)', lineHeight: 1.5 }}>
                      <strong style={{ display: 'block', font: '700 12px var(--font-heading)', color: 'var(--orange-text-alt)', marginBottom: '2px' }}>
                        ⛓️ MST Blockchain Decentralized Consensus in Progress (~12–25s)
                      </strong>
                      WORM storage upload confirmed. The backend has broadcasted a real smart contract transaction to MST Blockchain and is awaiting receipt validation from decentralized validators. This delay is direct cryptographic proof of on-chain mining rather than a synthetic database write.
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                className="button button-primary"
                disabled={busy || queuedCount === 0}
                style={{ padding: '12px 28px', fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                {files.some((f) => f.status === 'mining') ? (
                  <>
                    <Hourglass size={15} className="spin-slow" />
                    Awaiting MST Block Confirmation…
                  </>
                ) : busy ? (
                  'Executing Ingestion Pipeline…'
                ) : errorCount > 0 ? (
                  <>
                    <RefreshCw size={15} />
                    Retry Ingestion ({queuedCount} File{queuedCount !== 1 ? 's' : ''})
                  </>
                ) : (
                  <>
                    <Lock size={15} />
                    Ingest &amp; Seal {queuedCount} Evidence File{queuedCount !== 1 ? 's' : ''}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </form>
      )}
    </section>
  );
}
