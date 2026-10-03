from __future__ import annotations

from typing import Any, Dict


class AnalysisService:
    def analyze(self, project: Dict[str, Any], question: str) -> Dict[str, Any]:
        results = project.get("last_simulation") or {}
        design = results.get("design", {})
        as_built = results.get("as_built", {})
        comparison = results.get("comparison", {})
        design_factor = float(design.get("factor_of_safety", 1.0))
        built_factor = float(as_built.get("factor_of_safety", 1.0))
        survive = built_factor > 1.0
        answer = (
            f"The manufactured part is predicted to {'survive' if survive else 'not survive'} the specified load "
            f"under the current deterministic model. The factor of safety decreases from {design_factor:.2f} to {built_factor:.2f}. "
            f"Displacement changes by {comparison.get('displacement_change_percent', 0.0):.1f}% and stress changes by {comparison.get('stress_change_percent', 0.0):.1f}%. "
            f"The current result uses mock material measurements and should not be treated as physical certification."
        )
        return {
            "question": question,
            "status": "ok",
            "answer": answer,
            "engineering_summary": {
                "factor_of_safety_design": design_factor,
                "factor_of_safety_as_built": built_factor,
                "stress_increase_percent": comparison.get("stress_change_percent", 0.0),
                "displacement_increase_percent": comparison.get("displacement_change_percent", 0.0),
                "warnings": ["Mock data remains in use for the demo."],
            },
        }
