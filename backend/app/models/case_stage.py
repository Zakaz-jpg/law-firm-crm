from datetime import datetime, date, time
from typing import Optional
from sqlalchemy import String, Text, DateTime, Date, Time, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class CaseStage(Base):
    __tablename__ = "case_stages"

    id: Mapped[int] = mapped_column(primary_key=True)
    case_id: Mapped[int] = mapped_column(ForeignKey("cases.id", ondelete="CASCADE"))

    stage_type: Mapped[str] = mapped_column(String(50), default="first_instance")
    # first_instance / appeal / cassation / supervisory / review

    court_name: Mapped[Optional[str]] = mapped_column(String(200))
    judge_name: Mapped[Optional[str]] = mapped_column(String(150))
    case_number_stage: Mapped[Optional[str]] = mapped_column(String(50))

    hearing_date: Mapped[Optional[datetime]] = mapped_column(DateTime)
    courtroom: Mapped[Optional[str]] = mapped_column(String(50))
    hearing_format: Mapped[Optional[str]] = mapped_column(String(20))  # in_person / vks
    vks_link: Mapped[Optional[str]] = mapped_column(String(255))

    date_start: Mapped[Optional[date]] = mapped_column(Date)
    date_end: Mapped[Optional[date]] = mapped_column(Date)
    result: Mapped[Optional[str]] = mapped_column(Text)

    stage_status: Mapped[str] = mapped_column(String(50), default="in_progress")
    # not_started / in_progress / completed / appealed

    decision_date: Mapped[Optional[date]] = mapped_column(Date)
    full_decision_date: Mapped[Optional[date]] = mapped_column(Date)
    appeal_deadline: Mapped[Optional[date]] = mapped_column(Date)
    appeal_filed_date: Mapped[Optional[date]] = mapped_column(Date)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    case: Mapped["Case"] = relationship("Case", back_populates="stages", foreign_keys=[case_id])
