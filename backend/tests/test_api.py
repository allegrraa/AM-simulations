from pathlib import Path

import cv2
import numpy as np
from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)


def create_stl_text():
    return """solid cube
  facet normal 0 0 1
    outer loop
      vertex 0 0 0
      vertex 1 0 0
      vertex 0 1 0
    endloop
  endfacet
  facet normal 0 0 1
    outer loop
      vertex 0 1 0
      vertex 1 0 0
      vertex 1 1 0
    endloop
  endfacet
  facet normal 0 0 -1
    outer loop
      vertex 0 0 0
      vertex 0 1 0
      vertex 1 0 0
    endloop
  endfacet
  facet normal 0 0 -1
    outer loop
      vertex 0 1 0
      vertex 1 1 0
      vertex 1 0 0
    endloop
  endfacet
endsolid cube
"""


def create_ply_text():
    return """ply
format ascii 1.0
comment generated for tests
element vertex 4
property float x
property float y
property float z
end_header
0 0 0
1 0 0
0 1 0
0 0 1
"""


def test_project_creation():
    response = client.post("/projects", json={"name": "Bracket A"})
    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["name"] == "Bracket A"
    assert "project_id" in payload


def test_design_upload_and_geometry_metadata():
    project = client.post("/projects", json={"name": "Shape Test"}).json()
    project_id = project["project_id"]
    stl_bytes = create_stl_text().encode("utf-8")

    response = client.post(
        f"/projects/{project_id}/design",
        files={"file": ("design.stl", stl_bytes, "model/stl")},
    )

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["source_type"] == "uploaded_stl"
    assert payload["geometry_metadata"]["vertex_count"] > 0
    assert payload["geometry_metadata"]["face_count"] > 0


def make_sample_image(width=120, height=120, intensity=180):
    img = np.zeros((height, width, 3), dtype=np.uint8)
    img[:, :, 0] = intensity
    img[:, :, 1] = intensity - 20
    img[:, :, 2] = intensity + 30
    cv2.circle(img, (width // 2, height // 2), width // 4, (255, 255, 255), -1)
    ok, buffer = cv2.imencode(".png", img)
    assert ok
    return buffer.tobytes()


def test_scan_workflow_and_mock_reconstruction():
    project = client.post("/projects", json={"name": "Scan Test"}).json()
    project_id = project["project_id"]

    scan = client.post(f"/projects/{project_id}/scan", json={"source": "phone"})
    assert scan.status_code == 200, scan.text
    scan_id = scan.json()["scan_id"]

    image_one = make_sample_image()
    image_two = make_sample_image(intensity=200)
    upload = client.post(
        f"/projects/{project_id}/scan/{scan_id}/images",
        files=[("files", ("cam_1.png", image_one, "image/png")), ("files", ("cam_2.png", image_two, "image/png"))],
    )
    assert upload.status_code == 200, upload.text

    complete = client.post(f"/projects/{project_id}/scan/{scan_id}/complete")
    assert complete.status_code == 200, complete.text
    payload = complete.json()
    assert payload["status"] in {"processing", "completed"}
    assert payload["reconstruction_type"] == "photogrammetry"

    status = client.get(f"/projects/{project_id}/scan/{scan_id}")
    assert status.status_code == 200, status.text
    payload = status.json()
    assert payload["images_received"] >= 2
    assert payload["mesh_id"]


def test_asbuilt_pointcloud_and_mesh_upload():
    project = client.post("/projects", json={"name": "Built Test"}).json()
    project_id = project["project_id"]

    ply = create_ply_text().encode("utf-8")
    cloud = client.post(
        f"/projects/{project_id}/asbuilt/pointcloud",
        files={"file": ("cloud.ply", ply, "application/octet-stream")},
    )
    assert cloud.status_code == 200, cloud.text
    assert cloud.json()["point_count"] > 0

    mesh = client.post(
        f"/projects/{project_id}/asbuilt/mesh",
        files={"file": ("as_built.stl", create_stl_text().encode("utf-8"), "model/stl")},
    )
    assert mesh.status_code == 200, mesh.text
    assert mesh.json()["source_type"] == "uploaded_mesh"


def test_materials_and_simulation_config():
    project = client.post("/projects", json={"name": "Material Test"}).json()
    project_id = project["project_id"]

    material_payload = {
        "design": {
            "material_name": "PLA",
            "young_modulus_pa": 3.5e9,
            "poisson_ratio": 0.36,
            "density_kg_m3": 1240,
            "yield_strength_pa": 50e6,
            "source": "nominal_database",
        },
        "as_built": {
            "material_name": "PLA-as-built",
            "young_modulus_pa": 2.8e9,
            "poisson_ratio": 0.36,
            "density_kg_m3": 1120,
            "yield_strength_pa": 42e6,
            "source": "mock_sensor",
        },
    }
    materials = client.put(f"/projects/{project_id}/materials", json=material_payload)
    assert materials.status_code == 200, materials.text
    assert materials.json()["design"]["material_name"] == "PLA"

    config = {
        "load_magnitude_n": 100,
        "load_direction": [0, -1, 0],
        "support_region": {"axis": "x", "side": "min", "percent": 0.1},
        "load_region": {"axis": "x", "side": "max", "percent": 0.1},
        "simulation_type": "static_structural",
    }
    response = client.post(f"/projects/{project_id}/simulation-config", json=config)
    assert response.status_code == 200, response.text
    assert response.json()["load_magnitude_n"] == 100


def test_mock_simulation_and_design_vs_as_built_comparison():
    project = client.post("/projects", json={"name": "Simulation Test"}).json()
    project_id = project["project_id"]

    design_resp = client.post(
        f"/projects/{project_id}/design",
        files={"file": ("design.stl", create_stl_text().encode("utf-8"), "model/stl")},
    )
    assert design_resp.status_code == 200

    asbuilt_resp = client.post(
        f"/projects/{project_id}/asbuilt/mesh",
        files={"file": ("as_built.stl", create_stl_text().encode("utf-8"), "model/stl")},
    )
    assert asbuilt_resp.status_code == 200

    material_payload = {
        "design": {
            "material_name": "PLA",
            "young_modulus_pa": 3.5e9,
            "poisson_ratio": 0.36,
            "density_kg_m3": 1240,
            "yield_strength_pa": 50e6,
            "source": "nominal_database",
        },
        "as_built": {
            "material_name": "PLA-as-built",
            "young_modulus_pa": 2.8e9,
            "poisson_ratio": 0.36,
            "density_kg_m3": 1120,
            "yield_strength_pa": 42e6,
            "source": "mock_sensor",
        },
    }
    client.put(f"/projects/{project_id}/materials", json=material_payload)

    client.post(
        f"/projects/{project_id}/simulation-config",
        json={
            "load_magnitude_n": 100,
            "load_direction": [0, -1, 0],
            "support_region": {"axis": "x", "side": "min", "percent": 0.1},
            "load_region": {"axis": "x", "side": "max", "percent": 0.1},
            "simulation_type": "static_structural",
        },
    )

    response = client.post(f"/projects/{project_id}/simulate")
    assert response.status_code == 200, response.text
    payload = response.json()
    assert "design" in payload
    assert "as_built" in payload
    assert "comparison" in payload
    assert payload["design"]["factor_of_safety"] > 0


def test_ai_analysis():
    project = client.post("/projects", json={"name": "AI Test"}).json()
    project_id = project["project_id"]

    client.post(
        f"/projects/{project_id}/design",
        files={"file": ("design.stl", create_stl_text().encode("utf-8"), "model/stl")},
    )
    client.post(
        f"/projects/{project_id}/asbuilt/mesh",
        files={"file": ("as_built.stl", create_stl_text().encode("utf-8"), "model/stl")},
    )
    client.put(
        f"/projects/{project_id}/materials",
        json={
            "design": {
                "material_name": "PLA",
                "young_modulus_pa": 3.5e9,
                "poisson_ratio": 0.36,
                "density_kg_m3": 1240,
                "yield_strength_pa": 50e6,
                "source": "nominal_database",
            },
            "as_built": {
                "material_name": "PLA-as-built",
                "young_modulus_pa": 2.8e9,
                "poisson_ratio": 0.36,
                "density_kg_m3": 1120,
                "yield_strength_pa": 42e6,
                "source": "mock_sensor",
            },
        },
    )
    client.post(
        f"/projects/{project_id}/simulation-config",
        json={
            "load_magnitude_n": 100,
            "load_direction": [0, -1, 0],
            "support_region": {"axis": "x", "side": "min", "percent": 0.1},
            "load_region": {"axis": "x", "side": "max", "percent": 0.1},
            "simulation_type": "static_structural",
        },
    )
    client.post(f"/projects/{project_id}/simulate")

    response = client.post(
        f"/projects/{project_id}/ask",
        json={"question": "Will my manufactured bracket survive a 100 N load?"},
    )
    assert response.status_code == 200, response.text
    payload = response.json()
    assert "answer" in payload
    assert isinstance(payload["answer"], str)
    assert len(payload["answer"]) > 0
