'use client';

import { useEffect, useState } from 'react';
import { useRole } from '../context/RoleContext';
import { ImageIcon, Video, Music, FileText, Paperclip, Download, Lock, AlertTriangle, Check, ArrowUp, ArrowDown, Eye, Link2, X } from 'lucide-react';

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

function mimeIcon(mime: string): React.ReactNode {
  if (mime.startsWith('image/')) return <ImageIcon size={14} color="var(--cyan)" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />;
  if (mime.startsWith('video/')) return <Video size={14} color="#a855f7" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />;
  if (mime.startsWith('audio/')) return <Music size={14} color="var(--amber)" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />;
  if (mime.includes('pdf')) return <FileText size={14} color="var(--crimson)" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />;
  return <Paperclip size={14} color="var(--text-muted)" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />;
}

export default function EvidenceTable({
  onInspect,
  onSelectCustody,
  caseFilter,
  onClearCaseFilter,
}: {
  onInspect: (id: string) => void;
  onSelectCustody?: (id: string) => void;
  caseFilter?: string;
  onClearCaseFilter?: () => void;
}) {
  const { hasPermission, openLockModal } = useRole();
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

  // Auto-refresh when any evidence is still pending AI processing
  useEffect(() => {
    const hasPending = data?.items?.some((item) => !item.ai_indexed);
    if (!hasPending) return;
    const timer = setInterval(() => {
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
        .catch(() => {});
    }, 3000);
    return () => clearInterval(timer);
  }, [data, page, sort, order, caseSearch, tamperOnly]);

  const toggleSort = (col: string) => {
    if (sort === col) setOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    else {
      setSort(col);
      setOrder('desc');
    }
    setPage(1);
  };

  const sortIcon = (col: string) => {
    if (sort !== col) return null;
    return order === 'asc' ? (
      <ArrowUp size={11} style={{ display: 'inline', marginLeft: 4, verticalAlign: 'middle' }} />
    ) : (
      <ArrowDown size={11} style={{ display: 'inline', marginLeft: 4, verticalAlign: 'middle' }} />
    );
  };

  const triggerExport = () => {
    const params = new URLSearchParams({
      ...(caseSearch ? { case_filter: caseSearch } : {}),
      ...(tamperOnly ? { tamper_only: 'true' } : {}),
    });
    window.open(`${API_BASE}/api/v1/evidence/export-csv?${params}`, '_blank');
  };

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
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
          <input
            placeholder="Filter by case number…"
            value={caseSearch}
            onChange={(e) => {
              setCaseSearch(e.target.value);
              setPage(1);
            }}
            className="filter-input"
            style={{ paddingRight: caseSearch ? '28px' : '12px' }}
          />
          {caseSearch && (
            <button
              type="button"
              onClick={() => {
                setCaseSearch('');
                onClearCaseFilter?.();
                setPage(1);
              }}
              title="Clear filter"
              style={{
                position: 'absolute',
                right: '8px',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <X size={13} />
            </button>
          )}
        </div>

        {caseSearch && (
          <button
            type="button"
            className="button button-secondary"
            onClick={() => {
              setCaseSearch('');
              onClearCaseFilter?.();
              setPage(1);
            }}
            style={{ fontSize: '12px', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
          >
            <X size={13} /> Clear Filter ({caseSearch})
          </button>
        )}
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
        {hasPermission('export_csv') ? (
          <button
            type="button"
            className="button button-secondary export-csv-btn"
            onClick={triggerExport}
            title="Export court-audited CSV ledger of current repository evidence"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Download size={14} /> Export CSV Ledger
          </button>
        ) : (
          <button
            type="button"
            className="button button-secondary export-csv-btn locked-action-btn"
            onClick={() =>
              openLockModal('Global Cryptographic Ledger Audit Export (CSV)', 'auditor', triggerExport)
            }
            title="Restricted: Requires Compliance Auditor clearance (PIN 3003)"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Lock size={14} /> Export CSV (Auditor)
          </button>
        )}
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
                  <th>Actions</th>
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
                        <span className="tamper-badge tamper-alert" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <AlertTriangle size={11} /> Tampered
                        </span>
                      ) : (
                        <span className="tamper-badge tamper-clean" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Check size={11} /> Clean
                        </span>
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
                    <td>
                      <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                        <button
                          type="button"
                          className="button button-secondary"
                          style={{ fontSize: '11px', padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onInspect(item.id);
                          }}
                          title="Open Evidence Inspector"
                        >
                          <Eye size={12} /> Inspect
                        </button>
                        {onSelectCustody && (
                          <button
                            type="button"
                            className="button button-secondary"
                            style={{
                              fontSize: '11px',
                              padding: '3px 8px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              borderColor: 'rgba(6, 182, 212, 0.35)',
                              color: 'var(--cyan)',
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectCustody(item.id);
                            }}
                            title="Inspect Chain of Custody Timeline"
                          >
                            <Link2 size={12} /> Custody
                          </button>
                        )}
                      </div>
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
