#!/usr/bin/env bash
# Start the Lake Management System (Django API + React dev server).
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "▶ Starting Django backend on http://localhost:8000 ..."
source "$ROOT/venv/bin/activate"
(cd "$ROOT/backend" && python manage.py runserver 8000) &
BACK_PID=$!

echo "▶ Starting React frontend on http://localhost:3000 ..."
(cd "$ROOT/frontend" && npm start) &
FRONT_PID=$!

trap "echo; echo 'Stopping…'; kill $BACK_PID $FRONT_PID 2>/dev/null" EXIT
wait
