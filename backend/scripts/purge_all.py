import psycopg
from minio import Minio

def purge_all():
    # 1. Clear MinIO objects
    mc = Minio("minio:9000", access_key="minio_admin", secret_key="minio_secure_password", secure=False)
    bucket = "evidence-vault"
    try:
        objects = list(mc.list_objects(bucket, recursive=True))
        print(f"Found {len(objects)} object(s) in MinIO.")
        for obj in objects:
            mc.remove_object(bucket, obj.object_name)
            print(f"[-] Deleted MinIO file: {obj.object_name}")
    except Exception as err:
        print(f"MinIO purge warning: {err}")

    # 2. Clear Database records
    db_url = "postgresql://forensic_admin:secure_password@database:5432/evidence_db"
    with psycopg.connect(db_url) as conn:
        with conn.cursor() as cur:
            cur.execute("ALTER TABLE custody_history DISABLE TRIGGER trg_block_custody_update;")
            cur.execute("DELETE FROM custody_history;")
            cur.execute("DELETE FROM evidence_ai_index;")
            cur.execute("DELETE FROM evidence;")
            cur.execute("ALTER TABLE custody_history ENABLE TRIGGER trg_block_custody_update;")
            conn.commit()
            print("[+] PostgreSQL tables (evidence, evidence_ai_index, custody_history) cleared.")

    # 3. Verify
    with psycopg.connect(db_url) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT count(*) FROM evidence;")
            count = cur.fetchone()[0]
            print(f"[✓] Verification: {count} evidence records remaining in database.")

if __name__ == "__main__":
    purge_all()
