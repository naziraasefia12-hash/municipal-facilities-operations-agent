from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel


class TriageInput(BaseModel):
    title: str
    description: str
    building: str
    location_details: str = ""
    estimated_cost: Optional[float] = None


class TriageOutput(BaseModel):
    category: Literal["HVAC", "Plumbing", "Electrical", "Elevator", "Janitorial", "Access Control", "Fleet", "General"]
    priority: Literal["critical", "high", "medium", "low"]
    assigned_team: str
    estimated_sla_hours: int
    duplicate_risk: Literal["low", "medium", "high"]
    short_summary: str
    recommended_next_action: str
    risk_reasoning: str
    requires_approval: bool
    escalation_reason: Optional[str] = None
    agent_mode: Literal["gemini", "rule_based"] = "rule_based"


class TriageResultOut(BaseModel):
    id: int
    work_order_id: int
    category: str
    priority: str
    assigned_team: str
    estimated_sla_hours: int
    duplicate_risk: str
    short_summary: str
    recommended_next_action: str
    risk_reasoning: str
    requires_approval: bool
    escalation_reason: Optional[str] = None
    agent_mode: str
    created_at: datetime

    model_config = {"from_attributes": True}
