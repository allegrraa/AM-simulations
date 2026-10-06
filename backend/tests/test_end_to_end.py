from pathlib import Path
import math
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)
demo = Path(__file__).resolve().parents[2] / "demo"

def test_demo_real_fea_workflow():
    assert client.get('/health').status_code == 200
    pid = client.post('/projects', json={'name': 'Regression cantilever'}).json()['project_id']
    root = f'/projects/{pid}'
    assert client.get(root).status_code == 200
    assert client.post(root + '/ask', json={'question': 'Assess'}).status_code == 400
    assert client.post(root + '/design', files={'file': ('invalid.stl', b'invalid')}).status_code == 422
    for route, name in (('/design', 'design'), ('/asbuilt/mesh', 'as-manufactured')):
        response = client.post(root + route, files={'file': (name + '.stl', (demo / (name + '.stl')).read_bytes())})
        assert response.status_code == 200, response.text
    comparison = client.post(root + '/compare')
    assert comparison.status_code == 200
    assert comparison.json()['volume_change_percent'] < 0
    material = dict(material_name='Example PLA', young_modulus_pa=3.5e9, poisson_ratio=.36, density_kg_m3=1240, yield_strength_pa=50e6)
    assert client.put(root + '/materials', json={'design': material, 'as_built': material}).status_code == 200
    assert client.post(root + '/simulation-config', json={'load_magnitude_n': 100}).status_code == 200
    result = client.post(root + '/simulate')
    assert result.status_code == 200, result.text
    data = result.json()
    for kind in ('design', 'as_built'):
        assert data[kind]['solver_type'] == 'linear_elastic_fea'
        for field in ('max_stress_mpa', 'max_displacement_mm', 'factor_of_safety'):
            assert math.isfinite(data[kind][field]) and data[kind][field] > 0
    assert data['as_built']['max_displacement_mm'] > data['design']['max_displacement_mm']
    summary = client.post(root + '/ask', json={'question':'Compare performance'})
    assert summary.status_code == 200
    assert 'mock' not in summary.json()['answer'].lower()
    assert client.post(root + '/simulation-config', json={'load_direction':[0,0,0]}).status_code == 422
    assert client.post(root + '/simulation-config', json={'length_unit':'cm'}).status_code == 200
    scaled = client.post(root + '/simulate').json()
    assert math.isclose(scaled['design']['max_displacement_mm'], data['design']['max_displacement_mm'] / 10, abs_tol=1e-5)
    assert client.post(root + '/simulation-config', json={}).status_code == 200
    assert client.get(root).json()['last_simulation'] is None
