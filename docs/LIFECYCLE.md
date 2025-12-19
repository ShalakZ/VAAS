# VAAS Product Lifecycle Management

Comprehensive guide for managing the VAAS application throughout its lifecycle.

## Table of Contents

1. [Version Control Workflow](#version-control-workflow)
2. [CI/CD Pipeline](#cicd-pipeline)
3. [Backup and Disaster Recovery](#backup-and-disaster-recovery)
4. [Scaling Strategies](#scaling-strategies)
5. [Maintenance Windows](#maintenance-windows)
6. [Update Procedures](#update-procedures)
7. [Performance Tuning](#performance-tuning)

---

## Version Control Workflow

### Branching Strategy

```
main (production)
  ├── develop (integration)
  │   ├── feature/new-classifier-rule
  │   ├── feature/mysql-support
  │   └── bugfix/export-error
  └── hotfix/critical-security-patch
```

### Tagging Releases

```bash
# Tag release
git tag -a v4.0.0 -m "Release 4.0.0 - Performance optimizations"
git push origin v4.0.0

# View tags
git tag -l
```

### Semantic Versioning

- **Major (X.0.0)**: Breaking changes
- **Minor (x.Y.0)**: New features, backward compatible
- **Patch (x.y.Z)**: Bug fixes, backward compatible

Example: `4.0.1` = Version 4, no new features, patch 1

---

## CI/CD Pipeline

### GitHub Actions Example

Create `.github/workflows/ci-cd.yml`:

```yaml
name: VAAS CI/CD

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install pytest pytest-cov
      - name: Run tests
        run: pytest tests/ --cov=vaas

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build Docker image
        run: docker build -t vaas:${{ github.sha }} .
      - name: Push to registry
        run: |
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker push vaas:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to production
        run: |
          # SSH to production server and update
          ssh deploy@prod-server "cd /opt/vaas && docker-compose pull && docker-compose up -d"
```

### GitLab CI Example

Create `.gitlab-ci.yml`:

```yaml
stages:
  - test
  - build
  - deploy

test:
  stage: test
  image: python:3.11
  script:
    - pip install -r requirements.txt pytest
    - pytest tests/

build:
  stage: build
  image: docker:latest
  services:
    - docker:dind
  script:
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA

deploy_production:
  stage: deploy
  only:
    - main
  script:
    - ssh deploy@prod "docker pull $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA"
    - ssh deploy@prod "docker service update --image $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA vaas"
```

---

## Backup and Disaster Recovery

### Backup Strategy

#### Database Backups

**Automated Daily Backup Script**:

```bash
#!/bin/bash
# /opt/vaas/scripts/backup.sh

set -e

BACKUP_DIR="/backups/vaas"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Database backup
case "${DB_TYPE}" in
  mysql)
    mysqldump -h ${DB_HOST} -u ${DB_USER} -p${DB_PASSWORD} \
      --single-transaction --routines --triggers \
      ${DB_NAME} | gzip > ${BACKUP_DIR}/db_${DATE}.sql.gz
    ;;
  postgresql)
    PGPASSWORD=${DB_PASSWORD} pg_dump -h ${DB_HOST} -U ${DB_USER} \
      -F c -b -v -f ${BACKUP_DIR}/db_${DATE}.dump ${DB_NAME}
    ;;
  sqlite)
    cp data/knowledge_base.db ${BACKUP_DIR}/db_${DATE}.db
    gzip ${BACKUP_DIR}/db_${DATE}.db
    ;;
esac

# Application data backup
tar -czf ${BACKUP_DIR}/data_${DATE}.tar.gz data/

# Cleanup old backups
find ${BACKUP_DIR} -name "db_*.gz" -mtime +${RETENTION_DAYS} -delete
find ${BACKUP_DIR} -name "data_*.tar.gz" -mtime +${RETENTION_DAYS} -delete

echo "Backup completed: ${DATE}"
```

Schedule with cron:
```bash
0 2 * * * /opt/vaas/scripts/backup.sh >> /var/log/vaas-backup.log 2>&1
```

#### Off-Site Backups

```bash
# Sync to S3
aws s3 sync /backups/vaas s3://company-backups/vaas/ --storage-class GLACIER

# Sync to remote server
rsync -avz --delete /backups/vaas/ backup-server:/mnt/backups/vaas/
```

### Disaster Recovery Procedures

#### Recovery Time Objective (RTO): 2 hours
#### Recovery Point Objective (RPO): 24 hours

**Recovery Steps**:

1. **Provision New Infrastructure**
   ```bash
   # Deploy from backup
   docker-compose -f docker-compose.prod.yml up -d
   ```

2. **Restore Database**
   ```bash
   # MySQL
   gunzip < /backups/vaas/db_latest.sql.gz | mysql -u vaas_user -p vaas_production

   # PostgreSQL
   pg_restore -h localhost -U vaas_user -d vaas_production /backups/vaas/db_latest.dump
   ```

3. **Restore Application Data**
   ```bash
   tar -xzf /backups/vaas/data_latest.tar.gz -C /opt/vaas/
   ```

4. **Verify Service**
   ```bash
   curl http://localhost:5001/health
   ```

---

## Scaling Strategies

### Vertical Scaling (Scale Up)

Increase resources for single instance:

```yaml
# docker-compose.prod.yml
services:
  vaas:
    deploy:
      resources:
        limits:
          cpus: '4.0'
          memory: 8G
```

### Horizontal Scaling (Scale Out)

Add more instances:

```bash
# Docker Compose
docker-compose -f docker-compose.prod.yml up -d --scale vaas=5

# Kubernetes
kubectl scale deployment vaas --replicas=5
```

### Auto-Scaling (Kubernetes)

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: vaas-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: vaas
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### Database Scaling

- **Read Replicas**: For read-heavy workloads
- **Sharding**: For massive datasets
- **Connection Pooling**: Use PgBouncer (PostgreSQL) or ProxySQL (MySQL)

---

## Maintenance Windows

### Scheduled Maintenance

**Monthly Maintenance Schedule**:
- **When**: First Sunday, 2:00 AM - 6:00 AM
- **Frequency**: Monthly
- **Activities**:
  - Security updates
  - Database optimization
  - Log rotation
  - Backup verification

### Pre-Maintenance Checklist

- [ ] Notify users 7 days in advance
- [ ] Create database backup
- [ ] Test update in staging environment
- [ ] Prepare rollback plan
- [ ] Document changes
- [ ] Schedule team availability

### Maintenance Procedure

```bash
#!/bin/bash
# Maintenance script

echo "Starting maintenance..."

# 1. Backup
/opt/vaas/scripts/backup.sh

# 2. Stop application
docker-compose -f docker-compose.prod.yml stop

# 3. Update system packages
apt-get update && apt-get upgrade -y

# 4. Pull latest images
docker-compose -f docker-compose.prod.yml pull

# 5. Database maintenance
mysql -u root -p${MYSQL_ROOT_PASSWORD} -e "OPTIMIZE TABLE vaas_production.rules"
mysql -u root -p${MYSQL_ROOT_PASSWORD} -e "ANALYZE TABLE vaas_production.hostnames"

# 6. Start application
docker-compose -f docker-compose.prod.yml up -d

# 7. Verify health
sleep 30
curl -f http://localhost:5001/health || exit 1

echo "Maintenance completed successfully"
```

---

## Update Procedures

### Application Updates

#### Zero-Downtime Rolling Update

```bash
# 1. Pull new image
docker pull vaas:4.1.0

# 2. Update one instance at a time
docker-compose -f docker-compose.prod.yml up -d --no-deps --scale vaas=3 vaas

# 3. Verify health before proceeding
curl http://vaas-instance-1:5001/health
```

#### Database Schema Updates

```bash
# 1. Backup database
/opt/vaas/scripts/backup.sh

# 2. Test migration in staging
python scripts/migrate_schema.py --dry-run

# 3. Apply migration
python scripts/migrate_schema.py --apply

# 4. Verify data integrity
python scripts/verify_data.py
```

### Rollback Procedure

```bash
# Rollback to previous version
docker tag vaas:4.1.0 vaas:4.1.0-backup
docker tag vaas:4.0.0 vaas:latest
docker-compose -f docker-compose.prod.yml up -d

# Restore database if needed
gunzip < /backups/vaas/db_before_update.sql.gz | mysql -u root -p vaas_production
```

---

## Performance Tuning

### Application Optimization

1. **Gunicorn Workers**: `workers = (2 * CPU_cores) + 1`
2. **Worker Timeout**: Adjust based on classification time
3. **Worker Class**: Use `gevent` for IO-bound tasks

```bash
gunicorn --bind 0.0.0.0:5001 \
         --workers 9 \
         --worker-class gevent \
         --worker-connections 1000 \
         --timeout 120 \
         --max-requests 1000 \
         --max-requests-jitter 50 \
         "vaas.main:create_app()"
```

### Database Optimization

**MySQL Tuning**:
```sql
-- Increase buffer pool
SET GLOBAL innodb_buffer_pool_size = 4G;

-- Query cache
SET GLOBAL query_cache_size = 256M;

-- Add indexes (already done in v4.0)
SHOW INDEX FROM rules;
SHOW INDEX FROM hostnames;
```

**PostgreSQL Tuning**:
```sql
-- Increase shared buffers
ALTER SYSTEM SET shared_buffers = '4GB';

-- Work memory
ALTER SYSTEM SET work_mem = '64MB';

-- Maintenance work memory
ALTER SYSTEM SET maintenance_work_mem = '512MB';

-- Reload configuration
SELECT pg_reload_conf();
```

### Caching Strategy

Implement Redis for session/result caching:

```yaml
# docker-compose.prod.yml
services:
  redis:
    image: redis:alpine
    command: redis-server --maxmemory 2gb --maxmemory-policy allkeys-lru
```

### Monitoring Performance

```bash
# Monitor container stats
docker stats vaas

# Database slow query log (MySQL)
mysql -e "SET GLOBAL slow_query_log = 'ON'; SET GLOBAL long_query_time = 1;"
tail -f /var/log/mysql/slow-query.log

# Application profiling
pip install py-spy
py-spy record -o profile.svg --pid $(pgrep -f gunicorn)
```

---

## Change Management

### Release Process

1. **Development** → Feature complete
2. **Code Review** → Peer review and approval
3. **Testing** → Automated and manual QA
4. **Staging** → Deploy to staging environment
5. **User Acceptance** → Stakeholder approval
6. **Production** → Scheduled deployment
7. **Monitoring** → Post-deployment validation

### Documentation Requirements

- Release notes
- API changes
- Configuration changes
- Database migrations
- Rollback procedures

---

## Support and Troubleshooting

### Common Issues

**High Memory Usage**:
- Reduce gunicorn workers
- Implement result pagination
- Clear old upload files

**Slow Classification**:
- Check database indexes
- Optimize fuzzy matching threshold
- Add caching layer

**Database Connection Pool Exhausted**:
- Increase max connections
- Reduce worker count
- Fix connection leaks

### Log Analysis

```bash
# Application logs
docker-compose logs -f --tail=100 vaas

# Error logs only
docker-compose logs vaas | grep ERROR

# Database logs
tail -f /var/log/mysql/error.log
```
