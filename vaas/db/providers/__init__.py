"""
Database Providers Module
Exports all available database providers.
"""

from .base import DatabaseProvider
from .sqlite import SQLiteProvider
from .mysql import MySQLProvider
from .postgresql import PostgreSQLProvider
from .mssql import MSSQLProvider

__all__ = [
    'DatabaseProvider',
    'SQLiteProvider',
    'MySQLProvider',
    'PostgreSQLProvider',
    'MSSQLProvider'
]

# Provider registry for factory pattern
PROVIDERS = {
    'sqlite': SQLiteProvider,
    'mysql': MySQLProvider,
    'mariadb': MySQLProvider,  # MariaDB uses MySQL provider
    'postgresql': PostgreSQLProvider,
    'postgres': PostgreSQLProvider,  # Alias
    'mssql': MSSQLProvider,
    'sqlserver': MSSQLProvider,  # Alias
    'azuresql': MSSQLProvider,  # Azure SQL uses MSSQL provider
}


def get_provider_class(db_type: str):
    """
    Get the provider class for a database type.

    Args:
        db_type: Database type identifier (sqlite, mysql, postgresql, mssql, etc.)

    Returns:
        DatabaseProvider subclass

    Raises:
        ValueError: If db_type is not supported
    """
    db_type_lower = db_type.lower().strip()
    if db_type_lower not in PROVIDERS:
        supported = ', '.join(sorted(set(PROVIDERS.keys())))
        raise ValueError(f"Unsupported database type: {db_type}. Supported: {supported}")
    return PROVIDERS[db_type_lower]
