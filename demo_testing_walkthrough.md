# LEXVAULT: Complete Demo & Manual Testing Walkthrough
**Step-by-Step Test Plan for Verification, Jury Demonstration & Academic Evaluation**

This guide provides an exact, line-by-line manual testing procedure to verify every single feature of the LEXVAULT system. Follow these tests sequentially to prove full operational readiness and learn how to present each feature to your evaluators.

---

## Pre-Requisite: Environment Verification

Before beginning manual testing, ensure the local services are accessible:
1. Open your web browser and navigate to: **`http://localhost:3001`**
2. Ensure the backend container is running on: **`http://localhost:8000/health`** (returns `{"status": "ok"}`)
3. Ensure MinIO Object Vault console is up on: **`http://localhost:9001`**

---

## Test 1: Real-Time Blockchain Telemetry & Compliance Header

### What to Test:
Verify that the system is actively synchronized with the public Ethereum Sepolia network and the MinIO WORM vault.

### Step-by-Step Actions:
1. Look at the very top horizontal strip on the screen (the **Telemetry Bar**).
2. Observe the status indicator pill on the left.
3. Observe the `CHAIN`, `BLOCK`, `WORM / COMPLIANCE`, and `CONTRACT` badges.

### Expected Visual Result:
- Indicator pill displays a glowing green dot: **`🟢 SEPOLIA LIVE`** (previously showed red offline before CORS fix).
- `CHAIN`: **`11155111`** (the official Ethereum Sepolia testnet Chain ID).
- `BLOCK`: Displays an active block number greater than **`11745900`** that updates every 15 seconds.
- `WORM / COMPLIANCE`: Highlighted in glowing violet badge indicating active SEC Rule 17a-4 compliance.
- `CONTRACT`: Displays **`CONFIGURED`**.

### Under the Hood / API:
- Endpoint: `GET http://localhost:8000/api/v1/blockchain/status`
- Response: `{"connected": true, "chain_id": 11155111, "latest_block": 11745980, "relayer_balance_eth": 0.048}`
- Periodic polling: `window.setInterval` executes every 15,000ms.

### Tech Stack & Why It's Used:
- **Web3.py & Infura/Alchemy RPC**: Connects Python directly to the Ethereum Virtual Machine (EVM) to query decentralized state without requiring a heavy local geth node.
- **Why**: Proves to the jury that the application is not merely saving data locally; it is tethered to a global immutable public blockchain ledger.

### Jury Talking Script:
> *"Respected jury members, notice the telemetry strip at the top. LEXVAULT is directly connected to Ethereum Sepolia (Chain ID 11155111). Every block number displayed is live on the public blockchain. Additionally, the WORM badge indicates that our underlying storage prevents anyone—even a root system administrator—from deleting or tampering with ingested evidence."*

---

## Test 2: Role-Based Access Control (RBAC) & Persona Switching

### What to Test:
Verify that all features are visible across all roles, but actions outside a persona's authorized jurisdiction are visually locked and prompt for an authorization PIN.

### Default Persona Credentials:
- **🛡️ Investigator**: PIN **`1001`** (Ingest evidence, transfer custody, organize cases)
- **🔬 Forensic Analyst**: PIN **`2002`** (Deep ELA tamper heatmaps, Whisper audio transcripts)
- **⚖️ Court Auditor**: PIN **`3003`** (Section 65B Court Dossier PDF, Global Ledger CSV export)

### Step-by-Step Actions:

#### A. Verify Initial Persona (Investigator `1001`):
1. In the topbar header on the right, look at the role pill: **`[ 🛡️ Investigator • 1001 ▾ ]`**.
2. Click the **Upload** tab: It opens normally with full batch file ingestion capabilities.
3. Click the **Evidence Vault** tab, and click any row (e.g. `CCTV Bodycam Footage`) to open the inspector drawer.
4. Observe the action buttons at the bottom of the drawer:
   - `⚡ Transfer Custody` is active.
   - `🔒 ELA Heatmap` is marked with a padlock icon (Restricted to Forensic Analyst).
   - `🔒 Court Dossier (PDF)` is marked with a padlock icon (Restricted to Auditor).
5. Click the locked **`🔒 ELA Heatmap`** button:
   - A frosted glass dialog pops up: **"Access Restricted — Error Level Analysis Heatmap requires clearance reserved for Forensic Analyst."**
   - Shows your active role: `🛡️ Investigator` ➔ Required: `🔬 Forensic Analyst`.

#### B. Switch to Forensic Analyst (`2002`):
1. In the open dialog, type **`2002`** on your keyboard (or click the quick demo pill **`[ 🔬 Analyst 2002 ]`**).
2. Click **Unlock** (or press Enter):
   - The modal closes and the ELA Tamper Heatmap opens immediately!
   - Look at the topbar: The badge has transformed to **`[ 🔬 Forensic Analyst • 2002 ▾ ]`** in glowing purple.
3. Now, click on the **Upload** tab in the main navigation:
   - The tab shows a lock badge: **`Upload 🔒`**.
   - The content displays the **"Evidence Ingestion Locked"** security notice explaining that raw ingestion is restricted to Law Enforcement Investigators.
   - In the inspector drawer, `🔒 Transfer Custody` is now locked.

#### C. Switch to Court Auditor (`3003`):
1. Click the topbar role pill **`[ 🔬 Forensic Analyst • 2002 ▾ ]`**.
2. Type **`3003`** on your keyboard (or click **`[ ⚖️ Auditor 3003 ]`**).
3. The topbar updates to **`[ ⚖️ Court Auditor • 3003 ▾ ]`** in emerald green.
4. In the Evidence Vault table:
   - **`📥 Export CSV Ledger`** is now unlocked and active!
   - In the inspector drawer: **`📜 Court Dossier (PDF)`** is now unlocked and active!
   - Ingestion and Custody handovers remain locked (read-only audit compliance).

### Expected Visual Result:
- Interactive frosted glass modal with auto-focused PIN input and smooth animations.
- Dynamic color changes in the topbar pill: Indigo (`1001`) ➔ Purple (`2002`) ➔ Emerald (`3003`).
- Instant state persistence without page reloads.

### Tech Stack & Why It's Used:
- **React Context API & localStorage**: Zero-latency role evaluation across all components without network roundtrip lag.
- **Why**: Proves to the jury that the application enforces institutional security and separation of evidentiary duties, fulfilling Section 65B statutory chain-of-custody mandates.

### Jury Talking Script:
> *"A frequent criticism of student projects is that 'anyone can click any button and alter records.' In LEXVAULT, we implemented strict Role-Based Access Control with 3 distinct professional personas. An investigator cannot fake an ELA analysis; an analyst cannot tamper with legal custody handovers; and only a certified legal auditor can issue an official Section 65B court certificate. Notice that examiners can type the PIN directly on the keyboard or use the demo shortcuts to test each persona live."*

---

## Test 3: Dashboard KPI Metrics

### What to Test:
Verify live aggregation of evidence assets, active case folders, storage consumption, and tamper alerts.

### Step-by-Step Actions:
1. Observe the 3 glassmorphic KPI cards situated below the hero banner.
2. Verify the 3 cards:
   - **Active Cases** (Card 1 with folder icon)
   - **Storage Used** (Card 2 with disk icon)
   - **Tamper Alerts** (Card 3 with shield icon)

### Expected Visual Result:
- **Active Cases**: Displays **`3`**
- **Storage Used**: Displays formatted byte size (e.g. **`3.1 MB`**)
- **Tamper Alerts**: Displays **`0`** (or active alerts in green/rose indicator)
- Smooth hover effect: Hovering your mouse over any card elevates the card with a violet frosted border glow.

### Under the Hood / API:
- Endpoint: `GET http://localhost:8000/api/v1/stats/dashboard`
- SQL Query: Fast aggregate query executing `COUNT(*)`, `COUNT(DISTINCT case_number)`, and `SUM(file_size_bytes)` over PostgreSQL.

### Tech Stack & Why It's Used:
- **PostgreSQL 16 & Custom Glassmorphic CSS**: Real-time aggregation over indexed columns rendered with zero external UI library bloat.
- **Why**: Demonstrates operational situational awareness for chief forensic officers and courtroom registrars.

---

## Test 4: Evidence Repository, Case Filtering & Global Ledger CSV

### What to Test:
Verify data retrieval, pagination, filtering by case identifier, and export of cryptographic audit trails.

### Step-by-Step Actions:
1. Click on the **Evidence Vault** tab (first tab, default).
2. Observe the evidence table listing loaded records (e.g. `CASE-2026-CR-8092`, `PIPELINE-2026`, `TEST-002`).
3. In the search box above the table, type: `CASE-2026-CR-8092`.
4. Observe the table instantly filter to show only CCTV footage matching that case.
5. Clear the search box to restore all records.
6. Click the button labeled **`Export Global Ledger (CSV)`** in the table header.

### Expected Visual Result:
- Table renders sleek rows with frosted glass borders.
- Columns display: `Evidence Title`, `Case Number`, `SHA-256 Checksum` (monospace font), `Tamper Status` (pill badge), `Ethereum TX` (pill badge), and `Registered Date`.
- Clicking the export button immediately initiates a browser download of:
  `evidence_ledger_<timestamp>.csv`
- Open the CSV: It contains full cryptographic hashes, MinIO object keys, block numbers, and custodian addresses for all evidence.

### Under the Hood / API:
- Filter API: `GET /api/v1/evidence/list?search=CASE-2026-CR-8092&limit=20`
- CSV Export API: `GET /api/v1/evidence/export-csv` (FastAPI `StreamingResponse` using Python's native `csv` writer).

### Tech Stack & Why It's Used:
- **Psycopg 3 & StreamingResponse**: Streams large relational datasets directly from Postgres to the browser stream without memory bottleneck.
- **Why**: Court auditors require raw, machine-readable cryptographic registers that can be independently audited in spreadsheet or data-lake software.

---

## Test 5: Forensic Inspector Drawer & Blockchain Proof

### What to Test:
Verify that clicking any evidence item slides open a comprehensive forensic inspection drawer with deep metadata and blockchain explorer links.

### Step-by-Step Actions:
1. In the Evidence Vault table, click on the row for:
   **`CCTV Bodycam Footage - Traffic Junction`** (`CASE-2026-CR-8092`).
2. Watch the right-hand side of your screen.
3. Observe the forensic drawer slide out smoothly.
4. Scroll through the drawer sections:
   - File details (MIME type, file size, SHA-256)
   - Blockchain proof (Ethereum transaction hash, block number)
   - Perceptual Hash (pHash)
   - Action buttons (Court Dossier, Transfer Custody, ELA Heatmap, Download)

### Expected Visual Result:
- Drawer slides in with a frosted glass backdrop (`backdrop-filter: blur(24px)`).
- Complete SHA-256 digest is formatted cleanly in Fira Code font with a copy button.
- Ethereum transaction hash displays a link icon pointing to Sepolia Etherscan (`https://sepolia.etherscan.io/tx/0x02fb8db...`).
- Close button (`✕`) at the top right dismisses the drawer smoothly.

### Under the Hood / API:
- Endpoint: `GET /api/v1/evidence/{evidence_id}/detail`
- Joins the primary `evidence` table with the latest custodian record.

### Tech Stack & Why It's Used:
- **CSS Transitions & React Conditional Rendering**: High-performance drawer layout that keeps user context on the repository table while inspecting deep forensic technicalities.

---

## Test 6: Section 65B Indian Evidence Act Court Dossier (PDF)

### What to Test:
Verify automated creation of a legally admissible Chain of Custody certificate conforming to Section 65B of the Indian Evidence Act / BSA 2023.

### Step-by-Step Actions:
1. Open the inspector drawer for `CCTV Bodycam Footage` (from Test 4).
2. In the drawer action bar, click the button:
   **`Court Dossier (PDF)`** (or `Section 65B Certificate`).
3. A new browser tab will open, or a PDF download will prompt.
4. Open the downloaded PDF document.

### Expected Visual Result:
- A formally structured legal dossier titled:
  **"CERTIFICATE UNDER SECTION 65B OF THE INDIAN EVIDENCE ACT, 1872 / BSA 2023"**
- Contains:
  - Official Certificate Reference Number & Generation Timestamp
  - Evidentiary Device & Hash Verification (SHA-256 Hex Digest)
  - Ethereum Blockchain Verification Table (Contract address, Block #, Transaction Hash)
  - Chronological Chain of Custody Table (Every transfer recorded with date and custodians)
  - Dynamic **Embedded QR Code**: Scanning with a phone camera resolves directly to the verification endpoint.
  - Formal legal declaration statement and signature block for the Forensic Custodian.

### Under the Hood / API:
- Endpoint: `GET /api/v1/evidence/{evidence_id}/certificate`
- Engine: Python `ReportLab` (`SimpleDocTemplate`, `Table`, `ParagraphStyle`) + `qrcode` library.
- Dynamically queries Postgres for evidence details and custody history, generates the QR code in-memory via `BytesIO`, and streams the PDF.

### Tech Stack & Why It's Used:
- **ReportLab Platypus Engine**: Vector-accurate PDF generation in memory without requiring headless Chrome or Puppeteer dependencies.
- **Why**: In Indian courts (and common-law jurisdictions), digital evidence without a certified Section 65B affidavit is inadmissible as hearsay. This feature bridges technical blockchain security with statutory legal procedure.

### Jury Talking Script:
> *"Judges and examiners often ask: 'How does blockchain translate to actual courtroom admissibility?' We solve that here. Clicking 'Court Dossier' dynamically synthesizes a Section 65B certificate with an unbroken custody log and a dynamic QR code. A magistrate can scan this paper printout to instantly verify that the digital hash on paper matches the blockchain block mined years ago."*

---

## Test 7: Interactive Chain of Custody Transfer

### What to Test:
Verify an unbroken chain of custody transfer from one officer/custodian to another, with smart contract state transition logging.

### Step-by-Step Actions:
1. Inside the Forensic Inspector drawer, click the button:
   **`Transfer Custody`**.
2. A frosted glass modal appears titled: **"Log Chain of Custody Transfer"**.
3. Fill out the transfer fields:
   - **Receiving Custodian ID**: Type `Inspector R. Sharma (CBI Cyber Cell)`
   - **Action Type**: Select or type `EVIDENTIARY_HANDOVER`
   - **Transfer Notes**: Type `Transferred for advanced forensic waveform isolation`
4. Click **`Confirm & Sign Transfer`**.
5. Wait ~1-2 seconds for confirmation.

### Expected Visual Result:
- The modal closes.
- In the drawer's **Chain of Custody Timeline**, a new timeline node instantly appears:
  - From: `mock-custodian`
  - To: `Inspector R. Sharma (CBI Cyber Cell)`
  - Action: `EVIDENTIARY_HANDOVER`
  - Timestamp: `Just now`
  - Notes: Displaying your entered justification.

### Under the Hood / API:
- Endpoint: `POST /api/v1/evidence/{evidence_id}/custody`
- Payload: `{"to_custodian": "...", "action_type": "...", "notes": "..."}`
- Executes atomic transaction:
  1. Inserts audit row into `custody_history` table in Postgres.
  2. Updates `current_custodian_address` in `evidence` table.
  3. Interacts with Web3 to register the custody event on Ethereum Sepolia.

### Tech Stack & Why It's Used:
- **PostgreSQL ACID Transactions & Web3.py**: Guarantees zero orphaned custody handoffs. If the database update fails, the entire transaction rolls back.

---

## Test 8: Error Level Analysis (ELA) Image Tampering Heatmap

### What to Test:
Verify forensic visual artifact detection using compression difference analysis to expose edited or photoshopped images.

### Step-by-Step Actions:
1. In the Evidence Vault table, select an image evidence item (e.g. `Synthetic authentic image` or `CCTV Bodycam Footage`).
2. In the inspector drawer, click the button: **`ELA Tamper Heatmap`**.
3. Observe the forensic analysis modal that opens.

### Expected Visual Result:
- Side-by-side comparison modal:
  - **Left**: Original evidence image.
  - **Right**: Colorized ELA Heatmap (JET colormap showing compression error differentials).
- **Tamper Score Badge**: Quantitative score between `0.0` (unaltered) and `1.0` (heavily manipulated).
- High uniform error indicates authentic single compression; bright localized hot spots reveal spliced or manipulated regions.
- Perceptual Hash (pHash) fingerprint displayed in hexadecimal.

### Under the Hood / API:
- Endpoint: `GET /api/v1/forensics/{evidence_id}/ela-heatmap`
- Python Backend:
  1. Fetches raw image bytes from MinIO WORM vault.
  2. Re-saves the image to a memory buffer at a fixed JPEG quality (95%).
  3. Calculates absolute pixel differential using `Pillow.ImageChops.difference`.
  4. Multiplies error delta to amplify subtle compression variations.
  5. Maps delta to an OpenCV JET/Inferno false-color heatmap and encodes to Base64 PNG.

### Tech Stack & Why It's Used:
- **Pillow & OpenCV (cv2)**: Industry standard forensic methodology used by forensic laboratories to detect localized digital manipulation without requiring external cloud APIs.

---

## Test 9: Audio Transcript Player & Synchronized Word Scrubbing

### What to Test:
Verify AI-driven speech-to-text audio forensics with word-level time scrubbing.

### Step-by-Step Actions:
1. In the Evidence Vault table or Inspector drawer, locate an audio/video evidence record (if present, or click `Audio Transcript`).
2. Observe the interactive transcript viewer.
3. Click on individual word pills in the transcript.

### Expected Visual Result:
- Audio waveform/HTML5 audio player loads with secure streaming link.
- Full transcript text is rendered as clickable tokens with timestamp ranges (e.g. `[00:04 - 00:06]`).
- Clicking any word immediately jumps the audio playback to that exact second.

### Under the Hood / API:
- Endpoint: `GET /api/v1/forensics/{evidence_id}/transcript`
- Backend Worker: Executed via `faster-whisper` (CTranslate2) during initial ingestion.

### Tech Stack & Why It's Used:
- **faster-whisper**: 4x faster transcription than standard OpenAI Whisper with 50% less RAM usage, running locally inside the Docker container.

---

## Test 10: Case Portfolio Folder Organization

### What to Test:
Verify aggregated portfolio view that groups evidence items by legal case dossiers.

### Step-by-Step Actions:
1. In the main navigation bar, click the second tab: **`Case Portfolio`**.
2. Observe the grid of case dossier cards displayed:
   - `CASE-2026-CR-8092`
   - `PIPELINE-2026`
   - `TEST-002`
3. Inspect each card's metrics:
   - Total evidence count
   - Aggregated file size
   - Latest upload date
   - Tamper flag status
4. Click the button on any case card: **`Filter Repository by this Case`**.

### Expected Visual Result:
- Clicking the filter button automatically switches your view back to the **Evidence Vault** tab.
- The search filter is pre-filled with that case ID, showing only its associated evidence.

### Under the Hood / API:
- Endpoint: `GET /api/v1/stats/cases`
- SQL: `SELECT case_number, COUNT(id) as evidence_count, MAX(created_at), SUM(file_size_bytes) FROM evidence GROUP BY case_number`

### Tech Stack & Why It's Used:
- **PostgreSQL Group By Aggregation & React State Routing**: Enables senior counsel to navigate evidence by trial portfolio rather than isolated individual files.

---

## Test 11: Batch Ingestion, Client Hashing & Deduplication

### What to Test:
Verify multi-file bulk evidence ingestion with pre-upload cryptographic client hashing and duplicate detection.

### Step-by-Step Actions:
1. Click the third tab in the navigation: **`Batch Ingestion`**.
2. Notice the large drag-and-drop ingestion zone.
3. Form Inputs:
   - **Case Number**: Enter `CASE-DEMO-2026`
   - **Default Custodian**: Enter `Investigator Miller #4401`
4. Select 1 or 2 small sample files from your computer (images or text files).
5. Notice the **Pre-Upload Verification status**: The browser immediately calculates each file's SHA-256 hash *before* uploading.
6. Click **`Ingest All Evidence to Vault`**.
7. Watch the progress bars fill up.

### Expected Visual Result:
- Status chips transition: `Calculating Hash` ➔ `Hash Verified` ➔ `Uploading to Vault` ➔ `Anchored on Sepolia`.
- A green checkmark badge confirms successful WORM retention and on-chain registration.

### Under the Hood / API:
- In-Browser Hashing: Native `crypto.subtle.digest('SHA-256', buffer)`
- Upload Endpoint: `POST /api/v1/evidence/upload`
- Dual verification: Server-side `HashingStream` compares bytes on arrival against the client digest.

### Tech Stack & Why It's Used:
- **Web Crypto API (SubtleCrypto)**: Zero-dependency, hardware-accelerated cryptographic hashing in the browser sandbox. Guarantees that corrupted or intercepted network packets are rejected before entering storage.

---

## Test 12: Cryptographic Verification Dropzone (Authentic vs Tampered)

### What to Test:
Verify the ultimate forensic test: proving whether a file matches the legal vault and blockchain record or has been modified by even a single byte.

### Step-by-Step Actions (Authentic Test):
1. Click the fourth tab: **`Verification Dropzone`**.
2. Drop any file that was previously uploaded into the system.
3. Watch the verification check execute.

### Expected Visual Result (Authentic):
- A glowing green card appears: **`AUTHENTIC EVIDENCE VERIFIED`**.
- Displays:
  - Calculated SHA-256 matching the database record
  - On-Chain Status: **`CONFIRMED ON SEPOLIA`**
  - Ethereum Block Number and Transaction Link
  - Custodian & Timestamp confirmation

### Step-by-Step Actions (Tampered / Unknown File Test):
1. Drop any random un-ingested file, or open an uploaded text file, add one single character/space, and drop it.
2. Observe the verification result.

### Expected Visual Result (Tampered / Unknown):
- A glowing red/amber warning card appears: **`INTEGRITY CHECK: UNREGISTERED / TAMPERED`**.
- Message: `Cryptographic SHA-256 digest does not match any registered vault record or smart contract anchor.`

### Under the Hood / API:
- Endpoint: `POST /api/v1/evidence/verify`
- Server queries:
  1. PostgreSQL for matching `sha256_hash`.
  2. Smart contract `verify_evidence_on_chain(sha256_hash)`.

### Tech Stack & Why It's Used:
- **Cryptographic Avalanche Effect**: In SHA-256, changing even 1 single bit changes ~50% of the output hash. This provides mathematical, tamper-proof verification admissible in international courts.

---

## Test 13: Hybrid Semantic AI Search

### What to Test:
Verify multimodal semantic search combining traditional keyword matching with OpenAI CLIP high-dimensional vector similarity.

### Step-by-Step Actions:
1. In the **Evidence Vault** tab, look at the Semantic Search bar.
2. Try searching by natural language concepts rather than exact filenames:
   - Type: `vehicle incident` or `bodycam recording`
3. Hit Enter.

### Expected Visual Result:
- Search results display items ranked by a **Similarity Score percentage** (e.g. `94% match`).
- Highlights matching keywords in title, case number, or visual concept embeddings.

### Under the Hood / API:
- Endpoint: `POST /api/v1/search/semantic`
- Query text is converted to a 512-dimensional vector via CLIP (`openai/clip-vit-base-patch32`).
- Vector search runs via `pgvector`:
  `SELECT ... 1 - (clip_embedding <=> query_vec) AS similarity FROM evidence_ai_index ORDER BY similarity DESC`

### Tech Stack & Why It's Used:
- **pgvector & HuggingFace CLIP**: Enables investigators to search hours of visual CCTV or evidence archives using conceptual descriptions (e.g., "red car at night") without requiring manual tagging.

---

## Summary Checklist for Jury Presentation

Print or keep this quick sequence in mind for your final demonstration:

1. **Top Bar**: Show `SEPOLIA LIVE` (Chain ID 11155111) & WORM compliance.
2. **Repository**: Filter evidence by case number, click row to open forensic drawer.
3. **Court Dossier**: Click `Court Dossier (PDF)` to show the Section 65B legal certificate with embedded QR code.
4. **Custody Transfer**: Click `Transfer Custody`, assign a new custodian, watch the timeline update.
5. **ELA Tamper Heatmap**: Show the compression error differential detecting image tampering.
6. **Verification Dropzone**: Drop an authentic file (green verified) vs modified file (red alert).
7. **Export Ledger**: Click `Export Global Ledger (CSV)` to prove transparent external auditability.
