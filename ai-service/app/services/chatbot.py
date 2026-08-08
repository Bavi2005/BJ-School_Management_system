"""
Chatbot service - combines a rule-based fallback with optional Jina AI (LLM) integration.
"""
from typing import Any, Dict, List, Optional
import os
import httpx

from app.config import get_settings


class ChatbotService:
    """
    AI assistant for students, teachers, and parents.
    Uses Jina AI API (OpenAI-compatible chat completions) when configured,
    falls back to a curated rule-based response engine otherwise.
    """

    def __init__(self):
        self.settings = get_settings()

        self.intents = {
            "attendance": ["attendance", "absent", "present", "missed"],
            "grades": ["grade", "score", "result", "exam", "gpa"],
            "fees": ["fee", "payment", "tuition", "invoice", "due"],
            "timetable": ["timetable", "schedule", "class time", "period"],
            "events": ["event", "calendar", "activity", "sports"],
            "homework": ["homework", "assignment", "submission", "due date"],
            "help": ["help", "how do", "how to", "what can"],
        }

    async def respond(
        self,
        message: str,
        history: Optional[List[Dict[str, str]]] = None,
        user_context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        if not message or not message.strip():
            return self._build_response("Please tell me how I can help you.", 0.9)

        # 1. Try a hosted LLM (OpenAI-compatible) if an API key is configured.
        #    This runs entirely in the cloud - nothing is hosted on this laptop.
        api_key = self.settings.LLM_API_KEY or self.settings.JINA_API_KEY
        if api_key:
            try:
                return await self._llm_response(message, history, user_context)
            except Exception:
                pass

        # 2. Fallback to intent engine
        return self._rule_response(message)

    async def _llm_response(
        self,
        message: str,
        history: Optional[List[Dict[str, str]]],
        user_context: Optional[Dict[str, Any]],
    ) -> Dict[str, Any]:
        system_prompt = (
            "You are EduAI, the helpful AI assistant for EduCore Nexus, a school management "
            "system. You help students, teachers, and parents with attendance, grades, "
            "timetables, fees, assignments, and events. Be concise, friendly, and accurate."
        )

        messages = [{"role": "system", "content": system_prompt}]
        if history:
            messages.extend(history[-10:])
        messages.append({"role": "user", "content": message})

        # Prefer the generic OpenAI-compatible endpoint; fall back to Jina.
        base_url = self.settings.LLM_BASE_URL.rstrip("/")
        model = self.settings.LLM_MODEL
        api_key = self.settings.LLM_API_KEY or self.settings.JINA_API_KEY

        if self.settings.JINA_API_KEY and not self.settings.LLM_API_KEY:
            base_url = self.settings.JINA_API_URL.rstrip("/")
            model = "jina-chat"

        async with httpx.AsyncClient(timeout=self.settings.LLM_TIMEOUT) as client:
            response = await client.post(
                f"{base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model,
                    "messages": messages,
                    "temperature": 0.7,
                    "max_tokens": 500,
                },
            )
            response.raise_for_status()
            data = response.json()

        content = data["choices"][0]["message"]["content"]
        return self._build_response(content, 0.92, source="llm")

    def _rule_response(self, message: str) -> Dict[str, Any]:
        text = message.lower()

        intent_scores = {}
        for intent, keywords in self.intents.items():
            intent_scores[intent] = sum(1 for kw in keywords if kw in text)

        best_intent = max(intent_scores, key=intent_scores.get) if any(intent_scores.values()) else None
        score = intent_scores[best_intent] / max(intent_scores.values()) if best_intent else 0

        responses = {
            "attendance": (
                "You can view your attendance in the Attendance section of your dashboard. "
                "If you see an error in your attendance record, please contact your class teacher or the admin office."
            ),
            "grades": (
                "Your grades are available in the Grades section. I can also predict your "
                "likely end-of-term performance - try the AI Insights panel for an analysis "
                "of your strengths and areas to improve."
            ),
            "fees": (
                "Fee details and payment history are in the Fees section. You can pay online "
                "via card or bank transfer. Overdue fees are highlighted in red on your dashboard."
            ),
            "timetable": (
                "Your weekly timetable is in the Timetable section. It shows all your classes "
                "organized by day. If a class is missing, please notify the administration."
            ),
            "events": (
                "Upcoming school events appear in the Events and Calendar sections. Events "
                "are synced with Google Calendar, so you can get reminders on your phone."
            ),
            "homework": (
                "Assignments and homework are in the Assignments section. Submit before the "
                "due date to avoid late penalties. You can upload files or type your answer."
            ),
            "help": (
                "I can help you with: attendance, grades, fees, timetables, events, homework, "
                "and academic advice. Just ask me something like 'What are my fees?' or "
                "'Show my timetable'."
            ),
        }

        if best_intent:
            confidence = 0.6 + 0.2 * min(score, 1.0)
            return self._build_response(responses[best_intent], confidence)
        else:
            return self._build_response(
                "I'm not sure I understood. You can ask me about attendance, grades, fees, "
                "timetables, events, or homework.",
                0.3,
            )

    def _build_response(self, content: str, confidence: float, source: str = "rules") -> Dict[str, Any]:
        return {
            "response": content,
            "source": source,
            "confidence": round(confidence, 4),
        }
