from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.building import Building
from ..models.team import Team
from ..models.triage_result import TriageResult
from ..models.work_order import WorkOrder
from ..models.work_order_note import WorkOrderNote
from ..schemas.triage import TriageInput, TriageResultOut
from ..schemas.work_order import (
    NoteCreate,
    NoteOut,
    WorkOrderApprove,
    WorkOrderAssignUpdate,
    WorkOrderCreate,
    WorkOrderListItem,
    WorkOrderOut,
    WorkOrderStatusUpdate,
)
from ..services.audit_service import log_event
from ..services.sla_service import calculate_sla_deadline
from ..services.triage_agent import run_triage

router = APIRouter()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _generate_order_number(db: Session) -> str:
    year = datetime.utcnow().year
    count = db.query(WorkOrder).count() + 1
    return f"WO-{year}-{count:05d}"


def _build_work_order_out(wo: WorkOrder, db: Session) -> WorkOrderOut:
    building = db.query(Building).filter(Building.id == wo.building_id).first() if wo.building_id else None
    team = db.query(Team).filter(Team.id == wo.assigned_team_id).first() if wo.assigned_team_id else None
    triage = db.query(TriageResult).filter(TriageResult.work_order_id == wo.id).first()
    notes = (
        db.query(WorkOrderNote)
        .filter(WorkOrderNote.work_order_id == wo.id)
        .order_by(WorkOrderNote.created_at)
        .all()
    )
    return WorkOrderOut(
        id=wo.id,
        order_number=wo.order_number,
        title=wo.title,
        description=wo.description,
        building_id=wo.building_id,
        building_name=building.name if building else None,
        location_details=wo.location_details,
        category=wo.category,
        status=wo.status,
        priority=wo.priority,
        assigned_team_id=wo.assigned_team_id,
        assigned_team_name=team.name if team else None,
        submitted_by=wo.submitted_by,
        estimated_cost=wo.estimated_cost,
        actual_cost=wo.actual_cost,
        sla_deadline=wo.sla_deadline,
        sla_hours=wo.sla_hours,
        requires_approval=wo.requires_approval,
        approval_level=wo.approval_level,
        approved_by=wo.approved_by,
        approved_at=wo.approved_at,
        resolved_at=wo.resolved_at,
        created_at=wo.created_at,
        updated_at=wo.updated_at,
        triage_result=TriageResultOut.model_validate(triage) if triage else None,
        notes=[NoteOut.model_validate(n) for n in notes],
    )


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("", response_model=List[WorkOrderListItem])
def list_work_orders(
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    building_id: Optional[int] = Query(None),
    team_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(WorkOrder)
    if status:
        q = q.filter(WorkOrder.status == status)
    if priority:
        q = q.filter(WorkOrder.priority == priority)
    if category:
        q = q.filter(WorkOrder.category == category)
    if building_id:
        q = q.filter(WorkOrder.building_id == building_id)
    if team_id:
        q = q.filter(WorkOrder.assigned_team_id == team_id)
    if search:
        term = f"%{search}%"
        q = q.filter(
            WorkOrder.title.ilike(term) | WorkOrder.description.ilike(term)
        )
    work_orders = q.order_by(WorkOrder.created_at.desc()).all()

    result = []
    for wo in work_orders:
        building = db.query(Building).filter(Building.id == wo.building_id).first() if wo.building_id else None
        team = db.query(Team).filter(Team.id == wo.assigned_team_id).first() if wo.assigned_team_id else None
        result.append(WorkOrderListItem(
            id=wo.id,
            order_number=wo.order_number,
            title=wo.title,
            building_name=building.name if building else None,
            category=wo.category,
            status=wo.status,
            priority=wo.priority,
            assigned_team_name=team.name if team else None,
            submitted_by=wo.submitted_by,
            sla_deadline=wo.sla_deadline,
            requires_approval=wo.requires_approval,
            created_at=wo.created_at,
        ))
    return result


@router.post("", response_model=WorkOrderOut)
def create_work_order(payload: WorkOrderCreate, db: Session = Depends(get_db)):
    building = db.query(Building).filter(Building.id == payload.building_id).first()
    if not building:
        raise HTTPException(status_code=404, detail="Building not found")

    triage_input = TriageInput(
        title=payload.title,
        description=payload.description,
        building=building.name,
        location_details=payload.location_details or "",
        estimated_cost=payload.estimated_cost,
    )
    triage_out = run_triage(triage_input)

    team = db.query(Team).filter(Team.name == triage_out.assigned_team).first()
    now = datetime.utcnow()
    sla_deadline = calculate_sla_deadline(triage_out.priority, now)

    initial_status = "escalated" if triage_out.escalation_reason else "open"

    wo = WorkOrder(
        order_number=_generate_order_number(db),
        title=payload.title,
        description=payload.description,
        building_id=payload.building_id,
        location_details=payload.location_details,
        category=triage_out.category,
        status=initial_status,
        priority=triage_out.priority,
        assigned_team_id=team.id if team else None,
        submitted_by=payload.submitted_by,
        estimated_cost=payload.estimated_cost,
        sla_deadline=sla_deadline,
        sla_hours=triage_out.estimated_sla_hours,
        requires_approval=triage_out.requires_approval,
        approval_level=None,
        created_at=now,
        updated_at=now,
    )
    db.add(wo)
    db.flush()

    triage_record = TriageResult(
        work_order_id=wo.id,
        category=triage_out.category,
        priority=triage_out.priority,
        assigned_team=triage_out.assigned_team,
        estimated_sla_hours=triage_out.estimated_sla_hours,
        duplicate_risk=triage_out.duplicate_risk,
        short_summary=triage_out.short_summary,
        recommended_next_action=triage_out.recommended_next_action,
        risk_reasoning=triage_out.risk_reasoning,
        requires_approval=triage_out.requires_approval,
        escalation_reason=triage_out.escalation_reason,
        agent_mode=triage_out.agent_mode,
    )
    db.add(triage_record)
    db.commit()
    db.refresh(wo)

    log_event(
        db, "work_order_created", payload.submitted_by,
        {"order_number": wo.order_number, "title": wo.title, "building": building.name},
        work_order_id=wo.id, work_order_number=wo.order_number,
    )
    log_event(
        db, "triage_completed", "agent",
        {
            "agent_mode": triage_out.agent_mode,
            "category": triage_out.category,
            "priority": triage_out.priority,
            "assigned_team": triage_out.assigned_team,
        },
        work_order_id=wo.id, work_order_number=wo.order_number,
    )
    if triage_out.escalation_reason:
        log_event(
            db, "escalated", "agent",
            {"reason": triage_out.escalation_reason},
            work_order_id=wo.id, work_order_number=wo.order_number,
        )
    if triage_out.requires_approval:
        log_event(
            db, "approval_requested", "agent",
            {"estimated_cost": payload.estimated_cost, "approval_level": triage_out.requires_approval},
            work_order_id=wo.id, work_order_number=wo.order_number,
        )

    return _build_work_order_out(wo, db)


@router.get("/{work_order_id}", response_model=WorkOrderOut)
def get_work_order(work_order_id: int, db: Session = Depends(get_db)):
    wo = db.query(WorkOrder).filter(WorkOrder.id == work_order_id).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")
    return _build_work_order_out(wo, db)


@router.patch("/{work_order_id}/status", response_model=WorkOrderOut)
def update_status(work_order_id: int, payload: WorkOrderStatusUpdate, db: Session = Depends(get_db)):
    wo = db.query(WorkOrder).filter(WorkOrder.id == work_order_id).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")
    old_status = wo.status
    wo.status = payload.status
    wo.updated_at = datetime.utcnow()
    if payload.status == "resolved":
        wo.resolved_at = datetime.utcnow()
    db.commit()
    db.refresh(wo)
    log_event(
        db, "status_changed", payload.actor,
        {"order_number": wo.order_number},
        work_order_id=wo.id, work_order_number=wo.order_number,
        old_value=old_status, new_value=payload.status,
    )
    return _build_work_order_out(wo, db)


@router.patch("/{work_order_id}/assign", response_model=WorkOrderOut)
def assign_team(work_order_id: int, payload: WorkOrderAssignUpdate, db: Session = Depends(get_db)):
    wo = db.query(WorkOrder).filter(WorkOrder.id == work_order_id).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")
    team = db.query(Team).filter(Team.id == payload.assigned_team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    old_team_id = wo.assigned_team_id
    wo.assigned_team_id = payload.assigned_team_id
    wo.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(wo)
    log_event(
        db, "team_assigned", payload.actor,
        {"order_number": wo.order_number, "new_team": team.name},
        work_order_id=wo.id, work_order_number=wo.order_number,
        old_value=str(old_team_id), new_value=str(payload.assigned_team_id),
    )
    return _build_work_order_out(wo, db)


@router.post("/{work_order_id}/notes", response_model=NoteOut)
def add_note(work_order_id: int, payload: NoteCreate, db: Session = Depends(get_db)):
    wo = db.query(WorkOrder).filter(WorkOrder.id == work_order_id).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")
    note = WorkOrderNote(work_order_id=work_order_id, **payload.model_dump())
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


@router.get("/{work_order_id}/notes", response_model=List[NoteOut])
def list_notes(work_order_id: int, db: Session = Depends(get_db)):
    wo = db.query(WorkOrder).filter(WorkOrder.id == work_order_id).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")
    return (
        db.query(WorkOrderNote)
        .filter(WorkOrderNote.work_order_id == work_order_id)
        .order_by(WorkOrderNote.created_at)
        .all()
    )


@router.post("/{work_order_id}/approve", response_model=WorkOrderOut)
def approve_work_order(work_order_id: int, payload: WorkOrderApprove, db: Session = Depends(get_db)):
    wo = db.query(WorkOrder).filter(WorkOrder.id == work_order_id).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")
    wo.approved_by = payload.approved_by
    wo.approved_at = datetime.utcnow()
    wo.status = "in_progress"
    wo.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(wo)
    log_event(
        db, "approved", payload.approved_by,
        {"order_number": wo.order_number, "notes": payload.notes or ""},
        work_order_id=wo.id, work_order_number=wo.order_number,
    )
    return _build_work_order_out(wo, db)
