from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict, List


@dataclass
class ReconstructionResult:
    reconstruction_type: str
    point_cloud_path: str
    mesh_path: str
    confidence: float
    warnings: List[str] = field(default_factory=list)
    status: str = "completed"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "reconstruction_type": self.reconstruction_type,
            "point_cloud_path": self.point_cloud_path,
            "mesh_path": self.mesh_path,
            "confidence": self.confidence,
            "warnings": self.warnings,
            "status": self.status,
        }


class ReconstructionEngine(ABC):
    @abstractmethod
    def reconstruct(self, images: List[Dict[str, Any]]) -> ReconstructionResult:
        raise NotImplementedError
