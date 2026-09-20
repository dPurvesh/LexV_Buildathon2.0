'use client';

import { useEffect, useRef, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

type Word = { word: string; start: number; end: number };
type TranscriptData = { text: string; words: Word[]; mime_type: string };

export default function TranscriptPlayer({
  evidenceId,
  onClose,
}: {
  evidenceId: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<TranscriptData | null>(null);
  const [mediaUrl, setMediaUrl] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const mediaRef = useRef<HTMLVideoElement & HTMLAudioElement>(null);
  const activeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/v1/forensics/${evidenceId}/transcript`)
      .then((r) => {
        if (!r.ok) throw new Error('Transcript unavailable');
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message));

    fetch(`${API_BASE}/api/v1/evidence/${evidenceId}/share-url?expiry_minutes=30&view_mode=preview`)
      .then((r) => r.json())
      .then((share) => setMediaUrl(share.url))
      .catch(() => {});
  }, [evidenceId]);

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentTime]);

  const handleTimeUpdate = () => {
    if (mediaRef.current) setCurrentTime(mediaRef.current.currentTime);
  };

  const seekTo = (time: number) => {
    if (mediaRef.current) {
      mediaRef.current.currentTime = time;
      mediaRef.current.play();
    }
  };

  const isActive = (word: Word) => currentTime >= word.start && currentTime <= word.end;
  const isSearchMatch = (word: Word) =>
    search.length > 0 && word.word.toLowerCase().includes(search.toLowerCase());

  return (
    <div className="transcript-modal" onClick={onClose}>
      <div className="transcript-content" onClick={(e) => e.stopPropagation()}>
        <div className="transcript-header">
          <div>
            <span className="eyebrow">SYNCHRONIZED TRANSCRIPT</span>
            <h3>Forensic Audio/Video Playback</h3>
          </div>
          <button className="inspector-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {!data && !error && <div className="loading-state">Loading transcript…</div>}

        {data && (
          <div className="transcript-layout">
            <div className="transcript-media">
              {data.mime_type?.startsWith('video/') ? (
                <video ref={mediaRef} src={mediaUrl} controls onTimeUpdate={handleTimeUpdate} className="transcript-video" />
              ) : (
                <audio ref={mediaRef} src={mediaUrl} controls onTimeUpdate={handleTimeUpdate} className="transcript-audio" />
              )}
            </div>

            <div className="transcript-text-panel">
              <input
                className="transcript-search"
                placeholder="Search in transcript…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="transcript-words">
                {data.words && data.words.length > 0 ? (
                  data.words.map((word, i) => (
                    <span
                      key={i}
                      ref={isActive(word) ? activeRef : undefined}
                      className={`transcript-word${isActive(word) ? ' active' : ''}${isSearchMatch(word) ? ' match' : ''}`}
                      onClick={() => seekTo(word.start)}
                      title={`${word.start.toFixed(1)}s – ${word.end.toFixed(1)}s`}
                    >
                      {word.word}{' '}
                    </span>
                  ))
                ) : (
                  <p className="transcript-plain">{data.text}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
