"""
User Database Module for VAAS
Manages local users with password hashing and role-based access control.
"""

import logging
import bcrypt
from datetime import datetime

from ..db import get_db_provider

logger = logging.getLogger(__name__)

# Role constants
ROLE_VIEWER = 'viewer'
ROLE_SECURITY_ADMIN = 'security_admin'
ROLE_ADMINISTRATOR = 'administrator'

VALID_ROLES = [ROLE_VIEWER, ROLE_SECURITY_ADMIN, ROLE_ADMINISTRATOR]

# Auth type constants
AUTH_TYPE_LOCAL = 'local'
AUTH_TYPE_LDAP = 'ldap'


class UserDB:
    """Database operations for user management."""

    @staticmethod
    def _get_provider():
        """Returns the database provider instance."""
        return get_db_provider()

    @staticmethod
    def _get_conn():
        """Returns a connection to the database."""
        provider = UserDB._get_provider()
        return provider.connect()

    @staticmethod
    def initialize():
        """Create users table if it doesn't exist."""
        provider = UserDB._get_provider()

        with provider.get_connection() as conn:
            provider.create_tables(conn)

        # Create default admin if no users exist
        UserDB._ensure_default_admin()

    @staticmethod
    def _ensure_default_admin():
        """Create default admin user if no users exist."""
        provider = UserDB._get_provider()
        placeholder = provider.placeholder

        with provider.get_connection() as conn:
            cursor = conn.cursor()

            cursor.execute('SELECT COUNT(*) FROM users')
            count = cursor.fetchone()[0]

            if count == 0:
                logger.info("Creating default admin user...")
                password_hash = bcrypt.hashpw('admin'.encode('utf-8'), bcrypt.gensalt())

                cursor.execute(f'''
                    INSERT INTO users (username, password_hash, display_name, role, auth_type)
                    VALUES ({placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder})
                ''', ('admin', password_hash.decode('utf-8'), 'Administrator', ROLE_ADMINISTRATOR, AUTH_TYPE_LOCAL))

                conn.commit()
                logger.info("Default admin user created (username: admin, password: admin)")

    @staticmethod
    def hash_password(password):
        """Hash a password using bcrypt."""
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    @staticmethod
    def verify_password(password, password_hash):
        """Verify a password against its hash."""
        try:
            return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))
        except Exception as e:
            logger.error(f"Password verification error: {e}")
            return False

    @staticmethod
    def create_user(username, password, display_name=None, email=None, role=ROLE_VIEWER, auth_type=AUTH_TYPE_LOCAL):
        """Create a new user."""
        provider = UserDB._get_provider()
        placeholder = provider.placeholder

        try:
            password_hash = None
            if password and auth_type == AUTH_TYPE_LOCAL:
                password_hash = UserDB.hash_password(password)

            with provider.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(f'''
                    INSERT INTO users (username, password_hash, display_name, email, role, auth_type)
                    VALUES ({placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder})
                ''', (username.lower().strip(), password_hash, display_name or username, email, role, auth_type))
                conn.commit()

            return True, f"User '{username}' created successfully"
        except Exception as e:
            error_str = str(e).lower()
            if 'unique' in error_str or 'duplicate' in error_str or 'integrity' in error_str:
                return False, f"Username '{username}' already exists"
            logger.error(f"Error creating user: {e}")
            return False, str(e)

    @staticmethod
    def get_user_by_username(username):
        """Get user by username. Returns dict or None."""
        provider = UserDB._get_provider()
        placeholder = provider.placeholder

        try:
            row = provider.fetchone(f'''
                SELECT id, username, password_hash, display_name, email, role, auth_type, is_active, last_login
                FROM users WHERE username = {placeholder}
            ''', (username.lower().strip(),))

            if row:
                return {
                    'id': row[0],
                    'username': row[1],
                    'password_hash': row[2],
                    'display_name': row[3],
                    'email': row[4],
                    'role': row[5],
                    'auth_type': row[6],
                    'is_active': bool(row[7]),
                    'last_login': row[8]
                }
            return None
        except Exception as e:
            logger.error(f"Error fetching user: {e}")
            return None

    @staticmethod
    def get_user_by_id(user_id):
        """Get user by ID. Returns dict or None."""
        provider = UserDB._get_provider()
        placeholder = provider.placeholder

        try:
            row = provider.fetchone(f'''
                SELECT id, username, password_hash, display_name, email, role, auth_type, is_active, last_login
                FROM users WHERE id = {placeholder}
            ''', (user_id,))

            if row:
                return {
                    'id': row[0],
                    'username': row[1],
                    'password_hash': row[2],
                    'display_name': row[3],
                    'email': row[4],
                    'role': row[5],
                    'auth_type': row[6],
                    'is_active': bool(row[7]),
                    'last_login': row[8]
                }
            return None
        except Exception as e:
            logger.error(f"Error fetching user: {e}")
            return None

    @staticmethod
    def authenticate_local_user(username, password):
        """Authenticate a local user. Returns user dict or None."""
        user = UserDB.get_user_by_username(username)

        if not user:
            return None

        if user['auth_type'] != AUTH_TYPE_LOCAL:
            return None  # Not a local user

        if not user['is_active']:
            return None  # User is disabled

        if not user['password_hash']:
            return None  # No password set

        if UserDB.verify_password(password, user['password_hash']):
            # Update last login time
            UserDB.update_last_login(user['id'])
            return user

        return None

    @staticmethod
    def update_last_login(user_id):
        """Update the last login timestamp."""
        provider = UserDB._get_provider()
        placeholder = provider.placeholder

        try:
            with provider.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(f'UPDATE users SET last_login = {placeholder} WHERE id = {placeholder}', (datetime.now(), user_id))
                conn.commit()
        except Exception as e:
            logger.error(f"Error updating last login: {e}")

    @staticmethod
    def list_users():
        """Get all users. Returns list of dicts."""
        provider = UserDB._get_provider()

        try:
            rows = provider.fetchall('''
                SELECT id, username, display_name, email, role, auth_type, is_active, created_at, last_login
                FROM users ORDER BY username
            ''')

            users = []
            for row in rows:
                users.append({
                    'id': row[0],
                    'username': row[1],
                    'display_name': row[2],
                    'email': row[3],
                    'role': row[4],
                    'auth_type': row[5],
                    'is_active': bool(row[6]),
                    'created_at': row[7],
                    'last_login': row[8]
                })
            return users
        except Exception as e:
            logger.error(f"Error listing users: {e}")
            return []

    @staticmethod
    def update_user(user_id, display_name=None, email=None, role=None, is_active=None):
        """Update user fields."""
        provider = UserDB._get_provider()
        placeholder = provider.placeholder

        try:
            updates = []
            params = []

            if display_name is not None:
                updates.append(f'display_name = {placeholder}')
                params.append(display_name)
            if email is not None:
                updates.append(f'email = {placeholder}')
                params.append(email)
            if role is not None and role in VALID_ROLES:
                updates.append(f'role = {placeholder}')
                params.append(role)
            if is_active is not None:
                updates.append(f'is_active = {placeholder}')
                params.append(1 if is_active else 0)

            if not updates:
                return False, "No fields to update"

            params.append(user_id)
            query = f"UPDATE users SET {', '.join(updates)} WHERE id = {placeholder}"

            with provider.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(query, tuple(params))
                conn.commit()

            return True, "User updated successfully"
        except Exception as e:
            logger.error(f"Error updating user: {e}")
            return False, str(e)

    @staticmethod
    def change_password(user_id, new_password):
        """Change a user's password."""
        provider = UserDB._get_provider()
        placeholder = provider.placeholder

        try:
            password_hash = UserDB.hash_password(new_password)
            with provider.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(f'UPDATE users SET password_hash = {placeholder} WHERE id = {placeholder}', (password_hash, user_id))
                conn.commit()
            return True, "Password changed successfully"
        except Exception as e:
            logger.error(f"Error changing password: {e}")
            return False, str(e)

    @staticmethod
    def delete_user(user_id):
        """Delete a user."""
        provider = UserDB._get_provider()
        placeholder = provider.placeholder

        try:
            with provider.get_connection() as conn:
                cursor = conn.cursor()

                # Don't allow deleting the last admin
                cursor.execute(f"SELECT COUNT(*) FROM users WHERE role = {placeholder} AND id != {placeholder}", (ROLE_ADMINISTRATOR, user_id))
                admin_count = cursor.fetchone()[0]

                cursor.execute(f"SELECT role FROM users WHERE id = {placeholder}", (user_id,))
                row = cursor.fetchone()
                if row and row[0] == ROLE_ADMINISTRATOR and admin_count == 0:
                    return False, "Cannot delete the last administrator"

                cursor.execute(f'DELETE FROM users WHERE id = {placeholder}', (user_id,))
                conn.commit()

            return True, "User deleted successfully"
        except Exception as e:
            logger.error(f"Error deleting user: {e}")
            return False, str(e)

    @staticmethod
    def create_or_update_ldap_user(username, display_name=None, email=None, groups=None):
        """
        Create or update an LDAP user record.
        Called on LDAP login to sync user data.
        """
        existing = UserDB.get_user_by_username(username)

        if existing:
            # Update last login
            UserDB.update_last_login(existing['id'])
            # Optionally update display name/email if provided
            if display_name or email:
                UserDB.update_user(existing['id'], display_name=display_name, email=email)
            return existing
        else:
            # Create new LDAP user with default role (Viewer)
            success, _ = UserDB.create_user(
                username=username,
                password=None,
                display_name=display_name,
                email=email,
                role=ROLE_VIEWER,
                auth_type=AUTH_TYPE_LDAP
            )
            if success:
                return UserDB.get_user_by_username(username)
            return None

    # --- Helper methods for migration ---

    @staticmethod
    def get_all_users():
        """Returns list of all user records as dicts for migration."""
        provider = UserDB._get_provider()

        try:
            rows = provider.fetchall('''
                SELECT id, username, password_hash, display_name, email, role, auth_type, is_active, created_at, last_login
                FROM users
            ''')
            return [{
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
            } for row in rows]
        except Exception as e:
            logger.error(f"Error fetching users: {e}")
            return []
