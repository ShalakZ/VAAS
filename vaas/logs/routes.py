"""
Logs Routes Blueprint
API endpoints and UI for viewing and managing application logs.
"""

import os
import io
from datetime import datetime, timedelta, timezone
from flask import Blueprint, request, jsonify, render_template, send_file
from flask_login import current_user

from ..auth.permissions import require_permission, admin_required
from ..core.logging_config import LogDatabase, LogCategory, LogLevel, AuditLogger


logs_bp = Blueprint('logs', __name__, url_prefix='/settings', template_folder='../web/templates')


@logs_bp.route('/logs')
@admin_required
def logs_page():
    """Render the audit logs settings page."""
    from ..auth.permissions import get_role_display_name

    user_info = {
        'username': current_user.username if current_user.is_authenticated else 'Guest',
        'display_name': getattr(current_user, 'display_name', 'Guest') if current_user.is_authenticated else 'Guest',
        'role': getattr(current_user, 'role', 'viewer') if current_user.is_authenticated else 'viewer',
        'role_display': get_role_display_name(getattr(current_user, 'role', 'viewer')) if current_user.is_authenticated else 'Guest',
        'is_admin': getattr(current_user, 'is_admin', False) if current_user.is_authenticated else False,
    }

    # Log the page access
    AuditLogger.log_security_event(
        f"User {user_info['username']} accessed audit logs page",
        level=LogLevel.INFO
    )

    return render_template('audit_logs.html', user_info=user_info)


@logs_bp.route('/api/logs', methods=['GET'])
@admin_required
def get_logs():
    """
    Get logs with filtering and pagination.

    Query parameters:
        category: Filter by category (application, audit, security, system, database, auth)
        level: Filter by level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        username: Filter by username
        start_date: Start date (ISO format)
        end_date: End date (ISO format)
        search: Search in message
        limit: Results per page (default: 100)
        offset: Offset for pagination (default: 0)
    """
    try:
        # Extract query parameters
        category = request.args.get('category')
        level = request.args.get('level')
        username = request.args.get('username')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        search = request.args.get('search')
        limit = request.args.get('limit', 100, type=int)
        offset = request.args.get('offset', 0, type=int)

        # Validate limit
        if limit > 1000:
            limit = 1000

        # Query logs
        logs = LogDatabase.query_logs(
            category=category,
            level=level,
            username=username,
            start_date=start_date,
            end_date=end_date,
            search=search,
            limit=limit,
            offset=offset
        )

        # Get total count
        total = LogDatabase.count_logs(
            category=category,
            level=level,
            username=username,
            start_date=start_date,
            end_date=end_date,
            search=search
        )

        return jsonify({
            'success': True,
            'logs': logs,
            'total': total,
            'limit': limit,
            'offset': offset
        })

    except Exception as e:
        AuditLogger.log_system_event(
            f"Error retrieving logs: {str(e)}",
            level=LogLevel.ERROR
        )
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@logs_bp.route('/api/logs/statistics', methods=['GET'])
@admin_required
def get_log_statistics():
    """Get statistics about stored logs."""
    try:
        stats = LogDatabase.get_log_statistics()
        return jsonify({
            'success': True,
            'statistics': stats
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@logs_bp.route('/api/logs/categories', methods=['GET'])
@admin_required
def get_log_categories():
    """Get available log categories."""
    categories = [
        {'value': LogCategory.APPLICATION, 'label': 'Application Logs', 'description': 'General application events'},
        {'value': LogCategory.AUDIT, 'label': 'Audit Logs', 'description': 'User actions and changes'},
        {'value': LogCategory.SECURITY, 'label': 'Security Logs', 'description': 'Security events and alerts'},
        {'value': LogCategory.SYSTEM, 'label': 'System Logs', 'description': 'System-level operations'},
        {'value': LogCategory.DATABASE, 'label': 'Database Logs', 'description': 'Database operations'},
        {'value': LogCategory.AUTH, 'label': 'Authentication Logs', 'description': 'Login and authentication events'},
    ]
    return jsonify({
        'success': True,
        'categories': categories
    })


@logs_bp.route('/api/logs/levels', methods=['GET'])
@admin_required
def get_log_levels():
    """Get available log levels."""
    levels = [
        {'value': LogLevel.DEBUG, 'label': 'Debug', 'color': 'gray'},
        {'value': LogLevel.INFO, 'label': 'Info', 'color': 'blue'},
        {'value': LogLevel.WARNING, 'label': 'Warning', 'color': 'yellow'},
        {'value': LogLevel.ERROR, 'label': 'Error', 'color': 'red'},
        {'value': LogLevel.CRITICAL, 'label': 'Critical', 'color': 'purple'},
    ]
    return jsonify({
        'success': True,
        'levels': levels
    })


@logs_bp.route('/api/logs/export', methods=['POST'])
@admin_required
def export_logs():
    """
    Export filtered logs to CSV file.

    Accepts same filters as /api/logs endpoint.
    """
    try:
        data = request.json or {}

        # Extract filters
        category = data.get('category')
        level = data.get('level')
        username = data.get('username')
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        search = data.get('search')

        # Query all matching logs (no limit)
        logs = LogDatabase.query_logs(
            category=category,
            level=level,
            username=username,
            start_date=start_date,
            end_date=end_date,
            search=search,
            limit=10000,  # Reasonable limit for export
            offset=0
        )

        # Create CSV
        import csv
        output = io.StringIO()
        writer = csv.writer(output)

        # Write header
        writer.writerow([
            'Timestamp', 'Category', 'Level', 'Message', 'Username',
            'IP Address', 'User Agent', 'Endpoint', 'Method', 'Status Code', 'Details'
        ])

        # Write data
        for log in logs:
            writer.writerow([
                log.get('timestamp', ''),
                log.get('category', ''),
                log.get('level', ''),
                log.get('message', ''),
                log.get('username', ''),
                log.get('ip_address', ''),
                log.get('user_agent', ''),
                log.get('endpoint', ''),
                log.get('method', ''),
                log.get('status_code', ''),
                log.get('details', '')
            ])

        # Log the export action
        AuditLogger.log_security_event(
            f"User exported {len(logs)} log entries",
            level=LogLevel.INFO,
            details={'filters': data}
        )

        # Convert to bytes
        output.seek(0)
        csv_bytes = io.BytesIO(output.getvalue().encode('utf-8'))

        # Generate filename with timestamp
        filename = f"vaas_logs_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"

        return send_file(
            csv_bytes,
            as_attachment=True,
            download_name=filename,
            mimetype='text/csv'
        )

    except Exception as e:
        AuditLogger.log_system_event(
            f"Error exporting logs: {str(e)}",
            level=LogLevel.ERROR
        )
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@logs_bp.route('/api/logs/cleanup', methods=['POST'])
@admin_required
def cleanup_logs():
    """
    Clean up old logs.

    Body:
        days: Number of days to retain (default: 90)
    """
    try:
        data = request.json or {}
        days = data.get('days', 90)

        # Validate days
        if days < 1:
            return jsonify({
                'success': False,
                'error': 'Days must be at least 1'
            }), 400

        deleted = LogDatabase.cleanup_old_logs(days)

        # Log the cleanup action
        AuditLogger.log_system_event(
            f"User cleaned up {deleted} log entries older than {days} days",
            level=LogLevel.WARNING,
            details={'days': days, 'deleted': deleted}
        )

        return jsonify({
            'success': True,
            'message': f'Deleted {deleted} log entries older than {days} days',
            'deleted': deleted
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@logs_bp.route('/api/logs/tail', methods=['GET'])
@admin_required
def tail_logs():
    """
    Get the most recent logs for live viewing.

    Query parameters:
        category: Filter by category
        level: Filter by level
        count: Number of recent logs to fetch (default: 50, max: 200)
    """
    try:
        category = request.args.get('category')
        level = request.args.get('level')
        count = request.args.get('count', 50, type=int)

        # Validate count
        if count > 200:
            count = 200

        logs = LogDatabase.query_logs(
            category=category,
            level=level,
            limit=count,
            offset=0
        )

        return jsonify({
            'success': True,
            'logs': logs
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@logs_bp.route('/api/logs/system', methods=['GET'])
@admin_required
def get_system_logs():
    """
    Get system logs from log files.

    This endpoint reads the application log file directly for troubleshooting.
    """
    try:
        from ..config import Config

        log_dir = os.path.join(Config.DATA_DIR, 'logs')
        log_type = request.args.get('type', 'application')  # application or error
        lines = request.args.get('lines', 100, type=int)

        if lines > 1000:
            lines = 1000

        # Determine log file
        if log_type == 'error':
            log_file = os.path.join(log_dir, 'error.log')
        else:
            log_file = os.path.join(log_dir, 'application.log')

        # Read log file
        if not os.path.exists(log_file):
            return jsonify({
                'success': True,
                'logs': [],
                'message': 'Log file does not exist yet'
            })

        # Read last N lines
        with open(log_file, 'r') as f:
            all_lines = f.readlines()
            recent_lines = all_lines[-lines:]

        return jsonify({
            'success': True,
            'logs': recent_lines,
            'total_lines': len(all_lines)
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@logs_bp.route('/api/logs/test', methods=['POST'])
@admin_required
def test_all_log_types():
    """
    QA endpoint to trigger all log types for testing.
    Creates one log entry for each category with different levels.
    """
    try:
        test_results = []

        # 1. Application Log
        AuditLogger.log_app_event(
            "TEST: Application log entry - normal app operation",
            level=LogLevel.INFO,
            details={'test': True, 'type': 'application'}
        )
        test_results.append({'category': 'application', 'level': 'INFO', 'status': 'created'})

        # 2. Audit Log (general user action tracking)
        AuditLogger.log_action(
            category=LogCategory.AUDIT,
            message="TEST: Audit log entry - user performed an action",
            level=LogLevel.INFO,
            details={'test': True, 'type': 'audit', 'action': 'test_action'}
        )
        test_results.append({'category': 'audit', 'level': 'INFO', 'status': 'created'})

        # 3. Security Log
        AuditLogger.log_security_event(
            "TEST: Security log entry - security-related event",
            level=LogLevel.WARNING,
            details={'test': True, 'type': 'security', 'event': 'test_security_check'}
        )
        test_results.append({'category': 'security', 'level': 'WARNING', 'status': 'created'})

        # 4. Authentication Log
        AuditLogger.log_auth_event(
            "TEST: Authentication log entry - login/logout event",
            level=LogLevel.INFO,
            details={'test': True, 'type': 'auth', 'event': 'test_auth_check'}
        )
        test_results.append({'category': 'auth', 'level': 'INFO', 'status': 'created'})

        # 5. Database Log
        AuditLogger.log_db_event(
            "TEST: Database log entry - database operation",
            level=LogLevel.INFO,
            details={'test': True, 'type': 'database', 'operation': 'test_query'}
        )
        test_results.append({'category': 'database', 'level': 'INFO', 'status': 'created'})

        # 6. System Log
        AuditLogger.log_system_event(
            "TEST: System log entry - system-level operation",
            level=LogLevel.INFO,
            details={'test': True, 'type': 'system', 'operation': 'test_system_op'}
        )
        test_results.append({'category': 'system', 'level': 'INFO', 'status': 'created'})

        # Also test different log levels
        AuditLogger.log_app_event(
            "TEST: Debug level log entry",
            level=LogLevel.DEBUG,
            details={'test': True, 'level_test': 'debug'}
        )
        test_results.append({'category': 'application', 'level': 'DEBUG', 'status': 'created'})

        AuditLogger.log_app_event(
            "TEST: Warning level log entry",
            level=LogLevel.WARNING,
            details={'test': True, 'level_test': 'warning'}
        )
        test_results.append({'category': 'application', 'level': 'WARNING', 'status': 'created'})

        AuditLogger.log_app_event(
            "TEST: Error level log entry",
            level=LogLevel.ERROR,
            details={'test': True, 'level_test': 'error'}
        )
        test_results.append({'category': 'application', 'level': 'ERROR', 'status': 'created'})

        return jsonify({
            'success': True,
            'message': f'Created {len(test_results)} test log entries across all categories',
            'results': test_results
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
