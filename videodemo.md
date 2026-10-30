# 🎬 LEXVAULT: Master 3-Minute Video Demo Recording Blueprint

> **Target Audience for this Document**: Use this exact minute-by-minute action plan to record your screen (OBS, Loom, Windows Game Bar `Win + G`, or QuickTime).  
> **After Recording**: Feed this document alongside your recorded video to **Claude** or **Gemini** to auto-generate a synchronized voiceover script, convert it to speech via an AI voice generator (ElevenLabs / Murf.ai / OpenAI TTS), and merge them seamlessly into your final video submission.

---

## 📁 Pre-Generated Demo Evidence Assets (Ready in Workspace!)

All required authentic and tampered forensic test pairs have been generated and are located right in your workspace folder:

### 📂 Folder 1: Authentic Baseline Records (`demo_evidence/01_AUTHENTIC/`)
* 📄 **Document**: `demo_evidence/01_AUTHENTIC/Forensic_Case_Report_CR902.pdf` (Clean CFSL Section 65B seizure report)
* 🖼️ **Image**: `demo_evidence/01_AUTHENTIC/CCTV_Vault_Entrance_01.jpg` (Security vault camera frame at 30FPS)
* 🎙️ **Audio**: `demo_evidence/01_AUTHENTIC/Emergency_Radio_Dispatch_Call.wav` (Police radio dispatch sequence with roger beep)

### 📂 Folder 2: Tampered Derivatives (`demo_evidence/02_TAMPERED/`)
* 📄 **Tampered Document**: `demo_evidence/02_TAMPERED/Forensic_Case_Report_CR902_TAMPERED.pdf` (Altered vehicle, dates, and amounts with redacted signatures)
* 🖼️ **Tampered Image**: `demo_evidence/02_TAMPERED/CCTV_Vault_Entrance_01_TAMPERED.jpg` (Perceptual pHash match with spliced anomalous override box on vault door)
* 🎙️ **Tampered Audio**: `demo_evidence/02_TAMPERED/Emergency_Radio_Dispatch_Call_TAMPERED.wav` (Altered pitch with injected intrusive frequency noise burst)

---

## ⏱️ Video Overview & Timeline Architecture (Total: 3:00 / 180s)

| Timestamp | Duration | Section | Core Features Showcased |
| :--- | :---: | :--- | :--- |
| **0:00 – 0:25** | 25s | **1. System Telemetry & Role Governance** | • MST Mainnet Live Anchor (Chain ID `4646`)<br>• WORM Lock 365D Compliance<br>• 3-Persona PIN Gatekeeper (`1001` / `2002` / `3003`) with Demo Chips & Eye Toggle |
| **0:25 – 1:00** | 35s | **2. Live Ingestion of New Evidence** | • Tab `[03] Ingestion & WORM Lock`<br>• Ingest authentic Document, Image, and Audio<br>• WebCrypto SHA-256 progress & MST Mainnet live consensus mining |
| **1:00 – 1:40** | 40s | **3. Multi-Modal Forensic Deep Dive** | • **Image**: 🔴 Red Tamper Localization Mask, OpenCV `ALTERED` box, 3-Way Split Canvas Slider<br>• **Audio**: 🎙️ `faster-whisper` word-level playback scrubbing<br>• **Document**: 📜 PDF legal sequence diff highlighting |
| **1:40 – 2:05** | 25s | **4. Custody Handoff & Section 65B Dossier** | • Custody transfer on MST Mainnet (PIN `1001`) with MSTScan link<br>• Statutory Section 65B Court Dossier PDF (PIN `3003`) with embedded dynamic QR code |
| **2:05 – 2:35** | 30s | **5. Verification Dropzone: Tamper Radar** | • Tab `[04] Verification Dropzone`<br>• Drop tampered derivative files<br>• Instant Red `INTEGRITY BREACH DETECTED` card with pHash match & perimeters |
| **2:35 – 3:00** | 25s | **6. Ingestion Tamper Interception (Tamper Alert)** | • Tab `[03] Ingestion & WORM Lock`<br>• Attempt to ingest the tampered derivative<br>• Pre-check alert: `Derivative of [Original] (Tamper Alert)`<br>• Permanent red `ANCHORED (TAMPER ALERT)` badge in repository |

---

## 🛠️ Pre-Recording Setup Checklist (Do This Before Hitting Record!)

1. **Verify Services Running**:
   * Open your browser to `http://localhost:3000`.
   * Ensure browser zoom is set to `100%` or `90%` for crisp widescreen 16:9 capture (1920×1080).
2. **Open the `demo_evidence` folder in File Explorer side-by-side**:
   * Have `demo_evidence/01_AUTHENTIC` and `demo_evidence/02_TAMPERED` open in another window or on Desktop so you can drag and drop smoothly during recording.
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
  * Point at **`NETWORK: MST MAINNET (4646)`** and live synchronized **`BLOCK: #2176xxxx`**.
  * Point at the **`WORM LOCK: 365D COMPLIANCE`** badge.
  * Point at **`CONTRACT: 0x62ae…0c7e`** and click the copy icon (show green checkmark animation).
* **Script Anchor for AI**: *"LEXVAULT operates on the public MST Mainnet (Chain ID 4646) paired with SEC Rule 17a-4 compliant 365-day MinIO WORM storage, guaranteeing zero data deletion even by root superusers."*

#### Step 1.2: Demonstrate the 3-Persona Role Gatekeeper
* **Action**: Click the **Role Selector Pill** in the top right (showing `Investigator`).
* **What to Show**:
  * The **"Switch Forensic Persona"** modal opens.
  * Show the **Quick Clearance PIN chips**: `Investigator: 1001`, `Forensic Analyst: 2002`, `Court Auditor: 3003`.
  * Click the **Eye icon** (`👁️`) inside the input box to demonstrate the PIN visibility toggle.
  * Click the `Investigator: 1001` chip — observe it auto-fill and switch role.
* **Script Anchor for AI**: *"Statutory access control enforces strict legal duty separation between Investigators, Forensic Analysts, and Court Auditors."*

#### Step 1.3: Crime Scene Geolocation Radar (Tab [02])
* **Action**: Click Tab **`[02] Case Portfolio`**.
* **What to Show**:
  * Point at the **Crime Scene Geolocation Radar** interactive map.
  * Show the tactical glowing pins (green for authentic seizures, red for tampered assets) plotting coordinates across crime scenes.
  * Click on a marker to show the popover with camera info and coordinates.
* **Script Anchor for AI**: *"Physical chain of custody is mapped via our integrated Crime Scene Geolocation Radar, tracking the exact GPS coordinates and camera hardware where digital evidence was seized."*

---

### ⏱️ SECTION 2: Live Ingestion of New Evidence (0:25 – 1:00)
* **Screen View**: Tab `[03] Ingestion & WORM Lock`.

#### Step 2.1: Navigate to Ingestion Tab
* **Action**: Click Tab **`[03] Ingestion & WORM Lock`**.
* **What to Show**:
  * Case Number: Enter `CASE-2026-CR902`.
  * Custodian: Enter `Central Cyber Forensic Lab`.

#### Step 2.2: Ingest the 3 Authentic Files
* **Action**:
  * Drag and drop the 3 authentic files from `demo_evidence/01_AUTHENTIC/`:
    1. `Forensic_Case_Report_CR902.pdf`
    2. `CCTV_Vault_Entrance_01.jpg`
    3. `Emergency_Radio_Dispatch_Call.wav`
  * Click the **`🚀 Ingest & Anchor Evidence to Ledger`** button.
* **What to Show**:
  * **Stage 01**: In-memory WebCrypto client-side SHA-256 hash generation with glowing progress bar.
  * **Stage 02**: MinIO WORM storage upload with immutable 365-day retention lock.
  * **Stage 03**: Real-time smart contract transaction broadcast to MST Mainnet:
    * Notice badge: `Mining on MST Chain (~15s)`.
  * **Stage 04**: All 3 items turn green: **`ANCHORED`** with live MST transaction hashes!
* **Script Anchor for AI**: *"During ingestion, client-side WebCrypto computes SHA-256 digests before sealing files under WORM retention and mining immutable cryptographic receipts directly onto the MST Mainnet."*

---

### ⏱️ SECTION 3: Multi-Modal Forensic Deep Dive (1:00 – 1:40)
* **Screen View**: Tab `[01] Repository & AI Search` $\rightarrow$ Evidence Table $\rightarrow$ Inspector Modals.

#### Step 3.1: Switch to Repository Tab
* **Action**: Click Tab **`[01] Repository & AI Search`**.
* **What to Show**:
  * Point at the updated KPI strip: `Evidence Items` and `Vector Indexed` counts.
  * Show the newly ingested items in the Evidence Table.

#### Part A: Image Tamper Localization, EXIF Intelligence & 3-Way Slider (1:00 – 1:20)
* **Action**:
  * In the Evidence Table, locate an image item (e.g. `CCTV_Vault_Entrance_01.jpg` or existing image).
  * Click **`👁️ Inspect`**.
  * **Showcase EXIF Forensic Card**: Point out Camera Hardware (`AXIS P3245-LVE`), Shutter Timestamps, and Crime Scene GPS Coordinates (`18.5204° N, 73.8567° E`) with `View on Map` link. If edited in Photoshop, point out the prominent red software manipulation alert!
  * Click **`🔬 Launch ELA & Tamper Radar`**.
  * Showcase:
    1. **Direct Red Tamper Localization Mask**: Pristine pixels remain natural while altered pixels glow in vivid red.
    2. **OpenCV Bounding Box**: Bounding box labeled **`ALTERED`** with coordinates.
    3. **3-Way Split-Screen Slider**: Drag the slider handle to compare Original Vault vs Red Tamper Highlight vs ELA Heatmap.
  * Close the ELA modal.
* **Script Anchor for AI**: *"While traditional SHA-256 fails blindly when a single pixel changes, LEXVAULT computer-vision models isolate exact altered regions with red tamper masks and OpenCV bounding boxes, while the EXIF parser flags post-capture editing software signatures."*

#### Part B: Word-Level Audio Scrubbing via `faster-whisper` (1:20 – 1:30)
* **Action**:
  * In the Evidence Table, locate the audio evidence (e.g. `Emergency_Radio_Dispatch_Call.wav` or `CASE-2026-SOUND1`).
  * Click **`👁️ Inspect`** $\rightarrow$ **`🎙️ Audio Transcript & Word-Level Forensics`**.
  * Click **Play** on the audio player.
  * Click directly on any word in the transcript text below — show the playback cursor immediately jump to that millisecond timestamp.
  * Close the audio modal.
* **Script Anchor for AI**: *"For emergency dispatch and bodycam audio, faster-whisper provides 100% on-premise word-level playback scrubbing with zero cloud exposure."*

#### Part C: Document PDF Differential Engine (1:30 – 1:40)
* **Action**:
  * In the Evidence Table, click **`👁️ Inspect`** on a PDF document (`Forensic_Case_Report_CR902.pdf`).
  * Show the extracted text diff panel with green added clauses (`+`) and red deleted clauses (`-`).
  * Close the Inspector.

---

### ⏱️ SECTION 4: Custody Handoff & Statutory Section 65B Dossier (1:40 – 2:05)
* **Screen View**: Evidence Table $\rightarrow$ Custody Timeline & Certificate.

#### Step 4.1: Live Custody Handoff on MST Mainnet
* **Action**:
  * Click the cyan **`🔗 Custody`** button on any evidence row.
  * In the Chain of Custody Timeline, click **`Transfer Custody`**.
  * Enter Target Custodian: `Forensic Science Laboratory - Digital Unit`.
  * Click **`Submit Custody Transfer`** (enter PIN `1001` if prompted).
  * Watch the transaction broadcast live to MST Mainnet and the new milestone card appear in the timeline with a clickable **`MST Chain TX`** link to `mstscan.com`.
* **Script Anchor for AI**: *"Custody transfers execute decentralized smart contract state transitions, establishing an unbroken, courtroom-auditable chain of custody."*

#### Step 4.2: Export Section 65B Court Dossier PDF
* **Action**:
  * Click **`👁️ Inspect`** $\rightarrow$ **`📜 Generate Court Certificate (Section 65B PDF)`**.
  * Prompted for Auditor role: Click chip **`Court Auditor: 3003`** and click Unlock.
  * The official PDF immediately downloads and opens in the browser.
  * Scroll down to show:
    * **`ON-CHAIN CRYPTOGRAPHIC PROOF (MST BLOCKCHAIN)`**.
    * High-resolution dynamic verification QR code linking directly to MSTScan block explorer.
* **Script Anchor for AI**: *"Court Auditors can instantly export Section 65B dossiers featuring dynamic QR codes that link physical paper evidence binders directly to on-chain transaction receipts."*

---

### ⏱️ SECTION 5: Verification Dropzone: Tamper Radar (2:05 – 2:35)
* **Screen View**: Tab `[04] Verification Dropzone`.

#### Step 5.1: Drag & Drop Tampered Image Derivative
* **Action**:
  * Click on Tab **`[04] Verification Dropzone`**.
  * Drag and drop `demo_evidence/02_TAMPERED/CCTV_Vault_Entrance_01_TAMPERED.jpg` into the dropzone.
* **What to Show**:
  * Watch the client-side WebCrypto SHA-256 progress bar animate.
  * Watch the **Red `REGISTERED VAULT RECORD — INTEGRITY BREACH DETECTED`** card trigger!
  * Point out:
    * **Perceptual pHash Match**: Identifies parent record `CCTV Vault Entrance 01` in `CASE-2026-CR902`.
    * **Tamper Localization**: The red pixel overlay highlighting the exact altered region on the vault door with OpenCV box labeled **`ALTERED`**!
* **Script Anchor for AI**: *"When a tampered derivative is dropped, LEXVAULT matches the perceptual DCT pHash of the authentic vault record, exposes the bitstream divergence, and overlays the exact altered pixels in vivid red."*

#### Step 5.2: Drag & Drop Tampered Document Derivative
* **Action**:
  * Drag and drop `demo_evidence/02_TAMPERED/Forensic_Case_Report_CR902_TAMPERED.pdf` into the dropzone.
* **What to Show**:
  * Instant **Red Integrity Breach** card.
  * Side-by-side text diff highlighting unauthorized clause modifications (altered dates, license plate change to DL01-XY-9999, and redacted signatures).
* **Script Anchor for AI**: *"Document differentials instantly expose clause manipulations against baseline on-chain archives."*

---

### ⏱️ SECTION 6: Ingestion Tamper Interception (Tamper Alert) (2:35 – 3:00)
* **Screen View**: Tab `[03] Ingestion & WORM Lock` $\rightarrow$ `[01] Repository & AI Search`.

#### Step 6.1: Attempt to Ingest the Tampered File
* **Action**:
  * Click Tab **`[03] Ingestion & WORM Lock`**.
  * Case Number: `CASE-2026-CR902`.
  * Drag and drop the tampered file: `demo_evidence/02_TAMPERED/CCTV_Vault_Entrance_01_TAMPERED.jpg`.
  * Click **`🚀 Ingest & Anchor Evidence to Ledger`**.
* **What to Show**:
  * **Stage 01 Pre-check Alert**:
    * The system immediately detects:
      `<AlertTriangle /> Derivative of "CCTV Vault Entrance 01" (Tamper Alert)`!
  * Watch it complete upload and anchor:
    * The status badge turns into a bold crimson warning:
      **`<AlertTriangle /> ANCHORED (TAMPER ALERT)`**!

#### Step 6.2: Final Repository Proof & Closing Hero Shot
* **Action**:
  * Click Tab **`[01] Repository & AI Search`**.
  * Point out:
    * The **`Tamper Alerts`** KPI card in the top strip has incremented!
    * In the Evidence Table, the item is permanently flagged with the glowing red badge: **`🔴 TAMPERED`**.
    * Click `👁️ Inspect` on it to show that the system has permanently preserved it with an unalterable forensic record of the tamper incident for court audit!
* **Script Anchor for AI**: *"Even if an adversary attempts to re-ingest a tampered derivative, LEXVAULT's intake filter intercepts the breach, flags the anomaly, and anchors an immutable tamper alert on the blockchain. Turning digital evidence into courtroom-unassailable truth. Powered by MST Blockchain."*

---

## 🎙️ Video Audio Script Prompt Template (Copy-Paste for Claude / Gemini)

Once you finish recording your screen, prompt your LLM with:

```markdown
I have recorded a 3-minute screen recording of my project LEXVAULT based on the attached videodemo.md walkthrough.

Please generate a high-impact, professional, confident voiceover script formatted with exact timestamp cues [0:00], [0:15], etc., matching the 3-minute video duration. The tone should be authoritative, cyber-forensic, and enterprise-grade, highlighting our integration with MST Blockchain (Chain ID 4646), MinIO WORM storage, OpenCV Red Tamper Localization, faster-whisper audio scrubbing, Section 65B court dossiers, and real-time Ingestion Tamper Interception.
```

---

## 🏆 Checklist for Demo Day Success
- [x] **MST Mainnet Live**: Telemetry shows `MST MAINNET LIVE` on Chain `4646`.
- [x] **New Ingestion Demonstrated**: Authentic PDF, JPG, and WAV ingested live.
- [x] **Dropzone Tamper Radar Demonstrated**: Tampered image and document flagged with red localization and diffs.
- [x] **Ingestion Tamper Interception Demonstrated**: Re-ingesting tampered file triggers `Derivative of...` alert and anchors with `ANCHORED (TAMPER ALERT)`.
- [x] **Role Access Demonstrated**: Investigator (`1001`), Analyst (`2002`), Auditor (`3003`).
- [x] **Section 65B PDF Shown**: High-res QR code linking to on-chain MSTScan block.
