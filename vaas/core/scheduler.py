"""
Background Scheduler for VAAS
Handles automated tasks like database cleanup based on retention policies.
"""

import threading
import time
import logging
from datetime import datetime, timedelta
from typing import Optional

logger = logging.getLogger(__name__)


class CleanupScheduler:
    """
    Background scheduler for automated database maintenance.
    Runs cleanup tasks based on configured retention policies.
    """

    _instance: Optional['CleanupScheduler'] = None
    _lock = threading.Lock()

    def __new__(cls):
        """Singleton pattern to ensure only one scheduler runs."""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return

        self._initialized = True
        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._last_cleanup: Optional[datetime] = None

    def _load_settings(self) -> dict:
        """Load scheduler settings from database settings file."""
        try:
            from ..db.settings import load_database_settings
            settings = load_database_settings()
            return {
                'enabled': settings.get('AUTO_CLEANUP_ENABLED', False),
                'interval_days': settings.get('AUTO_CLEANUP_INTERVAL_DAYS', 7),
                'retention_days': settings.get('AUTO_CLEANUP_RETENTION_DAYS', 30),
            }
        except Exception as e:
            logger.error(f"Failed to load scheduler settings: {e}")
            return {
                'enabled': False,
                'interval_days': 7,
                'retention_days': 30,
            }

    def _should_run_cleanup(self, settings: dict) -> bool:
        """Check if cleanup should run based on interval."""
        if not settings['enabled']:
            return False

        if self._last_cleanup is None:
            return True

        next_run = self._last_cleanup + timedelta(days=settings['interval_days'])
        return datetime.now() >= next_run

    def _run_cleanup(self, retention_days: int) -> dict:
        """Execute the cleanup operation."""
        try:
            from .db_optimizer import DatabaseOptimizer

            logger.info(f"Starting scheduled cleanup (retention: {retention_days} days)")

            # Delete old reports based on retention
            success, message, deleted_count = DatabaseOptimizer.delete_old_reports(retention_days)

            result = {
                'success': success,
                'message': message,
                'deleted_reports': deleted_count,
                'timestamp': datetime.now().isoformat()
            }

            if success:
                # Run vacuum to reclaim space
                vacuum_success, vacuum_msg = DatabaseOptimizer.vacuum_database()
                result['vacuum_success'] = vacuum_success
                result['vacuum_message'] = vacuum_msg
                logger.info(f"Scheduled cleanup completed: {deleted_count} reports deleted")
            else:
                logger.error(f"Scheduled cleanup failed: {message}")

            return result

        except Exception as e:
            logger.error(f"Scheduled cleanup error: {e}")
            return {
                'success': False,
                'message': str(e),
                'timestamp': datetime.now().isoformat()
            }

    def _scheduler_loop(self):
        """Main scheduler loop running in background thread."""
        logger.info("Cleanup scheduler started")

        # Check every hour if cleanup is needed
        check_interval = 3600  # 1 hour in seconds

        while not self._stop_event.is_set():
            try:
                settings = self._load_settings()

                if self._should_run_cleanup(settings):
                    result = self._run_cleanup(settings['retention_days'])
                    if result['success']:
                        self._last_cleanup = datetime.now()
                        self._save_last_cleanup()

            except Exception as e:
                logger.error(f"Scheduler loop error: {e}")

            # Wait for next check (or until stop is requested)
            self._stop_event.wait(timeout=check_interval)

        logger.info("Cleanup scheduler stopped")

    def _save_last_cleanup(self):
        """Save last cleanup timestamp to settings."""
        try:
            from ..db.settings import load_database_settings, save_database_settings
            settings = load_database_settings()
            settings['LAST_AUTO_CLEANUP'] = self._last_cleanup.isoformat()
            save_database_settings(settings)
        except Exception as e:
            logger.error(f"Failed to save last cleanup time: {e}")

    def _load_last_cleanup(self):
        """Load last cleanup timestamp from settings."""
        try:
            from ..db.settings import load_database_settings
            settings = load_database_settings()
            last_cleanup_str = settings.get('LAST_AUTO_CLEANUP')
            if last_cleanup_str:
                self._last_cleanup = datetime.fromisoformat(last_cleanup_str)
        except Exception as e:
            logger.error(f"Failed to load last cleanup time: {e}")

    def start(self):
        """Start the background scheduler."""
        if self._running:
            logger.warning("Scheduler already running")
            return

        settings = self._load_settings()
        if not settings['enabled']:
            logger.info("Auto-cleanup is disabled, scheduler not started")
            return

        self._load_last_cleanup()
        self._stop_event.clear()
        self._thread = threading.Thread(target=self._scheduler_loop, daemon=True)
        self._thread.start()
        self._running = True
        logger.info(f"Cleanup scheduler started (interval: {settings['interval_days']} days, retention: {settings['retention_days']} days)")

    def stop(self):
        """Stop the background scheduler."""
        if not self._running:
            return

        self._stop_event.set()
        if self._thread:
            self._thread.join(timeout=5)
        self._running = False
        logger.info("Cleanup scheduler stopped")

    def is_running(self) -> bool:
        """Check if scheduler is running."""
        return self._running

    def get_status(self) -> dict:
        """Get current scheduler status."""
        settings = self._load_settings()

        next_cleanup = None
        if self._last_cleanup and settings['enabled']:
            next_cleanup = (self._last_cleanup + timedelta(days=settings['interval_days'])).isoformat()

        return {
            'running': self._running,
            'enabled': settings['enabled'],
            'interval_days': settings['interval_days'],
            'retention_days': settings['retention_days'],
            'last_cleanup': self._last_cleanup.isoformat() if self._last_cleanup else None,
            'next_cleanup': next_cleanup
        }

    def run_now(self) -> dict:
        """Manually trigger cleanup immediately."""
        settings = self._load_settings()
        result = self._run_cleanup(settings['retention_days'])
        if result['success']:
            self._last_cleanup = datetime.now()
            self._save_last_cleanup()
        return result

    def restart(self):
        """Restart the scheduler (useful after settings change)."""
        self.stop()
        time.sleep(0.5)  # Brief pause
        self.start()


# Global scheduler instance
scheduler = CleanupScheduler()


def start_scheduler():
    """Start the global scheduler."""
    scheduler.start()


def stop_scheduler():
    """Stop the global scheduler."""
    scheduler.stop()


def get_scheduler_status() -> dict:
    """Get scheduler status."""
    return scheduler.get_status()


def run_cleanup_now() -> dict:
    """Run cleanup immediately."""
    return scheduler.run_now()


def restart_scheduler():
    """Restart scheduler with new settings."""
    scheduler.restart()
