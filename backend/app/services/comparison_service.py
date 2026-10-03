from __future__ import annotations

from typing import Any, Dict


class ComparisonService:
    def compare_simulation_results(self, design: Dict[str, Any], as_built: Dict[str, Any]) -> Dict[str, Any]:
        displacement_delta = ((as_built["max_displacement_mm"] - design["max_displacement_mm"]) / max(design["max_displacement_mm"], 1e-6)) * 100.0
        stress_delta = ((as_built["max_stress_mpa"] - design["max_stress_mpa"]) / max(design["max_stress_mpa"], 1e-6)) * 100.0
        factor_delta = ((as_built["factor_of_safety"] - design["factor_of_safety"]) / max(design["factor_of_safety"], 1e-6)) * 100.0
        return {
            "displacement_change_percent": displacement_delta,
            "stress_change_percent": stress_delta,
            "factor_of_safety_change_percent": factor_delta,
        }
