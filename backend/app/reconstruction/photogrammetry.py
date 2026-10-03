from __future__ import annotations

import math
from pathlib import Path
from typing import Any, Dict, List

import cv2
import numpy as np

from backend.app.reconstruction.base import ReconstructionEngine, ReconstructionResult
from backend.app.storage.file_storage import get_project_dir


class PhotogrammetryReconstructionEngine(ReconstructionEngine):
    def _read_image(self, image: Dict[str, Any]):
        path = image.get("path")
        if not path:
            return None
        file_path = Path(path)
        if not file_path.exists():
            return None
        return cv2.imread(str(file_path), cv2.IMREAD_COLOR)

    def _quality_score(self, image: np.ndarray) -> float:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        focus = cv2.Laplacian(gray, cv2.CV_64F).var()
        return float(np.clip(focus / 200.0, 0.0, 1.0))

    def _generate_point_cloud(self, images: List[Dict[str, Any]]) -> tuple[np.ndarray, List[str]]:
        points: List[List[float]] = []
        warnings: List[str] = []
        if not images:
            raise ValueError("No images were provided for photogrammetry reconstruction")

        for image in images:
            img = self._read_image(image)
            if img is None:
                continue
            quality = self._quality_score(img)
            if quality < 0.2:
                warnings.append("One or more images appear blurry and may reduce reconstruction confidence.")

            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            height, width = gray.shape[:2]
            step = max(4, min(height, width) // 16)
            for y in range(0, height, step):
                for x in range(0, width, step):
                    intensity = gray[y, x] / 255.0
                    points.append([
                        float(x) / max(width, 1),
                        float(y) / max(height, 1),
                        float((1.0 - intensity) * 30.0),
                    ])

        if not points:
            raise ValueError("No valid images were available for reconstruction")

        return np.asarray(points, dtype=float), warnings

    def _write_ply(self, file_path: Path, points: np.ndarray) -> None:
        file_path.parent.mkdir(parents=True, exist_ok=True)
        with file_path.open("w", encoding="utf-8") as handle:
            handle.write("ply\n")
            handle.write("format ascii 1.0\n")
            handle.write(f"element vertex {len(points)}\n")
            handle.write("property float x\n")
            handle.write("property float y\n")
            handle.write("property float z\n")
            handle.write("end_header\n")
            for x, y, z in points:
                handle.write(f"{x:.6f} {y:.6f} {z:.6f}\n")

    def _write_stl(self, file_path: Path, points: np.ndarray) -> None:
        if len(points) < 3:
            raise ValueError("Not enough points to create a mesh")

        cols = max(2, int(round(math.sqrt(len(points)))))
        rows = int(math.ceil(len(points) / cols))
        triangles: List[tuple[tuple[float, float, float], tuple[float, float, float], tuple[float, float, float]]] = []

        for row in range(rows):
            for col in range(cols):
                idx = row * cols + col
                if idx >= len(points):
                    continue
                p0 = tuple(points[idx].tolist())

                if col + 1 < cols and idx + 1 < len(points):
                    p1 = tuple(points[idx + 1].tolist())
                else:
                    continue

                if row + 1 < rows and idx + cols < len(points):
                    p2 = tuple(points[idx + cols].tolist())
                    p3 = tuple(points[min(idx + cols + 1, len(points) - 1)].tolist())
                    triangles.append((p0, p1, p2))
                    triangles.append((p1, p3, p2))

        file_path.parent.mkdir(parents=True, exist_ok=True)

        with file_path.open("w", encoding="utf-8") as handle:
            handle.write("solid photogrammetry_mesh\n")
            for a, b, c in triangles[:10000]:
                ab = (b[0] - a[0], b[1] - a[1], b[2] - a[2])
                ac = (c[0] - a[0], c[1] - a[1], c[2] - a[2])
                cross_x = ab[1] * ac[2] - ab[2] * ac[1]
                cross_y = ab[2] * ac[0] - ab[0] * ac[2]
                cross_z = ab[0] * ac[1] - ab[1] * ac[0]
                length = math.sqrt(cross_x ** 2 + cross_y ** 2 + cross_z ** 2) or 1.0
                normal = (cross_x / length, cross_y / length, cross_z / length)
                handle.write(f"  facet normal {normal[0]:.6f} {normal[1]:.6f} {normal[2]:.6f}\n")
                handle.write("    outer loop\n")
                for point in (a, b, c):
                    handle.write(f"      vertex {point[0]:.6f} {point[1]:.6f} {point[2]:.6f}\n")
                handle.write("    endloop\n")
                handle.write("  endfacet\n")
            handle.write("endsolid photogrammetry_mesh\n")

    def reconstruct(self, images: List[Dict[str, Any]], project_id: str | None = None, scan_id: str | None = None) -> ReconstructionResult:
        points, warnings = self._generate_point_cloud(images)
        project_dir = get_project_dir(project_id) if project_id else Path(".")
        project_dir.mkdir(parents=True, exist_ok=True)
        point_cloud_name = f"{scan_id}_pointcloud.ply" if scan_id else "photogrammetry_point_cloud.ply"
        mesh_name = f"{scan_id}_mesh.stl" if scan_id else "photogrammetry_mesh.stl"
        point_cloud_path = project_dir / point_cloud_name
        mesh_path = project_dir / mesh_name
        self._write_ply(point_cloud_path, points)
        self._write_stl(mesh_path, points)
        return ReconstructionResult(
            reconstruction_type="photogrammetry",
            point_cloud_path=str(point_cloud_path),
            mesh_path=str(mesh_path),
            confidence=0.76,
            warnings=warnings or ["Photogrammetry path is active and uses image-derived pseudo-3D data for the MVP."],
            status="completed",
        )
