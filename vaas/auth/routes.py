"""
Authentication Routes for VAAS
Handles login, logout, user management, and LDAP settings.
"""

import os
import json
import logging
from functools import wraps
from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify, session
from flask_login import login_user, logout_user, login_required, current_user

from ..config import Config
from ..core.logging_config import AuditLogger, LogLevel
from .ldap_auth import LDAPAuth, User
from .user_db import UserDB, ROLE_VIEWER, ROLE_SECURITY_ADMIN, ROLE_ADMINISTRATOR, AUTH_TYPE_LOCAL, AUTH_TYPE_LDAP

logger = logging.getLogger(__name__)

auth_bp = Blueprint('auth', __name__, template_folder='../web/templates')

# LDAP Settings file path
LDAP_SETTINGS_FILE = os.path.join(Config.DATA_DIR, 'ldap_settings.json')

# Global LDAP authenticator instance
_ldap_auth = None


def get_ldap_auth():
    """Get or create the LDAP authenticator with current settings."""
    global _ldap_auth
    settings = load_ldap_settings()
    _ldap_auth = LDAPAuth(settings)
    return _ldap_auth


def load_ldap_settings():
    """
    Load LDAP settings from environment variables or JSON file.
    Environment variables take precedence over JSON file settings.
    """
    # Try environment variables first
    if os.environ.get('LDAP_HOST'):
        settings = {
            'LDAP_HOST': os.environ.get('LDAP_HOST', ''),
            'LDAP_PORT': int(os.environ.get('LDAP_PORT', 389)),
            'LDAP_USE_SSL': os.environ.get('LDAP_USE_SSL', 'false').lower() == 'true',
            'LDAP_BASE_DN': os.environ.get('LDAP_BASE_DN', ''),
            'LDAP_SERVICE_USER': os.environ.get('LDAP_SERVICE_USER', ''),
            'LDAP_SERVICE_PASS': os.environ.get('LDAP_SERVICE_PASS', ''),
            'LDAP_USER_FILTER': os.environ.get('LDAP_USER_FILTER', '(sAMAccountName={username})'),
            'LDAP_ADMIN_GROUP': os.environ.get('LDAP_ADMIN_GROUP', ''),
            'LDAP_ENABLED': os.environ.get('LDAP_ENABLED', 'false').lower() == 'true',
        }
        logger.info("LDAP configuration loaded from environment variables")
        return settings

    # Fallback to JSON file for backward compatibility
    defaults = {
        'LDAP_HOST': '',
        'LDAP_PORT': 389,
        'LDAP_USE_SSL': False,
        'LDAP_BASE_DN': '',
        'LDAP_SERVICE_USER': '',
        'LDAP_SERVICE_PASS': '',
        'LDAP_USER_FILTER': '(sAMAccountName={username})',
        'LDAP_ADMIN_GROUP': '',
        'LDAP_ENABLED': False
    }

    if os.path.exists(LDAP_SETTINGS_FILE):
        try:
            with open(LDAP_SETTINGS_FILE, 'r') as f:
                saved = json.load(f)
                defaults.update(saved)
            logger.info("LDAP configuration loaded from ldap_settings.json")
        except Exception as e:
            logger.error(f"Failed to load LDAP settings: {e}")

    return defaults


def save_ldap_settings(settings):
    """Save LDAP settings to JSON file."""
    try:
        existing = load_ldap_settings()
        if not settings.get('LDAP_SERVICE_PASS') and existing.get('LDAP_SERVICE_PASS'):
            settings['LDAP_SERVICE_PASS'] = existing['LDAP_SERVICE_PASS']
        
        with open(LDAP_SETTINGS_FILE, 'w') as f:
            json.dump(settings, f, indent=2)
        return True, "Settings saved successfully"
    except Exception as e:
        logger.error(f"Failed to save LDAP settings: {e}")
        return False, str(e)


def is_auth_enabled():
    """Check if authentication is enabled (has users in database)."""
    try:
        UserDB.initialize()
        users = UserDB.list_users()
        return len(users) > 0
    except Exception as e:
        logger.error(f"Failed to check auth status (DB might be unreachable): {e}")
        return False


def is_ldap_enabled():
    """Check if LDAP authentication is enabled."""
    settings = load_ldap_settings()
    return settings.get('LDAP_ENABLED', False)


def create_user_from_db(user_dict):
    """Create a User object from database user dict."""
    return User(
        username=user_dict['username'],
        display_name=user_dict['display_name'],
        email=user_dict['email'],
        role=user_dict['role'],
        auth_type=user_dict['auth_type'],
        user_id=user_dict['id']
    )


@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    """Handle user login - supports both local and LDAP users."""
    # Initialize user database
    UserDB.initialize()
    
    # If no users exist and auth not enabled, redirect to setup
    if not is_auth_enabled():
        return redirect(url_for('web.index'))
    
    if current_user.is_authenticated:
        return redirect(url_for('web.index'))
    
    if request.method == 'POST':
        username = request.form.get('username', '').strip().lower()
        password = request.form.get('password', '')
        
        if not username or not password:
            flash('Please enter username and password', 'error')
            return render_template('login.html')
        
        user = None
        
        # Step 1: Try local authentication first
        logger.debug(f"Attempting login for: {username}")
        local_user = UserDB.authenticate_local_user(username, password)
        if local_user:
            user = create_user_from_db(local_user)
            logger.info(f"Local user logged in: {username}")
        else:
            logger.debug(f"Local auth failed for {username}, trying LDAP...")
        
        # Step 2: If not local user and LDAP is enabled, try LDAP
        if not user and is_ldap_enabled():
            logger.debug(f"LDAP is enabled, attempting LDAP auth for: {username}")
            ldap = get_ldap_auth()
            ldap_result = ldap.authenticate(username, password)
            
            if ldap_result:
                logger.debug(f"LDAP auth successful for {username}, syncing to DB...")
                # Sync LDAP user to database
                db_user = UserDB.create_or_update_ldap_user(
                    username=username,
                    display_name=ldap_result.display_name,
                    email=ldap_result.email,
                    groups=getattr(ldap_result, 'groups', [])
                )
                
                if db_user:
                    user = create_user_from_db(db_user)
                    logger.info(f"LDAP user logged in: {username}")
                else:
                    logger.error(f"Failed to sync LDAP user to DB: {username}")
            else:
                logger.warning(f"LDAP authentication failed for: {username}")
        elif not user:
            logger.debug(f"LDAP not enabled, cannot try LDAP auth")
        
        if user:
            login_user(user)
            AuditLogger.log_auth_event(
                f"User logged in successfully: {username}",
                level=LogLevel.INFO,
                details={'username': username, 'auth_type': user.auth_type}
            )
            next_page = request.args.get('next')
            return redirect(next_page or url_for('web.index'))
        else:
            flash('Invalid username or password', 'error')
            logger.warning(f"Failed login attempt for: {username}")
            AuditLogger.log_security_event(
                f"Failed login attempt for user: {username}",
                level=LogLevel.WARNING,
                details={'username': username}
            )
    
    return render_template('login.html')


@auth_bp.route('/logout')
def logout():
    """Handle user logout."""
    if not is_auth_enabled():
        return redirect(url_for('web.index'))

    if current_user.is_authenticated:
        username = current_user.username
        logout_user()
        logger.info(f"User logged out: {username}")
        AuditLogger.log_auth_event(
            f"User logged out: {username}",
            level=LogLevel.INFO,
            details={'username': username}
        )
        flash('You have been logged out', 'success')

    return redirect(url_for('auth.login'))


# ============== User Management Routes ==============

@auth_bp.route('/settings/users', methods=['GET'])
def user_management_page():
    """User management page - admin only."""
    if is_auth_enabled():
        if not current_user.is_authenticated:
            return redirect(url_for('auth.login'))
        if not current_user.is_admin:
            flash('Admin access required', 'error')
            return redirect(url_for('web.index'))
    
    users = UserDB.list_users()
    return render_template('user_management.html', users=users)


@auth_bp.route('/api/users', methods=['GET'])
def list_users_api():
    """Get all users."""
    if is_auth_enabled():
        if not current_user.is_authenticated or not current_user.is_admin:
            return jsonify({'success': False, 'message': 'Admin access required'}), 403
    
    users = UserDB.list_users()
    # Don't return password hashes
    for u in users:
        u.pop('password_hash', None)
    return jsonify({'success': True, 'users': users})


@auth_bp.route('/api/users', methods=['POST'])
def create_user_api():
    """Create a new user."""
    if is_auth_enabled():
        if not current_user.is_authenticated or not current_user.is_admin:
            return jsonify({'success': False, 'message': 'Admin access required'}), 403
    
    data = request.json
    username = data.get('username', '').strip().lower()
    password = data.get('password', '')
    display_name = data.get('display_name', '').strip()
    email = data.get('email', '').strip()
    role = data.get('role', ROLE_VIEWER)
    
    if not username:
        return jsonify({'success': False, 'message': 'Username is required'}), 400
    if not password:
        return jsonify({'success': False, 'message': 'Password is required'}), 400
    if role not in [ROLE_VIEWER, ROLE_SECURITY_ADMIN, ROLE_ADMINISTRATOR]:
        return jsonify({'success': False, 'message': 'Invalid role'}), 400
    
    success, message = UserDB.create_user(
        username=username,
        password=password,
        display_name=display_name or username,
        email=email,
        role=role,
        auth_type=AUTH_TYPE_LOCAL
    )
    
    return jsonify({'success': success, 'message': message})


@auth_bp.route('/api/users/<int:user_id>', methods=['PUT'])
def update_user_api(user_id):
    """Update a user."""
    if is_auth_enabled():
        if not current_user.is_authenticated or not current_user.is_admin:
            return jsonify({'success': False, 'message': 'Admin access required'}), 403
    
    data = request.json
    display_name = data.get('display_name')
    email = data.get('email')
    role = data.get('role')
    is_active = data.get('is_active')
    
    if role and role not in [ROLE_VIEWER, ROLE_SECURITY_ADMIN, ROLE_ADMINISTRATOR]:
        return jsonify({'success': False, 'message': 'Invalid role'}), 400
    
    success, message = UserDB.update_user(
        user_id=user_id,
        display_name=display_name,
        email=email,
        role=role,
        is_active=is_active
    )
    
    return jsonify({'success': success, 'message': message})


@auth_bp.route('/api/users/<int:user_id>', methods=['DELETE'])
def delete_user_api(user_id):
    """Delete a user."""
    if is_auth_enabled():
        if not current_user.is_authenticated or not current_user.is_admin:
            return jsonify({'success': False, 'message': 'Admin access required'}), 403
    
    # Don't allow deleting yourself
    if current_user.is_authenticated and current_user.user_id == user_id:
        return jsonify({'success': False, 'message': 'Cannot delete your own account'}), 400
    
    success, message = UserDB.delete_user(user_id)
    return jsonify({'success': success, 'message': message})


@auth_bp.route('/api/users/<int:user_id>/password', methods=['PUT'])
def change_password_api(user_id):
    """Change a user's password."""
    if is_auth_enabled():
        if not current_user.is_authenticated:
            return jsonify({'success': False, 'message': 'Authentication required'}), 401
        # Only allow changing own password or admin changing any
        if not current_user.is_admin and current_user.user_id != user_id:
            return jsonify({'success': False, 'message': 'Not authorized'}), 403
    
    data = request.json
    new_password = data.get('password', '')
    
    if not new_password or len(new_password) < 4:
        return jsonify({'success': False, 'message': 'Password must be at least 4 characters'}), 400
    
    success, message = UserDB.change_password(user_id, new_password)
    return jsonify({'success': success, 'message': message})


# ============== LDAP Settings Routes ==============

@auth_bp.route('/settings/ldap', methods=['GET'])
def ldap_settings_page():
    """LDAP settings page - admin only when auth enabled."""
    if is_auth_enabled():
        if not current_user.is_authenticated:
            return redirect(url_for('auth.login'))
        if not current_user.is_admin:
            flash('Admin access required', 'error')
            return redirect(url_for('web.index'))
    
    settings = load_ldap_settings()
    settings['LDAP_SERVICE_PASS'] = '********' if settings.get('LDAP_SERVICE_PASS') else ''
    return render_template('ldap_settings.html', settings=settings)


@auth_bp.route('/api/ldap/settings', methods=['GET'])
def get_ldap_settings_api():
    """Get LDAP settings (password masked)."""
    settings = load_ldap_settings()
    settings['LDAP_SERVICE_PASS'] = '********' if settings.get('LDAP_SERVICE_PASS') else ''
    return jsonify(settings)


@auth_bp.route('/api/ldap/settings', methods=['POST'])
def save_ldap_settings_api():
    """Save LDAP settings."""
    if is_auth_enabled():
        if not current_user.is_authenticated or not current_user.is_admin:
            return jsonify({'success': False, 'message': 'Admin access required'}), 403
    
    data = request.json
    
    settings = {
        'LDAP_HOST': data.get('host', '').strip(),
        'LDAP_PORT': int(data.get('port', 389)),
        'LDAP_USE_SSL': data.get('use_ssl', False),
        'LDAP_BASE_DN': data.get('base_dn', '').strip(),
        'LDAP_SERVICE_USER': data.get('service_user', '').strip(),
        'LDAP_SERVICE_PASS': data.get('service_pass', '').strip() if data.get('service_pass', '') != '********' else '',
        'LDAP_USER_FILTER': data.get('user_filter', '(sAMAccountName={username})').strip(),
        'LDAP_ADMIN_GROUP': data.get('admin_group', '').strip(),
        'LDAP_ENABLED': data.get('enabled', False)
    }
    
    success, message = save_ldap_settings(settings)
    
    if success:
        get_ldap_auth()
    
    return jsonify({'success': success, 'message': message})


@auth_bp.route('/api/ldap/test', methods=['POST'])
def test_ldap_connection():
    """Test LDAP connection with current settings."""
    data = request.json
    
    test_config = {
        'LDAP_HOST': data.get('host', '').strip(),
        'LDAP_PORT': int(data.get('port', 389)),
        'LDAP_USE_SSL': data.get('use_ssl', False),
        'LDAP_BASE_DN': data.get('base_dn', '').strip(),
        'LDAP_SERVICE_USER': data.get('service_user', '').strip(),
        'LDAP_SERVICE_PASS': data.get('service_pass', '').strip(),
        'LDAP_USER_FILTER': data.get('user_filter', '(sAMAccountName={username})'),
        'LDAP_ADMIN_GROUP': data.get('admin_group', '')
    }
    
    if test_config['LDAP_SERVICE_PASS'] == '********':
        existing = load_ldap_settings()
        test_config['LDAP_SERVICE_PASS'] = existing.get('LDAP_SERVICE_PASS', '')
    
    ldap = LDAPAuth(test_config)
    success, message = ldap.test_connection()
    
    return jsonify({'success': success, 'message': message})


@auth_bp.route('/api/ldap/search', methods=['GET'])
def search_ad_users():
    """Search for users in Active Directory."""
    if is_auth_enabled():
        if not current_user.is_authenticated or not current_user.is_admin:
            return jsonify({'success': False, 'message': 'Admin access required'}), 403
    
    if not is_ldap_enabled():
        return jsonify({'success': False, 'message': 'LDAP is not enabled'}), 400
    
    query = request.args.get('q', '').strip()
    if len(query) < 2:
        return jsonify({'success': False, 'message': 'Search query must be at least 2 characters'}), 400
    
    ldap = get_ldap_auth()
    users = ldap.search_users(query, max_results=20)
    
    # Mark users that already exist in the database
    for user in users:
        existing = UserDB.get_user_by_username(user['username'])
        user['exists'] = existing is not None
        if existing:
            user['current_role'] = existing['role']
    
    return jsonify({'success': True, 'users': users})


@auth_bp.route('/api/ldap/import', methods=['POST'])
def import_ad_user():
    """Import an AD user to the local database."""
    if is_auth_enabled():
        if not current_user.is_authenticated or not current_user.is_admin:
            return jsonify({'success': False, 'message': 'Admin access required'}), 403
    
    if not is_ldap_enabled():
        return jsonify({'success': False, 'message': 'LDAP is not enabled'}), 400
    
    data = request.json
    username = data.get('username', '').strip().lower()
    role = data.get('role', ROLE_VIEWER)
    
    if not username:
        return jsonify({'success': False, 'message': 'Username is required'}), 400
    
    if role not in [ROLE_VIEWER, ROLE_SECURITY_ADMIN, ROLE_ADMINISTRATOR]:
        return jsonify({'success': False, 'message': 'Invalid role'}), 400
    
    # Check if user already exists
    existing = UserDB.get_user_by_username(username)
    if existing:
        # Update role if user exists
        success, message = UserDB.update_user(existing['id'], role=role)
        if success:
            return jsonify({'success': True, 'message': f"User '{username}' already exists. Role updated to {role}."})
        return jsonify({'success': False, 'message': message}), 400
    
    # Search for user in AD to get details
    ldap = get_ldap_auth()
    ad_users = ldap.search_users(username, max_results=1)
    
    # Find exact match
    ad_user = None
    for u in ad_users:
        if u['username'].lower() == username.lower():
            ad_user = u
            break
    
    if not ad_user:
        return jsonify({'success': False, 'message': f"User '{username}' not found in AD"}), 404
    
    # Create user in database
    success, message = UserDB.create_user(
        username=username,
        password=None,  # No password for LDAP users
        display_name=ad_user.get('display_name', username),
        email=ad_user.get('email', ''),
        role=role,
        auth_type=AUTH_TYPE_LDAP
    )
    
    if success:
        return jsonify({'success': True, 'message': f"User '{username}' imported from AD with role '{role}'"})
    return jsonify({'success': False, 'message': message}), 400
