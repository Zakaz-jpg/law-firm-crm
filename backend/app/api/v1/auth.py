import random
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.security import (
    create_access_token, create_refresh_token,
    decode_token, hash_password, verify_password,
)
from app.database import get_db
from app.models.email_code import EmailCode
from app.models.user import User, DeviceToken
from app.schemas.user import Token, TokenRefresh, UserCreate, UserRead, UserUpdate, PasswordChange, DeviceTokenRegister
from app.services.audit import log as audit_log
from app.services.email_sender import send_code


class EmailCodeRequest(BaseModel):
    email: EmailStr


class EmailCodeVerify(BaseModel):
    email: EmailStr
    code: str

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserRead, status_code=201)
def register(data: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=data.email,
        full_name=data.full_name,
        hashed_password=hash_password(data.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=Token)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form.username).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")
    tokens = Token(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )
    audit_log(db, user.id, "LOGIN", "user", user.id)
    db.commit()
    return tokens


@router.post("/refresh", response_model=Token)
def refresh(body: TokenRefresh, db: Session = Depends(get_db)):
    payload = decode_token(body.refresh_token)
    user_id = payload.get("sub")
    if not user_id or payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    user = db.get(User, int(user_id))
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return Token(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )


@router.get("/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserRead)
def update_me(
    data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if data.full_name is not None:
        current_user.full_name = data.full_name
    if data.role is not None:
        current_user.role = data.role
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/change-password", status_code=204)
def change_password(
    data: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Неверный текущий пароль")
    current_user.hashed_password = hash_password(data.new_password)
    db.commit()


@router.post("/request-code", status_code=204)
def request_code(body: EmailCodeRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email, User.is_active == True).first()
    if not user:
        return  # не раскрываем, есть ли email в системе
    code = str(random.randint(100000, 999999))
    expires = datetime.utcnow() + timedelta(minutes=10)
    db.add(EmailCode(email=body.email, code=code, expires_at=expires))
    db.commit()
    send_code(body.email, code)


@router.post("/verify-code", response_model=Token)
def verify_code(body: EmailCodeVerify, db: Session = Depends(get_db)):
    code_obj = (
        db.query(EmailCode)
        .filter(
            EmailCode.email == body.email,
            EmailCode.code == body.code,
            EmailCode.used == False,
            EmailCode.expires_at > datetime.utcnow(),
        )
        .order_by(EmailCode.created_at.desc())
        .first()
    )
    if not code_obj:
        raise HTTPException(status_code=401, detail="Неверный или истёкший код")
    code_obj.used = True
    user = db.query(User).filter(User.email == body.email).first()
    db.commit()
    audit_log(db, user.id, "LOGIN_CODE", "user", user.id)
    db.commit()
    return Token(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )


@router.post("/device-token", status_code=204)
def register_device_token(
    data: DeviceTokenRegister,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing = db.query(DeviceToken).filter(DeviceToken.token == data.token).first()
    if not existing:
        db.add(DeviceToken(user_id=current_user.id, token=data.token, platform=data.platform))
        db.commit()
