from typing import List, Optional
from pydantic import BaseModel


class AnalyticsSummary(BaseModel):
    total_work_orders: int
    open_work_orders: int
    in_progress_work_orders: int
    critical_work_orders: int
    overdue_work_orders: int
    pending_approval_work_orders: int


class CategoryCount(BaseModel):
    category: str
    count: int


class BuildingCount(BaseModel):
    building_name: str
    count: int


class TeamWorkloadItem(BaseModel):
    team_name: str
    open_count: int
    in_progress_count: int
    critical_count: int


class SlaPerformanceItem(BaseModel):
    priority: str
    target_hours: int
    average_actual_hours: Optional[float] = None
    count: int


class AnalyticsOverview(BaseModel):
    summary: AnalyticsSummary
    by_category: List[CategoryCount]
    by_building: List[BuildingCount]
    by_team: List[TeamWorkloadItem]
    sla_performance: List[SlaPerformanceItem]
