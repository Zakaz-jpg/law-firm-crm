from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.database import get_db
from app.models.case import Case
from app.models.case_stage import CaseStage
from app.models.user import User
from app.schemas.case_stage import CaseStageCreate, CaseStageUpdate, CaseStageRead

router = APIRouter(prefix="/cases", tags=["stages"])


def _get_case_or_404(case_id: int, db: Session, user: User) -> Case:
    case = db.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Дело не найдено")
    return case


@router.get("/{case_id}/stages", response_model=List[CaseStageRead])
def list_stages(case_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _get_case_or_404(case_id, db, current_user)
    stages = db.query(CaseStage).filter(CaseStage.case_id == case_id).order_by(CaseStage.created_at).all()
    return [CaseStageRead.from_orm_with_labels(s) for s in stages]


@router.post("/{case_id}/stages", response_model=CaseStageRead, status_code=201)
def create_stage(case_id: int, data: CaseStageCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    case = _get_case_or_404(case_id, db, current_user)
    stage = CaseStage(case_id=case_id, **data.model_dump())
    db.add(stage)
    db.flush()
    # Устанавливаем как текущую активную стадию
    case.current_stage_id = stage.id
    db.commit()
    db.refresh(stage)
    return CaseStageRead.from_orm_with_labels(stage)


@router.patch("/{case_id}/stages/{stage_id}", response_model=CaseStageRead)
def update_stage(case_id: int, stage_id: int, data: CaseStageUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _get_case_or_404(case_id, db, current_user)
    stage = db.query(CaseStage).filter(CaseStage.id == stage_id, CaseStage.case_id == case_id).first()
    if not stage:
        raise HTTPException(status_code=404, detail="Стадия не найдена")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(stage, k, v)
    db.commit()
    db.refresh(stage)
    return CaseStageRead.from_orm_with_labels(stage)


@router.delete("/{case_id}/stages/{stage_id}", status_code=204)
def delete_stage(case_id: int, stage_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _get_case_or_404(case_id, db, current_user)
    stage = db.query(CaseStage).filter(CaseStage.id == stage_id, CaseStage.case_id == case_id).first()
    if not stage:
        raise HTTPException(status_code=404, detail="Стадия не найдена")
    db.delete(stage)
    db.commit()
