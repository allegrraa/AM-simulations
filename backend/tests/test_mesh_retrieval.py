from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.services.project_store import get_project

client = TestClient(app)
demo = Path(__file__).resolve().parents[2] / 'demo'


@pytest.mark.parametrize('kind,upload,field,name', [
    ('design', 'design', 'design_model', 'design.stl'),
    ('asbuilt', 'asbuilt/mesh', 'as_built_model', 'as-manufactured.stl'),
])
def test_mesh_download_is_exact_and_project_scoped(kind, upload, field, name, tmp_path):
    pid = client.post('/projects', json={'name': 'Mesh persistence'}).json()['project_id']
    root = f'/projects/{pid}'
    route = root + f'/{kind}/mesh'
    assert client.get(route).status_code == 404
    assert client.get(f'/projects/missing/{kind}/mesh').status_code == 404
    content = (demo / name).read_bytes()
    assert client.post(root + '/' + upload, files={'file': (name, content)}).status_code == 200
    response = client.get(route)
    assert response.status_code == 200
    assert response.headers['content-type'] == 'model/stl'
    assert response.content == content
    assert 'filename="mesh.stl"' in response.headers['content-disposition']
    metadata_key = 'design' if kind == 'design' else 'as_built'
    assert client.get(root).json()['geometry_metadata'][metadata_key]['face_count'] == 12
    other = client.post('/projects', json={'name': 'Other'}).json()['project_id']
    assert client.get(f'/projects/{other}/{kind}/mesh').status_code == 404
    original = get_project(pid)[field]
    get_project(other)[field] = original
    assert client.get(f'/projects/{other}/{kind}/mesh').status_code == 404
    external = tmp_path / 'private.stl'
    external.write_bytes(content)
    get_project(pid)[field] = str(external)
    assert client.get(route).status_code == 404
    link = Path(original).parent / 'symlink.stl'
    link.symlink_to(external)
    get_project(pid)[field] = str(link)
    assert client.get(route).status_code == 404
    get_project(pid)[field] = str(Path(original).parent / 'missing.stl')
    assert client.get(route).status_code == 404


def test_project_restores_comparison_and_replacement_mesh():
    pid = client.post('/projects', json={'name': 'Refresh'}).json()['project_id']
    root = f'/projects/{pid}'
    for route, name in [('design', 'design.stl'), ('asbuilt/mesh', 'as-manufactured.stl')]:
        assert client.post(root + '/' + route, files={'file': (name, (demo / name).read_bytes())}).status_code == 200
    comparison = client.post(root + '/compare').json()
    assert client.get(root).json()['geometry_comparison'] == comparison
    replacement = (demo / 'as-manufactured.stl').read_bytes()
    client.post(root + '/design', files={'file': ('design.stl', replacement)})
    assert client.get(root + '/design/mesh').content == replacement
    assert client.get(root).json()['geometry_comparison'] is None
