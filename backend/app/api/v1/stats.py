import os
from typing import Any

import psycopg
from fastapi import APIRouter


router = APIRouter(prefix="/api/v1/stats", tags=["stats"])


def _database_url() -> str:
    return os.environ.get("DATABASE_URL", "")


@router.get("/dashboard")
def dashboard_stats() -> dict[str, Any]:
    """Return vault-wide statistics for the command center dashboard."""
    with psycopg.connect(_database_url(), row_factory=psycopg.rows.dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    COUNT(*)::int AS total_evidence,
                    COUNT(DISTINCT case_number)::int AS active_cases,
                    COALESCE(SUM(file_size_bytes), 0)::bigint AS total_storage_bytes,
                    COUNT(*) FILTER (WHERE is_tampered = TRUE)::int AS tamper_alerts
                FROM evidence
            """)
            row = cur.fetchone()

            cur.execute("""
                SELECT COUNT(*)::int AS pending
                FROM evidence e
                WHERE NOT EXISTS (
                    SELECT 1 FROM evidence_ai_index ai WHERE ai.evidence_id = e.id
                )
            """)
            ai_row = cur.fetchone()

            cur.execute("SELECT COUNT(*)::int AS total FROM custody_history")
            custody_row = cur.fetchone()

    return {
        "total_evidence": row["total_evidence"],
        "active_cases": row["active_cases"],
        "total_storage_bytes": int(row["total_storage_bytes"]),
        "pending_ai": ai_row["pending"],
        "tamper_alerts": row["tamper_alerts"],
        "total_transfers": custody_row["total"],
    }


@router.get("/cases")
def list_cases() -> dict[str, Any]:
    """Return evidence grouped by case number for the portfolio view."""
    with psycopg.connect(_database_url(), row_factory=psycopg.rows.dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    case_number,
                    COUNT(*)::int AS evidence_count,
                    MAX(created_at) AS latest_upload,
                    BOOL_OR(is_tampered) AS has_tampered,
                    COALESCE(SUM(file_size_bytes), 0)::bigint AS total_size
                FROM evidence
                GROUP BY case_number
                ORDER BY MAX(created_at) DESC
            """)
            cases = [dict(r) for r in cur.fetchall()]

    for case in cases:
        if case.get("latest_upload"):
            case["latest_upload"] = case["latest_upload"].isoformat()
        case["total_size"] = int(case["total_size"])

    return {"cases": cases, "count": len(cases)}
