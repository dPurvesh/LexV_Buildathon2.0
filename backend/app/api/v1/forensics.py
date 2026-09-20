import base64
import json
import os
from io import BytesIO
from typing import Any

import cv2
import numpy as np
import psycopg
from fastapi import APIRouter, HTTPException
from minio import Minio
from PIL import Image, ImageChops, ImageEnhance


router = APIRouter(prefix="/api/v1/forensics", tags=["forensics"])
BUCKET_NAME = "evidence-vault"


def _database_url() -> str:
    return os.environ.get("DATABASE_URL", "")


def _minio_client() -> Minio:
    return Minio(
        os.environ.get("MINIO_ENDPOINT", "minio:9000"),
        access_key=os.environ.get("MINIO_ACCESS_KEY", "minio_admin"),
        secret_key=os.environ.get("MINIO_SECRET_KEY", "minio_secure_password"),
        secure=False,
    )


def _fetch_evidence(evidence_id: str) -> dict[str, Any]:
    with psycopg.connect(_database_url(), row_factory=psycopg.rows.dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, minio_object_key, mime_type, tamper_score, phash FROM evidence WHERE id = %s",
                (evidence_id,),
            )
            evidence = cur.fetchone()
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence not found")
    return dict(evidence)


def _download_from_minio(object_key: str) -> bytes:
    response = _minio_client().get_object(BUCKET_NAME, object_key)
    try:
        return response.read()
    finally:
        response.close()
        response.release_conn()


@router.get("/{evidence_id}/ela-heatmap")
def get_ela_heatmap(evidence_id: str) -> dict[str, Any]:
    """Generate an Error Level Analysis heatmap for an image evidence item."""
    evidence = _fetch_evidence(evidence_id)

    if not evidence["mime_type"] or not evidence["mime_type"].startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="ELA analysis is only available for image evidence",
        )

    image_bytes = _download_from_minio(evidence["minio_object_key"])
    original = Image.open(BytesIO(image_bytes)).convert("RGB")

    # Resize for performance if very large
    max_dim = 1200
    if max(original.size) > max_dim:
        ratio = max_dim / max(original.size)
        new_size = (int(original.width * ratio), int(original.height * ratio))
        original = original.resize(new_size, Image.LANCZOS)

    # ELA: recompress at quality 90 and compute difference
    ela_buf = BytesIO()
    original.save(ela_buf, format="JPEG", quality=90)
    ela_buf.seek(0)
    recompressed = Image.open(ela_buf).convert("RGB")

    difference = ImageChops.difference(original, recompressed)
    extrema = difference.getextrema()
    scale = max(max(ch) for ch in extrema) or 1
    enhanced = ImageEnhance.Brightness(difference).enhance(255 / scale)

    # Convert to heatmap with OpenCV JET color mapping
    gray = cv2.cvtColor(np.array(enhanced, dtype=np.uint8), cv2.COLOR_RGB2GRAY)
    heatmap_bgr = cv2.applyColorMap(gray, cv2.COLORMAP_JET)
    heatmap_rgb = cv2.cvtColor(heatmap_bgr, cv2.COLOR_BGR2RGB)
    heatmap_img = Image.fromarray(heatmap_rgb)

    # Encode heatmap as base64 PNG
    heatmap_out = BytesIO()
    heatmap_img.save(heatmap_out, format="PNG")
    heatmap_b64 = base64.b64encode(heatmap_out.getvalue()).decode("ascii")

    # Encode original as base64 PNG for side-by-side comparison
    original_out = BytesIO()
    original.save(original_out, format="PNG")
    original_b64 = base64.b64encode(original_out.getvalue()).decode("ascii")

    return {
        "evidence_id": evidence_id,
        "original_b64": original_b64,
        "heatmap_b64": heatmap_b64,
        "tamper_score": evidence.get("tamper_score", 0.0),
        "phash": evidence.get("phash"),
        "width": original.width,
        "height": original.height,
    }


@router.get("/{evidence_id}/transcript")
def get_transcript(evidence_id: str) -> dict[str, Any]:
    """Retrieve the transcript with word-level timestamps for synchronized playback."""
    with psycopg.connect(_database_url(), row_factory=psycopg.rows.dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT mime_type FROM evidence WHERE id = %s",
                (evidence_id,),
            )
            evidence = cur.fetchone()
            if not evidence:
                raise HTTPException(status_code=404, detail="Evidence not found")

            cur.execute(
                "SELECT transcript, transcript_words FROM evidence_ai_index WHERE evidence_id = %s",
                (evidence_id,),
            )
            ai_row = cur.fetchone()

    if not ai_row or not ai_row.get("transcript"):
        raise HTTPException(
            status_code=404,
            detail="No transcript available for this evidence",
        )

    words = ai_row.get("transcript_words") or []
    if isinstance(words, str):
        try:
            words = json.loads(words)
        except json.JSONDecodeError:
            words = []

    return {
        "evidence_id": evidence_id,
        "text": ai_row["transcript"],
        "words": words,
        "mime_type": evidence["mime_type"],
    }
