from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List

from backend.app.reconstruction.mock_reconstruction import MockReconstructionEngine
from backend.app.reconstruction.photogrammetry import PhotogrammetryReconstructionEngine
from backend.app.services.project_store import get_project


class ReconstructionResult:
    def __init__(self, reconstruction_type: str, point_cloud_path: str, mesh_path: str, confidence: float, warnings: List[str], status: str):
        self.reconstruction_type = reconstruction_type
        self.point_cloud_path = point_cloud_path
        self.mesh_path = mesh_path
        self.confidence = confidence
        self.warnings = warnings
        self.status = status

    def to_dict(self) -> Dict[str, Any]:
        return {
            "reconstruction_type": self.reconstruction_type,
            "point_cloud_path": self.point_cloud_path,
            "mesh_path": self.mesh_path,
            "confidence": self.confidence,
            "warnings": self.warnings,
            "status": self.status,
        }


class ReconstructionService:
    def __init__(self, engine=None):
        self.engine = engine or PhotogrammetryReconstructionEngine()

    def reconstruct(self, project_id: str, scan_id: str, images: List[Dict[str, Any]]) -> Dict[str, Any]:
        project = get_project(project_id)
        if project is None:
            raise KeyError(f"Project {project_id} not found")

        try:
            result = self.engine.reconstruct(images, project_id=project_id, scan_id=scan_id)
        except TypeError:
            result = self.engine.reconstruct(images)

        point_cloud_name = Path(result.point_cloud_path).name
        mesh_name = Path(result.mesh_path).name
        return {
            "status": result.status,
            "reconstruction_type": result.reconstruction_type,
            "confidence": result.confidence,
            "warnings": result.warnings,
            "point_cloud_id": point_cloud_name,
            "mesh_id": mesh_name,
        }
