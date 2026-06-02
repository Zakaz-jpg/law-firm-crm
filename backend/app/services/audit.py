from __future__ import annotations
import json
from typing import Any
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog


def log(
    db: Session,
    user_id: int | None,
    action: str,
    entity_type: str,
    entity_id: int | None = None,
    old_value: Any = None,
    new_value: Any = None,
) -> None:
    try:
        db.add(AuditLog(
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            old_value=json.dumps(old_value, ensure_ascii=False, default=str) if old_value is not None else None,
            new_value=json.dumps(new_value, ensure_ascii=False, default=str) if new_value is not None else None,
        ))
        db.flush()
    except Exception:
        pass  # логи не должны ломать основной поток
