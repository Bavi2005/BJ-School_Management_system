import sys
import os
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.config import get_settings

client = TestClient(app)
settings = get_settings()

HEADERS = {"X-API-Key": settings.AI_API_KEY}


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "models" in data


def test_predict_performance():
    response = client.post(
        "/predict/performance",
        headers=HEADERS,
        json={
            "modelType": "PERFORMANCE_PREDICTION",
            "data": {
                "historicalGrades": [70, 75, 80, 78, 85],
                "attendanceRate": 0.95,
                "assignmentCompletion": 0.9,
            },
        },
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert "predictedScore" in data
    assert 0 <= data["predictedScore"] <= 100
    assert 0 <= data.get("confidence", 1) <= 1


def test_predict_performance_empty_grades():
    response = client.post(
        "/predict/performance",
        headers=HEADERS,
        json={"modelType": "PERFORMANCE_PREDICTION", "data": {"historicalGrades": []}},
    )
    assert response.status_code == 422


def test_predict_attendance_risk():
    response = client.post(
        "/predict/attendance-risk",
        headers=HEADERS,
        json={
            "modelType": "ATTENDANCE_RISK",
            "data": {
                "attendanceHistory": [0.9, 0.85, 0.8, 0.7, 0.6],
                "daysAbsentRecent": 3,
            },
        },
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert "riskScore" in data
    assert 0 <= data["riskScore"] <= 1


def test_generate_schedule():
    lessons = [
        {"classId": "c1", "subjectId": "s1", "teacherId": "t1", "preferredSlots": [0, 1]},
        {"classId": "c1", "subjectId": "s2", "teacherId": "t2", "preferredSlots": [2, 3]},
        {"classId": "c2", "subjectId": "s1", "teacherId": "t1", "preferredSlots": [4, 5]},
    ]
    response = client.post(
        "/schedule/generate",
        headers=HEADERS,
        json={"modelType": "SMART_SCHEDULING", "data": {"lessons": lessons, "slotCount": 10}},
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert len(data["schedule"]) == 3


def test_auto_grade():
    response = client.post(
        "/grade/auto",
        headers=HEADERS,
        json={
            "modelType": "AUTO_GRADING",
            "data": {
                "content": "Photosynthesis is the process by which plants convert sunlight into energy. "
                          "This process is essential for life. Plants use chlorophyll to capture light energy. "
                          "The light reactions produce ATP and NADPH. The Calvin cycle uses these to fix carbon dioxide.",
                "maxScore": 100,
                "rubricTopics": ["photosynthesis", "chlorophyll", "carbon"],
            },
        },
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert "score" in data
    assert 0 <= data["score"] <= 100


def test_generate_recommendations():
    response = client.post(
        "/recommend/generate",
        headers=HEADERS,
        json={
            "modelType": "RECOMMENDATION",
            "data": {"weakSubjects": ["mathematics", "english"], "studyHours": 5.0},
        },
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert "recommendations" in data


def test_detect_anomalies():
    response = client.post(
        "/detect/anomalies",
        headers=HEADERS,
        json={
            "modelType": "ANOMALY_DETECTION",
            "data": {"metricName": "grades", "values": [70, 72, 68, 71, 95, 69, 73]},
        },
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert len(data["anomalies"]) >= 1


def test_chat_message():
    response = client.post(
        "/chat/message",
        headers=HEADERS,
        json={"message": "Show me my timetable"},
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert "response" in data


def test_unauthorized():
    response = client.post(
        "/predict/performance",
        json={"modelType": "X", "data": {}},
    )
    assert response.status_code == 401