import sys
import psycopg
from minio import Minio
from minio.error import S3Error

DATABASE_URL = "postgresql://forensic_admin:secure_password@database:5432/evidence_db"
MINIO_ENDPOINT = "minio:9000"
MINIO_ACCESS_KEY = "minio_admin"
MINIO_SECRET_KEY = "minio_secure_password"
BUCKET_NAME = "evidence-vault"

def list_evidence():
    with psycopg.connect(DATABASE_URL, row_factory=psycopg.rows.dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, case_number, title, file_name, minio_object_key FROM evidence ORDER BY created_at DESC")
            return cur.fetchall()

def delete_evidence_by_identifiers(identifiers: list[str]):
    mc = Minio(
        MINIO_ENDPOINT,
        access_key=MINIO_ACCESS_KEY,
        secret_key=MINIO_SECRET_KEY,
        secure=False,
    )
    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            # 1. Temporarily disable append-only trigger on custody_history
            cur.execute("ALTER TABLE custody_history DISABLE TRIGGER trg_block_custody_update;")
            deleted_count = 0
            for ident in identifiers:
                ident = ident.strip()
                if not ident:
                    continue
                cur.execute(
                    "SELECT id, title, minio_object_key FROM evidence WHERE id::text = %s OR title = %s OR file_name = %s",
                    (ident, ident, ident),
                )
                matches = cur.fetchall()
                if not matches:
                    print(f"[!] No record found for identifier: '{ident}'")
                    continue
                for eid, title, object_key in matches:
                    # Remove from MinIO
                    try:
                        mc.remove_object(BUCKET_NAME, object_key)
                        print(f"[+] Removed from MinIO bucket '{BUCKET_NAME}': {object_key}")
                    except Exception as err:
                        print(f"[-] MinIO removal error for {object_key}: {err}")

                    # Remove from DB tables
                    cur.execute("DELETE FROM custody_history WHERE evidence_id = %s", (eid,))
                    cur.execute("DELETE FROM evidence_ai_index WHERE evidence_id = %s", (eid,))
                    cur.execute("DELETE FROM evidence WHERE id = %s", (eid,))
                    print(f"[+] Deleted from Database: '{title}' (ID: {eid})")
                    deleted_count += 1

            # 2. Re-enable append-only trigger
            cur.execute("ALTER TABLE custody_history ENABLE TRIGGER trg_block_custody_update;")
            conn.commit()
            print(f"\nSuccessfully deleted {deleted_count} record(s).")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scripts/delete_evidence.py <id_or_title_or_filename> ...")
        print("\nCurrent files in vault:")
        items = list_evidence()
        for i, it in enumerate(items, 1):
            print(f"{i}. ID: {it['id']} | Case: {it['case_number']} | Title: {it['title']} | File: {it['file_name']}")
    else:
        delete_evidence_by_identifiers(sys.argv[1:])
