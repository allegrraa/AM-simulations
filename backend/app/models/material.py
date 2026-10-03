from __future__ import annotations

from pydantic import BaseModel, Field


class MaterialInput(BaseModel):
    material_name: str = Field(..., min_length=1)
    young_modulus_pa: float = Field(..., gt=0)
    poisson_ratio: float = Field(..., ge=0, le=0.5)
    density_kg_m3: float = Field(..., gt=0)
    yield_strength_pa: float = Field(..., gt=0)
    source: str = Field(default="user_input")


class MaterialBundle(BaseModel):
    design: MaterialInput
    as_built: MaterialInput
