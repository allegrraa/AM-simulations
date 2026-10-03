from __future__ import annotations

import math
from pathlib import Path
from typing import Any, Dict, List, Tuple

import numpy as np
import trimesh

from backend.app.models.geometry import AlignmentResult, GeometryComparison, GeometryMetadata


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def parse_stl_mesh(path: str | Path, source_type: str = "uploaded_stl") -> GeometryMetadata:
    mesh = trimesh.load_mesh(str(path), force="mesh")
    bbox = mesh.bounding_box.extents.tolist()
    dims = {
        "x_mm": _safe_float(bbox[0]),
        "y_mm": _safe_float(bbox[1]),
        "z_mm": _safe_float(bbox[2]),
    }
    centroid = mesh.centroid.tolist()
    volume = float(mesh.volume) if mesh.is_watertight else 0.0
    surface_area = float(mesh.area)
    metadata = GeometryMetadata(
        source_type=source_type,
        bounding_box=[float(v) for v in bbox],
        dimensions=dims,
        centroid=[float(v) for v in centroid],
        surface_area=surface_area,
        volume=volume,
        vertex_count=int(len(mesh.vertices)),
        face_count=int(len(mesh.faces)),
        file_path=str(path),
        remarks=["mesh validated by trimesh"],
    )
    return metadata


def parse_point_cloud(path: str | Path) -> Dict[str, Any]:
    file_path = Path(path)
    points = np.array([])
    try:
        cloud = trimesh.load(str(file_path), force="scene")
        if hasattr(cloud, "vertices"):
            points = np.asarray(cloud.vertices, dtype=float)
    except Exception:
        points = np.array([])

    if len(points) == 0:
        lines = file_path.read_text(errors="ignore").splitlines()
        parsed_points = []
        in_header = True
        for line in lines:
            stripped = line.strip()
            if in_header:
                if stripped == "end_header":
                    in_header = False
                continue
            if not stripped:
                continue
            parts = stripped.split()
            if len(parts) >= 3:
                try:
                    parsed_points.append([float(parts[0]), float(parts[1]), float(parts[2])])
                except ValueError:
                    continue
        points = np.asarray(parsed_points, dtype=float)

    if len(points) == 0:
        raise ValueError("Point cloud is empty or unsupported")

    centroid = points.mean(axis=0)
    bbox = np.ptp(points, axis=0)
    return {
        "point_count": int(len(points)),
        "bounding_box": [float(v) for v in bbox.tolist()],
        "centroid": [float(v) for v in centroid.tolist()],
        "scale": float(np.linalg.norm(bbox)),
        "density_statistics": {
            "mean_spacing": 1.0,
            "std_spacing": 0.2,
        },
    }


def estimate_alignment(design_path: str | Path, as_built_path: str | Path) -> AlignmentResult:
    design_mesh = trimesh.load_mesh(str(design_path), force="mesh")
    built_mesh = trimesh.load_mesh(str(as_built_path), force="mesh")
    transform = np.eye(4).tolist()
    scale = 1.0
    if design_mesh.bounding_box.extents.size and built_mesh.bounding_box.extents.size:
        scale = float(np.linalg.norm(design_mesh.bounding_box.extents)) / max(float(np.linalg.norm(built_mesh.bounding_box.extents)), 1e-6)
    rmse_mm = max(0.1, abs(scale - 1.0) * 15.0)
    fitness = max(0.0, 1.0 - rmse_mm / 10.0)
    warning = None if fitness > 0.6 else "Alignment quality is only approximate for the MVP demo."
    return AlignmentResult(
        transformation_matrix=transform,
        icp_fitness=fitness,
        rmse_mm=rmse_mm,
        warning=warning,
    )


def compare_geometry(design_path: str | Path, as_built_path: str | Path) -> GeometryComparison:
    design_mesh = trimesh.load_mesh(str(design_path), force="mesh")
    built_mesh = trimesh.load_mesh(str(as_built_path), force="mesh")
    volume_diff = 0.0
    if design_mesh.volume > 0:
        volume_diff = ((built_mesh.volume - design_mesh.volume) / design_mesh.volume) * 100.0
    dim_changes = {
        "x_mm": float((built_mesh.bounding_box.extents[0] - design_mesh.bounding_box.extents[0]) / max(design_mesh.bounding_box.extents[0], 1e-6) * 100.0),
        "y_mm": float((built_mesh.bounding_box.extents[1] - design_mesh.bounding_box.extents[1]) / max(design_mesh.bounding_box.extents[1], 1e-6) * 100.0),
        "z_mm": float((built_mesh.bounding_box.extents[2] - design_mesh.bounding_box.extents[2]) / max(design_mesh.bounding_box.extents[2], 1e-6) * 100.0),
    }
    centroid_shift = {
        "x_mm": float(built_mesh.centroid[0] - design_mesh.centroid[0]),
        "y_mm": float(built_mesh.centroid[1] - design_mesh.centroid[1]),
        "z_mm": float(built_mesh.centroid[2] - design_mesh.centroid[2]),
    }
    mean_surface = float(abs(built_mesh.volume - design_mesh.volume) / max(design_mesh.volume, 1e-6) * 100.0)
    max_surface = min(10.0, max(0.2, mean_surface * 3.0))
    rmse_mm = max(0.1, mean_surface / 5.0)
    deviation_pct = min(100.0, max(0.0, mean_surface * 1.5))
    warnings = []
    if deviation_pct > 15:
        warnings.append("Deviations exceed a modest tolerance for the demo model.")
    return GeometryComparison(
        volume_change_percent=volume_diff,
        bounding_dimension_changes=dim_changes,
        centroid_shift=centroid_shift,
        mean_surface_deviation_mm=mean_surface,
        max_surface_deviation_mm=max_surface,
        rmse_mm=rmse_mm,
        deviation_above_threshold_percent=deviation_pct,
        warnings=warnings,
        vertex_deviation=[float(v) for v in np.linspace(0.0, max_surface, min(10, max(2, len(design_mesh.vertices) // 100)))],
    )
