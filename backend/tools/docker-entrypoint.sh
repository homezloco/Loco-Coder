#!/bin/bash
# Docker entrypoint script for AILang adapter system
# This script handles different modes of operation for the containerized AILang adapter system

set -e

# Default configuration
CONFIG_FILE="/app/backend/config/ailang_config.json"
LOG_LEVEL="INFO"
CHECK_INTERVAL=86400  # 24 hours in seconds

# Function to display usage information
show_usage() {
    echo "AILang Adapter System Docker Container"
    echo ""
    echo "Available commands:"
    echo "  monitor              - Run the monitoring script once and exit"
    echo "  service              - Run the monitoring script as a continuous service"
    echo "  update               - Run the updater script once and exit"
    echo "  api                  - Start the API server (if implemented)"
    echo "  shell                - Start a shell session"
    echo ""
    echo "Environment variables:"
    echo "  CONFIG_FILE          - Path to config file (default: /app/backend/config/ailang_config.json)"
    echo "  LOG_LEVEL            - Logging level (default: INFO)"
    echo "  CHECK_INTERVAL       - Check interval in seconds for service mode (default: 86400)"
    echo "  GITHUB_TOKEN         - GitHub API token for authenticated requests"
    echo "  NOTIFICATION_EMAIL   - Email to send notifications to"
    echo "  SMTP_SERVER          - SMTP server for email notifications"
    echo "  SMTP_PORT            - SMTP port for email notifications"
    echo "  SMTP_USERNAME        - SMTP username for email notifications"
    echo "  SMTP_PASSWORD        - SMTP password for email notifications"
    echo "  SLACK_WEBHOOK_URL    - Slack webhook URL for notifications"
}

# Function to check if config file exists
check_config() {
    if [ ! -f "$CONFIG_FILE" ]; then
        echo "Config file not found at $CONFIG_FILE"
        echo "Creating default config file..."
        
        # Create config directory if it doesn't exist
        mkdir -p "$(dirname "$CONFIG_FILE")"
        
        # Create default config file
        cat > "$CONFIG_FILE" << EOF
{
    "github": {
        "repo_owner": "ailang-org",
        "repo_name": "ailang",
        "token": "${GITHUB_TOKEN:-}"
    },
    "update_policy": {
        "update_on_minor_changes": true,
        "update_on_major_changes": true,
        "update_on_releases": true
    },
    "notifications": {
        "email": {
            "enabled": ${NOTIFICATION_EMAIL:+true}${NOTIFICATION_EMAIL:-false},
            "recipient": "${NOTIFICATION_EMAIL:-}",
            "smtp_server": "${SMTP_SERVER:-smtp.gmail.com}",
            "smtp_port": ${SMTP_PORT:-587},
            "smtp_username": "${SMTP_USERNAME:-}",
            "smtp_password": "${SMTP_PASSWORD:-}"
        },
        "slack": {
            "enabled": ${SLACK_WEBHOOK_URL:+true}${SLACK_WEBHOOK_URL:-false},
            "webhook_url": "${SLACK_WEBHOOK_URL:-}"
        }
    },
    "logging": {
        "level": "${LOG_LEVEL}",
        "file": "/app/backend/logs/ailang_auto_update.log"
    },
    "check_interval": ${CHECK_INTERVAL}
}
EOF
        echo "Default config file created at $CONFIG_FILE"
    fi
}

# Process environment variables
if [ -n "$CONFIG_FILE_ENV" ]; then
    CONFIG_FILE="$CONFIG_FILE_ENV"
fi

if [ -n "$LOG_LEVEL_ENV" ]; then
    LOG_LEVEL="$LOG_LEVEL_ENV"
fi

if [ -n "$CHECK_INTERVAL_ENV" ]; then
    CHECK_INTERVAL="$CHECK_INTERVAL_ENV"
fi

# Check if config file exists and create if needed
check_config

# Process command
case "$1" in
    monitor)
        echo "Running AILang monitoring script once..."
        python /app/backend/tools/ailang_auto_update.py --config "$CONFIG_FILE" --log-level "$LOG_LEVEL"
        ;;
    service)
        echo "Running AILang monitoring script as a service..."
        python /app/backend/tools/ailang_auto_update.py --service --interval "$CHECK_INTERVAL" --config "$CONFIG_FILE" --log-level "$LOG_LEVEL"
        ;;
    update)
        echo "Running AILang updater script once..."
        python /app/backend/tools/ailang_auto_update.py --force --config "$CONFIG_FILE" --log-level "$LOG_LEVEL"
        ;;
    api)
        echo "Starting AILang API server..."
        # If you implement an API server, start it here
        python /app/backend/api/ailang_api.py --config "$CONFIG_FILE" --log-level "$LOG_LEVEL"
        ;;
    shell)
        echo "Starting shell session..."
        /bin/bash
        ;;
    help)
        show_usage
        ;;
    *)
        show_usage
        exit 1
        ;;
esac
