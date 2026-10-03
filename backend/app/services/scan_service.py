from __future__ import annotations

import uuid
from pathlib import Path
from typing import Any, Dict, List

from fastapi import UploadFile

from backend.app.services.geometry_service import parse_stl_mesh
from backend.app.services.project_store import add_scan, get_project, get_scan, update_project
from backend.app.services.reconstruction_service import ReconstructionService
from backend.app.storage.file_storage import get_project_dir, save_uploaded_file


class ScanService:
    def create_scan(self, project_id: str, *, source: str = "phone") -> Dict[str, Any]:
        project = get_project(project_id)
        if project is None:
            raise KeyError(f"Project {project_id} not found")
        scan_id = str(uuid.uuid4())
        payload = {
            "scan_id": scan_id,
            "status": "collecting",
            "source": source,
            "images": [],
            "images_received": 0,
            "reconstruction_type": None,
            "point_cloud_id": None,
            "mesh_id": None,
            "warnings": [],
            "progress": 0.0,
        }
        add_scan(project_id, scan_id, payload)
        return payload

    def add_images(self, project_id: str, scan_id: str, files: List[UploadFile]) -> Dict[str, Any]:
        scan = get_scan(project_id, scan_id)
        if scan is None:
            raise KeyError(f"Scan {scan_id} not found")
        for index, file in enumerate(files, start=1):
            name = file.filename or f"scan_image_{len(scan['images']) + 1}.png"
            saved = save_uploaded_file(project_id, f"scan_{scan_id}_{index}_{name}", file.file)
            scan["images"].append({
                "filename": name,
                "path": str(saved),
                "capture_order": len(scan["images"]) + 1,
                "quality_score": 0.85,
            })
        scan["images_received"] = len(scan["images"])
        scan["progress"] = min(0.75, 0.1 + 0.05 * len(scan["images"]))
        return scan

    def complete_scan(self, project_id: str, scan_id: str) -> Dict[str, Any]:
        scan = get_scan(project_id, scan_id)
        if scan is None:
            raise KeyError(f"Scan {scan_id} not found")
        scan["status"] = "processing"
        scan["progress"] = 0.75
        result = ReconstructionService().reconstruct(project_id, scan_id, scan["images"])
        scan["status"] = result["status"]
        scan["reconstruction_type"] = result["reconstruction_type"]
        scan["warnings"] = result["warnings"]
        scan["point_cloud_id"] = result["point_cloud_id"]
        scan["mesh_id"] = result["mesh_id"]
        scan["progress"] = 1.0
        mesh_path = (get_project_dir(project_id) / result["mesh_id"]).resolve()
        mesh_metadata = parse_stl_mesh(mesh_path, source_type="image_derived_mesh").model_dump()
        project = get_project(project_id)
        geometry_metadata = project.get("geometry_metadata", {})
        geometry_metadata["as_built"] = mesh_metadata
        update_project(
            project_id,
            as_built_model=str(mesh_path),
            geometry_metadata=geometry_metadata,
        )
        return scan

    def get_scan_status(self, project_id: str, scan_id: str) -> Dict[str, Any]:
        scan = get_scan(project_id, scan_id)
        if scan is None:
            raise KeyError(f"Scan {scan_id} not found")
        return scan
