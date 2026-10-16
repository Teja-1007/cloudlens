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

class AwsAdapter(CloudProviderAdapter):
    """
    AWS Cloud Provider Adapter.
    Simulates AWS APIs (EC2, S3, EBS, CloudWatch, Cost Explorer, AWS Health Dashboard)
    and normalizes output into the CloudLens common schema.

    ========================================================================================
    PRODUCTION SDK INTEGRATION NOTES (Replacing Mock with boto3):
    To switch to live AWS infrastructure, replace the methods below with:
      - import boto3
      - Compute: ec2 = boto3.client('ec2') -> ec2.describe_instances()
      - Storage: s3 = boto3.client('s3') -> s3.list_buckets() + cloudwatch metric 'BucketSizeBytes'
                 ec2.describe_volumes() for EBS
      - Network: cw = boto3.client('cloudwatch') -> cw.get_metric_data(Namespace='AWS/EC2'...)
      - Cost: ce = boto3.client('ce') -> ce.get_cost_and_usage(TimePeriod=..., Granularity='DAILY')
      - Health: health = boto3.client('health') -> health.describe_events(...)
    All authentication can be managed via AWS IAM roles, AWS_PROFILE, or AWS_ACCESS_KEY_ID env vars.
    ========================================================================================
    """

    @property
    def provider_id(self) -> str:
        return "aws"

    def get_compute(self) -> List[ComputeInstance]:
        """
        Mock implementation of AWS EC2 DescribeInstances API.
        
        Real SDK equivalent:
          ec2 = boto3.client('ec2', region_name='us-east-1')
          response = ec2.describe_instances()
          # Parse Reservations[*].Instances[*]
        """
        instances_def = [
            ("i-0a8b7c6d5e4f3001", "aws-prod-api-cluster-01", "us-east-1", "m6i.2xlarge", "running", 68.4, 74.2, "2026-08-10T04:12:00Z", {"Environment": "Production", "Service": "CoreAPI"}),
            ("i-0a8b7c6d5e4f3002", "aws-prod-api-cluster-02", "us-east-1", "m6i.2xlarge", "running", 62.1, 71.8, "2026-08-10T04:14:00Z", {"Environment": "Production", "Service": "CoreAPI"}),
            ("i-0c9d8e7f6a5b4003", "aws-data-worker-spot-01", "us-west-2", "c6i.4xlarge", "running", 89.2, 85.5, "2026-09-01T11:30:00Z", {"Environment": "Analytics", "Lifecycle": "spot"}),
            ("i-0d1e2f3a4b5c6004", "aws-data-worker-spot-02", "us-west-2", "c6i.4xlarge", "running", 84.7, 82.0, "2026-09-01T11:32:00Z", {"Environment": "Analytics", "Lifecycle": "spot"}),
            ("i-0e2f3a4b5c6d7005", "aws-redis-cache-primary", "us-east-1", "r6i.xlarge", "running", 42.5, 68.0, "2026-07-15T08:00:00Z", {"Environment": "Production", "Role": "Cache"}),
            ("i-0f3a4b5c6d7e8006", "aws-staging-bastion-host", "eu-west-1", "t3.micro", "running", 14.2, 38.4, "2026-09-12T16:45:00Z", {"Environment": "Staging", "Role": "Bastion"}),
            ("i-0b4c5d6e7f8a9007", "aws-dev-sandbox-ml-01", "us-west-2", "g5.xlarge", "stopped", 0.0, 0.0, "2026-09-20T09:15:00Z", {"Environment": "Development", "Role": "ML-Sandbox"}),
            ("i-0c5d6e7f8a9b0008", "aws-ci-runner-ephemeral", "eu-west-1", "c6i.xlarge", "terminated", 0.0, 0.0, "2026-09-27T22:00:00Z", {"Environment": "CI/CD", "Ephemeral": "true"}),
        ]

        result = []
        for i_id, name, region, itype, state, base_cpu, base_mem, l_time, tags in instances_def:
            # Add minor organic jitter if running
            cpu = base_cpu
            mem = base_mem
            if state == "running":
                cpu = max(5.0, min(99.0, round(base_cpu + random.uniform(-4.0, 4.0), 1)))
                mem = max(10.0, min(98.0, round(base_mem + random.uniform(-2.5, 2.5), 1)))

            result.append(
                ComputeInstance(
                    id=i_id,
                    name=name,
                    provider="aws",
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
        Mock implementation of AWS S3 and EBS APIs.
        
        Real SDK equivalent:
          s3 = boto3.client('s3')
          buckets = s3.list_buckets()
          # Query AWS/S3 CloudWatch metric BucketSizeBytes for each bucket
          ec2 = boto3.client('ec2')
          volumes = ec2.describe_volumes()
        """
        storage_def = [
            ("s3-prod-assets-us-east-1", "cloudlens-prod-static-assets", "bucket", "us-east-1", 12000.0, 8940.0, "S3 Standard"),
            ("s3-data-lake-raw-parquet", "cloudlens-datalake-raw-parquet", "bucket", "us-west-2", 45000.0, 37200.0, "S3 Intelligent-Tiering"),
            ("s3-compliance-glacier-archive", "cloudlens-cold-archive-glacier", "bucket", "eu-west-1", 80000.0, 62100.0, "S3 Glacier Flexible"),
            ("vol-0a1b2c3d4e5f6001", "ebs-prod-db-data-primary", "disk", "us-east-1", 2000.0, 1640.0, "EBS gp3 SSD"),
            ("vol-0b2c3d4e5f6a7002", "ebs-analytics-temp-fast", "disk", "us-west-2", 1500.0, 1320.0, "EBS io2 Block Express"),
            ("vol-0c3d4e5f6a7b8003", "ebs-staging-app-storage", "disk", "eu-west-1", 500.0, 210.0, "EBS gp3 SSD"),
        ]

        result = []
        for s_id, name, stype, region, prov_gb, used_gb, sclass in storage_def:
            pct = round((used_gb / prov_gb) * 100.0, 1)
            result.append(
                StorageResource(
                    id=s_id,
                    name=name,
                    provider="aws",
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
        Mock implementation of AWS CloudWatch Network Metrics.
        
        Real SDK equivalent:
          cw = boto3.client('cloudwatch')
          cw.get_metric_data(
              MetricDataQueries=[
                  {'Id': 'm1', 'MetricStat': {'Metric': {'Namespace': 'AWS/EC2', 'MetricName': 'NetworkIn'}, ...}},
                  {'Id': 'm2', 'MetricStat': {'Metric': {'Namespace': 'AWS/EC2', 'MetricName': 'NetworkOut'}, ...}}
              ],
              StartTime=..., EndTime=..., Period=300
          )
        """
        now = datetime.datetime.utcnow()
        points = []
        base_in = 420.0
        base_out = 680.0

        for i in range(12, -1, -1):
            t = (now - datetime.timedelta(minutes=i * 5)).strftime("%H:%M")
            in_val = round(base_in + random.uniform(-40, 50), 1)
            out_val = round(base_out + random.uniform(-60, 70), 1)
            points.append(NetworkTimeSeriesPoint(timestamp=t, ingress_mbps=in_val, egress_mbps=out_val))

        return NetworkMetrics(
            provider="aws",
            latency_ms=round(28.4 + random.uniform(-3.0, 4.0), 1),
            packet_loss_percent=round(max(0.0, random.uniform(0.01, 0.05)), 3),
            time_series=points,
        )

    def get_costs(self, days: int = 30) -> Dict[str, Any]:
        """
        Mock implementation of AWS Cost Explorer API.
        
        Real SDK equivalent:
          ce = boto3.client('ce')
          response = ce.get_cost_and_usage(
              TimePeriod={'Start': '2026-08-28', 'End': '2026-09-28'},
              Granularity='DAILY',
              Metrics=['UnblendedCost'],
              GroupBy=[{'Type': 'DIMENSION', 'Key': 'SERVICE'}]
          )
        """
        now = datetime.datetime.utcnow()
        daily = []
        base_daily = 412.5

        for i in range(days - 1, -1, -1):
            d = (now - datetime.timedelta(days=i)).strftime("%Y-%m-%d")
            # Weekend variation
            dt = now - datetime.timedelta(days=i)
            factor = 0.85 if dt.weekday() >= 5 else 1.02
            cost = round((base_daily * factor) + random.uniform(-18.0, 22.0), 2)
            daily.append({"date": d, "cost": cost})

        service_costs = [
            {"service": "Amazon Elastic Compute Cloud (EC2)", "cost": 4850.20},
            {"service": "Amazon Simple Storage Service (S3)", "cost": 2940.50},
            {"service": "Amazon Relational Database Service (RDS)", "cost": 2210.00},
            {"service": "AWS Lambda & Serverless Compute", "cost": 840.10},
            {"service": "Amazon CloudFront & Data Transfer", "cost": 690.40},
            {"service": "Amazon DynamoDB", "cost": 520.00},
        ]
        total = sum(item["cost"] for item in service_costs)
        for item in service_costs:
            item["percentage"] = round((item["cost"] / total) * 100.0, 1)

        return {
            "provider": "aws",
            "daily": daily,
            "services": service_costs,
            "monthly_total": total,
        }

    def get_service_health(self) -> List[ServiceHealth]:
        """
        Mock implementation of AWS Health Dashboard API.
        
        Real SDK equivalent:
          health = boto3.client('health', region_name='us-east-1')
          health.describe_events(...)
        """
        return [
            ServiceHealth(
                service_name="Amazon Elastic Compute Cloud (EC2)",
                provider="aws",
                category="Compute",
                status="up",
                latency_ms=28.2,
                uptime_percent=99.98,
                message="Operating normally in all regions.",
            ),
            ServiceHealth(
                service_name="Amazon Simple Storage Service (S3)",
                provider="aws",
                category="Storage",
                status="up",
                latency_ms=19.5,
                uptime_percent=99.99,
                message="All storage endpoints operational.",
            ),
            ServiceHealth(
                service_name="Amazon Relational Database Service (RDS)",
                provider="aws",
                category="Database",
                status="up",
                latency_ms=31.0,
                uptime_percent=99.95,
                message="Multi-AZ clusters healthy.",
            ),
            ServiceHealth(
                service_name="AWS Lambda",
                provider="aws",
                category="Compute",
                status="up",
                latency_ms=22.4,
                uptime_percent=99.99,
                message="Execution environments available.",
            ),
            ServiceHealth(
                service_name="Amazon DynamoDB",
                provider="aws",
                category="Database",
                status="up",
                latency_ms=9.8,
                uptime_percent=100.0,
                message="Sub-10ms response times globally.",
            ),
            ServiceHealth(
                service_name="Amazon Virtual Private Cloud (VPC)",
                provider="aws",
                category="Networking",
                status="up",
                latency_ms=12.1,
                uptime_percent=100.0,
                message="Transit Gateways and DirectConnect normal.",
            ),
        ]
