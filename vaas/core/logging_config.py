"""
VAAS Logging Configuration Module
Provides structured logging with multiple log types and persistent storage.
"""

import os
import json
import logging
import sqlite3
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Any
from contextlib import contextmanager
from flask import request
from flask_login import current_user

from ..config import Config


class LogLevel:
    """Log level constants."""
    DEBUG = 'DEBUG'
    INFO = 'INFO'
    WARNING = 'WARNING'
    ERROR = 'ERROR'
    CRITICAL = 'CRITICAL'


class LogCategory:
    """Log category constants."""
    APPLICATION = 'application'
    AUDIT = 'audit'
    SECURITY = 'security'
    SYSTEM = 'system'
    DATABASE = 'database'
    AUTH = 'auth'


class LogDatabase:
    """
    Manages persistent log storage in SQLite.
    Provides efficient querying and log rotation.
    """

    LOG_DB_FILE = os.path.join(Config.DATA_DIR, 'logs.db')

    @staticmethod
    def _get_connection():
        """Get database connection with row factory."""
        conn = sqlite3.connect(LogDatabase.LOG_DB_FILE)
        conn.row_factory = sqlite3.Row
        return conn

    @staticmethod
    @contextmanager
    def get_db():
        """Context manager for database operations."""
        conn = LogDatabase._get_connection()
        try:
            yield conn
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()

    @staticmethod
    def initialize():
        """Initialize the logs database with schema."""
        with LogDatabase.get_db() as conn:
            cursor = conn.cursor()

            # Create logs table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    category TEXT NOT NULL,
                    level TEXT NOT NULL,
                    message TEXT NOT NULL,
                    username TEXT,
                    ip_address TEXT,
                    user_agent TEXT,
                    endpoint TEXT,
                    method TEXT,
                    status_code INTEGER,
                    details TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ''')

            # Create indexes for efficient querying
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_logs_timestamp
                ON logs(timestamp DESC)
            ''')

            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_logs_category
                ON logs(category)
            ''')

            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_logs_level
                ON logs(level)
            ''')

            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_logs_username
                ON logs(username)
            ''')

            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_logs_created_at
                ON logs(created_at DESC)
            ''')

            conn.commit()

    @staticmethod
    def write_log(
        category: str,
        level: str,
        message: str,
        username: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        endpoint: Optional[str] = None,
        method: Optional[str] = None,
        status_code: Optional[int] = None,
        details: Optional[Dict] = None
    ):
        """Write a log entry to the database."""
        try:
            with LogDatabase.get_db() as conn:
                cursor = conn.cursor()

                timestamp = datetime.utcnow().isoformat()
                details_json = json.dumps(details) if details else None

                cursor.execute('''
                    INSERT INTO logs (
                        timestamp, category, level, message, username,
                        ip_address, user_agent, endpoint, method,
                        status_code, details
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    timestamp, category, level, message, username,
                    ip_address, user_agent, endpoint, method,
                    status_code, details_json
                ))

                conn.commit()
        except Exception as e:
            # Fallback to file logging if database fails
            logging.getLogger(__name__).error(f"Failed to write log to database: {e}")

    @staticmethod
    def query_logs(
        category: Optional[str] = None,
        level: Optional[str] = None,
        username: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[Dict]:
        """
        Query logs with filters.

        Args:
            category: Filter by log category
            level: Filter by log level
            username: Filter by username
            start_date: Start date (ISO format)
            end_date: End date (ISO format)
            search: Search in message field
            limit: Maximum number of results
            offset: Offset for pagination

        Returns:
            List of log entries as dictionaries
        """
        with LogDatabase.get_db() as conn:
            cursor = conn.cursor()

            query = "SELECT * FROM logs WHERE 1=1"
            params = []

            if category:
                query += " AND category = ?"
                params.append(category)

            if level:
                query += " AND level = ?"
                params.append(level)

            if username:
                query += " AND username = ?"
                params.append(username)

            if start_date:
                query += " AND timestamp >= ?"
                params.append(start_date)

            if end_date:
                query += " AND timestamp <= ?"
                params.append(end_date)

            if search:
                query += " AND (message LIKE ? OR details LIKE ?)"
                search_pattern = f"%{search}%"
                params.extend([search_pattern, search_pattern])

            query += " ORDER BY timestamp DESC LIMIT ? OFFSET ?"
            params.extend([limit, offset])

            cursor.execute(query, params)
            rows = cursor.fetchall()

            return [dict(row) for row in rows]

    @staticmethod
    def count_logs(
        category: Optional[str] = None,
        level: Optional[str] = None,
        username: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        search: Optional[str] = None
    ) -> int:
        """Count logs matching filters."""
        with LogDatabase.get_db() as conn:
            cursor = conn.cursor()

            query = "SELECT COUNT(*) FROM logs WHERE 1=1"
            params = []

            if category:
                query += " AND category = ?"
                params.append(category)

            if level:
                query += " AND level = ?"
                params.append(level)

            if username:
                query += " AND username = ?"
                params.append(username)

            if start_date:
                query += " AND timestamp >= ?"
                params.append(start_date)

            if end_date:
                query += " AND timestamp <= ?"
                params.append(end_date)

            if search:
                query += " AND (message LIKE ? OR details LIKE ?)"
                search_pattern = f"%{search}%"
                params.extend([search_pattern, search_pattern])

            cursor.execute(query, params)
            return cursor.fetchone()[0]

    @staticmethod
    def cleanup_old_logs(days: int = 90):
        """
        Remove logs older than specified days.

        Args:
            days: Number of days to retain logs
        """
        cutoff_date = (datetime.utcnow() - timedelta(days=days)).isoformat()

        with LogDatabase.get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM logs WHERE timestamp < ?", (cutoff_date,))
            deleted = cursor.rowcount
            conn.commit()

        return deleted

    @staticmethod
    def get_log_statistics() -> Dict[str, Any]:
        """Get statistics about stored logs."""
        with LogDatabase.get_db() as conn:
            cursor = conn.cursor()

            # Total logs
            cursor.execute("SELECT COUNT(*) FROM logs")
            total = cursor.fetchone()[0]

            # Logs by category
            cursor.execute("""
                SELECT category, COUNT(*) as count
                FROM logs
                GROUP BY category
            """)
            by_category = {row[0]: row[1] for row in cursor.fetchall()}

            # Logs by level
            cursor.execute("""
                SELECT level, COUNT(*) as count
                FROM logs
                GROUP BY level
            """)
            by_level = {row[0]: row[1] for row in cursor.fetchall()}

            # Recent activity (last 24 hours)
            yesterday = (datetime.utcnow() - timedelta(days=1)).isoformat()
            cursor.execute("SELECT COUNT(*) FROM logs WHERE timestamp >= ?", (yesterday,))
            recent = cursor.fetchone()[0]

            # Database size
            db_size = os.path.getsize(LogDatabase.LOG_DB_FILE) if os.path.exists(LogDatabase.LOG_DB_FILE) else 0

            return {
                'total_logs': total,
                'by_category': by_category,
                'by_level': by_level,
                'last_24h': recent,
                'database_size_mb': round(db_size / (1024 * 1024), 2)
            }


class AuditLogger:
    """
    High-level audit logger for tracking user actions and security events.
    """

    @staticmethod
    def _get_request_context():
        """Extract context from current Flask request."""
        try:
            return {
                'ip_address': request.remote_addr if request else None,
                'user_agent': request.headers.get('User-Agent') if request else None,
                'endpoint': request.endpoint if request else None,
                'method': request.method if request else None,
            }
        except:
            return {}

    @staticmethod
    def _get_username():
        """Get current username if authenticated."""
        try:
            if current_user and current_user.is_authenticated:
                return current_user.username
        except:
            pass
        return 'anonymous'

    @staticmethod
    def log_action(
        category: str,
        message: str,
        level: str = LogLevel.INFO,
        details: Optional[Dict] = None
    ):
        """
        Log a user action or system event.

        Args:
            category: Log category (use LogCategory constants)
            message: Human-readable message
            level: Log level (use LogLevel constants)
            details: Additional structured data
        """
        context = AuditLogger._get_request_context()
        username = AuditLogger._get_username()

        LogDatabase.write_log(
            category=category,
            level=level,
            message=message,
            username=username,
            ip_address=context.get('ip_address'),
            user_agent=context.get('user_agent'),
            endpoint=context.get('endpoint'),
            method=context.get('method'),
            details=details
        )

        # Also log to standard logger
        logger = logging.getLogger(f'vaas.{category}')
        log_method = getattr(logger, level.lower(), logger.info)
        log_method(f"[{username}] {message}")

    @staticmethod
    def log_security_event(message: str, level: str = LogLevel.WARNING, details: Optional[Dict] = None):
        """Log a security-related event."""
        AuditLogger.log_action(LogCategory.SECURITY, message, level, details)

    @staticmethod
    def log_auth_event(message: str, level: str = LogLevel.INFO, details: Optional[Dict] = None):
        """Log an authentication event."""
        AuditLogger.log_action(LogCategory.AUTH, message, level, details)

    @staticmethod
    def log_db_event(message: str, level: str = LogLevel.INFO, details: Optional[Dict] = None):
        """Log a database operation."""
        AuditLogger.log_action(LogCategory.DATABASE, message, level, details)

    @staticmethod
    def log_system_event(message: str, level: str = LogLevel.INFO, details: Optional[Dict] = None):
        """Log a system event."""
        AuditLogger.log_action(LogCategory.SYSTEM, message, level, details)

    @staticmethod
    def log_app_event(message: str, level: str = LogLevel.INFO, details: Optional[Dict] = None):
        """Log an application event."""
        AuditLogger.log_action(LogCategory.APPLICATION, message, level, details)


def setup_file_logging(app):
    """
    Configure file-based logging as a backup to database logging.
    Creates rotating log files for different categories.
    """
    log_dir = os.path.join(Config.DATA_DIR, 'logs')
    os.makedirs(log_dir, exist_ok=True)

    from logging.handlers import RotatingFileHandler

    # Application log
    app_handler = RotatingFileHandler(
        os.path.join(log_dir, 'application.log'),
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=5
    )
    app_handler.setLevel(logging.INFO)
    app_handler.setFormatter(logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    ))

    # Error log
    error_handler = RotatingFileHandler(
        os.path.join(log_dir, 'error.log'),
        maxBytes=10 * 1024 * 1024,
        backupCount=5
    )
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s\n%(pathname)s:%(lineno)d'
    ))

    # Add handlers to app logger
    app.logger.addHandler(app_handler)
    app.logger.addHandler(error_handler)
    app.logger.setLevel(logging.INFO)

    # Configure root logger
    logging.getLogger('vaas').addHandler(app_handler)
    logging.getLogger('vaas').addHandler(error_handler)
    logging.getLogger('vaas').setLevel(logging.INFO)
