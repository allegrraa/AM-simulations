from __future__ import annotations

from fastapi import APIRouter, HTTPException

from backend.app.models.simulation import SimulationConfig
from backend.app.services.comparison_service import ComparisonService
from backend.app.services.project_store import get_project, update_project
from backend.app.services.simulation_service import SimulationService

router = APIRouter()


@router.post("/projects/{project_id}/simulation-config")
def set_simulation_config(project_id: str, config: SimulationConfig):
    project = get_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    update_project(project_id, simulation_config=config.model_dump())
    return config.model_dump()


@router.post("/projects/{project_id}/simulate")
def run_simulation(project_id: str):
    project = get_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    if not project.get("design_model") or not project.get("as_built_model"):
        raise HTTPException(status_code=400, detail="Design and as-built models are required")
    if not project.get("materials"):
        raise HTTPException(status_code=400, detail="Material properties are required")
    if not project.get("simulation_config"):
        raise HTTPException(status_code=400, detail="Simulation configuration is required")

    service = SimulationService()
    try:
        design_result = service.run(project_id, project, design=True)
        as_built_result = service.run(project_id, project, design=False)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    comparison = ComparisonService().compare_simulation_results(design_result, as_built_result)
    payload = {
        "design": design_result,
        "as_built": as_built_result,
        "comparison": comparison,
    }
    update_project(project_id, last_simulation={"design": design_result, "as_built": as_built_result, "comparison": comparison})
    return payload
