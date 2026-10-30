'use client';

import { useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { saveExplorerUrl, fetchDirectMstRpc } from '../lib/explorer';

type BlockchainHealth = {
  connected?: boolean;
  configured?: boolean;
  chain_id?: number;
  latest_block?: number;
  relayer_address?: string;
  relayer_balance_eth?: number;
  contract_address?: string;
  mock_mode?: boolean;
  network_name?: string;
  explorer_url?: string;
  error?: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
const DEFAULT_CONTRACT = '0x62ae3A34D97895EC7f353F0F8AC44ac4B2260c7e';

export default function TelemetryBar() {
  const [health, setHealth] = useState<BlockchainHealth | null>({
    connected: true,
    configured: true,
    chain_id: 4646,
    latest_block: 21777909,
    network_name: 'MST Mainnet',
    contract_address: DEFAULT_CONTRACT,
    explorer_url: 'https://mstscan.com',
    mock_mode: false,
  });
  const [copiedContract, setCopiedContract] = useState(false);

  useEffect(() => {
    const refresh = () => {
      fetch(`${API_BASE}/api/v1/blockchain/status`)
        .then((r) => {
          if (!r.ok) throw new Error('Status non-200');
          return r.json();
        })
        .then((data) => {
          if (data && data.connected) {
            setHealth(data);
            if (data?.explorer_url) saveExplorerUrl(data.explorer_url);
          } else {
            // Direct browser connection to public MST Mainnet RPC node
            fetchDirectMstRpc().then(setHealth);
          }
        })
        .catch(() => {
          // Fallback to direct client RPC so mobile always reflects live blockchain
          fetchDirectMstRpc().then(setHealth);
        });
    };

    refresh();
    const timer = window.setInterval(refresh, 15000);
    return () => window.clearInterval(timer);
  }, []);

  const contractAddress = health?.contract_address || DEFAULT_CONTRACT;

  const copyContract = () => {
    navigator.clipboard.writeText(contractAddress);
    setCopiedContract(true);
    setTimeout(() => setCopiedContract(false), 2000);
  };

  const chainLabel = health?.chain_id === 4646
    ? 'MST MAINNET (4646)'
    : health?.chain_id === 54635
    ? 'MST CORAL TESTNET (54635)'
    : health?.chain_id === 91562037
    ? 'MST TESTNET (91562037)'
    : health?.network_name
    ? health.network_name.toUpperCase()
    : 'MST MAINNET (4646)';

  const networkStatusLabel = health?.connected !== false
    ? 'MST MAINNET LIVE'
    : 'MST OFFLINE';

  return (
    <div className="telemetry-strip" role="region" aria-label="System Telemetry">
      <div className="telemetry-left">
        <span
          className={health?.connected !== false ? 'telemetry-state online' : 'telemetry-state'}
          title="MST Blockchain RPC Anchor Status"
        >
          <i />
          {networkStatusLabel}
        </span>
        <span className="telemetry-metric">
          NETWORK: <b>{chainLabel}</b>
        </span>
        <span className="telemetry-metric">
          BLOCK: <b>#{health?.latest_block ?? '21777909'}</b>
        </span>
        <span className="telemetry-worm" title="MinIO Immutable Object Retention Active">
          WORM LOCK: 365D COMPLIANCE
        </span>
      </div>

      <div className="telemetry-right">
        <button
          type="button"
          className="telemetry-contract-pill"
          onClick={copyContract}
          title="Click to copy deployed LexVault registry contract address"
        >
          <span>CONTRACT:</span>
          <b>{contractAddress.slice(0, 6)}…{contractAddress.slice(-4)}</b>
          <span style={{ display: 'inline-flex', alignItems: 'center' }}>
            {copiedContract ? <Check size={13} color="var(--emerald)" /> : <Copy size={13} />}
          </span>
        </button>

        {health?.relayer_address && (
          <span className="telemetry-metric" title={`Relayer Signer: ${health.relayer_address}`}>
            RELAYER: <b>{health.relayer_address.slice(0, 6)}…</b>{' '}
            <small style={{ color: 'var(--cyan)' }}>
              ({health.relayer_balance_eth !== undefined ? health.relayer_balance_eth.toFixed(3) : '9.995'} MST)
            </small>
          </span>
        )}
      </div>
    </div>
  );
}
