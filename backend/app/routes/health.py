from fastapi import APIRouter, Query
from typing import Optional, List
from app.services.aggregator import aggregator
from app.models.schemas import ServiceHealth

router = APIRouter(prefix="/api/health", tags=["Health"])

@router.get("", response_model=List[ServiceHealth])
def get_service_health(provider: Optional[str] = Query(None, description="Filter by provider: aws, azure, or gcp")):
    """
    Returns service health and status across AWS, Azure, and GCP.
    Status can be 'up', 'degraded', or 'down'.
    """
    return aggregator.get_health(provider=provider)
