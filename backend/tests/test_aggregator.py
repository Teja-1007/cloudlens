import pytest
from app.services.aggregator import AggregatorService
from app.models.schemas import CostResponse, OverviewKPIs

@pytest.fixture
def service():
    svc = AggregatorService()
    svc.reset_incident()
    return svc

def test_aggregator_compute_merges_all_and_filters(service):
    all_instances = service.get_compute()
    assert len(all_instances) >= 15
    providers = {inst.provider for inst in all_instances}
    assert providers == {"aws", "azure", "gcp"}

    # Provider filtering
    aws_only = service.get_compute(provider="aws")
    assert all(i.provider == "aws" for i in aws_only)
    assert len(aws_only) < len(all_instances)

    azure_only = service.get_compute(provider="azure")
    assert all(i.provider == "azure" for i in azure_only)

    gcp_only = service.get_compute(provider="gcp")
    assert all(i.provider == "gcp" for i in gcp_only)

def test_aggregator_storage(service):
    all_storage = service.get_storage()
    assert len(all_storage) >= 12
    aws_storage = service.get_storage(provider="aws")
    assert all(s.provider == "aws" for s in aws_storage)

def test_aggregator_network(service):
    net_data = service.get_network()
    assert "average_latency_ms" in net_data
    assert "aggregate_time_series" in net_data
    assert len(net_data["aggregate_time_series"]) > 0
    assert len(net_data["provider_metrics"]) == 3

def test_aggregator_costs(service):
    costs = service.get_costs()
    assert isinstance(costs, CostResponse)
    assert costs.monthly_total > 0
    assert len(costs.daily_costs) == 30
    assert len(costs.service_breakdown) > 0
    assert "aws" in costs.budget_status
    assert "azure" in costs.budget_status
    assert "gcp" in costs.budget_status

def test_aggregator_overview_kpis(service):
    overview = service.get_overview()
    assert isinstance(overview, OverviewKPIs)
    assert overview.total_instances > 0
    assert overview.running_instances <= overview.total_instances
    assert overview.storage_used_percent > 0
    assert overview.healthy_service_percent >= 90.0

def test_aggregator_budget_update(service):
    service.set_budget("aws", 20000.0)
    budgets = service.get_budgets()
    assert budgets["aws"] == 20000.0
