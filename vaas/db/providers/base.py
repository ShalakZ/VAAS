"""
Abstract Base Class for Database Providers
All database providers must implement this interface.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Tuple
from contextlib import contextmanager
import logging

logger = logging.getLogger(__name__)


class DatabaseProvider(ABC):
    """Abstract base class for database providers."""

    def __init__(self, config: Dict[str, Any]):
        """
        Initialize the provider with configuration.

        Args:
            config: Dictionary containing database configuration
        """
        self.config = config
        self._connection = None

    @property
    @abstractmethod
    def db_type(self) -> str:
        """Return the database type identifier (e.g., 'sqlite', 'mysql', 'postgresql', 'mssql')."""
        pass

    @property
    @abstractmethod
    def placeholder(self) -> str:
        """Return the parameter placeholder for this database (? or %s)."""
        pass

    @abstractmethod
    def connect(self) -> Any:
        """
        Create and return a new database connection.

        Returns:
            Database connection object
        """
        pass

    @abstractmethod
    def test_connection(self) -> Tuple[bool, str]:
        """
        Test the database connection.

        Returns:
            Tuple of (success: bool, message: str)
        """
        pass

    @abstractmethod
    def get_version(self) -> str:
        """
        Get the database server version.

        Returns:
            Version string
        """
        pass

    @abstractmethod
    def create_tables(self, conn: Any) -> None:
        """
        Create all required tables if they don't exist.

        Args:
            conn: Database connection
        """
        pass

    @contextmanager
    def get_connection(self):
        """
        Context manager for database connections.
        Opens connection, yields it, and ensures cleanup.

        Usage:
            with provider.get_connection() as conn:
                cursor = conn.cursor()
                ...
        """
        conn = None
        try:
            conn = self.connect()
            yield conn
        finally:
            if conn:
                try:
                    conn.close()
                except Exception as e:
                    logger.warning(f"Error closing connection: {e}")

    def execute(self, query: str, params: tuple = None) -> Any:
        """
        Execute a query and return the cursor.

        Args:
            query: SQL query string
            params: Query parameters (optional)

        Returns:
            Database cursor with results
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            if params:
                cursor.execute(query, params)
            else:
                cursor.execute(query)
            conn.commit()
            return cursor

    def fetchall(self, query: str, params: tuple = None) -> List[tuple]:
        """
        Execute query and fetch all results.

        Args:
            query: SQL query string
            params: Query parameters (optional)

        Returns:
            List of result tuples
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            if params:
                cursor.execute(query, params)
            else:
                cursor.execute(query)
            return cursor.fetchall()

    def fetchone(self, query: str, params: tuple = None) -> Optional[tuple]:
        """
        Execute query and fetch one result.

        Args:
            query: SQL query string
            params: Query parameters (optional)

        Returns:
            Single result tuple or None
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            if params:
                cursor.execute(query, params)
            else:
                cursor.execute(query)
            return cursor.fetchone()

    def convert_placeholder(self, query: str) -> str:
        """
        Convert query placeholders from ? to the database-specific format.

        Args:
            query: SQL query with ? placeholders

        Returns:
            Query with database-specific placeholders
        """
        if self.placeholder == '?':
            return query
        # Replace ? with %s for MySQL/PostgreSQL
        return query.replace('?', self.placeholder)

    def get_autoincrement_syntax(self) -> str:
        """Return the AUTO_INCREMENT/SERIAL syntax for this database."""
        return "INTEGER PRIMARY KEY AUTOINCREMENT"

    def get_timestamp_type(self) -> str:
        """Return the TIMESTAMP column type for this database."""
        return "TIMESTAMP"

    def get_text_type(self) -> str:
        """Return the TEXT column type for this database."""
        return "TEXT"

    def get_boolean_type(self) -> str:
        """Return the BOOLEAN column type for this database."""
        return "INTEGER"  # SQLite-compatible default
