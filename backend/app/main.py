from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api.analysis import router as analysis_router
from backend.app.api.geometry import router as geometry_router
from backend.app.api.materials import router as materials_router
from backend.app.api.projects import router as projects_router
from backend.app.api.scan import router as scan_router
from backend.app.api.simulation import router as simulation_router

app = FastAPI(title="AM Simulations MVP", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects_router)
app.include_router(scan_router)
app.include_router(geometry_router)
app.include_router(materials_router)
app.include_router(simulation_router)
app.include_router(analysis_router)


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "am-simulations"}
