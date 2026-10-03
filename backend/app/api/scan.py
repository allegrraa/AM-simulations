from __future__ import annotations

from typing import List

from fastapi import APIRouter, File, HTTPException, UploadFile

from backend.app.services.project_store import get_project, get_scan
from backend.app.services.scan_service import ScanService

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
    completed = ScanService().complete_scan(project_id, scan_id)
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
