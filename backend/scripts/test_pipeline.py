"""Run the Prompt 6 evidence pipeline checks inside the backend container."""

import hashlib
import os
import time
from io import BytesIO

import psycopg
import requests
from minio import Minio
from PIL import Image


API_BASE = os.getenv("PIPELINE_API_BASE", "http://127.0.0.1:8000")
DATABASE_URL = os.environ["DATABASE_URL"]
BUCKET = "evidence-vault"


def make_image() -> bytes:
    image = Image.new("RGB", (96, 96))
    pixels = image.load()
    run_marker = int(time.time()) % 255
    for y in range(96):
        for x in range(96):
            pixels[x, y] = ((x * 3) % 255, (y * 5) % 255, ((x + y) * 2) % 255)
    pixels[0, 0] = (run_marker, 17, 231)
    output = BytesIO()
    image.save(output, format="PNG")
    return output.getvalue()


def assert_status(response: requests.Response, expected: int) -> dict:
    assert response.status_code == expected, f"Expected HTTP {expected}, got {response.status_code}: {response.text}"
    return response.json()


def wait_for_api() -> None:
    for _ in range(60):
        try:
            if requests.get(f"{API_BASE}/health", timeout=2).ok:
                return
        except requests.RequestException:
            pass
        time.sleep(1)
    raise AssertionError(f"API did not become ready at {API_BASE}")


def wait_for_vector(evidence_id: str) -> int:
    for _ in range(180):
        with psycopg.connect(DATABASE_URL) as connection:
            with connection.cursor() as cursor:
                cursor.execute("SELECT vector_dims(embedding) FROM evidence_ai_index WHERE evidence_id = %s", (evidence_id,))
                row = cursor.fetchone()
                if row and row[0]:
                    return int(row[0])
        time.sleep(2)
    raise AssertionError("Timed out waiting for the AI embedding")


def assert_append_only(evidence_id: str) -> None:
    for statement in (
        "UPDATE custody_history SET notes = 'forbidden' WHERE evidence_id = %s",
        "DELETE FROM custody_history WHERE evidence_id = %s",
    ):
        try:
            with psycopg.connect(DATABASE_URL) as connection:
                with connection.cursor() as cursor:
                    cursor.execute(statement, (evidence_id,))
                connection.commit()
        except psycopg.Error:
            pass
        else:
            raise AssertionError(f"Append-only trigger did not reject: {statement}")


def main() -> None:
    wait_for_api()
    original = make_image()
    digest = hashlib.sha256(original).hexdigest()
    upload = requests.post(
        f"{API_BASE}/api/v1/evidence/upload",
        data={
            "case_number": "PIPELINE-2026",
            "title": "Synthetic authentic image",
            "client_sha256": digest,
            "initial_custodian": "mock-custodian",
        },
        files={"file": ("pipeline.png", original, "image/png")},
        timeout=180,
    )
    uploaded = assert_status(upload, 201)
    evidence_id = uploaded["id"]
    object_key = uploaded["minio_object_key"]
    print("Case 1 upload: OK")

    minio = Minio("minio:9000", access_key="minio_admin", secret_key="minio_secure_password", secure=False)
    object_stat = minio.stat_object(BUCKET, object_key)
    lock_config = minio.get_object_lock_config(BUCKET)
    assert object_stat.size == len(original), "MinIO object size mismatch"
    assert lock_config is not None, "MinIO Object Lock is not configured"
    assert wait_for_vector(evidence_id) == 512, "Expected a 512-dimensional embedding"
    print("Case 1 object lock and embedding: OK")

    search = assert_status(
        requests.post(f"{API_BASE}/api/v1/search/semantic", json={"query": "synthetic colored evidence image", "limit": 10, "threshold": -1}, timeout=180),
        200,
    )
    results = search.get("results", [])
    assert results and results[0]["id"] == evidence_id, f"Uploaded evidence was not ranked first: {results}"
    assert 0 <= results[0]["similarity"] <= 1, "Similarity is outside the cosine confidence range"
    print("Case 2 semantic ranking: OK")

    transfer = assert_status(
        requests.post(
            f"{API_BASE}/api/v1/evidence/{evidence_id}/custody",
            json={"to_custodian": "mock-custodian", "action_type": "FORENSIC_ANALYSIS", "notes": "Pipeline handoff"},
            timeout=60,
        ),
        200,
    )
    assert transfer["to_custodian"] == "mock-custodian"
    with psycopg.connect(DATABASE_URL) as connection:
        with connection.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) FROM custody_history WHERE evidence_id = %s", (evidence_id,))
            assert cursor.fetchone()[0] == 2, "Custody history did not append"
    assert_append_only(evidence_id)
    print("Case 3 custody append-only behavior: OK")

    mutated = bytearray(original)
    mutated[len(mutated) // 2] ^= 0xFF
    verification = assert_status(
        requests.post(
            f"{API_BASE}/api/v1/evidence/verify",
            files={"file": ("mutated.png", bytes(mutated), "image/png")},
            timeout=60,
        ),
        200,
    )
    assert verification["is_authentic"] is False, "Mutated image was marked authentic"
    assert verification["tamper_score"] > 0, "Mutated image did not produce an elevated tamper score"
    print("Case 4 mutated-image verification: OK")
    print("Prompt 6 pipeline: PASS")


if __name__ == "__main__":
    main()
