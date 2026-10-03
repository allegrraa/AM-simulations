# Project TODO

- [x] Inspect repository and establish MVP structure
- [x] Build FastAPI scaffold and core API routes
- [x] Implement project creation, design upload, and mesh metadata extraction
- [x] Implement direct as-built STL upload and point-cloud fallback
- [x] Implement geometry comparison and scan workflow
- [x] Implement material API, tetrahedral FEA, and analysis endpoints
- [x] Add pytest coverage for the required MVP flows
- [x] Document install/run guidance and MVP limitations

## Current limitations

- Reconstruction is intentionally mocked for the weekend demo. The scan workflow returns a deterministic sample mesh and point cloud instead of running photogrammetry.
- FEA runs only on watertight, dimensioned STL solids; the current photo-derived mesh is open and unscaled and is rejected.
- Linear-elastic FEA and geometry comparison are not certified for physical engineering decisions.
