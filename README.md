# VAAS - Vulnerability Assessment Automation System

VAAS is an intelligent automation tool that automates the assignment of vulnerability assessment findings to the correct IT teams. It uses a hybrid approach combining **fuzzy matching**, **smart rule-based classification**, and a comprehensive **Knowledge Base** to ensure accurate, consistent team assignments.

---

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Deployment Options](#deployment-options)
  - [Option 1: Docker Hub (Quick Deploy)](#option-1-docker-hub-quick-deploy)
  - [Option 2: Docker (Build from Source)](#option-2-docker-build-from-source)
  - [Option 3: Manual Installation](#option-3-manual-installation)
  - [Option 4: Systemd Service](#option-4-systemd-service-linux)
- [Configuration](#configuration)
- [User Guide](#user-guide)
- [API Reference](#api-reference)
- [Development](#development)
- [Troubleshooting](#troubleshooting)

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

---

## Prerequisites

### For Docker Deployment (Recommended)

**Linux:**
```bash
# Install Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker

# Verify
docker --version
docker compose version
```

**Windows:**
1. Download and install [Docker Desktop](https://www.docker.com/products/docker-desktop/)
2. Enable **WSL 2** when prompted
3. Restart your computer

### For Manual Installation (without Docker)

**Linux:**
```bash
sudo apt update
sudo apt install -y python3 python3-pip python3-venv git curl

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

**Windows:**
1. Install [Python 3.12](https://www.python.org/downloads/) - check "Add to PATH"
2. Install [Node.js 20 LTS](https://nodejs.org/)
3. Install [Git for Windows](https://git-scm.com/download/win)

---

## Deployment Options

### Option 1: Docker Hub (Quick Deploy)

Pull the pre-built image - no build required.

**One-liner deployment:**
```bash
curl -fsSL https://raw.githubusercontent.com/ShalakZ/VAAS/main/deploy.sh | bash
```

**Or using Docker Compose (recommended for customization):**
```bash
# Download the production compose file
curl -O https://raw.githubusercontent.com/ShalakZ/VAAS/main/docker-compose.prod.yml

# Edit configuration (port, LDAP, database, etc.)
nano docker-compose.prod.yml

# Run
docker compose -f docker-compose.prod.yml up -d
```

**Or manual docker run:**
```bash
docker run -d \
  --name vaas \
  -p 5001:5001 \
  -e FLASK_SECRET_KEY=$(openssl rand -hex 32) \
  -v vaas-data:/app/data \
  --restart unless-stopped \
  ziadshalak/vaas:latest
```

Access at **http://localhost:5001** | Default login: `admin` / `admin`

---

### Option 2: Docker (Build from Source)

Build the image locally from source code.

```bash
# Clone repository
git clone https://github.com/ShalakZ/VAAS.git
cd VAAS

# Build and run
docker compose up -d --build

# View logs
docker compose logs -f

# Stop
docker compose down
```

Access at **http://localhost:5001** | Default login: `admin` / `admin`

---

### Option 3: Manual Installation

Run directly with Python (no Docker).

```bash
# Clone repository
git clone https://github.com/ShalakZ/VAAS.git
cd VAAS

# Set up Python environment
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
# or: venv\Scripts\activate  # Windows
pip install -r requirements.txt

# Build frontend
cd frontend
npm install
npm run build
cd ..

# Configure (optional)
cp .env.example .env
nano .env

# Run
python -m vaas.main
```

**For production, use Gunicorn:**
```bash
pip install gunicorn
gunicorn --bind 0.0.0.0:5001 --workers 4 "vaas.main:create_app()"
```

Access at **http://localhost:5001** | Default login: `admin` / `admin`

---

### Option 4: Systemd Service (Linux)

For running as a background service on Linux servers.

**1. Create service file** `/etc/systemd/system/vaas.service`:
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

**2. Enable and start:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable vaas
sudo systemctl start vaas

# Check status
sudo systemctl status vaas

# View logs
sudo journalctl -u vaas -f
```

---

## Configuration

### Environment Variables

Configure via `.env` file, environment variables, or `docker-compose.yml`.

| Variable | Description | Default |
|----------|-------------|---------|
| **Network** | | |
| `VAAS_HOST` | IP address to bind to | `0.0.0.0` |
| `VAAS_PORT` | Port to listen on | `5001` |
| **Security** | | |
| `FLASK_SECRET_KEY` | Session encryption key (required for production) | Random |
| `FLASK_DEBUG` | Enable debug mode | `0` |
| **Database** | | |
| `DB_TYPE` | Database type: `sqlite`, `postgresql`, `mysql`, `mssql` | `sqlite` |
| `DB_HOST` | Database host | - |
| `DB_PORT` | Database port | - |
| `DB_NAME` | Database name | - |
| `DB_USER` | Database username | - |
| `DB_PASSWORD` | Database password | - |
| **Classification** | | |
| `VAAS_THRESHOLD` | Fuzzy match confidence threshold (0.0 - 1.0) | `0.85` |
| **LDAP** | | |
| `LDAP_ENABLED` | Enable Active Directory authentication | `false` |
| `LDAP_HOST` | LDAP server hostname | - |
| `LDAP_PORT` | LDAP server port | `389` |
| `LDAP_BASE_DN` | LDAP base DN (e.g., `DC=company,DC=com`) | - |
| `LDAP_USER_FILTER` | User search filter | `(sAMAccountName={username})` |

### Example Configurations

**Custom port (8080):**
```bash
# Docker
docker run -d -p 8080:5001 --name vaas ziadshalak/vaas:latest

# Manual
VAAS_PORT=8080 python -m vaas.main

# Gunicorn
gunicorn --bind 0.0.0.0:8080 --workers 4 "vaas.main:create_app()"
```

**Bind to specific IP:**
```bash
# Gunicorn
gunicorn --bind 192.168.1.100:5001 --workers 4 "vaas.main:create_app()"
```

**With LDAP authentication:**
```bash
docker run -d \
  --name vaas \
  -p 5001:5001 \
  -e FLASK_SECRET_KEY=$(openssl rand -hex 32) \
  -e LDAP_ENABLED=true \
  -e LDAP_HOST=ldap.company.com \
  -e LDAP_BASE_DN=DC=company,DC=com \
  -v vaas-data:/app/data \
  ziadshalak/vaas:latest
```

### Post-Deployment Configuration

After starting VAAS, configure additional settings via the web UI:

1. **Login** with `admin` / `admin`
2. **Settings → Users**: Change default password, add users
3. **Settings → LDAP**: Configure Active Directory (if needed)
4. **Settings → Database**: Switch to PostgreSQL/MySQL (if needed)

---

## User Guide

### Classifying Vulnerabilities

1. Navigate to `http://<server-ip>:<port>`
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

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Main React SPA |
| `/health` | GET | Health check endpoint |
| `/classify` | POST | Upload Excel, returns classified JSON |
| `/export` | POST | Export classified data |
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

### Everything shows "Unclassified"
Check Knowledge Base for missing patterns. Ensure title rules exist for your vulnerabilities.

### Service won't start
Check logs: `sudo journalctl -u vaas -n 50` or `docker compose logs`

Common issues:
- Missing dependencies: `pip install -r requirements.txt`
- Frontend not built: `cd frontend && npm run build`
- Permission issues: `chown -R vaas:vaas /opt/vaas`

### Static assets not loading (404)
Ensure frontend is built: `cd frontend && npm run build`

### Port already in use
```bash
sudo lsof -i :5001  # Find the process
sudo kill <PID>     # Kill it
# Or use a different port via VAAS_PORT
```

---

## License

Private repository - All rights reserved.

## Author

Ziad Shalak - [@ShalakZ](https://github.com/ShalakZ)
