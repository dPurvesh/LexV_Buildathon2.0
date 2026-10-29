# 🎬 LEXVAULT: Master 3-Minute Video Demo Recording Blueprint

> **Target Audience for this Document**: Use this exact minute-by-minute action plan to record your screen (OBS, Loom, Windows Game Bar `Win + G`, or QuickTime).  
> **After Recording**: Feed this document alongside your recorded video to **Claude** or **Gemini** to auto-generate a synchronized voiceover script, convert it to speech via an AI voice generator (ElevenLabs / Murf.ai / OpenAI TTS), and merge them seamlessly into your final video submission.

---

## ⏱️ Video Overview & Timeline Architecture (Total: 3:00 / 180s)

| Timestamp | Duration | Section | Core Features Showcased |
| :--- | :---: | :--- | :--- |
| **0:00 – 0:25** | 25s | **1. System Telemetry & Role Governance** | • MST Mainnet Live Anchor (Chain ID `4646`)<br>• WORM Lock 365D Compliance<br>• 3-Persona PIN Gatekeeper (`1001` / `2002` / `3003`) with Demo Chips & Eye Toggle |
| **0:25 – 0:50** | 25s | **2. Repository & AI Semantic Search** | • Natural language vector search (`pgvector` + CLIP ViT-B/32)<br>• Dynamic suggestion chips (`"traffic accident"`, `"night robbery"`)<br>• Case filter & Clear Filter (`X`) button |
| **0:50 – 1:35** | 45s | **3. Multi-Modal Forensic Deep Dive** | • **Image**: 🔴 Direct Red Tamper Localization Mask, OpenCV `ALTERED` box (`4.17%`), ↔️ 3-Way Split Canvas Slider<br>• **Audio**: 🎙️ `faster-whisper` word-level playback scrubbing<br>• **Document**: 📜 PDF legal sequence diff highlighting |
| **1:35 – 2:05** | 30s | **4. Chain of Custody & Smart Contract Handoff** | • Luminous custody timeline with historical milestones<br>• Role PIN clearance modal (`1001`)<br>• Live MST Mainnet on-chain transaction anchor & MSTScan receipt link |
| **2:05 – 2:35** | 30s | **5. Statutory Section 65B Court Dossier** | • Auditor PIN authentication (`3003`)<br>• Instant vector-precise Section 65B / BSA § 63 PDF generation<br>• Embedded dynamic verification QR code linking to MSTScan block explorer |
| **2:35 – 3:00** | 25s | **6. Verification Dropzone & Tamper Radar** | • Client-side WebCrypto SHA-256 live hashing bar<br>• Authentic File Test: Green `STATUS: VERIFIED` card with block height<br>• Tampered Derivative Test: Red `INTEGRITY BREACH` card with pHash match & perimeters |

---

## 🛠️ Pre-Recording Setup Checklist (Do This Before Hitting Record!)

1. **Verify Services Running**:
   * Open your browser to `http://localhost:3000`.
   * Open DevTools or ensure browser zoom is set to `100%` or `90%` for crisp widescreen 16:9 capture (1920×1080).
2. **Have 3 Test Files Ready on Desktop / Downloads**:
   * **File 1 (Image)**: An authentic photo or CCTV frame (and its tampered/derivative version if testing dropzone).
   * **File 2 (Audio)**: A voice note, 911 dispatch, or police radio snippet (`.mp3`, `.wav`, or `.m4a`).
   * **File 3 (Document)**: A contract or legal report (`.pdf`).
3. **Keep Role PINs in Mind**:
   * 🛡️ **Investigator**: `1001`
   * 🔬 **Forensic Analyst**: `2002`
   * ⚖️ **Compliance Auditor**: `3003`

---

## 🎬 Step-by-Step Screen Recording Walkthrough

---

### ⏱️ SECTION 1: System Telemetry, MST Mainnet & Role Gatekeeper (0:00 – 0:25)
* **Screen View**: Homepage top bar & KPI strip.

#### Step 1.1: Highlight the Live Blockchain Telemetry Strip (Top Bar)
* **Action**: Hover your mouse cursor over the top telemetry strip.
* **What to Show**:
  * Point at **`🟢 MST MAINNET LIVE`** (glowing green status dot).
  * Point at **`NETWORK: MST MAINNET (4646)`** and live synchronized **`BLOCK: #21760xxx`**.
  * Point at the **`WORM LOCK: 365D COMPLIANCE`** badge.
  * Point at **`CONTRACT: 0x62ae…0c7e`** and click the copy icon (show green checkmark animation).
* **Script Anchor for AI**: *"LEXVAULT operates on the public MST Mainnet (Chain ID 4646) paired with SEC Rule 17a-4 compliant 365-day MinIO WORM storage, guaranteeing zero data deletion even by root superusers."*

#### Step 1.2: Demonstrate the 3-Persona Role Gatekeeper
* **Action**: Click the **Role Selector Pill** in the top right (currently showing `Investigator`).
* **What to Show**:
  * The **"Switch Forensic Persona"** modal opens.
  * Show the new **Quick Clearance PIN chips**: `Investigator: 1001`, `Forensic Analyst: 2002`, `Court Auditor: 3003`.
  * Click the **Eye icon** (`👁️`) inside the input box to demonstrate the PIN visibility toggle.
  * Click the `Forensic Analyst: 2002` chip — observe it auto-fill and switch your active role to Forensic Analyst with the purple halo badge.
* **Script Anchor for AI**: *"Statutory access control enforces strict legal duty separation between Investigators, Forensic Analysts, and Court Auditors."*

---

### ⏱️ SECTION 2: Repository & AI Semantic Search (0:25 – 0:50)
* **Screen View**: Tab `[01] Repository & AI Search`.

#### Step 2.1: Showcase the Live Command Center KPI Cards
* **Action**: Pan cursor across the 6 dashboard metric cards:
  * `16 Evidence Items` • `12 Active Cases` • `10.4 MB WORM Storage` • `4 Tamper Alerts` • `16 Vector Indexed` • `2 Custody Handoffs`.
* **Script Anchor for AI**: *"Our real-time forensic dashboard tracks vault volume, tamper anomalies, and confirms that 100% of stored records are vector-indexed."*

#### Step 2.2: Demonstrate `pgvector` Semantic AI Search
* **Action**:
  * Click on one of the dynamic suggestion chips below the search bar (e.g. click **`"traffic accident"`** or **`"night robbery"`**).
  * Observe the instant cosine retrieval from `pgvector` (512-dim CLIP ViT vectors) filtering matching visual and document evidence.
  * Type a custom query in the search bar: e.g. `burglary` and hit Enter.
  * Show the instant match count: e.g. `1 semantic matches (cosine threshold: 0.70)`.
* **Script Anchor for AI**: *"Powered by pgvector and CLIP ViT embeddings, investigators can query vast evidence archives using natural language conceptual descriptions without manual tagging."*

#### Step 2.3: Demonstrate Case Filtering & Clear Filter
* **Action**:
  * In the **Filter by case number** box, type `CASE-2026-PDF4`.
  * Observe the table filter down to that case.
  * Click the **`X Clear Filter`** button — show the table immediately spring back to all 16 items.

---

### ⏱️ SECTION 3: Multi-Modal Forensic Deep Dive (0:50 – 1:35)
* **Screen View**: Evidence Table $\rightarrow$ Inspector Modals.

#### Part A: Image Tamper Localization & 3-Way Slider (0:50 – 1:10)
* **Action**:
  * In the Evidence Table, locate an image item (e.g., `171115513` or `CanHiddenCameraFootage...`).
  * Click the **`👁️ Inspect`** button.
  * In the Inspector, click the purple button: **`🔬 Launch ELA & Tamper Radar`**.
  * The interactive forensic viewer opens:
    1. **Direct Red Tamper Localization Mask**: Show how pristine pixels stay natural, while altered/spliced pixels glow in **vivid semi-transparent red**.
    2. **OpenCV Bounding Boxes**: Point to the bounding box labeled **`ALTERED`** with coordinates.
    3. **Metrics Badge**: Point to the diagnostic banner: `1 Region Isolated • ALTERED AREA: 4.17% OF PIXELS`.
    4. **3-Way Split-Screen Slider**: Grab the slider handle with your mouse and drag it across:
       - Swipe mode 1: `Original Vault vs Red Tamper Highlight`
       - Click mode 2: `Original Vault vs Uploaded Derivative`
       - Click mode 3: `Uploaded vs ELA Compression Heatmap`
  * Close the ELA modal.
* **Script Anchor for AI**: *"Traditional SHA-256 hashing fails blindly when 1 single pixel changes. LEXVAULT solves this with computer-vision red tamper localization masks, OpenCV perimeters, and a 3-way split-screen slider that isolates exact altered areas for courtroom juries."*

#### Part B: Word-Level Audio Scrubbing via `faster-whisper` (1:10 – 1:25)
* **Action**:
  * In the Evidence Table, locate the audio evidence (item with the audio icon, e.g. `CASE-2026-SOUND1 - Recording`).
  * Click **`👁️ Inspect`**.
  * Click the purple button: **`🎙️ Audio Transcript & Word-Level Forensics`**.
  * The Audio Forensic Player opens:
    * Click the **Play** button on the audio player.
    * In the transcribed text below, click directly on any individual word (e.g. click a word in the second sentence).
    * Notice how the audio playback instantly jumps to that exact millisecond timestamp!
  * Close the audio modal.
* **Script Anchor for AI**: *"For 911 calls and bodycam audio, faster-whisper generates vector-aligned transcripts with word-level playback scrubbing, running 100% locally with zero cloud privacy risks."*

#### Part C: Document PDF Differential Engine (1:25 – 1:35)
* **Action**:
  * In the Evidence Table, click **`👁️ Inspect`** on a PDF document (e.g. `Sample Report2 CCTV DVR` or `nagpur case`).
  * Point out the file metadata, SHA-256 digest, and the text diff analysis highlighting added clauses in green (`+`) and deleted clauses in red (`-`).
  * Close the Inspector.
* **Script Anchor for AI**: *"PDF contracts and legal briefs undergo automated sequence differential analysis, flagging unauthorized clause modifications against baseline on-chain archives."*

---

### ⏱️ SECTION 4: Chain of Custody & MST Mainnet Handoff (1:35 – 2:05)
* **Screen View**: Evidence Table $\rightarrow$ Custody Timeline Section.

#### Step 4.1: Inspect the Chain of Custody Timeline
* **Action**:
  * In the Evidence Table, click the cyan **`🔗 Custody`** button on any evidence row.
  * The page smoothly scrolls to the **Chain of Custody Timeline**.
  * Show the historical timeline cards:
    * `INITIAL_INTAKE` (Intake & Cryptographic Seal)
    * `FORENSIC_ANALYSIS` (Crime Lab Analysis)
    * Show the green pill: **`WORM COMPLIANT`**.
    * Point to the **`MST Chain TX: 0x85648b…`** link. Click it to show it points to `https://mstscan.com/tx/...`!
* **Script Anchor for AI**: *"Every evidence lifecycle transition is sealed under MinIO WORM compliance and permanently anchored to the MST Blockchain public ledger."*

#### Step 4.2: Execute a Real Custody Handoff
* **Action**:
  * Click the **`Transfer Custody`** button.
  * Enter target custodian: `State Crime Laboratory - Cyber Division`.
  * Action type: Select `FORENSIC_ANALYSIS` or `CUSTODY_TRANSFER`.
  * Notes: Type `Transferred for forensic verification under Sec 65B`.
  * Click **`Submit Custody Transfer`**.
  * If prompted for role clearance, enter PIN `1001` (Investigator) and click Unlock.
  * Watch the transaction broadcast live to MST Mainnet and the new milestone card appear in the timeline!
* **Script Anchor for AI**: *"Custody transfers execute smart contract state changes with zero administrative override capability."*

---

### ⏱️ SECTION 5: Statutory Section 65B Court Dossier & QR Code (2:05 – 2:35)
* **Screen View**: Evidence Inspector $\rightarrow$ PDF Certificate.

#### Step 5.1: Generate Court Admissible PDF Dossier
* **Action**:
  * In the Evidence Table, click **`👁️ Inspect`** on any evidence item.
  * Click the green button: **`📜 Generate Court Certificate (Section 65B PDF)`**.
  * If prompted with the Role Lock modal (*"Restricted to Court Auditor clearance"*):
    * Click the **`Court Auditor: 3003`** chip to auto-fill.
    * Click **`Unlock`**.
  * The official PDF immediately downloads and opens in your browser!
* **Script Anchor for AI**: *"Compliance Auditors can instantly export statutory Section 65B and BSA Section 63 court dossiers formatted for direct judicial submission."*

#### Step 5.2: Highlight the Embedded Dynamic Verification QR Code
* **Action**:
  * Scroll down the opened PDF certificate to the bottom section:
  * Point out the **`ON-CHAIN CRYPTOGRAPHIC PROOF (MST BLOCKCHAIN)`** heading.
  * Point to the high-resolution QR code and the clickable MSTScan link below it.
  * *(Optional visual flair)*: Briefly hover your smartphone camera over the QR code on screen to show it instantly resolves to the transaction on `mstscan.com`!
* **Script Anchor for AI**: *"Every printed court dossier features an embedded dynamic QR code linking physical paper evidence binders directly to immutable on-chain block receipts on MSTScan."*

---

### ⏱️ SECTION 6: Verification Dropzone & Real-Time Tamper Radar (2:35 – 3:00)
* **Screen View**: Tab `[04] Verification Dropzone`.

#### Step 6.1: Drag & Drop an Authentic File
* **Action**:
  * Click on Tab **`[04] Verification Dropzone`**.
  * Drag and drop an authentic preserved file (or click to browse).
  * Watch the **Client WebCrypto SHA-256 Digest Stream** progress bar animate from `0%` to `100%`.
  * Observe the instant **Green `STATUS: VERIFIED & ADMISSIBLE IN COURT`** card appear:
    * `BIT-EXACT SHA-256 MATCH`
    * `On-Chain Registrar`: `0x118357b62786...`
    * `MST Block Height`: `#21760xxx`
    * `Chain Transaction`: Clickable MSTScan link!
* **Script Anchor for AI**: *"Client-side WebCrypto SHA-256 streaming pre-screens files in milliseconds before verifying existence on the MST Blockchain."*

#### Step 6.2: Drag & Drop a Tampered Derivative File
* **Action**:
  * Drag and drop a modified or tampered file into the dropzone.
  * Watch the instant **Red `REGISTERED VAULT RECORD — INTEGRITY BREACH DETECTED`** card trigger!
  * Point out:
    * `TAMPER DRIFT: 4.17% DIVERGENCE`
    * 64-bit DCT pHash perceptual match at `95.8%` similarity.
    * The red pixel highlight overlay with OpenCV bounding boxes labeled **`ALTERED`**!
* **Script Anchor for AI**: *"When altered derivatives are uploaded, LEXVAULT uses perceptual DCT matching to identify the parent record, overlays the exact tampered pixels in red, and flags the breach for judges."*

#### Step 6.3: Concluding Hero Shot
* **Action**:
  * Switch back to the Command Center top view.
  * Move cursor smoothly to center screen as the video fades out.
* **Script Anchor for AI**: *"LEXVAULT: Turning vulnerable electronic evidence into mathematically certified, courtroom-unassailable truth. Powered by MST Blockchain."*

---

## 🎙️ Video Audio Script Prompt Template (Copy-Paste for Claude / Gemini)

Once you finish recording your screen, prompt your LLM with:

```markdown
I have recorded a 3-minute screen recording of my project LEXVAULT based on the attached videodemo.md walkthrough.

Please generate a high-impact, professional, confident voiceover script formatted with exact timestamp cues [0:00], [0:15], etc., matching the 3-minute video duration. The tone should be authoritative, cyber-forensic, and enterprise-grade, highlighting our integration with MST Blockchain (Chain ID 4646), MinIO WORM storage, OpenCV Red Tamper Localization, faster-whisper audio scrubbing, and Section 65B court dossiers.
```

---

## 🏆 Checklist for Demo Day Success
- [x] **MST Mainnet Live**: Telemetry shows `MST MAINNET LIVE` on Chain `4646`.
- [x] **No Mock Warnings**: Real transactions on `mstscan.com`.
- [x] **All 3 Media Types Demonstrated**: Photo/CCTV (Red Tamper Localization), Audio (Whisper word scrub), Document (PDF differential).
- [x] **Role Access Demonstrated**: Investigator (`1001`), Analyst (`2002`), Auditor (`3003`).
- [x] **Section 65B PDF Shown**: High-res QR code linking to on-chain MSTScan block.
