"""Generate two watertight cantilever specimens, dimensions in millimetres."""
from pathlib import Path
import trimesh

directory = Path(__file__).parent
for name, dimensions in (("design", (60, 12, 10)), ("as-manufactured", (60, 10, 8))):
    mesh = trimesh.creation.box(extents=dimensions)
    assert mesh.is_watertight and mesh.volume > 0
    mesh.export(directory / f"{name}.stl")
