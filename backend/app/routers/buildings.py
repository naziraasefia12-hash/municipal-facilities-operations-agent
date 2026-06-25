from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.building import Building
from ..schemas.building import BuildingCreate, BuildingOut, BuildingUpdate

router = APIRouter()


@router.get("", response_model=List[BuildingOut])
def list_buildings(db: Session = Depends(get_db)):
    return db.query(Building).filter(Building.is_active == True).all()  # noqa: E712


@router.get("/{building_id}", response_model=BuildingOut)
def get_building(building_id: int, db: Session = Depends(get_db)):
    building = db.query(Building).filter(Building.id == building_id).first()
    if not building:
        raise HTTPException(status_code=404, detail="Building not found")
    return building


@router.post("", response_model=BuildingOut)
def create_building(payload: BuildingCreate, db: Session = Depends(get_db)):
    building = Building(**payload.model_dump())
    db.add(building)
    db.commit()
    db.refresh(building)
    return building


@router.patch("/{building_id}", response_model=BuildingOut)
def update_building(building_id: int, payload: BuildingUpdate, db: Session = Depends(get_db)):
    building = db.query(Building).filter(Building.id == building_id).first()
    if not building:
        raise HTTPException(status_code=404, detail="Building not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(building, field, value)
    db.commit()
    db.refresh(building)
    return building
