from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from ..database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    # work_order_created | triage_completed | status_changed | team_assigned
    # escalated | approval_requested | approved
    event_type = Column(String, nullable=False, index=True)
    work_order_id = Column(Integer, ForeignKey("work_orders.id"))
    work_order_number = Column(String)
    actor = Column(String, nullable=False)
    details = Column(String, nullable=False)  # JSON-serialised dict
    old_value = Column(String)
    new_value = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
