import pytest
from app.adapters.base import CloudProviderAdapter
from app.adapters.aws import AwsAdapter
from app.adapters.azure import AzureAdapter
from app.adapters.gcp import GcpAdapter
from app.models.schemas import ComputeInstance, StorageResource, NetworkMetrics, ServiceHealth

@pytest.mark.parametrize("adapter_cls,expected_id", [
    (AwsAdapter, "aws"),
    (AzureAdapter, "azure"),
    (GcpAdapter, "gcp"),
])
def test_adapter_subclass_and_provider_id(adapter_cls, expected_id):
    adapter = adapter_cls()
    assert issubclass(adapter_cls, CloudProviderAdapter)
    assert adapter.provider_id == expected_id

@pytest.mark.parametrize("adapter_cls,expected_id", [
    (AwsAdapter, "aws"),
    (AzureAdapter, "azure"),
    (GcpAdapter, "gcp"),
])
def test_adapter_compute_schema(adapter_cls, expected_id):
    adapter = adapter_cls()
    instances = adapter.get_compute()
    assert len(instances) > 0
    for inst in instances:
        assert isinstance(inst, ComputeInstance)
        assert inst.provider == expected_id
        assert inst.id
        assert inst.name
        assert inst.region
        assert inst.state in ["running", "stopped", "terminated"]
        assert 0.0 <= inst.cpu_percent <= 100.0
        assert 0.0 <= inst.memory_percent <= 100.0

@pytest.mark.parametrize("adapter_cls,expected_id", [
    (AwsAdapter, "aws"),
    (AzureAdapter, "azure"),
    (GcpAdapter, "gcp"),
])
def test_adapter_storage_schema(adapter_cls, expected_id):
    adapter = adapter_cls()
    resources = adapter.get_storage()
    assert len(resources) > 0
    for res in resources:
        assert isinstance(res, StorageResource)
        assert res.provider == expected_id
        assert res.type in ["bucket", "disk"]
        assert res.provisioned_gb > 0
        assert 0.0 <= res.used_percent <= 100.0

@pytest.mark.parametrize("adapter_cls,expected_id", [
    (AwsAdapter, "aws"),
    (AzureAdapter, "azure"),
    (GcpAdapter, "gcp"),
])
def test_adapter_network_schema(adapter_cls, expected_id):
    adapter = adapter_cls()
    net = adapter.get_network()
    assert isinstance(net, NetworkMetrics)
    assert net.provider == expected_id
    assert net.latency_ms > 0
    assert net.packet_loss_percent >= 0
    assert len(net.time_series) > 0

@pytest.mark.parametrize("adapter_cls,expected_id", [
    (AwsAdapter, "aws"),
    (AzureAdapter, "azure"),
    (GcpAdapter, "gcp"),
])
def test_adapter_costs_schema(adapter_cls, expected_id):
    adapter = adapter_cls()
    costs = adapter.get_costs(days=30)
    assert costs["provider"] == expected_id
    assert len(costs["daily"]) == 30
    assert len(costs["services"]) > 0
    assert costs["monthly_total"] > 0

@pytest.mark.parametrize("adapter_cls,expected_id", [
    (AwsAdapter, "aws"),
    (AzureAdapter, "azure"),
    (GcpAdapter, "gcp"),
])
def test_adapter_health_schema(adapter_cls, expected_id):
    adapter = adapter_cls()
    health_list = adapter.get_service_health()
    assert len(health_list) > 0
    for h in health_list:
        assert isinstance(h, ServiceHealth)
        assert h.provider == expected_id
        assert h.status in ["up", "degraded", "down"]
        assert 0.0 <= h.uptime_percent <= 100.0
