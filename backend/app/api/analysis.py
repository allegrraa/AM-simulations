from __future__ import annotations

from fastapi import APIRouter, HTTPException

from backend.app.services.analysis_service import AnalysisService
from backend.app.services.project_store import get_project, update_project

router = APIRouter()


@router.post("/projects/{project_id}/ask")
def ask_question(project_id: str, payload: dict):
    project = get_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    question = payload.get("question", "")
    if not question:
        raise HTTPException(status_code=400, detail="Question is required")
    result = AnalysisService().analyze(project, question)
    project.setdefault("analysis_history", []).append({"question": question, "answer": result["answer"]})
    update_project(project_id, analysis_history=project["analysis_history"])
    return result
