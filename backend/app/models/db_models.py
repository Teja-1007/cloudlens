import datetime
from sqlalchemy import Column, String, Float, Boolean, DateTime, Integer, Text
from app.database import Base

class MetricSnapshotModel(Base):
    __tablename__ = "metric_snapshots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    provider = Column(String(50), index=True)  # "aws", "azure", "gcp", "all"
    metric_type = Column(String(50), index=True)  # "overview", "compute", "storage", "network", "costs", "health"
    payload_json = Column(Text, nullable=False)

class AlertModel(Base):
    __tablename__ = "alerts"

    id = Column(String(100), primary_key=True)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    severity = Column(String(20), nullable=False, index=True)  # "critical", "warning", "info"
    provider = Column(String(50), nullable=True, index=True)
    service = Column(String(100), nullable=True)
    metric_value = Column(Float, nullable=True)
    threshold = Column(Float, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    acknowledged = Column(Boolean, default=False, index=True)

class BudgetModel(Base):
    __tablename__ = "budgets"

    provider = Column(String(50), primary_key=True)  # "aws", "azure", "gcp", "total"
    monthly_budget = Column(Float, nullable=False, default=10000.0)
    currency = Column(String(10), default="USD")
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class IncidentModel(Base):
    __tablename__ = "incidents"

    id = Column(String(100), primary_key=True)
    active = Column(Boolean, default=True)
    provider = Column(String(50), nullable=False)
    service = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    cost_multiplier = Column(Float, default=1.5)
    cpu_spike = Column(Boolean, default=True)
    triggered_at = Column(DateTime, default=datetime.datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
