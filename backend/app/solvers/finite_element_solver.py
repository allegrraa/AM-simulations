from __future__ import annotations

from pathlib import Path
from typing import Any, Dict

import numpy as np
import pyvista as pv
import tetgen
import trimesh
from scipy.spatial import cKDTree
from skfem import Basis, ElementTetP1, ElementVector, MeshTet, asm, condense, solve
from skfem.models.elasticity import linear_elasticity

from backend.app.solvers.base import SimulationEngine


class FiniteElementSolver(SimulationEngine):
    _length_to_meters = {"mm": 1e-3, "cm": 1e-2, "m": 1.0}
    _max_tetrahedra = 100_000
    _max_surface_field_vertices = 50_000

    def _load_surface(self, mesh_path: str) -> trimesh.Trimesh:
        path = Path(mesh_path)
        if not path.is_file():
            raise ValueError(f"Mesh file does not exist: {path}")
        try:
            surface = trimesh.load_mesh(str(path), force="mesh", process=True)
        except Exception as exc:
            raise ValueError(f"Could not read STL mesh: {exc}") from exc
        if not isinstance(surface, trimesh.Trimesh) or surface.is_empty:
            raise ValueError("STL must contain a non-empty triangular surface mesh.")
        if not surface.is_watertight:
            raise ValueError("Real FEA requires a closed, watertight solid mesh; this STL has open edges.")
        if not surface.is_winding_consistent:
            surface.fix_normals(multibody=True)
        if surface.volume < 0:
            surface.invert()
        if not np.isfinite(surface.volume) or surface.volume <= 0:
            raise ValueError("STL must enclose a positive, finite solid volume for FEA.")
        return surface

    def _region_nodes(self, coordinates: np.ndarray, region: Dict[str, Any], label: str) -> np.ndarray:
        axis_name = str(region.get("axis", "x")).lower()
        side = str(region.get("side", "min")).lower()
        percent = float(region.get("percent", 0.1))
        if axis_name not in "xyz" or len(axis_name) != 1:
            raise ValueError(f"{label} axis must be x, y, or z.")
        if side not in {"min", "max"}:
            raise ValueError(f"{label} side must be min or max.")
        if not 0 < percent <= 1:
            raise ValueError(f"{label} region percent must be greater than 0 and at most 1.")

        axis = "xyz".index(axis_name)
        values = coordinates[axis]
        low = float(values.min())
        high = float(values.max())
        extent = high - low
        if not np.isfinite(extent) or extent <= 0:
            raise ValueError(f"Mesh has no extent along the selected {label} axis.")
        tolerance = max(extent * 1e-8, 1e-12)
        width = max(extent * percent, tolerance)
        selected = values <= low + width + tolerance if side == "min" else values >= high - width - tolerance
        nodes = np.flatnonzero(selected)
        if not len(nodes):
            raise ValueError(f"No mesh nodes were found in the selected {label} region.")
        return nodes

    def run_simulation(self, mesh: Dict[str, Any], material: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
        mesh_path = str(mesh.get("mesh_path") or "")
        surface = self._load_surface(mesh_path)
        length_unit = str(config.get("length_unit", "mm")).lower()
        if length_unit not in self._length_to_meters:
            raise ValueError("STL length unit must be mm, cm, or m.")
        length_scale = self._length_to_meters[length_unit]

        young_modulus = float(material.get("young_modulus_pa", 0.0))
        poisson_ratio = float(material.get("poisson_ratio", -1.0))
        yield_strength = float(material.get("yield_strength_pa", 0.0))
        if not np.isfinite(young_modulus) or young_modulus <= 0:
            raise ValueError("Young's modulus must be a positive finite value in Pa.")
        if not np.isfinite(poisson_ratio) or not 0 <= poisson_ratio < 0.499:
            raise ValueError("Poisson ratio must be between 0 and 0.499 for stable linear elasticity.")
        if not np.isfinite(yield_strength) or yield_strength <= 0:
            raise ValueError("Yield strength must be a positive finite value in Pa.")

        face_count = len(surface.faces)
        tet_surface_faces = np.column_stack((np.full(face_count, 3, dtype=np.int64), surface.faces)).ravel()
        surface_poly = pv.PolyData(surface.vertices, tet_surface_faces)
        tetrahedralizer = tetgen.TetGen(surface_poly)
        try:
            tetrahedralizer.tetrahedralize(
                order=1,
                mindihedral=10,
                minratio=1.5,
                fixedvolume=1.0,
                maxvolume=float(surface.volume) / 400.0,
            )
        except Exception as exc:
            raise ValueError(f"Could not tetrahedralize the STL solid: {exc}") from exc

        tetra_grid = tetrahedralizer.grid
        tetrahedra = tetra_grid.cells_dict.get(10) if tetra_grid is not None else None
        if tetrahedra is None or not len(tetrahedra):
            raise ValueError("Tetrahedral meshing did not produce any volume elements.")
        if len(tetrahedra) > self._max_tetrahedra:
            raise ValueError(f"FEA mesh exceeds the {_format_count(self._max_tetrahedra)} element limit.")

        coordinates_m = np.asarray(tetra_grid.points, dtype=float) * length_scale
        volume_mesh = MeshTet(coordinates_m.T, np.asarray(tetrahedra, dtype=np.int32).T)
        basis = Basis(volume_mesh, ElementVector(ElementTetP1()))
        lame_lambda = young_modulus * poisson_ratio / ((1 + poisson_ratio) * (1 - 2 * poisson_ratio))
        shear_modulus = young_modulus / (2 * (1 + poisson_ratio))
        stiffness_matrix = asm(linear_elasticity(lame_lambda, shear_modulus), basis)

        coordinates = volume_mesh.p
        support_nodes = self._region_nodes(coordinates, config.get("support_region", {}), "support")
        load_nodes = self._region_nodes(coordinates, config.get("load_region", {}), "load")
        overlapping_nodes = np.intersect1d(support_nodes, load_nodes)
        if overlapping_nodes.size:
            load_nodes = np.setdiff1d(load_nodes, support_nodes, assume_unique=True)
        if not len(load_nodes):
            raise ValueError("Load region contains no unconstrained nodes; choose a different loaded face.")

        load_magnitude = float(config.get("load_magnitude_n", 0.0))
        if not np.isfinite(load_magnitude) or load_magnitude <= 0:
            raise ValueError("Load magnitude must be a positive finite value in N.")
        load_direction = np.asarray(config.get("load_direction", []), dtype=float)
        if load_direction.shape != (3,) or not np.isfinite(load_direction).all():
            raise ValueError("Load direction must contain three finite values.")
        direction_norm = float(np.linalg.norm(load_direction))
        if direction_norm <= 0:
            raise ValueError("Load direction cannot be the zero vector.")
        load_direction /= direction_norm

        force = np.zeros(basis.N, dtype=float)
        for axis in range(3):
            force[basis.nodal_dofs[axis, load_nodes]] += load_direction[axis] * load_magnitude / len(load_nodes)
        fixed_dofs = basis.nodal_dofs[:, support_nodes].ravel()
        try:
            displacement_solution = solve(*condense(stiffness_matrix, force, D=fixed_dofs))
        except Exception as exc:
            raise ValueError(f"FEA system could not be solved with these supports and loads: {exc}") from exc
        if not np.isfinite(displacement_solution).all():
            raise ValueError("FEA solution contains non-finite displacement values.")

        nodal_displacement = displacement_solution[basis.nodal_dofs]
        displacement_magnitude = np.linalg.norm(nodal_displacement, axis=0)
        max_displacement_node = int(np.argmax(displacement_magnitude))
        max_displacement_mm = float(displacement_magnitude[max_displacement_node] / length_scale)

        element_nodes = volume_mesh.t
        element_count = element_nodes.shape[1]
        element_coordinates = coordinates[:, element_nodes].transpose(2, 1, 0)
        affine_coordinates = np.concatenate((np.ones((element_count, 4, 1)), element_coordinates), axis=2)
        shape_gradients = np.linalg.inv(affine_coordinates)[:, 1:, :]
        element_displacement = nodal_displacement[:, element_nodes].transpose(2, 0, 1)
        displacement_gradient = np.einsum("eik,ejk->eij", element_displacement, shape_gradients)
        strain = 0.5 * (displacement_gradient + displacement_gradient.transpose(0, 2, 1))
        strain_trace = np.trace(strain, axis1=1, axis2=2)
        identity = np.eye(3)
        stress_tensor = lame_lambda * strain_trace[:, None, None] * identity + 2 * shear_modulus * strain
        deviatoric_stress = stress_tensor - (np.trace(stress_tensor, axis1=1, axis2=2) / 3)[:, None, None] * identity
        von_mises = np.sqrt(1.5 * np.einsum("eij,eij->e", deviatoric_stress, deviatoric_stress))
        max_stress_element = int(np.argmax(von_mises))
        max_stress_pa = float(von_mises[max_stress_element])
        stress_location_mm = coordinates[:, element_nodes[:, max_stress_element]].mean(axis=1) / length_scale
        displacement_location_mm = coordinates[:, max_displacement_node] / length_scale

        warnings = [
            "3D small-strain isotropic linear-elastic tetrahedral FEA; STL units were interpreted from the selected project setting.",
            "Peak stresses are mesh-dependent and should be checked for convergence before engineering use.",
        ]
        if overlapping_nodes.size:
            warnings.append("Load nodes on the fixed support were constrained; the total load was redistributed over remaining load nodes.")

        result = {
            "max_displacement_mm": round(max_displacement_mm, 6),
            "max_stress_mpa": round(max_stress_pa / 1e6, 6),
            "factor_of_safety": round(yield_strength / max(max_stress_pa, 1e-12), 6),
            "max_stress_location": [float(value) for value in stress_location_mm],
            "max_displacement_location": [float(value) for value in displacement_location_mm],
            "solver_status": "completed",
            "solver_type": "linear_elastic_fea",
            "node_count": int(volume_mesh.p.shape[1]),
            "element_count": int(element_count),
            "warnings": warnings,
        }

        if mesh.get("include_surface_displacements"):
            if len(surface.vertices) > self._max_surface_field_vertices:
                warnings.append("Surface displacement field omitted because the STL exceeds the viewer vertex limit.")
            else:
                surface_points_m = np.asarray(surface.vertices, dtype=float) * length_scale
                distances, surface_node_indices = cKDTree(coordinates.T).query(surface_points_m, k=1)
                coordinate_tolerance = max(float(np.ptp(coordinates)) * 1e-8, 1e-10)
                if np.any(distances > coordinate_tolerance):
                    warnings.append("Surface displacement field omitted because STL vertices could not be mapped to FEA nodes.")
                else:
                    result["surface_vertex_coordinates"] = surface.vertices.astype(float).tolist()
                    result["surface_displacements_mm"] = (nodal_displacement[:, surface_node_indices].T * 1000).tolist()

        return result


def _format_count(value: int) -> str:
    return f"{value:,}"