from __future__ import annotations

from pathlib import Path
from typing import List

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse

from backend.app.services.project_store import get_project, get_scan
from backend.app.services.scan_service import ScanService
from backend.app.storage.file_storage import get_project_dir

router = APIRouter()


@router.post("/projects/{project_id}/scan")
def create_scan(project_id: str):
    project = get_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return ScanService().create_scan(project_id, source="phone")


@router.post("/projects/{project_id}/scan/{scan_id}/images")
def upload_scan_images(project_id: str, scan_id: str, files: List[UploadFile] = File(...)):
    if not files:
        raise HTTPException(status_code=400, detail="No files were uploaded")
    scan = get_scan(project_id, scan_id)
    if scan is None:
        raise HTTPException(status_code=404, detail="Scan not found")
    updated = ScanService().add_images(project_id, scan_id, files)
    return {"scan_id": scan_id, "images_received": updated["images_received"], "progress": updated["progress"]}


@router.post("/projects/{project_id}/scan/{scan_id}/complete")
def complete_scan(project_id: str, scan_id: str):
    scan = get_scan(project_id, scan_id)
    if scan is None:
        raise HTTPException(status_code=404, detail="Scan not found")
    try:
        completed = ScanService().complete_scan(project_id, scan_id)
    except ValueError as exc:
        scan["status"] = "failed"
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {
        "status": completed["status"],
        "reconstruction_type": completed.get("reconstruction_type"),
        "point_cloud_id": completed.get("point_cloud_id"),
        "mesh_id": completed.get("mesh_id"),
        "warnings": completed.get("warnings", []),
    }


@router.get("/projects/{project_id}/scan/{scan_id}")
def get_scan_status(project_id: str, scan_id: str):
    scan = get_scan(project_id, scan_id)
    if scan is None:
        raise HTTPException(status_code=404, detail="Scan not found")
    return {
        "status": scan["status"],
        "images_received": scan["images_received"],
        "progress": scan["progress"],
        "reconstruction_type": scan.get("reconstruction_type"),
        "point_cloud_id": scan.get("point_cloud_id"),
        "mesh_id": scan.get("mesh_id"),
        "warnings": scan.get("warnings", []),
    }


@router.get("/projects/{project_id}/scan/{scan_id}/mesh")
def download_scan_mesh(project_id: str, scan_id: str):
    if get_project(project_id) is None:
        raise HTTPException(status_code=404, detail="Project not found")
    scan = get_scan(project_id, scan_id)
    if scan is None or not scan.get("mesh_id"):
        raise HTTPException(status_code=404, detail="Reconstructed mesh not found")

    mesh_name = scan["mesh_id"]
    if Path(mesh_name).name != mesh_name:
        raise HTTPException(status_code=404, detail="Reconstructed mesh not found")
    project_dir = get_project_dir(project_id).resolve()
    mesh_path = (project_dir / mesh_name).resolve()
    if mesh_path.parent != project_dir or not mesh_path.is_file():
        raise HTTPException(status_code=404, detail="Reconstructed mesh not found")
    return FileResponse(mesh_path, media_type="model/stl", filename=mesh_name)
