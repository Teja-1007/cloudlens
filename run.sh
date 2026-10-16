#!/usr/bin/env bash
set -e

echo "====================================================================="
echo " CloudLens: Unified Multi-Cloud Monitoring & Cost Intelligence Platform"
echo "====================================================================="

# Start backend
echo "Starting Backend on http://localhost:8000..."
(cd backend && python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload) &
BACKEND_PID=$!

# Start frontend
echo "Starting Frontend on http://localhost:5173..."
(cd frontend && npm run dev) &
FRONTEND_PID=$!

echo "====================================================================="
echo " Both services running in background!"
echo "  * Frontend UI: http://localhost:5173"
echo "  * Backend API: http://localhost:8000/docs"
echo " Press Ctrl+C to stop all services."
echo "====================================================================="

trap "kill $BACKEND_PID $FRONTEND_PID" EXIT
wait
