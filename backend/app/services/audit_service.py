import json
from typing import Optional
from sqlalchemy.orm import Session
from ..models.audit_log import AuditLog


def log_event(
    db: Session,
    event_type: str,
    actor: str,
    details: dict,
    work_order_id: Optional[int] = None,
    work_order_number: Optional[str] = None,
    old_value: Optional[str] = None,
    new_value: Optional[str] = None,
) -> None:
    entry = AuditLog(
        event_type=event_type,
        work_order_id=work_order_id,
        work_order_number=work_order_number,
        actor=actor,
        details=json.dumps(details),
        old_value=old_value,
        new_value=new_value,
    )
    db.add(entry)
    db.commit()
