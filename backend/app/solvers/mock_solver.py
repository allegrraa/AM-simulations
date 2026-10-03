from __future__ import annotations

from typing import Any, Dict

from backend.app.solvers.base import SimulationEngine


class MockSimulationEngine(SimulationEngine):
    def run_simulation(self, mesh: Dict[str, Any], material: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
        geometry_scale = max(mesh.get("volume", 1.0), 1.0)
        stiffness = max(float(material.get("young_modulus_pa", 3.5e9)), 1.0)
        load = max(float(config.get("load_magnitude_n", 100.0)), 1.0)
        strength = max(float(material.get("yield_strength_pa", 50e6)), 1.0)
        displacement = (load / max(stiffness / 1e9, 1.0)) * (geometry_scale ** 0.4) / 120.0
        stress = (load / max(geometry_scale ** 0.6, 1.0)) * 0.75
        factor = strength / max(stress * 1e6, 1.0)
        return {
            "max_displacement_mm": round(float(displacement), 3),
            "max_stress_mpa": round(float(stress) / 1e6, 3),
            "factor_of_safety": round(float(factor), 3),
            "max_stress_location": [0.0, 0.0, 0.0],
            "max_displacement_location": [0.0, 0.0, 0.0],
            "solver_status": "completed",
            "solver_type": "mock",
            "warnings": ["Mock solver is intentionally deterministic and must not be treated as certified engineering data."],
        }
