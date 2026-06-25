from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class TeamCreate(BaseModel):
    name: str
    team_code: Optional[str] = None
    specialty: Optional[str] = None
    contact_email: Optional[str] = None


class TeamUpdate(BaseModel):
    name: Optional[str] = None
    team_code: Optional[str] = None
    specialty: Optional[str] = None
    contact_email: Optional[str] = None
    is_active: Optional[bool] = None


class TeamOut(BaseModel):
    id: int
    name: str
    team_code: Optional[str] = None
    specialty: Optional[str] = None
    contact_email: Optional[str] = None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class TeamWorkload(BaseModel):
    team_id: int
    team_name: str
    open_count: int
    critical_count: int
