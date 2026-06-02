from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List
from sqlalchemy import String, Text, DateTime, Date, ForeignKey, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Case(Base):
    __tablename__ = "cases"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(500), index=True)
    case_number: Mapped[Optional[str]] = mapped_column(String(100), unique=True)
    status: Mapped[str] = mapped_column(String(50), default="active")
    category: Mapped[Optional[str]] = mapped_column(String(100))
    court: Mapped[Optional[str]] = mapped_column(String(255))
    description: Mapped[Optional[str]] = mapped_column(Text)
    next_hearing_date: Mapped[Optional[datetime]] = mapped_column(DateTime)

    # Новые поля (все nullable для совместимости с прод)
    court_type: Mapped[Optional[str]] = mapped_column(String(50))       # arbitration / general
    external_case_url: Mapped[Optional[str]] = mapped_column(String(255))
    amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2))
    reminder_days: Mapped[Optional[int]] = mapped_column(default=3)

    # Процессуальные сроки
    decision_date: Mapped[Optional[date]] = mapped_column(Date)
    full_decision_date: Mapped[Optional[date]] = mapped_column(Date)
    appeal_deadline: Mapped[Optional[date]] = mapped_column(Date)
    appeal_filed_date: Mapped[Optional[date]] = mapped_column(Date)
    cassation_deadline: Mapped[Optional[date]] = mapped_column(Date)
    cassation_filed_date: Mapped[Optional[date]] = mapped_column(Date)
    supervisory_deadline: Mapped[Optional[date]] = mapped_column(Date)
    supervisory_filed_date: Mapped[Optional[date]] = mapped_column(Date)

    lawyer_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    client_id: Mapped[Optional[int]] = mapped_column(ForeignKey("clients.id"))
    defendant_id: Mapped[Optional[int]] = mapped_column(ForeignKey("clients.id"))
    lead_lawyer_id: Mapped[Optional[int]] = mapped_column(ForeignKey("company_lawyers.id"))
    current_stage_id: Mapped[Optional[int]] = mapped_column(ForeignKey("case_stages.id", use_alter=True))

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    lawyer: Mapped["User"] = relationship("User", back_populates="cases")
    client: Mapped[Optional["Client"]] = relationship("Client", back_populates="cases", foreign_keys=[client_id])
    defendant: Mapped[Optional["Client"]] = relationship("Client", foreign_keys=[defendant_id])
    lead_lawyer: Mapped[Optional["CompanyLawyer"]] = relationship("CompanyLawyer", back_populates="cases")
    attachments: Mapped[List["Attachment"]] = relationship("Attachment", back_populates="case")
    events: Mapped[List["CaseEvent"]] = relationship("CaseEvent", back_populates="case", order_by="CaseEvent.created_at.desc()")
    stages: Mapped[List["CaseStage"]] = relationship("CaseStage", back_populates="case",
                                                      foreign_keys="CaseStage.case_id",
                                                      order_by="CaseStage.created_at")
    enforcement_records: Mapped[List["Enforcement"]] = relationship("Enforcement", back_populates="case",
                                                                     cascade="all, delete-orphan")


class CaseEvent(Base):
    __tablename__ = "case_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    case_id: Mapped[int] = mapped_column(ForeignKey("cases.id", ondelete="CASCADE"))
    event_type: Mapped[str] = mapped_column(String(50))
    description: Mapped[str] = mapped_column(Text)
    old_value: Mapped[Optional[str]] = mapped_column(String(100))
    new_value: Mapped[Optional[str]] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    case: Mapped["Case"] = relationship("Case", back_populates="events")
