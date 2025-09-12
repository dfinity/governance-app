#!/usr/bin/env bash
set -euo pipefail
SOURCE_DIR="$(dirname "$(realpath "${BASH_SOURCE[0]}")")/.."
PATH="$SOURCE_DIR:$PATH"

# Default configuration
DEFAULT_PORT="8888"
BUNDLE_DIR="sns_testing_bundle"
TTL=30000000

print_help() {
  cat <<-EOF

	Starts the PocketIC server for SNS testing environment.

	The server runs on port 8888. Make sure you have downloaded the
	SNS testing bundle first using download_sns-testing_bundle.sh.

	EXAMPLES:
	    $0                                  # Start server in foreground
	    $0 -b                               # Start server in background
	    $0 --stop                           # Stop running server

	EOF
}

# Source the clap.bash file ---------------------------------------------------
source "$SOURCE_DIR/scripts/clap.sh"

# Define options
clap.define short=b long=background desc="Run server in background" variable=BACKGROUND nargs=0
clap.define long=stop desc="Stop any running PocketIC server" variable=STOP_SERVER nargs=0

# Source the output file ----------------------------------------------------------
source "$(clap.build)"

# Function to check if server is already running
check_server_running() {
    if lsof -Pi :$DEFAULT_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Server is running
    else
        return 1  # Server is not running
    fi
}

# Function to stop server
stop_server() {
    echo "Checking for PocketIC server on port $DEFAULT_PORT..."

    if check_server_running; then
        echo "Stopping server..."
        local pid=$(lsof -ti:$DEFAULT_PORT)
        kill "$pid" 2>/dev/null || true
        sleep 2

        if ! check_server_running; then
            echo "✅ Server stopped successfully"
        else
            echo "❌ Failed to stop server"
            exit 1
        fi
    else
        echo "No server running on port $DEFAULT_PORT"
    fi
}

# Handle stop command
if [ "${STOP_SERVER:-false}" = "true" ]; then
    stop_server
    exit 0
fi

# Validate bundle directory exists
if [ ! -d "$BUNDLE_DIR" ]; then
    echo "❌ Error: Bundle directory '$BUNDLE_DIR' not found"
    echo "Please run download_sns-testing_bundle.sh first"
    exit 1
fi

# Check if PocketIC binary exists
POCKET_IC_BINARY="$BUNDLE_DIR/rs/pocket_ic_server/pocket-ic-server"
if [ ! -f "$POCKET_IC_BINARY" ]; then
    echo "❌ Error: PocketIC server binary not found"
    echo "Please ensure the SNS testing bundle was downloaded correctly"
    exit 1
fi

# Check if server is already running
if check_server_running; then
    echo "❌ Error: Server is already running on port $DEFAULT_PORT"
    echo "Use --stop to stop it first"
    exit 1
fi

# Start server
if [ "${BACKGROUND:-false}" = "true" ]; then
    echo "🚀 Starting PocketIC server in background on port $DEFAULT_PORT with TTL $TTL..."
    nohup "$POCKET_IC_BINARY" --port "$DEFAULT_PORT" --ttl "$TTL" > pocket-ic-server.log 2>&1 &
    sleep 2
    if check_server_running; then
        echo "✅ Server started successfully"
        echo "📋 Log: pocket-ic-server.log"
        echo "🛑 Stop with: $0 --stop"
    else
        echo "❌ Failed to start server. Check pocket-ic-server.log"
        exit 1
    fi
else
    echo "🚀 Starting PocketIC server on port $DEFAULT_PORT with TTL $TTL..."
    echo "💡 Press Ctrl+C to stop"
    exec "$POCKET_IC_BINARY" --port "$DEFAULT_PORT" --ttl "$TTL"
fi
