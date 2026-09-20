CREATE EXTENSION IF NOT EXISTS vector;

-- Evidence Metadata Table
CREATE TABLE evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_number VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    sha256_hash CHAR(64) UNIQUE NOT NULL,
    phash VARCHAR(64),
    minio_object_key VARCHAR(512) NOT NULL,
    eth_tx_hash CHAR(66) NOT NULL,
    block_number BIGINT NOT NULL,
    current_custodian_address CHAR(42) NOT NULL,
    is_tampered BOOLEAN DEFAULT FALSE,
    tamper_score FLOAT DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Multimodal Search Embeddings & Transcripts
CREATE TABLE evidence_ai_index (
    evidence_id UUID REFERENCES evidence(id) ON DELETE CASCADE,
    transcript TEXT,
    embedding vector(512),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_evidence_embedding ON evidence_ai_index
    USING hnsw (embedding vector_cosine_ops);

-- Append-Only Chain of Custody History
CREATE TABLE custody_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evidence_id UUID REFERENCES evidence(id) ON DELETE CASCADE,
    from_custodian CHAR(42) NOT NULL,
    to_custodian CHAR(42) NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    notes TEXT,
    eth_tx_hash CHAR(66) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enforce append-only behaviour at the database level
CREATE OR REPLACE FUNCTION block_custody_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'custody_history is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_block_custody_update
BEFORE UPDATE OR DELETE ON custody_history
FOR EACH ROW EXECUTE FUNCTION block_custody_modification();