from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field, field_validator, model_validator
import math


class SimulationConfig(BaseModel):
    load_magnitude_n: float = Field(default=100.0, gt=0)
    load_direction: List[float] = Field(default_factory=lambda: [0.0, -1.0, 0.0])
    load_region: Dict[str, Any] = Field(default_factory=lambda: {"axis": "x", "side": "max", "percent": 0.1})
    support_region: Dict[str, Any] = Field(default_factory=lambda: {"axis": "x", "side": "min", "percent": 0.1})
    length_unit: Literal["mm", "cm", "m"] = "mm"
    simulation_type: str = "static_structural"

    @field_validator('load_direction')
    @classmethod
    def direction_valid(cls, value):
        if len(value) != 3 or not all(math.isfinite(v) for v in value) or not any(value):
            raise ValueError('Load direction must contain three finite values and be nonzero')
        return value

    @field_validator('load_region', 'support_region')
    @classmethod
    def region_valid(cls, value):
        if value.get('axis') not in ('x', 'y', 'z') or value.get('side') not in ('min', 'max'):
            raise ValueError('Region requires axis x/y/z and side min/max')
        try:
            valid = 0 < float(value.get('percent', 0)) <= 1
        except (ValueError, TypeError):
            valid = False
        if not valid:
            raise ValueError('Region fraction must be greater than zero and at most one')
        return value

    @model_validator(mode='after')
    def regions_distinct(self):
        if self.load_region == self.support_region:
            raise ValueError('Load and support regions must differ')
        return self


class SimulationResult(BaseModel):
    max_displacement_mm: float
    max_stress_mpa: float
    factor_of_safety: float
    max_stress_location: Optional[List[float]] = None
    max_displacement_location: Optional[List[float]] = None
    solver_status: str = "completed"
    solver_type: str = "linear_elastic_fea"
    node_count: Optional[int] = None
    element_count: Optional[int] = None
    warnings: List[str] = Field(default_factory=list)


class SimulationComparison(BaseModel):
    design: SimulationResult
    as_built: SimulationResult
    comparison: Dict[str, float] = Field(default_factory=dict)
