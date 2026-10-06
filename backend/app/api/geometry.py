from __future__ import annotations

from fastapi import APIRouter, File, HTTPException, UploadFile

from backend.app.models.geometry import GeometryComparison
from backend.app.services.geometry_service import compare_geometry, parse_point_cloud, parse_stl_mesh
from backend.app.services.project_store import get_project, update_project
from backend.app.storage.file_storage import save_uploaded_file, stored_mesh_response

router = APIRouter()


@router.get("/projects/{project_id}/asbuilt/mesh")
def download_asbuilt_mesh(project_id: str):
    project = get_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return stored_mesh_response(project_id, project.get("as_built_model"))


@router.post("/projects/{project_id}/asbuilt/pointcloud")
def upload_asbuilt_pointcloud(project_id: str, file: UploadFile = File(...)):
    project = get_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    filename = file.filename or "asbuilt_pointcloud.ply"
    saved_path = save_uploaded_file(project_id, filename, file.file)
    metadata = parse_point_cloud(saved_path)
    project["point_cloud_path"] = str(saved_path)
    project["as_built_model"] = str(saved_path)
    project["geometry_metadata"] = project.get("geometry_metadata", {})
    project["geometry_metadata"]["as_built"] = metadata
    update_project(project_id, point_cloud_path=str(saved_path), as_built_model=str(saved_path), geometry_metadata=project["geometry_metadata"])
    return {"filename": filename, "point_count": metadata["point_count"], "centroid": metadata["centroid"], "scale": metadata["scale"]}


@router.post("/projects/{project_id}/asbuilt/mesh")
def upload_asbuilt_mesh(project_id: str, file: UploadFile = File(...)):
    project = get_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    filename = file.filename or "asbuilt_mesh.stl"
    saved_path = save_uploaded_file(project_id, filename, file.file)
    metadata = parse_stl_mesh(saved_path, source_type="uploaded_mesh")
    project["as_built_model"] = str(saved_path)
    project["geometry_metadata"] = project.get("geometry_metadata", {})
    project["geometry_metadata"]["as_built"] = metadata.model_dump()
    update_project(project_id, as_built_model=str(saved_path), as_built_model_name=filename, geometry_metadata=project["geometry_metadata"])
    return {"project_id": project_id, "source_type": "uploaded_mesh", "filename": filename, "geometry_metadata": metadata.model_dump()}


@router.post("/projects/{project_id}/compare")
def compare_design_and_asbuilt(project_id: str):
    project = get_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    if not project.get("design_model") or not project.get("as_built_model"):
        raise HTTPException(status_code=400, detail="Both design and as-built meshes are required")
    comparison = compare_geometry(project["design_model"], project["as_built_model"])
    project["geometry_comparison"] = comparison.model_dump()
    update_project(project_id, geometry_comparison=project["geometry_comparison"])
    return comparison.model_dump()
