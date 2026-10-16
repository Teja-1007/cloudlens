from fastapi import APIRouter, Query
from typing import Optional, List
from app.services.aggregator import aggregator
from app.models.schemas import ComputeInstance

router = APIRouter(prefix="/api/compute", tags=["Compute"])

@router.get("", response_model=List[ComputeInstance])
def get_compute(provider: Optional[str] = Query(None, description="Filter by provider: aws, azure, or gcp")):
    """
    Returns compute resources across AWS (EC2), Azure (Virtual Machines), and GCP (Compute Engine).
    Standardized attributes: id, name, provider, region, type, state, cpu_percent, memory_percent.
    """
    return aggregator.get_compute(provider=provider)
