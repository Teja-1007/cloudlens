from fastapi import APIRouter, Query
from typing import Optional, Dict, Any
from app.services.aggregator import aggregator

router = APIRouter(prefix="/api/network", tags=["Network"])

@router.get("", response_model=Dict[str, Any])
def get_network(provider: Optional[str] = Query(None, description="Filter by provider: aws, azure, or gcp")):
    """
    Returns network throughput time series (ingress/egress Mbps), round-trip latency,
    and packet loss across cloud environments.
    """
    return aggregator.get_network(provider=provider)
