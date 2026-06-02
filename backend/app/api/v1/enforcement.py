from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.database import get_db
from app.models.case import Case
from app.models.enforcement import Enforcement
from app.models.user import User
from app.schemas.enforcement import EnforcementCreate, EnforcementUpdate, EnforcementRead

router = APIRouter(prefix="/cases", tags=["enforcement"])


def _get_case(case_id: int, db: Session, user: User) -> Case:
    case = db.query(Case).filter(Case.id == case_id, Case.lawyer_id == user.id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Дело не найдено")
    return case


@router.get("/{case_id}/enforcement", response_model=List[EnforcementRead])
def list_enforcement(case_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _get_case(case_id, db, current_user)
    return db.query(Enforcement).filter(Enforcement.case_id == case_id).all()


@router.post("/{case_id}/enforcement", response_model=EnforcementRead, status_code=201)
def create_enforcement(case_id: int, data: EnforcementCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _get_case(case_id, db, current_user)
    record = Enforcement(case_id=case_id, **data.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.patch("/{case_id}/enforcement/{record_id}", response_model=EnforcementRead)
def update_enforcement(case_id: int, record_id: int, data: EnforcementUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _get_case(case_id, db, current_user)
    record = db.query(Enforcement).filter(Enforcement.id == record_id, Enforcement.case_id == case_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Запись не найдена")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(record, k, v)
    db.commit()
    db.refresh(record)
    return record


@router.delete("/{case_id}/enforcement/{record_id}", status_code=204)
def delete_enforcement(case_id: int, record_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _get_case(case_id, db, current_user)
    record = db.query(Enforcement).filter(Enforcement.id == record_id, Enforcement.case_id == case_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Запись не найдена")
    db.delete(record)
    db.commit()
