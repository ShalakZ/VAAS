import os
import time
import logging
import json
from datetime import datetime
from flask import Flask, send_from_directory
from flask.json.provider import DefaultJSONProvider
from .config import Config

logger = logging.getLogger(__name__)

class CustomJSONProvider(DefaultJSONProvider):
    """Custom JSON Provider to handle datetime and pandas Timestamp objects."""
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        if hasattr(obj, 'isoformat'):  # Handles pandas Timestamp
            return obj.isoformat()
        return super().default(obj)

def cleanup_old_uploads(max_age_days=7):
    """Remove uploaded files older than max_age_days."""
    upload_dir = Config.UPLOAD_FOLDER
    if not os.path.exists(upload_dir):
        return
    
    cutoff = time.time() - (max_age_days * 24 * 60 * 60)
    cleaned = 0
    
    for filename in os.listdir(upload_dir):
        filepath = os.path.join(upload_dir, filename)
        if os.path.isfile(filepath):
            if os.path.getmtime(filepath) < cutoff:
                try:
                    os.remove(filepath)
                    cleaned += 1
                except Exception as e:
                    logger.warning(f"Failed to remove old file {filename}: {e}")
    
    if cleaned > 0:
        logger.info(f"Cleaned up {cleaned} old uploaded files (older than {max_age_days} days)")

def create_app():
    # Keep default static folder for legacy admin templates (login, settings, etc.)
    # This serves /static/js/tailwind.js, /static/img/Logo.png, etc.
    app = Flask(__name__, static_folder='static', static_url_path='/static')

    # Set custom JSON provider
    app.json = CustomJSONProvider(app)
    
    app.config.from_object(Config)
    
    # Secret key for sessions (load from env or generate)
    app.secret_key = os.environ.get('FLASK_SECRET_KEY', os.urandom(24).hex())
    
    # Initialize Flask-Login
    from flask_login import LoginManager
    login_manager = LoginManager()
    login_manager.init_app(app)
    login_manager.login_view = 'auth.login'
    login_manager.login_message = 'Please log in to access this page.'
    login_manager.login_message_category = 'info'
    
    @login_manager.user_loader
    def load_user(user_id):
        from .auth.user_db import UserDB
        from .auth.ldap_auth import User
        from .auth.routes import is_auth_enabled
        
        # If no users exist, don't load any user
        if not is_auth_enabled():
            return None
        
        # Load user from database
        user_data = UserDB.get_user_by_username(user_id)
        if user_data and user_data['is_active']:
            return User(
                username=user_data['username'],
                display_name=user_data['display_name'],
                email=user_data['email'],
                role=user_data['role'],
                auth_type=user_data['auth_type'],
                user_id=user_data['id']
            )
        return None

    # Serve React built assets from /assets/ path
    @app.route('/assets/<path:filename>')
    def react_assets(filename):
        """Serve React build assets (JS, CSS) from dist/assets directory."""
        return send_from_directory(
            os.path.join(app.root_path, 'web', 'static', 'dist', 'assets'),
            filename
        )

    # Register Blueprints
    from .web.routes import web_bp
    from .auth.routes import auth_bp
    from .db.routes import db_bp
    from .logs.routes import logs_bp
    app.register_blueprint(web_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(db_bp)
    app.register_blueprint(logs_bp)

    # Initialize database
    from .db import initialize_database
    try:
        initialize_database()
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")

    # Initialize logging database
    from .core.logging_config import LogDatabase, setup_file_logging
    try:
        LogDatabase.initialize()
        setup_file_logging(app)
        logger.info("Logging system initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize logging system: {e}")

    # Create necessary directories
    os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)
    os.makedirs(Config.HISTORICAL_DIR, exist_ok=True)
    os.makedirs(Config.OUTPUTS_DIR, exist_ok=True)
    os.makedirs(os.path.join(Config.DATA_DIR, 'logs'), exist_ok=True)

    # Cleanup old uploaded files on startup
    cleanup_old_uploads(max_age_days=7)

    # Start the auto-cleanup scheduler (if enabled in settings)
    try:
        from .core.scheduler import start_scheduler
        start_scheduler()
    except Exception as e:
        logger.warning(f"Failed to start cleanup scheduler: {e}")

    return app

if __name__ == '__main__':
    # Enable debug logging for auth
    logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    logging.getLogger('vaas.auth').setLevel(logging.DEBUG)

    app = create_app()
    logger.info("Starting VAAS Modular App...")
    debug_mode = os.environ.get('FLASK_DEBUG', '0') == '1'
    port = int(os.environ.get('VAAS_PORT', 8085))
    host = os.environ.get('VAAS_HOST', '0.0.0.0')
    app.run(debug=debug_mode, port=port, host=host)
