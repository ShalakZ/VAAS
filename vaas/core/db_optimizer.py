"""
Database Optimizer Module for VAAS
Handles database statistics, cleanup, and optimization without impacting upload performance.
"""

import os
import logging
from typing import Dict, List, Tuple, Optional
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class DatabaseOptimizer:
    """Database optimization and cleanup utilities - runs separately from uploads."""

    @staticmethod
    def get_database_stats() -> Dict:
        """
        Get database size and statistics.

        Returns:
            Dictionary with database statistics
        """
        from ..db import get_db_provider
        from ..config import Config

        provider = get_db_provider()
        stats = {}

        try:
            # Total reports
            row = provider.fetchone('SELECT COUNT(*) FROM reports')
            stats['total_reports'] = row[0] if row else 0

            # Total report items
            row = provider.fetchone('SELECT COUNT(*) FROM report_items')
            stats['total_report_items'] = row[0] if row else 0

            # Total hostnames in KB
            row = provider.fetchone('SELECT COUNT(*) FROM hostnames')
            stats['total_hostnames'] = row[0] if row else 0

            # Total rules in KB
            row = provider.fetchone('SELECT COUNT(*) FROM rules')
            stats['total_rules'] = row[0] if row else 0

            # Date range of reports
            row = provider.fetchone('SELECT MIN(uploaded_at), MAX(uploaded_at) FROM reports')
            if row and row[0]:
                stats['oldest_report'] = str(row[0])
                stats['newest_report'] = str(row[1])
            else:
                stats['oldest_report'] = None
                stats['newest_report'] = None

            # Average items per report
            if stats['total_reports'] > 0:
                stats['avg_items_per_report'] = round(
                    stats['total_report_items'] / stats['total_reports'], 1
                )
            else:
                stats['avg_items_per_report'] = 0

            # Database file size (SQLite only)
            if provider.db_type == 'sqlite':
                if os.path.exists(Config.DATABASE_FILE):
                    size_bytes = os.path.getsize(Config.DATABASE_FILE)
                    stats['database_size_bytes'] = size_bytes
                    stats['database_size_mb'] = round(size_bytes / 1024 / 1024, 2)
                else:
                    stats['database_size_mb'] = 0
            else:
                stats['database_size_mb'] = None  # Not easily available for external DBs

            # Identify potential duplicates (same filename uploaded multiple times)
            rows = provider.fetchall('''
                SELECT filename, COUNT(*) as count, SUM(total_rows) as total_items
                FROM reports
                GROUP BY filename
                HAVING COUNT(*) > 1
                ORDER BY count DESC
                LIMIT 10
            ''')

            stats['duplicate_filenames'] = [
                {
                    'filename': row[0],
                    'upload_count': row[1],
                    'total_items': row[2]
                }
                for row in rows
            ]

            stats['duplicate_count'] = sum(
                item['upload_count'] - 1 for item in stats['duplicate_filenames']
            )

            return stats

        except Exception as e:
            logger.error(f"Error getting database stats: {e}")
            return {'error': str(e)}

    @staticmethod
    def find_duplicate_reports() -> List[Dict]:
        """
        Find reports that are likely duplicates based on:
        - Same filename
        - Same total_rows
        - Same uploaded_by

        Returns:
            List of duplicate report pairs
        """
        from ..db import get_db_provider

        provider = get_db_provider()

        try:
            # Find reports with same filename AND same row count
            query = '''
                SELECT
                    r1.id as original_id,
                    r1.report_uuid as original_uuid,
                    r1.filename,
                    r1.uploaded_by,
                    r1.uploaded_at as original_date,
                    r1.total_rows,
                    r2.id as duplicate_id,
                    r2.report_uuid as duplicate_uuid,
                    r2.uploaded_at as duplicate_date
                FROM reports r1
                INNER JOIN reports r2
                    ON r1.filename = r2.filename
                    AND r1.total_rows = r2.total_rows
                    AND r1.id < r2.id
                ORDER BY r1.filename, r1.uploaded_at
            '''

            rows = provider.fetchall(query)

            duplicates = []
            for row in rows:
                duplicates.append({
                    'original_id': row[0],
                    'original_uuid': row[1],
                    'filename': row[2],
                    'uploaded_by': row[3],
                    'original_date': str(row[4]),
                    'total_rows': row[5],
                    'duplicate_id': row[6],
                    'duplicate_uuid': row[7],
                    'duplicate_date': str(row[8])
                })

            return duplicates

        except Exception as e:
            logger.error(f"Error finding duplicates: {e}")
            return []

    @staticmethod
    def delete_duplicate_reports(keep: str = 'newest') -> Tuple[bool, str, int]:
        """
        Delete duplicate reports, keeping either newest or oldest.

        Args:
            keep: 'newest' or 'oldest' - which duplicate to keep

        Returns:
            (success, message, count_deleted)
        """
        from ..db import get_db_provider

        provider = get_db_provider()
        placeholder = provider.placeholder

        try:
            # Find all duplicate groups
            duplicates = DatabaseOptimizer.find_duplicate_reports()

            if not duplicates:
                return True, "No duplicates found", 0

            # Collect IDs to delete
            ids_to_delete = set()

            for dup in duplicates:
                if keep == 'newest':
                    # Delete the older one (original)
                    ids_to_delete.add(dup['original_id'])
                else:
                    # Delete the newer one (duplicate)
                    ids_to_delete.add(dup['duplicate_id'])

            if not ids_to_delete:
                return True, "No duplicates to delete", 0

            with provider.get_connection() as conn:
                cursor = conn.cursor()

                # Delete report items first (CASCADE should handle this, but be safe)
                id_placeholders = ', '.join([placeholder] * len(ids_to_delete))
                cursor.execute(
                    f'DELETE FROM report_items WHERE report_id IN ({id_placeholders})',
                    tuple(ids_to_delete)
                )

                # Delete reports
                cursor.execute(
                    f'DELETE FROM reports WHERE id IN ({id_placeholders})',
                    tuple(ids_to_delete)
                )

                conn.commit()

            count = len(ids_to_delete)
            logger.info(f"Deleted {count} duplicate reports (kept {keep})")
            return True, f"Deleted {count} duplicate reports", count

        except Exception as e:
            logger.error(f"Error deleting duplicates: {e}")
            return False, str(e), 0

    @staticmethod
    def delete_old_reports(days_to_keep: int = 90) -> Tuple[bool, str, int]:
        """
        Delete reports older than specified days.

        Args:
            days_to_keep: Keep reports from last N days

        Returns:
            (success, message, count_deleted)
        """
        from ..db import get_db_provider

        provider = get_db_provider()
        placeholder = provider.placeholder

        try:
            threshold = datetime.now() - timedelta(days=days_to_keep)

            # Format threshold based on DB type
            if provider.db_type == 'sqlite':
                threshold_str = threshold.strftime('%Y-%m-%d %H:%M:%S')
            else:
                threshold_str = threshold.isoformat()

            with provider.get_connection() as conn:
                cursor = conn.cursor()

                # Count reports to delete
                cursor.execute(
                    f'SELECT COUNT(*) FROM reports WHERE uploaded_at < {placeholder}',
                    (threshold_str,)
                )
                count_to_delete = cursor.fetchone()[0]

                if count_to_delete == 0:
                    return True, "No old reports to delete", 0

                # Count items that will be deleted
                cursor.execute(
                    f'''SELECT COUNT(*) FROM report_items WHERE report_id IN (
                        SELECT id FROM reports WHERE uploaded_at < {placeholder}
                    )''',
                    (threshold_str,)
                )
                items_to_delete = cursor.fetchone()[0]

                # Delete report items first (in case CASCADE isn't set up)
                cursor.execute(
                    f'''DELETE FROM report_items WHERE report_id IN (
                        SELECT id FROM reports WHERE uploaded_at < {placeholder}
                    )''',
                    (threshold_str,)
                )

                # Delete reports
                cursor.execute(
                    f'DELETE FROM reports WHERE uploaded_at < {placeholder}',
                    (threshold_str,)
                )

                conn.commit()

            logger.info(f"Deleted {count_to_delete} old reports and {items_to_delete} items")
            return True, f"Deleted {count_to_delete} reports and {items_to_delete} items older than {days_to_keep} days", count_to_delete

        except Exception as e:
            logger.error(f"Error deleting old reports: {e}")
            return False, str(e), 0

    @staticmethod
    def delete_specific_reports(report_uuids: List[str]) -> Tuple[bool, str, int]:
        """
        Delete specific reports by UUID.

        Args:
            report_uuids: List of report UUIDs to delete

        Returns:
            (success, message, count_deleted)
        """
        from ..db import get_db_provider

        provider = get_db_provider()
        placeholder = provider.placeholder

        if not report_uuids:
            return True, "No reports specified", 0

        try:
            with provider.get_connection() as conn:
                cursor = conn.cursor()

                deleted_count = 0
                for uuid in report_uuids:
                    # Get report ID
                    cursor.execute(
                        f'SELECT id FROM reports WHERE report_uuid = {placeholder}',
                        (uuid,)
                    )
                    row = cursor.fetchone()
                    if row:
                        report_id = row[0]

                        # Delete items
                        cursor.execute(
                            f'DELETE FROM report_items WHERE report_id = {placeholder}',
                            (report_id,)
                        )

                        # Delete report
                        cursor.execute(
                            f'DELETE FROM reports WHERE id = {placeholder}',
                            (report_id,)
                        )
                        deleted_count += 1

                conn.commit()

            return True, f"Deleted {deleted_count} reports", deleted_count

        except Exception as e:
            logger.error(f"Error deleting reports: {e}")
            return False, str(e), 0

    @staticmethod
    def vacuum_database() -> Tuple[bool, str]:
        """
        Optimize database (VACUUM for SQLite, OPTIMIZE for MySQL, etc.)
        Reclaims unused space after deletions.

        Returns:
            (success, message)
        """
        from ..db import get_db_provider

        provider = get_db_provider()

        try:
            if provider.db_type == 'sqlite':
                with provider.get_connection() as conn:
                    # VACUUM must be run outside of transaction
                    conn.isolation_level = None
                    conn.execute('VACUUM')
                    conn.isolation_level = ''

                logger.info("SQLite database vacuumed successfully")
                return True, "Database vacuumed - unused space reclaimed"

            elif provider.db_type == 'mysql':
                with provider.get_connection() as conn:
                    cursor = conn.cursor()
                    cursor.execute('OPTIMIZE TABLE reports, report_items, hostnames, rules')

                logger.info("MySQL tables optimized")
                return True, "Database tables optimized"

            elif provider.db_type == 'postgresql':
                with provider.get_connection() as conn:
                    old_isolation = conn.isolation_level
                    conn.set_isolation_level(0)  # Autocommit mode for VACUUM
                    cursor = conn.cursor()
                    cursor.execute('VACUUM ANALYZE')
                    conn.set_isolation_level(old_isolation)

                logger.info("PostgreSQL database vacuumed")
                return True, "Database vacuumed and analyzed"

            elif provider.db_type == 'mssql':
                with provider.get_connection() as conn:
                    cursor = conn.cursor()
                    # SQL Server uses different approach
                    cursor.execute('DBCC SHRINKDATABASE (0)')

                logger.info("SQL Server database shrunk")
                return True, "Database shrunk"

            else:
                return True, "Database optimization not applicable for this database type"

        except Exception as e:
            logger.error(f"Error vacuuming database: {e}")
            return False, f"Optimization failed: {str(e)}"

    @staticmethod
    def full_cleanup(
        delete_old: bool = True,
        retention_days: int = 90,
        delete_duplicates: bool = True,
        vacuum: bool = True
    ) -> Dict:
        """
        Run full database cleanup with all optimization options.

        Args:
            delete_old: Whether to delete old reports
            retention_days: Days of reports to keep
            delete_duplicates: Whether to delete duplicate reports
            vacuum: Whether to vacuum the database after

        Returns:
            Dictionary with results of each action
        """
        results = {
            'success': True,
            'actions': []
        }

        # Delete old reports
        if delete_old:
            success, msg, count = DatabaseOptimizer.delete_old_reports(retention_days)
            results['actions'].append({
                'action': 'delete_old_reports',
                'success': success,
                'message': msg,
                'deleted_count': count
            })
            if not success:
                results['success'] = False

        # Delete duplicates
        if delete_duplicates:
            success, msg, count = DatabaseOptimizer.delete_duplicate_reports(keep='newest')
            results['actions'].append({
                'action': 'delete_duplicates',
                'success': success,
                'message': msg,
                'deleted_count': count
            })
            if not success:
                results['success'] = False

        # Vacuum database
        if vacuum:
            success, msg = DatabaseOptimizer.vacuum_database()
            results['actions'].append({
                'action': 'vacuum',
                'success': success,
                'message': msg
            })
            if not success:
                results['success'] = False

        return results
