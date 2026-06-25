from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class BuildingCreate(BaseModel):
    name: str
    address: Optional[str] = None
    building_code: Optional[str] = None
    floors: Optional[int] = None


class BuildingUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    building_code: Optional[str] = None
    floors: Optional[int] = None
    is_active: Optional[bool] = None


class BuildingOut(BaseModel):
    id: int
    name: str
    address: Optional[str] = None
    building_code: Optional[str] = None
    floors: Optional[int] = None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
