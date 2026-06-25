from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class AuditLogOut(BaseModel):
    id: int
    event_type: str
    work_order_id: Optional[int] = None
    work_order_number: Optional[str] = None
    actor: str
    details: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}
