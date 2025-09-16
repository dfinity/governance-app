#!/usr/bin/env bash
set -euo pipefail
SOURCE_DIR="$(dirname "$(realpath "${BASH_SOURCE[0]}")")/.."
PATH="$SOURCE_DIR:$PATH"

# Default configuration
DEFAULT_SERVER_URL="http://127.0.0.1:8888"
DEFAULT_IDENTITY="sns-testing"
DEFAULT_DIR="dev-env-$(date +%d-%m-%Y)"

print_help() {
  cat <<-EOF

	Initializes the local replica with required canisters for SNS testing.

	This script sets up the SNS testing environment by initializing
	the local replica with the necessary canisters. Make sure the
	PocketIC server is running first.

	EXAMPLES:
	    $0                                   # Use all defaults
	    $0 -u http://127.0.0.1:8080         # Custom server URL
	    $0 -i my-identity                   # Custom identity

	EOF
}

# Source the clap.bash file ---------------------------------------------------
source "$SOURCE_DIR/scripts/clap.sh"

# Define options
clap.define short=u long=server-url desc="PocketIC server URL" variable=SERVER_URL default="$DEFAULT_SERVER_URL"
clap.define short=i long=identity desc="Dev identity name" variable=IDENTITY default="$DEFAULT_IDENTITY"
clap.define short=d long=directory desc="Bundle directory" variable=BUNDLE_DIR default="$DEFAULT_DIR"

# Source the output file ----------------------------------------------------------
source "$(clap.build)"

# Check if bundle directory exists
if [ ! -d "$BUNDLE_DIR" ]; then
    echo "❌ Error: Bundle directory '$BUNDLE_DIR' not found"
    echo "Please run download_sns-testing_bundle.sh first"
    exit 1
fi

SNS_TESTING_ENV="$BUNDLE_DIR/sns_testing_env.sh"
SNS_TESTING_INIT="$BUNDLE_DIR/sns-testing-init"

if [ ! -f "$SNS_TESTING_ENV" ]; then
    echo "❌ Error: sns_testing_env.sh not found in $BUNDLE_DIR"
    echo "Make sure the SNS testing bundle was downloaded correctly"
    exit 1
fi

if [ ! -f "$SNS_TESTING_INIT" ]; then
    echo "❌ Error: sns-testing-init binary not found in $BUNDLE_DIR"
    echo "Make sure the SNS testing bundle was downloaded correctly"
    exit 1
fi

# Make the init binary executable
chmod +x "$SNS_TESTING_INIT"

# Check if server is reachable
echo "🔍 Checking if PocketIC server is running..."
if ! curl -s --connect-timeout 5 "$DEFAULT_SERVER_URL/status" >/dev/null 2>&1; then
    echo "❌ Error: Cannot reach PocketIC server at $DEFAULT_SERVER_URL"
    echo "Please make sure the server is running with start-server.sh"
    exit 1
fi

echo "✅ PocketIC server is reachable"

# Display configuration
echo ""
echo "=== Initializing SNS Testing Replica ==="
echo "Bundle Directory: $BUNDLE_DIR"
echo "Server URL: $SERVER_URL"
echo "Identity: $IDENTITY"
echo ""

# Source the environment file
echo "📋 Loading SNS testing environment..."
source "$SNS_TESTING_ENV"

# Change to bundle directory for initialization
cd "$BUNDLE_DIR"

# Run the initialization
echo "🚀 Initializing local replica with required canisters..."
if ./sns-testing-init \
    --server-url "$SERVER_URL" \
    --dev-identity "$IDENTITY" ; then
    echo ""
    echo "✅ Initialization complete!"
    echo "🎉 Your SNS testing environment is ready to use"
    echo "Following canisters should be available in the following urls:"
    echo "  - NNS dapp: http://qoctq-giaaa-aaaaa-aaaea-cai.localhost:8080"
    echo "  - SNS Aggregator: http://3r4gx-wqaaa-aaaaq-aaaia-cai.localhost:8080"
    echo "  - Internet Identity: http://rdmx6-jaaaa-aaaaa-aaadq-cai.localhost:8080"

else
    echo ""
    echo "❌ Initialization failed"
    echo "Check the output above for error details"
    exit 1
fi
