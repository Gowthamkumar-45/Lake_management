#!/bin/bash

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

echo "========================================"
echo "  WBMS — Ramanathapuram Water Bodies"
echo "========================================"

# ---- Backend setup ----
echo ""
echo "[Backend] Setting up Python environment..."
cd "$BACKEND_DIR"

if [ ! -d "venv" ]; then
  python3 -m venv venv
  echo "[Backend] Virtual environment created."
fi

source venv/bin/activate

pip install -q -r requirements.txt

echo "[Backend] Running migrations..."
python manage.py migrate --run-syncdb 2>/dev/null || python manage.py migrate

echo "[Backend] Starting Django development server on http://localhost:8000 ..."
python manage.py runserver 8000 &
BACKEND_PID=$!
echo "[Backend] PID: $BACKEND_PID"

# ---- Frontend setup ----
echo ""
echo "[Frontend] Setting up Node environment..."
cd "$FRONTEND_DIR"

if [ ! -d "node_modules" ]; then
  echo "[Frontend] Installing npm packages (this may take a moment)..."
  npm install
fi

echo "[Frontend] Starting Vite dev server on http://localhost:5173 ..."
npm run dev &
FRONTEND_PID=$!
echo "[Frontend] PID: $FRONTEND_PID"

echo ""
echo "========================================"
echo "  Both servers are running!"
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:8000"
echo "  API:      http://localhost:8000/api/"
echo ""
echo "  Press Ctrl+C to stop both servers."
echo "========================================"

# Cleanup on exit
cleanup() {
  echo ""
  echo "Stopping servers..."
  kill $BACKEND_PID 2>/dev/null || true
  kill $FRONTEND_PID 2>/dev/null || true
  echo "Done."
  exit 0
}
trap cleanup SIGINT SIGTERM

wait
