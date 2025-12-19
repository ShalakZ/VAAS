"""
Database Settings Routes for VAAS
Handles database configuration, testing, and migration.
"""

import logging
from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify
from flask_login import current_user

from .settings import (
    load_database_settings,
    save_database_settings,
    mask_password,
    validate_settings,
    get_default_port
)
from . import test_database_connection, get_database_info, reload_provider

logger = logging.getLogger(__name__)

db_bp = Blueprint('db', __name__, template_folder='../web/templates')


def is_auth_enabled():
    """Check if authentication is enabled."""
    from ..auth.routes import is_auth_enabled as auth_check
    return auth_check()


@db_bp.route('/settings/database', methods=['GET'])
def database_settings_page():
    """Database settings page - admin only when auth enabled."""
    if is_auth_enabled():
        if not current_user.is_authenticated:
            return redirect(url_for('auth.login'))
        if not getattr(current_user, 'is_admin', False):
            flash('Admin access required', 'error')
            return redirect(url_for('web.index'))

    settings = load_database_settings()
    settings = mask_password(settings)
    db_info = get_database_info()

    return render_template('database_settings.html', settings=settings, db_info=db_info)


@db_bp.route('/api/database/settings', methods=['GET'])
def get_database_settings_api():
    """Get database settings (password masked)."""
    settings = load_database_settings()
    settings = mask_password(settings)
    db_info = get_database_info()

    return jsonify({
        'success': True,
        'settings': settings,
        'db_info': db_info
    })


@db_bp.route('/api/database/settings', methods=['POST'])
def save_database_settings_api():
    """Save database settings."""
    if is_auth_enabled():
        if not current_user.is_authenticated or not getattr(current_user, 'is_admin', False):
            return jsonify({'success': False, 'message': 'Admin access required'}), 403

    data = request.json
    from ..config import Config

    settings = {
        'DB_TYPE': data.get('db_type', 'sqlite').lower(),
        'DB_HOST': data.get('host', '').strip(),
        'DB_PORT': data.get('port'),
        'DB_NAME': data.get('database', '').strip(),
        'DB_USER': data.get('username', '').strip(),
        'DB_PASSWORD': data.get('password', '').strip() if data.get('password', '') != '********' else '',
        'DB_SSL_ENABLED': data.get('ssl_enabled', False),
        'DB_SSL_CA_CERT': data.get('ssl_ca_cert', '').strip(),
        'DB_SSL_MODE': data.get('ssl_mode', 'require'),
        'DB_CONNECTION_TIMEOUT': data.get('connection_timeout', 30),
        'AZURE_AD_AUTH': data.get('azure_ad_auth', False),
        'TRUST_SERVER_CERTIFICATE': data.get('trust_server_certificate', False),
    }

    # Set SQLite file path when SQLite is selected
    if settings['DB_TYPE'] == 'sqlite':
        settings['SQLITE_FILE'] = Config.DATABASE_FILE

    # Set default port if not provided
    if not settings['DB_PORT'] and settings['DB_TYPE'] != 'sqlite':
        settings['DB_PORT'] = get_default_port(settings['DB_TYPE'])

    # Validate settings
    valid, errors = validate_settings(settings)
    if not valid:
        return jsonify({'success': False, 'message': 'Validation failed', 'errors': errors}), 400

    # Save settings
    success, message = save_database_settings(settings)

    if success:
        # Reload the database provider
        try:
            reload_provider()
        except Exception as e:
            logger.warning(f"Failed to reload provider after settings change: {e}")

    return jsonify({'success': success, 'message': message})


@db_bp.route('/api/database/test', methods=['POST'])
def test_database_connection_api():
    """Test database connection with provided settings."""
    data = request.json

    test_settings = {
        'DB_TYPE': data.get('db_type', 'sqlite').lower(),
        'DB_HOST': data.get('host', '').strip(),
        'DB_PORT': data.get('port'),
        'DB_NAME': data.get('database', '').strip(),
        'DB_USER': data.get('username', '').strip(),
        'DB_PASSWORD': data.get('password', '').strip(),
        'DB_SSL_ENABLED': data.get('ssl_enabled', False),
        'DB_SSL_CA_CERT': data.get('ssl_ca_cert', '').strip(),
        'DB_SSL_MODE': data.get('ssl_mode', 'require'),
        'DB_CONNECTION_TIMEOUT': data.get('connection_timeout', 30),
        'AZURE_AD_AUTH': data.get('azure_ad_auth', False),
        'TRUST_SERVER_CERTIFICATE': data.get('trust_server_certificate', False),
    }

    # Set default port if not provided
    if not test_settings['DB_PORT'] and test_settings['DB_TYPE'] != 'sqlite':
        test_settings['DB_PORT'] = get_default_port(test_settings['DB_TYPE'])

    # If password is masked, get the existing password
    if test_settings['DB_PASSWORD'] == '********':
        existing = load_database_settings()
        test_settings['DB_PASSWORD'] = existing.get('DB_PASSWORD', '')

    # For SQLite, use the current database file
    if test_settings['DB_TYPE'] == 'sqlite':
        from ..config import Config
        test_settings['SQLITE_FILE'] = Config.DATABASE_FILE

    success, message = test_database_connection(test_settings)

    return jsonify({
        'success': success,
        'message': message
    })


@db_bp.route('/api/database/info', methods=['GET'])
def get_database_info_api():
    """Get current database information."""
    info = get_database_info()
    return jsonify({
        'success': True,
        'info': info
    })


@db_bp.route('/api/database/migrate', methods=['POST'])
def migrate_database_api():
    """Migrate data from SQLite to external database."""
    if is_auth_enabled():
        if not current_user.is_authenticated or not getattr(current_user, 'is_admin', False):
            return jsonify({'success': False, 'message': 'Admin access required'}), 403

    data = request.json
    confirm = data.get('confirm', False)
    preserve_sqlite = data.get('preserve_sqlite', True)

    if not confirm:
        return jsonify({
            'success': False,
            'message': 'Please confirm the migration by setting confirm=true'
        }), 400

    try:
        from .migrator import Migrator

        migrator = Migrator()
        success, message = migrator.migrate(preserve_source=preserve_sqlite)

        if success:
            # Reload provider to use the new database
            reload_provider()

        return jsonify({
            'success': success,
            'message': message
        })

    except ImportError:
        return jsonify({
            'success': False,
            'message': 'Migration module not available'
        }), 500
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        return jsonify({
            'success': False,
            'message': f'Migration failed: {str(e)}'
        }), 500


@db_bp.route('/api/database/default-port', methods=['GET'])
def get_default_port_api():
    """Get the default port for a database type."""
    db_type = request.args.get('type', 'sqlite')
    port = get_default_port(db_type)
    return jsonify({
        'success': True,
        'port': port
    })


# ============================================================================
# Scheduler API Endpoints
# ============================================================================

@db_bp.route('/api/scheduler/status', methods=['GET'])
def get_scheduler_status():
    """Get scheduler status and settings."""
    try:
        from ..core.scheduler import get_scheduler_status
        status = get_scheduler_status()
        return jsonify({
            'success': True,
            'status': status
        })
    except Exception as e:
        logger.error(f"Failed to get scheduler status: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@db_bp.route('/api/scheduler/settings', methods=['POST'])
def update_scheduler_settings():
    """Update scheduler settings."""
    if is_auth_enabled():
        if not current_user.is_authenticated or not getattr(current_user, 'is_admin', False):
            return jsonify({'success': False, 'message': 'Admin access required'}), 403

    data = request.json

    try:
        # Load existing settings and update scheduler fields
        settings = load_database_settings()

        settings['AUTO_CLEANUP_ENABLED'] = data.get('enabled', False)
        settings['AUTO_CLEANUP_INTERVAL_DAYS'] = max(1, int(data.get('interval_days', 7)))
        settings['AUTO_CLEANUP_RETENTION_DAYS'] = max(1, int(data.get('retention_days', 30)))

        # Save settings
        success, message = save_database_settings(settings)

        if success:
            # Restart scheduler with new settings
            from ..core.scheduler import restart_scheduler
            restart_scheduler()

        return jsonify({
            'success': success,
            'message': message if not success else 'Scheduler settings updated successfully'
        })
    except Exception as e:
        logger.error(f"Failed to update scheduler settings: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@db_bp.route('/api/scheduler/run', methods=['POST'])
def run_scheduler_now():
    """Trigger immediate cleanup."""
    if is_auth_enabled():
        if not current_user.is_authenticated or not getattr(current_user, 'is_admin', False):
            return jsonify({'success': False, 'message': 'Admin access required'}), 403

    try:
        from ..core.scheduler import run_cleanup_now
        result = run_cleanup_now()
        return jsonify({
            'success': result.get('success', False),
            'message': result.get('message', 'Cleanup completed'),
            'deleted_reports': result.get('deleted_reports', 0),
            'vacuum_success': result.get('vacuum_success', False)
        })
    except Exception as e:
        logger.error(f"Failed to run cleanup: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@db_bp.route('/api/scheduler/restart', methods=['POST'])
def restart_scheduler_api():
    """Restart the scheduler."""
    if is_auth_enabled():
        if not current_user.is_authenticated or not getattr(current_user, 'is_admin', False):
            return jsonify({'success': False, 'message': 'Admin access required'}), 403

    try:
        from ..core.scheduler import restart_scheduler
        restart_scheduler()
        return jsonify({
            'success': True,
            'message': 'Scheduler restarted successfully'
        })
    except Exception as e:
        logger.error(f"Failed to restart scheduler: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500
