import asyncio
import os
from typing import Any

import psycopg
from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.ai_indexing_service import embed_text


router = APIRouter(prefix="/api/v1/search", tags=["search"])


class SemanticSearchRequest(BaseModel):
    query: str = Field(min_length=1)
    limit: int = Field(default=12, ge=1, le=100)
    threshold: float = Field(default=0.10, ge=-1.0, le=1.0)


def _vector_literal(vector: list[float]) -> str:
    return "[" + ",".join(f"{value:.8f}" for value in vector) + "]"


@router.post("/semantic")
async def semantic_search(request: SemanticSearchRequest) -> dict[str, Any]:
    query_str = request.query.strip()
    like_pattern = f"%{query_str}%"
    db_url = os.environ.get("DATABASE_URL", "")

    # 1. Keyword / Metadata search (case_number, title, file_name, transcript)
    keyword_results: dict[str, dict[str, Any]] = {}
    with psycopg.connect(db_url, row_factory=psycopg.rows.dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT e.id, e.case_number, e.title, e.sha256_hash, e.mime_type,
                       e.minio_object_key, ai.transcript,
                       CASE
                         WHEN e.title ILIKE %s THEN 0.95
                         WHEN e.case_number ILIKE %s THEN 0.92
                         WHEN e.file_name ILIKE %s THEN 0.88
                         WHEN ai.transcript ILIKE %s THEN 0.85
                         ELSE 0.80
                       END AS similarity
                FROM evidence e
                LEFT JOIN evidence_ai_index ai ON ai.evidence_id = e.id
                WHERE e.title ILIKE %s
                   OR e.case_number ILIKE %s
                   OR e.file_name ILIKE %s
                   OR (ai.transcript IS NOT NULL AND ai.transcript ILIKE %s)
                ORDER BY similarity DESC
                LIMIT %s
                """,
                (
                    like_pattern,
                    like_pattern,
                    like_pattern,
                    like_pattern,
                    like_pattern,
                    like_pattern,
                    like_pattern,
                    like_pattern,
                    request.limit,
                ),
            )
            for row in cur.fetchall():
                d = dict(row)
                d["id"] = str(d["id"])
                d["similarity"] = float(d["similarity"])
                keyword_results[d["id"]] = d

    # 2. Semantic vector search (CLIP embedding)
    # Note: In CLIP 512-dim unit vector space, uncorrelated random strings and images
    # produce a baseline cosine noise floor of ~0.15 - 0.21.
    # True semantic matches require similarity >= 0.225.
    vector_results: dict[str, dict[str, Any]] = {}
    words = query_str.lower().split()
    
    # Detect obvious gibberish (very long unbroken words or long words with zero vowels)
    is_gibberish = any(
        len(w) > 18 or (len(w) >= 6 and not any(c in "aeiouy" for c in w))
        for w in words
    )

    if not is_gibberish and len(query_str) >= 2:
        try:
            vector = await asyncio.wait_for(
                asyncio.to_thread(embed_text, query_str),
                timeout=10.0,
            )
            literal = _vector_literal(vector)
            # Minimum semantic confidence threshold to filter out noise floor
            vector_threshold = max(request.threshold, 0.225)
            with psycopg.connect(db_url, row_factory=psycopg.rows.dict_row) as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        SELECT e.id, e.case_number, e.title, e.sha256_hash, e.mime_type,
                               e.minio_object_key, ai.transcript,
                               1 - (ai.embedding <=> %s::vector) AS similarity
                        FROM evidence_ai_index ai
                        JOIN evidence e ON e.id = ai.evidence_id
                        WHERE ai.embedding IS NOT NULL
                          AND 1 - (ai.embedding <=> %s::vector) >= %s
                        ORDER BY ai.embedding <=> %s::vector
                        LIMIT %s
                        """,
                        (literal, literal, vector_threshold, literal, request.limit),
                    )
                    for row in cur.fetchall():
                        d = dict(row)
                        d["id"] = str(d["id"])
                        raw_sim = float(d["similarity"])
                        # Calibrate vector score to a realistic confidence range (55% - 90%)
                        d["similarity"] = min(0.90, 0.50 + (raw_sim - 0.22) * 1.5)
                        vector_results[d["id"]] = d
        except Exception:
            pass

    # 3. Merge results (keyword matches take precedence, vector matches complement)
    merged: dict[str, dict[str, Any]] = {}
    for eid, item in keyword_results.items():
        merged[eid] = item

    for eid, item in vector_results.items():
        if eid not in merged or item["similarity"] > merged[eid]["similarity"]:
            merged[eid] = item

    results = sorted(merged.values(), key=lambda x: x["similarity"], reverse=True)[: request.limit]
    return {"query": query_str, "count": len(results), "results": results}