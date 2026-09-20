'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';

type SearchResult = { id: string; case_number: string; title: string; transcript?: string; sha256_hash?: string; mime_type?: string; similarity: number };
type Share = { url: string; expires_at: string };
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export default function SemanticSearch({ onSelect }: { onSelect: (result: SearchResult) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [previews, setPreviews] = useState<Record<string, Share>>({});
  const [now, setNow] = useState(Date.now());
  const [zoom, setZoom] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
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
    }
  }

  const secondsLeft = (share?: Share) =>
    share ? Math.max(0, Math.ceil((new Date(share.expires_at).getTime() - now) / 1000)) : 0;

  const media = (result: SearchResult, share?: Share) => {
    if (!share) return <div className="media-placeholder"><span>◈</span><small>Signing preview…</small></div>;
    if (result.mime_type?.startsWith('audio/')) return <div className="media-box"><audio controls src={share.url} /></div>;
    if (result.mime_type?.startsWith('video/')) return <div className="media-box"><video controls src={share.url} /></div>;
    if (result.mime_type?.startsWith('image/'))
      return (
        <button className="image-preview" onClick={(event) => { event.stopPropagation(); setZoom(share.url); }}>
          <img src={share.url} alt="Evidence preview" />
          <span>Zoom image</span>
        </button>
      );
    return <div className="media-placeholder"><span>▣</span><small>Secure document</small></div>;
  };

  return (
    <section className="search-section">
      <div className="search-intro">
        <div>
          <span className="eyebrow">HYBRID FORENSIC SEARCH</span>
          <h2>Find evidence by keyword or concept</h2>
          <p>Instant live search across titles, case numbers, audio transcripts, or visual scene descriptions.</p>
        </div>
        <span className="result-count">{results.length} matches</span>
      </div>

      <form className="search-form" onSubmit={handleSubmit}>
        <div style={{ position: 'relative', width: '100%' }}>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Type to search instantly by keyword, case #, title, or scene (e.g. traffic, CCTV, bodycam, CASE-2026)…"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setResults([]);
                setHasSearched(false);
              }}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: '#8190a5',
                fontSize: '14px',
                cursor: 'pointer',
                padding: '4px',
              }}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>
        <button className="button button-primary" disabled={busy}>
          {busy ? 'Searching…' : 'Search'}
        </button>
      </form>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="result-grid">
        {results.map((result) => (
          <article className="evidence-card" key={result.id} onClick={() => onSelect(result)}>
            {media(result, previews[result.id])}
            <div className="card-body">
              <div className="card-meta">
                <span>{result.case_number}</span>
                <strong>{Math.round(Math.max(0, Math.min(1, result.similarity)) * 100)}% match</strong>
              </div>
              <h3>{result.title}</h3>
              {result.transcript && (
                <p className="snippet">
                  “{result.transcript.slice(0, 150)}{result.transcript.length > 150 ? '…' : ''}”
                </p>
              )}
              <div className="card-actions">
                <button
                  className="text-button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelect(result);
                  }}
                >
                  Inspect custody
                </button>
                <button
                  className="text-button"
                  onClick={(event) => {
                    event.stopPropagation();
                    void copyShare(result.id);
                  }}
                >
                  Copy secure link
                </button>
                {previews[result.id] && <small>{secondsLeft(previews[result.id])}s left</small>}
              </div>
            </div>
          </article>
        ))}
      </div>

      {!busy && hasSearched && results.length === 0 && query.trim() !== '' && (
        <div className="empty-state compact">
          <h3>No matching evidence found</h3>
          <p>Try searching for keywords like &ldquo;traffic&rdquo;, &ldquo;bodycam&rdquo;, &ldquo;pipeline&rdquo;, a case number, or a visual scene description.</p>
        </div>
      )}

      {zoom && (
        <div className="zoom-modal" role="dialog" aria-label="Evidence image preview" onClick={() => setZoom(null)}>
          <img src={zoom} alt="High-resolution evidence preview" />
        </div>
      )}
    </section>
  );
}
