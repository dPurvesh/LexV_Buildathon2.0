# LEXVAULT: AI-Powered Legal Evidence Management & Forensic Integrity System
**Academic Capstone / Semester 5 Project Documentation**

---

## 1. Executive Summary & Project Overview

**LEXVAULT** is an enterprise-grade, tamper-evident digital evidence management platform engineered to resolve the critical vulnerabilities in modern legal evidence handling: digital file tampering, broken chains of custody, unauthorized alteration, and procedural inadmissibility in courts of law.

LEXVAULT combines:
1. **Client-side & Server-side Cryptographic Dual-Hashing** (SHA-256 & Perceptual Hashing)
2. **Immutable WORM (Write-Once-Read-Many) Storage Vault** with 365-day compliance locks
3. **Public Blockchain Anchoring** on the Ethereum Sepolia testnet for immutable timestamping and custody transition logs
4. **Multimodal Forensic AI Processing** (OpenCV Error Level Analysis, faster-whisper speech-to-text, and OpenAI CLIP vector embeddings)
5. **Section 65B Indian Evidence Act Court Dossier Generator** producing cryptographically verified PDF certificates with dynamic verification QR codes
6. **Handcrafted Glassmorphism Command Center** designed with modern typography (Inter + Fira Code), dynamic blurred frosted panels, and responsive status telemetry.

---

## 2. High-Level Architecture & Data Flow

```
+--------------------------------------------------------------------------------------------------+
|                                    LEXVAULT CLIENT (Browser)                                    |
|   Next.js 15 + React 19 + TypeScript + Custom Glassmorphic CSS (Tokens, Backdrop Filter, Blur)   |
|   Web Crypto API (In-Browser SHA-256 Digest Calculation before any network transmission)         |
+--------------------------------------------------------------------------------------------------+
                                                 |
                                     HTTP REST / CORS Port 3001
                                                 v
+--------------------------------------------------------------------------------------------------+
|                                  FASTAPI APPLICATION GATEWAY                                     |
|                       Uvicorn Asynchronous ASGI Server (Python 3.11)                             |
|       CORS Middleware | Pydantic Request Validation | Streaming Hash Calculator                  |
+--------------------------------------------------------------------------------------------------+
         |                              |                              |                       |
         v                              v                              v                       v
+------------------+          +------------------+          +--------------------+  +------------------+
| PostgreSQL 16    |          | MinIO WORM       |          | Ethereum Sepolia   |  | Asynchronous     |
| + pgvector       |          | S3 Object Vault  |          | Smart Contract     |  | AI Worker        |
| Relational data, |          | 365-Day Retention|          | Immutable Proof of |  | ELA Heatmap,     |
| custody logs,    |          | Compliance Lock, |          | Existence & State  |  | pHash, Whisper,  |
| 512-dim vectors  |          | Zero Overwrites  |          | Transitions        |  | CLIP Embeddings  |
+------------------+          +------------------+          +--------------------+  +------------------+
         ^                                                                                     |
         +-------------------------------------------------------------------------------------+
                                  Persists AI embeddings & forensic metrics
```

### End-to-End Forensic Ingestion Lifecycle

1. **Client Ingestion**: An investigator selects or drops an evidence file into the browser.
2. **Pre-Upload Cryptographic Fingerprint**: The browser's native `window.crypto.subtle` API computes the raw SHA-256 hexadecimal hash client-side before upload.
3. **Streaming Ingestion**: The file is streamed via multipart form data to FastAPI (`/api/v1/evidence/upload`). As byte chunks stream into the backend, an internal `HashingStream` simultaneously computes the server-side SHA-256 digest without loading the entire payload into RAM.
4. **Integrity Validation**: FastAPI compares the client-claimed digest with the server-computed digest. Any mismatch immediately aborts the transaction (HTTP 400).
5. **WORM Vault Lock**: The stream is saved to MinIO in the `evidence-vault` bucket configured with Object Lock in `COMPLIANCE` mode for 365 days. Files cannot be deleted, renamed, or modified—even by root administrators.
6. **Blockchain Registration**: The SHA-256 hash, title, and custodian identifier are submitted via Web3.py to the `EvidenceLedger` smart contract deployed on the Ethereum Sepolia testnet. The resulting transaction hash and block number are recorded.
7. **Database Persistence**: Metadata, file size, MIME type, hashes, custody state, and Ethereum receipt are stored in PostgreSQL 16.
8. **Initial Custody Log**: An inaugural record (`INITIAL_INGESTION`) is created in `custody_history`.
9. **Asynchronous Multimodal AI Worker**:
   - **For Images**: Computes 64-bit Perceptual Hash (pHash) and generates Error Level Analysis (ELA) compression difference heatmaps using OpenCV.
   - **For Audio/Video**: Extracts audio tracks via FFmpeg and runs `faster-whisper` (CTranslate2) to extract word-level timestamped transcripts.
   - **Semantic Embeddings**: Generates 512-dimensional multimodal vector embeddings using CLIP (`openai/clip-vit-base-patch32`) and indexes them in PostgreSQL with `pgvector` IVFFlat indexing.

---

## 3. Technology Stack & Justification

| Layer | Technology | Version | Justification & Role |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | Next.js | 15.5.25 | React Server Components, fast client routing, optimized static builds, and native TypeScript safety. |
| **Frontend Runtime** | React | 19.1.1 | Reactive state primitives (`useState`, `useEffect`, `useCallback`), custom modals, and modular forensic components. |
| **Styling & Theme** | Vanilla CSS (Glassmorphism) | CSS3 / PostCSS | Eliminates generic Tailwind looks; implements custom HSL color palettes (indigo, violet, neon rose, emerald), frosted glass panels (`backdrop-filter: blur(20px)`), and glowing accents. |
| **Client Cryptography** | Web Crypto API | Native W3C | Calculates SHA-256 directly on the user's CPU before network transmission, preventing man-in-the-middle spoofing. |
| **Backend Framework** | FastAPI | 0.115+ | High-performance asynchronous Python framework with native OpenAPI/Swagger docs and strict Pydantic v2 type enforcement. |
| **ASGI Server** | Uvicorn | 0.30+ | Lightning-fast asynchronous server implementation based on `uvloop` and `httptools`. |
| **Relational Database** | PostgreSQL | 16.x | Enterprise ACID database for relational foreign keys, custody history sequences, and JSONB forensic records. |
| **Vector Engine** | pgvector | 0.7.x | Vector similarity search engine running directly inside Postgres; enables cosine distance similarity over 512-dim CLIP vectors. |
| **Object Storage** | MinIO | S3 API | Self-hosted S3-compatible storage with SEC Rule 17a-4 compliant WORM (Write-Once-Read-Many) Object Lock and Retention. |
| **Blockchain** | Ethereum (Sepolia) | EVM | Public decentralized ledger anchoring evidence hashes; provides mathematically irrefutable proof-of-existence and non-repudiation. |
| **Web3 Client** | Web3.py | 7.x | Python library for interacting with the Sepolia RPC node, compiling contract ABIs, signing raw transactions, and tracking block confirmations. |
| **Image Forensics** | OpenCV & Pillow | 4.10+ / 10.4+ | Error Level Analysis (ELA) resave differential calculations, JET colormap generation, and 64-bit pHash perceptual fingerprinting. |
| **Audio Transcription** | faster-whisper | 1.0+ | Fast CTranslate2-accelerated implementation of OpenAI's Whisper model; extracts exact word-by-word timestamped forensic transcripts. |
| **Multimodal Vector AI** | HuggingFace Transformers & PyTorch | 4.44+ | Runs CLIP (`ViT-B/32`) to convert both text search queries and evidence visual contents into a unified 512-dimensional semantic vector space. |
| **Court Dossier PDF** | ReportLab | 4.2+ | Generates Section 65B Indian Evidence Act compliant legal certificates with dynamic embedded QR codes, watermarks, and cryptographic audit tables. |
| **Containerization** | Docker & Docker Compose | 3.8+ | Fully reproducible multi-container deployment: database, MinIO vault, MinIO initialization client, and FastAPI backend. |

---

## 4. Database Schema & Data Models

### 1. `evidence` Table
Stores primary evidence records, cryptographic digests, storage locations, and blockchain receipts.

```sql
CREATE TABLE evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_number VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(128) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    sha256_hash VARCHAR(64) NOT NULL UNIQUE,
    phash VARCHAR(64),
    minio_object_key VARCHAR(512) NOT NULL,
    eth_tx_hash VARCHAR(66),
    block_number BIGINT DEFAULT 0,
    tamper_score FLOAT DEFAULT 0.0,
    is_tampered BOOLEAN DEFAULT FALSE,
    current_custodian_address VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    ai_indexed BOOLEAN DEFAULT FALSE
);
```

### 2. `custody_history` Table
Maintains an unbroken, chronological audit trail of all custody transfers and evidentiary operations.

```sql
CREATE TABLE custody_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evidence_id UUID REFERENCES evidence(id) ON DELETE RESTRICT,
    from_custodian VARCHAR(255) NOT NULL,
    to_custodian VARCHAR(255) NOT NULL,
    action_type VARCHAR(64) NOT NULL,
    notes TEXT DEFAULT '',
    eth_tx_hash VARCHAR(66),
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

### 3. `evidence_ai_index` Table
Contains multimodal semantic vectors and forensic textual analysis.

```sql
CREATE TABLE evidence_ai_index (
    evidence_id UUID PRIMARY KEY REFERENCES evidence(id) ON DELETE CASCADE,
    clip_embedding vector(512),
    transcript TEXT,
    transcript_words JSONB,
    keyframes JSONB,
    summary TEXT,
    ocr_text TEXT,
    indexed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

---

## 5. API Endpoints Catalog

### Evidence Management (`/api/v1/evidence`)
- `POST /upload`: Multipart upload with client SHA-256 verification, MinIO WORM storage, Sepolia anchoring, and DB entry.
- `POST /verify`: Uploads any file to re-calculate SHA-256 and checks against PostgreSQL and Sepolia contract.
- `GET /list`: Paginated evidence listing with search filter, case filter, and tamper indicators.
- `GET /{evidence_id}/detail`: Complete evidentiary record including on-chain transaction hash and perceptual hash.
- `POST /{evidence_id}/custody`: Executes a legal custody transfer, recording a new custody event and optional blockchain transition.
- `GET /{evidence_id}/custody`: Returns the chronological chain of custody timeline for an evidence item.
- `GET /export-csv`: Streams a cryptographic audit CSV report of all registered evidence items in the global ledger.
- `GET /{evidence_id}/share-url`: Generates a time-limited, expiring presigned URL (15–30 min) to view or download raw evidence.
- `GET /{evidence_id}/certificate`: Streams a Court Dossier Section 65B Certificate as a generated PDF with embedded QR code.

### Forensic Analysis (`/api/v1/forensics`)
- `GET /{evidence_id}/ela-heatmap`: Generates an on-the-fly Error Level Analysis (ELA) compression heatmap (JPEG 95% differential with JET colormap).
- `GET /{evidence_id}/transcript`: Returns the complete audio transcription with word-by-word timestamp markers.

### Search Engine (`/api/v1/search`)
- `POST /semantic`: Hybrid search executing both SQL keyword matching (`ILIKE`) and cosine distance vector search (`1 - (clip_embedding <=> query_vec)`).

### System Analytics (`/api/v1/stats`)
- `GET /dashboard`: Aggregate counts for total evidence, active cases, total storage bytes, pending AI tasks, and tamper alerts.
- `GET /cases`: Grouped portfolio metrics by `case_number` including evidence count, latest upload timestamp, and tamper flags.

### Blockchain Telemetry (`/api/v1/blockchain`)
- `GET /status`: Live status of Ethereum Sepolia connection, Chain ID (`11155111`), latest block number, and relayer wallet balance.

---

## 6. Legal & Regulatory Compliance

### Section 65B, Indian Evidence Act, 1872 / BSA 2023
Section 65B mandates that electronic records are admissible only if accompanied by an official certificate detailing:
- The device or vault used to preserve the record
- Confirmation that the computing system was operating properly
- Technical specifications ensuring no unauthorized tampering or alteration took place
- Digital identifiers (SHA-256 cryptographic hashes and timestamping receipts)

LEXVAULT automatically produces this certificate via the **Court Dossier (PDF)** export, embedding a dynamic QR code verifying the record directly against the on-chain smart contract.

### ISO/IEC 27037:2012 Standard
Adheres to international guidelines for digital evidence collection and preservation:
- **Auditability**: Every custody transfer records previous custodian, receiving custodian, reason, and timestamp.
- **Repeatability**: Anyone can drop an evidence file into the Verification Dropzone to re-derive the identical SHA-256 digest.
- **Integrity Defense**: MinIO WORM mode guarantees non-alteration.

---

## 7. Current Network & Environment Ports

- **Frontend Application**: `http://localhost:3001` (Next.js 15 dev server)
- **Backend REST Gateway**: `http://localhost:8000` (FastAPI + Uvicorn)
- **PostgreSQL Database**: `localhost:5432` (`forensic_admin` / `secure_password` / `evidence_db`)
- **MinIO Object Vault Console**: `http://localhost:9001` (`minio_admin` / `minio_secure_password`)
- **MinIO S3 API**: `http://localhost:9000`
- **Ethereum Network**: Sepolia Testnet (Chain ID `11155111`)
- **Docker Compose Services**: `erinew-backend-1`, `erinew-frontend-1`, `erinew-database-1`, `erinew-minio-1`
