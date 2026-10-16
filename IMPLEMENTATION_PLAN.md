# Implementation Plan - CloudLens: Unified Multi-Cloud Monitoring & Cost Intelligence Platform

## 1. Project Overview & Architecture
CloudLens is a unified multi-cloud monitoring and cost intelligence platform aggregating metrics, costs, and health from AWS, Azure, and GCP into a single pane of glass.
Architecture:
`Frontend (React + Vite + Tailwind + Recharts) -> REST API (FastAPI) -> Aggregator Service -> Provider Adapters (AWS/Azure/GCP) -> SQLite (SQLAlchemy + APScheduler)`

## 2. Implementation Tasks
1. **Repository Setup & Base Configs**:
   - Initialize `/backend` structure and `/frontend` structure
   - Create `.gitignore`, `docker-compose.yml`, backend Dockerfile, frontend Dockerfile
2. **Backend Engine**:
   - `app/adapters/base.py`: Abstract base class `CloudProviderAdapter` with typed schemas
   - `app/adapters/aws.py`, `azure.py`, `gcp.py`: Mock adapters using authentic cloud provider terminology (EC2/S3/CloudWatch, Azure VMs/Blob/Monitor, Compute Engine/GCS/Cloud Monitoring) + comments for real SDK replacement (boto3, azure-mgmt, google-cloud)
   - `app/database.py` & `app/models/db_models.py`: SQLAlchemy SQLite persistence for historical snapshots, alerts, budgets, and simulated incidents
   - `app/services/aggregator.py`: Merge adapter outputs, apply provider filtering, compute KPI summaries
   - `app/services/alert_engine.py`: Rules engine for CPU > 90%, Storage > 85%, Budget 80%/100%, Service Degraded/Down, Latency spikes
   - `app/services/scheduler.py`: APScheduler 30-second background metric collection and alerting
   - `app/routes/`: REST API endpoints (`/api/overview`, `/api/compute`, `/api/storage`, `/api/network`, `/api/costs`, `/api/health`, `/api/alerts`, `/api/budget`, `/api/simulate-incident`)
   - Seed database on initial startup
3. **Automated Testing**:
   - Pytest suites: `test_adapters.py`, `test_aggregator.py`, `test_alert_rules.py`, `test_endpoints.py`
   - Run tests and verify 100% pass rate
4. **Frontend Dashboard**:
   - Vite + React + Tailwind CSS + Lucide Icons + Recharts + React Router
   - Provider theme colors: AWS Orange (#FF9900), Azure Blue (#0089D6), GCP Green (#34A853)
   - Shared Layout: Left sidebar (Overview, Compute, Storage, Network, Costs, Health, Alerts) + Topbar (Provider filter All/AWS/Azure/GCP, Dark/Light mode toggle, Last refreshed time, 30s auto-refresh ticker)
   - Overview Page: KPI cards, Donut chart, 30-day cost trend, Live alerts feed, Simulate Incident button
   - Compute Page: Search & Sort table, CPU/Memory bars, state badges, avg CPU chart
   - Storage Page: Stacked bar chart (used vs provisioned), resource table with progress bars
   - Network Page: Ingress/Egress area chart, Latency line chart, Packet loss badges
   - Costs Page: Daily/Monthly toggle, Per-service breakdown chart, Budget progress bars with inline edit, Budget warning/critical alerts
   - Health Page: Service cards grid (Up/Degraded/Down), Incident timeline
   - Alerts Page: Filter by severity, Acknowledge button, status indicators
5. **Execution & Automation Scripts**:
   - `run.bat` for Windows and `run.sh` for Unix/Linux
   - Start backend on port 8000 and frontend on port 5173
6. **Browser Verification & Screenshots**:
   - Launch browser subagent to test all 7 pages, click "Simulate Incident", confirm real-time alert triggers and UI state updates
   - Capture high-resolution screenshots for `/docs/screenshots/`
7. **Documentation**:
   - Complete `README.md` with Mermaid diagram, SDK swap guide, API table, run instructions, assumptions, and future enhancements
