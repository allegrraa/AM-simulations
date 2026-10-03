from __future__ import annotations

from typing import Any, Dict, Tuple

from backend.app.solvers.finite_element_solver import FiniteElementSolver


class SimulationService:
    def __init__(self, solver=None):
        self.solver = solver or FiniteElementSolver()

    def run(self, project_id: str, project: Dict[str, Any], *, design: bool = True) -> Dict[str, Any]:
        mesh_info = project.get("design_model") if design else project.get("as_built_model")
        material_key = "design" if design else "as_built"
        material = project.get("materials", {}).get(material_key, {})
        config = project.get("simulation_config") or {}
        if not mesh_info:
            raise ValueError("Mesh data is missing for the requested simulation run.")
        geometry = project.get("geometry_metadata", {}).get("design" if design else "as_built", {})
        simulation = self.solver.run_simulation({
            "mesh_path": mesh_info,
            "volume": float(geometry.get("volume", 1.0)),
            "bounding_box": geometry.get("bounding_box", []),
            "vertex_count": int(geometry.get("vertex_count", 100)),
            "face_count": int(geometry.get("face_count", 200)),
        }, material, config)
        return simulation

    def compare(self, project: Dict[str, Any]) -> Dict[str, Any]:
        design = project.get("last_simulation", {}).get("design", {})
        as_built = project.get("last_simulation", {}).get("as_built", {})
        displacement = ((as_built.get("max_displacement_mm", 0.0) - design.get("max_displacement_mm", 0.0)) / max(design.get("max_displacement_mm", 1.0), 1.0)) * 100.0
        stress = ((as_built.get("max_stress_mpa", 0.0) - design.get("max_stress_mpa", 0.0)) / max(design.get("max_stress_mpa", 1.0), 1.0)) * 100.0
        factor = ((as_built.get("factor_of_safety", 0.0) - design.get("factor_of_safety", 0.0)) / max(design.get("factor_of_safety", 1.0), 1.0)) * 100.0
        return {
            "displacement_change_percent": round(displacement, 3),
            "stress_change_percent": round(stress, 3),
            "factor_of_safety_change_percent": round(factor, 3),
        }
