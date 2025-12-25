"""
Rate limiting utilities for VAAS authentication.
Simple in-memory rate limiter to prevent brute-force attacks.
"""

import time
import threading
import logging
from functools import wraps
from flask import request, jsonify

logger = logging.getLogger(__name__)

# Configuration
MAX_LOGIN_ATTEMPTS = 5  # Max attempts per window
WINDOW_SECONDS = 300  # 5-minute window
LOCKOUT_SECONDS = 900  # 15-minute lockout after max attempts

# Thread-safe storage for rate limiting
_rate_limit_lock = threading.Lock()
_login_attempts = {}  # {ip_or_user: [(timestamp, success), ...]}
_lockouts = {}  # {ip_or_user: lockout_until_timestamp}


def _get_client_key():
    """Get a unique key for the client (IP address)."""
    # Use X-Forwarded-For if behind proxy, otherwise use remote_addr
    forwarded_for = request.headers.get('X-Forwarded-For', '')
    if forwarded_for:
        # Get the first IP in the chain (original client)
        return forwarded_for.split(',')[0].strip()
    return request.remote_addr or 'unknown'


def _cleanup_old_entries():
    """Remove expired entries from tracking dicts."""
    current_time = time.time()
    cutoff = current_time - WINDOW_SECONDS

    # Clean up attempts older than window
    for key in list(_login_attempts.keys()):
        _login_attempts[key] = [
            (ts, success) for ts, success in _login_attempts[key]
            if ts > cutoff
        ]
        if not _login_attempts[key]:
            del _login_attempts[key]

    # Clean up expired lockouts
    for key in list(_lockouts.keys()):
        if _lockouts[key] < current_time:
            del _lockouts[key]


def is_rate_limited(client_key=None):
    """
    Check if a client is rate limited.
    Returns (is_limited, retry_after_seconds, message).
    """
    if client_key is None:
        client_key = _get_client_key()

    current_time = time.time()

    with _rate_limit_lock:
        _cleanup_old_entries()

        # Check if client is in lockout
        if client_key in _lockouts:
            lockout_until = _lockouts[client_key]
            if current_time < lockout_until:
                retry_after = int(lockout_until - current_time)
                return True, retry_after, f'Too many failed login attempts. Try again in {retry_after // 60} minutes.'

        # Check attempt count in current window
        attempts = _login_attempts.get(client_key, [])
        failed_attempts = sum(1 for ts, success in attempts if not success)

        if failed_attempts >= MAX_LOGIN_ATTEMPTS:
            # Apply lockout
            _lockouts[client_key] = current_time + LOCKOUT_SECONDS
            return True, LOCKOUT_SECONDS, f'Too many failed login attempts. Try again in {LOCKOUT_SECONDS // 60} minutes.'

    return False, 0, None


def record_login_attempt(success, client_key=None):
    """Record a login attempt (success or failure)."""
    if client_key is None:
        client_key = _get_client_key()

    current_time = time.time()

    with _rate_limit_lock:
        if client_key not in _login_attempts:
            _login_attempts[client_key] = []

        _login_attempts[client_key].append((current_time, success))

        # If successful login, clear the lockout for this client
        if success and client_key in _lockouts:
            del _lockouts[client_key]

        # Log for monitoring
        if not success:
            failed_count = sum(1 for ts, s in _login_attempts[client_key] if not s)
            if failed_count >= MAX_LOGIN_ATTEMPTS - 1:
                logger.warning(f"Rate limit: {client_key} approaching lockout ({failed_count}/{MAX_LOGIN_ATTEMPTS} attempts)")


def rate_limit_login(f):
    """
    Decorator to apply rate limiting to login endpoint.
    Returns 429 Too Many Requests if rate limited.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        is_limited, retry_after, message = is_rate_limited()

        if is_limited:
            logger.warning(f"Rate limited login attempt from {_get_client_key()}")
            response = jsonify({
                'success': False,
                'message': message,
                'retry_after': retry_after
            })
            response.status_code = 429
            response.headers['Retry-After'] = str(retry_after)
            return response

        return f(*args, **kwargs)

    return decorated_function


def clear_rate_limits():
    """Clear all rate limiting data (for testing/admin use)."""
    with _rate_limit_lock:
        _login_attempts.clear()
        _lockouts.clear()
