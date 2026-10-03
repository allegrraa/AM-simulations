from __future__ import annotations

from typing import Any, Dict, List

from backend.app.reconstruction.base import ReconstructionEngine, ReconstructionResult


class PhotogrammetryReconstructionEngine(ReconstructionEngine):
    def reconstruct(self, images: List[Dict[str, Any]]) -> ReconstructionResult:
        return ReconstructionResult(
            reconstruction_type="photogrammetry_stub",
            point_cloud_path="photogrammetry_point_cloud.ply",
            mesh_path="photogrammetry_mesh.stl",
            confidence=0.45,
            warnings=["Photogrammetry integration scaffold added; real reconstruction is not yet connected for the demo."],
            status="processing",
        )
