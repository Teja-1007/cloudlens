import asyncio
import json
import logging
import datetime
from app.services.aggregator import aggregator
from app.services.alert_engine import alert_engine
from app.database import SessionLocal
from app.models.db_models import MetricSnapshotModel

logger = logging.getLogger("cloudlens.scheduler")

class BackgroundSchedulerService:
    def __init__(self, interval_seconds: int = 30):
        self.interval_seconds = interval_seconds
        self.is_running = False
        self._task: asyncio.Task = None

    async def start(self):
        if self.is_running:
            return
        self.is_running = True
        self._task = asyncio.create_task(self._run_loop())
        logger.info(f"Background metric collection scheduler started (interval: {self.interval_seconds}s)")

    async def stop(self):
        self.is_running = False
        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("Background scheduler stopped.")

    async def _run_loop(self):
        # Run first collection immediately
        await self.collect_and_snapshot()

        while self.is_running:
            try:
                await asyncio.sleep(self.interval_seconds)
                if not self.is_running:
                    break
                await self.collect_and_snapshot()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error during scheduled metric collection: {e}", exc_info=True)

    async def collect_and_snapshot(self):
        """Pulls live metrics across all providers, runs alert rules, and stores history."""
        db = SessionLocal()
        try:
            overview_kpis = aggregator.get_overview()
            alert_engine.evaluate_rules(db)

            # Store snapshot in SQLite
            snapshot = MetricSnapshotModel(
                timestamp=datetime.datetime.utcnow(),
                provider="all",
                metric_type="overview",
                payload_json=overview_kpis.model_dump_json(),
            )
            db.add(snapshot)
            db.commit()
            logger.info(f"Metric snapshot recorded at {datetime.datetime.utcnow().isoformat()} - Total Spend: ${overview_kpis.total_monthly_cost:,.2f}")
        except Exception as ex:
            logger.error(f"Failed to record metric snapshot: {ex}")
            db.rollback()
        finally:
            db.close()

scheduler_service = BackgroundSchedulerService(interval_seconds=30)
