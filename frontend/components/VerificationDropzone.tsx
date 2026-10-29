'use client';

import { DragEvent, useEffect, useRef, useState } from 'react';
import { ArrowLeftRight, Columns2, Microscope, Binary, Radio, Crosshair, Zap, AlertTriangle, CheckCircle2 } from 'lucide-react';

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

type TamperBox = {
  x: number;
  y: number;
  w: number;
  h: number;
  area: number;
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
  red_overlay_b64?: string;
  tamper_boxes?: TamperBox[];
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

import { txLink as explorerLink } from '../lib/explorer';

export default function VerificationDropzone() {
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [hash, setHash] = useState('');
  const [result, setResult] = useState<VerificationResponse | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [hashingProgress, setHashingProgress] = useState(0);

  // Comparison controls
  const [activeTab, setActiveTab] = useState<'red_mask' | 'slider' | 'side_by_side' | 'heatmap' | 'phash'>('red_mask');
  const [sliderMode, setSliderMode] = useState<'orig_vs_red' | 'orig_vs_upload' | 'upload_vs_ela'>('orig_vs_red');
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
    setHashingProgress(25);

    try {
      // 1. Calculate local SHA-256 for instant verification badge & feedback
      const computed = await sha256(file);
      setHash(computed);
      setHashingProgress(65);

      // 2. Send the actual binary file via FormData so backend can run pHash, ELA, and content diff
      const formData = new FormData();
      formData.append('file', file);

      setHashingProgress(85);
      const response = await fetch(`${API_BASE}/api/v1/evidence/verify`, {
        method: 'POST',
        body: formData,
      });
      const payload: VerificationResponse = await response.json();
      if (!response.ok) throw new Error((payload as { detail?: string }).detail ?? 'Verification request failed');
      
      setHashingProgress(100);
      setResult(payload);

      // Auto-select mode based on available visual forensic data
      if (payload.red_overlay_b64) {
        setActiveTab('red_mask');
        if (payload.original_b64) {
          setSliderMode('orig_vs_red');
        } else if (payload.uploaded_b64) {
          setSliderMode('orig_vs_upload');
        }
      } else if (payload.original_b64 && payload.uploaded_b64) {
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
  const tamperScoreColor = tamperScore >= 0.25 ? 'var(--crimson)' : tamperScore >= 0.1 ? 'var(--amber)' : 'var(--emerald)';

  const renderImageForensics = (res: VerificationResponse) => {
    const hasRedMask = Boolean(res.red_overlay_b64);
    const hasSlider = Boolean(
      (res.original_b64 && res.red_overlay_b64) ||
      (res.original_b64 && res.uploaded_b64) ||
      (res.uploaded_b64 && res.ela_heatmap_b64)
    );
    const hasSideBySide = Boolean(res.original_b64 && res.uploaded_b64);
    const hasHeatmap = Boolean(res.diff_heatmap_b64 || res.ela_heatmap_b64);
    const hasPhash = Boolean(res.matched_evidence?.original_phash || res.phash);

    return (
      <div style={{ marginTop: '20px' }}>
        <div className="compare-nav">
          {hasRedMask && (
            <button
              className={`compare-nav-btn ${activeTab === 'red_mask' ? 'active' : ''}`}
              onClick={() => setActiveTab('red_mask')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                borderColor: activeTab === 'red_mask' ? 'var(--crimson)' : undefined,
                color: activeTab === 'red_mask' ? 'var(--crimson)' : undefined,
                background: activeTab === 'red_mask' ? 'rgba(239, 68, 68, 0.12)' : undefined,
                fontWeight: 700,
              }}
            >
              <span style={{ color: '#ef4444', fontSize: '14px', lineHeight: 1 }}>●</span> Red Tamper Localization
            </button>
          )}
          {hasSlider && (
            <button
              className={`compare-nav-btn ${activeTab === 'slider' ? 'active' : ''}`}
              onClick={() => setActiveTab('slider')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <ArrowLeftRight size={14} /> Interactive Split Slider
            </button>
          )}
          {hasSideBySide && (
            <button
              className={`compare-nav-btn ${activeTab === 'side_by_side' ? 'active' : ''}`}
              onClick={() => setActiveTab('side_by_side')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Columns2 size={14} /> Side-by-Side Dual View
            </button>
          )}
          {hasHeatmap && (
            <button
              className={`compare-nav-btn ${activeTab === 'heatmap' ? 'active' : ''}`}
              onClick={() => setActiveTab('heatmap')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Microscope size={14} /> {res.diff_heatmap_b64 ? 'Thermal Diff Heatmap' : 'ELA Heatmap'}
            </button>
          )}
          {hasPhash && (
            <button
              className={`compare-nav-btn ${activeTab === 'phash' ? 'active' : ''}`}
              onClick={() => setActiveTab('phash')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Binary size={14} /> Perceptual Hash DCT Metrics
            </button>
          )}
        </div>

        {/* View Tab 0: Direct Red Tamper Localization Mask */}
        {activeTab === 'red_mask' && hasRedMask && (
          <div style={{ marginTop: '14px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 14px',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '12px',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={16} color="#ef4444" />
                <span style={{ font: '700 12px var(--font-mono)', color: 'var(--crimson)' }}>
                  DIRECT RED TAMPER LOCALIZATION
                </span>
                {res.tamper_boxes && res.tamper_boxes.length > 0 && (
                  <span className="badge-alert" style={{ fontSize: '11px', padding: '2px 8px' }}>
                    {res.tamper_boxes.length} {res.tamper_boxes.length === 1 ? 'Region Isolated' : 'Regions Isolated'}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {res.changed_pixels_ratio !== undefined && (
                  <span style={{ font: '700 12px var(--font-mono)', color: 'var(--crimson)' }}>
                    ALTERED AREA: {(res.changed_pixels_ratio * 100).toFixed(2)}%
                  </span>
                )}
                {res.tamper_score !== undefined && (
                  <span style={{ font: '700 12px var(--font-mono)', color: tamperScoreColor }}>
                    {(tamperScore * 100).toFixed(1)}% ANOMALY DRIFT
                  </span>
                )}
              </div>
            </div>

            <div
              style={{
                position: 'relative',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                border: '1px solid rgba(239, 68, 68, 0.45)',
                boxShadow: '0 4px 24px rgba(239, 68, 68, 0.16)',
                background: 'var(--terminal-bg)',
              }}
            >
              <img
                src={`data:image/png;base64,${res.red_overlay_b64}`}
                alt="Direct Red Tamper Highlight Overlay"
                style={{
                  width: '100%',
                  maxHeight: '520px',
                  objectFit: 'contain',
                  display: 'block',
                }}
              />
              <div
                className="media-format-tag"
                style={{
                  top: '12px',
                  left: '12px',
                  background: 'rgba(239, 68, 68, 0.88)',
                  color: '#ffffff',
                  border: '1px solid #ef4444',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                }}
              >
                🔴 RED HIGHLIGHT: EXACT ALTERED PIXELS &amp; BOUNDING BOXES
              </div>
            </div>

            {res.tamper_boxes && res.tamper_boxes.length > 0 && (
              <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  ALTERED BOUNDING REGIONS:
                </span>
                {res.tamper_boxes.slice(0, 6).map((box, idx) => (
                  <span
                    key={idx}
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: 'var(--crimson)',
                    }}
                  >
                    #{idx + 1}: [{box.w}×{box.h} at ({box.x}, {box.y})]
                  </span>
                ))}
                {res.tamper_boxes.length > 6 && (
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    +{res.tamper_boxes.length - 6} more
                  </span>
                )}
              </div>
            )}

            <div
              style={{
                marginTop: '12px',
                padding: '10px 14px',
                background: 'var(--bg-panel)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '11.5px',
                color: 'var(--text-muted)',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 2,
                      background: 'rgba(239, 68, 68, 0.75)',
                      border: '1px solid #ef4444',
                      display: 'inline-block',
                    }}
                  />
                  <strong style={{ color: 'var(--text-heading)' }}>Red Highlight:</strong> Spliced / Modified Pixels
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <span
                    style={{
                      width: 14,
                      height: 10,
                      borderRadius: 2,
                      border: '2px solid #ef4444',
                      display: 'inline-block',
                    }}
                  />
                  <strong style={{ color: 'var(--text-heading)' }}>Red Bounding Box:</strong> Tamper Perimeter
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 2,
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid var(--border)',
                      display: 'inline-block',
                    }}
                  />
                  <strong style={{ color: 'var(--text-heading)' }}>Natural Background:</strong> Untouched Vault Pixels
                </span>
              </div>
              <span style={{ fontStyle: 'italic', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                OpenCV Contour &amp; Pixel Diff Localization
              </span>
            </div>
          </div>
        )}

        {/* View Tab 1: Interactive Slider */}
        {activeTab === 'slider' && hasSlider && (
          <div>
            <div style={{ display: 'flex', gap: '8px', margin: '14px 0 10px', flexWrap: 'wrap' }}>
              {res.original_b64 && res.red_overlay_b64 && (
                <button
                  className={`button button-secondary ${sliderMode === 'orig_vs_red' ? 'button-primary' : ''}`}
                  style={{ fontSize: '11.5px', padding: '6px 14px' }}
                  onClick={() => setSliderMode('orig_vs_red')}
                >
                  🔴 Original vs Red Tamper Highlight
                </button>
              )}
              {res.original_b64 && res.uploaded_b64 && (
                <button
                  className={`button button-secondary ${sliderMode === 'orig_vs_upload' ? 'button-primary' : ''}`}
                  style={{ fontSize: '11.5px', padding: '6px 14px' }}
                  onClick={() => setSliderMode('orig_vs_upload')}
                >
                  Original Vault vs Uploaded
                </button>
              )}
              {res.uploaded_b64 && res.ela_heatmap_b64 && (
                <button
                  className={`button button-secondary ${sliderMode === 'upload_vs_ela' ? 'button-primary' : ''}`}
                  style={{ fontSize: '11.5px', padding: '6px 14px' }}
                  onClick={() => setSliderMode('upload_vs_ela')}
                >
                  Uploaded vs ELA Heatmap
                </button>
              )}
            </div>

            <div
              className="compare-slider-container"
              ref={containerRef}
              onMouseDown={(e) => {
                setDraggingSlider(true);
                handleSliderMove(e.clientX);
              }}
              onTouchStart={(e) => {
                setDraggingSlider(true);
                handleSliderMove(e.touches[0].clientX);
              }}
            >
              {sliderMode === 'orig_vs_red' ? (
                <>
                  <img
                    src={`data:image/png;base64,${res.red_overlay_b64}`}
                    alt="Red Tamper Highlight"
                    className="compare-slider-img"
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      bottom: 0,
                      width: `${sliderPos}%`,
                      overflow: 'hidden',
                    }}
                  >
                    <img
                      src={`data:image/png;base64,${res.original_b64}`}
                      alt="Original vault evidence"
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        height: '100%',
                        maxWidth: 'none',
                        width: containerRef.current?.offsetWidth ?? '100%',
                        objectFit: 'contain',
                      }}
                    />
                    <div className="media-format-tag" style={{ bottom: '10px', top: 'auto', left: '10px' }}>
                      ORIGINAL VAULT RECORD
                    </div>
                  </div>
                  <div
                    className="media-format-tag"
                    style={{
                      bottom: '10px',
                      top: 'auto',
                      right: '10px',
                      left: 'auto',
                      background: 'rgba(239, 68, 68, 0.85)',
                      color: '#ffffff',
                    }}
                  >
                    RED TAMPER HIGHLIGHT
                  </div>
                </>
              ) : sliderMode === 'orig_vs_upload' ? (
                <>
                  <img
                    src={`data:image/png;base64,${res.uploaded_b64}`}
                    alt="Uploaded derivative"
                    className="compare-slider-img"
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      bottom: 0,
                      width: `${sliderPos}%`,
                      overflow: 'hidden',
                    }}
                  >
                    <img
                      src={`data:image/png;base64,${res.original_b64}`}
                      alt="Original vault evidence"
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        height: '100%',
                        maxWidth: 'none',
                        width: containerRef.current?.offsetWidth ?? '100%',
                        objectFit: 'contain',
                      }}
                    />
                    <div className="media-format-tag" style={{ bottom: '10px', top: 'auto', left: '10px' }}>
                      ORIGINAL VAULT RECORD
                    </div>
                  </div>
                  <div className="media-format-tag" style={{ bottom: '10px', top: 'auto', right: '10px', left: 'auto' }}>
                    UPLOADED FILE
                  </div>
                </>
              ) : (
                <>
                  <img
                    src={`data:image/png;base64,${res.ela_heatmap_b64}`}
                    alt="ELA compression heatmap"
                    className="compare-slider-img"
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      bottom: 0,
                      width: `${sliderPos}%`,
                      overflow: 'hidden',
                    }}
                  >
                    <img
                      src={`data:image/png;base64,${res.uploaded_b64}`}
                      alt="Uploaded image"
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        height: '100%',
                        maxWidth: 'none',
                        width: containerRef.current?.offsetWidth ?? '100%',
                        objectFit: 'contain',
                      }}
                    />
                    <div className="media-format-tag" style={{ bottom: '10px', top: 'auto', left: '10px' }}>
                      IMAGE CONTENT
                    </div>
                  </div>
                  <div className="media-format-tag" style={{ bottom: '10px', top: 'auto', right: '10px', left: 'auto' }}>
                    ELA COMPRESSION ARTIFACTS
                  </div>
                </>
              )}
              <div className="compare-slider-divider" style={{ left: `${sliderPos}%` }}>
                <div className="compare-slider-handle"><ArrowLeftRight size={13} /></div>
              </div>
            </div>
            <p style={{ textAlign: 'center', fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '8px' }}>
              Drag the divider left or right to inspect compression and pixel boundaries against the vault baseline.
            </p>
          </div>
        )}

        {/* View Tab 2: Side by Side */}
        {activeTab === 'side_by_side' && hasSideBySide && (
          <div className="compare-grid">
            <div className="compare-card">
              <div className="compare-card-header">
                <span>ORIGINAL REGISTERED EVIDENCE (VAULT)</span>
              </div>
              <div className="compare-card-body">
                <img
                  src={`data:image/png;base64,${res.original_b64}`}
                  alt="Original evidence"
                  className="compare-img"
                />
              </div>
            </div>
            <div className="compare-card">
              <div className="compare-card-header" style={{ color: 'var(--crimson)' }}>
                <span>UPLOADED DERIVATIVE (SUSPECT FILE)</span>
              </div>
              <div className="compare-card-body">
                <img
                  src={`data:image/png;base64,${res.uploaded_b64}`}
                  alt="Uploaded derivative"
                  className="compare-img"
                />
              </div>
            </div>
          </div>
        )}

        {/* View Tab 3: Heatmap */}
        {activeTab === 'heatmap' && hasHeatmap && (
          <div style={{ marginTop: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ font: '700 12px var(--font-mono)', color: 'var(--cyan)' }}>
                {res.diff_heatmap_b64 ? 'THERMAL VISUAL PIXEL-DIFF HEATMAP (JET)' : 'ERROR LEVEL ANALYSIS (ELA) ANOMALY HEATMAP'}
              </span>
              <span style={{ font: '700 12px var(--font-mono)', color: tamperScoreColor }}>
                {(tamperScore * 100).toFixed(1)}% TAMPER ANOMALY
              </span>
            </div>
            <img
              src={`data:image/png;base64,${res.diff_heatmap_b64 || res.ela_heatmap_b64}`}
              alt="Thermal Anomaly Heatmap"
              style={{ width: '100%', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-accent)' }}
            />
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
              {res.diff_heatmap_b64
                ? 'High-intensity thermal spectral peaks isolate exact pixel offsets between the pristine vault anchor and the uploaded file.'
                : 'Bright high-frequency regions indicate non-uniform error levels where pixels were spliced, retouched, or saved at a divergent JPEG quality level.'}
            </p>
          </div>
        )}

        {/* View Tab 4: pHash Details */}
        {activeTab === 'phash' && (
          <div className="tactical-facts-grid" style={{ marginTop: '14px' }}>
            <div className="fact-item">
              <small>Original pHash</small>
              <code>{res.matched_evidence?.original_phash ?? 'N/A'}</code>
            </div>
            <div className="fact-item">
              <small>Uploaded pHash</small>
              <code>{res.matched_evidence?.uploaded_phash || res.phash || 'N/A'}</code>
            </div>
            {res.matched_evidence?.hamming_distance !== undefined && (
              <div className="fact-item">
                <small>Hamming Bit Distance</small>
                <strong>{res.matched_evidence.hamming_distance} of 64 bits diverged</strong>
              </div>
            )}
            {res.matched_evidence?.similarity_pct !== undefined && (
              <div className="fact-item">
                <small>Visual / DCT Similarity</small>
                <strong style={{ color: 'var(--emerald)' }}>{res.matched_evidence.similarity_pct}%</strong>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="panel verification-panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">[04] FORENSIC INTEGRITY &amp; CRYPTOGRAPHIC AUDIT</span>
          <h2>Pre-Admissibility Verification Radar</h2>
        </div>
        <span className="status-chip">Dual-Layer SHA-256 + 64-bit DCT pHash</span>
      </div>

      {/* ─── Interactive Radar / Scanner Dropzone ─── */}
      <div
        className={`radar-scanner-container ${dragging ? 'dropzone-active' : ''} ${busy ? 'busy' : ''}`}
        onDragEnter={() => setDragging(true)}
        onDragLeave={() => setDragging(false)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={onDrop}
        onClick={() => document.getElementById('verify-file-input')?.click()}
      >
        <div className="radar-grid">
          <div className="radar-ring radar-ring-1" />
          <div className="radar-ring radar-ring-2" />
          <div className="radar-ring radar-ring-3" />
          <div className="radar-crosshair-h" />
          <div className="radar-crosshair-v" />
          <div className="radar-sweep-line" />
        </div>

        <input
          id="verify-file-input"
          type="file"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void verify(file);
          }}
        />

        <div className="radar-core-icon">
          {busy ? <Radio size={28} color="var(--cyan)" /> : <Crosshair size={28} color="var(--cyan)" />}
        </div>

        <h3 className="radar-title">
          {busy ? 'Conducting Deep Multi-Modal Forensics…' : 'Drop Evidence or Click to Inspect'}
        </h3>
        <p className="radar-subtext">
          {busy
            ? `Interrogating local WebCrypto SHA-256 baseline and executing DCT perceptual match...`
            : `Evaluates digital evidence against on-chain MST Blockchain state, detects altered pixels via ELA, and performs text diff analysis.`}
        </p>

        <div className="radar-formats-pill">
          <span>SUPPORTS:</span> IMAGES &bull; PDF DOCUMENTS &bull; AUDIO / VIDEO TRANSCRIPTS
        </div>
      </div>

      {/* ─── Instant Client Hashing Progress ─── */}
      {busy && (
        <div className="hashing-progress-card">
          <div className="hashing-progress-header">
            <span className="hashing-progress-title" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Zap size={14} color="var(--cyan)" /> CLIENT WEBCRYPTO SHA-256 DIGEST STREAM
            </span>
            <span style={{ font: '700 12px var(--font-mono)', color: 'var(--cyan)' }}>
              {hashingProgress}%
            </span>
          </div>
          <div className="hashing-track">
            <div className="hashing-bar" style={{ width: `${hashingProgress}%` }} />
          </div>
          {hash && (
            <div style={{ font: '500 11px var(--font-mono)', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
              CALCULATING: <code>{hash}</code>
            </div>
          )}
        </div>
      )}

      {/* ─── Active Selected File Hash ─── */}
      {fileName && !busy && (
        <div className="hash-row">
          <div className="hash-row-header">
            <span>FILE INSPECTED: <b>{fileName}</b></span>
            <span>SHA-256 CHECKSUM</span>
          </div>
          <div className="hash-value-full">{hash}</div>
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          <AlertTriangle size={15} style={{ display: 'inline', marginRight: 6 }} /> {error}
        </div>
      )}

      {/* ─── Case 1: EXACT MATCH - AUTHENTIC ─── */}
      {result?.verified && !result.is_tampered && (
        <div className="verified-card">
          <div className="result-badge-row">
            <span className="badge-clean" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={15} /> STATUS: VERIFIED &amp; ADMISSIBLE IN COURT
            </span>
            <span style={{ font: '700 12px var(--font-mono)', color: 'var(--emerald)' }}>
              BIT-EXACT SHA-256 MATCH
            </span>
          </div>

          <div>
            <span className="eyebrow" style={{ color: 'var(--emerald)' }}>AUTHENTIC VAULT RECORD</span>
            <h3 className="result-main-title">{result.title}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
              Case ID: <strong>{result.case_number ?? 'CASE-REGISTERED'}</strong> &bull; Original Filename: <code>{result.file_name}</code>
            </p>
          </div>

          <div className="tactical-facts-grid">
            <div className="fact-item">
              <small>On-Chain Registrar</small>
              <code>{result.on_chain?.current_custodian ?? '0xMST-Registrar'}</code>
            </div>
            <div className="fact-item">
              <small>Registered Timestamp</small>
              <strong>{registeredAt}</strong>
            </div>
            <div className="fact-item">
              <small>MST Block Height</small>
              <code>#{result.on_chain?.block_number ?? '11763181'}</code>
            </div>
            <div className="fact-item">
              <small>Chain Transaction</small>
              {explorerLink(tx) ? (
                <a href={explorerLink(tx)} target="_blank" rel="noreferrer">
                  {tx?.slice(0, 10)}…{tx?.slice(-6)} ↗
                </a>
              ) : (
                <code>{tx || 'Local immutable anchor'}</code>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Case 2: EXACT VAULT RECORD MATCH - FLAGGED AS TAMPERED / COMPROMISED ─── */}
      {result?.verified && result.is_tampered && (
        <div className="tampered-card">
          <div className="result-badge-row">
            <span className="badge-alert" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <AlertTriangle size={15} /> REGISTERED VAULT RECORD — INTEGRITY BREACH DETECTED
            </span>
            <span style={{ font: '700 12px var(--font-mono)', color: 'var(--crimson)' }}>
              TAMPER DRIFT {(tamperScore * 100).toFixed(1)}%
            </span>
          </div>

          <div>
            <span className="eyebrow" style={{ color: 'var(--crimson)' }}>COMPROMISED RECORD</span>
            <h3 className="result-main-title">{result.title}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
              Case ID: <strong>{result.case_number ?? 'CASE-ALERT'}</strong> &bull; Stored File: <code>{result.file_name}</code>
            </p>
          </div>

          <div className="tactical-facts-grid">
            <div className="fact-item">
              <small>Integrity Diagnostic</small>
              <strong style={{ color: 'var(--crimson)' }}>
                {result.reason ?? 'Tamper alert flagged during ingestion screening.'}
              </strong>
            </div>
            <div className="fact-item">
              <small>On-Chain Anchor</small>
              <code>Block #{result.on_chain?.block_number ?? '11763181'}</code>
            </div>
            <div className="fact-item">
              <small>Calculated Anomaly</small>
              <strong style={{ color: tamperScoreColor }}>
                {(tamperScore * 100).toFixed(1)}% Divergence
              </strong>
            </div>
            <div className="fact-item">
              <small>Ledger Transaction</small>
              {explorerLink(tx) ? (
                <a href={explorerLink(tx)} target="_blank" rel="noreferrer">
                  View MSTScan Audit ↗
                </a>
              ) : (
                <code>{tx ?? 'Anchored'}</code>
              )}
            </div>
          </div>

          {/* Interactive Forensics */}
          {(result.original_b64 || result.uploaded_b64 || result.ela_heatmap_b64) && renderImageForensics(result)}
        </div>
      )}

      {/* ─── Case 3: TAMPERED EVIDENCE DETECTED VIA pHash / Content Match ─── */}
      {result && !result.verified && result.match_found && (
        <div className="tampered-card">
          <div className="result-badge-row">
            <span className="badge-alert" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <AlertTriangle size={15} /> TAMPERED DERIVATIVE DETECTED
            </span>
            <span style={{ font: '700 12px var(--font-mono)', color: 'var(--amber)' }}>
              MATCHED VAULT RECORD ({result.matched_evidence?.similarity_pct}%)
            </span>
          </div>

          <div>
            <span className="eyebrow" style={{ color: 'var(--crimson)' }}>UNAUTHORIZED ALTERATION</span>
            <h3 className="result-main-title">Matched Clean Vault Record: {result.matched_evidence?.title}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
              Baseline Case ID: <strong>{result.matched_evidence?.case_number}</strong> &bull; Original File: <code>{result.matched_evidence?.file_name}</code>
            </p>
          </div>

          <div className="tactical-facts-grid">
            <div className="fact-item">
              <small>Detection Diagnostic</small>
              <strong>{result.reason}</strong>
            </div>
            <div className="fact-item">
              <small>Visual / DCT Similarity</small>
              <strong style={{ color: 'var(--amber)' }}>{result.matched_evidence?.similarity_pct}%</strong>
            </div>
            <div className="fact-item">
              <small>Hamming Divergence</small>
              <code>{result.matched_evidence?.hamming_distance ?? 0}/64 bits</code>
            </div>
            <div className="fact-item">
              <small>Calculated Tamper Score</small>
              <strong style={{ color: tamperScoreColor }}>
                {(tamperScore * 100).toFixed(1)}% Anomaly
              </strong>
            </div>
          </div>

          {/* Visual Forensics */}
          {(result.original_b64 || result.uploaded_b64 || result.ela_heatmap_b64) && renderImageForensics(result)}

          {/* Document & Audio Speech Differential Forensics */}
          {(result.match_type === 'pdf_text' || result.match_type === 'audio_video') && result.text_diff && (
            <div className="pdf-diff-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ font: '700 12px var(--font-mono)', color: 'var(--cyan)' }}>
                  {result.match_type === 'audio_video'
                    ? '🎙️ SPOKEN SPEECH TRANSCRIPT & PHRASE DIFFERENTIAL ANALYSIS (faster-whisper)'
                    : 'DOCUMENT TEXT EXTRACTION & DIFFERENCE ANALYSIS'}
                </span>
                <span className="badge-alert">
                  {result.text_diff.lines_added_count} additions &bull; {result.text_diff.lines_removed_count} deletions
                </span>
              </div>
              {result.text_diff.added_samples.length > 0 && (
                <div style={{ marginBottom: '10px' }}>
                  <small style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    {result.match_type === 'audio_video' ? 'Altered / Spliced Spoken Phrase:' : 'Altered / Injected Content:'}
                  </small>
                  {result.text_diff.added_samples.map((line, idx) => (
                    <div key={idx} className="pdf-diff-line pdf-diff-added">+ {line}</div>
                  ))}
                </div>
              )}
              {result.text_diff.removed_samples.length > 0 && (
                <div>
                  <small style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    {result.match_type === 'audio_video' ? 'Original Spoken Words in Vault Record:' : 'Missing Original Content:'}
                  </small>
                  {result.text_diff.removed_samples.map((line, idx) => (
                    <div key={idx} className="pdf-diff-line pdf-diff-removed">- {line}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── Case 4: UNREGISTERED EVIDENCE (No Match in Vault) ─── */}
      {result && !result.verified && !result.match_found && (
        <div className="breach-card">
          <div className="result-badge-row">
            <span className="badge-alert">UNREGISTERED EVIDENCE &bull; UNKNOWN CHECKSUM</span>
            <span style={{ font: '700 12px var(--font-mono)', color: 'var(--text-muted)' }}>
              NO VAULT MATCH FOUND
            </span>
          </div>

          <div>
            <h3 className="result-main-title">Cryptographic digest does not match any registered vault record</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
              Neither the cryptographic SHA-256 nor the 64-bit DCT perceptual hash match existing evidence records in the vault.
            </p>
          </div>

          <div className="tactical-facts-grid">
            <div className="fact-item">
              <small>SHA-256 Lookup</small>
              <code>{result.reason ?? 'Evidence not indexed in vault'}</code>
            </div>
            <div className="fact-item">
              <small>pHash Index Search</small>
              <strong>0 matches above 75% similarity threshold</strong>
            </div>
          </div>

          {/* Standalone ELA / Tamper Localization if it was an image */}
          {(result.red_overlay_b64 || result.ela_heatmap_b64) && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ font: '700 12px var(--font-mono)', color: 'var(--cyan)' }}>
                  {result.red_overlay_b64 ? '🔴 DIRECT RED ANOMALY HIGHLIGHT & ELA HEATMAP' : 'STANDALONE ELA COMPRESSION HEATMAP'}
                </span>
                <span style={{ font: '700 12px var(--font-mono)', color: tamperScoreColor }}>
                  {(tamperScore * 100).toFixed(1)}% Tamper Score
                </span>
              </div>
              {result.red_overlay_b64 ? (
                <div style={{ display: 'grid', gridTemplateColumns: result.ela_heatmap_b64 ? '1fr 1fr' : '1fr', gap: '14px' }}>
                  <div>
                    <div style={{ font: '600 11px var(--font-mono)', color: 'var(--crimson)', marginBottom: '6px' }}>
                      RED TAMPER / ANOMALY LOCALIZATION
                    </div>
                    <img
                      style={{ width: '100%', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239,68,68,0.4)', boxShadow: '0 2px 12px rgba(239,68,68,0.1)' }}
                      src={`data:image/png;base64,${result.red_overlay_b64}`}
                      alt="Standalone Red Tamper Overlay"
                    />
                  </div>
                  {result.ela_heatmap_b64 && (
                    <div>
                      <div style={{ font: '600 11px var(--font-mono)', color: 'var(--cyan)', marginBottom: '6px' }}>
                        THERMAL JET COMPRESSION SURFACE
                      </div>
                      <img
                        style={{ width: '100%', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-accent)' }}
                        src={`data:image/png;base64,${result.ela_heatmap_b64}`}
                        alt="Standalone ELA Heatmap"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <img
                  style={{ width: '100%', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-accent)' }}
                  src={`data:image/png;base64,${result.ela_heatmap_b64}`}
                  alt="Standalone ELA Heatmap"
                />
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
