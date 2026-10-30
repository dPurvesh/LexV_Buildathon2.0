'use client';

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, ShieldAlert, CheckCircle2, Camera, Navigation, Layers, RefreshCw } from 'lucide-react';

export type GeoPoint = {
  id: string;
  case_number: string;
  title: string;
  file_name: string;
  mime_type: string;
  is_tampered: boolean;
  tamper_score: number;
  current_custodian: string;
  created_at: string;
  latitude: number;
  longitude: number;
  altitude?: number;
  location_name?: string;
  camera_make?: string;
  camera_model?: string;
  is_software_modified?: boolean;
  software?: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' ? 'https://lexvault-backend.onrender.com' : 'http://localhost:8000');

export default function CrimeSceneMap({
  selectedCase,
  onSelectEvidence,
}: {
  selectedCase?: string | null;
  onSelectEvidence?: (id: string) => void;
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const [points, setPoints] = useState<GeoPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>(selectedCase || 'ALL');
  const [selectedPoint, setSelectedPoint] = useState<GeoPoint | null>(null);

  // Sync activeFilter when selectedCase prop changes
  useEffect(() => {
    if (selectedCase) {
      setActiveFilter(selectedCase);
    }
  }, [selectedCase]);

  // Fetch geo-points from backend
  const fetchPoints = async () => {
    setLoading(true);
    try {
      const url =
        activeFilter && activeFilter !== 'ALL'
          ? `${API_BASE}/api/v1/forensics/geo-points?case_number=${encodeURIComponent(activeFilter)}`
          : `${API_BASE}/api/v1/forensics/geo-points`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setPoints(data.points || []);
      }
    } catch {
      setPoints([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPoints();
  }, [activeFilter]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [18.5204, 73.8567], // Default center around Pune CFSL jurisdiction
        zoom: 13,
        zoomControl: true,
        attributionControl: false,
      });

      // Add tactical dark-contrast OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        subdomains: ['a', 'b', 'c'],
      }).addTo(map);

      // Attribution
      L.control
        .attribution({ position: 'bottomright', prefix: 'LexVault Mil-Spec GIS • OSM' })
        .addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update markers whenever points change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    if (points.length === 0) return;

    const bounds = L.latLngBounds([]);

    points.forEach((pt) => {
      const isBreached = pt.is_tampered || pt.is_software_modified;
      const markerColor = isBreached ? '#ef4444' : '#10b981';
      const glowColor = isBreached ? 'rgba(239, 68, 68, 0.45)' : 'rgba(16, 185, 129, 0.45)';

      const customIcon = L.divIcon({
        className: 'crime-scene-marker',
        html: `
          <div style="
            position: relative;
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <div style="
              position: absolute;
              width: 28px;
              height: 28px;
              border-radius: 50%;
              background: ${glowColor};
              animation: markerPulse 2s infinite ease-out;
            "></div>
            <div style="
              position: relative;
              width: 14px;
              height: 14px;
              border-radius: 50%;
              background: ${markerColor};
              border: 2px solid #ffffff;
              box-shadow: 0 0 10px ${markerColor};
            "></div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([pt.latitude, pt.longitude], { icon: customIcon });

      const swWarningHtml = pt.is_software_modified
        ? `<div style="margin-top: 6px; padding: 4px 8px; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 4px; font-size: 11px; color: #f87171; font-weight: 600;">
             ⚠️ Software Signature: ${pt.software || 'Altered post-capture'}
           </div>`
        : pt.camera_model
        ? `<div style="margin-top: 4px; font-size: 11px; color: #94a3b8;">
             📷 Camera: ${pt.camera_make ? `${pt.camera_make} ` : ''}${pt.camera_model}
           </div>`
        : '';

      const popupContent = `
        <div style="font-family: var(--font-sans, system-ui); min-width: 220px; padding: 4px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px;">
            <code style="font-size: 10px; background: #1e293b; color: #38bdf8; padding: 2px 6px; border-radius: 4px;">${pt.case_number}</code>
            <span style="font-size: 10.5px; font-weight: 700; color: ${markerColor};">
              ${isBreached ? '🔴 TAMPER DETECTED' : '🟢 VERIFIED CLEAN'}
            </span>
          </div>
          <strong style="display: block; font-size: 13px; color: #f8fafc; margin-bottom: 4px;">${pt.title}</strong>
          <small style="display: block; font-size: 11px; color: #64748b; margin-bottom: 6px;">📍 ${pt.location_name || 'Seizure Site'}</small>
          <div style="font-size: 10.5px; color: #94a3b8; font-family: var(--font-mono, monospace); margin-bottom: 6px;">
            Lat: ${pt.latitude.toFixed(5)} • Lon: ${pt.longitude.toFixed(5)}
          </div>
          ${swWarningHtml}
          <div style="margin-top: 10px; text-align: right;">
            <button id="inspect-btn-${pt.id}" style="
              background: #0284c7;
              color: white;
              border: none;
              padding: 4px 10px;
              border-radius: 4px;
              font-size: 11px;
              font-weight: 600;
              cursor: pointer;
            ">Inspect Evidence ↗</button>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, {
        className: 'lexvault-map-popup',
      });

      marker.on('click', () => {
        setSelectedPoint(pt);
      });

      marker.on('popupopen', () => {
        const btn = document.getElementById(`inspect-btn-${pt.id}`);
        if (btn && onSelectEvidence) {
          btn.onclick = () => onSelectEvidence(pt.id);
        }
      });

      markersGroup.addLayer(marker);
      bounds.extend([pt.latitude, pt.longitude]);
    });

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [points, onSelectEvidence]);

  const uniqueCases = Array.from(new Set(points.map((p) => p.case_number))).filter(Boolean);

  return (
    <div className="crime-map-wrapper">
      {/* Map Header & Controls */}
      <div className="crime-map-header">
        <div className="crime-map-title">
          <span className="crime-map-icon">
            <Navigation size={16} color="var(--cyan)" />
          </span>
          <div>
            <strong>CRIME SCENE GEOLOCATION RADAR</strong>
            <small>EXIF GPS coordinates &amp; physical evidence seizure mapping</small>
          </div>
        </div>

        <div className="crime-map-actions">
          {/* Case Filter Selector */}
          <div className="case-filter-pills">
            <button
              type="button"
              className={`filter-pill ${activeFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setActiveFilter('ALL')}
            >
              All Cases ({points.length})
            </button>
            {uniqueCases.slice(0, 4).map((cn) => (
              <button
                key={cn}
                type="button"
                className={`filter-pill ${activeFilter === cn ? 'active' : ''}`}
                onClick={() => setActiveFilter(cn)}
              >
                {cn}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="button button-secondary crime-map-refresh"
            onClick={fetchPoints}
            title="Refresh GPS Coordinates"
          >
            <RefreshCw size={13} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* Map Container */}
      <div className="crime-map-frame">
        <div ref={mapContainerRef} className="crime-map-leaflet-box" />

        {/* Tactical Legend Strip */}
        <div className="crime-map-legend">
          <div className="legend-item">
            <span className="legend-dot green"></span>
            <span>Authentic Seizure Site</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot red"></span>
            <span>Software Alteration / Tamper Detected</span>
          </div>
          <div className="legend-item count">
            <span>{points.length} GPS Pinpoints Active</span>
          </div>
        </div>
      </div>

      {/* Selected Point Detail Bar (If a marker was clicked) */}
      {selectedPoint && (
        <div className="crime-point-banner">
          <div className="point-main-info">
            <span className={`point-status-dot ${selectedPoint.is_tampered || selectedPoint.is_software_modified ? 'dot-red' : 'dot-green'}`}></span>
            <div>
              <strong>{selectedPoint.title}</strong>
              <small>Case: {selectedPoint.case_number} • {selectedPoint.location_name || 'Coordinates Locked'}</small>
            </div>
          </div>

          <div className="point-coords">
            <code>LAT: {selectedPoint.latitude.toFixed(6)}</code>
            <code>LON: {selectedPoint.longitude.toFixed(6)}</code>
            {selectedPoint.altitude && <code>ALT: {selectedPoint.altitude}m</code>}
          </div>

          {selectedPoint.software && (
            <div className={`point-software-chip ${selectedPoint.is_software_modified ? 'chip-red' : 'chip-blue'}`}>
              <Camera size={12} />
              <span>{selectedPoint.software}</span>
            </div>
          )}

          {onSelectEvidence && (
            <button
              type="button"
              className="button button-primary"
              style={{ padding: '4px 12px', fontSize: '11.5px' }}
              onClick={() => onSelectEvidence(selectedPoint.id)}
            >
              Open Inspector
            </button>
          )}
        </div>
      )}
    </div>
  );
}

