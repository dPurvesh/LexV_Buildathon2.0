'use client';

import React, { useState } from 'react';
import { Camera, AlertTriangle, ShieldCheck, MapPin, Clock, Cpu, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';

export default function ExifForensicsCard({
  exifData,
}: {
  exifData: Record<string, any>;
}) {
  const [showRaw, setShowRaw] = useState(false);

  if (!exifData || typeof exifData !== 'object' || Object.keys(exifData).length === 0) {
    return null;
  }

  // Check if it's the rich structure or legacy raw tags
  const isRich = 'has_exif' in exifData;
  const isSoftwareModified = Boolean(exifData.is_software_modified);
  const software = exifData.software || exifData.Software || exifData.ProcessingSoftware;
  const warning = exifData.warning;
  const tamperIndicators: string[] = exifData.tamper_indicators || [];

  const camera = exifData.camera || {};
  const make = camera.make || exifData.Make;
  const model = camera.model || exifData.Model;
  const serial = camera.serial_number || exifData.BodySerialNumber || exifData.SerialNumber;
  const lens = camera.lens_model || exifData.LensModel;
  const focalLength = camera.focal_length || exifData.FocalLength;
  const iso = camera.iso || exifData.ISOSpeedRatings;

  const gps = exifData.gps || {};
  const hasGps = Boolean(gps.has_gps || (gps.latitude && gps.longitude) || exifData.GPS);
  const lat = gps.latitude;
  const lon = gps.longitude;
  const alt = gps.altitude;
  const mapsUrl = gps.maps_url || (lat && lon ? `https://www.google.com/maps?q=${lat},${lon}` : null);

  const timestamps = exifData.timestamps || {};
  const dtOriginal = timestamps.original || exifData.DateTimeOriginal;
  const dtModified = timestamps.modified || exifData.DateTime;
  const hasTimeDivergence = Boolean(timestamps.discrepancy_detected);

  const rawTags = exifData.raw_tags || exifData;

  return (
    <div className={`inspector-card ${isSoftwareModified ? 'card-tamper-border' : ''}`}>
      <div className="inspector-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="inspector-card-title">
          <span className="inspector-card-icon">
            <Camera size={15} color={isSoftwareModified ? 'var(--crimson)' : 'var(--cyan)'} />
          </span>
          <span>EXIF Forensic Intelligence &amp; Geolocation</span>
        </div>
        {isSoftwareModified ? (
          <span className="tamper-badge tamper-alert" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <AlertTriangle size={11} /> Software Altered
          </span>
        ) : (
          <span className="tamper-badge tamper-clean" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <ShieldCheck size={11} /> Authentic Camera Tags
          </span>
        )}
      </div>

      {/* Critical Software Manipulation Banner (If editing software was detected) */}
      {isSoftwareModified && (
        <div className="exif-tamper-alert-box">
          <div className="alert-box-header">
            <AlertTriangle size={15} color="#ef4444" />
            <strong>DIGITAL EDITING SUITE SIGNATURE DETECTED</strong>
          </div>
          <p style={{ margin: '4px 0 6px 0', fontSize: '11.5px', color: '#fca5a5' }}>
            {warning || `Asset header contains digital manipulation signature '${software}'.`}
          </p>
          {tamperIndicators.length > 0 && (
            <ul className="tamper-indicator-list">
              {tamperIndicators.map((ind, i) => (
                <li key={i}>{ind}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="detail-grid">
        {/* Hardware Specifications */}
        {(make || model) && (
          <div className="detail-row">
            <span className="detail-label">Camera Hardware</span>
            <span className="detail-value">
              <strong>{make ? `${make} ` : ''}{model || 'Generic Capture Device'}</strong>
            </span>
          </div>
        )}

        {serial && (
          <div className="detail-row">
            <span className="detail-label">Hardware Serial #</span>
            <span className="detail-value">
              <code>{serial}</code>
            </span>
          </div>
        )}

        {lens && (
          <div className="detail-row">
            <span className="detail-label">Lens Specification</span>
            <span className="detail-value">{lens}</span>
          </div>
        )}

        {(focalLength || iso) && (
          <div className="detail-row">
            <span className="detail-label">Optics &amp; ISO</span>
            <span className="detail-value">
              {focalLength ? `${focalLength}mm ` : ''}
              {iso ? `• ISO ${iso}` : ''}
            </span>
          </div>
        )}

        {/* Software / Firmware Signature */}
        {software && (
          <div className="detail-row">
            <span className="detail-label">Header Software</span>
            <span className="detail-value">
              <span className={`software-badge ${isSoftwareModified ? 'software-tampered' : 'software-clean'}`}>
                {software}
              </span>
            </span>
          </div>
        )}

        {/* Shutter vs Modification Timestamps */}
        {dtOriginal && (
          <div className="detail-row">
            <span className="detail-label">Shutter Capture Time</span>
            <span className="detail-value">
              <time>{dtOriginal}</time>
            </span>
          </div>
        )}

        {dtModified && (
          <div className="detail-row">
            <span className="detail-label">File Modification Time</span>
            <span className="detail-value">
              <time style={{ color: hasTimeDivergence ? 'var(--crimson)' : 'inherit' }}>
                {dtModified} {hasTimeDivergence ? '(Discrepancy detected)' : ''}
              </time>
            </span>
          </div>
        )}

        {/* GPS Geolocation & Crime Scene Coordinates */}
        {hasGps && lat && lon && (
          <div className="detail-row" style={{ gridColumn: '1 / -1', background: 'var(--green-badge-bg)', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--green-badge-border)' }}>
            <span className="detail-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--green-badge-text)', fontWeight: 700 }}>
              <MapPin size={14} /> Crime Scene GPS Coordinates
            </span>
            <span className="detail-value" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <code style={{ fontSize: '11px', color: 'var(--text-heading)', fontWeight: 600 }}>
                {Number(lat).toFixed(6)}° N, {Number(lon).toFixed(6)}° E
                {alt ? ` (Alt: ${alt}m)` : ''}
              </code>
              <div style={{ display: 'inline-flex', gap: '6px' }}>
                <a
                  href={`https://www.google.com/maps?q=${lat},${lon}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button button-primary"
                  style={{ fontSize: '11px', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  title="Open exact crime scene pin on Google Maps Satellite"
                >
                  <MapPin size={11} /> Google Maps Pin <ExternalLink size={10} />
                </a>
                <a
                  href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=17/${lat}/${lon}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button button-secondary"
                  style={{ fontSize: '11px', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  title="Open on OpenStreetMap"
                >
                  OpenStreetMap <ExternalLink size={10} />
                </a>
              </div>
            </span>
          </div>
        )}
      </div>

      {/* Raw EXIF Tags Accordion */}
      {rawTags && typeof rawTags === 'object' && Object.keys(rawTags).length > 0 && (
        <div style={{ marginTop: '12px', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
          <button
            type="button"
            onClick={() => setShowRaw(!showRaw)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '11px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 0',
            }}
          >
            {showRaw ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {showRaw ? 'Hide Raw EXIF Tags' : `View All Raw EXIF Metadata (${Object.keys(rawTags).length} tags)`}
          </button>

          {showRaw && (
            <div className="raw-exif-table-wrap" style={{ marginTop: '8px', maxHeight: '180px', overflowY: 'auto' }}>
              <table style={{ width: '100%', fontSize: '10.5px', borderCollapse: 'collapse' }}>
                <tbody>
                  {Object.entries(rawTags).map(([k, v]) => (
                    <tr key={k} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <td style={{ color: 'var(--text-muted)', padding: '3px 6px', width: '35%', fontFamily: 'var(--font-mono)' }}>{k}</td>
                      <td style={{ color: 'var(--text-body)', padding: '3px 6px', fontFamily: 'var(--font-mono)' }}>{String(v)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

