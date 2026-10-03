from __future__ import annotations

import uuid
from pathlib import Path
from typing import Any, Dict, List

from backend.app.services.project_store import get_project
from backend.app.storage.file_storage import save_bytes


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


class MockReconstructionEngine:
    def reconstruct(self, images: List[Dict[str, Any]]) -> ReconstructionResult:
        point_cloud_path = "mock_point_cloud.ply"
        mesh_path = "mock_mesh.stl"
        warnings = ["Mock reconstruction engine is being used for the MVP demo."]
        return ReconstructionResult(
            reconstruction_type="mock",
            point_cloud_path=point_cloud_path,
            mesh_path=mesh_path,
            confidence=0.82,
            warnings=warnings,
            status="completed",
        )


class PhotogrammetryReconstructionEngine:
    def reconstruct(self, images: List[Dict[str, Any]]) -> ReconstructionResult:
        return ReconstructionResult(
            reconstruction_type="photogrammetry",
            point_cloud_path="photogrammetry_point_cloud.ply",
            mesh_path="photogrammetry_mesh.stl",
            confidence=0.55,
            warnings=["Photogrammetry adapter is scaffolded but not yet validated in the MVP."],
            status="processing",
        )


class ReconstructionService:
    def __init__(self, engine=None):
        self.engine = engine or MockReconstructionEngine()

    def reconstruct(self, project_id: str, scan_id: str, images: List[Dict[str, Any]]) -> Dict[str, Any]:
        result = self.engine.reconstruct(images)
        project = get_project(project_id)
        if project is None:
            raise KeyError(f"Project {project_id} not found")
        point_cloud_name = f"{scan_id}_pointcloud.ply"
        mesh_name = f"{scan_id}_mesh.stl"
        save_bytes(project_id, point_cloud_name, b"ply\nformat ascii 1.0\ncomment mock\nelement vertex 4\nproperty float x\nproperty float y\nproperty float z\nend_header\n0 0 0\n1 0 0\n0 1 0\n0 0 1\n")
        save_bytes(project_id, mesh_name, b"solid mock_mesh\n facet normal 0 0 1\n  outer loop\n   vertex 0 0 0\n   vertex 1 0 0\n   vertex 0 1 0\n  endloop\n endfacet\nendsolid mock_mesh\n")
        return {
            "status": result.status,
            "reconstruction_type": result.reconstruction_type,
            "confidence": result.confidence,
            "warnings": result.warnings,
            "point_cloud_id": point_cloud_name,
            "mesh_id": mesh_name,
        }
