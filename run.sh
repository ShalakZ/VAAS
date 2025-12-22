#!/bin/bash
#
# VAAS Run Script
# Quickly start the VAAS application
#

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Check if setup has been run
if [ ! -d "venv" ]; then
    echo -e "${RED}Error:${NC} Virtual environment not found."
    echo -e "Please run ${BLUE}./setup.sh${NC} first."
    exit 1
fi

if [ ! -d "vaas/web/static/dist" ]; then
    echo -e "${RED}Error:${NC} Frontend not built."
    echo -e "Please run ${BLUE}./setup.sh${NC} first."
    exit 1
fi

# Parse arguments
DEV_MODE=false
PORT=${VAAS_PORT:-5001}

while [[ $# -gt 0 ]]; do
    case $1 in
        --dev)
            DEV_MODE=true
            shift
            ;;
        --port)
            PORT="$2"
            shift 2
            ;;
        -h|--help)
            echo "VAAS Run Script"
            echo ""
            echo "Usage: ./run.sh [options]"
            echo ""
            echo "Options:"
            echo "  --dev       Run in development mode (Flask debug + Vite HMR)"
            echo "  --port N    Use custom port (default: 5001)"
            echo "  -h, --help  Show this help message"
            echo ""
            echo "Examples:"
            echo "  ./run.sh              # Production mode on port 5001"
            echo "  ./run.sh --dev        # Development mode with hot reload"
            echo "  ./run.sh --port 8080  # Custom port"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Activate virtual environment
source venv/bin/activate

if [ "$DEV_MODE" = true ]; then
    echo -e "${BLUE}Starting VAAS in development mode...${NC}"
    echo ""
    echo -e "Backend:  ${GREEN}http://localhost:$PORT${NC}"
    echo -e "Frontend: ${GREEN}http://localhost:5173${NC} (with hot reload)"
    echo ""
    echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
    echo ""

    # Start Flask in background
    FLASK_DEBUG=1 VAAS_PORT=$PORT python3 -m vaas.main &
    FLASK_PID=$!

    # Start Vite dev server (pass backend port for proxy)
    cd frontend
    VITE_BACKEND_PORT=$PORT npm run dev &
    VITE_PID=$!
    cd ..

    # Wait for Ctrl+C
    trap "kill $FLASK_PID $VITE_PID 2>/dev/null; exit" SIGINT SIGTERM
    wait
else
    echo -e "${BLUE}"
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║          VAAS - Starting Server                           ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo -e "URL: ${GREEN}http://localhost:$PORT${NC}"
    echo -e "Default login: ${YELLOW}admin${NC} / ${YELLOW}admin${NC}"
    echo ""
    echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
    echo ""

    VAAS_PORT=$PORT python3 -m vaas.main
fi
