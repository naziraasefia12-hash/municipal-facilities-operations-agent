from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
from .triage import TriageResultOut


class WorkOrderCreate(BaseModel):
    title: str
    description: str
    building_id: int
    location_details: Optional[str] = None
    submitted_by: str
    estimated_cost: Optional[float] = None


class WorkOrderStatusUpdate(BaseModel):
    status: str
    actor: str = "system"


class WorkOrderAssignUpdate(BaseModel):
    assigned_team_id: int
    actor: str = "system"


class WorkOrderApprove(BaseModel):
    approved_by: str
    notes: Optional[str] = None


class NoteCreate(BaseModel):
    author: str
    content: str
    note_type: str = "internal"


class NoteOut(BaseModel):
    id: int
    work_order_id: int
    author: str
    content: str
    note_type: str
    created_at: datetime

    model_config = {"from_attributes": True}


class WorkOrderListItem(BaseModel):
    id: int
    order_number: str
    title: str
    building_name: Optional[str] = None
    category: str
    status: str
    priority: str
    assigned_team_name: Optional[str] = None
    submitted_by: str
    sla_deadline: Optional[datetime] = None
    requires_approval: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class WorkOrderOut(BaseModel):
    id: int
    order_number: str
    title: str
    description: str
    building_id: Optional[int] = None
    building_name: Optional[str] = None
    location_details: Optional[str] = None
    category: str
    status: str
    priority: str
    assigned_team_id: Optional[int] = None
    assigned_team_name: Optional[str] = None
    submitted_by: str
    estimated_cost: Optional[float] = None
    actual_cost: Optional[float] = None
    sla_deadline: Optional[datetime] = None
    sla_hours: Optional[int] = None
    requires_approval: bool
    approval_level: Optional[str] = None
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    triage_result: Optional[TriageResultOut] = None
    notes: List[NoteOut] = []

    model_config = {"from_attributes": True}
