import hashlib
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
    register_evidence_on_chain,
    transfer_custody_on_chain,
    verify_evidence_on_chain,
)
from app.services.forensic_service import analyze_image_bytes
from app.workers.evidence_processor import run_evidence_ai


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
) -> str:
    with psycopg.connect(_database_url()) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO evidence (
                    case_number, title, file_name, mime_type, file_size_bytes,
                    sha256_hash, minio_object_key, eth_tx_hash, block_number,
                    current_custodian_address
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
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
                ),
            )
            evidence_id = cursor.fetchone()[0]
            cursor.execute(
                """
                INSERT INTO custody_history (
                    evidence_id, from_custodian, to_custodian, action_type,
                    notes, eth_tx_hash
                ) VALUES (%s, %s, %s, 'INITIAL_INTAKE', %s, %s)
                """,
                (evidence_id, custodian, custodian, "Evidence registered", tx_hash),
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

    try:
        chain_result = register_evidence_on_chain(
            server_hash,
            custodian if custodian != "mock-custodian" else "0x0000000000000000000000000000000000000001",
            f"s3://{BUCKET_NAME}/{object_key}",
        )
    except (Web3ServiceError, ValueError) as error:
        raise HTTPException(status_code=503, detail=f"Blockchain anchoring failed: {error}") from error

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
    )
    background_tasks.add_task(run_evidence_ai, evidence_id, object_key)
    return {
        "id": evidence_id,
        "sha256_hash": server_hash,
        "minio_object_key": object_key,
        "eth_tx_hash": chain_result["tx_hash"],
        "block_number": chain_result.get("block_number", 0),
        "mock_chain": chain_result.get("mock", False),
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


@router.post("/verify")
async def verify_evidence(request: Request) -> dict[str, Any]:
    content_type = request.headers.get("content-type", "")
    if "multipart/form-data" in content_type:
        form = await request.form()
        file = form.get("file")
        if file is None or not hasattr(file, "read"):
            raise HTTPException(status_code=400, detail="A file is required")
        hasher = hashlib.sha256()
        uploaded_bytes = bytearray()
        while chunk := await file.read(CHUNK_SIZE):
            hasher.update(chunk)
            uploaded_bytes.extend(chunk)
        await file.close()
        sha256_hash = hasher.hexdigest()
    else:
        sha256_hash = _read_json_hash(await request.body())

    evidence, custody_history = _lookup_evidence(sha256_hash)
    if not evidence:
        result: dict[str, Any] = {
            "verified": False,
            "is_authentic": False,
            "sha256_hash": sha256_hash,
            "reason": "Evidence not found",
            "tamper_score": 0.0,
        }
        if "multipart/form-data" in content_type and hasattr(file, "content_type") and file.content_type.startswith("image/"):
            try:
                report = analyze_image_bytes(bytes(uploaded_bytes))
                result.update({"is_tampered": report["is_tampered"], "tamper_score": report["tamper_score"], "phash": report["phash"]})
            except Exception:
                pass
        return result

    chain_status = verify_evidence_on_chain(sha256_hash)
    if chain_status.get("mock"):
        created_at = evidence["created_at"]
        chain_status.update(
            {
                "exists": True,
                "current_custodian": evidence["current_custodian_address"].strip(),
                "registered_at": int(created_at.timestamp()),
            }
        )
    return {
        "verified": True,
        "is_authentic": not evidence["is_tampered"],
        "sha256_hash": sha256_hash,
        "evidence_id": str(evidence["id"]),
        "title": evidence["title"],
        "on_chain": chain_status,
        "custody_history": custody_history,
        "is_tampered": evidence["is_tampered"],
        "tamper_score": evidence["tamper_score"],
        "phash": evidence["phash"],
    }


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
                if val.startswith("0x") and len(val) == 42:
                    return val
                return "0x" + hashlib.sha256(val.encode("utf-8")).hexdigest()[:40]

            chain_result = transfer_custody_on_chain(
                evidence["sha256_hash"],
                _to_chain_addr(from_custodian),
                _to_chain_addr(to_custodian),
            )
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
        "Ethereum TX Hash",
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