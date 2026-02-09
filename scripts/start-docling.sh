#!/bin/bash
set -e

# Navigate to project root
cd "$(dirname "$0")/.."

DOCLING_DIR="docling-service"
VENV_DIR="$DOCLING_DIR/.venv"

echo "Checking Docling service setup..."

# Check if venv exists
if [ ! -d "$VENV_DIR" ]; then
    echo "Creating virtual environment in $VENV_DIR..."
    python3 -m venv "$VENV_DIR"
    
    echo "Installing dependencies..."
    source "$VENV_DIR/bin/activate"
    pip install --upgrade pip
    pip install -r "$DOCLING_DIR/requirements.txt"
else
    echo "Virtual environment found."
    source "$VENV_DIR/bin/activate"
fi

echo "Starting Docling server (Production Match)..."
# Run the root docling_server.py using the venv we created
# We don't cd into docling-service, we stay in root
export PYTHONPATH=$PYTHONPATH:$(pwd)
"$VENV_DIR/bin/python3" docling_server.py
