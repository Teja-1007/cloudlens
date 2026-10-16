from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class ComputeInstance(BaseModel):
    id: str
    name: str
    provider: str  # "aws", "azure", "gcp"
    region: str
    type: str  # e.g., t3.large, Standard_D4s_v5, e2-standard-4
    state: str  # "running", "stopped", "terminated"
    cpu_percent: float
    memory_percent: float
    launch_time: str
    native_tags: Dict[str, str] = Field(default_factory=dict)

class StorageResource(BaseModel):
    id: str
    name: str
    provider: str
    type: str  # "bucket" or "disk"
    region: str
    provisioned_gb: float
    used_gb: float
    used_percent: float
    storage_class: str

class NetworkTimeSeriesPoint(BaseModel):
    timestamp: str
    ingress_mbps: float
    egress_mbps: float

class NetworkMetrics(BaseModel):
    provider: str
    latency_ms: float
    packet_loss_percent: float
    time_series: List[NetworkTimeSeriesPoint]

class ServiceHealth(BaseModel):
    service_name: str
    provider: str
    category: str  # "Compute", "Storage", "Database", "Networking", "Security"
    status: str  # "up", "degraded", "down"
    latency_ms: float
    uptime_percent: float
    message: str

class CostBreakdownItem(BaseModel):
    service: str
    provider: str
    cost: float
    percentage: float

class DailyCostPoint(BaseModel):
    date: str
    aws: float = 0.0
    azure: float = 0.0
    gcp: float = 0.0
    total: float = 0.0

class BudgetConfig(BaseModel):
    provider: str
    monthly_budget: float
    current_spend: float
    projected_spend: float
    percent_used: float
    currency: str = "USD"
    status: str  # "normal", "warning", "critical"

class CostResponse(BaseModel):
    monthly_total: float
    previous_month_total: float
    change_percent: float
    provider_costs: Dict[str, float]
    daily_costs: List[DailyCostPoint]
    service_breakdown: List[CostBreakdownItem]
    budget_status: Dict[str, BudgetConfig]

class Alert(BaseModel):
    id: str
    title: str
    message: str
    severity: str  # "critical", "warning", "info"
    provider: Optional[str] = None
    service: Optional[str] = None
    metric_value: Optional[float] = None
    threshold: Optional[float] = None
    timestamp: str
    acknowledged: bool = False

class OverviewKPIs(BaseModel):
    total_instances: int
    running_instances: int
    total_monthly_cost: float
    cost_change_percent: float
    storage_provisioned_gb: float
    storage_used_gb: float
    storage_used_percent: float
    avg_latency_ms: float
    healthy_service_percent: float
    active_alerts_count: int
    provider_distribution: Dict[str, int]
    last_updated: str

class BudgetUpdateRequest(BaseModel):
    provider: str
    monthly_budget: float

class IncidentSimulationRequest(BaseModel):
    provider: Optional[str] = "aws"
    service_name: Optional[str] = "Amazon EC2"
    cost_multiplier: Optional[float] = 1.6
    cost_spike_multiplier: Optional[float] = None
    cpu_spike: Optional[bool] = True
