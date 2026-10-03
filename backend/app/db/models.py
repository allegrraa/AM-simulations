from sqlalchemy import Column, Float, Integer, String

from backend.app.db.database import Base


class ProjectRecord(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)


class ScanRecord(Base):
    __tablename__ = "scans"

    id = Column(Integer, primary_key=True, index=True)
    scan_id = Column(String, unique=True, index=True, nullable=False)
    project_id = Column(String, nullable=False)
    status = Column(String, default="collecting")
    images_received = Column(Integer, default=0)


class MaterialRecord(Base):
    __tablename__ = "materials"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String, nullable=False)
    material_name = Column(String, nullable=False)
    young_modulus_pa = Column(Float, default=0.0)
    poisson_ratio = Column(Float, default=0.0)
    density_kg_m3 = Column(Float, default=0.0)
    yield_strength_pa = Column(Float, default=0.0)
    source = Column(String, default="user_input")
    kind = Column(String, default="design")
