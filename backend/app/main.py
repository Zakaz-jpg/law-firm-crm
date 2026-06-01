from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import router as api_router
from app.database import Base, engine
import app.models  # noqa: F401 — регистрирует все модели перед созданием таблиц

app = FastAPI(
    title="Law Firm CRM",
    description="REST API для мобильного приложения юриста",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def create_tables():
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        conn.execute(
            __import__("sqlalchemy").text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'lawyer'"
            )
        )
        conn.commit()


app.include_router(api_router)


@app.get("/health")
def health():
    return {"status": "ok"}
