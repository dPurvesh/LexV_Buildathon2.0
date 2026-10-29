# LEXVAULT: Complete Demo & Manual Testing Walkthrough
**Step-by-Step Test Plan for Verification, Jury Demonstration & Academic Evaluation**

This guide provides an exact, line-by-line manual testing procedure to verify every single feature of the LEXVAULT system. Follow these tests sequentially to prove full operational readiness and learn how to present each feature to your evaluators.

---

## Pre-Requisite: Environment Verification

Before beginning manual testing, ensure the local services are accessible:
1. Open your web browser and navigate to: **`http://localhost:3000`** (or `http://localhost:3001` if running local standalone dev)
2. Ensure the backend container is running on: **`http://localhost:8000/health`** (returns `{"status": "ok"}`)
3. Ensure MinIO Object Vault console is up on: **`http://localhost:9001`**

---

## Test 1: Real-Time Blockchain Telemetry & Compliance Header

### What to Test:
Verify that the system is actively synchronized with the public MST Blockchain network (MST Coral Testnet / Mainnet) and the MinIO WORM vault.

### Step-by-Step Actions:
1. Look at the very top horizontal strip on the screen (the **Telemetry Bar**).
2. Observe the status indicator pill on the left.
3. Observe the `CHAIN`, `BLOCK`, `WORM / COMPLIANCE`, and `CONTRACT` badges.

### Expected Visual Result:
- Indicator pill displays a glowing green dot: **`🟢 MST TESTNET LIVE`** / **`🟢 MST MAINNET LIVE`** (previously showed red offline before CORS fix).
- `CHAIN`: **`54635`** (MST Coral Testnet), **`91562037`** (MST Testnet), or **`4646`** (MST Mainnet).
- `BLOCK`: Displays an active block number greater than **`11745900`** that updates every 15 seconds.
- `WORM / COMPLIANCE`: Highlighted in glowing violet badge indicating active SEC Rule 17a-4 compliance.
- `CONTRACT`: Displays **`CONFIGURED`**.

### Under the Hood / API:
- Endpoint: `GET http://localhost:8000/api/v1/blockchain/status`
- Response: `{"connected": true, "chain_id": 11155111, "latest_block": 11745980, "relayer_balance_eth": 0.048}`
- Periodic polling: `window.setInterval` executes every 15,000ms.

### Tech Stack & Why It's Used:
- **Web3.py & Infura/Alchemy RPC**: Connects Python directly to the MST Virtual Machine (EVM) to query decentralized state without requiring a heavy local geth node.
- **Why**: Proves to the jury that the application is not merely saving data locally; it is tethered to a global immutable public blockchain ledger.

### Jury Talking Script:
> *"Respected jury members, notice the telemetry strip at the top. LEXVAULT is directly connected to MST Blockchain (e.g. MST Coral Testnet Chain ID 54635 / MST Mainnet 4646). Every block number displayed is live on the public blockchain. Additionally, the WORM badge indicates that our underlying storage prevents anyone—even a root system administrator—from deleting or tampering with ingested evidence."*

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
1. In the topbar header on the right, look at the role pill: **`[ 🛡️ Investigator ▾ ]`**.
2. Click the **Upload** tab: It opens normally with full batch file ingestion capabilities.
3. Click the **Evidence Vault** tab, and click any row (e.g. `CCTV Bodycam Footage`) to open the inspector drawer.
4. Observe the action buttons at the bottom of the drawer:
   - `⚡ Transfer Custody` is active.
   - `🔒 ELA Heatmap` is marked with a padlock icon (Restricted to Forensic Analyst).
   - `🔒 Court Dossier (PDF)` is marked with a padlock icon (Restricted to Auditor).
5. Click the locked **`🔒 ELA Heatmap`** button:
   - A frosted glass dialog pops up: **"Access Restricted — Error Level Analysis Heatmap requires clearance reserved for Forensic Analyst."**
   - Shows your active role: `🛡️ Investigator` ➔ Required: `🔬 Forensic Analyst`.

#### B. Unlock with Forensic Analyst PIN (`2002`):
1. In the open dialog, type **`2002`** on your keyboard.
2. Click **Unlock** (or press `Enter`):
   - The modal closes and the ELA Tamper Heatmap opens immediately!
   - Look at the topbar: The badge has transformed to **`[ 🔬 Forensic Analyst ▾ ]`** in glowing purple.
3. Now, click on the **Upload** tab in the main navigation:
   - The tab shows a lock badge: **`Upload 🔒`**.
   - The content displays the **"Evidence Ingestion Locked"** security notice explaining that raw ingestion is restricted to Law Enforcement Investigators.
   - In the inspector drawer, `🔒 Transfer Custody` is now locked.

#### C. Unlock with Court Auditor PIN (`3003`):
1. Click the topbar role pill **`[ 🔬 Forensic Analyst ▾ ]`**.
2. Type **`3003`** on your keyboard and press `Enter`.
3. The topbar updates to **`[ ⚖️ Court Auditor ▾ ]`** in emerald green.
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
> *"A frequent criticism of student projects is that 'anyone can click any button and alter records.' In LEXVAULT, we implemented strict Role-Based Access Control with 3 distinct professional personas authenticated via individual clearance PINs. An investigator cannot fake an ELA analysis; an analyst cannot tamper with legal custody handovers; and only a certified legal auditor can issue an official Section 65B court certificate."*

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
3. In the search box above the table, type: `CASE-2026-CR-8092` (or click a case card from Tab [02] Case Portfolio).
4. Observe the table instantly filter to show only records matching that case.
5. Notice the **`✕ Clear Filter`** button that appears right next to the filter input. Click it to immediately clear the filter and restore all vault records in one click!
6. Click the button labeled **`Export Global Ledger (CSV)`** in the table header.

### Expected Visual Result:
- Table renders sleek rows with frosted glass borders.
- Active search filters show a dedicated **`✕ Clear Filter`** button with instant reset.
- Columns display: `Evidence Title`, `Case Number`, `SHA-256 Checksum` (monospace font), `Tamper Status` (pill badge), `MST TX` (pill badge), and `Registered Date`.
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
   - Blockchain proof (MST transaction hash, block number)
   - Perceptual Hash (pHash)
   - Action buttons (Court Dossier, Transfer Custody, ELA Heatmap, Download)

### Expected Visual Result:
- Drawer slides in with a frosted glass backdrop (`backdrop-filter: blur(24px)`).
- Complete SHA-256 digest is formatted cleanly in Fira Code font with a copy button.
- MST transaction hash displays a link icon pointing to MSTScan (`https://coral.mstscan.com/tx/0x02fb8db...`).
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
  - MST Blockchain Verification Table (Contract address, Block #, Transaction Hash)
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
  3. Interacts with Web3 to register the custody event on MST Blockchain.

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
4. In the top-right header of the modal, notice the interactive mode toggle:
   - **`🔴 Red Anomaly Mask`** (Default)
   - **`🌡️ Thermal Spectrum`**
5. Slide the divider handle left and right to inspect boundaries between authentic vault content and localized anomaly masks.

### Expected Visual Result:
- **Interactive Dual-Mode Viewer**:
  - **Mode A: `🔴 Red Anomaly Mask`**: Directly highlights altered, spliced, or divergent pixels in vivid semi-transparent red (`rgba(239, 68, 68, 0.55)`) with OpenCV bounding boxes labeled `ANOMALY`. Pristine original background pixels remain in natural coloration.
  - **Mode B: `🌡️ Thermal Spectrum`**: Classic multi-color JET/Inferno heatmap displaying compression error intensities (Blue = Low, Green = Normal, Yellow = Suspicious, Red = High Anomaly).
- **Interactive Split Slider**: Smoothly reveals the anomaly mask over the clean original evidence.
- **Tamper Score Badge**: Quantitative score between `0.0` (unaltered) and `1.0` (heavily manipulated).
- **Perceptual Hash (pHash)**: 64-bit DCT perceptual hash displayed in hexadecimal.
- **Dynamic On-Demand Execution**: Works dynamically for both historical records already in MinIO as well as newly ingested images.

### Under the Hood / API:
- Endpoint: `GET /api/v1/forensics/{evidence_id}/ela-heatmap`
- Returns: `{"original_b64": "...", "heatmap_b64": "...", "red_overlay_b64": "...", "tamper_boxes": [...], "tamper_score": 0.05, "phash": "..."}`
- Python Backend:
  1. Fetches raw image bytes directly from MinIO WORM vault.
  2. Re-saves the image to an in-memory buffer at fixed JPEG quality (95%).
  3. Calculates absolute pixel differential using `Pillow.ImageChops.difference`.
  4. Computes thresholded anomaly mask, overlays vivid red mask onto original pixels, and extracts bounding boxes via `cv2.findContours`.
  5. Simultaneously maps error delta to an OpenCV JET thermal colormap.

### Tech Stack & Why It's Used:
- **Pillow & OpenCV (cv2)**: Industry-standard forensic methodology that gives courtroom evaluators an intuitive red visual alert directly on the original picture rather than an abstract false-color rainbow.

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

## Test 11: Batch Ingestion, Client Hashing & Pre-Upload Tamper Screening

### What to Test:
Verify multi-file bulk evidence ingestion with pre-upload cryptographic client hashing, intelligent tamper screening, and automated forensic flagging.

### Step-by-Step Actions:
1. Click the third tab in the navigation: **`Batch Ingestion`**.
2. Notice the large drag-and-drop ingestion zone.
3. Form Inputs:
   - **Case Number**: Enter `CASE-DEMO-2026`
   - **Default Custodian**: Enter `Investigator Miller #4401`
4. Select or drop evidence files (e.g., an authentic crime scene image or document).
5. Notice the **Pre-Upload Verification status**: The browser immediately calculates each file's SHA-256 hash *before* uploading.
6. **Tampered Derivative Ingestion Test**: Drop an altered or photoshopped version of an evidence file already in the vault.
   - The system performs real-time pre-screening against vault perceptual hashes.
   - If a derivative is detected, a warning chip alerts: **`⚠ Pre-Screen Alert: Tampered de### Expected Visual Result:
- Status chips transition: `Calculating Hash` ➔ `Hash Verified` ➔ `Uploading to Vault` ➔ `⛏️ Mining on MST Chain (~15s)` ➔ `Anchored & Sealed`.
- Dedicated **MST Blockchain Consensus** notice informs evaluators: *"Smart contract transaction broadcast to MST Blockchain. Awaiting block consensus and decentralized validator receipt confirmation (~12–25s)."*
- A green checkmark badge confirms successful WORM retention and on-chain registration once the block receipt is mined.
- If a tampered file was ingested, the backend automatically flags it with `is_tampered = TRUE`, records an anomaly score (`tamper_score`), logs `INTAKE_TAMPER_FLAGGED` in the custody timeline, and increments the Dashboard **Tamper Alerts** KPI!

> 💡 **Presenter Tip on Mining Delay**: Inform your audience that the 12–25s duration is concrete proof of authentic decentralized block mining on the public MST Blockchain network (MST Coral Testnet / Mainnet), rather than a synthetic local database write.

### Under the Hood / API:
- In-Browser Hashing: Native `crypto.subtle.digest('SHA-256', buffer)`
- Upload Endpoint: `POST /api/v1/evidence/upload`
- Dual verification: Server-side `HashingStream` compares bytes on arrival against the client digest.
- Perceptual Hash Screening: Computes 64-bit DCT pHash and checks Hamming distance $\le 15$ against existing vault images.
- Graceful MST Chain Anchoring: Reuses existing on-chain proof if hash is already registered, preventing contract revert errors.

### Tech Stack & Why It's Used:
- **Web Crypto API (SubtleCrypto) & Perceptual Hashing**: Guarantees that corrupted or intercepted network packets are rejected, while actively screening for counterfeit or modified derivatives of existing evidence before or upon vault entry.

---

## Test 12: Deep Multi-Modal Forensic Verification (Authentic, Tampered & Derivatives)

### What to Test:
Verify the ultimate forensic integrity engine: proving whether a file matches the legal vault and blockchain record, exposes modified derivatives of registered evidence, isolates altered pixels with direct red highlight masks and OpenCV bounding boxes, or flags compromised records stored in the ledger.

### Step-by-Step Actions & Expected Results:

#### Scenario A: Verifying an Authentic Vault Record
1. Click the fourth tab: **`Verification Dropzone`** (or `Verify`).
2. Drop any pristine, unaltered file that exists in the vault (e.g. `crime-scene-clean-up.jpg`).
3. **Expected Visual Result**:
   - Glowing emerald green card: **`AUTHENTIC & CRYPTOGRAPHICALLY VERIFIED`**.
   - Displays registered timestamp, current custodian address, MST block number, and direct link to MSTScan transaction.

#### Scenario B: Verifying a Registered Vault Record Flagged as Tampered
1. Drop a file that was ingested into the vault but flagged as tampered (e.g. `ChatGPT Image Sep 23, 2026, 03_29_18 AM.png`).
2. **Expected Visual Result**:
   - Distinct glowing red alert card: **`⚠ REGISTERED VAULT RECORD — FLAGGED AS TAMPERED`**.
   - Status Pills:
     - **Integrity Status**: `FLAGGED TAMPERED` (Bright red)
     - **Tamper Anomaly**: `100.0%`
     - **Original Vault Record**: `100% Match`
   - **Integrity Diagnostic**: Explains that the cryptographic hash matches the registered intake record, but it was flagged as compromised during forensic screening.
   - **Root Evidence Link**: Identifies the clean original record (*`crime scene clean up`*).
   - **Ledger Facts**: Displays blockchain registration, block, and custodian details.
   - **Multi-Modal Controls**: Automatically presents the **`🔴 Red Tamper Localization`** view, **Interactive Split Slider**, and **ELA Heatmap** immediately!

#### Scenario C: Verifying an Unregistered Tampered Derivative (Modified Copy)
1. Modify a local image (e.g., crop it, paint an object over it, or add text) WITHOUT uploading it, and drop it into the dropzone.
2. **Expected Visual Result**:
   - Red warning card: **`⚠ TAMPERED / MODIFIED EVIDENCE DETECTED`**.
   - Displays matched vault record title, case number, **Visual / Content Match %** (e.g., `95.8%`), and **Hamming Distance** (e.g., `2/64 bits`).
   - Five interactive forensic comparison views appear with **`🔴 Red Tamper Localization`** active by default:
     1. **🔴 Red Tamper Localization (Default Active Tab)**:
        - **Direct Red Anomaly Mask**: Highlights the exact modified or spliced pixels in bright semi-transparent red (`rgba(239, 68, 68, 0.55)`), keeping pristine pixels in natural coloration.
        - **OpenCV Bounding Boxes**: Automatically isolates tamper perimeters with 2px red rectangles labeled **`ALTERED`**.
        - **Tactical Tamper Banner**: Reports `1 Region Isolated` (or region count), `ALTERED AREA: 4.17%` (exact altered pixel ratio), and bounding box chips (e.g. `#[1]: [164×244 at (239, 359)]`).
        - **Forensic Legend**: Explains Red Highlight (Spliced / Modified Pixels), Red Bounding Box (Tamper Perimeter), and Natural Background (Untouched Vault Pixels).
     2. **↔️ Interactive Split Slider**:
        - 3-way toggle buttons:
          - **`🔴 Original vs Red Tamper Highlight`**: Drag the slider divider left and right across the authentic vault evidence to seamlessly reveal the highlighted red alterations.
          - **`Original Vault vs Uploaded`**: Direct visual slider against the suspect upload.
          - **`Uploaded vs ELA Heatmap`**: Slider against Error Level Analysis compression artifacts.
     3. **👥 Side-by-Side Dual View**: Displays original registered vault evidence alongside suspect upload.
     4. **🔬 Thermal Diff Heatmap / ELA**: Thermal JET spectral peaks isolating pixel offsets.
     5. **🧮 Perceptual Hash DCT Metrics**: 64-bit DCT perceptual hash comparison table with Hamming bit distance.

#### Scenario D: Verifying an Altered PDF Document (Text Diff Analysis)
1. Open a registered legal PDF document, edit/add/delete a sentence, and drop the modified PDF into the dropzone.
2. **Expected Visual Result**:
   - Detects the document match via textual sequence alignment (`difflib`).
   - Displays: **`Document text match identified (XX% textual similarity)`**.
   - **Text Diff Viewer**: Renders added lines in green (`+ Added line`) and deleted lines in red (`- Removed line`), pinpointing exact textual alterations.

#### Scenario E: Verifying an Unregistered, Completely Unknown File
1. Drop a completely unrelated random file.
2. **Expected Visual Result**:
   - Glowing crimson breach card: **`UNREGISTERED EVIDENCE / UNKNOWN DIGEST`**.
   - Explains that neither the SHA-256 hash nor perceptual fingerprint matches any vault record.
   - For images, renders **Direct Red Anomaly Localization** side-by-side with standalone ELA compression heatmaps.

### Under the Hood / API:
- Endpoint: `POST /api/v1/evidence/verify` (accepts multipart file or JSON hash)
- Cryptographic Engine:
  - Exact SHA-256 lookup in PostgreSQL `evidence` table.
  - Smart contract query `verify_evidence_on_chain(sha256_hash)`.
  - Image pHash Hamming Distance: `imagehash.phash()` with DCT 64-bit binary comparison.
  - Direct Red Tamper Mask & Bounding Boxes: Computes `cv2.absdiff(orig, mod)`, applies red overlay, identifies contours via `cv2.findContours`, and draws labeled bounding boxes. Returns `red_overlay_b64`, `tamper_boxes`, and `changed_pixels_ratio`.
  - Error Level Analysis (ELA): Computes 95% JPEG recompression error delta with dual red/thermal representations.
  - PDF Text Extraction & Diff: Extracts text streams via `pypdf` and executes unified diff sequencing.

### Tech Stack & Why It's Used:
- **Multi-Modal Forensic Architecture**: Real-world adversaries do not announce when they modify a file. Simple hash checking only says "file not found." LEXVAULT's multi-modal engine actively tells investigators *which* evidence was modified, *how* much it was altered, and *where* the altered pixels or paragraphs are located with bright red highlights and bounding boxes.

---

## Test 13: Hybrid Semantic AI Search

### What to Test:
Verify multimodal semantic search combining traditional keyword matching with OpenAI CLIP high-dimensional vector similarity, dynamic 1-click topic chips, and graceful zero-match guidance.

### Step-by-Step Actions:
1. In the **Evidence Vault** tab, observe the row of quick suggestion chips below the search bar:
   - `[traffic accident]`, `[armed robbery]`, `[nagpur highway]`, `[mumbai cctv]`, `[audio wiretap]`, `[crime scene clean up]`, `[CASE-2026-PDF1]`.
2. Click on any topic chip (e.g. `[traffic accident]`).
3. Notice the search query instantly executes and filters matching evidence.
4. Try typing a conceptual query not present in the test records (e.g. `satellite orbit`).
5. Observe the graceful vector-index guidance explaining that no embeddings match the query, with clickable recovery chips to return to positive results.

### Expected Visual Result:
- 1-click topic chips populate the search bar and trigger query execution immediately.
- Results display ranked by a **Similarity Score percentage** (e.g. `94% match`).
- Non-matching queries show clean fallback guidance with recovery chips rather than an empty blank screen.

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

1. **Top Bar**: Show `🟢 MST TESTNET LIVE` (Chain ID 54635 / 4646, live block updates) & WORM compliance.
2. **Repository & RBAC**: Show 3 personas (Investigator `1001`, Analyst `2002`, Auditor `3003`) and how PIN elevation protects sensitive tools.
3. **Evidence Table**: Demonstrate search, dynamic topic chips, and the **`✕ Clear Filter`** button.
4. **Court Dossier**: Click `Court Dossier (PDF)` to show the Section 65B legal certificate with embedded QR code.
5. **Custody Transfer**: Click `Transfer Custody`, assign a new custodian, watch the aligned timeline update.
6. **ELA Dual-Mode Heatmap**: In the inspector, open ELA Heatmap and toggle between **`🔴 Red Anomaly Mask`** and **`🌡️ Thermal Spectrum`**.
7. **Batch Ingestion & Mining Delay**: Upload evidence, show real-time pre-screening, and explain the 12–25s MST block consensus.
8. **Deep Multi-Modal Verification**:
   - Drop an authentic file ➔ Green `AUTHENTIC` card with MST Blockchain proof.
   - Drop a registered tampered file ➔ Red `REGISTERED VAULT RECORD — FLAGGED AS TAMPERED` card with 100% anomaly score and comparison slider against clean root record.
   - Drop an unregistered altered copy ➔ Red `TAMPERED EVIDENCE DETECTED` with **`🔴 Red Tamper Localization`** highlighting exact altered pixels with bounding boxes, altered area percentage, and 3-way split slider (`🔴 Original vs Red Tamper Highlight`)!
   - Drop an edited PDF ➔ Text diff viewer highlighting additions and deletions.
9. **Export Ledger**: Click `Export Global Ledger (CSV)` to prove transparent external auditability.

