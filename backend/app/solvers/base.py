from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Dict


class SimulationEngine(ABC):
    @abstractmethod
    def run_simulation(self, mesh: Dict[str, Any], material: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
        raise NotImplementedError
