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


from app.services.forensic_service import generate_ela_heatmap_b64

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
    ela_data = generate_ela_heatmap_b64(image_bytes)

    return {
        "evidence_id": evidence_id,
        "original_b64": ela_data["original_b64"],
        "heatmap_b64": ela_data["heatmap_b64"],
        "red_overlay_b64": ela_data.get("red_overlay_b64"),
        "tamper_boxes": ela_data.get("tamper_boxes", []),
        "tamper_score": evidence.get("tamper_score") or ela_data.get("tamper_score", 0.0),
        "phash": evidence.get("phash") or ela_data.get("phash"),
        "width": ela_data.get("width", 800),
        "height": ela_data.get("height", 600),
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
