"""
Database Migration Module for VAAS
Handles migration of data from SQLite to external databases.
"""

import logging
import json
from typing import Dict, List, Tuple, Any, Optional
from datetime import datetime

from .settings import load_database_settings, save_database_settings, settings_to_provider_config
from .providers import get_provider_class, SQLiteProvider

logger = logging.getLogger(__name__)


class Migrator:
    """Handles data migration between database providers."""

    def __init__(self):
        """Initialize the migrator with current settings."""
        self.settings = load_database_settings()
        self.source_type = 'sqlite'  # Always migrate from SQLite

    def export_sqlite_data(self) -> Dict[str, List[Dict]]:
        """
        Export all data from SQLite database.

        Returns:
            Dictionary with tables as keys and list of records as values
        """
        from ..config import Config

        # Create SQLite provider
        sqlite_config = {'database_file': Config.DATABASE_FILE}
        sqlite_provider = SQLiteProvider(sqlite_config)

        data = {
            'hostnames': [],
            'rules': [],
            'users': [],
            'reports': [],
            'report_items': []
        }

        try:
            with sqlite_provider.get_connection() as conn:
                cursor = conn.cursor()

                # Export hostnames
                cursor.execute('SELECT hostname, team FROM hostnames')
                for row in cursor.fetchall():
                    data['hostnames'].append({
                        'hostname': row[0],
                        'team': row[1]
                    })
                logger.info(f"Exported {len(data['hostnames'])} hostnames")

                # Export rules
                cursor.execute('SELECT id, title_pattern, team, rule_type FROM rules')
                for row in cursor.fetchall():
                    data['rules'].append({
                        'id': row[0],
                        'title_pattern': row[1],
                        'team': row[2],
                        'rule_type': row[3]
                    })
                logger.info(f"Exported {len(data['rules'])} rules")

                # Export users
                cursor.execute('''
                    SELECT id, username, password_hash, display_name, email, role, auth_type, is_active, created_at, last_login
                    FROM users
                ''')
                for row in cursor.fetchall():
                    data['users'].append({
                        'id': row[0],
                        'username': row[1],
                        'password_hash': row[2],
                        'display_name': row[3],
                        'email': row[4],
                        'role': row[5],
                        'auth_type': row[6],
                        'is_active': row[7],
                        'created_at': row[8],
                        'last_login': row[9]
                    })
                logger.info(f"Exported {len(data['users'])} users")

                # Export reports (if table exists)
                try:
                    cursor.execute('''
                        SELECT id, report_uuid, filename, uploaded_by, uploaded_at, total_rows, classified_count, needs_review_count, status, metadata
                        FROM reports
                    ''')
                    for row in cursor.fetchall():
                        data['reports'].append({
                            'id': row[0],
                            'report_uuid': row[1],
                            'filename': row[2],
                            'uploaded_by': row[3],
                            'uploaded_at': row[4],
                            'total_rows': row[5],
                            'classified_count': row[6],
                            'needs_review_count': row[7],
                            'status': row[8],
                            'metadata': row[9]
                        })
                    logger.info(f"Exported {len(data['reports'])} reports")

                    # Export report items
                    cursor.execute('''
                        SELECT id, report_id, hostname, title, assigned_team, reason, needs_review, method, original_data, created_at
                        FROM report_items
                    ''')
                    for row in cursor.fetchall():
                        data['report_items'].append({
                            'id': row[0],
                            'report_id': row[1],
                            'hostname': row[2],
                            'title': row[3],
                            'assigned_team': row[4],
                            'reason': row[5],
                            'needs_review': row[6],
                            'method': row[7],
                            'original_data': row[8],
                            'created_at': row[9]
                        })
                    logger.info(f"Exported {len(data['report_items'])} report items")
                except Exception as e:
                    logger.warning(f"Reports tables not found or error: {e}")

            return data

        except Exception as e:
            logger.error(f"Failed to export SQLite data: {e}")
            raise

    def import_data_to_target(self, provider, data: Dict[str, List[Dict]]) -> Tuple[bool, str]:
        """
        Import data to the target database.

        Args:
            provider: Target database provider
            data: Dictionary with tables and records

        Returns:
            Tuple of (success, message)
        """
        placeholder = provider.placeholder

        try:
            with provider.get_connection() as conn:
                cursor = conn.cursor()

                # Import hostnames
                for record in data['hostnames']:
                    if provider.db_type == 'sqlite':
                        cursor.execute(f'INSERT OR REPLACE INTO hostnames (hostname, team) VALUES ({placeholder}, {placeholder})',
                                       (record['hostname'], record['team']))
                    elif provider.db_type == 'mysql':
                        cursor.execute(f'INSERT INTO hostnames (hostname, team) VALUES ({placeholder}, {placeholder}) ON DUPLICATE KEY UPDATE team = VALUES(team)',
                                       (record['hostname'], record['team']))
                    elif provider.db_type == 'postgresql':
                        cursor.execute(f'INSERT INTO hostnames (hostname, team) VALUES ({placeholder}, {placeholder}) ON CONFLICT (hostname) DO UPDATE SET team = EXCLUDED.team',
                                       (record['hostname'], record['team']))
                    elif provider.db_type == 'mssql':
                        cursor.execute(f'DELETE FROM hostnames WHERE hostname = {placeholder}', (record['hostname'],))
                        cursor.execute(f'INSERT INTO hostnames (hostname, team) VALUES ({placeholder}, {placeholder})',
                                       (record['hostname'], record['team']))

                # Import rules
                for record in data['rules']:
                    if provider.db_type == 'sqlite':
                        cursor.execute(f'INSERT OR REPLACE INTO rules (title_pattern, team, rule_type) VALUES ({placeholder}, {placeholder}, {placeholder})',
                                       (record['title_pattern'], record['team'], record['rule_type'] or 'contains'))
                    elif provider.db_type == 'mysql':
                        cursor.execute(f'INSERT INTO rules (title_pattern, team, rule_type) VALUES ({placeholder}, {placeholder}, {placeholder}) ON DUPLICATE KEY UPDATE team = VALUES(team), rule_type = VALUES(rule_type)',
                                       (record['title_pattern'], record['team'], record['rule_type'] or 'contains'))
                    elif provider.db_type == 'postgresql':
                        cursor.execute(f'INSERT INTO rules (title_pattern, team, rule_type) VALUES ({placeholder}, {placeholder}, {placeholder}) ON CONFLICT (title_pattern) DO UPDATE SET team = EXCLUDED.team, rule_type = EXCLUDED.rule_type',
                                       (record['title_pattern'], record['team'], record['rule_type'] or 'contains'))
                    elif provider.db_type == 'mssql':
                        cursor.execute(f'DELETE FROM rules WHERE title_pattern = {placeholder}', (record['title_pattern'],))
                        cursor.execute(f'INSERT INTO rules (title_pattern, team, rule_type) VALUES ({placeholder}, {placeholder}, {placeholder})',
                                       (record['title_pattern'], record['team'], record['rule_type'] or 'contains'))

                # Import users
                for record in data['users']:
                    # Check if user exists
                    cursor.execute(f'SELECT COUNT(*) FROM users WHERE username = {placeholder}', (record['username'],))
                    exists = cursor.fetchone()[0] > 0

                    if exists:
                        # Update existing user
                        cursor.execute(f'''
                            UPDATE users SET password_hash = {placeholder}, display_name = {placeholder}, email = {placeholder},
                            role = {placeholder}, auth_type = {placeholder}, is_active = {placeholder}
                            WHERE username = {placeholder}
                        ''', (record['password_hash'], record['display_name'], record['email'],
                              record['role'], record['auth_type'], record['is_active'], record['username']))
                    else:
                        # Insert new user
                        cursor.execute(f'''
                            INSERT INTO users (username, password_hash, display_name, email, role, auth_type, is_active)
                            VALUES ({placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder})
                        ''', (record['username'], record['password_hash'], record['display_name'], record['email'],
                              record['role'], record['auth_type'], record['is_active']))

                # Import reports (maintain ID mapping for report_items)
                report_id_map = {}  # Old ID -> New ID

                for record in data['reports']:
                    old_id = record['id']
                    cursor.execute(f'''
                        INSERT INTO reports (report_uuid, filename, uploaded_by, total_rows, classified_count, needs_review_count, status, metadata)
                        VALUES ({placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder})
                    ''', (record['report_uuid'], record['filename'], record['uploaded_by'],
                          record['total_rows'], record['classified_count'], record['needs_review_count'],
                          record['status'], record['metadata']))

                    # Get the new ID
                    if provider.db_type == 'sqlite':
                        new_id = cursor.lastrowid
                    elif provider.db_type == 'postgresql':
                        cursor.execute('SELECT lastval()')
                        new_id = cursor.fetchone()[0]
                    elif provider.db_type == 'mysql':
                        cursor.execute('SELECT LAST_INSERT_ID()')
                        new_id = cursor.fetchone()[0]
                    elif provider.db_type == 'mssql':
                        cursor.execute('SELECT SCOPE_IDENTITY()')
                        new_id = cursor.fetchone()[0]
                    else:
                        cursor.execute(f'SELECT id FROM reports WHERE report_uuid = {placeholder}', (record['report_uuid'],))
                        new_id = cursor.fetchone()[0]

                    report_id_map[old_id] = new_id

                # Import report items with mapped IDs
                for record in data['report_items']:
                    new_report_id = report_id_map.get(record['report_id'])
                    if new_report_id:
                        cursor.execute(f'''
                            INSERT INTO report_items (report_id, hostname, title, assigned_team, reason, needs_review, method, original_data)
                            VALUES ({placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder})
                        ''', (new_report_id, record['hostname'], record['title'], record['assigned_team'],
                              record['reason'], record['needs_review'], record['method'], record['original_data']))

                conn.commit()

            return True, f"Successfully imported {len(data['hostnames'])} hostnames, {len(data['rules'])} rules, {len(data['users'])} users, {len(data['reports'])} reports"

        except Exception as e:
            logger.error(f"Failed to import data: {e}")
            return False, str(e)

    def verify_migration(self, source_data: Dict, target_provider) -> Tuple[bool, str]:
        """
        Verify that migration was successful by comparing counts.

        Args:
            source_data: Original data from source
            target_provider: Target database provider

        Returns:
            Tuple of (success, message)
        """
        try:
            with target_provider.get_connection() as conn:
                cursor = conn.cursor()

                # Count records in each table
                cursor.execute('SELECT COUNT(*) FROM hostnames')
                hostname_count = cursor.fetchone()[0]

                cursor.execute('SELECT COUNT(*) FROM rules')
                rule_count = cursor.fetchone()[0]

                cursor.execute('SELECT COUNT(*) FROM users')
                user_count = cursor.fetchone()[0]

                # Check counts
                source_hostnames = len(source_data.get('hostnames', []))
                source_rules = len(source_data.get('rules', []))
                source_users = len(source_data.get('users', []))

                if hostname_count < source_hostnames:
                    return False, f"Hostname count mismatch: expected {source_hostnames}, got {hostname_count}"

                if rule_count < source_rules:
                    return False, f"Rule count mismatch: expected {source_rules}, got {rule_count}"

                if user_count < source_users:
                    return False, f"User count mismatch: expected {source_users}, got {user_count}"

                return True, f"Verified: {hostname_count} hostnames, {rule_count} rules, {user_count} users"

        except Exception as e:
            logger.error(f"Verification failed: {e}")
            return False, str(e)

    def migrate(self, preserve_source: bool = True) -> Tuple[bool, str]:
        """
        Perform full migration from SQLite to configured external database.

        Args:
            preserve_source: If True, keep the SQLite file after migration

        Returns:
            Tuple of (success, message)
        """
        settings = load_database_settings()
        target_type = settings.get('DB_TYPE', 'sqlite')

        if target_type == 'sqlite':
            return False, "Cannot migrate: target database is SQLite. Please configure an external database first."

        logger.info(f"Starting migration from SQLite to {target_type}")

        # Step 1: Export data from SQLite
        logger.info("Step 1: Exporting data from SQLite...")
        try:
            source_data = self.export_sqlite_data()
        except Exception as e:
            return False, f"Failed to export SQLite data: {str(e)}"

        total_records = (
            len(source_data['hostnames']) +
            len(source_data['rules']) +
            len(source_data['users']) +
            len(source_data['reports'])
        )
        logger.info(f"Exported {total_records} total records")

        # Step 2: Create target provider and tables
        logger.info(f"Step 2: Connecting to {target_type} and creating tables...")
        try:
            provider_class = get_provider_class(target_type)
            config = settings_to_provider_config(settings)
            target_provider = provider_class(config)

            # Test connection
            success, msg = target_provider.test_connection()
            if not success:
                return False, f"Failed to connect to target database: {msg}"

            # Create tables
            with target_provider.get_connection() as conn:
                target_provider.create_tables(conn)

            logger.info("Tables created successfully")

        except Exception as e:
            return False, f"Failed to setup target database: {str(e)}"

        # Step 3: Import data to target
        logger.info("Step 3: Importing data to target database...")
        success, msg = self.import_data_to_target(target_provider, source_data)
        if not success:
            return False, f"Failed to import data: {msg}"

        logger.info(msg)

        # Step 4: Verify migration
        logger.info("Step 4: Verifying migration...")
        success, msg = self.verify_migration(source_data, target_provider)
        if not success:
            return False, f"Migration verification failed: {msg}"

        logger.info(msg)

        # Step 5: Backup source if needed
        if preserve_source:
            from ..config import Config
            import shutil
            from datetime import datetime

            backup_name = f"knowledge_base_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db"
            backup_path = Config.DATABASE_FILE.replace('knowledge_base.db', backup_name)
            try:
                shutil.copy2(Config.DATABASE_FILE, backup_path)
                logger.info(f"SQLite backup created: {backup_path}")
            except Exception as e:
                logger.warning(f"Failed to create backup: {e}")

        logger.info("Migration completed successfully!")
        return True, f"Migration completed successfully. Migrated {total_records} records to {target_type}."
