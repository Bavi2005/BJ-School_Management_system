from abc import ABC, abstractmethod
from typing import Any, Dict, Optional
from app.utils import build_response, utc_now


class MLModel(ABC):
    """Base class for all ML models in the AI service."""

    model_id: str = "base"

    @abstractmethod
    def predict(self, **kwargs) -> Dict[str, Any]:
        """Run prediction. Must return formatted response."""
        pass

    def format_response(
        self,
        data: Any,
        confidence: float,
        explanation: str,
        factors: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        return build_response(self.model_id, data, confidence, explanation, factors)

    def health_check(self) -> bool:
        return True
