from __future__ import annotations
from datetime import datetime
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
    description: Optional[str] = None
    next_hearing_date: Optional[datetime] = None
    client_id: Optional[int] = None


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
    client: Optional[ClientRead] = None
    attachments: List[AttachmentRead] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
