import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.schemas import Alert
from app.models.db_models import AlertModel
from app.database import SessionLocal
from app.services.aggregator import aggregator

class AlertEngine:
    def __init__(self):
        self._in_memory_alerts: Dict[str, Alert] = {}
        self._seed_initial_alerts()

    def _seed_initial_alerts(self):
        """Pre-populate sample real-world alerts for demonstration."""
        now = datetime.datetime.utcnow()
        sample_alerts = [
            Alert(
                id="alt-init-storage-gcp",
                title="Storage Capacity Warning",
                message="Storage utilization on cloudlens-gcp-audit-coldline (GCP) reached 82.4% (41,200 GB of 50,000 GB). Approaching 85% threshold.",
                severity="warning",
                provider="gcp",
                service="Google Cloud Storage",
                metric_value=82.4,
                threshold=85.0,
                timestamp=(now - datetime.timedelta(hours=2, minutes=15)).strftime("%Y-%m-%d %H:%M:%S UTC"),
                acknowledged=False,
            ),
            Alert(
                id="alt-init-cpu-aws",
                title="Elevated CPU Spike",
                message="Compute instance aws-data-worker-spot-01 (AWS - i-0c9d8e7f6a5b4003) experienced sustained CPU load at 89.2% for > 15 minutes.",
                severity="warning",
                provider="aws",
                service="Amazon Elastic Compute Cloud (EC2)",
                metric_value=89.2,
                threshold=90.0,
                timestamp=(now - datetime.timedelta(hours=4, minutes=40)).strftime("%Y-%m-%d %H:%M:%S UTC"),
                acknowledged=True,
            ),
            Alert(
                id="alt-init-budget-azure",
                title="Budget Threshold Approaching",
                message="Azure monthly spend reached $10,821.80 (94.1% of allocated $11,500.00 monthly budget).",
                severity="warning",
                provider="azure",
                service="Azure Cost Management",
                metric_value=94.1,
                threshold=80.0,
                timestamp=(now - datetime.timedelta(hours=6, minutes=10)).strftime("%Y-%m-%d %H:%M:%S UTC"),
                acknowledged=False,
            ),
        ]
        for a in sample_alerts:
            self._in_memory_alerts[a.id] = a

    def evaluate_rules(self, db: Optional[Session] = None) -> List[Alert]:
        """
        Evaluate all alert rules against live aggregator metrics:
        1. Budget > 80% (warning), > 100% (critical)
        2. CPU > 90% (critical)
        3. Storage > 85% (warning)
        4. Service status degraded (warning), down (critical)
        5. Latency spike > 120ms (warning/critical)
        """
        new_alerts: List[Alert] = []
        now_str = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")

        # 1. Budget rules
        cost_data = aggregator.get_costs()
        for p, b_cfg in cost_data.budget_status.items():
            if b_cfg.percent_used >= 100.0:
                alert_id = f"alert-budget-critical-{p}"
                alert = Alert(
                    id=alert_id,
                    title=f"Critical Budget Breach: {p.upper()}",
                    message=f"{p.upper()} spend (${b_cfg.current_spend:,.2f}) exceeded monthly budget limit of ${b_cfg.monthly_budget:,.2f} ({b_cfg.percent_used}%).",
                    severity="critical",
                    provider=p,
                    service=f"{p.upper()} Cost Management",
                    metric_value=b_cfg.percent_used,
                    threshold=100.0,
                    timestamp=now_str,
                    acknowledged=False,
                )
                self._upsert_alert(alert, db)
                new_alerts.append(alert)
            elif b_cfg.percent_used >= 80.0:
                alert_id = f"alert-budget-warning-{p}"
                alert = Alert(
                    id=alert_id,
                    title=f"Budget Warning: {p.upper()}",
                    message=f"{p.upper()} spend (${b_cfg.current_spend:,.2f}) reached {b_cfg.percent_used}% of allocated ${b_cfg.monthly_budget:,.2f} budget.",
                    severity="warning",
                    provider=p,
                    service=f"{p.upper()} Cost Management",
                    metric_value=b_cfg.percent_used,
                    threshold=80.0,
                    timestamp=now_str,
                    acknowledged=False,
                )
                self._upsert_alert(alert, db)
                new_alerts.append(alert)

        # 2. CPU Rules (>90%)
        compute_instances = aggregator.get_compute()
        for inst in compute_instances:
            if inst.cpu_percent >= 90.0:
                alert_id = f"alert-cpu-critical-{inst.id}"
                alert = Alert(
                    id=alert_id,
                    title=f"High CPU Spike: {inst.name}",
                    message=f"Compute instance {inst.name} ({inst.provider.upper()} - {inst.id}) CPU utilization reached {inst.cpu_percent}%, exceeding 90% critical threshold.",
                    severity="critical",
                    provider=inst.provider,
                    service="Compute Engine" if inst.provider == "gcp" else ("Azure VMs" if inst.provider == "azure" else "Amazon EC2"),
                    metric_value=inst.cpu_percent,
                    threshold=90.0,
                    timestamp=now_str,
                    acknowledged=False,
                )
                self._upsert_alert(alert, db)
                new_alerts.append(alert)

        # 3. Storage Rules (>85%)
        storage_resources = aggregator.get_storage()
        for st in storage_resources:
            if st.used_percent >= 85.0:
                alert_id = f"alert-storage-warning-{st.id}"
                alert = Alert(
                    id=alert_id,
                    title=f"Storage Threshold Warning: {st.name}",
                    message=f"Resource {st.name} ({st.provider.upper()}) is at {st.used_percent}% utilization ({st.used_gb:,.0f} GB / {st.provisioned_gb:,.0f} GB).",
                    severity="warning",
                    provider=st.provider,
                    service="Storage",
                    metric_value=st.used_percent,
                    threshold=85.0,
                    timestamp=now_str,
                    acknowledged=False,
                )
                self._upsert_alert(alert, db)
                new_alerts.append(alert)

        # 4. Service Health Rules (degraded / down)
        health_list = aggregator.get_health()
        for h in health_list:
            if h.status == "down":
                alert_id = f"alert-health-down-{h.provider}-{h.service_name.replace(' ', '_').lower()}"
                alert = Alert(
                    id=alert_id,
                    title=f"Service Outage: {h.service_name}",
                    message=f"{h.service_name} ({h.provider.upper()}) is DOWN! {h.message}",
                    severity="critical",
                    provider=h.provider,
                    service=h.service_name,
                    metric_value=h.uptime_percent,
                    threshold=99.0,
                    timestamp=now_str,
                    acknowledged=False,
                )
                self._upsert_alert(alert, db)
                new_alerts.append(alert)
            elif h.status == "degraded":
                alert_id = f"alert-health-degraded-{h.provider}-{h.service_name.replace(' ', '_').lower()}"
                alert = Alert(
                    id=alert_id,
                    title=f"Service Degraded: {h.service_name}",
                    message=f"{h.service_name} ({h.provider.upper()}) is DEGRADED. Latency: {h.latency_ms}ms. {h.message}",
                    severity="warning",
                    provider=h.provider,
                    service=h.service_name,
                    metric_value=h.latency_ms,
                    threshold=100.0,
                    timestamp=now_str,
                    acknowledged=False,
                )
                self._upsert_alert(alert, db)
                new_alerts.append(alert)

        # 5. Latency Spikes (> 120ms)
        network_data = aggregator.get_network()
        for pm in network_data.get("provider_metrics", []):
            if pm.latency_ms >= 120.0:
                alert_id = f"alert-latency-spike-{pm.provider}"
                alert = Alert(
                    id=alert_id,
                    title=f"Network Latency Spike: {pm.provider.upper()}",
                    message=f"Network roundtrip latency for {pm.provider.upper()} jumped to {pm.latency_ms}ms (Packet loss: {pm.packet_loss_percent}%).",
                    severity="critical" if pm.latency_ms >= 180.0 else "warning",
                    provider=pm.provider,
                    service="Virtual Network Fabric",
                    metric_value=pm.latency_ms,
                    threshold=120.0,
                    timestamp=now_str,
                    acknowledged=False,
                )
                self._upsert_alert(alert, db)
                new_alerts.append(alert)

        return self.get_alerts()

    def _upsert_alert(self, alert: Alert, db: Optional[Session] = None):
        # Preserve acknowledged status if already acknowledged
        if alert.id in self._in_memory_alerts:
            alert.acknowledged = self._in_memory_alerts[alert.id].acknowledged
        self._in_memory_alerts[alert.id] = alert

        # Also persist to SQLite if DB session available
        if db is not None:
            try:
                record = db.query(AlertModel).filter(AlertModel.id == alert.id).first()
                if not record:
                    record = AlertModel(
                        id=alert.id,
                        title=alert.title,
                        message=alert.message,
                        severity=alert.severity,
                        provider=alert.provider,
                        service=alert.service,
                        metric_value=alert.metric_value,
                        threshold=alert.threshold,
                        acknowledged=alert.acknowledged,
                    )
                    db.add(record)
                else:
                    record.title = alert.title
                    record.message = alert.message
                    record.severity = alert.severity
                    record.metric_value = alert.metric_value
                    record.threshold = alert.threshold
                db.commit()
            except Exception:
                db.rollback()

    def get_alerts(
        self,
        provider: Optional[str] = None,
        severity: Optional[str] = None,
        acknowledged: Optional[bool] = None,
    ) -> List[Alert]:
        alerts = list(self._in_memory_alerts.values())
        if provider and provider.lower() != "all":
            alerts = [a for a in alerts if a.provider and a.provider.lower() == provider.lower()]
        if severity and severity.lower() != "all":
            alerts = [a for a in alerts if a.severity.lower() == severity.lower()]
        if acknowledged is not None:
            alerts = [a for a in alerts if a.acknowledged == acknowledged]

        # Sort: unacknowledged first, then critical, warning, info, then most recent
        severity_rank = {"critical": 0, "warning": 1, "info": 2}
        alerts.sort(
            key=lambda a: (
                1 if a.acknowledged else 0,
                severity_rank.get(a.severity, 3),
                a.timestamp,
            ),
            reverse=False,
        )
        return alerts

    def acknowledge_alert(self, alert_id: str, db: Optional[Session] = None) -> bool:
        if alert_id in self._in_memory_alerts:
            self._in_memory_alerts[alert_id].acknowledged = True

        if db is not None:
            try:
                record = db.query(AlertModel).filter(AlertModel.id == alert_id).first()
                if record:
                    record.acknowledged = True
                    db.commit()
            except Exception:
                db.rollback()

        return alert_id in self._in_memory_alerts

# Global singleton
alert_engine = AlertEngine()
