#!/bin/bash

# This script handles code execution inside the Docker container
# It detects the file extension and runs the appropriate command

set -e

CODE_FILE=$1

if [ -z "$CODE_FILE" ]; then
    echo "Error: No code file specified"
    exit 1
fi

# Get file extension
FILE_EXT="${CODE_FILE##*.}"

# Execute based on file extension
case "$FILE_EXT" in
    "py")
        echo "Executing Python code..."
        python "$CODE_FILE"
        ;;
    "js")
        echo "Executing JavaScript code..."
        node "$CODE_FILE"
        ;;
    *)
        echo "Unsupported file extension: $FILE_EXT"
        exit 1
        ;;
esac
