'use client';

import { useEffect, useState } from 'react';

type EvidenceItem = {
  id: string;
  case_number: string;
  title: string;
  file_name: string;
  mime_type: string;
  file_size_bytes: number;
  sha256_hash: string;
  is_tampered: boolean;
  tamper_score: number;
  current_custodian_address: string;
  created_at: string;
  ai_indexed: boolean;
};

type ListResponse = {
  items: EvidenceItem[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function mimeIcon(mime: string): string {
  if (mime.startsWith('image/')) return '🖼';
  if (mime.startsWith('video/')) return '🎬';
  if (mime.startsWith('audio/')) return '🎵';
  if (mime.includes('pdf')) return '📄';
  return '📎';
}

export default function EvidenceTable({
  onInspect,
  caseFilter,
}: {
  onInspect: (id: string) => void;
  caseFilter?: string;
}) {
  const [data, setData] = useState<ListResponse | null>(null);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('created_at');
  const [order, setOrder] = useState('desc');
  const [caseSearch, setCaseSearch] = useState(caseFilter || '');
  const [tamperOnly, setTamperOnly] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (caseFilter !== undefined) setCaseSearch(caseFilter);
  }, [caseFilter]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      per_page: '15',
      sort,
      order,
      ...(caseSearch ? { case_filter: caseSearch } : {}),
      ...(tamperOnly ? { tamper_only: 'true' } : {}),
    });
    fetch(`${API_BASE}/api/v1/evidence/list?${params}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [page, sort, order, caseSearch, tamperOnly]);

  const toggleSort = (col: string) => {
    if (sort === col) setOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    else {
      setSort(col);
      setOrder('desc');
    }
    setPage(1);
  };

  const sortIcon = (col: string) => (sort === col ? (order === 'asc' ? ' ↑' : ' ↓') : '');

  return (
    <section className="panel evidence-table-panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">EVIDENCE VAULT</span>
          <h2>All preserved evidence</h2>
        </div>
        <span className="result-count">{data?.total ?? 0} items</span>
      </div>

      <div className="filter-bar">
        <input
          placeholder="Filter by case number…"
          value={caseSearch}
          onChange={(e) => {
            setCaseSearch(e.target.value);
            setPage(1);
          }}
          className="filter-input"
        />
        <label className="filter-toggle">
          <input
            type="checkbox"
            checked={tamperOnly}
            onChange={(e) => {
              setTamperOnly(e.target.checked);
              setPage(1);
            }}
          />
          <span>Tamper alerts only</span>
        </label>
        <button
          type="button"
          className="button button-secondary export-csv-btn"
          onClick={() => {
            const params = new URLSearchParams({
              ...(caseSearch ? { case_filter: caseSearch } : {}),
              ...(tamperOnly ? { tamper_only: 'true' } : {}),
            });
            window.open(`${API_BASE}/api/v1/evidence/export-csv?${params}`, '_blank');
          }}
          title="Export court-audited CSV ledger of current repository evidence"
        >
          📥 Export CSV Ledger
        </button>
      </div>

      {loading && !data ? (
        <div className="loading-state">Loading evidence…</div>
      ) : data && data.items.length > 0 ? (
        <>
          <div className="evidence-table-wrap">
            <table className="evidence-table">
              <thead>
                <tr>
                  <th onClick={() => toggleSort('case_number')}>Case #{sortIcon('case_number')}</th>
                  <th onClick={() => toggleSort('title')}>Title{sortIcon('title')}</th>
                  <th>Type</th>
                  <th onClick={() => toggleSort('file_size_bytes')}>Size{sortIcon('file_size_bytes')}</th>
                  <th onClick={() => toggleSort('tamper_score')}>Status{sortIcon('tamper_score')}</th>
                  <th>AI</th>
                  <th onClick={() => toggleSort('created_at')}>Created{sortIcon('created_at')}</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.id} onClick={() => onInspect(item.id)} className="evidence-row">
                    <td>
                      <code>{item.case_number}</code>
                    </td>
                    <td>
                      <span className="mime-icon">{mimeIcon(item.mime_type)}</span>
                      {item.title}
                    </td>
                    <td>
                      <small>{item.mime_type.split('/')[1]}</small>
                    </td>
                    <td>{formatSize(item.file_size_bytes)}</td>
                    <td>
                      {item.is_tampered ? (
                        <span className="tamper-badge tamper-alert">⚠ Tampered</span>
                      ) : (
                        <span className="tamper-badge tamper-clean">✓ Clean</span>
                      )}
                    </td>
                    <td>
                      <span
                        className={`status-dot ${item.ai_indexed ? 'dot-green' : 'dot-amber'}`}
                        title={item.ai_indexed ? 'Indexed' : 'Pending'}
                      />
                    </td>
                    <td>
                      <time>{new Date(item.created_at).toLocaleDateString()}</time>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.pages > 1 && (
            <div className="pagination">
              <button className="button button-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                ← Prev
              </button>
              <span>
                Page {data.page} of {data.pages}
              </span>
              <button
                className="button button-secondary"
                disabled={page >= data.pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next →
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="empty-state compact">
          <h3>No evidence in the vault yet</h3>
          <p>Upload evidence to start building your case repository.</p>
        </div>
      )}
    </section>
  );
}
