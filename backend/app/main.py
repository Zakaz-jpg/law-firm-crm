from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import router as api_router
from app.database import Base, engine
from app.services.scheduler import start_scheduler, stop_scheduler
import app.models  # noqa: F401 — регистрирует все модели перед созданием таблиц

app = FastAPI(
    title="Law Firm CRM",
    description="REST API для мобильного приложения юриста",
    version="1.1.0",
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
    _run_migrations()
    start_scheduler()


def _run_migrations():
    """Каждая миграция — отдельная транзакция, чтобы ошибка одной не блокировала остальные."""
    import logging
    from sqlalchemy import text
    log = logging.getLogger(__name__)

    migrations = [
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'lawyer'",
        "ALTER TABLE cases ADD COLUMN IF NOT EXISTS court_type VARCHAR(50)",
        "ALTER TABLE cases ADD COLUMN IF NOT EXISTS external_case_url VARCHAR(255)",
        "ALTER TABLE cases ADD COLUMN IF NOT EXISTS amount NUMERIC(12,2)",
        "ALTER TABLE cases ADD COLUMN IF NOT EXISTS reminder_days INTEGER DEFAULT 3",
        "ALTER TABLE cases ADD COLUMN IF NOT EXISTS decision_date DATE",
        "ALTER TABLE cases ADD COLUMN IF NOT EXISTS full_decision_date DATE",
        "ALTER TABLE cases ADD COLUMN IF NOT EXISTS appeal_deadline DATE",
        "ALTER TABLE cases ADD COLUMN IF NOT EXISTS appeal_filed_date DATE",
        "ALTER TABLE cases ADD COLUMN IF NOT EXISTS cassation_deadline DATE",
        "ALTER TABLE cases ADD COLUMN IF NOT EXISTS cassation_filed_date DATE",
        "ALTER TABLE cases ADD COLUMN IF NOT EXISTS supervisory_deadline DATE",
        "ALTER TABLE cases ADD COLUMN IF NOT EXISTS supervisory_filed_date DATE",
        "ALTER TABLE cases ADD COLUMN IF NOT EXISTS defendant_id INTEGER REFERENCES clients(id)",
        "ALTER TABLE cases ADD COLUMN IF NOT EXISTS lead_lawyer_id INTEGER REFERENCES company_lawyers(id)",
        "ALTER TABLE cases ADD COLUMN IF NOT EXISTS current_stage_id INTEGER REFERENCES case_stages(id)",
        "ALTER TABLE company_lawyers ADD COLUMN IF NOT EXISTS position VARCHAR(100)",
        "ALTER TABLE company_lawyers ADD COLUMN IF NOT EXISTS specialization VARCHAR(200)",
        "ALTER TABLE company_lawyers ADD COLUMN IF NOT EXISTS phone VARCHAR(20)",
        "ALTER TABLE company_lawyers ADD COLUMN IF NOT EXISTS email VARCHAR(100)",
        "ALTER TABLE company_lawyers ADD COLUMN IF NOT EXISTS is_active INTEGER DEFAULT 1",
        "ALTER TABLE company_lawyers ADD COLUMN IF NOT EXISTS notes TEXT",
        "ALTER TABLE company_lawyers ADD COLUMN IF NOT EXISTS created_at DATETIME DEFAULT CURRENT_TIMESTAMP",
        "ALTER TABLE company_lawyers ADD COLUMN IF NOT EXISTS updated_at DATETIME DEFAULT CURRENT_TIMESTAMP",
        "ALTER TABLE company_lawyers ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id)",
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_company_lawyers_user_id ON company_lawyers(user_id) WHERE user_id IS NOT NULL",
        "ALTER TABLE cases ADD COLUMN IF NOT EXISTS lawyer_id INTEGER REFERENCES users(id)",
    ]
    for sql in migrations:
        try:
            with engine.begin() as conn:
                conn.execute(text(sql))
        except Exception as e:
            log.debug(f"Migration skipped ({e}): {sql[:60]}")

    # Гарантируем что admin@lawcrm.ru всегда имеет роль admin
    try:
        with engine.begin() as conn:
            conn.execute(text(
                "UPDATE users SET role = 'admin' WHERE email = 'admin@lawcrm.ru' AND role != 'admin'"
            ))
    except Exception as e:
        log.debug(f"Admin role setup skipped: {e}")


@app.on_event("shutdown")
def shutdown_scheduler():
    stop_scheduler()


app.include_router(api_router)


@app.get("/health")
def health():
    return {"status": "ok"}
