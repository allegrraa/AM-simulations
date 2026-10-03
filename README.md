# AM Simulations

A lightweight additive-manufacturing comparison platform that compares the original design against the manufactured part using geometry, material, and simulation data.

## Repository layout
- `backend/` – FastAPI backend MVP and API tests
- `docs/` – business plan and product notes
- `notes/` – working notes and task tracking
- `assets/` – design and media assets

## Backend quick start

```bash
cd /Users/allegra/am-simulations
python3 -m pip install -r backend/requirements.txt
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

## Current backend capabilities
- project creation and project fetch
- STL design upload and geometry metadata extraction
- scan workflow that processes actual uploaded camera images using an OpenCV-based photogrammetry-style pipeline
- as-built point cloud and mesh upload
- materials and simulation config endpoints
- deterministic mock structural comparison
- AI analysis endpoint that explains simulation outputs without inventing physics results

## Notes
This project now performs a lightweight image-derived reconstruction from uploaded scan photos: each image is read, evaluated for focus quality, converted into a pseudo-3D point cloud, and exported as a PLY point cloud plus STL mesh. The downstream comparison and simulation logic stays unchanged so a real photogrammetry or metrology stack can be swapped in later without breaking the API.
