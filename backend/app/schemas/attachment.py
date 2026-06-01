from datetime import datetime
from pydantic import BaseModel


class AttachmentRead(BaseModel):
    id: int
    case_id: int
    uploaded_by: int
    filename: str
    original_filename: str
    content_type: str
    file_size: int
    created_at: datetime

    model_config = {"from_attributes": True}
