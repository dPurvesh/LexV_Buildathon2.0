# 🏛️ LEXVAULT: AI-Powered Legal Evidence Management & Forensic Integrity System

<div align="center">

[![Next.js](https://img.shields.io/badge/Next.js-15.5.25-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![MST Blockchain](https://img.shields.io/badge/MST_Blockchain-EVM_Compatible-06B6D4?style=for-the-badge&logo=blockchaindotcom)](https://coral.mstscan.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL_16-pgvector-336791?style=for-the-badge&logo=postgresql)](https://github.com/pgvector/pgvector)
[![MinIO](https://img.shields.io/badge/MinIO-SEC_Rule_17a--4_WORM-C72C48?style=for-the-badge&logo=minio)](https://min.io/)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-363636?style=for-the-badge&logo=solidity)](https://soliditylang.org/)

**Bridging the Critical Gap Between Cyber Forensics and Courtroom Admissibility**

*Built for the MST Blockchain Buildathon 2.0 • Presented by Team Gen-Z_PT*

</div>

---

## 🌐 Live Production Deployments & Contract Explorer

| Service | Environment | Live URL | Proof / Explorer |
| :--- | :--- | :--- | :--- |
| **Frontend Web App** | Render Cloud | [lexv-buildathon2-0-frontend.onrender.com](https://lexv-buildathon2-0-frontend.onrender.com) | Responsive (Mobile + Desktop), auto-routes API |
| **Backend API Gateway** | Render Cloud | [lexvault-backend.onrender.com](https://lexvault-backend.onrender.com) | Interactive Docs: `/docs` • Health: `/health` |
| **MST Mainnet Smart Contract** | MST Mainnet (4646) | [`0x62ae3A34D97895EC7f353F0F8AC44ac4B2260c7e`](https://mstscan.com/address/0x62ae3A34D97895EC7f353F0F8AC44ac4B2260c7e) | [View Verified Contract on MSTScan](https://mstscan.com/address/0x62ae3A34D97895EC7f353F0F8AC44ac4B2260c7e) |
| **Render Cloud PostgreSQL** | Render Oregon | `evidence_db_htz2` (PostgreSQL 16) | Pre-populated with 31 evidence records & custody logs |

---

## 📌 Executive Summary

Modern legal systems face an unprecedented crisis of trust in electronic evidence. Trivial generative AI edits, visual splicing, and metadata tampering have made digital media easy to manipulate, while conventional hashing systems fail to provide diagnostic clarity.

**LEXVAULT** solves this with a **4-Pillar Evidentiary Integrity Framework** combining:
1. **Hardware-grade WORM storage** (MinIO S3 compliance lock).
2. **Public decentralized blockchain anchoring** on **MST Blockchain** (MST Coral Testnet, MST Testnet, MST Mainnet) via smart contracts.
3. **Multi-modal computer-vision & audio AI** that pinpoints exact altered regions with **Red Tamper Localization Masks**, OpenCV bounding boxes, and **pHash perceptual matching**.
4. **Automated Section 65B court dossier generation** with embedded dynamic verification QR codes linking physical binders to on-chain MSTScan block receipts.

---

## 💥 The Problem: Why Digital Evidence Fails in Court

* **The "Cryptographic Avalanche" Blindspot**: Standard SHA-256 changes completely if even **1 single pixel** is edited in a 50MB file. Traditional evidence platforms simply output `"Hash Mismatch / File Invalid"`, offering **zero diagnostic intelligence** on *what* was changed or *where* the manipulation occurred.
* **Broken Chains of Custody**: Evidence handoffs between police, forensic laboratories, and courts rely on paper logs or mutable SQL databases that can be silently altered or deleted by root administrators.
* **70% Courtroom Inadmissibility Rate**: Over 70% of electronic records are challenged or dismissed in court under **Section 65B of the Indian Evidence Act** and **Section 63 of the Bharatiya Sakshya Adhiniyam (BSA 2023)** due to missing proof of unbroken custody and lack of system integrity certifications.

---

## 🛡️ The 4-Pillar Solution Architecture

```
                                      [ CLIENT WEBCRYPTO SHA-256 ]
                                                   │
                                                   ▼
┌─────────────────────────────────────── FASTAPI API GATEWAY ───────────────────────────────────────┐
│                                                                                                   │
│  • Streaming HashingStream Verification         • 3-Persona Role-Based Access Control (PIN)       │
│  • 64-bit DCT Perceptual Matching (pHash)       • Automated Section 65B PDF Dossier Engine        │
│                                                                                                   │
└──────────────┬───────────────────────────────────┬─────────────────────────────────┬──────────────┘
               ▼                                   ▼                                 ▼
┌─────────────────────────────┐     ┌─────────────────────────────┐   ┌─────────────────────────────┐
│       MinIO WORM S3         │     │     PostgreSQL 16 DB        │   │    MST Public Blockchain    │
│                             │     │                             │   │                             │
│ • SEC Rule 17a-4 COMPLIANCE │     │ • pgvector 512-dim CLIP     │   │ • EvidenceTracker.sol (EVM) │
│ • 365-Day Retention Lock    │     │ • ACID Custody History      │   │ • Irrefutable Timestamps    │
│ • Zero Overwrites/Deletions │     │ • Relational Audit Ledger   │   │ • Verifiable on MSTScan     │
└──────────────┬──────────────┘     └──────────────┬──────────────┘   └──────────────┬──────────────┘
               │                                   │                                 │
               └─────────────────┬─────────────────┘                                 │
                                 ▼                                                   ▼
                ┌───────────────────────────────────┐               ┌─────────────────────────────────┐
                │     FORENSIC VISION & AUDIO AI    │               │       COURTROOM VERIFIER        │
                │                                   │               │                                 │
                │ • 🔴 Direct Red Tamper Mask       │               │ • Section 65B Legal Certificate │
                │ • OpenCV Contours [ALTERED]       │               │ • Dynamic MSTScan QR Code       │
                │ • faster-whisper Audio Scrubbing  │               │ • Real-Time Telemetry & Status  │
                └───────────────────────────────────┘               └─────────────────────────────────┘
```

---

## ✨ Key Features & Technical Innovations

### 1. 🔴 Direct Red Tamper Localization & Bounding Boxes
* Replaces opaque heatmaps with a **direct pixel localization overlay**. Altered pixels are rendered in vivid translucent red (`rgba(239, 68, 68, 0.55)`), keeping pristine baseline pixels in natural photographic colors.
* Computer-vision perimeters are automatically drawn using **OpenCV contour detection** with cyan/crimson badges labeled **`ALTERED`**.
* Quantifies exact forensic metrics: e.g., `ALTERED AREA: 4.17% OF PIXELS` and coordinate bounds.

### 2. ↔️ 3-Way Interactive Split-Screen Slider
Real-time swipe comparisons directly on HTML5 canvas:
1. `🔴 Original Vault vs Red Tamper Highlight`
2. `Original Vault vs Uploaded Derivative`
3. `Uploaded vs ELA Compression Heatmap`

### 3. ⛓️ Public MST Blockchain Non-Repudiation
* Seamless multi-network EVM smart contract anchoring:
  * **MST Coral Testnet** (Chain ID: `54635`) — Explorer: [coral.mstscan.com](https://coral.mstscan.com)
  * **MST Testnet** (Chain ID: `91562037`) — Explorer: [testnet.mstscan.com](https://testnet.mstscan.com)
  * **MST Mainnet** (Chain ID: `4646`) — Explorer: [mstscan.com](https://mstscan.com)
* Uses dynamic chain ID detection and legacy gas pricing for sub-second block confirmations.
* Live telemetry bar displays **`MST MAINNET LIVE`**, **`MST TESTNET LIVE`**, or **`MST OFFLINE`** with block height and relayer MST balance.

### 4. 🔍 Hybrid AI Semantic Search (`pgvector` + CLIP ViT-B/32)
* Natural language vector search across all preserved evidence.
* Query abstract concepts such as *"traffic accident"*, *"night robbery"*, or *"weapon brandished"* without manual metadata tagging.
* Includes dynamic 1-click query suggestion chips and instant cosine distance filtering.

### 5. 🎙️ Word-Level Audio Forensic Scrubbing (`faster-whisper`)
* Fast local speech-to-text powered by CTranslate2 (no cloud APIs or sensitive data leaks).
* Word-level timestamp alignments allow investigators to click any word in a 911 call or bodycam transcript to jump audio playback to that exact second.

### 6. 🛡️ Statutory 3-Persona RBAC Gatekeeper
Enforces Indian legal duty separation with restricted PIN access:
* **Investigator (`PIN: 1001`)**: Evidence intake, batch upload, custody transfer initiation.
* **Forensic Analyst (`PIN: 2002`)**: ELA heatmaps, tamper radars, perceptual audio scrubbing.
* **Compliance Auditor (`PIN: 3003`)**: Statutory Section 65B PDF court dossiers, global CSV audit exports.

### 7. 📸 Real-Time Crime Scene Optical Shutter & Google Maps Geotagging
* Field investigators can seize photographic evidence directly on crime scenes using the hardware camera sensor.
* Live sensor acquisition embeds latitude, longitude, and elevation into an optical hardware profile (`LexVault Field Shutter v2.5`).
* Auto-generates a direct **Google Maps Satellite & Pinpoint** link (`https://www.google.com/maps?q=${lat},${lon}`) for 1-click courtroom verification with zero API rate limits.
* Computes WebCrypto SHA-256 before the image leaves optical memory and seals the record immediately on MST Mainnet.

### 8. 🔬 Deep EXIF & Hardware Metadata Forensics Card
* Extracts extensive camera and sensor telemetry: Make, Model, Lens Model, Software Signatures, Timestamps, and ISO values.
* **Tamper Indicators**:
  * Automatically flags when EXIF metadata has been intentionally stripped or sanitized (common web re-encoding or obfuscation).
  * Detects software tampering signatures from manipulation suites like Adobe Photoshop, GIMP, or Canva.

### 9. 📜 Legal Document & Contract Clause Differential Engine
* Sequence differential engine specifically built for legal PDF case reports and contracts.
* Detects stealthy modifications, inserted clauses (highlighted in `+ green`), and deleted liability clauses (highlighted in `- red`) with computed forensic risk ratings.

---

## 🛠️ Technology Stack

| Layer | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend** | Next.js + React | `15.5.25` / `19.1.1` | Modern server components, client navigation, fast static generation |
| **Styling** | Cyber-Forensic CSS | `CSS3` | Custom HSL design tokens, 20px frosted backdrop glassmorphism |
| **Client Security** | Web Crypto API | `Native W3C` | Computes SHA-256 directly on user CPU before network transit |
| **API Gateway** | FastAPI + Uvicorn | `0.115+` / Python 3.11 | High-throughput async ASGI API with Pydantic v2 streaming hashes |
| **Database** | PostgreSQL + pgvector | `16.x` / `0.7.x` | Relational custody logs + 512-dim CLIP cosine vector similarity index |
| **WORM Vault** | MinIO Object Storage | `S3 API` | SEC Rule 17a-4 COMPLIANCE Object Lock with 365-day immutability |
| **Blockchain** | MST Blockchain | EVM (54635 / 91562037 / 4646) | Smart contract evidence registry and immutable proof-of-existence |
| **Vision AI** | OpenCV & Pillow | `4.10+` / `10.4+` | Pixel differential analysis, direct red mask blending, contour boxes |
| **Perceptual Match** | ImageHash (DCT) | `4.3+` | 64-bit perceptual hashing (pHash) for derivative file triangulation |
| **Audio AI** | faster-whisper | `1.0+` (CTranslate2) | 4x faster local Whisper STT with word-level timestamp scrubbing |
| **Court Dossiers** | ReportLab Platypus | `4.2+` | Statutory Section 65B / BSA § 63 PDF certificate generator with QR codes |

---

## 🚀 Quick Start Guide

### Option 1: Full Docker Compose (Recommended)

Make sure you have [Docker Desktop](https://www.docker.com/) installed and running:

```bash
# 1. Clone the repository
git clone https://github.com/dPurvesh/LexV_Buildathon2.0.git
cd LexV_Buildathon2.0

# 2. Copy the example environment file
cp .env.example .env

# 3. Spin up the entire containerized stack
docker compose up --build
```

Once running:
* **Frontend Web Application**: [http://localhost:3000](http://localhost:3000)
* **FastAPI Interactive Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
* **MinIO Object Console**: [http://localhost:9001](http://localhost:9001) (`minio_admin` / `minio_secure_password`)
* **PostgreSQL Database**: `localhost:5432` (`evidence_db`)

---

### Option 2: Local Manual Setup

#### 1. Backend Setup
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## 🔑 Evaluator & Demo PIN Credentials

| Role | Authorized Clearance | Default Demo PIN |
| :--- | :--- | :--- |
| 🛡️ **Investigator** | Intake & Custody Handoffs | **`1001`** |
| 🔬 **Forensic Analyst** | ELA Heatmaps & Tamper Radar | **`2002`** |
| ⚖️ **Compliance Auditor** | Section 65B PDF Dossier & CSV Exports | **`3003`** |

---

## 📡 Core API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/evidence/upload` | Ingests file with WebCrypto verification, MinIO WORM lock & MST Chain anchor |
| `POST` | `/api/v1/evidence/batch-upload` | Concurrent multipart ingestion pipeline with pre-screening |
| `POST` | `/api/v1/evidence/shutter-capture` | On-spot optical shutter capture with live GPS geolocating & Google Maps linking |
| `POST` | `/api/v1/evidence/diff-documents` | PDF legal clause differential analysis identifying inserted/deleted text |
| `POST` | `/api/v1/evidence/verify` | Multi-modal forensic evaluation (SHA-256 + pHash + OpenCV red localization + ELA) |
| `GET` | `/api/v1/evidence/list` | Paginated evidence vault listing with case, geotag, and tamper filters |
| `GET` | `/api/v1/evidence/{id}/detail` | Full forensic dossier, EXIF metadata, custody history, and transcript metadata |
| `POST` | `/api/v1/evidence/{id}/transfer-custody` | Statutory custody handoff with on-chain MST smart contract settlement |
| `GET` | `/api/v1/evidence/{id}/certificate` | Downloads Section 65B / BSA § 63 court PDF dossier with dynamic QR code |
| `POST` | `/api/v1/evidence/search-semantic` | CLIP ViT vector similarity search powered by `pgvector` |
| `GET` | `/api/v1/blockchain/status` | Real-time MST Blockchain connectivity, Chain ID, block height, and MSTScan URL |
| `GET` | `/api/v1/evidence/export-csv` | Global cryptographic ledger audit export (restricted to Auditor PIN `3003`) |

---

## 👥 Team Gen-Z_PT

Developed with ❤️ for the **MST Blockchain Buildathon 2.0**:
* **Riddhi Balapure**
* **Prajwal Bahekar**
* **Purvesh Didpaye**
* **Dikshitha Sadarla**

---

## 📄 License & Compliance

This software is built for evidentiary non-repudiation and complies with:
* **Indian Evidence Act (IEA) § 65B**
* **Bharatiya Sakshya Adhiniyam (BSA 2023) § 63**
* **SEC Rule 17a-4 (COMPLIANCE WORM Storage)**
* **Information Technology Act 2000 § 79A**

