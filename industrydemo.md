# 🏛️ LEXVAULT: Industry Demonstration & Executive Walkthrough
### Enterprise Digital Forensics, Chain-of-Custody & Evidence Integrity System

---

## 📌 Executive Summary

Modern legal, government, and smart city institutions face a critical crisis of trust:
1. **Digital Evidence is Fragile**: Images, CCTV videos, audio recordings, and PDF documents can be easily spliced, altered, or deepfaked using off-the-shelf generative AI and editing software.
2. **Traditional Cloud Storage is Inadequate**: Standard cloud storage (Google Drive, standard AWS S3, local servers) allows administrators or compromised accounts to silently modify, overwrite, or delete records.
3. **Courtroom Dismissals**: Up to **70%** of electronic evidence in criminal and civil litigation faces admissibility challenges due to broken custody chains or failure to satisfy statutory requirements (such as **Section 65B of the Indian Evidence Act** and **Section 63 of the Bharatiya Sakshya Adhiniyam - BSA 2023**).

**LEXVAULT** solves this by unifying **Hardware-Level Write-Once Storage (WORM)**, **Public Blockchain Decentralized Anchoring**, **Multi-Modal AI Forensic Diagnostics**, and **Statutory Court Dossier Automation** into a single command center.

---

## 🎯 Project Objectives & Delivered Features Mapping

The following table explicitly maps the industry problem statement objectives to the concrete features built into LEXVAULT:

| # | Industry Objective | LEXVAULT Feature | What It Does & Business Value |
|---|:---|:---|:---|
| **0** | **On-Scene Field Seizure** | **Live Forensic Shutter & Google Maps Geotagging** | Field officers can capture photo evidence directly on crime scenes using hardware sensors. GPS latitude/longitude/elevation and camera telemetry are locked in an EXIF card with direct **Google Maps Satellite & Pinpoint** navigation, calculating SHA-256 before the file ever leaves optical RAM. |
| **1** | **Evidence Repository** | **WORM Compliance Vault & Ingestion Pipeline** | Files are stored under **SEC Rule 17a-4 COMPLIANCE Object Lock**. Once uploaded, no one—not even root cloud administrators—can delete or modify evidence for 365 days. Dual-layer client pre-hashing ensures files cannot be intercepted or modified in transit. |
| **2** | **AI-Assisted Indexing** | **Multimodal Semantic Search (`pgvector`) & Whisper AI Audio Transcription** | Investigators can find evidence using natural language concepts (e.g., *"red vehicle collision"* or *"knife near cash register"*). Audio and bodycam recordings are automatically transcribed into searchable, timestamped text words. |
| **3** | **Blockchain Timestamping** | **MST Blockchain Smart Contract Settlement** | Each evidence item's unique SHA-256 fingerprint is registered on the public MST Blockchain (Coral Testnet / Mainnet). This provides an immutable, decentralized proof of existence on MSTScan that cannot be backdated or falsified by any agency. |
| **4** | **Chain of Custody Tracking** | **Cryptographic Custody Timeline & Transfer Ledger** | Every physical or statutory evidence handoff (e.g., from Investigator to Forensic Lab or Court) is cryptographically recorded with transfer notes and blockchain transaction hashes, creating a tamper-evident audit trail. |
| **5** | **Audit Dashboard** | **Real-Time Forensic Command Center & Node Telemetry** | A unified dashboard displaying real-time MST block syncing, storage volume metrics, tamper alert counters, and system health status. Stakeholders get complete visibility into institutional evidentiary readiness. |
| **6** | **Secure Evidence Sharing** | **Statutory Court Dossier (PDF + QR) & Public Verification Dropzone** | One-click export of Section 65B / BSA § 63 certified court dossiers with embedded QR codes. Anyone (defense counsel, magistrates, auditors) can drag-and-drop a file into the verification portal to prove authenticity in seconds. |

---

## 🚀 Live Demo Walkthrough (Step-by-Step for Presenters)

Follow these 6 steps to deliver a compelling, non-technical demonstration that highlights all features to industry executives, legal counsels, and government decision-makers.

```
DEMO FLOW AT A GLANCE:
[Step 1: Dashboard] ➔ [Step 2: AI Search] ➔ [Step 3: Live Ingestion & MST Blockchain] ➔ [Step 4: Repository]
       │
[Step 5: Tamper Radar] ➔ [Step 6: Custody Handoff] ➔ [Step 7: Courtroom Dossier]
```

---

### Step 1: The Command Center & Live Infrastructure
> **Objective Addressed**: *Audit Dashboard (5)*

1. Open your browser and navigate to the live command center: **`http://localhost:3000`**.
2. **Point to the Top Telemetry Strip**:
   - **`🟢 MST TESTNET LIVE`** / **`MST MAINNET LIVE`**: Connected live to the MST Blockchain network.
   - **`WORM LOCK: 365D COMPLIANCE`**: Proves that hardware-level write protection is active.
   - **`CONTRACT`**: Displays the active smart contract address on MST.
3. **Showcase the Real-Time Metric Cards**:
   - Total Evidence Items preserved in the vault.
   - Active Law Enforcement Cases tracked.
   - Total WORM Storage utilized.
   - Real-time Tamper Alerts detected.
   - Vector-Indexed items ready for AI search.
   - Total Custody Handoffs executed.

> **🗣️ Presenter Talking Point**:  
> *"Before a single file is examined, our command center verifies continuous synchronization with public blockchain ledgers and immutable storage locks. This eliminates the 'insider threat'—guaranteeing that records cannot be altered from within police or IT departments."*

---

### Step 2: Intelligent Discovery via AI-Assisted Indexing
> **Objective Addressed**: *AI-Assisted Indexing (2)*

1. On the default **`[01] Repository & AI Search`** tab, locate the search bar:
   `"Search indexed vault: 'traffic', 'robbery', 'cctv', 'nagpur', 'audio wiretap', 'CASE-2026-PDF1'…"`
2. **Execute a Semantic Search via 1-Click Topic Chips**:
   - Directly click any of the quick suggestion chips below the search bar:
     - **`[traffic accident]`** — Retrieves multi-angle collision CCTV and accident forensics.
     - **`[armed robbery]`** — Retrieves suspect surveillance stills.
     - **`[audio wiretap]`** — Demonstrates Whisper AI speech-to-text audio indexing.
     - **`[crime scene clean up]`** — Demonstrates crime scene photography.
     - **`[CASE-2026-PDF1]`** — Instant statutory case file retrieval.
   - Or type any conceptual query and click **`Semantic Search`** (or press `Enter`).
3. **Highlight the AI Capabilities**:
   - Notice how results return based on **conceptual meaning** via OpenAI CLIP ViT-B/32 neural embeddings, not just strict filename matches.
   - Point out that audio and video files contain **Whisper AI speech-to-text transcripts**, making spoken words in 911 calls or police bodycams instantly searchable and timestamped.

> 💡 **Presenter Tip (Semantic Search Dataset Expectation)**:  
> *Vector similarity search computes mathematical cosine distance against embeddings of existing preserved items in this vault. Searching for concepts not present in the 14 test records (e.g., "satellite") returns 0 results. If an evaluator suggests a term with no matches, explain that the vector model accurately rejects non-existent concepts, then click any indexed topic chip to demonstrate positive retrieval.*

> **🗣️ Presenter Talking Point**:  
> *"In a major investigation, officers often have thousands of hours of audio and gigabytes of media. Instead of manual review, our AI vector engine indexes visual concepts and transcribed audio, allowing an investigator to find crucial evidence in seconds."*

---

### Step 3: Live Evidence Ingestion & Decentralized MST Blockchain Anchoring
> **Objective Addressed**: *Evidence Ingestion (1) & Immutable Blockchain Anchoring (3)*

1. Click the **`[03] Ingestion & WORM Lock`** tab in the top navigation.
2. Enter a case number (e.g. `CASE-2026-DEMO`) and select an authentic evidence file or drag it into the dropzone.
3. Observe the immediate multi-stage pipeline:
   - **Local WebCrypto Digest**: Calculates the SHA-256 fingerprint on the client machine before transmission.
   - **Forensic Pre-Check**: Checks for duplicate hashes and scans perceptual hashes against existing vault records to catch derivative tampering before ingestion.
4. Click **`Ingest & Seal Evidence File`**:
   - The file streams directly into MinIO S3 storage under strict WORM retention.
   - Once file upload completes, point out the live amber badge: **`⛏️ Mining on MST Chain (~15s)`** and the dedicated **MST Blockchain Consensus** banner:
     > *"⛓️ MST Blockchain Decentralized Consensus in Progress (~12–25s): Smart contract transaction broadcast to MST Blockchain. Awaiting block consensus and decentralized validator receipt confirmation."*
5. Once mined, the status transforms into **`Anchored & Sealed`**, displaying the live MST Blockchain transaction hash.

> 💡 **Presenter Tip (MST Blockchain Mining Confirmation)**:  
> *When a file is ingested, the backend submits a real smart contract transaction on the MST Blockchain network and awaits validator block receipt confirmation (`_wait_for_receipt`). Depending on decentralized block times, this takes 12 to 25 seconds. Explain to evaluators that this delay is the ultimate proof of authentic on-chain block mining, rather than a synthetic or mock database write.*

> **🗣️ Presenter Talking Point**:  
> *"Unlike enterprise software that writes to a local MySQL database in 10 milliseconds, LEXVAULT secures evidentiary value by anchoring cryptographic state to public MST validators. The 15-second block confirmation proves real decentralized consensus."*

---

### Step 4: Evidence Repository & Forensic Inspection
> **Objective Addressed**: *Evidence Repository (1) & Secure Evidence Sharing (6)*

1. Scroll down to the **All Preserved Evidence** table (or return to Tab `[01]`).
2. Point out the clear distinction between authentic files (**`🟢 Clean`**) and flagged files (**`🚨 Tampered`**).
3. **Filter Navigation & Instant Clear**:
   - Filter by case ID or click a card in Tab [02] Case Portfolio.
   - Point out the **`✕ Clear Filter`** button that appears immediately beside the filter bar, restoring all records with one click.
4. Click the **`👁️ Inspect`** button on any evidence row (e.g., `Screenshot Test Ingestion` or `CCTV Still`):
   - A slide-over **Evidence Inspector Drawer** opens on the right.
   - **Dual Hash Verification**: Displays the exact 64-bit SHA-256 cryptographic hash calculated on the investigator's device before transit, matched with the server digest.
   - **MinIO Storage Object Key**: Displays the path in the WORM compliance vault.
   - **MST Blockchain Transaction Hash**: Clickable link opening MSTScan to view the real-time block confirmation.
   - **Dual-Mode ELA Inspector**: Click **`ELA Heatmap`** to demonstrate the toggle between **`🔴 Red Anomaly Mask`** (direct pixel overlay with perimeter boxes) and **`🌡️ Thermal Spectrum`** (JET color gradient), computed dynamically from MinIO.

> **🗣️ Presenter Talking Point**:  
> *"Every single piece of evidence has a mathematically provable pedigree. We don't just store files; we anchor their mathematical signature onto public decentralized ledgers, lock them in write-once compliance storage, and provide dual-mode visual forensic inspection on demand."*

---

### Step 5: Multi-Modal Tamper Radar & Visual Forensics
> **The Core Technological Breakthrough**

Click the **`[04] Verification Dropzone`** tab in the navigation bar.

1. **Test Scenario A: Verifying an Authentic File**:
   - Drag and drop an original authentic file from your evidence folder into the radar dropzone.
   - **Result**: The radar turns emerald green with **`AUTHENTIC VAULT RECORD`**.
   - It displays 100% cryptographic parity, the date it was anchored, and the on-chain ledger proof.

2. **Test Scenario B: Catching a Tampered / Altered File**:
   - Drag and drop a modified or edited version of the same image (even with 1 pixel changed or subtle text edited).
   - **Result**: The radar flashes crimson with **`🚨 UNAUTHORIZED ALTERATION DETECTED`**.

3. **Demonstrate the Forensic Analysis Tools**:
   - **🔴 Direct Red Tamper Localization (Breakthrough Feature)**:
     - Automatically open by default upon tamper detection.
     - Highlights exact modified or spliced pixels in bright semi-transparent red (`rgba(239, 68, 68, 0.55)`).
     - Draws crisp OpenCV bounding boxes around altered regions with **`ALTERED`** perimeter tags.
     - Tactical Alert Banner displays: `1 Region Isolated` (or region count), `ALTERED AREA: 4.17%` of pixels altered, and coordinates chips `#[1]: [164×244 at (239, 359)]`.
   - **↔️ 3-Way Interactive Split-Screen Slider**:
     - Toggle between:
       1. **`🔴 Original vs Red Tamper Highlight`**: Swipe across clean vault evidence to reveal highlighted red alterations.
       2. **`Original Vault vs Uploaded`**: Direct visual comparison.
       3. **`Uploaded vs ELA Heatmap`**: Comparison against compression error boundaries.
   - **Perceptual Hash (pHash) Triangulation**: Demonstrates that while the binary SHA-256 hash changed completely, 64-bit DCT perceptual hash distance proves it was derived from an authentic vault parent file!
   - **Thermal Visual Diff & ELA Heatmaps**: JET spectral peaks isolating pixel offsets.
   - **Automated PDF Text Diffing**: If testing an altered document, point out the green (`+`) and red (`-`) line-by-line text modifications caught automatically.

> **🗣️ Presenter Talking Point**:  
> *"Conventional systems have a fatal flaw: if a suspect changes just one pixel in a 50 MB image, standard hashing simply fails and says 'File Not Found'. LEXVAULT's multi-modal AI triangulates the derivative, pinpointing the exact modified pixels in red, framing them with computer-vision bounding boxes, and calculating the exact percentage of evidence altered."*

---

### Step 6: Statutory Chain of Custody Tracking
> **Objective Addressed**: *Chain of Custody Tracking (4)*

1. In the repository table, click the **`🔗 Custody`** button next to any item, or view the **Custody Timeline** section at the bottom.
2. **Observe the Custody Graph**:
   - Displays a vertical node graph tracing the item from its **Initial Intake & Cryptographic Seal** through every subsequent transfer.
   - Displays the transferring custodian, receiving custodian, statutory transfer notes, and timestamp.
3. **Execute a Custody Transfer**:
   - Click **`⚡ Transfer Custody`**.
   - Select an action: `Forensic Lab Analysis`, `Court Submission`, or `Inter-Agency Handover`.
   - Enter the recipient's institutional ID or wallet address.
   - Add required case notes and click **Transfer Custody**.
   - The timeline immediately appends a new verified node with on-chain settlement.

> **🗣️ Presenter Talking Point**:  
> *"Chain of custody is often the weakest link in criminal prosecutions. By enforcing cryptographic accountability on every handoff, we remove the possibility of custodial tampering or evidence substitution."*

---

### Step 7: Automated Courtroom Dossier & QR Verification
> **Objective Addressed**: *Secure Evidence Sharing (6) & Legal Admissibility*

1. Open the inspector drawer for any evidence record.
2. Click the **`📄 Export Section 65B Dossier`** button.
3. A formal legal PDF certificate is generated instantly:
   - Contains statutory operating statements satisfying **Section 65B of the Indian Evidence Act** and **Section 63 of Bharatiya Sakshya Adhiniyam (BSA 2023)**.
   - Details the hashing algorithms, device operational integrity, and custodial logs.
   - **Dynamic QR Code**: Scan the QR code with any smartphone camera—it instantly routes to the public on-chain ledger proof, allowing a judge or magistrate in a courtroom to verify electronic evidence without needing specialized software.

> **🗣️ Presenter Talking Point**:  
> *"Forensic systems usually end at IT. LEXVAULT bridges the gap into the courtroom. In seconds, it produces a legally admissible Section 65B certificate with an on-chain QR code that any magistrate can verify directly from the bench."*

---

## 👥 Institutional Role-Based Access Control (RBAC)

LEXVAULT enforces strict institutional separation of duties via built-in role switching. You can demonstrate this during your presentation using the role selector in the top-right header:

| Role Persona | Authorization PIN | Permitted Jurisdictions | Security Enforcement |
|:---|:---:|:---|:---|
| **🛡️ Investigator** | `1001` | Evidence Ingestion, Batch Uploads, Custody Handoffs | Prevents unauthorized forensic tampering; focused on intake integrity. |
| **🔬 Forensic Analyst** | `2002` | Deep ELA Tamper Radar, Audio Whisper Transcripts | Unlocks advanced analytical tools; locks raw file ingestion. |
| **⚖️ Court Auditor** | `3003` | Section 65B Dossier Generation, Global CSV Audits | Read-only courtroom compliance; export certified evidence reports. |

---

## 💼 Industry Value Proposition

| Stakeholder Group | Pain Point Addressed | Direct Business & Operational Benefit |
|:---|:---|:---|
| **Law Enforcement & Police Departments** | Evidence tampering claims, lost chain of custody, procedural acquittals. | Eliminates custodial liability, ensures zero-tamper intake, streamlines case transfers. |
| **Judiciary & Court Registries** | Skepticism of digital submissions, days spent verifying electronic authenticity. | Instant Section 65B certificates, one-second QR on-chain verification directly on the bench. |
| **Smart Cities & Municipal Surveillance** | Millions of hours of CCTV and sensor data vulnerable to unauthorized deletion or hacking. | Scalable, tamper-proof WORM storage with natural language visual AI search across city feeds. |
| **Corporate Forensics & Cyber Teams** | Insider threats modifying server logs, internal audit tampering. | SEC Rule 17a-4 compliance storage prevents even super-administrators from altering logs. |

---

## 🛡️ Demonstrating WORM Object Lock Refusal in MinIO Console

To prove hardware-level compliance storage to technical evaluators:

1. Open the **MinIO Web Console** at `http://localhost:9001`.
2. Log in using your root credentials (`minioadmin` / `minioadmin`).
3. Click **Buckets** in the left sidebar and select the **`evidence-vault`** bucket.
4. Browse to any preserved file in the vault and select its checkbox.
5. Click the red **`Delete`** button at the top right of the object table.
6. ⚠️ **CRITICAL EVALUATION STEP**:
   - In the confirmation dialog, you will see: **`Delete All Versions: [No / Yes]`**.
   - If left at the default **`No`**, S3 versioning will merely place a temporary `DeleteMarker` (which hides the file from the default view until "Show deleted objects" is checked).
   - **Switch `Delete All Versions` to `YES`** and confirm deletion.
7. **The WORM Refusal Result**:
   - MinIO attempts to delete the underlying locked version and is **instantly rejected** with a hard compliance banner:
     ```
     Access Denied: Object is WORM protected under ObjectLockConfiguration (Compliance Mode).
     Retention period active. Deletion refused.
     ```
   - This proves that even super-administrators with root MinIO credentials **cannot delete or alter evidence**.

---

## 🛠️ Quick Reference for Presenters

- **Web Application URL**: `http://localhost:3000`
- **Backend API Documentation**: `http://localhost:8000/docs`
- **MinIO Object Vault Console**: `http://localhost:9001`
- **Blockchain Network**: MST Blockchain (Coral Testnet `54635` / Testnet `91562037` / Mainnet `4646`)
- **Default Investigator PIN**: `1001`
- **Default Forensic Analyst PIN**: `2002`
- **Default Court Auditor PIN**: `3003`

---

## 🌐 Live Cloud Deployment (Mobile & Desktop Verified)
* **Frontend Web App**: `https://lexv-buildathon2-0-frontend.onrender.com`
* **Backend REST API**: `https://lexvault-backend.onrender.com`
* **MST Mainnet Smart Contract**: `0x62ae3A34D97895EC7f353F0F8AC44ac4B2260c7e` ([MSTScan Explorer](https://mstscan.com/address/0x62ae3A34D97895EC7f353F0F8AC44ac4B2260c7e))
* **Cloud Database**: Render PostgreSQL 16 (`evidence_db_htz2` with 31 pre-loaded evidence records)
