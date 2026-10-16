from fastapi import APIRouter, Depends
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.services.aggregator import aggregator
from app.services.alert_engine import alert_engine
from app.models.schemas import IncidentSimulationRequest
from app.database import get_db

router = APIRouter(prefix="/api/simulate-incident", tags=["Incident Simulation"])

@router.post("")
def simulate_incident(
    payload: Optional[IncidentSimulationRequest] = None,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Simulates a high-severity cloud outage and cost surge:
    1. Forces the target provider's primary compute service (e.g. Amazon EC2) to status 'down'.
    2. Spikes compute instance CPU utilization to ~98.6%.
    3. Multiplies spend by 1.6x, causing a budget warning/breach.
    4. Spikes network round-trip latency to ~188ms.
    5. Evaluates alert rules immediately and produces Critical alerts.
    """
    req = payload or IncidentSimulationRequest()
    multiplier = 1.6
    if req:
        if req.cost_spike_multiplier is not None:
            multiplier = req.cost_spike_multiplier
        elif req.cost_multiplier is not None:
            multiplier = req.cost_multiplier

    inc = aggregator.trigger_incident(
        provider=req.provider or "aws",
        service_name=req.service_name or "Amazon Elastic Compute Cloud (EC2)",
        cost_multiplier=multiplier,
        cpu_spike=req.cpu_spike if req.cpu_spike is not None else True,
    )

    # Immediately trigger alert engine evaluation
    triggered_alerts = alert_engine.evaluate_rules(db=db)

    return {
        "status": "incident_active",
        "incident_details": inc,
        "alerts_triggered_count": len([a for a in triggered_alerts if not a.acknowledged and a.severity == "critical"]),
        "message": f"Incident simulated successfully! {inc['service']} ({inc['provider'].upper()}) is DOWN and metrics spiked.",
    }

@router.get("/status")
def get_incident_status() -> Dict[str, Any]:
    """
    Returns current incident simulation status.
    """
    return {
        "active": aggregator.active_incident is not None and aggregator.active_incident.get("active", False),
        "incident": aggregator.active_incident,
    }

@router.post("/reset")
def reset_incident(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Resets the simulated incident back to normal operating health.
    """
    result = aggregator.reset_incident()
    # Re-evaluate rules under normal conditions
    alert_engine.evaluate_rules(db=db)
    return {
        "status": "system_restored",
        "message": "All cloud services restored to normal operational thresholds.",
        "details": result,
    }
