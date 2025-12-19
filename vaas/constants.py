"""
Constants for VAAS application.
Centralizes string literals to avoid duplication and ensure consistency.
"""

# Route Names
ROUTE_INDEX = 'web.index'
ROUTE_LOGIN = 'auth.login'

# LDAP Constants
LDAP_DEFAULT_USER_FILTER = '(sAMAccountName={username})'
PASSWORD_MASK = '********'

# Team Names (normalized lowercase for comparison)
TEAM_SYSADMIN = 'system admin'
TEAM_APPLICATION = 'application'
TEAM_LINUX_SCOPE = 'out of linux scope'
TEAM_PLATFORM_SCOPE = 'out of platform scope'
TEAM_UNCLASSIFIED = 'unclassified'

# Team Names (display format)
TEAM_SYSADMIN_DISPLAY = 'System Admin'
TEAM_APPLICATION_DISPLAY = 'Application'
TEAM_LINUX_SCOPE_DISPLAY = 'Out of Linux Scope'
TEAM_PLATFORM_SCOPE_DISPLAY = 'Out of Platform Scope'
TEAM_UNCLASSIFIED_DISPLAY = 'Unclassified'

# Error Messages
ERROR_ADMIN_REQUIRED = 'Admin access required'
ERROR_INVALID_ROLE = 'Invalid role'
ERROR_INVALID_RULE_TYPE = 'Invalid rule type'
ERROR_AUTH_REQUIRED = 'Authentication required'
ERROR_NOT_AUTHORIZED = 'Not authorized'

# Classification Methods
METHOD_AUTO = 'Auto'
METHOD_FUZZY = 'Fuzzy'
METHOD_MANUAL = 'Manual'
METHOD_PRESERVED = 'Preserved'
