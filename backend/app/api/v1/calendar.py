from datetime import date, datetime
from typing import Optional, List

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.database import get_db
from app.models.case import Case
from app.models.user import User

router = APIRouter(prefix="/calendar", tags=["calendar"])


class CalendarEvent(BaseModel):
    case_id: int
    case_number: Optional[str]
    title: str
    court: Optional[str]
    hearing_date: datetime

    model_config = {"from_attributes": True}


@router.get("", response_model=List[CalendarEvent])
def get_calendar(
    start: date = Query(..., description="Начало периода YYYY-MM-DD"),
    end: date = Query(..., description="Конец периода YYYY-MM-DD"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    start_dt = datetime(start.year, start.month, start.day)
    end_dt = datetime(end.year, end.month, end.day, 23, 59, 59)

    cases = (
        db.query(Case)
        .filter(Case.lawyer_id == current_user.id)
        .filter(Case.next_hearing_date >= start_dt)
        .filter(Case.next_hearing_date <= end_dt)
        .order_by(Case.next_hearing_date)
        .all()
    )

    return [
        CalendarEvent(
            case_id=c.id,
            case_number=c.case_number,
            title=c.title,
            court=c.court,
            hearing_date=c.next_hearing_date,
        )
        for c in cases
    ]
