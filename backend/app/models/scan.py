from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class ScanCreate(BaseModel):
    source: str = "phone"


class ScanImageRecord(BaseModel):
    filename: str
    capture_order: int
    timestamp: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    orientation: Optional[str] = None
    quality_score: Optional[float] = None


class ScanStatus(BaseModel):
    status: str
    images_received: int
    progress: float = 0.0
    point_cloud_id: Optional[str] = None
    mesh_id: Optional[str] = None
    warnings: List[str] = Field(default_factory=list)
    reconstruction_summary: Optional[Dict[str, Any]] = None
