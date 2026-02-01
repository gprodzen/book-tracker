#!/bin/bash
#
# Book Tracker - Development Server
#
# Quick start script that sets up Python environment and runs Flask server.
# Usage: ./dev.sh
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📚 Book Tracker - Development Server${NC}"
echo ""

# Check if Python 3 is available
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: Python 3 is required but not installed.${NC}"
    exit 1
fi

# Navigate to project root (where this script is located)
cd "$(dirname "$0")"

# Set up virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}Creating virtual environment...${NC}"
    python3 -m venv venv
    echo -e "${GREEN}✓ Virtual environment created${NC}"
fi

# Activate virtual environment
echo -e "${YELLOW}Activating virtual environment...${NC}"
source venv/bin/activate
echo -e "${GREEN}✓ Virtual environment activated${NC}"

# Install/update dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
pip install -q -r backend/requirements.txt
echo -e "${GREEN}✓ Dependencies installed${NC}"

echo ""
echo -e "${GREEN}Starting development server...${NC}"
echo -e "${BLUE}→ Frontend: http://localhost:5001${NC}"
echo -e "${BLUE}→ API: http://localhost:5001/api${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"
echo ""

# Start Flask development server
# The database is automatically initialized by init_database() in app.py
cd backend
FLASK_DEBUG=1 python -m flask run --port 5001
