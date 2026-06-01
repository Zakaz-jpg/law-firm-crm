from __future__ import annotations
import os
import uuid
from pathlib import Path

import aiofiles
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.core.deps import get_current_user
from app.database import get_db
from app.models.attachment import Attachment
from app.models.case import Case
from app.models.user import User
from app.schemas.attachment import AttachmentRead

router = APIRouter(prefix="/cases/{case_id}/attachments", tags=["attachments"])

MAX_BYTES = settings.MAX_FILE_SIZE_MB * 1024 * 1024


def _get_case(db: Session, case_id: int, user_id: int) -> Case:
    case = db.query(Case).filter(Case.id == case_id, Case.lawyer_id == user_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case


@router.get("", response_model=list[AttachmentRead])
def list_attachments(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_case(db, case_id, current_user.id)
    return db.query(Attachment).filter(Attachment.case_id == case_id).all()


@router.post("", response_model=AttachmentRead, status_code=201)
async def upload_attachment(
    case_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_case(db, case_id, current_user.id)

    content = await file.read()
    if len(content) > MAX_BYTES:
        raise HTTPException(status_code=413, detail=f"File too large (max {settings.MAX_FILE_SIZE_MB} MB)")

    ext = Path(file.filename or "file").suffix
    stored_name = f"{uuid.uuid4().hex}{ext}"
    upload_path = Path(settings.UPLOAD_DIR) / stored_name
    upload_path.parent.mkdir(parents=True, exist_ok=True)

    async with aiofiles.open(upload_path, "wb") as f:
        await f.write(content)

    attachment = Attachment(
        case_id=case_id,
        uploaded_by=current_user.id,
        filename=stored_name,
        original_filename=file.filename or stored_name,
        content_type=file.content_type or "application/octet-stream",
        file_size=len(content),
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    return attachment


@router.get("/{attachment_id}/download")
def download_attachment(
    case_id: int,
    attachment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_case(db, case_id, current_user.id)
    attachment = db.query(Attachment).filter(
        Attachment.id == attachment_id, Attachment.case_id == case_id
    ).first()
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")

    file_path = Path(settings.UPLOAD_DIR) / attachment.filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found on disk")

    return FileResponse(
        path=str(file_path),
        media_type=attachment.content_type,
        filename=attachment.original_filename,
    )


@router.delete("/{attachment_id}", status_code=204)
def delete_attachment(
    case_id: int,
    attachment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_case(db, case_id, current_user.id)
    attachment = db.query(Attachment).filter(
        Attachment.id == attachment_id, Attachment.case_id == case_id
    ).first()
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")

    file_path = Path(settings.UPLOAD_DIR) / attachment.filename
    if file_path.exists():
        os.remove(file_path)

    db.delete(attachment)
    db.commit()
