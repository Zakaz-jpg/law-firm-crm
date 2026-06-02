from __future__ import annotations
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload

from app.core.deps import get_current_user
from app.database import get_db
from app.models.case import Case, CaseEvent
from app.models.user import User
from app.schemas.case import CaseCreate, CaseRead, CaseStatusUpdate, CaseUpdate
from app.services.deadlines import calculate_deadlines
from app.services.audit import log as audit_log
from typing import List as ListType

router = APIRouter(prefix="/cases", tags=["cases"])

VALID_STATUSES = {"active", "suspended", "closed", "won", "lost"}


def _load_case(db: Session, case_id: int, user_id: int) -> Case:
    case = (
        db.query(Case)
        .options(selectinload(Case.client), selectinload(Case.attachments))
        .filter(Case.id == case_id, Case.lawyer_id == user_id)
        .first()
    )
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case


@router.get("", response_model=List[CaseRead])
def list_cases(
    status: Optional[str] = None,
    q: Optional[str] = None,
    client_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        db.query(Case)
        .options(selectinload(Case.client), selectinload(Case.attachments))
        .filter(Case.lawyer_id == current_user.id)
    )
    if status:
        query = query.filter(Case.status == status)
    if q:
        query = query.filter(Case.title.ilike(f"%{q}%"))
    if client_id:
        query = query.filter(Case.client_id == client_id)
    return query.order_by(Case.updated_at.desc()).offset(skip).limit(limit).all()


@router.post("", response_model=CaseRead, status_code=201)
def create_case(
    data: CaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    case = Case(**data.model_dump(), lawyer_id=current_user.id)
    db.add(case)
    db.flush()
    audit_log(db, current_user.id, "CREATE", "case", case.id, new_value={"title": case.title})
    db.commit()
    return _load_case(db, case.id, current_user.id)


@router.get("/conflict-check")
def conflict_check(
    client_id: Optional[int] = None,
    defendant_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Проверяет пересечения: один из участников уже является стороной в другом активном деле."""
    if not client_id and not defendant_id:
        return {"conflicts": []}
    ids = [i for i in [client_id, defendant_id] if i]
    conflicts = (
        db.query(Case)
        .filter(
            Case.status == "active",
            Case.lawyer_id == current_user.id,
            (Case.client_id.in_(ids) | Case.defendant_id.in_(ids)),
        )
        .all()
    )
    return {"conflicts": [{"id": c.id, "title": c.title, "case_number": c.case_number} for c in conflicts]}


@router.get("/{case_id}", response_model=CaseRead)
def get_case(case_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return _load_case(db, case_id, current_user.id)


@router.patch("/{case_id}", response_model=CaseRead)
def update_case(
    case_id: int,
    data: CaseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    case = _load_case(db, case_id, current_user.id)
    updates = data.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(case, field, value)

    # Авторасчёт сроков при сохранении full_decision_date
    if "full_decision_date" in updates and updates["full_decision_date"]:
        fdd = updates["full_decision_date"]
        deadlines = calculate_deadlines(fdd, case.court_type)
        for k, v in deadlines.items():
            if getattr(case, k) is None:  # не перезаписываем уже введённое вручную
                setattr(case, k, v)

    audit_log(db, current_user.id, "UPDATE", "case", case_id, new_value=updates)
    db.commit()
    return _load_case(db, case_id, current_user.id)


@router.patch("/{case_id}/status", response_model=CaseRead)
def update_status(
    case_id: int,
    data: CaseStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Valid: {VALID_STATUSES}")

    case = _load_case(db, case_id, current_user.id)
    old_status = case.status
    case.status = data.status

    db.add(CaseEvent(
        case_id=case.id,
        event_type="status_change",
        description=f"Статус изменён с «{old_status}» на «{data.status}»",
        old_value=old_status,
        new_value=data.status,
    ))
    audit_log(db, current_user.id, "UPDATE", "case", case_id,
              old_value={"status": old_status}, new_value={"status": data.status})
    db.commit()
    return _load_case(db, case_id, current_user.id)


@router.delete("/{case_id}", status_code=204)
def delete_case(case_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Удаление дел доступно только администратору")
    case = _load_case(db, case_id, current_user.id)
    audit_log(db, current_user.id, "DELETE", "case", case.id, old_value={"title": case.title})
    db.delete(case)
    db.commit()
