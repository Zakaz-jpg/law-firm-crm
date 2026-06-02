from __future__ import annotations
from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel
from app.schemas.client import ClientRead
from app.schemas.attachment import AttachmentRead


class CaseBase(BaseModel):
    title: str
    case_number: Optional[str] = None
    status: str = "active"
    category: Optional[str] = None
    court: Optional[str] = None
    court_type: Optional[str] = None
    description: Optional[str] = None
    next_hearing_date: Optional[datetime] = None
    client_id: Optional[int] = None
    defendant_id: Optional[int] = None
    lead_lawyer_id: Optional[int] = None
    external_case_url: Optional[str] = None
    amount: Optional[Decimal] = None
    reminder_days: Optional[int] = 3
    decision_date: Optional[date] = None
    full_decision_date: Optional[date] = None
    appeal_deadline: Optional[date] = None
    appeal_filed_date: Optional[date] = None
    cassation_deadline: Optional[date] = None
    cassation_filed_date: Optional[date] = None
    supervisory_deadline: Optional[date] = None
    supervisory_filed_date: Optional[date] = None


class CaseCreate(CaseBase):
    pass


class CaseUpdate(CaseBase):
    title: Optional[str] = None
    status: Optional[str] = None


class CaseStatusUpdate(BaseModel):
    status: str


class CaseRead(CaseBase):
    id: int
    lawyer_id: int
    current_stage_id: Optional[int] = None
    client: Optional[ClientRead] = None
    defendant: Optional[ClientRead] = None
    attachments: List[AttachmentRead] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
