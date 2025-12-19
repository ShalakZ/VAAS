import os

class Config:
    """
    Application configuration with environment variable support.

    Environment variables take precedence over default values.
    For backward compatibility, JSON configuration files are still supported.
    """

    # Base directories - allow override via env vars
    BASE_DIR = os.environ.get('VAAS_BASE_DIR', os.getcwd())
    DATA_DIR = os.environ.get('VAAS_DATA_DIR', os.path.join(BASE_DIR, 'data'))

    # Directory structure
    UPLOAD_FOLDER = os.path.join(DATA_DIR, 'uploads')
    HISTORICAL_DIR = os.path.join(DATA_DIR, 'historical')
    OUTPUTS_DIR = os.path.join(DATA_DIR, 'outputs')

    # Knowledge Base files
    HOSTNAMES_FILE = os.path.join(DATA_DIR, 'Hostnames.xlsx')
    TITLES_FILE = os.path.join(DATA_DIR, 'VA Titles.xlsx')
    DATABASE_FILE = os.path.join(DATA_DIR, 'knowledge_base.db')

    # Database settings (will be migrated to env vars via vaas.db.env_config)
    # Kept for backward compatibility with JSON file
    DB_SETTINGS_FILE = os.path.join(DATA_DIR, 'database_settings.json')

    # Application settings
    CONFIDENCE_THRESHOLD = float(os.environ.get('VAAS_THRESHOLD', 0.85))

    # Flask settings
    SECRET_KEY = os.environ.get('FLASK_SECRET_KEY', os.urandom(24).hex())
    DEBUG = os.environ.get('FLASK_DEBUG', '0') == '1'

    # Server settings
    HOST = os.environ.get('VAAS_HOST', '0.0.0.0')
    PORT = int(os.environ.get('VAAS_PORT', 5001))

    @staticmethod
    def get_teams_list():
        """
        Get fallback teams list.
        Real teams are loaded dynamically from Hostnames.xlsx and VA Titles.xlsx
        """
        return ['Unclassified']
