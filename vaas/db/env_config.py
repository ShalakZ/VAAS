"""
Environment-based database configuration.
Replaces database_settings.json with environment variables.
Falls back to JSON file for backward compatibility.
"""

import os
import json
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

def load_db_config_from_env() -> Dict[str, Any]:
    """
    Load database configuration from environment variables.
    Falls back to database_settings.json if env vars not set.

    Environment variables:
        DB_TYPE: sqlite|mysql|postgresql|mssql
        DB_HOST: Database host
        DB_PORT: Database port
        DB_NAME: Database name
        DB_USER: Database username
        DB_PASSWORD: Database password
        DB_SSL_ENABLED: Enable SSL (true/false)
        DB_SSL_CA_CERT: Path to SSL CA certificate
        DB_SSL_MODE: SSL mode (require|verify-ca|verify-full)
        DB_CONNECTION_TIMEOUT: Connection timeout in seconds
        DB_POOL_SIZE: Connection pool size
        DB_POOL_MAX_OVERFLOW: Max pool overflow
        SQLITE_FILE: Path to SQLite database file
        TRUST_SERVER_CERTIFICATE: Trust server certificate (MSSQL)
        AZURE_AD_AUTH: Use Azure AD authentication (MSSQL)

        # Auto-cleanup settings
        AUTO_CLEANUP_ENABLED: Enable auto cleanup (true/false)
        AUTO_CLEANUP_INTERVAL_DAYS: Cleanup interval in days
        AUTO_CLEANUP_RETENTION_DAYS: Retention period in days

    Returns:
        Dictionary containing database configuration
    """

    # Try environment variables first
    db_type = os.environ.get('DB_TYPE', '').lower()

    if db_type:
        # Build config from environment
        config = {
            'DB_TYPE': db_type,
            'DB_HOST': os.environ.get('DB_HOST', ''),
            'DB_PORT': int(os.environ.get('DB_PORT', 0)) if os.environ.get('DB_PORT') else None,
            'DB_NAME': os.environ.get('DB_NAME', ''),
            'DB_USER': os.environ.get('DB_USER', ''),
            'DB_PASSWORD': os.environ.get('DB_PASSWORD', ''),
            'DB_SSL_ENABLED': os.environ.get('DB_SSL_ENABLED', 'false').lower() == 'true',
            'DB_SSL_CA_CERT': os.environ.get('DB_SSL_CA_CERT', ''),
            'DB_SSL_MODE': os.environ.get('DB_SSL_MODE', 'require'),
            'DB_CONNECTION_TIMEOUT': int(os.environ.get('DB_CONNECTION_TIMEOUT', 30)),
            'DB_POOL_SIZE': int(os.environ.get('DB_POOL_SIZE', 5)),
            'DB_POOL_MAX_OVERFLOW': int(os.environ.get('DB_POOL_MAX_OVERFLOW', 10)),
            'AZURE_AD_AUTH': os.environ.get('AZURE_AD_AUTH', 'false').lower() == 'true',
            'TRUST_SERVER_CERTIFICATE': os.environ.get('TRUST_SERVER_CERTIFICATE', 'false').lower() == 'true',
            'SQLITE_FILE': os.environ.get('SQLITE_FILE', '/app/data/knowledge_base.db'),
            'AUTO_CLEANUP_ENABLED': os.environ.get('AUTO_CLEANUP_ENABLED', 'false').lower() == 'true',
            'AUTO_CLEANUP_INTERVAL_DAYS': int(os.environ.get('AUTO_CLEANUP_INTERVAL_DAYS', 7)),
            'AUTO_CLEANUP_RETENTION_DAYS': int(os.environ.get('AUTO_CLEANUP_RETENTION_DAYS', 30)),
        }
        logger.info(f"Database configuration loaded from environment variables (DB_TYPE={db_type})")
        return config

    # Fallback to JSON file
    from ..config import Config
    settings_file = Config.DB_SETTINGS_FILE

    if os.path.exists(settings_file):
        try:
            with open(settings_file, 'r') as f:
                config = json.load(f)
            logger.info("Database configuration loaded from database_settings.json")
            return config
        except Exception as e:
            logger.error(f"Failed to load database settings from JSON: {e}")

    # Final fallback to SQLite defaults
    logger.info("Using default SQLite configuration")
    return {
        'DB_TYPE': 'sqlite',
        'SQLITE_FILE': Config.DATABASE_FILE,
        'AUTO_CLEANUP_ENABLED': False,
        'AUTO_CLEANUP_INTERVAL_DAYS': 7,
        'AUTO_CLEANUP_RETENTION_DAYS': 30,
    }
