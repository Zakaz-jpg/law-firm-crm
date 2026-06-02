from __future__ import annotations
from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel

STAGE_LABELS = {
    "first_instance": "Первая инстанция",
    "appeal": "Апелляция",
    "cassation": "Кассация",
    "supervisory": "Надзор",
    "review": "Пересмотр",
}

STATUS_LABELS = {
    "not_started": "Не начата",
    "in_progress": "В процессе",
    "completed": "Завершена",
    "appealed": "Обжалована",
}


class CaseStageCreate(BaseModel):
    stage_type: str = "first_instance"
    court_name: Optional[str] = None
    judge_name: Optional[str] = None
    case_number_stage: Optional[str] = None
    hearing_date: Optional[datetime] = None
    courtroom: Optional[str] = None
    hearing_format: Optional[str] = None
    vks_link: Optional[str] = None
    date_start: Optional[date] = None
    date_end: Optional[date] = None
    result: Optional[str] = None
    stage_status: str = "in_progress"
    decision_date: Optional[date] = None
    full_decision_date: Optional[date] = None
    appeal_deadline: Optional[date] = None
    appeal_filed_date: Optional[date] = None


class CaseStageUpdate(CaseStageCreate):
    stage_type: Optional[str] = None
    stage_status: Optional[str] = None


class CaseStageRead(CaseStageCreate):
    id: int
    case_id: int
    stage_type_label: Optional[str] = None
    stage_status_label: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_with_labels(cls, obj) -> "CaseStageRead":
        data = cls.model_validate(obj)
        data.stage_type_label = STAGE_LABELS.get(obj.stage_type, obj.stage_type)
        data.stage_status_label = STATUS_LABELS.get(obj.stage_status, obj.stage_status)
        return data
