# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VAAS (Vulnerability Assignment Automation System) is a Flask + React application that automates the assignment of vulnerability assessment findings to IT teams using fuzzy matching and rule-based classification.

## Commands

### Backend (Flask)
```bash
# Setup
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run development server
python -m vaas.main              # Starts on http://0.0.0.0:5001

# Production (systemd service)
sudo systemctl start vaas
sudo systemctl status vaas
sudo journalctl -u vaas -f       # View logs
```

### Frontend (React + Vite)
```bash
cd frontend

# Development (proxies API to Flask at localhost:5001)
npm run dev                      # Starts on http://localhost:5173

# Production build (outputs to vaas/web/static/dist/)
npm run build

# Lint
npm run lint
```

## Architecture

### Backend Structure (`vaas/`)
- **`main.py`**: Flask app factory with Flask-Login setup
- **`config.py`**: Configuration class with paths (DATA_DIR, DATABASE_FILE, etc.)
- **`core/classifier.py`**: `RuleEngine` class - the classification brain
  - Priority order: System Admin > Out of Scope > Other Teams > Application
  - Uses RapidFuzz for fuzzy matching (90%+ threshold)
  - Hostname lookup for Application-category vulnerabilities
- **`core/knowledge.py`**: `KnowledgeBase` class - SQLite wrapper
  - Tables: `hostnames` (hostname→team) and `rules` (title_pattern→team)
  - Auto-migrates from Excel files on first run
- **`web/routes.py`**: Flask blueprint with all API endpoints
- **`auth/`**: Authentication module (LDAP + local users)

### Frontend Structure (`frontend/src/`)
- **`App.jsx`**: Main component with all state management
- **`features/`**: Feature modules (upload, review, knowledgebase)
- **`components/`**: Reusable UI (common/, layout/)
- **`hooks/`**: Custom hooks (useDebounce, useDarkMode, useProgress)
- **`services/api.js`**: All API calls to Flask backend
- **`context/`**: React contexts (ConfigContext, ThemeContext)

### Data Flow
1. User uploads Excel → `/classify` endpoint
2. `RuleEngine.predict()` processes each row:
   - Check title against rules (priority order)
   - If "Application" match → lookup hostname owner
   - If no match → fuzzy match against all patterns
3. Results returned as JSON → displayed in review table
4. Manual corrections can be saved to Knowledge Base

### Key Files
- `data/knowledge_base.db`: SQLite database (hostnames + title rules)
- `vaas/web/templates/index.html`: Legacy monolithic frontend (being replaced)
- `frontend/`: New modular React frontend (Vite + Tailwind v4)

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/classify` | POST | Upload Excel, returns classified JSON |
| `/export` | POST | Export as master Excel or teams ZIP |
| `/kb/data` | GET | Get all KB rules |
| `/kb/add_rule` | POST | Add hostname/title rule |
| `/kb/edit_rule` | PUT | Edit existing rule |
| `/kb/delete_rule` | DELETE | Delete a rule |
| `/kb/export` | GET | Download KB as Excel |
| `/kb/import` | POST | Import/merge KB from Excel |

## Configuration

Environment variables:
- `VAAS_THRESHOLD`: Confidence threshold (default: 0.85)
- `FLASK_SECRET_KEY`: Session secret key
- `FLASK_DEBUG`: Set to '1' for debug mode

The Vite config (`frontend/vite.config.js`) proxies API routes to Flask at localhost:5001 during development.
