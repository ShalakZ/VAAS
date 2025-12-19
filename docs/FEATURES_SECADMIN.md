# VAAS Security Admin Role - Feature Guide

The **Security Admin** (SecAdmin) role extends Viewer capabilities with manual classification override and fuzzy match confirmation permissions.

## Role Overview

**Permission Level**: Intermediate
**Primary Use Case**: Senior security analysts who validate and refine classification results

## Inherited Features (from Viewer)

- Upload and classify vulnerabilities
- View classification results
- Export reports (Master Excel, Teams ZIP)

## Additional Security Admin Features

### 1. Manual Classification Override

**Capability**: Override automated team assignments for individual vulnerabilities

**When to Use**:
- Automated classification is incorrect
- Business context requires different team assignment
- Temporary reassignment for specific incidents
- Handling edge cases not covered by Knowledge Base

**How to Use**:
1. In the classification table, locate the row to modify
2. Click the team dropdown in the "Assigned_Team" column
3. Select the correct team from the list
4. Assignment is marked as "Manual Override"
5. Item is automatically removed from "Needs Review" if previously flagged

**Important Notes**:
- Manual overrides are NOT saved to the Knowledge Base
- Overrides apply only to the current session/upload
- On re-classification, manual overrides are preserved
- Method changes to "Manual Override" to indicate human intervention

**Best Practices**:
- Document why you overrode automated classification
- If pattern is recurring, request Admin to add KB rule
- Verify hostname and title before overriding
- Use consistent team names from dropdown

---

### 2. Confirm Fuzzy Matches

**Capability**: Promote fuzzy-matched items to permanent Knowledge Base rules

**What are Fuzzy Matches?**
- Items classified with similarity score (85-95%)
- Not exact rule matches but close enough
- Require validation before trust

**When to Confirm**:
- Fuzzy match is consistently correct across multiple files
- Pattern is repeatable and should be automated in future
- Confidence score is high (90%+) and verified manually

**How to Confirm**:
1. Review the fuzzy-matched item in the table
2. Verify the assignment is correct
3. Click "Confirm" button in the action column
4. Confirm the prompt dialog
5. Rule is added to Knowledge Base permanently

**What Happens When Confirmed**:
- **For System Teams** (System Admin, Out of Scope):
  - Title pattern → Team mapping is saved
  - Future uploads with same title auto-classify to this team

- **For Application Teams**:
  - Hostname → Team mapping is saved
  - Future uploads with same hostname auto-classify to this team

**Auto Re-classification**:
- After confirmation, current table is automatically re-classified
- Items matching the new rule upgrade from Fuzzy to Rule method
- "Needs Review" flag is removed
- You'll see a summary of how many items were upgraded

**Caution**:
- Only confirm if you're certain the pattern is correct
- Incorrect confirmations pollute the Knowledge Base
- Cannot be undone without Admin access
- Affects future classifications system-wide

---

### 3. Save Manual Corrections to Knowledge Base

**Capability**: Batch save multiple manual overrides as permanent rules

**When to Use**:
- Made multiple manual overrides in current session
- Want to automate these corrections for future uploads
- Building out Knowledge Base with validated patterns

**How to Use**:
1. Make manual overrides in the classification table
2. Click "Save to KB" button (bottom of page)
3. Review the confirmation dialog showing:
   - Number of corrections found
   - Number of unique hostnames to be saved
   - Number of unique title patterns to be saved
4. Confirm to save

**What Gets Saved**:
- **Hostnames**: For non-System Admin teams
- **Titles**: For System Admin, Out of Scope teams, and special categories

**Auto Re-classification**:
- After saving, current table is automatically re-classified
- Items matching new rules upgrade from Manual Override to Rule
- Summary shows how many items were upgraded

**Important Notes**:
- De-duplication is automatic (only unique patterns saved)
- Existing rules are updated if conflicts exist
- All manual overrides contribute to KB, even if same pattern multiple times

---

### 4. View Audit Logs

**Capability**: View classification history and user actions (if audit logging enabled)

**What's Logged**:
- File uploads
- Manual overrides
- Fuzzy match confirmations
- Knowledge Base saves
- User logins/logouts

**Access**: Settings → Audit Logs

**Use Cases**:
- Track who made what changes
- Audit compliance
- Troubleshoot classification issues
- Review team performance

---

## Limitations (Security Admin Role)

### Cannot Perform:

- Cannot add/edit/delete Knowledge Base rules directly
- Cannot import/export Knowledge Base
- Cannot manage users or roles
- Cannot modify system configuration
- Cannot access database settings

### Can Do:
- Override individual item assignments (session-only unless saved to KB)
- Confirm fuzzy matches (adds to KB)
- Save manual corrections in batch (adds to KB)
- View audit logs (read-only)

---

## Workflows

### Validate and Refine Workflow

```
1. Upload File (auto-classification)
   ↓
2. Review Fuzzy Matches
   ↓
3a. Confirm Correct Fuzzy Matches
   OR
3b. Override Incorrect Assignments
   ↓
4. Save Manual Corrections to KB
   ↓
5. Verify Auto Re-classification Results
   ↓
6. Export Final Reports
```

### Quality Control Workflow

```
1. Receive Upload from Viewer
   ↓
2. Spot Check Random Sample (10-20 items)
   ↓
3. Review All "Needs Review" Items
   ↓
4. Confirm High-Confidence Fuzzy Matches (>90%)
   ↓
5. Override Misclassifications
   ↓
6. Save Validated Patterns to KB
   ↓
7. Approve for Distribution
```

---

## Decision Matrix: Override vs. Confirm

| Scenario | Action | Reason |
|----------|--------|--------|
| One-off unique hostname | Manual Override | Not recurring pattern |
| Fuzzy match title, 95% confidence | Confirm Fuzzy | High confidence, add to KB |
| Misclassified system service | Override → Save to KB | Fix and automate |
| Temporary reassignment for incident | Manual Override only | Don't add to KB |
| 5+ items with same misclassification | Override all → Save to KB | Recurring pattern |

---

## Best Practices for Security Admins

### Fuzzy Match Validation

1. **Check Confidence Score**:
   - 95-100%: Usually safe to confirm
   - 90-94%: Verify carefully
   - 85-89%: Manual review recommended

2. **Verify Pattern**:
   - Is this title/hostname pattern truly representative?
   - Will future occurrences always be this team's responsibility?
   - Any exceptions to consider?

3. **Batch Confirmation**:
   - Don't confirm all fuzzy matches blindly
   - Review each before confirmation
   - One bad rule affects thousands of future classifications

### Manual Override Guidelines

1. **When to Override**:
   - Clear misclassification
   - Business context requires different team
   - Hostname ownership changed
   - Special handling for critical vulnerabilities

2. **When NOT to Override**:
   - Uncertainty about correct team
   - Pattern might change in future
   - Temporary situation (use case-by-case judgment)

3. **Documentation**:
   - Keep notes on why you overrode
   - Share patterns with Admins for KB updates
   - Document business rules that aren't in system

### Saving to Knowledge Base

1. **Before Saving**:
   - Review all manual overrides
   - Ensure they represent recurring patterns
   - Check for typos in team names
   - Verify duplicates are intentional

2. **After Saving**:
   - Review re-classification results
   - Check if any unexpected changes occurred
   - Validate statistics summary
   - Test with new upload to confirm

---

## Tips and Tricks

### Efficient Validation

1. **Sort by Confidence Score**: Review lowest scores first
2. **Filter by Method**: Focus on "Fuzzy" items
3. **Use Team Filter**: Validate one team at a time
4. **Keyboard Shortcuts**: Tab through dropdown selections

### Common Patterns to Confirm

- Generic vulnerability titles with consistent team ownership
- Application names that always belong to same team
- Infrastructure components (DNS, DHCP, etc.) for System Admin
- Cloud services for specific teams

### Common Mistakes to Avoid

1. **Confirming False Positives**: Fuzzy match may be wrong despite high score
2. **Saving Temporary Overrides**: Don't add one-time fixes to KB
3. **Inconsistent Team Names**: Use exact names from dropdown
4. **Over-Automation**: Some items genuinely need manual review each time

---

## Interface Guide

### Additional UI Elements (vs. Viewer)

- **Team Dropdown** (enabled): In each row for manual override
- **Confirm Button**: For fuzzy-matched items
- **Save to KB Button**: At bottom of classification table
- **Manual Override Badge**: Shows which items you've modified

### Confirmation Dialogs

**Fuzzy Match Confirmation**:
```
Confirm this fuzzy match as a permanent KB rule?

Title: "OpenSSL Vulnerability CVE-2024-1234"
Team: System Admin
Confidence: 92%

This will:
1. Add this title rule to the Knowledge Base
2. Update ALL similar items in the current table
```

**Save to KB**:
```
Found 15 corrections.

Extracting:
• 8 Unique Hostnames
• 7 Unique Titles

Saving to Knowledge Base will:
1. Add these rules permanently
2. Apply them to ALL similar items in this table

This means other rows with matching patterns will be
automatically re-classified!

Proceed?
```

---

## Security and Compliance

- All actions are logged in audit trail
- Manual overrides are attributed to your user account
- KB modifications are tracked with timestamp
- Changes are permanent and affect all future users

---

## Getting Help

**Questions?**
- Review FEATURES_VIEWER.md for basic features
- Contact Admin for Knowledge Base structure questions
- Request training on classification methodologies

**Issues?**
- Report incorrect automatic classifications to Admin
- Suggest new team categories to Admin
- Request Knowledge Base cleanup if needed

---

## Next Steps

To unlock full Knowledge Base management:
- Request **Administrator** role for:
  - Direct KB rule add/edit/delete
  - KB import/export
  - User management
  - System configuration
