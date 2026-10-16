import datetime
from typing import List, Optional, Dict, Any
from app.adapters.aws import AwsAdapter
from app.adapters.azure import AzureAdapter
from app.adapters.gcp import GcpAdapter
from app.models.schemas import (
    ComputeInstance,
    StorageResource,
    NetworkMetrics,
    NetworkTimeSeriesPoint,
    ServiceHealth,
    CostResponse,
    DailyCostPoint,
    CostBreakdownItem,
    BudgetConfig,
    OverviewKPIs,
)

class AggregatorService:
    def __init__(self):
        self.adapters = {
            "aws": AwsAdapter(),
            "azure": AzureAdapter(),
            "gcp": GcpAdapter(),
        }
        # In-memory incident simulation tracking
        self.active_incident: Optional[Dict[str, Any]] = None
        # Default monthly budgets per provider
        self.budgets: Dict[str, float] = {
            "aws": 13500.0,
            "azure": 11500.0,
            "gcp": 10500.0,
            "total": 35500.0,
        }

    def set_budget(self, provider: str, amount: float):
        p = provider.lower()
        self.budgets[p] = float(amount)
        # Recalculate total if individual provider updated
        if p in ["aws", "azure", "gcp"]:
            self.budgets["total"] = (
                self.budgets.get("aws", 13500.0)
                + self.budgets.get("azure", 11500.0)
                + self.budgets.get("gcp", 10500.0)
            )

    def get_budgets(self) -> Dict[str, float]:
        return dict(self.budgets)

    def trigger_incident(
        self,
        provider: str = "aws",
        service_name: str = "Amazon Elastic Compute Cloud (EC2)",
        cost_multiplier: float = 1.6,
        cpu_spike: bool = True,
    ) -> Dict[str, Any]:
        self.active_incident = {
            "id": f"inc-{int(datetime.datetime.utcnow().timestamp())}",
            "active": True,
            "provider": provider.lower(),
            "service": service_name,
            "cost_multiplier": cost_multiplier,
            "cpu_spike": cpu_spike,
            "triggered_at": datetime.datetime.utcnow().isoformat() + "Z",
            "description": f"Critical outage simulated on {service_name} ({provider.upper()}) with CPU and cost surge.",
        }
        return self.active_incident

    def reset_incident(self) -> Dict[str, Any]:
        prev = self.active_incident
        self.active_incident = None
        return {"status": "reset", "previous_incident": prev}

    def _get_target_adapters(self, provider: Optional[str] = None):
        if provider and provider.lower() in self.adapters:
            return [self.adapters[provider.lower()]]
        return list(self.adapters.values())

    def get_compute(self, provider: Optional[str] = None) -> List[ComputeInstance]:
        instances: List[ComputeInstance] = []
        for adapter in self._get_target_adapters(provider):
            data = adapter.get_compute()
            # If incident is active for this provider, inject spike
            if self.active_incident and self.active_incident.get("active"):
                inc_p = self.active_incident["provider"]
                if adapter.provider_id == inc_p and self.active_incident.get("cpu_spike"):
                    for inst in data:
                        if inst.state == "running":
                            inst.cpu_percent = 98.6
                            inst.memory_percent = 95.2
                            inst.native_tags["IncidentState"] = "RESOURCE_EXHAUSTION"
                            break  # Spike first running instance to trigger CPU alert
            instances.extend(data)
        return instances

    def get_storage(self, provider: Optional[str] = None) -> List[StorageResource]:
        storage_list: List[StorageResource] = []
        for adapter in self._get_target_adapters(provider):
            storage_list.extend(adapter.get_storage())
        return storage_list

    def get_network(self, provider: Optional[str] = None) -> Dict[str, Any]:
        target_adapters = self._get_target_adapters(provider)
        provider_metrics: List[NetworkMetrics] = []

        for adapter in target_adapters:
            nm = adapter.get_network()
            # Check for simulated incident latency spike
            if self.active_incident and self.active_incident.get("active"):
                if adapter.provider_id == self.active_incident["provider"]:
                    nm.latency_ms = 188.5
                    nm.packet_loss_percent = 6.4
            provider_metrics.append(nm)

        # Build combined time series
        timestamps = [p.timestamp for p in provider_metrics[0].time_series]
        combined_ts = []
        for idx, t in enumerate(timestamps):
            total_in = 0.0
            total_out = 0.0
            for pm in provider_metrics:
                if idx < len(pm.time_series):
                    total_in += pm.time_series[idx].ingress_mbps
                    total_out += pm.time_series[idx].egress_mbps
            combined_ts.append(
                NetworkTimeSeriesPoint(
                    timestamp=t,
                    ingress_mbps=round(total_in, 1),
                    egress_mbps=round(total_out, 1),
                )
            )

        avg_latency = round(
            sum(pm.latency_ms for pm in provider_metrics) / len(provider_metrics), 1
        )
        avg_packet_loss = round(
            sum(pm.packet_loss_percent for pm in provider_metrics) / len(provider_metrics), 3
        )

        return {
            "average_latency_ms": avg_latency,
            "average_packet_loss_percent": avg_packet_loss,
            "aggregate_time_series": combined_ts,
            "provider_metrics": provider_metrics,
        }

    def get_costs(self, provider: Optional[str] = None, days: int = 30) -> CostResponse:
        aws_cost_data = self.adapters["aws"].get_costs(days)
        azure_cost_data = self.adapters["azure"].get_costs(days)
        gcp_cost_data = self.adapters["gcp"].get_costs(days)

        # Apply incident spike if active
        if self.active_incident and self.active_incident.get("active"):
            target_p = self.active_incident["provider"]
            mult = self.active_incident.get("cost_multiplier", 1.6)
            if target_p == "aws":
                aws_cost_data["monthly_total"] = round(aws_cost_data["monthly_total"] * mult, 2)
                for item in aws_cost_data["daily"][-3:]:
                    item["cost"] = round(item["cost"] * mult, 2)
            elif target_p == "azure":
                azure_cost_data["monthly_total"] = round(azure_cost_data["monthly_total"] * mult, 2)
                for item in azure_cost_data["daily"][-3:]:
                    item["cost"] = round(item["cost"] * mult, 2)
            elif target_p == "gcp":
                gcp_cost_data["monthly_total"] = round(gcp_cost_data["monthly_total"] * mult, 2)
                for item in gcp_cost_data["daily"][-3:]:
                    item["cost"] = round(item["cost"] * mult, 2)

        # Filter by provider if requested
        p_filter = provider.lower() if provider else None

        provider_costs = {
            "aws": round(aws_cost_data["monthly_total"], 2),
            "azure": round(azure_cost_data["monthly_total"], 2),
            "gcp": round(gcp_cost_data["monthly_total"], 2),
        }

        # Daily costs alignment
        daily_points: List[DailyCostPoint] = []
        for i in range(days):
            date_str = aws_cost_data["daily"][i]["date"]
            c_aws = aws_cost_data["daily"][i]["cost"]
            c_az = azure_cost_data["daily"][i]["cost"]
            c_gcp = gcp_cost_data["daily"][i]["cost"]

            if p_filter == "aws":
                c_az = 0.0
                c_gcp = 0.0
            elif p_filter == "azure":
                c_aws = 0.0
                c_gcp = 0.0
            elif p_filter == "gcp":
                c_aws = 0.0
                c_az = 0.0

            daily_points.append(
                DailyCostPoint(
                    date=date_str,
                    aws=c_aws,
                    azure=c_az,
                    gcp=c_gcp,
                    total=round(c_aws + c_az + c_gcp, 2),
                )
            )

        # Service breakdown
        breakdown: List[CostBreakdownItem] = []
        for item in aws_cost_data["services"]:
            if not p_filter or p_filter == "aws":
                breakdown.append(
                    CostBreakdownItem(
                        service=item["service"],
                        provider="aws",
                        cost=item["cost"],
                        percentage=item.get("percentage", 0.0),
                    )
                )
        for item in azure_cost_data["services"]:
            if not p_filter or p_filter == "azure":
                breakdown.append(
                    CostBreakdownItem(
                        service=item["service"],
                        provider="azure",
                        cost=item["cost"],
                        percentage=item.get("percentage", 0.0),
                    )
                )
        for item in gcp_cost_data["services"]:
            if not p_filter or p_filter == "gcp":
                breakdown.append(
                    CostBreakdownItem(
                        service=item["service"],
                        provider="gcp",
                        cost=item["cost"],
                        percentage=item.get("percentage", 0.0),
                    )
                )

        # Budget status
        budgets_status: Dict[str, BudgetConfig] = {}
        for p in ["aws", "azure", "gcp"]:
            budget_val = self.budgets.get(p, 10000.0)
            actual_spend = provider_costs[p]
            projected = round(actual_spend * 1.05, 2)
            pct = round((actual_spend / budget_val) * 100.0, 1) if budget_val > 0 else 0.0
            status = "normal"
            if pct >= 100.0:
                status = "critical"
            elif pct >= 80.0:
                status = "warning"

            budgets_status[p] = BudgetConfig(
                provider=p,
                monthly_budget=budget_val,
                current_spend=actual_spend,
                projected_spend=projected,
                percent_used=pct,
                status=status,
            )

        if p_filter:
            monthly_total = provider_costs.get(p_filter, 0.0)
            prev_total = round(monthly_total * 0.94, 2)
        else:
            monthly_total = sum(provider_costs.values())
            prev_total = round(monthly_total * 0.95, 2)

        change_pct = round(((monthly_total - prev_total) / prev_total) * 100.0, 1)

        return CostResponse(
            monthly_total=round(monthly_total, 2),
            previous_month_total=prev_total,
            change_percent=change_pct,
            provider_costs=provider_costs,
            daily_costs=daily_points,
            service_breakdown=breakdown,
            budget_status=budgets_status,
        )

    def get_health(self, provider: Optional[str] = None) -> List[ServiceHealth]:
        services: List[ServiceHealth] = []
        for adapter in self._get_target_adapters(provider):
            svc_list = adapter.get_service_health()
            # If simulated incident is active, flag the affected service
            if self.active_incident and self.active_incident.get("active"):
                for s in svc_list:
                    if (
                        s.provider == self.active_incident["provider"]
                        and (self.active_incident["service"] in s.service_name or "Compute" in s.service_name or "EC2" in s.service_name)
                    ):
                        s.status = "down"
                        s.uptime_percent = 94.2
                        s.latency_ms = 240.0
                        s.message = f"CRITICAL INCIDENT: Widespread degradation and failure detected on {s.service_name}."
            services.extend(svc_list)
        return services

    def get_overview(self, provider: Optional[str] = None) -> OverviewKPIs:
        compute_items = self.get_compute(provider)
        storage_items = self.get_storage(provider)
        network_data = self.get_network(provider)
        costs_data = self.get_costs(provider)
        health_items = self.get_health(provider)

        total_inst = len(compute_items)
        running_inst = sum(1 for c in compute_items if c.state == "running")

        total_prov_gb = sum(s.provisioned_gb for s in storage_items)
        total_used_gb = sum(s.used_gb for s in storage_items)
        storage_pct = round((total_used_gb / total_prov_gb) * 100.0, 1) if total_prov_gb > 0 else 0.0

        healthy_count = sum(1 for h in health_items if h.status == "up")
        healthy_pct = round((healthy_count / len(health_items)) * 100.0, 1) if health_items else 100.0

        prov_dist = {}
        for c in compute_items:
            prov_dist[c.provider] = prov_dist.get(c.provider, 0) + 1

        # Count active simulated alerts or critical issues
        alerts_count = 0
        if any(h.status != "up" for h in health_items):
            alerts_count += sum(1 for h in health_items if h.status != "up")
        if any(c.cpu_percent >= 90.0 for c in compute_items):
            alerts_count += sum(1 for c in compute_items if c.cpu_percent >= 90.0)
        for b in costs_data.budget_status.values():
            if b.status in ["warning", "critical"]:
                alerts_count += 1

        return OverviewKPIs(
            total_instances=total_inst,
            running_instances=running_inst,
            total_monthly_cost=costs_data.monthly_total,
            cost_change_percent=costs_data.change_percent,
            storage_provisioned_gb=round(total_prov_gb, 1),
            storage_used_gb=round(total_used_gb, 1),
            storage_used_percent=storage_pct,
            avg_latency_ms=network_data["average_latency_ms"],
            healthy_service_percent=healthy_pct,
            active_alerts_count=alerts_count,
            provider_distribution=prov_dist,
            last_updated=datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
        )

# Global singleton instance
aggregator = AggregatorService()
