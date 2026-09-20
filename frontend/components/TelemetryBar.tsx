'use client';

import { useEffect, useState } from 'react';

type Health = { connected?: boolean; chain_id?: number; latest_block?: number; error?: string };
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export default function TelemetryBar() {
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    const refresh = () => fetch(`${API_BASE}/api/v1/blockchain/status`).then((response) => response.json()).then(setHealth).catch(() => setHealth({ error: 'Ledger status unavailable' }));
    refresh();
    const timer = window.setInterval(refresh, 15000);
    return () => window.clearInterval(timer);
  }, []);

  return <div className="telemetry-strip"><span className={health?.connected ? 'telemetry-state online' : 'telemetry-state'}><i />{health?.connected ? 'SEPOLIA LIVE' : 'LEDGER OFFLINE'}</span><span>CHAIN <b>{health?.chain_id ?? '—'}</b></span><span>BLOCK <b>{health?.latest_block ?? '—'}</b></span><span className="telemetry-worm">WORM / COMPLIANCE</span><span>CONTRACT <b>{health?.connected ? 'CONFIGURED' : '—'}</b></span></div>;
}
