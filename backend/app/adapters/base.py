from abc import ABC, abstractmethod
from typing import List, Dict, Any
from app.models.schemas import (
    ComputeInstance,
    StorageResource,
    NetworkMetrics,
    ServiceHealth,
)

class CloudProviderAdapter(ABC):
    """
    Abstract Base Class for all Cloud Provider Adapters (AWS, Azure, GCP).
    
    Each adapter handles provider-specific authentication, API calls, and data transformation,
    normalizing proprietary cloud outputs (e.g. AWS EC2, Azure VMs, GCP Compute Engine) into
    the unified CloudLens schema.
    """

    @property
    @abstractmethod
    def provider_id(self) -> str:
        """Unique provider identifier: 'aws', 'azure', or 'gcp'."""
        pass

    @abstractmethod
    def get_compute(self) -> List[ComputeInstance]:
        """
        Fetch compute resources (instances, VMs, virtual machines).
        Returns a list of standardized ComputeInstance objects.
        """
        pass

    @abstractmethod
    def get_storage(self) -> List[StorageResource]:
        """
        Fetch object buckets and block storage volumes.
        Returns a list of standardized StorageResource objects.
        """
        pass

    @abstractmethod
    def get_network(self) -> NetworkMetrics:
        """
        Fetch network performance metrics (ingress/egress throughput, latency, packet loss).
        Returns standardized NetworkMetrics.
        """
        pass

    @abstractmethod
    def get_costs(self, days: int = 30) -> Dict[str, Any]:
        """
        Fetch cost and billing data for the past N days, including per-service breakdown.
        Returns a dictionary with daily costs, service breakdown, and monthly total.
        """
        pass

    @abstractmethod
    def get_service_health(self) -> List[ServiceHealth]:
        """
        Fetch service availability and health status for core cloud services.
        Returns a list of standardized ServiceHealth records.
        """
        pass
