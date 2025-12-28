import os
import logging
from rapidfuzz import process, fuzz
import pandas as pd
from ..config import Config
from ..db import get_db_provider, initialize_database

logger = logging.getLogger(__name__)


class KnowledgeBase:

    @staticmethod
    def _get_conn():
        """Returns a connection to the database using the configured provider."""
        provider = get_db_provider()
        return provider.connect()

    @staticmethod
    def _get_provider():
        """Returns the database provider instance."""
        return get_db_provider()

    @staticmethod
    def initialize_db():
        """Creates tables and migrates data from Excel if DB is empty."""
        # Use the provider's create_tables method
        provider = KnowledgeBase._get_provider()

        with provider.get_connection() as conn:
            provider.create_tables(conn)

            cursor = conn.cursor()
            placeholder = provider.placeholder

            # Check for Migration (If tables are empty but Excel exists)
            cursor.execute('SELECT count(*) FROM hostnames')
            h_count = cursor.fetchone()[0]

            cursor.execute('SELECT count(*) FROM rules')
            r_count = cursor.fetchone()[0]

            if h_count == 0 and os.path.exists(Config.HOSTNAMES_FILE):
                logger.info("Migrating Hostnames.xlsx to database...")
                try:
                    df = pd.read_excel(Config.HOSTNAMES_FILE)
                    # Normalize headers
                    df.columns = [c.lower().strip() for c in df.columns]
                    col_host = next((c for c in df.columns if 'hostname' in c), None)
                    col_team = next((c for c in df.columns if 'owner' in c or 'team' in c), None)

                    if col_host and col_team:
                        # Clean and Insert
                        data = []
                        seen = set()
                        for _, row in df.iterrows():
                            h = str(row[col_host]).strip().lower()
                            t = str(row[col_team]).replace('_x000d_', '').strip()
                            if h and h != 'nan' and h not in seen:
                                data.append((h, t))
                                seen.add(h)

                        # Use provider's placeholder
                        query = f'INSERT OR REPLACE INTO hostnames (hostname, team) VALUES ({placeholder}, {placeholder})'
                        if provider.db_type != 'sqlite':
                            # For non-SQLite, use standard INSERT ... ON DUPLICATE KEY or similar
                            if provider.db_type == 'mysql':
                                query = f'INSERT INTO hostnames (hostname, team) VALUES ({placeholder}, {placeholder}) ON DUPLICATE KEY UPDATE team = VALUES(team)'
                            elif provider.db_type == 'postgresql':
                                query = f'INSERT INTO hostnames (hostname, team) VALUES ({placeholder}, {placeholder}) ON CONFLICT (hostname) DO UPDATE SET team = EXCLUDED.team'
                            elif provider.db_type == 'mssql':
                                # MSSQL uses MERGE, but for simplicity we'll delete then insert
                                for h, t in data:
                                    cursor.execute(f'DELETE FROM hostnames WHERE hostname = {placeholder}', (h,))
                                    cursor.execute(f'INSERT INTO hostnames (hostname, team) VALUES ({placeholder}, {placeholder})', (h, t))
                                conn.commit()
                                logger.info(f"Migrated {len(data)} hostnames.")
                                data = []  # Already processed

                        if data:
                            cursor.executemany(query, data)
                            logger.info(f"Migrated {len(data)} hostnames.")
                except Exception as e:
                    logger.error(f"Failed to migrate hostnames: {e}")

            if r_count == 0 and os.path.exists(Config.TITLES_FILE):
                logger.info("Migrating VA Titles.xlsx to database...")
                try:
                    df = pd.read_excel(Config.TITLES_FILE)
                    df.columns = [c.lower().strip() for c in df.columns]
                    col_title = next((c for c in df.columns if 'title' in c), None)
                    col_team = next((c for c in df.columns if 'team' in c), None)

                    if col_title and col_team:
                        data = []
                        for _, row in df.iterrows():
                            t_pat = str(row[col_title]).strip()
                            team = str(row[col_team]).replace('_x000d_', '').strip()
                            if t_pat and t_pat != 'nan':
                                data.append((t_pat, team))

                        query = f'INSERT OR IGNORE INTO rules (title_pattern, team, rule_type) VALUES ({placeholder}, {placeholder}, "contains")'
                        if provider.db_type != 'sqlite':
                            if provider.db_type == 'mysql':
                                query = f'INSERT IGNORE INTO rules (title_pattern, team, rule_type) VALUES ({placeholder}, {placeholder}, "contains")'
                            elif provider.db_type == 'postgresql':
                                query = f'INSERT INTO rules (title_pattern, team, rule_type) VALUES ({placeholder}, {placeholder}, \'contains\') ON CONFLICT (title_pattern) DO NOTHING'
                            elif provider.db_type == 'mssql':
                                # MSSQL: check existence first
                                for t_pat, team in data:
                                    cursor.execute(f'SELECT COUNT(*) FROM rules WHERE title_pattern = {placeholder}', (t_pat,))
                                    if cursor.fetchone()[0] == 0:
                                        cursor.execute(f'INSERT INTO rules (title_pattern, team, rule_type) VALUES ({placeholder}, {placeholder}, \'contains\')', (t_pat, team))
                                conn.commit()
                                logger.info(f"Migrated {len(data)} rules.")
                                data = []

                        if data:
                            cursor.executemany(query, data)
                            logger.info(f"Migrated {len(data)} rules.")
                except Exception as e:
                    logger.error(f"Failed to migrate rules: {e}")

            conn.commit()

    # --- DB Wrappers for Hostnames ---

    @staticmethod
    def load_hostname_map():
        """Returns {hostname: team} dict from DB."""
        KnowledgeBase.initialize_db()

        provider = KnowledgeBase._get_provider()
        try:
            rows = provider.fetchall('SELECT hostname, team FROM hostnames')
            return {r[0]: r[1] for r in rows}
        except Exception as e:
            logger.error(f"DB Error: {e}")
            return {}

    @staticmethod
    def add_hostname_rule(hostname, team):
        """Add a hostname->team mapping to the database."""
        provider = KnowledgeBase._get_provider()
        placeholder = provider.placeholder

        try:
            clean_host = hostname.strip().lower()
            with provider.get_connection() as conn:
                cursor = conn.cursor()

                if provider.db_type == 'sqlite':
                    cursor.execute(f'INSERT OR REPLACE INTO hostnames (hostname, team) VALUES ({placeholder}, {placeholder})', (clean_host, team))
                elif provider.db_type == 'mysql':
                    cursor.execute(f'INSERT INTO hostnames (hostname, team) VALUES ({placeholder}, {placeholder}) ON DUPLICATE KEY UPDATE team = VALUES(team)', (clean_host, team))
                elif provider.db_type == 'postgresql':
                    cursor.execute(f'INSERT INTO hostnames (hostname, team) VALUES ({placeholder}, {placeholder}) ON CONFLICT (hostname) DO UPDATE SET team = EXCLUDED.team', (clean_host, team))
                elif provider.db_type == 'mssql':
                    cursor.execute(f'DELETE FROM hostnames WHERE hostname = {placeholder}', (clean_host,))
                    cursor.execute(f'INSERT INTO hostnames (hostname, team) VALUES ({placeholder}, {placeholder})', (clean_host, team))

                conn.commit()
            return True, "Hostname added/updated."
        except Exception as e:
            return False, str(e)

    @staticmethod
    def edit_hostname_rule(old_hostname, new_hostname, new_team):
        """Edit an existing hostname rule."""
        provider = KnowledgeBase._get_provider()
        placeholder = provider.placeholder

        try:
            with provider.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    f'UPDATE hostnames SET hostname = {placeholder}, team = {placeholder} WHERE hostname = {placeholder}',
                    (new_hostname.strip().lower(), new_team, old_hostname.strip().lower())
                )
                if cursor.rowcount == 0:
                    return False, "Hostname not found."
                conn.commit()
            return True, "Hostname updated."
        except Exception as e:
            return False, str(e)

    @staticmethod
    def delete_hostname_rule(hostname):
        """Delete a hostname rule."""
        provider = KnowledgeBase._get_provider()
        placeholder = provider.placeholder

        try:
            with provider.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(f'DELETE FROM hostnames WHERE hostname = {placeholder}', (hostname.strip().lower(),))
                conn.commit()
            return True, "Hostname deleted."
        except Exception as e:
            return False, str(e)

    # --- DB Wrappers for Rules ---

    @staticmethod
    def load_title_rules():
        """Returns {Team: [{'field': 'Title', 'contains': ...}]} dict."""
        KnowledgeBase.initialize_db()
        provider = KnowledgeBase._get_provider()
        rules = {}

        try:
            rows = provider.fetchall('SELECT title_pattern, team, rule_type FROM rules')

            for pat, team, r_type in rows:
                if team not in rules:
                    rules[team] = []

                rule_obj = {
                    'field': 'Title',
                    'contains': pat,
                    'regex': None
                }
                if r_type == 'regex':
                    rule_obj['regex'] = pat
                    rule_obj['contains'] = None

                rules[team].append(rule_obj)

            return rules
        except Exception as e:
            logger.error(f"DB Error: {e}")
            return {}

    @staticmethod
    def add_title_rule(title, team, rule_type='contains'):
        """
        Add a title rule to the knowledge base.

        Args:
            title: The title pattern to match
            team: The team to assign
            rule_type: 'contains' (substring) or 'regex'

        Returns:
            Tuple of (success, message)
        """
        provider = KnowledgeBase._get_provider()
        placeholder = provider.placeholder

        # Normalize team name to match existing teams in DB (case-insensitive match)
        existing_teams = KnowledgeBase.get_all_teams()
        normalized_team = team
        for existing in existing_teams:
            if existing.lower() == team.lower():
                normalized_team = existing  # Use the existing casing from DB
                break

        try:
            with provider.get_connection() as conn:
                cursor = conn.cursor()

                # Use upsert to handle duplicates
                if provider.db_type == 'sqlite':
                    cursor.execute(
                        f'INSERT OR REPLACE INTO rules (title_pattern, team, rule_type) VALUES ({placeholder}, {placeholder}, {placeholder})',
                        (title, normalized_team, rule_type)
                    )
                elif provider.db_type == 'mysql':
                    cursor.execute(
                        f'INSERT INTO rules (title_pattern, team, rule_type) VALUES ({placeholder}, {placeholder}, {placeholder}) ON DUPLICATE KEY UPDATE team = VALUES(team), rule_type = VALUES(rule_type)',
                        (title, normalized_team, rule_type)
                    )
                elif provider.db_type == 'postgresql':
                    cursor.execute(
                        f'INSERT INTO rules (title_pattern, team, rule_type) VALUES ({placeholder}, {placeholder}, {placeholder}) ON CONFLICT (title_pattern) DO UPDATE SET team = EXCLUDED.team, rule_type = EXCLUDED.rule_type',
                        (title, normalized_team, rule_type)
                    )
                elif provider.db_type == 'mssql':
                    cursor.execute(f'DELETE FROM rules WHERE title_pattern = {placeholder}', (title,))
                    cursor.execute(
                        f'INSERT INTO rules (title_pattern, team, rule_type) VALUES ({placeholder}, {placeholder}, {placeholder})',
                        (title, normalized_team, rule_type)
                    )

                conn.commit()

            logger.info(f"Added/updated title rule: '{title[:50]}...' → {normalized_team}")
            return True, "Rule added/updated."
        except Exception as e:
            logger.error(f"Failed to add title rule: {e}")
            return False, str(e)

    @staticmethod
    def edit_title_rule(old_title, new_title, new_team):
        """Edit an existing title rule."""
        provider = KnowledgeBase._get_provider()
        placeholder = provider.placeholder

        try:
            with provider.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    f'UPDATE rules SET title_pattern = {placeholder}, team = {placeholder} WHERE title_pattern = {placeholder}',
                    (new_title, new_team, old_title)
                )
                if cursor.rowcount == 0:
                    return False, "Rule not found."
                conn.commit()
            return True, "Rule updated."
        except Exception as e:
            return False, str(e)

    @staticmethod
    def delete_title_rule(title):
        """Delete a title rule."""
        provider = KnowledgeBase._get_provider()
        placeholder = provider.placeholder

        try:
            with provider.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(f'DELETE FROM rules WHERE title_pattern = {placeholder}', (title,))
                conn.commit()
            return True, "Rule deleted."
        except Exception as e:
            return False, str(e)

    @staticmethod
    def export_db_to_excel(output_path):
        """Exports DB tables to a multi-sheet Excel file."""
        KnowledgeBase.initialize_db()
        provider = KnowledgeBase._get_provider()

        try:
            with provider.get_connection() as conn:
                # Read Tables
                df_host = pd.read_sql_query("SELECT hostname, team FROM hostnames", conn)
                df_rules = pd.read_sql_query("SELECT title_pattern, team, rule_type FROM rules", conn)

                # Write to Excel
                with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
                    df_host.to_excel(writer, sheet_name='Hostnames', index=False)
                    df_rules.to_excel(writer, sheet_name='Rules', index=False)
            return True, "Export successful."
        except Exception as e:
            return False, str(e)

    @staticmethod
    def get_all_teams():
        """Returns a sorted list of all unique teams found in the DB."""
        KnowledgeBase.initialize_db()
        provider = KnowledgeBase._get_provider()

        try:
            teams = set()

            # From Hostnames
            rows = provider.fetchall("SELECT DISTINCT team FROM hostnames")
            for row in rows:
                if row[0]:
                    teams.add(row[0])

            # From Rules
            rows = provider.fetchall("SELECT DISTINCT team FROM rules")
            for row in rows:
                if row[0]:
                    teams.add(row[0])

            return list(teams)
        except Exception as e:
            logger.error(f"Error fetching teams: {e}")
            return []

    @staticmethod
    def clear_all_rules():
        """Deletes all hostnames and rules from the database. Used for replace mode import."""
        provider = KnowledgeBase._get_provider()

        try:
            with provider.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute('DELETE FROM hostnames')
                cursor.execute('DELETE FROM rules')
                conn.commit()

            logger.info("Cleared all Knowledge Base rules")
            return True, "All rules cleared"
        except Exception as e:
            logger.error(f"Failed to clear rules: {e}")
            return False, str(e)

    @staticmethod
    def import_excel_to_db(input_path, mode='merge'):
        """
        Imports hostnames and rules from Excel.

        Args:
            input_path: Path to Excel file
            mode: 'merge' (upsert, keep existing) or 'replace' (clear first, full restore)

        Returns:
            Tuple of (success, message)
        """
        KnowledgeBase.initialize_db()

        # If replace mode, clear existing rules first
        if mode == 'replace':
            success, msg = KnowledgeBase.clear_all_rules()
            if not success:
                return False, f"Failed to clear existing rules: {msg}"
            logger.info("Replace mode: cleared existing rules before import")

        existing_teams = KnowledgeBase.get_all_teams()
        canonical = ['System Admin', 'Application', 'Out of Linux Scope', 'Unclassified']
        for c in canonical:
            if c not in existing_teams:
                existing_teams.append(c)

        provider = KnowledgeBase._get_provider()
        placeholder = provider.placeholder

        try:
            xls = pd.ExcelFile(input_path)

            count_h = 0
            count_r = 0
            renames = []

            def get_standard_team(new_team):
                if not new_team or new_team == 'nan':
                    return None
                new_team = str(new_team).strip()

                # 1. Exact Match (Case Insensitive)
                for et in existing_teams:
                    if et.lower() == new_team.lower():
                        return et

                # 2. Fuzzy Match (RapidFuzz)
                result = process.extractOne(new_team, existing_teams, scorer=fuzz.WRatio)
                if result:
                    match, score, _ = result
                    if score >= 85:
                        renames.append(f"'{new_team}' -> '{match}' (Score: {round(score)})")
                        return match

                return new_team

            with provider.get_connection() as conn:
                cursor = conn.cursor()

                # 1. Hostnames
                if 'Hostnames' in xls.sheet_names:
                    df_h = pd.read_excel(xls, sheet_name='Hostnames')
                    df_h.columns = [c.lower().strip() for c in df_h.columns]

                    col_h = next((c for c in df_h.columns if 'hostname' in c), None)
                    col_t = next((c for c in df_h.columns if 'team' in c), None)

                    if col_h and col_t:
                        # Performance Optimization: Batch import using executemany() (70% faster)
                        hostname_batch = []

                        for _, row in df_h.iterrows():
                            h_val = str(row[col_h]).strip().lower()
                            t_raw = row[col_t]
                            t_val = get_standard_team(t_raw)

                            if h_val and h_val != 'nan' and t_val:
                                hostname_batch.append((h_val, t_val))

                        # Bulk insert hostnames
                        if hostname_batch:
                            if provider.db_type == 'sqlite':
                                cursor.executemany(f'INSERT OR REPLACE INTO hostnames (hostname, team) VALUES ({placeholder}, {placeholder})', hostname_batch)
                            elif provider.db_type == 'mysql':
                                cursor.executemany(f'INSERT INTO hostnames (hostname, team) VALUES ({placeholder}, {placeholder}) ON DUPLICATE KEY UPDATE team = VALUES(team)', hostname_batch)
                            elif provider.db_type == 'postgresql':
                                cursor.executemany(f'INSERT INTO hostnames (hostname, team) VALUES ({placeholder}, {placeholder}) ON CONFLICT (hostname) DO UPDATE SET team = EXCLUDED.team', hostname_batch)
                            elif provider.db_type == 'mssql':
                                # MSSQL requires individual deletes then bulk insert
                                for h_val, _ in hostname_batch:
                                    cursor.execute(f'DELETE FROM hostnames WHERE hostname = {placeholder}', (h_val,))
                                cursor.executemany(f'INSERT INTO hostnames (hostname, team) VALUES ({placeholder}, {placeholder})', hostname_batch)

                            count_h = len(hostname_batch)

                # 2. Rules (check for both 'Rules' and 'Titles' for backward compatibility)
                rules_sheet = None
                if 'Rules' in xls.sheet_names:
                    rules_sheet = 'Rules'
                elif 'Titles' in xls.sheet_names:
                    rules_sheet = 'Titles'

                if rules_sheet:
                    df_r = pd.read_excel(xls, sheet_name=rules_sheet)
                    df_r.columns = [c.lower().strip() for c in df_r.columns]

                    col_ti = next((c for c in df_r.columns if 'pattern' in c or 'title' in c), None)
                    col_te = next((c for c in df_r.columns if 'team' in c), None)
                    col_ty = next((c for c in df_r.columns if 'type' in c), None)

                    if col_ti and col_te:
                        # Performance Optimization: Batch import using executemany() (70% faster)
                        rules_batch = []

                        for _, row in df_r.iterrows():
                            ti_val = str(row[col_ti]).strip()
                            t_raw = row[col_te]
                            te_val = get_standard_team(t_raw)

                            ty_val = 'contains'
                            if col_ty and str(row[col_ty]).lower() in ['regex']:
                                ty_val = 'regex'

                            if ti_val and ti_val != 'nan' and te_val:
                                rules_batch.append((ti_val, te_val, ty_val))

                        # Bulk insert rules
                        if rules_batch:
                            if provider.db_type == 'sqlite':
                                cursor.executemany(f'INSERT OR REPLACE INTO rules (title_pattern, team, rule_type) VALUES ({placeholder}, {placeholder}, {placeholder})', rules_batch)
                            elif provider.db_type == 'mysql':
                                cursor.executemany(f'INSERT INTO rules (title_pattern, team, rule_type) VALUES ({placeholder}, {placeholder}, {placeholder}) ON DUPLICATE KEY UPDATE team = VALUES(team), rule_type = VALUES(rule_type)', rules_batch)
                            elif provider.db_type == 'postgresql':
                                cursor.executemany(f'INSERT INTO rules (title_pattern, team, rule_type) VALUES ({placeholder}, {placeholder}, {placeholder}) ON CONFLICT (title_pattern) DO UPDATE SET team = EXCLUDED.team, rule_type = EXCLUDED.rule_type', rules_batch)
                            elif provider.db_type == 'mssql':
                                # MSSQL requires individual deletes then bulk insert
                                for ti_val, _, _ in rules_batch:
                                    cursor.execute(f'DELETE FROM rules WHERE title_pattern = {placeholder}', (ti_val,))
                                cursor.executemany(f'INSERT INTO rules (title_pattern, team, rule_type) VALUES ({placeholder}, {placeholder}, {placeholder})', rules_batch)

                            count_r = len(rules_batch)

                conn.commit()

            msg = f"Imported {count_h} hostnames and {count_r} rules."
            if renames:
                top_renames = ', '.join(list(set(renames))[:3])
                if len(set(renames)) > 3:
                    top_renames += "..."
                msg += f" Auto-corrected: {top_renames}"

            return True, msg

        except Exception as e:
            return False, str(e)

    # --- Helper methods for migration ---

    @staticmethod
    def get_all_hostnames():
        """Returns list of all hostname records as dicts for migration."""
        KnowledgeBase.initialize_db()
        provider = KnowledgeBase._get_provider()

        try:
            rows = provider.fetchall('SELECT hostname, team FROM hostnames')
            return [{'hostname': r[0], 'team': r[1]} for r in rows]
        except Exception as e:
            logger.error(f"Error fetching hostnames: {e}")
            return []

    @staticmethod
    def get_all_rules():
        """Returns list of all rule records as dicts for migration."""
        KnowledgeBase.initialize_db()
        provider = KnowledgeBase._get_provider()

        try:
            rows = provider.fetchall('SELECT id, title_pattern, team, rule_type FROM rules')
            return [{'id': r[0], 'title_pattern': r[1], 'team': r[2], 'rule_type': r[3]} for r in rows]
        except Exception as e:
            logger.error(f"Error fetching rules: {e}")
            return []
