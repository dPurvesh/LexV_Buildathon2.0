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
    """Extract EXIF metadata from an image file."""
    try:
        with PILImage.open(path) as img:
            exif_data = img.getexif()
            if not exif_data:
                return {}
            result: dict[str, Any] = {}
            for tag_id, value in exif_data.items():
                tag = TAGS.get(tag_id, str(tag_id))
                # Skip binary/bytes values and overly long values
                if isinstance(value, bytes):
                    continue
                str_val = str(value)
                if len(str_val) > 200:
                    continue
                result[tag] = str_val

            # Check for GPS data
            gps_ifd = exif_data.get_ifd(0x8825)
            if gps_ifd:
                gps: dict[str, str] = {}
                for tag_id, value in gps_ifd.items():
                    tag = GPSTAGS.get(tag_id, str(tag_id))
                    gps[tag] = str(value)
                if gps:
                    result["GPS"] = gps

            return result
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
                    "UPDATE evidence SET phash = %s, is_tampered = %s, tamper_score = %s WHERE id = %s",
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
            cursor.execute("SELECT mime_type FROM evidence WHERE id = %s", (evidence_id,))
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

        if report or transcript is not None or embedding is not None:
            _persist_results(
                evidence_id, report, transcript, embedding,
                transcript_words=transcript_words,
                exif_data=exif_data,
            )


async def run_evidence_ai(evidence_id: str, object_key: str) -> None:
    await asyncio.to_thread(process_evidence_ai, evidence_id, object_key)