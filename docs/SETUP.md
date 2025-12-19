# VAAS Setup Guide

This document provides comprehensive instructions for installing and setting up the VAAS (Vulnerability Assignment Automation System) application.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Backend Setup (Python/Flask)](#backend-setup)
3. [Frontend Setup (React/Vite)](#frontend-setup)
4. [Database Initialization](#database-initialization)
5. [Container Deployment (Docker)](#container-deployment)
6. [Configuration](#configuration)
7. [First Run](#first-run)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements

- **Operating System**: Linux, macOS, or Windows (with WSL2)
- **CPU**: 2+ cores recommended
- **RAM**: 4GB minimum, 8GB recommended
- **Disk Space**: 2GB minimum for application and data

### Software Requirements

#### For Traditional Deployment

- **Python**: 3.9 or higher
- **Node.js**: 18.x or higher
- **npm**: 9.x or higher
- **pip**: Latest version

#### For Container Deployment

- **Docker**: 20.10 or higher
- **Docker Compose**: 2.0 or higher

---

## Backend Setup

### 1. Clone or Extract the Application

```bash
cd /path/to/VAAS
```

### 2. Create Python Virtual Environment

```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 3. Install Python Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

#### Optional Database Drivers

By default, VAAS uses SQLite. To use external databases, install the appropriate driver:

**MySQL/MariaDB:**
```bash
pip install mysql-connector-python
```

**PostgreSQL:**
```bash
pip install psycopg2-binary
```

**SQL Server / Azure SQL:**
```bash
# Requires ODBC Driver 17 or 18 for SQL Server
pip install pyodbc
```

### 4. Verify Installation

```bash
python -c "import flask; print('Flask:', flask.__version__)"
python -c "import pandas; print('Pandas:', pandas.__version__)"
```

---

## Frontend Setup

### 1. Navigate to Frontend Directory

```bash
cd frontend
```

### 2. Install Node.js Dependencies

```bash
npm install
```

### 3. Build Frontend for Production

```bash
npm run build
```

This creates optimized static files in `frontend/dist/`, which are served by Flask.

### 4. Development Mode (Optional)

For frontend development with hot reload:

```bash
npm run dev
# Runs on http://localhost:5173 with API proxy to Flask at localhost:5001
```

---

## Database Initialization

VAAS automatically creates the SQLite database on first run. To use an external database:

### SQLite (Default)

No additional configuration needed. Database file is created at:
```
data/knowledge_base.db
```

### MySQL/MariaDB

1. Create database and user:
```sql
CREATE DATABASE vaas CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'vaas_user'@'%' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON vaas.* TO 'vaas_user'@'%';
FLUSH PRIVILEGES;
```

2. Set environment variables (see Configuration section)

### PostgreSQL

1. Create database and user:
```sql
CREATE DATABASE vaas WITH ENCODING 'UTF8';
CREATE USER vaas_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE vaas TO vaas_user;
```

2. Set environment variables (see Configuration section)

### SQL Server / Azure SQL

1. Create database and login via SQL Server Management Studio or Azure Portal
2. Set environment variables (see Configuration section)

---

## Container Deployment

### Quick Start with Docker Compose

#### Development Mode (SQLite)

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

Access VAAS at http://localhost:5001

#### Production Mode (with external database)

```bash
# Edit docker-compose.prod.yml and configure database settings
vim docker-compose.prod.yml

# Start production stack
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Building Docker Image Manually

```bash
# Build image
docker build -t vaas:4.0 .

# Run container with SQLite
docker run -d \
  --name vaas \
  -p 5001:5001 \
  -v $(pwd)/data:/app/data \
  -e FLASK_SECRET_KEY="your-secret-key" \
  vaas:4.0

# Run with external MySQL
docker run -d \
  --name vaas \
  -p 5001:5001 \
  -e DB_TYPE=mysql \
  -e DB_HOST=mysql.example.com \
  -e DB_NAME=vaas \
  -e DB_USER=vaas_user \
  -e DB_PASSWORD=secure_password \
  -e FLASK_SECRET_KEY="your-secret-key" \
  vaas:4.0
```

---

## Configuration

### Environment Variables

Create a `.env` file in the project root:

```bash
# Flask Configuration
FLASK_SECRET_KEY=your-unique-secret-key-change-this
FLASK_ENV=production
FLASK_DEBUG=0

# Database Configuration
DB_TYPE=sqlite                 # Options: sqlite, mysql, postgresql, mssql
# DB_HOST=localhost            # For external databases
# DB_PORT=3306                 # Database port
# DB_NAME=vaas                 # Database name
# DB_USER=vaas_user            # Database username
# DB_PASSWORD=secure_password  # Database password

# Application Settings
VAAS_THRESHOLD=0.85            # Classification confidence threshold (0.0-1.0)
DATA_DIR=./data                # Data directory path

# LDAP Authentication (Optional)
# LDAP_SERVER=ldap.example.com
# LDAP_PORT=389
# LDAP_USE_SSL=false
# LDAP_BASE_DN=dc=example,dc=com
# LDAP_USER_DN=ou=users,dc=example,dc=com
# LDAP_BIND_USER=cn=admin,dc=example,dc=com
# LDAP_BIND_PASSWORD=ldap_password
```

### Loading Environment Variables

```bash
# Linux/macOS
export $(cat .env | xargs)

# Or use python-dotenv
pip install python-dotenv
```

---

## First Run

### 1. Initialize Data Directory

```bash
mkdir -p data
```

### 2. (Optional) Prepare Initial Knowledge Base

Place Excel files in the data directory:
- `data/Hostnames.xlsx` - Hostname to team mappings
- `data/VA Titles.xlsx` - Vulnerability title patterns

VAAS will automatically import these on first database initialization.

### 3. Start the Application

#### Development Mode (Flask Built-in Server)

```bash
source venv/bin/activate
python -m vaas.main
```

Access at http://localhost:5001

#### Production Mode (Gunicorn)

```bash
source venv/bin/activate
gunicorn --bind 0.0.0.0:5001 \
         --workers 4 \
         --timeout 120 \
         --access-logfile - \
         --error-logfile - \
         "vaas.main:create_app()"
```

### 4. Create First Admin User

On first access, VAAS runs without authentication. Create an admin user:

1. Navigate to http://localhost:5001
2. Click "Settings" (gear icon) → "Database Settings"
3. Create admin user with username and password
4. From this point, authentication is enabled

---

## Troubleshooting

### Database Connection Issues

**SQLite file locked:**
```bash
# Check for stale processes
ps aux | grep python
# Kill if necessary
pkill -f "vaas.main"
```

**MySQL connection refused:**
```bash
# Verify MySQL is running
systemctl status mysql
# Test connection
mysql -h localhost -u vaas_user -p
```

**PostgreSQL authentication failed:**
```bash
# Check pg_hba.conf allows password authentication
# Verify user exists
psql -U postgres -c "\du"
```

### Frontend Build Errors

```bash
# Clear node_modules and rebuild
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Permission Issues

```bash
# Fix data directory permissions
chown -R $USER:$USER data/
chmod 755 data/
```

### Docker Issues

```bash
# View container logs
docker logs vaas

# Access container shell
docker exec -it vaas /bin/bash

# Rebuild image without cache
docker build --no-cache -t vaas:4.0 .
```

### Import Errors

```bash
# Verify all dependencies installed
pip list | grep -E "flask|pandas|rapidfuzz"

# Reinstall dependencies
pip install --force-reinstall -r requirements.txt
```

---

## Next Steps

- See [DEPLOYMENT.md](DEPLOYMENT.md) for production deployment guide
- See [LIFECYCLE.md](LIFECYCLE.md) for maintenance and updates
- See [FEATURES_*.md](FEATURES_ADMIN.md) for role-based capabilities
