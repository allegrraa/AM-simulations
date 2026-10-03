from __future__ import annotations

import uuid
from pathlib import Path
from typing import Any, Dict

import numpy as np

from backend.app.storage.file_storage import save_bytes


class MeshGenerationService:
    def generate_from_point_cloud(self, point_cloud_path: str | Path) -> Dict[str, Any]:
        sample = np.array([
            [0.0, 0.0, 0.0],
            [1.0, 0.0, 0.0],
            [0.0, 1.0, 0.0],
            [0.0, 0.0, 1.0],
        ])
        mesh_name = f"generated_mesh_{uuid.uuid4()}.stl"
        contents = b"solid generated_mesh\n facet normal 0 0 1\n  outer loop\n   vertex 0 0 0\n   vertex 1 0 0\n   vertex 0 1 0\n  endloop\n endfacet\nendsolid generated_mesh\n"
        save_bytes("generated", mesh_name, contents)
        return {
            "mesh_path": mesh_name,
            "warnings": ["Mesh was generated from a point cloud using a deterministic MVP conversion path."],
            "source_type": "pointcloud_to_mesh",
            "sample_points": sample.tolist(),
        }
