# LEXVAULT: AI-Powered Legal Evidence Management & Forensic Integrity System
**Academic Capstone / Semester 5 Project Documentation**

---

## 1. Executive Summary & Project Overview

**LEXVAULT** is an enterprise-grade, tamper-evident digital evidence management platform engineered to resolve the critical vulnerabilities in modern legal evidence handling: digital file tampering, broken chains of custody, unauthorized alteration, and procedural inadmissibility in courts of law.

LEXVAULT combines:
1. **Client-side & Server-side Cryptographic Dual-Hashing** (SHA-256 & Perceptual Hashing)
2. **Immutable WORM (Write-Once-Read-Many) Storage Vault** with 365-day compliance locks
3. **Public Blockchain Anchoring** on the MST Blockchain (MST Coral Testnet / Mainnet) for immutable timestamping and custody transition logs
4. **Deep Multi-Modal Forensic Tamper Engine**:
   - **🔴 Direct Red Tamper Localization & Bounding Box Engine**: Pinpoints the exact modified/spliced pixels by overlaying a vivid semi-transparent red highlight (`rgba(239, 68, 68, 0.55)`) onto altered areas, generates OpenCV contour bounding boxes labeled `ALTERED` / `ANOMALY`, and reports exact altered pixel percentages (e.g. `4.17%`) with bounding box coordinates.
   - **Perceptual Hash Matching (pHash)**: 64-bit DCT perceptual hashing capable of identifying modified/cropped/spliced derivatives even when the cryptographic SHA-256 has completely diverged.
   - **3-Way Interactive Split Slider**: Real-time canvas overlay allowing users to toggle between:
     1. `🔴 Original vs Red Tamper Highlight` (swipe across pristine vault baseline to reveal red alterations)
     2. `Original Vault vs Uploaded`
     3. `Uploaded vs ELA Heatmap`
   - **Dual-Mode ELA Viewer**: Switch between **`🔴 Red Anomaly Mask`** (direct anomaly overlay with bounding boxes) and **`🌡️ Thermal Spectrum`** (classic multi-color JET colormap), computed dynamically on-demand from MinIO.
   - **Pixel Difference Heatmaps**: Direct pixel delta highlighting exact spliced regions in thermal spectrum.
   - **PDF Document Text Diff**: Textual sequence alignment (`difflib`) highlighting additions in green and deletions in red.
5. **Pre-Ingestion Tamper Screening & MST Blockchain Consensus**: Warns investigators before vault entry if a file is an altered derivative of existing evidence, flagging it as `is_tampered = TRUE`, logging `INTAKE_TAMPER_FLAGGED`, and presenting live MST Blockchain validator consensus progress (~12–25s block time).
6. **Real-Time On-Spot Crime Scene Shutter & Geotagging**: Native optical camera capture with device GPS lock (latitude, longitude, elevation), automatic **Google Maps Satellite & Pinpoint** binding (`https://www.google.com/maps?q=...`), in-memory SHA-256 pre-hashing, and immediate WORM on-chain minting.
7. **Deep Hardware & EXIF Forensics Card**: Extracts sensor metadata (Make, Model, Lens, Software signatures, ISO, Timestamps) and automatically warns against sanitized/stripped EXIF or unauthorized post-capture image editing software.
8. **Legal PDF Document Clause Differential Engine**: Sequence alignment algorithm highlighting inserted clauses in `+ green` and deleted clauses in `- red` with computed forensic risk ratings.
9. **Repository & Semantic Discovery**: Instant **`✕ Clear Filter`** button, 1-click semantic topic chips, and graceful zero-match guidance.
7. **Section 65B Indian Evidence Act Court Dossier Generator** producing cryptographically verified PDF certificates with dynamic verification QR codes.
8. **Handcrafted Glassmorphism Command Center** designed with modern typography (Inter + Fira Code), dynamic blurred frosted panels, and responsive status telemetry.

---

## 2. High-Level Architecture & Data Flow

```
+--------------------------------------------------------------------------------------------------+
|                                    LEXVAULT CLIENT (Browser)                                    |
|   Next.js 15 + React 19 + TypeScript + Custom Glassmorphic CSS (Tokens, Backdrop Filter, Blur)   |
|   Web Crypto API (In-Browser SHA-256 Digest Calculation before any network transmission)         |
|   Interactive Split Slider & 3-Way Side-by-Side Forensic Image Comparison Inspector              |
+--------------------------------------------------------------------------------------------------+
                                                 |
                                     HTTP REST / Port 3000 (Docker) / 3001 (Dev)
                                                 v
+--------------------------------------------------------------------------------------------------+
|                                  FASTAPI APPLICATION GATEWAY                                     |
|                       Uvicorn Asynchronous ASGI Server (Python 3.11)                             |
|       CORS Middleware | Pydantic Request Validation | Streaming Hash Calculator                  |
+--------------------------------------------------------------------------------------------------+
         |                              |                              |                       |
         v                              v                              v                       v
+------------------+          +------------------+          +--------------------+  +------------------+
| PostgreSQL 16    |          | MinIO WORM       |          | MST Blockchain     |  | Multi-Modal      |
| + pgvector       |          | S3 Object Vault  |          | Smart Contract     |  | Forensic Engine  |
| Relational data, |          | 365-Day Retention|          | Immutable Proof of |  | pHash Matching,  |
| custody logs,    |          | Compliance Lock, |          | Existence & State  |  | Pixel Diff, ELA, |
| 512-dim vectors  |          | Zero Overwrites  |          | Transitions        |  | Whisper, CLIP    |
+------------------+          +------------------+          +--------------------+  +------------------+
         ^                                                                                     |
         +-------------------------------------------------------------------------------------+
                                  Persists AI embeddings & forensic metrics
```

### End-to-End Forensic Ingestion Lifecycle

1. **Client Ingestion**: An investigator selects or drops an evidence file into the browser.
2. **Pre-Upload Cryptographic Fingerprint**: The browser's native `window.crypto.subtle` API computes the raw SHA-256 hexadecimal hash client-side before upload.
3. **Pre-Ingestion Tamper Screening**: For images and PDFs, the client and server check perceptual fingerprints against registered vault evidence. If a derivative is detected, a warning chip alerts the user.
4. **Streaming Ingestion**: The file is streamed via multipart form data to FastAPI (`/api/v1/evidence/upload`). An internal `HashingStream` simultaneously computes the server-side SHA-256 digest without loading the entire payload into RAM.
5. **Integrity Validation**: FastAPI compares the client-claimed digest with the server-computed digest. Any mismatch immediately aborts the transaction (HTTP 400).
6. **WORM Vault Lock**: The stream is saved to MinIO in the `evidence-vault` bucket configured with Object Lock in `COMPLIANCE` mode for 365 days. Files cannot be deleted, renamed, or modified—even by root administrators.
7. **Blockchain Registration**: The SHA-256 hash, title, and custodian identifier are submitted via Web3.py to the `EvidenceLedger` smart contract deployed on the MST Blockchain (MST Coral Testnet / Mainnet). If already registered, it reuses the on-chain anchor gracefully.
8. **Database Persistence**: Metadata, file size, MIME type, hashes, custody state, tamper status, and MST receipt are stored in PostgreSQL 16.
9. **Initial Custody Log**: An inaugural record (`INITIAL_INGESTION` or `INTAKE_TAMPER_FLAGGED`) is created in `custody_history`.
10. **Asynchronous Multimodal AI Worker**:
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
| **Blockchain** | MST Blockchain | EVM (Coral 54635 / Testnet 91562037 / Mainnet 4646) | Public decentralized EVM ledger anchoring evidence hashes; provides mathematically irrefutable proof-of-existence on MSTScan. |
| **Web3 Client** | Web3.py | 7.x | Python library for interacting with the MST Blockchain RPC node, compiling contract ABIs, signing raw transactions, and tracking block confirmations. |
| **Perceptual Hashing** | imagehash (DCT) | 4.3+ | 64-bit Discrete Cosine Transform perceptual hashing for detecting modified derivatives via Hamming bit distance. |
| **Image Forensics** | OpenCV & Pillow | 4.10+ / 10.4+ | Error Level Analysis (ELA) resave differential calculations, pixel diff heatmaps, and JET false-color mapping. |
| **Document Forensics** | pypdf & difflib | 5.0+ | Text extraction and line-by-line sequence differential analysis for altered PDF contracts and affidavits. |
| **Audio Transcription** | faster-whisper | 1.0+ | Fast CTranslate2-accelerated implementation of OpenAI's Whisper model; extracts exact word-by-word timestamped forensic transcripts. |
| **Multimodal Vector AI** | HuggingFace Transformers & PyTorch | 4.44+ | Runs CLIP (`ViT-B/32`) to convert both text search queries and evidence visual contents into a unified 512-dimensional semantic vector space. |
| **Court Dossier PDF** | ReportLab | 4.2+ | Generates Section 65B Indian Evidence Act compliant legal certificates with dynamic embedded QR codes, watermarks, and cryptographic audit tables. |
| **Containerization** | Docker & Docker Compose | 3.8+ | Fully reproducible multi-container deployment: database, MinIO vault, MinIO initialization client, frontend, and FastAPI backend. |

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
    ai_indexed BOOLEAN DEFAULT FALSE,
    is_on_spot_capture BOOLEAN DEFAULT FALSE,
    exif_data JSONB DEFAULT NULL
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
- `POST /shutter-capture`: Native optical camera capture with live GPS geolocating, Google Maps linking, and immediate on-chain WORM minting.
- `POST /diff-documents`: PDF legal clause differential analysis identifying inserted/deleted text between two document revisions.
- `POST /upload`: Multipart upload with client SHA-256 verification, pre-ingestion derivative screening, MinIO WORM storage, MST Blockchain anchoring, and DB entry.
- `POST /verify`: Deep multi-modal verification supporting binary file upload or SHA-256 JSON body. Executes exact cryptographic matching, perceptual hash comparison (pHash Hamming distance $\le 15$), Error Level Analysis (ELA) heatmap generation, direct visual pixel diffing (`diff_heatmap_b64`), direct red tamper highlight overlay with OpenCV bounding boxes (`red_overlay_b64`), tamper coordinates (`tamper_boxes`), altered pixel area ratio (`changed_pixels_ratio`), PDF text diffing (`difflib`), and detection of registered records flagged as tampered.
- `GET /list`: Paginated evidence listing with search filter, case filter, and tamper indicators.
- `GET /{evidence_id}/detail`: Complete evidentiary record including on-chain transaction hash and perceptual hash.
- `POST /{evidence_id}/custody`: Executes a legal custody transfer, recording a new custody event and optional blockchain transition.
- `GET /{evidence_id}/custody`: Returns the chronological chain of custody timeline for an evidence item.
- `GET /export-csv`: Streams a cryptographic audit CSV report of all registered evidence items in the global ledger.
- `GET /{evidence_id}/share-url`: Generates a time-limited, expiring presigned URL (15–30 min) to view or download raw evidence.
- `GET /{evidence_id}/certificate`: Streams a Court Dossier Section 65B Certificate as a generated PDF with embedded QR code.

### Forensic Analysis (`/api/v1/forensics`)
- `GET /{evidence_id}/ela-heatmap`: Generates an on-the-fly Error Level Analysis (ELA) compression heatmap and direct red anomaly mask with OpenCV bounding boxes (`red_overlay_b64`, `tamper_boxes`, `heatmap_b64`, `tamper_score`, `phash`).
- `GET /{evidence_id}/transcript`: Returns the complete audio transcription with word-by-word timestamp markers.

### Search Engine (`/api/v1/search`)
- `POST /semantic`: Hybrid search executing both SQL keyword matching (`ILIKE`) and cosine distance vector search (`1 - (clip_embedding <=> query_vec)`).

### System Analytics (`/api/v1/stats`)
- `GET /dashboard`: Aggregate counts for total evidence, active cases, total storage bytes, pending AI tasks, and tamper alerts.
- `GET /cases`: Grouped portfolio metrics by `case_number` including evidence count, latest upload timestamp, and tamper flags.

### Blockchain Telemetry (`/api/v1/blockchain`)
- `GET /status`: Live status of MST Blockchain connection, Chain ID (`54635` / `4646`), latest block number, relayer wallet balance, and MSTScan explorer URL.

### Maintenance Utilities (`backend/scripts`)
- `python scripts/purge_all.py`: Complete teardown and clean slate reset of all evidence records in PostgreSQL, MinIO S3 object buckets, and custody histories.
- `python scripts/delete_evidence.py --id <uuid>`: Targeted removal of specific test records during forensic laboratory calibration.

---

## 6. Role-Based Access Control (RBAC) & Forensic Personas

LEXVAULT enforces strict separation of evidentiary duties through three pre-configured forensic personas authenticated via 4-digit PINs. In accordance with forensic transparency principles, **all features remain visible in the UI**, but actions outside a persona's statutory jurisdiction are rendered as **LOCKED** (with visual padlock indicators and interactive elevation dialogs).

### Persona Matrix & Authorization Boundaries

| Dimension | 🛡️ Investigator | 🔬 Forensic Analyst | ⚖️ Court Auditor |
| :--- | :--- | :--- | :--- |
| **Default PIN** | **`1001`** | **`2002`** | **`3003`** |
| **Statutory Role** | Law Enforcement Officer | Forensic Laboratory Specialist | Legal & Compliance Officer |
| **Evidence Ingestion** | ✅ **Authorized** (Single & Batch) | 🔒 **Locked** (Restricted) | 🔒 **Locked** (Read-Only) |
| **Chain of Custody Transfer** | ✅ **Authorized** (Legal handover) | 🔒 **Locked** (No custody authority)| 🔒 **Locked** (Audit authority only)|
| **ELA Tamper Heatmap** | 🔒 **Locked** (Specialist tool) | ✅ **Authorized** (Full inspection) | 🔒 **Locked** (Specialist tool) |
| **Audio Speech Transcription** | 🔒 **Locked** (Specialist tool) | ✅ **Authorized** (Waveform/Words) | 🔒 **Locked** (Specialist tool) |
| **Section 65B Court Dossier (PDF)**| 🔒 **Locked** (Requires Auditor) | 🔒 **Locked** (Requires Auditor) | ✅ **Authorized** (Official seal) |
| **Global Ledger CSV Audit** | 🔒 **Locked** (Requires Auditor) | 🔒 **Locked** (Requires Auditor) | ✅ **Authorized** (Full export) |
| **Verification Dropzone** | ✅ **Authorized** | ✅ **Authorized** | ✅ **Authorized** |
| **Evidence Vault (Read)** | ✅ **Authorized** | ✅ **Authorized** | ✅ **Authorized** |

### Interactive Unlock & Elevation Workflow
1. **Visual Lock Signifiers**: Restricted buttons display a `🔒` badge, muted opacity, and hover alerts indicating the required persona.
2. **Tab Access Guard**: Clicking the **Upload** tab as an Analyst or Auditor renders an explanatory restricted-jurisdiction notice with statutory justification.
3. **Instant Elevation Modal**: Clicking any locked feature launches a frosted glass authorization dialog where the evaluator can either type the authorized PIN via keyboard or select one-click demo persona pills.

---

## 7. Legal & Regulatory Compliance

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

## 8. Current Network & Environment Ports

- **Frontend Application**: `http://localhost:3000` (Docker default) / `http://localhost:3001` (local dev server)
- **Backend REST Gateway**: `http://localhost:8000` (FastAPI + Uvicorn)
- **PostgreSQL Database**: `localhost:5432` (`forensic_admin` / `secure_password` / `evidence_db`)
- **MinIO Object Vault Console**: `http://localhost:9001` (`minio_admin` / `minio_secure_password`)
- **MinIO S3 API**: `http://localhost:9000`
- **Blockchain Network**: MST Blockchain (Coral Testnet `54635` / Testnet `91562037` / Mainnet `4646`)
- **Docker Compose Services**: `erinew-backend-1`, `erinew-frontend-1`, `erinew-database-1`, `erinew-minio-1`

---

## 10. Cloud Production Deployment & Live Verified Infrastructure

| Component | Target Platform | Live Endpoint / Contract |
| :--- | :--- | :--- |
| **Frontend Web App** | Render Cloud | [lexv-buildathon2-0-frontend.onrender.com](https://lexv-buildathon2-0-frontend.onrender.com) |
| **Backend REST API** | Render Cloud | [lexvault-backend.onrender.com](https://lexvault-backend.onrender.com) |
| **Cloud Database** | Render PostgreSQL 16 (Oregon) | `evidence_db_htz2` (31 records, 35 custody events) |
| **Smart Contract** | MST Mainnet (Chain ID 4646) | [`0x62ae3A34D97895EC7f353F0F8AC44ac4B2260c7e`](https://mstscan.com/address/0x62ae3A34D97895EC7f353F0F8AC44ac4B2260c7e) |
| **MST Mainnet RPC** | Public Validator | `https://mariorpc.mstblockchain.com/` |
| **Block Explorer** | MSTScan | [mstscan.com](https://mstscan.com/address/0x62ae3A34D97895EC7f353F0F8AC44ac4B2260c7e) |
