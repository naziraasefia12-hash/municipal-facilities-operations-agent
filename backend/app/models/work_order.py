from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String
from ..database import Base


class WorkOrder(Base):
    __tablename__ = "work_orders"

    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String, unique=True, nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    building_id = Column(Integer, ForeignKey("buildings.id"))
    location_details = Column(String)
    category = Column(String, nullable=False)
    # open | in_progress | pending_approval | resolved | closed | escalated
    status = Column(String, nullable=False, default="open")
    # critical | high | medium | low
    priority = Column(String, nullable=False, default="medium")
    assigned_team_id = Column(Integer, ForeignKey("teams.id"))
    submitted_by = Column(String, nullable=False)
    estimated_cost = Column(Float)
    actual_cost = Column(Float)
    sla_deadline = Column(DateTime)
    sla_hours = Column(Integer)
    requires_approval = Column(Boolean, default=False)
    approval_level = Column(String)  # manager | director | None
    approved_by = Column(String)
    approved_at = Column(DateTime)
    resolved_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
