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
- scan workflow with mock reconstruction
- as-built point cloud and mesh upload
- materials and simulation config endpoints
- deterministic mock structural comparison
- AI analysis endpoint that explains simulation outputs without inventing physics results

## Notes
This project currently uses a deterministic mock reconstruction and mock solver to keep the weekend MVP working and easy to swap out with real photogrammetry or FEA later.
