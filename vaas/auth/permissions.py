"""
Permissions Module for VAAS
Role-based access control decorators and helpers.
"""

from functools import wraps
from flask import redirect, url_for, flash, jsonify, request
from flask_login import current_user

from .user_db import ROLE_VIEWER, ROLE_SECURITY_ADMIN, ROLE_ADMINISTRATOR

# Permission definitions
# Maps role to list of permissions
ROLE_PERMISSIONS = {
    ROLE_VIEWER: [
        'upload_files',
        'view_results',
        'view_kb',
        'export_files',  # Viewer can export
    ],
    ROLE_SECURITY_ADMIN: [
        'upload_files',
        'view_results',
        'view_kb',
        'export_files',
        'modify_assignments',
        'add_kb_rules',
        'edit_kb_rules',
        'delete_kb_rules',
        'save_to_kb',
        'import_export_kb',
        'view_reports',
    ],
    ROLE_ADMINISTRATOR: [
        'upload_files',
        'view_results',
        'view_kb',
        'export_files',
        'modify_assignments',
        'add_kb_rules',
        'edit_kb_rules',
        'delete_kb_rules',
        'save_to_kb',
        'import_export_kb',
        'manage_users',
        'manage_settings',
        'manage_ldap',
        'manage_database',
        'view_reports',
        'delete_reports',
        'view_audit_logs',
        'export_audit_logs',
        'manage_audit_logs',
    ],
}

# Role hierarchy for comparison
ROLE_HIERARCHY = {
    ROLE_VIEWER: 1,
    ROLE_SECURITY_ADMIN: 2,
    ROLE_ADMINISTRATOR: 3,
}


def get_user_role():
    """Get the current user's role."""
    if not current_user.is_authenticated:
        return None
    return getattr(current_user, 'role', ROLE_VIEWER)


def has_permission(permission):
    """Check if current user has a specific permission."""
    role = get_user_role()
    if not role:
        return False
    return permission in ROLE_PERMISSIONS.get(role, [])


def has_role(required_role):
    """Check if current user has at least the required role level."""
    user_role = get_user_role()
    if not user_role:
        return False
    
    user_level = ROLE_HIERARCHY.get(user_role, 0)
    required_level = ROLE_HIERARCHY.get(required_role, 99)
    
    return user_level >= required_level


def require_role(required_role):
    """
    Decorator to require a minimum role for a route.
    Usage: @require_role('security_admin')
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            from .routes import is_auth_enabled

            # If auth is not enabled (no users exist), allow access
            if not is_auth_enabled():
                return f(*args, **kwargs)

            # Check if user is authenticated
            if not current_user.is_authenticated:
                if request.is_json:
                    return jsonify({'success': False, 'message': 'Authentication required'}), 401
                return redirect(url_for('auth.login'))

            # Check role
            if not has_role(required_role):
                if request.is_json:
                    return jsonify({'success': False, 'message': 'Insufficient permissions'}), 403
                flash('You do not have permission to access this page', 'error')
                return redirect(url_for('web.index'))

            return f(*args, **kwargs)
        return decorated_function
    return decorator


def require_permission(permission):
    """
    Decorator to require a specific permission for a route.
    Usage: @require_permission('modify_assignments')
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            from .routes import is_auth_enabled

            # If auth is not enabled (no users exist), allow access
            if not is_auth_enabled():
                return f(*args, **kwargs)

            # Check if user is authenticated
            if not current_user.is_authenticated:
                if request.is_json:
                    return jsonify({'success': False, 'message': 'Authentication required'}), 401
                return redirect(url_for('auth.login'))

            # Check permission
            if not has_permission(permission):
                if request.is_json:
                    return jsonify({'success': False, 'message': 'Insufficient permissions'}), 403
                flash('You do not have permission to perform this action', 'error')
                return redirect(url_for('web.index'))

            return f(*args, **kwargs)
        return decorated_function
    return decorator


# Convenience decorators
def admin_required(f):
    """Shortcut for @require_role('administrator')"""
    return require_role(ROLE_ADMINISTRATOR)(f)


def security_admin_required(f):
    """Shortcut for @require_role('security_admin')"""
    return require_role(ROLE_SECURITY_ADMIN)(f)


# Helper functions for templates
def can_modify_assignments():
    """Check if user can modify team assignments."""
    return has_permission('modify_assignments')


def can_modify_kb():
    """Check if user can add/edit/delete KB rules."""
    return has_permission('add_kb_rules')


def can_manage_users():
    """Check if user can manage users."""
    return has_permission('manage_users')


def can_manage_settings():
    """Check if user can manage settings."""
    return has_permission('manage_settings')


def can_export():
    """Check if user can export files."""
    return has_permission('export_files')


def get_role_display_name(role):
    """Get human-readable role name."""
    return {
        ROLE_VIEWER: 'Viewer',
        ROLE_SECURITY_ADMIN: 'Security Admin',
        ROLE_ADMINISTRATOR: 'Administrator'
    }.get(role, role)
