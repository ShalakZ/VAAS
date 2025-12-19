"""
Database Module for VAAS
Provides database abstraction layer supporting multiple database backends.

Supported Databases:
- SQLite (default, built-in)
- MySQL 5.7+ / MariaDB 10.4+
- PostgreSQL 12+
- Microsoft SQL Server 2016+ / Azure SQL

Usage:
    from vaas.db import get_db_provider

    provider = get_db_provider()
    with provider.get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM hostnames")
        rows = cursor.fetchall()
"""

import logging
from typing import Optional

from .settings import (
    load_database_settings,
    save_database_settings,
    mask_password,
    settings_to_provider_config,
    validate_settings,
    get_default_settings,
    get_default_port
)
from .providers import (
    DatabaseProvider,
    SQLiteProvider,
    MySQLProvider,
    PostgreSQLProvider,
    MSSQLProvider,
    get_provider_class
)

logger = logging.getLogger(__name__)

# Global provider instance (singleton)
_provider_instance: Optional[DatabaseProvider] = None
_initialized = False


def get_db_provider(force_reload: bool = False) -> DatabaseProvider:
    """
    Get the database provider instance.
    Creates a new instance based on current settings if needed.

    Args:
        force_reload: If True, reload settings and create new provider

    Returns:
        DatabaseProvider instance
    """
    global _provider_instance, _initialized

    if _provider_instance is None or force_reload:
        settings = load_database_settings()
        db_type = settings.get('DB_TYPE', 'sqlite')

        try:
            provider_class = get_provider_class(db_type)
            config = settings_to_provider_config(settings)
            _provider_instance = provider_class(config)
            _initialized = False
            logger.info(f"Created {db_type} database provider")
        except Exception as e:
            logger.error(f"Failed to create database provider: {e}")
            raise

    return _provider_instance


def initialize_database() -> None:
    """
    Initialize the database by creating tables if they don't exist.
    Called on application startup.
    """
    global _initialized

    if _initialized:
        return

    provider = get_db_provider()

    try:
        with provider.get_connection() as conn:
            provider.create_tables(conn)
        _initialized = True
        logger.info(f"Database initialized ({provider.db_type})")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        raise


def test_database_connection(settings: dict = None) -> tuple:
    """
    Test database connection with given or current settings.

    Args:
        settings: Optional settings to test (uses current if None)

    Returns:
        Tuple of (success: bool, message: str)
    """
    if settings is None:
        settings = load_database_settings()

    db_type = settings.get('DB_TYPE', 'sqlite')

    try:
        provider_class = get_provider_class(db_type)
        config = settings_to_provider_config(settings)
        provider = provider_class(config)
        return provider.test_connection()
    except ValueError as e:
        return False, str(e)
    except ImportError as e:
        return False, str(e)
    except Exception as e:
        logger.error(f"Connection test failed: {e}")
        return False, f"Connection test failed: {str(e)}"


def get_database_info() -> dict:
    """
    Get information about the current database.

    Returns:
        Dictionary with database info (type, version, status)
    """
    try:
        provider = get_db_provider()
        success, message = provider.test_connection()

        return {
            'type': provider.db_type,
            'version': provider.get_version() if success else 'Unknown',
            'connected': success,
            'message': message
        }
    except Exception as e:
        return {
            'type': 'unknown',
            'version': 'Unknown',
            'connected': False,
            'message': str(e)
        }


def reload_provider() -> None:
    """
    Reload the database provider with current settings.
    Call this after changing database settings.
    """
    global _provider_instance, _initialized
    _provider_instance = None
    _initialized = False
    get_db_provider(force_reload=True)


__all__ = [
    # Main functions
    'get_db_provider',
    'initialize_database',
    'test_database_connection',
    'get_database_info',
    'reload_provider',
    # Settings functions
    'load_database_settings',
    'save_database_settings',
    'mask_password',
    'validate_settings',
    'get_default_settings',
    'get_default_port',
    # Provider classes (for advanced use)
    'DatabaseProvider',
    'SQLiteProvider',
    'MySQLProvider',
    'PostgreSQLProvider',
    'MSSQLProvider',
]
