/**
 * Dynamic block explorer helper for MST Blockchain.
 * Reads live explorer URL cached from /api/v1/blockchain/status,
 * or falls back to NEXT_PUBLIC_BLOCK_EXPLORER_URL / MST Mainnet (https://mstscan.com).
 */

export function getExplorerBase(): string {
  if (typeof window !== 'undefined') {
    const cached = window.localStorage.getItem('mst_explorer_url');
    if (cached && cached.startsWith('http')) {
      return cached.replace(/\/$/, '');
    }
  }
  return (process.env.NEXT_PUBLIC_BLOCK_EXPLORER_URL || 'https://mstscan.com').replace(/\/$/, '');
}

export function txLink(hash?: string): string | undefined {
  if (!hash || !hash.startsWith('0x') || hash.length < 10) return undefined;
  return `${getExplorerBase()}/tx/${hash}`;
}

export function addressLink(address?: string): string | undefined {
  if (!address || !address.startsWith('0x')) return undefined;
  return `${getExplorerBase()}/address/${address}`;
}

export function saveExplorerUrl(url?: string): void {
  if (typeof window !== 'undefined' && url && url.startsWith('http')) {
    window.localStorage.setItem('mst_explorer_url', url.replace(/\/$/, ''));
  }
}

