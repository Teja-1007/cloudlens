@echo off
echo =====================================================================
echo  CloudLens: Unified Multi-Cloud Monitoring & Cost Intelligence Platform
echo =====================================================================
echo.
echo Starting FastAPI Backend on http://localhost:8000 ...
start "CloudLens-Backend" cmd /k "cd backend && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

echo Starting Vite React Frontend on http://localhost:5173 ...
start "CloudLens-Frontend" cmd /k "cd frontend && npm.cmd run dev"

echo.
echo =====================================================================
echo  Both services launched successfully!
echo   * Dashboard:    http://localhost:5173
echo   * API & Docs:   http://localhost:8000/docs
echo   * Backend Ping: http://localhost:8000/api/ping
echo =====================================================================
