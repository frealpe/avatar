#!/bin/bash

# Setup and Run script for Costurero IA Digital

echo "======================================"
echo "    Setting up Costurero IA Digital   "
echo "======================================"

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Ensure output directory exists
mkdir -p "$SCRIPT_DIR/3d_assets"

# 1. Install Python dependencies
echo "[+] Setting up AI Engine..."
pip install -r "$SCRIPT_DIR/ai_engine/requirements.txt" || { echo "Failed to install Python dependencies"; exit 1; }

# 2. Install Node.js Backend dependencies
echo "[+] Setting up Backend..."
cd "$SCRIPT_DIR/backend"
npm install || { echo "Failed to install Backend dependencies"; exit 1; }
cd "$SCRIPT_DIR"

# 3. Install React Frontend dependencies
echo "[+] Setting up Frontend..."
cd "$SCRIPT_DIR/frontend"
npm install || { echo "Failed to install Frontend dependencies"; exit 1; }
cd "$SCRIPT_DIR"

# 4. Start the servers
echo "[+] Starting Servers..."

# Start backend in the background
cd "$SCRIPT_DIR/backend"
node server.js &
BACKEND_PID=$!
cd "$SCRIPT_DIR"

# Start frontend
cd "$SCRIPT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!
cd "$SCRIPT_DIR"

echo "======================================"
echo " Costurero IA is running!             "
echo " Frontend: http://localhost:5173      "
echo " Backend: http://localhost:3000       "
echo " Press Ctrl+C to stop both servers.   "
echo "======================================"

# Handle termination
trap "kill $BACKEND_PID $FRONTEND_PID" SIGINT SIGTERM EXIT
wait
