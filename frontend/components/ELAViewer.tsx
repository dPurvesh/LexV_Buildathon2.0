'use client';

import { useEffect, useRef, useState } from 'react';
import { X, ArrowLeftRight } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

type TamperBox = {
  x: number;
  y: number;
  w: number;
  h: number;
  area: number;
};

type ELAData = {
  evidence_id?: string;
  original_b64: string;
  heatmap_b64: string;
  red_overlay_b64?: string;
  tamper_boxes?: TamperBox[];
  tamper_score: number;
  phash: string | null;
  width: number;
  height: number;
};

export default function ELAViewer({ evidenceId, onClose }: { evidenceId: string; onClose: () => void }) {
  const [data, setData] = useState<ELAData | null>(null);
  const [error, setError] = useState('');
  const [position, setPosition] = useState(50);
  const [dragging, setDragging] = useState(false);
  const [viewMode, setViewMode] = useState<'red_mask' | 'thermal'>('red_mask');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/v1/forensics/${evidenceId}/ela-heatmap`)
      .then((r) => {
        if (!r.ok) throw new Error('ELA analysis unavailable');
        return r.json();
      })
      .then((res: ELAData) => {
        setData(res);
        if (res.red_overlay_b64) {
          setViewMode('red_mask');
        } else {
          setViewMode('thermal');
        }
      })
      .catch((e) => setError(e.message));
  }, [evidenceId]);

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setPosition((x / rect.width) * 100);
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => handleMove(e.clientX);
    const onTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX);
    const onUp = () => setDragging(false);
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
  }, [dragging]);

  const score = data?.tamper_score ?? 0;
  const scoreColor = score >= 0.25 ? '#ef4444' : score >= 0.1 ? '#f59e0b' : '#10b981';
  const overlayB64 = (viewMode === 'red_mask' && data?.red_overlay_b64) ? data.red_overlay_b64 : data?.heatmap_b64;
  const rightLabel = viewMode === 'red_mask' ? 'RED ANOMALY MASK' : 'ELA HEATMAP';

  return (
    <div className="ela-modal" onClick={onClose}>
      <div className="ela-content" onClick={(e) => e.stopPropagation()}>
        <div className="ela-header">
          <div>
            <span className="eyebrow">ERROR LEVEL ANALYSIS &amp; TAMPER LOCALIZATION</span>
            <h3>Forensic Inspection Heatmap</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {data?.red_overlay_b64 && (
              <div style={{ display: 'flex', background: 'var(--bg-card)', padding: '2px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <button
                  type="button"
                  className={`button ${viewMode === 'red_mask' ? 'button-primary' : 'button-secondary'}`}
                  style={{ fontSize: '11px', padding: '4px 10px', height: 'auto', borderRadius: '4px', cursor: 'pointer' }}
                  onClick={() => setViewMode('red_mask')}
                >
                  🔴 Red Anomaly Mask
                </button>
                <button
                  type="button"
                  className={`button ${viewMode === 'thermal' ? 'button-primary' : 'button-secondary'}`}
                  style={{ fontSize: '11px', padding: '4px 10px', height: 'auto', borderRadius: '4px', cursor: 'pointer' }}
                  onClick={() => setViewMode('thermal')}
                >
                  🌡️ Thermal Spectrum
                </button>
              </div>
            )}
            <button className="inspector-close" onClick={onClose}>
              <X size={16} />
            </button>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {!data && !error && <div className="loading-state">Generating forensic tamper localization…</div>}

        {data && (
          <>
            <div
              className="ela-container"
              ref={containerRef}
              onMouseDown={() => setDragging(true)}
              onTouchStart={(e) => {
                handleMove(e.touches[0].clientX);
                setDragging(true);
              }}
            >
              <img
                className="ela-image"
                src={`data:image/png;base64,${data.original_b64}`}
                alt="Original evidence"
                draggable={false}
              />
              {overlayB64 && (
                <img
                  className="ela-image ela-overlay"
                  src={`data:image/png;base64,${overlayB64}`}
                  alt={rightLabel}
                  draggable={false}
                  style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
                />
              )}
              <div className="ela-slider" style={{ left: `${position}%` }}>
                <div className="ela-slider-handle"><ArrowLeftRight size={13} /></div>
              </div>
              <span className="ela-label ela-label-left">ORIGINAL VAULT</span>
              <span className="ela-label ela-label-right">{rightLabel}</span>
            </div>

            <div className="ela-info">
              <div className="ela-score">
                <span style={{ color: scoreColor, fontWeight: 'bold', fontSize: '22px' }}>
                  {(score * 100).toFixed(1)}%
                </span>
                <small>Tamper Score</small>
              </div>
              {data.phash && (
                <div className="ela-hash">
                  <code>{data.phash}</code>
                  <small>Perceptual Hash</small>
                </div>
              )}
              {viewMode === 'red_mask' ? (
                <div className="ela-legend" style={{ gap: '12px' }}>
                  <span className="legend-item">
                    <i style={{ background: '#ef4444', border: '1px solid #b91c1c' }} />
                    Red Highlight (Altered Pixels)
                  </span>
                  <span className="legend-item">
                    <i style={{ background: 'transparent', border: '2px solid #ef4444' }} />
                    Bounding Box (Perimeter)
                  </span>
                  <span className="legend-item">
                    <i style={{ background: '#3b82f6' }} />
                    Clean Baseline Surface
                  </span>
                </div>
              ) : (
                <div className="ela-legend">
                  <span className="legend-item">
                    <i style={{ background: '#2563eb' }} />
                    Low
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
                    High Anomaly
                  </span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
