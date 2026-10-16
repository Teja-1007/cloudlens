import pytest
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c

def test_root_endpoint(client):
    res = client.get("/")
    assert res.status_code == 200
    assert "CloudLens" in res.json()["platform"]

def test_overview_endpoint(client):
    res = client.get("/api/overview")
    assert res.status_code == 200
    data = res.json()
    assert "total_instances" in data
    assert "total_monthly_cost" in data
    assert "healthy_service_percent" in data

    # Test with provider filter
    res_aws = client.get("/api/overview?provider=aws")
    assert res_aws.status_code == 200

def test_compute_endpoint(client):
    res = client.get("/api/compute")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert all("cpu_percent" in item for item in data)

    res_azure = client.get("/api/compute?provider=azure")
    assert res_azure.status_code == 200
    assert all(item["provider"] == "azure" for item in res_azure.json())

def test_storage_endpoint(client):
    res = client.get("/api/storage")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) > 0

def test_network_endpoint(client):
    res = client.get("/api/network")
    assert res.status_code == 200
    data = res.json()
    assert "average_latency_ms" in data
    assert "aggregate_time_series" in data

def test_costs_endpoint(client):
    res = client.get("/api/costs")
    assert res.status_code == 200
    data = res.json()
    assert "monthly_total" in data
    assert "daily_costs" in data
    assert "service_breakdown" in data
    assert "budget_status" in data

def test_health_endpoint(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) > 0

def test_alerts_and_acknowledge(client):
    res = client.get("/api/alerts")
    assert res.status_code == 200
    alerts = res.json()
    assert len(alerts) > 0

    first_alert = alerts[0]
    ack_res = client.post(f"/api/alerts/{first_alert['id']}/acknowledge")
    assert ack_res.status_code == 200
    assert ack_res.json()["acknowledged"] is True

def test_budget_endpoints(client):
    res = client.get("/api/budget")
    assert res.status_code == 200
    data = res.json()
    assert "aws" in data

    update_res = client.put("/api/budget", json={"provider": "aws", "monthly_budget": 15000.0})
    assert update_res.status_code == 200
    assert update_res.json()["aws"]["monthly_budget"] == 15000.0

def test_simulate_incident_flow(client):
    sim_res = client.post("/api/simulate-incident", json={
        "provider": "aws",
        "service_name": "Amazon Elastic Compute Cloud (EC2)",
        "cost_multiplier": 1.7,
        "cpu_spike": True
    })
    assert sim_res.status_code == 200
    assert sim_res.json()["status"] == "incident_active"

    # Status check
    status_res = client.get("/api/simulate-incident/status")
    assert status_res.status_code == 200
    assert status_res.json()["active"] is True

    # Reset
    reset_res = client.post("/api/simulate-incident/reset")
    assert reset_res.status_code == 200
    assert reset_res.json()["status"] == "system_restored"
