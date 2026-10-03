# Project TODO

- [x] Inspect repository and establish MVP structure
- [x] Build FastAPI scaffold and core API routes
- [x] Implement project creation, design upload, and mesh metadata extraction
- [x] Implement direct as-built STL upload and point-cloud fallback
- [x] Implement geometry comparison and scan workflow
- [x] Implement material API, mock simulation, and analysis endpoints
- [x] Add pytest coverage for the required MVP flows
- [x] Document install/run guidance and MVP limitations

## Known deterministic fallback notes

- Reconstruction is intentionally mocked for the weekend demo. The scan workflow returns a deterministic sample mesh and point cloud instead of running photogrammetry.
- Simulation is mock-only and labeled clearly in the results.
- Geometry comparison and AI answers are based on the mock data and should not be used for physical certification.
