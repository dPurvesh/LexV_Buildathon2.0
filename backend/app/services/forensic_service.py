import base64
import difflib
from io import BytesIO
from typing import Any

import cv2
import imagehash
import numpy as np
from PIL import Image, ImageChops, ImageEnhance


def _analyze_rgb(image: Image.Image) -> dict[str, Any]:
    phash = str(imagehash.phash(image))
    ela_buffer = BytesIO()
    image.save(ela_buffer, format="JPEG", quality=90)
    ela_buffer.seek(0)
    recompressed = Image.open(ela_buffer).convert("RGB")
    difference = ImageChops.difference(image, recompressed)
    extrema = difference.getextrema()
    scale = max(max(channel) for channel in extrema) or 1
    enhanced = ImageEnhance.Brightness(difference).enhance(255 / scale)
    pixels = np.asarray(enhanced, dtype=np.float32) / 255.0
    mean_error = float(pixels.mean())
    high_error_ratio = float((pixels.mean(axis=2) > 0.35).mean())
    anomaly_score = min(1.0, (mean_error * 0.7) + (high_error_ratio * 0.3))
    return {
        "is_tampered": anomaly_score >= 0.25,
        "tamper_score": round(anomaly_score, 6),
        "phash": phash,
    }


def analyze_image(path: str) -> dict[str, Any]:
    with Image.open(path) as original:
        return _analyze_rgb(original.convert("RGB"))


def analyze_image_bytes(data: bytes) -> dict[str, Any]:
    with BytesIO(data) as source:
        with Image.open(source) as image:
            return _analyze_rgb(image.convert("RGB"))


def compute_phash_from_bytes(data: bytes) -> str | None:
    """Compute perceptual hash from image bytes."""
    try:
        with BytesIO(data) as source:
            with Image.open(source) as image:
                return str(imagehash.phash(image.convert("RGB")))
    except Exception:
        return None


def compute_phash_hamming_distance(hash1_str: str, hash2_str: str) -> int:
    """Compute bitwise Hamming distance between two hex pHash strings."""
    try:
        h1 = imagehash.hex_to_hash(hash1_str)
        h2 = imagehash.hex_to_hash(hash2_str)
        return int(h1 - h2)
    except Exception:
        return 64


def generate_ela_heatmap_b64(image_bytes: bytes, max_dim: int = 1200) -> dict[str, Any]:
    """Generate an Error Level Analysis heatmap and base64 strings from raw image bytes."""
    with Image.open(BytesIO(image_bytes)) as img:
        original = img.convert("RGB")

    # Resize if very large
    if max(original.size) > max_dim:
        ratio = max_dim / max(original.size)
        new_size = (int(original.width * ratio), int(original.height * ratio))
        original = original.resize(new_size, Image.LANCZOS)

    analysis = _analyze_rgb(original)

    # ELA difference
    ela_buf = BytesIO()
    original.save(ela_buf, format="JPEG", quality=90)
    ela_buf.seek(0)
    recompressed = Image.open(ela_buf).convert("RGB")

    difference = ImageChops.difference(original, recompressed)
    extrema = difference.getextrema()
    scale = max(max(ch) for ch in extrema) or 1
    enhanced = ImageEnhance.Brightness(difference).enhance(255 / scale)

    # OpenCV JET heatmap
    gray = cv2.cvtColor(np.array(enhanced, dtype=np.uint8), cv2.COLOR_RGB2GRAY)
    heatmap_bgr = cv2.applyColorMap(gray, cv2.COLORMAP_JET)
    heatmap_rgb = cv2.cvtColor(heatmap_bgr, cv2.COLOR_BGR2RGB)
    heatmap_img = Image.fromarray(heatmap_rgb)

    # Base64 outputs
    heatmap_out = BytesIO()
    heatmap_img.save(heatmap_out, format="PNG")
    heatmap_b64 = base64.b64encode(heatmap_out.getvalue()).decode("ascii")

    original_out = BytesIO()
    original.save(original_out, format="PNG")
    original_b64 = base64.b64encode(original_out.getvalue()).decode("ascii")

    # Red Tamper Mask Overlay with Bounding Box
    orig_np = np.array(original, dtype=np.uint8)
    thresh_val = max(55, int(np.percentile(gray, 92)))
    mask = gray > thresh_val
    overlay = orig_np.copy()
    overlay[mask] = [239, 68, 68]
    blended = cv2.addWeighted(orig_np, 0.45, overlay, 0.55, 0)

    contours, _ = cv2.findContours(mask.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    tamper_boxes = []
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area > 80:
            x, y, w, h = cv2.boundingRect(cnt)
            tamper_boxes.append({"x": int(x), "y": int(y), "w": int(w), "h": int(h), "area": int(area)})
            cv2.rectangle(blended, (x, y), (x + w, y + h), (239, 68, 68), 2)
            cv2.putText(blended, "ANOMALY", (x, max(y - 6, 12)), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (239, 68, 68), 1, cv2.LINE_AA)

    red_img = Image.fromarray(blended)
    red_out = BytesIO()
    red_img.save(red_out, format="PNG")
    red_overlay_b64 = base64.b64encode(red_out.getvalue()).decode("ascii")

    return {
        "original_b64": original_b64,
        "heatmap_b64": heatmap_b64,
        "red_overlay_b64": red_overlay_b64,
        "tamper_boxes": tamper_boxes,
        "tamper_score": analysis["tamper_score"],
        "is_tampered": analysis["is_tampered"],
        "phash": analysis["phash"],
        "width": original.width,
        "height": original.height,
    }


def generate_visual_diff_heatmap_b64(
    orig_bytes: bytes,
    modified_bytes: bytes,
    max_dim: int = 1200,
) -> dict[str, Any] | None:
    """Generate pixel-by-pixel difference heatmap between original and modified image."""
    try:
        with Image.open(BytesIO(orig_bytes)) as orig_img, Image.open(BytesIO(modified_bytes)) as mod_img:
            orig = orig_img.convert("RGB")
            mod = mod_img.convert("RGB")

        # Normalize dimensions to original
        if orig.size != mod.size:
            mod = mod.resize(orig.size, Image.LANCZOS)

        # Scale down if too large
        if max(orig.size) > max_dim:
            ratio = max_dim / max(orig.size)
            new_size = (int(orig.width * ratio), int(orig.height * ratio))
            orig = orig.resize(new_size, Image.LANCZOS)
            mod = mod.resize(new_size, Image.LANCZOS)

        orig_np = np.array(orig, dtype=np.uint8)
        mod_np = np.array(mod, dtype=np.uint8)

        # Absolute pixel difference
        abs_diff = cv2.absdiff(orig_np, mod_np)
        diff_gray = cv2.cvtColor(abs_diff, cv2.COLOR_RGB2GRAY)

        # Quantify divergence
        changed_pixels = float((diff_gray > 15).mean())
        # Enhance difference visibility
        diff_boosted = cv2.normalize(diff_gray, None, 0, 255, cv2.NORM_MINMAX)
        heatmap_bgr = cv2.applyColorMap(diff_boosted, cv2.COLORMAP_JET)
        heatmap_rgb = cv2.cvtColor(heatmap_bgr, cv2.COLOR_BGR2RGB)
        heatmap_img = Image.fromarray(heatmap_rgb)

        diff_out = BytesIO()
        heatmap_img.save(diff_out, format="PNG")
        diff_b64 = base64.b64encode(diff_out.getvalue()).decode("ascii")

        # Red Tamper Mask Overlay with Bounding Box
        mask = diff_gray > 15
        overlay = mod_np.copy()
        overlay[mask] = [239, 68, 68]
        blended = cv2.addWeighted(mod_np, 0.45, overlay, 0.55, 0)

        contours, _ = cv2.findContours(mask.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        tamper_boxes = []
        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area > 35:
                x, y, w, h = cv2.boundingRect(cnt)
                tamper_boxes.append({"x": int(x), "y": int(y), "w": int(w), "h": int(h), "area": int(area)})
                cv2.rectangle(blended, (x, y), (x + w, y + h), (239, 68, 68), 2)
                cv2.putText(blended, "ALTERED", (x, max(y - 6, 12)), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (239, 68, 68), 1, cv2.LINE_AA)

        red_img = Image.fromarray(blended)
        red_out = BytesIO()
        red_img.save(red_out, format="PNG")
        red_b64 = base64.b64encode(red_out.getvalue()).decode("ascii")

        orig_out = BytesIO()
        orig.save(orig_out, format="PNG")
        orig_b64 = base64.b64encode(orig_out.getvalue()).decode("ascii")

        return {
            "diff_heatmap_b64": diff_b64,
            "red_overlay_b64": red_b64,
            "original_b64": orig_b64,
            "changed_pixels_ratio": round(changed_pixels, 4),
            "tamper_boxes": tamper_boxes,
        }
    except Exception:
        return None


def extract_pdf_text_from_bytes(pdf_bytes: bytes) -> str:
    """Extract all readable text from PDF bytes."""
    try:
        from pypdf import PdfReader
        reader = PdfReader(BytesIO(pdf_bytes))
        pages_text: list[str] = []
        for page in reader.pages:
            t = page.extract_text()
            if t:
                pages_text.append(t.strip())
        return "\n\n".join(pages_text).strip()
    except Exception:
        return ""


def analyze_text_diff(original_text: str, modified_text: str) -> dict[str, Any]:
    """Compute text similarity and diff lines between original and modified text."""
    orig_lines = [l.strip() for l in original_text.splitlines() if l.strip()]
    mod_lines = [l.strip() for l in modified_text.splitlines() if l.strip()]

    matcher = difflib.SequenceMatcher(None, original_text, modified_text)
    similarity = round(matcher.ratio(), 4)

    # Line by line diff
    differ = difflib.Differ()
    diff = list(differ.compare(orig_lines, mod_lines))
    added = [l[2:] for l in diff if l.startswith("+ ")]
    removed = [l[2:] for l in diff if l.startswith("- ")]

    return {
        "similarity_ratio": similarity,
        "is_tampered": similarity < 0.999,
        "lines_added_count": len(added),
        "lines_removed_count": len(removed),
        "added_samples": added[:5],
        "removed_samples": removed[:5],
    }