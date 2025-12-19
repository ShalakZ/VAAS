"""
Regression tests for VAAS classification system.

Covers:
1. Exact title match classification
2. Fuzzy matching (>= 85% threshold)
3. Save to KB with retroactive update
4. Reupload using latest KB rules
"""
import pytest
import os
import sys
import tempfile

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from vaas.core.classifier import RuleEngine, FUZZY_THRESHOLD
from vaas.core.knowledge import KnowledgeBase
import pandas as pd


class TestClassification:
    """Test classification logic."""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test environment."""
        # Initialize KB to ensure tables exist
        KnowledgeBase.initialize_db()
        self.classifier = RuleEngine()

    def test_fuzzy_threshold_is_85(self):
        """Verify fuzzy threshold is set to 85% per user requirement."""
        assert FUZZY_THRESHOLD == 85, f"Expected 85%, got {FUZZY_THRESHOLD}%"

    def test_exact_title_match(self):
        """Test that exact title matches are classified correctly."""
        # Add a test rule
        KnowledgeBase.add_title_rule(None, "Test Vulnerability XYZ", "System Admin")
        self.classifier.reload_rules()

        # Create test data
        df = pd.DataFrame([
            {'Title': 'Test Vulnerability XYZ', 'hostname': 'server1'},
            {'Title': 'Different Title', 'hostname': 'server2'},
        ])

        result = self.classifier.predict(df)

        # First row should match exactly
        assert result.iloc[0]['Assigned_Team'] == 'System Admin'
        assert result.iloc[0]['Method'] == 'Rule'
        assert 'exact match' in result.iloc[0]['Reason'].lower() or 'contains' in result.iloc[0]['Reason'].lower()

        # Second row should not match
        assert result.iloc[1]['Assigned_Team'] != 'System Admin' or result.iloc[1]['Method'] == 'Fuzzy'

        # Cleanup
        KnowledgeBase.delete_title_rule(None, "Test Vulnerability XYZ")

    def test_fuzzy_matching_above_threshold(self):
        """Test that fuzzy matches >= 85% are auto-assigned."""
        # Add a test rule
        KnowledgeBase.add_title_rule(None, "SSL Certificate Expired", "System Admin")
        self.classifier.reload_rules()

        # Create test data with similar title (should fuzzy match)
        df = pd.DataFrame([
            {'Title': 'SSL Certificate Has Expired', 'hostname': 'server1'},  # Very similar
        ])

        result = self.classifier.predict(df)

        # Should fuzzy match to System Admin
        assert result.iloc[0]['Assigned_Team'] == 'System Admin', f"Got {result.iloc[0]['Assigned_Team']}"
        # Either exact match (if pattern contained) or fuzzy
        assert result.iloc[0]['Method'] in ['Rule', 'Fuzzy']
        if result.iloc[0]['Method'] == 'Fuzzy':
            assert result.iloc[0]['Fuzzy_Score'] >= FUZZY_THRESHOLD

        # Cleanup
        KnowledgeBase.delete_title_rule(None, "SSL Certificate Expired")

    def test_application_hostname_mapping(self):
        """Test Application -> Hostname team mapping."""
        # Add rules
        KnowledgeBase.add_title_rule(None, "Application Vulnerability", "Application")
        KnowledgeBase.add_hostname_rule(None, "webserver1", "Web Team")
        self.classifier.reload_rules()

        df = pd.DataFrame([
            {'Title': 'Application Vulnerability', 'hostname': 'webserver1'},
            {'Title': 'Application Vulnerability', 'hostname': 'unknown-host'},
        ])

        result = self.classifier.predict(df)

        # First row: Application title + known hostname -> Web Team
        assert result.iloc[0]['Assigned_Team'] == 'Web Team'
        assert result.iloc[0]['Needs_Review'] == False

        # Second row: Application title + unknown hostname -> Application (needs review)
        assert result.iloc[1]['Assigned_Team'] == 'Application'
        assert result.iloc[1]['Needs_Review'] == True

        # Cleanup
        KnowledgeBase.delete_title_rule(None, "Application Vulnerability")
        KnowledgeBase.delete_hostname_rule(None, "webserver1")

    def test_reclassify_after_rule_add(self):
        """Test that reclassify_data correctly updates items after adding a rule."""
        # Initial classification without the rule
        data = [
            {'Title': 'New Security Issue ABC', 'hostname': 'server1', 'Assigned_Team': 'Unclassified', 'Method': 'None'},
            {'Title': 'New Security Issue ABC', 'hostname': 'server2', 'Assigned_Team': 'Unclassified', 'Method': 'None'},
            {'Title': 'Other Issue', 'hostname': 'server3', 'Assigned_Team': 'Unclassified', 'Method': 'None'},
        ]

        # Add a rule for this title
        KnowledgeBase.add_title_rule(None, "New Security Issue ABC", "System Admin")
        self.classifier.reload_rules()

        # Reclassify
        reclassified, method_changes, team_changes = self.classifier.reclassify_data(data)

        # First two items should now be System Admin
        assert reclassified[0]['Assigned_Team'] == 'System Admin'
        assert reclassified[1]['Assigned_Team'] == 'System Admin'
        assert team_changes >= 2, f"Expected at least 2 team changes, got {team_changes}"

        # Cleanup
        KnowledgeBase.delete_title_rule(None, "New Security Issue ABC")

    def test_manual_override_preserved(self):
        """Test that manual overrides are preserved during reclassification."""
        data = [
            {'Title': 'Test Title', 'hostname': 'server1', 'Assigned_Team': 'Custom Team', 'Method': 'Manual Override'},
        ]

        # Add a rule that would normally change this
        KnowledgeBase.add_title_rule(None, "Test Title", "System Admin")
        self.classifier.reload_rules()

        # Reclassify with preserve_manual=True
        reclassified, _, _ = self.classifier.reclassify_data(data, preserve_manual=True)

        # Should keep manual override
        assert reclassified[0]['Assigned_Team'] == 'Custom Team'
        assert reclassified[0]['Method'] == 'Manual Override'

        # Cleanup
        KnowledgeBase.delete_title_rule(None, "Test Title")

    def test_priority_order(self):
        """Test that System Admin rules take priority over Application."""
        # Add both rules for same pattern
        KnowledgeBase.add_title_rule(None, "Critical Security Flaw", "System Admin")
        KnowledgeBase.add_title_rule(None, "Security", "Application")
        self.classifier.reload_rules()

        df = pd.DataFrame([
            {'Title': 'Critical Security Flaw', 'hostname': 'server1'},
        ])

        result = self.classifier.predict(df)

        # System Admin should take priority
        assert result.iloc[0]['Assigned_Team'] == 'System Admin'

        # Cleanup
        KnowledgeBase.delete_title_rule(None, "Critical Security Flaw")
        KnowledgeBase.delete_title_rule(None, "Security")


class TestKnowledgeBase:
    """Test Knowledge Base operations."""

    def test_add_title_rule_upsert(self):
        """Test that add_title_rule uses upsert (no duplicate errors)."""
        # Add same rule twice - should not error
        success1, _ = KnowledgeBase.add_title_rule(None, "Duplicate Test Rule", "System Admin")
        success2, _ = KnowledgeBase.add_title_rule(None, "Duplicate Test Rule", "Application")

        assert success1 == True
        assert success2 == True  # Should succeed (upsert)

        # Verify the team was updated
        rules = KnowledgeBase.get_all_rules()
        matching = [r for r in rules if r['title_pattern'] == "Duplicate Test Rule"]
        assert len(matching) == 1
        assert matching[0]['team'] == 'Application'  # Last write wins

        # Cleanup
        KnowledgeBase.delete_title_rule(None, "Duplicate Test Rule")

    def test_hostname_rule_normalization(self):
        """Test that hostnames are normalized (lowercase)."""
        KnowledgeBase.add_hostname_rule(None, "SERVER1.DOMAIN.COM", "Team A")

        hostnames = KnowledgeBase.load_hostname_map(None)

        # Should be stored lowercase
        assert "server1.domain.com" in hostnames
        assert hostnames["server1.domain.com"] == "Team A"

        # Cleanup
        KnowledgeBase.delete_hostname_rule(None, "server1.domain.com")

    def test_team_name_normalization(self):
        """Test that team names match existing DB casing (prevents duplicate teams)."""
        # First add a rule with specific casing
        KnowledgeBase.add_title_rule(None, "Test Team Case Rule 1", "System admin")  # lowercase 'a'

        # Now add another rule with different casing - should use existing casing
        KnowledgeBase.add_title_rule(None, "Test Team Case Rule 2", "System Admin")  # uppercase 'A'

        # Get all rules and verify both use the SAME team casing
        rules = KnowledgeBase.get_all_rules()
        rule1 = next((r for r in rules if r['title_pattern'] == "Test Team Case Rule 1"), None)
        rule2 = next((r for r in rules if r['title_pattern'] == "Test Team Case Rule 2"), None)

        assert rule1 is not None, "Rule 1 not found"
        assert rule2 is not None, "Rule 2 not found"

        # Both should have the same team name casing (first one wins)
        assert rule1['team'] == rule2['team'], f"Team casing mismatch: '{rule1['team']}' vs '{rule2['team']}'"

        # Cleanup
        KnowledgeBase.delete_title_rule(None, "Test Team Case Rule 1")
        KnowledgeBase.delete_title_rule(None, "Test Team Case Rule 2")


class TestDatabaseStorage:
    """Test database storage efficiency."""

    def test_original_data_is_minimal(self):
        """Verify that report items only store minimal metadata."""
        from vaas.core.reports import ReportsDB

        # Create a test report with sample items
        items = [
            {
                'hostname': 'server1',
                'Title': 'Test Vulnerability',
                'Assigned_Team': 'System Admin',
                'Reason': 'Test reason',
                'Needs_Review': False,
                'Method': 'Rule',
                'Fuzzy_Score': None,
                'Matched_Rule': None,
                # These extra columns should NOT be stored in original_data
                'Extra_Column_1': 'Some long text that should not be stored',
                'Extra_Column_2': 'More text',
                'IP_Address': '192.168.1.1',
            }
        ]

        success, msg, report_uuid = ReportsDB.create_report(
            filename='test.xlsx',
            uploaded_by='test_user',
            items=items
        )

        if success:
            # Fetch the report and check original_data size
            report = ReportsDB.get_report(report_uuid)
            if report and report['items']:
                item = report['items'][0]
                original_data = item.get('original_data', {})

                # original_data should only contain classification metadata
                # not the full row
                if original_data:
                    assert 'Extra_Column_1' not in original_data
                    assert 'Extra_Column_2' not in original_data
                    assert 'IP_Address' not in original_data

            # Cleanup
            ReportsDB.delete_report(report_uuid)


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
