import asyncio
import json
import os
import tempfile
from pathlib import Path
from typing import Any

import psycopg
from minio import Minio
from PIL import Image as PILImage
from PIL.ExifTags import TAGS, GPSTAGS

from app.services.ai_indexing_service import embed_image, embed_image_frames, embed_text, extract_video_frames, transcribe
from app.services.forensic_service import analyze_image
from app.services.exif_service import extract_exif_metadata


BUCKET_NAME = "evidence-vault"


def _client() -> Minio:
    return Minio(
        os.environ.get("MINIO_ENDPOINT", "minio:9000"),
        access_key=os.environ.get("MINIO_ACCESS_KEY", "minio_admin"),
        secret_key=os.environ.get("MINIO_SECRET_KEY", "minio_secure_password"),
        secure=False,
    )


def _vector_literal(vector: list[float]) -> str:
    return "[" + ",".join(f"{value:.8f}" for value in vector) + "]"


def _extract_exif(path: str) -> dict[str, Any]:
    """Extract EXIF metadata from an image file using exif_service."""
    try:
        with open(path, "rb") as f:
            return extract_exif_metadata(f.read())
    except Exception:
        return {}


def _persist_results(
    evidence_id: str,
    report: dict[str, Any] | None,
    transcript: str | None,
    embedding: list[float] | None,
    transcript_words: list[dict[str, Any]] | None = None,
    exif_data: dict[str, Any] | None = None,
) -> None:
    with psycopg.connect(os.environ["DATABASE_URL"]) as connection:
        with connection.cursor() as cursor:
            if report:
                cursor.execute(
                    """
                    UPDATE evidence
                    SET phash = COALESCE(phash, %s),
                        is_tampered = (is_tampered OR %s),
                        tamper_score = GREATEST(tamper_score, %s)
                    WHERE id = %s
                    """,
                    (report["phash"], report["is_tampered"], report["tamper_score"], evidence_id),
                )
            if exif_data:
                cursor.execute(
                    "UPDATE evidence SET exif_data = %s::jsonb WHERE id = %s",
                    (json.dumps(exif_data), evidence_id),
                )
            if transcript is not None or embedding is not None:
                cursor.execute(
                    """
                    INSERT INTO evidence_ai_index (evidence_id, transcript, embedding, transcript_words)
                    VALUES (%s, %s, %s::vector, %s::jsonb)
                    ON CONFLICT (evidence_id) DO UPDATE SET
                        transcript = EXCLUDED.transcript,
                        embedding = EXCLUDED.embedding,
                        transcript_words = EXCLUDED.transcript_words
                    """,
                    (
                        evidence_id,
                        transcript,
                        _vector_literal(embedding) if embedding else None,
                        json.dumps(transcript_words) if transcript_words else None,
                    ),
                )
        connection.commit()


def process_evidence_ai(evidence_id: str, object_key: str) -> None:
    with psycopg.connect(os.environ["DATABASE_URL"], row_factory=psycopg.rows.dict_row) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT mime_type, is_on_spot_capture, exif_data FROM evidence WHERE id = %s",
                (evidence_id,),
            )
            evidence = cursor.fetchone()
    if not evidence:
        return

    suffix = Path(object_key).suffix or ".bin"
    with tempfile.TemporaryDirectory() as directory:
        media_path = str(Path(directory) / f"source{suffix}")
        response = _client().get_object(BUCKET_NAME, object_key)
        try:
            with open(media_path, "wb") as destination:
                for chunk in response.stream(1024 * 1024):
                    destination.write(chunk)
        finally:
            response.close()
            response.release_conn()

        mime_type = evidence["mime_type"] or ""
        report = None
        transcript = None
        embedding = None
        transcript_words: list[dict[str, Any]] | None = None
        exif_data: dict[str, Any] | None = None

        if mime_type.startswith("image/"):
            report = analyze_image(media_path)
            embedding = embed_image(media_path)
            exif_data = _extract_exif(media_path)
            existing_exif = evidence.get("exif_data") or {}
            if evidence.get("is_on_spot_capture"):
                # Preserve on-spot GPS lock and hardware metadata registered during field capture
                if not exif_data.get("gps", {}).get("has_gps") and existing_exif.get("gps", {}).get("has_gps"):
                    exif_data["gps"] = existing_exif["gps"]
                exif_data["is_on_spot_capture"] = True
                if not exif_data.get("software"):
                    exif_data["software"] = existing_exif.get("software", "LexVault Field Shutter v2.5")
                exif_data["has_exif"] = True
                exif_data["is_stripped"] = False
                if not exif_data.get("camera", {}).get("make"):
                    exif_data["camera"] = existing_exif.get("camera", {})
            # OCR: Extract any visible text from the image using Tesseract
            try:
                import pytesseract
                ocr_text = pytesseract.image_to_string(
                    PILImage.open(media_path),
                    lang="eng",
                    config="--psm 3",  # Fully automatic page segmentation
                ).strip()
                if ocr_text and len(ocr_text) >= 3:
                    transcript = ocr_text
                    # If CLIP visual embedding already exists, keep it (richer signal).
                    # Only fall back to text embedding when CLIP failed.
                    if embedding is None:
                        embedding = embed_text(ocr_text[:1000])
            except Exception:
                pass  # OCR is best-effort; don't block the pipeline
        elif mime_type.startswith("video/"):
            frames = extract_video_frames(media_path, directory)
            if frames:
                embedding = embed_image_frames(frames)
                report = analyze_image(frames[0])
            transcript_result = transcribe(media_path)
            transcript = transcript_result["text"]
            transcript_words = transcript_result.get("words")
            if embedding is None and transcript:
                embedding = embed_text(transcript)
        elif mime_type.startswith("audio/"):
            transcript_result = transcribe(media_path)
            transcript = transcript_result["text"]
            transcript_words = transcript_result.get("words")
            if transcript:
                embedding = embed_text(transcript)
        elif mime_type == "application/pdf":
            # PDF: Extract text from all pages using pypdf
            try:
                from pypdf import PdfReader
                reader = PdfReader(media_path)
                pages_text: list[str] = []
                for page in reader.pages:
                    page_text = page.extract_text()
                    if page_text:
                        pages_text.append(page_text.strip())
                full_text = "\n\n".join(pages_text).strip()
                if full_text and len(full_text) >= 3:
                    transcript = full_text
                    # Generate CLIP embedding from extracted text for semantic search
                    # Truncate to first 1000 chars (CLIP text encoder limit)
                    embedding = embed_text(full_text[:1000])
            except Exception:
                pass  # PDF extraction is best-effort

        if report or transcript is not None or embedding is not None:
            _persist_results(
                evidence_id, report, transcript, embedding,
                transcript_words=transcript_words,
                exif_data=exif_data,
            )


async def run_evidence_ai(evidence_id: str, object_key: str) -> None:
    await asyncio.to_thread(process_evidence_ai, evidence_id, object_key)