from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from ..database import Base


class TriageResult(Base):
    __tablename__ = "triage_results"

    id = Column(Integer, primary_key=True, index=True)
    work_order_id = Column(Integer, ForeignKey("work_orders.id"), nullable=False)
    category = Column(String, nullable=False)
    priority = Column(String, nullable=False)
    assigned_team = Column(String, nullable=False)
    estimated_sla_hours = Column(Integer, nullable=False)
    # low | medium | high
    duplicate_risk = Column(String, nullable=False)
    short_summary = Column(String, nullable=False)
    recommended_next_action = Column(String, nullable=False)
    risk_reasoning = Column(String, nullable=False)
    requires_approval = Column(Boolean, nullable=False)
    escalation_reason = Column(String)
    # gemini | rule_based
    agent_mode = Column(String, nullable=False)
    raw_response = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
