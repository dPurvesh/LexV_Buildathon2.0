import os
import psycopg
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.services.web3_service import blockchain_status
from app.api.v1.evidence import router as evidence_router
from app.api.v1.search import router as search_router
from app.api.v1.sharing import router as sharing_router
from app.api.v1.stats import router as stats_router
from app.api.v1.forensics import router as forensics_router
from app.api.v1.certificate import router as certificate_router

app = FastAPI(title="AI-Powered Legal & Evidence Management System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000", "http://127.0.0.1:3001", "*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(evidence_router)
app.include_router(search_router)
app.include_router(sharing_router)
app.include_router(stats_router)
app.include_router(forensics_router)
app.include_router(certificate_router)


def run_migrations():
    """Auto-initialize database tables if running on a fresh PostgreSQL deployment."""
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        return
    try:
        with psycopg.connect(db_url) as conn:
            with conn.cursor() as cur:
                try:
                    cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")
                except Exception:
                    pass

                cur.execute("""
                CREATE TABLE IF NOT EXISTS evidence (
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
                    is_on_spot_capture BOOLEAN DEFAULT FALSE,
                    exif_data JSONB,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
                """)

                try:
                    cur.execute("""
                    CREATE TABLE IF NOT EXISTS evidence_ai_index (
                        evidence_id UUID REFERENCES evidence(id) ON DELETE CASCADE,
                        transcript TEXT,
                        transcript_words JSONB,
                        embedding vector(512),
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    );
                    """)
                except Exception:
                    cur.execute("""
                    CREATE TABLE IF NOT EXISTS evidence_ai_index (
                        evidence_id UUID REFERENCES evidence(id) ON DELETE CASCADE,
                        transcript TEXT,
                        transcript_words JSONB,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    );
                    """)

                cur.execute("""
                CREATE TABLE IF NOT EXISTS custody_history (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    evidence_id UUID REFERENCES evidence(id) ON DELETE CASCADE,
                    from_custodian CHAR(42) NOT NULL,
                    to_custodian CHAR(42) NOT NULL,
                    action_type VARCHAR(50) NOT NULL,
                    notes TEXT,
                    eth_tx_hash CHAR(66) NOT NULL,
                    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
                """)

                cur.execute("ALTER TABLE evidence ADD COLUMN IF NOT EXISTS is_on_spot_capture BOOLEAN DEFAULT FALSE;")
                cur.execute("ALTER TABLE evidence ADD COLUMN IF NOT EXISTS exif_data JSONB;")
                cur.execute("ALTER TABLE evidence_ai_index ADD COLUMN IF NOT EXISTS transcript_words JSONB;")
            conn.commit()
            print("Database tables initialized successfully!")
    except Exception as e:
        print(f"Startup migration notice: {e}")


@app.on_event("startup")
def on_startup():
    run_migrations()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/v1/blockchain/status")
def blockchain_connection_status() -> dict:
    return blockchain_status()
