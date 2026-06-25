def test_list_teams_empty(client):
    response = client.get("/api/teams")
    assert response.status_code == 200
    assert response.json() == []


def test_create_team(client):
    payload = {"name": "HVAC Team", "team_code": "HVAC", "specialty": "Heating and cooling"}
    response = client.post("/api/teams", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "HVAC Team"
    assert data["is_active"] is True


def test_get_team_by_id(client):
    created = client.post("/api/teams", json={"name": "Plumbing Team"}).json()
    response = client.get(f"/api/teams/{created['id']}")
    assert response.status_code == 200
    assert response.json()["name"] == "Plumbing Team"


def test_get_team_not_found(client):
    response = client.get("/api/teams/9999")
    assert response.status_code == 404


def test_update_team(client):
    created = client.post("/api/teams", json={"name": "Old Team"}).json()
    response = client.patch(f"/api/teams/{created['id']}", json={"name": "New Team", "specialty": "General"})
    assert response.status_code == 200
    assert response.json()["name"] == "New Team"


def test_team_workload_empty(client):
    team = client.post("/api/teams", json={"name": "Idle Team"}).json()
    response = client.get(f"/api/teams/{team['id']}/workload")
    assert response.status_code == 200
    data = response.json()
    assert data["open_count"] == 0
    assert data["critical_count"] == 0


def test_team_workload_not_found(client):
    response = client.get("/api/teams/9999/workload")
    assert response.status_code == 404
