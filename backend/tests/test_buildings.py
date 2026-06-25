def test_list_buildings_empty(client):
    response = client.get("/api/buildings")
    assert response.status_code == 200
    assert response.json() == []


def test_create_building(client):
    payload = {"name": "Test Hall", "address": "1 Main St", "building_code": "TH-001", "floors": 3}
    response = client.post("/api/buildings", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test Hall"
    assert data["id"] is not None
    assert data["is_active"] is True


def test_list_buildings_after_create(client):
    client.post("/api/buildings", json={"name": "Building A"})
    client.post("/api/buildings", json={"name": "Building B"})
    response = client.get("/api/buildings")
    assert response.status_code == 200
    assert len(response.json()) == 2


def test_get_building_by_id(client):
    created = client.post("/api/buildings", json={"name": "City Hall", "building_code": "CH"}).json()
    response = client.get(f"/api/buildings/{created['id']}")
    assert response.status_code == 200
    assert response.json()["name"] == "City Hall"


def test_get_building_not_found(client):
    response = client.get("/api/buildings/9999")
    assert response.status_code == 404


def test_update_building(client):
    created = client.post("/api/buildings", json={"name": "Old Name"}).json()
    response = client.patch(f"/api/buildings/{created['id']}", json={"name": "New Name", "floors": 4})
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "New Name"
    assert data["floors"] == 4


def test_update_building_not_found(client):
    response = client.patch("/api/buildings/9999", json={"name": "Nowhere"})
    assert response.status_code == 404
