# VAAS Viewer Role - Feature Guide

The **Viewer** role provides read-only access to VAAS core functionality for vulnerability classification and reporting.

## Role Overview

**Permission Level**: Basic
**Primary Use Case**: Security analysts who need to classify vulnerabilities and generate reports

## Available Features

### 1. Upload and Classify Vulnerabilities

**Capability**: Upload vulnerability scan files for automated classification

**How to Use**:
1. Navigate to the home page
2. Click "Choose File" or drag-and-drop Excel file
3. Supported formats: `.xlsx`, `.xls`
4. Wait for classification to complete
5. Review results in the classification table

**File Requirements**:
- Must contain columns: `Title` or `Vulnerability`, `hostname` or `DNS Name`
- Maximum file size: 50MB
- Maximum rows: 10,000 (configurable)

**Expected Output**:
- Assigned_Team: The team responsible for remediation
- Method: Classification method (Rule, Fuzzy, Manual Override)
- Confidence Score: For fuzzy matches only
- Needs_Review: Flag indicating manual review needed

---

### 2. View Classification Results

**Capability**: Review and analyze classified vulnerabilities

**Table Features**:
- **Sorting**: Click column headers to sort
- **Filtering**: Search box for quick filtering
- **Pagination**: Navigate large datasets
- **Color Coding**:
  - Green: Automated classification (high confidence)
  - Yellow: Fuzzy match (needs review)
  - Red: Unclassified or requires manual assignment

**Statistics Dashboard**:
- Total Items: Total vulnerabilities processed
- Auto-Classified: Items classified with high confidence
- Needs Review: Items requiring manual verification
- Fuzzy Matches: Items matched using fuzzy logic

---

### 3. Export Reports

**Capability**: Generate and download classification reports

**Export Options**:

#### Master Excel Report
- Contains all classified items
- Includes all original columns plus classification data
- Format: Single Excel file with all results

**How to Export**:
1. Complete classification
2. Click "Export" button
3. Select "Master Excel"
4. File downloads automatically

#### Team-Specific ZIP
- Separate Excel files per team
- Only includes items assigned to each team
- Organized by team name

**How to Export**:
1. Complete classification
2. Click "Export" button
3. Select "Teams ZIP"
4. Extract ZIP to view individual team files

**Use Cases**:
- **Master Excel**: Full audit trail, management reporting
- **Teams ZIP**: Distribute remediation tasks to specific teams

---

## Limitations (Viewer Role)

### Cannot Perform:

- Cannot override automated team assignments
- Cannot save corrections to Knowledge Base
- Cannot confirm fuzzy matches as permanent rules
- Cannot modify Knowledge Base (add/edit/delete rules)
- Cannot manage users or system settings
- Cannot access audit logs

### Read-Only Access:
- Can view Knowledge Base but cannot modify
- Can view classification results but cannot edit assignments
- Can export data but cannot import new rules

---

## Workflows

### Basic Classification Workflow

```
1. Upload File
   ↓
2. Wait for Classification (automatic)
   ↓
3. Review Results
   ↓
4. Export Reports
   ↓
5. Distribute to Teams
```

### Quality Assurance Workflow

```
1. Review "Needs Review" Items
   ↓
2. Verify Fuzzy Matches (visual inspection)
   ↓
3. Note any misclassifications
   ↓
4. Report issues to SecAdmin or Admin
   (for Knowledge Base updates)
```

---

## Tips for Viewers

### Optimizing Classification Accuracy

1. **Ensure Clean Data**:
   - Remove duplicate rows before upload
   - Verify hostname format consistency
   - Check for special characters in titles

2. **Understand Classification Priority**:
   - System Admin rules (highest priority)
   - Out of Scope rules
   - Other Team rules
   - Application rules (lowest priority)

3. **Interpret Confidence Scores**:
   - 90-100%: Very high confidence, likely correct
   - 85-89%: Moderate confidence, verify if critical
   - Below 85%: Not classified, manual review required

### Best Practices

1. **Review Fuzzy Matches**: Always verify fuzzy matched items before distributing to teams
2. **Check Unclassified Items**: Items marked "Unclassified" may need admin attention
3. **Validate Exports**: Spot-check exported files before sending to teams
4. **Report Patterns**: If you notice recurring misclassifications, report to admins

### Common Questions

**Q: Why are some items marked "Needs Review"?**
A: Items are flagged for review when:
- Fuzzy matching was used (not exact rule match)
- Team assigned is "Unclassified"
- Team assigned is "Application" but hostname owner is unknown

**Q: Can I re-classify an item?**
A: Viewer role cannot modify assignments. Request SecAdmin or Admin assistance.

**Q: How do I get items added to the Knowledge Base?**
A: Document misclassifications and request Admin to add rules.

**Q: What if my file fails to upload?**
A: Check file format, size, and required columns. Contact support if issue persists.

---

## Interface Guide

### Home Screen
- Upload area (center)
- Previous analysis indicator (if applicable)
- Navigation to Knowledge Base (read-only view)

### Classification Table
- Scrollable table with all results
- Filter/search at top
- Export buttons at bottom
- Statistics summary card

### Navigation
- **Home Icon**: Return to upload screen
- **Database Icon**: View Knowledge Base (read-only)
- **Settings Icon**: View user profile (cannot modify system settings)
- **Logout**: End session (if authentication enabled)

---

## Getting Help

- **In-App**: Hover over icons for tooltips
- **Documentation**: See SETUP.md for initial configuration
- **Support**: Contact system administrator
- **Training**: Request access to VAAS training materials

---

## Security Notes

- All uploads are logged (if audit logging enabled)
- Uploaded files are automatically deleted after 7 days
- No sensitive data (passwords, secrets) should be in upload files
- Use HTTPS in production environments

---

## Next Steps

To unlock additional features, request role upgrade to:
- **Security Admin**: For manual classification and fuzzy match confirmation
- **Administrator**: For full Knowledge Base management
