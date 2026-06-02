from __future__ import annotations
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.database import get_db
from app.models.client import Client
from app.models.user import User
from app.schemas.client import ClientCreate, ClientRead, ClientUpdate
from app.services.audit import log as audit_log

router = APIRouter(prefix="/clients", tags=["clients"])


@router.get("", response_model=List[ClientRead])
def list_clients(
    q: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = db.query(Client)
    if q:
        query = query.filter(Client.full_name.ilike(f"%{q}%"))
    return query.offset(skip).limit(limit).all()


@router.post("", response_model=ClientRead, status_code=201)
def create_client(
    data: ClientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    client = Client(**data.model_dump())
    db.add(client)
    db.flush()
    audit_log(db, current_user.id, "CREATE", "client", client.id, new_value={"full_name": client.full_name})
    db.commit()
    db.refresh(client)
    return client


@router.get("/{client_id}", response_model=ClientRead)
def get_client(client_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    client = db.get(Client, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client


@router.patch("/{client_id}", response_model=ClientRead)
def update_client(
    client_id: int,
    data: ClientUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    client = db.get(Client, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    updates = data.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(client, field, value)
    audit_log(db, current_user.id, "UPDATE", "client", client_id, new_value=updates)
    db.commit()
    db.refresh(client)
    return client


@router.delete("/{client_id}", status_code=204)
def delete_client(client_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Удаление клиентов доступно только администратору")
    client = db.get(Client, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    audit_log(db, current_user.id, "DELETE", "client", client_id, old_value={"full_name": client.full_name})
    db.delete(client)
    db.commit()
