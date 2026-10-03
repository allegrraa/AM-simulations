from __future__ import annotations

from pathlib import Path
from typing import BinaryIO


ROOT = Path(__file__).resolve().parents[2]
UPLOAD_DIR = ROOT / "uploads"


def ensure_project_dir(project_id: str) -> Path:
    project_dir = UPLOAD_DIR / project_id
    project_dir.mkdir(parents=True, exist_ok=True)
    return project_dir


def save_bytes(project_id: str, filename: str, content: bytes) -> Path:
    project_dir = ensure_project_dir(project_id)
    target = project_dir / filename
    target.write_bytes(content)
    return target


def save_uploaded_file(project_id: str, filename: str, file_obj: BinaryIO) -> Path:
    content = file_obj.read()
    return save_bytes(project_id, filename, content)


def get_project_dir(project_id: str) -> Path:
    return UPLOAD_DIR / project_id
