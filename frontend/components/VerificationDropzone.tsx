'use client';

import { DragEvent, useEffect, useRef, useState } from 'react';

type MatchedEvidence = {
  id: string;
  case_number: string;
  title: string;
  file_name: string;
  mime_type: string;
  original_phash?: string;
  uploaded_phash?: string;
  hamming_distance?: number;
  similarity_pct: number;
  current_custodian?: string;
  created_at?: string;
};

type TextDiff = {
  similarity_ratio: number;
  is_tampered: boolean;
  lines_added_count: number;
  lines_removed_count: number;
  added_samples: string[];
  removed_samples: string[];
};

type VerificationResponse = {
  verified: boolean;
  is_authentic?: boolean;
  sha256_hash: string;
  reason?: string;
  evidence_id?: string;
  title?: string;
  case_number?: string;
  file_name?: string;
  mime_type?: string;
  match_found?: boolean;
  match_type?: 'exact_hash' | 'phash' | 'pdf_text' | 'audio_video';
  matched_evidence?: MatchedEvidence;
  tamper_score?: number;
  is_tampered?: boolean;
  phash?: string;
  ela_heatmap_b64?: string;
  uploaded_b64?: string;
  original_b64?: string;
  diff_heatmap_b64?: string;
  changed_pixels_ratio?: number;
  text_diff?: TextDiff;
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

  // Comparison controls
  const [activeTab, setActiveTab] = useState<'slider' | 'side_by_side' | 'heatmap' | 'phash'>('slider');
  const [sliderMode, setSliderMode] = useState<'orig_vs_upload' | 'upload_vs_ela'>('orig_vs_upload');
  const [sliderPos, setSliderPos] = useState(50);
  const [draggingSlider, setDraggingSlider] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSliderMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setSliderPos((x / rect.width) * 100);
  };

  useEffect(() => {
    if (!draggingSlider) return;
    const onMove = (e: MouseEvent) => handleSliderMove(e.clientX);
    const onTouchMove = (e: TouchEvent) => handleSliderMove(e.touches[0].clientX);
    const onUp = () => setDraggingSlider(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchend', onUp);
    };
  }, [draggingSlider]);

  async function verify(file: File) {
    setBusy(true);
    setError('');
    setResult(null);
    setFileName(file.name);
    try {
      // 1. Calculate local SHA-256 for instant verification badge & feedback
      const computed = await sha256(file);
      setHash(computed);

      // 2. Send the actual binary file via FormData so backend can run pHash, ELA, and content diff
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE}/api/v1/evidence/verify`, {
        method: 'POST',
        body: formData,
      });
      const payload: VerificationResponse = await response.json();
      if (!response.ok) throw new Error((payload as { detail?: string }).detail ?? 'Verification request failed');
      setResult(payload);
      // Auto-select slider mode based on available images
      if (payload.original_b64 && payload.uploaded_b64) {
        setSliderMode('orig_vs_upload');
        setActiveTab('slider');
      } else if (payload.uploaded_b64 && payload.ela_heatmap_b64) {
        setSliderMode('upload_vs_ela');
        setActiveTab('slider');
      } else if (payload.ela_heatmap_b64) {
        setActiveTab('heatmap');
      }
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
  const tamperScore = result?.tamper_score ?? 0;
  const tamperScoreColor = tamperScore >= 0.25 ? '#ef4444' : tamperScore >= 0.1 ? '#f59e0b' : '#10b981';

  const renderImageForensics = (res: VerificationResponse) => {
    const hasSlider = (res.original_b64 && res.uploaded_b64) || (res.uploaded_b64 && res.ela_heatmap_b64);
    const hasSideBySide = Boolean(res.original_b64 && res.uploaded_b64);
    const hasHeatmap = Boolean(res.ela_heatmap_b64);
    const hasPhash = Boolean(res.matched_evidence?.original_phash || res.phash);

    return (
      <>
        <div className="verify-mode-tabs" style={{ marginTop: '20px' }}>
          {hasSlider && (
            <button
              className={`verify-tab-btn ${activeTab === 'slider' ? 'active' : ''}`}
              onClick={() => setActiveTab('slider')}
            >
              ⟷ Interactive Slider
            </button>
          )}
          {hasSideBySide && (
            <button
              className={`verify-tab-btn ${activeTab === 'side_by_side' ? 'active' : ''}`}
              onClick={() => setActiveTab('side_by_side')}
            >
              ⊞ Side-by-Side Comparison
            </button>
          )}
          {hasHeatmap && (
            <button
              className={`verify-tab-btn ${activeTab === 'heatmap' ? 'active' : ''}`}
              onClick={() => setActiveTab('heatmap')}
            >
              🔬 ELA Compression Heatmap
            </button>
          )}
          {hasPhash && (
            <button
              className={`verify-tab-btn ${activeTab === 'phash' ? 'active' : ''}`}
              onClick={() => setActiveTab('phash')}
            >
              # Perceptual Hash Details
            </button>
          )}
        </div>

        {/* View Tab 1: Interactive Slider */}
        {activeTab === 'slider' && hasSlider && (
          <div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              {res.original_b64 && res.uploaded_b64 && (
                <button
                  className={`button button-small ${sliderMode === 'orig_vs_upload' ? 'button-primary' : 'button-secondary'}`}
                  onClick={() => setSliderMode('orig_vs_upload')}
                >
                  Original vs Uploaded
                </button>
              )}
              {res.uploaded_b64 && res.ela_heatmap_b64 && (
                <button
                  className={`button button-small ${sliderMode === 'upload_vs_ela' ? 'button-primary' : 'button-secondary'}`}
                  onClick={() => setSliderMode('upload_vs_ela')}
                >
                  Uploaded vs ELA Heatmap
                </button>
              )}
            </div>

            <div
              className="ela-container"
              ref={containerRef}
              onMouseDown={() => setDraggingSlider(true)}
              onTouchStart={(e) => {
                handleSliderMove(e.touches[0].clientX);
                setDraggingSlider(true);
              }}
            >
              {sliderMode === 'orig_vs_upload' && res.original_b64 && res.uploaded_b64 ? (
                <>
                  <img
                    className="ela-image"
                    src={`data:image/png;base64,${res.original_b64}`}
                    alt="Original evidence"
                    draggable={false}
                  />
                  <img
                    className="ela-image ela-overlay"
                    src={`data:image/png;base64,${res.uploaded_b64}`}
                    alt="Uploaded altered evidence"
                    draggable={false}
                    style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
                  />
                  <span className="ela-label ela-label-left">ORIGINAL (VAULT)</span>
                  <span className="ela-label ela-label-right">MODIFIED (UPLOADED)</span>
                </>
              ) : (
                <>
                  <img
                    className="ela-image"
                    src={`data:image/png;base64,${res.uploaded_b64}`}
                    alt="Uploaded evidence"
                    draggable={false}
                  />
                  {res.ela_heatmap_b64 && (
                    <img
                      className="ela-image ela-overlay"
                      src={`data:image/png;base64,${res.ela_heatmap_b64}`}
                      alt="ELA heatmap"
                      draggable={false}
                      style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
                    />
                  )}
                  <span className="ela-label ela-label-left">UPLOADED IMAGE</span>
                  <span className="ela-label ela-label-right">ELA HEATMAP</span>
                </>
              )}
              <div className="ela-slider" style={{ left: `${sliderPos}%` }}>
                <div className="ela-slider-handle">⟷</div>
              </div>
            </div>
          </div>
        )}

        {/* View Tab 2: Side-by-Side Comparison */}
        {activeTab === 'side_by_side' && hasSideBySide && (
          <div className="side-by-side-grid">
            {res.original_b64 && (
              <div className="compare-card">
                <div className="compare-card-header">
                  <span>ORIGINAL EVIDENCE (VAULT)</span>
                  <span className="badge badge-green">REGISTERED</span>
                </div>
                <div className="compare-card-body">
                  <img
                    className="compare-img"
                    src={`data:image/png;base64,${res.original_b64}`}
                    alt="Original evidence"
                  />
                </div>
                <div className="compare-card-footer">
                  Case: {res.matched_evidence?.case_number ?? res.case_number ?? 'N/A'}
                </div>
              </div>
            )}

            {res.uploaded_b64 && (
              <div className="compare-card">
                <div className="compare-card-header">
                  <span>UPLOADED FILE (TAMPERED)</span>
                  <span className="badge badge-red">ALTERED</span>
                </div>
                <div className="compare-card-body">
                  <img
                    className="compare-img"
                    src={`data:image/png;base64,${res.uploaded_b64}`}
                    alt="Uploaded altered evidence"
                  />
                </div>
                <div className="compare-card-footer">
                  SHA-256 differs from original record
                </div>
              </div>
            )}

            {(res.diff_heatmap_b64 ?? res.ela_heatmap_b64) && (
              <div className="compare-card">
                <div className="compare-card-header">
                  <span>{res.diff_heatmap_b64 ? 'PIXEL DIFFERENCE HEATMAP' : 'ELA COMPRESSION HEATMAP'}</span>
                  <span className="badge badge-red">ANOMALIES</span>
                </div>
                <div className="compare-card-body">
                  <img
                    className="compare-img"
                    src={`data:image/png;base64,${res.diff_heatmap_b64 ?? res.ela_heatmap_b64}`}
                    alt="Difference heatmap"
                  />
                </div>
                <div className="compare-card-footer">
                  {res.changed_pixels_ratio !== undefined
                    ? `${(res.changed_pixels_ratio * 100).toFixed(1)}% pixels altered`
                    : 'Splicing & compression disparity highlighted'}
                </div>
              </div>
            )}
          </div>
        )}

        {/* View Tab 3: Full ELA Heatmap */}
        {activeTab === 'heatmap' && res.ela_heatmap_b64 && (
          <div style={{ marginTop: '14px' }}>
            <img
              style={{ width: '100%', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}
              src={`data:image/png;base64,${res.ela_heatmap_b64}`}
              alt="ELA Heatmap"
            />
            <div className="ela-legend" style={{ marginTop: '12px' }}>
              <span className="legend-item">
                <i style={{ background: '#2563eb' }} />
                Low (Consistent)
              </span>
              <span className="legend-item">
                <i style={{ background: '#10b981' }} />
                Normal
              </span>
              <span className="legend-item">
                <i style={{ background: '#f59e0b' }} />
                Suspicious
              </span>
              <span className="legend-item">
                <i style={{ background: '#ef4444' }} />
                High Anomaly / Spliced Region
              </span>
            </div>
          </div>
        )}

        {/* View Tab 4: Perceptual Hash Details */}
        {activeTab === 'phash' && (
          <table className="phash-table">
            <tbody>
              {res.matched_evidence?.original_phash && (
                <tr>
                  <th>Original Vault pHash</th>
                  <td><code>{res.matched_evidence.original_phash}</code></td>
                </tr>
              )}
              {res.matched_evidence?.uploaded_phash ? (
                <tr>
                  <th>Uploaded File pHash</th>
                  <td><code>{res.matched_evidence.uploaded_phash}</code></td>
                </tr>
              ) : res.phash ? (
                <tr>
                  <th>Vault Record pHash</th>
                  <td><code>{res.phash}</code></td>
                </tr>
              ) : null}
              {res.matched_evidence?.hamming_distance !== undefined && (
                <tr>
                  <th>Hamming Bit Distance</th>
                  <td><strong>{res.matched_evidence.hamming_distance} / 64 bits</strong></td>
                </tr>
              )}
              {res.matched_evidence?.similarity_pct !== undefined && (
                <tr>
                  <th>Visual Similarity</th>
                  <td><span style={{ color: '#10b981', fontWeight: 600 }}>{res.matched_evidence.similarity_pct}%</span></td>
                </tr>
              )}
              <tr>
                <th>Hashing Algorithm</th>
                <td>Discrete Cosine Transform Perceptual Hash (64-bit DCT)</td>
              </tr>
            </tbody>
          </table>
        )}
      </>
    );
  };

  return (
    <section className="panel verification-panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">FORENSIC TAMPER &amp; INTEGRITY AUDIT</span>
          <h2>Verify a file before it enters the vault</h2>
        </div>
        <span className="status-chip">Deep Forensic Multi-Modal Analysis</span>
      </div>

      <div
        className={`dropzone ${dragging ? 'dropzone-active' : ''}`}
        onDragEnter={() => setDragging(true)}
        onDragLeave={() => setDragging(false)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={onDrop}
      >
        <input
          id="verify-file"
          type="file"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void verify(file);
          }}
        />
        <label htmlFor="verify-file" className="dropzone-content">
          <span className="upload-mark">↥</span>
          <strong>{busy ? 'Running deep forensic inspection & pHash matching…' : 'Drop evidence here'}</strong>
          <span>Supports Images, PDFs, Audio, and Video (performs pHash, ELA, and text diff)</span>
        </label>
      </div>

      {fileName && (
        <div className="hash-line">
          <span>{fileName}</span>
          <code>{hash}</code>
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      {/* Case 1: EXACT MATCH - AUTHENTIC */}
      {result?.verified && !result.is_tampered && (
        <div className="result-card verified-card">
          <div className="result-title">
            <span className="badge badge-green">AUTHENTIC &amp; CRYPTOGRAPHICALLY VERIFIED</span>
            <strong>{result.title}</strong>
          </div>
          <div className="facts-grid">
            <div>
              <small>Registered</small>
              <strong>{registeredAt}</strong>
            </div>
            <div>
              <small>Custodian</small>
              <strong>{result.on_chain?.current_custodian ?? 'Unavailable'}</strong>
            </div>
            <div>
              <small>Block</small>
              <strong>{result.on_chain?.block_number ?? 'Mock ledger'}</strong>
            </div>
            <div>
              <small>Transaction</small>
              {explorerLink(tx) ? (
                <a href={explorerLink(tx)} target="_blank" rel="noreferrer">
                  View on explorer ↗
                </a>
              ) : (
                <strong>{tx ?? 'Mock transaction'}</strong>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Case 2: EXACT VAULT RECORD MATCH - FLAGGED AS TAMPERED / COMPROMISED */}
      {result?.verified && result.is_tampered && (
        <div className="verify-match-card" style={{ borderColor: 'rgba(239, 68, 68, 0.6)', boxShadow: '0 10px 40px rgba(0, 0, 0, 0.4), 0 0 30px rgba(239, 68, 68, 0.2)' }}>
          <div className="match-header-row">
            <div className="match-source-info">
              <span className="badge badge-red" style={{ background: 'rgba(239, 68, 68, 0.25)', borderColor: '#ef4444', color: '#fca5a5' }}>
                ⚠ REGISTERED VAULT RECORD — FLAGGED AS TAMPERED
              </span>
              <h3>Vault Record: {result.title}</h3>
              <p>
                Case Number: <strong>{result.case_number || 'N/A'}</strong> &bull; Stored File:{' '}
                <code>{result.file_name}</code>
              </p>
            </div>
            <div className="match-stats-pills">
              <div className="stat-pill stat-pill-danger">
                <span className="stat-pill-label">Integrity Status</span>
                <span className="stat-pill-value" style={{ color: '#ef4444' }}>FLAGGED TAMPERED</span>
              </div>
              <div className="stat-pill stat-pill-danger">
                <span className="stat-pill-label">Tamper Anomaly</span>
                <span className="stat-pill-value" style={{ color: tamperScoreColor }}>
                  {(tamperScore * 100).toFixed(1)}%
                </span>
              </div>
              {result.matched_evidence?.similarity_pct !== undefined && (
                <div className="stat-pill stat-pill-warning">
                  <span className="stat-pill-label">Original Vault Record</span>
                  <span className="stat-pill-value">{result.matched_evidence.similarity_pct}%</span>
                </div>
              )}
            </div>
          </div>

          <div className="anomaly-list" style={{ marginTop: '16px' }}>
            <span><strong>Integrity Diagnostic:</strong> {result.reason ?? 'This record exists in the vault ledger, but was flagged as COMPROMISED during ingestion forensic screening.'}</span>
            {result.matched_evidence && (
              <span><strong>Root Authentic Evidence:</strong> Matched against clean vault record <em>&ldquo;{result.matched_evidence.title}&rdquo;</em> (Hamming distance {result.matched_evidence.hamming_distance}/64 bits).</span>
            )}
            <span><strong>Blockchain Ledger Anchor:</strong> Hash exists on-chain, but evidence content fails cryptographic authenticity validation.</span>
          </div>

          {/* On-Chain Ledger Facts */}
          <div className="facts-grid" style={{ marginTop: '16px', background: 'rgba(0, 0, 0, 0.25)', padding: '14px', borderRadius: 'var(--radius-md)' }}>
            <div>
              <small>Registered</small>
              <strong>{registeredAt}</strong>
            </div>
            <div>
              <small>Custodian</small>
              <strong>{result.on_chain?.current_custodian ?? 'Unavailable'}</strong>
            </div>
            <div>
              <small>Block</small>
              <strong>{result.on_chain?.block_number ?? 'Mock ledger'}</strong>
            </div>
            <div>
              <small>Transaction</small>
              {explorerLink(tx) ? (
                <a href={explorerLink(tx)} target="_blank" rel="noreferrer">
                  View on explorer ↗
                </a>
              ) : (
                <strong>{tx ?? 'Mock transaction'}</strong>
              )}
            </div>
          </div>

          {/* Controls for Image Forensics */}
          {(result.original_b64 || result.uploaded_b64 || result.ela_heatmap_b64) && (
            renderImageForensics(result)
          )}
        </div>
      )}

      {/* Case 3: TAMPERED EVIDENCE DETECTED VIA pHash / Content Match */}
      {result && !result.verified && result.match_found && (
        <div className="verify-match-card">
          <div className="match-header-row">
            <div className="match-source-info">
              <span className="badge badge-red">⚠ TAMPERED / MODIFIED EVIDENCE DETECTED</span>
              <h3>Matched Vault Record: {result.matched_evidence?.title}</h3>
              <p>
                Case Number: <strong>{result.matched_evidence?.case_number}</strong> &bull; Original File:{' '}
                <code>{result.matched_evidence?.file_name}</code>
              </p>
            </div>
            <div className="match-stats-pills">
              <div className="stat-pill stat-pill-warning">
                <span className="stat-pill-label">Visual / Content Match</span>
                <span className="stat-pill-value">{result.matched_evidence?.similarity_pct}%</span>
              </div>
              {result.matched_evidence?.hamming_distance !== undefined && (
                <div className="stat-pill stat-pill-info">
                  <span className="stat-pill-label">Hamming Distance</span>
                  <span className="stat-pill-value">{result.matched_evidence.hamming_distance}/64 bits</span>
                </div>
              )}
              <div className="stat-pill stat-pill-danger">
                <span className="stat-pill-label">Tamper Anomaly</span>
                <span className="stat-pill-value" style={{ color: tamperScoreColor }}>
                  {(tamperScore * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          <div className="anomaly-list" style={{ marginTop: '16px' }}>
            <span><strong>Detection Diagnostic:</strong> {result.reason}</span>
            <span><strong>Cryptographic Digest:</strong> Local SHA-256 hash changed due to bit-level modification.</span>
          </div>

          {/* Controls for Image Forensics */}
          {(result.original_b64 || result.uploaded_b64 || result.ela_heatmap_b64) && (
            renderImageForensics(result)
          )}

          {/* Controls for PDF Document Forensics */}
          {result.match_type === 'pdf_text' && result.text_diff && (
            <div className="pdf-diff-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <strong>Document Text Comparison (vs Stored Vault Document)</strong>
                <span className="badge badge-red">
                  {result.text_diff.lines_added_count} additions &bull; {result.text_diff.lines_removed_count} deletions
                </span>
              </div>
              {result.text_diff.added_samples.length > 0 && (
                <div style={{ marginBottom: '10px' }}>
                  <small style={{ color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>Added / Altered Content:</small>
                  {result.text_diff.added_samples.map((line, idx) => (
                    <div key={idx} className="pdf-diff-line pdf-diff-added">+ {line}</div>
                  ))}
                </div>
              )}
              {result.text_diff.removed_samples.length > 0 && (
                <div>
                  <small style={{ color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>Removed / Missing Content:</small>
                  {result.text_diff.removed_samples.map((line, idx) => (
                    <div key={idx} className="pdf-diff-line pdf-diff-removed">- {line}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Case 3: UNREGISTERED EVIDENCE (No Match in Vault) */}
      {result && !result.verified && !result.match_found && (
        <div className="result-card breach-card">
          <div className="result-title">
            <span className="badge badge-red">UNREGISTERED EVIDENCE / UNKNOWN DIGEST</span>
            <strong>Cryptographic digest does not match any registered vault record</strong>
          </div>
          <div className="anomaly-list">
            <span>SHA-256 lookup: {result.reason ?? 'Evidence not found'}</span>
            <span>Perceptual hash match: No matching visual or textual record in vault index</span>
          </div>

          {/* If it was an image, still show standalone ELA heatmap for anomaly inspection */}
          {result.ela_heatmap_b64 && (
            <div style={{ marginTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <strong style={{ fontSize: '13px' }}>Standalone Image ELA Compression Heatmap</strong>
                <span style={{ color: tamperScoreColor, fontWeight: 700, fontSize: '14px' }}>
                  {(tamperScore * 100).toFixed(1)}% Tamper Score
                </span>
              </div>
              <img
                style={{ width: '100%', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}
                src={`data:image/png;base64,${result.ela_heatmap_b64}`}
                alt="Standalone ELA Heatmap"
              />
            </div>
          )}
        </div>
      )}
    </section>
  );
}
