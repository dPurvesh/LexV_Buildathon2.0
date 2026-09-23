import asyncio
import os
import re
from typing import Any

import psycopg
from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.ai_indexing_service import embed_text

router = APIRouter(prefix="/api/v1/search", tags=["search"])

STOP_WORDS = {
    "a", "an", "the", "and", "or", "in", "on", "at", "to", "for", "of", "with",
    "by", "from", "is", "are", "was", "were", "it", "its", "that", "this"
}


class SemanticSearchRequest(BaseModel):
    query: str = Field(min_length=1)
    limit: int = Field(default=12, ge=1, le=100)
    threshold: float = Field(default=0.10, ge=-1.0, le=1.0)


def _vector_literal(vector: list[float]) -> str:
    return "[" + ",".join(f"{value:.8f}" for value in vector) + "]"


def is_likely_gibberish(text: str) -> bool:
    text = text.strip().lower()
    words = text.split()
    if not words:
        return True

    kb_patterns = ["qwerty", "asdfgh", "zxcvbn", "poiuyt", "lkjhgf", "mnbvcxz"]
    gibberish_count = 0

    for w in words:
        if len(w) < 4:
            continue
        # 1. Zero vowels in a 5+ letter word (e.g. fdcff, sdkjh)
        if len(w) >= 5 and not re.search(r"[aeiouy]", w):
            gibberish_count += 1
            continue
        # 2. 6 or more consecutive consonants
        if re.search(r"[bcdfghjklmnpqrstvwxz]{6,}", w):
            gibberish_count += 1
            continue
        # 3. 4 or more identical consecutive letters (e.g. aaaa, zzzz)
        if re.search(r"(.)\1{3,}", w):
            gibberish_count += 1
            continue
        # 4. Repeating 2 or 3 letter patterns (e.g. asdasd, ugugug)
        if re.search(r"(.{2,3})\1{2,}", w):
            gibberish_count += 1
            continue
        # 5. Keyboard row sequences
        if any(row in w for row in kb_patterns):
            gibberish_count += 1
            continue

    return gibberish_count == len(words) and len(words) > 0


def get_context_snippet(text: str | None, query: str, tokens: list[str], window: int = 160) -> str:
    if not text:
        return ""
    # Try finding exact query phrase first
    m = re.search(re.escape(query), text, re.IGNORECASE)
    if not m and tokens:
        # Try matching any significant token
        for t in tokens:
            m = re.search(r"\b" + re.escape(t) + r"\b", text, re.IGNORECASE)
            if m:
                break
    if not m:
        cleaned = text.replace("\n", " ").strip()
        return cleaned[:window].strip() + ("…" if len(cleaned) > window else "")

    start = max(0, m.start() - window // 3)
    end = min(len(text), m.end() + (2 * window) // 3)
    snippet = text[start:end].replace("\n", " ").strip()
    if start > 0:
        snippet = "…" + snippet
    if end < len(text):
        snippet = snippet + "…"
    return snippet


@router.post("/semantic")
async def semantic_search(request: SemanticSearchRequest) -> dict[str, Any]:
    query_str = request.query.strip()
    if not query_str or is_likely_gibberish(query_str):
        return {"query": query_str, "count": 0, "results": []}

    q_lower = query_str.lower()
    raw_tokens = re.findall(r"[a-z0-9_-]+", q_lower)
    tokens = [t for t in raw_tokens if len(t) >= 2 and t not in STOP_WORDS]
    if not tokens and raw_tokens:
        tokens = raw_tokens

    db_url = os.environ.get("DATABASE_URL", "")

    # 1. Fetch candidates from database
    with psycopg.connect(db_url, row_factory=psycopg.rows.dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT e.id, e.case_number, e.title, e.file_name, e.mime_type,
                       e.sha256_hash, e.minio_object_key, ai.transcript,
                       ai.embedding IS NOT NULL AS has_embedding
                FROM evidence e
                LEFT JOIN evidence_ai_index ai ON ai.evidence_id = e.id
                """
            )
            candidates = [dict(r) for r in cur.fetchall()]

    scored_items: dict[str, dict[str, Any]] = {}

    # 2. Precision Lexical / Keyword Scoring
    for item in candidates:
        eid = str(item["id"])
        item["id"] = eid
        header = f"{item['case_number']} {item['title']} {item['file_name']}".lower()
        body = (item.get("transcript") or "").lower()
        full_text = f"{header} {body}"

        keyword_score = 0.0

        # A. Exact phrase matching (highest fidelity)
        if re.search(r"\b" + re.escape(q_lower) + r"\b", header):
            keyword_score = 0.98
        elif q_lower in header:
            keyword_score = 0.95
        elif re.search(r"\b" + re.escape(q_lower) + r"\b", body):
            keyword_score = 0.95
        elif q_lower in body:
            keyword_score = 0.92
        else:
            # B. Multi-token overlap analysis
            if len(tokens) > 1:
                matched_tokens = [t for t in tokens if re.search(r"\b" + re.escape(t) + r"\b", full_text)]
                token_ratio = len(matched_tokens) / len(tokens)
                if token_ratio == 1.0:
                    keyword_score = 0.90
                elif token_ratio >= 0.60:
                    keyword_score = round(0.60 + 0.20 * token_ratio, 2)
                else:
                    # Dropped: not enough query terms matched (e.g. only 1 out of 3 terms)
                    keyword_score = 0.0
            elif len(tokens) == 1:
                t = tokens[0]
                if re.search(r"\b" + re.escape(t) + r"\b", full_text):
                    keyword_score = 0.90
                elif t in full_text:
                    keyword_score = 0.85

        if keyword_score > 0.0:
            item["similarity"] = keyword_score
            item["transcript"] = get_context_snippet(item.get("transcript"), query_str, tokens)
            scored_items[eid] = item

    # 3. Controlled Semantic Vector Search (CLIP)
    # Applied to visual media and conceptual queries, avoiding false positives on unrelated text documents
    if len(query_str) >= 3:
        try:
            vector = await asyncio.wait_for(
                asyncio.to_thread(embed_text, query_str),
                timeout=10.0,
            )
            literal = _vector_literal(vector)
            with psycopg.connect(db_url, row_factory=psycopg.rows.dict_row) as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        SELECT e.id, e.case_number, e.title, e.file_name, e.mime_type,
                               e.sha256_hash, e.minio_object_key, ai.transcript,
                               1 - (ai.embedding <=> %s::vector) AS raw_sim
                        FROM evidence_ai_index ai
                        JOIN evidence e ON e.id = ai.evidence_id
                        WHERE ai.embedding IS NOT NULL
                          AND 1 - (ai.embedding <=> %s::vector) >= 0.28
                        ORDER BY ai.embedding <=> %s::vector
                        LIMIT %s
                        """,
                        (literal, literal, literal, request.limit),
                    )
                    v_rows = cur.fetchall()

            for v in v_rows:
                eid = str(v["id"])
                raw_sim = float(v["raw_sim"])
                mime = (v.get("mime_type") or "").lower()
                has_transcript = bool(v.get("transcript"))

                if eid in scored_items:
                    # Document already matched keywords: boost confidence with vector confirmation
                    boosted = max(scored_items[eid]["similarity"], min(0.98, scored_items[eid]["similarity"] + 0.03))
                    scored_items[eid]["similarity"] = boosted
                else:
                    # Document did NOT match keywords:
                    if not has_transcript and mime.startswith(("image/", "video/")):
                        # Visual media without transcript: vector search is primary
                        if raw_sim >= 0.28:
                            calibrated = round(min(0.85, 0.50 + (raw_sim - 0.28) * 1.5), 2)
                            d = dict(v)
                            d["id"] = eid
                            d["similarity"] = calibrated
                            d["transcript"] = ""
                            scored_items[eid] = d
                    elif has_transcript:
                        # For text documents without keyword overlap:
                        # Only allow if raw vector similarity is exceptionally high (conceptual match)
                        # and the query is not a specific multi-token named entity query
                        if len(tokens) <= 1 and raw_sim >= 0.65:
                            calibrated = round(min(0.70, 0.55 + (raw_sim - 0.65) * 1.0), 2)
                            d = dict(v)
                            d["id"] = eid
                            d["similarity"] = calibrated
                            d["transcript"] = get_context_snippet(d.get("transcript"), query_str, tokens)
                            scored_items[eid] = d
        except Exception:
            pass

    # Sort results by similarity descending
    results = sorted(scored_items.values(), key=lambda x: x["similarity"], reverse=True)[: request.limit]
    return {"query": query_str, "count": len(results), "results": results}