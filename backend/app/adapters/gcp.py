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

class GcpAdapter(CloudProviderAdapter):
    """
    Google Cloud Platform (GCP) Adapter.
    Simulates Google Cloud APIs (Compute Engine, Cloud Storage, Persistent Disks,
    Cloud Monitoring, Cloud Billing, Google Cloud Status) and normalizes output
    into the CloudLens common schema.

    ========================================================================================
    PRODUCTION SDK INTEGRATION NOTES (Replacing Mock with google-cloud SDKs):
    To switch to live GCP infrastructure, replace the methods below with:
      - from google.cloud import compute_v1
      - from google.cloud import storage
      - from google.cloud import monitoring_v3
      - from google.cloud import billing_v1
      
      Compute: compute_v1.InstancesClient().aggregated_list(project=project_id)
      Storage: storage.Client().list_buckets() + bucket.get_iam_policy()
      Network: monitoring_v3.MetricServiceClient().list_time_series(
                  name=f"projects/{project_id}",
                  filter='metric.type="compute.googleapis.com/instance/network/received_bytes_count"'
               )
      Cost: billing_v1.CloudBillingClient() / BigQuery Billing Export queries
      Health: Fetch https://status.cloud.google.com/incidents.json
    Authentication handled via Google Application Default Credentials (ADC) or GOOGLE_APPLICATION_CREDENTIALS.
    ========================================================================================
    """

    @property
    def provider_id(self) -> str:
        return "gcp"

    def get_compute(self) -> List[ComputeInstance]:
        """
        Mock implementation of GCP Compute Engine API.
        
        Real SDK equivalent:
          client = compute_v1.InstancesClient()
          request = compute_v1.AggregatedListInstancesRequest(project=project_id)
          for zone, response in client.aggregated_list(request=request):
              for instance in response.instances: ...
        """
        instance_defs = [
            ("gcp-vm-inference-serving-01", "gcp-prod-ml-inference-01", "us-central1-a", "n2-standard-8", "running", 77.4, 82.0, "2026-08-18T09:00:00Z", {"env": "prod", "workload": "llm-serving"}),
            ("gcp-vm-inference-serving-02", "gcp-prod-ml-inference-02", "us-central1-a", "n2-standard-8", "running", 74.0, 79.5, "2026-08-18T09:02:00Z", {"env": "prod", "workload": "llm-serving"}),
            ("gcp-gke-core-worker-01", "gcp-gke-prod-node-01", "europe-west1-b", "e2-standard-4", "running", 64.8, 71.3, "2026-09-05T12:00:00Z", {"env": "prod", "cluster": "gke-eu-prod"}),
            ("gcp-gke-core-worker-02", "gcp-gke-prod-node-02", "europe-west1-b", "e2-standard-4", "running", 61.2, 69.0, "2026-09-05T12:02:00Z", {"env": "prod", "cluster": "gke-eu-prod"}),
            ("gcp-bigquery-etl-batch", "gcp-dataflow-runner-01", "us-central1-c", "c2-standard-8", "running", 86.5, 89.2, "2026-09-22T03:30:00Z", {"env": "analytics", "pipeline": "nightly-etl"}),
            ("gcp-dev-microservice-01", "gcp-dev-auth-test-vm", "asia-east1-a", "e2-medium", "running", 18.5, 36.2, "2026-09-15T07:45:00Z", {"env": "dev", "team": "security"}),
            ("gcp-research-tpu-host", "gcp-tpu-v4-orchestrator", "us-central1-a", "n1-highmem-16", "stopped", 0.0, 0.0, "2026-09-25T14:10:00Z", {"env": "research", "tpu_attached": "true"}),
        ]

        result = []
        for i_id, name, region, itype, state, base_cpu, base_mem, l_time, tags in instance_defs:
            cpu = base_cpu
            mem = base_mem
            if state == "running":
                cpu = max(5.0, min(99.0, round(base_cpu + random.uniform(-4.0, 4.0), 1)))
                mem = max(10.0, min(98.0, round(base_mem + random.uniform(-2.2, 2.2), 1)))

            result.append(
                ComputeInstance(
                    id=i_id,
                    name=name,
                    provider="gcp",
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
        Mock implementation of Google Cloud Storage & Persistent Disks.
        
        Real SDK equivalent:
          storage_client = storage.Client()
          buckets = list(storage_client.list_buckets())
          disks_client = compute_v1.DisksClient()
        """
        storage_defs = [
            ("gcs-lake-analytics-bucket", "cloudlens-gcp-bigquery-lake", "bucket", "us-central1", 30000.0, 24600.0, "Standard Multi-Regional"),
            ("gcs-user-uploads-bucket", "cloudlens-gcp-static-media", "bucket", "europe-west1", 18000.0, 13900.0, "Standard Regional"),
            ("gcs-coldline-compliance", "cloudlens-gcp-audit-coldline", "bucket", "asia-east1", 50000.0, 41200.0, "Coldline"),
            ("disk-gcp-pd-ssd-prod-db", "gcp-persistent-disk-postgres-ssd", "disk", "us-central1-a", 1500.0, 1180.0, "pd-ssd Extreme"),
            ("disk-gcp-pd-standard-log", "gcp-persistent-disk-syslog-store", "disk", "europe-west1-b", 2500.0, 1850.0, "pd-standard"),
        ]

        result = []
        for s_id, name, stype, region, prov_gb, used_gb, sclass in storage_defs:
            pct = round((used_gb / prov_gb) * 100.0, 1)
            result.append(
                StorageResource(
                    id=s_id,
                    name=name,
                    provider="gcp",
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
        Mock implementation of Google Cloud Monitoring Network Metrics.
        
        Real SDK equivalent:
          client = monitoring_v3.MetricServiceClient()
          # query 'compute.googleapis.com/instance/network/received_bytes_count'
        """
        now = datetime.datetime.utcnow()
        points = []
        base_in = 390.0
        base_out = 630.0

        for i in range(12, -1, -1):
            t = (now - datetime.timedelta(minutes=i * 5)).strftime("%H:%M")
            in_val = round(base_in + random.uniform(-35, 45), 1)
            out_val = round(base_out + random.uniform(-55, 65), 1)
            points.append(NetworkTimeSeriesPoint(timestamp=t, ingress_mbps=in_val, egress_mbps=out_val))

        return NetworkMetrics(
            provider="gcp",
            latency_ms=round(24.8 + random.uniform(-2.5, 3.0), 1),
            packet_loss_percent=round(max(0.0, random.uniform(0.008, 0.035)), 3),
            time_series=points,
        )

    def get_costs(self, days: int = 30) -> Dict[str, Any]:
        """
        Mock implementation of Google Cloud Billing API / BigQuery Billing Export.
        
        Real SDK equivalent:
          client = billing_v1.CloudBillingClient()
          # or query BigQuery `gcp_billing_export_resource_v1_*` table
        """
        now = datetime.datetime.utcnow()
        daily = []
        base_daily = 325.0

        for i in range(days - 1, -1, -1):
            d = (now - datetime.timedelta(days=i)).strftime("%Y-%m-%d")
            dt = now - datetime.timedelta(days=i)
            factor = 0.86 if dt.weekday() >= 5 else 1.02
            cost = round((base_daily * factor) + random.uniform(-14.0, 18.0), 2)
            daily.append({"date": d, "cost": cost})

        service_costs = [
            {"service": "Google Compute Engine (GCE)", "cost": 3650.00},
            {"service": "Google Cloud Storage (GCS) & Disks", "cost": 2180.40},
            {"service": "BigQuery & Analytics Engine", "cost": 1650.80},
            {"service": "Google Kubernetes Engine (GKE)", "cost": 1280.00},
            {"service": "Cloud SQL Managed Instances", "cost": 890.20},
            {"service": "Cloud Networking & Interconnect", "cost": 410.50},
        ]
        total = sum(item["cost"] for item in service_costs)
        for item in service_costs:
            item["percentage"] = round((item["cost"] / total) * 100.0, 1)

        return {
            "provider": "gcp",
            "daily": daily,
            "services": service_costs,
            "monthly_total": total,
        }

    def get_service_health(self) -> List[ServiceHealth]:
        """
        Mock implementation of Google Cloud Status API.
        
        Real SDK equivalent:
          requests.get('https://status.cloud.google.com/incidents.json')
        """
        return [
            ServiceHealth(
                service_name="Google Compute Engine (GCE)",
                provider="gcp",
                category="Compute",
                status="up",
                latency_ms=24.5,
                uptime_percent=99.99,
                message="Hypervisor fleet operational.",
            ),
            ServiceHealth(
                service_name="Google Cloud Storage (GCS)",
                provider="gcp",
                category="Storage",
                status="up",
                latency_ms=18.0,
                uptime_percent=100.0,
                message="Global object storage healthy.",
            ),
            ServiceHealth(
                service_name="Google Kubernetes Engine (GKE)",
                provider="gcp",
                category="Compute",
                status="up",
                latency_ms=29.2,
                uptime_percent=99.97,
                message="Regional control planes responsive.",
            ),
            ServiceHealth(
                service_name="Google BigQuery",
                provider="gcp",
                category="Database",
                status="up",
                latency_ms=34.0,
                uptime_percent=99.98,
                message="Slot allocation and query pipeline operational.",
            ),
            ServiceHealth(
                service_name="Cloud SQL",
                provider="gcp",
                category="Database",
                status="up",
                latency_ms=27.5,
                uptime_percent=99.95,
                message="HA replicas synchronizing normally.",
            ),
            ServiceHealth(
                service_name="Google Cloud VPC & Cloud CDN",
                provider="gcp",
                category="Networking",
                status="up",
                latency_ms=11.5,
                uptime_percent=100.0,
                message="Edge PoPs and Andromeda SDN fully available.",
            ),
        ]
