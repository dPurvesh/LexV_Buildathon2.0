-- Migration 002: Add word-level transcript timestamps and EXIF metadata
-- These columns support synchronized transcript playback and forensic EXIF display.

-- Store word-level timestamps from Whisper for synchronized audio/video playback
ALTER TABLE evidence_ai_index ADD COLUMN IF NOT EXISTS transcript_words JSONB;

-- Store EXIF metadata extracted from images for forensic analysis
ALTER TABLE evidence ADD COLUMN IF NOT EXISTS exif_data JSONB;
