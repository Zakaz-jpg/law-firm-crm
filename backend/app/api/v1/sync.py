from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, selectinload

from app.core.deps import get_current_user
from app.database import get_db
from app.models.case import Case
from app.models.client import Client
from app.models.user import User
from app.schemas.sync import SyncResponse

router = APIRouter(prefix="/sync", tags=["sync"])


@router.get("", response_model=SyncResponse)
def sync_all(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cases = (
        db.query(Case)
        .options(selectinload(Case.client), selectinload(Case.attachments))
        .filter(Case.lawyer_id == current_user.id)
        .all()
    )
    clients = db.query(Client).all()

    return SyncResponse(
        synced_at=datetime.utcnow(),
        cases=cases,
        clients=clients,
    )
