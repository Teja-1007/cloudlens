from fastapi import APIRouter, Query
from typing import Optional
from app.services.aggregator import aggregator
from app.models.schemas import CostResponse

router = APIRouter(prefix="/api/costs", tags=["Costs"])

@router.get("", response_model=CostResponse)
def get_costs(
    provider: Optional[str] = Query(None, description="Filter by provider: aws, azure, or gcp"),
    days: int = Query(30, ge=7, le=90, description="Number of days of cost history")
):
    """
    Returns unified multi-cloud billing and cost intelligence:
    - 30-day daily spend time series per provider
    - Service cost breakdown (compute, storage, database, etc.)
    - Monthly total spend vs previous period
    - Budget utilization and threshold status
    """
    return aggregator.get_costs(provider=provider, days=days)
