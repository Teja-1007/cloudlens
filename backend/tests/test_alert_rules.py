import pytest
from app.services.alert_engine import AlertEngine
from app.services.aggregator import aggregator

@pytest.fixture
def engine():
    eng = AlertEngine()
    aggregator.reset_incident()
    return eng

def test_alert_rules_evaluation_and_retrieval(engine):
    alerts = engine.evaluate_rules()
    assert len(alerts) > 0

    # Severity filtering
    critical_alerts = engine.get_alerts(severity="critical")
    assert all(a.severity == "critical" for a in critical_alerts)

    warning_alerts = engine.get_alerts(severity="warning")
    assert all(a.severity == "warning" for a in warning_alerts)

def test_alert_acknowledgement(engine):
    alerts = engine.get_alerts()
    target_alert = alerts[0]
    alert_id = target_alert.id

    assert engine.acknowledge_alert(alert_id) is True
    updated = [a for a in engine.get_alerts() if a.id == alert_id][0]
    assert updated.acknowledged is True

def test_incident_simulation_triggers_critical_alerts(engine):
    # Trigger an incident on AWS
    aggregator.trigger_incident(
        provider="aws",
        service_name="Amazon Elastic Compute Cloud (EC2)",
        cost_multiplier=1.8,
        cpu_spike=True,
    )
    alerts = engine.evaluate_rules()
    
    # Check that critical alert was generated for outage or CPU
    criticals = [a for a in alerts if a.severity == "critical"]
    assert len(criticals) > 0
    assert any("outage" in a.title.lower() or "cpu" in a.title.lower() or "budget" in a.title.lower() for a in criticals)

    # Clean up incident
    aggregator.reset_incident()
