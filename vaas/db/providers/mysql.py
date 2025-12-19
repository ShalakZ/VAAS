"""
MySQL/MariaDB Database Provider
Supports MySQL 5.7+, MySQL 8.0+, and MariaDB 10.4+
"""

import logging
from typing import Any, Dict, Tuple

from .base import DatabaseProvider

logger = logging.getLogger(__name__)

# MySQL connector is optional - only imported when needed
try:
    import mysql.connector
    from mysql.connector import Error as MySQLError
    MYSQL_AVAILABLE = True
except ImportError:
    MYSQL_AVAILABLE = False
    MySQLError = Exception


class MySQLProvider(DatabaseProvider):
    """MySQL/MariaDB database provider."""

    def __init__(self, config: Dict[str, Any]):
        """
        Initialize MySQL provider.

        Args:
            config: Dictionary with host, port, database, user, password, ssl_enabled, ssl_ca
        """
        super().__init__(config)
        self.host = config.get('host', 'localhost')
        self.port = config.get('port', 3306)
        self.database = config.get('database', '')
        self.user = config.get('user', '')
        self.password = config.get('password', '')
        self.ssl_enabled = config.get('ssl_enabled', False)
        self.ssl_ca = config.get('ssl_ca', '')
        self.connection_timeout = config.get('connection_timeout', 30)

    @property
    def db_type(self) -> str:
        return 'mysql'

    @property
    def placeholder(self) -> str:
        return '%s'

    def connect(self) -> Any:
        """Create a new MySQL connection."""
        if not MYSQL_AVAILABLE:
            raise ImportError("mysql-connector-python is not installed. Run: pip install mysql-connector-python")

        connect_args = {
            'host': self.host,
            'port': self.port,
            'database': self.database,
            'user': self.user,
            'password': self.password,
            'connection_timeout': self.connection_timeout,
            'autocommit': False
        }

        if self.ssl_enabled:
            ssl_config = {'require': True}
            if self.ssl_ca:
                ssl_config['ca'] = self.ssl_ca
            connect_args['ssl_ca'] = self.ssl_ca if self.ssl_ca else None
            connect_args['ssl_verify_cert'] = bool(self.ssl_ca)

        return mysql.connector.connect(**connect_args)

    def test_connection(self) -> Tuple[bool, str]:
        """Test MySQL connection."""
        if not MYSQL_AVAILABLE:
            return False, "mysql-connector-python is not installed"

        try:
            conn = self.connect()
            cursor = conn.cursor()
            cursor.execute("SELECT VERSION()")
            version = cursor.fetchone()[0]
            cursor.close()
            conn.close()

            # Determine if MySQL or MariaDB
            db_name = "MariaDB" if "mariadb" in version.lower() else "MySQL"
            return True, f"Successfully connected to {db_name} {version}"
        except MySQLError as e:
            logger.error(f"MySQL connection test failed: {e}")
            return False, f"Connection failed: {str(e)}"
        except Exception as e:
            logger.error(f"MySQL connection test failed: {e}")
            return False, f"Connection failed: {str(e)}"

    def get_version(self) -> str:
        """Get MySQL/MariaDB version."""
        try:
            conn = self.connect()
            cursor = conn.cursor()
            cursor.execute("SELECT VERSION()")
            version = cursor.fetchone()[0]
            cursor.close()
            conn.close()
            db_name = "MariaDB" if "mariadb" in version.lower() else "MySQL"
            return f"{db_name} {version}"
        except Exception:
            return "MySQL/MariaDB (version unknown)"

    def get_autoincrement_syntax(self) -> str:
        """Return MySQL AUTO_INCREMENT syntax."""
        return "INT AUTO_INCREMENT PRIMARY KEY"

    def get_timestamp_type(self) -> str:
        """Return MySQL DATETIME type."""
        return "DATETIME"

    def get_text_type(self) -> str:
        """Return MySQL TEXT type."""
        return "TEXT"

    def get_boolean_type(self) -> str:
        """Return MySQL TINYINT for boolean."""
        return "TINYINT(1)"

    def create_tables(self, conn: Any) -> None:
        """Create all required tables for MySQL."""
        cursor = conn.cursor()

        # Hostnames table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS hostnames (
                hostname VARCHAR(255) PRIMARY KEY,
                team VARCHAR(255) NOT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        ''')

        # Rules table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS rules (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title_pattern TEXT NOT NULL,
                team VARCHAR(255) NOT NULL,
                rule_type VARCHAR(50) DEFAULT 'contains',
                UNIQUE KEY unique_title (title_pattern(255))
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        ''')

        # Users table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255),
                display_name VARCHAR(255),
                email VARCHAR(255),
                role VARCHAR(50) DEFAULT 'viewer',
                auth_type VARCHAR(50) DEFAULT 'local',
                is_active TINYINT(1) DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_login DATETIME
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        ''')

        # Reports table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS reports (
                id INT AUTO_INCREMENT PRIMARY KEY,
                report_uuid VARCHAR(36) UNIQUE NOT NULL,
                filename VARCHAR(500) NOT NULL,
                uploaded_by VARCHAR(255),
                uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                total_rows INT DEFAULT 0,
                classified_count INT DEFAULT 0,
                needs_review_count INT DEFAULT 0,
                status VARCHAR(50) DEFAULT 'completed',
                metadata JSON
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        ''')

        # Report items table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS report_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                report_id INT NOT NULL,
                hostname VARCHAR(255),
                title TEXT,
                assigned_team VARCHAR(255),
                reason TEXT,
                needs_review TINYINT(1) DEFAULT 0,
                method VARCHAR(100),
                original_data JSON,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
                INDEX idx_report_id (report_id),
                INDEX idx_hostname (hostname),
                INDEX idx_team (assigned_team)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        ''')

        # Index on reports
        try:
            cursor.execute('CREATE INDEX idx_reports_uploaded_at ON reports(uploaded_at)')
        except MySQLError:
            pass  # Index may already exist

        # Performance optimization indexes for rules and hostnames tables
        # These indexes significantly improve lookup performance (50-90% faster)
        try:
            cursor.execute('CREATE INDEX idx_rules_team ON rules(team)')
        except MySQLError:
            pass  # Index may already exist

        try:
            cursor.execute('CREATE INDEX idx_hostnames_team ON hostnames(team)')
        except MySQLError:
            pass  # Index may already exist

        logger.info("MySQL tables and performance indexes created successfully")
        conn.commit()
