from fastapi import APIRouter, Query, HTTPException, Depends
from typing import Optional, Dict
from sqlalchemy.orm import Session
from app.services.aggregator import aggregator
from app.services.alert_engine import alert_engine
from app.models.schemas import BudgetUpdateRequest, BudgetConfig
from app.database import get_db

router = APIRouter(prefix="/api/budget", tags=["Budget"])

@router.get("", response_model=Dict[str, BudgetConfig])
def get_budgets(provider: Optional[str] = Query(None, description="Filter by provider: aws, azure, or gcp")):
    """
    Returns monthly budget configurations, current spend, and threshold percentages.
    """
    costs_data = aggregator.get_costs(provider=provider)
    if provider and provider.lower() in costs_data.budget_status:
        return {provider.lower(): costs_data.budget_status[provider.lower()]}
    return costs_data.budget_status

@router.put("", response_model=Dict[str, BudgetConfig])
def update_budget(payload: BudgetUpdateRequest, db: Session = Depends(get_db)):
    """
    Updates the monthly allocated budget for a provider (aws, azure, gcp, or total).
    Immediately re-evaluates budget alert rules.
    """
    p = payload.provider.lower()
    if p not in ["aws", "azure", "gcp", "total"]:
        raise HTTPException(status_code=400, detail="Provider must be 'aws', 'azure', 'gcp', or 'total'.")
    if payload.monthly_budget <= 0:
        raise HTTPException(status_code=400, detail="Budget amount must be greater than zero.")

    aggregator.set_budget(p, payload.monthly_budget)
    alert_engine.evaluate_rules(db=db)

    costs_data = aggregator.get_costs()
    return costs_data.budget_status
