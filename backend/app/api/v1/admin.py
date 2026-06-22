from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.database import get_db
from app.models.audit_log import AuditLog
from app.models.company_lawyer import CompanyLawyer
from app.models.user import User
from app.schemas.user import UserRead, UserUpdate
from app.core.security import hash_password

router = APIRouter(prefix="/admin", tags=["admin"])


def _require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Только для администраторов")
    return current_user


# ── Logs ──

class LogRead(BaseModel):
    id: int
    user_id: Optional[int]
    action: str
    entity_type: str
    entity_id: Optional[int]
    old_value: Optional[str]
    new_value: Optional[str]
    created_at: str
    user_email: Optional[str] = None

    model_config = {"from_attributes": True}


@router.get("/logs")
def list_logs(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    admin: User = Depends(_require_admin),
):
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()
    result = []
    for log in logs:
        user = db.get(User, log.user_id) if log.user_id else None
        result.append({
            "id": log.id,
            "user_id": log.user_id,
            "user_email": user.email if user else None,
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "old_value": log.old_value,
            "new_value": log.new_value,
            "created_at": log.created_at.isoformat(),
        })
    return result


# ── Users ──

class UserAdminCreate(BaseModel):
    email: str
    full_name: str
    password: str
    role: str = "lawyer"


class UserAdminUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None


class LawyerAccountCreate(BaseModel):
    email: str
    password: str


@router.get("/users", response_model=List[UserRead])
def list_users(db: Session = Depends(get_db), admin: User = Depends(_require_admin)):
    return db.query(User).order_by(User.created_at).all()


@router.post("/users", response_model=UserRead, status_code=201)
def create_user(data: UserAdminCreate, db: Session = Depends(get_db), admin: User = Depends(_require_admin)):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email уже зарегистрирован")
    user = User(
        email=data.email,
        full_name=data.full_name,
        hashed_password=hash_password(data.password),
        role=data.role,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/lawyers/{lawyer_id}/create-account", response_model=UserRead, status_code=201)
def create_lawyer_account(
    lawyer_id: int,
    data: LawyerAccountCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(_require_admin),
):
    lawyer = db.get(CompanyLawyer, lawyer_id)
    if not lawyer:
        raise HTTPException(status_code=404, detail="Юрист не найден")
    if lawyer.user_id:
        raise HTTPException(status_code=400, detail="У этого юриста уже есть аккаунт")
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email уже зарегистрирован")
    user = User(
        email=data.email,
        full_name=lawyer.full_name,
        hashed_password=hash_password(data.password),
        role="lawyer",
        is_active=True,
    )
    db.add(user)
    db.flush()
    lawyer.user_id = user.id
    db.commit()
    db.refresh(user)
    return user


@router.patch("/users/{user_id}", response_model=UserRead)
def update_user(user_id: int, data: UserAdminUpdate, db: Session = Depends(get_db), admin: User = Depends(_require_admin)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    if data.full_name is not None: user.full_name = data.full_name
    if data.role is not None: user.role = data.role
    if data.is_active is not None: user.is_active = data.is_active
    if data.password: user.hashed_password = hash_password(data.password)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=204)
def delete_user(user_id: int, db: Session = Depends(get_db), admin: User = Depends(_require_admin)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Нельзя удалить самого себя")
    db.delete(user)
    db.commit()
