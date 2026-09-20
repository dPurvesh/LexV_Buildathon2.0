'use client';

import { useEffect, useRef, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

type ELAData = {
  original_b64: string;
  heatmap_b64: string;
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
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/v1/forensics/${evidenceId}/ela-heatmap`)
      .then((r) => {
        if (!r.ok) throw new Error('ELA analysis unavailable');
        return r.json();
      })
      .then(setData)
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

  return (
    <div className="ela-modal" onClick={onClose}>
      <div className="ela-content" onClick={(e) => e.stopPropagation()}>
        <div className="ela-header">
          <div>
            <span className="eyebrow">ERROR LEVEL ANALYSIS</span>
            <h3>Tamper Heatmap Viewer</h3>
          </div>
          <button className="inspector-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {!data && !error && <div className="loading-state">Generating ELA heatmap…</div>}

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
              <img
                className="ela-image ela-overlay"
                src={`data:image/png;base64,${data.heatmap_b64}`}
                alt="ELA heatmap"
                draggable={false}
                style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
              />
              <div className="ela-slider" style={{ left: `${position}%` }}>
                <div className="ela-slider-handle">⟷</div>
              </div>
              <span className="ela-label ela-label-left">ORIGINAL</span>
              <span className="ela-label ela-label-right">ELA HEATMAP</span>
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
            </div>
          </>
        )}
      </div>
    </div>
  );
}
