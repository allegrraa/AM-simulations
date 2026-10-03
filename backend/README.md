# AM Simulations Backend

This backend is an additive-manufacturing comparison MVP. It accepts design and as-built geometry, runs linear-elastic tetrahedral finite-element analysis on valid solid meshes, and exposes structured APIs for the frontend workflow.

## Architecture

- API layer: FastAPI routes under `backend/app/api`
- Domain data models: `backend/app/models`
- Workflow services: `backend/app/services`
- Reconstruction adapters: `backend/app/reconstruction`
- Solvers: `backend/app/solvers`
- File storage: `backend/app/storage`

## Local install

```bash
cd /Users/allegra/am-simulations
python3 -m pip install -r backend/requirements.txt
```

## Run locally

```bash
cd /Users/allegra/am-simulations
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

## Core workflow

1. Create a project
2. Upload original STL design
3. Start a scan session
4. Upload phone images
5. Finish scan reconstruction
6. Upload or generate as-built mesh
7. Set material inputs
8. Configure static load and support regions
9. Run simulation
10. Ask the AI analysis endpoint

## API routes

- `POST /projects`
- `GET /projects/{project_id}`
- `POST /projects/{project_id}/design`
- `POST /projects/{project_id}/scan`
- `POST /projects/{project_id}/scan/{scan_id}/images`
- `POST /projects/{project_id}/scan/{scan_id}/complete`
- `GET /projects/{project_id}/scan/{scan_id}`
- `GET /projects/{project_id}/scan/{scan_id}/mesh`
- `POST /projects/{project_id}/asbuilt/pointcloud`
- `POST /projects/{project_id}/asbuilt/mesh`
- `POST /projects/{project_id}/compare`
- `PUT /projects/{project_id}/materials`
- `POST /projects/{project_id}/simulation-config`
- `POST /projects/{project_id}/simulate`
- `POST /projects/{project_id}/ask`

## Point cloud vs mesh

The system distinguishes between:

- point clouds: raw scan representation from mobile reconstruction or uploaded PLY/PCD samples
- meshes: normalized engineering representation used by simulation and comparison

This allows the backend to keep the photo-to-scan pipeline independent from downstream simulation logic.

## Current constraints

The current backend has these non-production constraints:

- photo reconstruction is image-derived pseudo-3D, not calibrated photogrammetry
- the generated scan mesh is open and unscaled, so the FEA solver returns HTTP 422 for it
- material properties are user-entered assumptions
- static linear-elastic results require a watertight STL and an accurate unit selection; results are not certified engineering advice
- AI answers rely on available geometry/simulation summaries and never invent physics values

## Adding real photogrammetry

A production photogrammetry implementation can replace the `MockReconstructionEngine` in `backend/app/reconstruction/mock_reconstruction.py` or `backend/app/services/reconstruction_service.py` and expose the same API contract.

## Adding scanner data

Uploaded point clouds or STL meshes fit the same downstream process. The API accepts either point cloud or mesh as the as-built representation.

## Adding real FEA

The default solver in `backend/app/solvers/finite_element_solver.py` tetrahedralizes watertight STL solids with TetGen and assembles a 3D linear-elastic system with scikit-fem. It applies fixed-face constraints and distributed nodal loads, and reports maximum displacement, von Mises stress, and yield-based factor of safety. It is a small-strain static analysis, not nonlinear, fatigue, thermal, or certified analysis.

## Current limitations

- Photo-generated as-built geometry is not yet suitable for FEA
- No production photogrammetry pipeline yet
- No persisted database beyond in-memory project state
- Geometry alignment is intentionally lightweight for MVP purposes
