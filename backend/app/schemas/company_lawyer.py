from __future__ import annotations
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class CompanyLawyerCreate(BaseModel):
    full_name: str
    position: Optional[str] = None
    specialization: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    is_active: bool = True
    notes: Optional[str] = None


class CompanyLawyerUpdate(CompanyLawyerCreate):
    full_name: Optional[str] = None


class CompanyLawyerRead(CompanyLawyerCreate):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
