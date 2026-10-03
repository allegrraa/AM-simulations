from __future__ import annotations

from typing import Any, Dict, List

from backend.app.reconstruction.base import ReconstructionEngine, ReconstructionResult


class MockReconstructionEngine(ReconstructionEngine):
    def reconstruct(self, images: List[Dict[str, Any]]) -> ReconstructionResult:
        return ReconstructionResult(
            reconstruction_type="mock",
            point_cloud_path="mock_point_cloud.ply",
            mesh_path="mock_mesh.stl",
            confidence=0.83,
            warnings=["Mock reconstruction engine is active; this is a deterministic demonstration output."],
            status="completed",
        )
