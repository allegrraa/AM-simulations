from __future__ import annotations

import uuid
from typing import Any, Dict


PROJECT_STORE: Dict[str, Dict[str, Any]] = {}


def make_project_id() -> str:
    return str(uuid.uuid4())


def get_project(project_id: str) -> Dict[str, Any]:
    return PROJECT_STORE.get(project_id)


def create_project(name: str) -> Dict[str, Any]:
    project_id = make_project_id()
    project = {
        "project_id": project_id,
        "name": name,
        "design_model": None,
        "as_built_model": None,
        "scan_sessions": {},
        "materials": {},
        "simulation_config": None,
        "last_simulation": None,
        "analysis_history": [],
        "status": "active",
    }
    PROJECT_STORE[project_id] = project
    return project


def update_project(project_id: str, **kwargs: Any) -> Dict[str, Any]:
    project = get_project(project_id)
    if project is None:
        raise KeyError(f"Project {project_id} does not exist")
    project.update(kwargs)
    if any(key in kwargs for key in ("design_model", "as_built_model", "materials", "simulation_config")):
        project["last_simulation"] = None
        project["analysis_history"] = []
    if any(key in kwargs for key in ("design_model", "as_built_model")):
        project.pop("geometry_comparison", None)
    return project


def add_scan(project_id: str, scan_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    project = get_project(project_id)
    if project is None:
        raise KeyError(f"Project {project_id} does not exist")
    scan_sessions = project["scan_sessions"]
    if isinstance(scan_sessions, list):
        scan_sessions.append(payload)
    else:
        scan_sessions[scan_id] = payload
    return payload


def get_scan(project_id: str, scan_id: str) -> Dict[str, Any]:
    project = get_project(project_id)
    if project is None:
        return None
    scan_sessions = project["scan_sessions"]
    if isinstance(scan_sessions, dict):
        return scan_sessions.get(scan_id)
    for scan in scan_sessions:
        if scan.get("scan_id") == scan_id:
            return scan
    return None
