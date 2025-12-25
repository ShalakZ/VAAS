"""
VAAS Classification Engine
Implements rule-based and fuzzy classification for vulnerability assignment.
"""
import logging
import pandas as pd
import re
from ..config import Config
from ..constants import (
    TEAM_SYSADMIN, TEAM_APPLICATION, TEAM_LINUX_SCOPE, TEAM_PLATFORM_SCOPE, TEAM_UNCLASSIFIED,
    TEAM_SYSADMIN_DISPLAY, TEAM_APPLICATION_DISPLAY, TEAM_LINUX_SCOPE_DISPLAY,
    TEAM_PLATFORM_SCOPE_DISPLAY, TEAM_UNCLASSIFIED_DISPLAY
)
from .knowledge import KnowledgeBase
from rapidfuzz import process, fuzz

logger = logging.getLogger(__name__)

# Configuration
FUZZY_THRESHOLD = 85  # Minimum score for fuzzy matching (user requirement: >= 85%)


class RuleEngine:
    def __init__(self):
        self._load_all_rules()

    def _load_all_rules(self):
        """Load all rules from the knowledge base."""
        # Load Hostname Map
        self.hostname_map = KnowledgeBase.load_hostname_map()

        # Load Title Rules
        self.rules = KnowledgeBase.load_title_rules()

        self._build_fuzzy_index()

        # Log counts
        total_rules = sum(len(rules) for rules in self.rules.values())
        logger.info(f"Classifier initialized: {len(self.hostname_map)} hostnames, {total_rules} title rules across {len(self.rules)} teams")

    def _build_fuzzy_index(self):
        """
        Build fuzzy matching index with team priority.
        Priority Order: Application (lowest) -> Other Teams -> Out of Scope -> System Admin (highest)

        Performance Optimization: Cache normalized team keys and patterns during index build
        """
        self.fuzzy_candidates = {}

        # Cache normalized pattern strings to avoid redundant normalize_str calls
        self.normalized_patterns = {}

        def normalize_team_key(t):
            return t.strip().lower() if t else ''

        # Performance Optimization: Cache priority team keys at index build time
        # This eliminates repeated lookups in _classify_single_row (5-10% performance improvement)
        self._cached_app_key = next((t for t in self.rules.keys() if normalize_team_key(t) == TEAM_APPLICATION), None)
        self._cached_sysadmin_key = next((t for t in self.rules.keys() if normalize_team_key(t) == TEAM_SYSADMIN), None)
        self._cached_scope_key = (
            next((t for t in self.rules.keys() if normalize_team_key(t) == TEAM_LINUX_SCOPE), None) or
            next((t for t in self.rules.keys() if normalize_team_key(t) == TEAM_PLATFORM_SCOPE), None)
        )

        # Cache priority teams list (lowercase)
        self._priority_teams_lower = [TEAM_APPLICATION, TEAM_SYSADMIN, TEAM_LINUX_SCOPE, TEAM_PLATFORM_SCOPE]

        # 1. Load Application First (Weakest - will be overwritten)
        if self._cached_app_key:
            for r in self.rules[self._cached_app_key]:
                pattern = r.get('contains')
                if pattern:
                    pattern_clean = pattern.strip()
                    self.fuzzy_candidates[pattern_clean] = self._cached_app_key
                    # Pre-normalize patterns during index building (10-15% improvement)
                    self.normalized_patterns[pattern_clean] = self._normalize_str(pattern)

        # 2. Load Other Teams (Standard priority)
        for team, rules in self.rules.items():
            if normalize_team_key(team) in self._priority_teams_lower:
                continue
            for r in rules:
                pattern = r.get('contains')
                if pattern:
                    pattern_clean = pattern.strip()
                    self.fuzzy_candidates[pattern_clean] = team
                    self.normalized_patterns[pattern_clean] = self._normalize_str(pattern)

        # 3. Load Out of Scope (Medium-high priority)
        for scope_name in [TEAM_LINUX_SCOPE, TEAM_PLATFORM_SCOPE]:
            scope_key = next((t for t in self.rules.keys() if normalize_team_key(t) == scope_name), None)
            if scope_key:
                for r in self.rules[scope_key]:
                    pattern = r.get('contains')
                    if pattern:
                        pattern_clean = pattern.strip()
                        self.fuzzy_candidates[pattern_clean] = scope_key
                        self.normalized_patterns[pattern_clean] = self._normalize_str(pattern)

        # 4. Load System Admin LAST (highest priority - overwrites everything)
        for sysadmin_name in [TEAM_SYSADMIN, 'systemadmin', 'sysadmin']:
            sysadmin_key = next((t for t in self.rules.keys() if normalize_team_key(t) == sysadmin_name), None)
            if sysadmin_key:
                for r in self.rules[sysadmin_key]:
                    pattern = r.get('contains')
                    if pattern:
                        pattern_clean = pattern.strip()
                        self.fuzzy_candidates[pattern_clean] = sysadmin_key
                        self.normalized_patterns[pattern_clean] = self._normalize_str(pattern)

        logger.debug(f"Built fuzzy index with {len(self.fuzzy_candidates)} patterns (cached {len(self.normalized_patterns)} normalized)")

    def reload_rules(self):
        """Reloads all mappings from database to pick up recent KB changes."""
        self._load_all_rules()

    def _normalize_str(self, s):
        """Normalize string for comparison: lowercase, collapse whitespace."""
        if not s:
            return ''
        return ' '.join(str(s).strip().lower().split())

    def _find_team_key(self, target_lower):
        """Find team key case-insensitively."""
        for t in self.rules.keys():
            if t.strip().lower() == target_lower:
                return t
        return None

    def _check_rules_for_team(self, team_name, title, normalized_title, debug=False):
        """
        Check if title matches any rule for the given team.
        Returns (matched_team, reason_description) or (None, None).

        Performance Optimization: Use cached normalized patterns when available
        """
        if team_name not in self.rules:
            return None, None

        for rule in self.rules[team_name]:
            field = rule.get('field', 'Title')
            if field != 'Title':
                continue

            pattern = rule.get('contains')
            if pattern:
                pattern_clean = pattern.strip()

                # Performance Optimization: Use pre-normalized pattern from cache if available
                if pattern_clean in self.normalized_patterns:
                    normalized_pattern = self.normalized_patterns[pattern_clean]
                else:
                    normalized_pattern = self._normalize_str(pattern)

                # Debug logging for first few items
                if debug:
                    logger.debug(f"Checking: pattern='{normalized_pattern[:50]}' vs title='{normalized_title[:50]}'")

                # Exact match (full title matches rule pattern)
                if normalized_pattern == normalized_title:
                    return team_name, f"Title exact match: '{pattern[:60]}'"

                # Substring match (pattern contained in title)
                if normalized_pattern in normalized_title:
                    return team_name, f"Title contains: '{pattern[:60]}'"

            # Regex match
            regex = rule.get('regex')
            if regex:
                try:
                    if re.search(regex, title, re.IGNORECASE):
                        return team_name, "Title matches regex pattern"
                except re.error:
                    pass

        return None, None

    def _find_rule_match(self, title, normalized_title):
        """
        Find matching rule in priority order.
        Returns (matched_team, rule_desc) or (None, None).
        """
        # Check System Admin FIRST (highest priority)
        if self._cached_sysadmin_key:
            matched_team, rule_desc = self._check_rules_for_team(
                self._cached_sysadmin_key, title, normalized_title
            )
            if matched_team:
                return matched_team, rule_desc

        # Check Out of Scope
        if self._cached_scope_key:
            matched_team, rule_desc = self._check_rules_for_team(
                self._cached_scope_key, title, normalized_title
            )
            if matched_team:
                return matched_team, rule_desc

        # Check Other Teams (not priority ones)
        for team in self.rules.keys():
            if team.strip().lower() in self._priority_teams_lower:
                continue
            matched_team, rule_desc = self._check_rules_for_team(team, title, normalized_title)
            if matched_team:
                return matched_team, rule_desc

        # Check Application LAST (lowest priority)
        if self._cached_app_key:
            matched_team, rule_desc = self._check_rules_for_team(
                self._cached_app_key, title, normalized_title
            )
            if matched_team:
                return matched_team, rule_desc

        return None, None

    def _try_fuzzy_match(self, title, hostname_lower):
        """
        Try fuzzy matching as fallback.
        Returns result dict or None if no match.
        """
        candidates = list(self.fuzzy_candidates.keys())
        if not candidates:
            return None

        top_matches = process.extract(title, candidates, scorer=fuzz.token_set_ratio, limit=10)
        good_matches = [(pat, scr) for pat, scr, _ in top_matches if scr >= FUZZY_THRESHOLD]

        if not good_matches:
            return None

        categories = self._categorize_fuzzy_matches(good_matches)
        chosen = self._select_best_fuzzy_match(categories)

        if chosen:
            return self._apply_fuzzy_match(chosen, hostname_lower)

        return None

    def _classify_single_row(self, title, hostname):
        """
        Classify a single row.
        Returns dict with: Assigned_Team, Reason, Needs_Review, Method, Fuzzy_Score, Matched_Rule
        """
        normalized_title = self._normalize_str(title)
        hostname_lower = hostname.strip().lower() if hostname else ''

        # Step 1: Try rule-based matching
        matched_team, rule_desc = self._find_rule_match(title, normalized_title)
        if matched_team:
            return self._apply_rule_match(matched_team, rule_desc, hostname_lower)

        # Step 2: Try fuzzy matching as fallback
        fuzzy_result = self._try_fuzzy_match(title, hostname_lower)
        if fuzzy_result:
            return fuzzy_result

        # No match found
        return self._get_default_result()

    def _normalize_team_name(self, team_name):
        """Normalize team name to standard casing."""
        if not team_name:
            return TEAM_UNCLASSIFIED_DISPLAY
        team_lower = team_name.strip().lower()
        standard_names = {
            TEAM_SYSADMIN: TEAM_SYSADMIN_DISPLAY,
            TEAM_APPLICATION: TEAM_APPLICATION_DISPLAY,
            TEAM_LINUX_SCOPE: TEAM_LINUX_SCOPE_DISPLAY,
            TEAM_PLATFORM_SCOPE: TEAM_PLATFORM_SCOPE_DISPLAY,
            TEAM_UNCLASSIFIED: TEAM_UNCLASSIFIED_DISPLAY,
        }
        return standard_names.get(team_lower, team_name)

    def _get_default_result(self):
        """Create default classification result dict."""
        return {
            'Assigned_Team': 'Unclassified',
            'Reason': 'No matching rule',
            'Needs_Review': True,
            'Method': 'None',
            'Fuzzy_Score': None,
            'Matched_Rule': None
        }

    def _apply_hostname_lookup(self, hostname_lower, rule_desc, is_fuzzy=False, fuzzy_pattern=None, fuzzy_score=None):
        """
        Apply hostname lookup for Application-category vulnerabilities.
        Returns (assigned_team, reason, needs_review).
        """
        host_owner = self.hostname_map.get(hostname_lower)
        has_owner = host_owner and host_owner.lower() not in ['nan', 'none', '']

        if is_fuzzy:
            if has_owner:
                return (
                    self._normalize_team_name(host_owner),
                    f"Fuzzy: '{fuzzy_pattern[:40]}' ({fuzzy_score:.0f}%) → Hostname: {host_owner}",
                    True
                )
            return (
                'Application',
                f"Fuzzy: '{fuzzy_pattern[:40]}' ({fuzzy_score:.0f}%), Hostname unknown",
                True
            )

        if has_owner:
            return (
                self._normalize_team_name(host_owner),
                f"{rule_desc} → Hostname Owner: {host_owner}",
                False
            )
        return (
            'Application',
            f"{rule_desc}, but Hostname Owner unknown",
            True
        )

    def _categorize_fuzzy_matches(self, good_matches):
        """
        Categorize fuzzy matches by team priority.
        Returns dict with keys: sysadmin, scope, other, app.
        """
        categories = {
            'sysadmin': [],
            'scope': [],
            'other': [],
            'app': []
        }

        for pat, scr in good_matches:
            team = self.fuzzy_candidates[pat]
            team_lower = team.lower() if team else ''

            if team_lower == TEAM_SYSADMIN:
                categories['sysadmin'].append((pat, scr, team))
            elif team_lower in [TEAM_LINUX_SCOPE, TEAM_PLATFORM_SCOPE]:
                categories['scope'].append((pat, scr, team))
            elif team_lower == TEAM_APPLICATION:
                categories['app'].append((pat, scr, team))
            else:
                categories['other'].append((pat, scr, team))

        return categories

    def _select_best_fuzzy_match(self, categories):
        """Select best fuzzy match from categorized matches in priority order."""
        for priority in ['sysadmin', 'scope', 'other', 'app']:
            if categories[priority]:
                return max(categories[priority], key=lambda x: x[1])
        return None

    def _apply_rule_match(self, matched_team, rule_desc, hostname_lower):
        """
        Apply rule match to generate classification result.
        Returns result dict.
        """
        result = self._get_default_result()
        team_lower = matched_team.strip().lower()

        if team_lower == TEAM_APPLICATION:
            team, reason, needs_review = self._apply_hostname_lookup(hostname_lower, rule_desc)
            result['Assigned_Team'] = team
            result['Reason'] = reason
            result['Needs_Review'] = needs_review
            result['Method'] = 'Rule'
            result['Matched_Rule'] = rule_desc

        elif team_lower in [TEAM_SYSADMIN, TEAM_LINUX_SCOPE, TEAM_PLATFORM_SCOPE]:
            result['Assigned_Team'] = self._normalize_team_name(matched_team)
            result['Reason'] = rule_desc
            result['Needs_Review'] = False
            result['Method'] = 'Rule'
            result['Matched_Rule'] = rule_desc

        else:
            result['Assigned_Team'] = 'Unclassified'
            result['Reason'] = f"Rule matched '{matched_team}' but outside strict scope"
            result['Needs_Review'] = True
            result['Method'] = 'Rule'
            result['Matched_Rule'] = rule_desc

        return result

    def _apply_fuzzy_match(self, chosen, hostname_lower):
        """
        Apply fuzzy match to generate classification result.
        Returns result dict.
        """
        result = self._get_default_result()
        match_pattern, score, potential_team = chosen
        team_lower = potential_team.lower() if potential_team else ''

        result['Fuzzy_Score'] = round(score, 1)
        result['Matched_Rule'] = match_pattern
        result['Method'] = 'Fuzzy'
        result['Needs_Review'] = True

        if team_lower == TEAM_APPLICATION:
            team, reason, _ = self._apply_hostname_lookup(
                hostname_lower, None, is_fuzzy=True,
                fuzzy_pattern=match_pattern, fuzzy_score=score
            )
            result['Assigned_Team'] = team
            result['Reason'] = reason
        else:
            result['Assigned_Team'] = self._normalize_team_name(potential_team)
            result['Reason'] = f"Fuzzy: '{match_pattern[:40]}' ({score:.0f}%)"

        return result

    def predict(self, df):
        """
        Classify all rows in a DataFrame.

        Args:
            df: DataFrame with Title and hostname columns

        Returns:
            DataFrame with classification columns added (preserving original column order)
        """
        # Store original column order before any modifications
        original_columns = list(df.columns)

        # Normalize column names (map common variations to standard names)
        col_map = {
            'Hostname': 'hostname', 'DNS Name': 'hostname', 'Computer Name': 'hostname',
            'Vulnerability': 'Title', 'Name': 'Title', 'Vulnerability Title': 'Title',
            'QID': 'Title',
            'OS Name': 'OS', 'Operating System': 'OS'
        }
        df = df.rename(columns=col_map)

        # Track which columns were renamed for ordering
        renamed_columns = [col_map.get(c, c) for c in original_columns]

        # Ensure required columns exist
        if 'Title' not in df.columns:
            df['Title'] = ''
        if 'hostname' not in df.columns:
            df['hostname'] = ''

        df['Title'] = df['Title'].fillna('').astype(str)
        df['hostname'] = df['hostname'].fillna('').astype(str)

        # Classify each row
        results = []
        for idx, row in df.iterrows():
            title = row['Title'].strip()
            hostname = row['hostname'].strip()

            classification = self._classify_single_row(title, hostname)

            results.append({
                'hostname': row['hostname'],
                'Title': row['Title'],
                'Assigned_Team': classification['Assigned_Team'],
                'Reason': classification['Reason'],
                'Needs_Review': classification['Needs_Review'],
                'Method': classification['Method'],
                'Fuzzy_Score': classification['Fuzzy_Score'],
                'Matched_Rule': classification['Matched_Rule']
            })

        # Convert to DataFrame and merge
        results_df = pd.DataFrame(results)

        # Add classification columns to original DataFrame
        classification_columns = ['Assigned_Team', 'Reason', 'Needs_Review', 'Method', 'Fuzzy_Score', 'Matched_Rule']
        df['Assigned_Team'] = results_df['Assigned_Team'].values
        df['Reason'] = results_df['Reason'].values
        df['Needs_Review'] = results_df['Needs_Review'].values
        df['Method'] = results_df['Method'].values
        df['Fuzzy_Score'] = results_df['Fuzzy_Score'].values
        df['Matched_Rule'] = results_df['Matched_Rule'].values

        # Reorder columns: original columns first (in original order), then classification columns at end
        # Use renamed_columns to preserve original order but with normalized names
        final_column_order = renamed_columns + [c for c in classification_columns if c not in renamed_columns]
        df = df[[c for c in final_column_order if c in df.columns]]

        # Log summary
        method_counts = results_df['Method'].value_counts().to_dict()
        logger.info(f"Classification complete: {len(df)} rows - Methods: {method_counts}")

        return df

    def reclassify_data(self, data_list, preserve_manual=True):
        """
        Reclassify a list of data dicts (from frontend).

        Args:
            data_list: List of dicts with at least Title and hostname
            preserve_manual: If True, keep Manual Override items unchanged

        Returns:
            List of reclassified dicts with change counts
        """
        if not data_list:
            return [], 0, 0

        df = pd.DataFrame(data_list)

        # Store original values
        original_methods = df['Method'].tolist() if 'Method' in df.columns else [''] * len(df)
        original_teams = df['Assigned_Team'].tolist() if 'Assigned_Team' in df.columns else [''] * len(df)

        # Reclassify
        result_df = self.predict(df)
        reclassified = result_df.to_dict(orient='records')

        # Clean NaN values
        import math
        def clean_nan(obj):
            if isinstance(obj, float) and (math.isnan(obj) if not isinstance(obj, type(None)) else False):
                return None
            elif isinstance(obj, dict):
                return {k: clean_nan(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [clean_nan(v) for v in obj]
            return obj

        reclassified = clean_nan(reclassified)

        # Count changes and preserve manual overrides
        method_changes = 0
        team_changes = 0

        # Also store original Needs_Review values
        original_needs_review = df['Needs_Review'].tolist() if 'Needs_Review' in df.columns else [True] * len(df)

        for i, row in enumerate(reclassified):
            if i >= len(original_methods):
                break

            if preserve_manual and original_methods[i] == 'Manual Override':
                # Preserve ALL manual override fields
                reclassified[i]['Assigned_Team'] = original_teams[i]
                reclassified[i]['Method'] = 'Manual Override'
                reclassified[i]['Needs_Review'] = original_needs_review[i] if i < len(original_needs_review) else False
            else:
                # Count changes
                if row.get('Assigned_Team') != original_teams[i]:
                    team_changes += 1
                if original_methods[i] == 'Fuzzy' and row.get('Method') == 'Rule':
                    method_changes += 1

        logger.info(f"Reclassify complete: {len(reclassified)} items, {method_changes} fuzzy→rule, {team_changes} team changes")
        return reclassified, method_changes, team_changes

    def get_known_teams(self):
        """Get list of all known teams."""
        db_teams = KnowledgeBase.get_all_teams()

        raw_teams = set(db_teams)
        raw_teams.update(self.hostname_map.values())
        raw_teams.update(self.rules.keys())

        # Normalize team names
        cleaned_teams = set()
        for t in raw_teams:
            if not t:
                continue
            cleaned_teams.add(self._normalize_team_name(t))

        # Ensure mandatory defaults exist
        cleaned_teams.add('System Admin')
        cleaned_teams.add('Application')
        cleaned_teams.add('Out of Linux Scope')
        cleaned_teams.add('Unclassified')

        return sorted(list(cleaned_teams))
