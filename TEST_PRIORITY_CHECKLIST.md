# VAAS Test Priority Checklist

**Quick Reference Guide for Test Implementation**

---

## CRITICAL Priority (Implement First - Week 1-2)

### 1. API Security Tests

**Files to Create:**
- [ ] `tests/security/test_api_security.py`

**Test Cases:**
- [ ] SQL injection in `/classify` endpoint
- [ ] XSS payloads in team names
- [ ] Path traversal in file uploads
- [ ] Malicious Excel files (ZIP bombs, XXE)
- [ ] File type validation bypass attempts
- [ ] File size limit enforcement
- [ ] Invalid JSON payloads
- [ ] Missing required fields

**Why Critical:** Prevents security breaches in production

---

### 2. Authentication & Authorization Tests

**Files to Create:**
- [ ] `tests/security/test_auth_security.py`
- [ ] `tests/integration/test_user_management.py`

**Test Cases:**
- [ ] Brute force login attempts
- [ ] SQL injection in login form
- [ ] Session hijacking prevention
- [ ] Open redirect vulnerability (test whitelist)
- [ ] Role-based access control (RBAC) per endpoint
- [ ] Anonymous access when auth disabled
- [ ] Self-deletion prevention
- [ ] Password complexity enforcement
- [ ] Concurrent session handling

**Why Critical:** Prevents unauthorized access and data breaches

---

### 3. Classifier Edge Cases

**Files to Create:**
- [ ] `tests/unit/test_classifier_edge_cases.py`

**Test Cases:**
- [ ] Empty DataFrame
- [ ] Null/NaN in Title and hostname columns
- [ ] Very long titles (>1000 chars)
- [ ] Special characters in patterns
- [ ] Unicode/emoji in titles
- [ ] Duplicate patterns with different teams
- [ ] All column name variations
- [ ] Missing required columns

**Why Critical:** Core business logic must handle all inputs safely

---

### 4. Knowledge Base Data Integrity

**Files to Create:**
- [ ] `tests/unit/test_knowledge_base.py`
- [ ] `tests/integration/test_kb_import_export.py`

**Test Cases:**
- [ ] Import with malformed Excel files
- [ ] Export with special characters
- [ ] Concurrent rule modifications
- [ ] Team name fuzzy matching at 85% threshold
- [ ] Upsert race conditions
- [ ] Database transaction rollbacks
- [ ] Large import files (10,000+ rules)

**Why Critical:** Data corruption can invalidate all classifications

---

## HIGH Priority (Week 3-4)

### 5. API Endpoint Integration Tests

**Files to Create:**
- [ ] `tests/integration/test_api_classify.py`
- [ ] `tests/integration/test_api_export.py`
- [ ] `tests/integration/test_api_kb.py`
- [ ] `tests/integration/test_api_reports.py`

**Test Cases Per Endpoint:**

**`/classify` POST:**
- [ ] Valid Excel file classification
- [ ] Invalid file types rejected
- [ ] Large files (>10MB)
- [ ] Concurrent uploads
- [ ] Database save failures
- [ ] Response format validation

**`/export` POST:**
- [ ] Master export format
- [ ] Team reports ZIP format
- [ ] Empty data handling
- [ ] Large dataset export
- [ ] Special characters in filenames

**`/kb/bulk_add_rules` POST:**
- [ ] Successful bulk save
- [ ] Reclassification after save
- [ ] Invalid rule format
- [ ] Duplicate rule handling

**`/api/db/cleanup` POST:**
- [ ] Admin-only access enforcement
- [ ] Safe deletion with retention
- [ ] Duplicate detection accuracy
- [ ] VACUUM operation

---

### 6. Database Provider Tests

**Files to Create:**
- [ ] `tests/integration/test_db_sqlite.py`
- [ ] `tests/integration/test_db_postgresql.py`
- [ ] `tests/integration/test_db_mysql.py`
- [ ] `tests/integration/test_db_mssql.py`

**Test Cases (Each Provider):**
- [ ] Connection creation and pooling
- [ ] Table creation with constraints
- [ ] UPSERT operations
- [ ] Pagination (LIMIT/OFFSET vs FETCH NEXT)
- [ ] Transaction handling
- [ ] Error handling
- [ ] Placeholder conversion (? vs %s)

---

### 7. Reports Database Operations

**Files to Create:**
- [ ] `tests/integration/test_reports_db.py`

**Test Cases:**
- [ ] Create report with large dataset (10,000 items)
- [ ] Pagination edge cases
- [ ] UUID validation
- [ ] Concurrent report creation
- [ ] Original_data JSON serialization
- [ ] DateTime and Timestamp handling
- [ ] MSSQL SCOPE_IDENTITY() handling
- [ ] Cascade delete verification

---

## MEDIUM Priority (Week 5-6)

### 8. Frontend Component Tests

**Files to Create:**
- [ ] `frontend/src/features/upload/__tests__/UploadView.test.jsx`
- [ ] `frontend/src/features/review/__tests__/DataTable.test.jsx`
- [ ] `frontend/src/features/knowledgebase/__tests__/KnowledgeBaseView.test.jsx`
- [ ] `frontend/src/services/__tests__/api.test.js`

**Setup Required:**
- [ ] Install Vitest
- [ ] Install React Testing Library
- [ ] Install MSW (Mock Service Worker)
- [ ] Create `vitest.config.js`
- [ ] Create test setup file

**Test Cases:**

**UploadView:**
- [ ] File drag and drop
- [ ] File type validation
- [ ] File size validation
- [ ] Upload progress
- [ ] Error handling

**DataTable:**
- [ ] Large dataset rendering (virtual scroll)
- [ ] Column sorting
- [ ] Filtering
- [ ] Row selection
- [ ] Inline editing

**API Service:**
- [ ] Fetch error handling
- [ ] Retry logic
- [ ] Response parsing
- [ ] Blob download

---

### 9. LDAP Authentication Tests

**Files to Create:**
- [ ] `tests/integration/test_ldap.py`

**Test Cases:**
- [ ] LDAP connection success
- [ ] LDAP connection failure
- [ ] User search functionality
- [ ] Group membership resolution
- [ ] SSL/TLS verification
- [ ] Service account authentication
- [ ] Timeout handling
- [ ] Invalid configuration

**Note:** Requires LDAP test server (consider using docker)

---

### 10. Configuration & Environment Tests

**Files to Create:**
- [ ] `tests/unit/test_config.py`

**Test Cases:**
- [ ] Environment variable loading
- [ ] Default values
- [ ] Path creation
- [ ] Invalid paths
- [ ] File permission issues
- [ ] Missing environment variables

---

## MEDIUM-LOW Priority (Week 7-8)

### 11. Logging & Audit Tests

**Files to Create:**
- [ ] `tests/unit/test_logging.py`

**Test Cases:**
- [ ] Log file creation
- [ ] Log rotation
- [ ] Audit trail completeness
- [ ] Security event logging
- [ ] Performance logging
- [ ] File permission verification

---

### 12. Database Optimizer Tests

**Files to Create:**
- [ ] `tests/integration/test_db_optimizer.py`

**Test Cases:**
- [ ] Duplicate detection
- [ ] Old report cleanup
- [ ] Retention policy enforcement
- [ ] VACUUM operation
- [ ] Statistics accuracy

---

### 13. Permission System Tests

**Files to Create:**
- [ ] `tests/unit/test_permissions.py`

**Test Cases:**
- [ ] Role hierarchy
- [ ] Permission decorator
- [ ] Anonymous user handling
- [ ] LDAP user permissions
- [ ] Permission inheritance

---

## Performance Tests (Week 9)

### 14. Performance Benchmarks

**Files to Create:**
- [ ] `tests/performance/test_classification_performance.py`
- [ ] `tests/performance/test_database_performance.py`

**Benchmarks:**
- [ ] Classify 1,000 rows in <5 seconds
- [ ] Classify 10,000 rows in <30 seconds
- [ ] Create report with 10,000 items in <10 seconds
- [ ] Import KB with 1,000 rules in <5 seconds
- [ ] Export report in <5 seconds
- [ ] Memory usage <500MB for 10,000 rows

---

## E2E Tests (Week 10)

### 15. End-to-End Workflows

**Files to Create:**
- [ ] `tests/e2e/test_classification_workflow.py`
- [ ] `tests/e2e/test_kb_workflow.py`
- [ ] `tests/e2e/test_user_workflow.py`

**Workflows:**
- [ ] Full classification: Upload → Classify → Review → Save KB → Re-classify → Export
- [ ] KB management: Import → Add rules → Export → Re-import → Verify
- [ ] User management: Create admin → Create users → Login → Permission checks
- [ ] Database migration: SQLite → PostgreSQL → MySQL

---

## Test Infrastructure Setup

### Required Files to Create:

**Backend:**
- [ ] `/home/ziad/VAAS_V1.0/pytest.ini`
- [ ] `/home/ziad/VAAS_V1.0/conftest.py`
- [ ] `/home/ziad/VAAS_V1.0/tests/__init__.py`
- [ ] `/home/ziad/VAAS_V1.0/tests/fixtures/__init__.py`
- [ ] `/home/ziad/VAAS_V1.0/tests/fixtures/sample_data.py`
- [ ] `/home/ziad/VAAS_V1.0/tests/mocks/__init__.py`

**Frontend:**
- [ ] `/home/ziad/VAAS_V1.0/frontend/vitest.config.js`
- [ ] `/home/ziad/VAAS_V1.0/frontend/src/test/setup.js`
- [ ] `/home/ziad/VAAS_V1.0/frontend/src/test/mocks/handlers.js`

**CI/CD:**
- [ ] `/home/ziad/VAAS_V1.0/.github/workflows/test.yml`

### Dependencies to Install:

**Backend (requirements-dev.txt):**
```
pytest>=7.4.0
pytest-cov>=4.1.0
pytest-mock>=3.11.1
pytest-asyncio>=0.21.1
faker>=19.0.0
factory-boy>=3.3.0
responses>=0.23.0
freezegun>=1.2.2
```

**Frontend (package.json):**
```json
{
  "devDependencies": {
    "vitest": "^1.0.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@testing-library/user-event": "^14.0.0",
    "msw": "^2.0.0",
    "@vitest/ui": "^1.0.0",
    "@vitest/coverage-v8": "^1.0.0"
  }
}
```

---

## Progress Tracking

**Total Test Files to Create:** 30+
**Estimated Test Cases:** 500+
**Current Coverage:** ~5%
**Target Coverage:** 80%

**Weekly Goals:**
- Week 1-2: Critical security and auth tests (15% coverage)
- Week 3-4: API and database tests (35% coverage)
- Week 5-6: Frontend and integration tests (55% coverage)
- Week 7-8: Remaining integration tests (70% coverage)
- Week 9-10: Performance and E2E tests (80% coverage)

---

## Quick Commands

**Run all tests:**
```bash
# Backend
pytest tests/ -v --cov=vaas --cov-report=html

# Frontend
cd frontend && npm test
```

**Run specific test category:**
```bash
# Security tests only
pytest tests/security/ -v

# Integration tests only
pytest tests/integration/ -v

# Performance tests
pytest tests/performance/ -v --benchmark-only
```

**Generate coverage report:**
```bash
pytest --cov=vaas --cov-report=html --cov-report=term
open htmlcov/index.html
```

---

## Risk Mitigation Priority

1. **CRITICAL:** Authentication/Authorization tests (Week 1)
2. **CRITICAL:** API Security tests (Week 1)
3. **HIGH:** Database integrity tests (Week 2)
4. **HIGH:** Classification edge cases (Week 2)
5. **MEDIUM:** Frontend validation (Week 5)

**Deploy to production only after completing Critical and High priority tests.**
