#!/usr/bin/env bash
set -euo pipefail
SOURCE_DIR="$(dirname "$(realpath "${BASH_SOURCE[0]}")")/.."
PATH="$SOURCE_DIR:$PATH"

# Default configuration
DEFAULT_PORT="8888"
DEFAULT_TTL=3000000 # ~34 days in seconds

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
clap.define short=s long=stop desc="Stop any running PocketIC server" variable=STOP_SERVER nargs=0
clap.define short=d long=directory desc="Bundle directory" variable=BUNDLE_DIR
clap.define short=p long=port desc="Server port" variable=PORT default="$DEFAULT_PORT"
clap.define short=t long=ttl desc="Server TTL in seconds" variable=TTL default="$DEFAULT_TTL"

# Source the output file ----------------------------------------------------------
source "$(clap.build)"

# Function to check if server is already running
check_server_running() {
    if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Server is running
    else
        return 1  # Server is not running
    fi
}

wait_server_running() {
  local max_seconds=$1
  local elapsed=0

  while ! check_server_running; do
    if [ "$elapsed" -ge "$max_seconds" ]; then
      echo "Server did not start within ${max_seconds}s" >&2
      return 1
    fi
    sleep 1
    elapsed=$((elapsed + 1))
  done

  echo "Server is running after ${elapsed}s"
  return 0
}

# Function to stop server
stop_server() {
    echo "Checking for PocketIC server on port $PORT..."

    if check_server_running; then
        echo "Stopping server..."
        local pid=$(lsof -ti:$PORT)
        kill -9 "$pid" 2>/dev/null || true
        sleep 2

        if ! check_server_running; then
            echo "✅ Server stopped successfully"
        else
            echo "❌ Failed to stop server"
            exit 1
        fi
    else
        echo "No server running on port $PORT"
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
    echo "❌ Error: Server is already running on port $PORT"
    echo "Use --stop to stop it first"
    exit 1
fi

# Start server
if [ "${BACKGROUND:-false}" = "true" ]; then
    echo "🚀 Starting PocketIC server in background on port $PORT with TTL $TTL..."
    nohup "$POCKET_IC_BINARY" --port "$PORT" --ttl "$TTL" > pocket-ic-server.log 2>&1 &

    if wait_server_running 10; then
        echo "✅ Server started successfully"
        echo "📋 Log: pocket-ic-server.log"
        echo "🛑 Stop with: $0 --stop"
    else
        echo "❌ Failed to start server. Check pocket-ic-server.log"
        exit 1
    fi
else
    echo "🚀 Starting PocketIC server on port $PORT with TTL $TTL..."
    echo "💡 Press Ctrl+C to stop"
    exec "$POCKET_IC_BINARY" --port "$PORT" --ttl "$TTL"
fi
