import pytest


@pytest.fixture
def client_with_data(seeded_client, db):
    """Client with buildings, teams, and 3 work orders created."""
    from app.models.building import Building
    building = db.query(Building).filter(Building.name == "City Hall").first()
    work_orders = [
        {
            "title": "AC not cooling",
            "description": "The air conditioning stopped working completely on the top floor.",
            "building_id": building.id,
            "submitted_by": "Alice",
            "estimated_cost": None,
        },
        {
            "title": "Water pipe leaking",
            "description": "There is a water leak under the sink in the second floor restroom. Water pooling.",
            "building_id": building.id,
            "submitted_by": "Bob",
            "estimated_cost": None,
        },
        {
            "title": "No power in wing B",
            "description": "Power outage in the entire west wing. Circuit breaker tripped and will not reset.",
            "building_id": building.id,
            "submitted_by": "Charlie",
            "estimated_cost": None,
        },
    ]
    for wo in work_orders:
        seeded_client.post("/api/work-orders", json=wo)
    return seeded_client


def test_analytics_summary_returns_counts(client_with_data):
    response = client_with_data.get("/api/analytics/summary")
    assert response.status_code == 200
    data = response.json()
    assert data["total_work_orders"] >= 3
    assert "open_work_orders" in data
    assert "critical_work_orders" in data
    assert "overdue_work_orders" in data
    assert "pending_approval_work_orders" in data


def test_analytics_overview_structure(client_with_data):
    response = client_with_data.get("/api/analytics")
    assert response.status_code == 200
    data = response.json()
    assert "summary" in data
    assert "by_category" in data
    assert "by_building" in data
    assert "by_team" in data
    assert "sla_performance" in data


def test_analytics_by_category_is_list(client_with_data):
    response = client_with_data.get("/api/analytics")
    data = response.json()
    assert isinstance(data["by_category"], list)
    for item in data["by_category"]:
        assert "category" in item
        assert "count" in item


def test_analytics_by_building_includes_city_hall(client_with_data):
    response = client_with_data.get("/api/analytics")
    data = response.json()
    building_names = [b["building_name"] for b in data["by_building"]]
    assert "City Hall" in building_names


def test_analytics_sla_performance_has_all_priorities(client_with_data):
    response = client_with_data.get("/api/analytics")
    data = response.json()
    priorities = [item["priority"] for item in data["sla_performance"]]
    assert "critical" in priorities
    assert "high" in priorities
    assert "medium" in priorities
    assert "low" in priorities


def test_analytics_summary_empty_database(client):
    response = client.get("/api/analytics/summary")
    assert response.status_code == 200
    data = response.json()
    assert data["total_work_orders"] == 0
    assert data["open_work_orders"] == 0
