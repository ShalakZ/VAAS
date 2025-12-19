# VAAS Administrator Role - Feature Guide

The **Administrator** role provides complete system access including full Knowledge Base management, user administration, and system configuration.

## Role Overview

**Permission Level**: Full Access
**Primary Use Case**: System administrators and senior security engineers managing VAAS infrastructure

## Inherited Features

### From Viewer:
- Upload and classify vulnerabilities
- View classification results
- Export reports

### From Security Admin:
- Manual classification override
- Confirm fuzzy matches
- Save corrections to Knowledge Base
- View audit logs

## Exclusive Administrator Features

### 1. Knowledge Base Management

**Capability**: Direct CRUD operations on classification rules

#### Add New Rules

**Hostname Rules**:
```
1. Navigate to Knowledge Base
2. Click "Add Hostname Rule"
3. Enter:
   - Hostname (e.g., "web-prod-01")
   - Assigned Team (e.g., "Web Infrastructure")
4. Click "Save"
```

**Title Rules**:
```
1. Navigate to Knowledge Base
2. Click "Add Title Rule"
3. Enter:
   - Title Pattern (e.g., "Apache HTTP Server")
   - Assigned Team (e.g., "System Admin")
   - Rule Type: Contains or Regex
4. Click "Save"
```

**Rule Types**:
- **Contains**: Substring match (recommended for most cases)
- **Regex**: Regular expression for complex patterns

#### Edit Existing Rules

```
1. Locate rule in Knowledge Base table
2. Click "Edit" icon
3. Modify hostname/pattern or team
4. Click "Update"
```

**Important**: Editing affects all future classifications

#### Delete Rules

```
1. Locate rule in Knowledge Base table
2. Click "Delete" icon (trash can)
3. Confirm deletion
```

**Warning**: Deletion is immediate and affects future classifications

---

### 2. Knowledge Base Import/Export

#### Export Knowledge Base

**Purpose**: Backup, migration, documentation

```
1. Navigate to Knowledge Base
2. Click "Export KB" button
3. Excel file downloads with two sheets:
   - Hostnames: All hostname → team mappings
   - Rules: All title pattern → team mappings
```

**Use Cases**:
- Backup before major changes
- Share with other VAAS instances
- Document current state
- Audit rule inventory

#### Import Knowledge Base

**Purpose**: Bulk upload, migration, restore from backup

**Modes**:
- **Merge**: Add/update rules, keep existing (default)
- **Replace**: Delete all existing rules first, then import

```
1. Prepare Excel file with sheets:
   - "Hostnames" with columns: hostname, team
   - "Rules" (or "Titles") with columns: title_pattern, team, rule_type (optional)

2. Navigate to Knowledge Base
3. Click "Import KB" button
4. Select file
5. Choose mode (Merge/Replace)
6. Click "Upload"
7. Review import summary
8. Page auto-reloads to apply changes
```

**File Format Requirements**:

Hostnames Sheet:
```
| hostname      | team              |
|---------------|-------------------|
| web-server-01 | Web Infrastructure|
| db-prod-main  | Database Team     |
```

Rules Sheet:
```
| title_pattern           | team         | rule_type |
|-------------------------|--------------|-----------|
| Apache HTTP Server      | System Admin | contains  |
| ^\[CVE-\d{4}-\d+\].*SQL | Database Team| regex     |
```

**Team Name Fuzzy Matching**:
- If imported team name doesn't match exactly, VAAS attempts fuzzy match
- If 85%+ similarity, auto-corrects to existing team
- Import summary shows all auto-corrections

---

### 3. User Management

**Capability**: Create, modify, and delete user accounts

#### Create New Users

```
1. Navigate to Settings → User Management
2. Click "Add User"
3. Enter:
   - Username
   - Display Name
   - Email
   - Password (if local auth)
   - Role (Viewer, SecAdmin, Admin)
   - Auth Type (Local or LDAP)
4. Click "Create User"
```

#### Edit Users

```
1. Locate user in user management table
2. Click "Edit"
3. Modify role, display name, or email
4. Click "Update"
```

**Note**: Cannot change username; create new user instead

#### Deactivate/Delete Users

```
1. Locate user
2. Click "Deactivate" (soft delete) or "Delete" (permanent)
3. Confirm action
```

**Best Practice**: Deactivate instead of delete for audit trail

---

### 4. LDAP Configuration

**Capability**: Integrate with Active Directory / LDAP for enterprise authentication

#### LDAP Settings

Configure in environment variables or settings panel:

```bash
LDAP_SERVER=ldap.corp.example.com
LDAP_PORT=389
LDAP_USE_SSL=false
LDAP_BASE_DN=dc=corp,dc=example,dc=com
LDAP_USER_DN=ou=employees,dc=corp,dc=example,dc=com
LDAP_BIND_USER=cn=svc_vaas,ou=services,dc=corp,dc=example,dc=com
LDAP_BIND_PASSWORD=<secure_password>
```

#### LDAP User Auto-Provisioning

When LDAP user logs in for first time:
1. VAAS authenticates against LDAP
2. Creates local user record
3. Assigns default role (Viewer)
4. Admin can upgrade role as needed

---

### 5. Database Settings

**Capability**: Configure database backend and view statistics

#### Supported Databases

- SQLite (default, single-server)
- MySQL/MariaDB (recommended for production)
- PostgreSQL (recommended for production)
- SQL Server / Azure SQL (enterprise environments)

#### Database Configuration

**Via Environment Variables**:
```bash
DB_TYPE=mysql
DB_HOST=mysql.internal.example.com
DB_PORT=3306
DB_NAME=vaas_production
DB_USER=vaas_user
DB_PASSWORD=<secure_password>
DB_SSL_ENABLED=true
```

**Via Settings UI** (if implemented):
1. Navigate to Settings → Database
2. Select database type
3. Enter connection details
4. Test connection
5. Apply changes (requires restart)

#### Database Statistics

**View Stats**:
```
1. Settings → Database Settings → Statistics
2. View:
   - Total hostnames in KB
   - Total title rules in KB
   - Number of teams
   - Database size
   - Last backup timestamp
```

#### Database Maintenance

**Duplicate Detection**:
```
1. Settings → Database → Find Duplicates
2. Review duplicate rules
3. Click "Remove Duplicates" to clean
```

**Optimize Tables** (MySQL):
```sql
OPTIMIZE TABLE hostnames;
OPTIMIZE TABLE rules;
```

---

### 6. System Configuration

#### Classification Threshold

**What it does**: Minimum confidence score for fuzzy matching (default: 0.85)

**How to adjust**:
```bash
# Environment variable
VAAS_THRESHOLD=0.90  # More strict (fewer fuzzy matches)
VAAS_THRESHOLD=0.80  # More lenient (more fuzzy matches)
```

**Recommendations**:
- 0.90-1.0: High precision, fewer false positives, more manual review
- 0.85-0.89: Balanced (recommended)
- 0.80-0.84: High recall, more automation, more false positives

#### Data Directory

**Configure storage location**:
```bash
DATA_DIR=/mnt/shared-storage/vaas/data
```

**Contents**:
- SQLite database (if using SQLite)
- Uploaded files (auto-deleted after 7 days)
- Exported reports (temporary)
- Logs

#### Upload Limits

**Configure in application**:
- Max file size: 50MB (default)
- Max rows: 10,000 (default)
- Allowed extensions: .xlsx, .xls

---

## Advanced Administrative Tasks

### 1. Migrate from SQLite to External Database

```bash
# 1. Export current KB
curl http://localhost:5001/kb/export > kb_backup.xlsx

# 2. Update database configuration
export DB_TYPE=mysql
export DB_HOST=mysql.internal.com
export DB_NAME=vaas_production
# ... other DB settings

# 3. Restart application (auto-creates tables)
systemctl restart vaas

# 4. Import KB
curl -X POST -F "file=@kb_backup.xlsx" \
  http://localhost:5001/kb/import
```

### 2. Bulk Team Rename

**When**: Team names change due to org restructure

```
1. Export KB
2. Edit Excel file: Find/Replace old team name → new team name
3. Import KB with "Replace" mode
4. Verify in Knowledge Base UI
```

### 3. Audit and Clean Knowledge Base

**Monthly Maintenance**:
```
1. Export KB for backup
2. Review duplicate rules
3. Check for obsolete team names
4. Verify regex patterns are still valid
5. Remove test/development rules
6. Re-import cleaned KB
```

### 4. Performance Tuning

**If classification is slow**:
1. Check database indexes (should be automatic in v4.0)
2. Increase classification threshold (fewer fuzzy matches)
3. Optimize fuzzy match patterns (remove overly broad patterns)
4. Scale horizontally (add more app instances)

**Database Index Verification**:
```sql
-- MySQL
SHOW INDEX FROM rules;
SHOW INDEX FROM hostnames;

-- Should see:
-- idx_rules_team on rules(team)
-- idx_hostnames_team on hostnames(team)
```

---

## Security Best Practices

### 1. Secret Management

- Never commit `.env` files to version control
- Use strong, unique passwords
- Rotate secrets regularly
- Use Docker secrets or Kubernetes secrets in production

### 2. User Account Hygiene

- Deactivate accounts of departed employees
- Review user roles quarterly
- Use principle of least privilege
- Require strong passwords for local accounts

### 3. Knowledge Base Protection

- Backup KB before major changes
- Test imports in staging environment first
- Review audit logs for unauthorized changes
- Restrict Admin role to trusted personnel

### 4. Database Security

- Enable SSL/TLS for database connections
- Use firewalls to restrict database access
- Regular security patches
- Encrypt backups

---

## Troubleshooting Admin Issues

### KB Import Fails

**Symptoms**: Import error, no rules added

**Solutions**:
1. Verify Excel file format (correct column names)
2. Check for special characters in patterns
3. Review import logs
4. Test with small sample file first

### Users Cannot Login

**LDAP Issues**:
1. Test LDAP connection: `ldapsearch -x -H ldap://server -D "bind_user" -W`
2. Verify LDAP settings in environment variables
3. Check firewall allows LDAP port
4. Review LDAP logs

**Local User Issues**:
1. Verify user is active (not deactivated)
2. Reset password
3. Check session secret key is set

### Database Connection Errors

1. Test connection manually:
   ```bash
   # MySQL
   mysql -h host -u user -p database

   # PostgreSQL
   psql -h host -U user -d database
   ```
2. Verify environment variables
3. Check firewall rules
4. Review database logs

### Classification Inaccurate

**Diagnosis**:
1. Review Knowledge Base for conflicting rules
2. Check classification priority (System Admin > Out of Scope > Others > Application)
3. Verify fuzzy match threshold
4. Review recent KB imports

**Fix**:
1. Edit/delete conflicting rules
2. Adjust priority by updating team names
3. Tune threshold
4. Restore KB from backup if needed

---

## Workflows

### Onboard New Admin

```
1. Create Admin user account
2. Provide access to documentation
3. Grant access to production systems (if applicable)
4. Review current Knowledge Base structure
5. Explain team priority model
6. Shadow existing admin for one cycle
```

### Quarterly KB Maintenance

```
1. Export current KB (backup)
2. Review with stakeholders:
   - Obsolete teams
   - Missing patterns
   - Inaccurate rules
3. Bulk edit in Excel
4. Import with Merge mode
5. Test with sample files
6. Document changes in audit log
```

### Emergency Rollback

```
1. Identify issue (incorrect KB state)
2. Locate last good backup (from exports)
3. Import backup with Replace mode
4. Verify classification accuracy
5. Root cause analysis
6. Document incident
```

---

## Reporting and Analytics

### KB Statistics

**View via API or UI**:
- Total rules: `SELECT COUNT(*) FROM rules`
- Rules by team: `SELECT team, COUNT(*) FROM rules GROUP BY team`
- Hostname coverage: `SELECT COUNT(*) FROM hostnames`

### Audit Reports

**Generate Monthly Reports**:
```
1. Settings → Audit Logs
2. Filter by date range (e.g., last month)
3. Export to CSV
4. Analyze:
   - Login patterns
   - KB modifications
   - User activity
   - Classification volume
```

### Usage Analytics

**Track**:
- Files uploaded per week
- Average classification time
- Fuzzy match confirmation rate
- Manual override frequency

**Optimize Based On**:
- High manual override rate → Add KB rules
- Many unclassified items → Expand KB coverage
- Slow classification → Performance tuning

---

## API Access (Advanced)

### Knowledge Base API

**Get all KB data**:
```bash
curl -X GET http://localhost:5001/kb/data
```

**Add title rule**:
```bash
curl -X POST http://localhost:5001/kb/add_rule \
  -H "Content-Type: application/json" \
  -d '{"type":"title", "key":"Apache HTTP", "team":"System Admin"}'
```

**Add hostname rule**:
```bash
curl -X POST http://localhost:5001/kb/add_rule \
  -H "Content-Type: application/json" \
  -d '{"type":"hostname", "key":"web-prod-01", "team":"Web Ops"}'
```

---

## Integration Examples

### SIEM Integration

Forward audit logs to SIEM:
```bash
# Example: Send to Splunk
tail -f /app/data/logs/audit.log | \
  while read line; do
    curl -X POST "https://splunk.example.com:8088/services/collector" \
      -H "Authorization: Splunk <token>" \
      -d "{\"event\":\"$line\"}"
  done
```

### Ticketing System Integration

Auto-create tickets for high-severity unclassified items:
```python
# Pseudo-code
if item.severity == "Critical" and item.assigned_team == "Unclassified":
    create_jira_ticket(
        summary=f"Manual classification needed: {item.title}",
        description=f"Hostname: {item.hostname}\nVulnerability: {item.title}",
        assignee="security-team"
    )
```

---

## Best Practices

1. **Change Management**: Document all KB changes
2. **Testing**: Test major changes in staging first
3. **Backups**: Daily automated backups + manual before changes
4. **Access Control**: Limit Admin role to 2-3 personnel
5. **Monitoring**: Set up alerts for failed classifications
6. **Documentation**: Keep runbooks updated
7. **Training**: Train team on classification methodology
8. **Auditing**: Review audit logs monthly

---

## Getting Help

- **Documentation**: This guide + SETUP.md + DEPLOYMENT.md
- **Support**: Contact VAAS development team
- **Community**: Internal wiki or knowledge base
- **Emergency**: Escalation procedures for production issues

---

## Appendix: Team Priority Model

**How VAAS Classifies** (in order):

1. **System Admin** (Highest Priority)
   - Infrastructure services
   - Operating system components
   - Match on title only

2. **Out of Scope**
   - Out of Linux Scope
   - Out of Platform Scope
   - Items not managed by organization

3. **Other Teams**
   - Custom business teams
   - Application-specific teams

4. **Application** (Lowest Priority)
   - Requires hostname owner lookup
   - Fallback category
   - Often needs manual review

**Implication**: If same title matches multiple rules, highest priority wins
