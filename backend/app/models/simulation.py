from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class SimulationConfig(BaseModel):
    load_magnitude_n: float = Field(default=100.0, gt=0)
    load_direction: List[float] = Field(default_factory=lambda: [0.0, -1.0, 0.0])
    load_region: Dict[str, Any] = Field(default_factory=lambda: {"axis": "x", "side": "max", "percent": 0.1})
    support_region: Dict[str, Any] = Field(default_factory=lambda: {"axis": "x", "side": "min", "percent": 0.1})
    simulation_type: str = "static_structural"


class SimulationResult(BaseModel):
    max_displacement_mm: float
    max_stress_mpa: float
    factor_of_safety: float
    max_stress_location: Optional[List[float]] = None
    max_displacement_location: Optional[List[float]] = None
    solver_status: str = "completed"
    solver_type: str = "mock"
    warnings: List[str] = Field(default_factory=list)


class SimulationComparison(BaseModel):
    design: SimulationResult
    as_built: SimulationResult
    comparison: Dict[str, float] = Field(default_factory=dict)
