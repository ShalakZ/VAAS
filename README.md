# VAAS - Vulnerability Assessment Automation System

VAAS is an intelligent automation tool that automates the assignment of vulnerability assessment findings to the correct IT teams. It uses a hybrid approach combining **fuzzy matching**, **smart rule-based classification**, and a comprehensive **Knowledge Base** to ensure accurate, consistent team assignments.

---

## Features

- **Smart Fuzzy Classification**: Matches vulnerability titles against known patterns using advanced fuzzy matching (RapidFuzz)
- **Priority-Based Assignment**:
  - System Admin rules have highest priority
  - Application rules use hostname ownership for team assignment
  - Out of Scope rules for non-applicable vulnerabilities
- **Modern Web Interface**: React 19 + Tailwind CSS v4 single-page application
- **Knowledge Base Management**: Add, edit, or delete rules and hostname mappings directly from the browser
- **Multi-Database Support**: SQLite (default), PostgreSQL, MySQL, MS SQL Server
- **Role-Based Access Control**: Administrator, Security Admin, and Viewer roles
- **LDAP Integration**: Optional Active Directory authentication
- **Bulk Processing**: Handles large datasets (1000+ rows) efficiently
- **Export Options**: Download full classified report or separate per-team Excel files (zipped)
- **Dark Mode**: Toggle between light and dark themes
- **Audit Logging**: Track all user actions and system events

---

## Tech Stack

### Backend
- Python 3.9+
- Flask 3.0+
- Flask-Login (authentication)
- Pandas (data processing)
- RapidFuzz (fuzzy matching)
- Gunicorn (production server)

### Frontend
- React 19
- Vite 7
- Tailwind CSS v4

### Database
- SQLite (default)
- PostgreSQL (recommended for production)
- MySQL/MariaDB
- MS SQL Server / Azure SQL

---

## Project Structure

```
VAAS/
├── vaas/                      # Backend Python package
│   ├── main.py               # Flask app factory
│   ├── config.py             # Configuration (env var support)
│   ├── constants.py          # Centralized string constants
│   ├── core/                 # Core classification logic
│   │   ├── classifier.py     # RuleEngine (fuzzy matching, rules)
│   │   ├── knowledge.py      # KnowledgeBase (database operations)
│   │   ├── reports.py        # Report storage
│   │   └── scheduler.py      # Background cleanup scheduler
│   ├── web/                  # Web routes and templates
│   │   ├── routes.py         # API endpoints
│   │   ├── templates/        # Admin page templates
│   │   └── static/dist/      # Built React frontend
│   ├── auth/                 # Authentication module
│   │   ├── routes.py         # Auth endpoints
│   │   ├── ldap_auth.py      # LDAP integration
│   │   ├── user_db.py        # User management
│   │   └── permissions.py    # RBAC decorators
│   ├── db/                   # Database abstraction layer
│   │   ├── providers/        # SQLite, MySQL, PostgreSQL, MSSQL
│   │   ├── settings.py       # DB settings management
│   │   └── env_config.py     # Environment-based config
│   ├── logs/                 # Audit logging
│   └── static/               # Static files (admin templates)
├── frontend/                 # React frontend source
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── features/         # Feature modules (upload, review, KB)
│   │   ├── hooks/            # Custom React hooks
│   │   ├── services/         # API client
│   │   └── context/          # React contexts
│   ├── package.json
│   └── vite.config.js
├── data/                     # Data directory (runtime)
│   ├── *.json.example        # Config templates
│   ├── uploads/              # Temporary upload storage
│   ├── outputs/              # Export outputs
│   └── logs/                 # Application logs
├── Dockerfile                # Multi-stage Docker build
├── docker-compose.yml        # Container orchestration
├── requirements.txt          # Python dependencies
└── .env.example              # Environment template
```

---

## Quick Start

### Prerequisites
- Python 3.9+
- Node.js 18+
- npm

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ShalakZ/VAAS.git
   cd VAAS
   ```

2. **Set up Python environment**
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # Linux/Mac
   # or: venv\Scripts\activate  # Windows
   pip install -r requirements.txt
   ```

3. **Build the frontend**
   ```bash
   cd frontend
   npm install
   npm run build
   cd ..
   ```

4. **Configure environment** (optional)
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

5. **Run the application**
   ```bash
   python -m vaas.main
   ```

6. **Access the application**
   - Open http://localhost:5001 in your browser
   - Default credentials: `admin` / `admin`

---

## Configuration

VAAS supports configuration via environment variables. See `.env.example` for all options.

### Key Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `FLASK_SECRET_KEY` | Session encryption key | Random |
| `FLASK_DEBUG` | Enable debug mode | `0` |
| `DB_TYPE` | Database type (sqlite/postgresql/mysql/mssql) | `sqlite` |
| `DB_HOST` | Database host | - |
| `DB_PORT` | Database port | - |
| `DB_NAME` | Database name | - |
| `DB_USER` | Database username | - |
| `DB_PASSWORD` | Database password | - |
| `VAAS_THRESHOLD` | Fuzzy match confidence threshold | `0.85` |
| `LDAP_ENABLED` | Enable LDAP authentication | `false` |
| `LDAP_HOST` | LDAP server hostname | - |

---

## User Guide

### Classifying Vulnerabilities

1. Navigate to `http://<server-ip>:5001`
2. Drag & drop your Excel report (or click "Select File")
   - Required column: `Title` (vulnerability name)
   - Recommended column: `Hostname` or `DNS Name` (for owner lookup)
3. Review results:
   - **Green rows**: Auto-classified (high confidence)
   - **Yellow rows**: Need review
   - **Orange rows**: Fuzzy matched (similar but not exact)
4. Adjust team assignments as needed via dropdown
5. Export:
   - **Export Master**: Single Excel with all data
   - **Export Teams ZIP**: Separate files per team

### Classification Logic

```
┌─────────────────────────────────────────────────────────┐
│                   INPUT: Vulnerability                   │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│   Step 1: Check Title Rules (Priority Order)           │
│   1. System Admin rules    (highest priority)          │
│   2. Out of Scope rules                                │
│   3. Other team rules                                  │
│   4. Application rules     (lowest priority)           │
└───────────────────────┬─────────────────────────────────┘
                        │
           ┌────────────┴────────────┐
           │                         │
     (Matched)               (No Match)
           │                         │
           ▼                         ▼
┌──────────────────┐   ┌──────────────────────────────────┐
│ If System Admin  │   │ Step 2: Fuzzy Match Title        │
│ → Assign directly│   │ Against known patterns (90%+)    │
└──────────────────┘   └───────────────┬──────────────────┘
                                       │
┌──────────────────┐              (Matched)
│ If Application   │                   │
│ → Check Hostname │                   ▼
│ → Assign Owner   │   ┌──────────────────────────────────┐
└──────────────────┘   │ Prioritize: SysAdmin > Scope >   │
                       │ Others > Application              │
                       └──────────────────────────────────┘
```

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Main React SPA |
| `/classify` | POST | Upload Excel, returns classified JSON |
| `/export` | POST | Export classified data |
| `/health` | GET | Health check endpoint |
| `/kb/data` | GET | Get all KB rules |
| `/kb/add_rule` | POST | Add hostname/title rule |
| `/kb/edit_rule` | PUT | Edit existing rule |
| `/kb/delete_rule` | DELETE | Delete a rule |
| `/kb/export` | GET | Download KB as Excel |
| `/kb/import` | POST | Import/merge KB from Excel |
| `/login` | GET/POST | Authentication |
| `/settings/users` | GET | User management (admin) |
| `/settings/ldap` | GET | LDAP settings (admin) |
| `/settings/database` | GET | Database settings (admin) |

---

## Production Deployment

### Option 1: Systemd Service

Create `/etc/systemd/system/vaas.service`:

```ini
[Unit]
Description=VAAS - Vulnerability Assignment Automation System
After=network.target

[Service]
Type=simple
User=vaas
Group=vaas
WorkingDirectory=/opt/vaas
Environment="PATH=/opt/vaas/venv/bin"
ExecStart=/opt/vaas/venv/bin/gunicorn --bind 0.0.0.0:5001 --workers 4 "vaas.main:create_app()"
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable vaas
sudo systemctl start vaas
```

### Option 2: Docker (Recommended)

```bash
# Clone and navigate to project
git clone https://github.com/ShalakZ/VAAS.git
cd VAAS

# Build and run with Docker Compose
docker compose up -d

# View logs
docker compose logs -f

# Stop
docker compose down
```

Access the application at **http://localhost:5001**

#### Docker Commands Reference

| Command | Description |
|---------|-------------|
| `docker compose up -d` | Start in background |
| `docker compose logs -f` | View live logs |
| `docker compose down` | Stop containers |
| `docker compose down -v` | Stop and remove data |
| `docker compose build --no-cache` | Rebuild image |

---

## Development

### Frontend Development
```bash
cd frontend
npm run dev    # Start dev server with hot reload (port 5173)
npm run build  # Production build
npm run lint   # Run ESLint
```

### Backend Development
```bash
source venv/bin/activate
FLASK_DEBUG=1 python -m vaas.main
```

---

## Troubleshooting

### Q: Everything shows "Unclassified"
**A:** Check Knowledge Base for missing patterns. Ensure title rules exist for your vulnerabilities.

### Q: Service won't start
**A:** Check logs: `sudo journalctl -u vaas -n 50`
Common issues:
- Missing dependencies: `pip install -r requirements.txt`
- Permission issues: `chown -R vaas:vaas /opt/vaas`
- Frontend not built: `cd frontend && npm run build`

### Q: Static assets not loading (404)
**A:** Ensure frontend is built: `cd frontend && npm run build`

### Q: Port 5001 is already in use
**A:**
```bash
sudo lsof -i :5001  # Find the process
sudo kill <PID>     # Kill it
# Or set VAAS_PORT environment variable
```

---

## License

Private repository - All rights reserved.

## Author

Ziad Shalak - [@ShalakZ](https://github.com/ShalakZ)
