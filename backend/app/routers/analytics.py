from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.building import Building
from ..models.team import Team
from ..models.work_order import WorkOrder
from ..schemas.analytics import (
    AnalyticsOverview,
    AnalyticsSummary,
    BuildingCount,
    CategoryCount,
    SlaPerformanceItem,
    TeamWorkloadItem,
)
from ..services.sla_service import SLA_HOURS, is_overdue

router = APIRouter()

_OPEN_STATUSES = ("open", "in_progress", "escalated", "pending_approval")
_ACTIVE_STATUSES = ("open", "in_progress", "escalated", "pending_approval")


def _build_summary(db: Session) -> AnalyticsSummary:
    total = db.query(WorkOrder).count()
    open_count = db.query(WorkOrder).filter(WorkOrder.status == "open").count()
    in_progress = db.query(WorkOrder).filter(WorkOrder.status == "in_progress").count()
    critical = db.query(WorkOrder).filter(
        WorkOrder.priority == "critical",
        WorkOrder.status.notin_(["resolved", "closed"]),
    ).count()
    pending_approval = db.query(WorkOrder).filter(WorkOrder.status == "pending_approval").count()

    active_orders = db.query(WorkOrder).filter(
        WorkOrder.status.notin_(["resolved", "closed"])
    ).all()
    overdue = sum(1 for wo in active_orders if is_overdue(wo.sla_deadline, wo.status))

    return AnalyticsSummary(
        total_work_orders=total,
        open_work_orders=open_count,
        in_progress_work_orders=in_progress,
        critical_work_orders=critical,
        overdue_work_orders=overdue,
        pending_approval_work_orders=pending_approval,
    )


def _build_by_category(db: Session) -> List[CategoryCount]:
    rows = (
        db.query(WorkOrder.category, func.count(WorkOrder.id))
        .group_by(WorkOrder.category)
        .all()
    )
    return [CategoryCount(category=r[0], count=r[1]) for r in rows]


def _build_by_building(db: Session) -> List[BuildingCount]:
    rows = (
        db.query(Building.name, func.count(WorkOrder.id))
        .outerjoin(WorkOrder, WorkOrder.building_id == Building.id)
        .group_by(Building.name)
        .all()
    )
    return [BuildingCount(building_name=r[0], count=r[1] or 0) for r in rows]


def _build_by_team(db: Session) -> List[TeamWorkloadItem]:
    teams = db.query(Team).filter(Team.is_active == True).all()  # noqa: E712
    result = []
    for team in teams:
        open_count = db.query(WorkOrder).filter(
            WorkOrder.assigned_team_id == team.id,
            WorkOrder.status == "open",
        ).count()
        in_progress_count = db.query(WorkOrder).filter(
            WorkOrder.assigned_team_id == team.id,
            WorkOrder.status == "in_progress",
        ).count()
        critical_count = db.query(WorkOrder).filter(
            WorkOrder.assigned_team_id == team.id,
            WorkOrder.priority == "critical",
            WorkOrder.status.notin_(["resolved", "closed"]),
        ).count()
        result.append(TeamWorkloadItem(
            team_name=team.name,
            open_count=open_count,
            in_progress_count=in_progress_count,
            critical_count=critical_count,
        ))
    return result


def _build_sla_performance(db: Session) -> List[SlaPerformanceItem]:
    result = []
    for priority, target_hours in SLA_HOURS.items():
        count = db.query(WorkOrder).filter(WorkOrder.priority == priority).count()
        resolved = db.query(WorkOrder).filter(
            WorkOrder.priority == priority,
            WorkOrder.status == "resolved",
            WorkOrder.resolved_at.isnot(None),
        ).all()
        avg_hours = None
        if resolved:
            durations = [
                (wo.resolved_at - wo.created_at).total_seconds() / 3600
                for wo in resolved
                if wo.created_at and wo.resolved_at
            ]
            avg_hours = sum(durations) / len(durations) if durations else None
        result.append(SlaPerformanceItem(
            priority=priority,
            target_hours=target_hours,
            average_actual_hours=avg_hours,
            count=count,
        ))
    return result


@router.get("", response_model=AnalyticsOverview)
def get_analytics_overview(db: Session = Depends(get_db)):
    """Full analytics overview: summary + all breakdowns in one response."""
    return AnalyticsOverview(
        summary=_build_summary(db),
        by_category=_build_by_category(db),
        by_building=_build_by_building(db),
        by_team=_build_by_team(db),
        sla_performance=_build_sla_performance(db),
    )


@router.get("/summary", response_model=AnalyticsSummary)
def get_analytics_summary(db: Session = Depends(get_db)):
    """Quick summary counts: total, open, critical, overdue, pending approval."""
    return _build_summary(db)
