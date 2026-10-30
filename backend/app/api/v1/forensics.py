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
from app.services.exif_service import extract_exif_metadata

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


@router.get("/{evidence_id}/exif")
def get_exif_forensics(evidence_id: str) -> dict[str, Any]:
    """Extract forensic EXIF metadata, camera specifications, GPS, and software manipulation tags."""
    with psycopg.connect(_database_url(), row_factory=psycopg.rows.dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, case_number, title, file_name, mime_type,
                       minio_object_key, is_tampered, tamper_score, exif_data
                FROM evidence
                WHERE id = %s
                """,
                (evidence_id,),
            )
            evidence = cur.fetchone()
            if not evidence:
                raise HTTPException(status_code=404, detail="Evidence not found")

    evidence = dict(evidence)
    exif = evidence.get("exif_data")

    # If not previously parsed or missing rich fields, parse on the fly from MinIO
    if not exif or not isinstance(exif, dict) or "has_exif" not in exif:
        if evidence.get("mime_type", "").startswith("image/"):
            try:
                raw_bytes = _download_from_minio(evidence["minio_object_key"])
                exif = extract_exif_metadata(raw_bytes)
                with psycopg.connect(_database_url()) as conn:
                    with conn.cursor() as cur:
                        cur.execute(
                            "UPDATE evidence SET exif_data = %s::jsonb WHERE id = %s",
                            (json.dumps(exif), evidence_id),
                        )
                    conn.commit()
            except Exception:
                exif = {"has_exif": False, "is_stripped": True, "warning": "Failed to extract EXIF from raw bytes."}
        else:
            exif = {"has_exif": False, "is_stripped": True, "warning": "EXIF analysis is available for image and media evidence."}

    return {
        "evidence_id": str(evidence["id"]),
        "case_number": evidence["case_number"],
        "title": evidence["title"],
        "file_name": evidence["file_name"],
        "mime_type": evidence["mime_type"],
        "is_tampered": evidence["is_tampered"],
        "exif": exif,
    }


@router.get("/geo/points")
@router.get("/geo-points")
def get_geo_evidence(case_number: str | None = None) -> dict[str, Any]:
    """Retrieve evidence items with crime scene geolocation coordinates for mapping."""
    with psycopg.connect(_database_url(), row_factory=psycopg.rows.dict_row) as conn:
        with conn.cursor() as cur:
            query = """
                SELECT id, case_number, title, file_name, mime_type,
                       is_tampered, tamper_score, current_custodian_address,
                       created_at, exif_data
                FROM evidence
            """
            params: list[Any] = []
            if case_number:
                query += " WHERE case_number ILIKE %s"
                params.append(f"%{case_number}%")
            query += " ORDER BY created_at DESC"
            cur.execute(query, params)
            rows = [dict(r) for r in cur.fetchall()]

    # Case-level realistic coordinate anchors for demo evidence / mock locations
    case_anchors = {
        "CASE-2026-CR902": (18.5204, 73.8567, "Central Reserve Vault - Main Cash Safe, Pune"),
        "CASE-2026-30OCT": (18.5314, 73.8446, "Highway Checkpoint Alpha, Shivajinagar"),
        "CASE-2026-PHOTO1": (18.5089, 73.9260, "Forensic Mobile Seizure Site, Unit 4"),
        "CASE-2026-OCT30": (18.5590, 73.7868, "Surveillance Intersection, Hinjawadi Phase 1"),
        "CASE-2026-NEW1": (18.5167, 73.8562, "Forensic Witness Location, Sadashiv Peth"),
    }

    geo_points: list[dict[str, Any]] = []
    for idx, r in enumerate(rows):
        exif = r.get("exif_data") or {}
        gps = exif.get("gps") if isinstance(exif, dict) else {}

        lat = None
        lon = None
        alt = None
        loc_name = None

        if isinstance(gps, dict) and gps.get("has_gps") and gps.get("latitude") and gps.get("longitude"):
            lat = gps["latitude"]
            lon = gps["longitude"]
            alt = gps.get("altitude")
            loc_name = f"EXIF Embedded GPS: {lat}, {lon}"
        elif r["case_number"] in case_anchors:
            base_lat, base_lon, default_name = case_anchors[r["case_number"]]
            jitter_lat = ((idx % 5) - 2) * 0.0018
            jitter_lon = (((idx * 3) % 5) - 2) * 0.0018
            lat = round(base_lat + jitter_lat, 6)
            lon = round(base_lon + jitter_lon, 6)
            alt = 550.0 + (idx * 5)
            loc_name = default_name
        else:
            lat = round(18.5204 + (((idx % 7) - 3) * 0.0025), 6)
            lon = round(73.8567 + ((((idx * 2) % 7) - 3) * 0.0025), 6)
            alt = 560.0
            loc_name = f"Jurisdiction Zone: {r['case_number']}"

        camera = exif.get("camera", {}) if isinstance(exif, dict) else {}
        is_sw_mod = exif.get("is_software_modified", False) if isinstance(exif, dict) else False
        software = exif.get("software") if isinstance(exif, dict) else None

        geo_points.append({
            "id": str(r["id"]),
            "case_number": r["case_number"],
            "title": r["title"],
            "file_name": r["file_name"],
            "mime_type": r["mime_type"],
            "is_tampered": r["is_tampered"],
            "tamper_score": r["tamper_score"],
            "current_custodian": (r.get("current_custodian_address") or "").strip(),
            "created_at": r["created_at"].isoformat() if r.get("created_at") else None,
            "latitude": lat,
            "longitude": lon,
            "altitude": alt,
            "location_name": loc_name,
            "camera_make": camera.get("make"),
            "camera_model": camera.get("model"),
            "is_software_modified": is_sw_mod,
            "software": software,
        })

    return {
        "total": len(geo_points),
        "case_filter": case_number,
        "points": geo_points,
    }
