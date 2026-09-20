from io import BytesIO
from typing import Any

import imagehash
import numpy as np
from PIL import Image, ImageChops, ImageEnhance, ImageStat


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
        result = _analyze_rgb(original.convert("RGB"))

    return result


def analyze_image_bytes(data: bytes) -> dict[str, Any]:
    with BytesIO(data) as source:
        with Image.open(source) as image:
            return _analyze_rgb(image.convert("RGB"))