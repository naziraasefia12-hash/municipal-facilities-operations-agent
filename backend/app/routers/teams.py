from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.team import Team
from ..models.work_order import WorkOrder
from ..schemas.team import TeamCreate, TeamOut, TeamUpdate, TeamWorkload

router = APIRouter()


@router.get("", response_model=List[TeamOut])
def list_teams(db: Session = Depends(get_db)):
    return db.query(Team).filter(Team.is_active == True).all()  # noqa: E712


@router.get("/{team_id}", response_model=TeamOut)
def get_team(team_id: int, db: Session = Depends(get_db)):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team


@router.post("", response_model=TeamOut)
def create_team(payload: TeamCreate, db: Session = Depends(get_db)):
    team = Team(**payload.model_dump())
    db.add(team)
    db.commit()
    db.refresh(team)
    return team


@router.patch("/{team_id}", response_model=TeamOut)
def update_team(team_id: int, payload: TeamUpdate, db: Session = Depends(get_db)):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(team, field, value)
    db.commit()
    db.refresh(team)
    return team


@router.get("/{team_id}/workload", response_model=TeamWorkload)
def get_team_workload(team_id: int, db: Session = Depends(get_db)):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    open_count = db.query(WorkOrder).filter(
        WorkOrder.assigned_team_id == team_id,
        WorkOrder.status.in_(["open", "in_progress"]),
    ).count()
    critical_count = db.query(WorkOrder).filter(
        WorkOrder.assigned_team_id == team_id,
        WorkOrder.priority == "critical",
        WorkOrder.status.notin_(["resolved", "closed"]),
    ).count()
    return TeamWorkload(
        team_id=team_id,
        team_name=team.name,
        open_count=open_count,
        critical_count=critical_count,
    )
