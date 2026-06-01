from __future__ import annotations
from datetime import datetime
from typing import List
from pydantic import BaseModel
from app.schemas.case import CaseRead
from app.schemas.client import ClientRead


class SyncResponse(BaseModel):
    synced_at: datetime
    cases: List[CaseRead]
    clients: List[ClientRead]
