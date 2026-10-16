import random
import datetime
from typing import List, Dict, Any
from app.adapters.base import CloudProviderAdapter
from app.models.schemas import (
    ComputeInstance,
    StorageResource,
    NetworkMetrics,
    NetworkTimeSeriesPoint,
    ServiceHealth,
)

class AzureAdapter(CloudProviderAdapter):
    """
    Microsoft Azure Cloud Provider Adapter.
    Simulates Azure Resource Manager APIs (Azure VMs, Blob Storage, Managed Disks,
    Azure Monitor, Azure Cost Management, Azure Service Health) and normalizes
    output into the CloudLens common schema.

    ========================================================================================
    PRODUCTION SDK INTEGRATION NOTES (Replacing Mock with azure-mgmt SDKs):
    To switch to live Azure infrastructure, replace the methods below with:
      - from azure.identity import DefaultAzureCredential
      - from azure.mgmt.compute import ComputeManagementClient
      - from azure.mgmt.storage import StorageManagementClient
      - from azure.mgmt.monitor import MonitorManagementClient
      - from azure.mgmt.costmanagement import CostManagementClient
      - from azure.mgmt.resourcehealth import ResourceHealthMgmtClient
      
      Compute: compute_client.virtual_machines.list_all()
      Storage: storage_client.storage_accounts.list() + blob_service_client.list_containers()
      Network: monitor_client.metrics.list(resource_uri, metricnames='Network In Total,Network Out Total')
      Cost: cost_client.query.usage(scope=f'/subscriptions/{sub_id}', parameters=query_definition)
      Health: resource_health_client.availability_statuses.list_by_subscription_id()
    Authentication handled via Azure Workload Identity, Service Principal, or AZURE_CLIENT_ID.
    ========================================================================================
    """

    @property
    def provider_id(self) -> str:
        return "azure"

    def get_compute(self) -> List[ComputeInstance]:
        """
        Mock implementation of Azure Virtual Machines API.
        
        Real SDK equivalent:
          client = ComputeManagementClient(credential, subscription_id)
          vms = client.virtual_machines.list_all()
        """
        vm_defs = [
            ("vm-az-core-payment-01", "az-prod-payments-vm-01", "eastus", "Standard_D8s_v5", "running", 72.1, 78.4, "2026-08-14T06:20:00Z", {"Environment": "Production", "Workload": "FinTech"}),
            ("vm-az-core-payment-02", "az-prod-payments-vm-02", "eastus", "Standard_D8s_v5", "running", 69.5, 75.0, "2026-08-14T06:22:00Z", {"Environment": "Production", "Workload": "FinTech"}),
            ("vm-az-k8s-node-pool-01", "az-aks-nodepool-app-01", "westeurope", "Standard_E8s_v5", "running", 82.6, 88.3, "2026-09-03T10:00:00Z", {"Environment": "Production", "Cluster": "aks-core"}),
            ("vm-az-k8s-node-pool-02", "az-aks-nodepool-app-02", "westeurope", "Standard_E8s_v5", "running", 79.4, 85.1, "2026-09-03T10:02:00Z", {"Environment": "Production", "Cluster": "aks-core"}),
            ("vm-az-backend-cache-01", "az-redis-sentinel-01", "southeastasia", "Standard_D4s_v5", "running", 38.0, 52.3, "2026-07-29T14:15:00Z", {"Environment": "Production", "Role": "Cache"}),
            ("vm-az-qa-testbench-01", "az-qa-integration-vm", "eastus", "Standard_B2s", "running", 22.8, 44.0, "2026-09-18T19:30:00Z", {"Environment": "QA", "Role": "IntegrationTest"}),
            ("vm-az-batch-gpu-train", "az-hpc-gpu-node-01", "westeurope", "Standard_NC6s_v3", "stopped", 0.0, 0.0, "2026-09-24T08:10:00Z", {"Environment": "Research", "Role": "DeepLearning"}),
        ]

        result = []
        for v_id, name, region, itype, state, base_cpu, base_mem, l_time, tags in vm_defs:
            cpu = base_cpu
            mem = base_mem
            if state == "running":
                cpu = max(4.0, min(99.0, round(base_cpu + random.uniform(-4.5, 4.5), 1)))
                mem = max(12.0, min(98.0, round(base_mem + random.uniform(-2.0, 2.0), 1)))

            result.append(
                ComputeInstance(
                    id=v_id,
                    name=name,
                    provider="azure",
                    region=region,
                    type=itype,
                    state=state,
                    cpu_percent=cpu,
                    memory_percent=mem,
                    launch_time=l_time,
                    native_tags=tags,
                )
            )
        return result

    def get_storage(self) -> List[StorageResource]:
        """
        Mock implementation of Azure Blob Storage & Managed Disks.
        
        Real SDK equivalent:
          storage_client = StorageManagementClient(credential, subscription_id)
          compute_client = ComputeManagementClient(credential, subscription_id)
          disks = compute_client.disks.list()
        """
        storage_defs = [
            ("az-blob-media-catalog", "azprodmediacatalogblob", "bucket", "eastus", 20000.0, 15400.0, "Blob Hot (GRS)"),
            ("az-blob-telemetry-archive", "aztelemetryarchiveblob", "bucket", "westeurope", 35000.0, 29800.0, "Blob Cool (ZRS)"),
            ("az-blob-backup-immutable", "azcomplianceimmutableblob", "bucket", "southeastasia", 60000.0, 48500.0, "Blob Archive (LRS)"),
            ("disk-az-sqldb-os-disk", "az-managed-os-disk-sqldb", "disk", "eastus", 1024.0, 680.0, "Premium SSD v2"),
            ("disk-az-aks-pv-storage", "az-aks-persistent-volume-01", "disk", "westeurope", 2048.0, 1790.0, "Ultra Disk Storage"),
        ]

        result = []
        for s_id, name, stype, region, prov_gb, used_gb, sclass in storage_defs:
            pct = round((used_gb / prov_gb) * 100.0, 1)
            result.append(
                StorageResource(
                    id=s_id,
                    name=name,
                    provider="azure",
                    type=stype,
                    region=region,
                    provisioned_gb=prov_gb,
                    used_gb=used_gb,
                    used_percent=pct,
                    storage_class=sclass,
                )
            )
        return result

    def get_network(self) -> NetworkMetrics:
        """
        Mock implementation of Azure Monitor Network Metrics.
        
        Real SDK equivalent:
          monitor_client = MonitorManagementClient(credential, subscription_id)
          metrics = monitor_client.metrics.list(...)
        """
        now = datetime.datetime.utcnow()
        points = []
        base_in = 360.0
        base_out = 590.0

        for i in range(12, -1, -1):
            t = (now - datetime.timedelta(minutes=i * 5)).strftime("%H:%M")
            in_val = round(base_in + random.uniform(-35, 45), 1)
            out_val = round(base_out + random.uniform(-50, 60), 1)
            points.append(NetworkTimeSeriesPoint(timestamp=t, ingress_mbps=in_val, egress_mbps=out_val))

        return NetworkMetrics(
            provider="azure",
            latency_ms=round(34.2 + random.uniform(-3.5, 3.5), 1),
            packet_loss_percent=round(max(0.0, random.uniform(0.015, 0.06)), 3),
            time_series=points,
        )

    def get_costs(self, days: int = 30) -> Dict[str, Any]:
        """
        Mock implementation of Azure Cost Management API.
        
        Real SDK equivalent:
          cost_client = CostManagementClient(credential)
          result = cost_client.query.usage(scope=..., parameters=...)
        """
        now = datetime.datetime.utcnow()
        daily = []
        base_daily = 358.0

        for i in range(days - 1, -1, -1):
            d = (now - datetime.timedelta(days=i)).strftime("%Y-%m-%d")
            dt = now - datetime.timedelta(days=i)
            factor = 0.88 if dt.weekday() >= 5 else 1.01
            cost = round((base_daily * factor) + random.uniform(-15.0, 20.0), 2)
            daily.append({"date": d, "cost": cost})

        service_costs = [
            {"service": "Azure Virtual Machines (Compute)", "cost": 4120.50},
            {"service": "Azure Blob Storage & Managed Disks", "cost": 2480.30},
            {"service": "Azure Kubernetes Service (AKS)", "cost": 1890.00},
            {"service": "Azure SQL Database", "cost": 1410.20},
            {"service": "Azure Virtual Network & ExpressRoute", "cost": 540.80},
            {"service": "Azure Functions (Serverless)", "cost": 380.00},
        ]
        total = sum(item["cost"] for item in service_costs)
        for item in service_costs:
            item["percentage"] = round((item["cost"] / total) * 100.0, 1)

        return {
            "provider": "azure",
            "daily": daily,
            "services": service_costs,
            "monthly_total": total,
        }

    def get_service_health(self) -> List[ServiceHealth]:
        """
        Mock implementation of Azure Service Health API.
        
        Real SDK equivalent:
          health_client = ResourceHealthMgmtClient(credential, subscription_id)
          health_client.availability_statuses.list(...)
        """
        return [
            ServiceHealth(
                service_name="Azure Virtual Machines",
                provider="azure",
                category="Compute",
                status="up",
                latency_ms=32.4,
                uptime_percent=99.96,
                message="Virtual Machine fabric fully operational.",
            ),
            ServiceHealth(
                service_name="Azure Blob Storage",
                provider="azure",
                category="Storage",
                status="up",
                latency_ms=23.1,
                uptime_percent=99.99,
                message="Geo-redundant endpoints synchronized.",
            ),
            ServiceHealth(
                service_name="Azure Kubernetes Service (AKS)",
                provider="azure",
                category="Compute",
                status="up",
                latency_ms=36.0,
                uptime_percent=99.94,
                message="Managed control planes healthy.",
            ),
            ServiceHealth(
                service_name="Azure SQL Database",
                provider="azure",
                category="Database",
                status="up",
                latency_ms=28.7,
                uptime_percent=99.98,
                message="Failover groups online and in-sync.",
            ),
            ServiceHealth(
                service_name="Azure Functions",
                provider="azure",
                category="Compute",
                status="up",
                latency_ms=21.0,
                uptime_percent=99.99,
                message="Consumption and Premium plans responsive.",
            ),
            ServiceHealth(
                service_name="Azure Virtual Network",
                provider="azure",
                category="Networking",
                status="up",
                latency_ms=14.3,
                uptime_percent=100.0,
                message="VPN Gateways and NSG rules enforcing properly.",
            ),
        ]
