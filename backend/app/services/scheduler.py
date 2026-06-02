from __future__ import annotations
import logging
from datetime import datetime, timedelta

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler(timezone="UTC")


def _check_hearings() -> None:
    """Каждый час ищет заседания через 3 дня / 1 день / 1 час и шлёт пуши."""
    from app.database import SessionLocal
    from app.models.case import Case
    from app.models.user import DeviceToken
    from app.services.push_notification import send_push

    db = SessionLocal()
    try:
        now = datetime.utcnow()

        windows = [
            (timedelta(hours=1),  timedelta(minutes=30), "Через час заседание по делу «{title}»"),
            (timedelta(days=1),   timedelta(hours=2),    "Завтра заседание по делу «{title}»"),
            (timedelta(days=3),   timedelta(hours=2),    "Через 3 дня заседание по делу «{title}»"),
        ]

        for delta, tolerance, msg_template in windows:
            target_start = now + delta - tolerance
            target_end   = now + delta + tolerance

            cases = (
                db.query(Case)
                .filter(Case.next_hearing_date >= target_start)
                .filter(Case.next_hearing_date <= target_end)
                .all()
            )

            for case in cases:
                tokens = [
                    dt.token
                    for dt in db.query(DeviceToken)
                    .filter(DeviceToken.user_id == case.lawyer_id)
                    .all()
                ]
                if not tokens:
                    continue

                body = msg_template.format(title=case.title)
                send_push(
                    tokens=tokens,
                    title="LawCRM",
                    body=body,
                    data={"case_id": str(case.id)},
                )
                logger.info(f"Reminder sent for case {case.id} ({delta})")
    except Exception as e:
        logger.error(f"Scheduler error: {e}")
    finally:
        db.close()


def start_scheduler() -> None:
    scheduler.add_job(
        _check_hearings,
        trigger=IntervalTrigger(hours=1),
        id="hearing_reminders",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("APScheduler started — hearing reminders every hour")


def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
