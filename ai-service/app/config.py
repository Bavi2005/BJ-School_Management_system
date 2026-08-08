from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    APP_NAME: str = "EduCore Nexus AI Service"
    APP_VERSION: str = "2.0.0"
    DEBUG: bool = True
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    BACKEND_URL: str = "http://localhost:4000"
    AI_API_KEY: str = "dev-key-change-me"

    # Cloud LLM provider (OpenAI-compatible). Leave API key empty to use the
    # built-in rule-based assistant. Set API_KEY and optionally the base URL +
    # model to route chat through any hosted LLM (OpenAI, Groq, DeepSeek,
    # Together, LM Studio, vLLM, etc.). Nothing runs locally on this machine.
    LLM_API_KEY: str = ""
    LLM_BASE_URL: str = "https://api.openai.com/v1"
    LLM_MODEL: str = "gpt-4o-mini"
    LLM_TIMEOUT: int = 25

    # Backwards-compatible alias
    JINA_API_KEY: str = ""
    JINA_API_URL: str = "https://api.jina.ai/v1"

    MODEL_CACHE_TTL: int = 3600
    CONFIDENCE_HIGH: float = 0.85
    CONFIDENCE_MEDIUM: float = 0.65

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
