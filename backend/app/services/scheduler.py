from __future__ import annotations
import logging
from datetime import datetime, timedelta, date

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger

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


def _check_deadlines() -> None:
    """Каждые 30 минут проверяет сроки обжалования и шлёт пуши за 7/3/1 день."""
    from app.database import SessionLocal
    from app.models.case import Case
    from app.models.user import DeviceToken
    from app.services.push_notification import send_push

    db = SessionLocal()
    try:
        today = date.today()

        deadline_fields = [
            ("appeal_deadline",      "appeal_filed_date",      "апелляционного обжалования"),
            ("cassation_deadline",   "cassation_filed_date",   "кассационного обжалования"),
            ("supervisory_deadline", "supervisory_filed_date", "надзорной жалобы"),
        ]
        remind_days = [7, 3, 1]

        for deadline_field, filed_field, label in deadline_fields:
            for days in remind_days:
                target = today + timedelta(days=days)
                cases = (
                    db.query(Case)
                    .filter(
                        getattr(Case, deadline_field) == target,
                        getattr(Case, filed_field).is_(None),
                        Case.status == "active",
                    )
                    .all()
                )
                for case in cases:
                    tokens = [dt.token for dt in db.query(DeviceToken).filter(DeviceToken.user_id == case.lawyer_id).all()]
                    if not tokens:
                        continue
                    send_push(
                        tokens=tokens,
                        title="Срок обжалования",
                        body=f"Через {days} {'день' if days == 1 else 'дня' if days <= 4 else 'дней'}: срок {label} по делу «{case.title}»",
                        data={"case_id": str(case.id), "type": "deadline"},
                    )

        # Просроченные сроки (жалоба не подана, срок прошёл)
        for deadline_field, filed_field, label in deadline_fields:
            overdue = (
                db.query(Case)
                .filter(
                    getattr(Case, deadline_field) < today,
                    getattr(Case, filed_field).is_(None),
                    Case.status == "active",
                )
                .all()
            )
            for case in overdue:
                tokens = [dt.token for dt in db.query(DeviceToken).filter(DeviceToken.user_id == case.lawyer_id).all()]
                if tokens:
                    send_push(
                        tokens=tokens,
                        title="Срок пропущен",
                        body=f"Пропущен срок {label} по делу «{case.title}»",
                        data={"case_id": str(case.id), "type": "deadline_missed"},
                    )

    except Exception as e:
        logger.error(f"Deadline check error: {e}")
    finally:
        db.close()


def _nightly_update() -> None:
    """Каждую ночь обновляет статус дел с просроченными сроками."""
    from app.database import SessionLocal
    from app.models.case import Case

    db = SessionLocal()
    try:
        today = date.today()
        overdue_cases = (
            db.query(Case)
            .filter(
                Case.status == "active",
                Case.appeal_deadline < today,
                Case.appeal_filed_date.is_(None),
            )
            .all()
        )
        for case in overdue_cases:
            case.status = "deadline_missed"
        if overdue_cases:
            db.commit()
            logger.info(f"Nightly: {len(overdue_cases)} cases marked deadline_missed")
    except Exception as e:
        logger.error(f"Nightly update error: {e}")
    finally:
        db.close()


def start_scheduler() -> None:
    scheduler.add_job(
        _check_hearings,
        trigger=IntervalTrigger(hours=1),
        id="hearing_reminders",
        replace_existing=True,
    )
    scheduler.add_job(
        _check_deadlines,
        trigger=IntervalTrigger(minutes=30),
        id="deadline_reminders",
        replace_existing=True,
    )
    scheduler.add_job(
        _nightly_update,
        trigger=CronTrigger(hour=0, minute=5, timezone="Europe/Moscow"),
        id="nightly_update",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("APScheduler started — hearings + deadlines + nightly")


def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
