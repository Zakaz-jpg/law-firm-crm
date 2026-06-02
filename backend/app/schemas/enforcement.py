from __future__ import annotations
from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel


class EnforcementCreate(BaseModel):
    fssp_number: Optional[str] = None
    fssp_start_date: Optional[date] = None
    bailiff_name: Optional[str] = None
    fssp_status: Optional[str] = None
    fssp_url: Optional[str] = None
    notes: Optional[str] = None


class EnforcementUpdate(EnforcementCreate):
    pass


class EnforcementRead(EnforcementCreate):
    id: int
    case_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
