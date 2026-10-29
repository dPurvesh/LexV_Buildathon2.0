import json
import os
from datetime import datetime, timezone
from io import BytesIO
from typing import Any

import psycopg
import qrcode
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    Image as RLImage,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


router = APIRouter(prefix="/api/v1/evidence", tags=["certificate"])


def _database_url() -> str:
    return os.environ.get("DATABASE_URL", "")


def _format_size(size_bytes: int) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if size_bytes < 1024:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024
    return f"{size_bytes:.1f} TB"


def _shorten(value: str, length: int = 20) -> str:
    if not value:
        return "Unknown"
    return value if len(value) <= length else f"{value[:10]}...{value[-8:]}"


@router.get("/{evidence_id}/certificate")
def generate_certificate(evidence_id: str) -> StreamingResponse:
    """Generate a court-admissible Chain of Custody Certificate as a PDF."""
    with psycopg.connect(_database_url(), row_factory=psycopg.rows.dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM evidence WHERE id = %s", (evidence_id,))
            evidence = cur.fetchone()
            if not evidence:
                raise HTTPException(status_code=404, detail="Evidence not found")

            cur.execute(
                """
                SELECT from_custodian, to_custodian, action_type, notes,
                       eth_tx_hash, timestamp
                FROM custody_history
                WHERE evidence_id = %s
                ORDER BY timestamp ASC
                """,
                (evidence_id,),
            )
            custody = [dict(r) for r in cur.fetchall()]

    # Build PDF document
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=0.75 * inch,
        rightMargin=0.75 * inch,
        topMargin=0.6 * inch,
        bottomMargin=0.6 * inch,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "CertTitle",
        parent=styles["Title"],
        fontSize=18,
        spaceAfter=4,
        textColor=colors.HexColor("#0f172a"),
    )
    subtitle_style = ParagraphStyle(
        "CertSubtitle",
        parent=styles["Normal"],
        fontSize=10,
        spaceAfter=16,
        textColor=colors.HexColor("#64748b"),
    )
    heading_style = ParagraphStyle(
        "CertHeading",
        parent=styles["Heading2"],
        fontSize=12,
        spaceBefore=16,
        spaceAfter=8,
        textColor=colors.HexColor("#0f172a"),
    )
    normal_style = ParagraphStyle(
        "CertNormal",
        parent=styles["Normal"],
        fontSize=9,
        leading=13,
    )
    footer_style = ParagraphStyle(
        "CertFooter",
        parent=styles["Normal"],
        fontSize=7,
        textColor=colors.HexColor("#94a3b8"),
    )

    elements: list[Any] = []

    # ── Title ──
    elements.append(Paragraph("CHAIN OF CUSTODY CERTIFICATE", title_style))
    elements.append(
        Paragraph(
            "LEXVAULT &mdash; Digital Evidence Management System",
            subtitle_style,
        )
    )

    # Separator
    sep = Table([[""]], colWidths=[7 * inch])
    sep.setStyle(
        TableStyle(
            [("LINEBELOW", (0, 0), (-1, -1), 1.5, colors.HexColor("#10b981"))]
        )
    )
    elements.append(sep)
    elements.append(Spacer(1, 12))

    # ── Evidence Identity ──
    elements.append(Paragraph("EVIDENCE IDENTITY", heading_style))

    created = evidence["created_at"]
    created_str = (
        created.strftime("%Y-%m-%d %H:%M:%S UTC")
        if hasattr(created, "strftime")
        else str(created)
    )

    identity_data = [
        ["Evidence ID", str(evidence["id"])],
        ["Case Number", evidence["case_number"]],
        ["Title", evidence["title"]],
        ["Original Filename", evidence["file_name"]],
        ["MIME Type", evidence["mime_type"]],
        ["File Size", _format_size(evidence["file_size_bytes"])],
        ["Upload Date", created_str],
    ]
    identity_table = Table(identity_data, colWidths=[1.8 * inch, 5.2 * inch])
    identity_table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#334155")),
                ("TEXTCOLOR", (1, 0), (1, -1), colors.HexColor("#0f172a")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LINEBELOW", (0, 0), (-1, -2), 0.5, colors.HexColor("#e2e8f0")),
            ]
        )
    )
    elements.append(identity_table)
    elements.append(Spacer(1, 8))

    # ── Integrity Verification ──
    elements.append(Paragraph("INTEGRITY VERIFICATION", heading_style))

    tamper_status = "TAMPERED" if evidence["is_tampered"] else "CLEAN"
    tamper_color = (
        colors.HexColor("#ef4444")
        if evidence["is_tampered"]
        else colors.HexColor("#10b981")
    )

    integrity_data = [
        ["SHA-256 Hash", evidence["sha256_hash"]],
        ["Perceptual Hash", evidence.get("phash") or "Pending analysis"],
        ["Tamper Status", tamper_status],
        ["Tamper Score", f"{(evidence.get('tamper_score') or 0.0):.6f}"],
    ]
    integrity_table = Table(integrity_data, colWidths=[1.8 * inch, 5.2 * inch])
    integrity_table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTNAME", (1, 0), (1, 1), "Courier"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#334155")),
                ("TEXTCOLOR", (1, 2), (1, 2), tamper_color),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LINEBELOW", (0, 0), (-1, -2), 0.5, colors.HexColor("#e2e8f0")),
            ]
        )
    )
    elements.append(integrity_table)
    elements.append(Spacer(1, 8))

    # ── Blockchain Anchoring ──
    elements.append(Paragraph("BLOCKCHAIN ANCHORING", heading_style))

    tx_hash = evidence.get("eth_tx_hash", "")
    is_mock = tx_hash.startswith("mock-") if tx_hash else True

    blockchain_data = [
        ["Transaction Hash", tx_hash or "Not available"],
        ["Block Number", str(evidence.get("block_number", "N/A"))],
        ["Mode", "Mock Chain (Local)" if is_mock else "MST Blockchain"],
    ]
    blockchain_table = Table(blockchain_data, colWidths=[1.8 * inch, 5.2 * inch])
    blockchain_table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTNAME", (1, 0), (1, 0), "Courier"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#334155")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LINEBELOW", (0, 0), (-1, -2), 0.5, colors.HexColor("#e2e8f0")),
            ]
        )
    )
    elements.append(blockchain_table)
    elements.append(Spacer(1, 8))

    # ── Chain of Custody ──
    elements.append(Paragraph("CHAIN OF CUSTODY", heading_style))

    if custody:
        header = ["#", "Date / Time", "Action", "From", "To", "Notes"]
        rows = [header]
        for idx, entry in enumerate(custody, 1):
            ts = entry["timestamp"]
            ts_str = (
                ts.strftime("%Y-%m-%d %H:%M")
                if hasattr(ts, "strftime")
                else str(ts)[:16]
            )
            rows.append(
                [
                    str(idx),
                    ts_str,
                    entry["action_type"],
                    _shorten(entry["from_custodian"].strip()),
                    _shorten(entry["to_custodian"].strip()),
                    (entry.get("notes") or "")[:50],
                ]
            )
        custody_table = Table(
            rows,
            colWidths=[
                0.35 * inch,
                1.2 * inch,
                1.3 * inch,
                1.3 * inch,
                1.3 * inch,
                1.55 * inch,
            ],
        )
        custody_table.setStyle(
            TableStyle(
                [
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 8),
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("TEXTCOLOR", (0, 1), (-1, -1), colors.HexColor("#1e293b")),
                    ("ALIGN", (0, 0), (0, -1), "CENTER"),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("TOPPADDING", (0, 0), (-1, -1), 4),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                    (
                        "ROWBACKGROUNDS",
                        (0, 1),
                        (-1, -1),
                        [colors.white, colors.HexColor("#f8fafc")],
                    ),
                ]
            )
        )
        elements.append(custody_table)
    else:
        elements.append(Paragraph("No custody transfers recorded.", normal_style))

    elements.append(Spacer(1, 16))

    # ── QR Code ──
    tx_hash = (evidence.get("eth_tx_hash") or "").strip()
    contract_address = os.getenv("CONTRACT_ADDRESS", "0x62ae3A34D97895EC7f353F0F8AC44ac4B2260c7e").strip()
    explorer_base = os.getenv("BLOCK_EXPLORER_URL", "https://coral.mstscan.com").rstrip("/")

    if tx_hash.startswith("0x") and len(tx_hash) > 10:
        qr_url = f"{explorer_base}/tx/{tx_hash}"
    elif contract_address.startswith("0x"):
        qr_url = f"{explorer_base}/address/{contract_address}"
    else:
        qr_url = f"{explorer_base}/search?q={evidence['sha256_hash']}"

    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )
    qr.add_data(qr_url)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="#000000", back_color="#ffffff")
    qr_buf = BytesIO()
    qr_img.save(qr_buf, format="PNG")
    qr_buf.seek(0)

    qr_row = [
        [
            Paragraph(
                "<b>ON-CHAIN CRYPTOGRAPHIC PROOF (MST BLOCKCHAIN)</b><br/>"
                "<font size=8 color='#334155'>Scan this QR code with any smartphone camera or QR reader to "
                "instantly verify the immutable timestamp, block number, and custody settlement on the public ledger.</font><br/><br/>"
                f"<font size=7.5 color='#1d4ed8'><u><link href=\"{qr_url}\">{qr_url}</link></u></font><br/>"
                f"<font size=7 color='#64748b'>SHA-256 Digest: {evidence['sha256_hash'][:32]}...</font>",
                normal_style,
            ),
            RLImage(qr_buf, width=1.4 * inch, height=1.4 * inch),
        ]
    ]
    qr_table = Table(qr_row, colWidths=[5.4 * inch, 1.6 * inch])
    qr_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ALIGN", (1, 0), (1, 0), "RIGHT"),
            ]
        )
    )
    elements.append(qr_table)
    elements.append(Spacer(1, 14))

    # ── Footer ──
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    elements.append(
        Paragraph(
            f"Generated by LEXVAULT at {now_str}. This document is for "
            f"informational purposes. Verify the SHA-256 hash independently "
            f"before relying on this certificate in legal proceedings.",
            footer_style,
        )
    )

    doc.build(elements)
    buffer.seek(0)

    filename = (
        f"LEXVAULT_Certificate_{evidence['case_number']}_"
        f"{str(evidence['id'])[:8]}.pdf"
    )
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
