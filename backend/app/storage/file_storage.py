from __future__ import annotations

from pathlib import Path
from typing import BinaryIO
from uuid import uuid4

from fastapi import HTTPException
from fastapi.responses import FileResponse


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
    return save_bytes(project_id, f"{uuid4().hex}_{Path(filename).name}", content)


def get_project_dir(project_id: str) -> Path:
    return UPLOAD_DIR / project_id


def stored_mesh_response(project_id: str, stored_path: str | None) -> FileResponse:
    """Serve only the registered STL inside this project's upload directory."""
    if stored_path:
        project_dir = get_project_dir(project_id).resolve()
        path = Path(stored_path).resolve()
        if (project_dir.parent == UPLOAD_DIR.resolve() and path.parent == project_dir
                and path.suffix.lower() == ".stl" and path.is_file()):
            return FileResponse(path, media_type="model/stl", filename="mesh.stl",
                                headers={"Cache-Control": "no-store"})
    raise HTTPException(status_code=404, detail="Stored STL mesh is unavailable for this project")
