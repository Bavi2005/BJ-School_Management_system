import secrets
import traceback
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app.config import get_settings
from app.models import get_model
from app.models import (
    PerformancePredictor,
    AttendanceRiskModel,
    ScheduleOptimizer,
    AutoGrader,
    RecommendationEngine,
    AnomalyDetector,
)
from app.services.chatbot import ChatbotService
from app.utils import build_response, generate_request_id, utc_now

settings = get_settings()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI microservice for EduCore Nexus - performance prediction, smart scheduling, auto-grading, and more.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.BACKEND_URL] if settings.BACKEND_URL else [],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-API-Key"],
)


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------
class PredictRequest(BaseModel):
    modelType: str = Field(..., description="Model identifier")
    data: Dict[str, Any] = Field(..., description="Input data for the model")


class ChatMessageRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=10000)
    history: Optional[List[Dict[str, str]]] = None
    context: Optional[Dict[str, Any]] = None


# ---------------------------------------------------------------------------
# Middleware
# ---------------------------------------------------------------------------
@app.middleware("http")
async def add_request_id(request: Request, call_next):
    request_id = generate_request_id()
    response: Response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response


@app.middleware("http")
async def validate_api_key(request: Request, call_next):
    if request.url.path == "/health":
        return await call_next(request)
    if request.url.path == "/docs" or request.url.path.startswith("/openapi"):
        return await call_next(request)
    key = request.headers.get("X-API-Key", "")
    # Constant-time comparison to prevent timing attacks.
    if not secrets.compare_digest(key, settings.AI_API_KEY):
        return JSONResponse(
            status_code=401,
            content={"success": False, "error": {"code": "UNAUTHORIZED", "message": "Invalid API key"}},
        )
    return await call_next(request)


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------
@app.get("/health", tags=["System"])
async def health():
    return {
        "status": "ok",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "models": [
            PerformancePredictor.model_id,
            AttendanceRiskModel.model_id,
            ScheduleOptimizer.model_id,
            AutoGrader.model_id,
            RecommendationEngine.model_id,
            AnomalyDetector.model_id,
        ],
        "timestamp": utc_now(),
    }


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
@app.post("/predict/performance", tags=["AI Models"])
async def predict_performance(req: PredictRequest):
    try:
        model = PerformancePredictor()
        data = req.data
        result = model.predict(
            historical_grades=data.get("historicalGrades", []),
            attendance_rate=data.get("attendanceRate", 1.0),
            assignment_completion=data.get("assignmentCompletion", 1.0),
            features=data.get("features"),
        )
        return {"success": True, "data": result}
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict/attendance-risk", tags=["AI Models"])
async def predict_attendance_risk(req: PredictRequest):
    try:
        model = AttendanceRiskModel()
        data = req.data
        result = model.predict(
            attendance_history=data.get("attendanceHistory", []),
            current_rate=data.get("currentRate", 1.0),
            days_absent_recent=data.get("daysAbsentRecent", 0),
        )
        return {"success": True, "data": result}
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/schedule/generate", tags=["AI Models"])
async def generate_schedule(req: PredictRequest):
    try:
        model = ScheduleOptimizer()
        data = req.data
        result = model.predict(
            lessons=data.get("lessons", []),
            slot_count=data.get("slotCount", 40),
        )
        return {"success": True, "data": result}
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/grade/auto", tags=["AI Models"])
async def auto_grade(req: PredictRequest):
    try:
        model = AutoGrader()
        data = req.data
        result = model.predict(
            content=data.get("content", ""),
            max_score=data.get("maxScore", 100.0),
            rubric_topics=data.get("rubricTopics"),
            expected_length=data.get("expectedLength", 300),
        )
        return {"success": True, "data": result}
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/recommend/generate", tags=["AI Models"])
async def generate_recommendations(req: PredictRequest):
    try:
        model = RecommendationEngine()
        data = req.data
        result = model.predict(
            weak_subjects=data.get("weakSubjects", []),
            strengths=data.get("strengths"),
            study_hours=data.get("studyHours", 5.0),
        )
        return {"success": True, "data": result}
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/detect/anomalies", tags=["AI Models"])
async def detect_anomalies(req: PredictRequest):
    try:
        model = AnomalyDetector()
        data = req.data
        result = model.predict(
            metric_name=data.get("metricName", "unknown"),
            values=data.get("values", []),
            student_id=data.get("studentId"),
        )
        return {"success": True, "data": result}
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# Chatbot
# ---------------------------------------------------------------------------
@app.post("/chat/message", tags=["Chatbot"])
async def chat_message(req: ChatMessageRequest):
    try:
        chatbot = ChatbotService()
        result = await chatbot.respond(
            message=req.message,
            history=req.history,
            user_context=req.context,
        )
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
