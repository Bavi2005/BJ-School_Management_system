from typing import Any, Optional
from datetime import datetime, timezone
import uuid
import logging
import json

logger = logging.getLogger("ai_service")


def generate_request_id() -> str:
    return f"req_{datetime.now().timestamp()}_{uuid.uuid4().hex[:8]}"


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def build_response(
    model_type: str,
    data: Any,
    confidence: float,
    explanation: str,
    factors: Optional[dict] = None,
) -> dict:
    return {
        "modelType": model_type,
        "prediction": data,
        "confidence": round(confidence, 4),
        "factors": factors or {},
        "explanation": explanation,
        "generatedAt": utc_now(),
    }


def clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def safe_json(value: Any) -> str:
    return json.dumps(value, default=str)


def parse_json(value: Optional[str]) -> Any:
    if not value:
        return None
    try:
        return json.loads(value)
    except (json.JSONDecodeError, TypeError):
        return None
