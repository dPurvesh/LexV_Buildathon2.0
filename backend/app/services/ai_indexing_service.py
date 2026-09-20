from pathlib import Path
from threading import Lock
from typing import Any

import numpy as np


_clip_lock = Lock()
_clip_model: Any = None
_clip_processor: Any = None
_whisper_lock = Lock()
_whisper_model: Any = None


def _clip() -> tuple[Any, Any]:
    global _clip_model, _clip_processor
    if _clip_model is None or _clip_processor is None:
        with _clip_lock:
            if _clip_model is None or _clip_processor is None:
                import torch
                from transformers import CLIPModel, CLIPProcessor

                _clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
                _clip_model = CLIPModel.from_pretrained(
                    "openai/clip-vit-base-patch32",
                    use_safetensors=True,
                )
                _clip_model.eval()
    return _clip_model, _clip_processor


def _normalize(vector: Any) -> list[float]:
    if hasattr(vector, "detach"):
        values = vector.detach().cpu().numpy().astype(np.float32)
    else:
        values = np.asarray(vector, dtype=np.float32)
    if values.ndim == 1:
        values = values[None, :]
    values /= np.linalg.norm(values, axis=-1, keepdims=True).clip(min=1e-12)
    return values[0].tolist()


def embed_image(path: str) -> list[float]:
    from PIL import Image

    model, processor = _clip()
    with Image.open(path).convert("RGB") as image:
        inputs = processor(images=image, return_tensors="pt")
    with __import__("torch").no_grad():
        features = model.get_image_features(**inputs)
    return _normalize(features)


def embed_image_frames(paths: list[str]) -> list[float]:
    embeddings = [embed_image(path) for path in paths]
    return _normalize(np.asarray(embeddings, dtype=np.float32).mean(axis=0, keepdims=True))


def embed_text(text: str) -> list[float]:
    model, processor = _clip()
    inputs = processor(text=[text], return_tensors="pt", padding=True, truncation=True)
    with __import__("torch").no_grad():
        features = model.get_text_features(**inputs)
    return _normalize(features)


def _whisper() -> Any:
    global _whisper_model
    if _whisper_model is None:
        with _whisper_lock:
            if _whisper_model is None:
                from faster_whisper import WhisperModel

                _whisper_model = WhisperModel("base", device="cpu", compute_type="int8")
    return _whisper_model


def transcribe(path: str) -> dict[str, Any]:
    segments, _ = _whisper().transcribe(path, word_timestamps=True)
    text_parts: list[str] = []
    words: list[dict[str, Any]] = []
    for segment in segments:
        text_parts.append(segment.text.strip())
        for word in segment.words or []:
            words.append({"word": word.word, "start": word.start, "end": word.end})
    return {"text": " ".join(part for part in text_parts if part), "words": words}


def extract_video_frames(path: str, output_dir: str, limit: int = 8) -> list[str]:
    import cv2

    capture = cv2.VideoCapture(path)
    frame_count = int(capture.get(cv2.CAP_PROP_FRAME_COUNT))
    indices = np.linspace(0, max(frame_count - 1, 0), num=min(limit, max(frame_count, 1)), dtype=int)
    paths: list[str] = []
    for position, index in enumerate(dict.fromkeys(indices.tolist())):
        capture.set(cv2.CAP_PROP_POS_FRAMES, index)
        success, frame = capture.read()
        if success:
            frame_path = str(Path(output_dir) / f"frame-{position}.jpg")
            cv2.imwrite(frame_path, frame)
            paths.append(frame_path)
    capture.release()
    return paths