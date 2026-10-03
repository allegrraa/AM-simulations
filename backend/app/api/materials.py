from __future__ import annotations

from fastapi import APIRouter, HTTPException

from backend.app.models.material import MaterialBundle
from backend.app.services.project_store import get_project, update_project

router = APIRouter()


@router.put("/projects/{project_id}/materials")
def set_materials(project_id: str, bundle: MaterialBundle):
    project = get_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    payload = {
        "design": bundle.design.model_dump(),
        "as_built": bundle.as_built.model_dump(),
    }
    update_project(project_id, materials=payload)
    return payload
