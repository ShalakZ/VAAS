# VAAS Production Deployment Guide

Complete guide for deploying VAAS in production environments.

## Table of Contents

1. [Deployment Architecture](#deployment-architecture)
2. [Container Orchestration](#container-orchestration)
3. [Environment Variables](#environment-variables)
4. [Database Migration](#database-migration)
5. [SSL/TLS Configuration](#ssltls-configuration)
6. [Reverse Proxy Setup](#reverse-proxy-setup)
7. [High Availability](#high-availability)
8. [Monitoring and Logging](#monitoring-and-logging)
9. [Security Hardening](#security-hardening)

---

## Deployment Architecture

### Recommended Production Stack

```
Internet → Load Balancer (nginx/HAProxy)
           ↓ (SSL/TLS)
       VAAS Containers (multiple instances)
           ↓
   External Database (MySQL/PostgreSQL/SQL Server)
           ↓
   Shared Storage (for uploads/exports)
```

### Minimum Requirements

- **CPU**: 4 cores
- **RAM**: 8GB
- **Storage**: 50GB SSD
- **Network**: 1Gbps

---

## Container Orchestration

### Docker Compose Production

```bash
# Use production compose file
docker-compose -f docker-compose.prod.yml up -d

# Scale application instances
docker-compose -f docker-compose.prod.yml up -d --scale vaas=3

# View status
docker-compose -f docker-compose.prod.yml ps

# Update application
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

### Kubernetes Deployment (Basic)

Create `vaas-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vaas
  labels:
    app: vaas
spec:
  replicas: 3
  selector:
    matchLabels:
      app: vaas
  template:
    metadata:
      labels:
        app: vaas
    spec:
      containers:
      - name: vaas
        image: vaas:4.0
        ports:
        - containerPort: 5001
        env:
        - name: DB_TYPE
          value: "postgresql"
        - name: DB_HOST
          value: "postgres-service"
        - name: FLASK_SECRET_KEY
          valueFrom:
            secretKeyRef:
              name: vaas-secrets
              key: flask-secret
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 5001
          initialDelaySeconds: 60
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health
            port: 5001
          initialDelaySeconds: 10
          periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: vaas-service
spec:
  selector:
    app: vaas
  ports:
  - protocol: TCP
    port: 80
    targetPort: 5001
  type: LoadBalancer
```

Deploy:
```bash
kubectl apply -f vaas-deployment.yaml
kubectl get pods -l app=vaas
kubectl get svc vaas-service
```

---

## Environment Variables

### Production Environment File

Create `.env.production`:

```bash
# Required - Generate secure keys
FLASK_SECRET_KEY=$(openssl rand -hex 32)
DB_PASSWORD=$(openssl rand -base64 32)
MYSQL_ROOT_PASSWORD=$(openssl rand -base64 32)

# Database (External)
DB_TYPE=mysql
DB_HOST=mysql.internal.example.com
DB_PORT=3306
DB_NAME=vaas_production
DB_USER=vaas_prod_user
DB_SSL_ENABLED=true

# Application
FLASK_ENV=production
FLASK_DEBUG=0
VAAS_THRESHOLD=0.85
DATA_DIR=/app/data

# LDAP (Production)
LDAP_SERVER=ldap.corp.example.com
LDAP_PORT=636
LDAP_USE_SSL=true
LDAP_BASE_DN=dc=corp,dc=example,dc=com
LDAP_USER_DN=ou=employees,dc=corp,dc=example,dc=com
LDAP_BIND_USER=cn=svc_vaas,ou=services,dc=corp,dc=example,dc=com
LDAP_BIND_PASSWORD=<secure_ldap_password>

# Security
ALLOWED_HOSTS=vaas.example.com,vaas-internal.example.com
```

### Managing Secrets

#### Docker Secrets

```bash
# Create secrets
echo "your-secret-key" | docker secret create flask_secret -
echo "db-password" | docker secret create db_password -

# Use in docker-compose.prod.yml
services:
  vaas:
    secrets:
      - flask_secret
      - db_password
    environment:
      FLASK_SECRET_KEY_FILE: /run/secrets/flask_secret
      DB_PASSWORD_FILE: /run/secrets/db_password

secrets:
  flask_secret:
    external: true
  db_password:
    external: true
```

#### Kubernetes Secrets

```bash
# Create secret
kubectl create secret generic vaas-secrets \
  --from-literal=flask-secret=$(openssl rand -hex 32) \
  --from-literal=db-password=$(openssl rand -base64 32)

# View secrets (encoded)
kubectl get secret vaas-secrets -o yaml
```

---

## Database Migration

### Initial Production Setup

1. **Create Database Backup Location**:
```bash
mkdir -p /backups/vaas
```

2. **Initialize Production Database**:
```bash
# MySQL
mysql -h db-host -u vaas_user -p vaas_production < scripts/mysql-init.sql

# PostgreSQL
psql -h db-host -U vaas_user -d vaas_production -f scripts/postgres-init.sql
```

3. **Import Existing Knowledge Base**:
```bash
# From development SQLite to production MySQL
python scripts/migrate_db.py \
  --source-type sqlite \
  --source-file data/knowledge_base.db \
  --dest-type mysql \
  --dest-host db.example.com \
  --dest-db vaas_production
```

### Backup Strategy

**Automated Daily Backups**:

```bash
#!/bin/bash
# /opt/vaas/scripts/backup-db.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/backups/vaas
DB_NAME=vaas_production

# MySQL Backup
mysqldump -h mysql-host -u backup_user -p${DB_PASSWORD} \
  ${DB_NAME} | gzip > ${BACKUP_DIR}/vaas_${DATE}.sql.gz

# Retain last 30 days
find ${BACKUP_DIR} -name "vaas_*.sql.gz" -mtime +30 -delete
```

Schedule with cron:
```bash
0 2 * * * /opt/vaas/scripts/backup-db.sh
```

---

## SSL/TLS Configuration

### Generate SSL Certificates

#### Self-Signed (Development/Testing)

```bash
openssl req -x509 -newkey rsa:4096 -nodes \
  -keyout nginx/ssl/vaas.key \
  -out nginx/ssl/vaas.crt \
  -days 365 \
  -subj "/CN=vaas.example.com"
```

#### Let's Encrypt (Production)

```bash
# Using certbot
certbot certonly --standalone \
  -d vaas.example.com \
  --agree-tos \
  --email admin@example.com

# Certificates stored in /etc/letsencrypt/live/vaas.example.com/
```

---

## Reverse Proxy Setup

### Nginx Configuration

Create `nginx/nginx.conf`:

```nginx
upstream vaas_backend {
    least_conn;
    server vaas-1:5001 max_fails=3 fail_timeout=30s;
    server vaas-2:5001 max_fails=3 fail_timeout=30s;
    server vaas-3:5001 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    server_name vaas.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name vaas.example.com;

    ssl_certificate /etc/nginx/ssl/vaas.crt;
    ssl_certificate_key /etc/nginx/ssl/vaas.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    client_max_body_size 100M;

    location / {
        proxy_pass http://vaas_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 60s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }

    location /health {
        proxy_pass http://vaas_backend/health;
        access_log off;
    }

    location /static {
        proxy_pass http://vaas_backend/static;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### Apache Configuration

```apache
<VirtualHost *:80>
    ServerName vaas.example.com
    Redirect permanent / https://vaas.example.com/
</VirtualHost>

<VirtualHost *:443>
    ServerName vaas.example.com

    SSLEngine on
    SSLCertificateFile /etc/ssl/certs/vaas.crt
    SSLCertificateKeyFile /etc/ssl/private/vaas.key

    ProxyPreserveHost On
    ProxyPass / http://localhost:5001/
    ProxyPassReverse / http://localhost:5001/

    <Location />
        Require all granted
    </Location>
</VirtualHost>
```

---

## High Availability

### Load Balancing Strategy

- **Session Affinity**: Enable sticky sessions for file uploads
- **Health Checks**: Use `/health` endpoint
- **Failover**: Minimum 2 instances, recommend 3+

### Database Replication

**MySQL Master-Slave**:
- Write to master
- Read from slaves
- Automatic failover with ProxySQL

**PostgreSQL Streaming Replication**:
- Primary-standby setup
- Use pgpool-II for load balancing

---

## Monitoring and Logging

### Application Metrics

Install Prometheus exporter:
```bash
pip install prometheus-flask-exporter
```

Monitor:
- Request latency
- Classification throughput
- Database query time
- Memory usage

### Log Aggregation

**Using ELK Stack**:
```yaml
# docker-compose.prod.yml addition
  elasticsearch:
    image: elasticsearch:8.0

  logstash:
    image: logstash:8.0
    volumes:
      - ./logstash/logstash.conf:/usr/share/logstash/pipeline/logstash.conf

  kibana:
    image: kibana:8.0
    ports:
      - "5601:5601"
```

---

## Security Hardening

### Application Security

1. **Enable HTTPS Only**
2. **Set secure headers** in nginx
3. **Disable Flask debug mode**
4. **Use strong session secrets**
5. **Implement rate limiting**
6. **Regular security updates**

### Network Security

- Use private networks for database
- Restrict database access to application IPs
- Enable firewall rules
- Use VPN for administrative access

### Database Security

- Enable SSL/TLS connections
- Use least-privilege user accounts
- Regular security patches
- Encrypt backups
- Monitor for suspicious queries

---

## Deployment Checklist

- [ ] Generate secure secrets and passwords
- [ ] Configure external database
- [ ] Set up SSL certificates
- [ ] Configure reverse proxy
- [ ] Test health check endpoints
- [ ] Set up automated backups
- [ ] Configure monitoring and alerts
- [ ] Perform security audit
- [ ] Document runbook procedures
- [ ] Test disaster recovery
- [ ] Set up logging aggregation
- [ ] Configure auto-scaling (if applicable)
