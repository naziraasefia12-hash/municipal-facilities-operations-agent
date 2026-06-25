import pytest


@pytest.fixture
def building_id(seeded_client, db):
    from app.models.building import Building
    building = db.query(Building).filter(Building.name == "City Hall").first()
    return building.id


def _create_wo(client, building_id, **overrides):
    payload = {
        "title": "AC not cooling",
        "description": "The air conditioning in room 101 stopped working completely.",
        "building_id": building_id,
        "location_details": "Room 101",
        "submitted_by": "Jane Smith",
        "estimated_cost": None,
        **overrides,
    }
    return client.post("/api/work-orders", json=payload)


def test_create_work_order(seeded_client, building_id):
    response = _create_wo(seeded_client, building_id)
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "AC not cooling"
    assert data["order_number"].startswith("WO-")
    assert data["category"] is not None
    assert data["priority"] is not None
    assert data["triage_result"] is not None
    assert data["triage_result"]["agent_mode"] == "rule_based"


def test_create_work_order_invalid_building(seeded_client):
    response = seeded_client.post("/api/work-orders", json={
        "title": "Test", "description": "Test desc", "building_id": 9999,
        "submitted_by": "Alice", "estimated_cost": None,
    })
    assert response.status_code == 404


def test_list_work_orders_empty(seeded_client):
    response = seeded_client.get("/api/work-orders")
    assert response.status_code == 200
    assert response.json() == []


def test_list_work_orders_after_create(seeded_client, building_id):
    _create_wo(seeded_client, building_id)
    _create_wo(seeded_client, building_id, title="Pipe leak", description="Water leak under the sink in the restroom.")
    response = seeded_client.get("/api/work-orders")
    assert response.status_code == 200
    assert len(response.json()) == 2


def test_filter_by_status(seeded_client, building_id):
    _create_wo(seeded_client, building_id)
    response = seeded_client.get("/api/work-orders?status=open")
    assert response.status_code == 200
    for item in response.json():
        assert item["status"] in ("open", "escalated")


def test_get_work_order_detail(seeded_client, building_id):
    created = _create_wo(seeded_client, building_id).json()
    response = seeded_client.get(f"/api/work-orders/{created['id']}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == created["id"]
    assert data["triage_result"] is not None
    assert isinstance(data["notes"], list)


def test_get_work_order_not_found(seeded_client):
    response = seeded_client.get("/api/work-orders/9999")
    assert response.status_code == 404


def test_update_status(seeded_client, building_id):
    created = _create_wo(seeded_client, building_id).json()
    response = seeded_client.patch(
        f"/api/work-orders/{created['id']}/status",
        json={"status": "in_progress", "actor": "Electrical Team"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "in_progress"


def test_update_status_resolved_sets_resolved_at(seeded_client, building_id):
    created = _create_wo(seeded_client, building_id).json()
    response = seeded_client.patch(
        f"/api/work-orders/{created['id']}/status",
        json={"status": "resolved", "actor": "Technician"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "resolved"
    assert data["resolved_at"] is not None


def test_assign_team(seeded_client, building_id, db):
    from app.models.team import Team
    team = db.query(Team).filter(Team.name == "Electrical Team").first()
    created = _create_wo(seeded_client, building_id).json()
    response = seeded_client.patch(
        f"/api/work-orders/{created['id']}/assign",
        json={"assigned_team_id": team.id, "actor": "Supervisor"},
    )
    assert response.status_code == 200
    assert response.json()["assigned_team_name"] == "Electrical Team"


def test_add_note(seeded_client, building_id):
    created = _create_wo(seeded_client, building_id).json()
    response = seeded_client.post(
        f"/api/work-orders/{created['id']}/notes",
        json={"author": "Supervisor", "content": "Team dispatched.", "note_type": "internal"},
    )
    assert response.status_code == 200
    assert response.json()["content"] == "Team dispatched."


def test_notes_appear_in_detail(seeded_client, building_id):
    created = _create_wo(seeded_client, building_id).json()
    seeded_client.post(
        f"/api/work-orders/{created['id']}/notes",
        json={"author": "Alice", "content": "First note.", "note_type": "internal"},
    )
    detail = seeded_client.get(f"/api/work-orders/{created['id']}").json()
    assert len(detail["notes"]) == 1
    assert detail["notes"][0]["content"] == "First note."


def test_approve_work_order(seeded_client, building_id):
    # Create a high-cost work order so it requires approval
    created = _create_wo(seeded_client, building_id, estimated_cost=5000.00).json()
    response = seeded_client.post(
        f"/api/work-orders/{created['id']}/approve",
        json={"approved_by": "Manager Jones", "notes": "Approved for repair."},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["approved_by"] == "Manager Jones"
    assert data["status"] == "in_progress"


def test_search_work_orders(seeded_client, building_id):
    _create_wo(seeded_client, building_id, title="Broken elevator door")
    _create_wo(seeded_client, building_id, title="HVAC unit failure")
    response = seeded_client.get("/api/work-orders?search=elevator")
    assert response.status_code == 200
    results = response.json()
    assert len(results) >= 1
    assert any("elevator" in r["title"].lower() for r in results)


def test_audit_log_created_after_work_order(seeded_client, building_id):
    created = _create_wo(seeded_client, building_id).json()
    response = seeded_client.get(f"/api/audit-logs?work_order_id={created['id']}")
    assert response.status_code == 200
    events = [e["event_type"] for e in response.json()]
    assert "work_order_created" in events
    assert "triage_completed" in events
