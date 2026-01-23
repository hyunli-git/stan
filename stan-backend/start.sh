#!/bin/bash

# Start script for STAN ADK Backend

echo "Starting STAN ADK Backend..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install/update dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Check environment variables
if [ ! -f ".env.local" ]; then
    echo "Warning: .env.local not found. Copy .env.example and configure it."
    cp .env.example .env.local
    echo "Created .env.local from .env.example. Please configure it with your API keys."
    exit 1
fi

# Start the FastAPI server
echo "Starting FastAPI server on http://localhost:8000"
uvicorn main:app --reload --host 0.0.0.0 --port 8000