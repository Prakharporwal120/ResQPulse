import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "LifeLink AI"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "SIMULATED"  # "DEMO", "SIMULATED", or "CONNECTED_TO_HARDWARE"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "lifelink-ai-secret-key-super-secure-production-ready-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Escalation and Alert Configuration
    ESCALATION_TIMEOUT_SECONDS: int = 60  # 60s for demo responsiveness
    FALL_ACCEL_THRESHOLD: float = 2.8     # g-force threshold for fall impact
    FREE_FALL_THRESHOLD: float = 0.5      # g-force threshold for low-g phase
    INACTIVITY_TIME_WINDOW: float = 2.5   # seconds of post-impact stillness
    COOLDOWN_SECONDS: int = 20            # deduplication cooldown per patient
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./lifelink.db")
    
    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:8000"
    ]

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
