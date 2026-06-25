from datetime import datetime, timedelta
from app.services.sla_service import SLA_HOURS, calculate_sla_deadline, is_overdue


def test_sla_hours_values():
    assert SLA_HOURS["critical"] == 2
    assert SLA_HOURS["high"] == 24
    assert SLA_HOURS["medium"] == 72
    assert SLA_HOURS["low"] == 168


def test_calculate_sla_deadline_critical():
    base = datetime(2026, 1, 1, 12, 0, 0)
    deadline = calculate_sla_deadline("critical", base)
    assert deadline == datetime(2026, 1, 1, 14, 0, 0)


def test_calculate_sla_deadline_low():
    base = datetime(2026, 1, 1, 0, 0, 0)
    deadline = calculate_sla_deadline("low", base)
    assert deadline == base + timedelta(hours=168)


def test_calculate_sla_deadline_unknown_priority_defaults_medium():
    base = datetime(2026, 1, 1, 0, 0, 0)
    deadline = calculate_sla_deadline("unknown", base)
    assert deadline == base + timedelta(hours=72)


def test_is_overdue_past_deadline():
    past = datetime(2020, 1, 1)
    assert is_overdue(past, "open") is True


def test_is_overdue_future_deadline():
    future = datetime.utcnow() + timedelta(hours=10)
    assert is_overdue(future, "open") is False


def test_is_overdue_none_deadline():
    assert is_overdue(None, "open") is False


def test_is_overdue_resolved_never_counts():
    past = datetime(2020, 1, 1)
    assert is_overdue(past, "resolved") is False


def test_is_overdue_closed_never_counts():
    past = datetime(2020, 1, 1)
    assert is_overdue(past, "closed") is False
