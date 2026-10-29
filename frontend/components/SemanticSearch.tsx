'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { Search, ZoomIn, FileText, AlertTriangle, Check, Link2, Share2, Clock, Command } from 'lucide-react';

type SearchResult = {
  id: string;
  case_number: string;
  title: string;
  transcript?: string;
  sha256_hash?: string;
  mime_type?: string;
  similarity: number;
  created_at?: string;
  is_tampered?: boolean;
};

type Share = {
  url: string;
  expires_at: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

const DEFAULT_SUGGESTIONS = [
  'traffic accident',
  'armed robbery',
  'nagpur highway',
  'mumbai cctv',
  'audio wiretap',
  'crime scene clean up',
  'CASE-2026-PDF1',
];

export default function SemanticSearch({ onSelect }: { onSelect: (result: SearchResult) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [suggestedQueries, setSuggestedQueries] = useState<string[]>(DEFAULT_SUGGESTIONS);
  const [previews, setPreviews] = useState<Record<string, Share>>({});
  const [now, setNow] = useState(Date.now());
  const [zoom, setZoom] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleQuickSearch = (keyword: string) => {
    setQuery(keyword);
    void executeSearch(keyword);
  };

  // Dynamically load search suggestions from real preserved vault records
  useEffect(() => {
    fetch(`${API_BASE}/api/v1/evidence/list?per_page=15`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.items && Array.isArray(data.items)) {
          const dynamicSet = new Set<string>();
          for (const item of data.items) {
            if (item.case_number) dynamicSet.add(item.case_number);
            if (
              item.title &&
              item.title.length > 2 &&
              !item.title.toLowerCase().startsWith('screenshot') &&
              !item.title.toLowerCase().startsWith('pexels')
            ) {
              dynamicSet.add(item.title.toLowerCase());
            }
          }
          for (const s of DEFAULT_SUGGESTIONS) {
            dynamicSet.add(s);
          }
          setSuggestedQueries(Array.from(dynamicSet).slice(0, 8));
        }
      })
      .catch(() => {});
  }, []);

  // Live countdown timer ticker
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Keyboard shortcut listener: ⌘K or Ctrl+K focuses search
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  async function executeSearch(searchText: string) {
    const trimmed = searchText.trim();
    if (!trimmed) {
      setResults([]);
      setHasSearched(false);
      setBusy(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setBusy(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE}/api/v1/search/semantic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trimmed, limit: 12, threshold: 0.1 }),
        signal: controller.signal,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.detail ?? 'Search failed');
      const nextResults: SearchResult[] = payload.results ?? [];
      setResults(nextResults);
      setHasSearched(true);

      const signed = await Promise.all(
        nextResults.map(async (result: SearchResult) => {
          try {
            const shareResponse = await fetch(
              `${API_BASE}/api/v1/evidence/${result.id}/share-url?expiry_minutes=15&view_mode=preview`,
              { signal: controller.signal },
            );
            return shareResponse.ok ? ([result.id, await shareResponse.json()] as const) : null;
          } catch {
            return null;
          }
        }),
      );
      setPreviews(Object.fromEntries(signed.filter((entry): entry is readonly [string, Share] => Boolean(entry))));
    } catch (searchError: any) {
      if (searchError?.name !== 'AbortError') {
        setError(searchError instanceof Error ? searchError.message : 'Search failed');
        setHasSearched(true);
      }
    } finally {
      setBusy(false);
    }
  }

  // Live auto-search as user types (debounced by 300ms)
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    const timer = setTimeout(() => {
      executeSearch(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    executeSearch(query);
  }

  async function copyShare(id: string) {
    const response = await fetch(`${API_BASE}/api/v1/evidence/${id}/share-url?expiry_minutes=15&view_mode=preview`);
    const share = await response.json();
    if (response.ok) {
      setPreviews((current) => ({ ...current, [id]: share }));
      await navigator.clipboard.writeText(share.url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  }

  const secondsLeft = (share?: Share) =>
    share ? Math.max(0, Math.ceil((new Date(share.expires_at).getTime() - now) / 1000)) : 0;

  const renderMedia = (result: SearchResult, share?: Share) => {
    if (!share) {
      return (
        <div className="media-thumbnail-area">
          <span className="media-format-tag">{result.mime_type?.toUpperCase().split('/')[1] ?? 'FILE'}</span>
          <span style={{ font: '600 11px var(--font-mono)', color: 'var(--text-muted)' }}>Signing Preview…</span>
        </div>
      );
    }
    if (result.mime_type?.startsWith('audio/')) {
      return (
        <div className="media-thumbnail-area" style={{ padding: '16px', flexDirection: 'column', gap: '8px' }}>
          <span className="media-format-tag">AUDIO RECORDING</span>
          <audio controls src={share.url} style={{ width: '92%', height: '36px' }} />
        </div>
      );
    }
    if (result.mime_type?.startsWith('video/')) {
      return (
        <div className="media-thumbnail-area">
          <span className="media-format-tag">CCTV / VIDEO</span>
          <video controls src={share.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      );
    }
    if (result.mime_type?.startsWith('image/')) {
      return (
        <div className="media-thumbnail-area" onClick={(e) => { e.stopPropagation(); setZoom(share.url); }}>
          <img src={share.url} alt="Evidence preview" className="media-thumbnail-img" />
          <span className="media-format-tag">FORENSIC PHOTO</span>
          <span style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <ZoomIn size={12} /> Click to Zoom
          </span>
        </div>
      );
    }
    return (
      <div className="media-thumbnail-area">
        <span className="media-format-tag">LEGAL DOCUMENT (PDF)</span>
        <FileText size={32} color="var(--cyan)" />
      </div>
    );
  };

  return (
    <section className="panel search-section">
      <div className="section-heading">
        <div>
          <span className="eyebrow">[01] REPOSITORY &amp; MULTIMODAL VECTOR RETRIEVAL</span>
          <h2>Search Evidence by Keyword or Concept</h2>
        </div>
        <span className="status-chip">{results.length} Indexed Matches</span>
      </div>

      <form className="search-form" onSubmit={handleSubmit}>
        <div className="search-input-wrap">
          <span className="search-input-icon"><Search size={16} /></span>
          <input
            ref={searchInputRef}
            className="search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search indexed vault: 'traffic', 'robbery', 'cctv', 'nagpur', 'audio wiretap', 'CASE-2026-PDF1'…"
          />
          <kbd className="search-shortcut-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
            <Command size={11} />K
          </kbd>
        </div>
        <button className="button button-primary" disabled={busy}>
          {busy ? 'Scanning Index…' : 'Semantic Search'}
        </button>
      </form>

      <div className="search-chips-row">
        <span className="search-chips-label">Indexed Topics:</span>
        <div className="search-chips-list">
          {suggestedQueries.map((keyword) => (
            <button
              key={keyword}
              type="button"
              className="search-chip-btn"
              onClick={() => handleQuickSearch(keyword)}
              disabled={busy}
            >
              {keyword}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <AlertTriangle size={15} style={{ display: 'inline', marginRight: 6 }} /> {error}
        </div>
      )}

      <div className="result-grid">
        {results.map((result) => {
          const matchPct = Math.round(Math.max(0, Math.min(1, result.similarity)) * 100);
          return (
            <article className="evidence-card" key={result.id} onClick={() => onSelect(result)}>
              {renderMedia(result, previews[result.id])}
              <div className="confidence-meter-badge">
                {matchPct}% Match via CLIP ViT-B/32
              </div>

              <div className="card-body">
                <div className="card-case-row">
                  <span>CASE: <code>{result.case_number}</code></span>
                  {result.is_tampered ? (
                    <span className="tamper-badge tamper-alert" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      <AlertTriangle size={10} /> TAMPERED
                    </span>
                  ) : (
                    <span className="tamper-badge tamper-clean" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      <Check size={10} /> AUTHENTIC
                    </span>
                  )}
                </div>

                <h3 className="card-title">{result.title}</h3>

                {result.transcript && (
                  <p className="card-snippet">
                    &ldquo;{result.transcript.slice(0, 140)}{result.transcript.length > 140 ? '…' : ''}&rdquo;
                  </p>
                )}

                <div className="card-actions-bar">
                  <button
                    type="button"
                    className="text-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(result);
                    }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Link2 size={13} /> Inspect Custody
                  </button>

                  <button
                    type="button"
                    className="text-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void copyShare(result.id);
                    }}
                    title="Generate cryptographic time-bounded link"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    {copiedId === result.id ? (
                      <>
                        <Check size={13} color="var(--emerald)" /> Link Copied
                      </>
                    ) : (
                      <>
                        <Share2 size={13} /> Share Link
                      </>
                    )}
                  </button>

                  {previews[result.id] && (
                    <small style={{ font: '600 10.5px var(--font-mono)', color: 'var(--amber)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={11} /> {secondsLeft(previews[result.id])}s
                    </small>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {!busy && hasSearched && results.length === 0 && query.trim() !== '' && (
        <div className="empty-state compact" style={{ padding: '32px 24px', textAlign: 'center' }}>
          <div style={{ margin: '0 auto 12px', display: 'inline-flex', padding: '10px', borderRadius: '50%', background: 'var(--amber-badge-bg)', border: '1px solid var(--amber-badge-border)' }}>
            <Search size={22} color="var(--amber-text)" />
          </div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '6px' }}>
            No Semantic Matches Found for &ldquo;{query}&rdquo;
          </h3>
          <p style={{ maxWidth: '520px', margin: '0 auto 16px', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Vector similarity compares natural language prompts against CLIP ViT-B/32 neural embeddings and Whisper audio transcripts of preserved records in this vault.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-warm)' }}>
              Click an indexed test dataset topic to explore results:
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '6px' }}>
              {suggestedQueries.map((kw) => (
                <button
                  key={kw}
                  type="button"
                  className="search-chip-btn"
                  onClick={() => handleQuickSearch(kw)}
                >
                  {kw}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {zoom && (
        <div className="inspector-backdrop" onClick={() => setZoom(null)}>
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 70, maxWidth: '90vw', maxHeight: '90vh' }}>
            <img src={zoom} alt="High resolution zoom" style={{ maxWidth: '100%', maxHeight: '88vh', borderRadius: '16px', border: '1px solid var(--border-accent)', boxShadow: '0 20px 80px rgba(0,0,0,0.8)' }} />
          </div>
        </div>
      )}
    </section>
  );
}
