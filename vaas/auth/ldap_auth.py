"""
LDAP Authentication Module for VAAS
Supports Active Directory with service account authentication and role-based access control.
"""

import logging
import re
from ldap3 import Server, Connection, ALL, SUBTREE
from flask_login import UserMixin

logger = logging.getLogger(__name__)


def escape_ldap_filter(value: str) -> str:
    """
    Escape special characters in LDAP filter values to prevent injection attacks.

    According to RFC 4515, the following characters must be escaped:
    * ( ) \ NUL

    Args:
        value: The string to escape

    Returns:
        The escaped string safe for use in LDAP filters
    """
    if not value:
        return value

    # Characters that must be escaped in LDAP filters (RFC 4515)
    escape_chars = {
        '\\': r'\5c',  # Must be first to avoid double-escaping
        '*': r'\2a',
        '(': r'\28',
        ')': r'\29',
        '\x00': r'\00',  # NUL character
    }

    result = value
    for char, escaped in escape_chars.items():
        result = result.replace(char, escaped)

    return result


class User(UserMixin):
    """User model for Flask-Login integration."""
    
    def __init__(self, username, display_name=None, email=None, groups=None, 
                 role='viewer', auth_type='local', user_id=None):
        self.id = username
        self.user_id = user_id  # Database ID
        self.username = username
        self.display_name = display_name or username
        self.email = email or ''
        self.groups = groups or []
        self.role = role
        self.auth_type = auth_type
    
    @property
    def is_admin(self):
        """Check if user has administrator role."""
        return self.role == 'administrator'
    
    def get_id(self):
        return self.username
    
    def __repr__(self):
        return f"<User {self.username} role={self.role}>"


class LDAPAuth:
    """
    LDAP Authentication handler using service account for user lookups
    and role-based access control via AD groups.
    """
    
    def __init__(self, config):
        """
        Initialize LDAP authenticator with configuration.
        
        Args:
            config: Dict or object with LDAP settings:
                - LDAP_HOST: Server hostname or IP
                - LDAP_PORT: Server port (389 or 636)
                - LDAP_USE_SSL: Use SSL/TLS
                - LDAP_BASE_DN: Base DN for user searches
                - LDAP_SERVICE_USER: Service account DN
                - LDAP_SERVICE_PASS: Service account password
                - LDAP_USER_FILTER: Filter template for user search
                - LDAP_ADMIN_GROUP: AD group for admin role (optional)
        """
        self.host = getattr(config, 'LDAP_HOST', '') or config.get('LDAP_HOST', '')
        self.port = int(getattr(config, 'LDAP_PORT', 389) or config.get('LDAP_PORT', 389))
        self.use_ssl = getattr(config, 'LDAP_USE_SSL', False) or config.get('LDAP_USE_SSL', False)
        self.base_dn = getattr(config, 'LDAP_BASE_DN', '') or config.get('LDAP_BASE_DN', '')
        self.service_user = getattr(config, 'LDAP_SERVICE_USER', '') or config.get('LDAP_SERVICE_USER', '')
        self.service_pass = getattr(config, 'LDAP_SERVICE_PASS', '') or config.get('LDAP_SERVICE_PASS', '')
        self.user_filter = getattr(config, 'LDAP_USER_FILTER', '(sAMAccountName={username})') or config.get('LDAP_USER_FILTER', '(sAMAccountName={username})')
        self.admin_group = getattr(config, 'LDAP_ADMIN_GROUP', '') or config.get('LDAP_ADMIN_GROUP', '')
        
        self._server = None
    
    def is_configured(self):
        """Check if LDAP is properly configured."""
        return bool(self.host and self.base_dn and self.service_user and self.service_pass)
    
    def _get_server(self):
        """Get or create LDAP server connection."""
        if not self._server:
            self._server = Server(
                self.host,
                port=self.port,
                use_ssl=self.use_ssl,
                get_info=ALL,
                connect_timeout=10
            )
        return self._server
    
    def test_connection(self):
        """
        Test connection to LDAP server with service account.
        
        Returns:
            tuple: (success: bool, message: str)
        """
        if not self.is_configured():
            return False, "LDAP not configured. Please set all required fields."
        
        try:
            server = self._get_server()
            conn = Connection(
                server,
                user=self.service_user,
                password=self.service_pass,
                auto_bind=True
            )
            conn.unbind()
            return True, f"Successfully connected to {self.host}:{self.port}"
        except Exception as e:
            logger.error(f"LDAP connection test failed: {e}")
            return False, f"Connection failed: {str(e)}"
    
    def authenticate(self, username, password):
        """
        Authenticate user against Active Directory.
        
        Args:
            username: Username (sAMAccountName)
            password: User's password
            
        Returns:
            User object if successful, None otherwise
        """
        if not self.is_configured():
            logger.warning("LDAP authentication attempted but not configured")
            return None
        
        if not username or not password:
            return None
        
        # Normalize username - strip domain if present
        # Handle formats: user@domain.com, DOMAIN\user, or just user
        original_username = username
        if '@' in username:
            username = username.split('@')[0]
        elif '\\' in username:
            username = username.split('\\')[-1]
        
        if username != original_username:
            logger.debug(f"LDAP Auth: Normalized username from '{original_username}' to '{username}'")
        
        try:
            server = self._get_server()
            logger.debug(f"LDAP Auth: Connecting to {self.host}:{self.port} as service account")
            
            # Step 1: Connect with service account to find user DN
            service_conn = Connection(
                server,
                user=self.service_user,
                password=self.service_pass,
                auto_bind=True
            )
            logger.debug("LDAP Auth: Service account connected successfully")
            
            # Search for user - escape username to prevent LDAP injection
            escaped_username = escape_ldap_filter(username)
            search_filter = self.user_filter.format(username=escaped_username)
            logger.debug(f"LDAP Auth: Searching for user in base: {self.base_dn}")
            
            service_conn.search(
                search_base=self.base_dn,
                search_filter=search_filter,
                search_scope=SUBTREE,
                attributes=['distinguishedName', 'displayName', 'mail', 'memberOf', 'sAMAccountName']
            )
            
            if not service_conn.entries:
                logger.warning(f"User not found in AD: {username}")
                service_conn.unbind()
                return None
            
            user_entry = service_conn.entries[0]
            user_dn = str(user_entry.distinguishedName)
            display_name = str(user_entry.displayName) if hasattr(user_entry, 'displayName') else username
            email = str(user_entry.mail) if hasattr(user_entry, 'mail') else ''
            
            logger.debug(f"LDAP Auth: Found user DN: {user_dn}")
            
            # Get groups
            groups = []
            if hasattr(user_entry, 'memberOf'):
                for group_dn in user_entry.memberOf:
                    # Extract CN from group DN
                    group_cn = str(group_dn).split(',')[0].replace('CN=', '')
                    groups.append(group_cn)
            
            service_conn.unbind()
            
            # Step 2: Authenticate user with their own credentials
            logger.debug(f"LDAP Auth: Attempting to bind as user: {user_dn}")
            user_conn = Connection(
                server,
                user=user_dn,
                password=password,
                auto_bind=True
            )
            user_conn.unbind()
            logger.debug("LDAP Auth: User bind successful!")
            
            logger.info(f"LDAP user authenticated successfully: {username}")
            
            # Return basic User object - the login route will handle role lookup from DB
            return User(
                username=username,
                display_name=display_name,
                email=email,
                groups=groups,
                role='viewer',  # Default role, will be updated from DB in login route
                auth_type='ldap'
            )
            
        except Exception as e:
            error_str = str(e).lower()
            if 'invalid credentials' in error_str or 'bind' in error_str:
                logger.warning(f"LDAP authentication failed for {username}: Invalid credentials")
            else:
                logger.error(f"LDAP authentication failed for {username}: {e}")
            return None
    
    def get_user_by_id(self, username):
        """
        Fetch user info by username (for session restoration).
        
        Args:
            username: The username to look up
            
        Returns:
            User object if found, None otherwise
        """
        if not self.is_configured():
            return None
        
        try:
            server = self._get_server()
            service_conn = Connection(
                server,
                user=self.service_user,
                password=self.service_pass,
                auto_bind=True
            )
            
            escaped_username = escape_ldap_filter(username)
            search_filter = self.user_filter.format(username=escaped_username)
            service_conn.search(
                search_base=self.base_dn,
                search_filter=search_filter,
                search_scope=SUBTREE,
                attributes=['distinguishedName', 'displayName', 'mail', 'memberOf', 'sAMAccountName']
            )
            
            if not service_conn.entries:
                service_conn.unbind()
                return None
            
            user_entry = service_conn.entries[0]
            display_name = str(user_entry.displayName) if hasattr(user_entry, 'displayName') else username
            email = str(user_entry.mail) if hasattr(user_entry, 'mail') else ''
            
            groups = []
            if hasattr(user_entry, 'memberOf'):
                for group_dn in user_entry.memberOf:
                    group_cn = str(group_dn).split(',')[0].replace('CN=', '')
                    groups.append(group_cn)
            
            service_conn.unbind()
            
            is_admin = self.admin_group in groups if self.admin_group else False
            
            return User(
                username=username,
                display_name=display_name,
                email=email,
                groups=groups,
                is_admin=is_admin
            )
            
        except Exception as e:
            logger.error(f"Failed to fetch user {username}: {e}")
            return None
    
    def search_users(self, search_query, max_results=20):
        """
        Search for users in AD by username or display name.
        
        Args:
            search_query: Search string (partial username or name)
            max_results: Maximum number of results to return
            
        Returns:
            list of dicts with user info, or empty list on error
        """
        if not self.is_configured():
            return []
        
        if not search_query or len(search_query) < 2:
            return []
        
        try:
            server = self._get_server()
            service_conn = Connection(
                server,
                user=self.service_user,
                password=self.service_pass,
                auto_bind=True
            )
            
            # Search filter: match username or display name - escape query to prevent LDAP injection
            escaped_query = escape_ldap_filter(search_query)
            search_filter = f"(&(objectClass=user)(|(sAMAccountName=*{escaped_query}*)(displayName=*{escaped_query}*)(mail=*{escaped_query}*)))"
            
            service_conn.search(
                search_base=self.base_dn,
                search_filter=search_filter,
                search_scope=SUBTREE,
                attributes=['sAMAccountName', 'displayName', 'mail', 'memberOf'],
                size_limit=max_results
            )
            
            users = []
            for entry in service_conn.entries:
                username = str(entry.sAMAccountName) if hasattr(entry, 'sAMAccountName') else ''
                display_name = str(entry.displayName) if hasattr(entry, 'displayName') else username
                email = str(entry.mail) if hasattr(entry, 'mail') else ''
                
                # Get groups
                groups = []
                if hasattr(entry, 'memberOf'):
                    for group_dn in entry.memberOf:
                        group_cn = str(group_dn).split(',')[0].replace('CN=', '')
                        groups.append(group_cn)
                
                if username:  # Only add if username exists
                    users.append({
                        'username': username.lower(),
                        'display_name': display_name,
                        'email': email,
                        'groups': groups
                    })
            
            service_conn.unbind()
            logger.info(f"AD search for '{search_query}' returned {len(users)} users")
            return users
            
        except Exception as e:
            logger.error(f"AD user search failed: {e}")
            return []
