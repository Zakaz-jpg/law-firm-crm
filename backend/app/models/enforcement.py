from datetime import datetime, date
from typing import Optional
from sqlalchemy import String, Text, DateTime, Date, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Enforcement(Base):
    __tablename__ = "enforcement"

    id: Mapped[int] = mapped_column(primary_key=True)
    case_id: Mapped[int] = mapped_column(ForeignKey("cases.id", ondelete="CASCADE"))
    fssp_number: Mapped[Optional[str]] = mapped_column(String(50))
    fssp_start_date: Mapped[Optional[date]] = mapped_column(Date)
    bailiff_name: Mapped[Optional[str]] = mapped_column(String(150))
    fssp_status: Mapped[Optional[str]] = mapped_column(String(100))
    fssp_url: Mapped[Optional[str]] = mapped_column(String(255))
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    case: Mapped["Case"] = relationship("Case", back_populates="enforcement_records")
