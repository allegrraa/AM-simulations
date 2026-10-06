from __future__ import annotations

from fastapi import APIRouter, File, HTTPException, UploadFile

from backend.app.models.project import ProjectCreate, ProjectRecordModel, ProjectResponse
from backend.app.services.geometry_service import parse_stl_mesh
from backend.app.services.project_store import create_project, get_project, update_project
from backend.app.storage.file_storage import save_uploaded_file, stored_mesh_response

router = APIRouter()


@router.get("/projects/{project_id}/design/mesh")
def download_design_mesh(project_id: str):
    project = get_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return stored_mesh_response(project_id, project.get("design_model"))


@router.post("/projects", response_model=ProjectResponse)
def create_project_route(request: ProjectCreate):
    project = create_project(request.name)
    payload = {
        **project,
        "scan_sessions": list(project.get("scan_sessions", {}).keys()) if isinstance(project.get("scan_sessions"), dict) else list(project.get("scan_sessions", [])),
    }
    return ProjectResponse(**payload)


@router.get("/projects/{project_id}", response_model=ProjectRecordModel)
def get_project_route(project_id: str):
    project = get_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    payload = {
        **project,
        "scan_sessions": list(project.get("scan_sessions", {}).keys()) if isinstance(project.get("scan_sessions"), dict) else list(project.get("scan_sessions", [])),
    }
    return ProjectRecordModel(**payload)


@router.post("/projects/{project_id}/design")
def upload_design_mesh(project_id: str, file: UploadFile = File(...)):
    project = get_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    filename = file.filename or "design.stl"
    saved_path = save_uploaded_file(project_id, filename, file.file)
    metadata = parse_stl_mesh(saved_path, source_type="uploaded_stl")
    project["design_model"] = str(saved_path)
    project["design_model_name"] = filename
    project["geometry_metadata"] = project.get("geometry_metadata", {})
    project["geometry_metadata"]["design"] = metadata.model_dump()
    update_project(project_id, design_model=str(saved_path), design_model_name=filename, geometry_metadata=project["geometry_metadata"])
    return {
        "project_id": project_id,
        "source_type": "uploaded_stl",
        "filename": filename,
        "geometry_metadata": metadata.model_dump(),
    }
