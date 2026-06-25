from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.audit_log import AuditLog
from ..schemas.audit_log import AuditLogOut

router = APIRouter()


@router.get("", response_model=List[AuditLogOut])
def list_audit_logs(
    event_type: Optional[str] = Query(None),
    work_order_id: Optional[int] = Query(None),
    actor: Optional[str] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(AuditLog)
    if event_type:
        q = q.filter(AuditLog.event_type == event_type)
    if work_order_id:
        q = q.filter(AuditLog.work_order_id == work_order_id)
    if actor:
        q = q.filter(AuditLog.actor.ilike(f"%{actor}%"))
    if start_date:
        q = q.filter(AuditLog.created_at >= start_date)
    if end_date:
        q = q.filter(AuditLog.created_at <= end_date)
    return q.order_by(AuditLog.created_at.desc()).limit(500).all()
