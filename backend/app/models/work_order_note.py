from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from ..database import Base


class WorkOrderNote(Base):
    __tablename__ = "work_order_notes"

    id = Column(Integer, primary_key=True, index=True)
    work_order_id = Column(Integer, ForeignKey("work_orders.id"), nullable=False)
    author = Column(String, nullable=False)
    content = Column(String, nullable=False)
    # internal | status_change | escalation | approval
    note_type = Column(String, default="internal")
    created_at = Column(DateTime, default=datetime.utcnow)
