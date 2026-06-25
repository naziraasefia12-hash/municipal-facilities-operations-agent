from datetime import datetime, timedelta
from typing import Optional

SLA_HOURS: dict[str, int] = {
    "critical": 2,
    "high": 24,
    "medium": 72,
    "low": 168,
}

_CLOSED_STATUSES = {"resolved", "closed"}


def calculate_sla_deadline(priority: str, created_at: datetime) -> datetime:
    """Return the deadline by which this work order must be resolved."""
    hours = SLA_HOURS.get(priority, 72)
    return created_at + timedelta(hours=hours)


def is_overdue(sla_deadline: Optional[datetime], status: str) -> bool:
    """True when a non-closed work order has passed its SLA deadline."""
    if status in _CLOSED_STATUSES:
        return False
    if sla_deadline is None:
        return False
    return datetime.utcnow() > sla_deadline
