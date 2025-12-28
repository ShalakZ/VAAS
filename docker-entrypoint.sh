#!/bin/sh
set -e

DATA_DIR="${VAAS_DATA_DIR:-/app/data}"

# Create data directories if they don't exist
mkdir -p "$DATA_DIR/uploads" "$DATA_DIR/outputs" "$DATA_DIR/logs"

# Generate a stable secret key if not provided
# This ensures all Gunicorn workers use the same key for sessions
if [ -z "$FLASK_SECRET_KEY" ]; then
    SECRET_FILE="$DATA_DIR/.secret_key"
    if [ ! -f "$SECRET_FILE" ]; then
        # Generate a random secret key and save it
        python3 -c "import secrets; print(secrets.token_hex(32))" > "$SECRET_FILE"
        chmod 600 "$SECRET_FILE"
        echo "Generated new Flask secret key"
    fi
    export FLASK_SECRET_KEY=$(cat "$SECRET_FILE")
fi

# Initialize config files from examples if they don't exist
if [ ! -f "$DATA_DIR/database_settings.json" ]; then
    if [ -f "$DATA_DIR/database_settings.json.example" ]; then
        cp "$DATA_DIR/database_settings.json.example" "$DATA_DIR/database_settings.json"
        echo "Initialized database_settings.json from example"
    fi
fi

if [ ! -f "$DATA_DIR/ldap_settings.json" ]; then
    if [ -f "$DATA_DIR/ldap_settings.json.example" ]; then
        cp "$DATA_DIR/ldap_settings.json.example" "$DATA_DIR/ldap_settings.json"
        echo "Initialized ldap_settings.json from example"
    fi
fi

# Execute the main command
exec "$@"
