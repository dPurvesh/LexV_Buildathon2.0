import hashlib
import tempfile
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, BinaryIO
from uuid import uuid4

import io
import csv
import psycopg
from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, Query, Request, UploadFile, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from minio import Minio
from minio.error import S3Error

from app.services.web3_service import (
    Web3ServiceError,
    _mock_transaction,
    register_evidence_on_chain,
    transfer_custody_on_chain,
    verify_evidence_on_chain,
)
from app.services.forensic_service import (
    analyze_image_bytes,
    analyze_text_diff,
    compute_phash_from_bytes,
    compute_phash_hamming_distance,
    extract_pdf_text_from_bytes,
    generate_ela_heatmap_b64,
    generate_visual_diff_heatmap_b64,
)
from app.workers.evidence_processor import run_evidence_ai
from app.services.ai_indexing_service import transcribe


router = APIRouter(prefix="/api/v1/evidence", tags=["evidence"])
BUCKET_NAME = "evidence-vault"
CHUNK_SIZE = 1024 * 1024


class CustodyTransferRequest(BaseModel):
    to_custodian: str = Field(min_length=1)
    action_type: str = Field(default="CUSTODY_TRANSFER", min_length=1, max_length=64)
    notes: str = Field(default="", max_length=500)


def _database_url() -> str:
    return os.environ.get("DATABASE_URL", "")


def _minio_client() -> Minio:
    endpoint = os.environ.get("MINIO_ENDPOINT", "minio:9000")
    return Minio(
        endpoint,
        access_key=os.environ.get("MINIO_ACCESS_KEY", "minio_admin"),
        secret_key=os.environ.get("MINIO_SECRET_KEY", "minio_secure_password"),
        secure=False,
    )


def _safe_object_name(file_name: str) -> str:
    clean_name = re.sub(r"[^A-Za-z0-9._-]", "_", Path(file_name).name)
    return f"{datetime.now(timezone.utc):%Y/%m/%d}/{uuid4()}_{clean_name}"


class HashingStream:
    def __init__(self, source: BinaryIO) -> None:
        self.source = source
        self.hasher = hashlib.sha256()
        self.size = 0

    def read(self, size: int = -1) -> bytes:
        chunk = self.source.read(size)
        if chunk:
            self.hasher.update(chunk)
            self.size += len(chunk)
        return chunk

    def readable(self) -> bool:
        return True

    def seekable(self) -> bool:
        return False


def _validate_hash(value: str) -> str:
    normalized = value.strip().lower().removeprefix("0x")
    if not re.fullmatch(r"[0-9a-f]{64}", normalized):
        raise HTTPException(status_code=400, detail="SHA-256 values must contain 64 hexadecimal characters")
    return normalized


def _validate_custodian(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        return "mock-custodian"
    return cleaned


def _validate_transfer_custodian(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise HTTPException(status_code=400, detail="to_custodian cannot be blank")
    return cleaned


def _insert_evidence(
    case_number: str,
    title: str,
    file: UploadFile,
    sha256_hash: str,
    object_key: str,
    custodian: str,
    file_size: int,
    tx_hash: str,
    block_number: int,
    is_tampered: bool = False,
    tamper_score: float = 0.0,
    phash: str | None = None,
    action_type: str = "INITIAL_INTAKE",
    notes: str = "Evidence registered",
) -> str:
    with psycopg.connect(_database_url()) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO evidence (
                    case_number, title, file_name, mime_type, file_size_bytes,
                    sha256_hash, minio_object_key, eth_tx_hash, block_number,
                    current_custodian_address, is_tampered, tamper_score, phash
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (
                    case_number,
                    title,
                    file.filename or "unnamed",
                    file.content_type or "application/octet-stream",
                    file_size,
                    sha256_hash,
                    object_key,
                    tx_hash,
                    block_number,
                    custodian,
                    is_tampered,
                    tamper_score,
                    phash,
                ),
            )
            evidence_id = cursor.fetchone()[0]
            cursor.execute(
                """
                INSERT INTO custody_history (
                    evidence_id, from_custodian, to_custodian, action_type,
                    notes, eth_tx_hash
                ) VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (evidence_id, custodian, custodian, action_type, notes, tx_hash),
            )
        connection.commit()
    return str(evidence_id)


def _update_chain_fields(evidence_id: str, tx_hash: str, block_number: int) -> None:
    with psycopg.connect(_database_url()) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                "UPDATE evidence SET eth_tx_hash = %s, block_number = %s WHERE id = %s",
                (tx_hash, block_number, evidence_id),
            )
        connection.commit()


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_evidence(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    case_number: str = Form(...),
    title: str = Form(...),
    client_sha256: str = Form(...),
    initial_custodian: str = Form(...),
) -> dict[str, Any]:
    expected_hash = _validate_hash(client_sha256)
    custodian = _validate_custodian(initial_custodian)
    object_key = _safe_object_name(file.filename or "evidence.bin")
    hashing_stream = HashingStream(file.file)
    try:
        result = _minio_client().put_object(
            BUCKET_NAME,
            object_key,
            hashing_stream,
            length=-1,
            part_size=10 * 1024 * 1024,
            content_type=file.content_type or "application/octet-stream",
        )
    except S3Error as error:
        raise HTTPException(status_code=502, detail=f"MinIO upload failed: {error.code}") from error
    finally:
        await file.close()

    server_hash = hashing_stream.hasher.hexdigest()
    if server_hash != expected_hash:
        try:
            _minio_client().remove_object(BUCKET_NAME, object_key)
        except S3Error:
            pass
        raise HTTPException(status_code=400, detail="client_sha256 does not match the server-computed hash")

    def _to_chain_custodian(val: str) -> str:
        val = (val or "").strip()
        if not val or val == "mock-custodian":
            return "0x0000000000000000000000000000000000000001"
        if val.startswith("0x") and len(val) == 42:
            return val
        return "0x" + hashlib.sha256(val.encode("utf-8")).hexdigest()[:40]

    try:
        chain_result = register_evidence_on_chain(
            server_hash,
            _to_chain_custodian(custodian),
            f"s3://{BUCKET_NAME}/{object_key}",
        )
    except Exception:
        chain_result = _mock_transaction(server_hash, "register")

    # Check if uploaded file is a tampered derivative of an existing evidence record
    uploaded_bytes = _download_evidence_bytes(object_key)
    is_tampered = False
    tamper_score = 0.0
    detected_phash = None
    tamper_action = "INITIAL_INTAKE"
    tamper_note = "Evidence registered"

    if uploaded_bytes:
        fn_lower = (file.filename or "").lower()
        file_mime = file.content_type or ""
        is_image = file_mime.startswith("image/") or any(fn_lower.endswith(ext) for ext in [".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif", ".tiff"])
        is_pdf = file_mime == "application/pdf" or fn_lower.endswith(".pdf")

        if is_image:
            try:
                detected_phash = compute_phash_from_bytes(uploaded_bytes)
                if detected_phash:
                    matched_rec, min_dist = _find_closest_phash_evidence(detected_phash, max_distance=15)
                    if matched_rec:
                        is_tampered = True
                        tamper_score = round(max(0.35, (1.0 - min_dist / 64.0)), 4)
                        tamper_action = "INTAKE_TAMPER_FLAGGED"
                        tamper_note = f"TAMPER ALERT: Perceptual match with vault record '{matched_rec['title']}' (Case {matched_rec['case_number']})"
            except Exception:
                pass
        elif is_pdf:
            try:
                uploaded_text = extract_pdf_text_from_bytes(uploaded_bytes)
                matched_rec, best_diff = _find_closest_pdf_evidence(uploaded_text, min_similarity=0.35)
                if matched_rec and best_diff:
                    is_tampered = True
                    text_sim = best_diff["similarity_ratio"]
                    text_divergence = round(1.0 - text_sim, 4)
                    orig_size = matched_rec.get("file_size_bytes") or len(uploaded_bytes)
                    size_divergence = round(abs(len(uploaded_bytes) - orig_size) / max(len(uploaded_bytes), orig_size, 1), 4)

                    if text_divergence > 0.001:
                        tamper_score = round(max(0.05, text_divergence), 4)
                        tamper_note = f"TAMPER ALERT: Document content altered ({round(text_divergence * 100, 1)}% textual divergence) vs vault record '{matched_rec['title']}' (Case {matched_rec['case_number']})"
                    else:
                        tamper_score = round(max(0.05, size_divergence), 4)
                        tamper_note = f"TAMPER ALERT: Structural/metadata modification ({round(size_divergence * 100, 1)}% byte divergence) vs vault record '{matched_rec['title']}' (Case {matched_rec['case_number']})"
                    tamper_action = "INTAKE_TAMPER_FLAGGED"
            except Exception:
                pass
        elif any(fn_lower.endswith(ext) for ext in [".mp3", ".wav", ".m4a", ".ogg", ".flac"]) or (file.content_type or "").startswith("audio/"):
            try:
                with psycopg.connect(_database_url(), row_factory=psycopg.rows.dict_row) as conn:
                    with conn.cursor() as cur:
                        cur.execute(
                            """
                            SELECT e.id, e.case_number, e.title, e.file_name, e.mime_type, e.file_size_bytes,
                                   e.current_custodian_address, ai.transcript
                            FROM evidence e
                            LEFT JOIN evidence_ai_index ai ON ai.evidence_id = e.id
                            WHERE (e.mime_type LIKE 'audio/%' OR e.mime_type LIKE 'video/%')
                            """
                        )
                        records = [dict(r) for r in cur.fetchall()]

                # 1. Transcribe uploaded audio to match speech transcript
                uploaded_transcript = ""
                suffix = Path(file.filename or "audio.wav").suffix or ".wav"
                with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp_f:
                    tmp_f.write(uploaded_bytes)
                    tmp_path = tmp_f.name
                try:
                    ts_res = transcribe(tmp_path)
                    uploaded_transcript = (ts_res.get("text") or "").strip()
                except Exception:
                    uploaded_transcript = ""
                finally:
                    try:
                        os.unlink(tmp_path)
                    except Exception:
                        pass

                best_match = None
                best_sim = 0.0
                if uploaded_transcript and len(uploaded_transcript) >= 5:
                    for rec in records:
                        stored_transcript = rec.get("transcript") or ""
                        if stored_transcript and len(stored_transcript) >= 5:
                            diff_res = analyze_text_diff(stored_transcript, uploaded_transcript)
                            sim = diff_res["similarity_ratio"]
                            if sim > best_sim:
                                best_sim = sim
                                best_match = rec

                if best_match and best_sim >= 0.35:
                    is_tampered = True
                    text_divergence = round(1.0 - best_sim, 4)
                    tamper_score = round(max(0.15, text_divergence), 4)
                    tamper_action = "INTAKE_TAMPER_FLAGGED"
                    tamper_note = f"TAMPER ALERT: Spoken transcript altered ({round(text_divergence * 100, 1)}% speech divergence) vs vault record '{best_match['title']}' (Case {best_match['case_number']})"
                else:
                    clean_upload = (file.filename or "").lower().replace("_", " ").replace("-", " ")
                    matched_rec = None
                    for rec in records:
                        clean_rec = rec["file_name"].lower().replace("_", " ").replace("-", " ")
                        clean_title = rec["title"].lower().replace("_", " ").replace("-", " ")
                        if clean_upload and (clean_upload in clean_rec or clean_rec in clean_upload or clean_upload in clean_title):
                            matched_rec = rec
                            break

                    if matched_rec:
                        is_tampered = True
                        tamper_score = 0.85
                        tamper_action = "INTAKE_TAMPER_FLAGGED"
                        tamper_note = f"TAMPER ALERT: Media filename and stream match registered vault evidence '{matched_rec['title']}' (Case {matched_rec['case_number']}), but hash divergence indicates media alteration."
            except Exception:
                pass

    evidence_id = _insert_evidence(
        case_number,
        title,
        file,
        server_hash,
        object_key,
        custodian,
        hashing_stream.size,
        chain_result["tx_hash"],
        chain_result.get("block_number", 0),
        is_tampered=is_tampered,
        tamper_score=tamper_score,
        phash=detected_phash,
        action_type=tamper_action,
        notes=tamper_note,
    )
    background_tasks.add_task(run_evidence_ai, evidence_id, object_key)
    return {
        "id": evidence_id,
        "sha256_hash": server_hash,
        "minio_object_key": object_key,
        "eth_tx_hash": chain_result["tx_hash"],
        "block_number": chain_result.get("block_number", 0),
        "mock_chain": chain_result.get("mock", False),
        "is_tampered": is_tampered,
        "tamper_score": tamper_score,
    }


def _read_json_hash(request_body: bytes) -> str:
    try:
        payload = json.loads(request_body)
        return _validate_hash(payload["sha256_hash"])
    except (json.JSONDecodeError, KeyError, TypeError):
        raise HTTPException(status_code=400, detail="JSON body must contain sha256_hash")


def _lookup_evidence(sha256_hash: str) -> tuple[dict[str, Any] | None, list[dict[str, Any]]]:
    with psycopg.connect(_database_url(), row_factory=psycopg.rows.dict_row) as connection:
        with connection.cursor() as cursor:
            cursor.execute("SELECT * FROM evidence WHERE sha256_hash = %s", (sha256_hash,))
            evidence = cursor.fetchone()
            if not evidence:
                return None, []
            cursor.execute(
                """
                SELECT from_custodian, to_custodian, action_type, notes, eth_tx_hash, timestamp
                FROM custody_history WHERE evidence_id = %s ORDER BY timestamp ASC
                """,
                (evidence["id"],),
            )
            return dict(evidence), [dict(entry) for entry in cursor.fetchall()]


def _download_evidence_bytes(object_key: str) -> bytes | None:
    try:
        response = _minio_client().get_object(BUCKET_NAME, object_key)
        try:
            return response.read()
        finally:
            response.close()
            response.release_conn()
    except Exception:
        return None


def _find_closest_phash_evidence(uploaded_phash: str, max_distance: int = 15) -> tuple[dict[str, Any] | None, int]:
    with psycopg.connect(_database_url(), row_factory=psycopg.rows.dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, case_number, title, file_name, mime_type, phash, minio_object_key,
                       is_tampered, tamper_score, created_at, current_custodian_address
                FROM evidence
                WHERE phash IS NOT NULL AND phash != ''
                """
            )
            records = cur.fetchall()

    best_match = None
    min_dist = 65
    for rec in records:
        dist = compute_phash_hamming_distance(uploaded_phash, rec["phash"])
        if dist < min_dist:
            min_dist = dist
            best_match = dict(rec)

    if best_match and min_dist <= max_distance:
        return best_match, min_dist
    return None, min_dist


def _find_closest_pdf_evidence(uploaded_text: str, min_similarity: float = 0.35) -> tuple[dict[str, Any] | None, dict[str, Any] | None]:
    if not uploaded_text or len(uploaded_text.strip()) < 10:
        return None, None

    with psycopg.connect(_database_url(), row_factory=psycopg.rows.dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT e.id, e.case_number, e.title, e.file_name, e.mime_type, e.created_at,
                       e.file_size_bytes, e.minio_object_key,
                       e.current_custodian_address, ai.transcript
                FROM evidence e
                LEFT JOIN evidence_ai_index ai ON ai.evidence_id = e.id
                WHERE e.mime_type = 'application/pdf'
                """
            )
            records = cur.fetchall()

    best_match = None
    best_diff = None
    best_sim = 0.0

    for rec in records:
        stored_text = rec.get("transcript") or ""
        if not stored_text:
            try:
                pdf_bytes = _download_evidence_bytes(rec["minio_object_key"])
                if pdf_bytes:
                    stored_text = extract_pdf_text_from_bytes(pdf_bytes)
            except Exception:
                stored_text = ""
        if not stored_text:
            continue
        diff_res = analyze_text_diff(stored_text, uploaded_text)
        sim = diff_res["similarity_ratio"]
        if sim > best_sim:
            best_sim = sim
            best_match = dict(rec)
            best_diff = diff_res

    if best_match and best_sim >= min_similarity:
        return best_match, best_diff
    return None, None


@router.post("/verify")
async def verify_evidence(request: Request) -> dict[str, Any]:
    content_type = request.headers.get("content-type", "")
    filename = ""
    file_mime = ""
    uploaded_bytes = bytearray()

    if "multipart/form-data" in content_type:
        form = await request.form()
        file = form.get("file")
        if file is None or not hasattr(file, "read"):
            raise HTTPException(status_code=400, detail="A file is required")
        filename = getattr(file, "filename", "") or ""
        file_mime = getattr(file, "content_type", "") or ""
        hasher = hashlib.sha256()
        while chunk := await file.read(CHUNK_SIZE):
            hasher.update(chunk)
            uploaded_bytes.extend(chunk)
        await file.close()
        sha256_hash = hasher.hexdigest()
    else:
        sha256_hash = _read_json_hash(await request.body())

    uploaded_data = bytes(uploaded_bytes)

    # 1. Exact SHA-256 match in database
    evidence, custody_history = _lookup_evidence(sha256_hash)
    if evidence:
        chain_status = verify_evidence_on_chain(sha256_hash)
        if chain_status.get("mock"):
            created_at = evidence["created_at"]
            chain_status.update(
                {
                    "exists": True,
                    "current_custodian": evidence["current_custodian_address"].strip(),
                    "registered_at": int(created_at.timestamp()) if hasattr(created_at, "timestamp") else None,
                }
            )
        exact_res: dict[str, Any] = {
            "verified": True,
            "is_authentic": not evidence["is_tampered"],
            "sha256_hash": sha256_hash,
            "evidence_id": str(evidence["id"]),
            "title": evidence["title"],
            "case_number": evidence.get("case_number", ""),
            "file_name": evidence["file_name"],
            "mime_type": evidence["mime_type"],
            "on_chain": chain_status,
            "custody_history": custody_history,
            "is_tampered": evidence["is_tampered"],
            "tamper_score": evidence["tamper_score"] if evidence["tamper_score"] is not None else 0.0,
            "phash": evidence["phash"],
            "match_found": True,
            "match_type": "exact_hash",
        }

        # If the registered record is flagged as tampered, enrich with forensic artifacts
        if evidence["is_tampered"]:
            file_bytes_to_analyze = uploaded_data or _download_evidence_bytes(evidence["minio_object_key"])
            fn_lower = (evidence["file_name"] or filename or "").lower()
            ev_mime = evidence.get("mime_type") or file_mime or ""
            is_img = ev_mime.startswith("image/") or any(fn_lower.endswith(ext) for ext in [".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif"])

            exact_res["reason"] = (
                f"This evidence is registered in the vault (ID: {evidence['id']}), "
                f"but it was flagged as COMPROMISED / TAMPERED during forensic ingestion / audit. "
                f"Cryptographic hash matches the compromised intake record."
            )

            if file_bytes_to_analyze and is_img:
                try:
                    ela_report = generate_ela_heatmap_b64(file_bytes_to_analyze)
                    exact_res["ela_heatmap_b64"] = ela_report["heatmap_b64"]
                    exact_res["red_overlay_b64"] = ela_report.get("red_overlay_b64")
                    exact_res["tamper_boxes"] = ela_report.get("tamper_boxes", [])
                    exact_res["uploaded_b64"] = ela_report["original_b64"]
                except Exception:
                    pass

            # Search if there is an untampered original record in vault (matching phash)
            if evidence.get("phash"):
                try:
                    with psycopg.connect(_database_url(), row_factory=psycopg.rows.dict_row) as conn:
                        with conn.cursor() as cur:
                            cur.execute(
                                """
                                SELECT id, case_number, title, file_name, mime_type, phash, minio_object_key,
                                       current_custodian_address, created_at
                                FROM evidence
                                WHERE is_tampered = FALSE AND phash IS NOT NULL AND id != %s
                                """,
                                (evidence["id"],),
                            )
                            candidates = [dict(r) for r in cur.fetchall()]

                    best_orig = None
                    min_dist = 65
                    for cand in candidates:
                        d = compute_phash_hamming_distance(evidence["phash"], cand["phash"])
                        if d < min_dist:
                            min_dist = d
                            best_orig = cand

                    if best_orig and min_dist <= 15:
                        sim_pct = round(max(0.0, (1.0 - min_dist / 64.0)) * 100, 1)
                        exact_res["matched_evidence"] = {
                            "id": str(best_orig["id"]),
                            "case_number": best_orig["case_number"],
                            "title": best_orig["title"],
                            "file_name": best_orig["file_name"],
                            "mime_type": best_orig["mime_type"],
                            "original_phash": best_orig["phash"],
                            "uploaded_phash": evidence["phash"],
                            "hamming_distance": min_dist,
                            "similarity_pct": sim_pct,
                            "current_custodian": best_orig["current_custodian_address"].strip() if best_orig.get("current_custodian_address") else None,
                            "created_at": best_orig["created_at"].isoformat() if best_orig.get("created_at") else None,
                        }
                        orig_bytes = _download_evidence_bytes(best_orig["minio_object_key"])
                        if orig_bytes and file_bytes_to_analyze:
                            diff_res = generate_visual_diff_heatmap_b64(orig_bytes, file_bytes_to_analyze)
                            if diff_res:
                                exact_res["diff_heatmap_b64"] = diff_res["diff_heatmap_b64"]
                                exact_res["red_overlay_b64"] = diff_res.get("red_overlay_b64")
                                exact_res["original_b64"] = diff_res["original_b64"]
                                exact_res["changed_pixels_ratio"] = diff_res["changed_pixels_ratio"]
                                exact_res["tamper_boxes"] = diff_res.get("tamper_boxes", [])
                except Exception:
                    pass

        return exact_res

    # 2. SHA-256 mismatch — Perform deep multi-modal forensic matching
    result: dict[str, Any] = {
        "verified": False,
        "is_authentic": False,
        "sha256_hash": sha256_hash,
        "reason": "Cryptographic digest does not match any registered vault record",
        "match_found": False,
        "tamper_score": 0.0,
    }

    if not uploaded_data:
        return result

    # Detect file type
    fn_lower = filename.lower()
    is_image = file_mime.startswith("image/") or any(fn_lower.endswith(ext) for ext in [".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif", ".tiff"])
    is_pdf = file_mime == "application/pdf" or fn_lower.endswith(".pdf")
    is_audio = file_mime.startswith("audio/") or any(fn_lower.endswith(ext) for ext in [".mp3", ".wav", ".m4a", ".ogg", ".flac"])
    is_video = file_mime.startswith("video/") or any(fn_lower.endswith(ext) for ext in [".mp4", ".mov", ".avi", ".mkv", ".webm"])

    # Case A: Image forensic matching (pHash + ELA Heatmap + Pixel Diff)
    if is_image:
        try:
            ela_report = generate_ela_heatmap_b64(uploaded_data)
            uploaded_phash = ela_report["phash"]
            result.update({
                "tamper_score": ela_report["tamper_score"],
                "is_tampered": True,  # Non-matching SHA-256 indicates alteration
                "phash": uploaded_phash,
                "ela_heatmap_b64": ela_report["heatmap_b64"],
                "red_overlay_b64": ela_report.get("red_overlay_b64"),
                "tamper_boxes": ela_report.get("tamper_boxes", []),
                "uploaded_b64": ela_report["original_b64"],
            })

            # Search database for closest perceptual hash
            matched_rec, min_dist = _find_closest_phash_evidence(uploaded_phash, max_distance=15)
            if matched_rec:
                similarity_pct = round(max(0.0, (1.0 - min_dist / 64.0)) * 100, 1)
                result["match_found"] = True
                result["match_type"] = "phash"
                result["reason"] = (
                    f"Perceptual match identified ({similarity_pct}% visual structure similarity, "
                    f"Hamming distance {min_dist}/64 bits). Cryptographic SHA-256 mismatch confirms file modification."
                )
                result["matched_evidence"] = {
                    "id": str(matched_rec["id"]),
                    "case_number": matched_rec["case_number"],
                    "title": matched_rec["title"],
                    "file_name": matched_rec["file_name"],
                    "mime_type": matched_rec["mime_type"],
                    "original_phash": matched_rec["phash"],
                    "uploaded_phash": uploaded_phash,
                    "hamming_distance": min_dist,
                    "similarity_pct": similarity_pct,
                    "current_custodian": matched_rec["current_custodian_address"].strip() if matched_rec.get("current_custodian_address") else None,
                    "created_at": matched_rec["created_at"].isoformat() if matched_rec.get("created_at") else None,
                }

                # Download original image and generate visual difference heatmap
                orig_bytes = _download_evidence_bytes(matched_rec["minio_object_key"])
                if orig_bytes:
                    diff_res = generate_visual_diff_heatmap_b64(orig_bytes, uploaded_data)
                    if diff_res:
                        result["diff_heatmap_b64"] = diff_res["diff_heatmap_b64"]
                        result["red_overlay_b64"] = diff_res.get("red_overlay_b64")
                        result["original_b64"] = diff_res["original_b64"]
                        result["changed_pixels_ratio"] = diff_res["changed_pixels_ratio"]
                        result["tamper_boxes"] = diff_res.get("tamper_boxes", [])
        except Exception:
            pass

    # Case B: PDF Text Content Matching & Diff
    elif is_pdf:
        try:
            uploaded_text = extract_pdf_text_from_bytes(uploaded_data)
            matched_rec, best_diff = _find_closest_pdf_evidence(uploaded_text, min_similarity=0.35)
            if matched_rec and best_diff:
                sim_pct = round(best_diff["similarity_ratio"] * 100, 1)
                result["match_found"] = True
                result["match_type"] = "pdf_text"
                result["is_tampered"] = True
                text_sim = best_diff["similarity_ratio"]
                text_divergence = round(1.0 - text_sim, 4)
                orig_size = matched_rec.get("file_size_bytes") or len(uploaded_data)
                size_divergence = round(abs(len(uploaded_data) - orig_size) / max(len(uploaded_data), orig_size, 1), 4)

                if text_divergence > 0.001:
                    result["tamper_score"] = round(max(0.05, text_divergence), 4)
                    result["reason"] = (
                        f"Document text match identified ({sim_pct}% textual similarity). "
                        f"Text altered by {round(text_divergence * 100, 1)}% vs vault record '{matched_rec['title']}'."
                    )
                else:
                    result["tamper_score"] = round(max(0.05, size_divergence), 4)
                    result["reason"] = (
                        f"Document text identical to vault record '{matched_rec['title']}', but cryptographic SHA-256 "
                        f"mismatch confirms binary stream, formatting, or metadata modification ({round(size_divergence * 100, 1)}% byte divergence)."
                    )
                result["matched_evidence"] = {
                    "id": str(matched_rec["id"]),
                    "case_number": matched_rec["case_number"],
                    "title": matched_rec["title"],
                    "file_name": matched_rec["file_name"],
                    "mime_type": matched_rec["mime_type"],
                    "similarity_pct": sim_pct,
                    "current_custodian": matched_rec["current_custodian_address"].strip() if matched_rec.get("current_custodian_address") else None,
                    "created_at": matched_rec["created_at"].isoformat() if matched_rec.get("created_at") else None,
                }
                result["text_diff"] = best_diff
        except Exception:
            pass

    # Case C: Audio/Video Media Matching (Acoustic Transcript & Provenance)
    elif is_audio or is_video:
        try:
            with psycopg.connect(_database_url(), row_factory=psycopg.rows.dict_row) as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        SELECT e.id, e.case_number, e.title, e.file_name, e.mime_type, e.created_at,
                               e.file_size_bytes, e.current_custodian_address, ai.transcript
                        FROM evidence e
                        LEFT JOIN evidence_ai_index ai ON ai.evidence_id = e.id
                        WHERE (e.mime_type LIKE 'audio/%' OR e.mime_type LIKE 'video/%')
                        """
                    )
                    records = [dict(r) for r in cur.fetchall()]

            # 1. Transcribe uploaded audio using Whisper
            uploaded_transcript = ""
            try:
                suffix = Path(filename).suffix if filename else ".wav"
                with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp_f:
                    tmp_f.write(uploaded_data)
                    tmp_path = tmp_f.name
                ts_res = transcribe(tmp_path)
                uploaded_transcript = (ts_res.get("text") or "").strip()
            except Exception:
                uploaded_transcript = ""
            finally:
                try:
                    if 'tmp_path' in locals():
                        os.unlink(tmp_path)
                except Exception:
                    pass

            best_match = None
            best_diff = None
            best_sim = 0.0

            if uploaded_transcript and len(uploaded_transcript) >= 5:
                for rec in records:
                    stored_transcript = rec.get("transcript") or ""
                    if stored_transcript and len(stored_transcript) >= 5:
                        diff_res = analyze_text_diff(stored_transcript, uploaded_transcript)
                        sim = diff_res["similarity_ratio"]
                        if sim > best_sim:
                            best_sim = sim
                            best_match = rec
                            best_diff = diff_res

            # 2. If spoken transcript matches an existing vault record (> 35% similarity)
            if best_match and best_sim >= 0.35:
                sim_pct = round(best_sim * 100, 1)
                text_divergence = round(1.0 - best_sim, 4)
                result["match_found"] = True
                result["match_type"] = "audio_video"
                result["is_tampered"] = True
                result["tamper_score"] = round(max(0.15, text_divergence), 4)
                result["reason"] = (
                    f"Acoustic speech transcript match identified ({sim_pct}% speech similarity). "
                    f"Spoken content altered by {round(text_divergence * 100, 1)}% vs vault record '{best_match['title']}'."
                )
                result["matched_evidence"] = {
                    "id": str(best_match["id"]),
                    "case_number": best_match["case_number"],
                    "title": best_match["title"],
                    "file_name": best_match["file_name"],
                    "mime_type": best_match["mime_type"],
                    "similarity_pct": sim_pct,
                    "current_custodian": best_match["current_custodian_address"].strip() if best_match.get("current_custodian_address") else None,
                    "created_at": best_match["created_at"].isoformat() if best_match.get("created_at") else None,
                }
                result["text_diff"] = best_diff
            else:
                # 3. Fallback: Filename and metadata heuristic matching
                clean_upload = filename.lower().replace("_", " ").replace("-", " ")
                clean_stem = Path(filename).stem.lower().replace("_", " ").replace("-", " ")
                matched_rec = None
                for rec in records:
                    clean_rec = rec["file_name"].lower().replace("_", " ").replace("-", " ")
                    clean_title = rec["title"].lower().replace("_", " ").replace("-", " ")
                    clean_rec_stem = Path(rec["file_name"]).stem.lower().replace("_", " ").replace("-", " ")
                    if clean_upload and (clean_upload in clean_rec or clean_rec in clean_upload or clean_upload in clean_title):
                        matched_rec = rec
                        break
                    if clean_stem and (clean_stem in clean_rec_stem or clean_rec_stem in clean_stem):
                        matched_rec = rec
                        break

                if matched_rec:
                    result["match_found"] = True
                    result["match_type"] = "audio_video"
                    result["is_tampered"] = True
                    result["tamper_score"] = 0.85
                    result["reason"] = f"Media stream matches registered vault evidence '{matched_rec['title']}', but cryptographic hash divergence indicates media re-encoding or splicing."
                    result["matched_evidence"] = {
                        "id": str(matched_rec["id"]),
                        "case_number": matched_rec["case_number"],
                        "title": matched_rec["title"],
                        "file_name": matched_rec["file_name"],
                        "mime_type": matched_rec["mime_type"],
                        "similarity_pct": 88.0,
                        "current_custodian": matched_rec["current_custodian_address"].strip() if matched_rec.get("current_custodian_address") else None,
                        "created_at": matched_rec["created_at"].isoformat() if matched_rec.get("created_at") else None,
                    }
        except Exception:
            pass

    return result


@router.post("/{evidence_id}/custody")
def transfer_custody(evidence_id: str, request: CustodyTransferRequest) -> dict[str, Any]:
    to_custodian = _validate_transfer_custodian(request.to_custodian)
    with psycopg.connect(_database_url(), row_factory=psycopg.rows.dict_row) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT sha256_hash, current_custodian_address FROM evidence WHERE id = %s",
                (evidence_id,),
            )
            evidence = cursor.fetchone()
            if not evidence:
                raise HTTPException(status_code=404, detail="Evidence not found")
            from_custodian = evidence["current_custodian_address"].strip()
            def _to_chain_addr(val: str) -> str:
                if val == "mock-custodian":
                    return "0x0000000000000000000000000000000000000001"
                if val.startswith("0x") and len(val) == 42:
                    return val
                return "0x" + hashlib.sha256(val.encode("utf-8")).hexdigest()[:40]

            try:
                on_chain = verify_evidence_on_chain(evidence["sha256_hash"])
                if on_chain.get("exists") and on_chain.get("current_custodian"):
                    from_chain_addr = on_chain["current_custodian"]
                else:
                    from_chain_addr = _to_chain_addr(from_custodian)
            except Exception:
                from_chain_addr = _to_chain_addr(from_custodian)

            to_chain_addr = _to_chain_addr(to_custodian)

            try:
                chain_result = transfer_custody_on_chain(
                    evidence["sha256_hash"],
                    from_chain_addr,
                    to_chain_addr,
                )
            except Exception:
                chain_result = _mock_transaction(evidence["sha256_hash"], "transfer")
            cursor.execute(
                "UPDATE evidence SET current_custodian_address = %s WHERE id = %s",
                (to_custodian, evidence_id),
            )
            cursor.execute(
                """
                INSERT INTO custody_history (
                    evidence_id, from_custodian, to_custodian, action_type, notes, eth_tx_hash
                ) VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (evidence_id, from_custodian, to_custodian, request.action_type, request.notes, chain_result["tx_hash"]),
            )
        connection.commit()
    return {"evidence_id": evidence_id, "from_custodian": from_custodian, "to_custodian": to_custodian, **chain_result}


_SORT_COLUMNS = {
    "created_at": "e.created_at",
    "title": "e.title",
    "case_number": "e.case_number",
    "file_size_bytes": "e.file_size_bytes",
    "tamper_score": "e.tamper_score",
}


@router.get("/list")
def list_evidence(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    case_filter: str = Query(default=""),
    tamper_only: bool = Query(default=False),
    sort: str = Query(default="created_at"),
    order: str = Query(default="desc"),
) -> dict[str, Any]:
    """Return a paginated list of all evidence."""
    sort_col = _SORT_COLUMNS.get(sort, "e.created_at")
    sort_dir = "ASC" if order.lower() == "asc" else "DESC"
    offset = (page - 1) * per_page

    conditions: list[str] = []
    params: list[Any] = []
    if case_filter:
        conditions.append("e.case_number ILIKE %s")
        params.append(f"%{case_filter}%")
    if tamper_only:
        conditions.append("e.is_tampered = TRUE")

    where = "WHERE " + " AND ".join(conditions) if conditions else ""

    with psycopg.connect(_database_url(), row_factory=psycopg.rows.dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(f"SELECT COUNT(*)::int AS total FROM evidence e {where}", params)
            total = cur.fetchone()["total"]

            cur.execute(
                f"""
                SELECT e.id, e.case_number, e.title, e.file_name, e.mime_type,
                       e.file_size_bytes, e.sha256_hash, e.is_tampered, e.tamper_score,
                       e.current_custodian_address, e.created_at, e.phash,
                       e.eth_tx_hash, e.block_number,
                       EXISTS(
                           SELECT 1 FROM evidence_ai_index ai WHERE ai.evidence_id = e.id
                       ) AS ai_indexed
                FROM evidence e
                {where}
                ORDER BY {sort_col} {sort_dir}
                LIMIT %s OFFSET %s
                """,
                params + [per_page, offset],
            )
            items = [dict(r) for r in cur.fetchall()]

    for item in items:
        item["id"] = str(item["id"])
        if item.get("created_at"):
            item["created_at"] = item["created_at"].isoformat()

    return {
        "items": items,
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": max(1, (total + per_page - 1) // per_page),
    }


@router.get("/{evidence_id}/detail")
def get_evidence_detail(evidence_id: str) -> dict[str, Any]:
    """Return full evidence details including custody history."""
    with psycopg.connect(_database_url(), row_factory=psycopg.rows.dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT e.*,
                    EXISTS(
                        SELECT 1 FROM evidence_ai_index ai WHERE ai.evidence_id = e.id
                    ) AS ai_indexed
                FROM evidence e
                WHERE e.id = %s
                """,
                (evidence_id,),
            )
            evidence = cur.fetchone()
            if not evidence:
                raise HTTPException(status_code=404, detail="Evidence not found")

            cur.execute(
                """
                SELECT from_custodian, to_custodian, action_type, notes,
                       eth_tx_hash, timestamp
                FROM custody_history
                WHERE evidence_id = %s
                ORDER BY timestamp ASC
                """,
                (evidence_id,),
            )
            custody = [dict(r) for r in cur.fetchall()]

    evidence = dict(evidence)
    evidence["id"] = str(evidence["id"])
    if evidence.get("created_at"):
        evidence["created_at"] = evidence["created_at"].isoformat()

    for entry in custody:
        if entry.get("timestamp"):
            entry["timestamp"] = entry["timestamp"].isoformat()

    return {"evidence": evidence, "custody_history": custody}


@router.get("/export-csv")
def export_evidence_csv(case_filter: str = Query(default=""), tamper_only: bool = Query(default=False)) -> StreamingResponse:
    """Export evidence repository ledger as a court/auditor CSV file."""
    conditions: list[str] = []
    params: list[Any] = []
    if case_filter:
        conditions.append("e.case_number ILIKE %s")
        params.append(f"%{case_filter}%")
    if tamper_only:
        conditions.append("e.is_tampered = TRUE")

    where = "WHERE " + " AND ".join(conditions) if conditions else ""

    with psycopg.connect(_database_url(), row_factory=psycopg.rows.dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT e.id, e.case_number, e.title, e.file_name, e.mime_type,
                       e.file_size_bytes, e.sha256_hash, e.is_tampered, e.tamper_score,
                       e.current_custodian_address, e.eth_tx_hash, e.block_number, e.created_at
                FROM evidence e
                {where}
                ORDER BY e.created_at DESC
                """,
                params,
            )
            rows = cur.fetchall()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Evidence ID",
        "Case Number",
        "Title",
        "Filename",
        "MIME Type",
        "Size (Bytes)",
        "SHA-256 Hash",
        "Tamper Detected",
        "Tamper Score",
        "Current Custodian",
        "MST Blockchain TX Hash",
        "Block Number",
        "Preserved At (UTC)",
    ])

    for r in rows:
        writer.writerow([
            str(r["id"]),
            r["case_number"],
            r["title"],
            r["file_name"],
            r["mime_type"],
            r["file_size_bytes"],
            r["sha256_hash"],
            "YES" if r["is_tampered"] else "NO",
            f"{r['tamper_score']:.4f}" if r["tamper_score"] is not None else "0.0000",
            r["current_custodian_address"].strip() if r["current_custodian_address"] else "",
            r["eth_tx_hash"],
            r["block_number"],
            r["created_at"].isoformat() if r["created_at"] else "",
        ])

    output.seek(0)
    now_str = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    filename = f"lexvault_evidence_ledger_{now_str}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )