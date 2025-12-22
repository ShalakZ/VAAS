#!/bin/bash
#
# VAAS Setup Script
# Automates initial setup for fresh clones
#

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║          VAAS - Setup Script                              ║"
echo "║          Vulnerability Assessment Automation System       ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Get script directory (works even if called from different location)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${YELLOW}[1/5]${NC} Checking prerequisites..."

# Check Python (try python3 first, then python)
if command -v python3 &> /dev/null; then
    PYTHON_CMD=python3
elif command -v python &> /dev/null; then
    PYTHON_CMD=python
else
    echo -e "  ${RED}✗${NC} Python not found. Please install Python 3.10+"
    exit 1
fi
PYTHON_VERSION=$($PYTHON_CMD --version 2>&1 | cut -d' ' -f2)
echo -e "  ${GREEN}✓${NC} Python $PYTHON_VERSION found"

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "  ${GREEN}✓${NC} Node.js $NODE_VERSION found"
else
    echo -e "  ${RED}✗${NC} Node.js not found. Please install Node.js 18+"
    exit 1
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "  ${GREEN}✓${NC} npm $NPM_VERSION found"
else
    echo -e "  ${RED}✗${NC} npm not found"
    exit 1
fi

echo -e "${YELLOW}[2/5]${NC} Setting up Python virtual environment..."

if [ -d "venv" ]; then
    echo -e "  ${BLUE}→${NC} Virtual environment already exists"
else
    $PYTHON_CMD -m venv venv
    echo -e "  ${GREEN}✓${NC} Created virtual environment"
fi

# Activate venv and install dependencies (handle Windows vs Linux)
if [ -f "venv/Scripts/activate" ]; then
    source venv/Scripts/activate
    VENV_PYTHON="venv/Scripts/python"
else
    source venv/bin/activate
    VENV_PYTHON="venv/bin/python3"
fi
echo -e "  ${BLUE}→${NC} Installing Python dependencies..."
pip install --upgrade pip -q
pip install -r requirements.txt -q
echo -e "  ${GREEN}✓${NC} Python dependencies installed"

echo -e "${YELLOW}[3/5]${NC} Setting up configuration files..."

# Create config files from examples if they don't exist
if [ ! -f "data/database_settings.json" ]; then
    # Use Python to create config with correct absolute path
    $VENV_PYTHON << 'PYEOF'
import json
import os

# Get paths relative to current working directory (works on both Windows and Linux)
script_dir = os.getcwd()
example_file = os.path.join(script_dir, "data", "database_settings.json.example")
output_file = os.path.join(script_dir, "data", "database_settings.json")

with open(example_file, 'r') as f:
    config = json.load(f)

# Set absolute path for SQLite file (use forward slashes for cross-platform compatibility)
sqlite_path = os.path.join(script_dir, "data", "knowledge_base.db")
config['SQLITE_FILE'] = sqlite_path.replace('\\', '/')

with open(output_file, 'w') as f:
    json.dump(config, f, indent=2)

print("  Created with SQLITE_FILE:", config['SQLITE_FILE'])
PYEOF
    echo -e "  ${GREEN}✓${NC} Created data/database_settings.json"
else
    echo -e "  ${BLUE}→${NC} data/database_settings.json already exists"
fi

if [ ! -f "data/ldap_settings.json" ]; then
    cp data/ldap_settings.json.example data/ldap_settings.json
    echo -e "  ${GREEN}✓${NC} Created data/ldap_settings.json"
else
    echo -e "  ${BLUE}→${NC} data/ldap_settings.json already exists"
fi

if [ ! -f ".env" ]; then
    cp .env.example .env
    echo -e "  ${GREEN}✓${NC} Created .env from template"
else
    echo -e "  ${BLUE}→${NC} .env already exists"
fi

echo -e "${YELLOW}[4/5]${NC} Setting up frontend..."

cd frontend
if [ -d "node_modules" ]; then
    echo -e "  ${BLUE}→${NC} node_modules exists, skipping npm install"
else
    echo -e "  ${BLUE}→${NC} Installing npm dependencies..."
    npm install --silent
    echo -e "  ${GREEN}✓${NC} npm dependencies installed"
fi

echo -e "  ${BLUE}→${NC} Building frontend for production..."
npm run build --silent
echo -e "  ${GREEN}✓${NC} Frontend built successfully"
cd ..

echo -e "${YELLOW}[5/5]${NC} Verifying setup..."

# Quick check that the app can import without errors
if $VENV_PYTHON -c "from vaas.main import create_app; app = create_app()" 2>/dev/null; then
    echo -e "  ${GREEN}✓${NC} Application verified"
else
    echo -e "  ${YELLOW}!${NC} Could not verify app (this is okay for first run)"
fi

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          Setup Complete!                                  ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "To start VAAS, run:"
echo -e "  ${BLUE}./run.sh${NC}"
echo ""
echo -e "Or manually:"
echo -e "  ${BLUE}source venv/bin/activate${NC}"
echo -e "  ${BLUE}python3 -m vaas.main${NC}"
echo ""
echo -e "Then open: ${BLUE}http://localhost:8085${NC}"
echo -e "Default login: ${YELLOW}admin${NC} / ${YELLOW}admin${NC}"
echo ""
