import os
from datetime import datetime, timedelta, timezone
from typing import Literal
from urllib.parse import quote

import psycopg
from fastapi import APIRouter, HTTPException, Query
from minio import Minio
from minio.error import S3Error


router = APIRouter(prefix="/api/v1/evidence", tags=["sharing"])
BUCKET_NAME = "evidence-vault"


def _database_url() -> str:
    return os.environ.get("DATABASE_URL", "")


def _presign_client() -> Minio:
    endpoint = os.environ.get("MINIO_PUBLIC_ENDPOINT", "localhost:9000")
    return Minio(
        endpoint,
        access_key=os.environ.get("MINIO_ACCESS_KEY", "minio_admin"),
        secret_key=os.environ.get("MINIO_SECRET_KEY", "minio_secure_password"),
        secure=os.environ.get("MINIO_PUBLIC_SECURE", "false").lower() == "true",
        region=os.environ.get("MINIO_REGION", "us-east-1"),
    )


@router.get("/{evidence_id}/share-url")
def create_share_url(
    evidence_id: str,
    expiry_minutes: int = Query(default=15, ge=1, le=60),
    view_mode: Literal["preview", "download"] = Query(default="preview"),
    override_tampered: bool = Query(default=False),
) -> dict[str, object]:
    with psycopg.connect(_database_url(), row_factory=psycopg.rows.dict_row) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT minio_object_key, file_name, mime_type, is_tampered FROM evidence WHERE id = %s",
                (evidence_id,),
            )
            evidence = cursor.fetchone()
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence not found")
    if view_mode == "download" and evidence["is_tampered"] and not override_tampered:
        raise HTTPException(status_code=403, detail="Downloads are disabled for tampered evidence")

    disposition = "inline" if view_mode == "preview" else "attachment"
    filename = quote(evidence["file_name"] or "evidence.bin")
    try:
        url = _presign_client().presigned_get_object(
            BUCKET_NAME,
            evidence["minio_object_key"],
            expires=timedelta(minutes=expiry_minutes),
            response_headers={
                "response-content-disposition": f'{disposition}; filename="{filename}"',
                "response-content-type": evidence["mime_type"] or "application/octet-stream",
            },
        )
    except S3Error as error:
        raise HTTPException(status_code=502, detail=f"Unable to create secure share URL: {error.code}") from error

    expires_at = datetime.now(timezone.utc) + timedelta(minutes=expiry_minutes)
    return {
        "evidence_id": evidence_id,
        "url": url,
        "view_mode": view_mode,
        "expires_at": expires_at.isoformat(),
        "expires_in_seconds": expiry_minutes * 60,
        "content_disposition": disposition,
        "is_tampered": evidence["is_tampered"],
    }