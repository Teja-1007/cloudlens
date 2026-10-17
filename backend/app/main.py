import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db, SessionLocal
from app.models.db_models import BudgetModel
from app.services.scheduler import scheduler_service
from app.routes import (
    overview,
    compute,
    storage,
    network,
    costs,
    health,
    alerts,
    budget,
    incident,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("cloudlens.main")

def seed_database():
    """Seed initial database tables if not already present."""
    init_db()
    db = SessionLocal()
    try:
        # Seed provider budgets if not present
        existing_budgets = db.query(BudgetModel).count()
        if existing_budgets == 0:
            defaults = [
                BudgetModel(provider="aws", monthly_budget=13500.0, currency="USD"),
                BudgetModel(provider="azure", monthly_budget=11500.0, currency="USD"),
                BudgetModel(provider="gcp", monthly_budget=10500.0, currency="USD"),
                BudgetModel(provider="total", monthly_budget=35500.0, currency="USD"),
            ]
            db.bulk_save_objects(defaults)
            db.commit()
            logger.info("Database initialized and default budgets seeded successfully.")
    except Exception as e:
        logger.error(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup:
    logger.info("Initializing CloudLens database and background jobs...")
    seed_database()
    await scheduler_service.start()
    yield
    # Shutdown:
    logger.info("Stopping background scheduler...")
    await scheduler_service.stop()

app = FastAPI(
    title="CloudLens API",
    description="Unified Multi-Cloud Monitoring & Cost Intelligence Platform for AWS, Azure, and GCP",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for frontend Vite development server and production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register route modules
app.include_router(overview.router)
app.include_router(compute.router)
app.include_router(storage.router)
app.include_router(network.router)
app.include_router(costs.router)
app.include_router(health.router)
app.include_router(alerts.router)
app.include_router(budget.router)
app.include_router(incident.router)

@app.get("/")
def root():
    return {
        "platform": "CloudLens: Unified Multi-Cloud Monitoring & Cost Intelligence Platform",
        "status": "online",
        "supported_clouds": ["AWS", "Azure", "GCP"],
        "docs_url": "/docs",
    }

@app.get("/api/ping")
def ping():
    return {"status": "ok", "service": "cloudlens-backend"}

if __name__ == "__main__":
    import os
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=False)
