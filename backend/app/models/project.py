from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1)


class ProjectResponse(BaseModel):
    project_id: str
    name: str
    design_model: Optional[str] = None
    as_built_model: Optional[str] = None
    scan_sessions: List[str] = Field(default_factory=list)
    status: str = "active"


class ProjectRecordModel(BaseModel):
    project_id: str
    name: str
    design_model: Optional[str] = None
    as_built_model: Optional[str] = None
    scan_sessions: List[str] = Field(default_factory=list)
    materials: Dict[str, Any] = Field(default_factory=dict)
    simulation_config: Optional[Dict[str, Any]] = None
    last_simulation: Optional[Dict[str, Any]] = None
    analysis_history: List[Dict[str, Any]] = Field(default_factory=list)
    design_model_name: Optional[str] = None
    as_built_model_name: Optional[str] = None
    geometry_metadata: Dict[str, Any] = Field(default_factory=dict)
    geometry_comparison: Optional[Dict[str, Any]] = None
