from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class GeometryMetadata(BaseModel):
    source_type: str
    bounding_box: List[float] = Field(default_factory=lambda: [0.0, 0.0, 0.0])
    dimensions: Dict[str, float] = Field(default_factory=dict)
    centroid: List[float] = Field(default_factory=lambda: [0.0, 0.0, 0.0])
    surface_area: float = 0.0
    volume: float = 0.0
    vertex_count: int = 0
    face_count: int = 0
    file_path: Optional[str] = None
    remarks: List[str] = Field(default_factory=list)


class AlignmentResult(BaseModel):
    transformation_matrix: List[List[float]] = Field(default_factory=list)
    icp_fitness: float = 0.0
    rmse_mm: float = 0.0
    warning: Optional[str] = None


class GeometryComparison(BaseModel):
    volume_change_percent: float = 0.0
    bounding_dimension_changes: Dict[str, float] = Field(default_factory=dict)
    centroid_shift: Dict[str, float] = Field(default_factory=dict)
    mean_surface_deviation_mm: float = 0.0
    max_surface_deviation_mm: float = 0.0
    rmse_mm: float = 0.0
    deviation_above_threshold_percent: float = 0.0
    warnings: List[str] = Field(default_factory=list)
    vertex_deviation: Optional[List[float]] = None
