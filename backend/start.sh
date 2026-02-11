#!/bin/bash
# Backend startup script

set -e

echo "Running Alembic migrations..."
alembic upgrade head

echo "Seeding database..."
python seed_data.py

echo "Starting FastAPI backend server..."
uvicorn main:app --reload --host 0.0.0.0 --port 8000
