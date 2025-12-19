"""
Database Settings Module
Handles loading and saving database configuration.
"""

import os
import json
import logging
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

# Default settings file location
_settings_file = None


def get_settings_file() -> str:
    """Get the path to the database settings file."""
    global _settings_file
    if _settings_file is None:
        # Import here to avoid circular imports
        from ..config import Config
        _settings_file = os.path.join(Config.DATA_DIR, 'database_settings.json')
    return _settings_file


def set_settings_file(path: str) -> None:
    """Override the settings file path (for testing)."""
    global _settings_file
    _settings_file = path


def get_default_settings() -> Dict[str, Any]:
    """
    Return default database settings (SQLite).

    Returns:
        Dictionary with default settings
    """
    from ..config import Config
    return {
        'DB_TYPE': 'sqlite',
        'DB_HOST': '',
        'DB_PORT': None,
        'DB_NAME': '',
        'DB_USER': '',
        'DB_PASSWORD': '',
        'DB_SSL_ENABLED': False,
        'DB_SSL_CA_CERT': '',
        'DB_SSL_MODE': 'require',  # For PostgreSQL: require, verify-ca, verify-full
        'DB_CONNECTION_TIMEOUT': 30,
        'DB_POOL_SIZE': 5,
        'DB_POOL_MAX_OVERFLOW': 10,
        'AZURE_AD_AUTH': False,
        'TRUST_SERVER_CERTIFICATE': False,
        # SQLite-specific
        'SQLITE_FILE': Config.DATABASE_FILE,
        # Auto-cleanup scheduler settings
        'AUTO_CLEANUP_ENABLED': False,
        'AUTO_CLEANUP_INTERVAL_DAYS': 7,  # Run cleanup every X days
        'AUTO_CLEANUP_RETENTION_DAYS': 30,  # Delete reports older than X days
        'LAST_AUTO_CLEANUP': None  # Timestamp of last cleanup
    }


def get_default_port(db_type: str) -> Optional[int]:
    """
    Get the default port for a database type.

    Args:
        db_type: Database type identifier

    Returns:
        Default port number or None for SQLite
    """
    ports = {
        'sqlite': None,
        'mysql': 3306,
        'mariadb': 3306,
        'postgresql': 5432,
        'postgres': 5432,
        'mssql': 1433,
        'sqlserver': 1433,
        'azuresql': 1433
    }
    return ports.get(db_type.lower(), None)


def load_database_settings() -> Dict[str, Any]:
    """
    Load database settings from JSON file.
    Falls back to default SQLite settings if file doesn't exist.

    Returns:
        Dictionary with database settings
    """
    defaults = get_default_settings()
    settings_file = get_settings_file()

    if os.path.exists(settings_file):
        try:
            with open(settings_file, 'r') as f:
                saved = json.load(f)
                defaults.update(saved)
                logger.debug(f"Loaded database settings from {settings_file}")
        except Exception as e:
            logger.error(f"Failed to load database settings: {e}")

    return defaults


def save_database_settings(settings: Dict[str, Any]) -> tuple:
    """
    Save database settings to JSON file.
    Preserves existing password if not provided.

    Args:
        settings: Dictionary with database settings

    Returns:
        Tuple of (success: bool, message: str)
    """
    settings_file = get_settings_file()

    try:
        # Preserve existing password if new one is empty or masked
        existing = load_database_settings()
        if not settings.get('DB_PASSWORD') or settings.get('DB_PASSWORD') == '********':
            settings['DB_PASSWORD'] = existing.get('DB_PASSWORD', '')

        # Ensure directory exists
        os.makedirs(os.path.dirname(settings_file), exist_ok=True)

        with open(settings_file, 'w') as f:
            json.dump(settings, f, indent=2)

        logger.info(f"Saved database settings to {settings_file}")
        return True, "Database settings saved successfully"
    except Exception as e:
        logger.error(f"Failed to save database settings: {e}")
        return False, str(e)


def mask_password(settings: Dict[str, Any]) -> Dict[str, Any]:
    """
    Return a copy of settings with password masked.

    Args:
        settings: Original settings dictionary

    Returns:
        Copy with DB_PASSWORD masked as '********'
    """
    masked = settings.copy()
    if masked.get('DB_PASSWORD'):
        masked['DB_PASSWORD'] = '********'
    return masked


def settings_to_provider_config(settings: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convert database settings to provider configuration format.

    Args:
        settings: Database settings from JSON file

    Returns:
        Configuration dictionary for provider initialization
    """
    db_type = settings.get('DB_TYPE', 'sqlite').lower()

    if db_type == 'sqlite':
        return {
            'database_file': settings.get('SQLITE_FILE', '')
        }

    return {
        'host': settings.get('DB_HOST', ''),
        'port': settings.get('DB_PORT') or get_default_port(db_type),
        'database': settings.get('DB_NAME', ''),
        'user': settings.get('DB_USER', ''),
        'password': settings.get('DB_PASSWORD', ''),
        'ssl_enabled': settings.get('DB_SSL_ENABLED', False),
        'ssl_ca': settings.get('DB_SSL_CA_CERT', ''),
        'ssl_mode': settings.get('DB_SSL_MODE', 'require'),
        'connection_timeout': settings.get('DB_CONNECTION_TIMEOUT', 30),
        'azure_ad_auth': settings.get('AZURE_AD_AUTH', False),
        'trust_server_certificate': settings.get('TRUST_SERVER_CERTIFICATE', False)
    }


def validate_settings(settings: Dict[str, Any]) -> tuple:
    """
    Validate database settings.

    Args:
        settings: Database settings dictionary

    Returns:
        Tuple of (valid: bool, errors: list)
    """
    errors = []
    db_type = settings.get('DB_TYPE', '').lower()

    if not db_type:
        errors.append("Database type is required")
        return False, errors

    valid_types = ['sqlite', 'mysql', 'mariadb', 'postgresql', 'postgres', 'mssql', 'sqlserver', 'azuresql']
    if db_type not in valid_types:
        errors.append(f"Invalid database type: {db_type}")
        return False, errors

    # SQLite only needs the file path
    if db_type == 'sqlite':
        if not settings.get('SQLITE_FILE'):
            errors.append("SQLite database file path is required")
        return len(errors) == 0, errors

    # External databases need connection details
    if not settings.get('DB_HOST'):
        errors.append("Database host/server is required")

    if not settings.get('DB_NAME'):
        errors.append("Database name is required")

    if not settings.get('DB_USER'):
        errors.append("Database username is required")

    # Password can be empty for some auth methods (Windows auth, Azure AD)
    # but we'll still warn
    if not settings.get('DB_PASSWORD') and not settings.get('AZURE_AD_AUTH'):
        # This is a warning, not an error
        pass

    return len(errors) == 0, errors
