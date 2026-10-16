from fastapi import APIRouter, Query
from typing import Optional
from app.services.aggregator import aggregator
from app.models.schemas import OverviewKPIs

router = APIRouter(prefix="/api/overview", tags=["Overview"])

@router.get("", response_model=OverviewKPIs)
def get_overview(provider: Optional[str] = Query(None, description="Filter by provider: aws, azure, or gcp")):
    """
    Returns high-level multi-cloud KPIs:
    - Total instances & running instances
    - Total monthly cost & month-over-month trend
    - Storage provisioned vs used and percentage
    - Average round-trip network latency
    - Healthy service percentage
    - Active alerts count
    - Provider instance distribution
    """
    return aggregator.get_overview(provider=provider)
