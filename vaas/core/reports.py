"""
Reports Database Module for VAAS
Manages classification report storage and retrieval.
"""

import uuid
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Any

from ..db import get_db_provider

logger = logging.getLogger(__name__)


class DateTimeEncoder(json.JSONEncoder):
    """JSON Encoder that handles datetime and Timestamp objects."""
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        # Handle pandas Timestamp if present
        if hasattr(obj, 'isoformat'):
            return obj.isoformat()
        return super().default(obj)


class ReportsDB:
    """Database operations for classification reports."""

    @staticmethod
    def _get_provider():
        """Returns the database provider instance."""
        return get_db_provider()

    @staticmethod
    def create_report(
        filename: str,
        uploaded_by: str,
        items: List[Dict[str, Any]],
        metadata: Optional[Dict] = None
    ) -> Tuple[bool, str, Optional[str]]:
        """
        Create a new report with its items.

        Args:
            filename: Original uploaded filename
            uploaded_by: Username who uploaded the file
            items: List of classified items (each dict should have hostname, title, assigned_team, etc.)
            metadata: Optional additional metadata

        Returns:
            Tuple of (success, message, report_uuid or None)
        """
        provider = ReportsDB._get_provider()
        placeholder = provider.placeholder
        report_uuid = str(uuid.uuid4())

        try:
            # Calculate stats
            total_rows = len(items)
            needs_review_count = sum(1 for item in items if item.get('Needs_Review', False))
            classified_count = total_rows - needs_review_count

            with provider.get_connection() as conn:
                cursor = conn.cursor()

                # Insert report
                metadata_json = json.dumps(metadata, cls=DateTimeEncoder) if metadata else None

                if provider.db_type == 'mssql':
                    # MSSQL: Execute INSERT and SELECT SCOPE_IDENTITY() in one go
                    # SET NOCOUNT ON prevents "rows affected" message from interfering with fetchone()
                    cursor.execute(f'''
                        SET NOCOUNT ON;
                        INSERT INTO reports (report_uuid, filename, uploaded_by, total_rows, classified_count, needs_review_count, status, metadata)
                        VALUES ({placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder});
                        SELECT SCOPE_IDENTITY();
                    ''', (report_uuid, filename, uploaded_by, total_rows, classified_count, needs_review_count, 'completed', metadata_json))
                    
                    row = cursor.fetchone()
                    if row:
                        report_id = int(row[0])
                    else:
                        raise Exception("Failed to retrieve new report ID from MSSQL")
                else:
                    # Standard INSERT for other DBs
                    cursor.execute(f'''
                        INSERT INTO reports (report_uuid, filename, uploaded_by, total_rows, classified_count, needs_review_count, status, metadata)
                        VALUES ({placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder})
                    ''', (report_uuid, filename, uploaded_by, total_rows, classified_count, needs_review_count, 'completed', metadata_json))

                    # Get the inserted report ID
                    if provider.db_type == 'sqlite':
                        report_id = cursor.lastrowid
                    elif provider.db_type == 'postgresql':
                        cursor.execute('SELECT lastval()')
                        report_id = cursor.fetchone()[0]
                    elif provider.db_type == 'mysql':
                        cursor.execute('SELECT LAST_INSERT_ID()')
                        report_id = cursor.fetchone()[0]
                    else:
                        # Fallback: query by UUID
                        cursor.execute(f'SELECT id FROM reports WHERE report_uuid = {placeholder}', (report_uuid,))
                        report_id = cursor.fetchone()[0]

                # Insert report items using executemany for better performance
                # OPTIMIZATION: Only store essential fields in original_data to reduce DB bloat
                # Previously stored entire row (15x size increase), now store only classification metadata
                items_params = []
                for item in items:
                    hostname = item.get('hostname', item.get('Hostname', ''))
                    title = item.get('Title', item.get('title', ''))
                    assigned_team = item.get('Assigned_Team', item.get('assigned_team', ''))
                    reason = item.get('Reason', item.get('reason', ''))
                    needs_review = 1 if item.get('Needs_Review', item.get('needs_review', False)) else 0
                    method = item.get('Method', item.get('method', ''))

                    # Store only classification-specific metadata, not the entire row
                    classification_meta = {
                        'Fuzzy_Score': item.get('Fuzzy_Score'),
                        'Matched_Rule': item.get('Matched_Rule'),
                    }
                    # Only add non-null values to keep storage minimal
                    classification_meta = {k: v for k, v in classification_meta.items() if v is not None}
                    original_data = json.dumps(classification_meta, cls=DateTimeEncoder) if classification_meta else None

                    items_params.append((report_id, hostname, title, assigned_team, reason, needs_review, method, original_data))

                cursor.executemany(f'''
                    INSERT INTO report_items (report_id, hostname, title, assigned_team, reason, needs_review, method, original_data)
                    VALUES ({placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder})
                ''', items_params)

                conn.commit()

            logger.info(f"Created report {report_uuid} with {total_rows} items")
            return True, "Report created successfully", report_uuid

        except Exception as e:
            logger.error(f"Error creating report: {e}")
            return False, str(e), None

    @staticmethod
    def get_report(report_uuid: str) -> Optional[Dict]:
        """
        Get a report by UUID with all its items.

        Args:
            report_uuid: The report UUID

        Returns:
            Report dict with items, or None if not found
        """
        provider = ReportsDB._get_provider()
        placeholder = provider.placeholder

        try:
            # Get report
            row = provider.fetchone(f'''
                SELECT id, report_uuid, filename, uploaded_by, uploaded_at, total_rows, classified_count, needs_review_count, status, metadata
                FROM reports WHERE report_uuid = {placeholder}
            ''', (report_uuid,))

            if not row:
                return None

            report = {
                'id': row[0],
                'report_uuid': row[1],
                'filename': row[2],
                'uploaded_by': row[3],
                'uploaded_at': str(row[4]) if row[4] else None,
                'total_rows': row[5],
                'classified_count': row[6],
                'needs_review_count': row[7],
                'status': row[8],
                'metadata': json.loads(row[9]) if row[9] else None,
                'items': []
            }

            # Get report items
            items_rows = provider.fetchall(f'''
                SELECT id, hostname, title, assigned_team, reason, needs_review, method, original_data, created_at
                FROM report_items WHERE report_id = {placeholder}
                ORDER BY id
            ''', (row[0],))

            for item_row in items_rows:
                original_data = None
                if item_row[7]:
                    try:
                        original_data = json.loads(item_row[7])
                    except:
                        original_data = item_row[7]

                report['items'].append({
                    'id': item_row[0],
                    'hostname': item_row[1],
                    'title': item_row[2],
                    'assigned_team': item_row[3],
                    'reason': item_row[4],
                    'needs_review': bool(item_row[5]),
                    'method': item_row[6],
                    'original_data': original_data,
                    'created_at': str(item_row[8]) if item_row[8] else None
                })

            return report

        except Exception as e:
            logger.error(f"Error fetching report: {e}")
            return None

    @staticmethod
    def list_reports(limit: int = 50, offset: int = 0) -> List[Dict]:
        """
        List reports with pagination.

        Args:
            limit: Maximum number of reports to return
            offset: Number of reports to skip

        Returns:
            List of report dicts (without items)
        """
        provider = ReportsDB._get_provider()

        try:
            # Build query based on DB type for pagination
            if provider.db_type == 'mssql':
                query = f'''
                    SELECT id, report_uuid, filename, uploaded_by, uploaded_at, total_rows, classified_count, needs_review_count, status
                    FROM reports
                    ORDER BY uploaded_at DESC
                    OFFSET {offset} ROWS FETCH NEXT {limit} ROWS ONLY
                '''
                rows = provider.fetchall(query)
            else:
                query = f'''
                    SELECT id, report_uuid, filename, uploaded_by, uploaded_at, total_rows, classified_count, needs_review_count, status
                    FROM reports
                    ORDER BY uploaded_at DESC
                    LIMIT {limit} OFFSET {offset}
                '''
                rows = provider.fetchall(query)

            reports = []
            for row in rows:
                reports.append({
                    'id': row[0],
                    'report_uuid': row[1],
                    'filename': row[2],
                    'uploaded_by': row[3],
                    'uploaded_at': str(row[4]) if row[4] else None,
                    'total_rows': row[5],
                    'classified_count': row[6],
                    'needs_review_count': row[7],
                    'status': row[8]
                })

            return reports

        except Exception as e:
            logger.error(f"Error listing reports: {e}")
            return []

    @staticmethod
    def delete_report(report_uuid: str) -> Tuple[bool, str]:
        """
        Delete a report and all its items.

        Args:
            report_uuid: The report UUID to delete

        Returns:
            Tuple of (success, message)
        """
        provider = ReportsDB._get_provider()
        placeholder = provider.placeholder

        try:
            with provider.get_connection() as conn:
                cursor = conn.cursor()

                # Get report ID first
                cursor.execute(f'SELECT id FROM reports WHERE report_uuid = {placeholder}', (report_uuid,))
                row = cursor.fetchone()

                if not row:
                    return False, "Report not found"

                report_id = row[0]

                # Delete items first (if cascade delete not supported)
                cursor.execute(f'DELETE FROM report_items WHERE report_id = {placeholder}', (report_id,))

                # Delete report
                cursor.execute(f'DELETE FROM reports WHERE id = {placeholder}', (report_id,))

                conn.commit()

            logger.info(f"Deleted report {report_uuid}")
            return True, "Report deleted successfully"

        except Exception as e:
            logger.error(f"Error deleting report: {e}")
            return False, str(e)

    @staticmethod
    def get_reports_count() -> int:
        """
        Get total count of reports.

        Returns:
            Total number of reports
        """
        provider = ReportsDB._get_provider()

        try:
            row = provider.fetchone('SELECT COUNT(*) FROM reports')
            return row[0] if row else 0
        except Exception as e:
            logger.error(f"Error counting reports: {e}")
            return 0

    @staticmethod
    def get_report_items(report_uuid: str, limit: int = 100, offset: int = 0) -> List[Dict]:
        """
        Get items for a report with pagination.

        Args:
            report_uuid: The report UUID
            limit: Maximum items to return
            offset: Number of items to skip

        Returns:
            List of item dicts
        """
        provider = ReportsDB._get_provider()
        placeholder = provider.placeholder

        try:
            # First get report ID
            row = provider.fetchone(f'SELECT id FROM reports WHERE report_uuid = {placeholder}', (report_uuid,))
            if not row:
                return []

            report_id = row[0]

            # Get items with pagination
            if provider.db_type == 'mssql':
                query = f'''
                    SELECT id, hostname, title, assigned_team, reason, needs_review, method, original_data
                    FROM report_items WHERE report_id = {placeholder}
                    ORDER BY id
                    OFFSET {offset} ROWS FETCH NEXT {limit} ROWS ONLY
                '''
                rows = provider.fetchall(query, (report_id,))
            else:
                query = f'''
                    SELECT id, hostname, title, assigned_team, reason, needs_review, method, original_data
                    FROM report_items WHERE report_id = {placeholder}
                    ORDER BY id
                    LIMIT {limit} OFFSET {offset}
                '''
                rows = provider.fetchall(query, (report_id,))

            items = []
            for row in rows:
                original_data = None
                if row[7]:
                    try:
                        original_data = json.loads(row[7])
                    except:
                        original_data = row[7]

                items.append({
                    'id': row[0],
                    'hostname': row[1],
                    'title': row[2],
                    'assigned_team': row[3],
                    'reason': row[4],
                    'needs_review': bool(row[5]),
                    'method': row[6],
                    'original_data': original_data
                })

            return items

        except Exception as e:
            logger.error(f"Error fetching report items: {e}")
            return []

    @staticmethod
    def get_all_reports_for_migration() -> List[Dict]:
        """
        Get all reports with items for migration purposes.

        Returns:
            List of report dicts with all items
        """
        provider = ReportsDB._get_provider()

        try:
            reports = []
            rows = provider.fetchall('''
                SELECT id, report_uuid, filename, uploaded_by, uploaded_at, total_rows, classified_count, needs_review_count, status, metadata
                FROM reports
            ''')

            for row in rows:
                report = {
                    'report_uuid': row[1],
                    'filename': row[2],
                    'uploaded_by': row[3],
                    'uploaded_at': row[4],
                    'total_rows': row[5],
                    'classified_count': row[6],
                    'needs_review_count': row[7],
                    'status': row[8],
                    'metadata': row[9],
                    'items': []
                }

                # Get items for this report
                placeholder = provider.placeholder
                items_rows = provider.fetchall(f'''
                    SELECT hostname, title, assigned_team, reason, needs_review, method, original_data
                    FROM report_items WHERE report_id = {placeholder}
                ''', (row[0],))

                for item_row in items_rows:
                    report['items'].append({
                        'hostname': item_row[0],
                        'title': item_row[1],
                        'assigned_team': item_row[2],
                        'reason': item_row[3],
                        'needs_review': item_row[4],
                        'method': item_row[5],
                        'original_data': item_row[6]
                    })

                reports.append(report)

            return reports

        except Exception as e:
            logger.error(f"Error fetching all reports for migration: {e}")
            return []
