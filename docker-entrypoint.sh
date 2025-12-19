#!/bin/sh
set -e

DATA_DIR="${VAAS_DATA_DIR:-/app/data}"

# Create data directories if they don't exist
mkdir -p "$DATA_DIR/uploads" "$DATA_DIR/outputs" "$DATA_DIR/logs" "$DATA_DIR/historical"

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
