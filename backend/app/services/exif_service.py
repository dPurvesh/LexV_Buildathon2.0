import io
import math
from typing import Any
from PIL import Image
from PIL.ExifTags import Base, IFD, TAGS, GPSTAGS

# Known photo-editing / manipulation software signatures
SUSPICIOUS_SOFTWARE_KEYWORDS = [
    "photoshop",
    "gimp",
    "lightroom",
    "snapseed",
    "picsart",
    "canva",
    "after effects",
    "premiere",
    "apple photos",
    "picasa",
    "pixelmator",
    "affinity",
    "coreldraw",
    "paint.net",
    "vsco",
    "facetune",
    "procreate",
]


def _to_decimal_degrees(val: Any) -> float | None:
    """Convert EXIF GPS coordinates (degrees, minutes, seconds) to decimal degrees."""
    try:
        if isinstance(val, (int, float)):
            return float(val)
        if isinstance(val, (tuple, list)) and len(val) >= 3:
            d = float(val[0])
            m = float(val[1])
            s = float(val[2])
            return d + (m / 60.0) + (s / 3600.0)
        return None
    except Exception:
        return None


def extract_exif_metadata(image_bytes: bytes) -> dict[str, Any]:
    """
    Extract comprehensive forensic EXIF metadata, GPS coordinates,
    and detect digital software modification signatures.
    """
    try:
        with Image.open(io.BytesIO(image_bytes)) as img:
            exif = img.getexif()
            if not exif:
                return {
                    "has_exif": False,
                    "is_stripped": True,
                    "is_software_modified": False,
                    "software": None,
                    "warning": "EXIF metadata is absent or stripped (common indicator of web re-encoding or sanitization).",
                    "camera": {},
                    "gps": {"has_gps": False},
                    "timestamps": {},
                    "tamper_indicators": ["EXIF metadata absent/stripped"],
                    "raw_tags": {},
                }

            raw_tags: dict[str, Any] = {}
            for tag_id, value in exif.items():
                tag_name = TAGS.get(tag_id, str(tag_id))
                if isinstance(value, bytes):
                    continue
                str_val = str(value)
                if len(str_val) < 250:
                    raw_tags[tag_name] = str_val

            # 1. Camera Hardware Info
            make = raw_tags.get("Make")
            model = raw_tags.get("Model")
            lens_model = raw_tags.get("LensModel")
            focal_length = raw_tags.get("FocalLength")
            iso = raw_tags.get("ISOSpeedRatings") or raw_tags.get("PhotographicSensitivity")
            exposure_time = raw_tags.get("ExposureTime")
            f_number = raw_tags.get("FNumber")
            serial_number = (
                raw_tags.get("BodySerialNumber")
                or raw_tags.get("SerialNumber")
                or raw_tags.get("CameraSerialNumber")
            )

            # 2. Software & Tamper Checks
            software = raw_tags.get("Software") or raw_tags.get("ProcessingSoftware")
            is_software_modified = False
            tamper_indicators: list[str] = []
            modification_warning = None

            if software:
                sw_lower = software.lower()
                for keyword in SUSPICIOUS_SOFTWARE_KEYWORDS:
                    if keyword in sw_lower:
                        is_software_modified = True
                        tamper_indicators.append(
                            f"Image manipulation suite detected in EXIF header: '{software}'"
                        )
                        modification_warning = (
                            f"CRITICAL FORENSIC ALERT: Software signature '{software}' detected. "
                            f"Asset was digitally edited or re-exported post-capture."
                        )
                        break

            # 3. Timestamps & Discrepancies
            dt_original = raw_tags.get("DateTimeOriginal")
            dt_digitized = raw_tags.get("DateTimeDigitized")
            dt_modified = raw_tags.get("DateTime")
            discrepancy_detected = False

            if dt_original and dt_modified and dt_original != dt_modified:
                discrepancy_detected = True
                is_software_modified = True
                tamper_indicators.append(
                    f"Timestamp divergence: Shutter capture ({dt_original}) != File modification ({dt_modified})"
                )
                if not modification_warning:
                    modification_warning = (
                        f"FORENSIC ALERT: File timestamp ({dt_modified}) differs from camera shutter timestamp ({dt_original})."
                    )

            # 4. GPS Geolocation
            gps_info: dict[str, Any] = {"has_gps": False}
            try:
                gps_ifd = exif.get_ifd(IFD.GPSInfo)
                if gps_ifd:
                    lat_raw = gps_ifd.get(2)  # GPSLatitude
                    lat_ref = gps_ifd.get(1)  # GPSLatitudeRef ('N' or 'S')
                    lon_raw = gps_ifd.get(4)  # GPSLongitude
                    lon_ref = gps_ifd.get(3)  # GPSLongitudeRef ('E' or 'W')
                    alt_raw = gps_ifd.get(6)  # GPSAltitude

                    lat = _to_decimal_degrees(lat_raw)
                    lon = _to_decimal_degrees(lon_raw)

                    if lat is not None and lon is not None:
                        if lat_ref == "S":
                            lat = -lat
                        if lon_ref == "W":
                            lon = -lon

                        alt = None
                        if alt_raw:
                            try:
                                alt = round(float(alt_raw), 1)
                            except Exception:
                                alt = None

                        lat = round(lat, 6)
                        lon = round(lon, 6)

                        gps_info = {
                            "has_gps": True,
                            "latitude": lat,
                            "longitude": lon,
                            "altitude": alt,
                            "latitude_ref": str(lat_ref or "N"),
                            "longitude_ref": str(lon_ref or "E"),
                            "maps_url": f"https://www.google.com/maps?q={lat},{lon}",
                            "osm_url": f"https://www.openstreetmap.org/?mlat={lat}&mlon={lon}#map=16/{lat}/{lon}",
                        }
            except Exception:
                pass

            return {
                "has_exif": True,
                "is_stripped": False,
                "is_software_modified": is_software_modified,
                "software": software,
                "warning": modification_warning,
                "tamper_indicators": tamper_indicators,
                "camera": {
                    "make": make,
                    "model": model,
                    "serial_number": serial_number,
                    "lens_model": lens_model,
                    "focal_length": str(focal_length) if focal_length else None,
                    "iso": str(iso) if iso else None,
                    "exposure_time": str(exposure_time) if exposure_time else None,
                    "f_number": str(f_number) if f_number else None,
                },
                "gps": gps_info,
                "timestamps": {
                    "original": dt_original,
                    "digitized": dt_digitized,
                    "modified": dt_modified,
                    "discrepancy_detected": discrepancy_detected,
                },
                "raw_tags": raw_tags,
            }
    except Exception as e:
        return {
            "has_exif": False,
            "is_stripped": True,
            "is_software_modified": False,
            "software": None,
            "warning": f"EXIF extraction error: {e}",
            "camera": {},
            "gps": {"has_gps": False},
            "timestamps": {},
            "tamper_indicators": [],
            "raw_tags": {},
        }

